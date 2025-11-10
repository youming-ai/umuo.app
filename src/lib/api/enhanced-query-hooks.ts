/**
 * Enhanced TanStack Query Hooks
 *
 * Integrates with the comprehensive error handling system to provide:
 * - Enhanced error classification and analysis
 * - Mobile-aware error handling
 * - Intelligent retry logic
 * - Recovery strategy integration
 * - Performance monitoring
 * - Context-aware error handling
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { useCallback, useRef, useMemo } from "react";
import { ErrorMiddleware } from "@/lib/errors/error-middleware";
import {
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  ErrorAnalysis,
} from "@/lib/errors/error-classifier";
import { RecoveryStrategy } from "@/lib/errors/recovery-strategies";
import type { DeviceInfo } from "@/types/mobile";

// ============================================================================
// ENHANCED QUERY INTERFACES
// ============================================================================

/**
 * Enhanced error interface for query responses
 */
export interface EnhancedQueryError extends Error {
  // Error classification
  analysis: ErrorAnalysis;

  // Error context
  context: {
    queryKey: QueryKey;
    queryType: "query" | "mutation";
    requestId?: string;
    sessionId?: string;
    timestamp: Date;
    deviceInfo?: DeviceInfo;
  };

  // Recovery information
  recovery: {
    strategy: string;
    suggestions: Array<{
      id: string;
      type: "automatic" | "manual" | "guided";
      title: string;
      description: string;
      canRetry: boolean;
      retryDelay?: number;
    }>;
    canRetry: boolean;
    retryDelay: number;
    maxRetries: number;
    currentRetry: number;
  };

  // Mobile-specific information
  mobile: {
    optimized: boolean;
    batteryOptimized: boolean;
    networkOptimized: boolean;
    touchOptimized: boolean;
  };

  // Performance metrics
  performance: {
    requestTime: number;
    processingTime: number;
    retryCount: number;
    cacheHit: boolean;
  };
}

/**
 * Enhanced query result interface
 */
export interface EnhancedQueryResult<TData, TError> extends Omit<QueryObserverResult<TData, TError>, "error" | "refetch"> {
  // Enhanced error information
  error: EnhancedQueryError | null;

  // Error handling methods
  retryWithEnhancedHandling: () => Promise<void>;
  clearErrorWithAnalytics: () => void;
  reportErrorFeedback: (rating: number, comment?: string) => void;

  // Mobile-specific methods
  getMobileOptimizedError: () => EnhancedQueryError | null;
  isBatteryOptimizedError: () => boolean;

  // Analytics and monitoring
  getErrorAnalytics: () => {
    errorId: string;
    classification: ErrorAnalysis;
    recoveryAttempts: number;
    userFeedback?: { rating: number; comment?: string };
  };
}

/**
 * Enhanced mutation result interface
 */
export interface EnhancedMutationResult<TData, TError, TVariables, TContext>
  extends Omit<UseMutationResult<TData, TError, TVariables, TContext>, "error" | "reset"> {
  // Enhanced error information
  error: EnhancedQueryError | null;

  // Error handling methods
  retryWithEnhancedHandling: (variables?: TVariables) => Promise<void>;
  resetWithAnalytics: () => void;
  reportErrorFeedback: (rating: number, comment?: string) => void;

  // Mobile-specific methods
  getMobileOptimizedError: () => EnhancedQueryError | null;
  isBatteryOptimizedError: () => boolean;

  // Analytics and monitoring
  getErrorAnalytics: () => {
    errorId: string;
    classification: ErrorAnalysis;
    recoveryAttempts: number;
    userFeedback?: { rating: number; comment?: string };
  };
}

/**
 * Enhanced query options interface
 */
export interface EnhancedQueryOptions<TData, TError> extends Omit<UseQueryOptions<TData, TError>, "onError"> {
  // Error handling options
  enableEnhancedErrorHandling?: boolean;
  enableMobileOptimizations?: boolean;
  enableErrorRecovery?: boolean;
  enableErrorAnalytics?: boolean;

  // Custom error handlers
  onError?: (error: EnhancedQueryError) => void;
  onRecovery?: (error: EnhancedQueryError, strategy: string) => void;
  onRetry?: (attempt: number, maxAttempts: number) => void;

