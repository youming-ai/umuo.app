/**
 * 统一性能监控入口
 * 整合所有监控模块，提供统一的监控接口和仪表板
 */

import { PerformanceMonitoring, MetricCategory, type SystemHealth } from "./performance-monitoring";
import {
  FilePerformanceMonitoring,
  FileOperation,
  type FilePerformanceMetric,
} from "./file-performance-monitoring";
import {
  DatabasePerformanceMonitoring,
  DatabaseOperation,
  type DatabasePerformanceMetric,
} from "./database-performance-monitoring";
import {
  ApiPerformanceMonitoring,
  ApiOperation,
  type ApiPerformanceMetric,
} from "./api-performance-monitoring";
import { MonitoringService } from "./monitoring-service";

// 统一监控配置
export interface UnifiedMonitoringConfig {
  performanceMonitoring?: boolean;
  fileMonitoring?: boolean;
  databaseMonitoring?: boolean;
  apiMonitoring?: boolean;
  enableDashboard?: boolean;
  enableRealTimeUpdates?: boolean;
  enableAlerts?: boolean;
  autoStart?: boolean;
  config?: {
    performance?: Partial<import("./performance-monitoring").PerformanceMonitoringConfig>;
    file?: Partial<import("./file-performance-monitoring").FileMonitoringConfig>;
    database?: Partial<import("./database-performance-monitoring").DatabaseMonitoringConfig>;
    api?: Partial<import("./api-performance-monitoring").ApiMonitoringConfig>;
  };
}

// 统一性能报告
export interface UnifiedPerformanceReport {
  timestamp: number;
  sessionInfo: {
    sessionId: string;
    duration: number;
    uptime: number;
  };
  systemHealth: SystemHealth;
  performanceMetrics: {
    memory: import("./performance-monitoring").MemoryUsage | null;
    cpu: number;
    loadAverage: number;
  };
  fileMetrics: import("./file-performance-monitoring").FileProcessingStats;
  databaseMetrics: import("./database-performance-monitoring").DatabaseStats;
  apiMetrics: import("./api-performance-monitoring").ApiStats;
  realTimeMetrics: {
    activeOperations: number;
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
  summary: {
    overallHealth: "excellent" | "good" | "fair" | "poor";
    criticalIssues: number;
    warnings: number;
    suggestions: number;
  };
}

// 性能告警
export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: "critical" | "high" | "medium" | "low";
  category: MetricCategory;
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  recommendation: string;
  type: string;
  resolved: boolean;
}

// 统一性能监控类
export class UnifiedPerformanceMonitoring {
  private config: Required<UnifiedMonitoringConfig>;
  private performanceMonitoring: PerformanceMonitoring;
  private fileMonitoring: FilePerformanceMonitoring;
  private databaseMonitoring: DatabasePerformanceMonitoring;
  private apiMonitoring: ApiPerformanceMonitoring;
  private monitoringService: MonitoringService;
  private alerts: PerformanceAlert[] = [];
  private startTime: number;
  private realTimeUpdateTimer?: NodeJS.Timeout;

  constructor(config: UnifiedMonitoringConfig = {}) {
    this.config = {
      performanceMonitoring: true,
      fileMonitoring: true,
      databaseMonitoring: true,
      apiMonitoring: true,
      enableDashboard: true,
      enableRealTimeUpdates: true,
      enableAlerts: true,
      autoStart: true,
      config: {},
      ...config,
    };

    this.monitoringService = new MonitoringService();

    // 初始化各个监控模块
    this.performanceMonitoring = new PerformanceMonitoring(
      this.config.config?.performance,
      this.monitoringService,
    );

    this.fileMonitoring = new FilePerformanceMonitoring(
      this.config.config?.file,
      this.performanceMonitoring,
    );

    this.databaseMonitoring = new DatabasePerformanceMonitoring(
      this.config.config?.database,
      this.performanceMonitoring,
    );

    this.apiMonitoring = new ApiPerformanceMonitoring(
      this.config.config?.api,
      this.performanceMonitoring,
    );

    this.startTime = Date.now();

    if (this.config.autoStart) {
      this.start();
    }
  }

