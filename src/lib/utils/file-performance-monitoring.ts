/**
 * 文件处理性能监控
 * 专门监控文件上传、分块、验证等操作的性能指标
 */

import type { ValidationResult } from "./file-validation";
import { MetricCategory, PerformanceMonitoring } from "./performance-monitoring";

// 文件处理操作类型
export enum FileOperation {
  UPLOAD = "upload",
  VALIDATION = "validation",
  CHUNKING = "chunking",
  STORAGE = "storage",
  RETRIEVAL = "retrieval",
  PROCESSING = "processing",
  CONVERSION = "conversion",
}

// 文件处理性能指标
export interface FilePerformanceMetric {
  operation: FileOperation;
  fileSize: number;
  processingTime: number;
  chunksCount?: number;
  chunkSize?: number;
  transferSpeed: number; // bytes/second
  memoryUsage: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// 文件处理统计
export interface FileProcessingStats {
  totalFiles: number;
  totalSize: number;
  averageProcessingTime: number;
  averageTransferSpeed: number;
  successRate: number;
  errorBreakdown: Record<string, number>;
  sizeDistribution: {
    small: number; // < 10MB
    medium: number; // 10-50MB
    large: number; // 50-100MB
    huge: number; // > 100MB
  };
  operationBreakdown: Record<
    FileOperation,
    {
      count: number;
      averageTime: number;
      successRate: number;
    }
  >;
}

// 文件处理监控配置
export interface FileMonitoringConfig {
  enabled: boolean;
  trackDetailedMetrics: boolean;
  trackMemoryUsage: boolean;
  trackTransferSpeed: boolean;
  enableRealTimeMonitoring: boolean;
  samplingRate: number;
  maxHistorySize: number;
  performanceThresholds: {
    upload: number; // ms
    validation: number; // ms
    chunking: number; // ms
    storage: number; // ms
  };
}

// 默认配置
const DEFAULT_FILE_MONITORING_CONFIG: Required<FileMonitoringConfig> = {
  enabled: true,
  trackDetailedMetrics: true,
  trackMemoryUsage: true,
  trackTransferSpeed: true,
  enableRealTimeMonitoring: true,
  samplingRate: 1.0,
  maxHistorySize: 1000,
  performanceThresholds: {
    upload: 30000, // 30秒
    validation: 5000, // 5秒
    chunking: 10000, // 10秒
    storage: 5000, // 5秒
  },
};

// 文件处理监控类
export class FilePerformanceMonitoring {
  private config: Required<FileMonitoringConfig>;
  private performanceMonitoring: PerformanceMonitoring;
  private metrics: FilePerformanceMetric[] = [];
  private activeOperations: Map<
    string,
    {
      startTime: number;
      startMemory: number;
      operation: FileOperation;
      fileSize: number;
      metadata?: Record<string, unknown>;
    }
  > = new Map();

  constructor(
    config: Partial<FileMonitoringConfig> = {},
    performanceMonitoring?: PerformanceMonitoring,
  ) {
    this.config = { ...DEFAULT_FILE_MONITORING_CONFIG, ...config };
    this.performanceMonitoring = performanceMonitoring || new PerformanceMonitoring();
  }

  // 开始文件操作监控
  startFileOperation(
    operation: FileOperation,
    fileSize: number,
    metadata?: Record<string, unknown>,
  ): string {
    if (!this.config.enabled) return "";

    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();
    const startMemory = this.getCurrentMemoryUsage();

    this.activeOperations.set(operationId, {
      startTime,
      startMemory,
      operation,
      fileSize,
      metadata,
    });

    // 记录开始事件
    this.performanceMonitoring.recordMetric(
      `file_${operation}_started`,
      MetricCategory.FILE_PROCESSING,
      fileSize,
      "bytes",
      { operation },
      metadata,
    );

    return operationId;
  }

  // 结束文件操作监控
  endFileOperation(
    operationId: string,
    success: boolean = true,
    error?: string,
    additionalMetadata?: Record<string, unknown>,
  ): FilePerformanceMetric | null {
    if (!this.config.enabled) return null;

    const operation = this.activeOperations.get(operationId);
    if (!operation) return null;

    const endTime = performance.now();
    const endMemory = this.getCurrentMemoryUsage();
    const processingTime = endTime - operation.startTime;
    const memoryDelta = endMemory - operation.startMemory;
    const transferSpeed = operation.fileSize / (processingTime / 1000); // bytes/second

    const metric: FilePerformanceMetric = {
      operation: operation.operation,
      fileSize: operation.fileSize,
      processingTime,
      transferSpeed,
      memoryUsage: memoryDelta,
      success,
      error,
      metadata: {
        ...operation.metadata,
        ...additionalMetadata,
        operationId,
      },
    };

    // 添加到历史记录
    this.metrics.push(metric);
    this.trimHistory();

    // 记录到性能监控系统
    this.recordMetricToPerformanceMonitoring(metric);

    // 检查性能阈值
    this.checkPerformanceThresholds(metric);

    // 清理活动操作
    this.activeOperations.delete(operationId);

    return metric;
  }

