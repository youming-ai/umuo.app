/**
 * Mobile Performance Monitor for Analytics
 *
 * Monitors mobile-specific performance metrics including battery usage,
 * memory consumption, network performance, and audio processing efficiency.
 *
 * @version 1.0.0
 */

import { PerformanceMonitor } from '../utils/performance-monitor';
import { MobileAnalyticsConfig, AnalyticsEventType } from './mobile-analytics';
import { OptimizedEventEmitter } from '../utils/event-manager';

// ============================================================================
// MOBILE PERFORMANCE INTERFACES
// ============================================================================

/**
 * Mobile-specific performance metrics
 */
export interface MobilePerformanceMetrics {
  // Core performance
  timestamp: Date;
  memoryUsage: MemoryMetrics;
  batteryUsage: BatteryMetrics;
  networkPerformance: NetworkMetrics;
  audioPerformance: AudioMetrics;
  renderingPerformance: RenderingMetrics;
  thermalState: ThermalMetrics;

  // App-specific performance
  transcriptionPerformance: TranscriptionMetrics;
  fileProcessingMetrics: FileProcessingMetrics;
  uiResponsiveness: UIResponsivenessMetrics;

  // Device capabilities
  deviceCapabilities: DeviceCapabilityMetrics;
}

/**
 * Memory usage metrics
 */
export interface MemoryMetrics {
  usedJSHeapSize: number; // MB
  totalJSHeapSize: number; // MB
  jsHeapSizeLimit: number; // MB
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  memoryLeakDetected: boolean;
  gcFrequency: number; // Garbage collections per minute
  averageGCDuration: number; // ms
}

/**
 * Battery usage metrics
 */
export interface BatteryMetrics {
  level: number; // 0-1
  charging: boolean;
  chargingTime: number; // seconds until full
  dischargingTime: number; // seconds until empty
  powerConsumptionRate: number; // % per hour
  batteryTemperature?: number; // Celsius
  isLowPowerMode: boolean;
  batteryHealth: 'good' | 'fair' | 'poor';
  estimatedBatteryLife: number; // minutes
}

/**
 * Network performance metrics
 */
export interface NetworkMetrics {
  type: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | '5g';
  downlink: number; // Mbps
  rtt: number; // Round-trip time in ms
  saveData: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  packetLoss: number; // percentage
  latencyVariation: number; // ms
  bandwidthUtilization: number; // percentage
  signalStrength?: number; // dBm for cellular
}

/**
 * Audio processing performance metrics
 */
export interface AudioMetrics {
  audioLatency: number; // ms
  audioBufferUnderruns: number;
  audioProcessingLatency: number; // ms
  audioQuality: number; // 0-1
  sampleRate: number; // Hz
  bufferSize: number; // samples
  cpuUsageForAudio: number; // percentage
  realTimeProcessingRatio: number; // ratio of processing time to audio time
  droppedFrames: number;
  audioContextState: 'suspended' | 'running' | 'closed';
}

/**
 * Rendering performance metrics
 */
export interface RenderingMetrics {
  frameRate: number; // FPS
  frameDrops: number;
  totalFrameTime: number; // ms
  averageFrameTime: number; // ms
  longestFrame: number; // ms
  renderTime: number; // ms
  paintTime: number; // ms
  layoutTime: number; // ms
  compositeTime: number; // ms
  gpuMemoryUsage?: number; // MB
  canvasDrawCalls?: number;
  webglContexts?: number;
}

/**
 * Thermal state metrics
 */
export interface ThermalMetrics {
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  cpuThrottling: boolean;
  gpuThrottling: boolean;
  thermalPressure: number; // 0-1
  deviceTemperature?: number; // Celsius
  performanceImpact: 'none' | 'minimal' | 'moderate' | 'severe';
}

/**
 * Transcription performance metrics
 */
export interface TranscriptionMetrics {
  averageProcessingTime: number; // ms per minute of audio
  transcriptionSpeed: number; // real-time multiplier
  accuracyRate: number; // 0-1
  memoryUsagePerMinute: number; // MB per minute of audio
  cpuUsageDuringTranscription: number; // percentage
  networkUsagePerMinute: number; // MB per minute
  errorRate: number; // 0-1
  retryRate: number; // 0-1
  concurrentTranscriptions: number;
  queueDepth: number;
}

/**
 * File processing metrics
 */
export interface FileProcessingMetrics {
  averageUploadSpeed: number; // Mbps
  averageDownloadSpeed: number; // Mbps
  fileProcessingTime: number; // ms per MB
  compressionRatio: number;
  uploadSuccessRate: number; // 0-1
  downloadSuccessRate: number; // 0-1
  retryCount: number;
  cacheHitRate: number; // 0-1
  storageUsage: number; // MB
  storageAvailable: number; // MB
}

