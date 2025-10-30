/**
 * 统一的文件状态管理 Hook
 * 简化转录逻辑，提供清晰的文件状态管理
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranscription } from "@/hooks/api/useTranscription";
import { db } from "@/lib/db/db";
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

      // 根据转录记录确定状态
      if (transcript) {
        return {
          status: transcript.status as FileStatus,
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
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    gcTime: 1000 * 60 * 10, // 10分钟垃圾回收
  });
}

// 文件状态管理 Hook
export function useFileStatusManager(fileId: number) {
  const queryClient = useQueryClient();
  const transcription = useTranscription();
  const [isUpdating, setIsUpdating] = useState(false);

  // 更新文件状态
  const updateFileStatus = useCallback(
    async (status: FileStatus, error?: string) => {
      setIsUpdating(true);
      try {
        await db.files.update(fileId, { status });

        // 如果是错误状态，也更新转录记录
        if (status === FileStatus.ERROR && error) {
          const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

          if (transcripts.length > 0) {
            const transcriptId = transcripts[0].id;
            if (transcriptId) {
              await db.transcripts.update(transcriptId, {
                status: "failed",
                error,
              });
            }
          }
        }

        // 刷新查询缓存
        queryClient.invalidateQueries({
          queryKey: fileStatusKeys.forFile(fileId),
        });
      } catch (error) {
        console.error("更新文件状态失败:", error);
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
      await updateFileStatus(FileStatus.TRANSCRIBING);

      // 开始转录
      await transcription.mutateAsync({ fileId, language: "ja" });

      // 转录成功后设置状态为完成
      await updateFileStatus(FileStatus.COMPLETED);
    } catch (error) {
      console.error("转录失败:", error);
      const errorMessage = error instanceof Error ? error.message : "转录失败";
      await updateFileStatus(FileStatus.ERROR, errorMessage);
      throw error;
    }
  }, [fileId, transcription, updateFileStatus]);

  // 重置文件状态
  const resetFileStatus = useCallback(async () => {
    await updateFileStatus(FileStatus.UPLOADED);
  }, [updateFileStatus]);

  return {
    updateFileStatus,
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
            console.error(`文件 ${fileId} 转录失败:`, error);
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
