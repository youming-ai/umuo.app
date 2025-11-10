/**
 * Enhanced API Error Handler
 *
 * Comprehensive error handling system for API endpoints that integrates with:
 * - Error classification system (T057)
 * - Recovery strategies (T058)
 * - Error display components (T059)
 * - Error middleware (T060)
 * - Error analytics (T061)
 * - Mobile optimization (T062-T065)
 *
 * This system provides:
 * - Consistent error response formats across all API endpoints
 * - Intelligent error classification and analysis
 * - Mobile-aware error handling with device context
 * - Recovery strategy integration
 * - Performance monitoring and optimization
 * - Comprehensive analytics and tracking
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ErrorMiddleware,
  MiddlewareContext,
  MiddlewareRequest,
  MiddlewareResponse,
  MobileDeviceContext,
  PerformanceContext,
  ErrorAnalytics,
  RecoverySuggestion,
} from "@/lib/errors/error-middleware";
import {
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  ErrorAnalysis,
  classifyError,
} from "@/lib/errors/error-classifier";
import {
  RecoveryStrategy,
  createRecoveryStrategy,
  RecoveryExecutionContext,
} from "@/lib/errors/recovery-strategies";
import { AppError, handleError } from "@/lib/utils/error-handler";
import type { DeviceInfo } from "@/types/mobile";

// ============================================================================
// ENHANCED API ERROR INTERFACES
// ============================================================================

/**
 * Enhanced API error response structure
 */
export interface EnhancedAPIErrorResponse {
  success: false;
  error: {
    // Core error information
    id: string;
    code: string;
    type: ErrorType;
    category: ErrorCategory;
    severity: ErrorSeverity;
    message: string;

    // User-friendly information
    userMessage: string;
    suggestedAction?: string;

    // Technical details (debug mode only)
    details?: any;
    stack?: string;

    // Context information
    context?: {
      timestamp: string;
      requestId: string;
      sessionId: string;
      endpoint: string;
      method: string;
      deviceType?: string;
      networkType?: string;
    };

    // Recovery information
    recovery?: {
      strategy: string;
      suggestions: RecoverySuggestion[];
      canRetry: boolean;
      retryDelay?: number;
      maxRetries?: number;
    };

    // Mobile-specific information
    mobile?: {
      optimized: boolean;
      batteryOptimized: boolean;
      networkOptimized: boolean;
      touchOptimized: boolean;
    };
  };
  timestamp: string;
  metadata?: {
    version: string;
    environment: string;
    processingTime: number;
    analytics: {
      errorId: string;
      fingerprint: string;
      trackingEnabled: boolean;
    };
  };
}

/**
 * API error handler configuration
 */
export interface APIErrorHandlerConfig {
  // Basic configuration
  debugMode: boolean;
  enableClassification: boolean;
  enableRecovery: boolean;
  enableAnalytics: boolean;

  // Mobile optimization
  enableMobileOptimizations: boolean;
  batteryOptimizations: boolean;
  networkOptimizations: boolean;

  // Performance settings
  enablePerformanceMonitoring: boolean;
  maxProcessingTime: number;
  enableErrorCaching: boolean;

  // Response customization
  includeTechnicalDetails: boolean;
  includeStackTraces: boolean;
  includeContextInfo: boolean;
  includeRecoveryInfo: boolean;

  // Rate limiting and throttling
  enableRateLimiting: boolean;
  maxErrorsPerMinute: number;
  enableThrottling: boolean;

  // Analytics endpoints
  analyticsEndpoint?: string;
  monitoringEndpoint?: string;
}

// ============================================================================
// MAIN API ERROR HANDLER CLASS
// ============================================================================

/**
 * Enhanced API Error Handler
 */
export class EnhancedAPIErrorHandler {
  private static instance: EnhancedAPIErrorHandler;
  private errorMiddleware: ErrorMiddleware;
  private config: APIErrorHandlerConfig;
  private errorRateTracker: Map<string, number[]> = new Map();
  private errorCache: Map<string, CachedError> = new Map();

  private constructor() {
    this.errorMiddleware = ErrorMiddleware.getInstance();
    this.config = this.getDefaultConfig();
    this.initializeRateLimiting();
  }

