"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface TouchGesture {
  type: "tap" | "double-tap" | "long-press" | "swipe" | "pinch";
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  scale?: number;
  duration?: number;
}

export interface MobileOptimizationOptions {
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Double tap delay in milliseconds */
  doubleTapDelay?: number;
  /** Long press delay in milliseconds */
  longPressDelay?: number;
  /** Swipe threshold in pixels */
  swipeThreshold?: number;
  /** Pinch scale threshold */
  pinchThreshold?: number;
  /** Debounce touch events */
  debounceTouch?: boolean;
  /** Touch debounce delay in milliseconds */
  touchDebounceDelay?: number;
}

export interface UseMobileOptimizationReturn {
  /** Touch event handlers */
  touchHandlers: {
    onTouchStart: (event: React.TouchEvent) => void;
    onTouchMove: (event: React.TouchEvent) => void;
    onTouchEnd: (event: React.TouchEvent) => void;
  };
  /** Trigger haptic feedback */
  triggerHaptic: (type: "light" | "medium" | "heavy") => void;
  /** Current touch state */
  touchState: {
    isTouching: boolean;
    gesture: TouchGesture | null;
    touchCount: number;
  };
  /** Check if device is mobile */
  isMobileDevice: boolean;
}

/**
 * Mobile optimization hook for segment navigation
 * Handles touch gestures, haptic feedback, and mobile-specific interactions
 */
