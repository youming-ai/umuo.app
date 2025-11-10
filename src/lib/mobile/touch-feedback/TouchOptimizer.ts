/**
 * Touch Event Optimizer
 * Eliminates 300ms delay and optimizes touch events for better mobile performance
 */

export interface TouchEventConfig {
  fastClick?: boolean;
  preventScroll?: boolean;
  preventZoom?: boolean;
  threshold?: number;
  maxDelay?: number;
  enablePassive?: boolean;
}

export interface TouchPoint {
  identifier: number;
  startTime: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  moved: boolean;
  element: Element;
}

export class TouchOptimizer {
  private static instance: TouchOptimizer;
  private touchPoints: Map<number, TouchPoint> = new Map();
  private config: TouchEventConfig;
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): TouchOptimizer {
    if (!TouchOptimizer.instance) {
      TouchOptimizer.instance = new TouchOptimizer();
    }
    return TouchOptimizer.instance;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): TouchEventConfig {
    return {
      fastClick: true,
      preventScroll: false,
      preventZoom: true,
      threshold: 10, // Maximum movement before considering it a scroll
      maxDelay: 50, // Maximum artificial delay
      enablePassive: true,
    };
  }

  /**
   * Initialize touch optimization
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Remove 300ms delay on mobile browsers
    this.remove300msDelay();

    // Prevent double-tap zoom
    if (this.config.preventZoom) {
      this.preventDoubleTapZoom();
    }

    // Optimize touch event handling
    this.optimizeTouchEvents();

    this.isInitialized = true;
  }

  /**
   * Remove 300ms click delay on mobile devices
   */
  private remove300msDelay(): void {
    // Set touch-action CSS property
    const style = document.createElement('style');
    style.textContent = `
      .touch-optimized {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      .touch-optimized * {
        pointer-events: none;
      }
      .touch-optimized button,
      .touch-optimized a,
      .touch-optimized input,
      .touch-optimized select,
      .touch-optimized textarea,
      .touch-optimized [role="button"],
      .touch-optimized [data-touchable] {
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);

    // Add touch-optimized class to body
    document.body.classList.add('touch-optimized');

    // Add viewport meta tag for mobile optimization
    this.optimizeViewport();

    // Handle fast click
    if (this.config.fastClick) {
      this.setupFastClick();
    }
  }

  /**
   * Optimize viewport meta tag
   */
  private optimizeViewport(): void {
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;

    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }

    const currentContent = viewportMeta.content || '';
    const settings = new Set(currentContent.split(',').map(s => s.trim()));

    // Add mobile optimization settings
    settings.add('width=device-width');
    settings.add('initial-scale=1');
    settings.add('maximum-scale=5');
    settings.add('user-scalable=yes');

    viewportMeta.content = Array.from(settings).join(', ');
  }

  /**
   * Prevent double-tap zoom on touchable elements
   */
  private preventDoubleTapZoom(): void {
    let lastTouchEnd = 0;

    document.addEventListener('touchend', (event) => {
      const now = Date.now();

      // If two taps are close together and on the same element, prevent zoom
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();

        // Prevent the default double-tap behavior
        const touch = event.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);

        if (target) {
          // Trigger a click event on the target
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: touch.clientX,
            clientY: touch.clientY,
          });
          target.dispatchEvent(clickEvent);
        }
      }

      lastTouchEnd = now;
    }, false);
  }

  /**
   * Setup fast click functionality
   */
  private setupFastClick(): void {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), {
      passive: this.config.enablePassive,
    });

    document.addEventListener('touchmove', this.handleTouchMove.bind(this), {
      passive: this.config.enablePassive,
    });

    document.addEventListener('touchend', this.handleTouchEnd.bind(this), {
      passive: false, // Need to be able to prevent default
    });

    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), {
      passive: true,
    });
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];

      const touchPoint: TouchPoint = {
        identifier: touch.identifier,
        startTime: performance.now(),
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        moved: false,
        element: event.target as Element,
      };

      this.touchPoints.set(touch.identifier, touchPoint);
    }
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint = this.touchPoints.get(touch.identifier);

      if (touchPoint) {
        touchPoint.currentX = touch.clientX;
        touchPoint.currentY = touch.clientY;

        const deltaX = Math.abs(touchPoint.currentX - touchPoint.startX);
        const deltaY = Math.abs(touchPoint.currentY - touchPoint.startY);

        if (deltaX > this.config.threshold! || deltaY > this.config.threshold!) {
          touchPoint.moved = true;
        }
      }
    }
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint = this.touchPoints.get(touch.identifier);

      if (touchPoint && !touchPoint.moved) {
        // This was a tap, not a scroll or gesture

        // Check if the element is clickable
        const element = this.findClickableElement(touchPoint.element);

        if (element) {
          const duration = performance.now() - touchPoint.startTime;

          // Only trigger click if it's within reasonable time
          if (duration <= (this.config.maxDelay || 300)) {
            event.preventDefault();

            // Create synthetic click event
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: touchPoint.startX,
              clientY: touchPoint.startY,
              button: 0,
              buttons: 1,
            });

            // Dispatch the click event
            element.dispatchEvent(clickEvent);

            // Also dispatch touchend for compatibility
            element.dispatchEvent(new TouchEvent('touchend', {
              bubbles: true,
              cancelable: true,
              changedTouches: event.changedTouches,
            }));
          }
        }
      }

      // Clean up touch point
      this.touchPoints.delete(touch.identifier);
    }
  }

  /**
   * Handle touch cancel
   */
  private handleTouchCancel(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touchPoints.delete(touch.identifier);
    }
  }

  /**
   * Find the closest clickable element
   */
  private findClickableElement(element: Element): Element | null {
    const clickableSelectors = [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[data-touchable]',
      '[onclick]',
      '.clickable',
      '.touchable',
    ];

    let current = element;
    while (current && current !== document.body) {
      // Check if element matches any clickable selector
      for (const selector of clickableSelectors) {
        if (current.matches(selector)) {
          return current;
        }
      }

      // Check if element has click event listeners
      const eventListeners = (current as any)._eventListeners;
      if (eventListeners && eventListeners.click && eventListeners.click.length > 0) {
        return current;
      }

      current = current.parentElement!;
    }

    return null;
  }

  /**
   * Optimize touch events globally
   */
  private optimizeTouchEvents(): void {
    // Make document.touchOptimized true for feature detection
    (document as any).touchOptimized = true;

    // Add touch-action CSS for common scrollable elements
    const scrollableSelectors = [
      '.scrollable',
      '[data-scrollable]',
      '.overflow-auto',
      '.overflow-scroll',
    ];

    scrollableSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        (element as HTMLElement).style.touchAction = 'pan-y';
      });
    });
  }

  /**
   * Add touch optimization to element
   */
  public optimizeElement(element: HTMLElement, customConfig?: Partial<TouchEventConfig>): void {
    const config = { ...this.config, ...customConfig };

    // Add CSS classes
    element.classList.add('touch-optimized');

    // Set touch-action
    if (config.preventScroll) {
      element.style.touchAction = 'none';
    } else {
      element.style.touchAction = 'manipulation';
    }

    // Set CSS properties
    element.style.webkitTapHighlightColor = 'transparent';
    element.style.webkitUserSelect = 'none';
    element.style.webkitTouchCallout = 'none';

    // Add event listeners for optimization
    if (config.fastClick) {
      this.addFastClickToElement(element, config);
    }
  }

  /**
   * Add fast click to specific element
   */
  private addFastClickToElement(element: HTMLElement, config: TouchEventConfig): void {
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStartTime = performance.now();
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchMoved = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartX);
      const deltaY = Math.abs(touch.clientY - touchStartY);

      if (deltaX > config.threshold! || deltaY > config.threshold!) {
        touchMoved = true;
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchMoved) {
        const duration = performance.now() - touchStartTime;

        if (duration <= (config.maxDelay || 300)) {
          event.preventDefault();

          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
          });

          element.dispatchEvent(clickEvent);
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, {
      passive: config.enablePassive,
    });

    element.addEventListener('touchmove', handleTouchMove, {
      passive: config.enablePassive,
    });

    element.addEventListener('touchend', handleTouchEnd, {
      passive: false,
    });
  }

  /**
   * Create optimized touch event handlers
   */
  public createOptimizedHandlers(
    element: HTMLElement,
    onTap?: (event: Event) => void,
    onPress?: (event: Event) => void,
    onLongPress?: (event: Event) => void,
    config?: Partial<TouchEventConfig>
  ): { [key: string]: (event: Event) => void } {
    const finalConfig = { ...this.config, ...config };
    let pressTimer: number | null = null;
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;

    return {
      onTouchStart: (event: TouchEvent) => {
        const touch = event.touches[0];
        touchStartTime = performance.now();
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchMoved = false;

        // Start press timer for long press detection
        pressTimer = window.setTimeout(() => {
          if (!touchMoved && onLongPress) {
            onLongPress(event);
          }
        }, 500); // 500ms for long press
      },

      onTouchMove: (event: TouchEvent) => {
        const touch = event.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);

        if (deltaX > finalConfig.threshold! || deltaY > finalConfig.threshold!) {
          touchMoved = true;

          // Cancel press timer if user moved
          if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
        }
      },

      onTouchEnd: (event: TouchEvent) => {
        // Clear press timer
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }

        const duration = performance.now() - touchStartTime;

        if (!touchMoved && duration <= (finalConfig.maxDelay || 300)) {
          if (duration > 100 && onPress) {
            // Press detected
            onPress(event);
          } else if (onTap) {
            // Tap detected
            onTap(event);
          }
        }
      },

      onTouchCancel: () => {
        // Clear press timer
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        touchMoved = true;
      },
    };
  }

  /**
   * Debounce touch events
   */
  public debounceTouchEvents(
    element: HTMLElement,
    delay: number = 100
  ): { [key: string]: (event: Event) => void } {
    let debounceTimer: number | null = null;

    return {
      onTouchStart: (event: TouchEvent) => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = window.setTimeout(() => {
          // Forward the event
          element.dispatchEvent(new TouchEvent('touchstart', event));
        }, delay);
      },

      onTouchMove: (event: TouchEvent) => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = window.setTimeout(() => {
          element.dispatchEvent(new TouchEvent('touchmove', event));
        }, delay);
      },

      onTouchEnd: (event: TouchEvent) => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = window.setTimeout(() => {
          element.dispatchEvent(new TouchEvent('touchend', event));
        }, delay);
      },
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<TouchEventConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): TouchEventConfig {
    return { ...this.config };
  }

  /**
   * Check if touch optimization is supported
   */
  public isSupported(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get device touch capabilities
   */
  public getTouchCapabilities(): {
    supported: boolean;
    maxTouchPoints: number;
    forceTouch: boolean;
    mouseEvents: boolean;
  } {
    return {
      supported: this.isSupported(),
      maxTouchPoints: navigator.maxTouchPoints || 0,
      forceTouch: 'force' in TouchEvent.prototype,
      mouseEvents: 'onmousedown' in window,
    };
  }
}

// Export singleton instance
export const touchOptimizer = TouchOptimizer.getInstance();

// Export convenience functions
export const initializeTouchOptimization = (config?: Partial<TouchEventConfig>) => {
  if (config) {
    touchOptimizer.updateConfig(config);
  }
  touchOptimizer.initialize();
};

export const optimizeElement = (element: HTMLElement, config?: Partial<TouchEventConfig>) => {
  touchOptimizer.optimizeElement(element, config);
};

export const createOptimizedHandlers = (
  element: HTMLElement,
  onTap?: (event: Event) => void,
  onPress?: (event: Event) => void,
  onLongPress?: (event: Event) => void,
  config?: Partial<TouchEventConfig>
) => {
  return touchOptimizer.createOptimizedHandlers(element, onTap, onPress, onLongPress, config);
};

export const getTouchCapabilities = () => touchOptimizer.getTouchCapabilities();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  touchOptimizer.initialize();
}
