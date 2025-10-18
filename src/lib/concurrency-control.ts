/**
 * 并发控制工具
 * 用于管理转录请求的并发数量、队列和重试机制
 */

import { getTranscriptionConfig } from "./transcription-config";

export interface QueuedTask<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  priority: number;
  createdAt: Date;
}

export class ConcurrencyController {
  private runningTasks = new Set<string>();
  private taskQueue: QueuedTask<any>[] = [];
  private config = getTranscriptionConfig();

  /**
   * 执行任务，带并发控制
   */
  async execute<T>(taskId: string, taskFn: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask<T> = {
        id: taskId,
        execute: taskFn,
        resolve,
        reject,
        priority,
        createdAt: new Date(),
      };

      // 检查是否有重复任务
      const existingTask = this.taskQueue.find((t) => t.id === taskId);
      if (existingTask) {
        reject(new Error(`Task with ID ${taskId} is already queued`));
        return;
      }

      // 检查是否已在运行
      if (this.runningTasks.has(taskId)) {
        reject(new Error(`Task with ID ${taskId} is already running`));
        return;
      }

      this.enqueueTask(task);
    });
  }

  /**
   * 将任务加入队列
   */
  private enqueueTask<T>(task: QueuedTask<T>): void {
    // 检查是否可以立即执行
    if (this.runningTasks.size < this.config.maxConcurrency) {
      this.executeTask(task);
    } else {
      // 按优先级排序加入队列
      this.insertTaskByPriority(task);
    }
  }

  /**
   * 按优先级插入任务
   */
  private insertTaskByPriority(task: QueuedTask<any>): void {
    let insertIndex = this.taskQueue.length;

    for (let i = 0; i < this.taskQueue.length; i++) {
      if (task.priority > this.taskQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, task);
  }

  /**
   * 执行任务
   */
  private async executeTask<T>(task: QueuedTask<T>): Promise<void> {
    this.runningTasks.add(task.id);

    try {
      const result = await task.execute();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.runningTasks.delete(task.id);
      this.processQueue();
    }
  }

  /**
   * 处理队列中的下一个任务
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    if (this.runningTasks.size < this.config.maxConcurrency) {
      const nextTask = this.taskQueue.shift();
      if (nextTask) {
        this.executeTask(nextTask);
      }
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    runningTasks: number;
    queuedTasks: number;
    maxConcurrency: number;
  } {
    return {
      runningTasks: this.runningTasks.size,
      queuedTasks: this.taskQueue.length,
      maxConcurrency: this.config.maxConcurrency,
    };
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    // 拒绝所有排队的任务
    this.taskQueue.forEach((task) => {
      task.reject(new Error("Task cancelled due to queue clearing"));
    });
    this.taskQueue = [];
  }

  /**
   * 取消特定任务
   */
  cancelTask(taskId: string): boolean {
    // 检查运行中的任务
    if (this.runningTasks.has(taskId)) {
      // 注意：无法真正取消正在运行的任务，只能标记
      return false;
    }

    // 检查队列中的任务
    const taskIndex = this.taskQueue.findIndex((task) => task.id === taskId);
    if (taskIndex !== -1) {
      const task = this.taskQueue.splice(taskIndex, 1)[0];
      task.reject(new Error(`Task ${taskId} was cancelled`));
      return true;
    }

    return false;
  }
}

// 单例实例
let concurrencyController: ConcurrencyController | null = null;

export function getConcurrencyController(): ConcurrencyController {
  if (!concurrencyController) {
    concurrencyController = new ConcurrencyController();
  }
  return concurrencyController;
}

/**
 * 重试机制包装器
 */
export async function withRetry<T>(
  taskId: string,
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  const controller = getConcurrencyController();
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await controller.execute(taskId, fn, maxRetries - attempt);
    } catch (error) {
      lastError = error;

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }

      // 检查是否应该重试
      if (!shouldRetry(error)) {
        throw lastError;
      }

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** attempt));
    }
  }

  throw lastError;
}

/**
 * 判断错误是否应该重试
 */
function shouldRetry(error: any): boolean {
  if (error instanceof Error) {
    // 网络错误或超时可以重试
    if (
      error.message.includes("timeout") ||
      error.message.includes("network") ||
      error.message.includes("rate limit")
    ) {
      return true;
    }

    // HTTP状态码
    if ("status" in error) {
      const status = (error as any).status;
      return status >= 500 || status === 429; // 服务器错误或限流
    }
  }

  return false;
}

/**
 * 请求去重
 */
export class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 如果已有相同的请求在进行中，返回其Promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // 创建新请求
    const promise = fn().finally(() => {
      // 请求完成后从映射中移除
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * 取消请求
   */
  cancel(key: string): boolean {
    return this.pendingRequests.delete(key);
  }

  /**
   * 获取待处理请求数量
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// 单例实例
let requestDeduplicator: RequestDeduplicator | null = null;

export function getRequestDeduplicator(): RequestDeduplicator {
  if (!requestDeduplicator) {
    requestDeduplicator = new RequestDeduplicator();
  }
  return requestDeduplicator;
}
