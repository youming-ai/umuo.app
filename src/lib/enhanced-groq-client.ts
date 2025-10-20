import Groq from "groq-sdk";

// 错误类型定义
export class EnhancedGroqError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = "EnhancedGroqError";
  }
}

export class AuthenticationError extends EnhancedGroqError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends EnhancedGroqError {
  constructor(
    message: string,
    public retryAfter: number = 1000,
  ) {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends EnhancedGroqError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class QuotaExceededError extends EnhancedGroqError {
  constructor(message: string) {
    super(message, "QUOTA_EXCEEDED", 402);
    this.name = "QuotaExceededError";
  }
}

export class TimeoutError extends EnhancedGroqError {
  constructor(message: string) {
    super(message, "TIMEOUT_ERROR", 408);
    this.name = "TimeoutError";
  }
}

// 转录选项接口
export interface TranscriptionOptions {
  language?: string;
  model?: string;
  responseFormat?: "json" | "text" | "verbose_json";
  temperature?: number;
  prompt?: string;
  onProgress?: (progress: {
    chunkIndex: number;
    totalChunks: number;
    status: "pending" | "processing" | "completed" | "failed";
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
  private transcriptionCache = new Map<string, TranscriptionResponse>(); // 简单内存缓存

  constructor(apiKey: string = process.env.GROQ_API_KEY || "") {
    if (!apiKey) {
      throw new AuthenticationError(
        "GROQ_API_KEY 环境变量未设置。请在 .env.local 文件中设置 GROQ_API_KEY=your_api_key_here",
      );
    }

    this.client = new Groq({
      apiKey,
      timeout: 180000, // 3分钟超时 - 减少以获得更快反馈
      maxRetries: 2, // 减少重试次数以加快响应
      // 添加性能优化配置
      fetch: async (url, options) => {
        // 添加连接keepalive和优化headers
        const optimizedOptions = {
          ...options,
          headers: {
            ...options?.headers,
            Connection: "keep-alive",
            Accept: "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
          },
        };

        try {
          const response = await fetch(url, optimizedOptions);
          return response;
        } catch (error) {
          console.error("Groq API fetch error:", error);
          throw error;
        }
      },
    });
  }

  /**
   * 音频预处理优化 - 压缩和格式优化
   */
  private async optimizeAudioFile(file: File): Promise<File> {
    // 如果文件已经很小且是优化格式，直接返回
    const OPTIMAL_SIZE = 10 * 1024 * 1024; // 10MB
    const OPTIMAL_FORMATS = ["audio/mp3", "audio/mpeg", "audio/wav"];

    if (file.size <= OPTIMAL_SIZE && OPTIMAL_FORMATS.includes(file.type)) {
      return file;
    }

    try {
      // 使用Web Audio API进行音频优化
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 如果音频很长，只处理前30分钟以减少转录时间
      const MAX_DURATION = 30 * 60; // 30分钟
      const sampleRate = audioBuffer.sampleRate;
      const maxLength = Math.min(audioBuffer.length, MAX_DURATION * sampleRate);

      // 创建截断的音频缓冲区
      const optimizedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        maxLength,
        sampleRate,
      );

      // 复制音频数据
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const optimizedData = optimizedBuffer.getChannelData(channel);
        for (let i = 0; i < maxLength; i++) {
          optimizedData[i] = channelData[i];
        }
      }

      // 转换回Blob
      const optimizedBlob = await this.audioBufferToBlob(optimizedBuffer, "audio/wav");
      const optimizedFile = new File(
        [optimizedBlob],
        file.name.replace(/\.[^/.]+$/, "_optimized.wav"),
        {
          type: "audio/wav",
          lastModified: Date.now(),
        },
      );

      audioContext.close();

      console.log(
        `音频优化完成: 原始大小 ${(file.size / 1024 / 1024).toFixed(2)}MB, 优化后 ${(optimizedFile.size / 1024 / 1024).toFixed(2)}MB`,
      );

      return optimizedFile;
    } catch (error) {
      console.warn("音频优化失败，使用原始文件:", error);
      return file;
    }
  }

  /**
   * 将AudioBuffer转换为Blob
   */
  private async audioBufferToBlob(audioBuffer: AudioBuffer, mimeType: string): Promise<Blob> {
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;

    // 创建WAV文件头
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(buffer);

    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * numberOfChannels * 2, true);

    // 写入音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: mimeType });
  }

  /**
   * 生成文件缓存键
   */
  private generateCacheKey(file: File, options: TranscriptionOptions): string {
    // 使用文件名、大小、修改时间和主要参数生成缓存键
    const keyData = {
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      language: options.language || "ja",
      model: options.model || "whisper-large-v3-turbo",
      temperature: options.temperature || 0,
    };
    return btoa(JSON.stringify(keyData)).slice(0, 32); // 限制长度
  }

  /**
   * 音频转录 - 使用原始Groq SDK但增强错误处理
   */
  async transcribe(file: File, options: TranscriptionOptions = {}): Promise<TranscriptionResponse> {
    const startTime = Date.now();

    console.log("开始增强音频转录:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      language: options.language || "ja",
      model: options.model || "whisper-large-v3-turbo",
      timestamp: new Date().toISOString(),
    });

    // 检查缓存
    const cacheKey = this.generateCacheKey(file, options);
    if (this.transcriptionCache.has(cacheKey)) {
      console.log("使用缓存的转录结果");
      const cachedResult = this.transcriptionCache.get(cacheKey)!;
      return cachedResult;
    }

    try {
      // 更新使用统计
      this.usageStats.requestCount++;
      this.usageStats.lastUsed = new Date();

      // 音频文件优化 - 预处理以加快转录速度
      console.log("开始音频优化预处理...");
      const optimizedFile = await this.optimizeAudioFile(file);

      // 文件大小验证 - 使用优化后的文件大小
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
      if (optimizedFile.size > MAX_FILE_SIZE) {
        throw new ValidationError(`优化后文件大小仍然超过限制 (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      // 优化请求参数以获得更快响应
      const optimizedOptions = {
        model: options.model || "whisper-large-v3-turbo",
        language: options.language || "ja", // 默认日语
        response_format: options.responseFormat || "verbose_json",
        temperature: options.temperature || 0, // 使用0温度以获得更确定性结果
        prompt: options.prompt || `这是一段日语音频，请准确转录其中的日语内容。`, // 优化的提示词
      };

      console.log("开始发送转录请求到Groq API:", {
        originalSize: file.size,
        optimizedSize: optimizedFile.size,
        compressionRatio: `${(((file.size - optimizedFile.size) / file.size) * 100).toFixed(1)}%`,
        ...optimizedOptions,
      });

      // 执行转录 - 使用优化后的文件和参数
      const transcription = await this.client.audio.transcriptions.create({
        file: optimizedFile, // 使用优化后的文件
        ...optimizedOptions, // 使用优化的参数
      });

      const result = {
        text: transcription.text,
        language: (transcription as any).language || options.language || "ja",
        duration: (transcription as any).duration,
        segments: (transcription as any).segments,
      };

      // 存储到缓存
      this.transcriptionCache.set(cacheKey, result);

      // 限制缓存大小 - 保留最近的50个转录结果
      if (this.transcriptionCache.size > 50) {
        const firstKey = this.transcriptionCache.keys().next().value;
        if (firstKey !== undefined) {
          this.transcriptionCache.delete(firstKey);
        }
      }

      const transcriptionTime = Date.now() - startTime;
      console.log("增强转录成功完成:", {
        fileName: file.name,
        textLength: transcription.text?.length || 0,
        duration: (transcription as any).duration,
        language: (transcription as any).language,
        segmentsCount: (transcription as any).segments?.length || 0,
        transcriptionTime: `${transcriptionTime}ms`,
        fromCache: false,
      });

      return result;
    } catch (error) {
      // 详细错误日志
      console.error("增强转录失败详情:", {
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
      if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
        throw new AuthenticationError("GROQ API 密钥无效或已过期，请检查 API 密钥配置");
      }
      if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
        throw new RateLimitError("GROQ API 速率限制已超出，请稍后重试", 1000);
      }
      if (errorMessage.includes("timeout")) {
        throw new TimeoutError("GROQ API 请求超时，请检查网络连接");
      }
      if (errorMessage.includes("invalid_request_error") || errorMessage.includes("invalid")) {
        throw new ValidationError("音频文件格式或参数无效");
      }
      if (errorMessage.includes("insufficient") || errorMessage.includes("quota")) {
        throw new QuotaExceededError("GROQ API 配额已用完，请检查账户余额");
      }

      // Groq SDK错误处理
      if (error.constructor.name === "GroqError") {
        const groqError = error as any;
        if (groqError.status === 401) {
          throw new AuthenticationError("API密钥无效");
        }
        if (groqError.status === 429) {
          throw new RateLimitError("请求过于频繁，请稍后重试");
        }
        if (groqError.status === 400) {
          throw new ValidationError("请求参数无效");
        }
        if (groqError.status === 402) {
          throw new QuotaExceededError("账户配额不足");
        }
      }
    }

    // 默认错误
    throw new EnhancedGroqError(
      `转录失败: ${error instanceof Error ? error.message : String(error)}`,
      "TRANSCRIPTION_FAILED",
      500,
      {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        originalError: error instanceof Error ? error.stack : String(error),
        suggestion: "请检查音频文件格式是否支持，网络连接是否正常，或稍后重试",
      },
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
      errorRate:
        this.usageStats.requestCount > 0
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
  async healthCheck(): Promise<{ status: "healthy" | "unhealthy"; message: string }> {
    try {
      // 尝试列出模型（这是轻量级操作）
      await this.client.models.list();
      return { status: "healthy", message: "Groq服务正常" };
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
          return { status: "healthy", message: "API可达但认证失败" };
        }
      }
      return {
        status: "unhealthy",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// 懒加载单例实例
let enhancedGroqClient: EnhancedGroqClient | null = null;

function getClient(): EnhancedGroqClient {
  if (!enhancedGroqClient) {
    enhancedGroqClient = new EnhancedGroqClient();
  }
  return enhancedGroqClient;
}

// 便捷函数
export async function transcribeWithEnhancedGroq(
  file: File,
  options?: TranscriptionOptions,
): Promise<TranscriptionResponse> {
  // 检查是否在浏览器环境中
  if (typeof window === "undefined") {
    throw new Error("转录功能只能在浏览器环境中使用");
  }

  const client = getClient();
  return client.transcribe(file, options);
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
      code: "UNKNOWN_ERROR",
      message: "未知错误",
      statusCode: 500,
      details: { message: error.message, stack: error.stack },
      suggestion: "请检查网络连接或稍后重试",
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "未知错误",
    statusCode: 500,
    details: { error: String(error) },
    suggestion: "请检查网络连接或稍后重试",
  };
}

function getSuggestion(errorCode: string): string {
  switch (errorCode) {
    case "AUTHENTICATION_ERROR":
      return "请检查GROQ_API_KEY环境变量是否正确配置";
    case "RATE_LIMIT_ERROR":
      return "请等待几分钟后重试，或升级到更高级别的API计划";
    case "VALIDATION_ERROR":
      return "请确保音频文件为MP3、WAV、M4A等支持的格式，且大小不超过25MB";
    case "TIMEOUT_ERROR":
      return "请检查网络连接，或尝试上传更小的音频文件";
    case "QUOTA_EXCEEDED":
      return "请检查Groq账户余额，或升级API计划";
    case "TRANSCRIPTION_FAILED":
      return "请检查音频文件格式、网络连接，或稍后重试";
    default:
      return "请检查音频文件格式、网络连接，或稍后重试";
  }
}
