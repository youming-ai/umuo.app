/**
 * API Middleware Wrapper
 *
 * A lightweight wrapper that provides enhanced error handling for existing API routes
 * without requiring significant refactoring. This wrapper integrates with the comprehensive
 * error handling system while maintaining compatibility with existing route handlers.
 *
 * Usage:
 * ```typescript
 * // Wrap existing API route
 * export const POST = withEnhancedErrorHandling(async (request) => {
 *   // Your existing API route logic
 *   return apiSuccess(data);
 * });
 *
 * // Or use with configuration
 * export const POST = withEnhancedErrorHandling(
 *   async (request) => {
 *     // Your existing API route logic
 *   },
 *   {
 *     enableMobileOptimizations: true,
 *     enableAnalytics: true,
 *     customContext: { feature: 'transcription' }
 *   }
 * );
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { handleAPIError, MiddlewareContext } from "./enhanced-error-handler";
import { apiSuccess } from "@/lib/utils/api-response";
import type { DeviceInfo } from "@/types/mobile";

// ============================================================================
// MIDDLEWARE CONFIGURATION INTERFACES
// ============================================================================

/**
 * Configuration options for the API middleware wrapper
 */
export interface APIMiddlewareConfig {
  // Error handling options
  enableEnhancedErrorHandling?: boolean;
  enableFallbackErrorHandling?: boolean;

  // Mobile optimization
  enableMobileOptimizations?: boolean;
  batteryOptimizations?: boolean;
  networkOptimizations?: boolean;

  // Analytics and monitoring
  enableAnalytics?: boolean;
  enablePerformanceMonitoring?: boolean;

  // Custom context
  customContext?: Partial<MiddlewareContext>;

  // Request preprocessing
  enableRequestValidation?: boolean;
  enableRequestLogging?: boolean;

  // Response postprocessing
  enableResponseCaching?: boolean;
  enableCompression?: boolean;

  // Rate limiting
  enableRateLimiting?: boolean;
  maxRequestsPerMinute?: number;

  // Timeout handling
  enableTimeoutProtection?: boolean;
  requestTimeoutMs?: number;

  // Security
  enableSecurityHeaders?: boolean;
  enableCORS?: boolean;
  allowedOrigins?: string[];
}

/**
 * Enhanced request context provided to route handlers
 */
export interface EnhancedRequestContext {
  // Original request
  request: NextRequest;

  // Device information (if detected)
  deviceInfo?: DeviceInfo;

  // Performance timing
  startTime: number;

  // Custom context data
  context?: Record<string, any>;

  // Request metadata
  metadata: {
    requestId: string;
    sessionId: string;
    endpoint: string;
    method: string;
  };
}

// ============================================================================
// MIDDLEWARE WRAPPER FUNCTION
// ============================================================================

/**
 * Higher-order function that wraps API route handlers with enhanced error handling
 */
export function withEnhancedErrorHandling<T extends NextResponse>(
  handler: (
    request: NextRequest,
    context?: EnhancedRequestContext,
  ) => Promise<T>,
  config: APIMiddlewareConfig = {},
) {
  return async function wrappedHandler(request: NextRequest): Promise<T> {
    const startTime = Date.now();
    const enhancedContext: EnhancedRequestContext = {
      request,
      startTime,
      metadata: {
        requestId: generateRequestId(),
        sessionId: generateSessionId(request),
        endpoint: new URL(request.url).pathname,
        method: request.method,
      },
    };

    try {
      // Preprocessing phase
      await preProcessRequest(request, enhancedContext, config);

      // Validate request if enabled
      if (config.enableRequestValidation) {
        const validationResult = await validateRequest(
          request,
          enhancedContext,
        );
        if (!validationResult.valid) {
          throw validationResult.error;
        }
      }

      // Log request if enabled
      if (config.enableRequestLogging) {
        await logRequest(request, enhancedContext);
      }

      // Apply timeout protection if enabled
      let response: T;
      if (config.enableTimeoutProtection && config.requestTimeoutMs) {
        response = await withTimeout(
          () => handler(request, enhancedContext),
          config.requestTimeoutMs,
        );
      } else {
        response = await handler(request, enhancedContext);
      }

      // Postprocess response if needed
      const processedResponse = await postProcessResponse(
        response,
        enhancedContext,
        config,
      );

      return processedResponse;
    } catch (error) {
      // Use enhanced error handling if enabled
      if (config.enableEnhancedErrorHandling !== false) {
        const errorResponse = await handleAPIError(error, request, {
          timestamp: new Date(),
          requestId: enhancedContext.metadata.requestId,
          sessionId: enhancedContext.metadata.sessionId,
          customData: {
            ...config.customContext?.customData,
            endpoint: enhancedContext.metadata.endpoint,
            method: enhancedContext.metadata.method,
            startTime: enhancedContext.startTime,
            processingTime: Date.now() - startTime,
          },
        });

        return errorResponse as T;
      }

      // Fallback to basic error handling
      return createFallbackErrorResponse(error, enhancedContext) as T;
    }
  };
}

