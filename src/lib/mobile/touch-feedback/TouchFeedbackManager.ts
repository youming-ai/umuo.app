/**
 * Comprehensive Touch Feedback Manager
 * Centralizes all touch feedback operations including visual effects, haptic feedback,
 * and animation coordination for mobile interactions.
 */

import { HapticFeedbackManager, HapticPattern } from '../haptic-feedback';

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  force?: number;
  timestamp: number;
  element?: HTMLElement;
}

export interface RippleConfig {
  color?: string;
  size?: number;
  duration?: number;
  opacity?: number;
  expand?: boolean;
  multiRipple?: boolean;
}

export interface TouchAnimationConfig {
  scale?: number;
  duration?: number;
  easing?: string;
  glow?: boolean;
  glowColor?: string;
  shadow?: boolean;
  backgroundColor?: string;
  transformOrigin?: string;
}

export interface VisualFeedbackConfig {
  ripple?: RippleConfig;
  touch?: TouchAnimationConfig;
  enableGpuAcceleration?: boolean;
  reduceMotion?: boolean;
  batteryOptimization?: boolean;
}

export interface TouchFeedbackConfig {
  visual: VisualFeedbackConfig;
  haptic: {
    enabled: boolean;
    intensity: number;
    patterns: Record<string, HapticPattern>;
  };
  performance: {
    maxActiveRipples: number;
    throttleMs: number;
    enableBatching: boolean;
    batterySaverMode: boolean;
  };
  accessibility: {
    reducedMotion: boolean;
    screenReaderSupport: boolean;
    highContrast: boolean;
  };
}

export interface TouchEventHandlers {
  onTouchStart?: (event: TouchEvent, touchPoint: TouchPoint) => void;
  onTouchMove?: (event: TouchEvent, touchPoint: TouchPoint) => void;
  onTouchEnd?: (event: TouchEvent, touchPoint: TouchPoint) => void;
  onTouchCancel?: (event: TouchEvent, touchPoint: TouchPoint) => void;
}

export class TouchFeedbackManager {
  private static instance: TouchFeedbackManager;
  private hapticManager: HapticFeedbackManager;
  private config: TouchFeedbackConfig;
  private activeRipples: Map<number, HTMLElement> = new Map();
  private activeAnimations: Map<number, Animation> = new Map();
  private touchPoints: Map<number, TouchPoint> = new Map();
  private elementRegistry: WeakMap<HTMLElement, TouchEventHandlers> = new WeakMap();
  private rippleIdCounter = 0;
  private isInitialized = false;
  private performanceMode: 'normal' | 'battery-saver' | 'performance' = 'normal';
  private lastFeedbackTime = 0;

  private constructor() {
    this.hapticManager = HapticFeedbackManager.getInstance();
    this.config = this.getDefaultConfig();
    this.initialize();
  }

  static getInstance(): TouchFeedbackManager {
    if (!TouchFeedbackManager.instance) {
      TouchFeedbackManager.instance = new TouchFeedbackManager();
    }
    return TouchFeedbackManager.instance;
  }

  /**
   * Initialize the touch feedback manager
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // Detect device capabilities and user preferences
    this.detectCapabilities();
    this.setupPerformanceOptimizations();
    this.setupAccessibilityPreferences();

    this.isInitialized = true;
  }

  /**
   * Detect device capabilities
   */
  private detectCapabilities(): void {
    // Check for touch support
    const touchSupported = 'ontouchstart' in window;

    // Check for pressure sensitivity
    const pressureSupported = PointerEvent && 'pressure' in PointerEvent.prototype;

    // Check for GPU acceleration
    const canvas = document.createElement('canvas');
    const gpuSupported = !!(canvas.getContext && canvas.getContext('2d'));

    // Check battery API if available
    if ('getBattery' in navigator) {
      (navigator.getBattery as any)().then((battery: any) => {
        this.config.performance.batterySaverMode = battery.level < 0.2;
        battery.addEventListener('levelchange', () => {
          this.config.performance.batterySaverMode = battery.level < 0.2;
        });
      });
    }

    // Adjust config based on capabilities
    if (!touchSupported) {
      this.config.visual.enableGpuAcceleration = false;
    }

    if (!pressureSupported) {
      // Disable pressure-based features
    }

    if (!gpuSupported) {
      this.config.visual.enableGpuAcceleration = false;
    }
  }

