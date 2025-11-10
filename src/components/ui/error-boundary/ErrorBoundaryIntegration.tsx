"use client";

import React, { createContext, useContext, useCallback, useEffect, ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { PlayerErrorBoundary } from "./PlayerErrorBoundary";
import { TranscriptionErrorBoundary } from "./TranscriptionErrorBoundary";
import { MobileErrorBoundary } from "./MobileErrorBoundary";
import { PerformanceErrorBoundary } from "./PerformanceErrorBoundary";
import { ErrorClassificationProvider } from "./ErrorClassification";
import { FallbackUI } from "./FallbackUI";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import {
  ErrorClassifier,
  RecoveryStrategy,
  ErrorAnalytics,
  type ErrorContext,
  type RecoveryPlan,
} from "@/lib/errors";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ErrorBoundaryIntegrationConfig {
  enableGlobalErrorHandling: boolean;
  enableQueryErrorHandling: boolean;
  enableNetworkErrorHandling: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorReporting: boolean;
  enableAutoRecovery: boolean;
  errorReportingEndpoint?: string;
  maxRetryAttempts: number;
  retryDelay: number;
  enableDevTools: boolean;
  enableAnalytics: boolean;
}

export interface ErrorBoundaryIntegrationContextType {
  config: ErrorBoundaryIntegrationConfig;
  updateConfig: (config: Partial<ErrorBoundaryIntegrationConfig>) => void;
  handleError: (error: Error, context?: Partial<ErrorContext>) => void;
  recoverFromError: (errorId: string) => Promise<boolean>;
  reportError: (error: Error, context?: Partial<ErrorContext>) => Promise<void>;
  getErrorHistory: () => ErrorHistoryEntry[];
  clearErrorHistory: () => void;
  getSystemHealth: () => SystemHealth;
}

export interface ErrorHistoryEntry {
  id: string;
  error: Error;
  context: ErrorContext;
  timestamp: number;
  resolved: boolean;
  recoveryAttempts: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  errorCount: number;
  lastError: number | null;
  performance: {
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
  };
}

// ============================================================================
// ERROR BOUNDARY INTEGRATION CONTEXT
// ============================================================================

const ErrorBoundaryIntegrationContext = createContext<ErrorBoundaryIntegrationContextType | null>(null);

export const useErrorBoundaryIntegration = () => {
  const context = useContext(ErrorBoundaryIntegrationContext);
  if (!context) {
    throw new Error("useErrorBoundaryIntegration must be used within an ErrorBoundaryIntegrationProvider");
  }
  return context;
};

// ============================================================================
// ERROR BOUNDARY INTEGRATION PROVIDER
// ============================================================================

export const ErrorBoundaryIntegrationProvider: React.FC<{
  children: ReactNode;
  config?: Partial<ErrorBoundaryIntegrationConfig>;
  queryClient?: QueryClient;
}> = ({ children, config: initialConfig = {}, queryClient }) => {
  const defaultConfig: ErrorBoundaryIntegrationConfig = {
    enableGlobalErrorHandling: true,
    enableQueryErrorHandling: true,
    enableNetworkErrorHandling: true,
    enablePerformanceMonitoring: true,
    enableErrorReporting: process.env.NODE_ENV === "production",
    enableAutoRecovery: true,
    errorReportingEndpoint: "/api/errors/report",
    maxRetryAttempts: 3,
    retryDelay: 1000,
    enableDevTools: process.env.NODE_ENV === "development",
    enableAnalytics: true,
    ...initialConfig,
  };

  const [config, setConfig] = React.useState<ErrorBoundaryIntegrationConfig>(defaultConfig);
  const [errorHistory, setErrorHistory] = React.useState<ErrorHistoryEntry[]>([]);
  const [errorClassifier] = React.useState(() => ErrorClassifier.getInstance());
  const [recoveryStrategy] = React.useState(() => new RecoveryStrategy());
  const [errorAnalytics] = React.useState(() => new ErrorAnalytics());
  const queryClientInstance = useQueryClient();

  // Global error handler
  useEffect(() => {
    if (config.enableGlobalErrorHandling) {
      const handleError = (event: ErrorEvent) => {
        handleErrorIntegration(event.error, {
          type: "javascript",
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          message: event.message,
        });
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        handleErrorIntegration(
          new Error(event.reason),
          { type: "unhandled-rejection", reason: event.reason }
        );
      };

      window.addEventListener("error", handleError);
      window.addEventListener("unhandledrejection", handleUnhandledRejection);

      return () => {
        window.removeEventListener("error", handleError);
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      };
    }
  }, [config.enableGlobalErrorHandling]);

  // Query error handling integration
  useEffect(() => {
    if (config.enableQueryErrorHandling && queryClientInstance) {
      const defaultErrorHandler = queryClientInstance.getDefaultOptions().mutations?.onError;

      queryClientInstance.setDefaultOptions({
        mutations: {
          onError: (error, variables, context, mutation) => {
            handleErrorIntegration(error as Error, {
              type: "query-mutation",
              mutationKey: mutation.mutationKey,
              variables,
            });

            defaultErrorHandler?.(error, variables, context, mutation);
          },
        },
        queries: {
          onError: (error, query) => {
            handleErrorIntegration(error as Error, {
              type: "query-fetch",
              queryKey: query.queryKey,
            });
          },
          retry: (failureCount, error) => {
            const analysis = errorClassifier.classifyError(error as Error);
            return analysis.category === "network" && failureCount < config.maxRetryAttempts;
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
      });
    }
  }, [config.enableQueryErrorHandling, config.maxRetryAttempts, queryClientInstance]);

  // Network error handling
  useEffect(() => {
    if (config.enableNetworkErrorHandling) {
      // Override fetch to handle network errors
      const originalFetch = window.fetch;

      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);

          if (!response.ok) {
            handleErrorIntegration(
              new Error(`HTTP ${response.status}: ${response.statusText}`),
              {
                type: "network-response",
                status: response.status,
                statusText: response.statusText,
                url: response.url,
              }
            );
          }

          return response;
        } catch (error) {
          handleErrorIntegration(error as Error, {
            type: "network-fetch",
            url: args[0],
          });
          throw error;
        }
      };

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [config.enableNetworkErrorHandling]);

  // Performance monitoring
  useEffect(() => {
    if (config.enablePerformanceMonitoring) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "measure" && entry.duration > 5000) {
            handleErrorIntegration(
              new Error(`Performance threshold exceeded: ${entry.name} took ${entry.duration}ms`),
              {
                type: "performance",
                metric: entry.name,
                duration: entry.duration,
              }
            );
          }
        }
      });

      observer.observe({ entryTypes: ["measure"] });

      return () => observer.disconnect();
    }
  }, [config.enablePerformanceMonitoring]);

  const handleErrorIntegration = useCallback((
    error: Error,
    context: Partial<ErrorContext> = {}
  ) => {
    const enrichedContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "",
      url: typeof window !== "undefined" ? window.location.href : "",
      ...context,
    };

    // Classify error
    const analysis = errorClassifier.analyzeError(error, enrichedContext);

    // Add to history
    const historyEntry: ErrorHistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      error,
      context: enrichedContext,
      timestamp: Date.now(),
      resolved: false,
      recoveryAttempts: 0,
    };

    setErrorHistory(prev => [...prev.slice(-99), historyEntry]); // Keep last 100 errors

    // Report error if enabled
    if (config.enableErrorReporting) {
      reportErrorIntegration(error, enrichedContext, analysis);
    }

    // Track analytics
    if (config.enableAnalytics) {
      errorAnalytics.trackError(error, enrichedContext);
    }

    // Attempt auto-recovery if enabled
    if (config.enableAutoRecovery) {
      attemptAutoRecovery(error, enrichedContext, analysis);
    }
  }, [errorClassifier, errorAnalytics, config]);

  const reportErrorIntegration = useCallback(async (
    error: Error,
    context: ErrorContext,
    analysis: any
  ) => {
    if (!config.errorReportingEndpoint) return;

    try {
      await fetch(config.errorReportingEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          context,
          analysis,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  }, [config.errorReportingEndpoint]);

  const attemptAutoRecovery = useCallback(async (
    error: Error,
    context: ErrorContext,
    analysis: any
  ) => {
    if (analysis.category === "critical") return;

    try {
      const recoveryPlan = recoveryStrategy.generateRecoveryPlan(analysis, {
        enableMobileOptimizations: context.deviceInfo?.isMobile || false,
        maxRetries: config.maxRetryAttempts,
      });

      if (recoveryPlan.actions.length > 0) {
        await recoveryStrategy.executeRecoveryPlan(recoveryPlan, {
          enableMobileOptimizations: context.deviceInfo?.isMobile || false,
          timeout: 10000,
        });
      }
    } catch (recoveryError) {
      console.error("Auto-recovery failed:", recoveryError);
    }
  }, [recoveryStrategy, config.maxRetryAttempts]);

  const handleError = useCallback((error: Error, context?: Partial<ErrorContext>) => {
    handleErrorIntegration(error, context);
  }, [handleErrorIntegration]);

  const recoverFromError = useCallback(async (errorId: string): Promise<boolean> => {
    const errorEntry = errorHistory.find(entry => entry.id === errorId);
    if (!errorEntry || errorEntry.resolved) return false;

    try {
      const analysis = errorClassifier.analyzeError(errorEntry.error, errorEntry.context);
      const recoveryPlan = recoveryStrategy.generateRecoveryPlan(analysis, {
        enableMobileOptimizations: errorEntry.context.deviceInfo?.isMobile || false,
        maxRetries: 1,
      });

      const result = await recoveryStrategy.executeRecoveryPlan(recoveryPlan, {
        enableMobileOptimizations: errorEntry.context.deviceInfo?.isMobile || false,
        timeout: 15000,
      });

      if (result.success) {
        setErrorHistory(prev =>
          prev.map(entry =>
            entry.id === errorId
              ? { ...entry, resolved: true, recoveryAttempts: entry.recoveryAttempts + 1 }
              : entry
          )
        );
        return true;
      }

      setErrorHistory(prev =>
        prev.map(entry =>
          entry.id === errorId
            ? { ...entry, recoveryAttempts: entry.recoveryAttempts + 1 }
            : entry
        )
      );
      return false;
    } catch (error) {
      console.error("Manual recovery failed:", error);
      return false;
    }
  }, [errorHistory, errorClassifier, recoveryStrategy]);

  const reportError = useCallback(async (error: Error, context?: Partial<ErrorContext>) => {
    const enrichedContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "",
      url: typeof window !== "undefined" ? window.location.href : "",
      ...context,
    };

    const analysis = errorClassifier.analyzeError(error, enrichedContext);
    await reportErrorIntegration(error, enrichedContext, analysis);
  }, [reportErrorIntegration]);

  const getErrorHistory = useCallback((): ErrorHistoryEntry[] => {
    return errorHistory;
  }, [errorHistory]);

  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
  }, []);

  const getSystemHealth = useCallback((): SystemHealth => {
    const recentErrors = errorHistory.filter(
      entry => Date.now() - entry.timestamp < 300000 // Last 5 minutes
    );

    const errorCount = recentErrors.length;
    const lastError = recentErrors.length > 0 ? recentErrors[recentErrors.length - 1].timestamp : null;

    let status: SystemHealth["status"] = "healthy";
    if (errorCount > 10) status = "unhealthy";
    else if (errorCount > 5) status = "degraded";

    return {
      status,
      errorCount,
      lastError,
      performance: {
        memoryUsage: 0, // Would need actual monitoring
        errorRate: errorCount / 5, // Errors per minute
        responseTime: 0, // Would need actual monitoring
      },
    };
  }, [errorHistory]);

  const updateConfig = useCallback((newConfig: Partial<ErrorBoundaryIntegrationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const contextValue: ErrorBoundaryIntegrationContextType = {
    config,
    updateConfig,
    handleError,
    recoverFromError,
    reportError,
    getErrorHistory,
    clearErrorHistory,
    getSystemHealth,
  };

  return (
    <ErrorBoundaryIntegrationContext.Provider value={contextValue}>
      <ErrorClassificationProvider
        config={{
          enableAutoClassification: true,
          enablePatternRecognition: true,
          enablePredictiveAnalysis: config.enableAnalytics,
          enableCustomCategories: true,
        }}
      >
        <ErrorBoundary
          enableRecovery={config.enableAutoRecovery}
          showDetails={config.enableDevTools}
          allowReport={config.enableErrorReporting}
        >
          {children}
        </ErrorBoundary>
      </ErrorClassificationProvider>
    </ErrorBoundaryIntegrationContext.Provider>
  );
};

// ============================================================================
// INTEGRATED ERROR BOUNDARY COMPONENTS
// ============================================================================

interface IntegratedErrorBoundaryProps {
  children: ReactNode;
  type?: "page" | "section" | "component" | "player" | "transcription" | "mobile" | "performance";
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any, context: ErrorContext) => void;
  onRecovery?: (plan: RecoveryPlan, result: any) => void;
  className?: string;
}

