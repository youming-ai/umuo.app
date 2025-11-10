/**
 * Mobile optimization utilities for subtitle synchronization
 * Provides touch-friendly interactions and performance optimizations for mobile devices
 */

export interface TouchGesture {
  type: 'tap' | 'doubletap' | 'swipe' | 'pinch' | 'longpress';
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  duration: number;
  distance?: number;
  scale?: number;
}

export interface TouchConfig {
  /** Maximum time for a tap gesture */
  tapTimeout: number;
  /** Maximum distance for tap gesture */
  tapMaxDistance: number;
  /** Maximum time between double taps */
  doubleTapTimeout: number;
  /** Minimum distance for swipe gesture */
  swipeMinDistance: number;
  /** Maximum duration for swipe gesture */
  swipeMaxDuration: number;
  /** Minimum scale for pinch gesture */
  pinchMinScale: number;
  /** Long press timeout */
  longPressTimeout: number;
  /** Whether to enable haptic feedback */
  enableHaptics: boolean;
}

export const DEFAULT_TOUCH_CONFIG: TouchConfig = {
  tapTimeout: 300,
  tapMaxDistance: 15,
  doubleTapTimeout: 300,
  swipeMinDistance: 50,
  swipeMaxDuration: 500,
  pinchMinScale: 1.1,
  longPressTimeout: 500,
  enableHaptics: true,
};

/**
 * Touch gesture recognizer for mobile subtitle interactions
 */
export class TouchGestureRecognizer {
  private config: TouchConfig;
  private startPointers: Map<number, PointerEvent> = new Map();
  private lastTapTime = 0;
  private longPressTimer?: NodeJS.Timeout;
  private gestureCallbacks: Map<TouchGesture['type'], (gesture: TouchGesture) => void> = new Map();

  constructor(config: Partial<TouchConfig> = {}) {
    this.config = { ...DEFAULT_TOUCH_CONFIG, ...config };
  }

  /**
   * Register callback for a specific gesture type
   */
  on(gestureType: TouchGesture['type'], callback: (gesture: TouchGesture) => void): void {
    this.gestureCallbacks.set(gestureType, callback);
  }

  /**
   * Handle pointer down event
   */
  handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();

    this.startPointers.set(event.pointerId, event);

