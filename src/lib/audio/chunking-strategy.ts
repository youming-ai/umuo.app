/**
 * Enhanced Audio Chunking Strategy for Memory-Efficient Processing
 *
 * Features:
 * - Intelligent chunk size calculation based on audio characteristics
 * - Memory-aware chunking to optimize for large files
 * - Overlap management for context preservation
 * - Format-specific chunking optimizations
 * - Mobile network condition awareness
 * - Progress tracking support
 * - Integration with streaming audio processor
 * - Adaptive chunk sizing based on available memory
 */

export interface AudioChunk {
  id: string;
  index: number;
  startTime: number; // seconds from start of original audio
  endTime: number; // seconds from start of original audio
  duration: number; // seconds
  size: number; // estimated bytes
  blob?: Blob; // actual audio data
  overlapDuration: number; // seconds of overlap with previous/next chunk
}

export interface ChunkingConfig {
  // Size constraints
  maxChunkDuration: number; // seconds
  minChunkDuration: number; // seconds
  maxChunkSize: number; // bytes
  overlapDuration: number; // seconds

  // Quality settings
  targetQuality: "low" | "medium" | "high" | "auto";
  preserveContext: boolean;

  // Network optimization
  mobileOptimized: boolean;
  networkType: "wifi" | "cellular" | "unknown";

  // Processing preferences
  preferSmallerChunks: boolean;
  maxConcurrency: number;

  // Memory optimization settings
  memoryAwareChunking: boolean;
  maxMemoryUsage: number; // MB
  adaptiveChunkSize: boolean;
  streamingEnabled: boolean;
  bufferPoolSize: number;
  cleanupThreshold: number; // percentage
}

// Memory-aware chunking result
export interface MemoryAwareChunkingResult extends ChunkingResult {
  memoryEstimate: {
    totalMemoryRequired: number; // MB
    peakMemoryUsage: number; // MB
    recommendedPoolSize: number;
    cleanupIntervals: number[]; // chunk indices where cleanup should occur
  };
  streamingInfo: {
    requiresStreaming: boolean;
    recommendedPreloadSize: number;
    adaptiveQualityEnabled: boolean;
  };
}

export interface ChunkingResult {
  chunks: AudioChunk[];
  totalChunks: number;
  totalDuration: number;
  estimatedProcessingTime: number; // seconds
  recommendedConcurrency: number;
  networkOptimized: boolean;
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkDuration: parseInt(process.env.GROQ_MAX_CHUNK_DURATION_SEC || "300"), // 5 minutes
  minChunkDuration: parseInt(process.env.GROQ_MIN_CHUNK_DURATION_SEC || "30"), // 30 seconds
  maxChunkSize:
    parseInt(process.env.GROQ_CHUNK_SIZE_THRESHOLD_MB || "15") * 1024 * 1024, // 15MB
  overlapDuration: 5, // 5 seconds overlap
  targetQuality: "auto",
  preserveContext: true,
  mobileOptimized: false,
  networkType: "unknown",
  preferSmallerChunks: false,
  maxConcurrency: parseInt(process.env.GROQ_MAX_CONCURRENCY || "2"),

  // Memory optimization defaults
  memoryAwareChunking: true,
  maxMemoryUsage: 200, // 200MB
  adaptiveChunkSize: true,
  streamingEnabled: true,
  bufferPoolSize: 10,
  cleanupThreshold: 0.8, // 80%
};

/**
 * Intelligent audio chunking strategy that optimizes for transcription quality and performance
 */
