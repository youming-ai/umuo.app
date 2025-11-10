/**
 * React Hook for Robust Progress Tracker
 *
 * Integrates the RobustProgressTracker with TanStack Query for seamless
 * progress tracking with automatic fallback and error handling.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createRobustProgressTracker, type RobustProgressTracker, type FallbackTransition, type HealthMetrics, type ErrorClassification } from "@/lib/progress/robust-tracker";
import type { ProgressUpdate, DeviceInfo } from "@/types/mobile";
import { handleError } from "@/lib/utils/error-handler";

// Hook options interface
export interface UseRobustProgressTrackerOptions {
  // Device information for optimizations
  deviceInfo?: DeviceInfo;

  // Fallback configuration
  fallbackConfig?: {
    maxTierTransitions?: number;
    tierTransitionCooldown?: number;
    healthCheckTimeout?: number;
    enableMobileOptimizations?: boolean;
  };

  // Event callbacks
  onTierChange?: (transition: FallbackTransition) => void;
  onHealthChange?: (metrics: HealthMetrics) => void;
  onError?: (error: ErrorClassification) => void;
  onComplete?: () => void;
  onDisconnect?: () => void;

  // Query options
  queryOptions?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchInterval?: number;
  };
}

// Hook return value interface
export interface UseRobustProgressTrackerReturn {
  // Current progress state
  progress: ProgressUpdate | undefined;
  isLoading: boolean;
  error: Error | null;

  // Connection state
  currentTier: string;
  healthMetrics: HealthMetrics;
  fallbackHistory: FallbackTransition[];
  isConnected: boolean;

  // Control functions
  start: () => Promise<void>;
  stop: () => Promise<void>;
  forceFallback: () => Promise<void>;
  refetch: () => void;

  // Additional information
  deviceInfo?: DeviceInfo;
  debugInfo: {
    hookId: string;
    trackerId: string;
    lastUpdate: number;
    updateCount: number;
  };
}

// Query keys for TanStack Query
const robustProgressKeys = {
  all: ["robustProgress"] as const,
  forJob: (jobId: string) => [...robustProgressKeys.all, "job", jobId] as const,
  health: (jobId: string) => [...robustProgressKeys.forJob(jobId), "health"] as const,
  fallbackHistory: (jobId: string) => [...robustProgressKeys.forJob(jobId), "fallbackHistory"] as const,
};

/**
 * React hook for robust progress tracking with automatic fallback
 *
 * @param jobId - The job ID to track
 * @param fileId - The file ID associated with the job
 * @param options - Configuration options
 * @returns Hook return value with progress state and control functions
 */
