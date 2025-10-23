/**
 * 数据库性能监控
 * 专门监控数据库操作的性能指标，包括查询、插入、更新、删除等操作
 */

import { MetricCategory, PerformanceMonitoring } from "./performance-monitoring";

// 数据库操作类型
export enum DatabaseOperation {
  QUERY = "query",
  INSERT = "insert",
  UPDATE = "update",
  DELETE = "delete",
  BULK_INSERT = "bulk_insert",
  BULK_UPDATE = "bulk_update",
  TRANSACTION = "transaction",
  INDEX = "index",
  MIGRATION = "migration",
}

// 数据库表类型
export enum DatabaseTable {
  FILES = "files",
  FILE_CHUNKS = "file_chunks",
  TRANSCRIPTS = "transcripts",
  SEGMENTS = "segments",
}

// 数据库性能指标
export interface DatabasePerformanceMetric {
  operation: DatabaseOperation;
  table: DatabaseTable;
  executionTime: number;
  recordCount: number;
  success: boolean;
  error?: string;
  queryType?: "simple" | "complex" | "join" | "aggregate";
  indexUsed?: boolean;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

// 数据库连接状态
export interface DatabaseConnectionStatus {
  connected: boolean;
  connectionTime: number;
  lastOperationTime: number;
  totalOperations: number;
  failedOperations: number;
  averageResponseTime: number;
}

// 数据库统计信息
export interface DatabaseStats {
  totalOperations: number;
  averageExecutionTime: number;
  successRate: number;
  operationBreakdown: Record<
    DatabaseOperation,
    {
      count: number;
      averageTime: number;
      successRate: number;
    }
  >;
  tableBreakdown: Record<
    DatabaseTable,
    {
      operationCount: number;
      recordCount: number;
      averageTime: number;
    }
  >;
  queryTypeBreakdown: {
    simple: number;
    complex: number;
    join: number;
    aggregate: number;
  };
  indexUsage: {
    indexed: number;
    nonIndexed: number;
    indexUsageRate: number;
  };
  throughput: number; // operations per second
}

// 数据库性能监控配置
export interface DatabaseMonitoringConfig {
  enabled: boolean;
  trackSlowQueries: boolean;
  slowQueryThreshold: number; // ms
  trackQueryPatterns: boolean;
  trackConnectionState: boolean;
  trackTransactionPerformance: boolean;
  enableRealTimeMonitoring: boolean;
  maxHistorySize: number;
  samplingRate: number;
  performanceAlertThresholds: {
    averageResponseTime: number; // ms
    successRate: number; // percentage
    connectionTime: number; // ms
  };
}

// 默认配置
const DEFAULT_DATABASE_MONITORING_CONFIG: Required<DatabaseMonitoringConfig> = {
  enabled: true,
  trackSlowQueries: true,
  slowQueryThreshold: 1000, // 1秒
  trackQueryPatterns: true,
  trackConnectionState: true,
  trackTransactionPerformance: true,
  enableRealTimeMonitoring: true,
  maxHistorySize: 2000,
  samplingRate: 1.0,
  performanceAlertThresholds: {
    averageResponseTime: 500, // 500ms
    successRate: 95, // 95%
    connectionTime: 1000, // 1秒
  },
};

// 数据库性能监控类
export class DatabasePerformanceMonitoring {
  private config: Required<DatabaseMonitoringConfig>;
  private performanceMonitoring: PerformanceMonitoring;
  private metrics: DatabasePerformanceMetric[] = [];
  private activeOperations: Map<
    string,
    {
      startTime: number;
      operation: DatabaseOperation;
      table: DatabaseTable;
      recordCount: number;
      metadata?: Record<string, unknown>;
    }
  > = new Map();
  private connectionStatus: DatabaseConnectionStatus = {
    connected: false,
    connectionTime: 0,
    lastOperationTime: 0,
    totalOperations: 0,
    failedOperations: 0,
    averageResponseTime: 0,
  };
  private transactions: Map<
    string,
    {
      startTime: number;
      operations: string[];
    }
  > = new Map();

  constructor(
    config: Partial<DatabaseMonitoringConfig> = {},
    performanceMonitoring?: PerformanceMonitoring,
  ) {
    this.config = { ...DEFAULT_DATABASE_MONITORING_CONFIG, ...config };
    this.performanceMonitoring = performanceMonitoring || new PerformanceMonitoring();
  }

