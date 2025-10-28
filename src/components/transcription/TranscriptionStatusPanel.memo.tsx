import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTranscriptionStore } from "@/lib/transcription/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  FileAudio,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  X,
  RotateCcw,
} from "lucide-react";
import type { TranscriptionTask } from "@/types/transcription";

// 状态配置
const statusConfig = {
  idle: {
    label: "等待中",
    description: "等待开始转录",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    color: "text-gray-600 dark:text-gray-400",
    icon: Clock,
  },
  queued: {
    label: "已排队",
    description: "任务已加入队列",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    color: "text-blue-600 dark:text-blue-400",
    icon: Clock,
  },
  processing: {
    label: "转录中",
    description: "正在处理音频",
    bgColor: "bg-amber-100 dark:bg-amber-900/20",
    color: "text-amber-600 dark:text-amber-400",
    icon: FileAudio,
  },
  completed: {
    label: "完成",
    description: "转录成功完成",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    color: "text-green-600 dark:text-green-400",
    icon: CheckCircle,
  },
  failed: {
    label: "失败",
    description: "转录失败，请重试",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    color: "text-red-600 dark:text-red-400",
    icon: XCircle,
  },
  cancelled: {
    label: "已取消",
    description: "转录任务已取消",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    color: "text-gray-600 dark:text-gray-400",
    icon: XCircle,
  },
  paused: {
    label: "暂停中",
    description: "转录任务已暂停",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    color: "text-yellow-600 dark:text-yellow-400",
    icon: PauseCircle,
  },
};

// 优先级配置
const priorityConfig = {
  low: { label: "低", color: "bg-gray-100 text-gray-800 border-gray-300" },
  normal: { label: "正常", color: "bg-blue-100 text-blue-800 border-blue-300" },
  high: { label: "高", color: "bg-orange-100 text-orange-800 border-orange-300" },
  urgent: { label: "紧急", color: "bg-red-100 text-red-800 border-red-300" },
};

// 计算属性
interface TaskComputedProps {
  status: keyof typeof statusConfig;
  config: (typeof statusConfig)[keyof typeof statusConfig];
  progress: number;
  estimatedTime: number | null;
  showProgress: boolean;
  priorityConfig: (typeof priorityConfig)[keyof typeof priorityConfig];
  progressColor: string;
}

function computeTaskProps(task: TranscriptionTask): TaskComputedProps {
  const status = task.status as keyof typeof statusConfig;
  const config = statusConfig[status];
  const progress = task.progress.progress;
  const estimatedTime =
    task.progress.estimatedDuration && progress > 0
      ? Math.ceil(task.progress.estimatedDuration * (1 - progress / 100))
      : null;
  const showProgress = status === "processing" || status === "paused";
  const priorityConfigItem = priorityConfig[task.priority];
  const progressColor =
    progress < 30 ? "bg-red-500" : progress < 70 ? "bg-yellow-500" : "bg-green-500";

  return {
    status,
    config,
    progress,
    estimatedTime,
    showProgress,
    priorityConfig: priorityConfigItem,
    progressColor,
  };
}

// 自定义比较函数
const arePropsEqual = (
  prevProps: TranscriptionStatusPanelProps,
  nextProps: TranscriptionStatusPanelProps,
) => {
  // 基础props比较
  if (prevProps.task?.id !== nextProps.task?.id) return false;
  if (prevProps.compact !== nextProps.compact) return false;
  if (prevProps.showDetails !== nextProps.showDetails) return false;

  // 如果没有task，视为相等
  if (!prevProps.task && !nextProps.task) return true;
  if (!prevProps.task || !nextProps.task) return false;

  // 关键状态比较
  const prev = prevProps.task;
  const next = nextProps.task;

  return (
    prev.status === next.status &&
    prev.progress.progress === next.progress.progress &&
    prev.priority === next.priority &&
    prev.fileName === next.fileName &&
    prev.progress.message === next.progress.message
  );
};

// 操作按钮props
interface ActionButtonsProps {
  task: TranscriptionTask;
  compact: boolean;
  onRetry: () => void;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
}

