/**
 * Analytics Integration Utilities
 *
 * Provides integration between the mobile analytics system and existing
 * error handling, performance monitoring, and other app systems.
 *
 * @version 1.0.0
 */

import MobileAnalytics, { AnalyticsEventType, TouchInteractionData, AudioPlaybackData, TranscriptionData, FileManagementData } from './mobile-analytics';
import { AnalyticsInsightsEngine } from './analytics-insights';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { ErrorHandler } from '../utils/error-handler';

// ============================================================================
// INTEGRATION INTERFACES
// ============================================================================

/**
 * Integration configuration
 */
export interface AnalyticsIntegrationConfig {
  // Error tracking integration
  enableErrorTracking: boolean;
  errorSamplingRate: number; // 0-1
  trackUserAgent: boolean;
  trackBreadcrumbs: boolean;
  maxBreadcrumbs: number;

  // Performance integration
  enablePerformanceTracking: boolean;
  performanceSamplingRate: number; // 0-1
  trackResourceTiming: boolean;
  trackUserTiming: boolean;
  trackLongTasks: boolean;

  // Audio player integration
  enableAudioTracking: boolean;
  trackPlaybackEvents: boolean;
  trackPerformanceMetrics: boolean;
  trackUserInteractions: boolean;

  // Transcription integration
  enableTranscriptionTracking: boolean;
  trackProgressUpdates: boolean;
  trackPerformanceMetrics: boolean;
  trackErrorRecovery: boolean;

  // File management integration
  enableFileTracking: boolean;
  trackUploadProgress: boolean;
  trackStorageUsage: boolean;
  trackFileOperations: boolean;

  // Custom integration points
  customEventMappings: Record<string, AnalyticsEventType>;
  customContextProviders: Array<() => Record<string, any>>;
  customMetrics: Array<() => Record<string, number>>;
}

/**
 * Error breadcrumb data
 */
export interface ErrorBreadcrumb {
  timestamp: Date;
  type: 'navigation' | 'user' | 'http' | 'console' | 'error' | 'dom';
  message: string;
  data?: Record<string, any>;
  level: 'debug' | 'info' | 'warning' | 'error';
}

/**
 * Performance metric data
 */
export interface PerformanceMetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
  context?: Record<string, any>;
}

/**
 * Audio player tracking data
 */
export interface AudioPlayerTrackingData {
  playerId: string;
  fileId: number;
  filename: string;
  duration: number;
  currentTime: number;
  playbackRate: number;
  volume: number;
  action: 'play' | 'pause' | 'seek' | 'speed_change' | 'volume_change' | 'ended' | 'error';
  metadata?: {
    codec?: string;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
  };
}

/**
 * Transcription tracking data
 */
export interface TranscriptionTrackingData {
  trackingId: string;
  fileId: number;
  filename: string;
  fileSize: number;
  duration?: number;
  language?: string;
  model?: string;
  startTime: Date;
  status: 'started' | 'progress' | 'completed' | 'failed' | 'cancelled';
  progress?: number; // 0-1
  processingTime?: number; // ms
  errorMessage?: string;
  errorCode?: string;
  accuracy?: number; // 0-1
  wordCount?: number;
  performance?: {
    memoryUsage?: number; // MB
    cpuUsage?: number; // %
    networkUsage?: number; // MB
    realTimeFactor?: number; // processing time / audio duration
  };
}

/**
 * File operation tracking data
 */
export interface FileOperationTrackingData {
  operationId: string;
  fileId?: number;
  filename: string;
  fileType: string;
  fileSize: number;
  action: 'upload' | 'download' | 'delete' | 'share' | 'rename' | 'move' | 'copy';
  status: 'started' | 'progress' | 'completed' | 'failed' | 'cancelled';
  progress?: number; // 0-1
  duration?: number; // ms
  speed?: number; // bytes per second
  error?: string;
  context?: {
    source?: string;
    destination?: string;
    method?: 'drag_drop' | 'click' | 'api' | 'share_intent';
    networkType?: string;
    offlineMode?: boolean;
  };
}

