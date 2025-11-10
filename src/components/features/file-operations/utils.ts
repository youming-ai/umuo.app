/**
 * Bulk File Operations Utilities
 * Progress tracking, error handling, and mobile optimization utilities
 */

import type {
  OperationProgress,
  OperationResult,
  BulkOperationConfig,
  FileInfo,
  BulkOperationType,
  MobileOptimizations,
  OperationStatus,
} from "./types";

// Progress tracking utilities
export class ProgressTracker {
  private progressCallbacks: Map<string, (progress: OperationProgress) => void> = new Map();
  private progressHistory: Map<string, OperationProgress[]> = new Map();
  private maxHistorySize = 100;

  // Register progress callback for an operation
  registerCallback(operationId: string, callback: (progress: OperationProgress) => void): void {
    this.progressCallbacks.set(operationId, callback);
    this.progressHistory.set(operationId, []);
  }

  // Unregister progress callback
  unregisterCallback(operationId: string): void {
    this.progressCallbacks.delete(operationId);
    this.progressHistory.delete(operationId);
  }

  // Update progress for an operation
  updateProgress(operationId: string, progress: OperationProgress): void {
    const callback = this.progressCallbacks.get(operationId);
    if (callback) {
      callback(progress);
    }

    // Store in history
    const history = this.progressHistory.get(operationId) || [];
    history.push({ ...progress });

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.progressHistory.set(operationId, history);
  }

  // Get progress history for an operation
  getProgressHistory(operationId: string): OperationProgress[] {
    return this.progressHistory.get(operationId) || [];
  }

  // Get current progress for an operation
  getCurrentProgress(operationId: string): OperationProgress | null {
    const history = this.progressHistory.get(operationId);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  // Calculate estimated completion time
  calculateEstimatedCompletion(progress: OperationProgress): Date | null {
    if (progress.completedFiles === 0 || progress.currentFileIndex === undefined) {
      return null;
    }

    const elapsedMs = Date.now() - progress.startTime.getTime();
    const avgTimePerFileMs = elapsedMs / (progress.currentFileIndex + 1);
    const remainingFiles = progress.totalFiles - (progress.currentFileIndex + 1);
    const estimatedRemainingMs = remainingFiles * avgTimePerFileMs;

    return new Date(Date.now() + estimatedRemainingMs);
  }

  // Calculate transfer rate
  calculateTransferRate(progress: OperationProgress): number | null {
    if (progress.processedBytes === 0 || progress.elapsedTime === 0) {
      return null;
    }

    return (progress.processedBytes / progress.elapsedTime) * 1000; // bytes per second
  }

  // Format progress message
  formatProgressMessage(progress: OperationProgress): string {
    const { status, completedFiles, totalFiles, currentFile, message } = progress;

    switch (status) {
      case "pending":
        return "等待开始...";
      case "preparing":
        return "准备中...";
      case "processing":
        if (currentFile) {
          return `处理中: ${currentFile.name} (${completedFiles}/${totalFiles})`;
        }
        return `处理中... (${completedFiles}/${totalFiles})`;
      case "completed":
        return "已完成";
      case "failed":
        return `失败: ${progress.lastError || "未知错误"}`;
      case "cancelled":
        return "已取消";
      case "paused":
        return "已暂停";
      default:
        return message || "处理中...";
    }
  }

  // Get progress percentage
  getProgressPercentage(progress: OperationProgress): number {
    if (progress.totalFiles === 0) return 0;
    return (progress.completedFiles / progress.totalFiles) * 100;
  }
}

// Error handling utilities
export class BulkOperationErrorHandler {
  private errorHistory: Array<{
    timestamp: Date;
    operationId: string;
    operationType: BulkOperationType;
    error: Error;
    context: Record<string, any>;
  }> = [];

  // Handle operation error
  handleError(
    error: Error,
    operationId: string,
    operationType: BulkOperationType,
    context: Record<string, any> = {}
  ): {
    shouldRetry: boolean;
    retryDelay: number;
    userMessage: string;
    technicalDetails: string;
  } {
    // Store error in history
    this.errorHistory.push({
      timestamp: new Date(),
      operationId,
      operationType,
      error,
      context,
    });

    // Limit error history size
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-500);
    }