// ============================================================================
// REQUEST PROCESSING FUNCTIONS
// ============================================================================

/**
 * Preprocess request before calling the main handler
 */
async function preProcessRequest(
  request: NextRequest,
  context: EnhancedRequestContext,
  config: APIMiddlewareConfig,
): Promise<void> {
  // Detect device information if mobile optimizations are enabled
  if (config.enableMobileOptimizations) {
    context.deviceInfo = await detectDeviceInfo(request);
    context.context = {
      ...context.context,
      deviceInfo: context.deviceInfo,
    };
  }

  // Add custom context data
  if (config.customContext) {
    context.context = {
      ...context.context,
      ...config.customContext.customData,
    };
  }
}

/**
 * Validate request if validation is enabled
 */
async function validateRequest(
  request: NextRequest,
  context: EnhancedRequestContext,
): Promise<{ valid: boolean; error?: Error }> {
  try {
    // Basic validation
    if (!request.url) {
      return {
        valid: false,
        error: new Error("Request URL is required"),
      };
    }

    // Content type validation for POST/PUT requests
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      const contentType = request.headers.get("content-type");
      if (!contentType) {
        return {
          valid: false,
          error: new Error("Content-Type header is required for this request"),
        };
      }
    }

    // Size validation (basic protection against overly large requests)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      // 100MB limit
      return {
        valid: false,
        error: new Error("Request size exceeds maximum allowed limit"),
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error ? error : new Error("Request validation failed"),
    };
  }
}

/**
 * Log request information for debugging and monitoring
 */
