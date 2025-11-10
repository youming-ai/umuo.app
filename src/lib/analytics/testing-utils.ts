/**
 * Testing Utilities for Mobile Analytics
 *
 * Provides comprehensive testing tools, mock data generation,
 * and debug mode utilities for the mobile analytics system.
 *
 * @version 1.0.0
 */

import { MobileAnalyticsConfig, AnalyticsEvent, AnalyticsEventType, ConsentLevel } from './mobile-analytics';
import { TouchInteractionType, TouchTarget } from '../../types/mobile';

// ============================================================================
// TESTING INTERFACES
// ============================================================================

/**
 * Test scenario configuration
 */
export interface TestScenario {
  name: string;
  description: string;
  events: TestEvent[];
  expectedResults: TestExpectation[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
}

/**
 * Test event definition
 */
export interface TestEvent {
  type: AnalyticsEventType;
  data: Record<string, any>;
  delay?: number; // ms before sending event
  timestamp?: Date;
  expectedSuccess?: boolean;
}

/**
 * Test expectation
 */
export interface TestExpectation {
  type: 'event_count' | 'event_type' | 'data_property' | 'transmission' | 'error';
  condition: string | ((events: AnalyticsEvent[]) => boolean);
  expected: any;
  tolerance?: number;
}

/**
 * Mock data generator options
 */
export interface MockDataOptions {
  count: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  deviceTypes: string[];
  eventTypes: AnalyticsEventType[];
  includeErrors: boolean;
  errorRate: number; // 0-1
  includePerformanceMetrics: boolean;
  realisticTiming: boolean;
  geographicDistribution: string[];
}

/**
 * Test result
 */
export interface TestResult {
  scenario: string;
  success: boolean;
  duration: number; // ms
  eventsGenerated: number;
  eventsTransmitted: number;
  expectationsPassed: number;
  expectationsFailed: number;
  errors: string[];
  metrics: Record<string, any>;
}

/**
 * Debug configuration
 */
export interface DebugConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  consoleOutput: boolean;
  visualDebugging: boolean;
  eventLogging: boolean;
  performanceLogging: boolean;
  networkLogging: boolean;
  memoryLogging: boolean;
  showOverlay: boolean;
  overlayPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxLogEntries: number;
}

/**
 * Performance benchmark
 */
export interface PerformanceBenchmark {
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<void>;
  teardown: () => Promise<void>;
  iterations: number;
  metrics: string[];
}

// ============================================================================
// TEST DATA GENERATOR
// ============================================================================

/**
 * Generates mock analytics data for testing
 */
