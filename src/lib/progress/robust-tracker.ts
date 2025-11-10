/**
 * Robust Progress Tracker with Progressive Fallback System
 *
 * This module implements a three-tier fallback approach for progress tracking:
 * 1. Primary: Server-Sent Events (SSE) for real-time updates
 * 2. Secondary: Enhanced HTTP polling when SSE fails
 * 3. Tertiary: Periodic polling as final fallback
 *
 * Features:
 * - Automatic tier switching with health detection
 * - Real-time connection health assessment
 * - Intelligent retry logic with exponential backoff
 * - Mobile-specific optimizations
 * - Battery-aware fallback strategies
 * - Network condition monitoring
 * - Comprehensive error classification
 */

import { progressTrackerManager } from "@/lib/db/progress-tracker";
import type { ProgressUpdate } from "@/types/progress";
import type { DeviceInfo } from "@/types/mobile";
import { handleError } from "@/lib/utils/error-handler";

// Connection tier types
export type ConnectionTier = "sse" | "polling" | "periodic";

// Health status types
export type HealthStatus = "healthy" | "degraded" | "critical" | "disconnected";

// Error classification types
export type ErrorType =
  | "network"
  | "server"
  | "client"
  | "timeout"
  | "rate_limit"
  | "authentication"
  | "unknown";

// Connection interface
export interface ConnectionConfig {
  tier: ConnectionTier;
  endpoint: string;
  updateInterval: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
  healthCheckInterval: number;
  lastEventId?: string;
}

// Health metrics interface
export interface HealthMetrics {
  status: HealthStatus;
  score: number; // 0-100
  consecutiveFailures: number;
  lastSuccessfulConnection: number;
  averageResponseTime: number;
  uptime: number; // percentage
  errorRate: number; // percentage
  lastHealthCheck: number;
  tierPerformance: Record<
    ConnectionTier,
    {
      successRate: number;
      averageLatency: number;
      lastUsed: number;
    }
  >;
}

// Mobile optimization config
export interface MobileOptimizationConfig {
  enabled: boolean;
  batteryAware: boolean;
  networkAdaptive: boolean;
  reducedFrequency: boolean;
  lowPowerThreshold: number; // 0-1
  updateIntervalMultipliers: Record<ConnectionTier, number>;
  aggressiveFallback: boolean; // fallback faster on mobile
}

// Fallback configuration
export interface FallbackConfig {
  maxTierTransitions: number; // Max transitions per session
  tierTransitionCooldown: number; // Minimum time between tier changes
  healthCheckTimeout: number;
  mobileOptimizations: MobileOptimizationConfig;
}

// Error classification interface
export interface ErrorClassification {
  type: ErrorType;
  severity: "low" | "medium" | "high" | "critical";
  isRecoverable: boolean;
  suggestedAction: "retry" | "fallback" | "escalate" | "abort";
  retryDelay: number;
  context?: Record<string, any>;
}

// Fallback transition event
export interface FallbackTransition {
  from: ConnectionTier;
  to: ConnectionTier;
  reason: string;
  error: ErrorClassification;
  timestamp: number;
  transitionId: string;
}

/**
 * Robust Progress Tracker Class
 *
 * Implements intelligent connection management with automatic fallback tiers.
 */
export class RobustProgressTracker {
  private jobId: string;
  private fileId: number;
  private currentTier: ConnectionTier = "sse";
  private connectionConfig: ConnectionConfig;
  private fallbackConfig: FallbackConfig;
  private healthMetrics: HealthMetrics;
  private fallbackHistory: FallbackTransition[] = [];
  private isDestroyed = false;
  private isConnecting = false;
  private lastTierTransition = 0;
  private tierTransitionCount = 0;

  // Active connection resources
  private eventSource: EventSource | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;

