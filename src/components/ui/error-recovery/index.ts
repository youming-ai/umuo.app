/**
 * Error Recovery UI Components Index
 * Exports all error recovery components, hooks, and utilities
 */

// Core Components
export { default as RecoveryWorkflowComponent } from './RecoveryWorkflow';
export { default as RecoveryStepComponent } from './RecoveryStep';
export { default as RecoveryProgressComponent } from './RecoveryProgress';
export { default as RecoveryActionsComponent } from './RecoveryActions';
export { default as RecoveryWizard } from './RecoveryWizard';

// Mobile Components
export { default as MobileRecoveryInterface } from './MobileRecoveryInterface';

// Accessibility Components
export {
  AccessibilityProvider,
  useAccessibility,
  AccessibleRecoveryStep,
  KeyboardNavigationHelper,
  VoiceControl,
  AccessibilitySettings,
  HighContrastToggle,
  ReducedMotionToggle,
  LargeTextToggle,
  FocusManager,
  accessibilityStyles
} from './accessibility';

// Hooks
export {
  useErrorRecovery,
  useRecoveryTemplates,
  useRecoveryAnalytics,
  useMobileOptimization,
  useAccessibilityOptions,
  useRecoveryHistory
} from './hooks';

// Examples
export {
  default as ErrorRecoveryExamples,
  exampleErrors,
  exampleWorkflows,
  exampleTemplates
} from './examples';

// Types and Interfaces
export type {
  RecoveryStep,
  RecoveryAction,
  RecoveryVerification,
  RecoveryResult,
  RecoveryWorkflow,
  RecoveryProgress,
  RecoveryAnalytics,
  RecoveryActionLog,
  RecoveryTemplate,
  RecoveryRecommendation,
  RecoverySession,
  RecoveryUserPreferences,
  RecoveryHistoryEntry,
  MobileOptimization,
  AccessibilityOptions,
  RecoveryTheme,
  RecoveryEvent,
  RecoveryEventHandler
} from './types';

// Utilities
export {
  isRecoveryStep,
  isRecoveryAction,
  getStepStatus,
  getWorkflowProgress
} from './types';

// Alert Component (required by other components)
export { Alert, AlertDescription, AlertTitle } from '../alert';

// Component Aliases for easier import
export const RecoveryStep = RecoveryStepComponent;
export const RecoveryProgress = RecoveryProgressComponent;
export const RecoveryActions = RecoveryActionsComponent;
export const RecoveryWizardComponent = RecoveryWizard;
