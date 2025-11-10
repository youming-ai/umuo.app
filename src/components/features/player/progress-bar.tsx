"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  memo,
} from "react";
import { cn } from "@/lib/utils/utils";
import {
  hapticFeedback,
  useHapticFeedback,
} from "@/lib/mobile/haptic-feedback";
import { touchOptimizer } from "@/lib/mobile/touch-optimizer";
import { MobileDetector, type TouchGestureData } from "@/types/mobile";
import type { Segment, AudioPlayerState } from "@/types/db/database";

// Type definitions
export interface ProgressBarProps {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether audio is currently loading/buffering */
  isLoading?: boolean;
  /** Buffered time ranges (optional) */
  bufferedRanges?: Array<{ start: number; end: number }>;
  /** Segments/chapters for markers (optional) */
  segments?: Segment[];
  /** Callback when seeking occurs */
  onSeek: (time: number) => void;
  /** Callback when seeking starts (for preview) */
  onSeekStart?: () => void;
  /** Callback when seeking ends */
  onSeekEnd?: () => void;
  /** Custom CSS classes */
  className?: string;
  /** Whether to show time display */
  showTimeDisplay?: boolean;
  /** Whether to show buffer indicator */
  showBufferIndicator?: boolean;
  /** Whether to show segment markers */
  showSegmentMarkers?: boolean;
  /** Touch-friendly mode */
  touchMode?: boolean;
  /** Maximum response time requirement in ms - CRITICAL: Must be <200ms */
  maxResponseTime?: number;
  /** Theme variant */
  variant?: "default" | "compact" | "minimal";
  /** EnhancedAudioPlayer integration flag */
  enhancedMode?: boolean;
  /** Performance monitoring mode */
  performanceMode?: boolean;
}

interface SeekPreviewData {
  isVisible: boolean;
  position: number; // Percentage (0-100)
  time: number; // Time in seconds
  x: number; // Mouse/touch position
}

interface TouchInteractionState {
  isDragging: boolean;
  startX: number;
  currentX: number;
  dragStartTime: number;
  lastHapticTime: number;
  velocityX: number; // For momentum-based seeking
  lastUpdateTime: number; // For performance tracking
}

interface PerformanceMetrics {
  lastSeekTime: number;
  averageResponseTime: number;
  seekCount: number;
  slowSeeks: number; // Count of seeks > maxResponseTime
  peakResponseTime: number;
}

// Internal Components
const SeekHandle: React.FC<{
  isDragging: boolean;
  progress: number;
  onTouchStart: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  variant: "default" | "compact" | "minimal";
}> = memo(({ isDragging, progress, onTouchStart, onMouseDown, variant }) => {
  const handleSize =
    variant === "compact" ? 12 : variant === "minimal" ? 8 : 16;

  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 z-20 rounded-full bg-primary shadow-md transition-all duration-150",
        "hover:scale-110 active:scale-95",
        isDragging && "scale-125 shadow-lg ring-2 ring-primary/50",
        variant === "compact" && "w-3 h-3",
        variant === "minimal" && "w-2 h-2",
        "w-4 h-4",
      )}
      style={{
        left: `calc(${progress}% - ${handleSize / 2}px)`,
        transition: isDragging ? "none" : "transform 150ms ease-out",
      }}
      onTouchStart={onTouchStart}
      onMouseDown={onMouseDown}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      tabIndex={0}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          // Parent will handle the actual seeking
          const event = new CustomEvent("keyboardSeek", {
            detail: { direction: "backward", step },
          });
          e.currentTarget.dispatchEvent(event);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          const event = new CustomEvent("keyboardSeek", {
            detail: { direction: "forward", step },
          });
          e.currentTarget.dispatchEvent(event);
        }
      }}
    />
  );
});

SeekHandle.displayName = "SeekHandle";

const BufferIndicator: React.FC<{
  bufferedRanges: Array<{ start: number; end: number }>;
  duration: number;
}> = memo(({ bufferedRanges, duration }) => {
  return (
    <>
      {bufferedRanges.map((range, index) => {
        const startPercent = duration > 0 ? (range.start / duration) * 100 : 0;
        const endPercent = duration > 0 ? (range.end / duration) * 100 : 0;
        const widthPercent = endPercent - startPercent;

        return (
          <div
            key={index}
            className="absolute top-0 h-full bg-primary/20 rounded-sm pointer-events-none"
            style={{
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
              transition: "width 300ms ease-out",
            }}
          />
        );
      })}
    </>
  );
});

