import Groq from "groq-sdk";
import type { AudioChunk } from "./audio-processor";
import {
  createSecureGroqConfig,
  validateGroqApiKey,
  validateEnvironmentConfiguration,
  generateKeyRotationSuggestion,
  type ApiKeyStatus,
  type ApiKeyValidationResult,
  ApiKeyError,
  ApiKeyValidationError,
  ApiKeySecurityError,
} from "./api-key-manager";
import { ErrorCodes, ErrorCategory } from "../types/errors";
import { createError, createErrorContext, handleWithSmartRetry } from "./error-handler";

export interface GroqTranscriptionResponse {
  text: string;
  language?: string;
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

// 增强的错误类型
export class GroqClientError extends Error {
  constructor(
    message: string,
    public readonly code: string = ErrorCodes.transcriptionFailed,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "GroqClientError";
  }
}

export class GroqRateLimitError extends GroqClientError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message, ErrorCodes.apiRateLimit, 429);
    this.name = "GroqRateLimitError";
  }
}

export class GroqAuthenticationError extends GroqClientError {
  constructor(message: string) {
    super(message, ErrorCodes.apiAuthError, 401);
    this.name = "GroqAuthenticationError";
  }
}

export interface GroqTranscriptionOptions {
  language?: string;
  prompt?: string;
  responseFormat?: "json" | "text" | "verbose_json";
  temperature?: number;
  onProgress?: (progress: {
    chunkIndex: number;
    totalChunks: number;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    error?: string;
  }) => void;
}

export class GroqClient {
  private client: Groq;
  private apiKeyValidation: ApiKeyValidationResult | null = null;
  private usageStats: {
    requestCount: number;
    errorCount: number;
    lastUsed: Date | null;
    lastError: Error | null;
  } = {
    requestCount: 0,
    errorCount: 0,
    lastUsed: null,
    lastError: null,
  };

  constructor(apiKey: string = process.env.GROQ_API_KEY || "") {
    // 验证 API 密钥
    this.apiKeyValidation = validateGroqApiKey(apiKey);

    if (!this.apiKeyValidation.isValid) {
      throw new ApiKeyValidationError(
        `无效的 GROQ API 密钥: ${this.apiKeyValidation.errors.join(", ")}`,
      );
    }

    // 创建安全配置
    const config = createSecureGroqConfig(apiKey);
    this.client = new Groq({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout,
      dangerouslyAllowBrowser: false, // 禁止在浏览器中使用密钥
    });
  }

  /**
   * 获取密钥验证结果
   */
  getApiKeyValidation(): ApiKeyValidationResult {
    return this.apiKeyValidation!;
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    return { ...this.usageStats };
  }

  /**
   * 获取密钥状态
   */
  getKeyStatus(): ApiKeyStatus {
    return {
      keyId: `${this.apiKeyValidation?.format.hasCorrectPrefix ? "gsk_***" : "invalid"}`,
      isValid: this.apiKeyValidation?.isValid || false,
      isActive: true,
      createdAt: new Date(),
      lastUsed: this.usageStats.lastUsed || undefined,
      requestCount: this.usageStats.requestCount,
      errorCount: this.usageStats.errorCount,
      lastError: this.usageStats.lastError?.message,
    };
  }

  /**
   * 获取密钥轮换建议
   */
  getKeyRotationSuggestion() {
    return generateKeyRotationSuggestion(this.getKeyStatus());
  }

  async transcribe(
    file: File,
    options: {
      language?: string;
      model?: string;
      responseFormat?: "json" | "text" | "verbose_json";
      temperature?: number;
    } = {},
  ): Promise<GroqTranscriptionResponse> {
    const context = createErrorContext("GroqClient", "transcribe", {
      fileName: file.name,
      fileSize: file.size,
      model: options.model || "whisper-large-v3-turbo",
    });

    return handleWithSmartRetry(
      async () => {
        // 更新使用统计
        this.usageStats.requestCount++;
        this.usageStats.lastUsed = new Date();

        const transcription = await this.client.audio.transcriptions.create({
          file,
          model: options.model || "whisper-large-v3-turbo",
          language: options.language || "auto",
          response_format: options.responseFormat ?? "verbose_json",
          temperature: options.temperature || 0,
        });

        return transcription as GroqTranscriptionResponse;
      },
      context,
      {
        maxRetries: 3,
        fallbackAction: async (error) => {
          // 更新错误统计
          this.usageStats.errorCount++;
          this.usageStats.lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`转录失败，已执行降级处理: ${error.message}`);
        },
      },
    ).catch((error) => {
      // 处理特定错误类型，转换为更具体的错误
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("unauthorized")) {
          throw new GroqAuthenticationError("GROQ API 密钥无效或已过期");
        }
        if (error.message.includes("429") || error.message.includes("rate limit")) {
          throw new GroqRateLimitError("GROQ API 速率限制已超出", 1000);
        }
        if (error.message.includes("timeout")) {
          throw createError("apiTimeout", "GROQ API 请求超时", { originalError: error });
        }
      }

