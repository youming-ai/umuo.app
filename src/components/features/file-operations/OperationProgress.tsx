/**
 * OperationProgress - Real-time progress tracking for bulk operations
 * Provides comprehensive progress visualization with mobile-optimized UI
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Pause,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Upload,
  Trash2,
  Mic,
  FileAudio,
  FileVideo,
  File,
  RefreshCw,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  OperationProgressProps,
  OperationProgress as OperationProgressType,
  OperationStatus,
  BulkOperationType,
} from "./types";
import { FileOperationUtils, TouchUtils, mobileOptimizer } from "./utils";

export default function OperationProgress({
  operations,
  onCancel,
  onPause,
  onResume,
  showEstimatedTime = true,
  showTransferRate = true,
  showIndividualProgress = true,
  compactMode = false,
  enablePullToRefresh = false,
  enableSwipeToCancel = false,
  className,
}: OperationProgressProps) {
  const { toast } = useToast();
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);

  // Group operations by status
  const groupedOperations = React.useMemo(() => {
    const groups = {
      active: operations.filter(op =>
        op.status === "processing" || op.status === "preparing" || op.status === "uploading" || op.status === "downloading"
      ),
      completed: operations.filter(op => op.status === "completed"),
      failed: operations.filter(op => op.status === "failed" || op.status === "cancelled"),
      paused: operations.filter(op => op.status === "paused"),
    };

    return groups;
  }, [operations]);

  // Calculate overall progress
  const overallProgress = React.useMemo(() => {
    if (operations.length === 0) return { percentage: 0, totalFiles: 0, completedFiles: 0 };

    const totalFiles = operations.reduce((sum, op) => sum + op.totalFiles, 0);
    const completedFiles = operations.reduce((sum, op) => sum + op.completedFiles, 0);
    const percentage = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

    return { percentage, totalFiles, completedFiles };
  }, [operations]);

  // Handle pull to refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enablePullToRefresh) return;

    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    setIsPulling(true);
  }, [enablePullToRefresh]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enablePullToRefresh || !isPulling) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const distance = Math.max(0, currentY - startYRef.current);

    setPullDistance(Math.min(distance, 100)); // Max 100px pull distance
  }, [enablePullToRefresh, isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (!enablePullToRefresh || !isPulling) return;

    if (pullDistance > 60) {
      // Trigger refresh
      window.location.reload();
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [enablePullToRefresh, isPulling, pullDistance]);

  // Toggle operation expansion
  const toggleOperationExpansion = useCallback((operationId: string) => {
    setExpandedOperations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
      } else {
        newSet.add(operationId);
      }
      return newSet;
    });
  }, []);

  // Handle operation cancellation
  const handleCancelOperation = useCallback((operationId: string) => {
    setShowCancelDialog(operationId);
  }, []);

  const confirmCancelOperation = useCallback(() => {
    if (showCancelDialog && onCancel) {
      onCancel(showCancelDialog);
      setShowCancelDialog(null);

      toast({
        title: "操作已取消",
        description: "操作已被取消，正在清理资源...",
      });
    }
  }, [showCancelDialog, onCancel, toast]);

  // Handle operation pause/resume
  const handlePauseOperation = useCallback((operationId: string) => {
    if (onPause) {
      onPause(operationId);
      TouchUtils.triggerHapticFeedback("light");
    }
  }, [onPause]);

  const handleResumeOperation = useCallback((operationId: string) => {
    if (onResume) {
      onResume(operationId);
      TouchUtils.triggerHapticFeedback("light");
    }
  }, [onResume]);

  // Get operation icon
  const getOperationIcon = (type: BulkOperationType) => {
    switch (type) {
      case "delete":
        return <Trash2 className="h-4 w-4" />;
      case "download":
        return <Download className="h-4 w-4" />;
      case "transcribe":
        return <Mic className="h-4 w-4" />;
      case "upload":
        return <Upload className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  // Get status icon
  const getStatusIcon = (status: OperationStatus) => {
    switch (status) {
      case "processing":
      case "preparing":
      case "uploading":
      case "downloading":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Format operation status
  const formatOperationStatus = (status: OperationStatus): string => {
    switch (status) {
      case "pending":
        return "等待中";
      case "preparing":
        return "准备中";
      case "processing":
        return "处理中";
      case "uploading":
        return "上传中";
      case "downloading":
        return "下载中";
      case "completed":
        return "已完成";
      case "failed":
        return "失败";
      case "cancelled":
        return "已取消";
      case "paused":
        return "已暂停";
      default:
        return status;
    }
  };

  // Render individual operation
  const renderOperation = (operation: OperationProgressType) => {
    const isExpanded = expandedOperations.has(operation.operationId);
    const isActive = ["processing", "preparing", "uploading", "downloading"].includes(operation.status);
    const progressPercentage = operation.totalFiles > 0
      ? (operation.completedFiles / operation.totalFiles) * 100
      : 0;

    return (
      <Card key={operation.operationId} className="mb-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getOperationIcon(operation.type)}
              <CardTitle className="text-sm font-medium">
                {formatOperationStatus(operation.status)}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {operation.completedFiles}/{operation.totalFiles}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              {getStatusIcon(operation.status)}

              {isActive && (
                <div className="flex items-center gap-1">
                  {onPause && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePauseOperation(operation.operationId)}
                      className="h-8 w-8 p-0"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelOperation(operation.operationId)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {operation.status === "paused" && onResume && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResumeOperation(operation.operationId)}
                  className="h-8 w-8 p-0"
                >
                  <Play className="h-4 w-4" />
                </Button>
              )}

              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleOperationExpansion(operation.operationId)}
                  className="h-8 w-8 p-0"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{operation.message}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Compact info */}
          {!compactMode && (
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>已用时: {FileOperationUtils.formatDuration(operation.elapsedTime)}</span>
              {showEstimatedTime && operation.averageTimePerFile > 0 && (
                <span>
                  预计剩余: {FileOperationUtils.formatDuration(
                    operation.averageTimePerFile * (operation.totalFiles - operation.completedFiles)
                  )}
                </span>
              )}
              {showTransferRate && operation.transferRate && (
                <span>速度: {FileOperationUtils.formatFileSize(operation.transferRate)}/s</span>
              )}
            </div>
          )}

          {/* Expanded details */}
          <Collapsible open={isExpanded} onOpenChange={(open) => {
            if (open) {
              toggleOperationExpansion(operation.operationId);
            } else {
              setExpandedOperations(prev => {
                const newSet = new Set(prev);
                newSet.delete(operation.operationId);
                return newSet;
              });
            }
          }}>
            <CollapsibleContent className="mt-3 space-y-2">
              {operation.currentFile && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <FileAudio className="h-4 w-4" />
                  <span className="text-sm truncate flex-1">{operation.currentFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {FileOperationUtils.formatFileSize(operation.currentFile.size || 0)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">开始时间:</span>
                  <div>{operation.startTime.toLocaleTimeString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">完成进度:</span>
                  <div>{operation.completedFiles} / {operation.totalFiles} 文件</div>
                </div>
                {operation.totalBytes > 0 && (
                  <>
                    <div>
                      <span className="text-muted-foreground">数据大小:</span>
                      <div>{FileOperationUtils.formatFileSize(operation.totalBytes)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">已处理:</span>
                      <div>{FileOperationUtils.formatFileSize(operation.processedBytes)}</div>
                    </div>
                  </>
                )}
              </div>

              {operation.lastError && (
                <div className="p-2 bg-destructive/10 border border-destructive/20 rounded">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">错误</span>
                  </div>
                  <div className="text-sm text-destructive mt-1">{operation.lastError}</div>
                </div>
              )}

              {operation.warnings && operation.warnings.length > 0 && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">警告</span>
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    {operation.warnings.length} 个警告
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  // Render system status
  const renderSystemStatus = () => {
    const networkQuality = mobileOptimizer.getNetworkQuality();
    const isLowBattery = mobileOptimizer.isLowBattery();
    const isLowMemory = mobileOptimizer.isLowMemory();

    return (
      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg text-xs">
        <div className="flex items-center gap-1">
          {networkQuality === "excellent" || networkQuality === "good" ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-yellow-500" />
          )}
          <span>{networkQuality}</span>
        </div>

        {isLowBattery && (
          <div className="flex items-center gap-1">
            <BatteryLow className="h-3 w-3 text-red-500" />
            <span>电量低</span>
          </div>
        )}

        {isLowMemory && (
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-yellow-500" />
            <span>内存不足</span>
          </div>
        )}
      </div>
    );
  };

  if (operations.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("bg-background border rounded-lg", className)}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {enablePullToRefresh && isPulling && (
        <div
          className="flex items-center justify-center p-2 bg-primary/10"
          style={{ height: `${pullDistance}px`, opacity: pullDistance / 100 }}
        >
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-sm">释放以刷新</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">批量操作进度</h3>
          <Badge variant="secondary">
            {groupedOperations.active.length} 进行中
          </Badge>
        </div>

        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>总体进度</span>
            <span>{overallProgress.completedFiles}/{overallProgress.totalFiles} 文件</span>
          </div>
          <Progress value={overallProgress.percentage} className="h-2" />
        </div>

        {/* System status */}
        {groupedOperations.active.length > 0 && renderSystemStatus()}
      </div>

      {/* Operations list */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Active operations */}
        {groupedOperations.active.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">进行中</h4>
            {groupedOperations.active.map(renderOperation)}
          </div>
        )}

        {/* Completed operations */}
        {showIndividualProgress && groupedOperations.completed.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">已完成</h4>
            {groupedOperations.completed.map(renderOperation)}
          </div>
        )}

        {/* Failed operations */}
        {showIndividualProgress && groupedOperations.failed.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">失败</h4>
            {groupedOperations.failed.map(renderOperation)}
          </div>
        )}

        {/* Paused operations */}
        {showIndividualProgress && groupedOperations.paused.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">已暂停</h4>
            {groupedOperations.paused.map(renderOperation)}
          </div>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!showCancelDialog} onOpenChange={() => setShowCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消操作</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要取消这个操作吗？已处理的进度将会保留，但未完成的操作将被中止。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续操作</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelOperation} className="bg-destructive text-destructive-foreground">
              确认取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
