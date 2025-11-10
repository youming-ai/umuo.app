/**
 * Comprehensive Touch Gesture Detection System for Mobile Devices
 *
 * Advanced gesture recognition system optimized for mobile devices with support for:
 * - Basic gestures: tap, double-tap, long-press, swipe, drag
 * - Complex gestures: pinch, rotate, multi-finger gestures
 * - Custom gesture recognition and configuration
 * - Haptic feedback integration
 * - Gesture chaining and composition
 * - Accessibility features
 */

import React from 'react';
import { hapticFeedback, HapticPattern } from './haptic-feedback';
import { MobileDetector, TouchGestureData, DEFAULT_MOBILE_CONFIG } from '@/types/mobile';

// ============================================================================
// Core Types and Enums
// ============================================================================

export enum GestureType {
  // Basic gestures
  TAP = 'tap',
  DOUBLE_TAP = 'double_tap',
  LONG_PRESS = 'long_press',
  SWIPE = 'swipe',
  DRAG = 'drag',

  // Multi-touch gestures
  PINCH = 'pinch',
  SPREAD = 'spread', // Opposite of pinch
  ROTATE = 'rotate',
  TWO_FINGER_TAP = 'two_finger_tap',
  TWO_FINGER_SWIPE = 'two_finger_swipe',

  // Complex gestures
  CIRCLE = 'circle',
  TRIANGLE = 'triangle',
  CUSTOM = 'custom',

  // System gestures
  PAN = 'pan',
  FLING = 'fling',
  SCROLL = 'scroll'
}

export enum SwipeDirection {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  UP_LEFT = 'up_left',
  UP_RIGHT = 'up_right',
  DOWN_LEFT = 'down_left',
  DOWN_RIGHT = 'down_right'
}

export enum GestureState {
  POSSIBLE = 'possible',
  BEGAN = 'began',
  CHANGED = 'changed',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
  force?: number; // Force sensitivity (3D Touch)
  radiusX?: number;
  radiusY?: number;
  angle?: number;
}

export interface VelocityVector {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
}

export interface GestureData {
  type: GestureType;
  state: GestureState;
  timestamp: number;
  duration: number;
  touchPoints: TouchPoint[];
  centerPoint: { x: number; y: number };
  distance: number;
  scale: number;
  rotation: number;
  velocity: VelocityVector;
  acceleration: VelocityVector;
  direction: SwipeDirection;
  confidence: number; // 0-1 confidence score
  target: Element;
  rawEvent: TouchEvent | MouseEvent;
}

export interface GestureConfig {
  // Basic gesture thresholds
  tap: {
    maxDuration: number;
    maxMovement: number;
    minConfidence: number;
  };
  doubleTap: {
    maxDuration: number;
    maxMovement: number;
    maxTimeBetweenTaps: number;
    minConfidence: number;
  };
  longPress: {
    minDuration: number;
    maxMovement: number;
    minConfidence: number;
  };
  swipe: {
    minDistance: number;
    maxDuration: number;
    minVelocity: number;
    minConfidence: number;
  };
  drag: {
    minDistance: number;
    lockAxis: boolean;
    minConfidence: number;
  };

  // Multi-touch gestures
  pinch: {
    minScale: number;
    maxDuration: number;
    minConfidence: number;
  };
  spread: {
    minScale: number;
    maxDuration: number;
    minConfidence: number;
  };
  rotate: {
    minRotation: number; // in degrees
    maxDuration: number;
    minConfidence: number;
  };

  // Complex gestures
  circle: {
    minRadius: number;
    maxRadius: number;
    completeness: number; // 0-1
    minConfidence: number;
  };

  // Performance settings
  performance: {
    enablePrediction: boolean;
    maxTouchPoints: number;
    processingDelay: number;
    batteryOptimized: boolean;
  };

  // Haptic feedback
  haptics: {
    enabled: boolean;
    patterns: Record<GestureType, HapticPattern>;
    intensity: number; // 0-1
  };
}

export interface GestureHandlers {
  // Basic gesture handlers
  onTap?: (data: GestureData) => void;
  onDoubleTap?: (data: GestureData) => void;
  onLongPress?: (data: GestureData) => void;
  onSwipe?: (data: GestureData) => void;
  onDrag?: (data: GestureData) => void;

  // Multi-touch handlers
  onPinch?: (data: GestureData) => void;
  onSpread?: (data: GestureData) => void;
  onRotate?: (data: GestureData) => void;
  onTwoFingerTap?: (data: GestureData) => void;
  onTwoFingerSwipe?: (data: GestureData) => void;

  // Complex gesture handlers
  onCircle?: (data: GestureData) => void;
  onCustom?: (data: GestureData) => void;

  // State handlers
  onGestureStart?: (type: GestureType, data: GestureData) => void;
  onGestureUpdate?: (type: GestureType, data: GestureData) => void;
  onGestureEnd?: (type: GestureType, data: GestureData) => void;
  onGestureCancel?: (type: GestureType, data: GestureData) => void;
}

