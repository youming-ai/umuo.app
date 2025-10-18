import Dexie, { type Table } from "dexie";
import {
  createErrorContext,
  databaseError,
  handleError,
  handleSilently,
} from "@/lib/error-handler";
import type { FileChunkRow, FileRow, Segment, TranscriptRow } from "@/types/database";

class ShadowingLearningDb extends Dexie {
  files!: Table<FileRow>;
  fileChunks!: Table<FileChunkRow>;
  transcripts!: Table<TranscriptRow>;
  segments!: Table<Segment>;

  constructor() {
    super("ShadowingLearningDB");

    this.version(1).stores({
      files: "++id, name, createdAt",
      transcripts: "++id, fileId, status, createdAt",
      segments: "++id, transcriptId, start, end",
    });

    // Add indexes for better query performance
    this.version(2)
      .stores({
        files: "++id, name, createdAt, updatedAt",
        transcripts: "++id, fileId, status, createdAt, updatedAt",
        segments: "++id, transcriptId, start, end, createdAt",
      })
      .upgrade(() => {
        // Migration logic if needed
      });

    // Add word timestamps support
    this.version(3)
      .stores({
        files: "++id, name, createdAt, updatedAt",
        transcripts: "++id, fileId, status, createdAt, updatedAt",
        segments: "++id, transcriptId, start, end, createdAt, wordTimestamps",
      })
      .upgrade(async (tx) => {
        try {
          // Get all existing segments to add wordTimestamps field
          const segmentsTable = tx.table("segments");
          const allSegments = await segmentsTable.toArray();

          // Update each segment to add empty wordTimestamps array
          const updatePromises = allSegments.map(async (segment) => {
            if (segment.wordTimestamps === undefined) {
              await segmentsTable.update(segment.id, {
                wordTimestamps: [],
              });
            }
          });

          await Promise.all(updatePromises);
        } catch (error) {
          const appError = handleError(error, "db-migration-v3");
          throw appError; // Re-throw to abort the migration
        }
      });

    // Add file chunk support for large files
    this.version(4)
      .stores({
        files: "++id, name, createdAt, updatedAt, isChunked, size",
        fileChunks: "++id, fileId, chunkIndex, createdAt",
        transcripts: "++id, fileId, status, createdAt, updatedAt",
        segments: "++id, transcriptId, start, end, createdAt, wordTimestamps",
      })
      .upgrade(async (tx) => {
        try {
          // Migration to version 4: Add file chunk support
          // Existing files will continue to work as before (non-chunked)
          // New files will use chunking if they exceed the threshold

          console.log("Upgrading database to version 4: Adding file chunk support");

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
    const transcripts = await db.transcripts.where("fileId").equals(id).toArray();
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

export async function getTranscript(id: number): Promise<TranscriptRow | undefined> {
  try {
    return await db.transcripts.get(id);
  } catch (error) {
    const appError = handleError(error, "DBUtils.getTranscript");
    throw appError;
  }
}

export async function getTranscriptsByFileId(fileId: number): Promise<TranscriptRow[]> {
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
  const context = createErrorContext("DBUtils", "updateTranscript", { transcriptId: id });
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
    const { createDatabaseBatchProcessor } = await import("./batch-processor");

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

    const result = await processor.process(segmentsWithTimestamps, async (batch) => {
      await db.segments.bulkAdd(batch);
      return batch;
    });

    if (!result.success) {
      throw handleError(
        new Error(`批量添加segments失败: ${result.errors.map((e) => e.message).join(", ")}`),
        "DBUtils.addSegments",
      );
    }
  } catch (error) {
    const appError = handleError(error, "DBUtils.addSegments");
    throw appError;
  }
}

export async function getSegmentsByTranscriptId(transcriptId: number): Promise<Segment[]> {
  try {
    return await db.segments.where("transcriptId").equals(transcriptId).sortBy("start");
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
      .filter((segment) => !!segment.wordTimestamps && segment.wordTimestamps.length > 0)
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
      localStorage.setItem("db_backup_timestamp", backup.timestamp.toISOString());
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
      backupData.files.length + backupData.transcripts.length + backupData.segments.length;
    const processedItems = 0;

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
    const { createDatabaseBatchProcessor } = await import("./batch-processor");

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
      const fileResult = await processor.process(backupData.files, async (batch) => {
        await db.files.bulkAdd(batch);
        return batch;
      });

      if (!fileResult.success) {
        throw handleError(
          new Error(`恢复文件失败: ${fileResult.errors.map((e) => e.message).join(", ")}`),
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
          new Error(`恢复转录失败: ${transcriptResult.errors.map((e) => e.message).join(", ")}`),
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

      const segmentResult = await segmentProcessor.process(backupData.segments, async (batch) => {
        await db.segments.bulkAdd(batch);
        return batch;
      });

      if (!segmentResult.success) {
        throw handleError(
          new Error(`恢复片段失败: ${segmentResult.errors.map((e) => e.message).join(", ")}`),
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

    const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
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

    const segments = await db.segments.where("transcriptId").equals(transcriptId).sortBy("start");

    return { transcript, segments };
  } catch (error) {
    handleError(error, "DBUtils.getTranscriptWithSegments");
    throw error;
  }
}

// Transaction support methods
export async function withTransaction<T>(operation: (tx: unknown) => Promise<T>): Promise<T> {
  try {
    return await db.transaction("rw", [db.files, db.transcripts, db.segments], operation);
  } catch (error) {
    const appError = handleError(error, "DBUtils.withTransaction");
    throw appError;
  }
}

export async function addFileWithTranscript(
  fileData: Omit<FileRow, "id" | "createdAt" | "updatedAt">,
  transcriptData: Omit<TranscriptRow, "id" | "fileId" | "createdAt" | "updatedAt">,
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

export async function deleteFileWithDependencies(fileId: number): Promise<void> {
  return await withTransaction(async () => {
    // Delete all segments that belong to transcripts of this file
    const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

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

export async function deleteTranscriptWithSegments(transcriptId: number): Promise<void> {
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
    const [files, chunks] = await Promise.all([db.files.toArray(), db.fileChunks.toArray()]);

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
