/**
 * Progress Synchronization Manager
 *
 * This utility handles synchronization between different progress tracking systems
 * and ensures consistency across the application. It manages conflicts between
 * SSE, polling, and periodic progress data while providing a unified interface
 * for progress tracking.
 */

import { useCallback, useRef, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProgressUpdate } from "@/types/progress";
import type { ProgressTracker } from "@/lib/db/progress-tracker";
import { progressTrackerManager } from "@/lib/db/progress-tracker";
import { handleError } from "@/lib/utils/error-handler";
// Simple throttle implementation (no external dependencies)
function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): T {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  }) as T;
}

// Data source types
export type DataSource = "sse" | "polling" | "periodic" | "tracker" | "server";

// Conflict resolution strategies
export type ConflictResolutionStrategy =
  | "latest" // Use latest timestamp
  | "highest" // Use highest progress value
  | "lowest" // Use lowest progress value
  | "weighted" // Use weighted average
  | "priority" // Use priority order: sse > polling > periodic > server
  | "smart"; // AI-driven conflict resolution

// Synchronization status
export type SyncStatus =
  | "syncing"
  | "synced"
  | "conflict"
  | "offline"
  | "error";

// Sync event types
export interface SyncEvent {
  type:
    | "sync_start"
    | "sync_complete"
    | "conflict_detected"
    | "conflict_resolved"
    | "offline"
    | "online"
    | "error";
  timestamp: number;
  data?: any;
  source?: string;
}

// Data source priority
const DATA_SOURCE_PRIORITY: Record<DataSource, number> = {
  sse: 100,
  polling: 75,
  tracker: 60,
  server: 40,
  periodic: 20,
};

/**
 * Progress data container with source information
 */
export interface ProgressDataPoint {
  progress: ProgressUpdate;
  source: DataSource;
  timestamp: number;
  reliability: number; // 0-1 confidence score
  metadata?: {
    latency?: number;
    retryCount?: number;
    lastSuccessfulUpdate?: number;
  };
}

/**
 * Synchronization state
 */
export interface SyncState {
  status: SyncStatus;
  lastSync: number;
  lastSuccessfulSync: number;
  consecutiveErrors: number;
  activeDataSources: Set<DataSource>;
  conflictingSources: Set<DataSource>;
  syncHistory: SyncEvent[];
  offlineQueue: ProgressDataPoint[];
  networkStatus: "online" | "offline" | "unstable";
}

/**
 * Sync manager configuration
 */
export interface SyncManagerConfig {
  conflictResolution: ConflictResolutionStrategy;
  enableOfflineSupport: boolean;
  maxOfflineQueueSize: number;
  syncInterval: number;
  throttleMs: number;
  debounceMs: number;
  maxRetries: number;
  retryDelay: number;
  maxSyncHistory: number;
  enablePerformanceMonitoring: boolean;
  enableConflictLogging: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SyncManagerConfig = {
  conflictResolution: "smart",
  enableOfflineSupport: true,
  maxOfflineQueueSize: 100,
  syncInterval: 1000, // 1 second
  throttleMs: 200,
  debounceMs: 300,
  maxRetries: 3,
  retryDelay: 1000,
  maxSyncHistory: 100,
  enablePerformanceMonitoring: true,
  enableConflictLogging: true,
};

/**
 * Progress Synchronization Manager Class
 *
 * Manages synchronization between multiple progress tracking systems
 * and resolves conflicts to ensure consistency across the application.
 */
export class ProgressSyncManager {
  private jobId: string;
  private fileId: number;
  private config: SyncManagerConfig;
  private state: SyncState;
  private isDestroyed = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private networkStatusTimer: NodeJS.Timeout | null = null;

  // Data storage
  private dataPoints: Map<DataSource, ProgressDataPoint> = new Map();
  private lastResolvedProgress: ProgressUpdate | null = null;

  // Event listeners
  private listeners: {
    onSync?: (progress: ProgressUpdate) => void;
    onConflict?: (conflicts: ProgressDataPoint[]) => void;
    onStatusChange?: (status: SyncStatus) => void;
    onOfflineQueueChange?: (queue: ProgressDataPoint[]) => void;
    onNetworkStatusChange?: (status: "online" | "offline" | "unstable") => void;
    onError?: (error: Error) => void;
  } = {};

  // Performance monitoring
  private performanceMetrics = {
    syncOperations: 0,
    conflictsDetected: 0,
    conflictsResolved: 0,
    averageResolutionTime: 0,
    lastResolutionTime: 0,
  };

