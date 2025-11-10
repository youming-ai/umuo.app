"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useFiles } from "@/hooks";
import { validateFiles, type FileValidationOptions } from "../FileValidation";
import type { FileRow } from "@/types/db/database";
import {
  useChunkedUpload,
  useUploadSession,
  formatFileSize,
  createUploadErrorMessage,
  MOBILE_UPLOAD_CONFIG,
  getOptimalUploadConfig,
} from "@/lib/upload";

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  fileId?: number;
  sessionId?: string;
  stage:
    | "preparing"
    | "uploading"
    | "verifying"
    | "processing"
    | "completed"
    | "error"
    | "paused";
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  chunksCompleted?: number;
  totalChunks?: number;
}

interface MobileUploadOptions extends FileValidationOptions {
  onSuccess?: (files: FileRow[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
  useChunkedUpload?: boolean; // Enable/disable chunked upload (default: true)
  enableResume?: boolean; // Enable resume capability (default: true)
  adaptiveUpload?: boolean; // Enable adaptive upload based on network conditions (default: true)
}

export function useMobileFileUpload(options: MobileUploadOptions = {}) {
  const { onSuccess, onError, onProgress } = options;
  const { addFiles } = useFiles();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadQueueRef = useRef<File[]>([]);
  const isUploadingRef = useRef(false);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      // Validate files first
      const validation = validateFiles(files, options);

      if (validation.invalidFiles.length > 0) {
        const errors = validation.results
          .filter((r) => !r.isValid)
          .map((r) => r.errors.join(", "))
          .join("; ");
        throw new Error(`Invalid files: ${errors}`);
      }

      if (validation.validFiles.length === 0) {
        throw new Error("No valid files to upload");
      }

      // Create abort controller for this upload batch
      abortControllerRef.current = new AbortController();
      uploadQueueRef.current = validation.validFiles;
      isUploadingRef.current = true;

      const uploadedFiles: FileRow[] = [];
      const totalSize = validation.validFiles.reduce(
        (sum, file) => sum + file.size,
        0,
      );
      let uploadedSize = 0;

      // Update progress to preparing stage
      setUploadProgress({
        loaded: 0,
        total: totalSize,
        percentage: 0,
        stage: "preparing",
      });
      onProgress?.({
        loaded: 0,
        total: totalSize,
        percentage: 0,
        stage: "preparing",
      });

      try {
        // Process files one by one to better track progress
        for (let i = 0; i < validation.validFiles.length; i++) {
          const file = validation.validFiles[i];

          // Check if upload was cancelled
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error("Upload cancelled");
          }

          // Update progress for current file
          setUploadProgress((prev) =>
            prev
              ? {
                  ...prev,
                  stage: "uploading",
                  percentage: (uploadedSize / totalSize) * 100,
                }
              : null,
          );
          onProgress?.({
            loaded: uploadedSize,
            total: totalSize,
            percentage: (uploadedSize / totalSize) * 100,
            stage: "uploading",
          });

          // Simulate upload progress for mobile - in real implementation,
          // this would be actual upload progress tracking
          const fileUploadProgress = await simulateFileUpload(
            file,
            (progress) => {
              const currentFileProgress = (progress / 100) * file.size;
              const totalProgress = uploadedSize + currentFileProgress;
              const percentage = (totalProgress / totalSize) * 100;

              setUploadProgress({
                loaded: totalProgress,
                total: totalSize,
                percentage,
                stage: "uploading",
              });
              onProgress?.({
                loaded: totalProgress,
                total: totalSize,
                percentage,
                stage: "uploading",
              });
            },
          );

          uploadedSize += file.size;

          // Add file to database
          await addFiles([file]);

          // For now, we'll simulate getting the uploaded file data
          // In a real implementation, you'd get this from the API response
          uploadedFiles.push({
            id: Date.now() + i, // Temporary ID
            name: file.name,
            size: file.size,
            type: file.type,
            blob: file,
            uploadedAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Final progress update
        setUploadProgress({
          loaded: totalSize,
          total: totalSize,
          percentage: 100,
          stage: "completed",
        });
        onProgress?.({
          loaded: totalSize,
          total: totalSize,
          percentage: 100,
          stage: "completed",
        });

        return uploadedFiles;
      } finally {
        isUploadingRef.current = false;
        abortControllerRef.current = null;
        uploadQueueRef.current = [];
      }
    },
    onSuccess: (uploadedFiles) => {
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["files"] });

      setUploadProgress(null);
      onSuccess?.(uploadedFiles);
    },
    onError: (error) => {
      setUploadProgress((prev) =>
        prev
          ? {
              ...prev,
              stage: "error",
            }
          : null,
      );
      onProgress?.(
        uploadProgress
          ? { ...uploadProgress, stage: "error" }
          : {
              loaded: 0,
              total: 0,
              percentage: 0,
              stage: "error",
            },
      );
      onError?.(error instanceof Error ? error : new Error("Upload failed"));
    },
  });

  const uploadFiles = useCallback(
    (files: File[]) => {
      if (isUploadingRef.current) {
        console.warn("Upload already in progress");
        return;
      }
      uploadMutation.mutate(files);
    },
    [uploadMutation],
  );

  const cancelUpload = useCallback(() => {
    if (
      abortControllerRef.current &&
      !abortControllerRef.current.signal.aborted
    ) {
      abortControllerRef.current.abort();
      uploadMutation.reset();
      setUploadProgress(null);
    }
  }, [uploadMutation]);

  const retryUpload = useCallback(() => {
    if (uploadQueueRef.current.length > 0 && !isUploadingRef.current) {
      uploadFiles(uploadQueueRef.current);
    }
  }, [uploadFiles]);

  return {
    uploadFiles,
    cancelUpload,
    retryUpload,
    uploadProgress,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error,
    canRetry: !!uploadMutation.error && uploadQueueRef.current.length > 0,
    hasPendingFiles: uploadQueueRef.current.length > 0,
  };
}

/**
 * Simulates file upload progress for mobile development
 * In production, this would be replaced with actual upload progress tracking
 */
async function simulateFileUpload(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<void> {
  const uploadTime = Math.max(1000, file.size / 10000); // Simulate upload time based on file size
  const progressInterval = 50; // Update every 50ms
  const steps = uploadTime / progressInterval;

  for (let i = 0; i <= steps; i++) {
    await new Promise((resolve) => setTimeout(resolve, progressInterval));
    const percentage = (i / steps) * 100;
    onProgress?.(percentage);
  }
}

/**
 * Hook for haptic feedback on mobile devices
 */
export function useHapticFeedback() {
  const triggerHaptic = useCallback(
    (type: "light" | "medium" | "heavy" | "success" | "error" = "light") => {
      // Check if haptic feedback is supported
      if ("vibrate" in navigator) {
        const patterns = {
          light: [10],
          medium: [50],
          heavy: [100],
          success: [10, 50, 10],
          error: [100, 50, 100],
        };

        navigator.vibrate(patterns[type]);
      }
    },
    [],
  );

  return { triggerHaptic };
}
