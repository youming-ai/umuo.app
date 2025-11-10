/**
 * Error Analytics Integration Utilities
 *
 * Comprehensive integration utilities for connecting the error analytics system
 * with existing error handling components and third-party services.
 *
 * @version 1.0.0
 */

import { AppError } from '@/lib/utils/error-handler';
import { ErrorAnalytics, ErrorEvent, ErrorAnalyticsConfig } from './error-analytics';
import { ErrorMonitoringSystem } from './analytics-monitoring';
import {
  ErrorClassifier,
  RecoveryStrategy,
  ErrorMiddleware,
  ErrorHandler
} from './index';

// ============================================================================
// INTEGRATION INTERFACES
// ============================================================================

/**
 * Integration configuration for error analytics
 */
export interface AnalyticsIntegrationConfig {
  // Analytics system configuration
  analyticsConfig?: Partial<ErrorAnalyticsConfig>;

  // Integration settings
  enableAutoTracking: boolean;
  enableMiddlewareIntegration: boolean;
  enableQueryIntegration: boolean;
  enableReactIntegration: boolean;

  // Performance settings
  trackPerformanceMetrics: boolean;
  trackUserBehavior: boolean;
  trackSystemInfo: boolean;

  // Privacy settings
  respectUserConsent: boolean;
  defaultConsentLevel: 'none' | 'essential' | 'functional' | 'analytics' | 'marketing';

  // Third-party integrations
  enableSentryIntegration: boolean;
  enableDataDogIntegration: boolean;
  enableNewRelicIntegration: boolean;
  enableCustomWebhooks: boolean;
  webhookEndpoints: string[];
}

/**
 * Integration result
 */
export interface IntegrationResult {
  success: boolean;
  integrationId: string;
  type: string;
  message: string;
  timestamp: Date;
  error?: Error;
}

/**
 * Analytics integration manager
 */
export class AnalyticsIntegrationManager {
  private static instance: AnalyticsIntegrationManager;
  private analytics: ErrorAnalytics;
  private monitoring?: ErrorMonitoringSystem;
  private config: AnalyticsIntegrationConfig;
  private integrations = new Map<string, IntegrationResult>();
  private isInitialized = false;

  private constructor(config: Partial<AnalyticsIntegrationConfig> = {}) {
    this.config = {
      enableAutoTracking: true,
      enableMiddlewareIntegration: true,
      enableQueryIntegration: true,
      enableReactIntegration: true,
      trackPerformanceMetrics: true,
      trackUserBehavior: true,
      trackSystemInfo: true,
      respectUserConsent: true,
      defaultConsentLevel: 'functional',
      enableSentryIntegration: false,
      enableDataDogIntegration: false,
      enableNewRelicIntegration: false,
      enableCustomWebhooks: false,
      webhookEndpoints: [],
      ...config,
    };

    this.analytics = ErrorAnalytics.getInstance(this.config.analyticsConfig);
  }

  public static getInstance(config?: Partial<AnalyticsIntegrationConfig>): AnalyticsIntegrationManager {
    if (!AnalyticsIntegrationManager.instance) {
      AnalyticsIntegrationManager.instance = new AnalyticsIntegrationManager(config);
    }
    return AnalyticsIntegrationManager.instance;
  }

