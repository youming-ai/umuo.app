/**
 * Performance monitoring infrastructure for transcription optimization
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";
import type {
  PerformanceMetrics,
  TranscriptionJob,
} from "@/types/transcription";
import type { MobilePerformanceMetrics } from "@/types/mobile";

export type MetricCategory = "transcription" | "progress" | "mobile" | "ui";
export type MetricValue = number | string | boolean;

export interface PerformanceDataPoint {
  name: string;
  value: MetricValue;
  category: MetricCategory;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PerformanceThreshold {
  name: string;
  category: MetricCategory;
  threshold: number;
  operator: "lt" | "lte" | "gt" | "gte";
  unit: string;
  description: string;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceDataPoint[]> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private isEnabled: boolean = true;

  // Performance thresholds based on constitutional requirements
  private readonly DEFAULT_THRESHOLDS: PerformanceThreshold[] = [
    {
      name: "transcription-processing-time",
      category: "transcription",
      threshold: 60000, // 60 seconds for 5-minute file
      operator: "lte",
      unit: "ms",
      description: "Transcription processing time should be under 60 seconds",
    },
    {
      name: "ui-response-time",
      category: "ui",
      threshold: 300,
      operator: "lte",
      unit: "ms",
      description: "UI response time should be under 300ms",
    },
    {
      name: "progress-update-frequency",
      category: "progress",
      threshold: 2000,
      operator: "lte",
      unit: "ms",
      description: "Progress updates should be within 2 seconds",
    },
    {
      name: "touch-response-time",
      category: "mobile",
      threshold: 100,
      operator: "lte",
      unit: "ms",
      description: "Touch interactions should respond within 100ms",
    },
  ];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private constructor() {
    this.initializeThresholds();
    this.setupObservers();
  }

  /**
   * Initialize performance thresholds
   */
  private initializeThresholds(): void {
    this.DEFAULT_THRESHOLDS.forEach((threshold) => {
      this.thresholds.set(`${threshold.category}-${threshold.name}`, threshold);
    });
  }

  /**
   * Setup performance observers for Web Vitals
   */
  private setupObservers(): void {
    if (typeof window === "undefined") return;

    // First Contentful Paint
    if ("PerformanceObserver" in window) {
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === "first-contentful-paint") {
              this.recordMetric(
                "first-contentful-paint",
                entry.startTime,
                "ui",
                {
                  unit: "ms",
                },
              );
            }
          }
        });
        fcpObserver.observe({ entryTypes: ["paint"] });
        this.observers.set("fcp", fcpObserver);
      } catch (error) {
        console.warn("FCP observer not supported:", error);
      }

      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.recordMetric(
              "largest-contentful-paint",
              lastEntry.startTime,
              "ui",
              {
                unit: "ms",
              },
            );
          }
        });
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
        this.observers.set("lcp", lcpObserver);
      } catch (error) {
        console.warn("LCP observer not supported:", error);
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === "first-input") {
              this.recordMetric(
                "first-input-delay",
                entry.processingStart - entry.startTime,
                "ui",
                {
                  unit: "ms",
                },
              );
            }
          }
        });
        fidObserver.observe({ entryTypes: ["first-input"] });
        this.observers.set("fid", fidObserver);
      } catch (error) {
        console.warn("FID observer not supported:", error);
      }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              this.recordMetric("cumulative-layout-shift", entry.value, "ui", {
                unit: "score",
              });
            }
          }
        });
        clsObserver.observe({ entryTypes: ["layout-shift"] });
        this.observers.set("cls", clsObserver);
      } catch (error) {
        console.warn("CLS observer not supported:", error);
      }
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: MetricValue,
    category: MetricCategory,
    options: {
      tags?: Record<string, string>;
      metadata?: Record<string, any>;
    } = {},
  ): void {
    if (!this.isEnabled) return;

    const dataPoint: PerformanceDataPoint = {
      name,
      value,
      category,
      timestamp: new Date(),
      tags: options.tags,
      metadata: options.metadata,
    };

    const key = `${category}-${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push(dataPoint);

    // Keep only last 100 data points per metric
    const metricData = this.metrics.get(key)!;
    if (metricData.length > 100) {
      metricData.splice(0, metricData.length - 100);
    }

    // Check against thresholds
    this.checkThreshold(name, category, value);
  }

  /**
   * Record transcription performance metrics
   */
  recordTranscriptionMetrics(
    job: TranscriptionJob,
    audioSize: number,
    audioDuration: number,
  ): void {
    this.recordMetric(
      "transcription-processing-time",
      job.processingTime,
      "transcription",
      {
        tags: {
          model: job.model,
          status: job.status,
          language: job.language,
        },
        metadata: {
          jobId: job.id,
          fileId: job.fileId,
          audioSize,
          audioDuration,
          isChunked: job.isChunked,
          totalChunks: job.totalChunks,
        },
      },
    );

    this.recordMetric(
      "transcription-queue-time",
      job.queueTime,
      "transcription",
      {
        tags: {
          status: job.status,
        },
        metadata: {
          jobId: job.id,
          fileId: job.fileId,
        },
      },
    );

    this.recordMetric(
      "transcription-speed",
      audioDuration / (job.processingTime / 1000),
      "transcription",
      {
        unit: "seconds/second",
        metadata: {
          jobId: job.id,
          fileId: job.fileId,
        },
      },
    );

    // Calculate cost (rough estimation)
    const cost = this.estimateTranscriptionCost(audioDuration, job.model);
    if (cost > 0) {
      this.recordMetric("transcription-cost", cost, "transcription", {
        unit: "USD",
        metadata: {
          jobId: job.id,
          fileId: job.fileId,
          model: job.model,
          duration: audioDuration,
        },
      });
    }
  }

  /**
   * Record mobile performance metrics
   */
  recordMobileMetrics(metrics: MobilePerformanceMetrics): void {
    this.recordMetric(
      "touch-response-time",
      metrics.touchResponseTime,
      "mobile",
      {
        tags: {
          deviceType: metrics.deviceType,
          networkType: metrics.networkType,
        },
        metadata: {
          batteryLevel: metrics.batteryLevel,
          isLowPowerMode: metrics.isLowPowerMode,
        },
      },
    );

    this.recordMetric("memory-usage", metrics.memoryUsage, "mobile", {
      unit: "MB",
      tags: {
        deviceType: metrics.deviceType,
      },
    });

    this.recordMetric("network-speed", metrics.networkSpeed, "mobile", {
      unit: "Mbps",
      tags: {
        networkType: metrics.networkType,
      },
    });
  }

  /**
   * Record Web Vitals metrics
   */
  recordWebVitals(metrics: {
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
  }): void {
    if (metrics.fcp) {
      this.recordMetric("first-contentful-paint", metrics.fcp, "ui", {
        unit: "ms",
      });
    }
    if (metrics.lcp) {
      this.recordMetric("largest-contentful-paint", metrics.lcp, "ui", {
        unit: "ms",
      });
    }
    if (metrics.fid) {
      this.recordMetric("first-input-delay", metrics.fid, "ui", { unit: "ms" });
    }
    if (metrics.cls) {
      this.recordMetric("cumulative-layout-shift", metrics.cls, "ui", {
        unit: "score",
      });
    }
    if (metrics.ttfb) {
      this.recordMetric("time-to-first-byte", metrics.ttfb, "ui", {
        unit: "ms",
      });
    }
  }

  /**
   * Check if a metric violates any thresholds
   */
  private checkThreshold(
    name: string,
    category: MetricCategory,
    value: MetricValue,
  ): void {
    const threshold = this.thresholds.get(`${category}-${name}`);
    if (!threshold || typeof value !== "number") return;

    let violatesThreshold = false;
    switch (threshold.operator) {
      case "lt":
        violatesThreshold = value < threshold.threshold;
        break;
      case "lte":
        violatesThreshold = value <= threshold.threshold;
        break;
      case "gt":
        violatesThreshold = value > threshold.threshold;
        break;
      case "gte":
        violatesThreshold = value >= threshold.threshold;
        break;
    }

    if (violatesThreshold) {
      console.warn(
        `Performance threshold violated: ${name} (${value}${threshold.unit}) exceeds threshold of ${threshold.threshold}${threshold.unit}`,
      );

      // You could emit this to an analytics service
      this.emitThresholdViolation(threshold, value);
    }
  }

  /**
   * Emit threshold violation (placeholder for analytics integration)
   */
  private emitThresholdViolation(
    threshold: PerformanceThreshold,
    actualValue: MetricValue,
  ): void {
    // This could be integrated with your analytics service
    // For example: analytics.track('performance_threshold_violation', { threshold, actualValue });
    console.warn("Performance threshold violation detected:", {
      threshold: threshold.name,
      category: threshold.category,
      threshold: threshold.threshold,
      operator: threshold.operator,
      unit: threshold.unit,
      actualValue,
      description: threshold.description,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get metrics for a specific category
   */
  getMetrics(
    category: MetricCategory,
    timeWindow?: number,
  ): PerformanceDataPoint[] {
    const results: PerformanceDataPoint[] = [];

    for (const [key, dataPoints] of this.metrics.entries()) {
      if (key.startsWith(`${category}-`)) {
        const filteredData = timeWindow
          ? dataPoints.filter(
              (point) => Date.now() - point.timestamp.getTime() <= timeWindow,
            )
          : dataPoints;

        results.push(...filteredData);
      }
    }

    return results.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  /**
   * Get average value for a metric
   */
  getAverageMetric(
    name: string,
    category: MetricCategory,
    timeWindow?: number,
  ): number {
    const metrics = this.getMetrics(category, timeWindow);
    const categoryMetrics = metrics.filter((m) => m.name === name);

    if (categoryMetrics.length === 0) return 0;

    const numericValues = categoryMetrics
      .map((m) => m.value)
      .filter((v): v is number => !isNaN(v));

    if (numericValues.length === 0) return 0;

    return (
      numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
    );
  }

  /**
   * Estimate transcription cost (rough calculation)
   */
  private estimateTranscriptionCost(duration: number, model: string): number {
    // Groq Whisper pricing (example: $0.006 per minute)
    const pricePerMinute = 0.006;
    return (duration / 60) * pricePerMinute;
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Clear metrics for a specific category
   */
  clearCategoryMetrics(category: MetricCategory): void {
    for (const [key] of this.metrics.keys()) {
      if (key.startsWith(`${category}-`)) {
        this.metrics.delete(key);
      }
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): Record<string, PerformanceDataPoint[]> {
    const exported: Record<string, PerformanceDataPoint[]> = {};

    for (const [key, dataPoints] of this.metrics.entries()) {
      exported[key] = [...dataPoints];
    }

    return exported;
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export Web Vitals measurement function
export async function measureWebVitals(): Promise<{
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
}> {
  try {
    const metrics = {
      fcp: await getFCP(),
      lcp: await getLCP(),
      fid: await getFID(),
      cls: await getCLS(),
      ttfb: await getTTFB(),
    };

    performanceMonitor.recordWebVitals(metrics);
    return metrics;
  } catch (error) {
    console.error("Failed to measure Web Vitals:", error);
    return {};
  }
}
