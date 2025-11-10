/**
 * Hot-Reload Configuration System
 */

import { EventEmitter } from 'events';
import type {
  ConfigurationChange,
  ConfigurationEventListener,
  ConfigScope,
  ApplicationConfiguration
} from './types';
import { getConfigurationManager } from './manager';

export interface HotReloadOptions {
  enabled: boolean;
  debounceMs: number;
  validateBeforeApply: boolean;
  rollbackOnError: boolean;
  maxRetries: number;
  enableTelemetry: boolean;
}

export interface HotReloadEvent {
  type: 'before-change' | 'after-change' | 'error' | 'rollback' | 'validation-failed';
  data: any;
  timestamp: Date;
}

export interface ConfigurationPatch {
  id: string;
  changes: Array<{
    key: string;
    oldValue: unknown;
    newValue: unknown;
    scope: ConfigScope;
  }>;
  applied: boolean;
  timestamp: Date;
  rollbackData?: Record<string, unknown>;
}

export class HotReloadManager extends EventEmitter {
  private static instance: HotReloadManager;
  private options: HotReloadOptions;
  private pendingPatches: Map<string, ConfigurationPatch> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private rollbackStack: ConfigurationPatch[] = [];
  private configManager = getConfigurationManager();
  private isEnabled = false;

  constructor(options: Partial<HotReloadOptions> = {}) {
    super();
    this.options = {
      enabled: true,
      debounceMs: 1000,
      validateBeforeApply: true,
      rollbackOnError: true,
      maxRetries: 3,
      enableTelemetry: false,
      ...options
    };

    this.setupEventListeners();
  }

  static getInstance(options?: Partial<HotReloadOptions>): HotReloadManager {
    if (!HotReloadManager.instance) {
      HotReloadManager.instance = new HotReloadManager(options);
    }
    return HotReloadManager.instance;
  }

  /**
   * Enable hot-reload functionality
   */
  enable(): void {
    if (this.isEnabled) return;

    this.isEnabled = true;
    this.emit('enabled');
  }

  /**
   * Disable hot-reload functionality
   */
  disable(): void {
    if (!this.isEnabled) return;

    this.isEnabled = false;
    this.clearDebounceTimer();
    this.emit('disabled');
  }

