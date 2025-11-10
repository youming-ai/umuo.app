/**
 * TypeScript types for mobile file upload components
 */

import type { FileValidationResult } from "./FileValidation";

export interface FilePreviewItem {
  file: File;
  validation?: FileValidationResult;
  preview?: string; // URL for image/video preview
  progress?: number;
  status?: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

export interface SwipeGesture {
  startX: number;
  startTime: number;
  currentX: number;
  isSwiping: boolean;
}

export interface UploadSettings {
  autoStart: boolean;
  backgroundUpload: boolean;
  wifiOnly: boolean;
  maxConcurrent: number;
  chunkSize: number;
}

export interface MobileUploadOptions {
  onSuccess?: (files: any[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
  maxFileSize?: number;
  maxTotalSize?: number;
  allowAudio?: boolean;
  allowVideo?: boolean;
  allowDocuments?: boolean;
  maxFileCount?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  fileId?: number;
  stage: "preparing" | "uploading" | "processing" | "completed" | "error";
}

export interface MobileFileUploadProps {
  className?: string;
  onSuccess?: (files: any[]) => void;
  onError?: (error: Error) => void;
  validationOptions?: {
    maxFileSize?: number;
    maxTotalSize?: number;
    allowAudio?: boolean;
    allowVideo?: boolean;
    allowDocuments?: boolean;
    maxFileCount?: number;
  };
  showAdvancedOptions?: boolean;
  compactMode?: boolean;
  autoStartUpload?: boolean;
  maxFiles?: number;
}

export interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  disabled?: boolean;
  validationOptions?: {
    maxFileSize?: number;
    maxTotalSize?: number;
    allowAudio?: boolean;
    allowVideo?: boolean;
    allowDocuments?: boolean;
    maxFileCount?: number;
  };
  className?: string;
  showDragOverlay?: boolean;
  minSize?: number;
  maxSize?: number;
  maxFiles?: number;
}

export interface FilePreviewProps {
  files: FilePreviewItem[];
  onRemoveFile: (index: number) => void;
  onViewFile?: (file: FilePreviewItem) => void;
  onRetryFile?: (index: number) => void;
  className?: string;
  mobileOptimized?: boolean;
  maxVisibleItems?: number;
  showActions?: boolean;
  compactMode?: boolean;
}

export interface UploadProgressProps {
  progress: {
    loaded: number;
    total: number;
    percentage: number;
    stage: "preparing" | "uploading" | "processing" | "completed" | "error";
    fileId?: number;
  } | null;
  isUploading: boolean;
  error?: Error | null;
  canRetry?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
  showDetails?: boolean;
  mobileOptimized?: boolean;
}
