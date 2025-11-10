"use client";

import React, { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, FileAudio, FileVideo, FileText } from "lucide-react";

import { useHapticFeedback } from "./hooks/useMobileFileUpload";
import { validateFile, getFileIcon, getSupportedFormatsText, type FileValidationOptions } from "./FileValidation";

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  disabled?: boolean;
  validationOptions?: FileValidationOptions;
  className?: string;
  showDragOverlay?: boolean;
  minSize?: number;
  maxSize?: number;
  maxFiles?: number;
}

interface TouchPosition {
  x: number;
  y: number;
  timestamp: number;
}

export default function FileDropZone({
  onFilesSelected,
  isUploading = false,
  disabled = false,
  validationOptions = {},
  className = "",
  showDragOverlay = true,
  minSize = 1,
  maxSize = 300 * 1024 * 1024, // 300MB default
  maxFiles = 10,
}: FileDropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchPosition, setTouchPosition] = useState<TouchPosition | null>(null);
  const [showRipple, setShowRipple] = useState(false);
  const [ripplePosition, setRipplePosition] = useState({ x: 0, y: 0 });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { triggerHaptic } = useHapticFeedback();

  // Handle file drop with validation
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      setIsDragActive(false);
      setValidationErrors([]);
      setValidationWarnings([]);

      // Validate each file
      const validFiles: File[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      acceptedFiles.forEach(file => {
        const validation = validateFile(file, validationOptions);
        if (validation.isValid) {
          validFiles.push(file);
          if (validation.warnings.length > 0) {
            warnings.push(...validation.warnings);
          }
        } else {
          errors.push(`${file.name}: ${validation.errors.join(", ")}`);
        }
      });

      // Handle file rejections
      fileRejections.forEach(rejection => {
        const { file, errors } = rejection;
        const errorMessages = errors.map((e: any) => e.message).join(", ");
        errors.push(`${file.name}: ${errorMessages}`);
      });

      setValidationErrors(errors);
      setValidationWarnings(warnings);

      if (validFiles.length > 0) {
        triggerHaptic('success');
        onFilesSelected(validFiles);
      }

      if (errors.length > 0) {
        triggerHaptic('error');
      }
    },
    [onFilesSelected, validationOptions, triggerHaptic]
  );

  // Dropzone configuration with mobile optimizations
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"],
      "video/*": [".mp4", ".mov", ".webm"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    multiple: maxFiles > 1,
    disabled: disabled || isUploading,
    minSize,
    maxSize,
    maxFiles,
    noClick: true, // Disable default click for custom touch handling
    onDragEnter: () => {
      setIsDragActive(true);
      triggerHaptic('light');
    },
    onDragLeave: () => {
      setIsDragActive(false);
    },
    onDropAccepted: () => {
      setIsDragActive(false);
    },
    onDropRejected: () => {
      setIsDragActive(false);
      triggerHaptic('error');
    },
  });

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartTime(Date.now());
    setTouchPosition({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    });
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;

    // Check if it was a tap (not a swipe)
    if (touchDuration < 200 && touchPosition) {
      const touch = e.changedTouches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - touchPosition.x, 2) +
        Math.pow(touch.clientY - touchPosition.y, 2)
      );

      if (distance < 10) { // Tap detected
        triggerRipple(touch.clientX, touch.clientY);
        triggerHaptic('medium');

        // Trigger file input
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 100);
      }
    }

    setTouchPosition(null);
    setTouchStartTime(0);
  }, [touchStartTime, touchPosition, triggerHaptic]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel tap if moved too much
    if (touchPosition) {
      const touch = e.touches[0];
      const distance = Math.sqrt(
        Math.pow(touch.clientX - touchPosition.x, 2) +
        Math.pow(touch.clientY - touchPosition.y, 2)
      );

      if (distance > 10) {
        setTouchPosition(null);
        setTouchStartTime(0);
      }
    }
  }, [touchPosition]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      triggerHaptic('medium');
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading, triggerHaptic]);

  const triggerRipple = useCallback((x: number, y: number) => {
    if (!dropZoneRef.current) return;

    const rect = dropZoneRef.current.getBoundingClientRect();
    setRipplePosition({
      x: x - rect.left,
      y: y - rect.top,
    });
    setShowRipple(true);

    setTimeout(() => setShowRipple(false), 600);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onDrop(files, []);
      }
      // Reset input to allow selecting same file again
      e.target.value = "";
    },
    [onDrop]
  );

  // Determine file type icon based on validation options
  const getDisplayIcon = () => {
    const { allowAudio = true, allowVideo = true, allowDocuments = true } = validationOptions;

    if (allowAudio && !allowVideo && !allowDocuments) {
      return <FileAudio className="w-16 h-16" />;
    } else if (allowVideo && !allowAudio && !allowDocuments) {
      return <FileVideo className="w-16 h-16" />;
    } else if (allowDocuments && !allowAudio && !allowVideo) {
      return <FileText className="w-16 h-16" />;
    } else {
      return <Upload className="w-16 h-16" />;
    }
  };

  return (
    <div className={`mobile-file-dropzone ${className}`}>
      {/* Main drop zone */}
      <div
        ref={dropZoneRef}
        {...getRootProps()}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed p-8
          transition-all duration-300 ease-out
          ${isDragActive
            ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 scale-[1.02]'
            : 'border-[var(--border-muted)] bg-[var(--surface-secondary)] hover:border-[var(--border-primary)]'
          }
          ${disabled || isUploading
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer active:scale-[0.98]'
          }
          touch-manipulation
          select-none
        `}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClick={handleClick}
        style={{ minHeight: '200px' }} // Minimum touch target
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        aria-describedby="file-upload-description"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Hidden file input */}
        <input
          {...getInputProps()}
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Select files to upload"
        />

        {/* Touch ripple effect */}
        {showRipple && (
          <div
            className="absolute pointer-events-none rounded-full bg-white/20 animate-ping"
            style={{
              left: ripplePosition.x - 20,
              top: ripplePosition.y - 20,
              width: 40,
              height: 40,
            }}
          />
        )}

        {/* Drag overlay */}
        {showDragOverlay && isDragActive && (
          <div className="absolute inset-0 bg-[var(--accent-color)]/20 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 animate-bounce" />
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                Drop files here
              </p>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="relative z-10 text-center">
          <div className="mb-6 text-[var(--accent-color)]">
            {getDisplayIcon()}
          </div>

          <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
            {isUploading ? "Uploading..." : "Upload Files"}
          </h3>

          <p className="text-sm text-[var(--text-secondary)] mb-4" id="file-upload-description">
            {isUploading
              ? "Please wait while files are being uploaded"
              : "Tap to select or drag and drop"
            }
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <span className="px-3 py-1 bg-[var(--surface-tertiary)] rounded-full text-xs text-[var(--text-muted)]">
              Max {maxFiles} files
            </span>
            <span className="px-3 py-1 bg-[var(--surface-tertiary)] rounded-full text-xs text-[var(--text-muted)]">
              Max {Math.round(maxSize / 1024 / 1024)}MB
            </span>
          </div>

          {/* Supported formats */}
          <div className="text-xs text-[var(--text-muted)]">
            <p>Supported: {getSupportedFormatsText(validationOptions)}</p>
          </div>
        </div>
      </div>

      {/* Validation messages */}
      {validationErrors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-semibold text-red-800 mb-2">Upload Errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {validationWarnings.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">Warnings:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {validationWarnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mobile styles */}
      <style jsx>{`
        .mobile-file-dropzone {
          /* Touch-optimized styles */
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        @media (max-width: 768px) {
          .mobile-file-dropzone {
            padding: 1.5rem;
            min-height: 180px;
          }
        }

        @media (max-width: 480px) {
          .mobile-file-dropzone {
            padding: 1rem;
            min-height: 160px;
          }
        }
      `}</style>
    </div>
  );
}
