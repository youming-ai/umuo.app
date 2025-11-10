/**
 * Mobile performance optimization integration with existing components
 * Connects performance optimization system with mobile components and audio player
 */

import {
  mobilePerformanceMonitor,
  deviceProfiler,
  performanceOptimizer,
  memoryManager,
  animationOptimizer,
  initializeMobilePerformanceOptimization,
  cleanupMobilePerformanceOptimization,
  getPerformanceDebugInfo
} from './mobile-optimization';

import { MobileDetector } from '@/types/mobile';
import { mobileOptimizer } from '@/lib/mobile/optimization';
import { performanceMonitor } from './performance-monitor';
import { TouchFeedbackManager } from '@/lib/mobile/touch-feedback/TouchFeedbackManager';
import { MultiTouchManager } from '@/lib/mobile/touch-feedback/MultiTouchManager';

// Integration interfaces
export interface ComponentPerformanceConfig {
  componentType: 'audio-player' | 'file-upload' | 'touch-feedback' | 'gesture-recognition' | 'ui-component';
  priority: 'critical' | 'high' | 'normal' | 'low';
  optimizations: string[];
  monitoringEnabled: boolean;
}

export interface AudioPlayerPerformanceConfig extends ComponentPerformanceConfig {
  bufferSize: number;
  preloadSegments: number;
  maxConcurrentDecodes: number;
  enableSpectrumAnalysis: boolean;
  enableWaveformRendering: boolean;
}

export interface FileUploadPerformanceConfig extends ComponentPerformanceConfig {
  maxChunkSize: number;
  concurrentUploads: number;
  enableCompression: boolean;
  enableProgressiveUpload: boolean;
}

// Component-specific performance managers
export class AudioPlayerPerformanceManager {
  private config: AudioPlayerPerformanceConfig;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private spectrumData: Float32Array | null = null;
  private waveformCache: Map<string, ImageData> = new Map();
  private isPlaying: boolean = false;

  constructor(config: AudioPlayerPerformanceConfig) {
    this.config = config;
    this.setupPerformanceOptimizations();
  }

  private setupPerformanceOptimizations(): void {
    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Adjust buffer sizes based on device capabilities
    if (deviceProfile.capabilities.memory === 'limited') {
      this.config.bufferSize = Math.min(this.config.bufferSize, 4096);
      this.config.preloadSegments = Math.min(this.config.preloadSegments, 2);
    }

    // Disable expensive features on low-end devices
    if (deviceProfile.class === 'low-end') {
      this.config.enableSpectrumAnalysis = false;
      this.config.enableWaveformRendering = false;
    }

    // Register audio buffers with memory manager
    this.registerAudioBuffers();
  }

  private registerAudioBuffers(): void {
    for (let i = 0; i < this.config.preloadSegments; i++) {
      const bufferId = memoryManager.allocate('audio-buffer', this.config.bufferSize, {
        type: 'preallocated',
        index: i
      });

      // Pre-allocate audio buffer
      const buffer = memoryManager.acquire('audioBuffers') as Float32Array;
      if (buffer) {
        this.audioBuffers.set(bufferId, this.createAudioBuffer(buffer));
      }
    }
  }

  private createAudioBuffer(data: Float32Array): AudioBuffer {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContext.createBuffer(1, data.length, audioContext.sampleRate);
  }

  optimizeAudioPlayback(audioElement: HTMLAudioElement): void {
    // Mark performance start
    mobilePerformanceMonitor.markPerformanceStart('audio-playback');

    // Apply device-specific optimizations
    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Enable hardware acceleration
    audioElement.style.transform = 'translateZ(0)';
    audioElement.style.willChange = 'transform';

    // Optimize for network conditions
    const networkInfo = this.getNetworkInfo();
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      audioElement.preload = 'none';
    } else {
      audioElement.preload = 'auto';
    }

    // Adjust based on battery level
    const metrics = mobilePerformanceMonitor.getCurrentMetrics();
    if (metrics.isLowPowerMode) {
      // Reduce audio quality if needed
      this.adjustAudioQualityForBattery(audioElement);
    }

