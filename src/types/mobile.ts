/**
 * Mobile-specific types and utilities for optimization features
 */

export type TouchInteractionType = 'tap' | 'double_tap' | 'swipe' | 'drag' | 'pinch' | 'long_press';
export type TouchTarget = 'play_button' | 'progress_bar' | 'volume_control' | 'speed_control' | 'upload_area' | 'file_item';
export type ScreenSizeCategory = 'small' | 'medium' | 'large' | 'extra-large';

export interface TouchGestureData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number; // milliseconds
  velocity: number;
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  screenSize: { width: number; height: number };
  userAgent: string;
  touchPoints: number;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
}

export interface TouchTargetMetrics {
  minSize: number; // Minimum touch target size in pixels
  optimalSize: number; // Optimal touch target size in pixels
  spacing: number; // Minimum spacing between targets
  feedbackDuration: number; // Visual feedback duration in milliseconds
}

export interface MobilePerformanceMetrics {
  touchResponseTime: number; // Average response time for touch interactions
  gestureSuccessRate: number; // Success rate for gesture recognition
  batteryLevel: number; // Current battery level (0-1)
  isLowPowerMode: boolean;
  memoryUsage: number; // Memory usage in MB
  networkType: 'wifi' | 'cellular' | 'unknown';
  networkSpeed: number; // Network speed in Mbps
}

export interface MobileOptimizationConfig {
  touchTargetSizes: {
    min: number;
    optimal: number;
    enhanced: number;
  };
  gestureThresholds: {
    minSwipeDistance: number;
    maxSwipeTime: number;
    minLongPressDuration: number;
    doubleTapMaxTime: number;
  };
  performance: {
    maxResponseTime: number; // Maximum acceptable response time in ms
    enableGpuAcceleration: boolean;
    reduceAnimations: boolean; // Reduce animations for performance
  };
  battery: {
    enableOptimizations: boolean; // Enable battery-saving optimizations
    lowPowerModeThreshold: number; // Battery level threshold for optimizations
  };
}

export const DEFAULT_MOBILE_CONFIG: MobileOptimizationConfig = {
  touchTargetSizes: {
    min: 44,    // WCAG 2.1 minimum
    optimal: 48,  // Recommended optimal size
    enhanced: 56  // Enhanced for frequently used controls
  },
  gestureThresholds: {
    minSwipeDistance: 10,
    maxSwipeTime: 500,
    minLongPressDuration: 500,
    doubleTapMaxTime: 300
  },
  performance: {
    maxResponseTime: 300,
    enableGpuAcceleration: true,
    reduceAnimations: false
  },
  battery: {
    enableOptimizations: true,
    lowPowerModeThreshold: 0.2
  }
};

export interface TouchEventHandlers {
  onTap?: (event: TouchEvent) => void;
  onDoubleTap?: (event: TouchEvent) => void;
  onSwipe?: (direction: string, gestureData: TouchGestureData) => void;
  onDrag?: (gestureData: TouchGestureData) => void;
  onPinch?: (scale: number, gestureData: TouchGestureData) => void;
  onLongPress?: (gestureData: TouchGestureData) => void;
}

export class MobileDetector {
  private static instance: MobileDetector;
  private deviceInfo: DeviceInfo | null = null;

  static getInstance(): MobileDetector {
    if (!MobileDetector.instance) {
      MobileDetector.instance = new MobileDetector();
    }
    return MobileDetector.instance;
  }

  private constructor() {
    this.deviceInfo = this.detectDevice();
  }

  /**
   * Detect device information
   */
  private detectDevice(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const pixelRatio = window.devicePixelRatio || 1;

    // Detect device type
    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';

    if (/Mobi|Android/i.test(userAgent)) {
      type = screenWidth < 768 ? 'mobile' : 'tablet';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      type = 'tablet';
    }

    // Detect orientation
    const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';

    // Detect touch points (approximation)
    const touchPoints = 'ontouchstart' in window ? navigator.maxTouchPoints || 1 : 0;

    return {
      type,
      screenSize: { width: screenWidth, height: screenHeight },
      userAgent,
      touchPoints,
      pixelRatio,
      orientation
    };
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo!;
  }

  /**
   * Check if device is mobile
   */
  isMobile(): boolean {
    return this.deviceInfo!.type === 'mobile';
  }

  /**
   * Check if device is tablet
   */
  isTablet(): boolean {
    return this.deviceInfo!.type === 'tablet';
  }

