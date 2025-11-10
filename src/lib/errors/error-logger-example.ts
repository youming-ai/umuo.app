/**
 * Error Logger Integration Example
 *
 * This file demonstrates how to integrate and use the error logging system
 * with the existing error handling components in the umuo.app application.
 */

import { getLogger, logError, logInfo, logWarning, logDebug, logCritical } from "./error-logging";
import { ErrorCategory, ErrorSeverity } from "@/types/api/errors";
import { ErrorHandler } from "@/lib/utils/error-handler";

/**
 * Initialize the error logging system with custom configuration
 */
export async function initializeErrorLogging(): Promise<void> {
  const logger = getLogger();

  await logger.initialize({
    monitoringManager: {
      services: [
        {
          id: "sentry",
          name: "Sentry Error Tracking",
          type: "sentry",
          enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
          config: {
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
            environment: process.env.NODE_ENV,
            release: process.env.npm_package_version,
            tracesSampleRate: 0.1,
          },
          filters: [],
          transformers: [],
          batchSize: 50,
          flushInterval: 10000,
          timeout: 30000,
          errorHandling: {
            retryAttempts: 3,
            retryDelay: 1000,
            fallbackMode: "ignore",
          },
        },
        {
          id: "custom-endpoint",
          name: "Custom Error Endpoint",
          type: "custom",
          enabled: !!process.env.ERROR_LOGGING_ENDPOINT,
          config: {
            endpoint: process.env.ERROR_LOGGING_ENDPOINT,
            apiKey: process.env.ERROR_LOGGING_API_KEY,
            headers: {
              "Content-Type": "application/json",
              "X-App-Version": process.env.npm_package_version || "1.0.0",
            },
          },
          filters: [],
          transformers: [],
          batchSize: 25,
          flushInterval: 5000,
          timeout: 15000,
          errorHandling: {
            retryAttempts: 2,
            retryDelay: 500,
            fallbackMode: "queue",
          },
        },
      ],
      batchSize: 50,
      flushInterval: 10000,
      timeout: 30000,
    },
    alertManager: {
      enabled: true,
      rules: [
        {
          id: "critical-errors",
          name: "Critical Error Alerts",
          enabled: true,
          priority: 1,
          conditions: {
            errorSeverities: [ErrorSeverity.CRITICAL],
            threshold: {
              count: 1,
              timeWindow: 5 * 60 * 1000, // 5 minutes
              operator: "gte",
            },
          },
          alert: {
            title: "🚨 Critical Error Detected",
            message: "A critical error occurred: {{error.message}} in {{context.component}}",
            severity: "critical",
            channels: [
              {
                id: "console-alert",
                type: "console",
                enabled: true,
                config: {
                  format: "pretty",
                  colorize: true,
                },
              },
              ...(process.env.SLACK_WEBHOOK_URL ? [{
                id: "slack-alert",
                type: "slack",
                enabled: true,
                config: {
                  webhookUrl: process.env.SLACK_WEBHOOK_URL,
                  channel: "#alerts",
                  username: "umuo-app-errors",
                },
              }] : []),
            ],
            cooldown: 15 * 60 * 1000, // 15 minutes
          },
          rateLimiting: {
            maxAlerts: 5,
            timeWindow: 60 * 60 * 1000, // 1 hour
          },
        },
        {
          id: "transcription-failures",
          name: "Transcription Service Failures",
          enabled: true,
          priority: 2,
          conditions: {
            errorCategories: [ErrorCategory.TRANSCRIPTION],
            threshold: {
              count: 3,
              timeWindow: 10 * 60 * 1000, // 10 minutes
              operator: "gte",
            },
          },
          alert: {
            title: "📝 Transcription Service Issues",
            message: "Multiple transcription failures detected: {{error.message}}",
            severity: "high",
            channels: [
              {
                id: "console-transcription",
                type: "console",
                enabled: true,
                config: {
                  format: "pretty",
                  colorize: true,
                },
              },
            ],
            cooldown: 30 * 60 * 1000, // 30 minutes
          },
          rateLimiting: {
            maxAlerts: 3,
            timeWindow: 60 * 60 * 1000, // 1 hour
          },
        },
      ],
      channels: [],
      cooldown: 5 * 60 * 1000, // 5 minutes
    },
    mobileOptimization: {
      enabled: true,
      batteryOptimization: {
        enabled: true,
        lowPowerMode: "reduce",
        batteryThreshold: 20,
      },
      networkOptimization: {
        enabled: true,
        offlineBuffering: true,
        batchSize: 25,
        compressionEnabled: true,
        adaptiveQuality: true,
        networkTypes: {
          wifi: "full",
          cellular: "reduced",
          ethernet: "full",
        },
      },
      storageOptimization: {
        enabled: true,
        maxCacheSize: 10 * 1024 * 1024, // 10MB
        cleanupInterval: 30 * 60 * 1000, // 30 minutes
        compressionEnabled: true,
      },
      performanceOptimization: {
        enabled: true,
        asyncLogging: true,
        bufferSize: 500,
        flushInterval: 10000,
        maxProcessingTime: 100,
      },
    },
    privacy: {
      enabled: true,
      piiDetection: {
        enabled: true,
        patterns: {
          email: true,
          phone: true,
          creditCard: true,
          ssn: true,
          ipAddress: true,
          address: false,
        },
      },
      redaction: {
        enabled: true,
        strategy: "mask",
        maskChar: "*",
        preserveLength: true,
      },
      compliance: {
        gdpr: true,
        ccpa: false,
        retentionPolicy: {
          enabled: true,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          maxSize: 100 * 1024 * 1024,       // 100MB
          maxEntries: 50000,
          cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
          compressionEnabled: true,
          archiveOldLogs: false,
        },
        dataSubjectRequests: false,
      },
      encryption: {
        enabled: false,
      },
    },
    devTools: {
      enabled: process.env.NODE_ENV === "development",
      logBrowser: {
        enabled: true,
        maxEntries: 1000,
        autoRefresh: true,
        refreshInterval: 1000,
        filters: [],
      },
      debugUtils: {
        enabled: true,
        verboseLogging: false,
        stackTraces: true,
        performanceMetrics: true,
        memoryProfiling: false,
      },
      realTimeMonitoring: {
        enabled: true,
        alertInDev: false,
        consoleOutput: true,
        showTimestamps: true,
        showContext: true,
      },
    },
  });

  console.log("Error logging system initialized successfully");
}

