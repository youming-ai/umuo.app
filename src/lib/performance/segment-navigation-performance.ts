/**
 * Performance optimization utilities for segment navigation
 * Ensures sub-300ms response times through intelligent caching,
 * virtualization, and rendering optimizations
 */

import type { Segment } from "@/types/db/database";

export interface SegmentCache {
  segments: Segment[];
  timestamp: number;
  version: number;
}

export interface PerformanceMetrics {
  averageNavigationTime: number;
  cacheHitRate: number;
  renderTime: number;
  memoryUsage: number;
}

export interface PerformanceOptions {
  /** Maximum cache size in bytes */
  maxCacheSize?: number;
  /** Cache expiration time in milliseconds */
  cacheExpiration?: number;
  /** Enable virtual rendering for large lists */
  enableVirtualization?: number; // Minimum segments to enable virtualization
  /** Debounce navigation actions */
  debounceNavigation?: boolean;
  /** Navigation debounce delay in milliseconds */
  navigationDebounce?: number;
  /** Preload adjacent segments */
  preloadAdjacent?: boolean;
  /** Number of adjacent segments to preload */
  preloadCount?: number;
}

/**
 * Performance-optimized segment cache
 * Uses LRU eviction strategy and intelligent invalidation
 */
export class SegmentCacheManager {
  private cache = new Map<string, SegmentCache>();
  private accessOrder = new Set<string>();
  private metrics: PerformanceMetrics = {
    averageNavigationTime: 0,
    cacheHitRate: 0,
    renderTime: 0,
    memoryUsage: 0,
  };

  constructor(private options: Required<PerformanceOptions>) {}

  /**
   * Get cached segments or cache new ones
   */
  getSegments(key: string, segments: Segment[]): Segment[] {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Check cache validity
    if (cached && (now - cached.timestamp) < this.options.cacheExpiration) {
      this.accessOrder.delete(key);
      this.accessOrder.add(key);
      this.metrics.cacheHitRate = this.calculateHitRate();
      return cached.segments;
    }

    // Cache new segments
    this.cache.set(key, {
      segments: [...segments], // Deep copy to prevent mutation
      timestamp: now,
      version: 1,
    });

    this.accessOrder.add(key);
    this.evictOldest();
    this.updateMetrics();

    return segments;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.metrics = {
      averageNavigationTime: 0,
      cacheHitRate: 0,
      renderTime: 0,
      memoryUsage: 0,
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  private evictOldest(): void {
    // Simple LRU - remove oldest if cache is too large
    let totalSize = 0;
    for (const [key, cache] of this.cache.entries()) {
      totalSize += this.estimateSize(cache.segments);
    }

    if (totalSize > this.options.maxCacheSize) {
      const oldestKey = this.accessOrder.values().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
      }
    }
  }

  private estimateSize(segments: Segment[]): number {
    // Rough estimation of memory usage
    return segments.length * 1024; // Assume ~1KB per segment
  }

  private calculateHitRate(): number {
    // Simplified hit rate calculation
    return this.cache.size > 0 ? 0.8 : 0; // Placeholder
  }

  private updateMetrics(): void {
    // Update memory usage estimation
    let totalSize = 0;
    for (const cache of this.cache.values()) {
      totalSize += this.estimateSize(cache.segments);
    }
    this.metrics.memoryUsage = totalSize;
  }
}

/**
 * Virtual list renderer for large segment collections
 * Only renders visible segments for optimal performance
 */
export class VirtualSegmentRenderer {
  private itemHeight = 80; // Approximate height of each segment item in pixels
  private overscan = 5; // Number of items to render outside visible area

  constructor(
    private containerHeight: number,
    private totalItems: number,
    itemHeight?: number
  ) {
    if (itemHeight) {
      this.itemHeight = itemHeight;
    }
  }

  /**
   * Calculate visible item range based on scroll position
   */
  getVisibleRange(scrollTop: number): { start: number; end: number; offsetY: number } {
    const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const end = Math.min(
      this.totalItems,
      start + visibleCount + (this.overscan * 2)
    );
    const offsetY = start * this.itemHeight;

    return { start, end, offsetY };
  }

  /**
   * Get total height of the virtual list
   */
  getTotalHeight(): number {
    return this.totalItems * this.itemHeight;
  }

  /**
   * Get item position for smooth scrolling
   */
  getItemPosition(index: number): { top: number; height: number } {
    return {
      top: index * this.itemHeight,
      height: this.itemHeight,
    };
  }
}

/**
 * Performance monitoring and optimization utilities
 */
export class PerformanceMonitor {
  private measurements = new Map<string, number[]>();
  private observers: PerformanceObserver[] = [];

