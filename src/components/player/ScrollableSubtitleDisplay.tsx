"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Segment } from "@/types/database";

interface ScrollableSubtitleDisplayProps {
  segments: Segment[];
  currentTime: number;
  isPlaying: boolean;
  onSegmentClick?: (segment: Segment) => void;
  className?: string;
}

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

function normalizeFurigana(rawFurigana: unknown): FuriganaEntry[] {
  if (!rawFurigana) {
    return [];
  }

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
          const readingValue =
            typeof candidate.reading === "string" ? candidate.reading : undefined;

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

  if (typeof rawFurigana === "object") {
    return normalizeFurigana(Object.values(rawFurigana ?? {}));
  }

  return [];
}

const ScrollableSubtitleDisplay = React.memo<ScrollableSubtitleDisplayProps>(
  ({ segments, currentTime, isPlaying, onSegmentClick, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeSegmentRef = useRef<HTMLDivElement>(null);
    const previousActiveIndex = useRef<number>(-1);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const safeCurrentTime =
      Number.isFinite(currentTime) && !Number.isNaN(currentTime) ? currentTime : 0;

    const findActiveSegmentIndex = useCallback(() => {
      return segments.findIndex(
        (segment) => safeCurrentTime >= segment.start && safeCurrentTime <= segment.end,
      );
    }, [segments, safeCurrentTime]);

    useEffect(() => {
      const activeIndex = findActiveSegmentIndex();

      // 只有当active segment发生变化时才滚动
      if (activeIndex === previousActiveIndex.current || activeIndex === -1) {
        return;
      }

      previousActiveIndex.current = activeIndex;

      // 清除之前的超时
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // 延迟滚动以确保DOM更新完成
      scrollTimeoutRef.current = setTimeout(
        () => {
          if (!containerRef.current || !activeSegmentRef.current) {
            return;
          }

          const container = containerRef.current;
          const activeElement = activeSegmentRef.current;

          const containerRect = container.getBoundingClientRect();
          const activeRect = activeElement.getBoundingClientRect();

          const relativeTop = activeRect.top - containerRect.top;
          const containerHeight = containerRect.height;
          const elementHeight = activeRect.height;

          const targetScrollTop = relativeTop - containerHeight / 2 + elementHeight / 2;

          const currentScrollTop = container.scrollTop;
          const isVisible =
            targetScrollTop >= currentScrollTop &&
            targetScrollTop + elementHeight <= currentScrollTop + containerHeight;

          if (!isVisible) {
            container.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: isPlaying ? "smooth" : "auto",
            });
          }
        },
        isPlaying ? 100 : 0,
      ); // 播放时稍微延迟以确保平滑

      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, [findActiveSegmentIndex, isPlaying]);

    const activeIndex = findActiveSegmentIndex();

    const segmentTokens = useMemo<Token[][]>(() => {
      return segments.map((segment) => {
        const furiganaEntries = normalizeFurigana(segment.furigana as unknown);

        if (Array.isArray(segment.wordTimestamps) && segment.wordTimestamps.length > 0) {
          return segment.wordTimestamps.map((timestamp, index) => ({
            word: timestamp.word,
            reading: furiganaEntries[index]?.reading,
            romaji: furiganaEntries[index]?.reading,
            start: timestamp.start,
            end: timestamp.end,
          })) as Token[];
        }

        if (furiganaEntries.length > 0) {
          return furiganaEntries.map((entry) => ({
            word: entry.text,
            reading: entry.reading,
            romaji: entry.reading,
          })) as Token[];
        }

        if (segment.text) {
          const tokens = segment.text.split(/\s+/).filter(Boolean);

          if (tokens.length > 1) {
            return tokens.map((word) => ({ word })) as Token[];
          }
        }

        return [] as Token[];
      }) as Token[][];
    }, [segments]);

    return (
      <>
        {/* 字幕容器 */}
        <div
          ref={containerRef}
          className={cn("player-subtitle-container space-y-[var(--space-subtitle-gap)]", className)}
          data-testid="subtitle-scroll-container"
        >
          {segments.length === 0 ? (
            <div className="flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
              <p>暂无字幕内容</p>
            </div>
          ) : (
            segments.map((segment, index) => {
              const isActive = index === activeIndex;
              const tokens = segmentTokens[index] || [];
              const hasTokens = tokens.length > 0;

              // 显示文本
              const displayText = segment.normalizedText || segment.text;
              const lines = displayText
                .split(/\n+/)
                .map((line) => line.trim())
                .filter(Boolean);

              return (
                <button
                  type="button"
                  key={segment.id ?? `${segment.start}-${segment.end}-${index}`}
                  ref={isActive ? activeSegmentRef : null}
                  onClick={() => onSegmentClick?.(segment)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSegmentClick?.(segment);
                    }
                  }}
                  data-testid="subtitle-card"
                  data-active={isActive}
                  className={cn(
                    "subtitle-line mb-[var(--space-subtitle-gap)]",
                    isActive && "highlight",
                  )}
                  style={{
                    marginBottom: isActive
                      ? "var(--space-status-gap)"
                      : "var(--space-subtitle-gap)",
                  }}
                >
                  {hasTokens ? (
                    <div className="flex flex-wrap items-end">
                      {tokens.map((token, tokenIndex) => {
                        const isTokenActive =
                          isActive &&
                          typeof token.start === "number" &&
                          typeof token.end === "number" &&
                          safeCurrentTime >= token.start &&
                          safeCurrentTime <= token.end;

                        return (
                          <div
                            key={`${segment.id ?? index}-token-${tokenIndex}-${token.word}`}
                            className="word-group"
                            data-testid={isTokenActive ? "active-word" : undefined}
                          >
                            <span className="player-word-surface">{token.word}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lines.length > 0 ? (
                        lines.map((line, lineIndex) => (
                          <p
                            key={`${segment.id ?? index}-line-${lineIndex}`}
                            className="player-subtitle-plain"
                          >
                            {line}
                          </p>
                        ))
                      ) : (
                        <p className="player-subtitle-plain text-base">{displayText}</p>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </>
    );
  },
);

ScrollableSubtitleDisplay.displayName = "ScrollableSubtitleDisplay";

export default ScrollableSubtitleDisplay;
