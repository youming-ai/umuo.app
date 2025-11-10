/**
 * Comprehensive Error Analytics and Tracking System
 *
 * Advanced analytics system for collecting, analyzing, and tracking errors
 * across the umuo.app application to provide insights for improvement
 * and proactive error prevention.
 *
 * @version 1.0.0
 * @author umuo.app
 */

import { AppError } from "@/lib/utils/error-handler";
import {
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  ErrorContext,
  ErrorPattern,
  ErrorCluster,
  ErrorClassifier,
} from "./error-classifier";

// ============================================================================
// CORE TYPES AND INTERFACES
// ============================================================================

/**
 * Error event captured for analytics
 */
export interface ErrorEvent {
  // Basic error information
  id: string;
  timestamp: Date;
  type: ErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;

  // Context information
  context: ErrorContext;
  userAgent: string;
  url: string;
  sessionId: string;
  userId?: string;

  // System information
  systemInfo: SystemInfo;
  performanceMetrics: PerformanceMetrics;

  // User behavior during error
  userBehavior: UserBehaviorMetrics;

  // Recovery information
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  recoveryStrategy?: string;
  recoveryTime?: number;

  // Privacy and compliance
  piiAnonymized: boolean;
  consentLevel: ConsentLevel;
}

/**
 * System information at time of error
 */
export interface SystemInfo {
  platform: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  screenResolution?: string;
  language: string;
  timezone: string;
  connectionType?: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  batteryLevel?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * Performance metrics at time of error
 */
export interface PerformanceMetrics {
  pageLoadTime?: number;
  domContentLoaded?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  memoryUsed?: number;
  memoryTotal?: number;
  activeRequests?: number;
  networkLatency?: number;
}

/**
 * User behavior metrics during error scenarios
 */
export interface UserBehaviorMetrics {
  sessionDuration: number;
  pageViews: number;
  recentActions: UserAction[];
  timeToRecovery?: number;
  abandonmentRate: number;
  retryAttempts: number;
  errorFrequency: number;
  lastSuccessfulAction?: Date;
}

/**
 * User action tracking
 */
export interface UserAction {
  type: 'click' | 'scroll' | 'input' | 'navigation' | 'media' | 'upload';
  timestamp: Date;
  target?: string;
  value?: string;
  duration?: number;
}

/**
 * Analytics aggregation data
 */
export interface ErrorAnalyticsData {
  timeRange: {
    start: Date;
    end: Date;
  };

  totalErrors: number;
  uniqueUsers: number;
  errorRate: number;
  recoveryRate: number;
  averageResolutionTime: number;

  // Error distribution
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;

  // Trends and patterns
  hourlyDistribution: number[];
  dailyDistribution: number[];
  weeklyTrends: number[];

  // Performance impact
  performanceImpact: PerformanceImpactMetrics;
  userImpact: UserImpactMetrics;

  // Top errors
  topErrors: ErrorSummary[];
  errorClusters: ErrorCluster[];

  // Recovery analytics
  recoveryAnalytics: RecoveryAnalytics;
}

/**
 * Performance impact metrics
 */
export interface PerformanceImpactMetrics {
  averagePageLoadIncrease: number;
  bounceRateIncrease: number;
  sessionDurationDecrease: number;
  conversionRateImpact: number;
  resourceUtilizationImpact: number;
}

/**
 * User impact metrics
 */
export interface UserImpactMetrics {
  affectedUsers: number;
  userRetentionImpact: number;
  userSatisfactionImpact: number;
  supportRequestsGenerated: number;
  userChurnRisk: number;
}

/**
 * Error summary for dashboard display
 */
export interface ErrorSummary {
  type: ErrorType;
  category: ErrorCategory;
  message: string;
  count: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  avgResolutionTime: number;
  recoveryRate: number;
  userImpact: 'low' | 'medium' | 'high' | 'critical';
  lastOccurred: Date;
}

/**
 * Recovery analytics data
 */
export interface RecoveryAnalytics {
  totalRecoveryAttempts: number;
  successfulRecoveries: number;
  recoveryStrategies: Record<string, RecoveryStrategyStats>;
  averageRecoveryTime: number;
  recoverySuccessRate: number;
  strategyEffectiveness: Record<string, number>;
}

/**
 * Recovery strategy statistics
 */
export interface RecoveryStrategyStats {
  attempts: number;
  successes: number;
  averageTime: number;
  successRate: number;
  errorTypesHandled: ErrorType[];
}

/**
 * Consent levels for privacy compliance
 */
export enum ConsentLevel {
  NONE = 'none',
  ESSENTIAL = 'essential',
  FUNCTIONAL = 'functional',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
}

/**
 * Analytics configuration
 */
export interface ErrorAnalyticsConfig {
  // Data collection
  enableRealTimeCollection: boolean;
  enableUserBehaviorTracking: boolean;
  enablePerformanceMetrics: boolean;
  enableSystemInfoCollection: boolean;

  // Privacy and compliance
  defaultConsentLevel: ConsentLevel;
  dataRetentionDays: number;
  anonymizePII: boolean;
  gdprCompliant: boolean;

  // Storage and processing
  storageQuota: number; // MB
  batchSize: number;
  processingInterval: number; // ms
  enableCompression: boolean;

  // Alerts and monitoring
  enableAlerts: boolean;
  errorRateThreshold: number;
  criticalErrorThreshold: number;
  alertWebhooks: string[];

  // Dashboard and reporting
  enableDashboard: boolean;
  refreshInterval: number; // ms
  exportFormats: ('json' | 'csv' | 'pdf')[];

  // Performance optimization
  enableSampling: boolean;
  sampleRate: number;
  enableAggregation: boolean;
  aggregationWindow: number; // ms
}

/**
 * Pattern recognition result
 */
export interface PatternRecognitionResult {
  pattern: ErrorPattern;
  confidence: number;
  frequency: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  prediction: {
    nextOccurrence?: Date;
    probability: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetectionResult {
  anomalyType: 'spike' | 'pattern' | 'new_error' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedMetrics: string[];
  startTime: Date;
  endTime?: Date;
  recommendation: string;
}

/**
 * Analytics dashboard data
 */
export interface DashboardData {
  overview: {
    totalErrors: number;
    errorRate: number;
    recoveryRate: number;
    averageResolutionTime: number;
    trendDirection: 'improving' | 'degrading' | 'stable';
  };

  realTimeAlerts: AnomalyDetectionResult[];
  topErrors: ErrorSummary[];
  errorTrends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };

  performanceImpact: PerformanceImpactMetrics;
  userImpact: UserImpactMetrics;
  recoveryAnalytics: RecoveryAnalytics;

  predictions: PatternRecognitionResult[];
  recommendations: string[];
}

// ============================================================================
// MAIN ERROR ANALYTICS CLASS
// ============================================================================

/**
 * Comprehensive error analytics system
 */
export class ErrorAnalytics {
  private static instance: ErrorAnalytics;
  private config: ErrorAnalyticsConfig;
  private errorEvents: ErrorEvent[] = [];
  private isCollecting = false;
  private processingTimer?: NodeJS.Timeout;
  private sessionId: string;
  private consentLevel: ConsentLevel;

  // Component instances
  private collector: ErrorCollector;
  private patternAnalyzer: PatternAnalyzer;
  private metricsCalculator: MetricsCalculator;
  private dashboardGenerator: DashboardGenerator;
  private storageManager: AnalyticsStorageManager;

  private constructor(config: Partial<ErrorAnalyticsConfig> = {}) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.sessionId = this.generateSessionId();
    this.consentLevel = this.config.defaultConsentLevel;

    // Initialize components
    this.collector = new ErrorCollector(this.config);
    this.patternAnalyzer = new PatternAnalyzer();
    this.metricsCalculator = new MetricsCalculator();
    this.dashboardGenerator = new DashboardGenerator();
    this.storageManager = new AnalyticsStorageManager(this.config);

    this.initialize();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<ErrorAnalyticsConfig>): ErrorAnalytics {
    if (!ErrorAnalytics.instance) {
      ErrorAnalytics.instance = new ErrorAnalytics(config);
    }
    return ErrorAnalytics.instance;
  }