export interface CustomGesture {
  name: string;
  pattern: TouchPoint[][];
  matchThreshold: number; // 0-1
  onMatch: (data: GestureData) => void;
}

// ============================================================================
// Gesture Processor
// ============================================================================

export class GestureProcessor {
  private config: GestureConfig;
  private deviceDetector: MobileDetector;
  private performanceMode: 'normal' | 'optimized' | 'battery-saver';
  private gestureHistory: GestureData[] = [];
  private predictiveGestures: Map<GestureType, Partial<GestureData>> = new Map();

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.deviceDetector = MobileDetector.getInstance();
    this.performanceMode = this.determinePerformanceMode();
  }

  private mergeConfig(userConfig: Partial<GestureConfig>): GestureConfig {
    const defaultConfig: GestureConfig = {
      tap: {
        maxDuration: 200,
        maxMovement: 15,
        minConfidence: 0.7
      },
      doubleTap: {
        maxDuration: 200,
        maxMovement: 15,
        maxTimeBetweenTaps: 300,
        minConfidence: 0.8
      },
      longPress: {
        minDuration: 500,
        maxMovement: 20,
        minConfidence: 0.9
      },
      swipe: {
        minDistance: 30,
        maxDuration: 400,
        minVelocity: 0.2,
        minConfidence: 0.8
      },
      drag: {
        minDistance: 10,
        lockAxis: true,
        minConfidence: 0.6
      },
      pinch: {
        minScale: 1.1,
        maxDuration: 500,
        minConfidence: 0.8
      },
      spread: {
        minScale: 1.1,
        maxDuration: 500,
        minConfidence: 0.8
      },
      rotate: {
        minRotation: 15,
        maxDuration: 500,
        minConfidence: 0.8
      },
      circle: {
        minRadius: 20,
        maxRadius: 150,
        completeness: 0.8,
        minConfidence: 0.7
      },
      performance: {
        enablePrediction: true,
        maxTouchPoints: 5,
        processingDelay: 0,
        batteryOptimized: false
      },
      haptics: {
        enabled: true,
        patterns: {
          [GestureType.TAP]: 'light',
          [GestureType.DOUBLE_TAP]: 'medium',
          [GestureType.LONG_PRESS]: 'heavy',
          [GestureType.SWIPE]: 'impact',
          [GestureType.DRAG]: 'selection',
          [GestureType.PINCH]: 'medium',
          [GestureType.SPREAD]: 'medium',
          [GestureType.ROTATE]: 'light',
          [GestureType.TWO_FINGER_TAP]: 'medium',
          [GestureType.TWO_FINGER_SWIPE]: 'impact',
          [GestureType.CIRCLE]: 'success',
          [GestureType.TRIANGLE]: 'warning',
          [GestureType.CUSTOM]: 'light',
          [GestureType.PAN]: 'light',
          [GestureType.FLING]: 'heavy',
          [GestureType.SCROLL]: 'light'
        },
        intensity: 1.0
      }
    };

    return {
      ...defaultConfig,
      ...userConfig,
      tap: { ...defaultConfig.tap, ...userConfig.tap },
      doubleTap: { ...defaultConfig.doubleTap, ...userConfig.doubleTap },
      longPress: { ...defaultConfig.longPress, ...userConfig.longPress },
      swipe: { ...defaultConfig.swipe, ...userConfig.swipe },
      drag: { ...defaultConfig.drag, ...userConfig.drag },
      pinch: { ...defaultConfig.pinch, ...userConfig.pinch },
      spread: { ...defaultConfig.spread, ...userConfig.spread },
      rotate: { ...defaultConfig.rotate, ...userConfig.rotate },
      circle: { ...defaultConfig.circle, ...userConfig.circle },
      performance: { ...defaultConfig.performance, ...userConfig.performance },
      haptics: { ...defaultConfig.haptics, ...userConfig.haptics }
    };
  }

  private determinePerformanceMode(): 'normal' | 'optimized' | 'battery-saver' {
    // Check battery level and power mode
    const battery = (navigator as any).battery;
    if (battery) {
      if (battery.level < 0.2 || battery.charging === false) {
        return 'battery-saver';
      } else if (battery.level < 0.5) {
        return 'optimized';
      }
    }

    // Check device capabilities
    const deviceInfo = this.deviceDetector.getDeviceInfo();
    if (deviceInfo.type === 'mobile' && deviceInfo.screenSize.width < 400) {
      return 'optimized';
    }

    return 'normal';
  }

  /**
   * Process touch points and identify potential gestures
   */
  processGesture(touchPoints: TouchPoint[], state: GestureState, rawEvent: TouchEvent | MouseEvent): GestureData | null {
    if (this.performanceMode === 'battery-saver' && touchPoints.length > 2) {
      return null; // Limit complex gestures in battery saver mode
    }

    const gestureData: GestureData = {
      type: GestureType.TAP, // Default, will be updated
      state,
      timestamp: Date.now(),
      duration: 0,
      touchPoints: [...touchPoints],
      centerPoint: this.calculateCenterPoint(touchPoints),
      distance: this.calculateDistance(touchPoints),
      scale: 1,
      rotation: 0,
      velocity: this.calculateVelocity(touchPoints),
      acceleration: this.calculateAcceleration(touchPoints),
      direction: this.calculateDirection(touchPoints),
      confidence: 0,
      target: rawEvent.target as Element,
      rawEvent
    };

    // Identify gesture type and calculate confidence
    const gestureType = this.identifyGestureType(gestureData);
    gestureData.type = gestureType;
    gestureData.confidence = this.calculateGestureConfidence(gestureType, gestureData);

    // Update predictive gestures if enabled
    if (this.config.performance.enablePrediction && state === GestureState.BEGAN) {
      this.updatePredictiveGestures(gestureData);
    }

    // Store in history
    this.addToHistory(gestureData);

    return gestureData;
  }

  private identifyGestureType(data: GestureData): GestureType {
    const touchCount = data.touchPoints.length;

    if (touchCount === 0) return GestureType.TAP;

    if (touchCount === 1) {
      return this.identifySingleFingerGesture(data);
    } else if (touchCount === 2) {
      return this.identifyTwoFingerGesture(data);
    } else {
      return this.identifyMultiFingerGesture(data);
    }
  }

  private identifySingleFingerGesture(data: GestureData): GestureType {
    const { duration, distance, velocity } = data;
    const firstPoint = data.touchPoints[0];
    const lastPoint = data.touchPoints[data.touchPoints.length - 1];

    // Check for long press
    if (duration >= this.config.longPress.minDuration && distance <= this.config.longPress.maxMovement) {
      return GestureType.LONG_PRESS;
    }

    // Check for swipe
    if (distance >= this.config.swipe.minDistance &&
        duration <= this.config.swipe.maxDuration &&
        velocity.magnitude >= this.config.swipe.minVelocity) {
      return GestureType.SWIPE;
    }

    // Check for drag
    if (distance >= this.config.drag.minDistance) {
      return GestureType.DRAG;
    }

    // Default to tap
    if (duration <= this.config.tap.maxDuration && distance <= this.config.tap.maxMovement) {
      return GestureType.TAP;
    }

    return GestureType.DRAG;
  }

  private identifyTwoFingerGesture(data: GestureData): GestureType {
    const touchPoints = data.touchPoints;

    if (touchPoints.length < 2) return GestureType.TAP;

    // Calculate pinch/spread
    const initialDistance = this.calculateDistanceBetweenPoints(touchPoints[0], touchPoints[1]);
    const scale = initialDistance > 0 ? data.distance / initialDistance : 1;
    data.scale = scale;

    // Calculate rotation
    data.rotation = this.calculateRotation(touchPoints[0], touchPoints[1]);

    if (scale < 1 / this.config.pinch.minScale) {
      return GestureType.PINCH;
    } else if (scale > this.config.spread.minScale) {
      return GestureType.SPREAD;
    } else if (Math.abs(data.rotation) >= this.config.rotate.minRotation) {
      return GestureType.ROTATE;
    } else if (data.duration <= this.config.tap.maxDuration &&
               data.distance <= this.config.tap.maxMovement) {
      return GestureType.TWO_FINGER_TAP;
    }

    return GestureType.TWO_FINGER_SWIPE;
  }

  private identifyMultiFingerGesture(data: GestureData): GestureType {
    // Check for circle gesture
    if (this.isCircleGesture(data)) {
      return GestureType.CIRCLE;
    }

    // Default to custom for complex multi-finger gestures
    return GestureType.CUSTOM;
  }

  private calculateGestureConfidence(type: GestureType, data: GestureData): number {
    let confidence = 0.5; // Base confidence

    switch (type) {
      case GestureType.TAP:
        confidence = this.calculateTapConfidence(data);
        break;
      case GestureType.DOUBLE_TAP:
        confidence = this.calculateDoubleTapConfidence(data);
        break;
      case GestureType.LONG_PRESS:
        confidence = this.calculateLongPressConfidence(data);
        break;
      case GestureType.SWIPE:
        confidence = this.calculateSwipeConfidence(data);
        break;
      case GestureType.DRAG:
        confidence = this.calculateDragConfidence(data);
        break;
      case GestureType.PINCH:
      case GestureType.SPREAD:
        confidence = this.calculatePinchConfidence(data);
        break;
      case GestureType.ROTATE:
        confidence = this.calculateRotateConfidence(data);
        break;
      case GestureType.CIRCLE:
        confidence = this.calculateCircleConfidence(data);
        break;
      default:
        confidence = 0.5;
    }

    // Apply performance mode adjustments
    if (this.performanceMode === 'battery-saver') {
      confidence *= 0.8;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  // Confidence calculation methods
  private calculateTapConfidence(data: GestureData): number {
    const durationScore = Math.max(0, 1 - (data.duration / this.config.tap.maxDuration));
    const movementScore = Math.max(0, 1 - (data.distance / this.config.tap.maxMovement));
    return (durationScore + movementScore) / 2;
  }

  private calculateDoubleTapConfidence(data: GestureData): number {
    // Check if there's a recent tap in history
    const recentTaps = this.gestureHistory
      .filter(g => g.type === GestureType.TAP &&
                   (Date.now() - g.timestamp) < this.config.doubleTap.maxTimeBetweenTaps);

    if (recentTaps.length === 0) return 0;

    const tapConfidence = this.calculateTapConfidence(data);
    const timingScore = 1 - (Math.abs(data.duration - recentTaps[0].duration) / this.config.doubleTap.maxDuration);

    return (tapConfidence + timingScore) / 2;
  }

  private calculateLongPressConfidence(data: GestureData): number {
    const durationScore = Math.min(1, data.duration / this.config.longPress.minDuration);
    const movementScore = Math.max(0, 1 - (data.distance / this.config.longPress.maxMovement));
    return (durationScore + movementScore) / 2;
  }

  private calculateSwipeConfidence(data: GestureData): number {
    const distanceScore = Math.min(1, data.distance / this.config.swipe.minDistance);
    const velocityScore = Math.min(1, data.velocity.magnitude / this.config.swipe.minVelocity);
    const durationScore = Math.max(0, 1 - (data.duration / this.config.swipe.maxDuration));
    return (distanceScore + velocityScore + durationScore) / 3;
  }

  private calculateDragConfidence(data: GestureData): number {
    const distanceScore = Math.min(1, data.distance / this.config.drag.minDistance);
    return distanceScore * 0.8; // Drag is less strict than other gestures
  }

  private calculatePinchConfidence(data: GestureData): number {
    const scaleScore = Math.min(1, (data.scale - 1) / (this.config.pinch.minScale - 1));
    const durationScore = Math.max(0, 1 - (data.duration / this.config.pinch.maxDuration));
    return (scaleScore + durationScore) / 2;
  }

  private calculateRotateConfidence(data: GestureData): number {
    const rotationScore = Math.min(1, Math.abs(data.rotation) / this.config.rotate.minRotation);
    const durationScore = Math.max(0, 1 - (data.duration / this.config.rotate.maxDuration));
    return (rotationScore + durationScore) / 2;
  }

  private calculateCircleConfidence(data: GestureData): number {
    // Simplified circle detection - checks if gesture forms roughly circular path
    const expectedRadius = (this.config.circle.minRadius + this.config.circle.maxRadius) / 2;
    const radiusScore = 1 - Math.abs(data.distance - expectedRadius) / expectedRadius;
    const directionConsistency = this.calculateDirectionConsistency(data);
    return (radiusScore + directionConsistency) / 2;
  }

  // Utility calculation methods
  private calculateCenterPoint(touchPoints: TouchPoint[]): { x: number; y: number } {
    if (touchPoints.length === 0) return { x: 0, y: 0 };

    const sumX = touchPoints.reduce((sum, point) => sum + point.x, 0);
    const sumY = touchPoints.reduce((sum, point) => sum + point.y, 0);

    return {
      x: sumX / touchPoints.length,
      y: sumY / touchPoints.length
    };
  }

  private calculateDistance(touchPoints: TouchPoint[]): number {
    if (touchPoints.length < 2) return 0;

    const firstPoint = touchPoints[0];
    const lastPoint = touchPoints[touchPoints.length - 1];

    return this.calculateDistanceBetweenPoints(firstPoint, lastPoint);
  }

  private calculateDistanceBetweenPoints(p1: TouchPoint, p2: TouchPoint): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateVelocity(touchPoints: TouchPoint[]): VelocityVector {
    if (touchPoints.length < 2) {
      return { x: 0, y: 0, magnitude: 0, angle: 0 };
    }

    const recent = touchPoints.slice(-2);
    const dt = recent[1].timestamp - recent[0].timestamp;

    if (dt === 0) {
      return { x: 0, y: 0, magnitude: 0, angle: 0 };
    }

    const dx = recent[1].x - recent[0].x;
    const dy = recent[1].y - recent[0].y;

    const vx = dx / dt;
    const vy = dy / dt;
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    const angle = Math.atan2(vy, vx) * (180 / Math.PI);

    return { x: vx, y: vy, magnitude, angle };
  }

  private calculateAcceleration(touchPoints: TouchPoint[]): VelocityVector {
    if (touchPoints.length < 3) {
      return { x: 0, y: 0, magnitude: 0, angle: 0 };
    }

    const v1 = this.calculateVelocity(touchPoints.slice(0, -1));
    const v2 = this.calculateVelocity(touchPoints.slice(-2));
    const dt = (touchPoints[touchPoints.length - 1].timestamp - touchPoints[touchPoints.length - 3].timestamp) / 2;

    if (dt === 0) {
      return { x: 0, y: 0, magnitude: 0, angle: 0 };
    }

    const ax = (v2.x - v1.x) / dt;
    const ay = (v2.y - v1.y) / dt;
    const magnitude = Math.sqrt(ax * ax + ay * ay);
    const angle = Math.atan2(ay, ax) * (180 / Math.PI);

    return { x: ax, y: ay, magnitude, angle };
  }

  private calculateDirection(touchPoints: TouchPoint[]): SwipeDirection {
    if (touchPoints.length < 2) return SwipeDirection.RIGHT;

    const firstPoint = touchPoints[0];
    const lastPoint = touchPoints[touchPoints.length - 1];

    const dx = lastPoint.x - firstPoint.x;
    const dy = lastPoint.y - firstPoint.y;

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Convert angle to direction (8-directional)
    const normalizedAngle = (angle + 360) % 360;

    if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return SwipeDirection.RIGHT;
    if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return SwipeDirection.DOWN_RIGHT;
    if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return SwipeDirection.DOWN;
    if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return SwipeDirection.DOWN_LEFT;
    if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return SwipeDirection.LEFT;
    if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return SwipeDirection.UP_LEFT;
    if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return SwipeDirection.UP;
    if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) return SwipeDirection.UP_RIGHT;

    return SwipeDirection.RIGHT;
  }

  private calculateRotation(p1: TouchPoint, p2: TouchPoint): number {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    return angle;
  }

  private calculateDirectionConsistency(data: GestureData): number {
    // Simplified: check if direction remains relatively consistent
    if (data.touchPoints.length < 3) return 1;

    let directionChanges = 0;
    let lastDirection = this.calculateDirection(data.touchPoints.slice(0, 2));

    for (let i = 1; i < data.touchPoints.length - 1; i++) {
      const currentDirection = this.calculateDirection(data.touchPoints.slice(i, i + 2));
      if (currentDirection !== lastDirection) {
        directionChanges++;
      }
      lastDirection = currentDirection;
    }

    return Math.max(0, 1 - (directionChanges / data.touchPoints.length));
  }

  private isCircleGesture(data: GestureData): boolean {
    if (data.touchPoints.length < 8) return false; // Need enough points for circle

    const radius = data.distance;
    const expectedRadius = (this.config.circle.minRadius + this.config.circle.maxRadius) / 2;

    // Check if radius is within expected range
    if (radius < this.config.circle.minRadius || radius > this.config.circle.maxRadius) {
      return false;
    }

    // Check if gesture forms a complete circle
    const directionConsistency = this.calculateDirectionConsistency(data);
    return directionConsistency >= this.config.circle.completeness;
  }

  private updatePredictiveGestures(data: GestureData): void {
    // Simple prediction based on initial movement
    if (data.velocity.magnitude > 0.1) {
      this.predictiveGestures.set(GestureType.SWIPE, data);
    }
    if (data.touchPoints.length >= 2) {
      this.predictiveGestures.set(GestureType.PINCH, data);
    }
  }

  private addToHistory(data: GestureData): void {
    this.gestureHistory.push(data);

    // Keep history size manageable
    const maxHistorySize = this.performanceMode === 'battery-saver' ? 5 : 10;
    if (this.gestureHistory.length > maxHistorySize) {
      this.gestureHistory.shift();
    }
  }

  /**
   * Get gesture history for analysis
   */
  getHistory(): GestureData[] {
    return [...this.gestureHistory];
  }

  /**
   * Get predictive gesture data
   */
  getPredictiveGestures(): Map<GestureType, Partial<GestureData>> {
    return new Map(this.predictiveGestures);
  }

  /**
   * Clear gesture history and predictive data
   */
  clearHistory(): void {
    this.gestureHistory = [];
    this.predictiveGestures.clear();
  }

  /**
   * Get current performance mode
   */
  getPerformanceMode(): 'normal' | 'optimized' | 'battery-saver' {
    return this.performanceMode;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GestureConfig>): void {
    this.config = this.mergeConfig({ ...this.config, ...config });
  }

  /**
   * Get current configuration
   */
  getConfig(): GestureConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Main GestureDetector Class
// ============================================================================

export class GestureDetector {
  private processor: GestureProcessor;
  private handlers: GestureHandlers;
  private isActive: boolean = false;
  private touchPoints: Map<number, TouchPoint> = new Map();
  private gestureStartTime: number = 0;
  private longPressTimer: NodeJS.Timeout | null = null;
  private currentGestureType: GestureType | null = null;
  private lastGestureData: GestureData | null = null;
  private customGestures: CustomGesture[] = [];
  private gestureChain: GestureType[] = [];
  private accessibilityEnabled: boolean = true;

  constructor(config: Partial<GestureConfig> = {}, handlers: GestureHandlers = {}) {
    this.processor = new GestureProcessor(config);
    this.handlers = handlers;
    this.accessibilityEnabled = this.checkAccessibilityPreferences();
  }

  private checkAccessibilityPreferences(): boolean {
    try {
      return localStorage.getItem('gesture-accessibility') !== 'false';
    } catch {
      return true; // Default to enabled
    }
  }

  /**
   * Start gesture detection
   */
  start(): void {
    this.isActive = true;
    this.gestureStartTime = Date.now();
  }

  /**
   * Stop gesture detection
   */
  stop(): void {
    this.isActive = false;
    this.clearTimers();
    this.touchPoints.clear();
    this.currentGestureType = null;
  }

  /**
   * Handle touch start event
   */
  handleTouchStart(event: TouchEvent): void {
    if (!this.isActive) return;

    event.preventDefault(); // Prevent default browser behavior
    this.clearTimers();

    const currentTime = Date.now();

    // Add new touch points
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touchPoints.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: currentTime,
        force: (touch as any).force,
        radiusX: touch.radiusX,
        radiusY: touch.radiusY,
        angle: touch.rotationAngle
      });
    }

    const touchPointArray = Array.from(this.touchPoints.values());
    const gestureData = this.processor.processGesture(touchPointArray, GestureState.BEGAN, event);

    if (gestureData && gestureData.confidence >= this.processor.getConfig().tap.minConfidence) {
      this.currentGestureType = gestureData.type;
      this.lastGestureData = gestureData;

      // Start long press timer for single touch
      if (touchPointArray.length === 1) {
        this.longPressTimer = setTimeout(() => {
          const longPressData = this.processor.processGesture(
            Array.from(this.touchPoints.values()),
            GestureState.ENDED,
            event
          );

          if (longPressData && longPressData.type === GestureType.LONG_PRESS) {
            this.triggerGesture(GestureType.LONG_PRESS, longPressData);
          }
        }, this.processor.getConfig().longPress.minDuration);
      }

      this.handlers.onGestureStart?.(gestureData.type, gestureData);

      // Trigger haptic feedback
      this.triggerHapticFeedback(gestureData.type, 'light');
    }
  }

  /**
   * Handle touch move event
   */
  handleTouchMove(event: TouchEvent): void {
    if (!this.isActive || this.touchPoints.size === 0) return;

    event.preventDefault();

    // Clear long press timer if movement exceeds threshold
    if (this.longPressTimer && this.touchPoints.size === 1) {
      const touchPoint = Array.from(this.touchPoints.values())[0];
      const currentTouch = event.touches[0];

      if (currentTouch) {
        const movement = Math.sqrt(
          Math.pow(currentTouch.clientX - touchPoint.x, 2) +
          Math.pow(currentTouch.clientY - touchPoint.y, 2)
        );

        if (movement > this.processor.getConfig().longPress.maxMovement) {
          this.clearTimers();
        }
      }
    }

    // Update touch points
    const currentTime = Date.now();
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const existingPoint = this.touchPoints.get(touch.identifier);

      if (existingPoint) {
        this.touchPoints.set(touch.identifier, {
          ...existingPoint,
          x: touch.clientX,
          y: touch.clientY,
          timestamp: currentTime,
          force: (touch as any).force,
          radiusX: touch.radiusX,
          radiusY: touch.radiusY,
          angle: touch.rotationAngle
        });
      }
    }

    const touchPointArray = Array.from(this.touchPoints.values());
    const gestureData = this.processor.processGesture(touchPointArray, GestureState.CHANGED, event);

    if (gestureData && this.currentGestureType) {
      this.lastGestureData = gestureData;

      // Handle different gesture types during movement
      switch (gestureData.type) {
        case GestureType.DRAG:
          this.handlers.onDrag?.(gestureData);
          break;
        case GestureType.PINCH:
          this.handlers.onPinch?.(gestureData);
          break;
        case GestureType.SPREAD:
          this.handlers.onSpread?.(gestureData);
          break;
        case GestureType.ROTATE:
          this.handlers.onRotate?.(gestureData);
          break;
      }

      this.handlers.onGestureUpdate?.(gestureData.type, gestureData);
    }
  }

  /**
   * Handle touch end event
   */
  handleTouchEnd(event: TouchEvent): void {
    if (!this.isActive) return;

    event.preventDefault();

    // Clear any pending timers
    this.clearTimers();

    // Remove ended touch points
    for (let i = 0; i < event.changedTouches.length; i++) {
      this.touchPoints.delete(event.changedTouches[i].identifier);
    }

    const touchPointArray = Array.from(this.touchPoints.values());

    if (touchPointArray.length === 0) {
      // All touches ended - process final gesture
      const gestureData = this.processor.processGesture(
        this.lastGestureData?.touchPoints || [],
        GestureState.ENDED,
        event
      );

      if (gestureData && gestureData.confidence >= this.getMinConfidence(gestureData.type)) {
        this.triggerGesture(gestureData.type, gestureData);
        this.addToGestureChain(gestureData.type);
      }

      this.handlers.onGestureEnd?.(this.currentGestureType || GestureType.TAP, gestureData || this.lastGestureData!);
      this.currentGestureType = null;
      this.touchPoints.clear();
    } else {
      // Some touches still active - continue gesture
      const gestureData = this.processor.processGesture(touchPointArray, GestureState.CHANGED, event);
      if (gestureData) {
        this.lastGestureData = gestureData;
        this.handlers.onGestureUpdate?.(gestureData.type, gestureData);
      }
    }
  }

  private getMinConfidence(type: GestureType): number {
    const config = this.processor.getConfig();
    switch (type) {
      case GestureType.TAP:
        return config.tap.minConfidence;
      case GestureType.DOUBLE_TAP:
        return config.doubleTap.minConfidence;
      case GestureType.LONG_PRESS:
        return config.longPress.minConfidence;
      case GestureType.SWIPE:
        return config.swipe.minConfidence;
      case GestureType.DRAG:
        return config.drag.minConfidence;
      case GestureType.PINCH:
      case GestureType.SPREAD:
        return config.pinch.minConfidence;
      case GestureType.ROTATE:
        return config.rotate.minConfidence;
      default:
        return 0.5;
    }
  }

  private triggerGesture(type: GestureType, data: GestureData): void {
    // Trigger appropriate handler
    switch (type) {
      case GestureType.TAP:
        this.handlers.onTap?.(data);
        break;
      case GestureType.DOUBLE_TAP:
        this.handlers.onDoubleTap?.(data);
        break;
      case GestureType.LONG_PRESS:
        this.handlers.onLongPress?.(data);
        break;
      case GestureType.SWIPE:
        this.handlers.onSwipe?.(data);
        break;
      case GestureType.DRAG:
        this.handlers.onDrag?.(data);
        break;
      case GestureType.PINCH:
        this.handlers.onPinch?.(data);
        break;
      case GestureType.SPREAD:
        this.handlers.onSpread?.(data);
        break;
      case GestureType.ROTATE:
        this.handlers.onRotate?.(data);
        break;
      case GestureType.TWO_FINGER_TAP:
        this.handlers.onTwoFingerTap?.(data);
        break;
      case GestureType.TWO_FINGER_SWIPE:
        this.handlers.onTwoFingerSwipe?.(data);
        break;
      case GestureType.CIRCLE:
        this.handlers.onCircle?.(data);
        break;
      case GestureType.CUSTOM:
        this.checkCustomGestures(data);
        break;
    }

    // Trigger haptic feedback
    this.triggerHapticFeedback(type, 'medium');
  }

  private triggerHapticFeedback(type: GestureType, intensity: 'light' | 'medium' | 'heavy'): void {
    const config = this.processor.getConfig();
    if (!config.haptics.enabled) return;

    const pattern = config.haptics.patterns[type] || 'light';
    hapticFeedback.trigger(pattern);
  }

  private checkCustomGestures(data: GestureData): void {
    for (const customGesture of this.customGestures) {
      if (this.matchCustomGesture(customGesture, data)) {
        customGesture.onMatch(data);
        this.triggerHapticFeedback(GestureType.CUSTOM, 'medium');
        return;
      }
    }

    this.handlers.onCustom?.(data);
  }

  private matchCustomGesture(customGesture: CustomGesture, data: GestureData): boolean {
    // Simplified custom gesture matching
    // In a real implementation, this would use pattern matching algorithms
    return data.confidence >= customGesture.matchThreshold;
  }

  private addToGestureChain(type: GestureType): void {
    this.gestureChain.push(type);

    // Keep chain size manageable
    if (this.gestureChain.length > 5) {
      this.gestureChain.shift();
    }
  }

  private clearTimers(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Add custom gesture
   */
  addCustomGesture(gesture: CustomGesture): void {
    this.customGestures.push(gesture);
  }

  /**
   * Remove custom gesture
   */
  removeCustomGesture(name: string): void {
    this.customGestures = this.customGestures.filter(g => g.name !== name);
  }

  /**
   * Get gesture chain history
   */
  getGestureChain(): GestureType[] {
    return [...this.gestureChain];
  }

  /**
   * Clear gesture chain
   */
  clearGestureChain(): void {
    this.gestureChain = [];
  }

  /**
   * Update handlers
   */
  updateHandlers(handlers: Partial<GestureHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GestureConfig>): void {
    this.processor.updateConfig(config);
  }

  /**
   * Get current gesture type
   */
  getCurrentGestureType(): GestureType | null {
    return this.currentGestureType;
  }

  /**
   * Get last gesture data
   */
  getLastGestureData(): GestureData | null {
    return this.lastGestureData;
  }

  /**
   * Check if gesture is active
   */
  isGestureActive(): boolean {
    return this.isActive && this.touchPoints.size > 0;
  }

  /**
   * Enable/disable accessibility features
   */
  setAccessibilityEnabled(enabled: boolean): void {
    this.accessibilityEnabled = enabled;
    try {
      localStorage.setItem('gesture-accessibility', enabled.toString());
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Get accessibility status
   */
  isAccessibilityEnabled(): boolean {
    return this.accessibilityEnabled;
  }

  /**
   * Cancel current gesture
   */
  cancel(): void {
    if (this.currentGestureType && this.lastGestureData) {
      this.handlers.onGestureCancel?.(this.currentGestureType, this.lastGestureData);
    }

    this.clearTimers();
    this.touchPoints.clear();
    this.currentGestureType = null;
    this.isActive = false;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    mode: string;
    gestureCount: number;
    averageConfidence: number;
    hapticFeedbackEnabled: boolean;
  } {
    const history = this.processor.getHistory();
    const averageConfidence = history.length > 0
      ? history.reduce((sum, g) => sum + g.confidence, 0) / history.length
      : 0;

    return {
      mode: this.processor.getPerformanceMode(),
      gestureCount: history.length,
      averageConfidence,
      hapticFeedbackEnabled: this.processor.getConfig().haptics.enabled
    };
  }
}

// ============================================================================
// React Hooks
// ============================================================================

export const useGestureDetector = (
  config: Partial<GestureConfig> = {},
  handlers: GestureHandlers = {}
) => {
  const detectorRef = React.useRef<GestureDetector | null>(null);
  const elementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const detector = new GestureDetector(config, handlers);
    detectorRef.current = detector;

    return () => {
      detector.stop();
    };
  }, []);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element || !detectorRef.current) return;

    const handleTouchStart = (e: TouchEvent) => {
      detectorRef.current!.handleTouchStart(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      detectorRef.current!.handleTouchMove(e);
    };
    const handleTouchEnd = (e: TouchEvent) => {
      detectorRef.current!.handleTouchEnd(e);
    };

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef.current]);

  const bind = React.useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
    if (element && detectorRef.current) {
      detectorRef.current.start();
    }
  }, []);

  const unbind = React.useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.stop();
    }
    elementRef.current = null;
  }, []);

  const cancel = React.useCallback(() => {
    detectorRef.current?.cancel();
  }, []);

  return {
    bind,
    unbind,
    cancel,
    detector: detectorRef.current,
    isGestureActive: () => detectorRef.current?.isGestureActive() || false,
    getCurrentGestureType: () => detectorRef.current?.getCurrentGestureType() || null,
    getLastGestureData: () => detectorRef.current?.getLastGestureData() || null,
    updateConfig: (config: Partial<GestureConfig>) => detectorRef.current?.updateConfig(config),
    updateHandlers: (handlers: Partial<GestureHandlers>) => detectorRef.current?.updateHandlers(handlers),
    addCustomGesture: (gesture: CustomGesture) => detectorRef.current?.addCustomGesture(gesture),
    getPerformanceMetrics: () => detectorRef.current?.getPerformanceMetrics() || {
      mode: 'normal',
      gestureCount: 0,
      averageConfidence: 0,
      hapticFeedbackEnabled: true
    }
  };
};

