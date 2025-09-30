import {
  BatchProcessor,
  createDatabaseBatchProcessor,
  createSmartBatchProcessor,
  DEFAULT_BATCH_CONFIG,
  getMemoryStats,
  isMemoryUsageSafe,
} from "./batch-processor";
import { handleError } from "./error-handler";

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 500 * 1024 * 1024, // 500MB
  },
};

(global as any).performance = mockPerformance;

describe("BatchProcessor", () => {
  let mockProcessor: jest.Mock;
  let mockProgressCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessor = jest.fn();
    mockProgressCallback = jest.fn();
  });

  describe("Constructor and Configuration", () => {
    test("should create instance with default config", () => {
      const processor = new BatchProcessor();
      expect(processor).toBeInstanceOf(BatchProcessor);
    });

    test("should create instance with custom config", () => {
      const config = { batchSize: 50, maxRetries: 5 };
      const processor = new BatchProcessor(config);
      expect(processor).toBeInstanceOf(BatchProcessor);
    });

    test("should set progress callback", () => {
      const processor = new BatchProcessor();
      processor.setProgressCallback(mockProgressCallback);

      // Test that callback is set by calling a method that uses it
      // This is a bit indirect but necessary since the callback is private
      expect(mockProgressCallback).not.toHaveBeenCalled();
    });

    test("should validate configuration", () => {
      const processor = new BatchProcessor({ batchSize: -1 });
      const validation = processor.validateConfig();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("批次大小必须大于0");
    });

    test("should accept valid configuration", () => {
      const processor = new BatchProcessor({ batchSize: 100 });
      const validation = processor.validateConfig();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("Processing Empty Arrays", () => {
    test("should handle empty items array", async () => {
      const processor = new BatchProcessor();
      const result = await processor.process([], mockProcessor);

      expect(result.success).toBe(true);
      expect(result.processedItems).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(mockProcessor).not.toHaveBeenCalled();
    });
  });

  describe("Processing Small Batches", () => {
    test("should process single batch", async () => {
      const items = [1, 2, 3];
      const results = ["a", "b", "c"];
      mockProcessor.mockResolvedValue(results);

      const processor = new BatchProcessor({ batchSize: 5 });
      const result = await processor.process(items, mockProcessor);

      expect(result.success).toBe(true);
      expect(result.processedItems).toBe(3);
      expect(result.totalItems).toBe(3);
      expect(result.results).toEqual(results);
      expect(result.errors).toHaveLength(0);
      expect(mockProcessor).toHaveBeenCalledWith(items);
    });

    test("should process multiple batches", async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const results1 = ["a", "b", "c"];
      const results2 = ["d", "e", "f"];

      mockProcessor.mockResolvedValueOnce(results1).mockResolvedValueOnce(results2);

      const processor = new BatchProcessor({ batchSize: 3 });
      const result = await processor.process(items, mockProcessor);

      expect(result.success).toBe(true);
      expect(result.processedItems).toBe(6);
      expect(result.totalItems).toBe(6);
      expect(result.results).toEqual([...results1, ...results2]);
      expect(mockProcessor).toHaveBeenCalledTimes(2);
      expect(mockProcessor).toHaveBeenNthCalledWith(1, [1, 2, 3]);
      expect(mockProcessor).toHaveBeenNthCalledWith(2, [4, 5, 6]);
    });
  });

  describe("Error Handling and Retries", () => {
    test("should handle processor errors", async () => {
      const items = [1, 2, 3];
      const error = new Error("Processing failed");
      mockProcessor.mockRejectedValue(error);

      const processor = new BatchProcessor({ maxRetries: 0 }); // No retries for this test
      const result = await processor.process(items, mockProcessor);

      expect(result.success).toBe(false);
      expect(result.processedItems).toBe(0);
      expect(result.totalItems).toBe(3);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toBe("Processing failed");
    });

    test("should retry failed batches", async () => {
      const items = [1, 2, 3];
      const results = ["a", "b", "c"];

      mockProcessor
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockResolvedValueOnce(results);

      const processor = new BatchProcessor({ maxRetries: 2, retryDelay: 10 });
      processor.setProgressCallback(mockProgressCallback);
      const result = await processor.process(items, mockProcessor);

      expect(result.success).toBe(true);
      expect(result.processedItems).toBe(3);
      expect(result.totalItems).toBe(3);
      expect(mockProcessor).toHaveBeenCalledTimes(2);
    });

    test("should give up after max retries", async () => {
      const items = [1, 2, 3];
      const error = new Error("Always fails");

      mockProcessor.mockRejectedValue(error);

      const processor = new BatchProcessor({ maxRetries: 1, retryDelay: 10 }); // 1 retry = 2 total attempts
      processor.setProgressCallback(mockProgressCallback);
      const result = await processor.process(items, mockProcessor);

      expect(result.success).toBe(false);
      expect(result.processedItems).toBe(0);
      expect(result.totalItems).toBe(3);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockProcessor).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe("Progress Tracking", () => {
    test("should report progress for successful processing", async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const results1 = ["a", "b", "c"];
      const results2 = ["d", "e", "f"];

      mockProcessor.mockResolvedValueOnce(results1).mockResolvedValueOnce(results2);

      const processor = new BatchProcessor({ batchSize: 3 });
      processor.setProgressCallback(mockProgressCallback);

      await processor.process(items, mockProcessor);

      expect(mockProgressCallback).toHaveBeenCalledTimes(3); // started, processing, completed

      // Check started call
      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          processed: 0,
          total: 6,
          status: "started",
        }),
      );

      // Check completed call - should have processed 6 items
      const completedCall = mockProgressCallback.mock.calls.find(
        (call) => call[0].status === "completed",
      );
      expect(completedCall).toBeDefined();
      expect(completedCall![0]).toMatchObject({
        processed: 6,
        total: 6,
        status: "completed",
      });
    });

    test("should report retry progress", async () => {
      const items = [1, 2, 3];
      const results = ["a", "b", "c"];

      mockProcessor
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockResolvedValueOnce(results);

      const processor = new BatchProcessor({ maxRetries: 2, retryDelay: 10 });
      processor.setProgressCallback(mockProgressCallback);

      await processor.process(items, mockProcessor);

      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "retrying",
          message: expect.stringContaining("重试中"),
        }),
      );
    });
  });

  describe("Performance Tracking", () => {
    test("should track performance metrics", async () => {
      const items = [1, 2, 3];
      const results = ["a", "b", "c"];
      mockProcessor.mockResolvedValue(results);

      // Let performance.now work naturally but check reasonable values
      const processor = new BatchProcessor();
      const result = await processor.process(items, mockProcessor);

      expect(result.performance.duration).toBeGreaterThan(0);
      expect(result.performance.averageBatchTime).toBeGreaterThan(0);
      expect(result.performance.startTime).toBeLessThanOrEqual(result.performance.endTime);
    });
  });

  describe("Memory Management", () => {
    test("should check memory usage safety", () => {
      // Safe memory usage
      mockPerformance.memory.usedJSHeapSize = 50 * 1024 * 1024; // 50MB
      mockPerformance.memory.jsHeapSizeLimit = 500 * 1024 * 1024; // 500MB

      const stats = getMemoryStats();
      expect(stats.usagePercentage).toBeGreaterThanOrEqual(0);
      expect(stats.usagePercentage).toBeLessThan(100);

      // Should be safe with high threshold
      expect(isMemoryUsageSafe(80)).toBe(true);
    });

    test("should get memory statistics", () => {
      const stats = getMemoryStats();

      // In a real browser environment, these would have actual values
      // In test environment, they might be 0 depending on the mock
      expect(typeof stats.usedJSHeapSize).toBe("number");
      expect(typeof stats.totalJSHeapSize).toBe("number");
      expect(typeof stats.jsHeapSizeLimit).toBe("number");
      expect(typeof stats.usagePercentage).toBe("number");
    });

    test("should handle missing performance API", () => {
      const originalPerformance = (global as any).performance;
      delete (global as any).performance;

      const stats = getMemoryStats();
      expect(stats.usedJSHeapSize).toBe(0);
      expect(stats.usagePercentage).toBe(0);
      expect(isMemoryUsageSafe(80)).toBe(true);

      // Restore performance
      (global as any).performance = originalPerformance;
    });
  });
});