// ============================================================================
// ANALYTICS INTEGRATION MANAGER
// ============================================================================

/**
 * Manages integration between analytics and existing app systems
 */
export class AnalyticsIntegrationManager {
  private analytics: MobileAnalytics;
  private insightsEngine: AnalyticsInsightsEngine;
  private config: AnalyticsIntegrationConfig;
  private performanceMonitor: PerformanceMonitor;
  private errorHandler: ErrorHandler;
  private isEnabled = false;

  // State tracking
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private activeTranscriptions = new Map<string, TranscriptionTrackingData>();
  private activeFileOperations = new Map<string, FileOperationTrackingData>();
  private audioPlayerStates = new Map<string, AudioPlayerTrackingData>();
  private customMetrics: Record<string, number> = {};

  // Performance observers
  private performanceObservers: Map<string, PerformanceObserver> = new Map();

  constructor(
    analytics: MobileAnalytics,
    config: Partial<AnalyticsIntegrationConfig> = {}
  ) {
    this.analytics = analytics;
    this.insightsEngine = new AnalyticsInsightsEngine();
    this.config = this.mergeConfig(config);
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  /**
   * Initialize the integration manager
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize error tracking integration
      if (this.config.enableErrorTracking) {
        await this.initializeErrorTracking();
      }

      // Initialize performance tracking integration
      if (this.config.enablePerformanceTracking) {
        await this.initializePerformanceTracking();
      }

      // Set up global event listeners
      this.setupGlobalEventListeners();

      this.isEnabled = true;

      console.log('[AnalyticsIntegrationManager] Initialized successfully');

    } catch (error) {
      console.error('[AnalyticsIntegrationManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Stop all integrations
   */
  public stop(): void {
    // Disconnect performance observers
    this.performanceObservers.forEach(observer => observer.disconnect());
    this.performanceObservers.clear();

    // Clear state
    this.breadcrumbs = [];
    this.activeTranscriptions.clear();
    this.activeFileOperations.clear();
    this.audioPlayerStates.clear();

    this.isEnabled = false;

    console.log('[AnalyticsIntegrationManager] Stopped');
  }

  /**
   * Track error with additional context
   */
  public async trackError(
    error: Error,
    context: {
      level?: 'debug' | 'info' | 'warning' | 'error';
      tags?: Record<string, string>;
      extra?: Record<string, any>;
      userContext?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.config.enableErrorTracking) return;

    // Apply sampling
    if (Math.random() > this.config.errorSamplingRate) return;

    // Add breadcrumb
    if (this.config.trackBreadcrumbs) {
      this.addBreadcrumb({
        timestamp: new Date(),
        type: 'error',
        message: error.message,
        data: {
          name: error.name,
          stack: error.stack,
          ...context.extra,
        },
        level: context.level || 'error',
      });
    }

    // Track in analytics
    await this.analytics.trackError(error, {
      level: context.level || 'error',
      tags: context.tags,
      breadcrumbs: this.config.trackBreadcrumbs ? this.getBreadcrumbs() : undefined,
      userContext: context.userContext,
    });
  }

  /**
   * Track performance metric
   */
  public async trackPerformanceMetric(metric: PerformanceMetricData): Promise<void> {
    if (!this.config.enablePerformanceTracking) return;

    // Apply sampling
    if (Math.random() > this.config.performanceSamplingRate) return;

    await this.analytics.trackPerformanceMetric(
      metric.name,
      metric.value,
      metric.unit,
      metric.tags
    );

    // Update custom metrics
    this.customMetrics[metric.name] = metric.value;
  }

  /**
   * Track audio player event
   */
  public async trackAudioPlayer(data: AudioPlayerTrackingData): Promise<void> {
    if (!this.config.enableAudioTracking) return;

    // Update player state
    this.audioPlayerStates.set(data.playerId, data);

    if (this.config.trackPlaybackEvents) {
      await this.analytics.trackAudioPlayback({
        fileId: data.fileId,
        filename: data.filename,
        duration: data.duration,
        currentTime: data.currentTime,
        playbackRate: data.playbackRate,
        volume: data.volume,
        action: data.action,
      } as AudioPlaybackData);
    }

    if (this.config.trackPerformanceMetrics) {
      // Track audio-specific performance metrics
      if (data.metadata) {
        await this.trackPerformanceMetric({
          name: 'audio_codec_quality',
          value: this.calculateCodecQuality(data.metadata),
          unit: 'score',
          timestamp: new Date(),
          tags: { codec: data.metadata.codec || 'unknown' },
        });

        await this.trackPerformanceMetric({
          name: 'audio_playback_quality',
          value: this.calculatePlaybackQuality(data),
          unit: 'score',
          timestamp: new Date(),
          tags: { action: data.action },
        });
      }
    }
  }

  /**
   * Start tracking transcription
   */
  public startTranscriptionTracking(data: Omit<TranscriptionTrackingData, 'trackingId' | 'startTime' | 'status'>): string {
    if (!this.config.enableTranscriptionTracking) return '';

    const trackingId = `transcription_${data.fileId}_${Date.now()}`;

    const trackingData: TranscriptionTrackingData = {
      trackingId,
      ...data,
      startTime: new Date(),
      status: 'started',
    };

    this.activeTranscriptions.set(trackingId, trackingData);

    // Track start event
    this.analytics.trackTranscription({
      fileId: data.fileId,
      filename: data.filename,
      fileSize: data.fileSize,
      duration: data.duration,
      language: data.language,
      startTime: trackingData.startTime,
      status: 'started',
    } as TranscriptionData);

    return trackingId;
  }

  /**
   * Update transcription progress
   */
  public updateTranscriptionProgress(trackingId: string, progress: number, additionalData?: Partial<TranscriptionTrackingData>): void {
    if (!this.config.enableTranscriptionTracking) return;

    const tracking = this.activeTranscriptions.get(trackingId);
    if (!tracking) return;

    tracking.progress = progress;
    if (additionalData) {
      Object.assign(tracking, additionalData);
    }

    if (this.config.trackProgressUpdates) {
      this.analytics.trackTranscription({
        fileId: tracking.fileId,
        filename: tracking.filename,
        startTime: tracking.startTime,
        status: 'progress',
        progress,
      } as TranscriptionData);
    }
  }

  /**
   * Complete transcription tracking
   */
  public async completeTranscriptionTracking(
    trackingId: string,
    result: {
      success: boolean;
      accuracy?: number;
      wordCount?: number;
      processingTime?: number;
      errorMessage?: string;
      errorCode?: string;
      performance?: TranscriptionTrackingData['performance'];
    }
  ): Promise<void> {
    if (!this.config.enableTranscriptionTracking) return;

    const tracking = this.activeTranscriptions.get(trackingId);
    if (!tracking) return;

    const endTime = new Date();
    const processingTime = result.processingTime || (endTime.getTime() - tracking.startTime.getTime());

    // Update tracking data
    tracking.status = result.success ? 'completed' : 'failed';
    tracking.processingTime = processingTime;
    tracking.accuracy = result.accuracy;
    tracking.wordCount = result.wordCount;
    tracking.errorMessage = result.errorMessage;
    tracking.errorCode = result.errorCode;
    tracking.performance = result.performance;

    // Track completion event
    await this.analytics.trackTranscription({
      fileId: tracking.fileId,
      filename: tracking.filename,
      fileSize: tracking.fileSize,
      duration: tracking.duration,
      language: tracking.language,
      startTime: tracking.startTime,
      status: tracking.status,
      processingTime,
      accuracy: result.accuracy,
      wordCount: result.wordCount,
      errorMessage: result.errorMessage,
    } as TranscriptionData);

    if (this.config.trackPerformanceMetrics && result.performance) {
      await this.trackTranscriptionPerformance(trackingId, result.performance);
    }

    // Remove from active tracking
    this.activeTranscriptions.delete(trackingId);
  }

  /**
   * Start file operation tracking
   */
  public startFileOperationTracking(data: Omit<FileOperationTrackingData, 'operationId' | 'status'>): string {
    if (!this.config.enableFileTracking) return '';

    const operationId = `file_${data.action}_${data.fileId || data.filename}_${Date.now()}`;

    const trackingData: FileOperationTrackingData = {
      operationId,
      ...data,
      status: 'started',
    };

    this.activeFileOperations.set(operationId, trackingData);

    // Track start event
    this.analytics.trackFileManagement({
      fileId: data.fileId || 0,
      filename: data.filename,
      fileType: data.fileType,
      fileSize: data.fileSize,
      action: data.action,
      uploadMethod: data.context?.method,
      source: data.context?.source,
    } as FileManagementData);

    return operationId;
  }

  /**
   * Update file operation progress
   */
  public updateFileOperationProgress(operationId: string, progress: number, additionalData?: Partial<FileOperationTrackingData>): void {
    if (!this.config.enableFileTracking) return;

    const tracking = this.activeFileOperations.get(operationId);
    if (!tracking) return;

    tracking.progress = progress;
    if (additionalData) {
      Object.assign(tracking, additionalData);
    }

    if (this.config.trackUploadProgress) {
      // Progress events would be throttled in a real implementation
      // This is just a placeholder
    }
  }

  /**
   * Complete file operation tracking
   */
  public async completeFileOperation(
    operationId: string,
    result: {
      success: boolean;
      duration?: number;
      speed?: number;
      error?: string;
    }
  ): Promise<void> {
    if (!this.config.enableFileTracking) return;

    const tracking = this.activeFileOperations.get(operationId);
    if (!tracking) return;

    tracking.status = result.success ? 'completed' : 'failed';
    tracking.duration = result.duration;
    tracking.speed = result.speed;
    tracking.error = result.error;

    // Track completion event
    await this.analytics.trackFileManagement({
      fileId: tracking.fileId || 0,
      filename: tracking.filename,
      fileType: tracking.fileType,
      fileSize: tracking.fileSize,
      action: tracking.action,
      uploadTime: result.duration,
      error: result.error,
      uploadMethod: tracking.context?.method,
      source: tracking.context?.source,
    } as FileManagementData);

    if (this.config.trackStorageUsage) {
      await this.trackStorageUsage();
    }

    // Remove from active tracking
    this.activeFileOperations.delete(operationId);
  }

  /**
   * Track custom event
   */
  public async trackCustomEvent(
    eventName: string,
    data: Record<string, any>,
    context?: Record<string, any>
  ): Promise<void> {
    // Map to analytics event type if configured
    const mappedType = this.config.customEventMappings[eventName];
    if (mappedType) {
      await this.analytics.trackEvent(mappedType, data, context);
    }

    // Collect custom context providers
    const customContext = this.collectCustomContext();
    const finalContext = { ...context, ...customContext };

    // Collect custom metrics
    const customMetrics = this.collectCustomMetrics();
    Object.entries(customMetrics).forEach(([name, value]) => {
      this.analytics.trackPerformanceMetric(name, value, 'custom');
    });
  }

  /**
   * Get integration status
   */
  public getStatus(): {
    enabled: boolean;
    activeTranscriptions: number;
    activeFileOperations: number;
    breadcrumbsCount: number;
    customMetricsCount: number;
    performanceObserversCount: number;
  } {
    return {
      enabled: this.isEnabled,
      activeTranscriptions: this.activeTranscriptions.size,
      activeFileOperations: this.activeFileOperations.size,
      breadcrumbsCount: this.breadcrumbs.length,
      customMetricsCount: Object.keys(this.customMetrics).length,
      performanceObserversCount: this.performanceObservers.size,
    };
  }

  // Private initialization methods
  private mergeConfig(userConfig: Partial<AnalyticsIntegrationConfig>): AnalyticsIntegrationConfig {
    const defaultConfig: AnalyticsIntegrationConfig = {
      enableErrorTracking: true,
      errorSamplingRate: 1.0,
      trackUserAgent: true,
      trackBreadcrumbs: true,
      maxBreadcrumbs: 100,

      enablePerformanceTracking: true,
      performanceSamplingRate: 1.0,
      trackResourceTiming: true,
      trackUserTiming: true,
      trackLongTasks: true,

      enableAudioTracking: true,
      trackPlaybackEvents: true,
      trackPerformanceMetrics: true,
      trackUserInteractions: true,

      enableTranscriptionTracking: true,
      trackProgressUpdates: true,
      trackPerformanceMetrics: true,
      trackErrorRecovery: true,

      enableFileTracking: true,
      trackUploadProgress: true,
      trackStorageUsage: true,
      trackFileOperations: true,

      customEventMappings: {},
      customContextProviders: [],
      customMetrics: [],
    };

    return { ...defaultConfig, ...userConfig };
  }

  private async initializeErrorTracking(): Promise<void> {
    // Set up global error handlers
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message), {
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript_error',
        },
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(`Unhandled promise rejection: ${event.reason}`), {
        extra: {
          reason: event.reason,
          type: 'unhandled_promise_rejection',
        },
      });
    });

    // Track console errors/warnings
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      this.trackError(new Error(args.join(' ')), {
        level: 'error',
        extra: {
          args,
          type: 'console_error',
        },
      });
      originalConsoleError.apply(console, args);
    };

    // Track navigation events as breadcrumbs
    if (this.config.trackBreadcrumbs) {
      window.addEventListener('beforeunload', () => {
        this.addBreadcrumb({
          timestamp: new Date(),
          type: 'navigation',
          message: 'Page unload',
          level: 'info',
        });
      });

      // Track route changes
      let lastPath = window.location.pathname;
      const checkRouteChange = () => {
        const currentPath = window.location.pathname;
        if (currentPath !== lastPath) {
          this.addBreadcrumb({
            timestamp: new Date(),
            type: 'navigation',
            message: `Navigation from ${lastPath} to ${currentPath}`,
            data: { from: lastPath, to: currentPath },
            level: 'info',
          });
          lastPath = currentPath;
        }
      };

      // Check for route changes periodically
      setInterval(checkRouteChange, 1000);
    }
  }

  private async initializePerformanceTracking(): Promise<void> {
    // Track Navigation Timing
    if (this.config.trackResourceTiming && 'performance' in window) {
      this.trackNavigationTiming();
    }

    // Track Long Tasks
    if (this.config.trackLongTasks && 'PerformanceObserver' in window) {
      this.trackLongTasks();
    }

    // Track Resource Timing
    if (this.config.trackResourceTiming && 'PerformanceObserver' in window) {
      this.trackResourceTiming();
    }

    // Track User Timing
    if (this.config.trackUserTiming && 'PerformanceObserver' in window) {
      this.trackUserTiming();
    }
  }

  private setupGlobalEventListeners(): void {
    // Track touch events for analytics
    if (this.config.enableAudioTracking && this.config.trackUserInteractions) {
      document.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        if (touch) {
          this.analytics.trackTouchInteraction({
            target: 'screen', // Would be more specific in real implementation
            interactionType: 'touch',
            position: { x: touch.clientX, y: touch.clientY },
            pressure: touch.force,
            duration: 0,
            success: true,
          } as TouchInteractionData);
        }
      }, { passive: true });
    }
  }

  private addBreadcrumb(breadcrumb: ErrorBreadcrumb): void {
    this.breadcrumbs.push(breadcrumb);

    // Keep only the latest breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  private getBreadcrumbs(): ErrorBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  private calculateCodecQuality(metadata: AudioPlayerTrackingData['metadata']): number {
    // Simplified codec quality calculation
    if (!metadata.codec) return 0.5;

    const codecScores: Record<string, number> = {
      'aac': 0.9,
      'mp3': 0.8,
      'opus': 1.0,
      'vorbis': 0.7,
      'flac': 1.0,
    };

    return codecScores[metadata.codec.toLowerCase()] || 0.5;
  }

  private calculatePlaybackQuality(data: AudioPlayerTrackingData): number {
    // Simplified playback quality calculation
    let quality = 0.8; // Base quality

    // Adjust for playback rate (unusual rates might indicate issues)
    if (data.playbackRate && (data.playbackRate < 0.5 || data.playbackRate > 2.0)) {
      quality -= 0.2;
    }

    // Adjust for volume (very low volume might indicate issues)
    if (data.volume && data.volume < 0.1) {
      quality -= 0.1;
    }

    return Math.max(0, Math.min(1, quality));
  }

  private async trackTranscriptionPerformance(trackingId: string, performance: TranscriptionTrackingData['performance']): Promise<void> {
    if (!performance) return;

    const tracking = this.activeTranscriptions.get(trackingId);
    if (!tracking) return;

    if (performance.memoryUsage !== undefined) {
      await this.trackPerformanceMetric({
        name: 'transcription_memory_usage',
        value: performance.memoryUsage,
        unit: 'MB',
        timestamp: new Date(),
        tags: { fileId: tracking.fileId.toString() },
      });
    }

    if (performance.cpuUsage !== undefined) {
      await this.trackPerformanceMetric({
        name: 'transcription_cpu_usage',
        value: performance.cpuUsage,
        unit: 'percent',
        timestamp: new Date(),
        tags: { fileId: tracking.fileId.toString() },
      });
    }

    if (performance.networkUsage !== undefined) {
      await this.trackPerformanceMetric({
        name: 'transcription_network_usage',
        value: performance.networkUsage,
        unit: 'MB',
        timestamp: new Date(),
        tags: { fileId: tracking.fileId.toString() },
      });
    }

    if (performance.realTimeFactor !== undefined) {
      await this.trackPerformanceMetric({
        name: 'transcription_real_time_factor',
        value: performance.realTimeFactor,
        unit: 'ratio',
        timestamp: new Date(),
        tags: { fileId: tracking.fileId.toString() },
      });
    }
  }

  private async trackStorageUsage(): Promise<void> {
    try {
      // Estimate localStorage usage
      let localStorageUsage = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageUsage += localStorage[key].length + key.length;
        }
      }

      await this.trackPerformanceMetric({
        name: 'local_storage_usage',
        value: localStorageUsage,
        unit: 'bytes',
        timestamp: new Date(),
      });

      // Check quota if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          await this.trackPerformanceMetric({
            name: 'total_storage_usage',
            value: estimate.usage,
            unit: 'bytes',
            timestamp: new Date(),
          });
        }
        if (estimate.quota) {
          await this.trackPerformanceMetric({
            name: 'storage_quota',
            value: estimate.quota,
            unit: 'bytes',
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.warn('[AnalyticsIntegrationManager] Failed to track storage usage:', error);
    }
  }

  private collectCustomContext(): Record<string, any> {
    const context: Record<string, any> = {};

    this.config.customContextProviders.forEach(provider => {
      try {
        const providerContext = provider();
        Object.assign(context, providerContext);
      } catch (error) {
        console.warn('[AnalyticsIntegrationManager] Custom context provider failed:', error);
      }
    });

    return context;
  }

  private collectCustomMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};

    this.config.customMetrics.forEach(metricProvider => {
      try {
        const providerMetrics = metricProvider();
        Object.assign(metrics, providerMetrics);
      } catch (error) {
        console.warn('[AnalyticsIntegrationManager] Custom metrics provider failed:', error);
      }
    });

    return metrics;
  }

  private trackNavigationTiming(): void {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.trackPerformanceMetric({
          name: 'navigation_start_to_dom_content_loaded',
          value: navigation.domContentLoadedEventStart - navigation.navigationStart,
          unit: 'ms',
          timestamp: new Date(),
        });

        this.trackPerformanceMetric({
          name: 'navigation_start_to_load_complete',
          value: navigation.loadEventEnd - navigation.navigationStart,
          unit: 'ms',
          timestamp: new Date(),
        });
      }
    }
  }

  private trackLongTasks(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.trackPerformanceMetric({
              name: 'long_task_duration',
              value: entry.duration,
              unit: 'ms',
              timestamp: new Date(),
              tags: { name: entry.name || 'unknown' },
            });
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.performanceObservers.set('longtask', observer);
    } catch (error) {
      console.warn('[AnalyticsIntegrationManager] Long task tracking not supported:', error);
    }
  }

  private trackResourceTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            this.trackPerformanceMetric({
              name: 'resource_load_time',
              value: resource.responseEnd - resource.requestStart,
              unit: 'ms',
              timestamp: new Date(),
              tags: {
                name: resource.name,
                type: this.getResourceType(resource.name),
              },
            });
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      this.performanceObservers.set('resource', observer);
    } catch (error) {
      console.warn('[AnalyticsIntegrationManager] Resource timing tracking not supported:', error);
    }
  }

  private trackUserTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.trackPerformanceMetric({
              name: entry.name,
              value: entry.duration,
              unit: 'ms',
              timestamp: new Date(),
            });
          }
        }
      });

      observer.observe({ entryTypes: ['measure'] });
      this.performanceObservers.set('measure', observer);
    } catch (error) {
      console.warn('[AnalyticsIntegrationManager] User timing tracking not supported:', error);
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (url.match(/\.(mp4|webm|ogg)$/i)) return 'video';
    if (url.match(/\.(mp3|wav|ogg)$/i)) return 'audio';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }
}

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Create analytics integration manager with sensible defaults
 */
