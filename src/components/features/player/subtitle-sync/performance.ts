/**
 * Performance monitoring utilities for subtitle synchronization
 * Optimized for <200ms response time and smooth animations
 */

export interface PerformanceMetrics {
  /** Frame rate for subtitle animations */
  fps: number;
  /** Time taken to process subtitle updates */
  processingTime: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Number of active animations */
  activeAnimations: number;
  /** Scroll performance score */
  scrollPerformance: number;
  /** Overall performance score (0-100) */
  performanceScore: number;
}

export interface PerformanceThresholds {
  /** Maximum acceptable processing time in ms */
  maxProcessingTime: number;
  /** Minimum acceptable FPS */
  minFps: number;
  /** Maximum acceptable memory usage in MB */
  maxMemoryUsage: number;
  /** Maximum number of simultaneous animations */
  maxActiveAnimations: number;
}

/**
 * Default performance thresholds
 */
export const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  maxProcessingTime: 200,
  minFps: 30,
  maxMemoryUsage: 100,
  maxActiveAnimations: 5,
};

/**
 * Performance monitor class for tracking subtitle sync performance
 */
export class SubtitlePerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 60,
    processingTime: 0,
    memoryUsage: 0,
    activeAnimations: 0,
    scrollPerformance: 100,
    performanceScore: 100,
  };

  private thresholds: PerformanceThresholds;
  private frameTimestamps: number[] = [];
  private processingTimes: number[] = [];
  private animationCount = 0;
  private lastFrameTime = 0;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_PERFORMANCE_THRESHOLDS, ...thresholds };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.frameTimestamps = [];
    this.processingTimes = [];
    this.lastFrameTime = performance.now();

    // Start FPS monitoring
    this.monitorFrameRate();

    // Start periodic metric collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 1000);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Record a processing time measurement
   */
  recordProcessingTime(startTime: number): void {
    const processingTime = performance.now() - startTime;
    this.processingTimes.push(processingTime);

    // Keep only recent measurements
    if (this.processingTimes.length > 100) {
      this.processingTimes = this.processingTimes.slice(-50);
    }
  }

  /**
   * Increment active animation count
   */
  incrementActiveAnimations(): void {
    this.animationCount++;
  }

  /**
   * Decrement active animation count
   */
  decrementActiveAnimations(): void {
    this.animationCount = Math.max(0, this.animationCount - 1);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if performance is within acceptable thresholds
   */
  isPerformant(): boolean {
    return (
      this.metrics.processingTime <= this.thresholds.maxProcessingTime &&
      this.metrics.fps >= this.thresholds.minFps &&
      this.metrics.memoryUsage <= this.thresholds.maxMemoryUsage &&
      this.metrics.activeAnimations <= this.thresholds.maxActiveAnimations
    );
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.processingTime > this.thresholds.maxProcessingTime) {
      recommendations.push("Consider reducing subtitle complexity or enabling mobile optimization");
    }

    if (this.metrics.fps < this.thresholds.minFps) {
      recommendations.push("Reduce animation frequency or simplify visual effects");
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      recommendations.push("Clear subtitle cache or reduce max visible subtitles");
    }

    if (this.metrics.activeAnimations > this.thresholds.maxActiveAnimations) {
      recommendations.push("Limit simultaneous subtitle animations");
    }

    if (recommendations.length === 0) {
      recommendations.push("Performance is optimal");
    }

    return recommendations;
  }

  /**
   * Monitor frame rate
   */
  private monitorFrameRate(): void {
    const frame = () => {
      if (!this.isMonitoring) return;

      const now = performance.now();
      this.frameTimestamps.push(now);

      // Keep only recent frames
      if (this.frameTimestamps.length > 60) {
        this.frameTimestamps = this.frameTimestamps.slice(-30);
      }

      // Calculate FPS
      if (this.frameTimestamps.length >= 2) {
        const duration = now - this.frameTimestamps[0];
        this.metrics.fps = Math.round((this.frameTimestamps.length - 1) / (duration / 1000));
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }

  /**
   * Collect comprehensive performance metrics
   */
  private collectMetrics(): void {
    // Calculate average processing time
    if (this.processingTimes.length > 0) {
      const avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      this.metrics.processingTime = Math.round(avgProcessingTime);
    }

    // Get memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    }

    // Update active animations
    this.metrics.activeAnimations = this.animationCount;

    // Calculate scroll performance (simplified)
    this.metrics.scrollPerformance = Math.max(0, 100 - (this.metrics.processingTime / this.thresholds.maxProcessingTime) * 100);

    // Calculate overall performance score
    this.metrics.performanceScore = this.calculatePerformanceScore();
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private calculatePerformanceScore(): number {
    const processingScore = Math.max(0, 100 - (this.metrics.processingTime / this.thresholds.maxProcessingTime) * 100);
    const fpsScore = Math.min(100, (this.metrics.fps / this.thresholds.minFps) * 100);
    const memoryScore = Math.max(0, 100 - (this.metrics.memoryUsage / this.thresholds.maxMemoryUsage) * 100);
    const animationScore = Math.max(0, 100 - (this.metrics.activeAnimations / this.thresholds.maxActiveAnimations) * 50);

    return Math.round((processingScore + fpsScore + memoryScore + animationScore) / 4);
  }
}

/**
 * Performance-optimized throttling function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  const { leading = true, trailing = true } = options;

  return ((...args: Parameters<T>) => {
    const now = performance.now();
    const timeSinceLastCall = now - lastCallTime;

    // Leading edge
    if (leading && timeSinceLastCall >= delay) {
      func(...args);
      lastCallTime = now;
      return;
    }

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Trailing edge
    if (trailing) {
      timeoutId = setTimeout(() => {
        func(...args);
        lastCallTime = performance.now();
      }, delay - timeSinceLastCall);
    }
  }) as T;
}

/**
 * Performance-optimized debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  const { leading = false, trailing = true } = options;

  return ((...args: Parameters<T>) => {
    const now = performance.now();

    // Leading edge
    if (leading && now - lastCallTime >= delay) {
      func(...args);
      lastCallTime = now;
      return;
    }

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Trailing edge
    if (trailing) {
      timeoutId = setTimeout(() => {
        func(...args);
        lastCallTime = performance.now();
      }, delay);
    }
  }) as T;
}

/**
 * Performance monitoring hook for React components
 */
export function usePerformanceMonitor(
  thresholds: Partial<PerformanceThresholds> = {}
) {
  const monitorRef = React.useRef<SubtitlePerformanceMonitor | null>(null);

  React.useEffect(() => {
    monitorRef.current = new SubtitlePerformanceMonitor(thresholds);
    monitorRef.current.startMonitoring();

    return () => {
      monitorRef.current?.stopMonitoring();
    };
  }, [thresholds]);

  return {
    getMetrics: () => monitorRef.current?.getMetrics(),
    isPerformant: () => monitorRef.current?.isPerformant() ?? true,
    getRecommendations: () => monitorRef.current?.getRecommendations() ?? [],
    recordProcessingTime: (startTime: number) => monitorRef.current?.recordProcessingTime(startTime),
    incrementActiveAnimations: () => monitorRef.current?.incrementActiveAnimations(),
    decrementActiveAnimations: () => monitorRef.current?.decrementActiveAnimations(),
  };
}

/**
 * Performance-optimized scroll handler
 */
export function useOptimizedScroll(
  callback: (event: Event) => void,
  options: {
    throttle?: number;
    leading?: boolean;
    trailing?: boolean;
  } = {}
) {
  const { throttle: throttleMs = 16, leading = true, trailing = false } = options;

  const throttledCallback = React.useCallback(
    throttle(callback, throttleMs, { leading, trailing }),
    [callback, throttleMs, leading, trailing]
  );

  React.useEffect(() => {
    const element = document.documentElement;
    element.addEventListener('scroll', throttledCallback, { passive: true });

    return () => {
      element.removeEventListener('scroll', throttledCallback);
    };
  }, [throttledCallback]);
}

/**
 * Memory-optimized cache for subtitle data
 */
export class SubtitleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; accessCount: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Get item from cache
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);

    if (!item) return undefined;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access count
    item.accessCount++;
    return item.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T): void {
    // Check if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number; memoryUsage: number } {
    const totalAccess = Array.from(this.cache.values()).reduce((sum, item) => sum + item.accessCount, 0);
    const hitRate = totalAccess > 0 ? (totalAccess - this.cache.size) / totalAccess : 0;

    // Rough memory usage estimate
    const memoryUsage = this.cache.size * 1024; // 1KB per item estimate

    return {
      size: this.cache.size,
      hitRate,
      memoryUsage,
    };
  }

  /**
   * Evict least used items from cache
   */
  private evictLeastUsed(): void {
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount);

    const evictCount = Math.ceil(this.maxSize * 0.2); // Evict 20%
    for (let i = 0; i < evictCount && i < items.length; i++) {
      this.cache.delete(items[i][0]);
    }
  }
}
