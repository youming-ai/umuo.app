"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
  SUPPORTED_DOCUMENT_FORMATS,
  validateFiles,
  type FileValidationOptions
} from "@/components/features/file-upload/FileValidation";
import { useMobileFileValidation, MobileValidationOptions } from "../MobileFileValidation";

interface FileProcessingOptions {
  onSuccess?: (files: File[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  enableThumbnails?: boolean;
  enableMetadata?: boolean;
  enableOptimization?: boolean;
  concurrentProcessing?: number;
  maxMemoryUsage?: number;
}

interface ProcessedFile {
  file: File;
  thumbnail?: string;
  metadata?: Record<string, any>;
  optimizations?: any[];
  processingTime?: number;
}

interface FileProcessingState {
  isProcessing: boolean;
  processedCount: number;
  totalCount: number;
  currentFile?: string;
  progress: number;
  error?: Error;
  stage: "preparing" | "processing" | "optimizing" | "completed" | "error";
  processedFiles: ProcessedFile[];
}

export function useMobileFilePicker(
  options: FileProcessingOptions & {
    maxFiles?: number;
    validationOptions?: MobileValidationOptions;
  } = {}
) {
  const {
    onSuccess,
    onError,
    onProgress,
    enableThumbnails = true,
    enableMetadata = true,
    enableOptimization = true,
    concurrentProcessing = 3,
    maxMemoryUsage = 100 * 1024 * 1024, // 100MB
    maxFiles = 10,
    validationOptions = {}
  } = options;

  const [state, setState] = useState<FileProcessingState>({
    isProcessing: false,
    processedCount: 0,
    totalCount: 0,
    progress: 0,
    stage: "preparing",
    processedFiles: []
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const workerPoolRef = useRef<Worker[]>([]);
  const memoryUsageRef = useRef(0);
  const queryClient = useQueryClient();

  const { validateFileMobile, getValidationSummary } = useMobileFileValidation(validationOptions);

  // Initialize worker pool for background processing
  useEffect(() => {
    const initWorkers = async () => {
      try {
        // Create worker pool for concurrent file processing
        for (let i = 0; i < concurrentProcessing; i++) {
          // In a real implementation, you'd create actual Web Workers
          // For now, we'll simulate with empty workers
          workerPoolRef.current.push({} as Worker);
        }
      } catch (error) {
        console.error("Error initializing workers:", error);
      }
    };

    initWorkers();

    return () => {
      // Cleanup workers
      workerPoolRef.current.forEach(worker => {
        worker.terminate?.();
      });
    };
  }, [concurrentProcessing]);

  // Generate thumbnail for image/video files
  const generateThumbnail = useCallback(async (file: File): Promise<string | undefined> => {
    if (!enableThumbnails) return undefined;

    return new Promise((resolve) => {
      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          // Calculate thumbnail size (max 200x200)
          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = () => resolve(undefined);
        img.src = URL.createObjectURL(file);
      } else if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.onloadeddata = () => {
          video.currentTime = 1; // Seek to 1 second for thumbnail
        };
        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          canvas.width = 200;
          canvas.height = 150;
          ctx.drawImage(video, 0, 0, 200, 150);

          resolve(canvas.toDataURL("image/jpeg", 0.8));
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => resolve(undefined);
        video.src = URL.createObjectURL(file);
      } else {
        resolve(undefined);
      }
    });
  }, [enableThumbnails]);

  // Extract metadata from files
  const extractMetadata = useCallback(async (file: File): Promise<Record<string, any>> => {
    if (!enableMetadata) return {};

    const metadata: Record<string, any> = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };

    try {
      if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            metadata.duration = video.duration;
            metadata.width = video.videoWidth;
            metadata.height = video.videoHeight;
            resolve();
          };
          video.onerror = () => resolve();
          video.src = URL.createObjectURL(file);
        });
        URL.revokeObjectURL(video.src);
      } else if (file.type.startsWith("audio/")) {
        const audio = document.createElement("audio");
        await new Promise<void>((resolve) => {
          audio.onloadedmetadata = () => {
            metadata.duration = audio.duration;
            metadata.sampleRate = (audio as any).sampleRate;
            resolve();
          };
          audio.onerror = () => resolve();
          audio.src = URL.createObjectURL(file);
        });
        URL.revokeObjectURL(audio.src);
      } else if (file.type.startsWith("image/")) {
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            metadata.width = img.width;
            metadata.height = img.height;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = URL.createObjectURL(file);
        });
        URL.revokeObjectURL(img.src);
      }
    } catch (error) {
      console.warn("Error extracting metadata:", error);
    }

    return metadata;
  }, [enableMetadata]);

  // Process a single file
  const processFile = useCallback(async (file: File): Promise<ProcessedFile> => {
    const startTime = Date.now();

    // Check memory usage
    if (memoryUsageRef.current > maxMemoryUsage) {
      throw new Error("Memory limit exceeded. Please process files in smaller batches.");
    }

    const processedFile: ProcessedFile = {
      file,
      thumbnail: await generateThumbnail(file),
      metadata: await extractMetadata(file)
    };

    // Update memory usage
    memoryUsageRef.current += file.size;

    const processingTime = Date.now() - startTime;
    processedFile.processingTime = processingTime;

    return processedFile;
  }, [generateThumbnail, extractMetadata, maxMemoryUsage]);

  // Process multiple files with validation and optimization
  const processFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      abortControllerRef.current = new AbortController();
      memoryUsageRef.current = 0;

      setState(prev => ({
        ...prev,
        isProcessing: true,
        totalCount: files.length,
        processedCount: 0,
        progress: 0,
        stage: "preparing",
        processedFiles: [],
        error: undefined
      }));

      // Validate files first
      setState(prev => ({ ...prev, stage: "preparing" }));
      const validationSummary = getValidationSummary(files);

      if (validationSummary.invalidFiles > 0) {
        throw new Error(`${validationSummary.invalidFiles} files failed validation`);
      }

      if (files.length > maxFiles) {
        throw new Error(`Maximum ${maxFiles} files allowed`);
      }

      // Process files in batches to manage memory
      const batchSize = Math.min(concurrentProcessing, files.length);
      const processedFiles: ProcessedFile[] = [];

      for (let i = 0; i < files.length; i += batchSize) {
        // Check for cancellation
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error("Processing cancelled");
        }

        const batch = files.slice(i, i + batchSize);

        setState(prev => ({
          ...prev,
          stage: "processing",
          currentFile: batch[0]?.name,
          processedCount: processedFiles.length
        }));

        // Process batch concurrently
        const batchPromises = batch.map(file => processFile(file));
        const batchResults = await Promise.all(batchPromises);
        processedFiles.push(...batchResults);

        // Update progress
        const progress = (processedFiles.length / files.length) * 100;
        setState(prev => ({ ...prev, progress }));
        onProgress?.(progress);

        // Allow garbage collection between batches
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      setState(prev => ({
        ...prev,
        stage: "completed",
        progress: 100,
        processedFiles,
        isProcessing: false
      }));

      return processedFiles;
    },
    onSuccess: (processedFiles) => {
      onSuccess?.(processedFiles.map(pf => pf.file));
      memoryUsageRef.current = 0;
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        stage: "error",
        error: error instanceof Error ? error : new Error("Processing failed"),
        isProcessing: false
      }));
      onError?.(error instanceof Error ? error : new Error("Processing failed"));
      memoryUsageRef.current = 0;
    }
  });

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      processFilesMutation.reset();
      setState(prev => ({
        ...prev,
        isProcessing: false,
        stage: "error",
        error: new Error("Processing cancelled")
      }));
    }
  }, [processFilesMutation]);

  // Reset state
  const resetProcessing = useCallback(() => {
    setState({
      isProcessing: false,
      processedCount: 0,
      totalCount: 0,
      progress: 0,
      stage: "preparing",
      processedFiles: []
    });
    processFilesMutation.reset();
    memoryUsageRef.current = 0;
  }, [processFilesMutation]);

  // Get validation for files
  const getFilesValidation = useCallback((files: File[]) => {
    return files.map(file => validateFileMobile(file));
  }, [validateFileMobile]);

  return {
    // State
    isProcessing: state.isProcessing,
    processedFiles: state.processedFiles,
    processingProgress: state.progress,
    processingStage: state.stage,
    processingError: state.error,
    currentProcessingFile: state.currentFile,
    processedCount: state.processedCount,
    totalCount: state.totalCount,

    // Actions
    processFiles: processFilesMutation.mutate,
    cancelProcessing,
    resetProcessing,
    getFilesValidation,
    getValidationSummary,

    // Utilities
    generateThumbnail,
    extractMetadata
  };
}
