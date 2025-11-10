/**
 * Analytics Reporter for Mobile Analytics
 *
 * Handles data transmission, compression, and reporting to analytics services.
 * Supports offline buffering, retry mechanisms, and real-time reporting.
 *
 * @version 1.0.0
 */

import { MobileAnalyticsConfig, AnalyticsEvent, AnalyticsReport } from './mobile-analytics';

// ============================================================================
// ANALYTICS REPORTING INTERFACES
// ============================================================================

/**
 * Analytics transmission options
 */
export interface TransmissionOptions {
  endpoint?: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  compression?: boolean;
  batchSize?: number;
  realtime?: boolean;
}

/**
 * Analytics report format
 */
export interface ReportFormat {
  type: 'json' | 'csv' | 'xml' | 'protobuf';
  version: string;
  schema: string;
  compression?: 'gzip' | 'brotli' | 'none';
  encryption?: 'aes256' | 'none';
}

/**
 * Transmission result
 */
export interface TransmissionResult {
  success: boolean;
  eventsSent: number;
  eventsProcessed: number;
  duration: number; // ms
  bytesTransmitted: number;
  responseCode?: number;
  responseMessage?: string;
  error?: Error;
  retryAttempts: number;
}

/**
 * Offline buffer configuration
 */
export interface OfflineBufferConfig {
  enabled: boolean;
  maxSize: number; // MB
  maxEvents: number;
  maxAge: number; // ms
  storageType: 'localStorage' | 'indexedDB' | 'memory';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  flushOnOnline: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffFactor: number;
  jitter: boolean;
  retryableErrors: number[]; // HTTP status codes
}

/**
 * Analytics service configuration
 */
export interface AnalyticsServiceConfig {
  name: string;
  endpoint: string;
  apiKey?: string;
  enabled: boolean;
  priority: number;
  batchSize: number;
  flushInterval: number; // ms
  timeout: number; // ms
  retries: number;
  compression: boolean;
  realtime: boolean;
  customHeaders?: Record<string, string>;
  dataMapping?: (events: AnalyticsEvent[]) => any;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  batches: AnalyticsEvent[][];
  totalBatches: number;
  totalEvents: number;
  estimatedSize: number; // bytes
  processingTime: number; // ms
}

// ============================================================================
// ANALYTICS REPORTER CLASS
// ============================================================================

/**
 * Handles transmission of analytics data to various services
 */
export class AnalyticsReporter {
  private config: MobileAnalyticsConfig;
  private services: Map<string, AnalyticsServiceConfig> = new Map();
  private offlineBuffer: OfflineBuffer;
  private retryManager: RetryManager;
  private compressionManager: CompressionManager;
  private transmissionQueue: AnalyticsEvent[] = [];
  private isOnline = navigator.onLine;
  private isTransmitting = false;
  private lastTransmissionTime = 0;
  private transmissionStats = {
    totalEvents: 0,
    successfulTransmissions: 0,
    failedTransmissions: 0,
    bytesTransmitted: 0,
    averageLatency: 0,
  };

  constructor(config: MobileAnalyticsConfig) {
    this.config = config;
    this.offlineBuffer = new OfflineBuffer(config);
    this.retryManager = new RetryManager(config);
    this.compressionManager = new CompressionManager(config);

    this.initializeServices();
    this.setupEventListeners();
  }

