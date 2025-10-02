/**
 * 转录并发控制测试
 * 测试请求队列、并发限制和资源管理
 */

import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import { TranscriptionConcurrencyManager } from "./transcription-concurrency";
import { getTranscriptionConfig } from "./transcription-config";

// Mock dependencies
jest.mock("./transcription-config", () => ({
  getTranscriptionConfig: jest.fn(() => ({
    maxConcurrency: 2,
    timeoutMs: 5000,
    retryCount: 3,
  })),
}));

describe("TranscriptionConcurrencyManager", () => {
  let manager: TranscriptionConcurrencyManager;

  beforeEach(() => {
    manager = new TranscriptionConcurrencyManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe("基本并发控制", () => {
    it("应该限制并发请求数量", async () => {
      const mockTranscribe = jest.fn().mockResolvedValue("result");
      let activeCount = 0;
      let maxActiveCount = 0;

      // 创建多个并发请求
      const promises = Array.from({ length: 5 }, async (_, i) => {
        return manager.execute(async () => {
          activeCount++;
          maxActiveCount = Math.max(maxActiveCount, activeCount);
          await new Promise((resolve) => setTimeout(resolve, 100));
          activeCount--;
          return mockTranscribe(i);
        }, `file-${i}`);
      });

      const results = await Promise.all(promises);

      expect(maxActiveCount).toBeLessThanOrEqual(2);
      expect(results).toHaveLength(5);
      expect(mockTranscribe).toHaveBeenCalledTimes(5);
    });

    it("应该按先进先出顺序处理队列", async () => {
      const executionOrder: number[] = [];
      const mockTranscribe = jest.fn().mockImplementation(async (id: number) => {
        executionOrder.push(id);
        await new Promise((resolve) => setTimeout(resolve, 50));
        return `result-${id}`;
      });

      // 提交多个任务
      const promises = Array.from({ length: 4 }, (_, i) =>
        manager.execute(() => mockTranscribe(i), `file-${i}`),
      );

      await Promise.all(promises);

      expect(executionOrder).toEqual([0, 1, 2, 3]);
    });

    it("应该正确处理请求取消", async () => {
      const mockTranscribe = jest.fn().mockResolvedValue("result");

      // 添加请求到队列但不执行
      const slowMock = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return "slow result";
      });

      const slowPromise = manager.execute(() => slowMock(), "slow-file");

      // 等待请求加入队列
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 取消慢请求
      const cancelled = manager.cancelRequest("slow-file");
      expect(cancelled).toBe(true);

      // 验证请求被取消
      await expect(slowPromise).rejects.toThrow("Request cancelled");
    });
  });

  describe("错误处理和重试", () => {
    it("应该处理转录错误并重试", async () => {
      let attemptCount = 0;
      const mockTranscribe = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error("Temporary failure");
        }
        return "success";
      });

      const result = await manager.execute(() => mockTranscribe(), "file-1", { retryCount: 3 });

      expect(result).toBe("success");
      expect(mockTranscribe).toHaveBeenCalledTimes(3);
    });

    it("应该在达到最大重试次数后失败", async () => {
      const mockTranscribe = jest.fn().mockRejectedValue(new Error("Persistent failure"));

      await expect(
        manager.execute(() => mockTranscribe(), "file-1", { retryCount: 2 }),
      ).rejects.toThrow("Persistent failure");

      expect(mockTranscribe).toHaveBeenCalledTimes(3); // 初始调用 + 2次重试
    });

    it("应该处理超时错误", async () => {
      const mockTranscribe = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return "result";
      });

      await expect(
        manager.execute(() => mockTranscribe(), "file-1", { timeoutMs: 100 }),
      ).rejects.toThrow("Request timeout");
    });
  });

  describe("资源管理", () => {
    it("应该跟踪活跃请求和队列状态", async () => {
      const mockTranscribe = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return "result";
      });

      expect(manager.getActiveRequestCount()).toBe(0);
      expect(manager.getQueuedRequestCount()).toBe(0);

      const promise1 = manager.execute(() => mockTranscribe(), "file-1");
      const promise2 = manager.execute(() => mockTranscribe(), "file-2");
      const promise3 = manager.execute(() => mockTranscribe(), "file-3");

      // 等待一小段时间让队列建立
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(manager.getActiveRequestCount()).toBe(2);
      expect(manager.getQueuedRequestCount()).toBe(1);

      await Promise.all([promise1, promise2, promise3]);

      expect(manager.getActiveRequestCount()).toBe(0);
      expect(manager.getQueuedRequestCount()).toBe(0);
    });

    it("应该正确清理资源", async () => {
      const mockTranscribe = jest.fn().mockResolvedValue("result");

      // 执行一些请求
      const promises = Array.from({ length: 3 }, (_, i) =>
        manager.execute(() => mockTranscribe(), `file-${i}`),
      );

      await Promise.all(promises);

      expect(manager.getActiveRequestCount()).toBe(0);
      expect(manager.getQueuedRequestCount()).toBe(0);

      // 清理后应该没有残留的请求
      manager.cleanup();

      expect(manager.getActiveRequestCount()).toBe(0);
      expect(manager.getQueuedRequestCount()).toBe(0);
    });
  });

  describe("统计和监控", () => {
    it("应该提供准确的统计信息", async () => {
      const mockTranscribeSuccess = jest.fn().mockResolvedValue("success");
      const mockTranscribeFailure = jest.fn().mockRejectedValue(new Error("failure"));

      // 成功的请求
      await manager.execute(() => mockTranscribeSuccess(), "file-1");

      // 失败的请求
      try {
        await manager.execute(() => mockTranscribeFailure(), "file-2", { retryCount: 0 });
      } catch (_error) {
        // 忽略错误
      }

      const stats = manager.getStats();

      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
      expect(stats.activeRequests).toBe(0);
      expect(stats.queuedRequests).toBe(0);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    });

    it("应该跟踪平均执行时间", async () => {
      const mockTranscribe = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "result";
      });

      // 执行多个请求
      const promises = Array.from({ length: 3 }, (_, i) =>
        manager.execute(() => mockTranscribe(), `file-${i}`),
      );

      await Promise.all(promises);

      const stats = manager.getStats();

      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(50); // 至少50ms
      expect(stats.averageExecutionTime).toBeLessThan(200); // 不超过200ms
    });
  });

  describe("配置和初始化", () => {
    it("应该使用正确的配置初始化", () => {
      const config = getTranscriptionConfig();
      const newManager = new TranscriptionConcurrencyManager(config);

      expect(newManager["maxConcurrency"]).toBe(config.maxConcurrency);
      expect(newManager["defaultTimeout"]).toBe(config.timeoutMs);
      expect(newManager["defaultRetryCount"]).toBe(config.retryCount);

      newManager.cleanup();
    });

    it("应该处理无效配置", () => {
      const invalidConfig = {
        maxConcurrency: -1,
        timeoutMs: 0,
        retryCount: -1,
      };

      const newManager = new TranscriptionConcurrencyManager(invalidConfig);

      // 应该使用默认值
      expect(newManager["maxConcurrency"]).toBeGreaterThan(0);
      expect(newManager["defaultTimeout"]).toBeGreaterThan(0);
      expect(newManager["defaultRetryCount"]).toBeGreaterThanOrEqual(0);

      newManager.cleanup();
    });
  });
});
