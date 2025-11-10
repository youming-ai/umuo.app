/**
 * Memory Management Configuration Module
 */

import type { MemoryConfig } from '../types';
import { memoryConfigSchema } from '../schemas';
import { getConfigurationManager } from '../manager';

export class MemoryConfigManager {
  private configManager = getConfigurationManager();

  /**
   * Get current memory configuration
   */
  getConfiguration(): MemoryConfig {
    return this.configManager.get<MemoryConfig>('memory') || {};
  }

  /**
   * Update memory configuration
   */
  async updateConfiguration(updates: Partial<MemoryConfig>): Promise<void> {
    const validation = memoryConfigSchema.partial().safeParse(updates);
    if (!validation.success) {
      throw new Error(`Invalid memory configuration: ${validation.error.message}`);
    }

    await this.configManager.updateMany(
      Object.entries(updates).map(([key, value]) => ({
        key: `memory.${key}`,
        value,
        scope: 'user'
      }))
    );
  }

  /**
   * Reset memory configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfig = memoryConfigSchema.parse({});
    await this.configManager.set('memory', defaultConfig, { scope: 'user', immediate: true });
  }

  /**
   * Get memory limits configuration
   */
  getMemoryLimits(): {
    maxUsage: number;
    pressureThreshold: number;
    cleanupTriggerThreshold: number;
    emergencyCleanupThreshold: number;
  } {
    const config = this.getConfiguration();

    return {
      maxUsage: config.maxMemoryUsage,
      pressureThreshold: config.memoryPressureThreshold,
      cleanupTriggerThreshold: config.memoryPressureThreshold * 0.8,
      emergencyCleanupThreshold: config.memoryPressureThreshold * 0.95
    };
  }

  /**
   * Get cleanup configuration
   */
  getCleanupConfiguration(): {
    enabled: boolean;
    interval: number;
    adaptiveCleanup: boolean;
    enableGarbageCollection: boolean;
    enableWeakReferences: boolean;
    strategies: ('aggressive' | 'conservative' | 'adaptive')[];
  } {
    const config = this.getConfiguration();

    return {
      enabled: true,
      interval: config.cleanupInterval,
      adaptiveCleanup: config.adaptiveCleanup,
      enableGarbageCollection: config.enableGarbageCollection,
      enableWeakReferences: config.enableWeakReferences,
      strategies: config.adaptiveCleanup ? ['adaptive'] : ['conservative']
    };
  }

  /**
   * Get object pooling configuration
   */
  getObjectPoolingConfiguration(): {
    enabled: boolean;
    poolSize: number;
    maxSize: number;
    initialSize: number;
    growthFactor: number;
    shrinkThreshold: number;
  } {
    const config = this.getConfiguration();

    return {
      enabled: true,
      poolSize: config.objectPoolSize,
      maxSize: config.objectPoolSize * 2,
      initialSize: Math.floor(config.objectPoolSize * 0.5),
      growthFactor: 1.5,
      shrinkThreshold: 0.25
    };
  }

  /**
   * Get memory monitoring configuration
   */
  getMonitoringConfiguration(): {
    enabled: boolean;
    interval: number;
    enableLeakDetection: boolean;
    enableProfiling: boolean;
    samplingRate: number;
    historySize: number;
  } {
    const config = this.getConfiguration();

    return {
      enabled: true,
      interval: Math.min(config.cleanupInterval / 2, 30000), // Monitor twice as often as cleanup
      enableLeakDetection: config.enableMemoryLeakDetection,
      enableProfiling: config.enableMemoryProfiling,
      samplingRate: config.enableMemoryProfiling ? 0.1 : 1.0,
      historySize: 100
    };
  }