  // TanStack Query client for cache integration
  private queryClient: any;

  constructor(
    jobId: string,
    fileId: number,
    queryClient?: any,
    config: Partial<SyncManagerConfig> = {},
  ) {
    this.jobId = jobId;
    this.fileId = fileId;
    this.queryClient = queryClient;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize state
    this.state = {
      status: "syncing",
      lastSync: 0,
      lastSuccessfulSync: 0,
      consecutiveErrors: 0,
      activeDataSources: new Set(),
      conflictingSources: new Set(),
      syncHistory: [],
      offlineQueue: [],
      networkStatus: "online",
    };

    // Start network monitoring
    this.startNetworkMonitoring();

    // Start sync loop
    this.startSyncLoop();
  }

  /**
   * Add progress data from a specific source
   */
  addProgressData(
    data: ProgressUpdate,
    source: DataSource,
    metadata?: ProgressDataPoint["metadata"],
  ): void {
    if (this.isDestroyed) return;

    const dataPoint: ProgressDataPoint = {
      progress: data,
      source,
      timestamp: Date.now(),
      reliability: this.calculateReliability(data, source, metadata),
      metadata,
    };

    // Store data point
    this.dataPoints.set(source, dataPoint);
    this.state.activeDataSources.add(source);

    // Add to sync history
    this.addSyncEvent({
      type: "sync_start",
      timestamp: Date.now(),
      data: { source, progress: data.overallProgress },
      source,
    });

    // Trigger immediate sync processing
    this.processSync();

    // Update TanStack Query cache if available
    if (this.queryClient) {
      this.queryClient.setQueryData(
        ["progress", "sync", this.jobId],
        this.getResolvedProgress(),
      );
    }
  }

  /**
   * Get the current resolved progress
   */
  getResolvedProgress(): ProgressUpdate | null {
    if (this.dataPoints.size === 0) {
      return this.lastResolvedProgress;
    }

    const dataPoints = Array.from(this.dataPoints.values());

    // Check for conflicts
    const conflicts = this.detectConflicts(dataPoints);
    if (conflicts.length > 0) {
      this.state.conflictingSources = new Set(conflicts.map((c) => c.source));
      this.state.status = "conflict";

      // Log conflict if enabled
      if (this.config.enableConflictLogging) {
        console.warn(
          `Progress conflict detected for job ${this.jobId}:`,
          conflicts,
        );
      }

      // Notify listeners
      this.listeners.onConflict?.(conflicts);

      // Resolve conflicts
      const resolved = this.resolveConflicts(conflicts);
      if (resolved) {
        this.lastResolvedProgress = resolved.progress;
        return resolved.progress;
      }
    }

    // No conflicts, return the best data point
    const bestDataPoint = this.selectBestDataPoint(dataPoints);
    this.lastResolvedProgress = bestDataPoint.progress;
    this.state.status = "synced";

    return bestDataPoint.progress;
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.state.status;
  }

  /**
   * Get sync state
   */
  getSyncState(): SyncState {
    return { ...this.state };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Force conflict resolution
   */
  forceConflictResolution(): void {
    if (this.state.conflictingSources.size > 0) {
      const conflicts = Array.from(this.dataPoints.values()).filter((dp) =>
        this.state.conflictingSources.has(dp.source),
      );
      const resolved = this.resolveConflicts(conflicts);
      if (resolved) {
        this.lastResolvedProgress = resolved.progress;
        this.state.conflictingSources.clear();
        this.state.status = "synced";

        this.addSyncEvent({
          type: "conflict_resolved",
          timestamp: Date.now(),
          data: { resolvedProgress: resolved.progress },
        });

        this.listeners.onSync?.(resolved.progress);
      }
    }
  }

  /**
   * Clear offline queue
   */
  clearOfflineQueue(): void {
    this.state.offlineQueue = [];
    this.listeners.onOfflineQueueChange?.([]);
  }

  /**
   * Set event listeners
   */
  on(event: "sync", callback: (progress: ProgressUpdate) => void): void;
  on(
    event: "conflict",
    callback: (conflicts: ProgressDataPoint[]) => void,
  ): void;
  on(event: "statusChange", callback: (status: SyncStatus) => void): void;
  on(
    event: "offlineQueueChange",
    callback: (queue: ProgressDataPoint[]) => void,
  ): void;
  on(
    event: "networkStatusChange",
    callback: (status: "online" | "offline" | "unstable") => void,
  ): void;
  on(event: "error", callback: (error: Error) => void): void;
  on(event: string, callback: any): void {
    switch (event) {
      case "sync":
        this.listeners.onSync = callback;
        break;
      case "conflict":
        this.listeners.onConflict = callback;
        break;
      case "statusChange":
        this.listeners.onStatusChange = callback;
        break;
      case "offlineQueueChange":
        this.listeners.onOfflineQueueChange = callback;
        break;
      case "networkStatusChange":
        this.listeners.onNetworkStatusChange = callback;
        break;
      case "error":
        this.listeners.onError = callback;
        break;
    }
  }

  /**
   * Destroy the sync manager and cleanup resources
   */
  destroy(): void {
    this.isDestroyed = true;

    // Clear timers
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.networkStatusTimer) {
      clearInterval(this.networkStatusTimer);
      this.networkStatusTimer = null;
    }

    // Clear data
    this.dataPoints.clear();
    this.state.activeDataSources.clear();
    this.state.conflictingSources.clear();
    this.state.offlineQueue = [];
    this.state.syncHistory = [];

    // Clear listeners
    this.listeners = {};
  }

