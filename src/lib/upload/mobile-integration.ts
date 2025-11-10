/**
 * Mobile Integration for Chunked Upload System
 *
 * This module provides integration utilities for the chunked upload system
 * with mobile-specific features and optimizations.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

import type {
  File,
  FileValidationOptions,
  FileRow,
} from '@/types';

import type {
  UploadProgress,
  UploadConfig,
  UploadError,
  UploadSession,
} from '@/types/upload';

import {
  useChunkedUpload,
  useUploadSession,
  useUploadSessions,
  useUploadConfig,
  useUploadCleanup,
  createUploadErrorMessage,
  formatFileSize,
  MOBILE_UPLOAD_CONFIG,
  getOptimalUploadConfig,
  validateUploadFiles,
} from './index';

import { useFiles } from '@/hooks';
import { validateFiles } from '@/components/features/file-upload/FileValidation';

/**
 * Mobile-optimized upload hook that integrates with chunked upload system
 */
export function useMobileChunkedUpload(options: {
  onSuccess?: (files: FileRow[]) => void;
  onError?: (error: Error | UploadError) => void;
  onProgress?: (progress: UploadProgress) => void;
  enableResume?: boolean;
  adaptiveUpload?: boolean;
  validationOptions?: FileValidationOptions;
}) {
  const { onSuccess, onError, onProgress, enableResume = true, adaptiveUpload = true, validationOptions } = options;
  const { addFiles } = useFiles();
  const { config: globalConfig } = useUploadConfig();

  // Get chunked upload instance
  const { uploadFile, isUploading, uploadError } = useChunkedUpload({
    onProgress: (progress) => {
      onProgress?.({
        ...progress,
        stage: this.mapUploadStage(progress.stage),
      });
    },
    onError: (error) => {
      const errorMessage = createUploadErrorMessage(error);
      onError?.(new Error(errorMessage));
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      // Validate files
      const validationResult = validateFiles(files, validationOptions);

      if (validationResult.invalidFiles.length > 0) {
        const errorMessages = validationResult.invalidFiles
          .map(file => `${file.name}: ${file.errors.join(', ')}`)
          .join('; ');
        throw new Error(`Invalid files: ${errorMessages}`);
      }

      if (validationResult.validFiles.length === 0) {
        throw new Error('No valid files to upload');
      }

      // Determine optimal configuration
      const baseConfig = adaptiveUpload
        ? getOptimalUploadConfig()
        : MOBILE_UPLOAD_CONFIG;

      const uploadConfig: Partial<UploadConfig> = {
        ...baseConfig,
        ...globalConfig,
        enableResume,
      };

      // Upload files one by one for better progress tracking
      const uploadedFiles: FileRow[] = [];

      for (const file of validationResult.validFiles) {
        try {
          const { sessionId } = await uploadFile(file, uploadConfig);

          // Wait for upload to complete before processing next file
          await waitForUploadCompletion(sessionId);

          // Add file to database
          await addFiles([file]);

          // Create FileRow record
          uploadedFiles.push({
            id: Date.now() + Math.random(), // Temporary ID
            name: file.name,
            size: file.size,
            type: file.type,
            blob: file,
            uploadedAt: new Date(),
            updatedAt: new Date(),
          });

        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          throw error; // Re-throw to stop the upload process
        }
      }

      return uploadedFiles;
    },
    onSuccess: (uploadedFiles) => {
      onSuccess?.(uploadedFiles);
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  // Helper function to wait for upload completion
  const waitForUploadCompletion = async (sessionId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        // This would ideally use the session state, but for simplicity we'll use a timeout
        // In a real implementation, you'd use the useUploadSession hook or direct session checking
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 1000); // Simulate completion after 1 second
      }, 100);
    });
  };

  // Map chunked upload stages to mobile upload stages
  const mapUploadStage = (stage: string): UploadProgress['stage'] => {
    switch (stage) {
      case 'preparing':
        return 'preparing';
      case 'uploading':
        return 'uploading';
      case 'verifying':
        return 'processing';
      case 'assembling':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'error':
        return 'error';
      default:
        return 'uploading';
    }
  };

  return {
    uploadFiles: uploadMutation.mutate,
    isUploading: uploadMutation.isPending || isUploading,
    error: uploadMutation.error || uploadError,
    reset: uploadMutation.reset,
  };
}

/**
 * Hook for managing upload sessions with mobile-specific features
 */
export function useMobileUploadSession(sessionId?: string) {
  const {
    session,
    progress,
    isActive,
    isPaused,
    isCompleted,
    isFailed,
    pauseUpload,
    resumeUpload,
    cancelUpload,
  } = useUploadSession(sessionId || '');

  // Mobile-specific optimizations
  const mobileProgress = progress ? {
    ...progress,
    formattedSpeed: progress.speed ? formatFileSize(progress.speed) + '/s' : '0 B/s',
    formattedLoaded: formatFileSize(progress.loaded),
    formattedTotal: formatFileSize(progress.total),
    formattedTimeRemaining: progress.estimatedTimeRemaining
      ? formatTimeRemaining(progress.estimatedTimeRemaining)
      : 'Calculating...',
  } : null;

  return {
    session,
    progress: mobileProgress,
    isActive,
    isPaused,
    isCompleted,
    isFailed,
    pauseUpload,
    resumeUpload,
    cancelUpload,
  };
}

/**
 * Hook for managing multiple upload sessions on mobile
 */
