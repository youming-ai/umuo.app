/**
 * API 性能监控 Hook
 *
 * 提供 API 请求的性能监控功能：
 * - 请求耗时统计
 * - 错误率追踪
 * - 自动重试监控
 */

import { useCallback, useRef } from "react";
import { reportCustomMetric } from "@/lib/utils/web-vitals";

export interface ApiMetrics {
  /** API 端点 */
  endpoint: string;
  /** 请求方法 */
  method: string;
  /** 响应状态码 */
  status: number;
  /** 请求耗时（毫秒） */
  duration: number;
  /** 是否成功 */
  success: boolean;
  /** 是否为重试请求 */
  isRetry: boolean;
  /** 重试次数 */
  retryCount: number;
  /** 请求大小（字节） */
  requestSize?: number;
  /** 响应大小（字节） */
  responseSize?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 报告 API 指标
 */
export function reportApiMetrics(metrics: ApiMetrics): void {
  reportCustomMetric("api-request", metrics.duration, {
    endpoint: metrics.endpoint,
    method: metrics.method,
    status: metrics.status,
    success: metrics.success,
    isRetry: metrics.isRetry,
    retryCount: metrics.retryCount,
    requestSize: metrics.requestSize,
    responseSize: metrics.responseSize,
    error: metrics.error,
  });
}

/**
 * 包装 fetch 请求，自动收集性能指标
 */
export async function monitoredFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method || "GET";
  const startTime = performance.now();

  // 估算请求大小
  let requestSize = 0;
  if (init?.body) {
    if (typeof init.body === "string") {
      requestSize = new Blob([init.body]).size;
    } else if (init.body instanceof Blob) {
      requestSize = init.body.size;
    } else if (init.body instanceof FormData) {
      // FormData 大小估算比较复杂，这里简化处理
      requestSize = 0;
    }
  }

  try {
    const response = await fetch(input, init);
    const duration = performance.now() - startTime;

    // 获取响应大小
    const contentLength = response.headers.get("content-length");
    const responseSize = contentLength ? parseInt(contentLength, 10) : undefined;

    reportApiMetrics({
      endpoint: new URL(url, window.location.origin).pathname,
      method,
      status: response.status,
      duration,
      success: response.ok,
      isRetry: false,
      retryCount: 0,
      requestSize,
      responseSize,
    });

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;

    reportApiMetrics({
      endpoint: new URL(url, window.location.origin).pathname,
      method,
      status: 0,
      duration,
      success: false,
      isRetry: false,
      retryCount: 0,
      requestSize,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * API 性能监控 Hook
 *
 * 提供带有性能监控的 fetch 方法
 */
export function useApiMonitoring() {
  const retryCountRef = useRef<Map<string, number>>(new Map());

  /**
   * 带监控的 fetch 请求
   */
  const fetchWithMonitoring = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const cacheKey = `${init?.method || "GET"}:${url}`;

      const currentRetryCount = retryCountRef.current.get(cacheKey) || 0;
      const startTime = performance.now();

      try {
        const response = await fetch(input, init);
        const duration = performance.now() - startTime;

        // 成功后重置重试计数
        retryCountRef.current.delete(cacheKey);

        reportApiMetrics({
          endpoint: new URL(url, window.location.origin).pathname,
          method: init?.method || "GET",
          status: response.status,
          duration,
          success: response.ok,
          isRetry: currentRetryCount > 0,
          retryCount: currentRetryCount,
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        // 增加重试计数
        retryCountRef.current.set(cacheKey, currentRetryCount + 1);

        reportApiMetrics({
          endpoint: new URL(url, window.location.origin).pathname,
          method: init?.method || "GET",
          status: 0,
          duration,
          success: false,
          isRetry: currentRetryCount > 0,
          retryCount: currentRetryCount,
          error: error instanceof Error ? error.message : String(error),
        });

        throw error;
      }
    },
    [],
  );

  /**
   * 测量 API 调用性能
   */
  const measureApiCall = useCallback(
    async <T>(
      name: string,
      apiCall: () => Promise<T>,
      metadata?: Record<string, unknown>,
    ): Promise<T> => {
      const startTime = performance.now();

      try {
        const result = await apiCall();
        const duration = performance.now() - startTime;

        reportCustomMetric(`api:${name}`, duration, {
          status: "success",
          ...metadata,
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        reportCustomMetric(`api:${name}`, duration, {
          status: "error",
          error: error instanceof Error ? error.message : String(error),
          ...metadata,
        });

        throw error;
      }
    },
    [],
  );

  return {
    fetchWithMonitoring,
    measureApiCall,
    monitoredFetch,
  };
}