      throw createError(
        "transcriptionFailed",
        `转录失败: ${error instanceof Error ? error.message : String(error)}`,
        {
          fileName: file.name,
          fileSize: file.size,
          originalError: error instanceof Error ? error.stack : String(error),
        },
      );
    });
  }

  async transcribeChunk(
    chunk: AudioChunk,
    options: {
      language?: string;
      prompt?: string;
      responseFormat?: "json" | "text" | "verbose_json";
      temperature?: number;
    } = {},
  ): Promise<GroqTranscriptionResponse> {
    try {
      // 更新使用统计
      this.usageStats.requestCount++;
      this.usageStats.lastUsed = new Date();

      const file = new File([chunk.blob], `chunk_${chunk.index}.wav`, {
        type: "audio/wav",
      });

      const transcription = await this.client.audio.transcriptions.create({
        file,
        model: "whisper-large-v3-turbo",
        language: options.language || "ja",
        prompt: options.prompt,
        response_format: options.responseFormat ?? "verbose_json",
        temperature: options.temperature || 0,
      });

      return transcription as GroqTranscriptionResponse;
    } catch (error) {
      // 更新错误统计
      this.usageStats.errorCount++;
      this.usageStats.lastError = error instanceof Error ? error : new Error(String(error));

      // 处理特定错误类型
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("unauthorized")) {
          throw new GroqAuthenticationError("GROQ API 密钥无效或已过期");
        }
        if (error.message.includes("429") || error.message.includes("rate limit")) {
          throw new GroqRateLimitError("GROQ API 速率限制已超出", 1000);
        }
        if (error.message.includes("timeout")) {
          throw new GroqClientError("GROQ API 请求超时", ErrorCodes.apiTimeout);
        }
      }

      throw new GroqClientError(
        `转录块失败: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.transcriptionFailed,
        undefined,
        { originalError: error, chunkIndex: chunk.index },
      );
    }
  }

  async transcribeChunks(
    chunks: AudioChunk[],
    options: GroqTranscriptionOptions = {},
  ): Promise<Array<GroqTranscriptionResponse & { chunkIndex: number }>> {
    const results: Array<GroqTranscriptionResponse & { chunkIndex: number }> = [];
    const errors: Array<{ chunkIndex: number; error: Error }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        options.onProgress?.({
          chunkIndex: i,
          totalChunks: chunks.length,
          status: "processing",
          progress: (i / chunks.length) * 100,
        });

        const result = await this.transcribeChunk(chunk, {
          language: options.language,
          prompt: options.prompt,
          responseFormat: options.responseFormat,
          temperature: options.temperature,
        });

        results.push({ ...result, chunkIndex: i });

        options.onProgress?.({
          chunkIndex: i,
          totalChunks: chunks.length,
          status: "completed",
          progress: ((i + 1) / chunks.length) * 100,
        });

        // 添加延迟以避免速率限制
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({
          chunkIndex: i,
          error: err,
        });

        options.onProgress?.({
          chunkIndex: i,
          totalChunks: chunks.length,
          status: "failed",
          progress: (i / chunks.length) * 100,
          error: err.message,
        });
      }
    }

    if (errors.length > 0) {
      const errorMessage = errors
        .map((e) => `Chunk ${e.chunkIndex}: ${e.error.message}`)
        .join("; ");

      // 检查是否为认证错误
      const hasAuthError = errors.some((e) => e.error instanceof GroqAuthenticationError);

      if (hasAuthError) {
        throw new GroqAuthenticationError(`GROQ API 认证失败: ${errorMessage}`);
      }

      // 检查是否为速率限制错误
      const hasRateLimitError = errors.some((e) => e.error instanceof GroqRateLimitError);

      if (hasRateLimitError) {
        throw new GroqRateLimitError(`GROQ API 速率限制: ${errorMessage}`, 1000);
      }

      throw new GroqClientError(
        `转录 ${errors.length} 个块失败: ${errorMessage}`,
        ErrorCodes.transcriptionFailed,
        undefined,
        { failedChunks: errors.map((e) => ({ index: e.chunkIndex, error: e.error.message })) },
      );
    }

    return results.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }
}

// 合并 Groq 转录结果
export function mergeGroqTranscriptionResults(
  results: Array<GroqTranscriptionResponse & { chunkIndex: number }>,
): GroqTranscriptionResponse {
  if (results.length === 0) {
    return { text: "", segments: [] };
  }

  const mergedText = results
    .map((result) => result.text.trim())
    .filter((text) => text.length > 0)
    .join(" ");

  const mergedSegments = results
    .flatMap((result) => result.segments || [])
    .sort((a, b) => a.start - b.start);

  return {
    text: mergedText,
    duration: results[0]?.duration,
    segments: mergedSegments.length > 0 ? mergedSegments : undefined,
  };
}

// 导出单例实例（延迟初始化）
let groqClientInstance: GroqClient | null = null;

export function getGroqClient(): GroqClient {
  if (!groqClientInstance) {
    groqClientInstance = new GroqClient();
  }
  return groqClientInstance;
}

// 为了向后兼容，导出 getter
export const groqClient = getGroqClient();

// 测试环境重置函数
export function resetGroqClient(): void {
  groqClientInstance = null;
}

/**
 * 验证 GROQ API 配置
 */
export function validateGroqConfiguration(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  client?: GroqClient;
} {
  try {
    // 验证环境配置
    const envValidation = validateEnvironmentConfiguration();

    if (!envValidation.isValid) {
      return {
        isValid: false,
        errors: envValidation.errors,
        warnings: envValidation.warnings,
      };
    }

    // 尝试创建客户端进行最终验证
    const client = new GroqClient();
    const keyValidation = client.getApiKeyValidation();

    return {
      isValid: keyValidation.isValid,
      errors: keyValidation.errors,
      warnings: keyValidation.warnings,
      client,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
    };
  }
}

/**
 * 获取 GROQ 客户端状态报告
 */
export function getGroqClientStatus(): {
  isConfigured: boolean;
  isValid: boolean;
  health: "healthy" | "warning" | "error";
  validation?: ApiKeyValidationResult;
  usageStats?: {
    requestCount: number;
    errorCount: number;
    errorRate: number;
    lastUsed?: Date;
  };
  rotation?: {
    shouldRotate: boolean;
    reason: string;
    priority: "low" | "medium" | "high" | "critical";
  };
} {
  try {
    const validation = validateGroqConfiguration();

    if (!validation.isValid || !validation.client) {
      return {
        isConfigured:
          validation.errors.length === 0 || !validation.errors.some((e) => e.includes("未配置")),
        isValid: false,
        health: "error",
        validation: validation.client?.getApiKeyValidation(),
      };
    }

    const client = validation.client;
    const keyValidation = client.getApiKeyValidation();
    const usageStats = client.getUsageStats();
    const rotationSuggestion = client.getKeyRotationSuggestion();

    // 计算健康状态
    let health: "healthy" | "warning" | "error" = "healthy";
    const errorRate =
      usageStats.requestCount > 0 ? usageStats.errorCount / usageStats.requestCount : 0;

    if (keyValidation.score < 70 || errorRate > 0.3) {
      health = "error";
    } else if (keyValidation.score < 90 || errorRate > 0.1 || rotationSuggestion.shouldRotate) {
      health = "warning";
    }

    return {
      isConfigured: true,
      isValid: true,
      health,
      validation: keyValidation,
      usageStats: {
        requestCount: usageStats.requestCount,
        errorCount: usageStats.errorCount,
        errorRate:
          usageStats.requestCount > 0 ? usageStats.errorCount / usageStats.requestCount : 0,
        lastUsed: usageStats.lastUsed || undefined,
      },
      rotation: {
        shouldRotate: rotationSuggestion.shouldRotate,
        reason: rotationSuggestion.reason,
        priority: rotationSuggestion.priority,
      },
    };
  } catch (error) {
    return {
      isConfigured: false,
      isValid: false,
      health: "error",
    };
  }
}

// 导出便捷函数
export async function transcribeWithGroq(
  chunks: AudioChunk[],
  options: GroqTranscriptionOptions = {},
): Promise<{
  text: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    wordTimestamps?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }>;
}> {
  try {
    // 验证配置
    const configValidation = validateGroqConfiguration();
    if (!configValidation.isValid) {
      throw new GroqClientError(
        `GROQ 配置无效: ${configValidation.errors.join(", ")}`,
        ErrorCodes.configurationError,
      );
    }

    const results = await groqClient.transcribeChunks(chunks, {
      language: options.language,
      prompt: options.prompt,
      responseFormat: options.responseFormat,
      temperature: options.temperature,
      onProgress: options.onProgress,
    });

    // 使用现有的合并函数
    const mergedResult = mergeGroqTranscriptionResults(results);

    return {
      text: mergedResult.text || "",
      duration: mergedResult.duration,
      segments: mergedResult.segments?.map((segment) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
        wordTimestamps: [], // Groq doesn't provide word-level timestamps in the same format
      })),
    };
  } catch (error) {
    if (error instanceof GroqClientError) {
      throw error;
    }

    throw new GroqClientError(
      `转录失败: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCodes.transcriptionFailed,
      undefined,
      { originalError: error },
    );
  }
}