export class AudioChunkingStrategy {
  private config: ChunkingConfig;

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  }

  /**
   * Calculate optimal chunking strategy for an audio file
   */
  async calculateChunking(
    audioFile: File,
    audioDuration?: number,
    audioBitrate?: number,
  ): Promise<ChunkingResult> {
    // Detect audio properties if not provided
    const duration =
      audioDuration || (await this.detectAudioDuration(audioFile));
    const bitrate =
      audioBitrate || (await this.detectAudioBitrate(audioFile, duration));

    // Adjust config based on file characteristics
    const optimizedConfig = this.optimizeConfigForFile(
      audioFile,
      duration,
      bitrate,
    );

    // Calculate optimal chunk duration
    const chunkDuration = this.calculateOptimalChunkDuration(
      duration,
      optimizedConfig,
    );

    // Calculate number of chunks needed
    const totalChunks = Math.ceil(duration / chunkDuration);

    // Generate chunks
    const chunks = this.generateChunks(
      duration,
      chunkDuration,
      optimizedConfig,
    );

    // Estimate processing time
    const estimatedProcessingTime = this.estimateProcessingTime(
      chunks,
      optimizedConfig,
    );

    // Determine optimal concurrency
    const recommendedConcurrency = this.calculateOptimalConcurrency(
      chunks.length,
      optimizedConfig,
    );

    return {
      chunks,
      totalChunks: chunks.length,
      totalDuration: duration,
      estimatedProcessingTime,
      recommendedConcurrency,
      networkOptimized: optimizedConfig.mobileOptimized,
    };
  }

  /**
   * Calculate memory-aware chunking strategy for large audio files
   */
  async calculateMemoryAwareChunking(
    audioFile: File,
    audioDuration?: number,
    audioBitrate?: number,
  ): Promise<MemoryAwareChunkingResult> {
    // Get basic chunking result first
    const basicResult = await this.calculateChunking(
      audioFile,
      audioDuration,
      audioBitrate,
    );

    // Detect audio properties if not provided
    const duration =
      audioDuration || (await this.detectAudioDuration(audioFile));
    const bitrate =
      audioBitrate || (await this.detectAudioBitrate(audioFile, duration));

    // Get current memory usage
    const currentMemoryUsage = this.getCurrentMemoryUsage();
    const availableMemory = Math.max(
      0,
      this.config.maxMemoryUsage - currentMemoryUsage,
    );

    // Calculate memory requirements
    const fileSizeMB = audioFile.size / (1024 * 1024);
    const memoryEstimate = this.calculateMemoryRequirements(
      fileSizeMB,
      duration,
      basicResult.chunks.length,
    );

    // Determine if streaming is required
    const requiresStreaming =
      memoryEstimate.totalMemoryRequired > availableMemory ||
      fileSizeMB > 50 || // Large file
      basicResult.chunks.length > 20; // Many chunks

    // Optimize chunk size for memory constraints
    const memoryOptimizedChunks = requiresStreaming
      ? this.optimizeChunksForMemory(basicResult.chunks, availableMemory)
      : basicResult.chunks;

    // Calculate cleanup intervals
    const cleanupIntervals = this.calculateCleanupIntervals(
      memoryOptimizedChunks.length,
      this.config.cleanupThreshold,
    );

    // Determine streaming parameters
    const streamingInfo = this.calculateStreamingInfo(
      requiresStreaming,
      memoryOptimizedChunks,
      availableMemory,
    );

    return {
      chunks: memoryOptimizedChunks,
      totalChunks: memoryOptimizedChunks.length,
      totalDuration: duration,
      estimatedProcessingTime: basicResult.estimatedProcessingTime,
      recommendedConcurrency: this.calculateMemoryAwareConcurrency(
        basicResult.recommendedConcurrency,
        availableMemory,
      ),
      networkOptimized: basicResult.networkOptimized,
      memoryEstimate: {
        ...memoryEstimate,
        cleanupIntervals,
      },
      streamingInfo,
    };
  }

  /**
   * Generate actual audio chunks from a file
   */
  async generateAudioChunks(
    audioFile: File,
    chunkingResult: ChunkingResult,
  ): Promise<AudioChunk[]> {
    const chunks: AudioChunk[] = [];

    for (let i = 0; i < chunkingResult.chunks.length; i++) {
      const chunkSpec = chunkingResult.chunks[i];

      try {
        // Extract audio chunk using Web Audio API or similar
        const chunkBlob = await this.extractAudioChunk(
          audioFile,
          chunkSpec.startTime,
          chunkSpec.endTime,
        );

        chunks.push({
          ...chunkSpec,
          blob: chunkBlob,
          size: chunkBlob.size,
        });
      } catch (error) {
        console.error(`Failed to extract chunk ${i}:`, error);
        // Fallback: create chunk without blob (will be processed server-side)
        chunks.push(chunkSpec);
      }
    }

    return chunks;
  }

  /**
   * Optimize chunking configuration based on file characteristics
   */
  private optimizeConfigForFile(
    file: File,
    duration: number,
    bitrate: number,
  ): ChunkingConfig {
    const config = { ...this.config };

    // Adjust for file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 50) {
      // Very large file - prefer smaller chunks
      config.maxChunkDuration = Math.min(config.maxChunkDuration, 120); // 2 minutes max
      config.preferSmallerChunks = true;
    } else if (fileSizeMB < 5) {
      // Small file - might not need chunking
      config.minChunkDuration = duration;
    }

    // Adjust for audio quality (bitrate)
    if (bitrate > 320) {
      // High quality audio - reduce chunk size to maintain quality
      config.maxChunkSize = Math.min(config.maxChunkSize, 10 * 1024 * 1024); // 10MB
    }

    // Adjust for duration
    if (duration < 60) {
      // Very short audio - don't chunk
      config.minChunkDuration = duration;
    } else if (duration > 1800) {
      // Very long audio (30+ minutes) - use smaller chunks for reliability
      config.maxChunkDuration = Math.min(config.maxChunkDuration, 180); // 3 minutes max
    }

    // Mobile optimizations
    if (config.mobileOptimized || this.isMobileDevice()) {
      config.maxChunkSize = Math.min(config.maxChunkSize, 8 * 1024 * 1024); // 8MB for mobile
      config.maxChunkDuration = Math.min(config.maxChunkDuration, 150); // 2.5 minutes max
      config.overlapDuration = Math.min(config.overlapDuration, 3); // 3 seconds overlap
    }

    // Network type adjustments
    if (config.networkType === "cellular") {
      config.maxChunkSize = Math.min(config.maxChunkSize, 5 * 1024 * 1024); // 5MB for cellular
      config.maxConcurrency = Math.min(config.maxConcurrency, 1); // Sequential processing on cellular
    }

    return config;
  }

  /**
   * Calculate optimal chunk duration based on various factors
   */
  private calculateOptimalChunkDuration(
    totalDuration: number,
    config: ChunkingConfig,
  ): number {
    let chunkDuration = config.maxChunkDuration;

    // Start with maximum chunk duration
    chunkDuration = Math.min(chunkDuration, config.maxChunkDuration);
    chunkDuration = Math.max(chunkDuration, config.minChunkDuration);

    // Adjust for total duration
    if (totalDuration < config.minChunkDuration * 2) {
      // File is too short for multiple chunks
      return totalDuration;
    }

    // Prefer chunk sizes that divide evenly
    const idealChunkCount = Math.ceil(totalDuration / chunkDuration);
    const adjustedDuration = totalDuration / idealChunkCount;

    // Round to reasonable intervals (multiples of 30 seconds)
    const roundedDuration = Math.round(adjustedDuration / 30) * 30;

    return Math.max(
      config.minChunkDuration,
      Math.min(config.maxChunkDuration, roundedDuration),
    );
  }

  /**
   * Generate chunk specifications
   */
  private generateChunks(
    totalDuration: number,
    chunkDuration: number,
    config: ChunkingConfig,
  ): AudioChunk[] {
    const chunks: AudioChunk[] = [];
    let currentTime = 0;
    let chunkIndex = 0;

    while (currentTime < totalDuration) {
      const startTime = currentTime;
      const endTime = Math.min(currentTime + chunkDuration, totalDuration);
      const duration = endTime - startTime;

      // Calculate overlap (except for first chunk)
      const overlapDuration =
        chunkIndex > 0 && config.preserveContext
          ? Math.min(config.overlapDuration, startTime)
          : 0;

      const adjustedStartTime = Math.max(0, startTime - overlapDuration);
      const adjustedDuration = endTime - adjustedStartTime;

      chunks.push({
        id: `chunk_${Date.now()}_${chunkIndex}`,
        index: chunkIndex,
        startTime: adjustedStartTime,
        endTime: endTime,
        duration: adjustedDuration,
        size: this.estimateChunkSize(adjustedDuration, config),
        overlapDuration: overlapDuration,
      });

      currentTime = endTime;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Estimate chunk size based on duration and quality settings
   */
  private estimateChunkSize(duration: number, config: ChunkingConfig): number {
    // Rough estimation: 128kbps = 16KB per second
    const baseBitrate = 128; // kbps
    const bytesPerSecond = (baseBitrate * 1000) / 8; // Convert to bytes

    let estimatedSize = duration * bytesPerSecond;

    // Adjust for quality settings
    switch (config.targetQuality) {
      case "high":
        estimatedSize *= 2; // Assume higher bitrate
        break;
      case "low":
        estimatedSize *= 0.7; // Assume lower bitrate
        break;
      case "auto":
        // Use file size to estimate quality
        break;
    }

    return Math.min(estimatedSize, config.maxChunkSize);
  }

  /**
   * Estimate total processing time for all chunks
   */
  private estimateProcessingTime(
    chunks: AudioChunk[],
    config: ChunkingConfig,
  ): number {
    // Base processing time: ~1 second per 10 seconds of audio
    const baseProcessingRate = 0.1; // 10% of audio duration

    const totalAudioTime = chunks.reduce(
      (sum, chunk) => sum + chunk.duration,
      0,
    );
    let processingTime = totalAudioTime * baseProcessingRate;

    // Add overhead for chunking and merging
    processingTime += chunks.length * 2; // 2 seconds overhead per chunk

    // Adjust for concurrency
    const concurrency = Math.min(config.maxConcurrency, chunks.length);
    processingTime = processingTime / concurrency;

    // Network delay factor
    if (config.networkType === "cellular") {
      processingTime *= 1.5; // 50% slower on cellular
    }

    return Math.round(processingTime);
  }

  /**
   * Calculate optimal concurrency based on chunk count and system constraints
   */
  private calculateOptimalConcurrency(
    chunkCount: number,
    config: ChunkingConfig,
  ): number {
    let concurrency = config.maxConcurrency;

    // Adjust for chunk count
    if (chunkCount < concurrency) {
      concurrency = chunkCount;
    }

    // Mobile adjustments
    if (config.mobileOptimized) {
      concurrency = Math.min(concurrency, 2); // Limit concurrency on mobile
    }

    // Network adjustments
    if (config.networkType === "cellular") {
      concurrency = 1; // Sequential processing on cellular
    }

    return Math.max(1, concurrency);
  }

  /**
   * Detect audio duration using Web Audio API or fallback methods
   */
  private async detectAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.addEventListener("loadedmetadata", () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration || 0);
      });

      audio.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        // Fallback estimation based on file size
        const estimatedDuration = (file.size / (1024 * 1024)) * 60; // 1 minute per MB
        resolve(estimatedDuration);
      });

      audio.src = url;
    });
  }

  /**
   * Detect audio bitrate (simplified estimation)
   */
  private async detectAudioBitrate(
    file: File,
    duration: number,
  ): Promise<number> {
    // Simple bitrate calculation: file size / duration
    if (duration > 0) {
      const bitsPerSecond = (file.size * 8) / duration;
      return Math.round(bitsPerSecond / 1000); // Convert to kbps
    }

    // Default estimation based on file type
    const extension = file.name.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "mp3":
        return 128;
      case "wav":
        return 1411;
      case "m4a":
        return 256;
      case "flac":
        return 1000;
      default:
        return 192;
    }
  }

  /**
   * Extract audio chunk using Web Audio API
   */
  private async extractAudioChunk(
    audioFile: File,
    startTime: number,
    endTime: number,
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const sampleRate = audioBuffer.sampleRate;
          const startSample = Math.floor(startTime * sampleRate);
          const endSample = Math.floor(endTime * sampleRate);
          const newLength = endSample - startSample;

          // Create new audio buffer for the chunk
          const chunkBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            newLength,
            sampleRate,
          );

          // Copy audio data
          for (
            let channel = 0;
            channel < audioBuffer.numberOfChannels;
            channel++
          ) {
            const channelData = audioBuffer.getChannelData(channel);
            const chunkData = chunkBuffer.getChannelData(channel);

            for (let i = 0; i < newLength; i++) {
              chunkData[i] = channelData[startSample + i];
            }
          }

          // Convert buffer to blob
          const wavBlob = this.audioBufferToWav(chunkBuffer);
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        } finally {
          audioContext.close();
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(audioFile);
    });
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const outputBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(outputBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952);
    // file length
    setUint32(36 + length);
    // RIFF type
    setUint32(0x45564157);
    // format chunk identifier
    setUint32(0x20746d66);
    // format chunk length
    setUint32(16);
    // sample format (raw)
    setUint16(1);
    // channel count
    setUint16(numberOfChannels);
    // sample rate
    setUint32(buffer.sampleRate);
    // byte rate
    setUint32(buffer.sampleRate * 4);
    // block align
    setUint16(numberOfChannels * 2);
    // bits per sample
    setUint16(16);
    // data chunk identifier
    setUint32(0x61746164);
    // data chunk length
    setUint32(length);

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < outputBuffer.byteLength) {
      for (let i = 0; i < numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([outputBuffer], { type: "audio/wav" });
  }

  /**
   * Detect if running on a mobile device
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    if ("memory" in performance && performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0; // Fallback - assume no memory info available
  }

  /**
   * Calculate memory requirements for chunking
   */
  private calculateMemoryRequirements(
    fileSizeMB: number,
    duration: number,
    chunkCount: number,
  ): MemoryAwareChunkingResult["memoryEstimate"] {
    // Estimate memory usage for processing
    const processingOverhead = fileSizeMB * 2.5; // Processing typically uses 2.5x file size
    const bufferMemory = chunkCount * 2; // 2MB per chunk buffer
    const totalMemoryRequired = fileSizeMB + processingOverhead + bufferMemory;

    // Peak memory usage during concurrent processing
    const peakMemoryUsage = totalMemoryRequired * 1.5;

    // Recommended buffer pool size
    const recommendedPoolSize = Math.min(
      Math.max(3, Math.floor(chunkCount / 5)), // 20% of chunks, minimum 3
      10, // Maximum 10 buffers
    );

    return {
      totalMemoryRequired: Math.round(totalMemoryRequired),
      peakMemoryUsage: Math.round(peakMemoryUsage),
      recommendedPoolSize,
      cleanupIntervals: [], // Will be calculated separately
    };
  }

  /**
   * Optimize chunks for memory constraints
   */
  private optimizeChunksForMemory(
    chunks: AudioChunk[],
    availableMemory: number,
  ): AudioChunk[] {
    if (availableMemory <= 0) {
      // Very limited memory - create smaller chunks
      return this.createSmallerChunks(chunks);
    }

    const totalChunkSize =
      chunks.reduce((sum, chunk) => sum + chunk.size, 0) / (1024 * 1024);

    if (totalChunkSize <= availableMemory) {
      return chunks; // Current chunks fit in memory
    }

    // Need to reduce chunk sizes
    const scaleFactor = availableMemory / totalChunkSize;
    return this.resizeChunks(chunks, scaleFactor);
  }

  /**
   * Create smaller chunks from existing chunks
   */
  private createSmallerChunks(chunks: AudioChunk[]): AudioChunk[] {
    const smallerChunks: AudioChunk[] = [];

    for (const chunk of chunks) {
      if (chunk.duration > 60) {
        // Split chunks larger than 1 minute
        const subChunkCount = Math.ceil(chunk.duration / 30); // 30-second sub-chunks
        const subChunkDuration = chunk.duration / subChunkCount;

        for (let i = 0; i < subChunkCount; i++) {
          const startTime = chunk.startTime + i * subChunkDuration;
          const endTime = Math.min(startTime + subChunkDuration, chunk.endTime);

          smallerChunks.push({
            id: `${chunk.id}_${i}`,
            index: smallerChunks.length,
            startTime,
            endTime,
            duration: endTime - startTime,
            size: chunk.size / subChunkCount,
            overlapDuration: chunk.overlapDuration,
          });
        }
      } else {
        smallerChunks.push(chunk);
      }
    }

    return smallerChunks;
  }

  /**
   * Resize chunks by scaling factor
   */
  private resizeChunks(
    chunks: AudioChunk[],
    scaleFactor: number,
  ): AudioChunk[] {
    return chunks.map((chunk, index) => ({
      ...chunk,
      id: `${chunk.id}_resized`,
      index,
      size: chunk.size * scaleFactor,
      duration: chunk.duration * Math.max(0.5, scaleFactor), // Don't make chunks too short
    }));
  }

  /**
   * Calculate cleanup intervals for memory management
   */
  private calculateCleanupIntervals(
    chunkCount: number,
    cleanupThreshold: number,
  ): number[] {
    const intervals: number[] = [];
    const cleanupInterval = Math.floor(chunkCount * cleanupThreshold);

    for (let i = cleanupInterval; i < chunkCount; i += cleanupInterval) {
      intervals.push(i);
    }

    return intervals;
  }

  /**
   * Calculate streaming information
   */
  private calculateStreamingInfo(
    requiresStreaming: boolean,
    chunks: AudioChunk[],
    availableMemory: number,
  ): MemoryAwareChunkingResult["streamingInfo"] {
    return {
      requiresStreaming,
      recommendedPreloadSize: requiresStreaming
        ? Math.max(1, Math.min(3, Math.floor(availableMemory / 20))) // Preload based on available memory
        : chunks.length, // Load all if not streaming
      adaptiveQualityEnabled: availableMemory < 50, // Enable adaptive quality for low memory
    };
  }

  /**
   * Calculate memory-aware concurrency
   */
  private calculateMemoryAwareConcurrency(
    baseConcurrency: number,
    availableMemory: number,
  ): number {
    if (availableMemory < 20) {
      return 1; // Sequential processing for very low memory
    } else if (availableMemory < 50) {
      return Math.max(1, Math.floor(baseConcurrency / 2)); // Reduced concurrency
    } else {
      return baseConcurrency; // Full concurrency for sufficient memory
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ChunkingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ChunkingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Convenience function to create chunking strategy optimized for transcription
 */
export function createTranscriptionChunkingStrategy(
  options?: Partial<ChunkingConfig>,
): AudioChunkingStrategy {
  return new AudioChunkingStrategy({
    ...options,
    targetQuality: "high", // High quality for transcription
    preserveContext: true, // Important for transcription accuracy
    overlapDuration: 5, // 5 seconds overlap for context
  });
}

/**
 * Convenience function to create chunking strategy optimized for mobile
 */
export function createMobileChunkingStrategy(
  networkType: "wifi" | "cellular" | "unknown" = "unknown",
): AudioChunkingStrategy {
  return new AudioChunkingStrategy({
    mobileOptimized: true,
    networkType,
    maxChunkSize:
      networkType === "cellular" ? 5 * 1024 * 1024 : 8 * 1024 * 1024,
    maxChunkDuration: networkType === "cellular" ? 120 : 150,
    overlapDuration: 3,
    maxConcurrency: networkType === "cellular" ? 1 : 2,
    preferSmallerChunks: true,
    // Memory optimizations for mobile
    memoryAwareChunking: true,
    maxMemoryUsage: networkType === "cellular" ? 100 : 150,
    adaptiveChunkSize: true,
    streamingEnabled: true,
    bufferPoolSize: 5,
    cleanupThreshold: 0.7,
  });
}

/**
 * Convenience function to create memory-optimized chunking strategy for large files
 */
export function createMemoryOptimizedChunkingStrategy(
  maxMemoryUsage: number = 200,
  enableStreaming: boolean = true,
): AudioChunkingStrategy {
  return new AudioChunkingStrategy({
    memoryAwareChunking: true,
    maxMemoryUsage,
    adaptiveChunkSize: true,
    streamingEnabled: enableStreaming,
    bufferPoolSize: Math.max(3, Math.floor(maxMemoryUsage / 20)),
    cleanupThreshold: 0.8,
    maxChunkSize: Math.min(
      10 * 1024 * 1024,
      (maxMemoryUsage * 1024 * 1024) / 10,
    ), // 10% of memory
    maxChunkDuration: 120, // 2 minutes max for memory efficiency
    overlapDuration: 3,
    preferSmallerChunks: true,
    maxConcurrency: Math.max(1, Math.floor(maxMemoryUsage / 50)), // 1 concurrent per 50MB
  });
}
