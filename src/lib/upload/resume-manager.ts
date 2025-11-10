/**
 * Resume Manager for handling upload state persistence and recovery
 *
 * This module provides persistent storage for upload states, enabling
 * automatic resume of interrupted uploads across browser sessions.
 */

import type {
  ResumeState,
  ResumeManagerConfig
} from "@/types/upload";

export class ResumeManager {
  private config: ResumeManagerConfig;
  private storage: Storage;
  private cleanupTimer?: NodeJS.Timeout;
  private isDestroyed = false;

  constructor(config: ResumeManagerConfig) {
    this.config = {
      storageKey: "chunked-uploader-resume",
      maxStorageSize: 10 * 1024 * 1024, // 10MB
      cleanupInterval: 3600000, // 1 hour
      maxResumeAge: 86400000, // 24 hours
      encryptionEnabled: false,
      ...config,
    };

    // Use localStorage for browser environments
    this.storage = typeof window !== 'undefined' ? localStorage : new MemoryStorage();

    // Start periodic cleanup
    this.startCleanupTimer();

    this.log("ResumeManager initialized", { config: this.config });
  }

  /**
   * Save resume state for a session
   */
  public async saveResumeState(sessionId: string, resumeState: ResumeState): Promise<void> {
    try {
      const serializedState = JSON.stringify(resumeState);

      // Check storage size limits
      if (this.getStorageSize() + serializedState.length > this.config.maxStorageSize) {
        await this.performStorageCleanup();
      }

      let dataToStore = serializedState;

      // Encrypt if enabled
      if (this.config.encryptionEnabled) {
        dataToStore = await this.encryptData(serializedState);
      }

      // Store with timestamp for cleanup
      const storageKey = `${this.config.storageKey}_${sessionId}`;
      const storageData = {
        data: dataToStore,
        timestamp: Date.now(),
        encrypted: this.config.encryptionEnabled,
      };

      this.storage.setItem(storageKey, JSON.stringify(storageData));

      this.log("Resume state saved", { sessionId, size: serializedState.length });
    } catch (error) {
      this.log("Error saving resume state", { sessionId, error });
      throw new Error(`Failed to save resume state: ${error.message}`);
    }
  }

  /**
   * Load resume state for a session
   */
  public async loadResumeState(sessionId: string): Promise<ResumeState | null> {
    try {
      const storageKey = `${this.config.storageKey}_${sessionId}`;
      const storedData = this.storage.getItem(storageKey);

      if (!storedData) {
        return null;
      }

      const storageData = JSON.parse(storedData);
      let resumeStateData = storageData.data;

      // Decrypt if needed
      if (storageData.encrypted) {
        resumeStateData = await this.decryptData(resumeStateData);
      }

      const resumeState: ResumeState = JSON.parse(resumeStateData);

      // Check if resume state is still valid
      if (Date.now() - resumeState.lastSavedAt > this.config.maxResumeAge) {
        await this.removeResumeState(sessionId);
        return null;
      }

      this.log("Resume state loaded", { sessionId });
      return resumeState;
    } catch (error) {
      this.log("Error loading resume state", { sessionId, error });
      await this.removeResumeState(sessionId); // Remove corrupted state
      return null;
    }
  }

  /**
   * Remove resume state for a session
   */
  public async removeResumeState(sessionId: string): Promise<void> {
    try {
      const storageKey = `${this.config.storageKey}_${sessionId}`;
      this.storage.removeItem(storageKey);
      this.log("Resume state removed", { sessionId });
    } catch (error) {
      this.log("Error removing resume state", { sessionId, error });
    }
  }

  /**
   * Get all resume states
   */
  public async getAllResumeStates(): Promise<Map<string, ResumeState>> {
    const resumeStates = new Map<string, ResumeState>();

    try {
      const now = Date.now();
      const keys = Object.keys(this.storage);

      for (const key of keys) {
        if (!key.startsWith(this.config.storageKey + '_')) {
          continue;
        }

        try {
          const sessionId = key.substring(this.config.storageKey.length + 1);
          const resumeState = await this.loadResumeState(sessionId);

          if (resumeState) {
            resumeStates.set(sessionId, resumeState);
          }
        } catch (error) {
          this.log("Error processing resume state", { key, error });
          // Remove corrupted entry
          this.storage.removeItem(key);
        }
      }
    } catch (error) {
      this.log("Error getting all resume states", { error });
    }

    this.log("Resume states loaded", { count: resumeStates.size });
    return resumeStates;
  }

  /**
   * Clear all resume states
   */
  public async clearAllResumeStates(): Promise<void> {
    try {
      const keys = Object.keys(this.storage);

      for (const key of keys) {
        if (key.startsWith(this.config.storageKey + '_')) {
          this.storage.removeItem(key);
        }
      }

      this.log("All resume states cleared");
    } catch (error) {
      this.log("Error clearing resume states", { error });
    }
  }

