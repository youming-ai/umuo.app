/**
 * Performance monitoring for transcription operations
 *
 * Features:
 * - Real-time performance metrics collection
 * - Memory usage monitoring for audio processing
 * - Processing time analysis and optimization suggestions
 * - Error rate tracking and classification
 * - Resource utilization monitoring
 * - Performance trend analysis
 */

export interface TranscriptionMetrics {
  id: string;
  jobId?: string;
  fileId: number;
  timestamp: Date;

  // Performance metrics
  processingTime: number; // milliseconds
  queueTime: number; // milliseconds
  uploadTime?: number; // milliseconds
  totalTime: number; // milliseconds

  // Audio characteristics
  audioSize: number; // bytes
  audioDuration: number; // seconds
  audioFormat: string;
  quality: string;

  // System metrics
  memoryUsage: number; // MB
  cpuUsage?: number; // percentage
  networkType?: "wifi" | "cellular" | "unknown";

  // API metrics
  apiCalls: number;
  apiResponseTime: number; // average milliseconds
  retryCount: number;
  successRate: number; // percentage

  // Transcription quality
  wordCount: number;
  segmentCount: number;
  confidence?: number; // average confidence score

  // Cost analysis
  estimatedCost: number; // USD
  costPerMinute: number; // USD per minute of audio

  // Error tracking
  errors: TranscriptionError[];
  errorRate: number; // percentage

  // Optimization flags
  wasChunked: boolean;
  chunkCount: number;
  concurrencyUsed: number;
  optimizations: string[];
}

export interface TranscriptionError {
  type:
    | "network"
    | "api"
    | "processing"
    | "timeout"
    | "memory"
    | "validation"
    | "unknown";
  message: string;
  timestamp: Date;
  retryable: boolean;
  resolved: boolean;
  resolutionTime?: number; // milliseconds to resolve
}

export interface PerformanceSummary {
  timeWindow: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  averageQueueTime: number;
  successRate: number;
  errorRate: number;
  throughput: number; // jobs per hour

  // Audio processing metrics
  averageAudioSize: number; // MB
  averageAudioDuration: number; // seconds
  totalAudioProcessed: number; // minutes

  // Performance metrics
  averageMemoryUsage: number; // MB
  averageApiResponseTime: number; // milliseconds
  averageRetryCount: number;

  // Cost metrics
  totalCost: number; // USD
  averageCostPerJob: number; // USD
  costEfficiency: number; // cost per minute of audio

  // Optimization metrics
  chunkedJobsPercentage: number;
  averageConcurrency: number;
  averageChunksPerJob: number;

  // Quality metrics
  averageConfidence: number;
  averageWordsPerMinute: number;

  // Error breakdown
  errorBreakdown: Record<string, number>;

  // Trends
  processingTimeTrend: "improving" | "stable" | "degrading";
  errorRateTrend: "improving" | "stable" | "degrading";
  costEfficiencyTrend: "improving" | "stable" | "degrading";
}

export interface PerformanceAlert {
  id: string;
  type: "performance" | "error_rate" | "memory" | "cost" | "quality";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: Date;
  metric: string;
  currentValue: number;
  threshold: number;
  recommendation: string;
}

/**
 * Enhanced transcription performance monitor
 */
export class TranscriptionPerformanceMonitor {
  private static instance: TranscriptionPerformanceMonitor;
  private metrics: TranscriptionMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxMetricsCount = 10000; // Keep last 10k metrics
  private maxAlertsCount = 1000; // Keep last 1k alerts

  // Performance thresholds
  private thresholds = {
    maxProcessingTime: 300000, // 5 minutes
    maxMemoryUsage: 512, // MB
    maxErrorRate: 0.1, // 10%
    maxApiResponseTime: 10000, // 10 seconds
    maxRetryCount: 3,
    maxCostPerMinute: 0.1, // $0.10 per minute
    minConfidence: 0.8, // 80%
    minSuccessRate: 0.95, // 95%
  };

