import { useCallback, useEffect, useMemo, useState } from "react";
import { handleSilently } from "@/lib/error-handler";
import type { FileRow, TranscriptRow } from "@/types/database";

export interface TranscriptionProgress {
  progress: number;
  status: string;
}

export interface UseTranscriptionProgressReturn {
  transcriptionProgress: Map<number, TranscriptionProgress>;
  updateProgress: (fileId: number, progress: TranscriptionProgress) => void;
  clearProgress: (fileId: number) => void;
  clearAllProgress: () => void;
}

/**
 * Custom hook for managing transcription progress polling
 */
export function useTranscriptionProgress(
  files: FileRow[],
  transcripts: TranscriptRow[],
): UseTranscriptionProgressReturn {
  const [transcriptionProgress, setTranscriptionProgress] = useState<
    Map<number, TranscriptionProgress>
  >(new Map());

  // Memoize files that need polling to avoid unnecessary filtering
  const filesToPoll = useMemo(() => {
    return files.filter((file) => {
      if (!file.id) return false;
      // Check if this file has any processing transcripts
      const fileTranscripts = transcripts.filter((t) => t.fileId === file.id);
      return fileTranscripts.some((t) => t.status === "processing");
    });
  }, [files, transcripts]);

  // Memoize callback functions
  const updateProgress = useCallback((fileId: number, progress: TranscriptionProgress) => {
    setTranscriptionProgress((prev) => {
      const newMap = new Map(prev);
      newMap.set(fileId, progress);
      return newMap;
    });
  }, []);

  const clearProgress = useCallback((fileId: number) => {
    setTranscriptionProgress((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, []);

  const clearAllProgress = useCallback(() => {
    setTranscriptionProgress(new Map());
  }, []);

  // Helper function to poll a single file's progress
  const pollSingleFileProgress = useCallback(
    async (file: FileRow) => {
      if (!file.id) return;

      try {
        // Import the transcription service to get progress
        const { TranscriptionService } = await import("@/lib/transcription-service");
        const progress = await TranscriptionService.getTranscriptionProgress(file.id);

        updateProgress(file.id, {
          progress: progress.progress,
          status: progress.status,
        });
      } catch (error) {
        handleSilently(error, "progress-polling");
      }
    },
    [updateProgress],
  );

  // Poll for transcription progress updates - optimized to use memoized filesToPoll
  useEffect(() => {
    if (filesToPoll.length === 0) return;

    const interval = setInterval(async () => {
      // Poll all files concurrently for better performance
      await Promise.all(filesToPoll.map(pollSingleFileProgress));
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [filesToPoll, pollSingleFileProgress]);

  return {
    transcriptionProgress,
    updateProgress,
    clearProgress,
    clearAllProgress,
  };
}
