/**
 * Performance monitoring utilities for transcription optimization
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: PerformanceMetric[];
  duration?: number;
  operation?: string;
  jobId?: string;
  fileId?: number;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  error: number;
  unit: string;
}

export interface PerformanceAlert {
  metric: string;
  severity: 'warning' | 'error';
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

/**
 * Performance monitoring class for tracking transcription metrics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private snapshots: PerformanceSnapshot[] = [];
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private alerts: PerformanceAlert[] = [];
  private maxSnapshots: number = 1000;
  private maxMetricsPerKey: number = 100;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private constructor() {
    this.initializeDefaultThresholds();
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeDefaultThresholds(): void {
    const defaults: PerformanceThreshold[] = [
      // Transcription performance
      { metric: 'transcription_time', warning: 60000, error: 120000, unit: 'ms' },
      { metric: 'transcription_speed', warning: 0.5, error: 0.3, unit: 'x_realtime' },

      // UI performance
      { metric: 'ui_response_time', warning: 200, error: 500, unit: 'ms' },
      { metric: 'first_contentful_paint', warning: 2000, error: 4000, unit: 'ms' },
      { metric: 'largest_contentful_paint', warning: 2500, error: 4000, unit: 'ms' },
      { metric: 'first_input_delay', warning: 100, error: 300, unit: 'ms' },
      { metric: 'cumulative_layout_shift', warning: 0.1, error: 0.25, unit: '' },

      // Upload performance
      { metric: 'upload_speed', warning: 1, error: 0.5, unit: 'mb/s' },
      { metric: 'upload_time', warning: 10000, error: 30000, unit: 'ms' },

      // Memory usage
      { metric: 'memory_usage', warning: 100, error: 200, unit: 'mb' },

      // Network performance
      { metric: 'network_latency', warning: 200, error: 1000, unit: 'ms' },
      { metric: 'api_response_time', warning: 1000, error: 5000, unit: 'ms' }
    ];

    defaults.forEach(threshold => {
      this.thresholds.set(threshold.metric, threshold);
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
      metadata
    };

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricList = this.metrics.get(name)!;
    metricList.push(metric);

    // Keep only recent metrics
    if (metricList.length > this.maxMetricsPerKey) {
      this.metrics.set(name, metricList.slice(-this.maxMetricsPerKey));
    }

    // Check against thresholds
    this.checkThresholds(metric);
  }

  /**
   * Record metrics for an operation
   */
  recordOperationMetrics(
    operation: string,
    metrics: Array<{ name: string; value: number; unit: string; tags?: Record<string, string> }>,
    metadata?: Record<string, any>
  ): void {
    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      operation,
      metrics: metrics.map(m => ({
        name: m.name,
        value: m.value,
        unit: m.unit,
        timestamp: new Date(),
        tags: m.tags,
        metadata
      })),
      metadata
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    // Record individual metrics
    metrics.forEach(m => {
      this.recordMetric(m.name, m.value, m.unit, m.tags, metadata);
    });
  }

  /**
   * Start measuring an operation
   */
  startTimer(operation: string, tags?: Record<string, string>): string {
    const timerId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.recordMetric(`${operation}_start`, Date.now(), 'ms', {
      ...tags,
      phase: 'start'
    });

    return timerId;
  }

  /**
   * End measuring an operation
   */
  endTimer(timerId: string, tags?: Record<string, string>): number {
    const [operation] = timerId.split('_');

    // Find start metric
    const startMetrics = this.metrics.get(`${operation}_start`) || [];
    const startMetric = startMetrics[startMetrics.length - 1];

    if (!startMetric) {
      console.warn(`No start metric found for timer: ${timerId}`);
      return 0;
    }

    const duration = Date.now() - startMetric.value;

    this.recordMetric(`${operation}_duration`, duration, 'ms', {
      ...tags,
      phase: 'end'
    });

    return duration;
  }

  /**
   * Measure async function performance
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTimer(operation, { ...tags, type: 'async' });

    try {
      const result = await fn();

      this.endTimer(timerId, { ...tags, type: 'async', status: 'success' });

      // Record success metrics
      this.recordMetric(`${operation}_success`, 1, 'count', {
        ...tags,
        ...metadata
      });

      return result;
    } catch (error) {
      this.endTimer(timerId, { ...tags, type: 'async', status: 'error' });

      // Record error metrics
      this.recordMetric(`${operation}_error`, 1, 'count', {
        ...tags,
        ...metadata,
        error_type: error.constructor.name,
        error_message: error.message
      });

      throw error;
    }
  }

  /**
   * Get metrics for a specific metric name
   */
  getMetrics(name: string, timeWindow?: number): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];

    if (!timeWindow) {
      return metrics;
    }

    const cutoff = Date.now() - timeWindow;
    return metrics.filter(m => m.timestamp.getTime() >= cutoff);
  }

  /**
   * Get performance snapshots
   */
  getSnapshots(operation?: string, timeWindow?: number): PerformanceSnapshot[] {
    let snapshots = this.snapshots;

    // Filter by operation if specified
    if (operation) {
      snapshots = snapshots.filter(s => s.operation === operation);
    }

    // Filter by time window if specified
    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      snapshots = snapshots.filter(s => s.timestamp.getTime() >= cutoff);
    }

    return snapshots;
  }

  /**
   * Get recent alerts
   */
  getAlerts(timeWindow?: number): PerformanceAlert[] {
    let alerts = this.alerts;

    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      alerts = alerts.filter(a => a.timestamp.getTime() >= cutoff);
    }

    return alerts;
  }

  /**
   * Get performance statistics
   */
  getStatistics(metricName: string, timeWindow?: number): {
    count: number;
    min: number;
    max: number;
    average: number;
    median: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.getMetrics(metricName, timeWindow);

    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / count;
    const median = values[Math.floor(count / 2)];

    const p95Index = Math.ceil(count * 0.95) - 1;
    const p99Index = Math.ceil(count * 0.99) - 1;

    return {
      count,
      min: values[0],
      max: values[count - 1],
      average,
      median,
      p95: values[p95Index],
      p99: values[p99Index]
    };
  }

  /**
   * Check metrics against thresholds and create alerts
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);

    if (!threshold) {
      return;
    }

    let severity: 'warning' | 'error' | null = null;
    if (metric.value >= threshold.error) {
      severity = 'error';
    } else if (metric.value >= threshold.warning) {
      severity = 'warning';
    }

    if (severity) {
      const alert: PerformanceAlert = {
        metric: metric.name,
        severity,
        value: metric.value,
        threshold: threshold[`${severity}`],
        message: this.createAlertMessage(metric, threshold, severity),
        timestamp: new Date(),
        tags: metric.tags
      };

      this.alerts.push(alert);

      // Keep only recent alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }

      // Log alert
      console.warn(`Performance Alert [${severity.toUpperCase()}]: ${alert.message}`);
    }
  }

  /**
   * Create alert message
   */
  private createAlertMessage(
    metric: PerformanceMetric,
    threshold: PerformanceThreshold,
    severity: 'warning' | 'error'
  ): string {
    const thresholdValue = threshold[severity];
    const severityText = severity === 'error' ? 'exceeded' : 'approaching';

    return `${metric.name} ${severityText} threshold: ${metric.value}${metric.unit} (threshold: ${thresholdValue}${metric.unit})`;
  }

  /**
   * Clear old data
   */
  clearOldData(olderThan?: number): void {
    const cutoff = olderThan ? Date.now() - olderThan : Date.now() - 24 * 60 * 60 * 1000; // 24 hours default

    // Clear old metrics
    for (const [key, metricList] of this.metrics.entries()) {
      const filteredMetrics = metricList.filter(m => m.timestamp.getTime() >= cutoff);
      this.metrics.set(key, filteredMetrics);
    }

    // Clear old snapshots
    this.snapshots = this.snapshots.filter(s => s.timestamp.getTime() >= cutoff);

    // Clear old alerts
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() >= cutoff);
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([key, values]) => [key, values])
      ),
      snapshots: this.snapshots,
      alerts: this.alerts
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format implementation could be added here
    throw new Error('CSV export not implemented');
  }
}

/**
 * Enhanced performance monitoring with async measurement
 */
export const measureAsync = <T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>,
  metadata?: Record<string, any>
): Promise<T> => {
  const monitor = PerformanceMonitor.getInstance();
  return monitor.measureAsync(name, fn, tags, metadata);
};

/**
 * Create a performance timer
 */
export const createTimer = (name: string, tags?: Record<string, string>) => {
  const monitor = PerformanceMonitor.getInstance();
  return monitor.startTimer(name, tags);
};

/**
 * End a performance timer
 */
export const endTimer = (timerId: string, tags?: Record<string, string>) => {
  const monitor = PerformanceMonitor.getInstance();
  return monitor.endTimer(timerId, tags);
};

/**
 * Record a performance metric
 */
export const recordMetric = (
  name: string,
  value: number,
  unit: string,
  tags?: Record<string, string>,
  metadata?: Record<string, any>
): void => {
  const monitor = PerformanceMonitor.getInstance();
  monitor.recordMetric(name, value, unit, tags, metadata);
};
