/**
 * 统一的文件状态管理 Hook
 * 简化转录逻辑，提供清晰的文件状态管理
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  useTranscription,
  useTranscriptionWithProgress,
} from "@/hooks/api/useTranscription";
import { useIntegratedTranscription } from "@/hooks/useTranscription";
import { db } from "@/lib/db/db";
import { handleTranscriptionError } from "@/lib/utils/transcription-error-handler";
import { FileStatus } from "@/types/db/database";
import { transcriptionJobManager } from "@/lib/transcription/job-manager";
import { useDeviceInfo } from "@/hooks/useRobustProgressTracker";

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
      const transcripts = await db.transcripts
        .where("fileId")
        .equals(fileId)
        .toArray();

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
    staleTime: 1000 * 60 * 15, // 15分钟缓存 - 减少网络请求
    gcTime: 1000 * 60 * 30, // 30分钟垃圾回收
  });
}

// Enhanced file status manager options
interface FileStatusManagerOptions {
  enableEnhancedProgress?: boolean;
  fallbackConfig?: {
    maxTierTransitions?: number;
    tierTransitionCooldown?: number;
    healthCheckTimeout?: number;
    enableMobileOptimizations?: boolean;
  };
  progressSyncConfig?: {
    conflictResolution?:
      | "latest"
      | "highest"
      | "lowest"
      | "weighted"
      | "priority"
      | "smart";
    enableOfflineSupport?: boolean;
    syncInterval?: number;
    throttleMs?: number;
  };
}

// 文件状态管理 Hook
export function useFileStatusManager(
  fileId: number,
  options: FileStatusManagerOptions = {},
) {
  const queryClient = useQueryClient();
  const transcription = useTranscription();
  const enhancedTranscription = useTranscriptionWithProgress();
  const { deviceInfo } = useDeviceInfo();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Integrated transcription with enhanced progress tracking
  const {
    startTranscription: startIntegratedTranscription,
    progress: enhancedProgress,
    currentJobId: integratedJobId,
    reset: resetTranscription,
  } = useIntegratedTranscription(fileId, {
    enableEnhancedProgress: options.enableEnhancedProgress,
    deviceInfo,
    fallbackConfig: options.fallbackConfig,
    progressSyncConfig: options.progressSyncConfig,
  });

  // 更新文件状态
  const updateFileStatus = useCallback(
    async (status: FileStatus, error?: string) => {
      setIsUpdating(true);
      try {
        await db.files.update(fileId, { status });

        // 如果是错误状态，也更新转录记录
        if (status === FileStatus.ERROR && error) {
          const transcripts = await db.transcripts
            .where("fileId")
            .equals(fileId)
            .toArray();

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

  // 开始转录 - 使用集成转录系统
  const startTranscription = useCallback(async () => {
    try {
      // 设置状态为转录中
      await updateFileStatus(FileStatus.TRANSCRIBING);

      // 获取文件信息用于优化决策
      const file = await db.files.get(fileId);
      if (!file) {
        throw new Error("文件不存在");
      }

      // 检测设备和网络条件
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;
      const networkType = connection?.effectiveType || "unknown";
      const isCellular =
        networkType.includes("2g") ||
        networkType.includes("3g") ||
        networkType.includes("4g");

      // 基于文件大小和设备类型决定是否分块
      const fileSizeMB = file.size / (1024 * 1024);
      const shouldChunk = fileSizeMB > 15 || (isMobile && fileSizeMB > 8);

      console.log("开始集成转录:", {
        fileId,
        fileSize: fileSizeMB,
        shouldChunk,
        deviceType: deviceInfo?.type || (isMobile ? "mobile" : "desktop"),
        enhancedProgress: options.enableEnhancedProgress,
      });

      // 使用集成转录系统
      const result = await startIntegratedTranscription("ja");

      console.log("集成转录已启动:", {
        fileId,
        jobId: result.jobId,
        isChunked: result.isChunked,
        enhancedProgress: options.enableEnhancedProgress,
      });

      // 任务型转录，状态由进度跟踪管理
      console.log("转录任务正在进行:", {
        fileId,
        jobId: result.jobId,
        isChunked: result.isChunked,
        enhancedProgress: options.enableEnhancedProgress,
      });
      // 状态将在任务完成时通过进度跟踪更新
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "转录失败";
      handleTranscriptionError(error, {
        fileId,
        operation: options.enableEnhancedProgress
          ? "transcribe-integrated"
          : "transcribe",
        language: "ja",
      });
      await updateFileStatus(FileStatus.ERROR, errorMessage);
      resetTranscription(); // Reset integrated transcription on error
      throw error;
    }
  }, [
    fileId,
    startIntegratedTranscription,
    updateFileStatus,
    options,
    deviceInfo,
    resetTranscription,
  ]);

  // 重置文件状态
  const resetFileStatus = useCallback(async () => {
    await updateFileStatus(FileStatus.UPLOADED);
  }, [updateFileStatus]);

  return {
    updateFileStatus,
    startTranscription,
    resetFileStatus,
    isUpdating,
    isTranscribing: startIntegratedTranscription ? true : false,

    // Enhanced progress tracking information
    enhancedProgress,
    currentJobId: integratedJobId || currentJobId,
    hasEnhancedProgress: options.enableEnhancedProgress,

    // Additional controls for enhanced progress
    stopEnhancedProgress: enhancedProgress?.stop,
    forceFallback: enhancedProgress?.forceFallback,
    refetchProgress: enhancedProgress?.refetch,
    healthMetrics: enhancedProgress?.healthMetrics,
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
            const response = await fetch(
              `/api/transcribe?fileId=${fileId}&language=ja`,
              {
                method: "POST",
                body: await createFormData(fileId),
              },
            );

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
