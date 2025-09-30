/**
 * API性能监控测试
 */

import { ApiPerformanceMonitoring, ApiOperation, HttpMethod } from "./api-performance-monitoring";
import { PerformanceMonitoring, MetricCategory } from "./performance-monitoring";

// Mock PerformanceMonitoring
jest.mock("./performance-monitoring");
const MockedPerformanceMonitoring = PerformanceMonitoring as jest.MockedClass<
  typeof PerformanceMonitoring
>;

describe("ApiPerformanceMonitoring", () => {
  let apiMonitoring: ApiPerformanceMonitoring;
  let mockPerformanceMonitoring: jest.Mocked<PerformanceMonitoring>;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 创建mock实例
    mockPerformanceMonitoring =
      new MockedPerformanceMonitoring() as jest.Mocked<PerformanceMonitoring>;
    apiMonitoring = new ApiPerformanceMonitoring({}, mockPerformanceMonitoring);
  });

  describe("constructor", () => {
    test("应该使用提供的配置创建API监控实例", () => {
      const config = {
        enabled: false,
        slowRequestThreshold: 3000,
        maxHistorySize: 1000,
      };

      const customApiMonitoring = new ApiPerformanceMonitoring(config, mockPerformanceMonitoring);

      expect(customApiMonitoring).toBeInstanceOf(ApiPerformanceMonitoring);
    });

    test("应该使用默认配置创建API监控实例", () => {
      expect(apiMonitoring).toBeInstanceOf(ApiPerformanceMonitoring);
    });
  });

  describe("startApiRequest and endApiRequest", () => {
    test("应该正确开始和结束API请求", () => {
      const operation = ApiOperation.TRANSCRIPTION;
      const method = HttpMethod.POST;
      const endpoint = "/api/transcribe";
      const requestSize = 1024;

      const requestId = apiMonitoring.startApiRequest(operation, method, endpoint, requestSize);

      expect(typeof requestId).toBe("string");
      expect(requestId).toContain("transcription_POST");

      // 模拟一些处理时间
      jest.advanceTimersByTime(200);

      const metric = apiMonitoring.endApiRequest(requestId, 200, 2048);

      expect(metric).toMatchObject({
        operation,
        method,
        endpoint,
        duration: expect.any(Number),
        statusCode: 200,
        success: true,
        requestSize,
        responseSize: 2048,
        retryCount: 0,
        cached: false,
      });

      expect(metric?.duration).toBeGreaterThan(180);
    });

    test("应该记录失败的API请求", () => {
      const operation = ApiOperation.GROQ_API;
      const method = HttpMethod.POST;
      const endpoint = "/api/groq/chat";
      const requestSize = 512;
      const statusCode = 500;
      const errorMessage = "Internal server error";

      const requestId = apiMonitoring.startApiRequest(operation, method, endpoint, requestSize);
      const metric = apiMonitoring.endApiRequest(requestId, statusCode, 0, errorMessage);

      expect(metric).toMatchObject({
        operation,
        method,
        endpoint,
        statusCode,
        success: false,
        error: errorMessage,
        requestSize,
      });
    });

    test("应该处理不存在的请求ID", () => {
      const metric = apiMonitoring.endApiRequest("nonexistent_request", 200, 1024);

      expect(metric).toBeNull();
    });

    test("应该在监控禁用时返回空字符串", () => {
      const disabledMonitoring = new ApiPerformanceMonitoring(
        { enabled: false },
        mockPerformanceMonitoring,
      );

      const requestId = disabledMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
      );

      expect(requestId).toBe("");
    });
  });

  describe("recordRetry", () => {
    test("应该记录请求重试", () => {
      const requestId = apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
      );

      apiMonitoring.recordRetry(requestId);
      apiMonitoring.recordRetry(requestId);

      const metric = apiMonitoring.endApiRequest(requestId, 200, 1024);

      expect(metric?.retryCount).toBe(2);
    });

    test("应该在重试监控禁用时不记录", () => {
      const disabledMonitoring = new ApiPerformanceMonitoring(
        { enabled: true, trackRetries: false },
        mockPerformanceMonitoring,
      );

      const requestId = disabledMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
      );

      disabledMonitoring.recordRetry(requestId);

      const metric = disabledMonitoring.endApiRequest(requestId, 200, 1024);

      expect(metric?.retryCount).toBe(0);
    });
  });

  describe("cache performance tracking", () => {
    test("应该记录缓存命中", () => {
      const operation = ApiOperation.TRANSCRIPTION;
      const endpoint = "/api/transcribe";
      const responseTime = 50;

      apiMonitoring.recordCacheHit(operation, endpoint, responseTime);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "api_cache_hit",
        MetricCategory.API,
        1,
        "count",
        { operation, endpoint },
      );

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "api_cache_response_time",
        MetricCategory.API,
        responseTime,
        "ms",
        { operation, endpoint },
      );
    });

    test("应该记录缓存未命中", () => {
      const operation = ApiOperation.GROQ_API;
      const endpoint = "/api/groq/chat";

      apiMonitoring.recordCacheMiss(operation, endpoint);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "api_cache_miss",
        MetricCategory.API,
        1,
        "count",
        { operation, endpoint },
      );
    });

    test("应该在缓存监控禁用时不记录", () => {
      const disabledMonitoring = new ApiPerformanceMonitoring(
        { enabled: true, trackCachePerformance: false },
        mockPerformanceMonitoring,
      );

      disabledMonitoring.recordCacheHit(ApiOperation.TRANSCRIPTION, "/api/test", 50);
      disabledMonitoring.recordCacheMiss(ApiOperation.TRANSCRIPTION, "/api/test");

      expect(mockPerformanceMonitoring.recordMetric).not.toHaveBeenCalledWith(
        "api_cache_hit",
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      expect(mockPerformanceMonitoring.recordMetric).not.toHaveBeenCalledWith(
        "api_cache_miss",
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("getApiStats", () => {
    test("应该计算正确的API统计", () => {
      // 添加一些测试指标
      apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/transcribe",
        1024,
      );
      apiMonitoring.endApiRequest("request_1", 200, 2048);

      apiMonitoring.startApiRequest(ApiOperation.GROQ_API, HttpMethod.POST, "/api/groq/chat", 512);
      apiMonitoring.endApiRequest("request_2", 500, 0, "Server error");

      apiMonitoring.startApiRequest(ApiOperation.OPENROUTER_API, HttpMethod.GET, "/api/models", 0);
      apiMonitoring.endApiRequest("request_3", 200, 1024);

      const stats = apiMonitoring.getApiStats();

      expect(stats).toMatchObject({
        totalRequests: 3,
        totalDataTransferred: expect.any(Number),
        averageResponseTime: expect.any(Number),
        successRate: expect.any(Number),
        errorBreakdown: expect.any(Object),
        operationBreakdown: expect.any(Object),
        methodBreakdown: expect.any(Object),
        statusCodeBreakdown: expect.any(Object),
        endpointStats: expect.any(Array),
        throughput: expect.any(Number),
      });

      expect(stats.successRate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
      expect(stats.operationBreakdown).toHaveProperty(ApiOperation.TRANSCRIPTION);
      expect(stats.operationBreakdown).toHaveProperty(ApiOperation.GROQ_API);
      expect(stats.operationBreakdown).toHaveProperty(ApiOperation.OPENROUTER_API);
      expect(stats.methodBreakdown).toHaveProperty(HttpMethod.POST);
      expect(stats.methodBreakdown).toHaveProperty(HttpMethod.GET);
    });

    test("应该计算端点统计", () => {
      // 添加多个相同端点的请求
      apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/transcribe",
        1024,
      );
      apiMonitoring.endApiRequest("endpoint_test_1", 200, 2048);

      apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/transcribe",
        2048,
      );
      apiMonitoring.endApiRequest("endpoint_test_2", 200, 4096);

      apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/transcribe",
        512,
      );
      apiMonitoring.endApiRequest("endpoint_test_3", 500, 0, "Failed");

      const stats = apiMonitoring.getApiStats();

      expect(stats.endpointStats).toHaveLength(1);
      const endpointStat = stats.endpointStats[0];

      expect(endpointStat).toMatchObject({
        endpoint: "/api/transcribe",
        operation: ApiOperation.TRANSCRIPTION,
        method: HttpMethod.POST,
        totalRequests: 3,
        successfulRequests: 2,
        failedRequests: 1,
        errorRate: expect.any(Number),
        averageRequestSize: expect.any(Number),
        averageResponseSize: expect.any(Number),
      });

      expect(endpointStat.errorRate).toBeCloseTo(33.33, 1); // 1/3 = 33.33%
      expect(endpointStat.successRate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
    });

    test("应该计算重试率", () => {
      const requestId = apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
      );
      apiMonitoring.recordRetry(requestId);
      apiMonitoring.recordRetry(requestId);
      apiMonitoring.endApiRequest(requestId, 200, 1024);

      const stats = apiMonitoring.getApiStats();
      const endpointStat = stats.endpointStats[0];

      expect(endpointStat.retryRate).toBe(200); // 2次重试 / 1个请求 * 100 = 200%
    });

    test("应该计算缓存命中率", () => {
      // 缓存命中
      apiMonitoring.recordCacheHit(ApiOperation.TRANSCRIPTION, "/api/test", 50);
      apiMonitoring.recordCacheHit(ApiOperation.TRANSCRIPTION, "/api/test", 30);

      // 缓存未命中
      apiMonitoring.recordCacheMiss(ApiOperation.TRANSCRIPTION, "/api/test");
      apiMonitoring.recordCacheMiss(ApiOperation.TRANSCRIPTION, "/api/test");
      apiMonitoring.recordCacheMiss(ApiOperation.TRANSCRIPTION, "/api/test");

      // 执行实际的请求（用于端点统计）
      const requestId = apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
      );
      apiMonitoring.endApiRequest(requestId, 200, 1024);

      const stats = apiMonitoring.getApiStats();
      const endpointStat = stats.endpointStats[0];

      expect(endpointStat.cacheHitRate).toBeCloseTo(40, 1); // 2次命中 / 5次总计 = 40%
    });

    test("应该返回空的统计信息如果没有数据", () => {
      const stats = apiMonitoring.getApiStats();

      expect(stats).toMatchObject({
        totalRequests: 0,
        totalDataTransferred: 0,
        averageResponseTime: 0,
        successRate: 0,
        errorBreakdown: expect.any(Object),
        operationBreakdown: expect.any(Object),
        methodBreakdown: expect.any(Object),
        statusCodeBreakdown: {},
        endpointStats: [],
        throughput: 0,
      });
    });
  });

  describe("getRealTimeMetrics", () => {
    test("应该计算实时API性能指标", () => {
      // 添加一些最近的请求
      apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/transcribe",
        1024,
      );
      apiMonitoring.endApiRequest("realtime_1", 200, 2048);

      apiMonitoring.startApiRequest(ApiOperation.GROQ_API, HttpMethod.POST, "/api/groq/chat", 512);
      apiMonitoring.endApiRequest("realtime_2", 500, 0, "Server error");

      const realTimeMetrics = apiMonitoring.getRealTimeMetrics();

      expect(realTimeMetrics).toMatchObject({
        activeRequests: expect.any(Number),
        averageResponseTime: expect.any(Number),
        successRate: expect.any(Number),
        errorRate: expect.any(Number),
        throughput: expect.any(Number),
        slowRequestRate: expect.any(Number),
        rateLimitHitRate: expect.any(Number),
        cacheHitRate: expect.any(Number),
      });

      expect(realTimeMetrics.successRate).toBeCloseTo(50, 1); // 1/2 = 50%
      expect(realTimeMetrics.errorRate).toBeCloseTo(50, 1); // 1/2 = 50%
    });

    test("应该在没有数据时返回默认值", () => {
      const realTimeMetrics = apiMonitoring.getRealTimeMetrics();

      expect(realTimeMetrics).toMatchObject({
        activeRequests: 0,
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 0,
        throughput: 0,
        slowRequestRate: 0,
        rateLimitHitRate: 0,
        cacheHitRate: 0,
      });
    });
  });

  describe("getApiPerformanceReport", () => {
    test("应该生成完整的API性能报告", () => {
      // 添加一些测试数据
      apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/transcribe",
        1024,
      );
      apiMonitoring.endApiRequest("report_1", 200, 2048);

      apiMonitoring.startApiRequest(ApiOperation.GROQ_API, HttpMethod.POST, "/api/groq/chat", 512);
      apiMonitoring.endApiRequest("report_2", 429, 0, "Rate limit exceeded");

      const report = apiMonitoring.getApiPerformanceReport();

      expect(report).toMatchObject({
        stats: expect.any(Object),
        realTimeMetrics: expect.any(Object),
        slowRequests: expect.any(Array),
        rateLimitHits: expect.any(Array),
        performanceAlerts: expect.any(Array),
        recommendations: expect.any(Array),
        timestamp: expect.any(Number),
      });

      expect(report.stats.totalRequests).toBe(2);
      expect(report.rateLimitHits).toHaveLength(1);
    });

    test("应该识别慢请求", () => {
      // 添加一个慢请求
      const requestId = apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/transcribe",
        1024,
      );

      // 模拟很长的响应时间
      jest.advanceTimersByTime(6000); // 6秒，超过默认的5秒阈值

      apiMonitoring.endApiRequest(requestId, 200, 2048);

      const report = apiMonitoring.getApiPerformanceReport();

      expect(report.slowRequests).toHaveLength(1);
      expect(report.slowRequests[0].duration).toBeGreaterThan(5000);
    });

    test("应该识别速率限制命中", () => {
      apiMonitoring.startApiRequest(ApiOperation.GROQ_API, HttpMethod.POST, "/api/groq/chat", 512);
      apiMonitoring.endApiRequest("rate_limit_test", 429, 0, "Rate limit exceeded");

      const report = apiMonitoring.getApiPerformanceReport();

      expect(report.rateLimitHits).toHaveLength(1);
      expect(report.rateLimitHits[0].statusCode).toBe(429);
    });

    test("应该生成性能告警", () => {
      // 添加高错误率的场景
      for (let i = 0; i < 10; i++) {
        apiMonitoring.startApiRequest(
          ApiOperation.TRANSCRIPTION,
          HttpMethod.POST,
          "/api/transcribe",
          1024,
        );
        apiMonitoring.endApiRequest(`alert_${i}`, i < 4 ? 200 : 500, i < 4 ? 2048 : 0);
      }

      const report = apiMonitoring.getApiPerformanceReport();

      expect(report.performanceAlerts.length).toBeGreaterThan(0);
      expect(report.performanceAlerts.some((alert) => alert.includes("API错误率过高"))).toBe(true);
    });
  });

  describe("getEndpointStats", () => {
    test("应该返回特定端点的统计", () => {
      const endpoint = "/api/transcribe";

      apiMonitoring.startApiRequest(ApiOperation.TRANSCRIPTION, HttpMethod.POST, endpoint, 1024);
      apiMonitoring.endApiRequest("endpoint_specific_1", 200, 2048);

      apiMonitoring.startApiRequest(ApiOperation.TRANSCRIPTION, HttpMethod.POST, endpoint, 2048);
      apiMonitoring.endApiRequest("endpoint_specific_2", 500, 0, "Failed");

      const endpointStats = apiMonitoring.getEndpointStats(endpoint);

      expect(endpointStats).toMatchObject({
        endpoint,
        operation: ApiOperation.TRANSCRIPTION,
        method: HttpMethod.POST,
        totalRequests: 2,
        successfulRequests: 1,
        failedRequests: 1,
        errorRate: 50,
        averageResponseTime: expect.any(Number),
      });
    });

    test("应该为不存在的端点返回null", () => {
      const endpointStats = apiMonitoring.getEndpointStats("/api/nonexistent");

      expect(endpointStats).toBeNull();
    });
  });

  describe("clearHistory", () => {
    test("应该清理所有历史记录", () => {
      // 添加一些测试数据
      apiMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/transcribe",
        1024,
      );
      apiMonitoring.endApiRequest("clear_test_1", 200, 2048);

      apiMonitoring.startApiRequest(ApiOperation.GROQ_API, HttpMethod.POST, "/api/groq/chat", 512);
      apiMonitoring.endApiRequest("clear_test_2", 500, 0, "Server error");

      // 确认数据存在
      expect(apiMonitoring.getApiStats().totalRequests).toBe(2);

      // 清理历史
      apiMonitoring.clearHistory();

      // 确认数据已清理
      expect(apiMonitoring.getApiStats().totalRequests).toBe(0);
    });
  });

  describe("slow request detection", () => {
    test("应该记录慢请求", () => {
      const config = { slowRequestThreshold: 200 };
      const sensitiveMonitoring = new ApiPerformanceMonitoring(config, mockPerformanceMonitoring);

      const requestId = sensitiveMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
      );

      // 模拟超过阈值的响应时间
      jest.advanceTimersByTime(300);

      sensitiveMonitoring.endApiRequest(requestId, 200, 1024);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "api_slow_request",
        MetricCategory.API,
        expect.any(Number),
        "ms",
        { operation: ApiOperation.TRANSCRIPTION, method: HttpMethod.POST, severity: "warning" },
        expect.objectContaining({
          threshold: 200,
          exceededBy: expect.any(Number),
        }),
      );
    });

    test("应该在慢请求监控禁用时不记录", () => {
      const disabledMonitoring = new ApiPerformanceMonitoring(
        { enabled: true, trackSlowRequests: false },
        mockPerformanceMonitoring,
      );

      const requestId = disabledMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
      );

      jest.advanceTimersByTime(6000);

      disabledMonitoring.endApiRequest(requestId, 200, 1024);

      expect(mockPerformanceMonitoring.recordMetric).not.toHaveBeenCalledWith(
        "api_slow_request",
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("rate limit detection", () => {
    test("应该记录速率限制命中", () => {
      const requestId = apiMonitoring.startApiRequest(
        ApiOperation.GROQ_API,
        HttpMethod.POST,
        "/api/groq/chat",
        512,
      );

      apiMonitoring.endApiRequest(requestId, 429, 0, "Rate limit exceeded");

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "api_rate_limit_hit",
        MetricCategory.API,
        1,
        "count",
        { operation: ApiOperation.GROQ_API, method: HttpMethod.POST, severity: "warning" },
        expect.objectContaining({
          retryCount: 0,
        }),
      );
    });

    test("应该在速率限制监控禁用时不记录", () => {
      const disabledMonitoring = new ApiPerformanceMonitoring(
        { enabled: true, trackRateLimits: false },
        mockPerformanceMonitoring,
      );

      const requestId = disabledMonitoring.startApiRequest(
        ApiOperation.GROQ_API,
        HttpMethod.POST,
        "/api/groq/chat",
        512,
      );

      disabledMonitoring.endApiRequest(requestId, 429, 0, "Rate limit exceeded");

      expect(mockPerformanceMonitoring.recordMetric).not.toHaveBeenCalledWith(
        "api_rate_limit_hit",
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("configuration edge cases", () => {
    test("应该处理采样率", () => {
      const lowSampleMonitoring = new ApiPerformanceMonitoring(
        { samplingRate: 0 },
        mockPerformanceMonitoring,
      );

      const requestId = lowSampleMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
      );

      expect(requestId).toBe("");
    });

    test("应该限制历史记录大小", () => {
      const limitedMonitoring = new ApiPerformanceMonitoring(
        { maxHistorySize: 2 },
        mockPerformanceMonitoring,
      );

      // 添加超过限制的数据
      limitedMonitoring.startApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test1",
        1024,
      );
      limitedMonitoring.endApiRequest("limited_1", 200, 1024);

      limitedMonitoring.startApiRequest(ApiOperation.GROQ_API, HttpMethod.POST, "/api/test2", 512);
      limitedMonitoring.endApiRequest("limited_2", 200, 1024);

      limitedMonitoring.startApiRequest(
        ApiOperation.OPENROUTER_API,
        HttpMethod.GET,
        "/api/test3",
        0,
      );
      limitedMonitoring.endApiRequest("limited_3", 200, 1024);

      const stats = limitedMonitoring.getApiStats();
      expect(stats.totalRequests).toBe(2); // 应该只保留最新的2条
    });
  });

  describe("utility functions", () => {
    test("monitorApiRequest应该监控同步操作", () => {
      const testFunction = () => {
        // 模拟API调用
        return { data: "success", status: 200 };
      };

      const result = (apiMonitoring as any).monitorApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
        testFunction,
      );

      expect(result).toEqual({ data: "success", status: 200 });

      const stats = apiMonitoring.getApiStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    test("monitorAsyncApiRequest应该监控异步操作", async () => {
      const testFunction = async () => {
        // 模拟异步API调用
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { data: "async success", status: 200 };
      };

      const result = await (apiMonitoring as any).monitorAsyncApiRequest(
        ApiOperation.TRANSCRIPTION,
        HttpMethod.POST,
        "/api/test",
        1024,
        testFunction,
      );

      expect(result).toEqual({ data: "async success", status: 200 });

      const stats = apiMonitoring.getApiStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    test("应该正确处理操作中的错误", () => {
      const testFunction = () => {
        throw new Error("API call failed");
      };

      expect(() => {
        (apiMonitoring as any).monitorApiRequest(
          ApiOperation.TRANSCRIPTION,
          HttpMethod.POST,
          "/api/test",
          1024,
          testFunction,
        );
      }).toThrow("API call failed");

      const stats = apiMonitoring.getApiStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successRate).toBe(0);
    });
  });
});

// 全局函数测试
describe("Global API Performance Monitoring Functions", () => {
  beforeEach(() => {
    // 重置全局实例
    (global as any).globalApiPerformanceMonitoring = null;
    jest.clearAllMocks();
  });

  test("getApiPerformanceMonitoring应该返回单例实例", () => {
    const { getApiPerformanceMonitoring } = require("./api-performance-monitoring");

    const instance1 = getApiPerformanceMonitoring();
    const instance2 = getApiPerformanceMonitoring();

    expect(instance1).toBe(instance2);
  });

  test("initializeApiPerformanceMonitoring应该创建实例", () => {
    const {
      initializeApiPerformanceMonitoring,
      getApiPerformanceMonitoring,
    } = require("./api-performance-monitoring");

    initializeApiPerformanceMonitoring();

    const instance = getApiPerformanceMonitoring();
    expect(instance).toBeDefined();
  });
});