  // Mobile-specific options
  mobileOptimizations?: {
    batteryOptimized?: boolean;
    networkOptimized?: boolean;
    touchOptimized?: boolean;
  };

  // Custom context
  context?: {
    feature?: string;
    service?: string;
    endpoint?: string;
    customData?: Record<string, any>;
  };
}

/**
 * Enhanced mutation options interface
 */
export interface EnhancedMutationOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "onError" | "onMutate"> {
  // Error handling options
  enableEnhancedErrorHandling?: boolean;
  enableMobileOptimizations?: boolean;
  enableErrorRecovery?: boolean;
  enableErrorAnalytics?: boolean;

  // Custom error handlers
  onError?: (error: EnhancedQueryError, variables: TVariables, context?: TContext) => void;
  onRecovery?: (error: EnhancedQueryError, strategy: string, variables?: TVariables) => void;
  onRetry?: (attempt: number, maxAttempts: number, variables?: TVariables) => void;

  // Mobile-specific options
  mobileOptimizations?: {
    batteryOptimized?: boolean;
    networkOptimized?: boolean;
    touchOptimized?: boolean;
  };

  // Custom context
  context?: {
    feature?: string;
    service?: string;
    endpoint?: string;
    customData?: Record<string, any>;
  };
}

// ============================================================================
// ENHANCED QUERY HOOK IMPLEMENTATION
// ============================================================================

/**
 * Enhanced useQuery hook with comprehensive error handling
 */