  // 启动统一监控
  start(): void {
    if (this.config.performanceMonitoring) {
      this.performanceMonitoring.start();
    }

    if (this.config.fileMonitoring) {
      // 文件监控通过函数调用启动，不需要显式启动方法
    }

    if (this.config.databaseMonitoring) {
      // 数据库监控通过函数调用启动，不需要显式启动方法
    }

    if (this.config.apiMonitoring) {
      // API监控通过函数调用启动，不需要显式启动方法
    }

    if (this.config.enableRealTimeUpdates) {
      this.startRealTimeUpdates();
    }

    this.monitoringService.initialize();
    this.monitoringService.logInfo("Unified performance monitoring started", {
      monitoringConfig: this.config,
      startTime: this.startTime,
    });
  }

  // 停止统一监控
  stop(): void {
    this.stopRealTimeUpdates();

    if (this.config.performanceMonitoring) {
      this.performanceMonitoring.stop();
    }

    this.monitoringService.flush();
    this.monitoringService.logInfo("Unified performance monitoring stopped");
  }

  // 获取统一性能报告
  getUnifiedReport(): UnifiedPerformanceReport {
    const fileStats = this.config.fileMonitoring
      ? this.fileMonitoring.getFileProcessingStats()
      : this.getDefaultFileStats();
    const databaseStats = this.config.databaseMonitoring
      ? this.databaseMonitoring.getDatabaseStats()
      : this.getDefaultDatabaseStats();
    const apiStats = this.config.apiMonitoring
      ? this.apiMonitoring.getApiStats()
      : this.getDefaultApiStats();
    const systemHealth = this.config.performanceMonitoring
      ? this.performanceMonitoring.getSystemHealth()
      : this.getDefaultSystemHealth();
    const memoryUsage = this.config.performanceMonitoring
      ? this.performanceMonitoring.getMemoryUsage()
      : null;

    // 生成告警和建议
    this.generateAlerts(fileStats, databaseStats, apiStats, systemHealth);

    // 计算实时指标
    const realTimeMetrics = this.calculateRealTimeMetrics();

    // 计算总体健康状况
    const summary = this.calculateSummary(systemHealth, realTimeMetrics);

    // 生成建议
    const recommendations = this.generateRecommendations(
      fileStats,
      databaseStats,
      apiStats,
      systemHealth,
    );

    return {
      timestamp: Date.now(),
      sessionInfo: {
        sessionId: this.monitoringService.getSessionId(),
        duration: Date.now() - this.startTime,
        uptime: Date.now() - this.startTime,
      },
      systemHealth,
      performanceMetrics: {
        memory: memoryUsage,
        cpu: this.estimateCPUUsage(),
        loadAverage: this.estimateLoadAverage(),
      },
      fileMetrics: fileStats,
      databaseMetrics: databaseStats,
      apiMetrics: apiStats,
      realTimeMetrics,
      alerts: this.getUnresolvedAlerts(),
      recommendations,
      summary,
    };
  }

