/**
 * Segment Navigation Components
 *
 * Fast (<300ms) audio segment navigation system with mobile optimization
 * and accessibility features for enhanced language learning.
 */

// Main components
export { default as SegmentNavigation } from "./SegmentNavigation";
export { default as SegmentList } from "./SegmentList";
export { default as SegmentItem } from "./SegmentItem";
export { default as SegmentControls } from "./SegmentControls";

// Mobile optimization utilities
export {
  useMobileOptimization,
  MobileSegmentWrapper
} from "./mobile-optimization";
export type {
  TouchGesture,
  MobileOptimizationOptions,
  UseMobileOptimizationReturn
} from "./mobile-optimization";

// Re-export hook for external use
export { useSegmentNavigation } from "@/hooks/player/useSegmentNavigation";
export type {
  SegmentNavigationOptions,
  SegmentNavigationState,
  UseSegmentNavigationReturn
} from "@/hooks/player/useSegmentNavigation";
