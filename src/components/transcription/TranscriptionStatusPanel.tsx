/**
 * 转录状态面板组件
 * 显示转录任务的详细状态和进度
 */

"use client";

import React, { useMemo } from "react";
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  X,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  TranscriptionTask,
  TranscriptionStatus,
} from "@/types/transcription";

interface TranscriptionStatusPanelProps {
  task: TranscriptionTask | null;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
  onStartTranscription?: () => Promise<void>;
  onCancelTranscription?: () => boolean;
  onPauseTranscription?: () => boolean;
  onResumeTranscription?: () => boolean;
  onRetryTranscription?: () => Promise<boolean>;
}

// 状态映射
const statusConfig = {
  idle: {
    icon: Clock,
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    label: "等待中",
    description: "等待开始转录",
  },
  queued: {
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    label: "排队中",
    description: "在队列中等待处理",
  },
  processing: {
    icon: Loader2,
    color: "text-primary",
    bgColor: "bg-primary/10",
    label: "转录中",
    description: "正在进行转录",
  },
  completed: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900",
    label: "已完成",
    description: "转录已完成",
  },
  failed: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-100 dark:bg-red-900",
    label: "失败",
    description: "转录失败",
  },
  cancelled: {
    icon: X,
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    label: "已取消",
    description: "用户取消",
  },
  paused: {
    icon: Pause,
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900",
    label: "已暂停",
    description: "转录已暂停",
  },
};

export function TranscriptionStatusPanel({
  task,
  className,
  showDetails = true,
  compact = false,
  onStartTranscription,
  onCancelTranscription,
  onPauseTranscription,
  onResumeTranscription,
  onRetryTranscription,
}: TranscriptionStatusPanelProps) {
  if (!task) {
    return (
      <div className={cn("p-4 text-center text-gray-500", className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">尚未开始转录</p>
        {onStartTranscription && (
          <Button
            size="sm"
            className="mt-2"
            onClick={() => onStartTranscription()}
          >
            开始转录
          </Button>
        )}
      </div>
    );
  }

  const status = task.status;
  const config = statusConfig[status];
  const Icon = config.icon;

  // 格式化时间
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // 计算预估时间
  const estimatedTime = useMemo(() => {
    if (task.progress.estimatedDuration && task.progress.progress > 0) {
      const remaining =
        task.progress.estimatedDuration * (1 - task.progress.progress / 100);
      return Math.ceil(remaining);
    }
    return null;
  }, [task.progress]);

  // 操作按钮
  const renderActions = () => {
    if (compact) return null;

    switch (status) {
      case "idle":
      case "queued":
        return (
          <div className="flex gap-2">
            {onCancelTranscription && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancelTranscription()}
              >
                <X className="h-4 w-4" />
                取消
              </Button>
            )}
          </div>
        );

      case "processing":
        return (
          <div className="flex gap-2">
            {onPauseTranscription && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPauseTranscription()}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>暂停转录</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onCancelTranscription && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancelTranscription()}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>取消转录</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );

      case "paused":
        return (
          <div className="flex gap-2">
            {onResumeTranscription && (
              <Button size="sm" onClick={() => onResumeTranscription()}>
                <Play className="h-4 w-4 mr-1" />
                恢复
              </Button>
            )}
            {onCancelTranscription && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancelTranscription()}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );

      case "failed":
        return (
          <div className="flex gap-2">
            {onRetryTranscription && (
              <Button size="sm" onClick={() => onRetryTranscription()}>
                <RotateCcw className="h-4 w-4 mr-1" />
                重试
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("border rounded-lg p-4 space-y-4", className)}>
      {/* 状态头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          <div>
            <h3 className="font-semibold">{config.label}</h3>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
        </div>

        {!compact && (
          <Badge
            variant="secondary"
            className={cn(config.color, "border-current")}
          >
            {task.priority.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* 进度条 */}
      {(status === "processing" || status === "paused") && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>转录进度</span>
            <span>{task.progress.progress}%</span>
          </div>
          <Progress value={task.progress.progress} className="h-2" />
          {task.progress.message && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {task.progress.message}
            </p>
          )}
        </div>
      )}

      {/* 详细信息 */}
      {showDetails && !compact && (
        <div className="space-y-3 border-t pt-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">文件名</p>
              <p className="font-medium truncate">{task.fileName}</p>
            </div>
            <div>
              <p className="text-gray-500">文件大小</p>
              <p className="font-medium">{formatFileSize(task.fileSize)}</p>
            </div>
            {task.duration && (
              <div>
                <p className="text-gray-500">音频时长</p>
                <p className="font-medium">{formatDuration(task.duration)}</p>
              </div>
            )}
            {task.progress.actualDuration && (
              <div>
                <p className="text-gray-500">处理时间</p>
                <p className="font-medium">
                  {formatDuration(task.progress.actualDuration)}
                </p>
              </div>
            )}
          </div>

          {/* 错误信息 */}
          {status === "failed" && task.progress.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                错误: {task.progress.error}
              </p>
            </div>
          )}

          {/* 结果信息 */}
          {status === "completed" && task.progress.result && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <p>转录成功完成</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">文本长度:</span>
                    <span className="ml-1">
                      {task.progress.result.text.length} 字符
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">片段数量:</span>
                    <span className="ml-1">
                      {task.progress.result.segmentsCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 预估时间 */}
          {estimatedTime && estimatedTime > 0 && status === "processing" && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>预计还需 {formatDuration(estimatedTime)}</span>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      {renderActions()}
    </div>
  );
}

/**
 * 紧凑版转录状态指示器
 */
export function TranscriptionStatusIndicator({
  task,
  className,
}: {
  task: TranscriptionTask | null;
  className?: string;
}) {
  if (!task) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-gray-500",
          className,
        )}
      >
        <Clock className="h-4 w-4" />
        <span>未转录</span>
      </div>
    );
  }

  const config = statusConfig[task.status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon
        className={cn(
          "h-4 w-4",
          config.color,
          task.status === "processing" && "animate-spin",
        )}
      />
      <span className="text-sm">{config.label}</span>
      {task.status === "processing" && (
        <span className="text-xs text-gray-500">
          ({task.progress.progress}%)
        </span>
      )}
    </div>
  );
}

/**
 * 转录进度条组件
 */
export function TranscriptionProgressBar({
  task,
  className,
}: {
  task: TranscriptionTask | null;
  className?: string;
}) {
  if (!task || (task.status !== "processing" && task.status !== "paused")) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">转录进度</span>
        <span className="font-medium">{task.progress.progress}%</span>
      </div>
      <Progress value={task.progress.progress} className="h-2" />
      {task.progress.message && (
        <p className="text-xs text-gray-500">{task.progress.message}</p>
      )}
    </div>
  );
}