/**
 * Integration with existing error handling
 */
export class EnhancedErrorHandler extends ErrorHandler {
  /**
   * Handle transcription errors with logging
   */
  static async handleTranscriptionError(
    error: Error | AppError,
    fileId?: number,
    jobId?: string,
  ): Promise<void> {
    // Classify the error using existing logic
    const appError = ErrorHandler.classifyError(error, {
      component: "transcription",
      action: "process_audio",
      fileId,
      jobId,
    });

    // Log the error with structured data
    await logError(appError, undefined, {
      fileId,
      jobId,
      component: "transcription",
      action: "process_audio",
      userJourney: "audio_upload_to_transcription",
    });

    // Handle the error using existing logic
    ErrorHandler.handleError(appError);
  }

  /**
   * Handle API errors with enhanced logging
   */
  static async handleAPIError(
    error: Error | AppError,
    endpoint: string,
    method: string,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    const appError = ErrorHandler.classifyError(error, {
      component: "api",
      action: `${method}_${endpoint}`,
      userId,
      sessionId,
    });

    await logError(appError, undefined, {
      endpoint,
      method,
      userId,
      sessionId,
      component: "api",
      action: `${method}_${endpoint}`,
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });

    ErrorHandler.handleError(appError);
  }

  /**
   * Handle file processing errors
   */
  static async handleFileError(
    error: Error | AppError,
    fileName: string,
    fileSize: number,
    fileType: string,
  ): Promise<void> {
    const appError = ErrorHandler.classifyError(error, {
      component: "file_processing",
      action: "process_file",
    });

    await logError(appError, undefined, {
      fileName,
      fileSize,
      fileType,
      component: "file_processing",
      action: "process_file",
    });

    ErrorHandler.handleError(appError);
  }

