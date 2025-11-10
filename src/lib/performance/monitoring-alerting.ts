/**
 * Performance Monitoring and Alerting System
 * Continuous monitoring with intelligent alerting for production environments
 */

import { performanceMonitor } from './performance-monitor';
import type { PerformanceDataPoint, MetricCategory } from './performance-monitor';
import type { PerformanceTestReport } from './performance-test-runner';

export interface MonitoringConfig {
  enabled: boolean;
  alertThresholds: AlertThresholds;
  alertChannels: AlertChannel[];
  monitoringWindow: number; // minutes
  aggregationInterval: number; // seconds
  alertCooldown: number; // minutes
  trendAnalysis: TrendAnalysisConfig;
  anomalyDetection: AnomalyDetectionConfig;
}

export interface AlertThresholds {
  [metricName: string]: {
    warning: number;
    critical: number;
    trend?: number; // percentage change threshold
    consecutive?: number; // number of consecutive violations
    timeWindow?: number; // minutes
  };
}

export interface AlertChannel {
  id: string;
  type: 'webhook' | 'email' | 'slack' | 'console' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
  severity: 'warning' | 'critical' | 'all';
}

export interface TrendAnalysisConfig {
  enabled: boolean;
  lookbackPeriod: number; // hours
  minDataPoints: number;
  trendThreshold: number; // percentage
  confidenceLevel: number; // decimal (0.9 = 90%)
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  algorithm: 'z-score' | 'iqr' | 'isolation-forest';
  sensitivity: 'low' | 'medium' | 'high';
  lookbackPeriod: number; // hours
  minDataPoints: number;
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: 'warning' | 'critical';
  metric: string;
  category: MetricCategory;
  currentValue: number;
  threshold: number;
  violationType: 'threshold' | 'trend' | 'anomaly';
  description: string;
  context: Record<string, any>;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface MonitoringDashboard {
  summary: MonitoringSummary;
  activeAlerts: PerformanceAlert[];
  metricsHealth: MetricsHealth;
  trends: TrendAnalysis[];
  anomalies: AnomalyDetection[];
}

export interface MonitoringSummary {
  totalMetrics: number;
  healthyMetrics: number;
  degradedMetrics: number;
  criticalMetrics: number;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  lastUpdated: Date;
}

export interface MetricsHealth {
  [metricName: string]: {
    current: number;
    status: 'healthy' | 'warning' | 'critical';
    trend: 'improving' | 'stable' | 'degrading';
    lastViolation?: Date;
    violationsInWindow: number;
  };
}

export interface TrendAnalysis {
  metric: string;
  category: MetricCategory;
  trend: 'improving' | 'stable' | 'degrading';
  slope: number;
  confidence: number;
  significance: number;
  timeWindow: number;
  dataPoints: number;
}

export interface AnomalyDetection {
  metric: string;
  category: MetricCategory;
  anomalyScore: number;
  threshold: number;
  detectedAt: Date;
  context: Record<string, any>;
}

/**
 * Performance Monitoring and Alerting Manager
 */
export class PerformanceMonitoringAlerting {
  private static instance: PerformanceMonitoringAlerting;
  private config: MonitoringConfig;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private alertHistory: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsBuffer: Map<string, PerformanceDataPoint[]> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private alertHandlers: Map<string, AlertHandler> = new Map();

