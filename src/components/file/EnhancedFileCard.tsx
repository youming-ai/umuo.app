/**
 * 增强的文件卡片组件
 * 集成新的转录状态管理系统
 */

'use client';

import React from 'react';
import {
  Music,
  Play,
  Pause,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MoreVertical,
  Trash2,
  Settings
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { formatDistanceToNow } from 'date-fns/locale/zh-CN';
import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { TranscriptionStatusPanel, TranscriptionStatusIndicator } from '@/components/transcription/TranscriptionStatusPanel';
import { useTranscriptionStatus } from '@/hooks/player/usePlayerDataNew';
import type { FileRow } from '@/types/db/database';
import type { TranscriptionTask } from '@/types/transcription';

interface EnhancedFileCardProps {
  file: FileRow;
  onPlay: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  isPlaying?: boolean;
  isCurrentFile?: boolean;
  className?: string;
}

// 格式化时间
function formatDuration(seconds?: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 格式化文件大小
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// 格式化时间
function formatTime(date?: Date): string {
  if (!date) return '';
  return formatDistance(date, new Date(), {
    addSuffix: true,
    locale: zh-CN
  });
}

/**
 * 增强的文件卡片组件
 */
export default function EnhancedFileCard({
  file,
  onPlay,
  onDelete,
  isPlaying = false,
  isCurrentFile = false,
  className,
}: EnhancedFileCardProps) {
  // 获取转录状态
  const { task, status } = useTranscriptionStatus(file.id!);
  const [showTranscriptionDetails, setShowTranscriptionDetails] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  // 计算状态样式
  const getStatusStyles = () => {
    switch (status) {
      case 'idle':
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          text: 'text-gray-600 dark:text-gray-400',
          icon: Clock,
          label: '等待转录',
        };
      case 'queued':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-700',
          text: 'text-blue-600 dark:text-blue-400',
          icon: Loader2,
          label: '排队中',
          animate: 'animate-pulse',
        };
      case 'processing':
      case 'paused':
        return {
          bg: 'bg-primary/10 dark:bg-primary/20',
          border: 'border-primary/20 dark:border-primary/40',
          text: 'text-primary',
          icon: Loader2,
          label: '转录中',
          animate: 'animate-pulse',
        };
      case 'completed':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-700',
          text: 'text-green-600 dark:text-green-400',
          icon: CheckCircle,
          label: '转录完成',
        };
      case 'failed':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-700',
          text: 'text-red-600 dark:text-red-400',
          icon: XCircle,
          label: '转录失败',
        };
      case 'cancelled':
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          text: 'text-gray-600 dark:text-gray-400',
          icon: Clock,
          label: '已取消',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          text: 'text-gray-600 dark:text-gray-400',
          icon: Clock,
          label: '就绪',
        };
    }
  };

  const statusStyles = getStatusStyles();
  const Icon = statusStyles.icon;

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        isCurrentFile && 'ring-2 ring-primary',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        {/* 文件基本信息 */}
        <div className="flex items-start justify-between w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className={cn('p-2 rounded-lg', statusStyles.bg)}>
                <Icon
                  className={cn('h-5 w-5', statusStyles.text, statusStyles.animate && 'animate-spin')}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  'font-semibold truncate max-w-[180px]',
                  isPlaying && 'text-primary'
                )}>
                  {file.name}
                </h3>
              </div>
            </div>

            {/* 状态标签 */}
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  status === 'processing' && 'animate-pulse'
                )}
              >
                {statusStyles.label}
              </Badge>

              {isPlaying && (
                <Badge variant="default" className="text-xs">
                  播放中
                </Badge>
              )}
            </div>
          </div>

          {/* 下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onPlay(file.id.toString())}
                className="cursor-pointer"
              >
                <Play className="h-4 w-4 mr-2" />
                <span>播放音频</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => task?.status === 'completed' && onPlay(file.id.toString())}
                className={cn(
                  'cursor-pointer',
                  task?.status !== 'completed' && 'opacity-50 cursor-not-allowed'
                )}
                disabled={task?.status !== 'completed'}
              >
                <FileText className="h-4 w-4 mr-2" />
                <span>播放（带字幕）</span>
              </DropdownMenuItem>

              {task?.status === 'idle' && (
                <DropdownMenuItem
                  onClick={() => task?.start?.()}
                  className="cursor-pointer"
                >
                  <Play className="h-4 w-4 mr-2" />
                  <span>开始转录</span>
                </DropdownMenuItem>
              )}

              {task?.status === 'failed' && (
                <DropdownMenuItem
                  onClick={() => task?.retry?.()}
                  className="cursor-pointer"
                >
                  <Play className="h-4 w-4 mr-2" />
                  <span>重试转录</span>
                </DropdownMenuItem>
              )}

              {task?.status === 'processing' && (
                <DropdownMenuItem
                  onClick={() => task?.cancel?.()}
                  className="cursor-pointer"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  <span>暂停转录</span>
                </DropdownMenuItem>
              )}

              {task?.status === 'paused' && (
                <DropdownMenuItem
                  onClick={() => task?.resume?.()}
                  className="cursor-pointer"
                >
                  <Play className="h-4 w-4 mr-2" />
                  <span>恢复转录</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => setShowTranscriptionDetails(!showTranscriptionDetails)}
                className="cursor-pointer"
              >
                <Settings className="h-4 w-4 mr-2" />
                <span>
                  {showTranscriptionDetails ? '隐藏详情' : '显示详情'}
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onDelete(file.id.toString())}
                className="cursor-pointer text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                <span>删除文件</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 文件元信息 */}
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate">大小: {formatFileSize(file.size)}</span>
              </TooltipTrigger>
              <TooltipContent>{file.size} 字节</TooltipContent>
            </Tooltip>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>时长: {formatDuration(file.duration)}</span>
                </TooltipTrigger>
              <TooltipContent>{file.duration} 秒</TooltipContent>
              </Tooltip>

            {file.duration && (
              <span>比特率: {Math.round((file.size * 8) / (file.duration * 1000))} kbps</span>
            )}
          </TooltipProvider>
        </div>

        {/* 时间信息 */}
        {task?.progress.createdAt && (
          <p className="text-xs text-gray-500">
            创建: {formatTime(task.progress.createdAt)}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* 转录状态面板 */}
        <TranscriptionStatusPanel
          task={task}
          showDetails={showTranscriptionDetails}
        />

        {/* 转录进度条 */}
        {task && (task.status === 'processing' || task.status === 'paused') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {task.status === 'processing' ? '转录进度' : '已暂停'}
              </span>
              <span>{task.progress.progress}%</span>
            </div>
            <Progress value={task.progress.progress} className="h-2" />
            {task.progress.message && (
              <p className="text-xs text-gray-500">
                {task.progress.message}
              </p>
            )}

            {task.progress.estimatedDuration && task.progress.progress > 0 && (
              <p className="text-xs text-gray-500">
                预计剩余时间: {Math.ceil((task.progress.estimatedDuration * (1 - task.progress.progress / 100) / 60))} 分钟
              </p>
            )}
          </div>
        )}

        {/* 错误信息 */}
        {task?.status === 'failed' && task.progress.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3">
            <p className="text-sm text-red-700 dark:text-red-300">
              错误: {task.progress.error}
            </p>
          </div>
        )}

        {/* 结果信息 */}
        {task?.status === 'completed' && task.progress.result && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-green-700 dark:text-green-300">转录结果</span>
                <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-700">
                  {task.progress.result.language || 'ja'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">文本长度:</span>
                  <span>{task.progress.result.text.length} 字符</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">片段数量:</span>
                  <span>{task.progress.result.segmentsCount}</span>
                </div>
              </div>

              {task.progress.result.duration && (
                <div className="pt-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">处理时间:</span>
                  <span>
                    {formatDuration(task.progress.actualDuration)}
                    {task.progress.estimatedDuration && (
                      <span className="text-gray-500">
                        (原预计: {formatDuration(task.progress.estimatedDuration)})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 紧凑版文件卡片组件
 */
export function CompactFileCard({
  file,
  onPlay,
  onDelete,
  className,
}: Omit<EnhancedFileCardProps, 'isPlaying' | 'isCurrentFile'>) {
  const { task, status } = useTranscriptionStatus(file.id!);

  const statusStyles = getStatusStyles();
  const Icon = statusStyles.icon;

  return (
    <Card className={cn('cursor-pointer transition-all hover:shadow-sm', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-1.5 rounded-md', statusStyles.bg)}>
              <Icon className={cn('h-4 w-4', statusStyles.text, statusStyles.animate && 'animate-spin')} />
            </div>
            <h4 className="font-medium truncate max-w-[200px]">{file.name}</h4>
          </div>
          <Badge variant="secondary" className="text-xs">
            {statusStyles.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{formatFileSize(file.size)}</span>
          <span>{formatDuration(file.duration)}</span>
        </div>

        <div className="mt-3">
          <Button
            className="w-full"
            onClick={() => {
              if (status === 'completed') {
                onPlay(file.id.toString());
              } else {
                task?.start?.();
              }
            }}
            disabled={status === 'processing'}
          >
            {status === 'completed' ? '播放（带字幕）' : status === 'processing' ? '转录中...' : '开始转录'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
