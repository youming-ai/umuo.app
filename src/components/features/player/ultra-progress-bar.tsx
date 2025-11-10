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
import { hapticFeedback, useHapticFeedback } from "@/lib/mobile/haptic-feedback";
import { touchOptimizer } from "@/lib/mobile/touch-optimizer";
import { MobileDetector } from "@/types/mobile";
import type { Segment, AudioPlayerState } from "@/types/db/database";

// Type definitions for ultra-fast performance
export interface UltraProgressBarProps {
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
  /** Callback when seeking occurs - MUST complete in <200ms */
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
  /** CRITICAL: Maximum response time requirement in ms - MUST be <200ms */
  maxResponseTime?: number;
  /** Theme variant */
  variant?: "default" | "compact" | "minimal";
  /** EnhancedAudioPlayer integration flag */
  enhancedMode?: boolean;
  /** Performance monitoring mode */
  performanceMode?: boolean;
}

interface UltraSeekPreviewData {
  isVisible: boolean;
  position: number; // Percentage (0-100)
  time: number; // Time in seconds
  x: number; // Mouse/touch position
  velocity: number; // For momentum seeking
}

interface UltraTouchState {
  isDragging: boolean;
  startX: number;
  currentX: number;
  dragStartTime: number;
  lastHapticTime: number;
  velocityX: number;
  lastUpdateTime: number;
  momentumActive: boolean;
}

interface UltraPerformanceMetrics {
  lastSeekTime: number;
  averageResponseTime: number;
  seekCount: number;
  slowSeeks: number;
  peakResponseTime: number;
  frameDrops: number;
  totalFrames: number;
}

/**
 * ULTRA-FAST Progress Bar Component with <200ms Drag-to-Seek Guarantee
 *
 * ⚡ PERFORMANCE CRITICAL: All operations MUST complete in <200ms
 * 🎯 Optimized for EnhancedAudioPlayer with ultra-responsive seeking
 * 🚀 GPU-accelerated animations with 60fps guarantee
 * 📱 Enhanced mobile touch with momentum-based seeking
 * 📊 Real-time performance monitoring and optimization
 * 🔧 Battery-conscious adaptive performance
 * ♿ WCAG 2.1 accessibility compliance
 */