BufferIndicator.displayName = "BufferIndicator";

const TimeDisplay: React.FC<{
  currentTime: number;
  duration: number;
  isDragging: boolean;
  previewTime?: number;
  variant: "default" | "compact" | "minimal";
}> = memo(({ currentTime, duration, isDragging, previewTime, variant }) => {
  const formatTime = useCallback((time: number): string => {
    if (!Number.isFinite(time) || time < 0) return "00:00";

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const displayTime =
    isDragging && previewTime !== undefined ? previewTime : currentTime;

  if (variant === "minimal") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between text-xs tabular-nums",
        variant === "compact" && "text-[10px]",
        "text-muted-foreground font-mono",
      )}
    >
      <span className={cn(isDragging && "text-primary font-semibold")}>
        {formatTime(displayTime)}
      </span>
      <span>/</span>
      <span>{formatTime(duration)}</span>
    </div>
  );
});

TimeDisplay.displayName = "TimeDisplay";

const ProgressMarkers: React.FC<{
  segments: Segment[];
  duration: number;
  onSegmentClick?: (segment: Segment) => void;
  isDragging: boolean;
}> = memo(({ segments, duration, onSegmentClick, isDragging }) => {
  const visibleSegments = useMemo(() => {
    // Only show markers for segments that are long enough to be distinguishable
    const minDistance = 2; // Minimum 2% between markers
    const filtered: Segment[] = [];

    segments.forEach((segment, index) => {
      const position = duration > 0 ? (segment.start / duration) * 100 : 0;

      if (
        index === 0 ||
        position - (filtered[filtered.length - 1]?.start || 0) > minDistance
      ) {
        filtered.push(segment);
      }
    });

    return filtered;
  }, [segments, duration]);

  if (visibleSegments.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {visibleSegments.map((segment, index) => {
        const position = duration > 0 ? (segment.start / duration) * 100 : 0;

        return (
          <button
            key={segment.id || index}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-primary/40 rounded-full",
              "pointer-events-auto hover:bg-primary/60 hover:scale-y-150",
              "transition-all duration-150",
              isDragging && "pointer-events-none",
            )}
            style={{ left: `${position}%` }}
            onClick={() => onSegmentClick?.(segment)}
            title={`${segment.text.substring(0, 50)}...`}
            aria-label={`Jump to segment: ${segment.text.substring(0, 30)}`}
          />
        );
      })}
    </div>
  );
});

ProgressMarkers.displayName = "ProgressMarkers";

/**
 * Progress Bar Component with Drag-to-Seek Functionality
 *
 * Features:
 * - Smooth drag functionality with visual feedback
 * - <200ms response time requirement
 * - Mobile touch optimization (44px minimum targets)
 * - Buffer indicators and segment markers
 * - Keyboard navigation support
 * - Haptic feedback integration
 * - GPU-accelerated animations
 * - Accessibility compliance (WCAG 2.1)
 */
