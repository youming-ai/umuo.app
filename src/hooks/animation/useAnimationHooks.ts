/**
 * Performance-optimized animation hooks for visual feedback system
 * Provides high-performance animations with 60fps target and GPU acceleration
 */

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { OptimizedAnimation, ANIMATION_PRESETS, AnimationQueue, PerformanceMetrics } from '@/lib/animation/animation-utils';

// Hook for managing individual animations
export const useOptimizedAnimation = (elementRef: React.RefObject<HTMLElement>) => {
  const animationRef = useRef<OptimizedAnimation | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  // Initialize animation when element is available
  useEffect(() => {
    if (elementRef.current && !animationRef.current) {
      animationRef.current = new OptimizedAnimation(elementRef.current);
    }
  }, [elementRef]);

  // Run preset animation
  const animate = useCallback(async (
    presetName: keyof typeof ANIMATION_PRESETS,
    customOptions?: {
      duration?: number;
      easing?: string;
      delay?: number;
      onComplete?: (metrics: PerformanceMetrics) => void;
    }
  ) => {
    if (!animationRef.current || !elementRef.current) return null;

    setIsAnimating(true);

    try {
      const preset = ANIMATION_PRESETS[presetName];
      const animationMetrics = await animationRef.current.animate(
        preset.keyframes,
        {
          ...preset.options,
          ...customOptions,
        }
      );

      setMetrics(animationMetrics);
      customOptions?.onComplete?.(animationMetrics);

      return animationMetrics;
    } finally {
      setIsAnimating(false);
    }
  }, [elementRef]);

  // Cancel current animation
  const cancel = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.cancel();
      setIsAnimating(false);
    }
  }, []);

  // Check if animation is running
  const isRunning = useMemo(() => {
    return animationRef.current?.isRunning || false;
  }, [animationRef.current]);

  return {
    animate,
    cancel,
    isAnimating,
    isRunning,
    metrics,
  };
};

