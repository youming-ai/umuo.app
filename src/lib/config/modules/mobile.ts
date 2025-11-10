/**
 * Mobile Optimization Configuration Module
 */

import type { MobileConfig } from '../types';
import { mobileConfigSchema } from '../schemas';
import { getConfigurationManager } from '../manager';

export class MobileConfigManager {
  private configManager = getConfigurationManager();

  /**
   * Get current mobile configuration
   */
  getConfiguration(): MobileConfig {
    return this.configManager.get<MobileConfig>('mobile') || {};
  }

  /**
   * Update mobile configuration
   */
  async updateConfiguration(updates: Partial<MobileConfig>): Promise<void> {
    const validation = mobileConfigSchema.partial().safeParse(updates);
    if (!validation.success) {
      throw new Error(`Invalid mobile configuration: ${validation.error.message}`);
    }

    await this.configManager.updateMany(
      Object.entries(updates).map(([key, value]) => ({
        key: `mobile.${key}`,
        value,
        scope: 'user'
      }))
    );
  }

  /**
   * Reset mobile configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfig = mobileConfigSchema.parse({});
    await this.configManager.set('mobile', defaultConfig, { scope: 'user', immediate: true });
  }

  /**
   * Get touch interaction configuration
   */
  getTouchConfiguration(): {
    hapticFeedback: boolean;
    targetSize: number;
    swipeThreshold: number;
    longPressThreshold: number;
    doubleTapThreshold: number;
    gestureControls: boolean;
    vibrationIntensity: 'light' | 'medium' | 'strong';
  } {
    const config = this.getConfiguration();

    return {
      hapticFeedback: config.enableHapticFeedback,
      targetSize: config.touchTargetSize,
      swipeThreshold: config.swipeThreshold,
      longPressThreshold: config.longPressThreshold,
      doubleTapThreshold: config.doubleTapThreshold,
      gestureControls: config.enableGestureControls,
      vibrationIntensity: config.vibrationIntensity
    };
  }

