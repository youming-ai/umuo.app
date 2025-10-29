/**
 * 简化的转录配置
 * 保留必要的配置参数，移除复杂的验证逻辑
 */

// 文件限制
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_AUDIO_DURATION = 3600; // 1小时（秒）

// 音频处理配置（为兼容性保留）
export const MAX_CHUNKS = 100; // 最大块数量
export const DEFAULT_CHUNK_DURATION = 45; // 默认块时长（秒）
export const DEFAULT_OVERLAP = 0.2; // 默认重叠比例（20%）

// API配置（为兼容性保留）
export const API_TIMEOUT = 30000; // 30秒
export const MAX_RETRIES = 3; // 最大重试次数
export const RETRY_DELAY = 1000; // 重试延迟（毫秒）

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
  INVALID_API_KEY: "无效的 API 密钥",
  NETWORK_ERROR: "网络连接错误",
  TRANSCRIPTION_FAILED: "转录失败",
} as const;

export interface TranscriptionConfig {
  timeoutMs: number;
  retryCount: number;
  maxConcurrency?: number;
}

export const defaultConfig: TranscriptionConfig = {
  timeoutMs: 5 * 60 * 1000, // 5 minutes
  retryCount: 3,
  maxConcurrency: 2,
};

export function getTranscriptionConfig(): TranscriptionConfig {
  // 简化的配置获取，移除环境变量支持
  return defaultConfig;
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
    maxFileSize: MAX_FILE_SIZE,
    maxDuration: MAX_AUDIO_DURATION,
  };
}

export function isGroqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/**
 * 验证文件大小
 */
export function validateFileSize(fileSize: number): {
  isValid: boolean;
  error?: string;
} {
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
export function validateAudioDuration(duration: number): {
  isValid: boolean;
  error?: string;
} {
  if (duration > MAX_AUDIO_DURATION) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.AUDIO_TOO_LONG,
    };
  }
  return { isValid: true };
}

/**
 * 简化的文件验证
 */
export function validateAudioFile(file: { size: number; type?: string }): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证文件大小
  if (file.size > MAX_FILE_SIZE) {
    errors.push(ERROR_MESSAGES.FILE_TOO_LARGE);
  }

  // 验证格式
  if (file.type && !SUPPORTED_AUDIO_FORMATS.includes(file.type)) {
    errors.push(ERROR_MESSAGES.INVALID_FORMAT);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
