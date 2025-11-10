/**
 * Mobile Chunked Upload Hook
 *
 * This hook integrates the chunked upload system with the mobile file upload
 * component, providing a seamless experience for mobile users.
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useFiles } from "@/hooks";
import { validateFiles, type FileValidationOptions } from "../FileValidation";
import type { FileRow } from "@/types/db/database";

import {
  createChunkedUploader,
  useChunkedUpload,
  useUploadSession,
  useUploadCleanup,
  getOptimalUploadConfig,
  validateUploadFiles,
  createUploadErrorMessage,
  type UploadProgress,
  type UploadConfig,
} from "@/lib/upload";

interface MobileChunkedUploadOptions extends FileValidationOptions {
  onSuccess?: (files: FileRow[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
  onSessionStart?: (sessionId: string) => void;
  onSessionComplete?: (sessionId: string, files: FileRow[]) => void;
  enableMobileOptimizations?: boolean;
  customConfig?: Partial<UploadConfig>;
}

interface ChunkedUploadProgress {
  sessionId?: string;
  fileName: string;
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  estimatedTimeRemaining: number;
  stage: 'preparing' | 'uploading' | 'verifying' | 'assembling' | 'completed' | 'error';
  chunksCompleted: number;
  totalChunks: number;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  isPaused: boolean;
  isRetrying: boolean;
}

export function useMobileChunkedUpload(options: MobileChunkedUploadOptions = {}) {
  const {
    onSuccess,
    onError,
    onProgress,
    onSessionStart,
    onSessionComplete,
    enableMobileOptimizations = true,
    customConfig,
  } = options;

  const { addFiles } = useFiles();
  const queryClient = useQueryClient();
  const uploaderRef = useRef<any>(null);
  const currentSessionRef = useRef<string | null>(null);
  const uploadProgressRef = useRef<ChunkedUploadProgress | null>(null);

  // Initialize uploader with mobile optimizations
  useEffect(() => {
    let config = customConfig || {};

    if (enableMobileOptimizations) {
      const optimalConfig = getOptimalUploadConfig();
      config = { ...optimalConfig, ...config };
    }

    uploaderRef.current = createChunkedUploader({
      config,
      enableLogging: process.env.NODE_ENV === 'development',
      onProgress: (progress) => {
        // Update progress ref
        uploadProgressRef.current = {
          sessionId: progress.sessionId,
          fileName: progress.fileName,
          loaded: progress.loaded,
          total: progress.total,
          percentage: progress.percentage,
          speed: progress.speed,
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
          stage: progress.stage,
          chunksCompleted: progress.chunksCompleted,
          totalChunks: progress.totalChunks,
          canPause: true,
          canResume: false,
          canCancel: true,
          isPaused: false,
          isRetrying: false,
        };

        onProgress?.(progress);
      },
      onComplete: async (sessionId, response) => {
        // Add files to database
        const uploadedFiles = await Promise.all(
          response.files.map(async (file: any) => {
            await addFiles([file.originalFile]);
            return {
              id: Date.now() + Math.random(),
              name: file.name,
              size: file.size,
              type: file.type,
              blob: file.originalFile,
              uploadedAt: new Date(),
              updatedAt: new Date(),
            } as FileRow;
          })
        );

        // Update progress to completed
        if (uploadProgressRef.current) {
          uploadProgressRef.current.stage = 'completed';
          uploadProgressRef.current.percentage = 100;
        }

        currentSessionRef.current = null;
        queryClient.invalidateQueries({ queryKey: ["files"] });

        onSessionComplete?.(sessionId, uploadedFiles);
        onSuccess?.(uploadedFiles);
      },
      onError: (error) => {
        // Update progress to error
        if (uploadProgressRef.current) {
          uploadProgressRef.current.stage = 'error';
        }

        currentSessionRef.current = null;
        onError?.(error);
      },
    });

    return () => {
      if (uploaderRef.current) {
        uploaderRef.current.destroy();
      }
    };
  }, [enableMobileOptimizations, customConfig, onProgress, onSessionComplete, onSuccess, onError, addFiles, queryClient]);

  // Enhanced upload mutation with chunked upload
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      // Validate files
      const validation = validateFiles(files, options);
      const fileValidation = validateUploadFiles(files);

      if (validation.invalidFiles.length > 0 || fileValidation.invalid.length > 0) {
        const errors = [
          ...validation.results.filter(r => !r.isValid).map(r => r.errors.join(', ')),
          ...fileValidation.invalid.map(v => v.reason)
        ];
        throw new Error(`Invalid files: ${errors.join('; ')}`);
      }

      const validFiles = validation.validFiles.filter(file =>
        fileValidation.valid.some(vf => vf.name === file.name)
      );

      if (validFiles.length === 0) {
        throw new Error("No valid files to upload");
      }

      // Start chunked upload for each file
      const uploadPromises = validFiles.map(async (file, index) => {
        const sessionId = await uploaderRef.current.uploadFile(file, {
          ...customConfig,
          metadata: {
            originalIndex: index,
            totalFiles: validFiles.length,
            uploadBatch: Date.now(),
          },
        });

        onSessionStart?.(sessionId);
        currentSessionRef.current = sessionId;

        return { sessionId, file };
      });

      return Promise.all(uploadPromises);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(new Error(errorMessage));
    },
  });

  // Get session details for progress tracking
  const {
    session,
    progress,
    isActive,
    isPaused,
    pauseUpload,
    resumeUpload,
    cancelUpload
  } = useUploadSession(currentSessionRef.current || '');

  // Update progress based on session state
  useEffect(() => {
    if (progress && uploadProgressRef.current) {
      uploadProgressRef.current = {
        ...uploadProgressRef.current,
        fileName: progress.fileName,
        loaded: progress.loaded,
        total: progress.total,
        percentage: progress.percentage,
        speed: progress.speed,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        stage: progress.stage,
        chunksCompleted: progress.chunksCompleted,
        totalChunks: progress.totalChunks,
        canPause: isActive && !isPaused,
        canResume: isPaused,
        canCancel: true,
        isPaused,
        isRetrying: uploadMutation.isPending,
      };
    }
  }, [progress, isActive, isPaused, uploadMutation.isPending]);

  // Control functions
  const uploadFiles = useCallback((files: File[]) => {
    if (uploaderRef.current && !uploadMutation.isPending) {
      uploadMutation.mutate(files);
    }
  }, [uploadMutation]);

  const pauseCurrentUpload = useCallback(() => {
    if (currentSessionRef.current && pauseUpload) {
      pauseUpload();
    }
  }, [pauseUpload]);

  const resumeCurrentUpload = useCallback(() => {
    if (currentSessionRef.current && resumeUpload) {
      resumeUpload();
    }
  }, [resumeUpload]);

  const cancelCurrentUpload = useCallback(() => {
    if (currentSessionRef.current && cancelUpload) {
      cancelUpload();
      uploadMutation.reset();
      currentSessionRef.current = null;
      uploadProgressRef.current = null;
    }
  }, [cancelUpload, uploadMutation]);

  const retryUpload = useCallback(() => {
    if (uploadMutation.error && uploadMutation.data) {
      // Retry the failed upload
      const files = uploadMutation.data.map((uploadData: any) => uploadData.file);
      uploadMutation.reset();
      uploadFiles(files);
    }
  }, [uploadMutation, uploadFiles]);

  // Cleanup on unmount
  const { cleanup } = useUploadCleanup();
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    // Upload functions
    uploadFiles,
    pauseUpload: pauseCurrentUpload,
    resumeUpload: resumeCurrentUpload,
    cancelUpload: cancelCurrentUpload,
    retryUpload,

    // State
    uploadProgress: uploadProgressRef.current,
    isUploading: uploadMutation.isPending || isActive,
    isPaused,
    isRetrying: uploadMutation.isPending && !!uploadMutation.error,

    // Error handling
    error: uploadMutation.error,
    errorMessage: uploadMutation.error ? createUploadErrorMessage(uploadMutation.error as any) : null,

    // Session info
    sessionId: currentSessionRef.current,
    session,
    progress,

    // Capabilities
    canPause: uploadProgressRef.current?.canPause || false,
    canResume: uploadProgressRef.current?.canResume || false,
    canCancel: uploadProgressRef.current?.canCancel || false,
    canRetry: !!uploadMutation.error && uploadMutation.data,

    // File info
    totalFiles: uploadMutation.data?.length || 0,
    currentFileName: uploadProgressRef.current?.fileName || '',

    // Statistics
    uploadSpeed: uploadProgressRef.current?.speed || 0,
    estimatedTimeRemaining: uploadProgressRef.current?.estimatedTimeRemaining || 0,
    chunksCompleted: uploadProgressRef.current?.chunksCompleted || 0,
    totalChunks: uploadProgressRef.current?.totalChunks || 0,
  };
}

/**
 * Enhanced hook for managing multiple concurrent uploads
 */
