"use client";

import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils/utils";
import type { Segment, WordTimestamp } from "@/types/db/database";
import type { SubtitleSyncConfig } from "./SubtitleSync";

/**
 * Props for SubtitleDisplay component
 */
export interface SubtitleDisplayProps {
  /** Array of subtitle segments to display */
  segments: Segment[];
  /** Total number of segments in the full list */
  totalSegments: number;
  /** Index of the currently active segment */
  activeSegmentIndex: number;
  /** Index of the currently active word within the active segment */
  activeWordIndex: number;
  /** Configuration options */
  config: SubtitleSyncConfig;
  /** Callback when user clicks on a subtitle segment */
  onSegmentClick?: (segment: Segment, index: number) => void;
  /** Callback when user clicks on a specific word */
  onWordClick?: (segment: Segment, word: WordTimestamp, wordIndex: number) => void;
  /** Whether component is in touch mode */
  touchMode?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Processed subtitle token with highlighting information
 */
interface ProcessedToken {
  word: string;
  reading?: string;
  romaji?: string;
  start?: number;
  end?: number;
  isActive: boolean;
  isFirstActive: boolean;
  isLastActive: boolean;
}

/**
 * Processed subtitle line with metadata
 */
interface ProcessedLine {
  text: string;
  tokens?: ProcessedToken[];
  isActive: boolean;
}

/**
 * Normalize furigana data for display
 */
function normalizeFurigana(rawFurigana: unknown): Array<{ text: string; reading: string }> {
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
      .filter((entry): entry is { text: string; reading: string } => !!entry);
  }

  if (typeof rawFurigana === "string") {
    try {
      const parsed = JSON.parse(rawFurigana);
      return normalizeFurigana(parsed);
    } catch {
      return rawFurigana
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => ({ text: token, reading: token }));
    }
  }

  return [];
}

/**
 * SubtitleDisplay - Optimized subtitle rendering component
 *
 * Features:
 * - GPU-accelerated animations
 * - Accessibility compliance (WCAG 2.1)
 * - Touch-friendly interactions
 * - Word-level highlighting support
 * - Performance optimized for large subtitle collections
 */
