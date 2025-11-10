/**
 * Performance optimization utilities for audio player and general application performance
 */

import { performanceMonitor } from '@/lib/performance/performance-monitor';

/**
 * Performance utility functions for optimizing React components and hooks
 */
export class PerformanceUtils {
  /**
   * Debounce function to limit how often a function can be called
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate = false
  ): ((...args: Parameters<T>) => void) {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };

      const callNow = immediate && !timeout;

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func(...args);
    };
  }

  /**
   * Throttle function to limit the rate at which a function can be called
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Memoize function with optional LRU cache
   */
  static memoize<T extends (...args: any[]) => any>(
    func: T,
    options: {
      getKey?: (...args: Parameters<T>) => string;
      maxSize?: number;
    } = {}
  ): T {
    const { getKey, maxSize = 100 } = options;
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
      const key = getKey ? getKey(...args) : JSON.stringify(args);

      if (cache.has(key)) {
        // Move to end (LRU)
        const value = cache.get(key)!;
        cache.delete(key);
        cache.set(key, value);
        return value;
      }

      const result = func(...args);

      // Implement LRU if maxSize is set
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      cache.set(key, result);
      return result;
    }) as T;
  }

  /**
   * Create a performance-optimized event listener
   */
  static createOptimizedListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options: {
      passive?: boolean;
      throttleMs?: number;
      debounceMs?: number;
      once?: boolean;
    } = {}
  ): () => void {
    const {
      passive = true,
      throttleMs = 0,
      debounceMs = 0,
      once = false
    } = options;

    let optimizedHandler: EventListener = handler;

    if (debounceMs > 0) {
      optimizedHandler = this.debounce(handler, debounceMs);
    } else if (throttleMs > 0) {
      optimizedHandler = this.throttle(handler, throttleMs);
    }

    target.addEventListener(event, optimizedHandler, { passive, once });

    return () => {
      target.removeEventListener(event, optimizedHandler);
    };
  }

  /**
   * Measure execution time of a function
   */
  static async measureAsync<T>(
    name: string,
    func: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await func();
      const duration = performance.now() - startTime;

      performanceMonitor.recordMetric(
        `${name}-duration`,
        duration,
        'ui' as any,
        { unit: 'ms' }
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      performanceMonitor.recordMetric(
        `${name}-error-duration`,
        duration,
        'ui' as any,
        { unit: 'ms' }
      );

      throw error;
    }
  }

  /**
   * Measure execution time of a synchronous function
   */
  static measure<T>(name: string, func: () => T): T {
    const startTime = performance.now();

    try {
      const result = func();
      const duration = performance.now() - startTime;

      performanceMonitor.recordMetric(
        `${name}-duration`,
        duration,
        'ui' as any,
        { unit: 'ms' }
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      performanceMonitor.recordMetric(
        `${name}-error-duration`,
        duration,
        'ui' as any,
        { unit: 'ms' }
      );

      throw error;
    }
  }

  /**
   * Create a lazy-loaded value with performance tracking
   */
  static createLazy<T>(
    name: string,
    factory: () => T
  ): () => T {
    let cachedValue: T | null = null;
    let isLoaded = false;

    return () => {
      if (!isLoaded) {
        cachedValue = this.measure(name, factory);
        isLoaded = true;
      }

      return cachedValue!;
    };
  }

  /**
   * Batch multiple updates to reduce re-renders
   */
  static batchUpdates<T extends any[]>(
    updates: Array<() => T>,
    batchSize = 5,
    batchDelay = 16 // ~60fps
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let currentIndex = 0;

      const processBatch = () => {
        const batchEnd = Math.min(currentIndex + batchSize, updates.length);

        try {
          for (let i = currentIndex; i < batchEnd; i++) {
            results.push(updates[i]());
          }

          currentIndex = batchEnd;

          if (currentIndex < updates.length) {
            setTimeout(processBatch, batchDelay);
          } else {
            resolve(results);
          }
        } catch (error) {
          reject(error);
        }
      };

      processBatch();
    });
  }

  /**
   * Create a performance-aware useState hook
   */
  static createOptimizedState<T>(
    initialValue: T,
    options: {
      onUpdate?: (value: T, previousValue: T) => void;
      debounceMs?: number;
      equalityFn?: (a: T, b: T) => boolean;
    } = {}
  ): [() => T, (value: T | ((prev: T) => T)) => void] {
    const { onUpdate, debounceMs, equalityFn = Object.is } = options;
    let currentValue = initialValue;
    let previousValue = initialValue;

    const getValue = () => currentValue;

    const setValue = (newValue: T | ((prev: T) => T)) => {
      const resolvedValue = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(currentValue)
        : newValue;

      if (!equalityFn(resolvedValue, currentValue)) {
        previousValue = currentValue;
        currentValue = resolvedValue;

        if (onUpdate) {
          if (debounceMs) {
            setTimeout(() => onUpdate(currentValue, previousValue), debounceMs);
          } else {
            onUpdate(currentValue, previousValue);
          }
        }
      }
    };

    return [getValue, setValue];
  }

  /**
   * Create a queue for managing async operations with concurrency control
   */
  static createAsyncQueue<T>(
    concurrency = 3,
    options: {
      onTaskStart?: (task: () => Promise<T>) => void;
      onTaskComplete?: (result: T, task: () => Promise<T>) => void;
      onTaskError?: (error: Error, task: () => Promise<T>) => void;
    } = {}
  ) {
    const queue: Array<() => Promise<T>> = [];
    let running = 0;

    const processQueue = async () => {
      if (running >= concurrency || queue.length === 0) {
        return;
      }

      running++;
      const task = queue.shift()!;

      try {
        options.onTaskStart?.(task);
        const result = await task();
        options.onTaskComplete?.(result, task);
      } catch (error) {
        options.onTaskError?.(error as Error, task);
      } finally {
        running--;
        // Process next task
        setTimeout(processQueue, 0);
      }
    };

    return {
      add: (task: () => Promise<T>) => {
        queue.push(task);
        processQueue();
      },
      size: () => queue.length + running,
      clear: () => {
        queue.length = 0;
      }
    };
  }

  /**
   * Create a memory-efficient cache with automatic cleanup
   */
  static createMemoryCache<T>(
    options: {
      maxSize?: number;
      ttl?: number; // Time to live in milliseconds
      onEvict?: (key: string, value: T) => void;
    } = {}
  ) {
    const { maxSize = 100, ttl = 5 * 60 * 1000, onEvict } = options;
    const cache = new Map<string, { value: T; timestamp: number }>();

    const cleanup = () => {
      const now = Date.now();
      const toDelete: string[] = [];

      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > ttl) {
          toDelete.push(key);
        }
      }

      // Remove expired entries
      toDelete.forEach(key => {
        const entry = cache.get(key);
        if (entry) {
          onEvict?.(key, entry.value);
          cache.delete(key);
        }
      });

      // If still over max size, remove oldest entries
      if (cache.size > maxSize) {
        const entries = Array.from(cache.entries());
        const toRemove = entries.slice(0, cache.size - maxSize);

        toRemove.forEach(([key, entry]) => {
          onEvict?.(key, entry.value);
          cache.delete(key);
        });
      }
    };

    // Schedule periodic cleanup
    const cleanupInterval = setInterval(cleanup, Math.min(ttl / 2, 60000));

    return {
      get: (key: string): T | undefined => {
        cleanup(); // Check for expired entries

        const entry = cache.get(key);
        if (entry && Date.now() - entry.timestamp <= ttl) {
          return entry.value;
        }

        if (entry) {
          onEvict?.(key, entry.value);
          cache.delete(key);
        }

        return undefined;
      },

      set: (key: string, value: T) => {
        cleanup();

        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          const firstEntry = cache.get(firstKey);
          if (firstEntry) {
            onEvict?.(firstKey, firstEntry.value);
          }
          cache.delete(firstKey);
        }

        cache.set(key, { value, timestamp: Date.now() });
      },

      has: (key: string): boolean => {
        return this.get(key) !== undefined;
      },

      delete: (key: string) => {
        const entry = cache.get(key);
        if (entry) {
          onEvict?.(key, entry.value);
          cache.delete(key);
        }
      },

      clear: () => {
        for (const [key, entry] of cache.entries()) {
          onEvict?.(key, entry.value);
        }
        cache.clear();
      },

      size: () => cache.size,

      cleanup,

      destroy: () => {
        clearInterval(cleanupInterval);
        this.clear();
      }
    };
  }
}

