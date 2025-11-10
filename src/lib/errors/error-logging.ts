/**
 * Comprehensive Error Logging and Monitoring System (T064)
 *
 * A production-ready logging and monitoring system that provides comprehensive error visibility
 * while maintaining performance and privacy standards. This system integrates with existing
 * error handling components and provides structured logging with multiple monitoring service support.
 *
 * Key Features:
 * - Structured JSON logging with consistent format and metadata
 * - Multiple log levels with intelligent filtering and routing
 * - External monitoring service integration (Sentry, DataDog, custom endpoints)
 * - Real-time alerting with configurable rules and notification channels
 * - Mobile-optimized logging with battery and network awareness
 * - Privacy-compliant logging with PII detection and redaction
 * - Performance monitoring for the logging system itself
 * - Developer tools for log inspection and debugging
 */

import {
  AppError,
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  ErrorCodeConfig,
  getErrorCodeConfig,
  ErrorType,
} from "@/types/api/errors";
import { ErrorAnalysis } from "./error-classifier";
import { MobileDeviceContext } from "./error-middleware";
import {
  AlertManager,
  MobileLoggerOptimizer,
  PrivacyManager,
  DeveloperTools,
} from "./error-logging-components";

// ============================================================================
// LOGGING SYSTEM CORE INTERFACES
// ============================================================================

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 0, // Detailed debugging information
  INFO = 1, // General information about application state
  WARN = 2, // Potentially harmful situations that don't prevent the app from working
  ERROR = 3, // Error events that might still allow the application to continue
  CRITICAL = 4, // Very severe error events that will presumably lead the application to abort
  FATAL = 5, // Errors that cause the application to crash or become unusable
}

/**
 * Log entry structure for structured logging
 */
export interface StructuredLog {
  // Core log information
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  category: string;

  // Error-specific information
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
    type?: ErrorType;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    fingerprint?: string;
  };

  // Context information
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    traceId?: string;
    fileId?: number;
    jobId?: string;
    userAgent?: string;
    url?: string;
    ip?: string;
    deviceType?: string;
    networkType?: string;
    batteryLevel?: number;
    isLowPowerMode?: boolean;
    customData?: Record<string, any>;
  };

  // Performance information
  performance?: {
    processingTime?: number;
    memoryUsage?: number;
    networkLatency?: number;
    cpuUsage?: number;
    responseTime?: number;
  };

  // Mobile-specific information
  mobile?: {
    platform?: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    deviceClass?: "low" | "medium" | "high";
    screenResolution?: string;
    connectionQuality?: "poor" | "fair" | "good" | "excellent";
    isPWA?: boolean;
    isStandalone?: boolean;
  };

  // Metadata and tags
  tags?: string[];
  metadata?: Record<string, any>;
  correlationId?: string;

  // Privacy information
  pii?: {
    detected: boolean;
    redacted: boolean;
    fields?: string[];
  };

  // System information
  system?: {
    nodeVersion?: string;
    platform?: string;
    arch?: string;
    environment?: string;
    version?: string;
    buildNumber?: string;
  };
}

/**
 * Log retention policy configuration
 */
export interface LogRetentionPolicy {
  enabled: boolean;
  maxAge: number; // Maximum age in milliseconds
  maxSize: number; // Maximum size in bytes
  maxEntries: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
  compressionEnabled: boolean;
  archiveOldLogs: boolean;
  archivePath?: string;
}

/**
 * Log filtering and routing configuration
 */
export interface LogFilter {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;

  // Filter conditions
  conditions: {
    levels?: LogLevel[];
    categories?: string[];
    components?: string[];
    errorTypes?: ErrorType[];
    errorSeverities?: ErrorSeverity[];
    userIds?: string[];
    sessionIds?: string[];
    custom?: (log: StructuredLog) => boolean;
  };

  // Filter actions
  action: "include" | "exclude" | "transform" | "route";
  target?: string; // For routing actions
  transformer?: string; // For transform actions
  logLevel?: LogLevel; // Minimum level for this filter
}

/**
 * Alert configuration and rules
 */
export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;

  // Alert conditions
  conditions: {
    errorTypes?: ErrorType[];
    errorSeverities?: ErrorSeverity[];
    errorCategories?: ErrorCategory[];
    threshold: {
      count: number; // Number of occurrences
      timeWindow: number; // Time window in milliseconds
      operator: "gt" | "gte" | "lt" | "lte" | "eq";
    };
    grouping?: {
      field: string; // Field to group by (userId, component, etc.)
      maxGroups: number; // Maximum number of groups to alert on
    };
    custom?: (logs: StructuredLog[]) => boolean;
  };

  // Alert configuration
  alert: {
    title: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    channels: NotificationChannel[];
    cooldown: number; // Cooldown period in milliseconds
    escalation?: {
      enabled: boolean;
      delay: number; // Delay before escalation
      channels: NotificationChannel[];
    };
  };

  // Rate limiting
  rateLimiting: {
    maxAlerts: number; // Maximum alerts per time window
    timeWindow: number; // Time window for rate limiting
  };
}

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  id: string;
  type: "email" | "slack" | "webhook" | "sms" | "push" | "console";
  enabled: boolean;

  // Channel-specific configuration
  config: {
    // Email configuration
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;

    // Slack configuration
    webhookUrl?: string;
    channel?: string;
    username?: string;

    // Webhook configuration
    url?: string;
    method?: "POST" | "PUT";
    headers?: Record<string, string>;

    // SMS configuration
    phoneNumbers?: string[];

    // Push notification configuration
    endpoints?: string[];

    // Console configuration
    format?: "json" | "pretty";
    colorize?: boolean;
  };

  // Formatting and templates
  templates?: {
    title?: string;
    message?: string;
    payload?: Record<string, any>;
  };

  // Retry configuration
  retry?: {
    maxAttempts: number;
    delay: number;
    backoff: number;
  };
}