const ActionButtons = React.memo<ActionButtonsProps>(
  ({ task, compact, onRetry, onCancel, onPause, onResume }) => {
    if (compact && task.status === "failed") {
      return (
        <Button variant="outline" size="sm" onClick={onRetry} className="text-xs h-7 px-2">
          <RotateCcw className="h-3 w-3 mr-1" />
          重试
        </Button>
      );
    }

    if (compact) return null;

    return (
      <div className="flex gap-2 mt-3">
        {task.status === "failed" && (
          <Button variant="outline" size="sm" onClick={onRetry} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            重试转录
          </Button>
        )}
        {(task.status === "processing" || task.status === "queued") && (
          <>
            <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            {task.status === "processing" && (
              <Button variant="outline" size="sm" onClick={onPause}>
                <PauseCircle className="h-4 w-4 mr-2" />
                暂停
              </Button>
            )}
          </>
        )}
        {task.status === "paused" && (
          <>
            <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button variant="outline" size="sm" onClick={onResume}>
              <PlayCircle className="h-4 w-4 mr-2" />
              继续
            </Button>
          </>
        )}
      </div>
    );
  },
);

// 状态面板props
interface TranscriptionStatusPanelProps {
  task: TranscriptionTask | null;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
  // 事件处理函数
  onRetry?: () => void;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

// 主要组件
const TranscriptionStatusPanelCore: React.FC<TranscriptionStatusPanelProps> = ({
  task,
  className,
  showDetails = true,
  compact = false,
  onRetry,
  onCancel,
  onPause,
  onResume,
}) => {
  // 从store获取处理状态
  const { pauseTask, resumeTask, cancelTask, retryTask } = useTranscriptionStore();

  // 计算属性 - 使用memo避免重复计算
  const taskProps = useMemo(() => {
    if (!task) return null;
    return computeTaskProps(task);
  }, [task]);

  if (!task || !taskProps) {
    return null;
  }

  const { status, config, progress, estimatedTime, showProgress, priorityConfig, progressColor } =
    taskProps;

  // 处理事件
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      retryTask(task.id);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      cancelTask(task.id);
    }
  };

  const handlePause = () => {
    if (onPause) {
      onPause();
    } else {
      pauseTask(task.id);
    }
  };

  const handleResume = () => {
    if (onResume) {
      onResume();
    } else {
      resumeTask(task.id);
    }
  };

  // Icon组件
  const Icon = config.icon;

  return (
    <Card
      className={cn("border rounded-lg p-4 space-y-4", className)}
      role="status"
      aria-label={`转录状态: ${config.label}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (status === "failed") {
            handleRetry();
          }
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", config.bgColor)} aria-hidden="true">
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <CardTitle className="font-semibold">{config.label}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
            </div>
          </div>
          {!compact && (
            <Badge
              variant="secondary"
              className={cn(priorityConfig.color, "border-current")}
              aria-label={`优先级: ${task.priority}`}
            >
              {priorityConfig.label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* 进度条 */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>转录进度</span>
              <span>{progress}%</span>
            </div>
            <Progress
              value={progress}
              className="h-2"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`转录进度: ${progress}%`}
            >
              <div
                className={cn("h-full transition-all duration-300", progressColor)}
                style={{ width: `${progress}%` }}
              />
            </Progress>
            {task.progress.message && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{task.progress.message}</p>
            )}
          </div>
        )}

        {/* 文件信息 */}
        {showDetails && !compact && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">文件名</p>
              <p className="font-medium truncate" title={task.fileName}>
                {task.fileName}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">文件大小</p>
              <p className="font-medium">{(task.fileSize / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {task.duration && (
              <div>
                <p className="text-gray-500 dark:text-gray-400">时长</p>
                <p className="font-medium">{task.duration.toFixed(0)} 秒</p>
              </div>
            )}
            {estimatedTime !== null && (
              <div>
                <p className="text-gray-500 dark:text-gray-400">预计剩余</p>
                <p className="font-medium">
                  {estimatedTime < 60
                    ? `${estimatedTime} 秒`
                    : `${Math.ceil(estimatedTime / 60)} 分钟`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <ActionButtons
          task={task}
          compact={compact}
          onRetry={handleRetry}
          onCancel={handleCancel}
          onPause={handlePause}
          onResume={handleResume}
        />
      </CardContent>
    </Card>
  );
};

// 导出memo化的组件
export const TranscriptionStatusPanel = React.memo(TranscriptionStatusPanelCore, arePropsEqual);

// 默认导出
export default TranscriptionStatusPanel;
