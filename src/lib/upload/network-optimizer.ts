/**
 * Network Optimizer for adaptive chunk sizing and network-aware upload optimization
 *
 * This module provides network condition monitoring and adaptive chunk sizing
 * to optimize upload performance based on current network conditions.
 */

import type {
  NetworkCondition,
  NetworkOptimizerConfig
} from "@/types/upload";

export class NetworkOptimizer {
  private config: NetworkOptimizerConfig;
  private currentCondition: NetworkCondition;
  private networkHistory: NetworkCondition[] = [];
  private monitoringTimer?: NodeJS.Timeout;
  private speedTestResults: number[] = [];
  private isDestroyed = false;
  private monitoringCallback?: (condition: NetworkCondition) => void;

  constructor(config: NetworkOptimizerConfig) {
    this.config = {
      enableAdaptiveSizing: true,
      networkCheckInterval: 30000, // 30 seconds
      speedThresholds: {
        slow: 1, // 1 Mbps
        medium: 5, // 5 Mbps
        fast: 10, // 10 Mbps
      },
      chunkSizeMapping: {
        slow: 512 * 1024, // 512KB
        medium: 1024 * 1024, // 1MB
        fast: 2 * 1024 * 1024, // 2MB
      },
      ...config,
    };

    // Initialize current network condition
    this.currentCondition = this.getDefaultNetworkCondition();

    this.log("NetworkOptimizer initialized", { config: this.config });
  }

  /**
   * Start network monitoring
   */
  public startMonitoring(callback?: (condition: NetworkCondition) => void): void {
    this.monitoringCallback = callback;

    // Initial network check
    this.updateNetworkCondition();

    // Start periodic monitoring
    this.monitoringTimer = setInterval(() => {
      if (!this.isDestroyed) {
        this.updateNetworkCondition();
      }
    }, this.config.networkCheckInterval);

    // Listen for network changes
    this.setupNetworkEventListeners();

    this.log("Network monitoring started", { interval: this.config.networkCheckInterval });
  }

  /**
   * Stop network monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    this.removeNetworkEventListeners();
    this.monitoringCallback = undefined;

    this.log("Network monitoring stopped");
  }

  /**
   * Get current network condition
   */
  public getCurrentCondition(): NetworkCondition {
    return { ...this.currentCondition };
  }

  /**
   * Get network history
   */
  public getNetworkHistory(): NetworkCondition[] {
    return [...this.networkHistory];
  }

  /**
   * Get optimal chunk size based on network conditions
   */
  public getOptimalChunkSize(baseSize?: number): number {
    if (!this.config.enableAdaptiveSizing) {
      return baseSize || 1024 * 1024; // Default 1MB
    }

    const networkSpeed = this.currentCondition.downlink;
    let chunkSize;

    // Determine chunk size based on network speed
    if (networkSpeed <= this.config.speedThresholds.slow) {
      chunkSize = this.config.chunkSizeMapping.slow;
    } else if (networkSpeed <= this.config.speedThresholds.medium) {
      chunkSize = this.config.chunkSizeMapping.medium;
    } else {
      chunkSize = this.config.chunkSizeMapping.fast;
    }

    // Adjust for connection type
    if (this.currentCondition.type === 'cellular') {
      chunkSize *= 0.8; // Reduce for cellular
    } else if (this.currentCondition.type === 'wifi') {
      chunkSize *= 1.2; // Increase for WiFi
    }

    // Adjust for save data mode
    if (this.currentCondition.saveData) {
      chunkSize *= 0.5; // Halve chunk size
    }

    // Apply some randomness to avoid thundering herd
    const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 - 1.1
    chunkSize = Math.floor(chunkSize * randomFactor);

    return Math.max(256 * 1024, Math.min(chunkSize, 10 * 1024 * 1024)); // 256KB - 10MB
  }

