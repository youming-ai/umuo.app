"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/utils";
import type { Segment, WordTimestamp } from "@/types/db/database";
import type { SubtitleSyncConfig } from "./SubtitleSync";

/**
 * Props for SubtitleHighlight component
 */
export interface SubtitleHighlightProps {
  /** The current subtitle segment */
  segment: Segment;
  /** Index of the currently active word within the segment */
  activeWordIndex: number;
  /** Current playback time in seconds */
  currentTime: number;
  /** Configuration options */
  config: SubtitleSyncConfig;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Highlight animation state
 */
interface HighlightState {
  /** Current progress of the highlight animation (0-1) */
  progress: number;
  /** Whether the highlight is currently animating */
  isAnimating: boolean;
  /** Target word index for the animation */
  targetWordIndex: number;
  /** Previous word index */
  previousWordIndex: number;
}

/**
 * Highlight animation settings
 */
interface HighlightAnimation {
  /** Duration of the highlight animation in milliseconds */
  duration: number;
  /** Easing function for the animation */
  easing: string;
  /** Whether to enable glow effect */
  glowEffect: boolean;
  /** Whether to enable smooth color transitions */
  smoothTransition: boolean;
}

/**
 * Default highlight animation settings
 */
const DEFAULT_ANIMATION: HighlightAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  glowEffect: true,
  smoothTransition: true,
};

/**
 * Calculate highlight progress based on timing
 */
function calculateHighlightProgress(
  currentTime: number,
  wordStart: number,
  wordEnd: number
): number {
  if (currentTime <= wordStart) return 0;
  if (currentTime >= wordEnd) return 1;

  const duration = wordEnd - wordStart;
  const elapsed = currentTime - wordStart;
  return Math.min(1, Math.max(0, elapsed / duration));
}

/**
 * SubtitleHighlight - Advanced word-level highlighting system
 *
 * Features:
 * - Real-time word-level highlighting with precise timing
 * - Smooth GPU-accelerated animations
 * - Accessibility compliance with proper ARIA labels
 * - Mobile-optimized performance
 * - Customizable highlight styles
 */
