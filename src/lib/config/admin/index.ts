/**
 * Admin Configuration Interface
 */

import type {
  ApplicationConfiguration,
  ConfigurationMetadata,
  ConfigurationValidationResult,
  ConfigScope
} from '../types';
import { getConfigurationManager } from '../manager';
import { getHotReloadManager } from '../hot-reload';

export interface AdminPermission {
  view: boolean;
  edit: boolean;
  reset: boolean;
  export: boolean;
  import: boolean;
  manageUsers: boolean;
  systemSettings: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'super_admin' | 'viewer';
  permissions: AdminPermission;
  lastLogin: Date;
  active: boolean;
}

export interface ConfigurationBackup {
  id: string;
  name: string;
  description: string;
  configuration: ApplicationConfiguration;
  metadata: ConfigurationMetadata;
  createdAt: Date;
  createdBy: string;
  version: string;
  environment: string;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  configuration: Partial<ApplicationConfiguration>;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    defaultValue: unknown;
    options?: string[];
    description: string;
  }>;
  createdAt: Date;
  updatedBy: string;
}

export interface ConfigurationAuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'reset' | 'export' | 'import';
  target: string;
  oldValue?: unknown;
  newValue?: unknown;
  scope: ConfigScope;
  ip: string;
  userAgent: string;
}

export class ConfigurationManagerAdmin {
  private configManager = getConfigurationManager();
  private hotReloadManager = getHotReloadManager();
  private currentUser: AdminUser | null = null;
  private auditLogs: ConfigurationAuditLog[] = [];
  private backups: ConfigurationBackup[] = [];
  private templates: ConfigurationTemplate[] = [];

  /**
   * Authenticate admin user
   */
  async authenticate(credentials: {
    username: string;
    password: string;
  }): Promise<AdminUser | null> {
    // This would integrate with your authentication system
    // For now, we'll simulate authentication
    if (credentials.username === 'admin' && credentials.password === 'password') {
      this.currentUser = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'super_admin',
        permissions: {
          view: true,
          edit: true,
          reset: true,
          export: true,
          import: true,
          manageUsers: true,
          systemSettings: true
        },
        lastLogin: new Date(),
        active: true
      };

      this.logAuditEvent('login', 'system', undefined, undefined, 'user');
      return this.currentUser;
    }

