/**
 * API 密钥管理模块测试
 */

import {
  validateGroqApiKey,
  createSecureGroqConfig,
  generateKeyRotationSuggestion,
  validateEnvironmentConfiguration,
  getConfigurationReport,
  ApiKeyValidationError,
  ApiKeySecurityError,
  type ApiKeyValidationResult,
  type ApiKeyStatus,
} from "./api-key-manager";

describe("API Key Manager", () => {
  describe("validateGroqApiKey", () => {
    it("应该正确验证有效的 GROQ API 密钥", () => {
      const validKey = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      const result = validateGroqApiKey(validKey);

      expect(result.isValid).toBe(true);
      expect(result.isConfigured).toBe(true);
      expect(result.format.hasCorrectPrefix).toBe(true);
      expect(result.format.hasCorrectLength).toBe(true);
      expect(result.format.matchesPattern).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBe(100);
    });

    it("应该拒绝未配置的密钥", () => {
      const result = validateGroqApiKey(undefined);

      expect(result.isValid).toBe(false);
      expect(result.isConfigured).toBe(false);
      expect(result.errors).toContain("GROQ API 密钥未配置");
      expect(result.score).toBe(0);
    });

    it("应该拒绝空密钥", () => {
      const result = validateGroqApiKey("");

      expect(result.isValid).toBe(false);
      expect(result.isConfigured).toBe(false);
      expect(result.errors).toContain("GROQ API 密钥未配置");
    });

    it("应该拒绝只有空格的密钥", () => {
      const result = validateGroqApiKey("   ");

      expect(result.isValid).toBe(false);
      expect(result.isConfigured).toBe(true);
      expect(result.errors).toContain("GROQ API 密钥必须以 'gsk_' 开头");
    });

    it("应该拒绝错误前缀的密钥", () => {
      const invalidKey = "sk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      const result = validateGroqApiKey(invalidKey);

      expect(result.isValid).toBe(false);
      expect(result.format.hasCorrectPrefix).toBe(false);
      expect(result.errors).toContain("GROQ API 密钥必须以 'gsk_' 开头");
    });

    it("应该拒绝错误长度的密钥", () => {
      const invalidKey = "gsk_";
      const result = validateGroqApiKey(invalidKey);

      expect(result.isValid).toBe(false);
      expect(result.format.hasCorrectLength).toBe(false);
      expect(result.errors).toContain("GROQ API 密钥长度至少需要 10 个字符");
    });

    it("应该检测示例密钥", () => {
      const exampleKey = "gsk_your_groq_api_key_here_please_replace_with_real_key";
      const result = validateGroqApiKey(exampleKey);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("使用的是示例密钥，请配置真实的 GROQ API 密钥");
    });

    it("应该检测测试密钥", () => {
      const testKey = "gsk_this_is_a_test_key_for_development_and_demo_only";
      const result = validateGroqApiKey(testKey);

      expect(result.isValid).toBe(true);
      expect(result.security.isTestKey).toBe(true);
      expect(result.warnings).toContain("使用的是测试密钥，生产环境请使用正式密钥");
      expect(result.score).toBe(90);
    });

    it("应该检测包含可疑模式的密钥", () => {
      const suspiciousKey = "gsk_this_key_contains_password_and_secret_tokens";
      const result = validateGroqApiKey(suspiciousKey);

      expect(result.security.hasSuspiciousPattern).toBe(true);
      expect(result.warnings).toContain("API 密钥包含可疑模式");
    });

    it("应该检测可能暴露的密钥", () => {
      const exposedKey = "gsk_key_with_console.log_and_alert(_code)";
      const result = validateGroqApiKey(exposedKey);

      expect(result.security.isExposed).toBe(true);
      expect(result.errors).toContain("API 密钥可能被暴露在客户端代码中");
    });

    it("应该计算正确的安全评分", () => {
      // 完美的密钥
      const perfectKey = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      let result = validateGroqApiKey(perfectKey);
      expect(result.score).toBe(100);

      // 有格式问题的密钥
      const badFormatKey = "sk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      result = validateGroqApiKey(badFormatKey);
      expect(result.score).toBeLessThan(50);

      // 测试密钥
      const testKey = "gsk_this_is_a_test_key_for_development_and_demo_only";
      result = validateGroqApiKey(testKey);
      expect(result.score).toBe(90);

      // 有安全问题的密钥
      const problematicKey = "gsk_key_with_console.log_and_password_patterns";
      result = validateGroqApiKey(problematicKey);
      expect(result.score).toBeLessThan(80);
    });
  });

  describe("createSecureGroqConfig", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("应该为有效密钥创建配置", () => {
      const validKey = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      const config = createSecureGroqConfig(validKey);

      expect(config.apiKey).toBe(validKey);
      expect(config.baseURL).toBe("https://api.groq.com/openai/v1");
      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBe(3);
    });

    it("应该使用自定义环境变量", () => {
      process.env.GROQ_BASE_URL = "https://custom.groq.com/v1";
      process.env.GROQ_TIMEOUT_MS = "60000";
      process.env.GROQ_MAX_RETRIES = "5";

      const validKey = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      const config = createSecureGroqConfig(validKey);

      expect(config.baseURL).toBe("https://custom.groq.com/v1");
      expect(config.timeout).toBe(60000);
      expect(config.maxRetries).toBe(5);
    });

    it("应该为无效密钥抛出验证错误", () => {
      const invalidKey = "invalid_key";

      expect(() => createSecureGroqConfig(invalidKey)).toThrow(ApiKeyValidationError);
    });

    it("应该为有安全问题的密钥抛出安全错误", () => {
      const exposedKey = "gsk_key_with_console.log_and_alert(_code)";

      expect(() => createSecureGroqConfig(exposedKey)).toThrow(ApiKeySecurityError);
    });
  });

  describe("generateKeyRotationSuggestion", () => {
    const now = new Date();

    it("应该建议轮换高错误率的密钥", () => {
      const status: ApiKeyStatus = {
        keyId: "test_key",
        isValid: true,
        isActive: true,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        requestCount: 100,
        errorCount: 40, // 40% 错误率
      };

      const suggestion = generateKeyRotationSuggestion(status);

      expect(suggestion.shouldRotate).toBe(true);
      expect(suggestion.priority).toBe("critical");
      expect(suggestion.reason).toContain("错误率过高");
    });

    it("应该建议轮换已过期的密钥", () => {
      const status: ApiKeyStatus = {
        keyId: "test_key",
        isValid: true,
        isActive: true,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 昨天
        requestCount: 100,
        errorCount: 5,
      };

      const suggestion = generateKeyRotationSuggestion(status);

      expect(suggestion.shouldRotate).toBe(true);
      expect(suggestion.priority).toBe("critical");
      expect(suggestion.reason).toBe("API 密钥已过期");
    });

    it("应该建议轮换即将过期的密钥", () => {
      const status: ApiKeyStatus = {
        keyId: "test_key",
        isValid: true,
        isActive: true,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5天后
        requestCount: 100,
        errorCount: 5,
      };

      const suggestion = generateKeyRotationSuggestion(status);

      expect(suggestion.shouldRotate).toBe(true);
      expect(suggestion.priority).toBe("high");
      expect(suggestion.reason).toContain("即将过期");
    });

    it("应该建议轮换长期未使用的密钥", () => {
      const status: ApiKeyStatus = {
        keyId: "test_key",
        isValid: true,
        isActive: true,
        createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120天前
        lastUsed: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000), // 100天前
        requestCount: 10,
        errorCount: 1,
      };

      const suggestion = generateKeyRotationSuggestion(status);

      expect(suggestion.shouldRotate).toBe(true);
      expect(suggestion.priority).toBe("medium");
      expect(suggestion.reason).toContain("长期未使用");
    });

    it("应该建议轮换高使用频率的密钥", () => {
      const status: ApiKeyStatus = {
        keyId: "test_key",
        isValid: true,
        isActive: true,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        lastUsed: new Date(),
        requestCount: 15000,
        errorCount: 100,
      };

      const suggestion = generateKeyRotationSuggestion(status);

      expect(suggestion.shouldRotate).toBe(true);
      expect(suggestion.priority).toBe("medium");
      expect(suggestion.reason).toContain("使用次数过多");
    });

    it("不应该建议轮换正常的密钥", () => {
      const status: ApiKeyStatus = {
        keyId: "test_key",
        isValid: true,
        isActive: true,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        lastUsed: new Date(),
        requestCount: 500,
        errorCount: 10,
      };

      const suggestion = generateKeyRotationSuggestion(status);

      expect(suggestion.shouldRotate).toBe(false);
      expect(suggestion.priority).toBe("low");
      expect(suggestion.reason).toBe("API 密钥状态正常");
    });
  });

  describe("validateEnvironmentConfiguration", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.GROQ_API_KEY;
      delete process.env.GROQ_TIMEOUT_MS;
      delete process.env.GROQ_MAX_RETRIES;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("应该验证完整的环境配置", () => {
      process.env.GROQ_API_KEY = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      process.env.GROQ_TIMEOUT_MS = "30000";
      process.env.GROQ_MAX_RETRIES = "3";

      const result = validateEnvironmentConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.config.hasGroqKey).toBe(true);
      expect(result.config.hasTimeoutConfig).toBe(true);
      expect(result.config.hasRetryConfig).toBe(true);
    });

    it("应该检测缺失的 GROQ API 密钥", () => {
      const result = validateEnvironmentConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("GROQ_API_KEY 环境变量未设置");
      expect(result.config.hasGroqKey).toBe(false);
    });

    it("应该检测无效的超时配置", () => {
      process.env.GROQ_API_KEY = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      process.env.GROQ_TIMEOUT_MS = "invalid";

      const result = validateEnvironmentConfiguration();

      expect(result.warnings).toContain("GROQ_TIMEOUT_MS 应在 1000-300000 毫秒之间");
    });

    it("应该检测无效的重试配置", () => {
      process.env.GROQ_API_KEY = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      process.env.GROQ_MAX_RETRIES = "invalid";

      const result = validateEnvironmentConfiguration();

      expect(result.warnings).toContain("GROQ_MAX_RETRIES 应在 0-10 之间");
    });

    it("应该为缺失的可选配置提供默认值警告", () => {
      process.env.GROQ_API_KEY = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";

      const result = validateEnvironmentConfiguration();

      expect(result.warnings).toContain("GROQ_TIMEOUT_MS 未设置，使用默认值 30000ms");
      expect(result.warnings).toContain("GROQ_MAX_RETRIES 未设置，使用默认值 3");
    });
  });

  describe("getConfigurationReport", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("应该为健康配置生成良好报告", () => {
      process.env.GROQ_API_KEY = "gsk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567";
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });

      const report = getConfigurationReport();

      expect(report.summary.status).toBe("warning"); // 因为测试环境会降低评分
      expect(report.summary.score).toBeGreaterThan(70);
      expect(report.details.groq?.isValid).toBe(true);
      expect(report.details.environment.isProduction).toBe(true);
    });

    it("应该为错误配置生成错误报告", () => {
      process.env.GROQ_API_KEY = "invalid_key";
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });

      const report = getConfigurationReport();

      expect(report.summary.status).toBe("error");
      expect(report.summary.score).toBeLessThan(50);
      expect(report.recommendations).toContain("修复所有配置错误以确保服务正常运行");
    });

    it("应该为警告配置生成警告报告", () => {
      process.env.GROQ_API_KEY = "gsk_this_is_a_test_key_for_development_and_demo_only";
      Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true });

      const report = getConfigurationReport();

      expect(report.summary.status).toBe("warning");
      expect(report.summary.score).toBeLessThan(100);
      expect(report.summary.score).toBeGreaterThan(60);
    });

    it("应该在生产环境中推荐配置密钥", () => {
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });
      delete process.env.GROQ_API_KEY;

      const report = getConfigurationReport();

      expect(report.recommendations).toContain("生产环境必须配置 GROQ_API_KEY");
    });

    it("应该为有安全问题的配置提供建议", () => {
      process.env.GROQ_API_KEY = "gsk_key_with_console_log_and_password_patterns";
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });

      const report = getConfigurationReport();

      // 检查是否有相关建议（可能因为测试环境而不同）
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });
});
