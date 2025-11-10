/**
 * Data Lifecycle Management System
 *
 * This module provides comprehensive data lifecycle management including archival,
 * retention policies, and automated data aging procedures.
 */

import {
  MaintenanceOperation,
  MaintenanceOperationType,
  MaintenanceOperationResults,
  MaintenanceContext,
  IMaintenanceOperationHandler,
  ValidationResult,
  MaintenanceImpact,
  DataRetentionPolicy,
  IStorageManager,
  IMaintenanceLogger,
  IProgressTracker,
  ArchiveOptions,
  ArchiveResult,
  StorageUsage,
} from "./types";
import { db, DBUtils } from "../db/db";
import { handleError } from "../utils/error-handler";

// ============================================================================
// DATA LIFECYCLE INTERFACES
// ============================================================================

/**
 * Data aging configuration
 */
export interface DataAgingConfig {
  enabled: boolean;

  // Aging rules by data type
  rules: {
    [dataType: string]: {
      enabled: boolean;
      ageThresholds: Array<{
        age: number; // in milliseconds
        action: "archive" | "compress" | "delete" | "flag";
        priority: "low" | "medium" | "high";
      }>;
      exceptions: {
        preserveIds: string[];
        preserveTags: string[];
        preserveCriteria: string; // JSONPath expression
      };
    };
  };

  // Processing settings
  processing: {
    batchSize: number;
    maxConcurrentBatches: number;
    retryAttempts: number;
    continueOnError: boolean;
    dryRunByDefault: boolean;
  };
}

/**
 * Archival configuration
 */
export interface ArchivalConfig {
  enabled: boolean;

  // Storage locations
  locations: {
    primary: string; // localStorage key, file path, or cloud storage
    secondary?: string; // backup location
    tertiary?: string; // cold storage
  };

  // Compression settings
  compression: {
    enabled: boolean;
    algorithm: "gzip" | "brotli" | "lz4";
    level: number; // 1-9 for compression level
  };

  // Encryption settings
  encryption: {
    enabled: boolean;
    algorithm: "AES-256-GCM" | "ChaCha20-Poly1305";
    keyRotationInterval: number; // days
  };

  // Retention settings
  retention: {
    primary: number; // days in primary storage
    secondary: number; // days in secondary storage
    tertiary: number; // days in tertiary storage
  };

  // Metadata settings
  metadata: {
    includeIndexes: boolean;
    includeStatistics: boolean;
    customFields: Record<string, any>;
  };
}

/**
 * Data lifecycle event
 */
export interface DataLifecycleEvent {
  id: string;
  timestamp: Date;
  eventType: "created" | "accessed" | "modified" | "archived" | "deleted" | "restored";
  dataType: string;
  itemId: string;
  metadata: {
    size?: number;
    location?: string;
    reason?: string;
    policy?: string;
    userId?: string;
    sessionId?: string;
  };
}

/**
 * Lifecycle analytics
 */
export interface LifecycleAnalytics {
  summary: {
    totalItems: number;
    archivedItems: number;
    deletedItems: number;
    compressedItems: number;
    spaceSaved: number;
  };

  byDataType: Record<string, {
    totalItems: number;
    totalSize: number;
    archivedItems: number;
    deletedItems: number;
    compressionRatio: number;
  }>;

  trends: {
    daily: Array<{
      date: string;
      itemsProcessed: number;
      spaceSaved: number;
    }>;
    monthly: Array<{
      month: string;
      itemsProcessed: number;
      spaceSaved: number;
    }>;
  };

  predictions: {
    nextMonthSpace: number;
    recommendedActions: string[];
  };
}

// ============================================================================
// DATA ARCHIVAL HANDLER
// ============================================================================

/**
 * Handler for data archival operations
 */
export class DataArchivalHandler implements IMaintenanceOperationHandler {
  operationType = MaintenanceOperationType.DATA_ARCHIVAL;
  name = "Data Archival";
  description = "Archives old data according to retention policies";

  supportsProgress = true;
  supportsCancellation = true;
  supportsPauseResume = true;

