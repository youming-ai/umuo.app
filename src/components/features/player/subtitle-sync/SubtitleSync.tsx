"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/utils";
import type { Segment, WordTimestamp } from "@/types/db/database";
import { SubtitleDisplay } from "./SubtitleDisplay";
import { SubtitleHighlight } from "./SubtitleHighlight";
import { SubtitleControls } from "./SubtitleControls";
import { MobileDetector } from "@/types/mobile";

/**
 * Configuration options for subtitle synchronization
 */
export interface SubtitleSyncConfig {
  /** Subtitle offset in seconds (positive = delay, negative = advance) */
  offset: number;
  /** Whether to enable auto-scrolling */
  autoScroll: boolean;
  /** Scroll behavior when auto-scrolling */
  scrollBehavior: "smooth" | "instant" | "auto";
  /** Whether to enable word-level highlighting */
  wordHighlighting: boolean;
  /** Whether to show subtitle controls */
  showControls: boolean;
  /** Subtitle display style */
  displayStyle: "full" | "compact" | "minimal";
  /** Maximum number of subtitles to display at once */
  maxVisibleSubtitles: number;
  /** Mobile optimization settings */
  mobileOptimized: boolean;
  /** Accessibility settings */
  highContrast: boolean;
  /** Custom subtitle offset per track */
  trackOffsets?: Record<string, number>;
}

/**
 * Props for SubtitleSync component
 */
export interface SubtitleSyncProps {
  /** Array of subtitle segments */
  segments: Segment[];
  /** Current playback time in seconds */
  currentTime: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Total duration of the audio */
  duration: number;
  /** Callback when user clicks on a subtitle segment */
  onSegmentClick?: (segment: Segment, index: number) => void;
  /** Callback when user seeks to a specific time */
  onSeek?: (time: number) => void;
  /** Configuration options */
  config?: Partial<SubtitleSyncConfig>;
  /** Custom CSS classes */
  className?: string;
  /** Whether component is in touch mode */
  touchMode?: boolean;
  /** Available subtitle tracks */
  tracks?: Array<{ id: string; name: string; segments: Segment[] }>;
  /** Currently active track */
  activeTrack?: string;
  /** Callback when track changes */
  onTrackChange?: (trackId: string) => void;
  /** Whether subtitles are enabled */
  enabled?: boolean;
  /** Callback when subtitles are toggled */
  onToggle?: (enabled: boolean) => void;
}

/**
 * Internal state for subtitle synchronization
 */
interface SubtitleSyncState {
  /** Index of the currently active segment */
  activeSegmentIndex: number;
  /** Index of the currently active word within the segment */
  activeWordIndex: number;
  /** Whether subtitles are visible */
  isVisible: boolean;
  /** Current configuration */
  config: SubtitleSyncConfig;
  /** Last update timestamp for performance tracking */
  lastUpdateTime: number;
  /** Scroll animation frame ID */
  scrollFrameId: number | null;
}

/**
 * Default configuration for subtitle synchronization
 */
const DEFAULT_CONFIG: SubtitleSyncConfig = {
  offset: 0,
  autoScroll: true,
  scrollBehavior: "smooth",
  wordHighlighting: true,
  showControls: false,
  displayStyle: "full",
  maxVisibleSubtitles: 5,
  mobileOptimized: true,
  highContrast: false,
  trackOffsets: {},
};

/**
 * SubtitleSync - Advanced subtitle synchronization with audio player
 *
 * Features:
 * - Precise word-level timing synchronization
 * - Smooth scrolling with GPU acceleration
 * - Mobile-optimized touch interactions
 * - Accessibility compliance (WCAG 2.1)
 * - Performance optimized for <200ms response time
 * - Multiple subtitle tracks support
 * - Customizable subtitle styling and offset
 */