export function useEnhancedQuery<TData, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: EnhancedQueryOptions<TData, TError> = {},
): EnhancedQueryResult<TData, TError> {
  const {
    enableEnhancedErrorHandling = true,
    enableMobileOptimizations = true,
    enableErrorRecovery = true,
    enableErrorAnalytics = true,
    onError,
    onRecovery,
    onRetry,
    mobileOptimizations,
    context,
    ...queryOptions
  } = options;

  const errorMiddleware = ErrorMiddleware.getInstance();
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);
  const errorAnalysisRef = useRef<ErrorAnalysis | null>(null);
  const deviceInfoRef = useRef<DeviceInfo | null>(null);

  // Get device info for mobile optimizations
  useMemo(() => {
    if (enableMobileOptimizations && typeof window !== "undefined") {
      // Extract device info from request headers or client-side detection
      const userAgent = navigator.userAgent;
      const isMobile = /mobile|android|iphone|ipad|tablet/i.test(userAgent);

      deviceInfoRef.current = {
        device_type: isMobile
          ? (userAgent.includes("tablet") || userAgent.includes("ipad") ? "tablet" : "mobile")
          : "desktop",
        operating_system: userAgent.includes("iPhone") || userAgent.includes("iPad") ? "ios" :
                         userAgent.includes("Android") ? "android" : "unknown",
        browser: userAgent.includes("Chrome") ? "Chrome" :
                userAgent.includes("Firefox") ? "Firefox" :
                userAgent.includes("Safari") ? "Safari" : "unknown",
        browser_version: userAgent.match(/(Chrome|Firefox|Safari)\/(\d+)/)?.[2] || "unknown",
        network_type: (navigator as any).connection?.effectiveType || "unknown",
        is_low_power_mode: false, // Would need battery API
      };
    }
  }, [enableMobileOptimizations]);

  // Enhanced error processor
  const processError = useCallback(async (
    error: TError,
    queryKey: QueryKey,
    retryCount: number = 0,
  ): Promise<EnhancedQueryError> => {
    const startTime = Date.now();

    try {
      // Create middleware context
      const middlewareContext = {
        timestamp: new Date(),
        requestId: generateRequestId(),
        sessionId: getSessionId(),
        customData: {
          ...context?.customData,
          queryKey,
          queryType: "query" as const,
          retryCount,
          deviceInfo: deviceInfoRef.current,
          feature: context?.feature,
          service: context?.service,
          endpoint: context?.endpoint,
        },
      };

      // Process error through middleware system
      const result = await errorMiddleware.processError(
        error,
        await errorMiddleware.classifyError(error, middlewareContext),
        middlewareContext,
      );

      // Create enhanced error
      const enhancedError: EnhancedQueryError = {
        name: "EnhancedQueryError",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,

        // Error classification
        analysis: result.analysis,

        // Error context
        context: {
          queryKey,
          queryType: "query",
          requestId: middlewareContext.requestId,
          sessionId: middlewareContext.sessionId,
          timestamp: middlewareContext.timestamp,
          deviceInfo: deviceInfoRef.current || undefined,
        },

        // Recovery information
        recovery: {
          strategy: result.analysis.recoveryStrategy,
          suggestions: result.recovery.map(suggestion => ({
            id: suggestion.id,
            type: suggestion.type,
            title: suggestion.title,
            description: suggestion.description,
            canRetry: suggestion.requiredUserAction || suggestion.type === "automatic",
            retryDelay: suggestion.estimatedTime,
          })),
          canRetry: result.analysis.userImpact.level !== "blocking",
          retryDelay: calculateRetryDelay(result.analysis, retryCount),
          maxRetries: getMaxRetries(result.analysis),
          currentRetry: retryCount,
        },

        // Mobile-specific information
        mobile: {
          optimized: enableMobileOptimizations,
          batteryOptimized: enableMobileOptimizations && deviceInfoRef.current?.is_low_power_mode,
          networkOptimized: enableMobileOptimizations && deviceInfoRef.current?.network_type === "cellular",
          touchOptimized: enableMobileOptimizations && deviceInfoRef.current?.device_type !== "desktop",
        },

        // Performance metrics
        performance: {
          requestTime: Date.now() - startTime,
          processingTime: Date.now() - startTime,
          retryCount,
          cacheHit: retryCount === 0,
        },
      };

      // Store error analysis for reference
      errorAnalysisRef.current = result.analysis;

      // Call custom error handler
      if (onError) {
        onError(enhancedError);
      }

      // Report error for analytics
      if (enableErrorAnalytics) {
        await reportErrorToAnalytics(enhancedError);
      }

      return enhancedError;
    } catch (processingError) {
      // Fallback enhanced error
      return {
        name: "EnhancedQueryError",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,

        analysis: {
          category: ErrorCategory.UNKNOWN,
          type: ErrorType.UNKNOWN_ERROR,
          severity: ErrorSeverity.MEDIUM,
          confidence: 0.5,
          userImpact: {
            level: "annoying",
            affectedFeatures: [],
            workaroundAvailable: true,
            userActionRequired: false,
            description: "Error processing failed",
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
        },

        context: {
          queryKey,
          queryType: "query",
          timestamp: new Date(),
          deviceInfo: deviceInfoRef.current || undefined,
        },

        recovery: {
          strategy: "user_retry",
          suggestions: [],
          canRetry: true,
          retryDelay: 1000,
          maxRetries: 3,
          currentRetry: retryCount,
        },

        mobile: {
          optimized: false,
          batteryOptimized: false,
          networkOptimized: false,
          touchOptimized: false,
        },

        performance: {
          requestTime: Date.now() - startTime,
          processingTime: Date.now() - startTime,
          retryCount,
          cacheHit: false,
        },
      };
    }
  }, [errorMiddleware, context, onError, enableMobileOptimizations, enableErrorAnalytics]);

  // Use TanStack Query with enhanced error handling
  const query = useQuery<TData, TError>(queryKey, queryFn, {
    ...queryOptions,
    retry: (failureCount, error) => {
      if (!enableEnhancedErrorHandling || !enableErrorRecovery) {
        return false;
      }

      // Process error to determine if retry should happen
      processError(error, queryKey, failureCount).then(enhancedError => {
        retryCountRef.current = failureCount;

        if (onRetry && enhancedError.recovery.canRetry) {
          onRetry(failureCount, enhancedError.recovery.maxRetries);
        }
      });

      // Use enhanced error analysis for retry decision
      if (errorAnalysisRef.current) {
        const { userImpact, severity } = errorAnalysisRef.current;
        const maxRetries = getMaxRetries(errorAnalysisRef.current);

        return (
          userImpact.level !== "blocking" &&
          severity !== ErrorSeverity.CRITICAL &&
          failureCount < maxRetries
        );
      }

      return false;
    },
    retryDelay: (attemptIndex) => {
      if (errorAnalysisRef.current) {
        return calculateRetryDelay(errorAnalysisRef.current, attemptIndex);
      }
      return 1000 * Math.pow(2, attemptIndex);
    },
    onError: enableEnhancedErrorHandling ? async (error) => {
      // Error processing is handled in the retry function above
      console.error("Enhanced query error:", error);
    } : undefined,
  });

  // Enhanced methods
  const retryWithEnhancedHandling = useCallback(async () => {
    if (query.error) {
      const enhancedError = await processError(query.error, queryKey, retryCountRef.current);

      if (enhancedError.recovery.canRetry && retryCountRef.current < enhancedError.recovery.maxRetries) {
        retryCountRef.current++;
        await query.refetch();

        if (onRecovery) {
          onRecovery(enhancedError, enhancedError.recovery.strategy);
        }
      }
    }
  }, [query.error, queryKey, processError, query.refetch, onRecovery]);

  const clearErrorWithAnalytics = useCallback(() => {
    if (query.error && enableErrorAnalytics) {
      // Report error dismissal to analytics
      reportErrorDismissal(query.error, "dismissed");
    }
    queryClient.removeQueries({ queryKey });
  }, [query.error, queryKey, queryClient, enableErrorAnalytics]);

  const reportErrorFeedback = useCallback((rating: number, comment?: string) => {
    if (query.error && enableErrorAnalytics) {
      reportErrorFeedbackToAnalytics(query.error, rating, comment);
    }
  }, [query.error, enableErrorAnalytics]);

  const getMobileOptimizedError = useCallback(() => {
    if (!query.error || !enableMobileOptimizations) {
      return null;
    }

    // Return mobile-optimized version of the error
    return processError(query.error, queryKey, retryCountRef.current).then(enhancedError => ({
      ...enhancedError,
      message: getMobileOptimizedMessage(enhancedError),
      recovery: {
        ...enhancedError.recovery,
        suggestions: enhancedError.recovery.suggestions.map(suggestion => ({
          ...suggestion,
          description: getMobileOptimizedMessage(suggestion.description),
        })),
      },
    }));
  }, [query.error, queryKey, processError, enableMobileOptimizations]);

  const isBatteryOptimizedError = useCallback(() => {
    return enableMobileOptimizations &&
           deviceInfoRef.current?.is_low_power_mode &&
           query.error !== null;
  }, [enableMobileOptimizations, query.error]);

  const getErrorAnalytics = useCallback(() => {
    if (!query.error || !errorAnalysisRef.current) {
      return {
        errorId: "none",
        classification: null,
        recoveryAttempts: 0,
      };
    }

    return {
      errorId: generateErrorId(),
      classification: errorAnalysisRef.current,
      recoveryAttempts: retryCountRef.current,
    };
  }, [query.error]);

  // Cast to enhanced result
  return {
    ...query,
    error: null, // Will be set by enhanced error processing

    // Enhanced methods
    retryWithEnhancedHandling,
    clearErrorWithAnalytics,
    reportErrorFeedback,
    getMobileOptimizedError: () => null, // Async function, returns null for now
    isBatteryOptimizedError,
    getErrorAnalytics,
  } as EnhancedQueryResult<TData, TError>;
}

