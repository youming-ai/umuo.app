"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import type {
  PerformanceMetric,
  PerformanceMetricStatus,
  PerformanceMetricCategory
} from "@/types/admin/performance-dashboard";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Info,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

// Base Metric Card Props
interface BaseMetricCardProps {
  metric: PerformanceMetric;
  onClick?: () => void;
  compact?: boolean;
  showTrend?: boolean;
  showProgress?: boolean;
  className?: string;
}

// Specialized Metric Card Props
interface SystemMetricCardProps extends Omit<BaseMetricCardProps, 'metric'> {
  metric: PerformanceMetric & { category: 'system' };
}

interface MemoryMetricCardProps extends Omit<BaseMetricCardProps, 'metric'> {
  metric: PerformanceMetric & { category: 'memory' };
}

interface NetworkMetricCardProps extends Omit<BaseMetricCardProps, 'metric'> {
  metric: PerformanceMetric & { category: 'network' };
}

interface TranscriptionMetricCardProps extends Omit<BaseMetricCardProps, 'metric'> {
  metric: PerformanceMetric & { category: 'transcription' };
}

interface DatabaseMetricCardProps extends Omit<BaseMetricCardProps, 'metric'> {
  metric: PerformanceMetric & { category: 'database' };
}

interface MobileMetricCardProps extends Omit<BaseMetricCardProps, 'metric'> {
  metric: PerformanceMetric & { category: 'mobile' };
}

