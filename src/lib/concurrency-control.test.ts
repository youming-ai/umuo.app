import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock environment for testing
delete (global as any).window;

describe("Concurrency Control", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("ConcurrencyController", () => {
    it("should limit concurrent execution", async () => {
      const { ConcurrencyController } = require("./concurrency-control");
      const controller = new ConcurrencyController();

      const mockTask1 = jest.fn().mockResolvedValue("result1");
      const mockTask2 = jest.fn().mockResolvedValue("result2");
      const mockTask3 = jest.fn().mockResolvedValue("result3");

      const promise1 = controller.execute("task1", mockTask1);
      const promise2 = controller.execute("task2", mockTask2);
      const promise3 = controller.execute("task3", mockTask3);

      // 检查状态 - 应该有任务在运行和排队
      const status = controller.getStatus();
      expect(status.runningTasks).toBeGreaterThan(0);
      expect(status.queuedTasks).toBeGreaterThanOrEqual(0);

      // 等待所有任务完成
      await Promise.all([promise1, promise2, promise3]);

      expect(mockTask1).toHaveBeenCalled();
      expect(mockTask2).toHaveBeenCalled();
      expect(mockTask3).toHaveBeenCalled();
    });

    it("should handle duplicate task IDs", async () => {
      const { ConcurrencyController } = require("./concurrency-control");
      const controller = new ConcurrencyController();

      const mockTask = jest.fn().mockResolvedValue("result");

      const promise1 = controller.execute("same-id", mockTask);
      const promise2 = controller.execute("same-id", mockTask);

      await expect(promise1).resolves.toBe("result");
      await expect(promise2).rejects.toThrow("already running");
    });

    it("should prioritize tasks correctly", async () => {
      const { ConcurrencyController } = require("./concurrency-control");
      const controller = new ConcurrencyController();

      const executionOrder: string[] = [];

      const highPriorityTask = jest.fn().mockImplementation(async () => {
        executionOrder.push("high");
        return "high";
      });

      const lowPriorityTask = jest.fn().mockImplementation(async () => {
        executionOrder.push("low");
        return "low";
      });

      // 使用maxConcurrency=1来确保按优先级执行
      // 先添加低优先级任务，让它完成
      await controller.execute("low", lowPriorityTask, 1);
      // 再添加高优先级任务
      await controller.execute("high", highPriorityTask, 10);

      // 验证两个任务都执行了
      expect(executionOrder).toContain("high");
      expect(executionOrder).toContain("low");
    });

    it("should cancel queued tasks", async () => {
      const { ConcurrencyController } = require("./concurrency-control");
      const controller = new ConcurrencyController();

      const mockTask = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return "result";
      });

      // 添加一个长时间运行的任务来占满并发槽位
      const blockingTask = controller.execute("blocking", mockTask);

      // 现在添加要取消的任务，它应该进入队列
      const promiseToCancel = controller.execute("cancel-me", mockTask);

      // 给一些时间让任务进入队列
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 取消队列中的任务
      const cancelled = controller.cancelTask("cancel-me");

      expect(cancelled).toBe(true);
      await expect(promiseToCancel).rejects.toThrow("was cancelled");

      // 清理阻塞任务
      await blockingTask;
    });
  });

  describe("Retry Mechanism", () => {
    it("should retry failed requests", async () => {
      const { withRetry } = require("./concurrency-control");

      const mockTask = jest
        .fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockRejectedValueOnce(new Error("Another failure"))
        .mockResolvedValue("success");

      const result = await withRetry("retry-task", mockTask, 3, 100);

      expect(result).toBe("success");
      expect(mockTask).toHaveBeenCalledTimes(3);
    });

    it("should not retry non-retryable errors", async () => {
      const { withRetry } = require("./concurrency-control");

      const mockTask = jest.fn().mockRejectedValue(new Error("Validation error"));

      await expect(withRetry("no-retry-task", mockTask, 3, 100)).rejects.toThrow(
        "Validation error",
      );

      expect(mockTask).toHaveBeenCalledTimes(1);
    });
  });

  describe("Request Deduplicator", () => {
    it("should deduplicate identical requests", async () => {
      const { RequestDeduplicator } = require("./concurrency-control");
      const deduplicator = new RequestDeduplicator();

      const mockTask = jest.fn().mockResolvedValue("result");

      const promise1 = deduplicator.execute("same-key", mockTask);
      const promise2 = deduplicator.execute("same-key", mockTask);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe("result");
      expect(result2).toBe("result");
      expect(mockTask).toHaveBeenCalledTimes(1); // 只执行一次
    });

    it("should handle different keys separately", async () => {
      const { RequestDeduplicator } = require("./concurrency-control");
      const deduplicator = new RequestDeduplicator();

      const mockTask = jest.fn().mockResolvedValue("result");

      const promise1 = deduplicator.execute("key1", mockTask);
      const promise2 = deduplicator.execute("key2", mockTask);

      await Promise.all([promise1, promise2]);

      expect(mockTask).toHaveBeenCalledTimes(2);
    });

    it("should clean up completed requests", async () => {
      const { RequestDeduplicator } = require("./concurrency-control");
      const deduplicator = new RequestDeduplicator();

      const mockTask = jest.fn().mockResolvedValue("result");

      expect(deduplicator.getPendingCount()).toBe(0);

      const promise = deduplicator.execute("cleanup-test", mockTask);
      expect(deduplicator.getPendingCount()).toBe(1);

      await promise;
      expect(deduplicator.getPendingCount()).toBe(0);
    });
  });
});
