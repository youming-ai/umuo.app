/**
 * Mobile File Grid - Virtualized file grid with touch-optimized interactions
 * Supports both grid and list view modes with gesture support
 */

"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import type { FileRow } from "@/types/db/database";
import MobileFileCard from "./MobileFileCard";

interface MobileFileGridProps {
  files: FileRow[];
  viewMode: "grid" | "list";
  selectedFiles: Set<number>;
  isBulkMode: boolean;
  onFileSelect?: (fileId: number) => void;
  onFilePreview?: (file: FileRow) => void;
  onFileDelete?: (fileId: number) => void;
  onToggleSelection: (fileId: number) => void;
  onToggleBulkMode: () => void;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const MobileFileGrid = React.forwardRef<HTMLDivElement, MobileFileGridProps>(
  (
    {
      files,
      viewMode,
      selectedFiles,
      isBulkMode,
      onFileSelect,
      onFilePreview,
      onFileDelete,
      onToggleSelection,
      onToggleBulkMode,
      className,
    },
    ref,
  ) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPressing = useRef(false);

    // Handle long press for bulk selection
    const handleLongPress = useCallback(
      (file: FileRow) => {
        if (!isBulkMode && file.id) {
          onToggleBulkMode();
          onToggleSelection(file.id);
        }
      },
      [isBulkMode, onToggleBulkMode, onToggleSelection],
    );

    // Handle touch start
    const handleTouchStart = useCallback(
      (file: FileRow) => {
        if (!isBulkMode) {
          isLongPressing.current = false;
          longPressTimer.current = setTimeout(() => {
            isLongPressing.current = true;
            handleLongPress(file);
          }, 500); // 500ms for long press
        }
      },
      [isBulkMode, handleLongPress],
    );

    // Handle touch end
    const handleTouchEnd = useCallback(
      (file: FileRow, event: React.TouchEvent) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // If it was a long press, don't handle the tap
        if (isLongPressing.current) {
          isLongPressing.current = false;
          event.preventDefault();
          return;
        }

        // Handle normal tap
        if (isBulkMode && file.id) {
          onToggleSelection(file.id);
        } else if (!isBulkMode && onFilePreview) {
          onFilePreview(file);
        }
      },
      [isBulkMode, onToggleSelection, onFilePreview],
    );

    // Handle click (for desktop)
    const handleClick = useCallback(
      (file: FileRow) => {
        if (isBulkMode && file.id) {
          onToggleSelection(file.id);
        } else if (!isBulkMode && onFilePreview) {
          onFilePreview(file);
        }
      },
      [isBulkMode, onToggleSelection, onFilePreview],
    );

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
      };
    }, []);

    // Virtualizer configuration
    const rowVirtualizer = useVirtualizer({
      count: Math.ceil(files.length / getColumnsCount()),
      getScrollElement: () => gridRef.current,
      estimateSize: () => (viewMode === "grid" ? 160 : 80),
      overscan: 5,
    });

    // Get number of columns based on view mode
    function getColumnsCount(): number {
      return viewMode === "grid" ? 2 : 1;
    }

    // Render file item
    const renderFileItem = useCallback(
      (file: FileRow, index: number) => {
        const isSelected = selectedFiles.has(file.id || 0);

        return (
          <MobileFileCard
            key={file.id || index}
            file={file}
            viewMode={viewMode}
            isSelected={isSelected}
            isBulkMode={isBulkMode}
            onSelect={() => onFileSelect?.(file.id!)}
            onDelete={() => onFileDelete?.(file.id!)}
            onTouchStart={() => handleTouchStart(file)}
            onTouchEnd={(e) => handleTouchEnd(file, e)}
            onClick={() => handleClick(file)}
            className="touch-manipulation"
          />
        );
      },
      [
        selectedFiles,
        isBulkMode,
        onFileSelect,
        onFileDelete,
        handleTouchStart,
        handleTouchEnd,
        handleClick,
        viewMode,
      ],
    );

    // Render grid row
    const renderGridRow = useCallback(
      (rowIndex: number) => {
        const columnsCount = getColumnsCount();
        const startIndex = rowIndex * columnsCount;
        const endIndex = Math.min(startIndex + columnsCount, files.length);

        return (
          <div
            key={rowIndex}
            className={cn(
              "flex gap-3",
              viewMode === "grid" ? "flex-row" : "flex-col",
            )}
            style={{
              height: viewMode === "grid" ? "160px" : "auto",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
            }}
          >
            {Array.from({ length: endIndex - startIndex }, (_, i) => {
              const fileIndex = startIndex + i;
              const file = files[fileIndex];

              if (!file) return null;

              return (
                <div
                  key={file.id || fileIndex}
                  className={cn(
                    viewMode === "grid" ? "flex-1" : "w-full",
                  )}
                >
                  {renderFileItem(file, fileIndex)}
                </div>
              );
            })}
          </div>
        );
      },
      [files, viewMode, getColumnsCount, renderFileItem],
    );

    if (files.length === 0) {
      return (
        <div
          ref={gridRef}
          className={cn(
            "flex items-center justify-center h-full",
            className,
          )}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-muted-foreground">没有文件</p>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={(node) => {
          gridRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(
          "h-full overflow-auto",
          viewMode === "grid" ? "px-1" : "px-2",
          className,
        )}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderGridRow(virtualItem.index)}
            </div>
          ))}
        </div>
      </div>
    );
  },
);

MobileFileGrid.displayName = "MobileFileGrid";

export default MobileFileGrid;
