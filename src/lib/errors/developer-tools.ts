/**
 * Error Handling Middleware Developer Tools
 *
 * Comprehensive developer experience utilities and testing tools for the
 * error handling middleware system in umuo.app.
 *
 * This module provides:
 * - Debug mode utilities
 * - Error simulation and testing tools
 * - Performance analysis and monitoring
 * - Configuration validation and optimization
 * - Error visualization and reporting
 * - Development workflow automation
 */

import {
  errorMiddleware,
  ErrorMiddleware,
  MiddlewareContext,
  MiddlewareConfiguration,
  ErrorAnalysis,
  RecoverySuggestion
} from "./error-middleware";
import { ErrorCategory, ErrorType, ErrorSeverity } from "./error-classifier";

// ============================================================================
// DEBUG MODE UTILITIES
// ============================================================================

/**
 * Debug configuration for error middleware
 */
export interface DebugConfiguration {
  enabled: boolean;
  logLevel: "error" | "warn" | "info" | "debug" | "trace";
  consoleOutput: boolean;
  visualIndicators: boolean;
  performanceMetrics: boolean;
  errorDetails: boolean;
  stackTraces: boolean;
  contextInfo: boolean;
  recoverySteps: boolean;
  analyticsData: boolean;
}

/**
 * Enable debug mode with enhanced logging
 */
export function enableDebugMode(config: Partial<DebugConfiguration> = {}) {
  const debugConfig: DebugConfiguration = {
    enabled: true,
    logLevel: "debug",
    consoleOutput: true,
    visualIndicators: true,
    performanceMetrics: true,
    errorDetails: true,
    stackTraces: true,
    contextInfo: true,
    recoverySteps: true,
    analyticsData: true,
    ...config,
  };

  // Store debug configuration globally
  if (typeof window !== "undefined") {
    (window as any).__ERROR_MIDDLEWARE_DEBUG__ = debugConfig;
  }

  // Update middleware configuration
  errorMiddleware.configure({
    debugMode: true,
    showUserFriendlyErrors: false, // Show detailed errors in debug mode
    enablePerformanceMonitoring: true,
    logLevel: debugConfig.logLevel,
  });

  // Set up debug console overrides
  if (debugConfig.consoleOutput) {
    setupDebugConsole();
  }

  // Add visual indicators if enabled
  if (debugConfig.visualIndicators && typeof document !== "undefined") {
    addVisualDebugIndicators();
  }

  console.log("🔧 Error Middleware Debug Mode Enabled");
  console.log("Configuration:", debugConfig);
}

/**
 * Disable debug mode
 */
export function disableDebugMode() {
  if (typeof window !== "undefined") {
    delete (window as any).__ERROR_MIDDLEWARE_DEBUG__;
  }

  // Restore normal middleware configuration
  errorMiddleware.configure({
    debugMode: false,
    showUserFriendlyErrors: true,
    enablePerformanceMonitoring: true,
    logLevel: "error",
  });

  // Remove debug console overrides
  restoreConsole();

  // Remove visual indicators
  if (typeof document !== "undefined") {
    removeVisualDebugIndicators();
  }

  console.log("✅ Error Middleware Debug Mode Disabled");
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  if (typeof window !== "undefined") {
    return !!(window as any).__ERROR_MIDDLEWARE_DEBUG__;
  }
  return false;
}

/**
 * Get current debug configuration
 */
export function getDebugConfiguration(): DebugConfiguration | null {
  if (typeof window !== "undefined") {
    return (window as any).__ERROR_MIDDLEWARE_DEBUG__ || null;
  }
  return null;
}

// ============================================================================
// ERROR SIMULATION AND TESTING TOOLS
// ============================================================================

/**
 * Error simulation configuration
 */
export interface ErrorSimulation {
  type: ErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stackTrace?: string;
  context?: Partial<MiddlewareContext>;
  probability?: number; // 0-1
  delay?: number; // milliseconds
  retryable?: boolean;
}

/**
 * Error simulation test suite
 */
export class ErrorSimulationEngine {
  private simulations: Map<string, ErrorSimulation> = new Map();
  private activeSimulations: Set<string> = new Set();
  private simulationHistory: Array<{
    simulationId: string;
    timestamp: Date;
    triggered: boolean;
    result?: any;
  }> = [];

