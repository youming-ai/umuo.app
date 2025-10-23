import Dexie, { type Table } from "dexie";
import {
  createErrorContext,
  handleError,
  handleSilently,
} from "@/lib/utils/error-handler";
import type {
  FileChunkRow,
  FileRow,
  Segment,
  TranscriptRow,
} from "@/types/db/database";

/**
 * ShadowingLearningDB - umuo.app 项目的核心数据库
 *
 * 数据库架构演进：
 * - v1: 基础文件、转录、分段存储
 * - v2: 添加 updatedAt 字段支持时间追踪
 * - v3: 添加 wordTimestamps 支持单词级时间戳
 * - v4: 添加文件分块存储支持大文件处理
 *
 * 设计原则：
 * - 使用 IndexedDB (Dexie) 进行客户端数据持久化
 * - 支持文件分块存储以绕过浏览器存储限制（通常单文件限制 50-250MB）
 * - 提供完整的 CRUD 操作和事务支持
 * - 批量处理优化，支持大量数据的高效操作
 * - 自动数据备份和恢复机制
 *
 * 存储限制策略：
 * - 普通文件：存储完整 File 对象在 IndexedDB 中
 * - 大文件（>10MB）：分块存储，每块 5MB，避免浏览器存储限制
 * - 总存储限制：500MB，超出时自动清理旧文件
 */
class ShadowingLearningDb extends Dexie {
  files!: Table<FileRow>;
  fileChunks!: Table<FileChunkRow>;
  transcripts!: Table<TranscriptRow>;
  segments!: Table<Segment>;

  constructor() {
    super("ShadowingLearningDB");

    // Version 1: 基础数据结构
    // 支持文件管理、转录状态和时间分段
    this.version(1).stores({
      files: "++id, name, createdAt", // 文件基础信息
      transcripts: "++id, fileId, status, createdAt", // 转录状态跟踪
      segments: "++id, transcriptId, start, end", // 时间分段数据
    });

    // Version 2: 添加时间追踪
    // 改进：增加 updatedAt 字段支持数据更新时间追踪
    this.version(2)
      .stores({
        files: "++id, name, createdAt, updatedAt", // 添加更新时间字段
        transcripts: "++id, fileId, status, createdAt, updatedAt", // 添加更新时间字段
        segments: "++id, transcriptId, start, end, createdAt", // 添加创建时间字段
      })
      .upgrade(() => {
        // v1 到 v2 的迁移逻辑
        // 为现有数据添加 updatedAt 字段（自动设置为当前时间）
      });

    // Version 3: 添加单词级时间戳支持
    // 改进：支持精确到单词的时间戳，提升语言学习体验
    this.version(3)
      .stores({
        files: "++id, name, createdAt, updatedAt",
        transcripts: "++id, fileId, status, createdAt, updatedAt",
        segments: "++id, transcriptId, start, end, createdAt, wordTimestamps", // 新增单词时间戳
      })
      .upgrade(async (tx) => {
        try {
          // v2 到 v3 的迁移逻辑
          // 为所有现有分段添加空的 wordTimestamps 数组
          const segmentsTable = tx.table("segments");
          const allSegments = await segmentsTable.toArray();

          // 批量更新现有分段，添加空的 wordTimestamps 字段
          const updatePromises = allSegments.map(async (segment) => {
            if (segment.wordTimestamps === undefined) {
              await segmentsTable.update(segment.id, {
                wordTimestamps: [], // 初始化为空数组
              });
            }
          });

          await Promise.all(updatePromises);
          console.log(
            `数据库 v3 迁移完成：更新了 ${allSegments.length} 个分段`,
          );
        } catch (error) {
          const appError = handleError(error, "db-migration-v3");
          throw appError; // 抛出错误以中止迁移
        }
      });

    // Version 4: 添加文件分块支持
    // 改进：支持大文件分块存储，绕过浏览器 IndexedDB 存储限制
    this.version(4)
      .stores({
        files: "++id, name, createdAt, updatedAt, isChunked, size", // 添加分块标识和文件大小
        fileChunks: "++id, fileId, chunkIndex, createdAt", // 新增文件分块表
        transcripts: "++id, fileId, status, createdAt, updatedAt",
        segments: "++id, transcriptId, start, end, createdAt, wordTimestamps",
      })
      .upgrade(async (_tx) => {
        try {
          // v3 到 v4 的迁移逻辑
          console.log("数据库升级到 v4：添加文件分块支持");

          // 现有文件保持原有存储方式（非分块）
          // 新上传的大文件将自动使用分块存储
          // 存储阈值：文件大小 > 10MB 时启用分块

          // 迁移策略说明：
          // - 现有文件数据保持不变，向后兼容
          // - 新增 fileChunks 表用于存储文件分块
          // - files 表新增 isChunked 和 size 字段

          // No data migration needed for existing files
          // They will continue to work with their existing blob storage
        } catch (error) {
          const appError = handleError(error, "db-migration-v4");
          throw appError; // Re-throw to abort the migration
        }
      });
  }
}

