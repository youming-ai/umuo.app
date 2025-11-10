/**
 * Comprehensive Mobile Analytics System for Language Learning
 *
 * Provides advanced analytics collection for mobile user behavior,
 * performance metrics, and device-specific insights.
 *
 * @version 1.0.0
 */

import { MobileDetector, DeviceInfo, TouchInteractionType, TouchTarget } from '../../types/mobile';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { OptimizedEventEmitter } from '../utils/event-manager';

// ============================================================================
// ANALYTICS INTERFACES AND TYPES
// ============================================================================

/**
 * Analytics data types
 */
export enum AnalyticsEventType {
  // User behavior events
  AUDIO_PLAY = 'audio_play',
  AUDIO_PAUSE = 'audio_pause',
  AUDIO_SEEK = 'audio_seek',
  SPEED_ADJUST = 'speed_adjust',
  VOLUME_ADJUST = 'volume_adjust',

  // File management events
  FILE_UPLOAD = 'file_upload',
  FILE_DELETE = 'file_delete',
  FILE_DOWNLOAD = 'file_download',
  FILE_SHARE = 'file_share',

  // Transcription events
  TRANSCRIPTION_START = 'transcription_start',
  TRANSCRIPTION_PROGRESS = 'transcription_progress',
  TRANSCRIPTION_COMPLETE = 'transcription_complete',
  TRANSCRIPTION_ERROR = 'transcription_error',

  // Interaction events
  TOUCH_INTERACTION = 'touch_interaction',
  GESTURE_COMPLETED = 'gesture_completed',
  FORM_SUBMIT = 'form_submit',
  NAVIGATION = 'navigation',

  // Performance events
  PERFORMANCE_METRIC = 'performance_metric',
  ERROR_OCCURRED = 'error_occurred',
  CRASH_OCCURRED = 'crash_occurred',

  // Session events
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  APP_BACKGROUND = 'app_background',
  APP_FOREGROUND = 'app_foreground',
}

/**
 * Analytics event base interface
 */
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: Date;
  sessionId: string;
  userId?: string;

  // Event-specific data
  data: Record<string, any>;

  // Context information
  context: EventContext;

  // Privacy and consent
  consent: ConsentLevel;
  anonymized: boolean;
}

/**
 * Event context information
 */
export interface EventContext {
  // Device context
  device: DeviceContext;

  // App context
  app: AppContext;

  // Network context
  network: NetworkContext;

  // Performance context
  performance: PerformanceContext;

  // Battery context
  battery: BatteryContext;

  // Location context (optional, with consent)
  location?: LocationContext;
}

/**
 * Device context information
 */
