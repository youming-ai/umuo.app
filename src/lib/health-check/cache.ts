/**
 * 健康检查结果缓存
 * 提供检查结果的缓存机制，避免重复执行相同的检查
 */

import { HealthCheckResult, CheckCategory } from './types';

interface CacheEntry {
  result: HealthCheckResult;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  ttl?: number; // Cache time to live in milliseconds
  key?: string; // Custom cache key
}

export class HealthCheckCache {
  private static instance: HealthCheckCache;
  private cacheMap = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): HealthCheckCache {
    if (!HealthCheckCache.instance) {
      HealthCheckCache.instance = new HealthCheckCache();
    }
    return HealthCheckCache.instance;
  }

  /**
   * 生成缓存键
   */
  private generateKey(category: CheckCategory, config?: Record<string, unknown>): string {
    const configHash = config ? JSON.stringify(config) : '';
    return `${category}-${configHash}`;
  }

  /**
   * 获取缓存的结果
   */
  static get(category: CheckCategory, config?: Record<string, unknown>, options?: CacheOptions): HealthCheckResult | null {
    const cache = HealthCheckCache.getInstance();
    const key = options?.key || cache.generateKey(category, config);
    const entry = cache.cacheMap.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.timestamp + entry.ttl) {
      cache.cacheMap.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * 设置缓存结果
   */
  static set(
    category: CheckCategory,
    result: HealthCheckResult,
    config?: Record<string, unknown>,
    options?: CacheOptions
  ): void {
    const cache = HealthCheckCache.getInstance();
    const key = options?.key || cache.generateKey(category, config);
    const ttl = options?.ttl || cache.DEFAULT_TTL;

    cache.cacheMap.set(key, {
      result,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 删除缓存条目
   */
  static delete(category: CheckCategory, config?: Record<string, unknown>, options?: CacheOptions): boolean {
    const cache = HealthCheckCache.getInstance();
    const key = options?.key || cache.generateKey(category, config);
    return cache.cacheMap.delete(key);
  }

  /**
   * 清空所有缓存
   */
  static clear(): void {
    const cache = HealthCheckCache.getInstance();
    cache.cacheMap.clear();
  }

  /**
   * 获取缓存统计信息
   */
  static getStats(): {
    size: number;
    entries: Array<{
      key: string;
      category: CheckCategory;
      timestamp: number;
      ttl: number;
      remainingTtl: number;
    }>;
  } {
    const cache = HealthCheckCache.getInstance();
    const entries = Array.from(cache.cacheMap.entries()).map(([key, entry]) => {
      const [category] = key.split('-');
      const remainingTtl = Math.max(0, entry.ttl - (Date.now() - entry.timestamp));

      return {
        key,
        category: category as CheckCategory,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        remainingTtl,
      };
    });

    return {
      size: cache.cacheMap.size,
      entries,
    };
  }

  /**
   * 清理过期的缓存条目
   */
  static cleanup(): number {
    const cache = HealthCheckCache.getInstance();
    let cleanedCount = 0;

    for (const [key, entry] of cache.cacheMap.entries()) {
      if (Date.now() > entry.timestamp + entry.ttl) {
        cache.cacheMap.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}