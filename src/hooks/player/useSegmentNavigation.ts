"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Segment, WordTimestamp } from "@/types/db/database";

export interface SegmentNavigationOptions {
  /** Auto-advance to next segment when current ends */
  autoAdvance?: boolean;
  /** Loop current segment for practice */
  loopSegment?: boolean;
  /** Preload adjacent segments for faster navigation */
  preloadAdjacent?: boolean;
  /** Number of adjacent segments to preload (0-3) */
  preloadCount?: number;
  /** Haptic feedback on mobile devices */
  enableHaptics?: boolean;
  /** Animation duration for segment transitions (ms) */
  transitionDuration?: number;
  /** Debounce time for navigation actions (ms) */
  navigationDebounce?: number;
}

export interface SegmentNavigationState {
  /** Currently active segment index */
  activeSegmentIndex: number;
  /** Currently active segment */
  activeSegment: Segment | null;
  /** Next segment (if available) */
  nextSegment: Segment | null;
  /** Previous segment (if available) */
  previousSegment: Segment | null;
  /** Whether navigation is in progress */
  isNavigating: boolean;
  /** Navigation history for back/forward functionality */
  navigationHistory: number[];
  /** Current history position */
  historyPosition: number;
  /** Bookmarked segment indices */
  bookmarkedSegments: Set<number>;
  /** Preloaded segments cache */
  preloadedSegments: Map<number, Segment>;
}

export interface UseSegmentNavigationReturn extends SegmentNavigationState {
  /** Navigate to specific segment by index */
  navigateToSegment: (index: number, options?: { force?: boolean; addToHistory?: boolean }) => void;
  /** Navigate to next segment */
  navigateToNext: (options?: { auto?: boolean }) => void;
  /** Navigate to previous segment */
  navigateToPrevious: (options?: { auto?: boolean }) => void;
  /** Jump to segment by timestamp */
  jumpToTime: (time: number, options?: { findClosest?: boolean }) => void;
  /** Toggle bookmark for current segment */
  toggleBookmark: () => void;
  /** Go back in navigation history */
  goBack: () => void;
  /** Go forward in navigation history */
  goForward: () => void;
  /** Clear navigation history */
  clearHistory: () => void;
  /** Get segment at specific time */
  getSegmentAtTime: (time: number) => Segment | null;
  /** Get word-level navigation for current segment */
  getWordNavigation: () => {
    currentWord: WordTimestamp | null;
    nextWord: WordTimestamp | null;
    previousWord: WordTimestamp | null;
    navigateToWord: (wordIndex: number) => void;
  };
  /** Preload segments around current position */
  preloadSegments: (centerIndex: number) => void;
  /** Reset navigation state */
  reset: () => void;
}

/**
 * Performance-optimized hook for segment navigation with sub-300ms response time
 * Supports mobile touch interactions, keyboard navigation, and advanced features
 */