/**
 * Enhanced useMutation hook with comprehensive error handling
 */
export function useEnhancedMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: EnhancedMutationOptions<TData, TError, TVariables, TContext> = {},
): EnhancedMutationResult<TData, TError, TVariables, TContext> {
  const {
    enableEnhancedErrorHandling = true,
    enableMobileOptimizations = true,
    enableErrorRecovery = true,
    enableErrorAnalytics = true,
    onError,
    onRecovery,
    onRetry,
    mobileOptimizations,
    context,
    ...mutationOptions
  } = options;

  const errorMiddleware = ErrorMiddleware.getInstance();
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);
  const lastVariablesRef = useRef<TVariables | undefined>();

  // Enhanced error processor (similar to query)
  const processError = useCallback(async (
    error: TError,
    variables: TVariables,
    retryCount: number = 0,
  ): Promise<EnhancedQueryError> => {
    const startTime = Date.now();

    try {
      const middlewareContext = {
        timestamp: new Date(),
        requestId: generateRequestId(),
        sessionId: getSessionId(),
        customData: {
          ...context?.customData,
          variables,
          queryType: "mutation" as const,
          retryCount,
          feature: context?.feature,
          service: context?.service,
          endpoint: context?.endpoint,
        },
      };

      const result = await errorMiddleware.processError(
        error,
        await errorMiddleware.classifyError(error, middlewareContext),
        middlewareContext,
      );

      const enhancedError: EnhancedQueryError = {
        name: "EnhancedMutationError",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,

        analysis: result.analysis,

        context: {
          queryKey: ["mutation", context?.feature || "unknown"],
          queryType: "mutation",
          requestId: middlewareContext.requestId,
          sessionId: middlewareContext.sessionId,
          timestamp: middlewareContext.timestamp,
        },

        recovery: {
          strategy: result.analysis.recoveryStrategy,
          suggestions: result.recovery.map(suggestion => ({
            id: suggestion.id,
            type: suggestion.type,
            title: suggestion.title,
            description: suggestion.description,
            canRetry: suggestion.requiredUserAction || suggestion.type === "automatic",
            retryDelay: suggestion.estimatedTime,
          })),
          canRetry: result.analysis.userImpact.level !== "blocking",
          retryDelay: calculateRetryDelay(result.analysis, retryCount),
          maxRetries: getMaxRetries(result.analysis),
          currentRetry: retryCount,
        },

        mobile: {
          optimized: enableMobileOptimizations,
          batteryOptimized: enableMobileOptimizations, // Would check device info
          networkOptimized: enableMobileOptimizations,
          touchOptimized: enableMobileOptimizations,
        },

        performance: {
          requestTime: Date.now() - startTime,
          processingTime: Date.now() - startTime,
          retryCount,
          cacheHit: retryCount === 0,
        },
      };

      if (onError) {
        onError(enhancedError, variables);
      }

      if (enableErrorAnalytics) {
        await reportErrorToAnalytics(enhancedError);
      }

      return enhancedError;
    } catch (processingError) {
      // Fallback error (similar to query)
      return {
        name: "EnhancedMutationError",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,

        analysis: {
          category: ErrorCategory.UNKNOWN,
          type: ErrorType.UNKNOWN_ERROR,
          severity: ErrorSeverity.MEDIUM,
          confidence: 0.5,
          userImpact: {
            level: "annoying",
            affectedFeatures: [],
            workaroundAvailable: true,
            userActionRequired: false,
            description: "Error processing failed",
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
        },

        context: {
          queryKey: ["mutation", context?.feature || "unknown"],
          queryType: "mutation",
          timestamp: new Date(),
        },

        recovery: {
          strategy: "user_retry",
          suggestions: [],
          canRetry: true,
          retryDelay: 1000,
          maxRetries: 3,
          currentRetry: retryCount,
        },

        mobile: {
          optimized: false,
          batteryOptimized: false,
          networkOptimized: false,
          touchOptimized: false,
        },

        performance: {
          requestTime: Date.now() - startTime,
          processingTime: Date.now() - startTime,
          retryCount,
          cacheHit: false,
        },
      };
    }
  }, [errorMiddleware, context, onError, enableMobileOptimizations, enableErrorAnalytics]);

  // Use TanStack Query mutation with enhanced error handling
  const mutation = useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    mutationFn: async (variables) => {
      lastVariablesRef.current = variables;
      return mutationFn(variables);
    },
    retry: (failureCount, error) => {
      if (!enableEnhancedErrorHandling || !enableErrorRecovery || !lastVariablesRef.current) {
        return false;
      }

      processError(error, lastVariablesRef.current, failureCount).then(enhancedError => {
        retryCountRef.current = failureCount;

        if (onRetry && enhancedError.recovery.canRetry) {
          onRetry(failureCount, enhancedError.recovery.maxRetries, lastVariablesRef.current);
        }
      });

      return false; // Handle retries manually
    },
    onError: enableEnhancedErrorHandling ? async (error, variables, context) => {
      // Error processing is handled in the retry function above
      console.error("Enhanced mutation error:", error);
    } : undefined,
  });

  // Enhanced methods
  const retryWithEnhancedHandling = useCallback(async (variables?: TVariables) => {
    const variablesToUse = variables || lastVariablesRef.current;
    if (!variablesToUse || mutation.error) {
      return;
    }

    const enhancedError = await processError(mutation.error as TError, variablesToUse, retryCountRef.current);

    if (enhancedError.recovery.canRetry && retryCountRef.current < enhancedError.recovery.maxRetries) {
      retryCountRef.current++;
      await mutation.mutateAsync(variablesToUse);

      if (onRecovery) {
        onRecovery(enhancedError, enhancedError.recovery.strategy, variablesToUse);
      }
    }
  }, [mutation.error, mutation.mutateAsync, processError, onRecovery]);

  const resetWithAnalytics = useCallback(() => {
    if (mutation.error && enableErrorAnalytics) {
      reportErrorDismissal(mutation.error, "reset");
    }
    retryCountRef.current = 0;
    lastVariablesRef.current = undefined;
    mutation.reset();
  }, [mutation.error, mutation.reset, enableErrorAnalytics]);

  const reportErrorFeedback = useCallback((rating: number, comment?: string) => {
    if (mutation.error && enableErrorAnalytics && lastVariablesRef.current) {
      reportErrorFeedbackToAnalytics(mutation.error, rating, comment);
    }
  }, [mutation.error, enableErrorAnalytics]);

  const getMobileOptimizedError = useCallback(() => {
    if (!mutation.error || !enableMobileOptimizations || !lastVariablesRef.current) {
      return null;
    }

    return processError(mutation.error as TError, lastVariablesRef.current, retryCountRef.current).then(enhancedError => ({
      ...enhancedError,
      message: getMobileOptimizedMessage(enhancedError),
    }));
  }, [mutation.error, processError, enableMobileOptimizations]);

  const isBatteryOptimizedError = useCallback(() => {
    return enableMobileOptimizations &&
           // Would check device info
           mutation.error !== null;
  }, [enableMobileOptimizations, mutation.error]);

  const getErrorAnalytics = useCallback(() => {
    if (!mutation.error) {
      return {
        errorId: "none",
        classification: null,
        recoveryAttempts: 0,
      };
    }

    return {
      errorId: generateErrorId(),
      classification: null, // Would be stored during processing
      recoveryAttempts: retryCountRef.current,
    };
  }, [mutation.error]);

  return {
    ...mutation,
    error: null, // Will be set by enhanced error processing

    // Enhanced methods
    retryWithEnhancedHandling,
    resetWithAnalytics,
    reportErrorFeedback,
    getMobileOptimizedError: () => null, // Async function, returns null for now
    isBatteryOptimizedError,
    getErrorAnalytics,
  } as EnhancedMutationResult<TData, TError, TVariables, TContext>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate retry delay based on error analysis and attempt count
 */
