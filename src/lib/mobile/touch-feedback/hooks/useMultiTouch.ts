/**
 * Multi-Touch React Hook
 * Provides easy integration of multi-touch gestures with React components
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { MultiTouchManager, GestureHandler, GestureData } from '../MultiTouchManager';
import { useHapticFeedback } from '../../haptic-feedback';

export interface UseMultiTouchConfig {
  enablePinch?: boolean;
  enableRotate?: boolean;
  enablePan?: boolean;
  enableSwipe?: boolean;
  enableLongPress?: boolean;
  enableStylus?: boolean;
  sensitivity?: number;
  threshold?: number;
  hapticFeedback?: boolean;
}

export interface MultiTouchCallbacks {
  onPinch?: (scale: number, center: { x: number; y: number }) => void;
  onRotate?: (rotation: number, center: { x: number; y: number }) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void;
  onLongPress?: () => void;
  onStylus?: (touch: any) => void;
  onPressure?: (pressure: number) => void;
}

/**
 * Hook for multi-touch gesture detection
 */
export const useMultiTouch = (
  callbacks: MultiTouchCallbacks = {},
  config: UseMultiTouchConfig = {}
) => {
  const elementRef = useRef<HTMLElement>(null);
  const managerRef = useRef<MultiTouchManager | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [touchCount, setTouchCount] = useState(0);
  const [currentScale, setCurrentScale] = useState(1);
  const [currentRotation, setCurrentRotation] = useState(0);
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Initialize multi-touch manager
  useEffect(() => {
    managerRef.current = MultiTouchManager.getInstance();
  }, []);

  // Create gesture handler
  const gestureHandler = useMemo<GestureHandler>(() => ({
    onPinch: callbacks.onPinch ? (scale, center) => {
      setCurrentScale(scale);
      callbacks.onPinch!(scale, center);

      if (config.hapticFeedback && Math.abs(scale - 1) > 0.1) {
        triggerHaptic('selection');
      }
    } : undefined,

    onRotate: callbacks.onRotate ? (rotation, center) => {
      setCurrentRotation(rotation);
      callbacks.onRotate!(rotation, center);

      if (config.hapticFeedback && Math.abs(rotation) > 15) {
        triggerHaptic('light');
      }
    } : undefined,

    onPan: callbacks.onPan ? (deltaX, deltaY, touches) => {
      callbacks.onPan!(deltaX, deltaY);
    } : undefined,

    onSwipe: callbacks.onSwipe ? (direction, velocity, touches) => {
      callbacks.onSwipe!(direction, velocity);

      if (config.hapticFeedback) {
        triggerHaptic('medium');
      }
    } : undefined,

    onLongPress: callbacks.onLongPress ? (touches) => {
      callbacks.onLongPress!();

      if (config.hapticFeedback) {
        triggerHaptic('heavy');
      }
    } : undefined,

    onStylus: callbacks.onStylus ? (touch) => {
      callbacks.onStylus!(touch);

      if (config.hapticFeedback && touch.force > 0.5) {
        triggerHaptic('light');
      }
    } : undefined,

    onPressure: callbacks.onPressure ? (pressure, touch) => {
      callbacks.onPressure!(pressure);

      if (config.hapticFeedback && pressure > 0.8) {
        triggerHaptic('medium');
      }
    } : undefined,

    onGestureStart: (gesture) => {
      setIsActive(true);
      setTouchCount(gesture.touches.length);
    },

    onGestureEnd: (gesture) => {
      setIsActive(false);
      setTouchCount(0);
      setCurrentScale(1);
      setCurrentRotation(0);
    },
  }), [callbacks, config.hapticFeedback, triggerHaptic]);

  // Register gesture handlers when element changes
  useEffect(() => {
    if (elementRef.current && managerRef.current) {
      managerRef.current.registerGestureHandlers(elementRef.current, gestureHandler);

      // Update configuration
      if (config.sensitivity || config.threshold) {
        managerRef.current.updateConfig({
          pressureThreshold: config.sensitivity || 0.1,
          gestureThreshold: config.threshold || 15,
        });
      }

      // Cleanup function
      return () => {
        if (elementRef.current && managerRef.current) {
          managerRef.current.unregisterGestureHandlers(elementRef.current);
        }
      };
    }
  }, [elementRef.current, gestureHandler, config]);

  // Element ref callback
  const ref = useCallback((element: HTMLElement | null) => {
    elementRef.current = element || undefined;
  }, []);

  return {
    ref,
    isActive,
    touchCount,
    currentScale,
    currentRotation,
  };
};

