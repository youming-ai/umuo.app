/**
 * Error Handling Middleware Integration Utilities
 *
 * Comprehensive integration utilities for connecting the error handling middleware
 * with various frameworks and libraries used in umuo.app.
 *
 * This module provides:
 * - Next.js API route middleware integration
 * - Express.js compatibility layer
 * - React component error boundary integration
 * - TanStack Query error handling integration
 * - Mobile-specific optimizations
 * - Developer utilities and testing tools
 */

import { errorMiddleware, ErrorMiddleware, MiddlewareContext } from "./error-middleware";
import { ErrorAnalysis } from "./error-classifier";
import { RecoverySuggestion } from "./error-middleware";

// ============================================================================
// NEXT.JS INTEGRATION
// ============================================================================

/**
 * Next.js middleware configuration
 */
export interface NextJSMiddlewareConfig {
  // Basic configuration
  enabled: boolean;
  debugMode: boolean;

  // Route filtering
  includeRoutes: string[];
  excludeRoutes: string[];

  // API route specific settings
  apiRoutes: {
    enabled: boolean;
    timeout: number;
    retryAttempts: number;
  };

  // Page route specific settings
  pageRoutes: {
    enabled: boolean;
    errorPages: {
      404: string;
      500: string;
      custom?: Record<number, string>;
    };
  };
}

/**
 * Create Next.js middleware function
 */
export function createNextJSMiddleware(config: Partial<NextJSMiddlewareConfig> = {}) {
  const middlewareConfig: NextJSMiddlewareConfig = {
    enabled: true,
    debugMode: false,
    includeRoutes: [],
    excludeRoutes: ["/_next", "/api/health"],
    apiRoutes: {
      enabled: true,
      timeout: 30000,
      retryAttempts: 3,
    },
    pageRoutes: {
      enabled: true,
      errorPages: {
        404: "/404",
        500: "/500",
      },
    },
    ...config,
  };

  return async function middleware(request: any) {
    // Check if middleware should process this route
    if (!shouldProcessRoute(request.url, middlewareConfig)) {
      return;
    }

    try {
      // Create middleware context
      const context: MiddlewareContext = {
        timestamp: new Date(),
        requestId: generateRequestId(),
        sessionId: generateSessionId(),
        customData: {
          framework: "nextjs",
          routeType: getRouteType(request.url),
        },
      };

      // Process request through error middleware
      const response = await errorMiddleware.executeNextJSMiddleware(request, context);

      // Return Next.js response if error occurred
      if (response.statusCode !== 200) {
        return NextResponse.json(response.body, {
          status: response.statusCode,
          headers: response.headers,
        });
      }

      return;
    } catch (error) {
      console.error("Next.js middleware error:", error);

      // Return generic error response
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Internal server error",
            code: "MIDDLEWARE_ERROR",
          },
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Create Next.js API route wrapper
 */
export function withErrorMiddleware(
  handler: (req: any, res: any) => Promise<any> | any,
  options: {
    timeout?: number;
    retryAttempts?: number;
    customTransformers?: any[];
  } = {}
) {
  return async function wrappedHandler(req: any, res: any) {
    const startTime = Date.now();

    try {
      // Set up timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          res.status(408).json({
            success: false,
            error: {
              message: "Request timeout",
              code: "TIMEOUT",
            },
          });
        }, options.timeout);
      }

      // Execute handler with error middleware
      const context: MiddlewareContext = {
        timestamp: new Date(),
        requestId: generateRequestId(),
        sessionId: generateSessionId(),
        request: {
          url: req.url,
          method: req.method,
          headers: req.headers,
          query: req.query,
          params: req.params,
          body: req.body,
          startTime,
        },
        customData: {
          framework: "nextjs",
          routeType: "api",
          handler: handler.name || "anonymous",
        },
      };

      const response = await errorMiddleware.executeNextJSMiddleware(req, context);

      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Send response
      return res.status(response.statusCode).json(response.body);
    } catch (error) {
      console.error("API route error:", error);

      // Handle error through middleware
      const context: MiddlewareContext = {
        timestamp: new Date(),
        requestId: generateRequestId(),
        sessionId: generateSessionId(),
        request: {
          url: req.url,
          method: req.method,
          headers: req.headers,
          query: req.query,
          params: req.params,
          body: req.body,
          startTime,
        },
        customData: {
          framework: "nextjs",
          routeType: "api",
          handler: handler.name || "anonymous",
          originalError: error,
        },
      };

      const response = await errorMiddleware.handleError(error, context);

      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      return res.status(response.statusCode).json(response.body);
    }
  };
}

