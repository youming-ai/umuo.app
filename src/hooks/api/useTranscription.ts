import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import {
  handleTranscriptionError,
  handleTranscriptionSuccess,
} from "@/lib/utils/transcription-error-handler";
import { getCacheManager } from "@/lib/utils/cache-manager";

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
  forFile: (fileId: number) =>
    [...transcriptionKeys.all, "file", fileId] as const,
  progress: (fileId: number) =>
    [...transcriptionKeys.forFile(fileId), "progress"] as const,
};

// 获取文件转录状态的查询 - 简化版本
export function useTranscriptionStatus(fileId: number) {
  return useQuery({
    queryKey: transcriptionKeys.forFile(fileId),
    queryFn: async () => {
      const transcripts = await db.transcripts
        .where("fileId")
        .equals(fileId)
        .toArray();
      const transcript = transcripts.length > 0 ? transcripts[0] : null;

      if (transcript && typeof transcript.id === "number") {
        const segments = await db.segments
          .where("transcriptId")
          .equals(transcript.id)
          .toArray();
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
 * 保存转录结果到数据库 - 使用事务确保原子性
 * 改进的事务处理，包含错误恢复和部分重试机制
 */
async function saveTranscriptionResults(
  fileId: number,
  data: TranscriptionResponse["data"],
): Promise<number> {
  const startTime = Date.now();

  try {
    return await db.transaction(
      "rw",
      db.transcripts,
      db.segments,
      async (tx) => {
        // 1. 首先查找现有的转录记录
        const existingTranscripts = await tx
          .table("transcripts")
          .where("fileId")
          .equals(fileId)
          .toArray();

        let transcriptId: number;

        if (existingTranscripts.length > 0 && existingTranscripts[0].id) {
          // 更新现有转录记录
          transcriptId = existingTranscripts[0].id;
          await tx.table("transcripts").update(transcriptId, {
            status: "completed" as const,
            rawText: data.text,
            language: data.language,
            duration: data.duration,
            error: undefined, // 清除之前的错误
            updatedAt: new Date(),
          });

          // 删除旧的 segments（如果有的话）
          await tx
            .table("segments")
            .where("transcriptId")
            .equals(transcriptId)
            .delete();
        } else {
          // 创建新的转录记录
          transcriptId = await tx.table("transcripts").add({
            fileId,
            status: "completed" as const,
            rawText: data.text,
            language: data.language,
            duration: data.duration,
            processingTime: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // 2. 批量添加新的 segments
        if (data.segments && data.segments.length > 0) {
          // 为防止大数据集事务超时，分批处理 segments
          const BATCH_SIZE = 100;
          const segments = data.segments.map((segment, index) => ({
            transcriptId,
            start: segment.start,
            end: segment.end,
            text: segment.text,
            wordTimestamps: segment.wordTimestamps || [],
            // 添加序号以保持顺序
            segmentIndex: index,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          // 分批插入以避免内存问题
          for (let i = 0; i < segments.length; i += BATCH_SIZE) {
            const batch = segments.slice(i, i + BATCH_SIZE);
            await tx.table("segments").bulkAdd(batch);

            // 如果数据量大，添加小延迟以避免阻塞UI
            if (i > 0 && i % (BATCH_SIZE * 5) === 0) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
        }

        const processingTime = Date.now() - startTime;
        console.log(
          `✅ 转录结果保存完成 (文件ID: ${fileId}) - 耗时: ${processingTime}ms, segments: ${data.segments?.length || 0}`,
        );

        return transcriptId;
      },
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(
      `❌ 转录结果保存失败 (文件ID: ${fileId}) - 耗时: ${processingTime}ms`,
      error,
    );

    // 尝试清理可能的部分数据
    try {
      await db.transaction("rw", db.transcripts, db.segments, async (tx) => {
        const transcripts = await tx
          .table("transcripts")
          .where("fileId")
          .equals(fileId)
          .toArray();

        for (const transcript of transcripts) {
          if (transcript.id) {
            await tx
              .table("segments")
              .where("transcriptId")
              .equals(transcript.id)
              .delete();
            await tx.table("transcripts").delete(transcript.id);
          }
        }
      });
    } catch (cleanupError) {
      console.error("清理失败转录数据时出错:", cleanupError);
    }

    throw error;
  }
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  // 网络错误、超时、服务器临时错误可重试
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("500") ||
    message.includes("failed to fetch")
  );
}

// 转录操作的 mutation - 支持自动重试和取消
export function useTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      language = "ja",
      maxRetries = 3,
      signal,
    }: {
      fileId: number;
      language?: string;
      maxRetries?: number;
      signal?: AbortSignal;
    }) => {
      // 获取文件数据
      const file = await db.files.get(fileId);
      if (!file || !file.blob) {
        throw new Error("文件不存在或文件数据已损坏");
      }

      // 准备表单数据
      const formData = new FormData();
      formData.append("audio", file.blob, file.name);
      formData.append(
        "meta",
        JSON.stringify({ fileId: file.id?.toString() || "" }),
      );

      let lastError: Error | null = null;

      // 重试循环
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // 检查是否已取消
        if (signal?.aborted) {
          throw new DOMException("转录已取消", "AbortError");
        }

        try {
          // 调用服务器端 API 路由，传入 signal 支持取消
          const response = await fetch(
            `/api/transcribe?fileId=${fileId}&language=${language}`,
            {
              method: "POST",
              body: formData,
              signal,
            },
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.message ||
                `转录失败: ${response.statusText} (${response.status})`,
            );
          }

          const result: TranscriptionResponse = await response.json();

          if (!result.success) {
            throw new Error(result.error?.message || "转录请求失败");
          }

          // 保存转录结果到数据库（使用事务）
          await saveTranscriptionResults(fileId, result.data);

          return result.data;
        } catch (error) {
          // 如果是取消操作，直接抛出不重试
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }

          lastError = error instanceof Error ? error : new Error(String(error));

          // 最后一次尝试或不可重试的错误，直接抛出
          if (attempt === maxRetries - 1 || !isRetryableError(error)) {
            handleTranscriptionError(error, {
              fileId,
              operation: "transcribe",
              language,
            });
            throw error;
          }

          // 指数退避等待
          const waitTime = 1000 * 2 ** attempt; // 1s, 2s, 4s
          console.log(
            `转录失败，${waitTime / 1000}秒后重试 (${attempt + 1}/${maxRetries})...`,
          );
          await delay(waitTime);
        }
      }

      // 不应该到达这里，但为了类型安全
      throw lastError || new Error("转录失败");
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