  async validate(operation: MaintenanceOperation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const { retentionPolicy, archivalConfig, targetDataTypes } = operation.config;

    if (!retentionPolicy && !targetDataTypes) {
      errors.push("Either retentionPolicy or targetDataTypes must be specified");
    }

    if (archivalConfig && !archivalConfig.locations.primary) {
      errors.push("Primary archival location must be specified");
    }

    if (targetDataTypes && targetDataTypes.length === 0) {
      warnings.push("No target data types specified. All data types will be considered.");
    }

    suggestions.push("Ensure adequate storage space is available for archival operations.");
    suggestions.push("Consider running archival during low usage periods to minimize impact.");

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async estimateDuration(operation: MaintenanceOperation): Promise<number> {
    const config = operation.config;
    const targetDataTypes = config.targetDataTypes || ["files", "transcripts", "segments"];

    try {
      let totalDuration = 5000; // 5 seconds base time

      for (const dataType of targetDataTypes) {
        const table = (db as any)[dataType];
        if (table) {
          const count = await table.count();
          // Estimate ~5ms per item for archival
          totalDuration += count * 5;
        }
      }

      return totalDuration;
    } catch (error) {
      return 300000; // 5 minutes default
    }
  }

  async estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact> {
    return {
      resources: {
        cpuUsage: 40, // Moderate CPU for compression
        memoryUsage: 50, // Higher memory for processing
        diskUsage: 100, // Will use additional space temporarily
        networkUsage: 0, // No network usage for local archival
      },
      userExperience: {
        interruptionRequired: false,
        performanceImpact: "medium",
        userInteractionRequired: false,
        estimatedDowntime: 0,
      },
      data: {
        itemsAffected: 0, // Will be calculated during execution
        dataLossRisk: "none", // Data is archived, not deleted
        backupRequired: false,
        rollbackPossible: true, // Can restore from archive
      },
    };
  }

  async execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults> {
    const logger = context.logger.createOperationLogger(operation.id);
    const progress = context.progressTracker.createTracker(operation.id);

    logger.info("Starting data archival", operation.config);

    const startTime = new Date();
    const results: MaintenanceOperationResults = {
      success: false,
      summary: "",
      details: {},
      statistics: {
        itemsProcessed: 0,
        itemsDeleted: 0,
        itemsArchived: 0,
        itemsModified: 0,
        errorsEncountered: 0,
        warningsGenerated: 0,
      },
      spaceReclaimed: {
        bytes: 0,
        megabytes: 0,
        percentage: 0,
      },
      performanceImprovements: {
        databaseOptimized: false,
        indexesRebuilt: 0,
        queryTimeImprovement: 0,
        loadTimeImprovement: 0,
      },
      affectedResources: {
        files: [],
        tables: [],
        indexes: [],
        caches: [],
      },
      recommendations: [],
      timing: {
        startTime,
        endTime: new Date(),
        totalDuration: 0,
        stages: [],
      },
    };

    try {
      const config = operation.config;
      const retentionPolicy = config.retentionPolicy;
      const targetDataTypes = config.targetDataTypes || ["files", "transcripts", "segments"];
      const archivalConfig = config.archivalConfig;
      const dryRun = config.dryRun || false;

      logger.info(`Archiving data for types: ${targetDataTypes.join(", ")}`, {
        retentionPolicy: retentionPolicy?.name,
        archivalConfig: archivalConfig?.enabled,
        dryRun,
      });

      let totalItems = 0;
      let processedItems = 0;

      // Count total items first for progress tracking
      for (const dataType of targetDataTypes) {
        const count = await this.countItemsForArchival(dataType, retentionPolicy);
        totalItems += count;
      }

      progress.update(0, totalItems, "Starting data archival");

      // Process each data type
      for (const dataType of targetDataTypes) {
        const stageStart = new Date();
        logger.stage(`Archiving ${dataType}`);

        try {
          const typeResult = await this.archiveDataType(
            dataType,
            retentionPolicy,
            archivalConfig,
            dryRun,
            (processed, message) => {
              progress.update(processedItems + processed, totalItems, message);
            }
          );

          results.statistics.itemsProcessed += typeResult.itemsProcessed;
          results.statistics.itemsArchived += typeResult.itemsArchived;
          results.statistics.itemsDeleted += typeResult.itemsDeleted;
          results.statistics.errorsEncountered += typeResult.errors.length;
          results.statistics.warningsGenerated += typeResult.warnings.length;

          results.spaceReclaimed.bytes += typeResult.spaceReclaimed;
          results.affectedResources.tables.push(dataType);

          processedItems += typeResult.itemsProcessed;

          const stageEnd = new Date();
          results.timing.stages.push({
            name: `archive_${dataType}`,
            duration: stageEnd.getTime() - stageStart.getTime(),
            startTime: stageStart,
            endTime: stageEnd,
          });

          logger.info(`Completed ${dataType} archival`, typeResult);
        } catch (error) {
          logger.error(`Failed to archive ${dataType}`, error as Error);
          results.statistics.errorsEncountered++;

          if (!config.continueOnError) {
            throw error;
          }
        }
      }

      results.spaceReclaimed.megabytes = results.spaceReclaimed.bytes / (1024 * 1024);
      results.success = true;
      results.summary = `Successfully archived ${results.statistics.itemsArchived} items and reclaimed ${results.spaceReclaimed.megabytes.toFixed(2)}MB of space.`;

      // Generate recommendations
      if (results.statistics.itemsArchived > 0) {
        results.recommendations.push("Data archived successfully. Consider setting up regular archival schedule.");
      }

      if (results.spaceReclaimed.bytes > 50 * 1024 * 1024) { // 50MB
        results.recommendations.push("Significant space reclaimed through archival. Consider more frequent archival operations.");
      }

      // Log lifecycle events
      await this.logLifecycleEvents("archived", results.statistics.itemsArchived, results.spaceReclaimed.bytes);

    } catch (error) {
      logger.error("Data archival failed", error as Error);
      results.success = false;
      results.summary = `Data archival failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.error = error as Error;
    } finally {
      const endTime = new Date();
      results.timing.endTime = endTime;
      results.timing.totalDuration = endTime.getTime() - startTime.getTime();

      progress.complete(results.success ? "Archival completed successfully" : "Archival completed with errors");
    }

    return results;
  }

  private async countItemsForArchival(dataType: string, retentionPolicy?: DataRetentionPolicy): Promise<number> {
    try {
      const table = (db as any)[dataType];
      if (!table) return 0;

      if (retentionPolicy) {
        const cutoffDate = new Date(Date.now() - retentionPolicy.rules.maxAge!);
        return await table
          .where("createdAt")
          .below(cutoffDate)
          .count();
      } else {
        // Default to items older than 30 days
        const cutoffDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
        return await table
          .where("createdAt")
          .below(cutoffDate)
          .count();
      }
    } catch (error) {
      console.warn(`Failed to count items for archival (${dataType}):`, error);
      return 0;
    }
  }

  private async archiveDataType(
    dataType: string,
    retentionPolicy?: DataRetentionPolicy,
    archivalConfig?: ArchivalConfig,
    dryRun: boolean = false,
    onProgress?: (processed: number, message: string) => void
  ): Promise<ArchiveResult> {
    const result: ArchiveResult = {
      success: true,
      itemsArchived: 0,
      archiveSize: 0,
      compressionRatio: 0,
      errors: [],
      warnings: [],
    };

    try {
      const table = (db as any)[dataType];
      if (!table) {
        result.warnings.push(`Table ${dataType} not found`);
        return result;
      }

      // Determine cutoff date
      let cutoffDate: Date;
      if (retentionPolicy && retentionPolicy.rules.maxAge) {
        cutoffDate = new Date(Date.now() - retentionPolicy.rules.maxAge);
      } else {
        cutoffDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days default
      }

      // Get items to archive
      const itemsToArchive = await table
        .where("createdAt")
        .below(cutoffDate)
        .toArray();

      onProgress?.(0, `Found ${itemsToArchive.length} items to archive`);

      if (itemsToArchive.length === 0) {
        return result;
      }

      // Filter items based on retention policy exceptions
      const filteredItems = this.filterItemsForArchival(itemsToArchive, retentionPolicy);

      // Process items in batches
      const batchSize = archivalConfig?.compression?.enabled ? 50 : 100;

      for (let i = 0; i < filteredItems.length; i += batchSize) {
        const batch = filteredItems.slice(i, i + batchSize);

        const batchResult = await this.archiveBatch(
          batch,
          dataType,
          archivalConfig,
          dryRun
        );

        result.itemsArchived += batchResult.itemsArchived;
        result.archiveSize += batchResult.archiveSize;
        result.errors.push(...batchResult.errors);
        result.warnings.push(...batchResult.warnings);

        onProgress?.(Math.min(i + batchSize, filteredItems.length), `Archived ${Math.min(i + batchSize, filteredItems.length)}/${filteredItems.length} items`);

        // Small delay to prevent blocking the UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Calculate compression ratio
      if (archivalConfig?.compression?.enabled && result.itemsArchived > 0) {
        const originalSize = filteredItems.reduce((sum, item) => sum + JSON.stringify(item).length * 2, 0);
        result.compressionRatio = originalSize > 0 ? 1 - (result.archiveSize / originalSize) : 0;
      }

      // Delete archived items from main database (if not dry run)
      if (!dryRun && filteredItems.length > 0) {
        const idsToDelete = filteredItems.map(item => item.id).filter(id => id);
        if (idsToDelete.length > 0) {
          await table.bulkDelete(idsToDelete);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to archive ${dataType}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private filterItemsForArchival(items: any[], retentionPolicy?: DataRetentionPolicy): any[] {
    if (!retentionPolicy) {
      return items;
    }

    const { exceptions } = retentionPolicy;
    const preserveIds = new Set(exceptions?.preserveIds || []);
    const preserveTags = new Set(exceptions?.preserveTags || []);

    return items.filter(item => {
      // Check ID preservation
      if (preserveIds.has(item.id?.toString())) {
        return false;
      }

      // Check tag preservation
      if (preserveTags.size > 0 && item.metadata?.tags) {
        const itemTags = Array.isArray(item.metadata.tags) ? item.metadata.tags : [item.metadata.tags];
        if (itemTags.some(tag => preserveTags.has(tag))) {
          return false;
        }
      }

      // Check custom criteria
      if (exceptions?.preserveCriteria) {
        try {
          // Simple implementation - in production, use a proper JSONPath library
          const criteria = exceptions.preserveCriteria;
          if (criteria.includes("important") && item.importance === "high") {
            return false;
          }
          if (criteria.includes("user") && item.userId) {
            return false;
          }
        } catch (error) {
          console.warn("Error evaluating preservation criteria:", error);
        }
      }

      return true;
    });
  }

  private async archiveBatch(
    batch: any[],
    dataType: string,
    archivalConfig?: ArchivalConfig,
    dryRun: boolean = false
  ): Promise<ArchiveResult> {
    const result: ArchiveResult = {
      success: true,
      itemsArchived: batch.length,
      archiveSize: 0,
      compressionRatio: 0,
      errors: [],
      warnings: [],
    };

    try {
      if (dryRun) {
        // For dry run, just calculate estimated size
        const serializedData = JSON.stringify(batch);
        result.archiveSize = serializedData.length * 2; // Rough byte count
        return result;
      }

      // Create archive metadata
      const archiveMetadata = {
        dataType,
        itemCount: batch.length,
        createdAt: new Date(),
        archivalDate: new Date(),
        version: "1.0",
        compression: archivalConfig?.compression?.enabled || false,
        encryption: archivalConfig?.encryption?.enabled || false,
      };

      // Prepare data for archival
      let archiveData = {
        metadata: archiveMetadata,
        items: batch,
      };

      // Compress if enabled
      if (archivalConfig?.compression?.enabled) {
        archiveData = await this.compressData(archiveData, archivalConfig.compression);
      }

      // Encrypt if enabled
      if (archivalConfig?.encryption?.enabled) {
        archiveData = await this.encryptData(archiveData, archivalConfig.encryption);
      }

      // Store archive
      const archiveId = await this.storeArchive(archiveData, dataType, archivalConfig);

      // Update result
      result.archiveSize = JSON.stringify(archiveData).length * 2;

      // Log the archival
      console.log(`Archived ${batch.length} ${dataType} items to archive ${archiveId}`);

    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to archive batch: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async compressData(data: any, compressionConfig: any): Promise<any> {
    // Simplified compression - in production, use proper compression libraries
    const serialized = JSON.stringify(data);

    // Mock compression - in reality, use CompressionStream API or similar
    const compressedSize = Math.floor(serialized.length * 0.6); // Assume 40% compression

    return {
      ...data,
      compressed: true,
      originalSize: serialized.length,
      compressedSize,
    };
  }

  private async encryptData(data: any, encryptionConfig: any): Promise<any> {
    // Simplified encryption - in production, use proper crypto libraries
    return {
      ...data,
      encrypted: true,
      encryptionAlgorithm: encryptionConfig.algorithm,
    };
  }

  private async storeArchive(data: any, dataType: string, archivalConfig?: ArchivalConfig): Promise<string> {
    const archiveId = `archive_${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store in localStorage for now - in production, use proper storage
    if (typeof window !== "undefined" && window.localStorage) {
      const location = archivalConfig?.locations?.primary || "maintenance_archives";
      const archives = JSON.parse(window.localStorage.getItem(location) || "[]");
      archives.push({
        id: archiveId,
        data,
        storedAt: new Date(),
      });

      window.localStorage.setItem(location, JSON.stringify(archives));
    }

    return archiveId;
  }

  private async logLifecycleEvents(eventType: string, itemCount: number, spaceReclaimed: number): Promise<void> {
    // In a real implementation, this would store lifecycle events in a dedicated table
    console.log(`Lifecycle event: ${eventType} - ${itemCount} items, ${spaceReclaimed} bytes reclaimed`);
  }
}

// ============================================================================
// RETENTION POLICY HANDLER
// ============================================================================

/**
 * Handler for retention policy enforcement
 */
export class RetentionPolicyHandler implements IMaintenanceOperationHandler {
  operationType = MaintenanceOperationType.DATA_RETENTION_ENFORCEMENT;
  name = "Retention Policy Enforcement";
  description = "Enforces data retention policies by archiving or deleting old data";

  supportsProgress = true;
  supportsCancellation = true;
  supportsPauseResume = true;

  async validate(operation: MaintenanceOperation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const { policies, dryRun } = operation.config;

    if (!policies || !Array.isArray(policies) || policies.length === 0) {
      errors.push("At least one retention policy must be specified");
    }

    for (const policy of policies) {
      if (!policy.rules.maxAge && !policy.rules.maxSize && !policy.rules.maxCount) {
        warnings.push(`Policy ${policy.name} has no retention rules defined`);
      }

      if (policy.rules.maxAge && policy.rules.maxAge <= 0) {
        errors.push(`Policy ${policy.name} has invalid maxAge value`);
      }
    }

    if (!dryRun) {
      suggestions.push("Consider running with dryRun=true first to see what would be deleted.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async estimateDuration(operation: MaintenanceOperation): Promise<number> {
    const config = operation.config;
    const policies = config.policies || [];

    try {
      let totalDuration = 10000; // 10 seconds base time

      for (const policy of policies) {
        const dataTypes = policy.targets.dataType === "all"
          ? ["files", "transcripts", "segments"]
          : [policy.targets.dataType];

        for (const dataType of dataTypes) {
          const table = (db as any)[dataType];
          if (table) {
            const count = await table.count();
            // Estimate ~2ms per item for retention processing
            totalDuration += count * 2;
          }
        }
      }

      return totalDuration;
    } catch (error) {
      return 600000; // 10 minutes default
    }
  }

  async estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact> {
    return {
      resources: {
        cpuUsage: 30,
        memoryUsage: 25,
        diskUsage: 0, // Will free up disk space
        networkUsage: 0,
      },
      userExperience: {
        interruptionRequired: false,
        performanceImpact: "low",
        userInteractionRequired: false,
        estimatedDowntime: 0,
      },
      data: {
        itemsAffected: 0,
        dataLossRisk: "medium", // Potential data loss if policies are too aggressive
        backupRequired: true,
        rollbackPossible: false, // Once deleted, cannot rollback
      },
    };
  }

  async execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults> {
    const logger = context.logger.createOperationLogger(operation.id);
    const progress = context.progressTracker.createTracker(operation.id);

    logger.info("Starting retention policy enforcement", operation.config);

    const startTime = new Date();
    const results: MaintenanceOperationResults = {
      success: false,
      summary: "",
      details: {},
      statistics: {
        itemsProcessed: 0,
        itemsDeleted: 0,
        itemsArchived: 0,
        itemsModified: 0,
        errorsEncountered: 0,
        warningsGenerated: 0,
      },
      spaceReclaimed: {
        bytes: 0,
        megabytes: 0,
        percentage: 0,
      },
      performanceImprovements: {
        databaseOptimized: false,
        indexesRebuilt: 0,
        queryTimeImprovement: 0,
        loadTimeImprovement: 0,
      },
      affectedResources: {
        files: [],
        tables: [],
        indexes: [],
        caches: [],
      },
      recommendations: [],
      timing: {
        startTime,
        endTime: new Date(),
        totalDuration: 0,
        stages: [],
      },
    };

    try {
      const config = operation.config;
      const policies = config.policies || [];
      const dryRun = config.dryRun || false;

      logger.info(`Enforcing ${policies.length} retention policies`, {
        dryRun,
        policies: policies.map(p => p.name),
      });

      let totalItems = 0;
      let processedItems = 0;

      // Count total items first for progress tracking
      for (const policy of policies) {
        const count = await this.countItemsForPolicy(policy);
        totalItems += count;
      }

      progress.update(0, totalItems, "Starting retention enforcement");

      // Process each policy
      for (const policy of policies) {
        const stageStart = new Date();
        logger.stage(`Enforcing policy: ${policy.name}`);

        try {
          const policyResult = await this.enforceRetentionPolicy(
            policy,
            dryRun,
            (processed, message) => {
              progress.update(processedItems + processed, totalItems, message);
            }
          );

          results.statistics.itemsProcessed += policyResult.itemsProcessed;
          results.statistics.itemsDeleted += policyResult.itemsDeleted;
          results.statistics.itemsArchived += policyResult.itemsArchived;
          results.statistics.errorsEncountered += policyResult.errors.length;
          results.statistics.warningsGenerated += policyResult.warnings.length;

          results.spaceReclaimed.bytes += policyResult.spaceReclaimed;

          if (policy.targets.dataType === "all") {
            results.affectedResources.tables.push("files", "transcripts", "segments");
          } else {
            results.affectedResources.tables.push(policy.targets.dataType);
          }

          processedItems += policyResult.itemsProcessed;

          const stageEnd = new Date();
          results.timing.stages.push({
            name: `policy_${policy.name}`,
            duration: stageEnd.getTime() - stageStart.getTime(),
            startTime: stageStart,
            endTime: stageEnd,
          });

          logger.info(`Completed policy enforcement: ${policy.name}`, policyResult);
        } catch (error) {
          logger.error(`Failed to enforce policy: ${policy.name}`, error as Error);
          results.statistics.errorsEncountered++;

          if (!config.continueOnError) {
            throw error;
          }
        }
      }

      results.spaceReclaimed.megabytes = results.spaceReclaimed.bytes / (1024 * 1024);
      results.success = true;
      results.summary = `Successfully enforced retention policies, processed ${results.statistics.itemsProcessed} items, and reclaimed ${results.spaceReclaimed.megabytes.toFixed(2)}MB of space.`;

      // Generate recommendations
      if (results.statistics.itemsDeleted > 0) {
        results.recommendations.push("Consider reviewing retention policies to ensure they align with data governance requirements.");
      }

      if (results.spaceReclaimed.bytes > 100 * 1024 * 1024) { // 100MB
        results.recommendations.push("Significant space reclaimed. Consider more frequent policy enforcement.");
      }

      // Log lifecycle events
      await this.logLifecycleEvents("retention_enforced", results.statistics.itemsDeleted + results.statistics.itemsArchived, results.spaceReclaimed.bytes);

    } catch (error) {
      logger.error("Retention policy enforcement failed", error as Error);
      results.success = false;
      results.summary = `Retention policy enforcement failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.error = error as Error;
    } finally {
      const endTime = new Date();
      results.timing.endTime = endTime;
      results.timing.totalDuration = endTime.getTime() - startTime.getTime();

      progress.complete(results.success ? "Policy enforcement completed successfully" : "Policy enforcement completed with errors");
    }

    return results;
  }

  private async countItemsForPolicy(policy: DataRetentionPolicy): Promise<number> {
    try {
      let totalCount = 0;

      const dataTypes = policy.targets.dataType === "all"
        ? ["files", "transcripts", "segments"]
        : [policy.targets.dataType];

      for (const dataType of dataTypes) {
        const table = (db as any)[dataType];
        if (!table) continue;

        if (policy.rules.maxAge) {
          const cutoffDate = new Date(Date.now() - policy.rules.maxAge);
          totalCount += await table.where("createdAt").below(cutoffDate).count();
        } else {
          totalCount += await table.count();
        }
      }

      return totalCount;
    } catch (error) {
      console.warn(`Failed to count items for policy ${policy.name}:`, error);
      return 0;
    }
  }

  private async enforceRetentionPolicy(
    policy: DataRetentionPolicy,
    dryRun: boolean,
    onProgress?: (processed: number, message: string) => void
  ): Promise<{
    itemsProcessed: number;
    itemsDeleted: number;
    itemsArchived: number;
    spaceReclaimed: number;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsArchived: 0,
      spaceReclaimed: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      const dataTypes = policy.targets.dataType === "all"
        ? ["files", "transcripts", "segments"]
        : [policy.targets.dataType];

      for (const dataType of dataTypes) {
        const table = (db as any)[dataType];
        if (!table) {
          result.warnings.push(`Table ${dataType} not found`);
          continue;
        }

        // Get all items
        const allItems = await table.toArray();
        let itemsToProcess: any[] = [];

        // Apply retention rules
        if (policy.rules.maxAge) {
          const cutoffDate = new Date(Date.now() - policy.rules.maxAge);
          itemsToProcess = allItems.filter(item => new Date(item.createdAt) < cutoffDate);
        } else if (policy.rules.maxSize) {
          // Sort by size and keep largest items
          const sortedItems = allItems.sort((a, b) => (b.size || 0) - (a.size || 0));
          let currentSize = 0;
          itemsToProcess = [];

          for (const item of sortedItems) {
            if (currentSize + (item.size || 0) > policy.rules.maxSize) {
              itemsToProcess.push(item);
            } else {
              currentSize += item.size || 0;
            }
          }
        } else if (policy.rules.maxCount) {
          // Sort by creation date and keep newest items
          const sortedItems = allItems.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          itemsToProcess = sortedItems.slice(policy.rules.maxCount);
        }

        // Apply priority rules
        if (policy.rules.priorityRules) {
          itemsToProcess = this.applyPriorityRules(itemsToProcess, policy.rules.priorityRules);
        }

        // Apply exceptions
        itemsToProcess = this.filterItemsForRetention(itemsToProcess, policy.exceptions);

        // Process items
        if (policy.archival.enabled && itemsToProcess.length > 0) {
          // Archive first, then delete
          const archiveResult = await this.archiveItemsForPolicy(
            itemsToProcess,
            dataType,
            policy.archival,
            dryRun
          );

          result.itemsArchived += archiveResult.itemsArchived;
          result.spaceReclaimed += archiveResult.spaceReclaimed;
          result.errors.push(...archiveResult.errors);
          result.warnings.push(...archiveResult.warnings);
        }

        // Delete items (if not archived or archival failed)
        if (!policy.archival.enabled || dryRun) {
          if (!dryRun && itemsToProcess.length > 0) {
            const idsToDelete = itemsToProcess.map(item => item.id).filter(id => id);
            if (idsToDelete.length > 0) {
              await table.bulkDelete(idsToDelete);
            }
          }

          result.itemsDeleted += itemsToProcess.length;
          result.spaceReclaimed += itemsToProcess.reduce((sum, item) => sum + (item.size || 0), 0);
        }

        result.itemsProcessed += itemsToProcess.length;
        onProgress?.(result.itemsProcessed, `Processed ${result.itemsProcessed} items for ${dataType}`);
      }

    } catch (error) {
      result.errors.push(`Failed to enforce policy ${policy.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private applyPriorityRules(items: any[], priorityRules: any[]): any[] {
    if (!priorityRules || priorityRules.length === 0) {
      return items;
    }

    // Sort rules by priority (high to low)
    const sortedRules = priorityRules.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const result: any[] = [];
    const processedIds = new Set();

    for (const rule of sortedRules) {
      const ruleItems = items.filter(item => {
        if (processedIds.has(item.id)) return false;

        const age = Date.now() - new Date(item.createdAt).getTime();
        const ageDays = age / (24 * 60 * 60 * 1000);

        return ageDays <= rule.maxAge && (!rule.keepCount || result.filter(i => i.metadata?.priority === rule.priority).length < rule.keepCount);
      });

      result.push(...ruleItems);
      ruleItems.forEach(item => processedIds.add(item.id));
    }

    return result;
  }

  private filterItemsForRetention(items: any[], exceptions: any): any[] {
    const preserveIds = new Set(exceptions?.preserveIds || []);
    const preserveTags = new Set(exceptions?.preserveTags || []);

    return items.filter(item => {
      if (preserveIds.has(item.id?.toString())) {
        return false;
      }

      if (preserveTags.size > 0 && item.metadata?.tags) {
        const itemTags = Array.isArray(item.metadata.tags) ? item.metadata.tags : [item.metadata.tags];
        if (itemTags.some(tag => preserveTags.has(tag))) {
          return false;
        }
      }

      if (exceptions?.preserveCriteria) {
        try {
          if (exceptions.preserveCriteria.includes("starred") && item.starred) {
            return false;
          }
          if (exceptions.preserveCriteria.includes("recent") && new Date(item.lastAccessed) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
            return false;
          }
        } catch (error) {
          console.warn("Error evaluating preservation criteria:", error);
        }
      }

      return true;
    });
  }

  private async archiveItemsForPolicy(
    items: any[],
    dataType: string,
    archivalConfig: any,
    dryRun: boolean
  ): Promise<ArchiveResult> {
    const result: ArchiveResult = {
      success: true,
      itemsArchived: items.length,
      archiveSize: 0,
      compressionRatio: 0,
      errors: [],
      warnings: [],
    };

    try {
      if (dryRun) {
        const totalSize = items.reduce((sum, item) => sum + JSON.stringify(item).length * 2, 0);
        result.archiveSize = totalSize;
        return result;
      }

      // Create archive
      const archiveData = {
        metadata: {
          dataType,
          itemCount: items.length,
          policy: archivalConfig.name || "retention_policy",
          createdAt: new Date(),
        },
        items,
      };

      // Store archive (simplified)
      const archiveId = await this.storePolicyArchive(archiveData, dataType);

      result.archiveSize = JSON.stringify(archiveData).length * 2;
      console.log(`Policy archived ${items.length} ${dataType} items to ${archiveId}`);

    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to archive items: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async storePolicyArchive(data: any, dataType: string): Promise<string> {
    const archiveId = `policy_archive_${dataType}_${Date.now()}`;

    if (typeof window !== "undefined" && window.localStorage) {
      const location = "maintenance_policy_archives";
      const archives = JSON.parse(window.localStorage.getItem(location) || "[]");
      archives.push({
        id: archiveId,
        data,
        storedAt: new Date(),
      });

      window.localStorage.setItem(location, JSON.stringify(archives));
    }

    return archiveId;
  }

  private async logLifecycleEvents(eventType: string, itemCount: number, spaceReclaimed: number): Promise<void> {
    console.log(`Lifecycle event: ${eventType} - ${itemCount} items, ${spaceReclaimed} bytes reclaimed`);
  }
}

// ============================================================================
// DATA LIFECYCLE MANAGER
// ============================================================================

/**
 * Main data lifecycle manager
 */
export class DataLifecycleManager {
  private config: {
    aging: DataAgingConfig;
    archival: ArchivalConfig;
  };

  private eventLog: DataLifecycleEvent[] = [];
  private analytics: LifecycleAnalytics;

  constructor(config?: Partial<{ aging: DataAgingConfig; archival: ArchivalConfig }>) {
    const defaultConfig = {
      aging: {
        enabled: true,
        rules: {
          files: {
            enabled: true,
            ageThresholds: [
              { age: 90 * 24 * 60 * 60 * 1000, action: "archive", priority: "low" }, // 90 days
              { age: 365 * 24 * 60 * 60 * 1000, action: "delete", priority: "high" }, // 1 year
            ],
            exceptions: {
              preserveIds: [],
              preserveTags: ["important", "permanent"],
              preserveCriteria: "starred OR user_favorites",
            },
          },
          transcripts: {
            enabled: true,
            ageThresholds: [
              { age: 60 * 24 * 60 * 60 * 1000, action: "archive", priority: "low" }, // 60 days
              { age: 180 * 24 * 60 * 60 * 1000, action: "compress", priority: "medium" }, // 180 days
              { age: 365 * 24 * 60 * 60 * 1000, action: "delete", priority: "high" }, // 1 year
            ],
            exceptions: {
              preserveIds: [],
              preserveTags: ["reference", "important"],
              preserveCriteria: "quality_score > 0.8",
            },
          },
          segments: {
            enabled: true,
            ageThresholds: [
              { age: 180 * 24 * 60 * 60 * 1000, action: "archive", priority: "low" }, // 180 days
              { age: 365 * 24 * 60 * 60 * 1000, action: "delete", priority: "high" }, // 1 year
            ],
            exceptions: {
              preserveIds: [],
              preserveTags: [],
              preserveCriteria: "",
            },
          },
        },
        processing: {
          batchSize: 100,
          maxConcurrentBatches: 3,
          retryAttempts: 3,
          continueOnError: true,
          dryRunByDefault: false,
        },
      },
      archival: {
        enabled: true,
        locations: {
          primary: "maintenance_archives",
        },
        compression: {
          enabled: true,
          algorithm: "gzip",
          level: 6,
        },
        encryption: {
          enabled: false,
          algorithm: "AES-256-GCM",
          keyRotationInterval: 90,
        },
        retention: {
          primary: 365, // 1 year
          secondary: 1095, // 3 years
          tertiary: 1825, // 5 years
        },
        metadata: {
          includeIndexes: true,
          includeStatistics: true,
          customFields: {},
        },
      },
    };

    this.config = {
      aging: { ...defaultConfig.aging, ...config?.aging },
      archival: { ...defaultConfig.archival, ...config?.archival },
    };

    this.analytics = this.initializeAnalytics();
  }

  /**
   * Process data aging according to configured rules
   */
  async processDataAging(dryRun: boolean = false): Promise<{
    processed: number;
    archived: number;
    compressed: number;
    deleted: number;
    flagged: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      archived: 0,
      compressed: 0,
      deleted: 0,
      flagged: 0,
      errors: [] as string[],
    };

    if (!this.config.aging.enabled) {
      result.errors.push("Data aging is disabled");
      return result;
    }

    try {
      for (const [dataType, rules] of Object.entries(this.config.aging.rules)) {
        if (!rules.enabled) continue;

        const table = (db as any)[dataType];
        if (!table) {
          result.errors.push(`Table ${dataType} not found`);
          continue;
        }

        const items = await table.toArray();
        const now = Date.now();

        for (const item of items) {
          const age = now - new Date(item.createdAt).getTime();
          let actionTaken = false;

          for (const threshold of rules.ageThresholds) {
            if (age >= threshold.age && !actionTaken) {
              // Check exceptions
              if (this.shouldPreserveItem(item, rules.exceptions)) {
                continue;
              }

              switch (threshold.action) {
                case "archive":
                  if (!dryRun) {
                    await this.archiveItem(item, dataType);
                  }
                  result.archived++;
                  actionTaken = true;
                  break;

                case "compress":
                  if (!dryRun) {
                    await this.compressItem(item, dataType);
                  }
                  result.compressed++;
                  actionTaken = true;
                  break;

                case "delete":
                  if (!dryRun) {
                    await table.delete(item.id);
                  }
                  result.deleted++;
                  actionTaken = true;
                  break;

                case "flag":
                  if (!dryRun) {
                    await this.flagItem(item, dataType);
                  }
                  result.flagged++;
                  actionTaken = true;
                  break;
              }

              if (actionTaken) {
                await this.logLifecycleEvent({
                  id: this.generateEventId(),
                  timestamp: new Date(),
                  eventType: threshold.action as any,
                  dataType,
                  itemId: item.id.toString(),
                  metadata: {
                    reason: `Age threshold: ${threshold.age}ms`,
                    priority: threshold.priority,
                  },
                });
              }
            }
          }

          if (actionTaken) {
            result.processed++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Data aging failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  /**
   * Get lifecycle analytics
   */
  getAnalytics(): LifecycleAnalytics {
    return this.analytics;
  }

  /**
   * Get recent lifecycle events
   */
  getRecentEvents(limit: number = 100): DataLifecycleEvent[] {
    return this.eventLog
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Create retention policy
   */
  createRetentionPolicy(config: Partial<DataRetentionPolicy>): DataRetentionPolicy {
    return {
      id: this.generateId(),
      name: config.name || "Custom Policy",
      description: config.description || "",
      enabled: config.enabled !== false,
      targets: {
        dataType: config.targets?.dataType || "all",
        filters: config.targets?.filters || {},
      },
      rules: {
        maxAge: config.rules?.maxAge,
        maxSize: config.rules?.maxSize,
        maxCount: config.rules?.maxCount,
        priorityRules: config.rules?.priorityRules || [],
      },
      archival: {
        enabled: config.archival?.enabled !== false,
        archiveLocation: config.archival?.archiveLocation,
        compressArchives: config.archival?.compressArchives !== false,
        archiveFormat: config.archival?.archiveFormat || "json",
        archiveRetention: config.archival?.archiveRetention || 365 * 24 * 60 * 60 * 1000,
      },
      exceptions: {
        preserveIds: config.exceptions?.preserveIds || [],
        preservePatterns: config.exceptions?.preservePatterns || [],
        preserveTags: config.exceptions?.preserveTags || [],
        preserveCriteria: config.exceptions?.preserveCriteria || (() => false),
      },
      execution: {
        schedule: config.execution?.schedule || {
          id: this.generateId(),
          type: "recurring" as any,
          enabled: true,
          timing: {
            interval: 24 * 60 * 60 * 1000, // 24 hours
          },
          constraints: {
            allowedHours: [2, 3, 4], // 2-4 AM
            maxDuration: 60 * 60 * 1000, // 1 hour
          },
          retry: {
            maxAttempts: 3,
            backoffStrategy: "exponential" as any,
            baseDelay: 5000,
            maxDelay: 300000,
          },
        },
        dryRun: config.execution?.dryRun || false,
        requireConfirmation: config.execution?.requireConfirmation || false,
        notifications: {
          before: config.execution?.notifications?.before !== false,
          after: config.execution?.notifications?.after !== false,
          onFailure: config.execution?.notifications?.onFailure !== false,
        },
      },
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private shouldPreserveItem(item: any, exceptions: any): boolean {
    // Check ID preservation
    if (exceptions.preserveIds.includes(item.id?.toString())) {
      return true;
    }

    // Check tag preservation
    if (item.metadata?.tags) {
      const itemTags = Array.isArray(item.metadata.tags) ? item.metadata.tags : [item.metadata.tags];
      if (itemTags.some(tag => exceptions.preserveTags.includes(tag))) {
        return true;
      }
    }

    // Check pattern preservation
    for (const pattern of exceptions.preservePatterns) {
      if (pattern.test(JSON.stringify(item))) {
        return true;
      }
    }

    // Check custom criteria
    if (typeof exceptions.preserveCriteria === "function") {
      return exceptions.preserveCriteria(item);
    }

    return false;
  }

  private async archiveItem(item: any, dataType: string): Promise<void> {
    // Implement item archival
    console.log(`Archiving item ${item.id} from ${dataType}`);
  }

  private async compressItem(item: any, dataType: string): Promise<void> {
    // Implement item compression
    console.log(`Compressing item ${item.id} from ${dataType}`);
  }

  private async flagItem(item: any, dataType: string): Promise<void> {
    // Implement item flagging
    console.log(`Flagging item ${item.id} from ${dataType}`);
  }

  private async logLifecycleEvent(event: DataLifecycleEvent): Promise<void> {
    this.eventLog.push(event);

    // Keep only recent events in memory
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-500);
    }

    // Update analytics
    this.updateAnalytics(event);
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeAnalytics(): LifecycleAnalytics {
    return {
      summary: {
        totalItems: 0,
        archivedItems: 0,
        deletedItems: 0,
        compressedItems: 0,
        spaceSaved: 0,
      },
      byDataType: {},
      trends: {
        daily: [],
        monthly: [],
      },
      predictions: {
        nextMonthSpace: 0,
        recommendedActions: [],
      },
    };
  }

  private updateAnalytics(event: DataLifecycleEvent): void {
    // Update summary
    switch (event.eventType) {
      case "archived":
        this.analytics.summary.archivedItems++;
        break;
      case "deleted":
        this.analytics.summary.deletedItems++;
        break;
      case "compressed":
        this.analytics.summary.compressedItems++;
        break;
    }

    // Update by data type
    if (!this.analytics.byDataType[event.dataType]) {
      this.analytics.byDataType[event.dataType] = {
        totalItems: 0,
        totalSize: 0,
        archivedItems: 0,
        deletedItems: 0,
        compressionRatio: 0,
      };
    }

    const dataTypeStats = this.analytics.byDataType[event.dataType];

    switch (event.eventType) {
      case "archived":
        dataTypeStats.archivedItems++;
        break;
      case "deleted":
        dataTypeStats.deletedItems++;
        break;
    }

    // Update trends
    const today = new Date().toISOString().split('T')[0];
    const todayTrend = this.analytics.trends.daily.find(t => t.date === today);

    if (todayTrend) {
      todayTrend.itemsProcessed++;
      todayTrend.spaceSaved += event.metadata.size || 0;
    } else {
      this.analytics.trends.daily.push({
        date: today,
        itemsProcessed: 1,
        spaceSaved: event.metadata.size || 0,
      });

      // Keep only last 30 days
      if (this.analytics.trends.daily.length > 30) {
        this.analytics.trends.daily = this.analytics.trends.daily.slice(-30);
      }
    }
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get all available data lifecycle handlers
 */
export function getDataLifecycleHandlers(): IMaintenanceOperationHandler[] {
  return [
    new DataArchivalHandler(),
    new RetentionPolicyHandler(),
  ];
}

/**
 * Get a specific data lifecycle handler by type
 */
export function getDataLifecycleHandler(type: MaintenanceOperationType): IMaintenanceOperationHandler | null {
  const handlers = getDataLifecycleHandlers();
  return handlers.find(handler => handler.operationType === type) || null;
}

/**
 * Create default data lifecycle configuration
 */
export function createDefaultLifecycleConfig(): {
  aging: DataAgingConfig;
  archival: ArchivalConfig;
} {
  return {
    aging: {
      enabled: true,
      rules: {
        files: {
          enabled: true,
          ageThresholds: [
            { age: 90 * 24 * 60 * 60 * 1000, action: "archive", priority: "low" },
            { age: 365 * 24 * 60 * 60 * 1000, action: "delete", priority: "high" },
          ],
          exceptions: {
            preserveIds: [],
            preserveTags: ["important", "permanent"],
            preserveCriteria: "starred OR user_favorites",
          },
        },
        transcripts: {
          enabled: true,
          ageThresholds: [
            { age: 60 * 24 * 60 * 60 * 1000, action: "archive", priority: "low" },
            { age: 180 * 24 * 60 * 60 * 1000, action: "compress", priority: "medium" },
            { age: 365 * 24 * 60 * 60 * 1000, action: "delete", priority: "high" },
          ],
          exceptions: {
            preserveIds: [],
            preserveTags: ["reference", "important"],
            preserveCriteria: "quality_score > 0.8",
          },
        },
        segments: {
          enabled: true,
          ageThresholds: [
            { age: 180 * 24 * 60 * 60 * 1000, action: "archive", priority: "low" },
            { age: 365 * 24 * 60 * 60 * 1000, action: "delete", priority: "high" },
          ],
          exceptions: {
            preserveIds: [],
            preserveTags: [],
            preserveCriteria: "",
          },
        },
      },
      processing: {
        batchSize: 100,
        maxConcurrentBatches: 3,
        retryAttempts: 3,
        continueOnError: true,
        dryRunByDefault: false,
      },
    },
    archival: {
      enabled: true,
      locations: {
        primary: "maintenance_archives",
      },
      compression: {
        enabled: true,
        algorithm: "gzip",
        level: 6,
      },
      encryption: {
        enabled: false,
        algorithm: "AES-256-GCM",
        keyRotationInterval: 90,
      },
      retention: {
        primary: 365,
        secondary: 1095,
        tertiary: 1825,
      },
      metadata: {
        includeIndexes: true,
        includeStatistics: true,
        customFields: {},
      },
    },
  };
}
