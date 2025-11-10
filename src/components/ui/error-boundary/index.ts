/**
 * Error Boundary Components
 *
 * Comprehensive error boundary system for umuo.app with specialized handlers
 * for different components and use cases.
 */

// Main Error Boundary
export { ErrorBoundary } from "./ErrorBoundary";
export type { ErrorBoundaryProps } from "./ErrorBoundary";

// Specialized Error Boundaries
export {
  PlayerErrorBoundary,
  AudioPlayerErrorBoundary,
  VideoPlayerErrorBoundary
} from "./PlayerErrorBoundary";
export type { PlayerErrorBoundaryProps } from "./PlayerErrorBoundary";

export {
  TranscriptionErrorBoundary,
  TranscriptionJobErrorBoundary,
  UploadTranscriptionErrorBoundary
} from "./TranscriptionErrorBoundary";
export type { TranscriptionErrorBoundaryProps } from "./TranscriptionErrorBoundary";

export {
  MobileErrorBoundary,
  TouchOptimizedErrorBoundary,
  OfflineFirstErrorBoundary
} from "./MobileErrorBoundary";
export type { MobileErrorBoundaryProps } from "./MobileErrorBoundary";

export {
  PerformanceErrorBoundary,
  GamingPerformanceErrorBoundary,
  StandardPerformanceErrorBoundary
} from "./PerformanceErrorBoundary";
export type { PerformanceErrorBoundaryProps } from "./PerformanceErrorBoundary";

// Error Classification System
export {
  ErrorClassificationProvider,
  useErrorClassification,
  ErrorClassificationDisplay,
  ErrorSeverityIndicator,
  ErrorCategoryBadge
} from "./ErrorClassification";
export type {
  ErrorClassificationConfig,
  ErrorClassificationContextType,
  ClassifiedError,
  CustomErrorCategory,
  CategoryInfo,
  TypeInfo,
  SeverityInfo
} from "./ErrorClassification";

// Fallback UI Components
export {
  FallbackUI,
  NetworkErrorFallback,
  AudioPlayerFallback,
  TranscriptionFallback,
  MobileErrorFallback,
  PerformanceErrorFallback,
  MaintenanceFallback,
  BrowserIncompatibleFallback,
  MinimalFallback,
  LoadingFallback
} from "./FallbackUI";
export type {
  FallbackUIProps,
  FallbackAction,
  FallbackDetails,
  FallbackType
} from "./FallbackUI";

// Error Boundary Integration
export {
  ErrorBoundaryIntegrationProvider,
  IntegratedErrorBoundary,
  useErrorBoundaryIntegration,
  useErrorHandler,
  useErrorRecovery,
  useSystemHealth,
  withErrorBoundary,
  withPageErrorBoundary,
  withSectionErrorBoundary,
  withPlayerErrorBoundary,
  withTranscriptionErrorBoundary
} from "./ErrorBoundaryIntegration";
export type {
  ErrorBoundaryIntegrationConfig,
  ErrorBoundaryIntegrationContextType,
  ErrorHistoryEntry,
  SystemHealth
} from "./ErrorBoundaryIntegration";

// Error Boundary Testing
export {
  ErrorBoundaryTestProvider,
  useErrorBoundaryTesting,
  TestErrorBoundary,
  ErrorTestingPanel,
  ErrorBoundaryDevTools
} from "./ErrorBoundaryTesting";
export type {
  ErrorBoundaryTestConfig,
  ErrorBoundaryTestContextType,
  TestCategory,
  TestErrorType,
  CustomError,
  TestResult
} from "./ErrorBoundaryTesting";

// Re-export existing ErrorBoundary for backward compatibility
export { ErrorBoundary as LegacyErrorBoundary } from "@/components/ui/ErrorBoundary";

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const ErrorBoundaryPresets = {
  // Application-wide configuration
  app: {
    enableRecovery: true,
    showDetails: false,
    allowReport: true,
    maxErrors: 10,
    errorDebounceMs: 5000,
  },

  // Development configuration
  development: {
    enableRecovery: true,
    showDetails: true,
    allowReport: false,
    maxErrors: 20,
    errorDebounceMs: 1000,
  },

  // Production configuration
  production: {
    enableRecovery: true,
    showDetails: false,
    allowReport: true,
    maxErrors: 5,
    errorDebounceMs: 10000,
  },

  // Mobile-optimized configuration
  mobile: {
    enableRecovery: true,
    showDetails: false,
    allowReport: false,
    maxErrors: 3,
    errorDebounceMs: 3000,
  },

  // Critical components configuration
  critical: {
    enableRecovery: false,
    showDetails: false,
    allowReport: true,
    maxErrors: 1,
    errorDebounceMs: 0,
  },
};

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick setup for error boundary integration
 */
export const setupErrorBoundaries = (config: Partial<ErrorBoundaryIntegrationConfig> = {}) => {
  return {
    Provider: ({ children }: { children: React.ReactNode }) => (
      <ErrorBoundaryIntegrationProvider config={config}>
        {children}
      </ErrorBoundaryIntegrationProvider>
    ),
  };
};

/**
 * Create a specialized error boundary with preset configuration
 */
export const createErrorBoundary = (preset: keyof typeof ErrorBoundaryPresets) => {
  const config = ErrorBoundaryPresets[preset];

  return ({ children, ...props }: any) => (
    <ErrorBoundary {...config} {...props}>
      {children}
    </ErrorBoundary>
  );
};

// Export individual components with presets
export const PageErrorBoundary = createErrorBoundary("app");
export const DevelopmentErrorBoundary = createErrorBoundary("development");
export const ProductionErrorBoundary = createErrorBoundary("production");
export const MobileOptimizedErrorBoundary = createErrorBoundary("mobile");
export const CriticalErrorBoundary = createErrorBoundary("critical");
