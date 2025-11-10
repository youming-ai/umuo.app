"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PerformanceMetric,
  PerformanceMetricCategory
} from "@/types/admin/performance-dashboard";

// Icons
import {
  LineChart,
  BarChart,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Clock,
  Zap,
  Database,
  Wifi,
  Cpu,
  MemoryStick,
  Battery,
  Download,
  Maximize2,
  Settings
} from "lucide-react";

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap' | 'area';
  title: string;
  metrics: string[];
  timeRange?: number;
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count';
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  colors?: string[];
  yAxis?: {
    min?: number;
    max?: number;
    label?: string;
    format?: (value: number) => string;
  };
  xAxis?: {
    format?: (timestamp: Date) => string;
    label?: string;
  };
  threshold?: {
    value: number;
    color: string;
    label: string;
  };
}

interface PerformanceChartProps {
  config: ChartConfig;
  data: PerformanceMetric[];
  height?: number;
  className?: string;
  onDataPointClick?: (point: ChartDataPoint) => void;
  onExport?: (format: 'png' | 'svg' | 'json') => void;
  onConfigChange?: (config: ChartConfig) => void;
  showControls?: boolean;
  interactive?: boolean;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

const getMetricIcon = (category: PerformanceMetricCategory) => {
  switch (category) {
    case 'system': return <Cpu className="w-4 h-4" />;
    case 'memory': return <MemoryStick className="w-4 h-4" />;
    case 'network': return <Wifi className="w-4 h-4" />;
    case 'battery': return <Battery className="w-4 h-4" />;
    case 'database': return <Database className="w-4 h-4" />;
    case 'transcription': return <Zap className="w-4 h-4" />;
    case 'player': return <Activity className="w-4 h-4" />;
    case 'mobile': return <MemoryStick className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

/**
 * Simple Line Chart Component
 */
const SimpleLineChart: React.FC<{
  data: ChartDataPoint[];
  height: number;
  color: string;
  showGrid?: boolean;
  threshold?: { value: number; color: string };
  onDataPointClick?: (point: ChartDataPoint) => void;
}> = ({ data, height, color, showGrid = true, threshold, onDataPointClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

    const width = rect.width;
    const chartHeight = height - 40; // Leave space for labels
    const padding = { top: 10, right: 10, bottom: 30, left: 50 };

    // Calculate scales
    const xScale = (index: number) => {
      return padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
    };

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    const yScale = (value: number) => {
      return padding.top + chartHeight - ((value - minValue) / valueRange) * (chartHeight - padding.top - padding.bottom);
    };

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;

      // Horizontal grid lines
      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (i / 5) * (chartHeight - padding.top - padding.bottom);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Y-axis labels
        const value = maxValue - (i / 5) * valueRange;
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(1), padding.left - 10, y + 4);
      }
    }

    // Draw threshold line
    if (threshold) {
      const thresholdY = yScale(threshold.value);
      ctx.strokeStyle = threshold.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, thresholdY);
      ctx.lineTo(width - padding.right, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = xScale(index);
      const y = yScale(point.value);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw area under line
    ctx.fillStyle = color + '20';
    ctx.beginPath();
    data.forEach((point, index) => {
      const x = xScale(index);
      const y = yScale(point.value);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(xScale(data.length - 1), chartHeight - padding.bottom);
    ctx.lineTo(xScale(0), chartHeight - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw data points
    data.forEach((point, index) => {
      const x = xScale(index);
      const y = yScale(point.value);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // White center
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    const labelInterval = Math.ceil(data.length / 8); // Show max 8 labels
    data.forEach((point, index) => {
      if (index % labelInterval === 0 || index === data.length - 1) {
        const x = xScale(index);
        const time = point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(time, x, height - 10);
      }
    });

  }, [data, height, color, showGrid, threshold]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        style={{ height: `${height}px` }}
        onMouseMove={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const index = Math.round((x / rect.width) * (data.length - 1));

          if (index >= 0 && index < data.length) {
            setHoveredPoint(data[index]);
          }
        }}
        onMouseLeave={() => setHoveredPoint(null)}
        onClick={() => {
          if (hoveredPoint && onDataPointClick) {
            onDataPointClick(hoveredPoint);
          }
        }}
      />

      {hoveredPoint && (
        <div className="absolute top-2 right-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs">
          <div className="font-medium">{hoveredPoint.value.toFixed(2)}</div>
          <div className="text-gray-500">{hoveredPoint.timestamp.toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  );
};

/**
 * Simple Bar Chart Component
 */
const SimpleBarChart: React.FC<{
  data: ChartDataPoint[];
  height: number;
  color: string;
  showGrid?: boolean;
  onDataPointClick?: (point: ChartDataPoint) => void;
}> = ({ data, height, color, showGrid = true, onDataPointClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

    const width = rect.width;
    const chartHeight = height - 40;
    const padding = { top: 10, right: 10, bottom: 30, left: 50 };

    // Calculate scales
    const barWidth = (width - padding.left - padding.right) / data.length * 0.8;
    const barSpacing = (width - padding.left - padding.right) / data.length * 0.2;

    const values = data.map(d => d.value);
    const maxValue = Math.max(...values);

    const yScale = (value: number) => {
      return padding.top + chartHeight - (value / maxValue) * (chartHeight - padding.top - padding.bottom);
    };

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;

      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (i / 5) * (chartHeight - padding.top - padding.bottom);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        const value = maxValue - (i / 5) * maxValue;
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(1), padding.left - 10, y + 4);
      }
    }

    // Draw bars
    ctx.fillStyle = color;
    data.forEach((point, index) => {
      const x = padding.left + index * (barWidth + barSpacing);
      const barHeight = (point.value / maxValue) * (chartHeight - padding.top - padding.bottom);
      const y = yScale(point.value);

      ctx.fillRect(x, y, barWidth, barHeight);

      // X-axis labels
      if (index % Math.ceil(data.length / 8) === 0 || index === data.length - 1) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        const time = point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(time, x + barWidth / 2, height - 10);
      }
    });

  }, [data, height, color, showGrid]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  );
};

/**
 * Gauge Chart Component
 */
const GaugeChart: React.FC<{
  value: number;
  min: number;
  max: number;
  height: number;
  thresholds?: { value: number; color: string; label: string }[];
  label?: string;
  unit?: string;
}> = ({ value, min, max, height, thresholds, label, unit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

    const centerX = rect.width / 2;
    const centerY = height - 30;
    const radius = Math.min(centerX - 20, height - 60);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, height);

    // Draw gauge background
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0, false);
    ctx.stroke();

    // Draw colored sections if thresholds provided
    if (thresholds) {
      const sortedThresholds = [...thresholds].sort((a, b) => a.value - b.value);

      sortedThresholds.forEach((threshold, index) => {
        const startAngle = index === 0 ? Math.PI :
          Math.PI + (sortedThresholds[index - 1].value / max) * Math.PI;
        const endAngle = Math.PI + (threshold.value / max) * Math.PI;

        ctx.strokeStyle = threshold.color;
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
        ctx.stroke();
      });
    }

    // Draw value arc
    const valueAngle = Math.PI + ((value - min) / (max - min)) * Math.PI;
    ctx.strokeStyle = DEFAULT_COLORS[0];
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, valueAngle, false);
    ctx.stroke();