export const ProgressBar = memo<ProgressBarProps>(
  ({
    currentTime,
    duration,
    isPlaying,
    isLoading = false,
    bufferedRanges = [],
    segments = [],
    onSeek,
    onSeekStart,
    onSeekEnd,
    className = "",
    showTimeDisplay = true,
    showBufferIndicator = true,
    showSegmentMarkers = true,
    touchMode = false,
    maxResponseTime = 200,
    variant = "default",
    enhancedMode = true,
    performanceMode = process.env.NODE_ENV === "development",
  }) => {
    // Refs
    const progressBarRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);

    // Mobile detection and optimization
    const mobileDetector = useMemo(() => MobileDetector.getInstance(), []);
    const isMobileDevice = mobileDetector.isMobile();
    const haptic = useHapticFeedback();

    // State
    const [touchState, setTouchState] = useState<TouchInteractionState>({
      isDragging: false,
      startX: 0,
      currentX: 0,
      dragStartTime: 0,
      lastHapticTime: 0,
    });

    const [previewData, setPreviewData] = useState<SeekPreviewData>({
      isVisible: false,
      position: 0,
      time: 0,
      x: 0,
    });

    // Memoized calculations for performance
    const progress = useMemo(() => {
      return duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
    }, [currentTime, duration]);

    const bufferedRangesSafe = useMemo(() => {
      return bufferedRanges.filter(
        (range) =>
          range.start >= 0 && range.end > range.start && range.end <= duration,
      );
    }, [bufferedRanges, duration]);

    // Performance monitoring
    const measurePerformance = useCallback(() => {
      const now = performance.now();
      const deltaTime = now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;
      return deltaTime;
    }, []);

    // Calculate seek position from mouse/touch coordinates
    const calculateSeekPosition = useCallback(
      (clientX: number): { position: number; time: number } => {
        if (!progressBarRef.current) {
          return { position: 0, time: 0 };
        }

        const rect = progressBarRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const percentage = Math.max(
          0,
          Math.min(100, (relativeX / rect.width) * 100),
        );
        const time = duration > 0 ? (percentage / 100) * duration : 0;

        return { position: percentage, time };
      },
      [duration],
    );

    // Handle seek with performance optimization
    const handleSeekWithFeedback = useCallback(
      (time: number, immediate = false) => {
        const startTime = performance.now();

        // Haptic feedback for touch devices
        if (isMobileDevice && !touchState.lastHapticTime) {
          haptic.selection();
          setTouchState((prev) => ({ ...prev, lastHapticTime: Date.now() }));
        }

        // Execute seek
        onSeek(time);

        // Measure performance
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (responseTime > maxResponseTime) {
          console.warn(
            `ProgressBar seek response time exceeded requirement: ${responseTime}ms > ${maxResponseTime}ms`,
          );
        }

        return responseTime;
      },
      [
        onSeek,
        isMobileDevice,
        haptic,
        touchState.lastHapticTime,
        maxResponseTime,
      ],
    );

    // Mouse event handlers
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        const { position, time } = calculateSeekPosition(e.clientX);

        setTouchState({
          isDragging: true,
          startX: e.clientX,
          currentX: e.clientX,
          dragStartTime: Date.now(),
          lastHapticTime: 0,
        });

        setPreviewData({
          isVisible: true,
          position,
          time,
          x: e.clientX,
        });

        onSeekStart?.();
        measurePerformance();
      },
      [calculateSeekPosition, onSeekStart, measurePerformance],
    );

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!touchState.isDragging) return;

        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Use requestAnimationFrame for smooth updates
        animationFrameRef.current = requestAnimationFrame(() => {
          const { position, time } = calculateSeekPosition(e.clientX);

          setTouchState((prev) => ({
            ...prev,
            currentX: e.clientX,
          }));

          setPreviewData((prev) => ({
            ...prev,
            position,
            time,
            x: e.clientX,
          }));

          // Immediate seek for responsive feel
          handleSeekWithFeedback(time, true);
          measurePerformance();
        });
      },
      [
        touchState.isDragging,
        calculateSeekPosition,
        handleSeekWithFeedback,
        measurePerformance,
      ],
    );

    const handleMouseUp = useCallback(
      (e: MouseEvent) => {
        if (!touchState.isDragging) return;

        const { time } = calculateSeekPosition(e.clientX);

        // Final seek
        handleSeekWithFeedback(time);

        // Reset state
        setTouchState({
          isDragging: false,
          startX: 0,
          currentX: 0,
          dragStartTime: 0,
          lastHapticTime: 0,
        });

        setPreviewData({
          isVisible: false,
          position: 0,
          time: 0,
          x: 0,
        });

        onSeekEnd?.();
        measurePerformance();

        // Cancel animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      },
      [
        touchState.isDragging,
        calculateSeekPosition,
        handleSeekWithFeedback,
        onSeekEnd,
        measurePerformance,
      ],
    );

    // Touch event handlers with mobile optimization
    const handleTouchStart = useCallback(
      (e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        const { position, time } = calculateSeekPosition(touch.clientX);

        // Enhanced haptic feedback for touch start
        if (isMobileDevice) {
          haptic.medium();
        }

        setTouchState({
          isDragging: true,
          startX: touch.clientX,
          currentX: touch.clientX,
          dragStartTime: Date.now(),
          lastHapticTime: Date.now(),
        });

        setPreviewData({
          isVisible: true,
          position,
          time,
          x: touch.clientX,
        });

        onSeekStart?.();
        measurePerformance();
      },
      [
        calculateSeekPosition,
        isMobileDevice,
        haptic,
        onSeekStart,
        measurePerformance,
      ],
    );

    const handleTouchMove = useCallback(
      (e: TouchEvent) => {
        if (!touchState.isDragging) return;

        const touch = e.touches[0];

        // Throttle haptic feedback during drag
        const now = Date.now();
        const shouldHaptic = now - touchState.lastHapticTime > 100; // Every 100ms

        if (shouldHaptic && isMobileDevice) {
          haptic.light();
          setTouchState((prev) => ({ ...prev, lastHapticTime: now }));
        }

        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Use requestAnimationFrame for smooth updates
        animationFrameRef.current = requestAnimationFrame(() => {
          const { position, time } = calculateSeekPosition(touch.clientX);

          setTouchState((prev) => ({
            ...prev,
            currentX: touch.clientX,
          }));

          setPreviewData((prev) => ({
            ...prev,
            position,
            time,
            x: touch.clientX,
          }));

          // Immediate seek for responsive feel
          handleSeekWithFeedback(time, true);
          measurePerformance();
        });
      },
      [
        touchState.isDragging,
        calculateSeekPosition,
        handleSeekWithFeedback,
        isMobileDevice,
        haptic,
        measurePerformance,
      ],
    );

    const handleTouchEnd = useCallback(
      (e: TouchEvent) => {
        if (!touchState.isDragging) return;

        const touch = e.changedTouches[0];
        const { time } = calculateSeekPosition(touch.clientX);

        // Enhanced haptic feedback for touch end
        if (isMobileDevice) {
          haptic.success();
        }

        // Final seek
        handleSeekWithFeedback(time);

        // Reset state
        setTouchState({
          isDragging: false,
          startX: 0,
          currentX: 0,
          dragStartTime: 0,
          lastHapticTime: 0,
        });

        setPreviewData({
          isVisible: false,
          position: 0,
          time: 0,
          x: 0,
        });

        onSeekEnd?.();
        measurePerformance();

        // Cancel animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      },
      [
        touchState.isDragging,
        calculateSeekPosition,
        handleSeekWithFeedback,
        isMobileDevice,
        haptic,
        onSeekEnd,
        measurePerformance,
      ],
    );

    // Keyboard event handler
    const handleKeyboardSeek = useCallback(
      (e: CustomEvent) => {
        const { direction, step } = e.detail;
        const seekAmount = (step / 100) * duration;

        let newTime = currentTime;
        if (direction === "forward") {
          newTime = Math.min(duration, currentTime + seekAmount);
        } else {
          newTime = Math.max(0, currentTime - seekAmount);
        }

        haptic.selection();
        handleSeekWithFeedback(newTime);
      },
      [currentTime, duration, haptic, handleSeekWithFeedback],
    );

    // Global event listeners
    useEffect(() => {
      const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
      const handleGlobalMouseUp = (e: MouseEvent) => handleMouseUp(e);
      const handleGlobalTouchMove = (e: TouchEvent) => handleTouchMove(e);
      const handleGlobalTouchEnd = (e: TouchEvent) => handleTouchEnd(e);
      const handleKeyboardEvent = (e: CustomEvent) => handleKeyboardSeek(e);

      if (touchState.isDragging) {
        document.addEventListener("mousemove", handleGlobalMouseMove, {
          passive: false,
        });
        document.addEventListener("mouseup", handleGlobalMouseUp);
        document.addEventListener("touchmove", handleGlobalTouchMove, {
          passive: false,
        });
        document.addEventListener("touchend", handleGlobalTouchEnd);

        // Prevent default touch behaviors during drag
        document.body.style.touchAction = "none";
        document.body.style.userSelect = "none";
      }

      // Add keyboard event listener to seek handle
      const seekHandle =
        progressBarRef.current?.querySelector('[role="slider"]');
      if (seekHandle) {
        seekHandle.addEventListener(
          "keyboardSeek",
          handleKeyboardEvent as EventListener,
        );
      }

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
        document.removeEventListener("touchmove", handleGlobalTouchMove);
        document.removeEventListener("touchend", handleGlobalTouchEnd);
        document.body.style.touchAction = "";
        document.body.style.userSelect = "";

        if (seekHandle) {
          seekHandle.removeEventListener(
            "keyboardSeek",
            handleKeyboardEvent as EventListener,
          );
        }
      };
    }, [
      touchState.isDragging,
      handleMouseMove,
      handleMouseUp,
      handleTouchMove,
      handleTouchEnd,
      handleKeyboardSeek,
    ]);

    // Apply touch optimizations on mount
    useEffect(() => {
      if (progressBarRef.current && (touchMode || isMobileDevice)) {
        touchOptimizer.applyTouchOptimizations(progressBarRef.current);
        touchOptimizer.createTouchProgressIndicator(progressBarRef.current);
      }
    }, [touchMode, isMobileDevice]);

    // Cleanup animation frame on unmount
    useEffect(() => {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, []);

    // Calculate responsive heights
    const barHeight = variant === "compact" ? 4 : variant === "minimal" ? 2 : 6;
    const containerHeight = Math.max(
      44,
      barHeight + (showTimeDisplay ? 20 : 8),
    ); // Minimum 44px for touch

    return (
      <div
        className={cn(
          "w-full flex flex-col gap-2",
          touchMode && "touch-optimized",
          className,
        )}
        style={{ minHeight: `${containerHeight}px` }}
      >
        {/* Main progress bar container */}
        <div
          ref={progressBarRef}
          className={cn(
            "relative w-full bg-secondary rounded-full cursor-pointer overflow-hidden",
            "transition-all duration-200 hover:bg-secondary/80",
            touchState.isDragging &&
              "scale-105 shadow-lg ring-2 ring-primary/30",
            isLoading && "opacity-60",
            "gpu-accelerated",
          )}
          style={{
            height: `${barHeight}px`,
            minHeight: `${Math.max(44, barHeight)}px`, // Touch target minimum
            transform: "translateZ(0)", // GPU acceleration
            willChange: touchState.isDragging ? "transform" : "auto",
          }}
          role="progressbar"
          aria-label={`Audio progress: ${Math.round(progress)}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-busy={isLoading}
          tabIndex={0}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 5 : 1;
            let newTime = currentTime;

            if (e.key === "ArrowLeft") {
              e.preventDefault();
              newTime = Math.max(0, currentTime - step);
              haptic.selection();
              handleSeekWithFeedback(newTime);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              newTime = Math.min(duration, currentTime + step);
              haptic.selection();
              handleSeekWithFeedback(newTime);
            }
          }}
        >
          {/* Buffer indicator */}
          {showBufferIndicator && bufferedRangesSafe.length > 0 && (
            <BufferIndicator
              bufferedRanges={bufferedRangesSafe}
              duration={duration}
            />
          )}

          {/* Progress fill */}
          <div
            className={cn(
              "absolute top-0 left-0 h-full bg-primary rounded-full transition-all",
              touchState.isDragging ? "duration-0" : "duration-300 ease-out",
            )}
            style={{
              width: `${progress}%`,
              transition: touchState.isDragging
                ? "none"
                : "width 300ms ease-out",
            }}
          />

          {/* Segment markers */}
          {showSegmentMarkers && segments.length > 0 && (
            <ProgressMarkers
              segments={segments}
              duration={duration}
              isDragging={touchState.isDragging}
              onSegmentClick={(segment) => {
                haptic.selection();
                handleSeekWithFeedback(segment.start);
              }}
            />
          )}

          {/* Seek handle */}
          <SeekHandle
            isDragging={touchState.isDragging}
            progress={previewData.isVisible ? previewData.position : progress}
            onTouchStart={handleTouchStart}
            onMouseDown={handleMouseDown}
            variant={variant}
          />

          {/* Preview tooltip (shows while dragging) */}
          {previewData.isVisible && (
            <div
              className="absolute -top-8 px-2 py-1 bg-primary text-primary-foreground text-xs rounded shadow-lg pointer-events-none z-30"
              style={{
                left: `${previewData.position}%`,
                transform: "translateX(-50%)",
              }}
            >
              {Math.floor(previewData.time / 60)}:
              {(previewData.time % 60).toFixed(0).padStart(2, "0")}
            </div>
          )}
        </div>

        {/* Time display */}
        {showTimeDisplay && (
          <TimeDisplay
            currentTime={currentTime}
            duration={duration}
            isDragging={touchState.isDragging}
            previewTime={previewData.isVisible ? previewData.time : undefined}
            variant={variant}
          />
        )}
      </div>
    );
  },
);

ProgressBar.displayName = "ProgressBar";

export default ProgressBar;
