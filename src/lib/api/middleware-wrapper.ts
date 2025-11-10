/**
 * API Middleware Wrapper
 *
 * A lightweight wrapper that can be easily applied to existing API routes
 * to provide enhanced error handling without requiring significant code changes.
 *
 * This wrapper integrates with:
 * - Enhanced API error handler
 * - Mobile optimization
 * - Performance monitoring
 * - Analytics and tracking
 *
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return withEnhancedErrorHandling(request, async (context) => {
 *     // Your existing API logic here
 *     return apiSuccess(data);
 *   }, {
 *     // Optional configuration
 *     endpoint: 'transcribe',
 *     requireAuth: false,
 *     rateLimit: { maxRequests: 10, windowMs: 60000 }
 *   });
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { handleAPIError, MiddlewareContext } from "./enhanced-error-handler";
import { apiSuccess } from "@/lib/utils/api-response";
import type { DeviceInfo } from "@/types/mobile";

// ============================================================================
// MIDDLEWARE WRAPPER INTERFACES
// ============================================================================

/**
 * Middleware wrapper configuration
 */
export interface MiddlewareWrapperConfig {
  // Basic configuration
  endpoint?: string;
  method?: string;
  requireAuth?: boolean;

  // Rate limiting
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };

  // Mobile optimization
  mobileOptimizations?: {
    enabled: boolean;
    batteryOptimizations: boolean;
    networkOptimizations: boolean;
    touchOptimizations: boolean;
  };

  // Performance monitoring
  performanceMonitoring?: {
    enabled: boolean;
    maxProcessingTime: number;
    trackMemoryUsage: boolean;
  };

  // Analytics
  analytics?: {
    enabled: boolean;
    trackRequestData: boolean;
    trackUserData: boolean;
  };

  // Custom context
  customContext?: Record<string, any>;
}

/**
 * Handler function type for the middleware wrapper
 */
export type EnhancedHandlerFunction<T = any> = (
  context: EnhancedHandlerContext,
) => Promise<NextResponse<T>>;

/**
 * Enhanced handler context provided to the wrapped function
 */
export interface EnhancedHandlerContext {
  // Original request
  request: NextRequest;

  // Enhanced context information
  requestId: string;
  sessionId: string;
  timestamp: Date;

  // Device and mobile information
  deviceInfo?: DeviceInfo;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // Performance monitoring
  startTime: number;
  performanceMetrics: PerformanceMetrics;

  // Analytics context
  analyticsContext: AnalyticsContext;

  // Custom context from configuration
  customContext?: Record<string, any>;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  startTime: number;
  processingTime?: number;
  memoryUsage?: number;
  networkLatency?: number;
  databaseQueryTime?: number;
  externalAPICallTime?: number;
}

/**
 * Analytics context interface
 */
export interface AnalyticsContext {
  enabled: boolean;
  endpoint: string;
  method: string;
  userAgent: string;
  clientIP: string;
  referrer?: string;
  userId?: string;
  sessionId: string;
  requestId: string;
  timestamp: Date;
}

// ============================================================================
// MAIN MIDDLEWARE WRAPPER FUNCTION
// ============================================================================

/**
 * Enhanced error handling middleware wrapper
 *
 * This function wraps existing API handlers to provide comprehensive
 * error handling, mobile optimization, and analytics.
 */