  static getInstance(): EnhancedAPIErrorHandler {
    if (!EnhancedAPIErrorHandler.instance) {
      EnhancedAPIErrorHandler.instance = new EnhancedAPIErrorHandler();
    }
    return EnhancedAPIErrorHandler.instance;
  }

  /**
   * Handle API error with comprehensive processing
   */
  async handleAPIError(
    error: any,
    request: NextRequest,
    context?: Partial<MiddlewareContext>,
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const sessionId = this.getSessionId(request);

    try {
      // Create enhanced middleware context
      const middlewareContext: MiddlewareContext = {
        request: await this.createRequestContext(request),
        response: {
          statusCode: 500,
          headers: {},
        },
        timestamp: new Date(),
        requestId,
        sessionId,
        ...context,
      };

      // Detect device context for mobile optimization
      middlewareContext.deviceContext = await this.detectDeviceContext(request);

      // Initialize performance context
      middlewareContext.performanceContext = this.createPerformanceContext(startTime);

      // Enrich error context with mobile-specific information
      await this.enrichErrorContext(error, middlewareContext);

      // Check rate limiting
      if (this.config.enableRateLimiting && this.isRateLimited(request)) {
        return this.createRateLimitResponse(requestId, sessionId);
      }

      // Process error through middleware system
      const result = await this.errorMiddleware.processError(
        error,
        await this.classifyError(error, middlewareContext),
        middlewareContext,
      );

      // Create enhanced error response
      const response = await this.createEnhancedErrorResponse(
        result,
        middlewareContext,
        startTime,
      );

      // Report error for analytics
      if (this.config.enableAnalytics) {
        await this.reportError(result, middlewareContext, Date.now() - startTime);
      }

      // Cache error for performance
      if (this.config.enableErrorCaching) {
        this.cacheError(result, middlewareContext);
      }

      return response;
    } catch (processingError) {
      // Fallback error handling
      console.error("Enhanced error processing failed:", processingError);
      return this.createFallbackErrorResponse(error, requestId, sessionId, startTime);
    }
  }

  /**
   * Create middleware request context from NextRequest
   */
  private async createRequestContext(request: NextRequest): Promise<MiddlewareRequest> {
    const url = new URL(request.url);

    return {
      url: request.url,
      method: request.method,
      headers: this.normalizeHeaders(request.headers),
      query: Object.fromEntries(url.searchParams),
      body: await this.safeParseBody(request),
      startTime: Date.now(),
      ip: this.getClientIP(request),
      userAgent: request.headers.get("user-agent") || "unknown",
      referer: request.headers.get("referer") || undefined,
      origin: request.headers.get("origin") || undefined,
      mobileData: this.extractMobileData(request.headers),
    };
  }

  /**
   * Detect device context for mobile optimization
   */
  private async detectDeviceContext(request: NextRequest): Promise<MobileDeviceContext> {
    const userAgent = request.headers.get("user-agent") || "";
    const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);

    // Extract device information from headers or user agent
    const deviceType = isMobile ?
      (userAgent.includes("tablet") || userAgent.includes("ipad") ? "tablet" : "mobile")
      : "desktop";

    const operatingSystem = this.detectOperatingSystem(userAgent);
    const browser = this.detectBrowser(userAgent);