export class MockDataGenerator {
  private static readonly FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth'];
  private static readonly LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  private static readonly COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'South Korea', 'Brazil', 'India'];
  private static readonly CITIES = ['New York', 'London', 'Toronto', 'Sydney', 'Berlin', 'Paris', 'Tokyo', 'Seoul', 'São Paulo', 'Mumbai'];
  private static readonly FILE_NAMES = ['lesson_1.mp3', 'conversation_practice.wav', 'pronunciation_guide.m4a', 'listening_exercise.mp3', 'vocabulary_list.mp3'];
  private static readonly ERROR_MESSAGES = ['Network timeout', 'Invalid file format', 'Processing failed', 'Memory limit exceeded', 'API rate limit exceeded'];

  /**
   * Generate mock analytics events
   */
  static generateEvents(options: MockDataOptions): AnalyticsEvent[] {
    const events: AnalyticsEvent[] = [];
    const timeSpan = options.timeRange.end.getTime() - options.timeRange.start.getTime();

    for (let i = 0; i < options.count; i++) {
      const timestamp = options.realisticTiming ?
        new Date(options.timeRange.start.getTime() + Math.random() * timeSpan) :
        options.timeRange.start;

      const eventType = this.randomElement(options.eventTypes);
      const eventData = this.generateEventData(eventType, options.includeErrors, options.errorRate);

      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        type: eventType,
        timestamp,
        sessionId: this.generateSessionId(),
        userId: Math.random() > 0.3 ? this.generateUserId() : undefined,
        data: eventData,
        context: this.generateEventContext(options.deviceTypes, options.geographicDistribution),
        consent: ConsentLevel.ANALYTICS,
        anonymized: false,
      };

      events.push(event);
    }

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return events;
  }

  /**
   * Generate mock device context
   */
  static generateDeviceContext(deviceTypes: string[], countries: string[]): any {
    const deviceType = this.randomElement(deviceTypes);
    const country = this.randomElement(countries);
    const city = this.randomElement(this.CITIES);

    return {
      device: {
        type: deviceType as any,
        manufacturer: this.randomElement(['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi']),
        model: this.randomElement(['iPhone 13', 'Galaxy S21', 'Pixel 6', 'OnePlus 9', 'Mi 11']),
        os: this.randomElement(['iOS 15.0', 'Android 12', 'Android 11', 'iOS 14.0']),
        osVersion: this.randomElement(['15.0', '14.7', '12.0', '11.0']),
        browser: this.randomElement(['Chrome', 'Safari', 'Firefox', 'Edge']),
        browserVersion: this.randomElement(['95.0', '94.0', '93.0', '15.0']),
        screenResolution: {
          width: this.randomElement([375, 414, 390, 428, 360, 412]),
          height: this.randomElement([667, 896, 844, 926, 640, 915])
        },
        pixelRatio: this.randomElement([2, 3, 2.625]),
        orientation: this.randomElement(['portrait', 'landscape'] as any),
        touchSupport: true,
        maxTouchPoints: this.randomElement([1, 5, 10]),
        deviceMemory: this.randomElement([4, 6, 8, 12]),
        hardwareConcurrency: this.randomElement([6, 8, 12]),
      },
      app: {
        version: '1.0.0',
        buildNumber: '2024.1.0',
        environment: 'production',
        language: 'en-US',
        theme: this.randomElement(['dark', 'light']),
        features: ['transcription', 'audio-player', 'file-management'],
        viewport: { width: 375, height: 812 },
        isPWA: Math.random() > 0.5,
        isStandalone: Math.random() > 0.7,
        onlineStatus: Math.random() > 0.1,
      },
      network: {
        type: this.randomElement(['wifi', 'cellular', 'unknown'] as any),
        effectiveType: this.randomElement(['4g', '3g', 'slow-2g'] as any),
        downlink: Math.random() * 50 + 1,
        rtt: Math.floor(Math.random() * 200) + 20,
        saveData: Math.random() > 0.8,
        connectionQuality: this.randomElement(['excellent', 'good', 'fair', 'poor'] as any),
      },
      performance: {
        memoryUsage: Math.random() * 200 + 50,
        cpuUsage: Math.random() * 100,
        domContentLoaded: Math.random() * 2000 + 500,
        firstContentfulPaint: Math.random() * 3000 + 1000,
        largestContentfulPaint: Math.random() * 4000 + 2000,
        firstInputDelay: Math.random() * 300 + 50,
        cumulativeLayoutShift: Math.random() * 0.3,
        frameRate: Math.floor(Math.random() * 30) + 30,
      },
      battery: {
        level: Math.random(),
        charging: Math.random() > 0.7,
        chargingTime: Math.random() > 0.5 ? Math.random() * 7200 + 1800 : 0,
        dischargingTime: Math.random() * 14400 + 3600,
        isLowPowerMode: Math.random() > 0.8,
      },
      location: {
        country,
        region: this.randomElement(['California', 'Ontario', 'England', 'Bavaria', 'Île-de-France']),
        city,
        timezone: this.randomElement(['America/New_York', 'Europe/London', 'America/Toronto', 'Europe/Paris', 'Asia/Tokyo']),
      },
    };
  }

  /**
   * Generate event data based on event type
   */
  private static generateEventData(eventType: AnalyticsEventType, includeErrors: boolean, errorRate: number): Record<string, any> {
    const shouldError = includeErrors && Math.random() < errorRate;

    switch (eventType) {
      case AnalyticsEventType.AUDIO_PLAY:
      case AnalyticsEventType.AUDIO_PAUSE:
        return {
          fileId: Math.floor(Math.random() * 1000) + 1,
          filename: this.randomElement(this.FILE_NAMES),
          duration: Math.random() * 600 + 60, // 1-10 minutes
          currentTime: Math.random() * 300,
          playbackRate: this.randomElement([0.5, 0.75, 1.0, 1.25, 1.5]),
          volume: Math.random(),
          error: shouldError ? this.randomElement(this.ERROR_MESSAGES) : undefined,
        };

      case AnalyticsEventType.TRANSCRIPTION_START:
      case AnalyticsEventType.TRANSCRIPTION_PROGRESS:
      case AnalyticsEventType.TRANSCRIPTION_COMPLETE:
        return {
          fileId: Math.floor(Math.random() * 1000) + 1,
          filename: this.randomElement(this.FILE_NAMES),
          fileSize: Math.random() * 50 + 1, // 1-50 MB
          duration: Math.random() * 600 + 60,
          language: this.randomElement(['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP']),
          startTime: new Date(Date.now() - Math.random() * 3600000),
          status: shouldError ? 'failed' : this.randomElement(['started', 'progress', 'completed']),
          progress: eventType === AnalyticsEventType.TRANSCRIPTION_PROGRESS ? Math.random() : undefined,
          processingTime: Math.random() * 30000 + 5000,
          accuracy: shouldError ? 0 : Math.random() * 0.3 + 0.7, // 0.7-1.0
          wordCount: Math.floor(Math.random() * 5000) + 100,
          errorMessage: shouldError ? this.randomElement(this.ERROR_MESSAGES) : undefined,
        };

      case AnalyticsEventType.FILE_UPLOAD:
      case AnalyticsEventType.FILE_DOWNLOAD:
        return {
          fileId: Math.floor(Math.random() * 1000) + 1,
          filename: this.randomElement(this.FILE_NAMES),
          fileType: this.randomElement(['audio/mpeg', 'audio/wav', 'audio/mp4']),
          fileSize: Math.random() * 50 + 1,
          uploadTime: eventType === AnalyticsEventType.FILE_UPLOAD ? Math.random() * 30000 + 5000 : undefined,
          downloadTime: eventType === AnalyticsEventType.FILE_DOWNLOAD ? Math.random() * 20000 + 2000 : undefined,
          uploadMethod: this.randomElement(['drag_drop', 'click', 'mobile_share']),
          error: shouldError ? this.randomElement(this.ERROR_MESSAGES) : undefined,
        };

      case AnalyticsEventType.TOUCH_INTERACTION:
        return {
          interactionType: this.randomElement(['tap', 'double_tap', 'swipe', 'drag', 'long_press'] as TouchInteractionType),
          target: this.randomElement(['play_button', 'progress_bar', 'volume_control', 'speed_control', 'upload_area', 'file_item'] as TouchTarget),
          position: { x: Math.random() * 375, y: Math.random() * 812 },
          pressure: Math.random(),
          duration: Math.random() * 2000 + 100,
          success: !shouldError,
          errorMessage: shouldError ? this.randomElement(this.ERROR_MESSAGES) : undefined,
        };

      case AnalyticsEventType.PERFORMANCE_METRIC:
        return {
          name: this.randomElement(['transcription_speed', 'memory_usage', 'network_latency', 'rendering_time']),
          value: Math.random() * 1000,
          unit: this.randomElement(['ms', 'MB', 'fps', '%']),
          tags: {
            device_type: this.randomElement(['mobile', 'tablet']),
            network_type: this.randomElement(['wifi', 'cellular']),
          },
        };

      case AnalyticsEventType.ERROR_OCCURRED:
        return {
          name: this.randomElement(['TranscriptionError', 'NetworkError', 'ValidationError', 'MemoryError']),
          message: this.randomElement(this.ERROR_MESSAGES),
          stack: `Error: ${this.randomElement(this.ERROR_MESSAGES)}\n    at Object.process (app.js:${Math.floor(Math.random() * 1000)}:${Math.floor(Math.random() * 100)})`,
          context: {
            component: this.randomElement(['AudioPlayer', 'TranscriptionService', 'FileUploader']),
            action: this.randomElement(['play', 'upload', 'transcribe']),
          },
        };

      default:
        return {
          timestamp: new Date(),
          data: `Mock data for ${eventType}`,
        };
    }
  }

  /**
   * Generate a random element from an array
   */
  private static randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate a random event ID
   */
  private static generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a random session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a random user ID
   */
  private static generateUserId(): string {
    return `user_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Runs analytics test scenarios
 */
export class AnalyticsTestRunner {
  private config: MobileAnalyticsConfig;
  private debugConfig: DebugConfig;
  private results: TestResult[] = [];
  private isRunning = false;

  constructor(config: MobileAnalyticsConfig, debugConfig: DebugConfig) {
    this.config = config;
    this.debugConfig = debugConfig;
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      scenario: scenario.name,
      success: false,
      duration: 0,
      eventsGenerated: 0,
      eventsTransmitted: 0,
      expectationsPassed: 0,
      expectationsFailed: 0,
      errors: [],
      metrics: {},
    };

    try {
      this.log('debug', `Starting test scenario: ${scenario.name}`);

      // Setup
      if (scenario.setup) {
        await scenario.setup();
      }

      // Generate and send events
      const events: AnalyticsEvent[] = [];
      for (const testEvent of scenario.events) {
        if (testEvent.delay) {
          await this.delay(testEvent.delay);
        }

        const event = this.createTestEvent(testEvent);
        events.push(event);
        result.eventsGenerated++;

        // In a real implementation, this would send to the analytics system
        // For now, just simulate transmission
        if (Math.random() > 0.1) { // 90% success rate
          result.eventsTransmitted++;
        }
      }

      // Check expectations
      for (const expectation of scenario.expectedResults) {
        try {
          const passed = this.checkExpectation(expectation, events);
          if (passed) {
            result.expectationsPassed++;
          } else {
            result.expectationsFailed++;
            result.errors.push(`Failed expectation: ${expectation.type}`);
          }
        } catch (error) {
          result.expectationsFailed++;
          result.errors.push(`Error checking expectation: ${error}`);
        }
      }

      // Calculate metrics
      result.metrics = {
        transmissionRate: result.eventsTransmitted / result.eventsGenerated,
        averageEventSize: this.calculateAverageEventSize(events),
        processingTime: Date.now() - startTime,
      };

      result.success = result.expectationsFailed === 0;

      // Teardown
      if (scenario.teardown) {
        await scenario.teardown();
      }

    } catch (error) {
      result.errors.push(`Test execution error: ${error}`);
      this.log('error', `Test scenario failed: ${scenario.name}`, error);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);

    this.log('debug', `Test scenario completed: ${scenario.name}`, result);
    return result;
  }

  /**
   * Run multiple test scenarios
   */
  async runScenarios(scenarios: TestScenario[]): Promise<TestResult[]> {
    if (this.isRunning) {
      throw new Error('Test runner is already running');
    }

    this.isRunning = true;
    const results: TestResult[] = [];

    try {
      for (const scenario of scenarios) {
        const result = await this.runScenario(scenario);
        results.push(result);
      }
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  /**
   * Get test results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const totalScenarios = this.results.length;
    const successfulScenarios = this.results.filter(r => r.success).length;
    const totalEvents = this.results.reduce((sum, r) => sum + r.eventsGenerated, 0);
    const totalTransmissions = this.results.reduce((sum, r) => sum + r.eventsTransmitted, 0);
    const averageDuration = totalScenarios > 0 ?
      this.results.reduce((sum, r) => sum + r.duration, 0) / totalScenarios : 0;

    let report = `# Analytics Test Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Scenarios: ${totalScenarios}\n`;
    report += `Successful: ${successfulScenarios} (${(successfulScenarios / totalScenarios * 100).toFixed(1)}%)\n`;
    report += `Total Events: ${totalEvents}\n`;
    report += `Total Transmissions: ${totalTransmissions}\n`;
    report += `Transmission Rate: ${totalEvents > 0 ? (totalTransmissions / totalEvents * 100).toFixed(1) : 0}%\n`;
    report += `Average Duration: ${averageDuration.toFixed(0)}ms\n\n`;

    report += `## Scenario Results\n\n`;
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      report += `${status} **${result.scenario}** (${result.duration}ms)\n`;
      report += `  Events: ${result.eventsGenerated} → ${result.eventsTransmitted}\n`;
      report += `  Expectations: ${result.expectationsPassed}/${result.expectationsPassed + result.expectationsFailed}\n`;

      if (result.errors.length > 0) {
        report += `  Errors: ${result.errors.join(', ')}\n`;
      }
      report += '\n';
    });

    return report;
  }

  // Private methods
  private createTestEvent(testEvent: TestEvent): AnalyticsEvent {
    return {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: testEvent.type,
      timestamp: testEvent.timestamp || new Date(),
      sessionId: `test_session_${Date.now()}`,
      userId: `test_user_${Math.random().toString(36).substr(2, 9)}`,
      data: testEvent.data,
      context: MockDataGenerator.generateDeviceContext(['mobile'], ['United States']),
      consent: ConsentLevel.ALL,
      anonymized: false,
    };
  }

  private checkExpectation(expectation: TestExpectation, events: AnalyticsEvent[]): boolean {
    switch (expectation.type) {
      case 'event_count':
        return typeof expectation.condition === 'number' ?
          events.length === expectation.condition :
          this.evaluateCondition(expectation.condition as string, { eventCount: events.length });

      case 'event_type':
        if (typeof expectation.condition === 'string') {
          const typeEvents = events.filter(e => e.type === expectation.condition);
          return typeEvents.length === (expectation.expected || 1);
        }
        return false;

      case 'data_property':
        // Check if events have expected data properties
        return events.some(event => {
          const path = expectation.expected as string;
          const value = this.getNestedProperty(event.data, path);
          return value !== undefined;
        });

      case 'transmission':
        // Check transmission rate
        const transmissionRate = events.length > 0 ?
          events.filter(e => e.id.includes('transmitted')).length / events.length : 0;
        return transmissionRate >= (expectation.expected || 0.8);

      case 'error':
        // Check for expected errors
        return events.some(event =>
          event.type === AnalyticsEventType.ERROR_OCCURRED ||
          (event.data as any)?.error
        );

      default:
        return false;
    }
  }

  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    try {
      // Simple condition evaluation
      // In a real implementation, use a proper expression parser
      const fn = new Function('context', `return ${condition}`);
      return fn(context);
    } catch {
      return false;
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private calculateAverageEventSize(events: AnalyticsEvent[]): number {
    if (events.length === 0) return 0;

    const totalSize = events.reduce((sum, event) => {
      return sum + JSON.stringify(event).length;
    }, 0);

    return totalSize / events.length;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.debugConfig.enabled) return;

    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.debugConfig.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex < currentLevelIndex) return;

    const logMessage = `[AnalyticsTestRunner] ${message}`;

    if (this.debugConfig.consoleOutput) {
      console[level](logMessage, data);
    }
  }
}

