/**
 * Enhanced Transcription Hook with Progress Tracking Integration
 * Integrates new progress tracking system with existing transcription workflow
 */

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { db } from "@/lib/db/db";
import { handleTranscriptionError } from "@/lib/utils/transcription-error-handler";
import { useRobustProgressTracker } from "@/hooks/useRobustProgressTracker";
import { progressTrackerManager } from "@/lib/db/progress-tracker";
import { syncManager } from "@/lib/progress/sync-manager";
import type { DeviceInfo } from "@/types/mobile";
import type { ProgressUpdate } from "@/types/progress";

// Enhanced transcription request options
interface EnhancedTranscriptionOptions {
  fileId: number;
  language?: string;
  options?: {
    enableChunking?: boolean;
    chunkSizeMb?: number;
    priority?: number;
    progressTracking?: boolean;
    updateIntervalMs?: number;
    enableEnhancedProgress?: boolean;
    deviceInfo?: DeviceInfo;
    fallbackConfig?: {
      maxTierTransitions?: number;
      tierTransitionCooldown?: number;
      healthCheckTimeout?: number;
      enableMobileOptimizations?: boolean;
    };
    progressSyncConfig?: {
      conflictResolution?: "latest" | "highest" | "lowest" | "weighted" | "priority" | "smart";
      enableOfflineSupport?: boolean;
      syncInterval?: number;
      throttleMs?: number;
    };
  };
}

// Enhanced transcription response
interface EnhancedTranscriptionResponse {
  success: boolean;
  jobId?: string;
  isChunked?: boolean;
  totalChunks?: number;
  enhancedProgress?: boolean;
  text?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    wordTimestamps?: Array<{ word: string; start: number; end: number }>;
    confidence?: number;
    id: number;
  }>;
  language?: string;
  duration?: number;
  processingTime?: number;
}

// Query keys for enhanced transcription
export const enhancedTranscriptionKeys = {
  all: ["enhancedTranscription"] as const,
  forFile: (fileId: number) => [...enhancedTranscriptionKeys.all, "file", fileId] as const,
  job: (jobId: string) => [...enhancedTranscriptionKeys.all, "job", jobId] as const,
  progress: (fileId: number) => [...enhancedTranscriptionKeys.forFile(fileId), "progress"] as const,
};

