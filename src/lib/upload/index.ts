/**
 * Chunked Upload System - Main Entry Point
 *
 * This module exports all components of the chunked upload system
 * for easy integration into the application.
 */

// Main classes
export { default as ChunkedUploader } from './chunked-uploader';
export { default as ChunkManager } from './chunk-manager';
export { default as ResumeManager } from './resume-manager';
export { default as NetworkOptimizer } from './network-optimizer';
export { default as PerformanceMonitor } from './performance-monitor';
export { default as UploadErrorHandler } from './error-handler';
export { default as UploadConfigValidator } from './config-validator';

// React hooks
export {
  useChunkedUpload,
  useUploadSession,
  useUploadSessions,
  useUploadPerformance,
  useUploadConfig,
  useUploadCleanup,
} from './use-chunked-upload';

// Re-export types
export type {
  ChunkInfo,
  UploadSession,
  UploadConfig,
  NetworkCondition,
  UploadProgress,
  ChunkUploadResponse,
  UploadError,
  UploadEvent,
  PerformanceMetrics,
  ChunkedUploaderOptions,
  ChunkManagerConfig,
  NetworkOptimizerConfig,
  ResumeManagerConfig,
} from '@/types/upload';

// Utility exports
export const DEFAULT_UPLOAD_CONFIG = {
  chunkSize: 1024 * 1024, // 1MB
  maxConcurrentUploads: 3,
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoffMultiplier: 2,
  networkTimeout: 30000,
  enableResume: true,
  enableAdaptiveChunking: true,
  minChunkSize: 256 * 1024, // 256KB
  maxChunkSize: 10 * 1024 * 1024, // 10MB
  verifyChunks: true,
  compressionEnabled: false,
  endpointUrl: "/api/upload/chunk",
};

export const MOBILE_UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIG,
  chunkSize: 512 * 1024, // 512KB for mobile
  maxConcurrentUploads: 2,
  maxChunkSize: 5 * 1024 * 1024, // 5MB for mobile
  networkTimeout: 45000, // 45 seconds
};

export const SLOW_CONNECTION_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIG,
  chunkSize: 256 * 1024, // 256KB for slow connections
  maxConcurrentUploads: 1,
  retryDelay: 2000,
  retryBackoffMultiplier: 2.5,
};

/**
 * Factory function to create an uploader instance with sensible defaults
 */
export function createChunkedUploader(options?: import('./chunked-uploader').ChunkedUploaderOptions) {
  // Detect device characteristics and apply appropriate defaults
  const isMobile = typeof navigator !== 'undefined' && /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());

  let baseConfig = DEFAULT_UPLOAD_CONFIG;

  if (isMobile) {
    baseConfig = MOBILE_UPLOAD_CONFIG;
  }

  const uploaderOptions = {
    config: baseConfig,
    enableLogging: process.env.NODE_ENV === 'development',
    ...options,
  };

  return new ChunkedUploader(uploaderOptions);
}

/**
 * Utility function to validate files before upload
 */
export function validateUploadFiles(files: File[]): {
  valid: File[];
  invalid: { file: File; reason: string }[];
} {
  const valid: File[] = [];
  const invalid: { file: File; reason: string }[] = [];

  for (const file of files) {
    // File size check (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      invalid.push({ file, reason: 'File size exceeds 100MB limit' });
      continue;
    }

    // File type check
    const allowedTypes = [
      'audio/', 'video/', 'image/', 'text/',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowedType && file.type !== '') {
      invalid.push({ file, reason: 'File type not supported' });
      continue;
    }

    valid.push(file);
  }

  return { valid, invalid };
}

/**
 * Utility function to estimate upload time
 */
export function estimateUploadTime(fileSize: number, networkSpeed: number): string {
  const bytesPerSecond = networkSpeed * 1024 * 1024 / 8; // Convert Mbps to bytes/s
  const seconds = fileSize / bytesPerSecond;

  if (seconds < 60) {
    return `${Math.ceil(seconds)} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minutes`;
  } else {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hours`;
  }
}

/**
 * Utility function to format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Utility function to get network-friendly upload configuration
 */
export function getOptimalUploadConfig(): Partial<UploadConfig> {
  // Check if Network Information API is available
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;

    if (connection) {
      const effectiveType = connection.effectiveType;
      const saveData = connection.saveData;

      let config: Partial<UploadConfig> = {};

      // Adjust based on effective connection type
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          config = SLOW_CONNECTION_CONFIG;
          break;
        case '3g':
          config = {
            chunkSize: 512 * 1024, // 512KB
            maxConcurrentUploads: 2,
            networkTimeout: 45000,
          };
          break;
        case '4g':
          config = {
            chunkSize: 2 * 1024 * 1024, // 2MB
            maxConcurrentUploads: 4,
            networkTimeout: 30000,
          };
          break;
        default:
          config = DEFAULT_UPLOAD_CONFIG;
      }

      // Adjust for data saver mode
      if (saveData) {
        config.chunkSize = Math.min(config.chunkSize || 1024 * 1024, 256 * 1024);
        config.compressionEnabled = true;
      }

      return config;
    }
  }

  // Fallback to default configuration
  return DEFAULT_UPLOAD_CONFIG;
}

/**
 * Utility function to create upload error messages for users
 */
export function createUploadErrorMessage(error: UploadError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Network connection lost. Please check your internet connection and try again.';

    case 'TIMEOUT_ERROR':
      return 'Upload timed out. This may be due to a slow connection. Please try again.';

    case 'FILE_TOO_LARGE':
      return 'File is too large. Please choose a smaller file or compress it before uploading.';

    case 'AUTHENTICATION_ERROR':
      return 'Authentication failed. Please log in again and try uploading.';

    case 'SERVER_ERROR':
      return 'Server error occurred. Please try again in a few moments.';

    case 'RATE_LIMIT_ERROR':
      return 'Too many upload attempts. Please wait a moment and try again.';

    case 'STORAGE_ERROR':
      return 'Storage quota exceeded. Please free up some space and try again.';

    case 'VALIDATION_ERROR':
      return 'File validation failed. The file may be corrupted or in an unsupported format.';

    case 'UPLOAD_CANCELLED':
      return 'Upload was cancelled.';

    default:
      return error.message || 'An unknown error occurred during upload.';
  }
}

// Export the main system
export default {
  // Classes
  ChunkedUploader,
  ChunkManager,
  ResumeManager,
  NetworkOptimizer,
  PerformanceMonitor,
  UploadErrorHandler,
  UploadConfigValidator,

  // Hooks
  useChunkedUpload,
  useUploadSession,
  useUploadSessions,
  useUploadPerformance,
  useUploadConfig,
  useUploadCleanup,

  // Utilities
  createChunkedUploader,
  validateUploadFiles,
  estimateUploadTime,
  formatFileSize,
  getOptimalUploadConfig,
  createUploadErrorMessage,

  // Constants
  DEFAULT_UPLOAD_CONFIG,
  MOBILE_UPLOAD_CONFIG,
  SLOW_CONNECTION_CONFIG,
};
