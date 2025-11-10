/**
 * Progress Sync Manager Integration
 *
 * This file provides integration utilities for connecting the ProgressSyncManager
 * with existing progress tracking systems in the application.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProgressUpdate } from "@/types/progress";
import {
  ProgressSyncManager,
  createProgressSyncManager,
  useProgressSyncManager,
  type DataSource,
  type SyncManagerConfig,
  SyncManagerConfigs,
} from "./sync-manager";
import { progressKeys } from "./progress-utils";
import type { DeviceInfo } from "@/types/mobile";
import {
  RobustProgressTracker,
  type FallbackTransition,
} from "./robust-tracker";

/**
 * Enhanced progress sync integration with TanStack Query
 */
export function useIntegratedProgressSync(
  fileId: number,
  jobId?: string,
  deviceInfo?: DeviceInfo,
  config?: Partial<SyncManagerConfig>,
) {
  const queryClient = useQueryClient();
  const actualJobId = jobId || `job_${fileId}_${Date.now()}`;

  // Determine configuration based on device info
  const syncConfig =
    deviceInfo?.type === "mobile"
      ? { ...SyncManagerConfigs.mobile, ...config }
      : deviceInfo?.type === "desktop"
        ? { ...SyncManagerConfigs.desktop, ...config }
        : { ...SyncManagerConfigs.desktop, ...config };

  const {
    syncManager,
    progress,
    syncStatus,
    conflicts,
    addProgressData,
    forceConflictResolution,
  } = useProgressSyncManager(actualJobId, fileId, syncConfig);

  // Integration with TanStack Query cache
  useEffect(() => {
    if (progress && queryClient) {
      // Update multiple query keys for consistency
      queryClient.setQueryData(progressKeys.forFile(fileId), progress);
      queryClient.setQueryData(progressKeys.forJob(actualJobId), progress);

      // Invalidate related queries to trigger refetches
      queryClient.invalidateQueries({ queryKey: progressKeys.all });
    }
  }, [progress, fileId, actualJobId, queryClient]);

  // Enhanced addProgressData with automatic source detection
  const addIntegratedProgress = useCallback(
    (data: ProgressUpdate, source?: DataSource, metadata?: any) => {
      // Auto-detect source if not provided
      let detectedSource = source;
      if (!detectedSource) {
        if (metadata?.connectionType === "sse") detectedSource = "sse";
        else if (metadata?.connectionType === "polling")
          detectedSource = "polling";
        else if (metadata?.isServerSide) detectedSource = "server";
        else if (metadata?.isFromTracker) detectedSource = "tracker";
        else detectedSource = "polling"; // Default fallback
      }

      addProgressData(data, detectedSource, metadata);
    },
    [addProgressData],
  );

  return {
    syncManager,
    progress,
    syncStatus,
    conflicts,
    addProgressData: addIntegratedProgress,
    forceConflictResolution,
    // Additional integrated utilities
    invalidateCache: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: progressKeys.forFile(fileId) });
      queryClient.invalidateQueries({
        queryKey: progressKeys.forJob(actualJobId),
      });
    }, [queryClient, fileId, actualJobId]),
  };
}

/**
 * Integration wrapper for RobustProgressTracker with SyncManager
 */
export class RobustSyncTracker {
  private robustTracker: RobustProgressTracker;
  private syncManager: ProgressSyncManager;
  private isDestroyed = false;

  constructor(
    jobId: string,
    fileId: number,
    deviceInfo?: DeviceInfo,
    syncConfig?: Partial<SyncManagerConfig>,
    robustConfig?: any,
  ) {
    // Initialize robust tracker
    this.robustTracker = new RobustProgressTracker(
      jobId,
      fileId,
      deviceInfo,
      robustConfig,
    );

    // Initialize sync manager
    this.syncManager = createProgressSyncManager(
      jobId,
      fileId,
      undefined, // TanStack Query client not needed in class context
      syncConfig,
    );

    this.setupIntegration();
  }

  private setupIntegration(): void {
    // Forward progress updates from robust tracker to sync manager
    this.robustTracker.on("progress", (progress: ProgressUpdate) => {
      const currentTier = this.robustTracker.getCurrentTier();
      const healthMetrics = this.robustTracker.getHealthMetrics();

      this.syncManager.addProgressData(
        progress,
        currentTier === "sse" ? "sse" : "polling",
        {
          connectionType: currentTier,
          healthScore: healthMetrics.score,
          latency: healthMetrics.averageResponseTime,
          fallbackHistory: this.robustTracker.getFallbackHistory(),
        },
      );
    });

    // Handle tier changes
    this.robustTracker.on("tierChange", (transition: FallbackTransition) => {
      // Sync manager will handle this as part of progress data metadata
      console.log("RobustSyncTracker: Tier transition", transition);
    });

    // Handle errors from robust tracker
    this.robustTracker.on("error", (error) => {
      console.error("RobustSyncTracker: Robust tracker error", error);
    });

    // Forward sync manager events if needed
    this.syncManager.on("sync", (progress: ProgressUpdate) => {
      // This could be used to update UI or other systems
    });

    this.syncManager.on("conflict", (conflicts) => {
      console.warn("RobustSyncTracker: Progress conflicts detected", conflicts);
      // Auto-resolve conflicts
      this.syncManager.forceConflictResolution();
    });
  }

