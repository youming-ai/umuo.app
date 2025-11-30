"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * 支持的转录语言配置
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
} as const;

export type TranscriptionLanguageCode = keyof typeof TRANSCRIPTION_LANGUAGES;

interface TranscriptionLanguageContextType {
  /** 当前转录语言代码 */
  language: TranscriptionLanguageCode;
  /** 设置转录语言 */
  setLanguage: (language: TranscriptionLanguageCode) => void;
  /** 获取语言配置 */
  getLanguageConfig: (code: TranscriptionLanguageCode) => (typeof TRANSCRIPTION_LANGUAGES)[TranscriptionLanguageCode];
}

const TranscriptionLanguageContext = createContext<TranscriptionLanguageContextType | undefined>(undefined);

const STORAGE_KEY = "umuo-transcription-language";
const DEFAULT_LANGUAGE: TranscriptionLanguageCode = "ja";

export function useTranscriptionLanguage() {
  const context = useContext(TranscriptionLanguageContext);
  if (!context) {
    throw new Error("useTranscriptionLanguage must be used within a TranscriptionLanguageProvider");
  }
  return context;
}

interface TranscriptionLanguageProviderProps {
  children: React.ReactNode;
}

export function TranscriptionLanguageProvider({ children }: TranscriptionLanguageProviderProps) {
  const [language, setLanguageState] = useState<TranscriptionLanguageCode>(DEFAULT_LANGUAGE);
  const [isClient, setIsClient] = useState(false);

  // 初始化 - 从 localStorage 读取
  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as TranscriptionLanguageCode;
      if (stored && stored in TRANSCRIPTION_LANGUAGES) {
        setLanguageState(stored);
      }
    } catch (error) {
      console.warn("Failed to read transcription language from localStorage:", error);
    }
  }, []);

  // 设置语言并持久化
  const setLanguage = useCallback((newLanguage: TranscriptionLanguageCode) => {
    setLanguageState(newLanguage);
    try {
      localStorage.setItem(STORAGE_KEY, newLanguage);
    } catch (error) {
      console.warn("Failed to save transcription language to localStorage:", error);
    }
  }, []);

  // 获取语言配置
  const getLanguageConfig = useCallback((code: TranscriptionLanguageCode) => {
    return TRANSCRIPTION_LANGUAGES[code];
  }, []);

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
      }}
    >
      {children}
    </TranscriptionLanguageContext.Provider>
  );
}
