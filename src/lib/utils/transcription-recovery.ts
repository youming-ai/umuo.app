/**
 * 转录错误恢复和重试管理器
 * 提供智能错误分类、恢复策略和重试机制
 */

export interface TranscriptionErrorContext {
  fileId: number;
  fileName?: string;
  language?: string;
  operation: "transcribe" | "postprocess" | "fetch";
  attempt: number;
  maxAttempts: number;
}

export interface RecoveryStrategy {
  canRecover: boolean;
  retryDelay: number;
  maxRetries: number;
  action: "retry" | "fallback" | "abort";
  userMessage: string;
  technicalMessage?: string;
}

/**
 * 错误分类器
 */
export class TranscriptionErrorClassifier {
  /**
   * 分析错误类型并返回恢复策略
   */
  static classifyError(error: unknown, context: TranscriptionErrorContext): RecoveryStrategy {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // 网络相关错误 - 可重试
    if (this.isNetworkError(lowerMessage)) {
      return {
        canRecover: true,
        retryDelay: this.calculateRetryDelay(context.attempt, 2000),
        maxRetries: 5,
        action: "retry",
        userMessage: "网络连接不稳定，正在重试...",
        technicalMessage: `Network error: ${errorMessage}`,
      };
    }

    // API 限流错误 - 可重试，但需要更长延迟
    if (this.isRateLimitError(lowerMessage)) {
      return {
        canRecover: true,
        retryDelay: this.calculateRetryDelay(context.attempt, 30000), // 30秒基础延迟
        maxRetries: 3,
        action: "retry",
        userMessage: "API请求频率过高，等待后重试...",
        technicalMessage: `Rate limit exceeded: ${errorMessage}`,
      };
    }

    // 服务器临时错误 - 可重试
    if (this.isTemporaryServerError(lowerMessage)) {
      return {
        canRecover: true,
        retryDelay: this.calculateRetryDelay(context.attempt, 5000),
        maxRetries: 3,
        action: "retry",
        userMessage: "服务器暂时繁忙，正在重试...",
        technicalMessage: `Temporary server error: ${errorMessage}`,
      };
    }

    // 文件相关错误 - 不可重试，需要用户干预
    if (this.isFileError(lowerMessage)) {
      return {
        canRecover: false,
        retryDelay: 0,
        maxRetries: 0,
        action: "abort",
        userMessage: this.getFileErrorUserMessage(lowerMessage),
        technicalMessage: `File error: ${errorMessage}`,
      };
    }

    // 认证错误 - 不可重试，需要配置修复
    if (this.isAuthenticationError(lowerMessage)) {
      return {
        canRecover: false,
        retryDelay: 0,
        maxRetries: 0,
        action: "abort",
        userMessage: "API密钥配置错误，请检查设置",
        technicalMessage: `Authentication error: ${errorMessage}`,
      };
    }

    // 超时错误 - 可重试，但增加超时时间
    if (this.isTimeoutError(lowerMessage)) {
      return {
        canRecover: true,
        retryDelay: this.calculateRetryDelay(context.attempt, 10000),
        maxRetries: 2,
        action: "retry",
        userMessage: "处理超时，正在重试...",
        technicalMessage: `Timeout error: ${errorMessage}`,
      };
    }

    // 未知错误 - 有限重试
    return {
      canRecover: true,
      retryDelay: this.calculateRetryDelay(context.attempt, 8000),
      maxRetries: 2,
      action: "retry",
      userMessage: "遇到未知错误，正在尝试恢复...",
      technicalMessage: `Unknown error: ${errorMessage}`,
    };
  }

  private static isNetworkError(message: string): boolean {
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("failed to fetch") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    );
  }

  private static isRateLimitError(message: string): boolean {
    return (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("quota exceeded") ||
      message.includes("429")
    );
  }

  private static isTemporaryServerError(message: string): boolean {
    return (
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("bad gateway") ||
      message.includes("service unavailable") ||
      message.includes("gateway timeout")
    );
  }

  private static isFileError(message: string): boolean {
    return (
      message.includes("file too large") ||
      message.includes("invalid format") ||
      message.includes("unsupported") ||
      message.includes("corrupted") ||
      message.includes("400")
    );
  }

  private static isAuthenticationError(message: string): boolean {
    return (
      message.includes("api key") ||
      message.includes("unauthorized") ||
      message.includes("authentication") ||
      message.includes("401") ||
      message.includes("403")
    );
  }

  private static isTimeoutError(message: string): boolean {
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("abort") ||
      message.includes("408")
    );
  }

  private static getFileErrorUserMessage(message: string): string {
    if (message.includes("too large")) {
      return "音频文件过大，请选择较小的文件（建议小于25MB）";
    }
    if (message.includes("format")) {
      return "音频格式不支持，请使用MP3、WAV或M4A格式";
    }
    if (message.includes("corrupted")) {
      return "音频文件损坏，请重新上传文件";
    }
    return "文件处理失败，请检查文件格式和大小";
  }

  static calculateRetryDelay(attempt: number, baseDelay: number): number {
    // 指数退避 + 随机抖动，避免雷群效应
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 30% 随机抖动
    return Math.min(exponentialDelay + jitter, 60000); // 最大延迟60秒
  }
}