  /**
   * Initialize the analytics system
   */
  private initialize(): void {
    if (this.config.enableRealTimeCollection) {
      this.startCollection();
    }

    // Set up periodic processing
    if (this.config.processingInterval > 0) {
      this.processingTimer = setInterval(() => {
        this.processAnalytics();
      }, this.config.processingInterval);
    }

    // Set up error handlers to capture unhandled errors
    this.setupGlobalErrorHandlers();
  }

  /**
   * Start collecting error events
   */
  public startCollection(): void {
    if (this.isCollecting) return;

    this.isCollecting = true;
    this.collector.start();

    console.log('[ErrorAnalytics] Started error collection');
  }

  /**
   * Stop collecting error events
   */
  public stopCollection(): void {
    this.isCollecting = false;
    this.collector.stop();

    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }

    console.log('[ErrorAnalytics] Stopped error collection');
  }

  /**
   * Record an error event
   */
  public async recordError(error: AppError, additionalContext?: Partial<ErrorContext>): Promise<void> {
    if (!this.isCollecting) return;

    try {
      const errorEvent = await this.collector.createErrorEvent(error, additionalContext);
      this.errorEvents.push(errorEvent);

      // Process in real-time if enabled
      if (this.config.enableRealTimeCollection) {
        this.processSingleError(errorEvent);
      }

      // Check for immediate alerts
      await this.checkForAlerts(errorEvent);

    } catch (collectionError) {
      console.error('[ErrorAnalytics] Failed to record error:', collectionError);
    }
  }

  /**
   * Process analytics data
   */
  private async processAnalytics(): Promise<void> {
    if (this.errorEvents.length === 0) return;

    try {
      // Store events
      await this.storageManager.storeEvents(this.errorEvents);

      // Process patterns and metrics
      const patterns = await this.patternAnalyzer.analyzePatterns(this.errorEvents);
      const metrics = await this.metricsCalculator.calculateMetrics(this.errorEvents);

      // Clear processed events
      this.errorEvents = [];

      console.log('[ErrorAnalytics] Processed analytics data:', {
        eventsProcessed: this.errorEvents.length,
        patternsDetected: patterns.length,
        metricsCalculated: Object.keys(metrics).length,
      });

    } catch (processingError) {
      console.error('[ErrorAnalytics] Failed to process analytics:', processingError);
    }
  }

  /**
   * Process a single error event for real-time analysis
   */
  private async processSingleError(errorEvent: ErrorEvent): Promise<void> {
    try {
      // Real-time pattern detection
      const patterns = await this.patternAnalyzer.analyzeSingleEvent(errorEvent);

      // Update metrics incrementally
      this.metricsCalculator.updateMetrics(errorEvent);

      // Check for immediate anomalies
      const anomalies = await this.detectAnomalies(errorEvent);

      if (anomalies.length > 0) {
        await this.triggerAlerts(anomalies);
      }

    } catch (error) {
      console.error('[ErrorAnalytics] Failed to process single error:', error);
    }
  }

