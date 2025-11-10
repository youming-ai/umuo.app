/**
 * Network Interruption Handling System with Automatic Retry (T062)
 *
 * A comprehensive system for handling network interruptions, connectivity issues,
 * and automatic retry mechanisms with intelligent backoff strategies and user feedback.
 *
 * Key Features:
 * - Real-time network status monitoring and detection
 * - Automatic retry mechanisms with exponential backoff and jitter
 * - Circuit breaker patterns for service protection
 * - Offline support with synchronization capabilities
 * - Mobile optimization with battery and data awareness
 * - Integration with existing error classification (T057) and recovery (T058) systems
 * - User-friendly feedback and notification systems
 * - Performance optimization and memory management
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { z } from "zod";
import { AppError } from "@/lib/utils/error-handler";
import {
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  classifyError,
  ErrorContext,
} from "./error-classifier";
import { RecoveryStrategy } from "./recovery-strategies";

// ============================================================================
// CORE TYPES AND INTERFACES
// ============================================================================

/**
 * Network connection types and states
 */
export enum NetworkType {
  UNKNOWN = "unknown",
  ETHERNET = "ethernet",
  WIFI = "wifi",
  CELLULAR = "cellular",
  BLUETOOTH = "bluetooth",
  WIMAX = "wimax",
  OTHER = "other",
  NONE = "none",
}

/**
 * Network quality levels
 */
export enum NetworkQuality {
  EXCELLENT = "excellent",
  GOOD = "good",
  FAIR = "fair",
  POOR = "poor",
  VERY_POOR = "very-poor",
  OFFLINE = "offline",
}

/**
 * Network effective types from Network Information API
 */
export enum NetworkEffectiveType {
  SLOW_2G = "slow-2g",
  _2G = "2g",
  _3G = "3g",
  _4G = "4g",
}

/**
 * Network status information
 */
export interface NetworkStatus {
  // Basic connectivity
  isOnline: boolean;
  isOffline: boolean;
  since?: Date;

  // Connection details
  type: NetworkType;
  effectiveType: NetworkEffectiveType;
  downlink: number; // Mbps
  rtt: number; // Round trip time in ms
  saveData: boolean;

  // Quality assessment
  quality: NetworkQuality;
  stability: "stable" | "unstable" | "very-unstable";

  // Mobile-specific
  isMobile: boolean;
  batteryLevel?: number;
  isLowPowerMode?: boolean;

  // Metrics
  timestamp: number;
  metricsHistory: NetworkMetrics[];
}

/**
 * Network metrics for historical tracking
 */
export interface NetworkMetrics {
  timestamp: number;
  isOnline: boolean;
  type: NetworkType;
  effectiveType: NetworkEffectiveType;
  downlink: number;
  rtt: number;
  quality: NetworkQuality;
}

/**
 * Retry configuration options
 */
export interface RetryConfig {
  // Basic retry settings
  maxAttempts: number;
  baseDelay: number; // Initial delay in ms
  maxDelay: number; // Maximum delay in ms
  backoffFactor: number; // Exponential backoff factor

  // Jitter and randomization
  jitter: boolean; // Add random jitter to prevent thundering herd
  jitterRange: number; // Percentage of delay to randomize (0-1)

  // Retry conditions
  retryableErrors: string[]; // Error types that should be retried
  retryableStatusCodes: number[]; // HTTP status codes to retry
  retryCondition?: (error: any, attempt: number) => boolean;

  // Advanced settings
  resetOnSuccess: boolean; // Reset retry count on success
  persistRetries: boolean; // Persist retry state across page reloads
  backgroundRetry: boolean; // Continue retrying in background

  // Mobile optimization
  batteryAwareRetries: boolean; // Reduce retries when battery is low
  dataSaverMode: "respect" | "ignore" | "adaptive";
}

/**
 * Retry state information
 */
export interface RetryState {
  attempt: number;
  maxAttempts: number;
  nextRetryTime?: Date;
  lastError?: any;
  totalDelay: number;
  isRetrying: boolean;
  canRetry: boolean;
  retryHistory: RetryAttempt[];
}

/**
 * Individual retry attempt information
 */
export interface RetryAttempt {
  attempt: number;
  timestamp: Date;
  delay: number;
  error: any;
  success: boolean;
  duration?: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  // Threshold settings
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Time to wait before trying again (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)

  // State management
  halfOpenMaxCalls: number; // Max calls in half-open state

  // Advanced settings
  successThreshold: number; // Successes needed to close circuit
  errorRateThreshold: number; // Error rate threshold (0-1)
  minimumThroughput: number; // Minimum calls before considering error rate
}

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = "closed", // Normal operation
  OPEN = "open", // Circuit is open, calls fail immediately
  HALF_OPEN = "half-open", // Testing if service has recovered
}

/**
 * Circuit breaker state information
 */
export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  errorRate: number;
  totalCalls: number;
}

/**
 * Offline sync operation
 */
export interface SyncOperation {
  id: string;
  type: "upload" | "download" | "api_call" | "mutation";
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  priority: "high" | "medium" | "low";
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
  lastAttempt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Offline storage interface
 */
export interface OfflineStorage {
  // Operations
  addOperation(operation: SyncOperation): Promise<void>;
  getOperations(filter?: { type?: string; priority?: string }): Promise<SyncOperation[]>;
  removeOperation(id: string): Promise<void>;
  updateOperation(id: string, updates: Partial<SyncOperation>): Promise<void>;

