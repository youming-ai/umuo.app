/**
 * Bulk Operations - Multi-file action interface for mobile
 * Provides touch-friendly bulk operations with confirmation dialogs
 */

"use client";

import React, { useState } from "react";
import {
  Trash2,
  Download,
  Share2,
  Mic,
  Loader2,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BulkOperationsProps {
  selectedFiles: Set<number>;
  onDelete?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onTranscribe?: () => void;
  className?: string;
}

interface BulkProgress {
  operation: string;
  current: number;
  total: number;
  message: string;
}

export default function BulkOperations({
  selectedFiles,
  onDelete,
  onDownload,
  onShare,
  onTranscribe,
  className,
}: BulkOperationsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const fileCount = selectedFiles.size;

  const handleBulkDelete = async () => {
    if (!onDelete) return;

    setIsProcessing(true);
    setProgress({
      operation: "delete",
      current: 0,
      total: fileCount,
      message: `准备删除 ${fileCount} 个文件...`,
    });

    try {
      // Simulate progress for demo
      for (let i = 0; i < fileCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate processing time
        setProgress(prev => prev ? ({
          ...prev,
          current: i + 1,
          message: `已删除 ${i + 1}/${fileCount} 个文件...`,
        }) : null);
      }

      await onDelete();

      toast({
        title: "批量删除完成",
        description: `已成功删除 ${fileCount} 个文件`,
      });
    } catch (error) {
      toast({
        title: "批量删除失败",
        description: error instanceof Error ? error.message : "删除文件时发生错误",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
      setShowDeleteDialog(false);
    }
  };

  const handleBulkDownload = async () => {
    if (!onDownload) return;

    setIsProcessing(true);
    setProgress({
      operation: "download",
      current: 0,
      total: fileCount,
      message: `准备下载 ${fileCount} 个文件...`,
    });

    try {
      // Simulate progress for demo
      for (let i = 0; i < fileCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setProgress(prev => prev ? ({
          ...prev,
          current: i + 1,
          message: `已下载 ${i + 1}/${fileCount} 个文件...`,
        }) : null);
      }

      await onDownload();

      toast({
        title: "批量下载完成",
        description: `已成功下载 ${fileCount} 个文件`,
      });
    } catch (error) {
      toast({
        title: "批量下载失败",
        description: error instanceof Error ? error.message : "下载文件时发生错误",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleBulkShare = async () => {
    if (!onShare) return;

    try {
      await onShare();

      toast({
        title: "分享链接已创建",
        description: `已为 ${fileCount} 个文件创建分享链接`,
      });
    } catch (error) {
      toast({
        title: "分享失败",
        description: error instanceof Error ? error.message : "创建分享链接时发生错误",
        variant: "destructive",
      });
    }
  };

  const handleBulkTranscribe = async () => {
    if (!onTranscribe) return;

    setIsProcessing(true);
    setProgress({
      operation: "transcribe",
      current: 0,
      total: fileCount,
      message: `准备转录 ${fileCount} 个文件...`,
    });

    try {
      // Simulate progress for demo
      for (let i = 0; i < fileCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(prev => prev ? ({
          ...prev,
          current: i + 1,
          message: `已开始转录 ${i + 1}/${fileCount} 个文件...`,
        }) : null);
      }

      await onTranscribe();

      toast({
        title: "批量转录已开始",
        description: `已开始转录 ${fileCount} 个文件`,
      });
    } catch (error) {
      toast({
        title: "批量转录失败",
        description: error instanceof Error ? error.message : "开始转录时发生错误",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  if (fileCount === 0) {
    return null;
  }

  return (
    <>
      <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-30",
        className
      )}>
        {/* Progress display */}
        {isProcessing && progress && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{progress.message}</span>
              <Badge variant="secondary">
                {progress.current}/{progress.total}
              </Badge>
            </div>
            <Progress
              value={(progress.current / progress.total) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isProcessing}
            className="flex-shrink-0 touch-manipulation"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDownload}
            disabled={isProcessing}
            className="flex-shrink-0 touch-manipulation"
          >
            <Download className="h-4 w-4 mr-2" />
            下载
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkShare}
            disabled={isProcessing}
            className="flex-shrink-0 touch-manipulation"
          >
            <Share2 className="h-4 w-4 mr-2" />
            分享
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleBulkTranscribe}
            disabled={isProcessing}
            className="flex-shrink-0 touch-manipulation"
          >
            <Mic className="h-4 w-4 mr-2" />
            转录
          </Button>

          {isProcessing && (
            <Button variant="outline" size="sm" disabled className="flex-shrink-0">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              处理中...
            </Button>
          )}
        </div>

        {/* Selection summary */}
        <div className="mt-2 text-center">
          <Badge variant="secondary" className="text-xs">
            已选择 {fileCount} 个文件
          </Badge>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              确认删除
            </AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这 {fileCount} 个文件吗？此操作无法撤销。
              所有相关数据包括转录结果都将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  确认删除
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
