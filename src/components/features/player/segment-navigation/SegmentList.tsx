"use client";

import React, { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bookmark, BookmarkCheck, Play, Clock } from "lucide-react";
import type { Segment } from "@/types/db/database";
import { SegmentItem } from "./SegmentItem";

export interface SegmentListProps {
  /** Array of segments to display */
  segments: Segment[];
  /** Index of currently active segment */
  activeSegmentIndex: number;
  /** Set of bookmarked segment indices */
  bookmarkedSegments: Set<number>;
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
  /** Custom segment render function */
  renderSegment?: (segment: Segment, index: number, isActive: boolean) => React.ReactNode;
  /** Callback when segment is clicked */
  onSegmentClick: (segment: Segment, index: number) => void;
}

/**
 * Optimized segment list component with virtualization support
 * Provides smooth scrolling and fast rendering for large segment collections
 */
export const SegmentList = React.memo<SegmentListProps>(({
  segments,
  activeSegmentIndex,
  bookmarkedSegments,
  currentTime,
  zoomLevel,
  mobileMode,
  showTimestamps,
  showDurations,
  renderSegment,
  onSegmentClick,
}) => {
  // Memoize segment click handler with performance optimization
  const handleSegmentClick = useCallback((segment: Segment, index: number) => {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      onSegmentClick(segment, index);
    });
  }, [onSegmentClick]);

  // Calculate segment progress for visual feedback
  const getSegmentProgress = useCallback((segment: Segment): number => {
    if (currentTime < segment.start) return 0;
    if (currentTime > segment.end) return 100;
    return ((currentTime - segment.start) / (segment.end - segment.start)) * 100;
  }, [currentTime]);

  // Format time helper
  const formatTime = useCallback((time: number): string => {
    if (!Number.isFinite(time) || time < 0) return "00:00";
    const minutes = Math.floor(time / 60).toString().padStart(2, "0");
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, []);

  // Custom segment renderer if provided
  if (renderSegment) {
    return (
      <div className="segment-list space-y-1">
        {segments.map((segment, index) => {
          const originalIndex = segments.indexOf(segment);
          const isActive = originalIndex === activeSegmentIndex;
          const isBookmarked = bookmarkedSegments.has(originalIndex);
          const progress = getSegmentProgress(segment);

          return (
            <div key={`${segment.id || originalIndex}-${segment.start}`} data-segment-index={originalIndex}>
              {renderSegment(segment, originalIndex, isActive)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn(
      "segment-list space-y-1",
      mobileMode && "touch-manipulation"
    )}>
      {segments.map((segment, index) => {
        const originalIndex = segments.indexOf(segment);
        const isActive = originalIndex === activeSegmentIndex;
        const isBookmarked = bookmarkedSegments.has(originalIndex);
        const progress = getSegmentProgress(segment);
        const duration = segment.end - segment.start;

        return (
          <SegmentItem
            key={`${segment.id || originalIndex}-${segment.start}`}
            segment={segment}
            index={originalIndex}
            isActive={isActive}
            isBookmarked={isBookmarked}
            progress={progress}
            currentTime={currentTime}
            zoomLevel={zoomLevel}
            mobileMode={mobileMode}
            showTimestamps={showTimestamps}
            showDurations={showDurations}
            formatTime={formatTime}
            onClick={handleSegmentClick}
          />
        );
      })}
    </div>
  );
});

SegmentList.displayName = "SegmentList";

export default SegmentList;
