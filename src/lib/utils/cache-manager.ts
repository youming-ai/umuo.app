/**
 * 智能缓存管理器
 * 优化TanStack Query的缓存失效策略，减少不必要的网络请求
 */

import { QueryClient } from "@tanstack/react-query";
import { fileStatusKeys } from "@/hooks/useFileStatus";
import { transcriptionKeys } from "@/hooks/api/useTranscription";
import { playerKeys } from "@/hooks/player/usePlayerDataQuery";

/**
 * 缓存失效策略枚举
 */
export enum CacheInvalidationStrategy {
  IMMEDIATE = "immediate",    // 立即失效
  DELAYED = "delayed",        // 延迟失效
  SELECTIVE = "selective",    // 选择性失效
  OPTIMISTIC = "optimistic",  // 乐观更新
}

/**
 * 缓存操作类型
 */
export interface CacheOperation {
  type: "invalidate" | "update" | "remove" | "prefetch";
  queryKey: any[];
  strategy: CacheInvalidationStrategy;
  delay?: number;
  data?: any;
}

/**
 * 智能缓存管理器
 */
export class SmartCacheManager {
  private queryClient: QueryClient;
  private pendingInvalidations: Map<string, NodeJS.Timeout> = new Map();
  private batchOperations: CacheOperation[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * 智能文件相关缓存失效
   * 根据操作类型选择最合适的失效策略
   */
  invalidateFileRelated(fileId: number, operation: "transcribe" | "update" | "delete"): void {
    const operations: CacheOperation[] = [];

    // 基于操作类型构建缓存失效策略
    switch (operation) {
      case "transcribe":
        operations.push(
          // 立即失效文件状态
          {
            type: "invalidate",
            queryKey: fileStatusKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.IMMEDIATE,
          },
          // 延迟失效转录状态（避免重复请求）
          {
            type: "invalidate",
            queryKey: transcriptionKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.DELAYED,
            delay: 1000,
          },
          // 选择性失效播放器数据
          {
            type: "invalidate",
            queryKey: playerKeys.file(fileId),
            strategy: CacheInvalidationStrategy.SELECTIVE,
          }
        );
        break;

      case "update":
        operations.push(
          // 乐观更新文件状态
          {
            type: "update",
            queryKey: fileStatusKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.OPTIMISTIC,
          },
          // 延迟失效播放器数据
          {
            type: "invalidate",
            queryKey: playerKeys.file(fileId),
            strategy: CacheInvalidationStrategy.DELAYED,
            delay: 500,
          }
        );
        break;

      case "delete":
        operations.push(
          // 立即移除所有相关缓存
          {
            type: "remove",
            queryKey: fileStatusKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.IMMEDIATE,
          },
          {
            type: "remove",
            queryKey: transcriptionKeys.forFile(fileId),
            strategy: CacheInvalidationStrategy.IMMEDIATE,
          },
          {
            type: "remove",
            queryKey: playerKeys.file(fileId),
            strategy: CacheInvalidationStrategy.IMMEDIATE,
          }
        );
        break;
    }

    // 批量执行操作
    this.batchExecuteOperations(operations);
  }

  /**
   * 批量失效多个文件的缓存
   * 优化大量文件状态变更时的性能
   */
  invalidateMultipleFiles(fileIds: number[], operation: "transcribe" | "update" | "delete"): void {
    if (fileIds.length === 0) return;

    console.log(`🔄 批量缓存失效: ${fileIds.length} files, 操作: ${operation}`);

    // 对于大量文件，使用全局列表失效而不是逐个失效
    if (fileIds.length > 10) {
      this.batchExecuteOperations([
        {
          type: "invalidate",
          queryKey: fileStatusKeys.all,
          strategy: CacheInvalidationStrategy.IMMEDIATE,
        },
        {
          type: "invalidate",
          queryKey: transcriptionKeys.all,
          strategy: CacheInvalidationStrategy.DELAYED,
          delay: 1500,
        },
      ]);
      return;
    }

    // 少量文件逐个处理
    fileIds.forEach(fileId => {
      this.invalidateFileRelated(fileId, operation);
    });
  }

  /**
   * 乐观更新缓存
   * 在等待服务器响应时立即更新UI
   */
  optimisticUpdate<T>(
    queryKey: any[],
    newData: T,
    rollbackData: T,
    promise: Promise<any>
  ): void {
    // 立即更新缓存
    this.queryClient.setQueryData(queryKey, newData);

    // 如果Promise失败，回滚数据
    promise.catch(() => {
      console.warn("乐观更新失败，回滚数据", queryKey);
      this.queryClient.setQueryData(queryKey, rollbackData);
    });
  }

  /**
   * 预取相关数据
   * 在用户可能需要数据之前提前加载
   */
  async prefetchRelatedData(fileId: number): Promise<void> {
    try {
      // 并行预取相关数据
      await Promise.all([
        this.queryClient.prefetchQuery({
          queryKey: fileStatusKeys.forFile(fileId),
          staleTime: 1000 * 60 * 2, // 2分钟
        }),
        this.queryClient.prefetchQuery({
          queryKey: transcriptionKeys.forFile(fileId),
          staleTime: 1000 * 60 * 5, // 5分钟
        }),
      ]);
    } catch (error) {
      console.warn("预取数据失败:", error);
    }
  }

  /**
   * 智能缓存清理
   * 基于使用模式清理过期或低价值的缓存
   */
  cleanupSmartCache(): void {
    const cache = this.queryClient.getQueryCache().getAll();
    const now = Date.now();

    // 清理超过1小时未访问的缓存
    const staleThreshold = 60 * 60 * 1000; // 1小时

    cache.forEach(query => {
      if (query.state.lastUpdated && (now - query.state.lastUpdated.getTime()) > staleThreshold) {
        this.queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });

    // 清理失败查询的缓存
    this.queryClient.removeQueries({
      predicate: (query) => query.state.status === 'error' &&
        (now - (query.state.lastUpdated?.getTime() || 0)) > 10 * 60 * 1000 // 10分钟前的错误
    });

    console.log("🧹 智能缓存清理完成");
  }

  /**
   * 批量执行缓存操作
   * 将多个操作合并执行，减少重复计算
   */
  private batchExecuteOperations(operations: CacheOperation[]): void {
    this.batchOperations.push(...operations);

    // 如果已有待处理的批次，延迟执行
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // 100ms后执行批次操作
    this.batchTimeout = setTimeout(() => {
      this.executeBatchOperations();
    }, 100);
  }

  /**
   * 执行批量缓存操作
   */
  private executeBatchOperations(): void {
    const operations = this.batchOperations.splice(0);

    // 按类型分组操作
    const groupedOperations = operations.reduce((groups, op) => {
      const key = `${op.type}-${op.strategy}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(op);
      return groups;
    }, {} as Record<string, CacheOperation[]>);

    // 执行分组操作
    Object.values(groupedOperations).forEach(group => {
      this.executeOperationGroup(group);
    });

    this.batchTimeout = null;
  }

  /**
   * 执行一组操作
   */
  private executeOperationGroup(operations: CacheOperation[]): void {
    operations.forEach(operation => {
      const { type, queryKey, strategy, delay = 0, data } = operation;

      switch (strategy) {
        case CacheInvalidationStrategy.IMMEDIATE:
          this.executeOperation(type, queryKey, data);
          break;

        case CacheInvalidationStrategy.DELAYED:
          this.scheduleDelayedOperation(type, queryKey, delay, data);
          break;

        case CacheInvalidationStrategy.SELECTIVE:
          this.executeSelectiveOperation(type, queryKey, data);
          break;

        case CacheInvalidationStrategy.OPTIMISTIC:
          if (data) {
            this.queryClient.setQueryData(queryKey, data);
          }
          break;
      }
    });
  }

  /**
   * 执行单个缓存操作
   */
  private executeOperation(type: string, queryKey: any[], data?: any): void {
    switch (type) {
      case "invalidate":
        this.queryClient.invalidateQueries({ queryKey });
        break;
      case "update":
        if (data) {
          this.queryClient.setQueryData(queryKey, data);
        }
        break;
      case "remove":
        this.queryClient.removeQueries({ queryKey });
        break;
      case "prefetch":
        // prefetch需要具体实现，这里暂时忽略
        break;
    }
  }

  /**
   * 调度延迟操作
   */
  private scheduleDelayedOperation(type: string, queryKey: any[], delay: number, data?: any): void {
    const key = JSON.stringify(queryKey);

    // 取消已有的延迟操作
    if (this.pendingInvalidations.has(key)) {
      clearTimeout(this.pendingInvalidations.get(key)!);
    }

    // 调度新的延迟操作
    const timeout = setTimeout(() => {
      this.executeOperation(type, queryKey, data);
      this.pendingInvalidations.delete(key);
    }, delay);

    this.pendingInvalidations.set(key, timeout);
  }

  /**
   * 执行选择性操作
   * 基于缓存状态决定是否执行操作
   */
  private executeSelectiveOperation(type: string, queryKey: any[], data?: any): void {
    const query = this.queryClient.getQueryCache().find({ queryKey });

    // 如果缓存是新鲜的，跳过失效
    if (query && !query.isStale()) {
      return;
    }

    this.executeOperation(type, queryKey, data);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    totalQueries: number;
    activeQueries: number;
    staleQueries: number;
    errorQueries: number;
  } {
    const cache = this.queryClient.getQueryCache().getAll();

    return {
      totalQueries: cache.length,
      activeQueries: cache.filter(q => q.state.fetchStatus === 'fetching').length,
      staleQueries: cache.filter(q => q.isStale()).length,
      errorQueries: cache.filter(q => q.state.status === 'error').length,
    };
  }

  /**
   * 清理所有延迟操作
   */
  destroy(): void {
    // 清理延迟操作
    this.pendingInvalidations.forEach(timeout => clearTimeout(timeout));
    this.pendingInvalidations.clear();

    // 清理批次操作
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    this.batchOperations = [];
  }
}

/**
 * 创建缓存管理器实例
 */
export function createCacheManager(queryClient: QueryClient): SmartCacheManager {
  return new SmartCacheManager(queryClient);
}

/**
 * 全局缓存管理器实例
 */
let globalCacheManager: SmartCacheManager | null = null;

/**
 * 获取全局缓存管理器
 */
export function getCacheManager(queryClient?: QueryClient): SmartCacheManager {
  if (!globalCacheManager && queryClient) {
    globalCacheManager = createCacheManager(queryClient);
  }

  if (!globalCacheManager) {
    throw new Error("Cache manager not initialized. Call getCacheManager(queryClient) first.");
  }

  return globalCacheManager;
}

/**
 * 定期清理缓存
 */
setInterval(() => {
  try {
    const manager = getCacheManager();
    manager.cleanupSmartCache();
  } catch (error) {
    // 忽略未初始化的错误
  }
}, 10 * 60 * 1000); // 每10分钟清理一次
