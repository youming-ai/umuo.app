/**
 * 转录相关的类型定义
 */

import type { ProcessedSegment, TranscriptionSegment, TranscriptionWord } from "./api.types";

export interface TranscriptionTask {
  id: string;
  fileId: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: TranscriptionProgress;
  metadata: {
    filename: string;
    size: number;
    duration?: number;
    format: string;
    language?: string;
  };
  error?: TranscriptionError;
  result?: TranscriptionResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TranscriptionProgress {
  progress: number; // 0-100
  stage: "uploading" | "processing" | "postprocessing" | "completed" | "failed";
  currentStep?: string;
  estimatedDuration?: number; // 预估总时长（毫秒）
  elapsed?: number; // 已用时长（毫秒）
}

export interface TranscriptionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  timestamp: string;
}

export interface TranscriptionResult {
  text: string;
  durationInSeconds?: number;
  segments?: TranscriptionSegment[];
  words?: TranscriptionWord[];
  processedSegments?: ProcessedSegment[];
  metadata?: {
    language?: string;
    confidence?: number;
    model: string;
    processingTime: number;
  };
}

export interface QueueState {
  pendingTasks: TranscriptionTask[];
  processingTasks: TranscriptionTask[];
  completedTasks: TranscriptionTask[];
  failedTasks: TranscriptionTask[];
  stats: QueueStatistics;
}

export interface QueueStatistics {
  totalTasks: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  averageProcessingTime: number;
  successRate: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: FileMetadata;
}

export interface FileMetadata {
  filename: string;
  size: number;
  format: string;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export type TranscriptionStatus = TranscriptionTask["status"];

export type ProcessingStage = TranscriptionProgress["stage"];
