/**
 * Real-time Performance Monitoring System
 * Handles WebSocket connections, polling, and live data streaming for the performance dashboard
 */

import {
  PerformanceMonitor,
  PerformanceMetric,
  PerformanceAlert
} from "@/lib/utils/performance-monitor";

import type {
  RealtimeMonitoringConfig,
  PerformanceEvent,
  PerformanceDashboardState,
  PerformanceMetricCategory,
  TimeRange,
  RefreshInterval
} from "@/types/admin/performance-dashboard";

// WebSocket connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// Monitoring event types
export type MonitoringEventType =
  | 'connection_state_change'
  | 'metric_update'
  | 'alert_created'
  | 'alert_resolved'
  | 'threshold_exceeded'
  | 'system_health_change'
  | 'error';

// Monitoring event interface
export interface MonitoringEvent {
  type: MonitoringEventType;
  timestamp: Date;
  data: any;
  error?: Error;
}

// Event listener type
export type EventListener<T = any> = (event: MonitoringEvent & { data: T }) => void;

// Batch processing configuration
export interface BatchConfig {
  enabled: boolean;
  maxBatchSize: number;
  batchTimeout: number; // milliseconds
  compressionEnabled: boolean;
}

// Data quality validation
export interface DataValidation {
  enabled: boolean;
  outlierDetection: boolean;
  rangeValidation: boolean;
  anomalyDetection: boolean;
}

/**
 * Real-time Performance Monitoring Manager
 */
export class RealtimePerformanceMonitor {
  private static instance: RealtimePerformanceMonitor;
  private config: RealtimeMonitoringConfig;
  private connectionState: ConnectionState = 'disconnected';
  private eventListeners: Map<MonitoringEventType, Set<EventListener>> = new Map();
  private metricsBuffer: PerformanceMetric[] = [];
  private alertsBuffer: PerformanceAlert[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private batchTimeout: NodeJS.Timeout | null = null;
  private performanceMonitor: PerformanceMonitor;
  private lastMetricsSync = new Date();
  private batchConfig: BatchConfig;
  private dataValidation: DataValidation;

  private constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.config = {
      enabled: false,
      polling: {
        interval: 5000,
        enabledMetrics: []
      },
      batchSize: 100,
      bufferTime: 1000
    };

    this.batchConfig = {
      enabled: true,
      maxBatchSize: 50,
      batchTimeout: 2000,
      compressionEnabled: false
    };

    this.dataValidation = {
      enabled: true,
      outlierDetection: true,
      rangeValidation: true,
      anomalyDetection: true
    };
  }

  static getInstance(): RealtimePerformanceMonitor {
    if (!RealtimePerformanceMonitor.instance) {
      RealtimePerformanceMonitor.instance = new RealtimePerformanceMonitor();
    }
    return RealtimePerformanceMonitor.instance;
  }