  /**
   * Register an error simulation
   */
  registerSimulation(id: string, simulation: ErrorSimulation): void {
    this.simulations.set(id, simulation);
    console.log(`📝 Registered error simulation: ${id}`);
  }

  /**
   * Remove an error simulation
   */
  removeSimulation(id: string): void {
    this.simulations.delete(id);
    this.activeSimulations.delete(id);
    console.log(`🗑️ Removed error simulation: ${id}`);
  }

  /**
   * Trigger an error simulation
   */
  async triggerSimulation(id: string): Promise<void> {
    const simulation = this.simulations.get(id);
    if (!simulation) {
      throw new Error(`Simulation not found: ${id}`);
    }

    this.activeSimulations.add(id);

    try {
      // Apply delay if specified
      if (simulation.delay) {
        await new Promise(resolve => setTimeout(resolve, simulation.delay));
      }

      // Check probability
      if (simulation.probability !== undefined && Math.random() > simulation.probability) {
        this.simulationHistory.push({
          simulationId: id,
          timestamp: new Date(),
          triggered: false,
        });
        return;
      }

      // Create simulated error
      const error = new Error(simulation.message);
      error.name = simulation.type;
      if (simulation.stackTrace) {
        error.stack = simulation.stackTrace;
      }

      // Create context
      const context: MiddlewareContext = {
        timestamp: new Date(),
        requestId: `sim_${Date.now()}`,
        sessionId: `sim_session_${Date.now()}`,
        customData: {
          simulation: true,
          simulationId: id,
          ...simulation.context,
        },
      };

      // Process error through middleware
      const result = await errorMiddleware.handleError(error, context);

      this.simulationHistory.push({
        simulationId: id,
        timestamp: new Date(),
        triggered: true,
        result,
      });

      console.log(`🚨 Triggered error simulation: ${id}`, result);
    } finally {
      this.activeSimulations.delete(id);
    }
  }

  /**
   * Get all registered simulations
   */
  getSimulations(): Array<{ id: string; simulation: ErrorSimulation }> {
    return Array.from(this.simulations.entries()).map(([id, simulation]) => ({
      id,
      simulation,
    }));
  }

  /**
   * Get simulation history
   */
  getSimulationHistory(): Array<{
    simulationId: string;
    timestamp: Date;
    triggered: boolean;
    result?: any;
  }> {
    return [...this.simulationHistory];
  }

  /**
   * Clear simulation history
   */
  clearHistory(): void {
    this.simulationHistory = [];
  }

  /**
   * Create common error simulations
   */
  createCommonSimulations(): void {
    // Network error simulation
    this.registerSimulation("network-error", {
      type: ErrorType.CONNECTION_FAILURE,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      message: "Network connection failed",
      stackTrace: `Error: Network connection failed
    at fetch (native)
    at TranscriptionService.transcribe (transcription.ts:123:15)
    at async transcriptionJob (job.ts:45:12)`,
      probability: 0.3,
      delay: 1000,
      retryable: true,
    });

    // API authentication error simulation
    this.registerSimulation("auth-error", {
      type: ErrorType.API_AUTHENTICATION,
      category: ErrorCategory.API,
      severity: ErrorSeverity.CRITICAL,
      message: "API authentication failed",
      stackTrace: `Error: API authentication failed
    at GroqClient.transcribe (groq-client.ts:67:10)
    at async transcribeWithRetry (retry-strategy.ts:34:8)`,
      probability: 0.2,
      retryable: false,
    });

    // File size error simulation
    this.registerSimulation("file-size-error", {
      type: ErrorType.FILE_TOO_LARGE,
      category: ErrorCategory.FILE_SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      message: "File size exceeds maximum limit",
      probability: 0.4,
      retryable: false,
    });

    // Transcription timeout simulation
    this.registerSimulation("transcription-timeout", {
      type: ErrorType.TRANSCRIPTION_TIMEOUT,
      category: ErrorCategory.TRANSCRIPTION,
      severity: ErrorSeverity.MEDIUM,
      message: "Transcription request timed out",
      probability: 0.25,
      delay: 5000,
      retryable: true,
    });

    // Memory error simulation
    this.registerSimulation("memory-error", {
      type: ErrorType.MEMORY_LEAK,
      category: ErrorCategory.PERFORMANCE,
      severity: ErrorSeverity.HIGH,
      message: "Out of memory error",
      probability: 0.15,
      retryable: false,
    });
  }
}

/**
 * Global error simulation engine instance
 */