/**
 * Hook for simple pinch-to-zoom functionality
 */
export const usePinchToZoom = (
  onZoom?: (scale: number) => void,
  config: { minScale?: number; maxScale?: number; sensitivity?: number } = {}
) => {
  const [scale, setScale] = useState(1);
  const { ref } = useMultiTouch({
    onPinch: (newScale, center) => {
      const clampedScale = Math.max(
        config.minScale || 0.5,
        Math.min(config.maxScale || 3, newScale)
      );
      setScale(clampedScale);
      onZoom?.(clampedScale);
    },
    hapticFeedback: true,
  });

  return {
    ref,
    scale,
    reset: () => setScale(1),
  };
};

/**
 * Hook for rotation gestures
 */
export const useRotationGesture = (
  onRotate?: (rotation: number) => void,
  config: { sensitivity?: number } = {}
) => {
  const [rotation, setRotation] = useState(0);
  const { ref } = useMultiTouch({
    onRotate: (newRotation, center) => {
      const adjustedRotation = newRotation * (config.sensitivity || 1);
      setRotation(adjustedRotation);
      onRotate?.(adjustedRotation);
    },
    hapticFeedback: true,
  });

  return {
    ref,
    rotation,
    reset: () => setRotation(0),
  };
};

/**
 * Hook for swipe detection
 */
export const useSwipeGesture = (
  callbacks: {
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
  },
  config: { threshold?: number; hapticFeedback?: boolean } = {}
) => {
  const { ref } = useMultiTouch({
    onSwipe: (direction, velocity) => {
      switch (direction) {
        case 'up':
          callbacks.onSwipeUp?.();
          break;
        case 'down':
          callbacks.onSwipeDown?.();
          break;
        case 'left':
          callbacks.onSwipeLeft?.();
          break;
        case 'right':
          callbacks.onSwipeRight?.();
          break;
      }
    },
    hapticFeedback: config.hapticFeedback !== false,
    threshold: config.threshold || 50,
  });

  return { ref };
};

/**
 * Hook for long press detection
 */
export const useLongPress = (
  onLongPress: () => void,
  config: { duration?: number; hapticFeedback?: boolean } = {}
) => {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleTouchStart = useCallback(() => {
    setIsPressed(true);

    timeoutRef.current = setTimeout(() => {
      onLongPress();

      if (config.hapticFeedback !== false) {
        // Trigger haptic feedback using the global manager
        if (window.hapticFeedback) {
          window.hapticFeedback.trigger('heavy');
        }
      }
    }, config.duration || 500);
  }, [onLongPress, config.duration, config.hapticFeedback]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const ref = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });
      element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchend', handleTouchEnd);
        element.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [handleTouchStart, handleTouchEnd]);

  return {
    ref,
    isPressed,
  };
};

/**
 * Hook for pressure-sensitive interactions
 */
export const usePressure = (
  onPressure: (pressure: number) => void,
  config: { threshold?: number; hapticFeedback?: boolean } = {}
) => {
  const [pressure, setPressure] = useState(0);
  const { ref } = useMultiTouch({
    onPressure: (newPressure, touch) => {
      setPressure(newPressure);

      if (newPressure > (config.threshold || 0.1)) {
        onPressure(newPressure);

        if (config.hapticFeedback && newPressure > 0.7) {
          if (window.hapticFeedback) {
            window.hapticFeedback.trigger('medium');
          }
        }
      }
    },
    hapticFeedback: false, // We handle haptics based on pressure threshold
  });

  return {
    ref,
    pressure,
  };
};

export default {
  useMultiTouch,
  usePinchToZoom,
  useRotationGesture,
  useSwipeGesture,
  useLongPress,
  usePressure,
};