  /**
   * Start both tracking systems
   */
  async start(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("Cannot start destroyed tracker");
    }

    await this.robustTracker.start();
  }

  /**
   * Stop both tracking systems
   */
  async stop(): Promise<void> {
    if (this.isDestroyed) return;

    await this.robustTracker.stop();
    this.syncManager.destroy();
    this.isDestroyed = true;
  }

  /**
   * Get current synchronized progress
   */
  getProgress(): ProgressUpdate | null {
    return this.syncManager.getResolvedProgress();
  }

  /**
   * Get sync status
   */
  getSyncStatus(): "syncing" | "synced" | "conflict" | "offline" | "error" {
    return this.syncManager.getSyncStatus();
  }

  /**
   * Get robust tracker health metrics
   */
  getHealthMetrics() {
    return this.robustTracker.getHealthMetrics();
  }

  /**
   * Get fallback history
   */
  getFallbackHistory(): FallbackTransition[] {
    return this.robustTracker.getFallbackHistory();
  }

  /**
   * Force fallback to next tier
   */
  async forceFallback(reason?: string): Promise<void> {
    await this.robustTracker.forceFallback(reason);
  }

  /**
   * Force conflict resolution
   */
  forceConflictResolution(): void {
    this.syncManager.forceConflictResolution();
  }
}

/**
 * React hook for the integrated robust sync tracker
 */
export function useRobustSyncTracker(
  fileId: number,
  jobId?: string,
  deviceInfo?: DeviceInfo,
  syncConfig?: Partial<SyncManagerConfig>,
  robustConfig?: any,
) {
  const actualJobId = jobId || `job_${fileId}_${Date.now()}`;
  const trackerRef = useRef<RobustSyncTracker | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "syncing" | "synced" | "conflict" | "offline" | "error"
  >("syncing");
  const [healthMetrics, setHealthMetrics] = useState<any>(null);

  useEffect(() => {
    const tracker = new RobustSyncTracker(
      actualJobId,
      fileId,
      deviceInfo,
      syncConfig,
      robustConfig,
    );

    trackerRef.current = tracker;

    // Setup progress monitoring
    const progressInterval = setInterval(() => {
      const currentProgress = tracker.getProgress();
      const currentStatus = tracker.getSyncStatus();
      const currentHealth = tracker.getHealthMetrics();

      setProgress(currentProgress);
      setSyncStatus(currentStatus);
      setHealthMetrics(currentHealth);
    }, 1000);

    // Start tracking
    tracker.start().catch((error) => {
      console.error("Failed to start robust sync tracker:", error);
    });

    return () => {
      clearInterval(progressInterval);
      tracker.stop();
    };
  }, [actualJobId, fileId, deviceInfo, syncConfig, robustConfig]);

  return {
    progress,
    syncStatus,
    healthMetrics,
    forceFallback: useCallback((reason?: string) => {
      return trackerRef.current?.forceFallback(reason);
    }, []),
    forceConflictResolution: useCallback(() => {
      trackerRef.current?.forceConflictResolution();
    }, []),
    getFallbackHistory: useCallback(() => {
      return trackerRef.current?.getFallbackHistory() || [];
    }, []),
  };
}

/**
 * Utility to merge multiple progress data sources
 */