    mobilePerformanceMonitor.markPerformanceEnd('audio-playback');
  }

  private adjustAudioQualityForBattery(audioElement: HTMLAudioElement): void {
    // In low power mode, reduce audio processing overhead
    if (this.config.enableSpectrumAnalysis) {
      this.config.enableSpectrumAnalysis = false;
    }

    // Reduce preload segments
    this.config.preloadSegments = Math.max(1, Math.floor(this.config.preloadSegments / 2));
  }

  private getNetworkInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return {
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 100
    };
  }

  cacheAudioSegment(segmentId: string, audioData: ArrayBuffer): void {
    const bufferId = memoryManager.allocate('audio-segment', audioData.byteLength, {
      segmentId,
      timestamp: Date.now()
    });

    // Cache in memory manager
    this.audioBuffers.set(bufferId, this.createAudioBufferFromData(audioData));

    performanceMonitor.recordMetric('audio-segment-cached', 1, 'mobile', {
      tags: { segmentId }
    });
  }

  private createAudioBufferFromData(data: ArrayBuffer): AudioBuffer {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContext.decodeAudioData(data.slice(0)).then(buffer => buffer);
  }

  optimizeSpectrumAnalysis(audioContext: AudioContext, analyser: AnalyserNode): void {
    if (!this.config.enableSpectrumAnalysis) {
      return;
    }

    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Reduce FFT size for low-end devices
    if (deviceProfile.class === 'low-end') {
      analyser.fftSize = 256;
    } else if (deviceProfile.class === 'mid-range') {
      analyser.fftSize = 512;
    } else {
      analyser.fftSize = 1024;
    }

    // Use pooled array for frequency data
    this.spectrumData = memoryManager.acquire('arrays') as Float32Array || new Float32Array(analyser.frequencyBinCount);
  }

  getSpectrumData(analyser: AnalyserNode): Float32Array | null {
    if (!this.spectrumData || !this.config.enableSpectrumAnalysis) {
      return null;
    }

    analyser.getFloatFrequencyData(this.spectrumData);
    return this.spectrumData;
  }

  releaseSpectrumData(): void {
    if (this.spectrumData) {
      memoryManager.release('arrays', this.spectrumData);
      this.spectrumData = null;
    }
  }

  optimizeWaveformRendering(canvas: HTMLCanvasElement): void {
    if (!this.config.enableWaveformRendering) {
      return;
    }

    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Reduce resolution for low-end devices
    const ctx = canvas.getContext('2d')!;
    if (deviceProfile.class === 'low-end') {
      canvas.width = Math.min(canvas.width, 300);
      canvas.height = Math.min(canvas.height, 100);
      ctx.imageSmoothingEnabled = false;
    }

    // Enable GPU acceleration
    canvas.style.transform = 'translateZ(0)';
    canvas.style.willChange = 'transform';
  }

  cacheWaveform(segmentId: string, imageData: ImageData): void {
    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Limit cache size based on device capabilities
    const maxCacheSize = deviceProfile.capabilities.memory === 'limited' ? 5 : 20;

    if (this.waveformCache.size >= maxCacheSize) {
      // Remove oldest cache entry
      const firstKey = this.waveformCache.keys().next().value;
      this.waveformCache.delete(firstKey);
    }

    this.waveformCache.set(segmentId, imageData);
  }

  getCachedWaveform(segmentId: string): ImageData | null {
    return this.waveformCache.get(segmentId) || null;
  }

  startPlaybackOptimization(): void {
    this.isPlaying = true;
    mobilePerformanceMonitor.markPerformanceStart('audio-playback-session');

    // Optimize for playback
    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Increase animation frame rate for smooth playback
    if (deviceProfile.class === 'high-end' || deviceProfile.class === 'flagship') {
      animationOptimizer.setTargetFPS(60);
    } else {
      animationOptimizer.setTargetFPS(30);
    }
  }

  stopPlaybackOptimization(): void {
    this.isPlaying = false;
    mobilePerformanceMonitor.markPerformanceEnd('audio-playback-session');

    // Return to normal frame rate
    animationOptimizer.setTargetFPS(60);

    // Release audio buffers
    this.releaseUnusedBuffers();
  }

  private releaseUnusedBuffers(): void {
    // Keep only currently needed buffers
    const buffersToKeep = Math.ceil(this.config.preloadSegments / 2);

    while (this.audioBuffers.size > buffersToKeep) {
      const firstKey = this.audioBuffers.keys().next().value;
      const buffer = this.audioBuffers.get(firstKey);

      if (buffer) {
        memoryManager.deallocate(firstKey);
      }

      this.audioBuffers.delete(firstKey);
    }
  }

  getPerformanceMetrics(): {
    cachedSegments: number;
    memoryUsage: number;
    isActive: boolean;
  } {
    return {
      cachedSegments: this.audioBuffers.size,
      memoryUsage: Array.from(this.audioBuffers.values()).reduce((total, buffer) => {
        return total + (buffer ? buffer.length * 4 : 0); // 4 bytes per float32
      }, 0),
      isActive: this.isPlaying
    };
  }

  cleanup(): void {
    // Release all audio buffers
    this.audioBuffers.forEach((_, bufferId) => {
      memoryManager.deallocate(bufferId);
    });
    this.audioBuffers.clear();

    // Clear caches
    this.waveformCache.clear();
    this.releaseSpectrumData();
  }
}

