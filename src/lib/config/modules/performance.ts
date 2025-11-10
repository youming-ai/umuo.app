/**
 * Performance Monitoring Configuration Module
 */

import type { PerformanceConfig } from '../types';
import { performanceConfigSchema } from '../schemas';
import { getConfigurationManager } from '../manager';

export class PerformanceConfigManager {
  private configManager = getConfigurationManager();

  /**
   * Get current performance configuration
   */
  getConfiguration(): PerformanceConfig {
    return this.configManager.get<PerformanceConfig>('performance') || {};
  }

  /**
   * Update performance configuration
   */
  async updateConfiguration(updates: Partial<PerformanceConfig>): Promise<void> {
    const validation = performanceConfigSchema.partial().safeParse(updates);
    if (!validation.success) {
      throw new Error(`Invalid performance configuration: ${validation.error.message}`);
    }

    await this.configManager.updateMany(
      Object.entries(updates).map(([key, value]) => ({
        key: `performance.${key}`,
        value,
        scope: 'user'
      }))
    );
  }

  /**
   * Reset performance configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfig = performanceConfigSchema.parse({});
    await this.configManager.set('performance', defaultConfig, { scope: 'user', immediate: true });
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfiguration(): {
    enabled: boolean;
    interval: number;
    enablePerformanceMonitoring: boolean;
    enableMemoryMonitoring: boolean;
    enableProfiling: boolean;
    enableOptimizationSuggestions: boolean;
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.enableMetrics,
      interval: config.metricsInterval,
      enablePerformanceMonitoring: config.enablePerformanceMonitoring,
      enableMemoryMonitoring: config.enableMemoryMonitoring,
      enableProfiling: config.enableProfiling,
      enableOptimizationSuggestions: config.enableOptimizationSuggestions
    };
  }

  /**
   * Get alert thresholds
   */
  getAlertThresholds(): {
    memoryUsage: number;
    processingTime: number;
    errorRate: number;
    responseTime: number;
  } {
    const config = this.getConfiguration();
    return config.alertThresholds;
  }