  /**
   * Send analytics events
   */
  public async sendEvents(events: AnalyticsEvent[]): Promise<TransmissionResult[]> {
    if (events.length === 0) {
      return [];
    }

    const results: TransmissionResult[] = [];
    const startTime = Date.now();

    try {
      // Check if we're online
      if (!this.isOnline) {
        if (this.config.offlineBuffering) {
          await this.offlineBuffer.addEvents(events);
          return [{
            success: false,
            eventsSent: 0,
            eventsProcessed: events.length,
            duration: Date.now() - startTime,
            bytesTransmitted: 0,
            responseMessage: 'Offline - events buffered',
            retryAttempts: 0,
          }];
        } else {
          throw new Error('Device offline and offline buffering disabled');
        }
      }

      // Filter enabled services
      const enabledServices = Array.from(this.services.values())
        .filter(service => service.enabled)
        .sort((a, b) => b.priority - a.priority);

      if (enabledServices.length === 0) {
        throw new Error('No enabled analytics services');
      }

      // Send to each service
      const transmissionPromises = enabledServices.map(service =>
        this.transmitToService(events, service)
      );

      const serviceResults = await Promise.allSettled(transmissionPromises);

      // Process results
      serviceResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            eventsSent: 0,
            eventsProcessed: events.length,
            duration: Date.now() - startTime,
            bytesTransmitted: 0,
            error: result.reason as Error,
            responseMessage: `Service ${enabledServices[index].name} failed`,
            retryAttempts: 0,
          });
        }
      });

      // Update statistics
      this.updateTransmissionStats(results, events.length);

    } catch (error) {
      console.error('[AnalyticsReporter] Failed to send events:', error);

      // Add to offline buffer if enabled
      if (this.config.offlineBuffering) {
        await this.offlineBuffer.addEvents(events);
      }

      results.push({
        success: false,
        eventsSent: 0,
        eventsProcessed: events.length,
        duration: Date.now() - startTime,
        bytesTransmitted: 0,
        error: error as Error,
        responseMessage: (error as Error).message,
        retryAttempts: 0,
      });
    }

    return results;
  }

  /**
   * Send single event
   */
  public async sendEvent(event: AnalyticsEvent): Promise<TransmissionResult[]> {
    return this.sendEvents([event]);
  }

  /**
   * Add analytics service
   */
  public addService(serviceConfig: AnalyticsServiceConfig): void {
    this.services.set(serviceConfig.name, serviceConfig);

    if (this.config.debugMode) {
      console.log(`[AnalyticsReporter] Added service: ${serviceConfig.name}`);
    }
  }

  /**
   * Remove analytics service
   */
  public removeService(serviceName: string): void {
    this.services.delete(serviceName);

    if (this.config.debugMode) {
      console.log(`[AnalyticsReporter] Removed service: ${serviceName}`);
    }
  }

  /**
   * Get service configurations
   */
  public getServices(): AnalyticsServiceConfig[] {
    return Array.from(this.services.values());
  }

  /**
   * Flush offline buffer
   */
  public async flushOfflineBuffer(): Promise<TransmissionResult[]> {
    if (!this.isOnline) {
      throw new Error('Cannot flush offline buffer while offline');
    }

    const bufferedEvents = await this.offlineBuffer.getEvents();

    if (bufferedEvents.length === 0) {
      return [];
    }

    const results = await this.sendEvents(bufferedEvents);

    // Clear successfully sent events from buffer
    const successfulEvents = results
      .filter(result => result.success)
      .reduce((total, result) => total + result.eventsSent, 0);

    if (successfulEvents > 0) {
      await this.offlineBuffer.removeEvents(successfulEvents);
    }

    return results;
  }

  /**
   * Get transmission statistics
   */
  public getTransmissionStats(): {
    totalEvents: number;
    successfulTransmissions: number;
    failedTransmissions: number;
    bytesTransmitted: number;
    averageLatency: number;
    successRate: number;
  } {
    const total = this.transmissionStats.successfulTransmissions + this.transmissionStats.failedTransmissions;
    const successRate = total > 0 ? this.transmissionStats.successfulTransmissions / total : 0;

    return {
      ...this.transmissionStats,
      successRate,
    };
  }

  /**
   * Get offline buffer status
   */
  public async getOfflineBufferStatus(): Promise<{
    enabled: boolean;
    eventCount: number;
    sizeBytes: number;
    sizeMB: number;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  }> {
    return this.offlineBuffer.getStatus();
  }

  /**
   * Clear offline buffer
   */
  public async clearOfflineBuffer(): Promise<void> {
    await this.offlineBuffer.clear();
  }

  /**
   * Create analytics report
   */
  public async createReport(
    events: AnalyticsEvent[],
    format: ReportFormat = { type: 'json', version: '1.0', schema: 'mobile-analytics' }
  ): Promise<AnalyticsReport> {
    const reportId = this.generateReportId();
    const timestamp = new Date();

    // Group events by session
    const eventsBySession = new Map<string, AnalyticsEvent[]>();
    events.forEach(event => {
      if (!eventsBySession.has(event.sessionId)) {
        eventsBySession.set(event.sessionId, []);
      }
      eventsBySession.get(event.sessionId)!.push(event);
    });

    // Calculate summary statistics
    const summary = this.calculateSummaryStatistics(events);

    // Get device context from first event
    const deviceContext = events[0]?.context.device;

    return {
      id: reportId,
      timestamp,
      events,
      sessionId: events[0]?.sessionId || 'unknown',
      userId: events[0]?.userId,
      deviceContext,
      summary,
    };
  }

  /**
   * Export analytics data
   */
  public async exportData(
    events: AnalyticsEvent[],
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const report = await this.createReport(events);

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);

      case 'csv':
        return this.convertToCSV(events);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: MobileAnalyticsConfig): void {
    this.config = newConfig;
    this.offlineBuffer.updateConfig(newConfig);
    this.retryManager.updateConfig(newConfig);
    this.compressionManager.updateConfig(newConfig);
  }

  // Private methods
  private initializeServices(): void {
    // Add default service if endpoint is configured
    if (this.config.endpoint) {
      this.addService({
        name: 'default',
        endpoint: this.config.endpoint,
        apiKey: this.config.apiKey,
        enabled: true,
        priority: 100,
        batchSize: this.config.batchSize,
        flushInterval: this.config.flushInterval,
        timeout: 30000,
        retries: this.config.maxRetries,
        compression: this.config.compressionEnabled,
        realtime: this.config.enableRealtimeReporting,
      });
    }

    // Add development service if in debug mode
    if (this.config.debugMode) {
      this.addService({
        name: 'debug',
        endpoint: '/api/analytics/debug',
        enabled: true,
        priority: 1,
        batchSize: 10,
        flushInterval: 5000,
        timeout: 10000,
        retries: 1,
        compression: false,
        realtime: true,
      });
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineEvent();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOfflineEvent();
    });
  }

  private async transmitToService(
    events: AnalyticsEvent[],
    service: AnalyticsServiceConfig
  ): Promise<TransmissionResult> {
    const startTime = Date.now();
    let retryAttempts = 0;

    try {
      // Prepare data for service
      const preparedData = service.dataMapping ?
        service.dataMapping(events) :
        this.prepareEventData(events);

      // Compress data if enabled
      let payload = preparedData;
      let compressed = false;
      if (service.compression && this.config.compressionEnabled) {
        payload = await this.compressionManager.compress(preparedData);
        compressed = true;
      }

      // Split into batches if necessary
      const batches = this.createBatches(events, service.batchSize);
      let totalEventsSent = 0;
      let totalBytesTransmitted = 0;

      // Send each batch
      for (const batch of batches) {
        const batchPayload = service.dataMapping ?
          service.dataMapping(batch) :
          this.prepareEventData(batch);

        const compressedBatch = compressed ?
          await this.compressionManager.compress(batchPayload) :
          batchPayload;

        const result = await this.sendBatch(compressedBatch, service);

        if (!result.success) {
          throw result.error || new Error('Batch transmission failed');
        }

        totalEventsSent += batch.length;
        totalBytesTransmitted += compressedBatch.length;
      }

      return {
        success: true,
        eventsSent: totalEventsSent,
        eventsProcessed: events.length,
        duration: Date.now() - startTime,
        bytesTransmitted: totalBytesTransmitted,
        retryAttempts,
      };

    } catch (error) {
      // Retry if configured
      if (retryAttempts < service.retries) {
        retryAttempts++;
        await this.delay(this.calculateRetryDelay(retryAttempts));
        return this.transmitToService(events, service);
      }

      return {
        success: false,
        eventsSent: 0,
        eventsProcessed: events.length,
        duration: Date.now() - startTime,
        bytesTransmitted: 0,
        error: error as Error,
        responseMessage: (error as Error).message,
        retryAttempts,
      };
    }
  }

  private async sendBatch(
    payload: any,
    service: AnalyticsServiceConfig
  ): Promise<{ success: boolean; error?: Error }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': navigator.userAgent,
      ...service.customHeaders,
    };

    // Add API key if provided
    if (service.apiKey) {
      headers['Authorization'] = `Bearer ${service.apiKey}`;
    }

    // Add compression header
    if (service.compression && this.config.compressionEnabled) {
      headers['Content-Encoding'] = 'gzip';
    }

    try {
      const response = await fetch(service.endpoint, {
        method: 'POST',
        headers,
        body: typeof payload === 'string' ? payload : JSON.stringify(payload),
        signal: AbortSignal.timeout(service.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  private prepareEventData(events: AnalyticsEvent[]): any {
    return {
      events: events.map(event => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp.toISOString(),
        sessionId: event.sessionId,
        userId: event.userId,
        data: event.data,
        context: {
          device: event.context.device,
          app: event.context.app,
          network: event.context.network,
          performance: event.context.performance,
          battery: event.context.battery,
        },
        consent: event.consent,
        anonymized: event.anonymized,
      })),
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        source: 'umuo-app',
        environment: this.config.debugMode ? 'development' : 'production',
      },
    };
  }

  private createBatches(events: AnalyticsEvent[], batchSize: number): AnalyticsEvent[][] {
    const batches: AnalyticsEvent[][] = [];

    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }

    return batches;
  }

  private calculateSummaryStatistics(events: AnalyticsEvent[]): AnalyticsReport['summary'] {
    const eventsByType: Record<string, number> = {};
    let sessionDuration = 0;
    let errorCount = 0;
    const performanceMetrics: Record<string, number> = {};

    // Count events by type
    events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      if (event.type === 'error_occurred') {
        errorCount++;
      }

      if (event.type === 'performance_metric') {
        const metric = event.data;
        performanceMetrics[metric.name] = metric.value;
      }
    });

    // Calculate session duration
    const timestamps = events.map(e => e.timestamp.getTime());
    if (timestamps.length > 0) {
      const minTime = Math.min(...timestamps);
      const maxTime = Math.max(...timestamps);
      sessionDuration = maxTime - minTime;
    }

    return {
      totalEvents: events.length,
      eventsByType: eventsByType as any,
      sessionDuration,
      errorCount,
      performanceMetrics,
    };
  }

  private convertToCSV(events: AnalyticsEvent[]): string {
    const headers = [
      'id',
      'type',
      'timestamp',
      'sessionId',
      'userId',
      'deviceType',
      'os',
      'browser',
      'connectionType',
      'batteryLevel',
      'anonymized',
    ];

    const rows = events.map(event => [
      event.id,
      event.type,
      event.timestamp.toISOString(),
      event.sessionId,
      event.userId || '',
      event.context.device.type,
      event.context.device.os,
      event.context.device.browser,
      event.context.network.type,
      event.context.battery.level.toString(),
      event.anonymized.toString(),
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateTransmissionStats(results: TransmissionResult[], eventsCount: number): void {
    results.forEach(result => {
      if (result.success) {
        this.transmissionStats.successfulTransmissions++;
        this.transmissionStats.bytesTransmitted += result.bytesTransmitted;
      } else {
        this.transmissionStats.failedTransmissions++;
      }
    });

    this.transmissionStats.totalEvents += eventsCount;
    this.lastTransmissionTime = Date.now();
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    return delay + Math.random() * 1000; // Add jitter
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleOnlineEvent(): Promise<void> {
    if (this.config.offlineBuffering) {
      try {
        await this.flushOfflineBuffer();
      } catch (error) {
        console.error('[AnalyticsReporter] Failed to flush offline buffer:', error);
      }
    }
  }

  private handleOfflineEvent(): void {
    // Nothing special to handle here, events will be buffered automatically
    if (this.config.debugMode) {
      console.log('[AnalyticsReporter] Device offline, events will be buffered');
    }
  }
}

// ============================================================================
// SUPPORTING CLASSES
// ============================================================================

/**
 * Offline buffer for analytics events
 */
class OfflineBuffer {
  private config: MobileAnalyticsConfig;
  private storageKey = 'umuo_analytics_buffer';

  constructor(config: MobileAnalyticsConfig) {
    this.config = config;
  }

  async addEvents(events: AnalyticsEvent[]): Promise<void> {
    if (!this.config.offlineBuffering) return;

    try {
      const buffered = await this.getEvents();
      const updated = [...buffered, ...events];

      // Apply size and age limits
      const limited = this.applyLimits(updated);

      await this.saveEvents(limited);

      if (this.config.debugMode) {
        console.log(`[OfflineBuffer] Added ${events.length} events to buffer`);
      }
    } catch (error) {
      console.error('[OfflineBuffer] Failed to add events:', error);
    }
  }

  async getEvents(): Promise<AnalyticsEvent[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[OfflineBuffer] Failed to get events:', error);
      return [];
    }
  }

  async removeEvents(count: number): Promise<void> {
    try {
      const events = await this.getEvents();
      const remaining = events.slice(count);
      await this.saveEvents(remaining);
    } catch (error) {
      console.error('[OfflineBuffer] Failed to remove events:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('[OfflineBuffer] Failed to clear buffer:', error);
    }
  }

  async getStatus(): Promise<{
    enabled: boolean;
    eventCount: number;
    sizeBytes: number;
    sizeMB: number;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  }> {
    const events = await this.getEvents();
    const stored = localStorage.getItem(this.storageKey);

    return {
      enabled: this.config.offlineBuffering,
      eventCount: events.length,
      sizeBytes: stored ? stored.length : 0,
      sizeMB: stored ? stored.length / (1024 * 1024) : 0,
      oldestEvent: events.length > 0 ? new Date(events[0].timestamp) : null,
      newestEvent: events.length > 0 ? new Date(events[events.length - 1].timestamp) : null,
    };
  }

  updateConfig(newConfig: MobileAnalyticsConfig): void {
    this.config = newConfig;
  }

  private applyLimits(events: AnalyticsEvent[]): AnalyticsEvent[] {
    let filtered = [...events];

    // Apply event count limit
    if (this.config.batchSize && filtered.length > this.config.batchSize * 10) {
      filtered = filtered.slice(-this.config.batchSize * 10);
    }

    // Apply age limit (keep events from last 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    filtered = filtered.filter(event => new Date(event.timestamp) > cutoff);

    // Apply storage size limit
    const serialized = JSON.stringify(filtered);
    const maxSizeBytes = this.config.memoryLimit * 1024 * 1024;

    if (serialized.length > maxSizeBytes) {
      // Remove oldest events until under limit
      let reduced = [...filtered];
      while (JSON.stringify(reduced).length > maxSizeBytes && reduced.length > 0) {
        reduced.shift();
      }
      filtered = reduced;
    }

    return filtered;
  }

  private async saveEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(events));
    } catch (error) {
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Clear half the events and try again
        const halfEvents = events.slice(Math.floor(events.length / 2));
        localStorage.setItem(this.storageKey, JSON.stringify(halfEvents));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Retry manager for failed transmissions
 */
class RetryManager {
  private config: MobileAnalyticsConfig;

  constructor(config: MobileAnalyticsConfig) {
    this.config = config;
  }

  async retryTransmission(
    events: AnalyticsEvent[],
    attempt: number,
    maxAttempts: number
  ): Promise<boolean> {
    if (attempt >= maxAttempts) {
      return false;
    }

    const delay = this.calculateRetryDelay(attempt);
    await this.sleep(delay);

    return true; // Would attempt retry
  }

  updateConfig(newConfig: MobileAnalyticsConfig): void {
    this.config = newConfig;
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 5000;
    const maxDelay = 60000; // 1 minute
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add randomness

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Compression manager for analytics data
 */
class CompressionManager {
  private config: MobileAnalyticsConfig;

  constructor(config: MobileAnalyticsConfig) {
    this.config = config;
  }

  async compress(data: any): Promise<string> {
    if (!this.config.compressionEnabled) {
      return typeof data === 'string' ? data : JSON.stringify(data);
    }

    try {
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);

      // Use CompressionStream if available
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(new TextEncoder().encode(jsonString));
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }

        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }

        // Convert to base64 for transmission
        return btoa(String.fromCharCode(...compressed));
      }

      // Fallback: return uncompressed
      return jsonString;
    } catch (error) {
      console.warn('[CompressionManager] Compression failed, using uncompressed data:', error);
      return typeof data === 'string' ? data : JSON.stringify(data);
    }
  }

  updateConfig(newConfig: MobileAnalyticsConfig): void {
    this.config = newConfig;
  }
}

export default AnalyticsReporter;