  /**
   * Initialize the real-time monitoring system
   */
  async initialize(config: RealtimeMonitoringConfig): Promise<void> {
    this.config = { ...this.config, ...config };

    if (this.config.enabled) {
      await this.startMonitoring();
    }
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(): Promise<void> {
    try {
      this.setConnectionState('connecting');

      // Initialize WebSocket if configured
      if (this.config.websocket) {
        await this.initializeWebSocket();
      } else if (this.config.polling) {
        // Fall back to polling
        this.startPolling();
      }

      // Initialize batch processing
      if (this.batchConfig.enabled) {
        this.initializeBatchProcessing();
      }

      // Initialize data validation
      if (this.dataValidation.enabled) {
        this.initializeDataValidation();
      }

      this.setConnectionState('connected');
      this.emitEvent('connection_state_change', { state: 'connected' });

    } catch (error) {
      this.setConnectionState('error');
      this.emitEvent('error', { error });
      throw error;
    }
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    this.setConnectionState('disconnected');

    // Clear WebSocket connection
    this.clearWebSocket();

    // Clear polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Clear batch processing
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.emitEvent('connection_state_change', { state: 'disconnected' });
  }

  /**
   * Initialize WebSocket connection
   */
  private async initializeWebSocket(): Promise<void> {
    if (!this.config.websocket?.url) {
      throw new Error('WebSocket URL not configured');
    }

    // WebSocket implementation would go here
    // For now, we'll simulate WebSocket events
    this.simulateWebSocketEvents();
  }

  /**
   * Simulate WebSocket events for demonstration
   */
  private simulateWebSocketEvents(): void {
    // Simulate periodic metric updates
    setInterval(() => {
      const mockMetrics = this.generateMockMetrics();
      this.processMetricsBatch(mockMetrics);
    }, this.config.polling?.interval || 5000);

    // Simulate periodic alerts
    setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance of alert
        const mockAlert = this.generateMockAlert();
        this.processAlert(mockAlert);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start polling for metrics
   */
  private startPolling(): void {
    if (!this.config.polling) return;

    const poll = async () => {
      try {
        const metrics = await this.collectMetrics();
        this.processMetricsBatch(metrics);

        const alerts = await this.collectAlerts();
        alerts.forEach(alert => this.processAlert(alert));

      } catch (error) {
        this.emitEvent('error', { error });
      }
    };

    // Initial poll
    poll();

    // Set up interval polling
    this.pollingInterval = setInterval(poll, this.config.polling.interval);
  }

  /**
   * Initialize batch processing
   */
  private initializeBatchProcessing(): void {
    this.batchTimeout = setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetricsBatch();
      }
      if (this.alertsBuffer.length > 0) {
        this.flushAlertsBatch();
      }
    }, this.batchConfig.batchTimeout);
  }

  /**
   * Initialize data validation
   */
  private initializeDataValidation(): void {
    // Set up validation rules and anomaly detection
    // This would integrate with the performance monitoring system
  }

  /**
   * Collect metrics from various sources
   */
  private async collectMetrics(): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];

    // Collect system metrics
    metrics.push(...await this.collectSystemMetrics());

    // Collect performance monitor metrics
    const recentMetrics = this.performanceMonitor.getMetrics('*', 60000); // Last minute
    metrics.push(...recentMetrics);

    // Validate metrics
    return this.dataValidation.enabled
      ? this.validateMetrics(metrics)
      : metrics;
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];
    const timestamp = new Date();

    // Memory metrics
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.push({
        id: `memory_${timestamp.getTime()}`,
        name: 'memory_used',
        value: memory.usedJSHeapSize / 1024 / 1024, // MB
        unit: 'MB',
        category: 'memory',
        status: this.getMetricStatus(memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100, 'memory'),
        trend: 'stable',
        timestamp,
        thresholds: {
          excellent: 30,
          good: 60,
          fair: 80,
          poor: 90
        }
      });
    }

    // Network metrics
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      metrics.push({
        id: `network_${timestamp.getTime()}`,
        name: 'network_latency',
        value: connection?.rtt || 0,
        unit: 'ms',
        category: 'network',
        status: this.getMetricStatus(connection?.rtt || 0, 'network'),
        trend: 'stable',
        timestamp,
        thresholds: {
          excellent: 50,
          good: 100,
          fair: 200,
          poor: 500
        }
      });
    }

    // Battery metrics
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        metrics.push({
          id: `battery_${timestamp.getTime()}`,
          name: 'battery_level',
          value: battery.level * 100,
          unit: '%',
          category: 'battery',
          status: this.getMetricStatus(battery.level * 100, 'battery'),
          trend: 'stable',
          timestamp,
          thresholds: {
            excellent: 80,
            good: 50,
            fair: 20,
            poor: 10
          }
        });
      }
    } catch (error) {
      // Battery API not available
    }

    return metrics;
  }

  /**
   * Collect alerts from the performance monitor
   */
  private async collectAlerts(): Promise<PerformanceAlert[]> {
    const alerts = this.performanceMonitor.getAlerts(60000); // Last minute

    return alerts.map(alert => ({
      id: `alert_${alert.metric}_${alert.timestamp.getTime()}`,
      title: alert.metric.replace(/_/g, ' ').toUpperCase(),
      message: alert.message,
      severity: alert.severity === 'error' ? 'critical' : alert.severity as any,
      category: 'system' as PerformanceMetricCategory,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      acknowledged: false,
      recommendations: [`Investigate ${alert.metric} performance`]
    }));
  }

  /**
   * Generate mock metrics for demonstration
   */
  private generateMockMetrics(): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];
    const timestamp = new Date();

    // Mock CPU usage
    metrics.push({
      id: `cpu_${timestamp.getTime()}`,
      name: 'cpu_usage',
      value: Math.random() * 100,
      unit: '%',
      category: 'system',
      status: 'good',
      trend: Math.random() > 0.5 ? 'up' : 'down',
      timestamp
    });

    // Mock transcription speed
    metrics.push({
      id: `transcription_speed_${timestamp.getTime()}`,
      name: 'transcription_speed',
      value: Math.random() * 2 + 0.5, // 0.5-2.5x real-time
      unit: 'x',
      category: 'transcription',
      status: 'good',
      trend: 'stable',
      timestamp
    });

    // Mock database query time
    metrics.push({
      id: `db_query_${timestamp.getTime()}`,
      name: 'database_query_time',
      value: Math.random() * 100 + 10, // 10-110ms
      unit: 'ms',
      category: 'database',
      status: 'excellent',
      trend: 'stable',
      timestamp
    });

    return metrics;
  }

  /**
   * Generate mock alert for demonstration
   */
  private generateMockAlert(): PerformanceAlert {
    const timestamp = new Date();
    const severities: Array<'warning' | 'error' | 'critical'> = ['warning', 'error', 'critical'];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    return {
      id: `alert_${timestamp.getTime()}`,
      title: 'High Memory Usage Detected',
      message: `Memory usage has exceeded the recommended threshold`,
      severity,
      category: 'memory',
      metric: 'memory_usage',
      value: 85,
      threshold: 80,
      timestamp,
      acknowledged: false,
      recommendations: [
        'Consider clearing unused caches',
        'Close unnecessary applications',
        'Restart the application if needed'
      ]
    };
  }

  /**
   * Process metrics in batch
   */
  private processMetricsBatch(metrics: PerformanceMetric[]): void {
    if (!this.batchConfig.enabled) {
      // Process immediately if batching is disabled
      metrics.forEach(metric => this.emitEvent('metric_update', metric));
      return;
    }

    this.metricsBuffer.push(...metrics);

    // Flush if batch size is exceeded
    if (this.metricsBuffer.length >= this.batchConfig.maxBatchSize) {
      this.flushMetricsBatch();
    }
  }

  /**
   * Process alert
   */
  private processAlert(alert: PerformanceAlert): void {
    this.emitEvent('alert_created', alert);

    if (this.batchConfig.enabled) {
      this.alertsBuffer.push(alert);

      // Flush if batch size is exceeded
      if (this.alertsBuffer.length >= this.batchConfig.maxBatchSize) {
        this.flushAlertsBatch();
      }
    }
  }

  /**
   * Flush metrics batch
   */
  private flushMetricsBatch(): void {
    if (this.metricsBuffer.length === 0) return;

    const batch = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // Process each metric in the batch
    batch.forEach(metric => {
      this.emitEvent('metric_update', metric);
    });

    // Update last sync time
    this.lastMetricsSync = new Date();
  }

  /**
   * Flush alerts batch
   */
  private flushAlertsBatch(): void {
    if (this.alertsBuffer.length === 0) return;

    const batch = [...this.alertsBuffer];
    this.alertsBuffer = [];

    // Process each alert in the batch
    batch.forEach(alert => {
      this.emitEvent('alert_created', alert);
    });
  }

  /**
   * Validate metrics
   */
  private validateMetrics(metrics: PerformanceMetric[]): PerformanceMetric[] {
    return metrics.filter(metric => {
      // Range validation
      if (this.dataValidation.rangeValidation) {
        if (metric.value < 0 || (metric.unit === '%' && metric.value > 100)) {
          return false;
        }
      }

      // Outlier detection (simple implementation)
      if (this.dataValidation.outlierDetection) {
        const recentMetrics = this.performanceMonitor.getMetrics(metric.name, 300000); // Last 5 minutes
        if (recentMetrics.length > 0) {
          const values = recentMetrics.map(m => m.value);
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);

          // Flag values more than 3 standard deviations from mean
          if (Math.abs(metric.value - mean) > 3 * stdDev) {
            // Could emit an anomaly event here
            this.emitEvent('threshold_exceeded', {
              metric: metric.name,
              value: metric.value,
              expected: mean,
              type: 'outlier'
            });
          }
        }
      }

      return true;
    });
  }

  /**
   * Get metric status based on value and thresholds
   */
  private getMetricStatus(value: number, category: string): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const thresholds: Record<string, { excellent: number; good: number; fair: number; poor: number }> = {
      memory: { excellent: 30, good: 60, fair: 80, poor: 90 },
      network: { excellent: 50, good: 100, fair: 200, poor: 500 },
      battery: { excellent: 80, good: 50, fair: 20, poor: 10 },
      cpu: { excellent: 20, good: 50, fair: 80, poor: 95 }
    };

    const categoryThresholds = thresholds[category] || thresholds.cpu;

    if (value <= categoryThresholds.excellent) return 'excellent';
    if (value <= categoryThresholds.good) return 'good';
    if (value <= categoryThresholds.fair) return 'fair';
    if (value <= categoryThresholds.poor) return 'poor';
    return 'critical';
  }

  /**
   * Set connection state
   */
  private setConnectionState(state: ConnectionState): void {
    const oldState = this.connectionState;
    this.connectionState = state;

    if (oldState !== state) {
      console.log(`Real-time monitoring connection state: ${oldState} -> ${state}`);
    }
  }

  /**
   * Clear WebSocket connection
   */
  private clearWebSocket(): void {
    // WebSocket cleanup would go here
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.setConnectionState('error');
    this.emitEvent('error', { error });

    // Attempt to reconnect
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff

      this.reconnectTimeout = setTimeout(() => {
        this.setConnectionState('reconnecting');
        this.startMonitoring().catch(() => {
          this.handleConnectionError(error);
        });
      }, delay);
    }
  }

  /**
   * Add event listener
   */
  addEventListener<T = any>(eventType: MonitoringEventType, listener: EventListener<T>): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: MonitoringEventType, listener: EventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent<T = any>(eventType: MonitoringEventType, data: T): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const event: MonitoringEvent & { data: T } = {
        type: eventType,
        timestamp: new Date(),
        data
      };

      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get monitoring statistics
   */
  getStatistics(): {
    connectionState: ConnectionState;
    reconnectAttempts: number;
    lastSync: Date;
    bufferedMetrics: number;
    bufferedAlerts: number;
  } {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastSync: this.lastMetricsSync,
      bufferedMetrics: this.metricsBuffer.length,
      bufferedAlerts: this.alertsBuffer.length
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RealtimeMonitoringConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart monitoring if enabled state changed
    if (config.enabled !== undefined) {
      if (config.enabled && this.connectionState === 'disconnected') {
        this.startMonitoring();
      } else if (!config.enabled && this.connectionState !== 'disconnected') {
        this.stopMonitoring();
      }
    }
  }

  /**
   * Update batch configuration
   */
  updateBatchConfig(config: Partial<BatchConfig>): void {
    this.batchConfig = { ...this.batchConfig, ...config };
  }

  /**
   * Update data validation configuration
   */
  updateDataValidationConfig(config: Partial<DataValidation>): void {
    this.dataValidation = { ...this.dataValidation, ...config };
  }
}