export class ProgressDataMerger {
  /**
   * Merge progress updates from multiple sources
   */
  static mergeProgressUpdates(
    updates: Array<{
      progress: ProgressUpdate;
      source: DataSource;
      weight?: number;
    }>,
  ): ProgressUpdate {
    if (updates.length === 0) {
      throw new Error("No progress updates to merge");
    }

    if (updates.length === 1) {
      return updates[0].progress;
    }

    // Sort by source priority if no weights provided
    const weightedUpdates = updates.map((u) => ({
      ...u,
      weight: u.weight || 1,
    }));

    const totalWeight = weightedUpdates.reduce((sum, u) => sum + u.weight, 0);

    // Calculate weighted average for progress values
    const mergedProgress: ProgressUpdate = {
      jobId: weightedUpdates[0].progress.jobId,
      fileId: weightedUpdates[0].progress.fileId,
      status: this.mergeStatus(weightedUpdates.map((u) => u.progress)),
      overallProgress: Math.round(
        weightedUpdates.reduce(
          (sum, u) => sum + u.progress.overallProgress * u.weight,
          0,
        ) / totalWeight,
      ),
      currentStage: this.mergeCurrentStage(
        weightedUpdates.map((u) => u.progress),
      ),
      message: this.mergeMessages(weightedUpdates.map((u) => u.progress)),
      timestamp: Date.now(),
    };

    // Merge stage information if available
    const stagesWithInfo = weightedUpdates.filter((u) => u.progress.stages);
    if (stagesWithInfo.length > 0) {
      mergedProgress.stages = this.mergeStages(
        stagesWithInfo.map((u) => u.progress.stages!),
      );
    }

    // Merge performance metrics if available
    const metricsWithInfo = weightedUpdates.filter(
      (u) => u.progress.processingTime,
    );
    if (metricsWithInfo.length > 0) {
      const avgProcessingTime =
        metricsWithInfo.reduce(
          (sum, u) => sum + (u.progress.processingTime || 0),
          0,
        ) / metricsWithInfo.length;
      mergedProgress.processingTime = Math.round(avgProcessingTime);
    }

    return mergedProgress;
  }

  private static mergeStatus(statuses: string[]): ProgressUpdate["status"] {
    // Priority order: failed > processing > uploading > completed
    if (statuses.some((s) => s === "failed")) return "failed";
    if (statuses.some((s) => s === "processing")) return "processing";
    if (statuses.some((s) => s === "uploading")) return "uploading";
    if (statuses.some((s) => s === "completed")) return "completed";
    return "processing"; // Default fallback
  }

  private static mergeCurrentStage(progresses: ProgressUpdate[]): string {
    // Use the most advanced stage
    const stageOrder = ["upload", "transcription", "post-processing"];
    const currentStages = progresses.map((p) => p.currentStage);

    for (const stage of stageOrder.reverse()) {
      if (currentStages.includes(stage)) {
        return stage;
      }
    }

    return currentStages[0] || "unknown";
  }

  private static mergeMessages(progresses: ProgressUpdate[]): string {
    // Use the most recent non-empty message
    const nonEmptyMessages = progresses
      .filter((p) => p.message && p.message.trim() !== "")
      .sort((a, b) => b.timestamp - a.timestamp);

    return nonEmptyMessages[0]?.message || progresses[0]?.message || "";
  }

  private static mergeStages(
    stages: ProgressUpdate["stages"][],
  ): ProgressUpdate["stages"] {
    if (stages.length === 1) return stages[0];

    const mergedStages: ProgressUpdate["stages"] = {};

    // Merge each stage type
    const stageTypes = ["upload", "transcription", "post-processing"];
    stageTypes.forEach((stageType) => {
      const stageDataList = stages
        .map((s) => s[stageType as keyof typeof s])
        .filter(Boolean);

      if (stageDataList.length > 0) {
        const stageData = stageDataList[0]!;

        // Calculate weighted averages
        const avgProgress = Math.round(
          stageDataList.reduce((sum, data) => sum + data.progress, 0) /
            stageDataList.length,
        );

        mergedStages[stageType as keyof typeof mergedStages] = {
          ...stageData,
          progress: avgProgress,
          eta: this.calculateETA(stageDataList),
        };
      }
    });

    return mergedStages;
  }

  private static calculateETA(stageDataList: any[]): number | undefined {
    const validETAs = stageDataList
      .map((d) => d.eta)
      .filter((eta) => eta !== undefined && eta > 0);

    if (validETAs.length === 0) return undefined;

    return Math.round(
      validETAs.reduce((sum, eta) => sum + eta, 0) / validETAs.length,
    );
  }
}

/**
 * Factory function to create an integrated tracker
 */
export function createIntegratedTracker(
  fileId: number,
  jobId?: string,
  deviceInfo?: DeviceInfo,
  options?: {
    syncConfig?: Partial<SyncManagerConfig>;
    robustConfig?: any;
    useSyncManager?: boolean;
  },
): RobustProgressTracker | RobustSyncTracker {
  const actualJobId = jobId || `job_${fileId}_${Date.now()}`;

  if (options?.useSyncManager === false) {
    return new RobustProgressTracker(
      actualJobId,
      fileId,
      deviceInfo,
      options?.robustConfig,
    );
  }

  return new RobustSyncTracker(
    actualJobId,
    fileId,
    deviceInfo,
    options?.syncConfig,
    options?.robustConfig,
  ) as RobustSyncTracker;
}