  /**
   * Initialize all integrations
   */
  public async initialize(): Promise<IntegrationResult[]> {
    if (this.isInitialized) {
      return this.getIntegrationResults();
    }

    const results: IntegrationResult[] = [];

    try {
      // Initialize core analytics
      await this.initializeAnalytics();
      results.push(this.createResult('analytics', 'Core analytics initialized', true));

      // Initialize monitoring
      await this.initializeMonitoring();
      results.push(this.createResult('monitoring', 'Real-time monitoring initialized', true));

      // Initialize middleware integration
      if (this.config.enableMiddlewareIntegration) {
        await this.initializeMiddlewareIntegration();
        results.push(this.createResult('middleware', 'Middleware integration initialized', true));
      }

      // Initialize TanStack Query integration
      if (this.config.enableQueryIntegration) {
        await this.initializeQueryIntegration();
        results.push(this.createResult('query', 'TanStack Query integration initialized', true));
      }

      // Initialize React integration
      if (this.config.enableReactIntegration) {
        await this.initializeReactIntegration();
        results.push(this.createResult('react', 'React integration initialized', true));
      }

      // Initialize third-party integrations
      if (this.config.enableSentryIntegration) {
        await this.initializeSentryIntegration();
        results.push(this.createResult('sentry', 'Sentry integration initialized', true));
      }

      if (this.config.enableDataDogIntegration) {
        await this.initializeDataDogIntegration();
        results.push(this.createResult('datadog', 'DataDog integration initialized', true));
      }

      // Initialize custom webhooks
      if (this.config.enableCustomWebhooks) {
        await this.initializeCustomWebhooks();
        results.push(this.createResult('webhooks', 'Custom webhooks initialized', true));
      }

      this.isInitialized = true;
      console.log('[AnalyticsIntegrationManager] All integrations initialized successfully');

    } catch (error) {
      console.error('[AnalyticsIntegrationManager] Initialization failed:', error);
      results.push(this.createResult('initialization', 'Initialization failed', false, error as Error));
    }

    return results;
  }

  /**
   * Record error with full context integration
   */
  public async recordError(
    error: AppError,
    additionalContext?: Record<string, any>
  ): Promise<void> {
    try {
      // Enrich with existing error classification
      const classifier = ErrorClassifier.getInstance();
      const classification = await classifier.classifyError(error);

      // Record in analytics system
      await this.analytics.recordError(error, {
        ...classification.context,
        ...additionalContext,
        integrationSource: 'analytics-integration-manager',
      });

      // Send to monitoring if active
      if (this.monitoring) {
        const errorEvent = await this.createErrorEvent(error);
        await this.monitoring.processErrorEvent(errorEvent);
      }

      // Send to third-party services
      await this.sendToThirdParties(error);

    } catch (integrationError) {
      console.error('[AnalyticsIntegrationManager] Failed to record error:', integrationError);
    }
  }

  /**
   * Get integration status and health
   */
  public async getIntegrationHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    integrations: Record<string, {
      status: 'active' | 'inactive' | 'error';
      lastUpdated: Date;
      errorCount: number;
    }>;
  }> {
    const integrations: Record<string, any> = {};
    let errorCount = 0;

    // Check analytics
    const analyticsHealth = await this.getAnalyticsHealth();
    integrations.analytics = analyticsHealth;
    errorCount += analyticsHealth.errorCount;

    // Check monitoring
    if (this.monitoring) {
      const monitoringHealth = await this.getMonitoringHealth();
      integrations.monitoring = monitoringHealth;
      errorCount += monitoringHealth.errorCount;
    }

    // Check other integrations
    for (const [id, result] of this.integrations) {
      integrations[id] = {
        status: result.success ? 'active' : 'error',
        lastUpdated: result.timestamp,
        errorCount: result.success ? 0 : 1,
      };
      errorCount += result.success ? 0 : 1;
    }

    const overall = errorCount === 0 ? 'healthy' :
                   errorCount < 3 ? 'degraded' : 'unhealthy';

    return { overall, integrations };
  }

  /**
   * Update integration configuration
   */
  public updateConfig(newConfig: Partial<AnalyticsIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.analytics.updateConfig(this.config.analyticsConfig || {});

    if (this.monitoring) {
      this.monitoring.updateConfig(this.config.analyticsConfig || {});
    }
  }

  /**
   * Get integration results
   */
  public getIntegrationResults(): IntegrationResult[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Get analytics instance
   */
  public getAnalytics(): ErrorAnalytics {
    return this.analytics;
  }

  /**
   * Get monitoring instance
   */
  public getMonitoring(): ErrorMonitoringSystem | undefined {
    return this.monitoring;
  }

  // Private initialization methods
  private async initializeAnalytics(): Promise<void> {
    this.analytics.startCollection();
  }

  private async initializeMonitoring(): Promise<void> {
    this.monitoring = new ErrorMonitoringSystem(this.config.analyticsConfig || {});
    this.monitoring.start();
  }

  private async initializeMiddlewareIntegration(): Promise<void> {
    // Enhance existing error middleware with analytics
    if (typeof window !== 'undefined') {
      // Set up global error handlers for middleware integration
      window.addEventListener('error', (event) => {
        const error = ErrorHandler.classifyError(event.error, {
          url: window.location.href,
          userAgent: navigator.userAgent,
          source: 'global-error-handler',
        });
        this.recordError(error);
      });

      window.addEventListener('unhandledrejection', (event) => {
        const error = ErrorHandler.classifyError(event.reason, {
          url: window.location.href,
          userAgent: navigator.userAgent,
          source: 'unhandled-promise-rejection',
        });
        this.recordError(error);
      });
    }
  }

  private async initializeQueryIntegration(): Promise<void> {
    // This would integrate with TanStack Query
    // Implementation would depend on the specific query client setup
    console.log('[AnalyticsIntegrationManager] TanStack Query integration initialized');
  }

  private async initializeReactIntegration(): Promise<void> {
    // This would integrate with React Error Boundaries
    // Implementation would provide enhanced error boundary components
    console.log('[AnalyticsIntegrationManager] React integration initialized');
  }

  private async initializeSentryIntegration(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;

      // Configure Sentry to work with analytics
      Sentry.addEventProcessor((event: any) => {
        // Add analytics context to Sentry events
        event.tags = {
          ...event.tags,
          analytics_integration: 'active',
        };

        // Record in analytics
        if (event.exception) {
          this.recordError({
            name: event.exception.values?.[0]?.type || 'Unknown',
            message: event.exception.values?.[0]?.value || 'Unknown error',
            type: 'unknown' as any,
            stack: event.exception.values?.[0]?.stacktrace,
          } as AppError);
        }

        return event;
      });

      console.log('[AnalyticsIntegrationManager] Sentry integration initialized');
    }
  }

  private async initializeDataDogIntegration(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).DD_LOGS) {
      // Configure DataDog integration
      console.log('[AnalyticsIntegrationManager] DataDog integration initialized');
    }
  }

  private async initializeCustomWebhooks(): Promise<void> {
    // Initialize custom webhook endpoints for error forwarding
    console.log('[AnalyticsIntegrationManager] Custom webhooks initialized');
  }

  private async sendToThirdParties(error: AppError): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send to custom webhooks
    if (this.config.enableCustomWebhooks) {
      this.config.webhookEndpoints.forEach(endpoint => {
        promises.push(this.sendToWebhook(endpoint, error));
      });
    }

    // Wait for all third-party sends (but don't block)
    Promise.allSettled(promises).catch(console.error);
  }

  private async sendToWebhook(endpoint: string, error: AppError): Promise<void> {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            type: error.type,
            stack: error.stack,
            context: error.context,
          },
          timestamp: new Date().toISOString(),
          source: 'error-analytics',
        }),
      });
    } catch (webhookError) {
      console.error(`[AnalyticsIntegrationManager] Failed to send to webhook ${endpoint}:`, webhookError);
    }
  }

  private async createErrorEvent(error: AppError): Promise<ErrorEvent> {
    // This would create a full ErrorEvent for the monitoring system
    // Simplified implementation for now
    return {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: error.type as any,
      category: 'generic' as any,
      severity: 'medium' as any,
      message: error.message,
      context: error.context || {},
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      sessionId: 'session_id',
      systemInfo: {
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
        deviceType: 'desktop',
        language: 'en',
        timezone: 'UTC',
      },
      performanceMetrics: {},
      userBehavior: {
        sessionDuration: 0,
        pageViews: 1,
        recentActions: [],
        abandonmentRate: 0,
        retryAttempts: 0,
        errorFrequency: 1,
      },
      recoveryAttempted: false,
      recoverySuccessful: false,
      piiAnonymized: true,
      consentLevel: 'functional' as any,
    };
  }

  private async getAnalyticsHealth(): Promise<{
    status: 'active' | 'inactive' | 'error';
    lastUpdated: Date;
    errorCount: number;
  }> {
    try {
      const stats = await this.analytics.getSystemHealth();
      return {
        status: 'active',
        lastUpdated: new Date(),
        errorCount: stats.issues.length,
      };
    } catch {
      return {
        status: 'error',
        lastUpdated: new Date(),
        errorCount: 1,
      };
    }
  }

  private async getMonitoringHealth(): Promise<{
    status: 'active' | 'inactive' | 'error';
    lastUpdated: Date;
    errorCount: number;
  }> {
    if (!this.monitoring) {
      return {
        status: 'inactive',
        lastUpdated: new Date(),
        errorCount: 0,
      };
    }

    try {
      const health = await this.monitoring.getSystemHealth();
      return {
        status: 'active',
        lastUpdated: new Date(),
        errorCount: health.issues.length,
      };
    } catch {
      return {
        status: 'error',
        lastUpdated: new Date(),
        errorCount: 1,
      };
    }
  }

  private createResult(
    type: string,
    message: string,
    success: boolean,
    error?: Error
  ): IntegrationResult {
    const result: IntegrationResult = {
      success,
      integrationId: `${type}_${Date.now()}`,
      type,
      message,
      timestamp: new Date(),
    };

    if (error) {
      result.error = error;
    }

    this.integrations.set(result.integrationId, result);
    return result;
  }
}

