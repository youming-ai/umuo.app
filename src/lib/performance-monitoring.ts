/**
 * 性能监控系统
 * 提供全面的性能指标收集、分析和监控功能
 */

import type { AppError } from "@/types/errors";
import { MonitoringService } from "./monitoring-service";

// 性能指标类型
export interface PerformanceMetric {
  id: string;
  timestamp: number;
  name: string;
  category: MetricCategory;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

// 指标分类
export enum MetricCategory {
  FILE_PROCESSING = "file_processing",
  DATABASE = "database",
  API = "api",
  MEMORY = "memory",
  USER_EXPERIENCE = "user_experience",
  SYSTEM = "system",
  CUSTOM = "custom",
}

// 性能事件类型
export interface PerformanceEvent {
  id: string;
  timestamp: number;
  name: string;
  category: MetricCategory;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: AppError;
  metadata?: Record<string, unknown>;
}

// 性能统计信息
export interface PerformanceStats {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  timestamp: number;
}

// 内存使用信息
export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
}

// 系统健康状态
export interface SystemHealth {
  status: "healthy" | "warning" | "critical";
  score: number;
  checks: HealthCheck[];
  timestamp: number;
}

// 健康检查项
export interface HealthCheck {
  name: string;
  status: "pass" | "fail" | "warning";
  value: number;
  threshold: number;
  message: string;
  category: MetricCategory;
}

// 性能监控配置
export interface PerformanceMonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  maxMetricsPerCategory: number;
  maxEventsPerCategory: number;
  memoryThreshold: number; // MB
  performanceThreshold: number; // ms
  enableAutoMetrics: boolean;
  enableMemoryMonitoring: boolean;
  enableHealthChecks: boolean;
  healthCheckInterval: number; // ms
  metricsFlushInterval: number; // ms
  enableConsoleLogging: boolean;
  enablePerformanceObserver: boolean;
}

// 默认配置
const DEFAULT_CONFIG: Required<PerformanceMonitoringConfig> = {
  enabled: true,
  sampleRate: 1.0,
  maxMetricsPerCategory: 1000,
  maxEventsPerCategory: 500,
  memoryThreshold: 500, // 500MB
  performanceThreshold: 1000, // 1秒
  enableAutoMetrics: true,
  enableMemoryMonitoring: true,
  enableHealthChecks: true,
  healthCheckInterval: 30000, // 30秒
  metricsFlushInterval: 60000, // 1分钟
  enableConsoleLogging: false,
  enablePerformanceObserver: true,
};

// 性能监控类
export class PerformanceMonitoring {
  private config: Required<PerformanceMonitoringConfig>;
  private monitoringService: MonitoringService;
  private metrics: Map<MetricCategory, PerformanceMetric[]> = new Map();
  private events: Map<MetricCategory, PerformanceEvent[]> = new Map();
  private stats: Map<string, PerformanceStats> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private metricsFlushTimer?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;
  private activeTimers: Map<
    string,
    {
      startTime: number;
      name: string;
      category: MetricCategory;
    }
  > = new Map();

  constructor(
    config: Partial<PerformanceMonitoringConfig> = {},
    monitoringService?: MonitoringService,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.monitoringService = monitoringService || new MonitoringService();
    this.initializeMetricsMaps();
  }

  // 初始化指标映射
  private initializeMetricsMaps(): void {
    Object.values(MetricCategory).forEach((category) => {
      this.metrics.set(category, []);
      this.events.set(category, []);
    });
  }

  // 启动性能监控
  start(): void {
    if (!this.config.enabled) return;

    this.setupPerformanceObserver();
    this.startMemoryMonitoring();
    this.startHealthChecks();
    this.startMetricsFlush();
    this.setupGlobalPerformanceHooks();

    this.logInfo("Performance monitoring started", { config: this.config });
  }

  // 停止性能监控
  stop(): void {
    this.clearTimers();
    this.cleanupPerformanceObserver();
    this.flushMetrics();
    this.logInfo("Performance monitoring stopped");
  }

  // 记录性能指标
  recordMetric(
    name: string,
    category: MetricCategory,
    value: number,
    unit: string,
    tags?: Record<string, string>,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.config.enabled) return;
    if (!this.shouldSample()) return;

