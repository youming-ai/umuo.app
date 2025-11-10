/**
 * User Behavior Tracker for Mobile Analytics
 *
 * Tracks user interactions, gestures, and behavior patterns
 * on mobile devices to provide insights for language learning optimization.
 *
 * @version 1.0.0
 */

import { TouchInteractionType, TouchTarget, TouchGestureData } from '../../types/mobile';
import { MobileAnalyticsConfig, TouchInteractionData, AnalyticsEventType } from './mobile-analytics';
import { OptimizedEventEmitter } from '../utils/event-manager';

// ============================================================================
// USER BEHAVIOR INTERFACES
// ============================================================================

/**
 * Gesture tracking configuration
 */
export interface GestureTrackingConfig {
  enabled: boolean;
  trackTap: boolean;
  trackDoubleTap: boolean;
  trackSwipe: boolean;
  trackDrag: boolean;
  trackPinch: boolean;
  trackLongPress: boolean;
  minSwipeDistance: number; // px
  maxSwipeTime: number; // ms
  minLongPressDuration: number; // ms
  doubleTapMaxTime: number; // ms
}

/**
 * Touch analytics data
 */
export interface TouchAnalyticsData {
  target: TouchTarget;
  interactionType: TouchInteractionType;
  gestureData?: TouchGestureData;
  timestamp: Date;
  position: { x: number; y: number };
  pressure?: number;
  touchSize?: number;
  duration: number;
  success: boolean;
  multiTouch: boolean;
  touchPoints: number;
  errorMessage?: string;
  context: {
    viewportSize: { width: number; height: number };
    scrollPosition: { x: number; y: number };
    targetElement: string;
    targetSize: { width: number; height: number };
  };
}

/**
 * Navigation tracking data
 */
export interface NavigationData {
  from: string;
  to: string;
  method: 'navigation' | 'back' | 'forward' | 'reload' | 'external';
  timestamp: Date;
  duration: number; // Time spent on previous page
  trigger: 'click' | 'touch' | 'gesture' | 'programmatic' | 'keyboard';
  source?: string; // Element that triggered navigation
}

/**
 * Form interaction data
 */
export interface FormInteractionData {
  formId: string;
  fieldName: string;
  fieldType: string;
  interactionType: 'focus' | 'blur' | 'input' | 'change' | 'submit' | 'error';
  value?: string;
  timestamp: Date;
  duration?: number; // Time spent in field
  validationStatus?: 'valid' | 'invalid' | 'pending';
  errorMessage?: string;
  attempts: number;
}

/**
 * Scroll behavior data
 */
export interface ScrollBehaviorData {
  direction: 'up' | 'down' | 'left' | 'right';
  velocity: number; // px/ms
  distance: number; // px
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  timestamp: Date;
  duration: number;
  method: 'touch' | 'wheel' | 'keyboard' | 'programmatic';
  target: string;
}

/**
 * Content interaction data
 */
export interface ContentInteractionData {
  contentType: 'audio' | 'text' | 'video' | 'image' | 'interactive';
  action: 'play' | 'pause' | 'seek' | 'volume_change' | 'speed_change' | 'select' | 'highlight' | 'copy' | 'share';
  target: string;
  timestamp: Date;
  position?: number; // For audio/video playback position
  value?: any; // New value for change actions
  context: {
    duration?: number;
    filename?: string;
    transcriptId?: string;
    segmentId?: string;
  };
}

/**
 * User session flow data
 */
export interface UserFlowData {
  flowId: string;
  steps: FlowStep[];
  startTime: Date;
  endTime?: Date;
  completed: boolean;
  abandonedAt?: string;
  errors: string[];
  totalDuration: number;
}

/**
 * Individual flow step
 */
export interface FlowStep {
  stepId: string;
  stepName: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
  context: Record<string, any>;
}

/**
 * Behavior tracking metrics
 */