/**
 * Monitoring service integration configuration
 */
export interface MonitoringServiceConfig {
  id: string;
  name: string;
  type:
    | "sentry"
    | "datadog"
    | "custom"
    | "logstash"
    | "elasticsearch"
    | "prometheus";
  enabled: boolean;

  // Service-specific configuration
  config: {
    // Sentry configuration
    dsn?: string;
    environment?: string;
    release?: string;
    dist?: string;
    tracesSampleRate?: number;

    // DataDog configuration
    apiKey?: string;
    site?: string;
    service?: string;
    version?: string;
    env?: string;

    // Custom endpoint configuration
    endpoint?: string;
    apiKey?: string;
    headers?: Record<string, string>;

    // Logstash/Elasticsearch configuration
    host?: string;
    port?: number;
    index?: string;
    username?: string;
    password?: string;

    // Prometheus configuration
    gateway?: string;
    metrics?: string[];
  };

  // Filtering and transformation
  filters: LogFilter[];
  transformers: LogTransformer[];

  // Performance configuration
  batchSize: number;
  flushInterval: number;
  timeout: number;

  // Error handling
  errorHandling: {
    retryAttempts: number;
    retryDelay: number;
    fallbackMode: "ignore" | "queue" | "local";
  };
}

/**
 * Log transformer for modifying log entries
 */
export interface LogTransformer {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;

  // Transformation conditions
  conditions: {
    levels?: LogLevel[];
    categories?: string[];
    components?: string[];
    custom?: (log: StructuredLog) => boolean;
  };

  // Transformation logic
  transform: (log: StructuredLog) => Promise<StructuredLog>;

  // Transformer metadata
  version: string;
  tags: string[];
}

/**
 * Mobile optimization configuration
 */
export interface MobileOptimizationConfig {
  enabled: boolean;

  // Battery optimization
  batteryOptimization: {
    enabled: boolean;
    lowPowerMode: "disable" | "reduce" | "critical-only";
    batteryThreshold: number; // Threshold below which optimization kicks in
  };

  // Network optimization
  networkOptimization: {
    enabled: boolean;
    offlineBuffering: boolean;
    batchSize: number;
    compressionEnabled: boolean;
    adaptiveQuality: boolean;
    networkTypes: {
      wifi: "full" | "reduced" | "minimal";
      cellular: "full" | "reduced" | "minimal";
      ethernet: "full" | "reduced" | "minimal";
    };
  };

  // Storage optimization
  storageOptimization: {
    enabled: boolean;
    maxCacheSize: number;
    cleanupInterval: number;
    compressionEnabled: boolean;
  };

  // Performance optimization
  performanceOptimization: {
    enabled: boolean;
    asyncLogging: boolean;
    bufferSize: number;
    flushInterval: number;
    maxProcessingTime: number;
  };
}

/**
 * Privacy and PII configuration
 */
export interface PrivacyConfig {
  enabled: boolean;

  // PII detection
  piiDetection: {
    enabled: boolean;
    patterns: {
      email: boolean;
      phone: boolean;
      creditCard: boolean;
      ssn: boolean;
      ipAddress: boolean;
      address: boolean;
      custom?: RegExp[];
    };
    customPatterns?: Array<{
      name: string;
      pattern: RegExp;
      replacement?: string;
    }>;
  };

  // Data redaction
  redaction: {
    enabled: boolean;
    strategy: "mask" | "remove" | "hash";
    maskChar?: string;
    preserveLength?: boolean;
    fields?: string[];
  };

  // Consent and compliance
  compliance: {
    gdpr: boolean;
    ccpa: boolean;
    retentionPolicy: LogRetentionPolicy;
    dataSubjectRequests: boolean;
  };

  // Encryption
  encryption: {
    enabled: boolean;
    algorithm?: string;
    keyRotation: boolean;
    keyRotationInterval?: number;
  };
}

/**
 * Development tools configuration
 */
export interface DevToolsConfig {
  enabled: boolean;

  // Log browser
  logBrowser: {
    enabled: boolean;
    maxEntries: number;
    autoRefresh: boolean;
    refreshInterval: number;
    filters: LogFilter[];
  };

  // Debug utilities
  debugUtils: {
    enabled: boolean;
    verboseLogging: boolean;
    stackTraces: boolean;
    performanceMetrics: boolean;
    memoryProfiling: boolean;
  };

  // Real-time monitoring
  realTimeMonitoring: {
    enabled: boolean;
    alertInDev: boolean;
    consoleOutput: boolean;
    showTimestamps: boolean;
    showContext: boolean;
  };
}

// ============================================================================
// MAIN ERROR LOGGER CLASS
// ============================================================================

/**
 * Main error logging and monitoring system
 */
export class ErrorLogger {
  private static instance: ErrorLogger;

