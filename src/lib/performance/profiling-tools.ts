/**
 * Performance Debugging Utilities and Profiling Tools
 *
 * This module provides comprehensive debugging and profiling tools for the audio player,
 * enabling developers to identify and resolve performance issues efficiently.
 */

import { PlayerPerformanceMonitor } from './player-performance';
import type { PlayerPerformanceMetric, InteractionMetrics } from './player-performance';

export interface ProfileSession {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  metrics: PlayerPerformanceMetric[];
  interactions: InteractionMetrics[];
  screenshots: ProfileScreenshot[];
  memorySnapshots: MemorySnapshot[];
  annotations: ProfileAnnotation[];
  isActive: boolean;
}

export interface ProfileScreenshot {
  timestamp: Date;
  dataUrl: string;
  width: number;
  height: number;
  description?: string;
}

export interface MemorySnapshot {
  timestamp: Date;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  domNodes: number;
  eventListeners: number;
  audioBuffers: number;
  imageCache: number;
}

export interface ProfileAnnotation {
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'marker';
  message: string;
  details?: Record<string, any>;
  stackTrace?: string;
}

export interface PerformanceIssue {
  id: string;
  type: 'slow_interaction' | 'memory_leak' | 'rendering_bottleneck' | 'audio_glitch' | 'network_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  affectedMetrics: string[];
  suggestedFixes: string[];
  relatedCode?: {
    file: string;
    line: number;
    function: string;
  };
}

export interface FlameGraphData {
  name: string;
  value: number;
  children: FlameGraphData[];
}

export interface CallTreeData {
  function: string;
  file: string;
  line: number;
  totalTime: number;
  selfTime: number;
  calls: number;
  children: CallTreeData[];
}

/**
 * Performance Profiler
 *
 * Comprehensive profiling tool for deep performance analysis
 */
