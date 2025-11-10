/**
 * Comprehensive Performance Dashboard Type Definitions
 * System performance monitoring and optimization dashboard types
 */

export type PerformanceMetricCategory =
  | "system"
  | "transcription"
  | "player"
  | "database"
  | "network"
  | "mobile"
  | "ui"
  | "memory"
  | "battery"
  | "storage";

export type PerformanceMetricStatus = "excellent" | "good" | "fair" | "poor" | "critical";

export type AlertSeverity = "info" | "warning" | "error" | "critical";

export type TimeRange = 10000 | 60000 | 300000 | 900000 | 3600000 | 86400000; // 10s, 1m, 5m, 15m, 1h, 24h

export type RefreshInterval = 1000 | 5000 | 10000 | 30000 | 60000; // 1s, 5s, 10s, 30s, 1m

// Core Performance Metrics
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  unit: string;
  category: PerformanceMetricCategory;
  status: PerformanceMetricStatus;
  trend: "up" | "down" | "stable";
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
  thresholds?: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

// System Performance Metrics
export interface SystemPerformanceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    available: number;
    total: number;
    usagePercentage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  storage: {
    quota: number;
    usage: number;
    available: number;
    usagePercentage: number;
    indexedDBUsage: number;
    cacheUsage: number;
  };
  network: {
    bandwidth: {
      downlink: number;
      uplink: number;
      effectiveType: string;
    };
    latency: number;
    connectionType: string;
    online: boolean;
  };
  battery: {
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  };
}

// Transcription Performance Metrics
export interface TranscriptionPerformanceMetrics {
  processing: {
    speed: number; // words per minute
    accuracy: number; // percentage
    latency: number; // milliseconds
    throughput: number; // files per hour
    queueLength: number;
  };
  quality: {
    errorRate: number;
    retryRate: number;
    successRate: number;
    averageProcessingTime: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    networkUsage: number;
  };
}

// Database Performance Metrics
export interface DatabasePerformanceMetrics {
  indexedDB: {
    operationsPerSecond: number;
    averageQueryTime: number;
    errorRate: number;
    transactionDuration: number;
    cacheHitRate: number;
    connectionPoolUsage: number;
  };
  storage: {
    readThroughput: number;
    writeThroughput: number;
    dataSize: number;
    indexSize: number;
    fragmentation: number;
  };
  optimization: {
    lastVacuum: Date;
    lastAnalyze: Date;
    cacheEfficiency: number;
    indexEfficiency: number;
  };
}

// Mobile Performance Metrics
export interface MobilePerformanceMetrics {
  device: {
    performanceTier: "low" | "medium" | "high" | "ultra";
    memoryClass: number;
    cpuClass: number;
    gpuClass: number;
    batteryLevel: number;
    thermalState: "nominal" | "fair" | "serious" | "critical";
  };
  touch: {
    responseTime: number;
    accuracy: number;
    gestureRecognitionTime: number;
    multiTouchSupport: boolean;
  };
  audio: {
    bufferHealth: number;
    underrunCount: number;
    latency: number;
    sampleRate: number;
  };
  optimization: {
    reducedMotion: boolean;
    lowPowerMode: boolean;
    dataSaver: boolean;
    memoryPressure: boolean;
  };
}

// Performance Alerts
export interface PerformanceAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: PerformanceMetricCategory;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  tags?: Record<string, string>;
  recommendations: string[];
  actions?: AlertAction[];
}

export interface AlertAction {
  label: string;
  action: () => void | Promise<void>;
  type: "primary" | "secondary" | "danger";
}

// Performance Thresholds
export interface PerformanceThreshold {
  id: string;
  metric: string;
  category: PerformanceMetricCategory;
  thresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
  unit: string;
  enabled: boolean;
  description: string;
  notifications: {
    email: boolean;
    push: boolean;
    webhook: boolean;
  };
}

// Performance Report
export interface PerformanceReport {
  id: string;
  timestamp: Date;
  timeRange: TimeRange;
  summary: {
    overallScore: number;
    overallHealth: PerformanceMetricStatus;
    totalMetrics: number;
    criticalIssues: number;
    warnings: number;
    improvements: number;
  };
  systemMetrics: SystemPerformanceMetrics;
  transcriptionMetrics: TranscriptionPerformanceMetrics;
  databaseMetrics: DatabasePerformanceMetrics;
  mobileMetrics: MobilePerformanceMetrics;
  alerts: PerformanceAlert[];
  recommendations: PerformanceRecommendation[];
  trends: PerformanceTrend[];
}

// Performance Recommendations
export interface PerformanceRecommendation {
  id: string;
  title: string;
  description: string;
  category: PerformanceMetricCategory;
  priority: "low" | "medium" | "high" | "critical";
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  estimatedImprovement: string;
  actions: RecommendationAction[];
  tags: string[];
}

