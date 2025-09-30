/**
 * API 密钥管理功能演示
 * 展示如何使用新的安全 API 密钥管理功能
 */

import {
  validateGroqApiKey,
  createSecureGroqConfig,
  generateKeyRotationSuggestion,
  validateEnvironmentConfiguration,
  getConfigurationReport,
  type ApiKeyValidationResult,
  type ApiKeyStatus,
} from "./api-key-manager";
import { GroqClient } from "./groq-client";

/**
 * 演示 API 密钥验证功能
 */
export function demonstrateApiKeyValidation(): void {
  console.log("=== API 密钥验证演示 ===\n");

  // 测试不同类型的密钥
  const testKeys = [
    "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567", // 有效密钥
    "gsk_this_is_a_test_key_for_development_and_demo_only", // 测试密钥
    "gsk_your_groq_api_key_here_please_replace_with_real_key", // 示例密钥
    "sk_invalid_prefix_key", // 错误前缀
    "gsk_key_with_console.log_and_alert(_code)", // 暴露密钥
    "", // 空密钥
  ];

  testKeys.forEach((key, index) => {
    console.log(`测试密钥 ${index + 1}: ${key.substring(0, 20)}...`);
    const result = validateGroqApiKey(key);

    console.log(`  有效: ${result.isValid}`);
    console.log(`  配置: ${result.isConfigured}`);
    console.log(`  安全评分: ${result.score}/100`);
    console.log(`  错误: ${result.errors.join(", ") || "无"}`);
    console.log(`  警告: ${result.warnings.join(", ") || "无"}`);
    console.log(`  格式正确: ${result.format.matchesPattern}`);
    console.log(
      `  安全检查通过: ${!result.security.isExposed && !result.security.hasSuspiciousPattern}`,
    );
    console.log("---");
  });
}

/**
 * 演示安全配置创建
 */
export function demonstrateSecureConfig(): void {
  console.log("=== 安全配置创建演示 ===\n");

  // 有效密钥
  const validKey = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";

  try {
    const config = createSecureGroqConfig(validKey);
    console.log("✅ 有效密钥配置创建成功:");
    console.log(`  Base URL: ${config.baseURL}`);
    console.log(`  超时: ${config.timeout}ms`);
    console.log(`  最大重试: ${config.maxRetries}`);
  } catch (error) {
    console.log("❌ 有效密钥配置创建失败:", error);
  }

  console.log();

  // 有安全问题的密钥
  const exposedKey = "gsk_key_with_console.log_and_alert(_code)";

  try {
    const config = createSecureGroqConfig(exposedKey);
    console.log("❌ 暴露密钥配置不应该创建成功");
  } catch (error) {
    console.log("✅ 暴露密钥被正确拒绝:", error instanceof Error ? error.message : String(error));
  }
}

/**
 * 演示密钥轮换建议
 */
export function demonstrateKeyRotation(): void {
  console.log("=== 密钥轮换建议演示 ===\n");

  const now = new Date();

  // 创建不同的密钥状态
  const keyStatuses: ApiKeyStatus[] = [
    {
      keyId: "normal_key",
      isValid: true,
      isActive: true,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      requestCount: 500,
      errorCount: 5,
    },
    {
      keyId: "high_error_key",
      isValid: true,
      isActive: true,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      requestCount: 100,
      errorCount: 40, // 40% 错误率
    },
    {
      keyId: "expired_key",
      isValid: true,
      isActive: true,
      createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
      expirationDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 已过期
      requestCount: 1000,
      errorCount: 10,
    },
    {
      keyId: "heavy_usage_key",
      isValid: true,
      isActive: true,
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(),
      requestCount: 15000,
      errorCount: 100,
    },
  ];

  keyStatuses.forEach((status, index) => {
    console.log(`密钥状态 ${index + 1}: ${status.keyId}`);
    const suggestion = generateKeyRotationSuggestion(status);

    console.log(`  应该轮换: ${suggestion.shouldRotate ? "是" : "否"}`);
    console.log(`  原因: ${suggestion.reason}`);
    console.log(`  优先级: ${suggestion.priority}`);
    console.log(`  建议: ${suggestion.recommendedAction}`);
    console.log("---");
  });
}

/**
 * 演示环境配置验证
 */