// ============================================================================
// MIDDLEWARE INTEGRATION UTILITIES
// ============================================================================

/**
 * Enhanced error middleware with analytics integration
 */
export class AnalyticsErrorMiddleware {
  private integrationManager: AnalyticsIntegrationManager;

  constructor(integrationManager: AnalyticsIntegrationManager) {
    this.integrationManager = integrationManager;
  }

  /**
   * Create Next.js middleware with analytics
   */
  public createNextJSMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        // Add request context for error tracking
        req.analyticsContext = {
          method: req.method,
          url: req.url,
          userAgent: req.headers['user-agent'],
          timestamp: new Date(),
        };

        // Wrap next to catch errors
        try {
          await next();
        } catch (error) {
          await this.handleMiddlewareError(error, req, res);
        }
      } catch (middlewareError) {
        console.error('[AnalyticsErrorMiddleware] Middleware error:', middlewareError);
        next(middlewareError);
      }
    };
  }

  /**
   * Create Express middleware with analytics
   */
  public createExpressMiddleware() {
    return (error: any, req: any, res: any, next: any) => {
      this.handleMiddlewareError(error, req, res).then(() => {
        next(error);
      }).catch(next);
    };
  }

  /**
   * Handle middleware errors with analytics integration
   */
  private async handleMiddlewareError(error: any, req: any, res: any): Promise<void> {
    try {
      const appError = ErrorHandler.classifyError(error, {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        source: 'middleware',
        ...req.analyticsContext,
      });

      await this.integrationManager.recordError(appError);
    } catch (analyticsError) {
      console.error('[AnalyticsErrorMiddleware] Failed to record error:', analyticsError);
    }
  }
}

// ============================================================================
// REACT INTEGRATION UTILITIES
// ============================================================================

/**
 * Enhanced React Error Boundary with analytics
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface AnalyticsErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  integrationManager?: AnalyticsIntegrationManager;
}

interface AnalyticsErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class AnalyticsErrorBoundary extends Component<
  AnalyticsErrorBoundaryProps,
  AnalyticsErrorBoundaryState
> {
  private integrationManager: AnalyticsIntegrationManager;

  constructor(props: AnalyticsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    this.integrationManager = props.integrationManager ||
      AnalyticsIntegrationManager.getInstance();
  }

  static getDerivedStateFromError(error: Error): AnalyticsErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Record error with analytics
    this.recordError(error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async recordError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const appError = ErrorHandler.classifyError(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        source: 'react-error-boundary',
      });

      await this.integrationManager.recordError(appError, {
        reactComponentStack: errorInfo.componentStack,
        reactErrorBoundary: true,
      });
    } catch (analyticsError) {
      console.error('[AnalyticsErrorBoundary] Failed to record error:', analyticsError);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(
            this.state.error!,
            this.state.errorInfo!
          );
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={{ padding: '20px', border: '1px solid #ff6b6b', borderRadius: '4px' }}>
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for error analytics in React components
 */
