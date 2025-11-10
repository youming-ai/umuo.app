/**
 * Comprehensive mobile performance optimization utilities
 * Ensures excellent performance across all mobile components
 */

import type { MobilePerformanceMetrics, DeviceInfo, MobileOptimizationConfig } from "@/types/mobile";
import { performanceMonitor } from "./performance-monitor";

// Performance monitoring interfaces
export interface PerformanceReport {
  deviceClass: DeviceClass;
  overallScore: number; // 0-100
  metrics: {
    touch: TouchPerformanceMetrics;
    memory: MemoryPerformanceMetrics;
    animation: AnimationPerformanceMetrics;
    network: NetworkPerformanceMetrics;
    battery: BatteryPerformanceMetrics;
  };
  recommendations: PerformanceRecommendation[];
  timestamp: Date;
}

export interface TouchPerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  gestureAccuracy: number;
  missedTouches: number;
  multiTouchLatency: number;
}

export interface MemoryPerformanceMetrics {
  heapUsed: number;
  heapTotal: number;
  fragmentation: number;
  gcPressure: number;
  leakDetection: number;
  audioBufferUsage: number;
}

export interface AnimationPerformanceMetrics {
  averageFPS: number;
  frameDrops: number;
  jankScore: number;
  gpuAcceleration: boolean;
  animationEfficiency: number;
  scrollPerformance: number;
}

export interface NetworkPerformanceMetrics {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  requestLatency: number;
  throughput: number;
}

export interface BatteryPerformanceMetrics {
  level: number;
  charging: boolean;
  dischargeRate: number;
  powerConsumption: number;
  temperature: number;
  healthStatus: 'good' | 'fair' | 'poor';
}

export interface PerformanceRecommendation {
  category: 'touch' | 'memory' | 'animation' | 'network' | 'battery';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action: string;
  impact: number; // Estimated performance improvement (0-100)
}

export type DeviceClass = 'low-end' | 'mid-range' | 'high-end' | 'flagship';

export interface DeviceProfile {
  class: DeviceClass;
  capabilities: {
    gpu: 'basic' | 'standard' | 'advanced';
    memory: 'limited' | 'moderate' | 'abundant';
    processor: 'slow' | 'moderate' | 'fast';
    battery: 'poor' | 'average' | 'excellent';
    network: 'slow' | 'moderate' | 'fast';
  };
  limitations: string[];
  optimizations: string[];
  recommendedSettings: PerformanceSettings;
}

export interface PerformanceSettings {
  animations: {
    enabled: boolean;
    complexity: 'minimal' | 'standard' | 'enhanced';
    fps: number;
    gpuAcceleration: boolean;
  };
  touch: {
    responseTimeTarget: number;
    gestureThresholds: Record<string, number>;
    feedbackEnabled: boolean;
  };
  memory: {
    maxHeapUsage: number;
    gcAggressiveness: number;
    cacheSize: number;
    preloadLimit: number;
  };
  network: {
    batchSize: number;
    timeoutDuration: number;
    retryAttempts: number;
    compressionEnabled: boolean;
  };
  battery: {
    lowPowerMode: boolean;
    adaptiveQuality: boolean;
    backgroundProcessing: boolean;
  };
}

// Main performance monitoring class
export class MobilePerformanceMonitor {
  private static instance: MobilePerformanceMonitor;
  private metrics: MobilePerformanceMetrics;
  private observers: PerformanceObserver[] = [];
  private frameMetrics: FrameMetrics[] = [];
  private touchMetrics: TouchMetrics[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceMarks: Map<string, number> = new Map();

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.setupPerformanceObservers();
  }

  static getInstance(): MobilePerformanceMonitor {
    if (!MobilePerformanceMonitor.instance) {
      MobilePerformanceMonitor.instance = new MobilePerformanceMonitor();
    }
    return MobilePerformanceMonitor.instance;
  }