  /**
   * Get optimal concurrent upload count based on network conditions
   */
  public getOptimalConcurrentUploads(baseCount: number): number {
    if (!this.config.enableAdaptiveSizing) {
      return baseCount;
    }

    const networkSpeed = this.currentCondition.downlink;
    let concurrentCount = baseCount;

    // Adjust based on network speed
    if (networkSpeed <= this.config.speedThresholds.slow) {
      concurrentCount = Math.max(1, Math.floor(baseCount * 0.5)); // Reduce concurrent uploads
    } else if (networkSpeed >= this.config.speedThresholds.fast) {
      concurrentCount = Math.min(6, Math.floor(baseCount * 1.5)); // Increase concurrent uploads
    }

    // Adjust for connection type
    if (this.currentCondition.type === 'cellular') {
      concurrentCount = Math.max(1, concurrentCount - 1); // More conservative on cellular
    }

    return Math.max(1, concurrentCount);
  }

  /**
   * Get optimal retry delay based on network conditions
   */
  public getOptimalRetryDelay(baseDelay: number, attempt: number): number {
    if (!this.config.enableAdaptiveSizing) {
      return baseDelay * Math.pow(2, attempt);
    }

    const networkSpeed = this.currentCondition.downlink;
    let delay = baseDelay * Math.pow(2, attempt);

    // Increase delay for slow networks
    if (networkSpeed <= this.config.speedThresholds.slow) {
      delay *= 1.5;
    }

    // Reduce delay for fast networks
    if (networkSpeed >= this.config.speedThresholds.fast) {
      delay *= 0.7;
    }

    // Add jitter to avoid synchronization
    const jitter = delay * 0.1 * Math.random();
    delay += jitter;

    return Math.min(delay, 60000); // Cap at 60 seconds
  }

  /**
   * Check if network conditions are suitable for uploading
   */
  public isNetworkSuitableForUpload(): boolean {
    // Check basic connectivity
    if (this.currentCondition.effectiveType === 'slow-2g') {
      return false; // Too slow for reliable uploads
    }

    // Check save data mode
    if (this.currentCondition.saveData) {
      return false; // User has requested data saving
    }

    // Check minimum speed threshold
    if (this.currentCondition.downlink < 0.1) { // 100 Kbps minimum
      return false;
    }

    return true;
  }