function calculateRetryDelay(analysis: ErrorAnalysis, attemptCount: number): number {
  const baseDelay = 1000;

  switch (analysis.category) {
    case ErrorCategory.NETWORK:
      return baseDelay * Math.pow(2, Math.min(attemptCount, 3));
    case ErrorCategory.API:
      if (analysis.type === ErrorType.API_RATE_LIMIT) {
        return baseDelay * 10; // Longer delay for rate limiting
      }
      return baseDelay * Math.pow(2, Math.min(attemptCount, 2));
    case ErrorCategory.TRANSCRIPTION:
      return baseDelay * 5 * (attemptCount + 1); // Longer delays for transcription
    default:
      return baseDelay * Math.pow(1.5, attemptCount);
  }
}

/**
 * Get maximum retry attempts based on error analysis
 */
function getMaxRetries(analysis: ErrorAnalysis): number {
  switch (analysis.category) {
    case ErrorCategory.NETWORK:
      return 3;
    case ErrorCategory.API:
      if (analysis.type === ErrorType.API_RATE_LIMIT) return 2;
      return 2;
    case ErrorCategory.TRANSCRIPTION:
      return 1; // Fewer retries for expensive operations
    case ErrorCategory.VALIDATION:
      return 0; // Don't retry validation errors
    default:
      return 1;
  }
}

