/**
 * Mobile Analytics Module
 *
 * Comprehensive analytics system for mobile language learning applications.
 * Provides user behavior tracking, performance monitoring, device context collection,
 * and privacy-compliant data reporting.
 *
 * @version 1.0.0
 */

// Main analytics classes
export { default as MobileAnalytics } from "./mobile-analytics";
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  EventContext,
  DeviceContext,
  AppContext,
  NetworkContext,
  PerformanceContext,
  BatteryContext,
  LocationContext,
  TouchInteractionData,
  AudioPlaybackData,
  TranscriptionData,
  FileManagementData,
  SessionData,
  MobileAnalyticsConfig,
  ConsentLevel,
  AnalyticsReport,
} from "./mobile-analytics";

// User behavior tracking
export { default as UserBehaviorTracker } from "./user-behavior-tracker";
export type {
  TouchAnalyticsData,
  NavigationData,
  FormInteractionData,
  ScrollBehaviorData,
  ContentInteractionData,
  UserFlowData,
  FlowStep,
  BehaviorMetrics,
  GestureTrackingConfig,
  FlowDefinition,
  FlowStepDefinition,
} from "./user-behavior-tracker";

// Performance monitoring
export { default as MobilePerformanceMonitor } from "./mobile-performance-monitor";
export type {
  MobilePerformanceMetrics,
  MemoryMetrics,
  BatteryMetrics,
  NetworkMetrics,
  AudioMetrics,
  RenderingMetrics,
  ThermalMetrics,
  TranscriptionMetrics,
  FileProcessingMetrics,
  UIResponsivenessMetrics,
  DeviceCapabilityMetrics,
  PerformanceThresholds,
  PerformanceAlert,
} from "./mobile-performance-monitor";

// Device context collection
export { default as DeviceContextCollector } from "./device-context-collector";
export type {
  ExtendedDeviceInfo,
  AppState,
  NetworkQualityMetrics,
  BatteryPowerMetrics,
} from "./device-context-collector";

// Analytics reporting
export { default as AnalyticsReporter } from "./analytics-reporter";
export type {
  TransmissionOptions,
  ReportFormat,
  TransmissionResult,
  OfflineBufferConfig,
  RetryConfig,
  AnalyticsServiceConfig,
  BatchProcessingResult,
} from "./analytics-reporter";

// Consent management
export { default as ConsentManager } from "./consent-manager";
export type {
  ConsentConfig,
  ConsentRecord,
  ConsentPurpose,
  PrivacyPolicyVersion,
  DataSubjectRequest,
  AnonymizationSettings,
  DataRetentionPolicy,
  CookieConfig,
} from "./consent-manager";

// Testing utilities
export {
  MockDataGenerator,
  AnalyticsTestRunner,
  AnalyticsDebugOverlay,
  AnalyticsPerformanceBenchmarker,
} from "./testing-utils";
export type {
  TestScenario,
  TestEvent,
  TestExpectation,
  MockDataOptions,
  TestResult,
  DebugConfig,
  PerformanceBenchmark,
} from "./testing-utils";

// Analytics insights and KPIs
export { default as AnalyticsInsightsEngine } from "./analytics-insights";
export type {
  MobileAnalyticsKPIs,
  PerformanceBottleneck,
  UsagePatternAnalysis,
  MobileInsights,
  ActionableRecommendation,
  AnalyticsInsightsConfig,
} from "./analytics-insights";

// Analytics integration
export {
  AnalyticsIntegrationManager,
  createAnalyticsIntegration,
  defaultContextProviders,
  defaultMetricsProviders,
} from "./analytics-integration";
export type {
  AnalyticsIntegrationConfig,
  ErrorBreadcrumb,
  PerformanceMetricData,
  AudioPlayerTrackingData,
  TranscriptionTrackingData,
  FileOperationTrackingData,
} from "./analytics-integration";

// Utility functions
export * from "./utils/analytics-utils";

// Default configuration
export const DEFAULT_ANALYTICS_CONFIG: MobileAnalyticsConfig = {
  enabled: true,
  debugMode: false,
  batchSize: 50,
  flushInterval: 30000,
  maxRetries: 3,
  retryDelay: 5000,
  anonymizePII: true,
  collectLocation: false,
  collectDeviceId: false,
  respectDoNotTrack: true,
  cookieConsentRequired: true,
  batteryConscious: true,
  networkAware: true,
  offlineBuffering: true,
  memoryLimit: 100,
  collectUserBehavior: true,
  collectPerformanceMetrics: true,
  collectDeviceInfo: true,
  collectNetworkInfo: true,
  collectBatteryInfo: true,
  endpoint: undefined,
  apiKey: undefined,
  enableRealtimeReporting: false,
  compressionEnabled: true,
  enableGestureTracking: true,
  enableVoiceCommands: false,
  enableOfflineMode: true,
  enableHapticFeedback: true,
};

