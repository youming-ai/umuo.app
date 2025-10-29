import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSegment, createMockTranscript } from "@/__tests__/setup";
import { createMockFile } from "@/__tests__/utils/test-helpers";
import { db } from "@/lib/db/db";

describe("数据库操作", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("文件操作", () => {
    it("应该成功添加文件到数据库", async () => {
      const mockFile = createMockFile("test-audio.mp3", "audio/mpeg", 1024);
      const mockFileData = {
        name: mockFile.name,
        size: mockFile.size,
        type: mockFile.type,
        audioBlob: mockFile,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.files.add as any).mockResolvedValue(1);
      (db.files.get as any).mockResolvedValue({ id: 1, ...mockFileData });

      const fileId = await db.files.add(mockFileData);
      const savedFile = await db.files.get(fileId);

      expect(fileId).toBe(1);
      expect(savedFile).toEqual({ id: 1, ...mockFileData });
      expect(db.files.add).toHaveBeenCalledWith(mockFileData);
    });

    it("应该获取所有文件", async () => {
      const mockFiles = [
        { id: 1, name: "file1.mp3", size: 1024, type: "audio/mpeg" },
        { id: 2, name: "file2.mp3", size: 2048, type: "audio/mpeg" },
      ];

      (db.files.toArray as any).mockResolvedValue(mockFiles);

      const files = await db.files.toArray();

      expect(files).toEqual(mockFiles);
      expect(db.files.toArray).toHaveBeenCalled();
    });

    it("应该按名称搜索文件", async () => {
      const mockFiles = [{ id: 1, name: "search-test.mp3", size: 1024, type: "audio/mpeg" }];

      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockFiles),
      };

      (db.files.where as any).mockReturnValue(mockWhere);

      const files = await db.files.where("name").equals("search-test").toArray();

      expect(files).toEqual(mockFiles);
      expect(db.files.where).toHaveBeenCalledWith("name");
      expect(mockWhere.equals).toHaveBeenCalledWith("search-test");
    });

    it("应该删除文件", async () => {
      (db.files.delete as any).mockResolvedValue(1);

      await db.files.delete(1);

      expect(db.files.delete).toHaveBeenCalledWith(1);
    });

    it("应该更新文件信息", async () => {
      const updateData = { name: "updated-name.mp3", updatedAt: new Date() };
      (db.files.update as any).mockResolvedValue(1);

      const updatedCount = await db.files.update(1, updateData);

      expect(updatedCount).toBe(1);
      expect(db.files.update).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe("转录操作", () => {
    it("应该添加转录记录", async () => {
      const mockTranscript = createMockTranscript();
      (db.transcripts.add as any).mockResolvedValue(1);

      const transcriptId = await db.transcripts.add(mockTranscript);

      expect(transcriptId).toBe(1);
      expect(db.transcripts.add).toHaveBeenCalledWith(mockTranscript);
    });

    it("应该根据文件ID获取转录", async () => {
      const mockTranscript = createMockTranscript({ fileId: 1 });
      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTranscript),
      };

      (db.transcripts.where as any).mockReturnValue(mockWhere);

      const transcript = await db.transcripts.where("fileId").equals(1).first();

      expect(transcript).toEqual(mockTranscript);
      expect(db.transcripts.where).toHaveBeenCalledWith("fileId");
      expect(mockWhere.equals).toHaveBeenCalledWith(1);
    });

    it("应该更新转录状态", async () => {
      const updateData = {
        status: "completed" as const,
        updatedAt: new Date(),
      };
      (db.transcripts.update as any).mockResolvedValue(1);

      const updatedCount = await db.transcripts.update(1, updateData);

      expect(updatedCount).toBe(1);
      expect(db.transcripts.update).toHaveBeenCalledWith(1, updateData);
    });

    it("应该删除转录记录", async () => {
      (db.transcripts.delete as any).mockResolvedValue(1);

      await db.transcripts.delete(1);

      expect(db.transcripts.delete).toHaveBeenCalledWith(1);
    });
  });

  describe("字幕段操作", () => {
    it("应该批量添加字幕段", async () => {
      const mockSegments = [createMockSegment({ id: 1 }), createMockSegment({ id: 2 })];
      (db.segments.bulkAdd as any).mockResolvedValue([1, 2]);

      const segmentIds = await db.segments.bulkAdd(mockSegments);

      expect(segmentIds).toEqual([1, 2]);
      expect(db.segments.bulkAdd).toHaveBeenCalledWith(mockSegments);
    });

    it("应该根据转录ID获取字幕段", async () => {
      const mockSegments = [
        createMockSegment({ transcriptId: 1 }),
        createMockSegment({ transcriptId: 1, id: 2 }),
      ];
      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockSegments),
      };

      (db.segments.where as any).mockReturnValue(mockWhere);

      const segments = await db.segments.where("transcriptId").equals(1).toArray();

      expect(segments).toEqual(mockSegments);
      expect(db.segments.where).toHaveBeenCalledWith("transcriptId");
      expect(mockWhere.equals).toHaveBeenCalledWith(1);
    });

    it("应该按时间范围获取字幕段", async () => {
      const mockSegments = [
        createMockSegment({ start: 0, end: 5 }),
        createMockSegment({ id: 2, start: 5, end: 10 }),
      ];
      const mockWhere = {
        between: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockSegments),
      };

      (db.segments.where as any).mockReturnValue(mockWhere);

      const segments = await db.segments.where("start").between(0, 10).toArray();

      expect(segments).toEqual(mockSegments);
      expect(db.segments.where).toHaveBeenCalledWith("start");
      expect(mockWhere.between).toHaveBeenCalledWith(0, 10);
    });

    it("应该更新字幕段", async () => {
      const updateData = {
        text: "更新后的字幕",
        translation: "Updated subtitle",
        updatedAt: new Date(),
      };
      (db.segments.update as any).mockResolvedValue(1);

      const updatedCount = await db.segments.update(1, updateData);

      expect(updatedCount).toBe(1);
      expect(db.segments.update).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe("事务操作", () => {
    it("应该支持事务操作", async () => {
      const mockFile = createMockFile("test.mp3", "audio/mpeg", 1024);
      const mockTranscript = createMockTranscript();
      const mockSegments = [createMockSegment()];

      const mockTransaction = {
        files: { add: vi.fn().mockResolvedValue(1) },
        transcripts: { add: vi.fn().mockResolvedValue(1) },
        segments: { bulkAdd: vi.fn().mockResolvedValue([1]) },
      };

      (db.transaction as any).mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        return callback(mockTransaction);
      });

      await db.transaction("rw", db.files, db.transcripts, db.segments, async (tx) => {
        const fileId = await tx.files.add({
          name: mockFile.name,
          size: mockFile.size,
          type: mockFile.type,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const transcriptId = await tx.transcripts.add({
          ...mockTranscript,
          fileId,
        });

        await tx.segments.bulkAdd([{ ...mockSegments[0], transcriptId }]);
      });

      expect(db.transaction).toHaveBeenCalledWith(
        "rw",
        db.files,
        db.transcripts,
        db.segments,
        expect.any(Function),
      );
    });

    it("应该回滚失败的事务", async () => {
      const mockTransaction = {
        files: { add: vi.fn().mockResolvedValue(1) },
        transcripts: {
          add: vi.fn().mockRejectedValue(new Error("Database error")),
        },
      };

      (db.transaction as any).mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        return callback(mockTransaction);
      });

      await expect(
        db.transaction("rw", db.files, db.transcripts, async (tx) => {
          await tx.files.add({
            name: "test.mp3",
            size: 1024,
            type: "audio/mpeg",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await tx.transcripts.add({
            fileId: 1,
            text: "test",
            status: "completed" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
      ).rejects.toThrow("Database error");
    });
  });

  describe("数据库统计", () => {
    it("应该获取文件总数", async () => {
      (db.files.count as any).mockResolvedValue(5);

      const count = await db.files.count();

      expect(count).toBe(5);
      expect(db.files.count).toHaveBeenCalled();
    });

    it("应该获取转录统计", async () => {
      const mockStats = [
        { status: "completed", count: 3 },
        { status: "processing", count: 1 },
        { status: "failed", count: 1 },
      ];

      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        count: vi
          .fn()
          .mockResolvedValueOnce(3) // completed
          .mockResolvedValueOnce(1) // processing
          .mockResolvedValueOnce(1), // failed
      };

      (db.transcripts.where as any).mockReturnValue(mockWhere);

      const completedCount = await db.transcripts.where("status").equals("completed").count();
      const processingCount = await db.transcripts.where("status").equals("processing").count();
      const failedCount = await db.transcripts.where("status").equals("failed").count();

      expect(completedCount).toBe(3);
      expect(processingCount).toBe(1);
      expect(failedCount).toBe(1);
    });
  });

  describe("数据库清理", () => {
    it("应该清理过期文件", async () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30天前
      const mockWhere = {
        below: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([{ id: 1, name: "old-file.mp3" }]),
      };

      (db.files.where as any).mockReturnValue(mockWhere);
      (db.files.delete as any).mockResolvedValue(1);

      const oldFiles = await db.files.where("createdAt").below(oldDate).toArray();
      for (const file of oldFiles) {
        await db.files.delete(file.id);
      }

      expect(db.files.where).toHaveBeenCalledWith("createdAt");
      expect(mockWhere.below).toHaveBeenCalledWith(oldDate);
      expect(db.files.delete).toHaveBeenCalledWith(1);
    });

    it("应该清理孤立转录记录", async () => {
      const mockWhere = {
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([{ id: 1 }]),
      };

      (db.transcripts.where as any).mockReturnValue(mockWhere);
      (db.transcripts.delete as any).mockResolvedValue(1);

      const orphanTranscripts = await db.transcripts
        .where("fileId")
        .equals(undefined as any)
        .toArray();
      for (const transcript of orphanTranscripts) {
        await db.transcripts.delete(transcript.id);
      }

      expect(db.transcripts.where).toHaveBeenCalledWith("fileId");
      expect(mockWhere.equals).toHaveBeenCalledWith(undefined as any);
      expect(db.transcripts.delete).toHaveBeenCalledWith(1);
    });
  });
});