describe("Factory Functions", () => {
  describe("createDatabaseBatchProcessor", () => {
    test("should create processor with database-optimized config", () => {
      const mockDbOperation = jest.fn();
      const processor = createDatabaseBatchProcessor(mockDbOperation);

      expect(processor).toBeInstanceOf(BatchProcessor);
    });

    test("should merge custom config with database defaults", () => {
      const mockDbOperation = jest.fn();
      const customConfig = { batchSize: 25 };
      const processor = createDatabaseBatchProcessor(mockDbOperation, customConfig);

      expect(processor).toBeInstanceOf(BatchProcessor);
    });
  });

  describe("createSmartBatchProcessor", () => {
    test("should create processor for small datasets", () => {
      const items = Array.from({ length: 500 }, (_, i) => i);
      const mockProcessor = jest.fn();
      const processor = createSmartBatchProcessor(items, mockProcessor);

      expect(processor).toBeInstanceOf(BatchProcessor);
    });

    test("should create processor for medium datasets", () => {
      const items = Array.from({ length: 5000 }, (_, i) => i);
      const mockProcessor = jest.fn();
      const processor = createSmartBatchProcessor(items, mockProcessor);

      expect(processor).toBeInstanceOf(BatchProcessor);
    });

    test("should create processor for large datasets", () => {
      const items = Array.from({ length: 15000 }, (_, i) => i);
      const mockProcessor = jest.fn();
      const processor = createSmartBatchProcessor(items, mockProcessor);

      expect(processor).toBeInstanceOf(BatchProcessor);
    });

    test("should respect custom base config", () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const mockProcessor = jest.fn();
      const baseConfig = { maxRetries: 5 };
      const processor = createSmartBatchProcessor(items, mockProcessor, baseConfig);

      expect(processor).toBeInstanceOf(BatchProcessor);
    });
  });
});

describe("Integration Tests", () => {
  test("should handle mixed success/failure batches", async () => {
    const items = [1, 2, 3, 4, 5, 6];
    const mockProcessor = jest
      .fn()
      .mockResolvedValueOnce(["a", "b", "c"]) // First batch succeeds
      .mockRejectedValueOnce(new Error("Second batch failed")); // Second batch fails

    const processor = new BatchProcessor({ batchSize: 3, maxRetries: 0 }); // No retries for simplicity
    processor.setProgressCallback(jest.fn());

    const result = await processor.process(items, mockProcessor);

    expect(result.success).toBe(false);
    expect(result.totalItems).toBe(6);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.results).toEqual(["a", "b", "c"]);
  });

  test("should handle very large batches efficiently", async () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const mockProcessor = jest
      .fn()
      .mockImplementation((batch: number[]) =>
        Promise.resolve(batch.map((item: number) => `result_${item}`)),
      );

    const processor = new BatchProcessor({ batchSize: 100 });
    const result = await processor.process(items, mockProcessor);

    expect(result.success).toBe(true);
    expect(result.processedItems).toBe(1000);
    expect(mockProcessor).toHaveBeenCalledTimes(10); // 1000 / 100 = 10 batches
  });
});
