/**
 * 转录系统的类型定义
 * 用于统一管理转录状态、任务和队列
 */

import { z } from "zod";

// 品牌类型 - 提供类型安全
type TaskId = string & { readonly __brand: "TaskId" };
type FileId = number & { readonly __brand: "FileId" };
type QueueId = string & { readonly __brand: "QueueId" };

// 品牌类型创建函数
export function createTaskId(id: string): TaskId {
  return id as TaskId;
}

export function createFileId(id: number): FileId {
  return id as FileId;
}

export function createQueueId(id: string): QueueId {
  return id as QueueId;
}

// Zod 验证 Schema
const TranscriptionWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number().optional(),
});

const TranscriptionSegmentSchema = z.object({
  id: z.number(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  confidence: z.number().optional(),
  words: z.array(TranscriptionWordSchema).optional(),
});

// 运行时验证函数
export function validateTranscriptionWord(data: unknown): data is TranscriptionWord {
  return TranscriptionWordSchema.safeParse(data).success;
}

export function validateTranscriptionSegment(data: unknown): data is TranscriptionSegment {
  return TranscriptionSegmentSchema.safeParse(data).success;
}

// 转录片段和单词类型
export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
  words?: TranscriptionWord[];
}

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
  normalizedText?: string;
  translation?: string;
  annotations?: string[];
  furigana?: string;
  words: TranscriptionWord[];
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  duration?: number;
  segments?: TranscriptionSegment[];
  processedSegments?: ProcessedSegment[];
  language?: string;
  confidence?: number;
  model: string;
  processingTime: number;
  segmentsCount?: number;
}

// 转录任务状态
export type TranscriptionStatus =
  | "idle" // 空闲状态
  | "queued" // 已排队，等待处理
  | "processing" // 正在转录中
  | "completed" // 转录完成
  | "failed" // 转录失败
  | "cancelled" // 用户取消
  | "paused"; // 暂停中

// 转录任务优先级
export type TranscriptionPriority =
  | "low" // 低优先级
  | "normal" // 正常优先级
  | "high" // 高优先级
  | "urgent"; // 紧急优先级

// 转录选项配置
export interface TranscriptionOptions {
  language?: string; // 转录语言，默认 'ja'
  autoStart?: boolean; // 是否自动开始，默认 true
  priority?: TranscriptionPriority; // 优先级，默认 'normal'
  enablePostProcessing?: boolean; // 是否启用后处理，默认 true
  maxRetries?: number; // 最大重试次数，默认 2
  timeoutMs?: number; // 超时时间，默认 300000 (5分钟)
  estimatedDuration?: number; // 预估转录时长（秒）
}

// 转录任务进度信息
export interface TranscriptionProgress {
  fileId: number;
  status: TranscriptionStatus;
  progress: number; // 0-100 的进度百分比
  message?: string; // 状态消息
  error?: string; // 错误信息（如果有）

  // 时间信息
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number; // 预估总时长（秒）
  actualDuration?: number; // 实际花费时长（秒）

  // 转录结果（完成后可用）
  result?: {
    text: string;
    duration?: number;
    segmentsCount: number;
    language?: string;
  };

  // 任务配置
  options: TranscriptionOptions;
}

