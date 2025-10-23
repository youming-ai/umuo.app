import { useCallback, useEffect, useRef, useState } from "react";
import { getConcurrencyManager } from "@/lib/ai/transcription-concurrency";
import type { TranscriptionProgress } from "@/lib/ai/transcription-service";
import { TranscriptionService } from "@/lib/ai/transcription-service";
import { DbUtils } from "@/lib/db/db";
import type { FileRow, ProcessingStatus } from "@/types/db/database";

interface TranscriptionManagerState {
  isTranscribing: boolean;
  transcriptionQueue: FileRow[];
  currentTranscription: FileRow | null;
  transcriptionProgress: Map<number, TranscriptionProgress>;
}

export function useTranscriptionManager() {
  const [state, setState] = useState<TranscriptionManagerState>({
    isTranscribing: false,
    transcriptionQueue: [],
    currentTranscription: null,
    transcriptionProgress: new Map(),
  });

  // 使用ref来防止竞态条件
  const activeRequestsRef = useRef<Set<number>>(new Set());
  const concurrencyManagerRef = useRef(getConcurrencyManager());

  // 清理函数
  useEffect(() => {
    return () => {
      // 组件卸载时取消所有活跃请求
      for (const fileId of activeRequestsRef.current) {
        concurrencyManagerRef.current.cancelRequest(`file-${fileId}`);
      }
      activeRequestsRef.current.clear();
    };
  }, []);

  interface ProgressData {
    status?: string;
    progress?: number;
    message?: string;
    error?: string;
  }

  const updateProgress = useCallback((fileId: number, progress: ProgressData) => {
    setState((prev) => {
      const newProgress = new Map(prev.transcriptionProgress);
      // 转换progress对象为TranscriptionProgress格式
      const convertedProgress: TranscriptionProgress = {
        fileId,
        status:
          (progress.status as "processing" | "completed" | "failed" | "idle" | "error") ||
          "processing",
        progress: progress.progress || 0,
        message: progress.message || `${progress.status}`,
      };
      newProgress.set(fileId, convertedProgress);
      return { ...prev, transcriptionProgress: newProgress };
    });
  }, []);

  const getProgressInfo = useCallback(
    (fileId: number) => {
      return state.transcriptionProgress.get(fileId);
    },
    [state.transcriptionProgress],
  );

  const getTranscriptionStatus = useCallback(
    (fileId: number): ProcessingStatus => {
      const progress = state.transcriptionProgress.get(fileId);
      if (progress) {
        return progress.status as ProcessingStatus;
      }
      return "pending";
    },
    [state.transcriptionProgress],
  );

  const startTranscription = useCallback(
    async (fileId: number, options: { language?: string } = {}) => {
      // 检查是否已经在转录中
      if (activeRequestsRef.current.has(fileId)) {
        return;
      }

      const file =
        state.transcriptionQueue.find((f) => f.id === fileId) || state.currentTranscription;
      if (!file) return;

      // 标记为活跃请求
      activeRequestsRef.current.add(fileId);
      const fileName = file.name;

      try {
        // Set current transcription before starting
        setState((prev) => ({
          ...prev,
          isTranscribing: true,
          currentTranscription: file,
        }));

        const result = await concurrencyManagerRef.current.execute(
          async () => {
            return await TranscriptionService.transcribeAudio(fileId, {
              language: options.language || "ja",
              onProgress: (progress) => {
                updateProgress(fileId, progress);
              },
            });
          },
          `file-${fileId}`,
          { retryCount: 2, timeoutMs: 60000 },
        );

        setState((prev) => {
          const newProgress = new Map(prev.transcriptionProgress);
          newProgress.set(fileId, {
            fileId,
            status: "completed",
            progress: 100,
            message: "转录完成",
          });

          return {
            ...prev,
            isTranscribing: false,
            currentTranscription: null,
            transcriptionProgress: newProgress,
          };
        });

        // Show success toast
        const { toast } = await import("sonner");
        toast.success(`转录完成: ${fileName}`);

        return result;
      } catch (error) {
        setState((prev) => {
          const newProgress = new Map(prev.transcriptionProgress);
          newProgress.set(fileId, {
            fileId,
            status: "failed",
            progress: 0,
            message: error instanceof Error ? error.message : "Unknown error",
          });

          return {
            ...prev,
            isTranscribing: false,
            currentTranscription: null,
            transcriptionProgress: newProgress,
          };
        });

        // Show error toast
        try {
          const { toast } = await import("sonner");
          toast.error(
            `转录失败: ${fileName}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        } catch (_toastError) {
          // 忽略toast错误
        }

        throw error;
      } finally {
        // 清理活跃请求标记
        activeRequestsRef.current.delete(fileId);
      }
    },
    [state.transcriptionQueue, state.currentTranscription, updateProgress],
  );

  const queueTranscription = useCallback((file: FileRow) => {
    setState((prev) => ({
      ...prev,
      transcriptionQueue: [...prev.transcriptionQueue, file],
    }));
  }, []);

  const retryTranscription = useCallback(
    async (fileId: number, options: { language?: string } = {}) => {
      // 检查是否已经在转录中
      if (activeRequestsRef.current.has(fileId)) {
        return;
      }

      // Clear any existing progress for this file
      setState((prev) => {
        const newProgress = new Map(prev.transcriptionProgress);
        newProgress.delete(fileId);
        return { ...prev, transcriptionProgress: newProgress };
      });

      // 从数据库重新加载文件信息，而不是依赖队列
      try {
        const file = await DbUtils.getFile(fileId);
        if (!file) {
          throw new Error("File not found");
        }

        // 如果文件已经在队列中或正在转录，先移除它
        setState((prev) => {
          const newQueue = prev.transcriptionQueue.filter((f) => f.id !== fileId);
          const newCurrentTranscription =
            prev.currentTranscription?.id === fileId ? null : prev.currentTranscription;
          return {
            ...prev,
            transcriptionQueue: newQueue,
            currentTranscription: newCurrentTranscription,
          };
        });

        // 显示开始重试的消息
        try {
          const { toast } = await import("sonner");
          toast.success(`开始重新转录: ${file.name}`);
        } catch (_toastError) {
          // 忽略toast错误
        }

        // 直接启动重试转录，而不是添加到队列
        await startTranscription(fileId, options);
      } catch (error) {
        setState((prev) => {
          const newProgress = new Map(prev.transcriptionProgress);
          newProgress.set(fileId, {
            fileId,
            status: "failed",
            progress: 0,
            message: error instanceof Error ? error.message : "Failed to reload file",
          });
          return { ...prev, transcriptionProgress: newProgress };
        });
        throw error;
      }
    },
    [startTranscription],
  );

  const clearProgress = useCallback((fileId: number) => {
    setState((prev) => {
      const newProgress = new Map(prev.transcriptionProgress);
      newProgress.delete(fileId);
      return { ...prev, transcriptionProgress: newProgress };
    });
  }, []);

  const clearAllProgress = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcriptionProgress: new Map(),
    }));
  }, []);

  // Auto-process queue
  useEffect(() => {
    const processNextInQueue = () => {
      if (!state.isTranscribing && state.transcriptionQueue.length > 0) {
        const nextFile = state.transcriptionQueue[0];

        // 检查文件是否已经在处理中
        if (nextFile.id && !activeRequestsRef.current.has(nextFile.id)) {
          setState((prev) => ({
            ...prev,
            transcriptionQueue: prev.transcriptionQueue.slice(1),
          }));

          // 使用setTimeout避免在render期间调用setState
          setTimeout(() => {
            startTranscription(nextFile.id ?? 0);
          }, 0);
        }
      }
    };

    processNextInQueue();
  }, [state.isTranscribing, state.transcriptionQueue, startTranscription]);

  return {
    isTranscribing: state.isTranscribing,
    currentTranscription: state.currentTranscription,
    transcriptionQueue: state.transcriptionQueue,
    transcriptionProgress: state.transcriptionProgress,
    getProgressInfo,
    getTranscriptionStatus,
    startTranscription,
    queueTranscription,
    retryTranscription,
    updateProgress,
    clearProgress,
    clearAllProgress,
  };
}
