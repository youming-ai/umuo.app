/**
 * 性能仪表板数据类型定义
 */
export type DashboardData = {
  overview: {
    healthScore: number;
    activeOperations: number;
    totalOperations: number;
    errorRate: number;
    averageResponseTime: number;
  };
  charts: {
    performanceTrend: Array<{ time: number; value: number }>;
    errorRate: Array<{ time: number; value: number }>;
    throughput: Array<{ time: number; value: number }>;
    memoryUsage: Array<{ time: number; value: number }>;
  };
  alerts: Array<{
    id: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    timestamp: number;
  }>;
};