/**
 * UI responsiveness metrics
 */
export interface UIResponsivenessMetrics {
  averageResponseTime: number; // ms
  touchResponseTime: number; // ms
  gestureRecognitionTime: number; // ms
  inputDelay: number; // ms
  blockingTime: number; // ms per second
  totalBlockingTime: number; // ms
  interactionToNextPaint: number; // ms
  firstInputDelay: number; // ms
  longestInputDelay: number; // ms
  inputResponsivenessScore: number; // 0-1
}

/**
 * Device capability metrics
 */
export interface DeviceCapabilityMetrics {
  cpuCores: number;
  maxClockSpeed: number; // GHz
  availableMemory: number; // MB
  gpuType: string;
  gpuPerformance: 'low' | 'medium' | 'high';
  sensorSupport: string[];
  codecSupport: string[];
  webAssemblySupport: boolean;
  webGLSupport: boolean;
  webGL2Support: boolean;
  webAudioSupport: boolean;
  maxConcurrentConnections: number;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  memory: {
    warning: number; // MB
    critical: number; // MB
  };
  battery: {
    warning: number; // percentage
    critical: number; // percentage
  };
  network: {
    slowThreshold: number; // Mbps
    highLatencyThreshold: number; // ms
  };
  rendering: {
    minFPS: number;
    maxFrameTime: number; // ms
  };
  transcription: {
    maxProcessingTime: number; // ms per minute
    minAccuracyRate: number; // 0-1
  };
  ui: {
    maxResponseTime: number; // ms
    maxBlockingTime: number; // ms per second
  };
}

/**
 * Performance alert data
 */
export interface PerformanceAlert {
  id: string;
  type: 'memory' | 'battery' | 'network' | 'rendering' | 'transcription' | 'ui';
  severity: 'warning' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: Date;
  recommendations: string[];
  context: Record<string, any>;
}

// ============================================================================
// MOBILE PERFORMANCE MONITOR CLASS
// ============================================================================

/**
 * Monitors mobile-specific performance metrics
 */
export class MobilePerformanceMonitor {
  private config: MobileAnalyticsConfig;
  private eventEmitter: OptimizedEventEmitter<any>;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private performanceThresholds: PerformanceThresholds;

  // Performance state
  private currentMetrics: MobilePerformanceMetrics | null = null;
  private performanceHistory: MobilePerformanceMetrics[] = [];
  private performanceAlerts: PerformanceAlert[] = [];
  private baselineMetrics: MobilePerformanceMetrics | null = null;

  // Component monitors
  private basePerformanceMonitor: PerformanceMonitor;
  private frameRateMonitor: FrameRateMonitor;
  private audioContextMonitor: AudioContextMonitor;
  private networkMonitor: NetworkMonitor;
  private batteryMonitor: BatteryMonitor;

  // Performance timers
  private memoryMeasurements: { timestamp: number; used: number }[] = [];
  private frameTimeMeasurements: { timestamp: number; duration: number }[] = [];
  private audioLatencyMeasurements: { timestamp: number; latency: number }[] = [];

  // Transcription performance tracking
  private activeTranscriptions = new Map<string, TranscriptionPerformanceTracker>();
  private transcriptionHistory: TranscriptionMetrics[] = [];