/**
 * 转录重试管理器
 */
export class TranscriptionRetryManager {
  private retryAttempts: Map<number, number> = new Map();
  private lastRetryTime: Map<number, number> = new Map();
  private failedOperations: Map<number, { error: unknown; timestamp: number }> = new Map();

  /**
   * 检查是否应该重试
   */
  shouldRetry(fileId: number, strategy: RecoveryStrategy): boolean {
    if (strategy.action !== "retry") {
      return false;
    }

    const currentAttempts = this.retryAttempts.get(fileId) || 0;
    return currentAttempts < strategy.maxRetries;
  }

  /**
   * 增加重试计数
   */
  incrementRetry(fileId: number): number {
    const current = this.retryAttempts.get(fileId) || 0;
    const newCount = current + 1;
    this.retryAttempts.set(fileId, newCount);
    this.lastRetryTime.set(fileId, Date.now());
    return newCount;
  }

  /**
   * 重置重试计数
   */
  resetRetry(fileId: number): void {
    this.retryAttempts.delete(fileId);
    this.lastRetryTime.delete(fileId);
    this.failedOperations.delete(fileId);
  }

  /**
   * 记录失败操作
   */
  recordFailure(fileId: number, error: unknown): void {
    this.failedOperations.set(fileId, {
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取重试延迟
   */
  getRetryDelay(fileId: number, strategy: RecoveryStrategy): number {
    const attempt = this.retryAttempts.get(fileId) || 0;
    const lastRetry = this.lastRetryTime.get(fileId) || 0;
    const timeSinceLastRetry = Date.now() - lastRetry;

    // 计算建议延迟
    const suggestedDelay = TranscriptionErrorClassifier.calculateRetryDelay(
      attempt,
      strategy.retryDelay,
    );

    // 如果距离上次重试时间太短，使用剩余等待时间
    if (timeSinceLastRetry < suggestedDelay) {
      return suggestedDelay - timeSinceLastRetry;
    }

    return suggestedDelay;
  }

  /**
   * 获取失败信息
   */
  getFailureInfo(fileId: number): { error: unknown; timestamp: number } | null {
    return this.failedOperations.get(fileId) || null;
  }

  /**
   * 清理过期的失败记录
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThanMs;

    for (const [fileId, info] of this.failedOperations) {
      if (info.timestamp < cutoff) {
        this.failedOperations.delete(fileId);
        this.retryAttempts.delete(fileId);
        this.lastRetryTime.delete(fileId);
      }
    }
  }

  /**
   * 获取重试统计
   */
  getRetryStats(fileId: number): {
    attempts: number;
    lastRetryTime: number | null;
    hasRecentFailure: boolean;
  } {
    return {
      attempts: this.retryAttempts.get(fileId) || 0,
      lastRetryTime: this.lastRetryTime.get(fileId) || null,
      hasRecentFailure: this.failedOperations.has(fileId),
    };
  }
}

// 全局重试管理器实例
export const globalRetryManager = new TranscriptionRetryManager();

/**
 * 智能重试函数
 * 带有错误分类和恢复策略的重试机制
 */
export async function smartRetry<T>(
  operation: () => Promise<T>,
  context: TranscriptionErrorContext,
): Promise<T> {
  const retryManager = globalRetryManager;

  // 重置重试计数（如果这是新的尝试）
  if (context.attempt === 0) {
    retryManager.resetRetry(context.fileId);
  }

  while (true) {
    try {
      const result = await operation();

      // 操作成功，清理重试状态
      retryManager.resetRetry(context.fileId);
      return result;
    } catch (error) {
      // 分类错误
      const strategy = TranscriptionErrorClassifier.classifyError(error, context);

      // 记录失败
      retryManager.recordFailure(context.fileId, error);

      // 检查是否应该重试
      if (!retryManager.shouldRetry(context.fileId, strategy)) {
        throw error;
      }

      // 增加重试计数
      const attempt = retryManager.incrementRetry(context.fileId);

      console.warn(
        `操作失败，准备重试 (${attempt}/${strategy.maxRetries}): ${strategy.userMessage}`,
        { fileId: context.fileId, error },
      );

      // 等待重试延迟
      const delay = retryManager.getRetryDelay(context.fileId, strategy);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // 更新上下文中的尝试次数
      context.attempt = attempt;
      context.maxAttempts = strategy.maxRetries;
    }
  }
}

/**
 * 定期清理过期记录
 */
setInterval(
  () => {
    globalRetryManager.cleanup();
  },
  60 * 60 * 1000,
); // 每小时清理一次
