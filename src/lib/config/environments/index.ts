/**
 * Environment-specific configurations
 */

import type { Environment, ApplicationConfiguration } from '../types';
import { defaultApplicationConfiguration } from '../schemas';
import type { ApplicationConfiguration as AppConfigType } from '../types';

export interface EnvironmentConfig {
  environment: Environment;
  overrides: Partial<ApplicationConfiguration>;
  features: {
    enabled: string[];
    disabled: string[];
    experimental: string[];
  };
  api: {
    timeout: number;
    retries: number;
    baseUrl: string;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableConsole: boolean;
    enableRemote: boolean;
  };
  performance: {
    enableMonitoring: boolean;
    enableProfiling: boolean;
    sampleRate: number;
  };
  security: {
    enableCSP: boolean;
    enableHSTS: boolean;
    enableRateLimit: boolean;
  };
}

export const environmentConfigs: Record<Environment, EnvironmentConfig> = {
  development: {
    environment: 'development',
    overrides: {
      system: {
        environment: 'development',
        debugMode: true,
        logLevel: 'debug',
        enableTelemetry: false,
        enableFeatureFlags: true,
        apiEndpoint: 'http://localhost:3000/api',
        enableCaching: false,
        cacheTimeout: 60000,
        enableSecurityHeaders: false,
      },
      transcription: {
        maxConcurrency: 1,
        defaultChunkSize: 5 * 1024 * 1024,
        enableProgressTracking: true,
        progressUpdateInterval: 1000,
        timeout: 60000,
        retryAttempts: 1,
      },
      mobile: {
        enableBatteryOptimization: false,
        offlineMode: false,
        mobileDataWarning: false,
      },
      performance: {
        enableMetrics: true,
        enablePerformanceMonitoring: true,
        enableProfiling: true,
        metricsInterval: 1000,
        cacheSize: 50 * 1024 * 1024,
        compressionEnabled: false,
      },
      memory: {
        maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
        cleanupInterval: 30000,
        enableMemoryProfiling: true,
        objectPoolSize: 50,
      },
      accessibility: {
        enableScreenReader: false,
        enableHighContrast: false,
      },
    },
    features: {
      enabled: ['debug-mode', 'hot-reload', 'feature-flags', 'mock-data'],
      disabled: ['telemetry', 'production-optimizations'],
      experimental: ['ai-features', 'advanced-analytics'],
    },
    api: {
      timeout: 30000,
      retries: 1,
      baseUrl: 'http://localhost:3000/api',
    },
    logging: {
      level: 'debug',
      enableConsole: true,
      enableRemote: false,
    },
    performance: {
      enableMonitoring: true,
      enableProfiling: true,
      sampleRate: 1.0,
    },
    security: {
      enableCSP: false,
      enableHSTS: false,
      enableRateLimit: false,
    },
  },

  staging: {
    environment: 'staging',
    overrides: {
      system: {
        environment: 'staging',
        debugMode: true,
        logLevel: 'info',
        enableTelemetry: true,
        enableFeatureFlags: true,
        apiEndpoint: 'https://staging.umuo.app/api',
        enableCaching: true,
        cacheTimeout: 300000,
        enableSecurityHeaders: true,
      },
      transcription: {
        maxConcurrency: 2,
        defaultChunkSize: 10 * 1024 * 1024,
        enableProgressTracking: true,
        progressUpdateInterval: 2000,
        timeout: 120000,
        retryAttempts: 2,
      },
      mobile: {
        enableBatteryOptimization: true,
        offlineMode: true,
        mobileDataWarning: true,
      },
      performance: {
        enableMetrics: true,
        enablePerformanceMonitoring: true,
        enableProfiling: true,
        metricsInterval: 5000,
        cacheSize: 100 * 1024 * 1024,
        compressionEnabled: true,
      },
      memory: {
        maxMemoryUsage: 512 * 1024 * 1024, // 512MB
        cleanupInterval: 60000,
        enableMemoryProfiling: true,
        objectPoolSize: 100,
      },
    },
    features: {
      enabled: ['telemetry', 'feature-flags', 'performance-monitoring'],
      disabled: ['experimental-features'],
      experimental: ['ai-features'],
    },
    api: {
      timeout: 60000,
      retries: 2,
      baseUrl: 'https://staging.umuo.app/api',
    },
    logging: {
      level: 'info',
      enableConsole: true,
      enableRemote: true,
    },
    performance: {
      enableMonitoring: true,
      enableProfiling: true,
      sampleRate: 0.5,
    },
    security: {
      enableCSP: true,
      enableHSTS: false,
      enableRateLimit: true,
    },
  },

  production: {
    environment: 'production',
    overrides: {
      system: {
        environment: 'production',
        debugMode: false,
        logLevel: 'warn',
        enableTelemetry: true,
        enableCrashReporting: true,
        enableFeatureFlags: false,
        apiEndpoint: 'https://umuo.app/api',
        enableCaching: true,
        cacheTimeout: 600000,
        enableCompression: true,
        enableSecurityHeaders: true,
      },
      transcription: {
        maxConcurrency: 3,
        defaultChunkSize: 15 * 1024 * 1024,
        enableProgressTracking: true,
        progressUpdateInterval: 3000,
        timeout: 300000,
        retryAttempts: 3,
      },
      mobile: {
        enableBatteryOptimization: true,
        offlineMode: true,
        mobileDataWarning: true,
        enableHapticFeedback: true,
        vibrationIntensity: 'medium',
      },
      performance: {
        enableMetrics: true,
        enablePerformanceMonitoring: true,
        enableProfiling: false,
        metricsInterval: 10000,
        cacheSize: 200 * 1024 * 1024,
        compressionEnabled: true,
      },
      memory: {
        maxMemoryUsage: 256 * 1024 * 1024, // 256MB
        cleanupInterval: 120000,
        enableMemoryProfiling: false,
        objectPoolSize: 200,
        adaptiveCleanup: true,
      },
      accessibility: {
        wcagLevel: 'AA',
        enableScreenReader: true,
        enableKeyboardNavigation: true,
        enableFocusIndicators: true,
        enableAlternativeInput: true,
      },
    },
    features: {
      enabled: ['telemetry', 'crash-reporting', 'performance-optimizations'],
      disabled: ['debug-mode', 'hot-reload', 'feature-flags', 'profiling'],
      experimental: [],
    },
    api: {
      timeout: 120000,
      retries: 3,
      baseUrl: 'https://umuo.app/api',
    },
    logging: {
      level: 'warn',
      enableConsole: false,
      enableRemote: true,
    },
    performance: {
      enableMonitoring: true,
      enableProfiling: false,
      sampleRate: 0.1,
    },
    security: {
      enableCSP: true,
      enableHSTS: true,
      enableRateLimit: true,
    },
  },
};