  // Core components
  private logManager: LogManager;
  private monitoringManager: MonitoringManager;
  private alertManager: AlertManager;
  private mobileOptimizer: MobileLoggerOptimizer;
  private privacyManager: PrivacyManager;
  private devTools: DeveloperTools;

  // State management
  private isInitialized: boolean = false;
  private isShuttingDown: boolean = false;
  private configuration: LoggerConfig;

  // Performance monitoring
  private performanceMetrics: Map<string, number[]> = new Map();

  private constructor() {
    this.configuration = this.getDefaultConfiguration();
    this.initializeComponents();
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Initialize the error logging system
   */
  async initialize(config?: Partial<LoggerConfig>): Promise<void> {
    if (this.isInitialized) {
      console.warn("ErrorLogger is already initialized");
      return;
    }

    try {
      // Merge configuration
      if (config) {
        this.configuration = this.mergeConfigurations(
          this.configuration,
          config,
        );
      }

      // Initialize all components
      await this.logManager.initialize(this.configuration.logManager);
      await this.monitoringManager.initialize(
        this.configuration.monitoringManager,
      );
      await this.alertManager.initialize(this.configuration.alertManager);
      await this.mobileOptimizer.initialize(
        this.configuration.mobileOptimization,
      );
      await this.privacyManager.initialize(this.configuration.privacy);
      await this.devTools.initialize(this.configuration.devTools);

      // Set up error handling for uncaught errors
      this.setupGlobalErrorHandling();

      this.isInitialized = true;
      console.log("ErrorLogger initialized successfully");
    } catch (error) {
      console.error("Failed to initialize ErrorLogger:", error);
      throw error;
    }
  }

  /**
   * Log an error with structured data
   */
  async logError(
    error: Error | AppError,
    level: LogLevel = LogLevel.ERROR,
    context?: Partial<ErrorContext>,
    additionalData?: Record<string, any>,
  ): Promise<string> {
    if (!this.isInitialized) {
      console.warn("ErrorLogger not initialized, falling back to console");
      console.error(error);
      return "fallback";
    }

    const startTime = Date.now();

    try {
      // Create structured log entry
      const logEntry = await this.createStructuredLog(
        error,
        level,
        context,
        additionalData,
      );

      // Apply privacy processing
      const processedLog = await this.privacyManager.processLog(logEntry);

      // Apply mobile optimizations
      const optimizedLog = await this.mobileOptimizer.processLog(processedLog);

      // Log through the log manager
      const logId = await this.logManager.log(optimizedLog);

      // Send to monitoring services
      await this.monitoringManager.processLog(optimizedLog);

      // Check for alerts
      await this.alertManager.processLog(optimizedLog);

      // Update developer tools
      await this.devTools.addLog(optimizedLog);

      // Record performance metrics
      this.recordPerformanceMetric("logError", Date.now() - startTime);

      return logId;
    } catch (loggingError) {
      console.error("Failed to log error:", loggingError);
      return "error";
    }
  }

  /**
   * Log informational message
   */
  async logInfo(
    message: string,
    category: string = "general",
    context?: Partial<ErrorContext>,
    additionalData?: Record<string, any>,
  ): Promise<string> {
    return this.logMessage(
      message,
      LogLevel.INFO,
      category,
      context,
      additionalData,
    );
  }

  /**
   * Log warning message
   */
  async logWarning(
    message: string,
    category: string = "warning",
    context?: Partial<ErrorContext>,
    additionalData?: Record<string, any>,
  ): Promise<string> {
    return this.logMessage(
      message,
      LogLevel.WARN,
      category,
      context,
      additionalData,
    );
  }

  /**
   * Log debug message
   */
  async logDebug(
    message: string,
    category: string = "debug",
    context?: Partial<ErrorContext>,
    additionalData?: Record<string, any>,
  ): Promise<string> {
    return this.logMessage(
      message,
      LogLevel.DEBUG,
      category,
      context,
      additionalData,
    );
  }

  /**
   * Log critical error
   */
  async logCritical(
    error: Error | AppError,
    context?: Partial<ErrorContext>,
    additionalData?: Record<string, any>,
  ): Promise<string> {
    return this.logError(error, LogLevel.CRITICAL, context, additionalData);
  }

  /**
   * Log generic message
   */
  private async logMessage(
    message: string,
    level: LogLevel,
    category: string,
    context?: Partial<ErrorContext>,
    additionalData?: Record<string, any>,
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Create structured log entry for message
      const logEntry: StructuredLog = {
        id: this.generateLogId(),
        timestamp: new Date(),
        level,
        message,
        category,
        context: {
          ...context,
          customData: additionalData,
        },
        system: this.getSystemInfo(),
      };

      // Apply privacy processing
      const processedLog = await this.privacyManager.processLog(logEntry);

      // Apply mobile optimizations
      const optimizedLog = await this.mobileOptimizer.processLog(processedLog);

      // Log through the log manager
      const logId = await this.logManager.log(optimizedLog);

      // Send to monitoring services
      await this.monitoringManager.processLog(optimizedLog);

      // Check for alerts
      await this.alertManager.processLog(optimizedLog);

      // Update developer tools
      await this.devTools.addLog(optimizedLog);

      // Record performance metrics
      this.recordPerformanceMetric("logMessage", Date.now() - startTime);

      return logId;
    } catch (loggingError) {
      console.error("Failed to log message:", loggingError);
      return "error";
    }
  }