    // Analyze error and determine response
    return this.analyzeError(error, operationType, context);
  }

  // Analyze error and determine appropriate response
  private analyzeError(
    error: Error,
    operationType: BulkOperationType,
    context: Record<string, any>
  ): {
    shouldRetry: boolean;
    retryDelay: number;
    userMessage: string;
    technicalDetails: string;
  } {
    const errorMessage = error.message.toLowerCase();

    // Network-related errors
    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return {
        shouldRetry: true,
        retryDelay: 2000,
        userMessage: "网络连接出现问题，正在重试...",
        technicalDetails: `Network error: ${error.message}`,
      };
    }

    // Timeout errors
    if (errorMessage.includes("timeout")) {
      return {
        shouldRetry: true,
        retryDelay: 5000,
        userMessage: "操作超时，正在重试...",
        technicalDetails: `Timeout error: ${error.message}`,
      };
    }

    // File not found errors
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return {
        shouldRetry: false,
        retryDelay: 0,
        userMessage: "文件未找到或已被删除",
        technicalDetails: `File not found: ${error.message}`,
      };
    }

    // Permission errors
    if (errorMessage.includes("permission") || errorMessage.includes("403")) {
      return {
        shouldRetry: false,
        retryDelay: 0,
        userMessage: "权限不足，无法执行此操作",
        technicalDetails: `Permission denied: ${error.message}`,
      };
    }

    // Storage quota errors
    if (errorMessage.includes("quota") || errorMessage.includes("storage")) {
      return {
        shouldRetry: false,
        retryDelay: 0,
        userMessage: "存储空间不足，请清理后重试",
        technicalDetails: `Storage quota exceeded: ${error.message}`,
      };
    }

    // Transcription service errors
    if (operationType === "transcribe") {
      if (errorMessage.includes("groq") || errorMessage.includes("api")) {
        return {
          shouldRetry: true,
          retryDelay: 10000,
          userMessage: "转录服务暂时不可用，正在重试...",
          technicalDetails: `Transcription service error: ${error.message}`,
        };
      }

      if (errorMessage.includes("audio")) {
        return {
          shouldRetry: false,
          retryDelay: 0,
          userMessage: "音频文件格式不支持或已损坏",
          technicalDetails: `Audio processing error: ${error.message}`,
        };
      }
    }

    // Default error handling
    return {
      shouldRetry: true,
      retryDelay: 3000,
      userMessage: "操作失败，正在重试...",
      technicalDetails: `Unknown error: ${error.message}`,
    };
  }

  // Get error history
  getErrorHistory(): typeof this.errorHistory {
    return [...this.errorHistory];
  }

  // Get errors for a specific operation
  getOperationErrors(operationId: string): typeof this.errorHistory {
    return this.errorHistory.filter(error => error.operationId === operationId);
  }

  // Clear error history
  clearErrorHistory(): void {
    this.errorHistory = [];
  }
}

// Mobile optimization utilities
export class MobileOptimizer {
  private networkInfo: {
    type: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } | null = null;

  private batteryInfo: {
    level: number;
    charging: boolean;
  } | null = null;

  private memoryInfo: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null = null;

  constructor() {
    this.initializeNetworkInfo();
    this.initializeBatteryInfo();
    this.initializeMemoryInfo();
  }

