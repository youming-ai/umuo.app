/**
 * Comprehensive Error Handling Middleware System
 *
 * A sophisticated middleware system that provides centralized error processing,
 * user-friendly error transformation, and intelligent recovery integration for umuo.app.
 *
 * This middleware system integrates with:
 * - Next.js API routes and middleware
 * - Express.js applications (compatibility layer)
 * - React component error boundaries
 * - TanStack Query error handling
 * - Mobile-specific error handling optimizations
 *
 * Key Features:
 * - Request/response error interception and transformation
 * - Automatic error classification using T057 error-classifier.ts
 * - Recovery strategy evaluation using T058 recovery-strategies.ts
 * - User-friendly error message generation using T059
 * - Context enrichment and metadata management
 * - Performance monitoring and optimization
 * - Mobile device context awareness
 * - Analytics integration and error tracking
 */

import {
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  ErrorContext,
  ErrorAnalysis,
  classifyError,
  ErrorClassifier,
} from "./error-classifier";
import {
  RecoveryStrategy,
  RecoveryManager,
  RecoveryPlan,
  RecoveryResult,
  RecoveryExecutionContext,
  createRecoveryStrategy,
} from "./recovery-strategies";
import { AppError } from "@/lib/utils/error-handler";

// ============================================================================
// CORE MIDDLEWARE INTERFACES
// ============================================================================

/**
 * Middleware execution context with comprehensive information
 */
export interface MiddlewareContext {
  // Request/response context
  request?: MiddlewareRequest;
  response?: MiddlewareResponse;
  next?: () => Promise<void> | void;

  // Application context
  timestamp: Date;
  requestId: string;
  sessionId: string;
  userId?: string;

  // Device and mobile context
  deviceContext?: MobileDeviceContext;
  performanceContext?: PerformanceContext;

  // Feature flags and configuration
  featureFlags?: Record<string, boolean>;
  configuration?: MiddlewareConfiguration;

  // Custom context data
  customData?: Record<string, any>;

  // Error handling state
  errorHandlingState?: {
    errorCount: number;
    lastError?: ErrorAnalysis;
    recoveryAttempts: number;
    userNotified: boolean;
  };
}

/**
 * Middleware request interface
 */
export interface MiddlewareRequest {
  // HTTP request information
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  params?: Record<string, any>;
  body?: any;

  // Timing information
  startTime: number;
  duration?: number;

  // Request metadata
  ip?: string;
  userAgent?: string;
  referer?: string;
  origin?: string;

  // Authentication/authorization
  authenticated?: boolean;
  permissions?: string[];

  // Mobile-specific request data
  mobileData?: {
    appVersion?: string;
    deviceType?: string;
    networkType?: string;
    batteryLevel?: number;
  };
}

/**
 * Middleware response interface
 */
export interface MiddlewareResponse {
  // HTTP response data
  statusCode: number;
  headers: Record<string, string>;
  body?: any;

  // Response metadata
  contentType?: string;
  contentLength?: number;
  etag?: string;

  // Caching information
  cacheControl?: string;
  maxAge?: number;

  // Error response information
  errorResponse?: {
    id: string;
    type: string;
    message: string;
    details?: any;
    recovery?: RecoverySuggestion;
  };
}

/**
 * Mobile device context for middleware
 */
export interface MobileDeviceContext {
  deviceType: "mobile" | "tablet" | "desktop";
  operatingSystem:
    | "ios"
    | "android"
    | "windows"
    | "macos"
    | "linux"
    | "unknown";
  appVersion: string;
  browser: string;
  browserVersion: string;

  // Device capabilities
  capabilities: {
    touch: boolean;
    geolocation: boolean;
    camera: boolean;
    microphone: boolean;
    webgl: boolean;
    webassembly: boolean;
    serviceworker: boolean;
  };

  // Device state
  batteryLevel?: number;
  isLowPowerMode: boolean;
  isOnline: boolean;
  networkType: "wifi" | "cellular" | "ethernet" | "unknown";
  networkStrength?: number;

  // Performance characteristics
  deviceClass: "low" | "medium" | "high";
  memoryConstraints: boolean;
  storageConstraints: boolean;

  // App-specific context
  pwaInstalled: boolean;
  standaloneMode: boolean;
  screenOrientation: "portrait" | "landscape";
  viewportSize: { width: number; height: number };
}

/**
 * Performance context for middleware
 */
export interface PerformanceContext {
  // Timing metrics
  requestStartTime: number;
  responseTime?: number;
  processingTime?: number;

  // Resource usage
  memoryUsage?: number;
  cpuUsage?: number;

  // Network performance
  connectionType: string;
  downlink?: number;
  rtt?: number;
  effectiveType?: string;

  // Application performance
  domContentLoaded?: number;
  loadComplete?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;

  // Error performance impact
  errorHandlingOverhead?: number;
  recoveryTime?: number;
}

/**
 * Middleware configuration options
 */
export interface MiddlewareConfiguration {
  // Error handling configuration
  enabled: boolean;
  debugMode: boolean;
  silentMode: boolean;
  logLevel: "error" | "warn" | "info" | "debug";

  // Classification and recovery
  enableClassification: boolean;
  enableRecovery: boolean;
  autoRecovery: boolean;
  maxRecoveryAttempts: number;

  // User experience
  showUserFriendlyErrors: boolean;
  enableErrorNotifications: boolean;
  allowUserFeedback: boolean;
  customizeErrorMessages: boolean;

  // Performance settings
  enablePerformanceMonitoring: boolean;
  maxErrorProcessingTime: number;
  enableErrorCaching: boolean;
  errorCacheMaxAge: number;

  // Mobile-specific settings
  enableMobileOptimizations: boolean;
  mobilePerformanceMode: boolean;
  batteryOptimizations: boolean;
  networkOptimizations: boolean;

  // Analytics and monitoring
  enableAnalytics: boolean;
  analyticsEndpoint?: string;
  enableRealTimeMonitoring: boolean;
  monitoringEndpoint?: string;

  // Integration settings
  tanstackQueryIntegration: boolean;
  reactErrorBoundaryIntegration: boolean;
  apiMiddlewareIntegration: boolean;

  // Filtering and routing
  errorFilters: ErrorFilter[];
  routingRules: ErrorRoutingRule[];

  // Custom transformations
  customTransformers: ErrorTransformer[];
  customValidators: ErrorValidator[];
}

/**
 * Error filter for selective processing
 */
export interface ErrorFilter {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;

  // Filter conditions
  conditions: {
    errorTypes?: ErrorType[];
    errorCategories?: ErrorCategory[];
    severities?: ErrorSeverity[];
    paths?: string[];
    methods?: string[];
    userAgents?: string[];
    custom?: (error: any, context: MiddlewareContext) => boolean;
  };

  // Filter actions
  action: "include" | "exclude" | "transform" | "route";
  target?: string; // For routing actions
  transformer?: string; // For transform actions
}

/**
 * Error routing rule for directing errors to specific handlers
 */
export interface ErrorRoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;

  // Routing conditions
  conditions: {
    errorTypes?: ErrorType[];
    errorCategories?: ErrorCategory[];
    severities?: ErrorSeverity[];
    paths?: string[];
    methods?: string[];
    custom?: (error: any, context: MiddlewareContext) => boolean;
  };

  // Routing target
  target: {
    type: "handler" | "service" | "endpoint" | "middleware";
    destination: string;
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  };

  // Routing options
  async: boolean;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Error transformer interface
 */
export interface ErrorTransformer {
  id: string;
  name: string;
  description: string;
  priority: number;

  // Transformer conditions
  conditions: {
    errorTypes?: ErrorType[];
    errorCategories?: ErrorCategory[];
    severities?: ErrorSeverity[];
    custom?: (error: any, context: MiddlewareContext) => boolean;
  };

  // Transformation logic
  transform: (
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ) => Promise<{
    error: any;
    analysis: ErrorAnalysis;
    response?: Partial<MiddlewareResponse>;
    userMessage?: string;
    recovery?: RecoverySuggestion;
  }>;

  // Transformer metadata
  tags: string[];
  version: string;
}

/**
 * Error validator interface
 */
export interface ErrorValidator {
  id: string;
  name: string;
  description: string;
  priority: number;

  // Validation logic
  validate: (
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ) => Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
    suggestions?: string[];
  }>;

  // Validator metadata
  categories: ErrorCategory[];
  types: ErrorType[];
}

/**
 * Recovery suggestion for user guidance
 */
export interface RecoverySuggestion {
  id: string;
  type: "automatic" | "manual" | "guided" | "escalated";
  title: string;
  description: string;
  steps: RecoveryStep[];
  successProbability: number;
  estimatedTime: number;
  requiredUserAction: boolean;
  allowSkip: boolean;

  // Recovery options
  primaryAction?: RecoveryAction;
  secondaryActions?: RecoveryAction[];
  tertiaryActions?: RecoveryAction[];

  // Context information
  context?: {
    affectedFeatures: string[];
    workaroundAvailable: boolean;
    severity: string;
  };
}

/**
 * Individual recovery step
 */
export interface RecoveryStep {
  id: string;
  title: string;
  description: string;
  type: "action" | "information" | "input" | "confirmation";
  required: boolean;
  automated: boolean;
  estimatedDuration: number;

  // Step details
  action?: {
    type: string;
    parameters?: Record<string, any>;
    endpoint?: string;
  };

  input?: {
    type: "text" | "number" | "select" | "file";
    label: string;
    required: boolean;
    validation?: string;
    options?: Array<{ label: string; value: any }>;
  };

  confirmation?: {
    message: string;
    type: "info" | "warning" | "critical";
    requireExplicit: boolean;
  };
}

/**
 * Recovery action interface
 */
export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  type: "retry" | "refresh" | "navigate" | "contact" | "custom";
  primary: boolean;
  icon?: string;
  style?: "primary" | "secondary" | "warning" | "danger";

  // Action details
  action?: {
    type: string;
    target?: string;
    parameters?: Record<string, any>;
  };

  // Visual properties
  loading?: boolean;
  disabled?: boolean;
  visible?: boolean;
}

/**
 * Error analytics and tracking data
 */
export interface ErrorAnalytics {
  // Error identification
  errorId: string;
  fingerprint: string;
  type: ErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;

  // Timing and frequency
  timestamp: Date;
  firstOccurrence?: Date;
  occurrenceCount: number;
  frequency: number;

  // Context information
  context: {
    url: string;
    userAgent: string;
    userId?: string;
    sessionId: string;
    deviceType: string;
    networkType: string;
  };

  // Performance impact
  performance: {
    processingTime: number;
    memoryImpact: number;
    networkImpact: number;
    userImpactDuration?: number;
  };

  // Recovery information
  recovery: {
    strategy: string;
    attempted: boolean;
    successful: boolean;
    duration?: number;
    userAction: boolean;
  };

  // User interaction
  userInteraction: {
    notified: boolean;
    dismissed: boolean;
    feedbackProvided: boolean;
    rating?: number;
    comment?: string;
  };
}

// ============================================================================
// MAIN MIDDLEWARE SYSTEM
// ============================================================================

/**
 * Main error handling middleware system
 */
export class ErrorMiddleware {
  private static instance: ErrorMiddleware;
  private configuration: MiddlewareConfiguration;
  private errorClassifier: ErrorClassifier;
  private recoveryManager: RecoveryManager;

  // Middleware components
  private contextProcessor: RequestContextProcessor;
  private errorHandler: MiddlewareErrorHandler;
  private errorReporter: ErrorReporter;
  private middlewareManager: MiddlewareManager;

  // State management
  private errorCache: Map<string, CachedError>;
  private analyticsBuffer: ErrorAnalytics[];
  private performanceMetrics: Map<string, PerformanceMetric>;

  private constructor() {
    this.configuration = this.getDefaultConfiguration();
    this.errorClassifier = ErrorClassifier.getInstance();
    this.recoveryManager = createRecoveryStrategy();

    // Initialize middleware components
    this.contextProcessor = new RequestContextProcessor(this.configuration);
    this.errorHandler = new MiddlewareErrorHandler(this.configuration);
    this.errorReporter = new ErrorReporter(this.configuration);
    this.middlewareManager = new MiddlewareManager(this.configuration);

    // Initialize state
    this.errorCache = new Map();
    this.analyticsBuffer = [];
    this.performanceMetrics = new Map();

    this.initializeDefaultComponents();
  }

  static getInstance(): ErrorMiddleware {
    if (!ErrorMiddleware.instance) {
      ErrorMiddleware.instance = new ErrorMiddleware();
    }
    return ErrorMiddleware.instance;
  }

  // ============================================================================
  // MIDDLEWARE EXECUTION
  // ============================================================================

