/**
 * Mobile-Optimized File Upload Components
 *
 * This directory contains a comprehensive mobile-optimized file upload system
 * with touch interactions, chunked uploads, and resume capabilities.
 *
 * Components:
 * - MobileFileUpload: Main component with mobile UI and settings
 * - FileDropZone: Touch-optimized drag-and-drop area
 * - FilePreview: File list with gesture support (swipe actions)
 * - UploadProgress: Progress tracking with pause/resume capability
 * - FileValidation: File format and size validation utilities
 * - useMobileFileUpload: Custom hook for upload state management
 */

// Main components
export { default as MobileFileUpload } from "./MobileFileUpload";
export { default as FileDropZone } from "./FileDropZone";
export { default as FilePreview } from "./FilePreview";
export { default as UploadProgress } from "./UploadProgress";

// Hooks
export {
  useMobileFileUpload,
  useHapticFeedback,
} from "./hooks/useMobileFileUpload";

// Utilities
export {
  validateFile,
  validateFiles,
  getFileIcon,
  formatFileSize,
  getSupportedFormatsText,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
  SUPPORTED_DOCUMENT_FORMATS,
  type FileValidationResult,
  type FileValidationOptions,
} from "./FileValidation";

// Types
export type { FilePreviewItem, SwipeGesture, UploadSettings } from "./types";
