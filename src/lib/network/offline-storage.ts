/**
 * Offline Storage Implementation for Network Interruption Handling
 *
 * Provides IndexedDB-based storage for offline operations, sync queue management,
 * and local caching with automatic cleanup and quota management.
 */

import { SyncOperation, OfflineStorage } from "@/lib/errors/network-interruption";

// ============================================================================
// OFFLINE STORAGE IMPLEMENTATION
// ============================================================================

/**
 * IndexedDB-based offline storage implementation
 */
export class IndexedDBOfflineStorage implements OfflineStorage {
  private db: IDBDatabase | null = null;
  private readonly dbName = "umuo-offline-storage";
  private readonly dbVersion = 1;
  private readonly storeName = "sync-operations";

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open offline storage: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sync operations store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("priority", "priority", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("retryCount", "retryCount", { unique: false });
        }
      };
    });
  }

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error("Offline storage not initialized. Call initialize() first.");
    }
  }

  async addOperation(operation: SyncOperation): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(operation);

      request.onerror = () => {
        reject(new Error(`Failed to add operation: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getOperations(filter?: { type?: string; priority?: string }): Promise<SyncOperation[]> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);

      let request: IDBRequest;

      if (filter?.type) {
        const index = store.index("type");
        request = index.getAll(filter.type);
      } else if (filter?.priority) {
        const index = store.index("priority");
        request = index.getAll(filter.priority);
      } else {
        request = store.getAll();
      }

      request.onerror = () => {
        reject(new Error(`Failed to get operations: ${request.error}`));
      };

      request.onsuccess = () => {
        const operations = request.result.map((op: any) => ({
          ...op,
          createdAt: new Date(op.createdAt),
          lastAttempt: op.lastAttempt ? new Date(op.lastAttempt) : undefined,
        }));
        resolve(operations);
      };
    });
  }

  async removeOperation(id: string): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Failed to remove operation: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async updateOperation(id: string, updates: Partial<SyncOperation>): Promise<void> {
    this.ensureInitialized();

    // First get the existing operation
    const existing = await this.getOperationById(id);
    if (!existing) {
      throw new Error(`Operation with id ${id} not found`);
    }

    // Merge with updates
    const updated = { ...existing, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(updated);

      request.onerror = () => {
        reject(new Error(`Failed to update operation: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  private async getOperationById(id: string): Promise<SyncOperation | null> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error(`Failed to get operation: ${request.error}`));
      };

      request.onsuccess = () => {
        if (request.result) {
          const operation = {
            ...request.result,
            createdAt: new Date(request.result.createdAt),
            lastAttempt: request.result.lastAttempt
              ? new Date(request.result.lastAttempt)
              : undefined,
          };
          resolve(operation);
        } else {
          resolve(null);
        }
      };
    });
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear storage: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getStorageInfo(): Promise<{ used: number; available: number; quota: number }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
          quota: estimate.quota || 0,
        };
      } catch (error) {
        console.warn("Failed to get storage estimate:", error);
      }
    }

    // Fallback - return default values
    return {
      used: 0,
      available: 100 * 1024 * 1024, // 100MB default
      quota: 100 * 1024 * 1024,
    };
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    this.ensureInitialized();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("createdAt");
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffDate));

      let deletedCount = 0;

      request.onerror = () => {
        reject(new Error(`Failed to cleanup storage: ${request.error}`));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
    });
  }

  async getOperationStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    averageRetries: number;
    oldestOperation?: Date;
    newestOperation?: Date;
  }> {
    this.ensureInitialized();

    const operations = await this.getOperations();

    const stats = {
      total: operations.length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      averageRetries: 0,
      oldestOperation: undefined as Date | undefined,
      newestOperation: undefined as Date | undefined,
    };

    if (operations.length === 0) {
      return stats;
    }

    let totalRetries = 0;
    let oldestTime = Date.now();
    let newestTime = 0;

    operations.forEach(op => {
      // Count by type
      stats.byType[op.type] = (stats.byType[op.type] || 0) + 1;

      // Count by priority
      stats.byPriority[op.priority] = (stats.byPriority[op.priority] || 0) + 1;

      // Sum retries
      totalRetries += op.retryCount;

      // Track dates
      const opTime = op.createdAt.getTime();
      oldestTime = Math.min(oldestTime, opTime);
      newestTime = Math.max(newestTime, opTime);
    });

    stats.averageRetries = totalRetries / operations.length;
    stats.oldestOperation = new Date(oldestTime);
    stats.newestOperation = new Date(newestTime);

    return stats;
  }

  destroy(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ============================================================================
// STORAGE MANAGER
// ============================================================================

/**
 * Enhanced storage manager with quota management and cleanup
 */
export class OfflineStorageManager {
  private static instance: OfflineStorageManager;
  private storage: OfflineStorage;
  private cleanupInterval?: NodeJS.Timeout;
  private readonly defaultCleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

  private constructor(storage: OfflineStorage) {
    this.storage = storage;
    this.startPeriodicCleanup();
  }

  static getInstance(storage?: OfflineStorage): OfflineStorageManager {
    if (!OfflineStorageManager.instance) {
      if (!storage) {
        storage = new IndexedDBOfflineStorage();
      }
      OfflineStorageManager.instance = new OfflineStorageManager(storage);
    }
    return OfflineStorageManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.storage instanceof IndexedDBOfflineStorage) {
      await this.storage.initialize();
    }
  }

  /**
   * Start periodic cleanup of old operations
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performMaintenance();
      } catch (error) {
        console.error("Storage maintenance failed:", error);
      }
    }, this.defaultCleanupInterval);
  }

  /**
   * Perform storage maintenance and cleanup
   */
  private async performMaintenance(): Promise<void> {
    const storageInfo = await this.storage.getStorageInfo();
    const usagePercentage = storageInfo.used / storageInfo.quota;

    // If storage usage is high, perform cleanup
    if (usagePercentage > 0.8) {
      const cleanupDays = usagePercentage > 0.95 ? 7 : 14;
      const deletedCount = await this.storage.cleanup(cleanupDays);

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old operations from offline storage`);
      }
    }
  }

  /**
   * Get storage health status
   */
  async getStorageHealth(): Promise<{
    status: "healthy" | "warning" | "critical";
    usage: number;
    available: number;
    quota: number;
    recommendations: string[];
  }> {
    const storageInfo = await this.storage.getStorageInfo();
    const usagePercentage = storageInfo.used / storageInfo.quota;

    let status: "healthy" | "warning" | "critical";
    let recommendations: string[] = [];

    if (usagePercentage < 0.5) {
      status = "healthy";
    } else if (usagePercentage < 0.8) {
      status = "warning";
      recommendations.push("Consider cleaning up old offline operations");
    } else {
      status = "critical";
      recommendations.push("Immediate cleanup required - storage almost full");
      recommendations.push("Delete old operations or increase storage quota");
    }

    return {
      status,
      usage: usagePercentage,
      available: storageInfo.available,
      quota: storageInfo.quota,
      recommendations,
    };
  }

  /**
   * Force cleanup operations
   */
  async forceCleanup(olderThanDays?: number): Promise<{ deletedCount: number; freedSpace: number }> {
    const beforeCleanup = await this.storage.getStorageInfo();
    const deletedCount = await this.storage.cleanup(olderThanDays);
    const afterCleanup = await this.storage.getStorageInfo();

    return {
      deletedCount,
      freedSpace: beforeCleanup.used - afterCleanup.used,
    };
  }

  /**
   * Get detailed storage statistics
   */
  async getDetailedStats(): Promise<{
    storage: Awaited<ReturnType<OfflineStorage["getStorageInfo"]>>;
    operations: Awaited<ReturnType<IndexedDBOfflineStorage["getOperationStats"]>>;
    health: Awaited<ReturnType<OfflineStorageManager["getStorageHealth"]>>;
  }> {
    const storage = await this.storage.getStorageInfo();

    let operations = null;
    if (this.storage instanceof IndexedDBOfflineStorage) {
      operations = await this.storage.getOperationStats();
    }

    const health = await this.getStorageHealth();

    return {
      storage,
      operations,
      health,
    };
  }

  /**
   * Destroy storage manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.storage instanceof IndexedDBOfflineStorage) {
      this.storage.destroy();
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create and initialize offline storage
 */
export async function createOfflineStorage(): Promise<OfflineStorage> {
  const storage = new IndexedDBOfflineStorage();
  await storage.initialize();
  return storage;
}

/**
 * Get storage manager instance
 */
export function getStorageManager(): OfflineStorageManager {
  return OfflineStorageManager.getInstance();
}

/**
 * Initialize storage manager
 */
export async function initializeStorageManager(storage?: OfflineStorage): Promise<OfflineStorageManager> {
  const manager = OfflineStorageManager.getInstance(storage);
  await manager.initialize();
  return manager;
}
