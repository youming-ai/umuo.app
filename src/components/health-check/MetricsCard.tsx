import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  BarChart3,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
} from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period?: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  progress?: number;
  progressLabel?: string;
  className?: string;
  children?: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  }>;
  metadata?: Record<string, string | number>;
  loading?: boolean;
  error?: string;
}

const statusConfig = {
  success: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    titleColor: 'text-green-900',
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-900',
  },
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
  },
};

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  down: {
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  neutral: {
    icon: Minus,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

export function MetricsCard({
  title,
  value,
  description,
  trend,
  status,
  icon,
  progress,
  progressLabel,
  className,
  children,
  actions,
  metadata,
  loading = false,
  error,
}: MetricsCardProps) {
  const statusStyle = status ? statusConfig[status] : null;
  const trendStyle = trend ? trendConfig[trend.direction] : null;

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-4"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-red-900">
              {title}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">{error}</p>
          {actions && (
            <div className="mt-3 flex gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={action.onClick}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        statusStyle?.bgColor,
        statusStyle?.borderColor,
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              'text-sm font-medium',
              statusStyle?.titleColor || 'text-gray-900'
            )}
          >
            {title}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {status && statusStyle && (
              <statusStyle.icon className={cn('h-4 w-4', statusStyle.iconColor)} />
            )}
            {icon}
            {trend && trendStyle && (
              <div
                className={cn(
                  'flex items-center space-x-1 rounded-full px-2 py-1',
                  trendStyle.bgColor
                )}
              >
                <trendStyle.icon className={cn('h-3 w-3', trendStyle.color)} />
                <span className={cn('text-xs font-medium', trendStyle.color)}>
                  {trend.value}%
                </span>
              </div>
            )}
          </div>
        </div>
        {description && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline space-x-2">
            <span
              className={cn(
                'text-2xl font-bold',
                statusStyle?.titleColor || 'text-gray-900'
              )}
            >
              {value}
            </span>
            {trend && trend.period && (
              <span className="text-xs text-gray-500">
                vs {trend.period}
              </span>
            )}
          </div>

          {progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">
                  {progressLabel || 'Progress'}
                </span>
                <span className="text-xs font-medium text-gray-900">
                  {progress}%
                </span>
              </div>
              <div className={cn(
                "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
                status === 'error' && 'bg-red-200',
                status === 'warning' && 'bg-yellow-200',
                status === 'success' && 'bg-green-200',
                !status && 'bg-blue-200'
              )}>
                <div
                  className={cn(
                    "h-full bg-primary transition-all",
                    status === 'error' && 'bg-red-500',
                    status === 'warning' && 'bg-yellow-500',
                    status === 'success' && 'bg-green-500',
                    !status && 'bg-blue-500'
                  )}
                  style={{ transform: `translateX(-${100 - progress}%)` }}
                />
              </div>
            </div>
          )}

          {metadata && Object.keys(metadata).length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{key}:</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          )}

          {children}

          {actions && actions.length > 0 && (
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'ghost'}
                  size="sm"
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized metrics cards
interface HealthScoreCardProps {
  score: number;
  previousScore?: number;
  className?: string;
}

export function HealthScoreCard({
  score,
  previousScore,
  className,
}: HealthScoreCardProps) {
  const getScoreStatus = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const trend = previousScore
    ? {
        value: Math.round(((score - previousScore) / previousScore) * 100),
        direction: (score > previousScore ? 'up' : score < previousScore ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
      }
    : undefined;

  return (
    <MetricsCard
      title="健康评分"
      value={score}
      description="系统整体健康度评分"
      status={getScoreStatus(score)}
      trend={trend}
      icon={<BarChart3 className="h-4 w-4" />}
      progress={score}
      progressLabel="健康度"
      className={className}
    />
  );
}

interface ResponseTimeCardProps {
  responseTime: number;
  target: number;
  unit?: string;
  className?: string;
}

export function ResponseTimeCard({
  responseTime,
  target,
  unit = 'ms',
  className,
}: ResponseTimeCardProps) {
  const getStatus = () => {
    if (responseTime <= target) return 'success';
    if (responseTime <= target * 1.5) return 'warning';
    return 'error';
  };

  const progress = Math.min((responseTime / target) * 100, 100);

  return (
    <MetricsCard
      title="响应时间"
      value={responseTime}
      description={`目标: < ${target}${unit}`}
      status={getStatus()}
      icon={<Clock className="h-4 w-4" />}
      progress={100 - progress} // Invert so lower response time shows higher progress
      progressLabel="性能"
      metadata={{
        目标: `${target}${unit}`,
        状态: responseTime <= target ? '正常' : '超标',
      }}
      className={className}
    />
  );
}

interface SuccessRateCardProps {
  successRate: number;
  totalRequests: number;
  className?: string;
}

export function SuccessRateCard({
  successRate,
  totalRequests,
  className,
}: SuccessRateCardProps) {
  const getStatus = () => {
    if (successRate >= 95) return 'success';
    if (successRate >= 85) return 'warning';
    return 'error';
  };

  const failedRequests = totalRequests - Math.round((totalRequests * successRate) / 100);

  return (
    <MetricsCard
      title="成功率"
      value={`${successRate}%`}
      description="API请求成功率"
      status={getStatus()}
      icon={<CheckCircle className="h-4 w-4" />}
      progress={successRate}
      progressLabel="成功率"
      metadata={{
        总请求: totalRequests,
        失败: failedRequests,
        成功: totalRequests - failedRequests,
      }}
      className={className}
    />
  );
}

interface ActivityCardProps {
  activeChecks: number;
  totalChecks: number;
  lastCheckTime?: Date;
  className?: string;
}

export function ActivityCard({
  activeChecks,
  totalChecks,
  lastCheckTime,
  className,
}: ActivityCardProps) {
  const progress = totalChecks > 0 ? (activeChecks / totalChecks) * 100 : 0;
  const status = activeChecks > 0 ? 'info' : 'success';

  return (
    <MetricsCard
      title="活跃检查"
      value={activeChecks}
      description={`总共 ${totalChecks} 项检查`}
      status={status}
      icon={<Activity className="h-4 w-4" />}
      progress={progress}
      progressLabel="活跃度"
      metadata={{
        总计: totalChecks,
        剩余: totalChecks - activeChecks,
      }}
      className={className}
    />
  );
}

export default MetricsCard;