  /**
   * Get cache configuration
   */
  getCacheConfiguration(): {
    enabled: boolean;
    size: number;
    compressionEnabled: boolean;
    ttl: number;
    strategy: 'lru' | 'fifo' | 'custom';
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.cacheEnabled,
      size: config.cacheSize,
      compressionEnabled: config.compressionEnabled,
      ttl: 300000, // 5 minutes default TTL
      strategy: 'lru' // Default LRU strategy
    };
  }

  /**
   * Get performance metrics collection configuration
   */
  getMetricsCollection(): {
    enabled: boolean;
    interval: number;
    metrics: string[];
    sampleRate: number;
    batchSize: number;
    flushInterval: number;
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.enableMetrics,
      interval: config.metricsInterval,
      metrics: [
        'memory_usage',
        'cpu_usage',
        'render_time',
        'network_latency',
        'api_response_time',
        'transcription_time',
        'file_processing_time',
        'error_rate',
        'user_interaction_time'
      ],
      sampleRate: 1.0,
      batchSize: 100,
      flushInterval: 10000
    };
  }

  /**
   * Get profiling configuration for different environments
   */
  getProfilingConfig(environment: 'development' | 'staging' | 'production'): {
    enabled: boolean;
    sampleRate: number;
    maxProfiles: number;
    profileDuration: number;
    includeStackTrace: boolean;
    includeMemoryProfile: boolean;
    includeNetworkProfile: boolean;
  } {
    const config = this.getConfiguration();

    switch (environment) {
      case 'development':
        return {
          enabled: true,
          sampleRate: 1.0,
          maxProfiles: 50,
          profileDuration: 30000,
          includeStackTrace: true,
          includeMemoryProfile: true,
          includeNetworkProfile: true
        };

      case 'staging':
        return {
          enabled: config.enableProfiling,
          sampleRate: 0.5,
          maxProfiles: 20,
          profileDuration: 60000,
          includeStackTrace: true,
          includeMemoryProfile: false,
          includeNetworkProfile: true
        };

      case 'production':
        return {
          enabled: false, // Always disabled in production
          sampleRate: 0.01,
          maxProfiles: 5,
          profileDuration: 120000,
          includeStackTrace: false,
          includeMemoryProfile: false,
          includeNetworkProfile: false
        };

      default:
        return {
          enabled: config.enableProfiling,
          sampleRate: 0.1,
          maxProfiles: 10,
          profileDuration: 60000,
          includeStackTrace: false,
          includeMemoryProfile: false,
          includeNetworkProfile: true
        };
    }
  }

  /**
   * Optimize performance configuration based on device capabilities
   */
  optimizeForDevice(deviceCapabilities: {
    memory: number;
    cpuCores: number;
    gpu: boolean;
    batteryLevel?: number;
    isLowPowerMode?: boolean;
    networkType?: string;
  }): Partial<PerformanceConfig> {
    const optimizations: Partial<PerformanceConfig> = {};
    const { memory, cpuCores, batteryLevel = 1, isLowPowerMode = false } = deviceCapabilities;

    // Memory-based optimizations
    if (memory < 4096) { // Less than 4GB
      optimizations.enableMemoryMonitoring = true;
      optimizations.alertThresholds = {
        memoryUsage: 0.7, // Lower threshold for low-memory devices
        processingTime: 45000,
        errorRate: 0.08,
        responseTime: 3000
      };
      optimizations.cacheSize = Math.min(50 * 1024 * 1024, memory * 0.1); // 10% of available memory
    } else if (memory >= 8192) { // 8GB or more
      optimizations.alertThresholds = {
        memoryUsage: 0.9,
        processingTime: 20000,
        errorRate: 0.02,
        responseTime: 1500
      };
      optimizations.cacheSize = Math.min(200 * 1024 * 1024, memory * 0.15); // 15% of available memory
    }

    // CPU-based optimizations
    if (cpuCores < 4) {
      optimizations.enableProfiling = false;
      optimizations.metricsInterval = 10000; // Slower collection on low-end CPUs
      optimizations.enableOptimizationSuggestions = true;
    } else if (cpuCores >= 8) {
      optimizations.enableProfiling = true;
      optimizations.metricsInterval = 2000; // Faster collection on high-end CPUs
    }

    // Battery-based optimizations
    if (batteryLevel < 0.3 || isLowPowerMode) {
      optimizations.enableMetrics = false;
      optimizations.enableProfiling = false;
      optimizations.enablePerformanceMonitoring = false;
      optimizations.enableMemoryMonitoring = false;
      optimizations.compressionEnabled = true;
    } else if (batteryLevel < 0.5) {
      optimizations.metricsInterval = 15000; // Slower collection to save battery
      optimizations.enableProfiling = false;
    }

    // Network-based optimizations
    if (deviceCapabilities.networkType === 'cellular') {
      optimizations.compressionEnabled = true;
    }

    return optimizations;
  }

  /**
   * Get adaptive performance configuration based on current system state
   */
  getAdaptiveConfiguration(currentState: {
    memoryUsage: number;
    cpuUsage: number;
    batteryLevel: number;
    networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
    isInBackground: boolean;
    appLoadTime: number;
  }): Partial<PerformanceConfig> {
    const adaptiveConfig: Partial<PerformanceConfig> = {};

    // Memory usage adaptations
    if (currentState.memoryUsage > 0.8) {
      adaptiveConfig.enableMemoryMonitoring = true;
      adaptiveConfig.metricsInterval = 5000;
      adaptiveConfig.cacheSize = Math.min(50 * 1024 * 1024,
        this.getConfiguration().cacheSize * 0.5);
    }

    // CPU usage adaptations
    if (currentState.cpuUsage > 0.9) {
      adaptiveConfig.enableProfiling = false;
      adaptiveConfig.metricsInterval = 15000;
      adaptiveConfig.enableOptimizationSuggestions = true;
    }

    // Battery level adaptations
    if (currentState.batteryLevel < 0.2) {
      adaptiveConfig.enableMetrics = false;
      adaptiveConfig.enablePerformanceMonitoring = false;
      adaptiveConfig.compressionEnabled = true;
    } else if (currentState.batteryLevel < 0.4) {
      adaptiveConfig.metricsInterval = 20000;
      adaptiveConfig.enableProfiling = false;
    }

    // Network quality adaptations
    if (currentState.networkQuality === 'poor') {
      adaptiveConfig.compressionEnabled = true;
      adaptiveConfig.cacheSize = Math.min(
        this.getConfiguration().cacheSize * 1.5,
        300 * 1024 * 1024
      );
    }

    // Background mode adaptations
    if (currentState.isInBackground) {
      adaptiveConfig.enableMetrics = false;
      adaptiveConfig.enableProfiling = false;
      adaptiveConfig.enablePerformanceMonitoring = false;
    }

    // App load time adaptations
    if (currentState.appLoadTime > 5000) { // Slow startup
      adaptiveConfig.enableOptimizationSuggestions = true;
      adaptiveConfig.metricsInterval = 3000;
    }

    return adaptiveConfig;
  }

  /**
   * Validate performance configuration
   */
  validateConfiguration(config: Partial<PerformanceConfig>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Metrics interval validation
    if (config.metricsInterval !== undefined) {
      if (config.metricsInterval < 1000) {
        errors.push('Metrics interval must be at least 1 second');
      } else if (config.metricsInterval > 60000) {
        warnings.push('Metrics interval is very long, may miss important performance issues');
      }
    }

    // Cache size validation
    if (config.cacheSize !== undefined) {
      if (config.cacheSize < 1024 * 1024) {
        errors.push('Cache size must be at least 1MB');
      } else if (config.cacheSize > 1024 * 1024 * 1024) {
        warnings.push('Cache size is very large, may impact memory usage');
      }
    }

    // Alert thresholds validation
    if (config.alertThresholds !== undefined) {
      const { memoryUsage, processingTime, errorRate, responseTime } = config.alertThresholds;

      if (memoryUsage !== undefined && (memoryUsage < 0.1 || memoryUsage > 1)) {
        errors.push('Memory usage threshold must be between 0.1 and 1.0');
      }

      if (processingTime !== undefined && processingTime < 1000) {
        warnings.push('Processing time threshold is very low, may trigger frequent alerts');
      }

      if (errorRate !== undefined && errorRate < 0.001) {
        warnings.push('Error rate threshold is very low, may trigger frequent alerts');
      }

      if (responseTime !== undefined && responseTime < 100) {
        warnings.push('Response time threshold is very low, may trigger frequent alerts');
      }
    }

    // Profiling warnings
    if (config.enableProfiling === true && config.metricsInterval > 10000) {
      warnings.push('Profiling is enabled but metrics collection is infrequent');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get recommended configuration for specific use case
   */
  getRecommendedConfiguration(useCase: 'development' | 'production' | 'monitoring' | 'debugging'): Partial<PerformanceConfig> {
    switch (useCase) {
      case 'development':
        return {
          enableMetrics: true,
          enablePerformanceMonitoring: true,
          enableMemoryMonitoring: true,
          enableProfiling: true,
          enableOptimizationSuggestions: true,
          metricsInterval: 2000,
          cacheEnabled: false, // Disable caching during development
          cacheSize: 50 * 1024 * 1024,
          compressionEnabled: false,
          alertThresholds: {
            memoryUsage: 0.8,
            processingTime: 30000,
            errorRate: 0.1,
            responseTime: 3000
          }
        };

      case 'production':
        return {
          enableMetrics: true,
          enablePerformanceMonitoring: true,
          enableMemoryMonitoring: false, // May be too expensive in production
          enableProfiling: false, // Disabled in production
          enableOptimizationSuggestions: false, // May not be useful in production
          metricsInterval: 10000,
          cacheEnabled: true,
          cacheSize: 100 * 1024 * 1024,
          compressionEnabled: true,
          alertThresholds: {
            memoryUsage: 0.9,
            processingTime: 60000,
            errorRate: 0.05,
            responseTime: 5000
          }
        };

      case 'monitoring':
        return {
          enableMetrics: true,
          enablePerformanceMonitoring: true,
          enableMemoryMonitoring: true,
          enableProfiling: false, // Limited profiling for monitoring
          enableOptimizationSuggestions: true,
          metricsInterval: 5000,
          cacheEnabled: true,
          cacheSize: 75 * 1024 * 1024,
          compressionEnabled: true,
          alertThresholds: {
            memoryUsage: 0.85,
            processingTime: 45000,
            errorRate: 0.08,
            responseTime: 4000
          }
        };

      case 'debugging':
        return {
          enableMetrics: true,
          enablePerformanceMonitoring: true,
          enableMemoryMonitoring: true,
          enableProfiling: true,
          enableOptimizationSuggestions: true,
          metricsInterval: 1000,
          cacheEnabled: false, // Disable caching to see real performance
          cacheSize: 25 * 1024 * 1024,
          compressionEnabled: false,
          alertThresholds: {
            memoryUsage: 0.6, // Lower thresholds for debugging
            processingTime: 15000,
            errorRate: 0.02,
            responseTime: 1500
          }
        };

      default:
        return {};
    }
  }

  /**
   * Export performance configuration
   */
  async exportConfiguration(): Promise<string> {
    const config = this.getConfiguration();
    return JSON.stringify({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      configuration: config,
      metadata: {
        description: 'Performance monitoring configuration',
        exportedBy: 'PerformanceConfigManager'
      }
    }, null, 2);
  }

  /**
   * Import performance configuration
   */
  async importConfiguration(data: string, options: {
    overwrite?: boolean;
    validateOnly?: boolean;
  } = {}): Promise<void> {
    const { overwrite = true, validateOnly = false } = options;

    try {
      const importData = JSON.parse(data);

      // Validate imported configuration
      const validation = performanceConfigSchema.safeParse(importData.configuration);
      if (!validation.success) {
        throw new Error(`Invalid performance configuration: ${validation.error.message}`);
      }

      if (validateOnly) {
        return;
      }

      if (overwrite) {
        await this.configManager.set('performance', validation.data, {
          scope: 'user',
          immediate: true
        });
      } else {
        await this.updateConfiguration(validation.data);
      }

    } catch (error) {
      throw new Error(`Failed to import performance configuration: ${error}`);
    }
  }
}

// Export singleton instance
export const performanceConfigManager = new PerformanceConfigManager();
