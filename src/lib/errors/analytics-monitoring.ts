/**
 * Real-time Error Monitoring and Alerting System
 *
 * Advanced real-time monitoring system with intelligent alerting,
 * anomaly detection, and proactive error management.
 *
 * @version 1.0.0
 */

import { ErrorEvent, ErrorAnalyticsConfig, AnomalyDetectionResult } from './error-analytics';
import { EventEmitter } from 'events';

// ============================================================================
// MONITORING INTERFACES
// ============================================================================

/**
 * Monitoring alert severity levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Alert types
 */
export enum AlertType {
  ERROR_SPIKE = 'error_spike',
  NEW_ERROR_PATTERN = 'new_error_pattern',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  RECOVERY_FAILURE = 'recovery_failure',
  USER_IMPACT = 'user_impact',
  SYSTEM_HEALTH = 'system_health',
  QUOTA_EXCEEDED = 'quota_exceeded',
  ANOMALY_DETECTED = 'anomaly_detected',
}

/**
 * Real-time monitoring alert
 */
export interface MonitoringAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: Date;

  // Context information
  affectedSystems: string[];
  errorTypes: string[];
  userImpact: 'low' | 'medium' | 'high' | 'critical';

  // Metrics
  metricName: string;
  currentValue: number;
  threshold: number;
  deviation: number;

  // Resolution
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;

  // Metadata
  metadata: Record<string, any>;
  correlations: string[]; // IDs of related alerts

  // Actions
  suggestedActions: string[];
  autoResolvable: boolean;
  autoResolveCondition?: string;
}

/**
 * Monitoring rule configuration
 */
export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // Trigger conditions
  conditions: MonitoringCondition[];
  operator: 'AND' | 'OR';

  // Alert configuration
  alertType: AlertType;
  severity: AlertSeverity;
  cooldownPeriod: number; // ms

  // Notification settings
  notifications: NotificationConfig[];

  // Suppression rules
  suppressionRules?: SuppressionRule[];

  // Auto-resolution
  autoResolve?: AutoResolveConfig;
}

/**
 * Monitoring condition for rule triggering
 */
export interface MonitoringCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  threshold: number;
  timeWindow?: number; // ms
  aggregation?: 'count' | 'sum' | 'avg' | 'max' | 'min' | 'rate';
  filters?: Record<string, any>;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  type: 'webhook' | 'email' | 'slack' | 'teams' | 'push' | 'sms';
  endpoint: string;
  enabled: boolean;
  template?: string;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

/**
 * Alert suppression rule
 */
export interface SuppressionRule {
  condition: string;
  duration: number; // ms
  reason: string;
}

/**
 * Auto-resolution configuration
 */
export interface AutoResolveConfig {
  enabled: boolean;
  condition: string;
  checkInterval: number; // ms
  maxDuration: number; // ms
}

/**
 * Real-time metrics
 */
export interface RealTimeMetrics {
  timestamp: Date;
  errorRate: number;
  errorsPerMinute: number;
  averageResolutionTime: number;
  recoveryRate: number;
  activeUsers: number;
  systemHealth: number; // 0-100

  // Performance metrics
  pageLoadTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;

  // Error breakdown
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;

  // User impact
  affectedUsers: number;
  bounceRate: number;
  sessionDuration: number;
}

/**
 * Monitoring dashboard state
 */
export interface MonitoringDashboard {
  isActive: boolean;
  startTime: Date;

  // Current status
  currentMetrics: RealTimeMetrics;
  activeAlerts: MonitoringAlert[];
  recentAlerts: MonitoringAlert[];

  // Trends
  metricsHistory: RealTimeMetrics[];
  alertTrends: {
    hourly: number[];
    daily: number[];
  };

  // System health
  systemHealth: {
    overall: number;
    components: Record<string, number>;
    issues: string[];
  };
}

// ============================================================================
// MAIN MONITORING CLASS
// ============================================================================

/**
 * Real-time error monitoring and alerting system
 */
