/**
 * Advanced gesture recognition system for touch-optimized player controls
 * Supports swipe, tap, double-tap, long press, and pinch gestures with configurable thresholds
 */

import React from "react";
import { TouchGestureData, DEFAULT_MOBILE_CONFIG } from "@/types/mobile";
import { hapticFeedback, useHapticFeedback } from "./haptic-feedback";

export type GestureType =
  | "tap"
  | "double_tap"
  | "swipe"
  | "long_press"
  | "pinch"
  | "drag"
  | "two_finger_tap";
export type SwipeDirection = "up" | "down" | "left" | "right";

export interface GestureConfig {
  tap: {
    maxDuration: number; // Maximum duration for tap (ms)
    maxMovement: number; // Maximum movement during tap (px)
  };
  doubleTap: {
    maxDuration: number; // Maximum duration between taps (ms)
    maxMovement: number; // Maximum movement during double tap (px)
  };
  swipe: {
    minDistance: number; // Minimum swipe distance (px)
    maxDuration: number; // Maximum swipe duration (ms)
    minVelocity: number; // Minimum swipe velocity (px/ms)
  };
  longPress: {
    minDuration: number; // Minimum duration for long press (ms)
    maxMovement: number; // Maximum movement during long press (px)
  };
  pinch: {
    minScale: number; // Minimum scale change to register pinch
    maxDuration: number; // Maximum pinch duration (ms)
  };
  drag: {
    minDistance: number; // Minimum distance to start drag (px)
    lockAxis: boolean; // Lock to primary axis after threshold
  };
  twoFingerTap: {
    maxDuration: number; // Maximum duration for two finger tap (ms)
    maxMovement: number; // Maximum movement during two finger tap (px)
  };
}

export interface GestureEvent {
  type: GestureType;
  data: TouchGestureData;
  timestamp: number;
  target: Element;
  direction?: SwipeDirection;
  scale?: number; // For pinch gestures
  distance?: number;
  velocity?: number;
}

export interface GestureHandlers {
  onTap?: (event: GestureEvent) => void;
  onDoubleTap?: (event: GestureEvent) => void;
  onSwipe?: (event: GestureEvent) => void;
  onLongPress?: (event: GestureEvent) => void;
  onPinch?: (event: GestureEvent) => void;
  onDrag?: (event: GestureEvent) => void;
  onTwoFingerTap?: (event: GestureEvent) => void;
  onGestureStart?: (gesture: GestureType) => void;
  onGestureEnd?: (gesture: GestureType, cancelled: boolean) => void;
}

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
  identifier: number;
}

export class GestureRecognizer {
  private config: GestureConfig;
  private handlers: GestureHandlers;
  private isActive = false;
  private touchPoints: TouchPoint[] = [];
  private lastTapTime = 0;
  private gestureStartTime = 0;
  private gestureStartPos = { x: 0, y: 0 };
  private longPressTimer: NodeJS.Timeout | null = null;
  private dragStarted = false;
  private initialPinchDistance = 0;
  private currentPinchDistance = 0;
  private gestureType: GestureType | null = null;
  private gestureCancelled = false;
  private haptic = useHapticFeedback();

  constructor(
    config: Partial<GestureConfig> = {},
    handlers: GestureHandlers = {},
  ) {
    this.config = this.mergeConfig(config);
    this.handlers = handlers;
  }

  private mergeConfig(userConfig: Partial<GestureConfig>): GestureConfig {
    return {
      tap: {
        maxDuration: DEFAULT_MOBILE_CONFIG.gestureThresholds.doubleTapMaxTime,
        maxMovement: 10,
        ...userConfig.tap,
      },
      doubleTap: {
        maxDuration: DEFAULT_MOBILE_CONFIG.gestureThresholds.doubleTapMaxTime,
        maxMovement: 10,
        ...userConfig.doubleTap,
      },
      swipe: {
        minDistance: DEFAULT_MOBILE_CONFIG.gestureThresholds.minSwipeDistance,
        maxDuration: DEFAULT_MOBILE_CONFIG.gestureThresholds.maxSwipeTime,
        minVelocity: 0.1,
        ...userConfig.swipe,
      },
      longPress: {
        minDuration:
          DEFAULT_MOBILE_CONFIG.gestureThresholds.minLongPressDuration,
        maxMovement: 15,
        ...userConfig.longPress,
      },
      pinch: {
        minScale: 1.1,
        maxDuration: 500,
        ...userConfig.pinch,
      },
      drag: {
        minDistance: 5,
        lockAxis: true,
        ...userConfig.drag,
      },
      twoFingerTap: {
        maxDuration: 200,
        maxMovement: 10,
        ...userConfig.twoFingerTap,
      },
    };
  }