export function useRobustProgressTracker(
  jobId: string,
  fileId: number,
  options: UseRobustProgressTrackerOptions = {}
): UseRobustProgressTrackerReturn {
  const {
    deviceInfo,
    fallbackConfig,
    onTierChange,
    onHealthChange,
    onError,
    onComplete,
    onDisconnect,
    queryOptions,
  } = options;

  const queryClient = useQueryClient();
  const trackerRef = useRef<RobustProgressTracker | null>(null);
  const [hookId] = useState(() => `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [updateCount, setUpdateCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  // Get device info from browser if not provided
  const getDeviceInfo = useCallback(async (): Promise<DeviceInfo | undefined> => {
    if (deviceInfo) {
      return deviceInfo;
    }

    try {
      // Basic device detection
      const userAgent = navigator.userAgent.toLowerCase();
      let deviceType: "mobile" | "desktop" | "tablet";

      if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
        deviceType = "mobile";
      } else if (/tablet|ipad|android(?!.*mobile)/i.test(userAgent)) {
        deviceType = "tablet";
      } else {
        deviceType = "desktop";
      }

      // Network information
      let networkType: "wifi" | "cellular" | "unknown" = "unknown";
      let isLowPowerMode = false;
      let batteryLevel: number | undefined;

      try {
        // @ts-ignore - Experimental API
        if ("connection" in navigator) {
          // @ts-ignore
          const connection = navigator.connection;
          if (connection.effectiveType) {
            // @ts-ignore
            networkType = connection.effectiveType.includes("cellular") ? "cellular" : "wifi";
          }
        }

        // Battery API (if available)
        // @ts-ignore
        if ("getBattery" in navigator) {
          // @ts-ignore
          const battery = await navigator.getBattery();
          batteryLevel = battery.level;
          isLowPowerMode = !battery.charging && batteryLevel < 0.2;
        }
      } catch (error) {
        console.warn("Could not get device network/battery info:", error);
      }

      return {
        type: deviceType,
        networkType,
        isLowPowerMode,
        batteryLevel,
      };
    } catch (error) {
      console.warn("Could not detect device info:", error);
      return undefined;
    }
  }, [deviceInfo]);

  // Create robust progress tracker
  const createTracker = useCallback(async () => {
    if (trackerRef.current) {
      await trackerRef.current.stop();
      trackerRef.current = null;
    }

    const actualDeviceInfo = await getDeviceInfo();

    const config = fallbackConfig?.enableMobileOptimizations !== false
      ? {
          maxTierTransitions: fallbackConfig?.maxTierTransitions,
          tierTransitionCooldown: fallbackConfig?.tierTransitionCooldown,
          healthCheckTimeout: fallbackConfig?.healthCheckTimeout,
        }
      : {};

    const tracker = createRobustProgressTracker(jobId, fileId, actualDeviceInfo, config);

    // Setup event handlers
    tracker.on("progress", (progress) => {
      lastUpdateRef.current = Date.now();
      setUpdateCount(prev => prev + 1);

      // Update TanStack Query cache
      queryClient.setQueryData(
        robustProgressKeys.forJob(jobId),
        progress
      );

      // Check if job is complete
      if (progress.status === "completed" || progress.status === "failed") {
        onComplete?.();
      }
    });

    tracker.on("tierChange", (transition) => {
      // Update fallback history cache
      queryClient.setQueryData(
        robustProgressKeys.fallbackHistory(jobId),
        tracker.getFallbackHistory()
      );

      onTierChange?.(transition);
    });

    tracker.on("healthChange", (metrics) => {
      setIsConnected(metrics.status !== "disconnected");

      // Update health metrics cache
      queryClient.setQueryData(
        robustProgressKeys.health(jobId),
        metrics
      );

      onHealthChange?.(metrics);
    });

    tracker.on("error", (error) => {
      onError?.(error);
    });

    tracker.on("complete", () => {
      onComplete?.();
    });

    tracker.on("disconnect", () => {
      setIsConnected(false);
      onDisconnect?.();
    });

    trackerRef.current = tracker;
    return tracker;
  }, [jobId, fileId, getDeviceInfo, fallbackConfig, queryClient, onTierChange, onHealthChange, onError, onComplete, onDisconnect]);

  // Main progress query
  const progressQuery = useQuery({
    queryKey: robustProgressKeys.forJob(jobId),
    queryFn: () => {
      if (trackerRef.current) {
        return trackerRef.current.getCurrentProgress?.();
      }
      return undefined;
    },
    enabled: queryOptions?.enabled !== false && !!jobId,
    staleTime: queryOptions?.staleTime || 0, // Always get fresh data
    gcTime: queryOptions?.gcTime || 1000 * 60 * 5, // 5 minutes
    refetchInterval: queryOptions?.refetchInterval, // Don't auto-refetch, tracker handles updates
  });

  // Health metrics query
  const healthQuery = useQuery({
    queryKey: robustProgressKeys.health(jobId),
    queryFn: () => {
      if (trackerRef.current) {
        return trackerRef.current.getHealthMetrics();
      }
      return undefined;
    },
    enabled: queryOptions?.enabled !== false && !!jobId,
    staleTime: 0,
    gcTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fallback history query
  const fallbackHistoryQuery = useQuery({
    queryKey: robustProgressKeys.fallbackHistory(jobId),
    queryFn: () => {
      if (trackerRef.current) {
        return trackerRef.current.getFallbackHistory();
      }
      return [];
    },
    enabled: queryOptions?.enabled !== false && !!jobId,
    staleTime: 0,
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Start tracking
  const start = useCallback(async () => {
    try {
      if (!trackerRef.current) {
        const tracker = await createTracker();
        await tracker.start();
        setIsConnected(true);
      }
    } catch (error) {
      console.error("Failed to start robust progress tracker:", error);
      setIsConnected(false);
      throw error;
    }
  }, [createTracker]);

  // Stop tracking
  const stop = useCallback(async () => {
    try {
      if (trackerRef.current) {
        await trackerRef.current.stop();
        trackerRef.current = null;
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Failed to stop robust progress tracker:", error);
      throw error;
    }
  }, []);

  // Force fallback
  const forceFallback = useCallback(async () => {
    if (trackerRef.current) {
      await trackerRef.current.forceFallback();
    }
  }, []);

  // Manual refetch
  const refetch = useCallback(() => {
    progressQuery.refetch();
    healthQuery.refetch();
    fallbackHistoryQuery.refetch();
  }, [progressQuery, healthQuery, fallbackHistoryQuery]);

  // Start tracking when component mounts or dependencies change
  useEffect(() => {
    if (queryOptions?.enabled !== false && jobId && fileId) {
      start();
    }

    // Cleanup on unmount
    return () => {
      stop();
    };
  }, [jobId, fileId, start, stop, queryOptions?.enabled]);

  // Handle jobId changes
  useEffect(() => {
    if (jobId && fileId) {
      // Stop current tracker and start new one
      stop().then(() => {
        if (queryOptions?.enabled !== false) {
          start();
        }
      });
    }
  }, [jobId, fileId, start, stop, queryOptions?.enabled]);

  return {
    // Current progress state
    progress: progressQuery.data,
    isLoading: progressQuery.isLoading || !isConnected,
    error: progressQuery.error,

    // Connection state
    currentTier: trackerRef.current?.getCurrentTier() || "sse",
    healthMetrics: healthQuery.data || {
      status: "disconnected",
      score: 0,
      consecutiveFailures: 0,
      lastSuccessfulConnection: 0,
      averageResponseTime: 0,
      uptime: 0,
      errorRate: 100,
      lastHealthCheck: 0,
      tierPerformance: {
        sse: { successRate: 0, averageLatency: 0, lastUsed: 0 },
        polling: { successRate: 0, averageLatency: 0, lastUsed: 0 },
        periodic: { successRate: 0, averageLatency: 0, lastUsed: 0 },
      },
    },
    fallbackHistory: fallbackHistoryQuery.data || [],
    isConnected,

    // Control functions
    start,
    stop,
    forceFallback,
    refetch,

    // Additional information
    deviceInfo,
    debugInfo: {
      hookId,
      trackerId: trackerRef.current?.constructor.name || "none",
      lastUpdate: lastUpdateRef.current,
      updateCount,
    },
  };
}

/**
 * Higher-order hook that wraps useTranscription with robust progress tracking
 */
export function useTranscriptionWithRobustProgress(
  transcriptionHook: any,
  jobId: string,
  fileId: number,
  options: UseRobustProgressTrackerOptions = {}
) {
  const robustProgress = useRobustProgressTracker(jobId, fileId, options);
  const transcription = transcriptionHook();

  // Combine states
  const isLoading = transcription.isLoading || robustProgress.isLoading;
  const error = transcription.error || robustProgress.error;

  return {
    ...transcription,
    isLoading,
    error,
    progress: robustProgress.progress,
    connectionInfo: {
      currentTier: robustProgress.currentTier,
      healthMetrics: robustProgress.healthMetrics,
      fallbackHistory: robustProgress.fallbackHistory,
      isConnected: robustProgress.isConnected,
    },
    control: {
      startTranscription: transcription.mutateAsync,
      stopProgress: robustProgress.stop,
      forceFallback: robustProgress.forceFallback,
      refetch: robustProgress.refetch,
    },
  };
}

/**
 * Utility hook for device information detection
 */
export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | undefined>();
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const detectDeviceInfo = async () => {
      setIsDetecting(true);
      try {
        const userAgent = navigator.userAgent.toLowerCase();
        let deviceType: "mobile" | "desktop" | "tablet";

        if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
          deviceType = "mobile";
        } else if (/tablet|ipad|android(?!.*mobile)/i.test(userAgent)) {
          deviceType = "tablet";
        } else {
          deviceType = "desktop";
        }

        // Network information
        let networkType: "wifi" | "cellular" | "unknown" = "unknown";
        let isLowPowerMode = false;
        let batteryLevel: number | undefined;

        try {
          // @ts-ignore - Experimental API
          if ("connection" in navigator) {
            // @ts-ignore
            const connection = navigator.connection;
            if (connection.effectiveType) {
              // @ts-ignore
              networkType = connection.effectiveType.includes("cellular") ? "cellular" : "wifi";
            }
          }

          // Battery API (if available)
          // @ts-ignore
          if ("getBattery" in navigator) {
            // @ts-ignore
            const battery = await navigator.getBattery();
            batteryLevel = battery.level;
            isLowPowerMode = !battery.charging && batteryLevel < 0.2;
          }
        } catch (error) {
          console.warn("Could not get device network/battery info:", error);
        }

        setDeviceInfo({
          type: deviceType,
          networkType,
          isLowPowerMode,
          batteryLevel,
        });
      } catch (error) {
        console.error("Failed to detect device info:", error);
      } finally {
        setIsDetecting(false);
      }
    };

    detectDeviceInfo();

    // Listen for changes in network/battery status
    const handleConnectionChange = () => {
      detectDeviceInfo();
    };

    try {
      // @ts-ignore
      if ("connection" in navigator) {
        // @ts-ignore
        navigator.connection.addEventListener("change", handleConnectionChange);
      }

      return () => {
        try {
          // @ts-ignore
          if ("connection" in navigator) {
            // @ts-ignore
            navigator.connection.removeEventListener("change", handleConnectionChange);
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      };
    } catch (error) {
      // Ignore event listener setup errors
    }
  }, []);

  return {
    deviceInfo,
    isDetecting,
  };
}
