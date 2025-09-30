/**
 * 统一错误处理演示
 * 展示如何使用新的错误处理系统
 */

import {
  createError,
  handleError,
  handleWithSmartRetry,
  createErrorContext,
  getGlobalErrorAggregator,
  useErrorHandler,
  getErrorStats,
} from "@/lib/error-handler";
import { getErrorCodeConfig, isRetryableError, ErrorSeverity, ErrorCategory } from "@/types/errors";

// ========================
// 基础错误处理示例
// ========================

export function basicErrorHandlingDemo() {
  console.log("=== 基础错误处理演示 ===");

  // 1. 创建错误
  const context = createErrorContext("FileUploadComponent", "uploadFile", {
    fileName: "test.mp3",
    fileSize: 1024000,
  });

  const error = createError(
    "fileUploadFailed",
    "文件上传失败：网络连接中断",
    { fileName: "test.mp3", fileSize: 1024000 },
    400,
    context,
  );

  console.log("创建的错误:", {
    code: error.code,
    message: error.message,
    severity: error.context?.additional?.severity,
    category: error.context?.additional?.category,
    timestamp: error.timestamp,
    traceId: error.context?.traceId,
  });

  // 2. 处理错误
  const handledError = handleError(error, "FileUploadComponent");
  console.log("处理后的错误:", handledError);

  // 3. 获取错误配置
  const config = getErrorCodeConfig(error.code);
  console.log("错误配置:", config);

  // 4. 检查是否可重试
  const canRetry = isRetryableError(error.code);
  console.log("是否可重试:", canRetry);
}

// ========================
// 智能重试示例
// ========================

export async function smartRetryDemo() {
  console.log("=== 智能重试演示 ===");

  // 模拟一个可能失败的数据库操作
  let attemptCount = 0;
  const dbOperation = async () => {
    attemptCount++;
    console.log(`数据库操作尝试 ${attemptCount}`);

    if (attemptCount < 3) {
      const error = createError("dbConnectionFailed", `数据库连接失败 (尝试 ${attemptCount})`);
      throw error;
    }

    return { success: true, data: "查询结果" };
  };

  const context = createErrorContext("DatabaseService", "queryUserData", {
    userId: "123",
    query: "SELECT * FROM users",
  });

  try {
    // 使用智能重试 - 会根据错误类型自动选择重试策略
    const result = await handleWithSmartRetry(dbOperation, context);
    console.log("操作成功:", result);
    console.log(`总尝试次数: ${attemptCount}`);
  } catch (error) {
    console.error("操作失败:", error);
  }
}

// ========================
// 错误聚合示例
// ========================

export function errorAggregationDemo() {
  console.log("=== 错误聚合演示 ===");

  const aggregator = getGlobalErrorAggregator();

  // 模拟多个相同错误
  const networkError = createError("networkError", "网络连接失败");
  const dbError = createError("dbConnectionFailed", "数据库连接失败");

  // 添加重复错误
  for (let i = 0; i < 5; i++) {
    const result = aggregator.addError(networkError);
    console.log(`添加网络错误 ${i + 1}: 新错误=${result.isNew}, 总数=${result.count}`);
  }

  // 添加不同错误
  aggregator.addError(dbError);
  aggregator.addError(dbError);

  // 获取统计信息
  const stats = aggregator.getStats();
  console.log("错误统计:", {
    totalUniqueErrors: stats.totalUniqueErrors,
    topErrors: stats.topErrors.map((e) => ({
      code: e.error.code,
      count: e.count,
    })),
  });
}

// ========================
// React Hook 使用示例
// ========================