// Factory function for creating analytics instance
export function createMobileAnalytics(
  config: Partial<MobileAnalyticsConfig> = {},
): MobileAnalytics {
  const finalConfig = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
  return MobileAnalytics.getInstance(finalConfig);
}

// Get existing analytics instance
export function getMobileAnalytics(): MobileAnalytics {
  return MobileAnalytics.getInstance();
}

// Convenience hooks for React components
export function useMobileAnalytics() {
  const analytics = getMobileAnalytics();
  return {
    analytics,
    trackEvent: analytics.trackEvent.bind(analytics),
    trackTouchInteraction: analytics.trackTouchInteraction.bind(analytics),
    trackAudioPlayback: analytics.trackAudioPlayback.bind(analytics),
    trackTranscription: analytics.trackTranscription.bind(analytics),
    trackFileManagement: analytics.trackFileManagement.bind(analytics),
    trackPerformanceMetric: analytics.trackPerformanceMetric.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    updateConsent: analytics.updateConsent.bind(analytics),
    getStatus: analytics.getStatus.bind(analytics),
  };
}

// Integration helper for existing components
export class AnalyticsIntegration {
  private analytics: MobileAnalytics;

  constructor(analytics: MobileAnalytics) {
    this.analytics = analytics;
  }

  /**
   * Integrate with audio player
   */
  integrateAudioPlayer(audioPlayer: any): void {
    if (!audioPlayer) return;

    // Track play events
    const originalPlay = audioPlayer.play;
    audioPlayer.play = (...args: any[]) => {
      this.analytics.trackAudioPlayback({
        fileId: audioPlayer.fileId || 0,
        filename: audioPlayer.filename || "unknown",
        duration: audioPlayer.duration || 0,
        currentTime: audioPlayer.currentTime || 0,
        playbackRate: audioPlayer.playbackRate || 1.0,
        volume: audioPlayer.volume || 1.0,
        action: "play",
      });
      return originalPlay.apply(audioPlayer, args);
    };

    // Track pause events
    const originalPause = audioPlayer.pause;
    audioPlayer.pause = (...args: any[]) => {
      this.analytics.trackAudioPlayback({
        fileId: audioPlayer.fileId || 0,
        filename: audioPlayer.filename || "unknown",
        duration: audioPlayer.duration || 0,
        currentTime: audioPlayer.currentTime || 0,
        playbackRate: audioPlayer.playbackRate || 1.0,
        volume: audioPlayer.volume || 1.0,
        action: "pause",
      });
      return originalPause.apply(audioPlayer, args);
    };

    // Track seek events
    const originalSeek = audioPlayer.seek || audioPlayer.setCurrentTime;
    if (originalSeek) {
      audioPlayer.seek = (time: number) => {
        this.analytics.trackAudioPlayback({
          fileId: audioPlayer.fileId || 0,
          filename: audioPlayer.filename || "unknown",
          duration: audioPlayer.duration || 0,
          currentTime: time,
          playbackRate: audioPlayer.playbackRate || 1.0,
          volume: audioPlayer.volume || 1.0,
          action: "seek",
          seekTarget: time,
        });
        return originalSeek.call(audioPlayer, time);
      };
    }

    // Track speed changes
    if (audioPlayer.setPlaybackRate) {
      const originalSetRate = audioPlayer.setPlaybackRate.bind(audioPlayer);
      audioPlayer.setPlaybackRate = (rate: number) => {
        this.analytics.trackAudioPlayback({
          fileId: audioPlayer.fileId || 0,
          filename: audioPlayer.filename || "unknown",
          duration: audioPlayer.duration || 0,
          currentTime: audioPlayer.currentTime || 0,
          playbackRate: rate,
          volume: audioPlayer.volume || 1.0,
          action: "speed_change",
        });
        return originalSetRate(rate);
      };
    }

    // Track volume changes
    if (audioPlayer.setVolume) {
      const originalSetVolume = audioPlayer.setVolume.bind(audioPlayer);
      audioPlayer.setVolume = (volume: number) => {
        this.analytics.trackAudioPlayback({
          fileId: audioPlayer.fileId || 0,
          filename: audioPlayer.filename || "unknown",
          duration: audioPlayer.duration || 0,
          currentTime: audioPlayer.currentTime || 0,
          playbackRate: audioPlayer.playbackRate || 1.0,
          volume,
          action: "volume_change",
        });
        return originalSetVolume(volume);
      };
    }
  }

