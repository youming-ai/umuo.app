/**
 * 统一错误处理测试
 * 测试错误类型系统、错误处理函数和错误恢复机制
 */

import {
  createError,
  handleError,
  logError,
  isAppError,
  createErrorContext,
  handleWithRetry,
  handleWithSmartRetry,
  getErrorStats,
  getGlobalErrorAggregator,
  ErrorAggregator,
} from "@/lib/error-handler";
import {
  ErrorCodes,
  ErrorSeverity,
  ErrorCategory,
  DefaultRecoveryStrategies,
  getErrorCodeConfig,
  isRetryableError,
  getErrorSeverity,
  getErrorCategory,
} from "@/types/errors";

// Mock setup
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("错误处理系统", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("错误创建", () => {
    it("应该创建具有正确属性的AppError", () => {
      const context = createErrorContext("TestComponent", "testAction");
      const error = createError(
        "dbConnectionFailed",
        "Database connection failed",
        { host: "localhost" },
        500,
        context,
      );

      expect(error.code).toBe(ErrorCodes.dbConnectionFailed);
      expect(error.message).toBe("Database connection failed");
      expect(error.statusCode).toBe(500);
      expect(error.timestamp).toBeDefined();
      expect(error.stack).toBeDefined();
      expect(error.context).toBeDefined();
      expect(error.context?.component).toBe("TestComponent");
      expect(error.context?.action).toBe("testAction");
      expect(error.context?.additional?.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.context?.additional?.category).toBe(ErrorCategory.DATABASE);
    });

    it("应该为错误创建默认上下文", () => {
      const error = createError("networkError", "Network error");

      expect(error.context).toBeDefined();
      expect(error.context?.timestamp).toBeDefined();
      expect(error.context?.additional?.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.context?.additional?.category).toBe(ErrorCategory.NETWORK);
    });
  });

  describe("错误处理", () => {
    it("应该正确处理AppError", () => {
      const appError = createError("fileUploadFailed", "Upload failed");
      const handled = handleError(appError, "TestComponent");

      expect(handled).toBe(appError);
    });

    it("应该将原生Error转换为AppError", () => {
      const nativeError = new Error("Something went wrong");
      const handled = handleError(nativeError, "TestComponent");

      expect(isAppError(handled)).toBe(true);
      expect(handled.code).toBe(ErrorCodes.internalServerError);
      expect(handled.message).toBe("Something went wrong");
    });

    it("应该处理未知错误类型", () => {
      const unknownError = "Unknown error";
      const handled = handleError(unknownError);

      expect(isAppError(handled)).toBe(true);
      expect(handled.code).toBe(ErrorCodes.internalServerError);
    });
  });

  describe("错误配置", () => {
    it("应该返回正确的错误配置", () => {
      const config = getErrorCodeConfig(ErrorCodes.dbConnectionFailed);

      expect(config.severity).toBe(ErrorSeverity.CRITICAL);
      expect(config.category).toBe(ErrorCategory.DATABASE);
      expect(config.retryable).toBe(true);
      expect(config.userFriendly).toBe(true);
    });

    it("应该为未知错误代码返回默认配置", () => {
      const config = getErrorCodeConfig("UNKNOWN_ERROR");

      expect(config.severity).toBe(ErrorSeverity.MEDIUM);
      expect(config.category).toBe(ErrorCategory.SYSTEM);
      expect(config.retryable).toBe(false);
    });

    it("应该正确判断错误是否可重试", () => {
      expect(isRetryableError(ErrorCodes.dbConnectionFailed)).toBe(true);
      expect(isRetryableError(ErrorCodes.apiValidationError)).toBe(false);
    });

    it("应该返回正确的错误严重程度", () => {
      expect(getErrorSeverity(ErrorCodes.dbConnectionFailed)).toBe(ErrorSeverity.CRITICAL);
      expect(getErrorSeverity(ErrorCodes.fileNotFound)).toBe(ErrorSeverity.LOW);
    });

    it("应该返回正确的错误分类", () => {
      expect(getErrorCategory(ErrorCodes.dbConnectionFailed)).toBe(ErrorCategory.DATABASE);
      expect(getErrorCategory(ErrorCodes.networkError)).toBe(ErrorCategory.NETWORK);
    });
  });

  describe("错误上下文", () => {
    it("应该创建具有追踪ID的错误上下文", () => {
      const context = createErrorContext("Component", "action", { userId: "123" });

      expect(context.component).toBe("Component");
      expect(context.action).toBe("action");
      expect(context.additional).toEqual({ userId: "123" });
      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
      expect(context.timestamp).toBeDefined();
    });
  });

  describe("错误重试", () => {
    it("应该使用智能重试策略", async () => {
      let attemptCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          const error = createError("dbConnectionFailed", "DB connection failed");
          throw error;
        }
        return "success";
      });

      const context = createErrorContext("DBComponent", "connect");
      const result = await handleWithSmartRetry(fn, context);

      expect(result).toBe("success");
      expect(attemptCount).toBe(2);
    });

    it("应该正确识别不可重试错误", () => {
      const error = createError("apiValidationError", "Validation failed");

      expect(isRetryableError(error.code)).toBe(false);
      expect(getErrorCategory(error.code)).toBe(ErrorCategory.VALIDATION);
      expect(getErrorSeverity(error.code)).toBe(ErrorSeverity.LOW);
    });
  });

  describe("错误聚合", () => {
    it("应该聚合重复错误", () => {
      const aggregator = new ErrorAggregator(1000); // 1秒窗口
      const error = createError("networkError", "Network failed");

      const result1 = aggregator.addError(error);
      const result2 = aggregator.addError(error);

      expect(result1.isNew).toBe(true);
      expect(result1.count).toBe(1);
      expect(result2.isNew).toBe(false);
      expect(result2.count).toBe(2);
    });

    it("应该提供错误统计", () => {
      const aggregator = new ErrorAggregator();
      const error1 = createError("networkError", "Network failed");
      const error2 = createError("dbConnectionFailed", "DB failed");

      aggregator.addError(error1);
      aggregator.addError(error2);

      const stats = aggregator.getStats();
      expect(stats.totalUniqueErrors).toBe(2);
      expect(stats.topErrors).toHaveLength(2);
    });
  });

  describe("错误统计", () => {
    it("应该返回正确的错误统计信息", () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([
          {
            id: "1",
            timestamp: Date.now() - 1000, // 1秒前
            level: "error",
            message: "Test error",
            code: ErrorCodes.networkError,
            context: { component: "TestComponent" },
          },
          {
            id: "2",
            timestamp: Date.now() - 3600000, // 1小时前
            level: "error",
            message: "Old error",
            code: ErrorCodes.dbConnectionFailed,
            context: { component: "DBComponent" },
          },
        ]),
      );

      const stats = getErrorStats();

      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByCode[ErrorCodes.networkError]).toBe(1);
      expect(stats.errorsByCode[ErrorCodes.dbConnectionFailed]).toBe(1);
      expect(stats.errorsByComponent.TestComponent).toBe(1);
      expect(stats.errorsByComponent.DBComponent).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.CRITICAL]).toBe(1);
      expect(stats.errorFrequency).toBe(1); // 最近1小时内的错误
      expect(stats.errorRate).toBe(1 / 60); // 每分钟错误率
    });
  });

  describe("默认恢复策略", () => {
    it("应该为不同错误类别提供不同的恢复策略", () => {
      const dbStrategy = DefaultRecoveryStrategies[ErrorCategory.DATABASE];
      const validationStrategy = DefaultRecoveryStrategies[ErrorCategory.VALIDATION];

      expect(dbStrategy.maxRetries).toBe(3);
      expect(dbStrategy.maxRetries > 0).toBe(true);

      expect(validationStrategy.maxRetries).toBe(0);
      expect(validationStrategy.maxRetries === 0).toBe(true);
    });
  });

  describe("全局错误聚合器", () => {
    it("应该提供全局错误聚合器实例", () => {
      const aggregator = getGlobalErrorAggregator();
      expect(aggregator).toBeInstanceOf(ErrorAggregator);
    });

    it("应该多次调用返回同一个实例", () => {
      const aggregator1 = getGlobalErrorAggregator();
      const aggregator2 = getGlobalErrorAggregator();
      expect(aggregator1).toBe(aggregator2);
    });
  });

  describe("错误日志记录", () => {
    it("应该记录错误到localStorage", () => {
      const error = createError("networkError", "Network failed");
      logError(error, "TestComponent");

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const call = localStorageMock.setItem.mock.calls[0];
      const loggedData = JSON.parse(call[1]);
      expect(loggedData).toHaveLength(1);
      expect(loggedData[0].code).toBe(ErrorCodes.networkError);
      expect(loggedData[0].context?.component).toBe("TestComponent");
    });

    it("应该限制错误日志数量", () => {
      const mockLogs = Array(110)
        .fill(null)
        .map((_, i) => ({
          id: `error_${i}`,
          timestamp: Date.now() - i * 1000,
          level: "error",
          message: `Error ${i}`,
          code: ErrorCodes.networkError,
        }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLogs));

      const error = createError("networkError", "New error");
      logError(error);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const call = localStorageMock.setItem.mock.calls[0];
      const loggedData = JSON.parse(call[1]);
      expect(loggedData.length).toBeLessThanOrEqual(100);
    });
  });
});