  /**
   * Create structured log entry from error
   */
  private async createStructuredLog(
    error: Error | AppError,
    level: LogLevel,
    context?: Partial<ErrorContext>,
    additionalData?: Record<string, any>,
  ): Promise<StructuredLog> {
    const appError = error as AppError;
    const errorConfig = appError.code
      ? getErrorCodeConfig(appError.code)
      : null;

    // Generate error fingerprint
    const fingerprint = this.generateErrorFingerprint(error);

    const logEntry: StructuredLog = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      message: error.message,
      category: errorConfig?.category || ErrorCategory.SYSTEM,

      error: {
        name: error.name,
        message: error.message,
        code: appError.code,
        stack: error.stack,
        type: appError.type,
        severity: errorConfig?.severity || ErrorSeverity.MEDIUM,
        category: errorConfig?.category || ErrorCategory.SYSTEM,
        fingerprint,
      },

      context: {
        component: context?.component,
        action: context?.action,
        userId: context?.userId,
        sessionId: context?.sessionId,
        requestId: context?.requestId,
        traceId: context?.traceId,
        fileId: context?.fileId,
        jobId: context?.jobId,
        userAgent:
          typeof window !== "undefined"
            ? window.navigator.userAgent
            : undefined,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        customData: {
          ...context?.additional,
          ...additionalData,
        },
      },

      performance: {
        processingTime: Date.now() - (context?.startTime || Date.now()),
      },

      tags: this.generateErrorTags(error, errorConfig),
      metadata: {
        ...additionalData,
        timestamp: new Date().toISOString(),
      },

      correlationId: context?.correlationId || this.generateCorrelationId(),
      system: this.getSystemInfo(),
    };

