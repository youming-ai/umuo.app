/**
 * Repository 接口定义
 * 提供数据访问的统一接口，支持 CRUD 操作和高级查询
 */

import type { FileRow, TranscriptRow, Segment } from "@/types/db/database";

// 基础查询选项
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: "asc" | "desc" };
  filters?: Record<string, any>;
  skipCache?: boolean;
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 批量操作选项
export interface BatchOptions {
  chunkSize?: number;
  onProgress?: (completed: number, total: number) => void;
  continueOnError?: boolean;
}

// 事务选项
export interface TransactionOptions {
  timeout?: number;
  retryOnConflict?: boolean;
  onProgress?: (step: string, progress: number) => void;
}

// Repository 基础接口
export interface IRepository<T> {
  // 基础 CRUD 操作
  create(data: Partial<T>, options?: QueryOptions): Promise<T>;
  findById(id: number, options?: QueryOptions): Promise<T | null>;
  update(id: number, data: Partial<T>, options?: QueryOptions): Promise<T>;
  delete(id: number, options?: QueryOptions): Promise<boolean>;

  // 批量操作
  createMany(data: Partial<T>[]): Promise<T[]>;
  updateMany(updates: Array<{ id: number; data: Partial<T> }>): Promise<T[]>;
  deleteMany(ids: number[]): Promise<number>;

  // 查询操作
  find(options?: QueryOptions): Promise<T[]>;
  findOne(options?: QueryOptions): Promise<T | null>;
  count(options?: QueryOptions): Promise<number>;
  exists(id: number, options?: QueryOptions): Promise<boolean>;

  // 高级查询
  findWhere(predicate: (item: T) => boolean, options?: QueryOptions): Promise<T[]>;
  search(searchTerm: string, fields: string[], options?: QueryOptions): Promise<T[]>;

  // 分页查询
  findPaginated(page: number, limit: number, options?: QueryOptions): Promise<PaginatedResult<T>>;

  // 事务支持
  transaction<T>(
    operation: (repo: IRepository<T>) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;

  // 缓存管理
  clearCache(): void;
  warmCache(options?: QueryOptions): Promise<void>;

  // 健康检查
  healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    message: string;
    metrics?: any;
  }>;
}

// 文件 Repository 接口
export interface IFileRepository extends IRepository<FileRow> {
  // 特定于文件的方法
  findBySize(minSize?: number, maxSize?: number): Promise<FileRow[]>;
  findByType(type: string): Promise<FileRow[]>;
  findByStatus(status: string): Promise<FileRow[]>;
  findRecent(limit?: number): Promise<FileRow[]>;
  findByNamePattern(pattern: string): Promise<FileRow[]>;

  // 统计方法
  getTotalSize(): Promise<number>;
  getAverageProcessingTime(): Promise<number>;
  getSuccessRate(): Promise<number>;

  // 文件管理
  cleanupOldFiles(daysOld: number): Promise<number>;
  getStorageUsage(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageSize: number;
  }>;
}

// 转录 Repository 接口
export interface ITranscriptRepository extends IRepository<TranscriptRow> {
  // 特定于转录的方法
  findByFileId(fileId: number): Promise<TranscriptRow | null>;
  findByStatus(status: string): Promise<TranscriptRow[]>;
  findByLanguage(language: string): Promise<TranscriptRow[]>;
  findCompleted(limit?: number): Promise<TranscriptRow[]>;

  // 统计方法
  getAverageDuration(): Promise<number>;
  getLanguageDistribution(): Promise<Record<string, number>>;
  getCompletionRate(): Promise<number>;

  // 关联查询
  findWithSegments(transcriptId: number): Promise<{
    transcript: TranscriptRow;
    segments: Segment[];
  } | null>;

  findManyWithSegments(transcriptIds: number[]): Promise<
    Array<{
      transcript: TranscriptRow;
      segments: Segment[];
    }>
  >;

  // 转录管理
  updateProgress(transcriptId: number, progress: number, status?: string): Promise<void>;
  markAsCompleted(transcriptId: number, result: any): Promise<void>;
  markAsFailed(transcriptId: number, error: string): Promise<void>;
}

// 字幕段 Repository 接口
export interface ISegmentRepository extends IRepository<Segment> {
  // 特定于字幕段的方法
  findByTranscriptId(transcriptId: number): Promise<Segment[]>;
  findByTimeRange(transcriptId: number, startTime: number, endTime: number): Promise<Segment[]>;
  findByText(text: string): Promise<Segment[]>;

  // 统计方法
  getAverageDuration(): Promise<number>;
  getSegmentCount(transcriptId: number): Promise<number>;

  // 字幕段管理
  updateTranslation(segmentId: number, translation: string): Promise<void>;
  updateNormalizedText(segmentId: number, normalizedText: string): Promise<void>;
  batchUpdateByTranscriptId(transcriptId: number, updates: Partial<Segment>[]): Promise<number>;

  // 搜索和过滤
  searchByKeyword(transcriptId: number, keywords: string[]): Promise<Segment[]>;
  filterByConfidence(transcriptId: number, minConfidence: number): Promise<Segment[]>;

  // 高级操作
  optimizeForPlayback(transcriptId: number): Promise<Segment[]>;
  exportToSRT(transcriptId: number): Promise<string>;
  exportToVTT(transcriptId: number): Promise<string>;
}

// 批量操作接口
export interface IBatchRepository<T> extends IRepository<T> {
  // 批量创建优化
  createBatch(
    data: Partial<T>[],
    options?: BatchOptions,
  ): Promise<{
    results: T[];
    errors: Array<{ data: Partial<T>; error: Error }>;
    processed: number;
    failed: number;
  }>;

  // 批量更新优化
  updateBatch(
    updates: Array<{ id: number; data: Partial<T> }>,
    options?: BatchOptions,
  ): Promise<{
    results: T[];
    errors: Array<{ id: number; error: Error }>;
    processed: number;
    failed: number;
  }>;

  // 批量删除优化
  deleteBatch(
    ids: number[],
    options?: BatchOptions,
  ): Promise<{
    processed: number;
    failed: number;
    errors: Array<{ id: number; error: Error }>;
  }>;
}

// 事务管理器接口
export interface ITransactionManager {
  beginTransaction<T>(
    isolationLevel?: "read_committed" | "serializable" | "repeatable_read",
  ): Promise<ITransaction<T>>;

  commitTransaction<T>(transaction: ITransaction<T>): Promise<void>;
  rollbackTransaction<T>(transaction: ITransaction<T>): Promise<void>;
}

// 事务接口
export interface ITransaction<T> {
  getRepository<R>(repository: R): R;
  add<R>(repository: R, action: (repo: R) => Promise<R>): Promise<R>;
  execute<R>(action: (repositories: any) => Promise<R>): Promise<R>;
}

// 性能监控接口
export interface IRepositoryMetrics {
  operationName: string;
  duration: number;
  operationType: "read" | "write" | "query";
  recordCount?: number;
  cacheHit?: boolean;
  error?: Error;
}

export interface IPerformanceMonitor {
  startOperation(operationName: string, operationType: "read" | "write" | "query"): string;
  endOperation(operationId: string, metrics?: Partial<IRepositoryMetrics>): void;
  recordMetric(metric: IRepositoryMetrics): void;
  getMetrics(): IRepositoryMetrics[];
  clearMetrics(): void;
}
