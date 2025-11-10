/**
 * Chunked File Upload System with Automatic Resume Capability
 *
 * This module provides a robust chunked upload system that can handle large files
 * and network interruptions with automatic resume capability.
 */

import type {
  ChunkInfo,
  UploadSession,
  UploadConfig,
  NetworkCondition,
  UploadProgress,
  ChunkUploadResponse,
  UploadError,
  UploadEvent,
  PerformanceMetrics,
  ChunkedUploaderOptions,
  ChunkManagerConfig,
  NetworkOptimizerConfig,
  ResumeManagerConfig,
} from "@/types/upload";

import { ChunkManager } from "./chunk-manager";
import { ResumeManager } from "./resume-manager";
import { NetworkOptimizer } from "./network-optimizer";

// Default configuration
const DEFAULT_CONFIG: UploadConfig = {
  chunkSize: 1024 * 1024, // 1MB
  maxConcurrentUploads: 3,
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoffMultiplier: 2,
  networkTimeout: 30000,
  enableResume: true,
  enableAdaptiveChunking: true,
  minChunkSize: 256 * 1024, // 256KB
  maxChunkSize: 10 * 1024 * 1024, // 10MB
  verifyChunks: true,
  compressionEnabled: false,
  endpointUrl: "/api/upload/chunk",
};

export class ChunkedUploader {
  private config: UploadConfig;
  private options: ChunkedUploaderOptions;
  private sessions: Map<string, UploadSession> = new Map();
  private chunkManager: ChunkManager;
  private resumeManager: ResumeManager;
  private networkOptimizer: NetworkOptimizer;
  private eventListeners: Map<string, Function[]> = new Map();
  private isDestroyed = false;
  private uploadQueue: string[] = [];
  private activeUploads: Set<string> = new Set();

  constructor(options: ChunkedUploaderOptions = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.options = { ...options };

    // Initialize managers
    this.chunkManager = new ChunkManager({
      maxSize: this.config.maxChunkSize,
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      gcThreshold: 0.8,
      enableCompression: this.config.compressionEnabled,
      compressionLevel: 6,
    });

    this.resumeManager = new ResumeManager({
      storageKey: "chunked-uploader-resume",
      maxStorageSize: 10 * 1024 * 1024, // 10MB
      cleanupInterval: 3600000, // 1 hour
      maxResumeAge: 86400000, // 24 hours
      encryptionEnabled: false,
    });

    this.networkOptimizer = new NetworkOptimizer({
      enableAdaptiveSizing: this.config.enableAdaptiveChunking,
      networkCheckInterval: 30000, // 30 seconds
      speedThresholds: {
        slow: 1, // 1 Mbps
        medium: 5, // 5 Mbps
        fast: 10, // 10 Mbps
      },
      chunkSizeMapping: {
        slow: 512 * 1024, // 512KB
        medium: 1024 * 1024, // 1MB
        fast: 2 * 1024 * 1024, // 2MB
      },
    });

    // Load existing sessions from resume manager
    this.loadExistingSessions();

    // Start network monitoring
    this.startNetworkMonitoring();

    this.log("ChunkedUploader initialized", { config: this.config });
  }

  /**
   * Start uploading a file
   */
  public async uploadFile(
    file: File,
    customConfig?: Partial<UploadConfig>
  ): Promise<string> {
    const sessionId = this.generateSessionId(file);
    const config = { ...this.config, ...customConfig };

    // Create upload session
    const session: UploadSession = {
      id: sessionId,
      fileId: this.generateFileId(file),
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks: Math.ceil(file.size / config.chunkSize),
      uploadedChunks: 0,
      uploadedSize: 0,
      status: 'preparing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chunks: new Map(),
      metadata: {
        lastModified: file.lastModified,
        customData: {},
      },
      config,
    };

    // Store session
    this.sessions.set(sessionId, session);

    try {
      // Emit start event
      this.emitEvent("start", sessionId, { file });

      // Check for existing resume state
      if (config.enableResume) {
        const resumeState = await this.resumeManager.loadResumeState(sessionId);
        if (resumeState) {
          this.log("Resuming upload", { sessionId, resumeState });
          await this.resumeUpload(session, resumeState);
        } else {
          await this.startNewUpload(session, file);
        }
      } else {
        await this.startNewUpload(session, file);
      }

      return sessionId;
    } catch (error) {
      const uploadError = this.createUploadError(error, sessionId);
      this.handleError(uploadError);
      throw uploadError;
    }
  }