export const errorSimulationEngine = new ErrorSimulationEngine();

// ============================================================================
// PERFORMANCE ANALYSIS AND MONITORING
// ============================================================================

/**
 * Performance metrics collection
 */
export interface PerformanceMetrics {
  errorCount: number;
  averageProcessingTime: number;
  maxProcessingTime: number;
  minProcessingTime: number;
  totalProcessingTime: number;
  recoveryAttempts: number;
  recoverySuccessRate: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  timeSeriesData: Array<{
    timestamp: Date;
    errorCount: number;
    avgProcessingTime: number;
  }>;
}

/**
 * Performance analyzer for error handling
 */
export class PerformanceAnalyzer {
  private metrics: PerformanceMetrics;
  private startTime: Date;
  private isCollecting = false;
  private collectionInterval?: NodeJS.Timeout;

  constructor() {
    this.metrics = this.createEmptyMetrics();
    this.startTime = new Date();
  }

  /**
   * Start performance collection
   */
  startCollection(intervalMs: number = 5000): void {
    if (this.isCollecting) return;

    this.isCollecting = true;
    this.startTime = new Date();

    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    console.log("📊 Performance analysis started");
  }

  /**
   * Stop performance collection
   */
  stopCollection(): void {
    if (!this.isCollecting) return;

    this.isCollecting = false;
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    console.log("⏹️ Performance analysis stopped");
  }