  // Default configuration
  private readonly DEFAULT_CONFIG: MonitoringConfig = {
    enabled: true,
    alertThresholds: {
      // Core Web Vitals
      'largest-contentful-paint': { warning: 2500, critical: 4000, consecutive: 2, timeWindow: 5 },
      'first-input-delay': { warning: 100, critical: 300, consecutive: 3, timeWindow: 10 },
      'cumulative-layout-shift': { warning: 0.1, critical: 0.25, consecutive: 1, timeWindow: 5 },

      // Transcription Performance
      'transcription-processing-time': { warning: 45000, critical: 90000, consecutive: 2, timeWindow: 15 },
      'transcription-queue-time': { warning: 5000, critical: 15000, consecutive: 3, timeWindow: 10 },
      'transcription-speed': { warning: 0.5, critical: 0.2, consecutive: 2, timeWindow: 15 },

      // Mobile Performance
      'touch-response-time': { warning: 100, critical: 200, consecutive: 3, timeWindow: 5 },
      'memory-usage': { warning: 150, critical: 300, consecutive: 2, timeWindow: 10 },

      // UI Performance
      'ui-response-time': { warning: 100, critical: 300, consecutive: 2, timeWindow: 5 },
    },
    alertChannels: [
      {
        id: 'console',
        type: 'console',
        config: {},
        enabled: true,
        severity: 'all'
      }
    ],
    monitoringWindow: 60, // 1 hour
    aggregationInterval: 60, // 1 minute
    alertCooldown: 30, // 30 minutes
    trendAnalysis: {
      enabled: true,
      lookbackPeriod: 24, // 24 hours
      minDataPoints: 10,
      trendThreshold: 10, // 10%
      confidenceLevel: 0.9
    },
    anomalyDetection: {
      enabled: true,
      algorithm: 'z-score',
      sensitivity: 'medium',
      lookbackPeriod: 6, // 6 hours
      minDataPoints: 20
    }
  };

  static getInstance(): PerformanceMonitoringAlerting {
    if (!PerformanceMonitoringAlerting.instance) {
      PerformanceMonitoringAlerting.instance = new PerformanceMonitoringAlerting();
    }
    return PerformanceMonitoringAlerting.instance;
  }

  private constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
    this.setupDefaultHandlers();
  }