  private initializeMetrics(): MobilePerformanceMetrics {
    return {
      touchResponseTime: 0,
      gestureSuccessRate: 100,
      batteryLevel: 1.0,
      isLowPowerMode: false,
      memoryUsage: 0,
      networkType: 'unknown',
      networkSpeed: 0,
    };
  }

  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Frame rate monitoring
      const frameObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.startsWith('frame-')) {
            this.recordFrameMetric(entry as PerformanceMeasure);
          }
        }
      });
      frameObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(frameObserver);

      // Navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordNavigationMetric(navEntry);
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceMetric(entry as PerformanceResourceTiming);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Performance observers not fully supported:', error);
    }
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startFrameRateMonitoring();
    this.startTouchMonitoring();
    this.startSystemMonitoring();

    performanceMonitor.recordMetric('mobile-monitoring-started', Date.now(), 'mobile');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    performanceMonitor.recordMetric('mobile-monitoring-stopped', Date.now(), 'mobile');
  }

  private startFrameRateMonitoring(): void {
    let lastFrameTime = performance.now();
    let frameCount = 0;

    const measureFrame = () => {
      if (!this.isMonitoring) return;

      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;

      frameCount++;

      if (deltaTime >= 1000) { // Every second
        const fps = Math.round((frameCount * 1000) / deltaTime);

        this.recordFrameMetric({
          name: `frame-rate-${Date.now()}`,
          entryType: 'measure',
          startTime: lastFrameTime,
          duration: deltaTime,
          toJSON: () => ({})
        } as PerformanceMeasure);

        frameCount = 0;
        lastFrameTime = currentTime;
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  private startTouchMonitoring(): void {
    if (!('ontouchstart' in window)) return;

    const touchStartHandler = (event: TouchEvent) => {
      const touchId = `touch-${Date.now()}-${Math.random()}`;
      this.performanceMarks.set(touchId, performance.now());
    };

    const touchEndHandler = (event: TouchEvent) => {
      const touches = Array.from(this.performanceMarks.entries());
      const latestTouch = touches[touches.length - 1];

      if (latestTouch) {
        const [touchId, startTime] = latestTouch;
        const responseTime = performance.now() - startTime;

        this.recordTouchMetric({
          name: `touch-response-${touchId}`,
          responseTime,
          timestamp: new Date(),
          type: 'single-tap'
        });

        this.performanceMarks.delete(touchId);
      }
    };

    document.addEventListener('touchstart', touchStartHandler, { passive: true });
    document.addEventListener('touchend', touchEndHandler, { passive: true });
  }

  private startSystemMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 5000); // Every 5 seconds
  }

  private updateSystemMetrics(): void {
    // Memory metrics
    if ('memory' in performance && performance.memory) {
      const memoryInfo = performance.memory;
      this.metrics.memoryUsage = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
    }

    // Battery metrics
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.metrics.batteryLevel = battery.level;
        this.metrics.isLowPowerMode = battery.level < 0.2;
      }).catch(() => {
        // Battery API not available
      });
    }

    // Network metrics
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      this.metrics.networkType = connection.effectiveType || 'unknown';
      this.metrics.networkSpeed = connection.downlink || 0;
    }

    // Record consolidated metrics
    performanceMonitor.recordMobileMetrics(this.metrics);
  }

  private recordFrameMetric(entry: PerformanceMeasure): void {
    const frameMetric: FrameMetrics = {
      timestamp: Date.now(),
      duration: entry.duration,
      fps: Math.round(1000 / entry.duration)
    };

    this.frameMetrics.push(frameMetric);

    // Keep only last 60 seconds of frame data
    const cutoff = Date.now() - 60000;
    this.frameMetrics = this.frameMetrics.filter(metric => metric.timestamp > cutoff);

    // Record with performance monitor
    performanceMonitor.recordMetric('frame-duration', entry.duration, 'mobile');
    performanceMonitor.recordMetric('frame-fps', frameMetric.fps, 'mobile');
  }

  private recordTouchMetric(metric: TouchMetrics): void {
    this.touchMetrics.push(metric);

    // Keep only last 100 touch events
    if (this.touchMetrics.length > 100) {
      this.touchMetrics = this.touchMetrics.slice(-100);
    }

    // Update average response time
    const recentTouches = this.touchMetrics.slice(-10);
    const avgResponseTime = recentTouches.reduce((sum, touch) => sum + touch.responseTime, 0) / recentTouches.length;
    this.metrics.touchResponseTime = Math.round(avgResponseTime);

    performanceMonitor.recordMetric('touch-response-time', metric.responseTime, 'mobile');
  }

  private recordNavigationMetric(entry: PerformanceNavigationTiming): void {
    performanceMonitor.recordMetric('page-load-time', entry.loadEventEnd - entry.fetchStart, 'mobile');
    performanceMonitor.recordMetric('dom-interactive', entry.domInteractive - entry.fetchStart, 'mobile');
  }

  private recordResourceMetric(entry: PerformanceResourceTiming): void {
    const loadTime = entry.responseEnd - entry.requestStart;
    performanceMonitor.recordMetric('resource-load-time', loadTime, 'mobile', {
      tags: { resourceType: this.getResourceType(entry.name) }
    });
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.webp')) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  getCurrentMetrics(): MobilePerformanceMetrics {
    return { ...this.metrics };
  }

  getDetailedReport(): PerformanceReport {
    const deviceProfiler = DeviceProfiler.getInstance();
    const deviceProfile = deviceProfiler.getDeviceProfile();

    const touchMetrics = this.calculateTouchMetrics();
    const memoryMetrics = this.calculateMemoryMetrics();
    const animationMetrics = this.calculateAnimationMetrics();
    const networkMetrics = this.calculateNetworkMetrics();
    const batteryMetrics = this.calculateBatteryMetrics();

    const overallScore = this.calculateOverallScore(
      touchMetrics, memoryMetrics, animationMetrics, networkMetrics, batteryMetrics
    );

    const recommendations = this.generateRecommendations(
      deviceProfile, touchMetrics, memoryMetrics, animationMetrics, networkMetrics, batteryMetrics
    );

    return {
      deviceClass: deviceProfile.class,
      overallScore,
      metrics: {
        touch: touchMetrics,
        memory: memoryMetrics,
        animation: animationMetrics,
        network: networkMetrics,
        battery: batteryMetrics
      },
      recommendations,
      timestamp: new Date()
    };
  }

  private calculateTouchMetrics(): TouchPerformanceMetrics {
    if (this.touchMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 100,
        gestureAccuracy: 100,
        missedTouches: 0,
        multiTouchLatency: 0
      };
    }

    const recentTouches = this.touchMetrics.slice(-20);
    const avgResponseTime = recentTouches.reduce((sum, touch) => sum + touch.responseTime, 0) / recentTouches.length;

    // Estimate success rate based on response times
    const successfulTouches = recentTouches.filter(touch => touch.responseTime < 200).length;
    const successRate = (successfulTouches / recentTouches.length) * 100;

    return {
      averageResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate),
      gestureAccuracy: Math.min(100, successRate + 5), // Estimate
      missedTouches: recentTouches.length - successfulTouches,
      multiTouchLatency: avgResponseTime * 0.8 // Estimate
    };
  }

  private calculateMemoryMetrics(): MemoryPerformanceMetrics {
    if (!('memory' in performance) || !performance.memory) {
      return {
        heapUsed: 0,
        heapTotal: 0,
        fragmentation: 0,
        gcPressure: 0,
        leakDetection: 0,
        audioBufferUsage: 0
      };
    }

    const memory = performance.memory;
    const heapUsed = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const heapTotal = Math.round(memory.totalJSHeapSize / 1024 / 1024);
    const fragmentation = heapTotal > 0 ? ((heapTotal - heapUsed) / heapTotal) * 100 : 0;

    // Estimate GC pressure based on heap usage
    const gcPressure = Math.min(100, (heapUsed / heapTotal) * 150);

    return {
      heapUsed,
      heapTotal,
      fragmentation: Math.round(fragmentation),
      gcPressure: Math.round(gcPressure),
      leakDetection: 0, // Would need more sophisticated tracking
      audioBufferUsage: Math.round(heapUsed * 0.3) // Estimate
    };
  }

  private calculateAnimationMetrics(): AnimationPerformanceMetrics {
    if (this.frameMetrics.length === 0) {
      return {
        averageFPS: 60,
        frameDrops: 0,
        jankScore: 0,
        gpuAcceleration: true,
        animationEfficiency: 100,
        scrollPerformance: 100
      };
    }

    const recentFrames = this.frameMetrics.slice(-60); // Last second at 60fps
    const avgFPS = recentFrames.reduce((sum, frame) => sum + frame.fps, 0) / recentFrames.length;
    const frameDrops = recentFrames.filter(frame => frame.fps < 55).length;
    const jankScore = (frameDrops / recentFrames.length) * 100;

    return {
      averageFPS: Math.round(avgFPS),
      frameDrops,
      jankScore: Math.round(jankScore),
      gpuAcceleration: this.checkGPUAcceleration(),
      animationEfficiency: Math.max(0, Math.min(100, avgFPS)),
      scrollPerformance: Math.max(0, Math.min(100, avgFPS * 1.2))
    };
  }

  private calculateNetworkMetrics(): NetworkPerformanceMetrics {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    return {
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 100,
      saveData: connection?.saveData || false,
      requestLatency: 150, // Estimate based on network type
      throughput: connection?.downlink ? connection.downlink * 1024 * 1024 / 8 : 1000000
    };
  }

  private calculateBatteryMetrics(): BatteryPerformanceMetrics {
    // Default values if battery API not available
    return {
      level: this.metrics.batteryLevel,
      charging: false, // Default assumption
      dischargeRate: 0.1, // Estimate
      powerConsumption: 50, // Estimate
      temperature: 25, // Normal operating temperature
      healthStatus: this.metrics.batteryLevel > 0.5 ? 'good' : this.metrics.batteryLevel > 0.2 ? 'fair' : 'poor'
    };
  }

  private checkGPUAcceleration(): boolean {
    // Simple check for GPU acceleration support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  }

  private calculateOverallScore(
    touch: TouchPerformanceMetrics,
    memory: MemoryPerformanceMetrics,
    animation: AnimationPerformanceMetrics,
    network: NetworkPerformanceMetrics,
    battery: BatteryPerformanceMetrics
  ): number {
    const scores = [
      Math.max(0, Math.min(100, 100 - (touch.averageResponseTime - 50))), // Touch score
      Math.max(0, Math.min(100, 100 - memory.gcPressure)), // Memory score
      Math.max(0, Math.min(100, animation.averageFPS * 1.5)), // Animation score
      Math.max(0, Math.min(100, (network.downlink / 20) * 100)), // Network score
      battery.level * 100 // Battery score
    ];

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private generateRecommendations(
    device: DeviceProfile,
    touch: TouchPerformanceMetrics,
    memory: MemoryPerformanceMetrics,
    animation: AnimationPerformanceMetrics,
    network: NetworkPerformanceMetrics,
    battery: BatteryPerformanceMetrics
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Touch recommendations
    if (touch.averageResponseTime > 150) {
      recommendations.push({
        category: 'touch',
        priority: 'high',
        title: 'Slow Touch Response',
        description: `Touch responses are averaging ${touch.averageResponseTime}ms, which is above optimal levels.`,
        action: 'Enable touch optimization and reduce gesture complexity',
        impact: 25
      });
    }

    // Memory recommendations
    if (memory.gcPressure > 70) {
      recommendations.push({
        category: 'memory',
        priority: 'critical',
        title: 'High Memory Pressure',
        description: `GC pressure is at ${memory.gcPressure}%, indicating frequent garbage collection.`,
        action: 'Reduce cache sizes and implement object pooling',
        impact: 40
      });
    }

    // Animation recommendations
    if (animation.averageFPS < 45) {
      recommendations.push({
        category: 'animation',
        priority: 'high',
        title: 'Low Animation Performance',
        description: `Average FPS is ${animation.averageFPS}, below the optimal 60fps.`,
        action: 'Enable GPU acceleration and reduce animation complexity',
        impact: 30
      });
    }

    // Network recommendations
    if (network.effectiveType === 'slow-2g' || network.effectiveType === '2g') {
      recommendations.push({
        category: 'network',
        priority: 'medium',
        title: 'Slow Network Connection',
        description: `Network type is ${network.effectiveType}, which may impact performance.`,
        action: 'Implement aggressive caching and reduce request sizes',
        impact: 20
      });
    }

    // Battery recommendations
    if (battery.healthStatus === 'poor') {
      recommendations.push({
        category: 'battery',
        priority: 'medium',
        title: 'Poor Battery Health',
        description: 'Battery health is poor, which may affect sustained performance.',
        action: 'Enable adaptive performance scaling and background optimizations',
        impact: 15
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  markPerformanceStart(name: string): void {
    this.performanceMarks.set(`start-${name}`, performance.now());
  }

  markPerformanceEnd(name: string): number {
    const startTime = this.performanceMarks.get(`start-${name}`);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(`start-${name}`);

    performanceMonitor.recordMetric(name, duration, 'mobile');
    return duration;
  }

  cleanup(): void {
    this.stopMonitoring();
    this.frameMetrics = [];
    this.touchMetrics = [];
    this.performanceMarks.clear();
  }
}

// Device profiler class
export class DeviceProfiler {
  private static instance: DeviceProfiler;
  private deviceProfile: DeviceProfile | null = null;

  static getInstance(): DeviceProfiler {
    if (!DeviceProfiler.instance) {
      DeviceProfiler.instance = new DeviceProfiler();
    }
    return DeviceProfiler.instance;
  }

  private constructor() {
    this.deviceProfile = this.analyzeDevice();
  }

  private analyzeDevice(): DeviceProfile {
    const deviceInfo = this.getDeviceInfo();
    const deviceClass = this.classifyDevice(deviceInfo);
    const capabilities = this.assessCapabilities(deviceInfo);
    const limitations = this.identifyLimitations(deviceClass, capabilities);
    const optimizations = this.recommendOptimizations(deviceClass, capabilities);
    const recommendedSettings = this.generateRecommendedSettings(deviceClass, capabilities);

    return {
      class: deviceClass,
      capabilities,
      limitations,
      optimizations,
      recommendedSettings
    };
  }

  private getDeviceInfo(): any {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const memory = (performance as any).memory;
    const connection = (navigator as any).connection;

    return {
      userAgent,
      platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: memory?.deviceMemory || 4,
      screenSize: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1
      },
      touchSupport: 'ontouchstart' in window,
      maxTouchPoints: navigator.maxTouchPoints || 1,
      connection: {
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 10,
        rtt: connection?.rtt || 100
      }
    };
  }

  private classifyDevice(deviceInfo: any): DeviceClass {
    // Memory-based classification
    const memoryScore = Math.min(100, (deviceInfo.deviceMemory / 8) * 100);

    // CPU-based classification
    const cpuScore = Math.min(100, (deviceInfo.hardwareConcurrency / 8) * 100);

    // Screen-based classification
    const screenScore = Math.min(100, (deviceInfo.screenSize.width / 1920) * 100);

    // Network-based classification
    const networkScore = deviceInfo.connection.effectiveType === '4g' ? 100 :
                        deviceInfo.connection.effectiveType === '3g' ? 60 : 30;

    const overallScore = (memoryScore + cpuScore + screenScore + networkScore) / 4;

    if (overallScore >= 80) return 'flagship';
    if (overallScore >= 60) return 'high-end';
    if (overallScore >= 40) return 'mid-range';
    return 'low-end';
  }

  private assessCapabilities(deviceInfo: any): DeviceProfile['capabilities'] {
    // GPU capability assessment
    const gpuCapability = this.assessGPUCapability(deviceInfo);

    // Memory capability assessment
    const memoryCapability = deviceInfo.deviceMemory >= 6 ? 'abundant' :
                            deviceInfo.deviceMemory >= 3 ? 'moderate' : 'limited';

    // Processor capability assessment
    const processorCapability = deviceInfo.hardwareConcurrency >= 8 ? 'fast' :
                               deviceInfo.hardwareConcurrency >= 4 ? 'moderate' : 'slow';

    // Battery capability assessment (estimate based on device age and type)
    const batteryCapability = this.estimateBatteryCapability(deviceInfo);

    // Network capability assessment
    const networkCapability = deviceInfo.connection.effectiveType === '4g' ? 'fast' :
                             deviceInfo.connection.effectiveType === '3g' ? 'moderate' : 'slow';

    return {
      gpu: gpuCapability,
      memory: memoryCapability,
      processor: processorCapability,
      battery: batteryCapability,
      network: networkCapability
    };
  }

  private assessGPUCapability(deviceInfo: any): 'basic' | 'standard' | 'advanced' {
    // Create a canvas to test WebGL capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return 'basic';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'standard';

    // Check for high-performance indicators
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    if (renderer.includes('Adreno 6') || renderer.includes('Mali-G7') ||
        renderer.includes('Apple A') || renderer.includes('Snapdragon 8')) {
      return 'advanced';
    }

    return 'standard';
  }

  private estimateBatteryCapability(deviceInfo: any): 'poor' | 'average' | 'excellent' {
    // Estimate based on device age and type from user agent
    const userAgent = deviceInfo.userAgent;
    const currentYear = new Date().getFullYear();

    // Extract device year from user agent (simplified)
    const deviceYear = this.extractDeviceYear(userAgent);
    const deviceAge = currentYear - deviceYear;

    if (deviceAge > 4) return 'poor';
    if (deviceAge > 2) return 'average';
    return 'excellent';
  }

  private extractDeviceYear(userAgent: string): number {
    // Simple extraction - in practice this would be more sophisticated
    const currentYear = new Date().getFullYear();

    // Look for year patterns in user agent
    const yearMatch = userAgent.match(/20[0-9]{2}/);
    if (yearMatch) {
      return parseInt(yearMatch[0]);
    }

    // Fallback estimation based on device indicators
    if (userAgent.includes('iPhone 13') || userAgent.includes('iPhone 14') || userAgent.includes('iPhone 15')) {
      return currentYear;
    }
    if (userAgent.includes('iPhone 11') || userAgent.includes('iPhone 12')) {
      return currentYear - 2;
    }

    return currentYear - 3; // Conservative estimate
  }

  private identifyLimitations(deviceClass: DeviceClass, capabilities: DeviceProfile['capabilities']): string[] {
    const limitations: string[] = [];

    if (deviceClass === 'low-end') {
      limitations.push('Limited memory availability', 'Slower processing', 'Basic GPU capabilities');
    }

    if (capabilities.memory === 'limited') {
      limitations.push('Memory constraints require aggressive optimization');
    }

    if (capabilities.gpu === 'basic') {
      limitations.push('Limited GPU acceleration support');
    }

    if (capabilities.processor === 'slow') {
      limitations.push('CPU-intensive operations may cause delays');
    }

    if (capabilities.network === 'slow') {
      limitations.push('Network operations may be slow');
    }

    return limitations;
  }

  private recommendOptimizations(deviceClass: DeviceClass, capabilities: DeviceProfile['capabilities']): string[] {
    const optimizations: string[] = [];

    // Class-based optimizations
    if (deviceClass === 'low-end') {
      optimizations.push('Reduce animation complexity', 'Limit concurrent operations', 'Use aggressive caching');
    } else if (deviceClass === 'mid-range') {
      optimizations.push('Moderate animation settings', 'Optimize memory usage', 'Enable selective GPU acceleration');
    }

    // Capability-based optimizations
    if (capabilities.gpu === 'basic') {
      optimizations.push('Prefer CSS animations over WebGL', 'Use transform-based animations');
    }

    if (capabilities.memory === 'limited') {
      optimizations.push('Implement object pooling', 'Reduce cache sizes', 'Use lazy loading');
    }

    if (capabilities.network === 'slow') {
      optimizations.push('Enable request batching', 'Use aggressive compression', 'Implement offline support');
    }

    return optimizations;
  }

  private generateRecommendedSettings(deviceClass: DeviceClass, capabilities: DeviceProfile['capabilities']): PerformanceSettings {
    const baseSettings: PerformanceSettings = {
      animations: {
        enabled: true,
        complexity: deviceClass === 'low-end' ? 'minimal' : deviceClass === 'mid-range' ? 'standard' : 'enhanced',
        fps: deviceClass === 'low-end' ? 30 : deviceClass === 'mid-range' ? 45 : 60,
        gpuAcceleration: capabilities.gpu !== 'basic'
      },
      touch: {
        responseTimeTarget: deviceClass === 'low-end' ? 200 : 150,
        gestureThresholds: {
          minSwipeDistance: deviceClass === 'low-end' ? 15 : 10,
          maxSwipeTime: 500,
          minLongPressDuration: deviceClass === 'low-end' ? 600 : 500,
          doubleTapMaxTime: deviceClass === 'low-end' ? 400 : 300
        },
        feedbackEnabled: true
      },
      memory: {
        maxHeapUsage: capabilities.memory === 'limited' ? 50 : capabilities.memory === 'moderate' ? 100 : 200,
        gcAggressiveness: capabilities.memory === 'limited' ? 80 : 60,
        cacheSize: capabilities.memory === 'limited' ? 10 : 50,
        preloadLimit: capabilities.memory === 'limited' ? 1 : 3
      },
      network: {
        batchSize: capabilities.network === 'slow' ? 5 : 10,
        timeoutDuration: capabilities.network === 'slow' ? 10000 : 5000,
        retryAttempts: capabilities.network === 'slow' ? 1 : 3,
        compressionEnabled: true
      },
      battery: {
        lowPowerMode: false,
        adaptiveQuality: true,
        backgroundProcessing: capabilities.battery !== 'poor'
      }
    };

    return baseSettings;
  }

  getDeviceProfile(): DeviceProfile {
    return this.deviceProfile!;
  }

  updateProfile(): void {
    this.deviceProfile = this.analyzeDevice();
  }
}

// Performance optimizer class
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private deviceProfiler: DeviceProfiler;
  private performanceMonitor: MobilePerformanceMonitor;
  private optimizationRules: Map<string, OptimizationRule> = new Map();
  private isOptimizing: boolean = false;

  private constructor() {
    this.deviceProfiler = DeviceProfiler.getInstance();
    this.performanceMonitor = MobilePerformanceMonitor.getInstance();
    this.initializeOptimizationRules();
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private initializeOptimizationRules(): void {
    // Memory optimization rules
    this.optimizationRules.set('memory-pressure', {
      condition: () => this.getMemoryPressure() > 80,
      action: () => this.optimizeMemory(),
      priority: 'critical',
      cooldown: 30000
    });

    // Animation performance rules
    this.optimizationRules.set('low-fps', {
      condition: () => this.getCurrentFPS() < 45,
      action: () => this.optimizeAnimations(),
      priority: 'high',
      cooldown: 15000
    });

    // Network optimization rules
    this.optimizationRules.set('slow-network', {
      condition: () => this.isSlowNetwork(),
      action: () => this.optimizeNetworkRequests(),
      priority: 'medium',
      cooldown: 60000
    });

    // Battery optimization rules
    this.optimizationRules.set('low-battery', {
      condition: () => this.isLowBattery(),
      action: () => this.optimizeForBattery(),
      priority: 'medium',
      cooldown: 120000
    });
  }

  startOptimization(): void {
    if (this.isOptimizing) return;

    this.isOptimizing = true;
    this.performanceMonitor.startMonitoring();

    // Run optimization loop
    const optimize = () => {
      if (!this.isOptimizing) return;

      this.runOptimizationRules();
      setTimeout(optimize, 5000); // Check every 5 seconds
    };

    optimize();
  }

  stopOptimization(): void {
    this.isOptimizing = false;
    this.performanceMonitor.stopMonitoring();
  }

  private runOptimizationRules(): void {
    const now = Date.now();
    const deviceProfile = this.deviceProfiler.getDeviceProfile();

    this.optimizationRules.forEach((rule, key) => {
      const lastExecution = this.getLastExecutionTime(key);

      if (now - lastExecution >= rule.cooldown && rule.condition()) {
        console.log(`Executing optimization rule: ${key}`);
        rule.action();
        this.setLastExecutionTime(key, now);

        performanceMonitor.recordMetric(`optimization-executed`, key, 'mobile');
      }
    });
  }

  private optimizeMemory(): void {
    const deviceProfile = this.deviceProfiler.getDeviceProfile();
    const settings = deviceProfile.recommendedSettings.memory;

    // Trigger garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    // Clear caches
    this.clearCaches();

    // Reduce cache sizes
    this.reduceCacheSizes(settings.cacheSize);

    // Notify components to reduce memory usage
    this.notifyMemoryOptimization();

    performanceMonitor.recordMetric('memory-optimization-applied', 1, 'mobile');
  }

  private optimizeAnimations(): void {
    const deviceProfile = this.deviceProfiler.getDeviceProfile();
    const settings = deviceProfile.recommendedSettings.animations;

    // Reduce animation complexity
    if (settings.complexity === 'minimal') {
      document.body.classList.add('minimal-animations');
    }

    // Reduce frame rate
    this.setTargetFrameRate(settings.fps);

    // Optimize scroll performance
    this.optimizeScrollPerformance();

    performanceMonitor.recordMetric('animation-optimization-applied', 1, 'mobile');
  }

  private optimizeNetworkRequests(): void {
    const deviceProfile = this.deviceProfiler.getDeviceProfile();
    const settings = deviceProfile.recommendedSettings.network;

    // Enable request batching
    this.enableRequestBatching(settings.batchSize);

    // Increase timeout duration
    this.updateNetworkTimeouts(settings.timeoutDuration);

    // Enable compression
    if (settings.compressionEnabled) {
      this.enableCompression();
    }

    performanceMonitor.recordMetric('network-optimization-applied', 1, 'mobile');
  }

  private optimizeForBattery(): void {
    const deviceProfile = this.deviceProfiler.getDeviceProfile();
    const settings = deviceProfile.recommendedSettings.battery;

    // Enable low power mode
    settings.lowPowerMode = true;

    // Reduce animation complexity
    document.body.classList.add('battery-saver');

    // Disable background processing
    settings.backgroundProcessing = false;

    // Enable adaptive quality
    if (settings.adaptiveQuality) {
      this.enableAdaptiveQuality();
    }

    performanceMonitor.recordMetric('battery-optimization-applied', 1, 'mobile');
  }

  private getMemoryPressure(): number {
    if (!('memory' in performance) || !performance.memory) {
      return 0;
    }

    const memory = performance.memory;
    return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  }

  private getCurrentFPS(): number {
    const metrics = this.performanceMonitor.getDetailedReport();
    return metrics.metrics.animation.averageFPS;
  }

  private isSlowNetwork(): boolean {
    const connection = (navigator as any).connection;
    return connection ? connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' : false;
  }

  private isLowBattery(): boolean {
    const metrics = this.performanceMonitor.getCurrentMetrics();
    return metrics.batteryLevel < 0.2 || metrics.isLowPowerMode;
  }

  private clearCaches(): void {
    // Clear image cache
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src) {
        const url = new URL(img.src);
        url.searchParams.set('t', Date.now().toString());
        img.src = url.toString();
      }
    });

    // Clear service worker cache if available
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      });
    }
  }

  private reduceCacheSizes(maxSize: number): void {
    // Emit event for components to reduce cache sizes
    window.dispatchEvent(new CustomEvent('reduce-cache-size', { detail: { maxSize } }));
  }

  private notifyMemoryOptimization(): void {
    window.dispatchEvent(new CustomEvent('memory-optimization'));
  }

  private setTargetFrameRate(fps: number): number {
    const targetFrameTime = 1000 / fps;
    let lastFrameTime = performance.now();

    const frameLimiter = () => {
      const now = performance.now();
      const elapsed = now - lastFrameTime;

      if (elapsed >= targetFrameTime) {
        lastFrameTime = now - (elapsed % targetFrameTime);
        requestAnimationFrame(frameLimiter);
      } else {
        setTimeout(() => requestAnimationFrame(frameLimiter), targetFrameTime - elapsed);
      }
    };

    return targetFrameTime;
  }

  private optimizeScrollPerformance(): void {
    // Enable passive event listeners
    const scrollContainer = document.querySelector('[data-scroll-container]') || document;

    scrollContainer.addEventListener('scroll', () => {}, { passive: true });

    // Enable CSS containment for better scroll performance
    if ('CSS' in window && CSS.supports('contain', 'layout style paint')) {
      document.body.style.contain = 'layout style paint';
    }
  }

  private enableRequestBatching(batchSize: number): void {
    // Emit event for request batching
    window.dispatchEvent(new CustomEvent('enable-request-batching', { detail: { batchSize } }));
  }

  private updateNetworkTimeouts(timeout: number): void {
    // Update fetch timeout
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      return originalFetch(input, { ...init, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
    };
  }

  private enableCompression(): void {
    // Emit event for compression
    window.dispatchEvent(new CustomEvent('enable-compression'));
  }

  private enableAdaptiveQuality(): void {
    // Emit event for adaptive quality
    window.dispatchEvent(new CustomEvent('enable-adaptive-quality'));
  }

  private getLastExecutionTime(ruleKey: string): number {
    const time = localStorage.getItem(`optimization-last-${ruleKey}`);
    return time ? parseInt(time) : 0;
  }

  private setLastExecutionTime(ruleKey: string, time: number): void {
    localStorage.setItem(`optimization-last-${ruleKey}`, time.toString());
  }

  applyCustomOptimization(rule: OptimizationRule): void {
    this.optimizationRules.set(`custom-${Date.now()}`, rule);
  }

  removeOptimization(ruleKey: string): void {
    this.optimizationRules.delete(ruleKey);
  }

  getOptimizationStatus(): {
    isOptimizing: boolean;
    activeRules: string[];
    lastOptimizations: Record<string, number>;
  } {
    const activeRules: string[] = [];
    const lastOptimizations: Record<string, number> = {};

    this.optimizationRules.forEach((rule, key) => {
      if (rule.condition()) {
        activeRules.push(key);
      }
      lastOptimizations[key] = this.getLastExecutionTime(key);
    });

    return {
      isOptimizing: this.isOptimizing,
      activeRules,
      lastOptimizations
    };
  }

  cleanup(): void {
    this.stopOptimization();
    this.optimizationRules.clear();
  }
}

