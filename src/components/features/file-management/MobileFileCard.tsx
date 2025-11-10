/**
 * Mobile File Card - Touch-optimized file card with swipe actions
 * Supports gesture interactions and mobile-friendly file management
 */

"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Download,
  Share2,
  Check,
  Clock,
  AlertCircle,
  Mic,
  FileAudio
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useFileStatus } from "@/hooks/useFileStatus";
import type { FileRow } from "@/types/db/database";
import { FileStatus } from "@/types/db/database";
import { formatFileSize, formatDate } from "@/lib/utils/format";

interface MobileFileCardProps {
  file: FileRow;
  viewMode: "grid" | "list";
  isSelected: boolean;
  isBulkMode: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  onClick?: () => void;
  className?: string;
}

export default function MobileFileCard({
  file,
  viewMode,
  isSelected,
  isBulkMode,
  onSelect,
  onDelete,
  onTouchStart,
  onTouchEnd,
  onClick,
  className,
}: MobileFileCardProps) {
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [showActions, setShowActions] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const { data: statusData } = useFileStatus(file.id || 0);

  // Handle swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isBulkMode) return;

    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
    onTouchStart?.();
  }, [isBulkMode, onTouchStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping || isBulkMode) return;

    currentX.current = e.touches[0].clientX;
    const deltaX = currentX.current - startX.current;

    // Only allow left swipe (reveal actions)
    if (deltaX < 0) {
      setSwipeX(Math.max(deltaX, -80)); // Max 80px swipe
    }
  }, [isSwiping, isBulkMode]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isSwiping || isBulkMode) return;

    const deltaX = currentX.current - startX.current;

    // If swipe is significant, show actions
    if (deltaX < -40) {
      setShowActions(true);
      setSwipeX(-80);
    } else {
      setShowActions(false);
      setSwipeX(0);
    }

    setIsSwiping(false);
    onTouchEnd?.(e);
  }, [isSwiping, isBulkMode, onTouchEnd]);

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowActions(false);
        setSwipeX(0);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get status display
  const getStatusDisplay = useCallback(() => {
    const status = file.status || FileStatus.UPLOADED;

    switch (status) {
      case FileStatus.TRANSCRIBING:
        return {
          icon: Clock,
          color: "text-blue-500 bg-blue-50",
          label: "转录中",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          showProgress: true,
        };
      case FileStatus.COMPLETED:
        return {
          icon: Check,
          color: "text-green-500 bg-green-50",
          label: "已转录",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          showProgress: false,
        };
      case FileStatus.ERROR:
        return {
          icon: AlertCircle,
          color: "text-red-500 bg-red-50",
          label: "转录失败",
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          showProgress: false,
        };
      default:
        return {
          icon: Mic,
          color: "text-gray-500 bg-gray-50",
          label: "未转录",
          bgColor: "bg-gray-50",
          textColor: "text-gray-700",
          showProgress: false,
        };
    }
  }, [file.status]);

  const status = getStatusDisplay();
  const isGridMode = viewMode === "grid";

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        className,
      )}
      style={{
        transform: `translateX(${swipeX}px)`,
      }}
    >
      {/* Swipe actions overlay */}
      <div className="absolute inset-y-0 right-0 w-20 bg-background border-l flex items-center justify-center z-10">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main card content */}
      <Card
        className={cn(
          "transition-all duration-200 touch-manipulation",
          isSelected && "ring-2 ring-primary ring-offset-2",
          isGridMode ? "h-full" : "",
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
      >
        <CardContent className={cn(
          "p-3 relative",
          isGridMode ? "flex flex-col h-full" : "flex items-center gap-3"
        )}>
          {/* Selection checkbox for bulk mode */}
          {isBulkMode && (
            <div className="absolute top-2 left-2 z-10">
              <div
                className={cn(
                  "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground bg-background",
                )}
              >
                {isSelected && <Check className="h-4 w-4" />}
              </div>
            </div>
          )}

          {/* File icon/preview */}
          <div className={cn(
            "flex items-center justify-center",
            isGridMode ? "w-full h-20 mb-2" : "w-12 h-12 flex-shrink-0"
          )}>
            <div className={cn(
              "w-full h-full rounded-lg flex items-center justify-center",
              status.bgColor
            )}>
              <FileAudio className={cn(
                "h-8 w-8",
                status.textColor
              )} />
            </div>
          </div>

          {/* File info */}
          <div className={cn(
            "flex-1 min-w-0",
            isGridMode ? "text-center" : ""
          )}>
            <h3 className={cn(
              "font-medium text-sm truncate mb-1",
              isGridMode ? "text-xs" : "text-sm"
            )}>
              {file.name}
            </h3>

            <div className={cn(
              "flex items-center gap-2 text-xs text-muted-foreground",
              isGridMode ? "flex-col gap-1" : "flex-wrap"
            )}>
              <span>{formatFileSize(file.size || 0)}</span>
              <span>•</span>
              <span>{formatDate(file.uploadedAt)}</span>
            </div>

            {/* Status badge */}
            <div className={cn(
              "mt-2",
              isGridMode ? "flex justify-center" : "flex items-center"
            )}>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  status.color,
                  isGridMode ? "w-full justify-center" : ""
                )}
              >
                <status.icon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            {/* Progress bar for transcribing files */}
            {status.showProgress && statusData?.progress && (
              <div className="mt-2 w-full">
                <Progress
                  value={statusData.progress.progress}
                  className="h-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {statusData.progress.message}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons (non-bulk mode) */}
          {!isBulkMode && !isGridMode && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelect}
                className="h-8 w-8 p-0"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
