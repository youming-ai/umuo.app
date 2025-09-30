export interface TranscriptionConfig {
  timeoutMs: number;
  retryCount: number;
  maxConcurrency: number;
}

export const defaultConfig: TranscriptionConfig = {
  timeoutMs: 5 * 60 * 1000, // 5 minutes
  retryCount: 3,
  maxConcurrency: 2,
};

export function getTranscriptionConfig(): TranscriptionConfig {
  // Allow override via environment variables
  return {
    timeoutMs: parseInt(
      process.env.TRANSCRIPTION_TIMEOUT_MS || defaultConfig.timeoutMs.toString(),
      10,
    ),
    retryCount: parseInt(
      process.env.TRANSCRIPTION_RETRY_COUNT || defaultConfig.retryCount.toString(),
      10,
    ),
    maxConcurrency: parseInt(
      process.env.TRANSCRIPTION_MAX_CONCURRENCY || defaultConfig.maxConcurrency.toString(),
      10,
    ),
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
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxDuration: 3600, // 60 minutes
  };
}

export function isGroqAvailable(): boolean {
  const settings = getGroqSettings();
  return !!settings.apiKey;
}