export class ErrorMonitoringSystem extends EventEmitter {
  private config: ErrorAnalyticsConfig;
  private isActive = false;
  private monitoringTimer?: NodeJS.Timeout;
  private metricsHistory: RealTimeMetrics[] = [];
  private activeAlerts = new Map<string, MonitoringAlert>();
  private monitoringRules = new Map<string, MonitoringRule>();
  private alertHistory: MonitoringAlert[] = [];

  // Components
  private metricsCollector: MetricsCollector;
  private ruleEngine: RuleEngine;
  private alertManager: AlertManager;
  private notificationService: NotificationService;
  private anomalyDetector: RealTimeAnomalyDetector;

  constructor(config: ErrorAnalyticsConfig) {
    super();
    this.config = config;

    // Initialize components
    this.metricsCollector = new MetricsCollector(config);
    this.ruleEngine = new RuleEngine();
    this.alertManager = new AlertManager();
    this.notificationService = new NotificationService(config);
    this.anomalyDetector = new RealTimeAnomalyDetector();

    this.initialize();
  }

  /**
   * Start real-time monitoring
   */
  public start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.startMetricsCollection();
    this.loadDefaultRules();

    // Start monitoring loop
    this.monitoringTimer = setInterval(() => {
      this.performMonitoringCycle();
    }, this.config.refreshInterval || 30000);

