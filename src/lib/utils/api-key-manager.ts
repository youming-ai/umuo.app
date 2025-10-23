/**
 * GROQ API 密钥验证和管理模块
 * 提供密钥格式验证、安全性检查和轮换支持
 */

import { ErrorCodes } from "../../types/api/errors";

// GROQ API 密钥格式常量
const GROQ_API_KEY_PREFIX = "gsk_";
const GROQ_API_KEY_MIN_LENGTH = 10; // 最小长度
const GROQ_API_KEY_PATTERN = /^gsk_[a-zA-Z0-9_-]+$/;

// 错误类型
export class ApiKeyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "ApiKeyError";
  }
}

export class ApiKeyValidationError extends ApiKeyError {
  constructor(message: string) {
    super(message, ErrorCodes.apiValidationError, 400);
    this.name = "ApiKeyValidationError";
  }
}

export class ApiKeySecurityError extends ApiKeyError {
  constructor(message: string) {
    super(message, "API_KEY_SECURITY_ERROR", 403);
    this.name = "ApiKeySecurityError";
  }
}

// 密钥验证结果接口
export interface ApiKeyValidationResult {
  isValid: boolean;
  isConfigured: boolean;
  format: {
    hasCorrectPrefix: boolean;
    hasCorrectLength: boolean;
    matchesPattern: boolean;
  };
  security: {
    isExposed: boolean;
    hasSuspiciousPattern: boolean;
    isTestKey: boolean;
  };
  usage: {
    lastUsed?: Date;
    requestCount: number;
    errorRate: number;
  };
  errors: string[];
  warnings: string[];
  score: number; // 0-100 安全评分
}

// 密钥状态跟踪
export interface ApiKeyStatus {
  keyId: string;
  isValid: boolean;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  expirationDate?: Date;
}

/**
 * 验证 GROQ API 密钥格式
 */
export function validateGroqApiKey(apiKey: string | undefined): ApiKeyValidationResult {
  const result: ApiKeyValidationResult = {
    isValid: false,
    isConfigured: false,
    format: {
      hasCorrectPrefix: false,
      hasCorrectLength: false,
      matchesPattern: false,
    },
    security: {
      isExposed: false,
      hasSuspiciousPattern: false,
      isTestKey: false,
    },
    usage: {
      requestCount: 0,
      errorRate: 0,
    },
    errors: [],
    warnings: [],
    score: 0,
  };

  if (!apiKey) {
    result.errors.push("GROQ API 密钥未配置");
    return result;
  }

  result.isConfigured = true;

  // 检查密钥格式
  result.format.hasCorrectPrefix = apiKey.startsWith(GROQ_API_KEY_PREFIX);
  result.format.hasCorrectLength = apiKey.length >= GROQ_API_KEY_MIN_LENGTH;
  result.format.matchesPattern = GROQ_API_KEY_PATTERN.test(apiKey);

  if (!result.format.hasCorrectPrefix) {
    result.errors.push(`GROQ API 密钥必须以 '${GROQ_API_KEY_PREFIX}' 开头`);
  }

  if (!result.format.hasCorrectLength) {
    result.errors.push(`GROQ API 密钥长度至少需要 ${GROQ_API_KEY_MIN_LENGTH} 个字符`);
  }

  if (!result.format.matchesPattern) {
    result.errors.push("GROQ API 密钥格式无效");
  }

  // 安全性检查
  checkApiKeySecurity(apiKey, result);

  // 计算安全评分
  result.score = calculateSecurityScore(result);
  result.isValid = result.errors.length === 0 && result.score >= 70;

  return result;
}

/**
 * 检查密钥安全性
 */