export async function withEnhancedErrorHandling<T = any>(
  request: NextRequest,
  handler: EnhancedHandlerFunction<T>,
  config: MiddlewareWrapperConfig = {},
): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const sessionId = getSessionId(request);

  // Create enhanced handler context
  const context: EnhancedHandlerContext = {
    request,
    requestId,
    sessionId,
    timestamp: new Date(),
    deviceInfo: await extractDeviceInfo(request),
    isMobile: isMobileDevice(request),
    isTablet: isTabletDevice(request),
    isDesktop: isDesktopDevice(request),
    startTime,
    performanceMetrics: {
      startTime,
    },
    analyticsContext: {
      enabled: config.analytics?.enabled ?? true,
      endpoint: config.endpoint || extractEndpointName(request),
      method: request.method,
      userAgent: request.headers.get("user-agent") || "unknown",
      clientIP: getClientIP(request),
      referrer: request.headers.get("referer") || undefined,
      sessionId,
      requestId,
      timestamp: new Date(),
    },
    customContext: config.customContext,
  };

  try {
    // Pre-processing hooks
    await preProcessRequest(context, config);

    // Execute the original handler
    const response = await handler(context);

    // Post-processing hooks
    await postProcessRequest(context, response, config);

    // Add enhanced headers to response
    return enhanceResponse(response, context, config);

  } catch (error) {
    // Handle error with enhanced error processing
    return handleAPIError(error, request, {
      requestId,
      sessionId,
      timestamp: context.timestamp,
      customData: {
        endpoint: config.endpoint,
        method: request.method,
        deviceInfo: context.deviceInfo,
        performanceMetrics: context.performanceMetrics,
        analyticsContext: context.analyticsContext,
        customContext: config.customContext,
      },
    });
  }
}

// ============================================================================
// PRE-PROCESSING HOOKS
// ============================================================================

/**
 * Pre-processing hooks for request handling
 */
async function preProcessRequest(
  context: EnhancedHandlerContext,
  config: MiddlewareWrapperConfig,
): Promise<void> {
  // Rate limiting check
  if (config.rateLimit) {
    const isRateLimited = await checkRateLimit(context, config.rateLimit);
    if (isRateLimited) {
      throw new Error("Rate limit exceeded");
    }
  }

  // Authentication check
  if (config.requireAuth) {
    const isAuthorized = await checkAuthentication(context);
    if (!isAuthorized) {
      throw new Error("Unauthorized");
    }
  }

  // Mobile optimizations
  if (config.mobileOptimizations?.enabled) {
    await applyMobileOptimizations(context, config.mobileOptimizations);
  }

  // Performance monitoring setup
  if (config.performanceMonitoring?.enabled) {
    setupPerformanceMonitoring(context, config.performanceMonitoring);
  }

  // Analytics tracking
  if (config.analytics?.enabled) {
    await trackRequestStart(context, config.analytics);
  }
}

/**
 * Check rate limiting for the request
 */
async function checkRateLimit(
  context: EnhancedHandlerContext,
  rateLimit: { maxRequests: number; windowMs: number },
): Promise<boolean> {
  // This would integrate with your rate limiting system
  // For now, return false (no rate limiting)
  return false;
}

/**
 * Check authentication for the request
 */
async function checkAuthentication(context: EnhancedHandlerContext): Promise<boolean> {
  // This would integrate with your authentication system
  const authHeader = context.request.headers.get("authorization");
  const sessionCookie = context.request.headers.get("cookie");

  // Simple check - in real implementation, this would verify tokens
  return !!(authHeader || (sessionCookie && sessionCookie.includes("session")));
}

/**
 * Apply mobile optimizations
 */
async function applyMobileOptimizations(
  context: EnhancedHandlerContext,
  optimizations: {
    enabled: boolean;
    batteryOptimizations: boolean;
    networkOptimizations: boolean;
    touchOptimizations: boolean;
  },
): Promise<void> {
  if (context.isMobile || context.isTablet) {
    // Add mobile-specific headers
    if (optimizations.batteryOptimizations) {
      // Reduce processing intensity for battery saving
      context.customContext = {
        ...context.customContext,
        batteryOptimization: true,
        reducedProcessing: true,
      };
    }

    if (optimizations.networkOptimizations) {
      // Optimize for mobile networks
      context.customContext = {
        ...context.customContext,
        networkOptimization: true,
        compressedResponse: true,
      };
    }

    if (optimizations.touchOptimizations) {
      // Optimize for touch interfaces
      context.customContext = {
        ...context.customContext,
        touchOptimization: true,
        largerTouchTargets: true,
      };
    }
  }
}

/**
 * Setup performance monitoring
 */