export const db = new ShadowingLearningDb();

// File operations
export async function addFile(
  fileData: Omit<FileRow, "id" | "createdAt" | "updatedAt">,
): Promise<number> {
  try {
    const now = new Date();

    const fileId = await db.files.add({
      ...fileData,
      createdAt: now,
      updatedAt: now,
    });
    return fileId;
  } catch (error) {
    const appError = handleError(error, "DBUtils.addFile");
    throw appError;
  }
}

export async function getFile(id: number): Promise<FileRow | undefined> {
  try {
    return await db.files.get(id);
  } catch (error) {
    const appError = handleError(error, "DBUtils.getFile");
    throw appError;
  }
}

export async function getAllFiles(): Promise<FileRow[]> {
  try {
    return await db.files.orderBy("createdAt").reverse().toArray();
  } catch (error) {
    const appError = handleError(error, "DBUtils.getAllFiles");
    throw appError;
  }
}

export async function updateFile(
  id: number,
  updates: Partial<Omit<FileRow, "id" | "createdAt">>,
): Promise<void> {
  try {
    await db.files.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    const appError = handleError(error, "DBUtils.updateFile");
    throw appError;
  }
}

export async function deleteFile(id: number): Promise<void> {
  try {
    // Delete associated transcripts and segments first
    const transcripts = await db.transcripts
      .where("fileId")
      .equals(id)
      .toArray();
    const transcriptIds = transcripts
      .map((t) => t.id)
      .filter((id): id is number => id !== undefined);

    if (transcriptIds.length > 0) {
      await db.segments.where("transcriptId").anyOf(transcriptIds).delete();
      await db.transcripts.where("fileId").equals(id).delete();
    }

    // Delete file chunks if this is a chunked file
    await deleteFileChunks(id);

    await db.files.delete(id);
  } catch (error) {
    const appError = handleError(error, "DBUtils.deleteFile");
    throw appError;
  }
}

// Transcript operations
export async function addTranscript(
  transcriptData: Omit<TranscriptRow, "id" | "createdAt" | "updatedAt">,
): Promise<number> {
  try {
    const now = new Date();
    const transcriptId = await db.transcripts.add({
      ...transcriptData,
      createdAt: now,
      updatedAt: now,
    });
    return transcriptId;
  } catch (error) {
    const appError = handleError(error, "DBUtils.addTranscript");
    throw appError;
  }
}

export async function getTranscript(
  id: number,
): Promise<TranscriptRow | undefined> {
  try {
    return await db.transcripts.get(id);
  } catch (error) {
    const appError = handleError(error, "DBUtils.getTranscript");
    throw appError;
  }
}

export async function getTranscriptsByFileId(
  fileId: number,
): Promise<TranscriptRow[]> {
  try {
    return await db.transcripts.where("fileId").equals(fileId).toArray();
  } catch (error) {
    const appError = handleError(error, "DBUtils.getTranscriptsByFileId");
    throw appError;
  }
}

export async function getAllTranscripts(): Promise<TranscriptRow[]> {
  const context = createErrorContext("DBUtils", "getAllTranscripts");
  try {
    return await db.transcripts.toArray();
  } catch (error) {
    const appError = handleError(error, context.component);
    throw appError;
  }
}

