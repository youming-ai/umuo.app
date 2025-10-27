/**
 * 增强的文件卡片组件
 * 集成新的转录状态管理系统
 */

'use client';

import React, { useState } from 'react';
import { Play, Pause, MoreHorizontal, Clock, CheckCircle, XCircle, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTranscriptionStatus } from '@/hooks/player/usePlayerData';
import { TranscriptionStatusIndicator, TranscriptionProgressBar } from '@/components/transcription/TranscriptionStatusPanel';
import { getTranscriptionManager } from '@/lib/transcription/queue-manager';
import type { FileRow } from '@/types/db/database';
import type { TranscriptionOptions } from '@/types/transcription';

interface FileCardProps {
  file: FileRow;
  onPlay: (fileId: string) => void;
  onPlayAudioOnly?: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  isPlaying?: boolean;
  isCurrentFile?: boolean;
  className?: string;
}

export default function FileCard({
  file,
  onPlay,
  onPlayAudioOnly,
  onDelete,
  isPlaying = false,
  isCurrentFile = false,
  className,
}: FileCardProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);

  // 获取转录状态
  const transcription = useTranscriptionStatus(file.id ?? 0);
  const transcriptionManager = getTranscriptionManager();

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理播放操作
  const handlePlay = () => {
    if (transcription.status === 'completed') {
      onPlay(file.id!.toString());
    } else {
      // 如果没有转录，仅播放音频
      onPlayAudioOnly?.(file.id!.toString());
    }
  };

  // 开始转录
  const handleStartTranscription = async () => {
    if (!file.id) return;

    setIsTranscribing(true);
    try {
      await transcription.start({
        language: 'ja',
        priority: 'normal',
        autoStart: true,
      });
    } catch (error) {
      console.error('开始转录失败:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // 取消转录
  const handleCancelTranscription = () => {
    if (transcription.task) {
      transcription.cancel();
    }
  };

  // 重试转录
  const handleRetryTranscription = async () => {
    if (!file.id) return;

    try {
      await transcription.retry();
    } catch (error) {
      console.error('重试转录失败:', error);
    }
  };

  // 暂停/恢复转录
  const handleTogglePause = () => {
    if (transcription.status === 'paused') {
      transcription.resume();
    } else if (transcription.status === 'processing') {
      transcription.pause();
    }
  };

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

  // 获取状态背景色
  const getStatusBgColor = () => {
    switch (transcription.status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/20';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/20';
      case 'paused':
        return 'bg-orange-100 dark:bg-orange-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      isCurrentFile && 'ring-2 ring-primary',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-lg truncate">{file.name}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              {file.size && (
                <span>{formatFileSize(file.size)}</span>
              )}
              {file.duration && (
                <span>{formatDuration(file.duration)}</span>
              )}
            </div>
          </div>

          {/* 状态指示器 */}
          <div className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusBgColor(), getStatusColor())}>
            {transcription.status === 'idle' && '未转录'}
            {transcription.status === 'queued' && '排队中'}
            {transcription.status === 'processing' && '转录中'}
            {transcription.status === 'paused' && '已暂停'}
            {transcription.status === 'completed' && '已完成'}
            {transcription.status === 'failed' && '失败'}
            {transcription.status === 'cancelled' && '已取消'}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* 转录状态指示器 */}
        <div className="mb-3">
          <TranscriptionStatusIndicator task={transcription.task} />
        </div>

        {/* 转录进度条 */}
        {(transcription.status === 'processing' || transcription.status === 'paused') && (
          <div className="mb-3">
            <TranscriptionProgressBar task={transcription.task} />
          </div>
        )}

        {/* 错误信息 */}
        {transcription.status === 'failed' && transcription.error && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            错误: {transcription.error}
          </div>
        )}

        {/* 转录结果信息 */}
        {transcription.status === 'completed' && transcription.task?.progress.result && (
          <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>转录成功完成</span>
            </div>
            <div className="mt-1 text-xs space-y-1">
              <div>文本长度: {transcription.task.progress.result.text.length} 字符</div>
              <div>片段数量: {transcription.task.progress.result.segmentsCount}</div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex flex-col gap-2 w-full">
          {/* 主要操作按钮 */}
          <div className="flex gap-2">
            {transcription.status === 'completed' ? (
              <Button
                onClick={handlePlay}
                className="flex-1"
                variant={isCurrentFile ? "default" : "outline"}
              >
                {isPlaying ? (
                  <><Pause className="h-4 w-4 mr-2" /> 暂停</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> 播放（带字幕）</>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handlePlay}
                  variant="outline"
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  仅播放音频
                </Button>

                {transcription.status === 'idle' && (
                  <Button
                    onClick={handleStartTranscription}
                    disabled={isTranscribing}
                    className="flex-1"
                  >
                    {isTranscribing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 准备中...</>
                    ) : (
                      <><Mic className="h-4 w-4 mr-2" /> 开始转录</>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* 转录控制按钮 */}
          {transcription.task && (
            <div className="flex gap-2">
              {(transcription.status === 'processing' || transcription.status === 'paused') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTogglePause}
                  className="flex-1"
                >
                  {transcription.status === 'paused' ? (
                    <><Play className="h-4 w-4 mr-1" /> 恢复</>
                  ) : (
                    <><Pause className="h-4 w-4 mr-1" /> 暂停</>
                  )}
                </Button>
              )}

              {(transcription.status === 'processing' || transcription.status === 'paused' || transcription.status === 'queued') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelTranscription}
                  className="flex-1"
                >
                  取消
                </Button>
              )}

              {transcription.status === 'failed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryTranscription}
                  className="flex-1"
                >
                  重试
                </Button>
              )}
            </div>
          )}

          {/* 更多操作 */}
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {transcription.status === 'idle' && (
                  <DropdownMenuItem onClick={handleStartTranscription}>
                    <Mic className="h-4 w-4 mr-2" />
                    开始转录
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={handlePlay}>
                  <Play className="h-4 w-4 mr-2" />
                  播放音频
                </DropdownMenuItem>

                {transcription.status === 'completed' && (
                  <DropdownMenuItem onClick={() => onPlay(file.id!.toString())}>
                    <Play className="h-4 w-4 mr-2" />
                    播放（带字幕）
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                      删除文件
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要删除文件 "{file.name}" 吗？此操作无法撤销，包括所有相关的转录数据。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(file.id!.toString())}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