  /**
   * Get comprehensive analytics data
   */
  public async getAnalyticsData(timeRange?: { start: Date; end: Date }): Promise<ErrorAnalyticsData> {
    try {
      const events = await this.storageManager.getEvents(timeRange);
      return this.metricsCalculator.calculateMetrics(events);
    } catch (error) {
      console.error('[ErrorAnalytics] Failed to get analytics data:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data
   */
  public async getDashboardData(): Promise<DashboardData> {
    try {
      const analyticsData = await this.getAnalyticsData();
      const patterns = await this.patternAnalyzer.getRecentPatterns();
      const anomalies = await this.detectAnomalies();

      return this.dashboardGenerator.generateDashboard(
        analyticsData,
        patterns,
        anomalies
      );
    } catch (error) {
      console.error('[ErrorAnalytics] Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in error patterns
   */
  public async detectAnomalies(triggerEvent?: ErrorEvent): Promise<AnomalyDetectionResult[]> {
    try {
      const events = triggerEvent
        ? [...this.errorEvents, triggerEvent]
        : await this.storageManager.getRecentEvents();

      return this.patternAnalyzer.detectAnomalies(events);
    } catch (error) {
      console.error('[ErrorAnalytics] Failed to detect anomalies:', error);
      return [];
    }
  }

  /**
   * Get error predictions based on patterns
   */
  public async getPredictions(errorType?: ErrorType): Promise<PatternRecognitionResult[]> {
    try {
      return this.patternAnalyzer.getPredictions(errorType);
    } catch (error) {
      console.error('[ErrorAnalytics] Failed to get predictions:', error);
      return [];
    }
  }

  /**
   * Export analytics data
   */
  public async exportData(
    format: 'json' | 'csv' | 'pdf',
    timeRange?: { start: Date; end: Date }
  ): Promise<Blob> {
    try {
      const analyticsData = await this.getAnalyticsData(timeRange);
      return this.dashboardGenerator.exportData(analyticsData, format);
    } catch (error) {
      console.error('[ErrorAnalytics] Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ErrorAnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update component configurations
    this.collector.updateConfig(this.config);
    this.storageManager.updateConfig(this.config);

    // Restart collection if needed
    if (this.config.enableRealTimeCollection && !this.isCollecting) {
      this.startCollection();
    } else if (!this.config.enableRealTimeCollection && this.isCollecting) {
      this.stopCollection();
    }
  }

  /**
   * Set user consent level
   */
  public setConsentLevel(level: ConsentLevel): void {
    this.consentLevel = level;
    this.collector.setConsentLevel(level);

    // Remove data that exceeds consent level
    this.storageManager.filterByConsentLevel(level);
  }

  /**
   * Get current configuration
   */
  public getConfig(): ErrorAnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Clear all analytics data
   */
  public async clearData(): Promise<void> {
    this.errorEvents = [];
    await this.storageManager.clearData();
    this.patternAnalyzer.clearCache();
    this.metricsCalculator.reset();
  }

  /**
   * Get system health status
   */
  public async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: Record<string, number>;
  }> {
    try {
      const analyticsData = await this.getAnalyticsData();
      const anomalies = await this.detectAnomalies();

      const status = this.calculateHealthStatus(analyticsData, anomalies);
      const issues = this.identifyHealthIssues(analyticsData, anomalies);
      const metrics = this.extractHealthMetrics(analyticsData);

      return { status, issues, metrics };
    } catch (error) {
      console.error('[ErrorAnalytics] Failed to get system health:', error);
      return {
        status: 'critical',
        issues: ['Failed to retrieve health metrics'],
        metrics: {},
      };
    }
  }

  // Private helper methods
  private getDefaultConfig(): ErrorAnalyticsConfig {
    return {
      enableRealTimeCollection: true,
      enableUserBehaviorTracking: true,
      enablePerformanceMetrics: true,
      enableSystemInfoCollection: true,
      defaultConsentLevel: ConsentLevel.FUNCTIONAL,
      dataRetentionDays: 90,
      anonymizePII: true,
      gdprCompliant: true,
      storageQuota: 50, // 50MB
      batchSize: 100,
      processingInterval: 60000, // 1 minute
      enableCompression: true,
      enableAlerts: true,
      errorRateThreshold: 0.05, // 5%
      criticalErrorThreshold: 0.01, // 1%
      alertWebhooks: [],
      enableDashboard: true,
      refreshInterval: 30000, // 30 seconds
      exportFormats: ['json', 'csv'],
      enableSampling: false,
      sampleRate: 1.0,
      enableAggregation: true,
      aggregationWindow: 300000, // 5 minutes
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      // Global error handler
      window.addEventListener('error', (event) => {
        const appError = ErrorHandler.classifyError(event.error, {
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
        this.recordError(appError);
      });

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        const appError = ErrorHandler.classifyError(event.reason, {
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
        this.recordError(appError);
      });
    }
  }

  private async checkForAlerts(errorEvent: ErrorEvent): Promise<void> {
    if (!this.config.enableAlerts) return;

    try {
      const anomalies = await this.detectAnomalies(errorEvent);
      if (anomalies.length > 0) {
        await this.triggerAlerts(anomalies);
      }
    } catch (error) {
      console.error('[ErrorAnalytics] Failed to check for alerts:', error);
    }
  }

  private async triggerAlerts(anomalies: AnomalyDetectionResult[]): Promise<void> {
    const criticalAnomalies = anomalies.filter(a =>
      a.severity === 'high' || a.severity === 'critical'
    );

    if (criticalAnomalies.length === 0) return;

    // Send webhook alerts
    for (const webhook of this.config.alertWebhooks) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'error_analytics_alert',
            anomalies: criticalAnomalies,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (webhookError) {
        console.error('[ErrorAnalytics] Failed to send webhook alert:', webhookError);
      }
    }

    // Console alert for development
    console.warn('[ErrorAnalytics] Critical anomalies detected:', criticalAnomalies);
  }

  private calculateHealthStatus(
    analyticsData: ErrorAnalyticsData,
    anomalies: AnomalyDetectionResult[]
  ): 'healthy' | 'warning' | 'critical' {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    const highAnomalies = anomalies.filter(a => a.severity === 'high');

    if (criticalAnomalies.length > 0 || analyticsData.errorRate > this.config.criticalErrorThreshold) {
      return 'critical';
    }

    if (highAnomalies.length > 0 || analyticsData.errorRate > this.config.errorRateThreshold) {
      return 'warning';
    }

    return 'healthy';
  }

  private identifyHealthIssues(
    analyticsData: ErrorAnalyticsData,
    anomalies: AnomalyDetectionResult[]
  ): string[] {
    const issues: string[] = [];

    if (analyticsData.errorRate > this.config.errorRateThreshold) {
      issues.push(`High error rate: ${(analyticsData.errorRate * 100).toFixed(2)}%`);
    }

    if (analyticsData.recoveryRate < 0.8) {
      issues.push(`Low recovery rate: ${(analyticsData.recoveryRate * 100).toFixed(2)}%`);
    }

    if (analyticsData.averageResolutionTime > 30000) {
      issues.push(`Slow resolution time: ${(analyticsData.averageResolutionTime / 1000).toFixed(1)}s`);
    }

    anomalies.forEach(anomaly => {
      issues.push(`${anomaly.anomalyType}: ${anomaly.description}`);
    });

    return issues;
  }

  private extractHealthMetrics(analyticsData: ErrorAnalyticsData): Record<string, number> {
    return {
      errorRate: analyticsData.errorRate,
      recoveryRate: analyticsData.recoveryRate,
      averageResolutionTime: analyticsData.averageResolutionTime,
      totalErrors: analyticsData.totalErrors,
      uniqueUsers: analyticsData.uniqueUsers,
      bounceRateIncrease: analyticsData.performanceImpact.bounceRateIncrease,
      sessionDurationDecrease: analyticsData.performanceImpact.sessionDurationDecrease,
      userRetentionImpact: analyticsData.userImpact.userRetentionImpact,
    };
  }

  /**
   * Destroy the analytics system and cleanup resources
   */
  public destroy(): void {
    this.stopCollection();
    this.storageManager.destroy();
    this.patternAnalyzer.clearCache();
    this.metricsCalculator.reset();
    ErrorAnalytics.instance = null as any;
  }
}

// ============================================================================
// ERROR COLLECTOR COMPONENT
// ============================================================================

/**
 * Error event collector and context enrichment
 */
export class ErrorCollector {
  private config: ErrorAnalyticsConfig;
  private isCollecting = false;
  private consentLevel: ConsentLevel;
  private actionTracker: UserActionTracker;
  private performanceMonitor: PerformanceMonitor;
  private systemInfoCollector: SystemInfoCollector;

  constructor(config: ErrorAnalyticsConfig) {
    this.config = config;
    this.consentLevel = config.defaultConsentLevel;
    this.actionTracker = new UserActionTracker();
    this.performanceMonitor = new PerformanceMonitor();
    this.systemInfoCollector = new SystemInfoCollector();
  }

  /**
   * Start error collection
   */
  public start(): void {
    if (this.isCollecting) return;

    this.isCollecting = true;

    if (this.config.enableUserBehaviorTracking) {
      this.actionTracker.start();
    }

    if (this.config.enablePerformanceMetrics) {
      this.performanceMonitor.start();
    }
  }

  /**
   * Stop error collection
   */
  public stop(): void {
    this.isCollecting = false;
    this.actionTracker.stop();
    this.performanceMonitor.stop();
  }

  /**
   * Create an error event from an AppError
   */
  public async createErrorEvent(
    error: AppError,
    additionalContext?: Partial<ErrorContext>
  ): Promise<ErrorEvent> {
    const classifier = ErrorClassifier.getInstance();
    const context = await this.enrichContext(error.context, additionalContext);

    // Get enriched information
    const systemInfo = this.config.enableSystemInfoCollection
      ? await this.systemInfoCollector.collect()
      : this.getMinimalSystemInfo();

    const performanceMetrics = this.config.enablePerformanceMetrics
      ? await this.performanceMonitor.getCurrentMetrics()
      : {};

    const userBehavior = this.config.enableUserBehaviorTracking
      ? await this.actionTracker.getCurrentBehavior()
      : this.getMinimalUserBehavior();

    // Generate unique ID
    const id = this.generateErrorId(error);

    return {
      id,
      timestamp: new Date(),
      type: error.type as ErrorType,
      category: classifier.getCategoryForType(error.type as ErrorType),
      severity: classifier.classifySeverity(error),
      message: error.message,
      stack: error.stack,
      context,
      userAgent: this.getUserAgent(),
      url: this.getCurrentUrl(),
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      systemInfo,
      performanceMetrics,
      userBehavior,
      recoveryAttempted: false,
      recoverySuccessful: false,
      piiAnonymized: this.config.anonymizePII,
      consentLevel: this.consentLevel,
    };
  }

  /**
   * Update collector configuration
   */
  public updateConfig(newConfig: ErrorAnalyticsConfig): void {
    this.config = newConfig;

    if (this.config.enableUserBehaviorTracking && !this.actionTracker.isActive()) {
      this.actionTracker.start();
    } else if (!this.config.enableUserBehaviorTracking && this.actionTracker.isActive()) {
      this.actionTracker.stop();
    }

    if (this.config.enablePerformanceMetrics && !this.performanceMonitor.isActive()) {
      this.performanceMonitor.start();
    } else if (!this.config.enablePerformanceMetrics && this.performanceMonitor.isActive()) {
      this.performanceMonitor.stop();
    }
  }

  /**
   * Set consent level for data collection
   */
  public setConsentLevel(level: ConsentLevel): void {
    this.consentLevel = level;
    this.actionTracker.setConsentLevel(level);
    this.performanceMonitor.setConsentLevel(level);
    this.systemInfoCollector.setConsentLevel(level);
  }

  // Private helper methods
  private async enrichContext(
    baseContext?: AppError["context"],
    additionalContext?: Partial<ErrorContext>
  ): Promise<ErrorContext> {
    const classifier = ErrorClassifier.getInstance();
    const errorContext = await classifier.enrichContext(baseContext || {}, additionalContext || {});

    return {
      ...errorContext,
      sessionId: this.getSessionId(),
      timestamp: new Date(),
    };
  }

  private generateErrorId(error: AppError): string {
    const timestamp = Date.now();
    const hash = this.simpleHash(JSON.stringify({
      message: error.message,
      type: error.type,
      url: error.context?.url,
    }));

    return `error_${timestamp}_${hash.substr(0, 8)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getUserAgent(): string {
    return typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown';
  }

  private getCurrentUrl(): string {
    return typeof window !== 'undefined' ? window.location.href : 'Unknown';
  }

  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('errorAnalyticsSessionId');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('errorAnalyticsSessionId', sessionId);
      }
      return sessionId;
    }
    return 'server_session';
  }

  private getUserId(): string | undefined {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('errorAnalyticsUserId') || undefined;
    }
    return undefined;
  }

  private getMinimalSystemInfo(): SystemInfo {
    return {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      deviceType: 'desktop',
      language: 'en',
      timezone: 'UTC',
    };
  }

  private getMinimalUserBehavior(): UserBehaviorMetrics {
    return {
      sessionDuration: 0,
      pageViews: 1,
      recentActions: [],
      abandonmentRate: 0,
      retryAttempts: 0,
      errorFrequency: 1,
    };
  }
}

// ============================================================================
// PATTERN ANALYZER COMPONENT
// ============================================================================

/**
 * Pattern recognition and anomaly detection engine
 */
export class PatternAnalyzer {
  private patternCache: Map<string, PatternRecognitionResult> = new Map();
  private anomalyDetector: AnomalyDetector;
  private predictionEngine: PredictionEngine;

  constructor() {
    this.anomalyDetector = new AnomalyDetector();
    this.predictionEngine = new PredictionEngine();
  }

  /**
   * Analyze patterns in error events
   */
  public async analyzePatterns(events: ErrorEvent[]): Promise<PatternRecognitionResult[]> {
    const patterns: PatternRecognitionResult[] = [];

    try {
      // Group errors by type and analyze frequency patterns
      const errorsByType = this.groupErrorsByType(events);

      for (const [errorType, typeEvents] of errorsByType) {
        const pattern = await this.analyzeErrorTypePattern(errorType, typeEvents);
        if (pattern.confidence > 0.5) {
          patterns.push(pattern);
        }
      }

      // Analyze temporal patterns
      const temporalPatterns = await this.analyzeTemporalPatterns(events);
      patterns.push(...temporalPatterns);

      // Update cache
      patterns.forEach(pattern => {
        this.patternCache.set(pattern.pattern.id, pattern);
      });

    } catch (error) {
      console.error('[PatternAnalyzer] Failed to analyze patterns:', error);
    }

    return patterns;
  }

  /**
   * Analyze a single error event for patterns
   */
  public async analyzeSingleEvent(event: ErrorEvent): Promise<PatternRecognitionResult[]> {
    const patterns: PatternRecognitionResult[] = [];

    try {
      // Check if this event matches existing patterns
      for (const [patternId, cachedPattern] of this.patternCache) {
        const match = this.matchesPattern(event, cachedPattern.pattern);
        if (match) {
          // Update pattern frequency and prediction
          const updatedPattern = await this.updatePattern(cachedPattern, event);
          patterns.push(updatedPattern);
        }
      }

      // Check for new patterns
      const newPatterns = await this.identifyNewPatterns([event]);
      patterns.push(...newPatterns);

    } catch (error) {
      console.error('[PatternAnalyzer] Failed to analyze single event:', error);
    }

    return patterns;
  }

  /**
   * Detect anomalies in error events
   */
  public async detectAnomalies(events: ErrorEvent[]): Promise<AnomalyDetectionResult[]> {
    return this.anomalyDetector.detect(events);
  }

  /**
   * Get predictions based on patterns
   */
  public async getPredictions(errorType?: ErrorType): Promise<PatternRecognitionResult[]> {
    const predictions: PatternRecognitionResult[] = [];

    try {
      for (const [patternId, pattern] of this.patternCache) {
        if (!errorType || pattern.pattern.errorTypes.includes(errorType)) {
          const prediction = await this.predictionEngine.predict(pattern.pattern);
          if (prediction.probability > 0.3) {
            predictions.push({
              ...pattern,
              prediction,
            });
          }
        }
      }
    } catch (error) {
      console.error('[PatternAnalyzer] Failed to get predictions:', error);
    }

    return predictions.sort((a, b) => b.prediction.probability - a.prediction.probability);
  }

  /**
   * Get recent patterns from cache
   */
  public getRecentPatterns(): PatternRecognitionResult[] {
    return Array.from(this.patternCache.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * Clear pattern cache
   */
  public clearCache(): void {
    this.patternCache.clear();
    this.anomalyDetector.clearHistory();
    this.predictionEngine.clearCache();
  }

  // Private helper methods
  private groupErrorsByType(events: ErrorEvent[]): Map<ErrorType, ErrorEvent[]> {
    const groups = new Map<ErrorType, ErrorEvent[]>();

    events.forEach(event => {
      if (!groups.has(event.type)) {
        groups.set(event.type, []);
      }
      groups.get(event.type)!.push(event);
    });

    return groups;
  }

  private async analyzeErrorTypePattern(
    errorType: ErrorType,
    events: ErrorEvent[]
  ): Promise<PatternRecognitionResult> {
    // Calculate frequency and trend
    const frequency = this.calculateFrequency(events);
    const trend = this.calculateTrend(events);

    // Identify pattern characteristics
    const pattern: ErrorPattern = {
      id: `pattern_${errorType}_${Date.now()}`,
      name: `${errorType} Pattern`,
      description: `Pattern detected for ${errorType} errors`,
      errorTypes: [errorType],
      conditions: [],
      frequency: frequency,
      severity: this.calculatePatternSeverity(events),
      userImpact: this.calculateUserImpact(events),
      recoveryStrategies: [],
      lastOccurrence: new Date(Math.max(...events.map(e => e.timestamp.getTime()))),
    };

    // Generate prediction
    const prediction = await this.predictionEngine.predict(pattern);

    return {
      pattern,
      confidence: this.calculateConfidence(events),
      frequency,
      trend,
      prediction,
    };
  }

  private async analyzeTemporalPatterns(events: ErrorEvent[]): Promise<PatternRecognitionResult[]> {
    const patterns: PatternRecognitionResult[] = [];

    try {
      // Analyze hourly patterns
      const hourlyPattern = this.analyzeHourlyPattern(events);
      if (hourlyPattern) patterns.push(hourlyPattern);

      // Analyze daily patterns
      const dailyPattern = this.analyzeDailyPattern(events);
      if (dailyPattern) patterns.push(dailyPattern);

      // Analyze weekly patterns
      const weeklyPattern = this.analyzeWeeklyPattern(events);
      if (weeklyPattern) patterns.push(weeklyPattern);

    } catch (error) {
      console.error('[PatternAnalyzer] Failed to analyze temporal patterns:', error);
    }

    return patterns;
  }

  private async identifyNewPatterns(events: ErrorEvent[]): Promise<PatternRecognitionResult[]> {
    // Implementation for identifying new patterns
    // This would involve machine learning or statistical analysis
    return [];
  }

  private matchesPattern(event: ErrorEvent, pattern: ErrorPattern): boolean {
    return pattern.errorTypes.includes(event.type);
  }

  private async updatePattern(
    existingPattern: PatternRecognitionResult,
    newEvent: ErrorEvent
  ): Promise<PatternRecognitionResult> {
    // Update frequency and prediction
    const updatedPattern = {
      ...existingPattern,
      frequency: existingPattern.frequency + 1,
      pattern: {
        ...existingPattern.pattern,
        frequency: existingPattern.pattern.frequency + 1,
        lastOccurrence: newEvent.timestamp,
      },
      prediction: await this.predictionEngine.predict(existingPattern.pattern),
    };

    // Update cache
    this.patternCache.set(existingPattern.pattern.id, updatedPattern);

    return updatedPattern;
  }

  private calculateFrequency(events: ErrorEvent[]): number {
    if (events.length === 0) return 0;

    const timeSpan = this.getTimeSpan(events);
    return events.length / (timeSpan / (1000 * 60 * 60)); // per hour
  }

  private calculateTrend(events: ErrorEvent[]): 'increasing' | 'decreasing' | 'stable' {
    if (events.length < 3) return 'stable';

    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstHalf = sortedEvents.slice(0, Math.floor(sortedEvents.length / 2));
    const secondHalf = sortedEvents.slice(Math.floor(sortedEvents.length / 2));

    const firstHalfFreq = this.calculateFrequency(firstHalf);
    const secondHalfFreq = this.calculateFrequency(secondHalf);

    const changeRatio = secondHalfFreq / firstHalfFreq;

    if (changeRatio > 1.2) return 'increasing';
    if (changeRatio < 0.8) return 'decreasing';
    return 'stable';
  }

  private calculateConfidence(events: ErrorEvent[]): number {
    if (events.length < 5) return 0.3;
    if (events.length < 10) return 0.5;
    if (events.length < 20) return 0.7;
    return 0.9;
  }

  private calculatePatternSeverity(events: ErrorEvent[]): ErrorSeverity {
    const severityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    events.forEach(event => {
      severityCounts[event.severity]++;
    });

    const maxSeverity = Object.entries(severityCounts)
      .sort(([, a], [, b]) => b - a)[0][0];

    return maxSeverity as ErrorSeverity;
  }

  private calculateUserImpact(events: ErrorEvent[]): 'low' | 'medium' | 'high' | 'critical' {
    const totalImpact = events.reduce((sum, event) => {
      const impactValue = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      }[event.severity];
      return sum + impactValue;
    }, 0);

    const averageImpact = totalImpact / events.length;

    if (averageImpact < 1.5) return 'low';
    if (averageImpact < 2.5) return 'medium';
    if (averageImpact < 3.5) return 'high';
    return 'critical';
  }

  private getTimeSpan(events: ErrorEvent[]): number {
    if (events.length === 0) return 0;

    const timestamps = events.map(e => e.timestamp.getTime());
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  private analyzeHourlyPattern(events: ErrorEvent[]): PatternRecognitionResult | null {
    // Analyze errors by hour of day
    const hourlyDistribution = new Array(24).fill(0);

    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourlyDistribution[hour]++;
    });

    // Check for significant hourly patterns
    const maxHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
    const avgHourly = hourlyDistribution.reduce((a, b) => a + b, 0) / 24;

    if (hourlyDistribution[maxHour] > avgHourly * 2) {
      // Significant pattern detected
      const pattern: ErrorPattern = {
        id: `hourly_pattern_${Date.now()}`,
        name: `Hourly Error Pattern - ${maxHour}:00`,
        description: `Errors peak at ${maxHour}:00`,
        errorTypes: [...new Set(events.map(e => e.type))],
        conditions: [],
        frequency: hourlyDistribution[maxHour] / (events.length / 24),
        severity: this.calculatePatternSeverity(events),
        userImpact: this.calculateUserImpact(events),
        recoveryStrategies: [],
        lastOccurrence: new Date(Math.max(...events.map(e => e.timestamp.getTime()))),
      };

      return {
        pattern,
        confidence: 0.7,
        frequency: pattern.frequency,
        trend: 'stable',
        prediction: {
          nextOccurrence: this.getNextHourlyOccurrence(maxHour),
          probability: 0.6,
          riskLevel: 'medium',
        },
      };
    }

    return null;
  }

  private analyzeDailyPattern(events: ErrorEvent[]): PatternRecognitionResult | null {
    // Analyze errors by day of week
    const dailyDistribution = new Array(7).fill(0);

    events.forEach(event => {
      const day = event.timestamp.getDay();
      dailyDistribution[day]++;
    });

    const maxDay = dailyDistribution.indexOf(Math.max(...dailyDistribution));
    const avgDaily = dailyDistribution.reduce((a, b) => a + b, 0) / 7;

    if (dailyDistribution[maxDay] > avgDaily * 1.5) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      const pattern: ErrorPattern = {
        id: `daily_pattern_${Date.now()}`,
        name: `Daily Error Pattern - ${dayNames[maxDay]}`,
        description: `Errors peak on ${dayNames[maxDay]}`,
        errorTypes: [...new Set(events.map(e => e.type))],
        conditions: [],
        frequency: dailyDistribution[maxDay] / (events.length / 7),
        severity: this.calculatePatternSeverity(events),
        userImpact: this.calculateUserImpact(events),
        recoveryStrategies: [],
        lastOccurrence: new Date(Math.max(...events.map(e => e.timestamp.getTime()))),
      };

      return {
        pattern,
        confidence: 0.6,
        frequency: pattern.frequency,
        trend: 'stable',
        prediction: {
          nextOccurrence: this.getNextDailyOccurrence(maxDay),
          probability: 0.5,
          riskLevel: 'low',
        },
      };
    }

    return null;
  }

  private analyzeWeeklyPattern(events: ErrorEvent[]): PatternRecognitionResult | null {
    // Implementation for weekly pattern analysis
    return null;
  }

  private getNextHourlyOccurrence(hour: number): Date {
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, 0, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  private getNextDailyOccurrence(day: number): Date {
    const now = new Date();
    const next = new Date(now);
    const currentDay = now.getDay();

    const daysToAdd = day >= currentDay ? day - currentDay : 7 - (currentDay - day);
    next.setDate(now.getDate() + daysToAdd);
    next.setHours(0, 0, 0, 0);

    return next;
  }
}

// ============================================================================
// METRICS CALCULATOR COMPONENT
// ============================================================================

/**
 * Performance and user impact metrics calculator
 */
export class MetricsCalculator {
  private metricsCache: Map<string, any> = new Map();

  /**
   * Calculate comprehensive metrics from error events
   */
  public async calculateMetrics(events: ErrorEvent[]): Promise<ErrorAnalyticsData> {
    if (events.length === 0) {
      return this.getEmptyMetrics();
    }

    try {
      const timeRange = this.getTimeRange(events);

      return {
        timeRange,
        totalErrors: events.length,
        uniqueUsers: this.calculateUniqueUsers(events),
        errorRate: this.calculateErrorRate(events),
        recoveryRate: this.calculateRecoveryRate(events),
        averageResolutionTime: this.calculateAverageResolutionTime(events),

        errorsByCategory: this.calculateErrorsByCategory(events),
        errorsByType: this.calculateErrorsByType(events),
        errorsBySeverity: this.calculateErrorsBySeverity(events),

        hourlyDistribution: this.calculateHourlyDistribution(events),
        dailyDistribution: this.calculateDailyDistribution(events),
        weeklyTrends: this.calculateWeeklyTrends(events),

        performanceImpact: this.calculatePerformanceImpact(events),
        userImpact: this.calculateUserImpact(events),

        topErrors: this.calculateTopErrors(events),
        errorClusters: await this.calculateErrorClusters(events),

        recoveryAnalytics: this.calculateRecoveryAnalytics(events),
      };
    } catch (error) {
      console.error('[MetricsCalculator] Failed to calculate metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Update metrics incrementally with new error event
   */
  public updateMetrics(event: ErrorEvent): void {
    // Update cached metrics incrementally
    const cacheKey = 'current_metrics';
    const existingMetrics = this.metricsCache.get(cacheKey) || this.getEmptyMetrics();

    // Update metrics with new event
    const updatedMetrics = {
      ...existingMetrics,
      totalErrors: existingMetrics.totalErrors + 1,
      timeRange: {
        start: existingMetrics.timeRange.start,
        end: new Date(),
      },
    };

    this.metricsCache.set(cacheKey, updatedMetrics);
  }

  /**
   * Reset metrics cache
   */
  public reset(): void {
    this.metricsCache.clear();
  }

  // Private helper methods
  private getEmptyMetrics(): ErrorAnalyticsData {
    const now = new Date();
    return {
      timeRange: { start: now, end: now },
      totalErrors: 0,
      uniqueUsers: 0,
      errorRate: 0,
      recoveryRate: 0,
      averageResolutionTime: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsByType: {} as Record<ErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      hourlyDistribution: new Array(24).fill(0),
      dailyDistribution: new Array(7).fill(0),
      weeklyTrends: new Array(52).fill(0),
      performanceImpact: this.getEmptyPerformanceImpact(),
      userImpact: this.getEmptyUserImpact(),
      topErrors: [],
      errorClusters: [],
      recoveryAnalytics: this.getEmptyRecoveryAnalytics(),
    };
  }

  private getTimeRange(events: ErrorEvent[]): { start: Date; end: Date } {
    const timestamps = events.map(e => e.timestamp.getTime());
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };
  }

  private calculateUniqueUsers(events: ErrorEvent[]): number {
    const uniqueUserIds = new Set(
      events
        .filter(e => e.userId)
        .map(e => e.userId!)
    );
    return uniqueUserIds.size;
  }

  private calculateErrorRate(events: ErrorEvent[]): number {
    // This would require session/page view data for accurate calculation
    // For now, return a simplified metric
    const timeSpan = this.getTimeSpanInHours(events);
    return timeSpan > 0 ? events.length / timeSpan : 0;
  }

  private calculateRecoveryRate(events: ErrorEvent[]): number {
    const recoveryEvents = events.filter(e => e.recoveryAttempted);
    if (recoveryEvents.length === 0) return 0;

    const successfulRecoveries = recoveryEvents.filter(e => e.recoverySuccessful);
    return successfulRecoveries.length / recoveryEvents.length;
  }

  private calculateAverageResolutionTime(events: ErrorEvent[]): number {
    const resolvedEvents = events.filter(e => e.recoveryTime && e.recoverySuccessful);
    if (resolvedEvents.length === 0) return 0;

    const totalTime = resolvedEvents.reduce((sum, e) => sum + (e.recoveryTime || 0), 0);
    return totalTime / resolvedEvents.length;
  }

  private calculateErrorsByCategory(events: ErrorEvent[]): Record<ErrorCategory, number> {
    const categories = {} as Record<ErrorCategory, number>;

    events.forEach(event => {
      categories[event.category] = (categories[event.category] || 0) + 1;
    });

    return categories;
  }

  private calculateErrorsByType(events: ErrorEvent[]): Record<ErrorType, number> {
    const types = {} as Record<ErrorType, number>;

    events.forEach(event => {
      types[event.type] = (types[event.type] || 0) + 1;
    });

    return types;
  }

  private calculateErrorsBySeverity(events: ErrorEvent[]): Record<ErrorSeverity, number> {
    const severities = {} as Record<ErrorSeverity, number>;

    events.forEach(event => {
      severities[event.severity] = (severities[event.severity] || 0) + 1;
    });

    return severities;
  }

  private calculateHourlyDistribution(events: ErrorEvent[]): number[] {
    const distribution = new Array(24).fill(0);

    events.forEach(event => {
      const hour = event.timestamp.getHours();
      distribution[hour]++;
    });

    return distribution;
  }

  private calculateDailyDistribution(events: ErrorEvent[]): number[] {
    const distribution = new Array(7).fill(0);

    events.forEach(event => {
      const day = event.timestamp.getDay();
      distribution[day]++;
    });

    return distribution;
  }

  private calculateWeeklyTrends(events: ErrorEvent[]): number[] {
    const distribution = new Array(52).fill(0);

    events.forEach(event => {
      const week = this.getWeekOfYear(event.timestamp);
      if (week >= 0 && week < 52) {
        distribution[week]++;
      }
    });

    return distribution;
  }

  private calculatePerformanceImpact(events: ErrorEvent[]): PerformanceImpactMetrics {
    // Calculate performance metrics from events
    const performanceEvents = events.filter(e => e.performanceMetrics);

    if (performanceEvents.length === 0) {
      return this.getEmptyPerformanceImpact();
    }

    const avgLoadTime = performanceEvents.reduce((sum, e) =>
      sum + (e.performanceMetrics.pageLoadTime || 0), 0) / performanceEvents.length;

    return {
      averagePageLoadIncrease: avgLoadTime - 2000, // Assuming 2s baseline
      bounceRateIncrease: this.estimateBounceRateIncrease(events),
      sessionDurationDecrease: this.estimateSessionDurationDecrease(events),
      conversionRateImpact: this.estimateConversionRateImpact(events),
      resourceUtilizationImpact: this.estimateResourceUtilizationImpact(events),
    };
  }

  private calculateUserImpact(events: ErrorEvent[]): UserImpactMetrics {
    const uniqueUsers = this.calculateUniqueUsers(events);
    const affectedUsers = uniqueUsers;

    return {
      affectedUsers,
      userRetentionImpact: this.estimateRetentionImpact(events),
      userSatisfactionImpact: this.estimateSatisfactionImpact(events),
      supportRequestsGenerated: this.estimateSupportRequests(events),
      userChurnRisk: this.estimateChurnRisk(events),
    };
  }

  private calculateTopErrors(events: ErrorEvent[]): ErrorSummary[] {
    const errorsByType = this.calculateErrorsByType(events);
    const totalEvents = events.length;

    return Object.entries(errorsByType)
      .map(([type, count]) => ({
        type: type as ErrorType,
        category: this.getCategoryForType(type as ErrorType),
        message: this.getCommonMessage(type as ErrorType, events),
        count,
        percentage: (count / totalEvents) * 100,
        trend: this.calculateTrendForType(type as ErrorType, events),
        avgResolutionTime: this.calculateAvgResolutionTimeForType(type as ErrorType, events),
        recoveryRate: this.calculateRecoveryRateForType(type as ErrorType, events),
        userImpact: this.calculateUserImpactForType(type as ErrorType, events),
        lastOccurred: this.getLastOccurrenceForType(type as ErrorType, events),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async calculateErrorClusters(events: ErrorEvent[]): Promise<ErrorCluster[]> {
    // Implementation for error clustering
    // This would use clustering algorithms to group related errors
    return [];
  }

  private calculateRecoveryAnalytics(events: ErrorEvent[]): RecoveryAnalytics {
    const recoveryEvents = events.filter(e => e.recoveryAttempted);
    const successfulRecoveries = recoveryEvents.filter(e => e.recoverySuccessful);

    const strategies = {} as Record<string, RecoveryStrategyStats>;

    recoveryEvents.forEach(event => {
      if (event.recoveryStrategy) {
        if (!strategies[event.recoveryStrategy]) {
          strategies[event.recoveryStrategy] = {
            attempts: 0,
            successes: 0,
            averageTime: 0,
            successRate: 0,
            errorTypesHandled: [],
          };
        }

        const strategy = strategies[event.recoveryStrategy];
        strategy.attempts++;
        strategy.errorTypesHandled.push(event.type);

        if (event.recoverySuccessful) {
          strategy.successes++;
          if (event.recoveryTime) {
            strategy.averageTime = (strategy.averageTime + event.recoveryTime) / 2;
          }
        }

        strategy.successRate = strategy.successes / strategy.attempts;
        strategy.errorTypesHandled = [...new Set(strategy.errorTypesHandled)];
      }
    });

    return {
      totalRecoveryAttempts: recoveryEvents.length,
      successfulRecoveries: successfulRecoveries.length,
      recoveryStrategies: strategies,
      averageRecoveryTime: this.calculateAverageResolutionTime(events),
      recoverySuccessRate: this.calculateRecoveryRate(events),
      strategyEffectiveness: this.calculateStrategyEffectiveness(strategies),
    };
  }

  // Helper methods for metric calculations
  private getTimeSpanInHours(events: ErrorEvent[]): number {
    if (events.length === 0) return 0;

    const timestamps = events.map(e => e.timestamp.getTime());
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    return timeSpan / (1000 * 60 * 60);
  }

  private getWeekOfYear(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private getCategoryForType(type: ErrorType): ErrorCategory {
    const classifier = ErrorClassifier.getInstance();
    return classifier.getCategoryForType(type);
  }

  private getCommonMessage(type: ErrorType, events: ErrorEvent[]): string {
    const typeEvents = events.filter(e => e.type === type);
    const messages = typeEvents.map(e => e.message);

    // Find the most common message
    const messageCounts = messages.reduce((acc, msg) => {
      acc[msg] = (acc[msg] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(messageCounts)
      .sort(([, a], [, b]) => b - a)[0][0];
  }

  private calculateTrendForType(type: ErrorType, events: ErrorEvent[]): 'increasing' | 'decreasing' | 'stable' {
    const typeEvents = events.filter(e => e.type === type);
    if (typeEvents.length < 3) return 'stable';

    const sortedEvents = typeEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstHalf = sortedEvents.slice(0, Math.floor(sortedEvents.length / 2));
    const secondHalf = sortedEvents.slice(Math.floor(sortedEvents.length / 2));

    const timeSpan1 = this.getTimeSpanInHours(firstHalf) || 1;
    const timeSpan2 = this.getTimeSpanInHours(secondHalf) || 1;

    const rate1 = firstHalf.length / timeSpan1;
    const rate2 = secondHalf.length / timeSpan2;

    if (rate2 > rate1 * 1.2) return 'increasing';
    if (rate2 < rate1 * 0.8) return 'decreasing';
    return 'stable';
  }

  private calculateAvgResolutionTimeForType(type: ErrorType, events: ErrorEvent[]): number {
    const typeEvents = events.filter(e => e.type === type && e.recoveryTime);
    if (typeEvents.length === 0) return 0;

    const totalTime = typeEvents.reduce((sum, e) => sum + (e.recoveryTime || 0), 0);
    return totalTime / typeEvents.length;
  }

  private calculateRecoveryRateForType(type: ErrorType, events: ErrorEvent[]): number {
    const typeEvents = events.filter(e => e.type === type && e.recoveryAttempted);
    if (typeEvents.length === 0) return 0;

    const successful = typeEvents.filter(e => e.recoverySuccessful);
    return successful.length / typeEvents.length;
  }

  private calculateUserImpactForType(type: ErrorType, events: ErrorEvent[]): 'low' | 'medium' | 'high' | 'critical' {
    const typeEvents = events.filter(e => e.type === type);
    const severityScore = typeEvents.reduce((sum, e) => {
      const scores = { low: 1, medium: 2, high: 3, critical: 4 };
      return sum + scores[e.severity];
    }, 0);

    const avgScore = severityScore / typeEvents.length;

    if (avgScore < 1.5) return 'low';
    if (avgScore < 2.5) return 'medium';
    if (avgScore < 3.5) return 'high';
    return 'critical';
  }

  private getLastOccurrenceForType(type: ErrorType, events: ErrorEvent[]): Date {
    const typeEvents = events.filter(e => e.type === type);
    return new Date(Math.max(...typeEvents.map(e => e.timestamp.getTime())));
  }

  private getEmptyPerformanceImpact(): PerformanceImpactMetrics {
    return {
      averagePageLoadIncrease: 0,
      bounceRateIncrease: 0,
      sessionDurationDecrease: 0,
      conversionRateImpact: 0,
      resourceUtilizationImpact: 0,
    };
  }

  private getEmptyUserImpact(): UserImpactMetrics {
    return {
      affectedUsers: 0,
      userRetentionImpact: 0,
      userSatisfactionImpact: 0,
      supportRequestsGenerated: 0,
      userChurnRisk: 0,
    };
  }

  private getEmptyRecoveryAnalytics(): RecoveryAnalytics {
    return {
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0,
      recoveryStrategies: {},
      averageRecoveryTime: 0,
      recoverySuccessRate: 0,
      strategyEffectiveness: {},
    };
  }

  private estimateBounceRateIncrease(events: ErrorEvent[]): number {
    // Simplified estimation based on error frequency and severity
    const criticalErrors = events.filter(e => e.severity === 'critical').length;
    const totalErrors = events.length;

    return (criticalErrors / totalErrors) * 0.1; // Max 10% increase
  }

  private estimateSessionDurationDecrease(events: ErrorEvent[]): number {
    const avgSeverityScore = events.reduce((sum, e) => {
      const scores = { low: 1, medium: 2, high: 3, critical: 4 };
      return sum + scores[e.severity];
    }, 0) / events.length;

    return avgSeverityScore * 30; // 30 seconds decrease per severity point
  }

  private estimateConversionRateImpact(events: ErrorEvent[]): number {
    const highSeverityErrors = events.filter(e =>
      e.severity === 'high' || e.severity === 'critical'
    ).length;

    return -(highSeverityErrors / events.length) * 0.05; // Negative impact
  }

  private estimateResourceUtilizationImpact(events: ErrorEvent[]): number {
    // Estimate based on performance metrics in events
    const performanceEvents = events.filter(e => e.performanceMetrics);
    if (performanceEvents.length === 0) return 0;

    const avgMemoryUsage = performanceEvents.reduce((sum, e) =>
      sum + (e.performanceMetrics.memoryUsed || 0), 0) / performanceEvents.length;

    return (avgMemoryUsage / 1000000) * 0.1; // Convert to percentage
  }

  private estimateRetentionImpact(events: ErrorEvent[]): number {
    const uniqueUsers = this.calculateUniqueUsers(events);
    if (uniqueUsers === 0) return 0;

    const errorRate = events.length / uniqueUsers;
    return Math.min(errorRate * 0.1, 0.5); // Max 50% impact
  }

  private estimateSatisfactionImpact(events: ErrorEvent[]): number {
    const avgSeverityScore = events.reduce((sum, e) => {
      const scores = { low: 1, medium: 2, high: 3, critical: 4 };
      return sum + scores[e.severity];
    }, 0) / events.length;

    return -(avgSeverityScore - 1) * 0.25; // Negative impact
  }

  private estimateSupportRequests(events: ErrorEvent[]): number {
    const criticalErrors = events.filter(e => e.severity === 'critical').length;
    const highErrors = events.filter(e => e.severity === 'high').length;

    return Math.ceil(criticalErrors * 0.3 + highErrors * 0.1);
  }

  private estimateChurnRisk(events: ErrorEvent[]): number {
    const uniqueUsers = this.calculateUniqueUsers(events);
    if (uniqueUsers === 0) return 0;

    const errorsPerUser = events.length / uniqueUsers;
    const criticalErrorsPerUser = events.filter(e => e.severity === 'critical').length / uniqueUsers;

    return Math.min(errorsPerUser * 0.1 + criticalErrorsPerUser * 0.5, 1.0);
  }

  private calculateStrategyEffectiveness(strategies: Record<string, RecoveryStrategyStats>): Record<string, number> {
    const effectiveness: Record<string, number> = {};

    Object.entries(strategies).forEach(([strategy, stats]) => {
      effectiveness[strategy] = stats.successRate;
    });

    return effectiveness;
  }
}

// ============================================================================
// DASHBOARD GENERATOR COMPONENT
// ============================================================================

/**
 * Dashboard data generation and export utilities
 */
export class DashboardGenerator {
  /**
   * Generate comprehensive dashboard data
   */
  public generateDashboard(
    analyticsData: ErrorAnalyticsData,
    patterns: PatternRecognitionResult[],
    anomalies: AnomalyDetectionResult[]
  ): DashboardData {
    return {
      overview: this.generateOverview(analyticsData),
      realTimeAlerts: anomalies.filter(a => a.severity === 'high' || a.severity === 'critical'),
      topErrors: analyticsData.topErrors,
      errorTrends: {
        hourly: analyticsData.hourlyDistribution,
        daily: analyticsData.dailyDistribution,
        weekly: analyticsData.weeklyTrends,
      },
      performanceImpact: analyticsData.performanceImpact,
      userImpact: analyticsData.userImpact,
      recoveryAnalytics: analyticsData.recoveryAnalytics,
      predictions: patterns,
      recommendations: this.generateRecommendations(analyticsData, patterns, anomalies),
    };
  }

  /**
   * Export analytics data in various formats
   */
  public async exportData(
    analyticsData: ErrorAnalyticsData,
    format: 'json' | 'csv' | 'pdf'
  ): Promise<Blob> {
    switch (format) {
      case 'json':
        return this.exportAsJSON(analyticsData);
      case 'csv':
        return this.exportAsCSV(analyticsData);
      case 'pdf':
        return this.exportAsPDF(analyticsData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods
  private generateOverview(analyticsData: ErrorAnalyticsData) {
    return {
      totalErrors: analyticsData.totalErrors,
      errorRate: analyticsData.errorRate,
      recoveryRate: analyticsData.recoveryRate,
      averageResolutionTime: analyticsData.averageResolutionTime,
      trendDirection: this.calculateTrendDirection(analyticsData),
    };
  }

  private calculateTrendDirection(analyticsData: ErrorAnalyticsData): 'improving' | 'degrading' | 'stable' {
    // Simple trend calculation based on recovery rate and resolution time
    if (analyticsData.recoveryRate > 0.8 && analyticsData.averageResolutionTime < 10000) {
      return 'improving';
    }
    if (analyticsData.recoveryRate < 0.5 || analyticsData.averageResolutionTime > 60000) {
      return 'degrading';
    }
    return 'stable';
  }

  private generateRecommendations(
    analyticsData: ErrorAnalyticsData,
    patterns: PatternRecognitionResult[],
    anomalies: AnomalyDetectionResult[]
  ): string[] {
    const recommendations: string[] = [];

    // Error rate recommendations
    if (analyticsData.errorRate > 0.05) {
      recommendations.push('High error rate detected. Consider reviewing error-prone areas and implementing preventive measures.');
    }

    // Recovery rate recommendations
    if (analyticsData.recoveryRate < 0.7) {
      recommendations.push('Low recovery rate. Review and improve recovery strategies for better user experience.');
    }

    // Performance impact recommendations
    if (analyticsData.performanceImpact.averagePageLoadIncrease > 1000) {
      recommendations.push('Significant page load impact detected. Optimize error handling to minimize performance impact.');
    }

    // Pattern-based recommendations
    patterns.forEach(pattern => {
      if (pattern.trend === 'increasing' && pattern.confidence > 0.7) {
        recommendations.push(`Growing pattern detected: ${pattern.pattern.name}. Implement targeted fixes.`);
      }
    });

    // Anomaly-based recommendations
    anomalies.forEach(anomaly => {
      if (anomaly.severity === 'critical') {
        recommendations.push(`Critical anomaly: ${anomaly.description}. Immediate attention required.`);
      }
    });

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  private async exportAsJSON(analyticsData: ErrorAnalyticsData): Promise<Blob> {
    const json = JSON.stringify(analyticsData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  private async exportAsCSV(analyticsData: ErrorAnalyticsData): Promise<Blob> {
    const headers = [
      'Timestamp', 'Error Type', 'Category', 'Severity', 'Message',
      'Recovery Attempted', 'Recovery Successful', 'Resolution Time'
    ];

    const csvRows = [headers.join(',')];

    // Add error summary data
    analyticsData.topErrors.forEach(error => {
      const row = [
        error.lastOccurred.toISOString(),
        error.type,
        error.category,
        error.userImpact,
        `"${error.message}"`,
        'N/A', // Not available in summary
        `${error.recoveryRate}`,
        `${error.avgResolutionTime}`
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }

  private async exportAsPDF(analyticsData: ErrorAnalyticsData): Promise<Blob> {
    // For PDF export, we would typically use a library like jsPDF
    // For now, return a simple text-based report
    const report = this.generateTextReport(analyticsData);
    return new Blob([report], { type: 'text/plain' });
  }

  private generateTextReport(analyticsData: ErrorAnalyticsData): string {
    let report = 'ERROR ANALYTICS REPORT\n';
    report += '=' .repeat(50) + '\n\n';

    report += `Period: ${analyticsData.timeRange.start.toISOString()} to ${analyticsData.timeRange.end.toISOString()}\n`;
    report += `Total Errors: ${analyticsData.totalErrors}\n`;
    report += `Unique Users Affected: ${analyticsData.uniqueUsers}\n`;
    report += `Error Rate: ${(analyticsData.errorRate * 100).toFixed(2)}%\n`;
    report += `Recovery Rate: ${(analyticsData.recoveryRate * 100).toFixed(2)}%\n`;
    report += `Average Resolution Time: ${(analyticsData.averageResolutionTime / 1000).toFixed(1)}s\n\n`;

    report += 'TOP ERRORS\n';
    report += '-'.repeat(30) + '\n';
    analyticsData.topErrors.forEach((error, index) => {
      report += `${index + 1}. ${error.type} (${error.count} occurrences)\n`;
      report += `   Message: ${error.message}\n`;
      report += `   Recovery Rate: ${(error.recoveryRate * 100).toFixed(1)}%\n`;
      report += `   User Impact: ${error.userImpact}\n\n`;
    });

    return report;
  }
}

// ============================================================================
// SUPPORTING CLASSES (Simplified implementations)
// ============================================================================

/**
 * User action tracker for behavior analytics
 */
export class UserActionTracker {
  private isTracking = false;
  private actions: UserAction[] = [];
  private consentLevel: ConsentLevel = ConsentLevel.FUNCTIONAL;

  public start(): void {
    if (this.isTracking) return;
    this.isTracking = true;
    // Implementation would track user interactions
  }

  public stop(): void {
    this.isTracking = false;
  }

  public isActive(): boolean {
    return this.isTracking;
  }

  public setConsentLevel(level: ConsentLevel): void {
    this.consentLevel = level;
  }

  public async getCurrentBehavior(): Promise<UserBehaviorMetrics> {
    return {
      sessionDuration: Date.now() - (this.actions[0]?.timestamp.getTime() || Date.now()),
      pageViews: this.actions.filter(a => a.type === 'navigation').length,
      recentActions: this.actions.slice(-10),
      abandonmentRate: 0,
      retryAttempts: this.actions.filter(a => a.type === 'click').length,
      errorFrequency: 0,
    };
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private isMonitoring = false;
  private consentLevel: ConsentLevel = ConsentLevel.FUNCTIONAL;

  public start(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    // Implementation would monitor performance metrics
  }

  public stop(): void {
    this.isMonitoring = false;
  }

  public isActive(): boolean {
    return this.isMonitoring;
  }

  public setConsentLevel(level: ConsentLevel): void {
    this.consentLevel = level;
  }

  public async getCurrentMetrics(): Promise<PerformanceMetrics> {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      return {
        pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        memoryUsed: (performance as any).memory?.usedJSHeapSize,
      };
    }

    return {};
  }
}

/**
 * System information collector
 */
export class SystemInfoCollector {
  private consentLevel: ConsentLevel = ConsentLevel.FUNCTIONAL;

  public setConsentLevel(level: ConsentLevel): void {
    this.consentLevel = level;
  }

  public async collect(): Promise<SystemInfo> {
    return {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      browser: typeof navigator !== 'undefined' ? this.getBrowserName() : 'Unknown',
      browserVersion: typeof navigator !== 'undefined' ? this.getBrowserVersion() : 'Unknown',
      deviceType: this.getDeviceType(),
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    if (/mobile|phone/i.test(ua)) return 'mobile';
    return 'desktop';
  }
}

/**
 * Analytics storage manager with privacy compliance
 */
export class AnalyticsStorageManager {
  private config: ErrorAnalyticsConfig;

  constructor(config: ErrorAnalyticsConfig) {
    this.config = config;
  }

  public async storeEvents(events: ErrorEvent[]): Promise<void> {
    // Implementation would store events in IndexedDB or send to server
    console.log(`Storing ${events.length} error events`);
  }

  public async getEvents(timeRange?: { start: Date; end: Date }): Promise<ErrorEvent[]> {
    // Implementation would retrieve events from storage
    return [];
  }

  public async getRecentEvents(): Promise<ErrorEvent[]> {
    // Implementation would get recent events
    return [];
  }

  public filterByConsentLevel(level: ConsentLevel): void {
    // Implementation would filter stored data by consent level
  }

  public async clearData(): Promise<void> {
    // Implementation would clear all stored data
  }

  public updateConfig(newConfig: ErrorAnalyticsConfig): void {
    this.config = newConfig;
  }

  public destroy(): void {
    // Cleanup resources
  }
}

/**
 * Anomaly detection engine
 */
export class AnomalyDetector {
  public detect(events: ErrorEvent[]): AnomalyDetectionResult[] {
    // Implementation would use statistical analysis or ML for anomaly detection
    return [];
  }

  public clearHistory(): void {
    // Clear anomaly detection history
  }
}

/**
 * Pattern prediction engine
 */
export class PredictionEngine {
  public async predict(pattern: ErrorPattern): Promise<{
    nextOccurrence?: Date;
    probability: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    // Implementation would predict next occurrence based on historical data
    return {
      probability: 0.5,
      riskLevel: 'medium',
    };
  }

  public clearCache(): void {
    // Clear prediction cache
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create and initialize error analytics with custom configuration
 */
export function createErrorAnalytics(config?: Partial<ErrorAnalyticsConfig>): ErrorAnalytics {
  return ErrorAnalytics.getInstance(config);
}

/**
 * Quick start error analytics with default configuration
 */
export function initializeErrorAnalytics(): ErrorAnalytics {
  const analytics = ErrorAnalytics.getInstance();
  analytics.startCollection();
  return analytics;
}

/**
 * Get error analytics instance
 */
export function getErrorAnalytics(): ErrorAnalytics {
  return ErrorAnalytics.getInstance();
}

/**
 * Export default analytics instance
 */
export default ErrorAnalytics;