  constructor(config: MobileAnalyticsConfig, eventEmitter: OptimizedEventEmitter<any>) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.performanceThresholds = this.initializeThresholds();
    this.basePerformanceMonitor = PerformanceMonitor.getInstance();
    this.frameRateMonitor = new FrameRateMonitor();
    this.audioContextMonitor = new AudioContextMonitor();
    this.networkMonitor = new NetworkMonitor();
    this.batteryMonitor = new BatteryMonitor();
  }

  /**
   * Initialize performance monitoring
   */
  public async initialize(): Promise<void> {
    if (!this.config.collectPerformanceMetrics) {
      console.warn('[MobilePerformanceMonitor] Performance monitoring disabled');
      return;
    }

    try {
      // Initialize component monitors
      await this.batteryMonitor.initialize();
      await this.networkMonitor.initialize();
      await this.audioContextMonitor.initialize();

      // Start monitoring
      this.startMonitoring();

      // Set up event listeners
      this.setupEventListeners();

      // Establish baseline metrics
      await this.establishBaseline();

      this.isMonitoring = true;

      if (this.config.debugMode) {
        console.log('[MobilePerformanceMonitor] Initialized successfully');
      }

    } catch (error) {
      console.error('[MobilePerformanceMonitor] Failed to initialize:', error);
    }
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;

    // Start component monitors
    this.frameRateMonitor.start();
    this.audioContextMonitor.start();
    this.networkMonitor.start();
    this.batteryMonitor.start();

    // Start periodic metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000); // Collect every 5 seconds

    this.isMonitoring = true;
  }

  /**
   * Stop performance monitoring
   */
  public stop(): void {
    if (!this.isMonitoring) return;

    // Stop component monitors
    this.frameRateMonitor.stop();
    this.audioContextMonitor.stop();
    this.networkMonitor.stop();
    this.batteryMonitor.stop();

    // Clear interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.isMonitoring = false;
    console.log('[MobilePerformanceMonitor] Stopped');
  }

  /**
   * Track transcription performance
   */
  public startTranscriptionTracking(fileId: number, filename: string, fileSize: number): string {
    const trackingId = `transcription_${fileId}_${Date.now()}`;

    const tracker: TranscriptionPerformanceTracker = {
      id: trackingId,
      fileId,
      filename,
      fileSize,
      startTime: Date.now(),
      endTime: 0,
      processingTime: 0,
      memoryUsageAtStart: this.getMemoryUsage(),
      networkUsageAtStart: this.networkMonitor.getCurrentUsage(),
    };

    this.activeTranscriptions.set(trackingId, tracker);

    if (this.config.debugMode) {
      console.log(`[MobilePerformanceMonitor] Started tracking transcription: ${trackingId}`);
    }

    return trackingId;
  }

  /**
   * Update transcription progress
   */
  public updateTranscriptionProgress(trackingId: string, progress: number, accuracy?: number): void {
    const tracker = this.activeTranscriptions.get(trackingId);
    if (!tracker) return;

    tracker.currentProgress = progress;
    if (accuracy !== undefined) {
      tracker.currentAccuracy = accuracy;
    }
  }

  /**
   * Complete transcription tracking
   */
  public completeTranscriptionTracking(
    trackingId: string,
    success: boolean,
    errorMessage?: string
  ): TranscriptionMetrics | null {
    const tracker = this.activeTranscriptions.get(trackingId);
    if (!tracker) return null;

    tracker.endTime = Date.now();
    tracker.processingTime = tracker.endTime - tracker.startTime;
    tracker.success = success;
    tracker.errorMessage = errorMessage;

    // Calculate metrics
    const metrics = this.calculateTranscriptionMetrics(tracker);

    // Store in history
    this.transcriptionHistory.push(metrics);

    // Remove from active tracking
    this.activeTranscriptions.delete(trackingId);

    // Emit completion event
    this.eventEmitter.emit('transcription_completed', metrics);

    return metrics;
  }

  /**
   * Track file processing performance
   */
  public trackFileProcessing(
    action: 'upload' | 'download' | 'process',
    fileSize: number,
    startTime: number,
    endTime: number,
    success: boolean
  ): void {
    const duration = endTime - startTime;
    const speed = (fileSize / (1024 * 1024)) / (duration / 1000); // MB/s

    this.basePerformanceMonitor.recordMetric(`file_${action}_speed`, speed, 'MB/s', {
      success: success.toString(),
      fileSize: fileSize.toString(),
    });

    if (this.config.debugMode) {
      console.log(`[MobilePerformanceMonitor] File ${action}: ${speed.toFixed(2)} MB/s`);
    }
  }

  /**
   * Get current performance metrics
   */
  public getCurrentMetrics(): MobilePerformanceMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get performance history
   */
  public getPerformanceHistory(limit: number = 100): MobilePerformanceMetrics[] {
    return this.performanceHistory.slice(-limit);
  }

  /**
   * Get performance alerts
   */
  public getPerformanceAlerts(limit: number = 50): PerformanceAlert[] {
    return this.performanceAlerts.slice(-limit);
  }

  /**
   * Get transcription performance history
   */
  public getTranscriptionHistory(limit: number = 50): TranscriptionMetrics[] {
    return this.transcriptionHistory.slice(-limit);
  }

  /**
   * Check if performance is degraded
   */
  public isPerformanceDegraded(): boolean {
    return this.performanceAlerts.some(alert => alert.severity === 'critical');
  }

  /**
   * Get performance recommendations
   */
  public getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const criticalAlerts = this.performanceAlerts.filter(alert => alert.severity === 'critical');

    criticalAlerts.forEach(alert => {
      recommendations.push(...alert.recommendations);
    });

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  // Private methods
  private initializeThresholds(): PerformanceThresholds {
    return {
      memory: {
        warning: 150, // MB
        critical: 200, // MB
      },
      battery: {
        warning: 20, // percentage
        critical: 10, // percentage
      },
      network: {
        slowThreshold: 1, // Mbps
        highLatencyThreshold: 1000, // ms
      },
      rendering: {
        minFPS: 30,
        maxFrameTime: 33, // ms (for 30 FPS)
      },
      transcription: {
        maxProcessingTime: 30000, // ms per minute of audio
        minAccuracyRate: 0.8, // 80%
      },
      ui: {
        maxResponseTime: 200, // ms
        maxBlockingTime: 50, // ms per second
      },
    };
  }

  private setupEventListeners(): void {
    // Listen to component monitor events
    this.frameRateMonitor.on('frame_drop', (data) => {
      this.handleFrameDrop(data);
    });

    this.audioContextMonitor.on('audio_underrun', (data) => {
      this.handleAudioUnderrun(data);
    });

    this.networkMonitor.on('connection_change', (data) => {
      this.handleNetworkChange(data);
    });

    this.batteryMonitor.on('battery_low', (data) => {
      this.handleBatteryLow(data);
    });
  }

  private async establishBaseline(): Promise<void> {
    // Collect baseline metrics
    await this.collectMetrics();
    this.baselineMetrics = this.currentMetrics;

    if (this.config.debugMode) {
      console.log('[MobilePerformanceMonitor] Baseline metrics established');
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: MobilePerformanceMetrics = {
        timestamp: new Date(),
        memoryUsage: this.collectMemoryMetrics(),
        batteryUsage: await this.collectBatteryMetrics(),
        networkPerformance: this.collectNetworkMetrics(),
        audioPerformance: this.collectAudioMetrics(),
        renderingPerformance: this.collectRenderingMetrics(),
        thermalState: this.collectThermalMetrics(),
        transcriptionPerformance: this.aggregateTranscriptionMetrics(),
        fileProcessingMetrics: this.collectFileProcessingMetrics(),
        uiResponsiveness: this.collectUIResponsivenessMetrics(),
        deviceCapabilities: this.collectDeviceCapabilityMetrics(),
      };

      this.currentMetrics = metrics;
      this.performanceHistory.push(metrics);

      // Keep history manageable
      if (this.performanceHistory.length > 1000) {
        this.performanceHistory = this.performanceHistory.slice(-500);
      }

      // Check for performance alerts
      this.checkPerformanceAlerts(metrics);

      // Emit metrics update
      this.eventEmitter.emit('performance_metrics_updated', metrics);

    } catch (error) {
      console.error('[MobilePerformanceMonitor] Failed to collect metrics:', error);
    }
  }

  private collectMemoryMetrics(): MemoryMetrics {
    const memory = (performance as any).memory;
    if (!memory) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        memoryPressure: 'low',
        memoryLeakDetected: false,
        gcFrequency: 0,
        averageGCDuration: 0,
      };
    }

    const usedJSHeapSize = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    const totalJSHeapSize = memory.totalJSHeapSize / (1024 * 1024);
    const jsHeapSizeLimit = memory.jsHeapSizeLimit / (1024 * 1024);

    // Determine memory pressure
    let memoryPressure: MemoryMetrics['memoryPressure'] = 'low';
    if (usedJSHeapSize > this.performanceThresholds.memory.critical) {
      memoryPressure = 'critical';
    } else if (usedJSHeapSize > this.performanceThresholds.memory.warning) {
      memoryPressure = 'high';
    } else if (usedJSHeapSize > this.performanceThresholds.memory.warning * 0.7) {
      memoryPressure = 'medium';
    }

    // Check for memory leaks
    const memoryLeakDetected = this.detectMemoryLeak(usedJSHeapSize);

    return {
      usedJSHeapSize,
      totalJSHeapSize,
      jsHeapSizeLimit,
      memoryPressure,
      memoryLeakDetected,
      gcFrequency: this.calculateGCFrequency(),
      averageGCDuration: this.calculateAverageGCDuration(),
    };
  }

  private async collectBatteryMetrics(): Promise<BatteryMetrics> {
    return this.batteryMonitor.getCurrentMetrics();
  }

  private collectNetworkMetrics(): NetworkMetrics {
    return this.networkMonitor.getCurrentMetrics();
  }

  private collectAudioMetrics(): AudioMetrics {
    return this.audioContextMonitor.getCurrentMetrics();
  }

  private collectRenderingMetrics(): RenderingMetrics {
    return this.frameRateMonitor.getCurrentMetrics();
  }

  private collectThermalMetrics(): ThermalMetrics {
    // Browser thermal API is not widely supported
    // Use heuristics based on performance degradation
    return {
      thermalState: 'nominal',
      cpuThrottling: false,
      gpuThrottling: false,
      thermalPressure: 0,
      performanceImpact: 'none',
    };
  }

  private aggregateTranscriptionMetrics(): TranscriptionMetrics {
    if (this.transcriptionHistory.length === 0) {
      return {
        averageProcessingTime: 0,
        transcriptionSpeed: 0,
        accuracyRate: 0,
        memoryUsagePerMinute: 0,
        cpuUsageDuringTranscription: 0,
        networkUsagePerMinute: 0,
        errorRate: 0,
        retryRate: 0,
        concurrentTranscriptions: this.activeTranscriptions.size,
        queueDepth: 0,
      };
    }

    const recent = this.transcriptionHistory.slice(-10);
    const totalProcessingTime = recent.reduce((sum, m) => sum + m.averageProcessingTime, 0);
    const totalAccuracy = recent.reduce((sum, m) => sum + m.accuracyRate, 0);
    const totalErrors = recent.reduce((sum, m) => sum + m.errorRate, 0);

    return {
      averageProcessingTime: totalProcessingTime / recent.length,
      transcriptionSpeed: recent[recent.length - 1]?.transcriptionSpeed || 0,
      accuracyRate: totalAccuracy / recent.length,
      memoryUsagePerMinute: recent[recent.length - 1]?.memoryUsagePerMinute || 0,
      cpuUsageDuringTranscription: recent[recent.length - 1]?.cpuUsageDuringTranscription || 0,
      networkUsagePerMinute: recent[recent.length - 1]?.networkUsagePerMinute || 0,
      errorRate: totalErrors / recent.length,
      retryRate: recent[recent.length - 1]?.retryRate || 0,
      concurrentTranscriptions: this.activeTranscriptions.size,
      queueDepth: 0, // Would calculate from transcription queue
    };
  }

  private collectFileProcessingMetrics(): FileProcessingMetrics {
    // Would calculate from file processing history
    return {
      averageUploadSpeed: 0,
      averageDownloadSpeed: 0,
      fileProcessingTime: 0,
      compressionRatio: 0,
      uploadSuccessRate: 0,
      downloadSuccessRate: 0,
      retryCount: 0,
      cacheHitRate: 0,
      storageUsage: 0,
      storageAvailable: 0,
    };
  }

  private collectUIResponsivenessMetrics(): UIResponsivenessMetrics {
    // Would measure from interaction events
    return {
      averageResponseTime: 0,
      touchResponseTime: 0,
      gestureRecognitionTime: 0,
      inputDelay: 0,
      blockingTime: 0,
      totalBlockingTime: 0,
      interactionToNextPaint: 0,
      firstInputDelay: 0,
      longestInputDelay: 0,
      inputResponsivenessScore: 0,
    };
  }

  private collectDeviceCapabilityMetrics(): DeviceCapabilityMetrics {
    return {
      cpuCores: navigator.hardwareConcurrency || 1,
      maxClockSpeed: 0, // Not available in browsers
      availableMemory: (performance as any).memory?.jsHeapSizeLimit / (1024 * 1024) || 0,
      gpuType: 'unknown',
      gpuPerformance: 'medium',
      sensorSupport: this.getAvailableSensors(),
      codecSupport: this.getSupportedCodecs(),
      webAssemblySupport: typeof WebAssembly !== 'undefined',
      webGLSupport: !!this.getWebGLContext(),
      webGL2Support: !!this.getWebGL2Context(),
      webAudioSupport: typeof AudioContext !== 'undefined',
      maxConcurrentConnections: 6, // Browser default
    };
  }

  private checkPerformanceAlerts(metrics: MobilePerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Check memory usage
    if (metrics.memoryUsage.memoryPressure === 'critical') {
      alerts.push({
        id: `memory_${Date.now()}`,
        type: 'memory',
        severity: 'critical',
        metric: 'memoryUsage',
        currentValue: metrics.memoryUsage.usedJSHeapSize,
        threshold: this.performanceThresholds.memory.critical,
        message: 'Critical memory usage detected',
        timestamp: new Date(),
        recommendations: [
          'Close unused tabs',
          'Restart the application',
          'Clear cache and data',
        ],
        context: { memoryPressure: metrics.memoryUsage.memoryPressure },
      });
    }

    // Check battery level
    if (metrics.batteryUsage.level < this.performanceThresholds.battery.critical / 100) {
      alerts.push({
        id: `battery_${Date.now()}`,
        type: 'battery',
        severity: 'critical',
        metric: 'batteryLevel',
        currentValue: metrics.batteryUsage.level * 100,
        threshold: this.performanceThresholds.battery.critical,
        message: 'Critical battery level detected',
        timestamp: new Date(),
        recommendations: [
          'Connect to charger',
          'Enable power saving mode',
          'Reduce background processing',
        ],
        context: { charging: metrics.batteryUsage.charging },
      });
    }

    // Check rendering performance
    if (metrics.renderingPerformance.frameRate < this.performanceThresholds.rendering.minFPS) {
      alerts.push({
        id: `rendering_${Date.now()}`,
        type: 'rendering',
        severity: 'warning',
        metric: 'frameRate',
        currentValue: metrics.renderingPerformance.frameRate,
        threshold: this.performanceThresholds.rendering.minFPS,
        message: 'Low frame rate detected',
        timestamp: new Date(),
        recommendations: [
          'Reduce animation complexity',
          'Enable GPU acceleration',
          'Optimize rendering pipeline',
        ],
        context: {
          frameDrops: metrics.renderingPerformance.frameDrops,
          averageFrameTime: metrics.renderingPerformance.averageFrameTime,
        },
      });
    }

    // Add alerts to history
    this.performanceAlerts.push(...alerts);

    // Keep history manageable
    if (this.performanceAlerts.length > 100) {
      this.performanceAlerts = this.performanceAlerts.slice(-50);
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.eventEmitter.emit('performance_alert', alert);
    });
  }

  private detectMemoryLeak(currentUsage: number): boolean {
    this.memoryMeasurements.push({ timestamp: Date.now(), used: currentUsage });

    // Keep only last 100 measurements
    if (this.memoryMeasurements.length > 100) {
      this.memoryMeasurements = this.memoryMeasurements.slice(-100);
    }

    // Check for consistent memory growth over time
    if (this.memoryMeasurements.length < 20) return false;

    const recent = this.memoryMeasurements.slice(-20);
    const firstUsage = recent[0].used;
    const lastUsage = recent[recent.length - 1].used;
    const growthRate = (lastUsage - firstUsage) / firstUsage;

    return growthRate > 0.5; // 50% growth indicates potential leak
  }

  private calculateGCFrequency(): number {
    // Would track garbage collection events
    return 0;
  }

  private calculateAverageGCDuration(): number {
    // Would track GC duration
    return 0;
  }

  private calculateTranscriptionMetrics(tracker: TranscriptionPerformanceTracker): TranscriptionMetrics {
    const audioMinutes = tracker.fileSize / (1024 * 1024) / 10; // Rough estimate
    const processingTimePerMinute = tracker.processingTime / (audioMinutes || 1);
    const transcriptionSpeed = audioMinutes > 0 ? (audioMinutes * 60) / (tracker.processingTime / 1000) : 0;

    return {
      averageProcessingTime: processingTimePerMinute,
      transcriptionSpeed,
      accuracyRate: tracker.currentAccuracy || 0,
      memoryUsagePerMinute: (this.getMemoryUsage() - tracker.memoryUsageAtStart) / (audioMinutes || 1),
      cpuUsageDuringTranscription: 0, // Would measure during transcription
      networkUsagePerMinute: (this.networkMonitor.getCurrentUsage() - tracker.networkUsageAtStart) / (audioMinutes || 1),
      errorRate: tracker.success ? 0 : 1,
      retryRate: 0, // Would track retry attempts
      concurrentTranscriptions: this.activeTranscriptions.size,
      queueDepth: 0,
    };
  }

  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize / (1024 * 1024) || 0;
  }

  private getAvailableSensors(): string[] {
    const sensors: string[] = [];

    if ('DeviceOrientationEvent' in window) sensors.push('orientation');
    if ('DeviceMotionEvent' in window) sensors.push('motion');
    if ('AmbientLightSensor' in window) sensors.push('light');
    if ('ProximitySensor' in window) sensors.push('proximity');
    if ('BatteryManager' in window) sensors.push('battery');

    return sensors;
  }

  private getSupportedCodecs(): string[] {
    const codecs: string[] = [];
    const audio = document.createElement('audio');
    const video = document.createElement('video');

    // Check common audio codecs
    if (audio.canPlayType('audio/mp4; codecs="mp3"') !== '') codecs.push('mp3');
    if (audio.canPlayType('audio/mp4; codecs="aac"') !== '') codecs.push('aac');
    if (audio.canPlayType('audio/ogg; codecs="vorbis"') !== '') codecs.push('vorbis');
    if (audio.canPlayType('audio/ogg; codecs="opus"') !== '') codecs.push('opus');

    // Check common video codecs
    if (video.canPlayType('video/mp4; codecs="h264"') !== '') codecs.push('h264');
    if (video.canPlayType('video/webm; codecs="vp8"') !== '') codecs.push('vp8');
    if (video.canPlayType('video/webm; codecs="vp9"') !== '') codecs.push('vp9');

    return codecs;
  }

  private getWebGLContext(): WebGLRenderingContext | null {
    try {
      const canvas = document.createElement('canvas');
      return canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch {
      return null;
    }
  }

  private getWebGL2Context(): WebGL2RenderingContext | null {
    try {
      const canvas = document.createElement('canvas');
      return canvas.getContext('webgl2');
    } catch {
      return null;
    }
  }

  // Event handlers
  private handleFrameDrop(data: { frameRate: number; droppedFrames: number }): void {
    this.eventEmitter.emit('performance_degradation', {
      type: 'rendering',
      metric: 'frameRate',
      value: data.frameRate,
      threshold: this.performanceThresholds.rendering.minFPS,
    });
  }

  private handleAudioUnderrun(data: { latency: number; bufferUnderruns: number }): void {
    this.eventEmitter.emit('performance_degradation', {
      type: 'audio',
      metric: 'audioLatency',
      value: data.latency,
      threshold: 100, // 100ms threshold
    });
  }

  private handleNetworkChange(data: { type: string; quality: string }): void {
    this.eventEmitter.emit('network_change', data);
  }

  private handleBatteryLow(data: { level: number; charging: boolean }): void {
    this.eventEmitter.emit('battery_low', data);
  }
}