  /**
   * Collect current metrics
   */
  collectMetrics(): void {
    const stats = errorMiddleware.getStatistics();
    const currentErrorsByCategory = this.getErrorsByCategory();
    const currentErrorsByType = this.getErrorsByType();
    const currentErrorsBySeverity = this.getErrorsBySeverity();

    this.metrics.errorCount = stats.totalErrorsProcessed;
    this.metrics.averageProcessingTime = stats.averageProcessingTime;
    this.metrics.totalProcessingTime += stats.averageProcessingTime;
    this.metrics.maxProcessingTime = Math.max(this.metrics.maxProcessingTime, stats.averageProcessingTime);
    this.metrics.minProcessingTime = this.metrics.minProcessingTime === 0
      ? stats.averageProcessingTime
      : Math.min(this.metrics.minProcessingTime, stats.averageProcessingTime);

    this.metrics.recoverySuccessRate = stats.recoverySuccessRate;

    // Update error distributions
    Object.entries(currentErrorsByCategory).forEach(([category, count]) => {
      this.metrics.errorsByCategory[category as ErrorCategory] = count;
    });

    Object.entries(currentErrorsByType).forEach(([type, count]) => {
      this.metrics.errorsByType[type as ErrorType] = count;
    });

    Object.entries(currentErrorsBySeverity).forEach(([severity, count]) => {
      this.metrics.errorsBySeverity[severity as ErrorSeverity] = count;
    });

    // Add time series data point
    this.metrics.timeSeriesData.push({
      timestamp: new Date(),
      errorCount: this.metrics.errorCount,
      avgProcessingTime: this.metrics.averageProcessingTime,
    });

    // Keep only last 100 data points
    if (this.metrics.timeSeriesData.length > 100) {
      this.metrics.timeSeriesData.shift();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: {
      totalErrors: number;
      avgProcessingTime: number;
      recoverySuccessRate: number;
      collectionDuration: string;
    };
    breakdown: {
      byCategory: Record<ErrorCategory, number>;
      byType: Record<ErrorType, number>;
      bySeverity: Record<ErrorSeverity, number>;
    };
    trends: {
      errorTrend: "increasing" | "decreasing" | "stable";
      performanceTrend: "improving" | "degrading" | "stable";
      recommendations: string[];
    };
  } {
    const duration = Date.now() - this.startTime.getTime();
    const durationMinutes = Math.floor(duration / 60000);

    const summary = {
      totalErrors: this.metrics.errorCount,
      avgProcessingTime: this.metrics.averageProcessingTime,
      recoverySuccessRate: this.metrics.recoverySuccessRate,
      collectionDuration: `${durationMinutes}m ${Math.floor((duration % 60000) / 1000)}s`,
    };

    const breakdown = {
      byCategory: { ...this.metrics.errorsByCategory },
      byType: { ...this.metrics.errorsByType },
      bySeverity: { ...this.metrics.errorsBySeverity },
    };

    const trends = this.analyzeTrends();

    return { summary, breakdown, trends };
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(): {
    errorTrend: "increasing" | "decreasing" | "stable";
    performanceTrend: "improving" | "degrading" | "stable";
    recommendations: string[];
  } {
    const recentData = this.metrics.timeSeriesData.slice(-10);
    const olderData = this.metrics.timeSeriesData.slice(-20, -10);

    let errorTrend: "increasing" | "decreasing" | "stable" = "stable";
    let performanceTrend: "improving" | "degrading" | "stable" = "stable";
    const recommendations: string[] = [];

    if (recentData.length >= 5 && olderData.length >= 5) {
      const recentAvgErrors = recentData.reduce((sum, d) => sum + d.errorCount, 0) / recentData.length;
      const olderAvgErrors = olderData.reduce((sum, d) => sum + d.errorCount, 0) / olderData.length;

      const recentAvgPerf = recentData.reduce((sum, d) => sum + d.avgProcessingTime, 0) / recentData.length;
      const olderAvgPerf = olderData.reduce((sum, d) => sum + d.avgProcessingTime, 0) / olderData.length;

      if (recentAvgErrors > olderAvgErrors * 1.2) {
        errorTrend = "increasing";
        recommendations.push("Error rate is increasing. Check system health and recent changes.");
      } else if (recentAvgErrors < olderAvgErrors * 0.8) {
        errorTrend = "decreasing";
      }

      if (recentAvgPerf > olderAvgPerf * 1.2) {
        performanceTrend = "degrading";
        recommendations.push("Error processing time is degrading. Optimize error handling logic.");
      } else if (recentAvgPerf < olderAvgPerf * 0.8) {
        performanceTrend = "improving";
      }
    }

    if (this.metrics.recoverySuccessRate < 0.7) {
      recommendations.push("Recovery success rate is low. Review and improve recovery strategies.");
    }

    if (this.metrics.averageProcessingTime > 5000) {
      recommendations.push("Average processing time is high. Consider optimizing error handling performance.");
    }

    return { errorTrend, performanceTrend, recommendations };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
    this.startTime = new Date();
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      errorCount: 0,
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      minProcessingTime: 0,
      totalProcessingTime: 0,
      recoveryAttempts: 0,
      recoverySuccessRate: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsByType: {} as Record<ErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      timeSeriesData: [],
    };
  }

  /**
   * Get errors by category (mock implementation)
   */
  private getErrorsByCategory(): Record<ErrorCategory, number> {
    // This would be implemented by querying the middleware's analytics
    return {} as Record<ErrorCategory, number>;
  }

  /**
   * Get errors by type (mock implementation)
   */
  private getErrorsByType(): Record<ErrorType, number> {
    // This would be implemented by querying the middleware's analytics
    return {} as Record<ErrorType, number>;
  }

  /**
   * Get errors by severity (mock implementation)
   */
  private getErrorsBySeverity(): Record<ErrorSeverity, number> {
    // This would be implemented by querying the middleware's analytics
    return {} as Record<ErrorSeverity, number>;
  }
}

/**
 * Global performance analyzer instance
 */
export const performanceAnalyzer = new PerformanceAnalyzer();

// ============================================================================
// CONFIGURATION VALIDATION AND OPTIMIZATION
// ============================================================================

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  optimizations: string[];
}

/**
 * Configuration validator and optimizer
 */
export class ConfigurationValidator {
  /**
   * Validate middleware configuration
   */
  validateConfiguration(config: MiddlewareConfiguration): ConfigurationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const optimizations: string[] = [];

    // Basic validation
    if (!config.enabled) {
      warnings.push("Error middleware is disabled. Error handling will not work.");
    }

    if (config.maxRecoveryAttempts < 1 || config.maxRecoveryAttempts > 10) {
      errors.push("maxRecoveryAttempts should be between 1 and 10");
    }

    if (config.maxErrorProcessingTime < 1000 || config.maxErrorProcessingTime > 60000) {
      warnings.push("maxErrorProcessingTime should be between 1000ms and 60000ms for optimal performance");
    }

    // Performance optimization checks
    if (config.enablePerformanceMonitoring && config.maxErrorProcessingTime > 10000) {
      recommendations.push("Consider reducing maxErrorProcessingTime when performance monitoring is enabled");
    }

    if (config.enableAnalytics && !config.analyticsEndpoint) {
      warnings.push("Analytics is enabled but no analytics endpoint is configured");
    }