export const SubtitleHighlight: React.FC<SubtitleHighlightProps> = React.memo(
  ({
    segment,
    activeWordIndex,
    currentTime,
    config,
    className = "",
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const progressRef = useRef<number>(0);

    const [highlightState, setHighlightState] = useState<HighlightState>({
      progress: 0,
      isAnimating: false,
      targetWordIndex: -1,
      previousWordIndex: -1,
    });

    const [isReady, setIsReady] = useState(false);

    // Process word timestamps with timing validation
    const processedWords = useMemo(() => {
      if (!Array.isArray(segment.wordTimestamps) || segment.wordTimestamps.length === 0) {
        return [];
      }

      return segment.wordTimestamps
        .map((word, index) => ({
          ...word,
          index,
          duration: word.end - word.start,
          isValid: word.start >= 0 && word.end > word.start && word.word.trim().length > 0,
        }))
        .filter(word => word.isValid);
    }, [segment.wordTimestamps]);

    // Current active word with timing information
    const activeWord = useMemo(() => {
      if (activeWordIndex < 0 || activeWordIndex >= processedWords.length) {
        return null;
      }
      return processedWords[activeWordIndex];
    }, [activeWordIndex, processedWords]);

    // Calculate highlight progress for the active word
    const currentProgress = useMemo(() => {
      if (!activeWord) return 0;
      return calculateHighlightProgress(currentTime, activeWord.start, activeWord.end);
    }, [activeWord, currentTime]);

    // Animation frame update handler
    const updateAnimation = useCallback(() => {
      if (!containerRef.current) return;

      const targetProgress = currentProgress;
      const currentProgressState = progressRef.current;

      // Smooth progress transition
      const diff = targetProgress - currentProgressState;
      const step = diff * 0.15; // Smoothing factor
      const newProgress = currentProgressState + step;

      progressRef.current = newProgress;

      // Update state if significant change
      if (Math.abs(newProgress - highlightState.progress) > 0.01) {
        setHighlightState(prev => ({
          ...prev,
          progress: newProgress,
          isAnimating: Math.abs(diff) > 0.001,
        }));
      }

      // Continue animation if needed
      if (Math.abs(diff) > 0.001) {
        animationRef.current = requestAnimationFrame(updateAnimation);
      }
    }, [currentProgress, highlightState.progress]);

    // Handle highlight state changes
    useEffect(() => {
      const newTargetIndex = activeWordIndex;

      setHighlightState(prev => {
        // Only update if target changed significantly
        if (Math.abs(newTargetIndex - prev.targetWordIndex) > 0) {
          return {
            ...prev,
            targetWordIndex: newTargetIndex,
            previousWordIndex: prev.targetWordIndex,
            isAnimating: true,
          };
        }
        return prev;
      });
    }, [activeWordIndex]);

    // Animation loop
    useEffect(() => {
      if (config.wordHighlighting && isReady) {
        animationRef.current = requestAnimationFrame(updateAnimation);
      }

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [updateAnimation, config.wordHighlighting, isReady]);

    // Mark as ready after mount
    useEffect(() => {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    }, []);

    // Generate highlight styles
    const highlightStyles = useMemo(() => {
      if (!activeWord || !config.wordHighlighting) return {};

      const { duration, easing, glowEffect, smoothTransition } = DEFAULT_ANIMATION;
      const progress = highlightState.progress;

      const baseStyles: React.CSSProperties = {
        transition: smoothTransition
          ? `all ${duration}ms ${easing}`
          : undefined,
      };

      // Glow effect styles
      if (glowEffect) {
        const glowIntensity = progress * 0.8;
        baseStyles.boxShadow = `0 0 ${20 * glowIntensity}px ${8 * glowIntensity}px rgba(59, 130, 246, ${glowIntensity * 0.3})`;
        baseStyles.textShadow = `0 0 ${10 * glowIntensity}px rgba(59, 130, 246, ${glowIntensity * 0.5})`;
      }

      // Progress-based styling
      if (progress > 0 && progress < 1) {
        // Highlight in progress
        baseStyles.background = `linear-gradient(90deg,
          rgba(59, 130, 246, ${0.3 * progress}) 0%,
          rgba(59, 130, 246, ${0.1 * progress}) ${progress * 100}%,
          transparent ${progress * 100}%)`;
        baseStyles.borderRadius = "4px";
        baseStyles.padding = "2px 4px";
        baseStyles.margin = "-2px -4px";
      } else if (progress >= 1) {
        // Fully highlighted
        baseStyles.backgroundColor = "rgba(59, 130, 246, 0.2)";
        baseStyles.borderRadius = "4px";
        baseStyles.padding = "2px 4px";
        baseStyles.margin = "-2px -4px";
        baseStyles.borderLeft = `3px solid rgb(59, 130, 246)`;
        baseStyles.borderRight = `3px solid rgba(59, 130, 246, 0.3)`;
      }

      // High contrast mode adjustments
      if (config.highContrast) {
        baseStyles.backgroundColor = progress >= 1
          ? "rgba(0, 0, 0, 0.8)"
          : undefined;
        baseStyles.color = progress >= 1
          ? "white"
          : undefined;
        baseStyles.border = progress >= 1
          ? "2px solid white"
          : undefined;
      }

      return baseStyles;
    }, [activeWord, config.wordHighlighting, config.highContrast, highlightState.progress]);

    // Handle accessibility announcements
    useEffect(() => {
      if (activeWord && config.wordHighlighting && isReady) {
        // Announce word changes for screen readers
        const announcement = `Word: ${activeWord.word}`;
        const announcementElement = document.getElementById("subtitle-announcement");
        if (announcementElement) {
          announcementElement.textContent = announcement;
        }
      }
    }, [activeWord, config.wordHighlighting, isReady]);

    // Render highlight overlay for the active word
    const renderWordHighlight = useCallback((word: WordTimestamp, index: number) => {
      const isActive = index === activeWordIndex;
      const isHighlighted = isActive && config.wordHighlighting;
      const progress = isActive ? currentProgress : 0;

      const wordClass = cn(
        "word-highlight inline-block",
        "transition-all duration-200 ease-out",
        isActive && "word-active",
        !isActive && config.wordHighlighting && "word-inactive opacity-60",
        config.highContrast && "high-contrast-word"
      );

      const wordStyle: React.CSSProperties = isHighlighted && isActive
        ? highlightStyles
        : {};

      return (
        <span
          key={`highlight-${index}-${word.word}`}
          className={wordClass}
          style={wordStyle}
          data-word-index={index}
          data-progress={progress}
          data-active={isActive}
          aria-hidden="true"
        >
          {word.word}
        </span>
      );
    }, [activeWordIndex, config.wordHighlighting, config.highContrast, highlightStyles, currentProgress]);

    // If no words or highlighting disabled, render nothing
    if (processedWords.length === 0 || !config.wordHighlighting || !isReady) {
      return (
        <div
          ref={containerRef}
          className={cn("subtitle-highlight-empty", className)}
          aria-hidden="true"
        />
      );
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          "subtitle-highlight-overlay pointer-events-none select-none",
          "absolute inset-0 z-10",
          "flex items-center justify-center",
          "px-4 py-2",
          config.highContrast && "high-contrast-overlay",
          className
        )}
        aria-hidden="true"
        role="presentation"
      >
        {/* Hidden announcement for screen readers */}
        <div
          id="subtitle-announcement"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        />

        {/* Highlight overlay */}
        <div className="relative w-full max-w-4xl">
          {/* Progress indicator */}
          {activeWord && (
            <div
              className="absolute top-0 left-0 h-0.5 bg-primary transition-all duration-75 ease-linear"
              style={{
                width: `${highlightState.progress * 100}%`,
                opacity: highlightState.isAnimating ? 1 : 0.7,
              }}
              aria-hidden="true"
            />
          )}

          {/* Word highlights */}
          <div className="flex flex-wrap items-center justify-center gap-1 text-lg leading-relaxed">
            {processedWords.map((word, index) => renderWordHighlight(word, index))}
          </div>

          {/* Active word indicator */}
          {activeWord && (
            <div
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rounded-full opacity-80"
              style={{
                animation: "pulse 2s infinite",
              }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Custom styles for animations */}
        <style jsx>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 0.8;
              transform: translateX(-50%) scale(1);
            }
            50% {
              opacity: 1;
              transform: translateX(-50%) scale(1.2);
            }
          }

          .word-active {
            font-weight: 600;
            position: relative;
            z-index: 1;
          }

          .word-inactive {
            font-weight: 400;
          }

          .high-contrast-word.word-active {
            background-color: black !important;
            color: white !important;
            border: 1px solid white !important;
          }

          .high-contrast-overlay {
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
          }
        `}</style>
      </div>
    );
  }
);

SubtitleHighlight.displayName = "SubtitleHighlight";

export default SubtitleHighlight;
