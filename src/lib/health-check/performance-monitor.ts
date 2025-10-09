/**
 * 性能监控工具
 * 用于监控健康检查系统的性能指标
 */

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  operation: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastExecution: Date;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics = new Map<string, PerformanceMetric>();
  private stats = new Map<string, PerformanceStats>();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 开始计时
   */
  static startTiming(operation: string, metadata?: Record<string, unknown>): string {
    const monitor = PerformanceMonitor.getInstance();
    const id = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    monitor.metrics.set(id, {
      operation,
      startTime: performance.now(),
      metadata,
    });

    return id;
  }

  /**
   * 结束计时并返回持续时间
   */
  static endTiming(id: string): number {
    const monitor = PerformanceMonitor.getInstance();
    const metric = monitor.metrics.get(id);

    if (!metric) {
      console.warn(`No timing started for ID: ${id}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    // 更新 metric
    metric.endTime = endTime;
    metric.duration = duration;

    // 更新统计
    monitor.updateStats(metric.operation, duration);

    // 清理 metric（避免内存泄漏）
    monitor.metrics.delete(id);

    // 记录性能日志
    if (duration > 5000) { // 超过5秒的操作记录警告
      console.warn(`Slow operation detected: ${metric.operation} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * 获取操作统计信息
   */
  static getStats(operation: string): PerformanceStats | null {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.stats.get(operation) || null;
  }

  /**
   * 获取所有操作统计
   */
  static getAllStats(): Map<string, PerformanceStats> {
    const monitor = PerformanceMonitor.getInstance();
    return new Map(monitor.stats);
  }

  /**
   * 清理过期的统计数据
   */
  static cleanup(maxAge: number = 24 * 60 * 60 * 1000): void { // 默认24小时
    const monitor = PerformanceMonitor.getInstance();
    const cutoffTime = Date.now() - maxAge;

    for (const [operation, stats] of monitor.stats.entries()) {
      if (stats.lastExecution.getTime() < cutoffTime) {
        monitor.stats.delete(operation);
      }
    }
  }

  /**
   * 获取性能摘要
   */
  static getSummary(): {
    totalOperations: number;
    slowestOperation: { operation: string; duration: number } | null;
    fastestOperation: { operation: string; duration: number } | null;
    averageDuration: number;
    totalMemoryUsage: number;
  } {
    const monitor = PerformanceMonitor.getInstance();
    const allStats = Array.from(monitor.stats.values());

    if (allStats.length === 0) {
      return {
        totalOperations: 0,
        slowestOperation: null,
        fastestOperation: null,
        averageDuration: 0,
        totalMemoryUsage: monitor.metrics.size,
      };
    }

    const totalOperations = allStats.reduce((sum, stat) => sum + stat.count, 0);
    const totalDuration = allStats.reduce((sum, stat) => sum + stat.totalDuration, 0);
    const averageDuration = totalDuration / totalOperations;

    const slowest = allStats.reduce((max, stat) =>
      stat.maxDuration > max.maxDuration ? stat : max,
      allStats[0]
    );
    const fastest = allStats.reduce((min, stat) =>
      stat.minDuration < min.minDuration ? stat : min,
      allStats[0]
    );

    return {
      totalOperations,
      slowestOperation: { operation: slowest.operation, duration: slowest.maxDuration },
      fastestOperation: { operation: fastest.operation, duration: fastest.minDuration },
      averageDuration,
      totalMemoryUsage: monitor.metrics.size,
    };
  }

  /**
   * 重置所有统计数据
   */
  static reset(): void {
    const monitor = PerformanceMonitor.getInstance();
    monitor.metrics.clear();
    monitor.stats.clear();
  }

  /**
   * 导出性能数据
   */
  static exportData() {
    const monitor = PerformanceMonitor.getInstance();
    return {
      timestamp: new Date().toISOString(),
      summary: PerformanceMonitor.getSummary(),
      stats: Object.fromEntries(PerformanceMonitor.getAllStats()),
      activeTimings: Array.from(monitor.metrics.entries()).map(([id, metric]) => ({
      id,
      operation: metric.operation,
      startTime: new Date(metric.startTime).toISOString(),
      duration: metric.duration,
      metadata: metric.metadata,
    }))
    };
  }

  /**
   * 更新统计信息
   */
  private updateStats(operation: string, duration: number): void {
    const existing = this.stats.get(operation);

    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.averageDuration = existing.totalDuration / existing.count;
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.lastExecution = new Date();
    } else {
      this.stats.set(operation, {
        operation,
        count: 1,
        totalDuration: duration,
        averageDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        lastExecution: new Date(),
      });
    }
  }
}

/**
 * 性能监控装饰器
 */
export function performanceMonitor(operation?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const id = PerformanceMonitor.startTiming(operationName, {
        args: args.length,
        className: target.constructor.name,
        methodName: propertyName,
      });

      try {
        const result = await originalMethod.apply(this, args);
        PerformanceMonitor.endTiming(id);
        return result;
      } catch (error) {
        PerformanceMonitor.endTiming(id);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 性能监控工具函数
 */
export const withPerformanceMonitoring = async <T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> => {
  const id = PerformanceMonitor.startTiming(operation, metadata);

  try {
    const result = await fn();
    PerformanceMonitor.endTiming(id);
    return result;
  } catch (error) {
    PerformanceMonitor.endTiming(id);
    throw error;
  }
};

/**
 * 健康检查性能基准
 */
export class HealthCheckPerformanceBenchmarks {
  public static readonly BENCHMARKS = {
    API_CONNECTIVITY: { target: 2000, warning: 5000, critical: 10000 }, // ms
    ERROR_HANDLING: { target: 500, warning: 1500, critical: 3000 }, // ms
    PERFORMANCE: { target: 3000, warning: 6000, critical: 10000 }, // ms
    USER_EXPERIENCE: { target: 1500, warning: 3000, critical: 5000 }, // ms
    SECURITY: { target: 1000, warning: 2500, critical: 5000 }, // ms
    TOTAL_CHECK: { target: 120000, warning: 180000, critical: 300000 }, // ms (2-5 minutes)
  };

  /**
   * 评估检查性能
   */
  static evaluatePerformance(
    operation: string,
    duration: number
  ): 'excellent' | 'good' | 'warning' | 'critical' {
    const benchmark = this.BENCHMARKS[operation as keyof typeof this.BENCHMARKS];
    if (!benchmark) return 'good';

    if (duration <= benchmark.target) return 'excellent';
    if (duration <= benchmark.warning) return 'good';
    if (duration <= benchmark.critical) return 'warning';
    return 'critical';
  }

  /**
   * 获取性能建议
   */
  static getPerformanceRecommendation(
    operation: string,
    duration: number
  ): string[] {
    const benchmark = this.BENCHMARKS[operation as keyof typeof this.BENCHMARKS];
    if (!benchmark) return [];

    const recommendations: string[] = [];

    if (duration > benchmark.critical) {
      recommendations.push(`${operation} 性能严重超出预期，建议立即优化`);
      recommendations.push('考虑增加并发处理或优化算法');
    } else if (duration > benchmark.warning) {
      recommendations.push(`${operation} 性能可以优化，建议检查瓶颈`);
      recommendations.push('考虑缓存结果或减少不必要的计算');
    }

    if (operation === 'API_CONNECTIVITY' && duration > 2000) {
      recommendations.push('优化 API 调用频率和批量处理');
      recommendations.push('检查网络连接和服务器响应时间');
    }

    if (operation === 'PERFORMANCE' && duration > 3000) {
      recommendations.push('优化内存使用和垃圾回收');
      recommendations.push('考虑使用 Web Workers 处理计算密集型任务');
    }

    return recommendations;
  }

  /**
   * 生成性能报告
   */
  static generatePerformanceReport() {
    const allStats = PerformanceMonitor.getAllStats();
    const summary = PerformanceMonitor.getSummary();

    const benchmarks = Object.entries(HealthCheckPerformanceBenchmarks.BENCHMARKS).map(([operation, benchmark]) => {
      const stats = allStats.get(operation);
      const status = stats ?
        HealthCheckPerformanceBenchmarks.evaluatePerformance(operation, stats.averageDuration) :
        'good';

      return {
        operation,
        current: stats,
        target: benchmark.target,
        status,
        recommendations: stats ?
          HealthCheckPerformanceBenchmarks.getPerformanceRecommendation(operation, stats.averageDuration) :
          [],
      };
    });

    return {
      timestamp: new Date().toISOString(),
      summary,
      benchmarks,
    };
  }
}