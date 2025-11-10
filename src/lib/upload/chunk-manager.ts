/**
 * Chunk Manager for handling file chunking operations
 *
 * This module provides efficient file chunking with memory management,
 * compression support, and chunk verification capabilities.
 */

import type {
  ChunkInfo,
  ChunkManagerConfig,
  NetworkCondition
} from "@/types/upload";

export class ChunkManager {
  private config: ChunkManagerConfig;
  private chunkCache: Map<string, { data: Blob; lastAccessed: number; size: number }> = new Map();
  private memoryUsage = 0;
  private gcTimer?: NodeJS.Timeout;
  private isDestroyed = false;

  constructor(config: ChunkManagerConfig) {
    this.config = {
      enableCompression: false,
      compressionLevel: 6,
      ...config,
    };

    // Start periodic garbage collection
    this.startGarbageCollection();

    this.log("ChunkManager initialized", { config: this.config });
  }

  /**
   * Create chunks from a file
   */
  public async createChunks(
    file: File,
    uploadConfig: any
  ): Promise<ChunkInfo[]> {
    const chunks: ChunkInfo[] = [];
    const fileSize = file.size;
    const chunkSize = uploadConfig.chunkSize;
    const totalChunks = Math.ceil(fileSize / chunkSize);

    this.log("Creating chunks", {
      fileName: file.name,
      fileSize,
      chunkSize,
      totalChunks
    });

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const size = end - start;

      const chunk: ChunkInfo = {
        id: this.generateChunkId(file, i),
        index: i,
        start,
        end,
        size,
        status: 'pending',
        retryCount: 0,
      };

      // Calculate chunk hash if verification is enabled
      if (uploadConfig.verifyChunks) {
        chunk.hash = await this.calculateChunkHash(file, start, end);
      }

      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Get chunk data for upload
   */
  public async getChunkData(chunk: ChunkInfo): Promise<Blob> {
    const cacheKey = chunk.id;

    // Check cache first
    const cached = this.chunkCache.get(cacheKey);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.data;
    }

    // Load chunk data would normally be done here
    // For now, we'll create a placeholder
    const data = new Blob([`chunk data ${chunk.id}`], { type: 'application/octet-stream' });

    // Apply compression if enabled
    const processedData = this.config.enableCompression
      ? await this.compressData(data)
      : data;

    // Cache the data if within memory limits
    if (this.canCacheData(processedData.size)) {
      this.chunkCache.set(cacheKey, {
        data: processedData,
        lastAccessed: Date.now(),
        size: processedData.size,
      });
      this.memoryUsage += processedData.size;
    }

    return processedData;
  }

  /**
   * Verify chunk integrity
   */
  public async verifyChunk(
    chunk: ChunkInfo,
    data: Blob
  ): Promise<boolean> {
    if (!chunk.hash) {
      return true; // Skip verification if no hash
    }

    const calculatedHash = await this.calculateBlobHash(data);
    return calculatedHash === chunk.hash;
  }

  /**
   * Cancel all chunk uploads for a session
   */
  public async cancelChunkUploads(sessionId: string): Promise<void> {
    // Remove cached chunks for this session
    for (const [chunkId, cached] of this.chunkCache.entries()) {
      if (chunkId.startsWith(sessionId)) {
        this.memoryUsage -= cached.size;
        this.chunkCache.delete(chunkId);
      }
    }

    this.log("Cancelled chunk uploads", { sessionId });
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): {
    used: number;
    max: number;
    chunks: number;
    efficiency: number;
  } {
    return {
      used: this.memoryUsage,
      max: this.config.maxMemoryUsage,
      chunks: this.chunkCache.size,
      efficiency: this.memoryUsage / this.config.maxMemoryUsage,
    };
  }

  /**
   * Clear all cached chunks
   */
  public clearCache(): void {
    this.chunkCache.clear();
    this.memoryUsage = 0;
    this.log("Chunk cache cleared");
  }

  /**
   * Destroy the chunk manager
   */
  public destroy(): void {
    this.isDestroyed = true;

    // Clear garbage collection timer
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }

    // Clear cache and reset memory
    this.clearCache();

