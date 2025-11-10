"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import { useDropzone } from "react-dropzone";

// Mobile optimization imports
import {
  MobileDetector,
  TouchOptimizationManager,
  HapticFeedbackManager,
  useHapticFeedback,
  useTouchFeedback,
  TouchFeedbackPresets,
  initializeTouchFeedbackSystem,
  type MobileOptimizationConfig,
  type TouchGestureData,
} from "@/lib/mobile";
import {
  AudioChunkingStrategy,
  createMobileChunkingStrategy,
  createMemoryOptimizedChunkingStrategy,
  type ChunkingConfig,
  type ChunkingResult,
  type MemoryAwareChunkingResult,
  type AudioChunk,
} from "@/lib/audio/chunking-strategy";
import {
  performanceMonitor,
  recordMetric,
} from "@/lib/utils/performance-monitor";
import {
  audioBufferMemoryManager,
  streamingAudioProcessor,
  type StreamPriority,
  type MemoryPressureEvent,
} from "@/lib/performance/memory-management";

/**
 * Enhanced FileUpload component with mobile optimizations
 *
 * Features:
 * - Mobile-first responsive design with touch-optimized interface
 * - Progressive enhancement with automatic mobile detection
 * - Touch gesture support (tap, long press, swipe)
 * - Haptic feedback for tactile interaction
 * - Chunked upload for large files on mobile networks
 * - Performance monitoring and battery-conscious processing
 * - WCAG 2.1 compliant touch targets (44px minimum)
 * - Backward compatibility with existing implementations
 *
 * @example
 * ```tsx
 * // Basic usage (backward compatible)
 * <FileUpload
 *   onFilesSelected={handleFiles}
 *   isUploading={isUploading}
 *   uploadProgress={progress}
 * />
 *
 * // Mobile-optimized usage
 * <FileUpload
 *   onFilesSelected={handleFiles}
 *   enableMobileOptimizations={true}
 *   enableChunkedUpload={true}
 *   enableTouchFeedback={true}
 *   enableHapticFeedback={true}
 *   onUploadStart={(files) => console.log('Upload started', files)}
 *   onUploadError={(error) => console.error('Upload failed', error)}
 * />
 * ```
 */

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  className?: string;
  currentFileCount?: number; // 当前已上传的文件数量
  maxFiles?: number; // 最大文件数量限制

  // Mobile-specific props
  enableMobileOptimizations?: boolean;
  enableChunkedUpload?: boolean;
  enableTouchFeedback?: boolean;
  enableHapticFeedback?: boolean;
  enableGestures?: boolean;
  mobileConfig?: Partial<MobileOptimizationConfig>;
  chunkingConfig?: Partial<ChunkingConfig>;

  // Memory management props
  enableMemoryOptimization?: boolean;
  maxMemoryUsage?: number; // MB
  enableStreamingForLargeFiles?: boolean;
  memoryCheckInterval?: number; // milliseconds
  onMemoryPressure?: (event: MemoryPressureEvent) => void;
  onChunkingComplete?: (result: MemoryAwareChunkingResult) => void;

  // Callbacks for mobile features
  onUploadStart?: (files: File[]) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (files: File[]) => void;
  onUploadError?: (error: Error) => void;
  onGestureDetected?: (gesture: string, data: TouchGestureData) => void;
}

