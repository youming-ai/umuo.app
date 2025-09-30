/**
 * API性能监控
 * 专门监控API调用的性能指标，包括请求时间、成功率、错误率等
 */

import { PerformanceMonitoring, MetricCategory } from "./performance-monitoring";
import type { AppError } from "@/types/errors";

// API操作类型
export enum ApiOperation {
  TRANSCRIPTION = "transcription",
  GROQ_API = "groq_api",
  OPENROUTER_API = "openrouter_api",
  FILE_UPLOAD = "file_upload",
  FILE_DOWNLOAD = "file_download",
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  HEALTH_CHECK = "health_check",
}

// HTTP方法
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

// API性能指标
export interface ApiPerformanceMetric {
  operation: ApiOperation;
  method: HttpMethod;
  endpoint: string;
  requestTime: number;
  responseTime: number;
  duration: number;
  statusCode: number;
  success: boolean;
  requestSize: number;
  responseSize: number;
  error?: string;
  errorType?: string;
  retryCount: number;
  cached: boolean;
  metadata?: Record<string, unknown>;
}

// API错误类型
export enum ApiErrorType {
  NETWORK_ERROR = "network_error",
  TIMEOUT_ERROR = "timeout_error",
  SERVER_ERROR = "server_error",
  CLIENT_ERROR = "client_error",
  AUTHENTICATION_ERROR = "authentication_error",
  RATE_LIMIT_ERROR = "rate_limit_error",
  VALIDATION_ERROR = "validation_error",
  UNKNOWN_ERROR = "unknown_error",
}

// API端点统计
export interface ApiEndpointStats {
  endpoint: string;
  operation: ApiOperation;
  method: HttpMethod;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  averageRequestSize: number;
  averageResponseSize: number;
  errorRate: number;
  successRate: number;
  lastRequestTime: number;
  retryRate: number;
  cacheHitRate: number;
}

// API统计信息
export interface ApiStats {
  totalRequests: number;
  totalDataTransferred: number;
  averageResponseTime: number;
  successRate: number;
  errorBreakdown: Record<ApiErrorType, number>;
  operationBreakdown: Record<
    ApiOperation,
    {
      count: number;
      averageTime: number;
      successRate: number;
      errorRate: number;
    }
  >;
  methodBreakdown: Record<
    HttpMethod,
    {
      count: number;
      averageTime: number;
      successRate: number;
    }
  >;
  statusCodeBreakdown: Record<number, number>;
  endpointStats: ApiEndpointStats[];
  throughput: number; // requests per second
}

// API监控配置
export interface ApiMonitoringConfig {
  enabled: boolean;
  trackRequestHeaders: boolean;
  trackResponseHeaders: boolean;
  trackRequestBody: boolean;
  trackResponseBody: boolean;
  trackSlowRequests: boolean;
  slowRequestThreshold: number; // ms
  trackRateLimits: boolean;
  trackRetries: boolean;
  trackCachePerformance: boolean;
  enableRealTimeMonitoring: boolean;
  maxHistorySize: number;
  samplingRate: number;
  performanceAlertThresholds: {
    averageResponseTime: number; // ms
    errorRate: number; // percentage
    rateLimitHitRate: number; // percentage
  };
}

// 默认配置
const DEFAULT_API_MONITORING_CONFIG: Required<ApiMonitoringConfig> = {
  enabled: true,
  trackRequestHeaders: false,
  trackResponseHeaders: false,
  trackRequestBody: false,
  trackResponseBody: false,
  trackSlowRequests: true,
  slowRequestThreshold: 5000, // 5秒
  trackRateLimits: true,
  trackRetries: true,
  trackCachePerformance: true,
  enableRealTimeMonitoring: true,
  maxHistorySize: 3000,
  samplingRate: 1.0,
  performanceAlertThresholds: {
    averageResponseTime: 2000, // 2秒
    errorRate: 5, // 5%
    rateLimitHitRate: 10, // 10%
  },
};

// API性能监控类
export class ApiPerformanceMonitoring {
  private config: Required<ApiMonitoringConfig>;
  private performanceMonitoring: PerformanceMonitoring;
  private metrics: ApiPerformanceMetric[] = [];
  private activeRequests: Map<
    string,
    {
      startTime: number;
      operation: ApiOperation;
      method: HttpMethod;
      endpoint: string;
      requestSize: number;
      retryCount: number;
      metadata?: Record<string, unknown>;
    }
  > = new Map();
  private endpointStats: Map<string, ApiEndpointStats> = new Map();

