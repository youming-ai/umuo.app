"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type {
  PerformanceMetric,
  PerformanceMetricCategory,
  PerformanceAlert
} from "@/types/admin/performance-dashboard";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';

import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Layers,
  Download,
  Settings,
  RefreshCw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Calendar,
  Filter
} from "lucide-react";

// Chart Types
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'radar' | 'treemap' | 'gauge' | 'funnel';

// Base Chart Props
interface BaseChartProps {
  data: any[];
  title?: string;
  subtitle?: string;
  height?: number;
  width?: number;
  timeRange?: number;
  refreshInterval?: number;
  autoRefresh?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showExport?: boolean;
  showSettings?: boolean;
  className?: string;
  onDataPointClick?: (data: any) => void;
  onExport?: (data: any) => void;
  customColors?: string[];
}

// Line Chart Props
interface LineChartProps extends BaseChartProps {
  type: 'line';
  metrics: PerformanceMetric[];
  showTrend?: boolean;
  smooth?: boolean;
  strokeWidth?: number;
  dotSize?: number;
  showAreas?: boolean;
}

// Bar Chart Props
interface BarChartProps extends BaseChartProps {
  type: 'bar';
  metrics: PerformanceMetric[];
  orientation?: 'vertical' | 'horizontal';
  stackBars?: boolean;
  showLabels?: boolean;
  barRadius?: number;
}

// Pie Chart Props
interface PieChartProps extends BaseChartProps {
  type: 'pie';
  metrics: PerformanceMetric[];
  showLabels?: boolean;
  showPercentage?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
}

// Area Chart Props
interface AreaChartProps extends BaseChartProps {
  type: 'area';
  metrics: PerformanceMetric[];
  smooth?: boolean;
  strokeWidth?: number;
  opacity?: number;
  gradient?: boolean;
}

// Radar Chart Props
interface RadarChartProps extends BaseChartProps {
  type: 'radar';
  metrics: PerformanceMetric[];
  showPolygon?: boolean;
  showDots?: boolean;
  fillOpacity?: number;
}

// Gauge Chart Props
interface GaugeChartProps extends BaseChartProps {
  type: 'gauge';
  metric: PerformanceMetric;
  thresholds?: {
    poor: number;
    fair: number;
    good: number;
    excellent: number;
  };
  showThresholds?: boolean;
  animationDuration?: number;
}

// Color schemes
const CHART_COLORS = {
  primary: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'],
  status: {
    excellent: '#10B981',
    good: '#3B82F6',
    fair: '#F59E0B',
    poor: '#F97316',
    critical: '#EF4444'
  },
  category: {
    system: '#3B82F6',
    memory: '#8B5CF6',
    network: '#10B981',
    transcription: '#F59E0B',
    database: '#EC4899',
    mobile: '#14B8A6',
    ui: '#F97316',
    battery: '#EF4444',
    storage: '#6B7280'
  }
};