export class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private sessions: Map<string, ProfileSession> = new Map();
  private activeSessionId: string | null = null;
  private performanceMonitor: PlayerPerformanceMonitor;
  private samplingInterval: NodeJS.Timeout | null = null;
  private screenshotInterval: NodeJS.Timeout | null = null;
  private memoryInterval: NodeJS.Timeout | null = null;
  private isProfiling: boolean = false;
  private observers: PerformanceObserver[] = [];

  // Configuration
  private readonly SAMPLING_RATE = 100; // ms
  private readonly SCREENSHOT_INTERVAL = 2000; // ms
  private readonly MEMORY_INTERVAL = 1000; // ms
  private readonly MAX_SESSIONS = 10;

  static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  private constructor() {
    this.performanceMonitor = PlayerPerformanceMonitor.getInstance();
  }

  /**
   * Start a new profiling session
   */
  startProfiling(name: string, options: {
    enableScreenshots?: boolean;
    enableMemorySampling?: boolean;
    maxDuration?: number;
  } = {}): string {
    if (this.isProfiling) {
      console.warn('Profiling already in progress');
      return this.activeSessionId!;
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: ProfileSession = {
      id: sessionId,
      name,
      startTime: new Date(),
      metrics: [],
      interactions: [],
      screenshots: [],
      memorySnapshots: [],
      annotations: [],
      isActive: true
    };

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;
    this.isProfiling = true;

    // Start sampling
    this.startSampling();

    // Start screenshot capture if enabled
    if (options.enableScreenshots) {
      this.startScreenshotCapture();
    }

    // Start memory sampling if enabled
    if (options.enableMemorySampling) {
      this.startMemorySampling();
    }

    // Set maximum duration if specified
    if (options.maxDuration) {
      setTimeout(() => {
        this.stopProfiling(sessionId);
      }, options.maxDuration);
    }

    console.log(`Started profiling session: ${sessionId} (${name})`);
    return sessionId;
  }

  /**
   * Stop a profiling session
   */
  stopProfiling(sessionId?: string): ProfileSession | null {
    const id = sessionId || this.activeSessionId;
    if (!id) {
      console.warn('No active profiling session');
      return null;
    }

    const session = this.sessions.get(id);
    if (!session) {
      console.warn(`Session not found: ${id}`);
      return null;
    }

    session.endTime = new Date();
    session.isActive = false;
    session.duration = session.endTime.getTime() - session.startTime.getTime();

    // Stop sampling
    this.stopSampling();

    // Clear active session
    if (this.activeSessionId === id) {
      this.activeSessionId = null;
      this.isProfiling = false;
    }

    console.log(`Stopped profiling session: ${id} (duration: ${session.duration}ms)`);
    return session;
  }

  /**
   * Add annotation to current session
   */
  addAnnotation(
    type: ProfileAnnotation['type'],
    message: string,
    details?: Record<string, any>
  ): void {
    if (!this.activeSessionId) return;

    const session = this.sessions.get(this.activeSessionId);
    if (!session) return;

    const annotation: ProfileAnnotation = {
      timestamp: new Date(),
      type,
      message,
      details,
      stackTrace: new Error().stack
    };

    session.annotations.push(annotation);
  }

  /**
   * Add interaction metric to current session
   */
  addInteraction(interaction: InteractionMetrics): void {
    if (!this.activeSessionId) return;

    const session = this.sessions.get(this.activeSessionId);
    if (!session) return;

    session.interactions.push(interaction);
  }

  /**
   * Get profiling session
   */
  getSession(sessionId: string): ProfileSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all profiling sessions
   */
  getAllSessions(): ProfileSession[] {
    return Array.from(this.sessions.values()).sort((a, b) =>
      b.startTime.getTime() - a.startTime.getTime()
    );
  }

  /**
   * Delete a profiling session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear();
    this.activeSessionId = null;
    this.isProfiling = false;
    this.stopSampling();
  }

  /**
   * Analyze session for performance issues
   */
  analyzeSession(sessionId: string): PerformanceIssue[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const issues: PerformanceIssue[] = [];

    // Analyze interaction response times
    const slowInteractions = session.interactions.filter(i => i.responseTime > 200);
    if (slowInteractions.length > 0) {
      issues.push({
        id: `slow_interactions_${sessionId}`,
        type: 'slow_interaction',
        severity: slowInteractions.length > 5 ? 'high' : 'medium',
        title: 'Slow User Interactions Detected',
        description: `Found ${slowInteractions.length} interactions with response time > 200ms`,
        timestamp: new Date(),
        affectedMetrics: ['player_interaction_response_time'],
        suggestedFixes: [
          'Reduce animation complexity',
          'Optimize component rendering',
          'Enable GPU acceleration',
          'Debounce event handlers'
        ]
      });
    }

    // Analyze memory usage
    const memoryGrowth = this.analyzeMemoryGrowth(session);
    if (memoryGrowth.isLeaking) {
      issues.push({
        id: `memory_leak_${sessionId}`,
        type: 'memory_leak',
        severity: memoryGrowth.growthRate > 50 ? 'critical' : 'high',
        title: 'Potential Memory Leak Detected',
        description: `Memory usage grew by ${memoryGrowth.growthRate.toFixed(1)}% during profiling`,
        timestamp: new Date(),
        affectedMetrics: ['memory_usage_current', 'memory_usage_peak'],
        suggestedFixes: [
          'Check for event listener leaks',
          'Clear unused audio buffers',
          'Implement proper cleanup in useEffect',
          'Avoid closures in long-lived components'
        ]
      });
    }

    // Analyze frame drops
    const frameDrops = session.metrics.filter(m =>
      m.name === 'visualizer_drop_frames' && m.value > 0
    );
    if (frameDrops.length > 0) {
      issues.push({
        id: `frame_drops_${sessionId}`,
        type: 'rendering_bottleneck',
        severity: 'medium',
        title: 'Rendering Performance Issues',
        description: `Frame drops detected in ${frameDrops.length} samples`,
        timestamp: new Date(),
        affectedMetrics: ['visualizer_drop_frames', 'visualizer_frame_rate'],
        suggestedFixes: [
          'Reduce visualizer complexity',
          'Lower update rate',
          'Enable GPU acceleration',
          'Implement frame skipping'
        ]
      });
    }

    // Analyze audio issues
    const audioIssues = session.metrics.filter(m =>
      m.name === 'audio_underruns' && m.value > 0
    );
    if (audioIssues.length > 0) {
      issues.push({
        id: `audio_glitches_${sessionId}`,
        type: 'audio_glitch',
        severity: 'high',
        title: 'Audio Rendering Issues',
        description: `Audio underruns detected in ${audioIssues.length} samples`,
        timestamp: new Date(),
        affectedMetrics: ['audio_underruns', 'audio_rendering_latency'],
        suggestedFixes: [
          'Increase audio buffer size',
          'Enable audio context optimization',
          'Reduce audio processing overhead',
          'Use Web Workers for audio processing'
        ]
      });
    }

    return issues;
  }

  /**
   * Generate flame graph data
   */
  generateFlameGraph(sessionId: string): FlameGraphData | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Group metrics by category
    const categoryData: Record<string, number> = {};
    for (const metric of session.metrics) {
      const category = metric.category;
      categoryData[category] = (categoryData[category] || 0) + metric.value;
    }

    // Build flame graph structure
    return {
      name: session.name,
      value: session.duration || 0,
      children: Object.entries(categoryData).map(([category, value]) => ({
        name: category,
        value,
        children: session.metrics
          .filter(m => m.category === category)
          .map(m => ({
            name: m.name,
            value: m.value,
            children: []
          }))
      }))
    };
  }

  /**
   * Generate call tree data
   */
  generateCallTree(sessionId: string): CallTreeData | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Analyze interaction stack traces
    const callStacks: Record<string, CallTreeData> = {};

    for (const interaction of session.interactions) {
      if (interaction.coordinates) {
        // Create call tree entry
        const key = `${interaction.type}_${interaction.target}`;
        if (!callStacks[key]) {
          callStacks[key] = {
            function: interaction.type,
            file: 'unknown',
            line: 0,
            totalTime: 0,
            selfTime: 0,
            calls: 0,
            children: []
          };
        }

        callStacks[key].totalTime += interaction.responseTime;
        callStacks[key].calls += 1;
      }
    }

    // Return root call tree
    return {
      function: 'root',
      file: 'root',
      line: 0,
      totalTime: session.duration || 0,
      selfTime: 0,
      calls: 1,
      children: Object.values(callStacks)
    };
  }

  /**
   * Export session data
   */
  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const exportData = {
      session,
      issues: this.analyzeSession(sessionId),
      flameGraph: this.generateFlameGraph(sessionId),
      callTree: this.generateCallTree(sessionId),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopSampling();
    this.sessions.clear();
    this.activeSessionId = null;
    this.isProfiling = false;
  }

  // ==================== Private Methods ====================

  /**
   * Start performance sampling
   */
  private startSampling(): void {
    this.samplingInterval = setInterval(() => {
      this.collectPerformanceSample();
    }, this.SAMPLING_RATE);
  }

  /**
   * Stop performance sampling
   */
  private stopSampling(): void {
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = null;
    }

    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }

    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
  }

  /**
   * Collect performance sample
   */
  private collectPerformanceSample(): void {
    if (!this.activeSessionId) return;

    const session = this.sessions.get(this.activeSessionId);
    if (!session) return;

    // Collect current performance metrics
    const metrics = this.performanceMonitor.getMetrics();

    // Add to session
    session.metrics.push(...metrics.map(m => ({
      ...m,
      timestamp: new Date()
    })));
  }

  /**
   * Start screenshot capture
   */
  private startScreenshotCapture(): void {
    this.screenshotInterval = setInterval(() => {
      this.captureScreenshot();
    }, this.SCREENSHOT_INTERVAL);
  }

  /**
   * Capture screenshot
   */
  private async captureScreenshot(): Promise<void> {
    if (!this.activeSessionId || typeof document === 'undefined') return;

    const session = this.sessions.get(this.activeSessionId);
    if (!session) return;

    try {
      // Use Screen Capture API if available
      if ('getDisplayMedia' in navigator) {
        const stream = await navigator.getDisplayMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');

          session.screenshots.push({
            timestamp: new Date(),
            dataUrl,
            width: canvas.width,
            height: canvas.height
          });
        }

        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.warn('Screenshot capture failed:', error);
    }
  }

  /**
   * Start memory sampling
   */
  private startMemorySampling(): void {
    this.memoryInterval = setInterval(() => {
      this.collectMemorySnapshot();
    }, this.MEMORY_INTERVAL);
  }

  /**
   * Collect memory snapshot
   */
  private collectMemorySnapshot(): void {
    if (!this.activeSessionId || typeof window === 'undefined') return;

    const session = this.sessions.get(this.activeSessionId);
    if (!session) return;

    const memoryInfo = (window as any).performance?.memory;

    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      usedJSHeapSize: memoryInfo ? memoryInfo.usedJSHeapSize / (1024 * 1024) : 0,
      totalJSHeapSize: memoryInfo ? memoryInfo.totalJSHeapSize / (1024 * 1024) : 0,
      jsHeapSizeLimit: memoryInfo ? memoryInfo.jsHeapSizeLimit / (1024 * 1024) : 0,
      domNodes: document.querySelectorAll('*').length,
      eventListeners: this.estimateEventListeners(),
      audioBuffers: 0, // Would need to track this elsewhere
      imageCache: 0 // Would need to track this elsewhere
    };

    session.memorySnapshots.push(snapshot);
  }

  /**
   * Estimate number of event listeners
   */
  private estimateEventListeners(): number {
    if (typeof document === 'undefined') return 0;

    let count = 0;
    const elements = document.querySelectorAll('*');

    for (const element of elements) {
      // This is a rough estimation
      if ((element as any)._eventListeners) {
        count += Object.keys((element as any)._eventListeners).length;
      }
    }

    return count;
  }

  /**
   * Analyze memory growth
   */
  private analyzeMemoryGrowth(session: ProfileSession): { isLeaking: boolean; growthRate: number } {
    if (session.memorySnapshots.length < 2) {
      return { isLeaking: false, growthRate: 0 };
    }

    const first = session.memorySnapshots[0];
    const last = session.memorySnapshots[session.memorySnapshots.length - 1];

    const growthRate = ((last.usedJSHeapSize - first.usedJSHeapSize) / first.usedJSHeapSize) * 100;

    return {
      isLeaking: growthRate > 20, // 20% growth threshold
      growthRate
    };
  }
}