// ============================================================================
// SUPPORTING MONITOR CLASSES
// ============================================================================

/**
 * Frame rate monitor
 */
class FrameRateMonitor extends EventTarget {
  private isRunning = false;
  private frameCount = 0;
  private lastTime = 0;
  private frameTimeHistory: number[] = [];
  private droppedFrames = 0;
  private animationId?: number;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.measureFrameRate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  getCurrentMetrics(): RenderingMetrics {
    const currentTime = performance.now();
    const duration = currentTime - this.lastTime;
    const frameRate = duration > 0 ? (this.frameCount * 1000) / duration : 0;

    const averageFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length
      : 0;

    const longestFrame = this.frameTimeHistory.length > 0
      ? Math.max(...this.frameTimeHistory)
      : 0;

    return {
      frameRate,
      frameDrops: this.droppedFrames,
      totalFrameTime: duration,
      averageFrameTime,
      longestFrame,
      renderTime: 0, // Would need more detailed measurement
      paintTime: 0,
      layoutTime: 0,
      compositeTime: 0,
    };
  }

  private measureFrameRate(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;

    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory = this.frameTimeHistory.slice(-60);
    }

    // Check for dropped frames (frame time > 33ms for 30 FPS)
    if (frameTime > 33) {
      this.droppedFrames++;
      this.dispatchEvent(new CustomEvent('frame_drop', {
        detail: {
          frameRate: 1000 / frameTime,
          droppedFrames: this.droppedFrames
        }
      }));
    }

