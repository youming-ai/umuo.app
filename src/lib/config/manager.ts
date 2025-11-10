/**
 * Core Configuration Manager
 */

import { EventEmitter } from 'events';
import type {
  ConfigurationMetadata,
  ConfigurationChange,
  ConfigurationValidationResult,
  ConfigurationEventListener,
  ConfigurationPersistence,
  ConfigurationCache,
  ConfigurationMetrics,
  ApplicationConfiguration,
  ConfigScope,
  Environment
} from './types';
import {
  applicationConfigurationSchema,
  configurationUpdateSchema,
  validateForEnvironment,
  validatePartialConfiguration
} from './schemas';
import {
  createEnvironmentConfiguration,
  detectEnvironment
} from './environments';
import { handleSilently } from '../utils/error-handler';

export class ConfigurationManager extends EventEmitter {
  private static instance: ConfigurationManager;

  private configuration: ApplicationConfiguration;
  private metadata: ConfigurationMetadata;
  private pendingChanges: Map<string, unknown> = new Map();
  private validationErrors: Map<string, string[]> = new Map();
  private persistence: ConfigurationPersistence;
  private cache: ConfigurationCache;
  private metrics: ConfigurationMetrics;
  private environment: Environment;
  private isInitialized = false;

  constructor(options: {
    persistence?: ConfigurationPersistence;
    cache?: ConfigurationCache;
    metrics?: ConfigurationMetrics;
    environment?: Environment;
  } = {}) {
    super();
    this.environment = options.environment || detectEnvironment();
    this.configuration = createEnvironmentConfiguration();
    this.persistence = options.persistence || this.createDefaultPersistence();
    this.cache = options.cache || this.createDefaultCache();
    this.metrics = options.metrics || this.createDefaultMetrics();

    this.metadata = {
      version: '1.0.0',
      environment: this.environment,
      lastModified: new Date(),
      checksum: this.calculateChecksum(),
      migrationHistory: [],
    };
  }