  /**
   * Pause an upload session
   */
  public async pauseUpload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status === 'uploading') {
      session.status = 'paused';
      session.updatedAt = Date.now();

      // Remove from active uploads
      this.activeUploads.delete(sessionId);

      // Save current state for resume
      if (session.config.enableResume) {
        await this.saveResumeState(session);
      }

      this.emitEvent("pause", sessionId);
      this.options.onPause?.(sessionId);

      this.log("Upload paused", { sessionId });
    }
  }

  /**
   * Resume a paused upload
   */
  public async resumeUpload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status === 'paused') {
      session.status = 'uploading';
      session.updatedAt = Date.now();

      // Add back to active uploads
      this.activeUploads.add(sessionId);

      // Continue processing chunks
      this.processUploadQueue(sessionId);

      this.emitEvent("resume", sessionId);
      this.options.onResume?.(sessionId);

      this.log("Upload resumed", { sessionId });
    }
  }

  /**
   * Cancel an upload session
   */
  public async cancelUpload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'cancelled';
    session.updatedAt = Date.now();

    // Remove from active uploads and queue
    this.activeUploads.delete(sessionId);
    this.uploadQueue = this.uploadQueue.filter(id => id !== sessionId);

    // Cancel ongoing chunk uploads
    await this.chunkManager.cancelChunkUploads(sessionId);

    // Remove resume state
    await this.resumeManager.removeResumeState(sessionId);

    this.emitEvent("cancel", sessionId);
    this.options.onCancel?.(sessionId);

    this.log("Upload cancelled", { sessionId });
  }

  /**
   * Get upload progress
   */
  public getProgress(sessionId: string): UploadProgress | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const completedChunks = Array.from(session.chunks.values())
      .filter(chunk => chunk.status === 'completed')
      .length;

    const uploadedSize = Array.from(session.chunks.values())
      .filter(chunk => chunk.status === 'completed')
      .reduce((total, chunk) => total + chunk.size, 0);

    const progress: UploadProgress = {
      sessionId,
      fileId: session.fileId,
      fileName: session.fileName,
      loaded: uploadedSize,
      total: session.fileSize,
      percentage: (uploadedSize / session.fileSize) * 100,
      speed: this.calculateUploadSpeed(session),
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(session, uploadedSize),
      chunksCompleted: completedChunks,
      totalChunks: session.totalChunks,
      stage: this.getUploadStage(session),
    };

    return progress;
  }

  /**
   * Get session information
   */
  public getSession(sessionId: string): UploadSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): UploadSession[] {
    return Array.from(this.sessions.values())
      .filter(session => ['preparing', 'uploading', 'paused'].includes(session.status));
  }

  /**
   * Clean up resources and destroy uploader
   */
  public destroy(): void {
    this.isDestroyed = true;

    // Cancel all active uploads
    this.activeUploads.forEach(sessionId => {
      this.cancelUpload(sessionId).catch(error => {
        this.log("Error cancelling upload during destroy", { sessionId, error });
      });
    });

    // Destroy managers
    this.chunkManager.destroy();
    this.resumeManager.destroy();
    this.networkOptimizer.destroy();

    // Clear data
    this.sessions.clear();
    this.eventListeners.clear();
    this.uploadQueue = [];
    this.activeUploads.clear();

    this.log("ChunkedUploader destroyed");
  }

  /**
   * Add event listener
   */
  public addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private methods

  private async startNewUpload(session: UploadSession, file: File): Promise<void> {
    session.status = 'uploading';

    // Create chunks
    const chunks = await this.chunkManager.createChunks(file, session.config);
    chunks.forEach(chunk => {
      session.chunks.set(chunk.id, chunk);
    });

    // Start processing chunks
    this.addToQueue(session.id);
    this.processUploadQueue(session.id);

    // Save initial state
    if (session.config.enableResume) {
      await this.saveResumeState(session);
    }
  }

  private async resumeUpload(session: UploadSession, resumeState: any): Promise<void> {
    // Restore session state from resume state
    session.uploadedChunks = resumeState.uploadProgress.chunksCompleted;
    session.uploadedSize = resumeState.uploadProgress.loaded;
    session.status = 'uploading';

    // Create chunks that weren't completed
    const file = await this.getFileFromBlob(resumeState.fileData);
    const completedChunkIds = new Set(resumeState.completedChunks);

    const chunks = await this.chunkManager.createChunks(file, session.config);
    chunks.forEach(chunk => {
      if (completedChunkIds.has(chunk.id)) {
        chunk.status = 'completed';
        chunk.uploadCompletedAt = Date.now();
      }
      session.chunks.set(chunk.id, chunk);
    });

    // Resume processing
    this.addToQueue(session.id);
    this.processUploadQueue(session.id);
  }

  private async processUploadQueue(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'uploading' || this.isDestroyed) {
      return;
    }

    // Check concurrent upload limit
    const concurrentUploads = Array.from(this.activeUploads).filter(id => id !== sessionId).length;
    if (concurrentUploads >= session.config.maxConcurrentUploads) {
      this.addToQueue(sessionId); // Add back to queue
      return;
    }

    // Get pending chunks
    const pendingChunks = Array.from(session.chunks.values())
      .filter(chunk => chunk.status === 'pending')
      .sort((a, b) => a.index - b.index);

    if (pendingChunks.length === 0) {
      // Check if upload is complete
      const completedChunks = Array.from(session.chunks.values())
        .filter(chunk => chunk.status === 'completed');

      if (completedChunks.length === session.totalChunks) {
        await this.completeUpload(sessionId);
      }
      return;
    }

    // Start concurrent uploads
    const uploadPromises: Promise<void>[] = [];
    const maxConcurrent = Math.min(
      session.config.maxConcurrentUploads - concurrentUploads,
      pendingChunks.length
    );

    for (let i = 0; i < maxConcurrent; i++) {
      const chunk = pendingChunks[i];
      if (chunk) {
        uploadPromises.push(this.uploadChunk(sessionId, chunk));
      }
    }

    // Wait for at least one upload to complete before continuing
    try {
      await Promise.race(uploadPromises);

      // Continue processing
      if (session.status === 'uploading') {
        setTimeout(() => this.processUploadQueue(sessionId), 100);
      }
    } catch (error) {
      this.log("Error in upload queue processing", { sessionId, error });
    }
  }

  private async uploadChunk(sessionId: string, chunk: ChunkInfo): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || this.isDestroyed) {
      return;
    }

    chunk.status = 'uploading';
    chunk.uploadStartedAt = Date.now();
    chunk.retryCount++;

    try {
      this.log("Uploading chunk", { sessionId, chunkId: chunk.id, index: chunk.index });

      // Get chunk data
      const chunkData = await this.chunkManager.getChunkData(chunk);

      // Upload chunk
      const response = await this.performChunkUpload(session, chunk, chunkData);

      if (response.success) {
        chunk.status = 'completed';
        chunk.uploadCompletedAt = Date.now();
        session.uploadedChunks++;
        session.uploadedSize += chunk.size;
        session.updatedAt = Date.now();

        // Update progress
        const progress = this.getProgress(sessionId);
        if (progress) {
          this.options.onProgress?.(progress);
          this.emitEvent("progress", sessionId, progress);
        }

        // Emit chunk complete event
        this.emitEvent("chunk_complete", sessionId, chunk);
        this.options.onChunkComplete?.(chunk);

        // Save state for resume
        if (session.config.enableResume) {
          await this.saveResumeState(session);
        }

        this.log("Chunk uploaded successfully", { sessionId, chunkId: chunk.id });
      } else {
        throw new Error(response.error || 'Chunk upload failed');
      }
    } catch (error) {
      const uploadError = this.createUploadError(error, sessionId, chunk.id);

      if (chunk.retryCount < session.config.maxRetries && uploadError.retryable) {
        chunk.status = 'retrying';

        // Calculate retry delay with exponential backoff
        const delay = session.config.retryDelay * Math.pow(session.config.retryBackoffMultiplier, chunk.retryCount);

        this.log("Retrying chunk upload", {
          sessionId,
          chunkId: chunk.id,
          attempt: chunk.retryCount,
          delay
        });

        // Schedule retry
        setTimeout(() => {
          if (session.status === 'uploading') {
            this.uploadChunk(sessionId, chunk).catch(err => {
              this.log("Chunk retry failed", { sessionId, chunkId: chunk.id, error: err });
            });
          }
        }, delay);
      } else {
        chunk.status = 'failed';
        chunk.error = uploadError.message;

        this.emitEvent("chunk_failed", sessionId, { chunk, error: uploadError });
        this.options.onChunkFailed?.(chunk, uploadError);

        // Handle upload error
        this.handleError(uploadError);
      }
    }
  }

  private async performChunkUpload(
    session: UploadSession,
    chunk: ChunkInfo,
    data: Blob
  ): Promise<ChunkUploadResponse> {
    const formData = new FormData();
    formData.append('sessionId', session.id);
    formData.append('fileId', session.fileId);
    formData.append('chunkId', chunk.id);
    formData.append('chunkIndex', chunk.index.toString());
    formData.append('chunkStart', chunk.start.toString());
    formData.append('chunkEnd', chunk.end.toString());
    formData.append('totalChunks', session.totalChunks.toString());
    formData.append('fileName', session.fileName);
    formData.append('fileSize', session.fileSize.toString());
    formData.append('fileType', session.fileType);
    formData.append('chunk', data);

    const response = await fetch(session.config.endpointUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(session.config.networkTimeout),
      headers: {
        ...session.config.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async completeUpload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'completed';
    session.completedAt = Date.now();
    session.updatedAt = Date.now();

    // Remove from active uploads
    this.activeUploads.delete(sessionId);

    // Clean up resume state
    await this.resumeManager.removeResumeState(sessionId);

    // Notify server to assemble file
    await this.notifyUploadComplete(session);

    // Emit completion event
    this.emitEvent("complete", sessionId, { session });
    this.options.onComplete?.(sessionId, session);

    this.log("Upload completed", { sessionId });
  }

  private async notifyUploadComplete(session: UploadSession): Promise<void> {
    const response = await fetch("/api/upload/complete", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...session.config.headers,
      },
      body: JSON.stringify({
        sessionId: session.id,
        fileId: session.fileId,
        fileName: session.fileName,
        fileSize: session.fileSize,
        totalChunks: session.totalChunks,
        metadata: session.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to notify upload completion: ${response.statusText}`);
    }

    return response.json();
  }

  private handleError(error: UploadError): void {
    this.emitEvent("error", error.sessionId, error);
    this.options.onError?.(error);

    this.log("Upload error", {
      sessionId: error.sessionId,
      error: error.message,
      code: error.code
    });
  }

  private createUploadError(
    error: any,
    sessionId: string,
    chunkId?: string
  ): UploadError {
    const uploadError: UploadError = {
      name: 'UploadError',
      message: error?.message || 'Unknown upload error',
      code: error?.code || 'UPLOAD_ERROR',
      sessionId,
      chunkId,
      retryable: false,
      recoverable: true,
      metadata: error?.metadata,
    };

    // Determine error characteristics
    if (error?.name === 'TypeError' && error?.message.includes('network')) {
      uploadError.code = 'NETWORK_ERROR';
      uploadError.retryable = true;
    } else if (error?.name === 'AbortError') {
      uploadError.code = 'UPLOAD_CANCELLED';
      uploadError.retryable = false;
    } else if (error?.message.includes('timeout')) {
      uploadError.code = 'TIMEOUT_ERROR';
      uploadError.retryable = true;
    } else if (error?.message.includes('413')) {
      uploadError.code = 'FILE_TOO_LARGE';
      uploadError.retryable = false;
    } else if (error?.message.includes('401') || error?.message.includes('403')) {
      uploadError.code = 'AUTHENTICATION_ERROR';
      uploadError.retryable = false;
    }

    return uploadError;
  }

  private async saveResumeState(session: UploadSession): Promise<void> {
    if (!session.config.enableResume) {
      return;
    }

    const completedChunks = Array.from(session.chunks.values())
      .filter(chunk => chunk.status === 'completed')
      .map(chunk => chunk.id);

    const failedChunks = Array.from(session.chunks.values())
      .filter(chunk => chunk.status === 'failed')
      .map(chunk => chunk.id);

    const resumeState = {
      sessionId: session.id,
      completedChunks,
      failedChunks,
      uploadProgress: this.getProgress(session.id),
      lastSavedAt: Date.now(),
      config: session.config,
    };

    await this.resumeManager.saveResumeState(session.id, resumeState);
  }

  private async loadExistingSessions(): Promise<void> {
    try {
      const resumeStates = await this.resumeManager.getAllResumeStates();

      for (const [sessionId, resumeState] of resumeStates) {
        // Check if resume state is still valid
        if (Date.now() - resumeState.lastSavedAt < 86400000) { // 24 hours
          // Recreate session from resume state
          const session: UploadSession = {
            id: sessionId,
            fileId: resumeState.uploadProgress.fileId,
            fileName: resumeState.uploadProgress.fileName,
            fileSize: resumeState.uploadProgress.total,
            fileType: '', // Would need to be stored in resume state
            totalChunks: resumeState.uploadProgress.totalChunks,
            uploadedChunks: resumeState.uploadProgress.chunksCompleted,
            uploadedSize: resumeState.uploadProgress.loaded,
            status: 'paused', // Resume in paused state
            createdAt: resumeState.lastSavedAt,
            updatedAt: resumeState.lastSavedAt,
            chunks: new Map(),
            metadata: {},
            config: resumeState.config,
          };

          this.sessions.set(sessionId, session);
        }
      }
    } catch (error) {
      this.log("Error loading existing sessions", { error });
    }
  }

  private startNetworkMonitoring(): void {
    this.networkOptimizer.startMonitoring((networkCondition) => {
      this.log("Network condition changed", { networkCondition });

      // Adjust chunk sizes based on network conditions
      if (networkCondition.type === 'cellular') {
        // Reduce chunk size for cellular connections
        this.config.chunkSize = Math.min(this.config.chunkSize, 512 * 1024);
      }

      // Handle network disconnection
      if (networkCondition.effectiveType === 'slow-2g') {
        // Pause uploads on very slow connections
        this.getActiveSessions().forEach(session => {
          if (session.status === 'uploading') {
            this.pauseUpload(session.id).catch(error => {
              this.log("Error pausing upload due to network conditions", {
                sessionId: session.id,
                error
              });
            });
          }
        });
      }
    });
  }

  private calculateUploadSpeed(session: UploadSession): number {
    const uploadedChunks = Array.from(session.chunks.values())
      .filter(chunk => chunk.status === 'completed' && chunk.uploadStartedAt && chunk.uploadCompletedAt);

    if (uploadedChunks.length === 0) {
      return 0;
    }

    const totalTime = uploadedChunks.reduce((total, chunk) => {
      return total + (chunk.uploadCompletedAt! - chunk.uploadStartedAt!);
    }, 0);

    const totalBytes = uploadedChunks.reduce((total, chunk) => total + chunk.size, 0);

    return totalTime > 0 ? (totalBytes / totalTime) * 1000 : 0; // bytes per second
  }

  private calculateEstimatedTimeRemaining(
    session: UploadSession,
    uploadedSize: number
  ): number {
    const uploadSpeed = this.calculateUploadSpeed(session);
    const remainingSize = session.fileSize - uploadedSize;

    return uploadSpeed > 0 ? remainingSize / uploadSpeed : 0;
  }

  private getUploadStage(session: UploadSession): UploadProgress['stage'] {
    const completedChunks = Array.from(session.chunks.values())
      .filter(chunk => chunk.status === 'completed').length;

    if (session.status === 'preparing') {
      return 'preparing';
    } else if (session.status === 'uploading') {
      if (completedChunks === session.totalChunks) {
        return 'verifying';
      }
      return 'uploading';
    } else if (session.status === 'completed') {
      return 'completed';
    } else {
      return 'error';
    }
  }

  private addToQueue(sessionId: string): void {
    if (!this.uploadQueue.includes(sessionId)) {
      this.uploadQueue.push(sessionId);
    }
  }

  private emitEvent(type: string, sessionId: string, data?: any): void {
    const event: UploadEvent = {
      type: type as any,
      sessionId,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          this.log("Error in event listener", { type, error });
        }
      });
    }
  }

  private generateSessionId(file: File): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const fileHash = this.hashFile(file);
    return `upload_${timestamp}_${random}_${fileHash}`;
  }

  private generateFileId(file: File): string {
    return `file_${Date.now()}_${this.hashFile(file)}`;
  }

  private async hashFile(file: File): Promise<string> {
    // Simple hash implementation for demonstration
    // In production, use a proper hashing algorithm
    const buffer = await file.slice(0, 1024).arrayBuffer();
    const view = new Uint8Array(buffer);
    let hash = 0;
    for (let i = 0; i < view.length; i++) {
      hash = ((hash << 5) - hash + view[i]) & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
  }

  private async getFileFromBlob(fileData: any): Promise<File> {
    // This would need to be implemented based on how file data is stored
    // For now, return a placeholder
    throw new Error("File restoration not implemented");
  }

  private log(message: string, data?: any): void {
    if (this.options.enableLogging !== false) {
      console.log(`[ChunkedUploader] ${message}`, data);
    }
  }
}

export default ChunkedUploader;
