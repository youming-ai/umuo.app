"use client";

import React from "react";

// File type configuration for supported formats
export const SUPPORTED_AUDIO_FORMATS = {
  "audio/mpeg": { ext: ".mp3", name: "MP3 Audio", maxSize: 100 * 1024 * 1024 }, // 100MB
  "audio/wav": { ext: ".wav", name: "WAV Audio", maxSize: 200 * 1024 * 1024 }, // 200MB
  "audio/x-m4a": { ext: ".m4a", name: "M4A Audio", maxSize: 100 * 1024 * 1024 }, // 100MB
  "audio/ogg": { ext: ".ogg", name: "OGG Audio", maxSize: 50 * 1024 * 1024 }, // 50MB
  "audio/flac": { ext: ".flac", name: "FLAC Audio", maxSize: 300 * 1024 * 1024 }, // 300MB
  "audio/aac": { ext: ".aac", name: "AAC Audio", maxSize: 100 * 1024 * 1024 }, // 100MB
};

export const SUPPORTED_VIDEO_FORMATS = {
  "video/mp4": { ext: ".mp4", name: "MP4 Video", maxSize: 500 * 1024 * 1024 }, // 500MB
  "video/quicktime": { ext: ".mov", name: "QuickTime Video", maxSize: 500 * 1024 * 1024 }, // 500MB
  "video/webm": { ext: ".webm", name: "WebM Video", maxSize: 200 * 1024 * 1024 }, // 200MB
};

export const SUPPORTED_DOCUMENT_FORMATS = {
  "application/pdf": { ext: ".pdf", name: "PDF Document", maxSize: 50 * 1024 * 1024 }, // 50MB
  "text/plain": { ext: ".txt", name: "Text Document", maxSize: 10 * 1024 * 1024 }, // 10MB
  "application/msword": { ext: ".doc", name: "Word Document", maxSize: 20 * 1024 * 1024 }, // 20MB
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: ".docx",
    name: "Word Document",
    maxSize: 20 * 1024 * 1024
  },
};

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileType: 'audio' | 'video' | 'document' | 'unsupported';
}

export interface FileValidationOptions {
  maxFileSize?: number;
  maxTotalSize?: number;
  allowAudio?: boolean;
  allowVideo?: boolean;
  allowDocuments?: boolean;
  maxFileCount?: number;
}

/**
 * Validates a single file against supported formats and constraints
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxFileSize = 300 * 1024 * 1024, // Default 300MB
    allowAudio = true,
    allowVideo = true,
    allowDocuments = true,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  const allFormats = {
    ...(allowAudio && SUPPORTED_AUDIO_FORMATS),
    ...(allowVideo && SUPPORTED_VIDEO_FORMATS),
    ...(allowDocuments && SUPPORTED_DOCUMENT_FORMATS),
  };

  const formatConfig = allFormats[file.type as keyof typeof allFormats];
  const isSupported = !!formatConfig;

  let fileType: 'audio' | 'video' | 'document' | 'unsupported' = 'unsupported';

  if (isSupported) {
    if (file.type in SUPPORTED_AUDIO_FORMATS) {
      fileType = 'audio';
    } else if (file.type in SUPPORTED_VIDEO_FORMATS) {
      fileType = 'video';
    } else if (file.type in SUPPORTED_DOCUMENT_FORMATS) {
      fileType = 'document';
    }
  } else {
    errors.push(`Unsupported file format: ${file.type}`);
  }

  // Check file size
  if (isSupported && formatConfig && file.size > formatConfig.maxSize) {
    errors.push(
      `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum ${Math.round(formatConfig.maxSize / 1024 / 1024)}MB for ${formatConfig.name}`
    );
  }

  // Check general file size limit
  if (file.size > maxFileSize) {
    errors.push(
      `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum ${Math.round(maxFileSize / 1024 / 1024)}MB`
    );
  }

  // Add warnings for large files
  if (file.size > 100 * 1024 * 1024) { // 100MB
    warnings.push(
      `Large file detected (${Math.round(file.size / 1024 / 1024)}MB). Upload may take longer on mobile connections.`
    );
  }

  // Check filename
  if (file.name.length > 255) {
    errors.push('Filename is too long (maximum 255 characters)');
  }

  // Check for invalid characters in filename
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(file.name)) {
    errors.push('Filename contains invalid characters');
  }

  return {
    isValid: errors.length === 0 && isSupported,
    errors,
    warnings,
    fileType: isSupported ? fileType : 'unsupported',
  };
}

/**
 * Validates multiple files and returns overall results
 */
export function validateFiles(
  files: File[],
  options: FileValidationOptions = {}
): { validFiles: File[]; invalidFiles: File[]; results: FileValidationResult[]; totalSize: number } {
  const {
    maxTotalSize = 1024 * 1024 * 1024, // Default 1GB total
    maxFileCount = 10,
  } = options;

  const results = files.map(file => validateFile(file, options));
  const validFiles: File[] = [];
  const invalidFiles: File[] = [];
  let totalSize = 0;

  files.forEach((file, index) => {
    const result = results[index];
    if (result.isValid && totalSize + file.size <= maxTotalSize && validFiles.length < maxFileCount) {
      validFiles.push(file);
      totalSize += file.size;
    } else {
      invalidFiles.push(file);
    }
  });

  return {
    validFiles,
    invalidFiles,
    results,
    totalSize,
  };
}

/**
 * Gets file icon based on type
 */
export function getFileIcon(fileType: string): React.ReactNode {
  if (fileType in SUPPORTED_AUDIO_FORMATS) {
    return <span className="material-symbols-outlined">audio_file</span>;
  } else if (fileType in SUPPORTED_VIDEO_FORMATS) {
    return <span className="material-symbols-outlined">video_file</span>;
  } else if (fileType in SUPPORTED_DOCUMENT_FORMATS) {
    return <span className="material-symbols-outlined">description</span>;
  }
  return <span className="material-symbols-outlined">file_present</span>;
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets formatted list of supported formats
 */
export function getSupportedFormatsText(options: FileValidationOptions = {}): string {
  const { allowAudio = true, allowVideo = true, allowDocuments = true } = options;
  const formats: string[] = [];

  if (allowAudio) {
    formats.push(Object.values(SUPPORTED_AUDIO_FORMATS).map(f => f.ext).join(', '));
  }
  if (allowVideo) {
    formats.push(Object.values(SUPPORTED_VIDEO_FORMATS).map(f => f.ext).join(', '));
  }
  if (allowDocuments) {
    formats.push(Object.values(SUPPORTED_DOCUMENT_FORMATS).map(f => f.ext).join(', '));
  }

  return formats.join(', ');
}
