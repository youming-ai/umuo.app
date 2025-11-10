/**
 * Progress Tracker Entity Management
 *
 * Real-time progress tracking with stage-specific details for transcription optimization.
 * Compatible with the existing database schema (version 4) and TanStack Query patterns.
 */

import { db } from "./db";
import { handleError } from "../utils/error-handler";
import type { ProgressUpdate } from "@/types/progress";
import type { DeviceInfo, MobilePerformanceMetrics } from "@/types/mobile";

// Progress Tracker Types based on data model specifications
export interface ProgressStage {
  upload: {
    progress: number; // 0-100
    bytesTransferred: number;
    totalBytes: number;
    speed: number; // bytes per second
    eta?: number; // seconds remaining
    startTime?: Date;
    lastUpdate: Date;
  };
  transcription: {
    progress: number; // 0-100
    currentChunk: number;
    totalChunks: number;
    averageChunkTime: number; // milliseconds
    eta?: number; // seconds remaining
    startTime?: Date;
    lastUpdate: Date;
  };
  "post-processing": {
    progress: number; // 0-100
    segmentsProcessed: number;
    totalSegments: number;
    currentOperation:
      | "normalization"
      | "translation"
      | "annotation"
      | "furigana";
    startTime?: Date;
    lastUpdate: Date;
  };
}

export interface ProgressDeviceInfo {
  type: "mobile" | "desktop" | "tablet";
  networkType: "wifi" | "cellular" | "unknown";
  batteryLevel?: number; // 0-1
  isLowPowerMode: boolean;
}

export interface ProgressTrackerEntity {
  // Core identification
  id: string;
  jobId: string;
  fileId: number;

  // Progress state
  currentStage:
    | "upload"
    | "transcription"
    | "post-processing"
    | "completed"
    | "failed";
  overallProgress: number; // 0-100

  // Detailed stage information
  stages: ProgressStage;

  // Messages and feedback
  currentMessage: string;
  lastMessageUpdate: Date;

  // Connection management
  connectionType: "sse" | "polling" | "periodic";
  lastActivity: Date;
  connectionHealth: "healthy" | "degraded" | "disconnected";

  // Mobile-specific
  deviceInfo?: ProgressDeviceInfo;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Database interface for IndexedDB
export interface ProgressTrackerRow {
  id?: number;
  trackerId: string; // Unique identifier for the tracker
  jobId: string;
  fileId: number;
  currentStage: string;
  overallProgress: number;
  stages: string; // JSON string of ProgressStage
  currentMessage: string;
  lastMessageUpdate: Date;
  connectionType: string;
  lastActivity: Date;
  connectionHealth: string;
  deviceInfo?: string; // JSON string of ProgressDeviceInfo
  createdAt: Date;
  updatedAt: Date;
}

// Connection management interfaces
export interface ConnectionConfig {
  type: "sse" | "polling" | "periodic";
  updateInterval: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  timeout: number; // milliseconds
}

export interface ConnectionHealth {
  status: "healthy" | "degraded" | "disconnected";
  lastCheck: Date;
  consecutiveFailures: number;
  averageResponseTime: number; // milliseconds
  uptime: number; // percentage
}

// Progress update options
export interface ProgressUpdateOptions {
  stage: "upload" | "transcription" | "post-processing";
  progress: number;
  message?: string;
  metadata?: Record<string, any>;
  skipHistory?: boolean;
}

// Progress tracker creation options
export interface CreateProgressTrackerOptions {
  jobId: string;
  fileId: number;
  connectionType?: "sse" | "polling" | "periodic";
  deviceInfo?: ProgressDeviceInfo;
  initialStage?: "upload" | "transcription" | "post-processing";
  message?: string;
}

/**
 * Progress Tracker Entity Class
 *
 * Manages real-time progress tracking with stage-specific details,
 * connection management, and mobile device optimization.
 */
export class ProgressTracker {
  private entity: ProgressTrackerEntity;
  private connectionConfig: ConnectionConfig;
  private connectionHealth: ConnectionHealth;
  private updateHistory: ProgressUpdate[] = [];
  private isDestroyed = false;