  /**
   * Initialize monitoring with custom configuration
   */
  initialize(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.DEFAULT_CONFIG, ...config };

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log('🔍 Starting performance monitoring...');

    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCycle();
    }, this.config.aggregationInterval * 1000);

    // Perform initial monitoring cycle
    this.performMonitoringCycle();
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ Performance monitoring stopped');
    }
  }

  /**
   * Perform a monitoring cycle
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      // Collect current metrics
      const currentMetrics = this.collectCurrentMetrics();

      // Update metrics buffer
      this.updateMetricsBuffer(currentMetrics);

      // Check threshold violations
      await this.checkThresholdViolations(currentMetrics);

      // Perform trend analysis
      if (this.config.trendAnalysis.enabled) {
        await this.performTrendAnalysis();
      }

      // Perform anomaly detection
      if (this.config.anomalyDetection.enabled) {
        await this.performAnomalyDetection();
      }

      // Clean up old alerts
      this.cleanupOldAlerts();

    } catch (error) {
      console.error('Error in monitoring cycle:', error);
    }
  }

  /**
   * Collect current metrics from performance monitor
   */
  private collectCurrentMetrics(): PerformanceDataPoint[] {
    const timeWindow = this.config.monitoringWindow * 60 * 1000; // Convert to milliseconds
    const allMetrics: PerformanceDataPoint[] = [];

    // Get metrics from all categories
    const categories: MetricCategory[] = ['transcription', 'progress', 'mobile', 'ui'];

    for (const category of categories) {
      const categoryMetrics = performanceMonitor.getMetrics(category, timeWindow);
      allMetrics.push(...categoryMetrics);
    }

    return allMetrics;
  }

  /**
   * Update metrics buffer with new data
   */
  private updateMetricsBuffer(metrics: PerformanceDataPoint[]): void {
    for (const metric of metrics) {
      const key = `${metric.category}-${metric.name}`;

      if (!this.metricsBuffer.has(key)) {
        this.metricsBuffer.set(key, []);
      }

      const buffer = this.metricsBuffer.get(key)!;
      buffer.push(metric);

      // Keep only data within monitoring window
      const cutoffTime = Date.now() - (this.config.monitoringWindow * 60 * 1000);
      const filtered = buffer.filter(point => point.timestamp.getTime() > cutoffTime);
      this.metricsBuffer.set(key, filtered);
    }
  }

  /**
   * Check for threshold violations
   */
  private async checkThresholdViolations(currentMetrics: PerformanceDataPoint[]): Promise<void> {
    for (const metric of currentMetrics) {
      if (typeof metric.value !== 'number') continue;

      const threshold = this.config.alertThresholds[metric.name];
      if (!threshold) continue;

      const key = `${metric.category}-${metric.name}`;
      const buffer = this.metricsBuffer.get(key) || [];

      // Check consecutive violations
      const recentMetrics = buffer.filter(
        point => point.timestamp.getTime() > Date.now() - ((threshold.timeWindow || 5) * 60 * 1000)
      );

      let severity: 'warning' | 'critical' | null = null;
      let thresholdValue: number;

      if (metric.value >= threshold.critical) {
        severity = 'critical';
        thresholdValue = threshold.critical;
      } else if (metric.value >= threshold.warning) {
        severity = 'warning';
        thresholdValue = threshold.warning;
      } else {
        continue; // No violation
      }

      // Check if we have enough consecutive violations
      const violationCount = recentMetrics.filter(
        point => typeof point.value === 'number' && point.value >= thresholdValue
      ).length;

      if (violationCount >= (threshold.consecutive || 1)) {
        await this.triggerAlert({
          metric: metric.name,
          category: metric.category,
          severity: severity!,
          currentValue: metric.value,
          threshold: thresholdValue,
          violationType: 'threshold',
          description: `${metric.name} exceeded ${severity} threshold: ${metric.value} > ${thresholdValue}`,
          context: {
            violationCount,
            timeWindow: threshold.timeWindow,
            recentMetrics: recentMetrics.length,
            tags: metric.tags,
            metadata: metric.metadata
          }
        });
      }
    }
  }

  /**
   * Perform trend analysis
   */
  private async performTrendAnalysis(): Promise<void> {
    const lookbackPeriod = this.config.trendAnalysis.lookbackPeriod * 60 * 60 * 1000; // Convert to milliseconds
    const minDataPoints = this.config.trendAnalysis.minDataPoints;

    for (const [key, buffer] of this.metricsBuffer.entries()) {
      const recentData = buffer.filter(
        point => point.timestamp.getTime() > Date.now() - lookbackPeriod
      );

      if (recentData.length < minDataPoints) continue;

      const [category, metricName] = key.split('-');

      // Calculate trend using linear regression
      const trend = this.calculateLinearTrend(recentData);

      if (trend.significance > this.config.trendAnalysis.confidenceLevel) {
        // Check if trend exceeds threshold
        const trendPercent = Math.abs(trend.slope) / trend.mean * 100;

        if (trendPercent > this.config.trendAnalysis.trendThreshold) {
          // Determine if this is a degradation
          const isDegradation = this.isTrendDegradation(metricName, trend.slope);

          if (isDegradation) {
            await this.triggerAlert({
              metric: metricName,
              category: category as MetricCategory,
              severity: 'warning',
              currentValue: trend.latest,
              threshold: trendPercent,
              violationType: 'trend',
              description: `${metricName} shows degrading trend: ${trendPercent.toFixed(2)}% over ${this.config.trendAnalysis.lookbackPeriod}h`,
              context: {
                trend: trend,
                trendPercent,
                lookbackPeriod: this.config.trendAnalysis.lookbackPeriod,
                dataPoints: recentData.length
              }
            });
          }
        }
      }
    }
  }

  /**
   * Perform anomaly detection
   */
  private async performAnomalyDetection(): Promise<void> {
    const lookbackPeriod = this.config.anomalyDetection.lookbackPeriod * 60 * 60 * 1000;
    const minDataPoints = this.config.anomalyDetection.minDataPoints;

    for (const [key, buffer] of this.metricsBuffer.entries()) {
      const recentData = buffer.filter(
        point => point.timestamp.getTime() > Date.now() - lookbackPeriod
      );

      if (recentData.length < minDataPoints) continue;

      const [category, metricName] = key.split('-');
      const numericData = recentData
        .filter(point => typeof point.value === 'number')
        .map(point => point.value as number);

      if (numericData.length === 0) continue;

      // Detect anomalies based on configured algorithm
      const anomalies = this.detectAnomalies(numericData);

      for (const anomaly of anomalies) {
        const originalPoint = recentData[anomaly.index];

        await this.triggerAlert({
          metric: metricName,
          category: category as MetricCategory,
          severity: 'warning',
          currentValue: anomaly.value,
          threshold: anomaly.threshold,
          violationType: 'anomaly',
          description: `${metricName} detected anomaly: ${anomaly.value} (Z-score: ${anomaly.zScore.toFixed(2)})`,
          context: {
            anomalyScore: anomaly.zScore,
            algorithm: this.config.anomalyDetection.algorithm,
            sensitivity: this.config.anomalyDetection.sensitivity,
            dataPoint: originalPoint
          }
        });
      }
    }
  }

  /**
   * Trigger a performance alert
   */
  private async triggerAlert(alertData: {
    metric: string;
    category: MetricCategory;
    severity: 'warning' | 'critical';
    currentValue: number;
    threshold: number;
    violationType: 'threshold' | 'trend' | 'anomaly';
    description: string;
    context: Record<string, any>;
  }): Promise<void> {
    const alertId = `${alertData.category}-${alertData.metric}-${Date.now()}`;

    // Check cooldown period
    const cooldownKey = `${alertData.category}-${alertData.metric}`;
    const lastAlertTime = this.alertCooldowns.get(cooldownKey);
    const cooldownPeriod = this.config.alertCooldown * 60 * 1000; // Convert to milliseconds

    if (lastAlertTime && Date.now() - lastAlertTime.getTime() < cooldownPeriod) {
      return; // Skip due to cooldown
    }

    const alert: PerformanceAlert = {
      id: alertId,
      timestamp: new Date(),
      severity: alertData.severity,
      metric: alertData.metric,
      category: alertData.category,
      currentValue: alertData.currentValue,
      threshold: alertData.threshold,
      violationType: alertData.violationType,
      description: alertData.description,
      context: alertData.context,
      acknowledged: false,
      resolved: false
    };

    // Store alert
    this.alerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Update cooldown
    this.alertCooldowns.set(cooldownKey, new Date());

    // Send notifications
    await this.sendNotifications(alert);

    console.warn(`🚨 Performance Alert: ${alert.description}`);
  }

  /**
   * Send notifications through configured channels
   */
  private async sendNotifications(alert: PerformanceAlert): Promise<void> {
    const channels = this.config.alertChannels.filter(
      channel => channel.enabled &&
      (channel.severity === 'all' || channel.severity === alert.severity)
    );

    for (const channel of channels) {
      try {
        const handler = this.alertHandlers.get(channel.type);
        if (handler) {
          await handler.send(alert, channel.config);
        }
      } catch (error) {
        console.error(`Failed to send alert via ${channel.type}:`, error);
      }
    }
  }

  /**
   * Setup default alert handlers
   */
  private setupDefaultHandlers(): void {
    // Console handler
    this.alertHandlers.set('console', {
      send: async (alert, config) => {
        const severity = alert.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`${severity} [${alert.severity.toUpperCase()}] ${alert.description}`);
        console.log(`   Metric: ${alert.metric} (${alert.category})`);
        console.log(`   Value: ${alert.currentValue} | Threshold: ${alert.threshold}`);
        console.log(`   Time: ${alert.timestamp.toISOString()}`);
        console.log(`   Context:`, alert.context);
      }
    });

    // Webhook handler
    this.alertHandlers.set('webhook', {
      send: async (alert, config) => {
        if (!config.url) {
          console.warn('Webhook alert channel missing URL configuration');
          return;
        }

        const payload = {
          alert,
          service: 'umuo-app',
          environment: process.env.NODE_ENV || 'unknown',
          timestamp: new Date().toISOString()
        };

        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config.headers
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
        }
      }
    });

    // Email handler (placeholder - would need email service integration)
    this.alertHandlers.set('email', {
      send: async (alert, config) => {
        console.log('📧 Email alert (not implemented):', alert.description);
        // Implementation would depend on email service (SendGrid, AWS SES, etc.)
      }
    });

    // Slack handler (placeholder - would need Slack integration)
    this.alertHandlers.set('slack', {
      send: async (alert, config) => {
        console.log('💬 Slack alert (not implemented):', alert.description);
        // Implementation would use Slack webhook API
      }
    });
  }

  /**
   * Calculate linear trend for data points
   */
  private calculateLinearTrend(dataPoints: PerformanceDataPoint[]): {
    slope: number;
    mean: number;
    latest: number;
    significance: number;
    correlation: number;
  } {
    const numericPoints = dataPoints.filter(p => typeof p.value === 'number');
    if (numericPoints.length < 2) {
      return { slope: 0, mean: 0, latest: 0, significance: 0, correlation: 0 };
    }

    const n = numericPoints.length;
    const x = numericPoints.map((_, i) => i);
    const y = numericPoints.map(p => p.value as number);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const mean = sumY / n;
    const latest = y[y.length - 1];

    // Calculate correlation coefficient for significance
    const correlation = (n * sumXY - sumX * sumY) /
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    // Convert correlation to significance (p-value approximation)
    const tStat = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const significance = 1 - this.tDistribution(Math.abs(tStat), n - 2);

    return { slope, mean, latest, significance, correlation };
  }

  /**
   * Determine if trend represents degradation for the metric
   */
  private isTrendDegradation(metricName: string, slope: number): boolean {
    // Define which metrics should decrease vs increase
    const decreasingMetrics = [
      'largest-contentful-paint',
      'first-input-delay',
      'cumulative-layout-shift',
      'time-to-first-byte',
      'transcription-processing-time',
      'transcription-queue-time',
      'touch-response-time',
      'memory-usage',
      'ui-response-time'
    ];

    if (decreasingMetrics.includes(metricName)) {
      return slope > 0; // Increasing value is bad for these metrics
    } else {
      return slope < 0; // Decreasing value is bad for other metrics
    }
  }

  /**
   * Detect anomalies using Z-score method
   */
  private detectAnomalies(values: number[]): Array<{
    index: number;
    value: number;
    zScore: number;
    threshold: number;
  }> {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const sensitivityMultiplier = {
      low: 3,
      medium: 2.5,
      high: 2
    }[this.config.anomalyDetection.sensitivity] || 2.5;

    const threshold = sensitivityMultiplier * stdDev;
    const anomalies = [];

    for (let i = 0; i < values.length; i++) {
      const zScore = Math.abs((values[i] - mean) / stdDev);
      if (zScore > sensitivityMultiplier) {
        anomalies.push({
          index: i,
          value: values[i],
          zScore,
          threshold
        });
      }
    }

    return anomalies;
  }

  /**
   * Simple t-distribution approximation
   */
  private tDistribution(t: number, df: number): number {
    // This is a simplified approximation
    // In production, you'd use a proper statistical library
    return 1 - Math.exp(-0.5 * t * t) * (1 - 1 / (4 * df));
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    // Remove from active alerts
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp.getTime() < cutoffTime && alert.resolved) {
        this.alerts.delete(id);
      }
    }

    // Keep history manageable
    this.alertHistory = this.alertHistory.filter(
      alert => alert.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Get monitoring dashboard data
   */
  getMonitoringDashboard(): MonitoringDashboard {
    const summary = this.calculateMonitoringSummary();
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    const metricsHealth = this.calculateMetricsHealth();
    const trends = this.getCurrentTrends();
    const anomalies = this.getCurrentAnomalies();

    return {
      summary,
      activeAlerts,
      metricsHealth,
      trends,
      anomalies
    };
  }

  /**
   * Calculate monitoring summary
   */
  private calculateMonitoringSummary(): MonitoringSummary {
    const metricsHealth = this.calculateMetricsHealth();
    const totalMetrics = Object.keys(metricsHealth).length;
    const healthyMetrics = Object.values(metricsHealth).filter(m => m.status === 'healthy').length;
    const degradedMetrics = Object.values(metricsHealth).filter(m => m.status === 'warning').length;
    const criticalMetrics = Object.values(metricsHealth).filter(m => m.status === 'critical').length;

    let overallHealth: 'healthy' | 'degraded' | 'critical';
    if (criticalMetrics > 0) {
      overallHealth = 'critical';
    } else if (degradedMetrics > 0) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'healthy';
    }

    return {
      totalMetrics,
      healthyMetrics,
      degradedMetrics,
      criticalMetrics,
      overallHealth,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate health status for all metrics
   */
  private calculateMetricsHealth(): MetricsHealth {
    const health: MetricsHealth = {};

    for (const [key, buffer] of this.metricsBuffer.entries()) {
      if (buffer.length === 0) continue;

      const [category, metricName] = key.split('-');
      const latest = buffer[buffer.length - 1];

      if (typeof latest.value !== 'number') continue;

      const threshold = this.config.alertThresholds[metricName];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let trend: 'improving' | 'stable' | 'degrading' = 'stable';

      if (threshold) {
        if (latest.value >= threshold.critical) {
          status = 'critical';
        } else if (latest.value >= threshold.warning) {
          status = 'warning';
        }
      }

      // Calculate trend
      if (buffer.length >= 5) {
        const recent = buffer.slice(-5);
        const older = buffer.slice(-10, -5);

        if (recent.length > 0 && older.length > 0) {
          const recentAvg = recent.reduce((sum, p) => sum + (p.value as number), 0) / recent.length;
          const olderAvg = older.reduce((sum, p) => sum + (p.value as number), 0) / older.length;

          const change = (recentAvg - olderAvg) / olderAvg;
          if (Math.abs(change) > 0.05) { // 5% threshold
            trend = change > 0 ? 'degrading' : 'improving';
          }
        }
      }

      health[metricName] = {
        current: latest.value,
        status,
        trend,
        violationsInWindow: buffer.filter(p => {
          const t = this.config.alertThresholds[metricName];
          return t && typeof p.value === 'number' && p.value >= t.warning;
        }).length
      };
    }

    return health;
  }

  /**
   * Get current trend analysis
   */
  private getCurrentTrends(): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const lookbackPeriod = this.config.trendAnalysis.lookbackPeriod * 60 * 60 * 1000;

    for (const [key, buffer] of this.metricsBuffer.entries()) {
      const recentData = buffer.filter(
        point => point.timestamp.getTime() > Date.now() - lookbackPeriod
      );

      if (recentData.length < this.config.trendAnalysis.minDataPoints) continue;

      const [category, metricName] = key.split('-');
      const trend = this.calculateLinearTrend(recentData);

      if (trend.significance > this.config.trendAnalysis.confidenceLevel) {
        trends.push({
          metric: metricName,
          category: category as MetricCategory,
          trend: this.isTrendDegradation(metricName, trend.slope) ? 'degrading' : 'improving',
          slope: trend.slope,
          confidence: trend.significance,
          significance: Math.abs(trend.correlation),
          timeWindow: this.config.trendAnalysis.lookbackPeriod,
          dataPoints: recentData.length
        });
      }
    }

    return trends;
  }

  /**
   * Get current anomaly detections
   */
  private getCurrentAnomalies(): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const lookbackPeriod = this.config.anomalyDetection.lookbackPeriod * 60 * 60 * 1000;

    for (const [key, buffer] of this.metricsBuffer.entries()) {
      const recentData = buffer.filter(
        point => point.timestamp.getTime() > Date.now() - lookbackPeriod
      );

      if (recentData.length < this.config.anomalyDetection.minDataPoints) continue;

      const [category, metricName] = key.split('-');
      const numericData = recentData
        .filter(point => typeof point.value === 'number')
        .map(point => point.value as number);

      if (numericData.length === 0) continue;

      const detectedAnomalies = this.detectAnomalies(numericData);

      for (const anomaly of detectedAnomalies) {
        anomalies.push({
          metric: metricName,
          category: category as MetricCategory,
          anomalyScore: anomaly.zScore,
          threshold: anomaly.threshold,
          detectedAt: recentData[anomaly.index].timestamp,
          context: {
            value: anomaly.value,
            index: anomaly.index,
            algorithm: this.config.anomalyDetection.algorithm
          }
        });
      }
    }

    return anomalies;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Add custom alert channel
   */
  addAlertChannel(channel: AlertChannel): void {
    this.config.alertChannels.push(channel);
  }

  /**
   * Update alert threshold
   */
  updateThreshold(metricName: string, threshold: Partial<AlertThresholds[string]>): void {
    if (!this.config.alertThresholds[metricName]) {
      this.config.alertThresholds[metricName] = {
        warning: 0,
        critical: 0
      };
    }

    this.config.alertThresholds[metricName] = {
      ...this.config.alertThresholds[metricName],
      ...threshold
    };
  }
}

// Type definitions for alert handlers
interface AlertHandler {
  send(alert: PerformanceAlert, config: Record<string, any>): Promise<void>;
}

// Export singleton instance
export const performanceMonitoringAlerting = PerformanceMonitoringAlerting.getInstance();

// Export for easy usage
export default performanceMonitoringAlerting;