  /**
   * Integrate with transcription service
   */
  integrateTranscriptionService(transcriptionService: any): void {
    if (!transcriptionService) return;

    // Track transcription start
    const originalStartTranscription = transcriptionService.startTranscription;
    if (originalStartTranscription) {
      transcriptionService.startTranscription = async (
        fileId: number,
        options?: any,
      ) => {
        const trackingId = this.analytics.trackTranscription({
          fileId,
          filename: options?.filename || `file_${fileId}`,
          fileSize: options?.fileSize || 0,
          duration: options?.duration,
          language: options?.language,
          startTime: new Date(),
          status: "started",
        });

        try {
          const result = await originalStartTranscription.call(
            transcriptionService,
            fileId,
            options,
          );

          // Track successful completion
          this.analytics.trackTranscription({
            fileId,
            filename: options?.filename || `file_${fileId}`,
            fileSize: options?.fileSize || 0,
            duration: options?.duration,
            language: options?.language,
            startTime: new Date(),
            status: "completed",
            processingTime: result?.processingTime,
            accuracy: result?.accuracy,
            wordCount: result?.wordCount,
          });

          return result;
        } catch (error) {
          // Track error
          this.analytics.trackTranscription({
            fileId,
            filename: options?.filename || `file_${fileId}`,
            fileSize: options?.fileSize || 0,
            duration: options?.duration,
            language: options?.language,
            startTime: new Date(),
            status: "failed",
            errorMessage: (error as Error).message,
            errorCode: (error as any).code,
          });

          throw error;
        }
      };
    }

    // Track transcription progress
    if (transcriptionService.on) {
      transcriptionService.on(
        "progress",
        (data: { fileId: number; progress: number }) => {
          this.analytics.trackTranscription({
            fileId: data.fileId,
            filename: `file_${data.fileId}`,
            fileSize: 0,
            startTime: new Date(),
            status: "progress",
            progress: data.progress,
          });
        },
      );
    }
  }

  /**
   * Integrate with file upload service
   */
  integrateFileUpload(uploadService: any): void {
    if (!uploadService) return;

    // Track file upload start
    const originalUpload = uploadService.upload;
    if (originalUpload) {
      uploadService.upload = async (file: File, options?: any) => {
        const startTime = Date.now();

        this.analytics.trackFileManagement({
          fileId: 0, // Will be set after upload
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          action: "upload",
          uploadMethod: "drag_drop", // Default, would be determined by actual interaction
          source: "local",
        });

        try {
          const result = await originalUpload.call(
            uploadService,
            file,
            options,
          );

          // Track successful upload
          this.analytics.trackFileManagement({
            fileId: result?.fileId || 0,
            filename: file.name,
            fileType: file.type,
            fileSize: file.size,
            action: "upload",
            uploadTime: Date.now() - startTime,
            uploadMethod: options?.method || "click",
            source: "local",
          });

          return result;
        } catch (error) {
          // Track upload error
          this.analytics.trackFileManagement({
            fileId: 0,
            filename: file.name,
            fileType: file.type,
            fileSize: file.size,
            action: "upload",
            uploadTime: Date.now() - startTime,
            error: (error as Error).message,
            uploadMethod: options?.method || "click",
            source: "local",
          });

          throw error;
        }
      };
    }
  }

  /**
   * Integrate with mobile touch optimization
   */
  integrateMobileTouchOptimization(touchOptimizer: any): void {
    if (!touchOptimizer) return;

    // Track touch interactions
    if (touchOptimizer.onTouchInteraction) {
      const originalOnTouchInteraction =
        touchOptimizer.onTouchInteraction.bind(touchOptimizer);
      touchOptimizer.onTouchInteraction = (data: any) => {
        this.analytics.trackTouchInteraction({
          target: data.target || "file_item",
          interactionType: data.interactionType || "tap",
          position: data.position || { x: 0, y: 0 },
          pressure: data.pressure,
          duration: data.duration || 0,
          success: data.success !== false,
          errorMessage: data.errorMessage,
        });

        return originalOnTouchInteraction(data);
      };
    }
  }

  /**
   * Integrate with performance monitoring
   */
  integratePerformanceMonitoring(performanceMonitor: any): void {
    if (!performanceMonitor) return;

    // Track performance metrics
    if (performanceMonitor.on) {
      performanceMonitor.on(
        "metric",
        (data: { name: string; value: number; unit: string }) => {
          this.analytics.trackPerformanceMetric(
            data.name,
            data.value,
            data.unit,
          );
        },
      );

      performanceMonitor.on("alert", (alert: any) => {
        this.analytics.trackError(new Error(alert.message), {
          type: "performance",
          metric: alert.metric,
          value: alert.value,
          threshold: alert.threshold,
        });
      });
    }
  }