    if (config.enableRealTimeMonitoring && !config.monitoringEndpoint) {
      warnings.push("Real-time monitoring is enabled but no monitoring endpoint is configured");
    }

    // Mobile optimization checks
    if (config.enableMobileOptimizations && !config.batteryOptimizations) {
      recommendations.push("Consider enabling battery optimizations for better mobile experience");
    }

    if (config.enableMobileOptimizations && !config.networkOptimizations) {
      recommendations.push("Consider enabling network optimizations for better mobile experience");
    }

    // Error handling optimization checks
    if (config.autoRecovery && config.maxRecoveryAttempts > 5) {
      optimizations.push("Consider reducing maxRecoveryAttempts to prevent excessive retry loops");
    }

    if (config.showUserFriendlyErrors && config.debugMode) {
      warnings.push("Both showUserFriendlyErrors and debugMode are enabled. This may expose sensitive information.");
    }

    // Filter and routing validation
    if (config.errorFilters.length === 0) {
      recommendations.push("Consider adding error filters to reduce noise in error reporting");
    }

    if (config.routingRules.length === 0) {
      recommendations.push("Consider adding error routing rules for better error management");
    }

    // Integration checks
    if (config.tanstackQueryIntegration && !this.hasTanStackQuery()) {
      warnings.push("TanStack Query integration is enabled but TanStack Query is not detected");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      optimizations,
    };
  }

  /**
   * Optimize configuration based on validation results
   */
  optimizeConfiguration(config: MiddlewareConfiguration): MiddlewareConfiguration {
    const optimized = { ...config };

    // Performance optimizations
    if (optimized.maxErrorProcessingTime > 10000) {
      optimized.maxErrorProcessingTime = 10000;
    }

    // Recovery optimizations
    if (optimized.autoRecovery && optimized.maxRecoveryAttempts > 3) {
      optimized.maxRecoveryAttempts = 3;
    }

    // Cache optimizations
    if (optimized.enableErrorCaching && optimized.errorCacheMaxAge > 600000) {
      optimized.errorCacheMaxAge = 600000; // 10 minutes max
    }

    // Mobile optimizations
    if (optimized.enableMobileOptimizations) {
      optimized.batteryOptimizations = true;
      optimized.networkOptimizations = true;
    }

    // Analytics optimizations
    if (optimized.enableAnalytics) {
      optimized.enablePerformanceMonitoring = true;
    }

    return optimized;
  }

  /**
   * Check if TanStack Query is available
   */
  private hasTanStackQuery(): boolean {
    try {
      // This would check for actual TanStack Query installation
      return typeof window !== "undefined" && (window as any).QueryClient;
    } catch {
      return false;
    }
  }
}

/**
 * Global configuration validator instance
 */
export const configurationValidator = new ConfigurationValidator();

// ============================================================================
// ERROR VISUALIZATION AND REPORTING
// ============================================================================

/**
 * Error visualization options
 */
export interface ErrorVisualizationOptions {
  type: "chart" | "timeline" | "heatmap" | "table";
  timeRange: "1h" | "24h" | "7d" | "30d";
  groupBy: "category" | "type" | "severity" | "none";
  includeDetails: boolean;
  showTrends: boolean;
  interactive: boolean;
}

/**
 * Error visualization generator
 */
export class ErrorVisualizer {
  /**
   * Generate error visualization data
   */
  generateVisualization(options: ErrorVisualizationOptions): any {
    const metrics = performanceAnalyzer.getMetrics();
    const timeRangeMs = this.getTimeRangeMs(options.timeRange);
    const now = new Date();
    const startTime = new Date(now.getTime() - timeRangeMs);

    switch (options.type) {
      case "chart":
        return this.generateChartData(metrics, startTime, now, options);
      case "timeline":
        return this.generateTimelineData(metrics, startTime, now, options);
      case "heatmap":
        return this.generateHeatmapData(metrics, startTime, now, options);
      case "table":
        return this.generateTableData(metrics, startTime, now, options);
      default:
        throw new Error(`Unknown visualization type: ${options.type}`);
    }
  }

