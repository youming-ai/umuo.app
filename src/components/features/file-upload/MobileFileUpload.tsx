"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  Smartphone,
  Settings,
  HelpCircle,
  Upload,
  CheckCircle,
  AlertTriangle,
  Zap,
} from "lucide-react";

import { useFiles } from "@/hooks";
import { useMobileFileUpload } from "./hooks/useMobileFileUpload";
import FileDropZone from "./FileDropZone";
import FilePreview from "./FilePreview";
import UploadProgress from "./UploadProgress";
import type { FileValidationOptions } from "./FileValidation";
import { touchOptimizer } from "@/lib/mobile/touch-optimization";

// Accessibility types for file upload
interface FileUploadAccessibilityConfig {
  enableScreenReaderAnnouncements?: boolean;
  enableVoiceControl?: boolean;
  enableSwitchNavigation?: boolean;
  announcements?: {
    fileSelected?: string;
    uploadStarted?: string;
    uploadComplete?: string;
    uploadError?: string;
  };
}

interface MobileFileUploadProps {
  className?: string;
  onSuccess?: (files: any[]) => void;
  onError?: (error: Error) => void;
  validationOptions?: FileValidationOptions;
  showAdvancedOptions?: boolean;
  compactMode?: boolean;
  autoStartUpload?: boolean;
  maxFiles?: number;
  accessibility?: FileUploadAccessibilityConfig;
}

interface UploadSettings {
  autoStart: boolean;
  backgroundUpload: boolean;
  wifiOnly: boolean;
  maxConcurrent: number;
  chunkSize: number;
}