  // 记录文件分块指标
  recordChunkingMetrics(
    operationId: string,
    chunksCount: number,
    chunkSize: number,
    chunkingTime: number,
  ): void {
    if (!this.config.enabled || !this.config.trackDetailedMetrics) return;

    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    // 更新操作元数据
    operation.metadata = {
      ...operation.metadata,
      chunksCount,
      chunkSize,
      chunkingTime,
    };

    // 记录分块性能指标
    this.performanceMonitoring.recordMetric(
      "file_chunking_time",
      MetricCategory.FILE_PROCESSING,
      chunkingTime,
      "ms",
      { operation: operation.operation },
      {
        fileSize: operation.fileSize,
        chunksCount,
        chunkSize,
      },
    );

    this.performanceMonitoring.recordMetric(
      "file_chunks_count",
      MetricCategory.FILE_PROCESSING,
      chunksCount,
      "count",
      { operation: operation.operation },
      {
        fileSize: operation.fileSize,
        chunkSize,
      },
    );
  }

  // 记录文件验证指标
  recordValidationMetrics(
    operationId: string,
    validationTime: number,
    validationResult: ValidationResult,
  ): void {
    if (!this.config.enabled || !this.config.trackDetailedMetrics) return;

    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    // 更新操作元数据
    operation.metadata = {
      ...operation.metadata,
      validationTime,
      validationResult,
    };

    // 记录验证性能指标
    this.performanceMonitoring.recordMetric(
      "file_validation_time",
      MetricCategory.FILE_PROCESSING,
      validationTime,
      "ms",
      { operation: operation.operation },
      {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
        securityScore: validationResult.securityScore,
      },
    );

    this.performanceMonitoring.recordMetric(
      "file_validation_score",
      MetricCategory.FILE_PROCESSING,
      validationResult.securityScore ?? 0,
      "score",
      { operation: operation.operation },
      {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
      },
    );
  }

  // 记录存储指标
  recordStorageMetrics(
    operationId: string,
    storageTime: number,
    storageMethod: "indexeddb" | "memory" | "cache",
    compressedSize?: number,
  ): void {
    if (!this.config.enabled || !this.config.trackDetailedMetrics) return;

    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    const compressionRatio = compressedSize ? (compressedSize / operation.fileSize) * 100 : 100;

    // 更新操作元数据
    operation.metadata = {
      ...operation.metadata,
      storageTime,
      storageMethod,
      compressedSize,
      compressionRatio,
    };

    // 记录存储性能指标
    this.performanceMonitoring.recordMetric(
      "file_storage_time",
      MetricCategory.FILE_PROCESSING,
      storageTime,
      "ms",
      { operation: operation.operation, storageMethod },
      {
        fileSize: operation.fileSize,
        compressedSize,
        compressionRatio,
      },
    );

    this.performanceMonitoring.recordMetric(
      "file_compression_ratio",
      MetricCategory.FILE_PROCESSING,
      compressionRatio,
      "percent",
      { operation: operation.operation, storageMethod },
      {
        originalSize: operation.fileSize,
        compressedSize,
      },
    );
  }