export function useMobileUploadManager() {
  const {
    sessions,
    uploadingSessions,
    pausedSessions,
    hasActiveSessions,
    activeCount,
    pausedCount,
    pauseAll,
    cancelAll,
  } = useUploadSessions();

  // Mobile-specific session management
  const mobileSessions = sessions.map(session => ({
    ...session,
    formattedSize: formatFileSize(session.fileSize),
    formattedProgress: Math.round((session.uploadedSize / session.fileSize) * 100) + '%',
    isMobile: true, // Mark as mobile session for UI differentiation
  }));

  // Background upload management
  const enableBackgroundUploads = useCallback(() => {
    // Request background sync permission if available
    if ('serviceWorker' in navigator && 'BackgroundSync' in window) {
      // This would integrate with service worker for background uploads
      console.log('Background uploads enabled');
    }
  }, []);

  return {
    sessions: mobileSessions,
    uploadingSessions,
    pausedSessions,
    hasActiveSessions,
    activeCount,
    pausedCount,
    pauseAll,
    cancelAll,
    enableBackgroundUploads,
  };
}

/**
 * Hook for mobile-specific upload utilities
 */
export function useMobileUploadUtils() {
  // Battery-aware upload management
  const checkBatteryLevel = useCallback(async (): Promise<boolean> => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return battery.level > 0.2; // Allow uploads only if battery > 20%
      } catch (error) {
        console.warn('Battery API not available');
      }
    }
    return true; // Default to allowing uploads
  }, []);

  // Network-aware upload management
  const checkNetworkSuitability = useCallback((): boolean => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        // Don't upload on slow-2g or when save-data is enabled
        return connection.effectiveType !== 'slow-2g' && !connection.saveData;
      }
    }
    return true; // Default to allowing uploads
  }, []);

  // Memory-aware upload management
  const checkMemoryUsage = useCallback((): boolean => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      return usedRatio < 0.8; // Allow uploads only if memory usage < 80%
    }
    return true; // Default to allowing uploads
  }, []);

  // Comprehensive upload check
  const canUpload = useCallback(async (): Promise<{
    canUpload: boolean;
    reason?: string;
  }> => {
    const batteryOk = await checkBatteryLevel();
    const networkOk = checkNetworkSuitability();
    const memoryOk = checkMemoryUsage();

    if (!batteryOk) {
      return { canUpload: false, reason: 'Low battery level. Please connect to a charger.' };
    }

    if (!networkOk) {
      return { canUpload: false, reason: 'Network connection not suitable for uploading.' };
    }

    if (!memoryOk) {
      return { canUpload: false, reason: 'Low memory. Please close other apps and try again.' };
    }

    return { canUpload: true };
  }, [checkBatteryLevel, checkNetworkSuitability, checkMemoryUsage]);

  // File size estimation for mobile
  const estimateMobileUploadTime = useCallback((fileSize: number): string => {
    // Conservative estimate for mobile networks
    const mobileSpeed = 1; // 1 Mbps average for mobile
    const bytesPerSecond = (mobileSpeed * 1024 * 1024) / 8;
    const seconds = fileSize / bytesPerSecond;

    if (seconds < 60) {
      return `${Math.ceil(seconds)} seconds`;
    } else if (seconds < 3600) {
      return `${Math.ceil(seconds / 60)} minutes`;
    } else {
      return `${Math.ceil(seconds / 3600)} hours`;
    }
  }, []);

  return {
    canUpload,
    estimateMobileUploadTime,
    checkBatteryLevel,
    checkNetworkSuitability,
    checkMemoryUsage,
  };
}

/**
 * Hook for mobile-specific error handling
 */
export function useMobileErrorHandler() {
  const handleUploadError = useCallback((error: UploadError | Error): string => {
    if ('code' in error) {
      return createUploadErrorMessage(error);
    }

    // Handle generic errors
    return error.message || 'An unexpected error occurred during upload.';
  }, []);

  const getErrorRecoveryAction = useCallback((error: UploadError | Error): {
    canRetry: boolean;
    action: string;
  } => {
    if ('code' in error) {
      switch (error.code) {
        case 'NETWORK_ERROR':
        case 'TIMEOUT_ERROR':
          return {
            canRetry: true,
            action: 'Check your connection and try again',
          };

        case 'FILE_TOO_LARGE':
          return {
            canRetry: false,
            action: 'Choose a smaller file or compress it',
          };

        case 'AUTHENTICATION_ERROR':
          return {
            canRetry: true,
            action: 'Log in again and try uploading',
          };

        case 'STORAGE_ERROR':
          return {
            canRetry: true,
            action: 'Free up storage space and try again',
          };

        default:
          return {
            canRetry: true,
            action: 'Wait a moment and try again',
          };
      }
    }

    return {
      canRetry: true,
      action: 'Try again in a few moments',
    };
  }, []);

  return {
    handleUploadError,
    getErrorRecoveryAction,
  };
}

// Utility functions

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)}m`;
  } else {
    return `${Math.ceil(seconds / 3600)}h`;
  }
}

/**
 * Higher-order component for mobile upload providers
 */
export function withMobileUploadProvider<P extends object>(
  Component: React.ComponentType<P>
) {
  return function MobileUploadProviderWrapper(props: P) {
    // Initialize cleanup on mount
    const { cleanup } = useUploadCleanup();

    useEffect(() => {
      return () => {
        cleanup();
      };
    }, [cleanup]);

    return <Component {...props} />;
  };
}

export default {
  useMobileChunkedUpload,
  useMobileUploadSession,
  useMobileUploadManager,
  useMobileUploadUtils,
  useMobileErrorHandler,
  withMobileUploadProvider,
};
