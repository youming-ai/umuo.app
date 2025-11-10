/**
 * Type definitions for bulk file operations
 * Comprehensive system for multi-file management with mobile optimization
 */

import type { FileRow } from "@/types/db/database";

// Bulk operation types
export type BulkOperationType =
  | "delete"
  | "download"
  | "share"
  | "transcribe"
  | "move"
  | "copy"
  | "export"
  | "organize"
  | "compress"
  | "extract";

// Operation status types
export type OperationStatus =
  | "pending"
  | "preparing"
  | "processing"
  | "uploading"
  | "downloading"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

// Priority levels for operations
export type OperationPriority = "low" | "normal" | "high" | "urgent";

// File selection modes
export type SelectionMode =
  | "single"
  | "multiple"
  | "range"
  | "all";

// Touch interaction modes
export type TouchMode =
  | "tap"
  | "long-press"
  | "swipe"
  | "double-tap";

// Enhanced file information for operations
export interface FileInfo extends FileRow {
  // Selection state
  isSelected?: boolean;
  selectionMode?: SelectionMode;

  // Operation status
  operationStatus?: OperationStatus;
  operationType?: BulkOperationType;
  operationProgress?: number;
  operationMessage?: string;

  // File metadata for operations
  canTranscribe?: boolean;
  canDownload?: boolean;
  canShare?: boolean;
  canDelete?: boolean;

  // Mobile optimization
  isLargeFile?: boolean;
  requiresChunking?: boolean;
  estimatedProcessingTime?: number;

  // File organization
  tags?: string[];
  category?: string;
  folder?: string;
}

// Bulk operation configuration
export interface BulkOperationConfig {
  // Basic operation settings
  type: BulkOperationType;
  fileIds: number[];
  priority?: OperationPriority;

  // Processing options
  enableChunking?: boolean;
  chunkSize?: number;
  maxConcurrency?: number;
  retryAttempts?: number;
  retryDelay?: number;

  // Progress tracking
  enableProgressTracking?: boolean;
  progressCallback?: (progress: OperationProgress) => void;
  completionCallback?: (result: OperationResult) => void;

  // User experience
  showConfirmation?: boolean;
  showPreview?: boolean;
  enableCancellation?: boolean;

  // Error handling
  continueOnError?: boolean;
  detailedErrorReporting?: boolean;

  // Mobile optimizations
  enableBackgroundProcessing?: boolean;
  pauseOnAppBackground?: boolean;
  optimizeForMobileData?: boolean;
}

// Operation progress information
export interface OperationProgress {
  operationId: string;
  type: BulkOperationType;
  status: OperationStatus;

  // Progress metrics
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  currentFile?: FileInfo;
  currentFileIndex?: number;

  // Timing information
  startTime: Date;
  estimatedCompletion?: Date;
  elapsedTime: number;
  averageTimePerFile: number;

  // Data metrics
  totalBytes: number;
  processedBytes: number;
  transferRate?: number;

  // Status information
  message: string;
  lastError?: string;
  warnings?: string[];

  // Mobile-specific
  isBackground?: boolean;
  isPaused?: boolean;
  batteryOptimization?: boolean;
  networkType?: string;
}

// Operation result information
export interface OperationResult {
  operationId: string;
  type: BulkOperationType;
  status: OperationStatus;

  // Results summary
  totalFiles: number;
  successfulFiles: number[];
  failedFiles: Array<{
    fileId: number;
    fileName: string;
    error: string;
  }>;

  // Timing metrics
  startTime: Date;
  endTime: Date;
  duration: number;

  // Data metrics
  totalBytesProcessed: number;
  averageProcessingRate: number;

  // Additional information
  warningCount: number;
  errors?: Array<{
    fileId: number;
    error: string;
    stack?: string;
  }>;
  metadata?: Record<string, any>;
}

// Selection state management
export interface SelectionState {
  // Selected files
  selectedFileIds: Set<number>;
  selectedFiles: FileInfo[];

  // Selection metadata
  selectionMode: SelectionMode;
  lastSelectedId?: number;
  selectionRange?: { start: number; end: number };