  /**
   * Log successful operations for debugging and analytics
   */
  static async logSuccess(
    operation: string,
    component: string,
    details?: Record<string, any>,
  ): Promise<void> {
    await logInfo(
      `Operation completed successfully: ${operation}`,
      "success",
      {
        component,
        action: operation,
        success: true,
        ...details,
      },
      details
    );
  }

  /**
   * Log performance metrics
   */
  static async logPerformance(
    operation: string,
    duration: number,
    component: string,
    additionalMetrics?: Record<string, number>,
  ): Promise<void> {
    await logInfo(
      `Performance: ${operation} completed in ${duration}ms`,
      "performance",
      {
        component,
        action: "performance_metric",
        operation,
        duration,
        ...additionalMetrics,
      },
      {
        performance: {
          duration,
          operation,
          component,
          timestamp: new Date().toISOString(),
          ...additionalMetrics,
        },
      }
    );
  }
}

/**
 * Usage examples for different scenarios
 */

// Example 1: Transcription error handling
export async function exampleTranscriptionErrorHandling() {
  try {
    // Simulate transcription error
    throw new Error("Audio file format not supported");
  } catch (error) {
    await EnhancedErrorHandler.handleTranscriptionError(
      error as Error,
      123, // fileId
      "job-456" // jobId
    );
  }
}

// Example 2: API error handling
export async function exampleAPIErrorHandling() {
  try {
    // Simulate API call that fails
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: JSON.stringify({ audioData: "base64-data" }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
  } catch (error) {
    await EnhancedErrorHandler.handleAPIError(
      error as Error,
      "/api/transcribe",
      "POST",
      "user-123",
      "session-456"
    );
  }
}

// Example 3: File processing error
export async function exampleFileErrorHandling() {
  try {
    // Simulate file processing error
    throw new Error("File size exceeds maximum limit");
  } catch (error) {
    await EnhancedErrorHandler.handleFileError(
      error as Error,
      "audio-file.mp3",
      50 * 1024 * 1024, // 50MB
      "audio/mpeg"
    );
  }
}

// Example 4: Success logging
export async function exampleSuccessLogging() {
  await EnhancedErrorHandler.logSuccess(
    "transcription_completed",
    "transcription_service",
    {
      fileId: 123,
      duration: 120000, // 2 minutes
      wordCount: 250,
    }
  );
}

// Example 5: Performance logging
export async function examplePerformanceLogging() {
  const startTime = Date.now();

  // Simulate some operation
  await new Promise(resolve => setTimeout(resolve, 1500));

  const duration = Date.now() - startTime;

  await EnhancedErrorHandler.logPerformance(
    "audio_processing",
    duration,
    "audio_processor",
    {
      fileSize: 1024 * 1024, // 1MB
      sampleRate: 44100,
      channels: 2,
    }
  );
}

// Example 6: Custom logging with context
export async function exampleCustomLogging() {
  await logWarning(
    "User attempted to access restricted feature",
    "security",
    {
      component: "authorization",
      action: "check_access",
      userId: "user-123",
      feature: "premium_transcription",
      isPremium: false,
    },
    {
      securityLevel: "warning",
      potentialRisk: "low",
    }
  );

  await logDebug(
    "Cache hit for transcription data",
    "cache",
    {
      component: "cache",
      action: "get_transcription",
      fileId: 123,
      cacheKey: "transcription_123",
    },
    {
      cacheType: "redis",
      hitRate: 0.85,
      responseTime: 12,
    }
  );
}