function setupPerformanceMonitoring(
  context: EnhancedHandlerContext,
  monitoring: {
    enabled: boolean;
    maxProcessingTime: number;
    trackMemoryUsage: boolean;
  },
): void {
  if (monitoring.trackMemoryUsage && typeof performance !== "undefined" && "memory" in performance) {
    const memory = (performance as any).memory;
    context.performanceMetrics.memoryUsage = memory.usedJSHeapSize;
  }

  // Set up timeout warning
  if (monitoring.maxProcessingTime > 0) {
    setTimeout(() => {
      const currentProcessingTime = Date.now() - context.startTime;
      if (currentProcessingTime > monitoring.maxProcessingTime) {
        console.warn(`Request ${context.requestId} exceeded maximum processing time: ${currentProcessingTime}ms`);
      }
    }, monitoring.maxProcessingTime);
  }
}

/**
 * Track request start for analytics
 */
async function trackRequestStart(
  context: EnhancedHandlerContext,
  analytics: {
    enabled: boolean;
    trackRequestData: boolean;
    trackUserData: boolean;
  },
): Promise<void> {
  // This would integrate with your analytics system
  console.log(`Request started: ${context.analyticsContext.endpoint} (${context.requestId})`);
}

// ============================================================================
// POST-PROCESSING HOOKS
// ============================================================================

/**
 * Post-processing hooks for response handling
 */
async function postProcessRequest<T = any>(
  context: EnhancedHandlerContext,
  response: NextResponse<T>,
  config: MiddlewareWrapperConfig,
): Promise<void> {
  // Update performance metrics
  context.performanceMetrics.processingTime = Date.now() - context.startTime;

  // Track completion for analytics
  if (config.analytics?.enabled) {
    await trackRequestComplete(context, response, config.analytics);
  }

  // Log performance warnings
  if (config.performanceMonitoring?.enabled) {
    checkPerformanceThresholds(context, config.performanceMonitoring);
  }
}

/**
 * Track request completion for analytics
 */
async function trackRequestComplete<T = any>(
  context: EnhancedHandlerContext,
  response: NextResponse<T>,
  analytics: {
    enabled: boolean;
    trackRequestData: boolean;
    trackUserData: boolean;
  },
): Promise<void> {
  // This would integrate with your analytics system
  const processingTime = context.performanceMetrics.processingTime || 0;
  console.log(`Request completed: ${context.analyticsContext.endpoint} (${context.requestId}) in ${processingTime}ms`);
}

/**
 * Check performance thresholds and log warnings
 */
function checkPerformanceThresholds(
  context: EnhancedHandlerContext,
  monitoring: {
    enabled: boolean;
    maxProcessingTime: number;
    trackMemoryUsage: boolean;
  },
): void {
  const processingTime = context.performanceMetrics.processingTime || 0;

  if (processingTime > monitoring.maxProcessingTime) {
    console.warn(`Performance warning: Request ${context.requestId} took ${processingTime}ms (max: ${monitoring.maxProcessingTime}ms)`);
  }

  if (monitoring.trackMemoryUsage && context.performanceMetrics.memoryUsage) {
    const memoryMB = context.performanceMetrics.memoryUsage / (1024 * 1024);
    if (memoryMB > 100) { // 100MB threshold
      console.warn(`Memory warning: Request ${context.requestId} used ${memoryMB.toFixed(2)}MB`);
    }
  }
}

// ============================================================================
// RESPONSE ENHANCEMENT
// ============================================================================

/**
 * Enhance response with additional headers and metadata
 */