  /**
   * Optimize memory configuration based on device capabilities
   */
  optimizeForDevice(deviceCapabilities: {
    totalMemory: number;
    availableMemory: number;
    cpuCores: number;
    isLowEndDevice: boolean;
    batteryLevel?: number;
    isLowPowerMode?: boolean;
  }): Partial<MemoryConfig> {
    const optimizations: Partial<MemoryConfig> = {};
    const { totalMemory, availableMemory, isLowEndDevice, batteryLevel = 1, isLowPowerMode = false } = deviceCapabilities;

    // Memory size optimizations
    if (totalMemory < 4096) { // Less than 4GB
      optimizations.maxMemoryUsage = Math.min(totalMemory * 0.3, 256 * 1024 * 1024);
      optimizations.cleanupInterval = 30000;
      optimizations.memoryPressureThreshold = 0.6;
      optimizations.objectPoolSize = 25;
      optimizations.adaptiveCleanup = true;
      optimizations.enableMemoryProfiling = false;
    } else if (totalMemory >= 8192) { // 8GB or more
      optimizations.maxMemoryUsage = Math.min(totalMemory * 0.5, 1024 * 1024 * 1024);
      optimizations.cleanupInterval = 120000;
      optimizations.memoryPressureThreshold = 0.85;
      optimizations.objectPoolSize = 200;
      optimizations.enableMemoryProfiling = isLowEndDevice ? false : true;
    } else {
      optimizations.maxMemoryUsage = totalMemory * 0.4;
      optimizations.cleanupInterval = 60000;
      optimizations.memoryPressureThreshold = 0.75;
      optimizations.objectPoolSize = 100;
      optimizations.enableMemoryProfiling = false;
    }

    // Available memory optimizations
    const availableRatio = availableMemory / totalMemory;
    if (availableRatio < 0.3) { // Less than 30% available
      optimizations.cleanupInterval = Math.min(optimizations.cleanupInterval || 60000, 20000);
      optimizations.memoryPressureThreshold = Math.min(optimizations.memoryPressureThreshold || 0.8, 0.6);
      optimizations.adaptiveCleanup = true;
    }

    // Low-end device optimizations
    if (isLowEndDevice) {
      optimizations.enableWeakReferences = true;
      optimizations.adaptiveCleanup = true;
      optimizations.objectPoolSize = Math.min(optimizations.objectPoolSize || 100, 50);
      optimizations.enableMemoryLeakDetection = true;
      optimizations.enableMemoryProfiling = false;
    }

    // Battery-based optimizations
    if (batteryLevel < 0.3 || isLowPowerMode) {
      optimizations.maxMemoryUsage = Math.min(optimizations.maxMemoryUsage || 512 * 1024 * 1024,
        totalMemory * 0.25);
      optimizations.cleanupInterval = Math.min(optimizations.cleanupInterval || 60000, 15000);
      optimizations.memoryPressureThreshold = Math.min(optimizations.memoryPressureThreshold || 0.8, 0.5);
      optimizations.adaptiveCleanup = true;
      optimizations.enableMemoryProfiling = false;
    }

    return optimizations;
  }

  /**
   * Get adaptive memory configuration based on current usage
   */
  getAdaptiveConfiguration(currentMemoryState: {
    used: number;
    available: number;
    total: number;
    pressure: number;
    leaks: boolean;
    fragmentation: number;
  }): Partial<MemoryConfig> {
    const adaptiveConfig: Partial<MemoryConfig> = {};
    const usageRatio = currentMemoryState.used / currentMemoryState.total;

    // High memory pressure adaptations
    if (usageRatio > 0.85 || currentMemoryState.pressure > 0.8) {
      adaptiveConfig.cleanupInterval = 10000; // Aggressive cleanup
      adaptiveConfig.memoryPressureThreshold = 0.6;
      adaptiveConfig.adaptiveCleanup = true;
      adaptiveConfig.enableWeakReferences = true;
      adaptiveConfig.objectPoolSize = Math.floor((adaptiveConfig.objectPoolSize || 100) * 0.5);
    }

    // Memory leak detection adaptations
    if (currentMemoryState.leaks) {
      adaptiveConfig.enableMemoryLeakDetection = true;
      adaptiveConfig.enableMemoryProfiling = true;
      adaptiveConfig.cleanupInterval = Math.min(adaptiveConfig.cleanupInterval || 60000, 30000);
      adaptiveConfig.adaptiveCleanup = true;
    }

    // High fragmentation adaptations
    if (currentMemoryState.fragmentation > 0.7) {
      adaptiveConfig.enableGarbageCollection = true;
      adaptiveConfig.cleanupInterval = Math.min(adaptiveConfig.cleanupInterval || 60000, 20000);
      adaptiveConfig.adaptiveCleanup = true;
    }

    // Low memory usage adaptations
    if (usageRatio < 0.4) {
      adaptiveConfig.cleanupInterval = Math.max(adaptiveConfig.cleanupInterval || 60000, 120000);
      adaptiveConfig.objectPoolSize = Math.min((adaptiveConfig.objectPoolSize || 100) * 1.5, 300);
    }

    return adaptiveConfig;
  }