    this.emit('started');
    console.log('[ErrorMonitoringSystem] Real-time monitoring started');
  }

  /**
   * Stop real-time monitoring
   */
  public stop(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    this.metricsCollector.stop();
    this.emit('stopped');
    console.log('[ErrorMonitoringSystem] Real-time monitoring stopped');
  }

  /**
   * Process new error event in real-time
   */
  public async processErrorEvent(event: ErrorEvent): Promise<void> {
    if (!this.isActive) return;

    try {
      // Update metrics
      await this.metricsCollector.processEvent(event);

      // Check for real-time anomalies
      const anomalies = await this.anomalyDetector.analyzeEvent(event);

      // Evaluate monitoring rules
      await this.ruleEngine.evaluateEvent(event, this.metricsCollector.getCurrentMetrics());

      // Emit event for external listeners
      this.emit('errorProcessed', { event, anomalies });

    } catch (error) {
      console.error('[ErrorMonitoringSystem] Failed to process error event:', error);
    }
  }

  /**
   * Get current monitoring dashboard state
   */
  public async getDashboardState(): Promise<MonitoringDashboard> {
    const currentMetrics = this.metricsCollector.getCurrentMetrics();
    const activeAlerts = Array.from(this.activeAlerts.values());
    const recentAlerts = this.alertHistory.slice(-50);

    return {
      isActive: this.isActive,
      startTime: new Date(), // Would track actual start time
      currentMetrics,
      activeAlerts,
      recentAlerts,
      metricsHistory: this.metricsHistory.slice(-100),
      alertTrends: this.calculateAlertTrends(),
      systemHealth: await this.calculateSystemHealth(),
    };
  }

  /**
   * Add custom monitoring rule
   */
  public addRule(rule: MonitoringRule): void {
    this.monitoringRules.set(rule.id, rule);
    this.ruleEngine.addRule(rule);
    this.emit('ruleAdded', rule);
  }

  /**
   * Remove monitoring rule
   */
  public removeRule(ruleId: string): void {
    this.monitoringRules.delete(ruleId);
    this.ruleEngine.removeRule(ruleId);
    this.emit('ruleRemoved', ruleId);
  }

  /**
   * Acknowledge alert
   */
  public async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    await this.alertManager.updateAlert(alert);
    this.emit('alertAcknowledged', alert);
  }

  /**
   * Resolve alert
   */
  public async resolveAlert(alertId: string, resolvedBy?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    await this.alertManager.updateAlert(alert);
    this.activeAlerts.delete(alertId);
    this.alertHistory.push(alert);

    this.emit('alertResolved', alert);
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): MonitoringAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit: number = 100): MonitoringAlert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get monitoring rules
   */
  public getRules(): MonitoringRule[] {
    return Array.from(this.monitoringRules.values());
  }

  /**
   * Update monitoring configuration
   */
  public updateConfig(newConfig: ErrorAnalyticsConfig): void {
    this.config = newConfig;
    this.metricsCollector.updateConfig(newConfig);
    this.notificationService.updateConfig(newConfig);
  }

  /**
   * Get system health summary
   */
  public async getSystemHealth(): Promise<{
    overall: number;
    components: Record<string, number>;
    issues: string[];
  }> {
    return this.calculateSystemHealth();
  }

  // Private methods
  private initialize(): void {
    this.setupEventHandlers();
    this.initializeDefaultRules();
  }

  private setupEventHandlers(): void {
    // Handle alerts from rule engine
    this.ruleEngine.on('alert', async (alert: MonitoringAlert) => {
      await this.handleAlert(alert);
    });

    // Handle anomaly detections
    this.anomalyDetector.on('anomaly', async (anomaly: AnomalyDetectionResult) => {
      await this.handleAnomaly(anomaly);
    });

    // Handle alert resolution
    this.alertManager.on('alertResolved', (alert: MonitoringAlert) => {
      this.activeAlerts.delete(alert.id);
      this.alertHistory.push(alert);
    });
  }

  private startMetricsCollection(): void {
    this.metricsCollector.start();
  }

  private loadDefaultRules(): void {
    this.initializeDefaultRules();
  }

  private async performMonitoringCycle(): Promise<void> {
    try {
      // Collect current metrics
      const currentMetrics = this.metricsCollector.getCurrentMetrics();
      this.metricsHistory.push(currentMetrics);

      // Keep history size manageable
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-500);
      }

      // Check auto-resolution conditions
      await this.checkAutoResolution();

      // Emit metrics update
      this.emit('metricsUpdated', currentMetrics);

    } catch (error) {
      console.error('[ErrorMonitoringSystem] Monitoring cycle failed:', error);
    }
  }

  private async handleAlert(alert: MonitoringAlert): Promise<void> {
    try {
      // Check for suppression
      if (await this.isAlertSuppressed(alert)) {
        return;
      }

      // Add to active alerts
      this.activeAlerts.set(alert.id, alert);

      // Send notifications
      await this.notificationService.sendAlert(alert);

      // Store alert
      await this.alertManager.createAlert(alert);

      // Emit alert event
      this.emit('alert', alert);

    } catch (error) {
      console.error('[ErrorMonitoringSystem] Failed to handle alert:', error);
    }
  }

  private async handleAnomaly(anomaly: AnomalyDetectionResult): Promise<void> {
    // Convert anomaly to alert
    const alert = this.convertAnomalyToAlert(anomaly);
    await this.handleAlert(alert);
  }

  private convertAnomalyToAlert(anomaly: AnomalyDetectionResult): MonitoringAlert {
    return {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: AlertType.ANOMALY_DETECTED,
      severity: anomaly.severity === 'critical' ? AlertSeverity.CRITICAL :
                anomaly.severity === 'high' ? AlertSeverity.HIGH :
                anomaly.severity === 'medium' ? AlertSeverity.MEDIUM : AlertSeverity.LOW,
      title: `${anomaly.anomalyType} Anomaly Detected`,
      description: anomaly.description,
      timestamp: new Date(),
      affectedSystems: ['error-analytics'],
      errorTypes: [],
      userImpact: 'medium',
      metricName: anomaly.anomalyType,
      currentValue: 0, // Would be calculated from anomaly
      threshold: 0,
      deviation: 0,
      status: 'active',
      metadata: {
        anomalyType: anomaly.anomalyType,
        affectedMetrics: anomaly.affectedMetrics,
        startTime: anomaly.startTime,
        endTime: anomaly.endTime,
      },
      correlations: [],
      suggestedActions: [anomaly.recommendation],
      autoResolvable: false,
    };
  }

  private async isAlertSuppressed(alert: MonitoringAlert): Promise<boolean> {
    // Check suppression rules
    for (const rule of this.monitoringRules.values()) {
      if (rule.suppressionRules) {
        for (const suppression of rule.suppressionRules) {
          if (this.evaluateSuppressionRule(suppression, alert)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private evaluateSuppressionRule(rule: SuppressionRule, alert: MonitoringAlert): boolean {
    // Simple evaluation - would be more sophisticated in production
    try {
      const condition = rule.condition
        .replace('{alert.type}', alert.type)
        .replace('{alert.severity}', alert.severity);

      return eval(condition); // Note: In production, use a proper expression parser
    } catch {
      return false;
    }
  }

  private async checkAutoResolution(): Promise<void> {
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.autoResolve && alert.autoResolveCondition) {
        const currentMetrics = this.metricsCollector.getCurrentMetrics();

        try {
          const condition = alert.autoResolveCondition
            .replace('{metrics.errorRate}', currentMetrics.errorRate.toString())
            .replace('{metrics.recoveryRate}', currentMetrics.recoveryRate.toString());

          if (eval(condition)) { // Note: Use proper expression parser in production
            await this.resolveAlert(alertId, 'auto-resolve');
          }
        } catch {
          // Ignore evaluation errors
        }
      }
    }
  }

  private calculateAlertTrends(): { hourly: number[]; daily: number[] } {
    const now = new Date();
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);

    this.alertHistory.forEach(alert => {
      const hoursDiff = Math.floor((now.getTime() - alert.timestamp.getTime()) / (1000 * 60 * 60));
      const daysDiff = Math.floor(hoursDiff / 24);

      if (hoursDiff < 24) {
        hourly[23 - hoursDiff]++;
      }

      if (daysDiff < 7) {
        daily[6 - daysDiff]++;
      }
    });

    return { hourly, daily };
  }

  private async calculateSystemHealth(): Promise<{
    overall: number;
    components: Record<string, number>;
    issues: string[];
  }> {
    const currentMetrics = this.metricsCollector.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();

    // Calculate component health scores
    const components = {
      errorRate: Math.max(0, 100 - (currentMetrics.errorRate * 1000)),
      recoveryRate: currentMetrics.recoveryRate * 100,
      performance: Math.max(0, 100 - (currentMetrics.pageLoadTime / 100)),
      availability: currentMetrics.systemHealth,
    };

    // Calculate overall health (weighted average)
    const weights = { errorRate: 0.3, recoveryRate: 0.25, performance: 0.25, availability: 0.2 };
    const overall = Object.entries(components).reduce((sum, [key, value]) => {
      return sum + (value * weights[key as keyof typeof weights]);
    }, 0);

    // Identify issues
    const issues: string[] = [];
    if (currentMetrics.errorRate > 0.05) issues.push('High error rate');
    if (currentMetrics.recoveryRate < 0.8) issues.push('Low recovery rate');
    if (currentMetrics.pageLoadTime > 3000) issues.push('Slow page load times');
    if (activeAlerts.filter(a => a.severity === AlertSeverity.CRITICAL).length > 0) {
      issues.push('Critical alerts active');
    }

    return { overall, components, issues };
  }

  private initializeDefaultRules(): void {
    // Error spike rule
    const errorSpikeRule: MonitoringRule = {
      id: 'error_spike',
      name: 'Error Spike Detection',
      description: 'Detect sudden increases in error rate',
      enabled: true,
      conditions: [{
        metric: 'errorRate',
        operator: 'gt',
        threshold: 0.05, // 5%
        timeWindow: 300000, // 5 minutes
        aggregation: 'rate',
      }],
      operator: 'AND',
      alertType: AlertType.ERROR_SPIKE,
      severity: AlertSeverity.HIGH,
      cooldownPeriod: 600000, // 10 minutes
      notifications: [],
      suggestedActions: ['Investigate recent deployments', 'Check system resources'],
      autoResolvable: true,
      autoResolveCondition: '{metrics.errorRate} < 0.02',
    };

    // Recovery failure rule
    const recoveryFailureRule: MonitoringRule = {
      id: 'recovery_failure',
      name: 'Recovery Failure Detection',
      description: 'Detect low recovery success rates',
      enabled: true,
      conditions: [{
        metric: 'recoveryRate',
        operator: 'lt',
        threshold: 0.7, // 70%
        timeWindow: 600000, // 10 minutes
        aggregation: 'avg',
      }],
      operator: 'AND',
      alertType: AlertType.RECOVERY_FAILURE,
      severity: AlertSeverity.MEDIUM,
      cooldownPeriod: 900000, // 15 minutes
      notifications: [],
      suggestedActions: ['Review recovery strategies', 'Check error patterns'],
      autoResolvable: true,
      autoResolveCondition: '{metrics.recoveryRate} > 0.85',
    };

    // Performance degradation rule
    const performanceRule: MonitoringRule = {
      id: 'performance_degradation',
      name: 'Performance Degradation',
      description: 'Detect significant performance impacts',
      enabled: true,
      conditions: [{
        metric: 'pageLoadTime',
        operator: 'gt',
        threshold: 3000, // 3 seconds
        timeWindow: 300000,
        aggregation: 'avg',
      }],
      operator: 'AND',
      alertType: AlertType.PERFORMANCE_DEGRADATION,
      severity: AlertSeverity.MEDIUM,
      cooldownPeriod: 600000,
      notifications: [],
      suggestedActions: ['Optimize error handling', 'Check resource usage'],
      autoResolvable: true,
      autoResolveCondition: '{metrics.pageLoadTime} < 2000',
    };

    // Add default rules
    this.addRule(errorSpikeRule);
    this.addRule(recoveryFailureRule);
    this.addRule(performanceRule);
  }
}

// ============================================================================
// SUPPORTING CLASSES
// ============================================================================

/**
 * Real-time metrics collector
 */
export class MetricsCollector {
  private config: ErrorAnalyticsConfig;
  private isCollecting = false;
  private currentMetrics: RealTimeMetrics;
  private recentEvents: ErrorEvent[] = [];
  private collectionTimer?: NodeJS.Timeout;

  constructor(config: ErrorAnalyticsConfig) {
    this.config = config;
    this.currentMetrics = this.createEmptyMetrics();
  }

  public start(): void {
    if (this.isCollecting) return;
    this.isCollecting = true;

    // Start periodic metrics calculation
    this.collectionTimer = setInterval(() => {
      this.calculateMetrics();
    }, 30000); // Every 30 seconds
  }

  public stop(): void {
    this.isCollecting = false;
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }
  }

  public async processEvent(event: ErrorEvent): Promise<void> {
    this.recentEvents.push(event);

    // Keep only recent events (last 5 minutes)
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    this.recentEvents = this.recentEvents.filter(e => e.timestamp > cutoff);

    // Update metrics incrementally
    this.updateMetricsIncremental(event);
  }

  public getCurrentMetrics(): RealTimeMetrics {
    return { ...this.currentMetrics };
  }

  public updateConfig(newConfig: ErrorAnalyticsConfig): void {
    this.config = newConfig;
  }

  private createEmptyMetrics(): RealTimeMetrics {
    return {
      timestamp: new Date(),
      errorRate: 0,
      errorsPerMinute: 0,
      averageResolutionTime: 0,
      recoveryRate: 0,
      activeUsers: 0,
      systemHealth: 100,
      pageLoadTime: 0,
      apiResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      errorsByType: {},
      errorsBySeverity: {},
      affectedUsers: 0,
      bounceRate: 0,
      sessionDuration: 0,
    };
  }

  private calculateMetrics(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // Calculate metrics from recent events
    const recentEvents = this.recentEvents.filter(e => e.timestamp > oneMinuteAgo);

    this.currentMetrics = {
      timestamp: now,
      errorRate: this.calculateErrorRate(recentEvents),
      errorsPerMinute: recentEvents.length,
      averageResolutionTime: this.calculateAverageResolutionTime(recentEvents),
      recoveryRate: this.calculateRecoveryRate(recentEvents),
      activeUsers: this.calculateActiveUsers(recentEvents),
      systemHealth: this.calculateSystemHealth(recentEvents),
      pageLoadTime: this.getPageLoadTime(),
      apiResponseTime: this.getApiResponseTime(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      errorsByType: this.calculateErrorsByType(recentEvents),
      errorsBySeverity: this.calculateErrorsBySeverity(recentEvents),
      affectedUsers: this.calculateAffectedUsers(recentEvents),
      bounceRate: this.getBounceRate(),
      sessionDuration: this.getSessionDuration(),
    };
  }

  private updateMetricsIncremental(event: ErrorEvent): void {
    // Update error counts
    this.currentMetrics.errorsByType[event.type] =
      (this.currentMetrics.errorsByType[event.type] || 0) + 1;
    this.currentMetrics.errorsBySeverity[event.severity] =
      (this.currentMetrics.errorsBySeverity[event.severity] || 0) + 1;
  }

  private calculateErrorRate(events: ErrorEvent[]): number {
    // Simplified calculation - would need more sophisticated logic in production
    return events.length / 60; // errors per second
  }

  private calculateAverageResolutionTime(events: ErrorEvent[]): number {
    const resolvedEvents = events.filter(e => e.recoveryTime && e.recoverySuccessful);
    if (resolvedEvents.length === 0) return 0;

    const totalTime = resolvedEvents.reduce((sum, e) => sum + (e.recoveryTime || 0), 0);
    return totalTime / resolvedEvents.length;
  }

  private calculateRecoveryRate(events: ErrorEvent[]): number {
    const recoveryEvents = events.filter(e => e.recoveryAttempted);
    if (recoveryEvents.length === 0) return 1; // No recovery attempts = 100% rate

    const successfulRecoveries = recoveryEvents.filter(e => e.recoverySuccessful);
    return successfulRecoveries.length / recoveryEvents.length;
  }

  private calculateActiveUsers(events: ErrorEvent[]): number {
    const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId!));
    return uniqueUsers.size;
  }

  private calculateSystemHealth(events: ErrorEvent[]): number {
    const criticalErrors = events.filter(e => e.severity === 'critical').length;
    const healthScore = Math.max(0, 100 - (criticalErrors * 10));
    return healthScore;
  }

  private calculateErrorsByType(events: ErrorEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });
    return counts;
  }

  private calculateErrorsBySeverity(events: ErrorEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    events.forEach(event => {
      counts[event.severity] = (counts[event.severity] || 0) + 1;
    });
    return counts;
  }

  private calculateAffectedUsers(events: ErrorEvent[]): number {
    return this.calculateActiveUsers(events);
  }

  private getPageLoadTime(): number {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation.loadEventEnd - navigation.loadEventStart;
    }
    return 0;
  }

  private getApiResponseTime(): number {
    // Would track API response times
    return 0;
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getCPUUsage(): number {
    // Would track CPU usage
    return 0;
  }

  private getBounceRate(): number {
    // Would calculate actual bounce rate
    return 0.1; // 10%
  }

  private getSessionDuration(): number {
    // Would calculate actual session duration
    return 180; // 3 minutes
  }
}