export interface DeviceContext {
  type: 'mobile' | 'tablet' | 'desktop';
  manufacturer?: string;
  model?: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  screenResolution: { width: number; height: number };
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
  touchSupport: boolean;
  maxTouchPoints: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/**
 * App context information
 */
export interface AppContext {
  version: string;
  buildNumber?: string;
  environment: 'development' | 'staging' | 'production';
  language: string;
  theme: string;
  features: string[];
  viewport: { width: number; height: number };
  isPWA: boolean;
  isStandalone: boolean;
  onlineStatus: boolean;
}

/**
 * Network context information
 */
export interface NetworkContext {
  type: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
  saveData: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  offlineAt?: Date;
}

/**
 * Performance context information
 */
export interface PerformanceContext {
  memoryUsage?: number; // MB
  cpuUsage?: number; // Percentage
  domContentLoaded?: number; // ms
  firstContentfulPaint?: number; // ms
  largestContentfulPaint?: number; // ms
  firstInputDelay?: number; // ms
  cumulativeLayoutShift?: number;
  frameRate?: number; // FPS
}

/**
 * Battery context information
 */
export interface BatteryContext {
  level: number; // 0-1
  charging: boolean;
  chargingTime?: number; // seconds until full
  dischargingTime?: number; // seconds until empty
  isLowPowerMode: boolean;
}

/**
 * Location context (optional)
 */
export interface LocationContext {
  country?: string;
  region?: string;
  city?: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
}

/**
 * User behavior tracking data
 */
export interface TouchInteractionData {
  target: TouchTarget;
  interactionType: TouchInteractionType;
  position: { x: number; y: number };
  pressure?: number;
  duration: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Audio playback tracking data
 */
export interface AudioPlaybackData {
  fileId: number;
  filename: string;
  duration: number;
  currentTime: number;
  playbackRate: number;
  volume: number;
  action: 'play' | 'pause' | 'seek' | 'speed_change' | 'volume_change';
  seekTarget?: number;
}

/**
 * Transcription tracking data
 */
export interface TranscriptionData {
  fileId: number;
  filename: string;
  fileSize: number;
  duration?: number;
  language?: string;
  startTime: Date;
  status: 'started' | 'progress' | 'completed' | 'failed' | 'cancelled';
  progress?: number; // 0-1
  processingTime?: number; // ms
  errorMessage?: string;
  errorCode?: string;
  accuracy?: number; // 0-1
  wordCount?: number;
}

/**
 * File management tracking data
 */
export interface FileManagementData {
  fileId: number;
  filename: string;
  fileType: string;
  fileSize: number;
  action: 'upload' | 'download' | 'delete' | 'share' | 'rename';
  uploadTime?: number; // ms
  downloadTime?: number; // ms
  uploadMethod?: 'drag_drop' | 'click' | 'mobile_share';
  error?: string;
  source?: 'local' | 'cloud' | 'external';
}

/**
 * Session tracking data
 */
export interface SessionData {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // ms
  pagesViewed: number;
  filesUploaded: number;
  transcriptionsCompleted: number;
  totalAudioTime: number; // ms
  errorsEncountered: number;
  crashOccurred: boolean;
  exitReason?: 'normal' | 'error' | 'crash' | 'background';
  isNewUser: boolean;
  userLanguage: string;
}

/**
 * Analytics configuration
 */
export interface MobileAnalyticsConfig {
  // General settings
  enabled: boolean;
  debugMode: boolean;
  batchSize: number;
  flushInterval: number; // ms
  maxRetries: number;
  retryDelay: number; // ms

  // Privacy settings
  anonymizePII: boolean;
  collectLocation: boolean;
  collectDeviceId: boolean;
  respectDoNotTrack: boolean;
  cookieConsentRequired: boolean;

  // Performance settings
  batteryConscious: boolean;
  networkAware: boolean;
  offlineBuffering: boolean;
  memoryLimit: number; // MB

  // Data collection settings
  collectUserBehavior: boolean;
  collectPerformanceMetrics: boolean;
  collectDeviceInfo: boolean;
  collectNetworkInfo: boolean;
  collectBatteryInfo: boolean;

  // Reporting settings
  endpoint?: string;
  apiKey?: string;
  enableRealtimeReporting: boolean;
  compressionEnabled: boolean;

  // Feature flags
  enableGestureTracking: boolean;
  enableVoiceCommands: boolean;
  enableOfflineMode: boolean;
  enableHapticFeedback: boolean;
}

/**
 * Consent levels for GDPR compliance
 */
export enum ConsentLevel {
  NONE = 'none',
  FUNCTIONAL = 'functional',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  ALL = 'all'
}

/**
 * Analytics report data
 */
export interface AnalyticsReport {
  id: string;
  timestamp: Date;
  events: AnalyticsEvent[];
  sessionId: string;
  userId?: string;
  deviceContext: DeviceContext;
  summary: {
    totalEvents: number;
    eventsByType: Record<AnalyticsEventType, number>;
    sessionDuration: number;
    errorCount: number;
    performanceMetrics: Record<string, number>;
  };
}

// ============================================================================
// MAIN MOBILE ANALYTICS CLASS
// ============================================================================

/**
 * Comprehensive mobile analytics system
 */
export class MobileAnalytics {
  private static instance: MobileAnalytics;
  private config: MobileAnalyticsConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionData: SessionData | null = null;
  private consentLevel: ConsentLevel = ConsentLevel.NONE;
  private isInitialized = false;
  private isOnline = true;
  private flushTimer?: NodeJS.Timeout;

  // Components
  private userBehaviorTracker: UserBehaviorTracker;
  private performanceMonitor: MobilePerformanceMonitor;
  private deviceContextCollector: DeviceContextCollector;
  private analyticsReporter: AnalyticsReporter;
  private consentManager: ConsentManager;
  private eventEmitter: OptimizedEventEmitter<AnalyticsEvents>;