  /**
   * Get storage statistics
   */
  public getStorageStats(): {
    used: number;
    max: number;
    sessions: number;
    efficiency: number;
  } {
    let used = 0;
    let sessions = 0;

    try {
      const keys = Object.keys(this.storage);

      for (const key of keys) {
        if (key.startsWith(this.config.storageKey + '_')) {
          const value = this.storage.getItem(key);
          if (value) {
            used += value.length;
            sessions++;
          }
        }
      }
    } catch (error) {
      this.log("Error calculating storage stats", { error });
    }

    return {
      used,
      max: this.config.maxStorageSize,
      sessions,
      efficiency: used / this.config.maxStorageSize,
    };
  }

  /**
   * Check if resume is available for a session
   */
  public async hasResumeState(sessionId: string): Promise<boolean> {
    try {
      const storageKey = `${this.config.storageKey}_${sessionId}`;
      const storedData = this.storage.getItem(storageKey);

      if (!storedData) {
        return false;
      }

      const storageData = JSON.parse(storedData);
      const age = Date.now() - storageData.timestamp;

      return age <= this.config.maxResumeAge;
    } catch (error) {
      this.log("Error checking resume state", { sessionId, error });
      return false;
    }
  }

  /**
   * Update resume state timestamp (to keep it alive)
   */
  public async refreshResumeState(sessionId: string): Promise<void> {
    try {
      const resumeState = await this.loadResumeState(sessionId);
      if (resumeState) {
        resumeState.lastSavedAt = Date.now();
        await this.saveResumeState(sessionId, resumeState);
        this.log("Resume state refreshed", { sessionId });
      }
    } catch (error) {
      this.log("Error refreshing resume state", { sessionId, error });
    }
  }

  /**
   * Destroy the resume manager
   */
  public destroy(): void {
    this.isDestroyed = true;

    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.log("ResumeManager destroyed");
  }

  // Private methods

  private async encryptData(data: string): Promise<string> {
    // Simple XOR encryption for demonstration
    // In production, use proper encryption like Web Crypto API
    const key = 'resume-key-2024';
    let encrypted = '';

    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    return btoa(encrypted); // Base64 encode
  }

  private async decryptData(encryptedData: string): Promise<string> {
    try {
      const key = 'resume-key-2024';
      const encrypted = atob(encryptedData); // Base64 decode
      let decrypted = '';

      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }

      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  private getStorageSize(): number {
    let size = 0;

    try {
      const keys = Object.keys(this.storage);

      for (const key of keys) {
        if (key.startsWith(this.config.storageKey + '_')) {
          const value = this.storage.getItem(key);
          if (value) {
            size += value.length;
          }
        }
      }
    } catch (error) {
      this.log("Error calculating storage size", { error });
    }

    return size;
  }

  private async performStorageCleanup(): Promise<void> {
    this.log("Performing storage cleanup", {
      currentSize: this.getStorageSize(),
      maxSize: this.config.maxStorageSize
    });

    try {
      const now = Date.now();
      const entries: Array<{
        sessionId: string;
        timestamp: number;
        size: number;
      }> = [];

      // Collect all resume entries with metadata
      const keys = Object.keys(this.storage);

      for (const key of keys) {
        if (key.startsWith(this.config.storageKey + '_')) {
          try {
            const sessionId = key.substring(this.config.storageKey.length + 1);
            const storedData = this.storage.getItem(key);

            if (storedData) {
              const storageData = JSON.parse(storedData);
              entries.push({
                sessionId,
                timestamp: storageData.timestamp || 0,
                size: storedData.length,
              });
            }
          } catch (error) {
            // Remove corrupted entry
            this.storage.removeItem(key);
          }
        }
      }

      // Sort by age (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove old entries until under size limit
      let currentSize = this.getStorageSize();
      for (const entry of entries) {
        if (currentSize <= this.config.maxStorageSize * 0.8) {
          break; // Leave 20% headroom
        }

        // Remove old entries
        if (now - entry.timestamp > this.config.maxResumeAge) {
          const storageKey = `${this.config.storageKey}_${entry.sessionId}`;
          this.storage.removeItem(storageKey);
          currentSize -= entry.size;
        }
      }

      this.log("Storage cleanup completed", {
        finalSize: this.getStorageSize(),
        entriesRemoved: entries.length
      });
    } catch (error) {
      this.log("Error during storage cleanup", { error });
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      if (!this.isDestroyed) {
        this.performStorageCleanup();
      }
    }, this.config.cleanupInterval);
  }

  private log(message: string, data?: any): void {
    console.log(`[ResumeManager] ${message}`, data);
  }
}

/**
 * Memory-based storage implementation for non-browser environments
 */
class MemoryStorage {
  private data: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.data.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] || null;
  }

  get length(): number {
    return this.data.size;
  }
}

export default ResumeManager;
