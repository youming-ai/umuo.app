/**
 * 重试机制工具 - 提供弹性重试和指数退避功能
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[] | ((error: Error) => boolean);
  onRetry?: (error: Error, attempt: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: [
    "NETWORK_ERROR",
    "TIMEOUT_ERROR",
    "RATE_LIMIT_ERROR",
    "ECONNRESET",
    "ETIMEDOUT",
  ],
  onRetry: () => {
    // Default no-op retry handler
  },
  shouldRetry: (_error) => true,
};

/**
 * 计算退避延迟
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoffFactor: number,
): number {
  const delay = baseDelay * backoffFactor ** (attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: Error, options: Required<RetryOptions>): boolean {
  // 使用自定义判断函数
  if (options.shouldRetry && !options.shouldRetry(error)) {
    return false;
  }

  // 检查错误类型
  if (Array.isArray(options.retryableErrors)) {
    const errorMessage = error.message.toUpperCase();
    const errorCode = (error as { code?: string }).code?.toUpperCase();

    return options.retryableErrors.some(
      (retryableError) => errorMessage.includes(retryableError) || errorCode === retryableError,
    );
  }

  // 使用自定义错误判断函数
  if (typeof options.retryableErrors === "function") {
    return options.retryableErrors(error);
  }

  return true;
}

/**
 * 带重试机制的异步函数执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果这是最后一次尝试或错误不可重试，直接返回失败
      if (attempt === config.maxAttempts || !isRetryableError(lastError, config)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
        };
      }

      // 计算延迟时间
      const delay = calculateDelay(
        attempt,
        config.baseDelay,
        config.maxDelay,
        config.backoffFactor,
      );

      // 调用重试回调
      config.onRetry(lastError, attempt);

      // 等待延迟
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
  };
}

/**
 * 创建重试包装器
 */
export function createRetryWrapper<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {},
) {
  return async (...args: T): Promise<RetryResult<R>> => withRetry(() => fn(...args), options);
}

/**
 * 带重试的 fetch 函数
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { retryOptions?: RetryOptions },
): Promise<Response> {
  const configRetryOptions = options?.retryOptions || {};

  const result = await withRetry(async () => {
    const { retryOptions: _, ...fetchOptions } = options || {};
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }, configRetryOptions);

  if (!result.success || !result.data) {
    throw result.error || new Error("Fetch failed after retries");
  }

  return result.data;
}

/**
 * 断路器模式实现
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeout: number = 60000, // 1 minutereadonly _monitoringPeriod: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  getState(): "CLOSED" | "OPEN" | "HALF_OPEN" {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  reset(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.lastFailureTime = 0;
  }
}

/**
 * 超时包装器
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out",
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
