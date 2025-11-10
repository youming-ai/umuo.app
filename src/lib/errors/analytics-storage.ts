/**
 * Enhanced Analytics Storage Management with Privacy Compliance
 *
 * Advanced storage system for error analytics data with privacy compliance,
 * data retention policies, and efficient retrieval mechanisms.
 *
 * @version 1.0.0
 */

import Dexie, { Table } from 'dexie';
import { ErrorEvent, ConsentLevel, ErrorAnalyticsConfig } from './error-analytics';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

// ============================================================================
// STORAGE INTERFACES
// ============================================================================

/**
 * Stored error event with additional metadata
 */
export interface StoredErrorEvent extends ErrorEvent {
  // Database metadata
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Compression and privacy
  compressed: boolean;
  anonymized: boolean;
  consentLevel: ConsentLevel;

  // Data lifecycle
  retentionExpiresAt?: Date;
  archivedAt?: Date;

  // Indexing fields
  dateIndex: number; // YYYYMMDD format for date queries
  hourIndex: number; // 0-23 for hourly queries
  typeIndex: string; // For type-based queries
  severityIndex: string; // For severity-based queries

  // Aggregated data
  processed?: boolean;
  aggregatedAt?: Date;
}

/**
 * Aggregated analytics data for dashboard
 */
export interface AggregatedAnalytics {
  id: string;
  type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  period: string; // ISO period identifier
  timestamp: Date;

  // Error counts
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;

  // Performance metrics
  averageResolutionTime: number;
  recoveryRate: number;

  // User impact
  uniqueUsers: number;
  userImpactScore: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Error pattern cache entry
 */
export interface CachedPattern {
  id: string;
  patternId: string;
  errorTypes: string[];
  frequency: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';

  // Prediction data
  nextPrediction?: {
    timestamp: Date;
    probability: number;
    riskLevel: 'low' | 'medium' | 'high';
  };

  // Cache metadata
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  expiresAt?: Date;
}

/**
 * Analytics storage statistics
 */
export interface StorageStats {
  totalEvents: number;
  storageUsed: number; // bytes
  storageQuota: number; // bytes
  oldestEvent?: Date;
  newestEvent?: Date;

  // By type
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;

  // Performance
  averageQueryTime: number;
  compressionRatio: number;

  // Privacy
  anonymizedEvents: number;
  consentDistribution: Record<ConsentLevel, number>;
}

// ============================================================================
// MAIN DATABASE CLASS
// ============================================================================

/**
 * Enhanced analytics database with Dexie
 */
class ErrorAnalyticsDatabase extends Dexie {
  // Tables
  errorEvents!: Table<StoredErrorEvent>;
  aggregatedAnalytics!: Table<AggregatedAnalytics>;
  cachedPatterns!: Table<CachedPattern>;

  constructor() {
    super('ErrorAnalyticsDatabase');

    this.version(1).stores({
      errorEvents:
        'id, timestamp, type, category, severity, dateIndex, hourIndex, typeIndex, severityIndex, ' +
        'sessionId, userId, consentLevel, processed, retentionExpiresAt',
      aggregatedAnalytics:
        'id, type, period, timestamp, createdAt, expiresAt',
      cachedPatterns:
        'id, patternId, errorTypes, createdAt, lastAccessedAt, expiresAt',
    });

    // Hooks for data processing
    this.errorEvents.hook('creating', this.onEventCreating.bind(this));
    this.errorEvents.hook('reading', this.onEventReading.bind(this));
    this.errorEvents.hook('updating', this.onEventUpdating.bind(this));
  }

  private async onEventCreating(
    primKey: any,
    obj: StoredErrorEvent,
    trans: any
  ): Promise<any> {
    // Add metadata
    obj.createdAt = new Date();
    obj.updatedAt = new Date();
    obj.dateIndex = this.createDateIndex(obj.timestamp);
    obj.hourIndex = obj.timestamp.getHours();
    obj.typeIndex = obj.type;
    obj.severityIndex = obj.severity;

    // Apply compression if enabled
    if (obj.compressed) {
      obj = await this.compressEventData(obj);
    }

    // Apply anonymization if required
    if (obj.anonymized) {
      obj = await this.anonymizeEventData(obj);
    }

    return obj;
  }

  private async onEventReading(
    obj: StoredErrorEvent
  ): Promise<StoredErrorEvent> {
    // Decompress if needed
    if (obj.compressed) {
      obj = await this.decompressEventData(obj);
    }

    return obj;
  }