// Hook for managing animation sequence
export const useAnimationSequence = () => {
  const sequenceRef = useRef<AnimationQueue>(new AnimationQueue(1)); // Sequential execution
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const totalStepsRef = useRef(0);

  // Run a sequence of animations
  const runSequence = useCallback(async (
    sequence: Array<{
      element: HTMLElement;
      presetName: keyof typeof ANIMATION_PRESETS;
      options?: {
        duration?: number;
        easing?: string;
        delay?: number;
      };
      onComplete?: () => void;
    }>
  ) => {
    totalStepsRef.current = sequence.length;
    setCurrentStep(0);
    setIsRunning(true);

    try {
      for (let i = 0; i < sequence.length; i++) {
        setCurrentStep(i + 1);

        const { element, presetName, options, onComplete } = sequence[i];
        const animation = new OptimizedAnimation(element);
        const preset = ANIMATION_PRESETS[presetName];

        await animation.animate(preset.keyframes, {
          ...preset.options,
          ...options,
        });

        onComplete?.();
      }
    } finally {
      setIsRunning(false);
      setCurrentStep(0);
    }
  }, []);

  // Run animations in parallel with controlled concurrency
  const runParallel = useCallback(async (
    animations: Array<{
      element: HTMLElement;
      presetName: keyof typeof ANIMATION_PRESETS;
      options?: {
        duration?: number;
        easing?: string;
        delay?: number;
      };
    }>,
    maxConcurrency = 3
  ) => {
    const queue = new AnimationQueue(maxConcurrency);
    setIsRunning(true);

    try {
      const promises = animations.map(({ element, presetName, options }) => {
        return queue.add(async () => {
          const animation = new OptimizedAnimation(element);
          const preset = ANIMATION_PRESETS[presetName];
          return animation.animate(preset.keyframes, {
            ...preset.options,
            ...options,
          });
        });
      });

      await Promise.all(promises);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    runSequence,
    runParallel,
    currentStep,
    totalSteps: totalStepsRef.current,
    isRunning,
    progress: totalStepsRef.current > 0 ? currentStep / totalStepsRef.current : 0,
  };
};

// Hook for responsive animation behavior
export const useResponsiveAnimation = (
  baseDuration: number,
  options: {
    reducedMotion?: boolean;
    highPerformance?: boolean;
    mobileMultiplier?: number;
    desktopMultiplier?: number;
  } = {}
) => {
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const {
    reducedMotion = false,
    highPerformance = true,
    mobileMultiplier = 0.8,
    desktopMultiplier = 1,
  } = options;

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Calculate responsive duration
  const duration = useMemo(() => {
    if (reducedMotion || prefersReducedMotion) {
      return 0; // No animation
    }

    const multiplier = isMobile ? mobileMultiplier : desktopMultiplier;
    return baseDuration * multiplier;
  }, [
    baseDuration,
    isMobile,
    reducedMotion,
    prefersReducedMotion,
    mobileMultiplier,
    desktopMultiplier,
  ]);

  // Calculate responsive easing
  const easing = useMemo(() => {
    if (!highPerformance) {
      return 'ease-out'; // Fallback for performance
    }
    return 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // Optimized cubic-bezier
  }, [highPerformance]);

  return {
    duration,
    easing,
    shouldAnimate: !reducedMotion && !prefersReducedMotion,
    isMobile,
    prefersReducedMotion,
  };
};

// Hook for scroll-triggered animations
export const useScrollAnimation = (
  elementRef: React.RefObject<HTMLElement>,
  options: {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
    presetName?: keyof typeof ANIMATION_PRESETS;
    customAnimation?: (element: HTMLElement) => Promise<void>;
  } = {}
) => {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
    presetName = 'fadeIn',
    customAnimation,
  } = options;

  const [hasTriggered, setHasTriggered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { animate } = useOptimizedAnimation(elementRef);

  // Set up intersection observer
  useEffect(() => {
    if (!elementRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsVisible(inView);

        if (inView && (!triggerOnce || !hasTriggered)) {
          setHasTriggered(true);

          if (customAnimation) {
            customAnimation(elementRef.current!);
          } else if (presetName) {
            animate(presetName);
          }
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(elementRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    elementRef,
    threshold,
    rootMargin,
    triggerOnce,
    hasTriggered,
    presetName,
    customAnimation,
    animate,
  ]);

  return {
    isVisible,
    hasTriggered,
    trigger: useCallback(() => {
      if (elementRef.current) {
        if (customAnimation) {
          customAnimation(elementRef.current);
        } else if (presetName) {
          animate(presetName);
        }
      }
    }, [elementRef, customAnimation, presetName, animate]),
  };
};

// Hook for gesture-based animations
export const useGestureAnimation = (
  elementRef: React.RefObject<HTMLElement>,
  options: {
    onSwipeLeft?: (element: HTMLElement) => void;
    onSwipeRight?: (element: HTMLElement) => void;
    onSwipeUp?: (element: HTMLElement) => void;
    onSwipeDown?: (element: HTMLElement) => void;
    onPinch?: (element: HTMLElement, scale: number) => void;
    onRotate?: (element: HTMLElement, rotation: number) => void;
    swipeThreshold?: number;
    pinchThreshold?: number;
    rotationThreshold?: number;
  } = {}
) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onRotate,
    swipeThreshold = 50,
    pinchThreshold = 10,
    rotationThreshold = 15,
  } = options;

  const gestureStateRef = useRef({
    startX: 0,
    startY: 0,
    lastDistance: 0,
    lastAngle: 0,
    isGesturing: false,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      gestureStateRef.current.startX = e.touches[0].clientX;
      gestureStateRef.current.startY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      gestureStateRef.current.lastDistance = Math.sqrt(dx * dx + dy * dy);
      gestureStateRef.current.lastAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    }
    gestureStateRef.current.isGesturing = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!elementRef.current || !gestureStateRef.current.isGesturing) return;

    if (e.touches.length === 1) {
      // Swipe gesture detection
      const deltaX = e.touches[0].clientX - gestureStateRef.current.startX;
      const deltaY = e.touches[0].clientY - gestureStateRef.current.startY;

      if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight(elementRef.current);
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft(elementRef.current);
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown(elementRef.current);
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp(elementRef.current);
          }
        }
        gestureStateRef.current.isGesturing = false;
      }
    } else if (e.touches.length === 2) {
      // Pinch/rotate gesture detection
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      const scaleDelta = distance - gestureStateRef.current.lastDistance;
      const rotationDelta = angle - gestureStateRef.current.lastAngle;

      if (Math.abs(scaleDelta) > pinchThreshold && onPinch) {
        onPinch(elementRef.current, distance / gestureStateRef.current.lastDistance);
        gestureStateRef.current.lastDistance = distance;
      }

      if (Math.abs(rotationDelta) > rotationThreshold && onRotate) {
        onRotate(elementRef.current, rotationDelta);
        gestureStateRef.current.lastAngle = angle;
      }
    }
  }, [elementRef, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinch, onRotate, swipeThreshold, pinchThreshold, rotationThreshold]);

  const handleTouchEnd = useCallback(() => {
    gestureStateRef.current.isGesturing = false;
  }, []);

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);
};

// Hook for performance monitoring
export const useAnimationPerformanceMonitor = () => {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const [fps, setFps] = useState(60);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [isOptimal, setIsOptimal] = useState(true);

  useEffect(() => {
    let animationId: number;

    const measurePerformance = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;

      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
        setIsOptimal(currentFps >= 55);

        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      // Measure memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        setMemoryUsage(usedMB);
      }

      animationId = requestAnimationFrame(measurePerformance);
    };

    animationId = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return {
    fps,
    memoryUsage,
    isOptimal,
    frameCount: frameCountRef.current,
  };
};

// Hook for managing animation state across components
export const useAnimationState = (initialState = {
  isAnimating: false,
  currentAnimation: null as string | null,
  progress: 0,
}) => {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);

  // Update ref when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const startAnimation = useCallback((animationName: string) => {
    setState({
      isAnimating: true,
      currentAnimation: animationName,
      progress: 0,
    });
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const endAnimation = useCallback(() => {
    setState({
      isAnimating: false,
      currentAnimation: null,
      progress: 100,
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, [initialState]);

  return {
    ...state,
    startAnimation,
    updateProgress,
    endAnimation,
    reset,
  };
};

// Hook for throttled animations
export const useThrottledAnimation = (
  animationFn: () => void,
  delay: number = 16 // ~60fps
) => {
  const lastCallRef = useRef(0);

  return useCallback(() => {
    const now = performance.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      animationFn();
    }
  }, [animationFn, delay]);
};

// Hook for debounced animations
export const useDebouncedAnimation = (
  animationFn: () => void,
  delay: number = 100
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      animationFn();
    }, delay);
  }, [animationFn, delay]);
};