// Base metric card component
const BaseMetricCard: React.FC<BaseMetricCardProps> = ({
  metric,
  onClick,
  compact = false,
  showTrend = true,
  showProgress = false,
  className = ""
}) => {
  const getStatusColor = (status: PerformanceMetricStatus): string => {
    switch (status) {
      case 'excellent': return "text-green-600 bg-green-50 border-green-200";
      case 'good': return "text-blue-600 bg-blue-50 border-blue-200";
      case 'fair': return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case 'poor': return "text-orange-600 bg-orange-50 border-orange-200";
      case 'critical': return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: PerformanceMetricStatus) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="w-4 h-4" />;
      case 'fair':
        return <AlertTriangle className="w-4 h-4" />;
      case 'poor':
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
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
      case 'kbps':
      case 'mbps':
        return `${value.toFixed(1)} ${unit.toUpperCase()}`;
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

  const getProgressColor = (status: PerformanceMetricStatus): string => {
    switch (status) {
      case 'excellent':
      case 'good':
        return 'bg-green-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const calculateProgress = (metric: PerformanceMetric): number => {
    if (!metric.thresholds) return 0;

    const { excellent, good, fair, poor, critical } = metric.thresholds;

    if (metric.value <= excellent) return 100;
    if (metric.value <= good) return 80;
    if (metric.value <= fair) return 60;
    if (metric.value <= poor) return 40;
    if (metric.value <= critical) return 20;

    return Math.max(0, 100 - ((metric.value - critical) / critical) * 100);
  };

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${getStatusColor(metric.status)} ${className}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          {getStatusIcon(metric.status)}
          <div>
            <div className="text-sm font-medium">{metric.name}</div>
            <div className="text-xs text-gray-600">{formatValue(metric.value, metric.unit)}</div>
          </div>
        </div>
        {showTrend && getTrendIcon(metric.trend)}
      </div>
    );
  }

  return (
    <Card
      className={`p-4 border-2 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] ${getStatusColor(metric.status)} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(metric.status)}
          <Badge variant="outline" className="text-xs">
            {metric.category}
          </Badge>
        </div>
        {showTrend && (
          <div className="flex items-center gap-2">
            {showTrend && getTrendIcon(metric.trend)}
            {metric.previousValue && (
              <div className="flex items-center text-xs">
                {metric.trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                ) : metric.trend === 'down' ? (
                  <ArrowDownRight className="w-3 h-3 text-red-500" />
                ) : (
                  <Minus className="w-3 h-3 text-gray-400" />
                )}
                <span className="ml-1">
                  {Math.abs(((metric.value - metric.previousValue) / metric.previousValue) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">
            {formatValue(metric.value, metric.unit)}
          </div>
          <div className="text-xs text-gray-600 capitalize">
            {metric.status}
          </div>
        </div>

        {showProgress && metric.thresholds && (
          <div className="space-y-1">
            <Progress
              value={calculateProgress(metric)}
              className="h-2"
              // @ts-ignore - custom color prop
              indicatorColor={getProgressColor(metric.status)}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>{formatValue(metric.thresholds.poor, metric.unit)}</span>
              <span>{formatValue(metric.thresholds.excellent, metric.unit)}</span>
            </div>
          </div>
        )}

        {metric.metadata && (
          <div className="text-xs text-gray-600">
            {Object.entries(metric.metadata).slice(0, 2).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500">
          {metric.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
};

// System Metric Card
export const SystemMetricCard: React.FC<SystemMetricCardProps> = (props) => {
  const getSystemIcon = (metricName: string) => {
    switch (metricName.toLowerCase()) {
      case 'cpu_usage':
      case 'cpu':
        return <Activity className="w-5 h-5" />;
      case 'memory_usage':
      case 'memory':
        return <div className="w-5 h-5 bg-blue-500 rounded" />;
      case 'disk_usage':
      case 'storage':
        return <div className="w-5 h-5 bg-green-500 rounded" />;
      case 'network':
        return <div className="w-5 h-5 bg-purple-500 rounded" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const enhancedMetric = {
    ...props.metric,
    metadata: {
      ...props.metric.metadata,
      icon: getSystemIcon(props.metric.name)
    }
  };

  return <BaseMetricCard {...props} metric={enhancedMetric} />;
};

// Memory Metric Card
export const MemoryMetricCard: React.FC<MemoryMetricCardProps> = (props) => {
  const getMemoryDetails = (metric: PerformanceMetric) => {
    if (metric.name.toLowerCase().includes('heap')) {
      return {
        subtitle: 'JavaScript Heap',
        type: 'heap'
      };
    }
    if (metric.name.toLowerCase().includes('external')) {
      return {
        subtitle: 'External Memory',
        type: 'external'
      };
    }
    return {
      subtitle: 'System Memory',
      type: 'system'
    };
  };

  const details = getMemoryDetails(props.metric);

  return (
    <BaseMetricCard
      {...props}
      metric={{
        ...props.metric,
        metadata: {
          ...props.metric.metadata,
          ...details
        }
      }}
      showProgress={true}
    />
  );
};

// Network Metric Card
export const NetworkMetricCard: React.FC<NetworkMetricCardProps> = (props) => {
  const getNetworkDetails = (metric: PerformanceMetric) => {
    const name = metric.name.toLowerCase();
    if (name.includes('latency') || name.includes('rtt')) {
      return {
        subtitle: 'Network Latency',
        type: 'latency'
      };
    }
    if (name.includes('bandwidth') || name.includes('throughput')) {
      return {
        subtitle: 'Network Bandwidth',
        type: 'bandwidth'
      };
    }
    if (name.includes('packet') || name.includes('loss')) {
      return {
        subtitle: 'Packet Loss',
        type: 'packet_loss'
      };
    }
    return {
      subtitle: 'Network Metric',
      type: 'general'
    };
  };

  const details = getNetworkDetails(props.metric);

  return (
    <BaseMetricCard
      {...props}
      metric={{
        ...props.metric,
        metadata: {
          ...props.metric.metadata,
          ...details
        }
      }}
    />
  );
};

// Transcription Metric Card
export const TranscriptionMetricCard: React.FC<TranscriptionMetricCardProps> = (props) => {
  const getTranscriptionDetails = (metric: PerformanceMetric) => {
    const name = metric.name.toLowerCase();
    if (name.includes('speed') || name.includes('throughput')) {
      return {
        subtitle: 'Processing Speed',
        type: 'speed',
        icon: <Zap className="w-5 h-5" />
      };
    }
    if (name.includes('accuracy') || name.includes('quality')) {
      return {
        subtitle: 'Accuracy Score',
        type: 'accuracy',
        icon: <CheckCircle className="w-5 h-5" />
      };
    }
    if (name.includes('latency') || name.includes('delay')) {
      return {
        subtitle: 'Processing Latency',
        type: 'latency',
        icon: <Activity className="w-5 h-5" />
      };
    }
    if (name.includes('error') || name.includes('failure')) {
      return {
        subtitle: 'Error Rate',
        type: 'error',
        icon: <XCircle className="w-5 h-5" />
      };
    }
    return {
      subtitle: 'Transcription Metric',
      type: 'general',
      icon: <Activity className="w-5 h-5" />
    };
  };

  const details = getTranscriptionDetails(props.metric);

  return (
    <BaseMetricCard
      {...props}
      metric={{
        ...props.metric,
        metadata: {
          ...props.metric.metadata,
          ...details
        }
      }}
    />
  );
};

// Database Metric Card
export const DatabaseMetricCard: React.FC<DatabaseMetricCardProps> = (props) => {
  const getDatabaseDetails = (metric: PerformanceMetric) => {
    const name = metric.name.toLowerCase();
    if (name.includes('query') || name.includes('operation')) {
      return {
        subtitle: 'Database Operations',
        type: 'operations'
      };
    }
    if (name.includes('cache')) {
      return {
        subtitle: 'Cache Performance',
        type: 'cache'
      };
    }
    if (name.includes('index')) {
      return {
        subtitle: 'Index Performance',
        type: 'index'
      };
    }
    if (name.includes('transaction')) {
      return {
        subtitle: 'Transaction Performance',
        type: 'transaction'
      };
    }
    return {
      subtitle: 'Database Metric',
      type: 'general'
    };
  };

  const details = getDatabaseDetails(props.metric);

  return (
    <BaseMetricCard
      {...props}
      metric={{
        ...props.metric,
        metadata: {
          ...props.metric.metadata,
          ...details
        }
      }}
      showProgress={true}
    />
  );
};

// Mobile Metric Card
export const MobileMetricCard: React.FC<MobileMetricCardProps> = (props) => {
  const getMobileDetails = (metric: PerformanceMetric) => {
    const name = metric.name.toLowerCase();
    if (name.includes('touch') || name.includes('gesture')) {
      return {
        subtitle: 'Touch Performance',
        type: 'touch'
      };
    }
    if (name.includes('battery')) {
      return {
        subtitle: 'Battery Performance',
        type: 'battery'
      };
    }
    if (name.includes('thermal') || name.includes('temperature')) {
      return {
        subtitle: 'Thermal State',
        type: 'thermal'
      };
    }
    if (name.includes('audio') || name.includes('buffer')) {
      return {
        subtitle: 'Audio Performance',
        type: 'audio'
      };
    }
    return {
      subtitle: 'Mobile Metric',
      type: 'general'
    };
  };

  const details = getMobileDetails(props.metric);

  return (
    <BaseMetricCard
      {...props}
      metric={{
        ...props.metric,
        metadata: {
          ...props.metric.metadata,
          ...details
        }
      }}
    />
  );
};

// Metric Card Factory
export const createMetricCard = (metric: PerformanceMetric, props?: Omit<BaseMetricCardProps, 'metric'>) => {
  const commonProps = { ...props, metric };

  switch (metric.category) {
    case 'system':
      return <SystemMetricCard {...commonProps} metric={metric} />;
    case 'memory':
      return <MemoryMetricCard {...commonProps} metric={metric} />;
    case 'network':
      return <NetworkMetricCard {...commonProps} metric={metric} />;
    case 'transcription':
      return <TranscriptionMetricCard {...commonProps} metric={metric} />;
    case 'database':
      return <DatabaseMetricCard {...commonProps} metric={metric} />;
    case 'mobile':
      return <MobileMetricCard {...commonProps} metric={metric} />;
    default:
      return <BaseMetricCard {...commonProps} metric={metric} />;
  }
};

// Metric Grid Component
interface MetricGridProps {
  metrics: PerformanceMetric[];
  onMetricClick?: (metric: PerformanceMetric) => void;
  columns?: number;
  compact?: boolean;
  showProgress?: boolean;
  className?: string;
}

export const MetricGrid: React.FC<MetricGridProps> = ({
  metrics,
  onMetricClick,
  columns = 4,
  compact = false,
  showProgress = false,
  className = ""
}) => {
  const gridClass = columns === 1 ? "grid-cols-1" :
                   columns === 2 ? "grid-cols-1 md:grid-cols-2" :
                   columns === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
                   "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={`grid ${gridClass} gap-4 ${className}`}>
      {metrics.map((metric) => (
        <div key={metric.id}>
          {createMetricCard(metric, {
            onClick: () => onMetricClick?.(metric),
            compact,
            showTrend: true,
            showProgress
          })}
        </div>
      ))}
    </div>
  );
};

// Metric Summary Component
interface MetricSummaryProps {
  metrics: PerformanceMetric[];
  category?: PerformanceMetricCategory;
  className?: string;
}

export const MetricSummary: React.FC<MetricSummaryProps> = ({
  metrics,
  category,
  className = ""
}) => {
  const filteredMetrics = category
    ? metrics.filter(m => m.category === category)
    : metrics;

  const summary = filteredMetrics.reduce((acc, metric) => {
    acc.total++;
    acc[metric.status]++;
    return acc;
  }, {
    total: 0,
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    critical: 0
  } as Record<string, number>);

  const healthScore = summary.total > 0
    ? ((summary.excellent * 100 + summary.good * 80 + summary.fair * 60 + summary.poor * 40 + summary.critical * 20) / summary.total)
    : 0;

  const getStatusFromScore = (score: number): PerformanceMetricStatus => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  };

  const overallStatus = getStatusFromScore(healthScore);

  return (
    <div className={`p-4 border rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Metrics` : 'Overall Summary'}
        </h3>
        <Badge variant={
          overallStatus === 'excellent' ? 'default' :
          overallStatus === 'good' ? 'secondary' :
          overallStatus === 'fair' ? 'outline' : 'destructive'
        }>
          {overallStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-600">Total Metrics</div>
          <div className="text-xl font-bold">{summary.total}</div>
        </div>
        <div>
          <div className="text-gray-600">Health Score</div>
          <div className="text-xl font-bold">{healthScore.toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-gray-600">Issues</div>
          <div className="text-xl font-bold text-red-600">
            {summary.poor + summary.critical}
          </div>
        </div>
        <div>
          <div className="text-gray-600">Optimal</div>
          <div className="text-xl font-bold text-green-600">
            {summary.excellent + summary.good}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {Object.entries(summary).filter(([key]) => key !== 'total').map(([status, count]) => {
          if (count === 0) return null;

          const percentage = (count / summary.total) * 100;

          return (
            <div key={status} className="flex items-center gap-2">
              <div className="w-16 text-sm capitalize">{status}:</div>
              <div className="flex-1">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      status === 'excellent' ? 'bg-green-500' :
                      status === 'good' ? 'bg-blue-500' :
                      status === 'fair' ? 'bg-yellow-500' :
                      status === 'poor' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <div className="w-12 text-sm text-right">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BaseMetricCard;
