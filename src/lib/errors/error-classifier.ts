/**
 * Enhanced Error Classification System
 *
 * A comprehensive error classification system that categorizes, analyzes,
 * and provides intelligent handling for different types of errors across
 * the umuo.app application.
 */

import { AppError } from "@/lib/utils/error-handler";

// ============================================================================
// CORE ENUMERATIONS AND INTERFACES
// ============================================================================

/**
 * Primary error categories for classification
 */
export enum ErrorCategory {
  // System-level errors
  NETWORK = "network",
  API = "api",
  FILE_SYSTEM = "file_system",
  AUDIO_PROCESSING = "audio_processing",
  TRANSCRIPTION = "transcription",

  // User interaction errors
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",

  // Performance and resource errors
  PERFORMANCE = "performance",
  MEMORY = "memory",
  STORAGE = "storage",

  // Application-level errors
  DATABASE = "database",
  STATE_MANAGEMENT = "state_management",
  UI_RENDERING = "ui_rendering",

  // External service errors
  THIRD_PARTY = "third_party",
  INTEGRATION = "integration",

  // Generic and unknown errors
  GENERIC = "generic",
  UNKNOWN = "unknown",
}

/**
 * Specific error types within each category
 */
export enum ErrorType {
  // Network errors
  CONNECTION_FAILURE = "connection_failure",
  CONNECTION_TIMEOUT = "connection_timeout",
  DNS_RESOLUTION = "dns_resolution",
  SSL_CERTIFICATE = "ssl_certificate",
  PROXY_ERROR = "proxy_error",
  NETWORK_UNAVAILABLE = "network_unavailable",

  // API errors
  API_AUTHENTICATION = "api_authentication",
  API_AUTHORIZATION = "api_authorization",
  API_RATE_LIMIT = "api_rate_limit",
  API_QUOTA_EXCEEDED = "api_quota_exceeded",
  API_ENDPOINT_ERROR = "api_endpoint_error",
  API_RESPONSE_FORMAT = "api_response_format",
  API_VERSION_MISMATCH = "api_version_mismatch",

  // File system errors
  FILE_NOT_FOUND = "file_not_found",
  FILE_ACCESS_DENIED = "file_access_denied",
  FILE_TOO_LARGE = "file_too_large",
  FILE_CORRUPTED = "file_corrupted",
  DISK_SPACE_INSUFFICIENT = "disk_space_insufficient",
  UPLOAD_FAILED = "upload_failed",
  DOWNLOAD_FAILED = "download_failed",

  // Audio processing errors
  AUDIO_FORMAT_UNSUPPORTED = "audio_format_unsupported",
  AUDIO_CODEC_ERROR = "audio_codec_error",
  AUDIO_DECODE_FAILURE = "audio_decode_failure",
  AUDIO_DURATION_EXCEEDED = "audio_duration_exceeded",
  AUDIO_QUALITY_POOR = "audio_quality_poor",
  AUDIO_SILENCE = "audio_silence",

  // Transcription errors
  TRANSCRIPTION_SERVICE_UNAVAILABLE = "transcription_service_unavailable",
  TRANSCRIPTION_TIMEOUT = "transcription_timeout",
  TRANSCRIPTION_MODEL_ERROR = "transcription_model_error",
  TRANSCRIPTION_LANGUAGE_UNSUPPORTED = "transcription_language_unsupported",
  TRANSCRIPTION_QUALITY_POOR = "transcription_quality_poor",

  // Validation errors
  INPUT_VALIDATION = "input_validation",
  DATA_FORMAT_INVALID = "data_format_invalid",
  REQUIRED_FIELD_MISSING = "required_field_missing",
  CONSTRAINT_VIOLATION = "constraint_violation",
  TYPE_MISMATCH = "type_mismatch",

  // Authentication/Authorization errors
  CREDENTIALS_INVALID = "credentials_invalid",
  TOKEN_EXPIRED = "token_expired",
  TOKEN_INVALID = "token_invalid",
  SESSION_EXPIRED = "session_expired",
  PERMISSION_DENIED = "permission_denied",

  // Performance errors
  MEMORY_LEAK = "memory_leak",
  CPU_THRESHOLD_EXCEEDED = "cpu_threshold_exceeded",
  RESPONSE_TIME_EXCEEDED = "response_time_exceeded",
  CONCURRENT_LIMIT_EXCEEDED = "concurrent_limit_exceeded",
  BOTTLENECK_DETECTED = "bottleneck_detected",

  // Storage errors
  QUOTA_EXCEEDED = "quota_exceeded",
  STORAGE_UNAVAILABLE = "storage_unavailable",
  INDEX_CORRUPTED = "index_corrupted",
  BACKUP_FAILED = "backup_failed",
  RESTORE_FAILED = "restore_failed",

  // Database errors
  DATABASE_CONNECTION = "database_connection",
  DATABASE_TIMEOUT = "database_timeout",
  DATABASE_CONSTRAINT = "database_constraint",
  DATABASE_MIGRATION = "database_migration",
  TRANSACTION_ROLLBACK = "transaction_rollback",

  // State management errors
  STATE_CORRUPTION = "state_corruption",
  STATE_SYNC_FAILED = "state_sync_failed",
  HOOK_ERROR = "hook_error",
  QUERY_INVALIDATION_FAILED = "query_invalidation_failed",

  // UI rendering errors
  COMPONENT_RENDER_ERROR = "component_render_error",
  STYLESHEET_LOADING_FAILED = "stylesheet_loading_failed",
  ASSET_LOADING_FAILED = "asset_loading_failed",
  LAYOUT_SHIFT = "layout_shift",

  // Third-party service errors
  GROQ_API_ERROR = "groq_api_error",
  VERCEL_DEPLOYMENT_ERROR = "vercel_deployment_error",
  ANALYTICS_ERROR = "analytics_error",
  MONITORING_ERROR = "monitoring_error",

  // Integration errors
  WEBHOOK_FAILED = "webhook_failed",
  REAL_TIME_SYNC_FAILED = "real_time_sync_failed",
  CACHE_SYNC_FAILED = "cache_sync_failed",