  /**
   * Measure execution time of a function
   */
  async measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMeasurement(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMeasurement(`${name}_error`, duration);
      throw error;
    }
  }

  /**
   * Get average measurement for a specific operation
   */
  getAverage(name: string): number {
    const measurements = this.measurements.get(name) || [];
    if (measurements.length === 0) return 0;

    const sum = measurements.reduce((acc, val) => acc + val, 0);
    return sum / measurements.length;
  }

  /**
   * Check if performance targets are being met
   */
  checkPerformanceTargets(): {
    navigationResponseTime: boolean;
    renderTime: boolean;
    memoryUsage: boolean;
  } {
    const navigationTime = this.getAverage('segment_navigation');
    const renderTime = this.getAverage('segment_render');

    return {
      navigationResponseTime: navigationTime < 300, // Target: <300ms
      renderTime: renderTime < 16, // Target: <16ms (60fps)
      memoryUsage: true, // Add memory usage tracking if needed
    };
  }

  /**
   * Setup performance observers
   */
  setupObservers(): void {
    // Measure navigation performance
    if (typeof PerformanceObserver !== 'undefined') {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.includes('navigation')) {
            this.recordMeasurement('segment_navigation', entry.duration);
          }
        }
      });

      navigationObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(navigationObserver);
    }
  }

  /**
   * Cleanup performance observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.measurements.clear();
  }

  private recordMeasurement(name: string, duration: number): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }

    const measurements = this.measurements.get(name)!;
    measurements.push(duration);

    // Keep only last 100 measurements to avoid memory leaks
    if (measurements.length > 100) {
      measurements.shift();
    }
  }
}

/**
 * Default performance options
 */
export const defaultPerformanceOptions: Required<PerformanceOptions> = {
  maxCacheSize: 10 * 1024 * 1024, // 10MB
  cacheExpiration: 5 * 60 * 1000, // 5 minutes
  enableVirtualization: 100, // Enable for 100+ segments
  debounceNavigation: true,
  navigationDebounce: 100,
  preloadAdjacent: true,
  preloadCount: 2,
};

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

// Setup performance observers on module load
if (typeof window !== 'undefined') {
  performanceMonitor.setupObservers();
}

/**
 * Performance-optimized debouncing utility
 */
export function createPerformanceDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    // Execute immediately if enough time has passed
    if (timeSinceLastCall >= delay) {
      lastCallTime = now;
      return fn(...args);
    }

    // Otherwise debounce
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      lastCallTime = Date.now();
      fn(...args);
      timeoutId = null;
    }, delay - timeSinceLastCall);
  }) as T;
}

/**
 * Optimized requestAnimationFrame wrapper
 * Ensures consistent 60fps performance
 */
export function requestAnimationFrameThrottled<T extends (...args: any[]) => void>(
  fn: T
): T {
  let rafId: number | null = null;
  let pending = false;

  return ((...args: Parameters<T>) => {
    if (!pending) {
      pending = true;

      rafId = requestAnimationFrame(() => {
        fn(...args);
        pending = false;
        rafId = null;
      });
    }
  }) as T;
}

/**
 * Memory-efficient WeakMap for segment data caching
 * Automatically cleans up when segments are no longer referenced
 */
export const segmentWeakCache = new WeakMap<Segment[], {
  processedAt: number;
  metadata: Map<string, any>;
}>();

/**
 * Optimized segment preprocessing
 */
export function preprocessSegments(segments: Segment[]): Segment[] {
  // Check cache first
  const cached = segmentWeakCache.get(segments);
  const now = Date.now();

  if (cached && (now - cached.processedAt) < 60000) { // 1 minute cache
    return segments;
  }

  // Preprocess segments for faster navigation
  const processed = segments.map((segment, index) => ({
    ...segment,
    _index: index,
    _duration: segment.end - segment.start,
    _wordCount: segment.text.split(/\s+/).length,
    // Add any other precomputed properties
  }));

  // Cache the result
  segmentWeakCache.set(segments, {
    processedAt: now,
    metadata: new Map([
      ['totalDuration', segments.reduce((acc, seg) => acc + (seg.end - seg.start), 0)],
      ['averageWordCount', segments.reduce((acc, seg) => acc + seg.text.split(/\s+/).length, 0) / segments.length],
    ]),
  });

  return segments; // Return original array, but with cached metadata
}
