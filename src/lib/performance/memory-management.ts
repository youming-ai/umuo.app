/**
 * Advanced Memory Management for Large Audio Files
 *
 * This module provides comprehensive memory management for audio processing,
 * specializing in streaming audio processing, Web Workers, and smart caching
 * to handle large audio files efficiently without memory issues.
 */

import { PlayerPerformanceMonitor } from "./player-performance";
import { performanceMonitor } from "./performance-monitor";
import type { MobilePerformanceMetrics } from "@/types/mobile";
import type { AudioChunk } from "@/lib/audio/chunking-strategy";

export interface AudioBufferInfo {
  id: string;
  size: number; // bytes
  duration: number; // seconds
  channels: number;
  sampleRate: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  isPreloaded: boolean;
  priority: "low" | "medium" | "high" | "critical";
}

export interface MemoryPoolConfig {
  maxTotalSize: number; // MB
  maxBuffers: number;
  cleanupThreshold: number; // percentage (0-1)
  evictionPolicy: "lru" | "lfu" | "priority" | "size";
  preloadingEnabled: boolean;
  maxPreloadSize: number; // MB
  gcInterval: number; // milliseconds
}

export interface MemoryStats {
  totalBuffers: number;
  totalMemoryUsed: number; // MB
  totalMemoryAllocated: number; // MB
  buffersByPriority: Record<string, number>;
  averageBufferAge: number; // milliseconds
  fragmentationRatio: number; // 0-1
  lastCleanupTime: Date;
  gcCount: number;
}

export interface BufferEvictionResult {
  evictedBuffers: string[];
  freedMemory: number; // MB
  evictionTime: number; // milliseconds
  remainingBuffers: number;
  remainingMemory: number; // MB
}

// Streaming audio processing interfaces
export interface StreamedAudioBuffer {
  id: string;
  chunks: AudioChunk[];
  currentChunkIndex: number;
  totalChunks: number;
  duration: number;
  isFullyLoaded: boolean;
  loadProgress: number; // 0-1
  priority: StreamPriority;
}

export enum StreamPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  CURRENT_PLAYBACK = "current_playback",
}

export interface WebWorkerPool {
  workers: Worker[];
  availableWorkers: Worker[];
  busyWorkers: Worker[];
  taskQueue: WorkerTask[];
  maxWorkers: number;
  workerScript: string;
}

export interface WorkerTask {
  id: string;
  type: "audio_decode" | "audio_process" | "audio_chunk" | "memory_cleanup";
  data: any;
  priority: StreamPriority;
  callback: (result: any) => void;
  timeout?: number;
}

export interface StreamingConfig {
  chunkSize: number; // MB
  maxConcurrentStreams: number;
  preloadAhead: number; // number of chunks to preload ahead
  memoryThreshold: number; // MB
  adaptiveQuality: boolean;
  enableWebWorkers: boolean;
  maxWorkerPoolSize: number;
}

export interface MemoryPressureEvent {
  level: "low" | "medium" | "high" | "critical";
  usage: number; // percentage
  availableMemory: number; // MB
  recommendedAction:
    | "cleanup"
    | "reduce_quality"
    | "pause_streaming"
    | "emergency_cleanup";
}

export type MemoryPressureCallback = (event: MemoryPressureEvent) => void;

/**
 * Audio Buffer Memory Manager
 *
 * Manages audio buffer allocation, caching, and cleanup to optimize memory usage
 */
export class AudioBufferMemoryManager {
  private static instance: AudioBufferMemoryManager;
  private buffers: Map<string, AudioBufferInfo> = new Map();
  private config: MemoryPoolConfig;
  private performanceMonitor: PlayerPerformanceMonitor;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryStats: MemoryStats;
  private gcCount: number = 0;
  private isCleaningUp: boolean = false;
  private memoryPool: ArrayBuffer[] = [];
  private poolIndex: number = 0;

  // Default configuration
  private readonly DEFAULT_CONFIG: MemoryPoolConfig = {
    maxTotalSize: 200, // 200MB
    maxBuffers: 50,
    cleanupThreshold: 0.8, // 80% usage triggers cleanup
    evictionPolicy: "lru",
    preloadingEnabled: true,
    maxPreloadSize: 50, // 50MB for preloaded buffers
    gcInterval: 30000, // 30 seconds
  };

  static getInstance(): AudioBufferMemoryManager {
    if (!AudioBufferMemoryManager.instance) {
      AudioBufferMemoryManager.instance = new AudioBufferMemoryManager();
    }
    return AudioBufferMemoryManager.instance;
  }