  // Generic errors
  GENERIC_ERROR = "generic_error",
  UNEXPECTED_ERROR = "unexpected_error",
  DEPRECATED_FEATURE = "deprecated_feature",
  FEATURE_NOT_AVAILABLE = "feature_not_available",

  // Unknown errors
  UNKNOWN_ERROR = "unknown_error",
}

/**
 * Error severity levels for prioritization
 */
export enum ErrorSeverity {
  CRITICAL = "critical", // Blocks core functionality
  HIGH = "high", // Significantly impacts user experience
  MEDIUM = "medium", // Degrades user experience but allows continuation
  LOW = "low", // Minor issue with minimal impact
  INFO = "info", // Informational or success state
}

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  // Automatic strategies
  AUTOMATIC_RETRY = "automatic_retry",
  EXPONENTIAL_BACKOFF = "exponential_backoff",
  CIRCUIT_BREAKER = "circuit_breaker",
  FALLBACK_SERVICE = "fallback_service",
  CACHE_RECOVERY = "cache_recovery",

  // User-assisted strategies
  USER_RETRY = "user_retry",
  USER_ACTION_REQUIRED = "user_action_required",
  USER_CONFIRMATION = "user_confirmation",
  USER_INPUT_REQUIRED = "user_input_required",

  // System strategies
  SERVICE_RESTART = "service_restart",
  SESSION_REFRESH = "session_refresh",
  REAUTHENTICATION = "reauthentication",
  DATA_SYNC = "data_sync",

  // Graceful degradation
  GRACEFUL_DEGRADATION = "graceful_degradation",
  FEATURE_DISABLE = "feature_disable",
  READ_ONLY_MODE = "read_only_mode",

  // No recovery possible
  NO_RECOVERY = "no_recovery",
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Enhanced error context information
 */
export interface ErrorContext {
  // Basic context
  timestamp: Date;
  component?: string;
  action?: string;
  userJourney?: string;

  // Technical context
  userAgent?: string;
  url?: string;
  referrer?: string;
  sessionId?: string;

  // Application context
  fileId?: number;
  jobId?: string;
  userId?: string;
  requestId?: string;

  // Device context
  deviceType?: "desktop" | "mobile" | "tablet";
  networkType?: "wifi" | "cellular" | "unknown";
  batteryLevel?: number;
  isLowPowerMode?: boolean;

  // Performance context
  memoryUsage?: number;
  cpuUsage?: number;
  networkSpeed?: number;

  // Custom context
  customData?: Record<string, any>;
}

/**
 * Error analysis results
 */
export interface ErrorAnalysis {
  // Classification results
  category: ErrorCategory;
  type: ErrorType;
  severity: ErrorSeverity;
  confidence: number; // 0-1

  // Pattern recognition
  pattern?: string;
  relatedErrors?: string[];
  frequency?: number;

  // Root cause analysis
  rootCause?: string;
  contributingFactors?: string[];

  // Impact assessment
  userImpact: UserImpact;
  systemImpact: SystemImpact;

  // Recovery information
  recoveryStrategy: RecoveryStrategy;
  successProbability: number; // 0-1
  recommendedActions: string[];

  // Prevention suggestions
  preventionStrategies: string[];

  // Metadata
  analysisTimestamp: Date;
  analysisVersion: string;
}

/**
 * User impact assessment
 */
export interface UserImpact {
  level: "blocking" | "disruptive" | "annoying" | "minimal";
  affectedFeatures: string[];
  workaroundAvailable: boolean;
  userActionRequired: boolean;
  description: string;
}

/**
 * System impact assessment
 */
export interface SystemImpact {
  level: "critical" | "high" | "medium" | "low";
  affectedComponents: string[];
  cascadePossible: boolean;
  dataIntegrityRisk: boolean;
  performanceImpact: "severe" | "moderate" | "minimal";
}

/**
 * Error pattern definition
 */
export interface ErrorPattern {
  id: string;
  name: string;
  description: string;

  // Pattern matching
  conditions: ErrorPatternCondition[];

  // Analysis results
  category: ErrorCategory;
  type: ErrorType;
  severity: ErrorSeverity;
  rootCause: string;

  // Recovery strategy
  recoveryStrategy: RecoveryStrategy;
  successProbability: number;

  // Pattern metadata
  frequency: number;
  lastSeen: Date;
  confidence: number;
}

/**
 * Pattern condition for matching
 */
export interface ErrorPatternCondition {
  field: string; // e.g., "message", "statusCode", "url"
  operator: "equals" | "contains" | "regex" | "gt" | "lt" | "in";
  value: string | number | Array<string | number>;
  weight?: number; // For weighted matching
}

/**
 * Error cluster for grouping similar errors
 */
export interface ErrorCluster {
  id: string;
  name: string;
  description: string;

  // Cluster characteristics
  category: ErrorCategory;
  type: ErrorType;
  severity: ErrorSeverity;

  // Cluster members
  errorIds: string[];
  errorCount: number;
  frequency: number;

  // Temporal information
  firstOccurrence: Date;
  lastOccurrence: Date;
  timeSpan: number; // milliseconds

  // Cluster analysis
  commonPatterns: string[];
  rootCause: string;
  recommendedAction: string;
}

// ============================================================================
// MAIN ERROR CLASSIFIER CLASS
// ============================================================================

/**
 * Enhanced error classification and analysis system
 */
export class ErrorClassifier {
  private static instance: ErrorClassifier;
  private version = "1.0.0";

  // Pattern database
  private patterns: Map<string, ErrorPattern> = new Map();
  private clusters: Map<string, ErrorCluster> = new Map();

  // Error history for analysis
  private errorHistory: Map<
    string,
    Array<{ error: any; context: ErrorContext; timestamp: Date }>
  > = new Map();
  private maxHistorySize = 1000;

