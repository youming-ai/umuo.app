/**
 * Admin Components Export Index
 * Comprehensive performance monitoring dashboard components
 */

// Main dashboard component
export { default as PerformanceDashboard } from './performance-dashboard';

// Metric cards and display components
export {
  default as BaseMetricCard,
  SystemMetricCard,
  MemoryMetricCard,
  NetworkMetricCard,
  TranscriptionMetricCard,
  DatabaseMetricCard,
  MobileMetricCard,
  createMetricCard,
  MetricGrid,
  MetricSummary
} from './metric-cards';

// Chart components
export {
  default as PerformanceChart,
  SystemMetricsChart,
  TranscriptionMetricsChart,
  DatabaseMetricsChart,
  MobileMetricsChart,
  PerformanceStatusPieChart,
  ResourceUsageGaugeChart
} from './charts';

// Alert management
export { default as AlertPanel } from './alert-panel';

// Settings and configuration
export { default as SettingsPanel } from './settings-panel';

// Re-export types
export type {
  PerformanceMetric,
  PerformanceMetricCategory,
  PerformanceMetricStatus,
  PerformanceAlert,
  AlertSeverity,
  SystemPerformanceMetrics,
  TranscriptionPerformanceMetrics,
  DatabasePerformanceMetrics,
  MobilePerformanceMetrics,
  PerformanceReport,
  DashboardConfiguration,
  PerformanceFilters,
  NotificationSettings,
  RealtimeMonitoringConfig,
  TimeRange,
  RefreshInterval,
  ChartType
} from '@/types/admin/performance-dashboard';

// Re-export monitoring system
export {
  RealtimePerformanceMonitor,
  realtimePerformanceMonitor,
  useRealtimeMonitoring,
  ConnectionState,
  MonitoringEventType
} from '@/lib/admin/realtime-monitoring';

// Re-export export/reporting system
export {
  ExportReportingManager,
  exportReportingManager,
  useExportReporting,
  ExportFormat,
  ReportTemplate,
  ReportSchedule
} from '@/lib/admin/export-reporting';

// Component composition utilities
export const AdminComponents = {
  PerformanceDashboard,
  BaseMetricCard,
  SystemMetricCard,
  MemoryMetricCard,
  NetworkMetricCard,
  TranscriptionMetricCard,
  DatabaseMetricCard,
  MobileMetricCard,
  PerformanceChart,
  AlertPanel,
  SettingsPanel,
  SystemMetricsChart,
  TranscriptionMetricsChart,
  DatabaseMetricsChart,
  MobileMetricsChart,
  PerformanceStatusPieChart,
  ResourceUsageGaugeChart,
  MetricGrid,
  MetricSummary,
  createMetricCard
};

