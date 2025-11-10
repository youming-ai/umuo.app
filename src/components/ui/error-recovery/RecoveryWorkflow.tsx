"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
  Minimize2,
  Download,
  Share,
  History,
  Target,
  TrendingUp,
  Activity,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AppError,
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
  ErrorType
} from "./types";
import RecoveryStepComponent from "./RecoveryStep";
import RecoveryProgressComponent from "./RecoveryProgress";
import RecoveryActionsComponent from "./RecoveryActions";
import RecoveryWizard from "./RecoveryWizard";

interface RecoveryWorkflowComponentProps {
  error: AppError;
  availableWorkflows?: RecoveryWorkflow[];
  templates?: RecoveryTemplate[];
  recommendations?: RecoveryRecommendation[];
  onWorkflowStart?: (workflow: RecoveryWorkflow) => void;
  onWorkflowComplete?: (workflow: RecoveryWorkflow, results: RecoveryResult[]) => void;
  onWorkflowCancel?: (workflow: RecoveryWorkflow) => void;
  onErrorResolve?: (error: AppError) => void;
  onErrorPersist?: (error: AppError) => void;
  userPreferences?: RecoveryUserPreferences;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
  showRecommendations?: boolean;
  allowCustomWorkflow?: boolean;
  enableAnalytics?: boolean;
  className?: string;
}