  /**
   * Get memory strategy based on application state
   */
  getMemoryStrategy(appState: {
    isActive: boolean;
    isBackground: boolean;
    isTranscribing: boolean;
    fileCount: number;
    sessionDuration: number;
  }): {
    strategy: 'aggressive' | 'conservative' | 'adaptive' | 'minimal';
    cleanupInterval: number;
    maxMemoryUsage: number;
    enableProfiling: boolean;
    enableLeakDetection: boolean;
  } {
    const config = this.getConfiguration();

    if (!appState.isActive || appState.isBackground) {
      return {
        strategy: 'aggressive',
        cleanupInterval: Math.min(config.cleanupInterval, 15000),
        maxMemoryUsage: config.maxMemoryUsage * 0.5,
        enableProfiling: false,
        enableLeakDetection: false
      };
    }

    if (appState.isTranscribing) {
      return {
        strategy: 'conservative',
        cleanupInterval: config.cleanupInterval,
        maxMemoryUsage: config.maxMemoryUsage * 0.8,
        enableProfiling: config.enableMemoryProfiling,
        enableLeakDetection: config.enableMemoryLeakDetection
      };
    }

    if (appState.sessionDuration > 3600000) { // More than 1 hour
      return {
        strategy: 'adaptive',
        cleanupInterval: config.cleanupInterval * 0.7,
        maxMemoryUsage: config.maxMemoryUsage * 0.7,
        enableProfiling: true,
        enableLeakDetection: true
      };
    }

    if (appState.fileCount > 10) {
      return {
        strategy: 'adaptive',
        cleanupInterval: config.cleanupInterval * 0.8,
        maxMemoryUsage: config.maxMemoryUsage * 0.75,
        enableProfiling: config.enableMemoryProfiling,
        enableLeakDetection: true
      };
    }

    return {
      strategy: 'minimal',
      cleanupInterval: config.cleanupInterval * 1.5,
      maxMemoryUsage: config.maxMemoryUsage,
      enableProfiling: false,
      enableLeakDetection: config.enableMemoryLeakDetection
    };
  }