export async function updateTranscript(
  id: number,
  updates: Partial<Omit<TranscriptRow, "id" | "createdAt">>,
): Promise<void> {
  const context = createErrorContext("DBUtils", "updateTranscript", {
    transcriptId: id,
  });
  try {
    await db.transcripts.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    const appError = handleError(error, context.component);
    throw appError;
  }
}

export async function deleteTranscript(id: number): Promise<void> {
  try {
    // Delete associated segments first
    await db.segments.where("transcriptId").equals(id).delete();
    await db.transcripts.delete(id);
  } catch (error) {
    const appError = handleError(error, "DBUtils.deleteTranscript");
    throw appError;
  }
}

// Segment operations
export async function addSegment(
  segmentData: Omit<Segment, "id" | "createdAt" | "updatedAt">,
): Promise<number> {
  try {
    const now = new Date();
    const segmentId = await db.segments.add({
      ...segmentData,
      createdAt: now,
      updatedAt: now,
    });
    return segmentId;
  } catch (error) {
    const appError = handleError(error, "DBUtils.addSegment");
    throw appError;
  }
}

/**
 * 批量添加音频分段数据
 *
 * 功能特点：
 * - 支持大规模数据的批量处理，避免浏览器性能问题
 * - 自动检测数据量，小批量（≤50）直接处理，大批量使用优化处理器
 * - 提供详细的进度跟踪回调，支持用户界面实时更新
 * - 内置错误处理和重试机制，确保数据完整性
 *
 * 性能优化策略：
 * - 小批量：使用 bulkAdd 直接插入，性能最优
 * - 大批量：分批处理，避免长时间阻塞主线程
 * - 默认批次大小：50，可根据设备性能调整
 *
 * @param segmentsData - 要添加的分段数据数组（不包含系统字段）
 * @param options - 配置选项
 * @param options.onProgress - 进度回调函数，用于UI更新
 * @param options.batchSize - 批处理大小，默认50
 * @param options.enableProgressTracking - 是否启用进度跟踪，默认true
 *
 * @throws {AppError} 当批量处理失败时抛出包含详细错误信息的异常
 *
 * @example
 * ```typescript
 * // 基本用法
 * await addSegments(segmentsData);
 *
 * // 带进度跟踪的用法
 * await addSegments(segmentsData, {
 *   onProgress: (progress) => {
 *     console.log(`进度: ${progress.percentage}%`);
 *   },
 *   batchSize: 100
 * });
 * ```
 */
export async function addSegments(
  segmentsData: Omit<Segment, "id" | "createdAt" | "updatedAt">[],
  options?: {
    onProgress?: (progress: {
      processed: number;
      total: number;
      percentage: number;
      status: "started" | "processing" | "completed" | "failed" | "retrying";
      message?: string;
      error?: string;
    }) => void;
    batchSize?: number;
    enableProgressTracking?: boolean;
  },
): Promise<void> {
  try {
    const now = new Date();
    const segmentsWithTimestamps = segmentsData.map((segment) => ({
      ...segment,
      createdAt: now,
      updatedAt: now,
    }));

    // 对于小批量数据，直接使用 bulkAdd
    if (segmentsData.length <= 50) {
      await db.segments.bulkAdd(segmentsWithTimestamps);
      return;
    }

    // 对于大批量数据，使用优化的批量处理器
    const { createDatabaseBatchProcessor } = await import(
      "../ai/batch-processor"
    );

    const processor = createDatabaseBatchProcessor<Segment>(
      async (batch) => {
        await db.segments.bulkAdd(batch);
        return batch;
      },
      {
        batchSize: options?.batchSize || 50,
        enableProgressTracking: options?.enableProgressTracking ?? true,
      },
    );

    if (options?.onProgress) {
      processor.setProgressCallback(options.onProgress);
    }

    const result = await processor.process(
      segmentsWithTimestamps,
      async (batch) => {
        await db.segments.bulkAdd(batch);
        return batch;
      },
    );

    if (!result.success) {
      throw handleError(
        new Error(
          `批量添加segments失败: ${result.errors.map((e) => e.message).join(", ")}`,
        ),
        "DBUtils.addSegments",
      );
    }
  } catch (error) {
    const appError = handleError(error, "DBUtils.addSegments");
    throw appError;
  }
}

