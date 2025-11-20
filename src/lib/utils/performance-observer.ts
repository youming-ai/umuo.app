/**
 * 性能监控工具
 * 用于监控应用性能指标和用户体验
 */

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput?: boolean;
};

// 性能指标接口
export interface PerformanceMetrics {
  // 核心Web指标
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift

  // 自定义指标
  transcriptionTime?: number; // 转录耗时
  uploadTime?: number; // 上传耗时
  apiResponseTime?: number; // API响应时间

  // 资源指标
  bundleSize?: number; // 包大小
  memoryUsage?: number; // 内存使用

  // 用户体验指标
  errorCount?: number; // 错误次数
  crashCount?: number; // 崩溃次数
}

// 性能监控配置接口
export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;
  reportThreshold: number;
  reportUrl?: string;
}

// 性能监控器类
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: (globalThis.PerformanceObserver | null)[] = [];
  private config: PerformanceConfig;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 0.1, // 10% 采样率
      reportThreshold: 1000, // 1秒阈值
      reportUrl: "/api/performance",
      ...config,
    };

    if (this.config.enabled && typeof window !== "undefined") {
      this.init();
    }
  }

  private init(): void {
    this.observeCoreWebVitals();
    this.observeUserTiming();
    this.observeResourceTiming();
    this.observeNavigationTiming();
    this.setupErrorTracking();
  }

  // 监控核心Web指标
  private observeCoreWebVitals(): void {
    // LCP - 最大内容绘制
    if ("PerformanceObserver" in window) {
      const lcpObserver = new globalThis.PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        this.metrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
      this.observers.push(lcpObserver);

      // FID - 首次输入延迟
      const fidObserver = new globalThis.PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEventTiming[];
        entries.forEach((entry) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
      this.observers.push(fidObserver);

      // CLS - 累积布局偏移
      let clsValue = 0;
      const clsObserver = new globalThis.PerformanceObserver((list) => {
        const entries = list.getEntries() as LayoutShiftEntry[];
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.cls = clsValue;
          }
        });
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
      this.observers.push(clsObserver);
    }

    // FCP - 首次内容绘制
    const fcpEntry = performance.getEntriesByName("first-contentful-paint")[0] as PerformanceEntry;
    if (fcpEntry) {
      this.metrics.fcp = fcpEntry.startTime;
    }
  }

  // 监控用户计时
  private observeUserTiming(): void {
    if ("PerformanceObserver" in window) {
      const userTimingObserver = new globalThis.PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEntry[];
        entries.forEach((entry) => {
          if (entry.name.startsWith("transcription-")) {
            this.metrics.transcriptionTime = entry.duration;
          } else if (entry.name.startsWith("upload-")) {
            this.metrics.uploadTime = entry.duration;
          } else if (entry.name.startsWith("api-")) {
            this.metrics.apiResponseTime = entry.duration;
          }
        });
      });
      userTimingObserver.observe({ entryTypes: ["measure", "mark"] });
      this.observers.push(userTimingObserver);
    }
  }

  // 监控资源加载
  private observeResourceTiming(): void {
    if ("PerformanceObserver" in window) {
      const resourceObserver = new globalThis.PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[];
        let totalSize = 0;
        entries.forEach((entry) => {
          if (entry.transferSize) {
            totalSize += entry.transferSize;
          }
        });
        this.metrics.bundleSize = totalSize;
      });
      resourceObserver.observe({ entryTypes: ["resource"] });
      this.observers.push(resourceObserver);
    }
  }

  // 监控导航时间
  private observeNavigationTiming(): void {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    if (navigation) {
      // 可以计算更多导航相关指标
      console.log("页面加载时间:", navigation.loadEventEnd - navigation.fetchStart);
    }
  }

  // 错误跟踪
  private setupErrorTracking(): void {
    this.metrics.errorCount = 0;
    this.metrics.crashCount = 0;

    // 监控JavaScript错误
    window.addEventListener("error", (event) => {
      this.metrics.errorCount = (this.metrics.errorCount || 0) + 1;
      this.reportError({
        type: "javascript",
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // 监控Promise拒绝
    window.addEventListener("unhandledrejection", (event) => {
      this.metrics.errorCount = (this.metrics.errorCount || 0) + 1;
      this.reportError({
        type: "promise",
        message: event.reason?.message || "Promise rejected",
        stack: event.reason?.stack,
      });
    });
  }

  // 标记性能计时开始
  mark(name: string): void {
    if (this.config.enabled && performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  // 标记性能计时结束
  measure(name: string): void {
    if (this.config.enabled && performance.measure) {
      const startMark = `${name}-start`;
      const endMark = `${name}-end`;

      if (performance.getEntriesByName(startMark).length > 0) {
        performance.mark(endMark);
        performance.measure(name, startMark, endMark);
      }
    }
  }

  // 手动记录指标
  recordMetric(name: keyof PerformanceMetrics, value: number): void {
    this.metrics[name] = value;
    this.checkThresholds(name, value);
  }

  // 检查阈值并报告
  private checkThresholds(name: string, value: number): void {
    if (value > this.config.reportThreshold) {
      this.reportPerformanceIssue(name, value);
    }
  }

  // 报告性能问题
  private reportPerformanceIssue(metric: string, value: number): void {
    const issue = {
      metric,
      value,
      threshold: this.config.reportThreshold,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    };

    // 发送到监控服务
    if (this.config.reportUrl && Math.random() < this.config.sampleRate) {
      this.sendMetrics({ ...this.metrics, ...issue });
    }

    // 开发环境下输出到控制台
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `Performance issue detected: ${metric} = ${value}ms (threshold: ${this.config.reportThreshold}ms)`,
      );
    }
  }

  // 报告错误
  private reportError(error: Record<string, unknown>): void {
    if (Math.random() < this.config.sampleRate) {
      this.sendMetrics({
        ...this.metrics,
        lastError: error,
      });
    }
  }

  // 发送指标数据
  private async sendMetrics(data: PerformanceMetrics & Record<string, unknown>): Promise<void> {
    if (!this.config.reportUrl) return;

    try {
      await fetch(this.config.reportUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metrics: data,
          url: window.location.href,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      // 静默处理上报错误
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to report performance metrics:", error);
      }
    }
  }

  // 获取当前指标
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // 重置指标
  reset(): void {
    this.metrics = {};
  }

  // 销毁观察器
  destroy(): void {
    this.observers.forEach((observer) => {
      observer?.disconnect();
    });
    this.observers = [];
  }
}

// 单例实例
let performanceMonitor: PerformanceMonitor | null = null;

// 获取性能监控实例
export function getPerformanceMonitor(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor(config);
  }
  return performanceMonitor;
}

// Hook 方式使用
export function usePerformanceMonitor(config?: Partial<PerformanceConfig>) {
  if (typeof window !== "undefined") {
    return getPerformanceMonitor(config);
  }
  return null;
}

// 性能标记工具函数
export const performanceUtils = {
  // 标记转录开始
  startTranscription: (fileId: number) => {
    const monitor = getPerformanceMonitor();
    monitor.mark(`transcription-${fileId}`);
  },

  // 标记转录结束
  endTranscription: (fileId: number) => {
    const monitor = getPerformanceMonitor();
    monitor.measure(`transcription-${fileId}`);
  },

  // 标记上传开始
  startUpload: (fileName: string) => {
    const monitor = getPerformanceMonitor();
    monitor.mark(`upload-${fileName}`);
  },

  // 标记上传结束
  endUpload: (fileName: string) => {
    const monitor = getPerformanceMonitor();
    monitor.measure(`upload-${fileName}`);
  },

  // 记录API响应时间
  recordApiResponse: (_endpoint: string, duration: number) => {
    const monitor = getPerformanceMonitor();
    monitor.recordMetric("apiResponseTime", duration);
  },

  // 记录内存使用
  recordMemoryUsage: () => {
    if ("memory" in performance) {
      const performanceWithMemory = performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
        };
      };
      const memory = performanceWithMemory.memory;
      if (memory) {
        const monitor = getPerformanceMonitor();
        monitor.recordMetric("memoryUsage", memory.usedJSHeapSize);
      }
    }
  },
};
