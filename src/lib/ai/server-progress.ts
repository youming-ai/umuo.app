// 服务器端进度存储 - Cloudflare Workers 兼容版本
// 使用 Cloudflare KV 替代内存存储，支持持久化和自动过期

// 导入类型定义，保持向后兼容
export type ServerProgress = {
  fileId: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  updatedAt: number;
};

// 检测运行环境
const isEdgeRuntime = typeof globalThis !== 'undefined' &&
                     (globalThis as any).EdgeRuntime !== undefined;

// 内存存储 - 仅用于非 Edge 环境或作为降级方案
const fallbackStore = new Map<number, ServerProgress>();

/**
 * 设置进度数据
 * 在 Edge Runtime 中使用 KV 存储，否则使用内存存储
 */
export async function setServerProgress(fileId: number, progress: Partial<ServerProgress>): Promise<void> {
  if (isEdgeRuntime) {
    try {
      // 在 Edge Runtime 中使用 KV 存储
      const { setServerProgress: kvSetProgress } = await import('../cloudflare/kv-progress-store');
      await kvSetProgress(fileId, progress);
      return;
    } catch (error) {
      console.warn('KV storage not available, falling back to memory storage:', error);
      // 降级到内存存储
    }
  }

  // 内存存储逻辑（非 Edge 环境或降级方案）
  const existing = fallbackStore.get(fileId) || {
    fileId,
    status: "pending" as const,
    progress: 0,
    message: "Pending",
    updatedAt: Date.now(),
  };

  const updated = {
    ...existing,
    ...progress,
    updatedAt: Date.now(),
  };

  fallbackStore.set(fileId, updated);

  // 仅在非 Edge 环境中使用 setTimeout 进行清理
  if (!isEdgeRuntime) {
    setTimeout(
      () => {
        if (fallbackStore.get(fileId)?.updatedAt === updated.updatedAt) {
          fallbackStore.delete(fileId);
        }
      },
      30 * 60 * 1000, // 30分钟
    );
  }
}

/**
 * 获取进度数据
 */
export async function getServerProgress(fileId: number): Promise<ServerProgress | undefined> {
  if (isEdgeRuntime) {
    try {
      // 在 Edge Runtime 中使用 KV 存储
      const { getServerProgress: kvGetProgress } = await import('../cloudflare/kv-progress-store');
      return await kvGetProgress(fileId);
    } catch (error) {
      console.warn('KV storage not available, falling back to memory storage:', error);
      // 降级到内存存储
    }
  }

  // 内存存储逻辑
  return fallbackStore.get(fileId);
}

/**
 * 获取所有进度数据
 */
export async function getAllServerProgress(): Promise<ServerProgress[]> {
  if (isEdgeRuntime) {
    try {
      // 在 Edge Runtime 中使用 KV 存储
      const { getAllServerProgress: kvGetAllProgress } = await import('../cloudflare/kv-progress-store');
      return await kvGetAllProgress();
    } catch (error) {
      console.warn('KV storage not available, falling back to memory storage:', error);
      // 降级到内存存储
    }
  }

  // 内存存储逻辑
  return Array.from(fallbackStore.values());
}

/**
 * 清除进度数据
 */
export async function clearServerProgress(fileId: number): Promise<void> {
  if (isEdgeRuntime) {
    try {
      // 在 Edge Runtime 中使用 KV 存储
      const { clearServerProgress: kvClearProgress } = await import('../cloudflare/kv-progress-store');
      await kvClearProgress(fileId);
      return;
    } catch (error) {
      console.warn('KV storage not available, falling back to memory storage:', error);
      // 降级到内存存储
    }
  }

  // 内存存储逻辑
  fallbackStore.delete(fileId);
}

// 向后兼容：提供同步版本（仅用于内存存储）
/**
 * @deprecated 使用异步版本 setServerProgress
 */
export function setServerProgressSync(fileId: number, progress: Partial<ServerProgress>): void {
  if (isEdgeRuntime) {
    console.warn('setServerProgressSync is deprecated in Edge Runtime. Use async setServerProgress instead.');
    return;
  }

  const existing = fallbackStore.get(fileId) || {
    fileId,
    status: "pending" as const,
    progress: 0,
    message: "Pending",
    updatedAt: Date.now(),
  };

  const updated = {
    ...existing,
    ...progress,
    updatedAt: Date.now(),
  };

  fallbackStore.set(fileId, updated);

  setTimeout(
    () => {
      if (fallbackStore.get(fileId)?.updatedAt === updated.updatedAt) {
        fallbackStore.delete(fileId);
      }
    },
    30 * 60 * 1000,
  );
}

/**
 * @deprecated 使用异步版本 getServerProgress
 */
export function getServerProgressSync(fileId: number): ServerProgress | undefined {
  if (isEdgeRuntime) {
    console.warn('getServerProgressSync is deprecated in Edge Runtime. Use async getServerProgress instead.');
    return undefined;
  }

  return fallbackStore.get(fileId);
}

/**
 * @deprecated 使用异步版本 getAllServerProgress
 */
export function getAllServerProgressSync(): ServerProgress[] {
  if (isEdgeRuntime) {
    console.warn('getAllServerProgressSync is deprecated in Edge Runtime. Use async getAllServerProgress instead.');
    return [];
  }

  return Array.from(fallbackStore.values());
}
