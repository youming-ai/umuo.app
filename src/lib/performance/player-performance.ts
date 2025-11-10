/**
 * Comprehensive Player Performance Optimization System
 *
 * This module provides performance monitoring, optimization, and debugging utilities
 * for the enhanced audio player system, ensuring optimal performance across all devices.
 */

import { performanceMonitor } from "./performance-monitor";
import type {
  MobilePerformanceMetrics,
  DeviceInfo,
  TouchInteractionType,
} from "@/types/mobile";

// ==================== Core Types and Interfaces ====================

export type PlayerMetricCategory =
  | "player_interactions"
  | "audio_rendering"
  | "subtitle_sync"
  | "visualizer_performance"
  | "memory_usage"
  | "battery_impact"
  | "touch_gestures"
  | "adaptive_quality";

export type DevicePerformanceTier = "low" | "medium" | "high" | "ultra";

export interface PlayerPerformanceMetric {
  name: string;
  value: number;
  unit: string;
  category: PlayerMetricCategory;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PlayerPerformanceThreshold {
  name: string;
  category: PlayerMetricCategory;
  tiers: {
    low: number;
    medium: number;
    high: number;
    ultra: number;
  };
  unit: string;
  description: string;
  optimizationLevel: "critical" | "important" | "nice-to-have";
}

export interface DeviceCapabilities {
  performanceTier: DevicePerformanceTier;
  memoryLimit: number; // MB
  cpuCores: number;
  gpuAcceleration: boolean;
  webglSupport: boolean;
  webAudioSupport: boolean;
  maxAudioContextChannels: number;
  batteryLevel?: number;
  isLowPowerMode?: boolean;
  networkType: "wifi" | "cellular" | "slow-3g" | "2g" | "unknown";
  networkSpeed: number; // Mbps
  touchSupport: boolean;
  screenSize: { width: number; height: number };
  pixelRatio: number;
}

export interface PerformanceProfile {
  deviceCapabilities: DeviceCapabilities;
  optimizationSettings: PlayerOptimizationSettings;
  activeOptimizations: string[];
  lastUpdated: Date;
  performanceScore: number; // 0-100
}

export interface PlayerOptimizationSettings {
  // Audio settings
  audioBufferDuration: number; // seconds
  maxAudioCacheSize: number; // MB
  enableAudioContextOptimization: boolean;

  // Visualizer settings
  visualizerQuality: "low" | "medium" | "high";
  visualizerUpdateRate: number; // Hz
  enableGPUAcceleration: boolean;

  // Subtitle settings
  subtitlePreloadDistance: number; // seconds
  maxSubtitleCacheSize: number; // items
  enableLazyLoading: boolean;

  // Animation settings
  enableSmoothAnimations: boolean;
  animationDuration: number; // ms
  enableReducedMotion: boolean;

  // Memory settings
  enableMemoryOptimization: boolean;
  garbageCollectionInterval: number; // ms
  maxMemoryUsage: number; // MB

