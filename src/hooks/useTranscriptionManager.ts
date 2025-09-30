import { useCallback, useEffect, useState } from "react";
import { DbUtils } from "@/lib/db";
import type { TranscriptionProgress } from "@/lib/transcription-service";
import { TranscriptionService } from "@/lib/transcription-service";
import type { FileRow, ProcessingStatus } from "@/types/database";

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
      const file =
        state.transcriptionQueue.find((f) => f.id === fileId) || state.currentTranscription;
      if (!file) return;

      // Capture file details before async operations
      const fileName = file.name;

      try {
        // Set current transcription before starting
        setState((prev) => ({
          ...prev,
          isTranscribing: true,
          currentTranscription: file,
        }));

        const result = await TranscriptionService.transcribeAudio(fileId, {
          language: options.language || "ja",
          onProgress: (progress) => {
            updateProgress(fileId, progress);
          },
        });

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
        const { toast } = await import("sonner");
        toast.error(
          `转录失败: ${fileName}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );

        throw error;
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
    async (fileId: number, _options: { language?: string } = {}) => {
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

        // 将文件添加到队列前面，优先处理
        setState((prev) => ({
          ...prev,
          transcriptionQueue: [file, ...prev.transcriptionQueue],
        }));

        // 显示开始重试的消息
        const { toast } = await import("sonner");
        toast.success(`开始重新转录: ${file.name}`);

        // 注意：useEffect 会自动处理队列，不需要手动调用 startTranscription
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
    [],
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
    if (!state.isTranscribing && state.transcriptionQueue.length > 0) {
      const nextFile = state.transcriptionQueue[0];
      setState((prev) => ({
        ...prev,
        transcriptionQueue: prev.transcriptionQueue.slice(1),
      }));

      if (nextFile.id) {
        startTranscription(nextFile.id);
      }
    }
  }, [state.isTranscribing, state.transcriptionQueue, startTranscription]);

  return {
    isTranscribing: state.isTranscribing,
    currentTranscription: state.currentTranscription,
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
