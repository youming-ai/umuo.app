"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { throttle, debounce } from "./performance";
import type { Segment, WordTimestamp } from "@/types/db/database";
import type { SubtitleSyncConfig } from "./SubtitleSync";

/**
 * Custom hook for subtitle synchronization
 * Optimized for <200ms response time and mobile performance
 */
export function useSubtitleSync(
  segments: Segment[],
  currentTime: number,
  isPlaying: boolean,
  config: SubtitleSyncConfig,
  options: {
    enablePerformanceMonitoring?: boolean;
    mobileOptimized?: boolean;
    touchMode?: boolean;
  } = {}
) {
  const {
    enablePerformanceMonitoring = false,
    mobileOptimized = true,
    touchMode = false,
  } = options;

  // Refs for performance optimization
  const stateRef = useRef({
    activeSegmentIndex: -1,
    activeWordIndex: -1,
    lastUpdateTime: 0,
    scrollTarget: null as HTMLElement | null,
  });

  // State management
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollVelocity, setScrollVelocity] = useState(0);

  // Performance monitoring
  const performanceRef = useRef<{
    frameCount: number;
    lastFrameTime: number;
    processingTimes: number[];
  }>({
    frameCount: 0,
    lastFrameTime: 0,
    processingTimes: [],
  });

  // Memoized segments with timing validation
  const processedSegments = useMemo(() => {
    const startTime = performance.now();

    const processed = segments
      .filter(segment =>
        segment.start >= 0 &&
        segment.end > segment.start &&
        segment.text?.trim().length > 0
      )
      .map(segment => ({
        ...segment,
        wordTimestamps: segment.wordTimestamps?.filter(word =>
          word.start >= segment.start &&
          word.end <= segment.end &&
          word.word.trim().length > 0
        ) || [],
      }));

    if (enablePerformanceMonitoring) {
      const processingTime = performance.now() - startTime;
      performanceRef.current.processingTimes.push(processingTime);

      // Keep only recent measurements
      if (performanceRef.current.processingTimes.length > 100) {
        performanceRef.current.processingTimes = performanceRef.current.processingTimes.slice(-50);
      }
    }

    return processed;
  }, [segments, enablePerformanceMonitoring]);

  // Find active segment with performance optimization
  const findActiveSegment = useCallback((time: number) => {
    // Binary search for better performance with large segment arrays
    let left = 0;
    let right = processedSegments.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = processedSegments[mid];

      if (time >= segment.start && time <= segment.end) {
        result = mid;
        break;
      } else if (time < segment.start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return result;
  }, [processedSegments]);

  // Find active word within segment
  const findActiveWord = useCallback((segmentIndex: number, time: number) => {
    if (segmentIndex < 0 || segmentIndex >= processedSegments.length) {
      return -1;
    }

    const segment = processedSegments[segmentIndex];
    if (!segment.wordTimestamps?.length) {
      return -1;
    }

    // Linear search within segment (typically small number of words)
    for (let i = 0; i < segment.wordTimestamps.length; i++) {
      const word = segment.wordTimestamps[i];
      if (time >= word.start && time <= word.end) {
        return i;
      }
    }

    return -1;
  }, [processedSegments]);

  // Throttled update function for performance
  const updateActiveStates = useCallback(
    throttle((time: number) => {
      const startTime = performance.now();

      const segmentIndex = findActiveSegment(time);
      const wordIndex = findActiveWord(segmentIndex, time);

      // Update state if changed
      if (segmentIndex !== stateRef.current.activeSegmentIndex ||
          wordIndex !== stateRef.current.activeWordIndex) {
        stateRef.current.activeSegmentIndex = segmentIndex;
        stateRef.current.activeWordIndex = wordIndex;
        stateRef.current.lastUpdateTime = Date.now();

        setActiveSegmentIndex(segmentIndex);
        setActiveWordIndex(wordIndex);
      }

      if (enablePerformanceMonitoring) {
        const processingTime = performance.now() - startTime;
        performanceRef.current.processingTimes.push(processingTime);
      }
    }, mobileOptimized ? 100 : 50, { leading: true, trailing: true }),
    [findActiveSegment, findActiveWord, mobileOptimized, enablePerformanceMonitoring]
  );

  // Scroll to active segment with performance optimization
  const scrollToActiveSegment = useCallback(
    debounce((segmentIndex: number) => {
      if (!config.autoScroll || segmentIndex < 0) return;

      const element = document.getElementById(`subtitle-segment-${segmentIndex}`);
      if (!element) return;

      setIsScrolling(true);

      // Use scrollIntoView for better performance
      element.scrollIntoView({
        behavior: isPlaying ? "smooth" : "auto",
        block: "center",
        inline: "nearest",
      });

      // Reset scrolling state after animation
      if (isPlaying) {
        setTimeout(() => setIsScrolling(false), 500);
      } else {
        setIsScrolling(false);
      }
    }, isPlaying ? 150 : 50, { leading: false, trailing: true }),
    [config.autoScroll, isPlaying]
  );

  // Handle time updates
  useEffect(() => {
    updateActiveStates(currentTime);
  }, [currentTime, updateActiveStates]);

  // Handle scrolling to active segment
  useEffect(() => {
    if (config.autoScroll && activeSegmentIndex >= 0) {
      scrollToActiveSegment(activeSegmentIndex);
    }
  }, [activeSegmentIndex, config.autoScroll, scrollToActiveSegment]);

  // Handle scroll velocity calculation for touch devices
  useEffect(() => {
    if (!touchMode) return;

    let lastScrollY = 0;
    let scrollVelocity = 0;
    let animationFrame: number;

    const calculateVelocity = () => {
      const currentScrollY = window.scrollY;
      scrollVelocity = Math.abs(currentScrollY - lastScrollY);
      lastScrollY = currentScrollY;

      setScrollVelocity(scrollVelocity);
      animationFrame = requestAnimationFrame(calculateVelocity);
    };

    calculateVelocity();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [touchMode]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const processingTimes = performanceRef.current.processingTimes;

    if (processingTimes.length === 0) {
      return {
        averageProcessingTime: 0,
        maxProcessingTime: 0,
        frameRate: 60,
        isOptimal: true,
      };
    }

    const averageProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    const maxProcessingTime = Math.max(...processingTimes);
    const isOptimal = averageProcessingTime < 200 && maxProcessingTime < 500;

    return {
      averageProcessingTime: Math.round(averageProcessingTime),
      maxProcessingTime: Math.round(maxProcessingTime),
      frameRate: 60, // Simplified - real implementation would track FPS
      isOptimal,
    };
  }, []);

  // Handle segment click for seeking
  const handleSegmentClick = useCallback((segment: Segment, index: number) => {
    const adjustedTime = segment.start + config.offset;
    return {
      time: adjustedTime,
      segment,
      index,
    };
  }, [config.offset]);

  // Handle word click for precise seeking
  const handleWordClick = useCallback((segment: Segment, word: WordTimestamp, wordIndex: number) => {
    const adjustedTime = word.start + config.offset;
    return {
      time: adjustedTime,
      segment,
      word,
      wordIndex,
    };
  }, [config.offset]);

  // Export configuration
  const exportConfig = useCallback(() => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  // Import configuration
  const importConfig = useCallback((configString: string) => {
    try {
      const imported = JSON.parse(configString);
      return imported as Partial<SubtitleSyncConfig>;
    } catch (error) {
      console.error("Failed to import subtitle config:", error);
      return null;
    }
  }, []);

  return {
    // State
    activeSegmentIndex,
    activeWordIndex,
    isScrolling,
    scrollVelocity,

    // Processed data
    processedSegments,

    // Actions
    handleSegmentClick,
    handleWordClick,

    // Configuration
    exportConfig,
    importConfig,

    // Performance
    getPerformanceMetrics,

    // Utilities
    scrollToSegment: scrollToActiveSegment,
  };
}

/**
 * Hook for mobile-optimized subtitle display
 */
export function useMobileSubtitleOptimization(
  touchMode: boolean,
  segments: Segment[]
) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);

  // Detect low-end device
  useEffect(() => {
    const checkDevice = () => {
      const memory = (performance as any).memory;
      const connection = (navigator as any).connection;

      let lowEnd = false;

      // Check memory
      if (memory && memory.deviceMemory < 4) {
        lowEnd = true;
      }

      // Check connection
      if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
        lowEnd = true;
      }

      // Check hardware concurrency
      if (navigator.hardwareConcurrency < 4) {
        lowEnd = true;
      }

      setIsLowEndDevice(lowEnd);
    };

    checkDevice();
  }, []);

  // Monitor viewport height
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);

    return () => window.removeEventListener('resize', updateViewportHeight);
  }, []);

  // Calculate optimal subtitle settings for mobile
  const mobileSettings = useMemo(() => {
    if (!touchMode) return null;

    return {
      maxVisibleSubtitles: isLowEndDevice ? 3 : 5,
      displayStyle: isLowEndDevice ? "compact" as const : "full" as const,
      wordHighlighting: !isLowEndDevice,
      autoScroll: true,
      scrollBehavior: "smooth" as const,
      fontSize: Math.max(12, Math.min(16, viewportHeight / 40)),
      lineHeight: 1.4,
      letterSpacing: 0.02,
    };
  }, [touchMode, isLowEndDevice, viewportHeight]);

  return {
    mobileSettings,
    isLowEndDevice,
    viewportHeight,
  };
}

/**
 * Hook for accessibility features
 */
export function useSubtitleAccessibility() {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect user preferences
  useEffect(() => {
    const checkPreferences = () => {
      // High contrast
      if (window.matchMedia('(prefers-contrast: high)').matches) {
        setHighContrast(true);
      }

      // Reduced motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setReducedMotion(true);
      }

      // Font size preference
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      if (rootFontSize > 16) {
        setFontSize(rootFontSize);
      }
    };

    checkPreferences();

    // Listen for preference changes
    const mediaQueries = [
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
    ];

    const handlers = mediaQueries.map(mq => () => checkPreferences());
    mediaQueries.forEach((mq, index) => mq.addListener(handlers[index]));

    return () => {
      mediaQueries.forEach((mq, index) => mq.removeListener(handlers[index]));
    };
  }, []);

  // Accessibility settings
  const accessibilitySettings = useMemo(() => ({
    highContrast,
    fontSize,
    reducedMotion,
    announcements: {
      enabled: true,
      rate: 1.0,
      volume: 0.8,
    },
  }), [highContrast, fontSize, reducedMotion]);

  return {
    accessibilitySettings,
    setHighContrast,
    setFontSize,
    setReducedMotion,
  };
}