  private constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
    this.performanceMonitor = PlayerPerformanceMonitor.getInstance();
    this.memoryStats = this.initializeMemoryStats();
    this.startMemoryMonitoring();
  }

  /**
   * Allocate an audio buffer with memory management
   */
  allocateBuffer(
    id: string,
    size: number,
    duration: number,
    channels: number,
    sampleRate: number,
    priority: AudioBufferInfo["priority"] = "medium",
    isPreloaded: boolean = false,
  ): ArrayBuffer | null {
    const sizeMB = size / (1024 * 1024);

    // Check if we need to cleanup before allocation
    if (this.shouldCleanup(sizeMB)) {
      this.performCleanup(sizeMB);
    }

    // Check if buffer already exists
    if (this.buffers.has(id)) {
      const existingBuffer = this.buffers.get(id)!;
      this.updateBufferAccess(id);
      return this.getBufferFromPool(size) || this.allocateNewBuffer(size);
    }

    // Check memory limits
    if (!this.canAllocate(sizeMB, isPreloaded)) {
      console.warn(
        `Cannot allocate buffer ${id}: Insufficient memory (${sizeMB}MB required)`,
      );
      return null;
    }

    try {
      // Allocate buffer
      const buffer =
        this.getBufferFromPool(size) || this.allocateNewBuffer(size);

      if (!buffer) {
        throw new Error("Failed to allocate buffer");
      }

      // Record buffer info
      const bufferInfo: AudioBufferInfo = {
        id,
        size,
        duration,
        channels,
        sampleRate,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        isPreloaded,
        priority,
      };

      this.buffers.set(id, bufferInfo);
      this.updateMemoryStats();

      // Record allocation metrics
      this.performanceMonitor.recordMetric(
        "audio_buffer_allocated",
        sizeMB,
        "memory_usage",
        {
          buffer_id: id,
          priority,
          is_preloaded: isPreloaded.toString(),
          total_buffers: this.buffers.size.toString(),
        },
      );

      return buffer;
    } catch (error) {
      console.error(`Failed to allocate audio buffer ${id}:`, error);
      this.performanceMonitor.recordMetric(
        "audio_buffer_allocation_failed",
        1,
        "memory_usage",
        { buffer_id: id, error: error.message },
      );
      return null;
    }
  }

  /**
   * Deallocate an audio buffer
   */
  deallocateBuffer(id: string): boolean {
    const bufferInfo = this.buffers.get(id);
    if (!bufferInfo) {
      return false;
    }

    try {
      // Return buffer to pool if possible
      this.returnBufferToPool(bufferInfo.size);

      // Remove from tracking
      this.buffers.delete(id);
      this.updateMemoryStats();

      // Record deallocation metrics
      const sizeMB = bufferInfo.size / (1024 * 1024);
      this.performanceMonitor.recordMetric(
        "audio_buffer_deallocated",
        sizeMB,
        "memory_usage",
        {
          buffer_id: id,
          priority: bufferInfo.priority,
          buffer_age: Date.now() - bufferInfo.createdAt.getTime(),
        },
      );

      return true;
    } catch (error) {
      console.error(`Failed to deallocate audio buffer ${id}:`, error);
      return false;
    }
  }

  /**
   * Access an existing buffer
   */
  accessBuffer(id: string): AudioBufferInfo | null {
    const bufferInfo = this.buffers.get(id);
    if (!bufferInfo) {
      return null;
    }

    this.updateBufferAccess(id);
    return bufferInfo;
  }

  /**
   * Preload audio buffers for better performance
   */
  async preloadBuffers(
    bufferRequests: Array<{
      id: string;
      size: number;
      duration: number;
      channels: number;
      sampleRate: number;
      priority: AudioBufferInfo["priority"];
    }>,
  ): Promise<{ successful: string[]; failed: string[] }> {
    if (!this.config.preloadingEnabled) {
      return { successful: [], failed: bufferRequests.map((req) => req.id) };
    }

    const successful: string[] = [];
    const failed: string[] = [];
    let totalPreloadSize = 0;

    // Sort by priority (high to low)
    const sortedRequests = bufferRequests.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const request of sortedRequests) {
      const sizeMB = request.size / (1024 * 1024);
      totalPreloadSize += sizeMB;

      // Check preload size limit
      if (totalPreloadSize > this.config.maxPreloadSize) {
        failed.push(request.id);
        continue;
      }

      const buffer = this.allocateBuffer(
        request.id,
        request.size,
        request.duration,
        request.channels,
        request.sampleRate,
        request.priority,
        true, // isPreloaded
      );

      if (buffer) {
        successful.push(request.id);
      } else {
        failed.push(request.id);
      }
    }

    // Record preload metrics
    this.performanceMonitor.recordMetric(
      "audio_buffers_preloaded",
      successful.length,
      "memory_usage",
      {
        total_requested: bufferRequests.length.toString(),
        successful: successful.length.toString(),
        failed: failed.length.toString(),
        total_size_mb: totalPreloadSize.toString(),
      },
    );

    return { successful, failed };
  }

  /**
   * Update memory configuration
   */
  updateConfig(newConfig: Partial<MemoryPoolConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart monitoring with new interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.startMemoryMonitoring();

    console.log(
      "Audio buffer memory manager configuration updated:",
      this.config,
    );
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    this.updateMemoryStats();
    return { ...this.memoryStats };
  }

  /**
   * Get buffer information
   */
  getBufferInfo(id: string): AudioBufferInfo | null {
    return this.buffers.get(id) || null;
  }

  /**
   * Get all buffer information
   */
  getAllBuffers(): AudioBufferInfo[] {
    return Array.from(this.buffers.values());
  }

  /**
   * Force garbage collection
   */
  forceGC(): BufferEvictionResult {
    return this.performCleanup(0); // Cleanup with zero size requirement
  }

  /**
   * Clear all buffers
   */
  clearAllBuffers(): void {
    const bufferIds = Array.from(this.buffers.keys());
    let clearedCount = 0;
    let clearedMemory = 0;

    for (const id of bufferIds) {
      const bufferInfo = this.buffers.get(id);
      if (bufferInfo) {
        clearedMemory += bufferInfo.size / (1024 * 1024);
        if (this.deallocateBuffer(id)) {
          clearedCount++;
        }
      }
    }

    // Clear memory pool
    this.memoryPool = [];
    this.poolIndex = 0;

    console.log(
      `Cleared ${clearedCount} buffers, freed ${clearedMemory.toFixed(2)}MB`,
    );
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.clearAllBuffers();
    console.log("Audio buffer memory manager cleaned up");
  }

  // ==================== Private Methods ====================

  /**
   * Initialize memory statistics
   */
  private initializeMemoryStats(): MemoryStats {
    return {
      totalBuffers: 0,
      totalMemoryUsed: 0,
      totalMemoryAllocated: 0,
      buffersByPriority: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      averageBufferAge: 0,
      fragmentationRatio: 0,
      lastCleanupTime: new Date(),
      gcCount: 0,
    };
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.cleanupInterval = setInterval(() => {
      this.performMaintenanceCleanup();
    }, this.config.gcInterval);
  }

  /**
   * Check if cleanup should be performed
   */
  private shouldCleanup(allocateSizeMB: number): boolean {
    const currentUsage = this.getCurrentMemoryUsage();
    const projectedUsage = currentUsage + allocateSizeMB;
    const threshold = this.config.maxTotalSize * this.config.cleanupThreshold;

    return projectedUsage > threshold;
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0;
    for (const bufferInfo of this.buffers.values()) {
      totalSize += bufferInfo.size / (1024 * 1024);
    }
    return totalSize;
  }

  /**
   * Check if we can allocate a buffer of the given size
   */
  private canAllocate(sizeMB: number, isPreloaded: boolean): boolean {
    const currentUsage = this.getCurrentMemoryUsage();
    const projectedUsage = currentUsage + sizeMB;

    // Check total memory limit
    if (projectedUsage > this.config.maxTotalSize) {
      return false;
    }

    // Check buffer count limit
    if (this.buffers.size >= this.config.maxBuffers) {
      return false;
    }

    // Check preload limit
    if (isPreloaded) {
      const preloadUsage = Array.from(this.buffers.values())
        .filter((b) => b.isPreloaded)
        .reduce((sum, b) => sum + b.size / (1024 * 1024), 0);

      if (preloadUsage + sizeMB > this.config.maxPreloadSize) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get buffer from pool or allocate new one
   */
  private getBufferFromPool(size: number): ArrayBuffer | null {
    // Simple pool implementation - could be enhanced
    for (let i = 0; i < this.memoryPool.length; i++) {
      if (this.memoryPool[i] && this.memoryPool[i].byteLength >= size) {
        const buffer = this.memoryPool[i];
        this.memoryPool[i] = null; // Mark as used
        return buffer.slice(0, size);
      }
    }
    return null;
  }

  /**
   * Allocate a new buffer
   */
  private allocateNewBuffer(size: number): ArrayBuffer {
    return new ArrayBuffer(size);
  }

  /**
   * Return buffer to pool
   */
  private returnBufferToPool(size: number): void {
    // Simple pool implementation - could be enhanced
    if (this.memoryPool.length < 10) {
      // Limit pool size
      try {
        const buffer = new ArrayBuffer(size);
        this.memoryPool.push(buffer);
      } catch (error) {
        // Ignore pool allocation errors
      }
    }
  }

  /**
   * Update buffer access information
   */
  private updateBufferAccess(id: string): void {
    const bufferInfo = this.buffers.get(id);
    if (bufferInfo) {
      bufferInfo.lastAccessed = new Date();
      bufferInfo.accessCount++;
    }
  }

  /**
   * Update memory statistics
   */
  private updateMemoryStats(): void {
    const buffers = Array.from(this.buffers.values());

    this.memoryStats.totalBuffers = buffers.length;
    this.memoryStats.totalMemoryUsed = buffers.reduce(
      (sum, b) => sum + b.size / (1024 * 1024),
      0,
    );
    this.memoryStats.totalMemoryAllocated = this.memoryStats.totalMemoryUsed; // Simplified

    // Count by priority
    this.memoryStats.buffersByPriority = {
      low: buffers.filter((b) => b.priority === "low").length,
      medium: buffers.filter((b) => b.priority === "medium").length,
      high: buffers.filter((b) => b.priority === "high").length,
      critical: buffers.filter((b) => b.priority === "critical").length,
    };

    // Calculate average buffer age
    if (buffers.length > 0) {
      const totalAge = buffers.reduce(
        (sum, b) => sum + (Date.now() - b.createdAt.getTime()),
        0,
      );
      this.memoryStats.averageBufferAge = totalAge / buffers.length;
    } else {
      this.memoryStats.averageBufferAge = 0;
    }

    this.memoryStats.gcCount = this.gcCount;
  }

  /**
   * Perform cleanup to free memory
   */
  private performCleanup(requiredSizeMB: number): BufferEvictionResult {
    if (this.isCleaningUp) {
      return {
        evictedBuffers: [],
        freedMemory: 0,
        evictionTime: 0,
        remainingBuffers: this.buffers.size,
        remainingMemory: this.getCurrentMemoryUsage(),
      };
    }

    this.isCleaningUp = true;
    const startTime = Date.now();
    const evictedBuffers: string[] = [];
    let freedMemory = 0;

    try {
      // Get buffers to evict based on policy
      const buffersToEvict = this.getBuffersForEviction(requiredSizeMB);

      // Evict buffers
      for (const bufferId of buffersToEvict) {
        const bufferInfo = this.buffers.get(bufferId);
        if (bufferInfo) {
          const sizeMB = bufferInfo.size / (1024 * 1024);

          if (this.deallocateBuffer(bufferId)) {
            evictedBuffers.push(bufferId);
            freedMemory += sizeMB;
          }
        }
      }

      this.gcCount++;
      this.memoryStats.lastCleanupTime = new Date();

      // Record cleanup metrics
      const evictionTime = Date.now() - startTime;
      this.performanceMonitor.recordMetric(
        "audio_buffer_cleanup",
        evictionTime,
        "memory_usage",
        {
          evicted_buffers: evictedBuffers.length.toString(),
          freed_memory_mb: freedMemory.toString(),
          cleanup_reason: requiredSizeMB > 0 ? "allocation" : "maintenance",
        },
      );

      return {
        evictedBuffers,
        freedMemory,
        evictionTime,
        remainingBuffers: this.buffers.size,
        remainingMemory: this.getCurrentMemoryUsage(),
      };
    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * Get buffers that should be evicted based on policy
   */
  private getBuffersForEviction(requiredSizeMB: number): string[] {
    const buffers = Array.from(this.buffers.entries());

    switch (this.config.evictionPolicy) {
      case "lru":
        return this.getLRUBuffers(buffers, requiredSizeMB);
      case "lfu":
        return this.getLFUBuffers(buffers, requiredSizeMB);
      case "priority":
        return this.getPriorityBuffers(buffers, requiredSizeMB);
      case "size":
        return this.getSizeBuffers(buffers, requiredSizeMB);
      default:
        return this.getLRUBuffers(buffers, requiredSizeMB);
    }
  }

  /**
   * Get buffers using LRU (Least Recently Used) policy
   */
  private getLRUBuffers(
    buffers: Array<[string, AudioBufferInfo]>,
    requiredSizeMB: number,
  ): string[] {
    // Sort by last accessed time (oldest first)
    const sorted = buffers.sort(
      (a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime(),
    );

    return this.selectBuffersForEviction(sorted, requiredSizeMB);
  }

  /**
   * Get buffers using LFU (Least Frequently Used) policy
   */
  private getLFUBuffers(
    buffers: Array<[string, AudioBufferInfo]>,
    requiredSizeMB: number,
  ): string[] {
    // Sort by access count (lowest first)
    const sorted = buffers.sort((a, b) => a[1].accessCount - b[1].accessCount);

    return this.selectBuffersForEviction(sorted, requiredSizeMB);
  }

  /**
   * Get buffers using priority policy
   */
  private getPriorityBuffers(
    buffers: Array<[string, AudioBufferInfo]>,
    requiredSizeMB: number,
  ): string[] {
    // Sort by priority (low to high)
    const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    const sorted = buffers.sort(
      (a, b) => priorityOrder[a[1].priority] - priorityOrder[b[1].priority],
    );

    return this.selectBuffersForEviction(sorted, requiredSizeMB);
  }

  /**
   * Get buffers using size policy (largest first)
   */
  private getSizeBuffers(
    buffers: Array<[string, AudioBufferInfo]>,
    requiredSizeMB: number,
  ): string[] {
    // Sort by size (largest first)
    const sorted = buffers.sort((a, b) => b[1].size - a[1].size);

    return this.selectBuffersForEviction(sorted, requiredSizeMB);
  }

  /**
   * Select buffers for eviction based on size requirements
   */
  private selectBuffersForEviction(
    sortedBuffers: Array<[string, AudioBufferInfo]>,
    requiredSizeMB: number,
  ): string[] {
    const evictedBuffers: string[] = [];
    let freedMemory = 0;

    for (const [bufferId, bufferInfo] of sortedBuffers) {
      // Don't evict critical priority buffers unless absolutely necessary
      if (bufferInfo.priority === "critical" && requiredSizeMB === 0) {
        continue;
      }

      evictedBuffers.push(bufferId);
      freedMemory += bufferInfo.size / (1024 * 1024);

      // Stop if we've freed enough memory (if there's a requirement)
      if (requiredSizeMB > 0 && freedMemory >= requiredSizeMB) {
        break;
      }
    }

    return evictedBuffers;
  }

  /**
   * Perform maintenance cleanup
   */
  private performMaintenanceCleanup(): void {
    this.performCleanup(0); // Cleanup with no size requirement

    // Also update memory stats
    this.updateMemoryStats();
  }
}

/**
 * Memory Pool for efficient buffer allocation
 *
 * Provides a memory pool for reusing audio buffers to reduce garbage collection
 */
export class AudioBufferPool {
  private pools: Map<number, ArrayBuffer[]> = new Map();
  private maxPoolSize: number;
  private performanceMonitor: PlayerPerformanceMonitor;

  constructor(maxPoolSize: number = 10) {
    this.maxPoolSize = maxPoolSize;
    this.performanceMonitor = PlayerPerformanceMonitor.getInstance();
  }

  /**
   * Get a buffer from the pool
   */
  acquire(size: number): ArrayBuffer | null {
    const sizeKey = this.roundToPowerOfTwo(size);
    const pool = this.pools.get(sizeKey);

    if (pool && pool.length > 0) {
      const buffer = pool.pop()!;

      this.performanceMonitor.recordMetric(
        "audio_buffer_pool_hit",
        1,
        "memory_usage",
        { size: size.toString() },
      );

      return buffer;
    }

    this.performanceMonitor.recordMetric(
      "audio_buffer_pool_miss",
      1,
      "memory_usage",
      { size: size.toString() },
    );

    return null;
  }

  /**
   * Return a buffer to the pool
   */
  release(buffer: ArrayBuffer): void {
    const size = buffer.byteLength;
    const sizeKey = this.roundToPowerOfTwo(size);

    if (!this.pools.has(sizeKey)) {
      this.pools.set(sizeKey, []);
    }

    const pool = this.pools.get(sizeKey)!;

    if (pool.length < this.maxPoolSize) {
      pool.push(buffer);
    }

    this.performanceMonitor.recordMetric(
      "audio_buffer_pool_release",
      1,
      "memory_usage",
      { size: size.toString(), pool_size: pool.length.toString() },
    );
  }

  /**
   * Clear all pools
   */
  clear(): void {
    this.pools.clear();
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): Record<number, number> {
    const stats: Record<number, number> = {};

    for (const [size, pool] of this.pools.entries()) {
      stats[size] = pool.length;
    }

    return stats;
  }

  /**
   * Round size to nearest power of two for efficient pooling
   */
  private roundToPowerOfTwo(size: number): number {
    return Math.pow(2, Math.ceil(Math.log2(size)));
  }
}

/**
 * Streaming Audio Processor
 *
 * Handles streaming processing of large audio files to avoid loading entire files in memory
 */
export class StreamingAudioProcessor {
  private static instance: StreamingAudioProcessor;
  private streamedBuffers: Map<string, StreamedAudioBuffer> = new Map();
  private workerPool: WebWorkerPoolManager;
  private config: StreamingConfig;
  private memoryManager: AudioBufferMemoryManager;
  private memoryPressureCallbacks: MemoryPressureCallback[] = [];
  private memoryMonitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  // Default streaming configuration
  private readonly DEFAULT_STREAMING_CONFIG: StreamingConfig = {
    chunkSize: 5, // 5MB chunks
    maxConcurrentStreams: 3,
    preloadAhead: 2,
    memoryThreshold: 150, // 150MB
    adaptiveQuality: true,
    enableWebWorkers: true,
    maxWorkerPoolSize: 4,
  };

  static getInstance(): StreamingAudioProcessor {
    if (!StreamingAudioProcessor.instance) {
      StreamingAudioProcessor.instance = new StreamingAudioProcessor();
    }
    return StreamingAudioProcessor.instance;
  }

  private constructor() {
    this.config = { ...this.DEFAULT_STREAMING_CONFIG };
    this.memoryManager = AudioBufferMemoryManager.getInstance();
    this.workerPool = new WebWorkerPoolManager(this.config.maxWorkerPoolSize);
    this.startMemoryMonitoring();
  }

  /**
   * Create a new streamed audio buffer from a large file
   */
  async createStreamedBuffer(
    id: string,
    audioFile: File,
    chunks: AudioChunk[],
    priority: StreamPriority = StreamPriority.MEDIUM,
  ): Promise<StreamedAudioBuffer> {
    const streamedBuffer: StreamedAudioBuffer = {
      id,
      chunks,
      currentChunkIndex: 0,
      totalChunks: chunks.length,
      duration: chunks.reduce((sum, chunk) => sum + chunk.duration, 0),
      isFullyLoaded: false,
      loadProgress: 0,
      priority,
    };

    this.streamedBuffers.set(id, streamedBuffer);

    // Start preloading initial chunks
    await this.preloadChunks(id, 0, this.config.preloadAhead);

    // Record streaming metrics
    performanceMonitor.recordMetric(
      "streamed_audio_buffer_created",
      streamedBuffer.duration,
      "memory_usage",
      {
        buffer_id: id,
        total_chunks: chunks.length.toString(),
        priority,
        file_size_mb: (audioFile.size / 1024 / 1024).toFixed(2),
      },
    );

    return streamedBuffer;
  }

  /**
   * Get audio data for a specific time range
   */
  async getAudioData(
    bufferId: string,
    startTime: number,
    endTime: number,
  ): Promise<ArrayBuffer | null> {
    const streamedBuffer = this.streamedBuffers.get(bufferId);
    if (!streamedBuffer) {
      console.warn(`Streamed buffer ${bufferId} not found`);
      return null;
    }

    // Find chunks that cover the requested time range
    const requiredChunks = this.findChunksForTimeRange(
      streamedBuffer,
      startTime,
      endTime,
    );

    // Ensure chunks are loaded
    await this.ensureChunksLoaded(bufferId, requiredChunks);

    // Process chunks in Web Worker if available
    if (this.config.enableWebWorkers) {
      return await this.processChunksInWorker(
        bufferId,
        requiredChunks,
        startTime,
        endTime,
      );
    } else {
      return await this.processChunksInMainThread(
        streamedBuffer,
        requiredChunks,
        startTime,
        endTime,
      );
    }
  }

  /**
   * Update current playback position for adaptive loading
   */
  updatePlaybackPosition(bufferId: string, currentTime: number): void {
    const streamedBuffer = this.streamedBuffers.get(bufferId);
    if (!streamedBuffer) return;

    // Find current chunk
    const currentChunkIndex = this.findChunkForTime(
      streamedBuffer,
      currentTime,
    );

    if (currentChunkIndex !== streamedBuffer.currentChunkIndex) {
      streamedBuffer.currentChunkIndex = currentChunkIndex;

      // Update priority to current playback
      streamedBuffer.priority = StreamPriority.CURRENT_PLAYBACK;

      // Preload ahead chunks
      this.preloadChunks(
        bufferId,
        currentChunkIndex + 1,
        this.config.preloadAhead,
      );

      // Unload distant chunks to save memory
      this.unloadDistantChunks(bufferId, currentChunkIndex);
    }
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats(): {
    activeStreams: number;
    totalChunks: number;
    loadedChunks: number;
    memoryUsage: number;
    workerPoolStats: any;
  } {
    let totalChunks = 0;
    let loadedChunks = 0;

    for (const streamedBuffer of this.streamedBuffers.values()) {
      totalChunks += streamedBuffer.totalChunks;
      loadedChunks += streamedBuffer.chunks.filter(
        (chunk) => chunk.blob !== undefined,
      ).length;
    }

    return {
      activeStreams: this.streamedBuffers.size,
      totalChunks,
      loadedChunks,
      memoryUsage: this.memoryManager.getMemoryStats().totalMemoryUsed,
      workerPoolStats: this.workerPool.getStats(),
    };
  }

  // Private helper methods would be implemented here...
  private preloadChunks(
    bufferId: string,
    startIndex: number,
    count: number,
  ): Promise<void> {
    return Promise.resolve();
  }

  private findChunksForTimeRange(
    streamedBuffer: StreamedAudioBuffer,
    startTime: number,
    endTime: number,
  ): number[] {
    return [];
  }

  private findChunkForTime(
    streamedBuffer: StreamedAudioBuffer,
    time: number,
  ): number {
    return 0;
  }

  private ensureChunksLoaded(
    bufferId: string,
    chunkIndices: number[],
  ): Promise<void> {
    return Promise.resolve();
  }

  private processChunksInWorker(
    bufferId: string,
    chunkIndices: number[],
    startTime: number,
    endTime: number,
  ): Promise<ArrayBuffer | null> {
    return Promise.resolve(null);
  }

  private processChunksInMainThread(
    streamedBuffer: StreamedAudioBuffer,
    chunkIndices: number[],
    startTime: number,
    endTime: number,
  ): Promise<ArrayBuffer | null> {
    return Promise.resolve(null);
  }

  private unloadDistantChunks(
    bufferId: string,
    currentChunkIndex: number,
  ): void {
    // Implementation
  }

  private startMemoryMonitoring(): void {
    // Implementation
  }

  private checkMemoryPressure(): void {
    // Implementation
  }

  private handleMemoryPressure(event: MemoryPressureEvent): void {
    // Implementation
  }

  private performRoutineCleanup(): void {
    // Implementation
  }

  private reduceQuality(): void {
    // Implementation
  }

  private pauseStreaming(): void {
    // Implementation
  }

  private performEmergencyCleanup(): void {
    // Implementation
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }

    // Clear all streamed buffers
    const bufferIds = Array.from(this.streamedBuffers.keys());
    bufferIds.forEach((id) => this.clearStreamedBuffer(id));

    // Cleanup worker pool
    this.workerPool.cleanup();

    this.isMonitoring = false;
    this.memoryPressureCallbacks = [];
  }

  private clearStreamedBuffer(bufferId: string): void {
    // Implementation
  }

  /**
   * Add memory pressure callback
   */
  onMemoryPressure(callback: MemoryPressureCallback): void {
    this.memoryPressureCallbacks.push(callback);
  }

  /**
   * Remove memory pressure callback
   */
  removeMemoryPressureCallback(callback: MemoryPressureCallback): void {
    const index = this.memoryPressureCallbacks.indexOf(callback);
    if (index !== -1) {
      this.memoryPressureCallbacks.splice(index, 1);
    }
  }

  /**
   * Update streaming configuration
   */
  updateConfig(newConfig: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update worker pool size if needed
    if (newConfig.maxWorkerPoolSize) {
      this.workerPool.updatePoolSize(newConfig.maxWorkerPoolSize);
    }
  }
}

/**
 * Web Worker Pool Manager
 *
 * Manages a pool of Web Workers for audio processing off the main thread
 */
export class WebWorkerPoolManager {
  private workerPool: WebWorkerPool;
  private taskTimeout: number = 30000; // 30 seconds

  constructor(maxWorkers: number = 4) {
    this.workerPool = {
      workers: [],
      availableWorkers: [],
      busyWorkers: [],
      taskQueue: [],
      maxWorkers,
      workerScript: this.createWorkerScript(),
    };

    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.workerPool.maxWorkers; i++) {
      this.createWorker();
    }
  }

  /**
   * Create a new Web Worker
   */
  private createWorker(): void {
    try {
      const blob = new Blob([this.workerPool.workerScript], {
        type: "application/javascript",
      });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      // Setup worker message handler
      worker.onmessage = (event) => {
        this.handleWorkerMessage(worker, event.data);
      };

      worker.onerror = (error) => {
        console.error("Worker error:", error);
        this.handleWorkerError(worker, error);
      };

      this.workerPool.workers.push(worker);
      this.workerPool.availableWorkers.push(worker);
    } catch (error) {
      console.error("Failed to create worker:", error);
    }
  }

  /**
   * Create Web Worker script
   */
  private createWorkerScript(): string {
    return `
      // Audio processing Web Worker script
      self.onmessage = async function(event) {
        const { id, type, data } = event.data;

        try {
          let result;

          switch (type) {
            case 'audio_decode':
              result = await decodeAudioData(data.audioData);
              break;
            case 'audio_process':
              result = await processAudioChunks(data.chunks, data.startTime, data.endTime);
              break;
            case 'audio_chunk':
              result = await processAudioChunk(data.chunkData);
              break;
            case 'memory_cleanup':
              result = await performMemoryCleanup();
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }

          self.postMessage({
            id,
            success: true,
            result
          });

        } catch (error) {
          self.postMessage({
            id,
            success: false,
            error: error.message
          });
        }
      };

      async function decodeAudioData(audioData) {
        // In a real implementation, this would decode audio data
        // For now, return a mock result
        return { decoded: true, channels: 2, sampleRate: 44100 };
      }

      async function processAudioChunks(chunks, startTime, endTime) {
        // Process audio chunks and return combined audio data
        // This is a simplified implementation
        const totalDuration = endTime - startTime;
        const sampleRate = 44100;
        const totalSamples = Math.floor(totalDuration * sampleRate);
        const audioData = new ArrayBuffer(totalSamples * 2 * 2); // stereo 16-bit

        return {
          audioData,
          duration: totalDuration,
          sampleRate
        };
      }

      async function processAudioChunk(chunkData) {
        // Process individual audio chunk
        return { processed: true, chunkData };
      }

      async function performMemoryCleanup() {
        // Perform memory cleanup operations
        if (typeof gc !== 'undefined') {
          gc();
        }
        return { cleaned: true };
      }
    `;
  }

  /**
   * Execute a task in the worker pool
   */
  async executeTask(task: WorkerTask): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.rejectTask(task, new Error("Task timeout"));
        reject(new Error("Task timeout"));
      }, task.timeout || this.taskTimeout);

      // Store original callback
      const originalCallback = task.callback;

      // Replace with promise resolver
      task.callback = (result) => {
        clearTimeout(timeoutId);
        originalCallback(result);
        resolve(result);
      };

      // Add task to queue
      this.workerPool.taskQueue.push(task);
      this.processTaskQueue();
    });
  }

  /**
   * Process task queue
   */
  private processTaskQueue(): void {
    if (
      this.workerPool.taskQueue.length === 0 ||
      this.workerPool.availableWorkers.length === 0
    ) {
      return;
    }

    // Sort tasks by priority
    this.workerPool.taskQueue.sort((a, b) => {
      const priorityOrder = {
        [StreamPriority.CRITICAL]: 5,
        [StreamPriority.CURRENT_PLAYBACK]: 4,
        [StreamPriority.HIGH]: 3,
        [StreamPriority.MEDIUM]: 2,
        [StreamPriority.LOW]: 1,
      };

      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const task = this.workerPool.taskQueue.shift()!;
    const worker = this.workerPool.availableWorkers.shift()!;

    this.workerPool.busyWorkers.push(worker);

    // Send task to worker
    worker.postMessage({
      id: task.id,
      type: task.type,
      data: task.data,
    });
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(worker: Worker, data: any): void {
    // Move worker from busy to available
    const busyIndex = this.workerPool.busyWorkers.indexOf(worker);
    if (busyIndex !== -1) {
      this.workerPool.busyWorkers.splice(busyIndex, 1);
      this.workerPool.availableWorkers.push(worker);
    }

    // Find and execute task callback
    const task = this.findTask(data.id);
    if (task) {
      if (data.success) {
        task.callback(data.result);
      } else {
        task.callback({ error: data.error });
      }
    }

    // Continue processing queue
    this.processTaskQueue();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(worker: Worker, error: any): void {
    console.error("Worker error:", error);

    // Remove worker from pool
    this.removeWorker(worker);

    // Create replacement worker
    this.createWorker();

    // Process remaining tasks
    this.processTaskQueue();
  }

  /**
   * Find task by ID
   */
  private findTask(taskId: string): WorkerTask | undefined {
    // This would need proper task tracking implementation
    return undefined;
  }

  /**
   * Reject task
   */
  private rejectTask(task: WorkerTask, error: Error): void {
    // Remove task from queue if it's still there
    const queueIndex = this.workerPool.taskQueue.indexOf(task);
    if (queueIndex !== -1) {
      this.workerPool.taskQueue.splice(queueIndex, 1);
    }

    // Call error callback
    task.callback({ error: error.message });
  }

  /**
   * Remove worker from pool
   */
  private removeWorker(worker: Worker): void {
    worker.terminate();

    const workerIndex = this.workerPool.workers.indexOf(worker);
    if (workerIndex !== -1) {
      this.workerPool.workers.splice(workerIndex, 1);
    }

    const availableIndex = this.workerPool.availableWorkers.indexOf(worker);
    if (availableIndex !== -1) {
      this.workerPool.availableWorkers.splice(availableIndex, 1);
    }

    const busyIndex = this.workerPool.busyWorkers.indexOf(worker);
    if (busyIndex !== -1) {
      this.workerPool.busyWorkers.splice(busyIndex, 1);
    }
  }

  /**
   * Update worker pool size
   */
  updatePoolSize(newSize: number): void {
    const currentSize = this.workerPool.workers.length;

    if (newSize > currentSize) {
      // Add more workers
      for (let i = currentSize; i < newSize; i++) {
        this.createWorker();
      }
    } else if (newSize < currentSize) {
      // Remove excess workers
      const workersToRemove = currentSize - newSize;
      for (let i = 0; i < workersToRemove; i++) {
        if (this.workerPool.availableWorkers.length > 0) {
          const worker = this.workerPool.availableWorkers.pop()!;
          this.removeWorker(worker);
        }
      }
    }

    this.workerPool.maxWorkers = newSize;
  }

  /**
   * Get worker pool statistics
   */
  getStats(): {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
  } {
    return {
      totalWorkers: this.workerPool.workers.length,
      availableWorkers: this.workerPool.availableWorkers.length,
      busyWorkers: this.workerPool.busyWorkers.length,
      queuedTasks: this.workerPool.taskQueue.length,
    };
  }

  /**
   * Cleanup all workers
   */
  cleanup(): void {
    // Terminate all workers
    [...this.workerPool.workers].forEach((worker) => {
      this.removeWorker(worker);
    });

    // Clear task queue
    this.workerPool.taskQueue = [];
  }
}

// Export singleton instances
export const audioBufferMemoryManager = AudioBufferMemoryManager.getInstance();
export const audioBufferPool = new AudioBufferPool();
export const streamingAudioProcessor = StreamingAudioProcessor.getInstance();