    this.frameCount++;
    this.lastTime = currentTime;

    this.animationId = requestAnimationFrame(() => this.measureFrameRate());
  }
}

/**
 * Audio context monitor
 */
class AudioContextMonitor extends EventTarget {
  private isRunning = false;
  private audioContext: AudioContext | null = null;
  private bufferUnderruns = 0;
  private latencyMeasurements: number[] = [];

  async initialize(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('[AudioContextMonitor] AudioContext not supported');
    }
  }

  start(): void {
    this.isRunning = true;
    this.startMonitoring();
  }

  stop(): void {
    this.isRunning = false;
  }

  getCurrentMetrics(): AudioMetrics {
    return {
      audioLatency: this.getAverageLatency(),
      audioBufferUnderruns: this.bufferUnderruns,
      audioProcessingLatency: 0, // Would need more detailed measurement
      audioQuality: this.calculateAudioQuality(),
      sampleRate: this.audioContext?.sampleRate || 44100,
      bufferSize: 0, // Would get from audio nodes
      cpuUsageForAudio: 0,
      realTimeProcessingRatio: 0,
      droppedFrames: 0,
      audioContextState: this.audioContext?.state || 'closed',
    };
  }

  private startMonitoring(): void {
    // Would monitor audio performance in more detail
  }

  private getAverageLatency(): number {
    if (this.latencyMeasurements.length === 0) return 0;
    return this.latencyMeasurements.reduce((sum, latency) => sum + latency, 0) / this.latencyMeasurements.length;
  }

  private calculateAudioQuality(): number {
    // Would calculate based on various factors
    return 0.9;
  }
}