export function useMobileBatchUpload(options: MobileChunkedUploadOptions = {}) {
  const queryClient = useQueryClient();
  const activeUploadsRef = useRef<Map<string, any>>(new Map());
  const completedUploadsRef = useRef<FileRow[]>([]);
  const failedUploadsRef = useRef<Array<{ file: File; error: Error }>>([]);

  // Batch upload mutation
  const batchUploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploader = createChunkedUploader({
        enableLogging: process.env.NODE_ENV === 'development',
        config: getOptimalUploadConfig(),
      });

      const uploadPromises = files.map(async (file) => {
        try {
          const sessionId = await uploader.uploadFile(file, options.customConfig);

          // Track the upload
          activeUploadsRef.current.set(sessionId, { file, sessionId, uploader });

          // Wait for completion
          return new Promise((resolve, reject) => {
            const checkProgress = () => {
              const progress = uploader.getProgress(sessionId);
              if (progress?.stage === 'completed') {
                activeUploadsRef.current.delete(sessionId);
                resolve({ file, sessionId });
              } else if (progress?.stage === 'error') {
                activeUploadsRef.current.delete(sessionId);
                reject(new Error(`Upload failed for ${file.name}`));
              } else {
                setTimeout(checkProgress, 1000);
              }
            };
            checkProgress();
          });
        } catch (error) {
          failedUploadsRef.current.push({
            file,
            error: error instanceof Error ? error : new Error('Unknown error')
          });
          throw error;
        }
      });

      const results = await Promise.allSettled(uploadPromises);

      // Process results
      const successful = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);

      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason);

      // Add successful files to database
      if (successful.length > 0) {
        const { addFiles } = await import("@/hooks");
        await addFiles(successful.map(s => s.file));
      }

      return {
        successful: successful.length,
        failed: failed.length,
        total: files.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      options.onSuccess?.(completedUploadsRef.current);
    },
  });

  // Cancel all uploads
  const cancelAllUploads = useCallback(() => {
    for (const [sessionId, { uploader }] of activeUploadsRef.current.entries()) {
      uploader.cancelUpload(sessionId).catch(console.error);
    }
    activeUploadsRef.current.clear();
    batchUploadMutation.reset();
  }, [batchUploadMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllUploads();
    };
  }, [cancelAllUploads]);

  return {
    uploadFiles: batchUploadMutation.mutate,
    cancelAllUploads,
    isUploading: batchUploadMutation.isPending,
    activeUploads: activeUploadsRef.current.size,
    completedUploads: completedUploadsRef.current.length,
    failedUploads: failedUploadsRef.current.length,
    result: batchUploadMutation.data,
    error: batchUploadMutation.error,
  };
}

export default useMobileChunkedUpload;
