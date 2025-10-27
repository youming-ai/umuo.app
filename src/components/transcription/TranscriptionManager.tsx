/**
 * 全局转录管理器组件
 * 提供转录任务的统一管理和监控界面
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Settings,
  Trash2,
  Pause,
  Play,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
  List,
  Grid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useTranscriptionStore,
  useTranscriptionQueue,
  useTranscriptionUI,
} from "@/lib/transcription/store";
import { getTranscriptionManager } from "@/lib/transcription/queue-manager";
import { TranscriptionStatusPanel } from "./TranscriptionStatusPanel";
import type {
  TranscriptionTask,
  TranscriptionStatus,
  TranscriptionPriority,
} from "@/types/transcription";

interface TranscriptionManagerProps {
  className?: string;
}

export function TranscriptionManager({ className }: TranscriptionManagerProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterStatus, setFilterStatus] = useState<TranscriptionStatus | "all">(
    "all",
  );
  const [filterPriority, setFilterPriority] = useState<
    TranscriptionPriority | "all"
  >("all");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // 获取状态
  const queueState = useTranscriptionQueue();
  const uiState = useTranscriptionUI();
  const { setMaxConcurrency, clearCompletedTasks, clearAllTasks } =
    useTranscriptionStore();

  const transcriptionManager = getTranscriptionManager();

  // 过滤和排序任务
  const filteredTasks = useMemo(() => {
    let tasks = [
      ...queueState.queued,
      ...queueState.processing,
      ...queueState.completed,
      ...queueState.failed,
    ];

    // 应用过滤器
    if (filterStatus !== "all") {
      tasks = tasks.filter((task) => task.status === filterStatus);
    }
    if (filterPriority !== "all") {
      tasks = tasks.filter((task) => task.priority === filterPriority);
    }

    // 排序
    return tasks.sort((a, b) => {
      // 优先按状态排序
      const statusOrder = [
        "processing",
        "queued",
        "paused",
        "completed",
        "failed",
        "cancelled",
        "idle",
      ];
      const aStatusIndex = statusOrder.indexOf(a.status);
      const bStatusIndex = statusOrder.indexOf(b.status);

      if (aStatusIndex !== bStatusIndex) {
        return aStatusIndex - bStatusIndex;
      }

      // 相同状态按优先级排序
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      const aPriorityIndex = priorityOrder[a.priority];
      const bPriorityIndex = priorityOrder[b.priority];

      if (aPriorityIndex !== bPriorityIndex) {
        return aPriorityIndex - bPriorityIndex;
      }

      // 最后按创建时间排序
      return b.progress.createdAt.getTime() - a.progress.createdAt.getTime();
    });
  }, [queueState, filterStatus, filterPriority]);

  // 切换任务展开状态
  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // 批量操作
  const handleClearCompleted = () => {
    clearCompletedTasks();
  };

  const handleClearAll = () => {
    if (window.confirm("确定要清空所有转录任务吗？这将包括正在进行的任务。")) {
      clearAllTasks();
    }
  };

  const handleRetryFailed = () => {
    queueState.failed.forEach((task) => {
      transcriptionManager.retryTask(task.id);
    });
  };

  // 导出统计信息
  const handleExportStats = () => {
    const stats = {
      timestamp: new Date().toISOString(),
      queue: {
        queued: queueState.queued.length,
        processing: queueState.processing.length,
        completed: queueState.completed.length,
        failed: queueState.failed.length,
      },
      config: {
        maxConcurrency: queueState.maxConcurrency,
        currentConcurrency: queueState.currentConcurrency,
      },
      stats: queueState.stats,
    };

    const blob = new Blob([JSON.stringify(stats, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcription-stats-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🎙️ 转录管理
              <Badge variant="secondary" className="ml-2">
                {queueState.stats.queueLength} 队列中
              </Badge>
              {queueState.isProcessing && (
                <Badge variant="default" className="animate-pulse">
                  处理中
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* 视图切换 */}
              <div className="flex border rounded-md">
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className="rounded-l-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>

              {/* 设置 */}
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>转录设置</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="auto-start">自动开始转录</Label>
                      <Switch
                        id="auto-start"
                        checked={uiState.autoStartTranscription}
                        onCheckedChange={(checked) => {
                          useTranscriptionStore
                            .getState()
                            .setUIState({ autoStartTranscription: checked });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-concurrency">最大并发数</Label>
                      <Select
                        value={queueState.maxConcurrency.toString()}
                        onValueChange={(value) =>
                          setMaxConcurrency(parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default-language">默认语言</Label>
                      <Select
                        value={uiState.defaultLanguage}
                        onValueChange={(value) => {
                          useTranscriptionStore
                            .getState()
                            .setUIState({ defaultLanguage: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ja">日语</SelectItem>
                          <SelectItem value="en">英语</SelectItem>
                          <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* 批量操作 */}
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={handleRetryFailed}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearCompleted}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportStats}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* 统计信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {queueState.queued.length}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                排队中
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {queueState.processing.length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                处理中
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {queueState.completed.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                已完成
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {queueState.failed.length}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">失败</div>
            </div>
          </div>

          {/* 过滤器 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select
              value={filterStatus}
              onValueChange={(value: any) => setFilterStatus(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="idle">空闲</SelectItem>
                <SelectItem value="queued">排队</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterPriority}
              onValueChange={(value: any) => setFilterPriority(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="urgent">紧急</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 任务列表 */}
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🎵</div>
                <p>暂无转录任务</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* 任务头部 */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => toggleTaskExpanded(task.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedTasks.has(task.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <div>
                        <p className="font-medium truncate max-w-xs">
                          {task.fileName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {task.status === "processing" &&
                            `进度: ${task.progress.progress}%`}
                          {task.status === "completed" && "转录完成"}
                          {task.status === "failed" && "转录失败"}
                          {task.status === "queued" && "排队中"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {task.priority.toUpperCase()}
                      </Badge>
                      {task.status === "processing" && (
                        <Badge variant="default" className="animate-pulse">
                          处理中
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 详细信息 */}
                  {expandedTasks.has(task.id) && (
                    <div className="p-4 border-t">
                      <TranscriptionStatusPanel
                        task={task}
                        showDetails={true}
                        compact={false}
                        onStartTranscription={async () => {
                          await transcriptionManager.addTask(
                            task.fileId,
                            task.options,
                          );
                        }}
                        onCancelTranscription={() =>
                          transcriptionManager.cancelTask(task.id)
                        }
                        onPauseTranscription={() =>
                          transcriptionManager.pauseTask(task.id)
                        }
                        onResumeTranscription={() =>
                          transcriptionManager.resumeTask(task.id)
                        }
                        onRetryTranscription={() =>
                          transcriptionManager.retryTask(task.id)
                        }
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 转录管理器触发器按钮
 */
export function TranscriptionManagerTrigger() {
  const { showTranscriptionManager, toggleTranscriptionManager } =
    useTranscriptionUI();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTranscriptionManager}
      className="fixed bottom-4 right-4 z-50 shadow-lg"
    >
      <Settings className="h-4 w-4 mr-2" />
      转录管理
    </Button>
  );
}

/**
 * 转录状态悬浮窗
 */
export function TranscriptionStatusWidget() {
  const queueState = useTranscriptionQueue();
  const { showTranscriptionManager, toggleTranscriptionManager } =
    useTranscriptionUI();

  if (queueState.stats.queueLength === 0 && !queueState.isProcessing) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 cursor-pointer"
      onClick={toggleTranscriptionManager}
    >
      <div className="bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 min-w-48">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">转录状态</span>
          <Badge variant={queueState.isProcessing ? "default" : "secondary"}>
            {queueState.isProcessing ? "处理中" : "空闲"}
          </Badge>
        </div>

        <div className="space-y-1 text-sm">
          {queueState.queued.length > 0 && (
            <div className="flex justify-between">
              <span>排队中</span>
              <span>{queueState.queued.length}</span>
            </div>
          )}
          {queueState.processing.length > 0 && (
            <div className="flex justify-between">
              <span>处理中</span>
              <span>{queueState.processing.length}</span>
            </div>
          )}
        </div>

        {queueState.processing.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-xs text-gray-500 mb-1">正在处理:</div>
            {queueState.processing.slice(0, 2).map((task) => (
              <div key={task.id} className="text-xs truncate">
                {task.fileName} ({task.progress.progress}%)
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
