/**
 * 简化的数据库操作文件
 * 移除了复杂的批量处理器，保留核心功能
 */

import Dexie, { type Table } from "dexie";
import type { FileRow, Segment, TranscriptRow } from "@/types/db/database";
import { handleError } from "../utils/error-handler";

export class AppDatabase extends Dexie {
  files!: Table<FileRow>;
  transcripts!: Table<TranscriptRow>;
  segments!: Table<Segment>;

  constructor() {
    super("umuo-app-db");

    // Define schema
    this.version(3).stores({
      files: "++id, name, size, type, uploadedAt, updatedAt, [name+type]",
      transcripts: "++id, fileId, status, language, createdAt, updatedAt",
      segments: "++id, transcriptId, start, end, text, [transcriptId+start], [transcriptId+end]",
    });

    // Migration logic for version updates
    this.version(1)
      .stores({
        files: "++id, name, size, type, uploadedAt, [name+type]",
        transcripts: "++id, fileId, status, language, createdAt, updatedAt",
        segments: "++id, transcriptId, start, end, text, [transcriptId+start], [transcriptId+end]",
      })
      .upgrade((tx) => {
        // Initial setup - no migration needed
        console.log("Database version 1 initialized");
      });

    this.version(2)
      .stores({
        files: "++id, name, size, type, uploadedAt, [name+type]",
        transcripts: "++id, fileId, status, language, createdAt, updatedAt",
        segments:
          "++id, transcriptId, start, end, text, wordTimestamps, [transcriptId+start], [transcriptId+end]",
      })
      .upgrade(async (tx) => {
        // Add wordTimestamps to existing segments if needed
        console.log("Database migrated to version 2: Added wordTimestamps support");
      });

    this.version(3)
      .stores({
        files: "++id, name, size, type, uploadedAt, [name+type]",
        transcripts: "++id, fileId, status, language, createdAt, updatedAt",
        segments:
          "++id, transcriptId, start, end, text, wordTimestamps, normalizedText, translation, annotations, furigana, [transcriptId+start], [transcriptId+end]",
      })
      .upgrade(async (tx) => {
        // Add enhanced segment fields for better transcription features
        console.log("Database migrated to version 3: Added enhanced transcription features");
      });
  }
}

// Create database instance
export const db = new AppDatabase();

// Simplified database utilities
export const DBUtils = {
  /**
   * Add a file to the database
   */
  async addFile(file: Omit<FileRow, "id">): Promise<number> {
    try {
      return await db.files.add(file as FileRow);
    } catch (error) {
      throw handleError(error, "DBUtils.addFile");
    }
  },

  /**
   * Get a file by ID
   */
  async getFile(id: number): Promise<FileRow | undefined> {
    try {
      return await db.files.get(id);
    } catch (error) {
      throw handleError(error, "DBUtils.getFile");
    }
  },

  /**
   * Delete a file and its associated data
   */
  async deleteFile(id: number): Promise<void> {
    try {
      await db.transaction("rw", db.files, db.transcripts, db.segments, async () => {
        // Delete the file
        await db.files.delete(id);

        // Get associated transcripts
        const transcripts = await db.transcripts.where("fileId").equals(id).toArray();

        // Delete each transcript and its segments
        for (const transcript of transcripts) {
          if (transcript.id) {
            await db.segments.where("transcriptId").equals(transcript.id).delete();
            await db.transcripts.delete(transcript.id);
          }
        }
      });
    } catch (error) {
      throw handleError(error, "DBUtils.deleteFile");
    }
  },

  /**
   * Get all files
   */
  async getAllFiles(): Promise<FileRow[]> {
    try {
      return await db.files.orderBy("uploadedAt").reverse().toArray();
    } catch (error) {
      throw handleError(error, "DBUtils.getAllFiles");
    }
  },

  /**
   * Add a transcript
   */
  async addTranscript(transcript: Omit<TranscriptRow, "id">): Promise<number> {
    try {
      return await db.transcripts.add(transcript as TranscriptRow);
    } catch (error) {
      throw handleError(error, "DBUtils.addTranscript");
    }
  },

  /**
   * Update transcript status
   */
  async updateTranscriptStatus(id: number, status: TranscriptRow["status"]): Promise<void> {
    try {
      await db.transcripts.update(id, { status, updatedAt: new Date() });
    } catch (error) {
      throw handleError(error, "DBUtils.updateTranscriptStatus");
    }
  },

  /**
   * Add segments
   */
  async addSegments(
    segments: Omit<Segment, "id">[],
    options?: {
      batchSize?: number;
      onProgress?: (progress: {
        processed: number;
        total: number;
        percentage: number;
        status: string;
        message: string;
      }) => void;
    },
  ): Promise<void> {
    try {
      // Add timestamps
      const segmentsWithTimestamps = segments.map((segment) => ({
        ...segment,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // For small batches, use bulkAdd directly
      if (segmentsWithTimestamps.length <= 50) {
        await db.segments.bulkAdd(segmentsWithTimestamps as Segment[]);
        return;
      }

      // For large batches, use simplified batch processing
      const batchSize = options?.batchSize || 50;
      for (let i = 0; i < segmentsWithTimestamps.length; i += batchSize) {
        const batch = segmentsWithTimestamps.slice(i, i + batchSize);
        await db.segments.bulkAdd(batch as Segment[]);

        // Simple progress reporting
        if (options?.onProgress) {
          const progress = Math.min(
            100,
            Math.floor(((i + batch.length) / segmentsWithTimestamps.length) * 100),
          );
          options.onProgress({
            processed: i + batch.length,
            total: segmentsWithTimestamps.length,
            percentage: progress,
            status: "processing",
            message: `处理中 ${i + batch.length}/${segmentsWithTimestamps.length}`,
          });
        }
      }
    } catch (error) {
      throw handleError(error, "DBUtils.addSegments");
    }
  },

  /**
   * Get segments by transcript ID
   */
  async getSegmentsByTranscriptId(transcriptId: number): Promise<Segment[]> {
    try {
      return await db.segments.where("transcriptId").equals(transcriptId).toArray();
    } catch (error) {
      throw handleError(error, "DBUtils.getSegmentsByTranscriptId");
    }
  },

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    try {
      await db.transaction("rw", db.files, db.transcripts, db.segments, async () => {
        await db.segments.clear();
        await db.transcripts.clear();
        await db.files.clear();
      });
    } catch (error) {
      throw handleError(error, "DBUtils.clearAll");
    }
  },
};

// Export database instance
export default db;