    return logEntry;
  }

  /**
   * Generate error fingerprint for deduplication
   */
  private generateErrorFingerprint(error: Error): string {
    const message = error.message || "";
    const name = error.name || "";
    const stack = error.stack || "";

    // Create a normalized stack trace (remove line numbers and specific values)
    const normalizedStack = stack
      .split("\n")
      .map((line) => line.replace(/\:\d+:\d+/g, ":0:0"))
      .slice(0, 5) // Only first 5 frames
      .join("|");

    const fingerprintData = `${name}:${message.substring(0, 100)}:${normalizedStack}`;
    return this.simpleHash(fingerprintData);
  }

  /**
   * Generate tags for error categorization
   */
  private generateErrorTags(error: Error, config?: any): string[] {
    const tags: string[] = [];

    // Error type tag
    tags.push(`type:${error.name}`);

    // Error category tag
    if (config?.category) {
      tags.push(`category:${config.category}`);
    }

    // Severity tag
    if (config?.severity) {
      tags.push(`severity:${config.severity}`);
    }

    // Retryable tag
    if (config?.retryable) {
      tags.push("retryable:true");
    }

    // Environment tag
    tags.push(`env:${process.env.NODE_ENV || "unknown"}`);

    return tags;
  }

  /**
   * Get system information
   */
  private getSystemInfo(): StructuredLog["system"] {
    return {
      nodeVersion: typeof process !== "undefined" ? process.version : undefined,
      platform: typeof process !== "undefined" ? process.platform : undefined,
      arch: typeof process !== "undefined" ? process.arch : undefined,
      environment: process.env.NODE_ENV || "unknown",
      version: process.env.npm_package_version || "1.0.0",
      buildNumber: process.env.BUILD_NUMBER || "0",
    };
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple hash function for fingerprinting
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Set up global error handling
   */
  private setupGlobalErrorHandling(): void {
    // Handle uncaught exceptions
    if (typeof process !== "undefined") {
      process.on("uncaughtException", async (error) => {
        await this.logCritical(error, {
          component: "global",
          action: "uncaught_exception",
        });
      });

      process.on("unhandledRejection", async (reason) => {
        const error =
          reason instanceof Error ? reason : new Error(String(reason));
        await this.logCritical(error, {
          component: "global",
          action: "unhandled_rejection",
        });
      });
    }

    // Handle browser errors
    if (typeof window !== "undefined") {
      window.addEventListener("error", async (event) => {
        await this.logError(
          event.error || new Error(event.message),
          LogLevel.ERROR,
          {
            component: "browser",
            action: "window_error",
            customData: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            },
          },
        );
      });

      window.addEventListener("unhandledrejection", async (event) => {
        const error =
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));
        await this.logError(error, LogLevel.ERROR, {
          component: "browser",
          action: "unhandled_rejection",
        });
      });
    }
  }

  /**
   * Record performance metric
   */
  private recordPerformanceMetric(operation: string, duration: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }

    const metrics = this.performanceMetrics.get(operation)!;
    metrics.push(duration);

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Record<
    string,
    { avg: number; min: number; max: number; count: number }
  > {
    const result: Record<
      string,
      { avg: number; min: number; max: number; count: number }
    > = {};

    for (const [operation, metrics] of this.performanceMetrics.entries()) {
      if (metrics.length === 0) continue;

      const avg = metrics.reduce((sum, val) => sum + val, 0) / metrics.length;
      const min = Math.min(...metrics);
      const max = Math.max(...metrics);

      result[operation] = {
        avg: Math.round(avg * 100) / 100,
        min,
        max,
        count: metrics.length,
      };
    }

    return result;
  }

  /**
   * Initialize all components
   */
  private initializeComponents(): void {
    this.logManager = new LogManager();
    this.monitoringManager = new MonitoringManager();
    this.alertManager = new AlertManager();
    this.mobileOptimizer = new MobileLoggerOptimizer();
    this.privacyManager = new PrivacyManager();
    this.devTools = new DeveloperTools();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): LoggerConfig {
    return {
      logManager: {
        level: LogLevel.INFO,
        retention: {
          enabled: true,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          maxSize: 50 * 1024 * 1024, // 50MB
          maxEntries: 10000,
          cleanupInterval: 60 * 60 * 1000, // 1 hour
          compressionEnabled: true,
          archiveOldLogs: false,
        },
        filters: [],
        bufferSize: 1000,
        flushInterval: 5000,
      },
      monitoringManager: {
        services: [],
        batchSize: 50,
        flushInterval: 10000,
        timeout: 30000,
      },
      alertManager: {
        enabled: true,
        rules: [],
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
            maxSize: 100 * 1024 * 1024, // 100MB
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
    };
  }

  /**
   * Merge configurations
   */
  private mergeConfigurations(
    defaultConfig: LoggerConfig,
    userConfig: Partial<LoggerConfig>,
  ): LoggerConfig {
    return {
      logManager: { ...defaultConfig.logManager, ...userConfig.logManager },
      monitoringManager: {
        ...defaultConfig.monitoringManager,
        ...userConfig.monitoringManager,
      },
      alertManager: {
        ...defaultConfig.alertManager,
        ...userConfig.alertManager,
      },
      mobileOptimization: {
        ...defaultConfig.mobileOptimization,
        ...userConfig.mobileOptimization,
      },
      privacy: { ...defaultConfig.privacy, ...userConfig.privacy },
      devTools: { ...defaultConfig.devTools, ...userConfig.devTools },
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    try {
      // Flush all pending logs
      await this.logManager.flush();
      await this.monitoringManager.flush();
      await this.alertManager.flush();

      console.log("ErrorLogger shutdown completed");
    } catch (error) {
      console.error("Error during ErrorLogger shutdown:", error);
    }
  }
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * Main logger configuration interface
 */
export interface LoggerConfig {
  logManager: {
    level: LogLevel;
    retention: LogRetentionPolicy;
    filters: LogFilter[];
    bufferSize: number;
    flushInterval: number;
  };
  monitoringManager: {
    services: MonitoringServiceConfig[];
    batchSize: number;
    flushInterval: number;
    timeout: number;
  };
  alertManager: {
    enabled: boolean;
    rules: AlertRule[];
    channels: NotificationChannel[];
    cooldown: number;
  };
  mobileOptimization: MobileOptimizationConfig;
  privacy: PrivacyConfig;
  devTools: DevToolsConfig;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Singleton instance getter
 */
export const getLogger = (): ErrorLogger => {
  return ErrorLogger.getInstance();
};

/**
 * Convenience functions for common logging operations
 */
export const logError = async (
  error: Error | AppError,
  context?: Partial<ErrorContext>,
  additionalData?: Record<string, any>,
): Promise<string> => {
  return getLogger().logError(error, LogLevel.ERROR, context, additionalData);
};

export const logInfo = async (
  message: string,
  category?: string,
  context?: Partial<ErrorContext>,
  additionalData?: Record<string, any>,
): Promise<string> => {
  return getLogger().logInfo(message, category, context, additionalData);
};

export const logWarning = async (
  message: string,
  category?: string,
  context?: Partial<ErrorContext>,
  additionalData?: Record<string, any>,
): Promise<string> => {
  return getLogger().logWarning(message, category, context, additionalData);
};

export const logDebug = async (
  message: string,
  category?: string,
  context?: Partial<ErrorContext>,
  additionalData?: Record<string, any>,
): Promise<string> => {
  return getLogger().logDebug(message, category, context, additionalData);
};

export const logCritical = async (
  error: Error | AppError,
  context?: Partial<ErrorContext>,
  additionalData?: Record<string, any>,
): Promise<string> => {
  return getLogger().logCritical(error, context, additionalData);
};

// ============================================================================
// LOG MANAGER
// ============================================================================

/**
 * LogManager handles local log storage, filtering, and retention
 */
class LogManager {
  private config: any;
  private logBuffer: StructuredLog[] = [];
  private flushTimer?: NodeJS.Timeout;
  private storage?: LogStorage;

  async initialize(config: any): Promise<void> {
    this.config = config;

    // Initialize storage
    this.storage = new LogStorage(config.retention);
    await this.storage.initialize();

    // Start flush timer
    this.startFlushTimer();

    console.log("LogManager initialized");
  }

  async log(log: StructuredLog): Promise<string> {
    // Check if log should be processed based on filters
    if (!this.shouldProcessLog(log)) {
      return "filtered";
    }

    // Add to buffer
    this.logBuffer.push(log);

    // Flush if buffer is full or log is critical
    if (
      this.logBuffer.length >= this.config.bufferSize ||
      log.level >= LogLevel.CRITICAL
    ) {
      await this.flush();
    }

    return log.id;
  }

  private shouldProcessLog(log: StructuredLog): boolean {
    // Check minimum log level
    if (log.level < this.config.level) {
      return false;
    }

    // Apply filters
    for (const filter of this.config.filters) {
      if (!filter.enabled) continue;

      const shouldInclude = this.evaluateFilter(filter, log);
      if (filter.action === "exclude" && shouldInclude) {
        return false;
      }
      if (filter.action === "include" && !shouldInclude) {
        return false;
      }
    }

    return true;
  }

  private evaluateFilter(filter: LogFilter, log: StructuredLog): boolean {
    const { conditions } = filter;

    // Check log level
    if (conditions.levels && !conditions.levels.includes(log.level)) {
      return false;
    }

    // Check category
    if (
      conditions.categories &&
      !conditions.categories.includes(log.category)
    ) {
      return false;
    }

    // Check component
    if (conditions.components && log.context?.component) {
      if (!conditions.components.includes(log.context.component)) {
        return false;
      }
    }

    // Check custom condition
    if (conditions.custom) {
      return conditions.custom(log);
    }

    return true;
  }

  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.storage?.store(logsToFlush);
    } catch (error) {
      console.error("Failed to flush logs:", error);
      // Re-add logs to buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);
  }

  async getLogs(filter?: Partial<StructuredLog>): Promise<StructuredLog[]> {
    return this.storage?.retrieve(filter) || [];
  }

  updateConfiguration(config: any): void {
    this.config = { ...this.config, ...config };
    this.storage?.updateConfiguration(config.retention);
  }
}

// ============================================================================
// LOG STORAGE
// ============================================================================

/**
 * LogStorage handles persistent storage of logs
 */
class LogStorage {
  private retention: LogRetentionPolicy;
  private memoryStorage: Map<string, StructuredLog> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(retention: LogRetentionPolicy) {
    this.retention = retention;
  }

  async initialize(): Promise<void> {
    if (this.retention.enabled && this.retention.cleanupInterval > 0) {
      this.startCleanupTimer();
    }

    // Try to load persisted logs from localStorage in browser
    if (typeof window !== "undefined" && window.localStorage) {
      await this.loadFromLocalStorage();
    }
  }

  async store(logs: StructuredLog[]): Promise<void> {
    for (const log of logs) {
      this.memoryStorage.set(log.id, log);
    }

    // Persist to localStorage in browser
    if (typeof window !== "undefined" && window.localStorage) {
      await this.saveToLocalStorage();
    }

    // Check retention limits
    await this.enforceRetention();
  }

  async retrieve(filter?: Partial<StructuredLog>): Promise<StructuredLog[]> {
    let logs = Array.from(this.memoryStorage.values());

    // Apply filters
    if (filter) {
      logs = logs.filter((log) => this.matchesFilter(log, filter));
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return logs;
  }

  private matchesFilter(
    log: StructuredLog,
    filter: Partial<StructuredLog>,
  ): boolean {
    if (filter.level !== undefined && log.level !== filter.level) return false;
    if (filter.category && log.category !== filter.category) return false;
    if (filter.message && !log.message.includes(filter.message)) return false;

    return true;
  }

  private async enforceRetention(): Promise<void> {
    if (!this.retention.enabled) return;

    const logs = Array.from(this.memoryStorage.values());
    const now = Date.now();

    // Remove logs older than maxAge
    if (this.retention.maxAge > 0) {
      for (const [id, log] of this.memoryStorage.entries()) {
        if (now - log.timestamp.getTime() > this.retention.maxAge) {
          this.memoryStorage.delete(id);
        }
      }
    }

    // Limit number of entries
    if (
      this.retention.maxEntries > 0 &&
      this.memoryStorage.size > this.retention.maxEntries
    ) {
      const entries = Array.from(this.memoryStorage.entries()).sort(
        ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      const toRemove = entries.slice(
        0,
        this.memoryStorage.size - this.retention.maxEntries,
      );
      toRemove.forEach(([id]) => this.memoryStorage.delete(id));
    }

    // Update localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      await this.saveToLocalStorage();
    }
  }

  private async saveToLocalStorage(): Promise<void> {
    try {
      const logs = Array.from(this.memoryStorage.values());
      const serialized = JSON.stringify(logs);

      if (this.retention.compressionEnabled) {
        // Simple compression: remove whitespace
        const compressed = serialized.replace(/\s+/g, " ");
        window.localStorage.setItem("error_logs", compressed);
      } else {
        window.localStorage.setItem("error_logs", serialized);
      }
    } catch (error) {
      console.warn("Failed to save logs to localStorage:", error);
    }
  }

  private async loadFromLocalStorage(): Promise<void> {
    try {
      const data = window.localStorage.getItem("error_logs");
      if (!data) return;

      const logs = JSON.parse(data) as StructuredLog[];
      for (const log of logs) {
        log.timestamp = new Date(log.timestamp);
        this.memoryStorage.set(log.id, log);
      }
    } catch (error) {
      console.warn("Failed to load logs from localStorage:", error);
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.enforceRetention().catch(console.error);
    }, this.retention.cleanupInterval);
  }

  updateConfiguration(retention: LogRetentionPolicy): void {
    this.retention = retention;

    // Restart cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (retention.enabled && retention.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }
}

// ============================================================================
// MONITORING MANAGER
// ============================================================================

/**
 * MonitoringManager handles integration with external monitoring services
 */
class MonitoringManager {
  private config: any;
  private services: Map<string, MonitoringService> = new Map();
  private sendBuffer: StructuredLog[] = [];
  private sendTimer?: NodeJS.Timeout;

  async initialize(config: any): Promise<void> {
    this.config = config;

    // Initialize monitoring services
    for (const serviceConfig of config.services) {
      if (!serviceConfig.enabled) continue;

      const service = this.createMonitoringService(serviceConfig);
      await service.initialize(serviceConfig);
      this.services.set(serviceConfig.id, service);
    }

    // Start send timer
    this.startSendTimer();

    console.log(
      `MonitoringManager initialized with ${this.services.size} services`,
    );
  }

  async processLog(log: StructuredLog): Promise<void> {
    // Add to send buffer
    this.sendBuffer.push(log);

    // Send immediately if buffer is full or log is critical
    if (
      this.sendBuffer.length >= this.config.batchSize ||
      log.level >= LogLevel.CRITICAL
    ) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.sendBuffer.length === 0) return;

    const logsToSend = [...this.sendBuffer];
    this.sendBuffer = [];

    // Send to all services in parallel
    const sendPromises = Array.from(this.services.values()).map((service) =>
      service.sendLogs(logsToSend).catch((error) => {
        console.error(
          `Failed to send logs to ${service.getServiceName()}:`,
          error,
        );
        // Could implement retry logic here
      }),
    );

    await Promise.allSettled(sendPromises);
  }

  private createMonitoringService(
    config: MonitoringServiceConfig,
  ): MonitoringService {
    switch (config.type) {
      case "sentry":
        return new SentryMonitoringService();
      case "datadog":
        return new DataDogMonitoringService();
      case "custom":
        return new CustomMonitoringService();
      case "logstash":
        return new LogstashMonitoringService();
      case "elasticsearch":
        return new ElasticsearchMonitoringService();
      default:
        throw new Error(`Unsupported monitoring service type: ${config.type}`);
    }
  }

  private startSendTimer(): void {
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
    }

    this.sendTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);
  }

  updateConfiguration(config: any): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// MONITORING SERVICE INTERFACES
// ============================================================================

/**
 * Base monitoring service interface
 */
abstract class MonitoringService {
  protected config?: MonitoringServiceConfig;

  abstract getServiceName(): string;
  abstract initialize(config: MonitoringServiceConfig): Promise<void>;
  abstract sendLogs(logs: StructuredLog[]): Promise<void>;

  protected transformLog(log: StructuredLog): any {
    // Default transformation - can be overridden by specific services
    return {
      timestamp: log.timestamp.toISOString(),
      level: LogLevel[log.level],
      message: log.message,
      category: log.category,
      error: log.error,
      context: log.context,
      tags: log.tags,
      metadata: log.metadata,
    };
  }
}

/**
 * Sentry monitoring service implementation
 */
class SentryMonitoringService extends MonitoringService {
  private sentry?: any;

  getServiceName(): string {
    return "Sentry";
  }

  async initialize(config: MonitoringServiceConfig): Promise<void> {
    this.config = config;

    try {
      // Try to import Sentry (will be available if @sentry/* packages are installed)
      if (typeof window !== "undefined") {
        // Browser environment
        const Sentry = await import("@sentry/browser");
        this.sentry = Sentry;

        Sentry.init({
          dsn: config.config.dsn,
          environment: config.config.environment || process.env.NODE_ENV,
          release: config.config.release || process.env.npm_package_version,
          tracesSampleRate: config.config.tracesSampleRate || 0.1,
        });
      } else {
        // Node.js environment
        const Sentry = await import("@sentry/node");
        this.sentry = Sentry;

        Sentry.init({
          dsn: config.config.dsn,
          environment: config.config.environment || process.env.NODE_ENV,
          release: config.config.release || process.env.npm_package_version,
          tracesSampleRate: config.config.tracesSampleRate || 0.1,
        });
      }

      console.log("Sentry monitoring service initialized");
    } catch (error) {
      console.warn("Failed to initialize Sentry monitoring service:", error);
      this.sentry = null;
    }
  }

  async sendLogs(logs: StructuredLog[]): Promise<void> {
    if (!this.sentry) return;

    for (const log of logs) {
      try {
        if (log.error) {
          // Send error to Sentry
          const sentryEvent = {
            message: log.message,
            level: this.getSentryLevel(log.level),
            extra: {
              category: log.category,
              context: log.context,
              tags: log.tags,
              metadata: log.metadata,
            },
            fingerprint: [log.error.fingerprint || log.id],
          };

          this.sentry.captureException(
            new Error(log.error.message),
            sentryEvent,
          );
        } else {
          // Send message to Sentry
          this.sentry.captureMessage(log.message, {
            level: this.getSentryLevel(log.level),
            extra: {
              category: log.category,
              context: log.context,
              tags: log.tags,
              metadata: log.metadata,
            },
          });
        }
      } catch (error) {
        console.error("Failed to send log to Sentry:", error);
      }
    }
  }

  private getSentryLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return "debug";
      case LogLevel.INFO:
        return "info";
      case LogLevel.WARN:
        return "warning";
      case LogLevel.ERROR:
        return "error";
      case LogLevel.CRITICAL:
      case LogLevel.FATAL:
        return "fatal";
      default:
        return "error";
    }
  }
}

