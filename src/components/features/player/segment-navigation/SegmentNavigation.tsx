"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  Volume2
} from "lucide-react";
import { useSegmentNavigation } from "@/hooks/player/useSegmentNavigation";
import type { Segment } from "@/types/db/database";
import { MobileDetector } from "@/types/mobile";
import { SegmentList } from "./SegmentList";
import { SegmentControls } from "./SegmentControls";

export interface SegmentNavigationProps {
  /** All transcription segments */
  segments: Segment[];
  /** Current playback time in seconds */
  currentTime: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Callback when seeking to a specific time */
  onSeek: (time: number) => void;
  /** Callback when play/pause state changes */
  onPlayPause: (isPlaying: boolean) => void;
  /** Custom CSS classes */
  className?: string;
  /** Whether to show bookmarks */
  showBookmarks?: boolean;
  /** Whether to show navigation history */
  showHistory?: boolean;
  /** Whether to show word-level navigation */
  showWordNavigation?: boolean;
  /** Whether to enable auto-advance */
  autoAdvance?: boolean;
  /** Whether to enable segment looping */
  loopSegment?: boolean;
  /** Whether to enable mobile-optimized mode */
  mobileMode?: boolean;
  /** Maximum number of segments to display at once */
  maxVisibleSegments?: number;
  /** Whether to show segment timestamps */
  showTimestamps?: boolean;
  /** Whether to show segment durations */
  showDurations?: boolean;
  /** Custom segment render function */
  renderSegment?: (segment: Segment, index: number, isActive: boolean) => React.ReactNode;
}

interface NavigationControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onBack: () => void;
  onForward: () => void;
  onReset: () => void;
  onToggleBookmark: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isPlaying: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  hasHistory: boolean;
  hasBookmarks: boolean;
  isBookmarked: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  mobileMode: boolean;
}

/**
 * Main Segment Navigation Component
 * Provides fast (<300ms) segment navigation with mobile optimization
 * and accessibility features
 */