// Export singleton instance
export const realtimePerformanceMonitor = RealtimePerformanceMonitor.getInstance();

// React hook for using real-time monitoring
export const useRealtimeMonitoring = (config?: RealtimeMonitoringConfig) => {
  const [connectionState, setConnectionState] = React.useState<ConnectionState>('disconnected');
  const [metrics, setMetrics] = React.useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = React.useState<PerformanceAlert[]>([]);
  const [statistics, setStatistics] = React.useState<any>(null);

  React.useEffect(() => {
    const monitor = RealtimePerformanceMonitor.getInstance();

    // Set up event listeners
    const unsubscribeConnectionState = monitor.addEventListener('connection_state_change', (event) => {
      setConnectionState(event.data.state);
    });

    const unsubscribeMetricUpdate = monitor.addEventListener('metric_update', (event) => {
      setMetrics(prev => [...prev.slice(-99), event.data]); // Keep last 100 metrics
    });

    const unsubscribeAlertCreated = monitor.addEventListener('alert_created', (event) => {
      setAlerts(prev => [...prev.slice(-49), event.data]); // Keep last 50 alerts
    });

    const unsubscribeError = monitor.addEventListener('error', (event) => {
      console.error('Real-time monitoring error:', event.data.error);
    });

    // Initialize monitor
    if (config) {
      monitor.initialize(config);
    }

    // Update statistics periodically
    const statsInterval = setInterval(() => {
      setStatistics(monitor.getStatistics());
    }, 5000);

    return () => {
      unsubscribeConnectionState();
      unsubscribeMetricUpdate();
      unsubscribeAlertCreated();
      unsubscribeError();
      clearInterval(statsInterval);
      monitor.stopMonitoring();
    };
  }, [config]);

  return {
    connectionState,
    metrics,
    alerts,
    statistics,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting' || connectionState === 'reconnecting'
  };
};

export default RealtimePerformanceMonitor;
