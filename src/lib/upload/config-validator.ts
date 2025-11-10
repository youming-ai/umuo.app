/**
 * Configuration Validator for Chunked Upload System
 *
 * This module provides validation and sanitization for upload configuration
 * to ensure optimal performance and prevent common configuration issues.
 */

import type {
  UploadConfig,
  ChunkManagerConfig,
  NetworkOptimizerConfig,
  ResumeManagerConfig,
  ChunkedUploaderOptions,
} from "@/types/upload";

export class UploadConfigValidator {
  private static instance: UploadConfigValidator;
  private validationRules: ValidationRule[] = [];

  private constructor() {
    this.initializeValidationRules();
  }

  public static getInstance(): UploadConfigValidator {
    if (!UploadConfigValidator.instance) {
      UploadConfigValidator.instance = new UploadConfigValidator();
    }
    return UploadConfigValidator.instance;
  }

  /**
   * Validate and sanitize upload configuration
   */
  public validateUploadConfig(config: Partial<UploadConfig>): ValidationResult<UploadConfig> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitized = { ...config };

    // Apply validation rules
    for (const rule of this.validationRules) {
      if (rule.target === 'uploadConfig') {
        const result = rule.validator(sanitized);
        if (!result.isValid) {
          errors.push(...result.errors);
        }
        warnings.push(...result.warnings);
      }
    }

    // Apply sanitization
    this.sanitizeUploadConfig(sanitized);

    // Check for conflicts between settings
    this.checkUploadConfigConflicts(sanitized, warnings);

    const isValid = errors.length === 0;

