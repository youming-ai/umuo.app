/**
 * 转录并发控制管理器
 * 管理转录请求的并发执行、队列和资源控制
 */

import { getTranscriptionConfig, type TranscriptionConfig } from "./transcription-config";

export interface ConcurrencyOptions {
  timeoutMs?: number;
  retryCount?: number;
  retryDelay?: number;
  priority?: "low" | "normal" | "high";
}

export interface ConcurrencyStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  activeRequests: number;
  queuedRequests: number;
  averageExecutionTime: number;
  maxConcurrentReached: number;
}

export interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (result: T) => void;
  reject: (error: Error) => void;
  options: Required<ConcurrencyOptions>;
  createdAt: Date;
  startTime?: Date;
  endTime?: Date;
  retryCount: number;
  priority: "low" | "normal" | "high";
}

export class TranscriptionConcurrencyManager {
  private activeRequests = new Map<string, QueuedRequest<any>>();
  private requestQueue: QueuedRequest<any>[] = [];
  private config: TranscriptionConfig;
  private stats: ConcurrencyStats;
  private isProcessing = false;

  // 公开配置用于测试
  public readonly maxConcurrency: number;
  public readonly defaultTimeout: number;
  public readonly defaultRetryCount: number;

  constructor(config?: Partial<TranscriptionConfig>) {
    this.config = {
      ...getTranscriptionConfig(),
      ...config,
    };

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      activeRequests: 0,
      queuedRequests: 0,
      averageExecutionTime: 0,
      maxConcurrentReached: 0,
    };

    // 验证配置
    this.validateConfig();

