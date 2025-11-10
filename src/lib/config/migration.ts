/**
 * Configuration Migration System
 */

import { z } from "zod";
import type {
  ApplicationConfiguration,
  ConfigurationMetadata,
  Environment,
} from "./types";
import { applicationConfigurationSchema } from "./schemas";
import { getConfigurationManager } from "./manager";
import { handleSilently } from "../utils/error-handler";

export interface Migration {
  version: string;
  description: string;
  up: (config: any) => Promise<any>;
  down: (config: any) => Promise<any>;
  dependencies?: string[];
  environment?: Environment[];
  breaking?: boolean;
}

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  appliedMigrations: string[];
  errors: string[];
  warnings: string[];
  rollbackAvailable: boolean;
}

export interface MigrationPlan {
  currentVersion: string;
  targetVersion: string;
  migrations: Migration[];
  estimatedTimeMs: number;
  breakingChanges: string[];
  dependencies: string[];
}

export class ConfigurationMigrator {
  private static instance: ConfigurationMigrator;
  private migrations: Map<string, Migration> = new Map();
  private appliedMigrations: Set<string> = new Set();
  private configManager = getConfigurationManager();

  constructor() {
    this.registerDefaultMigrations();
  }

  static getInstance(): ConfigurationMigrator {
    if (!ConfigurationMigrator.instance) {
      ConfigurationMigrator.instance = new ConfigurationMigrator();
    }
    return ConfigurationMigrator.instance;
  }

  /**
   * Register a new migration
   */
  register(migration: Migration): void {
    this.migrations.set(migration.version, migration);
  }

  /**
   * Get all registered migrations
   */
  getMigrations(): Migration[] {
    return Array.from(this.migrations.values()).sort((a, b) =>
      this.compareVersions(a.version, b.version),
    );
  }

  /**
   * Get migration by version
   */
  getMigration(version: string): Migration | undefined {
    return this.migrations.get(version);
  }

  /**
   * Check if migration has been applied
   */
  isMigrationApplied(version: string): boolean {
    return this.appliedMigrations.has(version);
  }

  /**
   * Create migration plan
   */
  createPlan(fromVersion: string, toVersion: string): MigrationPlan {
    const allMigrations = this.getMigrations();
    const applicableMigrations: Migration[] = [];
    const breakingChanges: string[] = [];
    const dependencies: string[] = [];
    let estimatedTimeMs = 0;

    for (const migration of allMigrations) {
      const versionComparison = this.compareVersions(
        migration.version,
        fromVersion,
      );
      const targetComparison = this.compareVersions(
        migration.version,
        toVersion,
      );

      if (versionComparison > 0 && targetComparison <= 0) {
        // Check environment compatibility
        if (
          migration.environment &&
          !migration.environment.includes(process.env.NODE_ENV as Environment)
        ) {
          continue;
        }

        // Check dependencies
        if (migration.dependencies) {
          for (const dep of migration.dependencies) {
            if (
              !this.isMigrationApplied(dep) &&
              this.compareVersions(dep, fromVersion) > 0
            ) {
              dependencies.push(dep);
            }
          }
        }

        applicableMigrations.push(migration);
        estimatedTimeMs += 1000; // Base estimate per migration

        if (migration.breaking) {
          breakingChanges.push(migration.version);
        }
      }
    }

    return {
      currentVersion: fromVersion,
      targetVersion: toVersion,
      migrations: applicableMigrations,
      estimatedTimeMs,
      breakingChanges,
      dependencies,
    };
  }