  /**
   * Handle touch start event
   */
  handleTouchStart(event: TouchEvent): void {
    const touches = Array.from(event.touches);

    // Clear any existing timers
    this.clearTimers();
    this.gestureCancelled = false;
    this.isActive = true;
    this.gestureStartTime = performance.now();

    // Store touch points
    this.touchPoints = touches.map((touch) => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: this.gestureStartTime,
      identifier: touch.identifier,
    }));

    if (touches.length === 1) {
      this.gestureStartPos = { x: touches[0].clientX, y: touches[0].clientY };

      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        if (!this.gestureCancelled && this.isActive) {
          this.triggerGesture("long_press");
        }
      }, this.config.longPress.minDuration);

      this.haptic.trigger("light");
    } else if (touches.length === 2) {
      this.initialPinchDistance = this.calculateDistance(
        touches[0],
        touches[1],
      );
      this.haptic.trigger("medium");
    }

    this.handlers.onGestureStart?.(this.detectGestureType(event));
  }

  /**
   * Handle touch move event
   */
  handleTouchMove(event: TouchEvent): void {
    if (!this.isActive || this.gestureCancelled) return;

    const touches = Array.from(event.touches);
    event.preventDefault(); // Prevent scrolling during gesture

    // Update touch points
    this.touchPoints = touches.map((touch) => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: performance.now(),
      identifier: touch.identifier,
    }));

    if (touches.length === 1) {
      const currentPos = { x: touches[0].clientX, y: touches[0].clientY };
      const movement = this.calculateDistance(this.gestureStartPos, currentPos);

      // Check if movement exceeds tap threshold
      if (movement > this.config.tap.maxMovement) {
        this.clearLongPressTimer();

        // Determine if this is a drag or swipe
        if (movement > this.config.drag.minDistance) {
          if (!this.dragStarted) {
            this.dragStarted = true;
            this.gestureType = "drag";
          }

          const gestureEvent = this.createGestureEvent("drag", touches[0]);
          this.handlers.onDrag?.(gestureEvent);
        }
      }
    } else if (touches.length === 2) {
      this.currentPinchDistance = this.calculateDistance(
        touches[0],
        touches[1],
      );

      if (this.initialPinchDistance > 0) {
        const scale = this.currentPinchDistance / this.initialPinchDistance;

        if (Math.abs(scale - 1) >= this.config.pinch.minScale - 1) {
          const gestureEvent = this.createGestureEvent("pinch", touches[0]);
          gestureEvent.scale = scale;
          this.handlers.onPinch?.(gestureEvent);
        }
      }
    }
  }

  /**
   * Handle touch end event
   */
  handleTouchEnd(event: TouchEvent): void {
    if (!this.isActive || this.gestureCancelled) return;

    const touches = Array.from(event.changedTouches);
    const currentTime = performance.now();
    const duration = currentTime - this.gestureStartTime;

    // Clear any pending timers
    this.clearTimers();

    if (touches.length === 1 && this.touchPoints.length === 1) {
      const touch = touches[0];
      const movement = this.calculateDistance(this.gestureStartPos, {
        x: touch.clientX,
        y: touch.clientY,
      });

      // Determine gesture type based on movement and duration
      if (
        movement <= this.config.tap.maxMovement &&
        duration <= this.config.tap.maxDuration
      ) {
        // Check for double tap
        const timeSinceLastTap = currentTime - this.lastTapTime;

        if (timeSinceLastTap <= this.config.doubleTap.maxDuration) {
          this.triggerGesture("double_tap");
          this.lastTapTime = 0; // Reset to prevent triple tap
        } else {
          // Schedule single tap if no double tap occurs
          setTimeout(() => {
            if (
              currentTime - this.lastTapTime >=
              this.config.doubleTap.maxDuration
            ) {
              this.triggerGesture("tap");
            }
          }, this.config.doubleTap.maxDuration);

          this.lastTapTime = currentTime;
        }
      } else if (
        movement >= this.config.swipe.minDistance &&
        duration <= this.config.swipe.maxDuration
      ) {
        this.triggerGesture("swipe");
      }
    } else if (this.touchPoints.length === 2 && event.touches.length === 0) {
      // Two finger tap
      if (duration <= this.config.twoFingerTap.maxDuration) {
        this.triggerGesture("two_finger_tap");
      }
    }

    this.cleanup();
  }

  /**
   * Detect likely gesture type based on current touch state
   */
  private detectGestureType(event: TouchEvent): GestureType {
    const touches = event.touches.length;

    switch (touches) {
      case 1:
        return "tap"; // Will be refined as gesture progresses
      case 2:
        return "pinch";
      default:
        return "tap";
    }
  }

  /**
   * Trigger a specific gesture
   */
  private triggerGesture(type: GestureType): void {
    if (this.gestureCancelled) return;

    const touchPoint = this.touchPoints[0];
    if (!touchPoint) return;

    const gestureEvent = this.createGestureEvent(type, touchPoint);

    // Trigger appropriate handler
    switch (type) {
      case "tap":
        this.haptic.gestureFeedback("tap");
        this.handlers.onTap?.(gestureEvent);
        break;
      case "double_tap":
        this.haptic.gestureFeedback("doubleTap");
        this.handlers.onDoubleTap?.(gestureEvent);
        break;
      case "swipe":
        this.haptic.gestureFeedback("swipe");
        this.handlers.onSwipe?.(gestureEvent);
        break;
      case "long_press":
        this.haptic.gestureFeedback("longPress");
        this.handlers.onLongPress?.(gestureEvent);
        break;
      case "pinch":
        this.haptic.gestureFeedback("pinch");
        this.handlers.onPinch?.(gestureEvent);
        break;
      case "drag":
        this.haptic.gestureFeedback("tap");
        this.handlers.onDrag?.(gestureEvent);
        break;
      case "two_finger_tap":
        this.haptic.trigger("medium");
        this.handlers.onTwoFingerTap?.(gestureEvent);
        break;
    }

    this.handlers.onGestureEnd?.(type, false);
    this.cleanup();
  }

  /**
   * Create gesture event object
   */
  private createGestureEvent(
    type: GestureType,
    touch: TouchPoint | Touch,
  ): GestureEvent {
    const currentTime = performance.now();
    const duration = currentTime - this.gestureStartTime;

    const deltaX = touch.clientX - this.gestureStartPos.x;
    const deltaY = touch.clientY - this.gestureStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let direction: SwipeDirection = "up";
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? "right" : "left";
    } else {
      direction = deltaY > 0 ? "down" : "up";
    }

    return {
      type,
      data: {
        startX: this.gestureStartPos.x,
        startY: this.gestureStartPos.y,
        endX: touch.clientX,
        endY: touch.clientY,
        duration,
        velocity: duration > 0 ? distance / duration : 0,
        direction,
        distance,
      },
      timestamp: currentTime,
      target:
        document.elementFromPoint(touch.clientX, touch.clientY) ||
        document.body,
      direction,
      distance,
      velocity: duration > 0 ? distance / duration : 0,
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    point1: { x: number; y: number } | Touch,
    point2: { x: number; y: number } | Touch,
  ): number {
    const deltaX = point2.clientX - point1.clientX;
    const deltaY = point2.clientY - point1.clientY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  /**
   * Clear active timers
   */
  private clearTimers(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Cleanup gesture state
   */
  private cleanup(): void {
    this.isActive = false;
    this.dragStarted = false;
    this.gestureType = null;
    this.touchPoints = [];
    this.initialPinchDistance = 0;
    this.currentPinchDistance = 0;
    this.clearTimers();
  }

  /**
   * Cancel current gesture
   */
  cancel(): void {
    this.gestureCancelled = true;
    this.clearTimers();

    if (this.gestureType) {
      this.handlers.onGestureEnd?.(this.gestureType, true);
    }

    this.cleanup();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GestureConfig>): void {
    this.config = this.mergeConfig({ ...this.config, ...config });
  }

  /**
   * Update handlers
   */
  updateHandlers(handlers: GestureHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Get current configuration
   */
  getConfig(): GestureConfig {
    return { ...this.config };
  }

  /**
   * Check if gesture is currently active
   */
  isGestureActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current gesture type
   */
  getCurrentGesture(): GestureType | null {
    return this.gestureType;
  }
}

/**
 * Hook for using gesture recognition in React components
 */
export const useGestureRecognizer = (
  config: Partial<GestureConfig> = {},
  handlers: GestureHandlers = {},
) => {
  const recognizerRef = React.useRef<GestureRecognizer | null>(null);
  const elementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const recognizer = new GestureRecognizer(config, handlers);
    recognizerRef.current = recognizer;

    return () => {
      recognizer.cancel();
    };
  }, []);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element || !recognizerRef.current) return;

    const handleTouchStart = (e: TouchEvent) =>
      recognizerRef.current!.handleTouchStart(e);
    const handleTouchMove = (e: TouchEvent) =>
      recognizerRef.current!.handleTouchMove(e);
    const handleTouchEnd = (e: TouchEvent) =>
      recognizerRef.current!.handleTouchEnd(e);

    element.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [elementRef.current]);

  const bind = React.useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  const cancel = React.useCallback(() => {
    recognizerRef.current?.cancel();
  }, []);

  return {
    bind,
    cancel,
    recognizer: recognizerRef.current,
  };
};

/**
 * Utility function to create gesture configuration for player controls
 */
export const createPlayerGestureConfig = (): Partial<GestureConfig> => ({
  swipe: {
    minDistance: 20,
    maxDuration: 300,
    minVelocity: 0.15,
  },
  longPress: {
    minDuration: 600,
    maxMovement: 20,
  },
  pinch: {
    minScale: 1.05,
    maxDuration: 400,
  },
  tap: {
    maxDuration: 150,
    maxMovement: 8,
  },
});

export default GestureRecognizer;