export interface RecommendationAction {
  label: string;
  description: string;
  action: () => void | Promise<void>;
  automated: boolean;
}

// Performance Trends
export interface PerformanceTrend {
  metric: string;
  category: PerformanceMetricCategory;
  direction: "improving" | "degrading" | "stable";
  confidence: number; // 0-1
  changeRate: number;
  prediction: {
    nextHour: number;
    nextDay: number;
    nextWeek: number;
  };
  anomalies: TrendAnomaly[];
}

export interface TrendAnomaly {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: "low" | "medium" | "high";
}

// Dashboard Configuration
export interface DashboardConfiguration {
  id: string;
  name: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  refreshInterval: RefreshInterval;
  timeRange: TimeRange;
  alerts: {
    enabled: boolean;
    thresholds: string[]; // threshold IDs
    notifications: NotificationSettings;
  };
  theme: "light" | "dark" | "auto";
  compact: boolean;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gap: number;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: WidgetConfig;
  visible: boolean;
}

export type WidgetType =
  | "metric-card"
  | "chart"
  | "alert-panel"
  | "system-status"
  | "performance-trend"
  | "resource-usage"
  | "recommendations";

export interface WidgetConfig {
  metric?: string;
  category?: PerformanceMetricCategory;
  chartType?: "line" | "bar" | "pie" | "gauge" | "heatmap";
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;
  thresholds?: boolean;
  trend?: boolean;
  comparison?: boolean;
  customConfig?: Record<string, any>;
}

// Notification Settings
export interface NotificationSettings {
  email: {
    enabled: boolean;
    recipients: string[];
    severity: AlertSeverity[];
  };
  webhook: {
    enabled: boolean;
    url: string;
    severity: AlertSeverity[];
    headers?: Record<string, string>;
  };
  push: {
    enabled: boolean;
    severity: AlertSeverity[];
  };
  inApp: {
    enabled: boolean;
    severity: AlertSeverity[];
    sound: boolean;
  };
}

// Real-time Monitoring
export interface RealtimeMonitoringConfig {
  enabled: boolean;
  websocket?: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
  polling?: {
    interval: RefreshInterval;
    enabledMetrics: string[];
  };
  batchSize: number;
  bufferTime: number;
}

// Performance Dashboard State
export interface PerformanceDashboardState {
  isInitialized: boolean;
  isLoading: boolean;
  error?: string;
  currentTimeRange: TimeRange;
  currentRefreshInterval: RefreshInterval;
  isAutoRefresh: boolean;
  isMonitoring: boolean;
  metrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
  report?: PerformanceReport;
  configuration: DashboardConfiguration;
  filters: PerformanceFilters;
}

export interface PerformanceFilters {
  categories: PerformanceMetricCategory[];
  status: PerformanceMetricStatus[];
  severity: AlertSeverity[];
  tags: string[];
  search: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Export and Reporting
export interface ExportOptions {
  format: "json" | "csv" | "pdf" | "xlsx";
  timeRange: TimeRange;
  categories: PerformanceMetricCategory[];
  includeAlerts: boolean;
  includeRecommendations: boolean;
  includeRawData: boolean;
}

export interface ScheduledReport {
  id: string;
  name: string;
  schedule: "hourly" | "daily" | "weekly" | "monthly";
  recipients: string[];
  options: ExportOptions;
  enabled: boolean;
  lastSent?: Date;
  nextSend?: Date;
}

// Performance Optimization Actions
export interface OptimizationAction {
  id: string;
  name: string;
  description: string;
  category: PerformanceMetricCategory;
  type: "manual" | "automated" | "scheduled";
  conditions: OptimizationCondition[];
  actions: OptimizationStep[];
  rollbackActions?: OptimizationStep[];
  impact: {
    estimated: string;
    confidence: number;
    metrics: string[];
  };
}

export interface OptimizationCondition {
  metric: string;
  operator: ">" | "<" | "=" | ">=" | "<=";
  value: number;
  duration?: number; // milliseconds
}

export interface OptimizationStep {
  name: string;
  description: string;
  action: () => void | Promise<void>;
  timeout?: number;
  retryCount?: number;
}

// API Types
export interface PerformanceAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  requestId: string;
}

export interface MetricsQuery {
  categories?: PerformanceMetricCategory[];
  timeRange?: TimeRange;
  metrics?: string[];
  tags?: Record<string, string>;
  aggregation?: "avg" | "min" | "max" | "sum" | "count";
}

// Event Types
export interface PerformanceEvent {
  type: "metric_update" | "alert_created" | "alert_resolved" | "threshold_exceeded" | "optimization_applied";
  timestamp: Date;
  data: any;
}

// Health Check Types
export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  checks: HealthCheck[];
  overallScore: number;
  timestamp: Date;
}

export interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  duration: number;
  metadata?: Record<string, any>;
}
