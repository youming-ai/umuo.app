/**
 * 增强的文件卡片组件
 * 集成新的转录状态管理系统
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  FileAudio,
  Loader2,
  CheckCircle,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranscriptionStatus } from '@/hooks/player/usePlayerDataNew';
import { TranscriptionStatusIndicator, TranscriptionProgressBar } from '@/components/transcription/TranscriptionStatusPanel';
import { useTranscriptionStore } from '@/lib/transcription/store';
import type { FileRow } from '@/types/db/database';

interface EnhancedFileCardProps {
  file: FileRow;
  onPlay: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  isPlaying?: boolean;
  isCurrentFile?: boolean;
  className?: string;
  showTranscriptionControls?: boolean;
}

export function EnhancedFileCard({
  file,
  onPlay,
  onDelete,
  isPlaying = false,
  isCurrentFile = false,
  className,
  showTranscriptionControls = true,
}: EnhancedFileCardProps) {
  const [showActions, setShowActions] = useState(false);
  const fileId = file.id ?? 0;

  // 转录状态
  const transcription = useTranscriptionStatus(fileId);

  // UI 状态
  const { setUIState, toggleTranscriptionManager } = useTranscriptionStore();

  // 格式化辅助函数
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // 处理播放操作
  const handlePlay = useCallback(async () => {
    if (transcription.status === 'completed') {
      // 有转录结果，播放带字幕的音频
      onPlay(file.id.toString());
    } else if (transcription.status === 'idle' || transcription.status === 'failed') {
      // 没有转录，可以选择开始转录或仅播放音频
      try {
        await transcription.start({
          language: 'ja',
          autoStart: true,
          priority: 'normal',
        });
      } catch (error) {
        console.error('开始转录失败:', error);
        // 如果转录失败，仍然允许播放音频
        onPlay(file.id.toString());
      }
    } else {
      // 其他状态（转录中、暂停等），播放纯音频
      onPlay(file.id.toString());
    }
  }, [transcription, onPlay, file.id]);

  // 处理转录操作
  const handleStartTranscription = useCallback(async () => {
    try {
      await transcription.start({
        language: 'ja',
        autoStart: true,
        priority: 'normal',
      });
    } catch (error) {
      console.error('开始转录失败:', error);
    }
  }, [transcription]);

  const handleCancelTranscription = useCallback(() => {
    transcription.cancel();
  }, [transcription]);

  const handlePauseTranscription = useCallback(() => {
    transcription.pause();
  }, [transcription]);

  const handleResumeTranscription = useCallback(() => {
    transcription.resume();
  }, [transcription]);

  const handleRetryTranscription = useCallback(async () => {
    try {
      await transcription.retry();
    } catch (error) {
      console.error('重试转录失败:', error);
    }
  }, [transcription]);

  // 获取播放按钮文本和状态
  const getPlayButtonState = () => {
    switch (transcription.status) {
      case 'completed':
        return {
          text: '播放（带字幕）',
          icon: Play,
          variant: 'default' as const,
          disabled: false,
        };
      case 'processing':
        return {
          text: '播放（仅音频）',
          icon: Play,
          variant: 'outline' as const,
          disabled: false,
        };
      case 'queued':
        return {
          text: '播放（仅音频）',
          icon: Play,
          variant: 'outline' as const,
          disabled: false,
        };
      default:
        return {
          text: '播放',
          icon: Play,
          variant: 'outline' as const,
          disabled: false,
        };
    }
  };

  const playButtonState = getPlayButtonState();
  const PlayIcon = playButtonState.icon;

  // 获取状态颜色
  const getStatusColor = () => {
    switch (transcription.status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'paused':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        isCurrentFile && 'ring-2 ring-primary ring-offset-2',
        showActions && 'shadow-lg',
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileAudio className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <h3 className="font-medium text-sm truncate pr-2">
                {file.name}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{formatFileSize(file.size)}</span>
              {file.duration && <span>{formatDuration(file.duration)}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPlaying && (
              <div className="flex items-center gap-1 text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs font-medium">播放中</span>
              </div>
            )}

            {showTranscriptionControls && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setUIState({ showTranscriptionManager: true })}>
                    转录管理器
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(file.id.toString())}
                    className="text-red-600 focus:text-red-600"
                  >
                    删除文件
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 转录状态 */}
        {showTranscriptionControls && (
          <div className="space-y-2">
            <TranscriptionStatusIndicator task={transcription.task} />

            {/* 转录进度条 */}
            {(transcription.status === 'processing' || transcription.status === 'paused') && (
              <TranscriptionProgressBar task={transcription.task} />
            )}

            {/* 队列位置 */}
            {transcription.queuePosition > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>队列第 {transcription.queuePosition} 位</span>
                {transcription.estimatedWaitTime && (
                  <span>(约 {Math.ceil(transcription.estimatedWaitTime / 60)} 分钟)</span>
                )}
              </div>
            )}

            {/* 错误信息 */}
            {transcription.status === 'failed' && transcription.error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
                错误: {transcription.error}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex w-full gap-2">
          {/* 主要播放按钮 */}
          <Button
            variant={playButtonState.variant}
            size="sm"
            className="flex-1"
            onClick={handlePlay}
            disabled={playButtonState.disabled}
          >
            <PlayIcon className="h-4 w-4 mr-1" />
            {playButtonState.text}
          </Button>

          {/* 转录控制按钮 */}
          {showTranscriptionControls && (
            <>
              {transcription.status === 'idle' || transcription.status === 'failed' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartTranscription}
                  disabled={transcription.status === 'processing'}
                >
                  {transcription.status === 'failed' ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <FileAudio className="h-4 w-4" />
                  )}
                </Button>
              ) : transcription.status === 'processing' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePauseTranscription}
                >
                  <Pause className="h-4 w-4" />
                </Button>
              ) : transcription.status === 'paused' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResumeTranscription}
                >
                  <Play className="h-4 w-4" />
                </Button>
              ) : transcription.status === 'queued' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelTranscription}
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : null}
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

/**
 * 紧凑版文件卡片 - 用于文件列表视图
 */
export function CompactFileCard({
  file,
  onPlay,
  onDelete,
  transcription,
  className,
}: {
  file: FileRow;
  onPlay: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  transcription: ReturnType<typeof useTranscriptionStatus>;
  className?: string;
}) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (transcription.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn(
      'flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
      className
    )}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileAudio className="h-5 w-5 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{file.name}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : '--'}</span>
            {file.duration && <span>{formatDuration(file.duration)}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPlay(file.id.toString())}
          className="h-8 px-3"
        >
          <Play className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default EnhancedFileCard;