  // 获取性能仪表板数据
  getDashboardData(): {
    overview: {
      healthScore: number;
      activeOperations: number;
      totalOperations: number;
      errorRate: number;
      averageResponseTime: number;
    };
    charts: {
      performanceTrend: Array<{ time: number; value: number }>;
      errorRate: Array<{ time: number; value: number }>;
      throughput: Array<{ time: number; value: number }>;
      memoryUsage: Array<{ time: number; value: number }>;
    };
    alerts: PerformanceAlert[];
    metrics: {
      file: import("./file-performance-monitoring").FileProcessingStats;
      database: import("./database-performance-monitoring").DatabaseStats;
      api: import("./api-performance-monitoring").ApiStats;
    };
  } {
    const report = this.getUnifiedReport();

    return {
      overview: {
        healthScore: report.systemHealth.score,
        activeOperations: report.realTimeMetrics.activeOperations,
        totalOperations:
          report.fileMetrics.totalFiles +
          report.databaseMetrics.totalOperations +
          report.apiMetrics.totalRequests,
        errorRate: report.realTimeMetrics.errorRate,
        averageResponseTime: report.realTimeMetrics.averageResponseTime,
      },
      charts: {
        performanceTrend: this.generatePerformanceTrendData(),
        errorRate: this.generateErrorRateData(),
        throughput: this.generateThroughputData(),
        memoryUsage: this.generateMemoryUsageData(),
      },
      alerts: report.alerts,
      metrics: {
        file: report.fileMetrics,
        database: report.databaseMetrics,
        api: report.apiMetrics,
      },
    };
  }

  // 手动刷新所有监控数据
  refreshAll(): void {
    if (this.config.performanceMonitoring) {
      this.performanceMonitoring.flushMetrics();
    }

    this.monitoringService.flush();
    this.monitoringService.logInfo("All monitoring data refreshed");
  }

  // 清理所有监控数据
  clearAllData(): void {
    if (this.config.fileMonitoring) {
      this.fileMonitoring.clearHistory();
    }

    if (this.config.databaseMonitoring) {
      this.databaseMonitoring.clearHistory();
    }

    if (this.config.apiMonitoring) {
      this.apiMonitoring.clearHistory();
    }

    this.alerts = [];
    this.monitoringService.logInfo("All monitoring data cleared");
  }

