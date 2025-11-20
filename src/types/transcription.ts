/**
 * 简化的转录类型定义
 * 移除复杂的抽象层，保留核心功能
 */

// 转录片段和单词类型
export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
  wordTimestamps?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export interface ProcessedSegment extends TranscriptionSegment {
  normalizedText?: string;
  translation?: string;
  annotations?: string[];
  furigana?: string;
}

// 转录结果
export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
  model?: string;
  processingTime?: number;
  segmentsCount?: number;
}

// 转录状态
export type TranscriptionStatus =
  | "idle"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

// 转录选项
export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  onProgress?: (progress: {
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    message?: string;
    error?: string;
  }) => void;
}

// 转录进度
export interface TranscriptionProgress {
  fileId: number;
  status: TranscriptionStatus;
  progress: number;
  message: string;
}

// Groq SDK 响应（verbose_json）中包含的结构
export interface GroqTranscriptionWord {
  word?: string;
  start?: number;
  end?: number;
}

export interface GroqTranscriptionSegment {
  id?: number;
  start?: number;
  end?: number;
  text?: string;
  confidence?: number;
  words?: GroqTranscriptionWord[];
}

export interface GroqTranscriptionResponse {
  text?: string;
  language?: string;
  duration?: number;
  segments?: GroqTranscriptionSegment[];
  words?: GroqTranscriptionWord[];
  [key: string]: unknown;
}

// 简化的转录任务（用于UI显示）
export interface TranscriptionTask {
  id: string;
  fileId: number;
  fileName: string;
  fileSize: number;
  duration?: number;
  status: TranscriptionStatus;
  priority: "low" | "normal" | "high" | "urgent";
  progress: {
    fileId: number;
    status: TranscriptionStatus;
    progress: number;
    message?: string;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    estimatedDuration?: number;
    actualDuration?: number;
    result?: {
      text: string;
      duration?: number;
      segmentsCount: number;
      language?: string;
    };
    options: TranscriptionOptions;
  };
  options?: TranscriptionOptions;
}

// 错误类型
export class TranscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}
