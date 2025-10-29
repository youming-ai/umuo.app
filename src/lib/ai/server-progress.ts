// 服务器端进度存储 - 内存存储版本
// 使用内存存储进行进度跟踪，适用于本地开发和Pages环境

export type ServerProgress = {
  fileId: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  updatedAt: number;
};

// 内存存储 - 适用于本地开发和Pages环境
const progressStore = new Map<number, ServerProgress>();

/**
 * 设置进度数据
 */
export async function setServerProgress(
  fileId: number,
  progress: Partial<ServerProgress>,
): Promise<void> {
  const existing = progressStore.get(fileId) || {
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

  progressStore.set(fileId, updated);

  // 30分钟后自动清理
  setTimeout(
    () => {
      if (progressStore.get(fileId)?.updatedAt === updated.updatedAt) {
        progressStore.delete(fileId);
      }
    },
    30 * 60 * 1000,
  );
}

/**
 * 获取进度数据
 */
export async function getServerProgress(fileId: number): Promise<ServerProgress | undefined> {
  return progressStore.get(fileId);
}

/**
 * 获取所有进度数据
 */
export async function getAllServerProgress(): Promise<ServerProgress[]> {
  return Array.from(progressStore.values());
}

/**
 * 清除进度数据
 */
export async function clearServerProgress(fileId: number): Promise<void> {
  progressStore.delete(fileId);
}

// 向后兼容：提供同步版本
export function setServerProgressSync(fileId: number, progress: Partial<ServerProgress>): void {
  setServerProgress(fileId, progress).catch(console.error);
}

export function getServerProgressSync(fileId: number): ServerProgress | undefined {
  return progressStore.get(fileId);
}

export function getAllServerProgressSync(): ServerProgress[] {
  return Array.from(progressStore.values());
}
