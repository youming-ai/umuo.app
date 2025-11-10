/**
 * Progress Tracker Utilities and Hooks
 *
 * Helper functions and React hooks for integrating ProgressTracker
 * with the existing TanStack Query patterns and UI components.
 * Now includes enhanced progress calculation capabilities.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  progressTrackerManager,
  type ProgressTracker,
  type ProgressUpdate,
  type CreateProgressTrackerOptions,
} from "../db/progress-tracker";
import {
  EnhancedProgressTracker,
  createEnhancedProgressTracker,
  ProgressCalculationUtils,
  type ETAPrediction,
  type PerformanceMetrics,
} from "./progress-calculator-integration";
import { handleError } from "../utils/error-handler";
import type { DeviceInfo } from "@/types/mobile";

// Query keys for progress tracking
export const progressKeys = {
  all: ["progress"] as const,
  forFile: (fileId: number) => [...progressKeys.all, "file", fileId] as const,
  forJob: (jobId: string) => [...progressKeys.all, "job", jobId] as const,
  tracker: (trackerId: string) =>
    [...progressKeys.all, "tracker", trackerId] as const,
  stats: () => [...progressKeys.all, "stats"] as const,
};

// Progress update hook options
export interface UseProgressOptions {
  fileId?: number;
  jobId?: string;
  autoStart?: boolean;
  onUpdate?: (progress: ProgressUpdate) => void;
  onStageChange?: (stage: string, previousStage: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Hook for creating a new progress tracker
 */
export function useCreateProgressTracker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: CreateProgressTrackerOptions) => {
      try {
        const tracker = await progressTrackerManager.createTracker(options);

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: progressKeys.forJob(options.jobId),
        });
        if (options.fileId) {
          queryClient.invalidateQueries({
            queryKey: progressKeys.forFile(options.fileId),
          });
        }

        return tracker;
      } catch (error) {
        throw handleError(error, "useCreateProgressTracker");
      }
    },
  });
}

/**
 * Hook for accessing a progress tracker by ID
 */
export function useProgressTracker(
  trackerId: string | null,
  options: UseProgressOptions = {},
) {
  const [tracker, setTracker] = useState<ProgressTracker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Query for tracker data
  const {
    data: trackerData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: progressKeys.tracker(trackerId!),
    queryFn: async () => {
      if (!trackerId) return null;

      try {
        const trackerInstance =
          await progressTrackerManager.getTracker(trackerId);
        return trackerInstance?.getEntity() || null;
      } catch (error) {
        throw handleError(error, "useProgressTracker");
      }
    },
    enabled: !!trackerId && options.enabled !== false,
    refetchInterval: options.refetchInterval,
    staleTime: 2000, // 2 seconds
  });

  // Load tracker instance
  useEffect(() => {
    if (trackerId && !isInitialized) {
      progressTrackerManager
        .getTracker(trackerId)
        .then((trackerInstance) => {
          setTracker(trackerInstance);
          setIsInitialized(true);
        })
        .catch((error) => {
          console.error("Failed to load progress tracker:", error);
          options.onError?.(handleError(error, "useProgressTracker.load"));
        });
    }
  }, [trackerId, isInitialized, options.onError]);

  // Setup event listeners
  useEffect(() => {
    if (!tracker) return;

    const handleProgress = (progress: ProgressUpdate) => {
      options.onUpdate?.(progress);

      // Update query cache with latest progress
      queryClient.setQueryData(
        progressKeys.tracker(trackerId!),
        tracker.getEntity(),
      );
    };

    const handleStageChange = (stage: string, previousStage: string) => {
      options.onStageChange?.(stage, previousStage);
    };

    const handleComplete = () => {
      options.onComplete?.();
      queryClient.invalidateQueries({
        queryKey: progressKeys.tracker(trackerId!),
      });
    };

    const handleError = (error: Error) => {
      options.onError?.(error);
    };

    // Register event listeners
    tracker.on("progress", handleProgress);
    tracker.on("stageChange", handleStageChange);
    tracker.on("complete", handleComplete);
    tracker.on("error", handleError);

    // Cleanup
    return () => {
      tracker.on("progress", undefined);
      tracker.on("stageChange", undefined);
      tracker.on("complete", undefined);
      tracker.on("error", undefined);
    };
  }, [tracker, trackerId, options, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tracker) {
        tracker.destroy();
      }
    };
  }, [tracker]);

  return {
    tracker,
    entity: trackerData,
    isLoading,
    error,
    refetch,
    isInitialized,
  };
}