export function useMobileOptimization(
  onGesture?: (gesture: TouchGesture) => void,
  options: MobileOptimizationOptions = {}
): UseMobileOptimizationReturn {
  const {
    enableHaptics = true,
    doubleTapDelay = 300,
    longPressDelay = 500,
    swipeThreshold = 50,
    pinchThreshold = 0.1,
    debounceTouch = true,
    touchDebounceDelay = 16, // ~60fps
  } = options;

  // Touch state tracking
  const [touchState, setTouchState] = useState({
    isTouching: false,
    gesture: null as TouchGesture | null,
    touchCount: 0,
  });

  // Refs for gesture tracking
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    touchCount: number;
  } | null>(null);

  const lastTapRef = useRef<{
    time: number;
    x: number;
    y: number;
  } | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);

  // Check if device is mobile
  const isMobileDevice = useRef<boolean>(() => {
    if (typeof window === "undefined") return false;

    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || "ontouchstart" in window;
  }).current;

  // Trigger haptic feedback
  const triggerHaptic = useCallback((type: "light" | "medium" | "heavy" = "light") => {
    if (!enableHaptics || typeof window === "undefined" || !("vibrate" in navigator)) {
      return;
    }

    try {
      switch (type) {
        case "light":
          navigator.vibrate(10);
          break;
        case "medium":
          navigator.vibrate(25);
          break;
        case "heavy":
          navigator.vibrate([50, 30, 50]);
          break;
      }
    } catch (error) {
      // Silently ignore haptic errors
    }
  }, [enableHaptics]);

  // Calculate distance between two points
  const getDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 0) return;

    const touch = event.touches[0];
    const currentTime = Date.now();
    const touchCount = event.touches.length;

    // Update touch state
    setTouchState({
      isTouching: true,
      gesture: null,
      touchCount,
    });

    // Store touch start data
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: currentTime,
      touchCount,
    };

    // Handle pinch gesture start
    if (touchCount === 2) {
      const touch2 = event.touches[1];
      initialPinchDistanceRef.current = getDistance(
        touch.clientX,
        touch.clientY,
        touch2.clientX,
        touch2.clientY
      );
    }

    // Clear any existing long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // Start long press timer for single touch
    if (touchCount === 1) {
      longPressTimerRef.current = setTimeout(() => {
        const gesture: TouchGesture = {
          type: "long-press",
          duration: longPressDelay,
        };

        setTouchState(prev => ({ ...prev, gesture }));
        onGesture?.(gesture);
        triggerHaptic("medium");
      }, longPressDelay);
    }
  }, [getDistance, longPressDelay, onGesture, triggerHaptic]);

  // Handle touch move
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 0 || !touchStartRef.current) return;

    const touch = event.touches[0];
    const touchCount = event.touches.length;

    // Cancel long press on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle pinch gesture
    if (touchCount === 2 && initialPinchDistanceRef.current) {
      const touch2 = event.touches[1];
      const currentDistance = getDistance(
        touch.clientX,
        touch.clientY,
        touch2.clientX,
        touch2.clientY
      );

      const scale = currentDistance / initialPinchDistanceRef.current;

      if (Math.abs(scale - 1) > pinchThreshold) {
        const gesture: TouchGesture = {
          type: "pinch",
          scale,
        };

        setTouchState(prev => ({ ...prev, gesture }));
        onGesture?.(gesture);
        triggerHaptic("light");
      }
    }
  }, [getDistance, pinchThreshold, onGesture, triggerHaptic]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = event.changedTouches[0];
    const currentTime = Date.now();
    const touchDuration = currentTime - touchStartRef.current.time;
    const touchDistance = getDistance(
      touchStartRef.current.x,
      touchStartRef.current.y,
      touch.clientX,
      touch.clientY
    );

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Check for swipe
    if (touchDistance > swipeThreshold && touchDuration < 500) {
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      let direction: "up" | "down" | "left" | "right" | undefined;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? "right" : "left";
      } else {
        direction = deltaY > 0 ? "down" : "up";
      }

      const gesture: TouchGesture = {
        type: "swipe",
        direction,
        distance: touchDistance,
        duration: touchDuration,
      };

      setTouchState({ isTouching: false, gesture, touchCount: 0 });
      onGesture?.(gesture);
      triggerHaptic("light");
      return;
    }

    // Check for tap/double tap
    if (touchDistance < 10 && touchDuration < 200) {
      // Check for double tap
      if (lastTapRef.current) {
        const timeSinceLastTap = currentTime - lastTapRef.current.time;
        const distanceFromLastTap = getDistance(
          lastTapRef.current.x,
          lastTapRef.current.y,
          touch.clientX,
          touch.clientY
        );

        if (timeSinceLastTap < doubleTapDelay && distanceFromLastTap < 10) {
          const gesture: TouchGesture = {
            type: "double-tap",
          };

          setTouchState({ isTouching: false, gesture, touchCount: 0 });
          onGesture?.(gesture);
          triggerHaptic("medium");
          lastTapRef.current = null;
          return;
        }
      }

      // Single tap
      lastTapRef.current = {
        time: currentTime,
        x: touch.clientX,
        y: touch.clientY,
      };

      const gesture: TouchGesture = {
        type: "tap",
      };

      setTouchState({ isTouching: false, gesture, touchCount: 0 });
      onGesture?.(gesture);
      triggerHaptic("light");

      // Clear last tap after double tap delay
      setTimeout(() => {
        lastTapRef.current = null;
      }, doubleTapDelay);
      return;
    }

    // Reset state
    setTouchState({ isTouching: false, gesture: null, touchCount: 0 });
    touchStartRef.current = null;
    initialPinchDistanceRef.current = null;
  }, [getDistance, swipeThreshold, doubleTapDelay, onGesture, triggerHaptic]);

  // Debounced touch handlers
  const debouncedHandleTouchStart = useCallback((event: React.TouchEvent) => {
    if (debounceTouch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        handleTouchStart(event);
      }, touchDebounceDelay);
    } else {
      handleTouchStart(event);
    }
  }, [debounceTouch, touchDebounceDelay, handleTouchStart]);

  const debouncedHandleTouchMove = useCallback((event: React.TouchEvent) => {
    if (debounceTouch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        handleTouchMove(event);
      }, touchDebounceDelay);
    } else {
      handleTouchMove(event);
    }
  }, [debounceTouch, touchDebounceDelay, handleTouchMove]);

  const debouncedHandleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (debounceTouch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        handleTouchEnd(event);
      }, touchDebounceDelay);
    } else {
      handleTouchEnd(event);
    }
  }, [debounceTouch, touchDebounceDelay, handleTouchEnd]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    touchHandlers: {
      onTouchStart: debouncedHandleTouchStart,
      onTouchMove: debouncedHandleTouchMove,
      onTouchEnd: debouncedHandleTouchEnd,
    },
    triggerHaptic,
    touchState,
    isMobileDevice,
  };
}

/**
 * Mobile-optimized segment wrapper component
 * Provides touch gesture support and mobile-specific optimizations
 */
export interface MobileSegmentWrapperProps {
  /** Segment content */
  children: React.ReactNode;
  /** Gesture callback */
  onGesture?: (gesture: TouchGesture) => void;
  /** Mobile optimization options */
  options?: MobileOptimizationOptions;
  /** Additional CSS classes */
  className?: string;
  /** Whether to enable touch optimizations */
  enableTouchOptimizations?: boolean;
}

export const MobileSegmentWrapper = React.memo<MobileSegmentWrapperProps>(({
  children,
  onGesture,
  options,
  className = "",
  enableTouchOptimizations = true,
}) => {
  const { touchHandlers, isMobileDevice } = useMobileOptimization(onGesture, options);

  if (!enableTouchOptimizations || !isMobileDevice) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={className}
      {...touchHandlers}
      style={{
        touchAction: "manipulation", // Optimize for touch performance
        WebkitTapHighlightColor: "transparent", // Remove tap highlight
      }}
    >
      {children}
    </div>
  );
});

MobileSegmentWrapper.displayName = "MobileSegmentWrapper";
