/**
 * FileSelector - Touch-optimized multi-file selection interface
 * Provides comprehensive file selection with mobile gestures and accessibility
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Check,
  X,
  ChevronDown,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  FileAudio,
  FileVideo,
  File,
  Clock,
  Calendar,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  FileSelectorProps,
  FileInfo,
  SelectionState,
  TouchMode,
  SelectionMode,
} from "./types";
import { TouchUtils, FileOperationUtils } from "./utils";

export default function FileSelector({
  files,
  selectionState,
  onSelectionChange,
  showFilePreview = true,
  showFileSize = true,
  showFileDate = true,
  showFileStatus = true,
  selectionMode = "multiple",
  touchMode = "tap",
  enableDragSelection = false,
  enableKeyboardSelection = true,
  longPressDelay = 500,
  swipeThreshold = 50,
  enableHapticFeedback = true,
  className,
}: FileSelectorProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [filterStatus, setFilterStatus] = useState<"all" | "selected" | "unselected">("all");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout>();

  // Filter and sort files
  const filteredFiles = React.useMemo(() => {
    let filtered = files;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply selection filter
    if (filterStatus === "selected") {
      filtered = filtered.filter(file => selectionState.selectedFileIds.has(file.id!));
    } else if (filterStatus === "unselected") {
      filtered = filtered.filter(file => !selectionState.selectedFileIds.has(file.id!));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0);
        case "size":
          return (b.size || 0) - (a.size || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [files, searchQuery, filterStatus, sortBy, selectionState.selectedFileIds]);

  // Handle file selection
  const handleFileSelect = useCallback((fileId: number, event?: React.MouseEvent | React.TouchEvent) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // Prevent selection if file is being processed
    if (file.operationStatus === "processing") {
      toast({
        title: "无法选择",
        description: "文件正在处理中，请稍后再试",
        variant: "destructive",
      });
      return;
    }

    const newSelectionState = { ...selectionState };
    const isSelected = selectionState.selectedFileIds.has(fileId);

    if (selectionMode === "single") {
      // Single selection mode
      newSelectionState.selectedFileIds.clear();
      newSelectionState.selectedFileIds.add(fileId);
      newSelectionState.selectedFiles = [file];
      newSelectionState.totalSelected = 1;
    } else if (event?.shiftKey && selectionState.lastSelectedId && enableKeyboardSelection) {
      // Range selection with Shift key
      const lastIndex = files.findIndex(f => f.id === selectionState.lastSelectedId);
      const currentIndex = files.findIndex(f => f.id === fileId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        newSelectionState.selectedFileIds.clear();
        for (let i = start; i <= end; i++) {
          if (files[i]) {
            newSelectionState.selectedFileIds.add(files[i].id!);
          }
        }

        newSelectionState.selectedFiles = files.filter((f, index) =>
          index >= start && index <= end
        );
        newSelectionState.selectionMode = "range";
      }
    } else {
      // Normal selection
      if (isSelected) {
        newSelectionState.selectedFileIds.delete(fileId);
      } else {
        newSelectionState.selectedFileIds.add(fileId);
      }

      newSelectionState.selectedFiles = files.filter(f =>
        newSelectionState.selectedFileIds.has(f.id!)
      );
      newSelectionState.lastSelectedId = fileId;
    }

    // Update selection statistics
    newSelectionState.totalSelected = newSelectionState.selectedFileIds.size;
    newSelectionState.totalSize = newSelectionState.selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    newSelectionState.canTranscribe = newSelectionState.selectedFiles.filter(f => f.canTranscribe !== false).length;
    newSelectionState.canDownload = newSelectionState.selectedFiles.filter(f => f.canDownload !== false).length;
    newSelectionState.canShare = newSelectionState.selectedFiles.filter(f => f.canShare !== false).length;
    newSelectionState.canDelete = newSelectionState.selectedFiles.filter(f => f.canDelete !== false).length;

    // Enable selection mode if files are selected
    if (newSelectionState.totalSelected > 0 && !isSelectionMode) {
      setIsSelectionMode(true);
    } else if (newSelectionState.totalSelected === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }

    onSelectionChange(newSelectionState);

    // Trigger haptic feedback
    if (enableHapticFeedback) {
      TouchUtils.triggerHapticFeedback("light");
    }
  }, [files, selectionState, selectionMode, enableKeyboardSelection, isSelectionMode, onSelectionChange, toast, enableHapticFeedback]);

  // Handle touch events
  const handleTouchStart = useCallback((e: React.TouchEvent, fileId: number) => {
    const touch = e.touches[0];
    const position = TouchUtils.getTouchPosition(e);

    setTouchStart({
      x: position.x,
      y: position.y,
      time: Date.now(),
    });

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      // Long press detected - enter selection mode if not already
      if (!isSelectionMode) {
        setIsSelectionMode(true);
        handleFileSelect(fileId);
      }

      if (enableHapticFeedback) {
        TouchUtils.triggerHapticFeedback("medium");
      }
    }, longPressDelay);
  }, [isSelectionMode, handleFileSelect, longPressDelay, enableHapticFeedback]);

  const handleTouchEnd = useCallback((e: React.TouchEvent, fileId: number) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }

    const touchEnd = e.changedTouches[0];
    const touchData = touchStart;

    if (touchData) {
      const deltaTime = Date.now() - touchData.time;
      const deltaX = Math.abs(touchEnd.clientX - touchData.x);
      const deltaY = Math.abs(touchEnd.clientY - touchData.y);

      // Check for tap (short touch without movement)
      if (deltaTime < 300 && deltaX < 10 && deltaY < 10) {
        // Normal tap
        if (isSelectionMode) {
          handleFileSelect(fileId);
        }
        // If not in selection mode, the long press would have handled it
      }

      // Check for swipe gesture
      if (deltaTime < 500 && (deltaX > swipeThreshold || deltaY > swipeThreshold)) {
        const swipe = TouchUtils.calculateSwipeDistance(
          touchData.x,
          touchData.y,
          touchEnd.clientX,
          touchEnd.clientY
        );

        // Handle swipe actions
        handleSwipeGesture(swipe, fileId);
      }
    }

    setTouchStart(null);
  }, [touchStart, isSelectionMode, handleFileSelect, swipeThreshold]);

  // Handle swipe gestures
  const handleSwipeGesture = useCallback((swipe: { distance: number; direction: "left" | "right" | "up" | "down" }, fileId: number) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // Implement swipe actions based on direction
    switch (swipe.direction) {
      case "left":
        // Swipe left - could be used for quick actions like delete
        if (enableHapticFeedback) {
          TouchUtils.triggerHapticFeedback("light");
        }
        console.log("Swipe left on file:", file.name);
        break;
      case "right":
        // Swipe right - could be used for quick actions like share
        if (enableHapticFeedback) {
          TouchUtils.triggerHapticFeedback("light");
        }
        console.log("Swipe right on file:", file.name);
        break;
    }
  }, [files, enableHapticFeedback]);

  // Handle drag selection
  const handleDragStart = useCallback((e: React.MouseEvent, fileIndex: number) => {
    if (!enableDragSelection || !isSelectionMode) return;

    setIsDragging(true);
    setDragStartIndex(fileIndex);

    if (enableHapticFeedback) {
      TouchUtils.triggerHapticFeedback("light");
    }
  }, [enableDragSelection, isSelectionMode, enableHapticFeedback]);

  const handleDragEnter = useCallback((e: React.MouseEvent, fileIndex: number) => {
    if (!isDragging || dragStartIndex === null) return;

    const file = filteredFiles[fileIndex];
    if (!file) return;

    const newSelectionState = { ...selectionState };
    const startIndex = Math.min(dragStartIndex, fileIndex);
    const endIndex = Math.max(dragStartIndex, fileIndex);

    // Select all files in the range
    newSelectionState.selectedFileIds.clear();
    for (let i = startIndex; i <= endIndex; i++) {
      if (filteredFiles[i]) {
        newSelectionState.selectedFileIds.add(filteredFiles[i].id!);
      }
    }

    newSelectionState.selectedFiles = filteredFiles.filter((f, index) =>
      index >= startIndex && index <= endIndex
    );
    newSelectionState.totalSelected = newSelectionState.selectedFileIds.size;

    onSelectionChange(newSelectionState);
  }, [isDragging, dragStartIndex, filteredFiles, selectionState, onSelectionChange]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStartIndex(null);
  }, []);

  // Select all files
  const handleSelectAll = useCallback(() => {
    const allFileIds = new Set(filteredFiles.map(f => f.id!).filter(Boolean));
    const newSelectionState = {
      ...selectionState,
      selectedFileIds: allFileIds,
      selectedFiles: filteredFiles,
      totalSelected: allFileIds.size,
      totalSize: filteredFiles.reduce((sum, file) => sum + (file.size || 0), 0),
      canTranscribe: filteredFiles.filter(f => f.canTranscribe !== false).length,
      canDownload: filteredFiles.filter(f => f.canDownload !== false).length,
      canShare: filteredFiles.filter(f => f.canShare !== false).length,
      canDelete: filteredFiles.filter(f => f.canDelete !== false).length,
    };

    setIsSelectionMode(true);
    onSelectionChange(newSelectionState);

    if (enableHapticFeedback) {
      TouchUtils.triggerHapticFeedback("medium");
    }
  }, [filteredFiles, selectionState, onSelectionChange, enableHapticFeedback]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    const newSelectionState = {
      ...selectionState,
      selectedFileIds: new Set(),
      selectedFiles: [],
      totalSelected: 0,
      totalSize: 0,
      canTranscribe: 0,
      canDownload: 0,
      canShare: 0,
      canDelete: 0,
    };

    setIsSelectionMode(false);
    onSelectionChange(newSelectionState);

    if (enableHapticFeedback) {
      TouchUtils.triggerHapticFeedback("light");
    }
  }, [selectionState, onSelectionChange, enableHapticFeedback]);

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

  // Render file item
  const renderFileItem = (file: FileInfo, index: number) => {
    const isSelected = selectionState.selectedFileIds.has(file.id!);
    const typeInfo = FileOperationUtils.getFileTypeInfo(file.name);

    if (viewMode === "grid") {
      return (
        <div
          key={file.id}
          className={cn(
            "relative p-3 border rounded-lg cursor-pointer transition-all",
            "hover:bg-muted/50 hover:border-muted-foreground/30",
            isSelected && "bg-primary/10 border-primary/50",
            file.operationStatus === "processing" && "opacity-50 cursor-not-allowed",
            isDragging && "select-none"
          )}
          onTouchStart={(e) => handleTouchStart(e, file.id!)}
          onTouchEnd={(e) => handleTouchEnd(e, file.id!)}
          onClick={() => isSelectionMode && handleFileSelect(file.id!)}
          onMouseDown={(e) => handleDragStart(e, index)}
          onMouseEnter={(e) => handleDragEnter(e, index)}
          onMouseUp={handleDragEnd}
        >
          {/* Selection checkbox */}
          {isSelectionMode && (
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleFileSelect(file.id!)}
              />
            </div>
          )}

          {/* File icon */}
          <div className="flex justify-center mb-2">
            <div className={cn(
              "p-3 rounded-full",
              isSelected ? "bg-primary/20" : "bg-muted"
            )}>
              {getFileIcon(file)}
            </div>
          </div>

          {/* File name */}
          <div className="text-sm font-medium truncate text-center mb-1">
            {file.name}
          </div>

          {/* File metadata */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            {showFileSize && (
              <div>{FileOperationUtils.formatFileSize(file.size || 0)}</div>
            )}
            {showFileDate && file.uploadedAt && (
              <div>{file.uploadedAt.toLocaleDateString()}</div>
            )}
            {showFileStatus && file.status && (
              <Badge variant="outline" className="text-xs">
                {file.status}
              </Badge>
            )}
          </div>

          {/* Processing overlay */}
          {file.operationStatus === "processing" && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="text-sm">处理中...</div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={file.id}
        className={cn(
          "flex items-center gap-3 p-3 border-b cursor-pointer transition-all",
          "hover:bg-muted/50",
          isSelected && "bg-primary/10 border-l-4 border-l-primary",
          file.operationStatus === "processing" && "opacity-50 cursor-not-allowed",
          isDragging && "select-none"
        )}
        onTouchStart={(e) => handleTouchStart(e, file.id!)}
        onTouchEnd={(e) => handleTouchEnd(e, file.id!)}
        onClick={() => isSelectionMode && handleFileSelect(file.id!)}
        onMouseDown={(e) => handleDragStart(e, index)}
        onMouseEnter={(e) => handleDragEnter(e, index)}
        onMouseUp={handleDragEnd}
      >
        {/* Selection checkbox */}
        {isSelectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => handleFileSelect(file.id!)}
          />
        )}

        {/* File icon */}
        <div className={cn(
          "p-2 rounded-lg",
          isSelected ? "bg-primary/20" : "bg-muted"
        )}>
          {getFileIcon(file)}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{file.name}</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {showFileSize && (
              <span>{FileOperationUtils.formatFileSize(file.size || 0)}</span>
            )}
            {showFileDate && file.uploadedAt && (
              <span>• {file.uploadedAt.toLocaleDateString()}</span>
            )}
            {file.duration && (
              <span>• {FileOperationUtils.formatDuration(file.duration * 1000)}</span>
            )}
          </div>
          {showFileStatus && file.status && (
            <Badge variant="outline" className="mt-1 text-xs">
              {file.status}
            </Badge>
          )}
        </div>

        {/* File actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleFileSelect(file.id!)}>
              {isSelected ? "取消选择" : "选择"}
            </DropdownMenuItem>
            <DropdownMenuItem>
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem>
              预览
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Processing overlay */}
        {file.operationStatus === "processing" && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-sm">处理中...</div>
          </div>
        )}
      </div>
    );
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("flex flex-col h-full", className)} ref={containerRef}>
      {/* Header controls */}
      <div className="flex items-center gap-2 p-4 border-b bg-background">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSelectionMode(!isSelectionMode)}
        >
          {isSelectionMode ? "取消选择" : "选择"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              筛选
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterStatus("all")}>
              全部文件
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus("selected")}>
              已选择
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterStatus("unselected")}>
              未选择
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
        >
          {viewMode === "list" ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
        </Button>
      </div>

      {/* Selection controls */}
      {isSelectionMode && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 border-b">
          <div className="flex-1">
            <span className="text-sm font-medium">
              已选择 {selectionState.totalSelected} 个文件
            </span>
            <span className="text-sm text-muted-foreground ml-2">
              ({FileOperationUtils.formatFileSize(selectionState.totalSize)})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredFiles.length === 0}
            >
              <Check className="h-4 w-4 mr-1" />
              全选
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              disabled={selectionState.totalSelected === 0}
            >
              <X className="h-4 w-4 mr-1" />
              清空
            </Button>
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <span className="text-sm text-muted-foreground">排序:</span>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">日期</SelectItem>
            <SelectItem value="name">名称</SelectItem>
            <SelectItem value="size">大小</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <File className="h-12 w-12 mb-2" />
            <div className="text-lg font-medium">没有找到文件</div>
            <div className="text-sm">尝试调整搜索条件或筛选器</div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {filteredFiles.map((file, index) => renderFileItem(file, index))}
          </div>
        ) : (
          <div>
            {filteredFiles.map((file, index) => renderFileItem(file, index))}
          </div>
        )}
      </div>

      {/* Drag selection overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-primary/5 pointer-events-none z-50" />
      )}
    </div>
  );
}