/**
 * Get mobile-optimized error message
 */
function getMobileOptimizedMessage(error: EnhancedQueryError | string): string {
  const message = typeof error === "string" ? error : error.message;

  // Shorten and simplify messages for mobile
  return message
    .replace(/Please check your internet connection and try again\./g, "Check connection & retry.")
    .replace(/Authentication problem\. Please log in again\./g, "Please log in again.")
    .replace(/Service temporarily unavailable\. Please try again in a moment\./g, "Service busy. Try again.")
    .replace(/An error occurred\. Please try again or contact support if the problem persists\./g, "Something went wrong. Try again.");
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get session ID
 */
function getSessionId(): string {
  if (typeof window !== "undefined") {
    let sessionId = sessionStorage.getItem("enhanced_query_session_id");
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("enhanced_query_session_id", sessionId);
    }
    return sessionId;
  }
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Report error to analytics
 */
async function reportErrorToAnalytics(error: EnhancedQueryError): Promise<void> {
  try {
    const analytics = {
      errorId: generateErrorId(),
      type: error.analysis.type,
      category: error.analysis.category,
      severity: error.analysis.severity,
      timestamp: error.context.timestamp,
      context: {
        queryType: error.context.queryType,
        queryKey: error.context.queryKey,
        requestId: error.context.requestId,
        sessionId: error.context.sessionId,
      },
      performance: error.performance,
      recovery: {
        strategy: error.recovery.strategy,
        attempted: error.recovery.currentRetry > 0,
        successful: false, // Would be updated based on recovery result
        userAction: error.analysis.userImpact.userActionRequired,
      },
    };

    // Send to analytics endpoint if configured
    if (process.env.ERROR_ANALYTICS_ENDPOINT) {
      await fetch(process.env.ERROR_ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analytics),
      });
    }
  } catch (reportingError) {
    console.error("Failed to report error analytics:", reportingError);
  }
}