  // Storage management
  clearAll(): Promise<void>;
  getStorageInfo(): Promise<{ used: number; available: number; quota: number }>;
}

/**
 * Network event types
 */
export enum NetworkEventType {
  STATUS_CHANGED = "status_changed",
  QUALITY_CHANGED = "quality_changed",
  CONNECTION_LOST = "connection_lost",
  CONNECTION_RESTORED = "connection_restored",
  RETRY_STARTED = "retry_started",
  RETRY_SUCCESS = "retry_success",
  RETRY_FAILED = "retry_failed",
  RETRY_EXHAUSTED = "retry_exhausted",
  CIRCUIT_OPENED = "circuit_opened",
  CIRCUIT_CLOSED = "circuit_closed",
  OFFLINE_MODE_ENTERED = "offline_mode_entered",
  OFFLINE_MODE_EXITED = "offline_mode_exited",
  SYNC_STARTED = "sync_started",
  SYNC_COMPLETED = "sync_completed",
  SYNC_FAILED = "sync_failed",
}

/**
 * Network event payload
 */
export interface NetworkEvent {
  type: NetworkEventType;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

/**
 * Event listener callback
 */
export type NetworkEventListener = (event: NetworkEvent) => void;

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
  jitterRange: 0.1,
  retryableErrors: [
    "NETWORK_ERROR",
    "TIMEOUT_ERROR",
    "CONNECTION_ERROR",
    "SERVER_ERROR",
  ],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  resetOnSuccess: true,
  persistRetries: true,
  backgroundRetry: true,
  batteryAwareRetries: true,
  dataSaverMode: "adaptive",
};

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 300000, // 5 minutes
  halfOpenMaxCalls: 3,
  successThreshold: 2,
  errorRateThreshold: 0.5, // 50% error rate
  minimumThroughput: 10,
};

// ============================================================================
// NETWORK MONITOR CLASS
// ============================================================================

