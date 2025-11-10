/**
 * Configuration system type definitions
 */

export type Environment = 'development' | 'staging' | 'production';
export type ConfigScope = 'global' | 'user' | 'session' | 'runtime';

export interface ConfigurationMetadata {
  version: string;
  environment: Environment;
  lastModified: Date;
  checksum: string;
  migrationHistory: string[];
}

export interface ConfigurationChange {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  scope: ConfigScope;
  timestamp: Date;
  source: 'user' | 'system' | 'admin' | 'migration';
}

export interface ConfigurationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigurationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    default?: unknown;
    validate?: (value: unknown) => ConfigurationValidationResult;
    dependsOn?: string[];
    environment?: Environment[];
    scope?: ConfigScope;
    hotReloadable?: boolean;
    description?: string;
    examples?: unknown[];
  };
}

export interface ConfigurationEvents {
  change: ConfigurationChange;
  validationError: { key: string; errors: string[] };
  migrationComplete: { fromVersion: string; toVersion: string };
  syncComplete: { scope: ConfigScope; success: boolean };
}

export type ConfigurationEventListener = <K extends keyof ConfigurationEvents>(
  event: K,
  data: ConfigurationEvents[K]
) => void;

export interface ConfigurationPersistence {
  save: (scope: ConfigScope, data: Record<string, unknown>) => Promise<void>;
  load: (scope: ConfigScope) => Promise<Record<string, unknown>>;
  remove: (scope: ConfigScope, keys: string[]) => Promise<void>;
  exists: (scope: ConfigScope) => Promise<boolean>;
}

export interface ConfigurationSync {
  upload: (data: Record<string, unknown>) => Promise<void>;
  download: () => Promise<Record<string, unknown>>;
  getLastSyncTime: () => Promise<Date>;
  setLastSyncTime: (time: Date) => Promise<void>;
}

export interface ConfigurationCache {
  get: (key: string) => unknown | undefined;
  set: (key: string, value: unknown, ttl?: number) => void;
  delete: (key: string) => void;
  clear: () => void;
  has: (key: string) => boolean;
}

export interface ConfigurationMetrics {
  get: (key: string) => number | undefined;
  increment: (key: string, value?: number) => void;
  timing: (key: string, duration: number) => void;
  gauge: (key: string, value: number) => void;
}

export interface ConfigurationDebugInfo {
  metadata: ConfigurationMetadata;
  activeConfiguration: Record<string, unknown>;
  pendingChanges: Record<string, unknown>;
  validationErrors: Record<string, string[]>;
  syncStatus: Record<ConfigScope, 'synced' | 'pending' | 'error'>;
  performanceMetrics: Record<string, number>;
}

export interface ConfigurationImportExport {
  export: (scopes?: ConfigScope[]) => Promise<string>;
  import: (data: string, options?: { overwrite?: boolean; validateOnly?: boolean }) => Promise<void>;
  validateImport: (data: string) => Promise<ConfigurationValidationResult>;
}

// Feature-specific configuration interfaces
export interface TranscriptionConfig {
  maxConcurrency: number;
  defaultChunkSize: number;
  maxChunkSize: number;
  overlapDuration: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  enableProgressTracking: boolean;
  progressUpdateInterval: number;
  enableWordTimestamps: boolean;
  languageDetection: boolean;
  model: string;
  temperature: number;
  responseFormat: 'json' | 'verbose_json' | 'text' | 'srt' | 'vtt';
}

export interface MobileConfig {
  enableHapticFeedback: boolean;
  touchTargetSize: number;
  swipeThreshold: number;
  longPressThreshold: number;
  doubleTapThreshold: number;
  enableBatteryOptimization: boolean;
  lowPowerModeBehavior: 'reduce_quality' | 'disable_features' | 'warn_user';
  networkOptimization: boolean;
  offlineMode: boolean;
  mobileDataWarning: boolean;
  enableGestureControls: boolean;
  vibrationIntensity: 'light' | 'medium' | 'strong';
}

export interface PerformanceConfig {
  enableMetrics: boolean;
  metricsInterval: number;
  enablePerformanceMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  enableProfiling: boolean;
  alertThresholds: {
    memoryUsage: number;
    processingTime: number;
    errorRate: number;
    responseTime: number;
  };
  enableOptimizationSuggestions: boolean;
  cacheEnabled: boolean;
  cacheSize: number;
  compressionEnabled: boolean;
}

export interface MemoryConfig {
  maxMemoryUsage: number;
  cleanupInterval: number;
  enableGarbageCollection: boolean;
  enableMemoryLeakDetection: boolean;
  adaptiveCleanup: boolean;
  memoryPressureThreshold: number;
  enableWeakReferences: boolean;
  objectPoolSize: number;
  enableMemoryProfiling: boolean;
}

export interface AccessibilityConfig {
  wcagLevel: 'AA' | 'AAA';
  enableScreenReader: boolean;
  enableHighContrast: boolean;
  enableKeyboardNavigation: boolean;
  enableFocusIndicators: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  enableReducedMotion: boolean;
  enableTextToSpeech: boolean;
  speechRate: number;
  enableAlternativeInput: boolean;
  visualIndicators: boolean;
  colorBlindSupport: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export interface SystemConfig {
  environment: Environment;
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableTelemetry: boolean;
  enableCrashReporting: boolean;
  enableFeatureFlags: boolean;
  apiEndpoint: string;
  cdnEndpoint: string;
  enableCaching: boolean;
  cacheTimeout: number;
  enableCompression: boolean;
  enableSecurityHeaders: boolean;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system' | 'high-contrast';
  language: string;
  autoTranscription: boolean;
  defaultPlaybackSpeed: number;
  volume: number;
  enableSubtitles: boolean;
  subtitleSize: 'small' | 'medium' | 'large';
  enableKeyboardShortcuts: boolean;
  autoSave: boolean;
  notifications: boolean;
  syncAcrossDevices: boolean;
  privacyMode: boolean;
}

// Complete configuration interface
export interface ApplicationConfiguration {
  transcription: TranscriptionConfig;
  mobile: MobileConfig;
  performance: PerformanceConfig;
  memory: MemoryConfig;
  accessibility: AccessibilityConfig;
  system: SystemConfig;
  userPreferences: UserPreferences;
}