/**
 * Rule engine for evaluating monitoring conditions
 */
export class RuleEngine extends EventEmitter {
  private rules = new Map<string, MonitoringRule>();
  private ruleCooldowns = new Map<string, Date>();

  public addRule(rule: MonitoringRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.ruleCooldowns.delete(ruleId);
  }

  public async evaluateEvent(event: ErrorEvent, metrics: RealTimeMetrics): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (this.isRuleInCooldown(rule.id)) continue;

      // Evaluate rule conditions
      if (await this.evaluateRule(rule, event, metrics)) {
        await this.triggerRule(rule, event, metrics);
        this.setRuleCooldown(rule.id);
      }
    }
  }

  private async evaluateRule(
    rule: MonitoringRule,
    event: ErrorEvent,
    metrics: RealTimeMetrics
  ): Promise<boolean> {
    const results = await Promise.all(
      rule.conditions.map(condition => this.evaluateCondition(condition, event, metrics))
    );

    return rule.operator === 'AND' ? results.every(r => r) : results.some(r => r);
  }

  private async evaluateCondition(
    condition: MonitoringCondition,
    event: ErrorEvent,
    metrics: RealTimeMetrics
  ): Promise<boolean> {
    const value = this.getMetricValue(condition.metric, event, metrics);
    const threshold = condition.threshold;

    switch (condition.operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  private getMetricValue(metric: string, event: ErrorEvent, metrics: RealTimeMetrics): number {
    switch (metric) {
      case 'errorRate': return metrics.errorRate;
      case 'recoveryRate': return metrics.recoveryRate;
      case 'pageLoadTime': return metrics.pageLoadTime;
      case 'averageResolutionTime': return metrics.averageResolutionTime;
      case 'systemHealth': return metrics.systemHealth;
      case 'errorsPerMinute': return metrics.errorsPerMinute;
      default: return 0;
    }
  }

  private async triggerRule(
    rule: MonitoringRule,
    event: ErrorEvent,
    metrics: RealTimeMetrics
  ): Promise<void> {
    const alert: MonitoringAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: rule.alertType,
      severity: rule.severity,
      title: rule.name,
      description: `Monitoring rule triggered: ${rule.description}`,
      timestamp: new Date(),
      affectedSystems: ['error-analytics'],
      errorTypes: [event.type],
      userImpact: 'medium',
      metricName: rule.conditions[0].metric,
      currentValue: this.getMetricValue(rule.conditions[0].metric, event, metrics),
      threshold: rule.conditions[0].threshold,
      deviation: 0, // Would calculate actual deviation
      status: 'active',
      metadata: {
        ruleId: rule.id,
        triggeringEvent: event.id,
      },
      correlations: [],
      suggestedActions: rule.suggestedActions || [],
      autoResolvable: rule.autoResolve || false,
      autoResolveCondition: rule.autoResolve?.condition,
    };

    this.emit('alert', alert);
  }

  private isRuleInCooldown(ruleId: string): boolean {
    const cooldownEnd = this.ruleCooldowns.get(ruleId);
    if (!cooldownEnd) return false;
    return new Date() < cooldownEnd;
  }

  private setRuleCooldown(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    const cooldownEnd = new Date(Date.now() + rule.cooldownPeriod);
    this.ruleCooldowns.set(ruleId, cooldownEnd);
  }
}

