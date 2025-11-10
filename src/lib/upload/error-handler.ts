/**
 * Error Handler for chunked upload system
 *
 * This module provides comprehensive error handling, classification, and recovery strategies
 * for the chunked upload system.
 */

import type {
  UploadError,
  ChunkInfo,
  UploadSession
} from "@/types/upload";

export class UploadErrorHandler {
  private errorHistory: Map<string, ErrorRecord[]> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy[]> = new Map();
  private maxHistorySize = 100;

  constructor() {
    this.initializeRecoveryStrategies();
  }

  /**
   * Handle and classify an upload error
   */
  public handleError(
    error: any,
    sessionId: string,
    chunkId?: string,
    context?: ErrorContext
  ): UploadError {
    const uploadError = this.createUploadError(error, sessionId, chunkId, context);

    // Record error for pattern analysis
    this.recordError(uploadError);

    // Apply recovery strategy if available
    const recoveryAction = this.getRecoveryAction(uploadError);
    if (recoveryAction) {
      uploadError.recoveryAction = recoveryAction;
    }

    return uploadError;
  }

  /**
   * Get error statistics for a session
   */
  public getErrorStatistics(sessionId: string): ErrorStatistics {
    const errors = this.errorHistory.get(sessionId) || [];

    const errorCounts = errors.reduce((counts, record) => {
      counts[record.error.code] = (counts[record.error.code] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const retryableErrors = errors.filter(r => r.error.retryable).length;
    const recoverableErrors = errors.filter(r => r.error.recoverable).length;
    const criticalErrors = errors.filter(r => !r.error.retryable && !r.error.recoverable).length;

    // Calculate error patterns
    const patterns = this.analyzeErrorPatterns(errors);

    return {
      totalErrors: errors.length,
      errorCounts,
      retryableErrors,
      recoverableErrors,
      criticalErrors,
      patterns,
      recommendations: this.generateErrorRecommendations(errorCounts, patterns),
    };
  }

  /**
   * Clear error history for a session
   */
  public clearErrorHistory(sessionId: string): void {
    this.errorHistory.delete(sessionId);
  }

  /**
   * Check if a pattern suggests retry should be avoided
   */
  public shouldAvoidRetry(sessionId: string, currentError: UploadError): boolean {
    const errors = this.errorHistory.get(sessionId) || [];

    // Check for repeated non-retryable errors
    const sameErrorCount = errors.filter(
      e => e.error.code === currentError.code && !e.error.retryable
    ).length;

    if (sameErrorCount >= 3) {
      return true; // Too many non-retryable errors of the same type
    }

    // Check for authentication errors
    if (currentError.code === 'AUTHENTICATION_ERROR') {
      return true; // Don't retry auth errors
    }

    // Check for file size errors
    if (currentError.code === 'FILE_TOO_LARGE') {
      return true; // Don't retry file size errors
    }

    // Check for cascading failures
    const recentErrors = errors.filter(
      e => Date.now() - e.timestamp < 60000 // Last minute
    ).length;

    if (recentErrors >= 10) {
      return true; // Too many recent errors
    }

    return false;
  }

  /**
   * Get suggested retry delay based on error pattern
   */
  public getSuggestedRetryDelay(
    sessionId: string,
    currentError: UploadError,
    attemptNumber: number
  ): number {
    const errors = this.errorHistory.get(sessionId) || [];

    // Base delay with exponential backoff
    let baseDelay = 1000 * Math.pow(2, attemptNumber);

    // Adjust based on error type
    switch (currentError.code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
        baseDelay *= 1.5; // Increase for network issues
        break;

      case 'SERVER_ERROR':
        baseDelay *= 2; // Increase more for server errors
        break;

      case 'RATE_LIMIT_ERROR':
        baseDelay = Math.max(baseDelay, 30000); // Minimum 30 seconds for rate limiting
        break;
    }

    // Check error frequency
    const recentErrors = errors.filter(
      e => Date.now() - e.timestamp < 300000 // Last 5 minutes
    ).length;

    if (recentErrors > 5) {
      baseDelay *= 2; // Increase delay for high error frequency
    }

    // Add jitter to avoid thundering herd
    const jitter = baseDelay * 0.1 * Math.random();

    return Math.min(baseDelay + jitter, 60000); // Cap at 60 seconds
  }

  /**
   * Check if upload should be abandoned
   */
  public shouldAbandonUpload(sessionId: string): boolean {
    const errors = this.errorHistory.get(sessionId) || [];

    // Check for too many critical errors
    const criticalErrors = errors.filter(
      e => !e.error.retryable && !e.error.recoverable
    ).length;

    if (criticalErrors >= 3) {
      return true;
    }

    // Check for too many total errors
    if (errors.length >= 50) {
      return true;
    }

    // Check for persistent authentication errors
    const authErrors = errors.filter(e => e.error.code === 'AUTHENTICATION_ERROR').length;
    if (authErrors >= 2) {
      return true;
    }

    // Check for error rate (more than 1 error per 10 seconds on average)
    const sessionDuration = Date.now() - (errors[0]?.timestamp || Date.now());
    const errorRate = sessionDuration > 0 ? (errors.length / sessionDuration) * 10000 : 0;

    if (errorRate > 1) {
      return true;
    }

    return false;
  }

  /**
   * Generate diagnostic report
   */
  public generateDiagnosticReport(sessionId: string): DiagnosticReport {
    const errors = this.errorHistory.get(sessionId) || [];
    const stats = this.getErrorStatistics(sessionId);

    const report: DiagnosticReport = {
      sessionId,
      timestamp: Date.now(),
      errorCount: errors.length,
      errorTypes: Object.keys(stats.errorCounts),
      criticalIssues: [],
      recommendations: stats.recommendations,
      recoveryActions: this.getApplicableRecoveryActions(errors),
    };

    // Identify critical issues
    if (stats.criticalErrors > 0) {
      report.criticalIssues.push("Critical errors detected that cannot be retried");
    }

    if (stats.retryableErrors > stats.totalErrors * 0.5) {
      report.criticalIssues.push("High retryable error rate suggests network instability");
    }

    if (stats.patterns.cascadingFailures) {
      report.criticalIssues.push("Cascading failures detected");
    }

    if (stats.patterns.authenticationIssues) {
      report.criticalIssues.push("Authentication issues detected");
    }

    // Add specific error analysis
    for (const [errorCode, count] of Object.entries(stats.errorCounts)) {
      if (count > 10) {
        report.criticalIssues.push(`High frequency of ${errorCode} errors (${count} occurrences)`);
      }
    }

    return report;
  }

  // Private methods

  private createUploadError(
    error: any,
    sessionId: string,
    chunkId?: string,
    context?: ErrorContext
  ): UploadError {
    const uploadError: UploadError = {
      name: 'UploadError',
      message: error?.message || 'Unknown upload error',
      code: this.determineErrorCode(error),
      sessionId,
      chunkId,
      retryable: false,
      recoverable: true,
      metadata: {
        timestamp: Date.now(),
        context,
        originalError: error,
      },
    };

    // Determine error characteristics
    this.setErrorCharacteristics(uploadError, error);

    return uploadError;
  }

  private determineErrorCode(error: any): string {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.response?.status;

    // Network-related errors
    if (message.includes('network') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }

    if (message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }

    if (message.includes('abort')) {
      return 'UPLOAD_CANCELLED';
    }

    // HTTP status code errors
    if (status) {
      if (status === 401 || status === 403) {
        return 'AUTHENTICATION_ERROR';
      }

      if (status === 413) {
        return 'FILE_TOO_LARGE';
      }

      if (status === 429) {
        return 'RATE_LIMIT_ERROR';
      }

      if (status >= 500) {
        return 'SERVER_ERROR';
      }
    }

    // Message-based classification
    if (message.includes('file too large')) {
      return 'FILE_TOO_LARGE';
    }

    if (message.includes('quota') || message.includes('storage')) {
      return 'STORAGE_ERROR';
    }

    if (message.includes('corrupt') || message.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  private setErrorCharacteristics(uploadError: UploadError, originalError: any): void {
    const errorCode = uploadError.code;

    // Determine retryability
    const retryableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVER_ERROR',
      'RATE_LIMIT_ERROR',
    ];

    uploadError.retryable = retryableErrors.includes(errorCode);

    // Determine recoverability
    const nonRecoverableErrors = [
      'AUTHENTICATION_ERROR',
      'FILE_TOO_LARGE',
      'VALIDATION_ERROR',
      'UPLOAD_CANCELLED',
    ];

    uploadError.recoverable = !nonRecoverableErrors.includes(errorCode);

    // Add additional metadata
    uploadError.metadata = {
      ...uploadError.metadata,
      httpStatus: originalError?.status || originalError?.response?.status,
      url: originalError?.config?.url || originalError?.url,
      method: originalError?.config?.method || 'POST',
      headers: originalError?.config?.headers,
    };
  }

  private recordError(error: UploadError): void {
    const sessionId = error.sessionId;

    if (!this.errorHistory.has(sessionId)) {
      this.errorHistory.set(sessionId, []);
    }

    const errors = this.errorHistory.get(sessionId)!;

    errors.push({
      error,
      timestamp: Date.now(),
    });

    // Limit history size
    if (errors.length > this.maxHistorySize) {
      errors.shift();
    }
  }

  private initializeRecoveryStrategies(): void {
    // Network error strategies
    this.recoveryStrategies.set('NETWORK_ERROR', [
      {
        name: 'retry_with_backoff',
        description: 'Retry upload with exponential backoff',
        priority: 1,
        autoApply: true,
      },
      {
        name: 'reduce_chunk_size',
        description: 'Reduce chunk size for better reliability',
        priority: 2,
        autoApply: false,
      },
      {
        name: 'check_connectivity',
        description: 'Verify network connectivity',
        priority: 3,
        autoApply: true,
      },
    ]);

    // Timeout error strategies
    this.recoveryStrategies.set('TIMEOUT_ERROR', [
      {
        name: 'increase_timeout',
        description: 'Increase network timeout',
        priority: 1,
        autoApply: true,
      },
      {
        name: 'reduce_concurrent_uploads',
        description: 'Reduce concurrent upload limit',
        priority: 2,
        autoApply: true,
      },
    ]);

    // Server error strategies
    this.recoveryStrategies.set('SERVER_ERROR', [
      {
        name: 'retry_with_exponential_backoff',
        description: 'Retry with longer backoff',
        priority: 1,
        autoApply: true,
      },
      {
        name: 'reduce_request_rate',
        description: 'Slow down request rate',
        priority: 2,
        autoApply: false,
      },
    ]);

    // Rate limit strategies
    this.recoveryStrategies.set('RATE_LIMIT_ERROR', [
      {
        name: 'extend_retry_delay',
        description: 'Use longer retry delay',
        priority: 1,
        autoApply: true,
      },
      {
        name: 'reduce_concurrent_uploads',
        description: 'Reduce concurrent uploads',
        priority: 2,
        autoApply: true,
      },
    ]);
  }

  private getRecoveryAction(error: UploadError): RecoveryStrategy | null {
    const strategies = this.recoveryStrategies.get(error.code) || [];

    // Return highest priority auto-apply strategy
    return strategies.find(s => s.autoApply) || null;
  }

  private analyzeErrorPatterns(errors: ErrorRecord[]): ErrorPatterns {
    const patterns: ErrorPatterns = {
      cascadingFailures: false,
      authenticationIssues: false,
      networkInstability: false,
      periodicErrors: false,
    };

    if (errors.length < 5) {
      return patterns;
    }

    // Check for cascading failures (many errors in short time)
    const recentErrors = errors.filter(e => Date.now() - e.timestamp < 60000); // Last minute
    patterns.cascadingFailures = recentErrors.length >= 10;

    // Check for authentication issues
    const authErrors = errors.filter(e => e.error.code === 'AUTHENTICATION_ERROR');
    patterns.authenticationIssues = authErrors.length > 0;

    // Check for network instability
    const networkErrors = errors.filter(e =>
      ['NETWORK_ERROR', 'TIMEOUT_ERROR'].includes(e.error.code)
    );
    patterns.networkInstability = networkErrors.length > errors.length * 0.3;

    // Check for periodic errors (regular intervals)
    if (errors.length >= 10) {
      const intervals = [];
      for (let i = 1; i < errors.length; i++) {
        intervals.push(errors[i].timestamp - errors[i - 1].timestamp);
      }

      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2);
      }, 0) / intervals.length;

      const standardDeviation = Math.sqrt(variance);
      patterns.periodicErrors = standardDeviation < avgInterval * 0.2; // Low variance suggests periodicity
    }

    return patterns;
  }

  private generateErrorRecommendations(
    errorCounts: Record<string, number>,
    patterns: ErrorPatterns
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations based on error types
    if (errorCounts['NETWORK_ERROR'] > 0) {
      recommendations.push("Consider implementing network connectivity checks");
      recommendations.push("Add offline detection and queueing");
    }

    if (errorCounts['TIMEOUT_ERROR'] > 0) {
      recommendations.push("Increase timeout values for large files");
      recommendations.push("Consider implementing progressive timeouts");
    }

    if (errorCounts['RATE_LIMIT_ERROR'] > 0) {
      recommendations.push("Implement adaptive rate limiting");
      recommendations.push("Add delay between concurrent uploads");
    }

    if (errorCounts['SERVER_ERROR'] > 0) {
      recommendations.push("Add server health checks");
      recommendations.push("Implement circuit breaker pattern");
    }

    // Pattern-based recommendations
    if (patterns.cascadingFailures) {
      recommendations.push("Implement circuit breaker to prevent cascading failures");
      recommendations.push("Add exponential backoff with jitter");
    }

    if (patterns.networkInstability) {
      recommendations.push("Implement robust retry mechanisms");
      recommendations.push("Consider smaller chunk sizes for unstable networks");
    }

    if (patterns.periodicErrors) {
      recommendations.push("Investigate periodic system issues");
      recommendations.push("Consider scheduling uploads during off-peak hours");
    }

    return recommendations;
  }

  private getApplicableRecoveryActions(errors: ErrorRecord[]): RecoveryStrategy[] {
    const actions: RecoveryStrategy[] = [];
    const seenActions = new Set<string>();

    for (const record of errors) {
      const strategies = this.recoveryStrategies.get(record.error.code) || [];

      for (const strategy of strategies) {
        if (!seenActions.has(strategy.name)) {
          actions.push(strategy);
          seenActions.add(strategy.name);
        }
      }
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  private log(message: string, data?: any): void {
    console.log(`[UploadErrorHandler] ${message}`, data);
  }
}

// Supporting interfaces

interface ErrorRecord {
  error: UploadError;
  timestamp: number;
}

interface ErrorContext {
  chunkIndex?: number;
  retryAttempt?: number;
  networkCondition?: any;
  uploadPhase?: 'initialization' | 'chunk_upload' | 'verification' | 'completion';
}

interface RecoveryStrategy {
  name: string;
  description: string;
  priority: number;
  autoApply: boolean;
}

interface ErrorStatistics {
  totalErrors: number;
  errorCounts: Record<string, number>;
  retryableErrors: number;
  recoverableErrors: number;
  criticalErrors: number;
  patterns: ErrorPatterns;
  recommendations: string[];
}

interface ErrorPatterns {
  cascadingFailures: boolean;
  authenticationIssues: boolean;
  networkInstability: boolean;
  periodicErrors: boolean;
}

interface DiagnosticReport {
  sessionId: string;
  timestamp: number;
  errorCount: number;
  errorTypes: string[];
  criticalIssues: string[];
  recommendations: string[];
  recoveryActions: RecoveryStrategy[];
}

// Extend UploadError interface to include recovery action
declare module "@/types/upload" {
  interface UploadError {
    recoveryAction?: RecoveryStrategy;
  }
}

export default UploadErrorHandler;