  /**
   * Validate memory configuration
   */
  validateConfiguration(config: Partial<MemoryConfig>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Max memory usage validation
    if (config.maxMemoryUsage !== undefined) {
      if (config.maxMemoryUsage < 50 * 1024 * 1024) {
        errors.push('Max memory usage must be at least 50MB');
      } else if (config.maxMemoryUsage > 2048 * 1024 * 1024) {
        warnings.push('Max memory usage is very large, may cause system instability');
      }
    }

    // Cleanup interval validation
    if (config.cleanupInterval !== undefined) {
      if (config.cleanupInterval < 10000) {
        errors.push('Cleanup interval must be at least 10 seconds');
      } else if (config.cleanupInterval > 300000) {
        warnings.push('Cleanup interval is very long, may allow memory accumulation');
      }
    }

    // Memory pressure threshold validation
    if (config.memoryPressureThreshold !== undefined) {
      if (config.memoryPressureThreshold < 0.5) {
        warnings.push('Memory pressure threshold is low, may trigger frequent cleanups');
      } else if (config.memoryPressureThreshold > 0.95) {
        errors.push('Memory pressure threshold is too high, may not detect memory issues');
      }
    }

    // Object pool size validation
    if (config.objectPoolSize !== undefined) {
      if (config.objectPoolSize < 10) {
        errors.push('Object pool size must be at least 10');
      } else if (config.objectPoolSize > 1000) {
        warnings.push('Object pool size is very large, may increase memory usage');
      }
    }

    // Feature compatibility warnings
    if (config.enableMemoryProfiling === true && config.cleanupInterval > 60000) {
      warnings.push('Memory profiling is enabled but cleanup interval is infrequent');
    }

    if (config.adaptiveCleanup === false && config.enableMemoryLeakDetection === true) {
      warnings.push('Memory leak detection works best with adaptive cleanup enabled');
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
  getRecommendedConfiguration(useCase: 'development' | 'production' | 'mobile' | 'desktop'): Partial<MemoryConfig> {
    switch (useCase) {
      case 'development':
        return {
          maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
          cleanupInterval: 30000,
          enableGarbageCollection: true,
          enableMemoryLeakDetection: true,
          adaptiveCleanup: true,
          memoryPressureThreshold: 0.8,
          enableWeakReferences: true,
          objectPoolSize: 50,
          enableMemoryProfiling: true
        };

      case 'production':
        return {
          maxMemoryUsage: 512 * 1024 * 1024, // 512MB
          cleanupInterval: 60000,
          enableGarbageCollection: true,
          enableMemoryLeakDetection: true,
          adaptiveCleanup: true,
          memoryPressureThreshold: 0.85,
          enableWeakReferences: true,
          objectPoolSize: 200,
          enableMemoryProfiling: false
        };

      case 'mobile':
        return {
          maxMemoryUsage: 256 * 1024 * 1024, // 256MB
          cleanupInterval: 20000,
          enableGarbageCollection: true,
          enableMemoryLeakDetection: true,
          adaptiveCleanup: true,
          memoryPressureThreshold: 0.7,
          enableWeakReferences: true,
          objectPoolSize: 25,
          enableMemoryProfiling: false
        };

      case 'desktop':
        return {
          maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
          cleanupInterval: 90000,
          enableGarbageCollection: true,
          enableMemoryLeakDetection: true,
          adaptiveCleanup: true,
          memoryPressureThreshold: 0.8,
          enableWeakReferences: true,
          objectPoolSize: 150,
          enableMemoryProfiling: false
        };

      default:
        return {};
    }
  }

  /**
   * Export memory configuration
   */
  async exportConfiguration(): Promise<string> {
    const config = this.getConfiguration();
    return JSON.stringify({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      configuration: config,
      metadata: {
        description: 'Memory management configuration',
        exportedBy: 'MemoryConfigManager'
      }
    }, null, 2);
  }

  /**
   * Import memory configuration
   */
  async importConfiguration(data: string, options: {
    overwrite?: boolean;
    validateOnly?: boolean;
  } = {}): Promise<void> {
    const { overwrite = true, validateOnly = false } = options;

    try {
      const importData = JSON.parse(data);

      // Validate imported configuration
      const validation = memoryConfigSchema.safeParse(importData.configuration);
      if (!validation.success) {
        throw new Error(`Invalid memory configuration: ${validation.error.message}`);
      }

      if (validateOnly) {
        return;
      }

      if (overwrite) {
        await this.configManager.set('memory', validation.data, {
          scope: 'user',
          immediate: true
        });
      } else {
        await this.updateConfiguration(validation.data);
      }

    } catch (error) {
      throw new Error(`Failed to import memory configuration: ${error}`);
    }
  }
}

// Export singleton instance
export const memoryConfigManager = new MemoryConfigManager();
