/**
 * File Preview - Mobile file preview with zoom and pan capabilities
 * Provides touch-friendly file preview with metadata display
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Download,
  Share2,
  Play,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileAudio,
  Clock,
  Calendar,
  HardDrive,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useFileStatus } from "@/hooks/useFileStatus";
import type { FileRow } from "@/types/db/database";
import { FileStatus } from "@/types/db/database";
import { formatFileSize, formatDate } from "@/lib/utils/format";

interface FilePreviewProps {
  file: FileRow;
  isOpen: boolean;
  onClose: () => void;
  onPlay?: () => void;
  className?: string;
}

export default function FilePreview({
  file,
  isOpen,
  onClose,
  onPlay,
  className,
}: FilePreviewProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const contentRef = useRef<HTMLDivElement>(null);
  const { data: statusData } = useFileStatus(file.id || 0);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Handle pan/drag
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (scale <= 1) return;

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  }, [scale, position]);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || scale <= 1) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  }, [isDragging, scale, dragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  }, []);

  // Reset zoom when file changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, [file]);

  // Get status display
  const getStatusDisplay = useCallback(() => {
    const status = file.status || FileStatus.UPLOADED;

    switch (status) {
      case FileStatus.TRANSCRIBING:
        return {
          icon: Clock,
          color: "text-blue-500 bg-blue-50",
          label: "转录中",
          variant: "default" as const,
        };
      case FileStatus.COMPLETED:
        return {
          icon: Check,
          color: "text-green-500 bg-green-50",
          label: "已转录",
          variant: "default" as const,
        };
      case FileStatus.ERROR:
        return {
          icon: X,
          color: "text-red-500 bg-red-50",
          label: "转录失败",
          variant: "destructive" as const,
        };
      default:
        return {
          icon: FileAudio,
          color: "text-gray-500 bg-gray-50",
          label: "未转录",
          variant: "secondary" as const,
        };
    }
  }, [file.status]);

  const status = getStatusDisplay();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] max-h-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {file.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                className="h-8 w-8 p-0"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Preview content */}
          <div
            ref={contentRef}
            className="flex-1 flex items-center justify-center bg-muted/50 overflow-hidden relative touch-manipulation"
            onWheel={handleWheel}
          >
            <div
              className={cn(
                "flex items-center justify-center transition-transform duration-200 cursor-move",
                isDragging && "cursor-grabbing"
              )}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center',
              }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              {/* Audio file preview */}
              <div className="w-64 h-64 bg-background rounded-lg shadow-lg flex flex-col items-center justify-center p-6">
                <FileAudio className="h-24 w-24 text-muted-foreground mb-4" />
                <div className="text-center">
                  <p className="font-medium text-lg mb-2">{file.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatFileSize(file.size || 0)}
                  </p>
                </div>

                {/* Play button */}
                {file.status === FileStatus.COMPLETED && onPlay && (
                  <Button
                    onClick={onPlay}
                    className="mt-6 touch-manipulation"
                    size="lg"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    播放
                  </Button>
                )}
              </div>
            </div>

            {/* Zoom indicator */}
            {scale !== 1 && (
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur px-2 py-1 rounded-md text-xs">
                {Math.round(scale * 100)}%
              </div>
            )}
          </div>

          {/* File metadata */}
          <div className="border-t bg-background p-4">
            <div className="space-y-4">
              {/* Status and actions */}
              <div className="flex items-center justify-between">
                <Badge variant={status.variant} className="text-sm">
                  <status.icon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Progress for transcribing files */}
              {file.status === FileStatus.TRANSCRIBING && statusData?.progress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">转录进度</span>
                    <span>{Math.round(statusData.progress.progress)}%</span>
                  </div>
                  <Progress value={statusData.progress.progress} className="h-2" />
                  {statusData.progress.message && (
                    <p className="text-xs text-muted-foreground">
                      {statusData.progress.message}
                    </p>
                  )}
                </div>
              )}

              {/* File details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">大小:</span>
                  <span>{formatFileSize(file.size || 0)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">上传:</span>
                  <span>{formatDate(file.uploadedAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">类型:</span>
                  <span>{file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-xs">{file.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