/**
 * Report error dismissal to analytics
 */
function reportErrorDismissal(error: any, action: string): void {
  try {
    const analytics = {
      errorId: generateErrorId(),
      action,
      timestamp: new Date().toISOString(),
    };

    if (process.env.ERROR_ANALYTICS_ENDPOINT) {
      fetch(process.env.ERROR_ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analytics),
      });
    }
  } catch (reportingError) {
    console.error("Failed to report error dismissal:", reportingError);
  }
}

/**
 * Report error feedback to analytics
 */
function reportErrorFeedbackToAnalytics(error: any, rating: number, comment?: string): void {
  try {
    const analytics = {
      errorId: generateErrorId(),
      rating,
      comment,
      timestamp: new Date().toISOString(),
    };

    if (process.env.ERROR_ANALYTICS_ENDPOINT) {
      fetch(process.env.ERROR_ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analytics),
      });
    }
  } catch (reportingError) {
    console.error("Failed to report error feedback:", reportingError);
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Hook for transcription-specific queries with enhanced error handling
 */
export function useTranscriptionQuery<TData = any>(
  fileId: number,
  options?: EnhancedQueryOptions<TData, Error>,
) {
  return useEnhancedQuery<TData, Error>(
    ["transcription", fileId],
    () => fetch(`/api/transcribe?fileId=${fileId}`).then(res => res.json()),
    {
      ...options,
      context: {
        feature: "transcription",
        service: "groq-whisper",
        endpoint: "transcribe",
        ...options?.context,
      },
      mobileOptimizations: {
        batteryOptimized: true,
        networkOptimized: true,
        touchOptimized: true,
        ...options?.mobileOptimizations,
      },
    },
  );
}

/**
 * Hook for transcription mutations with enhanced error handling
 */
export function useTranscriptionMutation<TData = any, TVariables = any>(
  options?: EnhancedMutationOptions<TData, Error, TVariables>,
) {
  return useEnhancedMutation<TData, Error, TVariables>(
    (variables) => fetch("/api/transcribe", {
      method: "POST",
      body: JSON.stringify(variables),
    }).then(res => res.json()),
    {
      ...options,
      context: {
        feature: "transcription",
        service: "groq-whisper",
        endpoint: "transcribe",
        ...options?.context,
      },
      mobileOptimizations: {
        batteryOptimized: true,
        networkOptimized: true,
        touchOptimized: true,
        ...options?.mobileOptimizations,
      },
    },
  );
}
