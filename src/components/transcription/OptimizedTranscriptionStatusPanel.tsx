/**
 * 优化的转录状态面板组件
 * 使用 React.memo 和自定义比较函数来优化性能
 */

import React, { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TranscriptionTask } from "@/types/transcription";

interface OptimizedTranscriptionStatusPanelProps {
  task: TranscriptionTask | null;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

// 状态配置映射
const STATUS_CONFIG = {
  idle: {
    icon: "⏸️",
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    label: "空闲",
    description: "等待开始",
  },
  queued: {
    icon: "⏳",
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    label: "排队中",
    description: "等待处理",
  },
  processing: {
    icon: "🔄",
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    label: "处理中",
    description: "正在转录",
  },
  completed: {
    icon: "✅",
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    label: "已完成",
    description: "转录成功",
  },
  failed: {
    icon: "❌",
    color: "text-red-500",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    label: "失败",
    description: "转录失败",
  },
  cancelled: {
    icon: "🚫",
    color: "text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    label: "已取消",
    description: "用户取消",
  },
  paused: {
    icon: "⏸️",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    label: "已暂停",
    description: "处理暂停",
  },
} as const;

// 优先级配置
const PRIORITY_CONFIG = {
  low: { label: "低", color: "bg-gray-500" },
  normal: { label: "正常", color: "bg-blue-500" },
  high: { label: "高", color: "bg-orange-500" },
  urgent: { label: "紧急", color: "bg-red-500" },
} as const;

// 文件大小格式化
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// 时间格式化
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// 按钮组件 - 使用 memo 优化
const ActionButton = React.memo<{
  onClick: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
}>(({ onClick, variant = "default", size = "sm", disabled = false, children }) => (
  <Button
    onClick={onClick}
    variant={variant}
    size={size}
    disabled={disabled}
    className="h-8 px-3 text-xs"
  >
    {children}
  </Button>
));

ActionButton.displayName = "ActionButton";

// 主要组件 - 使用 React.memo 和自定义比较函数
const OptimizedTranscriptionStatusPanel = React.memo<OptimizedTranscriptionStatusPanelProps>(
  ({
    task,
    className,
    showDetails = true,
    compact = false,
    onPause,
    onResume,
    onCancel,
    onRetry,
  }) => {
    // 使用 useMemo 缓存计算结果
    const taskData = useMemo(() => {
      if (!task) return null;

      return {
        id: task.id,
        status: task.status,
        priority: task.priority,
        progress: task.progress.progress,
        fileName: task.fileName,
        fileSize: task.fileSize,
        duration: task.duration,
        message: task.progress.message,
        error: task.progress.error,
        createdAt: task.progress.createdAt,
        startedAt: task.progress.startedAt,
        completedAt: task.progress.completedAt,
      };
    }, [task]);

    // 缓存状态配置
    const statusConfig = useMemo(() => {
      return taskData ? STATUS_CONFIG[taskData.status] : STATUS_CONFIG.idle;
    }, [taskData?.status]);

    // 缓存优先级配置
    const priorityConfig = useMemo(() => {
      return taskData ? PRIORITY_CONFIG[taskData.priority] : PRIORITY_CONFIG.normal;
    }, [taskData?.priority]);

    // 缓存时间计算
    const timeInfo = useMemo(() => {
      if (!taskData) return null;

      const now = new Date();
      const created = new Date(taskData.createdAt);
      const started = taskData.startedAt ? new Date(taskData.startedAt) : null;
      const completed = taskData.completedAt ? new Date(taskData.completedAt) : null;

      return {
        timeSinceCreated: Math.floor((now.getTime() - created.getTime()) / 1000),
        timeSinceStarted: started ? Math.floor((now.getTime() - started.getTime()) / 1000) : null,
        timeSinceCompleted: completed
          ? Math.floor((now.getTime() - completed.getTime()) / 1000)
          : null,
      };
    }, [taskData?.createdAt, taskData?.startedAt, taskData?.completedAt]);

    // 缓存按钮操作
    const handlePause = useCallback(() => {
      onPause?.();
    }, [onPause]);

    const handleResume = useCallback(() => {
      onResume?.();
    }, [onResume]);

    const handleCancel = useCallback(() => {
      onCancel?.();
    }, [onCancel]);

    const handleRetry = useCallback(() => {
      onRetry?.();
    }, [onRetry]);

    // 缓存渲染的动作按钮
    const actionButtons = useMemo(() => {
      if (!taskData) return null;

      const buttons = [];

      switch (taskData.status) {
        case "processing":
          buttons.push(
            <ActionButton key="pause" onClick={handlePause} variant="outline">
              暂停
            </ActionButton>,
            <ActionButton key="cancel" onClick={handleCancel} variant="destructive">
              取消
            </ActionButton>,
          );
          break;

        case "paused":
          buttons.push(
            <ActionButton key="resume" onClick={handleResume} variant="default">
              继续
            </ActionButton>,
            <ActionButton key="cancel" onClick={handleCancel} variant="destructive">
              取消
            </ActionButton>,
          );
          break;

        case "failed":
          buttons.push(
            <ActionButton key="retry" onClick={handleRetry} variant="default">
              重试
            </ActionButton>,
          );
          break;

        case "queued":
          buttons.push(
            <ActionButton key="cancel" onClick={handleCancel} variant="destructive">
              取消
            </ActionButton>,
          );
          break;

        default:
          break;
      }

      return buttons;
    }, [taskData?.status, handlePause, handleResume, handleCancel, handleRetry]);

    // 如果没有任务，显示空状态
    if (!taskData) {
      return (
        <div className={cn("border rounded-lg p-4 text-center text-gray-500", className)}>
          <div className="text-4xl mb-2">📝</div>
          <div className="font-medium">无转录任务</div>
          <div className="text-sm mt-1">等待文件上传</div>
        </div>
      );
    }

    return (
      <div
        className={cn("border rounded-lg p-4 space-y-4 transition-all duration-200", className)}
        role="status"
        aria-label={`转录状态: ${statusConfig.label}`}
      >
        {/* 状态头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", statusConfig.bgColor)}>
              <span className="text-2xl" aria-hidden="true">
                {statusConfig.icon}
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{statusConfig.label}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{statusConfig.description}</p>
            </div>
          </div>

          {!compact && (
            <Badge
              variant="secondary"
              className={cn("border-current", statusConfig.color)}
              aria-label={`优先级: ${priorityConfig.label}`}
            >
              {priorityConfig.label}
            </Badge>
          )}
        </div>

        {/* 进度条 */}
        {(taskData.status === "processing" || taskData.status === "paused") && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>转录进度</span>
              <span>{taskData.progress}%</span>
            </div>
            <Progress
              value={taskData.progress}
              className="h-2"
              aria-valuenow={taskData.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`转录进度: ${taskData.progress}%`}
            />
            {taskData.message && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{taskData.message}</p>
            )}
          </div>
        )}

        {/* 详细信息 */}
        {showDetails && !compact && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">文件名:</span>
                <div className="text-gray-600 dark:text-gray-400 truncate">{taskData.fileName}</div>
              </div>
              <div>
                <span className="font-medium">文件大小:</span>
                <div className="text-gray-600 dark:text-gray-400">
                  {formatFileSize(taskData.fileSize)}
                </div>
              </div>
              {taskData.duration && (
                <div>
                  <span className="font-medium">音频时长:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {formatDuration(taskData.duration)}
                  </div>
                </div>
              )}
              {timeInfo && (
                <div>
                  <span className="font-medium">
                    {taskData.status === "completed" ? "完成时间:" : "已等待:"}
                  </span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {formatDuration(
                      taskData.status === "completed" && timeInfo.timeSinceCompleted
                        ? timeInfo.timeSinceCompleted
                        : timeInfo.timeSinceCreated,
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {taskData.status === "failed" && taskData.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-1">
              <span>⚠️</span>
              <span className="font-medium">错误信息</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{taskData.error}</p>
          </div>
        )}

        {/* 操作按钮 */}
        {actionButtons && actionButtons.length > 0 && (
          <div className="flex gap-2 justify-end">{actionButtons}</div>
        )}
      </div>
    );
  },
  // 自定义比较函数 - 只有相关属性变化时才重新渲染
  (prevProps, nextProps) => {
    // 如果任务引用相同，不重新渲染
    if (prevProps.task === nextProps.task) {
      return (
        prevProps.className === nextProps.className &&
        prevProps.showDetails === nextProps.showDetails &&
        prevProps.compact === nextProps.compact
      );
    }

    // 如果没有任务，都为空则不重新渲染
    if (!prevProps.task && !nextProps.task) {
      return (
        prevProps.className === nextProps.className &&
        prevProps.showDetails === nextProps.showDetails &&
        prevProps.compact === nextProps.compact
      );
    }

    // 如果一个有任务一个没有，需要重新渲染
    if (!prevProps.task || !nextProps.task) {
      return false;
    }

    // 比较关键属性
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.status === nextProps.task.status &&
      prevProps.task.progress.progress === nextProps.task.progress.progress &&
      prevProps.task.priority === nextProps.task.priority &&
      prevProps.task.progress.message === nextProps.task.progress.message &&
      prevProps.task.progress.error === nextProps.task.progress.error &&
      prevProps.className === nextProps.className &&
      prevProps.showDetails === nextProps.showDetails &&
      prevProps.compact === nextProps.compact
    );
  },
);

OptimizedTranscriptionStatusPanel.displayName = "OptimizedTranscriptionStatusPanel";

export default OptimizedTranscriptionStatusPanel;
