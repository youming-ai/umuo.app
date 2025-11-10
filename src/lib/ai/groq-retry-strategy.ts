import { Groq } from "groq-sdk";

export interface GroqRetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterFactor: number;
  retryableErrors: string[];
  retryableStatusCodes: number[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  onFailed?: (error: Error, attempts: number) => void;
}

export interface GroqRetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
  averageResponseTime?: number;
}

export const DEFAULT_GROQ_RETRY_OPTIONS: GroqRetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  jitterFactor: 0.1,
  retryableErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNREFUSED",
    "rate_limit_exceeded",
    "insufficient_quota",
    "overloaded_error",
    "timeout",
    "network_error",
    "connection_error",
  ],
  retryableStatusCodes: [429, 500, 502, 503, 504],
  onRetry: (attempt, error, delay) => {
    console.warn(
      `Groq API retry attempt ${attempt} after ${delay}ms delay:`,
      error.message,
    );
  },
  onFailed: (error, attempts) => {
    console.error(`Groq API failed after ${attempts} attempts:`, error.message);
  },
};

/**
 * Advanced retry strategy with exponential backoff, jitter, and intelligent error classification
 *
 * Features:
 * - Exponential backoff with jitter to prevent thundering herd
 * - Intelligent error classification for retryable vs non-retryable errors
 * - Configurable retry limits and delays
 * - Comprehensive logging and monitoring
 * - Support for different error types (network, API, rate limits)
 */
export class GroqRetryStrategy {
  private options: GroqRetryOptions;

  constructor(options: Partial<GroqRetryOptions> = {}) {
    this.options = { ...DEFAULT_GROQ_RETRY_OPTIONS, ...options };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    customOptions?: Partial<GroqRetryOptions>,
  ): Promise<GroqRetryResult<T>> {
    const config = { ...this.options, ...customOptions };
    let lastError: Error | undefined;
    let totalDelay = 0;
    const responseTimes: number[] = [];

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const startTime = Date.now();

      try {
        const result = await operation();
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        if (attempt > 1) {
          console.log(
            `Groq API operation succeeded on attempt ${attempt} after ${totalDelay}ms total delay`,
          );
        }

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalDelay,
          averageResponseTime:
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        // Check if this is a retryable error
        if (!this.isRetryableError(lastError, config)) {
          console.error(
            `Non-retryable error encountered: ${lastError.message}`,
          );
          break;
        }

        // If this is the last attempt, don't delay
        if (attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        totalDelay += delay;

        // Call retry callback
        config.onRetry?.(attempt, lastError, delay);

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    // All attempts failed
    config.onFailed?.(lastError!, config.maxAttempts);

    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalDelay,
      averageResponseTime:
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : undefined,
    };
  }

  /**
   * Execute a Groq API call with retry logic
   */
  async executeGroqCall<T>(
    client: Groq,
    callMethod: keyof Groq,
    ...args: any[]
  ): Promise<GroqRetryResult<T>> {
    return this.execute(async () => {
      const method = client[callMethod] as Function;
      return await method.apply(client, args);
    });
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error, config: GroqRetryOptions): boolean {
    const message = error.message.toLowerCase();

    // Check for retryable error messages
    const isRetryableMessage = config.retryableErrors.some((retryableError) =>
      message.includes(retryableError.toLowerCase()),
    );

    // Check for retryable status codes (if error has status property)
    const statusCode = (error as any).status || (error as any).statusCode;
    const isRetryableStatusCode =
      statusCode && config.retryableStatusCodes.includes(statusCode);

    // Check for specific Groq API error patterns
    const isRateLimitError =
      message.includes("rate_limit") || message.includes("too many requests");
    const isQuotaError =
      message.includes("quota") || message.includes("insufficient_quota");
    const isNetworkError =
      message.includes("network") || message.includes("connection");
    const isTimeoutError =
      message.includes("timeout") || message.includes("timed out");

    // Quota errors are generally not retryable in the short term
    if (isQuotaError) {
      return false;
    }

    return (
      isRetryableMessage ||
      isRetryableStatusCode ||
      isRateLimitError ||
      isNetworkError ||
      isTimeoutError
    );
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: GroqRetryOptions): number {
    // Exponential backoff: baseDelay * (backoffFactor ^ (attempt - 1))
    const exponentialDelay =
      config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);

    // Cap the delay at maxDelay
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * config.jitterFactor * Math.random();

    return Math.round(cappedDelay + jitter);
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current retry options
   */
  getOptions(): GroqRetryOptions {
    return { ...this.options };
  }

  /**
   * Update retry options
   */
  updateOptions(newOptions: Partial<GroqRetryOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}

/**
 * Convenience function for executing operations with default retry strategy
 */
export async function transcribeWithRetry<T>(
  operation: () => Promise<T>,
  options?: Partial<GroqRetryOptions>,
): Promise<T> {
  const retryStrategy = new GroqRetryStrategy(options);
  const result = await retryStrategy.execute(operation);

  if (!result.success) {
    throw result.error || new Error("Operation failed after retries");
  }

  return result.data!;
}

/**
 * Convenience function for executing Groq API calls with retry
 */
export async function transcribeGroqWithRetry<T>(
  client: Groq,
  callMethod: keyof Groq,
  options?: Partial<GroqRetryOptions>,
  ...args: any[]
): Promise<T> {
  const retryStrategy = new GroqRetryStrategy(options);
  const result = await retryStrategy.executeGroqCall<T>(
    client,
    callMethod,
    ...args,
  );

  if (!result.success) {
    throw result.error || new Error("Groq API call failed after retries");
  }

  return result.data!;
}

/**
 * Create a retry strategy optimized for transcription operations
 */
export function createTranscriptionRetryStrategy(): GroqRetryStrategy {
  return new GroqRetryStrategy({
    maxAttempts: parseInt(process.env.GROQ_MAX_RETRIES || "3"),
    baseDelay: 1500, // Slightly longer base delay for transcription
    maxDelay: 15000, // Longer max delay for transcription
    backoffFactor: 2,
    jitterFactor: 0.2, // More jitter for transcription to spread out requests
    retryableErrors: [
      ...DEFAULT_GROQ_RETRY_OPTIONS.retryableErrors,
      "whisper_processing_error",
      "audio_format_error",
      "file_too_large",
    ],
    retryableStatusCodes: [
      ...DEFAULT_GROQ_RETRY_OPTIONS.retryableStatusCodes,
      413,
    ], // Include payload too large
    onRetry: (attempt, error, delay) => {
      console.warn(
        `Transcription retry attempt ${attempt} after ${delay}ms delay:`,
        error.message,
      );
      // For transcription, we might want to add additional logging or monitoring
    },
    onFailed: (error, attempts) => {
      console.error(
        `Transcription failed after ${attempts} attempts:`,
        error.message,
      );
      // Could trigger error analytics or user notification here
    },
  });
}

/**
 * Create a retry strategy optimized for real-time operations (like progress tracking)
 */
export function createRealtimeRetryStrategy(): GroqRetryStrategy {
  return new GroqRetryStrategy({
    maxAttempts: 5, // More attempts for real-time operations
    baseDelay: 500, // Faster base delay
    maxDelay: 5000, // Lower max delay
    backoffFactor: 1.5, // Gentler backoff
    jitterFactor: 0.3, // More jitter
    onRetry: (attempt, error, delay) => {
      console.debug(
        `Real-time operation retry ${attempt} after ${delay}ms:`,
        error.message,
      );
    },
    onFailed: (error, attempts) => {
      console.debug(
        `Real-time operation failed after ${attempts} attempts:`,
        error.message,
      );
    },
  });
}