    // Start long press timer
    if (this.startPointers.size === 1) {
      this.longPressTimer = setTimeout(() => {
        this.handleLongPress(event);
      }, this.config.longPressTimeout);
    }
  };

  /**
   * Handle pointer move event
   */
  handlePointerMove = (event: PointerEvent): void => {
    if (!this.startPointers.has(event.pointerId)) return;

    // Clear long press timer on move
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }

    // Check for swipe
    if (this.startPointers.size === 1) {
      const startEvent = this.startPointers.get(event.pointerId)!;
      const distance = this.calculateDistance(startEvent, event);

      if (distance > this.config.tapMaxDistance) {
        this.handleSwipe(startEvent, event);
        this.startPointers.delete(event.pointerId);
      }
    }
  };

  /**
   * Handle pointer up event
   */
  handlePointerUp = (event: PointerEvent): void => {
    const startEvent = this.startPointers.get(event.pointerId);
    if (!startEvent) return;

    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }

    const distance = this.calculateDistance(startEvent, event);
    const duration = event.timeStamp - startEvent.timeStamp;

    // Check for tap
    if (distance <= this.config.tapMaxDistance && duration <= this.config.tapTimeout) {
      this.handleTap(startEvent, event);
    }

    // Check for pinch
    if (this.startPointers.size >= 2) {
      this.handlePinch();
    }

    this.startPointers.delete(event.pointerId);
  };

  /**
   * Handle pointer cancel event
   */
  handlePointerCancel = (event: PointerEvent): void => {
    this.startPointers.delete(event.pointerId);

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  };

  /**
   * Calculate distance between two points
   */
  private calculateDistance(start: PointerEvent, end: PointerEvent): number {
    const dx = end.clientX - start.clientX;
    const dy = end.clientY - start.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Handle tap gesture
   */
  private handleTap(startEvent: PointerEvent, endEvent: PointerEvent): void {
    const now = Date.now();
    const isDoubleTap = now - this.lastTapTime <= this.config.doubleTapTimeout;

    if (isDoubleTap) {
      this.emitGesture({
        type: 'doubletap',
        startX: startEvent.clientX,
        startY: startEvent.clientY,
        endX: endEvent.clientX,
        endY: endEvent.clientY,
        duration: endEvent.timeStamp - startEvent.timeStamp,
      });
    } else {
      setTimeout(() => {
        if (Date.now() - this.lastTapTime > this.config.doubleTapTimeout) {
          this.emitGesture({
            type: 'tap',
            startX: startEvent.clientX,
            startY: startEvent.clientY,
            endX: endEvent.clientX,
            endY: endEvent.clientY,
            duration: endEvent.timeStamp - startEvent.timeStamp,
          });
        }
      }, this.config.doubleTapTimeout);
    }

    this.lastTapTime = now;
    this.vibrate();
  }

  /**
   * Handle swipe gesture
   */
  private handleSwipe(startEvent: PointerEvent, endEvent: PointerEvent): void {
    const duration = endEvent.timeStamp - startEvent.timeStamp;

    if (duration > this.config.swipeMaxDuration) return;

    const distance = this.calculateDistance(startEvent, endEvent);

    if (distance >= this.config.swipeMinDistance) {
      this.emitGesture({
        type: 'swipe',
        startX: startEvent.clientX,
        startY: startEvent.clientY,
        endX: endEvent.clientX,
        endY: endEvent.clientY,
        duration,
        distance,
      });

      this.vibrate(50);
    }
  }

  /**
   * Handle pinch gesture
   */
  private handlePinch(): void {
    if (this.startPointers.size < 2) return;

    const pointers = Array.from(this.startPointers.values());
    const [p1, p2] = pointers;

    const startDistance = this.calculateDistance(p1, p2);
    const currentDistance = this.calculateDistance(
      { clientX: p1.clientX, clientY: p1.clientY } as PointerEvent,
      { clientX: p2.clientX, clientY: p2.clientY } as PointerEvent
    );

    const scale = currentDistance / startDistance;

    if (scale >= this.config.pinchMinScale) {
      this.emitGesture({
        type: 'pinch',
        startX: p1.clientX,
        startY: p1.clientY,
        duration: 0,
        scale,
      });

      this.vibrate(30);
    }
  }

  /**
   * Handle long press gesture
   */
  private handleLongPress(event: PointerEvent): void {
    this.emitGesture({
      type: 'longpress',
      startX: event.clientX,
      startY: event.clientY,
      duration: this.config.longPressTimeout,
    });

    this.vibrate(100);
  }

  /**
   * Emit gesture to registered callbacks
   */
  private emitGesture(gesture: TouchGesture): void {
    const callback = this.gestureCallbacks.get(gesture.type);
    if (callback) {
      callback(gesture);
    }
  }

  /**
   * Trigger haptic feedback
   */
  private vibrate(duration = 25): void {
    if (this.config.enableHaptics && 'vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }
}

/**
 * Mobile-specific optimizations
 */
export class MobileOptimizer {
  private isLowEndDevice = false;
  private networkSpeed = 'unknown';
  private memoryInfo: any = null;

  constructor() {
    this.detectDeviceCapabilities();
  }

  /**
   * Detect device capabilities
   */
  private detectDeviceCapabilities(): void {
    // Check memory
    const memory = (performance as any).memory;
    if (memory) {
      this.memoryInfo = {
        deviceMemory: memory.deviceMemory,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
      };
      this.isLowEndDevice = memory.deviceMemory < 4;
    }

    // Check network
    const connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection;

    if (connection) {
      this.networkSpeed = connection.effectiveType || 'unknown';

      // Consider slow networks as low-end
      if (this.networkSpeed === 'slow-2g' || this.networkSpeed === '2g') {
        this.isLowEndDevice = true;
      }
    }

    // Check CPU
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      this.isLowEndDevice = true;
    }
  }

  /**
   * Get optimal settings for mobile devices
   */
  getOptimalSettings(): {
    maxVisibleSubtitles: number;
    displayStyle: 'full' | 'compact' | 'minimal';
    wordHighlighting: boolean;
    animationsEnabled: boolean;
    updateInterval: number;
    cacheSize: number;
  } {
    const baseSettings = {
      maxVisibleSubtitles: 5,
      displayStyle: 'full' as const,
      wordHighlighting: true,
      animationsEnabled: true,
      updateInterval: 100,
      cacheSize: 100,
    };

    if (this.isLowEndDevice) {
      return {
        ...baseSettings,
        maxVisibleSubtitles: 3,
        displayStyle: 'compact',
        wordHighlighting: false,
        animationsEnabled: false,
        updateInterval: 200,
        cacheSize: 50,
      };
    }

    if (this.networkSpeed === 'slow-2g' || this.networkSpeed === '2g') {
      return {
        ...baseSettings,
        maxVisibleSubtitles: 4,
        displayStyle: 'compact',
        animationsEnabled: false,
        updateInterval: 150,
        cacheSize: 75,
      };
    }

    return baseSettings;
  }

  /**
   * Check if device is low-end
   */
  isLowEnd(): boolean {
    return this.isLowEndDevice;
  }

  /**
   * Get device information
   */
  getDeviceInfo(): {
    isLowEnd: boolean;
    networkSpeed: string;
    memoryInfo: any;
    isMobile: boolean;
  } {
    return {
      isLowEnd: this.isLowEndDevice,
      networkSpeed: this.networkSpeed,
      memoryInfo: this.memoryInfo,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    };
  }
}

/**
 * Accessibility utilities for subtitle synchronization
 */
export class AccessibilityManager {
  private announcements: HTMLElement | null = null;
  private highContrastMode = false;
  private reducedMotion = false;
  private prefersReducedTransparency = false;

  constructor() {
    this.initializeAccessibility();
  }

  /**
   * Initialize accessibility features
   */
  private initializeAccessibility(): void {
    // Create announcements container
    this.announcements = document.createElement('div');
    this.announcements.setAttribute('aria-live', 'polite');
    this.announcements.setAttribute('aria-atomic', 'true');
    this.announcements.className = 'sr-only';
    document.body.appendChild(this.announcements);

    // Detect user preferences
    this.detectPreferences();

    // Listen for preference changes
    this.watchPreferences();
  }

  /**
   * Detect accessibility preferences
   */
  private detectPreferences(): void {
    // High contrast
    this.highContrastMode = window.matchMedia('(prefers-contrast: high)').matches;

    // Reduced motion
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced transparency
    this.prefersReducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
  }

  /**
   * Watch for preference changes
   */
  private watchPreferences(): void {
    const mediaQueries = [
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-reduced-transparency: reduce)'),
    ];

    const handlers = [
      () => { this.highContrastMode = true; },
      () => { this.reducedMotion = true; },
      () => { this.prefersReducedTransparency = true; },
    ];

    mediaQueries.forEach((mq, index) => {
      mq.addListener(handlers[index]);
    });
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcements) return;

    this.announcements.setAttribute('aria-live', priority);
    this.announcements.textContent = message;

    // Clear announcement after delay
    setTimeout(() => {
      if (this.announcements) {
        this.announcements.textContent = '';
      }
    }, 1000);
  }

  /**
   * Get accessibility settings
   */
  getSettings(): {
    highContrast: boolean;
    reducedMotion: boolean;
    reducedTransparency: boolean;
    fontSize: string;
    lineHeight: number;
    letterSpacing: number;
  } {
    const rootStyles = getComputedStyle(document.documentElement);

    return {
      highContrast: this.highContrastMode,
      reducedMotion: this.reducedMotion,
      reducedTransparency: this.prefersReducedTransparency,
      fontSize: rootStyles.fontSize,
      lineHeight: parseFloat(rootStyles.lineHeight),
      letterSpacing: parseFloat(rootStyles.letterSpacing || '0'),
    };
  }

  /**
   * Apply accessibility styles
   */
  applyAccessibilityStyles(element: HTMLElement): void {
    const settings = this.getSettings();

    if (settings.highContrast) {
      element.style.backgroundColor = 'window';
      element.style.color = 'windowText';
      element.style.border = '2px solid windowText';
    }

    if (settings.reducedMotion) {
      element.style.transition = 'none';
      element.style.animation = 'none';
    }

    if (settings.reducedTransparency) {
      element.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      element.style.backdropFilter = 'none';
    }
  }

  /**
   * Get keyboard navigation handler
   */
  getKeyboardNavigationHandler(callbacks: {
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
  }): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          callbacks.onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          callbacks.onArrowDown?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          callbacks.onArrowLeft?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          callbacks.onArrowRight?.();
          break;
        case 'Enter':
        case 'Return':
          event.preventDefault();
          callbacks.onEnter?.();
          break;
        case ' ':
          event.preventDefault();
          callbacks.onSpace?.();
          break;
        case 'Escape':
          event.preventDefault();
          callbacks.onEscape?.();
          break;
      }
    };
  }

  /**
   * Cleanup accessibility manager
   */
  cleanup(): void {
    if (this.announcements) {
      document.body.removeChild(this.announcements);
      this.announcements = null;
    }
  }
}

