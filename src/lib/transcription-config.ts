/**
 * 转录配置常量
 * 统一管理所有转录相关的配置参数
 */

// 文件限制
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_AUDIO_DURATION = 3600; // 1小时（秒）

// 音频处理配置
export const MAX_CHUNKS = 100; // 最大块数量
export const DEFAULT_CHUNK_DURATION = 45; // 默认块时长（秒）
export const DEFAULT_OVERLAP = 0.2; // 默认重叠比例（20%）

// API配置
export const API_TIMEOUT = 30000; // 30秒
export const MAX_RETRIES = 3; // 最大重试次数
export const RETRY_DELAY = 1000; // 重试延迟（毫秒）

// 采样率配置
export const DEFAULT_SAMPLE_RATE = 16000; // 默认采样率
export const SUPPORTED_SAMPLE_RATES = [8000, 16000, 22050, 44100, 48000];

// 音频格式
export const SUPPORTED_AUDIO_FORMATS = [
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/x-aiff",
  "audio/x-m4a",
];

// 错误消息
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: `音频文件过大，最大支持 ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
  AUDIO_TOO_LONG: `音频时长过长，最大支持 ${MAX_AUDIO_DURATION / 60} 分钟`,
  INVALID_FORMAT: "不支持的音频格式",
  TOO_MANY_CHUNKS: `音频块过多，最大支持 ${MAX_CHUNKS} 个块`,
  INVALID_API_KEY: "无效的 API 密钥",
  NETWORK_ERROR: "网络连接错误",
  TRANSCRIPTION_FAILED: "转录失败",
  BROWSER_NOT_SUPPORTED: "浏览器环境不支持，请使用服务器端API",
} as const;

export interface TranscriptionConfig {
  timeoutMs: number;
  retryCount: number;
  maxConcurrency: number;
}

export const defaultConfig: TranscriptionConfig = {
  timeoutMs: 5 * 60 * 1000, // 5 minutes
  retryCount: MAX_RETRIES,
  maxConcurrency: 2,
};

export function getTranscriptionConfig(): TranscriptionConfig {
  // Allow override via environment variables
  const timeoutMs = parseInt(process.env.TRANSCRIPTION_TIMEOUT_MS || "", 10);
  const retryCount = parseInt(process.env.TRANSCRIPTION_RETRY_COUNT || "", 10);
  const maxConcurrency = parseInt(process.env.TRANSCRIPTION_MAX_CONCURRENCY || "", 10);

  return {
    timeoutMs: isNaN(timeoutMs) ? defaultConfig.timeoutMs : timeoutMs,
    retryCount: isNaN(retryCount) ? defaultConfig.retryCount : retryCount,
    maxConcurrency: isNaN(maxConcurrency) ? defaultConfig.maxConcurrency : maxConcurrency,
  };
}

export function getGroqSettings(): {
  apiKey?: string;
  model: string;
  supportsLanguage: boolean;
  supportsPrompt: boolean;
  maxFileSize: number;
  maxDuration: number;
} {
  return {
    apiKey: process.env.GROQ_API_KEY,
    model: "whisper-large-v3-turbo",
    supportsLanguage: true,
    supportsPrompt: true,
    maxFileSize: MAX_FILE_SIZE, // 使用统一的配置
    maxDuration: MAX_AUDIO_DURATION, // 使用统一的配置
  };
}

export function isGroqAvailable(): boolean {
  const settings = getGroqSettings();
  return !!settings.apiKey;
}

/**
 * 验证文件大小
 */
export function validateFileSize(fileSize: number): { isValid: boolean; error?: string } {
  if (fileSize > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.FILE_TOO_LARGE,
    };
  }
  return { isValid: true };
}

/**
 * 验证音频时长
 */
export function validateAudioDuration(duration: number): { isValid: boolean; error?: string } {
  if (duration > MAX_AUDIO_DURATION) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.AUDIO_TOO_LONG,
    };
  }
  return { isValid: true };
}

/**
 * 验证音频格式
 */
export function validateAudioFormat(mimeType: string): { isValid: boolean; error?: string } {
  if (!SUPPORTED_AUDIO_FORMATS.includes(mimeType)) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_FORMAT,
    };
  }
  return { isValid: true };
}

/**
 * 验证块数量
 */
export function validateChunkCount(chunkCount: number): { isValid: boolean; error?: string } {
  if (chunkCount > MAX_CHUNKS) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.TOO_MANY_CHUNKS,
    };
  }
  return { isValid: true };
}

/**
 * 综合文件验证
 */
export function validateAudioFile(file: { size: number; type?: string; name?: string }): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证文件大小
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.isValid && sizeValidation.error) {
    errors.push(sizeValidation.error);
  }

  // 验证格式（如果提供了type）
  if (file.type) {
    const formatValidation = validateAudioFormat(file.type);
    if (!formatValidation.isValid && formatValidation.error) {
      errors.push(formatValidation.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
