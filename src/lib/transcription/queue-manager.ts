/**
 * 转录队列管理器 - Cloudflare Workers 兼容版本
 * 负责管理转录任务的执行、调度和状态更新
 * 使用事件驱动替代定时器，支持 Edge Runtime
 */

import { TranscriptionService } from "@/lib/ai/transcription-service";
import { edgeAdapter } from "@/lib/cloudflare/edge-adapter";
import { DbUtils } from "@/lib/db/db";
import {
  type ITranscriptionManager,
  TranscriptionError,
  type TranscriptionOptions,
  type TranscriptionQueueState,
  type TranscriptionStatus,
  type TranscriptionTask,
} from "@/types/transcription";
import { useTranscriptionStore } from "./store";

// 检测运行环境
const _isEdgeRuntime =
  typeof globalThis !== "undefined" && (globalThis as any).EdgeRuntime !== undefined;

/**
 * 转录队列管理器实现 - 事件驱动版本
 */
export class TranscriptionQueueManager implements ITranscriptionManager {
  private store = useTranscriptionStore.getState();
  private processingTasks = new Set<string>();
  private isRunning = false;
  private pendingQueueCheck = false;

  // 配置
  private config = {
    maxConcurrency: 2,
    retryDelays: [2000, 5000, 10000], // 重试延迟（毫秒）
  };

  constructor() {
    this.start();
  }

  /**
   * 添加转录任务
   */
  async addTask(fileId: number, options: TranscriptionOptions = {}): Promise<string> {
    try {
      // 获取文件信息
      const file = await DbUtils.getFile(fileId);
      if (!file) {
        throw new TranscriptionError("File not found", "FILE_NOT_FOUND", {
          fileId,
        });
      }

      // 添加到状态管理器
      const taskId = useTranscriptionStore
        .getState()
        .addTask(fileId, file.name, file.size, options);

      console.log(`🎵 转录任务已添加: ${taskId} (${file.name})`);

      // 触发队列处理（事件驱动）
      this.scheduleQueueProcess();

      // 显示通知
      if (options.autoStart !== false) {
        this.showNotification("转录任务已添加", `${file.name} 已加入转录队列`, "info");
      }

      return taskId;
    } catch (error) {
      if (error instanceof TranscriptionError) {
        throw error;
      }

      throw new TranscriptionError("Failed to add transcription task", "ADD_TASK_FAILED", {
        fileId,
        originalError: error,
      });
    }
  }