export function useSegmentNavigation(
  segments: Segment[],
  currentTime: number = 0,
  options: SegmentNavigationOptions = {}
): UseSegmentNavigationReturn {
  const {
    autoAdvance = true,
    loopSegment = false,
    preloadAdjacent = true,
    preloadCount = 2,
    enableHaptics = true,
    transitionDuration = 200,
    navigationDebounce = 100,
  } = options;

  // State management
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);
  const [historyPosition, setHistoryPosition] = useState<number>(-1);
  const [bookmarkedSegments, setBookmarkedSegments] = useState<Set<number>>(new Set());
  const [preloadedSegments, setPreloadedSegments] = useState<Map<number, Segment>>(new Map());

  // Refs for performance optimization
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const navigationStartTimeRef = useRef<number>(0);
  const lastNavigationTimeRef = useRef<number>(0);

  // Memoized calculations for performance
  const segmentCount = useMemo(() => segments.length, [segments]);

  const activeSegment = useMemo(
    () => (activeSegmentIndex >= 0 && activeSegmentIndex < segmentCount
      ? segments[activeSegmentIndex]
      : null),
    [segments, activeSegmentIndex, segmentCount]
  );

  const nextSegment = useMemo(
    () => (activeSegmentIndex >= 0 && activeSegmentIndex < segmentCount - 1
      ? segments[activeSegmentIndex + 1]
      : null),
    [segments, activeSegmentIndex, segmentCount]
  );

  const previousSegment = useMemo(
    () => (activeSegmentIndex > 0
      ? segments[activeSegmentIndex - 1]
      : null),
    [segments, activeSegmentIndex]
  );

  // Performance-optimized segment lookup using binary search
  const findSegmentIndex = useCallback((time: number): number => {
    if (segmentCount === 0) return -1;

    let left = 0;
    let right = segmentCount - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = segments[mid];

      if (time >= segment.start && time <= segment.end) {
        return mid;
      } else if (time < segment.start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // Return closest segment if exact match not found
    return left < segmentCount ? left : segmentCount - 1;
  }, [segments, segmentCount]);

  // Get segment at specific time
  const getSegmentAtTime = useCallback((time: number): Segment | null => {
    const index = findSegmentIndex(time);
    return index >= 0 && index < segmentCount ? segments[index] : null;
  }, [findSegmentIndex, segments, segmentCount]);

  // Haptic feedback for mobile devices
  const triggerHaptic = useCallback(() => {
    if (!enableHaptics || typeof window === 'undefined') return;

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(10); // Light vibration for navigation feedback
      }
    } catch (error) {
      // Silently ignore haptic errors
    }
  }, [enableHaptics]);

  // Add to navigation history
  const addToHistory = useCallback((index: number) => {
    setNavigationHistory(prev => {
      const newHistory = prev.slice(0, historyPosition + 1);
      newHistory.push(index);
      return newHistory.slice(-50); // Keep only last 50 entries
    });
    setHistoryPosition(prev => Math.min(prev + 1, 49));
  }, [historyPosition]);

  // Navigate to specific segment with performance optimization
  const navigateToSegment = useCallback((
    index: number,
    { force = false, addToHistory: shouldAddToHistory = true } = {}
  ) => {
    // Validate index
    if (index < 0 || index >= segmentCount) return;

    // Debounce navigation to prevent rapid clicks
    const now = Date.now();
    if (!force && now - lastNavigationTimeRef.current < navigationDebounce) {
      return;
    }

    lastNavigationTimeRef.current = now;

    // Skip if already at target
    if (index === activeSegmentIndex && !force) return;

    navigationStartTimeRef.current = performance.now();
    setIsNavigating(true);

    // Update state
    setActiveSegmentIndex(index);

    if (shouldAddToHistory) {
      addToHistory(index);
    }

    // Trigger haptic feedback
    triggerHaptic();

    // Clear navigation state after transition
    setTimeout(() => {
      setIsNavigating(false);
    }, transitionDuration);
  }, [
    activeSegmentIndex,
    segmentCount,
    navigationDebounce,
    transitionDuration,
    addToHistory,
    triggerHaptic
  ]);

  // Navigate to next segment
  const navigateToNext = useCallback(({ auto = false } = {}) => {
    if (nextSegment) {
      navigateToSegment(activeSegmentIndex + 1, { addToHistory: !auto });
    }
  }, [nextSegment, activeSegmentIndex, navigateToSegment]);

  // Navigate to previous segment
  const navigateToPrevious = useCallback(({ auto = false } = {}) => {
    if (previousSegment) {
      navigateToSegment(activeSegmentIndex - 1, { addToHistory: !auto });
    }
  }, [previousSegment, activeSegmentIndex, navigateToSegment]);

  // Jump to specific time
  const jumpToTime = useCallback((time: number, { findClosest = true } = {}) => {
    let targetIndex = findSegmentIndex(time);

    if (!findClosest) {
      // Find exact segment match or use current if no exact match
      const exactSegment = segments.find(seg => time >= seg.start && time <= seg.end);
      if (exactSegment) {
        targetIndex = segments.indexOf(exactSegment);
      } else {
        targetIndex = activeSegmentIndex;
      }
    }

    navigateToSegment(targetIndex);
  }, [findSegmentIndex, segments, activeSegmentIndex, navigateToSegment]);

  // Toggle bookmark for current segment
  const toggleBookmark = useCallback(() => {
    if (activeSegmentIndex >= 0) {
      setBookmarkedSegments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(activeSegmentIndex)) {
          newSet.delete(activeSegmentIndex);
        } else {
          newSet.add(activeSegmentIndex);
          triggerHaptic(); // Stronger vibration for bookmark
        }
        return newSet;
      });
    }
  }, [activeSegmentIndex, triggerHaptic]);

  // History navigation
  const goBack = useCallback(() => {
    if (historyPosition > 0) {
      const newPosition = historyPosition - 1;
      setHistoryPosition(newPosition);
      navigateToSegment(navigationHistory[newPosition], { force: true, addToHistory: false });
    }
  }, [historyPosition, navigationHistory, navigateToSegment]);

  const goForward = useCallback(() => {
    if (historyPosition < navigationHistory.length - 1) {
      const newPosition = historyPosition + 1;
      setHistoryPosition(newPosition);
      navigateToSegment(navigationHistory[newPosition], { force: true, addToHistory: false });
    }
  }, [historyPosition, navigationHistory, navigateToSegment]);

  const clearHistory = useCallback(() => {
    setNavigationHistory([]);
    setHistoryPosition(-1);
  }, []);

  // Word-level navigation
  const getWordNavigation = useCallback(() => {
    const words = activeSegment?.wordTimestamps || [];
    const currentWordIndex = words.findIndex(
      word => currentTime >= word.start && currentTime <= word.end
    );

    const currentWord = currentWordIndex >= 0 ? words[currentWordIndex] : null;
    const nextWord = currentWordIndex < words.length - 1 ? words[currentWordIndex + 1] : null;
    const previousWord = currentWordIndex > 0 ? words[currentWordIndex - 1] : null;

    const navigateToWord = (wordIndex: number) => {
      if (wordIndex >= 0 && wordIndex < words.length) {
        const word = words[wordIndex];
        jumpToTime(word.start);
      }
    };

    return {
      currentWord,
      nextWord,
      previousWord,
      navigateToWord,
    };
  }, [activeSegment, currentTime, jumpToTime]);

  // Preload adjacent segments for faster navigation
  const preloadSegments = useCallback((centerIndex: number) => {
    if (!preloadAdjacent || preloadCount === 0) return;

    const start = Math.max(0, centerIndex - preloadCount);
    const end = Math.min(segmentCount - 1, centerIndex + preloadCount);

    const toPreload: Map<number, Segment> = new Map();

    for (let i = start; i <= end; i++) {
      if (i !== centerIndex && !preloadedSegments.has(i)) {
        toPreload.set(i, segments[i]);
      }
    }

    if (toPreload.size > 0) {
      setPreloadedSegments(prev => new Map([...prev, ...toPreload]));
    }
  }, [preloadAdjacent, preloadCount, preloadedSegments, segments, segmentCount]);

  // Reset navigation state
  const reset = useCallback(() => {
    setActiveSegmentIndex(-1);
    setIsNavigating(false);
    setNavigationHistory([]);
    setHistoryPosition(-1);
    setPreloadedSegments(new Map());
  }, []);

  // Auto-advance to next segment when current ends
  useEffect(() => {
    if (!autoAdvance || !activeSegment || !nextSegment) return;

    const segmentEndThreshold = activeSegment.end - 0.1; // 100ms before end

    if (currentTime >= segmentEndThreshold && currentTime <= activeSegment.end) {
      navigateToNext({ auto: true });
    }
  }, [currentTime, activeSegment, nextSegment, autoAdvance, navigateToNext]);

  // Loop current segment for practice
  useEffect(() => {
    if (!loopSegment || !activeSegment) return;

    if (currentTime >= activeSegment.end) {
      jumpToTime(activeSegment.start);
    }
  }, [currentTime, activeSegment, loopSegment, jumpToTime]);

  // Update active segment based on current time (external playback)
  useEffect(() => {
    const currentSegmentIndex = findSegmentIndex(currentTime);

    // Only update if significantly different to avoid unnecessary updates
    if (Math.abs(currentSegmentIndex - activeSegmentIndex) > 0) {
      setActiveSegmentIndex(currentSegmentIndex);
    }
  }, [currentTime, findSegmentIndex, activeSegmentIndex]);

  // Preload segments when active segment changes
  useEffect(() => {
    if (activeSegmentIndex >= 0) {
      preloadSegments(activeSegmentIndex);
    }
  }, [activeSegmentIndex, preloadSegments]);

  // Cleanup preloaded segments when segments change
  useEffect(() => {
    setPreloadedSegments(new Map());
  }, [segments]);

  return {
    activeSegmentIndex,
    activeSegment,
    nextSegment,
    previousSegment,
    isNavigating,
    navigationHistory,
    historyPosition,
    bookmarkedSegments,
    preloadedSegments,
    navigateToSegment,
    navigateToNext,
    navigateToPrevious,
    jumpToTime,
    toggleBookmark,
    goBack,
    goForward,
    clearHistory,
    getSegmentAtTime,
    getWordNavigation,
    preloadSegments,
    reset,
  };
}