export const SubtitleDisplay = forwardRef<HTMLDivElement, SubtitleDisplayProps>(
  (
    {
      segments,
      totalSegments,
      activeSegmentIndex,
      activeWordIndex,
      config,
      onSegmentClick,
      onWordClick,
      touchMode = false,
      className = "",
    },
    ref
  ) => {
    const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

    // Process segments for optimal rendering
    const processedSegments = useMemo(() => {
      return segments.map((segment, segmentIndex) => {
        const isActive = segmentIndex === activeSegmentIndex;
        const isHovered = segmentIndex === hoveredSegment;

        // Use normalized text or fallback to original text
        const displayText = segment.normalizedText || segment.text || "";

        // Split text into lines
        const lines = displayText
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);

        // Process furigana data
        const furiganaEntries = normalizeFurigana(segment.furigana as unknown);

        // Process tokens if word timestamps are available
        let tokens: ProcessedToken[] = [];

        if (Array.isArray(segment.wordTimestamps) && segment.wordTimestamps.length > 0) {
          tokens = segment.wordTimestamps.map((timestamp, wordIdx) => {
            const isWordActive = isActive && wordIdx === activeWordIndex;
            const isFirstActiveWord = isWordActive && wordIdx === 0;
            const isLastActiveWord = isWordActive && wordIdx === segment.wordTimestamps!.length - 1;

            return {
              word: timestamp.word,
              reading: furiganaEntries[wordIdx]?.reading,
              romaji: furiganaEntries[wordIdx]?.reading,
              start: timestamp.start,
              end: timestamp.end,
              isActive: isWordActive,
              isFirstActive: isFirstActiveWord,
              isLastActive: isLastActiveWord,
            };
          });
        } else if (furiganaEntries.length > 0) {
          // Use furigana entries as tokens if no word timestamps
          tokens = furiganaEntries.map((entry, idx) => ({
            word: entry.text,
            reading: entry.reading,
            romaji: entry.reading,
            isActive: false,
            isFirstActive: false,
            isLastActive: false,
          }));
        }

        // Process lines with token information
        const processedLines: ProcessedLine[] = [];

        if (tokens.length > 0) {
          // Create lines from tokens
          let currentLineTokens: ProcessedToken[] = [];
          let currentLineText = "";

          tokens.forEach((token) => {
            const space = currentLineText.length > 0 ? " " : "";
            currentLineText += space + token.word;
            currentLineTokens.push(token);

            // Create a new line when text gets too long
            if (currentLineText.length > 50) {
              processedLines.push({
                text: currentLineText,
                tokens: [...currentLineTokens],
                isActive,
              });
              currentLineTokens = [];
              currentLineText = "";
            }
          });

          // Add remaining tokens
          if (currentLineTokens.length > 0) {
            processedLines.push({
              text: currentLineText,
              tokens: currentLineTokens,
              isActive,
            });
          }
        } else {
          // Create lines from plain text
          lines.forEach((line) => {
            processedLines.push({
              text: line,
              isActive,
            });
          });
        }

        return {
          ...segment,
          isActive,
          isHovered,
          processedLines,
          tokens,
        };
      });
    }, [segments, activeSegmentIndex, activeWordIndex, hoveredSegment]);

    // Handle segment click
    const handleSegmentClick = useCallback((
      segment: Segment,
      index: number,
      event: React.MouseEvent
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (onSegmentClick) {
        onSegmentClick(segment, index);
      }
    }, [onSegmentClick]);

    // Handle word click
    const handleWordClick = useCallback((
      segment: Segment,
      word: WordTimestamp,
      wordIndex: number,
      event: React.MouseEvent
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (onWordClick) {
        onWordClick(segment, word, wordIndex);
      }
    }, [onWordClick]);

    // Generate segment ID
    const getSegmentId = useCallback((segment: Segment, index: number) => {
      return `subtitle-segment-${segment.id ?? `${segment.start}-${segment.end}-${index}`}`;
    }, []);

    // Render a single token with optional furigana
    const renderToken = useCallback((
      token: ProcessedToken,
      segmentIndex: number,
      tokenIndex: number,
      segment: Segment
    ) => {
      const tokenClass = cn(
        "subtitle-token inline-block transition-all duration-150 ease-out",
        token.isActive && "token-active",
        !token.isActive && token.isActive !== undefined && "token-inactive",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
        "rounded-sm px-1 -mx-1"
      );

      const hasReading = token.reading && token.reading !== token.word;

      return (
        <span key={tokenIndex} className="subtitle-token-wrapper">
          {onWordClick ? (
            <button
              type="button"
              className={tokenClass}
              onClick={(event) => handleWordClick(
                segment,
                {
                  word: token.word,
                  start: token.start || 0,
                  end: token.end || 0,
                },
                tokenIndex,
                event
              )}
              aria-label={`Jump to "${token.word}"`}
              tabIndex={token.isActive ? 0 : -1}
            >
              {token.word}
            </button>
          ) : (
            <span className={tokenClass}>
              {token.word}
            </span>
          )}

          {/* Furigana reading */}
          {hasReading && (
            <span className="subtitle-furigana block text-xs opacity-70 h-3 leading-tight">
              {token.reading}
            </span>
          )}
        </span>
      );
    }, [onWordClick, handleWordClick]);

    // Render a single subtitle segment
    const renderSegment = useCallback((segment: Segment & {
      isActive: boolean;
      isHovered: boolean;
      processedLines: ProcessedLine[];
      tokens: ProcessedToken[];
    }, index: number) => {
      const segmentId = getSegmentId(segment, index);
      const segmentClass = cn(
        "subtitle-segment p-3 mb-2 rounded-lg transition-all duration-200 ease-out",
        "border border-transparent",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        segment.isActive && "segment-active",
        !segment.isActive && segment.isHovered && "segment-hovered",
        config.highContrast && "high-contrast",
        touchMode && "touch-segment"
      );

      const contentClass = cn(
        "subtitle-content",
        config.displayStyle === "compact" && "text-sm",
        config.displayStyle === "minimal" && "text-xs"
      );

      return (
        <div
          key={segmentId}
          id={segmentId}
          className={segmentClass}
          role="group"
          aria-label={`Subtitle segment ${index + 1} of ${totalSegments}`}
          aria-current={segment.isActive ? "true" : undefined}
          data-segment-index={index}
          data-active={segment.isActive}
        >
          {onSegmentClick ? (
            <button
              type="button"
              className={cn(
                "w-full text-left",
                contentClass,
                "hover:bg-primary/5 active:bg-primary/10"
              )}
              onClick={(event) => handleSegmentClick(segment, index, event)}
              onMouseEnter={() => setHoveredSegment(index)}
              onMouseLeave={() => setHoveredSegment(null)}
              onFocus={() => setHoveredSegment(index)}
              onBlur={() => setHoveredSegment(null)}
            >
              {renderSegmentContent(segment, index)}
            </button>
          ) : (
            <div className={contentClass}>
              {renderSegmentContent(segment, index)}
            </div>
          )}
        </div>
      );
    }, [
      config.displayStyle,
      config.highContrast,
      touchMode,
      totalSegments,
      onSegmentClick,
      handleSegmentClick,
      getSegmentId
    ]);

    // Render segment content (text or tokens)
    const renderSegmentContent = useCallback((
      segment: Segment & {
        isActive: boolean;
        isHovered: boolean;
        processedLines: ProcessedLine[];
        tokens: ProcessedToken[];
      },
      index: number
    ) => {
      // If we have tokens with timing information, render them
      if (segment.tokens.length > 0 && config.wordHighlighting) {
        return (
          <div className="space-y-1">
            {segment.processedLines.map((line, lineIndex) => (
              <div key={lineIndex} className="flex flex-wrap items-end gap-1">
                {line.tokens?.map((token, tokenIndex) =>
                  renderToken(token, index, tokenIndex, segment)
                )}
              </div>
            ))}
          </div>
        );
      }

      // Otherwise render plain text lines
      return (
        <div className="space-y-1">
          {segment.processedLines.map((line, lineIndex) => (
            <p key={lineIndex} className="subtitle-line">
              {line.text}
            </p>
          ))}
        </div>
      );
    }, [config.wordHighlighting, renderToken]);

    // Empty state
    if (segments.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            "subtitle-display-empty flex min-h-[120px] items-center justify-center",
            className
          )}
          role="status"
          aria-live="polite"
        >
          <p className="text-muted-foreground text-sm">
            {config.displayStyle === "minimal"
              ? "No subtitles"
              : "暂无字幕内容"
            }
          </p>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "subtitle-display overflow-y-auto overscroll-contain",
          "scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
          "p-4 space-y-2",
          touchMode && "touch-scroll",
          className
        )}
        role="log"
        aria-label="Subtitle display"
        aria-live="polite"
        aria-atomic="false"
      >
        {segments.map((segment, index) => renderSegment(segment as any, index))}
      </div>
    );
  }
);

SubtitleDisplay.displayName = "SubtitleDisplay";

export default SubtitleDisplay;