  private async onEventUpdating(
    modifications: any,
    primKey: any,
    obj: StoredErrorEvent,
    trans: any
  ): Promise<any> {
    modifications.updatedAt = new Date();

    // Re-compress if content changed
    if (obj.compressed && this.hasContentChanged(modifications, obj)) {
      const updatedEvent = { ...obj, ...modifications };
      return await this.compressEventData(updatedEvent);
    }

    return modifications;
  }

  private createDateIndex(timestamp: Date): number {
    return timestamp.getFullYear() * 10000 +
           (timestamp.getMonth() + 1) * 100 +
           timestamp.getDate();
  }

  private async compressEventData(event: StoredErrorEvent): Promise<StoredErrorEvent> {
    try {
      const eventString = JSON.stringify({
        message: event.message,
        stack: event.stack,
        context: event.context,
        userBehavior: event.userBehavior,
        systemInfo: event.systemInfo,
        performanceMetrics: event.performanceMetrics,
      });

      const compressed = compressToUTF16(eventString);

      return {
        ...event,
        message: compressed,
        stack: compressed,
        context: { compressed: true } as any,
        userBehavior: { compressed: true } as any,
        systemInfo: { compressed: true } as any,
        performanceMetrics: { compressed: true } as any,
      };
    } catch (error) {
      console.error('[ErrorAnalyticsDB] Failed to compress event:', error);
      return event;
    }
  }

  private async decompressEventData(event: StoredErrorEvent): Promise<StoredErrorEvent> {
    try {
      if (!event.message.includes('') || !event.context || (event.context as any).compressed) {
        return event;
      }

      const decompressed = decompressFromUTF16(event.message);
      const data = JSON.parse(decompressed);

      return {
        ...event,
        message: data.message,
        stack: data.stack,
        context: data.context,
        userBehavior: data.userBehavior,
        systemInfo: data.systemInfo,
        performanceMetrics: data.performanceMetrics,
        compressed: false,
      };
    } catch (error) {
      console.error('[ErrorAnalyticsDB] Failed to decompress event:', error);
      return event;
    }
  }

  private async anonymizeEventData(event: StoredErrorEvent): Promise<StoredErrorEvent> {
    try {
      // Anonymize user identifiers
      const anonymizedUserId = event.userId ?
        `user_${this.hashString(event.userId)}` : undefined;

      // Anonymize session ID
      const anonymizedSessionId = `session_${this.hashString(event.sessionId)}`;

      // Anonymize IP addresses in context
      const anonymizedContext = { ...event.context };
      if ((anonymizedContext as any).ipAddress) {
        (anonymizedContext as any).ipAddress = this.anonymizeIP((anonymizedContext as any).ipAddress);
      }

      // Anonymize user agent
      const anonymizedUserAgent = this.anonymizeUserAgent(event.userAgent);

      return {
        ...event,
        userId: anonymizedUserId,
        sessionId: anonymizedSessionId,
        context: anonymizedContext,
        userAgent: anonymizedUserAgent,
        anonymized: true,
      };
    } catch (error) {
      console.error('[ErrorAnalyticsDB] Failed to anonymize event:', error);
      return event;
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private anonymizeIP(ip: string): string {
    // Replace last octet with 0 for IPv4
    if (ip.includes('.')) {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }

    // Replace last segment for IPv6
    if (ip.includes(':')) {
      const parts = ip.split(':');
      parts[parts.length - 1] = '0';
      return parts.join(':');
    }

    return '0.0.0.0';
  }

  private anonymizeUserAgent(userAgent: string): string {
    // Keep browser name and version, remove other identifying info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    if (browserMatch) {
      return `${browserMatch[1]} ${browserMatch[2]}`;
    }
    return 'Unknown Browser';
  }

  private hasContentChanged(modifications: any, original: StoredErrorEvent): boolean {
    const contentFields = ['message', 'stack', 'context', 'userBehavior', 'systemInfo', 'performanceMetrics'];
    return contentFields.some(field => modifications.hasOwnProperty(field));
  }
}

// ============================================================================
// MAIN STORAGE MANAGER CLASS
// ============================================================================

/**
 * Enhanced storage manager with privacy compliance and optimization
 */
export class AnalyticsStorageManager {
  private db: ErrorAnalyticsDatabase;
  private config: ErrorAnalyticsConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private compressionEnabled: boolean;
  private retentionTimer?: NodeJS.Timeout;

