import Groq from 'groq-sdk';
import { z } from 'zod';

// 错误类型定义
export class EnhancedGroqError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'EnhancedGroqError';
  }
}

export class AuthenticationError extends EnhancedGroqError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends EnhancedGroqError {
  constructor(message: string, public retryAfter: number = 1000) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends EnhancedGroqError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class QuotaExceededError extends EnhancedGroqError {
  constructor(message: string) {
    super(message, 'QUOTA_EXCEEDED', 402);
    this.name = 'QuotaExceededError';
  }
}

export class TimeoutError extends EnhancedGroqError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR', 408);
    this.name = 'TimeoutError';
  }
}

// 转录选项接口
export interface TranscriptionOptions {
  language?: string;
  model?: string;
  responseFormat?: 'json' | 'text' | 'verbose_json';
  temperature?: number;
  prompt?: string;
  onProgress?: (progress: {
    chunkIndex: number;
    totalChunks: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
  }) => void;
}

// 转录响应接口
export interface TranscriptionResponse {
  text: string;
  language: string;
  duration?: number;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

// 增强的Groq客户端类
export class EnhancedGroqClient {
  private client: Groq;
  private usageStats = {
    requestCount: 0,
    errorCount: 0,
    lastUsed: null as Date | null,
    lastError: null as Error | null,
  };

  constructor(apiKey: string = process.env.GROQ_API_KEY || '') {
    if (!apiKey) {
      throw new AuthenticationError('GROQ_API_KEY 环境变量未设置');
    }

    this.client = new Groq({
      apiKey,
      timeout: 300000, // 5分钟超时
      maxRetries: 3,
    });
  }

  /**
   * 音频转录 - 使用原始Groq SDK但增强错误处理
   */
  async transcribe(
    file: File,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResponse> {
    console.log('开始增强音频转录:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      language: options.language || 'en',
      model: options.model || 'whisper-large-v3-turbo',
      timestamp: new Date().toISOString(),
    });

    try {
      // 更新使用统计
      this.usageStats.requestCount++;
      this.usageStats.lastUsed = new Date();

      // 文件大小验证
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
      if (file.size > MAX_FILE_SIZE) {
        throw new ValidationError(`文件大小超过限制 (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      // 执行转录 - 使用原始Groq SDK
      const transcription = await this.client.audio.transcriptions.create({
        file,
        model: options.model || 'whisper-large-v3-turbo',
        language: options.language || 'en',
        response_format: options.responseFormat || 'verbose_json',
        temperature: options.temperature || 0,
        prompt: options.prompt,
      });

      console.log('增强转录成功完成:', {
        fileName: file.name,
        textLength: transcription.text?.length || 0,
        duration: transcription.duration,
        language: transcription.language,
        segmentsCount: transcription.segments?.length || 0,
      });

      return {
        text: transcription.text,
        language: transcription.language || options.language || 'en',
        duration: transcription.duration,
        segments: transcription.segments,
      };
    } catch (error) {
      // 详细错误日志
      console.error('增强转录失败详情:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // 更新错误统计
      this.usageStats.errorCount++;
      this.usageStats.lastError = error instanceof Error ? error : new Error(String(error));

      // 增强的错误处理
      return this.handleError(error, file);
    }
  }

  /**
   * 统一错误处理
   */
  private handleError(error: unknown, file: File): never {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Groq API特定错误
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        throw new AuthenticationError('GROQ API 密钥无效或已过期，请检查 API 密钥配置');
      }
      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        throw new RateLimitError('GROQ API 速率限制已超出，请稍后重试', 1000);
      }
      if (errorMessage.includes('timeout')) {
        throw new TimeoutError('GROQ API 请求超时，请检查网络连接');
      }
      if (errorMessage.includes('invalid_request_error') || errorMessage.includes('invalid')) {
        throw new ValidationError('音频文件格式或参数无效');
      }
      if (errorMessage.includes('insufficient') || errorMessage.includes('quota')) {
        throw new QuotaExceededError('GROQ API 配额已用完，请检查账户余额');
      }

      // Groq SDK错误处理
      if (error.constructor.name === 'GroqError') {
        const groqError = error as any;
        if (groqError.status === 401) {
          throw new AuthenticationError('API密钥无效');
        }
        if (groqError.status === 429) {
          throw new RateLimitError('请求过于频繁，请稍后重试');
        }
        if (groqError.status === 400) {
          throw new ValidationError('请求参数无效');
        }
        if (groqError.status === 402) {
          throw new QuotaExceededError('账户配额不足');
        }
      }
    }

    // 默认错误
    throw new EnhancedGroqError(
      `转录失败: ${error instanceof Error ? error.message : String(error)}`,
      'TRANSCRIPTION_FAILED',
      500,
      {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        originalError: error instanceof Error ? error.stack : String(error),
        suggestion: '请检查音频文件格式是否支持，网络连接是否正常，或稍后重试'
      }
    );
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    return { ...this.usageStats };
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    return {
      errorCount: this.usageStats.errorCount,
      lastError: this.usageStats.lastError,
      errorRate: this.usageStats.requestCount > 0
        ? this.usageStats.errorCount / this.usageStats.requestCount
        : 0,
    };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.usageStats = {
      requestCount: 0,
      errorCount: 0,
      lastUsed: null,
      lastError: null,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      // 尝试列出模型（这是轻量级操作）
      await this.client.models.list();
      return { status: 'healthy', message: 'Groq服务正常' };
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
          return { status: 'healthy', message: 'API可达但认证失败' };
        }
      }
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// 创建单例实例
export const enhancedGroqClient = new EnhancedGroqClient();

// 便捷函数
export async function transcribeWithEnhancedGroq(
  file: File,
  options?: TranscriptionOptions
): Promise<TranscriptionResponse> {
  return enhancedGroqClient.transcribe(file, options);
}

// 错误处理辅助函数
export function handleEnhancedGroqError(error: unknown): {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
  suggestion: string;
} {
  if (error instanceof EnhancedGroqError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      suggestion: getSuggestion(error.code),
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: '未知错误',
      statusCode: 500,
      details: { message: error.message, stack: error.stack },
      suggestion: '请检查网络连接或稍后重试',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: '未知错误',
    statusCode: 500,
    details: { error: String(error) },
    suggestion: '请检查网络连接或稍后重试',
  };
}

function getSuggestion(errorCode: string): string {
  switch (errorCode) {
    case 'AUTHENTICATION_ERROR':
      return '请检查GROQ_API_KEY环境变量是否正确配置';
    case 'RATE_LIMIT_ERROR':
      return '请等待几分钟后重试，或升级到更高级别的API计划';
    case 'VALIDATION_ERROR':
      return '请确保音频文件为MP3、WAV、M4A等支持的格式，且大小不超过25MB';
    case 'TIMEOUT_ERROR':
      return '请检查网络连接，或尝试上传更小的音频文件';
    case 'QUOTA_EXCEEDED':
      return '请检查Groq账户余额，或升级API计划';
    case 'TRANSCRIPTION_FAILED':
      return '请检查音频文件格式、网络连接，或稍后重试';
    default:
      return '请检查音频文件格式、网络连接，或稍后重试';
  }
}