// Hook for enhanced transcription with progress tracking
export function useEnhancedTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      language = "auto",
      options = {},
    }: EnhancedTranscriptionOptions): Promise<EnhancedTranscriptionResponse> => {
      console.log("Starting enhanced transcription:", {
        fileId,
        language,
        options,
        timestamp: new Date().toISOString(),
      });

      try {
        // Get file from database
        const file = await db.files.get(fileId);
        if (!file || !file.blob) {
          throw new Error("File not found or corrupted");
        }

        // Create form data for API request
        const formData = new FormData();
        formData.append("audio", file.blob, file.name);
        formData.append("meta", JSON.stringify({ fileId: fileId.toString() }));

        // Add enhanced options to form data
        if (options.enableChunking) {
          formData.append("enable_chunking", "true");
          formData.append("chunk_size_mb", (options.chunkSizeMb || 15).toString());
        }

        if (options.priority) {
          formData.append("priority", options.priority.toString());
        }

        if (options.progressTracking !== false) {
          formData.append("progress_tracking", "true");
        }

        if (options.updateIntervalMs) {
          formData.append("update_interval_ms", options.updateIntervalMs.toString());
        }

        if (options.enableEnhancedProgress) {
          formData.append("enhanced_progress", "true");
        }

        if (options.deviceInfo) {
          formData.append("device_info", JSON.stringify(options.deviceInfo));
        }

        if (options.fallbackConfig) {
          formData.append("fallback_config", JSON.stringify(options.fallbackConfig));
        }

        if (options.progressSyncConfig) {
          formData.append("sync_config", JSON.stringify(options.progressSyncConfig));
        }

        // Make API request
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        console.log("Enhanced transcription response:", {
          success: result.success,
          jobId: result.job?.id,
          isChunked: result.job?.is_chunked,
          hasEnhancedProgress: !!options.enableEnhancedProgress,
        });

        // Update file status in database
        if (result.job?.id) {
          // Job-based transcription - status will be managed by progress tracking
          await db.files.update(fileId, {
            status: "transcribing",
            // Add enhanced tracking metadata
            isChunked: result.job?.is_chunked || false,
            totalChunks: result.job?.total_chunks || 1,
          });

          // Create progress tracker if enhanced progress is enabled
          if (options.enableEnhancedProgress) {
            try {
              const progressTracker = progressTrackerManager.createTracker(result.job.id, {
                fileId,
                deviceInfo: options.deviceInfo,
                fallbackConfig: options.fallbackConfig,
                syncConfig: options.progressSyncConfig,
              });

              console.log("Enhanced progress tracker created:", {
                jobId: result.job.id,
                trackerId: progressTracker.id,
                fileId,
              });
            } catch (trackerError) {
              console.warn("Failed to create enhanced progress tracker:", trackerError);
              // Continue without enhanced progress tracking
            }
          }
        } else {
          // Immediate completion
          await db.files.update(fileId, { status: "completed" });
        }

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: enhancedTranscriptionKeys.forFile(fileId) });

        return {
          success: true,
          jobId: result.job?.id,
          isChunked: result.job?.is_chunked,
          totalChunks: result.job?.total_chunks,
          enhancedProgress: options.enableEnhancedProgress,
          text: result.text,
          segments: result.segments,
          language: result.language,
          duration: result.duration,
          processingTime: result.processing_time,
        };
      } catch (error) {
        console.error("Enhanced transcription failed:", error);

        // Update file status to error
        await db.files.update(fileId, { status: "error" });

        // Handle error with existing error handler
        handleTranscriptionError(error, {
          fileId,
          operation: "transcribe-enhanced",
          language,
        });

        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log("Enhanced transcription successful:", {
        fileId: variables.fileId,
        jobId: data.jobId,
        hasEnhancedProgress: data.enhancedProgress,
      });

      // Invalidate file status queries
      queryClient.invalidateQueries({
        queryKey: ["fileStatus", "file", variables.fileId]
      });
    },
    onError: (error, variables) => {
      console.error("Enhanced transcription mutation error:", error);

      // Invalidate file status queries on error
      queryClient.invalidateQueries({
        queryKey: ["fileStatus", "file", variables.fileId]
      });
    },
  });
}

// Hook for transcription with enhanced progress tracking (backward compatible)
export function useTranscriptionWithProgress() {
  const enhancedTranscription = useEnhancedTranscription();

  return {
    ...enhancedTranscription,
    // Keep the original interface for backward compatibility
    mutateAsync: async (params: EnhancedTranscriptionOptions) => {
      // Default to enhanced progress tracking for new implementations
      const enhancedParams = {
        ...params,
        options: {
          enableEnhancedProgress: true,
          progressTracking: true,
          ...params.options,
        },
      };

      return enhancedTranscription.mutateAsync(enhancedParams);
    },
  };
}

