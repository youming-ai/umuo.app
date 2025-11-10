/**
 * Configuration validation schemas using Zod
 */

import { z } from 'zod';
import type {
  TranscriptionConfig,
  MobileConfig,
  PerformanceConfig,
  MemoryConfig,
  AccessibilityConfig,
  SystemConfig,
  UserPreferences,
  Environment,
  ConfigScope
} from './types';

// Environment validation
const environmentSchema = z.enum(['development', 'staging', 'production']);

// Config scope validation
const configScopeSchema = z.enum(['global', 'user', 'session', 'runtime']);

// Transcription configuration schema
export const transcriptionConfigSchema = z.object({
  maxConcurrency: z.number().min(1).max(10).default(2),
  defaultChunkSize: z.number().min(1024 * 1024).max(50 * 1024 * 1024).default(10 * 1024 * 1024),
  maxChunkSize: z.number().min(5 * 1024 * 1024).max(100 * 1024 * 1024).default(25 * 1024 * 1024),
  overlapDuration: z.number().min(0).max(30).default(5),
  retryAttempts: z.number().min(0).max(5).default(2),
  retryDelay: z.number().min(100).max(10000).default(1000),
  timeout: z.number().min(30000).max(600000).default(180000),
  enableProgressTracking: z.boolean().default(true),
  progressUpdateInterval: z.number().min(500).max(10000).default(2000),
  enableWordTimestamps: z.boolean().default(true),
  languageDetection: z.boolean().default(true),
  model: z.string().min(1).default('whisper-large-v3-turbo'),
  temperature: z.number().min(0).max(1).default(0),
  responseFormat: z.enum(['json', 'verbose_json', 'text', 'srt', 'vtt']).default('verbose_json'),
}) satisfies z.ZodType<TranscriptionConfig>;

// Mobile configuration schema
export const mobileConfigSchema = z.object({
  enableHapticFeedback: z.boolean().default(true),
  touchTargetSize: z.number().min(44).max(100).default(48),
  swipeThreshold: z.number().min(10).max(100).default(50),
  longPressThreshold: z.number().min(300).max(2000).default(500),
  doubleTapThreshold: z.number().min(100).max(500).default(300),
  enableBatteryOptimization: z.boolean().default(true),
  lowPowerModeBehavior: z.enum(['reduce_quality', 'disable_features', 'warn_user']).default('warn_user'),
  networkOptimization: z.boolean().default(true),
  offlineMode: z.boolean().default(false),
  mobileDataWarning: z.boolean().default(true),
  enableGestureControls: z.boolean().default(true),
  vibrationIntensity: z.enum(['light', 'medium', 'strong']).default('medium'),
}) satisfies z.ZodType<MobileConfig>;

// Performance configuration schema
export const performanceConfigSchema = z.object({
  enableMetrics: z.boolean().default(true),
  metricsInterval: z.number().min(1000).max(60000).default(5000),
  enablePerformanceMonitoring: z.boolean().default(true),
  enableMemoryMonitoring: z.boolean().default(true),
  enableProfiling: z.boolean().default(false),
  alertThresholds: z.object({
    memoryUsage: z.number().min(0.1).max(1).default(0.8),
    processingTime: z.number().min(1000).max(300000).default(30000),
    errorRate: z.number().min(0.01).max(1).default(0.05),
    responseTime: z.number().min(100).max(10000).default(2000),
  }).default({}),
  enableOptimizationSuggestions: z.boolean().default(true),
  cacheEnabled: z.boolean().default(true),
  cacheSize: z.number().min(1024 * 1024).max(1024 * 1024 * 1024).default(100 * 1024 * 1024),
  compressionEnabled: z.boolean().default(true),
}) satisfies z.ZodType<PerformanceConfig>;

// Memory configuration schema
export const memoryConfigSchema = z.object({
  maxMemoryUsage: z.number().min(50 * 1024 * 1024).max(2048 * 1024 * 1024).default(512 * 1024 * 1024),
  cleanupInterval: z.number().min(10000).max(300000).default(60000),
  enableGarbageCollection: z.boolean().default(true),
  enableMemoryLeakDetection: z.boolean().default(true),
  adaptiveCleanup: z.boolean().default(true),
  memoryPressureThreshold: z.number().min(0.5).max(0.95).default(0.8),
  enableWeakReferences: z.boolean().default(true),
  objectPoolSize: z.number().min(10).max(1000).default(100),
  enableMemoryProfiling: z.boolean().default(false),
}) satisfies z.ZodType<MemoryConfig>;

// Accessibility configuration schema
export const accessibilityConfigSchema = z.object({
  wcagLevel: z.enum(['AA', 'AAA']).default('AA'),
  enableScreenReader: z.boolean().default(false),
  enableHighContrast: z.boolean().default(false),
  enableKeyboardNavigation: z.boolean().default(true),
  enableFocusIndicators: z.boolean().default(true),
  fontSize: z.enum(['small', 'medium', 'large', 'extra-large']).default('medium'),
  enableReducedMotion: z.boolean().default(false),
  enableTextToSpeech: z.boolean().default(false),
  speechRate: z.number().min(0.5).max(3).default(1),
  enableAlternativeInput: z.boolean().default(true),
  visualIndicators: z.boolean().default(true),
  colorBlindSupport: z.enum(['none', 'protanopia', 'deuteranopia', 'tritanopia']).default('none'),
}) satisfies z.ZodType<AccessibilityConfig>;

