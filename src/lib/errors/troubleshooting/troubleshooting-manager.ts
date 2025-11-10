/**
 * Troubleshooting Manager
 *
 * Main orchestrator for the troubleshooting guidance system. Manages symptom checking,
 * guided resolution, knowledge base access, and overall troubleshooting workflow.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TroubleshootingContext,
  TroubleshootingConfig,
  WizardSession,
  SymptomAnalysis,
  TroubleshootingGuide,
  KnowledgeBaseEntry,
  TroubleshootingAnalytics,
  SuccessMetrics,
  SessionStatus,
  AnalyticsAction,
} from './types';
import { SymptomChecker } from './symptom-checker';
import { TroubleshootingWizard } from './troubleshooting-wizard';
import { KnowledgeBase } from './knowledge-base';
import { GuidanceGenerator } from './guidance-generator';
import { ErrorCategory, ErrorType, ErrorSeverity } from '../error-classifier';
import { ErrorAnalytics } from '../error-analytics';

// ============================================================================
// MAIN TROUBLESHOOTING MANAGER
// ============================================================================

/**
 * Main troubleshooting system manager
 */
export class TroubleshootingManager {
  private static instance: TroubleshootingManager | null = null;

  private config: TroubleshootingConfig;
  private symptomChecker: SymptomChecker;
  private wizard: TroubleshootingWizard;
  private knowledgeBase: KnowledgeBase;
  private guidanceGenerator: GuidanceGenerator;
  private errorAnalytics?: ErrorAnalytics;

  private activeSessions = new Map<string, WizardSession>();
  private analyticsBuffer: TroubleshootingAnalytics[] = [];
  private analyticsFlushInterval?: NodeJS.Timeout;

  private constructor(config: TroubleshootingConfig) {
    this.config = config;

    // Initialize core components
    this.symptomChecker = new SymptomChecker(config);
    this.wizard = new TroubleshootingWizard(config);
    this.knowledgeBase = new KnowledgeBase(config);
    this.guidanceGenerator = new GuidanceGenerator(config);

    // Initialize error analytics integration if available
    if (config.integration.errorAnalytics) {
      try {
        this.errorAnalytics = new ErrorAnalytics({
          enableRealTimeMonitoring: false,
          enablePatternAnalysis: true,
          retentionPeriod: config.analytics.retentionPeriod,
        });
      } catch (error) {
        console.warn('Failed to initialize error analytics integration:', error);
      }
    }

    // Start analytics flush interval
    if (config.analytics.enabled) {
      this.startAnalyticsFlush();
    }

    // Initialize offline storage for mobile
    if (config.enableOffline && typeof window !== 'undefined') {
      this.initializeOfflineStorage();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: TroubleshootingConfig): TroubleshootingManager {
    if (!TroubleshootingManager.instance) {
      if (!config) {
        throw new Error('TroubleshootingManager requires config for first initialization');
      }
      TroubleshootingManager.instance = new TroubleshootingManager(config);
    }
    return TroubleshootingManager.instance;
  }

  /**
   * Create new troubleshooting session
   */
  public async createSession(
    errorId?: string,
    errorCode?: string,
    userId?: string
  ): Promise<WizardSession> {
    const context = await this.createContext(errorId, errorCode, userId);
    const sessionId = uuidv4();

    const session: WizardSession = {
      id: sessionId,
      context,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
      answers: {},
      symptomAnalysis: [],
      selectedGuides: [],
      progress: {
        completedSteps: 0,
        successfulSteps: 0,
        failedSteps: 0,
        skippedSteps: 0,
        percentage: 0,
        timeSpent: 0,
        estimatedTimeRemaining: 0,
      },
      status: SessionStatus.ACTIVE,
      startTime: new Date(),
      lastActivity: new Date(),
    };

    this.activeSessions.set(sessionId, session);

    // Record analytics
    this.recordAnalytics(sessionId, AnalyticsAction.SESSION_START, 0, true);

    // Initialize wizard steps
    await this.wizard.initializeSession(session);

    return session;
  }

  /**
   * Get active session
   */
  public getSession(sessionId: string): WizardSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Analyze symptoms for a session
   */
  public async analyzeSymptoms(
    sessionId: string,
    answers: Record<string, any>
  ): Promise<SymptomAnalysis[]> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.answers = { ...session.answers, ...answers };
    session.lastActivity = new Date();

    const analysis = await this.symptomChecker.analyzeSymptoms(
      session.context,
      answers
    );

    session.symptomAnalysis = analysis;

    // Update session based on analysis
    await this.wizard.updateSessionFromAnalysis(session, analysis);

    // Record analytics
    this.recordAnalytics(
      sessionId,
      AnalyticsAction.SYMPTOM_IDENTIFIED,
      Date.now() - session.startTime.getTime(),
      true,
      { symptomCount: analysis.length }
    );

    return analysis;
  }