export interface BehaviorMetrics {
  totalInteractions: number;
  interactionsByType: Record<TouchInteractionType, number>;
  averageTouchResponseTime: number;
  gestureSuccessRate: number;
  mostUsedFeatures: string[];
  sessionDuration: number;
  pagesViewed: number;
  bounceRate: number;
  conversionRate: number;
  errorRate: number;
}

// ============================================================================
// USER BEHAVIOR TRACKER CLASS
// ============================================================================

/**
 * Tracks user behavior and interactions on mobile devices
 */
export class UserBehaviorTracker {
  private config: MobileAnalyticsConfig;
  private eventEmitter: OptimizedEventEmitter<any>;
  private isEnabled = false;
  private gestureConfig: GestureTrackingConfig;

  // Touch tracking
  private touchStartTime = 0;
  private touchStartPos = { x: 0, y: 0 };
  private lastTapTime = 0;
  private touchTargets = new Map<string, TouchTarget>();
  private gestureHandlers: Map<string, (data: TouchAnalyticsData) => void> = new Map();

  // Navigation tracking
  private pageStartTime = Date.now();
  private currentPage = window.location.pathname;
  private navigationHistory: NavigationData[] = [];

  // Form tracking
  private formInteractions = new Map<string, FormInteractionData[]>();
  private formStartTime = new Map<string, number>();

  // User flow tracking
  private activeFlows = new Map<string, UserFlowData>();
  private flowDefinitions = new Map<string, FlowDefinition>();

  // Performance metrics
  private interactionMetrics: BehaviorMetrics = {
    totalInteractions: 0,
    interactionsByType: {} as Record<TouchInteractionType, number>,
    averageTouchResponseTime: 0,
    gestureSuccessRate: 0,
    mostUsedFeatures: [],
    sessionDuration: 0,
    pagesViewed: 1,
    bounceRate: 0,
    conversionRate: 0,
    errorRate: 0,
  };

