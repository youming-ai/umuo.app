/**
 * Bulk File Operations Module Index
 * Exports all components, hooks, types, and utilities for bulk file operations
 */

// Components
export { default as BulkOperations } from "./BulkOperations";
export { default as FileSelector } from "./FileSelector";
export { default as OperationProgress } from "./OperationProgress";
export { default as ConfirmationDialog } from "./ConfirmationDialog";
export { default as BulkActions } from "./BulkActions";

// Hooks
export {
  useBulkSelection,
  useBulkOperationsQueue,
  useBulkDelete,
  useBulkTranscribe,
} from "./hooks";

// Types
export type {
  BulkOperationType,
  OperationStatus,
  OperationPriority,
  SelectionMode,
  TouchMode,
  FileInfo,
  BulkOperationConfig,
  OperationProgress,
  OperationResult,
  SelectionState,
  BulkAction,
  ConfirmationDialog,
  OperationQueue,
  MobileOptimizations,
  AccessibilityFeatures,
  BulkOperationsProps,
  FileSelectorProps,
  OperationProgressProps,
  ConfirmationDialogProps,
  BulkActionsProps,
} from "./types";

// Utilities
export {
  ProgressTracker,
  BulkOperationErrorHandler,
  MobileOptimizer,
  FileOperationUtils,
  TouchUtils,
  progressTracker,
  errorHandler,
  mobileOptimizer,
} from "./utils";

// Helper functions
export {
  createBulkAction,
  createBulkOperationConfig,
  defaultMobileOptimizations,
  defaultAccessibilityFeatures,
} from "./types";

// Query keys
export { bulkOperationsKeys } from "./hooks";