// Utility functions for admin components
export const AdminUtils = {
  // Format utilities
  formatMetricValue: (value: number, unit: string): string => {
    switch (unit.toLowerCase()) {
      case 'ms':
        return value < 1 ? `${(value * 1000).toFixed(1)}μs` : `${value.toFixed(1)}ms`;
      case 'fps':
        return `${Math.round(value)} FPS`;
      case 'mb':
        return `${value.toFixed(1)} MB`;
      case 'gb':
        return `${value.toFixed(2)} GB`;
      case '%':
        return `${value.toFixed(1)}%`;
      case 's':
        return `${value.toFixed(1)}s`;
      case 'b':
      case 'bytes':
        return formatBytes(value);
      case 'kbps':
      case 'mbps':
        return `${value.toFixed(1)} ${unit.toUpperCase()}`;
      default:
        return `${value} ${unit}`;
    }
  },

  // Color utilities
  getStatusColor: (status: PerformanceMetricStatus): string => {
    switch (status) {
      case 'excellent': return "text-green-600 bg-green-50 border-green-200";
      case 'good': return "text-blue-600 bg-blue-50 border-blue-200";
      case 'fair': return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case 'poor': return "text-orange-600 bg-orange-50 border-orange-200";
      case 'critical': return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  },

  getSeverityColor: (severity: AlertSeverity): string => {
    switch (severity) {
      case 'critical': return "text-red-600 bg-red-50 border-red-200";
      case 'error': return "text-red-500 bg-red-50 border-red-200";
      case 'warning': return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case 'info': return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  },

  // Calculation utilities
  calculateHealthScore: (metrics: PerformanceMetric[]): number => {
    if (metrics.length === 0) return 100;

    const scores = metrics.map(metric => {
      switch (metric.status) {
        case 'excellent': return 100;
        case 'good': return 80;
        case 'fair': return 60;
        case 'poor': return 40;
        case 'critical': return 20;
        default: return 50;
      }
    });

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  },

  getHealthStatusFromScore: (score: number): PerformanceMetricStatus => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  },

  // Time utilities
  formatDuration: (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  },

  formatTimeRange: (timeRange: TimeRange): string => {
    switch (timeRange) {
      case 10000: return '10 seconds';
      case 60000: return '1 minute';
      case 300000: return '5 minutes';
      case 900000: return '15 minutes';
      case 3600000: return '1 hour';
      case 86400000: return '24 hours';
      default: return `${timeRange / 1000} seconds`;
    }
  },

  // Data aggregation utilities
  aggregateMetrics: (
    metrics: PerformanceMetric[],
    aggregation: 'avg' | 'min' | 'max' | 'sum' | 'count' = 'avg'
  ): Record<string, number> => {
    const grouped = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(grouped).reduce((acc, [name, values]) => {
      switch (aggregation) {
        case 'avg':
          acc[name] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          acc[name] = Math.min(...values);
          break;
        case 'max':
          acc[name] = Math.max(...values);
          break;
        case 'sum':
          acc[name] = values.reduce((a, b) => a + b, 0);
          break;
        case 'count':
          acc[name] = values.length;
          break;
      }
      return acc;
    }, {} as Record<string, number>);
  },

  // Filter utilities
  filterMetricsByCategory: (
    metrics: PerformanceMetric[],
    categories: PerformanceMetricCategory[]
  ): PerformanceMetric[] => {
    return categories.length === 0
      ? metrics
      : metrics.filter(metric => categories.includes(metric.category));
  },

  filterMetricsByStatus: (
    metrics: PerformanceMetric[],
    statuses: PerformanceMetricStatus[]
  ): PerformanceMetric[] => {
    return statuses.length === 0
      ? metrics
      : metrics.filter(metric => statuses.includes(metric.status));
  },

  filterMetricsByTimeRange: (
    metrics: PerformanceMetric[],
    timeRange: TimeRange,
    endTime: Date = new Date()
  ): PerformanceMetric[] => {
    const startTime = new Date(endTime.getTime() - timeRange);
    return metrics.filter(metric =>
      metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  },

  // Sort utilities
  sortMetrics: (
    metrics: PerformanceMetric[],
    sortBy: 'name' | 'value' | 'timestamp' | 'status' = 'timestamp',
    order: 'asc' | 'desc' = 'desc'
  ): PerformanceMetric[] => {
    return [...metrics].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'status':
          const statusOrder = { excellent: 5, good: 4, fair: 3, poor: 2, critical: 1 };
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }
};

// Helper function for formatting bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Default configurations
export const DefaultAdminConfig = {
  dashboard: {
    refreshInterval: 5000 as RefreshInterval,
    timeRange: 300000 as TimeRange,
    autoRefresh: true,
    compact: false,
    theme: 'auto' as const
  },
  monitoring: {
    enabled: true,
    polling: {
      interval: 5000,
      enabledMetrics: ['cpu_usage', 'memory_usage', 'network_latency']
    },
    websocket: {
      url: '',
      reconnectInterval: 5000,
      maxReconnectAttempts: 5
    }
  },
  alerts: {
    enabled: true,
    thresholds: [],
    notifications: {
      email: { enabled: false, recipients: [], severity: ['critical', 'error'] },
      webhook: { enabled: false, url: '', severity: ['critical', 'error'] },
      push: { enabled: true, severity: ['critical', 'error', 'warning'] },
      inApp: { enabled: true, severity: ['critical', 'error', 'warning'], sound: true }
    }
  },
  export: {
    format: 'json' as ExportFormat,
    includeAlerts: true,
    includeRecommendations: true,
    includeRawData: true,
    compression: true
  }
};

// Performance constants
export const PerformanceConstants = {
  thresholds: {
    cpu: { excellent: 20, good: 50, fair: 80, poor: 95 },
    memory: { excellent: 30, good: 60, fair: 80, poor: 90 },
    network: { excellent: 50, good: 100, fair: 200, poor: 500 },
    battery: { excellent: 80, good: 50, fair: 20, poor: 10 },
    transcription: { excellent: 2.0, good: 1.5, fair: 1.0, poor: 0.5 },
    database: { excellent: 10, good: 50, fair: 100, poor: 200 }
  },
  refreshIntervals: {
    fast: 1000,
    normal: 5000,
    slow: 10000,
    verySlow: 30000
  },
  timeRanges: {
    veryShort: 10000,    // 10 seconds
    short: 60000,        // 1 minute
    normal: 300000,      // 5 minutes
    long: 900000,        // 15 minutes
    veryLong: 3600000,   // 1 hour
    day: 86400000        // 24 hours
  }
};

export default AdminComponents;
