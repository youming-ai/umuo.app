"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Performance monitoring imports
import {
  PerformanceMonitor,
  PerformanceMetric,
  PerformanceAlert,
} from "@/lib/utils/performance-monitor";
import {
  PlayerPerformanceMonitor,
  PerformanceOptimizer,
  DeviceProfiler,
} from "@/lib/performance/player-performance";
import { ErrorHandler } from "@/lib/utils/error-handler";

// Error logging integration
import {
  ErrorLogger,
  LogLevel,
  logError,
  logInfo,
  logWarning,
} from "@/lib/errors/error-logging";

// Types
import type {
  PerformanceDashboardState,
  PerformanceMetricCategory,
  PerformanceMetricStatus,
  AlertSeverity,
  TimeRange,
  RefreshInterval,
  SystemPerformanceMetrics,
  TranscriptionPerformanceMetrics,
  DatabasePerformanceMetrics,
  MobilePerformanceMetrics,
  PerformanceReport,
  DashboardConfiguration,
  PerformanceFilters,
  NotificationSettings,
} from "@/types/admin/performance-dashboard";

// Icons
import {
  Activity,
  Cpu,
  MemoryStick,
  Battery,
  Wifi,
  Database,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Gauge,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Download,
  Upload,
  Trash2,
  Play,
  Pause,
  Filter,
  Bell,
  BarChart3,
  LineChart,
  PieChart,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  Shield,
  Target,
  Layers,
  Network,
  HardDrive,
  Radio,
  Smartphone as MobileIcon,
  Hand,
  Touchpoint,
  Volume2,
  Thermometer,
  Wind,
  Zap as ZapIcon,
  BarChart,
  Activity as ActivityIcon,
} from "lucide-react";

interface PerformanceDashboardProps {
  /** Whether the dashboard is visible */
  isVisible: boolean;
  /** Callback to toggle visibility */
  onToggleVisibility: () => void;
  /** Custom className for styling */
  className?: string;
  /** Custom configuration */
  configuration?: Partial<DashboardConfiguration>;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: PerformanceMetricStatus;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
  description?: string;
  previousValue?: number;
  showTrend?: boolean;
  onClick?: () => void;
}

interface AlertPanelProps {
  alerts: PerformanceAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
  maxVisible?: number;
}