/**
 * DataDog monitoring service implementation
 */
class DataDogMonitoringService extends MonitoringService {
  private datadog?: any;

  getServiceName(): string {
    return "DataDog";
  }

  async initialize(config: MonitoringServiceConfig): Promise<void> {
    this.config = config;

    try {
      // Try to import DataDog SDK
      if (typeof window !== "undefined") {
        // Browser environment - datadog-logs
        const { datadogLogs } = await import("@datadog/browser-logs");
        this.datadog = datadogLogs;

        datadogLogs.init({
          clientToken: config.config.apiKey,
          site: config.config.site || "datadoghq.com",
          service: config.config.service || "umuo-app",
          env: config.config.env || process.env.NODE_ENV,
          version: config.config.version || process.env.npm_package_version,
          forwardErrorsToLogs: true,
          sessionSampleRate: 100,
        });
      } else {
        // Node.js environment - would need datadog-node package
        console.warn("DataDog Node.js SDK integration not implemented");
        this.datadog = null;
      }

      console.log("DataDog monitoring service initialized");
    } catch (error) {
      console.warn("Failed to initialize DataDog monitoring service:", error);
      this.datadog = null;
    }
  }

  async sendLogs(logs: StructuredLog[]): Promise<void> {
    if (!this.datadog) return;

    for (const log of logs) {
      try {
        const datadogLog = {
          message: log.message,
          status: this.getDataDogLevel(log.level),
          date: log.timestamp,
          context: {
            category: log.category,
            ...log.context,
            tags: log.tags,
            metadata: log.metadata,
          },
        };

        if (log.error) {
          datadogLog.context.error = log.error;
        }

        this.datadog.logger.log(
          log.message,
          datadogLog.context,
          datadogLog.status,
        );
      } catch (error) {
        console.error("Failed to send log to DataDog:", error);
      }
    }
  }