  static getInstance(): TranscriptionPerformanceMonitor {
    if (!this.instance) {
      this.instance = new TranscriptionPerformanceMonitor();
    }
    return this.instance;
  }

  /**
   * Record transcription metrics
   */
  recordMetrics(metrics: Omit<TranscriptionMetrics, "id" | "timestamp">): void {
    const metric: TranscriptionMetrics = {
      ...metrics,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.metrics.push(metric);

    // Cleanup old metrics
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics = this.metrics.slice(-this.maxMetricsCount);
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(metric);

    console.log("Performance metrics recorded:", {
      jobId: metric.jobId,
      processingTime: metric.processingTime,
      success: metric.errorRate === 0,
      chunked: metric.wasChunked,
    });
  }

  /**
   * Start monitoring a transcription job
   */
  startJobMonitoring(jobId: string, fileId: number, audioFile: File): string {
    const monitoringId = `monitor_${jobId}_${Date.now()}`;

    console.log("Started job monitoring:", {
      monitoringId,
      jobId,
      fileId,
      audioSize: audioFile.size,
      audioType: audioFile.type,
    });

    return monitoringId;
  }

  /**
   * End job monitoring and record final metrics
   */
  endJobMonitoring(
    monitoringId: string,
    metrics: Omit<TranscriptionMetrics, "id" | "timestamp">,
  ): void {
    this.recordMetrics(metrics);

    console.log("Ended job monitoring:", {
      monitoringId,
      processingTime: metrics.processingTime,
      success: metrics.errorRate === 0,
    });
  }

  /**
   * Get performance summary for a time window
   */
  getPerformanceSummary(
    timeWindow: "1h" | "6h" | "24h" | "7d" = "24h",
  ): PerformanceSummary {
    const now = Date.now();
    let windowMs: number;

    switch (timeWindow) {
      case "1h":
        windowMs = 60 * 60 * 1000;
        break;
      case "6h":
        windowMs = 6 * 60 * 60 * 1000;
        break;
      case "24h":
        windowMs = 24 * 60 * 60 * 1000;
        break;
      case "7d":
        windowMs = 7 * 24 * 60 * 60 * 1000;
        break;
    }

    const cutoffTime = new Date(now - windowMs);
    const recentMetrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return this.createEmptySummary(timeWindow);
    }

    const successfulJobs = recentMetrics.filter((m) => m.errorRate === 0);
    const failedJobs = recentMetrics.filter((m) => m.errorRate > 0);

    // Calculate basic metrics
    const totalJobs = recentMetrics.length;
    const averageProcessingTime =
      successfulJobs.reduce((sum, m) => sum + m.processingTime, 0) /
        successfulJobs.length || 0;
    const averageQueueTime =
      recentMetrics.reduce((sum, m) => sum + m.queueTime, 0) /
      recentMetrics.length;
    const successRate = (successfulJobs.length / totalJobs) * 100;
    const errorRate = (failedJobs.length / totalJobs) * 100;

    // Calculate audio metrics
    const totalAudioSize = recentMetrics.reduce(
      (sum, m) => sum + m.audioSize,
      0,
    );
    const totalAudioDuration = recentMetrics.reduce(
      (sum, m) => sum + m.audioDuration,
      0,
    );
    const averageAudioSize = totalAudioSize / totalJobs / (1024 * 1024); // MB
    const averageAudioDuration = totalAudioDuration / totalJobs; // seconds

    // Calculate performance metrics
    const averageMemoryUsage =
      recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) /
      recentMetrics.length;
    const averageApiResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.apiResponseTime, 0) /
      recentMetrics.length;
    const averageRetryCount =
      recentMetrics.reduce((sum, m) => sum + m.retryCount, 0) /
      recentMetrics.length;

    // Calculate cost metrics
    const totalCost = recentMetrics.reduce(
      (sum, m) => sum + m.estimatedCost,
      0,
    );
    const averageCostPerJob = totalCost / totalJobs;
    const costEfficiency =
      totalAudioDuration > 0 ? totalCost / (totalAudioDuration / 60) : 0; // cost per minute

    // Calculate optimization metrics
    const chunkedJobs = recentMetrics.filter((m) => m.wasChunked);
    const chunkedJobsPercentage = (chunkedJobs.length / totalJobs) * 100;
    const averageConcurrency =
      recentMetrics.reduce((sum, m) => sum + m.concurrencyUsed, 0) /
      recentMetrics.length;
    const averageChunksPerJob =
      chunkedJobs.reduce((sum, m) => sum + m.chunkCount, 0) /
        chunkedJobs.length || 0;

    // Calculate quality metrics
    const jobsWithConfidence = recentMetrics.filter(
      (m) => m.confidence !== undefined,
    );
    const averageConfidence =
      jobsWithConfidence.reduce((sum, m) => sum + (m.confidence || 0), 0) /
        jobsWithConfidence.length || 0;
    const averageWordsPerMinute =
      recentMetrics.reduce(
        (sum, m) => sum + m.wordCount / (m.audioDuration / 60),
        0,
      ) / recentMetrics.length;

    // Calculate error breakdown
    const errorBreakdown: Record<string, number> = {};
    recentMetrics.forEach((m) => {
      m.errors.forEach((error) => {
        errorBreakdown[error.type] = (errorBreakdown[error.type] || 0) + 1;
      });
    });

    // Calculate trends
    const processingTimeTrend = this.calculateTrend(
      recentMetrics,
      "processingTime",
    );
    const errorRateTrend = this.calculateTrend(recentMetrics, "errorRate");
    const costEfficiencyTrend = this.calculateTrend(
      recentMetrics,
      "costPerMinute",
    );

    return {
      timeWindow,
      totalJobs,
      successfulJobs: successfulJobs.length,
      failedJobs: failedJobs.length,
      averageProcessingTime,
      averageQueueTime,
      successRate,
      errorRate,
      throughput: totalJobs / (windowMs / (1000 * 60 * 60)), // jobs per hour

      averageAudioSize,
      averageAudioDuration,
      totalAudioProcessed: totalAudioDuration / 60, // minutes

      averageMemoryUsage,
      averageApiResponseTime,
      averageRetryCount,

      totalCost,
      averageCostPerJob,
      costEfficiency,

      chunkedJobsPercentage,
      averageConcurrency,
      averageChunksPerJob,

      averageConfidence,
      averageWordsPerMinute,

      errorBreakdown,

      processingTimeTrend,
      errorRateTrend,
      costEfficiencyTrend,
    };
  }

  /**
   * Get current performance alerts
   */
  getAlerts(severity?: PerformanceAlert["severity"]): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter((alert) => alert.severity === severity);
    }
    return this.alerts;
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.getPerformanceSummary("24h");

    // Processing time recommendations
    if (
      summary.averageProcessingTime >
      this.thresholds.maxProcessingTime * 0.7
    ) {
      recommendations.push(
        "Consider enabling chunking for large audio files to reduce processing time",
      );
      recommendations.push(
        "Optimize audio format and quality for faster processing",
      );
    }

    // Error rate recommendations
    if (summary.errorRate > this.thresholds.maxErrorRate) {
      recommendations.push(
        "Review error logs and implement better error handling",
      );
      recommendations.push(
        "Consider increasing retry attempts for transient failures",
      );
    }

    // Memory usage recommendations
    if (summary.averageMemoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      recommendations.push("Optimize memory usage for large audio files");
      recommendations.push("Consider implementing streaming audio processing");
    }

    // Cost efficiency recommendations
    if (summary.costEfficiency > this.thresholds.maxCostPerMinute) {
      recommendations.push(
        "Optimize audio quality settings to balance cost and accuracy",
      );
      recommendations.push("Consider using more efficient audio formats");
    }

    // Concurrency recommendations
    if (summary.averageConcurrency < 2 && summary.totalJobs > 10) {
      recommendations.push(
        "Consider increasing concurrency for better throughput",
      );
    }

    // API performance recommendations
    if (
      summary.averageApiResponseTime >
      this.thresholds.maxApiResponseTime * 0.5
    ) {
      recommendations.push(
        "Monitor API performance and consider optimizing request patterns",
      );
    }

    return recommendations;
  }

  /**
   * Export performance data for analysis
   */
  exportData(format: "json" | "csv" = "json"): string {
    if (format === "csv") {
      return this.convertToCSV();
    }
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear old performance data
   */
  clearOldData(olderThan: "1h" | "6h" | "24h" | "7d" = "7d"): void {
    const now = Date.now();
    let cutoffMs: number;

    switch (olderThan) {
      case "1h":
        cutoffMs = 60 * 60 * 1000;
        break;
      case "6h":
        cutoffMs = 6 * 60 * 60 * 1000;
        break;
      case "24h":
        cutoffMs = 24 * 60 * 60 * 1000;
        break;
      case "7d":
        cutoffMs = 7 * 24 * 60 * 60 * 1000;
        break;
    }

    const cutoffTime = new Date(now - cutoffMs);
    const initialCount = this.metrics.length;

    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);
    this.alerts = this.alerts.filter((a) => a.timestamp >= cutoffTime);

    const clearedCount = initialCount - this.metrics.length;
    console.log(`Cleared ${clearedCount} old performance metrics`);
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log("Performance thresholds updated:", this.thresholds);
  }

  /**
   * Get current thresholds
   */
  getThresholds(): typeof this.thresholds {
    return { ...this.thresholds };
  }

  /**
   * Check for performance alerts and create them
   */
  private checkPerformanceAlerts(metrics: TranscriptionMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Processing time alert
    if (metrics.processingTime > this.thresholds.maxProcessingTime) {
      alerts.push({
        id: `alert_${Date.now()}_processing_time`,
        type: "performance",
        severity:
          metrics.processingTime > this.thresholds.maxProcessingTime * 1.5
            ? "critical"
            : "high",
        message: `Processing time exceeded threshold: ${Math.round(metrics.processingTime / 1000)}s`,
        timestamp: new Date(),
        metric: "processingTime",
        currentValue: metrics.processingTime,
        threshold: this.thresholds.maxProcessingTime,
        recommendation: "Consider enabling chunking or optimizing audio format",
      });
    }

    // Memory usage alert
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      alerts.push({
        id: `alert_${Date.now()}_memory_usage`,
        type: "memory",
        severity:
          metrics.memoryUsage > this.thresholds.maxMemoryUsage * 1.2
            ? "high"
            : "medium",
        message: `Memory usage exceeded threshold: ${Math.round(metrics.memoryUsage)}MB`,
        timestamp: new Date(),
        metric: "memoryUsage",
        currentValue: metrics.memoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
        recommendation:
          "Consider implementing streaming processing or reducing audio quality",
      });
    }

    // Error rate alert
    if (metrics.errorRate > this.thresholds.maxErrorRate) {
      alerts.push({
        id: `alert_${Date.now()}_error_rate`,
        type: "error_rate",
        severity:
          metrics.errorRate > this.thresholds.maxErrorRate * 2
            ? "critical"
            : "high",
        message: `Error rate exceeded threshold: ${Math.round(metrics.errorRate * 100)}%`,
        timestamp: new Date(),
        metric: "errorRate",
        currentValue: metrics.errorRate,
        threshold: this.thresholds.maxErrorRate,
        recommendation: "Review error logs and improve error handling",
      });
    }

    // API response time alert
    if (metrics.apiResponseTime > this.thresholds.maxApiResponseTime) {
      alerts.push({
        id: `alert_${Date.now()}_api_response_time`,
        type: "performance",
        severity: "medium",
        message: `API response time exceeded threshold: ${Math.round(metrics.apiResponseTime)}ms`,
        timestamp: new Date(),
        metric: "apiResponseTime",
        currentValue: metrics.apiResponseTime,
        threshold: this.thresholds.maxApiResponseTime,
        recommendation:
          "Monitor API performance and consider connection pooling",
      });
    }

    // Cost alert
    if (metrics.costPerMinute > this.thresholds.maxCostPerMinute) {
      alerts.push({
        id: `alert_${Date.now()}_cost`,
        type: "cost",
        severity: "medium",
        message: `Cost per minute exceeded threshold: $${metrics.costPerMinute.toFixed(3)}`,
        timestamp: new Date(),
        metric: "costPerMinute",
        currentValue: metrics.costPerMinute,
        threshold: this.thresholds.maxCostPerMinute,
        recommendation: "Optimize audio quality settings or model selection",
      });
    }

    // Add alerts to the list
    alerts.forEach((alert) => {
      this.alerts.push(alert);
      console.warn("Performance alert generated:", alert);
    });

    // Cleanup old alerts
    if (this.alerts.length > this.maxAlertsCount) {
      this.alerts = this.alerts.slice(-this.maxAlertsCount);
    }
  }

  /**
   * Calculate trend for a specific metric
   */
  private calculateTrend(
    metrics: TranscriptionMetrics[],
    metric: keyof TranscriptionMetrics,
  ): "improving" | "stable" | "degrading" {
    if (metrics.length < 10) return "stable";

    const recent = metrics.slice(-5);
    const older = metrics.slice(-10, -5);

    const recentAvg =
      recent.reduce((sum, m) => sum + (m[metric] as number), 0) / recent.length;
    const olderAvg =
      older.reduce((sum, m) => sum + (m[metric] as number), 0) / older.length;

    const changePercent = Math.abs((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercent < 5) return "stable";

    // For some metrics, lower is better (processing time, error rate, cost)
    const lowerIsBetter = [
      "processingTime",
      "errorRate",
      "costPerMinute",
      "memoryUsage",
    ].includes(metric as string);

    if (lowerIsBetter) {
      return recentAvg < olderAvg ? "improving" : "degrading";
    } else {
      return recentAvg > olderAvg ? "improving" : "degrading";
    }
  }

  /**
   * Create empty performance summary
   */
  private createEmptySummary(timeWindow: string): PerformanceSummary {
    return {
      timeWindow,
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      averageQueueTime: 0,
      successRate: 0,
      errorRate: 0,
      throughput: 0,
      averageAudioSize: 0,
      averageAudioDuration: 0,
      totalAudioProcessed: 0,
      averageMemoryUsage: 0,
      averageApiResponseTime: 0,
      averageRetryCount: 0,
      totalCost: 0,
      averageCostPerJob: 0,
      costEfficiency: 0,
      chunkedJobsPercentage: 0,
      averageConcurrency: 0,
      averageChunksPerJob: 0,
      averageConfidence: 0,
      averageWordsPerMinute: 0,
      errorBreakdown: {},
      processingTimeTrend: "stable",
      errorRateTrend: "stable",
      costEfficiencyTrend: "stable",
    };
  }

  /**
   * Convert metrics to CSV format
   */
  private convertToCSV(): string {
    if (this.metrics.length === 0) return "";

    const headers = Object.keys(this.metrics[0]).join(",");
    const rows = this.metrics.map((m) =>
      Object.values(m)
        .map((v) => (typeof v === "string" ? `"${v}"` : v))
        .join(","),
    );

    return [headers, ...rows].join("\n");
  }
}

// Export singleton instance for easy access
export const transcriptionPerformanceMonitor =
  TranscriptionPerformanceMonitor.getInstance();

// Export convenience functions
export const recordTranscriptionMetrics = (
  metrics: Omit<TranscriptionMetrics, "id" | "timestamp">,
) => transcriptionPerformanceMonitor.recordMetrics(metrics);

export const getTranscriptionPerformanceSummary = (
  timeWindow?: "1h" | "6h" | "24h" | "7d",
) => transcriptionPerformanceMonitor.getPerformanceSummary(timeWindow);

export const getTranscriptionAlerts = (
  severity?: PerformanceAlert["severity"],
) => transcriptionPerformanceMonitor.getAlerts(severity);

export const getOptimizationRecommendations = () =>
  transcriptionPerformanceMonitor.getOptimizationRecommendations();