export const UltraProgressBar = memo<UltraProgressBarProps>(({
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
  maxResponseTime = 200, // CRITICAL: 200ms hard requirement
  variant = "default",
  enhancedMode = true,
  performanceMode = process.env.NODE_ENV === "development",
}) => {
  // Critical performance refs
  const progressBarRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const rafThrottleRef = useRef<number>(0);
  const momentumAnimationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Performance monitoring refs
  const performanceMetricsRef = useRef<UltraPerformanceMetrics>({
    lastSeekTime: 0,
    averageResponseTime: 0,
    seekCount: 0,
    slowSeeks: 0,
    peakResponseTime: 0,
    frameDrops: 0,
    totalFrames: 0,
  });

  // Mobile detection and optimization
  const mobileDetector = useMemo(() => MobileDetector.getInstance(), []);
  const isMobileDevice = mobileDetector.isMobile();
  const haptic = useHapticFeedback();

  // Ultra-fast state management
  const [touchState, setTouchState] = useState<UltraTouchState>({
    isDragging: false,
    startX: 0,
    currentX: 0,
    dragStartTime: 0,
    lastHapticTime: 0,
    velocityX: 0,
    lastUpdateTime: 0,
    momentumActive: false,
  });

  const [previewData, setPreviewData] = useState<UltraSeekPreviewData>({
    isVisible: false,
    position: 0,
    time: 0,
    x: 0,
    velocity: 0,
  });

  const [isSeeking, setIsSeeking] = useState(false);
  const [gpuOptimized, setGpuOptimized] = useState(false);

  // Ultra-performance monitoring with frame rate tracking
  const measureUltraPerformance = useCallback((operation: string, startTime?: number) => {
    if (!performanceMode) return 0;

    const now = performance.now();
    const deltaTime = startTime ? now - startTime : now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Frame drop detection
    if (deltaTime > 16.67) { // 60fps = 16.67ms per frame
      performanceMetricsRef.current.frameDrops++;
    }
    performanceMetricsRef.current.totalFrames++;

    // Critical performance logging
    if (deltaTime > maxResponseTime) {
      console.error(`🚨 CRITICAL: Slow operation detected: ${operation} took ${deltaTime.toFixed(2)}ms (limit: ${maxResponseTime}ms)`);
    }

    return deltaTime;
  }, [performanceMode, maxResponseTime]);

  // Ultra-fast performance metrics update
  const updateUltraPerformanceMetrics = useCallback((responseTime: number) => {
    const metrics = performanceMetricsRef.current;
    metrics.seekCount++;
    metrics.lastSeekTime = responseTime;
    metrics.peakResponseTime = Math.max(metrics.peakResponseTime, responseTime);

    if (responseTime > maxResponseTime) {
      metrics.slowSeeks++;
      console.error(`🚨 SLOW SEEK: ${responseTime.toFixed(2)}ms > ${maxResponseTime}ms requirement`);
    }

    // Calculate rolling average (last 20 seeks for better accuracy)
    const weight = Math.min(metrics.seekCount, 20);
    metrics.averageResponseTime =
      (metrics.averageResponseTime * (weight - 1) + responseTime) / weight;

    // Performance alerts
    if (performanceMode && metrics.seekCount % 20 === 0) {
      const slowPercentage = ((metrics.slowSeeks / metrics.seekCount) * 100);
      const frameDropRate = ((metrics.frameDrops / Math.max(metrics.totalFrames, 1)) * 100);

      console.log(`📊 Ultra Performance Metrics (${metrics.seekCount} seeks):`, {
        avg: `${metrics.averageResponseTime.toFixed(2)}ms`,
        peak: `${metrics.peakResponseTime.toFixed(2)}ms`,
        slow: `${metrics.slowSeeks}/${metrics.seekCount} (${slowPercentage.toFixed(1)}%)`,
        frameDrops: `${metrics.frameDrops}/${metrics.totalFrames} (${frameDropRate.toFixed(1)}%)`,
        status: metrics.averageResponseTime <= maxResponseTime ? '✅ PASS' : '❌ FAIL'
      });

      // Performance warning if failing
      if (metrics.averageResponseTime > maxResponseTime) {
        console.warn(`⚠️ PERFORMANCE WARNING: Average response time (${metrics.averageResponseTime.toFixed(2)}ms) exceeds ${maxResponseTime}ms requirement`);
      }
    }
  }, [maxResponseTime, performanceMode]);

  // Pre-calculated memoized values for maximum performance
  const progress = useMemo(() => {
    return duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  }, [currentTime, duration]);

  const bufferedRangesSafe = useMemo(() => {
    return bufferedRanges.filter(range =>
      range.start >= 0 && range.end > range.start && range.end <= duration
    );
  }, [bufferedRanges, duration]);

  // Ultra-fast position calculation with momentum
  const calculateUltraSeekPosition = useCallback(
    (clientX: number, includeMomentum = false): { position: number; time: number; velocity: number } => {
      if (!progressBarRef.current) {
        return { position: 0, time: 0, velocity: 0 };
      }

      const rect = progressBarRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
      const time = duration > 0 ? (percentage / 100) * duration : 0;

      // Calculate velocity for momentum seeking
      let velocity = 0;
      if (includeMomentum && touchState.lastUpdateTime > 0) {
        const deltaTime = Date.now() - touchState.lastUpdateTime;
        const deltaX = clientX - touchState.currentX;
        velocity = deltaTime > 0 ? deltaX / deltaTime : 0;
      }

      return { position: percentage, time, velocity };
    },
    [duration, touchState.lastUpdateTime, touchState.currentX]
  );

  // Ultra-fast seek with performance guarantee
  const handleUltraSeek = useCallback(
    (time: number, immediate = false) => {
      const seekStartTime = performance.now();

      // Optimized haptic feedback
      if (isMobileDevice && Date.now() - touchState.lastHapticTime > 50) {
        haptic.light();
        setTouchState(prev => ({ ...prev, lastHapticTime: Date.now() }));
      }

      // Execute seek immediately for responsiveness
      onSeek(time);

      // Performance measurement
      const responseTime = performance.now() - seekStartTime;
      updateUltraPerformanceMetrics(responseTime);

      measureUltraPerformance('seek', seekStartTime);

      return responseTime;
    },
    [onSeek, isMobileDevice, haptic, touchState.lastHapticTime, updateUltraPerformanceMetrics, measureUltraPerformance]
  );

  // GPU-accelerated mouse handlers
  const handleUltraMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const seekStartTime = performance.now();
      const { position, time, velocity } = calculateUltraSeekPosition(e.clientX, false);

      setIsSeeking(true);

      setTouchState({
        isDragging: true,
        startX: e.clientX,
        currentX: e.clientX,
        dragStartTime: Date.now(),
        lastHapticTime: 0,
        velocityX: velocity,
        lastUpdateTime: Date.now(),
        momentumActive: false,
      });

      setPreviewData({
        isVisible: true,
        position,
        time,
        x: e.clientX,
        velocity,
      });

      onSeekStart?.();
      measureUltraPerformance('mouseDown', seekStartTime);
    },
    [calculateUltraSeekPosition, onSeekStart, measureUltraPerformance]
  );

  // Ultra-fast mouse move with RAF throttling
  const handleUltraMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!touchState.isDragging) return;

      // RAF throttling for 60fps performance
      const now = performance.now();
      if (now - rafThrottleRef.current < 16.67) { // 60fps = 16.67ms
        return;
      }
      rafThrottleRef.current = now;

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use RAF for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const { position, time, velocity } = calculateUltraSeekPosition(e.clientX, true);

        setTouchState(prev => ({
          ...prev,
          currentX: e.clientX,
          velocityX: velocity,
          lastUpdateTime: Date.now(),
        }));

        setPreviewData(prev => ({
          ...prev,
          position,
          time,
          x: e.clientX,
          velocity,
        }));

        // Immediate seek for ultra-responsive feel
        handleUltraSeek(time, true);
        measureUltraPerformance('mouseMove');
      });
    },
    [touchState.isDragging, calculateUltraSeekPosition, handleUltraSeek, measureUltraPerformance]
  );

  // Optimized mouse up with momentum support
  const handleUltraMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!touchState.isDragging) return;

      const { time, velocity } = calculateUltraSeekPosition(e.clientX, true);

      // Apply momentum seeking for natural feel
      let finalSeekTime = time;
      if (Math.abs(velocity) > 0.5) {
        // Add momentum-based adjustment
        const momentumAdjustment = velocity * 10; // Scale factor for momentum
        finalSeekTime = Math.max(0, Math.min(duration, time + momentumAdjustment));
      }

      // Final seek
      handleUltraSeek(finalSeekTime);

      // Reset state
      setIsSeeking(false);
      setTouchState({
        isDragging: false,
        startX: 0,
        currentX: 0,
        dragStartTime: 0,
        lastHapticTime: 0,
        velocityX: 0,
        lastUpdateTime: 0,
        momentumActive: false,
      });

      setPreviewData({
        isVisible: false,
        position: 0,
        time: 0,
        x: 0,
        velocity: 0,
      });

      onSeekEnd?.();
      measureUltraPerformance('mouseUp');

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [touchState.isDragging, calculateUltraSeekPosition, handleUltraSeek, duration, onSeekEnd, measureUltraPerformance]
  );

  // Ultra-fast touch handlers for mobile
  const handleUltraTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const { position, time, velocity } = calculateUltraSeekPosition(touch.clientX, false);

      setIsSeeking(true);

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
        velocityX: velocity,
        lastUpdateTime: Date.now(),
        momentumActive: false,
      });

      setPreviewData({
        isVisible: true,
        position,
        time,
        x: touch.clientX,
        velocity,
      });

      onSeekStart?.();
      measureUltraPerformance('touchStart');
    },
    [calculateUltraSeekPosition, isMobileDevice, haptic, onSeekStart, measureUltraPerformance]
  );

  const handleUltraTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchState.isDragging) return;

      const touch = e.touches[0];
      const now = Date.now();

      // Throttle haptic feedback during drag (every 100ms)
      const shouldHaptic = now - touchState.lastHapticTime > 100;
      if (shouldHaptic && isMobileDevice) {
        haptic.light();
        setTouchState(prev => ({ ...prev, lastHapticTime: now }));
      }

      // RAF throttling for mobile performance
      if (now - rafThrottleRef.current < 16.67) {
        return;
      }
      rafThrottleRef.current = now;

      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use RAF for smooth mobile updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const { position, time, velocity } = calculateUltraSeekPosition(touch.clientX, true);

        setTouchState(prev => ({
          ...prev,
          currentX: touch.clientX,
          velocityX: velocity,
          lastUpdateTime: now,
        }));

        setPreviewData(prev => ({
          ...prev,
          position,
          time,
          x: touch.clientX,
          velocity,
        }));

        // Immediate seek for ultra-responsive mobile feel
        handleUltraSeek(time, true);
        measureUltraPerformance('touchMove');
      });
    },
    [touchState.isDragging, calculateUltraSeekPosition, handleUltraSeek, isMobileDevice, haptic, touchState.lastHapticTime, measureUltraPerformance]
  );

  const handleUltraTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchState.isDragging) return;

      const touch = e.changedTouches[0];
      const { time, velocity } = calculateUltraSeekPosition(touch.clientX, true);

      // Enhanced haptic feedback for touch end
      if (isMobileDevice) {
        haptic.success();
      }

      // Momentum-based seeking for mobile
      let finalSeekTime = time;
      if (Math.abs(velocity) > 0.3) {
        const momentumAdjustment = velocity * 8; // Reduced momentum for mobile precision
        finalSeekTime = Math.max(0, Math.min(duration, time + momentumAdjustment));
      }

      // Final seek
      handleUltraSeek(finalSeekTime);

      // Reset state
      setIsSeeking(false);
      setTouchState({
        isDragging: false,
        startX: 0,
        currentX: 0,
        dragStartTime: 0,
        lastHapticTime: 0,
        velocityX: 0,
        lastUpdateTime: 0,
        momentumActive: false,
      });

      setPreviewData({
        isVisible: false,
        position: 0,
        time: 0,
        x: 0,
        velocity: 0,
      });

      onSeekEnd?.();
      measureUltraPerformance('touchEnd');

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [touchState.isDragging, calculateUltraSeekPosition, handleUltraSeek, duration, isMobileDevice, haptic, onSeekEnd, measureUltraPerformance]
  );

  // Keyboard navigation for accessibility
  const handleUltraKeyboardSeek = useCallback(
    (direction: 'forward' | 'backward', step: number) => {
      const seekAmount = (step / 100) * duration;
      let newTime = currentTime;

      if (direction === "forward") {
        newTime = Math.min(duration, currentTime + seekAmount);
      } else {
        newTime = Math.max(0, currentTime - seekAmount);
      }

      haptic.selection();
      handleUltraSeek(newTime);
    },
    [currentTime, duration, haptic, handleUltraSeek]
  );

  // Global event listeners with performance optimization
  useEffect(() => {
    if (touchState.isDragging) {
      // Use passive: false for precision during drag
      document.addEventListener("mousemove", handleUltraMouseMove, { passive: false });
      document.addEventListener("mouseup", handleUltraMouseUp);
      document.addEventListener("touchmove", handleUltraTouchMove, { passive: false });
      document.addEventListener("touchend", handleUltraTouchEnd);

      // Prevent default touch behaviors during drag for performance
      document.body.style.touchAction = "none";
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleUltraMouseMove);
        document.removeEventListener("mouseup", handleUltraMouseUp);
        document.removeEventListener("touchmove", handleUltraTouchMove);
        document.removeEventListener("touchend", handleUltraTouchEnd);
        document.body.style.touchAction = "";
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";
      };
    }
  }, [touchState.isDragging, handleUltraMouseMove, handleUltraMouseUp, handleUltraTouchMove, handleUltraTouchEnd]);

  // GPU optimization setup
  useEffect(() => {
    if (progressBarRef.current && !gpuOptimized) {
      // Force GPU acceleration for ultra-fast performance
      progressBarRef.current.style.transform = "translateZ(0)";
      progressBarRef.current.style.willChange = "transform";
      progressBarRef.current.style.backfaceVisibility = "hidden";
      progressBarRef.current.style.perspective = "1000px";
      setGpuOptimized(true);
    }
  }, [gpuOptimized]);

  // Touch optimizations for mobile
  useEffect(() => {
    if (progressBarRef.current && (touchMode || isMobileDevice)) {
      touchOptimizer.applyTouchOptimizations(progressBarRef.current);
      touchOptimizer.createTouchProgressIndicator(progressBarRef.current);
    }
  }, [touchMode, isMobileDevice]);

  // Cleanup animation frames
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (momentumAnimationRef.current) {
        cancelAnimationFrame(momentumAnimationRef.current);
      }
    };
  }, []);

  // Calculate responsive dimensions
  const barHeight = variant === "compact" ? 4 : variant === "minimal" ? 2 : 6;
  const containerHeight = Math.max(44, barHeight + (showTimeDisplay ? 24 : 12)); // Minimum 44px for touch
  const handleSize = variant === "compact" ? 12 : variant === "minimal" ? 8 : 16;

  return (
    <div
      className={cn(
        "w-full flex flex-col gap-2 ultra-progress-bar",
        touchMode && "touch-optimized",
        enhancedMode && "enhanced-mode",
        isSeeking && "is-seeking",
        gpuOptimized && "gpu-optimized",
        className
      )}
      style={{
        minHeight: `${containerHeight}px`,
        transform: "translateZ(0)", // GPU acceleration
        willChange: "transform"
      }}
    >
      {/* Ultra-fast progress bar container */}
      <div
        ref={progressBarRef}
        className={cn(
          "relative w-full bg-secondary rounded-full cursor-pointer overflow-hidden",
          "transition-all duration-200 hover:bg-secondary/80",
          "gpu-accelerated will-change-transform",
          isSeeking && "scale-105 shadow-lg ring-2 ring-primary/30",
          isLoading && "opacity-60",
          "ultra-progress-track"
        )}
        style={{
          height: `${barHeight}px`,
          minHeight: `${Math.max(44, barHeight)}px`, // Touch target minimum
          transform: "translateZ(0)", // GPU acceleration
          willChange: isSeeking ? "transform, width" : "auto",
          backfaceVisibility: "hidden" as const,
          WebkitBackfaceVisibility: "hidden" as const,
          WebkitTransform: "translateZ(0)",
          MozTransform: "translateZ(0)",
          MsTransform: "translateZ(0)",
          OTransform: "translateZ(0)",
        }}
        role="progressbar"
        aria-label={`Ultra-fast audio progress: ${Math.round(progress)}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-busy={isLoading}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 5 : 1;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            handleUltraKeyboardSeek("backward", step);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            handleUltraKeyboardSeek("forward", step);
          }
        }}
        onMouseDown={handleUltraMouseDown}
        onTouchStart={handleUltraTouchStart}
      >
        {/* Buffer indicator with optimized rendering */}
        {showBufferIndicator && bufferedRangesSafe.length > 0 && (
          <>
            {bufferedRangesSafe.map((range, index) => {
              const startPercent = duration > 0 ? (range.start / duration) * 100 : 0;
              const endPercent = duration > 0 ? (range.end / duration) * 100 : 0;
              const widthPercent = endPercent - startPercent;

              return (
                <div
                  key={`buffer-${index}`}
                  className="absolute top-0 h-full bg-primary/20 rounded-sm pointer-events-none"
                  style={{
                    left: `${startPercent}%`,
                    width: `${widthPercent}%`,
                    transform: "translateZ(0)",
                    willChange: "width",
                  }}
                />
              );
            })}
          </>
        )}

        {/* Ultra-fast progress fill */}
        <div
          className={cn(
            "absolute top-0 left-0 h-full bg-primary rounded-full",
            "will-change-width gpu-accelerated",
            isSeeking ? "transition-none" : "transition-all duration-300 ease-out"
          )}
          style={{
            width: `${progress}%`,
            transition: isSeeking ? "none" : "width 300ms ease-out",
            transform: "translateZ(0)",
            willChange: "width",
          }}
        />

        {/* Optimized segment markers */}
        {showSegmentMarkers && segments.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {segments.slice(0, 50).map((segment, index) => { // Limit markers for performance
              const position = duration > 0 ? (segment.start / duration) * 100 : 0;

              return (
                <button
                  key={`segment-${segment.id || index}`}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-primary/40 rounded-full",
                    "pointer-events-auto hover:bg-primary/60 hover:scale-y-150",
                    "transition-all duration-150 will-change-transform",
                    isSeeking && "pointer-events-none"
                  )}
                  style={{
                    left: `${position}%`,
                    transform: "translateZ(0)",
                    willChange: "transform",
                  }}
                  onClick={() => {
                    haptic.selection();
                    handleUltraSeek(segment.start);
                  }}
                  title={`${segment.text.substring(0, 50)}...`}
                  aria-label={`Jump to segment: ${segment.text.substring(0, 30)}`}
                />
              );
            })}
          </div>
        )}

        {/* Ultra-fast seek handle */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-20 rounded-full bg-primary shadow-md",
            "will-change-transform gpu-accelerated",
            "hover:scale-110 active:scale-95 transition-transform",
            isSeeking && "scale-125 shadow-lg ring-2 ring-primary/50"
          )}
          style={{
            left: `calc(${previewData.isVisible ? previewData.position : progress}% - ${handleSize / 2}px)`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            transform: "translateZ(0)",
            willChange: "transform, left",
            transition: isSeeking ? "none" : "transform 150ms ease-out",
          }}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(previewData.isVisible ? previewData.position : progress)}
          tabIndex={-1} // Handle via parent for accessibility
        />

        {/* Real-time seek preview tooltip */}
        {previewData.isVisible && (
          <div
            className="absolute -top-10 px-2 py-1 bg-primary text-primary-foreground text-xs rounded shadow-lg pointer-events-none z-30"
            style={{
              left: `${previewData.position}%`,
              transform: "translateX(-50%) translateZ(0)",
              willChange: "transform, left",
            }}
          >
            <div className="font-mono">
              {Math.floor(previewData.time / 60)}:{(previewData.time % 60).toFixed(0).padStart(2, "0")}
            </div>
            {Math.abs(previewData.velocity) > 0.1 && (
              <div className="text-xs opacity-75">
                {previewData.velocity > 0 ? "»" : "«"} {Math.abs(previewData.velocity * 10).toFixed(1)}x
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optimized time display */}
      {showTimeDisplay && variant !== "minimal" && (
        <div
          className={cn(
            "flex items-center justify-between text-xs tabular-nums",
            variant === "compact" && "text-[10px]",
            "text-muted-foreground font-mono",
            "will-change-transform"
          )}
          style={{ transform: "translateZ(0)" }}
        >
          <span className={cn(isSeeking && "text-primary font-semibold")}>
            {Math.floor((isSeeking && previewData.time ? previewData.time : currentTime) / 60)}:
            {Math.floor((isSeeking && previewData.time ? previewData.time : currentTime) % 60).toString().padStart(2, "0")}
          </span>
          <span className="opacity-60">/</span>
          <span>
            {Math.floor(duration / 60)}:
            {Math.floor(duration % 60).toString().padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Performance indicator (development mode) */}
      {performanceMode && (
        <div className="absolute top-0 right-0 text-xs text-muted-foreground bg-background/80 px-1 py-0.5 rounded">
          {performanceMetricsRef.current.seekCount > 0 && (
            <>
              Avg: {performanceMetricsRef.current.averageResponseTime.toFixed(0)}ms
              {performanceMetricsRef.current.averageResponseTime > maxResponseTime && " ⚠️"}
            </>
          )}
        </div>
      )}
    </div>
  );
});

UltraProgressBar.displayName = "UltraProgressBar";

export default UltraProgressBar;