  private getDataDogLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return "debug";
      case LogLevel.INFO:
        return "info";
      case LogLevel.WARN:
        return "warn";
      case LogLevel.ERROR:
        return "error";
      case LogLevel.CRITICAL:
      case LogLevel.FATAL:
        return "error";
      default:
        return "info";
    }
  }
}

/**
 * Custom monitoring service implementation (HTTP endpoint)
 */
class CustomMonitoringService extends MonitoringService {
  getServiceName(): string {
    return "Custom";
  }

  async initialize(config: MonitoringServiceConfig): Promise<void> {
    this.config = config;
    console.log("Custom monitoring service initialized");
  }

  async sendLogs(logs: StructuredLog[]): Promise<void> {
    if (!this.config?.config.endpoint) return;

    try {
      const payload = {
        logs: logs.map((log) => this.transformLog(log)),
        timestamp: new Date().toISOString(),
        source: "umuo-app",
      };

      const response = await fetch(this.config.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.config.headers,
          ...(this.config.config.apiKey && {
            Authorization: `Bearer ${this.config.config.apiKey}`,
          }),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to send logs to custom endpoint:", error);
      throw error;
    }
  }
}

/**
 * Logstash monitoring service implementation
 */
class LogstashMonitoringService extends MonitoringService {
  getServiceName(): string {
    return "Logstash";
  }