async function logRequest(
  request: NextRequest,
  context: EnhancedRequestContext,
): Promise<void> {
  const url = new URL(request.url);

  console.log("API Request:", {
    requestId: context.metadata.requestId,
    sessionId: context.metadata.sessionId,
    method: request.method,
    endpoint: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: request.headers.get("user-agent"),
    contentType: request.headers.get("content-type"),
    deviceType: context.deviceInfo?.device_type,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// RESPONSE PROCESSING FUNCTIONS
// ============================================================================

/**
 * Postprocess response before sending to client
 */
async function postProcessResponse<T extends NextResponse>(
  response: T,
  context: EnhancedRequestContext,
  config: APIMiddlewareConfig,
): Promise<T> {
  // Add performance headers
  if (config.enablePerformanceMonitoring) {
    const processingTime = Date.now() - context.startTime;
    response.headers.set("X-Processing-Time", String(processingTime));
    response.headers.set("X-Request-ID", context.metadata.requestId);
  }

  // Add device information headers
  if (config.enableMobileOptimizations && context.deviceInfo) {
    response.headers.set("X-Device-Type", context.deviceInfo.device_type);
    response.headers.set("X-Mobile-Optimized", "true");
  }

  // Add security headers
  if (config.enableSecurityHeaders) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  // Add CORS headers if enabled
  if (config.enableCORS) {
    const origin = request.headers.get("origin");
    if (
      !config.allowedOrigins ||
      config.allowedOrigins.includes(origin || "*")
    ) {
      response.headers.set("Access-Control-Allow-Origin", origin || "*");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      response.headers.set("Access-Control-Max-Age", "86400");
    }
  }

  // Add cache control headers
  if (!config.enableResponseCaching) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

// ============================================================================
// TIMEOUT PROTECTION
// ============================================================================

/**
 * Execute function with timeout protection
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

// ============================================================================
// FALLBACK ERROR HANDLING
// ============================================================================

/**
 * Create fallback error response when enhanced error handling fails
 */
function createFallbackErrorResponse(
  error: any,
  context: EnhancedRequestContext,
): NextResponse {
  const isProduction = process.env.NODE_ENV === "production";
  const processingTime = Date.now() - context.startTime;

  const errorResponse = {
    success: false,
    error: {
      id: generateErrorId(),
      code: "INTERNAL_ERROR",
      message: isProduction
        ? "An error occurred while processing your request"
        : error?.message || "Unknown error occurred",
      userMessage: isProduction
        ? "Something went wrong. Please try again or contact support if the problem persists."
        : "An internal error occurred. Please try again.",
    },
    timestamp: new Date().toISOString(),
    metadata: {
      requestId: context.metadata.requestId,
      processingTime,
      fallback: true,
    },
  };

  const response = NextResponse.json(errorResponse, { status: 500 });
  response.headers.set("X-Request-ID", context.metadata.requestId);
  response.headers.set("X-Fallback-Response", "true");
  response.headers.set("X-Processing-Time", String(processingTime));

  return response;
}

// ============================================================================
// DEVICE DETECTION UTILITIES
// ============================================================================

/**
 * Detect device information from request headers
 */
async function detectDeviceInfo(request: NextRequest): Promise<DeviceInfo> {
  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);

  const deviceType = isMobile
    ? userAgent.includes("tablet") || userAgent.includes("ipad")
      ? "tablet"
      : "mobile"
    : "desktop";

  const operatingSystem = detectOperatingSystem(userAgent);

  return {
    device_type: deviceType,
    operating_system: operatingSystem,
    browser: detectBrowser(userAgent),
    browser_version: detectBrowserVersion(userAgent),
    network_type: (request.headers.get("x-network-type") as any) || "unknown",
    battery_level: request.headers.get("x-battery-level")
      ? parseFloat(request.headers.get("x-battery-level")!)
      : undefined,
    is_low_power_mode: request.headers.get("x-low-power-mode") === "true",
    app_version: request.headers.get("x-app-version") || undefined,
  };
}

function detectOperatingSystem(
  userAgent: string,
): DeviceInfo["operating_system"] {
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "ios";
  if (userAgent.includes("Android")) return "android";
  if (userAgent.includes("Windows")) return "windows";
  if (userAgent.includes("Mac")) return "macos";
  if (userAgent.includes("Linux")) return "linux";
  return "unknown";
}

function detectBrowser(userAgent: string): string {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "unknown";
}

function detectBrowserVersion(userAgent: string): string {
  const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
  return match ? match[2] : "unknown";
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate session ID from request
 */
function generateSessionId(request: NextRequest): string {
  // Try to get session ID from headers
  const sessionHeader = request.headers.get("x-session-id");
  if (sessionHeader) return sessionHeader;

  // Try to get session ID from cookies
  const sessionCookie = request.headers.get("cookie");
  if (sessionCookie && sessionCookie.includes("session=")) {
    const match = sessionCookie.match(/session=([^;]+)/);
    if (match) return match[1];
  }

  // Generate new session ID
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Default middleware configuration
 */
export const defaultMiddlewareConfig: APIMiddlewareConfig = {
  enableEnhancedErrorHandling: true,
  enableMobileOptimizations: true,
  enableAnalytics: true,
  enablePerformanceMonitoring: true,
  enableRequestValidation: true,
  enableRequestLogging: process.env.NODE_ENV === "development",
  enableSecurityHeaders: true,
  enableTimeoutProtection: true,
  requestTimeoutMs: 30000,
  enableRateLimiting: true,
  maxRequestsPerMinute: 60,
};

/**
 * Pre-configured middleware wrappers for common use cases
 */
export const withMobileOptimizations = <T extends NextResponse>(
  handler: (
    request: NextRequest,
    context?: EnhancedRequestContext,
  ) => Promise<T>,
) =>
  withEnhancedErrorHandling(handler, {
    ...defaultMiddlewareConfig,
    enableMobileOptimizations: true,
    batteryOptimizations: true,
    networkOptimizations: true,
  });

export const withAnalytics = <T extends NextResponse>(
  handler: (
    request: NextRequest,
    context?: EnhancedRequestContext,
  ) => Promise<T>,
) =>
  withEnhancedErrorHandling(handler, {
    ...defaultMiddlewareConfig,
    enableAnalytics: true,
    enablePerformanceMonitoring: true,
    enableRequestLogging: true,
  });

export const withSecurity = <T extends NextResponse>(
  handler: (
    request: NextRequest,
    context?: EnhancedRequestContext,
  ) => Promise<T>,
) =>
  withEnhancedErrorHandling(handler, {
    ...defaultMiddlewareConfig,
    enableSecurityHeaders: true,
    enableCORS: true,
    enableRequestValidation: true,
    enableTimeoutProtection: true,
    requestTimeoutMs: 15000,
  });

export const withBasicErrorHandling = <T extends NextResponse>(
  handler: (
    request: NextRequest,
    context?: EnhancedRequestContext,
  ) => Promise<T>,
) =>
  withEnhancedErrorHandling(handler, {
    enableEnhancedErrorHandling: true,
    enableFallbackErrorHandling: true,
    enablePerformanceMonitoring: true,
  });
