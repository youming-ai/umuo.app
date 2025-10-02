/**
 * 转录系统集成测试
 * 测试所有组件的协同工作
 */

import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import { getConcurrencyManager, resetConcurrencyManager } from "./transcription-concurrency";
import { getTranscriptionConfig, validateAudioFile } from "./transcription-config";
import { validateGroqApiKey, validateEnvironmentConfiguration } from "./api-key-manager";

describe("转录系统集成测试", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetConcurrencyManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetConcurrencyManager();
  });

  describe("组件集成", () => {
    it("应该正确初始化所有组件", () => {
      // 测试并发管理器
      const concurrencyManager = getConcurrencyManager();
      expect(concurrencyManager).toBeDefined();
      expect(concurrencyManager.getActiveRequestCount()).toBe(0);

      // 测试配置
      const config = getTranscriptionConfig();
      expect(config).toBeDefined();
      expect(config.timeoutMs).toBeGreaterThan(0);
      expect(config.retryCount).toBeGreaterThanOrEqual(0);
      expect(config.maxConcurrency).toBeGreaterThan(0);

      // 测试API密钥验证
      const apiKeyValidation = validateGroqApiKey("gsk_test123456789");
      expect(apiKeyValidation).toBeDefined();
      expect(typeof apiKeyValidation.isValid).toBe("boolean");
    });

    it("应该正确处理配置验证流程", () => {
      const file = {
        size: 1024 * 1024, // 1MB
        type: "audio/wav",
        name: "test.wav",
      };

      // 文件验证
      const fileValidation = validateAudioFile(file);
      expect(fileValidation.isValid).toBe(true);
      expect(fileValidation.errors).toHaveLength(0);

      // 环境配置验证
      const envValidation = validateEnvironmentConfiguration();
      expect(envValidation).toBeDefined();
      expect(typeof envValidation.isValid).toBe("boolean");
      expect(Array.isArray(envValidation.errors)).toBe(true);
      expect(Array.isArray(envValidation.warnings)).toBe(true);
    });
  });

  describe("并发管理与配置集成", () => {
    it("应该使用正确的配置创建并发管理器", () => {
      const config = getTranscriptionConfig();
      const manager = getConcurrencyManager();

      const stats = manager.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalRequests).toBe("number");
      expect(typeof stats.activeRequests).toBe("number");
      expect(typeof stats.queuedRequests).toBe("number");
    });

    it("应该正确处理并发限制", async () => {
      const manager = getConcurrencyManager();
      const mockTask = jest.fn().mockResolvedValue("result");

      // 创建多个任务
      const promises = Array.from({ length: 5 }, (_, i) =>
        manager.execute(() => mockTask(i), `task-${i}`),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockTask).toHaveBeenCalledTimes(5);
    });
  });

  describe("错误处理集成", () => {
    it("应该正确处理组件间的错误传播", async () => {
      const manager = getConcurrencyManager();
      const mockTask = jest.fn().mockRejectedValue(new Error("Test error"));

      // 一个任务失败
      const successPromise = manager.execute(() => Promise.resolve("success"), "success");
      const failurePromise = manager.execute(() => mockTask(), "failure");

      const results = await Promise.allSettled([successPromise, failurePromise]);

      expect(results[0].status).toBe("fulfilled");
      expect(results[1].status).toBe("rejected");

      if (results[1].status === "rejected") {
        expect(results[1].reason).toBeInstanceOf(Error);
        expect(results[1].reason.message).toBe("Test error");
      }
    });

    it("应该正确处理配置错误", () => {
      // 测试无效文件验证
      const invalidFile = {
        size: 1024 * 1024 * 1024, // 1GB，超过限制
        type: "audio/unsupported",
        name: "invalid.unsupported",
      };

      const fileValidation = validateAudioFile(invalidFile);
      expect(fileValidation.isValid).toBe(false);
      expect(fileValidation.errors.length).toBeGreaterThan(0);

      // 测试无效API密钥
      const apiKeyValidation = validateGroqApiKey("invalid_key");
      expect(apiKeyValidation.isValid).toBe(false);
      expect(apiKeyValidation.errors.length).toBeGreaterThan(0);
    });
  });

  describe("性能和资源管理", () => {
    it("应该正确清理资源", async () => {
      const manager = getConcurrencyManager();
      const mockTask = jest.fn().mockResolvedValue("result");

      // 执行一些任务
      const promises = Array.from({ length: 3 }, (_, i) =>
        manager.execute(() => mockTask(i), `task-${i}`),
      );

      await Promise.all(promises);

      // 检查资源状态
      expect(manager.getActiveRequestCount()).toBe(0);
      expect(manager.getQueuedRequestCount()).toBe(0);

      const stats = manager.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(3);
      expect(stats.failedRequests).toBe(0);
    });

    it("应该正确处理大量并发请求", async () => {
      const manager = getConcurrencyManager();
      const mockTask = jest.fn().mockImplementation(async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `result-${id}`;
      });

      // 创建大量任务
      const promises = Array.from({ length: 20 }, (_, i) =>
        manager.execute(() => mockTask(i), `task-${i}`),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      expect(mockTask).toHaveBeenCalledTimes(20);

      // 验证并发控制起作用（不会太慢）
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe("类型安全集成", () => {
    it("应该保持类型安全", () => {
      // 验证所有导出的函数和类型
      expect(typeof getConcurrencyManager).toBe("function");
      expect(typeof getTranscriptionConfig).toBe("function");
      expect(typeof validateAudioFile).toBe("function");
      expect(typeof validateGroqApiKey).toBe("function");

      // 验证返回值类型
      const config = getTranscriptionConfig();
      expect(typeof config.timeoutMs).toBe("number");
      expect(typeof config.retryCount).toBe("number");
      expect(typeof config.maxConcurrency).toBe("number");

      const manager = getConcurrencyManager();
      expect(typeof manager.execute).toBe("function");
      expect(typeof manager.getStats).toBe("function");
      expect(typeof manager.cancelRequest).toBe("function");
    });
  });

  describe("配置一致性", () => {
    it("应该保持配置的一致性", () => {
      const config1 = getTranscriptionConfig();
      const config2 = getTranscriptionConfig();

      // 多次调用应该返回相同的配置
      expect(config1.timeoutMs).toBe(config2.timeoutMs);
      expect(config1.retryCount).toBe(config2.retryCount);
      expect(config1.maxConcurrency).toBe(config2.maxConcurrency);
    });

    it("应该正确处理环境变量变化", () => {
      const originalEnv = process.env;

      // 设置环境变量
      process.env = {
        ...originalEnv,
        TRANSCRIPTION_MAX_CONCURRENCY: "5",
      };

      const config = getTranscriptionConfig();
      expect(config.maxConcurrency).toBe(5);

      // 恢复环境变量
      process.env = originalEnv;

      const newConfig = getTranscriptionConfig();
      expect(newConfig.maxConcurrency).not.toBe(5);
    });
  });

  describe("系统健壮性", () => {
    it("应该正确处理异常情况", async () => {
      const manager = getConcurrencyManager();

      // 测试取消请求
      const slowTask = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return "slow result";
      });

      const slowPromise = manager.execute(() => slowTask(), "slow");

      // 取消请求
      const cancelled = manager.cancelRequest("slow");
      expect(cancelled).toBe(true);

      await expect(slowPromise).rejects.toThrow("Request cancelled");
    });

    it("应该正确处理空值和边界情况", () => {
      // 测试空文件验证
      const emptyFile = {
        size: 0,
        type: "",
        name: "",
      };

      const result = validateAudioFile(emptyFile);
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe("boolean");
      expect(Array.isArray(result.errors)).toBe(true);

      // 测试空API密钥
      const emptyKeyResult = validateGroqApiKey("");
      expect(emptyKeyResult.isValid).toBe(false);
      expect(emptyKeyResult.errors.length).toBeGreaterThan(0);
    });
  });
});