  async initialize(config: MonitoringServiceConfig): Promise<void> {
    this.config = config;
    console.log("Logstash monitoring service initialized");
  }

  async sendLogs(logs: StructuredLog[]): Promise<void> {
    if (!this.config?.config.host) return;

    try {
      const payload = logs.map((log) => ({
        ...this.transformLog(log),
        "@timestamp": log.timestamp.toISOString(),
        source: "umuo-app",
      }));

      const endpoint = `${this.config.config.protocol || "http"}://${this.config.config.host}:${this.config.config.port || 5044}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.config.username &&
            this.config.config.password && {
              Authorization: `Basic ${btoa(`${this.config.config.username}:${this.config.config.password}`)}`,
            }),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to send logs to Logstash:", error);
      throw error;
    }
  }
}

/**
 * Elasticsearch monitoring service implementation
 */
class ElasticsearchMonitoringService extends MonitoringService {
  getServiceName(): string {
    return "Elasticsearch";
  }

  async initialize(config: MonitoringServiceConfig): Promise<void> {
    this.config = config;
    console.log("Elasticsearch monitoring service initialized");
  }

  async sendLogs(logs: StructuredLog[]): Promise<void> {
    if (!this.config?.config.host) return;

    try {
      const index = this.config.config.index || "error-logs";
      const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const fullIndex = `${index}-${timestamp}`;

      const payload = logs.map((log) => ({
        index: { _index: fullIndex, _id: log.id },
      }));

      const bulkData =
        payload.map((item) => JSON.stringify(item)).join("\n") + "\n";
      const logData =
        logs.map((log) => JSON.stringify(this.transformLog(log))).join("\n") +
        "\n";
      const bulkBody = bulkData + logData;

      const endpoint = `${this.config.config.protocol || "http"}://${this.config.config.host}:${this.config.config.port || 9200}/_bulk`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-ndjson",
          ...(this.config.config.username &&
            this.config.config.password && {
              Authorization: `Basic ${btoa(`${this.config.config.username}:${this.config.config.password}`)}`,
            }),
        },
        body: bulkBody,
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to send logs to Elasticsearch:", error);
      throw error;
    }
  }
}
