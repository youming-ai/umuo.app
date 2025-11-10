/**
 * Data Cleanup Utilities
 *
 * This module provides comprehensive data cleanup utilities for maintaining
 * optimal storage usage and performance in the umuo-app.
 */

import {
  MaintenanceOperation,
  MaintenanceOperationType,
  MaintenanceOperationResults,
  MaintenanceContext,
  IMaintenanceOperationHandler,
  ValidationResult,
  MaintenanceImpact,
  CleanupOptions,
  CleanupResult,
  DataRetentionPolicy,
  IStorageManager,
  IMaintenanceLogger,
  IProgressTracker,
} from "./types";
import { db, DBUtils } from "../db/db";
import { handleError } from "../utils/error-handler";

// ============================================================================
// EXPIRED DATA CLEANUP
// ============================================================================

/**
 * Handler for cleaning up expired data
 */
export class ExpiredDataCleanupHandler implements IMaintenanceOperationHandler {
  operationType = MaintenanceOperationType.CLEANUP_EXPIRED_DATA;
  name = "Expired Data Cleanup";
  description = "Removes expired files, transcripts, and temporary data";

  supportsProgress = true;
  supportsCancellation = true;
  supportsPauseResume = true;

  async validate(operation: MaintenanceOperation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate configuration
    const { maxAge, dataTypes, preserveIds } = operation.config;

    if (!maxAge || typeof maxAge !== "number" || maxAge <= 0) {
      errors.push("Invalid maxAge configuration. Must be a positive number in milliseconds.");
    }

    if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
      warnings.push("No data types specified. All data types will be considered for cleanup.");
    }

    if (preserveIds && Array.isArray(preserveIds) && preserveIds.length > 1000) {
      warnings.push("Large number of preserve IDs may impact performance.");
    }

    // Check if there's enough free space for the operation
    try {
      const storageInfo = await this.getStorageInfo();
      const freeSpacePercentage = (storageInfo.available / storageInfo.total) * 100;

      if (freeSpacePercentage < 5) {
        errors.push("Critically low storage space. Cannot safely perform cleanup operation.");
      } else if (freeSpacePercentage < 10) {
        warnings.push("Low storage space. Consider freeing up additional space before cleanup.");
      }
    } catch (error) {
      warnings.push("Unable to determine storage space availability.");
    }

    suggestions.push("Consider running a dry run first to see what would be deleted.");
    suggestions.push("Ensure important data is backed up before running cleanup.");

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async estimateDuration(operation: MaintenanceOperation): Promise<number> {
    const config = operation.config;
    const dataTypes = config.dataTypes || ["files", "transcripts", "segments"];

    try {
      // Count items that would be processed
      let totalItems = 0;
      const cutoffDate = new Date(Date.now() - config.maxAge);

      if (dataTypes.includes("files")) {
        const oldFiles = await db.files
          .where("uploadedAt")
          .below(cutoffDate)
          .count();
        totalItems += oldFiles;
      }

      if (dataTypes.includes("transcripts")) {
        const oldTranscripts = await db.transcripts
          .where("createdAt")
          .below(cutoffDate)
          .count();
        totalItems += oldTranscripts;
      }

      if (dataTypes.includes("segments")) {
        const oldSegments = await db.segments
          .where("createdAt")
          .below(cutoffDate)
          .count();
        totalItems += oldSegments;
      }

      // Estimate duration: ~10ms per item + base overhead
      const baseTime = 1000; // 1 second base time
      const itemProcessingTime = 10; // 10ms per item
      return baseTime + (totalItems * itemProcessingTime);
    } catch (error) {
      // Default estimate if unable to count
      return 30000; // 30 seconds
    }
  }

  async estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact> {
    const config = operation.config;

    return {
      resources: {
        cpuUsage: 30, // Moderate CPU usage
        memoryUsage: 20, // Low to moderate memory usage
        diskUsage: 0, // Will actually free up disk space
        networkUsage: 0, // No network usage
      },
      userExperience: {
        interruptionRequired: false,
        performanceImpact: "low", // Minimal performance impact
        userInteractionRequired: false,
        estimatedDowntime: 0,
      },
      data: {
        itemsAffected: 0, // Will be calculated during execution
        dataLossRisk: "medium", // Potential data loss if not configured properly
        backupRequired: true,
        rollbackPossible: false, // Cannot rollback deletions
      },
    };
  }

