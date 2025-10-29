/**
 * 优化的事件管理器
 * 提供防抖、节流、批量事件发射等功能
 */

import { debounce, throttle } from "./performance-utils";

export interface EventListener<T = any> {
  callback: (data: T) => void;
  priority?: number;
  once?: boolean;
  id: string;
}

export interface EventEmitterOptions {
  maxListeners?: number;
  debounceTime?: number;
  throttleTime?: number;
  batchEvents?: boolean;
  batchSize?: number;
  batchTimeout?: number;
}

export class OptimizedEventEmitter<T extends Record<string, any> = Record<string, any>> {
  private listeners = new Map<keyof T, Map<string, EventListener>>();
  private eventQueue: Array<{ type: keyof T; data: T[keyof T] }> = [];
  private options: Required<EventEmitterOptions>;
  private batchTimer?: NodeJS.Timeout;
  private eventCounts = new Map<keyof T, number>();

  constructor(options: EventEmitterOptions = {}) {
    this.options = {
      maxListeners: options.maxListeners || 100,
      debounceTime: options.debounceTime || 100,
      throttleTime: options.throttleTime || 16,
      batchEvents: options.batchEvents || false,
      batchSize: options.batchSize || 10,
      batchTimeout: options.batchTimeout || 50,
    };

    // 创建防抖和节流的事件发射函数
    this.debouncedEmit = debounce(this.emitImmediate.bind(this), this.options.debounceTime);
    this.throttledEmit = throttle(this.emitImmediate.bind(this), this.options.throttleTime);
  }