/**
 * Network monitor
 */
class NetworkMonitor extends EventTarget {
  private isRunning = false;
  private currentUsage = 0;
  private connection: any = null;

  async initialize(): Promise<void> {
    this.connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection;
  }

  start(): void {
    this.isRunning = true;
    this.startMonitoring();
  }

  stop(): void {
    this.isRunning = false;
  }

  getCurrentMetrics(): NetworkMetrics {
    if (!this.connection) {
      return {
        type: 'unknown',
        effectiveType: '4g',
        downlink: 0,
        rtt: 0,
        saveData: false,
        connectionQuality: 'good',
        packetLoss: 0,
        latencyVariation: 0,
        bandwidthUtilization: 0,
      };
    }

    return {
      type: this.connection.type || 'unknown',
      effectiveType: this.connection.effectiveType || '4g',
      downlink: this.connection.downlink || 0,
      rtt: this.connection.rtt || 0,
      saveData: this.connection.saveData || false,
      connectionQuality: this.assessConnectionQuality(),
      packetLoss: 0, // Would need to measure
      latencyVariation: 0, // Would need to measure
      bandwidthUtilization: 0, // Would need to measure
    };
  }

  getCurrentUsage(): number {
    return this.currentUsage;
  }

  private startMonitoring(): void {
    if (this.connection) {
      this.connection.addEventListener('change', () => {
        this.dispatchEvent(new CustomEvent('connection_change', {
          detail: {
            type: this.connection.type,
            quality: this.assessConnectionQuality(),
          },
        }));
      });
    }
  }

