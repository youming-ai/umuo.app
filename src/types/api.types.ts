/**
 * API 类型定义
 * 统一的 API 响应格式和错误处理类型
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  meta?: {
    requestId?: string;
    version?: string;
    processingTime?: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiResponse<T[]>["meta"] & {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface TranscriptionResponseData {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  transcript?: {
    text: string;
    durationInSeconds?: number;
    segments?: import("./transcription").TranscriptionSegment[];
  };
  processedSegments?: import("./transcription").ProcessedSegment[];
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// TranscriptionSegment 已移至 types/transcription.ts 以避免重复

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface ProcessedSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  translation?: string;
  words: TranscriptionWord[];
  confidence: number;
}

export interface AudioUploadResponse {
  fileId: string;
  filename: string;
  size: number;
  duration?: number;
  format: string;
}

export interface ProgressUpdateData {
  fileId: string;
  status: string;
  progress: number;
  estimatedDuration?: number;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export type HttpErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR"
  | "BAD_GATEWAY"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT";

export type TranscriptionErrorCode =
  | "INVALID_AUDIO_FORMAT"
  | "AUDIO_TOO_LARGE"
  | "TRANSCRIPTION_FAILED"
  | "RATE_LIMIT_EXCEEDED"
  | "SERVICE_UNAVAILABLE"
  | "INVALID_LANGUAGE"
  | "PROCESSING_TIMEOUT"
  | "UNKNOWN_ERROR";
