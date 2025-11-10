"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Segment, WordTimestamp } from "@/types/db/database";
import type { SubtitleSyncConfig } from "./SubtitleSync";
import {
  SubtitlePerformanceMonitor,
  usePerformanceMonitor,
  throttle,
  debounce,
  SubtitleCache,
  useOptimizedScroll,
} from "./performance";

/**
 * Enhanced subtitle synchronization hook
 * Provides optimized subtitle synchronization with performance monitoring
 */

export interface UseSubtitleSyncOptions {
  /** Configuration options */
  config?: Partial<SubtitleSyncConfig>;
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Performance thresholds */
  performanceThresholds?: {
    maxProcessingTime?: number;
    minFps?: number;
    maxMemoryUsage?: number;
  };
  /** Cache configuration */
  cacheConfig?: {
    maxSize?: number;
    ttl?: number;
  };
}

export interface UseSubtitleSyncReturn {
  /** Current active segment index */
  activeSegmentIndex: number;
  /** Current active word index */
  activeWordIndex: number;
  /** Active segments (support for overlapping) */
  activeSegments: Segment[];
  /** Processing state */
  isProcessing: boolean;
  /** Performance metrics */
  performanceMetrics?: any;
  /** Optimized seek handler */
  handleSeek: (time: number) => void;
  /** Optimized segment click handler */
  handleSegmentClick: (segment: Segment, index: number) => void;
  /** Optimized word click handler */
  handleWordClick: (segment: Segment, word: WordTimestamp, wordIndex: number) => void;
  /** Update configuration */
  updateConfig: (config: Partial<SubtitleSyncConfig>) => void;
  /** Clear cache */
  clearCache: () => void;
  /** Get cache statistics */
  getCacheStats: () => any;
}

/**
 * Cache key generator for subtitle segments
 */
function generateCacheKey(segments: Segment[]): string {
  const ids = segments.map(s => s.id).filter(Boolean).join('-');
  return `segments-${ids}-${segments.length}`;
}

/**
 * Optimized segment finder with caching
 */
function createOptimizedSegmentFinder(cache: SubtitleCache<Segment[]>) {
  return throttle((segments: Segment[], currentTime: number): number => {
    const cacheKey = `find-index-${currentTime.toFixed(3)}-${segments.length}`;

    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached.length > 0 ? segments.indexOf(cached[0]) : -1;
    }

    // Binary search for performance with large datasets
    let left = 0;
    let right = segments.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = segments[mid];

      if (currentTime >= segment.start && currentTime <= segment.end) {
        result = mid;
        // Continue searching left for earlier matches
        right = mid - 1;
      } else if (currentTime < segment.start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // Cache the result
    if (result >= 0) {
      cache.set(cacheKey, [segments[result]]);
    } else {
      cache.set(cacheKey, []);
    }

    return result;
  }, 50); // Throttle to maintain performance
}

/**
 * Optimized word finder within a segment
 */
