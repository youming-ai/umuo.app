/**
 * 增强的文件管理器组件
 * 集成新的转录系统，提供完整的用户体验
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Mic, Settings, BarChart3, List, Grid, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFiles } from '@/hooks';
import { useTranscriptionStore, useTranscriptionQueue } from '@/lib/transcription/store';
import { TranscriptionManager, TranscriptionStatusWidget } from '@/components/transcription/TranscriptionManager';
import FileCardEnhanced from './FileCardEnhanced';
import FileUpload from './FileUpload';
import StatsCards from './StatsCards';
import Navigation from '@/components/ui/Navigation';

interface FileManagerEnhancedProps {
  className?: string;
}

export default function FileManagerEnhanced({ className }: FileManagerEnhancedProps) {
  // 基础状态
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'status'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'transcribed' | 'untranscribed' | 'processing'>('all');
  const [showTranscriptionManager, setShowTranscriptionManager] = useState(false);

  // Hooks
  const { fileUploadState, updateFileUploadState } = useFiles();
  const { files, addFiles, deleteFile } = useFiles(updateFileUploadState);
  const queueState = useTranscriptionQueue();
  const { setUIState } = useTranscriptionStore();

  // 过滤和排序文件
  const filteredFiles = React.useMemo(() => {
    let filtered = files || [];

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 转录状态过滤
    if (filterBy !== 'all') {
      filtered = filtered.filter(file => {
        const task = queueState.queued.find(t => t.fileId === file.id) ||
                   queueState.processing.find(t => t.fileId === file.id) ||
                   queueState.completed.find(t => t.fileId === file.id) ||
                   queueState.failed.find(t => t.fileId === file.id);

        switch (filterBy) {
          case 'transcribed':
            return task?.status === 'completed';
          case 'untranscribed':
            return !task || task.status === 'idle';
          case 'processing':
            return task?.status === 'processing' || task?.status === 'queued';
          default:
            return true;
        }
      });
    }

    // 排序
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'status':
          const getStatusPriority = (fileId: number) => {
            const task = queueState.queued.find(t => t.fileId === fileId) ||
                       queueState.processing.find(t => t.fileId === fileId) ||
                       queueState.completed.find(t => t.fileId === fileId) ||
                       queueState.failed.find(t => t.fileId === fileId);

            if (!task) return 0;
            if (task.status === 'processing' || task.status === 'queued') return 1;
            if (task.status === 'failed') return 2;
            if (task.status === 'completed') return 3;
            return 4;
          };

          return getStatusPriority(a.id || 0) - getStatusPriority(b.id || 0);
        case 'date':
        default:
          return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
      }
    });
  }, [files, searchQuery, filterBy, sortBy, queueState]);

  // 统计信息
  const stats = React.useMemo(() => {
    const total = files?.length || 0;
    const transcribed = queueState.completed.length;
    const processing = queueState.processing.length;
    const failed = queueState.failed.length;
    const pending = total - transcribed - processing;

    return {
      total,
      transcribed,
      processing,
      pending,
      failed,
    };
  }, [files, queueState]);

  // 处理文件上传
  const handleFilesSelected = async (selectedFiles: File[]) => {
    try {
      await addFiles(selectedFiles);

      // 显示成功提示
      const { toast } = await import('sonner');
      toast.success(`成功上传 ${selectedFiles.length} 个文件`);

      // 如果用户配置了自动转录，开始转录
      const uiState = useTranscriptionStore.getState();
      if (uiState.autoStartTranscription) {
        const transcriptionManager = (await import('@/lib/transcription/queue-manager')).getTranscriptionManager();

        // 延迟开始转录，避免阻塞 UI
        setTimeout(async () => {
          for (const uploadedFile of selectedFiles) {
            try {
              // 这里需要获取上传后的文件ID，简化处理
              console.log('自动转录文件:', uploadedFile.name);
            } catch (error) {
              console.error('自动转录失败:', error);
            }
          }
        }, 1000);
      }
    } catch (error) {
      const { toast } = await import('sonner');
      toast.error('文件上传失败');
    }
  };

  // 批量操作
  const handleBatchTranscribe = async () => {
    const untranscribedFiles = filteredFiles.filter(file => {
      const task = queueState.queued.find(t => t.fileId === file.id) ||
                   queueState.processing.find(t => t.fileId === file.id) ||
                   queueState.completed.find(t => t.fileId === file.id);
      return !task || task.status === 'idle';
    });

    if (untranscribedFiles.length === 0) {
      const { toast } = await import('sonner');
      toast.info('没有需要转录的文件');
      return;
    }

    const { toast } = await import('sonner');
    toast.success(`开始批量转录 ${untranscribedFiles.length} 个文件`);

    const transcriptionManager = (await import('@/lib/transcription/queue-manager')).getTranscriptionManager();

    for (const file of untranscribedFiles) {
      try {
        await transcriptionManager.addTask(file.id!, {
          language: 'ja',
          priority: 'normal',
          autoStart: true,
        });
      } catch (error) {
        console.error('批量转录失败:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8 mt-20">
        {/* 页面标题和操作 */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">文件管理</h1>
              <p className="text-muted-foreground">
                管理您的音频文件并控制转录任务
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* 转录管理器按钮 */}
              <Button
                variant="outline"
                onClick={() => setShowTranscriptionManager(!showTranscriptionManager)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                转录管理
                {(queueState.stats.queueLength > 0 || queueState.isProcessing) && (
                  <Badge variant="secondary" className="animate-pulse">
                    {queueState.stats.queueLength}
                  </Badge>
                )}
              </Button>

              {/* 批量转录按钮 */}
              {stats.pending > 0 && (
                <Button onClick={handleBatchTranscribe} className="gap-2">
                  <Mic className="h-4 w-4" />
                  批量转录 ({stats.pending})
                </Button>
              )}
            </div>
          </div>

          {/* 统计卡片 */}
          <StatsCards />
        </div>

        {/* 文件上传区域 */}
        <div className="mb-8">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            isUploading={fileUploadState.isUploading}
            uploadProgress={fileUploadState.uploadProgress}
          />
        </div>

        {/* 文件列表和控制 */}
        <div className="space-y-6">
          {/* 搜索和过滤器 */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 搜索框 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索文件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 过滤器 */}
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="状态过滤" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部文件</SelectItem>
                <SelectItem value="transcribed">已转录</SelectItem>
                <SelectItem value="untranscribed">未转录</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
              </SelectContent>
            </Select>

            {/* 排序 */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">按日期</SelectItem>
                <SelectItem value="name">按名称</SelectItem>
                <SelectItem value="size">按大小</SelectItem>
                <SelectItem value="status">按状态</SelectItem>
              </SelectContent>
            </Select>

            {/* 视图切换 */}
            <div className="flex border rounded-md">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 转录管理器 */}
          {showTranscriptionManager && (
            <TranscriptionManager />
          )}

          {/* 文件列表 */}
          <div className="space-y-4">
            {filteredFiles.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-6xl mb-4">🎵</div>
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? '没有找到匹配的文件' : '还没有上传任何文件'}
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchQuery
                      ? '尝试调整搜索条件或过滤器'
                      : '上传音频文件开始使用转录功能'
                    }
                  </p>
                  {!searchQuery && (
                    <FileUpload
                      onFilesSelected={handleFilesSelected}
                      isUploading={fileUploadState.isUploading}
                      uploadProgress={fileUploadState.uploadProgress}
                      compact
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-4'
              }>
                {filteredFiles.map((file) => (
                  <FileCardEnhanced
                    key={file.id}
                    file={file}
                    onPlay={(fileId) => {
                      // 导航到播放器页面
                      window.location.href = `/player/${fileId}`;
                    }}
                    onPlayAudioOnly={(fileId) => {
                      // 播放音频但不等待转录
                      window.location.href = `/player/${fileId}?audioOnly=true`;
                    }}
                    onDelete={deleteFile}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 转录状态悬浮窗 */}
      <TranscriptionStatusWidget />
    </div>
  );
}