    return null;
  }

  /**
   * Logout current user
   */
  logout(): void {
    if (this.currentUser) {
      this.logAuditEvent('logout', 'system', undefined, undefined, 'user');
      this.currentUser = null;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): AdminUser | null {
    return this.currentUser;
  }

  /**
   * Check if user has permission for action
   */
  hasPermission(permission: keyof AdminPermission): boolean {
    return this.currentUser?.permissions[permission] || false;
  }

  /**
   * Get complete configuration (admin view)
   */
  getFullConfiguration(): ApplicationConfiguration {
    this.requirePermission('view');
    return this.configManager.getConfiguration();
  }

  /**
   * Update configuration (admin)
   */
  async updateConfiguration(
    updates: Partial<ApplicationConfiguration>,
    options: {
      scope?: ConfigScope;
      skipValidation?: boolean;
      reason?: string;
    } = {}
  ): Promise<void> {
    this.requirePermission('edit');

    const { scope = 'user', skipValidation = false, reason } = options;

    // Log old values
    const oldConfig = this.configManager.getConfiguration();

    // Apply updates
    const updatePromises = Object.entries(updates).map(([section, sectionUpdates]) => {
      if (typeof sectionUpdates === 'object' && sectionUpdates !== null) {
        return Object.entries(sectionUpdates).map(([key, value]) => {
          const configKey = `${section}.${key}`;
          const oldValue = this.configManager.get(configKey);

          return this.configManager.set(configKey, value, {
            scope,
            skipValidation,
            immediate: true
          }).then(() => {
            this.logAuditEvent('update', configKey, oldValue, value, scope);
          });
        });
      }
      return Promise.resolve();
    }).flat();

    await Promise.all(updatePromises);

    if (reason) {
      this.logAuditEvent('admin_update', 'configuration', oldConfig, updates, scope, { reason });
    }
  }

  /**
   * Reset configuration
   */
  async resetConfiguration(options: {
    scope?: ConfigScope;
    section?: string;
    reason?: string;
  } = {}): Promise<void> {
    this.requirePermission('reset');

    const { scope = 'user', section, reason } = options;

    const oldConfig = this.configManager.getConfiguration();

    if (section) {
      // Reset specific section
      const defaultConfig = this.getDefaultConfiguration();
      const sectionDefault = defaultConfig[section as keyof ApplicationConfiguration];

      await this.configManager.set(section, sectionDefault, {
        scope,
        immediate: true
      });

      this.logAuditEvent('reset', section, oldConfig[section as keyof ApplicationConfiguration], sectionDefault, scope);
    } else {
      // Reset all configuration
      await this.configManager.reset(scope);
      this.logAuditEvent('reset', 'all', oldConfig, undefined, scope);
    }

    if (reason) {
      this.logAuditEvent('admin_reset', 'configuration', oldConfig, undefined, scope, { reason });
    }
  }

  /**
   * Create configuration backup
   */
  async createBackup(options: {
    name?: string;
    description?: string;
    includeMetadata?: boolean;
  } = {}): Promise<ConfigurationBackup> {
    this.requirePermission('export');

    const { name = `Backup ${new Date().toISOString()}`, description = '', includeMetadata = true } = options;

    const configuration = this.configManager.getConfiguration();
    const metadata = includeMetadata ? this.getConfigurationMetadata() : this.createBasicMetadata();

    const backup: ConfigurationBackup = {
      id: this.generateId(),
      name,
      description,
      configuration,
      metadata,
      createdAt: new Date(),
      createdBy: this.currentUser?.id || 'unknown',
      version: metadata.version,
      environment: metadata.environment
    };

    this.backups.push(backup);
    this.logAuditEvent('create', 'backup', undefined, backup.id, 'admin');

    return backup;
  }

  /**
   * Restore configuration from backup
   */
  async restoreBackup(backupId: string, options: {
    scope?: ConfigScope;
    reason?: string;
  } = {}): Promise<void> {
    this.requirePermission('import');

    const backup = this.backups.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const { scope = 'user', reason } = options;
    const oldConfig = this.configManager.getConfiguration();

    await this.configManager.import(JSON.stringify({
      version: backup.version,
      timestamp: backup.createdAt.toISOString(),
      environment: backup.environment,
      configuration: backup.configuration
    }), {
      overwrite: true,
      scopes: [scope]
    });

    this.logAuditEvent('import', 'backup', oldConfig, backup.configuration, scope, { backupId });

    if (reason) {
      this.logAuditEvent('admin_restore', 'configuration', oldConfig, backup.configuration, scope, { reason, backupId });
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    this.requirePermission('edit');

    const index = this.backups.findIndex(b => b.id === backupId);
    if (index === -1) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const backup = this.backups[index];
    this.backups.splice(index, 1);

    this.logAuditEvent('delete', 'backup', backup, undefined, 'admin');
  }

  /**
   * Get all backups
   */
  getBackups(): ConfigurationBackup[] {
    this.requirePermission('view');
    return [...this.backups].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Export configuration
   */
  async exportConfiguration(options: {
    scopes?: ConfigScope[];
    format?: 'json' | 'yaml';
    includeMetadata?: boolean;
    includeAuditLogs?: boolean;
  } = {}): Promise<string> {
    this.requirePermission('export');

    const { scopes = ['user', 'global'], format = 'json', includeMetadata = true, includeAuditLogs = false } = options;

    const exportData = {
      configuration: this.configManager.getConfiguration(),
      metadata: includeMetadata ? this.getConfigurationMetadata() : undefined,
      auditLogs: includeAuditLogs ? this.auditLogs.slice(-100) : undefined,
      exportedAt: new Date().toISOString(),
      exportedBy: this.currentUser?.id
    };

    this.logAuditEvent('export', 'configuration', undefined, { scopes, format }, 'admin');

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfiguration(
    data: string,
    options: {
      overwrite?: boolean;
      validateOnly?: boolean;
      scopes?: ConfigScope[];
      reason?: string;
    } = {}
  ): Promise<void> {
    this.requirePermission('import');

    const { overwrite = true, validateOnly = false, scopes = ['user'], reason } = options;
    const oldConfig = this.configManager.getConfiguration();

    await this.configManager.import(data, {
      overwrite,
      validateOnly,
      scopes
    });

    this.logAuditEvent('import', 'configuration', oldConfig, data, scopes[0]);

    if (reason) {
      this.logAuditEvent('admin_import', 'configuration', oldConfig, data, scopes[0], { reason });
    }
  }

  /**
   * Create configuration template
   */
  async createTemplate(template: Omit<ConfigurationTemplate, 'id' | 'createdAt' | 'updatedBy'>): Promise<ConfigurationTemplate> {
    this.requirePermission('edit');

    const newTemplate: ConfigurationTemplate = {
      id: this.generateId(),
      ...template,
      createdAt: new Date(),
      updatedBy: this.currentUser?.id || 'unknown'
    };

    this.templates.push(newTemplate);
    this.logAuditEvent('create', 'template', undefined, newTemplate.id, 'admin');

    return newTemplate;
  }

  /**
   * Apply configuration template
   */
  async applyTemplate(
    templateId: string,
    variables: Record<string, unknown> = {},
    options: {
      scope?: ConfigScope;
      overwrite?: boolean;
    } = {}
  ): Promise<void> {
    this.requirePermission('edit');

    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const { scope = 'user', overwrite = true } = options;

    // Process variables in template
    const configuration = this.processTemplateVariables(template.configuration, variables);

    const oldConfig = this.configManager.getConfiguration();

    await this.configManager.updateMany(
      Object.entries(configuration).map(([section, sectionUpdates]) => {
        if (typeof sectionUpdates === 'object' && sectionUpdates !== null) {
          return Object.entries(sectionUpdates).map(([key, value]) => ({
            key: `${section}.${key}`,
            value,
            scope
          }));
        }
        return [];
      }).flat()
    );

    this.logAuditEvent('apply', 'template', oldConfig, { templateId, variables }, scope);
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    configuration: {
      version: string;
      environment: string;
      lastModified: Date;
      health: 'healthy' | 'warning' | 'error';
    };
    hotReload: {
      enabled: boolean;
      pendingChanges: number;
      statistics: any;
    };
    memory: {
      used: number;
      available: number;
      pressure: number;
    };
    performance: {
      responseTime: number;
      errorRate: number;
      uptime: number;
    };
  } {
    this.requirePermission('view');

    const config = this.configManager.getConfiguration();
    const hotReloadStats = this.hotReloadManager.getStatistics();

    return {
      configuration: {
        version: '1.0.0', // Would get from actual metadata
        environment: config.system.environment,
        lastModified: new Date(),
        health: 'healthy'
      },
      hotReload: {
        enabled: hotReloadStats.enabled,
        pendingChanges: hotReloadStats.pendingPatches,
        statistics: hotReloadStats
      },
      memory: {
        used: 128 * 1024 * 1024, // Would get actual memory usage
        available: 384 * 1024 * 1024,
        pressure: 0.25
      },
      performance: {
        responseTime: 150,
        errorRate: 0.02,
        uptime: Date.now() - (Date.now() - 86400000) // 24 hours uptime
      }
    };
  }

  /**
   * Get audit logs
   */
  getAuditLogs(options: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): ConfigurationAuditLog[] {
    this.requirePermission('view');

    let logs = [...this.auditLogs];

    if (options.userId) {
      logs = logs.filter(log => log.userId === options.userId);
    }

    if (options.action) {
      logs = logs.filter(log => log.action === options.action);
    }

    if (options.startDate) {
      logs = logs.filter(log => log.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      logs = logs.filter(log => log.timestamp <= options.endDate!);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    return logs.slice(offset, offset + limit);
  }

  /**
   * Get templates
   */
  getTemplates(): ConfigurationTemplate[] {
    this.requirePermission('view');
    return [...this.templates];
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    this.requirePermission('edit');

    const index = this.templates.findIndex(t => t.id === templateId);
    if (index === -1) {
      throw new Error(`Template ${templateId} not found`);
    }

    const template = this.templates[index];
    this.templates.splice(index, 1);

    this.logAuditEvent('delete', 'template', template, undefined, 'admin');
  }

  // Private helper methods

  private requirePermission(permission: keyof AdminPermission): void {
    if (!this.currentUser) {
      throw new Error('Authentication required');
    }

    if (!this.hasPermission(permission)) {
      throw new Error(`Permission ${permission} required`);
    }
  }

  private logAuditEvent(
    action: ConfigurationAuditLog['action'],
    target: string,
    oldValue?: unknown,
    newValue?: unknown,
    scope: ConfigScope = 'user',
    metadata?: Record<string, unknown>
  ): void {
    const logEntry: ConfigurationAuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      userId: this.currentUser?.id || 'anonymous',
      action,
      target,
      oldValue,
      newValue,
      scope,
      ip: '127.0.0.1', // Would get actual IP
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    };

    this.auditLogs.push(logEntry);

    // Keep only last 1000 log entries
    if (this.auditLogs.length > 1000) {
      this.auditLogs.shift();
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getConfigurationMetadata(): ConfigurationMetadata {
    return {
      version: '1.0.0',
      environment: this.configManager.get('system.environment') || 'development',
      lastModified: new Date(),
      checksum: 'checksum', // Would calculate actual checksum
      migrationHistory: []
    };
  }

  private createBasicMetadata(): ConfigurationMetadata {
    return {
      version: '1.0.0',
      environment: 'development',
      lastModified: new Date(),
      checksum: 'checksum',
      migrationHistory: []
    };
  }

  private getDefaultConfiguration(): ApplicationConfiguration {
    return this.configManager.getConfiguration();
  }

  private processTemplateVariables(
    configuration: Partial<ApplicationConfiguration>,
    variables: Record<string, unknown>
  ): Partial<ApplicationConfiguration> {
    // Simple variable substitution - would need more sophisticated implementation
    const configString = JSON.stringify(configuration);
    let processedString = configString;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      processedString = processedString.replace(regex, String(value));
    }

    try {
      return JSON.parse(processedString);
    } catch (error) {
      throw new Error(`Failed to process template variables: ${error}`);
    }
  }
}

// Export singleton instance
export const configurationManagerAdmin = new ConfigurationManagerAdmin();