  // Initialize network information
  private async initializeNetworkInfo(): Promise<void> {
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      this.networkInfo = {
        type: connection.type || "unknown",
        effectiveType: connection.effectiveType || "unknown",
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      };

      connection.addEventListener("change", () => {
        this.updateNetworkInfo();
      });
    }
  }

  // Update network information
  private updateNetworkInfo(): void {
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      this.networkInfo = {
        type: connection.type || "unknown",
        effectiveType: connection.effectiveType || "unknown",
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      };
    }
  }

  // Initialize battery information
  private async initializeBatteryInfo(): Promise<void> {
    if ("getBattery" in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.batteryInfo = {
          level: battery.level,
          charging: battery.charging,
        };

        battery.addEventListener("levelchange", () => {
          this.updateBatteryInfo(battery);
        });

        battery.addEventListener("chargingchange", () => {
          this.updateBatteryInfo(battery);
        });
      } catch (error) {
        console.warn("Battery API not available:", error);
      }
    }
  }

  // Update battery information
  private updateBatteryInfo(battery: any): void {
    this.batteryInfo = {
      level: battery.level,
      charging: battery.charging,
    };
  }

  // Initialize memory information
  private initializeMemoryInfo(): void {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      this.memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
  }

  // Optimize operation configuration for mobile
  optimizeOperationConfig(
    config: BulkOperationConfig,
    optimizations: Partial<MobileOptimizations>
  ): BulkOperationConfig {
    const optimizedConfig = { ...config };

    // Network optimizations
    if (optimizations.optimizeForMobileData && this.isMobileData()) {
      optimizedConfig.enableChunking = true;
      optimizedConfig.chunkSize = Math.min(config.chunkSize || 1024 * 1024, 512 * 1024); // Max 512KB chunks
      optimizedConfig.maxConcurrency = Math.min(config.maxConcurrency || 3, 1); // Single thread on mobile data
      optimizedConfig.enableBackgroundProcessing = false; // Disable background processing on mobile data
    }

    // Battery optimizations
    if (optimizations.enableBatteryOptimization && this.isLowBattery()) {
      optimizedConfig.maxConcurrency = Math.min(config.maxConcurrency || 3, 1);
      optimizedConfig.enableBackgroundProcessing = false;
      if (optimizations.reduceQualityOnLowBattery) {
        // Reduce quality for transcription operations
        // This would need to be implemented in the actual transcription service
      }
    }

    // Memory optimizations
    if (optimizations.enableMemoryOptimization && this.isLowMemory()) {
      optimizedConfig.enableChunking = true;
      optimizedConfig.chunkSize = Math.min(config.chunkSize || 1024 * 1024, 256 * 1024); // Smaller chunks
      optimizedConfig.maxConcurrency = 1; // Single thread to reduce memory usage
    }

    return optimizedConfig;
  }

  // Check if on mobile data
  isMobileData(): boolean {
    return this.networkInfo?.effectiveType === "slow-2g" ||
           this.networkInfo?.effectiveType === "2g" ||
           this.networkInfo?.effectiveType === "3g" ||
           this.networkInfo?.saveData === true;
  }

  // Check if battery is low
  isLowBattery(): boolean {
    return this.batteryInfo !== null &&
           this.batteryInfo.level < 0.2 &&
           !this.batteryInfo.charging;
  }

  // Check if memory is low
  isLowMemory(): boolean {
    if (!this.memoryInfo) return false;

    const memoryUsageRatio = this.memoryInfo.usedJSHeapSize / this.memoryInfo.jsHeapSizeLimit;
    return memoryUsageRatio > 0.8;
  }

  // Get network quality
  getNetworkQuality(): "excellent" | "good" | "fair" | "poor" {
    if (!this.networkInfo) return "fair";

    switch (this.networkInfo.effectiveType) {
      case "4g":
        return "excellent";
      case "3g":
        return "good";
      case "2g":
        return "fair";
      case "slow-2g":
        return "poor";
      default:
        return "fair";
    }
  }

  // Should pause operation
  shouldPauseOperation(): boolean {
    return this.isLowBattery() || this.isMobileData() || this.isLowMemory();
  }

  // Get recommended chunk size
  getRecommendedChunkSize(): number {
    const networkQuality = this.getNetworkQuality();

    switch (networkQuality) {
      case "excellent":
        return 2 * 1024 * 1024; // 2MB
      case "good":
        return 1 * 1024 * 1024; // 1MB
      case "fair":
        return 512 * 1024; // 512KB
      case "poor":
        return 256 * 1024; // 256KB
      default:
        return 1 * 1024 * 1024; // 1MB
    }
  }

  // Get recommended concurrency
  getRecommendedConcurrency(): number {
    if (this.isLowMemory()) return 1;
    if (this.isMobileData()) return 1;
    if (this.isLowBattery()) return 1;

    const networkQuality = this.getNetworkQuality();
    switch (networkQuality) {
      case "excellent":
        return 3;
      case "good":
        return 2;
      case "fair":
        return 1;
      case "poor":
        return 1;
      default:
        return 2;
    }
  }
}

// File operation utilities
export class FileOperationUtils {
  // Format file size
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  // Format duration
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Format operation progress
  static formatOperationProgress(progress: OperationProgress): {
    percentage: number;
    formattedTime: string;
    formattedSize: string;
    statusText: string;
    isComplete: boolean;
    hasError: boolean;
  } {
    const percentage = progress.totalFiles > 0
      ? Math.round((progress.completedFiles / progress.totalFiles) * 100)
      : 0;

    const formattedTime = FileOperationUtils.formatDuration(progress.elapsedTime);
    const formattedSize = FileOperationUtils.formatFileSize(progress.processedBytes);

    let statusText = "";
    switch (progress.status) {
      case "pending":
        statusText = "等待开始";
        break;
      case "preparing":
        statusText = "准备中";
        break;
      case "processing":
        statusText = `处理中 ${progress.completedFiles}/${progress.totalFiles}`;
        break;
      case "completed":
        statusText = "已完成";
        break;
      case "failed":
        statusText = `失败: ${progress.lastError || "未知错误"}`;
        break;
      case "cancelled":
        statusText = "已取消";
        break;
      case "paused":
        statusText = "已暂停";
        break;
      default:
        statusText = progress.message || "处理中";
    }

    return {
      percentage,
      formattedTime,
      formattedSize,
      statusText,
      isComplete: progress.status === "completed",
      hasError: progress.status === "failed",
    };
  }

