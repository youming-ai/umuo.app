import type { AppError } from "@/types/api/errors";
import { handleError } from "../utils/error-handler";

/**
 * 批量处理配置接口
 */
export interface BatchProcessorConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  maxConcurrentBatches: number;
  enableProgressTracking: boolean;
}

/**
 * 进度回调接口
 */
export type ProgressCallback = (progress: {
  processed: number;
  total: number;
  percentage: number;
  currentBatch?: number;
  totalBatches?: number;
  status: "started" | "processing" | "completed" | "failed" | "retrying";
  message?: string;
  error?: string;
}) => void;

/**
 * 批量处理结果接口
 */
export interface BatchProcessorResult<T> {
  success: boolean;
  processedItems: number;
  totalItems: number;
  errors: AppError[];
  results: T[];
  performance: {
    startTime: number;
    endTime: number;
    duration: number;
    averageBatchTime: number;
    retryCount: number;
  };
}

/**
 * 默认批量处理配置
 */
export const DEFAULT_BATCH_CONFIG: BatchProcessorConfig = {
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
  maxConcurrentBatches: 3,
  enableProgressTracking: true,
};

/**
 * 内存使用统计接口
 */
export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

/**
 * 获取内存使用统计
 */
export function getMemoryStats(): MemoryStats {
  if (typeof performance === "undefined" || !("memory" in performance)) {
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usagePercentage: 0,
    };
  }

  const memory = (
    performance as typeof performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    }
  ).memory as {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };

  const usagePercentage =
    memory.jsHeapSizeLimit > 0 ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage,
  };
}

/**
 * 检查内存使用是否在安全范围内
 */
export function isMemoryUsageSafe(thresholdPercentage: number = 80): boolean {
  const stats = getMemoryStats();
  return stats.usagePercentage < thresholdPercentage;
}

/**
 * 批量处理器类
 */
export class BatchProcessor<T, R = T> {
  private config: BatchProcessorConfig;
  private onProgress?: ProgressCallback;
  private memoryThreshold: number;

  constructor(config: Partial<BatchProcessorConfig> = {}, memoryThreshold: number = 80) {
    this.config = { ...DEFAULT_BATCH_CONFIG, ...config };
    this.memoryThreshold = memoryThreshold;
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.onProgress = callback;
  }

  /**
   * 报告进度
   */
  private reportProgress(
    processed: number,
    total: number,
    status: "started" | "processing" | "completed" | "failed" | "retrying",
    message?: string,
    error?: string,
  ): void {
    if (this.onProgress && this.config.enableProgressTracking) {
      const currentBatch = Math.ceil(processed / this.config.batchSize);
      const totalBatches = Math.ceil(total / this.config.batchSize);

      this.onProgress({
        processed,
        total,
        percentage: total > 0 ? (processed / total) * 100 : 0,
        currentBatch,
        totalBatches,
        status,
        message,
        error,
      });
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 处理单个批次
   */
  private async processBatch(
    batch: T[],
    processor: (items: T[]) => Promise<R[]>,
    batchIndex: number,
    totalBatches: number,
  ): Promise<{ results: R[]; errors: AppError[] }> {
    const startTime = performance.now();
    let results: R[] = [];
    const errors: AppError[] = [];
    let lastError: AppError | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        // 检查内存使用
        if (!isMemoryUsageSafe(this.memoryThreshold)) {
          throw new Error(`内存使用超过阈值 ${this.memoryThreshold}%，处理暂停`);
        }

        // 处理批次
        const batchResults = await processor(batch);
        results = batchResults;
        lastError = null;

        // 成功处理，跳出重试循环
        break;
      } catch (error) {
        lastError = handleError(error, `BatchProcessor.processBatch_${batchIndex}`);

        if (attempt === this.config.maxRetries + 1) {
          // 最后一次重试失败，报告错误并添加到错误列表
          errors.push(lastError);
          this.reportProgress(
            batchIndex * this.config.batchSize + batch.length,
            totalBatches * this.config.batchSize,
            "failed",
            `批次 ${batchIndex + 1}/${totalBatches} 处理失败`,
            lastError.message,
          );
        } else {
          // 重试前报告状态
          this.reportProgress(
            batchIndex * this.config.batchSize + batch.length,
            totalBatches * this.config.batchSize,
            "retrying",
            `批次 ${batchIndex + 1}/${totalBatches} 重试中 (${attempt}/${this.config.maxRetries})`,
          );

          // 指数退避
          const delay = this.config.retryDelay * 2 ** (attempt - 1);
          await this.delay(delay);
        }
      }
    }

    const endTime = performance.now();
    const _batchTime = endTime - startTime;

    return { results, errors };
  }

  /**
   * 并发处理多个批次
   */
  private async processBatchesConcurrently(
    batches: T[][],
    processor: (items: T[]) => Promise<R[]>,
  ): Promise<{ allResults: R[]; allErrors: AppError[] }> {
    const allResults: R[] = [];
    const allErrors: AppError[] = [];
    const totalBatches = batches.length;

    // 并发处理批次，限制并发数
    for (let i = 0; i < batches.length; i += this.config.maxConcurrentBatches) {
      const batchGroup = batches.slice(i, i + this.config.maxConcurrentBatches);

      const batchPromises = batchGroup.map(async (batch, groupIndex) => {
        const batchIndex = i + groupIndex;
        return this.processBatch(batch, processor, batchIndex, totalBatches);
      });

      const batchResults = await Promise.all(batchPromises);

      // 合并结果
      batchResults.forEach(({ results, errors }) => {
        allResults.push(...results);
        allErrors.push(...errors);
      });

      // 更新进度
      const processedItems = Math.min(
        (i + batchGroup.length) * this.config.batchSize,
        totalBatches * this.config.batchSize,
      );
      this.reportProgress(
        processedItems,
        totalBatches * this.config.batchSize,
        "processing",
        `已处理 ${i + batchGroup.length}/${totalBatches} 批次`,
      );
    }

    return { allResults, allErrors };
  }