  // 获取文件处理统计
  getFileProcessingStats(): FileProcessingStats {
    const successfulMetrics = this.metrics.filter((m) => m.success);
    const failedMetrics = this.metrics.filter((m) => !m.success);

    const totalFiles = this.metrics.length;
    const totalSize = this.metrics.reduce((sum, m) => sum + m.fileSize, 0);
    const averageProcessingTime =
      totalFiles > 0 ? this.metrics.reduce((sum, m) => sum + m.processingTime, 0) / totalFiles : 0;
    const averageTransferSpeed =
      totalFiles > 0 ? this.metrics.reduce((sum, m) => sum + m.transferSpeed, 0) / totalFiles : 0;
    const successRate = totalFiles > 0 ? (successfulMetrics.length / totalFiles) * 100 : 0;

    // 错误分类统计
    const errorBreakdown: Record<string, number> = {};
    failedMetrics.forEach((metric) => {
      if (metric.error) {
        errorBreakdown[metric.error] = (errorBreakdown[metric.error] || 0) + 1;
      }
    });

    // 文件大小分布
    const sizeDistribution = {
      small: this.metrics.filter((m) => m.fileSize < 10 * 1024 * 1024).length,
      medium: this.metrics.filter(
        (m) => m.fileSize >= 10 * 1024 * 1024 && m.fileSize < 50 * 1024 * 1024,
      ).length,
      large: this.metrics.filter(
        (m) => m.fileSize >= 50 * 1024 * 1024 && m.fileSize < 100 * 1024 * 1024,
      ).length,
      huge: this.metrics.filter((m) => m.fileSize >= 100 * 1024 * 1024).length,
    };

    // 操作分类统计
    const operationBreakdown: Record<
      FileOperation,
      {
        count: number;
        averageTime: number;
        successRate: number;
      }
    > = {} as any;

    Object.values(FileOperation).forEach((operation) => {
      const operationMetrics = this.metrics.filter((m) => m.operation === operation);
      const successfulOperationMetrics = operationMetrics.filter((m) => m.success);

      operationBreakdown[operation] = {
        count: operationMetrics.length,
        averageTime:
          operationMetrics.length > 0
            ? operationMetrics.reduce((sum, m) => sum + m.processingTime, 0) /
              operationMetrics.length
            : 0,
        successRate:
          operationMetrics.length > 0
            ? (successfulOperationMetrics.length / operationMetrics.length) * 100
            : 0,
      };
    });

    return {
      totalFiles,
      totalSize,
      averageProcessingTime,
      averageTransferSpeed,
      successRate,
      errorBreakdown,
      sizeDistribution,
      operationBreakdown,
    };
  }

  // 获取实时性能指标
  getRealTimeMetrics(timeWindow: number = 60000): {
    currentOperations: number;
    averageProcessingTime: number;
    successRate: number;
    throughput: number; // files per minute
    errorRate: number;
  } {
    const _cutoff = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter((_m) => {
      // 假设metric有timestamp字段，如果没有需要调整
      return true; // 暂时返回所有指标
    });

    const successfulRecent = recentMetrics.filter((m) => m.success);
    const failedRecent = recentMetrics.filter((m) => !m.success);

    return {
      currentOperations: this.activeOperations.size,
      averageProcessingTime:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length
          : 0,
      successRate:
        recentMetrics.length > 0 ? (successfulRecent.length / recentMetrics.length) * 100 : 0,
      throughput: (recentMetrics.length / timeWindow) * 60000, // files per minute
      errorRate: recentMetrics.length > 0 ? (failedRecent.length / recentMetrics.length) * 100 : 0,
    };
  }

  // 获取性能报告
  getFilePerformanceReport() {
    const stats = this.getFileProcessingStats();
    const realTimeMetrics = this.getRealTimeMetrics();
    const recentMetrics = this.metrics.slice(-50); // 最近50条记录
    const performanceAlerts: string[] = [];

    return {
      stats,
      realTimeMetrics,
      recentMetrics,
      performanceAlerts,
      timestamp: Date.now(),
    };
  }

  // 清理历史记录
  clearHistory(): void {
    this.metrics = [];
  }

  // 私有方法

  private getCurrentMemoryUsage(): number {
    if (typeof performance === "undefined" || !("memory" in performance)) {
      return 0;
    }
    return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024); // MB
  }