  // 添加事件监听器
  on<K extends keyof T>(
    event: K,
    callback: (data: T[K]) => void,
    options: { priority?: number; once?: boolean } = {},
  ): string {
    const id = `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Map());
    }

    const eventListeners = this.listeners.get(event)!;

    // 检查监听器数量限制
    if (eventListeners.size >= this.options.maxListeners) {
      console.warn(`事件 ${String(event)} 的监听器数量已达到最大限制 ${this.options.maxListeners}`);
    }

    eventListeners.set(id, {
      callback,
      priority: options.priority || 0,
      once: options.once || false,
      id,
    });

    // 返回监听器ID
    return id;
  }

  // 添加事件监听器并返回清理函数
  onWithCleanup<K extends keyof T>(
    event: K,
    callback: (data: T[K]) => void,
    options: { priority?: number; once?: boolean } = {},
  ): () => void {
    const id = this.on(event, callback, options);
    return () => this.off(event, id);
  }

  // 移除事件监听器
  off<K extends keyof T>(event: K, idOrCallback: string | ((data: T[K]) => void)): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    if (typeof idOrCallback === "string") {
      eventListeners.delete(idOrCallback);
    } else {
      // 通过回调函数查找并删除
      for (const [id, listener] of eventListeners) {
        if (listener.callback === idOrCallback) {
          eventListeners.delete(id);
          break;
        }
      }
    }

    // 如果没有监听器了，删除事件
    if (eventListeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  // 移除所有监听器
  removeAllListeners<K extends keyof T>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  // 立即发射事件
  private emitImmediate<K extends keyof T>(event: K, data: T[K]): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    // 按优先级排序监听器
    const sortedListeners = Array.from(eventListeners.values()).sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );

    const toRemove: string[] = [];

    for (const listener of sortedListeners) {
      try {
        listener.callback(data);

        // 如果是一次性监听器，标记为需要删除
        if (listener.once) {
          toRemove.push(listener.id);
        }
      } catch (error) {
        console.error(`事件监听器执行错误 (${String(event)}):`, error);
      }
    }

    // 删除一次性监听器
    for (const id of toRemove) {
      eventListeners.delete(id);
    }

    // 更新事件计数
    const count = this.eventCounts.get(event) || 0;
    this.eventCounts.set(event, count + 1);
  }

  // 普通事件发射
  emit<K extends keyof T>(event: K, data: T[K]): void {
    // 根据事件类型选择发射策略
    if (this.shouldDebounce(event)) {
      this.debouncedEmit(event, data);
    } else if (this.shouldThrottle(event)) {
      this.throttledEmit(event, data);
    } else if (this.options.batchEvents) {
      this.addToBatch(event, data);
    } else {
      this.emitImmediate(event, data);
    }
  }

  // 防抖事件发射
  emitDebounced<K extends keyof T>(event: K, data: T[K]): void {
    this.debouncedEmit(event, data);
  }

  // 节流事件发射
  emitThrottled<K extends keyof T>(event: K, data: T[K]): void {
    this.throttledEmit(event, data);
  }

  // 批量事件处理
  private addToBatch<K extends keyof T>(event: K, data: T[K]): void {
    this.eventQueue.push({ type: event, data });

    // 如果队列达到批量大小或设置超时
    if (this.eventQueue.length >= this.options.batchSize) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.options.batchTimeout);
    }
  }

  // 立即刷新批量队列
  flushBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.eventQueue.length === 0) return;

    // 按事件类型分组
    const eventGroups = new Map<keyof T, T[keyof T][]>();

    for (const { type, data } of this.eventQueue) {
      if (!eventGroups.has(type)) {
        eventGroups.set(type, []);
      }
      eventGroups.get(type)!.push(data);
    }

    // 批量发射事件
    for (const [event, dataList] of eventGroups) {
      // 如果数据列表只有一个元素，直接发射
      if (dataList.length === 1) {
        this.emitImmediate(event, dataList[0]);
      } else {
        // 对于多个数据，可以选择合并或依次发射
        // 这里选择依次发射以保持事件粒度
        for (const data of dataList) {
          this.emitImmediate(event, data);
        }
      }
    }

    // 清空队列
    this.eventQueue.length = 0;
  }

  // 判断是否应该使用防抖
  private shouldDebounce<K extends keyof T>(event: K): boolean {
    // 对于高频更新事件（如进度更新），使用防抖
    const highFrequencyEvents = ["progress", "update", "change"] as string[];
    return highFrequencyEvents.includes(String(event));
  }

  // 判断是否应该使用节流
  private shouldThrottle<K extends keyof T>(event: K): boolean {
    // 对于需要实时性但又要控制频率的事件，使用节流
    const realTimeEvents = ["scroll", "resize", "mousemove"] as string[];
    return realTimeEvents.includes(String(event));
  }

  // 获取事件统计
  getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [event, count] of this.eventCounts) {
      stats[String(event)] = count;
    }
    return stats;
  }

  // 获取监听器统计
  getListenerStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [event, listeners] of this.listeners) {
      stats[String(event)] = listeners.size;
    }
    return stats;
  }

  // 清理资源
  dispose(): void {
    this.flushBatch();
    this.removeAllListeners();
    this.eventCounts.clear();

    // 重置防抖和节流函数
    if (
      this.debouncedEmit &&
      typeof this.debouncedEmit === "object" &&
      "cancel" in this.debouncedEmit
    ) {
      (this.debouncedEmit as any).cancel();
    }
    if (
      this.throttledEmit &&
      typeof this.throttledEmit === "object" &&
      "cancel" in this.throttledEmit
    ) {
      (this.throttledEmit as any).cancel();
    }
  }

  // 私有方法声明
  private debouncedEmit: <K extends keyof T>(event: K, data: T[K]) => void;
  private throttledEmit: <K extends keyof T>(event: K, data: T[K]) => void;
}

// 类型安全的事件发射器工厂
export function createEventEmitter<T extends Record<string, any>>(
  options?: EventEmitterOptions,
): OptimizedEventEmitter<T> {
  return new OptimizedEventEmitter<T>(options);
}

// 针对转录系统的专用事件管理器
export interface TranscriptionEvents {
  "task:added": { taskId: string; task: any };
  "task:started": { taskId: string };
  "task:progress": { taskId: string; progress: number; message?: string };
  "task:completed": { taskId: string; result: any };
  "task:failed": { taskId: string; error: Error };
  "task:cancelled": { taskId: string };
  "queue:updated": { queueState: any };
  "system:cleanup": { reason: string };
}

export class TranscriptionEventManager extends OptimizedEventEmitter<TranscriptionEvents> {
  constructor() {
    super({
      maxListeners: 50,
      debounceTime: 100,
      throttleTime: 16,
      batchEvents: true,
      batchSize: 5,
      batchTimeout: 50,
    });
  }

  // 转录专用方法
  emitTaskProgress(taskId: string, progress: number, message?: string): void {
    this.emit("task:progress", { taskId, progress, message });
  }

  emitTaskAdded(taskId: string, task: any): void {
    this.emit("task:added", { taskId, task });
  }

  emitTaskCompleted(taskId: string, result: any): void {
    this.emit("task:completed", { taskId, result });
  }

  emitTaskFailed(taskId: string, error: Error): void {
    this.emit("task:failed", { taskId, error });
  }

  // 高频事件的防抖发射
  emitDebouncedProgress(taskId: string, progress: number, message?: string): void {
    this.emitDebounced("task:progress", { taskId, progress, message });
  }

  // 获取转录事件统计
  getTranscriptionStats(): {
    events: Record<string, number>;
    listeners: Record<string, number>;
  } {
    return {
      events: this.getEventStats(),
      listeners: this.getListenerStats(),
    };
  }
}

// 导出单例实例
export const transcriptionEventManager = new TranscriptionEventManager();