// Hook for getting transcription job status with enhanced progress
export function useTranscriptionJobStatus(jobId: string) {
  return useQuery({
    queryKey: enhancedTranscriptionKeys.job(jobId),
    queryFn: async () => {
      // Get progress tracker for the job
      const tracker = progressTrackerManager.getTracker(jobId);
      if (!tracker) {
        throw new Error(`Progress tracker not found for job: ${jobId}`);
      }

      return tracker.getProgress();
    },
    refetchInterval: (data) => {
      // Dynamic refetch interval based on job status
      if (!data) return 5000;

      if (data.status === "completed" || data.status === "failed") {
        return false; // Don't refetch completed/failed jobs
      }

      // Faster updates for active jobs
      return 2000;
    },
    staleTime: 1000,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for integrated transcription and progress tracking
export function useIntegratedTranscription(fileId: number, options: EnhancedTranscriptionOptions["options"] = {}) {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const transcription = useEnhancedTranscription();

  // Enhanced progress tracking
  const progressTracking = currentJobId ? useRobustProgressTracker(currentJobId, fileId, {
    deviceInfo: options.deviceInfo,
    fallbackConfig: options.fallbackConfig,
    syncConfig: options.progressSyncConfig,
  }) : null;

  const startTranscription = useCallback(async (language = "auto") => {
    try {
      const result = await transcription.mutateAsync({
        fileId,
        language,
        options: {
          enableEnhancedProgress: true,
          progressTracking: true,
          ...options,
        },
      });

      if (result.jobId) {
        setCurrentJobId(result.jobId);
      }

      return result;
    } catch (error) {
      console.error("Integrated transcription failed:", error);
      setCurrentJobId(null);
      throw error;
    }
  }, [fileId, transcription, options]);

  const reset = useCallback(() => {
    setCurrentJobId(null);
    progressTracking?.stop?.();
  }, [progressTracking]);

  return {
    startTranscription,
    reset,
    progress: progressTracking?.progress,
    isTranscribing: transcription.isPending,
    currentJobId,
    error: transcription.error,

    // Progress tracking controls
    stopProgress: progressTracking?.stop,
    forceFallback: progressTracking?.forceFallback,
    refetchProgress: progressTracking?.refetch,
    healthMetrics: progressTracking?.healthMetrics,
  };
}

// Hook for batch transcription with enhanced progress
export function useBatchTranscription() {
  const queryClient = useQueryClient();

  const startBatchTranscription = useCallback(async (
    fileIds: number[],
    options: Omit<EnhancedTranscriptionOptions, "fileId"> & {
      maxConcurrency?: number;
    } = {}
  ) => {
    const { maxConcurrency = 2, ...transcriptionOptions } = options;
    const results: Array<{ fileId: number; success: boolean; error?: string; jobId?: string }> = [];

    // Process files in batches to respect concurrency limits
    for (let i = 0; i < fileIds.length; i += maxConcurrency) {
      const batch = fileIds.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (fileId) => {
        try {
          // Get file for language detection
          const file = await db.files.get(fileId);
          const language = file?.language || "auto";

          // Create form data for this file
          const fileRecord = await db.files.get(fileId);
          if (!fileRecord?.blob) {
            throw new Error("File not found or corrupted");
          }

          const formData = new FormData();
          formData.append("audio", fileRecord.blob, fileRecord.name);
          formData.append("meta", JSON.stringify({ fileId: fileId.toString() }));
          formData.append("language", language);

          if (transcriptionOptions.options?.enableEnhancedProgress) {
            formData.append("enhanced_progress", "true");
            if (transcriptionOptions.options?.deviceInfo) {
              formData.append("device_info", JSON.stringify(transcriptionOptions.options.deviceInfo));
            }
          }

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();

          // Update file status
          await db.files.update(fileId, {
            status: result.job?.id ? "transcribing" : "completed"
          });

          return {
            fileId,
            success: true,
            jobId: result.job?.id,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          // Update file status to error
          await db.files.update(fileId, { status: "error" });

          return {
            fileId,
            success: false,
            error: errorMessage,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // Extract results and handle any promise rejections
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            fileId: 0, // Will be replaced by batch index
            success: false,
            error: result.reason?.message || "Promise rejected",
          });
        }
      });

      // Invalidate queries for this batch
      batch.forEach(fileId => {
        queryClient.invalidateQueries({
          queryKey: enhancedTranscriptionKeys.forFile(fileId)
        });
      });
    }

    return results;
  }, [queryClient]);

  return {
    startBatchTranscription,
  };
}

// Utility function to create enhanced transcription options
export function createEnhancedTranscriptionOptions(
  fileId: number,
  language = "auto",
  overrides: Partial<EnhancedTranscriptionOptions["options"]> = {}
): EnhancedTranscriptionOptions {
  return {
    fileId,
    language,
    options: {
      enableChunking: false,
      chunkSizeMb: 15,
      priority: 0,
      progressTracking: true,
      updateIntervalMs: 2000,
      enableEnhancedProgress: true,
      ...overrides,
    },
  };
}