  /**
   * Generate chart data
   */
  private generateChartData(metrics: PerformanceMetrics, startTime: Date, endTime: Date, options: ErrorVisualizationOptions): any {
    const filteredData = metrics.timeSeriesData.filter(
      d => d.timestamp >= startTime && d.timestamp <= endTime
    );

    let datasets: any[] = [];

    switch (options.groupBy) {
      case "category":
        datasets = this.generateCategoryDatasets(metrics);
        break;
      case "type":
        datasets = this.generateTypeDatasets(metrics);
        break;
      case "severity":
        datasets = this.generateSeverityDatasets(metrics);
        break;
      default:
        datasets = [{
          label: "Error Count",
          data: filteredData.map(d => ({ x: d.timestamp, y: d.errorCount })),
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
        }];
    }

    return {
      type: "line",
      data: {
        datasets,
      },
      options: {
        responsive: true,
        interaction: {
          mode: "index" as const,
          intersect: false,
        },
        scales: {
          x: {
            type: "time" as const,
            time: {
              displayFormats: {
                hour: "HH:mm",
                day: "MM-DD",
              },
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Count",
            },
          },
        },
      },
    };
  }

  /**
   * Generate timeline data
   */
  private generateTimelineData(metrics: PerformanceMetrics, startTime: Date, endTime: Date, options: ErrorVisualizationOptions): any {
    const filteredData = metrics.timeSeriesData.filter(
      d => d.timestamp >= startTime && d.timestamp <= endTime
    );

    return {
      events: filteredData.map(d => ({
        timestamp: d.timestamp,
        type: "error",
        count: d.errorCount,
        processingTime: d.avgProcessingTime,
        severity: "medium", // Would be determined from actual data
      })),
      summary: {
        totalEvents: filteredData.length,
        totalErrors: filteredData.reduce((sum, d) => sum + d.errorCount, 0),
        avgProcessingTime: filteredData.reduce((sum, d) => sum + d.avgProcessingTime, 0) / filteredData.length,
      },
    };
  }

  /**
   * Generate heatmap data
   */
  private generateHeatmapData(metrics: PerformanceMetrics, startTime: Date, endTime: Date, options: ErrorVisualizationOptions): any {
    // Group errors by hour and day
    const heatmapData: Record<string, number> = {};

    metrics.timeSeriesData
      .filter(d => d.timestamp >= startTime && d.timestamp <= endTime)
      .forEach(d => {
        const hour = d.timestamp.getHours();
        const day = d.timestamp.getDay();
        const key = `${day}-${hour}`;
        heatmapData[key] = (heatmapData[key] || 0) + d.errorCount;
      });

    return {
      data: heatmapData,
      maxValue: Math.max(...Object.values(heatmapData)),
      minValue: Math.min(...Object.values(heatmapData)),
    };
  }

  /**
   * Generate table data
   */
  private generateTableData(metrics: PerformanceMetrics, startTime: Date, endTime: Date, options: ErrorVisualizationOptions): any {
    const rows = [];

    // Add category breakdown
    Object.entries(metrics.errorsByCategory).forEach(([category, count]) => {
      rows.push({
        type: "Category",
        name: category,
        count,
        percentage: ((count / metrics.errorCount) * 100).toFixed(1),
      });
    });

    // Add type breakdown
    Object.entries(metrics.errorsByType).forEach(([type, count]) => {
      rows.push({
        type: "Type",
        name: type,
        count,
        percentage: ((count / metrics.errorCount) * 100).toFixed(1),
      });
    });

    // Add severity breakdown
    Object.entries(metrics.errorsBySeverity).forEach(([severity, count]) => {
      rows.push({
        type: "Severity",
        name: severity,
        count,
        percentage: ((count / metrics.errorCount) * 100).toFixed(1),
      });
    });

    return {
      columns: ["Type", "Name", "Count", "Percentage"],
      rows: rows.sort((a, b) => b.count - a.count),
      summary: {
        totalErrors: metrics.errorCount,
        uniqueTypes: Object.keys(metrics.errorsByType).length,
        uniqueCategories: Object.keys(metrics.errorsByCategory).length,
      },
    };
  }

  /**
   * Generate category datasets
   */
  private generateCategoryDatasets(metrics: PerformanceMetrics): any[] {
    const colors = {
      [ErrorCategory.NETWORK]: "rgb(255, 99, 132)",
      [ErrorCategory.API]: "rgb(54, 162, 235)",
      [ErrorCategory.FILE_SYSTEM]: "rgb(255, 205, 86)",
      [ErrorCategory.TRANSCRIPTION]: "rgb(75, 192, 192)",
      [ErrorCategory.VALIDATION]: "rgb(153, 102, 255)",
    };

    return Object.entries(metrics.errorsByCategory).map(([category, count], index) => ({
      label: category,
      data: Array(metrics.timeSeriesData.length).fill(count / metrics.timeSeriesData.length),
      borderColor: colors[category as ErrorCategory] || "rgb(201, 203, 207)",
      backgroundColor: (colors[category as ErrorCategory] || "rgb(201, 203, 207)").replace("rgb", "rgba").replace(")", ", 0.2)"),
      hidden: index > 4, // Only show first 5 by default
    }));
  }