  constructor(config: MobileAnalyticsConfig, eventEmitter: OptimizedEventEmitter<any>) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.gestureConfig = this.initializeGestureConfig();
  }

  /**
   * Initialize the behavior tracker
   */
  public async initialize(): Promise<void> {
    if (!this.config.collectUserBehavior) {
      console.warn('[UserBehaviorTracker] User behavior tracking disabled');
      return;
    }

    try {
      this.setupTouchTracking();
      this.setupNavigationTracking();
      this.setupFormTracking();
      this.setupScrollTracking();
      this.setupPerformanceTracking();

      this.isEnabled = true;

      if (this.config.debugMode) {
        console.log('[UserBehaviorTracker] Initialized successfully');
      }

    } catch (error) {
      console.error('[UserBehaviorTracker] Failed to initialize:', error);
    }
  }

  /**
   * Stop behavior tracking
   */
  public stop(): void {
    this.isEnabled = false;

    // Remove event listeners
    this.removeTouchTracking();
    this.removeNavigationTracking();
    this.removeFormTracking();
    this.removeScrollTracking();

    console.log('[UserBehaviorTracker] Stopped');
  }

  /**
   * Track custom touch interaction
   */
  public trackTouchInteraction(data: TouchInteractionData): void {
    if (!this.isEnabled) return;

    const analyticsData: TouchAnalyticsData = {
      target: data.target,
      interactionType: data.interactionType,
      timestamp: new Date(),
      position: data.position,
      duration: data.duration,
      success: data.success,
      multiTouch: false,
      touchPoints: 1,
      errorMessage: data.errorMessage,
      context: this.getTouchContext(),
    };

    this.processTouchData(analyticsData);
    this.updateInteractionMetrics(data.interactionType, data.success);
  }

  /**
   * Track navigation event
   */
  public trackNavigation(data: NavigationData): void {
    if (!this.isEnabled) return;

    const duration = Date.now() - this.pageStartTime;
    data.duration = duration;

    this.navigationHistory.push(data);
    this.pageStartTime = Date.now();
    this.currentPage = data.to;

    this.eventEmitter.emit('navigation_tracked', data);
  }

  /**
   * Track form interaction
   */
  public trackFormInteraction(data: FormInteractionData): void {
    if (!this.isEnabled) return;

    if (!this.formInteractions.has(data.formId)) {
      this.formInteractions.set(data.formId, []);
    }

    const interactions = this.formInteractions.get(data.formId)!;

    // Calculate duration for focus/blur events
    if (data.interactionType === 'focus') {
      this.formStartTime.set(`${data.formId}_${data.fieldName}`, Date.now());
    } else if (data.interactionType === 'blur') {
      const startTime = this.formStartTime.get(`${data.formId}_${data.fieldName}`);
      if (startTime) {
        data.duration = Date.now() - startTime;
        this.formStartTime.delete(`${data.formId}_${data.fieldName}`);
      }
    }

    interactions.push(data);
    this.eventEmitter.emit('form_interaction_tracked', data);
  }

  /**
   * Track content interaction
   */
  public trackContentInteraction(data: ContentInteractionData): void {
    if (!this.isEnabled) return;

    this.eventEmitter.emit('content_interaction_tracked', data);

    // Update most used features
    this.updateMostUsedFeatures(`${data.contentType}_${data.action}`);
  }

  /**
   * Start tracking a user flow
   */
  public startFlow(flowId: string, flowName: string): void {
    if (!this.isEnabled) return;

    const flowData: UserFlowData = {
      flowId,
      steps: [],
      startTime: new Date(),
      completed: false,
      errors: [],
      totalDuration: 0,
    };

    this.activeFlows.set(flowId, flowData);
    this.eventEmitter.emit('flow_started', { flowId, flowName });
  }

  /**
   * Track a step in a user flow
   */
  public trackFlowStep(
    flowId: string,
    stepId: string,
    stepName: string,
    success: boolean,
    error?: string,
    context?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const flow = this.activeFlows.get(flowId);
    if (!flow) return;

    const step: FlowStep = {
      stepId,
      stepName,
      timestamp: new Date(),
      duration: 0, // Would calculate from previous step
      success,
      error,
      context: context || {},
    };

    flow.steps.push(step);

    if (!success) {
      flow.errors.push(error || 'Unknown error');
    }

    this.eventEmitter.emit('flow_step_tracked', { flowId, step });
  }

  /**
   * Complete a user flow
   */
  public completeFlow(flowId: string, success: boolean = true): void {
    if (!this.isEnabled) return;

    const flow = this.activeFlows.get(flowId);
    if (!flow) return;

    flow.endTime = new Date();
    flow.completed = success;
    flow.totalDuration = flow.endTime.getTime() - flow.startTime.getTime();

    if (!success) {
      flow.abandonedAt = flow.steps.length > 0 ?
        flow.steps[flow.steps.length - 1].stepId : 'start';
    }

    this.activeFlows.delete(flowId);
    this.eventEmitter.emit('flow_completed', flow);
  }

  /**
   * Get behavior metrics
   */
  public getMetrics(): BehaviorMetrics {
    return { ...this.interactionMetrics };
  }

  /**
   * Get navigation history
   */
  public getNavigationHistory(): NavigationData[] {
    return [...this.navigationHistory];
  }

  /**
   * Get active user flows
   */
  public getActiveFlows(): UserFlowData[] {
    return Array.from(this.activeFlows.values());
  }

  // Private methods
  private initializeGestureConfig(): GestureTrackingConfig {
    return {
      enabled: this.config.enableGestureTracking,
      trackTap: true,
      trackDoubleTap: true,
      trackSwipe: true,
      trackDrag: true,
      trackPinch: true,
      trackLongPress: true,
      minSwipeDistance: 10,
      maxSwipeTime: 500,
      minLongPressDuration: 500,
      doubleTapMaxTime: 300,
    };
  }

  private setupTouchTracking(): void {
    if (!this.gestureConfig.enabled) return;

    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });
  }

  private removeTouchTracking(): void {
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    document.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
  }

  private handleTouchStart(event: TouchEvent): void {
    if (!this.isEnabled) return;

    const touch = event.touches[0];
    if (!touch) return;

    this.touchStartTime = Date.now();
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };

    // Identify touch target
    const target = this.identifyTouchTarget(event.target as Element);

    // Track multi-touch
    if (event.touches.length > 1) {
      this.trackMultiTouch(event);
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isEnabled) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const currentTime = Date.now();
    const duration = currentTime - this.touchStartTime;
    const gestureData = this.createGestureData(touch);

    // Determine interaction type
    const interactionType = this.determineInteractionType(duration, gestureData);
    const target = this.identifyTouchTarget(event.target as Element);

    const analyticsData: TouchAnalyticsData = {
      target,
      interactionType,
      gestureData,
      timestamp: new Date(),
      position: { x: touch.clientX, y: touch.clientY },
      pressure: touch.force,
      touchSize: touch.radiusX || touch.radiusY,
      duration,
      success: true,
      multiTouch: event.touches.length > 0, // Check if other touches remain
      touchPoints: event.touches.length + 1, // Current + ended touches
      context: this.getTouchContext(),
    };

    this.processTouchData(analyticsData);
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isEnabled) return;

    const touch = event.touches[0];
    if (!touch) return;

    // Check for drag gesture
    const currentTime = Date.now();
    const duration = currentTime - this.touchStartTime;

    if (duration > 100) { // Only track after 100ms of movement
      const gestureData = this.createGestureData(touch);

      if (this.gestureConfig.trackDrag && gestureData.distance > 5) {
        const target = this.identifyTouchTarget(event.target as Element);

        const analyticsData: TouchAnalyticsData = {
          target,
          interactionType: 'drag',
          gestureData,
          timestamp: new Date(),
          position: { x: touch.clientX, y: touch.clientY },
          pressure: touch.force,
          duration,
          success: true,
          multiTouch: event.touches.length > 1,
          touchPoints: event.touches.length,
          context: this.getTouchContext(),
        };

        this.processTouchData(analyticsData);
      }
    }
  }

  private handleTouchCancel(event: TouchEvent): void {
    if (!this.isEnabled) return;

    // Track cancelled touches as failed interactions
    const touch = event.changedTouches[0];
    if (!touch) return;

    const duration = Date.now() - this.touchStartTime;
    const target = this.identifyTouchTarget(event.target as Element);

    const analyticsData: TouchAnalyticsData = {
      target,
      interactionType: 'tap', // Default to tap for cancelled touches
      timestamp: new Date(),
      position: { x: touch.clientX, y: touch.clientY },
      duration,
      success: false,
      errorMessage: 'Touch cancelled',
      multiTouch: false,
      touchPoints: 1,
      context: this.getTouchContext(),
    };

    this.processTouchData(analyticsData);
  }

  private identifyTouchTarget(element: Element): TouchTarget {
    const tagName = element.tagName.toLowerCase();
    const className = element.className;
    const id = element.id;

    // Check for specific app targets
    if (id === 'play-button' || id === 'audio-play') return 'play_button';
    if (id === 'pause-button' || id === 'audio-pause') return 'play_button';
    if (id === 'progress-bar' || id === 'audio-progress') return 'progress_bar';
    if (id === 'volume-control' || id === 'audio-volume') return 'volume_control';
    if (id === 'speed-control' || id === 'audio-speed') return 'speed_control';
    if (className?.includes('upload-area') || id === 'file-upload') return 'upload_area';

    // Check by tag name and class
    if (tagName === 'button') {
      if (className?.includes('play')) return 'play_button';
      if (className?.includes('upload')) return 'upload_area';
    }

    if (tagName === 'input' && element.getAttribute('type') === 'file') {
      return 'upload_area';
    }

    if (tagName === 'video' || tagName === 'audio') {
      return 'play_button';
    }

    // Default based on element type
    if (tagName === 'a' || tagName === 'button') return 'play_button';
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') return 'upload_area';

    return 'file_item'; // Default fallback
  }

  private createGestureData(touch: Touch): TouchGestureData {
    const deltaX = touch.clientX - this.touchStartPos.x;
    const deltaY = touch.clientY - this.touchStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - this.touchStartTime;

    let direction: TouchGestureData['direction'] = 'up';
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    return {
      startX: this.touchStartPos.x,
      startY: this.touchStartPos.y,
      endX: touch.clientX,
      endY: touch.clientY,
      duration,
      velocity: duration > 0 ? distance / duration : 0,
      direction,
      distance,
    };
  }

  private determineInteractionType(duration: number, gestureData: TouchGestureData): TouchInteractionType {
    // Check for long press
    if (duration >= this.gestureConfig.minLongPressDuration && gestureData.distance < 10) {
      return 'long_press';
    }

    // Check for double tap
    const currentTime = Date.now();
    if (currentTime - this.lastTapTime < this.gestureConfig.doubleTapMaxTime) {
      this.lastTapTime = 0;
      return 'double_tap';
    }

    // Check for swipe
    if (this.gestureConfig.trackSwipe &&
        gestureData.distance >= this.gestureConfig.minSwipeDistance &&
        duration <= this.gestureConfig.maxSwipeTime) {
      this.lastTapTime = currentTime;
      return 'swipe';
    }

    // Check for drag
    if (this.gestureConfig.trackDrag && gestureData.distance > 10) {
      return 'drag';
    }

    // Default to tap
    this.lastTapTime = currentTime;
    return 'tap';
  }

  private getTouchContext(): TouchAnalyticsData['context'] {
    return {
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scrollPosition: {
        x: window.pageXOffset,
        y: window.pageYOffset,
      },
      targetElement: document.activeElement?.tagName || 'none',
      targetSize: {
        width: 0, // Would get from actual target
        height: 0,
      },
    };
  }

  private trackMultiTouch(event: TouchEvent): void {
    if (event.touches.length === 2) {
      // Track pinch gesture
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      // Would track pinch scale changes over time
      if (this.config.debugMode) {
        console.log('[UserBehaviorTracker] Multi-touch detected:', event.touches.length, 'Distance:', distance);
      }
    }
  }

  private processTouchData(data: TouchAnalyticsData): void {
    // Emit touch event
    this.eventEmitter.emit('touch_tracked', data);

    // Update metrics
    this.interactionMetrics.totalInteractions++;
    this.interactionMetrics.interactionsByType[data.interactionType] =
      (this.interactionMetrics.interactionsByType[data.interactionType] || 0) + 1;

    // Update success rate
    const totalTypeInteractions = Object.values(this.interactionMetrics.interactionsByType)
      .reduce((sum, count) => sum + count, 0);
    this.interactionMetrics.gestureSuccessRate =
      (totalTypeInteractions - this.getErrorCount()) / totalTypeInteractions;
  }

  private setupNavigationTracking(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, track as navigation away
        const navigationData: NavigationData = {
          from: this.currentPage,
          to: 'hidden',
          method: 'navigation',
          timestamp: new Date(),
          duration: Date.now() - this.pageStartTime,
          trigger: 'programmatic',
        };

        this.trackNavigation(navigationData);
      } else {
        // Page is visible again
        this.pageStartTime = Date.now();
        this.currentPage = window.location.pathname;
      }
    });
  }

  private removeNavigationTracking(): void {
    document.removeEventListener('visibilitychange', () => {});
  }

  private setupFormTracking(): void {
    // Track form interactions
    document.addEventListener('focus', (event) => {
      const target = event.target as HTMLInputElement;
      if (target && target.form) {
        this.trackFormInteraction({
          formId: target.form.id || 'unknown',
          fieldName: target.name || target.id || 'unknown',
          fieldType: target.type || target.tagName.toLowerCase(),
          interactionType: 'focus',
          timestamp: new Date(),
          attempts: 1,
        });
      }
    }, true);

    document.addEventListener('blur', (event) => {
      const target = event.target as HTMLInputElement;
      if (target && target.form) {
        this.trackFormInteraction({
          formId: target.form.id || 'unknown',
          fieldName: target.name || target.id || 'unknown',
          fieldType: target.type || target.tagName.toLowerCase(),
          interactionType: 'blur',
          value: target.value,
          timestamp: new Date(),
          attempts: 1,
          validationStatus: target.validity.valid ? 'valid' : 'invalid',
        });
      }
    }, true);

    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form) {
        this.trackFormInteraction({
          formId: form.id || 'unknown',
          fieldName: 'form_submit',
          fieldType: 'submit',
          interactionType: 'submit',
          timestamp: new Date(),
          attempts: 1,
        });
      }
    }, true);
  }

  private removeFormTracking(): void {
    // Remove form event listeners
    document.removeEventListener('focus', () => {});
    document.removeEventListener('blur', () => {});
    document.removeEventListener('submit', () => {});
  }

  private setupScrollTracking(): void {
    let scrollTimeout: NodeJS.Timeout;
    let lastScrollPosition = { x: window.pageXOffset, y: window.pageYOffset };
    let scrollStartTime = 0;

    const handleScroll = () => {
      const currentPosition = { x: window.pageXOffset, y: window.pageYOffset };

      if (scrollStartTime === 0) {
        scrollStartTime = Date.now();
      }

      // Clear previous timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Set new timeout to detect when scrolling ends
      scrollTimeout = setTimeout(() => {
        const scrollData: ScrollBehaviorData = {
          direction: currentPosition.y > lastScrollPosition.y ? 'down' : 'up',
          velocity: 0, // Would calculate
          distance: Math.abs(currentPosition.y - lastScrollPosition.y),
          startPosition: lastScrollPosition,
          endPosition: currentPosition,
          timestamp: new Date(),
          duration: Date.now() - scrollStartTime,
          method: 'touch',
          target: document.body.tagName,
        };

        this.eventEmitter.emit('scroll_tracked', scrollData);

        lastScrollPosition = currentPosition;
        scrollStartTime = 0;
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  private removeScrollTracking(): void {
    window.removeEventListener('scroll', () => {});
  }

  private setupPerformanceTracking(): void {
    // Track page load performance
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            this.interactionMetrics.averageTouchResponseTime = navigation.loadEventEnd - navigation.loadEventStart;
          }
        }, 0);
      });
    }
  }

  private updateInteractionMetrics(interactionType: TouchInteractionType, success: boolean): void {
    this.interactionMetrics.totalInteractions++;
    this.interactionMetrics.interactionsByType[interactionType] =
      (this.interactionMetrics.interactionsByType[interactionType] || 0) + 1;

    if (!success) {
      // Would update error count
    }
  }

  private updateMostUsedFeatures(feature: string): void {
    const features = this.interactionMetrics.mostUsedFeatures;
    const index = features.indexOf(feature);

    if (index === -1) {
      features.push(feature);
    } else {
      // Move to end (most recent)
      features.splice(index, 1);
      features.push(feature);
    }

    // Keep only top 10 features
    if (features.length > 10) {
      features.splice(0, features.length - 10);
    }
  }

  private getErrorCount(): number {
    // Would calculate from failed interactions
    return 0;
  }
}

// ============================================================================
// FLOW DEFINITION INTERFACES
// ============================================================================

/**
 * User flow definition
 */
export interface FlowDefinition {
  flowId: string;
  flowName: string;
  description: string;
  steps: FlowStepDefinition[];
  expectedDuration: number; // ms
  category: 'onboarding' | 'core_task' | 'advanced_feature' | 'error_recovery';
}

/**
 * Flow step definition
 */
export interface FlowStepDefinition {
  stepId: string;
  stepName: string;
  description: string;
  expectedDuration: number; // ms
  required: boolean;
  targetElement?: string;
  successCriteria?: string[];
}

export default UserBehaviorTracker;