  /**
   * Get battery optimization settings
   */
  getBatteryOptimization(): {
    enabled: boolean;
    lowPowerModeBehavior: 'reduce_quality' | 'disable_features' | 'warn_user';
    adaptiveOptimization: boolean;
    batteryThreshold: number;
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.enableBatteryOptimization,
      lowPowerModeBehavior: config.lowPowerModeBehavior,
      adaptiveOptimization: true, // Always enable adaptive optimization
      batteryThreshold: 0.2 // 20% battery threshold
    };
  }

  /**
   * Get network optimization configuration
   */
  getNetworkOptimization(): {
    enabled: boolean;
    offlineMode: boolean;
    mobileDataWarning: boolean;
    compressionEnabled: boolean;
    adaptiveBitrate: boolean;
    prefetchEnabled: boolean;
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.networkOptimization,
      offlineMode: config.offlineMode,
      mobileDataWarning: config.mobileDataWarning,
      compressionEnabled: true, // Always enabled for mobile
      adaptiveBitrate: true,
      prefetchEnabled: config.offlineMode
    };
  }

  /**
   * Get device-specific optimizations
   */
  getDeviceOptimizations(deviceInfo: {
    type: 'mobile' | 'tablet';
    screenSize: { width: number; height: number };
    pixelRatio: number;
    memory: number;
    batteryLevel?: number;
    isLowPowerMode?: boolean;
    connectionType?: string;
  }): {
    touchConfiguration: Partial<MobileConfig>;
    performanceConfiguration: Partial<MobileConfig>;
    uiConfiguration: Partial<MobileConfig>;
  } {
    const { screenSize, pixelRatio, memory, batteryLevel = 1, isLowPowerMode = false } = deviceInfo;

    const touchConfiguration: Partial<MobileConfig> = {};
    const performanceConfiguration: Partial<MobileConfig> = {};
    const uiConfiguration: Partial<MobileConfig> = {};

    // Screen size optimizations
    if (screenSize.width < 768) { // Small mobile
      touchConfiguration.touchTargetSize = 52;
      touchConfiguration.swipeThreshold = 40;
      uiConfiguration.enableGestureControls = true;
    } else if (screenSize.width >= 768 && screenSize.width < 1024) { // Tablet
      touchConfiguration.touchTargetSize = 48;
      touchConfiguration.swipeThreshold = 50;
    }

    // High DPI optimizations
    if (pixelRatio > 2) {
      touchConfiguration.vibrationIntensity = 'medium';
    }

    // Memory optimizations
    if (memory < 4096) { // Less than 4GB
      performanceConfiguration.enableBatteryOptimization = true;
      performanceConfiguration.networkOptimization = true;
      if (memory < 2048) { // Less than 2GB
        performanceConfiguration.lowPowerModeBehavior = 'reduce_quality';
      }
    }

    // Battery optimizations
    if (batteryLevel < 0.2 || isLowPowerMode) {
      performanceConfiguration.enableBatteryOptimization = true;
      performanceConfiguration.lowPowerModeBehavior = 'reduce_quality';
      performanceConfiguration.networkOptimization = true;
      performanceConfiguration.offlineMode = true;
    }

    return {
      touchConfiguration,
      performanceConfiguration,
      uiConfiguration
    };
  }

  /**
   * Optimize configuration based on device capabilities
   */
  optimizeForDevice(deviceCapabilities: {
    hasTouch: boolean;
    hasVibration: boolean;
    maxTouchPoints: number;
    gpu: string;
    cores: number;
    memory: number;
    storage: number;
    batteryLevel?: number;
    connectionSpeed?: string;
  }): Partial<MobileConfig> {
    const optimizations: Partial<MobileConfig> = {};
    const config = this.getConfiguration();

    // Touch capabilities
    if (!deviceCapabilities.hasTouch) {
      optimizations.enableGestureControls = false;
      optimizations.enableHapticFeedback = false;
    }

    if (!deviceCapabilities.hasVibration) {
      optimizations.enableHapticFeedback = false;
    }

    if (deviceCapabilities.maxTouchPoints >= 10) {
      optimizations.enableGestureControls = true;
    }

    // Performance capabilities
    if (deviceCapabilities.cores < 4 || deviceCapabilities.memory < 4096) {
      optimizations.enableBatteryOptimization = true;
      optimizations.lowPowerModeBehavior = 'reduce_quality';
      optimizations.networkOptimization = true;
    }

    // Battery level
    if (deviceCapabilities.batteryLevel && deviceCapabilities.batteryLevel < 0.3) {
      optimizations.enableBatteryOptimization = true;
      optimizations.lowPowerModeBehavior = 'reduce_quality';
      optimizations.vibrationIntensity = 'light';
    }

    // Network speed
    if (deviceCapabilities.connectionSpeed === 'slow') {
      optimizations.networkOptimization = true;
      optimizations.offlineMode = true;
      optimizations.mobileDataWarning = true;
    }

    // Storage optimization
    if (deviceCapabilities.storage < 8192) { // Less than 8GB
      optimizations.offlineMode = false; // Disable offline mode on low storage
    }

    return optimizations;
  }

  /**
   * Get adaptive configuration based on current device state
   */
  getAdaptiveConfiguration(currentState: {
    batteryLevel: number;
    isCharging: boolean;
    connectionType: string;
    memoryUsage: number;
    cpuUsage: number;
    isInBackground: boolean;
  }): Partial<MobileConfig> {
    const adaptiveConfig: Partial<MobileConfig> = {};

    // Battery-based adaptations
    if (currentState.batteryLevel < 0.2 && !currentState.isCharging) {
      adaptiveConfig.enableBatteryOptimization = true;
      adaptiveConfig.lowPowerModeBehavior = 'reduce_quality';
      adaptiveConfig.vibrationIntensity = 'light';
      adaptiveConfig.enableHapticFeedback = false;
    }

    // Network-based adaptations
    if (currentState.connectionType === 'cellular') {
      adaptiveConfig.mobileDataWarning = true;
      adaptiveConfig.networkOptimization = true;
    }

    if (currentState.connectionType === 'slow-3g' || currentState.connectionType === '2g') {
      adaptiveConfig.offlineMode = true;
      adaptiveConfig.networkOptimization = true;
    }

    // Memory-based adaptations
    if (currentState.memoryUsage > 0.8) {
      adaptiveConfig.enableBatteryOptimization = true;
      adaptiveConfig.lowPowerModeBehavior = 'disable_features';
    }

    // CPU-based adaptations
    if (currentState.cpuUsage > 0.9) {
      adaptiveConfig.enableGestureControls = false;
      adaptiveConfig.enableHapticFeedback = false;
      adaptiveConfig.vibrationIntensity = 'light';
    }

    // Background mode adaptations
    if (currentState.isInBackground) {
      adaptiveConfig.enableHapticFeedback = false;
      adaptiveConfig.vibrationIntensity = 'light';
      adaptiveConfig.lowPowerModeBehavior = 'reduce_quality';
    }

    return adaptiveConfig;
  }

  /**
   * Validate mobile configuration
   */
  validateConfiguration(config: Partial<MobileConfig>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Touch target size validation
    if (config.touchTargetSize !== undefined) {
      if (config.touchTargetSize < 44) {
        errors.push('Touch target size must be at least 44px for accessibility');
      } else if (config.touchTargetSize > 100) {
        warnings.push('Touch target size is very large, may impact UI layout');
      }
    }

    // Swipe threshold validation
    if (config.swipeThreshold !== undefined) {
      if (config.swipeThreshold < 10) {
        errors.push('Swipe threshold is too low, may cause accidental triggers');
      } else if (config.swipeThreshold > 100) {
        errors.push('Swipe threshold is too high, may require excessive movement');
      }
    }

    // Long press threshold validation
    if (config.longPressThreshold !== undefined) {
      if (config.longPressThreshold < 300) {
        warnings.push('Long press threshold is short, may interfere with normal taps');
      } else if (config.longPressThreshold > 2000) {
        warnings.push('Long press threshold is long, may feel unresponsive');
      }
    }

    // Double tap threshold validation
    if (config.doubleTapThreshold !== undefined) {
      if (config.doubleTapThreshold < 100) {
        errors.push('Double tap threshold is too short');
      } else if (config.doubleTapThreshold > 500) {
        errors.push('Double tap threshold is too long');
      }
    }

    // Battery optimization warnings
    if (config.enableBatteryOptimization && config.lowPowerModeBehavior === 'warn_user') {
      warnings.push('Warning-only low power mode may not effectively conserve battery');
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
  getRecommendedConfiguration(useCase: 'gaming' | 'productivity' | 'accessibility' | 'battery-saving'): Partial<MobileConfig> {
    switch (useCase) {
      case 'gaming':
        return {
          enableHapticFeedback: true,
          touchTargetSize: 48,
          swipeThreshold: 30,
          longPressThreshold: 500,
          doubleTapThreshold: 200,
          enableGestureControls: true,
          vibrationIntensity: 'strong',
          enableBatteryOptimization: false,
          networkOptimization: true,
          offlineMode: false
        };

      case 'productivity':
        return {
          enableHapticFeedback: true,
          touchTargetSize: 48,
          swipeThreshold: 50,
          longPressThreshold: 500,
          doubleTapThreshold: 300,
          enableGestureControls: true,
          vibrationIntensity: 'medium',
          enableBatteryOptimization: true,
          lowPowerModeBehavior: 'warn_user',
          networkOptimization: true,
          offlineMode: true
        };

      case 'accessibility':
        return {
          enableHapticFeedback: true,
          touchTargetSize: 56,
          swipeThreshold: 40,
          longPressThreshold: 800,
          doubleTapThreshold: 400,
          enableGestureControls: true,
          vibrationIntensity: 'medium',
          enableBatteryOptimization: false,
          networkOptimization: true,
          offlineMode: true
        };

      case 'battery-saving':
        return {
          enableHapticFeedback: false,
          touchTargetSize: 44,
          swipeThreshold: 60,
          longPressThreshold: 600,
          doubleTapThreshold: 400,
          enableGestureControls: false,
          vibrationIntensity: 'light',
          enableBatteryOptimization: true,
          lowPowerModeBehavior: 'reduce_quality',
          networkOptimization: true,
          offlineMode: true,
          mobileDataWarning: true
        };

      default:
        return {};
    }
  }

  /**
   * Export mobile configuration
   */
  async exportConfiguration(): Promise<string> {
    const config = this.getConfiguration();
    return JSON.stringify({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      configuration: config,
      metadata: {
        description: 'Mobile optimization configuration',
        exportedBy: 'MobileConfigManager'
      }
    }, null, 2);
  }

  /**
   * Import mobile configuration
   */
  async importConfiguration(data: string, options: {
    overwrite?: boolean;
    validateOnly?: boolean;
  } = {}): Promise<void> {
    const { overwrite = true, validateOnly = false } = options;

    try {
      const importData = JSON.parse(data);

      // Validate imported configuration
      const validation = mobileConfigSchema.safeParse(importData.configuration);
      if (!validation.success) {
        throw new Error(`Invalid mobile configuration: ${validation.error.message}`);
      }

      if (validateOnly) {
        return;
      }

      if (overwrite) {
        await this.configManager.set('mobile', validation.data, {
          scope: 'user',
          immediate: true
        });
      } else {
        await this.updateConfiguration(validation.data);
      }

    } catch (error) {
      throw new Error(`Failed to import mobile configuration: ${error}`);
    }
  }
}

// Export singleton instance
export const mobileConfigManager = new MobileConfigManager();