interface ChartContainerProps {
  title: string;
  type: "line" | "bar" | "pie" | "gauge";
  data: any[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

const DEFAULT_CONFIGURATION: DashboardConfiguration = {
  id: "default",
  name: "System Performance Dashboard",
  layout: {
    columns: 4,
    rows: 3,
    gap: 16,
  },
  widgets: [],
  refreshInterval: 5000,
  timeRange: 300000, // 5 minutes
  alerts: {
    enabled: true,
    thresholds: [],
    notifications: {
      email: {
        enabled: false,
        recipients: [],
        severity: ["critical", "error"],
      },
      webhook: { enabled: false, url: "", severity: ["critical", "error"] },
      push: { enabled: true, severity: ["critical", "error", "warning"] },
      inApp: {
        enabled: true,
        severity: ["critical", "error", "warning"],
        sound: true,
      },
    },
  },
  theme: "auto",
  compact: false,
};

/**
 * Comprehensive System Performance Monitoring Dashboard
 */
export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible,
  onToggleVisibility,
  className = "",
  configuration: customConfig,
}) => {
  // Core monitoring instances
  const performanceMonitorRef = useRef(PerformanceMonitor.getInstance());
  const playerMonitorRef = useRef(PlayerPerformanceMonitor.getInstance());
  const optimizerRef = useRef(PerformanceOptimizer.getInstance());
  const profilerRef = useRef(DeviceProfiler.getInstance());
  const errorLoggerRef = useRef(ErrorLogger.getInstance());

  // Dashboard state
  const [state, setState] = useState<PerformanceDashboardState>({
    isInitialized: false,
    isLoading: false,
    currentTimeRange: 300000,
    currentRefreshInterval: 5000,
    isAutoRefresh: true,
    isMonitoring: false,
    metrics: [],
    alerts: [],
    configuration: { ...DEFAULT_CONFIGURATION, ...customConfig },
    filters: {
      categories: [],
      status: [],
      severity: [],
      tags: [],
      search: "",
    },
  });

  // Component-specific states
  const [systemMetrics, setSystemMetrics] =
    useState<SystemPerformanceMetrics | null>(null);
  const [transcriptionMetrics, setTranscriptionMetrics] =
    useState<TranscriptionPerformanceMetrics | null>(null);
  const [databaseMetrics, setDatabaseMetrics] =
    useState<DatabasePerformanceMetrics | null>(null);
  const [mobileMetrics, setMobileMetrics] =
    useState<MobilePerformanceMetrics | null>(null);
  const [currentReport, setCurrentReport] = useState<PerformanceReport | null>(
    null,
  );
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Initialize dashboard
  useEffect(() => {
    if (isVisible && !state.isInitialized) {
      initializeDashboard();
    }
  }, [isVisible, state.isInitialized]);

  // Auto refresh monitoring
  useEffect(() => {
    if (!state.isAutoRefresh || !isVisible || !state.isMonitoring) return;

    const interval = setInterval(() => {
      refreshData();
    }, state.currentRefreshInterval);

    return () => clearInterval(interval);
  }, [
    state.isAutoRefresh,
    state.currentRefreshInterval,
    isVisible,
    state.isMonitoring,
  ]);

  /**
   * Initialize the performance dashboard
   */
  const initializeDashboard = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // Initialize device profiling
      const deviceCapabilities = await profilerRef.current.profileDevice();

      // Start performance monitoring
      performanceMonitorRef.current.recordMetric(
        "dashboard_initialized",
        1,
        "count",
        {
          device_tier: deviceCapabilities.performanceTier,
          timestamp: new Date().toISOString(),
        },
      );

      // Set up initial metrics collection
      await collectSystemMetrics();

      // Log dashboard initialization
      await errorLoggerRef.current.logInfo(
        "Performance dashboard initialized successfully",
        "dashboard",
        {
          component: "PerformanceDashboard",
          action: "initialize",
        },
      );

      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
      }));

      // Start monitoring
      startMonitoring();
    } catch (error) {
      console.error("Failed to initialize performance dashboard:", error);

      // Log initialization error
      await errorLoggerRef.current.logError(
        error instanceof Error ? error : new Error(String(error)),
        LogLevel.ERROR,
        {
          component: "PerformanceDashboard",
          action: "initialize",
          phase: "initialization",
        },
      );

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Initialization failed",
      }));
    }
  }, []);

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(async () => {
    try {
      const capabilities = await profilerRef.current.profileDevice();

      // Configure monitoring based on device capabilities
      playerMonitorRef.current.setDeviceCapabilities(capabilities);
      playerMonitorRef.current.startMonitoring(capabilities);

      // Initialize optimizer
      await optimizerRef.current.initialize();

      setState((prev) => ({ ...prev, isMonitoring: true }));

      // Initial data collection
      await refreshData();

      performanceMonitorRef.current.recordMetric(
        "monitoring_started",
        1,
        "count",
      );
    } catch (error) {
      console.error("Failed to start monitoring:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to start monitoring",
      }));
    }
  }, []);

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    playerMonitorRef.current.stopMonitoring();
    setState((prev) => ({ ...prev, isMonitoring: false }));

    performanceMonitorRef.current.recordMetric(
      "monitoring_stopped",
      1,
      "count",
    );
  }, []);

  /**
   * Collect system performance metrics
   */
  const collectSystemMetrics =
    useCallback(async (): Promise<SystemPerformanceMetrics> => {
      const startTime = performance.now();

      try {
        // Memory metrics
        const memory = (performance as any).memory;
        const memoryMetrics = memory
          ? {
              used: memory.usedJSHeapSize / 1024 / 1024, // MB
              available:
                (memory.jsHeapSizeLimit - memory.usedJSHeapSize) / 1024 / 1024,
              total: memory.jsHeapSizeLimit / 1024 / 1024,
              usagePercentage:
                (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
              heapUsed: memory.usedJSHeapSize / 1024 / 1024,
              heapTotal: memory.totalJSHeapSize / 1024 / 1024,
              external: memory.usedJSHeapSize / 1024 / 1024,
            }
          : {
              used: 0,
              available: 0,
              total: 0,
              usagePercentage: 0,
              heapUsed: 0,
              heapTotal: 0,
              external: 0,
            };

        // Network metrics
        const connection =
          (navigator as any).connection ||
          (navigator as any).mozConnection ||
          (navigator as any).webkitConnection;
        const networkMetrics = {
          bandwidth: {
            downlink: connection?.downlink || 0,
            uplink: connection?.uplink || 0,
            effectiveType: connection?.effectiveType || "unknown",
          },
          latency: connection?.rtt || 0,
          connectionType: connection?.type || "unknown",
          online: navigator.onLine,
        };

        // Battery metrics
        const battery = await (navigator as any)
          .getBattery?.()
          .catch(() => null);
        const batteryMetrics = battery
          ? {
              level: battery.level * 100,
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime,
            }
          : {
              level: 100,
              charging: true,
              chargingTime: 0,
              dischargingTime: Infinity,
            };

        // Storage metrics
        const storageMetrics = await getStorageMetrics();

        // CPU metrics (limited in browser)
        const cpuMetrics = {
          usage: 0, // Not available in browser
          loadAverage: [0, 0, 0],
          cores: navigator.hardwareConcurrency || 1,
          temperature: undefined,
        };

        const metrics: SystemPerformanceMetrics = {
          cpu: cpuMetrics,
          memory: memoryMetrics,
          storage: storageMetrics,
          network: networkMetrics,
          battery: batteryMetrics,
        };

        // Record collection performance
        const collectionTime = performance.now() - startTime;
        performanceMonitorRef.current.recordMetric(
          "system_metrics_collection_time",
          collectionTime,
          "ms",
        );

        setSystemMetrics(metrics);
        return metrics;
      } catch (error) {
        console.error("Failed to collect system metrics:", error);
        performanceMonitorRef.current.recordMetric(
          "system_metrics_collection_error",
          1,
          "count",
          {
            error: error instanceof Error ? error.message : "unknown",
          },
        );
        throw error;
      }
    }, []);

  /**
   * Get storage metrics
   */
  const getStorageMetrics = async () => {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;

      // Try to get IndexedDB usage
      let indexedDBUsage = 0;
      try {
        if ("storage" in navigator && "estimate" in navigator.storage) {
          const dbEstimate = await navigator.storage.estimate();
          indexedDBUsage = dbEstimate.usageDetails?.indexedDB || 0;
        }
      } catch (e) {
        // Ignore IndexedDB errors
      }

      return {
        quota: quota / 1024 / 1024, // MB
        usage: usage / 1024 / 1024,
        available: (quota - usage) / 1024 / 1024,
        usagePercentage: quota > 0 ? (usage / quota) * 100 : 0,
        indexedDBUsage: indexedDBUsage / 1024 / 1024,
        cacheUsage: (usage - indexedDBUsage) / 1024 / 1024,
      };
    } catch (error) {
      return {
        quota: 0,
        usage: 0,
        available: 0,
        usagePercentage: 0,
        indexedDBUsage: 0,
        cacheUsage: 0,
      };
    }
  };

  /**
   * Collect transcription performance metrics
   */
  const collectTranscriptionMetrics =
    useCallback(async (): Promise<TranscriptionPerformanceMetrics> => {
      // Get transcription metrics from performance monitor
      const transcriptionStats = performanceMonitorRef.current.getStatistics(
        "transcription_duration",
        state.currentTimeRange,
      );
      const errorStats = performanceMonitorRef.current.getStatistics(
        "transcription_error",
        state.currentTimeRange,
      );

      const metrics: TranscriptionPerformanceMetrics = {
        processing: {
          speed: transcriptionStats?.average
            ? 60000 / transcriptionStats.average
            : 0, // Rough estimate
          accuracy: 95, // Default - would come from actual transcription analysis
          latency: transcriptionStats?.average || 0,
          throughput: 0, // Would be calculated from actual data
          queueLength: 0, // Would come from actual queue state
        },
        quality: {
          errorRate: errorStats
            ? (errorStats.count / (transcriptionStats?.count || 1)) * 100
            : 0,
          retryRate: 0, // Would come from retry tracking
          successRate: transcriptionStats
            ? 100 - ((errorStats?.count || 0) / transcriptionStats.count) * 100
            : 100,
          averageProcessingTime: transcriptionStats?.average || 0,
        },
        resources: {
          cpuUsage: 0, // Would come from CPU monitoring
          memoryUsage: systemMetrics?.memory.usagePercentage || 0,
          networkUsage: 0, // Would come from network monitoring
        },
      };

      setTranscriptionMetrics(metrics);
      return metrics;
    }, [state.currentTimeRange, systemMetrics]);

  /**
   * Collect database performance metrics
   */
  const collectDatabaseMetrics =
    useCallback(async (): Promise<DatabasePerformanceMetrics> => {
      try {
        const dbStartTime = performance.now();

        // Get database metrics from performance monitor
        const dbStats = performanceMonitorRef.current.getStatistics(
          "database_operation_duration",
          state.currentTimeRange,
        );
        const errorStats = performanceMonitorRef.current.getStatistics(
          "database_error",
          state.currentTimeRange,
        );

        const metrics: DatabasePerformanceMetrics = {
          indexedDB: {
            operationsPerSecond: dbStats
              ? dbStats.count / (state.currentTimeRange / 1000)
              : 0,
            averageQueryTime: dbStats?.average || 0,
            errorRate: errorStats
              ? (errorStats.count / (dbStats?.count || 1)) * 100
              : 0,
            transactionDuration: dbStats?.average || 0,
            cacheHitRate: 85, // Would come from actual cache monitoring
            connectionPoolUsage: 0, // Not applicable to IndexedDB
          },
          storage: {
            readThroughput: 0, // Would come from read monitoring
            writeThroughput: 0, // Would come from write monitoring
            dataSize: systemMetrics?.storage.indexedDBUsage || 0,
            indexSize: 0, // Would come from index analysis
            fragmentation: 0, // Would come from fragmentation analysis
          },
          optimization: {
            lastVacuum: new Date(),
            lastAnalyze: new Date(),
            cacheEfficiency: 85,
            indexEfficiency: 90,
          },
        };

        const collectionTime = performance.now() - dbStartTime;
        performanceMonitorRef.current.recordMetric(
          "database_metrics_collection_time",
          collectionTime,
          "ms",
        );

        setDatabaseMetrics(metrics);
        return metrics;
      } catch (error) {
        console.error("Failed to collect database metrics:", error);
        throw error;
      }
    }, [state.currentTimeRange, systemMetrics]);

  /**
   * Collect mobile performance metrics
   */
  const collectMobileMetrics =
    useCallback(async (): Promise<MobilePerformanceMetrics> => {
      try {
        const deviceCapabilities = profilerRef.current.getCurrentCapabilities();

        const metrics: MobilePerformanceMetrics = {
          device: {
            performanceTier: deviceCapabilities?.performanceTier || "medium",
            memoryClass: deviceCapabilities?.memoryLimit || 512,
            cpuClass: deviceCapabilities?.cpuCores || 4,
            gpuClass: deviceCapabilities?.gpuAcceleration ? "high" : "medium",
            batteryLevel: systemMetrics?.battery.level || 100,
            thermalState: "nominal", // Would come from actual thermal monitoring
          },
          touch: {
            responseTime: 50, // Would come from touch monitoring
            accuracy: 95,
            gestureRecognitionTime: 100,
            multiTouchSupport: "ontouchstart" in window,
          },
          audio: {
            bufferHealth: 90,
            underrunCount: 0,
            latency: 50,
            sampleRate: 44100,
          },
          optimization: {
            reducedMotion: window.matchMedia("(prefers-reduced-motion)")
              .matches,
            lowPowerMode: systemMetrics?.battery.charging
              ? false
              : (systemMetrics?.battery.level || 100) < 20,
            dataSaver: (navigator as any).connection?.saveData || false,
            memoryPressure: (systemMetrics?.memory.usagePercentage || 0) > 80,
          },
        };

        setMobileMetrics(metrics);
        return metrics;
      } catch (error) {
        console.error("Failed to collect mobile metrics:", error);
        throw error;
      }
    }, [systemMetrics]);

  /**
   * Refresh all dashboard data
   */
  const refreshData = useCallback(async () => {
    if (!state.isMonitoring) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Collect all metrics in parallel
      const [sysMetrics, transMetrics, dbMetrics, mobMetrics] =
        await Promise.allSettled([
          collectSystemMetrics(),
          collectTranscriptionMetrics(),
          collectDatabaseMetrics(),
          collectMobileMetrics(),
        ]);

      // Generate performance report
      const report = await generatePerformanceReport();
      setCurrentReport(report);

      // Update state
      setState((prev) => ({
        ...prev,
        isLoading: false,
        metrics: collectMetricsFromReports(
          sysMetrics,
          transMetrics,
          dbMetrics,
          mobMetrics,
        ),
      }));

      performanceMonitorRef.current.recordMetric(
        "dashboard_refresh",
        1,
        "count",
      );
    } catch (error) {
      console.error("Failed to refresh dashboard data:", error);

      // Log refresh error
      await errorLoggerRef.current.logError(
        error instanceof Error ? error : new Error(String(error)),
        LogLevel.ERROR,
        {
          component: "PerformanceDashboard",
          action: "refresh_data",
          timeRange: state.currentTimeRange,
        },
      );

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Data refresh failed",
      }));
    }
  }, [
    state.isMonitoring,
    collectSystemMetrics,
    collectTranscriptionMetrics,
    collectDatabaseMetrics,
    collectMobileMetrics,
  ]);

  /**
   * Generate comprehensive performance report
   */
  const generatePerformanceReport = async (): Promise<PerformanceReport> => {
    const timestamp = new Date();
    const reportId = `report_${timestamp.getTime()}`;

    // Calculate overall health score
    const healthScore = calculateOverallHealthScore();

    // Get recent alerts
    const alerts = performanceMonitorRef.current.getAlerts(
      state.currentTimeRange,
    );

    const report: PerformanceReport = {
      id: reportId,
      timestamp,
      timeRange: state.currentTimeRange,
      summary: {
        overallScore: healthScore,
        overallHealth: getHealthStatusFromScore(healthScore),
        totalMetrics: state.metrics.length,
        criticalIssues: alerts.filter((a) => a.severity === "critical").length,
        warnings: alerts.filter(
          (a) => a.severity === "warning" || a.severity === "error",
        ).length,
        improvements: 0, // Would be calculated from recommendations
      },
      systemMetrics: systemMetrics || ({} as SystemPerformanceMetrics),
      transcriptionMetrics:
        transcriptionMetrics || ({} as TranscriptionPerformanceMetrics),
      databaseMetrics: databaseMetrics || ({} as DatabasePerformanceMetrics),
      mobileMetrics: mobileMetrics || ({} as MobilePerformanceMetrics),
      alerts: alerts.map((a) => ({
        id: a.metric,
        title: a.metric,
        message: a.message,
        severity:
          a.severity === "error" ? "critical" : (a.severity as AlertSeverity),
        category: "system" as PerformanceMetricCategory,
        metric: a.metric,
        value: a.value,
        threshold: a.threshold,
        timestamp: a.timestamp,
        acknowledged: false,
        recommendations: [`Investigate ${a.metric} performance`],
      })),
      recommendations: [], // Would be generated based on metrics
      trends: [], // Would be calculated from historical data
    };

    return report;
  };

  /**
   * Calculate overall health score
   */
  const calculateOverallHealthScore = (): number => {
    if (!systemMetrics) return 50;

    let score = 100;

    // Memory health (30% weight)
    const memoryScore = Math.max(0, 100 - systemMetrics.memory.usagePercentage);
    score = score * 0.7 + memoryScore * 0.3;

    // Storage health (20% weight)
    const storageScore = Math.max(
      0,
      100 - systemMetrics.storage.usagePercentage,
    );
    score = score * 0.8 + storageScore * 0.2;

    // Battery health (20% weight)
    const batteryScore = systemMetrics.battery.level;
    score = score * 0.8 + batteryScore * 0.2;

    // Network health (15% weight)
    const networkScore = systemMetrics.network.online ? 100 : 0;
    score = score * 0.85 + networkScore * 0.15;

    // CPU health (15% weight)
    const cpuScore = Math.max(0, 100 - systemMetrics.cpu.usage);
    score = score * 0.85 + cpuScore * 0.15;

    return Math.round(score);
  };

  /**
   * Get health status from score
   */
  const getHealthStatusFromScore = (score: number): PerformanceMetricStatus => {
    if (score >= 90) return "excellent";
    if (score >= 75) return "good";
    if (score >= 60) return "fair";
    if (score >= 40) return "poor";
    return "critical";
  };

  /**
   * Collect metrics from various reports
   */
  const collectMetricsFromReports = (
    sysMetrics: PromiseSettledResult<SystemPerformanceMetrics>,
    transMetrics: PromiseSettledResult<TranscriptionPerformanceMetrics>,
    dbMetrics: PromiseSettledResult<DatabasePerformanceMetrics>,
    mobMetrics: PromiseSettledResult<MobilePerformanceMetrics>,
  ): PerformanceMetric[] => {
    const metrics: PerformanceMetric[] = [];

    if (sysMetrics.status === "fulfilled") {
      const { cpu, memory, storage, network, battery } = sysMetrics.value;

      metrics.push(
        {
          id: "cpu_usage",
          name: "CPU Usage",
          value: cpu.usage,
          unit: "%",
          category: "system",
          status: getMetricStatus(cpu.usage, {
            excellent: 20,
            good: 50,
            fair: 80,
          }),
          trend: "stable",
          timestamp: new Date(),
        },
        {
          id: "memory_usage",
          name: "Memory Usage",
          value: memory.usagePercentage,
          unit: "%",
          category: "memory",
          status: getMetricStatus(memory.usagePercentage, {
            excellent: 30,
            good: 60,
            fair: 80,
          }),
          trend: "stable",
          timestamp: new Date(),
        },
        {
          id: "storage_usage",
          name: "Storage Usage",
          value: storage.usagePercentage,
          unit: "%",
          category: "storage",
          status: getMetricStatus(storage.usagePercentage, {
            excellent: 30,
            good: 60,
            fair: 80,
          }),
          trend: "stable",
          timestamp: new Date(),
        },
        {
          id: "network_latency",
          name: "Network Latency",
          value: network.latency,
          unit: "ms",
          category: "network",
          status: getMetricStatus(network.latency, {
            excellent: 50,
            good: 100,
            fair: 200,
          }),
          trend: "stable",
          timestamp: new Date(),
        },
        {
          id: "battery_level",
          name: "Battery Level",
          value: battery.level,
          unit: "%",
          category: "battery",
          status: getMetricStatus(battery.level, {
            excellent: 80,
            good: 50,
            fair: 20,
          }),
          trend: "stable",
          timestamp: new Date(),
        },
      );
    }

    // Add more metrics from other sources...

    return metrics;
  };

  /**
   * Get metric status based on value and thresholds
   */
  const getMetricStatus = (
    value: number,
    thresholds: { excellent: number; good: number; fair: number },
  ): PerformanceMetricStatus => {
    if (value <= thresholds.excellent) return "excellent";
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.fair) return "fair";
    return "poor";
  };

  /**
   * Export dashboard data
   */
  const exportData = useCallback(
    (format: "json" | "csv" = "json") => {
      const data = {
        timestamp: new Date().toISOString(),
        configuration: state.configuration,
        metrics: state.metrics,
        systemMetrics,
        transcriptionMetrics,
        databaseMetrics,
        mobileMetrics,
        report: currentReport,
        timeRange: state.currentTimeRange,
      };

      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `performance-dashboard-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      performanceMonitorRef.current.recordMetric(
        "dashboard_export",
        1,
        "count",
        {
          format,
        },
      );
    },
    [
      state,
      systemMetrics,
      transcriptionMetrics,
      databaseMetrics,
      mobileMetrics,
      currentReport,
    ],
  );

  /**
   * Clear all performance data
   */
  const clearData = useCallback(() => {
    performanceMonitorRef.current.clearOldData();
    setState((prev) => ({ ...prev, metrics: [], alerts: [] }));
    setCurrentReport(null);

    performanceMonitorRef.current.recordMetric(
      "dashboard_data_cleared",
      1,
      "count",
    );
  }, []);

  /**
   * Toggle section expansion
   */
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-2 md:inset-4 lg:inset-8 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-b border-gray-200 gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              System Performance Dashboard
            </h1>
            <p className="text-sm text-gray-600 hidden sm:block">
              Real-time monitoring and optimization insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status badges */}
          <Badge variant={state.isMonitoring ? "default" : "secondary"}>
            {state.isMonitoring ? (
              <>
                <Activity className="w-3 h-3 mr-1" />
                Monitoring
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 mr-1" />
                Paused
              </>
            )}
          </Badge>

          {currentReport && (
            <Badge
              variant={
                currentReport.summary.overallHealth === "excellent"
                  ? "default"
                  : currentReport.summary.overallHealth === "good"
                    ? "secondary"
                    : currentReport.summary.overallHealth === "fair"
                      ? "outline"
                      : "destructive"
              }
            >
              {currentReport.summary.overallHealth} (
              {currentReport.summary.overallScore}%)
            </Badge>
          )}

          {/* Control buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={!state.isMonitoring || state.isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 ${state.isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={onToggleVisibility}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main dashboard area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Quick controls bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-gray-200 bg-gray-50 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
              {/* Monitoring control */}
              <Button
                variant={state.isMonitoring ? "destructive" : "default"}
                size="sm"
                onClick={state.isMonitoring ? stopMonitoring : startMonitoring}
              >
                {state.isMonitoring ? (
                  <>
                    <Pause className="w-4 h-4 mr-1" />
                    Stop Monitoring
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Start Monitoring
                  </>
                )}
              </Button>

              {/* Auto-refresh toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={state.isAutoRefresh}
                  onCheckedChange={(checked) =>
                    setState((prev) => ({ ...prev, isAutoRefresh: checked }))
                  }
                  disabled={!state.isMonitoring}
                />
                <Label className="text-sm">Auto-refresh</Label>
              </div>

              {/* Time range selector */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Time Range:</Label>
                <Select
                  value={state.currentTimeRange.toString()}
                  onValueChange={(value) =>
                    setState((prev) => ({
                      ...prev,
                      currentTimeRange: Number(value),
                    }))
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10000">10s</SelectItem>
                    <SelectItem value="60000">1m</SelectItem>
                    <SelectItem value="300000">5m</SelectItem>
                    <SelectItem value="900000">15m</SelectItem>
                    <SelectItem value="3600000">1h</SelectItem>
                    <SelectItem value="86400000">24h</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Refresh interval selector */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Refresh:</Label>
                <Select
                  value={state.currentRefreshInterval.toString()}
                  onValueChange={(value) =>
                    setState((prev) => ({
                      ...prev,
                      currentRefreshInterval: Number(value),
                    }))
                  }
                  disabled={!state.isAutoRefresh}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1s</SelectItem>
                    <SelectItem value="5000">5s</SelectItem>
                    <SelectItem value="10000">10s</SelectItem>
                    <SelectItem value="30000">30s</SelectItem>
                    <SelectItem value="60000">1m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData("json")}
                disabled={!currentReport}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={clearData}
                disabled={state.metrics.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* Dashboard content */}
          <ScrollArea className="flex-1 p-6">
            {state.error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {state.error}
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="transcription">Transcription</TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
                <TabsTrigger value="mobile">Mobile</TabsTrigger>
                <TabsTrigger value="charts">Charts</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {systemMetrics && (
                    <>
                      <MetricCard
                        title="Memory Usage"
                        value={systemMetrics.memory.usagePercentage.toFixed(1)}
                        unit="%"
                        status={getMetricStatus(
                          systemMetrics.memory.usagePercentage,
                          { excellent: 30, good: 60, fair: 80 },
                        )}
                        icon={<MemoryStick className="w-5 h-5" />}
                        description={`${systemMetrics.memory.used.toFixed(1)} MB of ${systemMetrics.memory.total.toFixed(1)} MB`}
                      />

                      <MetricCard
                        title="Storage Usage"
                        value={systemMetrics.storage.usagePercentage.toFixed(1)}
                        unit="%"
                        status={getMetricStatus(
                          systemMetrics.storage.usagePercentage,
                          { excellent: 30, good: 60, fair: 80 },
                        )}
                        icon={<HardDrive className="w-5 h-5" />}
                        description={`${systemMetrics.storage.usage.toFixed(1)} MB of ${systemMetrics.storage.quota.toFixed(1)} MB`}
                      />

                      <MetricCard
                        title="Network Latency"
                        value={systemMetrics.network.latency}
                        unit="ms"
                        status={getMetricStatus(systemMetrics.network.latency, {
                          excellent: 50,
                          good: 100,
                          fair: 200,
                        })}
                        icon={<Wifi className="w-5 h-5" />}
                        description={systemMetrics.network.effectiveType}
                      />

                      <MetricCard
                        title="Battery Level"
                        value={systemMetrics.battery.level.toFixed(0)}
                        unit="%"
                        status={getMetricStatus(systemMetrics.battery.level, {
                          excellent: 80,
                          good: 50,
                          fair: 20,
                        })}
                        icon={<Battery className="w-5 h-5" />}
                        description={
                          systemMetrics.battery.charging
                            ? "Charging"
                            : "Discharging"
                        }
                      />
                    </>
                  )}
                </div>

                {/* Performance Summary */}
                {currentReport && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Performance Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {currentReport.summary.overallScore}%
                        </div>
                        <div className="text-sm text-gray-600">
                          Overall Score
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {currentReport.summary.totalMetrics}
                        </div>
                        <div className="text-sm text-gray-600">
                          Total Metrics
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {currentReport.summary.warnings}
                        </div>
                        <div className="text-sm text-gray-600">Warnings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {currentReport.summary.criticalIssues}
                        </div>
                        <div className="text-sm text-gray-600">
                          Critical Issues
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Recent alerts preview */}
                {currentReport?.alerts && currentReport.alerts.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Recent Alerts</h3>
                      <Button variant="outline" size="sm" onClick={() => {}}>
                        View All
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {currentReport.alerts.slice(0, 3).map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
                        >
                          <AlertTriangle
                            className={`w-5 h-5 mt-0.5 ${
                              alert.severity === "critical"
                                ? "text-red-500"
                                : alert.severity === "error"
                                  ? "text-red-400"
                                  : alert.severity === "warning"
                                    ? "text-yellow-500"
                                    : "text-blue-500"
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{alert.title}</h4>
                              <Badge
                                variant={
                                  alert.severity === "critical"
                                    ? "destructive"
                                    : alert.severity === "error"
                                      ? "destructive"
                                      : alert.severity === "warning"
                                        ? "default"
                                        : "secondary"
                                }
                              >
                                {alert.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {alert.message}
                            </p>
                            <div className="text-xs text-gray-500 mt-2">
                              {alert.timestamp.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* System Metrics Tab */}
              <TabsContent value="system" className="space-y-6">
                {systemMetrics && (
                  <>
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        CPU Performance
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>CPU Usage</span>
                            <span>{systemMetrics.cpu.usage}%</span>
                          </div>
                          <Progress
                            value={systemMetrics.cpu.usage}
                            className="h-2"
                          />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">CPU Cores</div>
                          <div className="text-lg font-medium">
                            {systemMetrics.cpu.cores}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            Load Average
                          </div>
                          <div className="text-sm font-mono">
                            {systemMetrics.cpu.loadAverage
                              .map((load) => load.toFixed(2))
                              .join(", ")}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Memory Performance
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Memory Usage</span>
                            <span>
                              {systemMetrics.memory.usagePercentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={systemMetrics.memory.usagePercentage}
                            className="h-3"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Used</div>
                            <div className="font-medium">
                              {systemMetrics.memory.used.toFixed(1)} MB
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Total</div>
                            <div className="font-medium">
                              {systemMetrics.memory.total.toFixed(1)} MB
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Available</div>
                            <div className="font-medium">
                              {systemMetrics.memory.available.toFixed(1)} MB
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Network Performance
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">
                            Connection Type
                          </div>
                          <div className="font-medium capitalize">
                            {systemMetrics.network.connectionType}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            Effective Type
                          </div>
                          <div className="font-medium">
                            {systemMetrics.network.bandwidth.effectiveType}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Downlink</div>
                          <div className="font-medium">
                            {systemMetrics.network.bandwidth.downlink} Mbps
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Latency</div>
                          <div className="font-medium">
                            {systemMetrics.network.latency} ms
                          </div>
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Transcription Tab */}
              <TabsContent value="transcription" className="space-y-6">
                {transcriptionMetrics && (
                  <>
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Transcription Performance
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                          title="Processing Speed"
                          value={transcriptionMetrics.processing.speed.toFixed(
                            1,
                          )}
                          unit="x"
                          status="good"
                          icon={<Zap className="w-5 h-5" />}
                          description="Real-time processing factor"
                        />
                        <MetricCard
                          title="Average Latency"
                          value={transcriptionMetrics.processing.latency.toFixed(
                            0,
                          )}
                          unit="ms"
                          status="good"
                          icon={<Clock className="w-5 h-5" />}
                          description="Average processing time"
                        />
                        <MetricCard
                          title="Success Rate"
                          value={transcriptionMetrics.quality.successRate.toFixed(
                            1,
                          )}
                          unit="%"
                          status="excellent"
                          icon={<CheckCircle className="w-5 h-5" />}
                          description="Successful transcriptions"
                        />
                        <MetricCard
                          title="Error Rate"
                          value={transcriptionMetrics.quality.errorRate.toFixed(
                            1,
                          )}
                          unit="%"
                          status="excellent"
                          icon={<XCircle className="w-5 h-5" />}
                          description="Failed transcriptions"
                        />
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Resource Usage
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>CPU Usage</span>
                            <span>
                              {transcriptionMetrics.resources.cpuUsage.toFixed(
                                1,
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={transcriptionMetrics.resources.cpuUsage}
                            className="h-2"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Memory Usage</span>
                            <span>
                              {transcriptionMetrics.resources.memoryUsage.toFixed(
                                1,
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={transcriptionMetrics.resources.memoryUsage}
                            className="h-2"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Network Usage</span>
                            <span>
                              {transcriptionMetrics.resources.networkUsage.toFixed(
                                1,
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={transcriptionMetrics.resources.networkUsage}
                            className="h-2"
                          />
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Database Tab */}
              <TabsContent value="database" className="space-y-6">
                {databaseMetrics && (
                  <>
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        IndexedDB Performance
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <MetricCard
                          title="Operations/sec"
                          value={databaseMetrics.indexedDB.operationsPerSecond.toFixed(
                            0,
                          )}
                          unit="ops/s"
                          status="good"
                          icon={<Database className="w-5 h-5" />}
                          description="Database operations per second"
                        />
                        <MetricCard
                          title="Query Time"
                          value={databaseMetrics.indexedDB.averageQueryTime.toFixed(
                            1,
                          )}
                          unit="ms"
                          status="excellent"
                          icon={<Clock className="w-5 h-5" />}
                          description="Average query duration"
                        />
                        <MetricCard
                          title="Cache Hit Rate"
                          value={databaseMetrics.indexedDB.cacheHitRate.toFixed(
                            1,
                          )}
                          unit="%"
                          status="excellent"
                          icon={<Target className="w-5 h-5" />}
                          description="Query cache effectiveness"
                        />
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Storage Analysis
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>IndexedDB Usage</span>
                            <span>
                              {databaseMetrics.storage.dataSize.toFixed(1)} MB
                            </span>
                          </div>
                          <Progress
                            value={
                              (databaseMetrics.storage.dataSize / 100) * 100
                            }
                            className="h-3"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Read Throughput</div>
                            <div className="font-medium">
                              {databaseMetrics.storage.readThroughput.toFixed(
                                1,
                              )}{" "}
                              MB/s
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">
                              Write Throughput
                            </div>
                            <div className="font-medium">
                              {databaseMetrics.storage.writeThroughput.toFixed(
                                1,
                              )}{" "}
                              MB/s
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Mobile Tab */}
              <TabsContent value="mobile" className="space-y-6">
                {mobileMetrics && (
                  <>
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Device Performance
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                          title="Performance Tier"
                          value={mobileMetrics.device.performanceTier}
                          status="good"
                          icon={<Smartphone className="w-5 h-5" />}
                          description="Device capability level"
                        />
                        <MetricCard
                          title="Memory Class"
                          value={mobileMetrics.device.memoryClass}
                          unit="MB"
                          status="good"
                          icon={<MemoryStick className="w-5 h-5" />}
                          description="Device memory capacity"
                        />
                        <MetricCard
                          title="CPU Class"
                          value={mobileMetrics.device.cpuClass}
                          unit="cores"
                          status="good"
                          icon={<Cpu className="w-5 h-5" />}
                          description="Processing capability"
                        />
                        <MetricCard
                          title="Thermal State"
                          value={mobileMetrics.device.thermalState}
                          status="excellent"
                          icon={<Shield className="w-5 h-5" />}
                          description="Device thermal condition"
                        />
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Touch Performance
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                          title="Response Time"
                          value={mobileMetrics.touch.responseTime}
                          unit="ms"
                          status="excellent"
                          icon={<Touchpoint className="w-5 h-5" />}
                          description="Touch response latency"
                        />
                        <MetricCard
                          title="Accuracy"
                          value={mobileMetrics.touch.accuracy}
                          unit="%"
                          status="excellent"
                          icon={<Target className="w-5 h-5" />}
                          description="Touch accuracy rate"
                        />
                        <MetricCard
                          title="Gesture Recognition"
                          value={mobileMetrics.touch.gestureRecognitionTime}
                          unit="ms"
                          status="good"
                          icon={<Hand className="w-5 h-5" />}
                          description="Gesture processing time"
                        />
                        <MetricCard
                          title="Multi-touch"
                          value={
                            mobileMetrics.touch.multiTouchSupport ? "Yes" : "No"
                          }
                          status="excellent"
                          icon={<Layers className="w-5 h-5" />}
                          description="Multi-touch capability"
                        />
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Optimization Status
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <div className="font-medium">Reduced Motion</div>
                            <div className="text-sm text-gray-600">
                              Animation optimization
                            </div>
                          </div>
                          <Badge
                            variant={
                              mobileMetrics.optimization.reducedMotion
                                ? "default"
                                : "secondary"
                            }
                          >
                            {mobileMetrics.optimization.reducedMotion
                              ? "On"
                              : "Off"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <div className="font-medium">Low Power Mode</div>
                            <div className="text-sm text-gray-600">
                              Battery optimization
                            </div>
                          </div>
                          <Badge
                            variant={
                              mobileMetrics.optimization.lowPowerMode
                                ? "default"
                                : "secondary"
                            }
                          >
                            {mobileMetrics.optimization.lowPowerMode
                              ? "On"
                              : "Off"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <div className="font-medium">Data Saver</div>
                            <div className="text-sm text-gray-600">
                              Network optimization
                            </div>
                          </div>
                          <Badge
                            variant={
                              mobileMetrics.optimization.dataSaver
                                ? "default"
                                : "secondary"
                            }
                          >
                            {mobileMetrics.optimization.dataSaver
                              ? "On"
                              : "Off"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <div className="font-medium">Memory Pressure</div>
                            <div className="text-sm text-gray-600">
                              Memory optimization
                            </div>
                          </div>
                          <Badge
                            variant={
                              mobileMetrics.optimization.memoryPressure
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {mobileMetrics.optimization.memoryPressure
                              ? "High"
                              : "Normal"}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Charts Tab */}
              <TabsContent value="charts" className="space-y-6">
                {/* Performance Gauges */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Real-time Performance Gauges
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <PerformanceGauge
                      value={systemMetrics?.memory.usagePercentage || 0}
                      max={100}
                      label="Memory Usage"
                      unit="%"
                      thresholds={{ good: 30, warning: 60, critical: 80 }}
                      size="md"
                    />
                    <PerformanceGauge
                      value={systemMetrics?.storage.usagePercentage || 0}
                      max={100}
                      label="Storage Usage"
                      unit="%"
                      thresholds={{ good: 30, warning: 60, critical: 80 }}
                      size="md"
                    />
                    <PerformanceGauge
                      value={transcriptionMetrics?.quality.successRate || 100}
                      max={100}
                      label="Success Rate"
                      unit="%"
                      thresholds={{ good: 95, warning: 90, critical: 80 }}
                      size="md"
                    />
                    <PerformanceGauge
                      value={systemMetrics?.battery.level || 100}
                      max={100}
                      label="Battery Level"
                      unit="%"
                      thresholds={{ good: 80, warning: 40, critical: 20 }}
                      size="md"
                    />
                  </div>
                </Card>

                {/* Performance Trends */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Performance Trends
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Memory Usage Trend</h4>
                      <MiniChart
                        data={generateTrendData(
                          systemMetrics?.memory.usagePercentage || 0,
                        )}
                        height={80}
                        color="#3b82f6"
                        showGrid={true}
                      />
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                        <span>5 minutes ago</span>
                        <span>Current</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">
                        Network Latency Trend
                      </h4>
                      <MiniChart
                        data={generateTrendData(
                          systemMetrics?.network.latency || 0,
                        )}
                        height={80}
                        color="#10b981"
                        showGrid={true}
                      />
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                        <span>5 minutes ago</span>
                        <span>Current</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">
                        Transcription Success Rate
                      </h4>
                      <MiniChart
                        data={generateTrendData(
                          transcriptionMetrics?.quality.successRate || 100,
                        )}
                        height={80}
                        color="#eab308"
                        showGrid={true}
                      />
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                        <span>5 minutes ago</span>
                        <span>Current</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">
                        Database Operations/sec
                      </h4>
                      <MiniChart
                        data={generateTrendData(
                          databaseMetrics?.indexedDB.operationsPerSecond || 0,
                        )}
                        height={80}
                        color="#ef4444"
                        showGrid={true}
                      />
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                        <span>5 minutes ago</span>
                        <span>Current</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Usage Heatmap */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Hourly Usage Heatmap
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3">
                        App Usage by Hour (Last 7 Days)
                      </h4>
                      <Heatmap
                        data={generateHeatmapData()}
                        labels={[
                          "Sun",
                          "Mon",
                          "Tue",
                          "Wed",
                          "Thu",
                          "Fri",
                          "Sat",
                        ]}
                        height={200}
                        width={600}
                      />
                      <div className="flex items-center justify-center mt-4 space-x-6 text-xs">
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                          <span>Low</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                          <span>Medium</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                          <span>High</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                          <span>Critical</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Performance Comparison */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Performance Comparison
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <h4 className="font-medium mb-3">
                        Device Performance vs Average
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Memory Performance</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(100, (systemMetrics?.memory.usagePercentage || 0) * 1.5)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">
                              Your Device
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Network Performance</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{
                                  width: `${Math.max(20, 100 - (systemMetrics?.network.latency || 0) / 5)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">
                              Your Device
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Transcription Speed</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(100, (transcriptionMetrics?.processing.speed || 0) * 10)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">
                              Your Device
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">
                        Resource Efficiency Score
                      </h4>
                      <div className="text-center">
                        <div className="relative inline-flex items-center justify-center">
                          <svg className="w-32 h-32">
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-gray-200"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              stroke="url(#gradient)"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 56}`}
                              strokeDashoffset={`${2 * Math.PI * 56 * (1 - calculateEfficiencyScore() / 100)}`}
                              strokeLinecap="round"
                              transform="rotate(-90 64 64)"
                            />
                            <defs>
                              <linearGradient
                                id="gradient"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="0%"
                              >
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute">
                            <div className="text-2xl font-bold">
                              {calculateEfficiencyScore()}%
                            </div>
                            <div className="text-xs text-gray-500">
                              Efficient
                            </div>
                          </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-600">
                          Your device is performing{" "}
                          {calculateEfficiencyScore() > 80
                            ? "excellently"
                            : calculateEfficiencyScore() > 60
                              ? "well"
                              : calculateEfficiencyScore() > 40
                                ? "moderately"
                                : "poorly"}{" "}
                          compared to similar devices.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Alerts Tab */}
              <TabsContent value="alerts" className="space-y-6">
                {currentReport?.alerts && currentReport.alerts.length > 0 ? (
                  <div className="space-y-4">
                    {currentReport.alerts.map((alert) => (
                      <Card key={alert.id} className="p-6">
                        <div className="flex items-start gap-4">
                          <AlertTriangle
                            className={`w-6 h-6 mt-1 flex-shrink-0 ${
                              alert.severity === "critical"
                                ? "text-red-500"
                                : alert.severity === "error"
                                  ? "text-red-400"
                                  : alert.severity === "warning"
                                    ? "text-yellow-500"
                                    : "text-blue-500"
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-semibold">
                                {alert.title}
                              </h3>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    alert.severity === "critical"
                                      ? "destructive"
                                      : alert.severity === "error"
                                        ? "destructive"
                                        : alert.severity === "warning"
                                          ? "default"
                                          : "secondary"
                                  }
                                >
                                  {alert.severity}
                                </Badge>
                                <Badge variant="outline">
                                  {alert.category}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-gray-600 mb-3">
                              {alert.message}
                            </p>

                            {alert.recommendations.length > 0 && (
                              <div className="mb-3">
                                <h4 className="font-medium mb-2">
                                  Recommendations:
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                  {alert.recommendations.map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <span>
                                Value: {alert.value}{" "}
                                {alert.metric.replace("_", " ")} (Threshold:{" "}
                                {alert.threshold})
                              </span>
                              <span>{alert.timestamp.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      No Performance Issues
                    </h3>
                    <p className="text-gray-600">
                      Everything is running smoothly! No alerts have been
                      generated in the selected time range.
                    </p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>

        {/* Settings sidebar */}
        {showSettings && (
          <div className="w-full sm:w-80 border-t sm:border-t-0 sm:border-l border-gray-200 bg-gray-50 p-4 sm:p-6 overflow-y-auto max-h-96 sm:max-h-none">
            <h3 className="text-lg font-semibold mb-4">Dashboard Settings</h3>

            <div className="space-y-6">
              {/* Refresh settings */}
              <div>
                <h4 className="font-medium mb-3">Refresh Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Auto-refresh</Label>
                    <Switch
                      checked={state.isAutoRefresh}
                      onCheckedChange={(checked) =>
                        setState((prev) => ({
                          ...prev,
                          isAutoRefresh: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Refresh Interval</Label>
                    <Select
                      value={state.currentRefreshInterval.toString()}
                      onValueChange={(value) =>
                        setState((prev) => ({
                          ...prev,
                          currentRefreshInterval: Number(value),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1000">1 second</SelectItem>
                        <SelectItem value="5000">5 seconds</SelectItem>
                        <SelectItem value="10000">10 seconds</SelectItem>
                        <SelectItem value="30000">30 seconds</SelectItem>
                        <SelectItem value="60000">1 minute</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Time range settings */}
              <div>
                <h4 className="font-medium mb-3">Time Range</h4>
                <Select
                  value={state.currentTimeRange.toString()}
                  onValueChange={(value) =>
                    setState((prev) => ({
                      ...prev,
                      currentTimeRange: Number(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10000">Last 10 seconds</SelectItem>
                    <SelectItem value="60000">Last 1 minute</SelectItem>
                    <SelectItem value="300000">Last 5 minutes</SelectItem>
                    <SelectItem value="900000">Last 15 minutes</SelectItem>
                    <SelectItem value="3600000">Last 1 hour</SelectItem>
                    <SelectItem value="86400000">Last 24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Alert settings */}
              <div>
                <h4 className="font-medium mb-3">Alert Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Enable alerts</Label>
                    <Switch
                      checked={state.configuration.alerts.enabled}
                      onCheckedChange={(checked) =>
                        setState((prev) => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            alerts: {
                              ...prev.configuration.alerts,
                              enabled: checked,
                            },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">In-app notifications</Label>
                    <Switch
                      checked={
                        state.configuration.alerts.notifications.inApp.enabled
                      }
                      onCheckedChange={(checked) =>
                        setState((prev) => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            alerts: {
                              ...prev.configuration.alerts,
                              notifications: {
                                ...prev.configuration.alerts.notifications,
                                inApp: {
                                  ...prev.configuration.alerts.notifications
                                    .inApp,
                                  enabled: checked,
                                },
                              },
                            },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Sound alerts</Label>
                    <Switch
                      checked={
                        state.configuration.alerts.notifications.inApp.sound
                      }
                      onCheckedChange={(checked) =>
                        setState((prev) => ({
                          ...prev,
                          configuration: {
                            ...prev.configuration,
                            alerts: {
                              ...prev.configuration.alerts,
                              notifications: {
                                ...prev.configuration.alerts.notifications,
                                inApp: {
                                  ...prev.configuration.alerts.notifications
                                    .inApp,
                                  sound: checked,
                                },
                              },
                            },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data management */}
              <div>
                <h4 className="font-medium mb-3">Data Management</h4>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportData("json")}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearData}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// MetricCard component
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  status,
  icon,
  trend,
  description,
  previousValue,
  showTrend = true,
  onClick,
}) => {
  const statusColors = {
    excellent: "text-green-600 bg-green-50 border-green-200",
    good: "text-blue-600 bg-blue-50 border-blue-200",
    fair: "text-yellow-600 bg-yellow-50 border-yellow-200",
    poor: "text-orange-600 bg-orange-50 border-orange-200",
    critical: "text-red-600 bg-red-50 border-red-200",
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-green-500" />,
    down: <TrendingDown className="w-4 h-4 text-red-500" />,
    stable: <div className="w-4 h-4 bg-gray-300 rounded-full" />,
  };

  const formatValue = (val: string | number, unit?: string): string => {
    if (typeof val === "string") return val;

    if (!unit) return val.toString();

    switch (unit.toLowerCase()) {
      case "ms":
        return val < 1 ? `${(val * 1000).toFixed(1)}μs` : `${val.toFixed(1)}ms`;
      case "fps":
        return `${Math.round(val)} FPS`;
      case "mb":
        return `${val.toFixed(1)} MB`;
      case "%":
        return `${val.toFixed(1)}%`;
      default:
        return `${val} ${unit}`;
    }
  };

  return (
    <Card
      className={`p-4 border-2 cursor-pointer hover:shadow-md transition-shadow ${statusColors[status]}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {showTrend && trend && trendIcons[trend]}
      </div>
      <div className="text-2xl font-bold">{formatValue(value, unit)}</div>
      {description && (
        <div className="text-xs text-gray-600 mt-1">{description}</div>
      )}
    </Card>
  );
};

// Chart and visualization components
interface PerformanceGaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  thresholds?: {
    good: number;
    warning: number;
    critical: number;
  };
  size?: "sm" | "md" | "lg";
}

const PerformanceGauge: React.FC<PerformanceGaugeProps> = ({
  value,
  max,
  label,
  unit,
  thresholds = { good: 60, warning: 80, critical: 90 },
  size = "md",
}) => {
  const percentage = (value / max) * 100;
  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  const strokeDasharray = `${2 * Math.PI * 45}`;
  const strokeDashoffset =
    strokeDasharray - (strokeDasharray * percentage) / 100;

  const getColor = () => {
    if (percentage >= thresholds.critical) return "#ef4444"; // red
    if (percentage >= thresholds.warning) return "#eab308"; // yellow
    if (percentage >= thresholds.good) return "#3b82f6"; // blue
    return "#10b981"; // green
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeClasses[size]}`}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke={getColor()}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-in-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{value.toFixed(1)}</span>
          {unit && <span className="text-xs text-gray-500">{unit}</span>}
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
};

interface MiniChartProps {
  data: number[];
  height?: number;
  color?: string;
  showGrid?: boolean;
}

const MiniChart: React.FC<MiniChartProps> = ({
  data,
  height = 60,
  color = "#3b82f6",
  showGrid = true,
}) => {
  const width = data.length * 4;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * (width - 4) + 2;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {showGrid && (
          <>
            <line
              x1="0"
              y1={height / 2}
              x2={width}
              y2={height / 2}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1={height}
              x2={width}
              y2={height}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          </>
        )}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.length > 0 && (
          <circle
            cx={width - 4}
            cy={
              height -
              ((data[data.length - 1] - min) / range) * (height - 4) -
              2
            }
            r="2"
            fill={color}
          />
        )}
      </svg>
    </div>
  );
};

interface HeatmapProps {
  data: number[][];
  labels?: string[];
  height?: number;
  width?: number;
}

const Heatmap: React.FC<HeatmapProps> = ({
  data,
  labels = [],
  height = 200,
  width = 400,
}) => {
  const maxValue = Math.max(...data.flat(), 1);
  const cellHeight = height / data.length;
  const cellWidth = width / (data[0]?.length || 1);

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    const r = Math.round(255 * intensity);
    const g = Math.round(255 * (1 - intensity));
    const b = 50;
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        className="border border-gray-200 rounded"
      >
        {data.map((row, rowIndex) =>
          row.map((value, colIndex) => (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * cellWidth}
              y={rowIndex * cellHeight}
              width={cellWidth}
              height={cellHeight}
              fill={getColor(value)}
              stroke="#fff"
              strokeWidth="1"
            >
              <title>{`Row ${rowIndex + 1}, Col ${colIndex + 1}: ${value.toFixed(2)}`}</title>
            </rect>
          )),
        )}
      </svg>
      {labels.length > 0 && (
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper functions for charts
const generateTrendData = (
  currentValue: number,
  points: number = 20,
): number[] => {
  const data = [];
  for (let i = 0; i < points; i++) {
    const variation = (Math.random() - 0.5) * currentValue * 0.2;
    const value = Math.max(0, currentValue + variation);
    data.push(value);
  }
  return data;
};

const generateHeatmapData = (): number[][] => {
  const days = 7;
  const hours = 24;
  const data = [];

  for (let day = 0; day < days; day++) {
    const dayData = [];
    for (let hour = 0; hour < hours; hour++) {
      // Simulate usage patterns: higher during business hours, lower at night
      let baseUsage = 0.2;
      if (hour >= 9 && hour <= 17) {
        baseUsage = 0.7;
      } else if (hour >= 18 && hour <= 22) {
        baseUsage = 0.5;
      }

      // Add some randomness and weekend patterns
      const isWeekend = day === 0 || day === 6;
      if (isWeekend) {
        baseUsage = baseUsage * 0.6;
      }

      const usage = baseUsage + (Math.random() - 0.5) * 0.3;
      dayData.push(Math.max(0, Math.min(1, usage)));
    }
    data.push(dayData);
  }

  return data;
};

const calculateEfficiencyScore = (): number => {
  // This would be calculated based on actual performance metrics
  // For now, returning a simulated score
  const baseScore = 75;
  const variation = (Math.random() - 0.5) * 20;
  return Math.round(Math.max(0, Math.min(100, baseScore + variation)));
};

export default PerformanceDashboard;