/**
 * Hook for progress tracking by file ID
 */
export function useFileProgress(
  fileId: number,
  options: Omit<UseProgressOptions, "fileId"> = {},
) {
  const [tracker, setTracker] = useState<ProgressTracker | null>(null);

  // Query to find tracker by file ID
  const {
    data: trackerId,
    isLoading: isLoadingId,
    error: idError,
  } = useQuery({
    queryKey: progressKeys.forFile(fileId),
    queryFn: async () => {
      try {
        const trackerInstance =
          await progressTrackerManager.getTrackerByFileId(fileId);
        return trackerInstance?.getEntity().id || null;
      } catch (error) {
        throw handleError(error, "useFileProgress.getTrackerId");
      }
    },
    enabled: options.enabled !== false,
    staleTime: 5000,
  });

  // Load full tracker once we have the ID
  const trackerQuery = useProgressTracker(trackerId, {
    ...options,
    enabled: !!trackerId && options.enabled !== false,
  });

  return {
    ...trackerQuery,
    trackerId,
    isLoading: isLoadingId || trackerQuery.isLoading,
    error: idError || trackerQuery.error,
  };
}

/**
 * Hook for progress tracking by job ID
 */
export function useJobProgress(
  jobId: string,
  options: Omit<UseProgressOptions, "jobId"> = {},
) {
  const [tracker, setTracker] = useState<ProgressTracker | null>(null);

  // Query to find tracker by job ID
  const {
    data: trackerId,
    isLoading: isLoadingId,
    error: idError,
  } = useQuery({
    queryKey: progressKeys.forJob(jobId),
    queryFn: async () => {
      try {
        const trackerInstance =
          await progressTrackerManager.getTrackerByJobId(jobId);
        return trackerInstance?.getEntity().id || null;
      } catch (error) {
        throw handleError(error, "useJobProgress.getTrackerId");
      }
    },
    enabled: options.enabled !== false,
    staleTime: 5000,
  });

  // Load full tracker once we have the ID
  const trackerQuery = useProgressTracker(trackerId, {
    ...options,
    enabled: !!trackerId && options.enabled !== false,
  });

  return {
    ...trackerQuery,
    trackerId,
    isLoading: isLoadingId || trackerQuery.isLoading,
    error: idError || trackerQuery.error,
  };
}

/**
 * Hook for progress tracker statistics
 */
export function useProgressStats() {
  return useQuery({
    queryKey: progressKeys.stats(),
    queryFn: async () => {
      try {
        return await progressTrackerManager.getTrackerStats();
      } catch (error) {
        throw handleError(error, "useProgressStats");
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Progress update mutation hook
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trackerId,
      stage,
      progress,
      message,
      metadata,
    }: {
      trackerId: string;
      stage: "upload" | "transcription" | "post-processing";
      progress: number;
      message?: string;
      metadata?: Record<string, any>;
    }) => {
      try {
        const tracker = await progressTrackerManager.getTracker(trackerId);
        if (!tracker) {
          throw new Error(`Progress tracker not found: ${trackerId}`);
        }

        await tracker.updateProgress({
          stage,
          progress,
          message,
          metadata,
        });

        return tracker.getCurrentProgress();
      } catch (error) {
        throw handleError(error, "useUpdateProgress");
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: progressKeys.tracker(variables.trackerId),
      });
      queryClient.invalidateQueries({
        queryKey: progressKeys.forJob(variables.jobId),
      });
    },
  });
}