  // Selection statistics
  totalSelected: number;
  totalSize: number;
  canTranscribe: number;
  canDownload: number;
  canShare: number;
  canDelete: number;

  // Touch interaction state
  touchMode?: TouchMode;
  longPressTimer?: NodeJS.Timeout;
  swipeStartX?: number;
  swipeStartY?: number;
}

// Available bulk actions
export interface BulkAction {
  id: string;
  type: BulkOperationType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;

  // Action configuration
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  requiresConfirmation?: boolean;
  showPreview?: boolean;

  // Availability conditions
  isAvailable?: (selectedFiles: FileInfo[]) => boolean;
  isEnabled?: (selectedFiles: FileInfo[]) => boolean;
  priority?: OperationPriority;

  // Mobile optimization
  touchOptimized?: boolean;
  showProgressBar?: boolean;
  backgroundCapable?: boolean;

  // Action configuration
  config?: Partial<BulkOperationConfig>;
  estimatedTime?: (fileCount: number, totalSize: number) => number;
}

// Confirmation dialog data
export interface ConfirmationDialog {
  isOpen: boolean;
  operationType: BulkOperationType;
  title: string;
  message: string;
  details?: string;

  // File preview
  files: FileInfo[];
  previewLimit?: number;

  // Actions
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;

  // Styling
  variant?: "default" | "destructive";
  icon?: React.ComponentType<{ className?: string }>;
}

// Operation queue management
export interface OperationQueue {
  // Queue state
  operations: Array<{
    id: string;
    config: BulkOperationConfig;
    status: OperationStatus;
    progress?: OperationProgress;
    result?: OperationResult;
  }>;

  // Queue configuration
  maxConcurrent: number;
  maxQueueSize: number;
  enablePrioritization: boolean;

  // Processing state
  isProcessing: boolean;
  isPaused: boolean;
  currentOperations: string[];

  // Performance metrics
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
}

// Mobile-specific optimizations
export interface MobileOptimizations {
  // Touch interactions
  longPressDelay: number;
  doubleTapDelay: number;
  swipeThreshold: number;

  // Performance settings
  enableVirtualization: boolean;
  batchSize: number;
  throttleUpdates: boolean;

  // Network optimizations
  optimizeForMobileData: boolean;
  pauseOnSlowConnection: boolean;
  adaptiveQuality: boolean;

  // Battery optimizations
  enableBatteryOptimization: boolean;
  pauseOnLowBattery: boolean;
  reduceQualityOnLowBattery: boolean;

  // Memory optimizations
  enableMemoryOptimization: boolean;
  maxCacheSize: number;
  garbageCollectionInterval: number;
}

// Accessibility features
export interface AccessibilityFeatures {
  // Screen reader support
  announceProgress: boolean;
  announceSelectionChanges: boolean;
  announceOperationCompletion: boolean;

  // Keyboard navigation
  enableKeyboardShortcuts: boolean;
  enableTabNavigation: boolean;

  // Visual enhancements
  highContrastMode: boolean;
  largeTextMode: boolean;
  reducedMotionMode: boolean;

  // Voice control
  enableVoiceControl: boolean;
  voiceCommands: Record<string, () => void>;
}

// Component props interfaces
export interface BulkOperationsProps {
  files: FileInfo[];
  selectionState: SelectionState;
  onSelectionChange: (selectionState: SelectionState) => void;

  // Operations
  onOperationStart?: (operation: BulkOperationConfig) => void;
  onOperationComplete?: (result: OperationResult) => void;
  onOperationError?: (error: Error, operationId: string) => void;

  // UI configuration
  showFileSelector?: boolean;
  showProgressBar?: boolean;
  showConfirmationDialog?: boolean;

  // Mobile optimizations
  mobileOptimizations?: Partial<MobileOptimizations>;
  accessibilityFeatures?: Partial<AccessibilityFeatures>;

  // Customization
  customActions?: BulkAction[];
  disabledActions?: BulkOperationType[];

  className?: string;
}

export interface FileSelectorProps {
  files: FileInfo[];
  selectionState: SelectionState;
  onSelectionChange: (selectionState: SelectionState) => void;

