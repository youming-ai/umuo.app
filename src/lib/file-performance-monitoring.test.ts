/**
 * 文件性能监控测试
 */

import { FilePerformanceMonitoring, FileOperation } from "./file-performance-monitoring";
import { PerformanceMonitoring, MetricCategory } from "./performance-monitoring";

// Mock PerformanceMonitoring
jest.mock("./performance-monitoring");
const MockedPerformanceMonitoring = PerformanceMonitoring as jest.MockedClass<
  typeof PerformanceMonitoring
>;

describe("FilePerformanceMonitoring", () => {
  let fileMonitoring: FilePerformanceMonitoring;
  let mockPerformanceMonitoring: jest.Mocked<PerformanceMonitoring>;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 创建mock实例
    mockPerformanceMonitoring =
      new MockedPerformanceMonitoring() as jest.Mocked<PerformanceMonitoring>;
    fileMonitoring = new FilePerformanceMonitoring({}, mockPerformanceMonitoring);
  });

  describe("constructor", () => {
    test("应该使用提供的配置创建文件监控实例", () => {
      const config = {
        enabled: false,
        samplingRate: 0.5,
        maxHistorySize: 100,
      };

      const customFileMonitoring = new FilePerformanceMonitoring(config, mockPerformanceMonitoring);

      expect(customFileMonitoring).toBeInstanceOf(FilePerformanceMonitoring);
    });

    test("应该使用默认配置创建文件监控实例", () => {
      expect(fileMonitoring).toBeInstanceOf(FilePerformanceMonitoring);
    });
  });

  describe("startFileOperation and endFileOperation", () => {
    test("应该正确开始和结束文件操作", () => {
      const operation = FileOperation.UPLOAD;
      const fileSize = 1024 * 1024; // 1MB

      const operationId = fileMonitoring.startFileOperation(operation, fileSize);

      expect(typeof operationId).toBe("string");
      expect(operationId).toContain("upload");

      // 模拟一些处理时间
      jest.advanceTimersByTime(100);

      const metric = fileMonitoring.endFileOperation(operationId, true);

      expect(metric).toBeTruthy();
      expect(metric).toMatchObject({
        operation,
        fileSize,
        processingTime: expect.any(Number),
        transferSpeed: expect.any(Number),
        success: true,
      });

      expect(metric!.processingTime).toBeGreaterThan(90);
      expect(metric!.transferSpeed).toBeGreaterThan(0);
    });

    test("应该记录失败的操作", () => {
      const operation = FileOperation.VALIDATION;
      const fileSize = 512 * 1024; // 512KB

      const operationId = fileMonitoring.startFileOperation(operation, fileSize);
      const errorMessage = "Validation failed";

      const metric = fileMonitoring.endFileOperation(operationId, false, errorMessage);

      expect(metric).toMatchObject({
        operation,
        fileSize,
        success: false,
        error: errorMessage,
      });
    });

    test("应该处理不存在的操作ID", () => {
      const metric = fileMonitoring.endFileOperation("nonexistent_operation");

      expect(metric).toBeNull();
    });

    test("应该在监控禁用时返回空字符串", () => {
      const disabledMonitoring = new FilePerformanceMonitoring(
        { enabled: false },
        mockPerformanceMonitoring,
      );

      const operationId = disabledMonitoring.startFileOperation(FileOperation.UPLOAD, 1024);

      expect(operationId).toBe("");
    });
  });

  describe("recordChunkingMetrics", () => {
    test("应该记录分块指标", () => {
      const operationId = fileMonitoring.startFileOperation(FileOperation.UPLOAD, 10 * 1024 * 1024); // 10MB
      const chunksCount = 3;
      const chunkSize = 1024 * 1024; // 1MB
      const chunkingTime = 500;

      fileMonitoring.recordChunkingMetrics(operationId, chunksCount, chunkSize, chunkingTime);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "file_chunking_time",
        MetricCategory.FILE_PROCESSING,
        chunkingTime,
        "ms",
        { operation: FileOperation.UPLOAD },
        {
          fileSize: 10 * 1024 * 1024,
          chunksCount,
          chunkSize,
        },
      );

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "file_chunks_count",
        MetricCategory.FILE_PROCESSING,
        chunksCount,
        "count",
        { operation: FileOperation.UPLOAD },
        {
          fileSize: 10 * 1024 * 1024,
          chunkSize,
        },
      );
    });

    test("应该在监控禁用时不记录指标", () => {
      const disabledMonitoring = new FilePerformanceMonitoring(
        { enabled: false, trackDetailedMetrics: true },
        mockPerformanceMonitoring,
      );

      disabledMonitoring.recordChunkingMetrics("test_id", 3, 1024 * 1024, 500);

      expect(mockPerformanceMonitoring.recordMetric).not.toHaveBeenCalled();
    });

    test("应该在详细指标禁用时不记录", () => {
      const simpleMonitoring = new FilePerformanceMonitoring(
        { enabled: true, trackDetailedMetrics: false },
        mockPerformanceMonitoring,
      );

      simpleMonitoring.recordChunkingMetrics("test_id", 3, 1024 * 1024, 500);

      expect(mockPerformanceMonitoring.recordMetric).not.toHaveBeenCalled();
    });
  });

  describe("recordValidationMetrics", () => {
    test("应该记录验证指标", () => {
      const operationId = fileMonitoring.startFileOperation(FileOperation.VALIDATION, 1024 * 1024);
      const validationTime = 200;
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [{ code: "warning1", message: "Test warning" }],
        securityScore: 95,
      };

      fileMonitoring.recordValidationMetrics(operationId, validationTime, validationResult);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "file_validation_time",
        MetricCategory.FILE_PROCESSING,
        validationTime,
        "ms",
        { operation: FileOperation.VALIDATION },
        {
          isValid: validationResult.isValid,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
          securityScore: validationResult.securityScore,
        },
      );

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "file_validation_score",
        MetricCategory.FILE_PROCESSING,
        validationResult.securityScore,
        "score",
        { operation: FileOperation.VALIDATION },
        {
          isValid: validationResult.isValid,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
        },
      );
    });

    test("应该记录无效的验证结果", () => {
      const operationId = fileMonitoring.startFileOperation(FileOperation.VALIDATION, 1024 * 1024);
      const validationTime = 150;
      const validationResult = {
        isValid: false,
        errors: [{ code: "error1", message: "Test error" }],
        warnings: [],
        securityScore: 30,
      };

      fileMonitoring.recordValidationMetrics(operationId, validationTime, validationResult);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "file_validation_score",
        MetricCategory.FILE_PROCESSING,
        validationResult.securityScore,
        "score",
        { operation: FileOperation.VALIDATION },
        expect.objectContaining({
          isValid: validationResult.isValid,
          errorCount: validationResult.errors.length,
        }),
      );
    });
  });

  describe("recordStorageMetrics", () => {
    test("应该记录存储指标", () => {
      const operationId = fileMonitoring.startFileOperation(FileOperation.STORAGE, 5 * 1024 * 1024); // 5MB
      const storageTime = 300;
      const storageMethod = "indexeddb";
      const compressedSize = 3 * 1024 * 1024; // 3MB

      fileMonitoring.recordStorageMetrics(operationId, storageTime, storageMethod, compressedSize);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "file_storage_time",
        MetricCategory.FILE_PROCESSING,
        storageTime,
        "ms",
        { operation: FileOperation.STORAGE, storageMethod },
        {
          fileSize: 5 * 1024 * 1024,
          compressedSize,
          compressionRatio: 60, // 3MB / 5MB * 100 = 60%
        },
      );

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "file_compression_ratio",
        MetricCategory.FILE_PROCESSING,
        60,
        "percent",
        { operation: FileOperation.STORAGE, storageMethod },
        {
          originalSize: 5 * 1024 * 1024,
          compressedSize,
        },
      );
    });

    test("应该记录未压缩的存储指标", () => {
      const operationId = fileMonitoring.startFileOperation(FileOperation.STORAGE, 2 * 1024 * 1024);
      const storageTime = 100;
      const storageMethod = "memory";

      fileMonitoring.recordStorageMetrics(operationId, storageTime, storageMethod);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "file_compression_ratio",
        MetricCategory.FILE_PROCESSING,
        100,
        "percent",
        { operation: FileOperation.STORAGE, storageMethod },
        expect.objectContaining({
          originalSize: 2 * 1024 * 1024,
        }),
      );
    });
  });

  describe("getFileProcessingStats", () => {
    test("应该计算正确的文件处理统计", () => {
      // 添加一些测试指标
      fileMonitoring.startFileOperation(FileOperation.UPLOAD, 1024 * 1024);
      fileMonitoring.endFileOperation("upload_1", true);

      fileMonitoring.startFileOperation(FileOperation.UPLOAD, 2 * 1024 * 1024);
      fileMonitoring.endFileOperation("upload_2", false, "Upload failed");

      fileMonitoring.startFileOperation(FileOperation.VALIDATION, 512 * 1024);
      fileMonitoring.endFileOperation("validation_1", true);

      const stats = fileMonitoring.getFileProcessingStats();

      expect(stats).toMatchObject({
        totalFiles: 3,
        totalSize: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        averageTransferSpeed: expect.any(Number),
        successRate: expect.any(Number),
        errorBreakdown: expect.any(Object),
        sizeDistribution: expect.any(Object),
        operationBreakdown: expect.any(Object),
      });

      expect(stats.successRate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
      expect(stats.errorBreakdown).toHaveProperty("Upload failed", 1);
      expect(stats.operationBreakdown).toHaveProperty(FileOperation.UPLOAD);
      expect(stats.operationBreakdown).toHaveProperty(FileOperation.VALIDATION);
    });

    test("应该返回空的统计信息如果没有数据", () => {
      const stats = fileMonitoring.getFileProcessingStats();

      expect(stats).toMatchObject({
        totalFiles: 0,
        totalSize: 0,
        averageProcessingTime: 0,
        averageTransferSpeed: 0,
        successRate: 0,
        errorBreakdown: {},
        sizeDistribution: { small: 0, medium: 0, large: 0, huge: 0 },
        operationBreakdown: expect.any(Object),
      });
    });
  });

  describe("getRealTimeMetrics", () => {
    test("应该计算实时性能指标", () => {
      // 添加一些最近的操作
      fileMonitoring.startFileOperation(FileOperation.UPLOAD, 1024 * 1024);
      fileMonitoring.endFileOperation("recent_1", true);

      fileMonitoring.startFileOperation(FileOperation.VALIDATION, 512 * 1024);
      fileMonitoring.endFileOperation("recent_2", false, "Validation failed");

      const realTimeMetrics = fileMonitoring.getRealTimeMetrics();

      expect(realTimeMetrics).toMatchObject({
        currentOperations: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        successRate: expect.any(Number),
        throughput: expect.any(Number),
        errorRate: expect.any(Number),
      });

      expect(realTimeMetrics.successRate).toBeCloseTo(50, 1); // 1/2 = 50%
      expect(realTimeMetrics.errorRate).toBeCloseTo(50, 1); // 1/2 = 50%
    });

    test("应该在没有数据时返回默认值", () => {
      const realTimeMetrics = fileMonitoring.getRealTimeMetrics();

      expect(realTimeMetrics).toMatchObject({
        currentOperations: 0,
        averageProcessingTime: 0,
        successRate: 0,
        throughput: 0,
        errorRate: 0,
      });
    });
  });

  describe("getFilePerformanceReport", () => {
    test("应该生成完整的性能报告", () => {
      // 添加一些测试数据
      fileMonitoring.startFileOperation(FileOperation.UPLOAD, 1024 * 1024);
      fileMonitoring.endFileOperation("report_1", true);

      fileMonitoring.startFileOperation(FileOperation.UPLOAD, 10 * 1024 * 1024);
      fileMonitoring.endFileOperation("report_2", false, "Large file failed");

      const report = fileMonitoring.getFilePerformanceReport();

      expect(report).toMatchObject({
        stats: expect.any(Object),
        realTimeMetrics: expect.any(Object),
        recentMetrics: expect.any(Array),
        performanceAlerts: expect.any(Array),
        timestamp: expect.any(Number),
      });

      expect(report.stats.totalFiles).toBe(2);
      expect(report.recentMetrics).toHaveLength(2);
    });

    test("应该生成性能告警", () => {
      // 添加一个失败率高的场景
      for (let i = 0; i < 10; i++) {
        fileMonitoring.startFileOperation(FileOperation.UPLOAD, 1024 * 1024);
        fileMonitoring.endFileOperation(`alert_${i}`, i < 8, i >= 8 ? "Failed" : undefined);
      }

      const report = fileMonitoring.getFilePerformanceReport();

      expect(report.performanceAlerts.length).toBeGreaterThan(0);
      expect(report.performanceAlerts.some((alert) => alert.includes("文件处理成功率低"))).toBe(
        true,
      );
    });
  });

  describe("clearHistory", () => {
    test("应该清理所有历史记录", () => {
      // 添加一些测试数据
      fileMonitoring.startFileOperation(FileOperation.UPLOAD, 1024 * 1024);
      fileMonitoring.endFileOperation("clear_test_1", true);

      fileMonitoring.startFileOperation(FileOperation.VALIDATION, 512 * 1024);
      fileMonitoring.endFileOperation("clear_test_2", false, "Test error");

      // 确认数据存在
      expect(fileMonitoring.getFileProcessingStats().totalFiles).toBe(2);

      // 清理历史
      fileMonitoring.clearHistory();

      // 确认数据已清理
      expect(fileMonitoring.getFileProcessingStats().totalFiles).toBe(0);
    });
  });

  describe("configuration edge cases", () => {
    test("应该处理采样率", () => {
      const lowSampleMonitoring = new FilePerformanceMonitoring(
        { samplingRate: 0 },
        mockPerformanceMonitoring,
      );

      const operationId = lowSampleMonitoring.startFileOperation(FileOperation.UPLOAD, 1024 * 1024);

      expect(operationId).toBe("");
    });

    test("应该限制历史记录大小", () => {
      const limitedMonitoring = new FilePerformanceMonitoring(
        { maxHistorySize: 2 },
        mockPerformanceMonitoring,
      );

      // 添加超过限制的数据
      limitedMonitoring.startFileOperation(FileOperation.UPLOAD, 1024 * 1024);
      limitedMonitoring.endFileOperation("limited_1", true);

      limitedMonitoring.startFileOperation(FileOperation.UPLOAD, 1024 * 1024);
      limitedMonitoring.endFileOperation("limited_2", true);

      limitedMonitoring.startFileOperation(FileOperation.UPLOAD, 1024 * 1024);
      limitedMonitoring.endFileOperation("limited_3", true);

      const stats = limitedMonitoring.getFileProcessingStats();
      expect(stats.totalFiles).toBe(2); // 应该只保留最新的2条
    });
  });

  describe("utility functions", () => {
    test("monitorFileOperation应该监控同步操作", () => {
      const testFunction = () => {
        // 模拟文件处理
        return "processed";
      };

      const result = (fileMonitoring as any).monitorFileOperation(
        FileOperation.UPLOAD,
        1024 * 1024,
        testFunction,
      );

      expect(result).toBe("processed");

      const stats = fileMonitoring.getFileProcessingStats();
      expect(stats.totalFiles).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    test("monitorAsyncFileOperation应该监控异步操作", async () => {
      const testFunction = async () => {
        // 模拟异步文件处理
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async_processed";
      };

      const result = await (fileMonitoring as any).monitorAsyncFileOperation(
        FileOperation.PROCESSING,
        512 * 1024,
        testFunction,
      );

      expect(result).toBe("async_processed");

      const stats = fileMonitoring.getFileProcessingStats();
      expect(stats.totalFiles).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    test("应该正确处理操作中的错误", () => {
      const testFunction = () => {
        throw new Error("File processing failed");
      };

      expect(() => {
        (fileMonitoring as any).monitorFileOperation(
          FileOperation.UPLOAD,
          1024 * 1024,
          testFunction,
        );
      }).toThrow("File processing failed");

      const stats = fileMonitoring.getFileProcessingStats();
      expect(stats.totalFiles).toBe(1);
      expect(stats.successRate).toBe(0);
    });
  });
});

// 全局函数测试
describe("Global File Performance Monitoring Functions", () => {
  beforeEach(() => {
    // 重置全局实例
    (global as any).globalFilePerformanceMonitoring = null;
    jest.clearAllMocks();
  });

  test("getFilePerformanceMonitoring应该返回单例实例", () => {
    const { getFilePerformanceMonitoring } = require("./file-performance-monitoring");

    const instance1 = getFilePerformanceMonitoring();
    const instance2 = getFilePerformanceMonitoring();

    expect(instance1).toBe(instance2);
  });

  test("initializeFilePerformanceMonitoring应该创建实例", () => {
    const {
      initializeFilePerformanceMonitoring,
      getFilePerformanceMonitoring,
    } = require("./file-performance-monitoring");

    initializeFilePerformanceMonitoring();

    const instance = getFilePerformanceMonitoring();
    expect(instance).toBeDefined();
  });
});