function checkApiKeySecurity(apiKey: string, result: ApiKeyValidationResult): void {
  const lowerKey = apiKey.toLowerCase();

  // 检查是否暴露在客户端代码中（基本检查）
  const suspiciousPatterns = [/console\.log/, /alert\(/, /document\.write/, /innerHTML/];

  result.security.isExposed = suspiciousPatterns.some((pattern) => pattern.test(lowerKey));
  if (result.security.isExposed) {
    result.errors.push("API 密钥可能被暴露在客户端代码中");
  }

  // 检查可疑模式
  const dangerousPatterns = [/password/i, /secret/i, /token/i, /key.*key/i];

  result.security.hasSuspiciousPattern = dangerousPatterns.some((pattern) =>
    pattern.test(lowerKey),
  );
  if (result.security.hasSuspiciousPattern) {
    result.warnings.push("API 密钥包含可疑模式");
  }

  // 检查是否为测试密钥
  result.security.isTestKey = lowerKey.includes("test") || lowerKey.includes("demo");
  if (result.security.isTestKey) {
    result.warnings.push("使用的是测试密钥，生产环境请使用正式密钥");
  }

  // 检查是否为硬编码的示例密钥
  const examplePatterns = [/your_groq_api_key_here/i, /example/i, /sample/i, /placeholder/i];

  if (examplePatterns.some((pattern) => pattern.test(lowerKey))) {
    result.errors.push("使用的是示例密钥，请配置真实的 GROQ API 密钥");
  }
}

/**
 * 计算安全评分
 */
function calculateSecurityScore(result: ApiKeyValidationResult): number {
  let score = 100;

  // 格式错误扣分
  if (!result.format.hasCorrectPrefix) score -= 30;
  if (!result.format.hasCorrectLength) score -= 20;
  if (!result.format.matchesPattern) score -= 25;

  // 安全问题扣分
  if (result.security.isExposed) score -= 40;
  if (result.security.hasSuspiciousPattern) score -= 15;
  if (result.security.isTestKey) score -= 10;

  // 使用情况扣分
  if (result.usage.errorRate > 0.5) score -= 20;
  if (result.usage.errorRate > 0.2) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * 创建安全的 GROQ 客户端配置
 */
export function createSecureGroqConfig(apiKey: string): {
  apiKey: string;
  baseURL?: string;
  timeout: number;
  maxRetries: number;
} {
  const validation = validateGroqApiKey(apiKey);

  // 首先检查安全错误
  if (validation.security.isExposed) {
    throw new ApiKeySecurityError("API 密钥安全性问题: 密钥可能被暴露在客户端代码中");
  }

  // 然后检查格式错误
  if (!validation.isValid) {
    throw new ApiKeyValidationError(`无效的 GROQ API 密钥: ${validation.errors.join(", ")}`);
  }

  return {
    apiKey,
    baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    timeout: parseInt(process.env.GROQ_TIMEOUT_MS || "30000", 10),
    maxRetries: parseInt(process.env.GROQ_MAX_RETRIES || "3", 10),
  };
}

/**
 * 生成密钥轮换建议
 */
export function generateKeyRotationSuggestion(status: ApiKeyStatus): {
  shouldRotate: boolean;
  reason: string;
  priority: "low" | "medium" | "high" | "critical";
  recommendedAction: string;
} {
  const now = new Date();
  const daysSinceLastUse = status.lastUsed
    ? (now.getTime() - status.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  const errorRate = status.requestCount > 0 ? status.errorCount / status.requestCount : 0;

  // 检查是否需要轮换
  if (errorRate > 0.3) {
    return {
      shouldRotate: true,
      reason: `错误率过高 (${(errorRate * 100).toFixed(1)}%)`,
      priority: "critical",
      recommendedAction: "立即更换 API 密钥，错误率过高可能导致服务中断",
    };
  }

  if (status.expirationDate && status.expirationDate <= now) {
    return {
      shouldRotate: true,
      reason: "API 密钥已过期",
      priority: "critical",
      recommendedAction: "立即更换已过期的 API 密钥",
    };
  }

  if (
    status.expirationDate &&
    status.expirationDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000
  ) {
    return {
      shouldRotate: true,
      reason: "API 密钥即将过期（7天内）",
      priority: "high",
      recommendedAction: "尽快更换即将过期的 API 密钥",
    };
  }

  if (daysSinceLastUse > 90) {
    return {
      shouldRotate: true,
      reason: "API 密钥长期未使用",
      priority: "medium",
      recommendedAction: "考虑更换长期未使用的密钥以提高安全性",
    };
  }

  if (status.requestCount > 10000) {
    return {
      shouldRotate: true,
      reason: "API 密钥使用次数过多",
      priority: "medium",
      recommendedAction: "定期更换高使用频率的密钥以减少风险",
    };
  }

  return {
    shouldRotate: false,
    reason: "API 密钥状态正常",
    priority: "low",
    recommendedAction: "继续监控密钥使用状态",
  };
}

/**
 * 验证环境配置
 */
export function validateEnvironmentConfiguration(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    hasGroqKey: boolean;
    groqKeyValidation?: ApiKeyValidationResult;
    hasTimeoutConfig: boolean;
    hasRetryConfig: boolean;
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const groqApiKey = process.env.GROQ_API_KEY;
  const timeout = process.env.GROQ_TIMEOUT_MS;
  const maxRetries = process.env.GROQ_MAX_RETRIES;

  const config: {
    hasGroqKey: boolean;
    hasTimeoutConfig: boolean;
    hasRetryConfig: boolean;
    groqKeyValidation?: ApiKeyValidationResult;
  } = {
    hasGroqKey: !!groqApiKey,
    hasTimeoutConfig: !!timeout,
    hasRetryConfig: !!maxRetries,
  };

  // 验证 GROQ API 密钥
  if (groqApiKey) {
    const validation = validateGroqApiKey(groqApiKey);
    config.groqKeyValidation = validation;

    if (!validation.isValid) {
      errors.push(...validation.errors);
    }

    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings);
    }
  } else {
    errors.push("GROQ_API_KEY 环境变量未设置");
  }

  // 验证超时配置
  if (timeout) {
    const timeoutMs = parseInt(timeout, 10);
    if (Number.isNaN(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300000) {
      warnings.push("GROQ_TIMEOUT_MS 应在 1000-300000 毫秒之间");
    }
  } else {
    warnings.push("GROQ_TIMEOUT_MS 未设置，使用默认值 30000ms");
  }

  // 验证重试配置
  if (maxRetries) {
    const retryCount = parseInt(maxRetries, 10);
    if (Number.isNaN(retryCount) || retryCount < 0 || retryCount > 10) {
      warnings.push("GROQ_MAX_RETRIES 应在 0-10 之间");
    }
  } else {
    warnings.push("GROQ_MAX_RETRIES 未设置，使用默认值 3");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * 获取详细的配置状态报告
 */
export function getConfigurationReport(): {
  summary: {
    status: "healthy" | "warning" | "error";
    score: number;
    message: string;
  };
  details: {
    groq: ApiKeyValidationResult | null;
    environment: {
      nodeEnv: string;
      isProduction: boolean;
      isDevelopment: boolean;
    };
    security: {
      hasEnvironmentChecks: boolean;
      configurationSecurity: string;
    };
  };
  recommendations: string[];
} {
  const envConfig = validateEnvironmentConfiguration();
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const isDevelopment = nodeEnv === "development";

  // 计算总体状态
  let score = 100;
  if (envConfig.errors.length > 0) score -= 50;
  if (envConfig.warnings.length > 0) score -= 20;

  if (envConfig.config.groqKeyValidation) {
    score = Math.min(score, envConfig.config.groqKeyValidation.score);
  }

  const status: "healthy" | "warning" | "error" =
    envConfig.errors.length > 0
      ? "error"
      : envConfig.warnings.length > 0 || score < 80
        ? "warning"
        : "healthy";

  const recommendations: string[] = [];

  if (envConfig.errors.length > 0) {
    recommendations.push("修复所有配置错误以确保服务正常运行");
  }

  if (envConfig.warnings.length > 0) {
    recommendations.push("处理配置警告以提高系统稳定性");
  }

  if (isProduction && !envConfig.config.hasGroqKey) {
    recommendations.push("生产环境必须配置 GROQ_API_KEY");
  }

  if (envConfig.config.groqKeyValidation?.security.isExposed) {
    recommendations.push("检查 API 密钥是否被意外暴露");
  }

  return {
    summary: {
      status,
      score,
      message:
        status === "healthy"
          ? "配置状态良好"
          : status === "warning"
            ? "配置存在警告"
            : "配置存在错误需要修复",
    },
    details: {
      groq: envConfig.config.groqKeyValidation || null,
      environment: {
        nodeEnv,
        isProduction,
        isDevelopment,
      },
      security: {
        hasEnvironmentChecks: true,
        configurationSecurity: score >= 80 ? "良好" : score >= 60 ? "一般" : "较差",
      },
    },
    recommendations,
  };
}
