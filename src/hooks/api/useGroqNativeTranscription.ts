/**
 * Groq 原生转录 Hooks
 * 支持完整的 word-timestamps 和高级功能
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import type { FileRow } from "@/types/db/database";
import type { ProcessedSegment } from "@/types/transcription";

// Groq 原生转录响应类型
interface GroqNativeTranscriptionResponse {
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
        confidence?: number;
      }>;
      confidence?: number;
      id: number;
    }>;
    meta?: {
      model?: string;
      useWordTimestamps?: boolean;
      wordTimestampCount?: number;
    };
  };
}

// 扩展的查询键
export const groqTranscriptionKeys = {
  all: ["groqTranscription"] as const,
  forFile: (fileId: number) => [...groqTranscriptionKeys.all, "file", fileId] as const,
  progress: (fileId: number) => [...groqTranscriptionKeys.forFile(fileId), "progress"] as const,
  withWordTimestamps: (fileId: number) =>
    [...groqTranscriptionKeys.forFile(fileId), "withWordTimestamps"] as const,
  batch: (fileIds: number[]) => [...groqTranscriptionKeys.all, "batch", fileIds] as const,
};

// 转录配置选项
export interface GroqTranscriptionConfig {
  model?: string;
  language?: string;
  useWordTimestamps?: boolean;
  temperature?: number;
  prompt?: string;
}

// 保存转录结果到数据库
async function saveGroqTranscriptionResults(
  fileId: number,
  data: GroqNativeTranscriptionResponse["data"],
): Promise<void> {
  console.log("💾 保存 Groq 转录结果到数据库:", {
    fileId,
    textLength: data.text?.length || 0,
    segmentCount: data.segments?.length || 0,
    language: data.language,
    duration: data.duration,
    model: data.meta?.model,
  });

  // 保存转录记录
  const transcriptId = await db.transcripts.add({
    fileId,
    status: "completed",
    rawText: data.text,
    text: data.text,
    language: data.language,
    duration: data.duration,
    processingTime: 0, // Groq API 不提供此信息
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`📝 转录记录已保存: transcriptId=${transcriptId}`);

  if (data.segments && data.segments.length > 0) {
    // 转换并保存 segments
    const segments = data.segments.map((segment) => ({
      transcriptId,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      normalizedText: segment.text, // 可以在这里添加文本处理逻辑
      wordTimestamps: segment.wordTimestamps || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.segments.bulkAdd(segments);
    console.log(`🎯 字幕段已保存: ${segments.length} 个段`);

    // 统计 word timestamps
    const totalWordTimestamps = segments.reduce(
      (count, segment) => count + (segment.wordTimestamps?.length || 0),
      0,
    );
    console.log(`📊 总计 word timestamps: ${totalWordTimestamps}`);
  }
}

// 获取文件转录状态（支持 word timestamps）
export function useGroqTranscriptionStatus(fileId: number) {
  return useQuery({
    queryKey: groqTranscriptionKeys.forFile(fileId),
    queryFn: async () => {
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
      const transcript = transcripts.length > 0 ? transcripts[0] : null;

      if (transcript && typeof transcript.id === "number") {
        const segments = await db.segments.where("transcriptId").equals(transcript.id).toArray();
        return {
          transcript,
          segments,
          hasWordTimestamps: segments.some((s) => s.wordTimestamps && s.wordTimestamps.length > 0),
          wordTimestampCount: segments.reduce(
            (count, s) => count + (s.wordTimestamps?.length || 0),
            0,
          ),
        };
      }

      return {
        transcript: null,
        segments: [],
        hasWordTimestamps: false,
        wordTimestampCount: 0,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// 获取带 word timestamps 的转录数据
export function useGroqTranscriptionWithWordTimestamps(fileId: number) {
  return useQuery({
    queryKey: groqTranscriptionKeys.withWordTimestamps(fileId),
    queryFn: async () => {
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
      const transcript = transcripts.length > 0 ? transcripts[0] : null;

      if (!transcript || typeof transcript.id !== "number") {
        return null;
      }

      const segments = await db.segments.where("transcriptId").equals(transcript.id).toArray();

      // 过滤出有 word timestamps 的 segments
      const segmentsWithWordTimestamps = segments.filter(
        (s) => s.wordTimestamps && s.wordTimestamps.length > 0,
      );

      return {
        transcript,
        segments,
        segmentsWithWordTimestamps,
        totalSegments: segments.length,
        segmentsWithWordTimestampsCount: segmentsWithWordTimestamps.length,
        totalWordTimestamps: segments.reduce(
          (count, s) => count + (s.wordTimestamps?.length || 0),
          0,
        ),
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Groq 原生转录操作
export function useGroqNativeTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      config = {},
    }: {
      fileId: number;
      config?: GroqTranscriptionConfig;
    }) => {
      // 获取文件数据
      const file = await db.files.get(fileId);
      if (!file || !file.blob) {
        throw new Error("文件不存在或文件数据已损坏");
      }

      console.log("🎙️ 开始 Groq 原生转录:", {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        config,
      });

      // 准备表单数据
      const formData = new FormData();
      formData.append("audio", file.blob, file.name);
      formData.append("meta", JSON.stringify({ fileId: file.id?.toString() || "" }));

      // 构建 API URL
      const params = new URLSearchParams({
        fileId: fileId.toString(),
        language: config.language || "ja",
        model: config.model || "whisper-large-v3-turbo",
        useWordTimestamps: String(config.useWordTimestamps !== false),
      });

      const apiUrl = `/api/transcribe/groq-native?${params.toString()}`;

      try {
        console.log("📡 发送 Groq 原生转录请求:", {
          url: apiUrl,
          method: "POST",
          params: Object.fromEntries(params.entries()),
          fileName: file.name,
          fileSize: file.size,
        });

        const response = await fetch(apiUrl, {
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

        const result: GroqNativeTranscriptionResponse = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.data?.text || "转录请求失败");
        }

        console.log("✅ Groq 原生转录成功:", {
          textLength: result.data.text?.length || 0,
          segmentCount: result.data.segments?.length || 0,
          language: result.data.language,
          duration: result.data.duration,
          meta: result.data.meta,
        });

        // 保存转录结果到数据库
        await saveGroqTranscriptionResults(fileId, result.data);

        return result.data;
      } catch (error) {
        console.error("❌ Groq 原生转录失败:", error);
        throw error;
      }
    },
    onSuccess: (result, variables) => {
      console.log("✅ Groq 转录完成并保存:", {
        fileId: variables.fileId,
        textLength: result.text?.length || 0,
        segmentCount: result.segments?.length || 0,
        language: result.language,
      });

      // 使相关查询缓存失效
      queryClient.invalidateQueries({
        queryKey: groqTranscriptionKeys.forFile(variables.fileId),
      });
      queryClient.invalidateQueries({
        queryKey: groqTranscriptionKeys.withWordTimestamps(variables.fileId),
      });

      // 显示成功通知
      import("sonner").then(({ toast }) => {
        toast.success("转录完成", {
          description: `生成了 ${result.segments?.length || 0} 个字幕段`,
        });
      });
    },
    onError: (error, variables) => {
      console.error("❌ Groq 转录失败:", error);

      // 显示错误通知
      import("sonner").then(({ toast }) => {
        toast.error(`转录失败: ${error instanceof Error ? error.message : "未知错误"}`);
      });

      // 刷新查询状态
      queryClient.invalidateQueries({
        queryKey: groqTranscriptionKeys.forFile(variables.fileId),
      });
    },
  });
}

// 批量转录 Hook
export function useGroqBatchTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileIds,
      config = {},
      concurrency = 2,
    }: {
      fileIds: number[];
      config?: GroqTranscriptionConfig;
      concurrency?: number;
    }) => {
      console.log("📦 开始批量 Groq 转录:", {
        fileIds,
        config,
        concurrency,
        totalFiles: fileIds.length,
      });

      const results = [];

      // 分批处理
      for (let i = 0; i < fileIds.length; i += concurrency) {
        const batch = fileIds.slice(i, i + concurrency);
        console.log(
          `🔄 处理批次 ${Math.floor(i / concurrency) + 1}/${Math.ceil(fileIds.length / concurrency)}:`,
          batch,
        );

        const batchPromises = batch.map(async (fileId) => {
          try {
            const file = await db.files.get(fileId);
            if (!file || !file.blob) {
              throw new Error(`文件 ${fileId} 数据不完整`);
            }

            const formData = new FormData();
            formData.append("audio", file.blob, file.name);
            formData.append("meta", JSON.stringify({ fileId: fileId.toString() }));

            const params = new URLSearchParams({
              fileId: fileId.toString(),
              language: config.language || "ja",
              model: config.model || "whisper-large-v3-turbo",
              useWordTimestamps: String(config.useWordTimestamps !== false),
            });

            const response = await fetch(`/api/transcribe/groq-native?${params.toString()}`, {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `转录失败: ${response.statusText}`);
            }

            const result: GroqNativeTranscriptionResponse = await response.json();

            if (result.success && result.data) {
              await saveGroqTranscriptionResults(fileId, result.data);
            }

            return { fileId, success: true, data: result.data };
          } catch (error) {
            console.error(`批量转录失败 - 文件 ${fileId}:`, error);
            return {
              fileId,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map((r) => (r.status === "fulfilled" ? r.value : r.reason)));
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      console.log("📊 批量转录完成:", {
        total: results.length,
        success: successCount,
        failure: failureCount,
        successRate: `${((successCount / results.length) * 100).toFixed(1)}%`,
      });

      return results;
    },
    onSuccess: (results, variables) => {
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      // 使所有相关查询失效
      variables.fileIds.forEach((fileId) => {
        queryClient.invalidateQueries({
          queryKey: groqTranscriptionKeys.forFile(fileId),
        });
      });

      // 显示批量操作结果通知
      import("sonner").then(({ toast }) => {
        if (failureCount === 0) {
          toast.success("批量转录全部成功", {
            description: `成功转录 ${successCount} 个文件`,
          });
        } else if (successCount === 0) {
          toast.error("批量转录全部失败", {
            description: `${failureCount} 个文件转录失败`,
          });
        } else {
          toast.warning("批量转录部分完成", {
            description: `成功 ${successCount} 个，失败 ${failureCount} 个`,
          });
        }
      });
    },
    onError: (error, variables) => {
      console.error("❌ 批量转录失败:", error);

      import("sonner").then(({ toast }) => {
        toast.error("批量转录失败", {
          description: error instanceof Error ? error.message : "未知错误",
        });
      });
    },
  });
}

// 删除转录记录的 Hook（Groq 原生版本）
export function useDeleteGroqTranscription() {
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
        queryKey: groqTranscriptionKeys.forFile(fileId),
      });
      queryClient.invalidateQueries({
        queryKey: groqTranscriptionKeys.withWordTimestamps(fileId),
      });

      import("sonner").then(({ toast }) => {
        toast.success("转录记录已删除");
      });
    },
    onError: (error) => {
      console.error("❌ 删除转录记录失败:", error);

      import("sonner").then(({ toast }) => {
        toast.error("删除转录记录失败");
      });
    },
  });
}

// 获取转录进度 - Groq 原生版本
export function useGroqTranscriptionProgress(fileId: number) {
  return useQuery({
    queryKey: groqTranscriptionKeys.progress(fileId),
    queryFn: async () => {
      try {
        const response = await fetch(`/api/progress/${fileId}`);
        if (!response.ok) {
          throw new Error(`获取进度失败: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error("获取 Groq 转录进度失败:", error);
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
    refetchInterval: 2000, // 每2秒检查一次进度
  });
}

// 获取所有文件的转录状态摘要 - Groq 原生版本
export function useGroqTranscriptionSummary(fileIds: number[]) {
  return useQuery({
    queryKey: [...groqTranscriptionKeys.all, "summary", fileIds],
    queryFn: async () => {
      const summaries = await Promise.all(
        fileIds.map(async (fileId) => {
          const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
          const transcript = transcripts.length > 0 ? transcripts[0] : null;

          if (transcript && typeof transcript.id === "number") {
            const segments = await db.segments
              .where("transcriptId")
              .equals(transcript.id)
              .toArray();
            const hasWordTimestamps = segments.some(
              (s) => s.wordTimestamps && s.wordTimestamps.length > 0,
            );
            const wordTimestampCount = segments.reduce(
              (count, s) => count + (s.wordTimestamps?.length || 0),
              0,
            );

            return {
              fileId,
              status: transcript.status,
              hasTranscript: true,
              hasWordTimestamps,
              wordTimestampCount,
              segmentCount: segments.length,
              updatedAt: transcript.updatedAt,
            };
          }

          return {
            fileId,
            status: null,
            hasTranscript: false,
            hasWordTimestamps: false,
            wordTimestampCount: 0,
            segmentCount: 0,
            updatedAt: null,
          };
        }),
      );

      return summaries;
    },
    staleTime: 1000 * 30, // 30 seconds - 摘要数据可以缓存更长时间
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

export default {
  useGroqNativeTranscription,
  useGroqTranscriptionStatus,
  useGroqTranscriptionWithWordTimestamps,
  useGroqBatchTranscription,
  useDeleteGroqTranscription,
  useGroqTranscriptionProgress,
  useGroqTranscriptionSummary,
  groqTranscriptionKeys,
};
