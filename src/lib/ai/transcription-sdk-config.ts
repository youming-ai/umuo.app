/**
 * 统一的 AI SDK 转录配置
 * 基于 Groq 官方 SDK 最佳实践
 */

export interface TranscriptionSDKConfig {
  model?: string;
  temperature?: number;
  response_format?: string;
  timestamp_granularities?: string[];
  language?: string;
  prompt?: string;
}

/**
 * 获取默认的转录配置
 */
export function getDefaultTranscriptionConfig(language?: string): TranscriptionSDKConfig {
  return {
    temperature: 0,
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
    language: language || "auto",
  };
}

/**
 * 为 AI SDK 创建 provider options
 */
export function createGroqProviderOptions(
  language?: string,
  prompt?: string,
): Record<string, unknown> {
  return {
    groq: {
      ...getDefaultTranscriptionConfig(language),
      ...(prompt && { prompt }),
    },
  };
}

/**
 * 验证转录配置
 */
export function validateTranscriptionConfig(config: TranscriptionSDKConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.model) {
    errors.push("Model is required");
  }

  if (typeof config.temperature !== "number" || config.temperature < 0 || config.temperature > 1) {
    errors.push("Temperature must be a number between 0 and 1");
  }

  if (config.response_format !== "verbose_json") {
    errors.push("Response format must be 'verbose_json'");
  }

  if (
    !Array.isArray(config.timestamp_granularities) ||
    config.timestamp_granularities.length === 0
  ) {
    errors.push("Timestamp granularities must be a non-empty array");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 支持的语言列表
 */
export const SUPPORTED_LANGUAGES = [
  "auto",
  "en",
  "zh",
  "ja",
  "ko",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "ru",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * 验证语言代码
 */
export function isValidLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

/**
 * 获取语言显示名称
 */
export function getLanguageDisplayName(language: string): string {
  const languageNames: Record<string, string> = {
    auto: "自动检测",
    en: "English",
    zh: "中文",
    ja: "日本語",
    ko: "한국어",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    it: "Italiano",
    pt: "Português",
    ru: "Русский",
  };

  return languageNames[language] || language;
}