  constructor(config: ErrorAnalyticsConfig) {
    this.config = config;
    this.db = new ErrorAnalyticsDatabase();
    this.compressionEnabled = config.enableCompression;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.db.open();

      // Start cleanup timer
      this.startCleanupTimer();

      // Start retention timer
      this.startRetentionTimer();

      console.log('[AnalyticsStorageManager] Initialized successfully');
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Store multiple error events efficiently
   */
  public async storeEvents(events: ErrorEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const storedEvents: StoredErrorEvent[] = events.map(event => ({
        ...event,
        id: this.generateEventId(event),
        compressed: this.compressionEnabled,
        anonymized: this.config.anonymizePII,
        consentLevel: event.consentLevel,
        retentionExpiresAt: this.calculateRetentionExpiry(event),
      }));

      // Batch insert for performance
      await this.db.errorEvents.bulkPut(storedEvents);

      // Update aggregated data
      await this.updateAggregatedData(storedEvents);

      console.log(`[AnalyticsStorageManager] Stored ${events.length} events`);
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to store events:', error);
      throw error;
    }
  }

  /**
   * Get events with filtering and pagination
   */
  public async getEvents(options: {
    timeRange?: { start: Date; end: Date };
    errorTypes?: string[];
    severities?: string[];
    consentLevel?: ConsentLevel;
    limit?: number;
    offset?: number;
  } = {}): Promise<ErrorEvent[]> {
    try {
      let collection = this.db.errorEvents.orderBy('timestamp');

      // Apply time range filter
      if (options.timeRange) {
        collection = collection.filter(event =>
          event.timestamp >= options.timeRange!.start &&
          event.timestamp <= options.timeRange!.end
        );
      }

      // Apply type filter
      if (options.errorTypes && options.errorTypes.length > 0) {
        collection = collection.filter(event =>
          options.errorTypes!.includes(event.type)
        );
      }

      // Apply severity filter
      if (options.severities && options.severities.length > 0) {
        collection = collection.filter(event =>
          options.severities!.includes(event.severity)
        );
      }

      // Apply consent level filter
      if (options.consentLevel) {
        collection = collection.filter(event =>
          this.consentLevelSatisfies(event.consentLevel, options.consentLevel!)
        );
      }

      // Apply pagination
      if (options.offset) {
        collection = collection.offset(options.offset);
      }

      if (options.limit) {
        collection = collection.limit(options.limit);
      }

      const storedEvents = await collection.toArray();
      return storedEvents.map(event => this.convertToErrorEvent(event));
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to get events:', error);
      return [];
    }
  }

  /**
   * Get recent events for real-time monitoring
   */
  public async getRecentEvents(minutes: number = 60, limit: number = 100): Promise<ErrorEvent[]> {
    try {
      const cutoff = new Date(Date.now() - minutes * 60 * 1000);

      const storedEvents = await this.db.errorEvents
        .where('timestamp')
        .above(cutoff)
        .limit(limit)
        .toArray();

      return storedEvents.map(event => this.convertToErrorEvent(event));
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to get recent events:', error);
      return [];
    }
  }

  /**
   * Store cached pattern data
   */
  public async storeCachedPattern(pattern: CachedPattern): Promise<void> {
    try {
      pattern.lastAccessedAt = new Date();
      pattern.accessCount = (pattern.accessCount || 0) + 1;

      await this.db.cachedPatterns.put(pattern);
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to store cached pattern:', error);
    }
  }

  /**
   * Get cached patterns
   */
  public async getCachedPatterns(): Promise<CachedPattern[]> {
    try {
      return await this.db.cachedPatterns.toArray();
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to get cached patterns:', error);
      return [];
    }
  }

