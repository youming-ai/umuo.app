"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  X,
  Eye,
  FileAudio,
  FileVideo,
  FileText,
  MoreVertical,
} from "lucide-react";

import { useHapticFeedback } from "./hooks/useMobileFileUpload";
import { formatFileSize, getFileIcon } from "./FileValidation";
import type { FileValidationResult } from "./FileValidation";

interface FilePreviewItem {
  file: File;
  validation?: FileValidationResult;
  preview?: string; // URL for image/video preview
  progress?: number;
  status?: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

interface FilePreviewProps {
  files: FilePreviewItem[];
  onRemoveFile: (index: number) => void;
  onViewFile?: (file: FilePreviewItem) => void;
  onRetryFile?: (index: number) => void;
  className?: string;
  mobileOptimized?: boolean;
  maxVisibleItems?: number;
  showActions?: boolean;
  compactMode?: boolean;
}

interface SwipeGesture {
  startX: number;
  startTime: number;
  currentX: number;
  isSwiping: boolean;
}

export default function FilePreview({
  files,
  onRemoveFile,
  onViewFile,
  onRetryFile,
  className = "",
  mobileOptimized = true,
  maxVisibleItems = 3,
  showActions = true,
  compactMode = false,
}: FilePreviewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { triggerHaptic } = useHapticFeedback();

  // Track swipe gestures for each file
  const swipeGesturesRef = useRef<Map<number, SwipeGesture>>(new Map());

  // Handle swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    const gesture: SwipeGesture = {
      startX: touch.clientX,
      startTime: Date.now(),
      currentX: touch.clientX,
      isSwiping: false,
    };