/**
 * Hook for auto-creating progress trackers for transcription
 */
export function useAutoProgressTracker(fileId: number, jobId?: string) {
  const createTracker = useCreateProgressTracker();
  const queryClient = useQueryClient();

  return useCallback(
    async (initialStage?: "upload" | "transcription") => {
      try {
        // Get device info for mobile optimizations
        const deviceInfo = getDeviceInfo();

        const tracker = await createTracker.mutateAsync({
          jobId: jobId || `job_${fileId}_${Date.now()}`,
          fileId,
          connectionType: deviceInfo.type === "mobile" ? "polling" : "sse",
          deviceInfo: {
            type: deviceInfo.type,
            networkType: deviceInfo.networkType,
            batteryLevel: deviceInfo.batteryLevel,
            isLowPowerMode: deviceInfo.isLowPowerMode,
          },
          initialStage: initialStage || "upload",
          message:
            initialStage === "upload"
              ? "Starting upload..."
              : "Starting transcription...",
        });

        // Invalidate file progress query
        queryClient.invalidateQueries({
          queryKey: progressKeys.forFile(fileId),
        });

        return tracker;
      } catch (error) {
        throw handleError(error, "useAutoProgressTracker");
      }
    },
    [fileId, jobId, createTracker, queryClient],
  );
}

/**
 * Utility function to get device info
 */
function getDeviceInfo(): {
  type: "mobile" | "tablet" | "desktop";
  networkType: "wifi" | "cellular" | "unknown";
  batteryLevel?: number;
  isLowPowerMode: boolean;
} {
  const userAgent = navigator.userAgent;
  const screenWidth = window.screen.width;

  // Detect device type
  let type: "mobile" | "tablet" | "desktop" = "desktop";
  if (/Mobi|Android/i.test(userAgent)) {
    type = screenWidth < 768 ? "mobile" : "tablet";
  } else if (/Tablet|iPad/i.test(userAgent)) {
    type = "tablet";
  }

  // Detect network type (simplified)
  let networkType: "wifi" | "cellular" | "unknown" = "unknown";
  if ("connection" in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      networkType = connection.type === "cellular" ? "cellular" : "wifi";
    }
  }

  return {
    type,
    networkType,
    isLowPowerMode: false, // TODO: Implement battery API detection
  };
}

/**
 * Progress calculation utilities
 */
export class ProgressCalculator {
  /**
   * Calculate weighted overall progress from stages
   */
  static calculateOverallProgress(stages: {
    upload: number;
    transcription: number;
    postProcessing: number;
  }): number {
    const weights = {
      upload: 0.1, // 10%
      transcription: 0.75, // 75%
      postProcessing: 0.15, // 15%
    };

    const totalProgress =
      stages.upload * weights.upload +
      stages.transcription * weights.transcription +
      stages.postProcessing * weights.postProcessing;

    return Math.round(Math.min(100, Math.max(0, totalProgress)));
  }

  /**
   * Calculate ETA based on progress and time elapsed
   */
  static calculateETA(
    progress: number,
    startTime: Date,
    currentTime: Date = new Date(),
  ): number | undefined {
    if (progress <= 0 || progress >= 100) {
      return undefined;
    }

    const elapsed = currentTime.getTime() - startTime.getTime();
    if (elapsed <= 0) {
      return undefined;
    }

    const totalTime = (elapsed / progress) * 100;
    const remaining = totalTime * (1 - progress / 100);

    return Math.round(remaining / 1000); // Convert to seconds
  }

  /**
   * Format progress display
   */
  static formatProgress(progress: number): string {
    return `${Math.round(progress)}%`;
  }

