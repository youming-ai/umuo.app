/**
 * Analytics Utility Functions
 *
 * Helper functions and utilities for mobile analytics operations.
 *
 * @version 1.0.0
 */

import { AnalyticsEventType, ConsentLevel } from '../mobile-analytics';
import { TouchInteractionType, TouchTarget } from '../../../types/mobile';

// ============================================================================
// ANALYTICS UTILITIES
// ============================================================================

/**
 * Generate unique ID for analytics events
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique user ID
 */
export function generateUserId(): string {
  return `usr_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format timestamp for analytics
 */
export function formatTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * Calculate session duration
 */
export function calculateSessionDuration(startTime: Date, endTime?: Date): number {
  const end = endTime || new Date();
  return end.getTime() - startTime.getTime();
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Convert milliseconds to human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Debounce function for analytics events
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for analytics events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if value is a valid analytics event type
 */
export function isValidEventType(value: string): value is AnalyticsEventType {
  return Object.values(AnalyticsEventType).includes(value as AnalyticsEventType);
}

/**
 * Check if value is a valid touch interaction type
 */
export function isValidTouchInteraction(value: string): value is TouchInteractionType {
  return Object.values(TouchInteractionType).includes(value as TouchInteractionType);
}

/**
 * Check if value is a valid touch target
 */
export function isValidTouchTarget(value: string): value is TouchTarget {
  return Object.values(TouchTarget).includes(value as TouchTarget);
}

/**
 * Sanitize analytics data
 */
export function sanitizeData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    // Skip potentially sensitive fields
    if (isSensitiveField(key)) {
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else if (typeof value === 'string') {
      // Sanitize strings to prevent XSS
      sanitized[key] = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Check if field name is sensitive
 */
export function isSensitiveField(fieldName: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /credit/i,
    /card/i,
    /ssn/i,
    /social/i,
    /phone/i,
    /email/i,
    /address/i,
    /name/i,
    /user/i,
    /account/i,
    /profile/i,
    /personal/i,
    /private/i,
    /confidential/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(fieldName));
}

/**
 * Hash sensitive data
 */
export function hashData(data: string, algorithm: 'simple' | 'sha256' = 'simple'): string {
  if (algorithm === 'sha256') {
    // In a real implementation, use crypto.subtle.digest
    return simpleHash(data);
  }

  return simpleHash(data);
}

/**
 * Simple hash function
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get device type from user agent
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.screen.width;

  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return screenWidth < 768 ? 'mobile' : 'tablet';
  }

  if (/tablet|ipad|android(?!.*mobile)/i.test(userAgent)) {
    return 'tablet';
  }

  return 'desktop';
}

/**
 * Get browser information
 */
export function getBrowserInfo(): { name: string; version: string } {
  const userAgent = navigator.userAgent;

  // Browser detection
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    return { name: 'Chrome', version: match ? match[1] : 'Unknown' };
  }

  if (userAgent.includes('Firefox')) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    return { name: 'Firefox', version: match ? match[1] : 'Unknown' };
  }

  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/(\d+)/);
    return { name: 'Safari', version: match ? match[1] : 'Unknown' };
  }

  if (userAgent.includes('Edg')) {
    const match = userAgent.match(/Edg\/(\d+)/);
    return { name: 'Edge', version: match ? match[1] : 'Unknown' };
  }

  return { name: 'Unknown', version: 'Unknown' };
}

/**
 * Get operating system information
 */
export function getOSInfo(): { name: string; version: string } {
  const userAgent = navigator.userAgent;

  // OS detection
  if (userAgent.includes('Windows')) {
    const match = userAgent.match(/Windows NT (\d+\.\d+)/);
    return { name: 'Windows', version: match ? match[1] : 'Unknown' };
  }

  if (userAgent.includes('Mac OS')) {
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    return { name: 'macOS', version: match ? match[1].replace('_', '.') : 'Unknown' };
  }

  if (userAgent.includes('Linux')) {
    return { name: 'Linux', version: 'Unknown' };
  }

  if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android (\d+(?:\.\d+)?)/);
    return { name: 'Android', version: match ? match[1] : 'Unknown' };
  }

  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    const match = userAgent.match(/OS (\d+[._]\d+)/);
    return { name: 'iOS', version: match ? match[1].replace('_', '.') : 'Unknown' };
  }

  return { name: 'Unknown', version: 'Unknown' };
}

/**
 * Get network connection type
 */
export function getNetworkType(): string {
  const connection = (navigator as any).connection ||
                    (navigator as any).mozConnection ||
                    (navigator as any).webkitConnection;

  if (connection) {
    return connection.type || 'unknown';
  }

  return navigator.onLine ? 'online' : 'offline';
}

/**
 * Get network effective type
 */
export function getNetworkEffectiveType(): string {
  const connection = (navigator as any).connection ||
                    (navigator as any).mozConnection ||
                    (navigator as any).webkitConnection;

  if (connection && connection.effectiveType) {
    return connection.effectiveType;
  }

  return 'unknown';
}

/**
 * Check if device has touch support
 */
export function hasTouchSupport(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get viewport information
 */
export function getViewportInfo(): { width: number; height: number; orientation: 'portrait' | 'landscape' } {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation = width > height ? 'landscape' : 'portrait';

  return { width, height, orientation };
}

/**
 * Get screen information
 */
export function getScreenInfo(): {
  width: number;
  height: number;
  colorDepth: number;
  pixelRatio: number;
} {
  const screen = window.screen;
  const pixelRatio = window.devicePixelRatio || 1;

  return {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio,
  };
}

/**
 * Get memory information
 */
export function getMemoryInfo(): { used: number; total: number; limit: number } | null {
  const memory = (performance as any).memory;

  if (!memory) {
    return null;
  }

  return {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    limit: memory.jsHeapSizeLimit,
  };
}

/**
 * Check if Do Not Track is enabled
 */
export function isDoNotTrackEnabled(): boolean {
  return navigator.doNotTrack === '1' ||
         (window as any).doNotTrack === '1' ||
         (navigator as any).msDoNotTrack === '1';
}

/**
 * Check if Global Privacy Control is enabled
 */
export function isGlobalPrivacyControlEnabled(): boolean {
  return (navigator as any).globalPrivacyControl === true;
}

/**
 * Check if tracking should be allowed
 */
export function isTrackingAllowed(respectDoNotTrack: boolean = true): boolean {
  if (respectDoNotTrack && (isDoNotTrackEnabled() || isGlobalPrivacyControlEnabled())) {
    return false;
  }

  return true;
}

/**
 * Get consent level from string
 */
export function parseConsentLevel(level: string): ConsentLevel {
  const normalized = level.toLowerCase();

  switch (normalized) {
    case 'none':
      return ConsentLevel.NONE;
    case 'functional':
      return ConsentLevel.FUNCTIONAL;
    case 'analytics':
      return ConsentLevel.ANALYTICS;
    case 'marketing':
      return ConsentLevel.MARKETING;
    case 'all':
      return ConsentLevel.ALL;
    default:
      return ConsentLevel.NONE;
  }
}

/**
 * Convert consent level to string
 */
export function consentLevelToString(level: ConsentLevel): string {
  switch (level) {
    case ConsentLevel.NONE:
      return 'none';
    case ConsentLevel.FUNCTIONAL:
      return 'functional';
    case ConsentLevel.ANALYTICS:
      return 'analytics';
    case ConsentLevel.MARKETING:
      return 'marketing';
    case ConsentLevel.ALL:
      return 'all';
    default:
      return 'none';
  }
}

/**
 * Validate analytics configuration
 */
export function validateConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof config !== 'object' || config === null) {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }

  // Validate boolean fields
  const booleanFields = [
    'enabled', 'debugMode', 'anonymizePII', 'collectLocation',
    'collectDeviceId', 'respectDoNotTrack', 'cookieConsentRequired',
    'batteryConscious', 'networkAware', 'offlineBuffering',
    'collectUserBehavior', 'collectPerformanceMetrics',
    'collectDeviceInfo', 'collectNetworkInfo', 'collectBatteryInfo',
    'enableRealtimeReporting', 'compressionEnabled',
    'enableGestureTracking', 'enableVoiceCommands',
    'enableOfflineMode', 'enableHapticFeedback'
  ];

  booleanFields.forEach(field => {
    if (config[field] !== undefined && typeof config[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  });

  // Validate numeric fields
  const numericFields = [
    'batchSize', 'flushInterval', 'maxRetries', 'retryDelay',
    'memoryLimit'
  ];

  numericFields.forEach(field => {
    if (config[field] !== undefined && (typeof config[field] !== 'number' || config[field] < 0)) {
      errors.push(`${field} must be a positive number`);
    }
  });

  // Validate string fields
  const stringFields = ['endpoint', 'apiKey'];

  stringFields.forEach(field => {
    if (config[field] !== undefined && typeof config[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Merge analytics configurations
 */
export function mergeConfigs(base: any, override: any): any {
  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Create analytics event validation schema
 */
export function createEventSchema() {
  return {
    id: 'string',
    type: 'string',
    timestamp: 'date',
    sessionId: 'string',
    userId: 'string?',
    data: 'object',
    context: 'object',
    consent: 'string',
    anonymized: 'boolean',
  };
}

/**
 * Validate analytics event
 */
export function validateEvent(event: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event || typeof event !== 'object') {
    errors.push('Event must be an object');
    return { valid: false, errors };
  }

  // Required fields
  const requiredFields = ['id', 'type', 'timestamp', 'sessionId', 'data', 'context', 'consent', 'anonymized'];

  requiredFields.forEach(field => {
    if (!(field in event)) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Field type validation
  if (event.id && typeof event.id !== 'string') {
    errors.push('Event id must be a string');
  }

  if (event.type && !isValidEventType(event.type)) {
    errors.push(`Invalid event type: ${event.type}`);
  }

  if (event.timestamp && !(event.timestamp instanceof Date)) {
    errors.push('Event timestamp must be a Date object');
  }

  if (event.sessionId && typeof event.sessionId !== 'string') {
    errors.push('Event sessionId must be a string');
  }

  if (event.userId && typeof event.userId !== 'string') {
    errors.push('Event userId must be a string');
  }

  if (event.data && typeof event.data !== 'object') {
    errors.push('Event data must be an object');
  }

  if (event.context && typeof event.context !== 'object') {
    errors.push('Event context must be an object');
  }

  if (event.consent && !Object.values(ConsentLevel).includes(event.consent)) {
    errors.push(`Invalid consent level: ${event.consent}`);
  }

  if (event.anonymized && typeof event.anonymized !== 'boolean') {
    errors.push('Event anonymized must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate analytics metrics from events
 */
export function calculateMetrics(events: any[]): {
  totalEvents: number;
  eventsByType: Record<string, number>;
  uniqueSessions: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  errorRate: number;
  performanceMetrics: Record<string, number>;
} {
  const eventsByType: Record<string, number> = {};
  const sessions = new Set<string>();
  const users = new Set<string>();
  const sessionDurations: number[] = [];
  let errorCount = 0;
  const performanceMetrics: Record<string, number> = {};

  events.forEach(event => {
    // Count by type
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

    // Track unique sessions and users
    if (event.sessionId) sessions.add(event.sessionId);
    if (event.userId) users.add(event.userId);

    // Track errors
    if (event.type === AnalyticsEventType.ERROR_OCCURRED) {
      errorCount++;
    }

    // Collect performance metrics
    if (event.type === AnalyticsEventType.PERFORMANCE_METRIC) {
      const { name, value } = event.data;
      if (name && typeof value === 'number') {
        if (!performanceMetrics[name]) {
          performanceMetrics[name] = [];
        }
        performanceMetrics[name].push(value);
      }
    }

    // Track session durations
    if (event.type === AnalyticsEventType.SESSION_END) {
      const duration = event.data.duration;
      if (typeof duration === 'number') {
        sessionDurations.push(duration);
      }
    }
  });

  // Calculate average performance metrics
  const averagedPerformanceMetrics: Record<string, number> = {};
  Object.entries(performanceMetrics).forEach(([name, values]) => {
    averagedPerformanceMetrics[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
  });

  // Calculate average session duration
  const averageSessionDuration = sessionDurations.length > 0 ?
    sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length : 0;

  return {
    totalEvents: events.length,
    eventsByType,
    uniqueSessions: sessions.size,
    uniqueUsers: users.size,
    averageSessionDuration,
    errorRate: events.length > 0 ? errorCount / events.length : 0,
    performanceMetrics: averagedPerformanceMetrics,
  };
}