  private assessConnectionQuality(): NetworkMetrics['connectionQuality'] {
    if (!this.connection) return 'good';

    const downlink = this.connection.downlink || 0;
    const rtt = this.connection.rtt || 0;

    if (downlink > 10 && rtt < 50) return 'excellent';
    if (downlink > 5 && rtt < 100) return 'good';
    if (downlink > 1 && rtt < 300) return 'fair';
    return 'poor';
  }
}

/**
 * Battery monitor
 */
class BatteryMonitor extends EventTarget {
  private isRunning = false;
  private battery: any = null;

  async initialize(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        this.battery = await (navigator as any).getBattery();
      } catch (error) {
        console.warn('[BatteryMonitor] Battery API not available');
      }
    }
  }

  start(): void {
    this.isRunning = true;
    this.startMonitoring();
  }

  stop(): void {
    this.isRunning = false;
  }

  async getCurrentMetrics(): Promise<BatteryMetrics> {
    if (!this.battery) {
      return this.getFallbackBatteryMetrics();
    }

    return {
      level: this.battery.level,
      charging: this.battery.charging,
      chargingTime: this.battery.chargingTime,
      dischargingTime: this.battery.dischargingTime,
      powerConsumptionRate: this.calculatePowerConsumptionRate(),
      batteryTemperature: undefined, // Not available in browsers
      isLowPowerMode: 'getBatteryInfo' in navigator, // iOS only
      batteryHealth: this.assessBatteryHealth(),
      estimatedBatteryLife: this.battery.dischargingTime,
    };
  }

  private startMonitoring(): void {
    if (this.battery) {
      this.battery.addEventListener('levelchange', () => {
        if (this.battery.level < 0.2) {
          this.dispatchEvent(new CustomEvent('battery_low', {
            detail: {
              level: this.battery.level,
              charging: this.battery.charging,
            },
          }));
        }
      });

      this.battery.addEventListener('chargingchange', () => {
        this.dispatchEvent(new CustomEvent('charging_change', {
          detail: {
            charging: this.battery.charging,
          },
        }));
      });
    }
  }

  private getFallbackBatteryMetrics(): BatteryMetrics {
    return {
      level: 1, // Assume full battery
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      powerConsumptionRate: 0,
      isLowPowerMode: false,
      batteryHealth: 'good',
      estimatedBatteryLife: Infinity,
    };
  }

  private calculatePowerConsumptionRate(): number {
    // Would need to track battery level over time
    return 0;
  }

  private assessBatteryHealth(): BatteryMetrics['batteryHealth'] {
    // Would assess based on performance and capacity
    return 'good';
  }
}

/**
 * Transcription performance tracker interface
 */
interface TranscriptionPerformanceTracker {
  id: string;
  fileId: number;
  filename: string;
  fileSize: number;
  startTime: number;
  endTime: number;
  processingTime: number;
  memoryUsageAtStart: number;
  networkUsageAtStart: number;
  currentProgress?: number;
  currentAccuracy?: number;
  success?: boolean;
  errorMessage?: string;
}

export default MobilePerformanceMonitor;