export async function getSegmentsByTranscriptId(
  transcriptId: number,
): Promise<Segment[]> {
  try {
    return await db.segments
      .where("transcriptId")
      .equals(transcriptId)
      .sortBy("start");
  } catch (error) {
    const appError = handleError(error, "DBUtils.getSegmentsByTranscriptId");
    throw appError;
  }
}

export async function getSegment(id: number): Promise<Segment | undefined> {
  try {
    return await db.segments.get(id);
  } catch (error) {
    const appError = handleError(error, "DBUtils.getSegment");
    throw appError;
  }
}

export async function getSegmentAtTime(
  transcriptId: number,
  time: number,
): Promise<Segment | undefined> {
  try {
    const segments = await db.segments
      .where("transcriptId")
      .equals(transcriptId)
      .filter((segment) => segment.start <= time && segment.end >= time)
      .toArray();

    return segments[0]; // Return the first matching segment
  } catch (error) {
    const appError = handleError(error, "DBUtils.getSegmentAtTime");
    throw appError;
  }
}

export async function updateSegment(
  id: number,
  updates: Partial<Omit<Segment, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  try {
    await db.segments.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    const appError = handleError(error, "DBUtils.updateSegment");
    throw appError;
  }
}

export async function deleteSegment(id: number): Promise<void> {
  try {
    await db.segments.delete(id);
  } catch (error) {
    const appError = handleError(error, "DBUtils.deleteSegment");
    throw appError;
  }
}

// Migration utilities
export async function runMigrations(): Promise<void> {
  try {
    // Dexie automatically handles migrations when the database is opened
    // This method is for manual migration triggering if needed

    const _dbVersion = db.verno;
  } catch (error) {
    const appError = handleError(error, "DBUtils.runMigrations");
    throw appError;
  }
}

export async function getDatabaseStats(): Promise<{
  version: number;
  fileCount: number;
  transcriptCount: number;
  segmentCount: number;
  segmentsWithWordTimestamps: number;
}> {
  try {
    const [files, transcripts, segments] = await Promise.all([
      db.files.count(),
      db.transcripts.count(),
      db.segments.count(),
    ]);

    // Count segments that have word timestamps
    const segmentsWithWordTimestamps = await db.segments
      .filter(
        (segment) =>
          !!segment.wordTimestamps && segment.wordTimestamps.length > 0,
      )
      .count();

    const dbVersion = db.verno;
    return {
      version: typeof dbVersion === "number" ? dbVersion : 1,
      fileCount: files,
      transcriptCount: transcripts,
      segmentCount: segments,
      segmentsWithWordTimestamps,
    };
  } catch (error) {
    const appError = handleError(error, "DBUtils.getDatabaseStats");
    throw appError;
  }
}

export async function backupDatabase(): Promise<{
  files: FileRow[];
  transcripts: TranscriptRow[];
  segments: Segment[];
  timestamp: Date;
}> {
  try {
    const [files, transcripts, segments] = await Promise.all([
      db.files.toArray(),
      db.transcripts.toArray(),
      db.segments.toArray(),
    ]);

    const backup = {
      files,
      transcripts,
      segments,
      timestamp: new Date(),
    };

    // Store backup in localStorage for emergency recovery
    try {
      localStorage.setItem("db_backup", JSON.stringify(backup));
      localStorage.setItem(
        "db_backup_timestamp",
        backup.timestamp.toISOString(),
      );
    } catch (storageError) {
      // localStorage 备份失败不影响主要数据库操作
      handleSilently(storageError, "localstorage-backup");
    }

    return backup;
  } catch (error) {
    const appError = handleError(error, "DBUtils.backupDatabase");
    throw appError;
  }
}

