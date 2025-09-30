import { handleError, handleSilently } from "@/lib/error-handler";
import type { WordTimestamp } from "@/types/database";
import { DbUtils, db } from "./db";

/**
 * Migrate all segments to include word timestamps structure
 * This can be used for batch processing or manual migration triggering
 */
export async function migrateWordTimestamps(
  batchSize: number = 100,
  progressCallback?: (processed: number, total: number) => void,
): Promise<{ processed: number; updated: number; errors: number }> {
  try {
    const totalSegments = await db.segments.count();

    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Process in batches to avoid memory issues
    while (processed < totalSegments) {
      const segments = await db.segments.offset(processed).limit(batchSize).toArray();

      if (segments.length === 0) break;

      const updatePromises = segments.map(async (segment) => {
        try {
          // Only update segments that don't have wordTimestamps
          if (segment.wordTimestamps === undefined) {
            await db.segments.update(segment.id, {
              wordTimestamps: [],
            });
            updated++;
          }
        } catch (error) {
          handleSilently(error, `migrateWordTimestamps-segment-${segment.id}`);
          errors++;
        }
      });

      await Promise.all(updatePromises);
      processed += segments.length;

      if (progressCallback) {
        progressCallback(processed, totalSegments);
      }

      // Small delay to prevent UI blocking
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return { processed, updated, errors };
  } catch (error) {
    const appError = handleError(error, "migrateWordTimestamps");
    throw appError;
  }
}

/**
 * Generate mock word timestamps for existing segments based on text content
 * This is useful for testing and demonstration purposes
 */
export async function generateMockWordTimestamps(
  transcriptId: number,
  progressCallback?: (processed: number, total: number) => void,
): Promise<{ processed: number; generated: number; errors: number }> {
  try {
    const segments = await db.segments.where("transcriptId").equals(transcriptId).toArray();

    let processed = 0;
    let generated = 0;
    let errors = 0;

    for (const segment of segments) {
      try {
        // Only generate if no word timestamps exist
        if (!segment.wordTimestamps || segment.wordTimestamps.length === 0) {
          const wordTimestamps = createMockWordTimestamps(segment.text, segment.start, segment.end);

          await db.segments.update(segment.id, {
            wordTimestamps,
            updatedAt: new Date(),
          });

          generated++;
        }
      } catch (error) {
        handleSilently(error, `generateMockWordTimestamps-segment-${segment.id}`);
        errors++;
      }

      processed++;

      if (progressCallback) {
        progressCallback(processed, segments.length);
      }

      // Small delay to prevent UI blocking
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return { processed, generated, errors };
  } catch (error) {
    throw new Error(
      `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Create mock word timestamps for demonstration purposes
 */
function createMockWordTimestamps(
  text: string,
  segmentStart: number,
  segmentEnd: number,
): WordTimestamp[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [];

  const segmentDuration = segmentEnd - segmentStart;
  const wordDuration = segmentDuration / words.length;

  return words.map((word, index) => {
    const start = segmentStart + index * wordDuration;
    const end = start + wordDuration;

    return {
      word: word.replace(/[^\w\s]/g, ""), // Remove punctuation
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3)),
      confidence: 0.8 + Math.random() * 0.2, // Random confidence between 0.8-1.0
    };
  });
}

/**
 * Validate database integrity after migrations
 */
export async function validateDatabaseIntegrity(): Promise<{
  valid: boolean;
  issues: string[];
  stats: {
    totalSegments: number;
    segmentsWithWordTimestamps: number;
    segmentsWithoutWordTimestamps: number;
  };
}> {
  try {
    const issues: string[] = [];
    const allSegments = await db.segments.toArray();

    // Check for segments without wordTimestamps field
    const segmentsWithoutWordTimestamps = allSegments.filter(
      (segment) => segment.wordTimestamps === undefined,
    );

    if (segmentsWithoutWordTimestamps.length > 0) {
      issues.push(
        `${segmentsWithoutWordTimestamps.length} segments are missing wordTimestamps field`,
      );
    }

    // Check for invalid word timestamp data
    const invalidWordTimestamps = allSegments.filter(
      (segment) => segment.wordTimestamps && !Array.isArray(segment.wordTimestamps),
    );

    if (invalidWordTimestamps.length > 0) {
      issues.push(`${invalidWordTimestamps.length} segments have invalid wordTimestamps format`);
    }

    const stats = {
      totalSegments: allSegments.length,
      segmentsWithWordTimestamps: allSegments.filter(
        (segment) => segment.wordTimestamps && Array.isArray(segment.wordTimestamps),
      ).length,
      segmentsWithoutWordTimestamps: segmentsWithoutWordTimestamps.length,
    };

    const valid = issues.length === 0;

    if (!valid) {
      // 数据库完整性检查失败，这里可以添加日志记录或通知用户
      // 目前暂时不处理，让调用者决定如何处理这些问题
    }

    return { valid, issues, stats };
  } catch (error) {
    throw new Error(
      `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Repair database issues found during validation
 */
export async function repairDatabaseIssues(): Promise<{
  repaired: number;
  errors: number;
}> {
  try {
    const { issues } = await validateDatabaseIntegrity();
    if (issues.length === 0) {
      return { repaired: 0, errors: 0 };
    }

    let repaired = 0;
    let errors = 0;

    // Repair segments missing wordTimestamps
    const allSegments = await db.segments.toArray();
    const segmentsToRepair = allSegments.filter(
      (segment) => segment.wordTimestamps === undefined || !Array.isArray(segment.wordTimestamps),
    );

    for (const segment of segmentsToRepair) {
      try {
        await db.segments.update(segment.id, {
          wordTimestamps: [],
          updatedAt: new Date(),
        });
        repaired++;
      } catch (_error) {
        errors++;
      }
    }

    return { repaired, errors };
  } catch (error) {
    throw new Error(`Repair failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Export migration logs and statistics
 */
export async function exportMigrationReport(): Promise<{
  timestamp: Date;
  databaseVersion: number;
  stats: {
    version: number;
    fileCount: number;
    transcriptCount: number;
    segmentCount: number;
    segmentsWithWordTimestamps: number;
  };
  integrity: {
    valid: boolean;
    issues: string[];
    stats: {
      totalSegments: number;
      segmentsWithWordTimestamps: number;
      segmentsWithoutWordTimestamps: number;
    };
  };
  backupAvailable: boolean;
}> {
  try {
    const [stats, integrity] = await Promise.all([
      DbUtils.getDatabaseStats(),
      validateDatabaseIntegrity(),
    ]);

    const backupTimestamp = localStorage.getItem("db_backup_timestamp");

    const dbVersion = await db.version;
    return {
      timestamp: new Date(),
      databaseVersion: typeof dbVersion === "number" ? dbVersion : 1,
      stats,
      integrity,
      backupAvailable: !!backupTimestamp,
    };
  } catch (error) {
    throw new Error(
      `Report export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Backward compatibility class that wraps the functional interface
 * @deprecated Use the exported functions directly instead
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Backward compatibility for existing code
export class MigrationUtils {
  static async migrateWordTimestamps(
    batchSize?: number,
    progressCallback?: (processed: number, total: number) => void,
  ): Promise<{ processed: number; updated: number; errors: number }> {
    return migrateWordTimestamps(batchSize, progressCallback);
  }

  static async generateMockWordTimestamps(
    transcriptId: number,
    progressCallback?: (processed: number, total: number) => void,
  ): Promise<{ processed: number; generated: number; errors: number }> {
    return generateMockWordTimestamps(transcriptId, progressCallback);
  }

  static async validateDatabaseIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
    stats: {
      totalSegments: number;
      segmentsWithWordTimestamps: number;
      segmentsWithoutWordTimestamps: number;
    };
  }> {
    return validateDatabaseIntegrity();
  }

  static async repairDatabaseIssues(): Promise<{
    repaired: number;
    errors: number;
  }> {
    return repairDatabaseIssues();
  }

  static async exportMigrationReport(): Promise<{
    timestamp: Date;
    databaseVersion: number;
    stats: {
      version: number;
      fileCount: number;
      transcriptCount: number;
      segmentCount: number;
      segmentsWithWordTimestamps: number;
    };
    integrity: {
      valid: boolean;
      issues: string[];
      stats: {
        totalSegments: number;
        segmentsWithWordTimestamps: number;
        segmentsWithoutWordTimestamps: number;
      };
    };
    backupAvailable: boolean;
  }> {
    return exportMigrationReport();
  }
}