  // Event listeners
  private listeners: {
    onProgress?: (progress: ProgressUpdate) => void;
    onStageChange?: (stage: string, previousStage: string) => void;
    onConnectionHealthChange?: (health: ConnectionHealth) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
  } = {};

  constructor(options: CreateProgressTrackerOptions) {
    const now = new Date();

    this.entity = {
      id: `tracker_${options.jobId}_${Date.now()}`,
      jobId: options.jobId,
      fileId: options.fileId,
      currentStage: options.initialStage || "upload",
      overallProgress: 0,
      stages: {
        upload: {
          progress: 0,
          bytesTransferred: 0,
          totalBytes: 0,
          speed: 0,
          lastUpdate: now,
        },
        transcription: {
          progress: 0,
          currentChunk: 0,
          totalChunks: 0,
          averageChunkTime: 0,
          lastUpdate: now,
        },
        "post-processing": {
          progress: 0,
          segmentsProcessed: 0,
          totalSegments: 0,
          currentOperation: "normalization",
          lastUpdate: now,
        },
      },
      currentMessage: options.message || "Initializing...",
      lastMessageUpdate: now,
      connectionType: options.connectionType || "sse",
      lastActivity: now,
      connectionHealth: "healthy",
      deviceInfo: options.deviceInfo,
      createdAt: now,
      updatedAt: now,
    };

    this.connectionConfig = this.getDefaultConnectionConfig(
      options.connectionType || "sse",
    );
    this.connectionHealth = {
      status: "healthy",
      lastCheck: now,
      consecutiveFailures: 0,
      averageResponseTime: 0,
      uptime: 100,
    };
  }

  /**
   * Get the progress tracker entity
   */
  getEntity(): ProgressTrackerEntity {
    return { ...this.entity };
  }

  /**
   * Get current progress update
   */
  getCurrentProgress(): ProgressUpdate {
    return {
      jobId: this.entity.jobId,
      fileId: this.entity.fileId,
      status: this.getStatusFromStage(this.entity.currentStage),
      overallProgress: this.entity.overallProgress,
      currentStage: this.entity.currentStage,
      message: this.entity.currentMessage,
      timestamp: Date.now(),
      stages: {
        upload: {
          progress: this.entity.stages.upload.progress,
          speed: this.entity.stages.upload.speed,
          eta: this.entity.stages.upload.eta,
          bytesTransferred: this.entity.stages.upload.bytesTransferred,
          totalBytes: this.entity.stages.upload.totalBytes,
        },
        transcription: {
          progress: this.entity.stages.transcription.progress,
          currentChunk: this.entity.stages.transcription.currentChunk,
          totalChunks: this.entity.stages.transcription.totalChunks,
          eta: this.entity.stages.transcription.eta,
        },
        "post-processing": {
          progress: this.entity.stages["post-processing"].progress,
          segmentsProcessed:
            this.entity.stages["post-processing"].segmentsProcessed,
          totalSegments: this.entity.stages["post-processing"].totalSegments,
        },
      },
      mobileOptimizations: this.entity.deviceInfo
        ? {
            connectionType: this.entity.deviceInfo.networkType,
            batteryLevel: this.entity.deviceInfo.batteryLevel || 1,
            isLowPowerMode: this.entity.deviceInfo.isLowPowerMode,
          }
        : undefined,
    };
  }

  /**
   * Update progress with stage-specific details
   */
  async updateProgress(options: ProgressUpdateOptions): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("Cannot update destroyed progress tracker");
    }

    const now = new Date();
    const previousStage = this.entity.currentStage;
    const previousOverallProgress = this.entity.overallProgress;

    // Update stage-specific progress
    this.updateStageProgress(options.stage, options.progress, options.metadata);

    // Update message if provided
    if (options.message) {
      this.entity.currentMessage = options.message;
      this.entity.lastMessageUpdate = now;
    }

    // Recalculate overall progress
    this.calculateOverallProgress();

    // Update timestamps
    this.entity.lastActivity = now;
    this.entity.updatedAt = now;