    const metric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: Date.now(),
      name,
      category,
      value,
      unit,
      tags,
      metadata,
    };

    const categoryMetrics = this.metrics.get(category) || [];
    categoryMetrics.push(metric);
    this.metrics.set(category, categoryMetrics);

    // 保持指标数量限制
    this.trimMetricsByCategory(category);

    // 更新统计信息
    this.updateStats(name, category, value);

    // 检查性能阈值
    this.checkPerformanceThreshold(name, category, value);

    // 记录到基础监控服务
    this.monitoringService.logCustomEvent(
      `performance_${category}`,
      name,
      { ...tags, ...metadata, unit },
      value,
    );

    if (this.config.enableConsoleLogging) {
      console.log(`[Performance] ${category}.${name}: ${value}${unit}`, { tags, metadata });
    }
  }

  // 开始性能计时
  startTimer(name: string, category: MetricCategory, metadata?: Record<string, unknown>): string {
    const timerId = `${category}_${name}_${Date.now()}`;
    this.activeTimers.set(timerId, {
      startTime: performance.now(),
      name,
      category,
    });

    if (this.config.enableConsoleLogging) {
      console.log(`[Performance] Timer started: ${category}.${name}`, { timerId, metadata });
    }

    return timerId;
  }

  // 结束性能计时
  endTimer(timerId: string, success: boolean = true, error?: AppError): number | null {
    const timerData = this.activeTimers.get(timerId);
    if (!timerData) return null;

    const { startTime, name, category } = timerData;
    const duration = performance.now() - startTime;
    this.activeTimers.delete(timerId);

    this.recordMetric(name, category, duration, "ms", undefined, {
      success,
      error: error?.message,
    });

    // 记录性能事件
    this.recordPerformanceEvent({
      name,
      category,
      startTime: startTime / 1000, // 转换为秒
      endTime: performance.now() / 1000,
      success,
      error,
    });

    return duration;
  }

  // 记录性能事件
  recordPerformanceEvent(event: Omit<PerformanceEvent, "id" | "timestamp" | "duration">): void {
    const fullEvent: PerformanceEvent = {
      ...event,
      id: this.generateId(),
      timestamp: Date.now(),
      duration: (event.endTime - event.startTime) * 1000, // 转换为毫秒
    };

    const categoryEvents = this.events.get(event.category) || [];
    categoryEvents.push(fullEvent);
    this.events.set(event.category, categoryEvents);

    // 保持事件数量限制
    this.trimEventsByCategory(event.category);

    // 记录到基础监控服务
    this.monitoringService.logCustomEvent(
      `performance_event_${event.category}`,
      event.name,
      {
        success: event.success,
        duration: fullEvent.duration,
        error: event.error?.message,
      },
      fullEvent.duration,
    );
  }

  // 获取性能统计
  getStats(name: string, category: MetricCategory): PerformanceStats | null {
    const key = `${category}.${name}`;
    return this.stats.get(key) || null;
  }

  // 获取分类指标
  getMetricsByCategory(category: MetricCategory): PerformanceMetric[] {
    return this.metrics.get(category) || [];
  }

  // 获取分类事件
  getEventsByCategory(category: MetricCategory): PerformanceEvent[] {
    return this.events.get(category) || [];
  }

  // 获取内存使用情况
  getMemoryUsage(): MemoryUsage | null {
    if (typeof performance === "undefined" || !("memory" in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024),
    };
  }

  // 获取系统健康状态
  getSystemHealth(): SystemHealth {
    const checks: HealthCheck[] = [];
    let totalScore = 0;
    let validChecks = 0;

    // 内存健康检查
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage) {
      const memoryScore = Math.max(0, 100 - (memoryUsage.percentage - 50) * 2);
      checks.push({
        name: "memory_usage",
        status:
          memoryUsage.percentage > 80 ? "fail" : memoryUsage.percentage > 60 ? "warning" : "pass",
        value: memoryUsage.percentage,
        threshold: 80,
        message: `内存使用率: ${memoryUsage.percentage}%`,
        category: MetricCategory.MEMORY,
      });
      totalScore += memoryScore;
      validChecks++;
    }

    // 性能健康检查
    const recentEvents = this.getRecentPerformanceEvents(60000); // 最近1分钟
    const avgPerformance =
      recentEvents.length > 0
        ? recentEvents.reduce((sum, event) => sum + event.duration, 0) / recentEvents.length
        : 0;

    const performanceScore = Math.max(
      0,
      100 - (avgPerformance / this.config.performanceThreshold) * 50,
    );
    checks.push({
      name: "performance",
      status:
        avgPerformance > this.config.performanceThreshold * 2
          ? "fail"
          : avgPerformance > this.config.performanceThreshold
            ? "warning"
            : "pass",
      value: avgPerformance,
      threshold: this.config.performanceThreshold,
      message: `平均性能: ${Math.round(avgPerformance)}ms`,
      category: MetricCategory.SYSTEM,
    });
    totalScore += performanceScore;
    validChecks++;

    // 错误率健康检查
    const errorRate = this.calculateErrorRate(recentEvents);
    const errorScore = Math.max(0, 100 - errorRate * 100);
    checks.push({
      name: "error_rate",
      status: errorRate > 0.1 ? "fail" : errorRate > 0.05 ? "warning" : "pass",
      value: errorRate * 100,
      threshold: 10,
      message: `错误率: ${(errorRate * 100).toFixed(2)}%`,
      category: MetricCategory.SYSTEM,
    });
    totalScore += errorScore;
    validChecks++;

    const overallScore = validChecks > 0 ? totalScore / validChecks : 100;
    const status = overallScore > 80 ? "healthy" : overallScore > 60 ? "warning" : "critical";

    return {
      status,
      score: Math.round(overallScore),
      checks,
      timestamp: Date.now(),
    };
  }

  // 获取性能报告
  getPerformanceReport(): {
    metrics: Record<MetricCategory, PerformanceMetric[]>;
    events: Record<MetricCategory, PerformanceEvent[]>;
    stats: Record<string, PerformanceStats>;
    memory: MemoryUsage | null;
    health: SystemHealth;
    timestamp: number;
  } {
    const metricsRecord: Record<MetricCategory, PerformanceMetric[]> = {} as any;
    const eventsRecord: Record<MetricCategory, PerformanceEvent[]> = {} as any;

    Object.values(MetricCategory).forEach((category) => {
      metricsRecord[category] = this.getMetricsByCategory(category);
      eventsRecord[category] = this.getEventsByCategory(category);
    });

    const statsRecord: Record<string, PerformanceStats> = {};
    this.stats.forEach((value, key) => {
      statsRecord[key] = value;
    });

    return {
      metrics: metricsRecord,
      events: eventsRecord,
      stats: statsRecord,
      memory: this.getMemoryUsage(),
      health: this.getSystemHealth(),
      timestamp: Date.now(),
    };
  }

  // 手动刷新指标
  flushMetrics(): void {
    this.monitoringService.flush();

    // 清理旧数据
    Object.values(MetricCategory).forEach((category) => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24小时前
      this.metrics.set(
        category,
        this.getMetricsByCategory(category).filter((m) => m.timestamp > cutoff),
      );
      this.events.set(
        category,
        this.getEventsByCategory(category).filter((e) => e.timestamp > cutoff),
      );
    });
  }

  // 私有方法

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateStats(name: string, category: MetricCategory, value: number): void {
    const key = `${category}.${name}`;
    let stats = this.stats.get(key);

    if (!stats) {
      stats = {
        count: 0,
        sum: 0,
        average: 0,
        min: value,
        max: value,
        p95: 0,
        p99: 0,
        timestamp: Date.now(),
      };
    }

    stats.count++;
    stats.sum += value;
    stats.average = stats.sum / stats.count;
    stats.min = Math.min(stats.min, value);
    stats.max = Math.max(stats.max, value);
    stats.timestamp = Date.now();

    // 计算百分位数（简化版本）
    const categoryMetrics = this.getMetricsByCategory(category);
    const nameMetrics = categoryMetrics.filter((m) => m.name === name);
    if (nameMetrics.length > 0) {
      const sortedValues = nameMetrics.map((m) => m.value).sort((a, b) => a - b);
      const p95Index = Math.floor(sortedValues.length * 0.95);
      const p99Index = Math.floor(sortedValues.length * 0.99);
      stats.p95 = sortedValues[p95Index] || 0;
      stats.p99 = sortedValues[p99Index] || 0;
    }

    this.stats.set(key, stats);
  }

  private checkPerformanceThreshold(name: string, category: MetricCategory, value: number): void {
    if (value > this.config.performanceThreshold) {
      this.monitoringService.logWarning(
        `Performance threshold exceeded: ${category}.${name} = ${value}ms`,
        {
          component: "performance_monitoring",
          action: "threshold_check",
          additional: {
            name,
            category,
            value,
            threshold: this.config.performanceThreshold,
          },
        },
      );
    }
  }

  private trimMetricsByCategory(category: MetricCategory): void {
    const metrics = this.getMetricsByCategory(category);
    if (metrics.length > this.config.maxMetricsPerCategory) {
      this.metrics.set(category, metrics.slice(-this.config.maxMetricsPerCategory));
    }
  }

  private trimEventsByCategory(category: MetricCategory): void {
    const events = this.getEventsByCategory(category);
    if (events.length > this.config.maxEventsPerCategory) {
      this.events.set(category, events.slice(-this.config.maxEventsPerCategory));
    }
  }

  private getRecentPerformanceEvents(timeWindow: number): PerformanceEvent[] {
    const cutoff = Date.now() - timeWindow;
    const allEvents: PerformanceEvent[] = [];

    Object.values(MetricCategory).forEach((category) => {
      allEvents.push(...this.getEventsByCategory(category));
    });

    return allEvents.filter((event) => event.timestamp > cutoff);
  }

  private calculateErrorRate(events: PerformanceEvent[]): number {
    if (events.length === 0) return 0;
    const errorCount = events.filter((event) => !event.success).length;
    return errorCount / events.length;
  }

  private setupPerformanceObserver(): void {
    if (!this.config.enablePerformanceObserver || typeof PerformanceObserver === "undefined") {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      this.performanceObserver.observe({ entryTypes: ["measure", "resource"] });
    } catch (error) {
      this.logError("Failed to setup PerformanceObserver", error as Error);
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    if (entry.entryType === "measure") {
      this.recordMetric(entry.name, MetricCategory.CUSTOM, entry.duration, "ms", {
        entryType: entry.entryType,
      });
    } else if (entry.entryType === "resource") {
      const resourceEntry = entry as PerformanceResourceTiming;
      this.recordMetric(
        `resource_${resourceEntry.name.split("/").pop()}`,
        MetricCategory.SYSTEM,
        resourceEntry.duration,
        "ms",
        {
          entryType: entry.entryType,
          initiatorType: resourceEntry.initiatorType,
          size: String(resourceEntry.transferSize || 0),
        },
      );
    }
  }

  private startMemoryMonitoring(): void {
    if (!this.config.enableMemoryMonitoring) return;

    const monitorMemory = () => {
      const memoryUsage = this.getMemoryUsage();
      if (memoryUsage) {
        this.recordMetric(
          "memory_usage",
          MetricCategory.MEMORY,
          memoryUsage.used,
          "MB",
          undefined,
          {
            total: memoryUsage.total,
            percentage: memoryUsage.percentage,
          },
        );

        // 检查内存阈值
        if (memoryUsage.used > this.config.memoryThreshold) {
          this.monitoringService.logWarning(`Memory threshold exceeded: ${memoryUsage.used}MB`, {
            component: "performance_monitoring",
            action: "memory_check",
            additional: {
              used: memoryUsage.used,
              threshold: this.config.memoryThreshold,
              percentage: memoryUsage.percentage,
            },
          });
        }
      }
    };

    // 立即执行一次
    monitorMemory();

    // 定期监控
    setInterval(monitorMemory, this.config.healthCheckInterval);
  }

  private startHealthChecks(): void {
    if (!this.config.enableHealthChecks) return;

    this.healthCheckTimer = setInterval(() => {
      const health = this.getSystemHealth();

      this.recordMetric(
        "system_health_score",
        MetricCategory.SYSTEM,
        health.score,
        "score",
        undefined,
        { status: health.status },
      );

      // 如果系统状态不健康，记录警告
      if (health.status === "critical") {
        this.monitoringService.logWarning("System health is critical", {
          component: "performance_monitoring",
          action: "health_check",
          additional: { health },
        });
      }
    }, this.config.healthCheckInterval);
  }

  private startMetricsFlush(): void {
    this.metricsFlushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.metricsFlushInterval);
  }

  private setupGlobalPerformanceHooks(): void {
    if (typeof window === "undefined") return;

    // 监听页面性能指标
    window.addEventListener("load", () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.recordMetric(
            "page_load_time",
            MetricCategory.USER_EXPERIENCE,
            navigation.loadEventEnd - navigation.fetchStart,
            "ms",
          );

          this.recordMetric(
            "dom_interactive_time",
            MetricCategory.USER_EXPERIENCE,
            navigation.domInteractive - navigation.fetchStart,
            "ms",
          );
        }
      }, 0);
    });
  }

  private clearTimers(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    if (this.metricsFlushTimer) {
      clearInterval(this.metricsFlushTimer);
      this.metricsFlushTimer = undefined;
    }
  }

  private cleanupPerformanceObserver(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }
  }

  private logInfo(message: string, context?: Record<string, unknown>): void {
    this.monitoringService.logInfo(message, {
      component: "performance_monitoring",
      additional: context,
    });
  }

  private logError(message: string, error: Error, context?: Record<string, unknown>): void {
    this.monitoringService.logError(error, {
      component: "performance_monitoring",
      action: "system_error",
      additional: { message, ...context },
    });
  }
}

