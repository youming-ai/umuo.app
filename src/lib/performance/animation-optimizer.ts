/**
 * Animation Performance Optimization Utilities
 *
 * This module provides comprehensive animation optimization for the audio player,
 * ensuring smooth performance while maintaining visual quality and accessibility.
 */

import { PlayerPerformanceMonitor } from './player-performance';

export interface AnimationConfig {
  enableGPUAcceleration: boolean;
  preferReducedMotion: boolean;
  maxFPS: number;
  frameBudget: number; // milliseconds per frame
  enableThrottling: boolean;
  throttleThreshold: number; // FPS
  enableScheduling: boolean;
  priorityLevels: AnimationPriority[];
}

export interface AnimationPriority {
  name: string;
  level: number; // 0 (highest) to 10 (lowest)
  budget: number; // milliseconds per frame
  enabled: boolean;
}

export interface AnimationFrame {
  id: string;
  priority: number;
  callback: FrameRequestCallback;
  timestamp: number;
  duration: number;
  completed: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // milliseconds
  droppedFrames: number;
  totalFrames: number;
  averageFrameTime: number;
  worstFrameTime: number;
  gpuAccelerationEnabled: boolean;
  memoryUsage: number; // MB
}

export interface AnimationScheduler {
  schedule: (callback: FrameRequestCallback, priority: number) => number;
  cancel: (id: number) => void;
  flush: () => void;
  getMetrics: () => PerformanceMetrics;
}

export type AnimationType = 'css' | 'webgl' | 'canvas' | 'svg' | 'dom';

export interface AnimationOptimization {
  type: AnimationType;
  targetFPS: number;
  enableGPU: boolean;
  useTransform: boolean;
  useWillChange: boolean;
  batchUpdates: boolean;
  Debouncing: boolean;
}

/**
 * Animation Performance Optimizer
 *
 * Optimizes animations for maximum performance while maintaining quality
 */
export class AnimationPerformanceOptimizer {
  private static instance: AnimationPerformanceOptimizer;
  private config: AnimationConfig;
  private performanceMonitor: PlayerPerformanceMonitor;
  private rafId: number | null = null;
  private activeAnimations: Map<number, AnimationFrame> = new Map();
  private animationQueue: AnimationFrame[] = [];
  private isThrottled: boolean = false;
  private currentFPS: number = 60;
  private lastFrameTime: number = 0;
  private frameMetrics: PerformanceMetrics;
  private scheduler: AnimationScheduler;
  private gpuAccelerationSupported: boolean = false;
  private reducedMotionPreferred: boolean = false;

  // Default configuration
  private readonly DEFAULT_CONFIG: AnimationConfig = {
    enableGPUAcceleration: true,
    preferReducedMotion: false,
    maxFPS: 60,
    frameBudget: 16.67, // 60 FPS budget
    enableThrottling: true,
    throttleThreshold: 30,
    enableScheduling: true,
    priorityLevels: [
      { name: 'critical', level: 0, budget: 8, enabled: true },
      { name: 'high', level: 2, budget: 4, enabled: true },
      { name: 'medium', level: 5, budget: 2, enabled: true },
      { name: 'low', level: 8, budget: 1, enabled: true }
    ]
  };

  static getInstance(): AnimationPerformanceOptimizer {
    if (!AnimationPerformanceOptimizer.instance) {
      AnimationPerformanceOptimizer.instance = new AnimationPerformanceOptimizer();
    }
    return AnimationPerformanceOptimizer.instance;
  }

  private constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
    this.performanceMonitor = PlayerPerformanceMonitor.getInstance();
    this.frameMetrics = this.initializeMetrics();
    this.scheduler = this.createScheduler();
    this.initializeCapabilities();
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize the animation optimizer
   */
  async initialize(): Promise<void> {
    // Detect reduced motion preference
    this.detectReducedMotionPreference();

    // Detect GPU acceleration support
    this.detectGPUAccelerationSupport();

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Apply initial optimizations
    this.applyInitialOptimizations();

    console.log('Animation performance optimizer initialized');
  }

