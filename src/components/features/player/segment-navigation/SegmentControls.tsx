"use client";

import React from "react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  History,
  SkipForward,
  SkipBack,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export interface SegmentControlsProps {
  /** Navigate to previous segment */
  onPrevious: () => void;
  /** Navigate to next segment */
  onNext: () => void;
  /** Toggle play/pause */
  onPlayPause: () => void;
  /** Go back in navigation history */
  onBack: () => void;
  /** Go forward in navigation history */
  onForward: () => void;
  /** Reset navigation state */
  onReset: () => void;
  /** Toggle bookmark for current segment */
  onToggleBookmark: () => void;
  /** Zoom in segments */
  onZoomIn: () => void;
  /** Zoom out segments */
  onZoomOut: () => void;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether previous segment is available */
  hasPrevious: boolean;
  /** Whether next segment is available */
  hasNext: boolean;
  /** Whether navigation history exists */
  hasHistory: boolean;
  /** Whether any segments are bookmarked */
  hasBookmarks: boolean;
  /** Whether current segment is bookmarked */
  isBookmarked: boolean;
  /** Whether can go back in history */
  canGoBack: boolean;
  /** Whether can go forward in history */
  canGoForward: boolean;
  /** Whether to enable mobile-optimized mode */
  mobileMode: boolean;
}

/**
 * Navigation controls component for segment navigation
 * Provides playback controls, history navigation, and display options
 */
export const SegmentControls = React.memo<SegmentControlsProps>(({
  onPrevious,
  onNext,
  onPlayPause,
  onBack,
  onForward,
  onReset,
  onToggleBookmark,
  onZoomIn,
  onZoomOut,
  isPlaying,
  hasPrevious,
  hasNext,
  hasHistory,
  hasBookmarks,
  isBookmarked,
  canGoBack,
  canGoForward,
  mobileMode,
}) => {
  return (
    <div className={cn(
      "flex items-center gap-1",
      mobileMode ? "flex-wrap" : "flex-nowrap"
    )}>
      {/* Playback controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={cn(
            "h-8 w-8 p-0",
            mobileMode && "h-7 w-7"
          )}
          aria-label="Previous segment"
        >
          <SkipBack className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
        </Button>

        <Button
          variant={isPlaying ? "default" : "default"}
          size="sm"
          onClick={onPlayPause}
          className={cn(
            "h-8 w-8 p-0",
            mobileMode && "h-7 w-7"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
          ) : (
            <Play className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!hasNext}
          className={cn(
            "h-8 w-8 p-0",
            mobileMode && "h-7 w-7"
          )}
          aria-label="Next segment"
        >
          <SkipForward className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
        </Button>
      </div>

      {/* Separator */}
      {!mobileMode && <Separator orientation="vertical" className="h-6 mx-1" />}

      {/* History controls */}
      {hasHistory && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={!canGoBack}
            className={cn(
              "h-8 w-8 p-0",
              mobileMode && "h-7 w-7"
            )}
            aria-label="Back in history"
          >
            <ChevronLeft className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onForward}
            disabled={!canGoForward}
            className={cn(
              "h-8 w-8 p-0",
              mobileMode && "h-7 w-7"
            )}
            aria-label="Forward in history"
          >
            <ChevronRight className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
          </Button>
        </div>
      )}

      {/* Separator */}
      {!mobileMode && hasHistory && <Separator orientation="vertical" className="h-6 mx-1" />}

      {/* Bookmark control */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleBookmark}
        className={cn(
          "h-8 w-8 p-0",
          isBookmarked && "text-primary",
          mobileMode && "h-7 w-7"
        )}
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        {isBookmarked ? (
          <BookmarkCheck className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
        ) : (
          <Bookmark className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
        )}
      </Button>

      {/* Separator */}
      {!mobileMode && <Separator orientation="vertical" className="h-6 mx-1" />}

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          className={cn(
            "h-8 w-8 p-0",
            mobileMode && "h-7 w-7"
          )}
          aria-label="Zoom out"
        >
          <ZoomOut className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          className={cn(
            "h-8 w-8 p-0",
            mobileMode && "h-7 w-7"
          )}
          aria-label="Zoom in"
        >
          <ZoomIn className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
        </Button>
      </div>

      {/* Separator */}
      {!mobileMode && <Separator orientation="vertical" className="h-6 mx-1" />}

      {/* Reset control */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className={cn(
          "h-8 w-8 p-0",
          mobileMode && "h-7 w-7"
        )}
        aria-label="Reset navigation"
      >
        <RotateCcw className={cn("w-4 h-4", mobileMode && "w-3.5 h-3.5")} />
      </Button>
    </div>
  );
});

SegmentControls.displayName = "SegmentControls";

export default SegmentControls;