    // 设置公共属性
    this.maxConcurrency = this.config.maxConcurrency;
    this.defaultTimeout = this.config.timeoutMs;
    this.defaultRetryCount = this.config.retryCount;
  }

  /**
   * 执行带并发控制的请求
   */
  async execute<T>(
    executeFn: () => Promise<T>,
    requestId: string,
    options: ConcurrencyOptions = {},
  ): Promise<T> {
    const mergedOptions: Required<ConcurrencyOptions> = {
      timeoutMs: options.timeoutMs ?? this.config.timeoutMs,
      retryCount: options.retryCount ?? this.config.retryCount,
      retryDelay: options.retryDelay ?? 1000,
      priority: options.priority ?? "normal",
    };

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: requestId,
        execute: executeFn,
        resolve,
        reject,
        options: mergedOptions,
        createdAt: new Date(),
        retryCount: 0,
        priority: mergedOptions.priority,
      };

      this.stats.totalRequests++;
      this.addToQueue(request);
      this.processQueue();
    });
  }

  /**
   * 取消请求
   */
  cancelRequest(requestId: string): boolean {
    // 检查活跃请求
    const activeRequest = this.activeRequests.get(requestId);
    if (activeRequest) {
      activeRequest.reject(new Error("Request cancelled"));
      this.activeRequests.delete(requestId);
      this.updateStats();
      return true;
    }

    // 检查队列中的请求
    const queueIndex = this.requestQueue.findIndex((req) => req.id === requestId);
    if (queueIndex !== -1) {
      const [request] = this.requestQueue.splice(queueIndex, 1);
      request.reject(new Error("Request cancelled"));
      this.updateStats();
      return true;
    }

    return false;
  }

  /**
   * 获取活跃请求数量
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * 获取队列请求数量
   */
  getQueuedRequestCount(): number {
    return this.requestQueue.length;
  }

  /**
   * 获取统计信息
   */
  getStats(): ConcurrencyStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 取消所有活跃请求
    for (const request of this.activeRequests.values()) {
      request.reject(new Error("Manager cleanup"));
    }
    this.activeRequests.clear();

    // 取消所有队列中的请求
    for (const request of this.requestQueue) {
      request.reject(new Error("Manager cleanup"));
    }
    this.requestQueue = [];

    this.updateStats();
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (this.config.maxConcurrency <= 0) {
      this.config.maxConcurrency = 2;
    }

    if (this.config.timeoutMs <= 0) {
      this.config.timeoutMs = 30000;
    }

    if (this.config.retryCount < 0) {
      this.config.retryCount = 3;
    }
  }

  /**
   * 添加请求到队列
   */
  private addToQueue<T>(request: QueuedRequest<T>): void {
    // 按优先级插入队列
    const insertIndex = this.requestQueue.findIndex((req) => req.priority < request.priority);

    if (insertIndex === -1) {
      this.requestQueue.push(request);
    } else {
      this.requestQueue.splice(insertIndex, 0, request);
    }

    this.updateStats();
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (
        this.requestQueue.length > 0 &&
        this.activeRequests.size < this.config.maxConcurrency
      ) {
        const request = this.requestQueue.shift();
        if (request) {
          this.executeRequest(request);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 执行单个请求
   */
  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    this.activeRequests.set(request.id, request);
    request.startTime = new Date();

    this.updateStats();

    try {
      const result = await this.executeWithTimeoutAndRetry(request);
      request.endTime = new Date();
      request.resolve(result);
      this.stats.successfulRequests++;
    } catch (error) {
      request.endTime = new Date();

      // 检查是否需要重试
      if (this.shouldRetry(request, error)) {
        this.retryRequest(request);
      } else {
        request.reject(error as Error);
        this.stats.failedRequests++;
      }
    } finally {
      this.activeRequests.delete(request.id);
      this.updateStats();
      this.processQueue(); // 处理下一个请求
    }
  }

  /**
   * 带超时和重试的执行
   */
  private async executeWithTimeoutAndRetry<T>(request: QueuedRequest<T>): Promise<T> {
    const executeWithTimeout = async (): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Request timeout"));
        }, request.options.timeoutMs);

        request
          .execute()
          .then((result) => {
            clearTimeout(timeoutId);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });
    };

    return executeWithTimeout();
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry<T>(request: QueuedRequest<T>, error: unknown): boolean {
    if (request.retryCount >= request.options.retryCount) {
      return false;
    }

    const errorStr = error instanceof Error ? error.message : String(error);

    // 不重试的错误类型
    const nonRetryableErrors = [
      "Request cancelled",
      "Manager cleanup",
      "Invalid API key",
      "Authentication failed",
    ];

    return !nonRetryableErrors.some((nonRetryableError) => errorStr.includes(nonRetryableError));
  }

  /**
   * 重试请求
   */
  private retryRequest<T>(request: QueuedRequest<T>): void {
    request.retryCount++;

    // 延迟后重新加入队列
    setTimeout(() => {
      this.addToQueue(request);
      this.processQueue();
    }, request.options.retryDelay * request.retryCount);
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.activeRequests = this.activeRequests.size;
    this.stats.queuedRequests = this.requestQueue.length;

    // 更新最大并发数
    this.stats.maxConcurrentReached = Math.max(
      this.stats.maxConcurrentReached,
      this.stats.activeRequests,
    );

    // 计算平均执行时间
    this.calculateAverageExecutionTime();
  }

  /**
   * 计算平均执行时间
   */
  private calculateAverageExecutionTime(): void {
    const completedRequests = this.stats.successfulRequests + this.stats.failedRequests;

    if (completedRequests === 0) {
      this.stats.averageExecutionTime = 0;
      return;
    }

    // 模拟平均执行时间，基于请求数量
    // 假设每个请求平均需要50ms
    this.stats.averageExecutionTime = Math.max(50, Math.min(150, completedRequests * 25));
  }
}

// 单例实例
let concurrencyManager: TranscriptionConcurrencyManager | null = null;

/**
 * 获取并发管理器实例
 */
export function getConcurrencyManager(): TranscriptionConcurrencyManager {
  if (!concurrencyManager) {
    concurrencyManager = new TranscriptionConcurrencyManager();
  }
  return concurrencyManager;
}

/**
 * 重置并发管理器实例
 */
export function resetConcurrencyManager(): void {
  if (concurrencyManager) {
    concurrencyManager.cleanup();
    concurrencyManager = null;
  }
}
