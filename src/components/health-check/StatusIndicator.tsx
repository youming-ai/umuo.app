import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckStatus, SeverityLevel } from '@/lib/health-check/types';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  HelpCircle,
  Loader2,
} from 'lucide-react';

interface StatusIndicatorProps {
  status: CheckStatus;
  severity?: SeverityLevel;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

const statusConfig = {
  [CheckStatus.PASSED]: {
    label: '通过',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
  },
  [CheckStatus.FAILED]: {
    label: '失败',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
  },
  [CheckStatus.WARNING]: {
    label: '警告',
    variant: 'secondary' as const,
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
  },
  [CheckStatus.PENDING]: {
    label: '等待',
    variant: 'outline' as const,
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  [CheckStatus.RUNNING]: {
    label: '运行中',
    variant: 'outline' as const,
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
  },
  [CheckStatus.SKIPPED]: {
    label: '跳过',
    variant: 'outline' as const,
    icon: HelpCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};

const severityConfig = {
  [SeverityLevel.LOW]: {
    label: '低',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  [SeverityLevel.MEDIUM]: {
    label: '中',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  [SeverityLevel.HIGH]: {
    label: '高',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  [SeverityLevel.CRITICAL]: {
    label: '严重',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

const sizeConfig = {
  sm: {
    iconSize: 'h-3 w-3',
    textClass: 'text-xs',
    paddingClass: 'px-2 py-1',
    gap: 'gap-1',
  },
  md: {
    iconSize: 'h-4 w-4',
    textClass: 'text-sm',
    paddingClass: 'px-3 py-1.5',
    gap: 'gap-2',
  },
  lg: {
    iconSize: 'h-5 w-5',
    textClass: 'text-base',
    paddingClass: 'px-4 py-2',
    gap: 'gap-2',
  },
};

export function StatusIndicator({
  status,
  severity,
  showText = true,
  size = 'md',
  className,
  animated = false,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const currentSizeConfig = sizeConfig[size];
  const Icon = config.icon;

  const baseClasses = cn(
    'inline-flex items-center font-medium rounded-full border transition-all duration-200',
    currentSizeConfig.paddingClass,
    currentSizeConfig.gap,
    config.bgColor,
    config.borderColor,
    config.color,
    className
  );

  const iconClasses = cn(
    currentSizeConfig.iconSize,
    animated && status === CheckStatus.RUNNING && 'animate-spin'
  );

  if (!showText) {
    return (
      <div className={cn(baseClasses, 'justify-center')}>
        <Icon className={iconClasses} />
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      <Icon className={iconClasses} />
      <span className={currentSizeConfig.textClass}>{config.label}</span>
      {severity && status === CheckStatus.FAILED && (
        <Badge
          variant="outline"
          className={cn(
            'ml-1 text-xs',
            severityConfig[severity].bgColor,
            severityConfig[severity].color,
            severityConfig[severity].borderColor
          )}
        >
          {severityConfig[severity].label}
        </Badge>
      )}
    </div>
  );
}

// Enhanced version for more detailed status display
export function DetailedStatusIndicator({
  status,
  severity,
  showText = true,
  size = 'md',
  className,
  animated = false,
  message,
  timestamp,
}: StatusIndicatorProps & {
  message?: string;
  timestamp?: Date;
}) {
  const config = statusConfig[status];
  const currentSizeConfig = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <StatusIndicator
          status={status}
          severity={severity}
          showText={showText}
          size={size}
          animated={animated}
        />
        {timestamp && (
          <span className={cn('text-xs text-gray-500', currentSizeConfig.textClass)}>
            {timestamp.toLocaleTimeString()}
          </span>
        )}
      </div>
      {message && (
        <p className={cn('text-sm text-gray-600 ml-1', currentSizeConfig.textClass)}>
          {message}
        </p>
      )}
    </div>
  );
}

// Compact version for tight spaces
export function CompactStatusIndicator({
  status,
  severity,
  size = 'sm',
  className,
}: Omit<StatusIndicatorProps, 'showText' | 'animated'>) {
  const config = statusConfig[status];
  const currentSizeConfig = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        currentSizeConfig.iconSize,
        config.bgColor,
        config.color,
        className
      )}
      title={config.label}
    >
      <Icon className={currentSizeConfig.iconSize} />
    </div>
  );
}

// Status timeline component
interface StatusTimelineItem {
  status: CheckStatus;
  timestamp: Date;
  label?: string;
  message?: string;
}

interface StatusTimelineProps {
  items: StatusTimelineItem[];
  className?: string;
}

export function StatusTimeline({ items, className }: StatusTimelineProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <CompactStatusIndicator status={item.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {item.label || statusConfig[item.status].label}
              </p>
              <span className="text-xs text-gray-500">
                {item.timestamp.toLocaleTimeString()}
              </span>
            </div>
            {item.message && (
              <p className="text-sm text-gray-600 mt-1">{item.message}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Status progress indicator
interface StatusProgressProps {
  steps: Array<{
    status: CheckStatus;
    label: string;
    completed?: boolean;
  }>;
  currentStep: number;
  className?: string;
}

export function StatusProgress({ steps, currentStep, className }: StatusProgressProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                index < currentStep
                  ? 'bg-green-100 text-green-600 border-2 border-green-200'
                  : index === currentStep
                  ? 'bg-blue-100 text-blue-600 border-2 border-blue-200'
                  : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
              )}
            >
              {index < currentStep ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p
              className={cn(
                'text-sm font-medium',
                index <= currentStep ? 'text-gray-900' : 'text-gray-400'
              )}
            >
              {step.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatusIndicator;