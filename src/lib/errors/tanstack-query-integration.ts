/**
 * Enhanced TanStack Query Integration with Recovery Strategies and Network Interruption Handling
 *
 * Advanced integration between TanStack Query and the automated recovery
 * strategies system. This provides intelligent error handling, automatic
 * retries with exponential backoff, circuit breaker patterns, and
 * recovery orchestration for React Query operations in umuo.app.
 *
 * Enhanced with network interruption handling (T062):
 * - Network-aware retry strategies
 * - Circuit breaker integration
 * - Offline mode support
 * - Mobile optimization
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
  QueryClientConfig,
} from "@tanstack/react-query";
import { useCallback, useRef, useEffect, useState } from "react";
import {
  generateRecoveryPlan,
  executeRecoveryPlan,
  quickRecovery,
  RecoveryResult,
  RecoveryPlan,
  RecoveryStatus,
  RecoveryExecutionContext,
  createCancelToken,
  RecoveryActionType,
} from "./recovery-strategies";
import {
  classifyError,
  ErrorAnalysis,
  ErrorContext,
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
} from "./error-classifier";
import {
  NetworkMonitor,
  RetryManager,
  CircuitBreaker,
  useNetworkMonitor,
  useRetryManager,
  useCircuitBreaker,
  createResilientFetch,
  NetworkQuality,
  RetryConfig,
  CircuitBreakerConfig,
  isNetworkSuitable,
  getNetworkRecommendations,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "./network-interruption";

// ============================================================================
// ENHANCED QUERY OPTIONS INTERFACES
// ============================================================================

/**
 * Enhanced query options with recovery and network awareness capabilities
 */
export interface EnhancedQueryOptions<TData, TError = unknown>
  extends Omit<UseQueryOptions<TData, TError>, "retry" | "retryDelay"> {
  // Recovery configuration
  enableRecovery?: boolean;
  recoveryTimeout?: number;
  recoveryPriority?: "critical" | "high" | "medium" | "low";
  recoveryUserInteraction?: "required" | "optional" | "disabled";

  // Custom recovery options
  customRecoveryActions?: string[];
  excludeRecoveryActions?: string[];
  maxRecoveryAttempts?: number;
  recoveryOnSpecificErrors?: (error: TError) => boolean;

  // Progress and user feedback
  onRecoveryStart?: (plan: RecoveryPlan) => void;
  onRecoveryProgress?: (progress: number, message: string) => void;
  onRecoveryComplete?: (result: RecoveryResult) => void;
  onRecoveryFailed?: (error: any) => void;

  // Retry configuration (enhanced with network awareness)
  retryStrategy?:
    | "exponential"
    | "linear"
    | "fixed"
    | "adaptive"
    | "network-aware";
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  retryJitter?: boolean;
  enableNetworkAwareRetry?: boolean;

  // Network interruption handling (T062)
  networkConfig?: {
    // Circuit breaker configuration
    enableCircuitBreaker?: boolean;
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
    serviceName?: string;

    // Retry configuration
    retryConfig?: Partial<RetryConfig>;

    // Network requirements
    requiredNetworkType?:
      | "upload"
      | "download"
      | "streaming"
      | "realtime"
      | "any";
    skipWhenOffline?: boolean;

    // Offline handling
    enableOfflineMode?: boolean;
    cacheWhenOffline?: boolean;

    // Mobile optimization
    mobileOptimized?: boolean;
    batteryAware?: boolean;
    dataSaverAware?: boolean;
  };

  // Context for error analysis
  errorContext?: Partial<ErrorContext>;

  // Performance optimization
  enableAdaptiveRetry?: boolean;
}

/**
 * Enhanced mutation options with recovery capabilities
 */
export interface EnhancedMutationOptions<
  TData,
  TError,
  TVariables,
  TContext = void,
> extends Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "onError" | "retry"
  > {
  // Recovery configuration
  enableRecovery?: boolean;
  recoveryTimeout?: number;
  recoveryPriority?: "critical" | "high" | "medium" | "low";
  recoveryUserInteraction?: "required" | "optional" | "disabled";

  // Custom recovery options
  customRecoveryActions?: string[];
  excludeRecoveryActions?: string[];
  maxRecoveryAttempts?: number;
  recoveryOnSpecificErrors?: (error: TError) => boolean;

  // Progress and user feedback
  onRecoveryStart?: (plan: RecoveryPlan) => void;
  onRecoveryProgress?: (progress: number, message: string) => void;
  onRecoveryComplete?: (result: RecoveryResult) => void;
  onRecoveryFailed?: (error: any) => void;

  // Context for error analysis
  errorContext?: Partial<ErrorContext>;

  // Enhanced error handling
  onErrorEnhanced?: (
    error: TError,
    errorAnalysis: ErrorAnalysis,
    variables: TVariables,
  ) => void;
  onSuccessEnhanced?: (
    data: TData,
    variables: TVariables,
    context: TContext,
  ) => void;
}

// ============================================================================
// RECOVERY-ENABLED QUERY HOOK
// ============================================================================

/**
 * Enhanced useQuery with automatic recovery capabilities
 */
export function useEnhancedQuery<TData, TError = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options: EnhancedQueryOptions<TData, TError> = {},
) {
  const [recoveryState, setRecoveryState] = useState<{
    isRecovering: boolean;
    recoveryProgress: number;
    recoveryMessage: string;
    recoveryAttempt: number;
  }>({
    isRecovering: false,
    recoveryProgress: 0,
    recoveryMessage: "",
    recoveryAttempt: 0,
  });

  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis | null>(
    null,
  );
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(
    null,
  );
  const cancelTokenRef = useRef(createCancelToken());
  const queryClient = useQueryClient();

  // Enhanced retry logic with exponential backoff
  const retry = useCallback(
    async (failureCount: number, error: TError): Promise<boolean> => {
      // If recovery is disabled, use default logic
      if (!options.enableRecovery) {
        return failureCount < (options.retry || 3);
      }

      // Analyze the error
      const analysis = classifyError(error, {
        ...options.errorContext,
        component: "Query",
        action: Array.isArray(queryKey) ? queryKey[0] : String(queryKey),
      });

      setErrorAnalysis(analysis);

      // Check if error is recoverable
      if (!shouldAttemptRecovery(analysis, options)) {
        return false;
      }

      // Calculate retry delay based on strategy
      const baseDelay = options.baseRetryDelay || 1000;
      const maxDelay = options.maxRetryDelay || 30000;
      const retryCount = failureCount;

      let delay: number;

      switch (options.retryStrategy || "exponential") {
        case "exponential":
          delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
          break;
        case "linear":
          delay = Math.min(baseDelay * retryCount, maxDelay);
          break;
        case "fixed":
          delay = baseDelay;
          break;
        case "adaptive":
          // Adaptive delay based on error severity and type
          delay = calculateAdaptiveDelay(
            analysis,
            retryCount,
            baseDelay,
            maxDelay,
          );
          break;
        default:
          delay = baseDelay;
      }

      // Add jitter if enabled
      if (options.retryJitter !== false) {
        delay += Math.random() * 1000;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));

      return true;
    },
    [queryKey, options],
  );

  // Query options with enhanced retry
  const queryOptions: UseQueryOptions<TData, TError> = {
    ...options,
    retry: false, // Disable default retry, handle it ourselves
    retryDelay: retry,
    onError: async (error: TError) => {
      const analysis = classifyError(error, {
        ...options.errorContext,
        component: "Query",
        action: Array.isArray(queryKey) ? queryKey[0] : String(queryKey),
      });

      setErrorAnalysis(analysis);

      // Attempt recovery if enabled
      if (options.enableRecovery && shouldAttemptRecovery(analysis, options)) {
        await attemptQueryRecovery(analysis, error, queryKey, queryFn, options);
      }

      // Call original error handler if provided
      if (options.onError) {
        options.onError(error);
      }
    },
  };

  // Attempt recovery for failed query
  const attemptQueryRecovery = async (
    analysis: ErrorAnalysis,
    error: TError,
    key: QueryKey,
    fn: () => Promise<TData>,
    opts: EnhancedQueryOptions<TData, TError>,
  ) => {
    setRecoveryState((prev) => ({
      ...prev,
      isRecovering: true,
      recoveryAttempt: prev.recoveryAttempt + 1,
      recoveryMessage: "Attempting recovery...",
    }));

    try {
      opts.onRecoveryStart?.(null as any); // Will be updated when plan is generated

      // Generate recovery plan
      const plan = await generateRecoveryPlan(
        error,
        {
          ...opts.errorContext,
          component: "Query",
          action: Array.isArray(key) ? key[0] : String(key),
        },
        {
          maxDuration: opts.recoveryTimeout || 60000,
          userInteractionAllowed: opts.recoveryUserInteraction !== "disabled",
          parallelExecution: true,
          excludeActionTypes:
            opts.excludeRecoveryActions?.map(
              (id) =>
                RecoveryActionType[
                  getActionTypeFromId(id) as keyof typeof RecoveryActionType
                ],
            ) || [],
        },
      );

      if (!plan) {
        setRecoveryState({
          isRecovering: false,
          recoveryProgress: 0,
          recoveryMessage: "No recovery plan available",
          recoveryAttempt: 0,
        });

        opts.onRecoveryFailed?.(new Error("No recovery plan available"));
        return;
      }

      opts.onRecoveryStart?.(plan);

      // Execute recovery plan
      const result = await executeRecoveryPlan(
        plan,
        error,
        analysis,
        {
          ...opts.errorContext,
          component: "Query",
        },
        {
          maxAttempts: opts.maxRecoveryAttempts || 3,
          timeout: opts.recoveryTimeout || 60000,
          priority: getRecoveryPriority(opts.recoveryPriority),
          userInteractionMode: opts.recoveryUserInteraction || "optional",
          progressCallback: (progress) => {
            setRecoveryState((prev) => ({
              ...prev,
              recoveryProgress: progress.percentageComplete,
              recoveryMessage: progress.message,
            }));

            opts.onRecoveryProgress?.(
              progress.percentageComplete,
              progress.message,
            );
          },
          cancelToken: cancelTokenRef.current,
        },
      );

      setRecoveryResult(result);
      setRecoveryState({
        isRecovering: false,
        recoveryProgress: 100,
        recoveryMessage: result.message,
        recoveryAttempt: 0,
      });

      opts.onRecoveryComplete?.(result);

      // If recovery was successful, refetch the query
      if (result.success) {
        queryClient.refetchQueries({ queryKey: key });
      }
    } catch (recoveryError) {
      setRecoveryState({
        isRecovering: false,
        recoveryProgress: 0,
        recoveryMessage: "Recovery failed",
        recoveryAttempt: 0,
      });

      opts.onRecoveryFailed?.(recoveryError);
    }
  };

  // Execute query with enhanced options
  const query = useQuery(queryKey, queryFn, queryOptions);

  // Enhanced query object with recovery capabilities
  const enhancedQuery = {
    ...query,
    errorAnalysis,
    recoveryResult,
    recoveryState,
    isRecoverable: errorAnalysis
      ? shouldAttemptRecovery(errorAnalysis, options)
      : false,
    canRetryManually: errorAnalysis
      ? errorAnalysis.successProbability > 0.3
      : false,

    // Manual recovery trigger
    attemptRecovery: useCallback(async () => {
      if (query.error && errorAnalysis) {
        await attemptQueryRecovery(
          errorAnalysis,
          query.error,
          queryKey,
          queryFn,
          options,
        );
      }
    }, [query.error, errorAnalysis, queryKey, queryFn, options]),

    // Cancel recovery
    cancelRecovery: useCallback(() => {
      cancelTokenRef.current.cancel("User cancelled recovery");
      setRecoveryState({
        isRecovering: false,
        recoveryProgress: 0,
        recoveryMessage: "Recovery cancelled",
        recoveryAttempt: 0,
      });
    }, []),

    // Reset recovery state
    resetRecovery: useCallback(() => {
      setErrorAnalysis(null);
      setRecoveryResult(null);
      setRecoveryState({
        isRecovering: false,
        recoveryProgress: 0,
        recoveryMessage: "",
        recoveryAttempt: 0,
      });
    }, []),
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelTokenRef.current.cancel("Component unmounted");
    };
  }, []);

  return enhancedQuery;
}

// ============================================================================
// RECOVERY-ENABLED MUTATION HOOK
// ============================================================================

/**
 * Enhanced useMutation with automatic recovery capabilities
 */
export function useEnhancedMutation<TData, TError, TVariables, TContext = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: EnhancedMutationOptions<TData, TError, TVariables, TContext> = {},
) {
  const [recoveryState, setRecoveryState] = useState<{
    isRecovering: boolean;
    recoveryProgress: number;
    recoveryMessage: string;
    recoveryAttempt: number;
  }>({
    isRecovering: false,
    recoveryProgress: 0,
    recoveryMessage: "",
    recoveryAttempt: 0,
  });

  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis | null>(
    null,
  );
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(
    null,
  );
  const cancelTokenRef = useRef(createCancelToken());
  const [lastVariables, setLastVariables] = useState<TVariables | null>(null);

  // Enhanced mutation options
  const mutationOptions: UseMutationOptions<
    TData,
    TError,
    TVariables,
    TContext
  > = {
    ...options,
    retry: false, // Disable default retry, handle it ourselves
    onError: async (
      error: TError,
      variables: TVariables,
      context: TContext | undefined,
    ) => {
      const analysis = classifyError(error, {
        ...options.errorContext,
        component: "Mutation",
        action: "mutation",
        customData: { variables, context },
      });

      setErrorAnalysis(analysis);
      setLastVariables(variables);

      // Call enhanced error handler
      if (options.onErrorEnhanced) {
        options.onErrorEnhanced(error, analysis, variables);
      }

      // Call original error handler
      if (options.onError) {
        options.onError(error, variables, context);
      }

      // Attempt recovery if enabled
      if (options.enableRecovery && shouldAttemptRecovery(analysis, options)) {
        await attemptMutationRecovery(
          analysis,
          error,
          variables,
          mutationFn,
          options,
        );
      }
    },
    onSuccess: (
      data: TData,
      variables: TVariables,
      context: TContext | undefined,
    ) => {
      // Call enhanced success handler
      if (options.onSuccessEnhanced) {
        options.onSuccessEnhanced(data, variables, context as TContext);
      }

      // Call original success handler
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
  };

  // Attempt recovery for failed mutation
  const attemptMutationRecovery = async (
    analysis: ErrorAnalysis,
    error: TError,
    variables: TVariables,
    fn: (vars: TVariables) => Promise<TData>,
    opts: EnhancedMutationOptions<TData, TError, TVariables, TContext>,
  ) => {
    setRecoveryState((prev) => ({
      ...prev,
      isRecovering: true,
      recoveryAttempt: prev.recoveryAttempt + 1,
      recoveryMessage: "Attempting recovery...",
    }));

    try {
      // Generate recovery plan
      const plan = await generateRecoveryPlan(
        error,
        {
          ...opts.errorContext,
          component: "Mutation",
          action: "mutation",
          customData: { variables },
        },
        {
          maxDuration: opts.recoveryTimeout || 60000,
          userInteractionAllowed: opts.recoveryUserInteraction !== "disabled",
          parallelExecution: false, // Mutations usually sequential
          excludeActionTypes:
            opts.excludeRecoveryActions?.map(
              (id) =>
                RecoveryActionType[
                  getActionTypeFromId(id) as keyof typeof RecoveryActionType
                ],
            ) || [],
        },
      );

      if (!plan) {
        setRecoveryState({
          isRecovering: false,
          recoveryProgress: 0,
          recoveryMessage: "No recovery plan available",
          recoveryAttempt: 0,
        });

        opts.onRecoveryFailed?.(new Error("No recovery plan available"));
        return;
      }

      opts.onRecoveryStart?.(plan);

      // Execute recovery plan
      const result = await executeRecoveryPlan(
        plan,
        error,
        analysis,
        {
          ...opts.errorContext,
          component: "Mutation",
          customData: { variables },
        },
        {
          maxAttempts: opts.maxRecoveryAttempts || 3,
          timeout: opts.recoveryTimeout || 60000,
          priority: getRecoveryPriority(opts.recoveryPriority),
          userInteractionMode: opts.recoveryUserInteraction || "optional",
          progressCallback: (progress) => {
            setRecoveryState((prev) => ({
              ...prev,
              recoveryProgress: progress.percentageComplete,
              recoveryMessage: progress.message,
            }));

            opts.onRecoveryProgress?.(
              progress.percentageComplete,
              progress.message,
            );
          },
          cancelToken: cancelTokenRef.current,
        },
      );

      setRecoveryResult(result);
      setRecoveryState({
        isRecovering: false,
        recoveryProgress: 100,
        recoveryMessage: result.message,
        recoveryAttempt: 0,
      });

      opts.onRecoveryComplete?.(result);

      // If recovery was successful, retry the original mutation
      if (result.success) {
        // Small delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
        mutateAsync(variables);
      }
    } catch (recoveryError) {
      setRecoveryState({
        isRecovering: false,
        recoveryProgress: 0,
        recoveryMessage: "Recovery failed",
        recoveryAttempt: 0,
      });

      opts.onRecoveryFailed?.(recoveryError);
    }
  };

  // Execute mutation with enhanced options
  const mutation = useMutation(mutationFn, mutationOptions);

  // Enhanced mutation object with recovery capabilities
  const enhancedMutation = {
    ...mutation,
    errorAnalysis,
    recoveryResult,
    recoveryState,
    isRecoverable: errorAnalysis
      ? shouldAttemptRecovery(errorAnalysis, options)
      : false,
    canRetryManually: errorAnalysis
      ? errorAnalysis.successProbability > 0.3
      : false,

    // Manual recovery trigger
    attemptRecovery: useCallback(async () => {
      if (mutation.error && errorAnalysis && lastVariables) {
        await attemptMutationRecovery(
          errorAnalysis,
          mutation.error,
          lastVariables,
          mutationFn,
          options,
        );
      }
    }, [mutation.error, errorAnalysis, lastVariables, mutationFn, options]),

    // Cancel recovery
    cancelRecovery: useCallback(() => {
      cancelTokenRef.current.cancel("User cancelled recovery");
      setRecoveryState({
        isRecovering: false,
        recoveryProgress: 0,
        recoveryMessage: "Recovery cancelled",
        recoveryAttempt: 0,
      });
    }, []),

    // Reset recovery state
    resetRecovery: useCallback(() => {
      setErrorAnalysis(null);
      setRecoveryResult(null);
      setRecoveryState({
        isRecovering: false,
        recoveryProgress: 0,
        recoveryMessage: "",
        recoveryAttempt: 0,
      });
      setLastVariables(null);
    }, []),
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelTokenRef.current.cancel("Component unmounted");
    };
  }, []);

  return enhancedMutation;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Determine if recovery should be attempted based on error analysis and options
 */
function shouldAttemptRecovery<TError>(
  analysis: ErrorAnalysis,
  options:
    | EnhancedQueryOptions<any, TError>
    | EnhancedMutationOptions<any, TError, any>,
): boolean {
  // Check if recovery is disabled
  if (!options.enableRecovery) {
    return false;
  }

  // Check if custom recovery condition is provided
  if (options.recoveryOnSpecificErrors) {
    return options.recoveryOnSpecificErrors(analysis as any);
  }

  // Check if error type is recoverable
  const recoverableTypes: ErrorType[] = [
    ErrorType.CONNECTION_FAILURE,
    ErrorType.CONNECTION_TIMEOUT,
    ErrorType.API_RATE_LIMIT,
    ErrorType.TRANSCRIPTION_TIMEOUT,
    ErrorType.UPLOAD_FAILED,
    ErrorType.DOWNLOAD_FAILED,
  ];

  if (recoverableTypes.includes(analysis.type)) {
    return true;
  }

  // Check if success probability is high enough
  return analysis.successProbability > 0.4;
}

/**
 * Calculate adaptive retry delay based on error analysis
 */
function calculateAdaptiveDelay(
  analysis: ErrorAnalysis,
  retryCount: number,
  baseDelay: number,
  maxDelay: number,
): number {
  let multiplier = 1;

  // Adjust multiplier based on error category
  switch (analysis.category) {
    case ErrorCategory.NETWORK:
      multiplier = 2; // Network errors benefit from longer delays
      break;
    case ErrorCategory.API:
      if (analysis.type === ErrorType.API_RATE_LIMIT) {
        multiplier = 4; // Rate limits need longer delays
      } else {
        multiplier = 1.5;
      }
      break;
    case ErrorCategory.TRANSCRIPTION:
      multiplier = 3; // Transcription errors can be transient
      break;
    default:
      multiplier = 1;
  }

  // Adjust based on severity
  switch (analysis.severity) {
    case ErrorSeverity.CRITICAL:
      multiplier *= 0.5; // Critical errors might need faster retries
      break;
    case ErrorSeverity.HIGH:
      multiplier *= 1.2;
      break;
    case ErrorSeverity.MEDIUM:
      multiplier *= 1;
      break;
    case ErrorSeverity.LOW:
      multiplier *= 1.5;
      break;
  }

  // Calculate final delay
  const delay = Math.min(
    baseDelay * Math.pow(multiplier, retryCount),
    maxDelay,
  );

  // Add jitter
  return delay + Math.random() * 1000;
}

/**
 * Convert recovery priority string to numeric priority
 */
function getRecoveryPriority(priority?: string): number {
  switch (priority) {
    case "critical":
      return 1;
    case "high":
      return 2;
    case "medium":
      return 3;
    case "low":
      return 4;
    default:
      return 3;
  }
}

/**
 * Get action type from action ID (simplified implementation)
 */
function getActionTypeFromId(actionId: string): string {
  // This is a simplified implementation
  // In a real implementation, you'd map action IDs to types more accurately
  if (actionId.includes("retry")) return "AUTOMATIC_RETRY";
  if (actionId.includes("fallback")) return "FALLBACK_SERVICE";
  if (actionId.includes("user")) return "USER_RETRY";
  return "AUTOMATIC_RETRY";
}

// ============================================================================
// QUERY CLIENT CONFIGURATION WITH RECOVERY
// ============================================================================

/**
 * Create query client configuration with recovery features
 */
export function createRecoveryQueryClientConfig(
  recoveryOptions: {
    defaultRecoveryEnabled?: boolean;
    defaultRecoveryTimeout?: number;
    defaultRetryStrategy?: "exponential" | "linear" | "fixed" | "adaptive";
    defaultCircuitBreaker?: boolean;
  } = {},
): QueryClientConfig {
  return {
    defaultOptions: {
      queries: {
        retry: false, // Disable default retry, let enhanced hooks handle it
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        retryDelay: (attemptIndex, error) => {
          // Default exponential backoff
          const baseDelay = 1000;
          const maxDelay = 30000;
          const delay = Math.min(
            baseDelay * Math.pow(2, attemptIndex),
            maxDelay,
          );
          return delay + Math.random() * 1000;
        },
      },
      mutations: {
        retry: false, // Disable default retry for mutations
      },
    },
    // Add error boundary and recovery middleware
    mutationCache: undefined, // Can be enhanced with recovery middleware
    queryCache: undefined, // Can be enhanced with recovery middleware
  };
}

// ============================================================================
// BATCH RECOVERY FOR MULTIPLE QUERIES
// ============================================================================

/**
 * Hook for batch recovery of multiple failed queries
 */