  // 获取未解决的告警
  getUnresolvedAlerts(): PerformanceAlert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  // 解决告警
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.monitoringService.logInfo("Alert resolved", {
        alertId: alertId,
        alertType: alert.type,
        resolvedAt: new Date().toISOString(),
      });
    }
  }

  // 获取监控实例
  getMonitoringServices() {
    return {
      performance: this.performanceMonitoring,
      file: this.fileMonitoring,
      database: this.databaseMonitoring,
      api: this.apiMonitoring,
      monitoring: this.monitoringService,
    };
  }

  // 私有方法

  private startRealTimeUpdates(): void {
    this.stopRealTimeUpdates();

    this.realTimeUpdateTimer = setInterval(() => {
      this.checkPerformanceThresholds();
    }, 30000); // 每30秒检查一次
  }

  private stopRealTimeUpdates(): void {
    if (this.realTimeUpdateTimer) {
      clearInterval(this.realTimeUpdateTimer);
      this.realTimeUpdateTimer = undefined;
    }
  }

  private generateAlerts(
    fileStats: import("./file-performance-monitoring").FileProcessingStats,
    databaseStats: import("./database-performance-monitoring").DatabaseStats,
    apiStats: import("./api-performance-monitoring").ApiStats,
    systemHealth: SystemHealth,
  ): void {
    if (!this.config.enableAlerts) return;

    const newAlerts: PerformanceAlert[] = [];

    // 系统健康告警
    if (systemHealth.status === "critical") {
      newAlerts.push({
        id: `health_${Date.now()}`,
        timestamp: Date.now(),
        severity: "critical",
        category: MetricCategory.SYSTEM,
        title: "系统健康状态严重",
        message: `系统健康评分为 ${systemHealth.score}，需要立即关注`,
        metric: "system_health_score",
        value: systemHealth.score,
        threshold: 60,
        recommendation: "检查系统资源使用情况，重启服务或增加资源",
        type: "system_performance",
        resolved: false,
      });
    }

    // 文件处理告警
    if (fileStats.successRate < 90) {
      newAlerts.push({
        id: `file_success_${Date.now()}`,
        timestamp: Date.now(),
        severity: "high",
        category: MetricCategory.FILE_PROCESSING,
        title: "文件处理成功率低",
        message: `文件处理成功率为 ${fileStats.successRate.toFixed(1)}%`,
        metric: "file_success_rate",
        value: fileStats.successRate,
        threshold: 90,
        recommendation: "检查文件处理逻辑，优化错误处理机制",
        type: "file_processing",
        resolved: false,
      });
    }

    // 数据库告警
    if (databaseStats.successRate < 95) {
      newAlerts.push({
        id: `db_success_${Date.now()}`,
        timestamp: Date.now(),
        severity: "high",
        category: MetricCategory.DATABASE,
        title: "数据库操作成功率低",
        message: `数据库操作成功率为 ${databaseStats.successRate.toFixed(1)}%`,
        metric: "database_success_rate",
        value: databaseStats.successRate,
        threshold: 95,
        recommendation: "检查数据库连接和查询性能",
        type: "database_performance",
        resolved: false,
      });
    }

    // API告警
    const apiRealTimeMetrics = this.config.apiMonitoring
      ? this.apiMonitoring.getRealTimeMetrics()
      : null;
    if (apiRealTimeMetrics && apiRealTimeMetrics.errorRate > 5) {
      newAlerts.push({
        id: `api_error_${Date.now()}`,
        timestamp: Date.now(),
        severity: "high",
        category: MetricCategory.API,
        title: "API错误率高",
        message: `API错误率为 ${apiRealTimeMetrics.errorRate.toFixed(1)}%`,
        metric: "api_error_rate",
        value: apiRealTimeMetrics.errorRate,
        threshold: 5,
        recommendation: "检查API端点状态和网络连接",
        type: "api_performance",
        resolved: false,
      });
    }

    // 添加新告警（避免重复）
    newAlerts.forEach((newAlert) => {
      const exists = this.alerts.some(
        (existing) =>
          existing.metric === newAlert.metric &&
          !existing.resolved &&
          Date.now() - existing.timestamp < 300000, // 5分钟内不重复
      );

      if (!exists) {
        this.alerts.push(newAlert);
        this.monitoringService.logWarning(`Performance alert: ${newAlert.title}`, {
          component: "unified_monitoring",
          action: "alert_generated",
          additional: { alert: newAlert },
        });
      }
    });

    // 清理已解决的旧告警
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24小时前
    this.alerts = this.alerts.filter((alert) => !alert.resolved || alert.timestamp > cutoff);
  }

  private checkPerformanceThresholds(): void {
    if (!this.config.enableAlerts) return;

    const report = this.getUnifiedReport();

    // 检查各种性能阈值
    if (report.realTimeMetrics.errorRate > 10) {
      this.monitoringService.logWarning("High error rate detected", {
        component: "unified_monitoring",
        action: "threshold_check",
        additional: { errorRate: report.realTimeMetrics.errorRate },
      });
    }

    if (report.realTimeMetrics.averageResponseTime > 3000) {
      this.monitoringService.logWarning("High response time detected", {
        component: "unified_monitoring",
        action: "threshold_check",
        additional: { responseTime: report.realTimeMetrics.averageResponseTime },
      });
    }

    if (report.performanceMetrics.memory && report.performanceMetrics.memory.percentage > 80) {
      this.monitoringService.logWarning("High memory usage detected", {
        component: "unified_monitoring",
        action: "threshold_check",
        additional: { memoryUsage: report.performanceMetrics.memory.percentage },
      });
    }
  }

  private calculateRealTimeMetrics() {
    const fileRealTime = this.config.fileMonitoring
      ? this.fileMonitoring.getRealTimeMetrics()
      : null;
    const databaseRealTime = this.config.databaseMonitoring
      ? this.databaseMonitoring.getRealTimeMetrics()
      : null;
    const apiRealTime = this.config.apiMonitoring ? this.apiMonitoring.getRealTimeMetrics() : null;

    const activeOperations =
      (fileRealTime?.currentOperations || 0) +
      (databaseRealTime?.currentOperations || 0) +
      (apiRealTime?.activeRequests || 0);

    const totalOperations =
      (fileRealTime?.throughput || 0) +
      (databaseRealTime?.throughput || 0) +
      (apiRealTime?.throughput || 0);

    const totalTime =
      (fileRealTime?.averageProcessingTime || 0) * (fileRealTime?.throughput || 0) +
      (databaseRealTime?.averageExecutionTime || 0) * (databaseRealTime?.throughput || 0) +
      (apiRealTime?.averageResponseTime || 0) * (apiRealTime?.throughput || 0);

    const averageResponseTime = totalOperations > 0 ? totalTime / totalOperations : 0;

    const totalErrors =
      ((fileRealTime?.errorRate || 0) * (fileRealTime?.throughput || 0)) / 100 +
      ((databaseRealTime?.successRate || 100) * (databaseRealTime?.throughput || 0)) / 100 +
      ((apiRealTime?.errorRate || 0) * (apiRealTime?.throughput || 0)) / 100;

    const errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;

    return {
      activeOperations,
      averageResponseTime,
      successRate: 100 - errorRate,
      errorRate,
      throughput: totalOperations,
    };
  }

  private calculateSummary(
    systemHealth: SystemHealth,
    realTimeMetrics: ReturnType<typeof this.calculateRealTimeMetrics>,
  ) {
    let overallHealth: "excellent" | "good" | "fair" | "poor" = "excellent";
    let criticalIssues = 0;
    let warnings = 0;
    let suggestions = 0;

    if (systemHealth.score < 60) {
      overallHealth = "poor";
      criticalIssues++;
    } else if (systemHealth.score < 80) {
      overallHealth = "fair";
      warnings++;
    } else if (systemHealth.score < 90) {
      overallHealth = "good";
      suggestions++;
    }

    if (realTimeMetrics.errorRate > 10) {
      criticalIssues++;
    } else if (realTimeMetrics.errorRate > 5) {
      warnings++;
    }

    if (realTimeMetrics.averageResponseTime > 5000) {
      criticalIssues++;
    } else if (realTimeMetrics.averageResponseTime > 2000) {
      warnings++;
    }

    return {
      overallHealth,
      criticalIssues,
      warnings,
      suggestions,
    };
  }

  private generateRecommendations(
    fileStats: import("./file-performance-monitoring").FileProcessingStats,
    databaseStats: import("./database-performance-monitoring").DatabaseStats,
    apiStats: import("./api-performance-monitoring").ApiStats,
    systemHealth: SystemHealth,
  ): string[] {
    const recommendations: string[] = [];

    if (systemHealth.score < 80) {
      recommendations.push("系统健康评分较低，建议检查系统资源使用情况");
    }

    if (fileStats.successRate < 90) {
      recommendations.push("文件处理成功率较低，建议优化文件处理逻辑");
    }

    if (databaseStats.successRate < 95) {
      recommendations.push("数据库操作成功率较低，建议检查数据库连接和查询性能");
    }

    if (apiStats.successRate < 95) {
      recommendations.push("API成功率较低，建议检查API端点状态和网络连接");
    }

    if (databaseStats.averageExecutionTime > 1000) {
      recommendations.push("数据库响应时间较长，建议优化查询或添加索引");
    }

    if (apiStats.averageResponseTime > 2000) {
      recommendations.push("API响应时间较长，建议使用缓存或优化端点性能");
    }

    return recommendations;
  }

  private generatePerformanceTrendData() {
    // 生成最近1小时的性能趋势数据
    const data = [];
    const now = Date.now();
    for (let i = 60; i >= 0; i -= 5) {
      const time = now - i * 60000; // 每5分钟一个数据点
      data.push({
        time,
        value: Math.random() * 100, // 模拟数据，实际应该从历史记录中获取
      });
    }
    return data;
  }

  private generateErrorRateData() {
    const data = [];
    const now = Date.now();
    for (let i = 60; i >= 0; i -= 5) {
      const time = now - i * 60000;
      data.push({
        time,
        value: Math.random() * 10, // 模拟数据
      });
    }
    return data;
  }

  private generateThroughputData() {
    const data = [];
    const now = Date.now();
    for (let i = 60; i >= 0; i -= 5) {
      const time = now - i * 60000;
      data.push({
        time,
        value: Math.random() * 50, // 模拟数据
      });
    }
    return data;
  }

  private generateMemoryUsageData() {
    const data = [];
    const now = Date.now();
    for (let i = 60; i >= 0; i -= 5) {
      const time = now - i * 60000;
      data.push({
        time,
        value: Math.random() * 100, // 模拟数据
      });
    }
    return data;
  }

  private estimateCPUUsage(): number {
    // 简单的CPU使用率估算（实际应用中应该使用更精确的方法）
    return Math.random() * 100;
  }

  private estimateLoadAverage(): number {
    // 简单的负载估算
    return Math.random() * 5;
  }

  private getDefaultFileStats() {
    return {
      totalFiles: 0,
      totalSize: 0,
      averageProcessingTime: 0,
      averageTransferSpeed: 0,
      successRate: 100,
      errorBreakdown: {},
      sizeDistribution: { small: 0, medium: 0, large: 0, huge: 0 },
      operationBreakdown: {} as any,
    };
  }

  private getDefaultDatabaseStats() {
    return {
      totalOperations: 0,
      averageExecutionTime: 0,
      successRate: 100,
      operationBreakdown: {} as any,
      tableBreakdown: {} as any,
      queryTypeBreakdown: { simple: 0, complex: 0, join: 0, aggregate: 0 },
      indexUsage: { indexed: 0, nonIndexed: 0, indexUsageRate: 100 },
      throughput: 0,
    };
  }

  private getDefaultApiStats() {
    return {
      totalRequests: 0,
      totalDataTransferred: 0,
      averageResponseTime: 0,
      successRate: 100,
      errorBreakdown: {} as any,
      operationBreakdown: {} as any,
      methodBreakdown: {} as any,
      statusCodeBreakdown: {},
      endpointStats: [],
      throughput: 0,
    };
  }

  private getDefaultSystemHealth(): SystemHealth {
    return {
      status: "healthy",
      score: 100,
      checks: [],
      timestamp: Date.now(),
    };
  }
}