  /**
   * Setup performance optimizations
   */
  private setupPerformanceOptimizations(): void {
    // Detect device performance level
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    if (deviceMemory < 2 || hardwareConcurrency < 4) {
      this.performanceMode = 'battery-saver';
      this.config.performance.maxActiveRipples = 3;
      this.config.performance.throttleMs = 50;
    } else if (deviceMemory > 8 && hardwareConcurrency > 8) {
      this.performanceMode = 'performance';
      this.config.performance.maxActiveRipples = 10;
      this.config.performance.throttleMs = 16; // 60fps
    }

    // Monitor performance and adjust dynamically
    this.setupPerformanceMonitoring();
  }

  /**
   * Setup accessibility preferences
   */
  private setupAccessibilityPreferences(): void {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.config.accessibility.reducedMotion = prefersReducedMotion.matches;

    prefersReducedMotion.addEventListener('change', (e) => {
      this.config.accessibility.reducedMotion = e.matches;
    });

    // Check for high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
    this.config.accessibility.highContrast = prefersHighContrast.matches;

    prefersHighContrast.addEventListener('change', (e) => {
      this.config.accessibility.highContrast = e.matches;
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;

        // Adjust performance mode based on FPS
        if (fps < 30 && this.performanceMode !== 'battery-saver') {
          this.performanceMode = 'battery-saver';
          this.config.performance.maxActiveRipples = 3;
          this.config.performance.throttleMs = 100;
        } else if (fps > 55 && this.performanceMode !== 'performance') {
          this.performanceMode = 'performance';
          this.config.performance.maxActiveRipples = 10;
          this.config.performance.throttleMs = 16;
        }
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): TouchFeedbackConfig {
    return {
      visual: {
        ripple: {
          color: 'rgba(255, 255, 255, 0.6)',
          size: 100,
          duration: 600,
          opacity: 0.6,
          expand: true,
          multiRipple: false,
        },
        touch: {
          scale: 0.95,
          duration: 150,
          easing: 'ease-out',
          glow: true,
          glowColor: 'rgba(59, 130, 246, 0.5)',
          shadow: true,
          transformOrigin: 'center',
        },
        enableGpuAcceleration: true,
        reduceMotion: false,
        batteryOptimization: true,
      },
      haptic: {
        enabled: true,
        intensity: 1.0,
        patterns: {
          tap: 'light',
          longPress: 'medium',
          swipe: 'impact',
          pinch: 'selection',
          doubleTap: 'medium',
        },
      },
      performance: {
        maxActiveRipples: 5,
        throttleMs: 32, // ~30fps
        enableBatching: true,
        batterySaverMode: false,
      },
      accessibility: {
        reducedMotion: false,
        screenReaderSupport: true,
        highContrast: false,
      },
    };
  }

  /**
   * Process touch start event
   */
  public processTouchStart(event: TouchEvent, element?: HTMLElement): void {
    const now = performance.now();

    // Throttle feedback based on performance mode
    if (now - this.lastFeedbackTime < this.config.performance.throttleMs) {
      return;
    }

    this.lastFeedbackTime = now;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        force: (touch as any).force || 1,
        timestamp: now,
        element,
      };

      this.touchPoints.set(touch.identifier, touchPoint);

      // Create visual feedback
      this.createRipple(touchPoint);
      this.createTouchAnimation(element, touchPoint);

      // Trigger haptic feedback
      this.triggerHapticFeedback('tap', touchPoint);

      // Call custom handlers
      if (element) {
        const handlers = this.elementRegistry.get(element);
        handlers?.onTouchStart?.(event, touchPoint);
      }
    }
  }