/**
 * Alert management service
 */
export class AlertManager extends EventEmitter {
  private alerts = new Map<string, MonitoringAlert>();

  public async createAlert(alert: MonitoringAlert): Promise<void> {
    this.alerts.set(alert.id, alert);
    this.emit('alertCreated', alert);
  }

  public async updateAlert(alert: MonitoringAlert): Promise<void> {
    this.alerts.set(alert.id, alert);
    this.emit('alertUpdated', alert);
  }

  public async deleteAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      this.alerts.delete(alertId);
      this.emit('alertDeleted', alert);
    }
  }

  public getAlert(alertId: string): MonitoringAlert | undefined {
    return this.alerts.get(alertId);
  }

  public getAllAlerts(): MonitoringAlert[] {
    return Array.from(this.alerts.values());
  }
}

/**
 * Notification service for alerts
 */
export class NotificationService {
  private config: ErrorAnalyticsConfig;

  constructor(config: ErrorAnalyticsConfig) {
    this.config = config;
  }

  public async sendAlert(alert: MonitoringAlert): Promise<void> {
    if (!this.config.enableAlerts) return;

    try {
      // Send webhook notifications
      for (const webhook of this.config.alertWebhooks) {
        await this.sendWebhook(webhook, alert);
      }

      // In production, would also send email, Slack, etc.
      console.log(`[NotificationService] Alert sent: ${alert.title}`);
    } catch (error) {
      console.error('[NotificationService] Failed to send alert:', error);
    }
  }