/**
 * Performance Issue Detector
 *
 * Automatically detects and reports performance issues
 */
export class PerformanceIssueDetector {
  private static instance: PerformanceIssueDetector;
  private issues: PerformanceIssue[] = [];
  private thresholds: Map<string, number> = new Map();
  private performanceMonitor: PlayerPerformanceMonitor;

  static getInstance(): PerformanceIssueDetector {
    if (!PerformanceIssueDetector.instance) {
      PerformanceIssueDetector.instance = new PerformanceIssueDetector();
    }
    return PerformanceIssueDetector.instance;
  }

  private constructor() {
    this.performanceMonitor = PlayerPerformanceMonitor.getInstance();
    this.initializeThresholds();
    this.startDetection();
  }

  /**
   * Initialize detection thresholds
   */
  private initializeThresholds(): void {
    this.thresholds.set('interaction_response_time', 200); // ms
    this.thresholds.set('memory_usage_growth', 50); // percentage
    this.thresholds.set('frame_drop_rate', 0.1); // 10%
    this.thresholds.set('audio_underrun_rate', 0.01); // 1%
  }

  /**
   * Start automatic detection
   */
  private startDetection(): void {
    setInterval(() => {
      this.detectIssues();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Detect performance issues
   */
  private detectIssues(): void {
    const metrics = this.performanceMonitor.getMetrics();

    // Check for slow interactions
    this.checkSlowInteractions(metrics);

    // Check for memory issues
    this.checkMemoryIssues(metrics);

    // Check for rendering issues
    this.checkRenderingIssues(metrics);

    // Check for audio issues
    this.checkAudioIssues(metrics);
  }

  /**
   * Check for slow interactions
   */
  private checkSlowInteractions(metrics: PlayerPerformanceMetric[]): void {
    const interactionMetrics = metrics.filter(m =>
      m.name === 'player_interaction_response_time' &&
      m.value > this.thresholds.get('interaction_response_time')!
    );

    if (interactionMetrics.length > 0) {
      const issue: PerformanceIssue = {
        id: `slow_interaction_${Date.now()}`,
        type: 'slow_interaction',
        severity: 'medium',
        title: 'Slow User Interaction Detected',
        description: `Interaction took ${interactionMetrics[0].value}ms (threshold: ${this.thresholds.get('interaction_response_time')}ms)`,
        timestamp: new Date(),
        affectedMetrics: ['player_interaction_response_time'],
        suggestedFixes: [
          'Reduce animation complexity',
          'Optimize component rendering',
          'Enable GPU acceleration'
        ]
      };

      this.addIssue(issue);
    }
  }

  /**
   * Check for memory issues
   */
  private checkMemoryIssues(metrics: PlayerPerformanceMetric[]): void {
    const memoryMetrics = metrics.filter(m => m.name === 'memory_usage_current');

    if (memoryMetrics.length >= 2) {
      const recent = memoryMetrics.slice(-5); // Last 5 samples
      const growth = this.calculateGrowthRate(recent);

      if (growth > this.thresholds.get('memory_usage_growth')!) {
        const issue: PerformanceIssue = {
          id: `memory_growth_${Date.now()}`,
          type: 'memory_leak',
          severity: 'high',
          title: 'Memory Usage Growing Rapidly',
          description: `Memory usage grew by ${growth.toFixed(1)}% in recent samples`,
          timestamp: new Date(),
          affectedMetrics: ['memory_usage_current'],
          suggestedFixes: [
            'Check for memory leaks',
            'Clear unused caches',
            'Implement proper cleanup'
          ]
        };

        this.addIssue(issue);
      }
    }
  }

  /**
   * Check for rendering issues
   */
  private checkRenderingIssues(metrics: PlayerPerformanceMetric[]): void {
    const frameMetrics = metrics.filter(m => m.name === 'visualizer_drop_frames');

    if (frameMetrics.length > 0) {
      const totalDrops = frameMetrics.reduce((sum, m) => sum + m.value, 0);
      const totalFrames = frameMetrics.length * 60; // Assuming 60 FPS

      const dropRate = totalDrops / totalFrames;

      if (dropRate > this.thresholds.get('frame_drop_rate')!) {
        const issue: PerformanceIssue = {
          id: `frame_drops_${Date.now()}`,
          type: 'rendering_bottleneck',
          severity: 'medium',
          title: 'High Frame Drop Rate',
          description: `Frame drop rate: ${(dropRate * 100).toFixed(1)}%`,
          timestamp: new Date(),
          affectedMetrics: ['visualizer_drop_frames'],
          suggestedFixes: [
            'Reduce animation complexity',
            'Lower visualizer quality',
            'Enable GPU acceleration'
          ]
        };

        this.addIssue(issue);
      }
    }
  }

  /**
   * Check for audio issues
   */
  private checkAudioIssues(metrics: PlayerPerformanceMetric[]): void {
    const audioMetrics = metrics.filter(m => m.name === 'audio_underruns');

    if (audioMetrics.length > 0) {
      const totalUnderruns = audioMetrics.reduce((sum, m) => sum + m.value, 0);
      const totalRenderTime = audioMetrics.reduce((sum, m) => sum + 1, 0);

      const underrunRate = totalUnderruns / totalRenderTime;

      if (underrunRate > this.thresholds.get('audio_underrun_rate')!) {
        const issue: PerformanceIssue = {
          id: `audio_underruns_${Date.now()}`,
          type: 'audio_glitch',
          severity: 'high',
          title: 'Audio Underruns Detected',
          description: `Audio underrun rate: ${(underrunRate * 100).toFixed(1)}%`,
          timestamp: new Date(),
          affectedMetrics: ['audio_underruns'],
          suggestedFixes: [
            'Increase audio buffer size',
            'Enable audio context optimization',
            'Reduce audio processing overhead'
          ]
        };

        this.addIssue(issue);
      }
    }
  }

  /**
   * Calculate growth rate
   */
  private calculateGrowthRate(values: PlayerPerformanceMetric[]): number {
    if (values.length < 2) return 0;

    const first = values[0].value;
    const last = values[values.length - 1].value;

    return ((last - first) / first) * 100;
  }

  /**
   * Add issue to list
   */
  private addIssue(issue: PerformanceIssue): void {
    // Check if similar issue already exists
    const existingIssue = this.issues.find(i =>
      i.type === issue.type &&
      i.title === issue.title &&
      (Date.now() - i.timestamp.getTime()) < 30000 // Within 30 seconds
    );

    if (!existingIssue) {
      this.issues.push(issue);

      // Keep only recent issues (last 100)
      if (this.issues.length > 100) {
        this.issues = this.issues.slice(-100);
      }

      console.warn('Performance issue detected:', issue);
    }
  }

  /**
   * Get all detected issues
   */
  getIssues(): PerformanceIssue[] {
    return this.issues.slice().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear all issues
   */
  clearIssues(): void {
    this.issues = [];
  }
}

// Export singleton instances
export const performanceProfiler = PerformanceProfiler.getInstance();
export const performanceIssueDetector = PerformanceIssueDetector.getInstance();
