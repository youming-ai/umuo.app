import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import type { FileRow } from "@/types/db/database";
import type { ProcessedSegment } from "@/types/transcription";
import {
  useGroqNativeTranscription,
  useGroqTranscriptionStatus,
  groqTranscriptionKeys,
} from "./useGroqNativeTranscription";

// 转录响应类型
interface TranscriptionResponse {
  success: boolean;
  data: {
    status: string;
    text: string;
    language: string;
    duration?: number;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      wordTimestamps?: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    }>;
  };
}

// 查询转录状态的查询键
export const transcriptionKeys = {
  all: ["transcription"] as const,
  forFile: (fileId: number) => [...transcriptionKeys.all, "file", fileId] as const,
  progress: (fileId: number) => [...transcriptionKeys.forFile(fileId), "progress"] as const,
};

// 获取文件转录状态的查询 - 简化版本
export function useTranscriptionStatus(fileId: number) {
  return useQuery({
    queryKey: transcriptionKeys.forFile(fileId),
    queryFn: async () => {
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
      const transcript = transcripts.length > 0 ? transcripts[0] : null;

      if (transcript && typeof transcript.id === "number") {
        const segments = await db.segments.where("transcriptId").equals(transcript.id).toArray();
        return {
          transcript,
          segments,
        };
      }

      return {
        transcript: null,
        segments: [],
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - 增加缓存时间以减少不必要的查询
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * 保存转录结果到数据库
 */
async function saveTranscriptionResults(
  fileId: number,
  data: TranscriptionResponse["data"],
): Promise<void> {
  const transcriptId = await db.transcripts.add({
    fileId,
    status: "completed",
    rawText: data.text,
    language: data.language,
    processingTime: 0, // API route doesn't provide this info
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (data.segments && data.segments.length > 0) {
    const segments = data.segments.map((segment) => ({
      transcriptId,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      wordTimestamps: segment.wordTimestamps || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.segments.bulkAdd(segments);
  }
}

// 转录操作的 mutation - 修复版本，使用服务器端 API 路由
export function useTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, language = "ja" }: { fileId: number; language?: string }) => {
      // 获取文件数据
      const file = await db.files.get(fileId);
      if (!file || !file.blob) {
        throw new Error("文件不存在或文件数据已损坏");
      }

      // 转录开始：使用服务器端 API

      // 准备表单数据
      const formData = new FormData();
      formData.append("audio", file.blob, file.name);
      formData.append("meta", JSON.stringify({ fileId: file.id?.toString() || "" }));

      try {
        // 调用服务器端 API 路由
        console.log("📡 发送转录请求:", {
          url: `/api/transcribe?fileId=${fileId}&language=${language}`,
          method: "POST",
          formDataKeys: Array.from(formData.keys()),
          fileName: file.name,
          fileSize: file.size,
        });

        const response = await fetch(`/api/transcribe?fileId=${fileId}&language=${language}`, {
          method: "POST",
          body: formData,
        });

        console.log("📡 API 响应状态:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ API 错误响应:", errorData);
          throw new Error(
            errorData.message || `转录失败: ${response.statusText} (${response.status})`,
          );
        }

        const result: TranscriptionResponse = await response.json();

        if (!result.success) {
          throw new Error(result.data?.text || "转录请求失败");
        }

        // 保存转录结果到数据库
        await saveTranscriptionResults(fileId, result.data);

        return result.data;
      } catch (error) {
        console.error("❌ 转录失败:", error);
        throw error;
      }
    },
    onSuccess: (result, variables) => {
      // 转录完成并保存

      // 使查询缓存失效，触发重新查询
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });

      // 显示成功通知
      import("sonner").then(({ toast }) => {
        toast.success("转录完成");
      });
    },
    onError: (error, variables) => {
      console.error("❌ 转录失败:", error);

      // 显示错误通知
      import("sonner").then(({ toast }) => {
        toast.error(`转录失败: ${error instanceof Error ? error.message : "未知错误"}`);
      });

      // 刷新查询状态
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
    },
  });
}

// 删除转录记录的 mutation - 简化版本
export function useDeleteTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId }: { fileId: number }) => {
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

      for (const transcript of transcripts) {
        if (typeof transcript.id === "number") {
          // 删除相关的字幕段
          await db.segments.where("transcriptId").equals(transcript.id).delete();
          // 删除转录记录
          await db.transcripts.delete(transcript.id);
        }
      }
    },
    onSuccess: (_, { fileId }) => {
      // 使查询缓存失效
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(fileId),
      });
    },
  });
}