// Utility functions
const formatChartData = (metrics: PerformanceMetric[], timeRange?: number) => {
  const now = new Date();
  const cutoff = timeRange ? new Date(now.getTime() - timeRange) : new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Group metrics by timestamp
  const groupedData = metrics
    .filter(metric => new Date(metric.timestamp) >= cutoff)
    .reduce((acc, metric) => {
      const timestamp = metric.timestamp.toISOString().slice(0, 16); // Group by minute
      if (!acc[timestamp]) {
        acc[timestamp] = { timestamp };
      }
      acc[timestamp][metric.name] = metric.value;
      acc[timestamp][`${metric.name}_status`] = metric.status;
      return acc;
    }, {} as Record<string, any>);

  return Object.values(groupedData).sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

const formatValue = (value: number, unit: string): string => {
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
    default:
      return `${value} ${unit}`;
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name}:</span>
            <span>{formatValue(entry.value, entry.payload.unit || '')}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Main Chart Component
export const PerformanceChart: React.FC<BaseChartProps & (
  | LineChartProps
  | BarChartProps
  | PieChartProps
  | AreaChartProps
  | RadarChartProps
  | GaugeChartProps
)> = (props) => {
  const {
    type,
    data,
    title,
    subtitle,
    height = 300,
    width,
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    showExport = true,
    showSettings = true,
    className = "",
    onDataPointClick,
    onExport,
    customColors = CHART_COLORS.primary
  } = props;

  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    if (type === 'gauge') {
      return data;
    }

    if ('metrics' in props && props.metrics) {
      return formatChartData(props.metrics, props.timeRange);
    }

    return data;
  }, [data, props.metrics, props.timeRange, type]);

  const renderChart = () => {
    const commonProps = {
      width: isFullscreen ? undefined : width,
      height: isFullscreen ? 600 : height,
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'line':
        const lineProps = props as LineChartProps;
        const LineComponent = lineProps.showAreas ? AreaChart : LineChart;
        const DataComponent = lineProps.showAreas ? Area : Line;

        return (
          <ResponsiveContainer width="100%" height={commonProps.height}>
            <LineComponent {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis tick={{ fontSize: 12 }} />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              {lineProps.metrics.map((metric, index) => (
                <DataComponent
                  key={metric.id}
                  type={lineProps.smooth ? "monotone" : "linear"}
                  dataKey={metric.name}
                  stroke={customColors[index % customColors.length]}
                  strokeWidth={lineProps.strokeWidth || 2}
                  dot={{ r: lineProps.dotSize || 3 }}
                  fill={lineProps.showAreas ? customColors[index % customColors.length] : undefined}
                  fillOpacity={lineProps.opacity || 0.3}
                />
              ))}
            </LineComponent>
          </ResponsiveContainer>
        );

      case 'bar':
        const barProps = props as BarChartProps;
        const orientation = barProps.orientation || 'vertical';

        return (
          <ResponsiveContainer width="100%" height={commonProps.height}>
            <BarChart {...commonProps} layout={orientation}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis tick={{ fontSize: 12 }} />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              {barProps.metrics.map((metric, index) => (
                <Bar
                  key={metric.id}
                  dataKey={metric.name}
                  fill={customColors[index % customColors.length]}
                  radius={[barProps.barRadius || 4, barProps.barRadius || 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        const areaProps = props as AreaChartProps;

        return (
          <ResponsiveContainer width="100%" height={commonProps.height}>
            <AreaChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis tick={{ fontSize: 12 }} />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              {areaProps.metrics.map((metric, index) => (
                <Area
                  key={metric.id}
                  type={areaProps.smooth ? "monotone" : "linear"}
                  dataKey={metric.name}
                  stroke={customColors[index % customColors.length]}
                  strokeWidth={areaProps.strokeWidth || 2}
                  fill={customColors[index % customColors.length]}
                  fillOpacity={areaProps.opacity || 0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieProps = props as PieChartProps;
        const pieData = pieProps.metrics.map(metric => ({
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          status: metric.status
        }));

        return (
          <ResponsiveContainer width="100%" height={commonProps.height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={pieProps.innerRadius || 0}
                outerRadius={pieProps.outerRadius || 80}
                startAngle={pieProps.startAngle || 0}
                endAngle={pieProps.endAngle || 360}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS.status[entry.status as keyof typeof CHART_COLORS.status] || customColors[index % customColors.length]}
                  />
                ))}
                {pieProps.showLabels && <LabelList dataKey="name" position="outside" />}
              </Pie>
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        const radarProps = props as RadarChartProps;

        return (
          <ResponsiveContainer width="100%" height={commonProps.height}>
            <RadarChart {...commonProps}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              {showTooltip && <Tooltip content={<CustomTooltip />} />}
              {showLegend && <Legend />}
              {radarProps.metrics.map((metric, index) => (
                <Radar
                  key={metric.id}
                  name={metric.name}
                  dataKey={metric.name}
                  stroke={customColors[index % customColors.length]}
                  fill={customColors[index % customColors.length]}
                  fillOpacity={radarProps.fillOpacity || 0.3}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'gauge':
        const gaugeProps = props as GaugeChartProps;
        const metric = gaugeProps.metric;
        const thresholds = gaugeProps.thresholds || {
          poor: 80,
          fair: 60,
          good: 40,
          excellent: 20
        };

        const percentage = Math.max(0, Math.min(100, (metric.value / thresholds.poor) * 100));
        const angle = (percentage / 100) * 180 - 90; // Convert to angle

        return (
          <div className="relative flex items-center justify-center" style={{ height: commonProps.height }}>
            <svg width="200" height="120" viewBox="0 0 200 120">
              {/* Background arc */}
              <path
                d="M 30 90 A 60 60 0 0 1 170 90"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="20"
                strokeLinecap="round"
              />

              {/* Colored sections */}
              <path
                d="M 30 90 A 60 60 0 0 1 65 40"
                fill="none"
                stroke="#10B981"
                strokeWidth="20"
                strokeLinecap="round"
              />
              <path
                d="M 65 40 A 60 60 0 0 1 100 30"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="20"
                strokeLinecap="round"
              />
              <path
                d="M 100 30 A 60 60 0 0 1 135 40"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="20"
                strokeLinecap="round"
              />
              <path
                d="M 135 40 A 60 60 0 0 1 170 90"
                fill="none"
                stroke="#EF4444"
                strokeWidth="20"
                strokeLinecap="round"
              />

              {/* Value needle */}
              <line
                x1="100"
                y1="90"
                x2={100 + 50 * Math.cos((angle * Math.PI) / 180)}
                y2={90 + 50 * Math.sin((angle * Math.PI) / 180)}
                stroke="#1F2937"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Center dot */}
              <circle cx="100" cy="90" r="5" fill="#1F2937" />
            </svg>

            <div className="absolute text-center">
              <div className="text-2xl font-bold">
                {formatValue(metric.value, metric.unit)}
              </div>
              <div className="text-sm text-gray-600">{metric.name}</div>
              <div className="text-xs text-gray-500 capitalize">{metric.status}</div>
            </div>
          </div>
        );

      default:
        return <div className="flex items-center justify-center h-full text-gray-500">Unsupported chart type</div>;
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(chartData);
    } else {
      // Default export functionality
      const blob = new Blob([JSON.stringify(chartData, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chart-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card
      ref={containerRef}
      className={`p-6 ${isFullscreen ? 'fixed inset-4 z-50' : ''} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {showExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}

          {showSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {renderChart()}
      </div>

      {/* Settings Panel */}
      {showSettingsPanel && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="font-medium mb-3">Chart Settings</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Time Range</label>
              <Select defaultValue="1h">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Refresh Interval</label>
              <Select defaultValue="5s">
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1s">1 Second</SelectItem>
                  <SelectItem value="5s">5 Seconds</SelectItem>
                  <SelectItem value="30s">30 Seconds</SelectItem>
                  <SelectItem value="1m">1 Minute</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Auto Refresh</label>
              <div className="mt-1">
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Show Grid</label>
              <div className="mt-1">
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// Pre-configured chart components

export const SystemMetricsChart: React.FC<{
  metrics: PerformanceMetric[];
  timeRange?: number;
  className?: string;
}> = ({ metrics, timeRange, className }) => {
  const systemMetrics = metrics.filter(m => m.category === 'system');

  return (
    <PerformanceChart
      type="line"
      metrics={systemMetrics}
      title="System Performance"
      subtitle="CPU, memory, and storage metrics over time"
      height={250}
      showAreas={true}
      smooth={true}
      timeRange={timeRange}
      className={className}
      customColors={Object.values(CHART_COLORS.category)}
    />
  );
};

export const TranscriptionMetricsChart: React.FC<{
  metrics: PerformanceMetric[];
  timeRange?: number;
  className?: string;
}> = ({ metrics, timeRange, className }) => {
  const transcriptionMetrics = metrics.filter(m => m.category === 'transcription');

  return (
    <PerformanceChart
      type="bar"
      metrics={transcriptionMetrics}
      title="Transcription Performance"
      subtitle="Processing speed, accuracy, and error rates"
      height={250}
      stackBars={false}
      timeRange={timeRange}
      className={className}
      customColors={Object.values(CHART_COLORS.category)}
    />
  );
};

export const DatabaseMetricsChart: React.FC<{
  metrics: PerformanceMetric[];
  timeRange?: number;
  className?: string;
}> = ({ metrics, timeRange, className }) => {
  const dbMetrics = metrics.filter(m => m.category === 'database');

  return (
    <PerformanceChart
      type="area"
      metrics={dbMetrics}
      title="Database Performance"
      subtitle="Query performance and cache hit rates"
      height={250}
      smooth={true}
      opacity={0.6}
      timeRange={timeRange}
      className={className}
      customColors={Object.values(CHART_COLORS.category)}
    />
  );
};

export const MobileMetricsChart: React.FC<{
  metrics: PerformanceMetric[];
  timeRange?: number;
  className?: string;
}> = ({ metrics, timeRange, className }) => {
  const mobileMetrics = metrics.filter(m => m.category === 'mobile');

  return (
    <PerformanceChart
      type="radar"
      metrics={mobileMetrics}
      title="Mobile Performance"
      subtitle="Touch response, battery, and optimization metrics"
      height={300}
      showPolygon={true}
      fillOpacity={0.3}
      timeRange={timeRange}
      className={className}
      customColors={Object.values(CHART_COLORS.category)}
    />
  );
};

export const PerformanceStatusPieChart: React.FC<{
  metrics: PerformanceMetric[];
  className?: string;
}> = ({ metrics, className }) => {
  const statusCounts = metrics.reduce((acc, metric) => {
    acc[metric.status] = (acc[metric.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    status
  }));

  return (
    <PerformanceChart
      type="pie"
      data={pieData}
      title="Performance Status Distribution"
      subtitle="Overall health of system metrics"
      height={250}
      showLabels={true}
      showPercentage={true}
      innerRadius={60}
      outerRadius={80}
      className={className}
    />
  );
};

export const ResourceUsageGaugeChart: React.FC<{
  metric: PerformanceMetric;
  className?: string;
}> = ({ metric, className }) => {
  return (
    <PerformanceChart
      type="gauge"
      data={[metric]}
      metric={metric}
      title={metric.name}
      subtitle={`Current: ${formatValue(metric.value, metric.unit)}`}
      height={200}
      showThresholds={true}
      className={className}
    />
  );
};

export default PerformanceChart;