  // Network settings
  adaptiveBitrate: boolean;
  enableOfflineMode: boolean;
  networkTimeout: number; // ms
}

export interface InteractionMetrics {
  type: TouchInteractionType | "keyboard" | "mouse";
  responseTime: number; // ms
  timestamp: Date;
  target: string;
  successful: boolean;
  coordinates?: { x: number; y: number };
}

export interface MemorySnapshot {
  timestamp: Date;
  usedJSHeapSize: number; // MB
  totalJSHeapSize: number; // MB
  jsHeapSizeLimit: number; // MB
  audioBuffers: number; // count
  audioBufferMemory: number; // MB
  imageCache: number; // MB
  componentInstances: number;
}

export interface AudioRenderingMetrics {
  bufferSize: number; // samples
  processingTime: number; // ms
  underruns: number;
  latency: number; // ms
  sampleRate: number; // Hz
  channels: number;
}

export interface SubtitleSyncMetrics {
  syncAccuracy: number; // ms average deviation
  renderTime: number; // ms
  segmentLoadTime: number; // ms
  cacheHitRate: number; // percentage
  activeSegments: number;
  totalSegments: number;
}

export interface VisualizerPerformanceMetrics {
  frameRate: number; // FPS
  renderTime: number; // ms
  dropFrames: number;
  processingTime: number; // ms
  fftTime: number; // ms
  canvasSize: { width: number; height: number };
}

export interface BatteryImpactMetrics {
  batteryLevel: number; // 0-1
  powerConsumption: number; // estimated mW
  thermalThrottling: boolean;
  charging: boolean;
  lowPowerMode: boolean;
  optimizationsApplied: string[];
}

export interface TouchGestureMetrics {
  gestureType: TouchInteractionType;
  responseTime: number; // ms
  accuracy: number; // 0-1
  recognitionTime: number; // ms
  confidence: number; // 0-1
  successful: boolean;
  coordinates?: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
}

export interface AdaptiveQualityMetrics {
  currentQuality: "low" | "medium" | "high";
  adaptationEvents: number;
  adaptationReasons: string[];
  performanceImpact: number; // 0-1
  userSatisfactionScore?: number; // 0-5
}

export interface PerformanceAlert {
  id: string;
  type: "performance" | "memory" | "battery" | "network" | "rendering";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  timestamp: Date;
  metrics: Partial<PlayerPerformanceMetric>;
  recommendations: string[];
  autoAppliedOptimizations?: string[];
}

export interface PerformanceReport {
  id: string;
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  deviceCapabilities: DeviceCapabilities;
  optimizationSettings: PlayerOptimizationSettings;
  metrics: {
    playerInteractions: InteractionMetrics[];
    audioRendering: AudioRenderingMetrics[];
    subtitleSync: SubtitleSyncMetrics[];
    visualizer: VisualizerPerformanceMetrics[];
    memory: MemorySnapshot[];
    battery: BatteryImpactMetrics[];
    touchGestures: TouchGestureMetrics[];
    adaptiveQuality: AdaptiveQualityMetrics[];
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
  performanceScore: number;
  summary: {
    overallHealth: "excellent" | "good" | "fair" | "poor";
    keyIssues: string[];
    strengths: string[];
    optimizationPotential: string[];
  };
}

// ==================== Default Configuration ====================

export const DEFAULT_PLAYER_THRESHOLDS: PlayerPerformanceThreshold[] = [
  {
    name: "player_interaction_response_time",
    category: "player_interactions",
    tiers: { low: 500, medium: 200, high: 100, ultra: 50 },
    unit: "ms",
    description: "Response time for player interactions",
    optimizationLevel: "critical",
  },
  {
    name: "audio_rendering_latency",
    category: "audio_rendering",
    tiers: { low: 100, medium: 50, high: 20, ultra: 10 },
    unit: "ms",
    description: "Audio rendering latency",
    optimizationLevel: "critical",
  },
  {
    name: "subtitle_sync_accuracy",
    category: "subtitle_sync",
    tiers: { low: 500, medium: 200, high: 100, ultra: 50 },
    unit: "ms",
    description: "Subtitle synchronization accuracy",
    optimizationLevel: "important",
  },
  {
    name: "visualizer_frame_rate",
    category: "visualizer_performance",
    tiers: { low: 15, medium: 30, high: 45, ultra: 60 },
    unit: "fps",
    description: "Visualizer frame rate",
    optimizationLevel: "nice-to-have",
  },
  {
    name: "memory_usage_peak",
    category: "memory_usage",
    tiers: { low: 512, medium: 256, high: 128, ultra: 64 },
    unit: "MB",
    description: "Peak memory usage",
    optimizationLevel: "critical",
  },
  {
    name: "battery_drain_rate",
    category: "battery_impact",
    tiers: { low: 20, medium: 10, high: 5, ultra: 2 },
    unit: "%/hour",
    description: "Battery drain rate during playback",
    optimizationLevel: "important",
  },
  {
    name: "touch_recognition_time",
    category: "touch_gestures",
    tiers: { low: 200, medium: 100, high: 50, ultra: 30 },
    unit: "ms",
    description: "Touch gesture recognition time",
    optimizationLevel: "critical",
  },
  {
    name: "adaptive_quality_switch_frequency",
    category: "adaptive_quality",
    tiers: { low: 1, medium: 0.5, high: 0.2, ultra: 0.1 },
    unit: "switches/minute",
    description: "Adaptive quality switching frequency",
    optimizationLevel: "important",
  },
];

export const DEFAULT_OPTIMIZATION_SETTINGS: PlayerOptimizationSettings = {
  // Audio settings
  audioBufferDuration: 5,
  maxAudioCacheSize: 100,
  enableAudioContextOptimization: true,

  // Visualizer settings
  visualizerQuality: "medium",
  visualizerUpdateRate: 30,
  enableGPUAcceleration: true,

  // Subtitle settings
  subtitlePreloadDistance: 10,
  maxSubtitleCacheSize: 1000,
  enableLazyLoading: true,

  // Animation settings
  enableSmoothAnimations: true,
  animationDuration: 200,
  enableReducedMotion: false,

  // Memory settings
  enableMemoryOptimization: true,
  garbageCollectionInterval: 30000,
  maxMemoryUsage: 256,

  // Network settings
  adaptiveBitrate: true,
  enableOfflineMode: true,
  networkTimeout: 10000,
};

export const DEVICE_TIER_PROFILES: Record<
  DevicePerformanceTier,
  Partial<PlayerOptimizationSettings>
> = {
  low: {
    audioBufferDuration: 2,
    maxAudioCacheSize: 20,
    visualizerQuality: "low",
    visualizerUpdateRate: 15,
    subtitlePreloadDistance: 5,
    maxSubtitleCacheSize: 100,
    enableSmoothAnimations: false,
    animationDuration: 100,
    enableReducedMotion: true,
    maxMemoryUsage: 64,
    adaptiveBitrate: false,
  },
  medium: {
    audioBufferDuration: 3,
    maxAudioCacheSize: 50,
    visualizerQuality: "medium",
    visualizerUpdateRate: 30,
    subtitlePreloadDistance: 7,
    maxSubtitleCacheSize: 300,
    enableSmoothAnimations: true,
    animationDuration: 150,
    enableReducedMotion: false,
    maxMemoryUsage: 128,
    adaptiveBitrate: true,
  },
  high: {
    audioBufferDuration: 5,
    maxAudioCacheSize: 100,
    visualizerQuality: "high",
    visualizerUpdateRate: 45,
    subtitlePreloadDistance: 10,
    maxSubtitleCacheSize: 1000,
    enableSmoothAnimations: true,
    animationDuration: 200,
    enableReducedMotion: false,
    maxMemoryUsage: 256,
    adaptiveBitrate: true,
  },
  ultra: {
    audioBufferDuration: 10,
    maxAudioCacheSize: 200,
    visualizerQuality: "high",
    visualizerUpdateRate: 60,
    subtitlePreloadDistance: 15,
    maxSubtitleCacheSize: 2000,
    enableSmoothAnimations: true,
    animationDuration: 250,
    enableReducedMotion: false,
    maxMemoryUsage: 512,
    adaptiveBitrate: true,
  },
};

// ==================== Utility Functions ====================

/**
 * Get the appropriate threshold for a device tier
 */
export function getThresholdForDevice(
  threshold: PlayerPerformanceThreshold,
  tier: DevicePerformanceTier,
): number {
  return threshold.tiers[tier];
}

/**
 * Determine device performance tier based on capabilities
 */
export function determineDeviceTier(
  capabilities: DeviceCapabilities,
): DevicePerformanceTier {
  let score = 0;

  // Memory scoring
  if (capabilities.memoryLimit >= 512) score += 3;
  else if (capabilities.memoryLimit >= 256) score += 2;
  else if (capabilities.memoryLimit >= 128) score += 1;

  // CPU scoring
  if (capabilities.cpuCores >= 8) score += 3;
  else if (capabilities.cpuCores >= 4) score += 2;
  else if (capabilities.cpuCores >= 2) score += 1;

  // GPU scoring
  if (capabilities.gpuAcceleration && capabilities.webglSupport) score += 2;
  else if (capabilities.gpuAcceleration) score += 1;

  // Network scoring
  if (capabilities.networkSpeed >= 50) score += 2;
  else if (capabilities.networkSpeed >= 10) score += 1;

  // Battery scoring
  if (!capabilities.isLowPowerMode) score += 1;

  if (score >= 10) return "ultra";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

/**
 * Calculate performance score from metrics
 */
export function calculatePerformanceScore(
  metrics: PlayerPerformanceMetric[],
  thresholds: PlayerPerformanceThreshold[],
  deviceTier: DevicePerformanceTier,
): number {
  if (metrics.length === 0) return 100;

  let totalScore = 0;
  let metricCount = 0;

  for (const metric of metrics) {
    const threshold = thresholds.find((t) => t.name === metric.name);
    if (!threshold) continue;

    const deviceThreshold = getThresholdForDevice(threshold, deviceTier);
    let score = 100;

    // Calculate score based on metric type
    if (metric.unit === "fps") {
      // Higher is better for FPS
      score = Math.min(100, (metric.value / deviceThreshold) * 100);
    } else {
      // Lower is better for most metrics (ms, MB, etc.)
      score = Math.max(
        0,
        Math.min(
          100,
          100 - ((metric.value - deviceThreshold) / deviceThreshold) * 100,
        ),
      );
    }

    totalScore += score;
    metricCount++;
  }

  return metricCount > 0 ? Math.round(totalScore / metricCount) : 100;
}

/**
 * Format performance metric value for display
 */
export function formatMetricValue(value: number, unit: string): string {
  switch (unit) {
    case "ms":
      return value < 1
        ? `${(value * 1000).toFixed(1)}μs`
        : `${value.toFixed(1)}ms`;
    case "seconds":
      return `${value.toFixed(2)}s`;
    case "fps":
      return `${Math.round(value)} FPS`;
    case "MB":
      return `${value.toFixed(1)} MB`;
    case "GB":
      return `${(value / 1024).toFixed(2)} GB`;
    case "%":
      return `${value.toFixed(1)}%`;
    case "Hz":
      return `${Math.round(value)} Hz`;
    default:
      return `${value} ${unit}`;
  }
}

/**
 * Generate performance recommendations based on metrics and alerts
 */
export function generateRecommendations(
  metrics: PlayerPerformanceMetric[],
  alerts: PerformanceAlert[],
  deviceCapabilities: DeviceCapabilities,
): string[] {
  const recommendations: string[] = [];

  // Analyze alerts
  for (const alert of alerts) {
    recommendations.push(...alert.recommendations);
  }

  // Analyze metrics
  const interactionMetrics = metrics.filter(
    (m) => m.category === "player_interactions",
  );
  const avgInteractionTime =
    interactionMetrics.length > 0
      ? interactionMetrics.reduce((sum, m) => sum + m.value, 0) /
        interactionMetrics.length
      : 0;

  if (avgInteractionTime > 200) {
    recommendations.push(
      "Consider reducing animation complexity or enabling reduced motion",
    );
  }

  const memoryMetrics = metrics.filter((m) => m.category === "memory_usage");
  const peakMemory =
    memoryMetrics.length > 0
      ? Math.max(...memoryMetrics.map((m) => m.value))
      : 0;

  if (peakMemory > deviceCapabilities.memoryLimit * 0.8) {
    recommendations.push("Enable memory optimization and reduce cache sizes");
  }

  // Device-specific recommendations
  if (deviceCapabilities.isLowPowerMode) {
    recommendations.push(
      "Enable battery optimization mode for prolonged playback",
    );
  }

  if (deviceCapabilities.networkSpeed < 5) {
    recommendations.push("Enable offline mode and reduce preload distances");
  }

  // Remove duplicates
  return [...new Set(recommendations)];
}

// ==================== Core Classes ====================

/**
 * Player Performance Monitor
 *
 * Provides real-time monitoring of all player performance aspects
 */
export class PlayerPerformanceMonitor {
  private static instance: PlayerPerformanceMonitor;
  private metrics: Map<string, PlayerPerformanceMetric[]> = new Map();
  private interactionMetrics: InteractionMetrics[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private audioRenderingMetrics: AudioRenderingMetrics[] = [];
  private subtitleSyncMetrics: SubtitleSyncMetrics[] = [];
  private visualizerMetrics: VisualizerPerformanceMetrics[] = [];
  private batteryMetrics: BatteryImpactMetrics[] = [];
  private touchGestureMetrics: TouchGestureMetrics[] = [];
  private adaptiveQualityMetrics: AdaptiveQualityMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: Map<string, PlayerPerformanceThreshold> = new Map();
  private deviceCapabilities: DeviceCapabilities | null = null;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private memoryMonitoringInterval: NodeJS.Timeout | null = null;
  private batteryMonitoringInterval: NodeJS.Timeout | null = null;
  private performanceObservers: Map<string, PerformanceObserver> = new Map();

  // Configuration
  private readonly MAX_METRICS_PER_CATEGORY = 1000;
  private readonly MAX_MEMORY_SNAPSHOTS = 100;
  private readonly MAX_ALERTS = 100;
  private readonly MONITORING_INTERVAL = 1000; // 1 second
  private readonly MEMORY_MONITORING_INTERVAL = 5000; // 5 seconds
  private readonly BATTERY_MONITORING_INTERVAL = 10000; // 10 seconds

  static getInstance(): PlayerPerformanceMonitor {
    if (!PlayerPerformanceMonitor.instance) {
      PlayerPerformanceMonitor.instance = new PlayerPerformanceMonitor();
    }
    return PlayerPerformanceMonitor.instance;
  }

  private constructor() {
    this.initializeThresholds();
  }

  /**
   * Initialize performance thresholds
   */
  private initializeThresholds(): void {
    DEFAULT_PLAYER_THRESHOLDS.forEach((threshold) => {
      this.thresholds.set(threshold.name, threshold);
    });
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(deviceCapabilities?: DeviceCapabilities): void {
    if (this.isMonitoring) return;

    this.deviceCapabilities = deviceCapabilities;
    this.isMonitoring = true;

    // Start main monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.MONITORING_INTERVAL);

    // Start memory monitoring
    this.startMemoryMonitoring();

    // Start battery monitoring if available
    this.startBatteryMonitoring();

    // Setup performance observers
    this.setupPerformanceObservers();

    console.log("Player performance monitoring started");
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
      this.memoryMonitoringInterval = null;
    }

    if (this.batteryMonitoringInterval) {
      clearInterval(this.batteryMonitoringInterval);
      this.batteryMonitoringInterval = null;
    }

    // Disconnect performance observers
    for (const observer of this.performanceObservers.values()) {
      observer.disconnect();
    }
    this.performanceObservers.clear();

    console.log("Player performance monitoring stopped");
  }

  /**
   * Record a player interaction metric
   */
  recordInteraction(metric: InteractionMetrics): void {
    this.interactionMetrics.push(metric);

    // Keep only recent metrics
    if (this.interactionMetrics.length > this.MAX_METRICS_PER_CATEGORY) {
      this.interactionMetrics = this.interactionMetrics.slice(
        -this.MAX_METRICS_PER_CATEGORY,
      );
    }

    // Record as general metric
    this.recordMetric(
      "player_interaction_response_time",
      metric.responseTime,
      "player_interactions",
      {
        type: metric.type,
        target: metric.target,
        successful: metric.successful.toString(),
      },
    );

    // Check thresholds
    this.checkInteractionThresholds(metric);
  }

  /**
   * Record audio rendering metrics
   */
  recordAudioRendering(metric: AudioRenderingMetrics): void {
    this.audioRenderingMetrics.push(metric);

    if (this.audioRenderingMetrics.length > this.MAX_METRICS_PER_CATEGORY) {
      this.audioRenderingMetrics = this.audioRenderingMetrics.slice(
        -this.MAX_METRICS_PER_CATEGORY,
      );
    }

    // Record individual metrics
    this.recordMetric(
      "audio_rendering_latency",
      metric.latency,
      "audio_rendering",
    );
    this.recordMetric(
      "audio_processing_time",
      metric.processingTime,
      "audio_rendering",
    );
    this.recordMetric("audio_underruns", metric.underruns, "audio_rendering");
  }

  /**
   * Record subtitle sync metrics
   */
  recordSubtitleSync(metric: SubtitleSyncMetrics): void {
    this.subtitleSyncMetrics.push(metric);

    if (this.subtitleSyncMetrics.length > this.MAX_METRICS_PER_CATEGORY) {
      this.subtitleSyncMetrics = this.subtitleSyncMetrics.slice(
        -this.MAX_METRICS_PER_CATEGORY,
      );
    }

    // Record individual metrics
    this.recordMetric(
      "subtitle_sync_accuracy",
      metric.syncAccuracy,
      "subtitle_sync",
    );
    this.recordMetric(
      "subtitle_render_time",
      metric.renderTime,
      "subtitle_sync",
    );
    this.recordMetric(
      "subtitle_cache_hit_rate",
      metric.cacheHitRate,
      "subtitle_sync",
    );
  }

  /**
   * Record visualizer performance metrics
   */
  recordVisualizerPerformance(metric: VisualizerPerformanceMetrics): void {
    this.visualizerMetrics.push(metric);

    if (this.visualizerMetrics.length > this.MAX_METRICS_PER_CATEGORY) {
      this.visualizerMetrics = this.visualizerMetrics.slice(
        -this.MAX_METRICS_PER_CATEGORY,
      );
    }

    // Record individual metrics
    this.recordMetric(
      "visualizer_frame_rate",
      metric.frameRate,
      "visualizer_performance",
    );
    this.recordMetric(
      "visualizer_render_time",
      metric.renderTime,
      "visualizer_performance",
    );
    this.recordMetric(
      "visualizer_drop_frames",
      metric.dropFrames,
      "visualizer_performance",
    );
  }

  /**
   * Record touch gesture metrics
   */
  recordTouchGesture(metric: TouchGestureMetrics): void {
    this.touchGestureMetrics.push(metric);

    if (this.touchGestureMetrics.length > this.MAX_METRICS_PER_CATEGORY) {
      this.touchGestureMetrics = this.touchGestureMetrics.slice(
        -this.MAX_METRICS_PER_CATEGORY,
      );
    }

    // Record individual metrics
    this.recordMetric(
      "touch_recognition_time",
      metric.recognitionTime,
      "touch_gestures",
      {
        gesture_type: metric.gestureType,
        successful: metric.successful.toString(),
      },
    );
    this.recordMetric("touch_accuracy", metric.accuracy, "touch_gestures");
  }

  /**
   * Record adaptive quality metrics
   */
  recordAdaptiveQuality(metric: AdaptiveQualityMetrics): void {
    this.adaptiveQualityMetrics.push(metric);

    if (this.adaptiveQualityMetrics.length > this.MAX_METRICS_PER_CATEGORY) {
      this.adaptiveQualityMetrics = this.adaptiveQualityMetrics.slice(
        -this.MAX_METRICS_PER_CATEGORY,
      );
    }

    // Record individual metrics
    this.recordMetric(
      "adaptive_quality_current",
      metric.currentQuality === "high"
        ? 3
        : metric.currentQuality === "medium"
          ? 2
          : 1,
      "adaptive_quality",
    );
    this.recordMetric(
      "adaptive_quality_events",
      metric.adaptationEvents,
      "adaptive_quality",
    );
  }

  /**
   * Record a general performance metric
   */
  recordMetric(
    name: string,
    value: number,
    category: PlayerMetricCategory,
    tags?: Record<string, string>,
    metadata?: Record<string, any>,
  ): void {
    const metric: PlayerPerformanceMetric = {
      name,
      value,
      unit: this.getUnitForMetric(name),
      category,
      timestamp: new Date(),
      tags,
      metadata,
    };

    // Store metric
    const key = `${category}-${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricList = this.metrics.get(key)!;
    metricList.push(metric);

    // Keep only recent metrics
    if (metricList.length > this.MAX_METRICS_PER_CATEGORY) {
      this.metrics.set(key, metricList.slice(-this.MAX_METRICS_PER_CATEGORY));
    }

    // Check thresholds
    this.checkMetricThresholds(metric);
  }

  /**
   * Get metrics for a specific category
   */
  getMetrics(
    category?: PlayerMetricCategory,
    timeWindow?: number,
  ): PlayerPerformanceMetric[] {
    let results: PlayerPerformanceMetric[] = [];

    for (const [key, metricList] of this.metrics.entries()) {
      if (!category || key.startsWith(`${category}-`)) {
        results.push(...metricList);
      }
    }

    // Filter by time window if specified
    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      results = results.filter((m) => m.timestamp.getTime() >= cutoff);
    }

    return results.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  /**
   * Get interaction metrics
   */
  getInteractionMetrics(timeWindow?: number): InteractionMetrics[] {
    if (!timeWindow) return this.interactionMetrics;

    const cutoff = Date.now() - timeWindow;
    return this.interactionMetrics.filter(
      (m) => m.timestamp.getTime() >= cutoff,
    );
  }

  /**
   * Get memory snapshots
   */
  getMemorySnapshots(timeWindow?: number): MemorySnapshot[] {
    if (!timeWindow) return this.memorySnapshots;

    const cutoff = Date.now() - timeWindow;
    return this.memorySnapshots.filter((m) => m.timestamp.getTime() >= cutoff);
  }

  /**
   * Get performance alerts
   */
  getAlerts(timeWindow?: number): PerformanceAlert[] {
    if (!timeWindow) return this.alerts;

    const cutoff = Date.now() - timeWindow;
    return this.alerts.filter((a) => a.timestamp.getTime() >= cutoff);
  }

  /**
   * Generate performance report
   */
  generateReport(timeRange?: { start: Date; end: Date }): PerformanceReport {
    const timeWindow = timeRange
      ? timeRange.end.getTime() - timeRange.start.getTime()
      : 60 * 60 * 1000; // 1 hour default

    const metrics = this.getMetrics(undefined, timeWindow);
    const alerts = this.getAlerts(timeWindow);

    const report: PerformanceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date(),
      timeRange: timeRange || {
        start: new Date(Date.now() - timeWindow),
        end: new Date(),
      },
      deviceCapabilities:
        this.deviceCapabilities || this.getDefaultDeviceCapabilities(),
      optimizationSettings: DEFAULT_OPTIMIZATION_SETTINGS,
      metrics: {
        playerInteractions: this.getInteractionMetrics(timeWindow),
        audioRendering: this.audioRenderingMetrics.slice(-100),
        subtitleSync: this.subtitleSyncMetrics.slice(-100),
        visualizer: this.visualizerMetrics.slice(-100),
        memory: this.getMemorySnapshots(timeWindow),
        battery: this.batteryMetrics.slice(-50),
        touchGestures: this.touchGestureMetrics.slice(-100),
        adaptiveQuality: this.adaptiveQualityMetrics.slice(-50),
      },
      alerts,
      recommendations: generateRecommendations(
        metrics,
        alerts,
        this.deviceCapabilities || this.getDefaultDeviceCapabilities(),
      ),
      performanceScore: calculatePerformanceScore(
        metrics,
        Array.from(this.thresholds.values()),
        this.deviceCapabilities?.performanceTier || "medium",
      ),
      summary: this.generateSummary(metrics, alerts),
    };

    return report;
  }

  /**
   * Set device capabilities
   */
  setDeviceCapabilities(capabilities: DeviceCapabilities): void {
    this.deviceCapabilities = capabilities;
  }

  /**
   * Get current device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.interactionMetrics = [];
    this.memorySnapshots = [];
    this.audioRenderingMetrics = [];
    this.subtitleSyncMetrics = [];
    this.visualizerMetrics = [];
    this.batteryMetrics = [];
    this.touchGestureMetrics = [];
    this.adaptiveQualityMetrics = [];
    this.alerts = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): any {
    return {
      metrics: Object.fromEntries(this.metrics),
      interactionMetrics: this.interactionMetrics,
      memorySnapshots: this.memorySnapshots,
      audioRenderingMetrics: this.audioRenderingMetrics,
      subtitleSyncMetrics: this.subtitleSyncMetrics,
      visualizerMetrics: this.visualizerMetrics,
      batteryMetrics: this.batteryMetrics,
      touchGestureMetrics: this.touchGestureMetrics,
      adaptiveQualityMetrics: this.adaptiveQualityMetrics,
      alerts: this.alerts,
      deviceCapabilities: this.deviceCapabilities,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Get unit for a specific metric name
   */
  private getUnitForMetric(name: string): string {
    const threshold = Array.from(this.thresholds.values()).find(
      (t) => t.name === name,
    );
    return threshold?.unit || "";
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof window === "undefined" || !(window as any).performance?.memory)
      return;

    this.memoryMonitoringInterval = setInterval(() => {
      this.collectMemorySnapshot();
    }, this.MEMORY_MONITORING_INTERVAL);
  }

  /**
   * Start battery monitoring
   */
  private startBatteryMonitoring(): void {
    if (typeof navigator === "undefined" || !(navigator as any).getBattery)
      return;

    const checkBattery = async () => {
      try {
        const battery = await (navigator as any).getBattery();

        const metric: BatteryImpactMetrics = {
          batteryLevel: battery.level,
          powerConsumption: 0, // Hard to estimate, could be calculated over time
          thermalThrottling: false, // Not available in standard APIs
          charging: battery.charging,
          lowPowerMode: false, // Not available in standard APIs
          optimizationsApplied: [],
        };

        this.batteryMetrics.push(metric);

        if (this.batteryMetrics.length > 50) {
          this.batteryMetrics = this.batteryMetrics.slice(-50);
        }
      } catch (error) {
        console.warn("Battery monitoring not available:", error);
      }
    };

    checkBattery();
    this.batteryMonitoringInterval = setInterval(
      checkBattery,
      this.BATTERY_MONITORING_INTERVAL,
    );
  }

  /**
   * Collect memory snapshot
   */
  private collectMemorySnapshot(): void {
    if (!(window as any).performance?.memory) return;

    const memory = (window as any).performance.memory;

    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
      audioBuffers: 0, // Would need to track this elsewhere
      audioBufferMemory: 0, // Would need to track this elsewhere
      imageCache: 0, // Would need to track this elsewhere
      componentInstances: 0, // Would need to track this elsewhere
    };

    this.memorySnapshots.push(snapshot);

    if (this.memorySnapshots.length > this.MAX_MEMORY_SNAPSHOTS) {
      this.memorySnapshots = this.memorySnapshots.slice(
        -this.MAX_MEMORY_SNAPSHOTS,
      );
    }

    // Record memory usage metric
    this.recordMetric(
      "memory_usage_current",
      snapshot.usedJSHeapSize,
      "memory_usage",
    );
    this.recordMetric(
      "memory_usage_peak",
      Math.max(...this.memorySnapshots.map((s) => s.usedJSHeapSize)),
      "memory_usage",
    );
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    // This would collect various system-level metrics
    // Implementation depends on what's available in the browser
  }

  /**
   * Setup performance observers
   */
  private setupPerformanceObservers(): void {
    if (typeof window === "undefined" || !("PerformanceObserver" in window))
      return;

    // Observer for long tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Tasks longer than 50ms
            this.recordMetric(
              "long_task_duration",
              entry.duration,
              "player_interactions",
              {
                name: entry.name,
                entry_type: entry.entryType,
              },
            );
          }
        }
      });

      longTaskObserver.observe({ entryTypes: ["longtask"] });
      this.performanceObservers.set("longtask", longTaskObserver);
    } catch (error) {
      console.warn("Long task observer not supported:", error);
    }

    // Observer for paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (
            entry.name === "first-contentful-paint" ||
            entry.name === "largest-contentful-paint"
          ) {
            this.recordMetric(
              entry.name,
              entry.startTime,
              "player_interactions",
            );
          }
        }
      });

      paintObserver.observe({
        entryTypes: ["paint", "largest-contentful-paint"],
      });
      this.performanceObservers.set("paint", paintObserver);
    } catch (error) {
      console.warn("Paint observer not supported:", error);
    }
  }

  /**
   * Check metric against thresholds
   */
  private checkMetricThresholds(metric: PlayerPerformanceMetric): void {
    if (!this.deviceCapabilities) return;

    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;

    const deviceThreshold = getThresholdForDevice(
      threshold,
      this.deviceCapabilities.performanceTier,
    );

    // Determine if metric violates threshold
    let violatesThreshold = false;
    if (metric.unit === "fps") {
      violatesThreshold = metric.value < deviceThreshold;
    } else {
      violatesThreshold = metric.value > deviceThreshold;
    }

    if (violatesThreshold) {
      this.createAlert(metric, threshold, deviceThreshold);
    }
  }

  /**
   * Check interaction thresholds
   */
  private checkInteractionThresholds(metric: InteractionMetrics): void {
    if (!this.deviceCapabilities) return;

    const threshold = DEFAULT_PLAYER_THRESHOLDS.find(
      (t) => t.name === "player_interaction_response_time",
    );
    if (!threshold) return;

    const deviceThreshold = getThresholdForDevice(
      threshold,
      this.deviceCapabilities.performanceTier,
    );

    if (metric.responseTime > deviceThreshold) {
      this.createInteractionAlert(metric, threshold, deviceThreshold);
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    metric: PlayerPerformanceMetric,
    threshold: PlayerPerformanceThreshold,
    deviceThreshold: number,
  ): void {
    const severity = this.determineAlertSeverity(
      metric.value,
      threshold,
      deviceThreshold,
    );

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "performance",
      severity,
      title: `Performance Issue: ${metric.name}`,
      message: `${metric.name} (${metric.value}${metric.unit}) exceeds device threshold of ${deviceThreshold}${metric.unit}`,
      timestamp: new Date(),
      metrics: { ...metric },
      recommendations: this.generateMetricRecommendations(metric, threshold),
    };

    this.alerts.push(alert);

    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    console.warn(
      `Performance Alert [${severity.toUpperCase()}]: ${alert.message}`,
    );
  }

  /**
   * Create interaction alert
   */
  private createInteractionAlert(
    metric: InteractionMetrics,
    threshold: PlayerPerformanceThreshold,
    deviceThreshold: number,
  ): void {
    const severity = this.determineAlertSeverity(
      metric.responseTime,
      threshold,
      deviceThreshold,
    );

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "performance",
      severity,
      title: `Interaction Response Issue`,
      message: `${metric.type} interaction took ${metric.responseTime}ms (threshold: ${deviceThreshold}ms)`,
      timestamp: metric.timestamp,
      metrics: {
        name: "player_interaction_response_time",
        value: metric.responseTime,
        unit: "ms",
        category: "player_interactions",
        timestamp: metric.timestamp,
      },
      recommendations: this.generateInteractionRecommendations(metric),
    };

    this.alerts.push(alert);

    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }
  }

  /**
   * Determine alert severity
   */
  private determineAlertSeverity(
    value: number,
    threshold: PlayerPerformanceThreshold,
    deviceThreshold: number,
  ): "low" | "medium" | "high" | "critical" {
    const ratio = value / deviceThreshold;

    if (ratio >= 3) return "critical";
    if (ratio >= 2) return "high";
    if (ratio >= 1.5) return "medium";
    return "low";
  }

  /**
   * Generate metric-specific recommendations
   */
  private generateMetricRecommendations(
    metric: PlayerPerformanceMetric,
    threshold: PlayerPerformanceThreshold,
  ): string[] {
    const recommendations: string[] = [];

    switch (metric.name) {
      case "memory_usage_peak":
        recommendations.push(
          "Reduce cache sizes and enable memory optimization",
        );
        recommendations.push("Clear unused audio buffers and images");
        break;
      case "visualizer_frame_rate":
        recommendations.push("Lower visualizer quality or reduce update rate");
        recommendations.push("Enable GPU acceleration if available");
        break;
      case "audio_rendering_latency":
        recommendations.push("Reduce audio buffer size");
        recommendations.push("Enable audio context optimization");
        break;
      case "subtitle_sync_accuracy":
        recommendations.push("Increase subtitle preload distance");
        recommendations.push("Optimize subtitle rendering performance");
        break;
    }

    return recommendations;
  }

  /**
   * Generate interaction-specific recommendations
   */
  private generateInteractionRecommendations(
    metric: InteractionMetrics,
  ): string[] {
    const recommendations: string[] = [];

    if (metric.responseTime > 200) {
      recommendations.push("Reduce animation complexity");
      recommendations.push("Enable reduced motion mode");
    }

    if (!metric.successful) {
      recommendations.push("Check gesture recognition thresholds");
      recommendations.push("Increase touch target sizes");
    }

    return recommendations;
  }

  /**
   * Generate performance summary
   */
  private generateSummary(
    metrics: PlayerPerformanceMetric[],
    alerts: PerformanceAlert[],
  ): PerformanceReport["summary"] {
    const criticalAlerts = alerts.filter(
      (a) => a.severity === "critical",
    ).length;
    const highAlerts = alerts.filter((a) => a.severity === "high").length;

    let overallHealth: PerformanceReport["summary"]["overallHealth"] =
      "excellent";
    if (criticalAlerts > 0) {
      overallHealth = "poor";
    } else if (highAlerts > 2) {
      overallHealth = "fair";
    } else if (highAlerts > 0) {
      overallHealth = "good";
    }

    const keyIssues = alerts
      .filter((a) => a.severity === "critical" || a.severity === "high")
      .map((a) => a.title)
      .slice(0, 5);

    const strengths = this.identifyStrengths(metrics);

    const optimizationPotential =
      this.identifyOptimizationOpportunities(metrics);

    return {
      overallHealth,
      keyIssues,
      strengths,
      optimizationPotential,
    };
  }

  /**
   * Identify performance strengths
   */
  private identifyStrengths(metrics: PlayerPerformanceMetric[]): string[] {
    const strengths: string[] = [];

    // Analyze metrics to identify areas performing well
    const interactionMetrics = metrics.filter(
      (m) => m.category === "player_interactions",
    );
    if (interactionMetrics.length > 0) {
      const avgResponseTime =
        interactionMetrics.reduce((sum, m) => sum + m.value, 0) /
        interactionMetrics.length;
      if (avgResponseTime < 100) {
        strengths.push("Fast interaction response times");
      }
    }

    const visualizerMetrics = metrics.filter(
      (m) => m.name === "visualizer_frame_rate",
    );
    if (visualizerMetrics.length > 0) {
      const avgFPS =
        visualizerMetrics.reduce((sum, m) => sum + m.value, 0) /
        visualizerMetrics.length;
      if (avgFPS > 45) {
        strengths.push("High visualizer frame rates");
      }
    }

    return strengths;
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOptimizationOpportunities(
    metrics: PlayerPerformanceMetric[],
  ): string[] {
    const opportunities: string[] = [];

    // Analyze metrics to identify areas for improvement
    const memoryMetrics = metrics.filter((m) => m.name === "memory_usage_peak");
    if (memoryMetrics.length > 0) {
      const avgMemory =
        memoryMetrics.reduce((sum, m) => sum + m.value, 0) /
        memoryMetrics.length;
      if (avgMemory > 100) {
        opportunities.push("Memory usage optimization");
      }
    }

    const audioMetrics = metrics.filter(
      (m) => m.name === "audio_rendering_latency",
    );
    if (audioMetrics.length > 0) {
      const avgLatency =
        audioMetrics.reduce((sum, m) => sum + m.value, 0) / audioMetrics.length;
      if (avgLatency > 30) {
        opportunities.push("Audio latency reduction");
      }
    }

    return opportunities;
  }

  /**
   * Get default device capabilities
   */
  private getDefaultDeviceCapabilities(): DeviceCapabilities {
    return {
      performanceTier: "medium",
      memoryLimit: 256,
      cpuCores: 4,
      gpuAcceleration: true,
      webglSupport: true,
      webAudioSupport: true,
      maxAudioContextChannels: 32,
      networkType: "wifi",
      networkSpeed: 25,
      touchSupport: false,
      screenSize: { width: 1920, height: 1080 },
      pixelRatio: 1,
    };
  }
}

/**
 * Device Profiler
 *
 * Detects device capabilities and determines performance tier
 */
export class DeviceProfiler {
  private static instance: DeviceProfiler;
  private cachedCapabilities: DeviceCapabilities | null = null;
  private networkMonitorInterval: NodeJS.Timeout | null = null;
  private batteryMonitorInterval: NodeJS.Timeout | null = null;

  static getInstance(): DeviceProfiler {
    if (!DeviceProfiler.instance) {
      DeviceProfiler.instance = new DeviceProfiler();
    }
    return DeviceProfiler.instance;
  }

  private constructor() {
    this.initializeMonitoring();
  }

  /**
   * Profile device capabilities
   */
  async profileDevice(): Promise<DeviceCapabilities> {
    if (this.cachedCapabilities) {
      return this.cachedCapabilities;
    }

    const capabilities = await this.detectCapabilities();
    this.cachedCapabilities = capabilities;

    return capabilities;
  }

  /**
   * Get current device capabilities
   */
  getCurrentCapabilities(): DeviceCapabilities | null {
    return this.cachedCapabilities;
  }

  /**
   * Force refresh device capabilities
   */
  async refreshCapabilities(): Promise<DeviceCapabilities> {
    this.cachedCapabilities = null;
    return this.profileDevice();
  }

  /**
   * Detect device capabilities
   */
  private async detectCapabilities(): Promise<DeviceCapabilities> {
    const [memoryInfo, cpuInfo, gpuInfo, networkInfo, batteryInfo, screenInfo] =
      await Promise.all([
        this.detectMemoryCapabilities(),
        this.detectCPUCapabilities(),
        this.detectGPUCapabilities(),
        this.detectNetworkCapabilities(),
        this.detectBatteryCapabilities(),
        this.detectScreenCapabilities(),
      ]);

    const capabilities: DeviceCapabilities = {
      performanceTier: "medium", // Will be determined below
      memoryLimit: memoryInfo.limit,
      cpuCores: cpuInfo.cores,
      gpuAcceleration: gpuInfo.acceleration,
      webglSupport: gpuInfo.webgl,
      webAudioSupport: await this.detectWebAudioSupport(),
      maxAudioContextChannels: await this.detectMaxAudioChannels(),
      networkType: networkInfo.type,
      networkSpeed: networkInfo.speed,
      batteryLevel: batteryInfo.level,
      isLowPowerMode: batteryInfo.lowPowerMode,
      touchSupport: this.detectTouchSupport(),
      screenSize: screenInfo.size,
      pixelRatio: screenInfo.pixelRatio,
    };

    // Determine performance tier
    capabilities.performanceTier = determineDeviceTier(capabilities);

    return capabilities;
  }

  /**
   * Detect memory capabilities
   */
  private async detectMemoryCapabilities(): Promise<{ limit: number }> {
    if (typeof window !== "undefined" && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      return {
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
      };
    }

    // Fallback: estimate based on device type
    if (typeof navigator !== "undefined") {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes("mobile")) {
        return { limit: 512 }; // Conservative estimate for mobile
      } else if (userAgent.includes("tablet")) {
        return { limit: 1024 }; // Conservative estimate for tablets
      }
    }

    return { limit: 4096 }; // Conservative estimate for desktop
  }

  /**
   * Detect CPU capabilities
   */
  private async detectCPUCapabilities(): Promise<{ cores: number }> {
    if (
      typeof navigator !== "undefined" &&
      (navigator as any).hardwareConcurrency
    ) {
      return {
        cores: (navigator as any).hardwareConcurrency,
      };
    }

    // Fallback estimates
    if (typeof navigator !== "undefined") {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes("mobile")) {
        return { cores: 4 }; // Conservative estimate for mobile
      } else if (userAgent.includes("tablet")) {
        return { cores: 6 }; // Conservative estimate for tablets
      }
    }

    return { cores: 8 }; // Conservative estimate for desktop
  }

  /**
   * Detect GPU capabilities
   */
  private async detectGPUCapabilities(): Promise<{
    acceleration: boolean;
    webgl: boolean;
  }> {
    const canvas = document.createElement("canvas");

    // Check WebGL support
    const webgl = !!(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );

    // Check GPU acceleration (basic detection)
    let acceleration = false;
    if (typeof window !== "undefined") {
      const Chrome = (window as any).chrome;
      const Safari = !!(window as any).safari;

      acceleration = webgl || !!Chrome || Safari;
    }

    return { acceleration, webgl };
  }

  /**
   * Detect Web Audio support
   */
  private async detectWebAudioSupport(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Detect maximum audio context channels
   */
  private async detectMaxAudioChannels(): Promise<number> {
    if (typeof window === "undefined") return 32;

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return 32;

      // Create a temporary context to check capabilities
      const context = new AudioContextClass();
      const maxChannels = context.destination.maxChannelCount || 32;
      context.close();

      return maxChannels;
    } catch (error) {
      return 32; // Fallback
    }
  }

  /**
   * Detect network capabilities
   */
  private async detectNetworkCapabilities(): Promise<{
    type: DeviceCapabilities["networkType"];
    speed: number;
  }> {
    if (typeof navigator === "undefined" || !(navigator as any).connection) {
      return { type: "unknown", speed: 25 }; // Default assumption
    }

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) {
      return { type: "unknown", speed: 25 };
    }

    const type = this.mapConnectionType(
      connection.effectiveType || connection.type,
    );
    const speed = connection.downlink || 25; // Mbps, fallback to 25

    return { type, speed };
  }

  /**
   * Map connection type to our network type
   */
  private mapConnectionType(
    connectionType: string,
  ): DeviceCapabilities["networkType"] {
    switch (connectionType.toLowerCase()) {
      case "wifi":
        return "wifi";
      case "cellular":
      case "4g":
      case "5g":
        return "cellular";
      case "3g":
        return "slow-3g";
      case "2g":
        return "2g";
      default:
        return "unknown";
    }
  }

  /**
   * Detect battery capabilities
   */
  private async detectBatteryCapabilities(): Promise<{
    level?: number;
    lowPowerMode?: boolean;
  }> {
    if (typeof navigator === "undefined" || !(navigator as any).getBattery) {
      return {};
    }

    try {
      const battery = await (navigator as any).getBattery();

      return {
        level: battery.level,
        lowPowerMode: false, // Not directly detectable in standard APIs
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Detect screen capabilities
   */
  private async detectScreenCapabilities(): Promise<{
    size: { width: number; height: number };
    pixelRatio: number;
  }> {
    if (typeof window === "undefined") {
      return { size: { width: 1920, height: 1080 }, pixelRatio: 1 };
    }

    return {
      size: {
        width: window.screen.width,
        height: window.screen.height,
      },
      pixelRatio: window.devicePixelRatio || 1,
    };
  }

  /**
   * Detect touch support
   */
  private detectTouchSupport(): boolean {
    if (typeof window === "undefined") return false;

    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );
  }

  /**
   * Initialize monitoring for network and battery changes
   */
  private initializeMonitoring(): void {
    this.startNetworkMonitoring();
    this.startBatteryMonitoring();
  }

  /**
   * Start network monitoring
   */
  private startNetworkMonitoring(): void {
    if (typeof navigator === "undefined" || !(navigator as any).connection)
      return;

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) return;

    const updateNetworkInfo = () => {
      if (this.cachedCapabilities) {
        this.cachedCapabilities.networkType = this.mapConnectionType(
          connection.effectiveType || connection.type,
        );
        this.cachedCapabilities.networkSpeed = connection.downlink || 25;
      }
    };

    connection.addEventListener("change", updateNetworkInfo);

    // Periodic updates
    this.networkMonitorInterval = setInterval(updateNetworkInfo, 30000); // 30 seconds
  }

  /**
   * Start battery monitoring
   */
  private startBatteryMonitoring(): void {
    if (typeof navigator === "undefined" || !(navigator as any).getBattery)
      return;

    const updateBatteryInfo = async () => {
      try {
        const battery = await (navigator as any).getBattery();

        if (this.cachedCapabilities) {
          this.cachedCapabilities.batteryLevel = battery.level;
          this.cachedCapabilities.isLowPowerMode =
            !battery.charging && battery.level < 0.2;
        }
      } catch (error) {
        // Silently ignore battery monitoring failures
      }
    };

    // Initial update
    updateBatteryInfo();

    // Periodic updates
    this.batteryMonitorInterval = setInterval(updateBatteryInfo, 60000); // 1 minute
  }

  /**
   * Cleanup monitoring
   */
  cleanup(): void {
    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval);
      this.networkMonitorInterval = null;
    }

    if (this.batteryMonitorInterval) {
      clearInterval(this.batteryMonitorInterval);
      this.batteryMonitorInterval = null;
    }
  }
}

/**
 * Performance Optimizer
 *
 * Applies adaptive performance optimizations based on device capabilities and performance metrics
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private deviceProfiler: DeviceProfiler;
  private performanceMonitor: PlayerPerformanceMonitor;
  private currentProfile: PerformanceProfile | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private activeOptimizations: Set<string> = new Set();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private constructor() {
    this.deviceProfiler = DeviceProfiler.getInstance();
    this.performanceMonitor = PlayerPerformanceMonitor.getInstance();
  }

  /**
   * Initialize performance optimizer
   */
  async initialize(): Promise<void> {
    const capabilities = await this.deviceProfiler.profileDevice();

    this.currentProfile = {
      deviceCapabilities: capabilities,
      optimizationSettings: this.generateOptimizationSettings(capabilities),
      activeOptimizations: [],
      lastUpdated: new Date(),
      performanceScore: 100,
    };

    this.performanceMonitor.setDeviceCapabilities(capabilities);
    this.startOptimizationLoop();

    console.log(
      "Performance optimizer initialized for",
      capabilities.performanceTier,
      "device",
    );
  }

  /**
   * Get current performance profile
   */
  getCurrentProfile(): PerformanceProfile | null {
    return this.currentProfile;
  }

  /**
   * Get optimization settings
   */
  getOptimizationSettings(): PlayerOptimizationSettings {
    return (
      this.currentProfile?.optimizationSettings || DEFAULT_OPTIMIZATION_SETTINGS
    );
  }

  /**
   * Apply specific optimization
   */
  applyOptimization(
    optimizationName: string,
    params?: Record<string, any>,
  ): boolean {
    if (!this.currentProfile) return false;

    const success = this.executeOptimization(optimizationName, params);

    if (success) {
      this.activeOptimizations.add(optimizationName);
      this.currentProfile.activeOptimizations = Array.from(
        this.activeOptimizations,
      );
      this.currentProfile.lastUpdated = new Date();

      // Record optimization applied
      this.performanceMonitor.recordMetric(
        "optimization_applied",
        1,
        "player_interactions",
        { optimization: optimizationName },
      );
    }

    return success;
  }

  /**
   * Remove specific optimization
   */
  removeOptimization(optimizationName: string): boolean {
    if (
      !this.currentProfile ||
      !this.activeOptimizations.has(optimizationName)
    ) {
      return false;
    }

    const success = this.revertOptimization(optimizationName);

    if (success) {
      this.activeOptimizations.delete(optimizationName);
      this.currentProfile.activeOptimizations = Array.from(
        this.activeOptimizations,
      );
      this.currentProfile.lastUpdated = new Date();

      // Record optimization removed
      this.performanceMonitor.recordMetric(
        "optimization_removed",
        1,
        "player_interactions",
        { optimization: optimizationName },
      );
    }

    return success;
  }

  /**
   * Auto-optimize based on current performance
   */
  async autoOptimize(): Promise<void> {
    if (!this.currentProfile) return;

    const report = this.performanceMonitor.generateReport();
    const metrics = this.performanceMonitor.getMetrics();
    const alerts = this.performanceMonitor.getAlerts();

    // Analyze performance issues and apply optimizations
    const optimizations = await this.analyzeAndRecommend(metrics, alerts);

    for (const optimization of optimizations) {
      this.applyOptimization(optimization.name, optimization.params);
    }

    // Update performance score
    this.currentProfile.performanceScore = report.performanceScore;
  }

  /**
   * Force refresh of device capabilities and re-optimization
   */
  async refreshAndReoptimize(): Promise<void> {
    await this.deviceProfiler.refreshCapabilities();
    await this.initialize();
  }

  /**
   * Cleanup optimizer
   */
  cleanup(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    // Remove all active optimizations
    for (const optimization of Array.from(this.activeOptimizations)) {
      this.revertOptimization(optimization);
    }
    this.activeOptimizations.clear();
  }

  // ==================== Private Methods ====================

  /**
   * Generate optimization settings based on device capabilities
   */
  private generateOptimizationSettings(
    capabilities: DeviceCapabilities,
  ): PlayerOptimizationSettings {
    const tierSettings = DEVICE_TIER_PROFILES[capabilities.performanceTier];

    return {
      ...DEFAULT_OPTIMIZATION_SETTINGS,
      ...tierSettings,

      // Network-based adjustments
      adaptiveBitrate: capabilities.networkType === "wifi",
      enableOfflineMode: capabilities.networkSpeed < 10,

      // Battery-based adjustments
      garbageCollectionInterval: capabilities.isLowPowerMode ? 15000 : 30000,

      // Screen size adjustments
      visualizerQuality: this.determineVisualizerQuality(capabilities),
      enableGPUAcceleration: capabilities.gpuAcceleration,

      // Touch device adjustments
      enableReducedMotion:
        capabilities.touchSupport && capabilities.isLowPowerMode,
    };
  }

  /**
   * Determine visualizer quality based on capabilities
   */
  private determineVisualizerQuality(
    capabilities: DeviceCapabilities,
  ): "low" | "medium" | "high" {
    if (
      !capabilities.gpuAcceleration ||
      capabilities.performanceTier === "low"
    ) {
      return "low";
    }

    if (capabilities.performanceTier === "ultra") {
      return "high";
    }

    return "medium";
  }

  /**
   * Start optimization loop
   */
  private startOptimizationLoop(): void {
    this.optimizationInterval = setInterval(() => {
      this.autoOptimize();
    }, 30000); // Every 30 seconds
  }

  /**
   * Execute a specific optimization
   */
  private executeOptimization(
    name: string,
    params?: Record<string, any>,
  ): boolean {
    try {
      switch (name) {
        case "reduce_animation_complexity":
          return this.reduceAnimationComplexity(params);

        case "enable_memory_optimization":
          return this.enableMemoryOptimization(params);

        case "lower_visualizer_quality":
          return this.lowerVisualizerQuality(params);

        case "reduce_audio_buffer_size":
          return this.reduceAudioBufferSize(params);

        case "enable_gpu_acceleration":
          return this.enableGPUAcceleration(params);

        case "enable_reduced_motion":
          return this.enableReducedMotion(params);

        case "clear_unused_caches":
          return this.clearUnusedCaches(params);

        case "optimize_subtitle_rendering":
          return this.optimizeSubtitleRendering(params);

        default:
          console.warn(`Unknown optimization: ${name}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to apply optimization ${name}:`, error);
      return false;
    }
  }

  /**
   * Revert a specific optimization
   */
  private revertOptimization(name: string): boolean {
    try {
      switch (name) {
        case "reduce_animation_complexity":
          return this.restoreAnimationComplexity();

        case "enable_memory_optimization":
          return this.disableMemoryOptimization();

        case "lower_visualizer_quality":
          return this.restoreVisualizerQuality();

        case "reduce_audio_buffer_size":
          return this.restoreAudioBufferSize();

        case "enable_gpu_acceleration":
          return this.disableGPUAcceleration();

        case "enable_reduced_motion":
          return this.disableReducedMotion();

        default:
          console.warn(`Cannot revert optimization: ${name}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to revert optimization ${name}:`, error);
      return false;
    }
  }

  /**
   * Analyze performance and recommend optimizations
   */
  private async analyzeAndRecommend(
    metrics: PlayerPerformanceMetric[],
    alerts: PerformanceAlert[],
  ): Promise<Array<{ name: string; params?: Record<string, any> }>> {
    const recommendations: Array<{
      name: string;
      params?: Record<string, any>;
    }> = [];

    // Memory issues
    const memoryAlerts = alerts.filter(
      (a) => a.type === "memory" || a.metrics.name?.includes("memory"),
    );
    if (memoryAlerts.length > 0) {
      recommendations.push({ name: "enable_memory_optimization" });
      recommendations.push({ name: "clear_unused_caches" });
    }

    // Rendering issues
    const renderingAlerts = alerts.filter(
      (a) =>
        a.metrics.name?.includes("visualizer") ||
        a.metrics.name?.includes("frame"),
    );
    if (renderingAlerts.length > 0) {
      recommendations.push({ name: "lower_visualizer_quality" });
      if (this.currentProfile?.deviceCapabilities.gpuAcceleration) {
        recommendations.push({ name: "enable_gpu_acceleration" });
      }
    }

    // Interaction issues
    const interactionAlerts = alerts.filter(
      (a) => a.metrics.category === "player_interactions",
    );
    if (interactionAlerts.length > 0) {
      recommendations.push({ name: "reduce_animation_complexity" });
      recommendations.push({ name: "enable_reduced_motion" });
    }

    // Audio issues
    const audioAlerts = alerts.filter(
      (a) => a.metrics.category === "audio_rendering",
    );
    if (audioAlerts.length > 0) {
      recommendations.push({ name: "reduce_audio_buffer_size" });
    }

    return recommendations;
  }

  // ==================== Individual Optimizations ====================

  /**
   * Reduce animation complexity
   */
  private reduceAnimationComplexity(params?: Record<string, any>): boolean {
    if (typeof document === "undefined") return false;

    // Reduce CSS animation duration
    const style = document.createElement("style");
    style.textContent = `
      * {
        animation-duration: ${params?.duration || "100ms"} !important;
        transition-duration: ${params?.duration || "100ms"} !important;
      }
    `;
    style.id = "performance-animation-optimization";
    document.head.appendChild(style);

    return true;
  }

  /**
   * Enable memory optimization
   */
  private enableMemoryOptimization(params?: Record<string, any>): boolean {
    // Trigger garbage collection if available
    if (typeof window !== "undefined" && (window as any).gc) {
      (window as any).gc();
    }

    // Clear image caches if they exist
    if (typeof window !== "undefined" && (window as any).images) {
      // Clear image references
      (window as any).images = [];
    }

    return true;
  }

  /**
   * Lower visualizer quality
   */
  private lowerVisualizerQuality(params?: Record<string, any>): boolean {
    if (!this.currentProfile) return false;

    // Update optimization settings
    this.currentProfile.optimizationSettings.visualizerQuality = "low";
    this.currentProfile.optimizationSettings.visualizerUpdateRate =
      params?.updateRate || 15;

    return true;
  }

  /**
   * Reduce audio buffer size
   */
  private reduceAudioBufferSize(params?: Record<string, any>): boolean {
    if (!this.currentProfile) return false;

    // Update optimization settings
    const currentBuffer =
      this.currentProfile.optimizationSettings.audioBufferDuration;
    this.currentProfile.optimizationSettings.audioBufferDuration = Math.max(
      1,
      currentBuffer * 0.5,
    );

    return true;
  }

  /**
   * Enable GPU acceleration
   */
  private enableGPUAcceleration(params?: Record<string, any>): boolean {
    if (typeof document === "undefined") return false;

    // Enable hardware acceleration via CSS
    const style = document.createElement("style");
    style.textContent = `
      * {
        transform: translateZ(0);
        will-change: transform, opacity;
      }
    `;
    style.id = "performance-gpu-acceleration";
    document.head.appendChild(style);

    return true;
  }

  /**
   * Enable reduced motion
   */
  private enableReducedMotion(params?: Record<string, any>): boolean {
    if (typeof document === "undefined") return false;

    // Set reduced motion preference
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    style.id = "performance-reduced-motion";
    document.head.appendChild(style);

    return true;
  }

  /**
   * Clear unused caches
   */
  private clearUnusedCaches(params?: Record<string, any>): boolean {
    // Clear various caches
    if (typeof window !== "undefined") {
      // Clear performance entries
      if (window.performance && window.performance.clearResourceTimings) {
        window.performance.clearResourceTimings();
      }

      // Clear localStorage if it's getting large
      try {
        const localStorageSize = JSON.stringify(localStorage).length;
        if (localStorageSize > 1024 * 1024) {
          // 1MB
          // Clear non-essential items
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
              key &&
              !key.includes("user-preferences") &&
              !key.includes("auth")
            ) {
              localStorage.removeItem(key);
            }
          }
        }
      } catch (error) {
        // Ignore localStorage errors
      }
    }

    return true;
  }

  /**
   * Optimize subtitle rendering
   */
  private optimizeSubtitleRendering(params?: Record<string, any>): boolean {
    if (!this.currentProfile) return false;

    // Reduce subtitle preload distance
    const currentPreload =
      this.currentProfile.optimizationSettings.subtitlePreloadDistance;
    this.currentProfile.optimizationSettings.subtitlePreloadDistance = Math.max(
      2,
      currentPreload * 0.5,
    );

    // Reduce cache size
    const currentCache =
      this.currentProfile.optimizationSettings.maxSubtitleCacheSize;
    this.currentProfile.optimizationSettings.maxSubtitleCacheSize = Math.max(
      50,
      currentCache * 0.5,
    );

    return true;
  }

  // ==================== Reversion Methods ====================

  /**
   * Restore animation complexity
   */
  private restoreAnimationComplexity(): boolean {
    if (typeof document === "undefined") return false;

    const style = document.getElementById("performance-animation-optimization");
    if (style) {
      style.remove();
    }

    return true;
  }

  /**
   * Disable memory optimization
   */
  private disableMemoryOptimization(): boolean {
    // Memory optimization is typically stateless, so no action needed
    return true;
  }

  /**
   * Restore visualizer quality
   */
  private restoreVisualizerQuality(): boolean {
    if (!this.currentProfile) return false;

    // Restore to device-appropriate quality
    this.currentProfile.optimizationSettings.visualizerQuality =
      this.determineVisualizerQuality(this.currentProfile.deviceCapabilities);

    return true;
  }

  /**
   * Restore audio buffer size
   */
  private restoreAudioBufferSize(): boolean {
    if (!this.currentProfile) return false;

    // Restore to device-appropriate buffer size
    const tier = this.currentProfile.deviceCapabilities.performanceTier;
    this.currentProfile.optimizationSettings.audioBufferDuration =
      DEVICE_TIER_PROFILES[tier].audioBufferDuration || 5;

    return true;
  }

  /**
   * Disable GPU acceleration
   */
  private disableGPUAcceleration(): boolean {
    if (typeof document === "undefined") return false;

    const style = document.getElementById("performance-gpu-acceleration");
    if (style) {
      style.remove();
    }

    return true;
  }

  /**
   * Disable reduced motion
   */
  private disableReducedMotion(): boolean {
    if (typeof document === "undefined") return false;

    const style = document.getElementById("performance-reduced-motion");
    if (style) {
      style.remove();
    }

    return true;
  }
}
