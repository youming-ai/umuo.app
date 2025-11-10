/**
 * ConfirmationDialog - Operation confirmation with file previews
 * Provides comprehensive confirmation dialogs with detailed information and mobile optimization
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Trash2,
  Download,
  Share2,
  Mic,
  FileAudio,
  FileVideo,
  File,
  Clock,
  HardDrive,
  Wifi,
  Battery,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Info,
  Zap,
  Shield,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  ConfirmationDialogProps,
  ConfirmationDialog as ConfirmationDialogType,
  FileInfo,
  BulkOperationType,
} from "./types";
import { FileOperationUtils, mobileOptimizer } from "./utils";

export default function ConfirmationDialog({
  dialog,
  onDialogChange,
  showFilePreviews = true,
  showProgressEstimate = true,
  showWarningMessage = true,
  enableVibration = true,
  enableBackdropBlur = true,
  className,
}: ConfirmationDialogProps) {
  const { toast } = useToast();
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Calculate operation summary
  const operationSummary = React.useMemo(() => {
    return FileOperationUtils.createOperationSummary(dialog.files, dialog.operationType);
  }, [dialog.files, dialog.operationType]);

  // Check system conditions
  const systemConditions = React.useMemo(() => {
    const networkQuality = mobileOptimizer.getNetworkQuality();
    const isLowBattery = mobileOptimizer.isLowBattery();
    const isLowMemory = mobileOptimizer.isLowMemory();
    const isMobileData = mobileOptimizer.isMobileData();

    return {
      networkQuality,
      isLowBattery,
      isLowMemory,
      isMobileData,
      warnings: [
        ...(isLowBattery ? ["电量不足"] : []),
        ...(isLowMemory ? ["内存不足"] : []),
        ...(isMobileData ? ["使用移动数据"] : []),
        ...(networkQuality === "poor" ? ["网络连接质量差"] : []),
      ],
    };
  }, []);

  // Trigger vibration on open
  useEffect(() => {
    if (dialog.isOpen && enableVibration) {
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
    }
  }, [dialog.isOpen, enableVibration]);

  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate processing for demonstration
      const processingSteps = 10;
      for (let i = 0; i <= processingSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress((i / processingSteps) * 100);
      }

      await dialog.onConfirm();

      onDialogChange({ ...dialog, isOpen: false });

      toast({
        title: "操作已确认",
        description: `已开始${dialog.operationType}操作`,
      });
    } catch (error) {
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [dialog, onDialogChange, toast]);

  // Get operation icon and color
  const getOperationInfo = (type: BulkOperationType) => {
    switch (type) {
      case "delete":
        return {
          icon: <Trash2 className="h-5 w-5" />,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/20",
        };
      case "download":
        return {
          icon: <Download className="h-5 w-5" />,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "share":
        return {
          icon: <Share2 className="h-5 w-5" />,
          color: "text-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "transcribe":
        return {
          icon: <Mic className="h-5 w-5" />,
          color: "text-purple-500",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
        };
      default:
        return {
          icon: <File className="h-5 w-5" />,
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
        };
    }
  };

  // Get file icon
  const getFileIcon = (file: FileInfo) => {
    const typeInfo = FileOperationUtils.getFileTypeInfo(file.name);

    switch (typeInfo.type) {
      case "audio":
        return <FileAudio className="h-4 w-4" />;
      case "video":
        return <FileVideo className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const operationInfo = getOperationInfo(dialog.operationType);
  const previewFiles = dialog.files.slice(0, dialog.previewLimit || 5);
  const hasMoreFiles = dialog.files.length > (dialog.previewLimit || 5);

  return (
    <AlertDialog open={dialog.isOpen} onOpenChange={(open) => !open && !isProcessing && onDialogChange({ ...dialog, isOpen: false })}>
      <AlertDialogContent className={cn(
        "max-w-2xl max-h-[80vh] overflow-hidden flex flex-col",
        enableBackdropBlur && "backdrop-blur-sm",
        className
      )}>
        <AlertDialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              operationInfo.bgColor,
              operationInfo.borderColor,
              "border"
            )}>
              {dialog.icon || operationInfo.icon}
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="flex items-center gap-2">
                {dialog.title}
                {dialog.variant === "destructive" && (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                )}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {dialog.message}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Operation summary */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                操作详情
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span>文件数量:</span>
                  <span className="font-medium">{operationSummary.totalFiles}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>总大小:</span>
                  <span className="font-medium">{operationSummary.totalSize}</span>
                </div>
                {showProgressEstimate && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>预计时间:</span>
                    <span className="font-medium">{operationSummary.estimatedTime}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span>操作类型:</span>
                  <Badge variant="outline" className="text-xs">
                    {dialog.operationType}
                  </Badge>
                </div>
              </div>

              {/* Warnings */}
              {showWarningMessage && (operationSummary.warnings.length > 0 || systemConditions.warnings.length > 0) && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">注意事项</span>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {operationSummary.warnings.map((warning, index) => (
                      <li key={`warning-${index}`}>• {warning}</li>
                    ))}
                    {systemConditions.warnings.map((warning, index) => (
                      <li key={`system-${index}`}>• {warning}</li>
                    ))}
                    {dialog.operationType === "delete" && (
                      <li>• 此操作无法撤销，所有相关数据将被永久删除</li>
                    )}
                  </ul>
                </div>
              )}

              {/* System conditions */}
              <div className="flex items-center gap-4 p-2 bg-muted/50 rounded text-xs">
                <div className="flex items-center gap-1">
                  {systemConditions.networkQuality === "excellent" || systemConditions.networkQuality === "good" ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <Wifi className="h-3 w-3 text-yellow-500" />
                  )}
                  <span>网络: {systemConditions.networkQuality}</span>
                </div>
                {systemConditions.isLowBattery && (
                  <div className="flex items-center gap-1">
                    <Battery className="h-3 w-3 text-red-500" />
                    <span>电量低</span>
                  </div>
                )}
                {systemConditions.isMobileData && (
                  <div className="flex items-center gap-1">
                    <Wifi className="h-3 w-3 text-orange-500" />
                    <span>移动数据</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File previews */}
          {showFilePreviews && previewFiles.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <File className="h-4 w-4" />
                    待处理文件
                    <Badge variant="secondary" className="text-xs">
                      {dialog.files.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {previewFiles.map((file, index) => {
                    const typeInfo = FileOperationUtils.getFileTypeInfo(file.name);
                    return (
                      <div key={file.id || index} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                        <div className="flex-shrink-0">
                          {getFileIcon(file)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm">{file.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{FileOperationUtils.formatFileSize(file.size || 0)}</span>
                            <span>•</span>
                            <span>{typeInfo.category}</span>
                            {file.duration && (
                              <>
                                <span>•</span>
                                <span>{FileOperationUtils.formatDuration(file.duration * 1000)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {file.canTranscribe && dialog.operationType === "transcribe" && (
                          <Badge variant="outline" className="text-xs">
                            可转录
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  {hasMoreFiles && (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      还有 {dialog.files.length - previewFiles.length} 个文件...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional details */}
          {dialog.details && (
            <Collapsible open={showAdvancedDetails} onOpenChange={setShowAdvancedDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    高级选项
                  </span>
                  {showAdvancedDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  {dialog.details}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Processing progress */}
          {isProcessing && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">准备操作...</span>
                <span className="text-sm">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <AlertDialogFooter className="flex-shrink-0">
          <AlertDialogCancel disabled={isProcessing} className="flex-1">
            {dialog.cancelLabel || "取消"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!operationSummary.canProcess || isProcessing}
            className={cn(
              "flex-1",
              dialog.variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                处理中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {operationInfo.icon}
                {dialog.confirmLabel || "确认操作"}
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