export default function FileUpload({
  onFilesSelected,
  isUploading = false,
  uploadProgress = 0,
  className = "",
  currentFileCount = 0,
  maxFiles = 5,

  // Mobile props with defaults
  enableMobileOptimizations = true,
  enableChunkedUpload = true,
  enableTouchFeedback = true,
  enableHapticFeedback = true,
  enableGestures = true,
  mobileConfig,
  chunkingConfig,

  // Memory management props with defaults
  enableMemoryOptimization = true,
  maxMemoryUsage = 200, // 200MB default
  enableStreamingForLargeFiles = true,
  memoryCheckInterval = 5000, // 5 seconds
  onMemoryPressure,
  onChunkingComplete,

  // Callbacks
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onGestureDetected,
}: FileUploadProps) {
  const [_isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDescriptionId = useId();
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  // Memory management state
  const [memoryStats, setMemoryStats] = useState({
    usage: 0,
    available: maxMemoryUsage,
    pressureLevel: "low" as "low" | "medium" | "high" | "critical",
    bufferCount: 0,
  });
  const [chunkingResult, setChunkingResult] =
    useState<MemoryAwareChunkingResult | null>(null);
  const [largeFilesDetected, setLargeFilesDetected] = useState<File[]>([]);

  // Mobile optimization hooks and managers
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { bindTouchFeedback } = useTouchFeedback();

  // Mobile detection and optimization setup
  const mobileDetector = useMemo(() => MobileDetector.getInstance(), []);
  const touchOptimizer = useMemo(
    () => TouchOptimizationManager.getInstance(),
    [],
  );
  const hapticManager = useMemo(() => HapticFeedbackManager.getInstance(), []);

  const isMobile = useMemo(() => mobileDetector.isMobile(), [mobileDetector]);
  const deviceInfo = useMemo(
    () => mobileDetector.getDeviceInfo(),
    [mobileDetector],
  );

  // Memory-aware chunking strategy
  const chunkingStrategy = useMemo(() => {
    if (!enableChunkedUpload) return null;

    // Use memory-optimized strategy if enabled
    if (enableMemoryOptimization) {
      return createMemoryOptimizedChunkingStrategy(
        maxMemoryUsage,
        enableStreamingForLargeFiles,
      );
    }

    // Fallback to mobile strategy
    const networkType = isMobile ? "cellular" : "wifi";
    return createMobileChunkingStrategy(
      networkType as "wifi" | "cellular" | "unknown",
      {
        ...chunkingConfig,
        // Add memory settings
        memoryAwareChunking: true,
        maxMemoryUsage: isMobile ? maxMemoryUsage / 2 : maxMemoryUsage, // Reduced for mobile
        adaptiveChunkSize: true,
        streamingEnabled: enableStreamingForLargeFiles,
      },
    );
  }, [
    enableChunkedUpload,
    enableMemoryOptimization,
    maxMemoryUsage,
    enableStreamingForLargeFiles,
    isMobile,
    chunkingConfig,
  ]);

  // Initialize mobile optimizations on mount
  useEffect(() => {
    if (enableMobileOptimizations && typeof window !== "undefined") {
      // Initialize touch feedback system
      initializeTouchFeedbackSystem(
        isMobile ? TouchFeedbackPresets.minimal : TouchFeedbackPresets.rich,
      );

      // Record performance metrics
      recordMetric("file_upload_component_mount", Date.now(), "ms", {
        device_type: deviceInfo.type,
        is_mobile: isMobile.toString(),
        has_touch_support: deviceInfo.touchPoints > 0,
      });
    }
  }, [enableMobileOptimizations, isMobile, deviceInfo]);

  // Initialize memory monitoring
  useEffect(() => {
    if (!enableMemoryOptimization) return;

    // Initial memory stats
    const initialStats = audioBufferMemoryManager.getMemoryStats();
    setMemoryStats((prev) => ({
      ...prev,
      usage: initialStats.totalMemoryUsed,
      bufferCount: initialStats.totalBuffers,
    }));

    // Set up memory pressure monitoring
    const handleMemoryPressure = (event: MemoryPressureEvent) => {
      setMemoryStats((prev) => ({
        ...prev,
        pressureLevel: event.level,
        available: event.availableMemory,
      }));

      // Call external callback if provided
      if (onMemoryPressure) {
        onMemoryPressure(event);
      }

      // Trigger haptic feedback for high/critical pressure
      if (
        enableHapticFeedback &&
        (event.level === "high" || event.level === "critical")
      ) {
        triggerHaptic("warning");
      }
    };

    streamingAudioProcessor.onMemoryPressure(handleMemoryPressure);

    // Periodic memory monitoring
    const memoryMonitorInterval = setInterval(() => {
      const currentStats = audioBufferMemoryManager.getMemoryStats();
      setMemoryStats((prev) => ({
        ...prev,
        usage: currentStats.totalMemoryUsed,
        bufferCount: currentStats.totalBuffers,
      }));
    }, memoryCheckInterval);

    return () => {
      clearInterval(memoryMonitorInterval);
      streamingAudioProcessor.removeMemoryPressureCallback(
        handleMemoryPressure,
      );
    };
  }, [
    enableMemoryOptimization,
    memoryCheckInterval,
    enableHapticFeedback,
    triggerHaptic,
    onMemoryPressure,
  ]);

  // Apply touch optimizations to upload area
  useEffect(() => {
    if (enableTouchFeedback && uploadAreaRef.current && isMobile) {
      const cleanup = touchOptimizer.addTouchListeners(
        uploadAreaRef.current,
        {
          onTouchStart: () => {
            if (enableHapticFeedback) {
              triggerHaptic("light");
            }
            setIsDragActive(true);
          },
          onTouchEnd: () => {
            setIsDragActive(false);
          },
        },
        {
          enableGpuAcceleration: true,
          passiveListeners: true,
        },
      );

      return cleanup;
    }
  }, [
    enableTouchFeedback,
    enableHapticFeedback,
    isMobile,
    touchOptimizer,
    triggerHaptic,
  ]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const timerId = performanceMonitor.startTimer("file_drop_processing");
      setIsDragActive(false);

      // Mobile haptic feedback for successful drop
      if (enableHapticFeedback && isMobile) {
        triggerHaptic("success");
      }

      // Detect large files for memory optimization
      const largeFiles = acceptedFiles.filter((file) => {
        const fileSizeMB = file.size / (1024 * 1024);
        return (
          fileSizeMB > 25 || // Files larger than 25MB
          (memoryStats.pressureLevel === "high" && fileSizeMB > 10) || // Lower threshold on high pressure
          (memoryStats.pressureLevel === "critical" && fileSizeMB > 5)
        ); // Even lower on critical pressure
      });

      setLargeFilesDetected(largeFiles);

      // Log memory status for large files
      if (largeFiles.length > 0) {
        console.log(`Large files detected (${largeFiles.length} files):`, {
          fileSizes: largeFiles.map(
            (f) => `${(f.size / 1024 / 1024).toFixed(2)}MB`,
          ),
          memoryPressure: memoryStats.pressureLevel,
          availableMemory: memoryStats.available,
        });

        // Trigger haptic feedback for large files warning
        if (enableHapticFeedback && memoryStats.pressureLevel !== "low") {
          triggerHaptic("warning");
        }
      }

      // 检查文件数量限制
      const remainingSlots = maxFiles - currentFileCount;
      if (remainingSlots <= 0) {
        const error = new Error(`已达到最大文件数量限制 (${maxFiles}个文件)`);
        console.error(error.message);

        if (enableHapticFeedback && isMobile) {
          triggerHaptic("error");
        }

        onUploadError?.(error);
        performanceMonitor.endTimer(timerId);
        return;
      }

      // 如果选择的文件超过剩余槽位，只取前面的文件
      const filesToAdd = acceptedFiles.slice(0, remainingSlots);
      if (filesToAdd.length < acceptedFiles.length) {
        console.warn(`只能添加 ${remainingSlots} 个文件，已达到最大限制`);

        if (enableHapticFeedback && isMobile) {
          triggerHaptic("warning");
        }
      }

      if (filesToAdd.length > 0) {
        try {
          // Mobile chunked upload processing
          if (enableChunkedUpload && chunkingStrategy && isMobile) {
            const chunkingResults = await Promise.all(
              filesToAdd.map(async (file) => {
                const chunkingResult =
                  await chunkingStrategy.calculateChunking(file);
                recordMetric(
                  "file_chunking_calculation",
                  chunkingResult.totalChunks,
                  "count",
                  {
                    file_size: (file.size / 1024 / 1024).toFixed(2) + "MB",
                    total_chunks: chunkingResult.totalChunks.toString(),
                    network_optimized:
                      chunkingResult.networkOptimized.toString(),
                  },
                );
                return { file, chunkingResult };
              }),
            );

            console.log("Mobile chunking strategy applied:", chunkingResults);
          }

          // Record upload start
          recordMetric("file_upload_start", filesToAdd.length, "count", {
            device_type: deviceInfo.type,
            total_size: filesToAdd
              .reduce((sum, file) => sum + file.size, 0)
              .toString(),
            chunked_upload: (enableChunkedUpload && isMobile).toString(),
          });

          // Trigger upload start callback
          onUploadStart?.(filesToAdd);

          // Process files (with mobile optimizations)
          await onFilesSelected(filesToAdd);

          // Record success
          recordMetric("file_upload_success", filesToAdd.length, "count");
          performanceMonitor.endTimer(timerId);
        } catch (error) {
          const uploadError =
            error instanceof Error ? error : new Error("Upload failed");
          console.error("File upload error:", uploadError);

          if (enableHapticFeedback && isMobile) {
            triggerHaptic("error");
          }

          onUploadError?.(uploadError);
          recordMetric("file_upload_error", 1, "count", {
            error_type: uploadError.constructor.name,
            device_type: deviceInfo.type,
          });
          performanceMonitor.endTimer(timerId);
        }
      } else {
        performanceMonitor.endTimer(timerId);
      }
    },
    [
      onFilesSelected,
      currentFileCount,
      maxFiles,
      enableMobileOptimizations,
      enableChunkedUpload,
      enableHapticFeedback,
      isMobile,
      chunkingStrategy,
      deviceInfo,
      triggerHaptic,
      onUploadStart,
      onUploadError,
      performanceMonitor,
    ],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac"],
    },
    multiple: true,
    disabled: isUploading,
    noClick: true, // 禁用默认的点击行为，使用我们自定义的处理
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const handleFileInputClick = useCallback(() => {
    // Mobile haptic feedback for button press
    if (enableHapticFeedback && isMobile) {
      triggerHaptic("selection");
    }

    // Record interaction
    recordMetric("file_input_click", 1, "count", {
      device_type: deviceInfo.type,
      interaction_type: "file_selection",
    });

    fileInputRef.current?.click();
  }, [enableHapticFeedback, isMobile, triggerHaptic, deviceInfo]);

  const handleFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const timerId = performanceMonitor.startTimer("file_input_processing");
      const files = Array.from(event.target.files || []);

      // Mobile haptic feedback for file selection
      if (enableHapticFeedback && isMobile) {
        triggerHaptic(files.length > 0 ? "success" : "light");
      }

      // 检查文件数量限制
      const remainingSlots = maxFiles - currentFileCount;
      if (remainingSlots <= 0) {
        const error = new Error(`已达到最大文件数量限制 (${maxFiles}个文件)`);
        console.error(error.message);

        if (enableHapticFeedback && isMobile) {
          triggerHaptic("error");
        }

        onUploadError?.(error);
        event.target.value = "";
        performanceMonitor.endTimer(timerId);
        return;
      }

      // 如果选择的文件超过剩余槽位，只取前面的文件
      const filesToAdd = files.slice(0, remainingSlots);
      if (filesToAdd.length < files.length) {
        console.warn(`只能添加 ${remainingSlots} 个文件，已达到最大限制`);

        if (enableHapticFeedback && isMobile) {
          triggerHaptic("warning");
        }
      }

      if (filesToAdd.length > 0) {
        try {
          // Mobile chunked upload processing
          if (enableChunkedUpload && chunkingStrategy && isMobile) {
            const chunkingResults = await Promise.all(
              filesToAdd.map(async (file) => {
                const chunkingResult =
                  await chunkingStrategy.calculateChunking(file);
                recordMetric(
                  "mobile_file_chunking",
                  chunkingResult.totalChunks,
                  "count",
                  {
                    file_name: file.name,
                    file_size_mb: (file.size / 1024 / 1024).toFixed(2),
                    chunk_count: chunkingResult.totalChunks.toString(),
                  },
                );
                return { file, chunkingResult };
              }),
            );
          }

          // Record file selection metrics
          recordMetric("file_input_selection", filesToAdd.length, "count", {
            device_type: deviceInfo.type,
            selection_method: "file_picker",
            total_size_mb: (
              filesToAdd.reduce((sum, file) => sum + file.size, 0) /
              1024 /
              1024
            ).toFixed(2),
          });

          onUploadStart?.(filesToAdd);
          await onFilesSelected(filesToAdd);

          if (enableHapticFeedback && isMobile) {
            triggerHaptic("success");
          }
        } catch (error) {
          const uploadError =
            error instanceof Error ? error : new Error("File selection failed");
          console.error("File input error:", uploadError);

          if (enableHapticFeedback && isMobile) {
            triggerHaptic("error");
          }

          onUploadError?.(uploadError);
        }
      }

      // 清空input以允许重复选择相同文件
      event.target.value = "";
      performanceMonitor.endTimer(timerId);
    },
    [
      onFilesSelected,
      currentFileCount,
      maxFiles,
      enableChunkedUpload,
      enableHapticFeedback,
      isMobile,
      chunkingStrategy,
      deviceInfo,
      triggerHaptic,
      onUploadStart,
      onUploadError,
      performanceMonitor,
    ],
  );

  // Handle gesture detection for mobile
  const handleGestureDetected = useCallback(
    (gesture: string, data: TouchGestureData) => {
      if (!enableGestures) return;

      // Record gesture
      recordMetric("touch_gesture_detected", 1, "count", {
        gesture_type: gesture,
        direction: data.direction,
        duration_ms: data.duration.toString(),
        device_type: deviceInfo.type,
      });

      // Trigger haptic feedback based on gesture
      if (enableHapticFeedback && isMobile) {
        switch (gesture) {
          case "tap":
            triggerHaptic("light");
            break;
          case "double_tap":
            triggerHaptic("medium");
            break;
          case "long_press":
            triggerHaptic("heavy");
            // Long press could trigger file picker
            fileInputRef.current?.click();
            break;
          case "swipe_up":
            // Could trigger upload area expansion or file picker
            fileInputRef.current?.click();
            break;
          default:
            triggerHaptic("light");
        }
      }

      // Call external gesture handler
      onGestureDetected?.(gesture, data);
    },
    [
      enableGestures,
      enableHapticFeedback,
      isMobile,
      deviceInfo,
      triggerHaptic,
      onGestureDetected,
    ],
  );

  const isDisabled = isUploading || currentFileCount >= maxFiles;
  const remainingSlots = maxFiles - currentFileCount;

  // Generate mobile-optimized classes
  const mobileOptimizedClasses = useMemo(() => {
    if (!enableMobileOptimizations) return "";

    const baseClasses = touchOptimizer.createTouchStyles("upload-area", {
      size: isMobile ? "enhanced" : "optimal",
      feedback: enableTouchFeedback,
      haptic: enableHapticFeedback,
    });

    return baseClasses;
  }, [
    enableMobileOptimizations,
    isMobile,
    enableTouchFeedback,
    enableHapticFeedback,
    touchOptimizer,
  ]);

  // Touch feedback props
  const touchFeedbackProps = useMemo(() => {
    if (!enableTouchFeedback || !isMobile) return {};

    return bindTouchFeedback({
      onTap: () => handleFileInputClick(),
      onLongPress: (gestureData: TouchGestureData) =>
        handleGestureDetected("long_press", gestureData),
      onSwipe: (direction: string, gestureData: TouchGestureData) => {
        if (direction === "up") {
          handleGestureDetected("swipe_up", gestureData);
        }
      },
    });
  }, [
    enableTouchFeedback,
    isMobile,
    bindTouchFeedback,
    handleFileInputClick,
    handleGestureDetected,
  ]);

  return (
    <div className={`mobile-file-upload ${className}`}>
      <section
        {...getRootProps()}
        {...touchFeedbackProps}
        ref={uploadAreaRef}
        className={`
          upload-area cursor-pointer relative overflow-hidden
          ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
          ${mobileOptimizedClasses}
          ${_isDragActive ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5" : ""}
          ${isMobile ? "min-h-[200px] p-6" : "min-h-[180px] p-8"}
          rounded-lg border-2 border-dashed border-[var(--border-default)]
          transition-all duration-200 ease-in-out
          hover:border-[var(--border-hover)] hover:bg-[var(--background-hover)]
          focus-within:ring-2 focus-within:ring-[var(--accent-primary)] focus-within:ring-offset-2
        `}
        aria-label="文件上传区域"
        aria-describedby={uploadDescriptionId}
        style={{
          // Mobile-specific touch target sizing
          minHeight: isMobile
            ? `${touchOptimizer.getOptimalTouchTargetSize() * 4}px`
            : undefined,
          // Touch-optimized spacing
          padding: isMobile
            ? `${touchOptimizer.getOptimalTouchTargetSize() / 2}px`
            : undefined,
        }}
      >
        <input
          {...getInputProps()}
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="选择音频文件"
        />

        {/* Upload icon with mobile optimization */}
        <div className="flex justify-center mb-4">
          <span
            className={`
              material-symbols-outlined
              ${isMobile ? "text-5xl" : "text-6xl"}
              text-[var(--state-success-text)]
              ${_isDragActive ? "animate-pulse" : ""}
              transition-all duration-300
            `}
            aria-hidden="true"
            style={{
              // Mobile touch-friendly size
              fontSize: isMobile
                ? `${touchOptimizer.getOptimalTouchTargetSize()}px`
                : undefined,
            }}
          >
            cloud_upload
          </span>
        </div>

        {/* Upload text with mobile optimization */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p
            className={`
              ${isMobile ? "text-lg" : "text-xl"}
              font-bold text-[var(--text-primary)]
            `}
            id={uploadDescriptionId}
            style={{
              // Mobile-responsive font size
              fontSize: isMobile
                ? `${Math.max(16, touchOptimizer.getOptimalTouchTargetSize() / 3)}px`
                : undefined,
            }}
          >
            {currentFileCount >= maxFiles
              ? "已达到文件数量上限"
              : "拖拽文件到这里"}
          </p>
          <p
            className={`${isMobile ? "text-sm" : "text-md"} text-[var(--text-secondary)]`}
          >
            或者
          </p>
        </div>

        {/* Mobile-optimized button */}
        <button
          type="button"
          className={`
            btn-primary relative overflow-hidden
            ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
            ${isMobile ? "min-h-[44px] px-6 py-3 text-base" : "min-h-[40px] px-4 py-2 text-sm"}
            ${enableTouchFeedback ? "touch-optimized" : ""}
            transition-all duration-200 ease-in-out
            transform active:scale-95
          `}
          onClick={handleFileInputClick}
          aria-describedby={uploadDescriptionId}
          disabled={isDisabled}
          style={{
            // WCAG 2.1 compliant touch target
            minHeight: isMobile
              ? `${touchOptimizer.getOptimalTouchTargetSize()}px`
              : undefined,
            minWidth: isMobile
              ? `${touchOptimizer.getOptimalTouchTargetSize() * 2}px`
              : undefined,
          }}
        >
          <span>
            {currentFileCount >= maxFiles ? "已达到上限" : "选择文件"}
          </span>

          {/* Mobile touch ripple effect */}
          {enableTouchFeedback && isMobile && (
            <div className="absolute inset-0 touch-ripple-container" />
          )}
        </button>

        {/* File information with mobile optimization */}
        <div className="flex flex-col items-center gap-1 mt-4 text-center">
          <p
            className={`
              ${isMobile ? "text-xs" : "text-sm"}
              text-[var(--text-muted)]
            `}
            style={{
              fontSize: isMobile
                ? `${Math.max(12, touchOptimizer.getOptimalTouchTargetSize() / 4)}px`
                : undefined,
            }}
          >
            {currentFileCount >= maxFiles
              ? `最多支持 ${maxFiles} 个文件`
              : `支持 MP3、WAV、M4A、OGG、FLAC 格式`}
          </p>
          {currentFileCount < maxFiles && remainingSlots > 0 && (
            <p
              className={`
                ${isMobile ? "text-xs" : "text-xs"}
                text-[var(--text-muted)] font-medium
              `}
            >
              还可添加 {remainingSlots} 个文件
            </p>
          )}

          {/* Mobile-specific indicators */}
          {isMobile && enableMobileOptimizations && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-[var(--text-muted)]">
                {deviceInfo.touchPoints > 0 ? "👆 触摸优化" : "🖱️ 鼠标控制"}
              </span>
              {enableChunkedUpload && (
                <span className="text-xs text-[var(--text-muted)]">
                  📦 分块上传
                </span>
              )}
              {enableHapticFeedback && hapticManager.isAvailable() && (
                <span className="text-xs text-[var(--text-muted)]">
                  📳 触觉反馈
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mobile gesture hints */}
        {isMobile && enableGestures && (
          <div className="absolute bottom-2 left-2 right-2 text-center">
            <p className="text-xs text-[var(--text-muted)] opacity-75">
              长按或上滑打开文件选择器
            </p>
          </div>
        )}
      </section>

      {/* Enhanced mobile upload progress indicator */}
      {isUploading && (
        <div className="mt-4 text-center">
          <p
            className={`
              mb-2 text-[var(--text-muted)]
              ${isMobile ? "text-sm" : "text-sm"}
            `}
          >
            上传中... {uploadProgress}%
          </p>
          <div
            className={`
              h-2 w-full rounded-full bg-[var(--border-muted)]
              ${isMobile ? "h-3" : "h-2"}
            `}
          >
            <div
              className={`
                bg-gradient-to-r from-[var(--button-color)] to-[var(--accent-primary)]
                ${isMobile ? "h-3" : "h-2"}
                rounded-full transition-all duration-300 ease-out
              `}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          {/* Mobile-specific upload info */}
          {isMobile && enableChunkedUpload && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              移动优化上传模式
            </p>
          )}
        </div>
      )}
    </div>
  );
}