  // Display options
  showFilePreview?: boolean;
  showFileSize?: boolean;
  showFileDate?: boolean;
  showFileStatus?: boolean;

  // Interaction options
  selectionMode?: SelectionMode;
  touchMode?: TouchMode;
  enableDragSelection?: boolean;
  enableKeyboardSelection?: boolean;

  // Mobile optimizations
  longPressDelay?: number;
  swipeThreshold?: number;
  enableHapticFeedback?: boolean;

  className?: string;
}

export interface OperationProgressProps {
  operations: OperationProgress[];
  onCancel?: (operationId: string) => void;
  onPause?: (operationId: string) => void;
  onResume?: (operationId: string) => void;

  // Display options
  showEstimatedTime?: boolean;
  showTransferRate?: boolean;
  showIndividualProgress?: boolean;
  compactMode?: boolean;

  // Mobile optimizations
  enablePullToRefresh?: boolean;
  enableSwipeToCancel?: boolean;

  className?: string;
}

export interface ConfirmationDialogProps {
  dialog: ConfirmationDialog;
  onDialogChange: (dialog: ConfirmationDialog) => void;

  // Display options
  showFilePreviews?: boolean;
  showProgressEstimate?: boolean;
  showWarningMessage?: boolean;

  // Mobile optimizations
  enableVibration?: boolean;
  enableBackdropBlur?: boolean;

  className?: string;
}

export interface BulkActionsProps {
  selectedFiles: FileInfo[];
  availableActions: BulkAction[];
  onActionExecute: (action: BulkAction, files: FileInfo[]) => void;

  // Display options
  layout?: "horizontal" | "vertical" | "grid";
  showLabels?: boolean;
  showDescriptions?: boolean;
  showBadges?: boolean;

  // Interaction options
  enableKeyboardShortcuts?: boolean;
  enableLongPress?: boolean;

  // Mobile optimizations
  touchOptimized?: boolean;
  enableHapticFeedback?: boolean;

  className?: string;
}

// Default configurations
export const defaultMobileOptimizations: MobileOptimizations = {
  longPressDelay: 500,
  doubleTapDelay: 300,
  swipeThreshold: 50,
  enableVirtualization: true,
  batchSize: 50,
  throttleUpdates: true,
  optimizeForMobileData: true,
  pauseOnSlowConnection: true,
  adaptiveQuality: false,
  enableBatteryOptimization: true,
  pauseOnLowBattery: false,
  reduceQualityOnLowBattery: false,
  enableMemoryOptimization: true,
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  garbageCollectionInterval: 30000, // 30 seconds
};

export const defaultAccessibilityFeatures: AccessibilityFeatures = {
  announceProgress: true,
  announceSelectionChanges: true,
  announceOperationCompletion: true,
  enableKeyboardShortcuts: true,
  enableTabNavigation: true,
  highContrastMode: false,
  largeTextMode: false,
  reducedMotionMode: false,
  enableVoiceControl: false,
  voiceCommands: {},
};

// Helper functions
export function createBulkAction(
  config: Partial<BulkAction> & Pick<BulkAction, "id" | "type" | "label" | "icon">
): BulkAction {
  return {
    description: "",
    variant: "default",
    requiresConfirmation: true,
    showPreview: false,
    isAvailable: () => true,
    isEnabled: () => true,
    priority: "normal",
    touchOptimized: true,
    showProgressBar: true,
    backgroundCapable: false,
    ...config,
  };
}

export function createBulkOperationConfig(
  type: BulkOperationType,
  fileIds: number[],
  overrides: Partial<BulkOperationConfig> = {}
): BulkOperationConfig {
  return {
    type,
    fileIds,
    priority: "normal",
    enableChunking: true,
    chunkSize: 1024 * 1024, // 1MB
    maxConcurrency: 3,
    retryAttempts: 3,
    retryDelay: 1000,
    enableProgressTracking: true,
    showConfirmation: true,
    showPreview: false,
    enableCancellation: true,
    continueOnError: false,
    detailedErrorReporting: true,
    enableBackgroundProcessing: true,
    pauseOnAppBackground: true,
    optimizeForMobileData: true,
    ...overrides,
  };
}
