/**
 * Multi-Touch Manager
 * Handles multi-touch gestures and pressure sensitivity for advanced mobile interactions
 */

import { TouchFeedbackManager, TouchPoint as BaseTouchPoint } from './TouchFeedbackManager';

export interface MultiTouchPoint extends BaseTouchPoint {
  pressure?: number;
  tangentialPressure?: number;
  twist?: number;
  altitudeAngle?: number;
  azimuthAngle?: number;
  touchType?: 'direct' | 'stylus' | 'unknown';
}

export interface MultiTouchEvent {
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel';
  touches: MultiTouchPoint[];
  changedTouches: MultiTouchPoint[];
  timestamp: number;
  targetTouches: MultiTouchPoint[];
}

export interface GestureConfig {
  enableMultiTouch?: boolean;
  enablePressure?: boolean;
  enableStylus?: boolean;
  maxTouchPoints?: number;
  pressureThreshold?: number;
  gestureThreshold?: number;
  minDistance?: number;
}

export interface GestureData {
  type: 'pinch' | 'rotate' | 'pan' | 'swipe' | 'tap' | 'longPress' | 'stylus';
  touches: MultiTouchPoint[];
  scale?: number;
  rotation?: number;
  distance?: number;
  velocity?: number;
  pressure?: number;
  angle?: number;
  timestamp: number;
}

export interface GestureHandler {
  onGestureStart?: (gesture: GestureData) => void;
  onGestureMove?: (gesture: GestureData) => void;
  onGestureEnd?: (gesture: GestureData) => void;
  onTap?: (touches: MultiTouchPoint[]) => void;
  onLongPress?: (touches: MultiTouchPoint[]) => void;
  onPinch?: (scale: number, center: { x: number; y: number }) => void;
  onRotate?: (rotation: number, center: { x: number; y: number }) => void;
  onPan?: (deltaX: number, deltaY: number, touches: MultiTouchPoint[]) => void;
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number, touches: MultiTouchPoint[]) => void;
  onStylus?: (touch: MultiTouchPoint) => void;
  onPressure?: (pressure: number, touch: MultiTouchPoint) => void;
}