  private constructor(config: Partial<MobileAnalyticsConfig> = {}) {
    this.config = this.mergeConfig(config);

    // Initialize components
    this.eventEmitter = new OptimizedEventEmitter({
      maxListeners: 50,
      debounceTime: 100,
      throttleTime: 16,
      batchEvents: true,
      batchSize: 10,
      batchTimeout: 50,
    });

    this.userBehaviorTracker = new UserBehaviorTracker(this.config, this.eventEmitter);
    this.performanceMonitor = new MobilePerformanceMonitor(this.config, this.eventEmitter);
    this.deviceContextCollector = new DeviceContextCollector(this.config);
    this.analyticsReporter = new AnalyticsReporter(this.config);
    this.consentManager = new ConsentManager(this.config);

    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<MobileAnalyticsConfig>): MobileAnalytics {
    if (!MobileAnalytics.instance) {
      MobileAnalytics.instance = new MobileAnalytics(config);
    }
    return MobileAnalytics.instance;
  }

  /**
   * Initialize the analytics system
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check consent
      this.consentLevel = await this.consentManager.getCurrentConsent();

      // Only initialize if consent allows analytics
      if (!this.hasConsent(ConsentLevel.ANALYTICS)) {
        console.warn('[MobileAnalytics] Analytics disabled due to lack of consent');
        return;
      }

      // Initialize components
      await this.deviceContextCollector.initialize();
      await this.performanceMonitor.initialize();
      await this.userBehaviorTracker.initialize();

      // Start session
      await this.startSession();

      // Start periodic flush
      this.startFlushTimer();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;

      if (this.config.debugMode) {
        console.log('[MobileAnalytics] Initialized successfully');
      }

    } catch (error) {
      console.error('[MobileAnalytics] Failed to initialize:', error);
    }
  }

  /**
   * Track an analytics event
   */
  public async trackEvent(
    type: AnalyticsEventType,
    data: Record<string, any>,
    additionalContext?: Partial<EventContext>
  ): Promise<void> {
    if (!this.isInitialized || !this.config.enabled) {
      return;
    }

    if (!this.hasConsent(ConsentLevel.ANALYTICS)) {
      return;
    }

    try {
      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        type,
        timestamp: new Date(),
        sessionId: this.sessionData!.id,
        userId: this.getUserId(),
        data: this.anonymizeData(data),
        context: await this.buildEventContext(additionalContext),
        consent: this.consentLevel,
        anonymized: this.config.anonymizePII,
      };

      this.eventQueue.push(event);

      // Emit event for real-time processing
      this.eventEmitter.emit('event_tracked', event);

      // Flush if batch size reached
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.flushEvents();
      }

      if (this.config.debugMode) {
        console.log('[MobileAnalytics] Event tracked:', event);
      }

    } catch (error) {
      console.error('[MobileAnalytics] Failed to track event:', error);
    }
  }

  /**
   * Track touch interaction
   */
  public async trackTouchInteraction(data: TouchInteractionData): Promise<void> {
    if (!this.config.collectUserBehavior) return;

    await this.trackEvent(AnalyticsEventType.TOUCH_INTERACTION, {
      interactionType: data.interactionType,
      target: data.target,
      position: data.position,
      pressure: data.pressure,
      duration: data.duration,
      success: data.success,
      errorMessage: data.errorMessage,
    });
  }

  /**
   * Track audio playback action
   */
  public async trackAudioPlayback(data: AudioPlaybackData): Promise<void> {
    if (!this.config.collectUserBehavior) return;

    const eventType = data.action === 'play' ? AnalyticsEventType.AUDIO_PLAY :
                     data.action === 'pause' ? AnalyticsEventType.AUDIO_PAUSE :
                     data.action === 'seek' ? AnalyticsEventType.AUDIO_SEEK :
                     data.action === 'speed_change' ? AnalyticsEventType.SPEED_ADJUST :
                     AnalyticsEventType.VOLUME_ADJUST;

    await this.trackEvent(eventType, {
      fileId: data.fileId,
      filename: data.filename,
      duration: data.duration,
      currentTime: data.currentTime,
      playbackRate: data.playbackRate,
      volume: data.volume,
      seekTarget: data.seekTarget,
    });
  }