  private async sendWebhook(webhook: string, alert: MonitoringAlert): Promise<void> {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: {
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          timestamp: alert.timestamp,
          metricName: alert.metricName,
          currentValue: alert.currentValue,
          threshold: alert.threshold,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  }

  public updateConfig(newConfig: ErrorAnalyticsConfig): void {
    this.config = newConfig;
  }
}

/**
 * Real-time anomaly detection
 */
export class RealTimeAnomalyDetector extends EventEmitter {
  private eventHistory: ErrorEvent[] = [];
  private metricsHistory: RealTimeMetrics[] = [];

  public async analyzeEvent(event: ErrorEvent): Promise<AnomalyDetectionResult[]> {
    this.eventHistory.push(event);

    // Keep history manageable
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-500);
    }

    const anomalies: AnomalyDetectionResult[] = [];

    // Check for error spikes
    const spikeAnomaly = this.detectErrorSpike();
    if (spikeAnomaly) anomalies.push(spikeAnomaly);

    // Check for new error patterns
    const patternAnomaly = this.detectNewPattern(event);
    if (patternAnomaly) anomalies.push(patternAnomaly);

    // Emit anomalies
    anomalies.forEach(anomaly => this.emit('anomaly', anomaly));

    return anomalies;
  }

  private detectErrorSpike(): AnomalyDetectionResult | null {
    const recentEvents = this.eventHistory.filter(e =>
      Date.now() - e.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentEvents.length > 50) { // More than 50 errors in 5 minutes
      return {
        anomalyType: 'spike',
        severity: 'high',
        description: `Error spike detected: ${recentEvents.length} errors in the last 5 minutes`,
        affectedMetrics: ['errorRate'],
        startTime: recentEvents[0]?.timestamp || new Date(),
        recommendation: 'Investigate recent changes and system status',
      };
    }

    return null;
  }

  private detectNewPattern(event: ErrorEvent): AnomalyDetectionResult | null {
    // Check if this error type is new
    const previousEvents = this.eventHistory.filter(e => e.id !== event.id);
    const sameTypeEvents = previousEvents.filter(e => e.type === event.type);

    if (sameTypeEvents.length === 0) {
      return {
        anomalyType: 'new_error',
        severity: 'medium',
        description: `New error type detected: ${event.type}`,
        affectedMetrics: ['errorTypes'],
        startTime: event.timestamp,
        recommendation: `Investigate ${event.type} error and add appropriate handling`,
      };
    }

    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create error monitoring system with configuration
 */
export function createErrorMonitoringSystem(config: ErrorAnalyticsConfig): ErrorMonitoringSystem {
  return new ErrorMonitoringSystem(config);
}

/**
 * Get default error monitoring system
 */
export function getErrorMonitoringSystem(): ErrorMonitoringSystem {
  const config = {
    enableRealTimeCollection: true,
    enableUserBehaviorTracking: true,
    enablePerformanceMetrics: true,
    enableSystemInfoCollection: true,
    defaultConsentLevel: 'functional' as any,
    dataRetentionDays: 90,
    anonymizePII: true,
    gdprCompliant: true,
    storageQuota: 50,
    batchSize: 100,
    processingInterval: 60000,
    enableCompression: true,
    enableAlerts: true,
    errorRateThreshold: 0.05,
    criticalErrorThreshold: 0.01,
    alertWebhooks: [],
    enableDashboard: true,
    refreshInterval: 30000,
    exportFormats: ['json', 'csv'] as any,
    enableSampling: false,
    sampleRate: 1.0,
    enableAggregation: true,
    aggregationWindow: 300000,
  };

  return new ErrorMonitoringSystem(config);
}
