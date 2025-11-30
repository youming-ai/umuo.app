/**
 * 统一的文件状态管理 Hook
 * 简化转录逻辑，提供清晰的文件状态管理
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranscription } from "@/hooks/api/useTranscription";
import { db } from "@/lib/db/db";
import { handleTranscriptionError } from "@/lib/utils/transcription-error-handler";
import { FileStatus } from "@/types/db/database";

// 查询键定义
export const fileStatusKeys = {
  all: ["fileStatus"] as const,
  forFile: (fileId: number) => [...fileStatusKeys.all, "file", fileId] as const,
};

// 获取文件状态
export function useFileStatus(fileId: number) {
  return useQuery({
    queryKey: fileStatusKeys.forFile(fileId),
    queryFn: async () => {
      // 从数据库获取文件信息
      const file = await db.files.get(fileId);
      if (!file) {
        return { status: FileStatus.ERROR, error: "文件不存在" };
      }

      // 检查是否有转录记录
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

      const transcript = transcripts.length > 0 ? transcripts[0] : null;

      // 根据转录记录确定状态（TranscriptRow.status -> FileStatus 映射）
      if (transcript) {
        const statusMap: Record<string, FileStatus> = {
          pending: FileStatus.UPLOADED,
          processing: FileStatus.TRANSCRIBING,
          completed: FileStatus.COMPLETED,
          failed: FileStatus.ERROR,
        };
        const mappedStatus = statusMap[transcript.status] || FileStatus.UPLOADED;

        return {
          status: mappedStatus,
          transcriptId: transcript.id,
          transcript,
          file,
        };
      }

      // 没有转录记录，状态为已上传
      return {
        status: FileStatus.UPLOADED,
        file,
      };
    },
    staleTime: 1000 * 60 * 15, // 15分钟缓存 - 减少网络请求
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收
  });
}

// 文件状态管理 Hook
export function useFileStatusManager(fileId: number) {
  const queryClient = useQueryClient();
  const transcription = useTranscription();
  const [isUpdating, setIsUpdating] = useState(false);

  // 更新转录状态（主要更新 TranscriptRow，FileRow.status 作为备用）
  const updateTranscriptionStatus = useCallback(
    async (
      status: "pending" | "processing" | "completed" | "failed",
      error?: string,
    ) => {
      setIsUpdating(true);
      try {
        // 查找现有转录记录
        const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

        if (transcripts.length > 0 && transcripts[0].id) {
          // 更新现有转录记录
          await db.transcripts.update(transcripts[0].id, {
            status,
            error: error || undefined,
            updatedAt: new Date(),
          });
        } else if (status === "pending" || status === "processing") {
          // 创建新的转录记录（仅在开始转录时）
          await db.transcripts.add({
            fileId,
            status,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // 同时更新 FileRow.status 保持向后兼容
        const fileStatus =
          status === "completed"
            ? FileStatus.COMPLETED
            : status === "failed"
              ? FileStatus.ERROR
              : status === "processing"
                ? FileStatus.TRANSCRIBING
                : FileStatus.UPLOADED;
        await db.files.update(fileId, { status: fileStatus, updatedAt: new Date() });

        // 刷新查询缓存
        queryClient.invalidateQueries({
          queryKey: fileStatusKeys.forFile(fileId),
        });
      } catch (error) {
        console.error("更新转录状态失败:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [fileId, queryClient],
  );

  // 开始转录
  const startTranscription = useCallback(async () => {
    try {
      // 设置状态为转录中
      await updateTranscriptionStatus("processing");

      // 开始转录（支持自动重试）
      await transcription.mutateAsync({ fileId, language: "ja" });

      // 转录成功后设置状态为完成
      await updateTranscriptionStatus("completed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "转录失败";
      handleTranscriptionError(error, {
        fileId,
        operation: "transcribe",
        language: "ja",
      });
      await updateTranscriptionStatus("failed", errorMessage);
      throw error;
    }
  }, [fileId, transcription, updateTranscriptionStatus]);

  // 重置文件状态
  const resetFileStatus = useCallback(async () => {
    // 删除现有转录记录并重置状态
    const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
    for (const transcript of transcripts) {
      if (transcript.id) {
        await db.segments.where("transcriptId").equals(transcript.id).delete();
        await db.transcripts.delete(transcript.id);
      }
    }
    await db.files.update(fileId, { status: FileStatus.UPLOADED, updatedAt: new Date() });
    queryClient.invalidateQueries({
      queryKey: fileStatusKeys.forFile(fileId),
    });
  }, [fileId, queryClient]);

  return {
    updateTranscriptionStatus,
    startTranscription,
    resetFileStatus,
    isUpdating,
    isTranscribing: transcription.isPending,
  };
}

// 批量文件状态管理
export function useBatchFileStatus() {
  const queryClient = useQueryClient();

  // 批量转录
  const startBatchTranscription = useCallback(
    async (fileIds: number[]) => {
      const results = await Promise.allSettled(
        fileIds.map(async (fileId) => {
          try {
            // 设置状态为转录中
            await db.files.update(fileId, { status: FileStatus.TRANSCRIBING });
            queryClient.invalidateQueries({
              queryKey: fileStatusKeys.forFile(fileId),
            });

            // 调用转录 API
            const response = await fetch(`/api/transcribe?fileId=${fileId}&language=ja`, {
              method: "POST",
              body: await createFormData(fileId),
            });

            if (!response.ok) {
              throw new Error(`转录失败: ${response.statusText}`);
            }

            // 设置状态为完成
            await db.files.update(fileId, { status: FileStatus.COMPLETED });
            queryClient.invalidateQueries({
              queryKey: fileStatusKeys.forFile(fileId),
            });

            return { fileId, success: true };
          } catch (error) {
            // 统一错误处理
            handleTranscriptionError(error, {
              fileId,
              operation: "transcribe",
              language: "ja",
            });

            // 设置状态为错误
            await db.files.update(fileId, { status: FileStatus.ERROR });
            queryClient.invalidateQueries({
              queryKey: fileStatusKeys.forFile(fileId),
            });

            return {
              fileId,
              success: false,
              error: error instanceof Error ? error.message : "未知错误",
            };
          }
        }),
      );

      return results;
    },
    [queryClient],
  );

  return {
    startBatchTranscription,
  };
}

// 辅助函数：创建表单数据
async function createFormData(fileId: number): Promise<FormData> {
  const file = await db.files.get(fileId);
  if (!file || !file.blob) {
    throw new Error("文件不存在或数据已损坏");
  }

  const formData = new FormData();
  formData.append("audio", file.blob, file.name);
  formData.append("meta", JSON.stringify({ fileId: fileId.toString() }));

  return formData;
}