  /**
   * Generate type datasets
   */
  private generateTypeDatasets(metrics: PerformanceMetrics): any[] {
    return Object.entries(metrics.errorsByType).slice(0, 10).map(([type, count], index) => ({
      label: type,
      data: Array(metrics.timeSeriesData.length).fill(count / metrics.timeSeriesData.length),
      borderColor: `hsl(${index * 36}, 70%, 50%)`,
      backgroundColor: `hsla(${index * 36}, 70%, 50%, 0.2)`,
      hidden: index > 4, // Only show first 5 by default
    }));
  }

  /**
   * Generate severity datasets
   */
  private generateSeverityDatasets(metrics: PerformanceMetrics): any[] {
    const colors = {
      [ErrorSeverity.CRITICAL]: "rgb(255, 0, 0)",
      [ErrorSeverity.HIGH]: "rgb(255, 165, 0)",
      [ErrorSeverity.MEDIUM]: "rgb(255, 255, 0)",
      [ErrorSeverity.LOW]: "rgb(0, 255, 0)",
      [ErrorSeverity.INFO]: "rgb(0, 0, 255)",
    };

    return Object.entries(metrics.errorsBySeverity).map(([severity, count], index) => ({
      label: severity,
      data: Array(metrics.timeSeriesData.length).fill(count / metrics.timeSeriesData.length),
      borderColor: colors[severity as ErrorSeverity] || "rgb(128, 128, 128)",
      backgroundColor: (colors[severity as ErrorSeverity] || "rgb(128, 128, 128)").replace("rgb", "rgba").replace(")", ", 0.2)"),
    }));
  }