  /**
   * Main middleware execution function for Next.js
   */
  async executeNextJSMiddleware(
    request: any,
    context: MiddlewareContext,
  ): Promise<MiddlewareResponse> {
    const startTime = Date.now();

    try {
      // Process request context
      const enhancedContext = await this.contextProcessor.processRequestContext(
        request,
        context,
      );

      // Set up error handling
      enhancedContext.errorHandlingState = {
        errorCount: 0,
        recoveryAttempts: 0,
        userNotified: false,
      };

      // Execute request with error handling
      const response = await this.executeWithErrorHandling(
        enhancedContext,
        async () => {
          if (context.next) {
            return context.next();
          }
          return { statusCode: 200, headers: {}, body: null };
        },
      );

      // Process successful response
      return await this.contextProcessor.processResponseContext(
        response,
        enhancedContext,
      );
    } catch (error) {
      // Handle the error
      return await this.handleError(error, context);
    } finally {
      // Record performance metrics
      const duration = Date.now() - startTime;
      this.recordPerformanceMetrics("middleware_execution", duration);
    }
  }

  /**
   * Middleware execution function for Express.js
   */
  executeExpressMiddleware(req: any, res: any, next: any): void {
    (async () => {
      try {
        const context = await this.createExpressContext(req, res, next);
        const response = await this.executeNextJSMiddleware(req, context);

        // Send response if not already sent
        if (!res.headersSent) {
          res.status(response.statusCode);
          res.set(response.headers);
          res.json(response.body);
        }
      } catch (error) {
        this.handleExpressError(error, req, res, next);
      }
    })();
  }

  /**
   * React Error Boundary integration
   */
  async handleReactError(
    error: Error,
    errorInfo: any,
    componentStack?: string,
  ): Promise<{
    error: any;
    analysis: ErrorAnalysis;
    recovery: RecoverySuggestion[];
    userMessage: string;
  }> {
    const context: MiddlewareContext = {
      timestamp: new Date(),
      requestId: this.generateRequestId(),
      sessionId: this.generateSessionId(),
      customData: {
        componentStack,
        errorInfo,
        source: "react_error_boundary",
      },
    };

    return await this.processError(error, context);
  }

  /**
   * TanStack Query error integration
   */
  async handleQueryError(
    error: any,
    queryKey: string[],
    queryType: "query" | "mutation",
    variables?: any,
  ): Promise<{
    error: any;
    analysis: ErrorAnalysis;
    recovery: RecoverySuggestion[];
    shouldRetry: boolean;
    retryDelay?: number;
  }> {
    const context: MiddlewareContext = {
      timestamp: new Date(),
      requestId: this.generateRequestId(),
      sessionId: this.generateSessionId(),
      customData: {
        queryKey,
        queryType,
        variables,
        source: "tanstack_query",
      },
    };

    const result = await this.processError(error, context);

    return {
      ...result,
      shouldRetry: result.analysis.userImpact.level !== "blocking",
      retryDelay:
        result.analysis.recoveryStrategy === "automatic_retry"
          ? this.calculateRetryDelay(result.analysis)
          : undefined,
    };
  }

  // ============================================================================
  // CORE ERROR PROCESSING
  // ============================================================================

  /**
   * Main error processing pipeline
   */
  private async processError(
    error: any,
    context: MiddlewareContext,
  ): Promise<{
    error: any;
    analysis: ErrorAnalysis;
    recovery: RecoverySuggestion[];
    userMessage: string;
  }> {
    const startTime = Date.now();

    try {
      // Update error handling state
      if (context.errorHandlingState) {
        context.errorHandlingState.errorCount++;
        context.errorHandlingState.lastError = await this.classifyError(
          error,
          context,
        );
      }

      // Enrich context
      await this.contextProcessor.enrichErrorContext(error, context);

      // Classify the error
      const analysis = await this.classifyError(error, context);

      // Apply error filters
      if (!this.shouldProcessError(analysis, context)) {
        return {
          error,
          analysis,
          recovery: [],
          userMessage: this.getDefaultErrorMessage(analysis),
        };
      }

      // Apply transformations
      const transformedError = await this.applyErrorTransformations(
        error,
        analysis,
        context,
      );

      // Generate recovery suggestions
      const recovery = await this.generateRecoverySuggestions(
        transformedError.analysis,
        context,
      );

      // Generate user-friendly message
      const userMessage = await this.generateUserMessage(
        transformedError.analysis,
        context,
      );

      // Attempt automatic recovery if enabled
      if (
        this.configuration.autoRecovery &&
        this.shouldAttemptAutoRecovery(transformedError.analysis, recovery)
      ) {
        await this.attemptAutoRecovery(
          transformedError.error,
          transformedError.analysis,
          context,
        );
      }

      // Report error for analytics
      if (this.configuration.enableAnalytics) {
        await this.reportError(transformedError, context);
      }

      // Record performance
      const processingTime = Date.now() - startTime;
      this.recordErrorProcessingMetrics(analysis, processingTime);

      return {
        error: transformedError.error,
        analysis: transformedError.analysis,
        recovery,
        userMessage,
      };
    } catch (processingError) {
      // Fallback error handling
      console.error("Error processing failed:", processingError);
      return {
        error,
        analysis: {
          category: ErrorCategory.UNKNOWN,
          type: ErrorType.UNKNOWN_ERROR,
          severity: ErrorSeverity.HIGH,
          confidence: 0,
          userImpact: {
            level: "disruptive",
            affectedFeatures: ["Error Processing"],
            workaroundAvailable: false,
            userActionRequired: false,
            description: "Error processing system encountered an issue",
          },
          systemImpact: {
            level: "medium",
            affectedComponents: ["Error Handler"],
            cascadePossible: false,
            dataIntegrityRisk: false,
            performanceImpact: "minimal",
          },
          recoveryStrategy: "user_retry",
          successProbability: 0.5,
          recommendedActions: ["Try the operation again"],
          preventionStrategies: [],
          analysisTimestamp: new Date(),
          analysisVersion: "1.0.0",
        },
        recovery: [],
        userMessage:
          "An error occurred while processing another error. Please try again.",
      };
    }
  }

  /**
   * Handle error with middleware response
   */
  private async handleError(
    error: any,
    context: MiddlewareContext,
  ): Promise<MiddlewareResponse> {
    const result = await this.processError(error, context);

    // Create error response
    const response: MiddlewareResponse = {
      statusCode: this.getErrorStatusCode(result.analysis),
      headers: {
        "Content-Type": "application/json",
        "X-Error-ID": result.analysis.recoveryStrategy,
        "X-Error-Category": result.analysis.category,
        "X-Error-Type": result.analysis.type,
        "X-Error-Severity": result.analysis.severity,
      },
      body: this.configuration.showUserFriendlyErrors
        ? {
            success: false,
            error: {
              id: this.generateErrorId(),
              type: result.analysis.type,
              message: result.userMessage,
              details: this.configuration.debugMode ? result.error : undefined,
              recovery:
                result.recovery.length > 0 ? result.recovery[0] : undefined,
            },
          }
        : {
            success: false,
            error: result.error,
          },
    };

    // Notify user if enabled
    if (this.configuration.enableErrorNotifications) {
      await this.notifyUser(result, context);
    }

    return response;
  }