// Memory manager class
export class MemoryManager {
  private static instance: MemoryManager;
  private pools: Map<string, ObjectPool> = new Map();
  private allocations: Map<string, MemoryAllocation> = new Map();
  private cleanupTasks: (() => void)[] = [];
  private isMonitoring: boolean = false;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private constructor() {
    this.initializePools();
    this.startMemoryMonitoring();
  }

  private initializePools(): void {
    // Create pools for common object types
    this.createPool('vectors', () => ({ x: 0, y: 0, z: 0 }), 50);
    this.createPool('matrices', () => ({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }), 20);
    this.createPool('audioBuffers', () => new Float32Array(1024), 10);
    this.createPool('arrays', () => [], 100);
  }

  private startMemoryMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Monitor memory usage
    setInterval(() => {
      this.checkMemoryPressure();
    }, 5000);

    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performBackgroundCleanup();
      }
    });
  }

  createPool<T>(name: string, factory: () => T, maxSize: number): ObjectPool<T> {
    const pool: ObjectPool<T> = {
      name,
      factory,
      objects: [],
      maxSize,
      created: 0,
      acquired: 0,
      released: 0
    };

    this.pools.set(name, pool);
    return pool;
  }

  acquire<T>(poolName: string): T | null {
    const pool = this.pools.get(poolName) as ObjectPool<T>;
    if (!pool) return null;

    pool.acquired++;

    if (pool.objects.length > 0) {
      return pool.objects.pop()!;
    }

    pool.created++;
    return pool.factory();
  }

  release<T>(poolName: string, object: T): void {
    const pool = this.pools.get(poolName) as ObjectPool<T>;
    if (!pool || pool.objects.length >= pool.maxSize) return;

    // Reset object state
    this.resetObject(object);

    pool.objects.push(object);
    pool.released++;
  }

  private resetObject(object: any): void {
    if (typeof object === 'object' && object !== null) {
      if (Array.isArray(object)) {
        object.length = 0;
      } else {
        Object.keys(object).forEach(key => {
          if (typeof object[key] === 'number') {
            object[key] = 0;
          } else if (typeof object[key] === 'boolean') {
            object[key] = false;
          } else if (typeof object[key] === 'string') {
            object[key] = '';
          }
        });
      }
    }
  }

  allocate(name: string, size: number, metadata?: any): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const allocation: MemoryAllocation = {
      id,
      name,
      size,
      timestamp: Date.now(),
      metadata
    };

    this.allocations.set(id, allocation);
    return id;
  }

  deallocate(id: string): void {
    this.allocations.delete(id);
  }

  private checkMemoryPressure(): void {
    if (!('memory' in performance) || !performance.memory) return;

    const memory = performance.memory;
    const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    if (usage > 85) {
      this.performEmergencyCleanup();
    } else if (usage > 70) {
      this.performRoutineCleanup();
    }
  }

  private performEmergencyCleanup(): void {
    console.warn('High memory pressure detected, performing emergency cleanup');

    // Clear all pools
    this.pools.forEach(pool => {
      pool.objects = [];
    });

    // Clear old allocations
    const now = Date.now();
    const cutoff = now - (5 * 60 * 1000); // 5 minutes

    for (const [id, allocation] of this.allocations.entries()) {
      if (allocation.timestamp < cutoff) {
        this.allocations.delete(id);
      }
    }

    // Run cleanup tasks
    this.cleanupTasks.forEach(task => task());

    // Trigger garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    performanceMonitor.recordMetric('emergency-memory-cleanup', 1, 'mobile');
  }

  private performRoutineCleanup(): void {
    console.log('Performing routine memory cleanup');

    // Reduce pool sizes
    this.pools.forEach(pool => {
      const targetSize = Math.floor(pool.maxSize * 0.5);
      pool.objects = pool.objects.slice(0, targetSize);
    });

    // Clear very old allocations
    const now = Date.now();
    const cutoff = now - (10 * 60 * 1000); // 10 minutes

    for (const [id, allocation] of this.allocations.entries()) {
      if (allocation.timestamp < cutoff) {
        this.allocations.delete(id);
      }
    }

    performanceMonitor.recordMetric('routine-memory-cleanup', 1, 'mobile');
  }

  private performBackgroundCleanup(): void {
    console.log('App in background, performing cleanup');

    // Clear all pools
    this.pools.forEach(pool => {
      pool.objects = [];
    });

    // Run cleanup tasks
    this.cleanupTasks.forEach(task => task());
  }

  addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  removeCleanupTask(task: () => void): void {
    const index = this.cleanupTasks.indexOf(task);
    if (index !== -1) {
      this.cleanupTasks.splice(index, 1);
    }
  }

  getMemoryStats(): {
    pools: Record<string, any>;
    allocations: number;
    totalAllocatedSize: number;
  } {
    const pools: Record<string, any> = {};

    this.pools.forEach((pool, name) => {
      pools[name] = {
        size: pool.objects.length,
        maxSize: pool.maxSize,
        created: pool.created,
        acquired: pool.acquired,
        released: pool.released
      };
    });

    let totalAllocatedSize = 0;
    this.allocations.forEach(allocation => {
      totalAllocatedSize += allocation.size;
    });

    return {
      pools,
      allocations: this.allocations.size,
      totalAllocatedSize
    };
  }

  optimizeAudioBuffers(): void {
    // Special optimization for audio buffers
    const audioPool = this.pools.get('audioBuffers');
    if (audioPool) {
      // Reduce pool size when not playing
      const targetSize = document.visibilityState === 'visible' ? audioPool.maxSize : 2;
      audioPool.objects = audioPool.objects.slice(0, targetSize);
    }
  }

  cleanup(): void {
    this.pools.clear();
    this.allocations.clear();
    this.cleanupTasks = [];
    this.isMonitoring = false;
  }
}

