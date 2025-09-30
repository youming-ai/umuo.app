/**
 * API错误处理增强模块
 * 提供统一的API调用错误处理、重试机制和监控功能
 */

import {
  type AppError,
  fetchWithErrorHandling,
  handleError,
  handleWithRetry,
  type RetryOptions,
} from "./error-handler";

// API响应接口
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  statusCode: number;
}

// API请求配置
export interface ApiRequestConfig {
  url?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retryOptions?: RetryOptions;
  context?: string;
  enableRetry?: boolean;
  enableCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number; // 缓存时间（毫秒）
}

// API客户端选项
export interface ApiClientOptions {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeout?: number;
  defaultRetryOptions?: RetryOptions;
  enableGlobalCache?: boolean;
  requestInterceptor?: (config: ApiRequestConfig) => ApiRequestConfig;
  responseInterceptor?: (response: Response) => Promise<Response>;
  errorInterceptor?: (error: AppError) => AppError;
}

// 简单的内存缓存
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const memoryCache = new Map<string, CacheEntry>();

// 清理过期缓存
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      memoryCache.delete(key);
    }
  }
}

// 生成缓存键
function generateCacheKey(url: string, config: ApiRequestConfig): string {
  const cacheParts = [url, config.method || "GET", JSON.stringify(config.body)];
  return cacheParts.join("|");
}

// 设置缓存
function setCache(key: string, data: unknown, ttl: number): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });

  // 定期清理过期缓存
  if (memoryCache.size > 100) {
    cleanExpiredCache();
  }
}

// 获取缓存
function getCache(key: string): unknown | null {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data;
}

// 清除缓存
export function clearApiCache(): void {
  memoryCache.clear();
}

// 解析API响应
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.ok) {
      return {
        success: true,
        data: data as T,
        statusCode: response.status,
      };
    } else {
      const message =
        isRecord(data) && typeof data.message === "string" ? data.message : response.statusText;

      const details: Record<string, unknown> = isRecord(data) ? data : { raw: data };

      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message,
          details,
        },
        statusCode: response.status,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: "Failed to parse API response",
        details: { originalError: error instanceof Error ? error.message : String(error) },
      },
      statusCode: response.status,
    };
  }
}

// API客户端类
export class ApiClient {
  private options: Required<ApiClientOptions>;

  constructor(options: ApiClientOptions = {}) {
    this.options = {
      baseURL: options.baseURL || "",
      defaultHeaders: options.defaultHeaders || {},
      defaultTimeout: options.defaultTimeout || 30000,
      defaultRetryOptions: options.defaultRetryOptions || {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
      },
      enableGlobalCache: options.enableGlobalCache ?? false,
      requestInterceptor: options.requestInterceptor || ((config) => config),
      responseInterceptor: options.responseInterceptor || ((response) => Promise.resolve(response)),
      errorInterceptor: options.errorInterceptor || ((error) => error),
    };
  }

  // 构建完整URL
  private buildUrl(url: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return this.options.baseURL + url;
  }

  // 合并请求配置
  private mergeConfig(config: ApiRequestConfig): Required<ApiRequestConfig> {
    return {
      method: config.method || "GET",
      url: config.url || "",
      headers: {
        ...this.options.defaultHeaders,
        ...config.headers,
        "Content-Type": config.body ? "application/json" : "application/json",
      },
      body: config.body,
      timeout: config.timeout || this.options.defaultTimeout,
      retryOptions: {
        ...this.options.defaultRetryOptions,
        ...config.retryOptions,
      },
      context: config.context || "API Request",
      enableRetry: config.enableRetry ?? true,
      enableCache: config.enableCache ?? this.options.enableGlobalCache,
      cacheKey: config.cacheKey || "",
      cacheTTL: config.cacheTTL || 60000, // 默认1分钟缓存
    };
  }