// 获取转录进度 - 修复版本，使用服务器端 API
export function useTranscriptionProgress(fileId: number) {
  return useQuery({
    queryKey: transcriptionKeys.progress(fileId),
    queryFn: async () => {
      try {
        const response = await fetch(`/api/progress/${fileId}`);
        if (!response.ok) {
          throw new Error(`获取进度失败: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error("获取转录进度失败:", error);
        // 返回默认进度状态
        return {
          fileId,
          status: "error",
          progress: 0,
          message: "无法获取进度信息",
        };
      }
    },
    staleTime: 1000 * 5, // 5 seconds - 进度查询需要更频繁的更新
    refetchInterval: 2000, // 简化：每2秒检查一次进度
  });
}

// 获取所有文件的转录状态摘要 - 简化版本
export function useTranscriptionSummary(fileIds: number[]) {
  return useQuery({
    queryKey: [...transcriptionKeys.all, "summary", fileIds],
    queryFn: async () => {
      const summaries = await Promise.all(
        fileIds.map(async (fileId) => {
          const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
          const transcript = transcripts.length > 0 ? transcripts[0] : null;

          return {
            fileId,
            status: transcript?.status || null,
            hasTranscript: !!transcript,
            updatedAt: transcript?.updatedAt || null,
          };
        }),
      );

      return summaries;
    },
    staleTime: 1000 * 30, // 30 seconds - 摘要数据可以缓存更长时间
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

// 转录方法类型
export type TranscriptionMethod = "ai-sdk" | "groq-native" | "auto";

// 转录配置选项
export interface TranscriptionConfig {
  method?: TranscriptionMethod;
  language?: string;
  model?: string;
  useWordTimestamps?: boolean;
  temperature?: number;
  prompt?: string;
}

// 可配置的转录 Hook
export function useConfigurableTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      config = {},
    }: {
      fileId: number;
      config?: TranscriptionConfig;
    }) => {
      // 获取文件数据
      const file = await db.files.get(fileId);
      if (!file || !file.blob) {
        throw new Error("文件不存在或文件数据已损坏");
      }

      // 自动选择最佳方法
      let method = config.method;
      if (!method || method === "auto") {
        // 根据文件大小和配置自动选择
        method = config.useWordTimestamps ? "groq-native" : "ai-sdk";
      }

      console.log("🎙️ 开始可配置转录:", {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        method,
        config,
      });

      if (method === "groq-native") {
        // 使用 Groq 原生转录
        const groqMutation = useGroqNativeTranscription();
        const result = await groqMutation.mutateAsync({
          fileId,
          config: {
            model: config.model,
            language: config.language,
            useWordTimestamps: config.useWordTimestamps,
            temperature: config.temperature,
            prompt: config.prompt,
          },
        });
        return result;
      } else {
        // 使用原有的 AI SDK 转录
        const formData = new FormData();
        formData.append("audio", file.blob, file.name);
        formData.append("meta", JSON.stringify({ fileId: fileId.toString() }));

        const params = new URLSearchParams({
          fileId: fileId.toString(),
          language: config.language || "ja",
        });

        const response = await fetch(`/api/transcribe?${params.toString()}`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `转录失败: ${response.statusText} (${response.status})`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.data?.text || "转录请求失败");
        }

        return result.data;
      }
    },
    onSuccess: (result, variables) => {
      console.log("✅ 转录完成:", {
        fileId: variables.fileId,
        method: variables.config?.method || "auto",
        textLength: result.text?.length || 0,
        segmentCount: result.segments?.length || 0,
        language: result.language,
      });

      // 使相关查询缓存失效
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });

      // 显示成功通知
      import("sonner").then(({ toast }) => {
        toast.success("转录完成", {
          description: `使用 ${variables.config?.method || "auto"} 方法，生成了 ${result.segments?.length || 0} 个字幕段`,
        });
      });
    },
    onError: (error, variables) => {
      console.error("❌ 转录失败:", error);

      // 显示错误通知
      import("sonner").then(({ toast }) => {
        toast.error(`转录失败: ${error instanceof Error ? error.message : "未知错误"}`, {
          description: `使用 ${variables.config?.method || "auto"} 方法`,
        });
      });

      // 刷新查询状态
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
    },
  });
}

// 获取推荐的转录配置
export function getRecommendedTranscriptionConfig(
  options: {
    fileSize?: number;
    language?: string;
    needWordTimestamps?: boolean;
    preferSpeed?: boolean;
  } = {},
): TranscriptionConfig {
  const { fileSize = 0, language = "ja", needWordTimestamps = true, preferSpeed = false } = options;

  // 根据文件大小和需求选择最佳配置
  if (fileSize > 25 * 1024 * 1024) {
    // 大于25MB
    return {
      method: "groq-native",
      model: "whisper-large-v3-turbo",
      language,
      useWordTimestamps: false, // 大文件关闭word timestamps以提高速度
      temperature: 0,
    };
  }

  if (needWordTimestamps && !preferSpeed) {
    return {
      method: "groq-native",
      model: "whisper-large-v3-turbo",
      language,
      useWordTimestamps: true,
      temperature: 0,
    };
  }

  if (preferSpeed) {
    return {
      method: "ai-sdk",
      language,
      temperature: 0,
    };
  }

  // 默认配置
  return {
    method: "auto",
    language,
    useWordTimestamps: true,
    temperature: 0,
  };
}

// 扩展的查询键，包含方法信息
export const enhancedTranscriptionKeys = {
  ...transcriptionKeys,
  withMethod: (fileId: number, method: TranscriptionMethod) =>
    [...transcriptionKeys.forFile(fileId), "method", method] as const,
  wordTimestamps: (fileId: number) =>
    [...transcriptionKeys.forFile(fileId), "word-timestamps"] as const,
};