/**
 * Network connectivity monitoring and status tracking
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private status: NetworkStatus;
  private listeners: Map<NetworkEventType, Set<NetworkEventListener>> = new Map();
  private metricsHistory: NetworkMetrics[] = [];
  private maxHistorySize = 100;
  private monitoringInterval?: NodeJS.Timeout;
  private connection?: any;

  private constructor() {
    this.status = this.getInitialStatus();
    this.setupEventListeners();
    this.startMonitoring();
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  /**
   * Get initial network status
   */
  private getInitialStatus(): NetworkStatus {
    const connection = this.getConnection();

    return {
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      type: this.getNetworkType(connection),
      effectiveType: this.getEffectiveType(connection),
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
      quality: NetworkQuality.FAIR,
      stability: "stable",
      isMobile: this.isMobileDevice(),
      batteryLevel: undefined,
      isLowPowerMode: false,
      timestamp: Date.now(),
      metricsHistory: [],
    };
  }

  /**
   * Get network connection object
   */
  private getConnection(): any {
    if ("connection" in navigator) {
      return (navigator as any).connection;
    }
    if ("mozConnection" in navigator) {
      return (navigator as any).mozConnection;
    }
    if ("webkitConnection" in navigator) {
      return (navigator as any).webkitConnection;
    }
    return null;
  }

  /**
   * Get network type from connection object
   */
  private getNetworkType(connection?: any): NetworkType {
    if (!connection) return NetworkType.UNKNOWN;

    switch (connection.type) {
      case "ethernet":
        return NetworkType.ETHERNET;
      case "wifi":
        return NetworkType.WIFI;
      case "cellular":
        return NetworkType.CELLULAR;
      case "bluetooth":
        return NetworkType.BLUETOOTH;
      case "wimax":
        return NetworkType.WIMAX;
      case "other":
        return NetworkType.OTHER;
      case "none":
        return NetworkType.NONE;
      default:
        return NetworkType.UNKNOWN;
    }
  }

  /**
   * Get effective network type
   */
  private getEffectiveType(connection?: any): NetworkEffectiveType {
    if (!connection?.effectiveType) return NetworkEffectiveType._4G;

    switch (connection.effectiveType) {
      case "slow-2g":
        return NetworkEffectiveType.SLOW_2G;
      case "2g":
        return NetworkEffectiveType._2G;
      case "3g":
        return NetworkEffectiveType._3G;
      case "4g":
        return NetworkEffectiveType._4G;
      default:
        return NetworkEffectiveType._4G;
    }
  }

  /**
   * Check if device is mobile
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  /**
   * Setup event listeners for network changes
   */
  private setupEventListeners(): void {
    // Online/offline events
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    // Connection change events
    this.connection = this.getConnection();
    if (this.connection) {
      this.connection.addEventListener("change", this.handleConnectionChange.bind(this));
    }

    // Battery level events (if available)
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        battery.addEventListener("levelchange", this.handleBatteryChange.bind(this));
        battery.addEventListener("chargingchange", this.handleBatteryChange.bind(this));
      });
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    const wasOffline = this.status.isOffline;
    this.updateStatus({ isOnline: true, isOffline: false });

    if (wasOffline) {
      this.emitEvent(NetworkEventType.CONNECTION_RESTORED, {
        previousStatus: "offline",
        newStatus: "online",
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.updateStatus({ isOnline: false, isOffline: true });

    this.emitEvent(NetworkEventType.CONNECTION_LOST, {
      previousStatus: "online",
      newStatus: "offline",
      timestamp: new Date(),
    });
  }

  /**
   * Handle connection change event
   */
  private handleConnectionChange(): void {
    const connection = this.getConnection();
    const oldQuality = this.status.quality;

    this.updateStatus({
      type: this.getNetworkType(connection),
      effectiveType: this.getEffectiveType(connection),
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
    });

    const newQuality = this.assessNetworkQuality(this.status);
    if (newQuality !== oldQuality) {
      this.emitEvent(NetworkEventType.QUALITY_CHANGED, {
        previousQuality: oldQuality,
        newQuality,
        status: this.status,
      });
    }
  }

  /**
   * Handle battery level changes
   */
  private handleBatteryChange(): void {
    if ("getBattery" in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          this.updateStatus({
            batteryLevel: battery.level,
            isLowPowerMode: battery.level < 0.2 && !battery.charging,
          });
        })
        .catch(() => {
          // Battery API not available or permission denied
        });
    }
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Perform network health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();

      // Simple health check - fetch a small resource
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Update status with health check results
      this.updateStatus({
        isOnline: true,
        isOffline: false,
        rtt: responseTime,
      });

    } catch (error) {
      // Health check failed - might be offline or server issues
      this.updateStatus({
        isOnline: false,
        isOffline: true,
      });
    }
  }

  /**
   * Update network status
   */
  private updateStatus(updates: Partial<NetworkStatus>): void {
    const previousStatus = { ...this.status };

    // Apply updates
    this.status = {
      ...this.status,
      ...updates,
      timestamp: Date.now(),
    };

    // Update quality assessment
    this.status.quality = this.assessNetworkQuality(this.status);

    // Update stability
    this.status.stability = this.assessStability();

    // Add to history
    this.addToHistory();

    // Emit status change event
    this.emitEvent(NetworkEventType.STATUS_CHANGED, {
      previousStatus,
      currentStatus: this.status,
    });
  }

  /**
   * Assess network quality based on current metrics
   */
  private assessNetworkQuality(status: NetworkStatus): NetworkQuality {
    if (!status.isOnline) return NetworkQuality.OFFLINE;

    let qualityScore = 0;

    // Effective type scoring
    switch (status.effectiveType) {
      case NetworkEffectiveType._4G:
        qualityScore += 80;
        break;
      case NetworkEffectiveType._3G:
        qualityScore += 60;
        break;
      case NetworkEffectiveType._2G:
        qualityScore += 40;
        break;
      case NetworkEffectiveType.SLOW_2G:
        qualityScore += 20;
        break;
    }

    // Downlink speed scoring
    if (status.downlink > 10) qualityScore += 15;
    else if (status.downlink > 5) qualityScore += 10;
    else if (status.downlink > 1) qualityScore += 5;
    else if (status.downlink > 0) qualityScore += 2;

    // RTT scoring
    if (status.rtt < 100) qualityScore += 10;
    else if (status.rtt < 300) qualityScore += 5;
    else if (status.rtt < 1000) qualityScore += 2;

    // Deduct for save data mode
    if (status.saveData) qualityScore -= 10;

    // Determine quality
    if (qualityScore >= 85) return NetworkQuality.EXCELLENT;
    if (qualityScore >= 70) return NetworkQuality.GOOD;
    if (qualityScore >= 50) return NetworkQuality.FAIR;
    if (qualityScore >= 30) return NetworkQuality.POOR;
    return NetworkQuality.VERY_POOR;
  }

  /**
   * Assess network stability
   */
  private assessStability(): "stable" | "unstable" | "very-unstable" {
    if (this.metricsHistory.length < 5) return "stable";

    const recentMetrics = this.metricsHistory.slice(-10);
    const qualities = recentMetrics.map(m => m.quality);

    // Calculate quality changes
    let changes = 0;
    for (let i = 1; i < qualities.length; i++) {
      if (qualities[i] !== qualities[i - 1]) changes++;
    }

    const changeRate = changes / (qualities.length - 1);

    if (changeRate < 0.2) return "stable";
    if (changeRate < 0.5) return "unstable";
    return "very-unstable";
  }

  /**
   * Add current status to history
   */
  private addToHistory(): void {
    const metric: NetworkMetrics = {
      timestamp: this.status.timestamp,
      isOnline: this.status.isOnline,
      type: this.status.type,
      effectiveType: this.status.effectiveType,
      downlink: this.status.downlink,
      rtt: this.status.rtt,
      quality: this.status.quality,
    };

    this.metricsHistory.push(metric);
    this.status.metricsHistory = [...this.metricsHistory];

    // Limit history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Emit network event
   */
  private emitEvent(type: NetworkEventType, data: any): void {
    const event: NetworkEvent = {
      type,
      timestamp: new Date(),
      data,
    };

    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error("Error in network event listener:", error);
        }
      });
    }
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.status.isOnline;
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return this.status.isOffline;
  }

  /**
   * Get network quality
   */
  getQuality(): NetworkQuality {
    return this.status.quality;
  }

  /**
   * Check if network is suitable for specific operation
   */
  isSuitableFor(operation: "upload" | "download" | "streaming" | "realtime"): boolean {
    if (!this.status.isOnline) return false;

    switch (operation) {
      case "upload":
        return this.status.quality !== NetworkQuality.VERY_POOR && this.status.downlink > 0.5;
      case "download":
        return this.status.quality !== NetworkQuality.OFFLINE;
      case "streaming":
        return this.status.quality === NetworkQuality.EXCELLENT ||
               this.status.quality === NetworkQuality.GOOD;
      case "realtime":
        return this.status.quality === NetworkQuality.EXCELLENT &&
               this.status.stability === "stable" &&
               this.status.rtt < 200;
      default:
        return this.status.isOnline;
    }
  }

  /**
   * Get recommendations for current network conditions
   */
  getRecommendations(): {
    chunkSize: number;
    timeout: number;
    retryAttempts: number;
    compression: boolean;
    quality: "low" | "medium" | "high";
    backgroundSync: boolean;
  } {
    const recommendations = {
      chunkSize: 1024 * 1024, // 1MB
      timeout: 30000, // 30s
      retryAttempts: 3,
      compression: false,
      quality: "medium" as "low" | "medium" | "high",
      backgroundSync: true,
    };

    // Adjust based on quality
    switch (this.status.quality) {
      case NetworkQuality.VERY_POOR:
        recommendations.chunkSize = 256 * 1024; // 256KB
        recommendations.timeout = 60000; // 1min
        recommendations.retryAttempts = 5;
        recommendations.compression = true;
        recommendations.quality = "low";
        break;
      case NetworkQuality.POOR:
        recommendations.chunkSize = 512 * 1024; // 512KB
        recommendations.timeout = 45000; // 45s
        recommendations.retryAttempts = 4;
        recommendations.compression = true;
        recommendations.quality = "low";
        break;
      case NetworkQuality.FAIR:
        recommendations.chunkSize = 1024 * 1024; // 1MB
        recommendations.timeout = 30000; // 30s
        recommendations.retryAttempts = 3;
        recommendations.compression = false;
        recommendations.quality = "medium";
        break;
      case NetworkQuality.GOOD:
        recommendations.chunkSize = 2 * 1024 * 1024; // 2MB
        recommendations.timeout = 20000; // 20s
        recommendations.retryAttempts = 2;
        recommendations.compression = false;
        recommendations.quality = "high";
        break;
      case NetworkQuality.EXCELLENT:
        recommendations.chunkSize = 4 * 1024 * 1024; // 4MB
        recommendations.timeout = 15000; // 15s
        recommendations.retryAttempts = 2;
        recommendations.compression = false;
        recommendations.quality = "high";
        break;
    }

    // Adjust for mobile and battery
    if (this.status.isMobile) {
      recommendations.chunkSize = Math.min(recommendations.chunkSize, 1024 * 1024);
    }

    if (this.status.isLowPowerMode) {
      recommendations.retryAttempts = Math.min(recommendations.retryAttempts, 2);
      recommendations.backgroundSync = false;
    }

    if (this.status.saveData) {
      recommendations.compression = true;
      recommendations.quality = "low";
    }

    return recommendations;
  }

  /**
   * Add event listener
   */
  addEventListener(type: NetworkEventType, listener: NetworkEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: NetworkEventType, listener: NetworkEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): NetworkMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.metricsHistory = [];
    this.status.metricsHistory = [];
  }

  /**
   * Destroy network monitor
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Remove event listeners
    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));

    if (this.connection) {
      this.connection.removeEventListener("change", this.handleConnectionChange.bind(this));
    }

    this.listeners.clear();
  }
}

// ============================================================================
// RETRY MANAGER CLASS
// ============================================================================

/**
 * Intelligent retry management with exponential backoff and jitter
 */