  /**
   * Track transcription event
   */
  public async trackTranscription(data: TranscriptionData): Promise<void> {
    const eventType = data.status === 'started' ? AnalyticsEventType.TRANSCRIPTION_START :
                     data.status === 'progress' ? AnalyticsEventType.TRANSCRIPTION_PROGRESS :
                     data.status === 'completed' ? AnalyticsEventType.TRANSCRIPTION_COMPLETE :
                     data.status === 'failed' ? AnalyticsEventType.TRANSCRIPTION_ERROR :
                     AnalyticsEventType.TRANSCRIPTION_COMPLETE; // cancelled

    await this.trackEvent(eventType, {
      fileId: data.fileId,
      filename: data.filename,
      fileSize: data.fileSize,
      duration: data.duration,
      language: data.language,
      startTime: data.startTime,
      status: data.status,
      progress: data.progress,
      processingTime: data.processingTime,
      errorMessage: data.errorMessage,
      errorCode: data.errorCode,
      accuracy: data.accuracy,
      wordCount: data.wordCount,
    });
  }

  /**
   * Track file management action
   */
  public async trackFileManagement(data: FileManagementData): Promise<void> {
    const eventType = data.action === 'upload' ? AnalyticsEventType.FILE_UPLOAD :
                     data.action === 'download' ? AnalyticsEventType.FILE_DOWNLOAD :
                     data.action === 'delete' ? AnalyticsEventType.FILE_DELETE :
                     AnalyticsEventType.FILE_SHARE;

    await this.trackEvent(eventType, {
      fileId: data.fileId,
      filename: data.filename,
      fileType: data.fileType,
      fileSize: data.fileSize,
      action: data.action,
      uploadTime: data.uploadTime,
      downloadTime: data.downloadTime,
      uploadMethod: data.uploadMethod,
      error: data.error,
      source: data.source,
    });
  }