export const SegmentNavigation = React.memo<SegmentNavigationProps>(({
  segments,
  currentTime,
  isPlaying,
  onSeek,
  onPlayPause,
  className = "",
  showBookmarks = true,
  showHistory = true,
  showWordNavigation = true,
  autoAdvance = true,
  loopSegment = false,
  mobileMode: propMobileMode,
  maxVisibleSegments = 50,
  showTimestamps = true,
  showDurations = false,
  renderSegment,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Auto-detect mobile mode if not provided
  const deviceDetector = MobileDetector.getInstance();
  const mobileMode = propMobileMode ?? deviceDetector.isMobile();

  // Segment navigation hook with optimized options
  const navigation = useSegmentNavigation(segments, currentTime, {
    autoAdvance,
    loopSegment,
    preloadAdjacent: true,
    preloadCount: mobileMode ? 1 : 3,
    enableHaptics: mobileMode,
    transitionDuration: 200,
    navigationDebounce: mobileMode ? 150 : 100,
  });

  const {
    activeSegmentIndex,
    activeSegment,
    nextSegment,
    previousSegment,
    isNavigating,
    bookmarkedSegments,
    navigateToSegment,
    navigateToNext,
    navigateToPrevious,
    toggleBookmark,
    goBack,
    goForward,
    clearHistory,
    getWordNavigation,
    reset,
  } = navigation;

  // Filter and limit visible segments for performance
  const visibleSegments = useMemo(() => {
    if (segments.length <= maxVisibleSegments) {
      return segments;
    }

    // Show segments around current active segment
    const halfWindow = Math.floor(maxVisibleSegments / 2);
    let start = Math.max(0, activeSegmentIndex - halfWindow);
    let end = Math.min(segments.length, start + maxVisibleSegments);

    // Adjust if we're near the end
    if (end - start < maxVisibleSegments) {
      start = Math.max(0, end - maxVisibleSegments);
    }

    return segments.slice(start, end);
  }, [segments, activeSegmentIndex, maxVisibleSegments]);

  // Handle segment click with seeking
  const handleSegmentClick = useCallback((segment: Segment, index: number) => {
    navigateToSegment(index);
    onSeek(segment.start);

    // Auto-play if not playing
    if (!isPlaying) {
      onPlayPause(true);
    }
  }, [navigateToSegment, onSeek, isPlaying, onPlayPause]);

  // Handle navigation controls
  const handlePrevious = useCallback(() => {
    navigateToPrevious();
    if (previousSegment) {
      onSeek(previousSegment.start);
    }
  }, [navigateToPrevious, previousSegment, onSeek]);

  const handleNext = useCallback(() => {
    navigateToNext();
    if (nextSegment) {
      onSeek(nextSegment.start);
    }
  }, [navigateToNext, nextSegment, onSeek]);

  const handlePlayPause = useCallback(() => {
    onPlayPause(!isPlaying);
  }, [onPlayPause, isPlaying]);

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleForward = useCallback(() => {
    goForward();
  }, [goForward]);

  const handleReset = useCallback(() => {
    reset();
    onSeek(0);
  }, [reset, onSeek]);

  const handleToggleBookmark = useCallback(() => {
    toggleBookmark();
  }, [toggleBookmark]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  // Scroll to active segment
  useEffect(() => {
    if (scrollAreaRef.current && activeSegmentIndex >= 0) {
      const activeElement = scrollAreaRef.current.querySelector(`[data-segment-index="${activeSegmentIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [activeSegmentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNext();
          break;
        case ' ':
          event.preventDefault();
          handlePlayPause();
          break;
        case 'b':
        case 'B':
          event.preventDefault();
          handleToggleBookmark();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          handleReset();
          break;
        case '[':
          event.preventDefault();
          handleBack();
          break;
        case ']':
          event.preventDefault();
          handleForward();
          break;
        case '+':
        case '=':
          event.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          handleZoomOut();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, handlePlayPause, handleToggleBookmark, handleReset, handleBack, handleForward, handleZoomIn, handleZoomOut]);

  // Performance optimization: memoize control props
  const navigationControls: NavigationControlsProps = useMemo(() => ({
    onPrevious: handlePrevious,
    onNext: handleNext,
    onPlayPause: handlePlayPause,
    onBack: handleBack,
    onForward: handleForward,
    onReset: handleReset,
    onToggleBookmark: handleToggleBookmark,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    isPlaying,
    hasPrevious: !!previousSegment,
    hasNext: !!nextSegment,
    hasHistory: navigation.navigationHistory.length > 1,
    hasBookmarks: bookmarkedSegments.size > 0,
    isBookmarked: activeSegmentIndex >= 0 && bookmarkedSegments.has(activeSegmentIndex),
    canGoBack: navigation.historyPosition > 0,
    canGoForward: navigation.historyPosition < navigation.navigationHistory.length - 1,
    mobileMode,
  }), [
    handlePrevious, handleNext, handlePlayPause, handleBack, handleForward,
    handleReset, handleToggleBookmark, handleZoomIn, handleZoomOut, isPlaying,
    previousSegment, nextSegment, navigation.navigationHistory, navigation.historyPosition,
    bookmarkedSegments, activeSegmentIndex, mobileMode
  ]);

  // Generate word navigation info
  const wordNavigation = useMemo(() => {
    if (!showWordNavigation) return null;
    return getWordNavigation();
  }, [showWordNavigation, getWordNavigation]);

  if (segments.length === 0) {
    return (
      <Card className={cn("segment-navigation p-4", className)}>
        <div className="flex items-center justify-center text-muted-foreground">
          <Volume2 className="w-4 h-4 mr-2" />
          No segments available
        </div>
      </Card>
    );
  }

  return (
    <Card
      ref={containerRef}
      className={cn(
        "segment-navigation flex flex-col border border-primary/20 bg-gradient-to-br from-background to-primary-light/5 shadow-lg",
        mobileMode && "touch-pan-y",
        isNavigating && "animate-pulse",
        className
      )}
      role="region"
      aria-label="Audio Segment Navigation"
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {segments.length} segments
          </Badge>
          {activeSegment && (
            <Badge variant="secondary" className="text-xs">
              Active: {activeSegmentIndex + 1}/{segments.length}
            </Badge>
          )}
          {bookmarkedSegments.size > 0 && (
            <Badge variant="default" className="text-xs">
              {bookmarkedSegments.size} bookmarked
            </Badge>
          )}
        </div>

        <SegmentControls {...navigationControls} />
      </div>

      {/* Segments list */}
      <ScrollArea
        ref={scrollAreaRef}
        className={cn(
          "flex-1",
          mobileMode ? "h-64" : "h-96"
        )}
      >
        <div className="p-2">
          <SegmentList
            segments={visibleSegments}
            activeSegmentIndex={activeSegmentIndex}
            bookmarkedSegments={bookmarkedSegments}
            currentTime={currentTime}
            zoomLevel={zoomLevel}
            mobileMode={mobileMode}
            showTimestamps={showTimestamps}
            showDurations={showDurations}
            renderSegment={renderSegment}
            onSegmentClick={handleSegmentClick}
          />
        </div>
      </ScrollArea>

      {/* Word-level navigation footer */}
      {wordNavigation && wordNavigation.currentWord && (
        <div className="border-t border-border/50 p-2 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Current word: {wordNavigation.currentWord.word}</span>
            <div className="flex items-center gap-2">
              {wordNavigation.previousWord && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => wordNavigation.navigateToWord(
                    activeSegment?.wordTimestamps?.indexOf(wordNavigation.previousWord!) ?? -1
                  )}
                  className="h-6 px-2"
                >
                  <ChevronLeft className="w-3 h-3 mr-1" />
                  Previous
                </Button>
              )}
              {wordNavigation.nextWord && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => wordNavigation.navigateToWord(
                    activeSegment?.wordTimestamps?.indexOf(wordNavigation.nextWord!) ?? -1
                  )}
                  className="h-6 px-2"
                >
                  Next
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});

SegmentNavigation.displayName = "SegmentNavigation";

export default SegmentNavigation;