  // Get file type information
  static getFileTypeInfo(fileName: string): {
    type: "audio" | "video" | "document" | "other";
    category: string;
    canTranscribe: boolean;
  } {
    const extension = fileName.split(".").pop()?.toLowerCase();

    const audioTypes = ["mp3", "wav", "m4a", "aac", "flac", "ogg", "wma"];
    const videoTypes = ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv"];
    const documentTypes = ["pdf", "doc", "docx", "txt", "rtf"];

    if (audioTypes.includes(extension || "")) {
      return {
        type: "audio",
        category: "音频文件",
        canTranscribe: true,
      };
    } else if (videoTypes.includes(extension || "")) {
      return {
        type: "video",
        category: "视频文件",
        canTranscribe: true,
      };
    } else if (documentTypes.includes(extension || "")) {
      return {
        type: "document",
        category: "文档文件",
        canTranscribe: false,
      };
    } else {
      return {
        type: "other",
        category: "其他文件",
        canTranscribe: false,
      };
    }
  }

  // Check if file requires chunking
  static requiresChunking(fileSize: number, threshold: number = 10 * 1024 * 1024): boolean {
    return fileSize > threshold;
  }

  // Calculate estimated processing time
  static calculateEstimatedProcessingTime(
    files: FileInfo[],
    operationType: BulkOperationType
  ): number {
    let totalTime = 0;

    files.forEach(file => {
      const sizeMB = (file.size || 0) / (1024 * 1024);

      switch (operationType) {
        case "delete":
          // Deleting is fast - base time + small per-file overhead
          totalTime += 100 + (sizeMB > 100 ? 50 : 0);
          break;
        case "transcribe":
          // Transcription is slower - depends on file size and duration
          const duration = file.duration || 0;
          totalTime += duration * 1000; // Assume real-time processing
          totalTime += sizeMB * 1000; // Add upload time
          break;
        case "download":
          // Download depends on file size
          totalTime += sizeMB * 2000; // Assume 0.5MB/s download speed
          break;
        case "copy":
          // Copy is faster than download
          totalTime += sizeMB * 500;
          break;
        default:
          totalTime += sizeMB * 1000;
      }
    });

    return totalTime;
  }

  // Create operation summary
  static createOperationSummary(
    files: FileInfo[],
    operationType: BulkOperationType
  ): {
    totalFiles: number;
    totalSize: string;
    estimatedTime: string;
    canProcess: boolean;
    warnings: string[];
  } {
    const totalFiles = files.length;
    const totalSize = FileOperationUtils.formatFileSize(
      files.reduce((sum, file) => sum + (file.size || 0), 0)
    );

    const estimatedTimeMs = FileOperationUtils.calculateEstimatedProcessingTime(files, operationType);
    const estimatedTime = FileOperationUtils.formatDuration(estimatedTimeMs);

    const warnings: string[] = [];
    let canProcess = true;

    // Check for issues
    const largeFiles = files.filter(file => (file.size || 0) > 100 * 1024 * 1024);
    if (largeFiles.length > 0) {
      warnings.push(`${largeFiles.length} 个文件超过 100MB，处理时间可能较长`);
    }

    if (operationType === "transcribe") {
      const nonTranscribableFiles = files.filter(file => !file.canTranscribe);
      if (nonTranscribableFiles.length > 0) {
        warnings.push(`${nonTranscribableFiles.length} 个文件不支持转录`);
        canProcess = files.length > nonTranscribableFiles.length;
      }
    }

    return {
      totalFiles,
      totalSize,
      estimatedTime,
      canProcess,
      warnings,
    };
  }
}

// Touch interaction utilities
export class TouchUtils {
  // Detect touch device
  static isTouchDevice(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  // Get touch position
  static getTouchPosition(event: React.TouchEvent): { x: number; y: number } {
    const touch = event.touches[0];
    return {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  // Calculate swipe distance
  static calculateSwipeDistance(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): { distance: number; direction: "left" | "right" | "up" | "down" } {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let direction: "left" | "right" | "up" | "down";

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? "right" : "left";
    } else {
      direction = deltaY > 0 ? "down" : "up";
    }

    return { distance, direction };
  }

  // Trigger haptic feedback
  static triggerHapticFeedback(type: "light" | "medium" | "heavy" = "light"): void {
    if ("vibrate" in navigator) {
      const patterns = {
        light: 10,
        medium: 25,
        heavy: 50,
      };

      navigator.vibrate(patterns[type]);
    }
  }

  // Check if element is in viewport
  static isInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  // Scroll element into view
  static scrollIntoView(element: HTMLElement, options?: ScrollIntoViewOptions): void {
    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      ...options,
    });
  }
}

// Export singleton instances
export const progressTracker = new ProgressTracker();
export const errorHandler = new BulkOperationErrorHandler();
export const mobileOptimizer = new MobileOptimizer();
