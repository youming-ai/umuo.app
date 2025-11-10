/**
 * Transcription Optimization Configuration Module
 */

import { z } from 'zod';
import type { TranscriptionConfig } from '../types';
import { transcriptionConfigSchema } from '../schemas';
import { getConfigurationManager } from '../manager';

export class TranscriptionConfigManager {
  private configManager = getConfigurationManager();

  /**
   * Get current transcription configuration
   */
  getConfiguration(): TranscriptionConfig {
    return this.configManager.get<TranscriptionConfig>('transcription') || {};
  }

  /**
   * Update transcription configuration
   */
  async updateConfiguration(updates: Partial<TranscriptionConfig>): Promise<void> {
    const validation = transcriptionConfigSchema.partial().safeParse(updates);
    if (!validation.success) {
      throw new Error(`Invalid transcription configuration: ${validation.error.message}`);
    }

    await this.configManager.updateMany(
      Object.entries(updates).map(([key, value]) => ({
        key: `transcription.${key}`,
        value,
        scope: 'user'
      }))
    );
  }

  /**
   * Reset transcription configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfig = transcriptionConfigSchema.parse({});
    await this.configManager.set('transcription', defaultConfig, { scope: 'user', immediate: true });
  }

  /**
   * Get optimized chunk size based on file size and network conditions
   */
  getOptimalChunkSize(fileSize: number, networkType?: string): number {
    const config = this.getConfiguration();

    // Base chunk size from configuration
    let chunkSize = config.defaultChunkSize;

    // Adjust based on file size
    if (fileSize > 100 * 1024 * 1024) { // > 100MB
      chunkSize = Math.min(chunkSize * 2, config.maxChunkSize);
    } else if (fileSize < 10 * 1024 * 1024) { // < 10MB
      chunkSize = Math.max(chunkSize / 2, 2 * 1024 * 1024);
    }

    // Adjust based on network type
    if (networkType === 'slow-3g' || networkType === '2g') {
      chunkSize = Math.max(chunkSize / 2, 1024 * 1024);
    } else if (networkType === '4g' || networkType === 'wifi') {
      chunkSize = Math.min(chunkSize * 1.5, config.maxChunkSize);
    }

    // Ensure it's within bounds
    return Math.max(1 * 1024 * 1024, Math.min(chunkSize, config.maxChunkSize));
  }

  /**
   * Get concurrency settings based on system capabilities
   */
  getOptimalConcurrency(fileCount: number, systemCapabilities?: {
    cpuCores?: number;
    memory?: number;
    batteryLevel?: number;
    isLowPowerMode?: boolean;
  }): number {
    const config = this.getConfiguration();
    let concurrency = config.maxConcurrency;

    // Adjust based on system capabilities
    if (systemCapabilities) {
      const { cpuCores = 4, memory = 8, batteryLevel = 1, isLowPowerMode = false } = systemCapabilities;

      // Reduce concurrency on low-end devices
      if (cpuCores <= 2 || memory <= 4) {
        concurrency = Math.max(1, Math.floor(concurrency / 2));
      }

      // Reduce concurrency on low battery or power saving mode
      if (batteryLevel < 0.2 || isLowPowerMode) {
        concurrency = 1;
      }

      // Increase concurrency for high-end devices with many files
      if (cpuCores >= 8 && memory >= 16 && fileCount > 5) {
        concurrency = Math.min(concurrency + 1, config.maxConcurrency);
      }
    }

    return Math.max(1, concurrency);
  }

  /**
   * Get retry strategy configuration
   */
  getRetryStrategy(): {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
    jitter: boolean;
  } {
    const config = this.getConfiguration();

    return {
      maxAttempts: config.retryAttempts,
      baseDelay: config.retryDelay,
      maxDelay: config.retryDelay * 8, // Exponential backoff cap
      backoffFactor: 2,
      jitter: true
    };
  }

