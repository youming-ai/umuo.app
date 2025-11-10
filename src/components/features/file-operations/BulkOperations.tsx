/**
 * BulkOperations - Main orchestration component for bulk file operations
 * Provides comprehensive bulk operations interface with mobile optimization and integration
 */

"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  FileAudio,
  FileVideo,
  File,
  Settings,
  HelpCircle,
  Zap,
  Shield,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db/db";

// Import components
import FileSelector from "./FileSelector";
import OperationProgress from "./OperationProgress";
import ConfirmationDialog from "./ConfirmationDialog";
import BulkActions from "./BulkActions";

// Import hooks and utilities
import { useBulkSelection, useBulkOperationsQueue, useBulkDelete, useBulkTranscribe } from "./hooks";
import { progressTracker, errorHandler, mobileOptimizer } from "./utils";

// Import types
import type {
  BulkOperationsProps,
  FileInfo,
  BulkAction,
  BulkOperationConfig,
  ConfirmationDialog as ConfirmationDialogType,
  OperationProgress as OperationProgressType,
  MobileOptimizations,
  AccessibilityFeatures,
} from "./types";
import { createBulkAction, createBulkOperationConfig } from "./types";
import { FileOperationUtils } from "./utils";

export default function BulkOperations({
  files: initialFiles,
  onSelectionChange,
  onOperationStart,
  onOperationComplete,
  onOperationError,
  showFileSelector = true,
  showProgressBar = true,
  showConfirmationDialog = true,
  mobileOptimizations,
  accessibilityFeatures,
  customActions = [],
  disabledActions = [],
  className,
}: BulkOperationsProps) {
  const { toast } = useToast();

  // State management
  const [activeTab, setActiveTab] = useState("files");
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogType>({
    isOpen: false,
    operationType: "delete",
    title: "",
    message: "",
    files: [],
    onConfirm: () => {},
    onCancel: () => {},
    variant: "default",
  });

  // File data with enhanced information
  const files = useMemo(() => {
    return initialFiles.map(file => {
      const typeInfo = FileOperationUtils.getFileTypeInfo(file.name);
      return {
        ...file,
        isSelected: false,
        canTranscribe: typeInfo.canTranscribe,
        canDownload: true,
        canShare: true,
        canDelete: true,
        isLargeFile: FileOperationUtils.requiresChunking(file.size || 0),
        requiresChunking: FileOperationUtils.requiresChunking(file.size || 0),
        estimatedProcessingTime: FileOperationUtils.calculateEstimatedProcessingTime([file], "transcribe"),
      } as FileInfo;
    });
  }, [initialFiles]);

  // Hooks
  const { selectionState, toggleFileSelection, selectAll, clearSelection } = useBulkSelection(
    files,
    mobileOptimizations
  );

  const { queue, activeOperations, addToQueue, processQueue, cancelOperation } = useBulkOperationsQueue();

  const bulkDelete = useBulkDelete();
  const bulkTranscribe = useBulkTranscribe();

  // Load files from database
  const { data: dbFiles, isLoading } = useQuery({
    queryKey: ["bulkOperations", "files"],
    queryFn: async () => {
      const allFiles = await db.files.toArray();
      return allFiles;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Available bulk actions
  const availableActions = useMemo(() => {
    const defaultActions: BulkAction[] = [
      createBulkAction({
        id: "delete",
        type: "delete",
        label: "删除",
        icon: Trash2,
        description: "永久删除选中的文件",
        variant: "destructive",
        requiresConfirmation: true,
        showPreview: true,
        priority: "urgent",
        isAvailable: (selected) => selected.length > 0,
        isEnabled: (selected) => selected.some(f => f.canDelete !== false),
      }),
      createBulkAction({
        id: "download",
        type: "download",
        label: "下载",
        icon: Download,
        description: "下载选中的文件到本地",
        variant: "default",
        requiresConfirmation: true,
        showPreview: true,
        priority: "high",
        isAvailable: (selected) => selected.length > 0,
        isEnabled: (selected) => selected.some(f => f.canDownload !== false),
      }),
      createBulkAction({
        id: "transcribe",
        type: "transcribe",
        label: "转录",
        icon: Mic,
        description: "对音频文件进行语音转录",
        variant: "default",
        requiresConfirmation: true,
        showPreview: true,
        priority: "normal",
        isAvailable: (selected) => selected.length > 0,
        isEnabled: (selected) => selected.some(f => f.canTranscribe !== false),
      }),
      createBulkAction({
        id: "share",
        type: "share",
        label: "分享",
        icon: Share2,
        description: "创建分享链接",
        variant: "default",
        requiresConfirmation: true,
        showPreview: false,
        priority: "normal",
        isAvailable: (selected) => selected.length > 0,
        isEnabled: (selected) => selected.some(f => f.canShare !== false),
      }),
    ];

    // Filter out disabled actions
    const filteredDefaultActions = defaultActions.filter(action => !disabledActions.includes(action.type));

    // Add custom actions
    return [...filteredDefaultActions, ...customActions];
  }, [customActions, disabledActions]);

  // Handle action execution
  const handleActionExecute = useCallback(async (action: BulkAction, selectedFiles: FileInfo[]) => {
    const fileIds = selectedFiles.map(f => f.id!).filter(Boolean);

    if (fileIds.length === 0) {
      toast({
        title: "没有选择文件",
        description: "请先选择要操作的文件",
        variant: "destructive",
      });
      return;
    }

    // Create operation config
    const baseConfig = createBulkOperationConfig(action.type, fileIds, action.config);

    // Optimize config for mobile
    const optimizedConfig = mobileOptimizer.optimizeOperationConfig(
      baseConfig,
      mobileOptimizations || {}
    );

    // Set up confirmation dialog if required
    if (action.requiresConfirmation && showConfirmationDialog) {
      setConfirmationDialog({
        isOpen: true,
        operationType: action.type,
        title: `确认${action.label}`,
        message: `您确定要${action.label}这 ${fileIds.length} 个文件吗？`,
        files: selectedFiles,
        onConfirm: async () => {
          await executeOperation(action.type, optimizedConfig);
        },
        onCancel: () => {
          // Dialog closed without confirmation
        },
        variant: action.variant === "destructive" ? "destructive" : "default",
        confirmLabel: `确认${action.label}`,
        cancelLabel: "取消",
        icon: action.icon,
      });
    } else {
      // Direct execution
      await executeOperation(action.type, optimizedConfig);
    }
  }, [showConfirmationDialog, mobileOptimizations, toast]);

  // Execute operation
  const executeOperation = useCallback(async (operationType: string, config: BulkOperationConfig) => {
    try {
      // Notify operation start
      onOperationStart?.(config);

      // Add to queue
      const operationId = addToQueue(config);

      // Start processing queue
      processQueue();

      toast({
        title: "操作已开始",
        description: `${operationType}操作已添加到队列`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "操作失败";

      onOperationError?.(error instanceof Error ? error : new Error(errorMessage), operationId);

      toast({
        title: "操作失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [addToQueue, processQueue, onOperationStart, onOperationError, toast]);

  // Handle selection change
  useEffect(() => {
    onSelectionChange?.(selectionState);
  }, [selectionState, onSelectionChange]);

  // Handle operation progress
  useEffect(() => {
    // Register progress callbacks for active operations
    activeOperations.forEach((progress, operationId) => {
      if (!progressTracker.getCurrentProgress(operationId)) {
        progressTracker.registerCallback(operationId, (newProgress) => {
          // Progress updates are handled by the queue system
        });
      }
    });

    // Cleanup completed operations
    return () => {
      activeOperations.forEach((_, operationId) => {
        if (activeOperations.has(operationId)) {
          progressTracker.unregisterCallback(operationId);
        }
      });
    };
  }, [activeOperations]);

  // Get operation summary
  const operationSummary = useMemo(() => {
    return {
      totalOperations: queue.operations.length,
      activeOperations: activeOperations.size,
      completedOperations: queue.operations.filter(op => op.status === "completed").length,
      failedOperations: queue.operations.filter(op => op.status === "failed").length,
    };
  }, [queue, activeOperations]);

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">批量操作</h2>
            <Badge variant="secondary" className="text-xs">
              {files.length} 个文件
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {mobileOptimizations?.enableBatteryOptimization && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                节能模式
              </div>
            )}

            {accessibilityFeatures?.highContrastMode && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                高对比度
              </div>
            )}

            {mobileOptimizations && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Smartphone className="h-3 w-3" />
                移动优化
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex-shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="files" className="flex items-center gap-2">
                <File className="h-4 w-4" />
                文件选择
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                批量操作
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2">
                {operationSummary.activeOperations > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                    {operationSummary.activeOperations}
                  </Badge>
                )}
                进度
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Files tab */}
          <TabsContent value="files" className="flex-1 flex flex-col min-h-0 m-0">
            {showFileSelector && (
              <FileSelector
                files={files}
                selectionState={selectionState}
                onSelectionChange={onSelectionChange}
                className="flex-1"
              />
            )}
          </TabsContent>

          {/* Actions tab */}
          <TabsContent value="actions" className="flex-1 overflow-auto m-0 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Selected files summary */}
              {selectionState.totalSelected > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">已选择文件</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">总数:</span>
                        <div className="font-medium">{selectionState.totalSelected}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">大小:</span>
                        <div className="font-medium">
                          {FileOperationUtils.formatFileSize(selectionState.totalSize)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">可转录:</span>
                        <div className="font-medium">{selectionState.canTranscribe}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">可下载:</span>
                        <div className="font-medium">{selectionState.canDownload}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Available actions */}
              <BulkActions
                selectedFiles={selectionState.selectedFiles}
                availableActions={availableActions}
                onActionExecute={handleActionExecute}
                layout="horizontal"
                showLabels={true}
                showDescriptions={true}
                showBadges={true}
                enableKeyboardShortcuts={accessibilityFeatures?.enableKeyboardShortcuts}
                touchOptimized={mobileOptimizations?.longPressDelay ? true : false}
                enableHapticFeedback={mobileOptimizations?.enableHapticFeedback !== false}
              />
            </div>
          </TabsContent>

          {/* Progress tab */}
          <TabsContent value="progress" className="flex-1 overflow-auto m-0 p-4">
            {showProgressBar && Array.from(activeOperations.values()).length > 0 && (
              <OperationProgress
                operations={Array.from(activeOperations.values())}
                onCancel={cancelOperation}
                showEstimatedTime={true}
                showTransferRate={true}
                showIndividualProgress={true}
                compactMode={false}
              />
            )}

            {Array.from(activeOperations.values()).length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-2">
                  <FileAudio className="h-12 w-12 mx-auto" />
                  <div className="text-lg font-medium">没有进行中的操作</div>
                  <div className="text-sm">选择文件并执行批量操作以查看进度</div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation dialog */}
      {showConfirmationDialog && (
        <ConfirmationDialog
          dialog={confirmationDialog}
          onDialogChange={setConfirmationDialog}
          showFilePreviews={true}
          showProgressEstimate={true}
          showWarningMessage={true}
          enableVibration={mobileOptimizations?.enableHapticFeedback !== false}
          enableBackdropBlur={true}
        />
      )}
    </div>
  );
}

// Required imports that were missing
import { Trash2, Download, Share2, Mic } from "lucide-react";
