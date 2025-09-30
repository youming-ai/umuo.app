import {
  CHUNK_SIZE,
  CHUNK_THRESHOLD,
  calculateChunkCount,
  needsChunking,
  validateFileSize,
  createFileChunks,
  formatFileSize,
} from "./file-chunk";

describe("File Chunk Utilities", () => {
  describe("Constants", () => {
    test("CHUNK_SIZE should be 5MB", () => {
      expect(CHUNK_SIZE).toBe(5 * 1024 * 1024);
    });

    test("CHUNK_THRESHOLD should be 50MB", () => {
      expect(CHUNK_THRESHOLD).toBe(50 * 1024 * 1024);
    });
  });

  describe("calculateChunkCount", () => {
    test("should calculate correct chunk count for small file", () => {
      expect(calculateChunkCount(10 * 1024 * 1024)).toBe(2); // 10MB -> 2 chunks
    });

    test("should calculate correct chunk count for exact multiple", () => {
      expect(calculateChunkCount(CHUNK_SIZE)).toBe(1);
      expect(calculateChunkCount(CHUNK_SIZE * 3)).toBe(3);
    });

    test("should calculate correct chunk count for partial chunk", () => {
      expect(calculateChunkCount(CHUNK_SIZE + 1)).toBe(2);
      expect(calculateChunkCount(CHUNK_SIZE * 2 + 1024)).toBe(3);
    });
  });

  describe("needsChunking", () => {
    test("should return false for files below threshold", () => {
      expect(needsChunking(CHUNK_THRESHOLD - 1)).toBe(false);
      expect(needsChunking(10 * 1024 * 1024)).toBe(false);
    });

    test("should return true for files at or above threshold", () => {
      expect(needsChunking(CHUNK_THRESHOLD)).toBe(true);
      expect(needsChunking(CHUNK_THRESHOLD + 1)).toBe(true);
      expect(needsChunking(100 * 1024 * 1024)).toBe(true);
    });
  });

  describe("validateFileSize", () => {
    test("should validate correct file sizes", () => {
      expect(validateFileSize(1024)).toEqual({ isValid: true });
      expect(validateFileSize(CHUNK_THRESHOLD)).toEqual({ isValid: true });
    });

    test("should reject empty files", () => {
      expect(validateFileSize(0)).toEqual({
        isValid: false,
        error: "文件为空",
      });
    });

    test("should reject oversized files", () => {
      const maxSize = 100 * 1024 * 1024;
      expect(validateFileSize(maxSize + 1)).toEqual({
        isValid: false,
        error: `文件大小超过限制 (${maxSize / 1024 / 1024}MB)`,
      });
    });
  });

  describe("createFileChunks", () => {
    test("should create correct number of chunks", () => {
      // Create a mock file with specific size
      const mockFile = {
        size: CHUNK_SIZE * 2,
        type: "text/plain",
        slice: jest
          .fn()
          .mockReturnValueOnce(new Blob(["chunk1"]))
          .mockReturnValueOnce(new Blob(["chunk2"])),
      };

      const chunks = Array.from(createFileChunks(mockFile as any, CHUNK_SIZE));

      expect(chunks).toHaveLength(2);
      expect(chunks[0].index).toBe(0);
      expect(chunks[1].index).toBe(1);
      expect(chunks[0].offset).toBe(0);
      expect(chunks[1].offset).toBe(CHUNK_SIZE);
    });

    test("should handle file smaller than chunk size", () => {
      const file = new File(["hello"], "test.txt");
      const chunks = Array.from(createFileChunks(file, CHUNK_SIZE));

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].offset).toBe(0);
    });

    test("should preserve original file type", () => {
      const file = new File(["test"], "test.mp3", { type: "audio/mpeg" });
      const chunks = Array.from(createFileChunks(file, CHUNK_SIZE));

      expect(chunks[0].data.type).toBe("audio/mpeg");
    });
  });

  describe("formatFileSize", () => {
    test("should format bytes correctly", () => {
      expect(formatFileSize(500)).toBe("500.00 B");
      expect(formatFileSize(1024)).toBe("1.00 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
    });

    test("should handle decimal values", () => {
      expect(formatFileSize(1536)).toBe("1.50 KB");
      expect(formatFileSize(1572864)).toBe("1.50 MB");
    });
  });
});