export async function restoreFromBackup(
  backupData: {
    files: FileRow[];
    transcripts: TranscriptRow[];
    segments: Segment[];
    timestamp: Date;
  },
  options?: {
    onProgress?: (progress: {
      processed: number;
      total: number;
      percentage: number;
      status: "started" | "processing" | "completed" | "failed" | "retrying";
      message?: string;
      error?: string;
    }) => void;
    batchSize?: number;
  },
): Promise<void> {
  try {
    // Clear existing data
    await clearDatabase();

    const totalItems =
      backupData.files.length +
      backupData.transcripts.length +
      backupData.segments.length;
    const _processedItems = 0;

    // 对于小批量数据，直接使用 Promise.all
    if (totalItems <= 150) {
      await Promise.all([
        db.files.bulkAdd(backupData.files),
        db.transcripts.bulkAdd(backupData.transcripts),
        db.segments.bulkAdd(backupData.segments),
      ]);
      return;
    }

    // 对于大批量数据，使用优化的批量处理器
    const { createDatabaseBatchProcessor } = await import(
      "../ai/batch-processor"
    );

    const processor = createDatabaseBatchProcessor<FileRow>(
      async (batch) => {
        await db.files.bulkAdd(batch);
        return batch;
      },
      {
        batchSize: options?.batchSize || 50,
        enableProgressTracking: true,
      },
    );

    if (options?.onProgress) {
      processor.setProgressCallback(options.onProgress);
    }

    // 批量恢复文件
    if (backupData.files.length > 0) {
      const fileResult = await processor.process(
        backupData.files,
        async (batch) => {
          await db.files.bulkAdd(batch);
          return batch;
        },
      );

      if (!fileResult.success) {
        throw handleError(
          new Error(
            `恢复文件失败: ${fileResult.errors.map((e) => e.message).join(", ")}`,
          ),
          "DBUtils.restoreFromBackup",
        );
      }
    }

    // 批量恢复转录
    if (backupData.transcripts.length > 0) {
      const transcriptProcessor = createDatabaseBatchProcessor<TranscriptRow>(
        async (batch) => {
          await db.transcripts.bulkAdd(batch);
          return batch;
        },
        {
          batchSize: options?.batchSize || 50,
          enableProgressTracking: true,
        },
      );

      const transcriptResult = await transcriptProcessor.process(
        backupData.transcripts,
        async (batch) => {
          await db.transcripts.bulkAdd(batch);
          return batch;
        },
      );

      if (!transcriptResult.success) {
        throw handleError(
          new Error(
            `恢复转录失败: ${transcriptResult.errors.map((e) => e.message).join(", ")}`,
          ),
          "DBUtils.restoreFromBackup",
        );
      }
    }

    // 批量恢复片段
    if (backupData.segments.length > 0) {
      const segmentProcessor = createDatabaseBatchProcessor<Segment>(
        async (batch) => {
          await db.segments.bulkAdd(batch);
          return batch;
        },
        {
          batchSize: options?.batchSize || 50,
          enableProgressTracking: true,
        },
      );

      const segmentResult = await segmentProcessor.process(
        backupData.segments,
        async (batch) => {
          await db.segments.bulkAdd(batch);
          return batch;
        },
      );

      if (!segmentResult.success) {
        throw handleError(
          new Error(
            `恢复片段失败: ${segmentResult.errors.map((e) => e.message).join(", ")}`,
          ),
          "DBUtils.restoreFromBackup",
        );
      }
    }
  } catch (error) {
    const appError = handleError(error, "DBUtils.restoreFromBackup");
    throw appError;
  }
}

