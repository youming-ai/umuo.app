/**
 * 性能优化工具函数
 * 提供并发控制、批处理、防抖等性能优化功能
 */

// 信号量实现 - 控制并发数量
export class Semaphore {
  private permits: number;
  private waitQueue: Array<{
    resolve: () => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor(permits: number) {
    if (permits <= 0) {
      throw new Error("许可数必须大于0");
    }
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        next.resolve();
      }
    } else {
      this.permits++;
    }
  }

  get available(): number {
    return this.permits;
  }

  get queued(): number {
    return this.waitQueue.length;
  }
}

// 并发控制的批处理执行器
export interface BatchProcessorOptions<T, R> {
  batchSize: number;
  maxConcurrency: number;
  onProgress?: (completed: number, total: number) => void;
  onError?: (error: unknown, item: T) => void;
  onSuccess?: (result: R, item: T) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

export class BatchProcessor<T, R> {
  private options: Required<BatchProcessorOptions<T, R>>;
  private semaphore: Semaphore;

  constructor(options: BatchProcessorOptions<T, R>) {
    this.options = {
      batchSize: options.batchSize,
      maxConcurrency: options.maxConcurrency,
      onProgress: options.onProgress || (() => {}),
      onError: options.onError || (() => {}),
      onSuccess: options.onSuccess || (() => {}),
      retryAttempts: options.retryAttempts || 0,
      retryDelay: options.retryDelay || 1000,
    };

    this.semaphore = new Semaphore(this.options.maxConcurrency);
  }

  async process(items: T[], processor: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    let completed = 0;

    // 将数据分批
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.options.batchSize) {
      batches.push(items.slice(i, i + this.options.batchSize));
    }

    console.log(
      `📦 开始批处理: ${items.length} 项, 分 ${batches.length} 批, 每批 ${this.options.batchSize} 项, 最大并发 ${this.options.maxConcurrency}`,
    );

    // 并行处理批次
    const batchPromises = batches.map(async (batch, batchIndex) => {
      await this.semaphore.acquire();

      try {
        console.log(`🚀 开始处理批次 ${batchIndex + 1}/${batches.length}, 包含 ${batch.length} 项`);

        // 顺序处理批次内的项目（保持顺序）
        const batchResults: R[] = [];
        for (const item of batch) {
          try {
            const result = await this.executeWithRetry(item, processor);
            batchResults.push(result);
            this.options.onSuccess(result, item);
          } catch (error) {
            this.options.onError(error, item);
            // 可选择继续处理其他项目或中断
            console.error(`批处理项目失败:`, error);
          }

          completed++;
          this.options.onProgress(completed, items.length);
        }

        console.log(`✅ 批次 ${batchIndex + 1} 处理完成`);
        return batchResults;
      } finally {
        this.semaphore.release();
      }
    });

    // 等待所有批次完成
    const batchResults = await Promise.allSettled(batchPromises);

    // 收集成功的结果
    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(...result.value);
      } else {
        console.error(`批次处理失败:`, result.reason);
      }
    });

    console.log(`🎉 批处理完成: ${results.length}/${items.length} 成功`);
    return results;
  }

  private async executeWithRetry(item: T, processor: (item: T) => Promise<R>): Promise<R> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await processor(item);
      } catch (error) {
        lastError = error;

        if (attempt < this.options.retryAttempts) {
          const delay = this.options.retryDelay * Math.pow(2, attempt);
          console.warn(
            `批处理项目失败，${delay}ms 后重试 (${attempt + 1}/${this.options.retryAttempts}):`,
            error,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {},
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;
  let lastCallTime: number;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let result: ReturnType<T>;

  const { leading = false, trailing = true, maxWait } = options;

  function invokeFunc(time: number) {
    const args = lastArgs!;
    lastArgs = undefined;
    lastInvokeTime = time;
    result = func(...args);
    return result;
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastCallTime;
    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && time - lastInvokeTime >= maxWait)
    );
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number) {
    timeoutId = undefined;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined;
    return result;
  }

  function debounced(...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait !== undefined) {
        timeoutId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeoutId === undefined) {
      timeoutId = setTimeout(timerExpired, wait);
    }
    return result;
  }

  debounced.cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = 0;
    timeoutId = undefined;
  };

  debounced.flush = () => {
    return timeoutId === undefined ? result : trailingEdge(Date.now());
  };

  return debounced;
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: unknown;
  let lastInvokeTime = 0;
  let result: ReturnType<T>;

  const { leading = true, trailing = true } = options;

  function invokeFunc(time: number) {
    const args = lastArgs!;
    const thisArg = lastThis;
    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - lastInvokeTime;
    return wait - timeSinceLastCall;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastInvokeTime;
    return lastInvokeTime === undefined || timeSinceLastCall >= wait || timeSinceLastCall < 0;
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number) {
    timeoutId = undefined;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined;
    lastThis = undefined;
    return result;
  }

  function throttled(...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;

    if (isInvoking) {
      if (timeoutId === undefined) {
        return leadingEdge(lastCallTime);
      }
    }
    if (timeoutId === undefined) {
      timeoutId = setTimeout(timerExpired, wait);
    }
    return result;
  }

  throttled.cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastThis = undefined;
    timeoutId = undefined;
  };

  throttled.flush = () => {
    return timeoutId === undefined ? result : trailingEdge(Date.now());
  };

  return throttled;
}

// 内存优化的缓存管理
export class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number; accessCount: number }>();
  private maxSize: number;
  private ttl: number; // 生存时间（毫秒）

  constructor(maxSize: number = 1000, ttl: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key: K, value: V): void {
    const now = Date.now();

    // 清理过期项
    this.cleanup(now);

    // 如果缓存已满，删除最少使用的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
    });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();

    // 检查是否过期
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // 更新访问统计
    entry.accessCount++;
    entry.timestamp = now;

    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestScore = Infinity;

    for (const [key, entry] of this.cache) {
      // 综合考虑访问次数和最后访问时间
      const score = entry.accessCount / (Date.now() - entry.timestamp);
      if (score < oldestScore) {
        oldestScore = score;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }
}

// 性能监控工具
export class PerformanceMonitor {
  private metrics = new Map<
    string,
    { count: number; totalTime: number; minTime: number; maxTime: number }
  >();

  startTimer(operation: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.record(operation, duration);
    };
  }

  private record(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
      });
    }

    const metric = this.metrics.get(operation)!;
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
  }

  getMetrics(): Record<
    string,
    {
      count: number;
      averageTime: number;
      minTime: number;
      maxTime: number;
      totalTime: number;
    }
  > {
    const result: Record<string, any> = {};

    for (const [operation, metric] of this.metrics) {
      result[operation] = {
        count: metric.count,
        averageTime: metric.totalTime / metric.count,
        minTime: metric.minTime,
        maxTime: metric.maxTime,
        totalTime: metric.totalTime,
      };
    }

    return result;
  }

  reset(): void {
    this.metrics.clear();
  }

  printMetrics(): void {
    console.table(this.getMetrics());
  }
}

// 导出默认实例
export const performanceMonitor = new PerformanceMonitor();