  // Analysis cache
  private analysisCache: Map<
    string,
    { analysis: ErrorAnalysis; timestamp: Date }
  > = new Map();
  private cacheMaxAge = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializePatterns();
  }

  static getInstance(): ErrorClassifier {
    if (!ErrorClassifier.instance) {
      ErrorClassifier.instance = new ErrorClassifier();
    }
    return ErrorClassifier.instance;
  }

  /**
   * Classify and analyze an error
   */
  classifyError(error: any, context?: Partial<ErrorContext>): ErrorAnalysis {
    const fullContext = this.buildContext(context);
    const errorKey = this.generateErrorKey(error, fullContext);

    // Check cache first
    const cached = this.analysisCache.get(errorKey);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheMaxAge) {
      return cached.analysis;
    }

    // Perform classification
    const analysis = this.performClassification(error, fullContext);

    // Cache results
    this.analysisCache.set(errorKey, {
      analysis,
      timestamp: new Date(),
    });

    // Update history
    this.updateErrorHistory(errorKey, error, fullContext);

    // Update patterns and clusters
    this.updatePatterns(errorKey, error, analysis);
    this.updateClusters(errorKey, analysis);

    return analysis;
  }

  /**
   * Perform the actual classification analysis
   */
  private performClassification(
    error: any,
    context: ErrorContext,
  ): ErrorAnalysis {
    // Extract error information
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack;
    const statusCode = error?.statusCode || error?.status;
    const errorCode = error?.code;

    // Pattern matching
    const matchedPatterns = this.matchPatterns(
      errorMessage,
      statusCode,
      errorCode,
      context,
    );

    // Determine category and type
    let category = ErrorCategory.UNKNOWN;
    let type = ErrorType.UNKNOWN_ERROR;
    let confidence = 0.5;

    if (matchedPatterns.length > 0) {
      const bestMatch = matchedPatterns[0];
      category = bestMatch.category;
      type = bestMatch.type;
      confidence = bestMatch.confidence;
    } else {
      // Heuristic classification
      const heuristicResult = this.heuristicClassification(
        errorMessage,
        statusCode,
        errorCode,
        context,
      );
      category = heuristicResult.category;
      type = heuristicResult.type;
      confidence = heuristicResult.confidence;
    }

    // Determine severity
    const severity = this.determineSeverity(category, type, context);

    // Analyze impact
    const userImpact = this.assessUserImpact(category, type, severity, context);
    const systemImpact = this.assessSystemImpact(
      category,
      type,
      severity,
      context,
    );

    // Determine recovery strategy
    const recoveryInfo = this.determineRecoveryStrategy(
      category,
      type,
      severity,
      context,
    );

    // Root cause analysis
    const rootCauseAnalysis = this.performRootCauseAnalysis(
      category,
      type,
      errorMessage,
      context,
      matchedPatterns,
    );

    return {
      category,
      type,
      severity,
      confidence,
      pattern: matchedPatterns[0]?.id,
      relatedErrors: this.findRelatedErrors(category, type),
      frequency: this.getErrorFrequency(category, type),
      rootCause: rootCauseAnalysis.rootCause,
      contributingFactors: rootCauseAnalysis.contributingFactors,
      userImpact,
      systemImpact,
      recoveryStrategy: recoveryInfo.strategy,
      successProbability: recoveryInfo.probability,
      recommendedActions: recoveryInfo.actions,
      preventionStrategies: this.generatePreventionStrategies(
        category,
        type,
        rootCauseAnalysis,
      ),
      analysisTimestamp: new Date(),
      analysisVersion: this.version,
    };
  }

  /**
   * Match error against known patterns
   */
  private matchPatterns(
    message: string,
    statusCode?: number,
    errorCode?: string,
    context?: ErrorContext,
  ): ErrorPattern[] {
    const matches: Array<{ pattern: ErrorPattern; score: number }> = [];

    for (const pattern of this.patterns.values()) {
      let totalScore = 0;
      let totalWeight = 0;
      let matchedConditions = 0;

      for (const condition of pattern.conditions) {
        const weight = condition.weight || 1;
        totalWeight += weight;

        let matches = false;
        const fieldValue = this.getFieldValue(
          condition.field,
          message,
          statusCode,
          errorCode,
          context,
        );

        switch (condition.operator) {
          case "equals":
            matches = fieldValue === condition.value;
            break;
          case "contains":
            matches = String(fieldValue).includes(String(condition.value));
            break;
          case "regex":
            matches = new RegExp(String(condition.value), "i").test(
              String(fieldValue),
            );
            break;
          case "gt":
            matches = Number(fieldValue) > Number(condition.value);
            break;
          case "lt":
            matches = Number(fieldValue) < Number(condition.value);
            break;
          case "in":
            matches =
              Array.isArray(condition.value) &&
              condition.value.includes(fieldValue);
            break;
        }

        if (matches) {
          totalScore += weight;
          matchedConditions++;
        }
      }

      // Calculate final score (weighted average of matched conditions)
      const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      // Only consider patterns that match at least 50% of conditions
      if (matchedConditions / pattern.conditions.length >= 0.5) {
        matches.push({ pattern, score: finalScore });
      }
    }

    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .map((m) => m.pattern)
      .slice(0, 3);
  }

  /**
   * Heuristic classification for unknown errors
   */
  private heuristicClassification(
    message: string,
    statusCode?: number,
    errorCode?: string,
    context?: ErrorContext,
  ): { category: ErrorCategory; type: ErrorType; confidence: number } {
    const msg = message.toLowerCase();

    // Network errors
    if (
      msg.includes("network") ||
      msg.includes("connection") ||
      msg.includes("fetch")
    ) {
      if (msg.includes("timeout")) {
        return {
          category: ErrorCategory.NETWORK,
          type: ErrorType.CONNECTION_TIMEOUT,
          confidence: 0.8,
        };
      }
      if (msg.includes("econnrefused") || msg.includes("failed to fetch")) {
        return {
          category: ErrorCategory.NETWORK,
          type: ErrorType.CONNECTION_FAILURE,
          confidence: 0.8,
        };
      }
      return {
        category: ErrorCategory.NETWORK,
        type: ErrorType.CONNECTION_FAILURE,
        confidence: 0.6,
      };
    }

    // API errors
    if (
      statusCode === 401 ||
      msg.includes("unauthorized") ||
      msg.includes("api key")
    ) {
      return {
        category: ErrorCategory.API,
        type: ErrorType.API_AUTHENTICATION,
        confidence: 0.9,
      };
    }

    if (
      statusCode === 403 ||
      msg.includes("forbidden") ||
      msg.includes("permission")
    ) {
      return {
        category: ErrorCategory.AUTHORIZATION,
        type: ErrorType.PERMISSION_DENIED,
        confidence: 0.9,
      };
    }

    if (statusCode === 429 || msg.includes("rate limit")) {
      return {
        category: ErrorCategory.API,
        type: ErrorType.API_RATE_LIMIT,
        confidence: 0.9,
      };
    }

    // File errors
    if (msg.includes("file not found") || msg.includes("no such file")) {
      return {
        category: ErrorCategory.FILE_SYSTEM,
        type: ErrorType.FILE_NOT_FOUND,
        confidence: 0.9,
      };
    }

    if (msg.includes("too large") || statusCode === 413) {
      return {
        category: ErrorCategory.FILE_SYSTEM,
        type: ErrorType.FILE_TOO_LARGE,
        confidence: 0.9,
      };
    }

    // Audio errors
    if (
      msg.includes("audio") ||
      msg.includes("media") ||
      msg.includes("codec")
    ) {
      if (msg.includes("unsupported")) {
        return {
          category: ErrorCategory.AUDIO_PROCESSING,
          type: ErrorType.AUDIO_FORMAT_UNSUPPORTED,
          confidence: 0.8,
        };
      }
      return {
        category: ErrorCategory.AUDIO_PROCESSING,
        type: ErrorType.AUDIO_DECODE_FAILURE,
        confidence: 0.6,
      };
    }

    // Transcription errors
    if (
      msg.includes("transcript") ||
      msg.includes("whisper") ||
      msg.includes("groq")
    ) {
      if (msg.includes("timeout")) {
        return {
          category: ErrorCategory.TRANSCRIPTION,
          type: ErrorType.TRANSCRIPTION_TIMEOUT,
          confidence: 0.8,
        };
      }
      return {
        category: ErrorCategory.TRANSCRIPTION,
        type: ErrorType.TRANSCRIPTION_SERVICE_UNAVAILABLE,
        confidence: 0.6,
      };
    }

    // Validation errors
    if (
      msg.includes("validation") ||
      msg.includes("invalid") ||
      statusCode === 400
    ) {
      return {
        category: ErrorCategory.VALIDATION,
        type: ErrorType.INPUT_VALIDATION,
        confidence: 0.8,
      };
    }

    // Server errors
    if (statusCode && statusCode >= 500) {
      return {
        category: ErrorCategory.API,
        type: ErrorType.API_ENDPOINT_ERROR,
        confidence: 0.7,
      };
    }

    // Default classification
    return {
      category: ErrorCategory.UNKNOWN,
      type: ErrorType.UNKNOWN_ERROR,
      confidence: 0.3,
    };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    category: ErrorCategory,
    type: ErrorType,
    context: ErrorContext,
  ): ErrorSeverity {
    // Critical errors that block core functionality
    const criticalTypes = [
      ErrorType.DATABASE_CONNECTION,
      ErrorType.STORAGE_UNAVAILABLE,
      ErrorType.STATE_CORRUPTION,
      ErrorType.AUTHENTICATION,
      ErrorType.TOKEN_EXPIRED,
    ];

    if (criticalTypes.includes(type)) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    const highTypes = [
      ErrorType.TRANSCRIPTION_SERVICE_UNAVAILABLE,
      ErrorType.AUDIO_DECODE_FAILURE,
      ErrorType.API_RATE_LIMIT,
      ErrorType.FILE_TOO_LARGE,
      ErrorType.MEMORY_LEAK,
    ];

    if (highTypes.includes(type)) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    const mediumTypes = [
      ErrorType.CONNECTION_FAILURE,
      ErrorType.CONNECTION_TIMEOUT,
      ErrorType.UPLOAD_FAILED,
      ErrorType.DOWNLOAD_FAILED,
      ErrorType.TRANSCRIPTION_TIMEOUT,
    ];

    if (mediumTypes.includes(type)) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity errors
    const lowTypes = [
      ErrorType.INPUT_VALIDATION,
      ErrorType.REQUIRED_FIELD_MISSING,
      ErrorType.ASSET_LOADING_FAILED,
    ];

    if (lowTypes.includes(type)) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.LOW;
  }

  /**
   * Assess user impact
   */
  private assessUserImpact(
    category: ErrorCategory,
    type: ErrorType,
    severity: ErrorSeverity,
    context: ErrorContext,
  ): UserImpact {
    const affectedFeatures = this.getAffectedFeatures(category, type, context);

    let level: UserImpact["level"];
    let userActionRequired = false;
    let workaroundAvailable = false;

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        level = "blocking";
        userActionRequired = true;
        break;
      case ErrorSeverity.HIGH:
        level = "disruptive";
        userActionRequired = true;
        workaroundAvailable = true;
        break;
      case ErrorSeverity.MEDIUM:
        level = "annoying";
        userActionRequired = false;
        workaroundAvailable = true;
        break;
      default:
        level = "minimal";
        userActionRequired = false;
        workaroundAvailable = true;
    }

    const description = this.generateUserImpactDescription(
      category,
      type,
      level,
    );

    return {
      level,
      affectedFeatures,
      workaroundAvailable,
      userActionRequired,
      description,
    };
  }

  /**
   * Assess system impact
   */
  private assessSystemImpact(
    category: ErrorCategory,
    type: ErrorType,
    severity: ErrorSeverity,
    context: ErrorContext,
  ): SystemImpact {
    const affectedComponents = this.getAffectedComponents(category, type);

    let level: SystemImpact["level"];
    let cascadePossible = false;
    let dataIntegrityRisk = false;

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        level = "critical";
        cascadePossible = true;
        dataIntegrityRisk = true;
        break;
      case ErrorSeverity.HIGH:
        level = "high";
        cascadePossible = true;
        dataIntegrityRisk = false;
        break;
      case ErrorSeverity.MEDIUM:
        level = "medium";
        cascadePossible = false;
        dataIntegrityRisk = false;
        break;
      default:
        level = "low";
        cascadePossible = false;
        dataIntegrityRisk = false;
    }

    const performanceImpact = this.getPerformanceImpact(category, type);

    return {
      level,
      affectedComponents,
      cascadePossible,
      dataIntegrityRisk,
      performanceImpact,
    };
  }

  /**
   * Determine recovery strategy
   */
  private determineRecoveryStrategy(
    category: ErrorCategory,
    type: ErrorType,
    severity: ErrorSeverity,
    context: ErrorContext,
  ): { strategy: RecoveryStrategy; probability: number; actions: string[] } {
    // Network errors - retry with backoff
    if (category === ErrorCategory.NETWORK) {
      return {
        strategy: RecoveryStrategy.EXPONENTIAL_BACKOFF,
        probability: 0.8,
        actions: [
          "Retry with exponential backoff",
          "Check network connectivity",
          "Verify server status",
        ],
      };
    }

    // API rate limit - wait and retry
    if (type === ErrorType.API_RATE_LIMIT) {
      return {
        strategy: RecoveryStrategy.AUTOMATIC_RETRY,
        probability: 0.9,
        actions: [
          "Wait for rate limit reset",
          "Implement queue for requests",
          "Use API more efficiently",
        ],
      };
    }

    // Authentication errors - reauthenticate
    if (category === ErrorCategory.AUTHENTICATION) {
      return {
        strategy: RecoveryStrategy.REAUTHENTICATION,
        probability: 0.95,
        actions: [
          "Prompt user to log in again",
          "Refresh authentication tokens",
          "Clear stored credentials",
        ],
      };
    }

    // File size errors - user action required
    if (type === ErrorType.FILE_TOO_LARGE) {
      return {
        strategy: RecoveryStrategy.USER_ACTION_REQUIRED,
        probability: 1.0,
        actions: [
          "Compress the file",
          "Split into smaller files",
          "Use different file format",
        ],
      };
    }

    // Temporary server errors - retry
    if (
      category === ErrorCategory.API &&
      (type === ErrorType.API_ENDPOINT_ERROR ||
        type === ErrorType.TRANSCRIPTION_SERVICE_UNAVAILABLE)
    ) {
      return {
        strategy: RecoveryStrategy.AUTOMATIC_RETRY,
        probability: 0.7,
        actions: [
          "Retry the request",
          "Check service status",
          "Use fallback service if available",
        ],
      };
    }

    // Validation errors - user input required
    if (category === ErrorCategory.VALIDATION) {
      return {
        strategy: RecoveryStrategy.USER_INPUT_REQUIRED,
        probability: 1.0,
        actions: [
          "Provide valid input",
          "Check format requirements",
          "Complete required fields",
        ],
      };
    }

    // Critical system errors - service restart
    if (severity === ErrorSeverity.CRITICAL) {
      return {
        strategy: RecoveryStrategy.SERVICE_RESTART,
        probability: 0.6,
        actions: [
          "Restart the service",
          "Check system resources",
          "Verify configuration",
        ],
      };
    }

    // Default strategy
    return {
      strategy: RecoveryStrategy.USER_RETRY,
      probability: 0.5,
      actions: [
        "Try the operation again",
        "Check if conditions have changed",
        "Contact support if persistent",
      ],
    };
  }

  /**
   * Perform root cause analysis
   */
  private performRootCauseAnalysis(
    category: ErrorCategory,
    type: ErrorType,
    message: string,
    context: ErrorContext,
    matchedPatterns: ErrorPattern[],
  ): { rootCause: string; contributingFactors: string[] } {
    // Use pattern-based root cause if available
    if (matchedPatterns.length > 0) {
      const pattern = matchedPatterns[0];
      return {
        rootCause: pattern.rootCause,
        contributingFactors: this.getContributingFactors(
          category,
          type,
          context,
        ),
      };
    }

    // Heuristic root cause analysis
    const rootCauseMap: Record<ErrorType, string> = {
      [ErrorType.CONNECTION_FAILURE]:
        "Network connectivity issue or server unavailable",
      [ErrorType.CONNECTION_TIMEOUT]: "Request took too long to complete",
      [ErrorType.API_RATE_LIMIT]: "Too many requests sent in short time period",
      [ErrorType.API_AUTHENTICATION]:
        "Invalid or missing authentication credentials",
      [ErrorType.FILE_TOO_LARGE]: "File exceeds size limits",
      [ErrorType.AUDIO_FORMAT_UNSUPPORTED]:
        "Audio format not supported by processing service",
      [ErrorType.TRANSCRIPTION_SERVICE_UNAVAILABLE]:
        "Transcription service temporarily unavailable",
      [ErrorType.INPUT_VALIDATION]:
        "User input does not meet validation requirements",
      [ErrorType.DATABASE_CONNECTION]: "Unable to connect to database",
      [ErrorType.MEMORY_LEAK]:
        "Memory not properly released causing gradual consumption",
    };

    const rootCause = rootCauseMap[type] || "Unknown cause";
    const contributingFactors = this.getContributingFactors(
      category,
      type,
      context,
    );

    return { rootCause, contributingFactors };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Build complete error context
   */
  private buildContext(partial?: Partial<ErrorContext>): ErrorContext {
    return {
      timestamp: new Date(),
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
      url: typeof window !== "undefined" ? window.location.href : "Unknown",
      sessionId: this.generateSessionId(),
      ...partial,
    };
  }

  /**
   * Generate unique error key for caching and history
   */
  private generateErrorKey(error: any, context: ErrorContext): string {
    const message = error?.message || String(error);
    const stack = error?.stack || "";
    const component = context.component || "unknown";

    // Create hash from message, stack, and component
    const combined = `${message}-${stack.substring(0, 100)}-${component}`;
    return this.simpleHash(combined);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Simple hash function for error keys
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
   * Get field value for pattern matching
   */
  private getFieldValue(
    field: string,
    message: string,
    statusCode?: number,
    errorCode?: string,
    context?: ErrorContext,
  ): string | number {
    switch (field) {
      case "message":
        return message;
      case "statusCode":
        return statusCode;
      case "errorCode":
        return errorCode;
      case "component":
        return context?.component || "";
      case "url":
        return context?.url || "";
      case "userAgent":
        return context?.userAgent || "";
      default:
        return "";
    }
  }

  /**
   * Update error history
   */
  private updateErrorHistory(
    key: string,
    error: any,
    context: ErrorContext,
  ): void {
    if (!this.errorHistory.has(key)) {
      this.errorHistory.set(key, []);
    }

    const history = this.errorHistory.get(key)!;
    history.push({
      error,
      context,
      timestamp: new Date(),
    });

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  /**
   * Update error patterns based on new errors
   */
  private updatePatterns(
    key: string,
    error: any,
    analysis: ErrorAnalysis,
  ): void {
    for (const pattern of this.patterns.values()) {
      if (analysis.pattern === pattern.id) {
        pattern.frequency++;
        pattern.lastSeen = new Date();

        // Update confidence based on successful matches
        const newConfidence = Math.min(0.95, pattern.confidence + 0.01);
        pattern.confidence = newConfidence;
      }
    }
  }

  /**
   * Update error clusters
   */
  private updateClusters(key: string, analysis: ErrorAnalysis): void {
    const clusterKey = `${analysis.category}-${analysis.type}`;

    if (!this.clusters.has(clusterKey)) {
      this.clusters.set(clusterKey, {
        id: clusterKey,
        name: `${analysis.category} - ${analysis.type}`,
        description: `Cluster for ${analysis.category} errors of type ${analysis.type}`,
        category: analysis.category,
        type: analysis.type,
        severity: analysis.severity,
        errorIds: [],
        errorCount: 0,
        frequency: 0,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        timeSpan: 0,
        commonPatterns: [],
        rootCause: analysis.rootCause || "Unknown",
        recommendedAction:
          analysis.recommendedActions[0] || "Monitor and investigate",
      });
    }

    const cluster = this.clusters.get(clusterKey)!;
    cluster.errorIds.push(key);
    cluster.errorCount++;
    cluster.frequency =
      (cluster.errorCount / (Date.now() - cluster.firstOccurrence.getTime())) *
      1000; // per second
    cluster.lastOccurrence = new Date();
    cluster.timeSpan =
      cluster.lastOccurrence.getTime() - cluster.firstOccurrence.getTime();

    // Update common patterns
    if (
      analysis.pattern &&
      !cluster.commonPatterns.includes(analysis.pattern)
    ) {
      cluster.commonPatterns.push(analysis.pattern);
    }
  }

  /**
   * Find related errors based on category and type
   */
  private findRelatedErrors(
    category: ErrorCategory,
    type: ErrorType,
  ): string[] {
    const related: string[] = [];

    // Find errors in the same category
    for (const [key, history] of this.errorHistory.entries()) {
      for (const entry of history) {
        const entryAnalysis = this.classifyError(entry.error, entry.context);
        if (
          entryAnalysis.category === category &&
          entryAnalysis.type !== type
        ) {
          related.push(entryAnalysis.type);
        }
      }
    }

    return [...new Set(related)]; // Remove duplicates
  }

  /**
   * Get error frequency for category/type combination
   */
  private getErrorFrequency(category: ErrorCategory, type: ErrorType): number {
    let count = 0;
    let total = 0;

    for (const history of this.errorHistory.values()) {
      for (const entry of history) {
        total++;
        const analysis = this.classifyError(entry.error, entry.context);
        if (analysis.category === category && analysis.type === type) {
          count++;
        }
      }
    }

    return total > 0 ? count / total : 0;
  }

  /**
   * Get affected features for user impact
   */
  private getAffectedFeatures(
    category: ErrorCategory,
    type: ErrorType,
    context: ErrorContext,
  ): string[] {
    const features: string[] = [];

    // File-related errors affect file operations
    if (
      category === ErrorCategory.FILE_SYSTEM ||
      type === ErrorType.UPLOAD_FAILED
    ) {
      features.push("File Upload", "File Management", "Audio Processing");
    }

    // Transcription errors affect transcription features
    if (category === ErrorCategory.TRANSCRIPTION) {
      features.push(
        "Audio Transcription",
        "Text Processing",
        "Player Features",
      );
    }

    // Network errors affect all online features
    if (category === ErrorCategory.NETWORK) {
      features.push("Online Features", "Real-time Updates", "Cloud Sync");
    }

    // Authentication errors affect user-specific features
    if (
      category === ErrorCategory.AUTHENTICATION ||
      category === ErrorCategory.AUTHORIZATION
    ) {
      features.push("User Profile", "Saved Files", "Preferences");
    }

    // Database errors affect data persistence
    if (category === ErrorCategory.DATABASE) {
      features.push("Data Persistence", "Offline Mode", "Local Storage");
    }

    return features.length > 0 ? features : ["General Application Features"];
  }

  /**
   * Generate user impact description
   */
  private generateUserImpactDescription(
    category: ErrorCategory,
    type: ErrorType,
    level: UserImpact["level"],
  ): string {
    const descriptions: Record<UserImpact["level"], string> = {
      blocking:
        "This error prevents you from using the application. Immediate action is required.",
      disruptive:
        "This error significantly impacts your experience but you may be able to continue with limitations.",
      annoying:
        "This error is inconvenient but doesn't prevent you from using the application.",
      minimal: "This error has minimal impact on your experience.",
    };

    return descriptions[level];
  }

  /**
   * Get affected components for system impact
   */
  private getAffectedComponents(
    category: ErrorCategory,
    type: ErrorType,
  ): string[] {
    const components: string[] = [];

    switch (category) {
      case ErrorCategory.NETWORK:
        components.push("API Client", "Network Layer", "Request Queue");
        break;
      case ErrorCategory.DATABASE:
        components.push("Database Connection", "Query Engine", "Data Layer");
        break;
      case ErrorCategory.TRANSCRIPTION:
        components.push(
          "Transcription Service",
          "Audio Processor",
          "Text Analyzer",
        );
        break;
      case ErrorCategory.FILE_SYSTEM:
        components.push("File Handler", "Storage Manager", "Upload Service");
        break;
      case ErrorCategory.UI_RENDERING:
        components.push("React Components", "Rendering Engine", "Style System");
        break;
      case ErrorCategory.STATE_MANAGEMENT:
        components.push("State Store", "Query Client", "Sync Manager");
        break;
    }

    return components.length > 0 ? components : ["Application Core"];
  }

  /**
   * Get performance impact level
   */
  private getPerformanceImpact(
    category: ErrorCategory,
    type: ErrorType,
  ): SystemImpact["performanceImpact"] {
    const highImpactCategories = [
      ErrorCategory.MEMORY,
      ErrorCategory.PERFORMANCE,
    ];
    const highImpactTypes = [
      ErrorType.MEMORY_LEAK,
      ErrorType.CPU_THRESHOLD_EXCEEDED,
    ];

    if (
      highImpactCategories.includes(category) ||
      highImpactTypes.includes(type)
    ) {
      return "severe";
    }

    const moderateImpactCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.DATABASE,
    ];
    const moderateImpactTypes = [
      ErrorType.CONNECTION_TIMEOUT,
      ErrorType.DATABASE_TIMEOUT,
    ];

    if (
      moderateImpactCategories.includes(category) ||
      moderateImpactTypes.includes(type)
    ) {
      return "moderate";
    }

    return "minimal";
  }

  /**
   * Get contributing factors for root cause
   */
  private getContributingFactors(
    category: ErrorCategory,
    type: ErrorType,
    context: ErrorContext,
  ): string[] {
    const factors: string[] = [];

    // Network-related factors
    if (category === ErrorCategory.NETWORK) {
      if (context.networkType === "cellular") {
        factors.push("Mobile network connection may be unstable");
      }
      if (context.batteryLevel && context.batteryLevel < 0.2) {
        factors.push("Low battery may affect network performance");
      }
      if (context.isLowPowerMode) {
        factors.push("Low power mode may limit network activity");
      }
    }

    // Performance-related factors
    if (context.memoryUsage && context.memoryUsage > 0.8) {
      factors.push("High memory usage may affect performance");
    }

    // Time-based factors
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      factors.push("Off-peak hours may affect service availability");
    }

    // Error frequency factors
    const errorFrequency = this.getErrorFrequency(category, type);
    if (errorFrequency > 0.1) {
      factors.push("High frequency of similar errors suggests systemic issue");
    }

    return factors;
  }

  /**
   * Generate prevention strategies
   */
  private generatePreventionStrategies(
    category: ErrorCategory,
    type: ErrorType,
    rootCauseAnalysis: { rootCause: string; contributingFactors: string[] },
  ): string[] {
    const strategies: string[] = [];

    // Network error prevention
    if (category === ErrorCategory.NETWORK) {
      strategies.push("Implement robust error handling for network requests");
      strategies.push("Add offline mode support for critical features");
      strategies.push("Use exponential backoff for retry logic");
    }

    // API error prevention
    if (category === ErrorCategory.API) {
      strategies.push("Implement proper request validation");
      strategies.push("Add API rate limiting on client side");
      strategies.push("Monitor API usage and implement quotas");
    }

    // File system error prevention
    if (category === ErrorCategory.FILE_SYSTEM) {
      strategies.push("Validate file formats and sizes before upload");
      strategies.push("Implement chunked upload for large files");
      strategies.push("Add comprehensive file error handling");
    }

    // Transcription error prevention
    if (category === ErrorCategory.TRANSCRIPTION) {
      strategies.push("Add audio quality validation before processing");
      strategies.push("Implement fallback transcription services");
      strategies.push("Add queue management for transcription jobs");
    }

    // Generic prevention strategies
    strategies.push("Implement comprehensive logging and monitoring");
    strategies.push("Add health checks for critical services");
    strategies.push("Create error recovery playbooks");

    return strategies;
  }

  // ============================================================================
  // INITIALIZATION AND CONFIGURATION
  // ============================================================================

  /**
   * Initialize error patterns database
   */
  private initializePatterns(): void {
    // Network error patterns
    this.addPattern({
      id: "network-connection-failure",
      name: "Network Connection Failure",
      description: "Failed to establish network connection",
      category: ErrorCategory.NETWORK,
      type: ErrorType.CONNECTION_FAILURE,
      severity: ErrorSeverity.HIGH,
      rootCause: "Network connectivity issues or server unavailable",
      recoveryStrategy: RecoveryStrategy.EXPONENTIAL_BACKOFF,
      successProbability: 0.8,
      frequency: 0,
      lastSeen: new Date(),
      confidence: 0.9,
      conditions: [
        {
          field: "message",
          operator: "contains",
          value: "failed to fetch",
          weight: 2,
        },
        { field: "message", operator: "contains", value: "network", weight: 1 },
      ],
    });

    // API authentication patterns
    this.addPattern({
      id: "api-authentication-error",
      name: "API Authentication Error",
      description: "Invalid or missing API authentication",
      category: ErrorCategory.API,
      type: ErrorType.API_AUTHENTICATION,
      severity: ErrorSeverity.CRITICAL,
      rootCause: "Invalid API key or authentication credentials",
      recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
      successProbability: 0.95,
      frequency: 0,
      lastSeen: new Date(),
      confidence: 0.95,
      conditions: [
        { field: "statusCode", operator: "equals", value: 401, weight: 3 },
        {
          field: "message",
          operator: "contains",
          value: "unauthorized",
          weight: 2,
        },
        { field: "message", operator: "contains", value: "api key", weight: 2 },
      ],
    });

    // File size error patterns
    this.addPattern({
      id: "file-too-large",
      name: "File Too Large",
      description: "File exceeds maximum size limit",
      category: ErrorCategory.FILE_SYSTEM,
      type: ErrorType.FILE_TOO_LARGE,
      severity: ErrorSeverity.MEDIUM,
      rootCause: "File size exceeds configured limits",
      recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
      successProbability: 1.0,
      frequency: 0,
      lastSeen: new Date(),
      confidence: 0.9,
      conditions: [
        { field: "statusCode", operator: "equals", value: 413, weight: 3 },
        {
          field: "message",
          operator: "contains",
          value: "too large",
          weight: 2,
        },
        { field: "message", operator: "contains", value: "file", weight: 1 },
      ],
    });

    // Add more patterns as needed...
  }

  /**
   * Add a new error pattern
   */
  private addPattern(pattern: ErrorPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get error statistics and analytics
   */
  getStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrors: Array<{ type: ErrorType; count: number; frequency: number }>;
    clusterCount: number;
    patternCount: number;
  } {
    const errorsByCategory: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    let totalErrors = 0;

    // Analyze all historical errors
    for (const history of this.errorHistory.values()) {
      for (const entry of history) {
        totalErrors++;
        const analysis = this.classifyError(entry.error, entry.context);

        errorsByCategory[analysis.category] =
          (errorsByCategory[analysis.category] || 0) + 1;
        errorsByType[analysis.type] = (errorsByType[analysis.type] || 0) + 1;
        errorsBySeverity[analysis.severity] =
          (errorsBySeverity[analysis.severity] || 0) + 1;
      }
    }

    // Calculate top errors
    const topErrors = Object.entries(errorsByType)
      .map(([type, count]) => ({
        type: type as ErrorType,
        count,
        frequency: this.getErrorFrequency(
          ErrorCategory.UNKNOWN,
          type as ErrorType,
        ),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      errorsByCategory: errorsByCategory as Record<ErrorCategory, number>,
      errorsByType: errorsByType as Record<ErrorType, number>,
      errorsBySeverity: errorsBySeverity as Record<ErrorSeverity, number>,
      topErrors,
      clusterCount: this.clusters.size,
      patternCount: this.patterns.size,
    };
  }

  /**
   * Get active error clusters
   */
  getActiveClusters(thresholdHours: number = 24): ErrorCluster[] {
    const threshold = Date.now() - thresholdHours * 60 * 60 * 1000;

    return Array.from(this.clusters.values())
      .filter((cluster) => cluster.lastOccurrence.getTime() > threshold)
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Export error data for analysis
   */
  exportData(): {
    patterns: ErrorPattern[];
    clusters: ErrorCluster[];
    analysis: Array<{ error: any; analysis: ErrorAnalysis; timestamp: Date }>;
    statistics: ReturnType<ErrorClassifier["getStatistics"]>;
  } {
    const analysis: Array<{
      error: any;
      analysis: ErrorAnalysis;
      timestamp: Date;
    }> = [];

    for (const history of this.errorHistory.values()) {
      for (const entry of history) {
        analysis.push({
          error: entry.error,
          analysis: this.classifyError(entry.error, entry.context),
          timestamp: entry.timestamp,
        });
      }
    }

    return {
      patterns: Array.from(this.patterns.values()),
      clusters: Array.from(this.clusters.values()),
      analysis,
      statistics: this.getStatistics(),
    };
  }

  /**
   * Clear error history and cache
   */
  clearHistory(): void {
    this.errorHistory.clear();
    this.analysisCache.clear();
    this.clusters.clear();

    // Reset pattern frequencies
    for (const pattern of this.patterns.values()) {
      pattern.frequency = 0;
      pattern.lastSeen = new Date();
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convenience function to classify an error
 */
export function classifyError(
  error: any,
  context?: Partial<ErrorContext>,
): ErrorAnalysis {
  return ErrorClassifier.getInstance().classifyError(error, context);
}

/**
 * Get error classifier statistics
 */
export function getErrorStatistics(): ReturnType<
  ErrorClassifier["getStatistics"]
> {
  return ErrorClassifier.getInstance().getStatistics();
}

/**
 * Get active error clusters
 */
export function getActiveErrorClusters(
  thresholdHours?: number,
): ErrorCluster[] {
  return ErrorClassifier.getInstance().getActiveClusters(thresholdHours);
}

/**
 * Export error analysis data
 */
export function exportErrorData(): ReturnType<ErrorClassifier["exportData"]> {
  return ErrorClassifier.getInstance().exportData();
}

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Integration helper for TanStack Query
 */
export function createQueryErrorHandler(context?: Partial<ErrorContext>) {
  return (error: unknown) => {
    const analysis = classifyError(error, context);

    // Log the analysis
    console.error("Query Error Analysis:", analysis);

    // Trigger appropriate recovery based on analysis
    if (analysis.recoveryStrategy === RecoveryStrategy.AUTOMATIC_RETRY) {
      // Let TanStack Query handle retry with appropriate delay
      return {
        retry: true,
        retryDelay: 1000 * Math.pow(2, 3), // Exponential backoff
        analysis,
      };
    }

    return {
      retry: false,
      analysis,
    };
  };
}

/**
 * Integration helper for React Error Boundaries
 */
export function createErrorBoundaryHandler(context?: Partial<ErrorContext>) {
  return (error: Error, errorInfo: React.ErrorInfo) => {
    const analysis = classifyError(error, {
      ...context,
      component:
        errorInfo.componentStack.split("\n")[1]?.trim() || "Unknown Component",
      customData: { errorInfo },
    });

    // Log to monitoring service
    console.error("Error Boundary Analysis:", analysis);

    // Return user-friendly error info
    return {
      userMessage: analysis.userImpact.description,
      suggestedActions: analysis.recommendedActions,
      severity: analysis.severity,
      analysis,
    };
  };
}

/**
 * Integration helper for API routes
 */
export function createApiErrorHandler(
  req: Request,
  context?: Partial<ErrorContext>,
) {
  return (error: unknown) => {
    const analysis = classifyError(error, {
      ...context,
      url: req.url,
      userAgent: req.headers.get("user-agent") || "Unknown",
    });

    // Return appropriate HTTP response
    const statusCode = analysis.systemImpact.level === "critical" ? 500 : 400;

    return {
      statusCode,
      body: {
        error: {
          type: analysis.type,
          message: analysis.userImpact.description,
          severity: analysis.severity,
          suggestedActions: analysis.recommendedActions,
          retryable: analysis.recoveryStrategy !== RecoveryStrategy.NO_RECOVERY,
        },
      },
    };
  };
}
