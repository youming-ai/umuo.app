/**
 * Animation utilities for high-performance visual feedback
 * Optimized for 60fps animations with GPU acceleration
 */

export interface AnimationKeyframe {
  offset?: number;
  opacity?: number;
  transform?: string;
  backgroundColor?: string;
  borderColor?: string;
  boxShadow?: string;
  filter?: string;
  [key: string]: any;
}

export interface AnimationOptions {
  duration: number;
  easing?: string;
  delay?: number;
  iterations?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fill?: 'none' | 'forwards' | 'backwards' | 'both';
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  totalTime: number;
  memoryDelta: number;
  startTime: number;
  endTime: number;
}

// Easing functions for smooth animations
export const EASING_FUNCTIONS = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Custom cubic-bezier curves
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  bounce: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  back: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',

  // Standard easing curves
  circIn: 'cubic-bezier(0.55, 0, 1, 0.45)',
  circOut: 'cubic-bezier(0, 0.55, 0.45, 1)',
  circInOut: 'cubic-bezier(0.85, 0, 0.15, 1)',

  quadIn: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  quadOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  quadInOut: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',

  cubicIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  cubicOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  cubicInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',

  quartIn: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  quartOut: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  quartInOut: 'cubic-bezier(0.77, 0, 0.175, 1)',

  quintIn: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
  quintOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
  quintInOut: 'cubic-bezier(0.86, 0, 0.07, 1)',

  expoIn: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
  expoOut: 'cubic-bezier(0.19, 1, 0.22, 1)',
  expoInOut: 'cubic-bezier(1, 0, 0, 1)',

  sineIn: 'cubic-bezier(0.47, 0, 0.745, 0.715)',
  sineOut: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
  sineInOut: 'cubic-bezier(0.445, 0.05, 0.55, 0.95)',
} as const;

