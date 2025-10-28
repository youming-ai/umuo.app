/**
 * 队列管理相关的类型定义
 */

import type { ProcessedSegment, TranscriptionSegment } from "./api.types";
import type { TranscriptionTask } from "./transcription.types";

export interface QueueEvent {
  type:
    | "task_added"
    | "task_started"
    | "task_progress"
    | "task_completed"
    | "task_failed"
    | "queue_updated";
  taskId?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface QueueUpdateEvent extends QueueEvent {
  type: "queue_updated";
  data: {
    state: QueueState;
  };
}

export interface TaskProgressEvent extends QueueEvent {
  type: "task_progress";
  taskId: string;
  data: {
    progress: number;
    stage: string;
    message?: string;
  };
}

export interface TaskCompletedEvent extends QueueEvent {
  type: "task_completed";
  taskId: string;
  data: {
    result: TranscriptionResult;
  };
}

export interface TaskFailedEvent extends QueueEvent {
  type: "task_failed";
  taskId: string;
  data: {
    error: TranscriptionError;
  };
}

export interface QueueState {
  tasks: Map<string, TranscriptionTask>;
  processingQueue: string[];
  completedQueue: string[];
  failedQueue: string[];
  maxConcurrent: number;
  isProcessing: boolean;
}

export interface QueueStatistics {
  totalTasks: number;
  pendingTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  successRate: number;
  queueLength: number;
  estimatedWaitTime: number;
}

export interface QueueConfig {
  maxConcurrent: number;
  retryAttempts: number;
  retryDelay: number;
  timeoutMs: number;
  priorities: Record<string, number>;
}

// 从其他文件导入的类型（避免循环依赖）
export interface TranscriptionResult {
  text: string;
  durationInSeconds?: number;
  segments?: TranscriptionSegment[];
  processedSegments?: ProcessedSegment[];
  metadata?: Record<string, unknown>;
}

export interface TranscriptionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  timestamp: string;
}