export class MultiTouchManager {
  private static instance: MultiTouchManager;
  private config: GestureConfig;
  private touchPoints: Map<number, MultiTouchPoint> = new Map();
  private gestureHandlers: WeakMap<Element, GestureHandler> = new WeakMap();
  private gestureState: Map<string, any> = new Map();
  private activeGestures: Set<string> = new Set();
  private lastGestureTime = 0;
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): MultiTouchManager {
    if (!MultiTouchManager.instance) {
      MultiTouchManager.instance = new MultiTouchManager();
    }
    return MultiTouchManager.instance;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): GestureConfig {
    return {
      enableMultiTouch: true,
      enablePressure: true,
      enableStylus: true,
      maxTouchPoints: 10,
      pressureThreshold: 0.1,
      gestureThreshold: 15,
      minDistance: 5,
    };
  }

  /**
   * Initialize multi-touch manager
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Check device capabilities
    this.detectCapabilities();

    // Add global event listeners
    this.addGlobalListeners();

    this.isInitialized = true;
  }

  /**
   * Detect device touch capabilities
   */
  private detectCapabilities(): void {
    const capabilities = {
      maxTouchPoints: navigator.maxTouchPoints || 0,
      touchSupport: 'ontouchstart' in window,
      pointerSupport: 'PointerEvent' in window,
      forceTouch: 'force' in TouchEvent.prototype,
      stylusSupport: false,
    };

    // Check for stylus support
    if (capabilities.pointerSupport) {
      // Test for stylus events
      const testHandler = (e: any) => {
        if (e.pointerType === 'pen' || e.pointerType === 'stylus') {
          capabilities.stylusSupport = true;
        }
      };

      document.addEventListener('pointerdown', testHandler, { once: true });
    }

    // Adjust config based on capabilities
    if (capabilities.maxTouchPoints <= 1) {
      this.config.enableMultiTouch = false;
    }

    if (!capabilities.forceTouch) {
      this.config.enablePressure = false;
    }

    if (!capabilities.stylusSupport) {
      this.config.enableStylus = false;
    }

    console.log('Multi-touch capabilities:', capabilities);
  }

  /**
   * Add global event listeners
   */
  private addGlobalListeners(): void {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });

    // Add pointer events for stylus support
    if (this.config.enableStylus) {
      document.addEventListener('pointerdown', this.handlePointerDown.bind(this), { passive: false });
      document.addEventListener('pointermove', this.handlePointerMove.bind(this), { passive: false });
      document.addEventListener('pointerup', this.handlePointerUp.bind(this), { passive: false });
    }
  }

  /**
   * Convert Touch to MultiTouchPoint
   */
  private touchToMultiTouchPoint(touch: Touch, target?: Element): MultiTouchPoint {
    return {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      force: (touch as any).force || 1,
      tangentialPressure: (touch as any).tangentialPressure,
      twist: (touch as any).twist,
      altitudeAngle: (touch as any).altitudeAngle,
      azimuthAngle: (touch as any).azimuthAngle,
      touchType: (touch as any).touchType || 'direct',
      timestamp: performance.now(),
      element: target || document.elementFromPoint(touch.clientX, touch.clientY),
    };
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(event: TouchEvent): void {
    const now = performance.now();
    this.lastGestureTime = now;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const multiTouch = this.touchToMultiTouchPoint(touch, event.target as Element);

      this.touchPoints.set(touch.identifier, multiTouch);
    }

    const multiTouchEvent = this.createMultiTouchEvent('touchstart', event);
    this.processGestures(multiTouchEvent);

    // Update TouchFeedbackManager
    if (window.touchFeedbackManager) {
      for (const touch of event.changedTouches) {
        window.touchFeedbackManager.processTouchStart(event, touch.target as HTMLElement);
      }
    }
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const existingTouch = this.touchPoints.get(touch.identifier);

      if (existingTouch) {
        const multiTouch = this.touchToMultiTouchPoint(touch, event.target as Element);
        this.touchPoints.set(touch.identifier, multiTouch);
      }
    }

    const multiTouchEvent = this.createMultiTouchEvent('touchmove', event);
    this.processGestures(multiTouchEvent);

    // Update TouchFeedbackManager
    if (window.touchFeedbackManager) {
      for (const touch of event.changedTouches) {
        window.touchFeedbackManager.processTouchMove(event, touch.target as HTMLElement);
      }
    }
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(event: TouchEvent): void {
    const multiTouchEvent = this.createMultiTouchEvent('touchend', event);
    this.processGestures(multiTouchEvent);

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touchPoints.delete(touch.identifier);
    }

    // Update TouchFeedbackManager
    if (window.touchFeedbackManager) {
      for (const touch of event.changedTouches) {
        window.touchFeedbackManager.processTouchEnd(event, touch.target as HTMLElement);
      }
    }
  }

  /**
   * Handle touch cancel
   */
  private handleTouchCancel(event: TouchEvent): void {
    const multiTouchEvent = this.createMultiTouchEvent('touchcancel', event);
    this.processGestures(multiTouchEvent);

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touchPoints.delete(touch.identifier);
    }

    // Update TouchFeedbackManager
    if (window.touchFeedbackManager) {
      for (const touch of event.changedTouches) {
        window.touchFeedbackManager.processTouchCancel(event, touch.target as HTMLElement);
      }
    }
  }

  /**
   * Handle pointer events for stylus support
   */
  private handlePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'pen' || event.pointerType === 'stylus') {
      const multiTouch: MultiTouchPoint = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        force: event.pressure,
        tangentialPressure: (event as any).tangentialPressure,
        twist: (event as any).twist,
        altitudeAngle: (event as any).altitudeAngle,
        azimuthAngle: (event as any).azimuthAngle,
        touchType: 'stylus',
        timestamp: performance.now(),
        element: event.target as Element,
      };

      this.touchPoints.set(event.pointerId, multiTouch);
      this.processStylusGesture(multiTouch);
    }
  }

  /**
   * Handle pointer move for stylus
   */
  private handlePointerMove(event: PointerEvent): void {
    if (event.pointerType === 'pen' || event.pointerType === 'stylus') {
      const existingTouch = this.touchPoints.get(event.pointerId);

      if (existingTouch) {
        const multiTouch: MultiTouchPoint = {
          ...existingTouch,
          x: event.clientX,
          y: event.clientY,
          force: event.pressure,
          tangentialPressure: (event as any).tangentialPressure,
          twist: (event as any).twist,
          altitudeAngle: (event as any).altitudeAngle,
          azimuthAngle: (event as any).azimuthAngle,
          timestamp: performance.now(),
        };

        this.touchPoints.set(event.pointerId, multiTouch);
        this.processStylusGesture(multiTouch);
        this.processPressureGesture(multiTouch);
      }
    }
  }

  /**
   * Handle pointer up for stylus
   */
  private handlePointerUp(event: PointerEvent): void {
    if (event.pointerType === 'pen' || event.pointerType === 'stylus') {
      this.touchPoints.delete(event.pointerId);
    }
  }

  /**
   * Create multi-touch event
   */
  private createMultiTouchEvent(type: MultiTouchEvent['type'], originalEvent: TouchEvent): MultiTouchEvent {
    const touches = Array.from(this.touchPoints.values());
    const changedTouches = Array.from(originalEvent.changedTouches).map(touch =>
      this.touchToMultiTouchPoint(touch, originalEvent.target as Element)
    );

    return {
      type,
      touches,
      changedTouches,
      timestamp: performance.now(),
      targetTouches: touches.filter(touch =>
        originalEvent.target?.contains(touch.element)
      ),
    };
  }

  /**
   * Process gestures based on current touch state
   */
  private processGestures(event: MultiTouchEvent): void {
    const touchCount = event.touches.length;
    const gestureId = `gesture-${touchCount}-touches`;

    switch (touchCount) {
      case 0:
        // End any active gestures
        this.endAllGestures();
        break;

      case 1:
        // Single touch gestures
        this.processSingleTouchGesture(event);
        break;

      case 2:
        // Two touch gestures (pinch, rotate)
        this.processTwoTouchGesture(event);
        break;

      default:
        // Multi-touch gestures (complex interactions)
        this.processMultiTouchGesture(event);
        break;
    }
  }

  /**
   * Process single touch gestures
   */
  private processSingleTouchGesture(event: MultiTouchEvent): void {
    const touch = event.touches[0];
    const gestureState = this.getGestureState('single');

    switch (event.type) {
      case 'touchstart':
        gestureState.startTime = event.timestamp;
        gestureState.startX = touch.x;
        gestureState.startY = touch.y;
        gestureState.lastX = touch.x;
        gestureState.lastY = touch.y;
        break;

      case 'touchmove':
        const deltaX = touch.x - gestureState.startX;
        const deltaY = touch.y - gestureState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.config.gestureThreshold!) {
          // Pan gesture
          const panDeltaX = touch.x - gestureState.lastX;
          const panDeltaY = touch.y - gestureState.lastY;

          this.notifyPan(panDeltaX, panDeltaY, [touch]);

          gestureState.lastX = touch.x;
          gestureState.lastY = touch.y;

          if (!this.activeGestures.has('pan')) {
            this.activeGestures.add('pan');
            this.notifyGestureStart({
              type: 'pan',
              touches: [touch],
              distance,
              timestamp: event.timestamp,
            });
          }
        }
        break;

      case 'touchend':
        const duration = event.timestamp - gestureState.startTime;
        const endDeltaX = touch.x - gestureState.startX;
        const endDeltaY = touch.y - gestureState.startY;
        const endDistance = Math.sqrt(endDeltaX * endDeltaX + endDeltaY * endDeltaY);

        if (endDistance < this.config.minDistance! && duration < 200) {
          // Tap gesture
          this.notifyTap([touch]);
        } else if (duration > 500) {
          // Long press gesture
          this.notifyLongPress([touch]);
        } else if (endDistance > this.config.gestureThreshold!) {
          // Swipe gesture
          const velocity = endDistance / duration;
          const direction = this.getSwipeDirection(endDeltaX, endDeltaY);

          this.notifySwipe(direction, velocity, [touch]);
        }

        this.endGesture('pan');
        break;
    }

    // Check for pressure changes
    if (this.config.enablePressure && touch.force !== undefined && touch.force > this.config.pressureThreshold!) {
      this.notifyPressure(touch.force, touch);
    }
  }

  /**
   * Process two touch gestures
   */
  private processTwoTouchGesture(event: MultiTouchEvent): void {
    if (event.touches.length < 2) return;

    const [touch1, touch2] = event.touches;
    const gestureState = this.getGestureState('two');

    // Calculate gesture metrics
    const centerX = (touch1.x + touch2.x) / 2;
    const centerY = (touch1.y + touch2.y) / 2;
    const distance = this.calculateDistance(touch1, touch2);
    const angle = this.calculateAngle(touch1, touch2);

    switch (event.type) {
      case 'touchstart':
        gestureState.startDistance = distance;
        gestureState.startAngle = angle;
        gestureState.startCenterX = centerX;
        gestureState.startCenterY = centerY;
        break;

      case 'touchmove':
        // Pinch gesture
        if (gestureState.startDistance) {
          const scale = distance / gestureState.startDistance;
          this.notifyPinch(scale, { x: centerX, y: centerY });
        }

        // Rotate gesture
        if (gestureState.startAngle !== undefined) {
          const rotation = angle - gestureState.startAngle;
          this.notifyRotate(rotation, { x: centerX, y: centerY });
        }
        break;

      case 'touchend':
        this.endGesture('pinch');
        this.endGesture('rotate');
        break;
    }
  }

  /**
   * Process multi-touch gestures
   */
  private processMultiTouchGesture(event: MultiTouchEvent): void {
    // Complex multi-touch interactions
    const gestureData: GestureData = {
      type: 'pinch', // Default type
      touches: event.touches,
      timestamp: event.timestamp,
    };

    this.notifyGestureMove(gestureData);
  }

  /**
   * Process stylus gesture
   */
  private processStylusGesture(touch: MultiTouchPoint): void {
    if (touch.touchType === 'stylus') {
      const element = touch.element;
      const handler = element ? this.gestureHandlers.get(element) : null;

      if (handler?.onStylus) {
        handler.onStylus(touch);
      }
    }
  }

  /**
   * Process pressure gesture
   */
  private processPressureGesture(touch: MultiTouchPoint): void {
    if (touch.force !== undefined && touch.force > this.config.pressureThreshold!) {
      const element = touch.element;
      const handler = element ? this.gestureHandlers.get(element) : null;

      if (handler?.onPressure) {
        handler.onPressure(touch.force, touch);
      }
    }
  }

  /**
   * Get or create gesture state
   */
  private getGestureState(key: string): any {
    if (!this.gestureState.has(key)) {
      this.gestureState.set(key, {});
    }
    return this.gestureState.get(key);
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(touch1: MultiTouchPoint, touch2: MultiTouchPoint): number {
    const deltaX = touch2.x - touch1.x;
    const deltaY = touch2.y - touch1.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  /**
   * Calculate angle between two points
   */
  private calculateAngle(touch1: MultiTouchPoint, touch2: MultiTouchPoint): number {
    return Math.atan2(touch2.y - touch1.y, touch2.x - touch1.x) * 180 / Math.PI;
  }

  /**
   * Get swipe direction
   */
  private getSwipeDirection(deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * Register gesture handlers for element
   */
  public registerGestureHandlers(element: Element, handlers: GestureHandler): void {
    this.gestureHandlers.set(element, handlers);
  }

  /**
   * Unregister gesture handlers for element
   */
  public unregisterGestureHandlers(element: Element): void {
    this.gestureHandlers.delete(element);
  }

  /**
   * Notify gesture handlers
   */
  private notifyGestureStart(gesture: GestureData): void {
    const element = gesture.touches[0]?.element;
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onGestureStart) {
      handler.onGestureStart(gesture);
    }
  }

  private notifyGestureMove(gesture: GestureData): void {
    const element = gesture.touches[0]?.element;
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onGestureMove) {
      handler.onGestureMove(gesture);
    }
  }

  private notifyGestureEnd(gesture: GestureData): void {
    const element = gesture.touches[0]?.element;
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onGestureEnd) {
      handler.onGestureEnd(gesture);
    }
  }

  private notifyTap(touches: MultiTouchPoint[]): void {
    const element = touches[0]?.element;
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onTap) {
      handler.onTap(touches);
    }
  }

  private notifyLongPress(touches: MultiTouchPoint[]): void {
    const element = touches[0]?.element;
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onLongPress) {
      handler.onLongPress(touches);
    }
  }

  private notifyPinch(scale: number, center: { x: number; y: number }): void {
    // Find elements under center point
    const element = document.elementFromPoint(center.x, center.y);
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onPinch) {
      handler.onPinch(scale, center);
    }
  }

  private notifyRotate(rotation: number, center: { x: number; y: number }): void {
    // Find elements under center point
    const element = document.elementFromPoint(center.x, center.y);
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onRotate) {
      handler.onRotate(rotation, center);
    }
  }

  private notifyPan(deltaX: number, deltaY: number, touches: MultiTouchPoint[]): void {
    const element = touches[0]?.element;
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onPan) {
      handler.onPan(deltaX, deltaY, touches);
    }
  }

  private notifySwipe(direction: 'up' | 'down' | 'left' | 'right', velocity: number, touches: MultiTouchPoint[]): void {
    const element = touches[0]?.element;
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onSwipe) {
      handler.onSwipe(direction, velocity, touches);
    }
  }

  private notifyPressure(pressure: number, touch: MultiTouchPoint): void {
    const element = touch.element;
    const handler = element ? this.gestureHandlers.get(element) : null;

    if (handler?.onPressure) {
      handler.onPressure(pressure, touch);
    }
  }

  /**
   * End specific gesture
   */
  private endGesture(gestureType: string): void {
    this.activeGestures.delete(gestureType);
  }

  /**
   * End all active gestures
   */
  private endAllGestures(): void {
    this.activeGestures.clear();
    this.gestureState.clear();
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): GestureConfig {
    return { ...this.config };
  }

  /**
   * Get current touch state
   */
  public getTouchState(): {
    activeTouches: number;
    touchPoints: MultiTouchPoint[];
    activeGestures: string[];
  } {
    return {
      activeTouches: this.touchPoints.size,
      touchPoints: Array.from(this.touchPoints.values()),
      activeGestures: Array.from(this.activeGestures),
    };
  }

  /**
   * Check if multi-touch is supported
   */
  public isMultiTouchSupported(): boolean {
    return navigator.maxTouchPoints > 1;
  }

  /**
   * Check if pressure is supported
   */
  public isPressureSupported(): boolean {
    return 'force' in TouchEvent.prototype;
  }

  /**
   * Check if stylus is supported
   */
  public isStylusSupported(): boolean {
    return 'PointerEvent' in window;
  }

  /**
   * Get device capabilities
   */
  public getCapabilities(): {
    multiTouch: boolean;
    pressure: boolean;
    stylus: boolean;
    maxTouchPoints: number;
  } {
    return {
      multiTouch: this.isMultiTouchSupported(),
      pressure: this.isPressureSupported(),
      stylus: this.isStylusSupported(),
      maxTouchPoints: navigator.maxTouchPoints || 0,
    };
  }
}

// Export singleton instance
export const multiTouchManager = MultiTouchManager.getInstance();

// Export convenience functions
export const initializeMultiTouch = (config?: Partial<GestureConfig>) => {
  if (config) {
    multiTouchManager.updateConfig(config);
  }
  multiTouchManager.initialize();
};

export const registerGestureHandlers = (element: Element, handlers: GestureHandler) => {
  multiTouchManager.registerGestureHandlers(element, handlers);
};

export const getTouchCapabilities = () => multiTouchManager.getCapabilities();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  multiTouchManager.initialize();
}