/**
 * Next.js page error boundary component
 */
export function NextJSErrorBoundary({
  children,
  fallback,
  onError,
}: {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: any) => void;
}) {
  return (
    <ErrorBoundaryComponent
      fallback={fallback}
      onError={async (error, errorInfo) => {
        // Report error through middleware
        await errorMiddleware.handleReactError(error, errorInfo);

        // Call custom error handler
        if (onError) {
          onError(error, errorInfo);
        }
      }}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}

// ============================================================================
// EXPRESS.JS INTEGRATION
// ============================================================================

/**
 * Express.js middleware wrapper
 */
export function createExpressMiddleware(config: {
  timeout?: number;
  trustProxy?: boolean;
  excludePaths?: string[];
} = {}) {
  return function expressMiddleware(req: any, res: any, next: any) {
    // Check if path should be excluded
    if (config.excludePaths?.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Set up timeout if specified
    if (config.timeout) {
      req.setTimeout(config.timeout);
    }

    // Trust proxy if specified
    if (config.trustProxy) {
      req.trustProxy = true;
    }

    // Execute through error middleware
    errorMiddleware.executeExpressMiddleware(req, res, next);
  };
}

/**
 * Express.js error handler
 */
export function createExpressErrorHandler(
  options: {
    sendClientErrors?: boolean;
    logErrors?: boolean;
    errorLogger?: (err: any, req: any, res: any) => void;
  } = {}
) {
  return function expressErrorHandler(err: any, req: any, res: any, next: any) {
    // Log error if enabled
    if (options.logErrors !== false) {
      if (options.errorLogger) {
        options.errorLogger(err, req, res);
      } else {
        console.error("Express error:", err);
      }
    }

    // Don't send error details to client in production
    if (!options.sendClientErrors && process.env.NODE_ENV === "production") {
      return res.status(500).json({
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      });
    }

    // Create middleware context
    const context: MiddlewareContext = {
      timestamp: new Date(),
      requestId: generateRequestId(),
      sessionId: generateSessionId(),
      request: {
        url: req.url,
        method: req.method,
        headers: req.headers,
        query: req.query,
        params: req.params,
        body: req.body,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        referer: req.get("Referer"),
        origin: req.get("Origin"),
      },
      customData: {
        framework: "express",
        originalError: err,
      },
    };

    // Handle error through middleware
    errorMiddleware.handleError(err, context).then(response => {
      res.status(response.statusCode);
      Object.entries(response.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
      res.json(response.body);
    }).catch(handleError => {
      console.error("Error in error handler:", handleError);
      res.status(500).json({
        success: false,
        error: {
          message: "Error processing failed",
          code: "ERROR_HANDLER_FAILED",
        },
      });
    });
  };
}

// ============================================================================
// REACT ERROR BOUNDARY INTEGRATION
// ============================================================================

/**
 * React Error Boundary with middleware integration
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    errorInfo?: any;
    retry: () => void;
    recovery?: RecoverySuggestion[];
  }>;
  onError?: (error: Error, errorInfo: any, analysis?: ErrorAnalysis) => void;
  enableRecovery?: boolean;
}

class ErrorBoundaryComponent extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ errorInfo });

    // Handle error through middleware
    errorMiddleware.handleReactError(error, errorInfo).then(result => {
      this.setState({
        error: result.error as any,
        recovery: result.recovery,
        analysis: result.analysis,
      });

      // Call custom error handler
      if (this.props.onError) {
        this.props.onError(error, errorInfo, result.analysis);
      }
    }).catch(handleError => {
      console.error("React error boundary handler failed:", handleError);
    });
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        recovery: undefined,
        analysis: undefined,
      });
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retry={this.handleRetry}
          recovery={this.state.recovery}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({
  error,
  retry,
  recovery
}: {
  error: Error;
  retry: () => void;
  recovery?: RecoverySuggestion[];
}) {
  return (
    <div style={{
      padding: "2rem",
      textAlign: "center",
      border: "1px solid #ff6b6b",
      borderRadius: "8px",
      backgroundColor: "#ffe0e0",
      margin: "1rem 0",
    }}>
      <h2 style={{ color: "#d63031", marginBottom: "1rem" }}>
        Something went wrong
      </h2>
      <p style={{ color: "#636e72", marginBottom: "1rem" }}>
        {error.message || "An unexpected error occurred"}
      </p>

      {recovery && recovery.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ color: "#2d3436", marginBottom: "0.5rem" }}>
            Recovery Options:
          </h3>
          {recovery.map((suggestion, index) => (
            <div key={index} style={{ marginBottom: "0.5rem" }}>
              <strong>{suggestion.title}:</strong> {suggestion.description}
              {suggestion.primaryAction && (
                <button
                  onClick={retry}
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.25rem 0.5rem",
                    backgroundColor: "#0984e3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {suggestion.primaryAction.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={retry}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#00b894",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginRight: "0.5rem",
        }}
      >
        Try Again
      </button>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#636e72",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Refresh Page
      </button>
    </div>
  );
}

// ============================================================================
// TANSTACK QUERY INTEGRATION
// ============================================================================

/**
 * TanStack Query error handler options
 */
export interface TanStackQueryErrorHandlerOptions {
  // Retry configuration
  retry?: boolean | number;
  retryDelay?: (attemptIndex: number) => number;

  // Error handling configuration
  useErrorBoundary?: boolean;
  throwOnError?: boolean;

  // Custom error handling
  onError?: (error: any, query: any) => void;
  onSuccess?: (data: any, query: any) => void;
  onSettled?: (data: any | undefined, error: any | null, query: any) => void;

  // Recovery integration
  enableRecovery?: boolean;
  customRecoveryActions?: (error: any, query: any) => RecoveryAction[];
}

/**
 * Create TanStack Query error handler
 */
export function createQueryErrorHandler(
  options: TanStackQueryErrorHandlerOptions = {}
) {
  return function handleQueryError(error: any, query: any) {
    // Get query information
    const queryKey = query.queryKey;
    const queryType = "query";
    const variables = query.state?.variables;

    // Handle error through middleware
    errorMiddleware.handleQueryError(error, queryKey, queryType, variables).then(result => {
      // Log error details
      console.warn("Query error handled:", {
        type: result.analysis.type,
        category: result.analysis.category,
        severity: result.analysis.severity,
        shouldRetry: result.shouldRetry,
        retryDelay: result.retryDelay,
      });

      // Call custom error handler
      if (options.onError) {
        options.onError(error, query);
      }

      // Show user notification if configured
      if (options.enableRecovery && result.recovery.length > 0) {
        showRecoveryNotification(result.recovery[0]);
      }
    }).catch(handleError => {
      console.error("Query error handler failed:", handleError);
    });
  };
}

/**
 * Create TanStack Query mutation error handler
 */
export function createMutationErrorHandler(
  options: TanStackQueryErrorHandlerOptions = {}
) {
  return function handleMutationError(error: any, variables: any, context: any, mutation: any) {
    // Get mutation information
    const queryKey = mutation.options.mutationKey;
    const queryType = "mutation";
    const mutationVariables = variables;

    // Handle error through middleware
    errorMiddleware.handleQueryError(error, queryKey, queryType, mutationVariables).then(result => {
      // Log error details
      console.warn("Mutation error handled:", {
        type: result.analysis.type,
        category: result.analysis.category,
        severity: result.analysis.severity,
        shouldRetry: result.shouldRetry,
        retryDelay: result.retryDelay,
      });

      // Call custom error handler
      if (options.onError) {
        options.onError(error, mutation);
      }

      // Show user notification if configured
      if (options.enableRecovery && result.recovery.length > 0) {
        showRecoveryNotification(result.recovery[0]);
      }
    }).catch(handleError => {
      console.error("Mutation error handler failed:", handleError);
    });
  };
}

/**
 * Enhanced query options with error handling
 */
export function createEnhancedQueryOptions(
  baseOptions: any = {},
  errorHandlerOptions: TanStackQueryErrorHandlerOptions = {}
) {
  const errorHandler = createQueryErrorHandler(errorHandlerOptions);

  return {
    ...baseOptions,
    retry: errorHandlerOptions.retry ?? 3,
    retryDelay: errorHandlerOptions.retryDelay ?? ((attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)),
    useErrorBoundary: errorHandlerOptions.useErrorBoundary ?? false,
    throwOnError: errorHandlerOptions.throwOnError ?? false,
    onError: (error: any, query: any) => {
      errorHandler(error, query);
      if (baseOptions.onError) {
        baseOptions.onError(error, query);
      }
    },
    onSuccess: (data: any, query: any) => {
      if (errorHandlerOptions.onSuccess) {
        errorHandlerOptions.onSuccess(data, query);
      }
      if (baseOptions.onSuccess) {
        baseOptions.onSuccess(data, query);
      }
    },
    onSettled: (data: any | undefined, error: any | null, query: any) => {
      if (errorHandlerOptions.onSettled) {
        errorHandlerOptions.onSettled(data, error, query);
      }
      if (baseOptions.onSettled) {
        baseOptions.onSettled(data, error, query);
      }
    },
  };
}

/**
 * Enhanced mutation options with error handling
 */
export function createEnhancedMutationOptions(
  baseOptions: any = {},
  errorHandlerOptions: TanStackQueryErrorHandlerOptions = {}
) {
  const errorHandler = createMutationErrorHandler(errorHandlerOptions);

  return {
    ...baseOptions,
    retry: errorHandlerOptions.retry ?? 1,
    useErrorBoundary: errorHandlerOptions.useErrorBoundary ?? false,
    throwOnError: errorHandlerOptions.throwOnError ?? false,
    onError: (error: any, variables: any, context: any, mutation: any) => {
      errorHandler(error, variables, context, mutation);
      if (baseOptions.onError) {
        baseOptions.onError(error, variables, context, mutation);
      }
    },
    onSuccess: (data: any, variables: any, context: any, mutation: any) => {
      if (errorHandlerOptions.onSuccess) {
        errorHandlerOptions.onSuccess(data, mutation);
      }
      if (baseOptions.onSuccess) {
        baseOptions.onSuccess(data, variables, context, mutation);
      }
    },
    onSettled: (data: any | undefined, error: any | null, variables: any, context: any, mutation: any) => {
      if (errorHandlerOptions.onSettled) {
        errorHandlerOptions.onSettled(data, error, mutation);
      }
      if (baseOptions.onSettled) {
        baseOptions.onSettled(data, error, variables, context, mutation);
      }
    },
  };
}

// ============================================================================
// MOBILE-SPECIFIC INTEGRATIONS
// ============================================================================

/**
 * Mobile error handling hook
 */
export function useMobileErrorHandler() {
  const [currentError, setCurrentError] = useState<{
    error: Error;
    analysis: ErrorAnalysis;
    recovery: RecoverySuggestion[];
  } | null>(null);

  const handleError = useCallback(async (error: Error) => {
    try {
      const result = await errorMiddleware.handleReactError(error, null);
      setCurrentError({
        error: result.error as Error,
        analysis: result.analysis,
        recovery: result.recovery,
      });
    } catch (handleError) {
      console.error("Mobile error handler failed:", handleError);
    }
  }, []);

  const clearError = useCallback(() => {
    setCurrentError(null);
  }, []);

  const retry = useCallback(() => {
    if (currentError && currentError.recovery.length > 0) {
      const primaryRecovery = currentError.recovery[0];
      if (primaryRecovery.primaryAction) {
        executeRecoveryAction(primaryRecovery.primaryAction);
      }
      clearError();
    }
  }, [currentError, clearError]);

  return {
    currentError,
    handleError,
    clearError,
    retry,
    hasError: !!currentError,
  };
}

/**
 * Touch-friendly error component for mobile
 */
export function MobileErrorDisplay({
  error,
  analysis,
  recovery,
  onDismiss,
  onRetry,
}: {
  error: Error;
  analysis: ErrorAnalysis;
  recovery: RecoverySuggestion[];
  onDismiss: () => void;
  onRetry: () => void;
}) {
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "white",
      borderTopLeftRadius: "16px",
      borderTopRightRadius: "16px",
      boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
      padding: "1.5rem",
      zIndex: 1000,
      minHeight: "200px",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
      }}>
        <h3 style={{
          margin: 0,
          fontSize: "1.1rem",
          color: "#2d3436",
        }}>
          Error
        </h3>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            color: "#636e72",
            cursor: "pointer",
            padding: "0.25rem",
          }}
        >
          ×
        </button>
      </div>

      <p style={{
        margin: "0 0 1rem 0",
        fontSize: "0.9rem",
        color: "#636e72",
        lineHeight: "1.4",
      }}>
        {error.message || "An unexpected error occurred"}
      </p>

      {recovery.length > 0 && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}>
          {recovery.map((suggestion, index) => (
            <div key={index}>
              <p style={{
                margin: "0 0 0.5rem 0",
                fontSize: "0.85rem",
                color: "#2d3436",
                fontWeight: "500",
              }}>
                {suggestion.title}
              </p>
              <button
                onClick={onRetry}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "#0984e3",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  minHeight: "44px", // Touch target size
                }}
              >
                {suggestion.primaryAction?.label || "Try Again"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
 * Generate unique session ID
 */
function generateSessionId(): string {
  if (typeof window !== "undefined") {
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
 * Check if route should be processed
 */
function shouldProcessRoute(url: string, config: NextJSMiddlewareConfig): boolean {
  if (!config.enabled) return false;

  // Check excluded routes
  if (config.excludeRoutes.some(route => url.startsWith(route))) {
    return false;
  }

  // Check included routes (if specified)
  if (config.includeRoutes.length > 0) {
    return config.includeRoutes.some(route => url.startsWith(route));
  }

  return true;
}

/**
 * Get route type from URL
 */
function getRouteType(url: string): "api" | "page" | "static" {
  if (url.startsWith("/api/")) return "api";
  if (url.includes(".")) return "static";
  return "page";
}

/**
 * Execute recovery action
 */
function executeRecoveryAction(action: any): void {
  switch (action.type) {
    case "retry":
      window.location.reload();
      break;
    case "refresh":
      window.location.reload();
      break;
    case "navigate":
      if (action.target) {
        window.location.href = action.target;
      }
      break;
    case "custom":
      if (action.action) {
        action.action();
      }
      break;
  }
}

/**
 * Show recovery notification
 */
function showRecoveryNotification(suggestion: RecoverySuggestion): void {
  // This would integrate with your notification system
  // For now, just log to console
  console.log("Recovery suggestion:", suggestion);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ErrorBoundaryComponent as ReactErrorBoundary,
  DefaultErrorFallback,
};

export type {
  ErrorBoundaryProps,
  NextJSMiddlewareConfig,
  TanStackQueryErrorHandlerOptions,
};

// Import React for components
import React, { useState, useCallback } from "react";
import { NextResponse } from "next/server";