    // Add to update history (limit to last 50 updates)
    if (!options.skipHistory) {
      const progressUpdate = this.getCurrentProgress();
      this.updateHistory.push(progressUpdate);
      if (this.updateHistory.length > 50) {
        this.updateHistory = this.updateHistory.slice(-50);
      }
    }

    // Check for stage change
    if (previousStage !== this.entity.currentStage) {
      this.listeners.onStageChange?.(this.entity.currentStage, previousStage);
    }

    // Check for completion
    if (this.entity.overallProgress === 100 && previousOverallProgress < 100) {
      this.entity.currentStage = "completed";
      this.listeners.onComplete?.();
    }

    // Notify progress listeners
    this.listeners.onProgress?.(this.getCurrentProgress());

    // Save to database
    try {
      await this.saveToDatabase();
    } catch (error) {
      this.listeners.onError?.(
        handleError(error, "ProgressTracker.updateProgress"),
      );
    }
  }

  /**
   * Update connection health status
   */
  updateConnectionHealth(
    status: ConnectionHealth["status"],
    responseTime?: number,
  ): void {
    const now = new Date();

    this.connectionHealth.lastCheck = now;

    if (status === "healthy") {
      this.connectionHealth.consecutiveFailures = 0;
      if (responseTime) {
        // Update running average of response time
        this.connectionHealth.averageResponseTime =
          (this.connectionHealth.averageResponseTime + responseTime) / 2;
      }
    } else {
      this.connectionHealth.consecutiveFailures++;
    }

    this.connectionHealth.status = status;
    this.entity.connectionHealth = status;
    this.entity.lastActivity = now;

    // Notify connection health listeners
    this.listeners.onConnectionHealthChange?.(this.connectionHealth);
  }

  /**
   * Set event listeners
   */
  on(event: "progress", callback: (progress: ProgressUpdate) => void): void;
  on(
    event: "stageChange",
    callback: (stage: string, previousStage: string) => void,
  ): void;
  on(
    event: "connectionHealthChange",
    callback: (health: ConnectionHealth) => void,
  ): void;
  on(event: "error", callback: (error: Error) => void): void;
  on(event: "complete", callback: () => void): void;
  on(event: string, callback: any): void {
    switch (event) {
      case "progress":
        this.listeners.onProgress = callback;
        break;
      case "stageChange":
        this.listeners.onStageChange = callback;
        break;
      case "connectionHealthChange":
        this.listeners.onConnectionHealthChange = callback;
        break;
      case "error":
        this.listeners.onError = callback;
        break;
      case "complete":
        this.listeners.onComplete = callback;
        break;
    }
  }

  /**
   * Remove all event listeners and cleanup
   */
  destroy(): void {
    this.isDestroyed = true;
    this.listeners = {};
    this.updateHistory = [];
  }

  /**
   * Save current state to database
   */
  async saveToDatabase(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    const row: ProgressTrackerRow = {
      trackerId: this.entity.id,
      jobId: this.entity.jobId,
      fileId: this.entity.fileId,
      currentStage: this.entity.currentStage,
      overallProgress: this.entity.overallProgress,
      stages: JSON.stringify(this.entity.stages),
      currentMessage: this.entity.currentMessage,
      lastMessageUpdate: this.entity.lastMessageUpdate,
      connectionType: this.entity.connectionType,
      lastActivity: this.entity.lastActivity,
      connectionHealth: this.entity.connectionHealth,
      deviceInfo: this.entity.deviceInfo
        ? JSON.stringify(this.entity.deviceInfo)
        : undefined,
      createdAt: this.entity.createdAt,
      updatedAt: this.entity.updatedAt,
    };

    try {
      // Check if tracker already exists
      const existing = await db.progressTrackers
        .where("trackerId")
        .equals(this.entity.id)
        .first();

      if (existing) {
        await db.progressTrackers.update(existing.id!, row);
      } else {
        await db.progressTrackers.add(row);
      }
    } catch (error) {
      throw handleError(error, "ProgressTracker.saveToDatabase");
    }
  }

  /**
   * Get update history
   */
  getUpdateHistory(): ProgressUpdate[] {
    return [...this.updateHistory];
  }

  /**
   * Get connection health information
   */
  getConnectionHealth(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  /**
   * Get ETA for current stage
   */
  getStageETA(stage: keyof ProgressStage): number | undefined {
    const stageData = this.entity.stages[stage];
    return stageData.eta;
  }

  /**
   * Check if tracker is for mobile device
   */
  isMobile(): boolean {
    return (
      this.entity.deviceInfo?.type === "mobile" ||
      this.entity.deviceInfo?.type === "tablet"
    );
  }

  /**
   * Get mobile performance optimizations
   */
  getMobileOptimizations(): {
    reducedUpdateFrequency: boolean;
    adaptiveChunking: boolean;
    batteryOptimizations: boolean;
  } {
    if (!this.entity.deviceInfo || this.entity.deviceInfo.type === "desktop") {
      return {
        reducedUpdateFrequency: false,
        adaptiveChunking: false,
        batteryOptimizations: false,
      };
    }

    return {
      reducedUpdateFrequency: this.entity.connectionType === "polling",
      adaptiveChunking: this.entity.deviceInfo.networkType === "cellular",
      batteryOptimizations:
        this.entity.deviceInfo.isLowPowerMode ||
        (this.entity.deviceInfo.batteryLevel !== undefined &&
          this.entity.deviceInfo.batteryLevel < 0.2),
    };
  }

  // Private methods

  private updateStageProgress(
    stage: keyof ProgressStage,
    progress: number,
    metadata?: Record<string, any>,
  ): void {
    const stageData = this.entity.stages[stage];
    const now = new Date();

    stageData.progress = Math.min(100, Math.max(0, progress));
    stageData.lastUpdate = now;

    // Set start time if this is the first update
    if (!stageData.startTime && progress > 0) {
      stageData.startTime = now;
    }

    // Update stage-specific metadata
    if (metadata) {
      switch (stage) {
        case "upload":
          if (metadata.bytesTransferred !== undefined) {
            stageData.bytesTransferred = metadata.bytesTransferred;
          }
          if (metadata.totalBytes !== undefined) {
            stageData.totalBytes = metadata.totalBytes;
          }
          if (
            stageData.startTime &&
            metadata.bytesTransferred &&
            metadata.totalBytes
          ) {
            const elapsed = now.getTime() - stageData.startTime.getTime();
            stageData.speed =
              elapsed > 0 ? (metadata.bytesTransferred * 1000) / elapsed : 0;

            // Calculate ETA
            const remainingBytes =
              metadata.totalBytes - metadata.bytesTransferred;
            stageData.eta =
              stageData.speed > 0
                ? remainingBytes / stageData.speed
                : undefined;
          }
          break;

        case "transcription":
          if (metadata.currentChunk !== undefined) {
            stageData.currentChunk = metadata.currentChunk;
          }
          if (metadata.totalChunks !== undefined) {
            stageData.totalChunks = metadata.totalChunks;
          }
          if (metadata.chunkTime !== undefined) {
            // Update running average of chunk processing time
            stageData.averageChunkTime =
              (stageData.averageChunkTime + metadata.chunkTime) / 2;
          }
          if (
            stageData.startTime &&
            stageData.currentChunk > 0 &&
            stageData.totalChunks > 0
          ) {
            const elapsed = now.getTime() - stageData.startTime.getTime();
            const avgTimePerChunk = elapsed / stageData.currentChunk;
            const remainingChunks =
              stageData.totalChunks - stageData.currentChunk;
            stageData.eta = (avgTimePerChunk * remainingChunks) / 1000; // Convert to seconds
          }
          break;

        case "post-processing":
          if (metadata.segmentsProcessed !== undefined) {
            stageData.segmentsProcessed = metadata.segmentsProcessed;
          }
          if (metadata.totalSegments !== undefined) {
            stageData.totalSegments = metadata.totalSegments;
          }
          if (metadata.currentOperation !== undefined) {
            stageData.currentOperation = metadata.currentOperation;
          }
          break;
      }
    }
  }

  private calculateOverallProgress(): void {
    // Weight stages based on typical processing time
    const weights = {
      upload: 0.1, // 10% of total time
      transcription: 0.75, // 75% of total time
      "post-processing": 0.15, // 15% of total time
    };

    let totalProgress = 0;
    let totalWeight = 0;

    for (const [stage, weight] of Object.entries(weights)) {
      const stageProgress =
        this.entity.stages[stage as keyof ProgressStage].progress;
      totalProgress += stageProgress * weight;
      totalWeight += weight;
    }

    this.entity.overallProgress = Math.round(totalProgress);

    // Update current stage based on progress
    if (this.entity.stages.upload.progress < 100) {
      this.entity.currentStage = "upload";
    } else if (this.entity.stages.transcription.progress < 100) {
      this.entity.currentStage = "transcription";
    } else if (this.entity.stages["post-processing"].progress < 100) {
      this.entity.currentStage = "post-processing";
    } else {
      this.entity.currentStage = "completed";
    }
  }

  private getStatusFromStage(stage: string): ProgressUpdate["status"] {
    switch (stage) {
      case "upload":
        return "uploading";
      case "transcription":
      case "post-processing":
        return "processing";
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      default:
        return "processing";
    }
  }

  private getDefaultConnectionConfig(
    type: ConnectionConfig["type"],
  ): ConnectionConfig {
    const baseConfig = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
    };

    switch (type) {
      case "sse":
        return {
          ...baseConfig,
          type: "sse",
          updateInterval: 0, // Real-time updates
        };
      case "polling":
        return {
          ...baseConfig,
          type: "polling",
          updateInterval: 2000, // 2 seconds for mobile optimization
        };
      case "periodic":
        return {
          ...baseConfig,
          type: "periodic",
          updateInterval: 5000, // 5 seconds for periodic updates
        };
    }
  }
}