  /**
   * Filter data by consent level
   */
  public async filterByConsentLevel(level: ConsentLevel): Promise<void> {
    try {
      // Get all events that don't satisfy the consent level
      const eventsToRemove = await this.db.errorEvents
        .filter(event => !this.consentLevelSatisfies(event.consentLevel, level))
        .toArray();

      if (eventsToRemove.length > 0) {
        await this.db.errorEvents.bulkDelete(eventsToRemove.map(e => e.id));
        console.log(`[AnalyticsStorageManager] Removed ${eventsToRemove.length} events due to consent level change`);
      }
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to filter by consent level:', error);
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<StorageStats> {
    try {
      const totalEvents = await this.db.errorEvents.count();

      // Get date range
      const oldestEvent = await this.db.errorEvents.orderBy('timestamp').first();
      const newestEvent = await this.db.errorEvents.orderBy('timestamp').last();

      // Get counts by type and severity
      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const consentDistribution: Record<ConsentLevel, number> = {} as any;

      const allEvents = await this.db.errorEvents.toArray();
      let anonymizedEvents = 0;
      let totalSize = 0;

      allEvents.forEach(event => {
        // Count by type
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

        // Count by severity
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;

        // Count by consent level
        consentDistribution[event.consentLevel] = (consentDistribution[event.consentLevel] || 0) + 1;

        // Count anonymized events
        if (event.anonymized) anonymizedEvents++;

        // Estimate size (rough calculation)
        totalSize += JSON.stringify(event).length;
      });

      return {
        totalEvents,
        storageUsed: totalSize,
        storageQuota: this.config.storageQuota * 1024 * 1024, // Convert MB to bytes
        oldestEvent: oldestEvent?.timestamp,
        newestEvent: newestEvent?.timestamp,
        eventsByType,
        eventsBySeverity,
        averageQueryTime: 0, // Would need to track query times
        compressionRatio: this.compressionEnabled ? 0.7 : 1.0,
        anonymizedEvents,
        consentDistribution,
      };
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to get storage stats:', error);
      return {
        totalEvents: 0,
        storageUsed: 0,
        storageQuota: this.config.storageQuota * 1024 * 1024,
        eventsByType: {},
        eventsBySeverity: {},
        averageQueryTime: 0,
        compressionRatio: 1.0,
        anonymizedEvents: 0,
        consentDistribution: {} as any,
      };
    }
  }

  /**
   * Clear all analytics data
   */
  public async clearData(): Promise<void> {
    try {
      await this.db.errorEvents.clear();
      await this.db.aggregatedAnalytics.clear();
      await this.db.cachedPatterns.clear();

      console.log('[AnalyticsStorageManager] Cleared all analytics data');
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to clear data:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: ErrorAnalyticsConfig): void {
    this.config = newConfig;
    this.compressionEnabled = newConfig.enableCompression;
  }

  /**
   * Export data for backup or analysis
   */
  public async exportData(format: 'json' | 'csv'): Promise<Blob> {
    try {
      const events = await this.db.errorEvents.toArray();

      switch (format) {
        case 'json':
          return this.exportAsJSON(events);
        case 'csv':
          return this.exportAsCSV(events);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Import data from backup
   */
  public async importData(data: Blob, format: 'json' | 'csv'): Promise<void> {
    try {
      switch (format) {
        case 'json':
          await this.importFromJSON(data);
          break;
        case 'csv':
          await this.importFromCSV(data);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to import data:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources and destroy storage manager
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.retentionTimer) {
      clearInterval(this.retentionTimer);
    }

    this.db.close();
    console.log('[AnalyticsStorageManager] Destroyed');
  }

  // Private helper methods
  private generateEventId(event: ErrorEvent): string {
    return event.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRetentionExpiry(event: ErrorEvent): Date | undefined {
    if (this.config.dataRetentionDays <= 0) return undefined;

    const expiryDate = new Date(event.timestamp);
    expiryDate.setDate(expiryDate.getDate() + this.config.dataRetentionDays);

    return expiryDate;
  }

  private consentLevelSatisfies(eventLevel: ConsentLevel, requiredLevel: ConsentLevel): boolean {
    const levelHierarchy = {
      [ConsentLevel.NONE]: 0,
      [ConsentLevel.ESSENTIAL]: 1,
      [ConsentLevel.FUNCTIONAL]: 2,
      [ConsentLevel.ANALYTICS]: 3,
      [ConsentLevel.MARKETING]: 4,
    };

    return levelHierarchy[eventLevel] >= levelHierarchy[requiredLevel];
  }

  private convertToErrorEvent(storedEvent: StoredErrorEvent): ErrorEvent {
    const {
      id,
      createdAt,
      updatedAt,
      compressed,
      anonymized,
      consentLevel,
      retentionExpiresAt,
      archivedAt,
      dateIndex,
      hourIndex,
      typeIndex,
      severityIndex,
      processed,
      aggregatedAt,
      ...errorEvent
    } = storedEvent;

    return errorEvent as ErrorEvent;
  }

  private async updateAggregatedData(events: StoredErrorEvent[]): Promise<void> {
    try {
      // Group events by hour for aggregation
      const eventsByHour = new Map<string, StoredErrorEvent[]>();

      events.forEach(event => {
        const hourKey = this.getHourKey(event.timestamp);
        if (!eventsByHour.has(hourKey)) {
          eventsByHour.set(hourKey, []);
        }
        eventsByHour.get(hourKey)!.push(event);
      });

      // Update hourly aggregations
      for (const [hourKey, hourEvents] of eventsByHour) {
        await this.updateHourlyAggregation(hourKey, hourEvents);
      }
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to update aggregated data:', error);
    }
  }

  private getHourKey(timestamp: Date): string {
    return `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getHours()).padStart(2, '0')}`;
  }

  private async updateHourlyAggregation(hourKey: string, events: StoredErrorEvent[]): Promise<void> {
    try {
      const existingAggregation = await this.db.aggregatedAnalytics
        .where('period')
        .equals(hourKey)
        .and(a => a.type === 'hourly')
        .first();

      const errorsByType: Record<string, number> = {};
      const errorsByCategory: Record<string, number> = {};
      const errorsBySeverity: Record<string, number> = {};

      let totalResolutionTime = 0;
      let successfulRecoveries = 0;
      const uniqueUsers = new Set<string>();

      events.forEach(event => {
        // Count by type
        errorsByType[event.type] = (errorsByType[event.type] || 0) + 1;

        // Count by category
        errorsByCategory[event.category] = (errorsByCategory[event.category] || 0) + 1;

        // Count by severity
        errorsBySeverity[event.severity] = (errorsBySeverity[event.severity] || 0) + 1;

        // Resolution metrics
        if (event.recoveryTime) {
          totalResolutionTime += event.recoveryTime;
        }

        if (event.recoverySuccessful) {
          successfulRecoveries++;
        }

        // Unique users
        if (event.userId) {
          uniqueUsers.add(event.userId);
        }
      });

      const aggregation: AggregatedAnalytics = {
        id: existingAggregation?.id || `agg_${hourKey}_${Date.now()}`,
        type: 'hourly',
        period: hourKey,
        timestamp: new Date(hourKey),
        totalErrors: events.length,
        errorsByType,
        errorsByCategory,
        errorsBySeverity,
        averageResolutionTime: events.length > 0 ? totalResolutionTime / events.length : 0,
        recoveryRate: events.length > 0 ? successfulRecoveries / events.length : 0,
        uniqueUsers: uniqueUsers.size,
        userImpactScore: this.calculateUserImpactScore(events),
        createdAt: existingAggregation?.createdAt || new Date(),
        updatedAt: new Date(),
        expiresAt: this.calculateAggregationExpiry(),
      };

      if (existingAggregation) {
        await this.db.aggregatedAnalytics.update(existingAggregation.id, aggregation);
      } else {
        await this.db.aggregatedAnalytics.add(aggregation);
      }
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to update hourly aggregation:', error);
    }
  }

  private calculateUserImpactScore(events: StoredErrorEvent[]): number {
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };

    const totalScore = events.reduce((sum, event) => {
      return sum + severityScores[event.severity];
    }, 0);

    return events.length > 0 ? totalScore / events.length : 0;
  }

  private calculateAggregationExpiry(): Date {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 6); // Keep aggregations for 6 months
    return expiry;
  }

  private startCleanupTimer(): void {
    // Run cleanup every hour
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 60 * 60 * 1000);
  }

  private startRetentionTimer(): void {
    // Run retention cleanup daily
    this.retentionTimer = setInterval(() => {
      this.performRetentionCleanup();
    }, 24 * 60 * 60 * 1000);
  }

  private async performCleanup(): Promise<void> {
    try {
      // Clean up expired cache entries
      const now = new Date();
      const expiredPatterns = await this.db.cachedPatterns
        .where('expiresAt')
        .below(now)
        .toArray();

      if (expiredPatterns.length > 0) {
        await this.db.cachedPatterns.bulkDelete(expiredPatterns.map(p => p.id));
        console.log(`[AnalyticsStorageManager] Cleaned up ${expiredPatterns.length} expired patterns`);
      }
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to perform cleanup:', error);
    }
  }

  private async performRetentionCleanup(): Promise<void> {
    try {
      if (this.config.dataRetentionDays <= 0) return;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays);

      const expiredEvents = await this.db.errorEvents
        .where('timestamp')
        .below(cutoffDate)
        .toArray();

      if (expiredEvents.length > 0) {
        await this.db.errorEvents.bulkDelete(expiredEvents.map(e => e.id));
        console.log(`[AnalyticsStorageManager] Cleaned up ${expiredEvents.length} expired events`);
      }
    } catch (error) {
      console.error('[AnalyticsStorageManager] Failed to perform retention cleanup:', error);
    }
  }

  private async exportAsJSON(events: StoredErrorEvent[]): Promise<Blob> {
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      totalEvents: events.length,
      events: events.map(event => this.convertToErrorEvent(event)),
    };

    const json = JSON.stringify(exportData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  private async exportAsCSV(events: StoredErrorEvent[]): Promise<Blob> {
    const headers = [
      'ID', 'Timestamp', 'Type', 'Category', 'Severity', 'Message',
      'Session ID', 'User ID', 'Recovery Attempted', 'Recovery Successful',
      'Resolution Time', 'PII Anonymized', 'Consent Level'
    ];

    const csvRows = [headers.join(',')];

    events.forEach(event => {
      const row = [
        event.id,
        event.timestamp.toISOString(),
        event.type,
        event.category,
        event.severity,
        `"${event.message.replace(/"/g, '""')}"`, // Escape quotes
        event.sessionId,
        event.userId || '',
        event.recoveryAttempted,
        event.recoverySuccessful,
        event.recoveryTime || '',
        event.piiAnonymized,
        event.consentLevel,
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }

  private async importFromJSON(data: Blob): Promise<void> {
    const text = await data.text();
    const importData = JSON.parse(text);

    if (importData.events && Array.isArray(importData.events)) {
      const storedEvents = importData.events.map((event: ErrorEvent) => ({
        ...event,
        id: this.generateEventId(event),
        compressed: this.compressionEnabled,
        anonymized: this.config.anonymizePII,
        consentLevel: event.consentLevel || this.config.defaultConsentLevel,
        retentionExpiresAt: this.calculateRetentionExpiry(event),
      }));

      await this.db.errorEvents.bulkPut(storedEvents);
      console.log(`[AnalyticsStorageManager] Imported ${storedEvents.length} events`);
    }
  }

  private async importFromCSV(data: Blob): Promise<void> {
    const text = await data.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',');

    const events: StoredErrorEvent[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length === headers.length) {
        const event: Partial<StoredErrorEvent> = {
          id: values[0],
          timestamp: new Date(values[1]),
          type: values[2],
          category: values[3],
          severity: values[4],
          message: values[5].replace(/""/g, '"').slice(1, -1), // Remove quotes and unescape
          sessionId: values[6],
          userId: values[7] || undefined,
          recoveryAttempted: values[8] === 'true',
          recoverySuccessful: values[9] === 'true',
          recoveryTime: values[10] ? parseInt(values[10]) : undefined,
          piiAnonymized: values[11] === 'true',
          consentLevel: values[12] as ConsentLevel,
        };

        events.push({
          ...event,
          dateIndex: this.createDateIndexForEvent(event.timestamp!),
          hourIndex: event.timestamp!.getHours(),
          typeIndex: event.type!,
          severityIndex: event.severity!,
          compressed: this.compressionEnabled,
          anonymized: this.config.anonymizePII,
          retentionExpiresAt: this.calculateRetentionExpiry(event as ErrorEvent),
        } as StoredErrorEvent);
      }
    }

    if (events.length > 0) {
      await this.db.errorEvents.bulkPut(events);
      console.log(`[AnalyticsStorageManager] Imported ${events.length} events from CSV`);
    }
  }

  private createDateIndexForEvent(timestamp: Date): number {
    return timestamp.getFullYear() * 10000 +
           (timestamp.getMonth() + 1) * 100 +
           timestamp.getDate();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create analytics storage manager with configuration
 */
export function createAnalyticsStorageManager(config: ErrorAnalyticsConfig): AnalyticsStorageManager {
  return new AnalyticsStorageManager(config);
}

/**
 * Get analytics storage manager instance
 */
export function getAnalyticsStorageManager(): AnalyticsStorageManager {
  return new AnalyticsStorageManager({
    enableRealTimeCollection: true,
    enableUserBehaviorTracking: true,
    enablePerformanceMetrics: true,
    enableSystemInfoCollection: true,
    defaultConsentLevel: ConsentLevel.FUNCTIONAL,
    dataRetentionDays: 90,
    anonymizePII: true,
    gdprCompliant: true,
    storageQuota: 50,
    batchSize: 100,
    processingInterval: 60000,
    enableCompression: true,
    enableAlerts: true,
    errorRateThreshold: 0.05,
    criticalErrorThreshold: 0.01,
    alertWebhooks: [],
    enableDashboard: true,
    refreshInterval: 30000,
    exportFormats: ['json', 'csv'],
    enableSampling: false,
    sampleRate: 1.0,
    enableAggregation: true,
    aggregationWindow: 300000,
  });
}