  // Event listeners
  private listeners: {
    onProgress?: (progress: ProgressUpdate) => void;
    onTierChange?: (transition: FallbackTransition) => void;
    onHealthChange?: (metrics: HealthMetrics) => void;
    onError?: (error: ErrorClassification) => void;
    onComplete?: () => void;
    onDisconnect?: () => void;
  } = {};

  // Device info for optimizations
  private deviceInfo?: DeviceInfo;

  constructor(
    jobId: string,
    fileId: number,
    deviceInfo?: DeviceInfo,
    config: Partial<FallbackConfig> = {},
  ) {
    this.jobId = jobId;
    this.fileId = fileId;
    this.deviceInfo = deviceInfo;

    // Initialize fallback configuration with defaults
    this.fallbackConfig = {
      maxTierTransitions: 10,
      tierTransitionCooldown: 30000, // 30 seconds
      healthCheckTimeout: 5000,
      mobileOptimizations: {
        enabled: true,
        batteryAware: true,
        networkAdaptive: true,
        reducedFrequency: true,
        lowPowerThreshold: 0.2,
        updateIntervalMultipliers: {
          sse: 1.0,
          polling: 1.5,
          periodic: 2.0,
        },
        aggressiveFallback: true,
      },
      ...config,
    };

    // Initialize connection config for SSE tier
    this.connectionConfig = this.getConnectionConfigForTier("sse");

    // Initialize health metrics
    this.healthMetrics = {
      status: "healthy",
      score: 100,
      consecutiveFailures: 0,
      lastSuccessfulConnection: 0,
      averageResponseTime: 0,
      uptime: 100,
      errorRate: 0,
      lastHealthCheck: Date.now(),
      tierPerformance: {
        sse: { successRate: 100, averageLatency: 0, lastUsed: 0 },
        polling: { successRate: 100, averageLatency: 0, lastUsed: 0 },
        periodic: { successRate: 100, averageLatency: 0, lastUsed: 0 },
      },
    };
  }

  /**
   * Start tracking progress with automatic fallback management
   */
  async start(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("Cannot start destroyed tracker");
    }

    if (this.isConnecting) {
      throw new Error("Connection already in progress");
    }

    this.isConnecting = true;
    console.log(
      `RobustProgressTracker: Starting connection for job ${this.jobId}`,
    );

    try {
      // Start with initial tier (SSE)
      await this.connectToTier(this.currentTier);
      this.startHealthMonitoring();
    } catch (error) {
      console.error("RobustProgressTracker: Failed to start:", error);
      await this.handleConnectionError(error as Error, this.currentTier);
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Stop tracking and cleanup resources
   */
  async stop(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    console.log(
      `RobustProgressTracker: Stopping connection for job ${this.jobId}`,
    );
    this.isDestroyed = true;
    this.isConnecting = false;

    // Cleanup all connection resources
    this.cleanupConnections();
    this.cleanupTimers();

    // Clear listeners
    this.listeners = {};
  }

  /**
   * Set event listeners
   */
  on(event: "progress", callback: (progress: ProgressUpdate) => void): void;
  on(
    event: "tierChange",
    callback: (transition: FallbackTransition) => void,
  ): void;
  on(event: "healthChange", callback: (metrics: HealthMetrics) => void): void;
  on(event: "error", callback: (error: ErrorClassification) => void): void;
  on(event: "complete", callback: () => void): void;
  on(event: "disconnect", callback: () => void): void;
  on(event: string, callback: any): void {
    switch (event) {
      case "progress":
        this.listeners.onProgress = callback;
        break;
      case "tierChange":
        this.listeners.onTierChange = callback;
        break;
      case "healthChange":
        this.listeners.onHealthChange = callback;
        break;
      case "error":
        this.listeners.onError = callback;
        break;
      case "complete":
        this.listeners.onComplete = callback;
        break;
      case "disconnect":
        this.listeners.onDisconnect = callback;
        break;
    }
  }

  /**
   * Get current health metrics
   */
  getHealthMetrics(): HealthMetrics {
    return { ...this.healthMetrics };
  }

  /**
   * Get current connection tier
   */
  getCurrentTier(): ConnectionTier {
    return this.currentTier;
  }

  /**
   * Get fallback history
   */
  getFallbackHistory(): FallbackTransition[] {
    return [...this.fallbackHistory];
  }

  /**
   * Force fallback to next tier (for testing/debugging)
   */
  async forceFallback(reason: string = "Manual fallback"): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    const nextTier = this.getNextTier(this.currentTier);
    if (nextTier !== this.currentTier) {
      await this.transitionToTier(
        nextTier,
        {
          type: "client",
          severity: "low",
          isRecoverable: true,
          suggestedAction: "fallback",
          retryDelay: 0,
        },
        reason,
      );
    }
  }