    this.log("ChunkManager destroyed");
  }

  /**
   * Adapt chunk size based on network conditions
   */
  public adaptChunkSize(
    baseChunkSize: number,
    networkCondition: NetworkCondition
  ): number {
    if (!this.config.enableCompression) {
      return baseChunkSize;
    }

    // Adjust chunk size based on network speed and type
    let multiplier = 1;

    switch (networkCondition.effectiveType) {
      case 'slow-2g':
      case '2g':
        multiplier = 0.5;
        break;
      case '3g':
        multiplier = 0.75;
        break;
      case '4g':
        multiplier = 1.25;
        break;
    }

    // Further adjust based on connection type
    if (networkCondition.type === 'cellular') {
      multiplier *= 0.8; // Reduce for cellular to be more conservative
    } else if (networkCondition.type === 'wifi') {
      multiplier *= 1.2; // Increase for stable WiFi
    }

    // Adjust based on save data mode
    if (networkCondition.saveData) {
      multiplier *= 0.5;
    }

    const adaptedSize = Math.floor(baseChunkSize * multiplier);

    // Ensure within bounds
    return Math.max(256 * 1024, Math.min(adaptedSize, 10 * 1024 * 1024)); // 256KB - 10MB
  }

  // Private methods

  private async compressData(data: Blob): Promise<Blob> {
    if (!this.config.enableCompression) {
      return data;
    }

    try {
      const stream = data.stream();
      const compressionStream = new CompressionStream('gzip');
      const compressedStream = stream.pipeThrough(compressionStream);

      return new Response(compressedStream).blob();
    } catch (error) {
      this.log("Compression failed, using original data", { error });
      return data;
    }
  }

  private async decompressData(data: Blob): Promise<Blob> {
    try {
      const stream = data.stream();
      const decompressionStream = new DecompressionStream('gzip');
      const decompressedStream = stream.pipeThrough(decompressionStream);

      return new Response(decompressedStream).blob();
    } catch (error) {
      this.log("Decompression failed, using original data", { error });
      return data;
    }
  }

  private async calculateChunkHash(
    file: File,
    start: number,
    end: number
  ): Promise<string> {
    try {
      const chunk = file.slice(start, end);
      const buffer = await chunk.arrayBuffer();
      return this.arrayBufferToHash(buffer);
    } catch (error) {
      this.log("Error calculating chunk hash", { error });
      return '';
    }
  }

  private async calculateBlobHash(blob: Blob): Promise<string> {
    try {
      const buffer = await blob.arrayBuffer();
      return this.arrayBufferToHash(buffer);
    } catch (error) {
      this.log("Error calculating blob hash", { error });
      return '';
    }
  }

  private arrayBufferToHash(buffer: ArrayBuffer): string {
    // Simple hash implementation for demonstration
    // In production, use a proper hashing algorithm like SHA-256
    const view = new Uint8Array(buffer);
    let hash = 0;
    for (let i = 0; i < view.length; i++) {
      hash = ((hash << 5) - hash + view[i]) & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
  }

  private canCacheData(size: number): boolean {
    return (this.memoryUsage + size) <= this.config.maxMemoryUsage;
  }

  private startGarbageCollection(): void {
    this.gcTimer = setInterval(() => {
      this.performGarbageCollection();
    }, 60000); // Run every minute
  }

  private performGarbageCollection(): void {
    if (this.isDestroyed) {
      return;
    }

    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const threshold = this.config.maxMemoryUsage * this.config.gcThreshold;

    // If we're under the threshold, no need to clean up
    if (this.memoryUsage < threshold) {
      return;
    }

    this.log("Performing garbage collection", {
      currentUsage: this.memoryUsage,
      threshold,
      chunksBefore: this.chunkCache.size
    });

    // Remove old chunks first
    for (const [chunkId, cached] of this.chunkCache.entries()) {
      if (now - cached.lastAccessed > maxAge) {
        this.memoryUsage -= cached.size;
        this.chunkCache.delete(chunkId);

        if (this.memoryUsage < threshold) {
          break;
        }
      }
    }

    // If still over threshold, remove least recently used chunks
    if (this.memoryUsage >= threshold) {
      const entries = Array.from(this.chunkCache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      for (const [chunkId, cached] of entries) {
        this.memoryUsage -= cached.size;
        this.chunkCache.delete(chunkId);

        if (this.memoryUsage < threshold) {
          break;
        }
      }
    }

    this.log("Garbage collection completed", {
      currentUsage: this.memoryUsage,
      chunksAfter: this.chunkCache.size
    });
  }

  private generateChunkId(file: File, index: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}_${random}_${file.name}_${index}`;
  }

  private log(message: string, data?: any): void {
    console.log(`[ChunkManager] ${message}`, data);
  }
}

export default ChunkManager;