  /**
   * Get time range in milliseconds
   */
  private getTimeRangeMs(range: string): number {
    switch (range) {
      case "1h": return 60 * 60 * 1000;
      case "24h": return 24 * 60 * 60 * 1000;
      case "7d": return 7 * 24 * 60 * 60 * 1000;
      case "30d": return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}

/**
 * Global error visualizer instance
 */
export const errorVisualizer = new ErrorVisualizer();

// ============================================================================
// DEVELOPMENT WORKFLOW AUTOMATION
// ============================================================================

/**
 * Development workflow automation
 */
export class DevWorkflowAutomation {
  private watchers: Array<() => void> = [];

  /**
   * Set up development workflow
   */
  setupDevelopmentWorkflow(): void {
    // Initialize common error simulations
    errorSimulationEngine.createCommonSimulations();

    // Enable debug mode
    enableDebugMode({
      consoleOutput: true,
      visualIndicators: true,
      performanceMetrics: true,
    });

    // Start performance collection
    performanceAnalyzer.startCollection(5000);

    // Set up file watchers for development
    this.setupFileWatchers();

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    console.log("🚀 Development workflow automation enabled");
  }

  /**
   * Tear down development workflow
   */
  teardownDevelopmentWorkflow(): void {
    // Stop all watchers
    this.watchers.forEach(watcher => watcher());
    this.watchers = [];

    // Disable debug mode
    disableDebugMode();

    // Stop performance collection
    performanceAnalyzer.stopCollection();

    // Remove keyboard shortcuts
    this.removeKeyboardShortcuts();

    console.log("🛑 Development workflow automation disabled");
  }

  /**
   * Generate development report
   */
  generateDevReport(): {
    performance: any;
    simulations: any;
    configuration: any;
    recommendations: string[];
  } {
    const performanceReport = performanceAnalyzer.generateReport();
    const simulations = errorSimulationEngine.getSimulations();
    const simulationHistory = errorSimulationEngine.getSimulationHistory();

    const currentConfig = errorMiddleware.getConfiguration();
    const configValidation = configurationValidator.validateConfiguration(currentConfig);

    const recommendations: string[] = [
      ...performanceReport.trends.recommendations,
      ...configValidation.recommendations,
      ...configValidation.optimizations,
    ];

    return {
      performance: performanceReport,
      simulations: {
        registered: simulations,
        history: simulationHistory,
        totalTriggered: simulationHistory.filter(h => h.triggered).length,
      },
      configuration: {
        current: currentConfig,
        validation: configValidation,
      },
      recommendations,
    };
  }

  /**
   * Set up file watchers
   */
  private setupFileWatchers(): void {
    // This would set up file watchers for development
    // For now, just log that watchers would be set up
    console.log("📁 File watchers would be set up here");
  }

  /**
   * Set up keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    if (typeof document === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+E: Toggle debug mode
      if (event.ctrlKey && event.shiftKey && event.key === "E") {
        event.preventDefault();
        if (isDebugEnabled()) {
          disableDebugMode();
        } else {
          enableDebugMode();
        }
      }

      // Ctrl+Shift+S: Trigger random error simulation
      if (event.ctrlKey && event.shiftKey && event.key === "S") {
        event.preventDefault();
        const simulations = errorSimulationEngine.getSimulations();
        if (simulations.length > 0) {
          const randomSimulation = simulations[Math.floor(Math.random() * simulations.length)];
          errorSimulationEngine.triggerSimulation(randomSimulation.id);
        }
      }

      // Ctrl+Shift+R: Generate dev report
      if (event.ctrlKey && event.shiftKey && event.key === "R") {
        event.preventDefault();
        const report = this.generateDevReport();
        console.log("📊 Development Report:", report);
      }

      // Ctrl+Shift+C: Clear all data
      if (event.ctrlKey && event.shiftKey && event.key === "C") {
        event.preventDefault();
        errorSimulationEngine.clearHistory();
        performanceAnalyzer.reset();
        errorMiddleware.clearAnalytics();
        console.log("🧹 All development data cleared");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    this.watchers.push(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  }

  /**
   * Remove keyboard shortcuts
   */
  private removeKeyboardShortcuts(): void {
    // Watchers cleanup handles this automatically
  }
}

/**
 * Global development workflow automation instance
 */
export const devWorkflowAutomation = new DevWorkflowAutomation();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Setup debug console with enhanced logging
 */
function setupDebugConsole(): void {
  if (typeof window === "undefined") return;

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  (window as any).__ORIGINAL_CONSOLE__ = originalConsole;

  const debugConfig = getDebugConfiguration();
  if (!debugConfig) return;

  console.log = function(...args: any[]) {
    if (debugConfig.consoleOutput) {
      originalConsole.log.apply(console, ["🔧 [Debug]", ...args]);
    }
  };

  console.warn = function(...args: any[]) {
    if (debugConfig.consoleOutput) {
      originalConsole.warn.apply(console, ["⚠️ [Debug]", ...args]);
    }
  };

  console.error = function(...args: any[]) {
    if (debugConfig.consoleOutput) {
      originalConsole.error.apply(console, ["❌ [Debug]", ...args]);
    }
  };

  console.info = function(...args: any[]) {
    if (debugConfig.consoleOutput) {
      originalConsole.info.apply(console, ["ℹ️ [Debug]", ...args]);
    }
  };
}

/**
 * Restore original console
 */
function restoreConsole(): void {
  if (typeof window === "undefined") return;

  const originalConsole = (window as any).__ORIGINAL_CONSOLE__;
  if (originalConsole) {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    delete (window as any).__ORIGINAL_CONSOLE__;
  }
}

/**
 * Add visual debug indicators
 */
function addVisualDebugIndicators(): void {
  if (typeof document === "undefined") return;

  // Create debug panel
  const debugPanel = document.createElement("div");
  debugPanel.id = "error-middleware-debug-panel";
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    max-width: 300px;
  `;

  debugPanel.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Error Middleware Debug</div>
    <div>Press Ctrl+Shift+E to toggle debug</div>
    <div>Press Ctrl+Shift+S to simulate error</div>
    <div>Press Ctrl+Shift+R for report</div>
    <div>Press Ctrl+Shift+C to clear data</div>
  `;

  document.body.appendChild(debugPanel);
}

/**
 * Remove visual debug indicators
 */
function removeVisualDebugIndicators(): void {
  if (typeof document === "undefined") return;

  const debugPanel = document.getElementById("error-middleware-debug-panel");
  if (debugPanel) {
    debugPanel.remove();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export * from "./error-middleware";
export * from "./error-classifier";
export * from "./recovery-strategies";
export * from "./integrations";
