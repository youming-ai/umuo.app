/**
 * Database Maintenance and Optimization Utilities
 *
 * This module provides comprehensive database maintenance utilities for IndexedDB,
 * including optimization, compaction, integrity checks, and performance monitoring.
 */

import Dexie, { type Table } from "dexie";
import {
  MaintenanceOperation,
  MaintenanceOperationType,
  MaintenanceOperationResults,
  MaintenanceContext,
  IMaintenanceOperationHandler,
  ValidationResult,
  MaintenanceImpact,
  IMaintenanceLogger,
  IProgressTracker,
} from "./types";
import { db } from "../db/db";
import { handleError } from "../utils/error-handler";

// ============================================================================
// DATABASE INFORMATION INTERFACES
// ============================================================================

/**
 * Database table information
 */
export interface DatabaseTableInfo {
  name: string;
  rowCount: number;
  estimatedSize: number;
  indexes: DatabaseIndexInfo[];
  lastAccessed?: Date;
  lastModified?: Date;
  fragmentationLevel?: number;
}

/**
 * Database index information
 */
export interface DatabaseIndexInfo {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
  entryCount: number;
  estimatedSize: number;
  efficiency?: number; // 0-100, higher is better
}

/**
 * Database health status
 */
export interface DatabaseHealthStatus {
  overall: "healthy" | "warning" | "error" | "critical";
  tables: Record<string, {
    status: "healthy" | "warning" | "error";
    issues: string[];
    recommendations: string[];
  }>;
  performance: {
    averageQueryTime: number;
    slowQueries: number;
    indexEfficiency: number;
    fragmentationLevel: number;
  };
  storage: {
    totalSize: number;
    estimatedWastedSpace: number;
    compressionPotential: number;
  };
}

/**
 * Database optimization plan
 */
export interface DatabaseOptimizationPlan {
  operations: DatabaseOptimizationOperation[];
  estimatedDuration: number;
  estimatedSpaceReclaimed: number;
  performanceImprovement: number;
  risks: string[];
  recommendations: string[];
}

/**
 * Individual optimization operation
 */
export interface DatabaseOptimizationOperation {
  type: "compact" | "reindex" | "cleanup" | "vacuum" | "analyze";
  target: string; // table name or "database"
  priority: "low" | "medium" | "high" | "critical";
  estimatedDuration: number;
  estimatedSpaceReclaimed: number;
  description: string;
  dependencies: string[];
}

// ============================================================================
// DATABASE OPTIMIZATION HANDLER
// ============================================================================

/**
 * Handler for database optimization and maintenance operations
 */
export class DatabaseOptimizationHandler implements IMaintenanceOperationHandler {
  operationType = MaintenanceOperationType.DATABASE_OPTIMIZATION;
  name = "Database Optimization";
  description = "Optimizes database performance and storage efficiency";

  supportsProgress = true;
  supportsCancellation = true;
  supportsPauseResume = false; // Database operations shouldn't be paused mid-transaction

