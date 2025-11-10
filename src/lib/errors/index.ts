/**
 * Temporary minimal error exports to get the development server running
 */

// Core exports from existing error handler
export {
  AppError,
  TranscriptionError,
  ErrorHandler,
  handleError,
} from "@/lib/utils/error-handler";

// Essential error classification exports
export {
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  RecoveryStrategy,
} from "./error-classifier";

// Basic recovery exports
export { RecoveryManager, RecoveryAction } from "./recovery-strategies";

// Error middleware
export { ErrorMiddleware } from "./error-middleware";

// TanStack Query integration
export {
  useEnhancedQuery,
  useEnhancedMutation,
} from "./tanstack-query-integration";

// Error boundary
export { EnhancedErrorBoundary } from "./integrations";

// Middleware exports
export { createNextJSMiddleware } from "./error-middleware";