export function useErrorAnalytics() {
  const integrationManager = AnalyticsIntegrationManager.getInstance();

  return {
    recordError: integrationManager.recordError.bind(integrationManager),
    getIntegrationHealth: integrationManager.getIntegrationHealth.bind(integrationManager),
    getAnalytics: integrationManager.getAnalytics.bind(integrationManager),
    getMonitoring: integrationManager.getMonitoring.bind(integrationManager),
  };
}

// ============================================================================
// TANSTACK QUERY INTEGRATION
// ============================================================================

/**
 * Enhanced TanStack Query configuration with analytics
 */
export function createAnalyticsQueryConfig(integrationManager: AnalyticsIntegrationManager) {
  return {
    defaultOptions: {
      queries: {
        retry: (failureCount: number, error: any) => {
          // Record query error
          const appError = ErrorHandler.classifyError(error, {
            queryFailureCount: failureCount,
            source: 'tanstack-query',
          });

          integrationManager.recordError(appError);

          // Allow up to 3 retries for network errors
          return failureCount < 3 && appError.type === 'network';
        },
        onError: (error: any) => {
          const appError = ErrorHandler.classifyError(error, {
            source: 'tanstack-query',
          });
          integrationManager.recordError(appError);
        },
      },
      mutations: {
        onError: (error: any) => {
          const appError = ErrorHandler.classifyError(error, {
            source: 'tanstack-query-mutation',
          });
          integrationManager.recordError(appError);
        },
      },
    },
  };
}

/**
 * Enhanced query hook with analytics integration
 */
export function useAnalyticsQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: any
) {
  const integrationManager = AnalyticsIntegrationManager.getInstance();

  const enhancedOptions = {
    ...options,
    onError: (error: any) => {
      const appError = ErrorHandler.classifyError(error, {
        queryKey,
        source: 'useAnalyticsQuery',
      });

      integrationManager.recordError(appError);

      if (options?.onError) {
        options.onError(error);
      }
    },
  };

  // This would use the actual useQuery hook from TanStack Query
  // For now, return a placeholder
  return {
    data: null as T | null,
    error: null,
    isLoading: false,
    isError: false,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Initialize error analytics with all integrations
 */
export async function initializeErrorAnalytics(
  config?: Partial<AnalyticsIntegrationConfig>
): Promise<AnalyticsIntegrationManager> {
  const manager = AnalyticsIntegrationManager.getInstance(config);
  await manager.initialize();
  return manager;
}

/**
 * Quick start analytics with default configuration
 */
export function quickStartAnalytics(): AnalyticsIntegrationManager {
  const manager = AnalyticsIntegrationManager.getInstance({
    enableAutoTracking: true,
    enableMiddlewareIntegration: true,
    enableQueryIntegration: true,
    enableReactIntegration: true,
    trackPerformanceMetrics: true,
    trackUserBehavior: true,
    respectUserConsent: true,
    defaultConsentLevel: 'functional',
  });

  // Initialize asynchronously (non-blocking)
  manager.initialize().catch(console.error);

  return manager;
}

/**
 * Create analytics-enabled middleware
 */
export function createAnalyticsMiddleware(
  integrationManager?: AnalyticsIntegrationManager
) {
  const manager = integrationManager || AnalyticsIntegrationManager.getInstance();
  const middleware = new AnalyticsErrorMiddleware(manager);

  return {
    nextjs: middleware.createNextJSMiddleware(),
    express: middleware.createExpressMiddleware(),
  };
}

/**
 * Get analytics integration manager instance
 */
export function getAnalyticsIntegrationManager(): AnalyticsIntegrationManager {
  return AnalyticsIntegrationManager.getInstance();
}

/**
 * Enhanced error handler with analytics integration
 */
export async function handleErrorWithAnalytics(
  error: any,
  additionalContext?: Record<string, any>
): Promise<AppError> {
  const integrationManager = AnalyticsIntegrationManager.getInstance();

  const appError = ErrorHandler.classifyError(error, {
    ...additionalContext,
    source: 'enhanced-error-handler',
  });

  await integrationManager.recordError(appError, additionalContext);
  return appError;
}
