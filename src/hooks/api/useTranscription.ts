import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import {
  handleTranscriptionError,
  handleTranscriptionSuccess,
} from "@/lib/utils/transcription-error-handler";

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
  error?: {
    code: string;
    message: string;
    details?: unknown;
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
    staleTime: 1000 * 60 * 15, // 15 minutes - 增加缓存时间减少网络请求
    gcTime: 1000 * 60 * 30, // 30 minutes
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
        const response = await fetch(`/api/transcribe?fileId=${fileId}&language=${language}`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `转录失败: ${response.statusText} (${response.status})`,
          );
        }

        const result: TranscriptionResponse = await response.json();

        if (!result.success) {
          // 从 error 字段获取错误信息，而不是 data
          throw new Error(result.error?.message || "转录请求失败");
        }

        // 保存转录结果到数据库
        await saveTranscriptionResults(fileId, result.data);

        return result.data;
      } catch (error) {
        handleTranscriptionError(error, {
          fileId,
          operation: "transcribe",
          language,
        });
        throw error;
      }
    },
    onSuccess: (_result, variables) => {
      // 转录完成并保存
      handleTranscriptionSuccess({
        fileId: variables.fileId,
        operation: "transcribe",
        language: variables.language,
      });

      // 使查询缓存失效，触发重新查询 - 优化缓存策略
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
    },
    onError: (error, variables) => {
      handleTranscriptionError(error, {
        fileId: variables.fileId,
        operation: "transcribe",
        language: variables.language,
      });

      // 刷新查询状态 - 合并缓存失效调用，减少网络请求
      queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(variables.fileId),
      });
    },
  });
}