export default function MobileFileUpload({
  className = "",
  onSuccess,
  onError,
  validationOptions,
  showAdvancedOptions = false,
  compactMode = false,
  autoStartUpload = true,
  maxFiles = 10,
  accessibility = {},
}: MobileFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploadSettings, setUploadSettings] = useState<UploadSettings>({
    autoStart: autoStartUpload,
    backgroundUpload: false,
    wifiOnly: true,
    maxConcurrent: 2,
    chunkSize: 1024 * 1024, // 1MB chunks
  });

  const { files: existingFiles } = useFiles();

  // Accessibility configuration
  const accessibilityConfig = {
    enableScreenReaderAnnouncements:
      accessibility.enableScreenReaderAnnouncements ?? true,
    enableVoiceControl: accessibility.enableVoiceControl ?? false,
    enableSwitchNavigation: accessibility.enableSwitchNavigation ?? false,
    announcements: {
      fileSelected:
        accessibility.announcements?.fileSelected ?? "File selected",
      uploadStarted:
        accessibility.announcements?.uploadStarted ?? "Upload started",
      uploadComplete:
        accessibility.announcements?.uploadComplete ?? "Upload complete",
      uploadError: accessibility.announcements?.uploadError ?? "Upload error",
    },
  };

  // Accessibility announcement function
  const announceToScreenReader = useCallback(
    (message: string) => {
      if (
        accessibilityConfig.enableScreenReaderAnnouncements &&
        typeof window !== "undefined"
      ) {
        const announcement = document.createElement("div");
        announcement.setAttribute("aria-live", "polite");
        announcement.setAttribute("aria-atomic", "true");
        announcement.className = "sr-only";
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
      }
    },
    [accessibilityConfig.enableScreenReaderAnnouncements],
  );

  // Initialize accessibility features
  useEffect(() => {
    if (containerRef.current) {
      // Apply accessibility features to container
      touchOptimizer.createAccessibleTouchTarget(containerRef.current, {
        role: "application",
        label: "File upload interface",
        announceInteraction:
          accessibilityConfig.enableScreenReaderAnnouncements,
      });

      // Enable voice control if configured
      if (accessibilityConfig.enableVoiceControl) {
        touchOptimizer.enableVoiceControl({
          enableVoiceControl: true,
          recognitionLanguage: "en-US",
          confidenceThreshold: 0.7,
          commands: {
            "select file": "select-file",
            "upload file": "upload-file",
            "clear files": "clear-files",
            "show settings": "show-settings",
            "start upload": "start-upload",
          },
        });
      }

      // Enable switch navigation if configured
      if (accessibilityConfig.enableSwitchNavigation) {
        touchOptimizer.enableSwitchNavigation({
          enableSwitchNavigation: true,
          scanSpeed: 1000,
          autoScan: false,
          scanPattern: "grid",
          customScanOrder: [],
        });
      }
    }
  }, [accessibilityConfig]);

  const mobileUpload = useMobileFileUpload({
    ...validationOptions,
    maxFiles,
    onSuccess: (uploadedFiles) => {
      setSelectedFiles([]);
      announceToScreenReader(accessibilityConfig.announcements.uploadComplete);
      onSuccess?.(uploadedFiles);
    },
    onError: (error) => {
      announceToScreenReader(
        `${accessibilityConfig.announcements.uploadError}: ${error.message}`,
      );
      onError?.(error);
    },
  });

  // Handle file selection with accessibility enhancements
  const handleFilesSelected = useCallback(
    (files: File[]) => {
      setSelectedFiles((prev) => [...prev, ...files]);

      // Screen reader announcement
      if (files.length > 0) {
        const fileNames = files.map((f) => f.name).join(", ");
        announceToScreenReader(
          `${accessibilityConfig.announcements.fileSelected}: ${fileNames}`,
        );
      }

      if (uploadSettings.autoStart) {
        announceToScreenReader(accessibilityConfig.announcements.uploadStarted);
        mobileUpload.uploadFiles(files);
      }
    },
    [
      mobileUpload,
      uploadSettings.autoStart,
      announceToScreenReader,
      accessibilityConfig.announcements,
    ],
  );

  // Handle file removal
  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Manual upload start
  const handleStartUpload = useCallback(() => {
    if (selectedFiles.length > 0) {
      mobileUpload.uploadFiles(selectedFiles);
    }
  }, [selectedFiles, mobileUpload]);

  // Retry failed uploads
  const handleRetryUpload = useCallback(() => {
    mobileUpload.retryUpload();
  }, [mobileUpload]);

  // Cancel current upload
  const handleCancelUpload = useCallback(() => {
    mobileUpload.cancelUpload();
    setSelectedFiles([]);
  }, [mobileUpload]);

  // Get mobile-specific validation options
  const getMobileValidationOptions = (): FileValidationOptions => ({
    maxFileSize: uploadSettings.wifiOnly ? 100 * 1024 * 1024 : 50 * 1024 * 1024, // Smaller for mobile
    maxTotalSize: uploadSettings.wifiOnly
      ? 500 * 1024 * 1024
      : 200 * 1024 * 1024,
    maxFileCount: maxFiles,
    ...validationOptions,
  });

  // Check if we should show mobile optimization tips
  const shouldShowMobileTips = () => {
    return (
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768
    );
  };

  const pendingFilesCount = selectedFiles.length;
  const hasExistingFiles = existingFiles && existingFiles.length > 0;

  return (
    <div
      ref={containerRef}
      className={`mobile-file-upload ${compactMode ? "compact" : "full"} accessibility-enhanced ${className}`}
      role="application"
      aria-label="File upload interface"
      aria-describedby="upload-instructions"
    >
      {/* Accessibility instructions for screen readers */}
      {accessibilityConfig.enableScreenReaderAnnouncements && (
        <div id="upload-instructions" className="sr-only">
          <h2>File Upload Interface</h2>
          <p>
            Use Tab to navigate between controls. Use Space or Enter to activate
            buttons.
          </p>
          <p>
            Select files using the file picker or drag and drop. Files will be
            uploaded automatically.
          </p>
          <p>
            Alternative input methods are available for users with motor
            impairments.
          </p>
        </div>
      )}
      {/* Mobile optimization banner */}
      {shouldShowMobileTips() && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Mobile Optimized
            </span>
          </div>
          <p className="text-xs text-blue-700">
            {uploadSettings.wifiOnly
              ? "Uploads will only proceed when connected to WiFi to save mobile data."
              : "Mobile data uploads enabled. Be aware of data usage."}
          </p>
        </div>
      )}

      {/* File drop zone */}
      {!mobileUpload.isUploading && (
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          disabled={mobileUpload.isUploading}
          validationOptions={getMobileValidationOptions()}
          maxFiles={maxFiles - (existingFiles?.length || 0)}
          className="mb-4"
        />
      )}

      {/* File preview */}
      {selectedFiles.length > 0 && !mobileUpload.isUploading && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Files to Upload ({selectedFiles.length})
          </h3>
          <FilePreview
            files={selectedFiles.map((file) => ({ file }))}
            onRemoveFile={handleRemoveFile}
            compactMode={compactMode}
            mobileOptized={true}
          />

          {/* Manual upload controls */}
          {!uploadSettings.autoStart && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleStartUpload}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm accessibility-enhanced"
                aria-label={`Start upload of ${selectedFiles.length} files`}
                disabled={selectedFiles.length === 0}
                role="button"
                tabIndex={0}
              >
                <Upload className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Start Upload ({selectedFiles.length} files)
              </button>
              <button
                onClick={() => setSelectedFiles([])}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm accessibility-enhanced"
                aria-label="Clear all selected files"
                role="button"
                tabIndex={0}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload progress */}
      {mobileUpload.uploadProgress && (
        <div className="mb-4">
          <UploadProgress
            progress={mobileUpload.uploadProgress}
            isUploading={mobileUpload.isUploading}
            error={mobileUpload.error}
            canRetry={mobileUpload.canRetry}
            onCancel={handleCancelUpload}
            onRetry={handleRetryUpload}
            mobileOptized={true}
          />
        </div>
      )}

      {/* Upload status summary */}
      {(hasExistingFiles || pendingFilesCount > 0) && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {existingFiles?.length || 0}
                </div>
                <div className="text-xs text-gray-500">Uploaded</div>
              </div>

              {pendingFilesCount > 0 && (
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {pendingFilesCount}
                  </div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
              )}
            </div>

            <div className="text-right">
              {mobileUpload.isUploading ? (
                <div className="flex items-center gap-1 text-sm text-blue-600">
                  <Zap className="w-4 h-4 animate-pulse" />
                  Uploading...
                </div>
              ) : mobileUpload.error ? (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  Upload Failed
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Ready
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advanced options */}
      {showAdvancedOptions && (
        <div className="mb-4 border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">
              Upload Settings
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-1 rounded hover:bg-gray-100 accessibility-enhanced"
                aria-label={`${showHelp ? "Hide" : "Show"} help`}
                aria-pressed={showHelp}
                role="button"
                tabIndex={0}
              >
                <HelpCircle
                  className="w-4 h-4 text-gray-500"
                  aria-hidden="true"
                />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 rounded hover:bg-gray-100 accessibility-enhanced"
                aria-label={`${showSettings ? "Hide" : "Show"} settings`}
                aria-pressed={showSettings}
                role="button"
                tabIndex={0}
              >
                <Settings
                  className="w-4 h-4 text-gray-500"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="flex items-center justify-between text-sm">
                  <span>Auto-start uploads</span>
                  <input
                    type="checkbox"
                    checked={uploadSettings.autoStart}
                    onChange={(e) =>
                      setUploadSettings((prev) => ({
                        ...prev,
                        autoStart: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                </label>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm">
                  <span>WiFi only</span>
                  <input
                    type="checkbox"
                    checked={uploadSettings.wifiOnly}
                    onChange={(e) =>
                      setUploadSettings((prev) => ({
                        ...prev,
                        wifiOnly: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                </label>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm">
                  <span>Background uploads</span>
                  <input
                    type="checkbox"
                    checked={uploadSettings.backgroundUpload}
                    onChange={(e) =>
                      setUploadSettings((prev) => ({
                        ...prev,
                        backgroundUpload: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Help panel */}
          {showHelp && (
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 space-y-2">
              <p>
                <strong>Mobile Upload Tips:</strong>
              </p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Tap to select files or drag and drop</li>
                <li>Swipe left on any file to remove it</li>
                <li>Swipe right on files to preview them</li>
                <li>Enable "WiFi only" to save mobile data</li>
                <li>
                  Large files may take longer to upload on mobile connections
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Mobile-specific styles */}
      <style jsx>{`
        .mobile-file-upload {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        .mobile-file-upload.compact {
          padding: 0.5rem;
        }

        .mobile-file-upload.full {
          padding: 1rem;
        }

        @media (max-width: 768px) {
          .mobile-file-upload {
            padding: 0.75rem;
          }

          .mobile-file-upload button {
            min-height: 44px;
            min-width: 44px;
          }
        }

        @media (max-width: 480px) {
          .mobile-file-upload {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
