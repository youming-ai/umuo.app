/**
 * 文件分块存储相关常量和工具函数
 */

// 分块大小设置为 5MB，这是 IndexedDB 的性能最佳实践
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// 需要分块存储的文件大小阈值
export const CHUNK_THRESHOLD = 50 * 1024 * 1024; // 50MB

// 最大文件大小限制
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// 存储空间管理设置
export const STORAGE_LIMIT = 500 * 1024 * 1024; // 500MB 总存储限制
export const CLEANUP_THRESHOLD = 0.9; // 当使用率达到90%时触发清理

/**
 * 文件分块信息接口
 */
export interface FileChunkInfo {
  fileId: number;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  offset: number;
  data: Blob;
  createdAt: Date;
}

/**
 * 文件元数据接口（用于分块存储）
 */
export interface FileMetadata {
  id?: number;
  name: string;
  size: number;
  type: string;
  isChunked: boolean;
  chunkSize?: number;
  totalChunks?: number;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 计算文件需要的分块数量
 */
export function calculateChunkCount(fileSize: number): number {
  return Math.ceil(fileSize / CHUNK_SIZE);
}

/**
 * 检查文件是否需要分块存储
 */
export function needsChunking(fileSize: number): boolean {
  return fileSize >= CHUNK_THRESHOLD;
}

/**
 * 检查文件大小是否超过限制
 */
export function validateFileSize(fileSize: number): { isValid: boolean; error?: string } {
  if (fileSize === 0) {
    return { isValid: false, error: "文件为空" };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return { isValid: false, error: `文件大小超过限制 (${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }

  return { isValid: true };
}

/**
 * 将文件分割为分块
 */
export function* createFileChunks(
  file: File,
  chunkSize: number = CHUNK_SIZE,
): Generator<{ index: number; data: Blob; offset: number }> {
  const fileSize = file.size;
  let offset = 0;
  let index = 0;

  while (offset < fileSize) {
    const end = Math.min(offset + chunkSize, fileSize);
    const chunk = file.slice(offset, end, file.type);

    yield {
      index,
      data: chunk,
      offset,
    };

    offset = end;
    index++;
  }
}

/**
 * 估算分块存储的进度
 */
export function calculateProgress(processedChunks: number, totalChunks: number): number {
  if (totalChunks === 0) return 0;
  return Math.min((processedChunks / totalChunks) * 100, 100);
}

/**
 * 格式化文件大小显示
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 存储空间管理工具类
 */
export class StorageManager {
  /**
   * 获取当前存储使用情况
   */
  static async getStorageUsage(): Promise<{
    totalSize: number;
    chunkedFiles: number;
    regularFiles: number;
    chunksCount: number;
    usagePercentage: number;
  }> {
    // 这里需要在实现中查询数据库获取实际使用情况
    // 暂时返回默认值，实现时会在 db.ts 中补充
    return {
      totalSize: 0,
      chunkedFiles: 0,
      regularFiles: 0,
      chunksCount: 0,
      usagePercentage: 0,
    };
  }

  /**
   * 检查是否需要清理存储空间
   */
  static async needsCleanup(): Promise<boolean> {
    const usage = await StorageManager.getStorageUsage();
    return usage.usagePercentage >= CLEANUP_THRESHOLD;
  }

  /**
   * 获取可清理的文件列表（按访问时间排序）
   */
  static async getCleanupCandidates(): Promise<number[]> {
    // 这里需要在实现中查询数据库获取待清理文件
    // 暂时返回空数组，实现时会在 db.ts 中补充
    return [];
  }
}
