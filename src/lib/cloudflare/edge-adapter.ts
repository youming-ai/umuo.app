/**
 * Cloudflare Edge Runtime 适配器
 * 提供兼容性接口，处理 Edge Runtime 环境下的特殊需求
 */

import type { KVNamespace, ExecutionContext } from '@/types/cloudflare';

// Edge Runtime 环境检测
export function isEdgeRuntime(): boolean {
  return typeof globalThis !== 'undefined' &&
         (globalThis as any).EdgeRuntime !== undefined;
}

// 环境变量适配器
export function getEnvVar(key: string): string | undefined {
  if (isEdgeRuntime()) {
    // Edge Runtime 环境变量获取方式
    return (globalThis as any)[key] || process.env?.[key];
  }
  return process.env?.[key];
}

// KV 存储适配器
export function getKVNamespace(binding: string): KVNamespace | undefined {
  if (isEdgeRuntime()) {
    return (globalThis as any)[binding];
  }
  return undefined;
}

// 错误处理适配器 - Edge Runtime 中的错误处理
export class EdgeRuntimeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'EdgeRuntimeError';
  }
}

// 安全的 setTimeout 替代方案
export class EdgeTimer {
  private timers: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private nextId: number = 1;

  /**
   * Edge Runtime 安全的定时器
   * 注意：在 Edge Runtime 中，定时器有严格的限制
   */
  setTimeout(callback: () => void, delay: number): number {
    if (!isEdgeRuntime()) {
      // 非 Edge 环境，使用标准 setTimeout
      const id = setTimeout(callback, delay);
      return id as unknown as number;
    }

    // Edge Runtime 限制：延迟时间不能太长，建议不超过 30 秒
    const maxDelay = 30000; // 30秒
    const actualDelay = Math.min(delay, maxDelay);

    const id = this.nextId++;
    const timerId = setTimeout(() => {
      this.timers.delete(id);
      try {
        callback();
      } catch (error) {
        console.error('Timer callback error:', error);
      }
    }, actualDelay);

    this.timers.set(id, timerId);
    return id;
  }

  clearTimeout(id: number): void {
    if (!isEdgeRuntime()) {
      clearTimeout(id as unknown as NodeJS.Timeout);
      return;
    }

    const timerId = this.timers.get(id);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(id);
    }
  }

  // 清理所有定时器
  clearAll(): void {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    this.timers.clear();
  }
}

// 全局定时器实例
export const edgeTimer = new EdgeTimer();

// 内存存储适配器 - 使用 KV 替代内存存储
export class EdgeMemoryStore<T> {
  private kv: KVNamespace;
  private keyPrefix: string;
  private defaultTTL: number;

  constructor(kv: KVNamespace, keyPrefix: string, defaultTTL: number = 1800) {
    this.kv = kv;
    this.keyPrefix = keyPrefix;
    this.defaultTTL = defaultTTL;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    const serialized = JSON.stringify({
      data: value,
      timestamp: Date.now(),
    });

    await this.kv.put(fullKey, serialized, {
      expirationTtl: ttl || this.defaultTTL,
    });
  }

  async get(key: string): Promise<T | undefined> {
    const fullKey = `${this.keyPrefix}${key}`;
    const serialized = await this.kv.get(fullKey);

    if (!serialized) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(serialized);
      return parsed.data as T;
    } catch (error) {
      console.error(`Failed to parse stored data for key ${key}:`, error);
      return undefined;
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    await this.kv.delete(fullKey);
  }

  async clear(): Promise<void> {
    const list = await this.kv.list({ prefix: this.keyPrefix });
    const deletePromises = list.keys.map((key: { name: string }) => this.kv.delete(key.name));
    await Promise.all(deletePromises);
  }

  async list(): Promise<string[]> {
    const list = await this.kv.list({ prefix: this.keyPrefix });
    return list.keys.map((key: { name: string }) => key.name.replace(this.keyPrefix, ''));
  }
}

// 请求上下文适配器
export interface EdgeRequestContext {
  request: Request;
  env: Record<string, unknown>;
  ctx: ExecutionContext;
  waitUntil: (promise: Promise<unknown>) => void;
}

// 响应适配器 - 确保 Edge Runtime 兼容性
export function createEdgeResponse(
  data: unknown,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });

  // Edge Runtime 特定的头部
  if (isEdgeRuntime()) {
    responseHeaders.set('X-Edge-Runtime', 'true');
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

// 错误响应适配器
export function createEdgeErrorResponse(
  error: Error | EdgeRuntimeError,
  status: number = 500
): Response {
  const errorResponse = {
    success: false,
    error: {
      message: error.message,
      code: error instanceof EdgeRuntimeError ? error.code : 'INTERNAL_ERROR',
      ...(error instanceof EdgeRuntimeError && { details: error.details }),
    },
    timestamp: Date.now(),
  };

  return createEdgeResponse(errorResponse, status);
}

// 异步任务适配器 - 用于长时间运行的任务
export class EdgeAsyncTask {
  private static tasks: Map<string, Promise<unknown>> = new Map();

  /**
   * 注册异步任务
   * 在 Edge Runtime 中，使用 waitUntil 确保任务完成
   */
  static registerTask(
    taskId: string,
    task: Promise<unknown>,
    ctx?: { waitUntil: (promise: Promise<unknown>) => void }
  ): void {
    this.tasks.set(taskId, task);

    // 在 Edge Runtime 中使用 waitUntil
    if (isEdgeRuntime() && ctx?.waitUntil) {
      ctx.waitUntil(
        task.finally(() => {
          this.tasks.delete(taskId);
        })
      );
    } else {
      // 非 Edge 环境，直接处理
      task.finally(() => {
        this.tasks.delete(taskId);
      });
    }
  }

  static getTaskStatus(taskId: string): 'running' | 'completed' | 'not_found' {
    const task = this.tasks.get(taskId);
    if (!task) return 'not_found';

    // 简单的状态检查，实际实现可能需要更复杂的逻辑
    return 'running';
  }

  static async waitForTask(taskId: string): Promise<unknown> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    return await task;
  }
}

// 性能监控适配器
export class EdgePerformanceMonitor {
  private startTime: number = Date.now();
  private metrics: Map<string, number> = new Map();

  mark(name: string): void {
    this.metrics.set(name, Date.now() - this.startTime);
  }

  getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  reset(): void {
    this.startTime = Date.now();
    this.metrics.clear();
  }
}

// 导出默认的 Edge 适配器
export const edgeAdapter = {
  isEdgeRuntime,
  getEnvVar,
  getKVNamespace,
  timer: edgeTimer,
  createResponse: createEdgeResponse,
  createErrorResponse: createEdgeErrorResponse,
  asyncTask: EdgeAsyncTask,
  performance: new EdgePerformanceMonitor(),
  MemoryStore: EdgeMemoryStore,
};