// Predefined animation presets
export const ANIMATION_PRESETS = {
  fadeIn: {
    keyframes: [
      { opacity: 0 },
      { opacity: 1 }
    ],
    options: { duration: 300, easing: EASING_FUNCTIONS.easeOut }
  },

  fadeOut: {
    keyframes: [
      { opacity: 1 },
      { opacity: 0 }
    ],
    options: { duration: 300, easing: EASING_FUNCTIONS.easeIn }
  },

  scaleIn: {
    keyframes: [
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    options: { duration: 250, easing: EASING_FUNCTIONS.back }
  },

  scaleOut: {
    keyframes: [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.8)' }
    ],
    options: { duration: 250, easing: EASING_FUNCTIONS.easeIn }
  },

  slideUp: {
    keyframes: [
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    options: { duration: 300, easing: EASING_FUNCTIONS.quadOut }
  },

  slideDown: {
    keyframes: [
      { opacity: 0, transform: 'translateY(-20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    options: { duration: 300, easing: EASING_FUNCTIONS.quadOut }
  },

  slideLeft: {
    keyframes: [
      { opacity: 0, transform: 'translateX(20px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    options: { duration: 300, easing: EASING_FUNCTIONS.quadOut }
  },

  slideRight: {
    keyframes: [
      { opacity: 0, transform: 'translateX(-20px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    options: { duration: 300, easing: EASING_FUNCTIONS.quadOut }
  },

  bounce: {
    keyframes: [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-10px) scale(1.1)' },
      { transform: 'translateY(0) scale(0.95)' },
      { transform: 'translateY(0) scale(1)' }
    ],
    options: { duration: 600, easing: EASING_FUNCTIONS.bounce }
  },

  pulse: {
    keyframes: [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0.7, transform: 'scale(1.05)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    options: { duration: 1000, easing: EASING_FUNCTIONS.easeInOut }
  },

  shake: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(0)' }
    ],
    options: { duration: 500, easing: EASING_FUNCTIONS.easeInOut }
  },

  glow: {
    keyframes: [
      { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
      { boxShadow: '0 0 20px 5px rgba(59, 130, 246, 0.4)' },
      { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' }
    ],
    options: { duration: 1500, easing: EASING_FUNCTIONS.easeInOut }
  },

  rotateIn: {
    keyframes: [
      { opacity: 0, transform: 'rotate(-180deg) scale(0.8)' },
      { opacity: 1, transform: 'rotate(0deg) scale(1)' }
    ],
    options: { duration: 500, easing: EASING_FUNCTIONS.back }
  },

  rotateOut: {
    keyframes: [
      { opacity: 1, transform: 'rotate(0deg) scale(1)' },
      { opacity: 0, transform: 'rotate(180deg) scale(0.8)' }
    ],
    options: { duration: 500, easing: EASING_FUNCTIONS.easeIn }
  }
} as const;

// Performance-optimized animation class
export class OptimizedAnimation {
  private element: HTMLElement;
  private animation: Animation | null = null;
  private startTime: number = 0;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private startMemory: number = 0;
  private metrics: PerformanceMetrics | null = null;

  constructor(element: HTMLElement) {
    this.element = element;

    // Ensure GPU acceleration
    this.element.style.willChange = 'transform, opacity';
    this.element.style.transform = 'translateZ(0)';
  }

  /**
   * Start animation with performance monitoring
   */
  animate(keyframes: AnimationKeyframe[], options: AnimationOptions): Promise<PerformanceMetrics> {
    return new Promise((resolve) => {
      // Stop any existing animation
      if (this.animation) {
        this.animation.cancel();
      }

      // Record start metrics
      this.startTime = performance.now();
      this.frameCount = 0;
      this.lastFrameTime = this.startTime;
      this.startMemory = this.getMemoryUsage();

      // Create Web Animation API animation
      this.animation = this.element.animate(keyframes, {
        duration: options.duration,
        easing: options.easing || 'ease-out',
        delay: options.delay || 0,
        iterations: options.iterations || 1,
        direction: options.direction || 'normal',
        fill: options.fill || 'both',
      });

      // Monitor performance during animation
      const monitorFrame = () => {
        this.frameCount++;
        const now = performance.now();

        // Calculate metrics
        const currentTime = now - this.startTime;
        const frameTime = now - this.lastFrameTime;
        const fps = 1000 / frameTime;

        // Update last frame time
        this.lastFrameTime = now;

        // Continue monitoring if animation is still running
        if (currentTime < options.duration + (options.delay || 0)) {
          requestAnimationFrame(monitorFrame);
        } else {
          // Finalize metrics
          this.metrics = {
            fps: Math.round(fps),
            frameTime: Math.round(frameTime),
            totalTime: Math.round(currentTime),
            memoryDelta: this.getMemoryUsage() - this.startMemory,
            startTime: this.startTime,
            endTime: now,
          };
          resolve(this.metrics);
        }
      };

      // Start monitoring
      requestAnimationFrame(monitorFrame);

      // Handle animation completion
      this.animation.addEventListener('finish', () => {
        this.cleanup();
      });

      this.animation.addEventListener('cancel', () => {
        this.cleanup();
      });
    });
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Clean up animation resources
   */
  private cleanup(): void {
    this.animation = null;

    // Remove GPU acceleration hints
    this.element.style.willChange = '';
    this.element.style.transform = '';
  }

  /**
   * Cancel current animation
   */
  cancel(): void {
    if (this.animation) {
      this.animation.cancel();
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * Check if animation is currently running
   */
  get isRunning(): boolean {
    return this.animation?.playState === 'running' || false;
  }
}

// Animation queue for managing multiple animations
export class AnimationQueue {
  private queue: Array<() => Promise<any>> = [];
  private isRunning = false;
  private maxConcurrent: number;

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add animation to queue
   */
  add(animationFn: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await animationFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  /**
   * Process animation queue
   */
  private async process(): Promise<void> {
    if (this.isRunning || this.queue.length === 0) return;

    this.isRunning = true;

    const batch = this.queue.splice(0, this.maxConcurrent);

    try {
      await Promise.all(batch.map(fn => fn()));
    } catch (error) {
      console.warn('Animation batch error:', error);
    }

    this.isRunning = false;

    // Process next batch if queue has items
    if (this.queue.length > 0) {
      requestAnimationFrame(() => this.process());
    }
  }

  /**
   * Clear all pending animations
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get queue length
   */
  get length(): number {
    return this.queue.length;
  }
}

// Utility functions for creating optimized animations
export const createOptimizedAnimation = (element: HTMLElement): OptimizedAnimation => {
  return new OptimizedAnimation(element);
};

export const runPresetAnimation = (
  element: HTMLElement,
  presetName: keyof typeof ANIMATION_PRESETS,
  customOptions?: Partial<AnimationOptions>
): Promise<PerformanceMetrics> => {
  const preset = ANIMATION_PRESETS[presetName];
  const options = { ...preset.options, ...customOptions };

  const animation = createOptimizedAnimation(element);
  return animation.animate(preset.keyframes, options);
};

// Debounced animation utility for rapid interactions
export const debounceAnimation = (
  animationFn: () => void,
  delay: number = 100
): (() => void) => {
  let timeoutId: NodeJS.Timeout;

  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(animationFn, delay);
  };
};

// Throttled animation utility for smooth performance
export const throttleAnimation = (
  animationFn: () => void,
  interval: number = 16 // ~60fps
): (() => void) => {
  let lastCall = 0;

  return () => {
    const now = performance.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      animationFn();
    }
  };
};

// Batch DOM updates for better performance
export class BatchedDOMUpdates {
  private updates: Array<() => void> = [];
  private scheduled = false;

  /**
   * Add DOM update to batch
   */
  add(update: () => void): void {
    this.updates.push(update);
    this.schedule();
  }

  /**
   * Schedule batch processing
   */
  private schedule(): void {
    if (this.scheduled) return;

    this.scheduled = true;
    requestAnimationFrame(() => {
      this.process();
      this.scheduled = false;
    });
  }

  /**
   * Process all batched updates
   */
  private process(): void {
    // Process updates in a single frame
    this.updates.forEach(update => update());
    this.updates = [];
  }

  /**
   * Clear pending updates
   */
  clear(): void {
    this.updates = [];
    this.scheduled = false;
  }
}

// Animation performance analyzer
export class AnimationPerformanceAnalyzer {
  private metrics: PerformanceMetrics[] = [];
  private maxSamples = 100;

  /**
   * Record animation performance metrics
   */
  record(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // Keep only recent samples
    if (this.metrics.length > this.maxSamples) {
      this.metrics = this.metrics.slice(-this.maxSamples);
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    averageFps: number;
    minFps: number;
    maxFps: number;
    averageFrameTime: number;
    totalAnimations: number;
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (this.metrics.length === 0) {
      return {
        averageFps: 0,
        minFps: 0,
        maxFps: 0,
        averageFrameTime: 0,
        totalAnimations: 0,
        memoryTrend: 'stable'
      };
    }

    const fpsValues = this.metrics.map(m => m.fps);
    const frameTimes = this.metrics.map(m => m.frameTime);
    const memoryValues = this.metrics.slice(-10).map(m => m.memoryDelta);

    const memoryTrend = this.calculateTrend(memoryValues);

    return {
      averageFps: Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length),
      minFps: Math.min(...fpsValues),
      maxFps: Math.max(...fpsValues),
      averageFrameTime: Math.round(frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length),
      totalAnimations: this.metrics.length,
      memoryTrend
    };
  }

  /**
   * Calculate trend from numeric values
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 3) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Check if performance is optimal
   */
  isOptimal(): boolean {
    const summary = this.getSummary();
    return summary.averageFps >= 55 && summary.averageFrameTime <= 18;
  }
}

// Global instances
export const animationQueue = new AnimationQueue();
export const batchedUpdates = new BatchedDOMUpdates();
export const performanceAnalyzer = new AnimationPerformanceAnalyzer();

// Export utility functions
export const waitForAnimationEnd = (element: HTMLElement): Promise<void> => {
  return new Promise(resolve => {
    const handleAnimationEnd = () => {
      element.removeEventListener('animationend', handleAnimationEnd);
      element.removeEventListener('transitionend', handleAnimationEnd);
      resolve();
    };

    element.addEventListener('animationend', handleAnimationEnd);
    element.addEventListener('transitionend', handleAnimationEnd);
  });
};

export const forceRepaint = (element: HTMLElement): void => {
  element.offsetHeight; // Force layout recalculation
};

export const setOptimizedStyles = (element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void => {
  batchedUpdates.add(() => {
    Object.assign(element.style, styles);
  });
};

export const resetOptimizedStyles = (element: HTMLElement): void => {
  batchedUpdates.add(() => {
    element.style.willChange = '';
    element.style.transform = '';
    element.style.transition = '';
    element.style.animation = '';
  });
};
