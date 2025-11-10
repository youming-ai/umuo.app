"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Zap, Activity, Cpu, MemoryStick, Timer, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Settings } from "lucide-react";
import { ErrorBoundary, type ErrorBoundaryProps } from "./ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ErrorClassifier, type ErrorContext } from "@/lib/errors";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PerformanceErrorBoundaryProps extends Omit<ErrorBoundaryProps, "children" | "context"> {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  performanceThresholds?: PerformanceThresholds;
  enableMonitoring?: boolean;
  enableOptimization?: boolean;
  enableProfiling?: boolean;
  onPerformanceError?: (error: Error, metrics: PerformanceMetrics) => void;
  onThresholdExceeded?: (metric: keyof PerformanceMetrics, value: number, threshold: number) => void;
}

export interface PerformanceThresholds {
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage
  maxFrameTime: number; // milliseconds
  maxLoadTime: number; // milliseconds
  maxNetworkLatency: number; // milliseconds
  maxErrorRate: number; // percentage
  minFps: number; // frames per second
}

export interface PerformanceMetrics {
  memoryUsage?: number; // MB
  cpuUsage?: number; // percentage
  frameTime?: number; // milliseconds
  loadTime?: number; // milliseconds
  networkLatency?: number; // milliseconds
  fps?: number; // frames per second
  errorRate?: number; // percentage
  timestamp: number;
}

interface PerformanceErrorContext extends ErrorContext {
  performanceMetrics?: PerformanceMetrics;
  performanceThresholds?: PerformanceThresholds;
  violatedThresholds?: Array<{
    metric: keyof PerformanceMetrics;
    value: number;
    threshold: number;
  }>;
}

interface PerformanceErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  metrics: PerformanceMetrics;
  thresholds: PerformanceThresholds;
  violatedThresholds: Array<{
    metric: keyof PerformanceMetrics;
    value: number;
    threshold: number;
  }>;
  onRetry: () => void;
  onReset: () => void;
  onOptimize: () => void;
  onSettings?: () => void;
  onReport?: () => void;
  isRecovering: boolean;
  recoveryAttempts: number;
}

// ============================================================================
// PERFORMANCE ERROR BOUNDARY COMPONENT
// ============================================================================

export class PerformanceErrorBoundary extends Component<PerformanceErrorBoundaryProps> {
  private performanceClassifier: ErrorClassifier;
  private performanceMonitor: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private frameCount = 0;
  private lastFrameTime = performance.now();

  constructor(props: PerformanceErrorBoundaryProps) {
    super(props);

    this.performanceClassifier = ErrorClassifier.getInstance();
    this.performanceMonitor = new PerformanceMonitor();

    this.thresholds = {
      maxMemoryUsage: 100, // 100MB
      maxCpuUsage: 80, // 80%
      maxFrameTime: 16.67, // 60fps = 16.67ms per frame
      maxLoadTime: 3000, // 3 seconds
      maxNetworkLatency: 1000, // 1 second
      maxErrorRate: 5, // 5%
      minFps: 30, // 30fps minimum
      ...props.performanceThresholds,
    };

    this.metrics = {
      timestamp: Date.now(),
    };
  }

  componentDidMount() {
    if (this.props.enableMonitoring !== false) {
      this.startPerformanceMonitoring();
    }
  }

  componentWillUnmount() {
    this.stopPerformanceMonitoring();
  }