export function RecoveryWorkflowComponent({
  error,
  availableWorkflows = [],
  templates = [],
  recommendations = [],
  onWorkflowStart,
  onWorkflowComplete,
  onWorkflowCancel,
  onErrorResolve,
  onErrorPersist,
  userPreferences,
  mobileOptimization,
  accessibilityOptions,
  showRecommendations = true,
  allowCustomWorkflow = false,
  enableAnalytics = false,
  className
}: RecoveryWorkflowComponentProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<RecoveryWorkflow | null>(null);
  const [activeSession, setActiveSession] = useState<RecoverySession | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [viewMode, setViewMode] = useState<"wizard" | "manual" | "summary">("wizard");
  const [analytics, setAnalytics] = useState<RecoveryAnalytics | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "recommended" | "custom">("recommended");
  const workflowRef = useRef<HTMLDivElement>(null);

  // Generate a session ID for tracking
  const sessionId = useMemo(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create default workflow if none provided
  const defaultWorkflow = useMemo(() => {
    return createDefaultWorkflow(error);
  }, [error]);

  // Combine available workflows with default
  const allWorkflows = useMemo(() => {
    const workflows = availableWorkflows.length > 0 ? availableWorkflows : [defaultWorkflow];
    return filterWorkflows(workflows, filterStatus);
  }, [availableWorkflows, defaultWorkflow, filterStatus]);

  // Filter workflows based on status
  const filterWorkflows = (workflows: RecoveryWorkflow[], status: typeof filterStatus) => {
    switch (status) {
      case "recommended":
        return workflows.filter(w =>
          recommendations.some(r => r.workflowId === w.id)
        );
      case "custom":
        return workflows.filter(w =>
          !recommendations.some(r => r.workflowId === w.id)
        );
      default:
        return workflows;
    }
  };

  // Initialize analytics if enabled
  useEffect(() => {
    if (enableAnalytics && selectedWorkflow) {
      const newAnalytics: RecoveryAnalytics = {
        workflowId: selectedWorkflow.id,
        errorType: error.type,
        startTime: new Date(),
        stepsCompleted: 0,
        totalSteps: selectedWorkflow.steps.length,
        success: false,
        skippedSteps: [],
        retryAttempts: 0,
        userActions: [],
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
        sessionId
      };
      setAnalytics(newAnalytics);
    }
  }, [enableAnalytics, selectedWorkflow, error.type, sessionId]);

  // Create a recovery session
  const createSession = useCallback((workflow: RecoveryWorkflow): RecoverySession => {
    return {
      id: `session_${Date.now()}`,
      workflow,
      originalError: error,
      userPreferences: userPreferences || getDefaultUserPreferences(),
      analytics: analytics || {
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
        sessionId
      },
      history: []
    };
  }, [error, userPreferences, analytics, sessionId]);

  // Handle workflow selection
  const handleWorkflowSelect = useCallback((workflow: RecoveryWorkflow) => {
    setSelectedWorkflow(workflow);
    const session = createSession(workflow);
    setActiveSession(session);
    setViewMode("wizard");
    onWorkflowStart?.(workflow);
  }, [createSession, onWorkflowStart]);

  // Handle workflow events
  const handleWorkflowStart = useCallback(() => {
    if (!selectedWorkflow || !activeSession) return;

    const updatedWorkflow = {
      ...selectedWorkflow,
      status: "in_progress" as const,
      startedAt: new Date(),
      currentStepIndex: 0,
      progress: 0
    };

    setSelectedWorkflow(updatedWorkflow);
    setActiveSession(prev => prev ? {
      ...prev,
      workflow: updatedWorkflow,
      history: [...prev.history, {
        timestamp: new Date(),
        type: "workflow_start",
        details: { workflowId: updatedWorkflow.id }
      }]
    } : null);

    updateAnalytics("workflow_start");
  }, [selectedWorkflow, activeSession]);

  const handleWorkflowComplete = useCallback((results: RecoveryResult[]) => {
    if (!selectedWorkflow || !activeSession) return;

    const completedWorkflow = {
      ...selectedWorkflow,
      status: "completed" as const,
      completedAt: new Date(),
      progress: 100
    };

    setSelectedWorkflow(completedWorkflow);
    setActiveSession(prev => prev ? {
      ...prev,
      workflow: completedWorkflow,
      history: [...prev.history, {
        timestamp: new Date(),
        type: "workflow_complete",
        details: { results, workflowId: completedWorkflow.id }
      }]
    } : null);

    onWorkflowComplete?.(completedWorkflow, results);
    onErrorResolve?.(error);
    updateAnalytics("workflow_complete", { results });
  }, [selectedWorkflow, activeSession, onWorkflowComplete, onErrorResolve, error]);

  const handleWorkflowCancel = useCallback(() => {
    if (!selectedWorkflow || !activeSession) return;

    const cancelledWorkflow = {
      ...selectedWorkflow,
      status: "cancelled" as const,
      completedAt: new Date()
    };

    setSelectedWorkflow(cancelledWorkflow);
    setActiveSession(prev => prev ? {
      ...prev,
      workflow: cancelledWorkflow,
      history: [...prev.history, {
        timestamp: new Date(),
        type: "workflow_cancel",
        details: { workflowId: cancelledWorkflow.id }
      }]
    } : null);

    onWorkflowCancel?.(cancelledWorkflow);
    onErrorPersist?.(error);
    updateAnalytics("workflow_cancel");
  }, [selectedWorkflow, activeSession, onWorkflowCancel, onErrorPersist, error]);

  const handleStepComplete = useCallback((stepId: string, result: RecoveryResult) => {
    if (!selectedWorkflow || !activeSession) return;

    const updatedSteps = selectedWorkflow.steps.map(step =>
      step.id === stepId ? { ...step, completed: true, inProgress: false } : step
    );

    const nextStepIndex = updatedSteps.findIndex((step, index) =>
      index > selectedWorkflow.currentStepIndex && !step.completed
    );

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: updatedSteps,
      currentStepIndex: nextStepIndex >= 0 ? nextStepIndex : updatedSteps.length - 1,
      progress: (updatedSteps.filter(s => s.completed).length / updatedSteps.length) * 100
    };

    setSelectedWorkflow(updatedWorkflow);
    setActiveSession(prev => prev ? {
      ...prev,
      workflow: updatedWorkflow,
      history: [...prev.history, {
        timestamp: new Date(),
        type: "step_complete",
        stepId,
        details: { result }
      }]
    } : null);

    updateAnalytics("step_complete", { stepId, result });
  }, [selectedWorkflow, activeSession]);

  const handleStepError = useCallback((stepId: string, errorMessage: string) => {
    if (!selectedWorkflow || !activeSession) return;

    const updatedSteps = selectedWorkflow.steps.map(step =>
      step.id === stepId ? { ...step, error: errorMessage, inProgress: false } : step
    );

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: updatedSteps,
      status: "failed" as const
    };

    setSelectedWorkflow(updatedWorkflow);
    setActiveSession(prev => prev ? {
      ...prev,
      workflow: updatedWorkflow,
      history: [...prev.history, {
        timestamp: new Date(),
        type: "step_error",
        stepId,
        details: { error: errorMessage }
      }]
    } : null);

    updateAnalytics("step_error", { stepId, error: errorMessage });
  }, [selectedWorkflow, activeSession]);

  const handleStepSkip = useCallback((stepId: string) => {
    if (!selectedWorkflow || !activeSession) return;

    const updatedSteps = selectedWorkflow.steps.map(step =>
      step.id === stepId ? { ...step, completed: true, inProgress: false } : step
    );

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: updatedSteps,
      currentStepIndex: selectedWorkflow.currentStepIndex + 1,
      progress: (updatedSteps.filter(s => s.completed).length / updatedSteps.length) * 100
    };

    setSelectedWorkflow(updatedWorkflow);
    setActiveSession(prev => prev ? {
      ...prev,
      workflow: updatedWorkflow,
      history: [...prev.history, {
        timestamp: new Date(),
        type: "step_skip",
        stepId
      }]
    } : null);

    updateAnalytics("step_skip", { stepId });
  }, [selectedWorkflow, activeSession]);

  const handleActionExecute = useCallback((stepId: string, actionId: string, result: RecoveryResult) => {
    if (!selectedWorkflow || !activeSession) return;

    const updatedSteps = selectedWorkflow.steps.map(step =>
      step.id === stepId ? { ...step, inProgress: true } : step
    );

    const updatedWorkflow = {
      ...selectedWorkflow,
      steps: updatedSteps
    };

    setSelectedWorkflow(updatedWorkflow);
    setActiveSession(prev => prev ? {
      ...prev,
      workflow: updatedWorkflow,
      history: [...prev.history, {
        timestamp: new Date(),
        type: "action_start",
        stepId,
        actionId,
        details: { result }
      }]
    } : null);

    // Update analytics for user action
    if (analytics) {
      const actionLog = {
        actionId,
        stepId,
        timestamp: new Date(),
        success: result.success,
        duration: 0, // Would be calculated from actual execution time
        errorMessage: result.success ? undefined : result.message
      };

      setAnalytics(prev => prev ? {
        ...prev,
        userActions: [...prev.userActions, actionLog],
        retryAttempts: result.requiresRetry ? prev.retryAttempts + 1 : prev.retryAttempts
      } : null);
    }
  }, [selectedWorkflow, activeSession, analytics]);

  // Update analytics helper
  const updateAnalytics = useCallback((eventType: string, data?: any) => {
    if (!analytics) return;

    setAnalytics(prev => prev ? {
      ...prev,
      ...(eventType === "step_complete" && {
        stepsCompleted: prev.stepsCompleted + 1
      }),
      ...(eventType === "workflow_complete" && {
        success: true,
        endTime: new Date()
      }),
      ...(eventType === "workflow_cancel" && {
        endTime: new Date()
      })
    } : null);
  }, [analytics]);

  // If minimized, show minimal interface
  if (isMinimized && selectedWorkflow) {
    return (
      <Card className={cn("fixed bottom-4 right-4 z-50 max-w-sm", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{selectedWorkflow.name}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Progress value={selectedWorkflow.progress} className="h-1 flex-1" />
                <span>{Math.round(selectedWorkflow.progress)}%</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main workflow interface
  return (
    <div ref={workflowRef} className={cn("space-y-6", className)}>
      {/* Workflow Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Error Recovery Workflow
              </CardTitle>
              <CardDescription>
                Resolve the {error.type} error with guided recovery steps
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="status-error" className="capitalize">
                {error.type.replace('_', ' ')}
              </Badge>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {selectedWorkflow && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(true)}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            {/* Error Summary */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error.message}
                {error.suggestedAction && (
                  <> <strong>Suggested action:</strong> {error.suggestedAction}</>
                )}
              </AlertDescription>
            </Alert>

            {/* View Mode Selector */}
            {selectedWorkflow && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">View:</span>
                <div className="flex gap-1">
                  {(["wizard", "manual", "summary"] as const).map(mode => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode(mode)}
                      className="capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Workflow Selection */}
            {!selectedWorkflow && (
              <div className="space-y-4">
                {showRecommendations && recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Recommended Workflows
                    </h4>
                    <div className="grid gap-3">
                      {recommendations
                        .filter(rec => allWorkflows.some(w => w.id === rec.workflowId))
                        .map(rec => {
                          const workflow = allWorkflows.find(w => w.id === rec.workflowId);
                          if (!workflow) return null;

                          return (
                            <WorkflowCard
                              key={rec.workflowId}
                              workflow={workflow}
                              recommendation={rec}
                              onSelect={() => handleWorkflowSelect(workflow)}
                              mobileOptimization={mobileOptimization}
                            />
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* All Available Workflows */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Available Workflows
                    </h4>
                    <div className="flex gap-1">
                      {(["all", "recommended", "custom"] as const).map(status => (
                        <Button
                          key={status}
                          variant={filterStatus === status ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setFilterStatus(status)}
                          className="capitalize"
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {allWorkflows.map(workflow => (
                      <WorkflowCard
                        key={workflow.id}
                        workflow={workflow}
                        recommendation={recommendations.find(r => r.workflowId === workflow.id)}
                        onSelect={() => handleWorkflowSelect(workflow)}
                        mobileOptimization={mobileOptimization}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Active Workflow */}
      {selectedWorkflow && activeSession && viewMode === "wizard" && (
        <RecoveryWizard
          workflow={selectedWorkflow}
          session={activeSession}
          onWorkflowStart={handleWorkflowStart}
          onWorkflowComplete={handleWorkflowComplete}
          onWorkflowCancel={handleWorkflowCancel}
          onStepComplete={handleStepComplete}
          onStepError={handleStepError}
          onStepSkip={handleStepSkip}
          onActionExecute={handleActionExecute}
          onSessionUpdate={setActiveSession}
          mobileOptimization={mobileOptimization}
          accessibilityOptions={accessibilityOptions}
        />
      )}

      {selectedWorkflow && activeSession && viewMode === "manual" && (
        <ManualView
          workflow={selectedWorkflow}
          session={activeSession}
          onStepComplete={handleStepComplete}
          onStepError={handleStepError}
          onStepSkip={handleStepSkip}
          onActionExecute={handleActionExecute}
          mobileOptimization={mobileOptimization}
          accessibilityOptions={accessibilityOptions}
        />
      )}

      {selectedWorkflow && activeSession && viewMode === "summary" && (
        <SummaryView
          workflow={selectedWorkflow}
          session={activeSession}
          analytics={analytics}
          onExport={() => exportSessionData(activeSession, analytics)}
          mobileOptimization={mobileOptimization}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          userPreferences={userPreferences || getDefaultUserPreferences()}
          mobileOptimization={mobileOptimization}
          accessibilityOptions={accessibilityOptions}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// Helper Components and Functions

function createDefaultWorkflow(error: AppError): RecoveryWorkflow {
  const defaultSteps: RecoveryStep[] = [
    {
      id: "identify_issue",
      title: "Identify the Issue",
      description: "Analyze the error to understand its root cause",
      instructions: [
        "Review the error message and details",
        "Check recent changes or actions that might have caused this",
        "Identify which part of the system is affected"
      ],
      type: "information",
      required: true,
      completed: false,
      inProgress: false,
      estimatedDuration: 60
    },
    {
      id: "basic_troubleshooting",
      title: "Basic Troubleshooting",
      description: "Perform initial troubleshooting steps",
      instructions: [
        "Refresh the page or restart the application",
        "Check your internet connection",
        "Verify all required configurations are correct"
      ],
      type: "action",
      required: true,
      completed: false,
      inProgress: false,
      estimatedDuration: 120,
      actions: [
        {
          id: "refresh_page",
          label: "Refresh Page",
          description: "Reload the current page to clear temporary issues",
          type: "primary",
          variant: "button",
          handler: async () => {
            window.location.reload();
            return { success: true, message: "Page refreshed" };
          }
        }
      ]
    },
    {
      id: "verify_fix",
      title: "Verify the Fix",
      description: "Confirm that the issue has been resolved",
      instructions: [
        "Test the functionality that was failing",
        "Check that the error no longer occurs",
        "Verify system stability"
      ],
      type: "verification",
      required: true,
      completed: false,
      inProgress: false,
      estimatedDuration: 60
    }
  ];

  return {
    id: `default_workflow_${error.type}_${Date.now()}`,
    name: `${error.type.replace('_', ' ')} Recovery`,
    description: `Recovery workflow for ${error.type} errors`,
    errorType: error.type,
    steps: defaultSteps,
    currentStepIndex: 0,
    status: "pending",
    progress: 0,
    allowSkipSteps: true,
    allowParallel: false,
    autoAdvance: true,
    estimatedDuration: defaultSteps.reduce((total, step) => total + (step.estimatedDuration || 0), 0)
  };
}

function getDefaultUserPreferences(): RecoveryUserPreferences {
  return {
    autoRetry: true,
    showDetailedSteps: true,
    enableSounds: false,
    enableAnimations: true,
    preferredLanguage: "en",
    accessibilityMode: false,
    skipOptionalSteps: false,
    confirmationLevel: "important"
  };
}

interface WorkflowCardProps {
  workflow: RecoveryWorkflow;
  recommendation?: RecoveryRecommendation;
  onSelect: () => void;
  mobileOptimization?: MobileOptimization;
}

function WorkflowCard({ workflow, recommendation, onSelect, mobileOptimization }: WorkflowCardProps) {
  const isRecommended = !!recommendation;
  const successRate = recommendation?.estimatedSuccessRate || 0.8;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isRecommended && "border-primary ring-1 ring-primary/20",
        mobileOptimization?.touchOptimized && "touch-manipulation"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium flex items-center gap-2">
              {workflow.name}
              {isRecommended && (
                <Badge variant="secondary" className="text-xs">
                  Recommended
                </Badge>
              )}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {workflow.description}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{workflow.steps.length} steps</span>
              <span>{Math.round(workflow.estimatedDuration / 60)}m</span>
              {isRecommended && (
                <span className="flex items-center gap-1 text-status-success">
                  <TrendingUp className="h-3 w-3" />
                  {Math.round(successRate * 100)}% success rate
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ManualViewProps {
  workflow: RecoveryWorkflow;
  session: RecoverySession;
  onStepComplete: (stepId: string, result: any) => void;
  onStepError: (stepId: string, error: string) => void;
  onStepSkip: (stepId: string) => void;
  onActionExecute: (stepId: string, actionId: string, result: any) => void;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
}

function ManualView({
  workflow,
  session,
  onStepComplete,
  onStepError,
  onStepSkip,
  onActionExecute,
  mobileOptimization,
  accessibilityOptions
}: ManualViewProps) {
  const [selectedStepId, setSelectedStepId] = useState<string>(workflow.steps[0]?.id || "");

  const selectedStep = workflow.steps.find(step => step.id === selectedStepId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Step List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Recovery Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workflow.steps.map((step, index) => (
            <Button
              key={step.id}
              variant={selectedStepId === step.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 h-auto p-3",
                mobileOptimization?.touchOptimized && "min-h-[44px]"
              )}
              onClick={() => setSelectedStepId(step.id)}
            >
              <div className="flex items-center gap-2 flex-1">
                {step.completed ? (
                  <CheckCircle className="h-4 w-4 text-status-success" />
                ) : step.inProgress ? (
                  <Activity className="h-4 w-4 text-status-warning" />
                ) : step.error ? (
                  <AlertCircle className="h-4 w-4 text-status-error" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <div className="text-left">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Step {index + 1} • {step.type}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Step Details */}
      <div className="lg:col-span-2 space-y-6">
        {selectedStep && (
          <>
            <RecoveryStepComponent
              step={selectedStep}
              isActive={true}
              isCompleted={selectedStep.completed}
              hasError={!!selectedStep.error}
              onStepComplete={onStepComplete}
              onStepError={onStepError}
              onStepSkip={onStepSkip}
              onActionExecute={onActionExecute}
              mobileOptimization={mobileOptimization}
              accessibilityOptions={accessibilityOptions}
            />

            <RecoveryProgressComponent
              workflow={workflow}
              progress={{
                currentStep: selectedStep,
                completedSteps: workflow.steps.filter(s => s.completed),
                remainingSteps: workflow.steps.filter(s => !s.completed),
                totalSteps: workflow.steps.length,
                progressPercentage: workflow.progress,
                estimatedTimeRemaining: calculateEstimatedTimeRemaining(workflow),
                elapsedTime: calculateElapsedTime(workflow)
              }}
              showDetailed={false}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface SummaryViewProps {
  workflow: RecoveryWorkflow;
  session: RecoverySession;
  analytics?: RecoveryAnalytics | null;
  onExport: () => void;
  mobileOptimization?: MobileOptimization;
}

function SummaryView({ workflow, session, analytics, onExport, mobileOptimization }: SummaryViewProps) {
  const completedSteps = workflow.steps.filter(step => step.completed);
  const successRate = completedSteps.length > 0
    ? completedSteps.filter(step => !step.error).length / completedSteps.length
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recovery Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold text-primary">{completedSteps.length}</div>
              <div className="text-sm text-muted-foreground">Steps Completed</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold text-status-success">
                {Math.round(successRate * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold">
                {analytics?.retryAttempts || 0}
              </div>
              <div className="text-sm text-muted-foreground">Retry Attempts</div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="font-medium mb-3">Activity Timeline</h4>
            <div className="space-y-2">
              {session.history.map((entry, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-shrink-0">
                    {entry.type === "workflow_start" && <Play className="h-4 w-4 text-status-success" />}
                    {entry.type === "step_complete" && <CheckCircle className="h-4 w-4 text-status-success" />}
                    {entry.type === "step_error" && <AlertCircle className="h-4 w-4 text-status-error" />}
                    {entry.type === "workflow_complete" && <Award className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm capitalize">
                      {entry.type.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="flex gap-2">
            <Button onClick={onExport} variant="outline" className="gap-1">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
            <Button variant="outline" className="gap-1">
              <Share className="h-4 w-4" />
              Share Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SettingsPanelProps {
  userPreferences: RecoveryUserPreferences;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
  onClose: () => void;
}

function SettingsPanel({ userPreferences, mobileOptimization, accessibilityOptions, onClose }: SettingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recovery Settings</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">User Preferences</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Auto Retry</span>
                <Badge variant={userPreferences.autoRetry ? "status-success" : "status-muted"}>
                  {userPreferences.autoRetry ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Show Detailed Steps</span>
                <Badge variant={userPreferences.showDetailedSteps ? "status-success" : "status-muted"}>
                  {userPreferences.showDetailedSteps ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Enable Sounds</span>
                <Badge variant={userPreferences.enableSounds ? "status-success" : "status-muted"}>
                  {userPreferences.enableSounds ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Mobile Optimization</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Touch Optimized</span>
                <Badge variant={mobileOptimization?.touchOptimized ? "status-success" : "status-muted"}>
                  {mobileOptimization?.touchOptimized ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Swipe Gestures</span>
                <Badge variant={mobileOptimization?.swipeGestures ? "status-success" : "status-muted"}>
                  {mobileOptimization?.swipeGestures ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Haptic Feedback</span>
                <Badge variant={mobileOptimization?.hapticFeedback ? "status-success" : "status-muted"}>
                  {mobileOptimization?.hapticFeedback ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Accessibility</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Screen Reader Support</span>
                <Badge variant={accessibilityOptions?.screenReaderSupport ? "status-success" : "status-muted"}>
                  {accessibilityOptions?.screenReaderSupport ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Keyboard Navigation</span>
                <Badge variant={accessibilityOptions?.keyboardNavigation ? "status-success" : "status-muted"}>
                  {accessibilityOptions?.keyboardNavigation ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>High Contrast Mode</span>
                <Badge variant={accessibilityOptions?.highContrastMode ? "status-success" : "status-muted"}>
                  {accessibilityOptions?.highContrastMode ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility functions
function calculateEstimatedTimeRemaining(workflow: RecoveryWorkflow): number {
  const remainingSteps = workflow.steps.slice(workflow.currentStepIndex);
  return remainingSteps.reduce((total, step) => {
    return total + (step.estimatedDuration || 30);
  }, 0);
}

function calculateElapsedTime(workflow: RecoveryWorkflow): number {
  if (!workflow.startedAt) return 0;
  return (Date.now() - workflow.startedAt.getTime()) / 1000;
}

function exportSessionData(session: RecoverySession, analytics?: RecoveryAnalytics | null) {
  const exportData = {
    session,
    analytics,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recovery-session-${session.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default RecoveryWorkflowComponent;