  /**
   * Record upload performance metrics
   */
  public recordUploadPerformance(
    bytesUploaded: number,
    timeTaken: number,
    success: boolean
  ): void {
    const speed = (bytesUploaded / timeTaken) * 1000; // bytes per second

    if (success) {
      this.speedTestResults.push(speed);

      // Keep only recent results (last 10)
      if (this.speedTestResults.length > 10) {
        this.speedTestResults.shift();
      }

      // Update downlink estimate based on actual performance
      this.updateDownlinkEstimate(speed);
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    averageSpeed: number;
    recentSpeeds: number[];
    networkStability: number;
    optimalSettings: {
      chunkSize: number;
      concurrentUploads: number;
      retryDelay: number;
    };
  } {
    const averageSpeed = this.speedTestResults.length > 0
      ? this.speedTestResults.reduce((sum, speed) => sum + speed, 0) / this.speedTestResults.length
      : this.currentCondition.downlink * 125000; // Convert Mbps to bytes/s

    // Calculate network stability (variance in speed)
    const networkStability = this.speedTestResults.length > 1
      ? this.calculateStability(this.speedTestResults)
      : 1.0;

    return {
      averageSpeed,
      recentSpeeds: [...this.speedTestResults],
      networkStability,
      optimalSettings: {
        chunkSize: this.getOptimalChunkSize(),
        concurrentUploads: this.getOptimalConcurrentUploads(3),
        retryDelay: this.getOptimalRetryDelay(1000, 1),
      },
    };
  }

  /**
   * Destroy the network optimizer
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.stopMonitoring();
    this.log("NetworkOptimizer destroyed");
  }

  // Private methods

  private getDefaultNetworkCondition(): NetworkCondition {
    return {
      type: 'unknown',
      effectiveType: '4g',
      downlink: 5, // 5 Mbps default
      rtt: 100, // 100ms default
      saveData: false,
      lastUpdated: Date.now(),
    };
  }

  private async updateNetworkCondition(): Promise<void> {
    try {
      const connection = this.getConnectionInfo();

      const newCondition: NetworkCondition = {
        type: this.determineConnectionType(),
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 5,
        rtt: connection?.rtt || 100,
        saveData: connection?.saveData || false,
        lastUpdated: Date.now(),
      };

      // Check if condition changed significantly
      if (this.hasSignificantChange(this.currentCondition, newCondition)) {
        this.currentCondition = newCondition;
        this.networkHistory.push({ ...newCondition });

        // Keep history limited
        if (this.networkHistory.length > 50) {
          this.networkHistory.shift();
        }

        // Notify callback
        this.monitoringCallback?.(newCondition);

        this.log("Network condition updated", { condition: newCondition });
      } else {
        this.currentCondition.lastUpdated = Date.now();
      }

      // Perform speed test periodically
      if (Math.random() < 0.1) { // 10% chance
        this.performSpeedTest();
      }
    } catch (error) {
      this.log("Error updating network condition", { error });
    }
  }

  private getConnectionInfo(): any {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      return (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    }
    return null;
  }

  private determineConnectionType(): NetworkCondition['type'] {
    const connection = this.getConnectionInfo();

    if (connection?.type) {
      switch (connection.type) {
        case 'wifi':
          return 'wifi';
        case 'cellular':
          return 'cellular';
        case 'ethernet':
          return 'ethernet';
        default:
          return 'unknown';
      }
    }

    // Heuristic determination
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
        return 'cellular';
      }
    }

    return 'unknown';
  }

  private hasSignificantChange(old: NetworkCondition, updated: NetworkCondition): boolean {
    // Check for significant changes in network conditions
    const speedChange = Math.abs(old.downlink - updated.downlink) > (old.downlink * 0.3); // 30% change
    const typeChange = old.type !== updated.type;
    const effectiveTypeChange = old.effectiveType !== updated.effectiveType;
    const saveDataChange = old.saveData !== updated.saveData;

    return speedChange || typeChange || effectiveTypeChange || saveDataChange;
  }

  private async performSpeedTest(): Promise<void> {
    try {
      const startTime = Date.now();
      const testSize = 100 * 1024; // 100KB test

      // Create test data
      const testData = new ArrayBuffer(testSize);
      const testBlob = new Blob([testData]);

      // Perform a small test request
      const response = await fetch('/api/speed-test', {
        method: 'POST',
        body: testBlob,
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const endTime = Date.now();
        const timeTaken = endTime - startTime;
        const speed = (testSize / timeTaken) * 1000; // bytes per second

        this.speedTestResults.push(speed);

        // Keep only recent results
        if (this.speedTestResults.length > 10) {
          this.speedTestResults.shift();
        }

        this.log("Speed test completed", {
          speed: Math.round(speed / 1000) + ' KB/s',
          timeTaken: timeTaken + 'ms'
        });
      }
    } catch (error) {
      this.log("Speed test failed", { error });
    }
  }

  private updateDownlinkEstimate(actualSpeed: number): void {
    // Convert bytes per second to Mbps
    const actualMbps = (actualSpeed * 8) / (1024 * 1024);

    // Update downlink with exponential smoothing
    const alpha = 0.3; // Smoothing factor
    this.currentCondition.downlink =
      alpha * actualMbps + (1 - alpha) * this.currentCondition.downlink;
  }

  private calculateStability(values: number[]): number {
    if (values.length < 2) return 1.0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // Stability = 1 - (coefficient of variation)
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  private setupNetworkEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineChange);
      window.addEventListener('offline', this.handleOfflineChange);

      const connection = this.getConnectionInfo();
      if (connection) {
        connection.addEventListener('change', this.handleConnectionChange);
      }
    }
  }

  private removeNetworkEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineChange);
      window.removeEventListener('offline', this.handleOfflineChange);

      const connection = this.getConnectionInfo();
      if (connection) {
        connection.removeEventListener('change', this.handleConnectionChange);
      }
    }
  }

  private handleOnlineChange = (): void => {
    setTimeout(() => {
      this.updateNetworkCondition();
    }, 1000); // Wait for network to stabilize
  };

  private handleOfflineChange = (): void => {
    this.currentCondition.effectiveType = 'slow-2g';
    this.currentCondition.downlink = 0;
    this.currentCondition.lastUpdated = Date.now();

    this.monitoringCallback?.(this.currentCondition);
    this.log("Network offline detected");
  };

  private handleConnectionChange = (): void => {
    this.updateNetworkCondition();
  };

  private log(message: string, data?: any): void {
    console.log(`[NetworkOptimizer] ${message}`, data);
  }
}

export default NetworkOptimizer;
