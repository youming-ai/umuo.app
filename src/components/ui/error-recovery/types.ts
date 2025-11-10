/**
 * Error Recovery Type Definitions
 * Defines types and interfaces for error recovery workflows
 */

import { type AppError, type ErrorType } from "@/lib/utils/error-handler";

export interface RecoveryStep {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  type: "action" | "verification" | "information";
  required: boolean;
  completed: boolean;
  inProgress: boolean;
  error?: string;
  estimatedDuration?: number; // in seconds
  dependencies?: string[]; // step IDs that must be completed first
  actions?: RecoveryAction[];
  verification?: RecoveryVerification;
  successMessage?: string;
  failureMessage?: string;
}

export interface RecoveryAction {
  id: string;
  label: string;
  description?: string;
  type: "primary" | "secondary" | "danger";
  variant: "button" | "link" | "switch" | "input";
  icon?: string;
  handler: () => Promise<RecoveryResult>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  expectedDuration?: number; // in seconds
  retryable?: boolean;
  maxRetries?: number;
  currentRetry?: number;
}

export interface RecoveryVerification {
  type: "manual" | "automatic" | "conditional";
  condition?: () => Promise<boolean>;
  successCriteria?: string;
  failureMessage?: string;
  retryable?: boolean;
}

export interface RecoveryResult {
  success: boolean;
  message?: string;
  details?: Record<string, any>;
  nextStep?: string;
  requiresRetry?: boolean;
  retryDelay?: number;
  completedActions?: string[];
}

export interface RecoveryWorkflow {
  id: string;
  name: string;
  description: string;
  errorType: ErrorType;
  errorContext?: AppError["context"];
  steps: RecoveryStep[];
  currentStepIndex: number;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number; // in seconds
  progress: number; // 0-100
  allowSkipSteps: boolean;
  allowParallel: boolean;
  autoAdvance: boolean;
}

export interface RecoveryProgress {
  currentStep: RecoveryStep;
  completedSteps: RecoveryStep[];
  remainingSteps: RecoveryStep[];
  totalSteps: number;
  progressPercentage: number;
  estimatedTimeRemaining?: number; // in seconds
  elapsedTime?: number; // in seconds
}

export interface RecoveryAnalytics {
  workflowId: string;
  errorType: ErrorType;
  startTime: Date;
  endTime?: Date;
  stepsCompleted: number;
  totalSteps: number;
  success: boolean;
  skippedSteps: string[];
  retryAttempts: number;
  userActions: RecoveryActionLog[];
  userAgent: string;
  sessionId: string;
}

export interface RecoveryActionLog {
  actionId: string;
  stepId: string;
  timestamp: Date;
  success: boolean;
  duration: number; // in milliseconds
  errorMessage?: string;
}

export interface RecoveryTemplate {
  id: string;
  name: string;
  description: string;
  errorTypes: ErrorType[];
  steps: Omit<RecoveryStep, "id" | "completed" | "inProgress">[];
  configurable: boolean;
  allowCustomization: boolean;
}

export interface RecoveryRecommendation {
  workflowId: string;
  confidence: number; // 0-1
  reason: string;
  estimatedSuccessRate: number; // 0-1
  estimatedDuration: number; // in seconds
  prerequisites?: string[];
}

export interface RecoverySession {
  id: string;
  workflow: RecoveryWorkflow;
  originalError: AppError;
  userPreferences: RecoveryUserPreferences;
  analytics: RecoveryAnalytics;
  history: RecoveryHistoryEntry[];
}

export interface RecoveryUserPreferences {
  autoRetry: boolean;
  showDetailedSteps: boolean;
  enableSounds: boolean;
  enableAnimations: boolean;
  preferredLanguage: string;
  accessibilityMode: boolean;
  skipOptionalSteps: boolean;
  confirmationLevel: "none" | "important" | "all";
}

export interface RecoveryHistoryEntry {
  timestamp: Date;
  type: "step_start" | "step_complete" | "step_error" | "action_start" | "action_complete" | "workflow_complete";
  stepId?: string;
  actionId?: string;
  details?: Record<string, any>;
}

export interface MobileOptimization {
  swipeGestures: boolean;
  hapticFeedback: boolean;
  touchOptimized: boolean;
  compactMode: boolean;
  gestureConfig?: {
    leftSwipeAction?: "next_step" | "skip_step" | "cancel";
    rightSwipeAction?: "previous_step" | "retry_action";
    longPressAction?: "show_details" | "show_help";
  };
}

export interface AccessibilityOptions {
  screenReaderSupport: boolean;
  keyboardNavigation: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  voiceControl: boolean;
  largeTextMode: boolean;
  ariaLabels: Record<string, string>;
  keyboardShortcuts: Record<string, string>;
}

export interface RecoveryTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  successColor: string;
  errorColor: string;
  warningColor: string;
  borderRadius: string;
  spacing: string;
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
      xlarge: string;
    };
  };
}

// Type guards and utilities
export function isRecoveryStep(value: unknown): value is RecoveryStep {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "title" in value &&
    "description" in value &&
    "type" in value &&
    "completed" in value &&
    "inProgress" in value
  );
}

export function isRecoveryAction(value: unknown): value is RecoveryAction {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "label" in value &&
    "handler" in value
  );
}

export function getStepStatus(step: RecoveryStep): "pending" | "in_progress" | "completed" | "error" {
  if (step.completed) return "completed";
  if (step.inProgress) return "in_progress";
  if (step.error) return "error";
  return "pending";
}

export function getWorkflowProgress(workflow: RecoveryWorkflow): number {
  const completedSteps = workflow.steps.filter(step => step.completed).length;
  return workflow.totalSteps > 0 ? (completedSteps / workflow.totalSteps) * 100 : 0;
}

// Error Recovery Events
export interface RecoveryEvent {
  type: "workflow_start" | "workflow_complete" | "workflow_cancel" |
        "step_start" | "step_complete" | "step_error" | "step_skip" |
        "action_start" | "action_complete" | "action_error";
  payload: {
    workflowId: string;
    stepId?: string;
    actionId?: string;
    data?: Record<string, any>;
  };
  timestamp: Date;
}

export interface RecoveryEventHandler {
  (event: RecoveryEvent): void;
}

// Export all types for external use
export type {
  AppError,
  ErrorType,
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
  RecoveryEventHandler,
};
