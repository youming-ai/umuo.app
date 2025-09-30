/**
 * 性能监控系统测试
 */

import {
  PerformanceMonitoring,
  MetricCategory,
  type PerformanceMetric,
} from "./performance-monitoring";
import { MonitoringService } from "./monitoring-service";

// Mock MonitoringService
jest.mock("./monitoring-service");
const MockedMonitoringService = MonitoringService as jest.MockedClass<typeof MonitoringService>;

describe("PerformanceMonitoring", () => {
  let monitoring: PerformanceMonitoring;
  let mockMonitoringService: jest.Mocked<MonitoringService>;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 创建mock实例
    mockMonitoringService = new MockedMonitoringService() as jest.Mocked<MonitoringService>;
    monitoring = new PerformanceMonitoring({}, mockMonitoringService);
  });

  describe("constructor", () => {
    test("应该使用提供的配置创建监控实例", () => {
      const config = {
        enabled: false,
        sampleRate: 0.5,
        memoryThreshold: 1000,
      };

      const customMonitoring = new PerformanceMonitoring(config, mockMonitoringService);

      expect(customMonitoring).toBeInstanceOf(PerformanceMonitoring);
    });

    test("应该使用默认配置创建监控实例", () => {
      expect(monitoring).toBeInstanceOf(PerformanceMonitoring);
    });
  });

  describe("recordMetric", () => {
    test("应该正确记录性能指标", () => {
      const metricName = "test_metric";
      const category = MetricCategory.CUSTOM;
      const value = 100;
      const unit = "ms";

      monitoring.recordMetric(metricName, category, value, unit);

      const metrics = monitoring.getMetricsByCategory(category);
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        name: metricName,
        category,
        value,
        unit,
      });
    });

    test("应该应用采样率", () => {
      const config = { sampleRate: 0 };
      const lowSampleMonitoring = new PerformanceMonitoring(config, mockMonitoringService);

      lowSampleMonitoring.recordMetric("test", MetricCategory.CUSTOM, 100, "ms");

      const metrics = lowSampleMonitoring.getMetricsByCategory(MetricCategory.CUSTOM);
      expect(metrics).toHaveLength(0);
    });

    test("应该限制每个分类的指标数量", () => {
      const config = { maxMetricsPerCategory: 2 };
      const limitedMonitoring = new PerformanceMonitoring(config, mockMonitoringService);

      // 添加超过限制的指标
      limitedMonitoring.recordMetric("metric1", MetricCategory.CUSTOM, 100, "ms");
      limitedMonitoring.recordMetric("metric2", MetricCategory.CUSTOM, 200, "ms");
      limitedMonitoring.recordMetric("metric3", MetricCategory.CUSTOM, 300, "ms");

      const metrics = limitedMonitoring.getMetricsByCategory(MetricCategory.CUSTOM);
      expect(metrics).toHaveLength(2);
      expect(metrics[0].name).toBe("metric2");
      expect(metrics[1].name).toBe("metric3");
    });

    test("应该检查性能阈值", () => {
      const config = { performanceThreshold: 50, enableConsoleLogging: false };
      const thresholdMonitoring = new PerformanceMonitoring(config, mockMonitoringService);

      thresholdMonitoring.recordMetric("slow_operation", MetricCategory.CUSTOM, 100, "ms");

      // 验证是否调用了告警方法
      expect(mockMonitoringService.logWarning).toHaveBeenCalledWith(
        "Performance threshold exceeded: custom.slow_operation = 100ms",
        expect.objectContaining({
          component: "performance_monitoring",
          action: "threshold_check",
        }),
      );
    });
  });

  describe("startTimer and endTimer", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("应该正确开始和结束计时器", () => {
      const timerId = monitoring.startTimer("test_operation", MetricCategory.CUSTOM);

      expect(typeof timerId).toBe("string");
      expect(timerId).toContain("custom_test_operation");

      // 模拟一些处理时间
      jest.advanceTimersByTime(100);

      const duration = monitoring.endTimer(timerId);

      expect(duration).toBeGreaterThan(90); // 允许一些误差
      expect(duration).toBeLessThan(200);
    });

    test("应该记录失败的操作", () => {
      const timerId = monitoring.startTimer("failing_operation", MetricCategory.CUSTOM);

      const mockError = new Error("Test error");
      const duration = monitoring.endTimer(timerId, false, mockError as any);

      expect(duration).toBeGreaterThan(0);

      // 验证事件记录
      const events = monitoring.getEventsByCategory(MetricCategory.CUSTOM);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        name: "failing_operation",
        success: false,
        error: mockError,
      });
    });

    test("应该处理不存在的计时器ID", () => {
      const duration = monitoring.endTimer("nonexistent_timer");

      expect(duration).toBeNull();
    });
  });

  describe("getStats", () => {
    test("应该计算正确的统计信息", () => {
      // 添加多个相同名称的指标
      monitoring.recordMetric("test_stat", MetricCategory.CUSTOM, 100, "ms");
      monitoring.recordMetric("test_stat", MetricCategory.CUSTOM, 200, "ms");
      monitoring.recordMetric("test_stat", MetricCategory.CUSTOM, 300, "ms");

      const stats = monitoring.getStats("test_stat", MetricCategory.CUSTOM);

      expect(stats).toMatchObject({
        count: 3,
        sum: 600,
        average: 200,
        min: 100,
        max: 300,
      });
    });

    test("应该返回null如果没有找到统计信息", () => {
      const stats = monitoring.getStats("nonexistent", MetricCategory.CUSTOM);

      expect(stats).toBeNull();
    });
  });

  describe("getMemoryUsage", () => {
    test("应该返回内存使用信息", () => {
      // 模拟performance.memory存在
      const mockMemory = {
        usedJSHeapSize: 100 * 1024 * 1024,
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };

      Object.defineProperty(performance, "memory", {
        value: mockMemory,
        configurable: true,
      });

      const memoryUsage = monitoring.getMemoryUsage();

      expect(memoryUsage).toMatchObject({
        used: 100,
        total: 200,
        percentage: 20,
        jsHeapSizeLimit: 500,
        totalJSHeapSize: 200,
        usedJSHeapSize: 100,
      });

      // 清理
      delete (performance as any).memory;
    });

    test("应该在没有memory API时返回null", () => {
      // 确保performance.memory不存在
      delete (performance as any).memory;

      const memoryUsage = monitoring.getMemoryUsage();

      expect(memoryUsage).toBeNull();
    });
  });

  describe("getSystemHealth", () => {
    test("应该计算系统健康状态", () => {
      // 添加一些性能事件
      monitoring.recordPerformanceEvent({
        name: "test_event",
        category: MetricCategory.CUSTOM,
        startTime: Date.now() / 1000,
        endTime: (Date.now() + 100) / 1000,
        success: true,
      });

      const health = monitoring.getSystemHealth();

      expect(health).toMatchObject({
        status: expect.stringMatching(/healthy|warning|critical/),
        score: expect.any(Number),
        checks: expect.any(Array),
        timestamp: expect.any(Number),
      });

      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
    });

    test("应该根据内存使用情况调整健康状态", () => {
      // 模拟高内存使用
      const mockMemory = {
        usedJSHeapSize: 450 * 1024 * 1024,
        totalJSHeapSize: 500 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024,
      };

      Object.defineProperty(performance, "memory", {
        value: mockMemory,
        configurable: true,
      });

      const health = monitoring.getSystemHealth();

      // 内存使用率90%，应该降低健康评分
      expect(health.score).toBeLessThan(80);

      // 清理
      delete (performance as any).memory;
    });
  });

  describe("getPerformanceReport", () => {
    test("应该生成完整的性能报告", () => {
      // 添加一些测试数据
      monitoring.recordMetric("test_metric", MetricCategory.CUSTOM, 100, "ms");
      monitoring.recordPerformanceEvent({
        name: "test_event",
        category: MetricCategory.CUSTOM,
        startTime: Date.now() / 1000,
        endTime: (Date.now() + 100) / 1000,
        success: true,
      });

      const report = monitoring.getPerformanceReport();

      expect(report).toMatchObject({
        metrics: expect.any(Object),
        events: expect.any(Object),
        stats: expect.any(Object),
        memory: expect.any(Object),
        health: expect.any(Object),
        timestamp: expect.any(Number),
      });

      expect(report.metrics.custom).toHaveLength(1);
      expect(report.events.custom).toHaveLength(1);
      expect(report.stats).toBeDefined();
    });
  });

  describe("flushMetrics", () => {
    test("应该刷新指标并调用基础监控服务", () => {
      monitoring.recordMetric("test_metric", MetricCategory.CUSTOM, 100, "ms");

      monitoring.flushMetrics();

      expect(mockMonitoringService.flush).toHaveBeenCalled();
    });

    test("应该清理旧数据", () => {
      // 添加一个旧的指标（模拟24小时前）
      const oldMetric: PerformanceMetric = {
        id: "old_metric",
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25小时前
        name: "old_metric",
        category: MetricCategory.CUSTOM,
        value: 100,
        unit: "ms",
      };

      // 直接访问私有方法来添加旧指标
      (monitoring as any).metrics.get(MetricCategory.CUSTOM)?.push(oldMetric);

      monitoring.flushMetrics();

      const metrics = monitoring.getMetricsByCategory(MetricCategory.CUSTOM);
      expect(metrics).toHaveLength(0);
    });
  });

  describe("start and stop", () => {
    test("应该启动和停止监控服务", () => {
      // 模拟必要的DOM API
      Object.defineProperty(window, "addEventListener", {
        value: jest.fn(),
        configurable: true,
      });

      Object.defineProperty(global, "setInterval", {
        value: jest.fn(),
        configurable: true,
      });

      Object.defineProperty(global, "clearInterval", {
        value: jest.fn(),
        configurable: true,
      });

      monitoring.start();

      expect(window.addEventListener).toHaveBeenCalled();
      expect(setInterval).toHaveBeenCalled();

      monitoring.stop();

      expect(clearInterval).toHaveBeenCalled();
      expect(mockMonitoringService.flush).toHaveBeenCalled();

      // 清理
      delete (window as any).addEventListener;
      delete (global as any).setInterval;
      delete (global as any).clearInterval;
    });
  });

  describe("utility functions", () => {
    test("measurePerformance应该测量同步函数性能", () => {
      const testFunction = () => {
        // 模拟一些工作
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      const result = (monitoring as any).measurePerformance(
        "sync_test",
        MetricCategory.CUSTOM,
        testFunction,
      );

      expect(result).toBe(499500); // 0+1+2+...+999 = 499500

      const metrics = monitoring.getMetricsByCategory(MetricCategory.CUSTOM);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe("sync_test");
      expect(metrics[0].value).toBeGreaterThan(0);
    });

    test("应该正确处理测量函数中的错误", () => {
      const testFunction = () => {
        throw new Error("Test error");
      };

      expect(() => {
        (monitoring as any).measurePerformance("error_test", MetricCategory.CUSTOM, testFunction);
      }).toThrow("Test error");

      const events = monitoring.getEventsByCategory(MetricCategory.CUSTOM);
      expect(events).toHaveLength(1);
      expect(events[0].success).toBe(false);
    });
  });

  describe("configuration edge cases", () => {
    test("应该处理禁用的监控", () => {
      const disabledMonitoring = new PerformanceMonitoring(
        { enabled: false },
        mockMonitoringService,
      );

      disabledMonitoring.recordMetric("test", MetricCategory.CUSTOM, 100, "ms");

      const metrics = disabledMonitoring.getMetricsByCategory(MetricCategory.CUSTOM);
      expect(metrics).toHaveLength(0);
    });

    test("应该处理极端的配置值", () => {
      const extremeConfig = {
        maxMetricsPerCategory: 0,
        sampleRate: 1,
        performanceThreshold: 0,
      };

      const extremeMonitoring = new PerformanceMonitoring(extremeConfig, mockMonitoringService);

      extremeMonitoring.recordMetric("test", MetricCategory.CUSTOM, 100, "ms");

      const metrics = extremeMonitoring.getMetricsByCategory(MetricCategory.CUSTOM);
      expect(metrics).toHaveLength(0); // 由于maxMetricsPerCategory为0
    });
  });
});

// 全局函数测试
describe("Global Performance Monitoring Functions", () => {
  beforeEach(() => {
    // 重置全局实例
    (global as any).globalPerformanceMonitoring = null;
    jest.clearAllMocks();
  });

  test("getPerformanceMonitoring应该返回单例实例", () => {
    const { getPerformanceMonitoring } = require("./performance-monitoring");

    const instance1 = getPerformanceMonitoring();
    const instance2 = getPerformanceMonitoring();

    expect(instance1).toBe(instance2);
  });

  test("initializePerformanceMonitoring应该启动监控", () => {
    const {
      initializePerformanceMonitoring,
      getPerformanceMonitoring,
    } = require("./performance-monitoring");

    const mockStart = jest.fn();
    const mockInstance = { start: mockStart };
    (global as any).globalPerformanceMonitoring = mockInstance;

    initializePerformanceMonitoring();

    expect(mockStart).toHaveBeenCalled();
  });
});