export class RetryManager {
  private static instance: RetryManager;
  private retryStates: Map<string, RetryState> = new Map();
  private config: RetryConfig;
  private networkMonitor: NetworkMonitor;

  private constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.networkMonitor = NetworkMonitor.getInstance();
    this.loadPersistedStates();
  }

  static getInstance(config?: Partial<RetryConfig>): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager(config);
    }
    return RetryManager.instance;
  }

  /**
   * Load persisted retry states from localStorage
   */
  private loadPersistedStates(): void {
    if (!this.config.persistRetries || typeof localStorage === "undefined") return;

    try {
      const stored = localStorage.getItem("retry-states");
      if (stored) {
        const states = JSON.parse(stored);
        Object.entries(states).forEach(([key, state]) => {
          // Convert timestamp strings back to Date objects
          const retryState = state as RetryState;
          retryState.retryHistory = retryState.retryHistory.map((attempt: any) => ({
            ...attempt,
            timestamp: new Date(attempt.timestamp),
          }));
          if (retryState.nextRetryTime) {
            retryState.nextRetryTime = new Date(retryState.nextRetryTime);
          }
          this.retryStates.set(key, retryState);
        });
      }
    } catch (error) {
      console.error("Failed to load retry states:", error);
    }
  }

  /**
   * Save retry states to localStorage
   */
  private savePersistedStates(): void {
    if (!this.config.persistRetries || typeof localStorage === "undefined") return;

    try {
      const states: Record<string, RetryState> = {};
      this.retryStates.forEach((state, key) => {
        states[key] = state;
      });
      localStorage.setItem("retry-states", JSON.stringify(states));
    } catch (error) {
      console.error("Failed to save retry states:", error);
    }
  }

  /**
   * Calculate delay for retry attempt with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, baseDelay: number): number {
    // Exponential backoff
    let delay = baseDelay * Math.pow(this.config.backoffFactor, attempt - 1);

    // Apply maximum delay limit
    delay = Math.min(delay, this.config.maxDelay);

    // Add jitter if enabled
    if (this.config.jitter) {
      const jitterAmount = delay * this.config.jitterRange;
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      delay += jitter;
    }

    // Battery-aware adjustment
    if (this.config.batteryAwareRetries) {
      const status = this.networkMonitor.getStatus();
      if (status.isLowPowerMode || (status.batteryLevel && status.batteryLevel < 0.2)) {
        delay *= 2; // Double delay when battery is low
      }
    }

    // Data saver mode adjustment
    if (this.config.dataSaverMode === "respect" ||
        (this.config.dataSaverMode === "adaptive" && status.saveData)) {
      delay *= 1.5; // Increase delay in data saver mode
    }

    return Math.max(delay, 0);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Check custom retry condition
    if (this.config.retryCondition && !this.config.retryCondition(error, 0)) {
      return false;
    }

    // Check error message/type
    const errorMessage = error?.message || String(error);
    if (this.config.retryableErrors.some(retryableError =>
      errorMessage.toLowerCase().includes(retryableError.toLowerCase()))) {
      return true;
    }

    // Check HTTP status code
    const statusCode = error?.status || error?.statusCode;
    if (statusCode && this.config.retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    // Check error classification
    try {
      const analysis = classifyError(error);
      return analysis.category === ErrorCategory.NETWORK ||
             analysis.category === ErrorCategory.API ||
             analysis.recoveryStrategy === RecoveryStrategy.AUTOMATIC_RETRY ||
             analysis.recoveryStrategy === RecoveryStrategy.EXPONENTIAL_BACKOFF;
    } catch {
      return false;
    }
  }

  /**
   * Get or create retry state for operation
   */
  private getRetryState(operationId: string): RetryState {
    if (!this.retryStates.has(operationId)) {
      this.retryStates.set(operationId, {
        attempt: 0,
        maxAttempts: this.config.maxAttempts,
        totalDelay: 0,
        isRetrying: false,
        canRetry: true,
        retryHistory: [],
      });
    }
    return this.retryStates.get(operationId)!;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operationId: string,
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config = { ...this.config, ...customConfig };
    const retryState = this.getRetryState(operationId);

    // Check if retries are exhausted
    if (retryState.attempt >= retryState.maxAttempts) {
      throw new AppError(
        `Retry attempts exhausted for operation ${operationId}`,
        "MAX_RETRIES_EXCEEDED",
        { operationId, attempts: retryState.attempt },
      );
    }

    retryState.isRetrying = true;

    try {
      const startTime = Date.now();
      const result = await operation();
      const endTime = Date.now();

      // Success - record attempt and reset if configured
      const attempt: RetryAttempt = {
        attempt: retryState.attempt + 1,
        timestamp: new Date(),
        delay: 0,
        error: null,
        success: true,
        duration: endTime - startTime,
      };

      retryState.retryHistory.push(attempt);

      if (config.resetOnSuccess) {
        this.resetRetry(operationId);
      }

      return result;

    } catch (error) {
      // Failure - check if retryable
      if (!this.isRetryableError(error)) {
        throw error;
      }

      retryState.lastError = error;
      retryState.attempt++;

      // Check if more retries are available
      if (retryState.attempt >= retryState.maxAttempts) {
        retryState.isRetrying = false;
        retryState.canRetry = false;

        const attempt: RetryAttempt = {
          attempt: retryState.attempt,
          timestamp: new Date(),
          delay: 0,
          error,
          success: false,
        };

        retryState.retryHistory.push(attempt);
        this.savePersistedStates();

        throw new AppError(
          `All retry attempts failed for operation ${operationId}`,
          "ALL_RETRIES_FAILED",
          { operationId, attempts: retryState.attempt, lastError: error },
        );
      }

      // Calculate delay for next retry
      const delay = this.calculateDelay(retryState.attempt, config.baseDelay);
      retryState.totalDelay += delay;
      retryState.nextRetryTime = new Date(Date.now() + delay);

      const attempt: RetryAttempt = {
        attempt: retryState.attempt,
        timestamp: new Date(),
        delay,
        error,
        success: false,
      };

      retryState.retryHistory.push(attempt);
      this.savePersistedStates();

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry the operation
      return this.executeWithRetry(operationId, operation, customConfig);
    } finally {
      retryState.isRetrying = false;
    }
  }

  /**
   * Get retry state for operation
   */
  getRetryState(operationId: string): RetryState | undefined {
    return this.retryStates.get(operationId);
  }

  /**
   * Reset retry state for operation
   */
  resetRetry(operationId: string): void {
    this.retryStates.delete(operationId);
    this.savePersistedStates();
  }

  /**
   * Cancel retry for operation
   */
  cancelRetry(operationId: string): void {
    const state = this.retryStates.get(operationId);
    if (state) {
      state.canRetry = false;
      state.isRetrying = false;
      this.savePersistedStates();
    }
  }

  /**
   * Get all retry states
   */
  getAllRetryStates(): Record<string, RetryState> {
    const states: Record<string, RetryState> = {};
    this.retryStates.forEach((state, key) => {
      states[key] = { ...state };
    });
    return states;
  }

  /**
   * Clear all retry states
   */
  clearAllRetries(): void {
    this.retryStates.clear();
    this.savePersistedStates();
  }

  /**
   * Get retry statistics
   */
  getStatistics(): {
    totalOperations: number;
    activeRetries: number;
    exhaustedRetries: number;
    successRate: number;
    averageAttempts: number;
    totalDelay: number;
  } {
    const states = Array.from(this.retryStates.values());

    const totalOperations = states.length;
    const activeRetries = states.filter(s => s.isRetrying).length;
    const exhaustedRetries = states.filter(s => s.attempt >= s.maxAttempts && !s.canRetry).length;

    const successfulOperations = states.filter(s =>
      s.retryHistory.some(a => a.success)
    ).length;

    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 0;

    const totalAttempts = states.reduce((sum, s) => sum + s.attempt, 0);
    const averageAttempts = totalOperations > 0 ? totalAttempts / totalOperations : 0;

    const totalDelay = states.reduce((sum, s) => sum + s.totalDelay, 0);

    return {
      totalOperations,
      activeRetries,
      exhaustedRetries,
      successRate,
      averageAttempts,
      totalDelay,
    };
  }
}

