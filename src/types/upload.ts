/**
 * Type definitions for chunked file upload system
 */

export interface ChunkInfo {
  id: string;
  index: number;
  start: number;
  end: number;
  size: number;
  data?: Blob;
  hash?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'retrying';
  retryCount: number;
  uploadStartedAt?: number;
  uploadCompletedAt?: number;
  error?: string;
}

export interface UploadSession {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  uploadedChunks: number;
  uploadedSize: number;
  status: 'preparing' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  chunks: Map<string, ChunkInfo>;
  metadata: Record<string, any>;
  config: UploadConfig;
}

export interface UploadConfig {
  chunkSize: number;
  maxConcurrentUploads: number;
  maxRetries: number;
  retryDelay: number;
  retryBackoffMultiplier: number;
  networkTimeout: number;
  enableResume: boolean;
  enableAdaptiveChunking: boolean;
  minChunkSize: number;
  maxChunkSize: number;
  verifyChunks: boolean;
  compressionEnabled: boolean;
  endpointUrl: string;
  headers?: Record<string, string>;
}

export interface NetworkCondition {
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number; // Mbps
  rtt: number; // Round-trip time in ms
  saveData: boolean;
  lastUpdated: number;
}

export interface UploadProgress {
  sessionId: string;
  fileId: string;
  fileName: string;
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  chunksCompleted: number;
  totalChunks: number;
  currentChunkIndex?: number;
  stage: 'preparing' | 'uploading' | 'verifying' | 'assembling' | 'completed' | 'error';
}

export interface ChunkUploadResponse {
  success: boolean;
  chunkId: string;
  uploadId?: string;
  etag?: string;
  error?: string;
  retryable?: boolean;
}

export interface ResumeState {
  sessionId: string;
  completedChunks: string[];
  failedChunks: string[];
  uploadProgress: UploadProgress;
  lastSavedAt: number;
  config: UploadConfig;
}

export interface UploadError extends Error {
  code: string;
  sessionId: string;
  chunkId?: string;
  retryable: boolean;
  recoverable: boolean;
  metadata?: Record<string, any>;
}

export interface UploadEvent {
  type: 'start' | 'progress' | 'chunk_complete' | 'chunk_failed' | 'pause' | 'resume' | 'complete' | 'error' | 'cancel';
  sessionId: string;
  timestamp: number;
  data?: any;
}

export interface PerformanceMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalBytes: number;
  uploadSpeed: number; // bytes per second
  averageChunkTime: number; // milliseconds
  retryCount: number;
  networkSwitches: number;
  pauseDuration: number; // total time spent paused
  compressionRatio?: number;
  efficiency: number; // ratio of actual data to overhead
}

export interface ChunkedUploaderOptions {
  config?: Partial<UploadConfig>;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (sessionId: string, response: any) => void;
  onError?: (error: UploadError) => void;
  onChunkComplete?: (chunk: ChunkInfo) => void;
  onChunkFailed?: (chunk: ChunkInfo, error: UploadError) => void;
  onPause?: (sessionId: string) => void;
  onResume?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  enableLogging?: boolean;
  persistState?: boolean;
}

export interface ChunkManagerConfig {
  maxSize: number;
  maxMemoryUsage: number;
  gcThreshold: number;
  enableCompression: boolean;
  compressionLevel: number;
}

export interface NetworkOptimizerConfig {
  enableAdaptiveSizing: boolean;
  networkCheckInterval: number;
  speedThresholds: {
    slow: number; // Mbps
    medium: number; // Mbps
    fast: number; // Mbps
  };
  chunkSizeMapping: {
    slow: number;
    medium: number;
    fast: number;
  };
}

export interface ResumeManagerConfig {
  storageKey: string;
  maxStorageSize: number;
  cleanupInterval: number;
  maxResumeAge: number; // milliseconds
  encryptionEnabled: boolean;
}