  async execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults> {
    const logger = context.logger.createOperationLogger(operation.id);
    const progress = context.progressTracker.createTracker(operation.id);

    logger.info("Starting expired data cleanup", operation.config);

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
      const dataTypes = config.dataTypes || ["files", "transcripts", "segments"];
      const preserveIds = new Set(config.preserveIds || []);
      const dryRun = config.dryRun || false;
      const cutoffDate = new Date(Date.now() - config.maxAge);

      logger.info(`Cleaning data older than ${cutoffDate.toISOString()}`, {
        dryRun,
        dataTypes,
        preserveIdsCount: preserveIds.size,
      });

      let totalItems = 0;
      let processedItems = 0;

      // Count total items first for progress tracking
      for (const dataType of dataTypes) {
        const count = await this.countExpiredItems(dataType, cutoffDate);
        totalItems += count;
      }

      progress.update(0, totalItems, "Starting expired data cleanup");

      // Process each data type
      for (const dataType of dataTypes) {
        const stageStart = new Date();
        logger.stage(`Processing ${dataType}`);

        try {
          const typeResult = await this.cleanupDataType(
            dataType,
            cutoffDate,
            preserveIds,
            dryRun,
            (processed, message) => {
              progress.update(processedItems + processed, totalItems, message);
            }
          );

          results.statistics.itemsProcessed += typeResult.itemsProcessed;
          results.statistics.itemsDeleted += typeResult.itemsDeleted;
          results.statistics.itemsArchived += typeResult.itemsArchived;
          results.statistics.itemsModified += typeResult.itemsModified;
          results.statistics.errorsEncountered += typeResult.errors.length;
          results.statistics.warningsGenerated += typeResult.warnings.length;

          results.spaceReclaimed.bytes += typeResult.spaceReclaimed;
          results.affectedResources.tables.push(dataType);

          processedItems += typeResult.itemsProcessed;

          const stageEnd = new Date();
          results.timing.stages.push({
            name: `cleanup_${dataType}`,
            duration: stageEnd.getTime() - stageStart.getTime(),
            startTime: stageStart,
            endTime: stageEnd,
          });

          logger.info(`Completed ${dataType} cleanup`, typeResult);
        } catch (error) {
          logger.error(`Failed to cleanup ${dataType}`, error as Error);
          results.statistics.errorsEncountered++;

          if (!config.continueOnError) {
            throw error;
          }
        }
      }

      // Calculate final statistics
      results.spaceReclaimed.megabytes = results.spaceReclaimed.bytes / (1024 * 1024);

      // Get storage info before and after for percentage calculation
      try {
        const storageBefore = await this.getStorageInfo();
        const storageAfter = await this.getStorageInfo();
        if (storageBefore.total > 0) {
          results.spaceReclaimed.percentage =
            ((storageBefore.used - storageAfter.used) / storageBefore.total) * 100;
        }
      } catch (error) {
        logger.warn("Could not calculate space reclaim percentage", error);
      }

      // Generate recommendations
      if (results.spaceReclaimed.bytes > 100 * 1024 * 1024) { // 100MB
        results.recommendations.push("Significant space reclaimed. Consider reducing retention periods.");
      }

      if (results.statistics.errorsEncountered > 0) {
        results.recommendations.push("Some errors occurred during cleanup. Review logs and consider manual cleanup.");
      }

      results.success = true;
      results.summary = `Successfully cleaned up ${results.statistics.itemsDeleted} expired items and reclaimed ${results.spaceReclaimed.megabytes.toFixed(2)}MB of space.`;

    } catch (error) {
      logger.error("Expired data cleanup failed", error as Error);
      results.success = false;
      results.summary = `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.error = error as Error;
    } finally {
      const endTime = new Date();
      results.timing.endTime = endTime;
      results.timing.totalDuration = endTime.getTime() - startTime.getTime();

      progress.complete(results.success ? "Cleanup completed successfully" : "Cleanup completed with errors");
    }

    return results;
  }

  private async countExpiredItems(dataType: string, cutoffDate: Date): Promise<number> {
    try {
      switch (dataType) {
        case "files":
          return await db.files.where("uploadedAt").below(cutoffDate).count();
        case "transcripts":
          return await db.transcripts.where("createdAt").below(cutoffDate).count();
        case "segments":
          return await db.segments.where("createdAt").below(cutoffDate).count();
        default:
          return 0;
      }
    } catch (error) {
      console.warn(`Failed to count expired items for ${dataType}:`, error);
      return 0;
    }
  }

  private async cleanupDataType(
    dataType: string,
    cutoffDate: Date,
    preserveIds: Set<string>,
    dryRun: boolean,
    onProgress?: (processed: number, message: string) => void
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      switch (dataType) {
        case "files":
          return await this.cleanupFiles(cutoffDate, preserveIds, dryRun, onProgress);
        case "transcripts":
          return await this.cleanupTranscripts(cutoffDate, preserveIds, dryRun, onProgress);
        case "segments":
          return await this.cleanupSegments(cutoffDate, preserveIds, dryRun, onProgress);
        default:
          result.warnings.push(`Unknown data type: ${dataType}`);
          return result;
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to cleanup ${dataType}: ${error instanceof Error ? error.message : "Unknown error"}`);
      return result;
    }
  }

  private async cleanupFiles(
    cutoffDate: Date,
    preserveIds: Set<string>,
    dryRun: boolean,
    onProgress?: (processed: number, message: string) => void
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      const expiredFiles = await db.files
        .where("uploadedAt")
        .below(cutoffDate)
        .toArray();

      onProgress?.(0, `Found ${expiredFiles.length} expired files`);

      for (let i = 0; i < expiredFiles.length; i++) {
        const file = expiredFiles[i];

        // Skip if file ID is in preserve list
        if (preserveIds.has(file.id.toString())) {
          continue;
        }

        try {
          if (!dryRun) {
            // Get file size before deletion
            const fileSize = file.size || 0;

            // Delete file and associated data
            await DBUtils.deleteFile(file.id);

            result.spaceReclaimed += fileSize;
            result.itemsDeleted++;
          } else {
            // Dry run - just count what would be deleted
            result.itemsDeleted++;
            result.spaceReclaimed += file.size || 0;
          }

          if (i % 10 === 0) {
            onProgress?.(i, `Processed ${i}/${expiredFiles.length} files`);
          }
        } catch (error) {
          result.errors.push(`Failed to delete file ${file.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      onProgress?.(expiredFiles.length, `Processed ${expiredFiles.length} files`);
    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to cleanup files: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async cleanupTranscripts(
    cutoffDate: Date,
    preserveIds: Set<string>,
    dryRun: boolean,
    onProgress?: (processed: number, message: string) => void
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      const expiredTranscripts = await db.transcripts
        .where("createdAt")
        .below(cutoffDate)
        .toArray();

      onProgress?.(0, `Found ${expiredTranscripts.length} expired transcripts`);

      for (let i = 0; i < expiredTranscripts.length; i++) {
        const transcript = expiredTranscripts[i];

        // Skip if transcript ID is in preserve list
        if (preserveIds.has(transcript.id!.toString())) {
          continue;
        }

        try {
          if (!dryRun) {
            // First delete associated segments
            if (transcript.id) {
              await db.segments
                .where("transcriptId")
                .equals(transcript.id)
                .delete();
            }

            // Then delete the transcript
            await db.transcripts.delete(transcript.id!);
            result.itemsDeleted++;
          } else {
            // Dry run
            result.itemsDeleted++;
          }

          if (i % 10 === 0) {
            onProgress?.(i, `Processed ${i}/${expiredTranscripts.length} transcripts`);
          }
        } catch (error) {
          result.errors.push(`Failed to delete transcript ${transcript.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      onProgress?.(expiredTranscripts.length, `Processed ${expiredTranscripts.length} transcripts`);
    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to cleanup transcripts: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async cleanupSegments(
    cutoffDate: Date,
    preserveIds: Set<string>,
    dryRun: boolean,
    onProgress?: (processed: number, message: string) => void
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      const expiredSegments = await db.segments
        .where("createdAt")
        .below(cutoffDate)
        .toArray();

      onProgress?.(0, `Found ${expiredSegments.length} expired segments`);

      // Process in batches to avoid blocking the UI
      const batchSize = 100;
      for (let i = 0; i < expiredSegments.length; i += batchSize) {
        const batch = expiredSegments.slice(i, i + batchSize);
        const idsToDelete: number[] = [];

        for (const segment of batch) {
          // Skip if segment ID is in preserve list
          if (preserveIds.has(segment.id!.toString())) {
            continue;
          }
          idsToDelete.push(segment.id!);
        }

        if (!dryRun && idsToDelete.length > 0) {
          try {
            await db.segments.bulkDelete(idsToDelete);
            result.itemsDeleted += idsToDelete.length;
          } catch (error) {
            result.errors.push(`Failed to delete batch of segments: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        } else if (dryRun) {
          result.itemsDeleted += idsToDelete.length;
        }

        if (i % (batchSize * 5) === 0) {
          onProgress?.(i + batch.length, `Processed ${i + batch.length}/${expiredSegments.length} segments`);
        }
      }

      onProgress?.(expiredSegments.length, `Processed ${expiredSegments.length} segments`);
    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to cleanup segments: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async getStorageInfo(): Promise<{ total: number; used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          total: estimate.quota || 0,
          used: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
        };
      } catch (error) {
        console.warn("Failed to get storage estimate:", error);
      }
    }

    // Fallback for browsers that don't support storage estimation
    return {
      total: 0,
      used: 0,
      available: 0,
    };
  }
}

// ============================================================================
// TEMPORARY FILES CLEANUP
// ============================================================================

/**
 * Handler for cleaning up temporary files and caches
 */
export class TemporaryFilesCleanupHandler implements IMaintenanceOperationHandler {
  operationType = MaintenanceOperationType.CLEANUP_TEMPORARY_FILES;
  name = "Temporary Files Cleanup";
  description = "Removes temporary files, caches, and orphaned data";

  supportsProgress = true;
  supportsCancellation = true;
  supportsPauseResume = true;

  async validate(operation: MaintenanceOperation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const { cleanupTypes, maxAge } = operation.config;

    if (!cleanupTypes || !Array.isArray(cleanupTypes) || cleanupTypes.length === 0) {
      warnings.push("No cleanup types specified. Default cleanup types will be used.");
    }

    if (!maxAge || typeof maxAge !== "number" || maxAge <= 0) {
      errors.push("Invalid maxAge configuration. Must be a positive number in milliseconds.");
    }

    suggestions.push("Consider running during low usage periods to minimize impact.");
    suggestions.push("Ensure no active operations rely on temporary files being cleaned.");

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async estimateDuration(operation: MaintenanceOperation): Promise<number> {
    // Temporary files cleanup is typically fast
    return 5000; // 5 seconds
  }

  async estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact> {
    return {
      resources: {
        cpuUsage: 10, // Low CPU usage
        memoryUsage: 10, // Low memory usage
        diskUsage: 0, // Will free up disk space
        networkUsage: 0, // No network usage
      },
      userExperience: {
        interruptionRequired: false,
        performanceImpact: "none",
        userInteractionRequired: false,
        estimatedDowntime: 0,
      },
      data: {
        itemsAffected: 0,
        dataLossRisk: "none", // Only temporary data
        backupRequired: false,
        rollbackPossible: false,
      },
    };
  }

  async execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults> {
    const logger = context.logger.createOperationLogger(operation.id);
    const progress = context.progressTracker.createTracker(operation.id);

    logger.info("Starting temporary files cleanup", operation.config);

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
      const cleanupTypes = config.cleanupTypes || ["cache", "temp", "orphans"];
      const maxAge = config.maxAge || 24 * 60 * 60 * 1000; // 24 hours default
      const dryRun = config.dryRun || false;

      let totalCleanupTypes = cleanupTypes.length;
      let processedTypes = 0;

      progress.update(0, totalCleanupTypes, "Starting temporary files cleanup");

      for (const cleanupType of cleanupTypes) {
        const stageStart = new Date();
        logger.stage(`Cleaning ${cleanupType}`);

        try {
          const typeResult = await this.cleanupTemporaryType(
            cleanupType,
            maxAge,
            dryRun
          );

          results.statistics.itemsProcessed += typeResult.itemsProcessed;
          results.statistics.itemsDeleted += typeResult.itemsDeleted;
          results.statistics.errorsEncountered += typeResult.errors.length;
          results.statistics.warningsGenerated += typeResult.warnings.length;

          results.spaceReclaimed.bytes += typeResult.spaceReclaimed;
          results.affectedResources.caches.push(cleanupType);

          processedTypes++;
          progress.update(processedTypes, totalCleanupTypes, `Completed ${cleanupType} cleanup`);

          const stageEnd = new Date();
          results.timing.stages.push({
            name: `cleanup_${cleanupType}`,
            duration: stageEnd.getTime() - stageStart.getTime(),
            startTime: stageStart,
            endTime: stageEnd,
          });

          logger.info(`Completed ${cleanupType} cleanup`, typeResult);
        } catch (error) {
          logger.error(`Failed to cleanup ${cleanupType}`, error as Error);
          results.statistics.errorsEncountered++;
          processedTypes++;
          progress.update(processedTypes, totalCleanupTypes, `Failed ${cleanupType} cleanup`);
        }
      }

      results.spaceReclaimed.megabytes = results.spaceReclaimed.bytes / (1024 * 1024);
      results.success = true;
      results.summary = `Successfully cleaned up ${results.statistics.itemsDeleted} temporary items and reclaimed ${results.spaceReclaimed.megabytes.toFixed(2)}MB of space.`;

    } catch (error) {
      logger.error("Temporary files cleanup failed", error as Error);
      results.success = false;
      results.summary = `Temporary files cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.error = error as Error;
    } finally {
      const endTime = new Date();
      results.timing.endTime = endTime;
      results.timing.totalDuration = endTime.getTime() - startTime.getTime();

      progress.complete(results.success ? "Cleanup completed successfully" : "Cleanup completed with errors");
    }

    return results;
  }

  private async cleanupTemporaryType(
    cleanupType: string,
    maxAge: number,
    dryRun: boolean
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    const cutoffDate = new Date(Date.now() - maxAge);

    try {
      switch (cleanupType) {
        case "cache":
          return await this.cleanupCache(cutoffDate, dryRun);
        case "temp":
          return await this.cleanupTempFiles(cutoffDate, dryRun);
        case "orphans":
          return await this.cleanupOrphanedData(dryRun);
        case "blobs":
          return await this.cleanupOldBlobs(cutoffDate, dryRun);
        default:
          result.warnings.push(`Unknown cleanup type: ${cleanupType}`);
          return result;
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Failed to cleanup ${cleanupType}: ${error instanceof Error ? error.message : "Unknown error"}`);
      return result;
    }
  }

  private async cleanupCache(cutoffDate: Date, dryRun: boolean): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Clear localStorage cache items
      if (typeof window !== "undefined" && window.localStorage) {
        const keysToRemove: string[] = [];

        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith("cache_") || key.startsWith("temp_"))) {
            try {
              const item = window.localStorage.getItem(key);
              if (item) {
                const parsed = JSON.parse(item);
                if (parsed.timestamp && new Date(parsed.timestamp) < cutoffDate) {
                  keysToRemove.push(key);
                }
              }
            } catch {
              // If we can't parse the item, consider it for removal
              keysToRemove.push(key);
            }
          }
        }

        if (!dryRun) {
          keysToRemove.forEach(key => {
            try {
              window.localStorage.removeItem(key);
              result.itemsDeleted++;
            } catch (error) {
              result.errors.push(`Failed to remove localStorage item ${key}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          });
        } else {
          result.itemsDeleted = keysToRemove.length;
        }
      }

      // Clear sessionStorage cache items
      if (typeof window !== "undefined" && window.sessionStorage) {
        const keysToRemove: string[] = [];

        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key && (key.startsWith("cache_") || key.startsWith("temp_"))) {
            keysToRemove.push(key);
          }
        }

        if (!dryRun) {
          keysToRemove.forEach(key => {
            try {
              window.sessionStorage.removeItem(key);
              result.itemsDeleted++;
            } catch (error) {
              result.errors.push(`Failed to remove sessionStorage item ${key}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          });
        } else {
          result.itemsDeleted += keysToRemove.length;
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Cache cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async cleanupTempFiles(cutoffDate: Date, dryRun: boolean): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Clean up any temporary files in IndexedDB
      const tempTables = ["audioChunks", "progressTrackers"];

      for (const tableName of tempTables) {
        try {
          const table = (db as any)[tableName];
          if (table) {
            const oldItems = await table
              .where("timestamp")
              .below(cutoffDate)
              .toArray();

            if (!dryRun && oldItems.length > 0) {
              await table.bulkDelete(oldItems.map(item => item.id));
              result.itemsDeleted += oldItems.length;
            } else {
              result.itemsDeleted += oldItems.length;
            }
          }
        } catch (error) {
          result.warnings.push(`Failed to cleanup temporary table ${tableName}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Temporary files cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async cleanupOrphanedData(dryRun: boolean): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Find orphaned segments (segments without associated transcripts)
      const transcriptIds = new Set();
      const allTranscripts = await db.transcripts.toArray();
      allTranscripts.forEach(transcript => {
        if (transcript.id) transcriptIds.add(transcript.id);
      });

      const allSegments = await db.segments.toArray();
      const orphanedSegments = allSegments.filter(segment =>
        !transcriptIds.has(segment.transcriptId)
      );

      if (!dryRun && orphanedSegments.length > 0) {
        await db.segments.bulkDelete(orphanedSegments.map(segment => segment.id!));
        result.itemsDeleted += orphanedSegments.length;
      } else {
        result.itemsDeleted += orphanedSegments.length;
      }

      // Find orphaned transcripts (transcripts without associated files)
      const fileIds = new Set();
      const allFiles = await db.files.toArray();
      allFiles.forEach(file => fileIds.add(file.id));

      const orphanedTranscripts = allTranscripts.filter(transcript =>
        !fileIds.has(transcript.fileId)
      );

      if (!dryRun && orphanedTranscripts.length > 0) {
        // First delete segments for orphaned transcripts
        for (const transcript of orphanedTranscripts) {
          if (transcript.id) {
            await db.segments
              .where("transcriptId")
              .equals(transcript.id)
              .delete();
          }
        }

        // Then delete the orphaned transcripts
        await db.transcripts.bulkDelete(orphanedTranscripts.map(transcript => transcript.id!));
        result.itemsDeleted += orphanedTranscripts.length;
      } else {
        result.itemsDeleted += orphanedTranscripts.length;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Orphaned data cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async cleanupOldBlobs(cutoffDate: Date, dryRun: boolean): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Clean up old blob URLs that might be cached
      if (typeof window !== "undefined") {
        // Note: We can't directly access all blob URLs, but we can clean up any
        // that we might have stored in localStorage with timestamps
        const blobKeys: string[] = [];

        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith("blob_url_")) {
            try {
              const item = window.localStorage.getItem(key);
              if (item) {
                const parsed = JSON.parse(item);
                if (parsed.timestamp && new Date(parsed.timestamp) < cutoffDate) {
                  // Revoke the blob URL if it still exists
                  if (parsed.url && parsed.url.startsWith("blob:")) {
                    try {
                      URL.revokeObjectURL(parsed.url);
                    } catch {
                      // URL might already be revoked
                    }
                  }
                  blobKeys.push(key);
                }
              }
            } catch {
              blobKeys.push(key);
            }
          }
        }

        if (!dryRun) {
          blobKeys.forEach(key => {
            try {
              window.localStorage.removeItem(key);
              result.itemsDeleted++;
            } catch (error) {
              result.errors.push(`Failed to remove blob URL ${key}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          });
        } else {
          result.itemsDeleted = blobKeys.length;
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Blob cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }
}

// ============================================================================
// ERROR LOG CLEANUP
// ============================================================================

/**
 * Handler for cleaning up error logs and monitoring data
 */
export class ErrorLogCleanupHandler implements IMaintenanceOperationHandler {
  operationType = MaintenanceOperationType.CLEANUP_ERROR_LOGS;
  name = "Error Log Cleanup";
  description = "Cleans up old error logs and monitoring data";

  supportsProgress = true;
  supportsCancellation = true;
  supportsPauseResume = true;

  async validate(operation: MaintenanceOperation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const { retentionDays, preserveCritical } = operation.config;

    if (!retentionDays || typeof retentionDays !== "number" || retentionDays <= 0) {
      errors.push("Invalid retentionDays configuration. Must be a positive number.");
    }

    if (preserveCritical === undefined) {
      suggestions.push("Consider preserving critical errors for longer retention.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async estimateDuration(operation: MaintenanceOperation): Promise<number> {
    // Error log cleanup is typically fast
    return 3000; // 3 seconds
  }

  async estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact> {
    return {
      resources: {
        cpuUsage: 5, // Very low CPU usage
        memoryUsage: 5, // Very low memory usage
        diskUsage: 0, // Will free up disk space
        networkUsage: 0, // No network usage
      },
      userExperience: {
        interruptionRequired: false,
        performanceImpact: "none",
        userInteractionRequired: false,
        estimatedDowntime: 0,
      },
      data: {
        itemsAffected: 0,
        dataLossRisk: "none", // Only log data
        backupRequired: false,
        rollbackPossible: false,
      },
    };
  }

  async execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults> {
    const logger = context.logger.createOperationLogger(operation.id);
    const progress = context.progressTracker.createTracker(operation.id);

    logger.info("Starting error log cleanup", operation.config);

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
      const retentionDays = config.retentionDays || 30;
      const preserveCritical = config.preserveCritical !== false;
      const dryRun = config.dryRun || false;

      const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));

      logger.info(`Cleaning error logs older than ${cutoffDate.toISOString()}`, {
        retentionDays,
        preserveCritical,
        dryRun,
      });

      progress.update(0, 1, "Starting error log cleanup");

      const stageStart = new Date();

      // Clean up error logs from localStorage
      const logCleanupResult = await this.cleanupErrorLogs(cutoffDate, preserveCritical, dryRun);

      results.statistics.itemsProcessed += logCleanupResult.itemsProcessed;
      results.statistics.itemsDeleted += logCleanupResult.itemsDeleted;
      results.statistics.errorsEncountered += logCleanupResult.errors.length;
      results.statistics.warningsGenerated += logCleanupResult.warnings.length;

      results.spaceReclaimed.bytes += logCleanupResult.spaceReclaimed;
      results.affectedResources.caches.push("error_logs");

      progress.update(1, 1, "Error log cleanup completed");

      const stageEnd = new Date();
      results.timing.stages.push({
        name: "cleanup_error_logs",
        duration: stageEnd.getTime() - stageStart.getTime(),
        startTime: stageStart,
        endTime: stageEnd,
      });

      results.spaceReclaimed.megabytes = results.spaceReclaimed.bytes / (1024 * 1024);
      results.success = true;
      results.summary = `Successfully cleaned up ${results.statistics.itemsDeleted} error log entries and reclaimed ${results.spaceReclaimed.megabytes.toFixed(2)}MB of space.`;

    } catch (error) {
      logger.error("Error log cleanup failed", error as Error);
      results.success = false;
      results.summary = `Error log cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.error = error as Error;
    } finally {
      const endTime = new Date();
      results.timing.endTime = endTime;
      results.timing.totalDuration = endTime.getTime() - startTime.getTime();

      progress.complete(results.success ? "Cleanup completed successfully" : "Cleanup completed with errors");
    }

    return results;
  }

  private async cleanupErrorLogs(cutoffDate: Date, preserveCritical: boolean, dryRun: boolean): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Clean up error logs from localStorage
      if (typeof window !== "undefined" && window.localStorage) {
        const keysToRemove: string[] = [];

        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith("error_log_") || key.startsWith("maintenance_log_"))) {
            try {
              const item = window.localStorage.getItem(key);
              if (item) {
                const parsed = JSON.parse(item);
                const logDate = new Date(parsed.timestamp || parsed.date);

                // Check if log is older than cutoff date
                if (logDate < cutoffDate) {
                  // If preserveCritical is enabled, check if this is a critical error
                  if (preserveCritical && (
                    parsed.level === "CRITICAL" ||
                    parsed.level === "FATAL" ||
                    parsed.severity === "critical" ||
                    parsed.type === "critical"
                  )) {
                    result.warnings.push(`Preserving critical error log: ${key}`);
                    continue;
                  }

                  keysToRemove.push(key);

                  // Estimate space reclaimed
                  result.spaceReclaimed += item.length * 2; // Rough estimate of memory usage
                }
              }
            } catch (error) {
              // If we can't parse the log, consider it for removal
              keysToRemove.push(key);
            }
          }
        }

        if (!dryRun) {
          keysToRemove.forEach(key => {
            try {
              window.localStorage.removeItem(key);
              result.itemsDeleted++;
            } catch (error) {
              result.errors.push(`Failed to remove error log ${key}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          });
        } else {
          result.itemsDeleted = keysToRemove.length;
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Error log cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }
}

// ============================================================================
// PERFORMANCE METRICS CLEANUP
// ============================================================================

/**
 * Handler for cleaning up performance metrics and analytics data
 */
export class PerformanceMetricsCleanupHandler implements IMaintenanceOperationHandler {
  operationType = MaintenanceOperationType.CLEANUP_PERFORMANCE_METRICS;
  name = "Performance Metrics Cleanup";
  description = "Cleans up old performance metrics and analytics data";

  supportsProgress = true;
  supportsCancellation = true;
  supportsPauseResume = true;

  async validate(operation: MaintenanceOperation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const { retentionDays, aggregateData } = operation.config;

    if (!retentionDays || typeof retentionDays !== "number" || retentionDays <= 0) {
      errors.push("Invalid retentionDays configuration. Must be a positive number.");
    }

    if (aggregateData && !operation.config.aggregationPeriod) {
      warnings.push("Aggregation enabled but no aggregation period specified. Using default of 7 days.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async estimateDuration(operation: MaintenanceOperation): Promise<number> {
    // Performance metrics cleanup is typically fast
    return 2000; // 2 seconds
  }

  async estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact> {
    return {
      resources: {
        cpuUsage: 5, // Very low CPU usage
        memoryUsage: 5, // Very low memory usage
        diskUsage: 0, // Will free up disk space
        networkUsage: 0, // No network usage
      },
      userExperience: {
        interruptionRequired: false,
        performanceImpact: "none",
        userInteractionRequired: false,
        estimatedDowntime: 0,
      },
      data: {
        itemsAffected: 0,
        dataLossRisk: "none", // Only metrics data
        backupRequired: false,
        rollbackPossible: false,
      },
    };
  }

  async execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults> {
    const logger = context.logger.createOperationLogger(operation.id);
    const progress = context.progressTracker.createTracker(operation.id);

    logger.info("Starting performance metrics cleanup", operation.config);

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
      const retentionDays = config.retentionDays || 7;
      const aggregateData = config.aggregateData || false;
      const dryRun = config.dryRun || false;

      const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));

      logger.info(`Cleaning performance metrics older than ${cutoffDate.toISOString()}`, {
        retentionDays,
        aggregateData,
        dryRun,
      });

      progress.update(0, 1, "Starting performance metrics cleanup");

      const stageStart = new Date();

      // Clean up performance metrics from database
      const metricsCleanupResult = await this.cleanupPerformanceMetrics(cutoffDate, aggregateData, dryRun);

      results.statistics.itemsProcessed += metricsCleanupResult.itemsProcessed;
      results.statistics.itemsDeleted += metricsCleanupResult.itemsDeleted;
      results.statistics.itemsArchived += metricsCleanupResult.itemsArchived;
      results.statistics.itemsModified += metricsCleanupResult.itemsModified;
      results.statistics.errorsEncountered += metricsCleanupResult.errors.length;
      results.statistics.warningsGenerated += metricsCleanupResult.warnings.length;

      results.spaceReclaimed.bytes += metricsCleanupResult.spaceReclaimed;
      results.affectedResources.tables.push("performanceMetrics");

      progress.update(1, 1, "Performance metrics cleanup completed");

      const stageEnd = new Date();
      results.timing.stages.push({
        name: "cleanup_performance_metrics",
        duration: stageEnd.getTime() - stageStart.getTime(),
        startTime: stageStart,
        endTime: stageEnd,
      });

      results.spaceReclaimed.megabytes = results.spaceReclaimed.bytes / (1024 * 1024);
      results.success = true;
      results.summary = `Successfully cleaned up ${results.statistics.itemsDeleted} performance metric entries and reclaimed ${results.spaceReclaimed.megabytes.toFixed(2)}MB of space.`;

    } catch (error) {
      logger.error("Performance metrics cleanup failed", error as Error);
      results.success = false;
      results.summary = `Performance metrics cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.error = error as Error;
    } finally {
      const endTime = new Date();
      results.timing.endTime = endTime;
      results.timing.totalDuration = endTime.getTime() - startTime.getTime();

      progress.complete(results.success ? "Cleanup completed successfully" : "Cleanup completed with errors");
    }

    return results;
  }

  private async cleanupPerformanceMetrics(cutoffDate: Date, aggregateData: boolean, dryRun: boolean): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      itemsDeleted: 0,
      spaceReclaimed: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Clean up performance metrics from database
      const oldMetrics = await db.performanceMetrics
        .where("timestamp")
        .below(cutoffDate)
        .toArray();

      if (aggregateData && oldMetrics.length > 0) {
        // Aggregate data before deletion
        const aggregatedData = this.aggregateMetrics(oldMetrics);

        if (!dryRun && aggregatedData.length > 0) {
          await db.performanceMetrics.bulkAdd(aggregatedData);
          result.itemsArchived = aggregatedData.length;
        }
      }

      if (!dryRun && oldMetrics.length > 0) {
        // Delete old metrics
        const idsToDelete = oldMetrics.map(metric => metric.id);
        await db.performanceMetrics.bulkDelete(idsToDelete);
        result.itemsDeleted = idsToDelete.length;

        // Estimate space reclaimed
        result.spaceReclaimed = oldMetrics.length * 200; // Rough estimate per metric entry
      } else {
        result.itemsDeleted = oldMetrics.length;
        result.spaceReclaimed = oldMetrics.length * 200;
      }

      // Clean up mobile interactions (related to performance)
      const oldInteractions = await db.mobileInteractions
        .where("timestamp")
        .below(cutoffDate)
        .toArray();

      if (!dryRun && oldInteractions.length > 0) {
        const interactionIds = oldInteractions.map(interaction => interaction.id);
        await db.mobileInteractions.bulkDelete(interactionIds);
        result.itemsDeleted += interactionIds.length;

        result.spaceReclaimed += interactionIds.length * 100; // Rough estimate per interaction
      } else {
        result.itemsDeleted += oldInteractions.length;
        result.spaceReclaimed += oldInteractions.length * 100;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Performance metrics cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private aggregateMetrics(metrics: any[]): any[] {
    // Simple aggregation - group by date and job type
    const aggregated = new Map<string, any>();

    metrics.forEach(metric => {
      const date = new Date(metric.timestamp).toISOString().split('T')[0]; // Just the date
      const key = `${date}_${metric.jobId || 'unknown'}`;

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          timestamp: new Date(date),
          jobId: metric.jobId,
          aggregated: true,
          totalOperations: 0,
          successCount: 0,
          errorCount: 0,
          avgProcessingTime: 0,
          minProcessingTime: Infinity,
          maxProcessingTime: 0,
          totalAudioSize: 0,
          errorTypes: new Set(),
          createdAt: new Date(),
        });
      }

      const agg = aggregated.get(key);
      agg.totalOperations++;

      if (metric.success) {
        agg.successCount++;
      } else {
        agg.errorCount++;
        if (metric.errorType) {
          agg.errorTypes.add(metric.errorType);
        }
      }

      if (metric.processingTime) {
        agg.avgProcessingTime += metric.processingTime;
        agg.minProcessingTime = Math.min(agg.minProcessingTime, metric.processingTime);
        agg.maxProcessingTime = Math.max(agg.maxProcessingTime, metric.processingTime);
      }

      if (metric.audioSize) {
        agg.totalAudioSize += metric.audioSize;
      }
    });

    // Convert Sets to Arrays and calculate averages
    const result = Array.from(aggregated.values());
    result.forEach(agg => {
      agg.errorTypes = Array.from(agg.errorTypes);
      if (agg.totalOperations > 0) {
        agg.avgProcessingTime = agg.avgProcessingTime / agg.totalOperations;
      }
      if (agg.minProcessingTime === Infinity) {
        agg.minProcessingTime = 0;
      }
    });

    return result;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all available data cleanup handlers
 */
export function getDataCleanupHandlers(): IMaintenanceOperationHandler[] {
  return [
    new ExpiredDataCleanupHandler(),
    new TemporaryFilesCleanupHandler(),
    new ErrorLogCleanupHandler(),
    new PerformanceMetricsCleanupHandler(),
  ];
}

/**
 * Get a specific data cleanup handler by type
 */
export function getDataCleanupHandler(type: MaintenanceOperationType): IMaintenanceOperationHandler | null {
  const handlers = getDataCleanupHandlers();
  return handlers.find(handler => handler.operationType === type) || null;
}

/**
 * Create a default data cleanup operation configuration
 */
export function createDefaultCleanupConfig(): Record<string, any> {
  return {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    dataTypes: ["files", "transcripts", "segments"],
    preserveIds: [],
    continueOnError: true,
    dryRun: false,
    cleanupTypes: ["cache", "temp", "orphans"],
    retentionDays: 30,
    preserveCritical: true,
    aggregateData: true,
    aggregationPeriod: 7, // days
  };
}
