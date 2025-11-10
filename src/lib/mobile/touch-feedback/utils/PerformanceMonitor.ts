/**
 * Performance Monitor for Touch Feedback System
 * Monitors and optimizes performance for smooth mobile interactions
 */

export interface PerformanceMetrics {
  fps: number;
  activeAnimations: number;
  activeRipples: number;
  memoryUsage: number;
  batteryLevel?: number;
  thermalState?: "nominal" | "fair" | "serious" | "critical";
  cpuLoad: number;
  renderTime: number;
  touchResponseTime: number;
}

export interface PerformanceThresholds {
  minFPS: number;
  maxActiveAnimations: number;
  maxActiveRipples: number;
  maxMemoryUsage: number;
  maxRenderTime: number;
  maxTouchResponseTime: number;
}

export interface OptimizationStrategy {
  mode: "quality" | "balanced" | "performance" | "battery-saver";
  enabledFeatures: {
    gpuAcceleration: boolean;
    complexAnimations: boolean;
    multiRipple: boolean;
    hapticFeedback: boolean;
    pressureSensitivity: boolean;
    gestureRecognition: boolean;
  };
  throttling: {
    animationFPS: number;
    touchEventThrottle: number;
    renderThrottle: number;
  };
  cleanup: {
    interval: number;
    maxAge: number;
    batchCleanup: boolean;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private currentStrategy: OptimizationStrategy;
  private monitoringActive = false;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsUpdateInterval = 1000;
  private lastFPSUpdate = 0;
  private animationFrameId: number | null = null;
  private performanceObservers: PerformanceObserver[] = [];
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.metrics = this.getInitialMetrics();
    this.thresholds = this.getDefaultThresholds();
    this.currentStrategy = this.getDefaultStrategy();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Get initial performance metrics
   */
  private getInitialMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      activeAnimations: 0,
      activeRipples: 0,
      memoryUsage: 0,
      batteryLevel: undefined,
      thermalState: "nominal",
      cpuLoad: 0,
      renderTime: 0,
      touchResponseTime: 0,
    };
  }

  /**
   * Get default performance thresholds
   */
  private getDefaultThresholds(): PerformanceThresholds {
    return {
      minFPS: 30,
      maxActiveAnimations: 10,
      maxActiveRipples: 15,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxRenderTime: 16.67, // 60fps target
      maxTouchResponseTime: 50,
    };
  }

  /**
   * Get default optimization strategy
   */
  private getDefaultStrategy(): OptimizationStrategy {
    return {
      mode: "balanced",
      enabledFeatures: {
        gpuAcceleration: true,
        complexAnimations: true,
        multiRipple: true,
        hapticFeedback: true,
        pressureSensitivity: true,
        gestureRecognition: true,
      },
      throttling: {
        animationFPS: 60,
        touchEventThrottle: 16,
        renderThrottle: 16,
      },
      cleanup: {
        interval: 5000,
        maxAge: 10000,
        batchCleanup: true,
      },
    };
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(): void {
    if (this.monitoringActive) return;

    this.monitoringActive = true;
    this.startFPSMonitoring();
    this.startMemoryMonitoring();
    this.startPerformanceObserver();
    this.startBatteryMonitoring();
    this.startAutomaticOptimization();

    console.log("Performance monitoring started");
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.monitoringActive) return;

    this.monitoringActive = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.performanceObservers.forEach((observer) => observer.disconnect());
    this.performanceObservers = [];

    console.log("Performance monitoring stopped");
  }

  /**
   * Start FPS monitoring
   */
  private startFPSMonitoring(): void {
    const measureFPS = (currentTime: number) => {
      if (!this.monitoringActive) return;

      this.frameCount++;

      if (currentTime - this.lastFPSUpdate >= this.fpsUpdateInterval) {
        this.metrics.fps = Math.round(
          (this.frameCount * 1000) / (currentTime - this.lastFPSUpdate),
        );
        this.frameCount = 0;
        this.lastFPSUpdate = currentTime;

        this.checkPerformanceThresholds();
      }

      this.lastFrameTime = currentTime;
      this.animationFrameId = requestAnimationFrame(measureFPS);
    };

    this.animationFrameId = requestAnimationFrame(measureFPS);
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    const measureMemory = () => {
      if (!this.monitoringActive) return;

      if ("memory" in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize;
      }

      setTimeout(measureMemory, 2000);
    };

    measureMemory();
  }

  /**
   * Start performance observer for render times
   */
  private startPerformanceObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "measure" && entry.name.includes("touch-")) {
            this.metrics.touchResponseTime = entry.duration;
          } else if (entry.entryType === "paint") {
            this.metrics.renderTime = entry.duration;
          }
        });
      });

      observer.observe({ entryTypes: ["measure", "paint"] });
      this.performanceObservers.push(observer);
    } catch (error) {
      console.warn("Performance Observer not supported:", error);
    }
  }

  /**
   * Start battery monitoring
   */
  private startBatteryMonitoring(): void {
    if ("getBattery" in navigator) {
      (navigator.getBattery as any)()
        .then((battery: any) => {
          this.metrics.batteryLevel = battery.level;
          this.metrics.thermalState = battery.thermalState || "nominal";

          battery.addEventListener("levelchange", () => {
            this.metrics.batteryLevel = battery.level;
          });

          battery.addEventListener("thermalstatechange", () => {
            this.metrics.thermalState = battery.thermalState;
          });
        })
        .catch(() => {
          // Battery API not available or permission denied
        });
    }
  }

  /**
   * Start automatic optimization
   */
  private startAutomaticOptimization(): void {
    this.cleanupTimer = setInterval(() => {
      this.performAutomaticOptimization();
      this.cleanupExpiredAnimations();
    }, this.currentStrategy.cleanup.interval);
  }

  /**
   * Check performance thresholds and adjust strategy
   */
  private checkPerformanceThresholds(): void {
    let needsOptimization = false;
    let newMode = this.currentStrategy.mode;

    if (this.metrics.fps < this.thresholds.minFPS) {
      needsOptimization = true;
      if (this.metrics.fps < 20) {
        newMode = "battery-saver";
      } else if (this.metrics.fps < 30) {
        newMode = "performance";
      }
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      needsOptimization = true;
      newMode = "battery-saver";
    }

    if (this.metrics.activeAnimations > this.thresholds.maxActiveAnimations) {
      needsOptimization = true;
      newMode = newMode === "quality" ? "balanced" : "performance";
    }

    if (needsOptimization) {
      this.optimizeForPerformance(newMode);
    }
  }

  /**
   * Optimize system for performance
   */
  public optimizeForPerformance(mode: OptimizationStrategy["mode"]): void {
    this.currentStrategy.mode = mode;
    this.currentStrategy = this.getStrategyForMode(mode);

    console.log(`Optimizing for ${mode} mode:`, this.currentStrategy);

    // Apply optimizations to touch feedback system
    this.applyOptimizations();
  }

  /**
   * Get strategy for specific mode
   */
  private getStrategyForMode(
    mode: OptimizationStrategy["mode"],
  ): OptimizationStrategy {
    const strategies: Record<
      OptimizationStrategy["mode"],
      OptimizationStrategy
    > = {
      quality: {
        mode: "quality",
        enabledFeatures: {
          gpuAcceleration: true,
          complexAnimations: true,
          multiRipple: true,
          hapticFeedback: true,
          pressureSensitivity: true,
          gestureRecognition: true,
        },
        throttling: {
          animationFPS: 60,
          touchEventThrottle: 16,
          renderThrottle: 16,
        },
        cleanup: {
          interval: 10000,
          maxAge: 15000,
          batchCleanup: false,
        },
      },
      balanced: {
        mode: "balanced",
        enabledFeatures: {
          gpuAcceleration: true,
          complexAnimations: true,
          multiRipple: true,
          hapticFeedback: true,
          pressureSensitivity: true,
          gestureRecognition: true,
        },
        throttling: {
          animationFPS: 60,
          touchEventThrottle: 32,
          renderThrottle: 32,
        },
        cleanup: {
          interval: 5000,
          maxAge: 10000,
          batchCleanup: true,
        },
      },
      performance: {
        mode: "performance",
        enabledFeatures: {
          gpuAcceleration: true,
          complexAnimations: false,
          multiRipple: false,
          hapticFeedback: true,
          pressureSensitivity: false,
          gestureRecognition: true,
        },
        throttling: {
          animationFPS: 30,
          touchEventThrottle: 50,
          renderThrottle: 50,
        },
        cleanup: {
          interval: 3000,
          maxAge: 5000,
          batchCleanup: true,
        },
      },
      "battery-saver": {
        mode: "battery-saver",
        enabledFeatures: {
          gpuAcceleration: false,
          complexAnimations: false,
          multiRipple: false,
          hapticFeedback: false,
          pressureSensitivity: false,
          gestureRecognition: false,
        },
        throttling: {
          animationFPS: 15,
          touchEventThrottle: 100,
          renderThrottle: 100,
        },
        cleanup: {
          interval: 1000,
          maxAge: 2000,
          batchCleanup: true,
        },
      },
    };

    return strategies[mode];
  }

  /**
   * Apply optimizations to the touch feedback system
   */
  private applyOptimizations(): void {
    // Update TouchFeedbackManager performance mode
    if (window.touchFeedbackManager) {
      window.touchFeedbackManager.setPerformanceMode(this.currentStrategy.mode);
    }

    // Update TouchOptimizer configuration
    if (window.touchOptimizer) {
      window.touchOptimizer.updateConfig({
        enablePassive: this.currentStrategy.enabledFeatures.gestureRecognition,
        maxDelay: this.currentStrategy.throttling.touchEventThrottle,
      });
    }

    // Update haptic feedback based on strategy
    if (
      window.hapticFeedback &&
      !this.currentStrategy.enabledFeatures.hapticFeedback
    ) {
      window.hapticFeedback.setEnabled(false);
    }
  }

  /**
   * Perform automatic optimization
   */
  private performAutomaticOptimization(): void {
    // Check current performance and adjust if needed
    if (this.metrics.fps < this.thresholds.minFPS) {
      this.optimizeForPerformance("performance");
    } else if (
      this.metrics.fps > 55 &&
      this.currentStrategy.mode !== "quality"
    ) {
      // Performance is good, can upgrade quality
      if (this.currentStrategy.mode === "battery-saver") {
        this.optimizeForPerformance("balanced");
      } else if (this.currentStrategy.mode === "performance") {
        this.optimizeForPerformance("balanced");
      }
    }

    // Battery-aware optimization
    if (
      this.metrics.batteryLevel !== undefined &&
      this.metrics.batteryLevel < 0.2
    ) {
      this.optimizeForPerformance("battery-saver");
    }
  }

  /**
   * Cleanup expired animations
   */
  private cleanupExpiredAnimations(): void {
    const now = performance.now();
    const maxAge = this.currentStrategy.cleanup.maxAge;

    // Clean up old ripples
    const ripples = document.querySelectorAll(".touch-feedback-ripple");
    ripples.forEach((ripple) => {
      const created = parseFloat(ripple.getAttribute("data-created") || "0");
      if (now - created > maxAge) {
        ripple.remove();
      }
    });

    // Clean up old animations
    const animations = document.querySelectorAll("[data-touch-animation]");
    animations.forEach((element) => {
      const created = parseFloat(
        element.getAttribute("data-animation-created") || "0",
      );
      if (now - created > maxAge) {
        element.removeAttribute("data-touch-animation");
        element.removeAttribute("data-animation-created");
      }
    });
  }

  /**
   * Measure touch response time
   */
  public measureTouchResponseTime(callback: () => void): void {
    const startTime = performance.now();
    performance.mark("touch-start");

    callback();

    performance.mark("touch-end");
    performance.measure("touch-response", "touch-start", "touch-end");

    const measure = performance.getEntriesByName("touch-response")[0];
    this.metrics.touchResponseTime = measure.duration;

    performance.clearMarks("touch-start");
    performance.clearMarks("touch-end");
    performance.clearMeasures("touch-response");
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current optimization strategy
   */
  public getCurrentStrategy(): OptimizationStrategy {
    return { ...this.currentStrategy };
  }

  /**
   * Get performance recommendations
   */
  public getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.fps < this.thresholds.minFPS) {
      recommendations.push(
        `Low FPS detected (${this.metrics.fps}). Consider reducing animation complexity.`,
      );
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      recommendations.push(
        `High memory usage (${Math.round(this.metrics.memoryUsage / 1024 / 1024)}MB). Consider more frequent cleanup.`,
      );
    }

    if (this.metrics.touchResponseTime > this.thresholds.maxTouchResponseTime) {
      recommendations.push(
        `Slow touch response (${this.metrics.touchResponseTime}ms). Consider touch event optimization.`,
      );
    }

    if (
      this.metrics.batteryLevel !== undefined &&
      this.metrics.batteryLevel < 0.2
    ) {
      recommendations.push(
        "Low battery level detected. Battery saver mode recommended.",
      );
    }

    return recommendations;
  }

  /**
   * Update performance thresholds
   */
  public updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Force garbage collection (if available)
   */
  public forceGarbageCollection(): void {
    if ("gc" in window) {
      (window as any).gc();
    }
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    const fpsScore = Math.min(100, (this.metrics.fps / 60) * 100);
    const memoryScore = Math.max(
      0,
      100 - (this.metrics.memoryUsage / this.thresholds.maxMemoryUsage) * 100,
    );
    const responseScore = Math.max(
      0,
      100 -
        (this.metrics.touchResponseTime /
          this.thresholds.maxTouchResponseTime) *
          50,
    );

    return Math.round((fpsScore + memoryScore + responseScore) / 3);
  }

  /**
   * Export performance report
   */
  public exportReport(): {
    timestamp: number;
    metrics: PerformanceMetrics;
    strategy: OptimizationStrategy;
    score: number;
    recommendations: string[];
  } {
    return {
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      strategy: this.getCurrentStrategy(),
      score: this.getPerformanceScore(),
      recommendations: this.getRecommendations(),
    };
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export convenience functions
export const startPerformanceMonitoring = () =>
  performanceMonitor.startMonitoring();
export const stopPerformanceMonitoring = () =>
  performanceMonitor.stopMonitoring();
export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const optimizeForPerformance = (mode: OptimizationStrategy["mode"]) =>
  performanceMonitor.optimizeForPerformance(mode);