  /**
   * Execute function with comprehensive error handling
   */
  private async executeWithErrorHandling<T>(
    context: MiddlewareContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const result = await this.processError(error, context);
      throw new MiddlewareError(result.error, result.analysis, result.recovery);
    }
  }

  // ============================================================================
  // ERROR CLASSIFICATION AND ANALYSIS
  // ============================================================================

  /**
   * Classify error with enhanced context
   */
  private async classifyError(
    error: any,
    context: MiddlewareContext,
  ): Promise<ErrorAnalysis> {
    if (!this.configuration.enableClassification) {
      // Return basic analysis if classification is disabled
      return {
        category: ErrorCategory.UNKNOWN,
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        confidence: 0.5,
        userImpact: {
          level: "annoying",
          affectedFeatures: [],
          workaroundAvailable: true,
          userActionRequired: false,
          description: "Classification is disabled",
        },
        systemImpact: {
          level: "low",
          affectedComponents: [],
          cascadePossible: false,
          dataIntegrityRisk: false,
          performanceImpact: "minimal",
        },
        recoveryStrategy: "user_retry",
        successProbability: 0.5,
        recommendedActions: ["Try again"],
        preventionStrategies: [],
        analysisTimestamp: new Date(),
        analysisVersion: "1.0.0",
      };
    }

    // Create enhanced error context for classifier
    const errorContext: ErrorContext = {
      timestamp: context.timestamp,
      component: context.customData?.component,
      action: context.customData?.action,
      userJourney: context.customData?.userJourney,
      userAgent: context.request?.userAgent,
      url: context.request?.url,
      sessionId: context.sessionId,
      fileId: context.customData?.fileId,
      jobId: context.customData?.jobId,
      deviceType: context.deviceContext?.deviceType,
      networkType: context.deviceContext?.networkType,
      batteryLevel: context.deviceContext?.batteryLevel,
      isLowPowerMode: context.deviceContext?.isLowPowerMode,
      customData: context.customData,
    };

    return classifyError(error, errorContext);
  }

  /**
   * Check if error should be processed based on filters
   */
  private shouldProcessError(
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): boolean {
    return this.configuration.errorFilters.some((filter) => {
      if (!filter.enabled) return false;

      // Check category filter
      if (
        filter.conditions.errorCategories &&
        !filter.conditions.errorCategories.includes(analysis.category)
      ) {
        return false;
      }

      // Check type filter
      if (
        filter.conditions.errorTypes &&
        !filter.conditions.errorTypes.includes(analysis.type)
      ) {
        return false;
      }

      // Check severity filter
      if (
        filter.conditions.severities &&
        !filter.conditions.severities.includes(analysis.severity)
      ) {
        return false;
      }

      // Check custom filter
      if (filter.conditions.custom) {
        return filter.conditions.custom(analysis, context);
      }

      return true;
    });
  }

  // ============================================================================
  // ERROR TRANSFORMATION
  // ============================================================================

  /**
   * Apply error transformations based on configuration
   */
  private async applyErrorTransformations(
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<{ error: any; analysis: ErrorAnalysis }> {
    let transformedError = error;
    let transformedAnalysis = analysis;

    // Sort transformers by priority
    const transformers = [...this.configuration.customTransformers].sort(
      (a, b) => a.priority - b.priority,
    );

    for (const transformer of transformers) {
      // Check if transformer applies
      const applies = await this.checkTransformerConditions(
        transformer,
        transformedError,
        transformedAnalysis,
        context,
      );

      if (applies) {
        try {
          const result = await transformer.transform(
            transformedError,
            transformedAnalysis,
            context,
          );

          transformedError = result.error;
          transformedAnalysis = result.analysis;

          // Update response if provided
          if (result.response && context.response) {
            context.response = { ...context.response, ...result.response };
          }

          // Log transformation
          this.logTransformation(transformer, analysis, result);
        } catch (transformError) {
          console.error("Error transformation failed:", transformError);
        }
      }
    }

    return { error: transformedError, analysis: transformedAnalysis };
  }

  /**
   * Check if transformer conditions are met
   */
  private async checkTransformerConditions(
    transformer: ErrorTransformer,
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<boolean> {
    // Check type conditions
    if (
      transformer.conditions.errorTypes &&
      !transformer.conditions.errorTypes.includes(analysis.type)
    ) {
      return false;
    }

    // Check category conditions
    if (
      transformer.conditions.errorCategories &&
      !transformer.conditions.errorCategories.includes(analysis.category)
    ) {
      return false;
    }

    // Check severity conditions
    if (
      transformer.conditions.severities &&
      !transformer.conditions.severities.includes(analysis.severity)
    ) {
      return false;
    }

    // Check custom conditions
    if (transformer.conditions.custom) {
      return transformer.conditions.custom(error, context);
    }

    return true;
  }

  // ============================================================================
  // RECOVERY SYSTEM INTEGRATION
  // ============================================================================

  /**
   * Generate recovery suggestions based on error analysis
   */
  private async generateRecoverySuggestions(
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<RecoverySuggestion[]> {
    if (!this.configuration.enableRecovery) {
      return [];
    }

    const suggestions: RecoverySuggestion[] = [];

    // Generate primary recovery suggestion
    const primarySuggestion = await this.createPrimaryRecoverySuggestion(
      analysis,
      context,
    );
    if (primarySuggestion) {
      suggestions.push(primarySuggestion);
    }

    // Generate secondary suggestions
    const secondarySuggestions = await this.createSecondaryRecoverySuggestions(
      analysis,
      context,
    );
    suggestions.push(...secondarySuggestions);

    return suggestions;
  }

  /**
   * Create primary recovery suggestion
   */
  private async createPrimaryRecoverySuggestion(
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<RecoverySuggestion | null> {
    switch (analysis.recoveryStrategy) {
      case "automatic_retry":
        return {
          id: "auto-retry",
          type: "automatic",
          title: "Retry Automatically",
          description: "The system will automatically retry the operation",
          steps: [
            {
              id: "retry-step",
              title: "Retrying operation",
              description: "Please wait while we retry the operation",
              type: "action",
              required: true,
              automated: true,
              estimatedDuration: 2000,
            },
          ],
          successProbability: analysis.successProbability,
          estimatedTime: 3000,
          requiredUserAction: false,
          allowSkip: true,
          primaryAction: {
            id: "retry-action",
            label: "Retry Now",
            description: "Retry the operation immediately",
            type: "retry",
            primary: true,
          },
          context: {
            affectedFeatures: analysis.userImpact.affectedFeatures,
            workaroundAvailable: analysis.userImpact.workaroundAvailable,
            severity: analysis.severity,
          },
        };

      case "user_retry":
        return {
          id: "user-retry",
          type: "manual",
          title: "Try Again",
          description: "Please try the operation again",
          steps: [
            {
              id: "manual-retry-step",
              title: "Retry operation",
              description: "Click the button to retry the operation",
              type: "action",
              required: true,
              automated: false,
              estimatedDuration: 1000,
            },
          ],
          successProbability: analysis.successProbability,
          estimatedTime: 1000,
          requiredUserAction: true,
          allowSkip: false,
          primaryAction: {
            id: "manual-retry",
            label: "Try Again",
            description: "Retry the operation",
            type: "retry",
            primary: true,
          },
          context: {
            affectedFeatures: analysis.userImpact.affectedFeatures,
            workaroundAvailable: analysis.userImpact.workaroundAvailable,
            severity: analysis.severity,
          },
        };

      case "user_action_required":
        return {
          id: "user-action",
          type: "guided",
          title: "Action Required",
          description: "Please take the following action to resolve this issue",
          steps: analysis.recommendedActions.map((action, index) => ({
            id: `action-${index}`,
            title: action,
            description: action,
            type: "information" as const,
            required: true,
            automated: false,
            estimatedDuration: 5000,
          })),
          successProbability: 1.0,
          estimatedTime: 10000,
          requiredUserAction: true,
          allowSkip: false,
          primaryAction: {
            id: "complete-action",
            label: "Complete Action",
            description: "Complete the required action",
            type: "custom",
            primary: true,
          },
          context: {
            affectedFeatures: analysis.userImpact.affectedFeatures,
            workaroundAvailable: false,
            severity: analysis.severity,
          },
        };

      default:
        return null;
    }
  }

  /**
   * Create secondary recovery suggestions
   */
  private async createSecondaryRecoverySuggestions(
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    // Always add refresh suggestion for web applications
    if (typeof window !== "undefined") {
      suggestions.push({
        id: "refresh-page",
        type: "manual",
        title: "Refresh Page",
        description: "Refresh the page to clear temporary issues",
        steps: [
          {
            id: "refresh-step",
            title: "Refresh page",
            description: "Click to refresh the current page",
            type: "action",
            required: true,
            automated: true,
            estimatedDuration: 2000,
          },
        ],
        successProbability: 0.6,
        estimatedTime: 3000,
        requiredUserAction: true,
        allowSkip: true,
        primaryAction: {
          id: "refresh-action",
          label: "Refresh Page",
          description: "Refresh the current page",
          type: "refresh",
          primary: false,
          style: "secondary",
        },
        context: {
          affectedFeatures: [],
          workaroundAvailable: true,
          severity: "low",
        },
      });
    }

    // Add contact support suggestion for critical errors
    if (analysis.severity === ErrorSeverity.CRITICAL) {
      suggestions.push({
        id: "contact-support",
        type: "escalated",
        title: "Contact Support",
        description: "Get help from our support team",
        steps: [
          {
            id: "support-step",
            title: "Contact support",
            description: "Reach out to our support team for assistance",
            type: "information",
            required: false,
            automated: false,
            estimatedDuration: 60000,
          },
        ],
        successProbability: 0.9,
        estimatedTime: 300000,
        requiredUserAction: true,
        allowSkip: true,
        primaryAction: {
          id: "contact-support-action",
          label: "Contact Support",
          description: "Open support ticket",
          type: "contact",
          primary: false,
          style: "secondary",
        },
        context: {
          affectedFeatures: [],
          workaroundAvailable: false,
          severity: analysis.severity,
        },
      });
    }

    return suggestions;
  }

  /**
   * Check if automatic recovery should be attempted
   */
  private shouldAttemptAutoRecovery(
    analysis: ErrorAnalysis,
    recovery: RecoverySuggestion[],
  ): boolean {
    // Only attempt auto-recovery for specific strategies
    const autoRecoveryStrategies = ["automatic_retry", "exponential_backoff"];
    return autoRecoveryStrategies.includes(analysis.recoveryStrategy);
  }

  /**
   * Attempt automatic recovery
   */
  private async attemptAutoRecovery(
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<void> {
    if (!context.errorHandlingState) return;

    const maxAttempts = this.configuration.maxRecoveryAttempts;
    const currentAttempts = context.errorHandlingState.recoveryAttempts;

    if (currentAttempts >= maxAttempts) {
      return;
    }

    context.errorHandlingState.recoveryAttempts++;

    try {
      const recoveryContext: RecoveryExecutionContext = {
        originalError: error,
        errorAnalysis: analysis,
        errorContext: {
          timestamp: context.timestamp,
          sessionId: context.sessionId,
          customData: context.customData,
        },
        recoveryId: this.generateRecoveryId(),
        attemptCount: currentAttempts + 1,
        maxAttempts,
        startTime: new Date(),
        timeout: 30000,
        priority: 2,
        previousAttempts: [],
      };

      // Create and execute recovery plan
      const recoveryPlan = await this.recoveryManager.createRecoveryPlan(
        analysis,
        recoveryContext.errorContext,
      );

      const result = await this.recoveryManager.executeRecoveryPlan(
        recoveryPlan,
        error,
        recoveryContext.errorContext,
      );

      if (result.success) {
        console.log("Automatic recovery successful:", result.message);
      } else {
        console.warn("Automatic recovery failed:", result.message);
      }
    } catch (recoveryError) {
      console.error("Automatic recovery attempt failed:", recoveryError);
    }
  }

  // ============================================================================
  // USER EXPERIENCE
  // ============================================================================

  /**
   * Generate user-friendly error message
   */
  private async generateUserMessage(
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<string> {
    if (!this.configuration.showUserFriendlyErrors) {
      return analysis.userImpact.description;
    }

    // Use custom message transformers if available
    for (const transformer of this.configuration.customTransformers) {
      if (transformer.conditions.custom) {
        const applies = transformer.conditions.custom(analysis, context);
        if (applies) {
          try {
            const result = await transformer.transform(
              new Error(analysis.userImpact.description),
              analysis,
              context,
            );
            if (result.userMessage) {
              return result.userMessage;
            }
          } catch (error) {
            console.error("Custom message transformer failed:", error);
          }
        }
      }
    }

    // Generate default user message
    return this.generateDefaultUserMessage(analysis, context);
  }

  /**
   * Generate default user-friendly message
   */
  private generateDefaultUserMessage(
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): string {
    const baseMessage = analysis.userImpact.description;

    // Add context-specific information
    if (analysis.userImpact.affectedFeatures.length > 0) {
      const features = analysis.userImpact.affectedFeatures
        .slice(0, 3)
        .join(", ");
      return `${baseMessage} This affects: ${features}.`;
    }

    // Add recovery hints
    if (analysis.userImpact.workaroundAvailable) {
      return `${baseMessage} You may be able to continue using other features.`;
    }

    return baseMessage;
  }

  /**
   * Get default error message
   */
  private getDefaultErrorMessage(analysis: ErrorAnalysis): string {
    switch (analysis.category) {
      case ErrorCategory.NETWORK:
        return "Connection problem. Please check your internet connection and try again.";
      case ErrorCategory.API:
        return "Service temporarily unavailable. Please try again in a moment.";
      case ErrorCategory.AUTHENTICATION:
        return "Authentication problem. Please log in again.";
      case ErrorCategory.FILE_SYSTEM:
        return "File operation failed. Please check your file and try again.";
      case ErrorCategory.TRANSCRIPTION:
        return "Transcription service temporarily unavailable. Please try again later.";
      default:
        return "An error occurred. Please try again or contact support if the problem persists.";
    }
  }

  /**
   * Get appropriate HTTP status code for error
   */
  private getErrorStatusCode(analysis: ErrorAnalysis): number {
    switch (analysis.category) {
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.NETWORK:
        return 503;
      case ErrorCategory.API:
        return 502;
      case ErrorCategory.FILE_SYSTEM:
        if (analysis.type === ErrorType.FILE_TOO_LARGE) return 413;
        if (analysis.type === ErrorType.FILE_NOT_FOUND) return 404;
        return 400;
      default:
        return 500;
    }
  }

  /**
   * Calculate retry delay for automatic recovery
   */
  private calculateRetryDelay(analysis: ErrorAnalysis): number {
    // Base delay with exponential backoff
    const baseDelay = 1000;
    const multiplier = 2;
    const maxDelay = 30000;

    let delay = baseDelay;
    const attemptCount = analysis.frequency || 1;

    for (let i = 1; i < attemptCount; i++) {
      delay *= multiplier;
      if (delay > maxDelay) break;
    }

    // Add jitter
    delay += Math.random() * 1000;

    return Math.min(delay, maxDelay);
  }

  /**
   * Notify user of error
   */
  private async notifyUser(
    result: {
      error: any;
      analysis: ErrorAnalysis;
      recovery: RecoverySuggestion[];
      userMessage: string;
    },
    context: MiddlewareContext,
  ): Promise<void> {
    if (context.errorHandlingState?.userNotified) return;

    // Mark user as notified
    if (context.errorHandlingState) {
      context.errorHandlingState.userNotified = true;
    }

    // Here you would integrate with your notification system
    // For example: toast notifications, in-app messages, etc.
    console.log("User notification:", result.userMessage);
  }

  // ============================================================================
  // ANALYTICS AND MONITORING
  // ============================================================================

  /**
   * Report error for analytics
   */
  private async reportError(
    result: {
      error: any;
      analysis: ErrorAnalysis;
      userMessage: string;
    },
    context: MiddlewareContext,
  ): Promise<void> {
    const analytics: ErrorAnalytics = {
      errorId: this.generateErrorId(),
      fingerprint: this.generateErrorFingerprint(result.error, result.analysis),
      type: result.analysis.type,
      category: result.analysis.category,
      severity: result.analysis.severity,
      timestamp: new Date(),
      occurrenceCount: 1,
      frequency: 0,
      context: {
        url: context.request?.url || "unknown",
        userAgent: context.request?.userAgent || "unknown",
        userId: context.userId,
        sessionId: context.sessionId,
        deviceType: context.deviceContext?.deviceType || "unknown",
        networkType: context.deviceContext?.networkType || "unknown",
      },
      performance: {
        processingTime: Date.now() - context.timestamp.getTime(),
        memoryImpact: 0, // Would be calculated from performance context
        networkImpact: 0, // Would be calculated from performance context
      },
      recovery: {
        strategy: result.analysis.recoveryStrategy,
        attempted: context.errorHandlingState?.recoveryAttempts > 0,
        successful: false, // Would be updated based on actual recovery
        userAction: result.analysis.userImpact.userActionRequired,
      },
      userInteraction: {
        notified: context.errorHandlingState?.userNotified || false,
        dismissed: false,
        feedbackProvided: false,
      },
    };

    // Add to analytics buffer
    this.analyticsBuffer.push(analytics);

    // Send to analytics endpoint if configured
    if (this.configuration.analyticsEndpoint) {
      await this.sendAnalytics(analytics);
    }
  }

  /**
   * Send analytics data
   */
  private async sendAnalytics(analytics: ErrorAnalytics): Promise<void> {
    try {
      await fetch(this.configuration.analyticsEndpoint!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analytics),
      });
    } catch (error) {
      console.error("Failed to send analytics:", error);
    }
  }

  /**
   * Record performance metrics
   */
  private recordPerformanceMetrics(operation: string, duration: number): void {
    const key = `performance:${operation}`;
    const existing = this.performanceMetrics.get(key) || {
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      averageDuration: 0,
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    existing.averageDuration = existing.totalDuration / existing.count;

    this.performanceMetrics.set(key, existing);
  }

  /**
   * Record error processing metrics
   */
  private recordErrorProcessingMetrics(
    analysis: ErrorAnalysis,
    processingTime: number,
  ): void {
    const key = `error_processing:${analysis.category}:${analysis.type}`;
    this.recordPerformanceMetrics(key, processingTime);

    // Update error cache
    const cacheKey = this.generateErrorFingerprint(analysis, analysis);
    const cached = this.errorCache.get(cacheKey);
    if (cached) {
      cached.count++;
      cached.lastSeen = new Date();
      cached.totalProcessingTime += processingTime;
    } else {
      this.errorCache.set(cacheKey, {
        error: analysis,
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        totalProcessingTime: processingTime,
      });
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    if (typeof window !== "undefined") {
      // Try to get existing session ID from localStorage
      let sessionId = sessionStorage.getItem("error_middleware_session_id");
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem("error_middleware_session_id", sessionId);
      }
      return sessionId;
    }
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate error fingerprint
   */
  private generateErrorFingerprint(
    error: any,
    analysis: ErrorAnalysis,
  ): string {
    const message = error?.message || String(error);
    const stack = error?.stack || "";
    const category = analysis.category;
    const type = analysis.type;

    // Create hash from error characteristics
    const combined = `${category}-${type}-${message.substring(0, 100)}-${stack.substring(0, 100)}`;
    return this.simpleHash(combined);
  }

  /**
   * Generate recovery ID
   */
  private generateRecoveryId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple hash function
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
   * Create Express context from request/response
   */
  private async createExpressContext(
    req: any,
    res: any,
    next: any,
  ): Promise<MiddlewareContext> {
    return {
      request: {
        url: req.url,
        method: req.method,
        headers: req.headers,
        query: req.query,
        params: req.params,
        body: req.body,
        startTime: Date.now(),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        referer: req.get("Referer"),
        origin: req.get("Origin"),
      },
      response: {
        statusCode: 200,
        headers: {},
      },
      next,
      timestamp: new Date(),
      requestId: this.generateRequestId(),
      sessionId: this.generateSessionId(),
    };
  }

  /**
   * Handle Express error
   */
  private handleExpressError(error: any, req: any, res: any, next: any): void {
    (async () => {
      const context = await this.createExpressContext(req, res, next);
      const response = await this.handleError(error, context);

      if (!res.headersSent) {
        res.status(response.statusCode);
        res.set(response.headers);
        res.json(response.body);
      }
    })();
  }

  /**
   * Log transformation
   */
  private logTransformation(
    transformer: ErrorTransformer,
    originalAnalysis: ErrorAnalysis,
    result: any,
  ): void {
    if (this.configuration.debugMode) {
      console.log("Error transformation applied:", {
        transformer: transformer.id,
        originalType: originalAnalysis.type,
        newType: result.analysis.type,
        duration: Date.now() - Date.now(),
      });
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): MiddlewareConfiguration {
    return {
      enabled: true,
      debugMode: process.env.NODE_ENV === "development",
      silentMode: false,
      logLevel: "error",
      enableClassification: true,
      enableRecovery: true,
      autoRecovery: true,
      maxRecoveryAttempts: 3,
      showUserFriendlyErrors: true,
      enableErrorNotifications: true,
      allowUserFeedback: true,
      customizeErrorMessages: true,
      enablePerformanceMonitoring: true,
      maxErrorProcessingTime: 5000,
      enableErrorCaching: true,
      errorCacheMaxAge: 300000, // 5 minutes
      enableMobileOptimizations: true,
      mobilePerformanceMode: false,
      batteryOptimizations: true,
      networkOptimizations: true,
      enableAnalytics: true,
      analyticsEndpoint: process.env.ERROR_ANALYTICS_ENDPOINT,
      enableRealTimeMonitoring: false,
      monitoringEndpoint: process.env.ERROR_MONITORING_ENDPOINT,
      tanstackQueryIntegration: true,
      reactErrorBoundaryIntegration: true,
      apiMiddlewareIntegration: true,
      errorFilters: [],
      routingRules: [],
      customTransformers: [],
      customValidators: [],
    };
  }

  /**
   * Initialize default components
   */
  private initializeDefaultComponents(): void {
    // Initialize default error filters
    this.configuration.errorFilters = [
      {
        id: "exclude-low-severity",
        name: "Exclude Low Severity Errors",
        enabled: true,
        priority: 1,
        conditions: {
          severities: [ErrorSeverity.LOW, ErrorSeverity.INFO],
        },
        action: "exclude",
      },
    ];

    // Initialize default routing rules
    this.configuration.routingRules = [
      {
        id: "critical-errors",
        name: "Critical Error Routing",
        enabled: true,
        priority: 1,
        conditions: {
          severities: [ErrorSeverity.CRITICAL],
        },
        target: {
          type: "endpoint",
          destination: "/api/errors/critical",
          method: "POST",
        },
        async: true,
        retryAttempts: 3,
        retryDelay: 1000,
      },
    ];

    // Initialize default validators
    this.configuration.customValidators = [
      {
        id: "basic-validation",
        name: "Basic Error Validation",
        description: "Basic validation for all errors",
        priority: 1,
        validate: async (error, analysis, context) => {
          return {
            valid: true,
          };
        },
        categories: Object.values(ErrorCategory) as ErrorCategory[],
        types: Object.values(ErrorType) as ErrorType[],
      },
    ];
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Configure middleware system
   */
  configure(config: Partial<MiddlewareConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    this.contextProcessor.updateConfiguration(this.configuration);
    this.errorHandler.updateConfiguration(this.configuration);
    this.errorReporter.updateConfiguration(this.configuration);
    this.middlewareManager.updateConfiguration(this.configuration);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): MiddlewareConfiguration {
    return { ...this.configuration };
  }

  /**
   * Get analytics data
   */
  getAnalytics(): {
    analytics: ErrorAnalytics[];
    performance: Record<string, any>;
    cache: Record<string, any>;
  } {
    return {
      analytics: [...this.analyticsBuffer],
      performance: Object.fromEntries(this.performanceMetrics),
      cache: Object.fromEntries(
        Array.from(this.errorCache.entries()).map(([key, value]) => [
          key,
          {
            count: value.count,
            firstSeen: value.firstSeen,
            lastSeen: value.lastSeen,
            averageProcessingTime: value.totalProcessingTime / value.count,
          },
        ]),
      ),
    };
  }

  /**
   * Clear analytics data
   */
  clearAnalytics(): void {
    this.analyticsBuffer = [];
    this.errorCache.clear();
    this.performanceMetrics.clear();
  }

  /**
   * Get middleware statistics
   */
  getStatistics(): {
    totalErrorsProcessed: number;
    averageProcessingTime: number;
    recoverySuccessRate: number;
    userNotificationRate: number;
  } {
    const analytics = this.analyticsBuffer;
    const totalErrorsProcessed = analytics.length;
    const recoverySuccessRate =
      analytics.filter((a) => a.recovery.successful).length /
      Math.max(totalErrorsProcessed, 1);
    const userNotificationRate =
      analytics.filter((a) => a.userInteraction.notified).length /
      Math.max(totalErrorsProcessed, 1);

    const processingTimes = Array.from(this.performanceMetrics.values())
      .filter((m) => m.key?.startsWith("error_processing"))
      .map((m) => m.averageDuration);
    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) /
          processingTimes.length
        : 0;

    return {
      totalErrorsProcessed,
      averageProcessingTime,
      recoverySuccessRate,
      userNotificationRate,
    };
  }
}

// ============================================================================
// SUPPORTING INTERFACES AND CLASSES
// ============================================================================

/**
 * Middleware error class
 */
export class MiddlewareError extends Error {
  public readonly analysis: ErrorAnalysis;
  public readonly recovery: RecoverySuggestion[];

  constructor(
    message: string,
    analysis: ErrorAnalysis,
    recovery: RecoverySuggestion[],
  ) {
    super(message);
    this.name = "MiddlewareError";
    this.analysis = analysis;
    this.recovery = recovery;
  }
}

/**
 * Cached error information
 */
interface CachedError {
  error: ErrorAnalysis;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  totalProcessingTime: number;
}

/**
 * Performance metric information
 */
interface PerformanceMetric {
  key: string;
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  averageDuration: number;
}

// ============================================================================
// UTILITY CLASSES (Forward declarations - implementations below)
// ============================================================================

// ============================================================================
// REQUEST CONTEXT PROCESSOR
// ============================================================================

/**
 * Request Context Processor
 *
 * Handles comprehensive context processing for requests, responses, and errors.
 * Enriches context with device information, performance metrics, and user data.
 */
export class RequestContextProcessor {
  private performanceMonitor: PerformanceMonitor;
  private deviceDetector: DeviceDetector;
  private mobileOptimizations: MobileOptimizations;

  constructor(private config: MiddlewareConfiguration) {
    this.performanceMonitor = new PerformanceMonitor(config);
    this.deviceDetector = new DeviceDetector();
    this.mobileOptimizations = new MobileOptimizations(config);
  }

  /**
   * Process and enrich request context
   */
  async processRequestContext(
    request: any,
    context: MiddlewareContext,
  ): Promise<MiddlewareContext> {
    const enhancedContext = { ...context };

    // Start performance monitoring
    this.performanceMonitor.startRequestMonitoring();

    // Process request data
    if (request) {
      enhancedContext.request = await this.processRequest(request, context);
    }

    // Detect device context
    enhancedContext.deviceContext =
      await this.deviceDetector.detectDeviceContext(request, context);

    // Initialize performance context
    enhancedContext.performanceContext =
      this.performanceMonitor.getPerformanceContext();

    // Apply mobile optimizations if enabled
    if (
      this.config.enableMobileOptimizations &&
      enhancedContext.deviceContext
    ) {
      await this.mobileOptimizations.optimizeForDevice(enhancedContext);
    }

    // Enrich with user-specific context
    await this.enrichUserContext(enhancedContext);

    // Add feature flags based on context
    enhancedContext.featureFlags = this.determineFeatureFlags(enhancedContext);

    return enhancedContext;
  }

  /**
   * Process and enrich response context
   */
  async processResponseContext(
    response: MiddlewareResponse,
    context: MiddlewareContext,
  ): Promise<MiddlewareResponse> {
    const enhancedResponse = { ...response };

    // Calculate response timing
    if (context.performanceContext) {
      enhancedResponse.headers["X-Response-Time"] = String(
        Date.now() - context.performanceContext.requestStartTime,
      );
    }

    // Add device context headers
    if (context.deviceContext) {
      enhancedResponse.headers["X-Device-Type"] =
        context.deviceContext.deviceType;
      enhancedResponse.headers["X-Mobile-Optimized"] = String(
        this.config.enableMobileOptimizations &&
          context.deviceContext.deviceType !== "desktop",
      );
    }

    // Add error handling headers
    if (context.errorHandlingState) {
      enhancedResponse.headers["X-Errors-Processed"] = String(
        context.errorHandlingState.errorCount,
      );
      enhancedResponse.headers["X-Recovery-Attempts"] = String(
        context.errorHandlingState.recoveryAttempts,
      );
    }

    // Stop performance monitoring
    const performanceData = this.performanceMonitor.stopRequestMonitoring();
    if (performanceData && this.config.enablePerformanceMonitoring) {
      enhancedResponse.headers["X-Performance-Metrics"] =
        JSON.stringify(performanceData);
    }

    return enhancedResponse;
  }

  /**
   * Enrich error context with additional information
   */
  async enrichErrorContext(
    error: any,
    context: MiddlewareContext,
  ): Promise<void> {
    // Update performance context with error information
    if (context.performanceContext) {
      context.performanceContext.errorHandlingOverhead =
        Date.now() - context.timestamp.getTime();
    }

    // Add error stack trace analysis
    if (error?.stack && this.config.debugMode) {
      context.customData = {
        ...context.customData,
        stackAnalysis: this.analyzeStackTrace(error.stack),
        errorSource: this.determineErrorSource(error),
      };
    }

    // Add mobile-specific error context
    if (context.deviceContext) {
      context.customData = {
        ...context.customData,
        mobileContext: {
          devicePerformanceClass: context.deviceContext.deviceClass,
          batteryLevel: context.deviceContext.batteryLevel,
          networkQuality: context.deviceContext.networkStrength,
          memoryConstraints: context.deviceContext.memoryConstraints,
        },
      };
    }

    // Add application state context
    await this.addApplicationStateContext(error, context);

    // Add user journey context
    this.addUserJourneyContext(error, context);
  }

  /**
   * Process request data and extract relevant information
   */
  private async processRequest(
    request: any,
    context: MiddlewareContext,
  ): Promise<MiddlewareRequest> {
    const processedRequest: MiddlewareRequest = {
      url: request.url || "",
      method: request.method || "GET",
      headers: this.normalizeHeaders(request.headers),
      query: request.query || {},
      params: request.params || {},
      body: request.body,
      startTime: Date.now(),
      ip: this.extractClientIP(request),
      userAgent:
        request.headers?.["user-agent"] || request.headers?.["User-Agent"],
      referer: request.headers?.referer || request.headers?.Referer,
      origin: request.headers?.origin || request.headers?.Origin,
    };

    // Extract authentication information
    processedRequest.authenticated = this.checkAuthentication(request);
    processedRequest.permissions = this.extractPermissions(request);

    // Extract mobile-specific data
    processedRequest.mobileData = this.extractMobileData(request);

    // Validate request data
    await this.validateRequest(processedRequest);

    return processedRequest;
  }

  /**
   * Enrich context with user-specific information
   */
  private async enrichUserContext(context: MiddlewareContext): Promise<void> {
    // Extract user ID from various sources
    context.userId = this.extractUserId(context);

    // Add user preferences if available
    if (context.userId) {
      context.customData = {
        ...context.customData,
        userPreferences: await this.getUserPreferences(context.userId),
      };
    }

    // Add user session information
    context.customData = {
      ...context.customData,
      sessionInfo: this.getSessionInfo(context),
    };
  }

  /**
   * Determine feature flags based on context
   */
  private determineFeatureFlags(
    context: MiddlewareContext,
  ): Record<string, boolean> {
    const flags: Record<string, boolean> = {};

    // Mobile-specific flags
    if (context.deviceContext) {
      flags.mobileOptimizations = this.config.enableMobileOptimizations;
      flags.touchInterface = context.deviceContext.capabilities.touch;
      flags.geolocationAvailable =
        context.deviceContext.capabilities.geolocation;
      flags.cameraAvailable = context.deviceContext.capabilities.camera;
      flags.microphoneAvailable = context.deviceContext.capabilities.microphone;
    }

    // Performance-based flags
    if (context.deviceContext) {
      flags.reducedAnimations = context.deviceContext.deviceClass === "low";
      flags.compressedImages = context.deviceContext.memoryConstraints;
      flags.optimizedNetwork = context.deviceContext.networkType === "cellular";
    }

    // Error handling flags
    flags.errorRecovery = this.config.enableRecovery;
    flags.errorAnalytics = this.config.enableAnalytics;
    flags.errorNotifications = this.config.enableErrorNotifications;

    return flags;
  }

  /**
   * Analyze error stack trace for debugging
   */
  private analyzeStackTrace(stack: string): any {
    if (!stack) return null;

    const lines = stack.split("\n");
    const frames = lines
      .slice(1)
      .map((line, index) => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            index,
            function: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4]),
          };
        }
        return null;
      })
      .filter(Boolean);

    return {
      totalFrames: frames.length,
      frames: frames.slice(0, 10), // Limit to first 10 frames
      firstAppFrame: frames.find(
        (frame) =>
          frame &&
          (frame.file.includes("/src/") || frame.file.includes("/app/")),
      ),
    };
  }

  /**
   * Determine error source category
   */
  private determineErrorSource(error: any): string {
    if (error?.name?.includes("NetworkError")) return "network";
    if (error?.name?.includes("TypeError")) return "type";
    if (error?.name?.includes("ReferenceError")) return "reference";
    if (error?.name?.includes("SyntaxError")) return "syntax";
    if (error?.name?.includes("RangeError")) return "range";
    if (error?.message?.includes("fetch")) return "api";
    if (error?.message?.includes("database")) return "database";
    if (error?.message?.includes("file")) return "filesystem";
    return "unknown";
  }

  /**
   * Add application state context
   */
  private async addApplicationStateContext(
    error: any,
    context: MiddlewareContext,
  ): Promise<void> {
    // Add memory usage information
    if (typeof window !== "undefined" && "memory" in performance) {
      const memory = (performance as any).memory;
      context.customData = {
        ...context.customData,
        memoryUsage: {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        },
      };
    }

    // Add active features information
    context.customData = {
      ...context.customData,
      activeFeatures: this.getActiveFeatures(context),
      applicationState: this.getApplicationState(),
    };
  }

  /**
   * Add user journey context
   */
  private addUserJourneyContext(error: any, context: MiddlewareContext): void {
    // Get current page/feature
    const currentFeature = this.determineCurrentFeature(context);

    // Get user journey stage
    const journeyStage = this.determineJourneyStage(context);

    context.customData = {
      ...context.customData,
      userJourney: {
        currentFeature,
        stage: journeyStage,
        previousFeatures: this.getPreviousFeatures(),
        timeInFeature: this.getTimeInCurrentFeature(),
      },
    };
  }

  /**
   * Normalize HTTP headers
   */
  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (typeof headers?.forEach === "function") {
      // Headers object (like in fetch)
      headers.forEach((value: string, key: string) => {
        normalized[key.toLowerCase()] = value;
      });
    } else if (typeof headers === "object") {
      // Plain object
      for (const [key, value] of Object.entries(headers)) {
        normalized[key.toLowerCase()] = String(value);
      }
    }

    return normalized;
  }

  /**
   * Extract client IP address
   */
  private extractClientIP(request: any): string {
    return (
      request?.ip ||
      request?.headers?.["x-forwarded-for"] ||
      request?.headers?.["x-real-ip"] ||
      request?.connection?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Check if request is authenticated
   */
  private checkAuthentication(request: any): boolean {
    // Check for Authorization header
    const authHeader =
      request?.headers?.authorization || request?.headers?.Authorization;
    if (authHeader) return true;

    // Check for session cookie
    const sessionCookie = request?.headers?.cookie || request?.headers?.Cookie;
    if (sessionCookie && sessionCookie.includes("session")) return true;

    // Check for API key
    const apiKey = request?.headers?.["x-api-key"] || request?.query?.apiKey;
    if (apiKey) return true;

    return false;
  }

  /**
   * Extract user permissions
   */
  private extractPermissions(request: any): string[] {
    // This would integrate with your authentication system
    // For now, return empty array
    return [];
  }

  /**
   * Extract mobile-specific request data
   */
  private extractMobileData(request: any): MiddlewareRequest["mobileData"] {
    return {
      appVersion: request?.headers?.["x-app-version"],
      deviceType: request?.headers?.["x-device-type"],
      networkType: request?.headers?.["x-network-type"],
      batteryLevel: request?.headers?.["x-battery-level"]
        ? parseFloat(request.headers["x-battery-level"])
        : undefined,
    };
  }

  /**
   * Validate request data
   */
  private async validateRequest(request: MiddlewareRequest): Promise<void> {
    // Basic validation
    if (!request.url) {
      throw new Error("Request URL is required");
    }

    if (!request.method) {
      throw new Error("Request method is required");
    }

    // Additional validation based on configuration
    if (this.config.customValidators) {
      for (const validator of this.config.customValidators) {
        const result = await validator.validate(
          new Error("Request validation"),
          {
            category: ErrorCategory.VALIDATION,
            type: ErrorType.INPUT_VALIDATION,
            severity: ErrorSeverity.LOW,
            confidence: 1,
            userImpact: {
              level: "minimal",
              affectedFeatures: [],
              workaroundAvailable: true,
              userActionRequired: false,
              description: "Request validation",
            },
            systemImpact: {
              level: "low",
              affectedComponents: [],
              cascadePossible: false,
              dataIntegrityRisk: false,
              performanceImpact: "minimal",
            },
            recoveryStrategy: "user_input_required",
            successProbability: 1,
            recommendedActions: [],
            preventionStrategies: [],
            analysisTimestamp: new Date(),
            analysisVersion: "1.0.0",
          },
          {
            request,
            timestamp: new Date(),
            sessionId: "",
          } as MiddlewareContext,
        );

        if (!result.valid) {
          throw new Error(
            `Request validation failed: ${result.errors?.join(", ")}`,
          );
        }
      }
    }
  }

  /**
   * Extract user ID from various sources
   */
  private extractUserId(context: MiddlewareContext): string | undefined {
    // Check request context
    if (context.request?.mobileData?.appVersion) {
      // Mobile app user
      return context.request.headers["x-user-id"];
    }

    // Check authentication headers
    if (context.request?.headers?.authorization) {
      // Extract from JWT or other token
      return this.extractUserIdFromToken(context.request.headers.authorization);
    }

    // Check session
    if (typeof window !== "undefined") {
      return localStorage.getItem("userId") || undefined;
    }

    return undefined;
  }

  /**
   * Extract user ID from authentication token
   */
  private extractUserIdFromToken(token: string): string | undefined {
    try {
      // This would implement JWT parsing or other token extraction logic
      // For now, return undefined
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<any> {
    // This would fetch user preferences from your database or API
    return {
      errorNotifications: true,
      autoRecovery: true,
      debugMode: false,
    };
  }

  /**
   * Get session information
   */
  private getSessionInfo(context: MiddlewareContext): any {
    return {
      sessionId: context.sessionId,
      startTime: new Date(),
      duration: Date.now() - context.timestamp.getTime(),
      deviceType: context.deviceContext?.deviceType,
      networkType: context.deviceContext?.networkType,
    };
  }

  /**
   * Get active features
   */
  private getActiveFeatures(context: MiddlewareContext): string[] {
    const features: string[] = [];

    // Add features based on URL
    if (context.request?.url) {
      if (context.request.url.includes("/transcribe")) {
        features.push("transcription");
      }
      if (context.request.url.includes("/upload")) {
        features.push("file_upload");
      }
      if (context.request.url.includes("/progress")) {
        features.push("progress_tracking");
      }
    }

    // Add features based on context
    if (context.deviceContext?.capabilities.camera) {
      features.push("camera");
    }
    if (context.deviceContext?.capabilities.microphone) {
      features.push("microphone");
    }

    return features;
  }

  /**
   * Get application state
   */
  private getApplicationState(): any {
    if (typeof window !== "undefined") {
      return {
        online: navigator.onLine,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        platform: navigator.platform,
      };
    }

    return {
      online: true,
      platform: "server",
    };
  }

  /**
   * Determine current feature
   */
  private determineCurrentFeature(context: MiddlewareContext): string {
    const url = context.request?.url || "";

    if (url.includes("/transcribe")) return "transcription";
    if (url.includes("/upload")) return "file_upload";
    if (url.includes("/progress")) return "progress_tracking";
    if (url.includes("/health")) return "health_check";

    return "unknown";
  }

  /**
   * Determine user journey stage
   */
  private determineJourneyStage(context: MiddlewareContext): string {
    const activeFeatures = this.getActiveFeatures(context);

    if (activeFeatures.includes("file_upload")) return "uploading";
    if (activeFeatures.includes("transcription")) return "processing";
    if (activeFeatures.includes("progress_tracking")) return "monitoring";

    return "browsing";
  }

  /**
   * Get previous features from session history
   */
  private getPreviousFeatures(): string[] {
    if (typeof window !== "undefined") {
      const history = sessionStorage.getItem("feature_history");
      return history ? JSON.parse(history) : [];
    }
    return [];
  }

  /**
   * Get time in current feature
   */
  private getTimeInCurrentFeature(): number {
    if (typeof window !== "undefined") {
      const featureStartTime = sessionStorage.getItem("feature_start_time");
      if (featureStartTime) {
        return Date.now() - parseInt(featureStartTime);
      }
    }
    return 0;
  }

  updateConfiguration(config: MiddlewareConfiguration): void {
    this.config = config;
    this.performanceMonitor.updateConfiguration(config);
    this.mobileOptimizations.updateConfiguration(config);
  }
}

export class MiddlewareErrorHandler {
  constructor(private config: MiddlewareConfiguration) {}

  updateConfiguration(config: MiddlewareConfiguration): void {
    this.config = config;
  }
}

// ============================================================================
// CENTRALIZED ERROR HANDLER
// ============================================================================

/**
 * Centralized error handler for processing, transforming, and routing errors
 */
export class MiddlewareErrorHandler {
  private errorTransformers: Map<string, ErrorTransformer> = new Map();
  private errorFilters: Map<string, ErrorFilter> = new Map();
  private errorValidators: Map<string, ErrorValidator> = new Map();
  private errorRouting: Map<string, ErrorRoutingRule> = new Map();

  constructor(private config: MiddlewareConfiguration) {
    this.initializeDefaultHandlers();
  }

  /**
   * Process error through the complete handling pipeline
   */
  async processError(
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<{
    error: any;
    analysis: ErrorAnalysis;
    response?: Partial<MiddlewareResponse>;
    userMessage?: string;
    recovery?: RecoverySuggestion;
  }> {
    let processedError = error;
    let processedAnalysis = analysis;
    let response: Partial<MiddlewareResponse> | undefined;
    let userMessage: string | undefined;
    let recovery: RecoverySuggestion | undefined;

    try {
      // Step 1: Apply error filters
      const shouldProcess = await this.applyErrorFilters(
        processedError,
        processedAnalysis,
        context,
      );

      if (!shouldProcess) {
        return {
          error: processedError,
          analysis: processedAnalysis,
        };
      }

      // Step 2: Validate error
      const validationResult = await this.validateError(
        processedError,
        processedAnalysis,
        context,
      );

      if (!validationResult.valid) {
        console.warn("Error validation failed:", validationResult.errors);
        // Continue processing but log validation issues
      }

      // Step 3: Apply error transformations
      const transformationResult = await this.applyErrorTransformations(
        processedError,
        processedAnalysis,
        context,
      );

      processedError = transformationResult.error;
      processedAnalysis = transformationResult.analysis;
      response = transformationResult.response;
      userMessage = transformationResult.userMessage;
      recovery = transformationResult.recovery;

      // Step 4: Apply error routing
      if (this.config.routingRules.length > 0) {
        await this.applyErrorRouting(
          processedError,
          processedAnalysis,
          context,
        );
      }

      // Step 5: Generate user-friendly message if not already provided
      if (!userMessage) {
        userMessage = await this.generateUserFriendlyMessage(
          processedAnalysis,
          context,
        );
      }

      // Step 6: Generate recovery suggestion if not already provided
      if (!recovery) {
        recovery = await this.generateRecoverySuggestion(
          processedAnalysis,
          context,
        );
      }

      return {
        error: processedError,
        analysis: processedAnalysis,
        response,
        userMessage,
        recovery,
      };
    } catch (handlingError) {
      // Fallback error handling
      console.error("Error handling failed:", handlingError);

      return {
        error: processedError,
        analysis: processedAnalysis,
        userMessage: this.config.showUserFriendlyErrors
          ? "An unexpected error occurred. Please try again."
          : processedError.message || String(processedError),
      };
    }
  }

  /**
   * Apply error filters to determine if error should be processed
   */
  private async applyErrorFilters(
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<boolean> {
    // Apply configuration filters
    for (const filter of this.config.errorFilters) {
      if (!filter.enabled) continue;

      const shouldInclude = await this.evaluateFilterConditions(
        filter,
        error,
        analysis,
        context,
      );

      if (filter.action === "exclude" && !shouldInclude) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate filter conditions
   */
  private async evaluateFilterConditions(
    filter: ErrorFilter,
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<boolean> {
    const conditions = filter.conditions;

    // Check error types
    if (conditions.errorTypes && conditions.errorTypes.length > 0) {
      if (!conditions.errorTypes.includes(analysis.type)) {
        return false;
      }
    }

    // Check error categories
    if (conditions.errorCategories && conditions.errorCategories.length > 0) {
      if (!conditions.errorCategories.includes(analysis.category)) {
        return false;
      }
    }

    // Check severities
    if (conditions.severities && conditions.severities.length > 0) {
      if (!conditions.severities.includes(analysis.severity)) {
        return false;
      }
    }

    // Check paths
    if (conditions.paths && conditions.paths.length > 0) {
      const currentPath = context.request?.url || context.customData?.path;
      if (
        !currentPath ||
        !conditions.paths.some((path) => currentPath.includes(path))
      ) {
        return false;
      }
    }

    // Check methods
    if (conditions.methods && conditions.methods.length > 0) {
      const currentMethod = context.request?.method || "GET";
      if (!conditions.methods.includes(currentMethod)) {
        return false;
      }
    }

    // Check custom condition
    if (conditions.custom) {
      return conditions.custom(error, context);
    }

    return true;
  }

  /**
   * Validate error using configured validators
   */
  private async validateError(
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const validator of this.config.customValidators) {
      try {
        const result = await validator.validate(error, analysis, context);

        if (!result.valid && result.errors) {
          errors.push(...result.errors);
        }

        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      } catch (validationError) {
        console.warn("Error validator failed:", validationError);
        warnings.push(`Validator ${validator.id} failed: ${validationError}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Apply error transformations
   */
  private async applyErrorTransformations(
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<{
    error: any;
    analysis: ErrorAnalysis;
    response?: Partial<MiddlewareResponse>;
    userMessage?: string;
    recovery?: RecoverySuggestion;
  }> {
    let transformedError = error;
    let transformedAnalysis = analysis;
    let response: Partial<MiddlewareResponse> | undefined;
    let userMessage: string | undefined;
    let recovery: RecoverySuggestion | undefined;

    // Sort transformers by priority
    const sortedTransformers = [...this.config.customTransformers].sort(
      (a, b) => a.priority - b.priority,
    );

    for (const transformer of sortedTransformers) {
      const shouldApply = await this.evaluateTransformerConditions(
        transformer,
        transformedError,
        transformedAnalysis,
        context,
      );

      if (shouldApply) {
        try {
          const result = await transformer.transform(
            transformedError,
            transformedAnalysis,
            context,
          );

          transformedError = result.error;
          transformedAnalysis = result.analysis;

          if (result.response) {
            response = { ...response, ...result.response };
          }

          if (result.userMessage) {
            userMessage = result.userMessage;
          }

          if (result.recovery) {
            recovery = result.recovery;
          }
        } catch (transformError) {
          console.error(
            `Error transformer ${transformer.id} failed:`,
            transformError,
          );
        }
      }
    }

    return {
      error: transformedError,
      analysis: transformedAnalysis,
      response,
      userMessage,
      recovery,
    };
  }

  /**
   * Evaluate transformer conditions
   */
  private async evaluateTransformerConditions(
    transformer: ErrorTransformer,
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<boolean> {
    const conditions = transformer.conditions;

    // Check error types
    if (conditions.errorTypes && conditions.errorTypes.length > 0) {
      if (!conditions.errorTypes.includes(analysis.type)) {
        return false;
      }
    }

    // Check error categories
    if (conditions.errorCategories && conditions.errorCategories.length > 0) {
      if (!conditions.errorCategories.includes(analysis.category)) {
        return false;
      }
    }

    // Check severities
    if (conditions.severities && conditions.severities.length > 0) {
      if (!conditions.severities.includes(analysis.severity)) {
        return false;
      }
    }

    // Check custom condition
    if (conditions.custom) {
      return conditions.custom(error, context);
    }

    return true;
  }

  /**
   * Apply error routing rules
   */
  private async applyErrorRouting(
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<void> {
    for (const rule of this.config.routingRules) {
      if (!rule.enabled) continue;

      const shouldRoute = await this.evaluateRoutingConditions(
        rule,
        error,
        analysis,
        context,
      );

      if (shouldRoute) {
        await this.executeErrorRouting(rule, error, analysis, context);
      }
    }
  }

  /**
   * Evaluate routing conditions
   */
  private async evaluateRoutingConditions(
    rule: ErrorRoutingRule,
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<boolean> {
    const conditions = rule.conditions;

    // Check error types
    if (conditions.errorTypes && conditions.errorTypes.length > 0) {
      if (!conditions.errorTypes.includes(analysis.type)) {
        return false;
      }
    }

    // Check error categories
    if (conditions.errorCategories && conditions.errorCategories.length > 0) {
      if (!conditions.errorCategories.includes(analysis.category)) {
        return false;
      }
    }

    // Check severities
    if (conditions.severities && conditions.severities.length > 0) {
      if (!conditions.severities.includes(analysis.severity)) {
        return false;
      }
    }

    // Check paths
    if (conditions.paths && conditions.paths.length > 0) {
      const currentPath = context.request?.url || "";
      if (!conditions.paths.some((path) => currentPath.includes(path))) {
        return false;
      }
    }

    // Check methods
    if (conditions.methods && conditions.methods.length > 0) {
      const currentMethod = context.request?.method || "GET";
      if (!conditions.methods.includes(currentMethod)) {
        return false;
      }
    }

    // Check custom condition
    if (conditions.custom) {
      return conditions.custom(error, context);
    }

    return true;
  }

  /**
   * Execute error routing
   */
  private async executeErrorRouting(
    rule: ErrorRoutingRule,
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<void> {
    const routingData = {
      error: error.message || String(error),
      type: analysis.type,
      category: analysis.category,
      severity: analysis.severity,
      context: {
        url: context.request?.url,
        method: context.request?.method,
        userId: context.userId,
        sessionId: context.sessionId,
        timestamp: context.timestamp,
      },
      analysis: {
        userImpact: analysis.userImpact,
        systemImpact: analysis.systemImpact,
        recoveryStrategy: analysis.recoveryStrategy,
      },
    };

    try {
      switch (rule.target.type) {
        case "endpoint":
          await this.routeToEndpoint(rule.target, routingData);
          break;
        case "service":
          await this.routeToService(rule.target, routingData);
          break;
        case "handler":
          await this.routeToHandler(rule.target, routingData, context);
          break;
        case "middleware":
          await this.routeToMiddleware(rule.target, routingData, context);
          break;
      }
    } catch (routingError) {
      console.error(`Error routing failed for rule ${rule.id}:`, routingError);
    }
  }

  /**
   * Route to HTTP endpoint
   */
  private async routeToEndpoint(
    target: ErrorRoutingRule["target"],
    data: any,
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      target.timeout || 10000,
    );

    try {
      const response = await fetch(target.destination, {
        method: target.method || "POST",
        headers: {
          "Content-Type": "application/json",
          ...target.headers,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(
          "Error routing endpoint returned non-OK status:",
          response.status,
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Route to service
   */
  private async routeToService(
    target: ErrorRoutingRule["target"],
    data: any,
  ): Promise<void> {
    // This would integrate with your service layer
    console.log("Routing error to service:", target.destination, data);
  }

  /**
   * Route to handler
   */
  private async routeToHandler(
    target: ErrorRoutingRule["target"],
    data: any,
    context: MiddlewareContext,
  ): Promise<void> {
    // This would call a specific error handler function
    console.log("Routing error to handler:", target.destination, data);
  }

  /**
   * Route to middleware
   */
  private async routeToMiddleware(
    target: ErrorRoutingRule["target"],
    data: any,
    context: MiddlewareContext,
  ): Promise<void> {
    // This would pass the error to another middleware
    console.log("Routing error to middleware:", target.destination, data);
  }

  /**
   * Generate user-friendly error message
   */
  private async generateUserFriendlyMessage(
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<string> {
    // Check if custom message generation is enabled
    if (!this.config.customizeErrorMessages) {
      return analysis.userImpact.description;
    }

    // Generate message based on error category and type
    const baseMessage = this.getBaseMessage(analysis);

    // Add context-specific information
    const contextualMessage = this.addContextualInformation(
      baseMessage,
      analysis,
      context,
    );

    // Add recovery hints
    const messageWithHints = this.addRecoveryHints(
      contextualMessage,
      analysis,
      context,
    );

    return messageWithHints;
  }

  /**
   * Get base message for error analysis
   */
  private getBaseMessage(analysis: ErrorAnalysis): string {
    switch (analysis.category) {
      case ErrorCategory.NETWORK:
        return "Connection problem. Please check your internet connection.";

      case ErrorCategory.API:
        return "Service temporarily unavailable. Please try again in a moment.";

      case ErrorCategory.AUTHENTICATION:
        return "Authentication problem. Please log in again.";

      case ErrorCategory.AUTHORIZATION:
        return "You don't have permission to perform this action.";

      case ErrorCategory.FILE_SYSTEM:
        if (analysis.type === ErrorType.FILE_TOO_LARGE) {
          return "File is too large. Please choose a smaller file.";
        }
        return "File operation failed. Please check your file and try again.";

      case ErrorCategory.TRANSCRIPTION:
        return "Transcription service temporarily unavailable. Please try again later.";

      case ErrorCategory.VALIDATION:
        return "Invalid input. Please check your information and try again.";

      default:
        return "An error occurred. Please try again or contact support if the problem persists.";
    }
  }

  /**
   * Add contextual information to message
   */
  private addContextualInformation(
    message: string,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): string {
    let enhancedMessage = message;

    // Add affected features
    if (analysis.userImpact.affectedFeatures.length > 0) {
      const features = analysis.userImpact.affectedFeatures
        .slice(0, 3)
        .join(", ");
      enhancedMessage += ` This affects: ${features}.`;
    }

    // Add device-specific context
    if (context.deviceContext?.deviceType === "mobile") {
      enhancedMessage += " Mobile connection may be unstable.";
    }

    return enhancedMessage;
  }

  /**
   * Add recovery hints to message
   */
  private addRecoveryHints(
    message: string,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): string {
    let messageWithHints = message;

    if (analysis.userImpact.workaroundAvailable) {
      messageWithHints += " You may be able to continue using other features.";
    }

    if (analysis.userImpact.userActionRequired) {
      messageWithHints +=
        " Please follow the instructions below to resolve this issue.";
    }

    return messageWithHints;
  }

  /**
   * Generate recovery suggestion
   */
  private async generateRecoverySuggestion(
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
  ): Promise<RecoverySuggestion | undefined> {
    // This would integrate with the recovery strategies system
    // For now, return undefined to let the main middleware handle it
    return undefined;
  }

  /**
   * Initialize default error handlers
   */
  private initializeDefaultHandlers(): void {
    // Add default error filters
    this.errorFilters.set("exclude-debug", {
      id: "exclude-debug",
      name: "Exclude Debug Errors",
      enabled: true,
      priority: 1,
      conditions: {
        custom: (error, context) => {
          return (
            this.config.debugMode === false &&
            (error?.message?.includes("Debug") ||
              error?.message?.includes("Test"))
          );
        },
      },
      action: "exclude",
    });

    // Add default error transformers
    this.errorTransformers.set("sanitize-errors", {
      id: "sanitize-errors",
      name: "Sanitize Error Messages",
      description: "Remove sensitive information from error messages",
      priority: 1,
      conditions: {
        severities: [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH],
      },
      transform: async (error, analysis, context) => {
        const sanitizedMessage = this.sanitizeErrorMessage(
          error.message || String(error),
        );

        return {
          error: {
            ...error,
            message: sanitizedMessage,
            sanitized: true,
          },
          analysis,
          userMessage: this.config.showUserFriendlyErrors
            ? "An error occurred. Our team has been notified."
            : sanitizedMessage,
        };
      },
      tags: ["security", "sanitization"],
      version: "1.0.0",
    });
  }

  /**
   * Sanitize error message to remove sensitive information
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove potential sensitive information
    let sanitized = message;

    // Remove file paths
    sanitized = sanitized.replace(/\/[^\s]+/g, "[path]");

    // Remove IP addresses
    sanitized = sanitized.replace(
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      "[ip]",
    );

    // Remove email addresses
    sanitized = sanitized.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      "[email]",
    );

    // Remove API keys and tokens
    sanitized = sanitized.replace(/\b[A-Za-z0-9]{20,}\b/g, "[token]");

    return sanitized;
  }

  updateConfiguration(config: MiddlewareConfiguration): void {
    this.config = config;
    this.initializeDefaultHandlers();
  }
}

// ============================================================================
// ERROR REPORTER
// ============================================================================

/**
 * Error reporter for analytics, monitoring, and tracking
 */
export class ErrorReporter {
  private analyticsBuffer: ErrorAnalytics[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isFlushing = false;

  constructor(private config: MiddlewareConfiguration) {
    if (this.config.enableAnalytics) {
      this.startAnalyticsFlushing();
    }
  }

  /**
   * Report error for analytics and monitoring
   */
  async reportError(
    error: any,
    analysis: ErrorAnalysis,
    context: MiddlewareContext,
    processingTime?: number,
  ): Promise<void> {
    if (!this.config.enableAnalytics) return;

    const analytics: ErrorAnalytics = {
      errorId: this.generateErrorId(),
      fingerprint: this.generateErrorFingerprint(error, analysis),
      type: analysis.type,
      category: analysis.category,
      severity: analysis.severity,
      timestamp: new Date(),
      occurrenceCount: 1,
      frequency: 0, // Would be calculated from analytics history
      context: {
        url: context.request?.url || "unknown",
        userAgent: context.request?.userAgent || "unknown",
        userId: context.userId,
        sessionId: context.sessionId,
        deviceType: context.deviceContext?.deviceType || "unknown",
        networkType: context.deviceContext?.networkType || "unknown",
      },
      performance: {
        processingTime: processingTime || 0,
        memoryImpact: context.performanceContext?.memoryUsage || 0,
        networkImpact: 0, // Would be calculated from network metrics
        userImpactDuration: 0, // Would be calculated from user interaction
      },
      recovery: {
        strategy: analysis.recoveryStrategy,
        attempted: context.errorHandlingState?.recoveryAttempts > 0,
        successful: false, // Would be updated based on actual recovery
        duration: 0, // Would be calculated from recovery timing
        userAction: analysis.userImpact.userActionRequired,
      },
      userInteraction: {
        notified: context.errorHandlingState?.userNotified || false,
        dismissed: false,
        feedbackProvided: false,
      },
    };

    this.analyticsBuffer.push(analytics);

    // Immediately flush critical errors
    if (analysis.severity === ErrorSeverity.CRITICAL) {
      await this.flushAnalytics();
    }
  }

  /**
   * Report recovery attempt and result
   */
  async reportRecovery(
    errorId: string,
    strategy: string,
    successful: boolean,
    duration: number,
    context: MiddlewareContext,
  ): Promise<void> {
    if (!this.config.enableAnalytics) return;

    // Find the corresponding error analytics
    const errorAnalytics = this.analyticsBuffer.find(
      (e) => e.errorId === errorId,
    );
    if (errorAnalytics) {
      errorAnalytics.recovery.strategy = strategy;
      errorAnalytics.recovery.attempted = true;
      errorAnalytics.recovery.successful = successful;
      errorAnalytics.recovery.duration = duration;
    }
  }

  /**
   * Report user interaction with error
   */
  async reportUserInteraction(
    errorId: string,
    interaction: "dismissed" | "feedback" | "retry",
    data?: any,
  ): Promise<void> {
    if (!this.config.enableAnalytics) return;

    const errorAnalytics = this.analyticsBuffer.find(
      (e) => e.errorId === errorId,
    );
    if (errorAnalytics) {
      switch (interaction) {
        case "dismissed":
          errorAnalytics.userInteraction.dismissed = true;
          break;
        case "feedback":
          errorAnalytics.userInteraction.feedbackProvided = true;
          if (data?.rating) {
            errorAnalytics.userInteraction.rating = data.rating;
          }
          if (data?.comment) {
            errorAnalytics.userInteraction.comment = data.comment;
          }
          break;
        case "retry":
          // Track retry attempts
          break;
      }
    }
  }

  /**
   * Flush analytics buffer to endpoint
   */
  private async flushAnalytics(): Promise<void> {
    if (this.isFlushing || this.analyticsBuffer.length === 0) return;

    this.isFlushing = true;

    try {
      const analytics = [...this.analyticsBuffer];
      this.analyticsBuffer = [];

      if (this.config.analyticsEndpoint) {
        await this.sendAnalytics(analytics);
      }

      if (
        this.config.enableRealTimeMonitoring &&
        this.config.monitoringEndpoint
      ) {
        await this.sendRealTimeMonitoring(analytics);
      }
    } catch (error) {
      console.error("Failed to flush analytics:", error);
      // Re-add analytics to buffer if sending failed
      this.analyticsBuffer.unshift(...this.analyticsBuffer);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Send analytics to endpoint
   */
  private async sendAnalytics(analytics: ErrorAnalytics[]): Promise<void> {
    if (!this.config.analyticsEndpoint) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(this.config.analyticsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          errors: analytics,
          metadata: {
            version: "1.0.0",
            environment: process.env.NODE_ENV,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(
          "Analytics endpoint returned non-OK status:",
          response.status,
        );
      }
    } catch (error) {
      console.error("Failed to send analytics:", error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send real-time monitoring data
   */
  private async sendRealTimeMonitoring(
    analytics: ErrorAnalytics[],
  ): Promise<void> {
    if (!this.config.monitoringEndpoint) return;

    // Send critical errors immediately
    const criticalErrors = analytics.filter(
      (a) => a.severity === ErrorSeverity.CRITICAL,
    );
    if (criticalErrors.length > 0) {
      try {
        await fetch(this.config.monitoringEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Event-Type": "critical_error",
          },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            errors: criticalErrors,
          }),
        });
      } catch (error) {
        console.error("Failed to send real-time monitoring:", error);
      }
    }
  }

  /**
   * Start analytics flushing interval
   */
  private startAnalyticsFlushing(): void {
    // Flush analytics every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushAnalytics();
    }, 30000);
  }

  /**
   * Stop analytics flushing
   */
  private stopAnalyticsFlushing(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate error fingerprint
   */
  private generateErrorFingerprint(
    error: any,
    analysis: ErrorAnalysis,
  ): string {
    const message = error?.message || String(error);
    const stack = error?.stack || "";

    // Create hash from error characteristics
    const combined = `${analysis.category}-${analysis.type}-${message.substring(0, 100)}-${stack.substring(0, 100)}`;
    return this.simpleHash(combined);
  }

  /**
   * Simple hash function
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
   * Get analytics buffer contents
   */
  getAnalyticsBuffer(): ErrorAnalytics[] {
    return [...this.analyticsBuffer];
  }

  /**
   * Clear analytics buffer
   */
  clearAnalyticsBuffer(): void {
    this.analyticsBuffer = [];
  }

  updateConfiguration(config: MiddlewareConfiguration): void {
    this.config = config;

    if (config.enableAnalytics && !this.flushInterval) {
      this.startAnalyticsFlushing();
    } else if (!config.enableAnalytics && this.flushInterval) {
      this.stopAnalyticsFlushing();
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.stopAnalyticsFlushing();
    this.flushAnalytics();
  }
}

// ============================================================================
// MIDDLEWARE MANAGER
// ============================================================================

/**
 * Middleware manager for orchestrating error handling components
 */
export class MiddlewareManager {
  private middlewareChain: Array<
    (context: MiddlewareContext, next: () => Promise<void>) => Promise<void>
  > = [];
  private errorHandler: MiddlewareErrorHandler;
  private errorReporter: ErrorReporter;

  constructor(private config: MiddlewareConfiguration) {
    this.errorHandler = new MiddlewareErrorHandler(config);
    this.errorReporter = new ErrorReporter(config);
    this.initializeMiddlewareChain();
  }

  /**
   * Execute middleware chain
   */
  async execute(
    request: any,
    context: MiddlewareContext,
    next?: () => Promise<void>,
  ): Promise<MiddlewareResponse> {
    const startTime = Date.now();

    try {
      // Create next function if not provided
      const nextFunction = next || (() => Promise.resolve());

      // Execute middleware chain
      await this.executeMiddlewareChain(context, nextFunction);

      // Return success response
      return {
        statusCode: 200,
        headers: {
          "X-Error-Processing-Time": String(Date.now() - startTime),
          "X-Middleware-Executed": "true",
        },
        body: { success: true },
      };
    } catch (error) {
      // Handle error through the error processing pipeline
      const processingTime = Date.now() - startTime;

      // Classify error
      const analysis = await this.classifyError(error, context);

      // Process error through handler
      const result = await this.errorHandler.processError(
        error,
        analysis,
        context,
      );

      // Report error for analytics
      await this.errorReporter.reportError(
        result.error,
        result.analysis,
        context,
        processingTime,
      );

      // Create error response
      return {
        statusCode: this.getStatusCodeFromAnalysis(result.analysis),
        headers: {
          "Content-Type": "application/json",
          "X-Error-ID": this.generateErrorId(),
          "X-Error-Category": result.analysis.category,
          "X-Error-Type": result.analysis.type,
          "X-Error-Severity": result.analysis.severity,
          "X-Error-Processing-Time": String(processingTime),
          ...result.response?.headers,
        },
        body: this.config.showUserFriendlyErrors
          ? {
              success: false,
              error: {
                message: result.userMessage,
                type: result.analysis.type,
                recovery: result.recovery,
              },
            }
          : {
              success: false,
              error: result.error,
              analysis: this.config.debugMode ? result.analysis : undefined,
            },
      };
    }
  }

  /**
   * Add middleware to chain
   */
  use(
    middleware: (
      context: MiddlewareContext,
      next: () => Promise<void>,
    ) => Promise<void>,
  ): void {
    this.middlewareChain.push(middleware);
  }

  /**
   * Remove middleware from chain
   */
  remove(
    middleware: (
      context: MiddlewareContext,
      next: () => Promise<void>,
    ) => Promise<void>,
  ): void {
    const index = this.middlewareChain.indexOf(middleware);
    if (index > -1) {
      this.middlewareChain.splice(index, 1);
    }
  }

  /**
   * Execute middleware chain
   */
  private async executeMiddlewareChain(
    context: MiddlewareContext,
    finalNext: () => Promise<void>,
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middlewareChain.length) {
        return finalNext();
      }

      const middleware = this.middlewareChain[index++];
      await middleware(context, next);
    };

    await next();
  }

  /**
   * Classify error
   */
  private async classifyError(
    error: any,
    context: MiddlewareContext,
  ): Promise<ErrorAnalysis> {
    if (!this.config.enableClassification) {
      // Return basic analysis if classification is disabled
      return {
        category: ErrorCategory.UNKNOWN,
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        confidence: 0.5,
        userImpact: {
          level: "annoying",
          affectedFeatures: [],
          workaroundAvailable: true,
          userActionRequired: false,
          description: "Classification is disabled",
        },
        systemImpact: {
          level: "low",
          affectedComponents: [],
          cascadePossible: false,
          dataIntegrityRisk: false,
          performanceImpact: "minimal",
        },
        recoveryStrategy: "user_retry",
        successProbability: 0.5,
        recommendedActions: ["Try again"],
        preventionStrategies: [],
        analysisTimestamp: new Date(),
        analysisVersion: "1.0.0",
      };
    }

    // Use the existing error classifier
    const errorContext: ErrorContext = {
      timestamp: context.timestamp,
      component: context.customData?.component,
      action: context.customData?.action,
      userJourney: context.customData?.userJourney,
      userAgent: context.request?.userAgent,
      url: context.request?.url,
      sessionId: context.sessionId,
      customData: context.customData,
    };

    return classifyError(error, errorContext);
  }

  /**
   * Get HTTP status code from error analysis
   */
  private getStatusCodeFromAnalysis(analysis: ErrorAnalysis): number {
    switch (analysis.category) {
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.NETWORK:
        return 503;
      case ErrorCategory.API:
        return 502;
      case ErrorCategory.FILE_SYSTEM:
        if (analysis.type === ErrorType.FILE_TOO_LARGE) return 413;
        if (analysis.type === ErrorType.FILE_NOT_FOUND) return 404;
        return 400;
      default:
        return 500;
    }
  }

  /**
   * Generate error ID
   */
  private generateErrorId(): string {
    return `mid_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize default middleware chain
   */
  private initializeMiddlewareChain(): void {
    // Add logging middleware
    this.use(async (context, next) => {
      if (this.config.logLevel !== "silent") {
        console.log(
          `[${new Date().toISOString()}] ${context.request?.method} ${context.request?.url}`,
        );
      }
      await next();
    });

    // Add performance monitoring middleware
    this.use(async (context, next) => {
      const startTime = Date.now();
      await next();
      const duration = Date.now() - startTime;

      if (this.config.enablePerformanceMonitoring && duration > 1000) {
        console.warn(
          `Slow request detected: ${context.request?.url} took ${duration}ms`,
        );
      }
    });

    // Add error boundary middleware
    this.use(async (context, next) => {
      try {
        await next();
      } catch (error) {
        // Error will be caught by the main execute method
        throw error;
      }
    });
  }

  updateConfiguration(config: MiddlewareConfiguration): void {
    this.config = config;
    this.errorHandler.updateConfiguration(config);
    this.errorReporter.updateConfiguration(config);
  }

  /**
   * Get middleware manager statistics
   */
  getStatistics(): {
    middlewareCount: number;
    analyticsBufferSize: number;
    configuration: MiddlewareConfiguration;
  } {
    return {
      middlewareCount: this.middlewareChain.length,
      analyticsBufferSize: this.errorReporter.getAnalyticsBuffer().length,
      configuration: { ...this.config },
    };
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.errorReporter.destroy();
    this.middlewareChain = [];
  }
}

// ============================================================================
// SUPPORTING CLASSES FOR REQUEST CONTEXT PROCESSOR
// ============================================================================

/**
 * Performance Monitor for tracking request and system performance
 */
class PerformanceMonitor {
  private startTime: number = 0;
  private performanceContext: PerformanceContext;

  constructor(private config: MiddlewareConfiguration) {
    this.performanceContext = this.createPerformanceContext();
  }

  startRequestMonitoring(): void {
    this.startTime = Date.now();
    this.performanceContext = this.createPerformanceContext();
  }

  stopRequestMonitoring(): any {
    const duration = Date.now() - this.startTime;
    this.performanceContext.responseTime = duration;
    this.performanceContext.processingTime = duration;

    return {
      duration,
      memoryUsage: this.performanceContext.memoryUsage,
      networkSpeed: this.performanceContext.networkSpeed,
      responseTime: this.performanceContext.responseTime,
    };
  }

  getPerformanceContext(): PerformanceContext {
    return { ...this.performanceContext };
  }

  private createPerformanceContext(): PerformanceContext {
    const context: PerformanceContext = {
      requestStartTime: Date.now(),
      connectionType: "unknown",
    };

    if (typeof navigator !== "undefined") {
      context.connectionType = this.getConnectionType();
      context.downlink = this.getDownlinkSpeed();
      context.rtt = this.getRTT();
      context.effectiveType = this.getEffectiveType();
    }

    if (typeof performance !== "undefined") {
      context.memoryUsage = this.getMemoryUsage();
      context.domContentLoaded = this.getDOMContentLoadTime();
      context.loadComplete = this.getLoadCompleteTime();
      context.firstContentfulPaint = this.getFirstContentfulPaint();
      context.largestContentfulPaint = this.getLargestContentfulPaint();
    }

    return context;
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || connection?.type || "unknown";
  }

  private getDownlinkSpeed(): number | undefined {
    const connection = (navigator as any).connection;
    return connection?.downlink;
  }

  private getRTT(): number | undefined {
    const connection = (navigator as any).connection;
    return connection?.rtt;
  }

  private getEffectiveType(): string | undefined {
    const connection = (navigator as any).connection;
    return connection?.effectiveType;
  }

  private getMemoryUsage(): number | undefined {
    const memory = (performance as any).memory;
    if (memory) {
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return undefined;
  }

  private getDOMContentLoadTime(): number | undefined {
    if (performance.timing) {
      return (
        performance.timing.domContentLoadedEventEnd -
        performance.timing.navigationStart
      );
    }
    return undefined;
  }

  private getLoadCompleteTime(): number | undefined {
    if (performance.timing) {
      return (
        performance.timing.loadEventEnd - performance.timing.navigationStart
      );
    }
    return undefined;
  }

  private getFirstContentfulPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType("paint");
    const fcp = paintEntries.find(
      (entry) => entry.name === "first-contentful-paint",
    );
    return fcp?.startTime;
  }

  private getLargestContentfulPaint(): number | undefined {
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    return lcpEntries.length > 0
      ? lcpEntries[lcpEntries.length - 1].startTime
      : undefined;
  }

  updateConfiguration(config: MiddlewareConfiguration): void {
    this.config = config;
  }
}

/**
 * Device Detector for identifying device characteristics
 */
class DeviceDetector {
  async detectDeviceContext(
    request?: any,
    context?: MiddlewareContext,
  ): Promise<MobileDeviceContext> {
    const deviceContext: MobileDeviceContext = {
      deviceType: this.getDeviceType(),
      operatingSystem: this.getOperatingSystem(),
      appVersion: this.getAppVersion(),
      browser: this.getBrowser(),
      browserVersion: this.getBrowserVersion(),
      capabilities: this.getDeviceCapabilities(),
      isLowPowerMode: this.isLowPowerMode(),
      isOnline: this.isOnline(),
      networkType: this.getNetworkType(),
      deviceClass: this.determineDeviceClass(),
      memoryConstraints: this.hasMemoryConstraints(),
      storageConstraints: this.hasStorageConstraints(),
      pwaInstalled: this.isPWAInstalled(),
      standaloneMode: this.isStandaloneMode(),
      screenOrientation: this.getScreenOrientation(),
      viewportSize: this.getViewportSize(),
    };

    // Get battery level if available
    deviceContext.batteryLevel = await this.getBatteryLevel();

    // Get network strength if available
    deviceContext.networkStrength = this.getNetworkStrength();

    return deviceContext;
  }

  private getDeviceType(): MobileDeviceContext["deviceType"] {
    const userAgent = navigator.userAgent.toLowerCase();

    if (
      /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      )
    ) {
      return "mobile";
    }

    if (/tablet|ipad|android(?!.*mobile)/i.test(userAgent)) {
      return "tablet";
    }

    return "desktop";
  }

  private getOperatingSystem(): MobileDeviceContext["operatingSystem"] {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
    if (/android/.test(userAgent)) return "android";
    if (/windows/.test(userAgent)) return "windows";
    if (/mac/.test(userAgent)) return "macos";
    if (/linux/.test(userAgent)) return "linux";

    return "unknown";
  }

  private getAppVersion(): string {
    // This would be retrieved from app build info or manifest
    return process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";
  }

  private getBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/chrome/.test(userAgent)) return "chrome";
    if (/firefox/.test(userAgent)) return "firefox";
    if (/safari/.test(userAgent)) return "safari";
    if (/edge/.test(userAgent)) return "edge";
    if (/opera/.test(userAgent)) return "opera";

    return "unknown";
  }

  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const browser = this.getBrowser();

    const versionRegex: Record<string, RegExp> = {
      chrome: /chrome\/(\d+)/,
      firefox: /firefox\/(\d+)/,
      safari: /version\/(\d+).*safari/,
      edge: /edg\/(\d+)/,
      opera: /opr\/(\d+)/,
    };

    const regex = versionRegex[browser];
    if (regex) {
      const match = userAgent.match(regex);
      return match ? match[1] : "unknown";
    }

    return "unknown";
  }

  private getDeviceCapabilities(): MobileDeviceContext["capabilities"] {
    return {
      touch: "ontouchstart" in window,
      geolocation: "geolocation" in navigator,
      camera: this.hasCameraCapability(),
      microphone:
        "mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices,
      webgl: this.hasWebGLCapability(),
      webassembly: typeof WebAssembly !== "undefined",
      serviceworker: "serviceWorker" in navigator,
    };
  }

  private hasCameraCapability(): boolean {
    const devices = navigator.mediaDevices?.enumerateDevices?.();
    if (!devices) return false;

    return devices
      .then((deviceList) =>
        deviceList.some((device) => device.kind === "videoinput"),
      )
      .catch(() => false);
  }

  private hasWebGLCapability(): boolean {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    if ("getBattery" in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return battery.level;
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }

  private isLowPowerMode(): boolean {
    // This is a heuristic - actual low power mode detection is complex
    return (
      this.getDeviceType() === "mobile" &&
      (!this.isOnline() || this.getNetworkType() === "cellular")
    );
  }

  private isOnline(): boolean {
    return navigator.onLine;
  }

  private getNetworkType(): MobileDeviceContext["networkType"] {
    const connection = (navigator as any).connection;

    if (connection) {
      if (connection.type === "cellular") return "cellular";
      if (connection.type === "wifi") return "wifi";
      if (connection.type === "ethernet") return "ethernet";
    }

    return navigator.onLine ? "unknown" : "none";
  }

  private getNetworkStrength(): number | undefined {
    const connection = (navigator as any).connection;

    if (connection) {
      return connection.effectiveType === "4g"
        ? 4
        : connection.effectiveType === "3g"
          ? 3
          : connection.effectiveType === "2g"
            ? 2
            : 1;
    }

    return undefined;
  }

  private determineDeviceClass(): MobileDeviceContext["deviceClass"] {
    const memory = (performance as any).memory;
    const cores = navigator.hardwareConcurrency || 1;

    if (memory && cores) {
      const memoryGB = memory.jsHeapSizeLimit / (1024 * 1024 * 1024);

      if (memoryGB >= 8 && cores >= 8) return "high";
      if (memoryGB >= 4 && cores >= 4) return "medium";
    }

    return "low";
  }

  private hasMemoryConstraints(): boolean {
    const memory = (performance as any).memory;
    if (memory) {
      const memoryGB = memory.jsHeapSizeLimit / (1024 * 1024 * 1024);
      return memoryGB < 4;
    }
    return true; // Assume constraints if we can't detect
  }

  private hasStorageConstraints(): boolean {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      return navigator.storage
        .estimate()
        .then((estimate) => {
          const quotaGB = (estimate.quota || 0) / (1024 * 1024 * 1024);
          return quotaGB < 10; // Less than 10GB is considered constrained
        })
        .catch(() => true);
    }
    return true; // Assume constraints if we can't detect
  }

  private isPWAInstalled(): boolean {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as any).standalone)
    );
  }

  private isStandaloneMode(): boolean {
    return this.isPWAInstalled();
  }

  private getScreenOrientation(): MobileDeviceContext["screenOrientation"] {
    return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
  }

  private getViewportSize(): { width: number; height: number } {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
}

/**
 * Mobile Optimizations for device-specific adjustments
 */
class MobileOptimizations {
  constructor(private config: MiddlewareConfiguration) {}

  async optimizeForDevice(context: MiddlewareContext): Promise<void> {
    if (
      !context.deviceContext ||
      context.deviceContext.deviceType === "desktop"
    ) {
      return;
    }

    // Apply battery optimizations
    if (this.config.batteryOptimizations) {
      this.applyBatteryOptimizations(context);
    }

    // Apply network optimizations
    if (this.config.networkOptimizations) {
      this.applyNetworkOptimizations(context);
    }

    // Apply performance optimizations
    if (this.config.mobilePerformanceMode) {
      this.applyPerformanceOptimizations(context);
    }

    // Update feature flags for mobile
    if (context.featureFlags) {
      context.featureFlags = {
        ...context.featureFlags,
        reducedAnimations: true,
        compressedImages: true,
        optimizedNetwork: context.deviceContext.networkType === "cellular",
        touchInterface: true,
      };
    }
  }

  private applyBatteryOptimizations(context: MiddlewareContext): void {
    if (!context.deviceContext) return;

    // Reduce activity on low battery
    if (
      context.deviceContext.batteryLevel &&
      context.deviceContext.batteryLevel < 0.2
    ) {
      if (context.featureFlags) {
        context.featureFlags.reducedAnimations = true;
        context.featureFlags.backgroundSync = false;
      }

      // Limit concurrent operations
      if (context.configuration) {
        context.configuration.maxConcurrentRecoveries = 1;
      }
    }
  }

  private applyNetworkOptimizations(context: MiddlewareContext): void {
    if (!context.deviceContext) return;

    if (context.deviceContext.networkType === "cellular") {
      // Enable data saving features
      if (context.featureFlags) {
        context.featureFlags.compressedImages = true;
        context.featureFlags.optimizedNetwork = true;
        context.featureFlags.preloadContent = false;
      }

      // Increase timeouts for slow networks
      if (context.performanceContext) {
        context.performanceContext.connectionType = "cellular";
      }
    }
  }

  private applyPerformanceOptimizations(context: MiddlewareContext): void {
    if (!context.deviceContext) return;

    if (context.deviceContext.deviceClass === "low") {
      // Apply performance constraints
      if (context.configuration) {
        context.configuration.maxErrorProcessingTime = 2000;
        context.configuration.maxRecoveryAttempts = 1;
      }

      if (context.featureFlags) {
        context.featureFlags.reducedAnimations = true;
        context.featureFlags.compressedImages = true;
        context.featureFlags.advancedFeatures = false;
      }
    }
  }

  updateConfiguration(config: MiddlewareConfiguration): void {
    this.config = config;
  }
}

export class ErrorReporter {
  constructor(private config: MiddlewareConfiguration) {}

  updateConfiguration(config: MiddlewareConfiguration): void {
    this.config = config;
  }
}

export class MiddlewareManager {
  constructor(private config: MiddlewareConfiguration) {}

  updateConfiguration(config: MiddlewareConfiguration): void {
    this.config = config;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const errorMiddleware = ErrorMiddleware.getInstance();

/**
 * Create Next.js middleware function
 */
export function createNextJSErrorMiddleware() {
  return async (request: any, context: any) => {
    return await errorMiddleware.executeNextJSMiddleware(request, context);
  };
}

/**
 * Create Express.js middleware function
 */
export function createExpressErrorMiddleware() {
  return (req: any, res: any, next: any) => {
    errorMiddleware.executeExpressMiddleware(req, res, next);
  };
}

/**
 * Create React Error Boundary handler
 */
export function createReactErrorHandler() {
  return async (error: Error, errorInfo: any, componentStack?: string) => {
    return await errorMiddleware.handleReactError(
      error,
      errorInfo,
      componentStack,
    );
  };
}

/**
 * Create TanStack Query error handler
 */
export function createQueryErrorHandler() {
  return async (
    error: any,
    queryKey: string[],
    queryType: "query" | "mutation",
    variables?: any,
  ) => {
    return await errorMiddleware.handleQueryError(
      error,
      queryKey,
      queryType,
      variables,
    );
  };
}