// 转录任务验证 Schema
const TranscriptionTaskSchema = z.object({
  id: z.string(),
  fileId: z.number(),
  fileName: z.string(),
  fileSize: z.number(),
  duration: z.number().optional(),
  status: z.enum(["idle", "queued", "processing", "completed", "failed", "cancelled", "paused"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  progress: z.any(), // TranscriptionProgress 将在下面定义
  options: z.any().optional(), // TranscriptionOptions 将在下面定义
  dependencies: z.array(z.string()).optional(),
  dependents: z.array(z.string()).optional(),
});

// 验证转录任务
export function validateTranscriptionTask(data: unknown): data is TranscriptionTask {
  return TranscriptionTaskSchema.safeParse(data).success;
}

// 增强的转录任务接口 - 使用品牌类型
export interface TranscriptionTask {
  id: TaskId; // 唯一任务ID
  fileId: FileId; // 关联的文件ID
  fileName: string; // 文件名
  fileSize: number; // 文件大小（字节）
  duration?: number; // 音频时长（秒）

  // 任务信息
  status: TranscriptionStatus;
  priority: TranscriptionPriority;
  progress: TranscriptionProgress;
  options?: TranscriptionOptions; // 转录选项

  // 依赖关系
  dependencies?: TaskId[]; // 依赖的其他任务ID
  dependents?: TaskId[]; // 依赖此任务的其他任务ID
}

// 队列状态
export interface TranscriptionQueueState {
  // 队列信息
  queued: TranscriptionTask[]; // 等待中的任务
  processing: TranscriptionTask[]; // 正在处理的任务
  completed: TranscriptionTask[]; // 已完成的任务（最近N个）
  failed: TranscriptionTask[]; // 失败的任务（最近N个）

  // 系统状态
  isProcessing: boolean; // 是否有任务正在处理
  maxConcurrency: number; // 最大并发数
  currentConcurrency: number; // 当前并发数

  // 统计信息
  stats: {
    totalProcessed: number; // 总处理数
    successCount: number; // 成功数
    failureCount: number; // 失败数
    averageProcessingTime: number; // 平均处理时间（秒）
    queueLength: number; // 当前队列长度
  };
}

// 转录管理器接口
export interface ITranscriptionManager {
  // 任务管理
  addTask(fileId: number, options?: TranscriptionOptions): Promise<string>;
  removeTask(taskId: string): boolean;
  cancelTask(taskId: string): boolean;
  retryTask(taskId: string): Promise<boolean>;
  pauseTask(taskId: string): boolean;
  resumeTask(taskId: string): boolean;

  // 状态查询
  getTask(taskId: string): TranscriptionTask | null;
  getTaskByFileId(fileId: number): TranscriptionTask | null;
  getTasksByStatus(status: TranscriptionStatus): TranscriptionTask[];
  getQueueState(): TranscriptionQueueState;

  // 系统控制
  start(): void;
  pause(): void;
  stop(): void;
  clearQueue(): void;
  clearCompleted(): void;

  // 事件监听
  onTaskUpdate(callback: (task: TranscriptionTask) => void): () => void;
  onQueueUpdate(callback: (state: TranscriptionQueueState) => void): () => void;
  onProgressUpdate(callback: (taskId: string, progress: number) => void): () => void;
}

// 用户界面相关类型
export interface TranscriptionUIState {
  // 显示控制
  showTranscriptionManager: boolean;
  showProgressDetails: boolean;
  selectedTaskId?: string;

  // 用户偏好
  autoStartTranscription: boolean;
  defaultLanguage: string;
  defaultPriority: TranscriptionPriority;
  showNotifications: boolean;

  // 过滤和排序
  filterBy: {
    status?: TranscriptionStatus[];
    priority?: TranscriptionPriority[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  sortBy: "createdAt" | "priority" | "fileName" | "duration";
  sortOrder: "asc" | "desc";
}

// 错误类型
export class TranscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
    public recoverable: boolean = true,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

// 事件类型
export type TranscriptionEvent =
  | { type: "task_added"; taskId: string; task: TranscriptionTask }
  | { type: "task_started"; taskId: string; task: TranscriptionTask }
  | {
      type: "task_progress";
      taskId: string;
      progress: number;
      message?: string;
    }
  | {
      type: "task_completed";
      taskId: string;
      task: TranscriptionTask;
      result: TranscriptionResult;
    }
  | {
      type: "task_failed";
      taskId: string;
      task: TranscriptionTask;
      error: Error;
    }
  | { type: "task_cancelled"; taskId: string; task: TranscriptionTask }
  | { type: "queue_updated"; state: TranscriptionQueueState };
