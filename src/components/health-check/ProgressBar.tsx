import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckStatus } from '@/lib/health-check/types';
import {
  CheckCircle,
  Clock,
  Loader2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  description?: string;
  status?: CheckStatus;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  colorVariant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
  showSteps?: boolean;
  steps?: Array<{
    label: string;
    completed: boolean;
    current?: boolean;
  }>;
}

const statusConfig = {
  [CheckStatus.PASSED]: {
    color: 'bg-green-500',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: CheckCircle,
  },
  [CheckStatus.FAILED]: {
    color: 'bg-red-500',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: XCircle,
  },
  [CheckStatus.WARNING]: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    icon: AlertTriangle,
  },
  [CheckStatus.RUNNING]: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: Loader2,
  },
  [CheckStatus.PENDING]: {
    color: 'bg-gray-500',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: Clock,
  },
  [CheckStatus.SKIPPED]: {
    color: 'bg-gray-400',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    icon: Clock,
  },
};

const sizeConfig = {
  sm: {
    height: 'h-1',
    textClass: 'text-xs',
    iconSize: 'h-3 w-3',
  },
  md: {
    height: 'h-2',
    textClass: 'text-sm',
    iconSize: 'h-4 w-4',
  },
  lg: {
    height: 'h-3',
    textClass: 'text-base',
    iconSize: 'h-5 w-5',
  },
};

const colorVariantConfig = {
  default: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

export function ProgressBar({
  value,
  max = 100,
  label,
  description,
  status,
  showPercentage = true,
  size = 'md',
  className,
  colorVariant = 'default',
  animated = true,
  showSteps = false,
  steps,
}: ProgressBarProps) {
  const sizeStyle = sizeConfig[size];
  const statusStyle = status ? statusConfig[status] : null;
  const colorClass = statusStyle ? statusStyle.color : colorVariantConfig[colorVariant];
  const percentage = Math.round((value / max) * 100);

  const StatusIcon = statusStyle?.icon;

  return (
    <div className={cn('space-y-2', className)}>
      {(label || description || showPercentage) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {status && StatusIcon && (
              <StatusIcon
                className={cn(
                  sizeStyle.iconSize,
                  animated && status === CheckStatus.RUNNING && 'animate-spin',
                  statusStyle?.textColor
                )}
              />
            )}
            {label && (
              <span className={cn('font-medium', sizeStyle.textClass)}>
                {label}
              </span>
            )}
          </div>
          {showPercentage && (
            <span className={cn('font-medium', sizeStyle.textClass)}>
              {percentage}%
            </span>
          )}
        </div>
      )}

      <div className="relative">
        <div className={cn(
          'relative w-full overflow-hidden rounded-full bg-primary/20',
          sizeStyle.height,
          animated && 'transition-all duration-300 ease-in-out'
        )}>
          <div
            className={cn(
              'h-full bg-primary transition-all',
              colorClass
            )}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </div>

        {showSteps && steps && steps.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-between px-1">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  'w-3 h-3 rounded-full border-2 bg-white transition-all duration-200',
                  step.completed
                    ? 'border-green-500 bg-green-500'
                    : step.current
                    ? 'border-blue-500 bg-blue-500 animate-pulse'
                    : 'border-gray-300 bg-gray-200'
                )}
                title={step.label}
              />
            ))}
          </div>
        )}
      </div>

      {description && (
        <p className={cn('text-gray-600', sizeStyle.textClass)}>
          {description}
        </p>
      )}

      {showSteps && steps && (
        <div className="flex flex-wrap gap-2 mt-3">
          {steps.map((step, index) => (
            <Badge
              key={index}
              variant={step.completed ? 'default' : step.current ? 'secondary' : 'outline'}
              className={cn(
                'text-xs',
                step.completed && 'bg-green-100 text-green-700 border-green-200',
                step.current && 'bg-blue-100 text-blue-700 border-blue-200'
              )}
            >
              {step.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Advanced progress bar with stages
interface StageProgressProps {
  stages: Array<{
    name: string;
    status: CheckStatus;
    progress?: number;
    startTime?: Date;
    endTime?: Date;
    error?: string;
  }>;
  currentStage: number;
  className?: string;
}

export function StageProgress({
  stages,
  currentStage,
  className,
}: StageProgressProps) {
  const completedStages = stages.filter(
    (stage, index) => index < currentStage && stage.status === CheckStatus.PASSED
  ).length;

  const overallProgress = (completedStages / stages.length) * 100;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall progress */}
      <ProgressBar
        value={overallProgress}
        label="总体进度"
        description={`${completedStages} / ${stages.length} 阶段完成`}
        size="md"
        showPercentage
      />

      {/* Individual stages */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const isActive = index === currentStage;
          const isCompleted = index < currentStage;
          const currentStatusConfig = stage.status ? statusConfig[stage.status] : null;
          const StatusIcon = currentStatusConfig?.icon;

          return (
            <div
              key={index}
              className={cn(
                'flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200',
                isActive && 'border-blue-200 bg-blue-50',
                isCompleted && stage.status === CheckStatus.PASSED && 'border-green-200 bg-green-50',
                stage.status === CheckStatus.FAILED && 'border-red-200 bg-red-50'
              )}
            >
              <div className="flex-shrink-0">
                {StatusIcon && (
                  <StatusIcon
                    className={cn(
                      'h-5 w-5',
                      isActive && stage.status === CheckStatus.RUNNING && 'animate-spin',
                      currentStatusConfig?.textColor
                    )}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {stage.name}
                  </p>
                  <span className={cn('text-xs', currentStatusConfig?.textColor)}>
                    {stage.progress !== undefined ? `${stage.progress}%` : ''}
                  </span>
                </div>

                {stage.error && (
                  <p className="text-xs text-red-600 mt-1">{stage.error}</p>
                )}

                {stage.startTime && (
                  <p className="text-xs text-gray-500 mt-1">
                    {stage.endTime
                      ? `完成于 ${stage.endTime.toLocaleTimeString()}`
                      : `开始于 ${stage.startTime.toLocaleTimeString()}`}
                  </p>
                )}
              </div>

              {stage.progress !== undefined && (
                <div className="flex-shrink-0 w-16">
                  <ProgressBar
                    value={stage.progress}
                    size="sm"
                    showPercentage={false}
                    colorVariant={
                      stage.status === CheckStatus.FAILED
                        ? 'error'
                        : stage.status === CheckStatus.WARNING
                        ? 'warning'
                        : stage.status === CheckStatus.PASSED
                        ? 'success'
                        : 'default'
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Circular progress indicator
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  description?: string;
  status?: CheckStatus;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  label,
  description,
  status,
  className,
}: CircularProgressProps) {
  const percentage = Math.round((value / max) * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const statusStyle = status ? statusConfig[status] : null;
  const strokeColor = statusStyle ? statusStyle.color.replace('bg-', 'stroke-') : 'stroke-blue-500';

  return (
    <div className={cn('flex flex-col items-center space-y-2', className)}>
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />

          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              'transition-all duration-300 ease-in-out',
              strokeColor
            )}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{percentage}%</span>
        </div>
      </div>

      {label && (
        <p className="text-sm font-medium text-gray-900">{label}</p>
      )}

      {description && (
        <p className="text-xs text-gray-600 text-center">{description}</p>
      )}
    </div>
  );
}

export default ProgressBar;