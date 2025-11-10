/**
 * Progress Sync Manager Examples
 *
 * This file demonstrates how to use the ProgressSyncManager and related
 * utilities in different scenarios within the application.
 */

import { useCallback, useEffect } from "react";
import {
  useIntegratedProgressSync,
  useRobustSyncTracker,
  createIntegratedTracker,
  ProgressDataMerger,
  type DataSource,
} from "./sync-manager-integration";
import type { ProgressUpdate, DeviceInfo } from "@/types/progress";

/**
 * Example 1: Basic usage in a component
 */
export function ExampleComponent({ fileId, jobId }: { fileId: number; jobId?: string }) {
  const {
    progress,
    syncStatus,
    conflicts,
    addProgressData,
    forceConflictResolution,
    invalidateCache
  } = useIntegratedProgressSync(fileId, jobId);

  // Handle progress updates from different sources
  const handleSSEUpdate = useCallback((progressData: ProgressUpdate) => {
    addProgressData(progressData, "sse", { connectionType: "sse" });
  }, [addProgressData]);

  const handlePollingUpdate = useCallback((progressData: ProgressUpdate) => {
    addProgressData(progressData, "polling", { connectionType: "polling" });
  }, [addProgressData]);

  return (
    <div>
      <h3>Progress Sync Example</h3>
      <p>Sync Status: {syncStatus}</p>
      <p>Overall Progress: {progress?.overallProgress}%</p>
      <p>Current Stage: {progress?.currentStage}</p>

      {conflicts.length > 0 && (
        <div>
          <p>Conflicts detected: {conflicts.length}</p>
          <button onClick={forceConflictResolution}>
            Resolve Conflicts
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: Integration with SSE and Polling
 */
export function SSEPollingIntegration({ fileId }: { fileId: number }) {
  const { progress, addProgressData } = useIntegratedProgressSync(fileId);

  useEffect(() => {
    const jobId = `job_${fileId}_${Date.now()}`;
    let eventSource: EventSource | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;

    // Setup SSE connection
    const setupSSE = () => {
      eventSource = new EventSource(`/api/progress/jobs/${jobId}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const progressData = JSON.parse(event.data) as ProgressUpdate;
          addProgressData(progressData, "sse", {
            connectionType: "sse",
            latency: Date.now() - progressData.timestamp,
          });
        } catch (error) {
          console.error("Failed to parse SSE message:", error);
        }
      };

      eventSource.onerror = () => {
        console.log("SSE connection failed, falling back to polling");
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        setupPolling();
      };
    };

    // Setup polling fallback
    const setupPolling = () => {
      pollingInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/progress/jobs/${jobId}`);
          if (response.ok) {
            const progressData = (await response.json()).data as ProgressUpdate;
            addProgressData(progressData, "polling", {
              connectionType: "polling",
              retryCount: 1,
            });
          }
        } catch (error) {
          console.error("Polling failed:", error);
        }
      }, 2000);
    };

    // Start with SSE
    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [fileId, addProgressData]);

  return (
    <div>
      <h4>SSE + Polling Integration</h4>
      <p>Progress: {progress?.overallProgress}%</p>
    </div>
  );
}

/**
 * Example 3: Mobile-optimized configuration
 */
export function MobileOptimizedProgress({ fileId, jobId }: { fileId: number; jobId: string }) {
  const mobileDeviceInfo: DeviceInfo = {
    type: "mobile",
    networkType: "cellular",
    batteryLevel: 0.3,
    isLowPowerMode: true,
  };

  const { progress, syncStatus } = useIntegratedProgressSync(
    fileId,
    jobId,
    mobileDeviceInfo,
    {
      conflictResolution: "latest", // Favor most recent data on mobile
      enableOfflineSupport: true,
      maxOfflineQueueSize: 50,
      syncInterval: 3000, // Less frequent updates on mobile
    }
  );

  return (
    <div>
      <h4>Mobile Optimized Progress</h4>
      <p>Status: {syncStatus}</p>
      <p>Progress: {progress?.overallProgress}%</p>
      <p>Battery Saver: {mobileDeviceInfo.isLowPowerMode ? "On" : "Off"}</p>
    </div>
  );
}

/**
 * Example 4: Robust tracker with sync integration
 */
export function RobustSyncExample({ fileId }: { fileId: number }) {
  const deviceInfo: DeviceInfo = {
    type: "desktop",
    networkType: "wifi",
    batteryLevel: 0.8,
    isLowPowerMode: false,
  };

  const {
    progress,
    syncStatus,
    healthMetrics,
    forceFallback,
    forceConflictResolution
  } = useRobustSyncTracker(fileId, undefined, deviceInfo);

  return (
    <div>
      <h4>Robust Sync Tracker</h4>
      <p>Progress: {progress?.overallProgress}%</p>
      <p>Sync Status: {syncStatus}</p>
      {healthMetrics && (
        <div>
          <p>Health Score: {healthMetrics.score}</p>
          <p>Connection Status: {healthMetrics.status}</p>
          <p>Avg Response Time: {healthMetrics.averageResponseTime}ms</p>
        </div>
      )}
      <button onClick={() => forceFallback("Manual fallback")}>
        Force Fallback
      </button>
      <button onClick={forceConflictResolution}>
        Resolve Conflicts
      </button>
    </div>
  );
}

/**
 * Example 5: Custom conflict resolution
 */
export function CustomConflictResolution({ fileId }: { fileId: number }) {
  const {
    progress,
    conflicts,
    addProgressData,
    forceConflictResolution
  } = useIntegratedProgressSync(fileId, undefined, undefined, {
    conflictResolution: "weighted", // Use weighted average for conflicts
    enableConflictLogging: true,
  });

  const handleCustomResolution = useCallback(() => {
    if (conflicts.length === 0) return;

    // Custom logic: prefer SSE data if available, otherwise use highest progress
    const sseConflict = conflicts.find(c => c.source === "sse");
    if (sseConflict) {
      // You could implement custom logic here
      console.log("Using SSE data for conflict resolution");
    }

    forceConflictResolution();
  }, [conflicts, forceConflictResolution]);

  return (
    <div>
      <h4>Custom Conflict Resolution</h4>
      <p>Progress: {progress?.overallProgress}%</p>
      {conflicts.length > 0 && (
        <div>
          <p>Conflicts from sources: {conflicts.map(c => c.source).join(", ")}</p>
          <button onClick={handleCustomResolution}>
            Custom Resolution
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Example 6: Progress data merger utility
 */
export function ProgressMergerExample() {
  const handleMergeExample = useCallback(() => {
    const updates = [
      {
        progress: {
          jobId: "job_123",
          fileId: 456,
          status: "processing" as const,
          overallProgress: 60,
          currentStage: "transcription",
          message: "Transcribing chunk 3/5",
          timestamp: Date.now() - 5000,
        } as ProgressUpdate,
        source: "sse" as DataSource,
        weight: 2, // Higher weight for SSE
      },
      {
        progress: {
          jobId: "job_123",
          fileId: 456,
          status: "processing" as const,
          overallProgress: 55,
          currentStage: "transcription",
          message: "Transcribing chunk 2/5",
          timestamp: Date.now() - 8000,
        } as ProgressUpdate,
        source: "polling" as DataSource,
        weight: 1,
      },
    ];

    try {
      const merged = ProgressDataMerger.mergeProgressUpdates(updates);
      console.log("Merged progress:", merged);
      // Result would have ~58% progress (weighted average)
    } catch (error) {
      console.error("Failed to merge progress:", error);
    }
  }, []);

  return (
    <button onClick={handleMergeExample}>
      Test Progress Merger
    </button>
  );
}

/**
 * Example 7: Server-side integration
 */
export function ServerSideIntegration(fileId: number, serverProgress: ProgressUpdate) {
  const { addProgressData } = useIntegratedProgressSync(fileId);

  useEffect(() => {
    // Add server-side progress data
    addProgressData(serverProgress, "server", {
      isServerSide: true,
      timestamp: Date.now(),
    });
  }, [serverProgress, addProgressData, fileId]);

  return null;
}

/**
 * Example 8: Complete integration with multiple data sources
 */
export function CompleteProgressIntegration({
  fileId,
  onProgressComplete
}: {
  fileId: number;
  onProgressComplete?: () => void;
}) {
  const {
    progress,
    syncStatus,
    conflicts,
    addProgressData,
    invalidateCache,
    forceConflictResolution
  } = useIntegratedProgressSync(fileId);

  // Monitor for completion
  useEffect(() => {
    if (progress?.status === "completed" || progress?.status === "failed") {
      invalidateCache(); // Clean up cache
      onProgressComplete?.();
    }
  }, [progress?.status, invalidateCache, onProgressComplete]);

  // Simulate multiple data sources
  const simulateMultipleSources = useCallback(() => {
    const jobId = `job_${fileId}_${Date.now()}`;

    // Simulate SSE update
    setTimeout(() => {
      addProgressData({
        jobId,
        fileId,
        status: "processing",
        overallProgress: 30,
        currentStage: "transcription",
        message: "Starting transcription via SSE",
        timestamp: Date.now(),
      }, "sse");
    }, 1000);

    // Simulate polling update (slightly different data)
    setTimeout(() => {
      addProgressData({
        jobId,
        fileId,
        status: "processing",
        overallProgress: 35, // Different progress to test conflict resolution
        currentStage: "transcription",
        message: "Transcribing via polling",
        timestamp: Date.now() - 500, // Slightly older
      }, "polling");
    }, 1500);

    // Simulate server update
    setTimeout(() => {
      addProgressData({
        jobId,
        fileId,
        status: "processing",
        overallProgress: 32,
        currentStage: "transcription",
        message: "Server-side progress",
        timestamp: Date.now() - 1000,
      }, "server", { isServerSide: true });
    }, 2000);
  }, [fileId, addProgressData]);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Complete Progress Integration</h3>

      <div className="space-y-2">
        <p><strong>Sync Status:</strong> {syncStatus}</p>
        <p><strong>Progress:</strong> {progress?.overallProgress}%</p>
        <p><strong>Stage:</strong> {progress?.currentStage}</p>
        <p><strong>Message:</strong> {progress?.message}</p>
      </div>

      {conflicts.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
          <p className="text-yellow-800">
            <strong>Conflicts Detected:</strong> {conflicts.length} sources disagree
          </p>
          <button
            onClick={forceConflictResolution}
            className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Auto-Resolve Conflicts
          </button>
        </div>
      )}

      <div className="mt-4 space-x-2">
        <button
          onClick={simulateMultipleSources}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Simulate Multiple Sources
        </button>
        <button
          onClick={invalidateCache}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Invalidate Cache
        </button>
      </div>
    </div>
  );
}

/**
 * Example configuration presets for different use cases
 */
export const SyncManagerPresets = {
  /**
   * High-frequency updates for real-time applications
   */
  realtime: {
    conflictResolution: "latest" as const,
    syncInterval: 100,
    throttleMs: 50,
    enableOfflineSupport: false,
  },

  /**
   * Battery-efficient configuration for mobile devices
   */
  batteryEfficient: {
    conflictResolution: "priority" as const,
    syncInterval: 5000,
    throttleMs: 1000,
    enableOfflineSupport: true,
    maxOfflineQueueSize: 30,
  },

  /**
   * Development configuration with verbose logging
   */
  development: {
    conflictResolution: "smart" as const,
    syncInterval: 500,
    throttleMs: 100,
    enableConflictLogging: true,
    enablePerformanceMonitoring: true,
    maxSyncHistory: 1000,
  },

  /**
   * Production configuration optimized for reliability
   */
  production: {
    conflictResolution: "smart" as const,
    syncInterval: 1000,
    throttleMs: 200,
    enableOfflineSupport: true,
    maxRetries: 5,
    enablePerformanceMonitoring: true,
    enableConflictLogging: false,
  },
} as const;