export const IntegratedErrorBoundary: React.FC<IntegratedErrorBoundaryProps> = ({
  children,
  type = "component",
  fallback,
  onError,
  onRecovery,
  className,
}) => {
  const { handleError } = useErrorBoundaryIntegration();

  const handleErrorWithIntegration = (error: Error, errorInfo: any, context: ErrorContext) => {
    handleError(error, context);
    onError?.(error, errorInfo, context);
  };

  const getErrorBoundary = () => {
    switch (type) {
      case "page":
        return (
          <ErrorBoundary
            fallback={fallback}
            onError={handleErrorWithIntegration}
            onRecovery={onRecovery}
            showDetails={false}
            allowReport={true}
            className={className}
          >
            {children}
          </ErrorBoundary>
        );

      case "section":
        return (
          <ErrorBoundary
            fallback={fallback}
            onError={handleErrorWithIntegration}
            onRecovery={onRecovery}
            showDetails={false}
            allowReport={false}
            maxErrors={5}
            className={className}
          >
            {children}
          </ErrorBoundary>
        );

      case "player":
        return (
          <PlayerErrorBoundary
            fallbackComponent={fallback}
            onAudioError={(error, audioInfo) => {
              handleError(error, { audioInfo });
            }}
            onError={handleErrorWithIntegration}
            onRecovery={onRecovery}
            className={className}
          >
            {children}
          </PlayerErrorBoundary>
        );

      case "transcription":
        return (
          <TranscriptionErrorBoundary
            fallbackComponent={fallback}
            onTranscriptionError={(error, jobInfo) => {
              handleError(error, { jobInfo });
            }}
            onError={handleErrorWithIntegration}
            onRecovery={onRecovery}
            enableRetry={true}
            enableFallback={true}
            className={className}
          >
            {children}
          </TranscriptionErrorBoundary>
        );

      case "mobile":
        return (
          <MobileErrorBoundary
            fallbackComponent={fallback}
            onMobileError={(error, context) => {
              handleError(error, context);
            }}
            onError={handleErrorWithIntegration}
            onRecovery={onRecovery}
            enableTouchOptimizations={true}
            enableBatteryOptimization={true}
            enableNetworkOptimization={true}
            enableOfflineMode={true}
            className={className}
          >
            {children}
          </MobileErrorBoundary>
        );

      case "performance":
        return (
          <PerformanceErrorBoundary
            fallbackComponent={fallback}
            onPerformanceError={(error, metrics) => {
              handleError(error, { metrics });
            }}
            onError={handleErrorWithIntegration}
            onRecovery={onRecovery}
            enableMonitoring={true}
            enableOptimization={true}
            enableProfiling={true}
            className={className}
          >
            {children}
          </PerformanceErrorBoundary>
        );

      default:
        return (
          <ErrorBoundary
            fallback={fallback}
            onError={handleErrorWithIntegration}
            onRecovery={onRecovery}
            showDetails={false}
            allowReport={false}
            maxErrors={3}
            className={className}
          >
            {children}
          </ErrorBoundary>
        );
    }
  };

  return getErrorBoundary();
};

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useErrorHandler = () => {
  const { handleError, reportError } = useErrorBoundaryIntegration();

  return {
    handleError: (error: Error, context?: Partial<ErrorContext>) => {
      handleError(error, context);
    },
    reportError: (error: Error, context?: Partial<ErrorContext>) => {
      reportError(error, context);
    },
    wrapAsync: async <T>(
      asyncFn: () => Promise<T>,
      context?: Partial<ErrorContext>
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error as Error, context);
        return null;
      }
    },
  };
};

export const useErrorRecovery = () => {
  const { recoverFromError, getErrorHistory } = useErrorBoundaryIntegration();

  return {
    recoverFromError,
    getUnresolvedErrors: () => getErrorHistory().filter(entry => !entry.resolved),
    getRecentErrors: (minutes = 5) => {
      const cutoff = Date.now() - minutes * 60 * 1000;
      return getErrorHistory().filter(entry => entry.timestamp > cutoff);
    },
  };
};

export const useSystemHealth = () => {
  const { getSystemHealth, getErrorHistory } = useErrorBoundaryIntegration();

  const health = getSystemHealth();
  const errorHistory = getErrorHistory();

  return {
    ...health,
    recentErrors: errorHistory.slice(-10),
    errorTrend: errorHistory.length > 1
      ? errorHistory[errorHistory.length - 1].timestamp - errorHistory[errorHistory.length - 2].timestamp
      : 0,
    isHealthy: health.status === "healthy",
    needsAttention: health.status !== "healthy",
  };
};

// ============================================================================
// HIGHER-ORDER COMPONENTS
// ============================================================================

export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options: IntegratedErrorBoundaryProps = {}
) => {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <IntegratedErrorBoundary {...options}>
        <Component {...props} />
      </IntegratedErrorBoundary>
    );
  };
};

export const withPageErrorBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  return withErrorBoundary(Component, { type: "page" });
};

export const withSectionErrorBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  return withErrorBoundary(Component, { type: "section" });
};

export const withPlayerErrorBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  return withErrorBoundary(Component, { type: "player" });
};

export const withTranscriptionErrorBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  return withErrorBoundary(Component, { type: "transcription" });
};