  // 记录数据库连接
  recordConnection(connectionTime: number, success: boolean = true): void {
    if (!this.config.enabled) return;

    this.connectionStatus.connected = success;
    this.connectionStatus.connectionTime = connectionTime;

    this.performanceMonitoring.recordMetric(
      "database_connection_time",
      MetricCategory.DATABASE,
      connectionTime,
      "ms",
      { success: success.toString() },
    );

    if (success) {
      this.performanceMonitoring.recordMetric(
        "database_connection_success",
        MetricCategory.DATABASE,
        1,
        "count",
      );
    } else {
      this.performanceMonitoring.recordMetric(
        "database_connection_failed",
        MetricCategory.DATABASE,
        1,
        "count",
      );
    }
  }

  // 开始数据库操作监控
  startDatabaseOperation(
    operation: DatabaseOperation,
    table: DatabaseTable,
    recordCount: number = 1,
    metadata?: Record<string, unknown>,
  ): string {
    if (!this.config.enabled) return "";

    const operationId = `${operation}_${table}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    this.activeOperations.set(operationId, {
      startTime,
      operation,
      table,
      recordCount,
      metadata,
    });

    // 更新连接状态
    this.connectionStatus.lastOperationTime = Date.now();

    return operationId;
  }

  // 结束数据库操作监控
  endDatabaseOperation(
    operationId: string,
    success: boolean = true,
    error?: string,
    additionalMetadata?: Record<string, unknown>,
  ): DatabasePerformanceMetric | null {
    if (!this.config.enabled) return null;

    const operation = this.activeOperations.get(operationId);
    if (!operation) return null;

    const endTime = performance.now();
    const executionTime = endTime - operation.startTime;

    const metric: DatabasePerformanceMetric = {
      operation: operation.operation,
      table: operation.table,
      executionTime,
      recordCount: operation.recordCount,
      success,
      error,
      metadata: {
        ...operation.metadata,
        ...additionalMetadata,
        operationId,
        timestamp: Date.now(),
      },
    };

    // 添加到历史记录
    this.metrics.push(metric);
    this.trimHistory();

    // 更新连接状态统计
    this.updateConnectionStats(metric);

    // 记录到性能监控系统
    this.recordMetricToPerformanceMonitoring(metric);

    // 检查慢查询
    if (this.config.trackSlowQueries && executionTime > this.config.slowQueryThreshold) {
      this.recordSlowQuery(metric);
    }

    // 清理活动操作
    this.activeOperations.delete(operationId);

    return metric;
  }

  // 开始事务
  startTransaction(transactionId: string): void {
    if (!this.config.enabled || !this.config.trackTransactionPerformance) return;

    this.transactions.set(transactionId, {
      startTime: performance.now(),
      operations: [],
    });
  }

  // 添加事务操作
  addTransactionOperation(transactionId: string, operationId: string): void {
    if (!this.config.enabled || !this.config.trackTransactionPerformance) return;

    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.operations.push(operationId);
    }
  }

  // 结束事务
  endTransaction(transactionId: string, success: boolean = true): void {
    if (!this.config.enabled || !this.config.trackTransactionPerformance) return;

    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    const endTime = performance.now();
    const duration = endTime - transaction.startTime;

    // 记录事务性能
    this.performanceMonitoring.recordMetric(
      "database_transaction_duration",
      MetricCategory.DATABASE,
      duration,
      "ms",
      { success: success.toString() },
      {
        operationCount: transaction.operations.length,
        transactionId,
      },
    );

    // 为每个操作添加事务ID
    transaction.operations.forEach((operationId) => {
      const metric = this.metrics.find((m) => m.metadata?.operationId === operationId);
      if (metric) {
        metric.transactionId = transactionId;
      }
    });

    // 清理事务
    this.transactions.delete(transactionId);
  }

  // 记录索引使用情况
  recordIndexUsage(operationId: string, indexUsed: boolean, indexName?: string): void {
    if (!this.config.enabled || !this.config.trackQueryPatterns) return;

    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    // 更新操作元数据
    operation.metadata = {
      ...operation.metadata,
      indexUsed,
      indexName,
    };
  }

  // 记录查询类型
  recordQueryType(operationId: string, queryType: DatabasePerformanceMetric["queryType"]): void {
    if (!this.config.enabled || !this.config.trackQueryPatterns) return;

    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    // 更新操作元数据
    operation.metadata = {
      ...operation.metadata,
      queryType,
    };
  }

  // 获取当前活动操作数量（用于测试）
  getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }

  // 获取当前指标数量（用于测试）
  getMetricsCount(): number {
    return this.metrics.length;
  }

  // 获取数据库统计信息
  getDatabaseStats(): DatabaseStats {
    const successfulMetrics = this.metrics.filter((m) => m.success);
    const _failedMetrics = this.metrics.filter((m) => !m.success);

    const totalOperations = this.metrics.length;
    const averageExecutionTime =
      totalOperations > 0
        ? this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalOperations
        : 0;
    const successRate =
      totalOperations > 0 ? (successfulMetrics.length / totalOperations) * 100 : 0;

    // 操作分类统计
    const operationBreakdown: Record<
      DatabaseOperation,
      {
        count: number;
        averageTime: number;
        successRate: number;
      }
    > = {} as Record<
      DatabaseOperation,
      {
        count: number;
        averageTime: number;
        successRate: number;
      }
    >;

    Object.values(DatabaseOperation).forEach((operation) => {
      const operationMetrics = this.metrics.filter((m) => m.operation === operation);
      const successfulOperationMetrics = operationMetrics.filter((m) => m.success);

      operationBreakdown[operation] = {
        count: operationMetrics.length,
        averageTime:
          operationMetrics.length > 0
            ? operationMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
              operationMetrics.length
            : 0,
        successRate:
          operationMetrics.length > 0
            ? (successfulOperationMetrics.length / operationMetrics.length) * 100
            : 0,
      };
    });

    // 表分类统计
    const tableBreakdown: Record<
      DatabaseTable,
      {
        operationCount: number;
        recordCount: number;
        averageTime: number;
      }
    > = {} as Record<
      DatabaseTable,
      {
        operationCount: number;
        recordCount: number;
        averageTime: number;
      }
    >;

    Object.values(DatabaseTable).forEach((table) => {
      const tableMetrics = this.metrics.filter((m) => m.table === table);

      tableBreakdown[table] = {
        operationCount: tableMetrics.length,
        recordCount: tableMetrics.reduce((sum, m) => sum + m.recordCount, 0),
        averageTime:
          tableMetrics.length > 0
            ? tableMetrics.reduce((sum, m) => sum + m.executionTime, 0) / tableMetrics.length
            : 0,
      };
    });

    // 查询类型统计
    const queryTypeBreakdown = {
      simple: this.metrics.filter((m) => m.queryType === "simple").length,
      complex: this.metrics.filter((m) => m.queryType === "complex").length,
      join: this.metrics.filter((m) => m.queryType === "join").length,
      aggregate: this.metrics.filter((m) => m.queryType === "aggregate").length,
    };

    // 索引使用统计
    const indexedMetrics = this.metrics.filter((m) => m.indexUsed === true);
    const nonIndexedMetrics = this.metrics.filter((m) => m.indexUsed === false);
    const totalIndexedMetrics = indexedMetrics.length + nonIndexedMetrics.length;

    const indexUsage = {
      indexed: indexedMetrics.length,
      nonIndexed: nonIndexedMetrics.length,
      indexUsageRate:
        totalIndexedMetrics > 0 ? (indexedMetrics.length / totalIndexedMetrics) * 100 : 0,
    };

    // 计算吞吐量
    const oldestMetric = this.metrics[0];
    const newestMetric = this.metrics[this.metrics.length - 1];
    const timeSpan =
      newestMetric && oldestMetric
        ? ((newestMetric.metadata?.timestamp as number) || Date.now()) -
          ((oldestMetric.metadata?.timestamp as number) || Date.now())
        : 0;
    const throughput = timeSpan > 0 ? (totalOperations / timeSpan) * 1000 : 0;

    return {
      totalOperations,
      averageExecutionTime,
      successRate,
      operationBreakdown,
      tableBreakdown,
      queryTypeBreakdown,
      indexUsage,
      throughput,
    };
  }

  // 获取实时数据库性能指标
  getRealTimeMetrics(timeWindow: number = 60000): {
    currentOperations: number;
    averageExecutionTime: number;
    successRate: number;
    throughput: number;
    slowQueryRate: number;
    connectionStatus: DatabaseConnectionStatus;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter((m) => {
      const timestamp = (m.metadata?.timestamp as number) || Date.now();
      return timestamp > cutoff;
    });

    const successfulRecent = recentMetrics.filter((m) => m.success);
    const _failedRecent = recentMetrics.filter((m) => !m.success);
    const slowQueries = recentMetrics.filter(
      (m) => m.executionTime > this.config.slowQueryThreshold,
    );

    return {
      currentOperations: this.activeOperations.size,
      averageExecutionTime:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length
          : 0,
      successRate:
        recentMetrics.length > 0 ? (successfulRecent.length / recentMetrics.length) * 100 : 0,
      throughput: (recentMetrics.length / timeWindow) * 1000, // operations per second
      slowQueryRate:
        recentMetrics.length > 0 ? (slowQueries.length / recentMetrics.length) * 100 : 0,
      connectionStatus: this.connectionStatus,
    };
  }

  // 获取数据库性能报告
  getDatabasePerformanceReport(): {
    stats: DatabaseStats;
    realTimeMetrics: {
      currentOperations: number;
      averageExecutionTime: number;
      successRate: number;
      throughput: number;
      slowQueryRate: number;
      connectionStatus: DatabaseConnectionStatus;
    };
    slowQueries: DatabasePerformanceMetric[];
    performanceAlerts: string[];
    recommendations: string[];
    timestamp: number;
  } {
    const stats = this.getDatabaseStats();
    const realTimeMetrics = this.getRealTimeMetrics();
    const slowQueries = this.metrics
      .filter((m) => m.executionTime > this.config.slowQueryThreshold)
      .slice(-20); // 最近20个慢查询

    // 生成性能告警
    const performanceAlerts: string[] = [];
    const recommendations: string[] = [];

    // 检查平均响应时间
    if (stats.averageExecutionTime > this.config.performanceAlertThresholds.averageResponseTime) {
      performanceAlerts.push(`数据库平均响应时间过长: ${stats.averageExecutionTime.toFixed(1)}ms`);
      recommendations.push("考虑优化查询语句或添加索引");
    }

    // 检查成功率
    if (stats.successRate < this.config.performanceAlertThresholds.successRate) {
      performanceAlerts.push(`数据库操作成功率低: ${stats.successRate.toFixed(1)}%`);
      recommendations.push("检查数据库连接和错误处理机制");
    }

    // 检查连接时间
    if (
      this.connectionStatus.connectionTime > this.config.performanceAlertThresholds.connectionTime
    ) {
      performanceAlerts.push(`数据库连接时间过长: ${this.connectionStatus.connectionTime}ms`);
      recommendations.push("检查网络连接和数据库服务器状态");
    }

    // 检查索引使用率
    if (stats.indexUsage.indexUsageRate < 80) {
      performanceAlerts.push(`索引使用率低: ${stats.indexUsage.indexUsageRate.toFixed(1)}%`);
      recommendations.push("为频繁查询的字段添加索引");
    }

    // 检查慢查询率
    if (realTimeMetrics.slowQueryRate > 10) {
      performanceAlerts.push(`慢查询率过高: ${realTimeMetrics.slowQueryRate.toFixed(1)}%`);
      recommendations.push("优化慢查询语句，考虑重写复杂查询");
    }

    // 检查吞吐量
    if (stats.throughput < 10) {
      performanceAlerts.push(`数据库吞吐量低: ${stats.throughput.toFixed(1)} ops/sec`);
      recommendations.push("考虑使用批量操作或连接池优化");
    }

    return {
      stats,
      realTimeMetrics,
      slowQueries,
      performanceAlerts,
      recommendations,
      timestamp: Date.now(),
    };
  }

  // 获取连接状态
  getConnectionStatus(): DatabaseConnectionStatus {
    return { ...this.connectionStatus };
  }

  // 清理历史记录
  clearHistory(): void {
    this.metrics = [];
    this.transactions.clear();
  }

  // 私有方法

  private trimHistory(): void {
    if (this.metrics.length > this.config.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.config.maxHistorySize);
    }
  }

  private updateConnectionStats(metric: DatabasePerformanceMetric): void {
    this.connectionStatus.totalOperations++;

    if (!metric.success) {
      this.connectionStatus.failedOperations++;
    }

    // 更新平均响应时间
    const totalResponseTime =
      this.connectionStatus.averageResponseTime * (this.connectionStatus.totalOperations - 1) +
      metric.executionTime;
    this.connectionStatus.averageResponseTime =
      totalResponseTime / this.connectionStatus.totalOperations;
  }

  private recordMetricToPerformanceMonitoring(metric: DatabasePerformanceMetric): void {
    // 记录执行时间
    this.performanceMonitoring.recordMetric(
      `database_${metric.operation}_time`,
      MetricCategory.DATABASE,
      metric.executionTime,
      "ms",
      { operation: metric.operation, table: metric.table, success: metric.success.toString() },
      {
        recordCount: metric.recordCount,
        error: metric.error,
        queryType: metric.queryType,
        indexUsed: metric.indexUsed,
      },
    );

    // 记录记录数
    this.performanceMonitoring.recordMetric(
      `database_${metric.operation}_records`,
      MetricCategory.DATABASE,
      metric.recordCount,
      "count",
      { operation: metric.operation, table: metric.table },
      {
        executionTime: metric.executionTime,
        success: metric.success,
      },
    );

    // 记录成功率
    this.performanceMonitoring.recordMetric(
      `database_${metric.operation}_success`,
      MetricCategory.DATABASE,
      metric.success ? 1 : 0,
      "boolean",
      { operation: metric.operation, table: metric.table },
      {
        executionTime: metric.executionTime,
        recordCount: metric.recordCount,
        error: metric.error,
      },
    );
  }

  private recordSlowQuery(metric: DatabasePerformanceMetric): void {
    this.performanceMonitoring.recordMetric(
      "database_slow_query",
      MetricCategory.DATABASE,
      metric.executionTime,
      "ms",
      { operation: metric.operation, table: metric.table, severity: "warning" },
      {
        threshold: this.config.slowQueryThreshold,
        exceededBy: metric.executionTime - this.config.slowQueryThreshold,
        recordCount: metric.recordCount,
        queryType: metric.queryType,
        indexUsed: metric.indexUsed,
      },
    );
  }
}

// 全局数据库性能监控实例
let globalDatabasePerformanceMonitoring: DatabasePerformanceMonitoring | null = null;

// 获取全局数据库性能监控实例
export function getDatabasePerformanceMonitoring(): DatabasePerformanceMonitoring {
  if (!globalDatabasePerformanceMonitoring) {
    globalDatabasePerformanceMonitoring = new DatabasePerformanceMonitoring();
  }
  return globalDatabasePerformanceMonitoring;
}

// 初始化全局数据库性能监控
export function initializeDatabasePerformanceMonitoring(
  _config?: Partial<DatabaseMonitoringConfig>,
): void {
  const _monitoring = getDatabasePerformanceMonitoring();
  // 配置已经通过构造函数设置
}

// 便捷的数据库操作监控函数
export function monitorDatabaseOperation<T>(
  operation: DatabaseOperation,
  table: DatabaseTable,
  recordCount: number,
  fn: () => T,
  metadata?: Record<string, unknown>,
): T {
  const monitoring = getDatabasePerformanceMonitoring();
  const operationId = monitoring.startDatabaseOperation(operation, table, recordCount, metadata);

  try {
    const result = fn();
    monitoring.endDatabaseOperation(operationId, true);
    return result;
  } catch (error) {
    monitoring.endDatabaseOperation(
      operationId,
      false,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

// 异步数据库操作监控函数
export async function monitorAsyncDatabaseOperation<T>(
  operation: DatabaseOperation,
  table: DatabaseTable,
  recordCount: number,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const monitoring = getDatabasePerformanceMonitoring();
  const operationId = monitoring.startDatabaseOperation(operation, table, recordCount, metadata);

  try {
    const result = await fn();
    monitoring.endDatabaseOperation(operationId, true);
    return result;
  } catch (error) {
    monitoring.endDatabaseOperation(
      operationId,
      false,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

// 便捷的数据库性能Hook
export function useDatabasePerformanceMonitoring() {
  const monitoring = getDatabasePerformanceMonitoring();

  return {
    monitorDatabaseOperation,
    monitorAsyncDatabaseOperation,
    startDatabaseOperation: (
      operation: DatabaseOperation,
      table: DatabaseTable,
      recordCount: number = 1,
      metadata?: Record<string, unknown>,
    ) => monitoring.startDatabaseOperation(operation, table, recordCount, metadata),
    endDatabaseOperation: (
      operationId: string,
      success?: boolean,
      error?: string,
      metadata?: Record<string, unknown>,
    ) => monitoring.endDatabaseOperation(operationId, success, error, metadata),
    recordConnection: (connectionTime: number, success?: boolean) =>
      monitoring.recordConnection(connectionTime, success),
    startTransaction: (transactionId: string) => monitoring.startTransaction(transactionId),
    addTransactionOperation: (transactionId: string, operationId: string) =>
      monitoring.addTransactionOperation(transactionId, operationId),
    endTransaction: (transactionId: string, success?: boolean) =>
      monitoring.endTransaction(transactionId, success),
    recordIndexUsage: (operationId: string, indexUsed: boolean, indexName?: string) =>
      monitoring.recordIndexUsage(operationId, indexUsed, indexName),
    recordQueryType: (operationId: string, queryType: DatabasePerformanceMetric["queryType"]) =>
      monitoring.recordQueryType(operationId, queryType),
    getDatabaseStats: () => monitoring.getDatabaseStats(),
    getRealTimeMetrics: (timeWindow?: number) => monitoring.getRealTimeMetrics(timeWindow),
    getDatabasePerformanceReport: () => monitoring.getDatabasePerformanceReport(),
    getConnectionStatus: () => monitoring.getConnectionStatus(),
  };
}
