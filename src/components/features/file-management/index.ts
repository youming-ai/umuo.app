/**
 * Mobile File Management - Complete touch-optimized file management system
 * Exports all components and utilities for mobile file operations
 */

// Main components
export { default as MobileFileManager } from "./MobileFileManager";
export { default as MobileFileGrid } from "./MobileFileGrid";
export { default as MobileFileCard } from "./MobileFileCard";
export { default as FileSearch } from "./FileSearch";
export { default as BulkOperations } from "./BulkOperations";
export { default as FilePreview } from "./FilePreview";

// Types and utilities
export type {
  FilterOptions,
  SortOptions,
  ViewMode,
  FileWithStatus,
  BulkOperation,
  FileAction,
  SwipeAction,
} from "./types";

export {
  defaultFilters,
  fileSizePresets,
  fileTypeOptions,
  statusOptions,
  dateRangeOptions,
  sortOptions,
} from "./types";

// Hooks
export {
  useMobileFiles,
  useMobileFileDelete,
  useMobileBulkOperations,
  useMobileFileSelection,
  useMobilePerformance,
  mobileFileKeys,
} from "./hooks";

// Gesture utilities
export {
  GestureEnhancer,
  gestureEnhancer,
  useGestures,
} from "@/lib/utils/gestures";

// Accessibility utilities
export {
  AccessibilityManager,
  accessibilityManager,
  useAccessibility,
  withAccessibility,
  defaultAriaLabels,
} from "./accessibility";

export type { AriaLabels } from "./accessibility";

// Re-export common utilities
export {
  formatFileSize,
  formatDate,
  formatDuration,
  formatLongDuration,
} from "@/lib/utils/format";
