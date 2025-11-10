/**
 * Error Recovery Hooks
 * Custom React hooks for managing error recovery workflows and state
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AppError, ErrorHandler } from "@/lib/utils/error-handler";
import {
  RecoveryWorkflow,
  RecoveryStep,
  RecoveryResult,
  RecoverySession,
  RecoveryAnalytics,
  RecoveryTemplate,
  RecoveryRecommendation,
  RecoveryUserPreferences,
  MobileOptimization,
  AccessibilityOptions,
  ErrorType,
  RecoveryEvent,
  RecoveryEventHandler
} from "./types";

/**
 * Hook for managing error recovery workflows
 */
export function useErrorRecovery(error: AppError, options: {
  autoStart?: boolean;
  enableAnalytics?: boolean;
  userPreferences?: Partial<RecoveryUserPreferences>;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
} = {}) {
  const [workflows, setWorkflows] = useState<RecoveryWorkflow[]>([]);
  const [templates, setTemplates] = useState<RecoveryTemplate[]>([]);
  const [recommendations, setRecommendations] = useState<RecoveryRecommendation[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<RecoveryWorkflow | null>(null);
  const [activeSession, setActiveSession] = useState<RecoverySession | null>(null);
  const [analytics, setAnalytics] = useState<RecoveryAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setHookError] = useState<Error | null>(null);

  const eventHandlersRef = useRef<Map<string, RecoveryEventHandler[]>>(new Map());
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const {
    autoStart = false,
    enableAnalytics = false,
    userPreferences = {},
    mobileOptimization,
    accessibilityOptions
  } = options;

  const defaultUserPreferences: RecoveryUserPreferences = useMemo(() => ({
    autoRetry: true,
    showDetailedSteps: true,
    enableSounds: false,
    enableAnimations: true,
    preferredLanguage: "en",
    accessibilityMode: false,
    skipOptionalSteps: false,
    confirmationLevel: "important",
    ...userPreferences
  }), [userPreferences]);

  // Load workflows for the error type
  useEffect(() => {
    const loadWorkflows = async () => {
      setIsLoading(true);
      try {
        const workflowData = await getWorkflowsForError(error);
        setWorkflows(workflowData);

        // Generate recommendations
        const recs = await generateRecommendations(error, workflowData);
        setRecommendations(recs);

        // Auto-start if enabled and we have workflows
        if (autoStart && workflowData.length > 0) {
          const bestWorkflow = recs.length > 0
            ? workflowData.find(w => w.id === recs[0].workflowId)
            : workflowData[0];

          if (bestWorkflow) {
            await startWorkflow(bestWorkflow);
          }
        }
      } catch (err) {
        setHookError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflows();
  }, [error, autoStart]);

  // Start a recovery workflow
  const startWorkflow = useCallback(async (workflow: RecoveryWorkflow) => {
    try {
      const session: RecoverySession = {
        id: sessionIdRef.current,
        workflow: {
          ...workflow,
          status: "in_progress",
          startedAt: new Date(),
          currentStepIndex: 0,
          progress: 0
        },
        originalError: error,
        userPreferences: defaultUserPreferences,
        analytics: enableAnalytics ? {
          workflowId: workflow.id,
          errorType: error.type,
          startTime: new Date(),
          stepsCompleted: 0,
          totalSteps: workflow.steps.length,
          success: false,
          skippedSteps: [],
          retryAttempts: 0,
          userActions: [],
          userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
          sessionId: sessionIdRef.current
        } : undefined,
        history: [{
          timestamp: new Date(),
          type: "workflow_start",
          details: { workflowId: workflow.id }
        }]
      };

      setActiveWorkflow(session.workflow);
      setActiveSession(session);

      if (enableAnalytics) {
        setAnalytics(session.analytics!);
      }

      emitEvent("workflow_start", {
        workflowId: workflow.id,
        data: { error: error.message }
      });

      return session;
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [error, defaultUserPreferences, enableAnalytics]);

  // Complete a step in the workflow
  const completeStep = useCallback(async (stepId: string, result: RecoveryResult) => {
    if (!activeWorkflow || !activeSession) {
      throw new Error("No active workflow session");
    }

    try {
      const updatedSteps = activeWorkflow.steps.map(step =>
        step.id === stepId
          ? { ...step, completed: true, inProgress: false }
          : step
      );

      const nextStepIndex = updatedSteps.findIndex((step, index) =>
        index > activeWorkflow.currentStepIndex && !step.completed
      );

      const updatedWorkflow: RecoveryWorkflow = {
        ...activeWorkflow,
        steps: updatedSteps,
        currentStepIndex: nextStepIndex >= 0 ? nextStepIndex : updatedSteps.length - 1,
        progress: (updatedSteps.filter(s => s.completed).length / updatedSteps.length) * 100,
        status: updatedSteps.every(s => s.completed) ? "completed" : "in_progress"
      };

      const updatedSession: RecoverySession = {
        ...activeSession,
        workflow: updatedWorkflow,
        history: [...activeSession.history, {
          timestamp: new Date(),
          type: "step_complete",
          stepId,
          details: { result }
        }]
      };

      // Update analytics
      let updatedAnalytics = analytics;
      if (enableAnalytics && analytics) {
        updatedAnalytics = {
          ...analytics,
          stepsCompleted: analytics.stepsCompleted + 1,
          userActions: [...analytics.userActions, {
            actionId: stepId,
            stepId,
            timestamp: new Date(),
            success: result.success,
            duration: 0 // Would be calculated from actual execution time
          }]
        };
        setAnalytics(updatedAnalytics);
      }

      setActiveWorkflow(updatedWorkflow);
      setActiveSession(updatedSession);

      emitEvent("step_complete", {
        workflowId: updatedWorkflow.id,
        stepId,
        data: { result }
      });

      // Auto-complete if all steps are done
      if (updatedWorkflow.status === "completed") {
        await completeWorkflow(updatedSession, updatedAnalytics);
      }

      return updatedSession;
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [activeWorkflow, activeSession, analytics, enableAnalytics]);

  // Complete the entire workflow
  const completeWorkflow = useCallback(async (session: RecoverySession, analytics?: RecoveryAnalytics | null) => {
    try {
      const completedWorkflow = {
        ...session.workflow,
        status: "completed" as const,
        completedAt: new Date(),
        progress: 100
      };

      const finalSession: RecoverySession = {
        ...session,
        workflow: completedWorkflow,
        history: [...session.history, {
          timestamp: new Date(),
          type: "workflow_complete",
          details: { success: true }
        }]
      };

      let finalAnalytics = analytics;
      if (enableAnalytics && analytics) {
        finalAnalytics = {
          ...analytics,
          success: true,
          endTime: new Date()
        };
        setAnalytics(finalAnalytics);
      }

      setActiveWorkflow(completedWorkflow);
      setActiveSession(finalSession);

      emitEvent("workflow_complete", {
        workflowId: completedWorkflow.id,
        data: { success: true, analytics: finalAnalytics }
      });

      return finalSession;
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [enableAnalytics]);

  // Handle step errors
  const handleStepError = useCallback(async (stepId: string, errorMessage: string) => {
    if (!activeWorkflow || !activeSession) {
      throw new Error("No active workflow session");
    }

    try {
      const updatedSteps = activeWorkflow.steps.map(step =>
        step.id === stepId
          ? { ...step, error: errorMessage, inProgress: false }
          : step
      );

      const updatedWorkflow: RecoveryWorkflow = {
        ...activeWorkflow,
        steps: updatedSteps,
        status: "failed"
      };

      const updatedSession: RecoverySession = {
        ...activeSession,
        workflow: updatedWorkflow,
        history: [...activeSession.history, {
          timestamp: new Date(),
          type: "step_error",
          stepId,
          details: { error: errorMessage }
        }]
      };

      setActiveWorkflow(updatedWorkflow);
      setActiveSession(updatedSession);

      emitEvent("step_error", {
        workflowId: updatedWorkflow.id,
        stepId,
        data: { error: errorMessage }
      });

      return updatedSession;
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [activeWorkflow, activeSession]);

  // Skip a step
  const skipStep = useCallback(async (stepId: string) => {
    if (!activeWorkflow || !activeSession) {
      throw new Error("No active workflow session");
    }

    try {
      const updatedSteps = activeWorkflow.steps.map(step =>
        step.id === stepId ? { ...step, completed: true, inProgress: false } : step
      );

      const updatedWorkflow: RecoveryWorkflow = {
        ...activeWorkflow,
        steps: updatedSteps,
        currentStepIndex: activeWorkflow.currentStepIndex + 1,
        progress: (updatedSteps.filter(s => s.completed).length / updatedSteps.length) * 100
      };

      const updatedSession: RecoverySession = {
        ...activeSession,
        workflow: updatedWorkflow,
        history: [...activeSession.history, {
          timestamp: new Date(),
          type: "step_skip",
          stepId
        }]
      };

      setActiveWorkflow(updatedWorkflow);
      setActiveSession(updatedSession);

      emitEvent("step_skip", {
        workflowId: updatedWorkflow.id,
        stepId
      });

      return updatedSession;
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [activeWorkflow, activeSession]);

  // Cancel the workflow
  const cancelWorkflow = useCallback(async () => {
    if (!activeWorkflow || !activeSession) {
      throw new Error("No active workflow session");
    }

    try {
      const cancelledWorkflow: RecoveryWorkflow = {
        ...activeWorkflow,
        status: "cancelled",
        completedAt: new Date()
      };

      const cancelledSession: RecoverySession = {
        ...activeSession,
        workflow: cancelledWorkflow,
        history: [...activeSession.history, {
          timestamp: new Date(),
          type: "workflow_cancel"
        }]
      };

      setActiveWorkflow(cancelledWorkflow);
      setActiveSession(cancelledSession);

      emitEvent("workflow_cancel", {
        workflowId: cancelledWorkflow.id
      });

      return cancelledSession;
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [activeWorkflow, activeSession]);

  // Event handling
  const addEventListener = useCallback((eventType: string, handler: RecoveryEventHandler) => {
    const handlers = eventHandlersRef.current.get(eventType) || [];
    eventHandlersRef.current.set(eventType, [...handlers, handler]);

    return () => {
      const currentHandlers = eventHandlersRef.current.get(eventType) || [];
      eventHandlersRef.current.set(
        eventType,
        currentHandlers.filter(h => h !== handler)
      );
    };
  }, []);

  const emitEvent = useCallback((eventType: string, payload: any) => {
    const handlers = eventHandlersRef.current.get(eventType) || [];
    const event: RecoveryEvent = {
      type: eventType as any,
      payload,
      timestamp: new Date()
    };

    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (err) {
        console.error("Error in event handler:", err);
      }
    });
  }, []);

  return {
    // State
    workflows,
    templates,
    recommendations,
    activeWorkflow,
    activeSession,
    analytics,
    isLoading,
    error: hookError,

    // Actions
    startWorkflow,
    completeStep,
    completeWorkflow,
    handleStepError,
    skipStep,
    cancelWorkflow,

    // Event handling
    addEventListener,

    // Utilities
    userPreferences: defaultUserPreferences,
    sessionId: sessionIdRef.current
  };
}

/**
 * Hook for managing recovery templates
 */
export function useRecoveryTemplates(errorType?: ErrorType) {
  const [templates, setTemplates] = useState<RecoveryTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setHookError] = useState<Error | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      try {
        const templateData = await getRecoveryTemplates(errorType);
        setTemplates(templateData);
      } catch (err) {
        setHookError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [errorType]);

  const createTemplate = useCallback(async (template: Omit<RecoveryTemplate, "id">) => {
    try {
      const newTemplate: RecoveryTemplate = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      setTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  const updateTemplate = useCallback(async (templateId: string, updates: Partial<RecoveryTemplate>) => {
    try {
      setTemplates(prev => prev.map(template =>
        template.id === templateId ? { ...template, ...updates } : template
      ));
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      setTemplates(prev => prev.filter(template => template.id !== templateId));
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  return {
    templates,
    isLoading,
    error: hookError,
    createTemplate,
    updateTemplate,
    deleteTemplate
  };
}

/**
 * Hook for managing recovery analytics
 */
export function useRecoveryAnalytics(sessionId?: string) {
  const [analytics, setAnalytics] = useState<RecoveryAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setHookError] = useState<Error | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!sessionId) return;

      setIsLoading(true);
      try {
        const analyticsData = await getRecoveryAnalytics(sessionId);
        setAnalytics(analyticsData);
      } catch (err) {
        setHookError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [sessionId]);

  const trackEvent = useCallback((event: RecoveryEvent) => {
    // This would typically send data to an analytics service
    console.log("Tracking recovery event:", event);
  }, []);

  const getSuccessRate = useCallback((errorType?: ErrorType) => {
    const filteredAnalytics = errorType
      ? analytics.filter(a => a.errorType === errorType)
      : analytics;

    if (filteredAnalytics.length === 0) return 0;

    const successCount = filteredAnalytics.filter(a => a.success).length;
    return successCount / filteredAnalytics.length;
  }, [analytics]);

  const getAverageDuration = useCallback((errorType?: ErrorType) => {
    const filteredAnalytics = errorType
      ? analytics.filter(a => a.errorType === errorType && a.endTime)
      : analytics.filter(a => a.endTime);

    if (filteredAnalytics.length === 0) return 0;

    const totalDuration = filteredAnalytics.reduce((sum, a) => {
      return sum + (a.endTime!.getTime() - a.startTime.getTime());
    }, 0);

    return totalDuration / filteredAnalytics.length;
  }, [analytics]);

  return {
    analytics,
    isLoading,
    error: hookError,
    trackEvent,
    getSuccessRate,
    getAverageDuration
  };
}

/**
 * Hook for managing mobile optimization settings
 */
export function useMobileOptimization() {
  const [settings, setSettings] = useState<MobileOptimization>({
    swipeGestures: true,
    hapticFeedback: true,
    touchOptimized: true,
    compactMode: false,
    gestureConfig: {
      leftSwipeAction: "next_step",
      rightSwipeAction: "retry_action",
      longPressAction: "show_details"
    }
  });

  const updateSetting = useCallback(<K extends keyof MobileOptimization>(
    key: K,
    value: MobileOptimization[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateGestureConfig = useCallback(<K extends keyof NonNullable<MobileOptimization['gestureConfig']>>(
    key: K,
    value: NonNullable<MobileOptimization['gestureConfig']>[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      gestureConfig: {
        ...prev.gestureConfig,
        [key]: value
      }
    }));
  }, []);

  return {
    settings,
    updateSetting,
    updateGestureConfig
  };
}

/**
 * Hook for managing accessibility settings
 */
export function useAccessibilityOptions() {
  const [options, setOptions] = useState<AccessibilityOptions>({
    screenReaderSupport: true,
    keyboardNavigation: true,
    highContrastMode: false,
    reducedMotion: false,
    voiceControl: false,
    largeTextMode: false,
    ariaLabels: {},
    keyboardShortcuts: {
      "next_step": "Ctrl+ArrowRight",
      "previous_step": "Ctrl+ArrowLeft",
      "pause_resume": "Ctrl+Space",
      "toggle_help": "Ctrl+H",
      "show_shortcuts": "Ctrl+?"
    }
  });

  const updateOption = useCallback(<K extends keyof AccessibilityOptions>(
    key: K,
    value: AccessibilityOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  const addAriaLabel = useCallback((key: string, label: string) => {
    setOptions(prev => ({
      ...prev,
      ariaLabels: { ...prev.ariaLabels, [key]: label }
    }));
  }, []);

  const addKeyboardShortcut = useCallback((action: string, shortcut: string) => {
    setOptions(prev => ({
      ...prev,
      keyboardShortcuts: { ...prev.keyboardShortcuts, [action]: shortcut }
    }));
  }, []);

  return {
    options,
    updateOption,
    addAriaLabel,
    addKeyboardShortcut
  };
}

/**
 * Hook for managing recovery history
 */
export function useRecoveryHistory() {
  const [history, setHistory] = useState<RecoverySession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setHookError] = useState<Error | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const historyData = await getRecoveryHistory();
        setHistory(historyData);
      } catch (err) {
        setHookError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  const addToHistory = useCallback((session: RecoverySession) => {
    setHistory(prev => [session, ...prev]);
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      setHistory([]);
      await clearRecoveryHistory();
    } catch (err) {
      setHookError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const getSessionStats = useCallback(() => {
    const totalSessions = history.length;
    const successfulSessions = history.filter(s => s.analytics?.success).length;
    const averageSteps = history.reduce((sum, s) => sum + s.workflow.steps.length, 0) / totalSessions;

    return {
      totalSessions,
      successfulSessions,
      successRate: totalSessions > 0 ? successfulSessions / totalSessions : 0,
      averageSteps
    };
  }, [history]);

  return {
    history,
    isLoading,
    error: hookError,
    addToHistory,
    clearHistory,
    getSessionStats
  };
}

// Utility functions (these would typically be API calls or database operations)
async function getWorkflowsForError(error: AppError): Promise<RecoveryWorkflow[]> {
  // In a real implementation, this would fetch workflows based on error type
  return [];
}

async function generateRecommendations(error: AppError, workflows: RecoveryWorkflow[]): Promise<RecoveryRecommendation[]> {
  // In a real implementation, this would analyze the error and recommend workflows
  return [];
}

async function getRecoveryTemplates(errorType?: ErrorType): Promise<RecoveryTemplate[]> {
  // In a real implementation, this would fetch templates from storage
  return [];
}

async function getRecoveryAnalytics(sessionId: string): Promise<RecoveryAnalytics[]> {
  // In a real implementation, this would fetch analytics data
  return [];
}

async function getRecoveryHistory(): Promise<RecoverySession[]> {
  // In a real implementation, this would fetch session history
  return [];
}

async function clearRecoveryHistory(): Promise<void> {
  // In a real implementation, this would clear stored history
}