function enhanceResponse<T = any>(
  response: NextResponse<T>,
  context: EnhancedHandlerContext,
  config: MiddlewareWrapperConfig,
): NextResponse<T> {
  // Add standard headers
  response.headers.set("X-Request-ID", context.requestId);
  response.headers.set("X-Session-ID", context.sessionId);
  response.headers.set("X-Processing-Time", String(context.performanceMetrics.processingTime || 0));

  // Add mobile optimization headers
  if (config.mobileOptimizations?.enabled) {
    response.headers.set("X-Mobile-Optimized", "true");
    response.headers.set("X-Device-Type", context.isMobile ? "mobile" : context.isTablet ? "tablet" : "desktop");
  }

  // Add performance headers
  if (config.performanceMonitoring?.enabled) {
    response.headers.set("X-Performance-Monitored", "true");
    if (context.performanceMetrics.memoryUsage) {
      response.headers.set("X-Memory-Usage", String(context.performanceMetrics.memoryUsage));
    }
  }

  // Add analytics headers
  if (config.analytics?.enabled) {
    response.headers.set("X-Analytics-Enabled", "true");
    response.headers.set("X-Endpoint", context.analyticsContext.endpoint);
  }

  return response;
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
 * Get or create session ID
 */
function getSessionId(request: NextRequest): string {
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
 * Extract device information from request
 */
async function extractDeviceInfo(request: NextRequest): Promise<DeviceInfo | undefined> {
  const userAgent = request.headers.get("user-agent") || "";

  return {
    deviceType: isMobileDevice(request) ? "mobile" : isTabletDevice(request) ? "tablet" : "desktop",
    operatingSystem: detectOperatingSystem(userAgent),
    browser: detectBrowser(userAgent),
    browserVersion: detectBrowserVersion(userAgent),
    isOnline: true, // Would be detected client-side
    networkType: "unknown", // Would be detected client-side
    batteryLevel: undefined, // Would be detected client-side
    isLowPowerMode: false, // Would be detected client-side
    screenOrientation: "landscape", // Would be detected client-side
    viewportSize: { width: 1920, height: 1080 }, // Would be detected client-side
  };
}

/**
 * Device detection utilities
 */
function isMobileDevice(request: NextRequest): boolean {
  const userAgent = request.headers.get("user-agent") || "";
  return /mobile|android|iphone/i.test(userAgent) && !/tablet|ipad/i.test(userAgent);
}

function isTabletDevice(request: NextRequest): boolean {
  const userAgent = request.headers.get("user-agent") || "";
  return /tablet|ipad/i.test(userAgent);
}

function isDesktopDevice(request: NextRequest): boolean {
  return !isMobileDevice(request) && !isTabletDevice(request);
}

function detectOperatingSystem(userAgent: string): DeviceInfo["operatingSystem"] {
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "ios";
  if (userAgent.includes("Android")) return "android";
  if (userAgent.includes("Windows")) return "windows";
  if (userAgent.includes("Mac")) return "macos";
  if (userAgent.includes("Linux")) return "linux";
  return "unknown";
}

function detectBrowser(userAgent: string): DeviceInfo["browser"] {
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

/**
 * Extract endpoint name from request
 */
function extractEndpointName(request: NextRequest): string {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  return pathParts[pathParts.length - 1] || "unknown";
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.ip ||
    "unknown"
  );
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Shorthand function for GET requests
 */
export function withGET<T = any>(
  request: NextRequest,
  handler: EnhancedHandlerFunction<T>,
  config?: MiddlewareWrapperConfig,
): Promise<NextResponse> {
  return withEnhancedErrorHandling(request, handler, { ...config, method: "GET" });
}

/**
 * Shorthand function for POST requests
 */
export function withPOST<T = any>(
  request: NextRequest,
  handler: EnhancedHandlerFunction<T>,
  config?: MiddlewareWrapperConfig,
): Promise<NextResponse> {
  return withEnhancedErrorHandling(request, handler, { ...config, method: "POST" });
}

/**
 * Shorthand function for PUT requests
 */
export function withPUT<T = any>(
  request: NextRequest,
  handler: EnhancedHandlerFunction<T>,
  config?: MiddlewareWrapperConfig,
): Promise<NextResponse> {
  return withEnhancedErrorHandling(request, handler, { ...config, method: "PUT" });
}

/**
 * Shorthand function for DELETE requests
 */
export function withDELETE<T = any>(
  request: NextRequest,
  handler: EnhancedHandlerFunction<T>,
  config?: MiddlewareWrapperConfig,
): Promise<NextResponse> {
  return withEnhancedErrorHandling(request, handler, { ...config, method: "DELETE" });
}

/**
 * Shorthand function for PATCH requests
 */
export function withPATCH<T = any>(
  request: NextRequest,
  handler: EnhancedHandlerFunction<T>,
  config?: MiddlewareWrapperConfig,
): Promise<NextResponse> {
  return withEnhancedErrorHandling(request, handler, { ...config, method: "PATCH" });
}
