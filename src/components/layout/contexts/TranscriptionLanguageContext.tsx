"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * 支持的语言配置
 */
export const SUPPORTED_LANGUAGES = {
  zh: {
    code: "zh",
    name: "中文",
    flag: "🇨🇳",
  },
  "zh-CN": {
    code: "zh-CN",
    name: "简体中文",
    flag: "🇨🇳",
  },
  "zh-TW": {
    code: "zh-TW",
    name: "繁體中文",
    flag: "🇹🇼",
  },
  en: {
    code: "en",
    name: "English",
    flag: "🇺🇸",
  },
  "en-US": {
    code: "en-US",
    name: "American English",
    flag: "🇺🇸",
  },
  "en-GB": {
    code: "en-GB",
    name: "British English",
    flag: "🇬🇧",
  },
  ja: {
    code: "ja",
    name: "日本語",
    flag: "🇯🇵",
  },
  ko: {
    code: "ko",
    name: "한국어",
    flag: "🇰🇷",
  },
  es: {
    code: "es",
    name: "Español",
    flag: "🇪🇸",
  },
  fr: {
    code: "fr",
    name: "Français",
    flag: "🇫🇷",
  },
  de: {
    code: "de",
    name: "Deutsch",
    flag: "🇩🇪",
  },
  it: {
    code: "it",
    name: "Italiano",
    flag: "🇮🇹",
  },
  ru: {
    code: "ru",
    name: "Русский",
    flag: "🇷🇺",
  },
  pt: {
    code: "pt",
    name: "Português",
    flag: "🇵🇧",
  },
  ar: {
    code: "ar",
    name: "العربية",
    flag: "🇸🇦",
  },
  hi: {
    code: "hi",
    name: "हिन्दी",
    flag: "🇮🇳",
  },
  th: {
    code: "th",
    name: "ไทย",
    flag: "🇹🇭",
  },
  vi: {
    code: "vi",
    name: "Tiếng Việt",
    flag: "🇻🇳",
  },
} as const;

/**
 * 向后API支持的语言（用于转录）
 */
export const TRANSCRIPTION_LANGUAGES = {
  zh: {
    code: "zh",
    name: "中文",
    flag: "🇨🇳",
  },
  en: {
    code: "en",
    name: "English",
    flag: "🇺🇸",
  },
  ja: {
    code: "ja",
    name: "日本語",
    flag: "🇯🇵",
  },
  ko: {
    code: "ko",
    name: "한국어",
    flag: "🇰🇷",
  },
  es: {
    code: "es",
    name: "Español",
    flag: "🇪🇸",
  },
  fr: {
    code: "fr",
    name: "Français",
    flag: "🇫🇷",
  },
  de: {
    code: "de",
    name: "Deutsch",
    flag: "🇩🇪",
  },
  pt: {
    code: "pt",
    name: "Português",
    flag: "🇵🇧",
  },
  it: {
    code: "it",
    name: "Italiano",
    flag: "🇮🇹",
  },
  ru: {
    code: "ru",
    name: "Русский",
    flag: "🇷🇺",
  },
  ar: {
    code: "ar",
    name: "العربية",
    flag: "🇸🇦",
  },
  hi: {
    code: "hi",
    name: "हिन्दी",
    flag: "🇮🇳",
  },
} as const;

/**
 * 获取浏览器默认语言
 */
export function getBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'en';

  const browserLang = navigator.language || (navigator as any).userLanguage;

  // 简化语言代码（只取主要语言部分）
  const mainLang = browserLang.split('-')[0];

  // 检查是否在支持的语言列表中
  if (mainLang in TRANSCRIPTION_LANGUAGES) {
    return mainLang;
  }

  // 返回默认语言
  return 'en';
}

/**
 * 学习语言配置类型
 */
export interface LearningLanguageConfig {
  /** 母语语言 - 转录时翻译的目标语言 */
  nativeLanguage: string;
  /** 目标语言 - 转录时API使用的语言 */
  targetLanguage: string;
}

export type TranscriptionLanguageCode = keyof typeof TRANSCRIPTION_LANGUAGES;

interface TranscriptionLanguageContextType {
  /** 当前转录语言代码 */
  language: TranscriptionLanguageCode;
  /** 设置转录语言 */
  setLanguage: (language: TranscriptionLanguageCode) => void;
  /** 获取语言配置 */
  getLanguageConfig: (
    code: TranscriptionLanguageCode,
  ) => (typeof TRANSCRIPTION_LANGUAGES)[TranscriptionLanguageCode];
  /** 学习语言配置 */
  learningLanguage: LearningLanguageConfig;
  /** 设置学习语言 */
  setLearningLanguage: (config: LearningLanguageConfig) => void;
  /** 获取支持的语言列表 */
  getSupportedLanguages: () => typeof SUPPORTED_LANGUAGES;
  /** 获取转录支持的语言列表 */
  getTranscriptionLanguages: () => typeof TRANSCRIPTION_LANGUAGES;
}