// System configuration schema
export const systemConfigSchema = z.object({
  environment: environmentSchema.default('development'),
  debugMode: z.boolean().default(false),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  enableTelemetry: z.boolean().default(false),
  enableCrashReporting: z.boolean().default(true),
  enableFeatureFlags: z.boolean().default(true),
  apiEndpoint: z.string().url().optional(),
  cdnEndpoint: z.string().url().optional(),
  enableCaching: z.boolean().default(true),
  cacheTimeout: z.number().min(60000).max(86400000).default(300000),
  enableCompression: z.boolean().default(true),
  enableSecurityHeaders: z.boolean().default(true),
}) satisfies z.ZodType<SystemConfig>;

// User preferences schema
export const userPreferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'system', 'high-contrast']).default('dark'),
  language: z.string().min(2).max(5).default('en'),
  autoTranscription: z.boolean().default(true),
  defaultPlaybackSpeed: z.number().min(0.25).max(4).step(0.25).default(1),
  volume: z.number().min(0).max(1).step(0.1).default(1),
  enableSubtitles: z.boolean().default(true),
  subtitleSize: z.enum(['small', 'medium', 'large']).default('medium'),
  enableKeyboardShortcuts: z.boolean().default(true),
  autoSave: z.boolean().default(true),
  notifications: z.boolean().default(true),
  syncAcrossDevices: z.boolean().default(false),
  privacyMode: z.boolean().default(false),
}) satisfies z.ZodType<UserPreferences>;

// Complete application configuration schema
export const applicationConfigurationSchema = z.object({
  transcription: transcriptionConfigSchema,
  mobile: mobileConfigSchema,
  performance: performanceConfigSchema,
  memory: memoryConfigSchema,
  accessibility: accessibilityConfigSchema,
  system: systemConfigSchema,
  userPreferences: userPreferencesSchema,
});

// Configuration update schema
export const configurationUpdateSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  scope: configScopeSchema.default('user'),
  validateOnly: z.boolean().default(false),
  skipValidation: z.boolean().default(false),
});

// Configuration import/export schema
export const configurationExportSchema = z.object({
  version: z.string().min(1),
  timestamp: z.string().datetime(),
  environment: environmentSchema,
  configuration: applicationConfigurationSchema,
  metadata: z.object({
    exportedBy: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

// Configuration migration schema
export const configurationMigrationSchema = z.object({
  fromVersion: z.string().min(1),
  toVersion: z.string().min(1),
  migrations: z.array(z.object({
    version: z.string().min(1),
    description: z.string().min(1),
    up: z.function().args(z.record(z.unknown())).returns(z.record(z.unknown())),
    down: z.function().args(z.record(z.unknown())).returns(z.record(z.unknown())),
  })),
});

// Validation helpers
export function validateConfigurationScope(scope: unknown): ConfigScope {
  return configScopeSchema.parse(scope);
}

export function validateEnvironment(environment: unknown): Environment {
  return environmentSchema.parse(environment);
}

export function validateConfigurationKey(key: unknown): string {
  return z.string().min(1).parse(key);
}

// Type guards
export function isValidTranscriptionConfig(config: unknown): config is TranscriptionConfig {
  return transcriptionConfigSchema.safeParse(config).success;
}

export function isValidMobileConfig(config: unknown): config is MobileConfig {
  return mobileConfigSchema.safeParse(config).success;
}

export function isValidPerformanceConfig(config: unknown): config is PerformanceConfig {
  return performanceConfigSchema.safeParse(config).success;
}

export function isValidMemoryConfig(config: unknown): config is MemoryConfig {
  return memoryConfigSchema.safeParse(config).success;
}

export function isValidAccessibilityConfig(config: unknown): config is AccessibilityConfig {
  return accessibilityConfigSchema.safeParse(config).success;
}

export function isValidSystemConfig(config: unknown): config is SystemConfig {
  return systemConfigSchema.safeParse(config).success;
}

export function isValidUserPreferences(config: unknown): config is UserPreferences {
  return userPreferencesSchema.safeParse(config).success;
}

export function isValidApplicationConfiguration(config: unknown): config is z.infer<typeof applicationConfigurationSchema> {
  return applicationConfigurationSchema.safeParse(config).success;
}

// Environment-specific validation
export function validateForEnvironment<T>(schema: z.ZodType<T>, config: unknown, environment: Environment): T {
  const result = schema.safeParse(config);
  if (!result.success) {
    throw new Error(`Configuration validation failed for ${environment}: ${result.error.message}`);
  }
  return result.data;
}

// Partial validation for updates
export function validatePartialConfiguration<T>(schema: z.ZodType<T>, partialConfig: unknown): Partial<T> {
  const partialSchema = schema.partial();
  const result = partialSchema.safeParse(partialConfig);
  if (!result.success) {
    throw new Error(`Partial configuration validation failed: ${result.error.message}`);
  }
  return result.data;
}

// Default configurations
export const defaultTranscriptionConfig: TranscriptionConfig = transcriptionConfigSchema.parse({});
export const defaultMobileConfig: MobileConfig = mobileConfigSchema.parse({});
export const defaultPerformanceConfig: PerformanceConfig = performanceConfigSchema.parse({});
export const defaultMemoryConfig: MemoryConfig = memoryConfigSchema.parse({});
export const defaultAccessibilityConfig: AccessibilityConfig = accessibilityConfigSchema.parse({});
export const defaultSystemConfig: SystemConfig = systemConfigSchema.parse({});
export const defaultUserPreferences: UserPreferences = userPreferencesSchema.parse({});

export const defaultApplicationConfiguration = {
  transcription: defaultTranscriptionConfig,
  mobile: defaultMobileConfig,
  performance: defaultPerformanceConfig,
  memory: defaultMemoryConfig,
  accessibility: defaultAccessibilityConfig,
  system: defaultSystemConfig,
  userPreferences: defaultUserPreferences,
};