export function createAnalyticsIntegration(
  analytics: MobileAnalytics,
  config?: Partial<AnalyticsIntegrationConfig>
): AnalyticsIntegrationManager {
  return new AnalyticsIntegrationManager(analytics, config);
}

/**
 * Default context providers for common app data
 */
export const defaultContextProviders = {
  /**
   * Get current user context
   */
  getUserContext: () => ({
    userId: localStorage.getItem('user_id'),
    sessionId: sessionStorage.getItem('session_id'),
    authenticated: !!localStorage.getItem('auth_token'),
  }),

  /**
   * Get app context
   */
  getAppContext: () => ({
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    environment: process.env.NODE_ENV,
    buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER,
  }),

  /**
   * Get device context
   */
  getDeviceContext: () => ({
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
  }),
};

/**
 * Default metrics providers for common performance data
 */
export const defaultMetricsProviders = {
  /**
   * Get memory usage
   */
  getMemoryUsage: () => {
    const memory = (performance as any).memory;
    return memory ? {
      used_memory_mb: memory.usedJSHeapSize / (1024 * 1024),
      total_memory_mb: memory.totalJSHeapSize / (1024 * 1024),
      memory_utilization: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
    } : {};
  },

  /**
   * Get connection info
   */
  getConnectionInfo: () => {
    const connection = (navigator as any).connection;
    return connection ? {
      connection_type: connection.effectiveType,
      downlink_mbps: connection.downlink,
      rtt_ms: connection.rtt,
      save_data: connection.saveData,
    } : {};
  },

  /**
   * Get battery info
   */
  getBatteryInfo: async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          battery_level: battery.level,
          battery_charging: battery.charging,
        };
      } catch {
        // Battery API not available or permission denied
      }
    }
    return {};
  },
};

export default AnalyticsIntegrationManager;
