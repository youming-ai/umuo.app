/**
 * Real-time Performance Monitoring System
 * Provides WebSocket and polling-based real-time data collection for the performance dashboard
 */

import {
  PerformanceMonitor,
  PerformanceMetric,
  PerformanceAlert
} from "@/lib/utils/performance-monitor";
import type {
  PerformanceMetricCategory,
  RealtimeMonitoringConfig,
  PerformanceEvent,
  PerformanceAPIResponse
} from "@/types/admin/performance-dashboard";

export interface RealtimeMonitorConfig {
  enabled: boolean;
  websocket?: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
  polling?: {
    interval: number;
    enabledMetrics: string[];
  };
  batchSize: number;
  bufferTime: number;
}

export interface MonitoringEventHandlers {
  onMetricUpdate?: (metric: PerformanceMetric) => void;
  onAlertCreated?: (alert: PerformanceAlert) => void;
  onAlertResolved?: (alertId: string) => void;
  onThresholdExceeded?: (metric: PerformanceMetric, threshold: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

export interface MetricBuffer {
  metrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
  maxSize: number;
  flushInterval: number;
  lastFlush: number;
}

/**
 * Real-time Performance Monitor
 * Handles WebSocket connections and polling for live performance data
 */
export class RealtimePerformanceMonitor {
  private static instance: RealtimePerformanceMonitor;
  private config: RealtimeMonitorConfig;
  private handlers: MonitoringEventHandlers = {};
  private isRunning = false;
  private reconnectAttempts = 0;
  private websocket?: WebSocket;
  private pollingInterval?: NodeJS.Timeout;
  private buffer: MetricBuffer;
  private performanceMonitor: PerformanceMonitor;

  private constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.buffer = {
      metrics: [],
      alerts: [],
      maxSize: 1000,
      flushInterval: 5000,
      lastFlush: Date.now()
    };
    this.config = this.getDefaultConfig();
  }

  static getInstance(): RealtimePerformanceMonitor {
    if (!RealtimePerformanceMonitor.instance) {
      RealtimePerformanceMonitor.instance = new RealtimePerformanceMonitor();
    }
    return RealtimePerformanceMonitor.instance;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): RealtimeMonitorConfig {
    return {
      enabled: true,
      polling: {
        interval: 5000,
        enabledMetrics: [
          'memory_usage',
          'cpu_usage',
          'network_latency',
          'transcription_duration',
          'database_operation_duration',
          'player_interaction_time'
        ]
      },
      batchSize: 50,
      bufferTime: 1000
    };
  }

  /**
   * Configure the real-time monitor
   */
  configure(config: Partial<RealtimeMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.isRunning) {
      this.restart();
    }
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: MonitoringEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Start real-time monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Real-time monitoring is already running');
      return;
    }

    if (!this.config.enabled) {
      console.warn('Real-time monitoring is disabled');
      return;
    }

    try {
      this.isRunning = true;
      this.reconnectAttempts = 0;

      // Try WebSocket first, fallback to polling
      if (this.config.websocket) {
        await this.startWebSocket();
      } else {
        this.startPolling();
      }

      console.log('Real-time monitoring started');
    } catch (error) {
      console.error('Failed to start real-time monitoring:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Stop real-time monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }

    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    // Flush remaining buffer
    this.flushBuffer();

    console.log('Real-time monitoring stopped');
  }

  /**
   * Restart monitoring
   */
  async restart(): Promise<void> {
    this.stop();
    await this.start();
  }

  /**
   * Start WebSocket connection
   */
  private async startWebSocket(): Promise<void> {
    if (!this.config.websocket) {
      throw new Error('WebSocket configuration not provided');
    }

    const { url, reconnectInterval, maxReconnectAttempts } = this.config.websocket;

    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(url);

        this.websocket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.handlers.onConnectionChange?.(true);
          this.startHeartbeat();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event.data);
        };