    swipeGesturesRef.current.set(index, gesture);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent, index: number) => {
    const gesture = swipeGesturesRef.current.get(index);
    if (!gesture) return;

    const touch = e.touches[0];
    gesture.currentX = touch.clientX;
    const deltaX = touch.clientX - gesture.startX;
    const deltaTime = Date.now() - gesture.startTime;

    // Detect swipe initiation
    if (Math.abs(deltaX) > 10 && deltaTime < 300) {
      gesture.isSwiping = true;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent, index: number) => {
      const gesture = swipeGesturesRef.current.get(index);
      if (!gesture) return;

      const deltaX = gesture.currentX - gesture.startX;
      const deltaTime = Date.now() - gesture.startTime;

      // Swipe detection: quick horizontal movement
      if (gesture.isSwiping && Math.abs(deltaX) > 50 && deltaTime < 500) {
        if (deltaX > 0) {
          // Swipe right - could be used for preview or other actions
          handleViewFile(files[index]);
        } else {
          // Swipe left - remove file
          triggerHaptic("medium");
          onRemoveFile(index);
        }
      }

      // Clean up gesture
      swipeGesturesRef.current.delete(index);
    },
    [files, onRemoveFile, triggerHaptic],
  );

  const handleViewFile = useCallback(
    (filePreview: FilePreviewItem) => {
      triggerHaptic("light");
      onViewFile?.(filePreview);
    },
    [onViewFile, triggerHaptic],
  );

  const handleRemoveFile = useCallback(
    (index: number, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      triggerHaptic("medium");
      onRemoveFile(index);
    },
    [onRemoveFile, triggerHaptic],
  );

  const handleRetryFile = useCallback(
    (index: number, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      triggerHaptic("light");
      onRetryFile?.(index);
    },
    [onRetryFile, triggerHaptic],
  );

  const toggleExpand = useCallback(
    (index: number) => {
      triggerHaptic("light");
      setExpandedIndex(expandedIndex === index ? null : index);
    },
    [expandedIndex, triggerHaptic],
  );

  const visibleFiles = showAll ? files : files.slice(0, maxVisibleItems);
  const hasMoreFiles = files.length > maxVisibleItems;

  // Get status color
  const getStatusColor = (status?: FilePreviewItem["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "error":
        return "text-red-500";
      case "uploading":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  // Get status icon
  const getStatusIcon = (status?: FilePreviewItem["status"]) => {
    switch (status) {
      case "completed":
        return "✓";
      case "error":
        return "✗";
      case "uploading":
        return "⟳";
      default:
        return "⏳";
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div
      className={`file-preview ${mobileOptimized ? "mobile-optimized" : ""} ${className}`}
    >
      <div className="space-y-2">
        {visibleFiles.map((filePreview, index) => {
          const { file, validation, preview, progress, status, error } =
            filePreview;
          const isExpanded = expandedIndex === index;
          const gesture = swipeGesturesRef.current.get(index);
          const swipeOffset = gesture ? gesture.currentX - gesture.startX : 0;

          return (
            <div
              key={`${file.name}-${file.size}`}
              className={`
                relative overflow-hidden rounded-lg border bg-white transition-all duration-200
                ${compactMode ? "p-2" : "p-3"}
                ${status === "error" ? "border-red-200 bg-red-50" : ""}
                ${status === "completed" ? "border-green-200 bg-green-50" : ""}
                ${gesture?.isSwiping ? "shadow-lg" : "shadow-sm"}
              `}
              style={{
                transform: gesture?.isSwiping
                  ? `translateX(${swipeOffset}px)`
                  : "translateX(0)",
                transition: gesture?.isSwiping
                  ? "none"
                  : "transform 0.2s ease-out",
              }}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={(e) => handleTouchMove(e, index)}
              onTouchEnd={(e) => handleTouchEnd(e, index)}
              onClick={() => !compactMode && toggleExpand(index)}
            >
              <div className="flex items-center gap-3">
                {/* File icon */}
                <div className={`flex-shrink-0 ${getStatusColor(status)}`}>
                  {getFileIcon(file.type)}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    {status && (
                      <span className={`text-sm ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    {validation && validation.fileType && (
                      <span>• {validation.fileType}</span>
                    )}
                    {validation && validation.errors.length > 0 && (
                      <span className="text-red-500">• Invalid</span>
                    )}
                  </div>

                  {/* Upload progress */}
                  {status === "uploading" && progress !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {status === "error" && error && (
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  )}

                  {/* Expanded details */}
                  {isExpanded && !compactMode && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <div className="text-xs text-gray-600">
                        <p>
                          <strong>Type:</strong> {file.type}
                        </p>
                        <p>
                          <strong>Size:</strong> {formatFileSize(file.size)}
                        </p>
                        <p>
                          <strong>Modified:</strong>{" "}
                          {new Date(file.lastModified).toLocaleString()}
                        </p>
                        {validation && (
                          <>
                            <p>
                              <strong>Category:</strong> {validation.fileType}
                            </p>
                            {validation.warnings.length > 0 && (
                              <div>
                                <strong>Warnings:</strong>
                                <ul className="mt-1 ml-4 list-disc">
                                  {validation.warnings.map((warning, i) => (
                                    <li key={i}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {showActions && (
                  <div className="flex items-center gap-1">
                    {onViewFile && status !== "error" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewFile(filePreview);
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="View file"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                    )}

                    {status === "error" && onRetryFile && (
                      <button
                        onClick={(e) => handleRetryFile(index, e)}
                        className="p-2 rounded-full hover:bg-blue-100 transition-colors"
                        aria-label="Retry upload"
                      >
                        ⟳
                      </button>
                    )}

                    <button
                      onClick={(e) => handleRemoveFile(index, e)}
                      className="p-2 rounded-full hover:bg-red-100 transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Swipe indicator */}
              {mobileOptimized && (
                <div className="absolute bottom-1 right-1 text-xs text-gray-400">
                  ← Swipe to delete
                </div>
              )}
            </div>
          );
        })}

        {/* Show more/less button */}
        {hasMoreFiles && (
          <button
            onClick={() => {
              triggerHaptic("light");
              setShowAll(!showAll);
            }}
            className="w-full py-2 text-center text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {showAll
              ? `Show less (${files.length - maxVisibleItems} hidden)`
              : `Show ${files.length - maxVisibleItems} more files`}
          </button>
        )}
      </div>

      {/* Mobile-optimized styles */}
      <style jsx>{`
        .file-preview.mobile-optimized {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        .file-preview.mobile-optimized > div > div {
          min-height: 44px; /* Minimum touch target */
          touch-action: pan-y; /* Allow vertical scrolling but prevent horizontal during swipe */
        }

        @media (max-width: 768px) {
          .file-preview {
            padding: 0.5rem 0;
          }
        }
      `}</style>
    </div>
  );
}
