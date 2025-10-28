/**
 * 重构后的播放器数据 Hook
 * 使用新的转录状态管理系统
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getTranscriptionManager } from "@/lib/transcription/queue-manager";
import {
  useTaskByFileId,
  useTranscriptionQueue,
  useTranscriptionStore,
} from "@/lib/transcription/store";
import type { FileRow, Segment, TranscriptRow } from "@/types/db/database";
import type {
  TranscriptionOptions,
  TranscriptionQueueState,
  TranscriptionTask,
} from "@/types/transcription";

// 查询键
export const playerKeys = {
  all: ["player"] as const,
  file: (fileId: number) => [...playerKeys.all, "file", fileId] as const,
};

// 获取文件数据的查询
function useFileQuery(fileId: number) {
  return useQuery({
    queryKey: playerKeys.file(fileId),
    queryFn: async () => {
      const { db } = await import("@/lib/db/db");
      const file = await db.files.get(fileId);
      if (!file) {
        throw new Error("文件不存在");
      }

      // 生成音频URL
      let audioUrl: string | null = null;
      if (file.blob) {
        audioUrl = URL.createObjectURL(file.blob);
      }

      return { file, audioUrl };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// 获取转录数据的查询
function useTranscriptionDataQuery(fileId: number) {
  return useQuery({
    queryKey: ["transcription", "file", fileId],
    queryFn: async () => {
      const { db } = await import("@/lib/db/db");

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
    staleTime: 1000 * 10, // 10 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

interface UsePlayerDataReturn {
  // 文件数据
  file: FileRow | null;
  audioUrl: string | null;

  // 转录数据
  transcript: TranscriptRow | null;
  segments: Segment[];

  // 转录任务状态
  transcriptionTask: TranscriptionTask | null;
  isTranscribing: boolean;
  transcriptionProgress: number;
  transcriptionStatus: string;
  transcriptionMessage?: string;

  // 加载状态
  loading: boolean;
  error: string | null;

  // 操作方法
  startTranscription: (options?: TranscriptionOptions) => Promise<void>;
  cancelTranscription: () => boolean;
  retryTranscription: () => Promise<boolean>;
  pauseTranscription: () => boolean;
  resumeTranscription: () => boolean;

  // 工具方法
  retry: () => void;
  resetAutoTranscription: () => void;
}

/**
 * 重构后的播放器数据 Hook
 */