  // Private methods

  private processSync = throttle(() => {
    if (this.isDestroyed) return;

    try {
      const resolvedProgress = this.getResolvedProgress();
      if (resolvedProgress) {
        this.listeners.onSync?.(resolvedProgress);
        this.state.lastSync = Date.now();
        this.state.lastSuccessfulSync = Date.now();
        this.state.consecutiveErrors = 0;

        this.addSyncEvent({
          type: "sync_complete",
          timestamp: Date.now(),
          data: { progress: resolvedProgress.overallProgress },
        });
      }
    } catch (error) {
      this.handleSyncError(error as Error);
    }
  }, this.config.throttleMs);

  private startSyncLoop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (!this.isDestroyed && this.dataPoints.size > 0) {
        this.processSync();
      }
    }, this.config.syncInterval);
  }

  private startNetworkMonitoring(): void {
    if (this.networkStatusTimer) {
      clearInterval(this.networkStatusTimer);
    }

    this.networkStatusTimer = setInterval(() => {
      this.checkNetworkStatus();
    }, 5000); // Check every 5 seconds
  }

  private checkNetworkStatus(): void {
    const isOnline = navigator.onLine;
    const newStatus = isOnline ? "online" : "offline";

    if (newStatus !== this.state.networkStatus) {
      this.state.networkStatus = newStatus;
      this.listeners.onNetworkStatusChange?.(newStatus);

      this.addSyncEvent({
        type: newStatus === "online" ? "online" : "offline",
        timestamp: Date.now(),
      });

      // If coming back online, process offline queue
      if (newStatus === "online" && this.state.offlineQueue.length > 0) {
        this.processOfflineQueue();
      }
    }
  }

  private processOfflineQueue(): void {
    if (this.state.offlineQueue.length === 0) return;

    const queuedData = [...this.state.offlineQueue];
    this.state.offlineQueue = [];

    queuedData.forEach((dataPoint) => {
      this.addProgressData(
        dataPoint.progress,
        dataPoint.source,
        dataPoint.metadata,
      );
    });

    this.listeners.onOfflineQueueChange?.([]);
  }

  private calculateReliability(
    progress: ProgressUpdate,
    source: DataSource,
    metadata?: ProgressDataPoint["metadata"],
  ): number {
    let reliability = DATA_SOURCE_PRIORITY[source] / 100;

    // Adjust based on latency
    if (metadata?.latency) {
      const latencyPenalty = Math.min(metadata.latency / 1000, 0.5); // Max 50% penalty
      reliability -= latencyPenalty;
    }

    // Adjust based on retry count
    if (metadata?.retryCount) {
      const retryPenalty = Math.min(metadata.retryCount * 0.1, 0.3); // Max 30% penalty
      reliability -= retryPenalty;
    }

    // Adjust based on timestamp freshness
    const age = Date.now() - progress.timestamp;
    const agePenalty = Math.min(age / 30000, 0.4); // Max 40% penalty for 30s old data
    reliability -= agePenalty;

    return Math.max(0.1, Math.min(1, reliability));
  }

  private detectConflicts(
    dataPoints: ProgressDataPoint[],
  ): ProgressDataPoint[] {
    if (dataPoints.length < 2) return [];

    const conflicts: ProgressDataPoint[] = [];
    const primaryProgress = dataPoints[0].progress;

    // Check for significant differences in progress
    for (let i = 1; i < dataPoints.length; i++) {
      const dp = dataPoints[i];
      const progressDiff = Math.abs(
        dp.progress.overallProgress - primaryProgress.overallProgress,
      );

      // Conflict if progress difference is more than 5% or status differs
      if (progressDiff > 5 || dp.progress.status !== primaryProgress.status) {
        conflicts.push(dp);
      }
    }

    return conflicts;
  }

  private resolveConflicts(
    conflicts: ProgressDataPoint[],
  ): ProgressDataPoint | null {
    const startTime = Date.now();
    this.performanceMetrics.conflictsDetected++;

    let resolved: ProgressDataPoint | null = null;

    switch (this.config.conflictResolution) {
      case "latest":
        resolved = this.resolveByLatest(conflicts);
        break;
      case "highest":
        resolved = this.resolveByHighest(conflicts);
        break;
      case "lowest":
        resolved = this.resolveByLowest(conflicts);
        break;
      case "weighted":
        resolved = this.resolveByWeighted(conflicts);
        break;
      case "priority":
        resolved = this.resolveByPriority(conflicts);
        break;
      case "smart":
        resolved = this.resolveSmart(conflicts);
        break;
    }

    if (resolved) {
      this.performanceMetrics.conflictsResolved++;
      const resolutionTime = Date.now() - startTime;
      this.updateResolutionTimeMetrics(resolutionTime);

      this.addSyncEvent({
        type: "conflict_resolved",
        timestamp: Date.now(),
        data: {
          strategy: this.config.conflictResolution,
          resolvedProgress: resolved.progress,
        },
      });
    }

    return resolved;
  }

  private resolveByLatest(conflicts: ProgressDataPoint[]): ProgressDataPoint {
    return conflicts.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest,
    );
  }

  private resolveByHighest(conflicts: ProgressDataPoint[]): ProgressDataPoint {
    return conflicts.reduce((highest, current) =>
      current.progress.overallProgress > highest.progress.overallProgress
        ? current
        : highest,
    );
  }

  private resolveByLowest(conflicts: ProgressDataPoint[]): ProgressDataPoint {
    return conflicts.reduce((lowest, current) =>
      current.progress.overallProgress < lowest.progress.overallProgress
        ? current
        : lowest,
    );
  }

  private resolveByWeighted(conflicts: ProgressDataPoint[]): ProgressDataPoint {
    const totalWeight = conflicts.reduce((sum, dp) => sum + dp.reliability, 0);

    if (totalWeight === 0) return conflicts[0];

    const weightedProgress = conflicts.reduce(
      (weighted, dp) => {
        const weight = dp.reliability / totalWeight;
        weighted.progress.overallProgress +=
          dp.progress.overallProgress * weight;
        return weighted;
      },
      { progress: { overallProgress: 0 } as ProgressUpdate },
    );

    // Find the closest actual data point
    return conflicts.reduce((closest, current) => {
      const currentDiff = Math.abs(
        current.progress.overallProgress -
          weightedProgress.progress.overallProgress,
      );
      const closestDiff = Math.abs(
        closest.progress.overallProgress -
          weightedProgress.progress.overallProgress,
      );
      return currentDiff < closestDiff ? current : closest;
    });
  }

  private resolveByPriority(conflicts: ProgressDataPoint[]): ProgressDataPoint {
    return conflicts.sort(
      (a, b) => DATA_SOURCE_PRIORITY[b.source] - DATA_SOURCE_PRIORITY[a.source],
    )[0];
  }

  private resolveSmart(conflicts: ProgressDataPoint[]): ProgressDataPoint {
    // AI-driven conflict resolution considering multiple factors

    // Filter out very old data (older than 30 seconds)
    const freshConflicts = conflicts.filter(
      (dp) => Date.now() - dp.progress.timestamp < 30000,
    );

    const validConflicts =
      freshConflicts.length > 0 ? freshConflicts : conflicts;

    // Prioritize by reliability and recency
    return validConflicts.sort((a, b) => {
      const scoreA = a.reliability * (1 - (Date.now() - a.timestamp) / 60000);
      const scoreB = b.reliability * (1 - (Date.now() - b.timestamp) / 60000);
      return scoreB - scoreA;
    })[0];
  }

  private selectBestDataPoint(
    dataPoints: ProgressDataPoint[],
  ): ProgressDataPoint {
    return dataPoints.sort((a, b) => {
      // Primary sort by reliability
      if (b.reliability !== a.reliability) {
        return b.reliability - a.reliability;
      }

      // Secondary sort by source priority
      const priorityDiff =
        DATA_SOURCE_PRIORITY[b.source] - DATA_SOURCE_PRIORITY[a.source];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Tertiary sort by timestamp (most recent)
      return b.timestamp - a.timestamp;
    })[0];
  }

  private updateResolutionTimeMetrics(resolutionTime: number): void {
    if (this.performanceMetrics.lastResolutionTime === 0) {
      this.performanceMetrics.averageResolutionTime = resolutionTime;
    } else {
      this.performanceMetrics.averageResolutionTime =
        (this.performanceMetrics.averageResolutionTime + resolutionTime) / 2;
    }
    this.performanceMetrics.lastResolutionTime = resolutionTime;
  }

  private handleSyncError(error: Error): void {
    this.state.consecutiveErrors++;

    if (this.state.consecutiveErrors >= this.config.maxRetries) {
      this.state.status = "error";
    }

    this.listeners.onError?.(error);

    this.addSyncEvent({
      type: "error",
      timestamp: Date.now(),
      data: {
        error: error.message,
        consecutiveErrors: this.state.consecutiveErrors,
      },
    });

    console.error(`Sync error for job ${this.jobId}:`, error);
  }

  private addSyncEvent(event: SyncEvent): void {
    this.state.syncHistory.push(event);

    // Trim history if it exceeds maximum size
    if (this.state.syncHistory.length > this.config.maxSyncHistory) {
      this.state.syncHistory = this.state.syncHistory.slice(
        -this.config.maxSyncHistory,
      );
    }
  }
}