/**
 * Performance-optimized mobile utilities
 */
export const mobileUtils = {
  /**
   * Check if device supports touch
   */
  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  /**
   * Get device pixel ratio for high DPI displays
   */
  getPixelRatio(): number {
    return window.devicePixelRatio || 1;
  },

  /**
   * Get safe area insets for notched devices
   */
  getSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    const rootStyles = getComputedStyle(document.documentElement);

    return {
      top: parseInt(rootStyles.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(rootStyles.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(rootStyles.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(rootStyles.getPropertyValue('env(safe-area-inset-left)') || '0'),
    };
  },

  /**
   * Optimize font size for mobile readability
   */
  getOptimalFontSize(baseSize: number = 16): number {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Scale based on viewport dimensions
    const scaleFactor = Math.min(viewportWidth / 375, viewportHeight / 667);

    // Ensure minimum readability
    const minSize = Math.max(14, baseSize * 0.875);
    const maxSize = baseSize * 1.25;

    return Math.max(minSize, Math.min(maxSize, baseSize * scaleFactor));
  },

  /**
   * Check if device is in landscape mode
   */
  isLandscape(): boolean {
    return window.innerWidth > window.innerHeight;
  },

  /**
   * Get viewport dimensions with safe areas
   */
  getViewportDimensions(): {
    width: number;
    height: number;
    safeWidth: number;
    safeHeight: number;
  } {
    const insets = this.getSafeAreaInsets();

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      safeWidth: window.innerWidth - insets.left - insets.right,
      safeHeight: window.innerHeight - insets.top - insets.bottom,
    };
  },
};