  /**
   * Get timeout settings for different operations
   */
  getTimeouts(): {
    transcription: number;
    upload: number;
    processing: number;
    network: number;
  } {
    const config = this.getConfiguration();

    return {
      transcription: config.timeout,
      upload: config.timeout * 0.3, // 30% of transcription timeout
      processing: config.timeout * 0.8, // 80% of transcription timeout
      network: config.timeout * 0.1, // 10% of transcription timeout
    };
  }

  /**
   * Get progress tracking configuration
   */
  getProgressTracking(): {
    enabled: boolean;
    updateInterval: number;
    enableWordTimestamps: boolean;
    enableDetailedMetrics: boolean;
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.enableProgressTracking,
      updateInterval: config.progressUpdateInterval,
      enableWordTimestamps: config.enableWordTimestamps,
      enableDetailedMetrics: config.enableProgressTracking
    };
  }

  /**
   * Validate transcription parameters
   */
  validateParameters(params: {
    chunkSize?: number;
    concurrency?: number;
    timeout?: number;
    retryAttempts?: number;
  }): { valid: boolean; errors: string[] } {
    const config = this.getConfiguration();
    const errors: string[] = [];

    if (params.chunkSize !== undefined) {
      if (params.chunkSize < 1024 * 1024) {
        errors.push('Chunk size must be at least 1MB');
      }
      if (params.chunkSize > config.maxChunkSize) {
        errors.push(`Chunk size cannot exceed ${config.maxChunkSize / (1024 * 1024)}MB`);
      }
    }

    if (params.concurrency !== undefined) {
      if (params.concurrency < 1) {
        errors.push('Concurrency must be at least 1');
      }
      if (params.concurrency > config.maxConcurrency) {
        errors.push(`Concurrency cannot exceed ${config.maxConcurrency}`);
      }
    }

    if (params.timeout !== undefined) {
      if (params.timeout < 30000) {
        errors.push('Timeout must be at least 30 seconds');
      }
      if (params.timeout > 600000) {
        errors.push('Timeout cannot exceed 10 minutes');
      }
    }

    if (params.retryAttempts !== undefined) {
      if (params.retryAttempts < 0) {
        errors.push('Retry attempts cannot be negative');
      }
      if (params.retryAttempts > 5) {
        errors.push('Retry attempts cannot exceed 5');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get model configuration for specific use cases
   */
  getModelConfiguration(useCase: 'general' | 'accuracy' | 'speed' | 'mobile'): {
    model: string;
    temperature: number;
    languageDetection: boolean;
    responseFormat: string;
  } {
    const config = this.getConfiguration();

    switch (useCase) {
      case 'accuracy':
        return {
          model: 'whisper-large-v3',
          temperature: 0.1,
          languageDetection: config.languageDetection,
          responseFormat: 'verbose_json'
        };

      case 'speed':
        return {
          model: 'whisper-large-v3-turbo',
          temperature: 0,
          languageDetection: false,
          responseFormat: 'json'
        };

      case 'mobile':
        return {
          model: 'whisper-large-v3-turbo',
          temperature: 0.2,
          languageDetection: true,
          responseFormat: 'verbose_json'
        };

      default: // general
        return {
          model: config.model,
          temperature: config.temperature,
          languageDetection: config.languageDetection,
          responseFormat: config.responseFormat
        };
    }
  }

  /**
   * Export transcription configuration
   */
  async exportConfiguration(): Promise<string> {
    const config = this.getConfiguration();
    return JSON.stringify({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      configuration: config,
      metadata: {
        description: 'Transcription optimization configuration',
        exportedBy: 'ConfigurationManager'
      }
    }, null, 2);
  }

  /**
   * Import transcription configuration
   */
  async importConfiguration(data: string, options: {
    overwrite?: boolean;
    validateOnly?: boolean;
  } = {}): Promise<void> {
    const { overwrite = true, validateOnly = false } = options;

    try {
      const importData = JSON.parse(data);

      // Validate imported configuration
      const validation = transcriptionConfigSchema.safeParse(importData.configuration);
      if (!validation.success) {
        throw new Error(`Invalid transcription configuration: ${validation.error.message}`);
      }

      if (validateOnly) {
        return;
      }

      if (overwrite) {
        await this.configManager.set('transcription', validation.data, {
          scope: 'user',
          immediate: true
        });
      } else {
        await this.updateConfiguration(validation.data);
      }

    } catch (error) {
      throw new Error(`Failed to import transcription configuration: ${error}`);
    }
  }

  /**
   * Get configuration for specific environment
   */
  getEnvironmentConfig(environment: 'development' | 'staging' | 'production'): Partial<TranscriptionConfig> {
    switch (environment) {
      case 'development':
        return {
          maxConcurrency: 1,
          defaultChunkSize: 5 * 1024 * 1024,
          enableProgressTracking: true,
          progressUpdateInterval: 1000,
          timeout: 60000,
          retryAttempts: 1
        };

      case 'staging':
        return {
          maxConcurrency: 2,
          defaultChunkSize: 10 * 1024 * 1024,
          enableProgressTracking: true,
          progressUpdateInterval: 2000,
          timeout: 120000,
          retryAttempts: 2
        };

      case 'production':
        return {
          maxConcurrency: 3,
          defaultChunkSize: 15 * 1024 * 1024,
          enableProgressTracking: true,
          progressUpdateInterval: 3000,
          timeout: 300000,
          retryAttempts: 3
        };

      default:
        return {};
    }
  }

  /**
   * Optimize configuration based on usage patterns
   */
  optimizeForUsagePatterns(patterns: {
    averageFileSize: number;
    fileCountPerSession: number;
    networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
    devicePerformance: 'high' | 'medium' | 'low';
    userPriority: 'speed' | 'accuracy' | 'balanced';
  }): Partial<TranscriptionConfig> {
    const optimizations: Partial<TranscriptionConfig> = {};

    // Optimize based on file sizes
    if (patterns.averageFileSize > 50 * 1024 * 1024) {
      optimizations.defaultChunkSize = 20 * 1024 * 1024;
      optimizations.maxChunkSize = 50 * 1024 * 1024;
    } else if (patterns.averageFileSize < 5 * 1024 * 1024) {
      optimizations.defaultChunkSize = 3 * 1024 * 1024;
    }

    // Optimize based on file count
    if (patterns.fileCountPerSession > 10) {
      optimizations.maxConcurrency = patterns.devicePerformance === 'high' ? 4 : 2;
    } else if (patterns.fileCountPerSession <= 2) {
      optimizations.maxConcurrency = 1;
    }

    // Optimize based on network quality
    if (patterns.networkQuality === 'poor') {
      optimizations.defaultChunkSize = Math.max(optimizations.defaultChunkSize || 10 * 1024 * 1024, 5 * 1024 * 1024);
      optimizations.retryAttempts = 4;
      optimizations.retryDelay = 2000;
    } else if (patterns.networkQuality === 'excellent') {
      optimizations.defaultChunkSize = Math.min(optimizations.defaultChunkSize || 10 * 1024 * 1024, 25 * 1024 * 1024);
      optimizations.retryDelay = 500;
    }

    // Optimize based on device performance
    if (patterns.devicePerformance === 'low') {
      optimizations.maxConcurrency = 1;
      optimizations.enableProgressTracking = true;
      optimizations.progressUpdateInterval = 1000;
    }

    // Optimize based on user priority
    switch (patterns.userPriority) {
      case 'speed':
        optimizations.model = 'whisper-large-v3-turbo';
        optimizations.temperature = 0;
        optimizations.responseFormat = 'json';
        break;

      case 'accuracy':
        optimizations.model = 'whisper-large-v3';
        optimizations.temperature = 0.1;
        optimizations.responseFormat = 'verbose_json';
        optimizations.enableWordTimestamps = true;
        break;

      case 'balanced':
        optimizations.model = 'whisper-large-v3-turbo';
        optimizations.temperature = 0.2;
        optimizations.responseFormat = 'verbose_json';
        optimizations.enableWordTimestamps = true;
        break;
    }

    return optimizations;
  }
}

// Export singleton instance
export const transcriptionConfigManager = new TranscriptionConfigManager();