/**
 * Performance monitoring utilities for React components
 */
export class ReactPerformanceUtils {
  /**
   * Create a performance-aware useCallback hook
   */
  static usePerformanceCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList,
    options: {
      name?: string;
      debounceMs?: number;
      throttleMs?: number;
    } = {}
  ): T {
    const { name = 'callback', debounceMs, throttleMs } = options;

    return React.useCallback((...args: Parameters<T>) => {
      return PerformanceUtils.measure(name, () => {
        let fn = callback;

        if (debounceMs) {
          fn = PerformanceUtils.debounce(callback, debounceMs) as T;
        } else if (throttleMs) {
          fn = PerformanceUtils.throttle(callback, throttleMs) as T;
        }

        return fn(...args);
      });
    }, deps) as T;
  }

  /**
   * Create a performance-aware useMemo hook
   */
  static usePerformanceMemo<T>(
    factory: () => T,
    deps: React.DependencyList,
    options: {
      name?: string;
    } = {}
  ): T {
    const { name = 'memo' } = options;

    return React.useMemo(() => {
      return PerformanceUtils.measure(name, factory);
    }, deps);
  }

  /**
   * Create a performance-aware useEffect hook
   */
  static usePerformanceEffect(
    effect: () => void | (() => void),
    deps: React.DependencyList,
    options: {
      name?: string;
      measureCleanup?: boolean;
    } = {}
  ) {
    const { name = 'effect', measureCleanup = false } = options;

    React.useEffect(() => {
      const cleanup = PerformanceUtils.measure(`${name}-setup`, effect);

      if (cleanup && typeof cleanup === 'function' && measureCleanup) {
        return PerformanceUtils.debounce(
          () => PerformanceUtils.measure(`${name}-cleanup`, cleanup),
          100
        );
      }

      return cleanup;
    }, deps);
  }
}

/**
 * Export convenience functions
 */
export const debounce = PerformanceUtils.debounce;
export const throttle = PerformanceUtils.throttle;
export const memoize = PerformanceUtils.memoize;
export const createOptimizedListener = PerformanceUtils.createOptimizedListener;
export const measure = PerformanceUtils.measure;
export const measureAsync = PerformanceUtils.measureAsync;
export const createLazy = PerformanceUtils.createLazy;
export const batchUpdates = PerformanceUtils.batchUpdates;
export const createAsyncQueue = PerformanceUtils.createAsyncQueue;
export const createMemoryCache = PerformanceUtils.createMemoryCache;