  /**
   * 主要的批量处理方法
   */
  async process(
    items: T[],
    processor: (items: T[]) => Promise<R[]>,
  ): Promise<BatchProcessorResult<R>> {
    const startTime = performance.now();
    const totalItems = items.length;

    // 如果没有项目，直接返回空结果
    if (totalItems === 0) {
      return {
        success: true,
        processedItems: 0,
        totalItems: 0,
        errors: [],
        results: [],
        performance: {
          startTime,
          endTime: performance.now(),
          duration: 0,
          averageBatchTime: 0,
          retryCount: 0,
        },
      };
    }

    // 报告开始
    this.reportProgress(0, totalItems, "started", "开始批量处理");

    // 将项目分批
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      batches.push(items.slice(i, i + this.config.batchSize));
    }

    try {
      // 并发处理批次
      const { allResults, allErrors } = await this.processBatchesConcurrently(batches, processor);

      const endTime = performance.now();
      const duration = endTime - startTime;
      const successfulItems = allResults.length;
      const totalBatches = batches.length;
      const averageBatchTime = totalBatches > 0 ? duration / totalBatches : 0;

      // 报告完成
      this.reportProgress(
        successfulItems,
        totalItems,
        allErrors.length === 0 ? "completed" : "failed",
        allErrors.length === 0 ? "批量处理完成" : `批量处理完成，但有 ${allErrors.length} 个错误`,
      );

      return {
        success: allErrors.length === 0,
        processedItems: successfulItems,
        totalItems,
        errors: allErrors,
        results: allResults,
        performance: {
          startTime,
          endTime,
          duration,
          averageBatchTime,
          retryCount: allErrors.length,
        },
      };
    } catch (error) {
      const appError = handleError(error, "BatchProcessor.process");

      this.reportProgress(0, totalItems, "failed", "批量处理失败", appError.message);

      return {
        success: false,
        processedItems: 0,
        totalItems,
        errors: [appError],
        results: [],
        performance: {
          startTime,
          endTime: performance.now(),
          duration: performance.now() - startTime,
          averageBatchTime: 0,
          retryCount: 0,
        },
      };
    }
  }

  /**
   * 验证批量处理配置
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.batchSize <= 0) {
      errors.push("批次大小必须大于0");
    }

    if (this.config.batchSize > 1000) {
      errors.push("批次大小不能超过1000");
    }

    if (this.config.maxRetries < 0) {
      errors.push("最大重试次数不能为负数");
    }

    if (this.config.maxRetries > 10) {
      errors.push("最大重试次数不能超过10");
    }

    if (this.config.maxConcurrentBatches <= 0) {
      errors.push("并发批次数必须大于0");
    }

    if (this.config.maxConcurrentBatches > 10) {
      errors.push("并发批次数不能超过10");
    }

    if (this.memoryThreshold <= 0 || this.memoryThreshold > 100) {
      errors.push("内存阈值必须在0-100之间");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 创建优化的数据库批量操作处理器
 */
export function createDatabaseBatchProcessor<T extends { id?: number }, R = T>(
  _dbOperation: (items: T[]) => Promise<R[]>,
  config?: Partial<BatchProcessorConfig>,
): BatchProcessor<T, R> {
  // 数据库操作的特殊配置
  const dbConfig: Partial<BatchProcessorConfig> = {
    batchSize: 50, // 数据库操作使用更小的批次
    maxConcurrentBatches: 1, // 数据库操作通常需要串行执行
    ...config,
  };

  return new BatchProcessor<T, R>(dbConfig);
}

/**
 * 智能批量处理器 - 根据项目数量自动调整配置
 */
export function createSmartBatchProcessor<T, R = T>(
  items: T[],
  _processor: (items: T[]) => Promise<R[]>,
  baseConfig?: Partial<BatchProcessorConfig>,
): BatchProcessor<T, R> {
  // 根据项目数量智能调整配置
  const itemCount = items.length;
  let smartConfig = { ...DEFAULT_BATCH_CONFIG, ...baseConfig };

  if (itemCount > 10000) {
    // 大量数据 - 使用更大的批次，但限制并发
    smartConfig = {
      ...smartConfig,
      batchSize: 200,
      maxConcurrentBatches: 2,
    };
  } else if (itemCount > 1000) {
    // 中等数据 - 平衡配置
    smartConfig = {
      ...smartConfig,
      batchSize: 100,
      maxConcurrentBatches: 3,
    };
  } else {
    // 小量数据 - 更小的批次，更多并发
    smartConfig = {
      ...smartConfig,
      batchSize: 50,
      maxConcurrentBatches: 4,
    };
  }

  return new BatchProcessor<T, R>(smartConfig);
}