  /**
   * Set up global error tracking
   */
  setupGlobalErrorTracking(): void {
    // Track unhandled errors
    window.addEventListener("error", (event) => {
      this.analytics.trackError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: "unhandled_error",
      });
    });

    // Track unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.analytics.trackError(
        new Error(`Unhandled promise rejection: ${event.reason}`),
        {
          type: "unhandled_promise_rejection",
          reason: event.reason,
        },
      );
    });
  }

  /**
   * Set up route change tracking
   */
  setupRouteTracking(): void {
    // Track page navigation
    let currentPath = window.location.pathname;

    const trackNavigation = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        this.analytics.trackEvent("navigation" as any, {
          from: currentPath,
          to: newPath,
          method: "navigation",
          timestamp: new Date(),
        });
        currentPath = newPath;
      }
    };

    // Listen for popstate events
    window.addEventListener("popstate", trackNavigation);

    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args: any[]) => {
      const result = originalPushState.apply(history, args);
      trackNavigation();
      return result;
    };

    history.replaceState = (...args: any[]) => {
      const result = originalReplaceState.apply(history, args);
      trackNavigation();
      return result;
    };
  }

  /**
   * Set up lifecycle tracking
   */
  setupLifecycleTracking(): void {
    // Track page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.analytics.trackEvent("app_background" as any, {
          timestamp: new Date(),
        });
      } else {
        this.analytics.trackEvent("app_foreground" as any, {
          timestamp: new Date(),
        });
      }
    });

    // Track page unload
    window.addEventListener("beforeunload", () => {
      this.analytics.trackEvent("session_end" as any, {
        exitReason: "normal",
        timestamp: new Date(),
      });
    });
  }

  /**
   * Enable comprehensive integration
   */
  enableComprehensiveIntegration(
    options: {
      audioPlayer?: any;
      transcriptionService?: any;
      uploadService?: any;
      touchOptimizer?: any;
      performanceMonitor?: any;
      errorTracking?: boolean;
      routeTracking?: boolean;
      lifecycleTracking?: boolean;
    } = {},
  ): void {
    // Component integrations
    if (options.audioPlayer) {
      this.integrateAudioPlayer(options.audioPlayer);
    }

    if (options.transcriptionService) {
      this.integrateTranscriptionService(options.transcriptionService);
    }

    if (options.uploadService) {
      this.integrateFileUpload(options.uploadService);
    }

    if (options.touchOptimizer) {
      this.integrateMobileTouchOptimization(options.touchOptimizer);
    }

    if (options.performanceMonitor) {
      this.integratePerformanceMonitoring(options.performanceMonitor);
    }

    // Global tracking
    if (options.errorTracking !== false) {
      this.setupGlobalErrorTracking();
    }

    if (options.routeTracking !== false) {
      this.setupRouteTracking();
    }

    if (options.lifecycleTracking !== false) {
      this.setupLifecycleTracking();
    }
  }
}

// Create integration helper instance
export function createAnalyticsIntegration(
  analytics?: MobileAnalytics,
): AnalyticsIntegration {
  const instance = analytics || getMobileAnalytics();
  return new AnalyticsIntegration(instance);
}

// Initialize analytics with sensible defaults
export function initializeAnalytics(
  config: Partial<MobileAnalyticsConfig> = {},
): MobileAnalytics {
  const analytics = createMobileAnalytics(config);

  // Enable comprehensive integration by default
  const integration = createAnalyticsIntegration(analytics);
  integration.enableComprehensiveIntegration();

  return analytics;
}

// Development helper
export function enableDebugMode(): void {
  const analytics = getMobileAnalytics();
  const integration = createAnalyticsIntegration(analytics);

  // Enable debug overlay
  if (typeof window !== "undefined" && (window as any).analyticsDebugOverlay) {
    (window as any).analyticsDebugOverlay.show();
  }

  console.log(
    "Analytics debug mode enabled. Press Ctrl+Shift+D to toggle debug overlay.",
  );
}

// Export for global access
if (typeof window !== "undefined") {
  (window as any).umuoAnalytics = {
    createMobileAnalytics,
    getMobileAnalytics,
    useMobileAnalytics,
    createAnalyticsIntegration,
    initializeAnalytics,
    enableDebugMode,
  };
}