const TranscriptionLanguageContext = createContext<
  TranscriptionLanguageContextType | undefined
>(undefined);

const STORAGE_KEY = "umuo-transcription-language";
const LEARNING_LANGUAGE_KEY = "umuo-learning-language";
const DEFAULT_LANGUAGE: TranscriptionLanguageCode = "ja";

export function useTranscriptionLanguage() {
  const context = useContext(TranscriptionLanguageContext);
  if (!context) {
    throw new Error(
      "useTranscriptionLanguage must be used within a TranscriptionLanguageProvider",
    );
  }
  return context;
}

interface TranscriptionLanguageProviderProps {
  children: React.ReactNode;
}

export function TranscriptionLanguageProvider({
  children,
}: TranscriptionLanguageProviderProps) {
  const [language, setLanguageState] = useState<TranscriptionLanguageCode>(DEFAULT_LANGUAGE);
  const [learningLanguage, setLearningLanguageState] = useState<LearningLanguageConfig>({
    nativeLanguage: 'zh', // 默认中文为母语
    targetLanguage: 'ja', // 默认日语为目标语言
  });
  const [isClient, setIsClient] = useState(false);

  // 初始化 - 从localStorage 读取
  useEffect(() => {
    setIsClient(true);

    // 读取转录语言设置
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as TranscriptionLanguageCode;
      if (stored && stored in TRANSCRIPTION_LANGUAGES) {
        setLanguageState(stored);
      }
    } catch (error) {
      console.warn("Failed to read transcription language from localStorage:", error);
    }

    // 读取学习语言设置
    try {
      const storedLearning = localStorage.getItem(LEARNING_LANGUAGE_KEY);
      if (storedLearning) {
        const parsed = JSON.parse(storedLearning) as LearningLanguageConfig;
        setLearningLanguageState(parsed);
      }
    } catch (error) {
      console.warn("Failed to read learning language from localStorage:", error);
    }

    // 如果没有学习语言设置，根据浏览器语言自动设置
    if (!localStorage.getItem(LEARNING_LANGUAGE_KEY)) {
      const browserLang = getBrowserLanguage();
      const autoConfig: LearningLanguageConfig = {
        nativeLanguage: browserLang === 'zh' ? 'zh' : 'en', // 如果浏览器是中文，母语设为中文
        targetLanguage: browserLang in TRANSCRIPTION_LANGUAGES ? browserLang : 'ja', // 如果浏览器语言支持转录，使用浏览器语言，否则使用日语
      };
      setLearningLanguageState(autoConfig);
      localStorage.setItem(LEARNING_LANGUAGE_KEY, JSON.stringify(autoConfig));
    }
  }, []);

  // 设置转录语言并持久化
  const setLanguage = useCallback((newLanguage: TranscriptionLanguageCode) => {
    setLanguageState(newLanguage);
    try {
      localStorage.setItem(STORAGE_KEY, newLanguage);
    } catch (error) {
      console.warn("Failed to save transcription language to localStorage:", error);
    }
  }, []);

  // 设置学习语言并持久化
  const setLearningLanguage = useCallback((config: LearningLanguageConfig) => {
    setLearningLanguageState(config);
    try {
      localStorage.setItem(LEARNING_LANGUAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn("Failed to save learning language to localStorage:", error);
    }
  }, []);

  // 获取语言配置
  const getLanguageConfig = useCallback((code: TranscriptionLanguageCode) => {
    return TRANSCRIPTION_LANGUAGES[code];
  }, []);

  // 获取支持的语言列表
  const getSupportedLanguages = useCallback(() => SUPPORTED_LANGUAGES, []);

  // 获取转录支持的语言列表
  const getTranscriptionLanguages = useCallback(() => TRANSCRIPTION_LANGUAGES, []);

  // 防止服务端/客户端不一致
  if (!isClient) {
    return null;
  }

  return (
    <TranscriptionLanguageContext.Provider
      value={{
        language,
        setLanguage,
        getLanguageConfig,
        learningLanguage,
        setLearningLanguage,
        getSupportedLanguages,
        getTranscriptionLanguages,
      }}
    >
      {children}
    </TranscriptionLanguageContext.Provider>
  );
}