  private startPerformanceMonitoring = () => {
    // Start monitoring performance metrics
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.checkThresholds();
    }, 1000); // Monitor every second

    // Start FPS monitoring
    this.startFPSMonitoring();

    // Monitor memory usage
    this.monitorMemoryUsage();

    // Monitor network performance
    this.monitorNetworkPerformance();
  };

  private stopPerformanceMonitoring = () => {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  };

  private startFPSMonitoring = () => {
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;

      if (delta >= 1000) {
        this.metrics.fps = Math.round((this.frameCount * 1000) / delta);
        this.frameCount = 0;
        this.lastFrameTime = now;
      }

      this.frameCount++;
      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  };

  private monitorMemoryUsage = () => {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
  };

  private monitorNetworkPerformance = () => {
    // Monitor network latency using Navigation Timing API
    if ("navigation" in performance) {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      if (nav) {
        this.metrics.loadTime = nav.loadEventEnd - nav.navigationStart;
        this.metrics.networkLatency = nav.responseStart - nav.requestStart;
      }
    }
  };

  private updateMetrics = () => {
    // Update CPU usage (approximation)
    this.metrics.cpuUsage = this.calculateCPUUsage();

    // Update frame time
    this.metrics.frameTime = 1000 / (this.metrics.fps || 60);

    // Update timestamp
    this.metrics.timestamp = Date.now();
  };

  private calculateCPUUsage = (): number => {
    // Simple CPU usage approximation based on frame time
    const targetFrameTime = 16.67; // 60fps
    const actualFrameTime = this.metrics.frameTime || targetFrameTime;
    return Math.min(100, (actualFrameTime / targetFrameTime) * 100);
  };

  private checkThresholds = () => {
    const violatedThresholds: Array<{
      metric: keyof PerformanceMetrics;
      value: number;
      threshold: number;
    }> = [];

    // Check each threshold
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      violatedThresholds.push({
        metric: "memoryUsage",
        value: this.metrics.memoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
      });
    }

    if (this.metrics.cpuUsage && this.metrics.cpuUsage > this.thresholds.maxCpuUsage) {
      violatedThresholds.push({
        metric: "cpuUsage",
        value: this.metrics.cpuUsage,
        threshold: this.thresholds.maxCpuUsage,
      });
    }

    if (this.metrics.frameTime && this.metrics.frameTime > this.thresholds.maxFrameTime) {
      violatedThresholds.push({
        metric: "frameTime",
        value: this.metrics.frameTime,
        threshold: this.thresholds.maxFrameTime,
      });
    }

    if (this.metrics.fps && this.metrics.fps < this.thresholds.minFps) {
      violatedThresholds.push({
        metric: "fps",
        value: this.metrics.fps,
        threshold: this.thresholds.minFps,
      });
    }

    if (this.metrics.loadTime && this.metrics.loadTime > this.thresholds.maxLoadTime) {
      violatedThresholds.push({
        metric: "loadTime",
        value: this.metrics.loadTime,
        threshold: this.thresholds.maxLoadTime,
      });
    }

    // Notify parent of threshold violations
    violatedThresholds.forEach(violation => {
      this.props.onThresholdExceeded?.(violation.metric, violation.value, violation.threshold);
    });

    // Create performance error if thresholds are violated
    if (violatedThresholds.length > 0) {
      this.handlePerformanceError(violatedThresholds);
    }
  };

  private handlePerformanceError = (violatedThresholds: Array<{
    metric: keyof PerformanceMetrics;
    value: number;
    threshold: number;
  }>) => {
    const error = new Error(
      `Performance thresholds exceeded: ${violatedThresholds.map(v => `${v.metric} (${v.value.toFixed(2)} > ${v.threshold})`).join(", ")}`
    );

    error.name = "PerformanceError";

    // Create performance error context
    const performanceContext: PerformanceErrorContext = {
      component: "PerformanceErrorBoundary",
      category: "performance",
      performanceMetrics: this.metrics,
      performanceThresholds: this.thresholds,
      violatedThresholds,
      timestamp: new Date().toISOString(),
    };

    // Call parent error handler
    if (this.props.onError) {
      const errorInfo = {
        componentStack: `Performance violation in ${violatedThresholds.map(v => v.metric).join(", ")}`,
      };
      this.props.onError(error, errorInfo, performanceContext);
    }

    // Call specific performance error handler
    this.props.onPerformanceError?.(error, this.metrics);

    // Log performance error
    this.performanceClassifier.logError(error, performanceContext);
  };

  private handlePerformanceErrorBoundary = (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => {
    // Enrich context with performance metrics
    const performanceContext: PerformanceErrorContext = {
      ...context,
      component: "PerformanceErrorBoundary",
      category: "performance",
      performanceMetrics: this.metrics,
      performanceThresholds: this.thresholds,
      timestamp: new Date().toISOString(),
    };

    // Call parent error handler
    this.props.onError?.(error, errorInfo, performanceContext);

    // Call specific performance error handler
    this.props.onPerformanceError?.(error, this.metrics);

    // Log performance error
    this.performanceClassifier.logError(error, performanceContext);

    // Attempt performance optimization
    if (this.props.enableOptimization !== false) {
      this.optimizePerformance();
    }
  };

  private optimizePerformance = () => {
    // Implement performance optimization strategies
    const strategies = [
      () => this.clearCaches(),
      () => this.reduceAnimations(),
      () => this.optimizeImages(),
      () => this.enableLazyLoading(),
      () => this.reduceComplexity(),
    ];

    strategies.forEach((strategy, index) => {
      setTimeout(() => {
        try {
          strategy();
        } catch (error) {
          console.error(`Performance optimization ${index} failed:`, error);
        }
      }, index * 500);
    });
  };

  private clearCaches = () => {
    // Clear various caches to free up memory
    if ("caches" in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
  };

  private reduceAnimations = () => {
    // Reduce or disable animations to improve performance
    document.body.style.setProperty("--animation-duration", "0.1s");
  };

  private optimizeImages = () => {
    // Optimize image loading and rendering
    const images = document.querySelectorAll("img");
    images.forEach(img => {
      img.loading = "lazy";
    });
  };

  private enableLazyLoading = () => {
    // Enable lazy loading for heavy components
    // This would need to be implemented based on your component structure
  };

  private reduceComplexity = () => {
    // Reduce UI complexity for better performance
    document.body.classList.add("performance-mode");
  };

  private handleOptimize = () => {
    this.optimizePerformance();
  };

  private handleSettings = () => {
    // Open performance settings dialog
    console.log("Opening performance settings");
  };

  render() {
    const {
      children,
      fallbackComponent,
      performanceThresholds,
      enableMonitoring = true,
      enableOptimization = true,
      ...errorBoundaryProps
    } = this.props;

    // Create performance-specific error context
    const performanceContext: Partial<PerformanceErrorContext> = {
      component: "PerformanceErrorBoundary",
      category: "performance",
      performanceMetrics: this.metrics,
      performanceThresholds: this.thresholds,
    };

    return (
      <ErrorBoundary
        {...errorBoundaryProps}
        context={performanceContext}
        onError={this.handlePerformanceErrorBoundary}
        enableRecovery={true}
        fallbackComponent={
          fallbackComponent || (
            <PerformanceErrorFallback
              metrics={this.metrics}
              thresholds={this.thresholds}
              violatedThresholds={[]}
              onOptimize={this.handleOptimize}
              onSettings={this.handleSettings}
            />
          )
        }
      >
        {children}
      </ErrorBoundary>
    );
  }
}

// ============================================================================
// PERFORMANCE ERROR FALLBACK COMPONENT
// ============================================================================

const PerformanceErrorFallback: React.FC<PerformanceErrorFallbackProps> = ({
  error,
  errorInfo,
  metrics,
  thresholds,
  violatedThresholds,
  onRetry,
  onReset,
  onOptimize,
  onSettings,
  onReport,
  isRecovering,
  recoveryAttempts,
}) => {
  const isPerformanceError = error.name === "PerformanceError";
  const hasMemoryIssue = metrics.memoryUsage && metrics.memoryUsage > thresholds.maxMemoryUsage;
  const hasCpuIssue = metrics.cpuUsage && metrics.cpuUsage > thresholds.maxCpuUsage;
  const hasFpsIssue = metrics.fps && metrics.fps < thresholds.minFps;

  const getPerformanceIcon = () => {
    if (hasMemoryIssue) return <MemoryStick className="h-8 w-8 text-orange-500" />;
    if (hasCpuIssue) return <Cpu className="h-8 w-8 text-red-500" />;
    if (hasFpsIssue) return <Activity className="h-8 w-8 text-yellow-500" />;
    return <Zap className="h-8 w-8 text-destructive" />;
  };

  const getPerformanceTitle = () => {
    if (isPerformanceError) return "性能阈值超出";
    if (hasMemoryIssue) return "内存使用过高";
    if (hasCpuIssue) return "CPU使用率过高";
    if (hasFpsIssue) return "帧率过低";
    return "性能问题";
  };

  const getPerformanceMessage = () => {
    if (isPerformanceError) return "应用性能指标超出安全阈值，正在尝试优化...";
    if (hasMemoryIssue) return "内存使用量过高，可能影响应用响应速度。";
    if (hasCpuIssue) return "CPU使用率过高，应用响应可能会变慢。";
    if (hasFpsIssue) return "帧率过低，动画和交互可能不流畅。";
    return "检测到性能问题，建议优化应用设置。";
  };

  const getMetricColor = (metric: keyof PerformanceMetrics, value?: number): string => {
    if (value === undefined) return "bg-gray-100 text-gray-800";

    const threshold = thresholds[metric as keyof PerformanceThresholds] as number;
    if (threshold === undefined) return "bg-gray-100 text-gray-800";

    if (metric === "fps") {
      return value >= threshold ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
    }

    return value <= threshold ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const getMetricIcon = (metric: keyof PerformanceMetrics) => {
    switch (metric) {
      case "memoryUsage":
        return <MemoryStick className="h-4 w-4" />;
      case "cpuUsage":
        return <Cpu className="h-4 w-4" />;
      case "fps":
        return <Activity className="h-4 w-4" />;
      case "frameTime":
        return <Timer className="h-4 w-4" />;
      case "loadTime":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const getMetricLabel = (metric: keyof PerformanceMetrics): string => {
    switch (metric) {
      case "memoryUsage":
        return "内存使用";
      case "cpuUsage":
        return "CPU使用率";
      case "fps":
        return "帧率";
      case "frameTime":
        return "帧时间";
      case "loadTime":
        return "加载时间";
      case "networkLatency":
        return "网络延迟";
      case "errorRate":
        return "错误率";
      default:
        return metric;
    }
  };

  const getMetricValue = (metric: keyof PerformanceMetrics): string => {
    const value = metrics[metric];
    if (value === undefined) return "未知";

    switch (metric) {
      case "memoryUsage":
        return `${value.toFixed(1)} MB`;
      case "cpuUsage":
        return `${value.toFixed(1)}%`;
      case "fps":
        return `${value} FPS`;
      case "frameTime":
      case "loadTime":
      case "networkLatency":
        return `${value.toFixed(1)} ms`;
      case "errorRate":
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  const getOptimizationSuggestions = () => {
    const suggestions = [];

    if (hasMemoryIssue) {
      suggestions.push("关闭其他标签页释放内存");
      suggestions.push("清除浏览器缓存");
      suggestions.push("重启浏览器");
    }

    if (hasCpuIssue) {
      suggestions.push("关闭不必要的应用程序");
      suggestions.push("减少动画效果");
      suggestions.push("降低画质设置");
    }

    if (hasFpsIssue) {
      suggestions.push("降低游戏画质");
      suggestions.push("关闭硬件加速");
      suggestions.push("更新显卡驱动");
    }

    if (suggestions.length === 0) {
      suggestions.push("刷新页面重试");
      suggestions.push("检查浏览器更新");
      suggestions.push("重启设备");
    }

    return suggestions;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            {getPerformanceIcon()}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{getPerformanceTitle()}</CardTitle>
            <CardDescription>{getPerformanceMessage()}</CardDescription>
          </div>
          <Badge variant={isPerformanceError ? "destructive" : "secondary"}>
            性能问题
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Performance Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">性能指标</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(metrics).map(([metric, value]) => {
              if (metric === "timestamp") return null;

              const metricKey = metric as keyof PerformanceMetrics;
              const threshold = thresholds[metricKey as keyof PerformanceThresholds] as number;
              const isViolated = threshold && value && (
                metricKey === "fps" ? value < threshold : value > threshold
              );

              return (
                <div key={metric} className="flex items-center space-x-2 p-2 rounded-md border">
                  <div className={getMetricColor(metricKey, value)}>
                    {getMetricIcon(metricKey)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{getMetricLabel(metricKey)}</p>
                    <p className={`text-xs ${isViolated ? "text-red-600" : "text-muted-foreground"}`}>
                      {getMetricValue(metricKey)}
                    </p>
                  </div>
                  {isViolated && (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Optimization Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onOptimize} className="w-full">
            <Zap className="mr-2 h-4 w-4" />
            优化性能
          </Button>
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
          <Button onClick={onReset} variant="outline" className="w-full">
            重置组件
          </Button>
          <Button onClick={onSettings} variant="outline" className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            性能设置
          </Button>
        </div>

        {/* Recovery Progress */}
        {isRecovering && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-blue-800">
                正在优化性能... ({recoveryAttempts + 1}/3)
              </span>
            </div>
          </div>
        )}

        {/* Optimization Suggestions */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">优化建议：</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {getOptimizationSuggestions().map((suggestion, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Performance Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border p-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`h-2 w-2 rounded-full ${
                hasMemoryIssue || hasCpuIssue ? 'bg-red-500' : 'bg-green-500'
              }`}></div>
              <span className="font-medium text-sm">系统资源</span>
            </div>
            <p className="text-muted-foreground text-xs">
              {hasMemoryIssue || hasCpuIssue ? '资源使用过高' : '资源使用正常'}
            </p>
          </div>

          <div className="rounded-md border p-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`h-2 w-2 rounded-full ${
                hasFpsIssue ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className="font-medium text-sm">渲染性能</span>
            </div>
            <p className="text-muted-foreground text-xs">
              {hasFpsIssue ? '渲染性能较差' : '渲染性能良好'}
            </p>
          </div>
        </div>

        {/* Technical Details */}
        {process.env.NODE_ENV === "development" && (
          <>
            <Separator />
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                  开发模式
                </Badge>
                <span className="font-medium text-sm text-yellow-700">
                  性能详情
                </span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-yellow-700 hover:text-yellow-800">
                  查看性能数据
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-yellow-100 p-3 text-xs text-yellow-900">
                  {JSON.stringify({
                    error: {
                      name: error.name,
                      message: error.message,
                    },
                    metrics,
                    thresholds,
                    violatedThresholds,
                    timestamp: new Date().toISOString(),
                  }, null, 2)}
                </pre>
              </details>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// PERFORMANCE MONITOR UTILITY
// ============================================================================

class PerformanceMonitor {
  private observers: PerformanceObserver[] = [];
  private metrics: Partial<PerformanceMetrics> = {};

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Observe long tasks
    if ("PerformanceObserver" in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn("Long task detected:", entry);
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn("Long task observation not supported:", error);
      }

      // Observe navigation timing
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "navigation") {
              const navEntry = entry as PerformanceNavigationTiming;
              this.metrics.loadTime = navEntry.loadEventEnd - navEntry.navigationStart;
              this.metrics.networkLatency = navEntry.responseStart - navEntry.requestStart;
            }
          }
        });
        navigationObserver.observe({ entryTypes: ["navigation"] });
        this.observers.push(navigationObserver);
      } catch (error) {
        console.warn("Navigation timing observation not supported:", error);
      }
    }
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return {
      ...this.metrics,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      fps: this.getFPS(),
    };
  }

  private getMemoryUsage(): number | undefined {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return undefined;
  }

  private getCPUUsage(): number | undefined {
    // CPU usage estimation would require more complex implementation
    return undefined;
  }

  private getFPS(): number | undefined {
    // FPS calculation would require continuous monitoring
    return undefined;
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// ============================================================================
// CONVENIENCE COMPONENTS
// ============================================================================

export const GamingPerformanceErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <PerformanceErrorBoundary
    performanceThresholds={{
      maxMemoryUsage: 200,
      maxCpuUsage: 90,
      maxFrameTime: 16.67,
      maxLoadTime: 1000,
      maxNetworkLatency: 500,
      maxErrorRate: 2,
      minFps: 60,
    }}
    enableMonitoring={true}
    enableOptimization={true}
    showDetails={false}
    allowReport={false}
  >
    {children}
  </PerformanceErrorBoundary>
);

export const StandardPerformanceErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <PerformanceErrorBoundary
    performanceThresholds={{
      maxMemoryUsage: 100,
      maxCpuUsage: 80,
      maxFrameTime: 33.33,
      maxLoadTime: 3000,
      maxNetworkLatency: 1000,
      maxErrorRate: 5,
      minFps: 30,
    }}
    enableMonitoring={true}
    enableOptimization={true}
    showDetails={false}
    allowReport={false}
  >
    {children}
  </PerformanceErrorBoundary>
);