  /**
   * 移除任务
   */
  removeTask(taskId: string): boolean {
    try {
      const task = this.store.getTask(taskId);
      if (!task) {
        return false;
      }

      // 如果任务正在处理，先取消
      if (task.status === "processing") {
        this.cancelTask(taskId);
      }

      const success = useTranscriptionStore.getState().removeTask(taskId);

      if (success) {
        console.log(`🗑️ 转录任务已移除: ${taskId}`);
        this.showNotification("任务已移除", `任务 ${task.fileName} 已从队列中移除`, "info");
      }

      return success;
    } catch (error) {
      console.error(`Failed to remove task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.store.getTask(taskId);
    if (!task) {
      return false;
    }

    // 如果正在处理，停止处理
    if (this.processingTasks.has(taskId)) {
      this.processingTasks.delete(taskId);
      // 这里可以添加实际的转录取消逻辑
      console.log(`⏹️ 转录任务已取消: ${taskId}`);
    }

    useTranscriptionStore.getState().cancelTask(taskId);

    this.showNotification("转录已取消", `${task.fileName} 的转录已取消`, "warning");
    return true;
  }

  /**
   * 重试任务
   */
  async retryTask(taskId: string): Promise<boolean> {
    const task = this.store.getTask(taskId);
    if (!task) {
      return false;
    }

    if (task.status !== "failed") {
      console.warn(`Cannot retry task ${taskId}: not in failed status`);
      return false;
    }

    try {
      console.log(`🔄 重试转录任务: ${taskId}`);
      useTranscriptionStore.getState().startTask(taskId);

      this.showNotification("开始重试", `${task.fileName} 开始重新转录`, "info");
      return true;
    } catch (error) {
      console.error(`Failed to retry task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * 暂停任务
   */
  pauseTask(taskId: string): boolean {
    const task = this.store.getTask(taskId);
    if (!task || task.status !== "processing") {
      return false;
    }

    useTranscriptionStore.getState().pauseTask(taskId);
    console.log(`⏸️ 转录任务已暂停: ${taskId}`);

    this.showNotification("转录已暂停", `${task.fileName} 的转录已暂停`, "info");
    return true;
  }

  /**
   * 恢复任务
   */
  resumeTask(taskId: string): boolean {
    const task = this.store.getTask(taskId);
    if (!task || task.status !== "paused") {
      return false;
    }

    useTranscriptionStore.getState().resumeTask(taskId);
    console.log(`▶️ 转录任务已恢复: ${taskId}`);

    this.showNotification("转录已恢复", `${task.fileName} 的转录已恢复`, "info");
    return true;
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): TranscriptionTask | null {
    return this.store.getTask(taskId);
  }

  /**
   * 根据文件ID获取任务
   */
  getTaskByFileId(fileId: number): TranscriptionTask | null {
    return this.store.getTaskByFileId(fileId);
  }

  /**
   * 根据状态获取任务
   */
  getTasksByStatus(status: TranscriptionStatus): TranscriptionTask[] {
    const state = useTranscriptionStore.getState();
    return Array.from(state.tasks.values()).filter((task) => task.status === status);
  }

  /**
   * 获取队列状态
   */
  getQueueState() {
    return this.store.queueState;
  }

  /**
   * 启动队列处理
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log("🚀 转录队列管理器已启动（事件驱动模式）");

    // 立即处理一次
    this.scheduleQueueProcess();
  }

  /**
   * 暂停队列处理
   */
  pause(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log("⏸️ 转录队列管理器已暂停");
  }

  /**
   * 调度队列处理（事件驱动）
   */
  private scheduleQueueProcess(): void {
    if (!this.isRunning || this.pendingQueueCheck) {
      return;
    }

    this.pendingQueueCheck = true;

    // 使用微任务确保异步执行
    Promise.resolve().then(() => {
      this.pendingQueueCheck = false;
      if (this.isRunning) {
        this.processQueue();
      }
    });
  }

  /**
   * 停止队列处理
   */
  stop(): void {
    this.pause();

    // 取消所有正在处理的任务
    this.processingTasks.forEach((taskId) => {
      this.cancelTask(taskId);
    });

    console.log("🛑 转录队列管理器已停止");
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    const state = useTranscriptionStore.getState();

    // 取消所有等待和正在处理的任务
    const tasksToCancel = [...state.queueState.queued, ...state.queueState.processing];

    tasksToCancel.forEach((task) => {
      this.cancelTask(task.id);
    });

    console.log("🗑️ 转录队列已清空");
  }

  /**
   * 清空已完成任务
   */
  clearCompleted(): void {
    useTranscriptionStore.getState().clearCompletedTasks();
    console.log("🗑️ 已完成的转录任务已清空");
  }

  /**
   * 添加任务更新监听器
   */
  onTaskUpdate(callback: (task: TranscriptionTask) => void): () => void {
    return useTranscriptionStore.getState().on("task_progress", callback);
  }

  /**
   * 添加队列更新监听器
   */
  onQueueUpdate(callback: (state: TranscriptionQueueState) => void): () => void {
    return useTranscriptionStore.getState().on("queue_updated", callback);
  }

  /**
   * 添加进度更新监听器
   */
  onProgressUpdate(callback: (taskId: string, progress: number) => void): () => void {
    return useTranscriptionStore
      .getState()
      .on("task_progress", (event: { taskId: string; progress: number }) => {
        callback(event.taskId, event.progress);
      });
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    const state = useTranscriptionStore.getState();
    const { queued, processing } = state.queueState;

    // 检查是否还有处理能力
    const availableSlots = this.config.maxConcurrency - processing.length;
    if (availableSlots <= 0 || queued.length === 0) {
      return;
    }

    // 按优先级排序任务
    const sortedQueued = this.sortTasksByPriority(queued);

    // 启动最多可用槽位的任务
    const tasksToStart = sortedQueued.slice(0, availableSlots);

    // 并行启动任务以提高效率
    const taskPromises = tasksToStart
      .filter((task) => !this.processingTasks.has(task.id))
      .map((task) => this.executeTask(task));

    // 等待所有任务启动（但不等待完成）
    if (taskPromises.length > 0) {
      // 不等待任务完成，让它们异步执行
      Promise.allSettled(taskPromises).catch((error) => {
        console.error("Task execution error:", error);
      });
    }
  }

  /**
   * 执行转录任务
   */
  private async executeTask(task: TranscriptionTask): Promise<void> {
    if (this.processingTasks.has(task.id)) {
      return;
    }

    this.processingTasks.add(task.id);

    try {
      console.log(`🎙️ 开始执行转录任务: ${task.id} (${task.fileName})`);

      // 更新任务状态为处理中
      useTranscriptionStore.getState().updateTask(task.id, {
        status: "processing",
        progress: {
          ...task.progress,
          status: "processing",
          startedAt: new Date(),
        },
      });

      // 执行转录
      const result = await TranscriptionService.transcribeAudio(task.fileId, {
        language: task.options?.language || "ja",
        onProgress: (progress) => {
          useTranscriptionStore
            .getState()
            .updateTaskProgress(task.id, progress.progress, progress.message);
        },
      });

      // 转录成功
      useTranscriptionStore.getState().completeTask(task.id, result);

      console.log(`✅ 转录任务完成: ${task.id}`);
      this.showNotification("转录完成", `${task.fileName} 转录已完成`, "success");
    } catch (error) {
      console.error(`❌ 转录任务失败: ${task.id}`, error);

      // 转录失败
      const transcriptionError = error instanceof Error ? error : new Error(String(error));
      useTranscriptionStore.getState().failTask(task.id, transcriptionError);

      // 检查是否需要自动重试
      if (this.shouldAutoRetry(task)) {
        // 使用 Edge Runtime 兼容的定时器
        edgeAdapter.timer.setTimeout(() => {
          this.retryTask(task.id);
        }, this.getRetryDelay(task));
      } else {
        this.showNotification(
          "转录失败",
          `${task.fileName} 转录失败: ${transcriptionError.message}`,
          "error",
        );
      }
    } finally {
      this.processingTasks.delete(task.id);
      // 任务完成或失败后，触发队列处理以处理下一个任务
      this.scheduleQueueProcess();
    }
  }

  /**
   * 按优先级排序任务
   */
  private sortTasksByPriority(tasks: TranscriptionTask[]): TranscriptionTask[] {
    const priorityOrder = {
      urgent: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    return tasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // 相同优先级按创建时间排序
      return a.progress.createdAt.getTime() - b.progress.createdAt.getTime();
    });
  }

  /**
   * 判断是否应该自动重试
   */
  private shouldAutoRetry(task: TranscriptionTask): boolean {
    const maxRetries = task.options?.maxRetries ?? 2; // 默认重试2次

    // 这里简化处理，实际可以记录重试次数
    return task.status === "failed" && maxRetries > 0;
  }

  /**
   * 获取重试延迟
   */
  private getRetryDelay(_task: TranscriptionTask): number {
    // 简化处理，返回固定延迟
    return this.config.retryDelays[0];
  }

  /**
   * 显示通知
   */
  private async showNotification(
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
  ) {
    try {
      const { toast } = await import("sonner");

      switch (type) {
        case "success":
          toast.success(message);
          break;
        case "error":
          toast.error(message);
          break;
        case "warning":
          toast.warning(message);
          break;
        default:
          toast.info(message);
      }
    } catch (_error) {
      // 如果 toast 不可用，使用 console
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
  }
}

// 全局实例
let globalTranscriptionManager: TranscriptionQueueManager | null = null;

/**
 * 获取全局转录管理器实例
 */
export function getTranscriptionManager(): TranscriptionQueueManager {
  if (!globalTranscriptionManager) {
    globalTranscriptionManager = new TranscriptionQueueManager();
  }

  return globalTranscriptionManager;
}

/**
 * 重置全局转录管理器（主要用于测试）
 */
export function resetTranscriptionManager(): void {
  if (globalTranscriptionManager) {
    globalTranscriptionManager.stop();
    globalTranscriptionManager = null;
  }
}