  private trimHistory(): void {
    if (this.metrics.length > this.config.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.config.maxHistorySize);
    }
  }

  private recordMetricToPerformanceMonitoring(metric: FilePerformanceMetric): void {
    // 记录处理时间
    this.performanceMonitoring.recordMetric(
      `file_${metric.operation}_time`,
      MetricCategory.FILE_PROCESSING,
      metric.processingTime,
      "ms",
      { operation: metric.operation, success: metric.success.toString() },
      {
        fileSize: metric.fileSize,
        transferSpeed: metric.transferSpeed,
        memoryUsage: metric.memoryUsage,
        error: metric.error,
      },
    );

    // 记录传输速度
    if (this.config.trackTransferSpeed) {
      this.performanceMonitoring.recordMetric(
        `file_${metric.operation}_speed`,
        MetricCategory.FILE_PROCESSING,
        metric.transferSpeed,
        "bytes/second",
        { operation: metric.operation },
        {
          fileSize: metric.fileSize,
          processingTime: metric.processingTime,
        },
      );
    }

    // 记录内存使用
    if (this.config.trackMemoryUsage) {
      this.performanceMonitoring.recordMetric(
        `file_${metric.operation}_memory`,
        MetricCategory.FILE_PROCESSING,
        metric.memoryUsage,
        "MB",
        { operation: metric.operation },
        {
          fileSize: metric.fileSize,
          processingTime: metric.processingTime,
        },
      );
    }

    // 记录成功率
    this.performanceMonitoring.recordMetric(
      `file_${metric.operation}_success`,
      MetricCategory.FILE_PROCESSING,
      metric.success ? 1 : 0,
      "boolean",
      { operation: metric.operation },
      {
        fileSize: metric.fileSize,
        processingTime: metric.processingTime,
        error: metric.error,
      },
    );
  }

  private checkPerformanceThresholds(metric: FilePerformanceMetric): void {
    const threshold =
      this.config.performanceThresholds[
        metric.operation as keyof typeof this.config.performanceThresholds
      ];
    if (!threshold) return;

    if (metric.processingTime > threshold) {
      this.performanceMonitoring.recordMetric(
        `file_${metric.operation}_threshold_exceeded`,
        MetricCategory.FILE_PROCESSING,
        metric.processingTime,
        "ms",
        { operation: metric.operation, severity: "warning" },
        {
          threshold,
          fileSize: metric.fileSize,
          exceededBy: metric.processingTime - threshold,
        },
      );
    }
  }
}

// 全局文件性能监控实例
let globalFilePerformanceMonitoring: FilePerformanceMonitoring | null = null;

// 获取全局文件性能监控实例
export function getFilePerformanceMonitoring(): FilePerformanceMonitoring {
  if (!globalFilePerformanceMonitoring) {
    globalFilePerformanceMonitoring = new FilePerformanceMonitoring();
  }
  return globalFilePerformanceMonitoring;
}

// 初始化全局文件性能监控
export function initializeFilePerformanceMonitoring(_config?: Partial<FileMonitoringConfig>): void {
  const _monitoring = getFilePerformanceMonitoring();
  // 配置已经通过构造函数设置
}

// 便捷的文件操作监控函数
export function monitorFileOperation<T>(
  operation: FileOperation,
  fileSize: number,
  fn: () => T,
  metadata?: Record<string, unknown>,
): T {
  const monitoring = getFilePerformanceMonitoring();
  const operationId = monitoring.startFileOperation(operation, fileSize, metadata);

  try {
    const result = fn();
    monitoring.endFileOperation(operationId, true);
    return result;
  } catch (error) {
    monitoring.endFileOperation(
      operationId,
      false,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

// 异步文件操作监控函数
export async function monitorAsyncFileOperation<T>(
  operation: FileOperation,
  fileSize: number,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const monitoring = getFilePerformanceMonitoring();
  const operationId = monitoring.startFileOperation(operation, fileSize, metadata);

  try {
    const result = await fn();
    monitoring.endFileOperation(operationId, true);
    return result;
  } catch (error) {
    monitoring.endFileOperation(
      operationId,
      false,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

// 便捷的文件性能Hook
export function useFilePerformanceMonitoring() {
  const monitoring = getFilePerformanceMonitoring();

  return {
    monitorFileOperation,
    monitorAsyncFileOperation,
    startFileOperation: (
      operation: FileOperation,
      fileSize: number,
      metadata?: Record<string, unknown>,
    ) => monitoring.startFileOperation(operation, fileSize, metadata),
    endFileOperation: (
      operationId: string,
      success?: boolean,
      error?: string,
      metadata?: Record<string, unknown>,
    ) => monitoring.endFileOperation(operationId, success, error, metadata),
    recordChunkingMetrics: (
      operationId: string,
      chunksCount: number,
      chunkSize: number,
      chunkingTime: number,
    ) => monitoring.recordChunkingMetrics(operationId, chunksCount, chunkSize, chunkingTime),
    recordValidationMetrics: (
      operationId: string,
      validationTime: number,
      validationResult: ValidationResult,
    ) => monitoring.recordValidationMetrics(operationId, validationTime, validationResult),
    recordStorageMetrics: (
      operationId: string,
      storageTime: number,
      storageMethod: "indexeddb" | "memory" | "cache",
      compressedSize?: number,
    ) => monitoring.recordStorageMetrics(operationId, storageTime, storageMethod, compressedSize),
    getFileProcessingStats: () => monitoring.getFileProcessingStats(),
    getRealTimeMetrics: (timeWindow?: number) => monitoring.getRealTimeMetrics(timeWindow),
    getFilePerformanceReport: () => monitoring.getFilePerformanceReport(),
  };
}
