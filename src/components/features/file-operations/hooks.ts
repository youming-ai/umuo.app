/**
 * Bulk File Operations Hooks
 * Comprehensive state management and processing for bulk file operations
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db/db";
import { FileStatus } from "@/types/db/database";
import type {
  BulkOperationConfig,
  OperationProgress,
  OperationResult,
  SelectionState,
  OperationQueue,
  BulkAction,
  FileInfo,
  OperationStatus,
  BulkOperationType,
  MobileOptimizations,
  AccessibilityFeatures,
} from "./types";

// Query keys for bulk operations
export const bulkOperationsKeys = {
  all: ["bulkOperations"] as const,
  progress: (operationId: string) => [...bulkOperationsKeys.all, "progress", operationId] as const,
  queue: () => [...bulkOperationsKeys.all, "queue"] as const,
  selection: () => [...bulkOperationsKeys.all, "selection"] as const,
};

// Selection management hook
export function useBulkSelection(
  initialFiles: FileInfo[],
  mobileOptimizations?: Partial<MobileOptimizations>
) {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedFileIds: new Set(),
    selectedFiles: [],
    selectionMode: "multiple",
    totalSelected: 0,
    totalSize: 0,
    canTranscribe: 0,
    canDownload: 0,
    canShare: 0,
    canDelete: 0,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const touchStartRef = useRef<{ x: number; y: number; time: number }>();

  // Calculate selection statistics
  const calculateSelectionStats = useCallback((fileIds: Set<number>, files: FileInfo[]) => {
    const selectedFiles = files.filter(file => fileIds.has(file.id!));
    const totalSize = selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    const canTranscribe = selectedFiles.filter(file => file.canTranscribe !== false).length;
    const canDownload = selectedFiles.filter(file => file.canDownload !== false).length;
    const canShare = selectedFiles.filter(file => file.canShare !== false).length;
    const canDelete = selectedFiles.filter(file => file.canDelete !== false).length;

    return {
      selectedFiles,
      totalSize,
      canTranscribe,
      canDownload,
      canShare,
      canDelete,
    };
  }, []);

  // Toggle file selection
  const toggleFileSelection = useCallback((fileId: number, files: FileInfo[], mode: SelectionMode = "multiple") => {
    setSelectionState(prev => {
      const newSelectedIds = new Set(prev.selectedFileIds);

      if (mode === "single") {
        newSelectedIds.clear();
        newSelectedIds.add(fileId);
      } else if (newSelectedIds.has(fileId)) {
        newSelectedIds.delete(fileId);
      } else {
        newSelectedIds.add(fileId);
      }

      const stats = calculateSelectionStats(newSelectedIds, files);

      return {
        ...prev,
        selectedFileIds: newSelectedIds,
        selectedFiles: stats.selectedFiles,
        selectionMode: mode,
        lastSelectedId: fileId,
        totalSelected: newSelectedIds.size,
        ...stats,
      };
    });
  }, [calculateSelectionStats]);

  // Select range of files
  const selectRange = useCallback((startId: number, endId: number, files: FileInfo[]) => {
    const startIndex = files.findIndex(f => f.id === startId);
    const endIndex = files.findIndex(f => f.id === endId);

    if (startIndex === -1 || endIndex === -1) return;

    const rangeStart = Math.min(startIndex, endIndex);
    const rangeEnd = Math.max(startIndex, endIndex);
    const rangeFileIds = new Set(
      files.slice(rangeStart, rangeEnd + 1).map(f => f.id!).filter(Boolean)
    );

    setSelectionState(prev => {
      const newSelectedIds = new Set(prev.selectedFileIds);
      rangeFileIds.forEach(id => newSelectedIds.add(id));

      const stats = calculateSelectionStats(newSelectedIds, files);

      return {
        ...prev,
        selectedFileIds: newSelectedIds,
        selectedFiles: stats.selectedFiles,
        selectionMode: "range",
        selectionRange: { start: startIndex, end: endIndex },
        totalSelected: newSelectedIds.size,
        ...stats,
      };
    });
  }, [calculateSelectionStats]);

  // Select all files
  const selectAll = useCallback((files: FileInfo[], selected: boolean = true) => {
    const fileIds = new Set(files.map(f => f.id!).filter(Boolean));

    setSelectionState(prev => {
      const newSelectedIds = selected ? fileIds : new Set();
      const stats = calculateSelectionStats(newSelectedIds, files);

      return {
        ...prev,
        selectedFileIds: newSelectedIds,
        selectedFiles: stats.selectedFiles,
        totalSelected: newSelectedIds.size,
        ...stats,
      };
    });
  }, [calculateSelectionStats]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectionState(prev => ({
      ...prev,
      selectedFileIds: new Set(),
      selectedFiles: [],
      totalSelected: 0,
      totalSize: 0,
      canTranscribe: 0,
      canDownload: 0,
      canShare: 0,
      canDelete: 0,
    }));
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, fileId: number) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    if (mobileOptimizations?.longPressDelay) {
      longPressTimerRef.current = setTimeout(() => {
        // Long press detected - enter selection mode
        toggleFileSelection(fileId, initialFiles);

        // Provide haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, mobileOptimizations.longPressDelay);
    }
  }, [toggleFileSelection, initialFiles, mobileOptimizations]);

  const handleTouchEnd = useCallback((e: React.TouchEvent, fileId: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }

    const touchEnd = e.changedTouches[0];
    const touchStart = touchStartRef.current;

    if (touchStart && touchEnd) {
      const deltaX = Math.abs(touchEnd.clientX - touchStart.x);
      const deltaY = Math.abs(touchEnd.clientY - touchStart.y);
      const deltaTime = Date.now() - touchStart.time;

      // Check for swipe gesture
      const threshold = mobileOptimizations?.swipeThreshold || 50;
      if (deltaX > threshold && deltaY < threshold && deltaTime < 300) {
        // Swipe detected - could be used for quick actions
        console.log("Swipe gesture detected for file:", fileId);
      }
    }
  }, [mobileOptimizations]);

  return {
    selectionState,
    toggleFileSelection,
    selectRange,
    selectAll,
    clearSelection,
    handleTouchStart,
    handleTouchEnd,
  };
}

// Bulk operations queue management
export function useBulkOperationsQueue() {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<OperationQueue>({
    operations: [],
    maxConcurrent: 3,
    maxQueueSize: 50,
    enablePrioritization: true,
    isProcessing: false,
    isPaused: false,
    currentOperations: [],
    totalProcessed: 0,
    averageProcessingTime: 0,
    successRate: 0,
  });

  const [activeOperations, setActiveOperations] = useState<Map<string, OperationProgress>>(new Map());

  // Add operation to queue
  const addToQueue = useCallback((config: BulkOperationConfig) => {
    const operationId = `${config.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const operation = {
      id: operationId,
      config,
      status: "pending" as OperationStatus,
    };

    setQueue(prev => {
      const newOperations = [...prev.operations, operation];

      // Sort by priority if prioritization is enabled
      if (prev.enablePrioritization) {
        newOperations.sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
          const aPriority = priorityOrder[a.config.priority || "normal"];
          const bPriority = priorityOrder[b.config.priority || "normal"];
          return aPriority - bPriority;
        });
      }

      return {
        ...prev,
        operations: newOperations.slice(-prev.maxQueueSize), // Keep only last maxQueueSize operations
      };
    });

    return operationId;
  }, []);

  // Process next operations in queue
  const processQueue = useCallback(async () => {
    setQueue(prev => ({ ...prev, isProcessing: true }));

    while (true) {
      const currentQueue = queue;

      if (currentQueue.isPaused || currentQueue.currentOperations.length >= currentQueue.maxConcurrent) {
        break;
      }

      // Get next pending operation
      const nextOperation = currentQueue.operations.find(op => op.status === "pending");
      if (!nextOperation) {
        break;
      }

      // Update operation status to processing
      setQueue(prev => ({
        ...prev,
        operations: prev.operations.map(op =>
          op.id === nextOperation.id ? { ...op, status: "processing" } : op
        ),
        currentOperations: [...prev.currentOperations, nextOperation.id],
      }));

      // Start processing operation
      processOperation(nextOperation.id, nextOperation.config);
    }

    setQueue(prev => ({ ...prev, isProcessing: false }));
  }, [queue]);

  // Process individual operation
  const processOperation = useCallback(async (operationId: string, config: BulkOperationConfig) => {
    const startTime = new Date();
    const totalFiles = config.fileIds.length;

    let progress: OperationProgress = {
      operationId,
      type: config.type,
      status: "preparing",
      totalFiles,
      completedFiles: 0,
      failedFiles: 0,
      startTime,
      elapsedTime: 0,
      averageTimePerFile: 0,
      totalBytes: 0,
      processedBytes: 0,
      message: `准备${getOperationLabel(config.type)}...`,
    };

    setActiveOperations(prev => new Map(prev).set(operationId, progress));

    try {
      // Get file information
      const files = await db.files.bulkGet(config.fileIds);
      const validFiles = files.filter(file => file !== undefined);
      const totalBytes = validFiles.reduce((sum, file) => sum + (file?.size || 0), 0);

      progress = {
        ...progress,
        totalBytes,
        status: "processing",
        message: `开始${getOperationLabel(config.type)} ${totalFiles} 个文件...`,
      };

      // Execute operation based on type
      const result = await executeBulkOperation(config, (update) => {
        progress = { ...progress, ...update };
        setActiveOperations(prev => new Map(prev).set(operationId, progress));
        config.progressCallback?.(progress);
      });

      // Operation completed successfully
      const finalProgress: OperationProgress = {
        ...progress,
        status: "completed",
        completedFiles: result.successfulFiles.length,
        failedFiles: result.failedFiles.length,
        message: `${getOperationLabel(config.type)}完成`,
      };

      setActiveOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });

      // Update queue
      setQueue(prev => ({
        ...prev,
        operations: prev.operations.map(op =>
          op.id === operationId ? { ...op, status: "completed", result } : op
        ),
        currentOperations: prev.currentOperations.filter(id => id !== operationId),
        totalProcessed: prev.totalProcessed + 1,
      }));

      config.completionCallback?.(result);

    } catch (error) {
      // Operation failed
      const errorProgress: OperationProgress = {
        ...progress,
        status: "failed",
        message: `${getOperationLabel(config.type)}失败: ${error instanceof Error ? error.message : "未知错误"}`,
        lastError: error instanceof Error ? error.message : "未知错误",
      };

      setActiveOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });

      setQueue(prev => ({
        ...prev,
        operations: prev.operations.map(op =>
          op.id === operationId ? { ...op, status: "failed" } : op
        ),
        currentOperations: prev.currentOperations.filter(id => id !== operationId),
      }));
    }
  }, []);

  // Cancel operation
  const cancelOperation = useCallback((operationId: string) => {
    setActiveOperations(prev => {
      const newMap = new Map(prev);
      const operation = newMap.get(operationId);

      if (operation) {
        operation.status = "cancelled";
        operation.message = "操作已取消";
      }

      return newMap;
    });

    setQueue(prev => ({
      ...prev,
      operations: prev.operations.map(op =>
        op.id === operationId ? { ...op, status: "cancelled" } : op
      ),
      currentOperations: prev.currentOperations.filter(id => id !== operationId),
    }));
  }, []);

  // Pause/resume queue
  const toggleQueuePause = useCallback(() => {
    setQueue(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  // Clear completed operations
  const clearCompleted = useCallback(() => {
    setQueue(prev => ({
      ...prev,
      operations: prev.operations.filter(op =>
        op.status === "pending" || op.status === "processing"
      ),
    }));
  }, []);

  return {
    queue,
    activeOperations,
    addToQueue,
    processQueue,
    cancelOperation,
    toggleQueuePause,
    clearCompleted,
  };
}

// Bulk delete operation
export function useBulkDelete() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      fileIds,
      onProgress,
    }: {
      fileIds: number[];
      onProgress?: (current: number, total: number, message: string) => void;
    }) => {
      const total = fileIds.length;

      for (let i = 0; i < total; i++) {
        const fileId = fileIds[i];

        try {
          onProgress?.(i + 1, total, `删除文件 ${i + 1}/${total}`);

          // Delete from IndexedDB
          await db.files.delete(fileId);

          // Delete related transcripts and segments
          const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
          for (const transcript of transcripts) {
            await db.segments.where("transcriptId").equals(transcript.id!).delete();
            await db.transcripts.delete(transcript.id!);
          }

        } catch (error) {
          console.error(`Failed to delete file ${fileId}:`, error);
          throw error;
        }

        // Small delay to prevent UI blocking
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      return { deletedCount: total };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["files"] });

      toast({
        title: "批量删除完成",
        description: `已成功删除 ${result.deletedCount} 个文件`,
      });
    },
    onError: (error) => {
      toast({
        title: "批量删除失败",
        description: error instanceof Error ? error.message : "删除文件时发生错误",
        variant: "destructive",
      });
    },
  });
}

// Bulk transcribe operation
export function useBulkTranscribe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      fileIds,
      onProgress,
      config = {},
    }: {
      fileIds: number[];
      onProgress?: (current: number, total: number, message: string) => void;
      config?: Partial<BulkOperationConfig>;
    }) => {
      const total = fileIds.length;
      const results: { successful: number[]; failed: Array<{ id: number; error: string }> } = {
        successful: [],
        failed: [],
      };

      for (let i = 0; i < total; i++) {
        const fileId = fileIds[i];

        try {
          onProgress?.(i + 1, total, `开始转录文件 ${i + 1}/${total}`);

          // Update file status
          await db.files.update(fileId, { status: FileStatus.TRANSCRIBING });

          // Start transcription
          const response = await fetch(`/api/transcribe?fileId=${fileId}&language=ja`, {
            method: "POST",
            body: await createFormData(fileId),
          });

          if (!response.ok) {
            throw new Error(`转录失败: ${response.statusText}`);
          }

          results.successful.push(fileId);

          // Update file status to completed
          await db.files.update(fileId, { status: FileStatus.COMPLETED });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "转录失败";
          results.failed.push({ id: fileId, error: errorMessage });

          // Update file status to error
          await db.files.update(fileId, { status: FileStatus.ERROR });
        }

        // Delay between transcriptions to prevent overwhelming the server
        if (config.retryDelay) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return results;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["files"] });

      const message = result.successful.length > 0
        ? `已开始转录 ${result.successful.length} 个文件`
        : "没有文件开始转录";

      toast({
        title: "批量转录完成",
        description: message,
        variant: result.failed.length > 0 ? "destructive" : "default",
      });
    },
    onError: (error) => {
      toast({
        title: "批量转录失败",
        description: error instanceof Error ? error.message : "开始转录时发生错误",
        variant: "destructive",
      });
    },
  });
}

// Helper functions
function getOperationLabel(type: BulkOperationType): string {
  const labels: Record<BulkOperationType, string> = {
    delete: "删除",
    download: "下载",
    share: "分享",
    transcribe: "转录",
    move: "移动",
    copy: "复制",
    export: "导出",
    organize: "整理",
    compress: "压缩",
    extract: "解压",
  };
  return labels[type] || "操作";
}

async function executeBulkOperation(
  config: BulkOperationConfig,
  onProgress: (progress: Partial<OperationProgress>) => void
): Promise<OperationResult> {
  const startTime = new Date();
  const operationId = `${config.type}-${startTime.getTime()}`;

  switch (config.type) {
    case "delete":
      return await executeBulkDelete(config, onProgress, startTime, operationId);
    case "transcribe":
      return await executeBulkTranscribe(config, onProgress, startTime, operationId);
    case "download":
      return await executeBulkDownload(config, onProgress, startTime, operationId);
    default:
      throw new Error(`Unsupported operation type: ${config.type}`);
  }
}

async function executeBulkDelete(
  config: BulkOperationConfig,
  onProgress: (progress: Partial<OperationProgress>) => void,
  startTime: Date,
  operationId: string
): Promise<OperationResult> {
  const successfulFiles: number[] = [];
  const failedFiles: Array<{ fileId: number; fileName: string; error: string }> = [];

  for (let i = 0; i < config.fileIds.length; i++) {
    const fileId = config.fileIds[i];

    try {
      onProgress({
        currentFileIndex: i,
        message: `删除文件 ${i + 1}/${config.fileIds.length}`,
      });

      // Delete file and related data
      await db.files.delete(fileId);
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
      for (const transcript of transcripts) {
        await db.segments.where("transcriptId").equals(transcript.id!).delete();
        await db.transcripts.delete(transcript.id!);
      }

      successfulFiles.push(fileId);

    } catch (error) {
      failedFiles.push({
        fileId,
        fileName: `文件 ${fileId}`,
        error: error instanceof Error ? error.message : "删除失败",
      });

      if (!config.continueOnError) {
        throw error;
      }
    }
  }

  const endTime = new Date();
  return {
    operationId,
    type: "delete",
    status: failedFiles.length === 0 ? "completed" : "completed",
    totalFiles: config.fileIds.length,
    successfulFiles,
    failedFiles,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    totalBytesProcessed: 0,
    averageProcessingRate: 0,
    warningCount: failedFiles.length,
  };
}

async function executeBulkTranscribe(
  config: BulkOperationConfig,
  onProgress: (progress: Partial<OperationProgress>) => void,
  startTime: Date,
  operationId: string
): Promise<OperationResult> {
  const successfulFiles: number[] = [];
  const failedFiles: Array<{ fileId: number; fileName: string; error: string }> = [];

  for (let i = 0; i < config.fileIds.length; i++) {
    const fileId = config.fileIds[i];

    try {
      onProgress({
        currentFileIndex: i,
        message: `开始转录文件 ${i + 1}/${config.fileIds.length}`,
      });

      // Update file status
      await db.files.update(fileId, { status: FileStatus.TRANSCRIBING });

      // Start transcription
      const response = await fetch(`/api/transcribe?fileId=${fileId}&language=ja`, {
        method: "POST",
        body: await createFormData(fileId),
      });

      if (!response.ok) {
        throw new Error(`转录失败: ${response.statusText}`);
      }

      successfulFiles.push(fileId);

      // Small delay between transcriptions
      if (config.retryDelay) {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }

    } catch (error) {
      failedFiles.push({
        fileId,
        fileName: `文件 ${fileId}`,
        error: error instanceof Error ? error.message : "转录失败",
      });

      await db.files.update(fileId, { status: FileStatus.ERROR });

      if (!config.continueOnError) {
        throw error;
      }
    }
  }

  const endTime = new Date();
  return {
    operationId,
    type: "transcribe",
    status: failedFiles.length === 0 ? "completed" : "completed",
    totalFiles: config.fileIds.length,
    successfulFiles,
    failedFiles,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    totalBytesProcessed: 0,
    averageProcessingRate: 0,
    warningCount: failedFiles.length,
  };
}

async function executeBulkDownload(
  config: BulkOperationConfig,
  onProgress: (progress: Partial<OperationProgress>) => void,
  startTime: Date,
  operationId: string
): Promise<OperationResult> {
  // Implementation for bulk download
  // This would involve creating ZIP files or individual downloads
  const successfulFiles: number[] = [];
  const failedFiles: Array<{ fileId: number; fileName: string; error: string }> = [];

  // Placeholder implementation
  for (let i = 0; i < config.fileIds.length; i++) {
    const fileId = config.fileIds[i];

    try {
      onProgress({
        currentFileIndex: i,
        message: `准备下载文件 ${i + 1}/${config.fileIds.length}`,
      });

      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 1000));
      successfulFiles.push(fileId);

    } catch (error) {
      failedFiles.push({
        fileId,
        fileName: `文件 ${fileId}`,
        error: error instanceof Error ? error.message : "下载失败",
      });
    }
  }

  const endTime = new Date();
  return {
    operationId,
    type: "download",
    status: "completed",
    totalFiles: config.fileIds.length,
    successfulFiles,
    failedFiles,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    totalBytesProcessed: 0,
    averageProcessingRate: 0,
    warningCount: failedFiles.length,
  };
}

async function createFormData(fileId: number): Promise<FormData> {
  const file = await db.files.get(fileId);
  if (!file || !file.blob) {
    throw new Error("文件不存在或数据已损坏");
  }

  const formData = new FormData();
  formData.append("audio", file.blob, file.name);
  formData.append("meta", JSON.stringify({ fileId: fileId.toString() }));

  return formData;
}
