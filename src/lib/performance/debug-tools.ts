/**
 * Performance Debugging Utilities and Profiling Tools
 *
 * This module provides comprehensive debugging and profiling utilities
 * for identifying and resolving performance issues in the audio player.
 */

import { PlayerPerformanceMonitor } from './player-performance';

export interface ProfilerConfig {
  enableCPUProfiling: boolean;
  enableMemoryProfiling: boolean;
  enableNetworkProfiling: boolean;
  enableRenderingProfiling: boolean;
  maxProfileDuration: number; // milliseconds
  sampleInterval: number; // milliseconds
  enableStackTraces: boolean;
  enableFlameGraph: boolean;
}

export interface ProfileData {
  id: string;
  timestamp: Date;
  duration: number;
  type: 'cpu' | 'memory' | 'network' | 'rendering';
  samples: ProfileSample[];
  summary: ProfileSummary;
  metadata: Record<string, any>;
}

export interface ProfileSample {
  timestamp: number;
  stack: StackFrame[];
  memory?: MemoryInfo;
  network?: NetworkInfo;
  rendering?: RenderingInfo;
  custom?: Record<string, any>;
}

export interface StackFrame {
  name: string;
  file?: string;
  line?: number;
  column?: number;
  category: 'user' | 'system' | 'library';
  duration?: number;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  allocated: number;
  deallocated: number;
}

export interface NetworkInfo {
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  type: string;
}

export interface RenderingInfo {
  fps: number;
  frameTime: number;
  paintTime: number;
  layoutTime: number;
  compositeTime: number;
}

export interface ProfileSummary {
  totalSamples: number;
  totalDuration: number;
  averageSampleTime: number;
  peakMemoryUsage: number;
  memoryGrowthRate: number;
  slowestFrame: number;
  fastestFrame: number;
  averageFPS: number;
  networkRequests: number;
  totalNetworkTime: number;
}

export interface PerformanceIssue {
  id: string;
  type: 'memory_leak' | 'slow_frame' | 'network_bottleneck' | 'cpu_bound' | 'rendering_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence: Evidence[];
  recommendation: string;
  stackTrace?: StackFrame[];
  metadata: Record<string, any>;
}

export interface Evidence {
  type: 'metric' | 'timeline' | 'pattern' | 'comparison';
  data: any;
  description: string;
}

/**
 * Performance Profiler
 *
 * Provides advanced profiling capabilities for performance analysis
 */
