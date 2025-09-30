// 服务器端进度存储 - 使用内存存储（生产环境建议使用Redis等）
type ServerProgress = {
  fileId: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  updatedAt: number;
};

const progressStore = new Map<number, ServerProgress>();

export function setServerProgress(fileId: number, progress: Partial<ServerProgress>) {
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

export function getServerProgress(fileId: number): ServerProgress | undefined {
  return progressStore.get(fileId);
}

export function getAllServerProgress(): ServerProgress[] {
  return Array.from(progressStore.values());
}

export function clearServerProgress(fileId: number) {
  progressStore.delete(fileId);
}