/**
 * Get environment configuration for the current environment
 */
export function getEnvironmentConfig(environment: Environment): EnvironmentConfig {
  return environmentConfigs[environment];
}

/**
 * Merge default configuration with environment overrides
 */
export function mergeWithEnvironmentConfig(
  baseConfig: ApplicationConfiguration,
  environment: Environment
): ApplicationConfiguration {
  const envConfig = getEnvironmentConfig(environment);

  return {
    ...baseConfig,
    ...envConfig.overrides,
    system: {
      ...baseConfig.system,
      ...envConfig.overrides.system,
      environment,
    },
    transcription: {
      ...baseConfig.transcription,
      ...envConfig.overrides.transcription,
    },
    mobile: {
      ...baseConfig.mobile,
      ...envConfig.overrides.mobile,
    },
    performance: {
      ...baseConfig.performance,
      ...envConfig.overrides.performance,
    },
    memory: {
      ...baseConfig.memory,
      ...envConfig.overrides.memory,
    },
    accessibility: {
      ...baseConfig.accessibility,
      ...envConfig.overrides.accessibility,
    },
    userPreferences: {
      ...baseConfig.userPreferences,
      ...envConfig.overrides.userPreferences,
    },
  };
}

/**
 * Get the current environment from various sources
 */
export function detectEnvironment(): Environment {
  // Check environment variable first (server-side)
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    const env = process.env.NODE_ENV as Environment;
    if (['development', 'staging', 'production'].includes(env)) {
      return env;
    }
  }

  // Check NEXT_PUBLIC environment variable (client-side)
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
      return 'development';
    }

    if (hostname.includes('staging') || hostname.includes('-staging.') || hostname.includes('staging.')) {
      return 'staging';
    }

    return 'production';
  }

  // Default to development
  return 'development';
}

/**
 * Create a complete configuration for the current environment
 */
export function createEnvironmentConfiguration(): ApplicationConfiguration {
  const environment = detectEnvironment();
  return mergeWithEnvironmentConfig(defaultApplicationConfiguration, environment);
}

/**
 * Check if a feature is enabled in the current environment
 */
export function isFeatureEnabled(featureName: string, environment?: Environment): boolean {
  const env = environment || detectEnvironment();
  const envConfig = getEnvironmentConfig(env);

  return envConfig.features.enabled.includes(featureName) &&
         !envConfig.features.disabled.includes(featureName);
}

/**
 * Check if a feature is experimental in the current environment
 */
export function isFeatureExperimental(featureName: string, environment?: Environment): boolean {
  const env = environment || detectEnvironment();
  const envConfig = getEnvironmentConfig(env);

  return envConfig.features.experimental.includes(featureName);
}

/**
 * Get all enabled features for an environment
 */
export function getEnabledFeatures(environment?: Environment): string[] {
  const env = environment || detectEnvironment();
  const envConfig = getEnvironmentConfig(env);

  return envConfig.features.enabled.filter(feature =>
    !envConfig.features.disabled.includes(feature)
  );
}

/**
 * Get API configuration for an environment
 */
export function getApiConfig(environment?: Environment) {
  const env = environment || detectEnvironment();
  return getEnvironmentConfig(env).api;
}

/**
 * Get logging configuration for an environment
 */
export function getLoggingConfig(environment?: Environment) {
  const env = environment || detectEnvironment();
  return getEnvironmentConfig(env).logging;
}

/**
 * Get performance configuration for an environment
 */
export function getPerformanceConfig(environment?: Environment) {
  const env = environment || detectEnvironment();
  return getEnvironmentConfig(env).performance;
}

/**
 * Get security configuration for an environment
 */
export function getSecurityConfig(environment?: Environment) {
  const env = environment || detectEnvironment();
  return getEnvironmentConfig(env).security;
}