/**
 * Progress Tracker Manager
 *
 * Factory class for creating and managing ProgressTracker instances.
 * Handles database operations and provides utility methods.
 */
export class ProgressTrackerManager {
  private static instance: ProgressTrackerManager;
  private activeTrackers = new Map<string, ProgressTracker>();

  static getInstance(): ProgressTrackerManager {
    if (!ProgressTrackerManager.instance) {
      ProgressTrackerManager.instance = new ProgressTrackerManager();
    }
    return ProgressTrackerManager.instance;
  }

  private constructor() {}

  /**
   * Create a new progress tracker
   */
  async createTracker(
    options: CreateProgressTrackerOptions,
  ): Promise<ProgressTracker> {
    const tracker = new ProgressTracker(options);

    // Store in active trackers
    this.activeTrackers.set(tracker.getEntity().id, tracker);

    // Save initial state to database
    try {
      await tracker.saveToDatabase();
    } catch (error) {
      this.activeTrackers.delete(tracker.getEntity().id);
      throw handleError(error, "ProgressTrackerManager.createTracker");
    }

    return tracker;
  }

  /**
   * Get tracker by ID
   */
  async getTracker(trackerId: string): Promise<ProgressTracker | null> {
    // Check active trackers first
    if (this.activeTrackers.has(trackerId)) {
      return this.activeTrackers.get(trackerId)!;
    }

    // Try to load from database
    try {
      const row = await db.progressTrackers
        .where("trackerId")
        .equals(trackerId)
        .first();
      if (!row) {
        return null;
      }

      // Reconstruct tracker from database
      const entity: ProgressTrackerEntity = {
        id: row.trackerId,
        jobId: row.jobId,
        fileId: row.fileId,
        currentStage: row.currentStage as ProgressTrackerEntity["currentStage"],
        overallProgress: row.overallProgress,
        stages: JSON.parse(row.stages),
        currentMessage: row.currentMessage,
        lastMessageUpdate: row.lastMessageUpdate,
        connectionType:
          row.connectionType as ProgressTrackerEntity["connectionType"],
        lastActivity: row.lastActivity,
        connectionHealth:
          row.connectionHealth as ProgressTrackerEntity["connectionHealth"],
        deviceInfo: row.deviceInfo ? JSON.parse(row.deviceInfo) : undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      const tracker = new ProgressTracker({
        jobId: entity.jobId,
        fileId: entity.fileId,
        connectionType: entity.connectionType,
        deviceInfo: entity.deviceInfo,
        initialStage: entity.currentStage,
        message: entity.currentMessage,
      });

      // Restore entity state
      (tracker as any).entity = entity;

      // Store in active trackers
      this.activeTrackers.set(trackerId, tracker);

      return tracker;
    } catch (error) {
      throw handleError(error, "ProgressTrackerManager.getTracker");
    }
  }

  /**
   * Get tracker by job ID
   */
  async getTrackerByJobId(jobId: string): Promise<ProgressTracker | null> {
    try {
      const row = await db.progressTrackers
        .where("jobId")
        .equals(jobId)
        .first();
      if (!row) {
        return null;
      }

      return this.getTracker(row.trackerId);
    } catch (error) {
      throw handleError(error, "ProgressTrackerManager.getTrackerByJobId");
    }
  }

  /**
   * Get tracker by file ID
   */
  async getTrackerByFileId(fileId: number): Promise<ProgressTracker | null> {
    try {
      const row = await db.progressTrackers
        .where("fileId")
        .equals(fileId)
        .first();
      if (!row) {
        return null;
      }

      return this.getTracker(row.trackerId);
    } catch (error) {
      throw handleError(error, "ProgressTrackerManager.getTrackerByFileId");
    }
  }

  /**
   * Delete tracker
   */
  async deleteTracker(trackerId: string): Promise<void> {
    // Destroy tracker if active
    const tracker = this.activeTrackers.get(trackerId);
    if (tracker) {
      tracker.destroy();
      this.activeTrackers.delete(trackerId);
    }

    // Delete from database
    try {
      const row = await db.progressTrackers
        .where("trackerId")
        .equals(trackerId)
        .first();
      if (row) {
        await db.progressTrackers.delete(row.id!);
      }
    } catch (error) {
      throw handleError(error, "ProgressTrackerManager.deleteTracker");
    }
  }

  /**
   * Get all active trackers
   */
  getActiveTrackers(): ProgressTracker[] {
    return Array.from(this.activeTrackers.values());
  }

  /**
   * Cleanup old completed trackers
   */
  async cleanupOldTrackers(olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const oldTrackers = await db.progressTrackers
        .where("updatedAt")
        .below(cutoffDate)
        .toArray();

      for (const tracker of oldTrackers) {
        // Destroy if active
        if (this.activeTrackers.has(tracker.trackerId)) {
          this.activeTrackers.get(tracker.trackerId)!.destroy();
          this.activeTrackers.delete(tracker.trackerId);
        }

        // Delete from database
        await db.progressTrackers.delete(tracker.id!);
      }
    } catch (error) {
      throw handleError(error, "ProgressTrackerManager.cleanupOldTrackers");
    }
  }

  /**
   * Get statistics for all trackers
   */
  async getTrackerStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    averageProgress: number;
  }> {
    try {
      const allTrackers = await db.progressTrackers.toArray();
      const activeTrackers = this.getActiveTrackers();

      const completed = allTrackers.filter(
        (t) => t.overallProgress === 100,
      ).length;
      const failed = allTrackers.filter(
        (t) => t.connectionHealth === "disconnected",
      ).length;

      const totalProgress = allTrackers.reduce(
        (sum, t) => sum + t.overallProgress,
        0,
      );
      const averageProgress =
        allTrackers.length > 0 ? totalProgress / allTrackers.length : 0;

      return {
        total: allTrackers.length,
        active: activeTrackers.length,
        completed,
        failed,
        averageProgress,
      };
    } catch (error) {
      throw handleError(error, "ProgressTrackerManager.getTrackerStats");
    }
  }
}

// Export singleton instance
export const progressTrackerManager = ProgressTrackerManager.getInstance();