export function usePlayerData(fileId: string): UsePlayerDataReturn {
  const queryClient = useQueryClient();
  const audioUrlRef = useRef<string | null>(null);

  // 解析文件ID
  const parsedFileId = parseInt(fileId, 10);
  const isValidId = !Number.isNaN(parsedFileId);

  // 获取文件数据
  const fileQuery = useFileQuery(parsedFileId);
  const file = fileQuery.data?.file || null;
  const audioUrl = fileQuery.data?.audioUrl || null;

  // 获取转录数据
  const transcriptionQuery = useTranscriptionDataQuery(parsedFileId);
  const transcript = transcriptionQuery.data?.transcript || null;
  const segments = transcriptionQuery.data?.segments || [];

  // 获取转录任务状态
  const transcriptionTask = useTaskByFileId(parsedFileId);
  const _queueState = useTranscriptionQueue();

  // 获取转录管理器
  const transcriptionManager = getTranscriptionManager();

  // 计算加载状态
  const loading = fileQuery.isLoading || transcriptionQuery.isLoading;
  const error = fileQuery.error?.message || transcriptionQuery.error?.message || null;

  // 计算转录状态信息
  const transcriptionInfo = useMemo(() => {
    if (!transcriptionTask) {
      return {
        isTranscribing: false,
        progress: 0,
        status: "idle",
        message: "尚未开始转录",
      };
    }

    return {
      isTranscribing: transcriptionTask.status === "processing",
      progress: transcriptionTask.progress.progress,
      status: transcriptionTask.status,
      message: transcriptionTask.progress.message,
    };
  }, [transcriptionTask]);

  // 清理音频URL
  useEffect(() => {
    if (audioUrl && audioUrl !== audioUrlRef.current) {
      // 清理之前的URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = audioUrl;
    }

    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [audioUrl]);

  // 自动转录逻辑
  useEffect(() => {
    if (!isValidId || !file || loading) {
      return;
    }

    // 检查是否已有转录任务或完成转录
    if (transcriptionTask || transcript) {
      return;
    }

    // 检查用户配置是否自动开始转录
    const uiState = useTranscriptionStore.getState().uiState;
    if (!uiState.autoStartTranscription) {
      console.log("🔇 用户配置不自动转录，跳过自动转录");
      return;
    }

    // 延迟执行自动转录
    const timer = setTimeout(async () => {
      try {
        console.log("🎵 自动触发转录:", file.name);
        await transcriptionManager.addTask(parsedFileId, {
          language: uiState.defaultLanguage,
          priority: uiState.defaultPriority,
          autoStart: true,
        });
      } catch (error) {
        console.error("自动转录失败:", error);
      }
    }, 500); // 500ms 延迟

    return () => clearTimeout(timer);
  }, [
    isValidId,
    file,
    loading,
    transcriptionTask,
    transcript,
    parsedFileId,
    transcriptionManager.addTask,
  ]);

  // 监听转录完成事件，刷新数据
  useEffect(() => {
    if (!transcriptionTask) return;

    const unsubscribe = transcriptionManager.onTaskUpdate((task) => {
      if (task.id === transcriptionTask.id && task.status === "completed") {
        // 转录完成，刷新转录数据
        queryClient.invalidateQueries({
          queryKey: ["transcription", "file", parsedFileId],
        });
      }
    });

    return unsubscribe;
  }, [transcriptionTask, parsedFileId, queryClient, transcriptionManager.onTaskUpdate]);

  // 开始转录
  const startTranscription = useCallback(
    async (options: TranscriptionOptions = {}) => {
      if (!file) {
        throw new Error("文件不存在");
      }

      // 检查是否已有任务
      if (
        transcriptionTask &&
        transcriptionTask.status !== "failed" &&
        transcriptionTask.status !== "completed"
      ) {
        console.log("转录任务已存在，跳过重复创建");
        return;
      }

      try {
        console.log("🎙️ 手动开始转录:", file.name);

        await transcriptionManager.addTask(parsedFileId, {
          language: "ja",
          priority: "normal",
          autoStart: true,
          ...options,
        });
      } catch (error) {
        console.error("开始转录失败:", error);
        throw error;
      }
    },
    [file, parsedFileId, transcriptionTask, transcriptionManager],
  );

  // 取消转录
  const cancelTranscription = useCallback((): boolean => {
    if (!transcriptionTask) {
      return false;
    }

    return transcriptionManager.cancelTask(transcriptionTask.id);
  }, [transcriptionTask, transcriptionManager]);

  // 重试转录
  const retryTranscription = useCallback(async (): Promise<boolean> => {
    if (!transcriptionTask) {
      return false;
    }

    return await transcriptionManager.retryTask(transcriptionTask.id);
  }, [transcriptionTask, transcriptionManager]);

  // 暂停转录
  const pauseTranscription = useCallback((): boolean => {
    if (!transcriptionTask) {
      return false;
    }

    return transcriptionManager.pauseTask(transcriptionTask.id);
  }, [transcriptionTask, transcriptionManager]);

  // 恢复转录
  const resumeTranscription = useCallback((): boolean => {
    if (!transcriptionTask) {
      return false;
    }

    return transcriptionManager.resumeTask(transcriptionTask.id);
  }, [transcriptionTask, transcriptionManager]);

  // 重试函数（兼容旧接口）
  const retry = useCallback(() => {
    fileQuery.refetch();
    transcriptionQuery.refetch();
  }, [fileQuery, transcriptionQuery]);

  // 重置自动转录（兼容旧接口）
  const resetAutoTranscription = useCallback(() => {
    if (transcriptionTask?.status === "failed") {
      retryTranscription();
    } else if (!transcriptionTask && file) {
      startTranscription();
    }
  }, [transcriptionTask, file, retryTranscription, startTranscription]);

  return {
    // 文件数据
    file,
    audioUrl,

    // 转录数据
    transcript,
    segments,

    // 转录任务状态
    transcriptionTask,
    isTranscribing: transcriptionInfo.isTranscribing,
    transcriptionProgress: transcriptionInfo.progress,
    transcriptionStatus: transcriptionInfo.status,
    transcriptionMessage: transcriptionInfo.message,

    // 加载状态
    loading,
    error,

    // 操作方法
    startTranscription,
    cancelTranscription,
    retryTranscription,
    pauseTranscription,
    resumeTranscription,

    // 工具方法
    retry,
    resetAutoTranscription,
  };
}

/**
 * 兼容性 Hook - 为了保持向后兼容
 * @deprecated 请使用 usePlayerData 替代
 */
export function usePlayerDataQuery(fileId: string) {
  console.warn("usePlayerDataQuery is deprecated, please use usePlayerData instead");
  return usePlayerData(fileId);
}

/**
 * 转录状态 Hook - 提供转录相关的状态和操作
 */
export function useTranscriptionStatus(fileId: number) {
  const task = useTaskByFileId(fileId);
  const queueState = useTranscriptionQueue();
  const manager = getTranscriptionManager();

  return {
    task,
    status: task?.status || "idle",
    progress: task?.progress.progress || 0,
    message: task?.progress.message,
    error: task?.progress.error,

    // 队列信息
    queuePosition: task ? queueState.queued.findIndex((t) => t.id === task.id) + 1 : -1,
    estimatedWaitTime: task ? calculateEstimatedWaitTime(task, queueState) : undefined,

    // 操作方法
    start: (options?: TranscriptionOptions) => manager.addTask(fileId, options),
    cancel: () => (task ? manager.cancelTask(task.id) : false),
    retry: () => (task ? manager.retryTask(task.id) : Promise.resolve(false)),
    pause: () => (task ? manager.pauseTask(task.id) : false),
    resume: () => (task ? manager.resumeTask(task.id) : false),
  };
}

/**
 * 计算预估等待时间
 */
function calculateEstimatedWaitTime(
  task: TranscriptionTask,
  queueState: TranscriptionQueueState,
): number {
  const queuePosition = queueState.queued.findIndex((t: TranscriptionTask) => t.id === task.id);
  if (queuePosition === -1) return 0;

  // 简单估算：每个任务平均2分钟
  const averageTaskDuration = 120; // 秒
  const tasksAhead = queuePosition;
  const maxConcurrency = queueState.maxConcurrency;

  return Math.ceil(tasksAhead / maxConcurrency) * averageTaskDuration;
}
