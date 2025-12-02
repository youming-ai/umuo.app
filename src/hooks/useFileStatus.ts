/**
 * 统一的文件状态管理 Hook
 * 完全基于 TranscriptRow.status，移除 FileRow.status 依赖
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptionLanguageCode } from "@/components/layout/contexts/TranscriptionLanguageContext";
import { useTranscription } from "@/hooks/api/useTranscription";
import {
  getFileRealStatus,
  safeUpdateTranscriptionStatus,
} from "@/lib/utils/file-status-manager";
import { handleTranscriptionError } from "@/lib/utils/transcription-error-handler";
import { getTranscriptionQueue } from "@/lib/utils/transcription-queue";
import { FileStatus } from "@/types/db/database";
import { db } from "@/lib/db/db";

// 查询键定义
export const fileStatusKeys = {
  all: ["fileStatus"] as const,
  forFile: (fileId: number) => [...fileStatusKeys.all, "file", fileId] as const,
};

/**
 * 获取文件状态
 * 使用统一的状态管理器
 */
export function useFileStatus(fileId: number) {
  return useQuery({
    queryKey: fileStatusKeys.forFile(fileId),
    queryFn: async () => {
      // 使用统一的状态管理器获取真实状态
      const statusInfo = await getFileRealStatus(fileId);

      // 从数据库获取文件信息
      const file = await db.files.get(fileId);
      if (!file) {
        return { status: FileStatus.ERROR, error: "文件不存在" };
      }

      return {
        ...statusInfo,
        file,
      };
    },
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    gcTime: 1000 * 60 * 15, // 15分钟垃圾回收
  });
}

/**
 * 文件状态管理 Hook
 * 使用转录队列和统一的状态管理
 */
export function useFileStatusManager(fileId: number) {
  const queryClient = useQueryClient();
  const transcription = useTranscription();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 更新转录状态（使用统一的状态管理器）
  const updateTranscriptionStatus = useCallback(
    async (
      status: "pending" | "processing" | "completed" | "failed",
      error?: string,
    ) => {
      try {
        // 使用统一的状态管理器进行安全的状态更新
        await safeUpdateTranscriptionStatus(fileId, status, error);

        // 刷新查询缓存
        queryClient.invalidateQueries({
          queryKey: fileStatusKeys.forFile(fileId),
        });
      } catch (error) {
        console.error("更新转录状态失败:", error);
      }
    },
    [fileId, queryClient],
  );

  // 开始转录（使用队列）
  const startTranscription = useCallback(
    async (language: TranscriptionLanguageCode = "ja") => {
      const queue = getTranscriptionQueue();

      // 如果已经在处理，不重复添加
      if (queue.isInQueue(fileId)) {
        return;
      }

      setIsTranscribing(true);

      // 创建 abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // 设置状态为转录中
        await updateTranscriptionStatus("processing");

        // 开始转录（支持自动重试和取消）
        await transcription.mutateAsync({
          fileId,
          language,
          signal: abortController.signal,
        });

        // 转录成功后设置状态为完成
        await updateTranscriptionStatus("completed");
      } catch (error) {
        // 检查是否是取消操作
        if (error instanceof DOMException && error.name === "AbortError") {
          // 取消不算错误，恢复到待转录状态
          await updateTranscriptionStatus("pending");
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "转录失败";
        handleTranscriptionError(error, {
          fileId,
          operation: "transcribe",
          language,
        });
        await updateTranscriptionStatus("failed", errorMessage);
        throw error;
      } finally {
        setIsTranscribing(false);
        abortControllerRef.current = null;
      }
    },
    [fileId, transcription, updateTranscriptionStatus],
  );

  // 取消转录
  const cancelTranscription = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsTranscribing(false);
    }
  }, []);

  // 重置文件状态
  const resetFileStatus = useCallback(async () => {
    // 取消正在进行的转录
    cancelTranscription();

    // 删除现有转录记录
    const transcripts = await db.transcripts
      .where("fileId")
      .equals(fileId)
      .toArray();
    for (const transcript of transcripts) {
      if (transcript.id) {
        await db.segments.where("transcriptId").equals(transcript.id).delete();
        await db.transcripts.delete(transcript.id);
      }
    }

    // 刷新查询缓存
    queryClient.invalidateQueries({
      queryKey: fileStatusKeys.forFile(fileId),
    });
  }, [fileId, queryClient, cancelTranscription]);

  // 清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    updateTranscriptionStatus,
    startTranscription,
    cancelTranscription,
    resetFileStatus,
    isTranscribing: isTranscribing || transcription.isPending,
  };
}

/**
 * 批量文件状态管理
 * 使用转录队列进行并发控制
 */
export function useBatchFileStatus() {
  const queryClient = useQueryClient();
  const transcription = useTranscription();

  // 批量转录 - 使用队列
  const startBatchTranscription = useCallback(
    async (fileIds: number[], language: TranscriptionLanguageCode = "ja") => {
      const queue = getTranscriptionQueue();
      const results: Array<{
        fileId: number;
        success: boolean;
        error?: string;
      }> = [];

      // 设置队列任务回调
      queue.setTaskCallback(async (task) => {
        // 创建转录记录
        await db.transcripts.add({
          fileId: task.fileId,
          status: "processing",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        queryClient.invalidateQueries({
          queryKey: fileStatusKeys.forFile(task.fileId),
        });

        // 执行转录
        await transcription.mutateAsync({
          fileId: task.fileId,
          language: task.language,
          signal: task.abortController.signal,
        });

        // 更新状态为完成
        const transcripts = await db.transcripts
          .where("fileId")
          .equals(task.fileId)
          .toArray();
        if (transcripts.length > 0 && transcripts[0].id) {
          await db.transcripts.update(transcripts[0].id, {
            status: "completed",
            updatedAt: new Date(),
          });
        }

        queryClient.invalidateQueries({
          queryKey: fileStatusKeys.forFile(task.fileId),
        });

        results.push({ fileId: task.fileId, success: true });
      });

      // 设置状态变更回调
      queue.setStatusChangeCallback(async (fileId, status, error) => {
        if (status === "failed") {
          const transcripts = await db.transcripts
            .where("fileId")
            .equals(fileId)
            .toArray();
          if (transcripts.length > 0 && transcripts[0].id) {
            await db.transcripts.update(transcripts[0].id, {
              status: "failed",
              error,
              updatedAt: new Date(),
            });
          }
          queryClient.invalidateQueries({
            queryKey: fileStatusKeys.forFile(fileId),
          });
          results.push({ fileId, success: false, error });
        }
      });

      // 将所有任务添加到队列
      for (const fileId of fileIds) {
        queue.add(fileId, language);
      }

      return results;
    },
    [queryClient, transcription],
  );

  // 取消所有转录
  const cancelAllTranscriptions = useCallback(() => {
    const queue = getTranscriptionQueue();
    queue.cancelAll();
  }, []);

  return {
    startBatchTranscription,
    cancelAllTranscriptions,
  };
}