// Export convenience hooks for specific gesture types
export const useTapGesture = (
  onTap: (data: GestureData) => void,
  config?: Partial<GestureConfig>
) => {
  return useGestureDetector(config, { onTap });
};

export const useSwipeGesture = (
  onSwipe: (data: GestureData) => void,
  config?: Partial<GestureConfig>
) => {
  return useGestureDetector(config, { onSwipe });
};

export const usePinchGesture = (
  onPinch: (data: GestureData) => void,
  config?: Partial<GestureConfig>
) => {
  return useGestureDetector(config, { onPinch });
};

export const useDragGesture = (
  onDrag: (data: GestureData) => void,
  config?: Partial<GestureConfig>
) => {
  return useGestureDetector(config, { onDrag });
};

// ============================================================================
// Utility Functions
// ============================================================================

export const createPlayerGestureConfig = (): Partial<GestureConfig> => ({
  swipe: {
    minDistance: 20,
    maxDuration: 300,
    minVelocity: 0.15,
    minConfidence: 0.8
  },
  longPress: {
    minDuration: 600,
    maxMovement: 20,
    minConfidence: 0.9
  },
  pinch: {
    minScale: 1.05,
    maxDuration: 400,
    minConfidence: 0.8
  },
  tap: {
    maxDuration: 150,
    maxMovement: 8,
    minConfidence: 0.7
  },
  haptics: {
    enabled: true,
    intensity: 1.0,
    patterns: {
      [GestureType.TAP]: 'light',
      [GestureType.SWIPE]: 'impact',
      [GestureType.PINCH]: 'medium',
      [GestureType.LONG_PRESS]: 'heavy'
    }
  }
});

export const createUploadAreaGestureConfig = (): Partial<GestureConfig> => ({
  swipe: {
    minDistance: 15,
    maxDuration: 250,
    minVelocity: 0.1,
    minConfidence: 0.7
  },
  longPress: {
    minDuration: 400,
    maxMovement: 15,
    minConfidence: 0.8
  },
  tap: {
    maxDuration: 200,
    maxMovement: 10,
    minConfidence: 0.6
  }
});

export default GestureDetector;