// ============================================================================
// DEBUG OVERLAY
// ============================================================================

/**
 * Debug overlay for visual analytics debugging
 */
export class AnalyticsDebugOverlay {
  private config: DebugConfig;
  private overlayElement: HTMLElement | null = null;
  private isVisible = false;
  private metrics: Record<string, any> = {};
  private logEntries: Array<{ timestamp: Date; level: string; message: string; data?: any }> = [];

  constructor(config: DebugConfig) {
    this.config = config;
    this.createOverlay();
    this.setupEventListeners();
  }

  /**
   * Show the debug overlay
   */
  show(): void {
    if (!this.config.showOverlay || !this.overlayElement) return;

    this.overlayElement.style.display = 'block';
    this.isVisible = true;
    this.updateOverlay();
  }

  /**
   * Hide the debug overlay
   */
  hide(): void {
    if (!this.overlayElement) return;

    this.overlayElement.style.display = 'none';
    this.isVisible = false;
  }

  /**
   * Toggle overlay visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Update metrics
   */
  updateMetrics(metrics: Record<string, any>): void {
    this.metrics = { ...this.metrics, ...metrics };

    if (this.isVisible) {
      this.updateOverlay();
    }
  }

  /**
   * Add log entry
   */
  log(level: string, message: string, data?: any): void {
    if (!this.config.enabled) return;

    const entry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.logEntries.push(entry);

    // Keep only recent entries
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
    }

