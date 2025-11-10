/**
 * Subtitle Synchronization System - Main Entry Point
 *
 * A comprehensive subtitle synchronization system with audio player controls,
 * precise timing, smooth scrolling, and mobile optimization.
 *
 * Features:
 * - <200ms response time for subtitle synchronization
 * - Word-level highlighting with precise timing
 * - Smooth scrolling animations with GPU acceleration
 * - Mobile-optimized touch interactions
 * - Accessibility compliance (WCAG 2.1)
 * - Multiple subtitle tracks support
 * - Performance monitoring and optimization
 */

// Main components
export { SubtitleSync } from './SubtitleSync';
export { SubtitleDisplay } from './SubtitleDisplay';
export { SubtitleHighlight } from './SubtitleHighlight';
export { SubtitleControls } from './SubtitleControls';

// Types and interfaces
export type {
  SubtitleSyncProps,
  SubtitleSyncConfig
} from './SubtitleSync';

export type {
  SubtitleDisplayProps
} from './SubtitleDisplay';

export type {
  SubtitleHighlightProps
} from './SubtitleHighlight';

export type {
  SubtitleControlsProps
} from './SubtitleControls';

// Hooks and utilities
export {
  useSubtitleSync,
  useMobileSubtitleOptimization,
  useSubtitleAccessibility
} from './hooks';

export {
  // Performance utilities
  SubtitlePerformanceMonitor,
  SubtitleCache,
  throttle,
  debounce,
  usePerformanceMonitor,
  useOptimizedScroll,
  type PerformanceMetrics,
  type PerformanceThresholds,
} from './performance';

// Mobile and accessibility utilities
export {
  TouchGestureRecognizer,
  MobileOptimizer,
  AccessibilityManager,
  mobileUtils,
  type TouchGesture,
  type TouchConfig,
} from './mobile';

// Default configurations
export const DEFAULT_SUBTITLE_CONFIG = {
  offset: 0,
  autoScroll: true,
  scrollBehavior: "smooth" as const,
  wordHighlighting: true,
  showControls: false,
  displayStyle: "full" as const,
  maxVisibleSubtitles: 5,
  mobileOptimized: true,
  highContrast: false,
  trackOffsets: {},
};

// Performance thresholds
export const DEFAULT_PERFORMANCE_THRESHOLDS = {
  maxProcessingTime: 200,
  minFps: 30,
  maxMemoryUsage: 100,
  maxActiveAnimations: 5,
};