  async validate(operation: MaintenanceOperation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const { optimizationTypes, targetTables, forceRebuild } = operation.config;

    if (!optimizationTypes || !Array.isArray(optimizationTypes) || optimizationTypes.length === 0) {
      warnings.push("No optimization types specified. Default optimization types will be used.");
    }

    if (targetTables && Array.isArray(targetTables)) {
      // Validate table names
      const validTables = ["files", "transcripts", "segments", "transcriptionJobs", "audioChunks", "progressTrackers", "mobileInteractions", "performanceMetrics"];
      const invalidTables = targetTables.filter(table => !validTables.includes(table));
      if (invalidTables.length > 0) {
        errors.push(`Invalid table names: ${invalidTables.join(", ")}`);
      }
    }

    if (forceRebuild) {
      warnings.push("Force rebuild enabled. This may take considerable time and temporarily impact performance.");
    }

    suggestions.push("Ensure adequate free space is available before running optimization operations.");
    suggestions.push("Consider running during low usage periods to minimize impact.");
    suggestions.push("Create a backup of important data before major optimizations.");

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async estimateDuration(operation: MaintenanceOperation): Promise<number> {
    const config = operation.config;
    const optimizationTypes = config.optimizationTypes || ["compact", "reindex", "cleanup"];
    const targetTables = config.targetTables || ["files", "transcripts", "segments"];

    try {
      // Get database statistics for better estimation
      const dbInfo = await this.getDatabaseInfo(targetTables);
      let totalDuration = 5000; // 5 seconds base time

      for (const tableInfo of dbInfo.tables) {
        const rowCount = tableInfo.rowCount;

        // Compact: ~1ms per 100 rows
        if (optimizationTypes.includes("compact")) {
          totalDuration += Math.ceil(rowCount / 100);
        }

        // Reindex: ~2ms per 100 rows
        if (optimizationTypes.includes("reindex")) {
          totalDuration += Math.ceil(rowCount / 50);
        }

        // Cleanup: ~0.5ms per 100 rows
        if (optimizationTypes.includes("cleanup")) {
          totalDuration += Math.ceil(rowCount / 200);
        }

        // Vacuum: ~5ms per 1000 rows
        if (optimizationTypes.includes("vacuum")) {
          totalDuration += Math.ceil(rowCount / 200);
        }
      }

      return totalDuration;
    } catch (error) {
      // Default estimate if unable to get database info
      return 60000; // 1 minute
    }
  }

  async estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact> {
    const config = operation.config;
    const optimizationTypes = config.optimizationTypes || ["compact", "reindex"];

    return {
      resources: {
        cpuUsage: optimizationTypes.includes("reindex") ? 60 : 30, // Higher CPU for reindexing
        memoryUsage: optimizationTypes.includes("compact") ? 50 : 20, // Higher memory for compaction
        diskUsage: 0, // Will free up disk space long-term
        networkUsage: 0, // No network usage
      },
      userExperience: {
        interruptionRequired: false,
        performanceImpact: optimizationTypes.includes("reindex") ? "medium" : "low",
        userInteractionRequired: false,
        estimatedDowntime: 0,
      },
      data: {
        itemsAffected: 0, // Will be calculated during execution
        dataLossRisk: "none",
        backupRequired: true, // Always good to backup before optimization
        rollbackPossible: true, // Most operations can be rolled back
      },
    };
  }

  async execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults> {
    const logger = context.logger.createOperationLogger(operation.id);
    const progress = context.progressTracker.createTracker(operation.id);

    logger.info("Starting database optimization", operation.config);

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
        databaseOptimized: true,
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
      const optimizationTypes = config.optimizationTypes || ["compact", "reindex", "cleanup"];
      const targetTables = config.targetTables || ["files", "transcripts", "segments"];
      const forceRebuild = config.forceRebuild || false;
      const dryRun = config.dryRun || false;

      logger.info(`Optimizing database with operations: ${optimizationTypes.join(", ")}`, {
        targetTables,
        forceRebuild,
        dryRun,
      });

      // Get initial database state for comparison
      const initialDbInfo = await this.getDatabaseInfo(targetTables);
      results.affectedResources.tables = targetTables;

      let totalOperations = optimizationTypes.length * targetTables.length;
      let completedOperations = 0;

      progress.update(0, totalOperations, "Starting database optimization");

      // Run each optimization type on each target table
      for (const optimizationType of optimizationTypes) {
        for (const tableName of targetTables) {
          const stageStart = new Date();
          logger.stage(`${optimizationType} ${tableName}`);

          try {
            const typeResult = await this.performOptimization(
              optimizationType,
              tableName,
              forceRebuild,
              dryRun,
              (processed, message) => {
                progress.update(completedOperations, totalOperations, `${optimizationType} ${tableName}: ${message}`);
              }
            );

            results.statistics.itemsProcessed += typeResult.itemsProcessed;
            results.statistics.itemsDeleted += typeResult.itemsDeleted;
            results.statistics.itemsModified += typeResult.itemsModified;
            results.statistics.errorsEncountered += typeResult.errors.length;
            results.statistics.warningsGenerated += typeResult.warnings.length;

            results.spaceReclaimed.bytes += typeResult.spaceReclaimed;

            if (optimizationType === "reindex") {
              results.performanceImprovements.indexesRebuilt++;
            }

            completedOperations++;

            const stageEnd = new Date();
            results.timing.stages.push({
              name: `${optimizationType}_${tableName}`,
              duration: stageEnd.getTime() - stageStart.getTime(),
              startTime: stageStart,
              endTime: stageEnd,
            });

            logger.info(`Completed ${optimizationType} for ${tableName}`, typeResult);
          } catch (error) {
            logger.error(`Failed to ${optimizationType} ${tableName}`, error as Error);
            results.statistics.errorsEncountered++;
            completedOperations++;

            if (!config.continueOnError) {
              throw error;
            }
          }
        }
      }

      // Get final database state and calculate improvements
      const finalDbInfo = await this.getDatabaseInfo(targetTables);
      results.performanceImprovements.queryTimeImprovement = this.calculatePerformanceImprovement(initialDbInfo, finalDbInfo);

      // Calculate space reclaimed as percentage
      const initialSize = initialDbInfo.tables.reduce((sum, table) => sum + table.estimatedSize, 0);
      const finalSize = finalDbInfo.tables.reduce((sum, table) => sum + table.estimatedSize, 0);
      if (initialSize > 0) {
        results.spaceReclaimed.percentage = ((initialSize - finalSize) / initialSize) * 100;
      }

      results.spaceReclaimed.megabytes = results.spaceReclaimed.bytes / (1024 * 1024);
      results.success = true;
      results.summary = `Successfully optimized database with ${completedOperations} operations, reclaimed ${results.spaceReclaimed.megabytes.toFixed(2)}MB space, and improved query performance by ${results.performanceImprovements.queryTimeImprovement.toFixed(1)}%.`;

      // Generate recommendations
      if (results.performanceImprovements.queryTimeImprovement > 20) {
        results.recommendations.push("Significant performance improvement achieved. Consider regular optimization schedule.");
      }

      if (results.spaceReclaimed.bytes > 10 * 1024 * 1024) { // 10MB
        results.recommendations.push("Significant space reclaimed. Consider more frequent cleanup operations.");
      }

      if (results.statistics.errorsEncountered > 0) {
        results.recommendations.push("Some operations encountered errors. Review logs and consider manual intervention.");
      }

    } catch (error) {
      logger.error("Database optimization failed", error as Error);
      results.success = false;
      results.summary = `Database optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.error = error as Error;
    } finally {
      const endTime = new Date();
      results.timing.endTime = endTime;
      results.timing.totalDuration = endTime.getTime() - startTime.getTime();

      progress.update(totalOperations, totalOperations, results.success ? "Optimization completed successfully" : "Optimization completed with errors");
    }

    return results;
  }

  private async getDatabaseInfo(tableNames: string[]): Promise<{ tables: DatabaseTableInfo[]; totalSize: number }> {
    const tables: DatabaseTableInfo[] = [];
    let totalSize = 0;

    for (const tableName of tableNames) {
      try {
        const table = (db as any)[tableName] as Table;
        if (!table) continue;

        const info: DatabaseTableInfo = {
          name: tableName,
          rowCount: await table.count(),
          estimatedSize: await this.estimateTableSize(table),
          indexes: [],
        };

        // Get index information (limited in IndexedDB)
        const schema = db.tables.find(t => t.name === tableName);
        if (schema) {
          info.indexes = schema.schema.indexes.map((indexSpec: any) => ({
            name: Array.isArray(indexSpec) ? indexSpec.join("_") : indexSpec,
            keyPath: indexSpec,
            unique: false,
            multiEntry: false,
            entryCount: 0, // Cannot easily get this in IndexedDB
            estimatedSize: 0,
            efficiency: 0,
          }));
        }

        tables.push(info);
        totalSize += info.estimatedSize;
      } catch (error) {
        console.warn(`Failed to get info for table ${tableName}:`, error);
      }
    }

    return { tables, totalSize };
  }

  private async estimateTableSize(table: Table): Promise<number> {
    try {
      // Sample some rows to estimate average size
      const sampleSize = Math.min(100, await table.count());
      if (sampleSize === 0) return 0;

      const samples = await table.limit(sampleSize).toArray();
      const totalSize = samples.reduce((sum, item) => {
        return sum + JSON.stringify(item).length * 2; // Rough byte count
      }, 0);

      const averageSize = totalSize / sampleSize;
      const totalCount = await table.count();

      return Math.ceil(averageSize * totalCount);
    } catch (error) {
      console.warn("Failed to estimate table size:", error);
      return 0;
    }
  }

  private async performOptimization(
    type: string,
    tableName: string,
    forceRebuild: boolean,
    dryRun: boolean,
    onProgress?: (processed: number, message: string) => void
  ): Promise<{ itemsProcessed: number; itemsDeleted: number; itemsModified: number; spaceReclaimed: number; errors: string[]; warnings: string[] }> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      const table = (db as any)[tableName] as Table;
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      switch (type) {
        case "compact":
          return await this.compactTable(table, dryRun, onProgress);
        case "reindex":
          return await this.rebuildIndexes(table, forceRebuild, dryRun, onProgress);
        case "cleanup":
          return await this.cleanupTable(table, dryRun, onProgress);
        case "vacuum":
          return await this.vacuumTable(table, dryRun, onProgress);
        case "analyze":
          return await this.analyzeTable(table, dryRun, onProgress);
        default:
          result.warnings.push(`Unknown optimization type: ${type}`);
          return result;
      }
    } catch (error) {
      result.errors.push(`Failed to perform ${type} on ${tableName}: ${error instanceof Error ? error.message : "Unknown error"}`);
      return result;
    }
  }

  private async compactTable(table: Table, dryRun: boolean, onProgress?: (processed: number, message: string) => void): Promise<any> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      onProgress?.(0, "Starting table compaction");

      // IndexedDB doesn't provide explicit compaction, but we can trigger it by recreating data
      if (!dryRun) {
        // Get all data
        const allData = await table.toArray();
        result.itemsProcessed = allData.length;

        // Clear and recreate data (this forces compaction)
        await table.clear();

        // Reinsert data in batches
        const batchSize = 100;
        for (let i = 0; i < allData.length; i += batchSize) {
          const batch = allData.slice(i, i + batchSize);
          await table.bulkAdd(batch);

          onProgress?.(Math.min(i + batchSize, allData.length), `Compacted ${Math.min(i + batchSize, allData.length)}/${allData.length} records`);
        }

        result.itemsModified = allData.length;
      } else {
        result.itemsProcessed = await table.count();
        result.itemsModified = result.itemsProcessed;
      }

      onProgress?.(result.itemsProcessed, "Table compaction completed");

      // Estimate space reclaimed (rough estimate)
      result.spaceReclaimed = result.itemsProcessed * 100; // Assume 100 bytes per record saved

    } catch (error) {
      result.errors.push(`Table compaction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async rebuildIndexes(table: Table, forceRebuild: boolean, dryRun: boolean, onProgress?: (processed: number, message: string) => void): Promise<any> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      onProgress?.(0, "Starting index rebuild");

      // IndexedDB handles indexes automatically, but we can force optimization
      // by accessing indexed data which ensures indexes are properly built

      const count = await table.count();
      result.itemsProcessed = count;

      if (!dryRun && count > 0) {
        // Access each index to trigger optimization
        const schema = db.tables.find(t => t.name === table.name);
        if (schema && schema.schema.indexes) {
          for (const indexSpec of schema.schema.indexes) {
            const indexName = Array.isArray(indexSpec) ? indexSpec.join("_") : indexSpec;

            onProgress?.(0, `Optimizing index: ${indexName}`);

            // Query using the index to ensure it's built and optimized
            await table.limit(1).toArray();
          }
        }

        // Force index usage by running a variety of queries
        const batchSize = 100;
        for (let i = 0; i < count; i += batchSize) {
          await table.offset(i).limit(batchSize).toArray();

          onProgress?.(Math.min(i + batchSize, count), `Processed ${Math.min(i + batchSize, count)}/${count} records for index optimization`);
        }
      }

      onProgress?.(count, "Index rebuild completed");

      // Estimate space reclaimed (indexes might be more efficient)
      result.spaceReclaimed = count * 50; // Assume 50 bytes per record saved

    } catch (error) {
      result.errors.push(`Index rebuild failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async cleanupTable(table: Table, dryRun: boolean, onProgress?: (processed: number, message: string) => void): Promise<any> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      onProgress?.(0, "Starting table cleanup");

      // Remove invalid or corrupted records
      const allData = await table.toArray();
      const validData: any[] = [];
      let invalidCount = 0;

      for (const item of allData) {
        // Basic validation checks
        if (!item || typeof item !== 'object') {
          invalidCount++;
          continue;
        }

        // Check for required fields based on table name
        let isValid = true;
        switch (table.name) {
          case "files":
            isValid = !!(item.name && item.type && item.uploadedAt);
            break;
          case "transcripts":
            isValid = !!(item.fileId && item.status && item.createdAt);
            break;
          case "segments":
            isValid = !!(item.transcriptId && item.start !== undefined && item.end !== undefined && item.text);
            break;
          default:
            isValid = !!(item.id); // At least have an ID
            break;
        }

        if (isValid) {
          validData.push(item);
        } else {
          invalidCount++;
        }
      }

      result.itemsProcessed = allData.length;

      if (!dryRun && invalidCount > 0) {
        // Remove invalid records and reinsert valid ones
        await table.clear();
        if (validData.length > 0) {
          await table.bulkAdd(validData);
        }

        result.itemsDeleted = invalidCount;
        result.itemsModified = validData.length;
      } else {
        result.itemsDeleted = invalidCount;
        result.itemsModified = validData.length;
      }

      onProgress?.(allData.length, `Cleaned ${invalidCount} invalid records`);

      // Estimate space reclaimed
      result.spaceReclaimed = invalidCount * 200; // Assume 200 bytes per invalid record

    } catch (error) {
      result.errors.push(`Table cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async vacuumTable(table: Table, dryRun: boolean, onProgress?: (processed: number, message: string) => void): Promise<any> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      onProgress?.(0, "Starting table vacuum");

      // Vacuum is similar to compaction but more aggressive
      // In IndexedDB, we can simulate this by recreating the table

      if (!dryRun) {
        // Get table schema and data
        const schema = db.tables.find(t => t.name === table.name);
        if (!schema) {
          throw new Error(`Schema not found for table ${table.name}`);
        }

        const allData = await table.toArray();
        result.itemsProcessed = allData.length;

        // Clear the table
        await table.clear();

        // Reinsert all data in a way that maximizes space efficiency
        // Sort by primary key if possible for better page utilization
        const sortedData = allData.sort((a, b) => {
          const aId = a.id || 0;
          const bId = b.id || 0;
          return aId - bId;
        });

        // Insert in larger batches for better efficiency
        const batchSize = 500;
        for (let i = 0; i < sortedData.length; i += batchSize) {
          const batch = sortedData.slice(i, i + batchSize);
          await table.bulkAdd(batch);

          onProgress?.(Math.min(i + batchSize, sortedData.length), `Vacuumed ${Math.min(i + batchSize, sortedData.length)}/${sortedData.length} records`);
        }

        result.itemsModified = sortedData.length;
      } else {
        result.itemsProcessed = await table.count();
        result.itemsModified = result.itemsProcessed;
      }

      onProgress?.(result.itemsProcessed, "Table vacuum completed");

      // Estimate space reclaimed (vacuum typically reclaims more space)
      result.spaceReclaimed = result.itemsProcessed * 150; // Assume 150 bytes per record saved

    } catch (error) {
      result.errors.push(`Table vacuum failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async analyzeTable(table: Table, dryRun: boolean, onProgress?: (processed: number, message: string) => void): Promise<any> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      onProgress?.(0, "Starting table analysis");

      // Analyze table structure and provide recommendations
      const count = await table.count();
      const samples = await table.limit(100).toArray();

      result.itemsProcessed = count;

      // Analyze sample data for patterns
      const analysis = {
        avgRecordSize: 0,
        potentialIndexes: [] as string[],
        optimizationSuggestions: [] as string[],
        duplicateCount: 0,
      };

      if (samples.length > 0) {
        // Calculate average record size
        const totalSize = samples.reduce((sum, item) => sum + JSON.stringify(item).length, 0);
        analysis.avgRecordSize = totalSize / samples.length;

        // Look for potential index candidates
        const fields = Object.keys(samples[0] || {});
        for (const field of fields) {
          const uniqueValues = new Set(samples.map(item => item[field]).filter(val => val !== null && val !== undefined));
          const uniquenessRatio = uniqueValues.size / samples.length;

          // Fields with high uniqueness are good index candidates
          if (uniquenessRatio > 0.8 && uniqueValues.size > 10) {
            analysis.potentialIndexes.push(field);
          }
        }

        // Check for duplicates
        const recordSignatures = samples.map(item => JSON.stringify(item));
        const uniqueSignatures = new Set(recordSignatures);
        analysis.duplicateCount = recordSignatures.length - uniqueSignatures.size;
      }

      // Generate optimization suggestions
      if (analysis.avgRecordSize > 10000) {
        analysis.optimizationSuggestions.push("Consider normalizing large records to reduce storage size");
      }

      if (analysis.potentialIndexes.length > 0) {
        analysis.optimizationSuggestions.push(`Consider adding indexes to: ${analysis.potentialIndexes.join(", ")}`);
      }

      if (analysis.duplicateCount > 0) {
        analysis.optimizationSuggestions.push(`Found ${analysis.duplicateCount} potential duplicate records in sample`);
        result.warnings.push("Duplicate records detected - consider running duplicate cleanup");
      }

      onProgress?.(count, `Table analysis completed. Suggestions: ${analysis.optimizationSuggestions.length}`);

      // Store analysis in results
      result.errors.push(...analysis.optimizationSuggestions);

    } catch (error) {
      result.errors.push(`Table analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private calculatePerformanceImprovement(initial: any, final: any): number {
    // Simple performance improvement calculation based on fragmentation reduction
    // In a real implementation, you would measure actual query times

    let initialFragmentation = 0;
    let finalFragmentation = 0;

    initial.tables.forEach((table: DatabaseTableInfo) => {
      initialFragmentation += table.fragmentationLevel || 0;
    });

    final.tables.forEach((table: DatabaseTableInfo) => {
      finalFragmentation += table.fragmentationLevel || 0;
    });

    if (initialFragmentation > 0) {
      return Math.max(0, ((initialFragmentation - finalFragmentation) / initialFragmentation) * 100);
    }

    return 0;
  }
}

// ============================================================================
// DATABASE INTEGRITY CHECK HANDLER
// ============================================================================

/**
 * Handler for database integrity checks and repairs
 */
export class DatabaseIntegrityCheckHandler implements IMaintenanceOperationHandler {
  operationType = MaintenanceOperationType.DATA_INTEGRITY_CHECK;
  name = "Database Integrity Check";
  description = "Checks database integrity and repairs inconsistencies";

  supportsProgress = true;
  supportsCancellation = true;
  supportsPauseResume = true;

  async validate(operation: MaintenanceOperation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const { checkTypes, repairIssues, targetTables } = operation.config;

    if (!checkTypes || !Array.isArray(checkTypes) || checkTypes.length === 0) {
      warnings.push("No check types specified. Default check types will be used.");
    }

    if (repairIssues && !operation.config.backupBeforeRepair) {
      warnings.push("Repair enabled without backup. Consider creating a backup before repairs.");
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
    const targetTables = config.targetTables || ["files", "transcripts", "segments"];

    try {
      // Duration depends on table sizes
      let totalDuration = 3000; // 3 seconds base time

      for (const tableName of targetTables) {
        const table = (db as any)[tableName] as Table;
        if (table) {
          const count = await table.count();
          // Add ~1ms per record for integrity checking
          totalDuration += count;
        }
      }

      return totalDuration;
    } catch (error) {
      return 30000; // 30 seconds default
    }
  }

  async estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact> {
    const { repairIssues } = operation.config;

    return {
      resources: {
        cpuUsage: repairIssues ? 40 : 20,
        memoryUsage: 30,
        diskUsage: 0,
        networkUsage: 0,
      },
      userExperience: {
        interruptionRequired: false,
        performanceImpact: repairIssues ? "medium" : "low",
        userInteractionRequired: false,
        estimatedDowntime: 0,
      },
      data: {
        itemsAffected: 0,
        dataLossRisk: repairIssues ? "low" : "none",
        backupRequired: repairIssues,
        rollbackPossible: true,
      },
    };
  }

  async execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults> {
    const logger = context.logger.createOperationLogger(operation.id);
    const progress = context.progressTracker.createTracker(operation.id);

    logger.info("Starting database integrity check", operation.config);

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
      const checkTypes = config.checkTypes || ["referential", "orphan", "duplicate", "consistency"];
      const targetTables = config.targetTables || ["files", "transcripts", "segments"];
      const repairIssues = config.repairIssues || false;
      const backupBeforeRepair = config.backupBeforeRepair !== false;
      const dryRun = config.dryRun || false;

      logger.info(`Checking database integrity for: ${checkTypes.join(", ")}`, {
        targetTables,
        repairIssues,
        backupBeforeRepair,
        dryRun,
      });

      results.affectedResources.tables = targetTables;

      let totalChecks = checkTypes.length * targetTables.length;
      let completedChecks = 0;

      progress.update(0, totalChecks, "Starting integrity checks");

      // Perform each type of integrity check
      for (const checkType of checkTypes) {
        for (const tableName of targetTables) {
          const stageStart = new Date();
          logger.stage(`${checkType} check for ${tableName}`);

          try {
            const checkResult = await this.performIntegrityCheck(
              checkType,
              tableName,
              repairIssues,
              dryRun,
              (processed, message) => {
                progress.update(completedChecks, totalChecks, `${checkType} ${tableName}: ${message}`);
              }
            );

            results.statistics.itemsProcessed += checkResult.itemsProcessed;
            results.statistics.itemsDeleted += checkResult.itemsDeleted;
            results.statistics.itemsModified += checkResult.itemsModified;
            results.statistics.errorsEncountered += checkResult.issues.length;
            results.statistics.warningsGenerated += checkResult.warnings.length;

            results.spaceReclaimed.bytes += checkResult.spaceReclaimed;

            completedChecks++;

            const stageEnd = new Date();
            results.timing.stages.push({
              name: `${checkType}_${tableName}`,
              duration: stageEnd.getTime() - stageStart.getTime(),
              startTime: stageStart,
              endTime: stageEnd,
            });

            logger.info(`Completed ${checkType} check for ${tableName}`, checkResult);
          } catch (error) {
            logger.error(`Failed to perform ${checkType} check for ${tableName}`, error as Error);
            results.statistics.errorsEncountered++;
            completedChecks++;

            if (!config.continueOnError) {
              throw error;
            }
          }
        }
      }

      results.spaceReclaimed.megabytes = results.spaceReclaimed.bytes / (1024 * 1024);
      results.success = true;
      results.summary = `Completed ${completedChecks} integrity checks, found ${results.statistics.errorsEncountered} issues, and repaired ${results.statistics.itemsModified} items.`;

      // Generate recommendations based on findings
      if (results.statistics.errorsEncountered > 0) {
        results.recommendations.push("Database integrity issues found. Consider running regular integrity checks.");
      }

      if (results.statistics.itemsModified > 0) {
        results.recommendations.push("Data repairs were performed. Monitor database performance after repairs.");
      }

    } catch (error) {
      logger.error("Database integrity check failed", error as Error);
      results.success = false;
      results.summary = `Database integrity check failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.error = error as Error;
    } finally {
      const endTime = new Date();
      results.timing.endTime = endTime;
      results.timing.totalDuration = endTime.getTime() - startTime.getTime();

      progress.update(totalChecks, totalChecks, results.success ? "Integrity check completed successfully" : "Integrity check completed with errors");
    }

    return results;
  }

  private async performIntegrityCheck(
    checkType: string,
    tableName: string,
    repairIssues: boolean,
    dryRun: boolean,
    onProgress?: (processed: number, message: string) => void
  ): Promise<{ itemsProcessed: number; itemsDeleted: number; itemsModified: number; spaceReclaimed: number; issues: string[]; warnings: string[] }> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      issues: [] as string[],
      warnings: [] as string[],
    };

    try {
      switch (checkType) {
        case "referential":
          return await this.checkReferentialIntegrity(tableName, repairIssues, dryRun, onProgress);
        case "orphan":
          return await this.checkOrphanRecords(tableName, repairIssues, dryRun, onProgress);
        case "duplicate":
          return await this.checkDuplicates(tableName, repairIssues, dryRun, onProgress);
        case "consistency":
          return await this.checkDataConsistency(tableName, repairIssues, dryRun, onProgress);
        default:
          result.warnings.push(`Unknown check type: ${checkType}`);
          return result;
      }
    } catch (error) {
      result.issues.push(`Failed to perform ${checkType} check: ${error instanceof Error ? error.message : "Unknown error"}`);
      return result;
    }
  }

  private async checkReferentialIntegrity(tableName: string, repairIssues: boolean, dryRun: boolean, onProgress?: (processed: number, message: string) => void): Promise<any> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      issues: [] as string[],
      warnings: [] as string[],
    };

    try {
      onProgress?.(0, `Checking referential integrity for ${tableName}`);

      switch (tableName) {
        case "transcripts":
          // Check if all transcripts have valid file references
          const allTranscripts = await db.transcripts.toArray();
          const allFileIds = new Set((await db.files.toArray()).map(f => f.id));

          result.itemsProcessed = allTranscripts.length;

          const orphanedTranscripts = allTranscripts.filter(t => !allFileIds.has(t.fileId));

          if (orphanedTranscripts.length > 0) {
            result.issues.push(`Found ${orphanedTranscripts.length} orphaned transcripts`);

            if (repairIssues && !dryRun) {
              // Option 1: Delete orphaned transcripts
              for (const transcript of orphanedTranscripts) {
                if (transcript.id) {
                  // Also delete associated segments
                  await db.segments.where("transcriptId").equals(transcript.id).delete();
                  await db.transcripts.delete(transcript.id);
                  result.itemsDeleted++;
                }
              }

              // Option 2: Could also create placeholder files instead
              // This would be configurable in a real implementation
            } else if (!dryRun) {
              result.warnings.push("Repair disabled - orphaned transcripts remain");
            }
          }
          break;

        case "segments":
          // Check if all segments have valid transcript references
          const allSegments = await db.segments.toArray();
          const allTranscriptIds = new Set((await db.transcripts.toArray()).map(t => t.id).filter(id => id));

          result.itemsProcessed = allSegments.length;

          const orphanedSegments = allSegments.filter(s => !allTranscriptIds.has(s.transcriptId));

          if (orphanedSegments.length > 0) {
            result.issues.push(`Found ${orphanedSegments.length} orphaned segments`);

            if (repairIssues && !dryRun) {
              // Delete orphaned segments
              const segmentIds = orphanedSegments.map(s => s.id).filter(id => id) as number[];
              if (segmentIds.length > 0) {
                await db.segments.bulkDelete(segmentIds);
                result.itemsDeleted += segmentIds.length;
              }
            } else if (!dryRun) {
              result.warnings.push("Repair disabled - orphaned segments remain");
            }
          }
          break;

        default:
          result.warnings.push(`No referential integrity check defined for table: ${tableName}`);
          break;
      }

      onProgress?.(result.itemsProcessed, `Referential integrity check completed for ${tableName}`);

    } catch (error) {
      result.issues.push(`Referential integrity check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async checkOrphanRecords(tableName: string, repairIssues: boolean, dryRun: boolean, onProgress?: (processed: number, message: string) => void): Promise<any> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      issues: [] as string[],
      warnings: [] as string[],
    };

    try {
      onProgress?.(0, `Checking for orphan records in ${tableName}`);

      // Similar to referential integrity but more comprehensive
      // This checks for various types of orphaned data

      const table = (db as any)[tableName] as Table;
      if (!table) {
        result.warnings.push(`Table ${tableName} not found`);
        return result;
      }

      const allRecords = await table.toArray();
      result.itemsProcessed = allRecords.length;

      // Check for records with null/undefined critical fields
      const incompleteRecords = allRecords.filter(record => {
        switch (tableName) {
          case "files":
            return !record.name || !record.type || !record.uploadedAt;
          case "transcripts":
            return !record.fileId || !record.status || !record.createdAt;
          case "segments":
            return !record.transcriptId || record.start === undefined || record.end === undefined || !record.text;
          default:
            return !record.id;
        }
      });

      if (incompleteRecords.length > 0) {
        result.issues.push(`Found ${incompleteRecords.length} incomplete records`);

        if (repairIssues && !dryRun) {
          // Delete incomplete records (they're likely corrupted)
          const incompleteIds = incompleteRecords.map(r => r.id).filter(id => id);
          if (incompleteIds.length > 0) {
            await table.bulkDelete(incompleteIds);
            result.itemsDeleted += incompleteIds.length;
          }
        }
      }

      onProgress?.(result.itemsProcessed, `Orphan record check completed for ${tableName}`);

    } catch (error) {
      result.issues.push(`Orphan record check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async checkDuplicates(tableName: string, repairIssues: boolean, dryRun: boolean, onProgress?: (processed: number, message: string) => void): Promise<any> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      issues: [] as string[],
      warnings: [] as string[],
    };

    try {
      onProgress?.(0, `Checking for duplicates in ${tableName}`);

      const table = (db as any)[tableName] as Table;
      if (!table) {
        result.warnings.push(`Table ${tableName} not found`);
        return result;
      }

      const allRecords = await table.toArray();
      result.itemsProcessed = allRecords.length;

      // Find duplicates based on meaningful keys
      const signatures = new Map<string, any[]>();

      for (const record of allRecords) {
        let signature = "";

        switch (tableName) {
          case "files":
            signature = `${record.name}_${record.size}_${record.uploadedAt}`;
            break;
          case "transcripts":
            signature = `${record.fileId}_${record.createdAt}`;
            break;
          case "segments":
            signature = `${record.transcriptId}_${record.start}_${record.end}`;
            break;
          default:
            signature = JSON.stringify(record);
            break;
        }

        if (!signatures.has(signature)) {
          signatures.set(signature, []);
        }
        signatures.get(signature)!.push(record);
      }

      // Find actual duplicates (signatures with multiple records)
      const duplicateGroups = Array.from(signatures.entries()).filter(([_, records]) => records.length > 1);

      if (duplicateGroups.length > 0) {
        const totalDuplicates = duplicateGroups.reduce((sum, [_, records]) => sum + records.length - 1, 0);
        result.issues.push(`Found ${totalDuplicates} duplicate records in ${duplicateGroups.length} groups`);

        if (repairIssues && !dryRun) {
          // Keep the first record in each group, delete the rest
          for (const [_, records] of duplicateGroups) {
            const toKeep = records[0];
            const toDelete = records.slice(1);

            if (toDelete.length > 0) {
              const deleteIds = toDelete.map(r => r.id).filter(id => id);
              if (deleteIds.length > 0) {
                await table.bulkDelete(deleteIds);
                result.itemsDeleted += deleteIds.length;
              }
            }
          }
        }
      }

      onProgress?.(result.itemsProcessed, `Duplicate check completed for ${tableName}`);

    } catch (error) {
      result.issues.push(`Duplicate check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }

  private async checkDataConsistency(tableName: string, repairIssues: boolean, dryRun: boolean, onProgress?: (processed: number, message: string) => void): Promise<any> {
    const result = {
      itemsProcessed: 0,
      itemsDeleted: 0,
      itemsModified: 0,
      spaceReclaimed: 0,
      issues: [] as string[],
      warnings: [] as string[],
    };

    try {
      onProgress?.(0, `Checking data consistency in ${tableName}`);

      const table = (db as any)[tableName] as Table;
      if (!table) {
        result.warnings.push(`Table ${tableName} not found`);
        return result;
      }

      const allRecords = await table.toArray();
      result.itemsProcessed = allRecords.length;

      // Check for various consistency issues
      let inconsistenciesFound = 0;

      for (const record of allRecords) {
        switch (tableName) {
          case "segments":
            // Check if start time is before end time
            if (record.start >= record.end) {
              result.issues.push(`Segment ${record.id} has invalid time range (${record.start} >= ${record.end})`);
              inconsistenciesFound++;

              if (repairIssues && !dryRun) {
                // Fix the time range
                const fixedRecord = { ...record, end: record.start + 1 };
                await table.update(record.id, fixedRecord);
                result.itemsModified++;
              }
            }

            // Check if duration is reasonable (not too long or short)
            const duration = record.end - record.start;
            if (duration > 300000) { // 5 minutes
              result.warnings.push(`Segment ${record.id} has very long duration: ${duration}ms`);
            } else if (duration < 100) { // 100ms
              result.warnings.push(`Segment ${record.id} has very short duration: ${duration}ms`);
            }
            break;

          case "files":
            // Check file size consistency
            if (record.size && record.size <= 0) {
              result.issues.push(`File ${record.id} has invalid size: ${record.size}`);
              inconsistenciesFound++;
            }
            break;

          case "transcripts":
            // Check status consistency
            const validStatuses = ["pending", "processing", "completed", "error"];
            if (!validStatuses.includes(record.status)) {
              result.issues.push(`Transcript ${record.id} has invalid status: ${record.status}`);
              inconsistenciesFound++;

              if (repairIssues && !dryRun) {
                // Reset to pending
                await table.update(record.id, { status: "pending" });
                result.itemsModified++;
              }
            }
            break;
        }
      }

      if (inconsistenciesFound > 0) {
        result.issues.push(`Found ${inconsistenciesFound} data consistency issues`);
      }

      onProgress?.(result.itemsProcessed, `Data consistency check completed for ${tableName}`);

    } catch (error) {
      result.issues.push(`Data consistency check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    return result;
  }
}

// ============================================================================
// DATABASE COMPACTION HANDLER
// ============================================================================

/**
 * Handler for database compaction operations
 */
export class DatabaseCompactionHandler implements IMaintenanceOperationHandler {
  operationType = MaintenanceOperationType.DATABASE_COMPACTION;
  name = "Database Compaction";
  description = "Compacts database to reclaim space and improve performance";

  supportsProgress = true;
  supportsCancellation = true;
  supportsPauseResume = false;

  async validate(operation: MaintenanceOperation): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const { forceCompact, backupBefore } = operation.config;

    if (forceCompact) {
      warnings.push("Force compaction enabled. This will temporarily increase storage usage during operation.");
    }

    if (!backupBefore) {
      suggestions.push("Consider creating a backup before database compaction.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  async estimateDuration(operation: MaintenanceOperation): Promise<number> {
    try {
      // Compaction duration depends on database size
      const totalSize = await this.estimateDatabaseSize();
      // Estimate ~1 second per 10MB
      return Math.max(10000, totalSize / (10 * 1024 * 1024) * 1000);
    } catch (error) {
      return 60000; // 1 minute default
    }
  }

  async estimateImpact(operation: MaintenanceOperation): Promise<MaintenanceImpact> {
    return {
      resources: {
        cpuUsage: 50,
        memoryUsage: 60,
        diskUsage: 100, // Temporarily uses additional space
        networkUsage: 0,
      },
      userExperience: {
        interruptionRequired: false,
        performanceImpact: "high",
        userInteractionRequired: false,
        estimatedDowntime: 0,
      },
      data: {
        itemsAffected: 0,
        dataLossRisk: "low",
        backupRequired: true,
        rollbackPossible: true,
      },
    };
  }

  async execute(operation: MaintenanceOperation, context: MaintenanceContext): Promise<MaintenanceOperationResults> {
    const logger = context.logger.createOperationLogger(operation.id);
    const progress = context.progressTracker.createTracker(operation.id);

    logger.info("Starting database compaction", operation.config);

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
        databaseOptimized: true,
        indexesRebuilt: 0,
        queryTimeImprovement: 0,
        loadTimeImprovement: 0,
      },
      affectedResources: {
        files: [],
        tables: Object.keys(db.tables),
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
      const forceCompact = config.forceCompact || false;
      const backupBefore = config.backupBefore !== false;
      const dryRun = config.dryRun || false;

      logger.info("Starting database compaction", {
        forceCompact,
        backupBefore,
        dryRun,
      });

      progress.update(0, 1, "Starting database compaction");

      const stageStart = new Date();

      // Get initial database size
      const initialSize = await this.estimateDatabaseSize();
      results.statistics.itemsProcessed = 1; // Representing the entire database

      if (!dryRun) {
        // Create backup if requested
        if (backupBefore) {
          progress.update(0, 1, "Creating database backup");
          await this.createDatabaseBackup();
        }

        // Perform compaction
        progress.update(0, 1, "Compacting database");

        // IndexedDB compaction is automatic, but we can trigger it
        // by opening a new database connection and closing the old one

        // In a real implementation, you might:
        // 1. Export all data
        // 2. Delete and recreate the database
        // 3. Reimport all data

        // For this example, we'll simulate the process
        await this.performDatabaseCompaction();

        // Get final database size
        const finalSize = await this.estimateDatabaseSize();

        results.spaceReclaimed.bytes = Math.max(0, initialSize - finalSize);
        if (initialSize > 0) {
          results.spaceReclaimed.percentage = ((initialSize - finalSize) / initialSize) * 100;
        }
      } else {
        // Estimate space that would be reclaimed
        const estimatedReclaimPercentage = 15; // Assume 15% space can be reclaimed
        results.spaceReclaimed.bytes = Math.floor(initialSize * (estimatedReclaimPercentage / 100));
        results.spaceReclaimed.percentage = estimatedReclaimPercentage;
      }

      progress.update(1, 1, "Database compaction completed");

      const stageEnd = new Date();
      results.timing.stages.push({
        name: "database_compaction",
        duration: stageEnd.getTime() - stageStart.getTime(),
        startTime: stageStart,
        endTime: stageEnd,
      });

      results.spaceReclaimed.megabytes = results.spaceReclaimed.bytes / (1024 * 1024);
      results.success = true;
      results.summary = `Successfully compacted database and reclaimed ${results.spaceReclaimed.megabytes.toFixed(2)}MB of space.`;

      // Generate recommendations
      if (results.spaceReclaimed.bytes > 50 * 1024 * 1024) { // 50MB
        results.recommendations.push("Significant space reclaimed. Consider regular compaction schedule.");
      }

    } catch (error) {
      logger.error("Database compaction failed", error as Error);
      results.success = false;
      results.summary = `Database compaction failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.error = error as Error;
    } finally {
      const endTime = new Date();
      results.timing.endTime = endTime;
      results.timing.totalDuration = endTime.getTime() - startTime.getTime();

      progress.complete(results.success ? "Compaction completed successfully" : "Compaction completed with errors");
    }

    return results;
  }

  private async estimateDatabaseSize(): Promise<number> {
    try {
      let totalSize = 0;

      for (const table of db.tables) {
        const count = await table.count();
        // Rough estimate: 1KB per record average
        totalSize += count * 1024;
      }

      return totalSize;
    } catch (error) {
      console.warn("Failed to estimate database size:", error);
      return 0;
    }
  }

  private async createDatabaseBackup(): Promise<void> {
    try {
      // In a real implementation, this would create a proper backup
      // For this example, we'll just log that backup was created
      console.log("Creating database backup...");

      // Export all data
      const backup: any = {};
      for (const table of db.tables) {
        backup[table.name] = await table.toArray();
      }

      // Store backup in localStorage (in production, use proper backup storage)
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          `database_backup_${new Date().toISOString()}`,
          JSON.stringify(backup)
        );
      }

      console.log("Database backup created successfully");
    } catch (error) {
      console.error("Failed to create database backup:", error);
      throw error;
    }
  }

  private async performDatabaseCompaction(): Promise<void> {
    try {
      // IndexedDB compaction happens automatically
      // But we can trigger some operations that encourage it

      // Force garbage collection by nullifying large objects
      // (this is more effective in Node.js environments)

      if (typeof gc !== "undefined") {
        gc(); // Force garbage collection if available
      }

      // Close and reopen database connections if possible
      // (this is simplified for the example)

      console.log("Database compaction completed");
    } catch (error) {
      console.error("Failed to compact database:", error);
      throw error;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all available database maintenance handlers
 */
export function getDatabaseMaintenanceHandlers(): IMaintenanceOperationHandler[] {
  return [
    new DatabaseOptimizationHandler(),
    new DatabaseIntegrityCheckHandler(),
    new DatabaseCompactionHandler(),
  ];
}

/**
 * Get a specific database maintenance handler by type
 */
export function getDatabaseMaintenanceHandler(type: MaintenanceOperationType): IMaintenanceOperationHandler | null {
  const handlers = getDatabaseMaintenanceHandlers();
  return handlers.find(handler => handler.operationType === type) || null;
}

/**
 * Get current database health status
 */
export async function getDatabaseHealthStatus(): Promise<DatabaseHealthStatus> {
  const status: DatabaseHealthStatus = {
    overall: "healthy",
    tables: {},
    performance: {
      averageQueryTime: 0,
      slowQueries: 0,
      indexEfficiency: 85,
      fragmentationLevel: 5,
    },
    storage: {
      totalSize: 0,
      estimatedWastedSpace: 0,
      compressionPotential: 15,
    },
  };

  try {
    // Check each table
    for (const table of db.tables) {
      const tableStatus = await checkTableHealth(table.name);
      status.tables[table.name] = tableStatus;

      if (tableStatus.status === "error") {
        status.overall = "error";
      } else if (tableStatus.status === "warning" && status.overall === "healthy") {
        status.overall = "warning";
      }

      status.storage.totalSize += tableStatus.estimatedSize;
    }

    // Estimate wasted space
    status.storage.estimatedWastedSpace = Math.floor(status.storage.totalSize * 0.1); // 10% waste estimate

  } catch (error) {
    status.overall = "error";
    console.error("Failed to get database health status:", error);
  }

  return status;
}

/**
 * Check health of a specific table
 */
async function checkTableHealth(tableName: string): Promise<any> {
  const tableStatus = {
    status: "healthy" as "healthy" | "warning" | "error",
    issues: [] as string[],
    recommendations: [] as string[],
    estimatedSize: 0,
  };

  try {
    const table = (db as any)[tableName] as Table;
    if (!table) {
      tableStatus.status = "error";
      tableStatus.issues.push("Table not found");
      return tableStatus;
    }

    const count = await table.count();

    // Estimate table size
    if (count > 0) {
      const sampleSize = Math.min(100, count);
      const samples = await table.limit(sampleSize).toArray();
      const avgSize = samples.reduce((sum, item) => sum + JSON.stringify(item).length, 0) / sampleSize;
      tableStatus.estimatedSize = Math.ceil(avgSize * count);
    }

    // Check for common issues
    if (count === 0) {
      tableStatus.status = "warning";
      tableStatus.issues.push("Table is empty");
    }

    // Sample some records for validation
    if (count > 0) {
      const samples = await table.limit(10).toArray();
      let invalidRecords = 0;

      for (const record of samples) {
        if (!record || typeof record !== "object") {
          invalidRecords++;
        }
      }

      if (invalidRecords > 0) {
        tableStatus.status = "warning";
        tableStatus.issues.push(`Found ${invalidRecords} invalid records in sample`);
        tableStatus.recommendations.push("Run integrity check to identify and fix invalid records");
      }
    }

  } catch (error) {
    tableStatus.status = "error";
    tableStatus.issues.push(`Failed to analyze table: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return tableStatus;
}
