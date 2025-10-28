import { BaseRepository } from "../base.repository";
import { type ISegmentRepository, type QueryOptions } from "../interfaces/repository.interface";
import { db } from "@/lib/db/db";
import type { Segment } from "@/types/db/database";

/**
 * 片段Repository实现
 * 封装对segments表的CRUD操作和业务逻辑
 */
export class SegmentRepository extends BaseRepository<Segment> implements ISegmentRepository {
  constructor() {
    super("SegmentRepository");
  }

  async findById(id: number, options?: QueryOptions): Promise<Segment | null> {
    this.validateId(id);

    return this.executeWithMetrics(
      "findById",
      async () => {
        const segment = await db.segments.get(id);
        return segment || null;
      },
      { segmentId: id },
    );
  }

  async findAll(options?: QueryOptions): Promise<Segment[]> {
    return this.executeWithMetrics(
      "findAll",
      async () => {
        let results = await db.segments.toArray();

        // 默认按开始时间排序
        results.sort((a, b) => a.start - b.start);

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

  async create(data: Partial<Segment>, options?: QueryOptions): Promise<Segment> {
    this.validateData(data);

    return this.executeWithMetrics(
      "create",
      async () => {
        const now = new Date();

        const segmentData = {
          transcriptId: data.transcriptId,
          start: data.start || 0,
          end: data.end || 0,
          text: data.text || "",
          createdAt: now,
          updatedAt: now,
        };

        if (!segmentData.transcriptId) {
          throw new Error("Segment must have a transcriptId");
        }

        if (segmentData.start >= segmentData.end) {
          throw new Error("Segment start must be less than end");
        }

        const id = await db.segments.add(segmentData as any);
        const createdSegment = await this.findById(id);

        if (!createdSegment) {
          throw new Error("Failed to create segment: Unable to retrieve created record");
        }

        return createdSegment;
      },
      { transcriptId: data.transcriptId },
    );
  }

  async update(id: number, data: Partial<Segment>, options?: QueryOptions): Promise<Segment> {
    this.validateId(id);
    this.validateData(data);

    return this.executeWithMetrics(
      "update",
      async () => {
        if (data.start !== undefined && data.end !== undefined && data.start >= data.end) {
          throw new Error("Segment start must be less than end");
        }

        const updateData = {
          ...data,
          updatedAt: new Date(),
        };

        await db.segments.update(id, updateData as any);

        const updatedSegment = await this.findById(id);
        if (!updatedSegment) {
          throw new Error("Failed to update segment: Unable to retrieve updated record");
        }

        return updatedSegment;
      },
      { segmentId: id },
    );
  }

  async delete(id: number, options?: QueryOptions): Promise<boolean> {
    this.validateId(id);

    return this.executeWithMetrics(
      "delete",
      async () => {
        const segment = await this.findById(id);
        if (!segment) {
          return false;
        }

        await db.segments.delete(id);
        return true;
      },
      { segmentId: id },
    );
  }

  async count(options?: QueryOptions): Promise<number> {
    return this.executeWithMetrics(
      "count",
      async () => {
        return await db.segments.count();
      },
      { options },
    );
  }

  // 实现ISegmentRepository特有的方法 - 简化版本
  async findByTranscriptId(transcriptId: number): Promise<Segment[]> {
    return this.executeWithMetrics(
      "findByTranscriptId",
      async () => {
        const segments = await db.segments.where("transcriptId").equals(transcriptId).toArray();
        return segments.sort((a, b) => a.start - b.start);
      },
      { transcriptId },
    );
  }

  async findByTimeRange(
    transcriptId: number,
    startTime: number,
    endTime: number,
  ): Promise<Segment[]> {
    return this.executeWithMetrics(
      "findByTimeRange",
      async () => {
        const allSegments = await db.segments.where("transcriptId").equals(transcriptId).toArray();
        return allSegments
          .filter((segment) => segment.start < endTime && segment.end > startTime)
          .sort((a, b) => a.start - b.start) as Segment[];
      },
      { transcriptId, startTime, endTime },
    );
  }

  async findByText(text: string): Promise<Segment[]> {
    return this.executeWithMetrics(
      "findByText",
      async () => {
        const allSegments = await db.segments.toArray();
        return allSegments.filter((segment) =>
          segment.text.toLowerCase().includes(text.toLowerCase()),
        ) as Segment[];
      },
      { text },
    );
  }

  async getAverageDuration(): Promise<number> {
    return this.executeWithMetrics("getAverageDuration", async () => {
      const segments = await db.segments.toArray();
      const totalDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
      return segments.length > 0 ? totalDuration / segments.length : 0;
    });
  }

  async getSegmentCount(transcriptId: number): Promise<number> {
    return this.executeWithMetrics(
      "getSegmentCount",
      async () => {
        return await db.segments.where("transcriptId").equals(transcriptId).count();
      },
      { transcriptId },
    );
  }

  async updateTranslation(segmentId: number, translation: string): Promise<void> {
    await this.executeWithMetrics(
      "updateTranslation",
      async () => {
        await db.segments.update(segmentId, {
          translation,
          updatedAt: new Date(),
        } as any);
      },
      { segmentId },
    );
  }

  async updateNormalizedText(segmentId: number, normalizedText: string): Promise<void> {
    await this.executeWithMetrics(
      "updateNormalizedText",
      async () => {
        await db.segments.update(segmentId, {
          normalizedText,
          updatedAt: new Date(),
        } as any);
      },
      { segmentId },
    );
  }

  async batchUpdateByTranscriptId(
    transcriptId: number,
    updates: Partial<Segment>[],
  ): Promise<number> {
    return this.executeWithMetrics(
      "batchUpdateByTranscriptId",
      async () => {
        let updatedCount = 0;
        for (const update of updates) {
          await db.segments
            .where("transcriptId")
            .equals(transcriptId)
            .and((seg) => seg.id === update.id)
            .modify(update as any);
          updatedCount++;
        }
        return updatedCount;
      },
      { transcriptId, count: updates.length },
    );
  }

  async searchByKeyword(transcriptId: number, keywords: string[]): Promise<Segment[]> {
    return this.executeWithMetrics(
      "searchByKeyword",
      async () => {
        const segments = await db.segments.where("transcriptId").equals(transcriptId).toArray();
        return segments.filter((segment) =>
          keywords.some((keyword) => segment.text.toLowerCase().includes(keyword.toLowerCase())),
        ) as Segment[];
      },
      { transcriptId, keywords },
    );
  }

  async filterByConfidence(transcriptId: number, minConfidence: number): Promise<Segment[]> {
    return this.executeWithMetrics(
      "filterByConfidence",
      async () => {
        // 简化实现
        return await this.findByTranscriptId(transcriptId);
      },
      { transcriptId, minConfidence },
    );
  }

  async optimizeForPlayback(transcriptId: number): Promise<Segment[]> {
    return this.executeWithMetrics(
      "optimizeForPlayback",
      async () => {
        return await this.findByTranscriptId(transcriptId);
      },
      { transcriptId },
    );
  }

  async exportToSRT(transcriptId: number): Promise<string> {
    return this.executeWithMetrics(
      "exportToSRT",
      async () => {
        const segments = await this.findByTranscriptId(transcriptId);

        return segments
          .map((segment, index) => {
            const startTime = this.formatSRTTime(segment.start);
            const endTime = this.formatSRTTime(segment.end);
            return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
          })
          .join("\n");
      },
      { transcriptId },
    );
  }

  async exportToVTT(transcriptId: number): Promise<string> {
    return this.executeWithMetrics(
      "exportToVTT",
      async () => {
        const segments = await this.findByTranscriptId(transcriptId);

        let vtt = "WEBVTT\n\n";
        segments.forEach((segment) => {
          const startTime = this.formatVTTTime(segment.start);
          const endTime = this.formatVTTTime(segment.end);
          vtt += `${startTime} --> ${endTime}\n${segment.text}\n\n`;
        });

        return vtt;
      },
      { transcriptId },
    );
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
  }

  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }
}
