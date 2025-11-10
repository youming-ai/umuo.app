/**
 * Gesture Enhancement - Touch gesture utilities for mobile file management
 * Provides swipe, long press, and pinch gesture support
 */

export interface SwipeConfig {
  threshold: number;
  restraint: number;
  allowedTime: number;
}

export interface PinchConfig {
  threshold: number;
  maxScale: number;
  minScale: number;
}

export interface LongPressConfig {
  delay: number;
  tolerance: number;
}

export class GestureEnhancer {
  private swipeConfig: SwipeConfig;
  private pinchConfig: PinchConfig;
  private longPressConfig: LongPressConfig;

  constructor(
    swipeConfig: Partial<SwipeConfig> = {},
    pinchConfig: Partial<PinchConfig> = {},
    longPressConfig: Partial<LongPressConfig> = {},
  ) {
    this.swipeConfig = {
      threshold: 50,
      restraint: 100,
      allowedTime: 300,
      ...swipeConfig,
    };

    this.pinchConfig = {
      threshold: 10,
      maxScale: 3,
      minScale: 0.5,
      ...pinchConfig,
    };

    this.longPressConfig = {
      delay: 500,
      tolerance: 10,
      ...longPressConfig,
    };
  }

  /**
   * Add swipe gesture support to an element
   */
  addSwipeSupport(
    element: HTMLElement,
    onSwipeLeft?: (e: TouchEvent) => void,
    onSwipeRight?: (e: TouchEvent) => void,
  ) {
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartTime = Date.now();
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches.length) return;

      const touch = e.changedTouches[0];
      const touchEndTime = Date.now();
      const touchEndX = touch.clientX;
      const touchEndY = touch.clientY;

      const elapsedTime = touchEndTime - touchStartTime;
      const distX = touchEndX - touchStartX;
      const distY = touchEndY - touchStartY;

      // Check if it's a swipe
      if (
        elapsedTime <= this.swipeConfig.allowedTime &&
        Math.abs(distX) >= this.swipeConfig.threshold &&
        Math.abs(distY) <= this.swipeConfig.restraint
      ) {
        if (distX < 0 && onSwipeLeft) {
          onSwipeLeft(e);
        } else if (distX > 0 && onSwipeRight) {
          onSwipeRight(e);
        }
      }
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    // Return cleanup function
    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }

  /**
   * Add long press gesture support to an element
   */
  addLongPressSupport(
    element: HTMLElement,
    onLongPress: (e: TouchEvent) => void,
    onTouchStart?: (e: TouchEvent) => void,
    onTouchEnd?: (e: TouchEvent) => void,
  ) {
    let longPressTimer: NodeJS.Timeout | null = null;
    let isLongPress = false;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      isLongPress = false;

      longPressTimer = setTimeout(() => {
        isLongPress = true;
        onLongPress(e);
      }, this.longPressConfig.delay);

      onTouchStart?.(e);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartX);
      const deltaY = Math.abs(touch.clientY - touchStartY);

      // Cancel long press if moved too much
      if (
        deltaX > this.longPressConfig.tolerance ||
        deltaY > this.longPressConfig.tolerance
      ) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      // Only handle touch end if it wasn't a long press
      if (!isLongPress) {
        onTouchEnd?.(e);
      }
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    // Return cleanup function
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }

  /**
   * Add pinch-to-zoom support to an element
   */
  addPinchSupport(
    element: HTMLElement,
    onPinch: (scale: number, centerX: number, centerY: number) => void,
  ) {
    let initialDistance = 0;
    let initialScale = 1;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;

      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (touches: TouchList) => {
      if (touches.length < 2) return { x: 0, y: 0 };

      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches);
        initialScale = 1;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault();

        const currentDistance = getDistance(e.touches);
        const center = getCenter(e.touches);
        const scale = Math.max(
          this.pinchConfig.minScale,
          Math.min(
            this.pinchConfig.maxScale,
            initialScale * (currentDistance / initialDistance),
          ),
        );

        onPinch(scale, center.x, center.y);
      }
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });

    // Return cleanup function
    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
    };
  }

  /**
   * Add haptic feedback (vibration) for touch interactions
   */
  triggerHapticFeedback(
    type:
      | "light"
      | "medium"
      | "heavy"
      | "success"
      | "warning"
      | "error" = "light",
  ) {
    if (!("vibrate" in navigator)) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50],
      success: [10, 30, 10],
      warning: [30, 20, 30],
      error: [50, 30, 50, 30],
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (error) {
      console.warn("Haptic feedback not supported:", error);
    }
  }

  /**
   * Check if device supports touch
   */
  static isTouchDevice(): boolean {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - for older browsers
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Check if device supports haptic feedback
   */
  static supportsHapticFeedback(): boolean {
    return "vibrate" in navigator;
  }

  /**
   * Get device pixel ratio for high DPI displays
   */
  static getPixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  /**
   * Check if device is likely a mobile device
   */
  static isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      "android",
      "webos",
      "iphone",
      "ipad",
      "ipod",
      "blackberry",
      "windows phone",
    ];

    return (
      mobileKeywords.some((keyword) => userAgent.includes(keyword)) ||
      this.isTouchDevice()
    );
  }
}

// Create a singleton instance
export const gestureEnhancer = new GestureEnhancer();

// React hook for gesture support
export function useGestures() {
  const addSwipeSupport = gestureEnhancer.addSwipeSupport.bind(gestureEnhancer);
  const addLongPressSupport =
    gestureEnhancer.addLongPressSupport.bind(gestureEnhancer);
  const addPinchSupport = gestureEnhancer.addPinchSupport.bind(gestureEnhancer);
  const triggerHapticFeedback =
    gestureEnhancer.triggerHapticFeedback.bind(gestureEnhancer);

  return {
    addSwipeSupport,
    addLongPressSupport,
    addPinchSupport,
    triggerHapticFeedback,
    isTouchDevice: GestureEnhancer.isTouchDevice(),
    supportsHapticFeedback: GestureEnhancer.supportsHapticFeedback(),
    isMobileDevice: GestureEnhancer.isMobileDevice(),
    pixelRatio: GestureEnhancer.getPixelRatio(),
  };
}
