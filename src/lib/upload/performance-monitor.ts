/**
 * Performance Monitor for tracking upload performance and metrics
 *
 * This module provides comprehensive performance monitoring for chunked uploads,
 * including speed tracking, efficiency calculations, and network optimization metrics.
 */

import type {
  PerformanceMetrics,
  UploadProgress,
  ChunkInfo
} from "@/types/upload";

export class PerformanceMonitor {
  private sessionId: string;
  private startTime: number = 0;
  private endTime: number = 0;
  private totalBytes: number = 0;
  private chunkMetrics: Map<string, ChunkMetrics> = new Map();
  private networkMetrics: NetworkMetrics[] = [];
  private pauseIntervals: Array<{ start: number; end: number }> = [];
  private currentPauseStart?: number;
  private isDestroyed = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
  }

  /**
   * Start monitoring a new upload session
   */
  public startSession(totalBytes: number): void {
    this.startTime = Date.now();
    this.totalBytes = totalBytes;
    this.endTime = 0;
    this.chunkMetrics.clear();
    this.networkMetrics = [];
    this.pauseIntervals = [];
    this.currentPauseStart = undefined;

    this.log("Performance monitoring started", { sessionId: this.sessionId, totalBytes });
  }

  /**
   * Record the start of a chunk upload
   */
  public recordChunkStart(chunk: ChunkInfo): void {
    const metrics: ChunkMetrics = {
      chunkId: chunk.id,
      index: chunk.index,
      size: chunk.size,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      speed: 0,
      retryCount: chunk.retryCount,
      success: false,
      error: undefined,
    };

    this.chunkMetrics.set(chunk.id, metrics);
  }

  /**
   * Record the completion of a chunk upload
   */
  public recordChunkComplete(chunk: ChunkInfo, bytesUploaded: number): void {
    const metrics = this.chunkMetrics.get(chunk.id);
    if (!metrics) {
      this.recordChunkStart(chunk);
    }

    const updatedMetrics = this.chunkMetrics.get(chunk.id)!;
    updatedMetrics.endTime = Date.now();
    updatedMetrics.duration = updatedMetrics.endTime - updatedMetrics.startTime;
    updatedMetrics.speed = bytesUploaded / (updatedMetrics.duration / 1000); // bytes per second
    updatedMetrics.success = true;

    // Record network metrics
    this.recordNetworkMetric(bytesUploaded, updatedMetrics.duration, true);

    this.log("Chunk completed", {
      chunkId: chunk.id,
      duration: updatedMetrics.duration,
      speed: Math.round(updatedMetrics.speed / 1024) + ' KB/s'
    });
  }

  /**
   * Record a failed chunk upload
   */
  public recordChunkFailed(chunk: ChunkInfo, error: Error): void {
    const metrics = this.chunkMetrics.get(chunk.id);
    if (!metrics) {
      this.recordChunkStart(chunk);
    }

    const updatedMetrics = this.chunkMetrics.get(chunk.id)!;
    updatedMetrics.endTime = Date.now();
    updatedMetrics.duration = updatedMetrics.endTime - updatedMetrics.startTime;
    updatedMetrics.success = false;
    updatedMetrics.error = error.message;

    this.log("Chunk failed", {
      chunkId: chunk.id,
      duration: updatedMetrics.duration,
      error: error.message
    });
  }

  /**
   * Record upload pause
   */
  public recordPauseStart(): void {
    this.currentPauseStart = Date.now();
  }

  /**
   * Record upload resume
   */
  public recordPauseEnd(): void {
    if (this.currentPauseStart) {
      this.pauseIntervals.push({
        start: this.currentPauseStart,
        end: Date.now(),
      });
      this.currentPauseStart = undefined;
    }
  }

  /**
   * Get current performance metrics
   */
  public getCurrentMetrics(): PerformanceMetrics {
    const now = Date.now();
    const elapsedMs = now - this.startTime;

    // Calculate total uploaded bytes
    const completedChunks = Array.from(this.chunkMetrics.values())
      .filter(m => m.success);

    const uploadedBytes = completedChunks.reduce((total, m) => total + m.size, 0);

    // Calculate average upload speed
    const activeTime = elapsedMs - this.getTotalPauseTime();
    const uploadSpeed = activeTime > 0 ? (uploadedBytes / activeTime) * 1000 : 0;

    // Calculate average chunk time
    const averageChunkTime = completedChunks.length > 0
      ? completedChunks.reduce((sum, m) => sum + m.duration, 0) / completedChunks.length
      : 0;

    // Calculate retry count
    const retryCount = Array.from(this.chunkMetrics.values())
      .reduce((sum, m) => sum + m.retryCount, 0);

    // Calculate efficiency
    const efficiency = this.calculateEfficiency(uploadSpeed, retryCount);

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: this.endTime || now,
      totalBytes: this.totalBytes,
      uploadSpeed,
      averageChunkTime,
      retryCount,
      networkSwitches: this.networkMetrics.length,
      pauseDuration: this.getTotalPauseTime(),
      efficiency,
    };
  }

  /**
   * Get detailed chunk metrics
   */
  public getChunkMetrics(): ChunkMetrics[] {
    return Array.from(this.chunkMetrics.values());
  }

  /**
   * Get network performance history
   */
  public getNetworkMetrics(): NetworkMetrics[] {
    return [...this.networkMetrics];
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    overallEfficiency: number;
    averageSpeed: number; // bytes per second
    totalUploadTime: number; // milliseconds
    activeUploadTime: number; // milliseconds
    pauseRatio: number; // ratio of pause time to total time
    successRate: number; // percentage of successful chunks
    retryRate: number; // average retries per chunk
    recommendations: string[];
  } {
    const metrics = this.getCurrentMetrics();
    const chunkMetrics = this.getChunkMetrics();

    const totalChunks = chunkMetrics.length;
    const successfulChunks = chunkMetrics.filter(m => m.success).length;
    const totalRetries = chunkMetrics.reduce((sum, m) => sum + m.retryCount, 0);

    const totalUploadTime = metrics.endTime - metrics.startTime;
    const activeUploadTime = totalUploadTime - metrics.pauseDuration;
    const pauseRatio = totalUploadTime > 0 ? metrics.pauseDuration / totalUploadTime : 0;

    const successRate = totalChunks > 0 ? (successfulChunks / totalChunks) * 100 : 0;
    const retryRate = totalChunks > 0 ? totalRetries / totalChunks : 0;

    const recommendations = this.generateRecommendations(metrics, successRate, retryRate);

    return {
      overallEfficiency: metrics.efficiency,
      averageSpeed: metrics.uploadSpeed,
      totalUploadTime,
      activeUploadTime,
      pauseRatio,
      successRate,
      retryRate,
      recommendations,
    };
  }

  /**
   * Complete the monitoring session
   */
  public completeSession(): void {
    this.endTime = Date.now();

    // End any ongoing pause
    if (this.currentPauseStart) {
      this.recordPauseEnd();
    }

    this.log("Performance monitoring completed", {
      sessionId: this.sessionId,
      duration: this.endTime - this.startTime,
      metrics: this.getCurrentMetrics()
    });
  }

  /**
   * Destroy the performance monitor
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.completeSession();
    this.chunkMetrics.clear();
    this.networkMetrics = [];
    this.pauseIntervals = [];
    this.log("Performance monitor destroyed", { sessionId: this.sessionId });
  }

  // Private methods

  private recordNetworkMetric(bytes: number, duration: number, success: boolean): void {
    const metric: NetworkMetrics = {
      timestamp: Date.now(),
      bytes,
      duration,
      speed: duration > 0 ? (bytes / duration) * 1000 : 0,
      success,
    };

    this.networkMetrics.push(metric);

    // Keep only recent metrics (last 100)
    if (this.networkMetrics.length > 100) {
      this.networkMetrics.shift();
    }
  }

  private getTotalPauseTime(): number {
    let totalPauseTime = 0;

    // Add completed pause intervals
    for (const interval of this.pauseIntervals) {
      totalPauseTime += interval.end - interval.start;
    }

    // Add current pause if ongoing
    if (this.currentPauseStart) {
      totalPauseTime += Date.now() - this.currentPauseStart;
    }

    return totalPauseTime;
  }

  private calculateEfficiency(uploadSpeed: number, retryCount: number): number {
    // Base efficiency on speed relative to expected speed
    const expectedSpeed = 1024 * 1024; // 1 MB/s as baseline
    const speedEfficiency = Math.min(1, uploadSpeed / expectedSpeed);

    // Penalize for retries
    const retryPenalty = Math.max(0, 1 - (retryCount * 0.1));

    // Combine factors
    return speedEfficiency * retryPenalty;
  }

  private generateRecommendations(
    metrics: PerformanceMetrics,
    successRate: number,
    retryRate: number
  ): string[] {
    const recommendations: string[] = [];

    // Speed-based recommendations
    if (metrics.uploadSpeed < 512 * 1024) { // Less than 512 KB/s
      recommendations.push("Consider reducing chunk size for slow connections");
    } else if (metrics.uploadSpeed > 5 * 1024 * 1024) { // Greater than 5 MB/s
      recommendations.push("Consider increasing chunk size for fast connections");
    }

    // Retry-based recommendations
    if (retryRate > 2) {
      recommendations.push("High retry rate detected - consider increasing timeout values");
      recommendations.push("Network instability may require smaller concurrent upload limit");
    }

    // Success rate recommendations
    if (successRate < 90) {
      recommendations.push("Low success rate - check network stability and server reliability");
    }

    // Efficiency-based recommendations
    if (metrics.efficiency < 0.5) {
      recommendations.push("Low efficiency detected - review chunk size and retry settings");
    }

    // Pause duration recommendations
    if (metrics.pauseDuration > 60000) { // More than 1 minute of pauses
      recommendations.push("Consider enabling background upload for better user experience");
    }

    return recommendations;
  }

  private log(message: string, data?: any): void {
    if (!this.isDestroyed) {
      console.log(`[PerformanceMonitor:${this.sessionId}] ${message}`, data);
    }
  }
}

// Supporting interfaces

interface ChunkMetrics {
  chunkId: string;
  index: number;
  size: number;
  startTime: number;
  endTime: number;
  duration: number;
  speed: number; // bytes per second
  retryCount: number;
  success: boolean;
  error?: string;
}

interface NetworkMetrics {
  timestamp: number;
  bytes: number;
  duration: number;
  speed: number; // bytes per second
  success: boolean;
}

export default PerformanceMonitor;