  constructor(
    config: Partial<ApiMonitoringConfig> = {},
    performanceMonitoring?: PerformanceMonitoring,
  ) {
    this.config = { ...DEFAULT_API_MONITORING_CONFIG, ...config };
    this.performanceMonitoring = performanceMonitoring || new PerformanceMonitoring();
  }

  // 开始API请求监控
  startApiRequest(
    operation: ApiOperation,
    method: HttpMethod,
    endpoint: string,
    requestSize: number = 0,
    metadata?: Record<string, unknown>,
  ): string {
    if (!this.config.enabled) return "";

    const requestId = `${operation}_${method}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    this.activeRequests.set(requestId, {
      startTime,
      operation,
      method,
      endpoint,
      requestSize,
      retryCount: 0,
      metadata,
    });

    return requestId;
  }

  // 结束API请求监控
  endApiRequest(
    requestId: string,
    statusCode: number,
    responseSize: number = 0,
    error?: string,
    errorType?: ApiErrorType,
    cached: boolean = false,
    additionalMetadata?: Record<string, unknown>,
  ): ApiPerformanceMetric | null {
    if (!this.config.enabled) return null;

    const request = this.activeRequests.get(requestId);
    if (!request) return null;

    const endTime = performance.now();
    const duration = endTime - request.startTime;
    const success = statusCode >= 200 && statusCode < 400;

    const metric: ApiPerformanceMetric = {
      operation: request.operation,
      method: request.method,
      endpoint: request.endpoint,
      requestTime: request.startTime,
      responseTime: endTime,
      duration,
      statusCode,
      success,
      requestSize: request.requestSize,
      responseSize,
      error,
      errorType,
      retryCount: request.retryCount,
      cached,
      metadata: {
        ...request.metadata,
        ...additionalMetadata,
        requestId,
      },
    };

    // 添加到历史记录
    this.metrics.push(metric);
    this.trimHistory();

    // 更新端点统计
    this.updateEndpointStats(metric);

    // 记录到性能监控系统
    this.recordMetricToPerformanceMonitoring(metric);

    // 检查慢请求
    if (this.config.trackSlowRequests && duration > this.config.slowRequestThreshold) {
      this.recordSlowRequest(metric);
    }

    // 检查速率限制
    if (this.config.trackRateLimits && statusCode === 429) {
      this.recordRateLimitHit(metric);
    }

    // 清理活动请求
    this.activeRequests.delete(requestId);

    return metric;
  }

  // 记录请求重试
  recordRetry(requestId: string): void {
    if (!this.config.enabled || !this.config.trackRetries) return;

    const request = this.activeRequests.get(requestId);
    if (request) {
      request.retryCount++;
    }
  }

  // 记录缓存命中
  recordCacheHit(operation: ApiOperation, endpoint: string, responseTime: number): void {
    if (!this.config.enabled || !this.config.trackCachePerformance) return;

    this.performanceMonitoring.recordMetric("api_cache_hit", MetricCategory.API, 1, "count", {
      operation,
      endpoint,
    });

    this.performanceMonitoring.recordMetric(
      "api_cache_response_time",
      MetricCategory.API,
      responseTime,
      "ms",
      { operation, endpoint },
    );
  }

  // 记录缓存未命中
  recordCacheMiss(operation: ApiOperation, endpoint: string): void {
    if (!this.config.enabled || !this.config.trackCachePerformance) return;

    this.performanceMonitoring.recordMetric("api_cache_miss", MetricCategory.API, 1, "count", {
      operation,
      endpoint,
    });
  }

  // 获取API统计信息
  getApiStats(): ApiStats {
    const successfulMetrics = this.metrics.filter((m) => m.success);
    const failedMetrics = this.metrics.filter((m) => !m.success);

    const totalRequests = this.metrics.length;
    const totalDataTransferred = this.metrics.reduce(
      (sum, m) => sum + m.requestSize + m.responseSize,
      0,
    );
    const averageResponseTime =
      totalRequests > 0 ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests : 0;
    const successRate = totalRequests > 0 ? (successfulMetrics.length / totalRequests) * 100 : 0;

    // 错误分类统计
    const errorBreakdown: Record<ApiErrorType, number> = {} as any;
    Object.values(ApiErrorType).forEach((errorType) => {
      errorBreakdown[errorType] = failedMetrics.filter((m) => m.errorType === errorType).length;
    });

    // 操作分类统计
    const operationBreakdown: Record<
      ApiOperation,
      {
        count: number;
        averageTime: number;
        successRate: number;
        errorRate: number;
      }
    > = {} as any;

    Object.values(ApiOperation).forEach((operation) => {
      const operationMetrics = this.metrics.filter((m) => m.operation === operation);
      const successfulOperationMetrics = operationMetrics.filter((m) => m.success);

      operationBreakdown[operation] = {
        count: operationMetrics.length,
        averageTime:
          operationMetrics.length > 0
            ? operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length
            : 0,
        successRate:
          operationMetrics.length > 0
            ? (successfulOperationMetrics.length / operationMetrics.length) * 100
            : 0,
        errorRate:
          operationMetrics.length > 0
            ? ((operationMetrics.length - successfulOperationMetrics.length) /
                operationMetrics.length) *
              100
            : 0,
      };
    });

    // 方法分类统计
    const methodBreakdown: Record<
      HttpMethod,
      {
        count: number;
        averageTime: number;
        successRate: number;
      }
    > = {} as any;

    Object.values(HttpMethod).forEach((method) => {
      const methodMetrics = this.metrics.filter((m) => m.method === method);
      const successfulMethodMetrics = methodMetrics.filter((m) => m.success);

      methodBreakdown[method] = {
        count: methodMetrics.length,
        averageTime:
          methodMetrics.length > 0
            ? methodMetrics.reduce((sum, m) => sum + m.duration, 0) / methodMetrics.length
            : 0,
        successRate:
          methodMetrics.length > 0
            ? (successfulMethodMetrics.length / methodMetrics.length) * 100
            : 0,
      };
    });

    // 状态码分类统计
    const statusCodeBreakdown: Record<number, number> = {};
    this.metrics.forEach((metric) => {
      statusCodeBreakdown[metric.statusCode] = (statusCodeBreakdown[metric.statusCode] || 0) + 1;
    });

    // 端点统计
    const endpointStats = Array.from(this.endpointStats.values());

    // 计算吞吐量
    const oldestMetric = this.metrics[0];
    const newestMetric = this.metrics[this.metrics.length - 1];
    const timeSpan =
      newestMetric && oldestMetric ? newestMetric.responseTime - oldestMetric.requestTime : 0;
    const throughput = timeSpan > 0 ? (totalRequests / timeSpan) * 1000 : 0;

    return {
      totalRequests,
      totalDataTransferred,
      averageResponseTime,
      successRate,
      errorBreakdown,
      operationBreakdown,
      methodBreakdown,
      statusCodeBreakdown,
      endpointStats,
      throughput,
    };
  }

  // 获取实时API性能指标
  getRealTimeMetrics(timeWindow: number = 60000): {
    activeRequests: number;
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
    slowRequestRate: number;
    rateLimitHitRate: number;
    cacheHitRate: number;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter((m) => m.requestTime > cutoff);

    const successfulRecent = recentMetrics.filter((m) => m.success);
    const failedRecent = recentMetrics.filter((m) => !m.success);
    const slowRequests = recentMetrics.filter((m) => m.duration > this.config.slowRequestThreshold);
    const rateLimitHits = recentMetrics.filter((m) => m.statusCode === 429);
    const cacheHits = recentMetrics.filter((m) => m.cached);

    return {
      activeRequests: this.activeRequests.size,
      averageResponseTime:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
          : 0,
      successRate:
        recentMetrics.length > 0 ? (successfulRecent.length / recentMetrics.length) * 100 : 0,
      errorRate: recentMetrics.length > 0 ? (failedRecent.length / recentMetrics.length) * 100 : 0,
      throughput: (recentMetrics.length / timeWindow) * 1000, // requests per second
      slowRequestRate:
        recentMetrics.length > 0 ? (slowRequests.length / recentMetrics.length) * 100 : 0,
      rateLimitHitRate:
        recentMetrics.length > 0 ? (rateLimitHits.length / recentMetrics.length) * 100 : 0,
      cacheHitRate: recentMetrics.length > 0 ? (cacheHits.length / recentMetrics.length) * 100 : 0,
    };
  }

  // 获取API性能报告
  getApiPerformanceReport(): {
    stats: ApiStats;
    realTimeMetrics: any;
    slowRequests: ApiPerformanceMetric[];
    rateLimitHits: ApiPerformanceMetric[];
    performanceAlerts: string[];
    recommendations: string[];
    timestamp: number;
  } {
    const stats = this.getApiStats();
    const realTimeMetrics = this.getRealTimeMetrics();
    const slowRequests = this.metrics
      .filter((m) => m.duration > this.config.slowRequestThreshold)
      .slice(-20); // 最近20个慢请求
    const rateLimitHits = this.metrics.filter((m) => m.statusCode === 429).slice(-20); // 最近20个速率限制命中

    // 生成性能告警
    const performanceAlerts: string[] = [];
    const recommendations: string[] = [];

    // 检查平均响应时间
    if (stats.averageResponseTime > this.config.performanceAlertThresholds.averageResponseTime) {
      performanceAlerts.push(`API平均响应时间过长: ${stats.averageResponseTime.toFixed(1)}ms`);
      recommendations.push("优化API端点性能，考虑使用缓存或异步处理");
    }

    // 检查错误率
    if (realTimeMetrics.errorRate > this.config.performanceAlertThresholds.errorRate) {
      performanceAlerts.push(`API错误率过高: ${realTimeMetrics.errorRate.toFixed(1)}%`);
      recommendations.push("检查API端点状态和错误处理机制");
    }

    // 检查速率限制命中率
    if (
      realTimeMetrics.rateLimitHitRate > this.config.performanceAlertThresholds.rateLimitHitRate
    ) {
      performanceAlerts.push(
        `API速率限制命中率高: ${realTimeMetrics.rateLimitHitRate.toFixed(1)}%`,
      );
      recommendations.push("实现请求队列或退避策略，优化API调用频率");
    }

    // 检查慢请求率
    if (realTimeMetrics.slowRequestRate > 10) {
      performanceAlerts.push(`API慢请求率过高: ${realTimeMetrics.slowRequestRate.toFixed(1)}%`);
      recommendations.push("优化慢请求端点，考虑分页或批量操作");
    }

    // 检查缓存命中率
    if (realTimeMetrics.cacheHitRate < 50) {
      performanceAlerts.push(`API缓存命中率低: ${realTimeMetrics.cacheHitRate.toFixed(1)}%`);
      recommendations.push("改进缓存策略，对频繁访问的数据实施缓存");
    }

    // 检查吞吐量
    if (stats.throughput < 5) {
      performanceAlerts.push(`API吞吐量低: ${stats.throughput.toFixed(1)} req/sec`);
      recommendations.push("使用连接池或并发请求优化API性能");
    }

    return {
      stats,
      realTimeMetrics,
      slowRequests,
      rateLimitHits,
      performanceAlerts,
      recommendations,
      timestamp: Date.now(),
    };
  }

  // 获取端点统计
  getEndpointStats(endpoint: string): ApiEndpointStats | null {
    return this.endpointStats.get(endpoint) || null;
  }

  // 清理历史记录
  clearHistory(): void {
    this.metrics = [];
    this.endpointStats.clear();
  }

  // 私有方法

  private trimHistory(): void {
    if (this.metrics.length > this.config.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.config.maxHistorySize);
    }
  }

  private updateEndpointStats(metric: ApiPerformanceMetric): void {
    const endpointKey = `${metric.method}_${metric.endpoint}`;
    let stats = this.endpointStats.get(endpointKey);

    if (!stats) {
      stats = {
        endpoint: metric.endpoint,
        operation: metric.operation,
        method: metric.method,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: metric.duration,
        maxResponseTime: metric.duration,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        averageRequestSize: 0,
        averageResponseSize: 0,
        errorRate: 0,
        successRate: 0,
        lastRequestTime: 0,
        retryRate: 0,
        cacheHitRate: 0,
      };
      this.endpointStats.set(endpointKey, stats);
    }

    // 更新统计信息
    stats.totalRequests++;
    stats.lastRequestTime = metric.responseTime;

    if (metric.success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    // 更新响应时间统计
    const totalResponseTime =
      stats.averageResponseTime * (stats.totalRequests - 1) + metric.duration;
    stats.averageResponseTime = totalResponseTime / stats.totalRequests;
    stats.minResponseTime = Math.min(stats.minResponseTime, metric.duration);
    stats.maxResponseTime = Math.max(stats.maxResponseTime, metric.duration);

    // 更新大小统计
    const totalRequestSize =
      stats.averageRequestSize * (stats.totalRequests - 1) + metric.requestSize;
    stats.averageRequestSize = totalRequestSize / stats.totalRequests;

    const totalResponseSize =
      stats.averageResponseSize * (stats.totalRequests - 1) + metric.responseSize;
    stats.averageResponseSize = totalResponseSize / stats.totalRequests;

    // 计算错误率
    stats.errorRate = (stats.failedRequests / stats.totalRequests) * 100;

    // 计算成功率
    stats.successRate = (stats.successfulRequests / stats.totalRequests) * 100;

    // 计算重试率
    const endpointMetrics = this.metrics.filter(
      (m) => m.method === metric.method && m.endpoint === metric.endpoint,
    );
    const totalRetries = endpointMetrics.reduce((sum, m) => sum + m.retryCount, 0);
    stats.retryRate =
      endpointMetrics.length > 0 ? (totalRetries / endpointMetrics.length) * 100 : 0;

    // 计算缓存命中率
    const cachedRequests = endpointMetrics.filter((m) => m.cached).length;
    stats.cacheHitRate =
      endpointMetrics.length > 0 ? (cachedRequests / endpointMetrics.length) * 100 : 0;

    // 计算百分位数
    if (endpointMetrics.length > 0) {
      const sortedTimes = endpointMetrics.map((m) => m.duration).sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p99Index = Math.floor(sortedTimes.length * 0.99);
      stats.p95ResponseTime = sortedTimes[p95Index] || 0;
      stats.p99ResponseTime = sortedTimes[p99Index] || 0;
    }
  }

  private recordMetricToPerformanceMonitoring(metric: ApiPerformanceMetric): void {
    // 记录响应时间
    this.performanceMonitoring.recordMetric(
      `api_${metric.operation}_response_time`,
      MetricCategory.API,
      metric.duration,
      "ms",
      { operation: metric.operation, method: metric.method, success: metric.success.toString() },
      {
        statusCode: metric.statusCode,
        endpoint: metric.endpoint,
        requestSize: metric.requestSize,
        responseSize: metric.responseSize,
        cached: metric.cached,
        retryCount: metric.retryCount,
      },
    );

    // 记录请求大小
    this.performanceMonitoring.recordMetric(
      `api_${metric.operation}_request_size`,
      MetricCategory.API,
      metric.requestSize,
      "bytes",
      { operation: metric.operation, method: metric.method },
      {
        endpoint: metric.endpoint,
        responseTime: metric.duration,
        success: metric.success,
      },
    );

    // 记录响应大小
    this.performanceMonitoring.recordMetric(
      `api_${metric.operation}_response_size`,
      MetricCategory.API,
      metric.responseSize,
      "bytes",
      { operation: metric.operation, method: metric.method },
      {
        endpoint: metric.endpoint,
        responseTime: metric.duration,
        success: metric.success,
      },
    );

    // 记录成功率
    this.performanceMonitoring.recordMetric(
      `api_${metric.operation}_success`,
      MetricCategory.API,
      metric.success ? 1 : 0,
      "boolean",
      { operation: metric.operation, method: metric.method },
      {
        statusCode: metric.statusCode,
        responseTime: metric.duration,
        error: metric.error,
      },
    );
  }

  private recordSlowRequest(metric: ApiPerformanceMetric): void {
    this.performanceMonitoring.recordMetric(
      "api_slow_request",
      MetricCategory.API,
      metric.duration,
      "ms",
      { operation: metric.operation, method: metric.method, severity: "warning" },
      {
        threshold: this.config.slowRequestThreshold,
        exceededBy: metric.duration - this.config.slowRequestThreshold,
        endpoint: metric.endpoint,
        statusCode: metric.statusCode,
        requestSize: metric.requestSize,
        responseSize: metric.responseSize,
      },
    );
  }

  private recordRateLimitHit(metric: ApiPerformanceMetric): void {
    this.performanceMonitoring.recordMetric(
      "api_rate_limit_hit",
      MetricCategory.API,
      1,
      "count",
      { operation: metric.operation, method: metric.method, severity: "warning" },
      {
        endpoint: metric.endpoint,
        responseTime: metric.duration,
        retryCount: metric.retryCount,
      },
    );
  }
}

// 全局API性能监控实例
let globalApiPerformanceMonitoring: ApiPerformanceMonitoring | null = null;

// 获取全局API性能监控实例
export function getApiPerformanceMonitoring(): ApiPerformanceMonitoring {
  if (!globalApiPerformanceMonitoring) {
    globalApiPerformanceMonitoring = new ApiPerformanceMonitoring();
  }
  return globalApiPerformanceMonitoring;
}

// 初始化全局API性能监控
export function initializeApiPerformanceMonitoring(config?: Partial<ApiMonitoringConfig>): void {
  const monitoring = getApiPerformanceMonitoring();
  // 配置已经通过构造函数设置
}

// 便捷的API请求监控函数
export function monitorApiRequest<T>(
  operation: ApiOperation,
  method: HttpMethod,
  endpoint: string,
  requestSize: number,
  fn: () => T,
  metadata?: Record<string, unknown>,
): T {
  const monitoring = getApiPerformanceMonitoring();
  const requestId = monitoring.startApiRequest(operation, method, endpoint, requestSize, metadata);

  try {
    const result = fn();
    monitoring.endApiRequest(requestId, 200, 0);
    return result;
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error ? error.statusCode : 500;
    const errorMessage = error instanceof Error ? error.message : String(error);
    monitoring.endApiRequest(requestId, Number(statusCode), 0, errorMessage);
    throw error;
  }
}

// 异步API请求监控函数
export async function monitorAsyncApiRequest<T>(
  operation: ApiOperation,
  method: HttpMethod,
  endpoint: string,
  requestSize: number,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const monitoring = getApiPerformanceMonitoring();
  const requestId = monitoring.startApiRequest(operation, method, endpoint, requestSize, metadata);

  try {
    const result = await fn();
    monitoring.endApiRequest(requestId, 200, 0);
    return result;
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error ? error.statusCode : 500;
    const errorMessage = error instanceof Error ? error.message : String(error);
    monitoring.endApiRequest(requestId, Number(statusCode), 0, errorMessage);
    throw error;
  }
}

// 便捷的API性能Hook
export function useApiPerformanceMonitoring() {
  const monitoring = getApiPerformanceMonitoring();

  return {
    monitorApiRequest,
    monitorAsyncApiRequest,
    startApiRequest: (
      operation: ApiOperation,
      method: HttpMethod,
      endpoint: string,
      requestSize: number = 0,
      metadata?: Record<string, unknown>,
    ) => monitoring.startApiRequest(operation, method, endpoint, requestSize, metadata),
    endApiRequest: (
      requestId: string,
      statusCode: number,
      responseSize: number = 0,
      error?: string,
      errorType?: ApiErrorType,
      cached: boolean = false,
      metadata?: Record<string, unknown>,
    ) =>
      monitoring.endApiRequest(
        requestId,
        statusCode,
        responseSize,
        error,
        errorType,
        cached,
        metadata,
      ),
    recordRetry: (requestId: string) => monitoring.recordRetry(requestId),
    recordCacheHit: (operation: ApiOperation, endpoint: string, responseTime: number) =>
      monitoring.recordCacheHit(operation, endpoint, responseTime),
    recordCacheMiss: (operation: ApiOperation, endpoint: string) =>
      monitoring.recordCacheMiss(operation, endpoint),
    getApiStats: () => monitoring.getApiStats(),
    getRealTimeMetrics: (timeWindow?: number) => monitoring.getRealTimeMetrics(timeWindow),
    getApiPerformanceReport: () => monitoring.getApiPerformanceReport(),
    getEndpointStats: (endpoint: string) => monitoring.getEndpointStats(endpoint),
  };
}