export class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private config: ProfilerConfig;
  private performanceMonitor: PlayerPerformanceMonitor;
  private activeProfiles: Map<string, ProfileData> = new Map();
  private profileTimers: Map<string, NodeJS.Timeout> = new Map();
  private samplingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, (() => void)[]> = new Map();
  private baseMemoryUsage: number = 0;
  private lastNetworkRequests: NetworkInfo[] = [];
  private frameMetrics: RenderingInfo[] = [];

  // Default configuration
  private readonly DEFAULT_CONFIG: ProfilerConfig = {
    enableCPUProfiling: true,
    enableMemoryProfiling: true,
    enableNetworkProfiling: true,
    enableRenderingProfiling: true,
    maxProfileDuration: 60000, // 1 minute
    sampleInterval: 100, // 100ms
    enableStackTraces: true,
    enableFlameGraph: false
  };

  static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  private constructor() {
    this.config = { ...this.DEFAULT_CONFIG };
    this.performanceMonitor = PlayerPerformanceMonitor.getInstance();
    this.setupGlobalListeners();
  }

  /**
   * Start a new profiling session
   */
  startProfile(
    type: ProfileData['type'],
    duration?: number,
    metadata?: Record<string, any>
  ): string {
    const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const profileDuration = duration || this.config.maxProfileDuration;

    const profile: ProfileData = {
      id: profileId,
      timestamp: new Date(),
      duration: 0,
      type,
      samples: [],
      summary: {
        totalSamples: 0,
        totalDuration: 0,
        averageSampleTime: 0,
        peakMemoryUsage: 0,
        memoryGrowthRate: 0,
        slowestFrame: 0,
        fastestFrame: Infinity,
        averageFPS: 0,
        networkRequests: 0,
        totalNetworkTime: 0
      },
      metadata: metadata || {}
    };

    this.activeProfiles.set(profileId, profile);

    // Start sampling
    this.startSampling(profileId);

    // Set up automatic stop
    const stopTimer = setTimeout(() => {
      this.stopProfile(profileId);
    }, profileDuration);

    this.profileTimers.set(profileId, stopTimer);

    // Record base memory usage
    if (this.config.enableMemoryProfiling) {
      this.baseMemoryUsage = this.getCurrentMemoryUsage();
    }

    console.log(`Started ${type} profiling: ${profileId}`);
    return profileId;
  }

  /**
   * Stop a profiling session
   */
  stopProfile(profileId: string): ProfileData | null {
    const profile = this.activeProfiles.get(profileId);
    if (!profile) {
      console.warn(`Profile not found: ${profileId}`);
      return null;
    }

    // Clean up timers
    const stopTimer = this.profileTimers.get(profileId);
    if (stopTimer) {
      clearTimeout(stopTimer);
      this.profileTimers.delete(profileId);
    }

    const samplingInterval = this.samplingIntervals.get(profileId);
    if (samplingInterval) {
      clearInterval(samplingInterval);
      this.samplingIntervals.delete(profileId);
    }

    // Calculate final duration and summary
    profile.duration = Date.now() - profile.timestamp.getTime();
    profile.summary = this.calculateProfileSummary(profile);

    // Move from active to completed
    this.activeProfiles.delete(profileId);

    console.log(`Stopped profiling: ${profileId}, duration: ${profile.duration}ms`);
    return profile;
  }

  /**
   * Get all active profiles
   */
  getActiveProfiles(): ProfileData[] {
    return Array.from(this.activeProfiles.values());
  }

  /**
   * Analyze performance issues from profile data
   */
  analyzePerformanceIssues(profile: ProfileData): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Analyze memory issues
    if (this.config.enableMemoryProfiling) {
      const memoryIssues = this.analyzeMemoryIssues(profile);
      issues.push(...memoryIssues);
    }

    // Analyze rendering issues
    if (this.config.enableRenderingProfiling) {
      const renderingIssues = this.analyzeRenderingIssues(profile);
      issues.push(...renderingIssues);
    }

    // Analyze network issues
    if (this.config.enableNetworkProfiling) {
      const networkIssues = this.analyzeNetworkIssues(profile);
      issues.push(...networkIssues);
    }

    // Analyze CPU issues
    if (this.config.enableCPUProfiling) {
      const cpuIssues = this.analyzeCPUIssues(profile);
      issues.push(...cpuIssues);
    }

    return issues.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate a performance report
   */
  generatePerformanceReport(profileId: string): {
    profile: ProfileData;
    issues: PerformanceIssue[];
    recommendations: string[];
  } | null {
    const profile = this.activeProfiles.get(profileId);
    if (!profile) return null;

    const issues = this.analyzePerformanceIssues(profile);
    const recommendations = this.generateRecommendations(issues);

    return {
      profile,
      issues,
      recommendations
    };
  }

  /**
   * Update profiler configuration
   */
  updateConfig(newConfig: Partial<ProfilerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.setupGlobalListeners();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Stop all active profiles
    for (const profileId of Array.from(this.activeProfiles.keys())) {
      this.stopProfile(profileId);
    }

    // Clear all timers
    for (const timer of this.profileTimers.values()) {
      clearTimeout(timer);
    }
    this.profileTimers.clear();

    for (const interval of this.samplingIntervals.values()) {
      clearInterval(interval);
    }
    this.samplingIntervals.clear();

    // Remove all event listeners
    for (const listeners of this.eventListeners.values()) {
      listeners.forEach(listener => listener());
    }
    this.eventListeners.clear();

    console.log('Performance profiler cleaned up');
  }

  // ==================== Private Methods ====================

  /**
   * Setup global event listeners
   */
  private setupGlobalListeners(): void {
    if (typeof window === 'undefined') return;

    // Network request monitoring
    if (this.config.enableNetworkProfiling) {
      this.setupNetworkMonitoring();
    }

    // Rendering performance monitoring
    if (this.config.enableRenderingProfiling) {
      this.setupRenderingMonitoring();
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (typeof window === 'undefined' || !window.XMLHttpRequest) return;

    // Override XMLHttpRequest to monitor requests
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      this._startTime = performance.now();
      this._method = method;
      this._url = url.toString();
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(...args: any[]) {
      const xhr = this;

      const originalOnLoad = xhr.onload;
      xhr.onload = function() {
        const duration = performance.now() - (xhr as any)._startTime;

        const networkInfo: NetworkInfo = {
          url: (xhr as any)._url,
          method: (xhr as any)._method,
          status: xhr.status,
          duration,
          size: xhr.responseText.length,
          type: 'xhr'
        };

        // Store network info for profiling
        if (window.performance && window.performance.getEntriesByType) {
          PerformanceProfiler.getInstance().lastNetworkRequests.push(networkInfo);
        }

        if (originalOnLoad) {
          originalOnLoad.apply(this, arguments);
        }
      };

      return originalXHRSend.apply(this, args);
    };
  }

  /**
   * Setup rendering monitoring
   */
  private setupRenderingMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor frame rate using requestAnimationFrame
    let lastFrameTime = performance.now();
    let frameCount = 0;

    const monitorFrame = (currentTime: number) => {
      const frameTime = currentTime - lastFrameTime;
      const fps = 1000 / frameTime;

      this.frameMetrics.push({
        fps,
        frameTime,
        paintTime: 0, // Would need more advanced monitoring
        layoutTime: 0,
        compositeTime: 0
      });

      // Keep only recent frames
      if (this.frameMetrics.length > 100) {
        this.frameMetrics = this.frameMetrics.slice(-100);
      }

      lastFrameTime = currentTime;
      frameCount++;

      requestAnimationFrame(monitorFrame);
    };

    requestAnimationFrame(monitorFrame);
  }

  /**
   * Start sampling for a profile
   */
  private startSampling(profileId: string): void {
    const interval = setInterval(() => {
      const profile = this.activeProfiles.get(profileId);
      if (!profile) {
        clearInterval(interval);
        return;
      }

      const sample = this.createSample();
      profile.samples.push(sample);
    }, this.config.sampleInterval);

    this.samplingIntervals.set(profileId, interval);
  }

  /**
   * Create a performance sample
   */
  private createSample(): ProfileSample {
    const sample: ProfileSample = {
      timestamp: performance.now(),
      stack: this.config.enableStackTraces ? this.captureStackTrace() : []
    };

    // Add memory info
    if (this.config.enableMemoryProfiling) {
      sample.memory = this.captureMemoryInfo();
    }

    // Add network info
    if (this.config.enableNetworkProfiling) {
      sample.network = this.captureNetworkInfo();
    }

    // Add rendering info
    if (this.config.enableRenderingProfiling) {
      sample.rendering = this.captureRenderingInfo();
    }

    return sample;
  }

  /**
   * Capture stack trace
   */
  private captureStackTrace(): StackFrame[] {
    const stack = new Error().stack;
    if (!stack) return [];

    const lines = stack.split('\n').slice(2); // Skip Error and captureStackTrace
    const frames: StackFrame[] = [];

    for (const line of lines) {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        frames.push({
          name: match[1],
          file: match[2],
          line: parseInt(match[3]),
          column: parseInt(match[4]),
          category: this.categorizeFrame(match[1], match[2])
        });
      }
    }

    return frames;
  }

  /**
   * Categorize a stack frame
   */
  private categorizeFrame(functionName: string, fileName: string): StackFrame['category'] {
    if (fileName.includes('node_modules') || fileName.includes('vendor')) {
      return 'library';
    }
    if (fileName.includes('native') || functionName.includes('native')) {
      return 'system';
    }
    return 'user';
  }

  /**
   * Capture memory information
   */
  private captureMemoryInfo(): MemoryInfo | undefined {
    if (typeof window === 'undefined' || !(window as any).performance?.memory) {
      return undefined;
    }

    const memory = (window as any).performance.memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      allocated: 0, // Would need custom tracking
      deallocated: 0 // Would need custom tracking
    };
  }

  /**
   * Capture network information
   */
  private captureNetworkInfo(): NetworkInfo | undefined {
    if (this.lastNetworkRequests.length === 0) {
      return undefined;
    }

    // Return the most recent network request
    return this.lastNetworkRequests[this.lastNetworkRequests.length - 1];
  }

  /**
   * Capture rendering information
   */
  private captureRenderingInfo(): RenderingInfo | undefined {
    if (this.frameMetrics.length === 0) {
      return undefined;
    }

    // Return the most recent frame metric
    return this.frameMetrics[this.frameMetrics.length - 1];
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof window === 'undefined' || !(window as any).performance?.memory) {
      return 0;
    }

    return (window as any).performance.memory.usedJSHeapSize;
  }

  /**
   * Calculate profile summary
   */
  private calculateProfileSummary(profile: ProfileData): ProfileSummary {
    const summary = { ...profile.summary };

    summary.totalSamples = profile.samples.length;
    summary.totalDuration = profile.duration;

    if (profile.samples.length > 0) {
      summary.averageSampleTime = profile.duration / profile.samples.length;

      // Memory analysis
      const memorySamples = profile.samples
        .filter(s => s.memory)
        .map(s => s.memory!);

      if (memorySamples.length > 0) {
        summary.peakMemoryUsage = Math.max(...memorySamples.map(m => m.usedJSHeapSize));

        if (memorySamples.length > 1) {
          const firstSample = memorySamples[0];
          const lastSample = memorySamples[memorySamples.length - 1];
          const memoryGrowth = lastSample.usedJSHeapSize - firstSample.usedJSHeapSize;
          summary.memoryGrowthRate = memoryGrowth / profile.duration * 1000; // bytes per second
        }
      }

      // Rendering analysis
      const renderingSamples = profile.samples
        .filter(s => s.rendering)
        .map(s => s.rendering!);

      if (renderingSamples.length > 0) {
        const frameTimes = renderingSamples.map(r => r.frameTime);
        summary.slowestFrame = Math.max(...frameTimes);
        summary.fastestFrame = Math.min(...frameTimes);
        summary.averageFPS = renderingSamples.reduce((sum, r) => sum + r.fps, 0) / renderingSamples.length;
      }

      // Network analysis
      const networkSamples = profile.samples
        .filter(s => s.network)
        .map(s => s.network!);

      if (networkSamples.length > 0) {
        summary.networkRequests = networkSamples.length;
        summary.totalNetworkTime = networkSamples.reduce((sum, n) => sum + n.duration, 0);
      }
    }

    return summary;
  }

  /**
   * Analyze memory issues
   */
  private analyzeMemoryIssues(profile: ProfileData): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const memorySamples = profile.samples
      .filter(s => s.memory)
      .map(s => s.memory!);

    if (memorySamples.length < 2) return issues;

    const initialMemory = memorySamples[0].usedJSHeapSize;
    const finalMemory = memorySamples[memorySamples.length - 1].usedJSHeapSize;
    const memoryGrowth = finalMemory - initialMemory;
    const peakMemory = Math.max(...memorySamples.map(m => m.usedJSHeapSize));

    // Check for memory leaks
    if (memoryGrowth > 50 * 1024 * 1024) { // 50MB growth
      issues.push({
        id: `memory_leak_${Date.now()}`,
        type: 'memory_leak',
        severity: memoryGrowth > 100 * 1024 * 1024 ? 'high' : 'medium',
        title: 'Potential Memory Leak Detected',
        description: `Memory grew by ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB during profiling`,
        evidence: [
          {
            type: 'metric',
            data: { initialMemory, finalMemory, memoryGrowth },
            description: `Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB`
          }
        ],
        recommendation: 'Check for event listener leaks, unclosed timers, or large object allocations'
      });
    }

    // Check for high memory usage
    if (peakMemory > 200 * 1024 * 1024) { // 200MB
      issues.push({
        id: `high_memory_${Date.now()}`,
        type: 'memory_leak',
        severity: peakMemory > 400 * 1024 * 1024 ? 'critical' : 'high',
        title: 'High Memory Usage',
        description: `Peak memory usage reached ${(peakMemory / 1024 / 1024).toFixed(1)}MB`,
        evidence: [
          {
            type: 'metric',
            data: { peakMemory },
            description: `Peak memory: ${(peakMemory / 1024 / 1024).toFixed(1)}MB`
          }
        ],
        recommendation: 'Consider implementing memory pooling, reducing cache sizes, or optimizing data structures'
      });
    }

    return issues;
  }

  /**
   * Analyze rendering issues
   */
  private analyzeRenderingIssues(profile: ProfileData): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const renderingSamples = profile.samples
      .filter(s => s.rendering)
      .map(s => s.rendering!);

    if (renderingSamples.length === 0) return issues;

    const frameTimes = renderingSamples.map(r => r.frameTime);
    const slowFrames = frameTimes.filter(t => t > 16.67); // Below 60 FPS
    const verySlowFrames = frameTimes.filter(t => t > 33.33); // Below 30 FPS

    // Check for slow frames
    if (verySlowFrames.length > renderingSamples.length * 0.1) { // More than 10% very slow
      issues.push({
        id: `slow_frames_${Date.now()}`,
        type: 'slow_frame',
        severity: verySlowFrames.length > renderingSamples.length * 0.3 ? 'critical' : 'high',
        title: 'Excessive Slow Frames',
        description: `${verySlowFrames.length} frames took longer than 33ms (${(verySlowFrames.length / renderingSamples.length * 100).toFixed(1)}%)`,
        evidence: [
          {
            type: 'metric',
            data: { slowFrames: slowFrames.length, verySlowFrames: verySlowFrames.length, totalFrames: renderingSamples.length },
            description: `${(verySlowFrames.length / renderingSamples.length * 100).toFixed(1)}% of frames were very slow`
          }
        ],
        recommendation: 'Reduce animation complexity, enable GPU acceleration, or optimize rendering logic'
      });
    }

    // Check for inconsistent frame rate
    const averageFPS = renderingSamples.reduce((sum, r) => sum + r.fps, 0) / renderingSamples.length;
    const fpsVariance = this.calculateVariance(renderingSamples.map(r => r.fps));

    if (fpsVariance > averageFPS * 0.3) { // High variance
      issues.push({
        id: `inconsistent_fps_${Date.now()}`,
        type: 'rendering_issue',
        severity: 'medium',
        title: 'Inconsistent Frame Rate',
        description: `Frame rate variance is high (${fpsVariance.toFixed(1)} FPS)`,
        evidence: [
          {
            type: 'metric',
            data: { averageFPS, fpsVariance },
            description: `FPS variance: ${fpsVariance.toFixed(1)}`
          }
        ],
        recommendation: 'Implement frame rate limiting or use adaptive quality settings'
      });
    }

    return issues;
  }

  /**
   * Analyze network issues
   */
  private analyzeNetworkIssues(profile: ProfileData): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const networkSamples = profile.samples
      .filter(s => s.network)
      .map(s => s.network!);

    if (networkSamples.length === 0) return issues;

    const slowRequests = networkSamples.filter(n => n.duration > 2000); // > 2 seconds
    const failedRequests = networkSamples.filter(n => n.status >= 400);

    // Check for slow network requests
    if (slowRequests.length > 0) {
      issues.push({
        id: `slow_network_${Date.now()}`,
        type: 'network_bottleneck',
        severity: slowRequests.length > networkSamples.length * 0.3 ? 'high' : 'medium',
        title: 'Slow Network Requests',
        description: `${slowRequests.length} requests took longer than 2 seconds`,
        evidence: [
          {
            type: 'metric',
            data: { slowRequests: slowRequests.length, totalRequests: networkSamples.length },
            description: `${slowRequests.length} slow requests out of ${networkSamples.length} total`
          }
        ],
        recommendation: 'Implement request caching, use CDNs, or optimize payload sizes'
      });
    }

    // Check for failed requests
    if (failedRequests.length > 0) {
      issues.push({
        id: `failed_network_${Date.now()}`,
        type: 'network_bottleneck',
        severity: 'medium',
        title: 'Failed Network Requests',
        description: `${failedRequests.length} requests failed with HTTP errors`,
        evidence: [
          {
            type: 'metric',
            data: { failedRequests: failedRequests.length, totalRequests: networkSamples.length },
            description: `${failedRequests.length} failed requests`
          }
        ],
        recommendation: 'Implement better error handling and retry logic'
      });
    }

    return issues;
  }

  /**
   * Analyze CPU issues
   */
  private analyzeCPUIssues(profile: ProfileData): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Analyze stack traces for CPU-intensive functions
    const hotFunctions = this.analyzeHotFunctions(profile.samples);

    if (hotFunctions.length > 0) {
      for (const hotFunc of hotFunctions) {
        issues.push({
          id: `cpu_hot_${Date.now()}_${hotFunc.name}`,
          type: 'cpu_bound',
          severity: hotFunc.percentage > 50 ? 'high' : 'medium',
          title: `CPU-Bound Function: ${hotFunc.name}`,
          description: `${hotFunc.name} consumes ${hotFunc.percentage.toFixed(1)}% of execution time`,
          evidence: [
            {
              type: 'metric',
              data: hotFunc,
              description: `Function appears in ${hotFunc.count} samples (${hotFunc.percentage.toFixed(1)}%)`
            }
          ],
          stackTrace: hotFunc.stackTrace,
          recommendation: 'Optimize algorithm complexity or move to Web Workers'
        });
      }
    }

    return issues;
  }

  /**
   * Analyze hot functions from stack traces
   */
  private analyzeHotFunctions(samples: ProfileSample[]): Array<{
    name: string;
    count: number;
    percentage: number;
    stackTrace: StackFrame[];
  }> {
    const functionCounts: Map<string, { count: number; stackTrace: StackFrame[] }> = new Map();

    for (const sample of samples) {
      for (const frame of sample.stack) {
        if (frame.category === 'user') {
          const existing = functionCounts.get(frame.name);
          if (existing) {
            existing.count++;
          } else {
            functionCounts.set(frame.name, { count: 1, stackTrace: [frame] });
          }
        }
      }
    }

    const totalSamples = samples.length;
    const hotFunctions = Array.from(functionCounts.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        percentage: (data.count / totalSamples) * 100,
        stackTrace: data.stackTrace
      }))
      .filter(f => f.percentage > 10) // Only functions that appear in >10% of samples
      .sort((a, b) => b.percentage - a.percentage);

    return hotFunctions;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Generate recommendations from issues
   */
  private generateRecommendations(issues: PerformanceIssue[]): string[] {
    const recommendations = new Set<string>();

    for (const issue of issues) {
      recommendations.add(issue.recommendation);
    }

    // Add general recommendations based on issue types
    const issueTypes = new Set(issues.map(i => i.type));

    if (issueTypes.has('memory_leak')) {
      recommendations.add('Consider implementing memory monitoring and automatic cleanup');
    }

    if (issueTypes.has('slow_frame')) {
      recommendations.add('Enable GPU acceleration and use CSS transforms for animations');
    }

    if (issueTypes.has('network_bottleneck')) {
      recommendations.add('Implement request deduplication and response caching');
    }

    if (issueTypes.has('cpu_bound')) {
      recommendations.add('Consider moving intensive computations to Web Workers');
    }

    return Array.from(recommendations);
  }
}

// Export singleton instance
export const performanceProfiler = PerformanceProfiler.getInstance();