  /**
   * Format ETA display
   */
  static formatETA(eta?: number): string {
    if (!eta || eta < 0) return "";

    if (eta < 60) {
      return `${Math.round(eta)}s`;
    } else if (eta < 3600) {
      const minutes = Math.floor(eta / 60);
      const seconds = Math.round(eta % 60);
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(eta / 3600);
      const minutes = Math.floor((eta % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Format speed display
   */
  static formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  }

  /**
   * Determine stage from progress
   */
  static determineStage(stages: {
    upload: number;
    transcription: number;
    postProcessing: number;
  }): "upload" | "transcription" | "post-processing" | "completed" {
    if (stages.upload < 100) return "upload";
    if (stages.transcription < 100) return "transcription";
    if (stages.postProcessing < 100) return "post-processing";
    return "completed";
  }
}

/**
 * Progress validation utilities
 */
export class ProgressValidator {
  /**
   * Validate progress update data
   */
  static validateProgressUpdate(data: {
    stage: string;
    progress: number;
    metadata?: Record<string, any>;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate stage
    const validStages = ["upload", "transcription", "post-processing"];
    if (!validStages.includes(data.stage)) {
      errors.push(`Invalid stage: ${data.stage}`);
    }

    // Validate progress
    if (
      typeof data.progress !== "number" ||
      data.progress < 0 ||
      data.progress > 100
    ) {
      errors.push("Progress must be a number between 0 and 100");
    }

    // Validate metadata based on stage
    if (data.metadata) {
      switch (data.stage) {
        case "upload":
          if (
            data.metadata.bytesTransferred !== undefined &&
            (typeof data.metadata.bytesTransferred !== "number" ||
              data.metadata.bytesTransferred < 0)
          ) {
            errors.push("bytesTransferred must be a non-negative number");
          }
          if (
            data.metadata.totalBytes !== undefined &&
            (typeof data.metadata.totalBytes !== "number" ||
              data.metadata.totalBytes <= 0)
          ) {
            errors.push("totalBytes must be a positive number");
          }
          break;

        case "transcription":
          if (
            data.metadata.currentChunk !== undefined &&
            (typeof data.metadata.currentChunk !== "number" ||
              data.metadata.currentChunk < 0)
          ) {
            errors.push("currentChunk must be a non-negative number");
          }
          if (
            data.metadata.totalChunks !== undefined &&
            (typeof data.metadata.totalChunks !== "number" ||
              data.metadata.totalChunks <= 0)
          ) {
            errors.push("totalChunks must be a positive number");
          }
          break;

        case "post-processing":
          if (
            data.metadata.segmentsProcessed !== undefined &&
            (typeof data.metadata.segmentsProcessed !== "number" ||
              data.metadata.segmentsProcessed < 0)
          ) {
            errors.push("segmentsProcessed must be a non-negative number");
          }
          if (
            data.metadata.totalSegments !== undefined &&
            (typeof data.metadata.totalSegments !== "number" ||
              data.metadata.totalSegments <= 0)
          ) {
            errors.push("totalSegments must be a positive number");
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate device info
   */
  static validateDeviceInfo(deviceInfo: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    const validTypes = ["mobile", "tablet", "desktop"];
    if (!validTypes.includes(deviceInfo?.type)) {
      errors.push("Invalid device type");
    }

    const validNetworkTypes = ["wifi", "cellular", "unknown"];
    if (!validNetworkTypes.includes(deviceInfo?.networkType)) {
      errors.push("Invalid network type");
    }

    if (
      deviceInfo?.batteryLevel !== undefined &&
      (typeof deviceInfo.batteryLevel !== "number" ||
        deviceInfo.batteryLevel < 0 ||
        deviceInfo.batteryLevel > 1)
    ) {
      errors.push("Battery level must be a number between 0 and 1");
    }

    if (typeof deviceInfo?.isLowPowerMode !== "boolean") {
      errors.push("isLowPowerMode must be a boolean");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