function createOptimizedWordFinder() {
  return throttle((segment: Segment, currentTime: number): number => {
    if (!Array.isArray(segment.wordTimestamps) || segment.wordTimestamps.length === 0) {
      return -1;
    }

    const wordTimestamps = segment.wordTimestamps;

    // Binary search for word timing
    let left = 0;
    let right = wordTimestamps.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const word = wordTimestamps[mid];

      if (currentTime >= word.start && currentTime <= word.end) {
        result = mid;
        // Continue searching left for earlier matches
        right = mid - 1;
      } else if (currentTime < word.start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return result;
  }, 16); // 60fps = ~16ms per frame
}

/**
 * Main subtitle synchronization hook
 */
export function useSubtitleSync(
  segments: Segment[],
  currentTime: number,
  isPlaying: boolean,
  options: UseSubtitleSyncOptions = {}
): UseSubtitleSyncReturn {
  const {
    config: userConfig = {},
    enablePerformanceMonitoring = false,
    performanceThresholds = {},
    cacheConfig = {},
  } = options;

  // State management
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<SubtitleSyncConfig>(() => ({
    offset: 0,
    autoScroll: true,
    scrollBehavior: "smooth",
    wordHighlighting: true,
    showControls: false,
    displayStyle: "full",
    maxVisibleSubtitles: 5,
    mobileOptimized: true,
    highContrast: false,
    trackOffsets: {},
    ...userConfig,
  }));

  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor(performanceThresholds);

  // Cache initialization
  const cacheRef = useRef<SubtitleCache<any>>(new SubtitleCache(
    cacheConfig.maxSize,
    cacheConfig.ttl
  ));

  // Optimized finders with performance monitoring
  const findActiveSegmentIndex = useMemo(
    () => createOptimizedSegmentFinder(cacheRef.current),
    []
  );

  const findActiveWordIndex = useMemo(
    () => createOptimizedWordFinder(),
    []
  );

  // Adjust current time based on configuration
  const adjustedCurrentTime = useMemo(
    () => Math.max(0, currentTime - config.offset),
    [currentTime, config.offset]
  );

  // Calculate active indices with performance monitoring
  const [activeIndices, setActiveIndices] = useState({ segmentIndex: -1, wordIndex: -1 });

  // Optimized index calculation
  const calculateActiveIndices = useCallback(() => {
    if (!enablePerformanceMonitoring) {
      performanceMonitor.recordProcessingTime(performance.now());
    }

    const startTime = performance.now();
    setIsProcessing(true);

    try {
      const segmentIndex = findActiveSegmentIndex(segments, adjustedCurrentTime);
      const wordIndex = segmentIndex >= 0
        ? findActiveWordIndex(segments[segmentIndex], adjustedCurrentTime)
        : -1;

      setActiveIndices({ segmentIndex, wordIndex });
    } finally {
      setIsProcessing(false);

      if (enablePerformanceMonitoring) {
        performanceMonitor.recordProcessingTime(startTime);
      }
    }
  }, [segments, adjustedCurrentTime, findActiveSegmentIndex, findActiveWordIndex, enablePerformanceMonitoring, performanceMonitor]);

  // Throttled index updates
  const throttledUpdateIndices = useMemo(
    () => throttle(calculateActiveIndices, 50, { leading: true, trailing: true }),
    [calculateActiveIndices]
  );

  // Update indices when relevant values change
  useEffect(() => {
    throttledUpdateIndices();
  }, [throttledUpdateIndices]);

  // Calculate active segments (support for overlapping segments)
  const activeSegments = useMemo(() => {
    if (activeIndices.segmentIndex < 0) return [];

    // Find all segments that contain the current time
    return segments.filter((segment) => {
      const adjustedStart = segment.start - config.offset;
      const adjustedEnd = segment.end - config.offset;
      return adjustedCurrentTime >= adjustedStart && adjustedCurrentTime <= adjustedEnd;
    });
  }, [segments, activeIndices.segmentIndex, adjustedCurrentTime, config.offset]);

  // Optimized handlers
  const handleSeek = useCallback((time: number) => {
    // Invalidate cache for new time position
    cacheRef.current.clear();

    // Immediate update when not playing, delayed when playing
    if (isPlaying) {
      setTimeout(() => {
        throttledUpdateIndices();
      }, 50);
    } else {
      throttledUpdateIndices();
    }
  }, [isPlaying, throttledUpdateIndices]);

  const handleSegmentClick = useCallback((segment: Segment, index: number) => {
    // Seek to segment start
    handleSeek(segment.start + config.offset);
  }, [handleSeek, config.offset]);

  const handleWordClick = useCallback((
    segment: Segment,
    word: WordTimestamp,
    wordIndex: number
  ) => {
    // Seek to word start
    handleSeek(word.start + config.offset);
  }, [handleSeek, config.offset]);

  // Configuration update with cache invalidation
  const updateConfig = useCallback((newConfig: Partial<SubtitleSyncConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));

    // Clear cache when configuration changes
    if (newConfig.offset !== undefined || newConfig.trackOffsets) {
      cacheRef.current.clear();
    }
  }, []);

  // Cache management
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return cacheRef.current.getStats();
  }, []);

  // Memory optimization: clear cache on unmount
  useEffect(() => {
    return () => {
      cacheRef.current.clear();
    };
  }, []);

  // Performance optimization: limit cache size for large datasets
  useEffect(() => {
    if (segments.length > 1000) {
      // Reduce cache size for very large datasets
      cacheRef.current.clear();
    }
  }, [segments.length]);

  return {
    activeSegmentIndex: activeIndices.segmentIndex,
    activeWordIndex: activeIndices.wordIndex,
    activeSegments,
    isProcessing,
    performanceMetrics: enablePerformanceMonitoring ? performanceMonitor.getMetrics() : undefined,
    handleSeek,
    handleSegmentClick,
    handleWordClick,
    updateConfig,
    clearCache,
    getCacheStats,
  };
}

/**
 * Hook for managing subtitle display optimization
 */
export function useSubtitleDisplayOptimization(options: {
  enablePerformanceMode?: boolean;
  segmentCount?: number;
  mobileOptimized?: boolean;
} = {}) {
  const { enablePerformanceMode = false, segmentCount = 0, mobileOptimized = false } = options;

  // Adaptive configuration based on segment count and device capabilities
  const adaptiveConfig = useMemo(() => {
    const isHighPerformance = enablePerformanceMode || segmentCount > 500;
    const isMobile = mobileOptimized || window.innerWidth < 768;

    return {
      maxVisibleSubtitles: isHighPerformance ? 3 : isMobile ? 4 : 5,
      scrollBehavior: (isHighPerformance || isMobile) ? "auto" as const : "smooth" as const,
      wordHighlighting: !isHighPerformance,
      displayStyle: isHighPerformance ? "compact" as const : "full" as const,
    };
  }, [enablePerformanceMode, segmentCount, mobileOptimized]);

  // Visibility optimization for large datasets
  const visibleRange = useMemo(() => {
    if (segmentCount <= adaptiveConfig.maxVisibleSubtitles) {
      return { start: 0, end: segmentCount };
    }

    // For large datasets, we'll calculate this dynamically based on active segment
    return { start: 0, end: adaptiveConfig.maxVisibleSubtitles };
  }, [segmentCount, adaptiveConfig.maxVisibleSubtitles]);

  return {
    adaptiveConfig,
    visibleRange,
    shouldOptimize: enablePerformanceMode || segmentCount > 100,
  };
}

/**
 * Hook for accessibility optimization
 */
export function useSubtitleAccessibility() {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Detect user preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const accessibilityConfig = useMemo(() => ({
    highContrast,
    reducedMotion,
    announceChanges: true,
    keyboardNavigation: true,
  }), [highContrast, reducedMotion]);

  return {
    accessibilityConfig,
    setHighContrast,
    toggleHighContrast: () => setHighContrast(prev => !prev),
  };
}