    return {
      isValid,
      data: sanitized as UploadConfig,
      errors,
      warnings,
    };
  }

  /**
   * Validate chunk manager configuration
   */
  public validateChunkManagerConfig(config: ChunkManagerConfig): ValidationResult<ChunkManagerConfig> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitized = { ...config };

    // Memory limits
    if (sanitized.maxMemoryUsage < 10 * 1024 * 1024) { // Less than 10MB
      errors.push({
        code: 'MIN_MEMORY_LIMIT',
        message: 'Memory usage limit should be at least 10MB for optimal performance',
        field: 'maxMemoryUsage',
        value: sanitized.maxMemoryUsage,
        recommended: '50 * 1024 * 1024', // 50MB
      });
    }

    if (sanitized.maxMemoryUsage > 1024 * 1024 * 1024) { // More than 1GB
      warnings.push({
        code: 'HIGH_MEMORY_LIMIT',
        message: 'High memory usage limit may cause performance issues on mobile devices',
        field: 'maxMemoryUsage',
        value: sanitized.maxMemoryUsage,
        recommended: '256 * 1024 * 1024', // 256MB
      });
    }

    // GC threshold
    if (sanitized.gcThreshold < 0.5 || sanitized.gcThreshold > 0.95) {
      errors.push({
        code: 'INVALID_GC_THRESHOLD',
        message: 'GC threshold should be between 0.5 and 0.95',
        field: 'gcThreshold',
        value: sanitized.gcThreshold,
        recommended: '0.8',
      });
    }

    // Compression settings
    if (sanitized.compressionLevel < 1 || sanitized.compressionLevel > 9) {
      errors.push({
        code: 'INVALID_COMPRESSION_LEVEL',
        message: 'Compression level should be between 1 and 9',
        field: 'compressionLevel',
        value: sanitized.compressionLevel,
        recommended: '6',
      });
    }

    // Apply sanitization
    sanitized.maxMemoryUsage = Math.max(10 * 1024 * 1024, sanitized.maxMemoryUsage);
    sanitized.gcThreshold = Math.max(0.5, Math.min(0.95, sanitized.gcThreshold));
    sanitized.compressionLevel = Math.max(1, Math.min(9, sanitized.compressionLevel));

    const isValid = errors.length === 0;

    return {
      isValid,
      data: sanitized,
      errors,
      warnings,
    };
  }

  /**
   * Validate network optimizer configuration
   */
  public validateNetworkOptimizerConfig(config: NetworkOptimizerConfig): ValidationResult<NetworkOptimizerConfig> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitized = { ...config };

    // Network check interval
    if (sanitized.networkCheckInterval < 5000) { // Less than 5 seconds
      warnings.push({
        code: 'FREQUENT_NETWORK_CHECKS',
        message: 'Frequent network checks may impact performance',
        field: 'networkCheckInterval',
        value: sanitized.networkCheckInterval,
        recommended: '30000', // 30 seconds
      });
    }

    if (sanitized.networkCheckInterval > 300000) { // More than 5 minutes
      warnings.push({
        code: 'INFREQUENT_NETWORK_CHECKS',
        message: 'Infrequent network checks may miss important condition changes',
        field: 'networkCheckInterval',
        value: sanitized.networkCheckInterval,
        recommended: '60000', // 1 minute
      });
    }

    // Speed thresholds
    if (sanitized.speedThresholds.slow >= sanitized.speedThresholds.medium) {
      errors.push({
        code: 'INVALID_SPEED_THRESHOLDS',
        message: 'Slow speed threshold must be less than medium speed threshold',
        field: 'speedThresholds',
        value: sanitized.speedThresholds,
      });
    }

    if (sanitized.speedThresholds.medium >= sanitized.speedThresholds.fast) {
      errors.push({
        code: 'INVALID_SPEED_THRESHOLDS',
        message: 'Medium speed threshold must be less than fast speed threshold',
        field: 'speedThresholds',
        value: sanitized.speedThresholds,
      });
    }

    // Chunk size mapping
    if (sanitized.chunkSizeMapping.slow > sanitized.chunkSizeMapping.medium) {
      errors.push({
        code: 'INVALID_CHUNK_SIZE_MAPPING',
        message: 'Slow network chunk size should be smaller than medium network chunk size',
        field: 'chunkSizeMapping',
        value: sanitized.chunkSizeMapping,
      });
    }

    if (sanitized.chunkSizeMapping.medium > sanitized.chunkSizeMapping.fast) {
      errors.push({
        code: 'INVALID_CHUNK_SIZE_MAPPING',
        message: 'Medium network chunk size should be smaller than fast network chunk size',
        field: 'chunkSizeMapping',
        value: sanitized.chunkSizeMapping,
      });
    }

    // Apply sanitization
    sanitized.networkCheckInterval = Math.max(5000, Math.min(300000, sanitized.networkCheckInterval));

    const isValid = errors.length === 0;

    return {
      isValid,
      data: sanitized,
      errors,
      warnings,
    };
  }

  /**
   * Validate resume manager configuration
   */
  public validateResumeManagerConfig(config: ResumeManagerConfig): ValidationResult<ResumeManagerConfig> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitized = { ...config };

    // Storage size limits
    if (sanitized.maxStorageSize < 1024 * 1024) { // Less than 1MB
      warnings.push({
        code: 'LOW_STORAGE_LIMIT',
        message: 'Low storage limit may limit resume functionality',
        field: 'maxStorageSize',
        value: sanitized.maxStorageSize,
        recommended: '10 * 1024 * 1024', // 10MB
      });
    }

    if (sanitized.maxStorageSize > 100 * 1024 * 1024) { // More than 100MB
      warnings.push({
        code: 'HIGH_STORAGE_LIMIT',
        message: 'High storage limit may impact browser storage quota',
        field: 'maxStorageSize',
        value: sanitized.maxStorageSize,
        recommended: '20 * 1024 * 1024', // 20MB
      });
    }

    // Cleanup interval
    if (sanitized.cleanupInterval < 60000) { // Less than 1 minute
      warnings.push({
        code: 'FREQUENT_CLEANUP',
        message: 'Frequent cleanup may impact performance',
        field: 'cleanupInterval',
        value: sanitized.cleanupInterval,
        recommended: '3600000', // 1 hour
      });
    }

    // Max resume age
    if (sanitized.maxResumeAge > 7 * 24 * 60 * 60 * 1000) { // More than 7 days
      warnings.push({
        code: 'LONG_RESUME_AGE',
        message: 'Very long resume age may store outdated data',
        field: 'maxResumeAge',
        value: sanitized.maxResumeAge,
        recommended: '86400000', // 24 hours
      });
    }

    // Apply sanitization
    sanitized.cleanupInterval = Math.max(60000, sanitized.cleanupInterval);
    sanitized.maxResumeAge = Math.max(60000, sanitized.maxResumeAge);

    const isValid = errors.length === 0;

    return {
      isValid,
      data: sanitized,
      errors,
      warnings,
    };
  }

  /**
   * Validate complete chunked uploader options
   */
  public validateChunkedUploaderOptions(options: ChunkedUploaderOptions): ValidationResult<ChunkedUploaderOptions> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitized = { ...options };

    // Validate upload config
    if (options.config) {
      const configResult = this.validateUploadConfig(options.config);
      if (!configResult.isValid) {
        errors.push(...configResult.errors);
      }
      warnings.push(...configResult.warnings);
      sanitized.config = configResult.data;
    }

    // Check callback types
    if (options.onProgress && typeof options.onProgress !== 'function') {
      errors.push({
        code: 'INVALID_CALLBACK',
        message: 'onProgress must be a function',
        field: 'onProgress',
        value: typeof options.onProgress,
      });
    }

    if (options.onComplete && typeof options.onComplete !== 'function') {
      errors.push({
        code: 'INVALID_CALLBACK',
        message: 'onComplete must be a function',
        field: 'onComplete',
        value: typeof options.onComplete,
      });
    }

    if (options.onError && typeof options.onError !== 'function') {
      errors.push({
        code: 'INVALID_CALLBACK',
        message: 'onError must be a function',
        field: 'onError',
        value: typeof options.onError,
      });
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      data: sanitized,
      errors,
      warnings,
    };
  }

  /**
   * Get recommended configuration based on device capabilities
   */
  public getRecommendedConfig(deviceInfo?: Partial<DeviceInfo>): UploadConfig {
    const isMobile = deviceInfo?.isMobile ?? this.detectMobileDevice();
    const isSlowConnection = deviceInfo?.isSlowConnection ?? false;
    const hasLimitedStorage = deviceInfo?.hasLimitedStorage ?? isMobile;

    const baseConfig: UploadConfig = {
      chunkSize: 1024 * 1024, // 1MB
      maxConcurrentUploads: 3,
      maxRetries: 3,
      retryDelay: 1000,
      retryBackoffMultiplier: 2,
      networkTimeout: 30000,
      enableResume: true,
      enableAdaptiveChunking: true,
      minChunkSize: 256 * 1024,
      maxChunkSize: 10 * 1024 * 1024,
      verifyChunks: true,
      compressionEnabled: false,
      endpointUrl: "/api/upload/chunk",
    };

    // Adjust for mobile devices
    if (isMobile) {
      baseConfig.chunkSize = 512 * 1024; // 512KB
      baseConfig.maxConcurrentUploads = 2;
      baseConfig.maxChunkSize = 5 * 1024 * 1024; // 5MB
      baseConfig.networkTimeout = 45000; // 45 seconds
    }

    // Adjust for slow connections
    if (isSlowConnection) {
      baseConfig.chunkSize = 256 * 1024; // 256KB
      baseConfig.maxConcurrentUploads = 1;
      baseConfig.retryDelay = 2000;
      baseConfig.retryBackoffMultiplier = 2.5;
    }

    // Adjust for limited storage
    if (hasLimitedStorage) {
      baseConfig.enableResume = false; // Disable resume to save storage
      baseConfig.verifyChunks = false; // Skip verification to save memory
    }

    return baseConfig;
  }

  // Private methods

  private initializeValidationRules(): void {
    // Upload size validation
    this.validationRules.push({
      target: 'uploadConfig',
      validator: (config: Partial<UploadConfig>) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (config.chunkSize && config.chunkSize < 64 * 1024) { // Less than 64KB
          errors.push({
            code: 'CHUNK_SIZE_TOO_SMALL',
            message: 'Chunk size is too small, may cause performance issues',
            field: 'chunkSize',
            value: config.chunkSize,
            recommended: '1024 * 1024', // 1MB
          });
        }

        if (config.chunkSize && config.chunkSize > 50 * 1024 * 1024) { // More than 50MB
          warnings.push({
            code: 'CHUNK_SIZE_TOO_LARGE',
            message: 'Large chunk size may cause timeout issues on unstable connections',
            field: 'chunkSize',
            value: config.chunkSize,
            recommended: '10 * 1024 * 1024', // 10MB
          });
        }

        if (config.maxConcurrentUploads && config.maxConcurrentUploads > 10) {
          warnings.push({
            code: 'HIGH_CONCURRENT_UPLOADS',
            message: 'High concurrent upload count may overwhelm the server',
            field: 'maxConcurrentUploads',
            value: config.maxConcurrentUploads,
            recommended: '3',
          });
        }

        return { isValid: errors.length === 0, errors, warnings };
      },
    });

    // Timeout validation
    this.validationRules.push({
      target: 'uploadConfig',
      validator: (config: Partial<UploadConfig>) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        if (config.networkTimeout && config.networkTimeout < 5000) { // Less than 5 seconds
          errors.push({
            code: 'TIMEOUT_TOO_SHORT',
            message: 'Network timeout is too short, may cause premature failures',
            field: 'networkTimeout',
            value: config.networkTimeout,
            recommended: '30000', // 30 seconds
          });
        }

        if (config.networkTimeout && config.networkTimeout > 300000) { // More than 5 minutes
          warnings.push({
            code: 'TIMEOUT_TOO_LONG',
            message: 'Very long timeout may delay error detection',
            field: 'networkTimeout',
            value: config.networkTimeout,
            recommended: '60000', // 1 minute
          });
        }

        return { isValid: errors.length === 0, errors, warnings };
      },
    });
  }

  private sanitizeUploadConfig(config: Partial<UploadConfig>): void {
    // Sanitize chunk size
    if (config.chunkSize) {
      config.chunkSize = Math.max(64 * 1024, Math.min(50 * 1024 * 1024, config.chunkSize));
    }

    // Sanitize concurrent uploads
    if (config.maxConcurrentUploads) {
      config.maxConcurrentUploads = Math.max(1, Math.min(10, config.maxConcurrentUploads));
    }

    // Sanitize retry settings
    if (config.maxRetries) {
      config.maxRetries = Math.max(0, Math.min(10, config.maxRetries));
    }

    if (config.retryDelay) {
      config.retryDelay = Math.max(100, Math.min(60000, config.retryDelay));
    }

    if (config.retryBackoffMultiplier) {
      config.retryBackoffMultiplier = Math.max(1, Math.min(5, config.retryBackoffMultiplier));
    }

    // Sanitize timeout
    if (config.networkTimeout) {
      config.networkTimeout = Math.max(5000, Math.min(300000, config.networkTimeout));
    }

    // Ensure min/max chunk size consistency
    if (config.minChunkSize && config.maxChunkSize && config.minChunkSize > config.maxChunkSize) {
      const temp = config.minChunkSize;
      config.minChunkSize = config.maxChunkSize;
      config.maxChunkSize = temp;
    }
  }

  private checkUploadConfigConflicts(config: Partial<UploadConfig>, warnings: ValidationWarning[]): void {
    // Check for conflicting settings
    if (config.enableAdaptiveChunking && config.chunkSize && config.chunkSize > 20 * 1024 * 1024) {
      warnings.push({
        code: 'ADAPTIVE_CHUNKING_CONFLICT',
        message: 'Large chunk size may limit the benefits of adaptive chunking',
        field: 'chunkSize',
        value: config.chunkSize,
      });
    }

    if (config.enableResume && !config.verifyChunks) {
      warnings.push({
        code: 'RESUME_VERIFICATION_CONFLICT',
        message: 'Resume without chunk verification may lead to corrupted files',
        fields: ['enableResume', 'verifyChunks'],
      });
    }

    if (config.compressionEnabled && config.maxConcurrentUploads && config.maxConcurrentUploads > 5) {
      warnings.push({
        code: 'COMPRESSION_CONCURRENT_CONFLICT',
        message: 'Compression with many concurrent uploads may impact performance',
        fields: ['compressionEnabled', 'maxConcurrentUploads'],
      });
    }
  }

  private detectMobileDevice(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }
}

// Supporting interfaces

interface ValidationRule {
  target: 'uploadConfig' | 'chunkManager' | 'networkOptimizer' | 'resumeManager';
  validator: (config: any) => { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] };
}

interface ValidationError {
  code: string;
  message: string;
  field: string;
  value: any;
  recommended?: string;
  fields?: string[]; // For multi-field errors
}

interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  value?: any;
  recommended?: string;
  fields?: string[]; // For multi-field warnings
}

interface ValidationResult<T> {
  isValid: boolean;
  data: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface DeviceInfo {
  isMobile: boolean;
  isSlowConnection: boolean;
  hasLimitedStorage: boolean;
  memoryInfo?: {
    deviceMemory: number;
    totalJSHeapSize: number;
  };
}

export default UploadConfigValidator;
