"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/utils";
import type { Segment } from "@/types/db/database";

interface FuriganaEntry {
  text: string;
  reading: string;
}

interface Token {
  word: string;
  reading?: string;
  romaji?: string;
  start?: number;
  end?: number;
}

interface EnhancedSubtitleDisplayProps {
  /** Transcription segments */
  segments: Segment[];
  /** Current playback time in seconds */
  currentTime: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Index of currently active segment */
  activeSegmentIndex: number;
  /** Callback when segment is clicked */
  onSegmentClick?: (segment: Segment) => void;
  /** Enhanced mode features */
  enhancedMode?: boolean;
  /** Touch-friendly mode */
  touchMode?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Maximum visible segments */
  maxVisibleSegments?: number;
  /** Auto-scroll behavior */
  autoScroll?: boolean;
}

/**
 * Enhanced Subtitle Display with word-level highlighting and animations
 * Optimized for <200ms response time and mobile-first design
 */
export const EnhancedSubtitleDisplay = React.memo<EnhancedSubtitleDisplayProps>(
  ({
    segments,
    currentTime,
    isPlaying,
    activeSegmentIndex,
    onSegmentClick,
    enhancedMode = true,
    touchMode = false,
    className = "",
    maxVisibleSegments = 5,
    autoScroll = true,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeSegmentRef = useRef<HTMLButtonElement>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const previousActiveIndex = useRef<number>(-1);

    // Performance optimization: debounce scroll events
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const safeCurrentTime = useMemo(
      () => (Number.isFinite(currentTime) ? currentTime : 0),
      [currentTime],
    );

    // Normalize furigana data
    const normalizeFurigana = useCallback((rawFurigana: unknown): FuriganaEntry[] => {
      if (!rawFurigana) return [];

      if (Array.isArray(rawFurigana)) {
        return rawFurigana
          .map((entry) => {
            if (typeof entry === "string") {
              const trimmed = entry.trim();
              return trimmed ? { text: trimmed, reading: trimmed } : null;
            }

            if (entry && typeof entry === "object") {
              const candidate = entry as Record<string, unknown>;
              const textValue = typeof candidate.text === "string" ? candidate.text : undefined;
              const readingValue = typeof candidate.reading === "string" ? candidate.reading : undefined;

              if (textValue || readingValue) {
                const safeText = (textValue ?? readingValue ?? "").trim();
                const safeReading = (readingValue ?? textValue ?? "").trim();
                if (safeText && safeReading) {
                  return { text: safeText, reading: safeReading };
                }
              }
            }

            return null;
          })
          .filter((entry): entry is FuriganaEntry => !!entry);
      }

      if (typeof rawFurigana === "string") {
        const trimmed = rawFurigana.trim();
        if (!trimmed) return [];

        try {
          const parsed = JSON.parse(trimmed);
          return normalizeFurigana(parsed);
        } catch (_error) {
          return trimmed
            .split(/\s+/)
            .filter(Boolean)
            .map((token) => ({ text: token, reading: token }));
        }
      }

      return [];
    }, []);

    // Process segments into tokens with word-level timing
    const segmentTokens = useMemo<Token[][]>(() => {
      return segments.map((segment) => {
        const furiganaEntries = normalizeFurigana(segment.furigana as unknown);

        // Prefer word timestamps for precise timing
        if (Array.isArray(segment.wordTimestamps) && segment.wordTimestamps.length > 0) {
          return segment.wordTimestamps.map((timestamp, index) => ({
            word: timestamp.word,
            reading: furiganaEntries[index]?.reading,
            romaji: furiganaEntries[index]?.reading,
            start: timestamp.start,
            end: timestamp.end,
          })) as Token[];
        }

        // Fall back to furigana entries
        if (furiganaEntries.length > 0) {
          return furiganaEntries.map((entry) => ({
            word: entry.text,
            reading: entry.reading,
            romaji: entry.reading,
          })) as Token[];
        }

        // Basic word tokenization
        if (segment.text) {
          const tokens = segment.text.split(/\s+/).filter(Boolean);
          if (tokens.length > 1) {
            return tokens.map((word) => ({ word })) as Token[];
          }
        }

        return [] as Token[];
      }) as Token[][];
    }, [segments, normalizeFurigana]);

    // Auto-scroll to active segment
    useEffect(() => {
      if (!autoScroll || !containerRef.current || !activeSegmentRef.current) {
        return;
      }

      // Only scroll when active segment changes
      if (activeSegmentIndex === previousActiveIndex.current || activeSegmentIndex === -1) {
        return;
      }

      previousActiveIndex.current = activeSegmentIndex;

      // Clear previous scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Smooth scroll with delay for DOM updates
      scrollTimeoutRef.current = setTimeout(() => {
        const container = containerRef.current;
        const activeElement = activeSegmentRef.current;

        if (!container || !activeElement) return;

        const containerRect = container.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        // Calculate scroll position to center active segment
        const relativeTop = activeRect.top - containerRect.top;
        const containerHeight = containerRect.height;
        const elementHeight = activeRect.height;

        const targetScrollTop = relativeTop - containerHeight / 2 + elementHeight / 2;

        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: isPlaying ? "smooth" : "auto",
        });
      }, isPlaying ? 100 : 0);

      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, [activeSegmentIndex, autoScroll, isPlaying]);

    // Handle scroll state for performance optimization
    const handleScroll = useCallback(() => {
      setIsScrolling(true);

      // Clear existing timeout
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }

      // Set new timeout
      scrollingTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      // Throttle scroll events
      return false;
    }, []);

    // Check if a word is currently active
    const isWordActive = useCallback(
      (token: Token, segmentIndex: number): boolean => {
        if (segmentIndex !== activeSegmentIndex) return false;

        if (
          enhancedMode &&
          typeof token.start === "number" &&
          typeof token.end === "number"
        ) {
          return safeCurrentTime >= token.start && safeCurrentTime <= token.end;
        }

        return false;
      },
      [activeSegmentIndex, enhancedMode, safeCurrentTime],
    );

    // Handle segment click with immediate feedback
    const handleSegmentClick = useCallback(
      (segment: Segment, event: React.MouseEvent) => {
        event.preventDefault();
        onSegmentClick?.(segment);
      },
      [onSegmentClick],
    );

    // Calculate visible segment range for performance optimization
    const visibleSegmentRange = useMemo(() => {
      if (!enhancedMode || segments.length <= maxVisibleSegments) {
        return { start: 0, end: segments.length };
      }

      // Center around active segment
      const halfVisible = Math.floor(maxVisibleSegments / 2);
      let start = Math.max(0, activeSegmentIndex - halfVisible);
      let end = Math.min(segments.length, start + maxVisibleSegments);

      // Adjust if we're near the end
      if (end - start < maxVisibleSegments) {
        start = Math.max(0, end - maxVisibleSegments);
      }

      return { start, end };
    }, [enhancedMode, segments.length, maxVisibleSegments, activeSegmentIndex]);

    if (segments.length === 0) {
      return (
        <div className={cn(
          "flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground",
          touchMode && "min-h-[8rem]",
          className,
        )}>
          <p>暂无字幕内容</p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          "subtitle-container overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
          touchMode && "scrollbar-thin",

          // Performance optimization: disable animations during scroll
          isScrolling && "disable-animations",

          className,
        )}
        onScroll={handleScroll}
        data-testid="subtitle-scroll-container"
        role="region"
        aria-label="字幕显示区域"
        aria-live="polite"
      >
        <div className="space-y-3 p-4">
          {segments.slice(visibleSegmentRange.start, visibleSegmentRange.end).map((segment, localIndex) => {
            const globalIndex = visibleSegmentRange.start + localIndex;
            const isActive = globalIndex === activeSegmentIndex;
            const tokens = segmentTokens[globalIndex] || [];
            const hasTokens = tokens.length > 0;

            // Display text with fallback
            const displayText = segment.normalizedText || segment.text;
            const lines = displayText
              .split(/\n+/)
              .map((line) => line.trim())
              .filter(Boolean);

            return (
              <button
                key={segment.id ?? `${segment.start}-${segment.end}-${globalIndex}`}
                ref={isActive ? activeSegmentRef : null}
                type="button"
                onClick={(event) => handleSegmentClick(segment, event)}
                className={cn(
                  // Base styles
                  "w-full rounded-lg border border-transparent p-4 text-left",
                  "transition-all duration-200 ease-out",

                  // Active state
                  isActive && [
                    "border-primary/30 bg-primary/5 shadow-sm",
                    "ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
                  ],

                  // Hover states
                  "hover:border-primary/20 hover:bg-accent/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",

                  // Touch optimization
                  touchMode && "touch-manipulation active:scale-98",

                  // Performance optimization
                  isScrolling && "transition-none",
                )}
                aria-current={isActive}
                aria-label={`字幕段落 ${globalIndex + 1}: ${displayText}`}
                data-testid="subtitle-card"
                data-active={isActive}
              >
                {hasTokens && enhancedMode ? (
                  // Enhanced word-level display
                  <div className="flex flex-wrap items-end gap-1">
                    {tokens.map((token, tokenIndex) => {
                      const isTokenActive = isWordActive(token, globalIndex);

                      return (
                        <div
                          key={`${segment.id ?? globalIndex}-token-${tokenIndex}-${token.word}`}
                          className={cn(
                            "word-group inline-flex flex-col items-center",
                            "transition-all duration-150 ease-out",

                            // Active word styling
                            isTokenActive && [
                              "scale-105 text-primary",
                              "animate-pulse-subtle",
                            ],

                            // Performance optimization
                            isScrolling && "transition-none",
                          )}
                          data-testid={isTokenActive ? "active-word" : undefined}
                        >
                          {/* Word text */}
                          <span className={cn(
                            "text-lg font-medium",
                            isTokenActive && "text-primary",
                          )}>
                            {token.word}
                          </span>

                          {/* Reading/Furigana */}
                          {token.reading && token.reading !== token.word && (
                            <span className={cn(
                              "text-xs text-muted-foreground",
                              touchMode && "text-xs",
                              isTokenActive && "text-primary/80",
                            )}>
                              {token.reading}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Standard display
                  <div className="space-y-2">
                    {lines.length > 0 ? (
                      lines.map((line, lineIndex) => (
                        <p
                          key={`${segment.id ?? globalIndex}-line-${lineIndex}`}
                          className={cn(
                            "text-lg leading-relaxed",
                            touchMode && "text-base",
                            isActive && "text-primary font-medium",
                          )}
                        >
                          {line}
                        </p>
                      ))
                    ) : (
                      <p
                        className={cn(
                          "text-lg leading-relaxed",
                          touchMode && "text-base",
                          isActive && "text-primary font-medium",
                        )}
                      >
                        {displayText}
                      </p>
                    )}

                    {/* Translation if available */}
                    {segment.translation && enhancedMode && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {segment.translation}
                      </p>
                    )}
                  </div>
                )}

                {/* Segment timing indicator for enhanced mode */}
                {enhancedMode && isActive && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);

EnhancedSubtitleDisplay.displayName = "EnhancedSubtitleDisplay";

export default EnhancedSubtitleDisplay;
