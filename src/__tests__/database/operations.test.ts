/**
 * 数据库操作测试 - 使用类型安全的 Mock 工具
 */

import { describe, expect, it, vi } from "vitest";
import { MockDatabaseTools, MockDataGenerator } from "@/__tests__/utils/test-mocks";
import { db } from "@/lib/db/db";

describe("数据库操作", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("文件操作", () => {
    it("应该添加文件", async () => {
      const mockFile = MockDataGenerator.createMockFile();
      const mockFileData = {
        name: mockFile.name,
        size: mockFile.size,
        type: mockFile.type,
        blob: mockFile,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDb = MockDatabaseTools.createMockDbOperations();

      // 覆盖真实的 db 方法
      db.files.add = mockDb.files.add;
      db.files.get = mockDb.files.get;

      const fileId = await db.files.add(mockFileData);
      const savedFile = await db.files.get(fileId);

      expect(fileId).toBe(1);
      expect(savedFile).toEqual({ id: 1, ...mockFileData });
      expect(db.files.add).toHaveBeenCalledWith(mockFileData);
    });

    it("应该获取所有文件", async () => {
      const mockFiles = [
        MockDataGenerator.createMockFile({ id: 1, name: "file1.mp3" }),
        MockDataGenerator.createMockFile({ id: 2, name: "file2.mp3" }),
      ];

      const mockDb = MockDatabaseTools.createMockDbOperations();
      db.files.toArray = mockDb.files.toArray;
      db.files.toArray.mockResolvedValue(mockFiles);

      const files = await db.files.toArray();

      expect(files).toEqual(mockFiles);
      expect(db.files.toArray).toHaveBeenCalled();
    });

    it("应该按名称搜索文件", async () => {
      const mockFiles = [
        MockDataGenerator.createMockFile({
          id: 1,
          name: "search-test.mp3",
          size: 1024,
          type: "audio/mpeg",
        }),
      ];

      const mockDb = MockDatabaseTools.createMockDbOperations();
      const mockWhere = MockDatabaseTools.createMockWhereCallback(mockFiles);

      db.files.where = mockDb.files.where;
      db.files.where.mockReturnValue(mockWhere);

      const files = await db.files.where("name").equals("search-test").toArray();

      expect(files).toEqual(mockFiles);
      expect(db.files.where).toHaveBeenCalledWith("name");
      expect(mockWhere.equals).toHaveBeenCalledWith("search-test");
    });

    it("应该删除文件", async () => {
      const mockDb = MockDatabaseTools.createMockDbOperations();
      db.files.delete = mockDb.files.delete;

      await db.files.delete(1);

      expect(db.files.delete).toHaveBeenCalledWith(1);
    });

    it("应该更新文件信息", async () => {
      const updateData = { name: "updated-name.mp3", updatedAt: new Date() };
      const mockDb = MockDatabaseTools.createMockDbOperations();
      db.files.update = mockDb.files.update;

      const updatedCount = await db.files.update(1, updateData);

      expect(updatedCount).toBe(1);
      expect(db.files.update).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe("转录记录操作", () => {
    it("应该添加转录记录", async () => {
      const mockTranscript = MockDataGenerator.createMockTranscript();
      const mockDb = MockDatabaseTools.createMockDbOperations();

      db.transcripts.add = mockDb.transcripts.add;
      db.transcripts.add.mockResolvedValue(mockTranscript.id!);

      const transcriptId = await db.transcripts.add(mockTranscript);

      expect(transcriptId).toBe(mockTranscript.id);
      expect(db.transcripts.add).toHaveBeenCalledWith(mockTranscript);
    });

    it("应该获取文件的转录记录", async () => {
      const mockTranscript = MockDataGenerator.createMockTranscript({
        fileId: 1,
      });
      const mockDb = MockDatabaseTools.createMockDbOperations();
      const mockWhere = MockDatabaseTools.createMockWhereCallback([mockTranscript]);

      db.transcripts.where = mockDb.transcripts.where;
      db.transcripts.where.mockReturnValue(mockWhere);

      const transcript = await db.transcripts.where("fileId").equals(1).first();

      expect(transcript).toEqual(mockTranscript);
      expect(db.transcripts.where).toHaveBeenCalledWith("fileId");
      expect(mockWhere.equals).toHaveBeenCalledWith(1);
    });

    it("应该更新转录记录", async () => {
      const updateData = {
        text: "Updated text",
        updatedAt: new Date(),
      };
      const mockDb = MockDatabaseTools.createMockDbOperations();
      db.transcripts.update = mockDb.transcripts.update;

      const updatedCount = await db.transcripts.update(1, updateData);

      expect(updatedCount).toBe(1);
      expect(db.transcripts.update).toHaveBeenCalledWith(1, updateData);
    });

    it("应该删除转录记录", async () => {
      const mockDb = MockDatabaseTools.createMockDbOperations();
      db.transcripts.delete = mockDb.transcripts.delete;

      await db.transcripts.delete(1);

      expect(db.transcripts.delete).toHaveBeenCalledWith(1);
    });
  });

  describe("字幕段操作", () => {
    it("应该批量添加字幕段", async () => {
      const mockSegments = [
        MockDataGenerator.createMockSegment({ id: 1 }),
        MockDataGenerator.createMockSegment({ id: 2 }),
      ];
      const mockDb = MockDatabaseTools.createMockDbOperations();

      db.segments.bulkAdd = mockDb.segments.bulkAdd;
      db.segments.bulkAdd.mockResolvedValue([1, 2]);

      const segmentIds = await db.segments.bulkAdd(mockSegments);

      expect(segmentIds).toEqual([1, 2]);
      expect(db.segments.bulkAdd).toHaveBeenCalledWith(mockSegments);
    });

    it("应该获取转录的所有字幕段", async () => {
      const mockSegments = [
        MockDataGenerator.createMockSegment({
          id: 1,
          transcriptId: 1,
          start: 0.0,
          end: 2.5,
          text: "First segment",
        }),
        MockDataGenerator.createMockSegment({
          id: 2,
          transcriptId: 1,
          start: 2.5,
          end: 5.0,
          text: "Second segment",
        }),
      ];

      const mockDb = MockDatabaseTools.createMockDbOperations();
      const mockWhere = MockDatabaseTools.createMockWhereCallback(mockSegments);

      db.segments.where = mockDb.segments.where;
      db.segments.where.mockReturnValue(mockWhere);

      const segments = await db.segments.where("transcriptId").equals(1).toArray();

      expect(segments).toEqual(mockSegments);
      expect(db.segments.where).toHaveBeenCalledWith("transcriptId");
      expect(mockWhere.equals).toHaveBeenCalledWith(1);
    });

    it("应该获取时间范围内的字幕段", async () => {
      const mockSegments = [
        MockDataGenerator.createMockSegment({
          id: 1,
          start: 0.0,
          end: 2.5,
          text: "Segment in range",
        }),
      ];

      const mockDb = MockDatabaseTools.createMockDbOperations();
      const mockWhere = MockDatabaseTools.createMockWhereCallback(mockSegments);

      db.segments.where = mockDb.segments.where;
      db.segments.where.mockReturnValue(mockWhere);

      const segments = await db.segments.where("start").between(0, 10).toArray();

      expect(segments).toEqual(mockSegments);
      expect(db.segments.where).toHaveBeenCalledWith("start");
      expect(mockWhere.between).toHaveBeenCalledWith(0, 10);
    });

    it("应该更新字幕段", async () => {
      const updateData = {
        text: "Updated segment text",
        updatedAt: new Date(),
      };
      const mockDb = MockDatabaseTools.createMockDbOperations();
      db.segments.update = mockDb.segments.update;

      const updatedCount = await db.segments.update(1, updateData);

      expect(updatedCount).toBe(1);
      expect(db.segments.update).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe("事务操作", () => {
    it("应该在事务中添加文件和转录记录", async () => {
      const mockFile = MockDataGenerator.createMockFile();
      const mockTranscript = MockDataGenerator.createMockTranscript();
      const mockDb = MockDatabaseTools.createMockDbOperations();

      db.transaction = mockDb.transaction;

      await db.transaction("rw", db.files, db.transcripts, async (tx) => {
        const fileId = await tx.files.add({
          name: mockFile.name,
          size: mockFile.size,
          type: mockFile.type,
          uploadedAt: new Date(),
          updatedAt: new Date(),
        });

        const transcriptId = await tx.transcripts.add({
          fileId,
          text: mockTranscript.text,
          status: mockTranscript.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(fileId).toBe(1);
        expect(transcriptId).toBe(1);
      });

      expect(db.transaction).toHaveBeenCalled();
    });

    it("应该在事务失败时回滚", async () => {
      const mockDb = MockDatabaseTools.createMockDbOperations();
      db.transaction = mockDb.transaction;

      // Mock a transaction that throws an error
      db.transaction.mockImplementation(() => {
        throw new Error("Database error");
      });

      await expect(
        db.transaction("rw", db.files, db.transcripts, async (tx) => {
          await tx.files.add({
            name: "test.mp3",
            size: 1024,
            type: "audio/mpeg",
            uploadedAt: new Date(),
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
      const mockDb = MockDatabaseTools.createMockDbOperations();
      db.files.count = mockDb.files.count;
      db.files.count.mockResolvedValue(5);

      const count = await db.files.count();

      expect(count).toBe(5);
      expect(db.files.count).toHaveBeenCalled();
    });

    it("应该获取转录统计", async () => {
      const _mockStats = [
        { status: "completed", count: 3 },
        { status: "processing", count: 1 },
        { status: "pending", count: 1 },
      ];

      // Mock transcript count operations
      const mockDb = MockDatabaseTools.createMockDbOperations();
      const mockWhere = MockDatabaseTools.createMockWhereCallback([
        MockDataGenerator.createMockTranscript(),
        MockDataGenerator.createMockTranscript(),
        MockDataGenerator.createMockTranscript(),
      ]);

      db.transcripts.where = mockDb.transcripts.where;
      db.transcripts.where.mockReturnValue(mockWhere);

      const completedCount = await db.transcripts.where("status").equals("completed").count();

      expect(completedCount).toBe(3);
      expect(db.transcripts.where).toHaveBeenCalledWith("status");
      expect(mockWhere.equals).toHaveBeenCalledWith("completed");
    });
  });

  describe("数据清理", () => {
    it("应该删除过期的文件", async () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const mockDb = MockDatabaseTools.createMockDbOperations();
      const mockWhere = MockDatabaseTools.createMockWhereCallback([]);

      db.files.where = mockDb.files.where;
      db.files.where.mockReturnValue(mockWhere);
      db.files.delete = mockDb.files.delete;

      const oldFiles = await db.files.where("uploadedAt").below(oldDate).toArray();

      expect(oldFiles).toEqual([]);
      expect(db.files.where).toHaveBeenCalledWith("uploadedAt");
      expect(mockWhere.below).toHaveBeenCalledWith(oldDate);
    });

    it("应该清理孤立的转录记录", async () => {
      const mockDb = MockDatabaseTools.createMockDbOperations();
      const mockWhere = MockDatabaseTools.createMockWhereCallback([]);

      db.transcripts.where = mockDb.transcripts.where;
      db.transcripts.where.mockReturnValue(mockWhere);
      db.transcripts.delete = mockDb.transcripts.delete;

      // Find transcripts with no associated files
      const orphanTranscripts = await db.transcripts
        .where("fileId")
        .equals(undefined as unknown as number)
        .toArray();

      expect(orphanTranscripts).toEqual([]);
      expect(db.transcripts.where).toHaveBeenCalledWith("fileId");
      expect(mockWhere.equals).toHaveBeenCalledWith(undefined);
    });
  });
});
