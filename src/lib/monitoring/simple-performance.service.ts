import { create } from "zustand";

// 简化的性能指标接口
interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceStore {
  metrics: PerformanceMetrics[];
  addMetric: (metric: PerformanceMetrics) => void;
  clearMetrics: () => void;
  getMetrics: () => PerformanceMetrics[];
  getAverageTime: (operationName: string) => number;
}

/**
 * 简化的性能监控服务
 * 提供基本的性能指标收集和分析功能
 */
export class SimplePerformanceService {
  private store = create<PerformanceStore>((set, get) => ({
    metrics: [],
    addMetric: (metric) =>
      set((state) => ({
        metrics: [...state.metrics, metric],
      })),
    clearMetrics: () => set({ metrics: [] }),
    getMetrics: () => get().metrics,
    getAverageTime: (operationName) => {
      const relevantMetrics = get().metrics.filter(
        (m) => m.operationName === operationName,
      );
      if (relevantMetrics.length === 0) return 0;

      const totalTime = relevantMetrics.reduce(
        (sum, m) => sum + (m.duration || 0),
        0,
      );
      return totalTime / relevantMetrics.length;
    },
  }));

  /**
   * 开始计时操作
   */
  startTimer(
    operationName: string,
    metadata?: Record<string, any>,
  ): () => number {
    const startTime = performance.now();

    this.store.getState().addMetric({
      operationName,
      startTime,
      metadata,
    });

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 更新最后一个指标的持续时间
      const metrics = this.store.getState().metrics;
      const lastMetric = metrics[metrics.length - 1];
      if (lastMetric && lastMetric.operationName === operationName) {
        lastMetric.duration = duration;
      }

      return duration;
    };
  }

  /**
   * 记录错误
   */
  recordError(category: string, operation: string, error: unknown): void {
    console.error(`[${category}] ${operation}:`, error);
  }

  /**
   * 记录指标
   */
  recordMetric(
    metricName: string,
    value: number,
    metadata?: Record<string, any>,
  ): void {
    this.store.getState().addMetric({
      operationName: metricName,
      startTime: Date.now(),
      duration: value,
      metadata,
    });
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetrics[] {
    return this.store.getState().getMetrics();
  }

  /**
   * 清理指标
   */
  clearMetrics(): void {
    this.store.getState().clearMetrics();
  }

  /**
   * 获取平均执行时间
   */
  getAverageTime(operationName: string): number {
    return this.store.getState().getAverageTime(operationName);
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): Record<string, any> {
    const metrics = this.store.getState().getMetrics();
    const report: Record<string, any> = {};

    // 按操作名称分组
    const grouped = metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.operationName]) {
          acc[metric.operationName] = [];
        }
        acc[metric.operationName].push(metric);
        return acc;
      },
      {} as Record<string, PerformanceMetrics[]>,
    );

    // 计算统计信息
    for (const [operationName, operationMetrics] of Object.entries(grouped)) {
      const durations = operationMetrics
        .map((m) => m.duration || 0)
        .filter((d) => d > 0);

      if (durations.length > 0) {
        report[operationName] = {
          count: durations.length,
          average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
          min: Math.min(...durations),
          max: Math.max(...durations),
          total: durations.reduce((sum, d) => sum + d, 0),
        };
      }
    }

    return report;
  }
}

export default SimplePerformanceService;