    if (this.isVisible) {
      this.updateOverlay();
    }
  }

  // Private methods
  private createOverlay(): void {
    if (!this.config.showOverlay) return;

    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'umuo-analytics-debug-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      ${this.config.overlayPosition.includes('top') ? 'top: 10px;' : 'bottom: 10px;'}
      ${this.config.overlayPosition.includes('left') ? 'left: 10px;' : 'right: 10px;'}
      width: 300px;
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-family: monospace;
      font-size: 11px;
      padding: 10px;
      border-radius: 5px;
      overflow-y: auto;
      z-index: 9999;
      display: none;
    `;

    document.body.appendChild(this.overlayElement);
  }

  private setupEventListeners(): void {
    // Keyboard shortcut to toggle overlay (Ctrl+Shift+D)
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  private updateOverlay(): void {
    if (!this.overlayElement) return;

    let html = '<div style="color: #4CAF50; font-weight: bold; margin-bottom: 10px;">Analytics Debug</div>';

    // Metrics section
    if (Object.keys(this.metrics).length > 0) {
      html += '<div style="margin-bottom: 10px;"><strong>Metrics:</strong></div>';
      Object.entries(this.metrics).forEach(([key, value]) => {
        html += `<div>${key}: ${JSON.stringify(value)}</div>`;
      });
    }

    // Log entries section
    if (this.logEntries.length > 0) {
      html += '<div style="margin-top: 10px;"><strong>Recent Logs:</strong></div>';
      this.logEntries.slice(-10).forEach(entry => {
        const color = this.getLogLevelColor(entry.level);
        const time = entry.timestamp.toLocaleTimeString();
        html += `<div style="color: ${color};">${time} [${entry.level.toUpperCase()}] ${entry.message}</div>`;
      });
    }

    // Controls
    html += '<div style="margin-top: 10px;">';
    html += '<button onclick="window.analyticsDebugOverlay.clearLogs()" style="margin-right: 5px;">Clear</button>';
    html += '<button onclick="window.analyticsDebugOverlay.exportLogs()">Export</button>';
    html += '</div>';

    this.overlayElement.innerHTML = html;
  }

  private getLogLevelColor(level: string): string {
    switch (level) {
      case 'debug': return '#9E9E9E';
      case 'info': return '#2196F3';
      case 'warn': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#FFFFFF';
    }
  }

  clearLogs(): void {
    this.logEntries = [];
    this.updateOverlay();
  }

  exportLogs(): void {
    const logs = this.logEntries.map(entry => ({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      data: entry.data,
    }));

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-debug-${new Date().toISOString()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// PERFORMANCE BENCHMARKER
// ============================================================================

/**
 * Performance benchmarking for analytics
 */
export class AnalyticsPerformanceBenchmarker {
  private benchmarks: PerformanceBenchmark[] = [];
  private results: Record<string, any[]> = {};

  /**
   * Add a benchmark
   */
  addBenchmark(benchmark: PerformanceBenchmark): void {
    this.benchmarks.push(benchmark);
  }

  /**
   * Run all benchmarks
   */
  async runBenchmarks(): Promise<Record<string, any[]>> {
    const results: Record<string, any[]> = {};

    for (const benchmark of this.benchmarks) {
      console.log(`Running benchmark: ${benchmark.name}`);

      const benchmarkResults: any[] = [];

      // Setup
      if (benchmark.setup) {
        await benchmark.setup();
      }

      // Run iterations
      for (let i = 0; i < benchmark.iterations; i++) {
        const iterationStart = performance.now();

        // Execute benchmark
        if (benchmark.execute) {
          await benchmark.execute();
        }

        const iterationEnd = performance.now();
        const iterationTime = iterationEnd - iterationStart;

        benchmarkResults.push({
          iteration: i + 1,
          duration: iterationTime,
          timestamp: new Date(),
        });
      }

      // Teardown
      if (benchmark.teardown) {
        await benchmark.teardown();
      }

      results[benchmark.name] = benchmarkResults;

      // Calculate statistics
      const durations = benchmarkResults.map(r => r.duration);
      const stats = {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        median: this.median(durations),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
      };

      console.log(`Benchmark ${benchmark.name} completed:`, stats);
    }

    this.results = results;
    return results;
  }

  /**
   * Get benchmark results
   */
  getResults(): Record<string, any[]> {
    return { ...this.results };
  }

  /**
   * Generate benchmark report
   */
  generateReport(): string {
    let report = `# Analytics Performance Benchmarks\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    Object.entries(this.results).forEach(([benchmarkName, results]) => {
      report += `## ${benchmarkName}\n\n`;

      const durations = results.map(r => r.duration);
      const stats = {
        iterations: results.length,
        min: Math.min(...durations).toFixed(2),
        max: Math.max(...durations).toFixed(2),
        avg: (durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(2),
        median: this.median(durations).toFixed(2),
        p95: this.percentile(durations, 95).toFixed(2),
        p99: this.percentile(durations, 99).toFixed(2),
      };

      report += `- Iterations: ${stats.iterations}\n`;
      report += `- Average: ${stats.avg}ms\n`;
      report += `- Median: ${stats.median}ms\n`;
      report += `- Min: ${stats.min}ms\n`;
      report += `- Max: ${stats.max}ms\n`;
      report += `- 95th percentile: ${stats.p95}ms\n`;
      report += `- 99th percentile: ${stats.p99}ms\n\n`;
    });

    return report;
  }

  // Private helper methods
  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ?
      (sorted[mid - 1] + sorted[mid]) / 2 :
      sorted[mid];
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sorted.length) return sorted[sorted.length - 1];

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MockDataGenerator,
  AnalyticsTestRunner,
  AnalyticsDebugOverlay,
  AnalyticsPerformanceBenchmarker,
};

// Make debug overlay available globally for inline event handlers
if (typeof window !== 'undefined') {
  (window as any).analyticsDebugOverlay = new AnalyticsDebugOverlay({
    enabled: true,
    logLevel: 'debug',
    consoleOutput: true,
    visualDebugging: true,
    eventLogging: true,
    performanceLogging: true,
    networkLogging: true,
    memoryLogging: true,
    showOverlay: true,
    overlayPosition: 'bottom-right',
    maxLogEntries: 100,
  });
}