// 全局统一性能监控实例
let globalUnifiedPerformanceMonitoring: UnifiedPerformanceMonitoring | null = null;

// 获取全局统一性能监控实例
export function getUnifiedPerformanceMonitoring(): UnifiedPerformanceMonitoring {
  if (!globalUnifiedPerformanceMonitoring) {
    globalUnifiedPerformanceMonitoring = new UnifiedPerformanceMonitoring();
  }
  return globalUnifiedPerformanceMonitoring;
}

// 初始化全局统一性能监控
export function initializeUnifiedPerformanceMonitoring(config?: UnifiedMonitoringConfig): void {
  globalUnifiedPerformanceMonitoring = new UnifiedPerformanceMonitoring(config);
}

// 便捷的统一监控Hook
export function useUnifiedPerformanceMonitoring() {
  const monitoring = getUnifiedPerformanceMonitoring();

  return {
    getUnifiedReport: () => monitoring.getUnifiedReport(),
    getDashboardData: () => monitoring.getDashboardData(),
    refreshAll: () => monitoring.refreshAll(),
    clearAllData: () => monitoring.clearAllData(),
    getUnresolvedAlerts: () => monitoring.getUnresolvedAlerts(),
    resolveAlert: (alertId: string) => monitoring.resolveAlert(alertId),
    getMonitoringServices: () => monitoring.getMonitoringServices(),
    start: () => monitoring.start(),
    stop: () => monitoring.stop(),
  };
}
