"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  BookmarkCheck,
  Play,
  Clock,
  Volume2,
  ChevronRight
} from "lucide-react";
import type { Segment } from "@/types/db/database";

export interface SegmentItemProps {
  /** Segment data */
  segment: Segment;
  /** Original index in the segments array */
  index: number;
  /** Whether this segment is currently active/playing */
  isActive: boolean;
  /** Whether this segment is bookmarked */
  isBookmarked: boolean;
  /** Playback progress within this segment (0-100) */
  progress: number;
  /** Current playback time in seconds */
  currentTime: number;
  /** Zoom level for text scaling (0.5-2.0) */
  zoomLevel: number;
  /** Whether to enable mobile-optimized mode */
  mobileMode: boolean;
  /** Whether to show timestamps */
  showTimestamps: boolean;
  /** Whether to show segment durations */
  showDurations: boolean;
  /** Time formatting function */
  formatTime: (time: number) => string;
  /** Callback when segment is clicked */
  onClick: (segment: Segment, index: number) => void;
}

/**
 * Individual segment item component with optimized rendering
 * Supports mobile touch interactions and accessibility features
 */
export const SegmentItem = React.memo<SegmentItemProps>(({
  segment,
  index,
  isActive,
  isBookmarked,
  progress,
  currentTime,
  zoomLevel,
  mobileMode,
  showTimestamps,
  showDurations,
  formatTime,
  onClick,
}) => {
  const handleSegmentClick = useCallback(() => {
    onClick(segment, index);
  }, [onClick, segment, index]);

  const handleBookmarkClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    // Bookmark toggle is handled by parent component
  }, []);

  // Calculate if current time is within this segment
  const isCurrentTimeInSegment = currentTime >= segment.start && currentTime <= segment.end;
  const duration = segment.end - segment.start;

  // Determine text color based on state
  const getTextColor = () => {
    if (isActive) return "text-primary";
    if (isCurrentTimeInSegment) return "text-primary/80";
    return "text-foreground";
  };

  const getBackgroundStyle = () => {
    if (isActive) {
      return "bg-primary/10 border-primary/50 shadow-sm";
    }
    if (isCurrentTimeInSegment) {
      return "bg-primary/5 border-primary/30";
    }
    return "hover:bg-muted/50 border-transparent";
  };

  // Responsive text sizing
  const getTextSize = () => {
    const baseSize = mobileMode ? "text-sm" : "text-base";
    const fontSize = Math.max(0.75, Math.min(1.25, zoomLevel));
    return { fontSize: `${fontSize}rem` };
  };

  return (
    <Card
      className={cn(
        "segment-item group cursor-pointer transition-all duration-200 border",
        getBackgroundStyle(),
        mobileMode && "active:scale-95 touch-manipulation"
      )}
      onClick={handleSegmentClick}
      role="button"
      tabIndex={0}
      aria-label={`Segment ${index + 1}: ${segment.text.substring(0, 50)}...`}
      aria-pressed={isActive}
      data-segment-index={index}
    >
      <div className="p-3">
        {/* Segment header with metadata */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Segment number and active indicator */}
            <div className="flex items-center gap-1">
              <Badge
                variant={isActive ? "default" : "secondary"}
                className="text-xs px-1.5 py-0.5 min-w-[2rem] text-center"
              >
                {index + 1}
              </Badge>
              {isActive && (
                <Play className="w-3 h-3 text-primary animate-pulse" />
              )}
            </div>

            {/* Bookmark indicator */}
            {isBookmarked && (
              <BookmarkCheck className="w-4 h-4 text-primary flex-shrink-0" />
            )}

            {/* Timestamps and duration */}
            {(showTimestamps || showDurations) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                {showTimestamps && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(segment.start)}</span>
                  </div>
                )}
                {showDurations && (
                  <div className="flex items-center gap-1">
                    <Volume2 className="w-3 h-3" />
                    <span>{duration.toFixed(1)}s</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons (shown on hover or mobile) */}
          <div className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            mobileMode && "opacity-100"
          )}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleBookmarkClick}
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Segment text */}
        <div className="space-y-1">
          {/* Original text */}
          <div
            className={cn(
              "font-medium leading-relaxed break-words",
              getTextColor()
            )}
            style={getTextSize()}
          >
            {segment.text}
          </div>

          {/* Normalized text if available */}
          {segment.normalizedText && segment.normalizedText !== segment.text && (
            <div
              className="text-sm text-muted-foreground leading-relaxed break-words"
              style={getTextSize()}
            >
              {segment.normalizedText}
            </div>
          )}

          {/* Additional metadata */}
          {(segment.translation || segment.romaji) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {segment.translation && (
                <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                  Translation: {segment.translation}
                </div>
              )}
              {segment.romaji && (
                <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                  {segment.romaji}
                </div>
              )}
            </div>
          )}

          {/* Annotations */}
          {segment.annotations && segment.annotations.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {segment.annotations.slice(0, 3).map((annotation, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs px-1.5 py-0.5"
                >
                  {annotation}
                </Badge>
              ))}
              {segment.annotations.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  +{segment.annotations.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Progress bar for active segment */}
        {(isActive || isCurrentTimeInSegment) && progress > 0 && (
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Word timestamps preview for active segment */}
        {isActive && segment.wordTimestamps && segment.wordTimestamps.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Word-level timestamps:</div>
            <div className="flex flex-wrap gap-1">
              {segment.wordTimestamps.slice(0, 6).map((word, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded cursor-pointer",
                    currentTime >= word.start && currentTime <= word.end
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {word.word}
                </span>
              ))}
              {segment.wordTimestamps.length > 6 && (
                <span className="text-xs text-muted-foreground px-1.5">
                  +{segment.wordTimestamps.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

SegmentItem.displayName = "SegmentItem";

export default SegmentItem;