        this.websocket.onclose = () => {
          console.log('WebSocket disconnected');
          this.handlers.onConnectionChange?.(false);

          if (this.isRunning && this.reconnectAttempts < maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${maxReconnectAttempts})`);

            setTimeout(() => {
              this.startWebSocket().catch(() => {
                // Fallback to polling if WebSocket fails
                console.warn('WebSocket reconnection failed, falling back to polling');
                this.startPolling();
              });
            }, reconnectInterval);
          } else if (this.reconnectAttempts >= maxReconnectAttempts) {
            console.warn('Max reconnection attempts reached, falling back to polling');
            this.startPolling();
          }
        };

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start polling
   */
  private startPolling(): void {
    if (!this.config.polling) {
      throw new Error('Polling configuration not provided');
    }

    const { interval, enabledMetrics } = this.config.polling;

    console.log('Starting polling for metrics:', enabledMetrics);

    this.pollingInterval = setInterval(async () => {
      try {
        await this.collectMetrics(enabledMetrics);
      } catch (error) {
        this.handleError(error as Error);
      }
    }, interval);

    // Initial collection
    this.collectMetrics(enabledMetrics).catch(this.handleError);
  }

  /**
   * Collect metrics via polling
   */
  private async collectMetrics(enabledMetrics: string[]): Promise<void> {
    const timestamp = new Date();
    const metrics: PerformanceMetric[] = [];

    for (const metricName of enabledMetrics) {
      try {
        const metric = await this.collectMetric(metricName, timestamp);
        if (metric) {
          metrics.push(metric);
        }
      } catch (error) {
        console.error(`Failed to collect metric ${metricName}:`, error);
      }
    }

    // Add metrics to buffer
    this.addToBuffer({ metrics, alerts: [] });
  }

  /**
   * Collect a single metric
   */
  private async collectMetric(metricName: string, timestamp: Date): Promise<PerformanceMetric | null> {
    switch (metricName) {
      case 'memory_usage':
        return this.collectMemoryMetric(timestamp);
      case 'cpu_usage':
        return this.collectCPUMetric(timestamp);
      case 'network_latency':
        return this.collectNetworkLatencyMetric(timestamp);
      case 'transcription_duration':
        return this.collectTranscriptionMetric(timestamp);
      case 'database_operation_duration':
        return this.collectDatabaseMetric(timestamp);
      case 'player_interaction_time':
        return this.collectPlayerMetric(timestamp);
      default:
        return null;
    }
  }

  /**
   * Collect memory usage metric
   */
  private collectMemoryMetric(timestamp: Date): PerformanceMetric | null {
    const memory = (performance as any).memory;
    if (!memory) return null;

    const used = memory.usedJSHeapSize / 1024 / 1024; // MB
    const total = memory.jsHeapSizeLimit / 1024 / 1024; // MB
    const usagePercentage = (used / total) * 100;

    return {
      id: `memory_${timestamp.getTime()}`,
      name: 'Memory Usage',
      value: usagePercentage,
      unit: '%',
      category: 'memory' as PerformanceMetricCategory,
      status: this.getMetricStatus(usagePercentage, { excellent: 30, good: 60, fair: 80 }),
      trend: 'stable',
      timestamp,
      metadata: {
        usedMB: used,
        totalMB: total,
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize
      }
    };
  }

  /**
   * Collect CPU usage metric (approximation)
   */
  private collectCPUMetric(timestamp: Date): PerformanceMetric {
    // Since direct CPU monitoring isn't available in browsers, we use performance timing
    const start = performance.now();

    // Simulate some work to measure CPU performance
    const workStart = performance.now();
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.random();
    }
    const workEnd = performance.now();

    const workTime = workEnd - workStart;
    const totalTime = performance.now() - start;
    const cpuUsage = (workTime / totalTime) * 100;

    return {
      id: `cpu_${timestamp.getTime()}`,
      name: 'CPU Usage',
      value: Math.min(cpuUsage, 100),
      unit: '%',
      category: 'system' as PerformanceMetricCategory,
      status: this.getMetricStatus(cpuUsage, { excellent: 20, good: 50, fair: 80 }),
      trend: 'stable',
      timestamp,
      metadata: {
        workTime,
        totalTime,
        cores: navigator.hardwareConcurrency || 1
      }
    };
  }

  /**
   * Collect network latency metric
   */
  private async collectNetworkLatencyMetric(timestamp: Date): Promise<PerformanceMetric> {
    const startTime = performance.now();

    try {
      // Use a lightweight endpoint to measure latency
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      const latency = performance.now() - startTime;
      const connection = (navigator as any).connection;

      return {
        id: `network_${timestamp.getTime()}`,
        name: 'Network Latency',
        value: latency,
        unit: 'ms',
        category: 'network' as PerformanceMetricCategory,
        status: this.getMetricStatus(latency, { excellent: 50, good: 100, fair: 200 }),
        trend: 'stable',
        timestamp,
        metadata: {
          statusCode: response.status,
          effectiveType: connection?.effectiveType,
          downlink: connection?.downlink
        }
      };
    } catch (error) {
      // Network error - return high latency
      return {
        id: `network_${timestamp.getTime()}`,
        name: 'Network Latency',
        value: 9999,
        unit: 'ms',
        category: 'network' as PerformanceMetricCategory,
        status: 'critical' as const,
        trend: 'stable',
        timestamp,
        metadata: {
          error: error instanceof Error ? error.message : 'Network error',
          offline: !navigator.onLine
        }
      };
    }
  }

  /**
   * Collect transcription performance metric
   */
  private collectTranscriptionMetric(timestamp: Date): PerformanceMetric | null {
    const stats = this.performanceMonitor.getStatistics('transcription_duration', 300000); // Last 5 minutes

    if (!stats || stats.count === 0) {
      return null;
    }

    return {
      id: `transcription_${timestamp.getTime()}`,
      name: 'Transcription Duration',
      value: stats.average,
      unit: 'ms',
      category: 'transcription' as PerformanceMetricCategory,
      status: this.getMetricStatus(stats.average, { excellent: 10000, good: 30000, fair: 60000 }),
      trend: 'stable',
      timestamp,
      metadata: {
        count: stats.count,
        min: stats.min,
        max: stats.max,
        p95: stats.p95
      }
    };
  }

  /**
   * Collect database performance metric
   */
  private collectDatabaseMetric(timestamp: Date): PerformanceMetric | null {
    const stats = this.performanceMonitor.getStatistics('database_operation_duration', 300000);

    if (!stats || stats.count === 0) {
      return null;
    }

    return {
      id: `database_${timestamp.getTime()}`,
      name: 'Database Operation Duration',
      value: stats.average,
      unit: 'ms',
      category: 'database' as PerformanceMetricCategory,
      status: this.getMetricStatus(stats.average, { excellent: 10, good: 50, fair: 100 }),
      trend: 'stable',
      timestamp,
      metadata: {
        count: stats.count,
        min: stats.min,
        max: stats.max,
        operationsPerSecond: stats.count / 300 // Rough estimate
      }
    };
  }

  /**
   * Collect player interaction metric
   */
  private collectPlayerMetric(timestamp: Date): PerformanceMetric | null {
    const stats = this.performanceMonitor.getStatistics('player_interaction_time', 300000);

    if (!stats || stats.count === 0) {
      return null;
    }

    return {
      id: `player_${timestamp.getTime()}`,
      name: 'Player Interaction Time',
      value: stats.average,
      unit: 'ms',
      category: 'player' as PerformanceMetricCategory,
      status: this.getMetricStatus(stats.average, { excellent: 50, good: 100, fair: 200 }),
      trend: 'stable',
      timestamp,
      metadata: {
        count: stats.count,
        min: stats.min,
        max: stats.max
      }
    };
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(data: string): void {
    try {
      const event: PerformanceEvent = JSON.parse(data);

      switch (event.type) {
        case 'metric_update':
          if (event.data) {
            this.addToBuffer({ metrics: [event.data], alerts: [] });
          }
          break;

        case 'alert_created':
          if (event.data) {
            this.addToBuffer({ metrics: [], alerts: [event.data] });
            this.handlers.onAlertCreated?.(event.data);
          }
          break;

        case 'alert_resolved':
          if (event.data?.id) {
            this.handlers.onAlertResolved?.(event.data.id);
          }
          break;

        case 'threshold_exceeded':
          if (event.data?.metric && event.data?.threshold) {
            this.handlers.onThresholdExceeded?.(event.data.metric, event.data.threshold);
          }
          break;

        default:
          console.warn('Unknown WebSocket event type:', event.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Add data to buffer
   */
  private addToBuffer(data: { metrics: PerformanceMetric[]; alerts: PerformanceAlert[] }): void {
    // Add metrics
    this.buffer.metrics.push(...data.metrics);

    // Add alerts
    this.buffer.alerts.push(...data.alerts);

    // Check if buffer should be flushed
    const now = Date.now();
    const totalItems = this.buffer.metrics.length + this.buffer.alerts.length;

    if (totalItems >= this.config.batchSize ||
        now - this.buffer.lastFlush >= this.config.bufferTime) {
      this.flushBuffer();
    }

    // Limit buffer size
    if (this.buffer.metrics.length > this.buffer.maxSize) {
      this.buffer.metrics = this.buffer.metrics.slice(-this.buffer.maxSize);
    }

    if (this.buffer.alerts.length > this.buffer.maxSize) {
      this.buffer.alerts = this.buffer.alerts.slice(-this.buffer.maxSize);
    }
  }

  /**
   * Flush buffer to handlers
   */
  private flushBuffer(): void {
    if (this.buffer.metrics.length === 0 && this.buffer.alerts.length === 0) {
      return;
    }

    // Process metrics
    this.buffer.metrics.forEach(metric => {
      this.handlers.onMetricUpdate?.(metric);

      // Check for threshold violations
      this.checkThresholds(metric);
    });

    // Process alerts
    this.buffer.alerts.forEach(alert => {
      this.handlers.onAlertCreated?.(alert);
    });

    // Clear buffer
    this.buffer.metrics = [];
    this.buffer.alerts = [];
    this.buffer.lastFlush = Date.now();
  }

  /**
   * Check metric against thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    // Get threshold for this metric
    const threshold = this.getThresholdForMetric(metric.name, metric.category);

    if (threshold && metric.value > threshold) {
      this.handlers.onThresholdExceeded?.(metric, threshold);

      // Create alert
      const alert: PerformanceAlert = {
        metric: metric.name,
        severity: 'error',
        value: metric.value,
        threshold,
        message: `${metric.name} exceeded threshold: ${metric.value}${metric.unit} (threshold: ${threshold}${metric.unit})`,
        timestamp: new Date()
      };

      this.buffer.alerts.push(alert);
    }
  }

  /**
   * Get threshold for a metric
   */
  private getThresholdForMetric(metricName: string, category: PerformanceMetricCategory): number | null {
    const thresholds: Record<string, number> = {
      'Memory Usage': 80,
      'CPU Usage': 90,
      'Network Latency': 500,
      'Transcription Duration': 60000,
      'Database Operation Duration': 200,
      'Player Interaction Time': 300
    };

    return thresholds[metricName] || null;
  }

  /**
   * Get metric status from value
   */
  private getMetricStatus(
    value: number,
    thresholds: { excellent: number; good: number; fair: number }
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (value <= thresholds.excellent) return 'excellent';
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.fair) return 'fair';
    return 'poor';
  }

  /**
   * Start heartbeat to keep WebSocket alive
   */
  private startHeartbeat(): void {
    if (!this.websocket) return;

    const heartbeatInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'heartbeat' }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('Real-time monitoring error:', error);
    this.handlers.onError?.(error);

    // Try to recover
    if (this.isRunning) {
      setTimeout(() => {
        this.restart().catch(err => {
          console.error('Failed to restart monitoring:', err);
        });
      }, 5000);
    }
  }

  /**
   * Get current buffer status
   */
  getBufferStatus(): {
    metricsCount: number;
    alertsCount: number;
    lastFlush: number;
    isRunning: boolean;
  } {
    return {
      metricsCount: this.buffer.metrics.length,
      alertsCount: this.buffer.alerts.length,
      lastFlush: this.buffer.lastFlush,
      isRunning: this.isRunning
    };
  }

  /**
   * Force flush buffer
   */
  forceFlush(): void {
    this.flushBuffer();
  }

  /**
   * Get monitoring statistics
   */
  getStatistics(): {
    uptime: number;
    reconnectionAttempts: number;
    connectionType: 'websocket' | 'polling';
    metricsCollected: number;
    alertsGenerated: number;
  } {
    const stats = this.performanceMonitor.getStatistics('realtime_metric_collected');
    const alertStats = this.performanceMonitor.getStatistics('realtime_alert_generated');

    return {
      uptime: this.isRunning ? Date.now() - this.buffer.lastFlush : 0,
      reconnectionAttempts: this.reconnectAttempts,
      connectionType: this.websocket ? 'websocket' : 'polling',
      metricsCollected: stats?.count || 0,
      alertsGenerated: alertStats?.count || 0
    };
  }
}

// Export singleton instance
export const realtimeMonitor = RealtimePerformanceMonitor.getInstance();

// Export convenience functions
export const startRealtimeMonitoring = (config?: Partial<RealtimeMonitorConfig>, handlers?: MonitoringEventHandlers) => {
  if (config) {
    realtimeMonitor.configure(config);
  }
  if (handlers) {
    realtimeMonitor.setHandlers(handlers);
  }
  return realtimeMonitor.start();
};

export const stopRealtimeMonitoring = () => {
  return realtimeMonitor.stop();
};

export const configureRealtimeMonitoring = (config: Partial<RealtimeMonitorConfig>) => {
  realtimeMonitor.configure(config);
};

export const setRealtimeMonitoringHandlers = (handlers: MonitoringEventHandlers) => {
  realtimeMonitor.setHandlers(handlers);
};
