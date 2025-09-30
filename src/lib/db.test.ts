jest.mock("dexie", () => {
  const mockTable = {
    add: jest.fn(),
    get: jest.fn(),
    where: jest.fn().mockReturnThis(),
    equals: jest.fn().mockReturnThis(),
    toArray: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    bulkAdd: jest.fn(),
    bulkPut: jest.fn(),
    orderBy: jest.fn().mockReturnThis(),
    reverse: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn(),
    filter: jest.fn(),
    sortBy: jest.fn(),
  };

  const mockDexieInstance = {
    version: jest.fn().mockReturnThis(),
    stores: jest.fn().mockReturnThis(),
    upgrade: jest.fn().mockReturnThis(),
    files: mockTable,
    fileChunks: mockTable,
    transcripts: mockTable,
    segments: mockTable,
  };

  const MockDexie = jest.fn(() => mockDexieInstance);
  return {
    __esModule: true,
    default: MockDexie,
  };
});

// Mock deleteFileChunks function
jest.mock("./db", () => ({
  ...jest.requireActual("./db"),
  deleteFileChunks: jest.fn().mockResolvedValue(undefined),
}));

import { db, addFile, getFile, getAllFiles, updateFile, deleteFile, deleteFileChunks } from "./db";
import type { FileRow } from "@/types/database";

// Get the mocked table instance
const mockTable = {
  add: jest.fn(),
  get: jest.fn(),
  toArray: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  where: jest.fn().mockReturnThis(),
  equals: jest.fn().mockReturnThis(),
  filter: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sortBy: jest.fn(),
  orderBy: jest.fn().mockReturnThis(),
  reverse: jest.fn().mockReturnThis(),
  clear: jest.fn(),
  update: jest.fn(),
};

// Mock the db.files table
Object.defineProperty(db, "files", {
  value: mockTable,
  writable: true,
});

describe("Database Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockTable.add.mockResolvedValue(1);
    mockTable.get.mockResolvedValue({ id: 1, name: "test.mp3", size: 1024 });
    mockTable.toArray.mockResolvedValue([{ id: 1, name: "test.mp3", size: 1024 }]);
    mockTable.put.mockResolvedValue(1);
    mockTable.delete.mockResolvedValue(1);
    mockTable.count.mockResolvedValue(5);
    mockTable.update.mockResolvedValue(1);
    mockTable.clear.mockResolvedValue(undefined);

    // 链式调用方法的模拟
    mockTable.orderBy.mockReturnThis();
    mockTable.reverse.mockReturnThis();
    mockTable.filter.mockReturnThis();
    mockTable.offset.mockReturnThis();
    mockTable.limit.mockReturnThis();
  });

  describe("File Operations", () => {
    test("should add file to database", async () => {
      const fileData: Omit<FileRow, "id" | "createdAt" | "updatedAt"> = {
        name: "test.mp3",
        size: 1024,
        type: "audio/mpeg",
      };

      const result = await addFile(fileData);
      expect(result).toBe(1);
      expect(mockTable.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...fileData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
    });

    test("should get file by id", async () => {
      const file = await getFile(1);
      expect(file).toEqual({ id: 1, name: "test.mp3", size: 1024 });
      expect(mockTable.get).toHaveBeenCalledWith(1);
    });

    test("should get all files", async () => {
      const files = await getAllFiles();
      expect(files).toEqual([{ id: 1, name: "test.mp3", size: 1024 }]);
      expect(mockTable.toArray).toHaveBeenCalled();
    });

    test("should update file", async () => {
      const updates: Partial<Omit<FileRow, "id" | "createdAt">> = {
        name: "updated.mp3",
        size: 2048,
        type: "audio/mpeg",
      };

      await updateFile(1, updates);
      expect(mockTable.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ...updates,
          updatedAt: expect.any(Date),
        }),
      );
    });

    test("should delete file", async () => {
      // Mock the dependent table operations
      const mockTranscriptsTable = {
        where: jest.fn().mockReturnThis(),
        equals: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(undefined),
        toArray: jest.fn().mockResolvedValue([]),
      };

      const mockSegmentsTable = {
        where: jest.fn().mockReturnThis(),
        anyOf: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      const mockFileChunksTable = {
        where: jest.fn().mockReturnThis(),
        equals: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      // Mock the db instance to have these tables
      Object.defineProperty(db, "transcripts", {
        value: mockTranscriptsTable,
        writable: true,
      });

      Object.defineProperty(db, "segments", {
        value: mockSegmentsTable,
        writable: true,
      });

      Object.defineProperty(db, "fileChunks", {
        value: mockFileChunksTable,
        writable: true,
      });

      await deleteFile(1);
      expect(mockTable.delete).toHaveBeenCalledWith(1);
    });

    test("should handle database errors", async () => {
      const originalError = new Error("Database error");
      mockTable.add.mockRejectedValue(originalError);

      const result = await addFile({
        name: "test.mp3",
        size: 1024,
        type: "audio/mpeg",
      }).catch((e) => e);

      expect(result).toHaveProperty("message", "Database error");
      expect(result).toHaveProperty("code", "INTERNAL_SERVER_ERROR");
    });

    test("should handle file not found", async () => {
      mockTable.get.mockResolvedValue(undefined);

      const file = await getFile(999);
      expect(file).toBeUndefined();
    });
  });

  describe("Database Query Operations", () => {
    test("should query files with where clause", async () => {
      mockTable.where.mockReturnThis();
      mockTable.equals.mockReturnThis();
      mockTable.toArray.mockResolvedValue([
        {
          id: 1,
          name: "test.mp3",
          size: 1024,
          type: "audio/mpeg",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const files = await db.files.where("name").equals("test.mp3").toArray();
      expect(files).toEqual([
        {
          id: 1,
          name: "test.mp3",
          size: 1024,
          type: "audio/mpeg",
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ]);
      expect(mockTable.where).toHaveBeenCalledWith("name");
      expect(mockTable.equals).toHaveBeenCalledWith("test.mp3");
    });

    test("should get count of files", async () => {
      mockTable.count.mockResolvedValue(5);

      const count = await db.files.count();
      expect(count).toBe(5);
      expect(mockTable.count).toHaveBeenCalled();
    });
  });
});
