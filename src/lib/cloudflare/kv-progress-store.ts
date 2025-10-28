/**
 * Cloudflare KV 进度存储适配器
 * 替换内存存储，支持持久化进度跟踪
 */

import type { KVNamespace } from "@/types/cloudflare";

// 进度数据类型定义
export interface ServerProgress {
  fileId: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  updatedAt: number;
}

// KV 存储键前缀
const PROGRESS_KEY_PREFIX = "progress:";
const CACHE_TTL = 1800; // 30分钟过期

/**
 * KV 进度存储实现
 * 在 Cloudflare Workers 环境中替代内存存储
 */
export class KVProgressStore {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * 设置进度数据
   */
  async setProgress(fileId: number, progress: Partial<ServerProgress>): Promise<void> {
    const key = this.getProgressKey(fileId);

    try {
      // 获取现有数据
      const existing = await this.getProgress(fileId);

      // 合并数据
      const updated: ServerProgress = {
        fileId,
        status: "pending",
        progress: 0,
        message: "Pending",
        updatedAt: Date.now(),
        ...existing,
        ...progress,
      };

      // 存储到 KV，带 TTL 自动过期
      await this.kv.put(key, JSON.stringify(updated), {
        expirationTtl: CACHE_TTL,
      });

      console.log(`Progress stored for file ${fileId}:`, {
        status: updated.status,
        progress: updated.progress,
        message: updated.message,
      });
    } catch (error) {
      console.error(`Failed to store progress for file ${fileId}:`, error);
      throw new Error(
        `Progress storage failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * 获取进度数据
   */
  async getProgress(fileId: number): Promise<ServerProgress | undefined> {
    const key = this.getProgressKey(fileId);

    try {
      const data = await this.kv.get(key);
      if (!data) {
        return undefined;
      }

      const progress: ServerProgress = JSON.parse(data);
      return progress;
    } catch (error) {
      console.error(`Failed to get progress for file ${fileId}:`, error);
      return undefined;
    }
  }

  /**
   * 获取所有进度数据
   */
  async getAllProgress(): Promise<ServerProgress[]> {
    try {
      // 列出所有进度键
      const list = await this.kv.list({
        prefix: PROGRESS_KEY_PREFIX,
      });

      // 批量获取数据
      const progressPromises = list.keys.map(async (key: { name: string }) => {
        const data = await this.kv.get(key.name);
        if (!data) return null;

        try {
          return JSON.parse(data) as ServerProgress;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(progressPromises);
      return results.filter((progress): progress is ServerProgress => progress !== null);
    } catch (error) {
      console.error("Failed to get all progress:", error);
      return [];
    }
  }

  /**
   * 清除进度数据
   */
  async clearProgress(fileId: number): Promise<void> {
    const key = this.getProgressKey(fileId);

    try {
      await this.kv.delete(key);
      console.log(`Progress cleared for file ${fileId}`);
    } catch (error) {
      console.error(`Failed to clear progress for file ${fileId}:`, error);
      throw new Error(
        `Progress cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * 清除过期的进度数据
   */
  async cleanupExpiredProgress(): Promise<void> {
    try {
      const list = await this.kv.list({
        prefix: PROGRESS_KEY_PREFIX,
      });

      const now = Date.now();
      const expiredThreshold = 30 * 60 * 1000; // 30分钟

      for (const key of list.keys) {
        try {
          const data = await this.kv.get(key.name);
          if (!data) continue;

          const progress: ServerProgress = JSON.parse(data);
          if (now - progress.updatedAt > expiredThreshold) {
            await this.kv.delete(key.name);
            console.log(`Cleaned up expired progress for file ${progress.fileId}`);
          }
        } catch (_error) {
          // 如果数据损坏，直接删除
          await this.kv.delete(key.name);
          console.log(`Cleaned up corrupted progress data: ${key.name}`);
        }
      }
    } catch (error) {
      console.error("Failed to cleanup expired progress:", error);
    }
  }

  /**
   * 生成进度存储键
   */
  private getProgressKey(fileId: number): string {
    return `${PROGRESS_KEY_PREFIX}${fileId}`;
  }
}

/**
 * 全局进度存储实例
 * 在 Edge Runtime 中通过环境变量获取 KV namespace
 */
let progressStoreInstance: KVProgressStore | null = null;

export function getProgressStore(): KVProgressStore {
  if (!progressStoreInstance) {
    // 在 Cloudflare Workers 环境中，KV namespace 通过全局变量传递
    // 这里需要根据实际的部署配置调整
    const globalEnv = globalThis as any;

    if (!globalEnv.TRANSCRIPTION_PROGRESS) {
      throw new Error(
        "TRANSCRIPTION_PROGRESS KV namespace not available. Make sure wrangler.toml is configured correctly.",
      );
    }

    progressStoreInstance = new KVProgressStore(globalEnv.TRANSCRIPTION_PROGRESS);
  }

  return progressStoreInstance;
}

/**
 * 兼容性函数 - 替换原有的 server-progress.ts 函数
 */
export async function setServerProgress(
  fileId: number,
  progress: Partial<ServerProgress>,
): Promise<void> {
  const store = getProgressStore();
  await store.setProgress(fileId, progress);
}

export async function getServerProgress(fileId: number): Promise<ServerProgress | undefined> {
  const store = getProgressStore();
  return await store.getProgress(fileId);
}

export async function getAllServerProgress(): Promise<ServerProgress[]> {
  const store = getProgressStore();
  return await store.getAllProgress();
}

export async function clearServerProgress(fileId: number): Promise<void> {
  const store = getProgressStore();
  await store.clearProgress(fileId);
}

/**
 * 初始化函数 - 用于设置 KV namespace
 */
export function initializeProgressStore(kv: KVNamespace): void {
  progressStoreInstance = new KVProgressStore(kv);
}
