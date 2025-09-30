import {
  uploadFile,
  getFileBlob,
  getStorageUsage,
  validateFile,
  getDetailedValidationReport,
} from "./file-upload";
import { DbUtils } from "./db";
import { URLManager } from "./url-manager";

// Mock dependencies
jest.mock("./db");
jest.mock("./url-manager");
jest.mock("./file-validation");

const mockDbUtils = DbUtils as jest.Mocked<typeof DbUtils>;
const mockURLManager = URLManager as jest.Mocked<typeof URLManager>;

// Import mocked validation module
const mockFileValidation = require("./file-validation");

describe("File Upload Functions", () => {
  const mockFileId = 1;
  const mockFile = new File(["test content"], "test.mp3", {
    type: "audio/mpeg",
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockURLManager.createTemporaryURL.mockReturnValue("blob:test-url");

    // Mock validation results
    mockFileValidation.validateFileWithSecurity.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      fileType: "audio/mpeg",
      fileSize: mockFile.size,
      securityScore: 100,
    });
  });

  describe("uploadFile", () => {
    test("should upload small file without chunking", async () => {
      const smallFile = new File(["small"], "small.mp3", {
        type: "audio/mpeg",
      });

      mockDbUtils.addFile.mockResolvedValue(mockFileId);

      const result = await uploadFile(smallFile);

      expect(result).toBe(mockFileId);
      expect(mockDbUtils.addFile).toHaveBeenCalledWith({
        name: "small.mp3",
        size: smallFile.size,
        type: "audio/mpeg",
        blob: expect.any(Blob),
        isChunked: false,
      });
    });

    test("should upload large file with chunking", async () => {
      // Create a mock large file
      const largeFile = {
        name: "large.mp3",
        type: "audio/mpeg",
        size: 60 * 1024 * 1024, // 60MB
        slice: jest.fn().mockReturnValue(new Blob(["chunk"])),
      };

      mockDbUtils.addFile.mockResolvedValue(mockFileId);
      mockDbUtils.addFileChunk.mockResolvedValue(1);
      mockDbUtils.withTransaction.mockImplementation((callback) => callback(null));

      const onProgress = jest.fn();
      const result = await uploadFile(largeFile as any, onProgress);

      expect(result).toBe(mockFileId);
      expect(mockDbUtils.withTransaction).toHaveBeenCalled();
      expect(mockDbUtils.addFile).toHaveBeenCalledWith({
        name: "large.mp3",
        size: largeFile.size,
        type: "audio/mpeg",
        isChunked: true,
        chunkSize: 5 * 1024 * 1024,
        totalChunks: 12,
      });
      expect(onProgress).toHaveBeenCalled();
    });

    test("should reject non-audio files", async () => {
      const textFile = new File(["test"], "test.txt", { type: "text/plain" });

      // Mock validation to fail for non-audio files
      mockFileValidation.validateFileWithSecurity.mockResolvedValue({
        isValid: false,
        errors: [
          {
            code: "UNSUPPORTED_EXTENSION",
            message: "不支持的文件扩展名: .txt",
            severity: "error",
            field: "extension",
          },
        ],
        warnings: [],
        info: [],
        fileType: "text/plain",
        fileSize: textFile.size,
        securityScore: 0,
      });

      await expect(uploadFile(textFile)).rejects.toThrow(
        "文件验证失败: UNSUPPORTED_EXTENSION: 不支持的文件扩展名: .txt",
      );
    });

    test("should reject files over size limit", async () => {
      // Create a mock oversized file
      const hugeFile = {
        name: "huge.mp3",
        type: "audio/mpeg",
        size: 101 * 1024 * 1024, // 101MB
        slice: jest.fn().mockReturnValue(new Blob(["chunk"])),
      };

      // Mock validation to fail for oversized files
      mockFileValidation.validateFileWithSecurity.mockResolvedValue({
        isValid: false,
        errors: [
          {
            code: "FILE_TOO_LARGE",
            message: "文件过大，存在安全风险",
            severity: "error",
            field: "size",
          },
        ],
        warnings: [],
        info: [],
        fileType: "audio/mpeg",
        fileSize: hugeFile.size,
        securityScore: 70,
      });

      await expect(uploadFile(hugeFile as any)).rejects.toThrow(
        "文件验证失败: FILE_TOO_LARGE: 文件过大，存在安全风险",
      );
    });

    test("should upload file with warnings", async () => {
      const fileWithWarnings = new File(["content"], "warning.mp3", {
        type: "audio/mpeg",
      });

      // Mock validation with warnings but no errors
      mockFileValidation.validateFileWithSecurity.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [
          {
            code: "EXTENSION_MISMATCH",
            message: "文件扩展名.mp3与实际文件类型audio/wav不匹配",
            severity: "warning",
            field: "extension",
          },
        ],
        info: [
          {
            code: "AUDIO_PROPERTIES",
            message: "音频文件验证通过",
            severity: "info",
            field: "audio",
          },
        ],
        fileType: "audio/wav",
        fileSize: fileWithWarnings.size,
        securityScore: 85,
      });

      mockDbUtils.addFile.mockResolvedValue(mockFileId);

      const result = await uploadFile(fileWithWarnings);

      expect(result).toBe(mockFileId);
      expect(mockFileValidation.validateFileWithSecurity).toHaveBeenCalled();
    });
  });

  describe("getFileBlob", () => {
    test("should return blob for regular file", async () => {
      const mockBlob = new Blob(["test"], { type: "audio/mpeg" });
      mockDbUtils.getFile.mockResolvedValue({
        id: mockFileId,
        name: "test.mp3",
        size: 4,
        type: "audio/mpeg",
        blob: mockBlob,
        isChunked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getFileBlob(mockFileId);

      expect(result).toBe(mockBlob);
    });

    test("should reassemble chunks for chunked file", async () => {
      // Create mock chunks with proper Blob objects
      const mockChunk1 = {
        id: 1,
        fileId: mockFileId,
        chunkIndex: 0,
        chunkSize: 1024,
        offset: 0,
        data: new Blob(["chunk1"]),
        createdAt: new Date(),
      };
      const mockChunk2 = {
        id: 2,
        fileId: mockFileId,
        chunkIndex: 1,
        chunkSize: 1024,
        offset: 1024,
        data: new Blob(["chunk2"]),
        createdAt: new Date(),
      };

      mockDbUtils.getFile.mockResolvedValue({
        id: mockFileId,
        name: "test.mp3",
        size: 2048,
        type: "audio/mpeg",
        isChunked: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockDbUtils.getFileChunks.mockResolvedValue([mockChunk1, mockChunk2]);
      mockDbUtils.getFileChunksCount.mockResolvedValue(2);

      const result = await getFileBlob(mockFileId);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("audio/mpeg");
      // Check that chunks were properly sorted and processed
      expect(mockDbUtils.getFileChunks).toHaveBeenCalledWith(mockFileId);
    });

    test("should throw error if file not found", async () => {
      mockDbUtils.getFile.mockResolvedValue(undefined);

      await expect(getFileBlob(999)).rejects.toThrow("File not found");
    });

    test("should throw error if no chunks found for chunked file", async () => {
      mockDbUtils.getFile.mockResolvedValue({
        id: mockFileId,
        name: "test.mp3",
        size: 10,
        type: "audio/mpeg",
        isChunked: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockDbUtils.getFileChunks.mockResolvedValue([]);
      mockDbUtils.getFileChunksCount.mockResolvedValue(2);

      await expect(getFileBlob(mockFileId)).rejects.toThrow("No chunks found for file");
    });
  });

  describe("getStorageUsage", () => {
    test("should return storage statistics", async () => {
      const mockStats = {
        totalSize: 100 * 1024 * 1024,
        chunkedFiles: 2,
        regularFiles: 5,
        chunksCount: 24,
        usagePercentage: 20,
      };

      const mockFiles = [
        { id: 1, name: "file1.mp3", size: 50 * 1024 * 1024 },
        { id: 2, name: "file2.mp3", size: 50 * 1024 * 1024 },
      ];

      mockDbUtils.getStorageStats.mockResolvedValue(mockStats);
      mockDbUtils.getAllFiles.mockResolvedValue(mockFiles as any);

      const result = await getStorageUsage();

      expect(result).toEqual({
        totalFiles: 2,
        totalSize: mockStats.totalSize,
        averageFileSize: mockStats.totalSize / 2,
        chunkedFiles: 2,
        regularFiles: 5,
        usagePercentage: 20,
      });
    });
  });

  describe("validateFile (enhanced)", () => {
    test("should return enhanced validation result", async () => {
      const testFile = new File(["test"], "test.mp3", { type: "audio/mpeg" });

      // Mock enhanced validation
      mockFileValidation.validateFileWithSecurity.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [
          {
            code: "AUDIO_TOO_LONG",
            message: "音频文件过长，最大支持2小时",
            severity: "warning",
            field: "duration",
          },
        ],
        info: [
          {
            code: "AUDIO_PROPERTIES",
            message: "音频文件验证通过",
            severity: "info",
            field: "audio",
          },
        ],
        fileType: "audio/mpeg",
        fileSize: testFile.size,
        securityScore: 90,
        audioProperties: {
          duration: 180,
          sampleRate: 44100,
          channels: 2,
          bitRate: 320,
          format: "audio/mpeg",
        },
      });

      const result = await validateFile(testFile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]).toBe("音频文件过长，最大支持2小时");
      expect(result.securityScore).toBe(90);
      expect(result.fileType).toBe("audio/mpeg");
    });

    test("should handle validation failure", async () => {
      const testFile = new File(["test"], "test.txt", { type: "text/plain" });

      // Mock validation failure
      mockFileValidation.validateFileWithSecurity.mockResolvedValue({
        isValid: false,
        errors: [
          {
            code: "UNSUPPORTED_EXTENSION",
            message: "不支持的文件扩展名: .txt",
            severity: "error",
            field: "extension",
          },
        ],
        warnings: [],
        info: [],
        fileType: "text/plain",
        fileSize: testFile.size,
        securityScore: 0,
      });

      const result = await validateFile(testFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("不支持的文件扩展名: .txt");
      expect(result.warnings).toHaveLength(0);
      expect(result.securityScore).toBe(0);
    });
  });

  describe("getDetailedValidationReport", () => {
    test("should return detailed validation report", async () => {
      const testFile = new File(["test"], "test.mp3", { type: "audio/mpeg" });

      const mockReport = {
        isValid: true,
        errors: [],
        warnings: [
          {
            code: "EXTENSION_MISMATCH",
            message: "文件扩展名和实际类型不匹配",
            severity: "warning" as const,
            field: "extension",
            details: { extension: "mp3", detectedType: "audio/wav" },
          },
        ],
        info: [
          {
            code: "AUDIO_PROPERTIES",
            message: "音频文件验证通过",
            severity: "info" as const,
            field: "audio",
            details: { duration: 120, sampleRate: 44100 },
          },
        ],
        fileType: "audio/wav",
        fileSize: testFile.size,
        securityScore: 85,
        audioProperties: {
          duration: 120,
          sampleRate: 44100,
          channels: 2,
          format: "audio/wav",
        },
      };

      mockFileValidation.validateFileWithSecurity.mockResolvedValue(mockReport);

      const result = await getDetailedValidationReport(testFile);

      expect(result).toEqual(mockReport);
      expect(result.isValid).toBe(true);
      expect(result.warnings[0].details).toBeDefined();
      expect(result.audioProperties).toBeDefined();
    });
  });
});