  /**
   * Execute migrations
   */
  async migrate(
    targetVersion: string,
    options: {
      dryRun?: boolean;
      force?: boolean;
      rollbackOnError?: boolean;
    } = {},
  ): Promise<MigrationResult> {
    const { dryRun = false, force = false, rollbackOnError = true } = options;

    try {
      // Get current configuration
      const config = await this.configManager.getConfiguration();
      const currentVersion = this.getCurrentVersion(config);

      if (currentVersion === targetVersion) {
        return {
          success: true,
          fromVersion: currentVersion,
          toVersion: targetVersion,
          appliedMigrations: [],
          errors: [],
          warnings: ["No migration needed - already at target version"],
          rollbackAvailable: false,
        };
      }

      // Create migration plan
      const plan = this.createPlan(currentVersion, targetVersion);

      // Check for breaking changes without force flag
      if (plan.breakingChanges.length > 0 && !force && !dryRun) {
        return {
          success: false,
          fromVersion: currentVersion,
          toVersion: targetVersion,
          appliedMigrations: [],
          errors: ["Breaking changes detected. Use force flag to proceed."],
          warnings: [
            `Breaking changes in versions: ${plan.breakingChanges.join(", ")}`,
          ],
          rollbackAvailable: false,
        };
      }

      // Check dependencies
      if (plan.dependencies.length > 0) {
        return {
          success: false,
          fromVersion: currentVersion,
          toVersion: targetVersion,
          appliedMigrations: [],
          errors: [`Missing dependencies: ${plan.dependencies.join(", ")}`],
          warnings: [],
          rollbackAvailable: false,
        };
      }

      if (dryRun) {
        return {
          success: true,
          fromVersion: currentVersion,
          toVersion: targetVersion,
          appliedMigrations: plan.migrations.map((m) => m.version),
          errors: [],
          warnings: [
            `Dry run: ${plan.migrations.length} migrations would be applied`,
          ],
          rollbackAvailable: false,
        };
      }

      // Execute migrations
      const appliedMigrations: string[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      let rollbackData: any = null;

      try {
        rollbackData = JSON.parse(JSON.stringify(config)); // Deep copy for rollback

        for (const migration of plan.migrations) {
          try {
            console.log(
              `Applying migration ${migration.version}: ${migration.description}`,
            );

            const newConfig = await migration.up(config);

            // Validate the migrated configuration
            const validation = this.validateConfiguration(newConfig);
            if (!validation.valid) {
              throw new Error(
                `Configuration validation failed: ${validation.errors.join(", ")}`,
              );
            }

            // Update in-memory configuration
            Object.assign(config, newConfig);
            appliedMigrations.push(migration.version);
            this.appliedMigrations.add(migration.version);
          } catch (error) {
            errors.push(`Migration ${migration.version} failed: ${error}`);
            break;
          }
        }

        // If all migrations succeeded, save the configuration
        if (errors.length === 0) {
          await this.configManager.set("transcription", config.transcription, {
            scope: "user",
            immediate: true,
          });
          await this.configManager.set("mobile", config.mobile, {
            scope: "user",
            immediate: true,
          });
          await this.configManager.set("performance", config.performance, {
            scope: "user",
            immediate: true,
          });
          await this.configManager.set("memory", config.memory, {
            scope: "user",
            immediate: true,
          });
          await this.configManager.set("accessibility", config.accessibility, {
            scope: "user",
            immediate: true,
          });
          await this.configManager.set(
            "system",
            { ...config.system, version: targetVersion },
            {
              scope: "user",
              immediate: true,
            },
          );
          await this.configManager.set(
            "userPreferences",
            config.userPreferences,
            {
              scope: "user",
              immediate: true,
            },
          );
        }
      } catch (error) {
        errors.push(`Configuration save failed: ${error}`);

        // Rollback if enabled
        if (rollbackOnError && rollbackData) {
          try {
            await this.rollback(rollbackData);
            warnings.push("Configuration rolled back due to error");
          } catch (rollbackError) {
            errors.push(`Rollback failed: ${rollbackError}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        fromVersion: currentVersion,
        toVersion: targetVersion,
        appliedMigrations,
        errors,
        warnings,
        rollbackAvailable: rollbackData !== null,
      };
    } catch (error) {
      handleSilently(error, "configuration-migration");

      return {
        success: false,
        fromVersion: "unknown",
        toVersion: targetVersion,
        appliedMigrations: [],
        errors: [`Migration failed: ${error}`],
        warnings: [],
        rollbackAvailable: false,
      };
    }
  }

  /**
   * Rollback to previous configuration
   */
  async rollback(previousConfig: ApplicationConfiguration): Promise<void> {
    try {
      await this.configManager.set(
        "transcription",
        previousConfig.transcription,
        {
          scope: "user",
          immediate: true,
        },
      );
      await this.configManager.set("mobile", previousConfig.mobile, {
        scope: "user",
        immediate: true,
      });
      await this.configManager.set("performance", previousConfig.performance, {
        scope: "user",
        immediate: true,
      });
      await this.configManager.set("memory", previousConfig.memory, {
        scope: "user",
        immediate: true,
      });
      await this.configManager.set(
        "accessibility",
        previousConfig.accessibility,
        {
          scope: "user",
          immediate: true,
        },
      );
      await this.configManager.set("system", previousConfig.system, {
        scope: "user",
        immediate: true,
      });
      await this.configManager.set(
        "userPreferences",
        previousConfig.userPreferences,
        {
          scope: "user",
          immediate: true,
        },
      );

      console.log("Configuration rollback completed successfully");
    } catch (error) {
      throw new Error(`Rollback failed: ${error}`);
    }
  }

  /**
   * Validate configuration against schema
   */
  private validateConfiguration(config: any): {
    valid: boolean;
    errors: string[];
  } {
    try {
      const result = applicationConfigurationSchema.safeParse(config);
      if (result.success) {
        return { valid: true, errors: [] };
      } else {
        return {
          valid: false,
          errors: result.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`,
          ),
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Get current configuration version
   */
  private getCurrentVersion(config: any): string {
    return config.system?.version || "1.0.0";
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);
    const maxLength = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLength; i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }

    return 0;
  }

  /**
   * Register default migrations
   */
  private registerDefaultMigrations(): void {
    // Migration 1.1.0: Add new performance monitoring features
    this.register({
      version: "1.1.0",
      description:
        "Add enhanced performance monitoring and mobile optimization",
      up: async (config) => {
        // Add new performance monitoring settings
        if (!config.performance) {
          config.performance = {};
        }

        config.performance.enableMetrics =
          config.performance.enableMetrics ?? true;
        config.performance.metricsInterval =
          config.performance.metricsInterval ?? 5000;
        config.performance.enablePerformanceMonitoring =
          config.performance.enablePerformanceMonitoring ?? true;
        config.performance.enableMemoryMonitoring =
          config.performance.enableMemoryMonitoring ?? true;
        config.performance.enableProfiling =
          config.performance.enableProfiling ?? false;
        config.performance.alertThresholds = config.performance
          .alertThresholds ?? {
          memoryUsage: 0.8,
          processingTime: 30000,
          errorRate: 0.05,
          responseTime: 2000,
        };
        config.performance.enableOptimizationSuggestions =
          config.performance.enableOptimizationSuggestions ?? true;
        config.performance.cacheEnabled =
          config.performance.cacheEnabled ?? true;
        config.performance.cacheSize =
          config.performance.cacheSize ?? 100 * 1024 * 1024;
        config.performance.compressionEnabled =
          config.performance.compressionEnabled ?? true;

        // Add mobile optimization settings
        if (!config.mobile) {
          config.mobile = {};
        }

        config.mobile.enableHapticFeedback =
          config.mobile.enableHapticFeedback ?? true;
        config.mobile.touchTargetSize = config.mobile.touchTargetSize ?? 48;
        config.mobile.swipeThreshold = config.mobile.swipeThreshold ?? 50;
        config.mobile.longPressThreshold =
          config.mobile.longPressThreshold ?? 500;
        config.mobile.doubleTapThreshold =
          config.mobile.doubleTapThreshold ?? 300;
        config.mobile.enableBatteryOptimization =
          config.mobile.enableBatteryOptimization ?? true;
        config.mobile.lowPowerModeBehavior =
          config.mobile.lowPowerModeBehavior ?? "warn_user";
        config.mobile.networkOptimization =
          config.mobile.networkOptimization ?? true;
        config.mobile.offlineMode = config.mobile.offlineMode ?? false;
        config.mobile.mobileDataWarning =
          config.mobile.mobileDataWarning ?? true;
        config.mobile.enableGestureControls =
          config.mobile.enableGestureControls ?? true;
        config.mobile.vibrationIntensity =
          config.mobile.vibrationIntensity ?? "medium";

        // Add memory management settings
        if (!config.memory) {
          config.memory = {};
        }

        config.memory.maxMemoryUsage =
          config.memory.maxMemoryUsage ?? 512 * 1024 * 1024;
        config.memory.cleanupInterval = config.memory.cleanupInterval ?? 60000;
        config.memory.enableGarbageCollection =
          config.memory.enableGarbageCollection ?? true;
        config.memory.enableMemoryLeakDetection =
          config.memory.enableMemoryLeakDetection ?? true;
        config.memory.adaptiveCleanup = config.memory.adaptiveCleanup ?? true;
        config.memory.memoryPressureThreshold =
          config.memory.memoryPressureThreshold ?? 0.8;
        config.memory.enableWeakReferences =
          config.memory.enableWeakReferences ?? true;
        config.memory.objectPoolSize = config.memory.objectPoolSize ?? 100;
        config.memory.enableMemoryProfiling =
          config.memory.enableMemoryProfiling ?? false;

        // Add accessibility settings
        if (!config.accessibility) {
          config.accessibility = {};
        }

        config.accessibility.wcagLevel = config.accessibility.wcagLevel ?? "AA";
        config.accessibility.enableScreenReader =
          config.accessibility.enableScreenReader ?? false;
        config.accessibility.enableHighContrast =
          config.accessibility.enableHighContrast ?? false;
        config.accessibility.enableKeyboardNavigation =
          config.accessibility.enableKeyboardNavigation ?? true;
        config.accessibility.enableFocusIndicators =
          config.accessibility.enableFocusIndicators ?? true;
        config.accessibility.fontSize =
          config.accessibility.fontSize ?? "medium";
        config.accessibility.enableReducedMotion =
          config.accessibility.enableReducedMotion ?? false;
        config.accessibility.enableTextToSpeech =
          config.accessibility.enableTextToSpeech ?? false;
        config.accessibility.speechRate = config.accessibility.speechRate ?? 1;
        config.accessibility.enableAlternativeInput =
          config.accessibility.enableAlternativeInput ?? true;
        config.accessibility.visualIndicators =
          config.accessibility.visualIndicators ?? true;
        config.accessibility.colorBlindSupport =
          config.accessibility.colorBlindSupport ?? "none";

        return config;
      },
      down: async (config) => {
        // Remove new performance monitoring settings
        if (config.performance) {
          delete config.performance.enableMetrics;
          delete config.performance.metricsInterval;
          delete config.performance.enablePerformanceMonitoring;
          delete config.performance.enableMemoryMonitoring;
          delete config.performance.enableProfiling;
          delete config.performance.alertThresholds;
          delete config.performance.enableOptimizationSuggestions;
          delete config.performance.cacheEnabled;
          delete config.performance.cacheSize;
          delete config.performance.compressionEnabled;
        }

        // Remove mobile optimization settings
        if (config.mobile) {
          delete config.mobile.enableHapticFeedback;
          delete config.mobile.touchTargetSize;
          delete config.mobile.swipeThreshold;
          delete config.mobile.longPressThreshold;
          delete config.mobile.doubleTapThreshold;
          delete config.mobile.enableBatteryOptimization;
          delete config.mobile.lowPowerModeBehavior;
          delete config.mobile.networkOptimization;
          delete config.mobile.offlineMode;
          delete config.mobile.mobileDataWarning;
          delete config.mobile.enableGestureControls;
          delete config.mobile.vibrationIntensity;
        }

        // Remove memory management settings
        if (config.memory) {
          delete config.memory.maxMemoryUsage;
          delete config.memory.cleanupInterval;
          delete config.memory.enableGarbageCollection;
          delete config.memory.enableMemoryLeakDetection;
          delete config.memory.adaptiveCleanup;
          delete config.memory.memoryPressureThreshold;
          delete config.memory.enableWeakReferences;
          delete config.memory.objectPoolSize;
          delete config.memory.enableMemoryProfiling;
        }

        // Remove accessibility settings
        if (config.accessibility) {
          delete config.accessibility.wcagLevel;
          delete config.accessibility.enableScreenReader;
          delete config.accessibility.enableHighContrast;
          delete config.accessibility.enableKeyboardNavigation;
          delete config.accessibility.enableFocusIndicators;
          delete config.accessibility.fontSize;
          delete config.accessibility.enableReducedMotion;
          delete config.accessibility.enableTextToSpeech;
          delete config.accessibility.speechRate;
          delete config.accessibility.enableAlternativeInput;
          delete config.accessibility.visualIndicators;
          delete config.accessibility.colorBlindSupport;
        }

        return config;
      },
    });

    // Migration 1.2.0: Add hot-reload and admin features
    this.register({
      version: "1.2.0",
      description: "Add hot-reload configuration updates and admin interface",
      up: async (config) => {
        // Update system configuration to support hot-reload
        if (!config.system) {
          config.system = {};
        }

        config.system.enableHotReload = config.system.enableHotReload ?? true;
        config.system.hotReloadDebounceMs =
          config.system.hotReloadDebounceMs ?? 1000;
        config.system.enableConfigurationValidation =
          config.system.enableConfigurationValidation ?? true;
        config.system.enableRollbackOnError =
          config.system.enableRollbackOnError ?? true;

        return config;
      },
      down: async (config) => {
        if (config.system) {
          delete config.system.enableHotReload;
          delete config.system.hotReloadDebounceMs;
          delete config.system.enableConfigurationValidation;
          delete config.system.enableRollbackOnError;
        }

        return config;
      },
    });
  }
}

// Export singleton instance
export const configurationMigrator = ConfigurationMigrator.getInstance();

/**
 * Migration utilities
 */

/**
 * Check if migration is needed
 */
export async function needsMigration(targetVersion: string): Promise<boolean> {
  const configManager = getConfigurationManager();
  await configManager.initialize();
  const config = configManager.getConfiguration();
  const currentVersion = config.system?.version || "1.0.0";

  return (
    configurationMigrator.compareVersions(currentVersion, targetVersion) < 0
  );
}

/**
 * Run migration to target version
 */
export async function runMigration(
  targetVersion: string,
  options?: {
    dryRun?: boolean;
    force?: boolean;
  },
): Promise<MigrationResult> {
  return configurationMigrator.migrate(targetVersion, options);
}

/**
 * Get migration plan
 */
export function getMigrationPlan(
  fromVersion: string,
  toVersion: string,
): MigrationPlan {
  return configurationMigrator.createPlan(fromVersion, toVersion);
}

/**
 * Register custom migration
 */
export function registerMigration(migration: Migration): void {
  configurationMigrator.register(migration);
}