export function demonstrateEnvironmentValidation(): void {
  console.log("=== 环境配置验证演示 ===\n");

  // 模拟不同的环境配置
  const originalEnv = process.env;

  // 测试完整配置
  process.env = {
    ...originalEnv,
    GROQ_API_KEY: "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567",
    GROQ_TIMEOUT_MS: "30000",
    GROQ_MAX_RETRIES: "3",
    NODE_ENV: "production",
  };

  let result = validateEnvironmentConfiguration();
  console.log("完整配置验证:");
  console.log(`  有效: ${result.isValid}`);
  console.log(`  错误: ${result.errors.join(", ") || "无"}`);
  console.log(`  警告: ${result.warnings.join(", ") || "无"}`);

  console.log();

  // 测试缺失配置
  delete process.env.GROQ_API_KEY;
  result = validateEnvironmentConfiguration();
  console.log("缺失密钥配置验证:");
  console.log(`  有效: ${result.isValid}`);
  console.log(`  错误: ${result.errors.join(", ") || "无"}`);

  console.log();

  // 测试无效配置
  process.env.GROQ_API_KEY = "invalid_key";
  process.env.GROQ_TIMEOUT_MS = "invalid";
  result = validateEnvironmentConfiguration();
  console.log("无效配置验证:");
  console.log(`  有效: ${result.isValid}`);
  console.log(`  错误: ${result.errors.join(", ") || "无"}`);
  console.log(`  警告: ${result.warnings.join(", ") || "无"}`);

  // 恢复原始环境
  process.env = originalEnv;
}

/**
 * 演示配置报告
 */
export function demonstrateConfigurationReport(): void {
  console.log("=== 配置报告演示 ===\n");

  const originalEnv = process.env;

  // 测试健康配置
  process.env = {
    ...originalEnv,
    GROQ_API_KEY: "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567",
    NODE_ENV: "production",
  };

  let report = getConfigurationReport();
  console.log("健康配置报告:");
  console.log(`  状态: ${report.summary.status}`);
  console.log(`  评分: ${report.summary.score}/100`);
  console.log(`  消息: ${report.summary.message}`);
  console.log(`  安全性: ${report.details.security.configurationSecurity}`);
  console.log(`  建议: ${report.recommendations.join(", ")}`);

  console.log();

  // 测试问题配置
  process.env.GROQ_API_KEY = "gsk_key_with_console.log_and_alert(_code)";
  report = getConfigurationReport();
  console.log("问题配置报告:");
  console.log(`  状态: ${report.summary.status}`);
  console.log(`  评分: ${report.summary.score}/100`);
  console.log(`  消息: ${report.summary.message}`);
  console.log(`  建议: ${report.recommendations.join(", ")}`);

  // 恢复原始环境
  process.env = originalEnv;
}

/**
 * 演示客户端状态
 */
export function demonstrateClientStatus(): void {
  console.log("=== 客户端状态演示 ===\n");

  const originalEnv = process.env;

  // 测试有效配置
  process.env = {
    ...originalEnv,
    GROQ_API_KEY: "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567",
    NODE_ENV: "production",
  };

  try {
    const report = getConfigurationReport();
    console.log("有效配置状态:");
    console.log(`  状态: ${report.summary.status}`);
    console.log(`  评分: ${report.summary.score}/100`);
    console.log(`  消息: ${report.summary.message}`);
    console.log(`  建议: ${report.recommendations.length}条`);
  } catch (error) {
    console.log("❌ 获取配置状态失败:", error instanceof Error ? error.message : String(error));
  }

  console.log();

  // 测试无效配置
  delete process.env.GROQ_API_KEY;

  try {
    const report = getConfigurationReport();
    console.log("无效配置状态:");
    console.log(`  状态: ${report.summary.status}`);
    console.log(`  评分: ${report.summary.score}/100`);
    console.log(`  消息: ${report.summary.message}`);
  } catch (error) {
    console.log("❌ 获取配置状态失败:", error instanceof Error ? error.message : String(error));
  }

  // 恢复原始环境
  process.env = originalEnv;
}

/**
 * 运行所有演示
 */
export function runAllDemos(): void {
  console.log("🔑 API 密钥管理功能演示\n");
  console.log("这个演示展示了新的 GROQ API 密钥管理功能，包括：");
  console.log("- 密钥格式验证");
  console.log("- 安全性检查");
  console.log("- 密钥轮换建议");
  console.log("- 环境配置验证");
  console.log("- 客户端状态监控");
  console.log("=".repeat(60));
  console.log();

  demonstrateApiKeyValidation();
  console.log();

  demonstrateSecureConfig();
  console.log();

  demonstrateKeyRotation();
  console.log();

  demonstrateEnvironmentValidation();
  console.log();

  demonstrateConfigurationReport();
  console.log();

  demonstrateClientStatus();
  console.log();

  console.log("✅ 所有演示完成！");
  console.log();
  console.log("💡 提示：");
  console.log("- 在生产环境中，请使用真实的 GROQ API 密钥");
  console.log("- 定期检查密钥安全状态");
  console.log("- 遵循密钥轮换建议");
  console.log("- 监控 API 使用情况");
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
  runAllDemos();
}