  // 执行HTTP请求
  async request<T = unknown>(url: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const mergedConfig = this.mergeConfig(config);

    // 应用请求拦截器
    const finalConfig = this.options.requestInterceptor(mergedConfig);

    // 检查缓存（仅GET请求）
    if (finalConfig.method === "GET" && finalConfig.enableCache) {
      const cacheKey = finalConfig.cacheKey || generateCacheKey(fullUrl, finalConfig);
      const cachedData = getCache(cacheKey);
      if (cachedData !== null) {
        return {
          success: true,
          data: cachedData as T,
          statusCode: 200,
        };
      }
    }

    try {
      const makeRequest = async (): Promise<Response> => {
        const fetchOptions: RequestInit = {
          method: finalConfig.method,
          headers: finalConfig.headers,
          body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined,
        };

        const response = await fetchWithErrorHandling(
          fullUrl,
          {
            ...fetchOptions,
            retryOptions: finalConfig.enableRetry ? finalConfig.retryOptions : undefined,
          },
          finalConfig.context,
        );

        // 应用响应拦截器
        return this.options.responseInterceptor(response);
      };

      let response: Response;

      if (finalConfig.enableRetry) {
        response = await handleWithRetry(
          makeRequest,
          finalConfig.retryOptions,
          finalConfig.context,
        );
      } else {
        response = await makeRequest();
      }

      const result = await parseApiResponse<T>(response);

      // 缓存成功的GET请求响应
      if (
        result.success &&
        result.data !== undefined &&
        finalConfig.method === "GET" &&
        finalConfig.enableCache
      ) {
        const cacheKey = finalConfig.cacheKey || generateCacheKey(fullUrl, finalConfig);
        setCache(cacheKey, result.data, finalConfig.cacheTTL || 60000);
      }

      return result;
    } catch (error) {
      const appError = handleError(error, finalConfig.context);
      const finalError = this.options.errorInterceptor(appError);

      return {
        success: false,
        error: {
          code: finalError?.code || "UNKNOWN_ERROR",
          message: finalError?.message || "Unknown error occurred",
          details: (finalError?.details as Record<string, unknown>) || {},
        },
        statusCode: finalError?.statusCode || 500,
      };
    }
  }

  // GET请求
  async get<T = unknown>(
    url: string,
    config: Omit<ApiRequestConfig, "method" | "body"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "GET" });
  }

  // POST请求
  async post<T = unknown>(
    url: string,
    body: unknown,
    config: Omit<ApiRequestConfig, "method"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "POST", body });
  }

  // PUT请求
  async put<T = unknown>(
    url: string,
    body: unknown,
    config: Omit<ApiRequestConfig, "method"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "PUT", body });
  }

  // DELETE请求
  async delete<T = unknown>(
    url: string,
    config: Omit<ApiRequestConfig, "method" | "body"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "DELETE" });
  }

  // PATCH请求
  async patch<T = unknown>(
    url: string,
    body: unknown,
    config: Omit<ApiRequestConfig, "method"> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "PATCH", body });
  }
}

// 默认API客户端实例
export const defaultApiClient = new ApiClient();

// 便捷的API请求函数
export async function apiRequest<T = unknown>(
  url: string,
  config: ApiRequestConfig = {},
): Promise<ApiResponse<T>> {
  return defaultApiClient.request<T>(url, config);
}

export async function apiGet<T = unknown>(
  url: string,
  config?: Omit<ApiRequestConfig, "method" | "body">,
): Promise<ApiResponse<T>> {
  return defaultApiClient.get<T>(url, config);
}

export async function apiPost<T = unknown>(
  url: string,
  body: unknown,
  config?: Omit<ApiRequestConfig, "method">,
): Promise<ApiResponse<T>> {
  return defaultApiClient.post<T>(url, body, config);
}

export async function apiPut<T = unknown>(
  url: string,
  body: unknown,
  config?: Omit<ApiRequestConfig, "method">,
): Promise<ApiResponse<T>> {
  return defaultApiClient.put<T>(url, body, config);
}

export async function apiDelete<T = unknown>(
  url: string,
  config?: Omit<ApiRequestConfig, "method" | "body">,
): Promise<ApiResponse<T>> {
  return defaultApiClient.delete<T>(url, config);
}

export async function apiPatch<T = unknown>(
  url: string,
  body: unknown,
  config?: Omit<ApiRequestConfig, "method">,
): Promise<ApiResponse<T>> {
  return defaultApiClient.patch<T>(url, body, config);
}

// API请求Hook（用于React组件）
export function useApi() {
  return {
    get: apiGet,
    post: apiPost,
    put: apiPut,
    delete: apiDelete,
    patch: apiPatch,
    request: apiRequest,
    clearCache: clearApiCache,
  };
}

// 创建API客户端的工厂函数
export function createApiClient(
  baseURL: string,
  options?: Omit<ApiClientOptions, "baseURL">,
): ApiClient {
  return new ApiClient({
    ...options,
    baseURL,
  });
}