export const SubtitleSync: React.FC<SubtitleSyncProps> = React.memo(
  ({
    segments,
    currentTime,
    isPlaying,
    duration,
    onSegmentClick,
    onSeek,
    config: userConfig = {},
    className = "",
    touchMode = false,
    tracks = [],
    activeTrack = "default",
    onTrackChange,
    enabled = true,
    onToggle,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const subtitleListRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    // Mobile detection
    const deviceDetector = MobileDetector.getInstance();
    const isMobileDevice = deviceDetector.isMobile();

    // Internal state management
    const [state, setState] = useState<SubtitleSyncState>(() => ({
      activeSegmentIndex: -1,
      activeWordIndex: -1,
      isVisible: enabled,
      config: { ...DEFAULT_CONFIG, ...userConfig },
      lastUpdateTime: Date.now(),
      scrollFrameId: null,
    }));

    // Update configuration when user config changes
    useEffect(() => {
      setState((prevState) => ({
        ...prevState,
        config: { ...DEFAULT_CONFIG, ...userConfig },
      }));
    }, [userConfig]);

    // Apply track offset if available
    const adjustedCurrentTime = useMemo(() => {
      const trackOffset = state.config.trackOffsets?.[activeTrack] || 0;
      return Math.max(0, currentTime - state.config.offset - trackOffset);
    }, [currentTime, state.config.offset, state.config.trackOffsets, activeTrack]);

    // Find currently active segments (support for overlapping segments)
    const activeSegments = useMemo(() => {
      if (!enabled || !segments.length) return [];

      return segments.filter((segment) => {
        const segmentStart = segment.start - (state.config.trackOffsets?.[activeTrack] || 0);
        const segmentEnd = segment.end - (state.config.trackOffsets?.[activeTrack] || 0);
        return adjustedCurrentTime >= segmentStart && adjustedCurrentTime <= segmentEnd;
      });
    }, [segments, adjustedCurrentTime, enabled, activeTrack, state.config.trackOffsets]);

    // Find primary active segment (first in list)
    const primaryActiveIndex = useMemo(() => {
      if (activeSegments.length === 0) return -1;
      return segments.findIndex((segment) => segment === activeSegments[0]);
    }, [segments, activeSegments]);

    // Find active word within the primary segment
    const activeWordIndex = useMemo(() => {
      if (primaryActiveIndex === -1 || !state.config.wordHighlighting) return -1;

      const segment = segments[primaryActiveIndex];
      if (!segment.wordTimestamps?.length) return -1;

      return segment.wordTimestamps.findIndex((word) => {
        const wordStart = word.start - (state.config.trackOffsets?.[activeTrack] || 0);
        const wordEnd = word.end - (state.config.trackOffsets?.[activeTrack] || 0);
        return adjustedCurrentTime >= wordStart && adjustedCurrentTime <= wordEnd;
      });
    }, [primaryActiveIndex, segments, adjustedCurrentTime, state.config.wordHighlighting, activeTrack, state.config.trackOffsets]);

    // Performance optimization: Batch state updates
    const updateActiveStates = useCallback(() => {
      const now = Date.now();

      // Throttle updates to maintain <200ms response time
      if (now - state.lastUpdateTime < 50) return;

      setState((prevState) => ({
        ...prevState,
        activeSegmentIndex: primaryActiveIndex,
        activeWordIndex,
        lastUpdateTime: now,
      }));
    }, [primaryActiveIndex, activeWordIndex, state.lastUpdateTime]);

    // Handle segment click
    const handleSegmentClick = useCallback((segment: Segment, index: number) => {
      if (onSegmentClick) {
        onSegmentClick(segment, index);
      }

      // Seek to segment start
      const segmentStart = segment.start + (state.config.trackOffsets?.[activeTrack] || 0) + state.config.offset;
      if (onSeek) {
        onSeek(segmentStart);
      }
    }, [onSegmentClick, onSeek, state.config.trackOffsets, activeTrack, state.config.offset]);

    // Handle word click (for precise seeking)
    const handleWordClick = useCallback((segment: Segment, word: WordTimestamp, wordIndex: number) => {
      const wordTime = word.start + (state.config.trackOffsets?.[activeTrack] || 0) + state.config.offset;
      if (onSeek) {
        onSeek(wordTime);
      }
    }, [onSeek, state.config.trackOffsets, activeTrack, state.config.offset]);

    // Smooth scroll to active segment
    const scrollToActiveSegment = useCallback(() => {
      if (!state.config.autoScroll || primaryActiveIndex === -1 || !subtitleListRef.current) return;

      // Cancel any pending scroll
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Delay scroll to ensure DOM is updated
      scrollTimeoutRef.current = setTimeout(() => {
        const subtitleList = subtitleListRef.current;
        if (!subtitleList) return;

        const activeElement = subtitleList.children[primaryActiveIndex] as HTMLElement;
        if (!activeElement) return;

        const containerRect = subtitleList.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        const relativeTop = activeRect.top - containerRect.top;
        const containerHeight = containerRect.height;
        const elementHeight = activeRect.height;

        // Center the active element in viewport
        const targetScrollTop = Math.max(
          0,
          relativeTop - containerHeight / 2 + elementHeight / 2
        );

        // Use scrollIntoView for better performance and accessibility
        activeElement.scrollIntoView({
          behavior: isPlaying ? "smooth" : "instant",
          block: "center",
          inline: "nearest",
        });
      }, isPlaying ? 100 : 0); // Faster response when paused
    }, [state.config.autoScroll, primaryActiveIndex, isPlaying]);

    // Update active states and scroll position
    useEffect(() => {
      updateActiveStates();

      if (state.config.autoScroll) {
        scrollToActiveSegment();
      }
    }, [updateActiveStates, scrollToActiveSegment, state.config.autoScroll]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
      };
    }, []);

    // Toggle subtitles visibility
    const toggleSubtitles = useCallback(() => {
      setState((prevState) => ({ ...prevState, isVisible: !prevState.isVisible }));
      if (onToggle) {
        onToggle(!state.isVisible);
      }
    }, [onToggle, state.isVisible]);

    // Update configuration
    const updateConfig = useCallback((newConfig: Partial<SubtitleSyncConfig>) => {
      setState((prevState) => ({
        ...prevState,
        config: { ...prevState.config, ...newConfig },
      }));
    }, []);

    // Track change handler
    const handleTrackChange = useCallback((trackId: string) => {
      if (onTrackChange) {
        onTrackChange(trackId);
      }
    }, [onTrackChange]);

    // Calculate visible subtitles based on display style
    const visibleSubtitles = useMemo(() => {
      if (!enabled || !state.isVisible) return [];

      const { displayStyle, maxVisibleSubtitles } = state.config;

      switch (displayStyle) {
        case "minimal":
          // Show only current segment
          return primaryActiveIndex >= 0 ? [segments[primaryActiveIndex]] : [];

        case "compact":
          // Show current segment and adjacent ones
          if (primaryActiveIndex < 0) return [];
          const start = Math.max(0, primaryActiveIndex - 1);
          const end = Math.min(segments.length, primaryActiveIndex + 2);
          return segments.slice(start, end);

        case "full":
        default:
          // Show segments around current position
          if (primaryActiveIndex < 0) return segments.slice(0, maxVisibleSubtitles);

          const halfWindow = Math.floor(maxVisibleSubtitles / 2);
          const compactStart = Math.max(0, primaryActiveIndex - halfWindow);
          const compactEnd = Math.min(
            segments.length,
            primaryActiveIndex + halfWindow + (maxVisibleSubtitles % 2)
          );
          return segments.slice(compactStart, compactEnd);
      }
    }, [
      segments,
      primaryActiveIndex,
      enabled,
      state.isVisible,
      state.config.displayStyle,
      state.config.maxVisibleSubtitles,
    ]);

    // If subtitles are disabled or not visible, render nothing
    if (!enabled || !state.isVisible) {
      return (
        <div className={cn("subtitle-sync-container relative", className)}>
          {/* Subtitle controls for re-enabling */}
          {state.config.showControls && (
            <SubtitleControls
              config={state.config}
              isVisible={false}
              isPlaying={isPlaying}
              tracks={tracks}
              activeTrack={activeTrack}
              onToggle={toggleSubtitles}
              onConfigChange={updateConfig}
              onTrackChange={handleTrackChange}
              touchMode={touchMode}
            />
          )}
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          "subtitle-sync-container relative flex flex-col",
          "data-[mobile=true]:touch-pan-y",
          isMobileDevice && "data-[mobile=true]",
          className
        )}
        data-mobile={isMobileDevice}
        role="region"
        aria-label="Subtitle display"
        aria-live="polite"
      >
        {/* Subtitle Display */}
        <SubtitleDisplay
          ref={subtitleListRef}
          segments={visibleSubtitles}
          totalSegments={segments.length}
          activeSegmentIndex={primaryActiveIndex}
          activeWordIndex={activeWordIndex}
          config={state.config}
          onSegmentClick={handleSegmentClick}
          onWordClick={handleWordClick}
          touchMode={touchMode}
          className="flex-1 overflow-hidden"
        />

        {/* Subtitle Highlight Overlay */}
        {state.config.wordHighlighting && primaryActiveIndex >= 0 && (
          <SubtitleHighlight
            segment={segments[primaryActiveIndex]}
            activeWordIndex={activeWordIndex}
            currentTime={adjustedCurrentTime}
            config={state.config}
          />
        )}

        {/* Subtitle Controls */}
        {state.config.showControls && (
          <SubtitleControls
            config={state.config}
            isVisible={state.isVisible}
            isPlaying={isPlaying}
            tracks={tracks}
            activeTrack={activeTrack}
            onToggle={toggleSubtitles}
            onConfigChange={updateConfig}
            onTrackChange={handleTrackChange}
            touchMode={touchMode}
            duration={duration}
            currentTime={currentTime}
          />
        )}
      </div>
    );
  }
);

SubtitleSync.displayName = "SubtitleSync";

export default SubtitleSync;
