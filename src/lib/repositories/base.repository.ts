import type {
  IRepository,
  QueryOptions,
  PaginatedResult,
} from "./interfaces/repository.interface";
import { SimplePerformanceService } from "@/lib/monitoring/simple-performance.service";

/**
 * 基础抽象Repository实现
 * 提供通用的CRUD操作和缓存逻辑
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  protected performanceService: SimplePerformanceService;
  protected cache: Map<string, { data: T; timestamp: number }>;
  protected readonly cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  constructor(
    protected readonly entityName: string,
    performanceService?: SimplePerformanceService,
  ) {
    this.performanceService =
      performanceService || new SimplePerformanceService();
    this.cache = new Map();
  }

  abstract create(data: Partial<T>, options?: QueryOptions): Promise<T>;
  abstract findById(id: number, options?: QueryOptions): Promise<T | null>;
  abstract findAll(options?: QueryOptions): Promise<T[]>;
  abstract update(
    id: number,
    data: Partial<T>,
    options?: QueryOptions,
  ): Promise<T>;
  abstract delete(id: number, options?: QueryOptions): Promise<boolean>;
  abstract count(options?: QueryOptions): Promise<number>;

  // 批量操作的默认实现
  async createMany(data: Partial<T>[]): Promise<T[]> {
    const operation = `createMany-${this.entityName}`;
    const endTimer = this.performanceService.startTimer(operation, {
      repository: this.entityName,
      operation: "createMany",
      count: data.length,
    });

    try {
      const results: T[] = [];
      for (const item of data) {
        const result = await this.create(item);
        results.push(result);
      }
      return results;
    } finally {
      endTimer();
    }
  }

  async updateMany(
    updates: Array<{ id: number; data: Partial<T> }>,
  ): Promise<T[]> {
    const operation = `updateMany-${this.entityName}`;
    const endTimer = this.performanceService.startTimer(operation, {
      repository: this.entityName,
      operation: "updateMany",
      count: updates.length,
    });

    try {
      const results: T[] = [];
      for (const { id, data } of updates) {
        const result = await this.update(id, data);
        results.push(result);
      }
      return results;
    } finally {
      endTimer();
    }
  }

  async deleteMany(ids: number[]): Promise<number> {
    const operation = `deleteMany-${this.entityName}`;
    const endTimer = this.performanceService.startTimer(operation, {
      repository: this.entityName,
      operation: "deleteMany",
      count: ids.length,
    });

    try {
      let deletedCount = 0;
      for (const id of ids) {
        const deleted = await this.delete(id);
        if (deleted) deletedCount++;
      }
      return deletedCount;
    } finally {
      endTimer();
    }
  }

  // 查询操作的默认实现
  async find(options?: QueryOptions): Promise<T[]> {
    return this.findAll(options);
  }

  async findOne(options?: QueryOptions): Promise<T | null> {
    const results = await this.findAll({ ...options, limit: 1 });
    return results[0] || null;
  }

  // 高级查询的默认实现
  async findWhere(
    predicate: (item: T) => boolean,
    options?: QueryOptions,
  ): Promise<T[]> {
    const operation = `findWhere-${this.entityName}`;
    const endTimer = this.performanceService.startTimer(operation, {
      repository: this.entityName,
      operation: "findWhere",
    });

    try {
      const all = await this.findAll(options);
      return all.filter(predicate);
    } finally {
      endTimer();
    }
  }

  async search(
    searchTerm: string,
    fields: string[],
    options?: QueryOptions,
  ): Promise<T[]> {
    const operation = `search-${this.entityName}`;
    const endTimer = this.performanceService.startTimer(operation, {
      repository: this.entityName,
      operation: "search",
      searchTerm,
      fields,
    });

    try {
      const all = await this.findAll(options);
      return all.filter((item) =>
        fields.some((field) => {
          const value = (item as any)[field];
          return (
            value &&
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          );
        }),
      );
    } finally {
      endTimer();
    }
  }

  // 分页查询的默认实现
  async findPaginated(
    page: number,
    limit: number,
    options?: QueryOptions,
  ): Promise<PaginatedResult<T>> {
    const operation = `findPaginated-${this.entityName}`;
    const endTimer = this.performanceService.startTimer(operation, {
      repository: this.entityName,
      operation: "findPaginated",
      page,
      limit,
    });

    try {
      const offset = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.findAll({ ...options, limit, offset }),
        this.count(options),
      ]);

      return {
        data,
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    } finally {
      endTimer();
    }
  }

  // 事务支持的默认实现（简化版）
  async transaction<T>(
    operation: (repo: IRepository<T>) => Promise<T>,
  ): Promise<T> {
    return operation(this as unknown as IRepository<T>);
  }

  // 缓存预热
  async warmCache(options?: QueryOptions): Promise<void> {
    await this.findAll(options);
  }

  // 健康检查的默认实现
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    message: string;
    metrics?: any;
  }> {
    const operation = `healthCheck-${this.entityName}`;
    const endTimer = this.performanceService.startTimer(operation, {
      repository: this.entityName,
      operation: "healthCheck",
    });

    try {
      const count = await this.count();
      return {
        status: "healthy",
        message: `Repository is operational with ${count} records`,
        metrics: { recordCount: count },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      endTimer();
    }
  }

  async findMany(criteria: Partial<T>, options?: QueryOptions): Promise<T[]> {
    const operation = `findMany-${this.entityName}`;
    const endTimer = this.performanceService.startTimer(operation, {
      repository: this.entityName,
      operation: "findMany",
    });

    try {
      const all = await this.findAll(options);
      const filtered = this.filterByCriteria(all, criteria);

      if (options?.limit) {
        const start = options.offset || 0;
        return filtered.slice(start, start + options.limit);
      }

      return filtered;
    } catch (error) {
      this.performanceService.recordError(
        "repository",
        `findMany-${this.entityName}`,
        error,
      );
      throw error;
    } finally {
      const duration = endTimer();
      this.performanceService.recordMetric("repository_operation", duration, {
        repository: this.entityName,
        operation: "findMany",
        result_count: (await this.findMany(criteria, options)).length,
      });
    }
  }

  async exists(id: number, options?: QueryOptions): Promise<boolean> {
    const operation = `exists-${this.entityName}`;
    const endTimer = this.performanceService.startTimer(operation, {
      repository: this.entityName,
      operation: "exists",
    });

    try {
      const entity = await this.findById(id, options);
      return entity !== null;
    } catch (error) {
      this.performanceService.recordError(
        "repository",
        `exists-${this.entityName}`,
        error,
      );
      throw error;
    } finally {
      const duration = endTimer();
      this.performanceService.recordMetric("repository_operation", duration, {
        repository: this.entityName,
        operation: "exists",
      });
    }
  }

  protected getCacheKey(id: number, operation?: string): string {
    return `${this.entityName}:${id}${operation ? `:${operation}` : ""}`;
  }

  protected getFromCache(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  protected setCache(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  public clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  protected filterByCriteria(entities: T[], criteria: Partial<T>): T[] {
    if (!criteria || Object.keys(criteria).length === 0) {
      return entities;
    }

    return entities.filter((entity) => {
      return Object.entries(criteria).every(([key, value]) => {
        const entityValue = (entity as any)[key];
        if (value === null || value === undefined) return true;
        if (Array.isArray(value)) return value.includes(entityValue);
        return entityValue === value;
      });
    });
  }

  protected createResult<TData>(
    data: TData,
    success = true,
    message?: string,
    metadata?: Record<string, unknown>,
  ): TData {
    return data;
  }

  protected handleError(error: unknown, operation: string): never {
    const message = error instanceof Error ? error.message : String(error);
    const enhancedError = new Error(
      `${this.entityName}.${operation}: ${message}`,
    );
    (enhancedError as any).cause = error;
    throw enhancedError;
  }

  protected validateId(id: number): void {
    if (id === null || id === undefined) {
      throw new Error(`${this.entityName}: number cannot be null or undefined`);
    }
  }

  protected validateData(data: Partial<T>): void {
    if (!data || Object.keys(data).length === 0) {
      throw new Error(`${this.entityName}: Data cannot be empty`);
    }
  }

  protected async executeWithMetrics<TData>(
    operation: string,
    fn: () => Promise<TData>,
    metadata?: Record<string, unknown>,
  ): Promise<TData> {
    const endTimer = this.performanceService.startTimer(
      `${this.entityName}.${operation}`,
      {
        repository: this.entityName,
        operation,
        ...metadata,
      },
    );

    try {
      const result = await fn();
      const duration = endTimer();

      this.performanceService.recordMetric("repository_operation", duration, {
        repository: this.entityName,
        operation,
        success: true,
        ...metadata,
      });

      return result;
    } catch (error) {
      this.performanceService.recordError(
        "repository",
        `${this.entityName}.${operation}`,
        error,
      );
      endTimer();
      throw error;
    }
  }

  /**
   * 批量操作辅助方法
   */
  protected async batchOperation<TData>(
    items: TData[],
    operation: (item: TData) => Promise<unknown>,
    batchSize = 10,
    delayMs = 50,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(operation));

      // 在批次之间添加小延迟，避免阻塞主线程
      if (i + batchSize < items.length && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * 清理过期缓存
   */
  protected cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; size: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, cached]) => ({
      key,
      age: now - cached.timestamp,
      size: JSON.stringify(cached.data).length,
    }));

    return {
      size: this.cache.size,
      hitRate: 0, // 需要实现命中率追踪
      entries,
    };
  }
}