  /**
   * Process touch move event
   */
  public processTouchMove(event: TouchEvent, element?: HTMLElement): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const existingTouchPoint = this.touchPoints.get(touch.identifier);

      if (existingTouchPoint) {
        const touchPoint: TouchPoint = {
          ...existingTouchPoint,
          x: touch.clientX,
          y: touch.clientY,
          force: (touch as any).force || 1,
          timestamp: performance.now(),
        };

        this.touchPoints.set(touch.identifier, touchPoint);

        // Update touch animation
        this.updateTouchAnimation(element, touchPoint);

        // Call custom handlers
        if (element) {
          const handlers = this.elementRegistry.get(element);
          handlers?.onTouchMove?.(event, touchPoint);
        }
      }
    }
  }

  /**
   * Process touch end event
   */
  public processTouchEnd(event: TouchEvent, element?: HTMLElement): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint = this.touchPoints.get(touch.identifier);

      if (touchPoint) {
        // Calculate touch duration for contextual feedback
        const duration = performance.now() - touchPoint.timestamp;

        // Trigger appropriate haptic feedback
        if (duration > 500) {
          this.triggerHapticFeedback('longPress', touchPoint);
        } else {
          this.triggerHapticFeedback('tap', touchPoint);
        }

        // Remove touch animation
        this.removeTouchAnimation(touchPoint.id);

        // Clean up
        this.touchPoints.delete(touch.identifier);

        // Call custom handlers
        if (element) {
          const handlers = this.elementRegistry.get(element);
          handlers?.onTouchEnd?.(event, touchPoint);
        }
      }
    }
  }

  /**
   * Process touch cancel event
   */
  public processTouchCancel(event: TouchEvent, element?: HTMLElement): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint = this.touchPoints.get(touch.identifier);

      if (touchPoint) {
        // Remove all visual feedback
        this.removeTouchAnimation(touchPoint.id);
        this.clearRipple(touchPoint.id);

        // Clean up
        this.touchPoints.delete(touch.identifier);

        // Call custom handlers
        if (element) {
          const handlers = this.elementRegistry.get(element);
          handlers?.onTouchCancel?.(event, touchPoint);
        }
      }
    }
  }

  /**
   * Create ripple effect
   */
  private createRipple(touchPoint: TouchPoint): void {
    // Skip ripple creation if reduced motion is preferred
    if (this.config.accessibility.reducedMotion || this.config.visual.reduceMotion) {
      return;
    }

    // Skip if too many active ripples (performance optimization)
    if (this.activeRipples.size >= this.config.performance.maxActiveRipples) {
      return;
    }

    const rippleId = this.rippleIdCounter++;
    const { ripple: rippleConfig } = this.config.visual;

    // Create ripple element
    const ripple = document.createElement('div');
    ripple.className = 'touch-feedback-ripple';
    ripple.style.cssText = `
      position: fixed;
      left: ${touchPoint.x}px;
      top: ${touchPoint.y}px;
      transform: translate(-50%, -50%);
      width: 0;
      height: 0;
      border-radius: 50%;
      background-color: ${rippleConfig.color};
      opacity: ${rippleConfig.opacity};
      pointer-events: none;
      z-index: 9999;
      ${this.config.visual.enableGpuAcceleration ? 'will-change: transform, opacity; transform: translateZ(0);' : ''}
    `;

    // Add to DOM
    document.body.appendChild(ripple);
    this.activeRipples.set(rippleId, ripple);

    // Animate ripple
    const animation = ripple.animate([
      {
        width: '0px',
        height: '0px',
        opacity: rippleConfig.opacity,
      },
      {
        width: `${rippleConfig.size}px`,
        height: `${rippleConfig.size}px`,
        opacity: 0,
      }
    ], {
      duration: rippleConfig.duration,
      easing: 'ease-out',
      fill: 'forwards',
    });

    // Clean up after animation
    animation.onfinish = () => {
      this.clearRipple(rippleId);
    };

    this.activeAnimations.set(rippleId, animation);
  }

  /**
   * Create touch animation on element
   */
  private createTouchAnimation(element?: HTMLElement, touchPoint?: TouchPoint): void {
    if (!element) return;

    const { touch: touchConfig } = this.config.visual;

    // Apply instant transformation for immediate feedback
    element.style.transition = 'none';
    element.style.transformOrigin = touchConfig.transformOrigin || 'center';

    if (this.config.visual.enableGpuAcceleration) {
      element.style.willChange = 'transform';
      element.style.transform = `scale(${touchConfig.scale}) translateZ(0)`;
    } else {
      element.style.transform = `scale(${touchConfig.scale})`;
    }

    // Add visual effects
    if (touchConfig.glow) {
      element.style.boxShadow = `0 0 20px ${touchConfig.glowColor}`;
    } else if (touchConfig.shadow) {
      element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    }

    // Store original styles for restoration
    (element as any)._touchFeedbackOriginal = {
      transform: element.style.transform,
      boxShadow: element.style.boxShadow,
      transition: element.style.transition,
      willChange: element.style.willChange,
    };
  }

  /**
   * Update touch animation
   */
  private updateTouchAnimation(element?: HTMLElement, touchPoint?: TouchPoint): void {
    if (!element || !touchPoint) return;

    // Update visual effects based on pressure if available
    if (touchPoint.force !== undefined && touchPoint.force > 0) {
      const { touch: touchConfig } = this.config.visual;
      const scale = touchConfig.scale + (1 - touchConfig.scale) * touchPoint.force;

      if (this.config.visual.enableGpuAcceleration) {
        element.style.transform = `scale(${scale}) translateZ(0)`;
      } else {
        element.style.transform = `scale(${scale})`;
      }
    }
  }

  /**
   * Remove touch animation
   */
  private removeTouchAnimation(touchId: number): void {
    const touchPoint = this.touchPoints.get(touchId);
    const element = touchPoint?.element;

    if (!element || !(element as any)._touchFeedbackOriginal) return;

    const original = (element as any)._touchFeedbackOriginal;

    // Restore original styles with smooth transition
    element.style.transition = `transform ${this.config.visual.touch?.duration}ms ease-out`;
    element.style.transform = original.transform || 'scale(1)';
    element.style.boxShadow = original.boxShadow || '';
    element.style.willChange = original.willChange || '';

    // Clean up stored original styles
    setTimeout(() => {
      delete (element as any)._touchFeedbackOriginal;
    }, this.config.visual.touch?.duration || 150);
  }

  /**
   * Clear ripple
   */
  private clearRipple(rippleId: number): void {
    const ripple = this.activeRipples.get(rippleId);
    if (ripple) {
      ripple.remove();
      this.activeRipples.delete(rippleId);
    }

    const animation = this.activeAnimations.get(rippleId);
    if (animation) {
      animation.cancel();
      this.activeAnimations.delete(rippleId);
    }
  }

  /**
   * Trigger haptic feedback
   */
  private triggerHapticFeedback(type: string, touchPoint?: TouchPoint): void {
    if (!this.config.haptic.enabled) return;

    const pattern = this.config.haptic.patterns[type];
    if (pattern) {
      this.hapticManager.trigger(pattern);
    }
  }

  /**
   * Register element for touch feedback
   */
  public registerElement(element: HTMLElement, handlers?: TouchEventHandlers): void {
    this.elementRegistry.set(element, handlers || {});

    // Add touch event listeners
    element.addEventListener('touchstart', (e) => this.processTouchStart(e, element), { passive: true });
    element.addEventListener('touchmove', (e) => this.processTouchMove(e, element), { passive: true });
    element.addEventListener('touchend', (e) => this.processTouchEnd(e, element), { passive: true });
    element.addEventListener('touchcancel', (e) => this.processTouchCancel(e, element), { passive: true });
  }

  /**
   * Unregister element
   */
  public unregisterElement(element: HTMLElement): void {
    this.elementRegistry.delete(element);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<TouchFeedbackConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      visual: { ...this.config.visual, ...config.visual },
      haptic: { ...this.config.haptic, ...config.haptic },
      performance: { ...this.config.performance, ...config.performance },
      accessibility: { ...this.config.accessibility, ...config.accessibility },
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): TouchFeedbackConfig {
    return { ...this.config };
  }

  /**
   * Get current performance mode
   */
  public getPerformanceMode(): string {
    return this.performanceMode;
  }

  /**
   * Set performance mode manually
   */
  public setPerformanceMode(mode: 'normal' | 'battery-saver' | 'performance'): void {
    this.performanceMode = mode;

    switch (mode) {
      case 'battery-saver':
        this.config.performance.maxActiveRipples = 3;
        this.config.performance.throttleMs = 100;
        this.config.visual.enableGpuAcceleration = false;
        break;
      case 'performance':
        this.config.performance.maxActiveRipples = 10;
        this.config.performance.throttleMs = 16;
        this.config.visual.enableGpuAcceleration = true;
        break;
      default:
        this.config.performance.maxActiveRipples = 5;
        this.config.performance.throttleMs = 32;
        this.config.visual.enableGpuAcceleration = true;
    }
  }

  /**
   * Create contextual feedback for specific actions
   */
  public createActionFeedback(action: 'success' | 'error' | 'warning' | 'info', element?: HTMLElement): void {
    const hapticPattern = {
      success: 'success' as HapticPattern,
      error: 'error' as HapticPattern,
      warning: 'warning' as HapticPattern,
      info: 'light' as HapticPattern,
    }[action];

    // Trigger haptic feedback
    this.hapticManager.trigger(hapticPattern);

    // Create visual feedback
    if (element) {
      const colors = {
        success: 'rgba(34, 197, 94, 0.6)',
        error: 'rgba(239, 68, 68, 0.6)',
        warning: 'rgba(245, 158, 11, 0.6)',
        info: 'rgba(59, 130, 246, 0.6)',
      };

      // Create multiple ripples for emphasis
      const centerX = element.offsetWidth / 2;
      const centerY = element.offsetHeight / 2;

      this.createRipple({
        id: -1,
        x: centerX,
        y: centerY,
        timestamp: performance.now(),
        element,
      });

      setTimeout(() => {
        this.createRipple({
          id: -2,
          x: centerX,
          y: centerY,
          timestamp: performance.now(),
          element,
        });
      }, 100);
    }
  }

  /**
   * Clean up all active feedback
   */
  public cleanup(): void {
    // Clear all ripples
    this.activeRipples.forEach((_, rippleId) => {
      this.clearRipple(rippleId);
    });

    // Cancel all animations
    this.activeAnimations.forEach((animation) => {
      animation.cancel();
    });
    this.activeAnimations.clear();

    // Clear touch points
    this.touchPoints.clear();

    // Clear element registry
    this.elementRegistry = new WeakMap();
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    activeRipples: number;
    activeAnimations: number;
    activeTouchPoints: number;
    performanceMode: string;
    lastFeedbackTime: number;
  } {
    return {
      activeRipples: this.activeRipples.size,
      activeAnimations: this.activeAnimations.size,
      activeTouchPoints: this.touchPoints.size,
      performanceMode: this.performanceMode,
      lastFeedbackTime: this.lastFeedbackTime,
    };
  }
}

// Export singleton instance
export const touchFeedbackManager = TouchFeedbackManager.getInstance();