  // Private methods

  private async connectToTier(tier: ConnectionTier): Promise<void> {
    console.log(`RobustProgressTracker: Connecting to ${tier} tier`);

    const config = this.getConnectionConfigForTier(tier);
    this.connectionConfig = config;

    switch (tier) {
      case "sse":
        await this.connectSSE();
        break;
      case "polling":
        await this.connectPolling();
        break;
      case "periodic":
        await this.connectPeriodic();
        break;
    }

    // Update tier performance metrics
    this.healthMetrics.tierPerformance[tier].lastUsed = Date.now();
  }

  private async connectSSE(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      const baseUrl = window.location.origin;
      const params = new URLSearchParams({
        updateInterval: this.connectionConfig.updateInterval.toString(),
        connectionType: "sse",
        deviceType: this.deviceInfo?.type || "desktop",
        networkType: this.deviceInfo?.networkType || "unknown",
      });

      if (this.deviceInfo?.batteryLevel !== undefined) {
        params.set("batteryLevel", this.deviceInfo.batteryLevel.toString());
      }

      if (this.deviceInfo?.isLowPowerMode) {
        params.set("isLowPowerMode", "true");
      }

      const url = `${baseUrl}/api/progress/jobs/${this.jobId}/stream?${params}`;

      this.eventSource = new EventSource(url);

      // Setup connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.eventSource?.readyState === EventSource.CONNECTING) {
          this.eventSource.close();
          this.handleConnectionError(
            new Error("SSE connection timeout"),
            "sse",
          );
        }
      }, this.connectionConfig.timeout);

      // Event handlers
      this.eventSource.onopen = () => {
        console.log("RobustProgressTracker: SSE connection established");
        this.updateHealthMetrics("healthy", 0);
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const progress = JSON.parse(event.data) as ProgressUpdate;
          this.listeners.onProgress?.(progress);
          this.updateHealthMetrics("healthy", 0);

          // Handle completion
          if (progress.status === "completed" || progress.status === "failed") {
            this.listeners.onComplete?.();
          }
        } catch (error) {
          console.error(
            "RobustProgressTracker: Failed to parse SSE message:",
            error,
          );
        }
      };

      this.eventSource.onerror = () => {
        console.error("RobustProgressTracker: SSE connection error");
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        this.handleConnectionError(new Error("SSE connection error"), "sse");
      };

      // Handle specific event types
      this.eventSource.addEventListener("error", (event) => {
        const errorData = JSON.parse((event as MessageEvent).data);
        this.listeners.onError?.(
          this.classifyError(new Error(errorData.message), "sse"),
        );
      });

      this.eventSource.addEventListener("complete", () => {
        this.listeners.onComplete?.();
      });
    } catch (error) {
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      throw error;
    }
  }

  private async connectPolling(): Promise<void> {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    try {
      // Initial request
      await this.performPollingRequest();

      // Setup periodic polling
      this.pollingTimer = setInterval(async () => {
        if (!this.isDestroyed) {
          await this.performPollingRequest();
        }
      }, this.connectionConfig.updateInterval);
    } catch (error) {
      throw error;
    }
  }

  private async connectPeriodic(): Promise<void> {
    // Similar to polling but with longer intervals and fewer retries
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    try {
      // Initial request
      await this.performPollingRequest();

      // Setup periodic polling with longer intervals
      this.pollingTimer = setInterval(async () => {
        if (!this.isDestroyed) {
          await this.performPollingRequest();
        }
      }, this.connectionConfig.updateInterval * 2);
    } catch (error) {
      throw error;
    }
  }

  private async performPollingRequest(): Promise<void> {
    try {
      const startTime = Date.now();
      const baseUrl = window.location.origin;
      const params = new URLSearchParams({
        deviceType: this.deviceInfo?.type || "desktop",
        networkType: this.deviceInfo?.networkType || "unknown",
        compactResponse: this.deviceInfo?.isLowPowerMode ? "true" : "false",
      });

      if (this.deviceInfo?.batteryLevel !== undefined) {
        params.set("batteryLevel", this.deviceInfo.batteryLevel.toString());
      }

      if (this.deviceInfo?.isLowPowerMode) {
        params.set("isLowPowerMode", "true");
      }

      const response = await fetch(
        `${baseUrl}/api/progress/jobs/${this.jobId}?${params}`,
        {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            "If-None-Match": this.connectionConfig.lastEventId || "",
          },
        },
      );

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const progress = data.data as ProgressUpdate;
          this.listeners.onProgress?.(progress);
          this.updateHealthMetrics("healthy", responseTime);

          // Handle completion
          if (progress.status === "completed" || progress.status === "failed") {
            this.listeners.onComplete?.();
          }
        }
      } else if (response.status === 304) {
        // Not modified - connection is healthy
        this.updateHealthMetrics("healthy", responseTime);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`RobustProgressTracker: Polling request failed:`, error);
      await this.handleConnectionError(error as Error, this.currentTier);
    }
  }

  private async handleConnectionError(
    error: Error,
    tier: ConnectionTier,
  ): Promise<void> {
    const errorClassification = this.classifyError(error, tier);
    this.listeners.onError?.(errorClassification);

    // Update health metrics
    this.updateHealthMetrics("degraded", 0);

    // Check if we should fallback to next tier
    if (
      errorClassification.suggestedAction === "fallback" ||
      this.healthMetrics.consecutiveFailures >=
        this.connectionConfig.retryAttempts
    ) {
      const nextTier = this.getNextTier(tier);
      if (nextTier !== tier) {
        await this.transitionToTier(
          nextTier,
          errorClassification,
          error.message,
        );
      } else {
        // No more fallback options
        console.error("RobustProgressTracker: All connection tiers exhausted");
        this.listeners.onDisconnect?.();
      }
    } else {
      // Retry current tier with backoff
      const retryDelay = Math.min(
        this.connectionConfig.retryDelay *
          Math.pow(
            this.connectionConfig.backoffMultiplier,
            this.healthMetrics.consecutiveFailures,
          ),
        this.connectionConfig.maxRetryDelay,
      );

      setTimeout(async () => {
        if (!this.isDestroyed && !this.isConnecting) {
          try {
            await this.connectToTier(tier);
          } catch (retryError) {
            await this.handleConnectionError(retryError as Error, tier);
          }
        }
      }, retryDelay);
    }
  }

  private async transitionToTier(
    nextTier: ConnectionTier,
    error: ErrorClassification,
    reason: string,
  ): Promise<void> {
    const now = Date.now();

    // Check cooldown period
    if (
      now - this.lastTierTransition <
      this.fallbackConfig.tierTransitionCooldown
    ) {
      console.log("RobustProgressTracker: Tier transition cooldown active");
      return;
    }

    // Check max transitions
    if (this.tierTransitionCount >= this.fallbackConfig.maxTierTransitions) {
      console.error("RobustProgressTracker: Maximum tier transitions exceeded");
      this.listeners.onDisconnect?.();
      return;
    }

    console.log(
      `RobustProgressTracker: Transitioning from ${this.currentTier} to ${nextTier}`,
    );

    // Record transition
    const transition: FallbackTransition = {
      from: this.currentTier,
      to: nextTier,
      reason,
      error,
      timestamp: now,
      transitionId: `${this.currentTier}-${nextTier}-${now}`,
    };

    this.fallbackHistory.push(transition);
    this.lastTierTransition = now;
    this.tierTransitionCount++;

    // Cleanup current connection
    this.cleanupConnections();

    // Update current tier
    const previousTier = this.currentTier;
    this.currentTier = nextTier;

    // Notify listeners
    this.listeners.onTierChange?.(transition);

    // Try to connect to new tier
    try {
      await this.connectToTier(nextTier);
    } catch (error) {
      console.error(
        `RobustProgressTracker: Failed to connect to ${nextTier}:`,
        error,
      );
      await this.handleConnectionError(error as Error, nextTier);
    }
  }

  private getNextTier(currentTier: ConnectionTier): ConnectionTier {
    switch (currentTier) {
      case "sse":
        return "polling";
      case "polling":
        return "periodic";
      case "periodic":
        return "periodic"; // No more fallback options
      default:
        return "sse";
    }
  }

  private getConnectionConfigForTier(tier: ConnectionTier): ConnectionConfig {
    const baseConfig = {
      retryAttempts: 3,
      retryDelay: 1000,
      maxRetryDelay: 10000,
      backoffMultiplier: 2,
      healthCheckInterval: 5000,
    };

    let tierSpecificConfig = {
      ...baseConfig,
      tier,
      endpoint: `/api/progress/jobs/${this.jobId}`,
    };

    // Apply mobile optimizations
    if (this.fallbackConfig.mobileOptimizations.enabled && this.deviceInfo) {
      const multiplier =
        this.fallbackConfig.mobileOptimizations.updateIntervalMultipliers[tier];
      const isLowPower =
        this.deviceInfo.isLowPowerMode ||
        (this.deviceInfo.batteryLevel !== undefined &&
          this.deviceInfo.batteryLevel <
            this.fallbackConfig.mobileOptimizations.lowPowerThreshold);
      const isCellular = this.deviceInfo.networkType === "cellular";

      switch (tier) {
        case "sse":
          tierSpecificConfig = {
            ...tierSpecificConfig,
            updateInterval: 0, // Real-time
            timeout: isLowPower ? 15000 : 10000,
          };
          break;
        case "polling":
          tierSpecificConfig = {
            ...tierSpecificConfig,
            updateInterval: Math.round(
              2000 * multiplier * (isLowPower ? 2 : 1) * (isCellular ? 1.5 : 1),
            ),
            timeout: isLowPower ? 10000 : 5000,
          };
          break;
        case "periodic":
          tierSpecificConfig = {
            ...tierSpecificConfig,
            updateInterval: Math.round(
              5000 * multiplier * (isLowPower ? 3 : 1) * (isCellular ? 2 : 1),
            ),
            timeout: isLowPower ? 8000 : 3000,
            retryAttempts: 2, // Fewer retries for periodic
          };
          break;
      }
    } else {
      // Desktop configurations
      switch (tier) {
        case "sse":
          tierSpecificConfig = {
            ...tierSpecificConfig,
            updateInterval: 0,
            timeout: 10000,
          };
          break;
        case "polling":
          tierSpecificConfig = {
            ...tierSpecificConfig,
            updateInterval: 2000,
            timeout: 5000,
          };
          break;
        case "periodic":
          tierSpecificConfig = {
            ...tierSpecificConfig,
            updateInterval: 5000,
            timeout: 3000,
          };
          break;
      }
    }

    return tierSpecificConfig as ConnectionConfig;
  }

  private classifyError(
    error: Error,
    context: ConnectionTier,
  ): ErrorClassification {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection")
    ) {
      return {
        type: "network",
        severity: "medium",
        isRecoverable: true,
        suggestedAction:
          this.healthMetrics.consecutiveFailures < 2 ? "retry" : "fallback",
        retryDelay: 2000,
        context: { tier: context, originalError: error.message },
      };
    }

    // Timeout errors
    if (message.includes("timeout")) {
      return {
        type: "timeout",
        severity: "medium",
        isRecoverable: true,
        suggestedAction: "fallback",
        retryDelay: 1000,
        context: { tier: context, timeout: this.connectionConfig.timeout },
      };
    }

    // Authentication errors
    if (
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("401") ||
      message.includes("403")
    ) {
      return {
        type: "authentication",
        severity: "high",
        isRecoverable: false,
        suggestedAction: "abort",
        retryDelay: 0,
        context: { tier: context },
      };
    }

    // Rate limiting errors
    if (
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("too many requests")
    ) {
      return {
        type: "rate_limit",
        severity: "medium",
        isRecoverable: true,
        suggestedAction: "retry",
        retryDelay: 10000, // Wait longer for rate limiting
        context: { tier: context },
      };
    }

    // Server errors (5xx)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    ) {
      return {
        type: "server",
        severity: "high",
        isRecoverable: true,
        suggestedAction: "fallback",
        retryDelay: 5000,
        context: { tier: context },
      };
    }

    // Client errors (4xx, except auth)
    if (
      message.includes("400") ||
      message.includes("404") ||
      message.includes("client")
    ) {
      return {
        type: "client",
        severity: "medium",
        isRecoverable: false,
        suggestedAction: "escalate",
        retryDelay: 0,
        context: { tier: context },
      };
    }

    // Unknown errors
    return {
      type: "unknown",
      severity: "medium",
      isRecoverable: true,
      suggestedAction:
        this.healthMetrics.consecutiveFailures < 3 ? "retry" : "fallback",
      retryDelay: 3000,
      context: { tier: context, originalError: error.message },
    };
  }

  private updateHealthMetrics(
    status: HealthStatus,
    responseTime: number,
  ): void {
    const now = Date.now();

    // Update basic metrics
    this.healthMetrics.lastHealthCheck = now;
    this.healthMetrics.lastSuccessfulConnection = now;

    if (status === "healthy") {
      this.healthMetrics.consecutiveFailures = 0;
      this.healthMetrics.score = Math.min(100, this.healthMetrics.score + 10);
    } else {
      this.healthMetrics.consecutiveFailures++;
      this.healthMetrics.score = Math.max(0, this.healthMetrics.score - 20);
    }

    // Update response time (running average)
    if (responseTime > 0) {
      if (this.healthMetrics.averageResponseTime === 0) {
        this.healthMetrics.averageResponseTime = responseTime;
      } else {
        this.healthMetrics.averageResponseTime =
          (this.healthMetrics.averageResponseTime + responseTime) / 2;
      }
    }

    // Update tier-specific performance
    const tierPerf = this.healthMetrics.tierPerformance[this.currentTier];
    if (status === "healthy") {
      tierPerf.successRate = Math.min(100, tierPerf.successRate + 5);
      if (responseTime > 0) {
        if (tierPerf.averageLatency === 0) {
          tierPerf.averageLatency = responseTime;
        } else {
          tierPerf.averageLatency =
            (tierPerf.averageLatency + responseTime) / 2;
        }
      }
    } else {
      tierPerf.successRate = Math.max(0, tierPerf.successRate - 10);
    }

    // Update overall health status
    if (this.healthMetrics.score >= 80) {
      this.healthMetrics.status = "healthy";
    } else if (this.healthMetrics.score >= 50) {
      this.healthMetrics.status = "degraded";
    } else if (this.healthMetrics.score >= 20) {
      this.healthMetrics.status = "critical";
    } else {
      this.healthMetrics.status = "disconnected";
    }

    // Calculate uptime and error rate
    this.calculateHealthRatios();

    // Notify listeners
    this.listeners.onHealthChange?.(this.healthMetrics);
  }

  private calculateHealthRatios(): void {
    // Calculate uptime based on recent activity
    const recentWindow = 60000; // 1 minute
    const now = Date.now();
    const recentActivity =
      this.healthMetrics.lastSuccessfulConnection > now - recentWindow;
    this.healthMetrics.uptime = recentActivity
      ? 100
      : Math.max(0, this.healthMetrics.uptime - 10);

    // Calculate error rate based on consecutive failures
    this.healthMetrics.errorRate = Math.min(
      100,
      this.healthMetrics.consecutiveFailures * 20,
    );
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      if (!this.isDestroyed) {
        this.performHealthCheck();
      }
    }, this.fallbackConfig.healthCheckTimeout);
  }

  private async performHealthCheck(): Promise<void> {
    // Quick health check by attempting a lightweight request
    try {
      const response = await fetch(`/api/progress/jobs/${this.jobId}`, {
        method: "HEAD",
        cache: "no-cache",
      });

      if (response.ok) {
        this.updateHealthMetrics("healthy", 0);
      } else {
        this.updateHealthMetrics("degraded", 0);
      }
    } catch (error) {
      this.updateHealthMetrics("degraded", 0);

      // Consider fallback if health is consistently poor
      if (
        this.healthMetrics.status === "critical" &&
        this.currentTier !== "periodic"
      ) {
        await this.handleConnectionError(error as Error, this.currentTier);
      }
    }
  }

  private cleanupConnections(): void {
    // Cleanup SSE connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Cleanup polling timer
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    // Cleanup connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private cleanupTimers(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.cleanupConnections();
  }
}