// Animation optimizer class
export class AnimationOptimizer {
  private static instance: AnimationOptimizer;
  private animationFrames: Map<string, AnimationFrame> = new Map();
  private frameQueue: AnimationTask[] = [];
  private isProcessingQueue: boolean = false;
  private targetFPS: number = 60;
  private frameTime: number = 1000 / 60;
  private lastFrameTime: number = 0;

  static getInstance(): AnimationOptimizer {
    if (!AnimationOptimizer.instance) {
      AnimationOptimizer.instance = new AnimationOptimizer();
    }
    return AnimationOptimizer.instance;
  }

  private constructor() {
    this.setupRAF();
  }

  private setupRAF(): void {
    const optimizedRAF = (callback: FrameRequestCallback): number => {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      this.frameQueue.push({
        id: taskId,
        callback,
        priority: 'normal',
        timestamp: Date.now()
      });

      if (!this.isProcessingQueue) {
        this.processFrameQueue();
      }

      return parseInt(taskId);
    };

    // Override requestAnimationFrame
    window.requestAnimationFrame = optimizedRAF;
  }

  private processFrameQueue(): void {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    const processFrame = (currentTime: number) => {
      if (currentTime - this.lastFrameTime >= this.frameTime) {
        // Sort queue by priority
        this.frameQueue.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        // Process high-priority tasks first
        const criticalTasks = this.frameQueue.filter(task => task.priority === 'critical');
        const otherTasks = this.frameQueue.filter(task => task.priority !== 'critical');

        // Execute critical tasks
        criticalTasks.forEach(task => {
          task.callback(currentTime);
          this.removeTask(task.id);
        });

        // Execute some normal tasks
        const tasksToExecute = otherTasks.slice(0, Math.max(1, Math.floor(otherTasks.length / 2)));
        tasksToExecute.forEach(task => {
          task.callback(currentTime);
          this.removeTask(task.id);
        });

        this.lastFrameTime = currentTime;
      }

      if (this.frameQueue.length > 0) {
        requestAnimationFrame(processFrame);
      } else {
        this.isProcessingQueue = false;
      }
    };

    requestAnimationFrame(processFrame);
  }

  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(1, Math.min(120, fps));
    this.frameTime = 1000 / this.targetFPS;
  }

  scheduleAnimation(
    element: HTMLElement,
    keyframes: Keyframe[],
    options?: KeyframeAnimationOptions,
    priority: AnimationTask['priority'] = 'normal'
  ): string {
    const animationId = `anim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const animationFrame: AnimationFrame = {
      id: animationId,
      element,
      keyframes,
      options: options || {},
      priority,
      startTime: Date.now(),
      isActive: true
    };

    this.animationFrames.set(animationId, animationFrame);

    // Optimize animation based on device capabilities
    this.optimizeAnimation(animationFrame);

    return animationId;
  }

  private optimizeAnimation(animationFrame: AnimationFrame): void {
    const deviceProfiler = DeviceProfiler.getInstance();
    const deviceProfile = deviceProfiler.getDeviceProfile();

    // Reduce complexity for low-end devices
    if (deviceProfile.class === 'low-end') {
      // Reduce number of keyframes
      if (animationFrame.keyframes.length > 10) {
        animationFrame.keyframes = animationFrame.keyframes.filter((_, index) => index % 2 === 0);
      }

      // Reduce duration
      if (animationFrame.options.duration) {
        animationFrame.options.duration = Math.min(300, animationFrame.options.duration as number);
      }

      // Disable easing
      animationFrame.options.easing = 'linear';
    }

    // Enable GPU acceleration
    if (deviceProfile.capabilities.gpu !== 'basic') {
      animationFrame.element.style.transform = 'translateZ(0)';
      animationFrame.element.style.willChange = 'transform, opacity';
    }

    // Create the animation
    const animation = animationFrame.element.animate(animationFrame.keyframes, animationFrame.options);

    // Clean up after animation
    animation.addEventListener('finish', () => {
      this.cleanupAnimation(animationFrame.id);
    });
  }

  cancelAnimation(animationId: string): void {
    const animationFrame = this.animationFrames.get(animationId);
    if (animationFrame) {
      const animations = animationFrame.element.getAnimations();
      animations.forEach(animation => {
        if (animation.startTime === animationFrame.startTime) {
          animation.cancel();
        }
      });
      this.cleanupAnimation(animationId);
    }
  }

  private cleanupAnimation(animationId: string): void {
    const animationFrame = this.animationFrames.get(animationId);
    if (animationFrame) {
      // Clean up will-change
      animationFrame.element.style.willChange = '';
      this.animationFrames.delete(animationId);
    }
  }

  private removeTask(taskId: string): void {
    const index = this.frameQueue.findIndex(task => task.id === taskId);
    if (index !== -1) {
      this.frameQueue.splice(index, 1);
    }
  }

  optimizeScrollAnimations(): void {
    let ticking = false;

    const updateScrollAnimations = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.updateScrollBasedAnimations();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', updateScrollAnimations, { passive: true });
  }

  private updateScrollBasedAnimations(): void {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;

    this.animationFrames.forEach(animationFrame => {
      if (!animationFrame.isActive) return;

      const rect = animationFrame.element.getBoundingClientRect();
      const isInViewport = rect.top < windowHeight && rect.bottom > 0;

      if (isInViewport) {
        // Animation is in viewport, ensure it's running
        this.ensureAnimationRunning(animationFrame);
      } else {
        // Animation is outside viewport, consider pausing
        this.considerPausingAnimation(animationFrame);
      }
    });
  }

  private ensureAnimationRunning(animationFrame: AnimationFrame): void {
    const animations = animationFrame.element.getAnimations();
    animations.forEach(animation => {
      if (animation.playState === 'paused') {
        animation.play();
      }
    });
  }

  private considerPausingAnimation(animationFrame: AnimationFrame): void {
    const animations = animationFrame.element.getAnimations();
    animations.forEach(animation => {
      if (animation.playState === 'running' && animationFrame.priority !== 'critical') {
        animation.pause();
      }
    });
  }

  getAnimationStats(): {
    activeAnimations: number;
    queuedTasks: number;
    targetFPS: number;
    actualFPS: number;
  } {
    const activeAnimations = this.animationFrames.size;
    const queuedTasks = this.frameQueue.length;

    // Calculate actual FPS
    let actualFPS = this.targetFPS;
    if (this.lastFrameTime > 0) {
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastFrameTime;
      actualFPS = Math.round(1000 / deltaTime);
    }

    return {
      activeAnimations,
      queuedTasks,
      targetFPS: this.targetFPS,
      actualFPS
    };
  }

  performMaintenance(): void {
    // Clean up old animations
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [id, animationFrame] of this.animationFrames.entries()) {
      if (now - animationFrame.startTime > maxAge && !animationFrame.isActive) {
        this.animationFrames.delete(id);
      }
    }

    // Clear old frame queue tasks
    this.frameQueue = this.frameQueue.filter(task =>
      now - task.timestamp < maxAge
    );
  }

  cleanup(): void {
    // Cancel all animations
    this.animationFrames.forEach((_, id) => {
      this.cancelAnimation(id);
    });

    // Clear queue
    this.frameQueue = [];

    // Restore original requestAnimationFrame if needed
    // This would require saving the original function
  }
}

// Supporting interfaces
interface OptimizationRule {
  condition: () => boolean;
  action: () => void;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number;
}

interface ObjectPool<T> {
  name: string;
  factory: () => T;
  objects: T[];
  maxSize: number;
  created: number;
  acquired: number;
  released: number;
}

interface MemoryAllocation {
  id: string;
  name: string;
  size: number;
  timestamp: number;
  metadata?: any;
}

interface FrameMetrics {
  timestamp: number;
  duration: number;
  fps: number;
}

interface TouchMetrics {
  name: string;
  responseTime: number;
  timestamp: Date;
  type: string;
}

interface AnimationFrame {
  id: string;
  element: HTMLElement;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  priority: AnimationTask['priority'];
  startTime: number;
  isActive: boolean;
}

interface AnimationTask {
  id: string;
  callback: FrameRequestCallback;
  priority: 'critical' | 'high' | 'normal' | 'low';
  timestamp: number;
}

// Export singleton instances
export const mobilePerformanceMonitor = MobilePerformanceMonitor.getInstance();
export const deviceProfiler = DeviceProfiler.getInstance();
export const performanceOptimizer = PerformanceOptimizer.getInstance();
export const memoryManager = MemoryManager.getInstance();
export const animationOptimizer = AnimationOptimizer.getInstance();

// Initialize performance optimization
export function initializeMobilePerformanceOptimization(): void {
  deviceProfiler.updateProfile();
  performanceOptimizer.startOptimization();

  // Add performance monitoring to TanStack Query
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      performanceMonitor.recordMetric('network-status-changed', 'online', 'mobile');
    });

    window.addEventListener('offline', () => {
      performanceMonitor.recordMetric('network-status-changed', 'offline', 'mobile');
    });
  }

  performanceMonitor.recordMetric('mobile-optimization-initialized', Date.now(), 'mobile');
}

// Performance debugging utilities
export function getPerformanceDebugInfo(): {
  monitor: any;
  device: DeviceProfile;
  optimizer: any;
  memory: any;
  animations: any;
} {
  return {
    monitor: mobilePerformanceMonitor.getDetailedReport(),
    device: deviceProfiler.getDeviceProfile(),
    optimizer: performanceOptimizer.getOptimizationStatus(),
    memory: memoryManager.getMemoryStats(),
    animations: animationOptimizer.getAnimationStats()
  };
}

// Export cleanup function
export function cleanupMobilePerformanceOptimization(): void {
  performanceOptimizer.cleanup();
  memoryManager.cleanup();
  animationOptimizer.cleanup();
  mobilePerformanceMonitor.cleanup();
}