// ============================================================================
// CIRCUIT BREAKER CLASS
// ============================================================================

/**
 * Circuit breaker implementation for service protection
 */
export class CircuitBreaker {
  private static instances: Map<string, CircuitBreaker> = new Map();
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private callHistory: Array<{ timestamp: number; success: boolean }> = [];
  private networkMonitor: NetworkMonitor;

  private constructor(
    private serviceName: string,
    config: Partial<CircuitBreakerConfig> = {},
  ) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    this.networkMonitor = NetworkMonitor.getInstance();
    this.state = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      errorRate: 0,
      totalCalls: 0,
    };
  }

  static getInstance(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitBreaker {
    if (!CircuitBreaker.instances.has(serviceName)) {
      CircuitBreaker.instances.set(serviceName, new CircuitBreaker(serviceName, config));
    }
    return CircuitBreaker.instances.get(serviceName)!;
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.setState(CircuitState.HALF_OPEN);
      } else {
        throw new AppError(
          `Circuit breaker is open for service ${this.serviceName}`,
          "CIRCUIT_BREAKER_OPEN",
          {
            serviceName: this.serviceName,
            nextAttemptTime: this.state.nextAttemptTime,
          },
        );
      }
    }

    const startTime = Date.now();

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.recordCall(true);
    this.state.lastSuccessTime = new Date();
    this.state.successCount++;
    this.state.totalCalls++;

    // Update error rate
    this.updateErrorRate();

    // Close circuit if in half-open state with sufficient successes
    if (
      this.state.state === CircuitState.HALF_OPEN &&
      this.state.successCount >= this.config.successThreshold
    ) {
      this.setState(CircuitState.CLOSED);
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.recordCall(false);
    this.state.lastFailureTime = new Date();
    this.state.failureCount++;
    this.state.totalCalls++;

    // Update error rate
    this.updateErrorRate();

    // Open circuit if threshold exceeded
    if (this.shouldOpenCircuit()) {
      this.setState(CircuitState.OPEN);
    }
  }

  /**
   * Record a call in history
   */
  private recordCall(success: boolean): void {
    const now = Date.now();
    this.callHistory.push({ timestamp: now, success });

    // Clean old history
    const cutoff = now - this.config.monitoringPeriod;
    this.callHistory = this.callHistory.filter(call => call.timestamp > cutoff);
  }

  /**
   * Update error rate based on recent calls
   */
  private updateErrorRate(): void {
    const recentCalls = this.callHistory.filter(call =>
      Date.now() - call.timestamp <= this.config.monitoringPeriod
    );

    if (recentCalls.length >= this.config.minimumThroughput) {
      const failures = recentCalls.filter(call => !call.success).length;
      this.state.errorRate = failures / recentCalls.length;
    } else {
      this.state.errorRate = 0;
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    // Open based on failure count
    if (this.state.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Open based on error rate
    if (
      this.state.errorRate >= this.config.errorRateThreshold &&
      this.state.totalCalls >= this.config.minimumThroughput
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.state.nextAttemptTime) {
      return false;
    }

    return Date.now() >= this.state.nextAttemptTime.getTime();
  }

  /**
   * Set circuit breaker state
   */
  private setState(newState: CircuitState): void {
    const oldState = this.state.state;
    this.state.state = newState;

    // Reset counters when changing states
    if (newState === CircuitState.CLOSED) {
      this.state.failureCount = 0;
      this.state.successCount = 0;
      this.state.errorRate = 0;
      this.state.nextAttemptTime = undefined;
    } else if (newState === CircuitState.OPEN) {
      this.state.nextAttemptTime = new Date(
        Date.now() + this.config.resetTimeout
      );
    } else if (newState === CircuitState.HALF_OPEN) {
      this.state.successCount = 0;
    }

    // Emit network event
    const monitor = NetworkMonitor.getInstance();
    if (newState === CircuitState.OPEN && oldState !== CircuitState.OPEN) {
      monitor.emitEvent(NetworkEventType.CIRCUIT_OPENED, {
        serviceName: this.serviceName,
        failureCount: this.state.failureCount,
        errorRate: this.state.errorRate,
      });
    } else if (newState === CircuitState.CLOSED && oldState === CircuitState.OPEN) {
      monitor.emitEvent(NetworkEventType.CIRCUIT_CLOSED, {
        serviceName: this.serviceName,
      });
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Force circuit to specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    this.setState(state);
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.setState(CircuitState.CLOSED);
    this.callHistory = [];
  }

  /**
   * Get circuit breaker statistics
   */
  getStatistics(): {
    serviceName: string;
    state: CircuitState;
    failureCount: number;
    successCount: number;
    errorRate: number;
    totalCalls: number;
    averageResponseTime?: number;
  } {
    return {
      serviceName: this.serviceName,
      state: this.state.state,
      failureCount: this.state.failureCount,
      successCount: this.state.successCount,
      errorRate: this.state.errorRate,
      totalCalls: this.state.totalCalls,
    };
  }

  /**
   * Destroy circuit breaker
   */
  destroy(): void {
    CircuitBreaker.instances.delete(this.serviceName);
  }
}

// ============================================================================
// OFFLINE MANAGER CLASS
// ============================================================================

/**
 * Offline mode management and synchronization
 */
export class OfflineManager {
  private static instance: OfflineManager;
  private networkMonitor: NetworkMonitor;
  private storage: OfflineStorage;
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  private syncInterval?: NodeJS.Timeout;

  private constructor(storage: OfflineStorage) {
    this.networkMonitor = NetworkMonitor.getInstance();
    this.storage = storage;
    this.setupEventListeners();
    this.loadSyncQueue();
  }

  static getInstance(storage?: OfflineStorage): OfflineManager {
    if (!OfflineManager.instance) {
      if (!storage) {
        throw new Error("OfflineStorage is required for first initialization");
      }
      OfflineManager.instance = new OfflineManager(storage);
    }
    return OfflineManager.instance;
  }

  /**
   * Setup event listeners for network changes
   */
  private setupEventListeners(): void {
    this.networkMonitor.addEventListener(
      NetworkEventType.CONNECTION_RESTORED,
      () => {
        this.startBackgroundSync();
      }
    );

    this.networkMonitor.addEventListener(
      NetworkEventType.CONNECTION_LOST,
      () => {
        this.emitEvent(NetworkEventType.OFFLINE_MODE_ENTERED, {
          timestamp: new Date(),
        });
      }
    );
  }

  /**
   * Load sync queue from storage
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      this.syncQueue = await this.storage.getOperations();
    } catch (error) {
      console.error("Failed to load sync queue:", error);
      this.syncQueue = [];
    }
  }

  /**
   * Save sync queue to storage
   */
  private async saveSyncQueue(): Promise<void> {
    try {
      // Clear existing operations
      await this.storage.clearAll();

      // Save current operations
      for (const operation of this.syncQueue) {
        await this.storage.addOperation(operation);
      }
    } catch (error) {
      console.error("Failed to save sync queue:", error);
    }
  }

  /**
   * Start background synchronization
   */
  private startBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.networkMonitor.isOnline() && !this.isSyncing) {
        await this.syncOperations();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Synchronize pending operations
   */
  private async syncOperations(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.emitEvent(NetworkEventType.SYNC_STARTED, {
      operationCount: this.syncQueue.length,
    });

    try {
      // Sort by priority
      const sortedOperations = [...this.syncQueue].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Process operations in batches
      const batchSize = 5;
      for (let i = 0; i < sortedOperations.length; i += batchSize) {
        const batch = sortedOperations.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(operation => this.executeOperation(operation))
        );

        // Check network status between batches
        if (!this.networkMonitor.isOnline()) {
          break;
        }
      }

      this.emitEvent(NetworkEventType.SYNC_COMPLETED, {
        syncedCount: sortedOperations.length,
      });

    } catch (error) {
      console.error("Sync failed:", error);
      this.emitEvent(NetworkEventType.SYNC_FAILED, {
        error: error?.message || "Unknown error",
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Execute a single sync operation
   */
  private async executeOperation(operation: SyncOperation): Promise<void> {
    try {
      const response = await fetch(operation.url, {
        method: operation.method,
        headers: operation.headers,
        body: operation.body ? JSON.stringify(operation.body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Operation succeeded - remove from queue
      await this.removeOperation(operation.id);

    } catch (error) {
      // Operation failed - increment retry count
      operation.retryCount++;
      operation.lastAttempt = new Date();

      // Remove if max retries exceeded
      if (operation.retryCount >= operation.maxRetries) {
        await this.removeOperation(operation.id);
        console.warn(`Operation ${operation.id} exceeded max retries and was removed`);
      } else {
        await this.updateOperation(operation.id, operation);
      }

      throw error;
    }
  }

  /**
   * Emit network event
   */
  private emitEvent(type: NetworkEventType, data: any): void {
    // This would integrate with NetworkMonitor's event system
    // For now, just log to console
    console.log(`Offline Event: ${type}`, data);
  }

  /**
   * Add operation to sync queue
   */
  async addOperation(operation: Omit<SyncOperation, "id" | "createdAt" | "retryCount">): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const syncOperation: SyncOperation = {
      ...operation,
      id,
      createdAt: new Date(),
      retryCount: 0,
    };

    this.syncQueue.push(syncOperation);
    await this.saveSyncQueue();

    // Try to sync immediately if online
    if (this.networkMonitor.isOnline()) {
      setTimeout(() => this.syncOperations(), 100);
    }

    return id;
  }

  /**
   * Remove operation from sync queue
   */
  private async removeOperation(id: string): Promise<void> {
    this.syncQueue = this.syncQueue.filter(op => op.id !== id);
    await this.saveSyncQueue();
  }

  /**
   * Update operation in sync queue
   */
  private async updateOperation(id: string, updates: Partial<SyncOperation>): Promise<void> {
    const index = this.syncQueue.findIndex(op => op.id === id);
    if (index !== -1) {
      this.syncQueue[index] = { ...this.syncQueue[index], ...updates };
      await this.saveSyncQueue();
    }
  }

  /**
   * Get sync queue status
   */
  getSyncQueueStatus(): {
    totalOperations: number;
    pendingOperations: number;
    highPriorityOperations: number;
    isSyncing: boolean;
    lastSyncTime?: Date;
  } {
    return {
      totalOperations: this.syncQueue.length,
      pendingOperations: this.syncQueue.filter(op => op.retryCount === 0).length,
      highPriorityOperations: this.syncQueue.filter(op => op.priority === "high").length,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Force sync all operations
   */
  async forceSync(): Promise<void> {
    if (this.networkMonitor.isOnline()) {
      await this.syncOperations();
    } else {
      throw new Error("Cannot sync while offline");
    }
  }

  /**
   * Clear all pending operations
   */
  async clearQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

  /**
   * Destroy offline manager
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook for network monitoring and status
 */
export function useNetworkMonitor() {
  const [status, setStatus] = useState<NetworkStatus>(() =>
    NetworkMonitor.getInstance().getStatus()
  );
  const monitorRef = useRef<NetworkMonitor>();

  useEffect(() => {
    const monitor = NetworkMonitor.getInstance();
    monitorRef.current = monitor;

    const updateStatus = () => {
      setStatus(monitor.getStatus());
    };

    // Listen to all network events
    Object.values(NetworkEventType).forEach(eventType => {
      monitor.addEventListener(eventType, updateStatus);
    });

    return () => {
      Object.values(NetworkEventType).forEach(eventType => {
        monitor.removeEventListener(eventType, updateStatus);
      });
    };
  }, []);

  return {
    status,
    isOnline: status.isOnline,
    isOffline: status.isOffline,
    quality: status.quality,
    isSuitableFor: (operation: "upload" | "download" | "streaming" | "realtime") =>
      NetworkMonitor.getInstance().isSuitableFor(operation),
    getRecommendations: () => NetworkMonitor.getInstance().getRecommendations(),
    refreshStatus: () => {
      const monitor = NetworkMonitor.getInstance();
      setStatus(monitor.getStatus());
    },
  };
}

/**
 * Hook for retry management
 */
export function useRetryManager(config?: Partial<RetryConfig>) {
  const [retryStates, setRetryStates] = useState<Record<string, RetryState>>({});
  const managerRef = useRef<RetryManager>();

  useEffect(() => {
    const manager = RetryManager.getInstance(config);
    managerRef.current = manager;

    const updateStates = () => {
      setRetryStates(manager.getAllRetryStates());
    };

    // Update states periodically
    const interval = setInterval(updateStates, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [config]);

  const executeWithRetry = useCallback(async <T>(
    operationId: string,
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>,
  ): Promise<T> => {
    if (!managerRef.current) {
      throw new Error("RetryManager not initialized");
    }

    return managerRef.current.executeWithRetry(operationId, operation, customConfig);
  }, []);

  const getRetryState = useCallback((operationId: string): RetryState | undefined => {
    return managerRef.current?.getRetryState(operationId);
  }, []);

  const resetRetry = useCallback((operationId: string): void => {
    managerRef.current?.resetRetry(operationId);
  }, []);

  const cancelRetry = useCallback((operationId: string): void => {
    managerRef.current?.cancelRetry(operationId);
  }, []);

  return {
    retryStates,
    executeWithRetry,
    getRetryState,
    resetRetry,
    cancelRetry,
    getStatistics: () => managerRef.current?.getStatistics(),
  };
}

/**
 * Hook for circuit breaker
 */
export function useCircuitBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
  const [state, setState] = useState<CircuitBreakerState>(() => {
    const breaker = CircuitBreaker.getInstance(serviceName, config);
    return breaker.getState();
  });
  const breakerRef = useRef<CircuitBreaker>();

  useEffect(() => {
    const breaker = CircuitBreaker.getInstance(serviceName, config);
    breakerRef.current = breaker;

    const updateState = () => {
      setState(breaker.getState());
    };

    // Update state periodically
    const interval = setInterval(updateState, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [serviceName, config]);

  const execute = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    if (!breakerRef.current) {
      throw new Error("CircuitBreaker not initialized");
    }

    const result = await breakerRef.current.execute(operation);
    setState(breakerRef.current.getState());
    return result;
  }, []);

  const reset = useCallback(() => {
    breakerRef.current?.reset();
    setState(breakerRef.current?.getState() || state);
  }, [state]);

  return {
    state,
    execute,
    reset,
    isAvailable: state.state !== CircuitState.OPEN,
    getStatistics: () => breakerRef.current?.getStatistics(),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create fetch wrapper with retry and circuit breaker
 */
export function createResilientFetch(options: {
  serviceName?: string;
  retryConfig?: Partial<RetryConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
}) {
  const { serviceName = "default", retryConfig, circuitBreakerConfig } = options;

  const retryManager = RetryManager.getInstance(retryConfig);
  const circuitBreaker = CircuitBreaker.getInstance(serviceName, circuitBreakerConfig);

  return async function resilientFetch(
    url: string,
    init?: RequestInit,
    operationId?: string,
  ): Promise<Response> {
    const operation = async () => {
      // Execute through circuit breaker
      return circuitBreaker.execute(async () => {
        const response = await fetch(url, init);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).response = response;
          throw error;
        }

        return response;
      });
    };

    const id = operationId || `fetch_${url}_${Date.now()}`;

    // Execute with retry
    return retryManager.executeWithRetry(id, operation, retryConfig);
  };
}

/**
 * Check if current network conditions are suitable for operation
 */
export function isNetworkSuitable(operation: "upload" | "download" | "streaming" | "realtime"): boolean {
  return NetworkMonitor.getInstance().isSuitableFor(operation);
}

/**
 * Get network recommendations for current conditions
 */
export function getNetworkRecommendations() {
  return NetworkMonitor.getInstance().getRecommendations();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  NetworkMonitor,
  RetryManager,
  CircuitBreaker,
  OfflineManager,
};

// Re-export for convenience
export * from "./error-classifier";
export * from "./recovery-strategies";