  /**
   * Track performance metric
   */
  public async trackPerformanceMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): Promise<void> {
    if (!this.config.collectPerformanceMetrics) return;

    await this.trackEvent(AnalyticsEventType.PERFORMANCE_METRIC, {
      name,
      value,
      unit,
      tags,
    });
  }

  /**
   * Track error occurrence
   */
  public async trackError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(AnalyticsEventType.ERROR_OCCURRED, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  /**
   * Update user consent
   */
  public async updateConsent(consentLevel: ConsentLevel): Promise<void> {
    this.consentLevel = consentLevel;
    await this.consentManager.updateConsent(consentLevel);

    if (this.hasConsent(ConsentLevel.ANALYTICS) && !this.isInitialized) {
      await this.initialize();
    } else if (!this.hasConsent(ConsentLevel.ANALYTICS) && this.isInitialized) {
      await this.stop();
    }

    this.eventEmitter.emit('consent_updated', consentLevel);
  }

  /**
   * Get current analytics status
   */
  public getStatus(): {
    initialized: boolean;
    enabled: boolean;
    consentLevel: ConsentLevel;
    queuedEvents: number;
    onlineStatus: boolean;
  } {
    return {
      initialized: this.isInitialized,
      enabled: this.config.enabled,
      consentLevel: this.consentLevel,
      queuedEvents: this.eventQueue.length,
      onlineStatus: this.isOnline,
    };
  }

  /**
   * Force flush all queued events
   */
  public async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      await this.analyticsReporter.sendEvents(events);

      this.eventEmitter.emit('events_flushed', events);

      if (this.config.debugMode) {
        console.log(`[MobileAnalytics] Flushed ${events.length} events`);
      }

    } catch (error) {
      console.error('[MobileAnalytics] Failed to flush events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  /**
   * Stop analytics collection
   */
  public async stop(): Promise<void> {
    if (!this.isInitialized) return;

    // End current session
    if (this.sessionData) {
      await this.endSession();
    }

    // Flush remaining events
    await this.flushEvents();

    // Clear timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Stop components
    this.performanceMonitor.stop();
    this.userBehaviorTracker.stop();

    this.isInitialized = false;

    console.log('[MobileAnalytics] Stopped');
  }

  // Private helper methods
  private mergeConfig(userConfig: Partial<MobileAnalyticsConfig>): MobileAnalyticsConfig {
    const defaultConfig: MobileAnalyticsConfig = {
      enabled: true,
      debugMode: false,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
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
      memoryLimit: 100, // MB
      collectUserBehavior: true,
      collectPerformanceMetrics: true,
      collectDeviceInfo: true,
      collectNetworkInfo: true,
      collectBatteryInfo: true,
      enableRealtimeReporting: false,
      compressionEnabled: true,
      enableGestureTracking: true,
      enableVoiceCommands: false,
      enableOfflineMode: true,
      enableHapticFeedback: true,
    };

    return { ...defaultConfig, ...userConfig };
  }

  private async startSession(): Promise<void> {
    const sessionId = this.generateSessionId();

    this.sessionData = {
      id: sessionId,
      startTime: new Date(),
      pagesViewed: 1,
      filesUploaded: 0,
      transcriptionsCompleted: 0,
      totalAudioTime: 0,
      errorsEncountered: 0,
      crashOccurred: false,
      isNewUser: !this.hasPreviousSession(),
      userLanguage: navigator.language || 'en-US',
    };

    await this.trackEvent(AnalyticsEventType.SESSION_START, {
      sessionId,
      isNewUser: this.sessionData.isNewUser,
      userAgent: navigator.userAgent,
    });
  }

  private async endSession(): Promise<void> {
    if (!this.sessionData) return;

    this.sessionData.endTime = new Date();
    this.sessionData.duration = this.sessionData.endTime.getTime() - this.sessionData.startTime.getTime();
    this.sessionData.exitReason = 'normal';

    await this.trackEvent(AnalyticsEventType.SESSION_END, {
      sessionId: this.sessionData.id,
      duration: this.sessionData.duration,
      pagesViewed: this.sessionData.pagesViewed,
      filesUploaded: this.sessionData.filesUploaded,
      transcriptionsCompleted: this.sessionData.transcriptionsCompleted,
      totalAudioTime: this.sessionData.totalAudioTime,
      errorsEncountered: this.sessionData.errorsEncountered,
      crashOccurred: this.sessionData.crashOccurred,
      exitReason: this.sessionData.exitReason,
    });

    // Store session ID for new user detection
    localStorage.setItem('last_session_id', this.sessionData.id);
    this.sessionData = null;
  }

  private hasPreviousSession(): boolean {
    return !!localStorage.getItem('last_session_id');
  }

  private async buildEventContext(additionalContext?: Partial<EventContext>): Promise<EventContext> {
    const baseContext = await this.deviceContextCollector.getContext();

    return {
      ...baseContext,
      ...additionalContext,
    };
  }

  private anonymizeData(data: Record<string, any>): Record<string, any> {
    if (!this.config.anonymizePII) return data;

    const anonymized = { ...data };

    // Remove or anonymize PII fields
    const piiFields = ['email', 'name', 'phone', 'address', 'ip'];
    piiFields.forEach(field => {
      if (field in anonymized) {
        anonymized[field] = this.hashString(String(anonymized[field]));
      }
    });

    return anonymized;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private getUserId(): string | undefined {
    // In a real implementation, this would get the user ID from auth
    return localStorage.getItem('user_id') || undefined;
  }

  private hasConsent(requiredLevel: ConsentLevel): boolean {
    const levels = [
      ConsentLevel.NONE,
      ConsentLevel.FUNCTIONAL,
      ConsentLevel.ANALYTICS,
      ConsentLevel.MARKETING,
      ConsentLevel.ALL,
    ];

    const currentLevelIndex = levels.indexOf(this.consentLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    return currentLevelIndex >= requiredLevelIndex;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushEvents();
      }
    }, this.config.flushInterval);
  }

  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.eventEmitter.emit('online_status_changed', true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.eventEmitter.emit('online_status_changed', false);
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.eventEmitter.emit('app_background');
      } else {
        this.eventEmitter.emit('app_foreground');
      }
    });

    // Listen for page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Listen for errors
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message));
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(`Unhandled promise rejection: ${event.reason}`));
    });
  }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

/**
 * Analytics event emitter types
 */
export interface AnalyticsEvents {
  event_tracked: AnalyticsEvent;
  events_flushed: AnalyticsEvent[];
  consent_updated: ConsentLevel;
  online_status_changed: boolean;
  app_background: void;
  app_foreground: void;
  session_started: SessionData;
  session_ended: SessionData;
  performance_alert: { metric: string; value: number; threshold: number };
  error_occurred: { error: Error; context: Record<string, any> };
}

// Export main class for easier access
export default MobileAnalytics;