    return {
      deviceType,
      operatingSystem,
      appVersion: "1.0.0", // Would be extracted from headers in real app
      browser,
      browserVersion: this.detectBrowserVersion(userAgent),
      capabilities: {
        touch: isMobile,
        geolocation: isMobile,
        camera: isMobile,
        microphone: isMobile,
        webgl: !userAgent.includes("bot"),
        webassembly: true,
        serviceworker: 'serviceWorker' in navigator,
      },
      batteryLevel: undefined, // Would be detected client-side
      isLowPowerMode: false, // Would be detected client-side
      isOnline: true, // Would be detected client-side
      networkType: "unknown", // Would be detected client-side
      deviceClass: this.estimateDeviceClass(userAgent),
      memoryConstraints: isMobile,
      storageConstraints: isMobile,
      pwaInstalled: false, // Would be detected client-side
      standaloneMode: false, // Would be detected client-side
      screenOrientation: "landscape", // Would be detected client-side
      viewportSize: { width: 1920, height: 1080 }, // Would be detected client-side
    };
  }

  /**
   * Create performance context
   */
  private createPerformanceContext(startTime: number): PerformanceContext {
    return {
      requestStartTime: startTime,
      connectionType: "unknown",
      effectiveType: "4g",
    };
  }

  /**
   * Enrich error context with mobile-specific information
   */
  private async enrichErrorContext(
    error: any,
    context: MiddlewareContext
  ): Promise<void> {
    // Add mobile-specific context
    if (context.deviceContext) {
      context.customData = {
        ...context.customData,
        mobileContext: {
          deviceType: context.deviceContext.deviceType,
          operatingSystem: context.deviceContext.operatingSystem,
          capabilities: context.deviceContext.capabilities,
          deviceClass: context.deviceContext.deviceClass,
          memoryConstraints: context.deviceContext.memoryConstraints,
          networkOptimizations: this.config.networkOptimizations,
          batteryOptimizations: this.config.batteryOptimizations,
        },
      };
    }

    // Add performance context
    if (context.performanceContext) {
      context.customData = {
        ...context.customData,
        performanceContext: {
          requestStartTime: context.performanceContext.requestStartTime,
          connectionType: context.performanceContext.connectionType,
          effectiveType: context.performanceContext.effectiveType,
          maxProcessingTime: this.config.maxProcessingTime,
        },
      };
    }

    // Add request-specific context
    if (context.request) {
      context.customData = {
        ...context.customData,
        requestContext: {
          endpoint: context.request.url,
          method: context.request.method,
          userAgent: context.request.userAgent,
          mobileData: context.request.mobileData,
        },
      };
    }
  }

  /**
   * Classify error with enhanced context
   */
  private async classifyError(
    error: any,
    context: MiddlewareContext,
  ): Promise<ErrorAnalysis> {
    if (!this.config.enableClassification) {
      // Use existing error handler if classification is disabled
      const appError = handleError(error, {
        fileId: context.customData?.fileId,
        jobId: context.customData?.jobId,
      });

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
          description: appError.message,
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

    // Create error context for classifier
    const errorContext = {
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
   * Create enhanced error response
   */
  private async createEnhancedErrorResponse(
    result: {
      error: any;
      analysis: ErrorAnalysis;
      recovery: RecoverySuggestion[];
      userMessage: string;
    },
    context: MiddlewareContext,
    startTime: number,
  ): Promise<NextResponse> {
    const processingTime = Date.now() - startTime;
    const statusCode = this.getStatusCode(result.analysis);
    const errorId = this.generateErrorId();

    const errorResponse: EnhancedAPIErrorResponse = {
      success: false,
      error: {
        id: errorId,
        code: this.generateErrorCode(result.analysis),
        type: result.analysis.type,
        category: result.analysis.category,
        severity: result.analysis.severity,
        message: result.error.message || String(result.error),
        userMessage: result.userMessage,
        suggestedAction: result.analysis.userImpact.userActionRequired
          ? result.analysis.recommendedActions[0]
          : undefined,

        // Include technical details in debug mode
        ...(this.config.includeTechnicalDetails && {
          details: result.error.details,
          ...(this.config.includeStackTraces && { stack: result.error.stack }),
        }),

        // Include context information
        ...(this.config.includeContextInfo && {
          context: {
            timestamp: context.timestamp.toISOString(),
            requestId: context.requestId,
            sessionId: context.sessionId,
            endpoint: context.request?.url || "unknown",
            method: context.request?.method || "unknown",
            deviceType: context.deviceContext?.deviceType,
            networkType: context.deviceContext?.networkType,
          },
        }),

        // Include recovery information
        ...(this.config.includeRecoveryInfo && {
          recovery: {
            strategy: result.analysis.recoveryStrategy,
            suggestions: result.recovery,
            canRetry: result.analysis.userImpact.level !== "blocking",
            retryDelay: this.calculateRetryDelay(result.analysis),
            maxRetries: 3,
          },
        }),

        // Include mobile-specific information
        mobile: {
          optimized: this.config.enableMobileOptimizations,
          batteryOptimized: this.config.batteryOptimizations && context.deviceContext?.isLowPowerMode,
          networkOptimized: this.config.networkOptimizations && context.deviceContext?.networkType === "cellular",
          touchOptimized: context.deviceContext?.deviceType !== "desktop",
        },
      },
      timestamp: new Date().toISOString(),
      metadata: {
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        processingTime,
        analytics: {
          errorId,
          fingerprint: this.generateFingerprint(result.error, result.analysis),
          trackingEnabled: this.config.enableAnalytics,
        },
      },
    };

    // Create response with appropriate headers
    const response = NextResponse.json(errorResponse, { status: statusCode });

    // Add error handling headers
    response.headers.set("X-Error-ID", errorId);
    response.headers.set("X-Error-Type", result.analysis.type);
    response.headers.set("X-Error-Category", result.analysis.category);
    response.headers.set("X-Error-Severity", result.analysis.severity);
    response.headers.set("X-Processing-Time", String(processingTime));

    // Add mobile optimization headers
    if (this.config.enableMobileOptimizations && context.deviceContext) {
      response.headers.set("X-Mobile-Optimized", "true");
      response.headers.set("X-Device-Type", context.deviceContext.deviceType);
    }

    // Add cache control headers
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  }

  /**
   * Create fallback error response
   */
  private createFallbackErrorResponse(
    error: any,
    requestId: string,
    sessionId: string,
    startTime: number,
  ): NextResponse {
    const processingTime = Date.now() - startTime;
    const isProduction = process.env.NODE_ENV === "production";

    const fallbackResponse: EnhancedAPIErrorResponse = {
      success: false,
      error: {
        id: this.generateErrorId(),
        code: "INTERNAL_ERROR",
        type: ErrorType.UNKNOWN_ERROR,
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: isProduction
          ? "An error occurred while processing your request"
          : error?.message || "Unknown error occurred",
        userMessage: isProduction
          ? "Something went wrong. Please try again or contact support if the problem persists."
          : "An error occurred in the error handling system. Please try again.",
        context: {
          timestamp: new Date().toISOString(),
          requestId,
          sessionId,
          endpoint: "unknown",
          method: "unknown",
        },
        mobile: {
          optimized: false,
          batteryOptimized: false,
          networkOptimized: false,
          touchOptimized: false,
        },
      },
      timestamp: new Date().toISOString(),
      metadata: {
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        processingTime,
        analytics: {
          errorId: this.generateErrorId(),
          fingerprint: "fallback-error",
          trackingEnabled: false,
        },
      },
    };

    const response = NextResponse.json(fallbackResponse, { status: 500 });
    response.headers.set("X-Error-ID", fallbackResponse.error.id);
    response.headers.set("X-Fallback-Response", "true");

    return response;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get HTTP status code for error analysis
   */
  private getStatusCode(analysis: ErrorAnalysis): number {
    switch (analysis.category) {
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.NETWORK:
        return 503;
      case ErrorCategory.API:
        if (analysis.type === ErrorType.API_RATE_LIMIT) return 429;
        if (analysis.type === ErrorType.API_QUOTA_EXCEEDED) return 402;
        return 502;
      case ErrorCategory.FILE_SYSTEM:
        if (analysis.type === ErrorType.FILE_NOT_FOUND) return 404;
        if (analysis.type === ErrorType.FILE_TOO_LARGE) return 413;
        return 400;
      default:
        return 500;
    }
  }

  /**
   * Generate error code from analysis
   */
  private generateErrorCode(analysis: ErrorAnalysis): string {
    return `${analysis.category.toUpperCase()}_${analysis.type.toUpperCase()}`;
  }

  /**
   * Calculate retry delay based on error analysis
   */
  private calculateRetryDelay(analysis: ErrorAnalysis): number {
    const baseDelay = 1000;

    switch (analysis.category) {
      case ErrorCategory.NETWORK:
        return baseDelay * 2;
      case ErrorCategory.API:
        if (analysis.type === ErrorType.API_RATE_LIMIT) return baseDelay * 10;
        return baseDelay * 3;
      case ErrorCategory.TRANSCRIPTION:
        return baseDelay * 5;
      default:
        return baseDelay;
    }
  }

  /**
   * Generate unique identifiers
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(error: any, analysis: ErrorAnalysis): string {
    const message = error?.message || String(error);
    const category = analysis.category;
    const type = analysis.type;
    const combined = `${category}-${type}-${message.substring(0, 100)}`;
    return this.simpleHash(combined);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Session management
   */
  private getSessionId(request: NextRequest): string {
    // Try to get session ID from headers or cookies
    const sessionHeader = request.headers.get("x-session-id");
    if (sessionHeader) return sessionHeader;

    const sessionCookie = request.headers.get("cookie");
    if (sessionCookie && sessionCookie.includes("session=")) {
      const match = sessionCookie.match(/session=([^;]+)/);
      if (match) return match[1];
    }

    // Generate new session ID
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Header and request processing
   */
  private normalizeHeaders(headers: Headers): Record<string, string> {
    const normalized: Record<string, string> = {};
    headers.forEach((value, key) => {
      normalized[key.toLowerCase()] = value;
    });
    return normalized;
  }

  private async safeParseBody(request: NextRequest): Promise<any> {
    try {
      const contentType = request.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await request.json();
      }
      if (contentType?.includes("multipart/form-data")) {
        return "multipart-form-data"; // Don't parse form data in error handler
      }
      return null;
    } catch {
      return null;
    }
  }

  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      request.ip ||
      "unknown"
    );
  }

  private extractMobileData(headers: Headers): any {
    return {
      appVersion: headers.get("x-app-version"),
      deviceType: headers.get("x-device-type"),
      networkType: headers.get("x-network-type"),
      batteryLevel: headers.get("x-battery-level"),
    };
  }

  /**
   * Device detection utilities
   */
  private detectOperatingSystem(userAgent: string): MobileDeviceContext["operatingSystem"] {
    if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "ios";
    if (userAgent.includes("Android")) return "android";
    if (userAgent.includes("Windows")) return "windows";
    if (userAgent.includes("Mac")) return "macos";
    if (userAgent.includes("Linux")) return "linux";
    return "unknown";
  }

  private detectBrowser(userAgent: string): string {
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "unknown";
  }

  private detectBrowserVersion(userAgent: string): string {
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : "unknown";
  }

  private estimateDeviceClass(userAgent: string): MobileDeviceContext["deviceClass"] {
    // Simple heuristic based on user agent
    if (userAgent.includes("iPhone")) return "medium";
    if (userAgent.includes("Android")) return "medium";
    if (userAgent.includes("iPad") || userAgent.includes("Tablet")) return "high";
    return "high"; // Assume desktop is high performance
  }

  /**
   * Rate limiting
   */
  private initializeRateLimiting(): void {
    // Clean up old rate limit entries every minute
    setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      for (const [key, timestamps] of this.errorRateTracker.entries()) {
        const validTimestamps = timestamps.filter(t => t > oneMinuteAgo);
        if (validTimestamps.length === 0) {
          this.errorRateTracker.delete(key);
        } else {
          this.errorRateTracker.set(key, validTimestamps);
        }
      }
    }, 60000);
  }

  private isRateLimited(request: NextRequest): boolean {
    if (!this.config.enableRateLimiting) return false;

    const clientIP = this.getClientIP(request);
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const timestamps = this.errorRateTracker.get(clientIP) || [];
    const recentTimestamps = timestamps.filter(t => t > oneMinuteAgo);

    if (recentTimestamps.length >= this.config.maxErrorsPerMinute) {
      return true;
    }

    recentTimestamps.push(now);
    this.errorRateTracker.set(clientIP, recentTimestamps);
    return false;
  }

  private createRateLimitResponse(requestId: string, sessionId: string): NextResponse {
    const rateLimitResponse: EnhancedAPIErrorResponse = {
      success: false,
      error: {
        id: this.generateErrorId(),
        code: "RATE_LIMIT_EXCEEDED",
        type: ErrorType.API_RATE_LIMIT,
        category: ErrorCategory.API,
        severity: ErrorSeverity.MEDIUM,
        message: "Too many error requests",
        userMessage: "Too many requests. Please wait a moment before trying again.",
        recovery: {
          strategy: "exponential_backoff",
          suggestions: [],
          canRetry: true,
          retryDelay: 60000,
          maxRetries: 3,
        },
        mobile: {
          optimized: this.config.enableMobileOptimizations,
          batteryOptimized: false,
          networkOptimized: this.config.networkOptimizations,
          touchOptimized: false,
        },
      },
      timestamp: new Date().toISOString(),
    };

    const response = NextResponse.json(rateLimitResponse, { status: 429 });
    response.headers.set("X-Error-ID", rateLimitResponse.error.id);
    response.headers.set("X-Rate-Limited", "true");
    response.headers.set("Retry-After", "60");

    return response;
  }

  /**
   * Error caching
   */
  private cacheError(
    result: { error: any; analysis: ErrorAnalysis },
    context: MiddlewareContext,
  ): void {
    const fingerprint = this.generateFingerprint(result.error, result.analysis);
    const cached: CachedError = {
      error: result.error,
      analysis: result.analysis,
      timestamp: new Date(),
      context: context.request?.url,
    };

    this.errorCache.set(fingerprint, cached);

    // Clean up old cache entries every 5 minutes
    setTimeout(() => {
      this.errorCache.delete(fingerprint);
    }, 300000);
  }

  /**
   * Error reporting
   */
  private async reportError(
    result: { error: any; analysis: ErrorAnalysis },
    context: MiddlewareContext,
    processingTime: number,
  ): Promise<void> {
    if (!this.config.analyticsEndpoint) return;

    try {
      const analytics: ErrorAnalytics = {
        errorId: this.generateErrorId(),
        fingerprint: this.generateFingerprint(result.error, result.analysis),
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
          processingTime,
          memoryImpact: 0,
          networkImpact: 0,
        },
        recovery: {
          strategy: result.analysis.recoveryStrategy,
          attempted: false,
          successful: false,
          userAction: result.analysis.userImpact.userActionRequired,
        },
        userInteraction: {
          notified: true,
          dismissed: false,
          feedbackProvided: false,
        },
      };

      await fetch(this.config.analyticsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analytics),
      });
    } catch (reportingError) {
      console.error("Failed to report error analytics:", reportingError);
    }
  }

  /**
   * Configuration
   */
  private getDefaultConfig(): APIErrorHandlerConfig {
    return {
      debugMode: process.env.NODE_ENV === "development",
      enableClassification: true,
      enableRecovery: true,
      enableAnalytics: !!process.env.ERROR_ANALYTICS_ENDPOINT,
      enableMobileOptimizations: true,
      batteryOptimizations: true,
      networkOptimizations: true,
      enablePerformanceMonitoring: true,
      maxProcessingTime: 5000,
      enableErrorCaching: true,
      includeTechnicalDetails: process.env.NODE_ENV === "development",
      includeStackTraces: process.env.NODE_ENV === "development",
      includeContextInfo: true,
      includeRecoveryInfo: true,
      enableRateLimiting: true,
      maxErrorsPerMinute: 10,
      enableThrottling: true,
      analyticsEndpoint: process.env.ERROR_ANALYTICS_ENDPOINT,
      monitoringEndpoint: process.env.ERROR_MONITORING_ENDPOINT,
    };
  }

  /**
   * Public configuration methods
   */
  configure(config: Partial<APIErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): APIErrorHandlerConfig {
    return { ...this.config };
  }

  /**
   * Statistics and monitoring
   */
  getStatistics(): {
    totalErrors: number;
    cacheHitRate: number;
    rateLimitedRequests: number;
    averageProcessingTime: number;
  } {
    const totalErrors = this.errorCache.size;
    const rateLimitedRequests = Array.from(this.errorRateTracker.values())
      .reduce((sum, timestamps) => sum + timestamps.length, 0);

    return {
      totalErrors,
      cacheHitRate: 0, // Would be calculated from cache hits
      rateLimitedRequests,
      averageProcessingTime: 0, // Would be calculated from processing times
    };
  }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

/**
 * Cached error information
 */
interface CachedError {
  error: any;
  analysis: ErrorAnalysis;
  timestamp: Date;
  context?: string;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Global API error handler instance
 */
export const apiErrorHandler = EnhancedAPIErrorHandler.getInstance();

/**
 * Handle API error with enhanced processing
 */
export async function handleAPIError(
  error: any,
  request: NextRequest,
  context?: Partial<MiddlewareContext>,
): Promise<NextResponse> {
  return apiErrorHandler.handleAPIError(error, request, context);
}

/**
 * Configure API error handler
 */
export function configureAPIErrorHandler(config: Partial<APIErrorHandlerConfig>): void {
  apiErrorHandler.configure(config);
}

/**
 * Get API error handler statistics
 */
export function getAPIErrorHandlerStatistics() {
  return apiErrorHandler.getStatistics();
}