  /**
   * Check if device has touch support
   */
  hasTouchSupport(): boolean {
    return 'ontouchstart' in window;
  }

  /**
   * Get screen size category
   */
  getScreenSizeCategory(): ScreenSizeCategory {
    const width = this.deviceInfo!.screenSize.width;

    if (width < 375) return 'small';
    if (width < 414) return 'medium';
    if (width < 768) return 'large';
    return 'extra-large';
  }

  /**
   * Check if high DPI display
   */
  isHighDPI(): boolean {
    return this.deviceInfo!.pixelRatio > 1;
  }

  /**
   * Get optimal touch target size for current device
   */
  getOptimalTouchTargetSize(): number {
    const category = this.getScreenSizeCategory();
    const isHighDPI = this.isHighDPI();

    let baseSize = DEFAULT_MOBILE_CONFIG.touchTargetSizes.optimal;

    // Adjust for screen size
    if (category === 'small') {
      baseSize = Math.max(baseSize, DEFAULT_MOBILE_CONFIG.touchTargetSizes.min);
    }

    // Adjust for high DPI displays
    if (isHighDPI) {
      baseSize = Math.round(baseSize * this.deviceInfo!.pixelRatio);
    }

    return baseSize;
  }
}

export class TouchGestureDetector {
  private config: MobileOptimizationConfig;
  private lastTapTime = 0;
  private touchStartTime = 0;
  private touchStartPos = { x: 0, y: 0 };
  private longPressTimer: NodeJS.Timeout | null = null;

  constructor(config: MobileOptimizationConfig = DEFAULT_MOBILE_CONFIG) {
    this.config = config;
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event: TouchEvent, handlers: TouchEventHandlers): void {
    const touch = event.touches[0];
    if (!touch) return;

    this.touchStartTime = Date.now();
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };

    // Start long press timer
    if (handlers.onLongPress) {
      this.longPressTimer = setTimeout(() => {
        const gestureData = this.createGestureData(touch);
        handlers.onLongPress?.(gestureData);
      }, this.config.gestureThresholds.minLongPressDuration);
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event: TouchEvent, handlers: TouchEventHandlers): void {
    const touch = event.changedTouches[0];
    if (!touch) return;

    const currentTime = Date.now();
    const duration = currentTime - this.touchStartTime;
    const gestureData = this.createGestureData(touch);

    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Check for double tap
    if (handlers.onDoubleTap && currentTime - this.lastTapTime < this.config.gestureThresholds.doubleTapMaxTime) {
      handlers.onDoubleTap(event);
      this.lastTapTime = 0;
      return;
    }

    // Check for tap
    if (handlers.onTap && duration < 200) {
      handlers.onTap(event);
      this.lastTapTime = currentTime;
    }

    // Check for swipe
    if (handlers.onSwipe && this.isSwipeGesture(gestureData)) {
      handlers.onSwipe(gestureData.direction, gestureData);
    }
  }

  /**
   * Handle touch move
   */
  handleTouchMove(event: TouchEvent, handlers: TouchEventHandlers): void {
    const touch = event.touches[0];
    if (!touch) return;

    // Clear long press timer if moved too much
    if (this.longPressTimer) {
      const currentPos = { x: touch.clientX, y: touch.clientY };
      const distance = this.calculateDistance(this.touchStartPos, currentPos);

      if (distance > 10) { // Moved more than 10px
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    // Handle drag gesture
    if (handlers.onDrag) {
      const gestureData = this.createGestureData(touch);
      handlers.onDrag(gestureData);
    }
  }

  /**
   * Create gesture data from touch event
   */
  private createGestureData(touch: Touch): TouchGestureData {
    const currentTime = Date.now();
    const duration = currentTime - this.touchStartTime;

    const deltaX = touch.clientX - this.touchStartPos.x;
    const deltaY = touch.clientY - this.touchStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let direction: TouchGestureData['direction'] = 'up';
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    return {
      startX: this.touchStartPos.x,
      startY: this.touchStartPos.y,
      endX: touch.clientX,
      endY: touch.clientY,
      duration,
      velocity: duration > 0 ? distance / duration : 0,
      direction,
      distance
    };
  }

  /**
   * Check if gesture is a swipe
   */
  private isSwipeGesture(gestureData: TouchGestureData): boolean {
    return gestureData.distance >= this.config.gestureThresholds.minSwipeDistance &&
           gestureData.duration <= this.config.gestureThresholds.maxSwipeTime;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }
}
