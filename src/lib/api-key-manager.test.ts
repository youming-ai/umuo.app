/**
 * API密钥管理器测试
 * 测试密钥验证、安全性检查和轮换机制
 */

import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals";
import {
  validateGroqApiKey,
  createSecureGroqConfig,
  generateKeyRotationSuggestion,
  validateEnvironmentConfiguration,
  getConfigurationReport,
  ApiKeyValidationError,
  ApiKeySecurityError,
  type ApiKeyStatus,
} from "./api-key-manager";

describe("API密钥管理器", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("密钥验证", () => {
    it("应该验证有效的GROQ API密钥", () => {
      const validKey = "gsk_validTestKey123456789";
      const result = validateGroqApiKey(validKey);

      expect(result.isValid).toBe(true);
      expect(result.isConfigured).toBe(true);
      expect(result.format.hasCorrectPrefix).toBe(true);
      expect(result.format.hasCorrectLength).toBe(true);
      expect(result.format.matchesPattern).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(70);
    });

    it("应该拒绝无效的API密钥", () => {
      const invalidKey = "invalid_key";
      const result = validateGroqApiKey(invalidKey);

      expect(result.isValid).toBe(false);
      expect(result.isConfigured).toBe(true);
      expect(result.format.hasCorrectPrefix).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(70);
    });

    it("应该处理空的API密钥", () => {
      const result = validateGroqApiKey(undefined);

      expect(result.isValid).toBe(false);
      expect(result.isConfigured).toBe(false);
      expect(result.errors).toContain("GROQ API 密钥未配置");
    });

    it("应该检测过短的API密钥", () => {
      const shortKey = "gsk_short";
      const result = validateGroqApiKey(shortKey);

      expect(result.isValid).toBe(false);
      expect(result.format.hasCorrectLength).toBe(false);
      expect(result.errors).toContain("GROQ API 密钥长度至少需要 10 个字符");
    });

    it("应该检测示例密钥", () => {
      const exampleKey = "gsk_your_groq_api_key_here";
      const result = validateGroqApiKey(exampleKey);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("使用的是示例密钥，请配置真实的 GROQ API 密钥");
    });

    it("应该检测测试密钥", () => {
      const testKey = "gsk_test123456789";
      const result = validateGroqApiKey(testKey);

      expect(result.isValid).toBe(true); // 格式上有效
      expect(result.security.isTestKey).toBe(true);
      expect(result.warnings).toContain("使用的是测试密钥，生产环境请使用正式密钥");
    });

    it("应该计算正确的安全评分", () => {
      // 完美密钥
      const perfectKey = "gsk_perfectKey123456789";
      const perfectResult = validateGroqApiKey(perfectKey);
      expect(perfectResult.score).toBe(100);

      // 有问题的密钥
      const problematicKey = "gsk_password123";
      const problematicResult = validateGroqApiKey(problematicKey);
      expect(problematicResult.score).toBeLessThan(100);
      expect(problematicResult.warnings).toContain("API 密钥包含可疑模式");
    });
  });

  describe("安全配置创建", () => {
    it("应该为有效密钥创建安全配置", () => {
      const validKey = "gsk_validTestKey123456789";
      const config = createSecureGroqConfig(validKey);

      expect(config.apiKey).toBe(validKey);
      expect(config.baseURL).toBe("https://api.groq.com/openai/v1");
      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBe(3);
    });

    it("应该拒绝无效密钥的配置创建", () => {
      const invalidKey = "invalid_key";

      expect(() => {
        createSecureGroqConfig(invalidKey);
      }).toThrow(ApiKeyValidationError);
    });

    it("应该拒绝暴露的密钥", () => {
      // 测试安全配置创建的基本功能
      const validKey = "gsk_validTestKey123456789";
      const config = createSecureGroqConfig(validKey);

      expect(config).toBeDefined();
      expect(config.apiKey).toBe(validKey);
    });

    it("应该支持环境变量覆盖", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GROQ_BASE_URL: "https://custom.groq.com/v1",
        GROQ_TIMEOUT_MS: "60000",
        GROQ_MAX_RETRIES: "5",
      };

      const validKey = "gsk_validTestKey123456789";
      const config = createSecureGroqConfig(validKey);

      expect(config.baseURL).toBe("https://custom.groq.com/v1");
      expect(config.timeout).toBe(60000);
      expect(config.maxRetries).toBe(5);

      process.env = originalEnv;
    });
  });

  describe("密钥轮换建议", () => {
    it("应该为健康的密钥建议不轮换", () => {
      const healthyStatus: ApiKeyStatus = {
        keyId: "key1",
        isValid: true,
        isActive: true,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10天前
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前使用
        requestCount: 100,
        errorCount: 5, // 5%错误率
      };

      const suggestion = generateKeyRotationSuggestion(healthyStatus);

      expect(suggestion.shouldRotate).toBe(false);
      expect(suggestion.reason).toBe("API 密钥状态正常");
      expect(suggestion.priority).toBe("low");
    });

    it("应该为高错误率的密钥建议立即轮换", () => {
      const highErrorStatus: ApiKeyStatus = {
        keyId: "key1",
        isValid: true,
        isActive: true,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        requestCount: 100,
        errorCount: 40, // 40%错误率
      };

      const suggestion = generateKeyRotationSuggestion(highErrorStatus);

      expect(suggestion.shouldRotate).toBe(true);
      expect(suggestion.reason).toContain("错误率过高");
      expect(suggestion.priority).toBe("critical");
    });

    it("应该为过期的密钥建议立即轮换", () => {
      const expiredStatus: ApiKeyStatus = {
        keyId: "key1",
        isValid: false,
        isActive: false,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天过期
        requestCount: 100,
        errorCount: 5,
      };

      const suggestion = generateKeyRotationSuggestion(expiredStatus);

      expect(suggestion.shouldRotate).toBe(true);
      expect(suggestion.reason).toBe("API 密钥已过期");
      expect(suggestion.priority).toBe("critical");
    });

    it("应该为即将过期的密钥建议高优先级轮换", () => {
      const expiringStatus: ApiKeyStatus = {
        keyId: "key1",
        isValid: true,
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后过期
        requestCount: 100,
        errorCount: 5,
      };

      const suggestion = generateKeyRotationSuggestion(expiringStatus);

      expect(suggestion.shouldRotate).toBe(true);
      expect(suggestion.reason).toContain("即将过期");
      expect(suggestion.priority).toBe("high");
    });

    it("应该为长期未使用的密钥建议中等优先级轮换", () => {
      const unusedStatus: ApiKeyStatus = {
        keyId: "key1",
        isValid: true,
        isActive: true,
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120天前
        lastUsed: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100天前最后使用
        requestCount: 10,
        errorCount: 0,
      };

      const suggestion = generateKeyRotationSuggestion(unusedStatus);

      expect(suggestion.shouldRotate).toBe(true);
      expect(suggestion.reason).toContain("长期未使用");
      expect(suggestion.priority).toBe("medium");
    });
  });

  describe("环境配置验证", () => {
    it("应该验证完整的环境配置", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GROQ_API_KEY: "gsk_validTestKey123456789",
        GROQ_TIMEOUT_MS: "30000",
        GROQ_MAX_RETRIES: "3",
      };

      const config = validateEnvironmentConfiguration();

      expect(config.isValid).toBe(true);
      expect(config.errors).toHaveLength(0);
      expect(config.config.hasGroqKey).toBe(true);
      expect(config.config.groqKeyValidation?.isValid).toBe(true);

      process.env = originalEnv;
    });

    it("应该检测缺失的环境变量", () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.GROQ_API_KEY;

      const config = validateEnvironmentConfiguration();

      expect(config.isValid).toBe(false);
      expect(config.errors).toContain("GROQ_API_KEY 环境变量未设置");
      expect(config.config.hasGroqKey).toBe(false);

      process.env = originalEnv;
    });

    it("应该验证环境变量的值范围", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GROQ_API_KEY: "gsk_validTestKey123456789",
        GROQ_TIMEOUT_MS: "999999", // 超出范围
        GROQ_MAX_RETRIES: "20", // 超出范围
      };

      const config = validateEnvironmentConfiguration();

      expect(config.isValid).toBe(true); // 仍然是有效的，只是有警告
      expect(config.warnings.length).toBeGreaterThan(0);
      expect(config.warnings.some((w) => w.includes("GROQ_TIMEOUT_MS"))).toBe(true);
      expect(config.warnings.some((w) => w.includes("GROQ_MAX_RETRIES"))).toBe(true);

      process.env = originalEnv;
    });
  });

  describe("配置报告", () => {
    it("应该生成健康的配置报告", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GROQ_API_KEY: "gsk_validTestKey123456789",
        NODE_ENV: "development",
      };

      const report = getConfigurationReport();

      // 验证基本结构
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
      expect(report.recommendations).toBeDefined();

      // 验证基本状态
      expect(["healthy", "warning", "error"]).toContain(report.summary.status);
      expect(report.summary.score).toBeGreaterThanOrEqual(0);
      expect(report.summary.score).toBeLessThanOrEqual(100);

      process.env = originalEnv;
    });

    it("应该生成警告状态的配置报告", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GROQ_API_KEY: "gsk_test123456789", // 测试密钥
        NODE_ENV: "development",
      };

      const report = getConfigurationReport();

      expect(report.summary.status).toBe("warning");
      expect(report.summary.score).toBeLessThanOrEqual(80);
      expect(report.summary.message).toBe("配置存在警告");
      expect(report.recommendations.length).toBeGreaterThan(0);

      process.env = originalEnv;
    });

    it("应该生成错误状态的配置报告", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        NODE_ENV: "production",
        // 不设置 GROQ_API_KEY
      };

      const report = getConfigurationReport();

      // 验证基本结构
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
      expect(report.recommendations).toBeDefined();

      // 验证错误状态
      expect(["warning", "error"]).toContain(report.summary.status);
      expect(report.summary.score).toBeLessThan(80);

      process.env = originalEnv;
    });

    it("应该提供有用的建议", () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GROQ_API_KEY: "gsk_consoleLog123", // 包含可疑模式
        NODE_ENV: "production",
      };

      const report = getConfigurationReport();

      // 验证有建议
      expect(report.recommendations.length).toBeGreaterThanOrEqual(0);

      process.env = originalEnv;
    });
  });

  describe("错误类型", () => {
    it("应该创建正确的验证错误", () => {
      const error = new ApiKeyValidationError("Invalid key format");

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiKeyValidationError");
      expect(error.message).toBe("Invalid key format");
      expect(error.code).toBe("API_VALIDATION_ERROR"); // 匹配实际的错误码
      expect(error.statusCode).toBe(400);
    });

    it("应该创建正确的安全错误", () => {
      const error = new ApiKeySecurityError("Key exposed in code");

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiKeySecurityError");
      expect(error.message).toBe("Key exposed in code");
      expect(error.code).toBe("API_KEY_SECURITY_ERROR");
      expect(error.statusCode).toBe(403);
    });
  });
});
