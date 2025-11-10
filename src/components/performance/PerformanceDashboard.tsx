"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlayerPerformanceMonitor,
  PerformanceOptimizer,
  DeviceProfiler,
  type PerformanceReport,
  type PerformanceAlert,
  type PlayerPerformanceMetric,
  type DeviceCapabilities,
  type PerformanceProfile
} from "@/lib/performance/player-performance";
import { audioBufferMemoryManager } from "@/lib/performance/memory-management";
import { animationOptimizer } from "@/lib/performance/animation-optimizer";
import {
  Activity,
  Cpu,
  MemoryStick,
  Battery,
  Wifi,
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
  Pause
} from "lucide-react";

interface PerformanceDashboardProps {
  /** Whether the dashboard is visible */
  isVisible: boolean;
  /** Callback to toggle visibility */
  onToggleVisibility: () => void;
  /** Custom className for styling */
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'error';
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

/**
 * Performance Dashboard Component
 *
 * Comprehensive developer tools for monitoring and optimizing player performance
 */
export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible,
  onToggleVisibility,
  className = ""
}) => {
  const [monitor] = useState(() => PlayerPerformanceMonitor.getInstance());
  const [optimizer] = useState(() => PerformanceOptimizer.getInstance());
  const [profiler] = useState(() => DeviceProfiler.getInstance());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentReport, setCurrentReport] = useState<PerformanceReport | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [performanceProfile, setPerformanceProfile] = useState<PerformanceProfile | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(60000); // 1 minute
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Initialize monitoring
  useEffect(() => {
    if (isVisible && !isMonitoring) {
      startMonitoring();
    } else if (!isVisible && isMonitoring) {
      stopMonitoring();
    }

    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [isVisible, isMonitoring]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !isVisible) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isVisible]);

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(async () => {
    try {
      const capabilities = await profiler.profileDevice();
      setDeviceCapabilities(capabilities);

      monitor.setDeviceCapabilities(capabilities);
      monitor.startMonitoring(capabilities);

      await optimizer.initialize();

      setIsMonitoring(true);
      refreshData();

      console.log("Performance monitoring started");
    } catch (error) {
      console.error("Failed to start monitoring:", error);
    }
  }, [monitor, optimizer, profiler]);

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    monitor.stopMonitoring();
    setIsMonitoring(false);
    console.log("Performance monitoring stopped");
  }, [monitor]);

  /**
   * Refresh dashboard data
   */
  const refreshData = useCallback(() => {
    if (!isMonitoring) return;

    // Generate performance report
    const report = monitor.generateReport();
    setCurrentReport(report);

    // Get current alerts
    const currentAlerts = monitor.getAlerts(selectedTimeRange);
    setAlerts(currentAlerts);

    // Get current device capabilities
    const capabilities = profiler.getCurrentCapabilities();
    setDeviceCapabilities(capabilities);

    // Get performance profile
    const profile = optimizer.getCurrentProfile();
    setPerformanceProfile(profile);
  }, [monitor, profiler, optimizer, isMonitoring, selectedTimeRange]);

  /**
   * Export performance data
   */
  const exportData = useCallback(() => {
    const data = {
      report: currentReport,
      deviceCapabilities,
      performanceProfile,
      alerts,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentReport, deviceCapabilities, performanceProfile, alerts]);

  /**
   * Clear performance data
   */
  const clearData = useCallback(() => {
    monitor.clearMetrics();
    audioBufferMemoryManager.clearAllBuffers();
    refreshData();
    console.log("Performance data cleared");
  }, [monitor, refreshData]);

  /**
   * Apply optimization
   */
  const applyOptimization = useCallback((optimization: string, params?: Record<string, any>) => {
    const success = optimizer.applyOptimization(optimization, params);
    if (success) {
      refreshData();
      console.log(`Applied optimization: ${optimization}`);
    } else {
      console.error(`Failed to apply optimization: ${optimization}`);
    }
  }, [optimizer, refreshData]);

  /**
   * Remove optimization
   */
  const removeOptimization = useCallback((optimization: string) => {
    const success = optimizer.removeOptimization(optimization);
    if (success) {
      refreshData();
      console.log(`Removed optimization: ${optimization}`);
    } else {
      console.error(`Failed to remove optimization: ${optimization}`);
    }
  }, [optimizer, refreshData]);

  /**
   * Get status color based on value
   */
  const getStatusColor = (value: number, thresholds: { good: number; warning: number }): 'good' | 'warning' | 'error' => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.warning) return 'warning';
    return 'error';
  };

  /**
   * Format metric value
   */
  const formatMetricValue = (value: number, unit?: string): string => {
    if (!unit) return value.toString();

    switch (unit.toLowerCase()) {
      case 'ms':
        return value < 1 ? `${(value * 1000).toFixed(1)}μs` : `${value.toFixed(1)}ms`;
      case 'fps':
        return `${Math.round(value)} FPS`;
      case 'mb':
        return `${value.toFixed(1)} MB`;
      case '%':
        return `${value.toFixed(1)}%`;
      default:
        return `${value} ${unit}`;
    }
  };

  /**
   * Render metric card
   */
  const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, status, icon, trend, description }) => {
    const statusColors = {
      good: "text-green-600 bg-green-50 border-green-200",
      warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
      error: "text-red-600 bg-red-50 border-red-200"
    };

    const trendIcons = {
      up: <TrendingUp className="w-4 h-4 text-green-500" />,
      down: <TrendingDown className="w-4 h-4 text-red-500" />,
      stable: <div className="w-4 h-4 bg-gray-300 rounded-full" />
    };

    return (
      <Card className={`p-4 border-2 ${statusColors[status]}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
          </div>
          {trend && trendIcons[trend]}
        </div>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? formatMetricValue(value, unit) : value}
        </div>
        {description && (
          <div className="text-xs text-gray-600 mt-1">{description}</div>
        )}
      </Card>
    );
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 w-96 max-h-[90vh] bg-white rounded-lg shadow-xl border border-gray-200 z-50 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Performance Dashboard</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={!isMonitoring}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleVisibility}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={isMonitoring ? "default" : "secondary"}>
            {isMonitoring ? (
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

          {deviceCapabilities && (
            <Badge variant="outline">
              {deviceCapabilities.performanceTier}
            </Badge>
          )}

          {currentReport && (
            <Badge
              variant={currentReport.summary.overallHealth === 'excellent' ? 'default' :
                       currentReport.summary.overallHealth === 'good' ? 'secondary' :
                       currentReport.summary.overallHealth === 'fair' ? 'outline' : 'destructive'}
            >
              {currentReport.summary.overallHealth}
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              variant={isMonitoring ? "destructive" : "default"}
              size="sm"
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
            >
              {isMonitoring ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              disabled={!currentReport}
            >
              <Download className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={clearData}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Time Range:</span>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={10000}>10s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
            <option value={900000}>15m</option>
            <option value={3600000}>1h</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="h-[600px]">
        <Tabs defaultValue="overview" className="p-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {currentReport && (
                <>
                  <MetricCard
                    title="Performance Score"
                    value={currentReport.performanceScore}
                    unit="%"
                    status={getStatusColor(currentReport.performanceScore, { good: 80, warning: 60 })}
                    icon={<Gauge className="w-4 h-4" />}
                    trend="stable"
                  />

                  <MetricCard
                    title="Memory Usage"
                    value={currentReport.metrics.memory[currentReport.metrics.memory.length - 1]?.usedJSHeapSize || 0}
                    unit="MB"
                    status={getStatusColor(
                      currentReport.metrics.memory[currentReport.metrics.memory.length - 1]?.usedJSHeapSize || 0,
                      { good: 100, warning: 200 }
                    )}
                    icon={<MemoryStick className="w-4 h-4" />}
                  />

                  <MetricCard
                    title="FPS"
                    value={currentReport.metrics.visualizer[currentReport.metrics.visualizer.length - 1]?.frameRate || 0}
                    unit="fps"
                    status={getStatusColor(
                      currentReport.metrics.visualizer[currentReport.metrics.visualizer.length - 1]?.frameRate || 0,
                      { good: 50, warning: 30 }
                    )}
                    icon={<Monitor className="w-4 h-4" />}
                  />

                  <MetricCard
                    title="Response Time"
                    value={currentReport.metrics.playerInteractions[currentReport.metrics.playerInteractions.length - 1]?.responseTime || 0}
                    unit="ms"
                    status={getStatusColor(
                      currentReport.metrics.playerInteractions[currentReport.metrics.playerInteractions.length - 1]?.responseTime || 0,
                      { good: 100, warning: 200 }
                    )}
                    icon={<Clock className="w-4 h-4" />}
                  />
                </>
              )}
            </div>

            {/* Device Info */}
            {deviceCapabilities && (
              <Card className="p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Device Capabilities
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Performance Tier:</span>
                    <span className="font-medium">{deviceCapabilities.performanceTier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Memory Limit:</span>
                    <span className="font-medium">{deviceCapabilities.memoryLimit} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPU Cores:</span>
                    <span className="font-medium">{deviceCapabilities.cpuCores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-medium">{deviceCapabilities.networkType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network Speed:</span>
                    <span className="font-medium">{deviceCapabilities.networkSpeed} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GPU Acceleration:</span>
                    <span className="font-medium">{deviceCapabilities.gpuAcceleration ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Recent Alerts */}
            {alerts.length > 0 && (
              <Card className="p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Recent Alerts
                </h3>
                <div className="space-y-2">
                  {alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-2 text-sm">
                      <Badge variant={alert.severity === 'critical' ? 'destructive' :
                                   alert.severity === 'high' ? 'destructive' :
                                   alert.severity === 'medium' ? 'default' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-gray-600 text-xs">{alert.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            {currentReport && (
              <>
                {/* Performance Categories */}
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Performance Categories</h3>
                  <div className="space-y-3">
                    {Object.entries({
                      'Player Interactions': currentReport.metrics.playerInteractions.length,
                      'Audio Rendering': currentReport.metrics.audioRendering.length,
                      'Subtitle Sync': currentReport.metrics.subtitleSync.length,
                      'Visualizer': currentReport.metrics.visualizer.length,
                      'Memory Snapshots': currentReport.metrics.memory.length,
                      'Battery Metrics': currentReport.metrics.battery.length,
                      'Touch Gestures': currentReport.metrics.touchGestures.length,
                      'Adaptive Quality': currentReport.metrics.adaptiveQuality.length
                    }).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Memory Stats */}
                {audioBufferMemoryManager && (
                  <Card className="p-4">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <MemoryStick className="w-4 h-4" />
                      Audio Buffer Memory
                    </h3>
                    {(() => {
                      const memStats = audioBufferMemoryManager.getMemoryStats();
                      return (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Memory Usage</span>
                              <span>{memStats.totalMemoryUsed.toFixed(1)} MB</span>
                            </div>
                            <Progress
                              value={(memStats.totalMemoryUsed / 200) * 100}
                              className="h-2"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Total Buffers:</span>
                              <div className="font-medium">{memStats.totalBuffers}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">GC Count:</span>
                              <div className="font-medium">{memStats.gcCount}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            {alerts.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="font-medium">No Performance Issues</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Everything is running smoothly!
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Card key={alert.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                        alert.severity === 'critical' ? 'text-red-500' :
                        alert.severity === 'high' ? 'text-orange-500' :
                        alert.severity === 'medium' ? 'text-yellow-500' :
                        'text-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          <Badge variant={alert.severity === 'critical' ? 'destructive' :
                                       alert.severity === 'high' ? 'destructive' :
                                       alert.severity === 'medium' ? 'default' : 'secondary'}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.message}</p>

                        {alert.recommendations.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {alert.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-0.5">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Optimizations Tab */}
          <TabsContent value="optimizations" className="space-y-4">
            {performanceProfile && (
              <>
                <Card className="p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Active Optimizations
                  </h3>
                  {performanceProfile.activeOptimizations.length === 0 ? (
                    <p className="text-sm text-gray-600">No optimizations currently active</p>
                  ) : (
                    <div className="space-y-2">
                      {performanceProfile.activeOptimizations.map((optimization) => (
                        <div key={optimization} className="flex items-center justify-between">
                          <span className="text-sm">{optimization}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeOptimization(optimization)}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Available Optimizations
                  </h3>
                  <div className="space-y-2">
                    {[
                      { name: 'reduce_animation_complexity', label: 'Reduce Animation Complexity' },
                      { name: 'enable_memory_optimization', label: 'Enable Memory Optimization' },
                      { name: 'lower_visualizer_quality', label: 'Lower Visualizer Quality' },
                      { name: 'reduce_audio_buffer_size', label: 'Reduce Audio Buffer Size' },
                      { name: 'enable_gpu_acceleration', label: 'Enable GPU Acceleration' },
                      { name: 'enable_reduced_motion', label: 'Enable Reduced Motion' },
                      { name: 'clear_unused_caches', label: 'Clear Unused Caches' },
                      { name: 'optimize_subtitle_rendering', label: 'Optimize Subtitle Rendering' }
                    ].map(({ name, label }) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-sm">{label}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyOptimization(name)}
                          disabled={performanceProfile.activeOptimizations.includes(name)}
                        >
                          <Upload className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-3">Optimization Settings</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Audio Buffer Duration:</span>
                      <span className="font-medium">{performanceProfile.optimizationSettings.audioBufferDuration}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Visualizer Quality:</span>
                      <span className="font-medium">{performanceProfile.optimizationSettings.visualizerQuality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Memory Usage:</span>
                      <span className="font-medium">{performanceProfile.optimizationSettings.maxMemoryUsage} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GPU Acceleration:</span>
                      <span className="font-medium">
                        {performanceProfile.optimizationSettings.enableGPUAcceleration ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};

export default PerformanceDashboard;