export function reactHookUsageDemo() {
  console.log("=== React Hook 使用演示 ===");

  // 模拟在React组件中使用
  const { handleError, showError, withRetry, withSmartRetry } = useErrorHandler();

  // 1. 处理错误
  try {
    throw new Error("组件内部错误");
  } catch (error) {
    const handledError = handleError(error, "MyComponent");
    console.log("Hook处理错误:", handledError);
  }

  // 2. 显示错误消息
  showError("这是一个用户友好的错误消息", "MyComponent");

  // 3. 使用重试
  const retryOperation = async () => {
    try {
      const result = await withRetry(async () => {
        // 模拟可能失败的操作
        if (Math.random() > 0.5) {
          throw new Error("随机失败");
        }
        return "操作成功";
      });
      console.log("重试操作结果:", result);
    } catch (error) {
      console.error("重试操作失败:", error);
    }
  };

  // 4. 使用智能重试
  const smartRetryOperation = async () => {
    const context = createErrorContext("APIService", "fetchData");

    try {
      const result = await withSmartRetry(
        async () => {
          // 模拟API调用
          if (Math.random() > 0.7) {
            throw createError("apiTimeout", "API调用超时");
          }
          return { data: "API数据" };
        },
        context,
        { maxRetries: 2 }, // 自定义重试策略
      );
      console.log("智能重试结果:", result);
    } catch (error) {
      console.error("智能重试失败:", error);
    }
  };

  return { retryOperation, smartRetryOperation };
}

// ========================
// 错误统计示例
// ========================

export function errorStatsDemo() {
  console.log("=== 错误统计演示 ===");

  // 获取错误统计信息
  const stats = getErrorStats();
  console.log("错误统计:", {
    totalErrors: stats.totalErrors,
    errorsByCode: stats.errorsByCode,
    errorsByComponent: stats.errorsByComponent,
    errorsBySeverity: stats.errorsBySeverity,
    errorFrequency: stats.errorFrequency,
    errorRate: stats.errorRate,
    lastErrorTime: stats.lastErrorTime ? new Date(stats.lastErrorTime).toLocaleString() : null,
  });

  // 分析错误趋势
  if (stats.errorRate > 5) {
    console.warn("⚠️ 错误率较高，建议检查系统状态");
  }

  if (stats.errorsBySeverity[ErrorSeverity.CRITICAL] > 0) {
    console.error("🚨 发现严重错误，需要立即处理");
  }
}

// ========================
// 最佳实践示例
// ========================

export class BestPracticeDemo {
  private context = createErrorContext("BestPracticeDemo", "demonstrate");

  // 1. 始终使用错误上下文
  async withContext() {
    try {
      await this.riskyOperation();
    } catch (error) {
      const appError = handleError(error, this.context.component);
      console.log("带上下文的错误处理:", appError);
    }
  }

  // 2. 根据错误类型选择处理策略
  async withStrategy() {
    const context = createErrorContext("APIService", "callExternalAPI");

    const result = await handleWithSmartRetry(
      async () => {
        const response = await fetch("/api/data");
        if (!response.ok) {
          throw createError("apiValidationError", "API验证失败", { status: response.status });
        }
        return response.json();
      },
      context,
      {
        maxRetries: 3,
        fallbackAction: async (error) => {
          console.log("执行降级操作:", error.message);
          // 记录错误日志，但不返回数据（fallbackAction 应该是 void）
        },
      },
    );

    return result;
  }

  // 3. 错误分类处理
  categorizedErrorHandling(error: unknown) {
    const appError = handleError(error);
    const category = appError.context?.additional?.category;

    switch (category) {
      case ErrorCategory.NETWORK:
        console.log("网络错误，检查网络连接");
        break;
      case ErrorCategory.DATABASE:
        console.log("数据库错误，联系数据库管理员");
        break;
      case ErrorCategory.VALIDATION:
        console.log("验证错误，检查输入参数");
        break;
      default:
        console.log("未知错误，记录并上报");
    }
  }

  private async riskyOperation(): Promise<void> {
    // 模拟可能失败的操作
    if (Math.random() > 0.5) {
      throw new Error("操作失败");
    }
  }
}

// ========================
// 运行所有演示
// ========================

export async function runAllErrorHandlingDemos() {
  console.log("🚀 开始运行错误处理演示\n");

  try {
    basicErrorHandlingDemo();
    console.log("");

    await smartRetryDemo();
    console.log("");

    errorAggregationDemo();
    console.log("");

    reactHookUsageDemo();
    console.log("");

    errorStatsDemo();
    console.log("");

    const demo = new BestPracticeDemo();
    await demo.withContext();
    await demo.withStrategy();
    console.log("");

    console.log("✅ 所有演示运行完成！");
  } catch (error) {
    console.error("演示运行出错:", error);
  }
}

// 如果直接运行此文件，执行所有演示
if (typeof window !== "undefined" && window.location?.search?.includes("demo=error-handling")) {
  runAllErrorHandlingDemos();
}
