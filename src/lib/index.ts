/**
 * 统一导入索引文件
 * 减少项目中的重复导入语句
 */

// 数据库相关
export { db } from "./db/db";
export type {
  FileRow,
  Segment,
  TranscriptRow,
  FileStatus,
} from "../types/db/database";

// 错误处理相关
export { logError, handleError } from "./utils/error-handler";

export {
  handleTranscriptionError,
  handleTranscriptionSuccess,
  handleTranscriptionProgress,
  type TranscriptionErrorContext,
} from "./utils/transcription-error-handler";

// API 相关
export { apiSuccess, apiError, apiFromError } from "./utils/api-response";

// 常量相关
export const API_ENDPOINTS = {
  TRANSCRIBE: "/api/transcribe",
  POSTPROCESS: "/api/postprocess",
  HEALTH: "/api/health",
  PROGRESS: "/api/progress",
} as const;

export const CACHE_TIMES = {
  DEFAULT: 5 * 60 * 1000, // 5分钟
  LONG: 15 * 60 * 1000, // 15分钟
  SHORT: 60 * 1000, // 1分钟
} as const;

export const SUPPORTED_AUDIO_FORMATS = [
  "audio/mp3",
  "audio/wav",
  "audio/m4a",
  "audio/mpeg",
  "audio/x-m4a",
] as const;

export const TRANSCRIPTION_LANGUAGES = {
  JAPANESE: "ja",
  ENGLISH: "en",
  CHINESE: "zh",
  KOREAN: "ko",
} as const;