  /**
   * Apply configuration changes with hot-reload
   */
  async applyChanges(
    changes: Array<{
      key: string;
      value: unknown;
      scope?: ConfigScope;
    }>,
    options: {
      immediate?: boolean;
      skipValidation?: boolean;
      description?: string;
    } = {}
  ): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('Hot-reload is not enabled');
    }

    const patchId = this.generatePatchId();
    const patch: ConfigurationPatch = {
      id: patchId,
      changes: changes.map(change => ({
        key: change.key,
        oldValue: this.configManager.get(change.key),
        newValue: change.value,
        scope: change.scope || 'user'
      })),
      applied: false,
      timestamp: new Date()
    };

    // Store rollback data
    patch.rollbackData = {};
    for (const change of patch.changes) {
      patch.rollbackData[change.key] = change.oldValue;
    }

    this.pendingPatches.set(patchId, patch);

    if (options.immediate) {
      return this.applyPatch(patchId, options);
    } else {
      this.scheduleApplication(patchId, options);
      return patchId;
    }
  }

  /**
   * Apply a single configuration patch
   */
  private async applyPatch(
    patchId: string,
    options: {
      skipValidation?: boolean;
      description?: string;
    } = {}
  ): Promise<string> {
    const patch = this.pendingPatches.get(patchId);
    if (!patch) {
      throw new Error(`Patch ${patchId} not found`);
    }

    try {
      // Emit before-change event
      this.emitHotReloadEvent('before-change', {
        patchId,
        changes: patch.changes,
        description: options.description
      });

      // Validate changes if required
      if (this.options.validateBeforeApply && !options.skipValidation) {
        await this.validateChanges(patch.changes);
      }

      // Apply changes
      await this.configManager.updateMany(
        patch.changes.map(change => ({
          key: change.key,
          value: change.newValue,
          scope: change.scope
        }))
      );

      // Mark patch as applied
      patch.applied = true;
      this.pendingPatches.delete(patchId);
      this.rollbackStack.push(patch);

      // Limit rollback stack size
      if (this.rollbackStack.length > 50) {
        this.rollbackStack.shift();
      }

      // Emit after-change event
      this.emitHotReloadEvent('after-change', {
        patchId,
        changes: patch.changes,
        description: options.description
      });

      // Send telemetry if enabled
      if (this.options.enableTelemetry) {
        this.sendTelemetry(patch.changes);
      }

      return patchId;

    } catch (error) {
      // Emit error event
      this.emitHotReloadEvent('error', {
        patchId,
        error: error instanceof Error ? error.message : String(error),
        changes: patch.changes
      });

      // Rollback if enabled and there's an error
      if (this.options.rollbackOnError && patch.rollbackData) {
        await this.rollbackPatch(patchId);
      }

      throw error;
    }
  }

  /**
   * Rollback a specific patch
   */
  async rollbackPatch(patchId: string): Promise<void> {
    const patch = this.rollbackStack.find(p => p.id === patchId);
    if (!patch || !patch.rollbackData) {
      throw new Error(`Cannot rollback patch ${patchId}: no rollback data available`);
    }

    try {
      // Apply rollback changes
      await this.configManager.updateMany(
        Object.entries(patch.rollbackData).map(([key, value]) => ({
          key,
          value,
          scope: patch.changes.find(c => c.key === key)?.scope || 'user'
        }))
      );

      // Remove from rollback stack
      const index = this.rollbackStack.findIndex(p => p.id === patchId);
      if (index !== -1) {
        this.rollbackStack.splice(index, 1);
      }

      // Emit rollback event
      this.emitHotReloadEvent('rollback', {
        patchId,
        changes: patch.changes
      });

    } catch (error) {
      throw new Error(`Failed to rollback patch ${patchId}: ${error}`);
    }
  }

  /**
   * Rollback the last applied patch
   */
  async rollbackLast(): Promise<void> {
    if (this.rollbackStack.length === 0) {
      throw new Error('No patches to rollback');
    }

    const lastPatch = this.rollbackStack[this.rollbackStack.length - 1];
    await this.rollbackPatch(lastPatch.id);
  }

  /**
   * Get history of applied patches
   */
  getHistory(limit?: number): ConfigurationPatch[] {
    const patches = [...this.rollbackStack].reverse();
    return limit ? patches.slice(0, limit) : patches;
  }

  /**
   * Get pending patches
   */
  getPending(): ConfigurationPatch[] {
    return Array.from(this.pendingPatches.values());
  }

  /**
   * Cancel a pending patch
   */
  cancelPatch(patchId: string): boolean {
    return this.pendingPatches.delete(patchId);
  }

  /**
   * Cancel all pending patches
   */
  cancelAllPending(): void {
    this.pendingPatches.clear();
    this.clearDebounceTimer();
  }

  /**
   * Validate configuration changes
   */
  private async validateChanges(changes: Array<{
    key: string;
    oldValue: unknown;
    newValue: unknown;
    scope: ConfigScope;
  }>): Promise<void> {
    // Create temporary configuration with changes
    const tempConfig = { ...this.configManager.getConfiguration() };

    for (const change of changes) {
      this.applyChangeToConfig(tempConfig, change.key, change.newValue);
    }

    // Validate against schema
    try {
      // This would need to be implemented with proper validation
      // For now, we'll just check that the configuration structure is valid
      this.validateConfigurationStructure(tempConfig);
    } catch (error) {
      this.emitHotReloadEvent('validation-failed', {
        changes,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Apply a change to a configuration object
   */
  private applyChangeToConfig(config: any, key: string, value: unknown): void {
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
   * Validate configuration structure
   */
  private validateConfigurationStructure(config: ApplicationConfiguration): void {
    // Basic structure validation
    const requiredSections = [
      'transcription',
      'mobile',
      'performance',
      'memory',
      'accessibility',
      'system',
      'userPreferences'
    ];

    for (const section of requiredSections) {
      if (!config[section as keyof ApplicationConfiguration]) {
        throw new Error(`Missing required configuration section: ${section}`);
      }
    }
  }

  /**
   * Schedule application of a patch with debouncing
   */
  private scheduleApplication(patchId: string, options: {
    skipValidation?: boolean;
    description?: string;
  }): void {
    this.clearDebounceTimer();

    this.debounceTimer = setTimeout(async () => {
      try {
        await this.applyPatch(patchId, options);
      } catch (error) {
        console.error('Failed to apply patch:', error);
      }
    }, this.options.debounceMs);
  }

  /**
   * Clear debounce timer
   */
  private clearDebounceTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Generate unique patch ID
   */
  private generatePatchId(): string {
    return `patch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.configManager.on('change', (change: ConfigurationChange) => {
      if (this.isEnabled) {
        this.emit('configuration-changed', change);
      }
    });
  }

  /**
   * Emit hot-reload event
   */
  private emitHotReloadEvent(type: HotReloadEvent['type'], data: any): void {
    const event: HotReloadEvent = {
      type,
      data,
      timestamp: new Date()
    };

    this.emit('hot-reload-event', event);
  }

  /**
   * Send telemetry data
   */
  private sendTelemetry(changes: Array<{
    key: string;
    oldValue: unknown;
    newValue: unknown;
    scope: ConfigScope;
  }>): void {
    // Implementation would depend on your telemetry system
    console.log('Hot-reload telemetry:', {
      changeCount: changes.length,
      timestamp: new Date().toISOString(),
      changes: changes.map(c => ({
        key: c.key,
        scope: c.scope
      }))
    });
  }

  /**
   * Get hot-reload statistics
   */
  getStatistics(): {
    enabled: boolean;
    pendingPatches: number;
    appliedPatches: number;
    lastChange: Date | null;
    options: HotReloadOptions;
  } {
    return {
      enabled: this.isEnabled,
      pendingPatches: this.pendingPatches.size,
      appliedPatches: this.rollbackStack.length,
      lastChange: this.rollbackStack.length > 0
        ? this.rollbackStack[this.rollbackStack.length - 1].timestamp
        : null,
      options: this.options
    };
  }

  /**
   * Update hot-reload options
   */
  updateOptions(newOptions: Partial<HotReloadOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.emit('options-updated', this.options);
  }
}

// Export singleton instance and utilities
export const hotReloadManager = HotReloadManager.getInstance();

/**
 * Apply hot-reload configuration changes
 */
export async function applyHotReloadChanges(
  changes: Array<{
    key: string;
    value: unknown;
    scope?: ConfigScope;
  }>,
  options?: {
    immediate?: boolean;
    skipValidation?: boolean;
    description?: string;
  }
): Promise<string> {
  return hotReloadManager.applyChanges(changes, options);
}

/**
 * Enable hot-reload functionality
 */
export function enableHotReload(): void {
  hotReloadManager.enable();
}

/**
 * Disable hot-reload functionality
 */
export function disableHotReload(): void {
  hotReloadManager.disable();
}

/**
 * Get hot-reload manager instance
 */
export function getHotReloadManager(): HotReloadManager {
  return hotReloadManager;
}