/**
 * React hook for using the progress sync manager
 */
export function useProgressSyncManager(
  jobId: string,
  fileId: number,
  config?: Partial<SyncManagerConfig>,
) {
  const queryClient = useQueryClient();
  const [syncManager, setSyncManager] = useState<ProgressSyncManager | null>(
    null,
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("syncing");
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [conflicts, setConflicts] = useState<ProgressDataPoint[]>([]);

  // Initialize sync manager
  useEffect(() => {
    const manager = new ProgressSyncManager(jobId, fileId, queryClient, config);
    setSyncManager(manager);

    // Setup event listeners
    manager.on("sync", setProgress);
    manager.on("statusChange", setSyncStatus);
    manager.on("conflict", setConflicts);

    return () => {
      manager.destroy();
    };
  }, [jobId, fileId, queryClient, config]);

  // Memoized callback to add progress data
  const addProgressData = useCallback(
    (
      data: ProgressUpdate,
      source: DataSource,
      metadata?: ProgressDataPoint["metadata"],
    ) => {
      if (syncManager) {
        syncManager.addProgressData(data, source, metadata);
      }
    },
    [syncManager],
  );

  // Memoized callback to force conflict resolution
  const forceConflictResolution = useCallback(() => {
    if (syncManager) {
      syncManager.forceConflictResolution();
    }
  }, [syncManager]);

  return {
    syncManager,
    progress,
    syncStatus,
    conflicts,
    addProgressData,
    forceConflictResolution,
  };
}

/**
 * Factory function to create a sync manager
 */
export function createProgressSyncManager(
  jobId: string,
  fileId: number,
  queryClient?: any,
  config?: Partial<SyncManagerConfig>,
): ProgressSyncManager {
  return new ProgressSyncManager(jobId, fileId, queryClient, config);
}

/**
 * Utility to create sync manager configurations for different scenarios
 */
export const SyncManagerConfigs = {
  /**
   * Configuration for desktop environments with reliable connections
   */
  desktop: {
    conflictResolution: "smart" as ConflictResolutionStrategy,
    syncInterval: 500,
    throttleMs: 100,
    enableOfflineSupport: false,
  },

  /**
   * Configuration for mobile environments with potential connectivity issues
   */
  mobile: {
    conflictResolution: "latest" as ConflictResolutionStrategy,
    syncInterval: 2000,
    throttleMs: 500,
    enableOfflineSupport: true,
    maxOfflineQueueSize: 50,
  },

  /**
   * Configuration for testing with verbose logging
   */
  testing: {
    conflictResolution: "priority" as ConflictResolutionStrategy,
    syncInterval: 100,
    throttleMs: 50,
    enableConflictLogging: true,
    enablePerformanceMonitoring: true,
    maxSyncHistory: 1000,
  },
} as const;