  /**
   * Get recommended guides based on symptom analysis
   */
  public async getRecommendedGuides(
    sessionId: string
  ): Promise<TroubleshootingGuide[]> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const guides = await this.guidanceGenerator.generateGuides(
      session.symptomAnalysis,
      session.context
    );

    session.selectedGuides = guides.map(guide => guide.id);

    // Record analytics
    this.recordAnalytics(
      sessionId,
      AnalyticsAction.GUIDE_SELECTED,
      Date.now() - session.startTime.getTime(),
      true,
      { guideCount: guides.length }
    );

    return guides;
  }

  /**
   * Execute a troubleshooting step
   */
  public async executeStep(
    sessionId: string,
    stepId: string,
    parameters?: Record<string, any>
  ): Promise<any> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const startTime = Date.now();

    try {
      const result = await this.wizard.executeStep(session, stepId, parameters);

      // Update progress
      session.progress.completedSteps++;
      session.progress.successfulSteps++;
      session.progress.percentage = (session.progress.completedSteps / session.totalSteps) * 100;
      session.lastActivity = new Date();

      // Record analytics
      this.recordAnalytics(
        sessionId,
        AnalyticsAction.STEP_COMPLETED,
        Date.now() - startTime,
        true,
        { stepId, result }
      );

      return result;
    } catch (error) {
      // Update progress
      session.progress.completedSteps++;
      session.progress.failedSteps++;
      session.lastActivity = new Date();

      // Record analytics
      this.recordAnalytics(
        sessionId,
        AnalyticsAction.STEP_FAILED,
        Date.now() - startTime,
        false,
        { stepId, error: error instanceof Error ? error.message : 'Unknown error' }
      );

      throw error;
    }
  }

  /**
   * Skip a troubleshooting step
   */
  public async skipStep(sessionId: string, stepId: string, reason?: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    await this.wizard.skipStep(session, stepId);

    session.progress.skippedSteps++;
    session.lastActivity = new Date();

    // Record analytics
    this.recordAnalytics(
      sessionId,
      AnalyticsAction.STEP_SKIPPED,
      0,
      true,
      { stepId, reason }
    );
  }

  /**
   * Verify troubleshooting resolution
   */
  public async verifyResolution(
    sessionId: string,
    verificationData?: Record<string, any>
  ): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const isResolved = await this.wizard.verifyResolution(session, verificationData);

    if (isResolved) {
      session.status = SessionStatus.COMPLETED;

      // Record analytics
      this.recordAnalytics(
        sessionId,
        AnalyticsAction.VERIFICATION_SUCCESS,
        Date.now() - session.startTime.getTime(),
        true,
        { totalDuration: Date.now() - session.startTime.getTime() }
      );
    } else {
      // Record analytics
      this.recordAnalytics(
        sessionId,
        AnalyticsAction.VERIFICATION_FAILED,
        Date.now() - session.startTime.getTime(),
        false,
        { totalDuration: Date.now() - session.startTime.getTime() }
      );
    }

    session.lastActivity = new Date();
    return isResolved;
  }

  /**
   * Complete troubleshooting session
   */
  public async completeSession(
    sessionId: string,
    feedback?: any
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = SessionStatus.COMPLETED;
    session.lastActivity = new Date();

    // Record final analytics
    this.recordAnalytics(
      sessionId,
      AnalyticsAction.SESSION_COMPLETED,
      Date.now() - session.startTime.getTime(),
      true,
      {
        totalSteps: session.progress.completedSteps,
        successfulSteps: session.progress.successfulSteps,
        failedSteps: session.progress.failedSteps,
        skippedSteps: session.progress.skippedSteps,
        feedback,
      }
    );

    // Clean up session after delay
    setTimeout(() => {
      this.activeSessions.delete(sessionId);
    }, 60000); // Keep for 1 minute for final analytics
  }

  /**
   * Abandon troubleshooting session
   */
  public async abandonSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return; // Session already abandoned
    }

    session.status = SessionStatus.ABANDONED;
    session.lastActivity = new Date();

    // Record analytics
    this.recordAnalytics(
      sessionId,
      AnalyticsAction.SESSION_ABANDONED,
      Date.now() - session.startTime.getTime(),
      false,
      { reason, progress: session.progress.percentage }
    );

    // Clean up session immediately
    this.activeSessions.delete(sessionId);
  }

  /**
   * Search knowledge base
   */
  public async searchKnowledgeBase(
    query: string,
    category?: string,
    limit: number = 10
  ): Promise<KnowledgeBaseEntry[]> {
    return this.knowledgeBase.search(query, category, limit);
  }

  /**
   * Get FAQ entries
   */
  public async getFAQs(category?: string, limit: number = 20): Promise<any[]> {
    return this.knowledgeBase.getFAQs(category, limit);
  }

  /**
   * Get success metrics
   */
  public async getSuccessMetrics(timeRange?: { start: Date; end: Date }): Promise<SuccessMetrics> {
    if (!this.errorAnalytics) {
      // Return basic metrics from analytics buffer
      return this.calculateBasicMetrics(timeRange);
    }

    // Get detailed metrics from error analytics
    const analyticsData = await this.errorAnalytics.getAggregatedAnalytics(timeRange);
    return this.calculateAdvancedMetrics(analyticsData);
  }

  /**
   * Get mobile-specific troubleshooting guidance
   */
  public async getMobileGuidance(
    sessionId: string,
    deviceInfo: any
  ): Promise<TroubleshootingGuide[]> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add device info to context
    session.context.deviceInfo = deviceInfo;

    return this.guidanceGenerator.generateMobileGuides(
      session.symptomAnalysis,
      session.context
    );
  }

  /**
   * Submit user feedback
   */
  public async submitFeedback(
    sessionId: string,
    feedback: any
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Store feedback in knowledge base for improvement
    await this.knowledgeBase.recordFeedback(feedback);

    // Record analytics
    this.recordAnalytics(
      sessionId,
      AnalyticsAction.FEEDBACK_SUBMITTED,
      0,
      true,
      { feedback }
    );
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<TroubleshootingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update component configurations
    this.symptomChecker.updateConfig(this.config);
    this.wizard.updateConfig(this.config);
    this.knowledgeBase.updateConfig(this.config);
    this.guidanceGenerator.updateConfig(this.config);

    // Restart analytics flush interval if needed
    if (this.config.analytics.enabled && !this.analyticsFlushInterval) {
      this.startAnalyticsFlush();
    } else if (!this.config.analytics.enabled && this.analyticsFlushInterval) {
      clearInterval(this.analyticsFlushInterval);
      this.analyticsFlushInterval = undefined;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): TroubleshootingConfig {
    return { ...this.config };
  }

  /**
   * Get active sessions count
   */
  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Clean up expired sessions
   */
  public cleanupExpiredSessions(): void {
    const now = Date.now();
    const maxDuration = this.config.maxSessionDuration * 60 * 1000; // Convert to ms

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sessionAge = now - session.startTime.getTime();

      if (sessionAge > maxDuration) {
        session.status = SessionStatus.ABANDONED;
        this.recordAnalytics(
          sessionId,
          AnalyticsAction.SESSION_ABANDONED,
          sessionAge,
          false,
          { reason: 'expired' }
        );
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Destroy troubleshooting manager
   */
  public destroy(): void {
    // Clear analytics flush interval
    if (this.analyticsFlushInterval) {
      clearInterval(this.analyticsFlushInterval);
    }

    // Flush remaining analytics
    this.flushAnalytics();

    // Clean up sessions
    for (const sessionId of this.activeSessions.keys()) {
      this.abandonSession(sessionId, 'system_shutdown');
    }

    // Destroy components
    this.symptomChecker.destroy?.();
    this.wizard.destroy?.();
    this.knowledgeBase.destroy?.();
    this.guidanceGenerator.destroy?.();

    // Clear instance
    TroubleshootingManager.instance = null;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Create troubleshooting context
   */
  private async createContext(
    errorId?: string,
    errorCode?: string,
    userId?: string
  ): Promise<TroubleshootingContext> {
    const sessionId = uuidv4();

    // Get browser and device information
    const browserInfo = this.getBrowserInfo();
    const deviceInfo = this.getDeviceInfo();

    return {
      sessionId,
      userId,
      errorId,
      errorCode,
      startTime: new Date(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: this.isMobile(),
      networkType: await this.getNetworkType(),
      browserInfo,
      deviceInfo,
    };
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): any {
    if (typeof window === 'undefined') {
      return {};
    }

    return {
      name: this.getBrowserName(),
      version: this.getBrowserVersion(),
      engine: this.getBrowserEngine(),
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      localStorage: this.checkLocalStorage(),
      sessionStorage: this.checkSessionStorage(),
      indexedDB: this.checkIndexedDB(),
      webGL: this.checkWebGL(),
      webAudio: this.checkWebAudio(),
      mediaDevices: this.checkMediaDevices(),
    };
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): any {
    if (typeof window === 'undefined') {
      return {};
    }

    return {
      type: this.isMobile() ? 'mobile' : 'desktop',
      os: this.getOperatingSystem(),
      osVersion: this.getOperatingSystemVersion(),
      screenResolution: `${screen.width}x${screen.height}`,
      pixelRatio: window.devicePixelRatio,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  }

  /**
   * Get network type
   */
  private async getNetworkType(): Promise<string | undefined> {
    if (typeof window === 'undefined' || !('connection' in navigator)) {
      return undefined;
    }

    const connection = (navigator as any).connection;
    if (connection) {
      return connection.effectiveType || connection.type;
    }

    return undefined;
  }

  /**
   * Browser detection helpers
   */
  private getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  private getBrowserEngine(): string {
    const ua = navigator.userAgent;
    if (ua.includes('WebKit')) return 'WebKit';
    if (ua.includes('Gecko')) return 'Gecko';
    if (ua.includes('Presto')) return 'Presto';
    if (ua.includes('Trident')) return 'Trident';
    return 'Unknown';
  }

  private getOperatingSystem(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private getOperatingSystemVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(Windows NT|Mac OS X|Android|iOS) ([\d._]+)/);
    return match ? match[2] : 'Unknown';
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  private checkLocalStorage(): boolean {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  private checkSessionStorage(): boolean {
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  private checkIndexedDB(): boolean {
    return 'indexedDB' in window;
  }

  private checkWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private checkWebAudio(): boolean {
    return 'AudioContext' in window || 'webkitAudioContext' in window;
  }

  private checkMediaDevices(): boolean {
    return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
  }

  /**
   * Record analytics event
   */
  private recordAnalytics(
    sessionId: string,
    action: AnalyticsAction,
    duration: number,
    success: boolean,
    context?: Record<string, any>
  ): void {
    if (!this.config.analytics.enabled) {
      return;
    }

    const analytics: TroubleshootingAnalytics = {
      sessionId,
      action,
      duration,
      success,
      context: context || {},
      timestamp: new Date(),
    };

    this.analyticsBuffer.push(analytics);

    // Flush buffer if it gets too large
    if (this.analyticsBuffer.length >= 50) {
      this.flushAnalytics();
    }
  }

  /**
   * Start analytics flush interval
   */
  private startAnalyticsFlush(): void {
    this.analyticsFlushInterval = setInterval(() => {
      this.flushAnalytics();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Flush analytics buffer
   */
  private flushAnalytics(): void {
    if (this.analyticsBuffer.length === 0) {
      return;
    }

    const analytics = [...this.analyticsBuffer];
    this.analyticsBuffer = [];

    // Send to error analytics if available
    if (this.errorAnalytics) {
      try {
        analytics.forEach(event => {
          this.errorAnalytics!.recordErrorEvent({
            sessionId: event.sessionId,
            eventType: 'troubleshooting_analytics',
            data: event,
            timestamp: event.timestamp,
            userAgent: '', // Will be added by analytics system
          });
        });
      } catch (error) {
        console.warn('Failed to send analytics to error analytics:', error);
        // Put back in buffer for retry
        this.analyticsBuffer.unshift(...analytics);
      }
    }

    // Store locally for offline access
    if (this.config.enableOffline && typeof window !== 'undefined') {
      this.storeAnalyticsOffline(analytics);
    }
  }

  /**
   * Calculate basic metrics from analytics buffer
   */
  private calculateBasicMetrics(timeRange?: { start: Date; end: Date }): SuccessMetrics {
    const allAnalytics = this.getStoredAnalytics(timeRange);

    const sessions = new Set(allAnalytics.map(a => a.sessionId));
    const completedSessions = allAnalytics.filter(a =>
      a.action === AnalyticsAction.SESSION_COMPLETED
    );

    const sessionDurations = new Map<string, number>();
    allAnalytics.forEach(a => {
      if (a.action === AnalyticsAction.SESSION_COMPLETED) {
        sessionDurations.set(a.sessionId, a.duration);
      }
    });

    return {
      totalSessions: sessions.size,
      completedSessions: completedSessions.length,
      successfulResolutions: allAnalytics.filter(a =>
        a.action === AnalyticsAction.VERIFICATION_SUCCESS
      ).length,
      averageSessionDuration: sessionDurations.size > 0
        ? Array.from(sessionDurations.values()).reduce((a, b) => a + b, 0) / sessionDurations.size
        : 0,
      averageStepsPerSession: 0, // Would need more detailed tracking
      mostCommonSymptoms: [],
      mostEffectiveGuides: [],
      userSatisfaction: {
        averageRating: 0,
        wouldRecommend: 0,
        helpfulCount: 0,
        totalFeedback: 0,
      },
    };
  }

  /**
   * Calculate advanced metrics from error analytics
   */
  private calculateAdvancedMetrics(analyticsData: any): SuccessMetrics {
    // Implementation would depend on error analytics data structure
    return this.calculateBasicMetrics();
  }

  /**
   * Initialize offline storage
   */
  private initializeOfflineStorage(): void {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      // Initialize IndexedDB for offline storage
      // This would be implemented with Dexie or similar
    }
  }

  /**
   * Store analytics offline
   */
  private storeAnalyticsOffline(analytics: TroubleshootingAnalytics[]): void {
    // Store in IndexedDB for offline access
    // Implementation would depend on storage system
  }

  /**
   * Get stored analytics
   */
  private getStoredAnalytics(timeRange?: { start: Date; end: Date }): TroubleshootingAnalytics[] {
    // Retrieve from storage
    // Implementation would depend on storage system
    return [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create troubleshooting manager with default configuration
 */
export function createTroubleshootingManager(
  configOverrides?: Partial<TroubleshootingConfig>
): TroubleshootingManager {
  const defaultConfig: TroubleshootingConfig = {
    enabled: true,
    autoStart: false,
    collectAnalytics: true,
    enableMobile: true,
    enableOffline: true,
    language: 'en',
    theme: 'auto',
    maxSessionDuration: 60, // minutes
    cacheSize: 100, // MB
    analytics: {
      enabled: true,
      collectUserAgent: true,
      collectDeviceInfo: true,
      collectNetworkInfo: true,
      collectPerformanceMetrics: true,
      retentionPeriod: 30, // days
      anonymizeData: true,
      consentRequired: false,
    },
    content: {
      approvalRequired: false,
      versionControl: true,
      multiLanguage: false,
      autoTranslation: false,
      contentReview: true,
      analytics: true,
      search: true,
      categorization: true,
    },
    integration: {
      errorClassification: true,
      recoveryStrategies: true,
      errorMiddleware: true,
      tanStackQuery: true,
      errorAnalytics: true,
      errorLogging: true,
      monitoring: true,
      supportSystems: [],
    },
  };

  const config = { ...defaultConfig, ...configOverrides };
  return TroubleshootingManager.getInstance(config);
}

/**
 * Quick start troubleshooting for an error
 */
export async function quickStartTroubleshooting(
  errorId?: string,
  errorCode?: string,
  config?: Partial<TroubleshootingConfig>
): Promise<{ sessionId: string; session: WizardSession }> {
  const manager = createTroubleshootingManager(config);
  const session = await manager.createSession(errorId, errorCode);

  return {
    sessionId: session.id,
    session,
  };
}