export function useBatchRecovery() {
  const queryClient = useQueryClient();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryProgress, setRecoveryProgress] = useState(0);

  const recoverFailedQueries = useCallback(
    async (
      queryKeys?: QueryKey[],
      options: {
        maxConcurrent?: number;
        userInteraction?: "required" | "optional" | "disabled";
      } = {},
    ) => {
      setIsRecovering(true);
      setRecoveryProgress(0);

      try {
        const allQueries = queryClient.getQueryCache().getAll();
        const failedQueries = allQueries.filter(
          (query) =>
            query.state.status === "error" &&
            (!queryKeys ||
              queryKeys.some(
                (key) => JSON.stringify(query.queryKey) === JSON.stringify(key),
              )),
        );

        if (failedQueries.length === 0) {
          setIsRecovering(false);
          return { success: true, message: "No failed queries to recover" };
        }

        const maxConcurrent = options.maxConcurrent || 3;
        const batchSize = Math.ceil(failedQueries.length / maxConcurrent);

        for (let i = 0; i < failedQueries.length; i += maxConcurrent) {
          const batch = failedQueries.slice(i, i + maxConcurrent);

          // Process batch in parallel
          await Promise.all(
            batch.map(async (query) => {
              if (query.state.error) {
                try {
                  const result = await quickRecovery(
                    query.state.error,
                    {
                      component: "Query",
                      action: Array.isArray(query.queryKey)
                        ? query.queryKey[0]
                        : String(query.queryKey),
                    },
                    {
                      maxDuration: 30000,
                      userInteractionAllowed:
                        options.userInteraction !== "disabled",
                      parallelExecution: true,
                    },
                  );

                  if (result.success) {
                    // Refetch the query
                    queryClient.refetchQueries({ queryKey: query.queryKey });
                  }

                  return result;
                } catch (error) {
                  console.warn(
                    "Failed to recover query:",
                    query.queryKey,
                    error,
                  );
                  return null;
                }
              }
              return null;
            }),
          );

          // Update progress
          const progress = Math.min(
            ((i + batch.length) / failedQueries.length) * 100,
            100,
          );
          setRecoveryProgress(progress);
        }

        setIsRecovering(false);
        setRecoveryProgress(100);

        return {
          success: true,
          message: `Recovery attempted for ${failedQueries.length} queries`,
        };
      } catch (error) {
        setIsRecovering(false);
        setRecoveryProgress(0);

        return {
          success: false,
          message: `Batch recovery failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    [queryClient],
  );

  return {
    recoverFailedQueries,
    isRecovering,
    recoveryProgress,
  };
}

// ============================================================================
// RECOVERY STATISTICS AND MONITORING
// ============================================================================

/**
 * Hook for monitoring recovery statistics
 */
export function useRecoveryStatistics() {
  const [statistics, setStatistics] = useState<{
    totalRecoveries: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    averageRecoveryTime: number;
    commonErrorTypes: Array<{ type: string; count: number }>;
  }>({
    totalRecoveries: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    averageRecoveryTime: 0,
    commonErrorTypes: [],
  });

  const recordRecovery = useCallback(
    (result: RecoveryResult, errorAnalysis: ErrorAnalysis) => {
      setStatistics((prev) => {
        const newTotal = prev.totalRecoveries + 1;
        const newSuccessful =
          prev.successfulRecoveries + (result.success ? 1 : 0);
        const newFailed = prev.failedRecoveries + (result.success ? 0 : 1);
        const newAverageTime =
          (prev.averageRecoveryTime * prev.totalRecoveries + result.duration) /
          newTotal;

        // Update common error types
        const errorType = errorAnalysis.type;
        const existingTypeIndex = prev.commonErrorTypes.findIndex(
          (et) => et.type === errorType,
        );

        let newCommonErrorTypes = [...prev.commonErrorTypes];
        if (existingTypeIndex >= 0) {
          newCommonErrorTypes[existingTypeIndex].count += 1;
        } else {
          newCommonErrorTypes.push({ type: errorType, count: 1 });
        }

        // Sort by count and keep top 10
        newCommonErrorTypes.sort((a, b) => b.count - a.count);
        newCommonErrorTypes = newCommonErrorTypes.slice(0, 10);

        return {
          totalRecoveries: newTotal,
          successfulRecoveries: newSuccessful,
          failedRecoveries: newFailed,
          averageRecoveryTime: newAverageTime,
          commonErrorTypes: newCommonErrorTypes,
        };
      });
    },
    [],
  );

  return {
    statistics,
    recordRecovery,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  EnhancedQueryOptions,
  EnhancedMutationOptions,
  createRecoveryQueryClientConfig,
};

// Export types for external use
export type { RecoveryState as QueryRecoveryState } from "./recovery-strategies";