  /**
   * Schedule an animation frame with priority
   */
  scheduleAnimation(
    callback: FrameRequestCallback,
    priority: number = 5,
    id?: string
  ): number {
    if (this.isThrottled && priority > this.config.throttleThreshold) {
      // Throttle low-priority animations
      return -1;
    }

    const animationId = id || `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const frame: AnimationFrame = {
      id: animationId,
      priority,
      callback,
      timestamp: performance.now(),
      duration: 0,
      completed: false
    };

    this.activeAnimations.set(performance.now(), frame);
    this.animationQueue.push(frame);

    // Sort queue by priority
    this.animationQueue.sort((a, b) => a.priority - b.priority);

    // Start animation loop if not already running
    if (!this.rafId) {
      this.startAnimationLoop();
    }

    return performance.now();
  }

  /**
   * Cancel an animation frame
   */
  cancelAnimation(id: number): boolean {
    const frame = Array.from(this.activeAnimations.values()).find(f =>
      f.timestamp === id
    );

    if (frame) {
      frame.completed = true;
      this.activeAnimations.delete(id);

      // Remove from queue
      const queueIndex = this.animationQueue.findIndex(f => f.id === frame.id);
      if (queueIndex !== -1) {
        this.animationQueue.splice(queueIndex, 1);
      }

      return true;
    }

    return false;
  }

  /**
   * Throttle animations based on performance
   */
  setThrottling(enabled: boolean, threshold?: number): void {
    this.isThrottled = enabled;
    if (threshold !== undefined) {
      this.config.throttleThreshold = threshold;
    }

    this.performanceMonitor.recordMetric(
      'animation_throttling_changed',
      enabled ? 1 : 0,
      'player_interactions',
      {
        enabled: enabled.toString(),
        threshold: (threshold || this.config.throttleThreshold).toString()
      }
    );
  }

  /**
   * Optimize animations for a specific component
   */
  optimizeComponent(
    element: HTMLElement,
    optimization: Partial<AnimationOptimization>
  ): void {
    if (!element) return;

    const finalOptimization: AnimationOptimization = {
      type: optimization.type || 'css',
      targetFPS: optimization.targetFPS || 60,
      enableGPU: optimization.enableGPU ?? this.config.enableGPUAcceleration,
      useTransform: optimization.useTransform ?? true,
      useWillChange: optimization.useWillChange ?? false,
      batchUpdates: optimization.batchUpdates ?? true,
      Debouncing: optimization.Debouncing ?? false,
      ...optimization
    };

    this.applyOptimizationsToElement(element, finalOptimization);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateFrameMetrics();
    return { ...this.frameMetrics };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.applyInitialOptimizations();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.activeAnimations.clear();
    this.animationQueue = [];

    console.log('Animation performance optimizer cleaned up');
  }

  // ==================== Private Methods ====================

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      frameTime: 16.67,
      droppedFrames: 0,
      totalFrames: 0,
      averageFrameTime: 16.67,
      worstFrameTime: 16.67,
      gpuAccelerationEnabled: false,
      memoryUsage: 0
    };
  }

  /**
   * Create animation scheduler
   */
  private createScheduler(): AnimationScheduler {
    return {
      schedule: (callback: FrameRequestCallback, priority: number) =>
        this.scheduleAnimation(callback, priority),
      cancel: (id: number) => this.cancelAnimation(id),
      flush: () => this.flushAnimations(),
      getMetrics: () => this.getMetrics()
    };
  }

  /**
   * Initialize browser capabilities
   */
  private initializeCapabilities(): void {
    this.detectGPUAccelerationSupport();
    this.detectReducedMotionPreference();
  }

  /**
   * Detect GPU acceleration support
   */
  private detectGPUAccelerationSupport(): void {
    if (typeof window === 'undefined') {
      this.gpuAccelerationSupported = false;
      return;
    }

    // Check for CSS 3D transforms support
    const testElement = document.createElement('div');
    testElement.style.transform = 'translateZ(0)';
    testElement.style.webkitTransform = 'translateZ(0)';

    this.gpuAccelerationSupported = !!testElement.style.transform || !!testElement.style.webkitTransform;

    this.frameMetrics.gpuAccelerationEnabled = this.gpuAccelerationSupported;
  }

  /**
   * Detect reduced motion preference
   */
  private detectReducedMotionPreference(): void {
    if (typeof window === 'undefined') {
      this.reducedMotionPreferred = false;
      return;
    }

    // Check CSS media query for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotionPreferred = mediaQuery.matches;

    // Listen for changes
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotionPreferred = e.matches;
      this.config.preferReducedMotion = e.matches;

      this.performanceMonitor.recordMetric(
        'reduced_motion_preference_changed',
        e.matches ? 1 : 0,
        'player_interactions'
      );
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor frame rate
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        this.currentFPS = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;

        // Record FPS metric
        this.performanceMonitor.recordMetric(
          'animation_fps',
          this.currentFPS,
          'visualizer_performance'
        );
      }

      if (this.rafId) {
        requestAnimationFrame(measureFPS);
      }
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor memory usage
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const checkMemory = () => {
        const memory = (window as any).performance.memory;
        this.frameMetrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024);

        // Record memory metric
        this.performanceMonitor.recordMetric(
          'animation_memory_usage',
          this.frameMetrics.memoryUsage,
          'memory_usage'
        );

        if (this.rafId) {
          setTimeout(checkMemory, 5000); // Check every 5 seconds
        }
      };

      checkMemory();
    }
  }

  /**
   * Apply initial optimizations
   */
  private applyInitialOptimizations(): void {
    if (typeof document === 'undefined') return;

    // Apply global CSS optimizations
    const style = document.createElement('style');
    style.id = 'animation-optimizations';
    style.textContent = this.generateOptimizationCSS();
    document.head.appendChild(style);
  }

  /**
   * Generate optimization CSS
   */
  private generateOptimizationCSS(): string {
    const enableGPU = this.config.enableGPUAcceleration && this.gpuAccelerationSupported;
    const reducedMotion = this.config.preferReducedMotion || this.reducedMotionPreferred;

    return `
      /* Animation Performance Optimizations */
      .animated-element {
        ${enableGPU ? 'transform: translateZ(0);' : ''}
        ${enableGPU ? 'will-change: transform, opacity;' : ''}
        ${reducedMotion ? 'animation: none !important;' : ''}
        ${reducedMotion ? 'transition: none !important;' : ''}
        backface-visibility: hidden;
        perspective: 1000px;
      }

      .gpu-accelerated {
        ${enableGPU ? 'transform: translateZ(0);' : ''}
        ${enableGPU ? 'will-change: transform;' : ''}
      }

      ${reducedMotion ? `
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      ` : ''}
    `;
  }

  /**
   * Start animation loop
   */
  private startAnimationLoop(): void {
    const animate = (timestamp: number) => {
      this.processAnimationFrame(timestamp);
      this.rafId = requestAnimationFrame(animate);
    };

    this.rafId = requestAnimationFrame(animate);
  }

  /**
   * Process a single animation frame
   */
  private processAnimationFrame(timestamp: number): void {
    const frameStartTime = performance.now();

    // Process animations in priority order
    const frameBudget = this.config.frameBudget;
    let remainingBudget = frameBudget;
    let processedAnimations = 0;

    for (const priorityLevel of this.config.priorityLevels) {
      if (!priorityLevel.enabled || remainingBudget <= 0) continue;

      const priorityAnimations = this.animationQueue.filter(
        anim => anim.priority === priorityLevel.level && !anim.completed
      );

      for (const animation of priorityAnimations) {
        const animStartTime = performance.now();

        try {
          animation.callback(timestamp);
          animation.completed = true;
          processedAnimations++;
        } catch (error) {
          console.error('Animation callback error:', error);
          animation.completed = true;
        }

        const animDuration = performance.now() - animStartTime;
        animation.duration = animDuration;
        remainingBudget -= animDuration;

        if (remainingBudget <= 0) break;
      }
    }

    // Remove completed animations
    this.animationQueue = this.animationQueue.filter(anim => !anim.completed);

    // Update frame metrics
    const frameDuration = performance.now() - frameStartTime;
    this.updateFrameMetrics(frameDuration, processedAnimations);

    // Stop if no more animations
    if (this.animationQueue.length === 0) {
      this.rafId = null;
    }
  }

  /**
   * Flush all animations
   */
  private flushAnimations(): void {
    for (const animation of this.animationQueue) {
      try {
        animation.callback(performance.now());
      } catch (error) {
        console.error('Animation flush error:', error);
      }
    }

    this.animationQueue = [];
    this.activeAnimations.clear();
  }

  /**
   * Update frame metrics
   */
  private updateFrameMetrics(frameDuration?: number, processedAnimations?: number): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime > 0) {
      // Calculate FPS
      const fps = 1000 / deltaTime;
      this.currentFPS = fps;

      // Update metrics
      if (frameDuration !== undefined) {
        this.frameMetrics.frameTime = frameDuration;
        this.frameMetrics.averageFrameTime =
          (this.frameMetrics.averageFrameTime + frameDuration) / 2;
        this.frameMetrics.worstFrameTime = Math.max(
          this.frameMetrics.worstFrameTime,
          frameDuration
        );
      }

      this.frameMetrics.fps = fps;
      this.frameMetrics.totalFrames++;

      // Count dropped frames (below 30 FPS)
      if (fps < 30) {
        this.frameMetrics.droppedFrames++;
      }
    }

    this.lastFrameTime = currentTime;

    // Record performance metrics
    this.performanceMonitor.recordMetric(
      'animation_frame_time',
      frameDuration || this.frameMetrics.frameTime,
      'visualizer_performance'
    );

    this.performanceMonitor.recordMetric(
      'animation_processed_count',
      processedAnimations || 0,
      'visualizer_performance'
    );
  }

  /**
   * Apply optimizations to an element
   */
  private applyOptimizationsToElement(
    element: HTMLElement,
    optimization: AnimationOptimization
  ): void {
    switch (optimization.type) {
      case 'css':
        this.applyCSOptimizations(element, optimization);
        break;
      case 'canvas':
        this.applyCanvasOptimizations(element, optimization);
        break;
      case 'webgl':
        this.applyWebGLOptimizations(element, optimization);
        break;
      case 'svg':
        this.applySVGOptimizations(element, optimization);
        break;
      case 'dom':
        this.applyDOMOptimizations(element, optimization);
        break;
    }
  }

  /**
   * Apply CSS optimizations
   */
  private applyCSOptimizations(
    element: HTMLElement,
    optimization: AnimationOptimization
  ): void {
    if (optimization.enableGPU && this.gpuAccelerationSupported) {
      element.style.transform = 'translateZ(0)';
      element.style.willChange = 'transform, opacity';
    }

    if (optimization.useTransform) {
      element.style.transformOrigin = '0 0';
    }

    if (this.config.preferReducedMotion || this.reducedMotionPreferred) {
      element.style.animation = 'none';
      element.style.transition = 'none';
    }
  }

  /**
   * Apply Canvas optimizations
   */
  private applyCanvasOptimizations(
    element: HTMLCanvasElement,
    optimization: AnimationOptimization
  ): void {
    if (optimization.enableGPU) {
      element.style.transform = 'translateZ(0)';
      element.style.willChange = 'transform';
    }

    // Set canvas optimization hints
    const ctx = element.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = optimization.targetFPS > 30;
    }
  }

  /**
   * Apply WebGL optimizations
   */
  private applyWebGLOptimizations(
    element: HTMLCanvasElement,
    optimization: AnimationOptimization
  ): void {
    const gl = element.getContext('webgl') || element.getContext('experimental-webgl');
    if (!gl) return;

    if (optimization.enableGPU) {
      // Enable WebGL optimizations
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
    }
  }

  /**
   * Apply SVG optimizations
   */
  private applySVGOptimizations(
    element: SVGElement,
    optimization: AnimationOptimization
  ): void {
    element.style.willChange = optimization.enableGPU ? 'transform' : 'auto';

    if (this.config.preferReducedMotion) {
      element.pauseAnimations();
    }
  }

  /**
   * Apply DOM optimizations
   */
  private applyDOMOptimizations(
    element: HTMLElement,
    optimization: AnimationOptimization
  ): void {
    if (optimization.batchUpdates) {
      // Mark for batch updates
      element.dataset.batchUpdate = 'true';
    }

    if (optimization.enableGPU) {
      element.style.transform = 'translateZ(0)';
      element.style.willChange = 'transform';
    }
  }
}

/**
 * Animation Frame Scheduler
 *
 * Provides advanced scheduling for animation frames with priority support
 */
export class AdvancedAnimationFrameScheduler {
  private static instance: AdvancedAnimationFrameScheduler;
  private queues: Map<number, FrameRequestCallback[]> = new Map();
  private rafId: number | null = null;
  private isRunning: boolean = false;
  private maxPriority: number = 10;

  static getInstance(): AdvancedAnimationFrameScheduler {
    if (!AdvancedAnimationFrameScheduler.instance) {
      AdvancedAnimationFrameScheduler.instance = new AdvancedAnimationFrameScheduler();
    }
    return AdvancedAnimationFrameScheduler.instance;
  }

  private constructor() {}

  /**
   * Schedule a callback with priority
   */
  schedule(callback: FrameRequestCallback, priority: number = 5): number {
    if (!this.queues.has(priority)) {
      this.queues.set(priority, []);
    }

    const queue = this.queues.get(priority)!;
    queue.push(callback);

    if (!this.isRunning) {
      this.start();
    }

    return callback.length; // Return a simple ID
  }

  /**
   * Cancel a scheduled callback
   */
  cancel(callback: FrameRequestCallback): void {
    for (const queue of this.queues.values()) {
      const index = queue.indexOf(callback);
      if (index !== -1) {
        queue.splice(index, 1);
        break;
      }
    }

    if (this.isEmpty()) {
      this.stop();
    }
  }

  /**
   * Start the scheduler
   */
  private start(): void {
    this.isRunning = true;
    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }

  /**
   * Stop the scheduler
   */
  private stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Animation frame tick
   */
  private tick(timestamp: number): void {
    // Process queues in priority order (0 = highest priority)
    for (let priority = 0; priority <= this.maxPriority; priority++) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        // Execute all callbacks at this priority
        const callbacks = queue.splice(0);
        for (const callback of callbacks) {
          try {
            callback(timestamp);
          } catch (error) {
            console.error('Animation callback error:', error);
          }
        }
      }
    }

    if (this.isEmpty()) {
      this.stop();
    } else if (this.isRunning) {
      this.rafId = requestAnimationFrame(this.tick.bind(this));
    }
  }

  /**
   * Check if all queues are empty
   */
  private isEmpty(): boolean {
    for (const queue of this.queues.values()) {
      if (queue.length > 0) return false;
    }
    return true;
  }
}

// Export singleton instances
export const animationOptimizer = AnimationPerformanceOptimizer.getInstance();
export const animationScheduler = AdvancedAnimationFrameScheduler.getInstance();
