/**
 * 健康检查通用工具函数
 */

import {
  HealthCheckResult,
  HealthCheckConfig,
  CheckStatus,
  CheckCategory,
  SeverityLevel,
  CheckMetrics,
} from './types';

/**
 * 创建检查结果的基础结构
 */
export function createHealthCheckResult(
  category: CheckCategory,
  name: string,
  description: string,
  status: CheckStatus,
  duration: number,
  message: string,
  options: {
    id?: string;
    severity?: SeverityLevel;
    metrics?: CheckMetrics;
    details?: Record<string, unknown>;
    suggestions?: string[];
    autoFixAvailable?: boolean;
    error?: {
      code: string;
      message: string;
      stack?: string;
    };
  } = {}
): HealthCheckResult {
  const timestamp = new Date();
  const id = options.id || `${category}-${timestamp.getTime()}`;

  return {
    id,
    category,
    name,
    description,
    status,
    duration,
    timestamp,
    message,
    severity: options.severity || getDefaultSeverity(status),
    metrics: options.metrics || {},
    details: options.details || {},
    suggestions: options.suggestions || [],
    autoFixAvailable: options.autoFixAvailable || false,
    error: options.error,
  };
}

/**
 * 根据状态获取默认严重程度
 */
export function getDefaultSeverity(status: CheckStatus): SeverityLevel {
  switch (status) {
    case CheckStatus.FAILED:
      return SeverityLevel.HIGH;
    case CheckStatus.WARNING:
      return SeverityLevel.MEDIUM;
    case CheckStatus.PASSED:
      return SeverityLevel.LOW;
    case CheckStatus.RUNNING:
      return SeverityLevel.LOW;
    case CheckStatus.PENDING:
      return SeverityLevel.LOW;
    case CheckStatus.SKIPPED:
      return SeverityLevel.LOW;
    default:
      return SeverityLevel.LOW;
  }
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)}min`;
  } else {
    return `${(ms / 3600000).toFixed(1)}h`;
  }
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleString();
}

/**
 * 计算两个时间戳之间的差值
 */
export function getTimeDifference(start: Date, end: Date = new Date()): number {
  return end.getTime() - start.getTime();
}

/**
 * 创建标准化的错误消息
 */
export function createErrorMessage(
  error: Error,
  category: CheckCategory,
  context?: string
): string {
  const baseMessage = `${category} check failed`;
  const contextMessage = context ? ` (${context})` : '';
  return `${baseMessage}${contextMessage}: ${error.message}`;
}

/**
 * 创建建议列表
 */
export function createSuggestions(
  baseSuggestions: string[],
  specificSuggestions?: string[]
): string[] {
  const suggestions = [...baseSuggestions];

  if (specificSuggestions && specificSuggestions.length > 0) {
    suggestions.push(...specificSuggestions);
  }

  return suggestions;
}

/**
 * 计算健康评分
 */
export function calculateHealthScore(results: HealthCheckResult[]): number {
  if (results.length === 0) {
    return 0;
  }

  let score = 100;
  let penalty = 0;

  for (const result of results) {
    switch (result.status) {
      case CheckStatus.FAILED:
        penalty += getSeverityPenalty(result.severity || SeverityLevel.MEDIUM);
        break;
      case CheckStatus.WARNING:
        penalty += 10;
        break;
      case CheckStatus.SKIPPED:
        penalty += 5;
        break;
    }

    // 性能影响
    if (result.duration > 10000) { // 超过10秒
      penalty += 15;
    } else if (result.duration > 5000) { // 超过5秒
      penalty += 10;
    }
  }

  score = Math.max(0, score - penalty);
  return Math.round(score);
}

/**
 * 获取严重程度惩罚值
 */
function getSeverityPenalty(severity: SeverityLevel): number {
  switch (severity) {
    case SeverityLevel.CRITICAL:
      return 40;
    case SeverityLevel.HIGH:
      return 30;
    case SeverityLevel.MEDIUM:
      return 20;
    case SeverityLevel.LOW:
      return 10;
    default:
      return 15;
  }
}

/**
 * 创建检查配置
 */
export function createCheckConfig(
  category: CheckCategory,
  overrides: Partial<HealthCheckConfig> = {}
): HealthCheckConfig {
  const defaultConfig: HealthCheckConfig = {
    enabled: true,
    timeout: 30000, // 30秒
    retryCount: 3,
    severity: getDefaultSeverity(CheckStatus.PASSED),
  };

  return { ...defaultConfig, ...overrides };
}

/**
 * 验证检查配置
 */
export function validateCheckConfig(config: HealthCheckConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
    errors.push('Timeout must be between 1 second and 5 minutes');
  }

  if (config.retryCount && (config.retryCount < 0 || config.retryCount > 10)) {
    errors.push('Retry count must be between 0 and 10');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 创建重试函数
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('No attempts made');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // 指数退避延迟
      const retryDelay = delay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError;
}

/**
 * 创建超时包装器
 */
export function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

/**
 * 创建性能指标
 */
export function createMetrics(data: Record<string, number>): CheckMetrics {
  return {
    apiResponseTime: data.apiResponseTime,
    apiSuccessRate: data.apiSuccessRate,
    requestCount: data.requestCount,
    memoryUsage: data.memoryUsage,
    cpuUsage: data.cpuUsage,
    uiResponseTime: data.uiResponseTime,
    loadTime: data.loadTime,
    audioProcessingTime: data.audioProcessingTime,
    transcriptionAccuracy: data.transcriptionAccuracy,
    custom: data,
  };
}

/**
 * 解析错误类型
 */
export function parseErrorType(error: Error): string {
  if (error.name) {
    return error.name;
  }

  if (error.message) {
    if (error.message.includes('timeout')) {
      return 'TIMEOUT';
    }
    if (error.message.includes('network')) {
      return 'NETWORK';
    }
    if (error.message.includes('unauthorized')) {
      return 'AUTHENTICATION';
    }
    if (error.message.includes('forbidden')) {
      return 'AUTHORIZATION';
    }
  }

  return 'UNKNOWN';
}

/**
 * 检查是否为网络错误
 */
export function isNetworkError(error: Error): boolean {
  return (
    error.name === 'NetworkError' ||
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('ENOTFOUND')
  );
}

/**
 * 检查是否为认证错误
 */
export function isAuthenticationError(error: Error): boolean {
  return (
    error.message.includes('401') ||
    error.message.includes('unauthorized') ||
    error.message.includes('authentication') ||
    error.message.includes('token')
  );
}

/**
 * 检查是否为服务器错误
 */
export function isServerError(error: Error): boolean {
  const statusCode = extractStatusCode(error);
  return statusCode >= 500 && statusCode < 600;
}

/**
 * 从错误消息中提取状态码
 */
export function extractStatusCode(error: Error): number {
  const match = error.message.match(/\b(\d{3})\b/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * 创建批量操作结果
 */
export function createBatchResult<T>(
  total: number,
  successful: number,
  failed: number,
  results: Array<{ success: boolean; data?: T; error?: Error }>
): {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  results: T[];
  errors: Error[];
} {
  const successRate = total > 0 ? (successful / total) * 100 : 0;
  const successResults = results
    .filter(r => r.success)
    .map(r => r.data as T);
  const errors = results
    .filter(r => !r.success)
    .map(r => r.error as Error);

  return {
    total,
    successful,
    failed,
    successRate,
    results: successResults,
    errors,
  };
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key] as Record<string, any>, source[key] as Record<string, any>);
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * 安全的 JSON 序列化
 */
export function safeJsonStringify(obj: any, fallback?: string): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    console.warn('Failed to serialize object:', error);
    return fallback || JSON.stringify({});
  }
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(json: string, fallback?: T): T | null {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback || null;
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[])>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[])>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成唯一ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, unitIndex);

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 转换为蛇形命名
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 转换为驼峰命名
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 检查对象是否为空
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * 深度冻结对象
 */
export function deepFreeze<T>(obj: T): T {
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (
      obj[prop] !== null &&
      typeof obj[prop] === 'object' &&
      !Object.isFrozen(obj[prop])
    ) {
      deepFreeze(obj[prop]);
    }
  });

  return Object.freeze(obj);
}