export class FileUploadPerformanceManager {
  private config: FileUploadPerformanceConfig;
  private uploadQueue: FileUploadTask[] = [];
  private activeUploads: Map<string, UploadProgress> = new Map();
  private networkOptimizer: any;

  constructor(config: FileUploadPerformanceConfig) {
    this.config = config;
    this.setupPerformanceOptimizations();
    this.initializeNetworkOptimizer();
  }

  private setupPerformanceOptimizations(): void {
    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Adjust chunk sizes based on device capabilities
    if (deviceProfile.capabilities.memory === 'limited') {
      this.config.maxChunkSize = Math.min(this.config.maxChunkSize, 256 * 1024); // 256KB
      this.config.concurrentUploads = Math.min(this.config.concurrentUploads, 2);
    }

    // Adjust based on network conditions
    const connection = (navigator as any).connection;
    if (connection) {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        this.config.maxChunkSize = Math.min(this.config.maxChunkSize, 64 * 1024); // 64KB
        this.config.concurrentUploads = 1;
      }
    }

    // Disable compression on low-end devices
    if (deviceProfile.class === 'low-end') {
      this.config.enableCompression = false;
    }
  }

  private initializeNetworkOptimizer(): void {
    // Initialize network optimization
    this.networkOptimizer = {
      throttleUploads: false,
      adaptiveChunking: true,
      retryStrategy: 'exponential'
    };
  }

  optimizeFileUpload(file: File): FileUploadTask {
    mobilePerformanceMonitor.markPerformanceStart('file-upload-optimization');

    const taskId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const uploadTask: FileUploadTask = {
      id: taskId,
      file,
      chunks: [],
      totalChunks: 0,
      uploadedChunks: 0,
      startTime: Date.now(),
      status: 'pending'
    };

    // Optimize chunking strategy
    this.optimizeChunkingStrategy(uploadTask);

    // Add to upload queue
    this.uploadQueue.push(uploadTask);

    mobilePerformanceMonitor.markPerformanceEnd('file-upload-optimization');

    performanceMonitor.recordMetric('file-upload-optimized', 1, 'mobile', {
      tags: {
        fileSize: file.size.toString(),
        chunkCount: uploadTask.totalChunks.toString()
      }
    });

    return uploadTask;
  }

  private optimizeChunkingStrategy(uploadTask: FileUploadTask): void {
    const fileSize = uploadTask.file.size;
    let chunkSize = this.config.maxChunkSize;

    // Adaptive chunking based on file size
    if (fileSize > 50 * 1024 * 1024) { // > 50MB
      chunkSize = Math.max(chunkSize, 1024 * 1024); // 1MB minimum
    } else if (fileSize < 1024 * 1024) { // < 1MB
      chunkSize = fileSize; // Single chunk
    }

    // Network-based adaptation
    const connection = (navigator as any).connection;
    if (connection && this.networkOptimizer.adaptiveChunking) {
      if (connection.effectiveType === 'slow-2g') {
        chunkSize = Math.min(chunkSize, 32 * 1024); // 32KB max
      } else if (connection.effectiveType === '2g') {
        chunkSize = Math.min(chunkSize, 128 * 1024); // 128KB max
      }
    }

    // Create chunks
    const totalChunks = Math.ceil(fileSize / chunkSize);
    uploadTask.totalChunks = totalChunks;
    uploadTask.chunks = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);

      uploadTask.chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        data: null, // Will be filled when needed
        uploaded: false,
        retryCount: 0
      });
    }
  }

  async startUpload(uploadTask: FileUploadTask): Promise<void> {
    uploadTask.status = 'uploading';

    const progress: UploadProgress = {
      taskId: uploadTask.id,
      uploadedBytes: 0,
      totalBytes: uploadTask.file.size,
      percentage: 0,
      speed: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    };

    this.activeUploads.set(uploadTask.id, progress);

    // Start concurrent uploads
    const concurrentLimit = Math.min(this.config.concurrentUploads, uploadTask.chunks.length);
    const uploadPromises: Promise<void>[] = [];

    for (let i = 0; i < concurrentLimit; i++) {
      uploadPromises.push(this.processUploadQueue(uploadTask));
    }

    try {
      await Promise.all(uploadPromises);
      uploadTask.status = 'completed';
    } catch (error) {
      uploadTask.status = 'failed';
      throw error;
    } finally {
      this.activeUploads.delete(uploadTask.id);
    }
  }

  private async processUploadQueue(uploadTask: FileUploadTask): Promise<void> {
    while (uploadTask.uploadedChunks < uploadTask.totalChunks) {
      const chunk = uploadTask.chunks.find(c => !c.uploaded);
      if (!chunk) break;

      try {
        await this.uploadChunk(uploadTask, chunk);
        chunk.uploaded = true;
        uploadTask.uploadedChunks++;

        this.updateProgress(uploadTask.id);

      } catch (error) {
        chunk.retryCount++;
        if (chunk.retryCount >= 3) {
          throw error;
        }

        // Exponential backoff
        await this.delay(Math.pow(2, chunk.retryCount) * 1000);
      }
    }
  }

  private async uploadChunk(uploadTask: FileUploadTask, chunk: FileChunk): Promise<void> {
    mobilePerformanceMonitor.markPerformanceStart(`chunk-upload-${chunk.index}`);

    // Prepare chunk data
    if (!chunk.data) {
      const start = chunk.start;
      const end = chunk.end;
      chunk.data = uploadTask.file.slice(start, end);
    }

    // Apply compression if enabled
    let dataToSend = chunk.data;
    if (this.config.enableCompression) {
      dataToSend = await this.compressChunk(chunk.data);
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', dataToSend);
    formData.append('chunkIndex', chunk.index.toString());
    formData.append('totalChunks', uploadTask.totalChunks.toString());
    formData.append('taskId', uploadTask.id);

    // Upload with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      performanceMonitor.recordMetric('chunk-uploaded', 1, 'mobile', {
        tags: {
          chunkSize: chunk.size.toString(),
          compressed: this.config.enableCompression.toString()
        }
      });

    } finally {
      clearTimeout(timeoutId);
    }

    mobilePerformanceMonitor.markPerformanceEnd(`chunk-upload-${chunk.index}`);
  }

  private async compressChunk(chunk: Blob): Promise<Blob> {
    // Simple compression simulation - in practice this would use compression libraries
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // This is a placeholder - real compression would be implemented here
        resolve(chunk);
      };
      reader.readAsArrayBuffer(chunk);
    });
  }

  private updateProgress(taskId: string): void {
    const progress = this.activeUploads.get(taskId);
    if (!progress) return;

    const uploadTask = this.uploadQueue.find(t => t.id === taskId);
    if (!uploadTask) return;

    const now = Date.now();
    const timeDelta = now - progress.lastUpdateTime;

    // Calculate uploaded bytes
    progress.uploadedBytes = uploadTask.uploadedChunks *
      (uploadTask.file.size / uploadTask.totalChunks);
    progress.percentage = (progress.uploadedBytes / progress.totalBytes) * 100;

    // Calculate speed
    if (timeDelta > 0) {
      const bytesDelta = progress.uploadedBytes -
        (uploadTask.uploadedChunks - 1) * (uploadTask.file.size / uploadTask.totalChunks);
      progress.speed = bytesDelta / (timeDelta / 1000); // bytes per second
    }

    progress.lastUpdateTime = now;

    // Emit progress event
    window.dispatchEvent(new CustomEvent('upload-progress', {
      detail: { taskId, progress: { ...progress } }
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  pauseUpload(taskId: string): void {
    const uploadTask = this.uploadQueue.find(t => t.id === taskId);
    if (uploadTask && uploadTask.status === 'uploading') {
      uploadTask.status = 'paused';
    }
  }

  resumeUpload(taskId: string): void {
    const uploadTask = this.uploadQueue.find(t => t.id === taskId);
    if (uploadTask && uploadTask.status === 'paused') {
      uploadTask.status = 'uploading';
      this.startUpload(uploadTask);
    }
  }

  cancelUpload(taskId: string): void {
    const taskIndex = this.uploadQueue.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const uploadTask = this.uploadQueue[taskIndex];
      uploadTask.status = 'cancelled';
      this.activeUploads.delete(taskId);
      this.uploadQueue.splice(taskIndex, 1);
    }
  }

  getUploadProgress(taskId: string): UploadProgress | null {
    return this.activeUploads.get(taskId) || null;
  }

  getAllUploads(): FileUploadTask[] {
    return [...this.uploadQueue];
  }

  getOptimizationMetrics(): {
    totalTasks: number;
    activeTasks: number;
    averageUploadSpeed: number;
    memoryUsage: number;
  } {
    const activeTasks = Array.from(this.activeUploads.values());
    const averageSpeed = activeTasks.length > 0 ?
      activeTasks.reduce((sum, p) => sum + p.speed, 0) / activeTasks.length : 0;

    // Estimate memory usage
    const memoryUsage = this.uploadQueue.reduce((total, task) => {
      return total + (task.file.size * 0.1); // Estimate 10% of file size in memory
    }, 0);

    return {
      totalTasks: this.uploadQueue.length,
      activeTasks: this.activeUploads.size,
      averageUploadSpeed,
      memoryUsage
    };
  }

  cleanup(): void {
    // Cancel all active uploads
    this.activeUploads.clear();
    this.uploadQueue = [];
  }
}

export class TouchFeedbackPerformanceManager {
  private config: ComponentPerformanceConfig;
  private touchFeedbackManager: TouchFeedbackManager;
  private multiTouchManager: MultiTouchManager;
  private gestureMetrics: Map<string, GestureMetrics> = new Map();

  constructor(config: ComponentPerformanceConfig) {
    this.config = config;
    this.touchFeedbackManager = new TouchFeedbackManager();
    this.multiTouchManager = new MultiTouchManager();
    this.setupTouchOptimizations();
  }

  private setupTouchOptimizations(): void {
    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Adjust touch sensitivity based on device
    const mobileDetector = MobileDetector.getInstance();
    const optimalTouchSize = mobileDetector.getOptimalTouchTargetSize();

    // Configure touch feedback manager
    this.touchFeedbackManager.configure({
      maxResponseTime: deviceProfile.class === 'low-end' ? 200 : 100,
      enableHapticFeedback: deviceProfile.capabilities.battery !== 'poor',
      enableVisualFeedback: true,
      touchTargetSize: optimalTouchSize
    });

    // Configure multi-touch manager
    this.multiTouchManager.configure({
      maxTouchPoints: deviceProfile.capabilities.gpu === 'advanced' ? 10 : 5,
      gestureComplexity: deviceProfile.class === 'low-end' ? 'simple' : 'complex',
      enableGesturePrediction: deviceProfile.class !== 'low-end'
    });

    this.setupTouchListeners();
  }

  private setupTouchListeners(): void {
    // Touch start monitoring
    document.addEventListener('touchstart', (event) => {
      this.recordTouchStart(event);
    }, { passive: true });

    // Touch end monitoring
    document.addEventListener('touchend', (event) => {
      this.recordTouchEnd(event);
    }, { passive: true });

    // Touch move monitoring
    document.addEventListener('touchmove', (event) => {
      this.recordTouchMove(event);
    }, { passive: true });
  }

  private recordTouchStart(event: TouchEvent): void {
    const gestureId = `gesture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metrics: GestureMetrics = {
      id: gestureId,
      type: 'touch',
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      touchPoints: event.touches.length,
      distance: 0,
      velocity: 0,
      confidence: 1.0
    };

    this.gestureMetrics.set(gestureId, metrics);

    mobilePerformanceMonitor.markPerformanceStart(`touch-${gestureId}`);

    // Optimized touch feedback
    this.touchFeedbackManager.provideFeedback(event.target as HTMLElement, 'touch-start');
  }

  private recordTouchEnd(event: TouchEvent): void {
    const gestureMetrics = Array.from(this.gestureMetrics.values())
      .find(m => m.endTime === 0);

    if (gestureMetrics) {
      gestureMetrics.endTime = performance.now();
      gestureMetrics.duration = gestureMetrics.endTime - gestureMetrics.startTime;

      mobilePerformanceMonitor.markPerformanceEnd(`touch-${gestureMetrics.id}`);

      performanceMonitor.recordMetric('touch-response-time', gestureMetrics.duration, 'mobile', {
        tags: {
          touchPoints: gestureMetrics.touchPoints.toString(),
          confidence: gestureMetrics.confidence.toString()
        }
      });

      // Optimized touch feedback
      this.touchFeedbackManager.provideFeedback(event.target as HTMLElement, 'touch-end');

      // Clean up old metrics
      this.cleanupOldGestureMetrics();
    }
  }

  private recordTouchMove(event: TouchEvent): void {
    const gestureMetrics = Array.from(this.gestureMetrics.values())
      .find(m => m.endTime === 0);

    if (gestureMetrics) {
      // Calculate distance and velocity
      const touch = event.touches[0];
      if (touch) {
        const currentTime = performance.now();
        const deltaTime = currentTime - gestureMetrics.startTime;

        if (deltaTime > 0) {
          gestureMetrics.velocity = Math.abs(touch.clientX - touch.clientY) / deltaTime;
        }
      }
    }
  }

  private cleanupOldGestureMetrics(): void {
    const now = performance.now();
    const cutoff = now - 10000; // Keep last 10 seconds

    for (const [id, metrics] of this.gestureMetrics.entries()) {
      if (metrics.endTime > 0 && metrics.endTime < cutoff) {
        this.gestureMetrics.delete(id);
      }
    }
  }

  optimizeTouchTarget(element: HTMLElement): void {
    const deviceProfile = deviceProfiler.getDeviceProfile();
    const mobileDetector = MobileDetector.getInstance();

    const optimalSize = mobileDetector.getOptimalTouchTargetSize();

    // Apply optimized touch target size
    if (element.offsetWidth < optimalSize || element.offsetHeight < optimalSize) {
      element.style.minWidth = `${optimalSize}px`;
      element.style.minHeight = `${optimalSize}px`;
      element.style.touchAction = 'manipulation';

      // Enable GPU acceleration for touch feedback
      if (deviceProfile.capabilities.gpu !== 'basic') {
        element.style.transform = 'translateZ(0)';
        element.style.willChange = 'transform, opacity';
      }
    }

    // Add touch feedback class
    element.classList.add('touch-optimized');
  }

  enableGestureRecognition(element: HTMLElement, gestures: string[]): void {
    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Only enable advanced gestures on capable devices
    const supportedGestures = deviceProfile.class === 'low-end' ?
      gestures.filter(g => ['tap', 'swipe'].includes(g)) : gestures;

    supportedGestures.forEach(gesture => {
      this.multiTouchManager.enableGesture(element, gesture, (gestureData) => {
        this.handleGesture(gesture, gestureData, element);
      });
    });
  }

  private handleGesture(gesture: string, gestureData: any, element: HTMLElement): void {
    mobilePerformanceMonitor.markPerformanceStart(`gesture-${gesture}`);

    // Provide optimized feedback
    this.touchFeedbackManager.provideFeedback(element, `gesture-${gesture}`);

    // Record gesture metrics
    performanceMonitor.recordMetric('gesture-recognized', 1, 'mobile', {
      tags: {
        gestureType: gesture,
        confidence: gestureData.confidence?.toString() || '1.0'
      }
    });

    mobilePerformanceMonitor.markPerformanceEnd(`gesture-${gesture}`);
  }

  optimizeForPerformance(): void {
    const deviceProfile = deviceProfiler.getDeviceProfile();

    if (deviceProfile.class === 'low-end') {
      // Reduce touch feedback complexity
      this.touchFeedbackManager.setComplexity('minimal');
      this.multiTouchManager.setGestureComplexity('simple');
    }

    // Adjust based on battery level
    const metrics = mobilePerformanceMonitor.getCurrentMetrics();
    if (metrics.isLowPowerMode) {
      this.touchFeedbackManager.enableBatterySaver();
    }
  }

  getTouchMetrics(): {
    averageResponseTime: number;
    gestureAccuracy: number;
    totalGestures: number;
    batteryOptimized: boolean;
  } {
    const gestureArray = Array.from(this.gestureMetrics.values());
    const completedGestures = gestureArray.filter(g => g.endTime > 0);

    const averageResponseTime = completedGestures.length > 0 ?
      completedGestures.reduce((sum, g) => sum + g.duration, 0) / completedGestures.length : 0;

    const averageConfidence = completedGestures.length > 0 ?
      completedGestures.reduce((sum, g) => sum + g.confidence, 0) / completedGestures.length : 0;

    return {
      averageResponseTime: Math.round(averageResponseTime),
      gestureAccuracy: Math.round(averageConfidence * 100),
      totalGestures: completedGestures.length,
      batteryOptimized: this.touchFeedbackManager.isBatterySaverEnabled()
    };
  }

  cleanup(): void {
    this.gestureMetrics.clear();
    this.touchFeedbackManager?.cleanup();
    this.multiTouchManager?.cleanup();
  }
}

// Integration manager
export class MobilePerformanceIntegrationManager {
  private static instance: MobilePerformanceIntegrationManager;
  private audioPlayerManagers: Map<string, AudioPlayerPerformanceManager> = new Map();
  private fileUploadManagers: Map<string, FileUploadPerformanceManager> = new Map();
  private touchFeedbackManager: TouchFeedbackPerformanceManager | null = null;
  private isInitialized: boolean = false;

  static getInstance(): MobilePerformanceIntegrationManager {
    if (!MobilePerformanceIntegrationManager.instance) {
      MobilePerformanceIntegrationManager.instance = new MobilePerformanceIntegrationManager();
    }
    return MobilePerformanceIntegrationManager.instance;
  }

  private constructor() {
    this.setupEventListeners();
  }

  static initialize(): void {
    const instance = MobilePerformanceIntegrationManager.getInstance();
    instance.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Initialize core performance optimization
    initializeMobilePerformanceOptimization();

    // Initialize touch feedback manager
    this.touchFeedbackManager = new TouchFeedbackPerformanceManager({
      componentType: 'touch-feedback',
      priority: 'high',
      optimizations: ['target-sizing', 'feedback-optimization', 'battery-aware'],
      monitoringEnabled: true
    });

    // Setup responsive optimizations
    this.setupResponsiveOptimizations();

    this.isInitialized = true;

    performanceMonitor.recordMetric('mobile-performance-integration-initialized', 1, 'mobile');
  }

  private setupEventListeners(): void {
    // Network status changes
    window.addEventListener('online', () => {
      this.handleNetworkChange('online');
    });

    window.addEventListener('offline', () => {
      this.handleNetworkChange('offline');
    });

    // Battery level changes
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        battery.addEventListener('levelchange', () => {
          this.handleBatteryLevelChange(battery.level);
        });

        battery.addEventListener('chargingchange', () => {
          this.handleBatteryChargingChange(battery.charging);
        });
      });
    }

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Memory pressure
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryPressure();
      }, 10000);
    }
  }

  private setupResponsiveOptimizations(): void {
    const updateOptimizations = () => {
      const deviceProfile = deviceProfiler.getDeviceProfile();

      // Update optimization settings based on device capabilities
      if (deviceProfile.class === 'low-end') {
        performanceOptimizer.applyCustomOptimization({
          condition: () => true,
          action: () => {
            document.body.classList.add('low-performance-mode');
            animationOptimizer.setTargetFPS(30);
          },
          priority: 'high',
          cooldown: 0
        });
      }
    };

    // Initial setup
    updateOptimizations();

    // Update on device profile changes
    window.addEventListener('resize', () => {
      deviceProfiler.updateProfile();
      updateOptimizations();
    });
  }

  private handleNetworkChange(status: 'online' | 'offline'): void {
    performanceMonitor.recordMetric('network-status-change', status, 'mobile');

    if (status === 'offline') {
      // Enable offline optimizations
      this.enableOfflineOptimizations();
    } else {
      // Disable offline optimizations
      this.disableOfflineOptimizations();
    }
  }

  private handleBatteryLevelChange(level: number): void {
    performanceMonitor.recordMetric('battery-level-change', level, 'mobile');

    if (level < 0.2) {
      this.enableLowPowerMode();
    } else if (level > 0.5) {
      this.disableLowPowerMode();
    }
  }

  private handleBatteryChargingChange(charging: boolean): void {
    performanceMonitor.recordMetric('battery-charging-change', charging, 'mobile');

    if (charging) {
      this.disableLowPowerMode();
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.enableBackgroundOptimizations();
    } else {
      this.disableBackgroundOptimizations();
    }
  }

  private checkMemoryPressure(): void {
    if (!('memory' in performance) || !performance.memory) return;

    const memory = performance.memory;
    const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

    if (usageRatio > 0.9) {
      this.handleHighMemoryPressure();
    }
  }

  private enableOfflineOptimizations(): void {
    // Reduce network requests
    window.dispatchEvent(new CustomEvent('enable-offline-mode'));

    // Increase cache sizes
    window.dispatchEvent(new CustomEvent('increase-cache-size', {
      detail: { multiplier: 2 }
    }));
  }

  private disableOfflineOptimizations(): void {
    window.dispatchEvent(new CustomEvent('disable-offline-mode'));

    // Reset cache sizes
    window.dispatchEvent(new CustomEvent('reset-cache-size'));
  }

  private enableLowPowerMode(): void {
    document.body.classList.add('low-power-mode');

    // Reduce animations
    animationOptimizer.setTargetFPS(30);

    // Optimize touch feedback
    this.touchFeedbackManager?.optimizeForPerformance();

    // Notify components
    window.dispatchEvent(new CustomEvent('low-power-mode-enabled'));
  }

  private disableLowPowerMode(): void {
    document.body.classList.remove('low-power-mode');

    // Restore normal frame rate
    animationOptimizer.setTargetFPS(60);

    // Notify components
    window.dispatchEvent(new CustomEvent('low-power-mode-disabled'));
  }

  private enableBackgroundOptimizations(): void {
    // Pause non-essential animations
    window.dispatchEvent(new CustomEvent('pause-animations'));

    // Reduce memory usage
    memoryManager.optimizeAudioBuffers();

    // Clear caches
    window.dispatchEvent(new CustomEvent('clear-temporary-caches'));
  }

  private disableBackgroundOptimizations(): void {
    // Resume animations
    window.dispatchEvent(new CustomEvent('resume-animations'));
  }

  private handleHighMemoryPressure(): void {
    // Emergency cleanup
    memoryManager.performEmergencyCleanup();

    // Clear all caches
    window.dispatchEvent(new CustomEvent('emergency-cache-clear'));

    // Notify user if needed
    window.dispatchEvent(new CustomEvent('high-memory-pressure'));
  }

  createAudioPlayerManager(playerId: string, config?: Partial<AudioPlayerPerformanceConfig>): AudioPlayerPerformanceManager {
    const defaultConfig: AudioPlayerPerformanceConfig = {
      componentType: 'audio-player',
      priority: 'critical',
      optimizations: ['buffer-optimization', 'memory-management', 'gpu-acceleration'],
      monitoringEnabled: true,
      bufferSize: 8192,
      preloadSegments: 3,
      maxConcurrentDecodes: 2,
      enableSpectrumAnalysis: true,
      enableWaveformRendering: true,
      ...config
    };

    const manager = new AudioPlayerPerformanceManager(defaultConfig);
    this.audioPlayerManagers.set(playerId, manager);

    return manager;
  }

  getAudioPlayerManager(playerId: string): AudioPlayerPerformanceManager | null {
    return this.audioPlayerManagers.get(playerId) || null;
  }

  createFileUploadManager(uploadId: string, config?: Partial<FileUploadPerformanceConfig>): FileUploadPerformanceManager {
    const defaultConfig: FileUploadPerformanceConfig = {
      componentType: 'file-upload',
      priority: 'high',
      optimizations: ['chunk-optimization', 'network-adaptation', 'compression'],
      monitoringEnabled: true,
      maxChunkSize: 1024 * 1024, // 1MB
      concurrentUploads: 3,
      enableCompression: true,
      enableProgressiveUpload: true,
      ...config
    };

    const manager = new FileUploadPerformanceManager(defaultConfig);
    this.fileUploadManagers.set(uploadId, manager);

    return manager;
  }

  getFileUploadManager(uploadId: string): FileUploadPerformanceManager | null {
    return this.fileUploadManagers.get(uploadId) || null;
  }

  getTouchFeedbackManager(): TouchFeedbackPerformanceManager | null {
    return this.touchFeedbackManager;
  }

  getComprehensivePerformanceReport(): {
    device: any;
    system: any;
    audioPlayers: Record<string, any>;
    fileUploads: Record<string, any>;
    touchFeedback: any;
    memory: any;
    animations: any;
  } {
    const audioPlayers: Record<string, any> = {};
    this.audioPlayerManagers.forEach((manager, id) => {
      audioPlayers[id] = manager.getPerformanceMetrics();
    });

    const fileUploads: Record<string, any> = {};
    this.fileUploadManagers.forEach((manager, id) => {
      fileUploads[id] = manager.getOptimizationMetrics();
    });

    return {
      device: deviceProfiler.getDeviceProfile(),
      system: mobilePerformanceMonitor.getDetailedReport(),
      audioPlayers,
      fileUploads,
      touchFeedback: this.touchFeedbackManager?.getTouchMetrics(),
      memory: memoryManager.getMemoryStats(),
      animations: animationOptimizer.getAnimationStats()
    };
  }

  performHealthCheck(): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    recommendations: string[];
  } {
    const report = this.getComprehensivePerformanceReport();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check memory usage
    if (report.memory.totalAllocatedSize > 100 * 1024 * 1024) { // > 100MB
      issues.push('High memory usage detected');
      recommendations.push('Consider reducing cache sizes');
    }

    // Check animation performance
    if (report.animations.actualFPS < 45) {
      issues.push('Low animation frame rate');
      recommendations.push('Enable GPU acceleration where possible');
    }

    // Check system performance
    if (report.system.overallScore < 70) {
      issues.push('Low overall performance score');
      recommendations.push('Review and optimize performance settings');
    }

    const score = 100 - (issues.length * 15);
    let overall: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    if (score < 50) overall = 'poor';
    else if (score < 70) overall = 'fair';
    else if (score < 85) overall = 'good';

    return {
      overall,
      issues,
      recommendations
    };
  }

  cleanup(): void {
    // Cleanup all managers
    this.audioPlayerManagers.forEach(manager => manager.cleanup());
    this.fileUploadManagers.forEach(manager => manager.cleanup());
    this.touchFeedbackManager?.cleanup();

    // Clear maps
    this.audioPlayerManagers.clear();
    this.fileUploadManagers.clear();

    // Cleanup core systems
    cleanupMobilePerformanceOptimization();
  }
}

// Supporting interfaces
interface FileUploadTask {
  id: string;
  file: File;
  chunks: FileChunk[];
  totalChunks: number;
  uploadedChunks: number;
  startTime: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
}

interface FileChunk {
  index: number;
  start: number;
  end: number;
  size: number;
  data: Blob | null;
  uploaded: boolean;
  retryCount: number;
}

interface UploadProgress {
  taskId: string;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  startTime: number;
  lastUpdateTime: number;
}

interface GestureMetrics {
  id: string;
  type: string;
  startTime: number;
  endTime: number;
  duration: number;
  touchPoints: number;
  distance: number;
  velocity: number;
  confidence: number;
}

// Export singleton instance
export const mobilePerformanceIntegration = MobilePerformanceIntegrationManager.getInstance();

// Auto-initialize integration
if (typeof window !== 'undefined') {
  MobilePerformanceIntegrationManager.initialize();
}