// 全局性能监控实例
let globalPerformanceMonitoring: PerformanceMonitoring | null = null;

// 获取全局性能监控实例
export function getPerformanceMonitoring(): PerformanceMonitoring {
  if (!globalPerformanceMonitoring) {
    globalPerformanceMonitoring = new PerformanceMonitoring();
  }
  return globalPerformanceMonitoring;
}

// 初始化全局性能监控
export function initializePerformanceMonitoring(
  _config?: Partial<PerformanceMonitoringConfig>,
): void {
  const monitoring = getPerformanceMonitoring();
  monitoring.start();
}

// 便捷的性能计时函数
export function measurePerformance<T>(
  name: string,
  category: MetricCategory,
  fn: () => T,
  metadata?: Record<string, unknown>,
): T {
  const monitoring = getPerformanceMonitoring();
  const timerId = monitoring.startTimer(name, category, metadata);

  try {
    const result = fn();
    monitoring.endTimer(timerId, true);
    return result;
  } catch (error) {
    monitoring.endTimer(timerId, false, error as AppError);
    throw error;
  }
}

// 异步性能测量函数
export async function measureAsyncPerformance<T>(
  name: string,
  category: MetricCategory,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const monitoring = getPerformanceMonitoring();
  const timerId = monitoring.startTimer(name, category, metadata);

  try {
    const result = await fn();
    monitoring.endTimer(timerId, true);
    return result;
  } catch (error) {
    monitoring.endTimer(timerId, false, error as AppError);
    throw error;
  }
}

// 便捷的指标记录函数
export function recordPerformanceMetric(
  name: string,
  category: MetricCategory,
  value: number,
  unit: string,
  tags?: Record<string, string>,
  metadata?: Record<string, unknown>,
): void {
  const monitoring = getPerformanceMonitoring();
  monitoring.recordMetric(name, category, value, unit, tags, metadata);
}

// 获取性能报告
export function getPerformanceReport() {
  const monitoring = getPerformanceMonitoring();
  return monitoring.getPerformanceReport();
}

// 便捷的性能Hook
export function usePerformanceMonitoring() {
  const monitoring = getPerformanceMonitoring();

  return {
    measurePerformance,
    measureAsyncPerformance,
    recordPerformanceMetric,
    getPerformanceReport,
    startTimer: (name: string, category: MetricCategory, metadata?: Record<string, unknown>) =>
      monitoring.startTimer(name, category, metadata),
    endTimer: (timerId: string, success?: boolean, error?: AppError) =>
      monitoring.endTimer(timerId, success, error),
    getStats: (name: string, category: MetricCategory) => monitoring.getStats(name, category),
    getMemoryUsage: () => monitoring.getMemoryUsage(),
    getSystemHealth: () => monitoring.getSystemHealth(),
  };
}