/**
 * Factory function to create a robust progress tracker
 */
export function createRobustProgressTracker(
  jobId: string,
  fileId: number,
  deviceInfo?: DeviceInfo,
  config?: Partial<FallbackConfig>,
): RobustProgressTracker {
  return new RobustProgressTracker(jobId, fileId, deviceInfo, config);
}

/**
 * Default configuration for different device types
 */
export const DEFAULT_CONFIGS = {
  desktop: {
    maxTierTransitions: 8,
    tierTransitionCooldown: 15000, // 15 seconds
    healthCheckTimeout: 5000,
    mobileOptimizations: {
      enabled: false,
      batteryAware: false,
      networkAdaptive: false,
      reducedFrequency: false,
      lowPowerThreshold: 0.1,
      updateIntervalMultipliers: {
        sse: 1.0,
        polling: 1.0,
        periodic: 1.0,
      },
      aggressiveFallback: false,
    },
  },
  mobile: {
    maxTierTransitions: 5, // Fewer transitions on mobile
    tierTransitionCooldown: 30000, // 30 seconds
    healthCheckTimeout: 8000, // Longer timeout
    mobileOptimizations: {
      enabled: true,
      batteryAware: true,
      networkAdaptive: true,
      reducedFrequency: true,
      lowPowerThreshold: 0.2,
      updateIntervalMultipliers: {
        sse: 1.2,
        polling: 2.0,
        periodic: 3.0,
      },
      aggressiveFallback: true, // Fall back faster on mobile
    },
  },
  tablet: {
    maxTierTransitions: 6,
    tierTransitionCooldown: 20000, // 20 seconds
    healthCheckTimeout: 6000,
    mobileOptimizations: {
      enabled: true,
      batteryAware: true,
      networkAdaptive: true,
      reducedFrequency: true,
      lowPowerThreshold: 0.15,
      updateIntervalMultipliers: {
        sse: 1.1,
        polling: 1.5,
        periodic: 2.5,
      },
      aggressiveFallback: true,
    },
  },
} as const;
