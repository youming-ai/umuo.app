import { BaseRepository } from "../base.repository";
import { type ITranscriptRepository, type QueryOptions } from "../interfaces/repository.interface";
import { db } from "@/lib/db/db";
import type { TranscriptRow, Segment } from "@/types/db/database";

/**
 * 转录Repository实现
 * 封装对transcripts表的CRUD操作和业务逻辑
 */
export class TranscriptRepository
  extends BaseRepository<TranscriptRow>
  implements ITranscriptRepository
{
  constructor() {
    super("TranscriptRepository");
  }

  async findById(id: number, options?: QueryOptions): Promise<TranscriptRow | null> {
    this.validateId(id);

    return this.executeWithMetrics(
      "findById",
      async () => {
        const transcript = await db.transcripts.get(id);
        return transcript || null;
      },
      { transcriptId: id },
    );
  }

  async findAll(options?: QueryOptions): Promise<TranscriptRow[]> {
    return this.executeWithMetrics(
      "findAll",
      async () => {
        let results = await db.transcripts.toArray();

        // 默认按创建时间倒序
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // 应用分页
        if (options?.offset) {
          results = results.slice(options.offset);
        }

        if (options?.limit) {
          results = results.slice(0, options.limit);
        }

        return results;
      },
      { options },
    );
  }

  async create(data: Partial<TranscriptRow>, options?: QueryOptions): Promise<TranscriptRow> {
    this.validateData(data);

    return this.executeWithMetrics(
      "create",
      async () => {
        const now = new Date();

        const transcriptData = {
          fileId: data.fileId,
          status: data.status || "pending",
          text: data.text || "",
          createdAt: now,
          updatedAt: now,
        };

        if (!transcriptData.fileId) {
          throw new Error("Transcript must have a fileId");
        }

        const id = await db.transcripts.add(transcriptData as any);
        const createdTranscript = await this.findById(id);

        if (!createdTranscript) {
          throw new Error("Failed to create transcript: Unable to retrieve created record");
        }

        return createdTranscript;
      },
      { fileId: data.fileId },
    );
  }

  async update(
    id: number,
    data: Partial<TranscriptRow>,
    options?: QueryOptions,
  ): Promise<TranscriptRow> {
    this.validateId(id);
    this.validateData(data);

    return this.executeWithMetrics(
      "update",
      async () => {
        const updateData = {
          ...data,
          updatedAt: new Date(),
        };

        await db.transcripts.update(id, updateData as any);

        const updatedTranscript = await this.findById(id);
        if (!updatedTranscript) {
          throw new Error("Failed to update transcript: Unable to retrieve updated record");
        }

        return updatedTranscript;
      },
      { transcriptId: id },
    );
  }

  async delete(id: number, options?: QueryOptions): Promise<boolean> {
    this.validateId(id);

    return this.executeWithMetrics(
      "delete",
      async () => {
        const transcript = await this.findById(id);
        if (!transcript) {
          return false;
        }

        // 删除相关的片段数据
        await db.segments.where("transcriptId").equals(id).delete();
        await db.transcripts.delete(id);

        return true;
      },
      { transcriptId: id },
    );
  }

  async count(options?: QueryOptions): Promise<number> {
    return this.executeWithMetrics(
      "count",
      async () => {
        return await db.transcripts.count();
      },
      { options },
    );
  }

  // 实现ITranscriptRepository特有的方法 - 简化版本
  async findByFileId(fileId: number): Promise<TranscriptRow | null> {
    return this.executeWithMetrics(
      "findByFileId",
      async () => {
        const transcript = await db.transcripts.where("fileId").equals(fileId).first();
        return transcript || null;
      },
      { fileId },
    );
  }

  async findByStatus(status: string): Promise<TranscriptRow[]> {
    return this.executeWithMetrics(
      "findByStatus",
      async () => {
        return await db.transcripts
          .where("status")
          .equals(status as any)
          .toArray();
      },
      { status },
    );
  }

  async findByLanguage(language: string): Promise<TranscriptRow[]> {
    return this.executeWithMetrics(
      "findByLanguage",
      async () => {
        // 简化实现
        return await db.transcripts.toArray();
      },
      { language },
    );
  }

  async findCompleted(limit?: number): Promise<TranscriptRow[]> {
    return this.executeWithMetrics(
      "findCompleted",
      async () => {
        const transcripts = await db.transcripts.where("status").equals("completed").toArray();
        return limit ? transcripts.slice(0, limit) : transcripts;
      },
      { limit },
    );
  }

  async getAverageDuration(): Promise<number> {
    return this.executeWithMetrics("getAverageDuration", async () => {
      const transcripts = await db.transcripts.toArray();
      const totalDuration = transcripts.reduce((sum, t) => sum + (t.duration || 0), 0);
      return transcripts.length > 0 ? totalDuration / transcripts.length : 0;
    });
  }

  async getLanguageDistribution(): Promise<Record<string, number>> {
    return this.executeWithMetrics("getLanguageDistribution", async () => {
      // 简化实现
      return {};
    });
  }

  async getCompletionRate(): Promise<number> {
    return this.executeWithMetrics("getCompletionRate", async () => {
      const transcripts = await db.transcripts.toArray();
      const completed = transcripts.filter((t) => t.status === "completed").length;
      return transcripts.length > 0 ? (completed / transcripts.length) * 100 : 0;
    });
  }

  async findWithSegments(transcriptId: number): Promise<{
    transcript: TranscriptRow;
    segments: Segment[];
  } | null> {
    return this.executeWithMetrics(
      "findWithSegments",
      async () => {
        const transcript = await db.transcripts.get(transcriptId);
        if (!transcript) return null;

        const segments = await db.segments.where("transcriptId").equals(transcriptId).toArray();

        return {
          transcript,
          segments: segments as Segment[],
        };
      },
      { transcriptId },
    );
  }

  async findManyWithSegments(transcriptIds: number[]): Promise<
    Array<{
      transcript: TranscriptRow;
      segments: Segment[];
    }>
  > {
    return this.executeWithMetrics(
      "findManyWithSegments",
      async () => {
        const results = [];
        for (const id of transcriptIds) {
          const result = await this.findWithSegments(id);
          if (result) {
            results.push(result);
          }
        }
        return results;
      },
      { count: transcriptIds.length },
    );
  }

  async updateProgress(transcriptId: number, progress: number, status?: string): Promise<void> {
    await this.executeWithMetrics(
      "updateProgress",
      async () => {
        const updateData: Partial<TranscriptRow> = { updatedAt: new Date() };
        if (status) {
          updateData.status = status as any;
        }
        await db.transcripts.update(transcriptId, updateData as any);
      },
      { transcriptId, progress, status },
    );
  }

  async markAsCompleted(transcriptId: number, result: any): Promise<void> {
    await this.executeWithMetrics(
      "markAsCompleted",
      async () => {
        await db.transcripts.update(transcriptId, {
          status: "completed",
          updatedAt: new Date(),
        } as any);
      },
      { transcriptId },
    );
  }

  async markAsFailed(transcriptId: number, error: string): Promise<void> {
    await this.executeWithMetrics(
      "markAsFailed",
      async () => {
        await db.transcripts.update(transcriptId, {
          status: "failed",
          error,
          updatedAt: new Date(),
        } as any);
      },
      { transcriptId, error },
    );
  }
}