  static getInstance(options?: {
    persistence?: ConfigurationPersistence;
    cache?: ConfigurationCache;
    metrics?: ConfigurationMetrics;
    environment?: Environment;
  }): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager(options);
    }
    return ConfigurationManager.instance;
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load configuration from persistence
      await this.loadConfiguration();

      // Apply environment overrides
      this.applyEnvironmentOverrides();

      // Validate configuration
      await this.validateConfiguration();

      // Setup auto-save
      this.setupAutoSave();

      this.isInitialized = true;
      this.emit('initialized', this.configuration);

    } catch (error) {
      handleSilently(error, 'configuration-initialization');
      throw new Error(`Failed to initialize configuration: ${error}`);
    }
  }

  /**
   * Get the current configuration
   */
  getConfiguration(): ApplicationConfiguration {
    return { ...this.configuration };
  }

  /**
   * Get a specific configuration value by key
   */
  get<T = unknown>(key: string): T | undefined {
    const keys = key.split('.');
    let value: any = this.configuration;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value as T;
  }

  /**
   * Set a configuration value
   */
  async set(key: string, value: unknown, options: {
    scope?: ConfigScope;
    skipValidation?: boolean;
    immediate?: boolean;
  } = {}): Promise<void> {
    const { scope = 'user', skipValidation = false, immediate = false } = options;

    // Validate the update
    if (!skipValidation) {
      const validation = await this.validateUpdate(key, value);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Get current value for change tracking
    const currentValue = this.get(key);

    // Apply the change
    this.applyUpdate(key, value);

    // Track the change
    const change: ConfigurationChange = {
      key,
      oldValue: currentValue,
      newValue: value,
      scope,
      timestamp: new Date(),
      source: 'user'
    };

    // Emit change event
    this.emit('change', change);

    // Save if immediate or schedule auto-save
    if (immediate) {
      await this.saveConfiguration(scope);
    } else {
      this.pendingChanges.set(key, value);
    }

    // Update metrics
    this.metrics.increment('configuration.updates');
    this.metrics.timing('configuration.update_time', Date.now() - change.timestamp.getTime());
  }

  /**
   * Update multiple configuration values
   */
  async updateMany(updates: Array<{
    key: string;
    value: unknown;
    scope?: ConfigScope;
  }>, options: {
    skipValidation?: boolean;
    immediate?: boolean;
  } = {}): Promise<void> {
    const { skipValidation = false, immediate = false } = options;

    // Validate all updates first
    if (!skipValidation) {
      for (const update of updates) {
        const validation = await this.validateUpdate(update.key, update.value);
        if (!validation.valid) {
          throw new Error(`Configuration validation failed for ${update.key}: ${validation.errors.join(', ')}`);
        }
      }
    }

    // Apply all updates
    for (const update of updates) {
      const currentValue = this.get(update.key);
      this.applyUpdate(update.key, update.value);

      const change: ConfigurationChange = {
        key: update.key,
        oldValue: currentValue,
        newValue: update.value,
        scope: update.scope || 'user',
        timestamp: new Date(),
        source: 'user'
      };

      this.emit('change', change);

      if (!immediate) {
        this.pendingChanges.set(update.key, update.value);
      }
    }

    // Save if immediate
    if (immediate) {
      const scopes = [...new Set(updates.map(u => u.scope || 'user'))];
      await Promise.all(scopes.map(scope => this.saveConfiguration(scope)));
    }

    // Update metrics
    this.metrics.increment('configuration.batch_updates', updates.length);
  }

  /**
   * Reset configuration to defaults
   */
  async reset(scope?: ConfigScope): Promise<void> {
    if (scope) {
      // Reset specific scope
      await this.persistence.remove(scope, Object.keys(this.configuration));
    } else {
      // Reset all scopes
      const scopes: ConfigScope[] = ['global', 'user', 'session', 'runtime'];
      await Promise.all(scopes.map(s => this.persistence.remove(s, Object.keys(this.configuration))));
    }

    // Reload configuration
    await this.loadConfiguration();
    this.applyEnvironmentOverrides();

    this.emit('reset', { scope });
    this.metrics.increment('configuration.resets');
  }

  /**
   * Export configuration
   */
  async export(options: {
    scopes?: ConfigScope[];
    includeMetadata?: boolean;
    format?: 'json' | 'yaml';
  } = {}): Promise<string> {
    const { scopes = ['global', 'user'], includeMetadata = true, format = 'json' } = options;

    const exportData: any = {
      version: this.metadata.version,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      configuration: this.getScopedConfiguration(scopes),
    };

    if (includeMetadata) {
      exportData.metadata = {
        ...this.metadata,
        checksum: this.calculateChecksum(),
      };
    }

    if (format === 'yaml') {
      // For now, return JSON - implement YAML conversion if needed
      return JSON.stringify(exportData, null, 2);
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configuration
   */
  async import(data: string, options: {
    overwrite?: boolean;
    validateOnly?: boolean;
    scopes?: ConfigScope[];
  } = {}): Promise<void> {
    const { overwrite = true, validateOnly = false, scopes = ['global', 'user'] } = options;

    try {
      const importData = JSON.parse(data);

      // Validate import data
      const validation = validateForEnvironment(
        applicationConfigurationSchema,
        importData.configuration,
        this.environment
      );

      if (!validation) {
        throw new Error('Import data validation failed');
      }

      if (validateOnly) {
        return;
      }

      // Apply imported configuration
      if (overwrite) {
        this.configuration = { ...this.configuration, ...importData.configuration };
      } else {
        // Merge with existing configuration
        this.configuration = this.mergeConfigurations(this.configuration, importData.configuration);
      }

      // Save to specified scopes
      await Promise.all(scopes.map(scope => this.saveConfiguration(scope)));

      this.emit('imported', { data: importData, scopes });
      this.metrics.increment('configuration.imports');

    } catch (error) {
      handleSilently(error, 'configuration-import');
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  /**
   * Validate configuration update
   */
  private async validateUpdate(key: string, value: unknown): Promise<ConfigurationValidationResult> {
    try {
      // Create temporary configuration with the update
      const tempConfig = { ...this.configuration };
      this.applyUpdateToConfig(tempConfig, key, value);

      // Validate against schema
      validateForEnvironment(applicationConfigurationSchema, tempConfig, this.environment);

      return { valid: true, errors: [], warnings: [] };

    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
  }

  /**
   * Apply update to configuration
   */
  private applyUpdate(key: string, value: unknown): void {
    this.applyUpdateToConfig(this.configuration, key, value);
    this.metadata.lastModified = new Date();
    this.metadata.checksum = this.calculateChecksum();
  }

  /**
   * Apply update to a configuration object
   */
  private applyUpdateToConfig(config: any, key: string, value: unknown): void {
    const keys = key.split('.');
    let current = config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Load configuration from persistence
   */
  private async loadConfiguration(): Promise<void> {
    const scopes: ConfigScope[] = ['global', 'user', 'session', 'runtime'];

    for (const scope of scopes) {
      try {
        if (await this.persistence.exists(scope)) {
          const scopeConfig = await this.persistence.load(scope);
          this.configuration = { ...this.configuration, ...scopeConfig };
        }
      } catch (error) {
        handleSilently(error, 'configuration-load', { scope });
      }
    }
  }

  /**
   * Save configuration to persistence
   */
  private async saveConfiguration(scope: ConfigScope): Promise<void> {
    try {
      const scopeConfig = this.getScopedConfiguration([scope]);
      await this.persistence.save(scope, scopeConfig);
      this.metrics.increment('configuration.saves');
    } catch (error) {
      handleSilently(error, 'configuration-save', { scope });
      throw error;
    }
  }

  /**
   * Get configuration for specific scopes
   */
  private getScopedConfiguration(scopes: ConfigScope[]): Partial<ApplicationConfiguration> {
    // This is a simplified implementation - in practice, you'd need to
    // track which configuration keys belong to which scopes
    return this.configuration;
  }

  /**
   * Apply environment overrides
   */
  private applyEnvironmentOverrides(): void {
    const envConfig = createEnvironmentConfiguration();
    this.configuration = { ...envConfig, ...this.configuration };
    this.configuration.system.environment = this.environment;
  }

  /**
   * Validate entire configuration
   */
  private async validateConfiguration(): Promise<void> {
    try {
      validateForEnvironment(
        applicationConfigurationSchema,
        this.configuration,
        this.environment
      );
    } catch (error) {
      this.emit('validationError', { errors: [error instanceof Error ? error.message : String(error)] });
      throw error;
    }
  }

  /**
   * Setup auto-save functionality
   */
  private setupAutoSave(): void {
    // Save pending changes every 30 seconds
    setInterval(async () => {
      if (this.pendingChanges.size > 0) {
        try {
          await this.saveConfiguration('user');
          this.pendingChanges.clear();
        } catch (error) {
          handleSilently(error, 'configuration-auto-save');
        }
      }
    }, 30000);
  }

  /**
   * Calculate configuration checksum
   */
  private calculateChecksum(): string {
    const configString = JSON.stringify(this.configuration);
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Merge configurations
   */
  private mergeConfigurations(
    base: ApplicationConfiguration,
    override: Partial<ApplicationConfiguration>
  ): ApplicationConfiguration {
    return {
      ...base,
      ...override,
      transcription: { ...base.transcription, ...override.transcription },
      mobile: { ...base.mobile, ...override.mobile },
      performance: { ...base.performance, ...override.performance },
      memory: { ...base.memory, ...override.memory },
      accessibility: { ...base.accessibility, ...override.accessibility },
      system: { ...base.system, ...override.system },
      userPreferences: { ...base.userPreferences, ...override.userPreferences },
    };
  }

  /**
   * Create default persistence implementation
   */
  private createDefaultPersistence(): ConfigurationPersistence {
    return {
      save: async (scope, data) => {
        const key = `config_${scope}`;
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(key, JSON.stringify(data));
        }
      },
      load: async (scope) => {
        const key = `config_${scope}`;
        if (typeof window !== 'undefined' && window.localStorage) {
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : {};
        }
        return {};
      },
      remove: async (scope, keys) => {
        const key = `config_${scope}`;
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(key);
        }
      },
      exists: async (scope) => {
        const key = `config_${scope}`;
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem(key) !== null;
        }
        return false;
      }
    };
  }

  /**
   * Create default cache implementation
   */
  private createDefaultCache(): ConfigurationCache {
    const cache = new Map<string, { value: unknown; expires?: number }>();

    return {
      get: (key) => {
        const item = cache.get(key);
        if (!item) return undefined;
        if (item.expires && Date.now() > item.expires) {
          cache.delete(key);
          return undefined;
        }
        return item.value;
      },
      set: (key, value, ttl) => {
        cache.set(key, {
          value,
          expires: ttl ? Date.now() + ttl : undefined
        });
      },
      delete: (key) => cache.delete(key),
      clear: () => cache.clear(),
      has: (key) => {
        const item = cache.get(key);
        if (!item) return false;
        if (item.expires && Date.now() > item.expires) {
          cache.delete(key);
          return false;
        }
        return true;
      }
    };
  }

  /**
   * Create default metrics implementation
   */
  private createDefaultMetrics(): ConfigurationMetrics {
    const metrics = new Map<string, number>();

    return {
      get: (key) => metrics.get(key),
      increment: (key, value = 1) => {
        metrics.set(key, (metrics.get(key) || 0) + value);
      },
      timing: (key, duration) => {
        metrics.set(`${key}_timing`, duration);
      },
      gauge: (key, value) => {
        metrics.set(key, value);
      }
    };
  }
}

// Export singleton instance getter
export function getConfigurationManager(): ConfigurationManager {
  return ConfigurationManager.getInstance();
}