    // Draw needle
    const needleAngle = valueAngle;
    const needleLength = radius - 30;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(needleAngle);

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(needleLength, 0);
    ctx.stroke();

    // Needle circle
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#374151';
    ctx.fill();

    ctx.restore();

    // Draw value text
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${value.toFixed(1)}${unit || ''}`, centerX, centerY + 10);

    if (label) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(label, centerX, centerY + 30);
    }

    // Draw scale labels
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';

    for (let i = 0; i <= 10; i++) {
      const angle = Math.PI + (i / 10) * Math.PI;
      const labelX = centerX + Math.cos(angle) * (radius + 25);
      const labelY = centerY + Math.sin(angle) * (radius + 25);
      const labelValue = min + (i / 10) * (max - min);

      ctx.fillText(labelValue.toFixed(0), labelX, labelY + 4);
    }

  }, [value, min, max, height, thresholds, label, unit]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  );
};

/**
 * Performance Chart Component
 */
export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  config,
  data,
  height = 300,
  className = "",
  onDataPointClick,
  onExport,
  onConfigChange,
  showControls = true,
  interactive = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Process data for chart
  const chartData = useMemo(() => {
    const metrics = data.filter(metric => config.metrics.includes(metric.name));

    // Group by metric name and sort by timestamp
    const groupedData: Record<string, ChartDataPoint[]> = {};

    metrics.forEach(metric => {
      if (!groupedData[metric.name]) {
        groupedData[metric.name] = [];
      }
      groupedData[metric.name].push({
        timestamp: metric.timestamp,
        value: metric.value,
        label: metric.name,
        metadata: metric.metadata
      });
    });

    // Sort each group by timestamp
    Object.keys(groupedData).forEach(key => {
      groupedData[key].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });

    return groupedData;
  }, [data, config.metrics]);

  // Get color for metric
  const getMetricColor = (index: number) => {
    return config.colors?.[index] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  // Render chart based on type
  const renderChart = () => {
    const metricNames = Object.keys(chartData);
    if (metricNames.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available for selected metrics
        </div>
      );
    }

    switch (config.type) {
      case 'line':
        return (
          <SimpleLineChart
            data={chartData[metricNames[0]]}
            height={height}
            color={getMetricColor(0)}
            showGrid={config.showGrid}
            threshold={config.threshold}
            onDataPointClick={onDataPointClick}
          />
        );

      case 'bar':
        return (
          <SimpleBarChart
            data={chartData[metricNames[0]]}
            height={height}
            color={getMetricColor(0)}
            showGrid={config.showGrid}
            onDataPointClick={onDataPointClick}
          />
        );

      case 'gauge':
        const latestData = chartData[metricNames[0]]?.[chartData[metricNames[0]].length - 1];
        if (!latestData) {
          return <div className="flex items-center justify-center h-64 text-gray-500">No data</div>;
        }

        return (
          <GaugeChart
            value={latestData.value}
            min={config.yAxis?.min || 0}
            max={config.yAxis?.max || 100}
            height={height}
            thresholds={config.threshold ? [config.threshold] : undefined}
            label={config.title}
            unit={data.find(m => m.name === metricNames[0])?.unit}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Chart type '{config.type}' not implemented
          </div>
        );
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {data.length > 0 && getMetricIcon(data[0].category)}
          <div>
            <h3 className="text-lg font-semibold">{config.title}</h3>
            {config.metrics.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                {config.metrics.map((metric, index) => (
                  <Badge key={metric} variant="outline" className="text-xs">
                    <div
                      className="w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: getMetricColor(index) }}
                    />
                    {metric}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>

            {onExport && (
              <Select onValueChange={(value) => onExport(value as 'png' | 'svg' | 'json')}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder={<Download className="w-4 h-4" />} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="svg">SVG</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Chart Type</label>
              <Select
                value={config.type}
                onValueChange={(value) => onConfigChange?.({
                  ...config,
                  type: value as ChartConfig['type']
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="gauge">Gauge</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="heatmap">Heatmap</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Aggregation</label>
              <Select
                value={config.aggregation || 'avg'}
                onValueChange={(value) => onConfigChange?.({
                  ...config,
                  aggregation: value as ChartConfig['aggregation']
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avg">Average</SelectItem>
                  <SelectItem value="min">Minimum</SelectItem>
                  <SelectItem value="max">Maximum</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.showGrid !== false}
                onChange={(e) => onConfigChange?.({
                  ...config,
                  showGrid: e.target.checked
                })}
              />
              <span className="text-sm">Show Grid</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.showLegend !== false}
                onChange={(e) => onConfigChange?.({
                  ...config,
                  showLegend: e.target.checked
                })}
              />
              <span className="text-sm">Show Legend</span>
            </label>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className={isExpanded ? 'col-span-2' : ''}>
        {renderChart()}
      </div>

      {/* Footer */}
      {data.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <div>
            Last updated: {Math.max(...data.map(d => d.timestamp.getTime())) > 0
              ? new Date(Math.max(...data.map(d => d.timestamp.getTime()))).toLocaleTimeString()
              : 'No data'
            }
          </div>
          <div>
            {data.length} data points
          </div>
        </div>
      )}
    </Card>
  );
};

/**
 * Multi-metric Chart Component
 */
export const MultiMetricChart: React.FC<{
  title: string;
  metrics: Array<{
    name: string;
    data: PerformanceMetric[];
    color?: string;
    yAxis?: 'left' | 'right';
  }>;
  height?: number;
  showLegend?: boolean;
  timeRange?: number;
}> = ({ title, metrics, height = 400, showLegend = true, timeRange }) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    metrics.map(m => m.name)
  );

  const filteredMetrics = useMemo(() => {
    return metrics.filter(m => selectedMetrics.includes(m.name));
  }, [metrics, selectedMetrics]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>

        {showLegend && (
          <div className="flex flex-wrap gap-2">
            {metrics.map((metric, index) => (
              <label key={metric.name} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMetrics([...selectedMetrics, metric.name]);
                    } else {
                      setSelectedMetrics(selectedMetrics.filter(name => name !== metric.name));
                    }
                  }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: metric.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
                />
                <span className="text-sm">{metric.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {filteredMetrics.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Select metrics to display
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMetrics.map((metric, index) => (
            <PerformanceChart
              key={metric.name}
              config={{
                type: 'line',
                title: metric.name,
                metrics: [metric.name],
                colors: [metric.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]],
                showGrid: index === 0,
                showLegend: false
              }}
              data={metric.data}
              height={height / filteredMetrics.length}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

export default PerformanceChart;
