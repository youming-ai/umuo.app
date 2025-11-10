/**
 * Configuration Management System
 *
 * A comprehensive configuration management system for optimization settings
 * with hot-reload support, environment-specific configurations, and validation.
 */

// Core types and interfaces
export type {
  Environment,
  ConfigScope,
  ConfigurationMetadata,
  ConfigurationChange,
  ConfigurationValidationResult,
  ConfigurationSchema,
  ConfigurationEvents,
  ConfigurationEventListener,
  ConfigurationPersistence,
  ConfigurationCache,
  ConfigurationSync,
  ConfigurationMetrics,
  ConfigurationDebugInfo,
  ConfigurationImportExport,
} from './types';

export type {
  TranscriptionConfig,
  MobileConfig,
  PerformanceConfig,
  MemoryConfig,
  AccessibilityConfig,
  SystemConfig,
  UserPreferences,
  ApplicationConfiguration,
} from './types';

// Validation schemas
export {
  transcriptionConfigSchema,
  mobileConfigSchema,
  performanceConfigSchema,
  memoryConfigSchema,
  accessibilityConfigSchema,
  systemConfigSchema,
  userPreferencesSchema,
  applicationConfigurationSchema,
  configurationUpdateSchema,
  configurationExportSchema,
  configurationMigrationSchema,
  validateConfigurationScope,
  validateEnvironment,
  validateConfigurationKey,
  isValidTranscriptionConfig,
  isValidMobileConfig,
  isValidPerformanceConfig,
  isValidMemoryConfig,
  isValidAccessibilityConfig,
  isValidSystemConfig,
  isValidUserPreferences,
  isValidApplicationConfiguration,
  validateForEnvironment,
  validatePartialConfiguration,
  defaultTranscriptionConfig,
  defaultMobileConfig,
  defaultPerformanceConfig,
  defaultMemoryConfig,
  defaultAccessibilityConfig,
  defaultSystemConfig,
  defaultUserPreferences,
  defaultApplicationConfiguration,
} from './schemas';

// Core configuration manager
export {
  ConfigurationManager,
  getConfigurationManager,
} from './manager';

// Environment-specific configurations
export {
  getEnvironmentConfig,
  mergeWithEnvironmentConfig,
  detectEnvironment,
  createEnvironmentConfiguration,
  isFeatureEnabled,
  isFeatureExperimental,
  getEnabledFeatures,
  getApiConfig,
  getLoggingConfig,
  getPerformanceConfig,
  getSecurityConfig,
  type EnvironmentConfig,
} from './environments';

// Hot-reload functionality
export {
  HotReloadManager,
  hotReloadManager,
  applyHotReloadChanges,
  enableHotReload,
  disableHotReload,
  getHotReloadManager,
  type HotReloadOptions,
  type HotReloadEvent,
  type ConfigurationPatch,
} from './hot-reload';

// Module-specific configuration managers
export {
  transcriptionConfigManager,
  TranscriptionConfigManager,
} from './modules/transcription';

export {
  mobileConfigManager,
  MobileConfigManager,
} from './modules/mobile';

export {
  performanceConfigManager,
  PerformanceConfigManager,
} from './modules/performance';

export {
  memoryConfigManager,
  MemoryConfigManager,
} from './modules/memory';

export {
  accessibilityConfigManager,
  AccessibilityConfigManager,
} from './modules/accessibility';

// Admin interface
export {
  configurationManagerAdmin,
  ConfigurationManagerAdmin,
  type AdminPermission,
  type AdminUser,
  type ConfigurationBackup,
  type ConfigurationTemplate,
  type ConfigurationAuditLog,
} from './admin';

// TanStack Query integration
export {
  configurationKeys,
  useConfiguration,
  useConfigurationSection,
  useConfigurationValue,
  useConfigurationMetadata,
  useConfigurationEnvironment,
  useUpdateConfiguration,
  useUpdateMultipleConfiguration,
  useResetConfiguration,
  useExportConfiguration,
  useImportConfiguration,
  useHotReloadStatus,
  useApplyHotReloadChanges,
  useTranscriptionConfiguration,
  useUpdateTranscriptionConfiguration,
  useMobileConfiguration,
  useUpdateMobileConfiguration,
  usePerformanceConfiguration,
  useUpdatePerformanceConfiguration,
  useMemoryConfiguration,
  useUpdateMemoryConfiguration,
  useAccessibilityConfiguration,
  useUpdateAccessibilityConfiguration,
  useRealtimeConfiguration,
  useConfigurationSubscription,
  useOptimisticConfigurationUpdate,
  usePrefetchConfiguration,
} from './query-integration';

// Migration system
export {
  configurationMigrator,
  ConfigurationMigrator,
  needsMigration,
  runMigration,
  getMigrationPlan,
  registerMigration,
  type Migration,
  type MigrationResult,
  type MigrationPlan,
} from './migration';

// Utility functions
export async function initializeConfiguration(options?: {
  environment?: Environment;
  persistence?: import('./types').ConfigurationPersistence;
  cache?: import('./types').ConfigurationCache;
  metrics?: import('./types').ConfigurationMetrics;
}): Promise<ConfigurationManager> {
  const manager = getConfigurationManager();
  await manager.initialize();
  return manager;
}

export async function getConfiguration<T = unknown>(key: string): Promise<T | undefined> {
  const manager = getConfigurationManager();
  await manager.initialize();
  return manager.get<T>(key);
}

export async function setConfiguration(
  key: string,
  value: unknown,
  options?: {
    scope?: ConfigScope;
    skipValidation?: boolean;
    immediate?: boolean;
  }
): Promise<void> {
  const manager = getConfigurationManager();
  await manager.initialize();
  return manager.set(key, value, options);
}

export async function updateConfiguration(
  updates: Record<string, unknown>,
  options?: {
    scope?: ConfigScope;
    skipValidation?: boolean;
    immediate?: boolean;
  }
): Promise<void> {
  const manager = getConfigurationManager();
  await manager.initialize();
  const changePromises = Object.entries(updates).map(([key, value]) =>
    manager.set(key, value, options)
  );
  await Promise.all(changePromises);
}

// Re-export error handling utilities
export { handleSilently, ErrorHandler, TranscriptionError } from '../utils/error-handler';

// Version information
export const CONFIG_VERSION = '1.2.0';
export const CONFIG_SCHEMA_VERSION = '1.0.0';