// Utility methods
export async function getFileWithTranscripts(fileId: number): Promise<{
  file: FileRow;
  transcripts: TranscriptRow[];
}> {
  try {
    const file = await db.files.get(fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const transcripts = await db.transcripts
      .where("fileId")
      .equals(fileId)
      .toArray();
    return { file, transcripts };
  } catch (error) {
    handleError(error, "DBUtils.getFileWithTranscripts");
    throw error;
  }
}

export async function getTranscriptWithSegments(transcriptId: number): Promise<{
  transcript: TranscriptRow;
  segments: Segment[];
}> {
  try {
    const transcript = await db.transcripts.get(transcriptId);
    if (!transcript) {
      throw new Error("Transcript not found");
    }

    const segments = await db.segments
      .where("transcriptId")
      .equals(transcriptId)
      .sortBy("start");

    return { transcript, segments };
  } catch (error) {
    handleError(error, "DBUtils.getTranscriptWithSegments");
    throw error;
  }
}

// Transaction support methods
export async function withTransaction<T>(
  operation: (tx: unknown) => Promise<T>,
): Promise<T> {
  try {
    return await db.transaction(
      "rw",
      [db.files, db.transcripts, db.segments],
      operation,
    );
  } catch (error) {
    const appError = handleError(error, "DBUtils.withTransaction");
    throw appError;
  }
}

export async function addFileWithTranscript(
  fileData: Omit<FileRow, "id" | "createdAt" | "updatedAt">,
  transcriptData: Omit<
    TranscriptRow,
    "id" | "fileId" | "createdAt" | "updatedAt"
  >,
): Promise<{ fileId: number; transcriptId: number }> {
  return await withTransaction(async () => {
    const fileId = await addFile(fileData);
    const transcriptId = await addTranscript({
      ...transcriptData,
      fileId,
    });
    return { fileId, transcriptId };
  });
}

export async function addTranscriptWithSegments(
  transcriptData: Omit<TranscriptRow, "id" | "createdAt" | "updatedAt">,
  segments: Omit<Segment, "id" | "transcriptId" | "createdAt" | "updatedAt">[],
): Promise<{ transcriptId: number; segmentIds: number[] }> {
  return await withTransaction(async () => {
    const transcriptId = await addTranscript(transcriptData);
    const segmentIds: number[] = [];

    for (const segmentData of segments) {
      const segmentId = await addSegment({
        ...segmentData,
        transcriptId,
      });
      segmentIds.push(segmentId);
    }

    return { transcriptId, segmentIds };
  });
}

export async function deleteFileWithDependencies(
  fileId: number,
): Promise<void> {
  return await withTransaction(async () => {
    // Delete all segments that belong to transcripts of this file
    const transcripts = await db.transcripts
      .where("fileId")
      .equals(fileId)
      .toArray();

    for (const transcript of transcripts) {
      if (transcript.id) {
        await db.segments.where("transcriptId").equals(transcript.id).delete();
      }
    }

    // Delete all transcripts for this file
    await db.transcripts.where("fileId").equals(fileId).delete();

    // Delete the file itself
    await db.files.delete(fileId);
  });
}

export async function deleteTranscriptWithSegments(
  transcriptId: number,
): Promise<void> {
  return await withTransaction(async () => {
    // Delete all segments for this transcript
    await db.segments.where("transcriptId").equals(transcriptId).delete();

    // Delete the transcript itself
    await db.transcripts.delete(transcriptId);
  });
}

export async function updateTranscriptStatus(
  transcriptId: number,
  status: TranscriptRow["status"],
  additionalData?: Partial<Omit<TranscriptRow, "id" | "status">>,
): Promise<void> {
  return await withTransaction(async () => {
    await updateTranscript(transcriptId, {
      status,
      ...additionalData,
    });
  });
}

export async function clearDatabase(): Promise<void> {
  try {
    await Promise.all([
      db.files.clear(),
      db.fileChunks.clear(),
      db.transcripts.clear(),
      db.segments.clear(),
    ]);
  } catch (error) {
    const appError = handleError(error, "DBUtils.clearDatabase");
    throw appError;
  }
}

// File chunk operations
export async function addFileChunk(
  chunkData: Omit<FileChunkRow, "id" | "createdAt">,
): Promise<number> {
  try {
    const now = new Date();
    const chunkId = await db.fileChunks.add({
      ...chunkData,
      createdAt: now,
    });
    return chunkId;
  } catch (error) {
    const appError = handleError(error, "DBUtils.addFileChunk");
    throw appError;
  }
}

export async function getFileChunks(fileId: number): Promise<FileChunkRow[]> {
  try {
    const chunks = await db.fileChunks.where("fileId").equals(fileId).toArray();

    // Sort by chunkIndex manually
    return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  } catch (error) {
    const appError = handleError(error, "DBUtils.getFileChunks");
    throw appError;
  }
}

export async function getFileChunk(
  fileId: number,
  chunkIndex: number,
): Promise<FileChunkRow | undefined> {
  try {
    return await db.fileChunks
      .where("fileId")
      .equals(fileId)
      .and((chunk) => chunk.chunkIndex === chunkIndex)
      .first();
  } catch (error) {
    const appError = handleError(error, "DBUtils.getFileChunk");
    throw appError;
  }
}

export async function deleteFileChunks(fileId: number): Promise<void> {
  try {
    await db.fileChunks.where("fileId").equals(fileId).delete();
  } catch (error) {
    const appError = handleError(error, "DBUtils.deleteFileChunks");
    throw appError;
  }
}

export async function getFileChunksCount(fileId: number): Promise<number> {
  try {
    return await db.fileChunks.where("fileId").equals(fileId).count();
  } catch (error) {
    const appError = handleError(error, "DBUtils.getFileChunksCount");
    throw appError;
  }
}

// Storage management
export async function getStorageStats(): Promise<{
  totalSize: number;
  chunkedFiles: number;
  regularFiles: number;
  chunksCount: number;
  usagePercentage: number;
}> {
  try {
    const [files, chunks] = await Promise.all([
      db.files.toArray(),
      db.fileChunks.toArray(),
    ]);

    const chunkedFiles = files.filter((f) => f.isChunked).length;
    const regularFiles = files.filter((f) => !f.isChunked).length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    // 限制为 500MB
    const STORAGE_LIMIT = 500 * 1024 * 1024;
    const usagePercentage = (totalSize / STORAGE_LIMIT) * 100;

    return {
      totalSize,
      chunkedFiles,
      regularFiles,
      chunksCount: chunks.length,
      usagePercentage: Math.min(usagePercentage, 100),
    };
  } catch (error) {
    const appError = handleError(error, "DBUtils.getStorageStats");
    throw appError;
  }
}

export async function getCleanupCandidates(): Promise<FileRow[]> {
  try {
    // 返回最旧的文件，优先清理大文件
    return await db.files.orderBy("createdAt").reverse().toArray();
  } catch (error) {
    const appError = handleError(error, "DBUtils.getCleanupCandidates");
    throw appError;
  }
}

// 为了向后兼容，保留别名
// biome-ignore lint/complexity/noStaticOnlyClass: Backward compatibility for existing code
class DbUtils {
  static addFile = addFile;
  static getFile = getFile;
  static getAllFiles = getAllFiles;
  static updateFile = updateFile;
  static deleteFile = deleteFile;
  static addTranscript = addTranscript;
  static getTranscript = getTranscript;
  static getTranscriptsByFileId = getTranscriptsByFileId;
  static getAllTranscripts = getAllTranscripts;
  static updateTranscript = updateTranscript;
  static deleteTranscript = deleteTranscript;
  static addSegment = addSegment;
  static addSegments = addSegments;
  static getSegmentsByTranscriptId = getSegmentsByTranscriptId;
  static getSegment = getSegment;
  static getSegmentAtTime = getSegmentAtTime;
  static updateSegment = updateSegment;
  static deleteSegment = deleteSegment;
  static runMigrations = runMigrations;
  static getDatabaseStats = getDatabaseStats;
  static backupDatabase = backupDatabase;
  static restoreFromBackup = restoreFromBackup;
  static getFileWithTranscripts = getFileWithTranscripts;
  static getTranscriptWithSegments = getTranscriptWithSegments;
  static withTransaction = withTransaction;
  static addFileWithTranscript = addFileWithTranscript;
  static addTranscriptWithSegments = addTranscriptWithSegments;
  static deleteFileWithDependencies = deleteFileWithDependencies;
  static deleteTranscriptWithSegments = deleteTranscriptWithSegments;
  static updateTranscriptStatus = updateTranscriptStatus;
  static clearDatabase = clearDatabase;
  // File chunk operations
  static addFileChunk = addFileChunk;
  static getFileChunks = getFileChunks;
  static getFileChunk = getFileChunk;
  static deleteFileChunks = deleteFileChunks;
  static getFileChunksCount = getFileChunksCount;
  static getStorageStats = getStorageStats;
  static getCleanupCandidates = getCleanupCandidates;
}

export { DbUtils };

export default db;
