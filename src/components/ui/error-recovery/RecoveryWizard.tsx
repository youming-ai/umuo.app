"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  HelpCircle,
  Volume2,
  ArrowRight,
  ArrowLeft,
  Home,
  Settings,
  Lightbulb,
  Target,
  BookOpen,
  Award,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecoveryWorkflow,
  RecoveryStep,
  RecoveryResult,
  RecoverySession,
  MobileOptimization,
  AccessibilityOptions,
  RecoveryUserPreferences
} from "./types";
import RecoveryStepComponent from "./RecoveryStep";
import RecoveryProgressComponent from "./RecoveryProgress";
import RecoveryActionsComponent from "./RecoveryActions";

interface RecoveryWizardProps {
  workflow: RecoveryWorkflow;
  session: RecoverySession;
  onWorkflowStart: () => void;
  onWorkflowComplete: (results: RecoveryResult[]) => void;
  onWorkflowCancel: () => void;
  onStepComplete: (stepId: string, result: RecoveryResult) => void;
  onStepError: (stepId: string, error: string) => void;
  onStepSkip: (stepId: string) => void;
  onActionExecute: (stepId: string, actionId: string, result: RecoveryResult) => void;
  onSessionUpdate?: (session: RecoverySession) => void;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
  showWelcome?: boolean;
  showSummary?: boolean;
  enableSounds?: boolean;
  theme?: "light" | "dark" | "auto";
  className?: string;
}

type WizardStep = "welcome" | "steps" | "summary" | "completed";

export function RecoveryWizard({
  workflow,
  session,
  onWorkflowStart,
  onWorkflowComplete,
  onWorkflowCancel,
  onStepComplete,
  onStepError,
  onStepSkip,
  onActionExecute,
  onSessionUpdate,
  mobileOptimization,
  accessibilityOptions,
  showWelcome = true,
  showSummary = true,
  enableSounds = false,
  theme = "auto",
  className
}: RecoveryWizardProps) {
  const [currentWizardStep, setCurrentWizardStep] = useState<WizardStep>(
    showWelcome ? "welcome" : "steps"
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(workflow.currentStepIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [stepResults, setStepResults] = useState<Map<string, RecoveryResult>>(new Map());
  const [showHints, setShowHints] = useState(true);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const wizardRef = useRef<HTMLDivElement>(null);

  const currentStep = workflow.steps[currentStepIndex];
  const progress = calculateProgress();
  const isWorkflowComplete = workflow.status === "completed";
  const hasError = workflow.steps.some(step => step.error);

  // Calculate recovery progress
  function calculateProgress() {
    const totalSteps = workflow.steps.length;
    const completedCount = workflow.steps.filter(step => step.completed).length;
    const currentStepProgress = currentStep?.inProgress ? 0.5 : 0;

    return {
      totalSteps,
      completedSteps: workflow.steps.filter(step => step.completed),
      remainingSteps: workflow.steps.filter(step => !step.completed),
      currentStep: currentStep || workflow.steps[0],
      progressPercentage: ((completedCount + currentStepProgress) / totalSteps) * 100,
      estimatedTimeRemaining: calculateEstimatedTimeRemaining(),
      elapsedTime: calculateElapsedTime()
    };
  }

  function calculateEstimatedTimeRemaining(): number {
    const remainingSteps = workflow.steps.slice(currentStepIndex);
    return remainingSteps.reduce((total, step) => {
      return total + (step.estimatedDuration || 30);
    }, 0);
  }

  function calculateElapsedTime(): number {
    if (!workflow.startedAt) return 0;
    return (Date.now() - workflow.startedAt.getTime()) / 1000;
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!accessibilityOptions?.keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "ArrowRight":
            e.preventDefault();
            handleNextStep();
            break;
          case "ArrowLeft":
            e.preventDefault();
            handlePreviousStep();
            break;
          case " ":
            e.preventDefault();
            setIsPaused(prev => !prev);
            break;
          case "h":
            e.preventDefault();
            setShowHints(prev => !prev);
            break;
          case "?":
            e.preventDefault();
            setShowKeyboardShortcuts(prev => !prev);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStepIndex, accessibilityOptions]);

  // Handle swipe gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!mobileOptimization?.swipeGestures) return;
    // Touch handling logic would be implemented here
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!mobileOptimization?.swipeGestures) return;
    // Touch handling logic would be implemented here
  };

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < workflow.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      playSound("step");
    } else if (workflow.steps.every(step => step.completed)) {
      handleWorkflowComplete();
    }
  }, [currentStepIndex, workflow.steps]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      playSound("step");
    }
  }, [currentStepIndex]);

  const handleStepComplete = useCallback((stepId: string, result: RecoveryResult) => {
    setCompletedSteps(prev => new Set(prev).add(stepId));
    setStepResults(prev => new Map(prev.set(stepId, result)));
    onStepComplete(stepId, result);

    // Auto-advance if enabled
    if (workflow.autoAdvance && result.success) {
      setTimeout(() => {
        handleNextStep();
      }, 1000);
    }

    playSound("success");
  }, [onStepComplete, workflow.autoAdvance, handleNextStep]);

  const handleStepSkip = useCallback((stepId: string) => {
    onStepSkip(stepId);
    playSound("skip");
    handleNextStep();
  }, [onStepSkip, handleNextStep]);

  const handleWorkflowStart = useCallback(() => {
    onWorkflowStart();
    setCurrentWizardStep("steps");
    playSound("start");
  }, [onWorkflowStart]);

  const handleWorkflowComplete = useCallback(() => {
    const results = Array.from(stepResults.values());
    onWorkflowComplete(results);
    setCurrentWizardStep("completed");
    playSound("complete");

    // Show celebration
    if (enableSounds) {
      setTimeout(() => {
        playSound("celebration");
      }, 500);
    }
  }, [onWorkflowComplete, stepResults, enableSounds]);

  const handleWizardRestart = useCallback(() => {
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setStepResults(new Map());
    setIsPaused(false);
    setCurrentWizardStep(showWelcome ? "welcome" : "steps");
    playSound("restart");
  }, [showWelcome]);

  const playSound = (type: "start" | "step" | "success" | "skip" | "complete" | "celebration" | "restart") => {
    if (!enableSounds) return;
    // Sound implementation would go here
    console.log(`Playing sound: ${type}`);
  };

  const announceToScreenReader = (message: string) => {
    if (!accessibilityOptions?.screenReaderSupport) return;

    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  const renderWizardStep = () => {
    switch (currentWizardStep) {
      case "welcome":
        return <WelcomeStep
          workflow={workflow}
          onStart={handleWorkflowStart}
          onCancel={onWorkflowCancel}
          accessibilityOptions={accessibilityOptions}
        />;

      case "steps":
        return <StepsStep
          workflow={workflow}
          currentStepIndex={currentStepIndex}
          progress={progress}
          isPaused={isPaused}
          onStepComplete={handleStepComplete}
          onStepError={onStepError}
          onStepSkip={handleStepSkip}
          onActionExecute={onActionExecute}
          onNextStep={handleNextStep}
          onPreviousStep={handlePreviousStep}
          onPauseToggle={() => setIsPaused(prev => !prev)}
          showHints={showHints}
          mobileOptimization={mobileOptimization}
          accessibilityOptions={accessibilityOptions}
        />;

      case "summary":
        return <SummaryStep
          workflow={workflow}
          stepResults={stepResults}
          onComplete={handleWorkflowComplete}
          onBack={() => setCurrentWizardStep("steps")}
          accessibilityOptions={accessibilityOptions}
        />;

      case "completed":
        return <CompletedStep
          workflow={workflow}
          stepResults={stepResults}
          session={session}
          onRestart={handleWizardRestart}
          accessibilityOptions={accessibilityOptions}
        />;

      default:
        return null;
    }
  };

  return (
    <div
      ref={wizardRef}
      className={cn(
        "w-full max-w-4xl mx-auto space-y-6",
        mobileOptimization?.touchOptimized && "touch-manipulation",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Wizard Header */}
      <Card className="border-none shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Error Recovery Wizard
              </CardTitle>
              <CardDescription>
                Guided recovery workflow for resolving: {workflow.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={workflow.status === "completed" ? "status-success" :
                         workflow.status === "failed" ? "status-error" :
                         "status-warning"}
                className="capitalize"
              >
                {workflow.status.replace('_', ' ')}
              </Badge>
              {workflow.status === "in_progress" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(prev => !prev)}
                  className="gap-1"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? "Resume" : "Pause"}
                </Button>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          {currentWizardStep !== "welcome" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Step {currentStepIndex + 1} of {workflow.steps.length}</span>
                <span>{Math.round(progress.progressPercentage)}% complete</span>
              </div>
              <Progress value={progress.progressPercentage} className="h-2" />
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="min-h-[400px]">
        {renderWizardStep()}
      </div>

      {/* Navigation Footer */}
      {currentWizardStep === "steps" && (
        <Card className="border-none shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={currentStepIndex === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHints(prev => !prev)}
                  className="gap-1"
                >
                  <Lightbulb className="h-4 w-4" />
                  {showHints ? "Hide" : "Show"} Tips
                </Button>

                {accessibilityOptions?.keyboardNavigation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKeyboardShortcuts(prev => !prev)}
                    className="gap-1"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Shortcuts
                  </Button>
                )}
              </div>

              <Button
                onClick={handleNextStep}
                disabled={!currentStep?.completed && currentStepIndex === workflow.steps.length - 1}
                className="gap-1"
              >
                {currentStepIndex === workflow.steps.length - 1 ? "Complete" : "Next"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <Card className="absolute inset-0 z-50 m-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Ctrl/Cmd + →</div>
              <div className="text-muted-foreground">Next step</div>
              <div className="font-medium">Ctrl/Cmd + ←</div>
              <div className="text-muted-foreground">Previous step</div>
              <div className="font-medium">Ctrl/Cmd + Space</div>
              <div className="text-muted-foreground">Pause/Resume</div>
              <div className="font-medium">Ctrl/Cmd + H</div>
              <div className="text-muted-foreground">Toggle hints</div>
              <div className="font-medium">Ctrl/Cmd + ?</div>
              <div className="text-muted-foreground">Show shortcuts</div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowKeyboardShortcuts(false)}
              className="w-full mt-4"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Wizard Step Components
interface WelcomeStepProps {
  workflow: RecoveryWorkflow;
  onStart: () => void;
  onCancel: () => void;
  accessibilityOptions?: AccessibilityOptions;
}

function WelcomeStep({ workflow, onStart, onCancel, accessibilityOptions }: WelcomeStepProps) {
  const estimatedDuration = workflow.steps.reduce((total, step) => {
    return total + (step.estimatedDuration || 30);
  }, 0);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome to Recovery Wizard</CardTitle>
        <CardDescription>
          Let's resolve the issue step by step with guided recovery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{workflow.steps.length}</div>
            <div className="text-sm text-muted-foreground">Recovery Steps</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">{Math.round(estimatedDuration / 60)}m</div>
            <div className="text-sm text-muted-foreground">Estimated Duration</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">
              {workflow.steps.filter(s => s.required).length}
            </div>
            <div className="text-sm text-muted-foreground">Required Steps</div>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This wizard will guide you through {workflow.steps.length} steps to resolve the {workflow.name} error.
            {workflow.allowSkipSteps && " You can skip optional steps if needed."}
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button onClick={onStart} className="flex-1 gap-1">
            <Play className="h-4 w-4" />
            Start Recovery
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface StepsStepProps {
  workflow: RecoveryWorkflow;
  currentStepIndex: number;
  progress: any;
  isPaused: boolean;
  onStepComplete: (stepId: string, result: any) => void;
  onStepError: (stepId: string, error: string) => void;
  onStepSkip: (stepId: string) => void;
  onActionExecute: (stepId: string, actionId: string, result: any) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onPauseToggle: () => void;
  showHints: boolean;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
}

function StepsStep({
  workflow,
  currentStepIndex,
  progress,
  isPaused,
  onStepComplete,
  onStepError,
  onStepSkip,
  onActionExecute,
  onNextStep,
  onPreviousStep,
  onPauseToggle,
  showHints,
  mobileOptimization,
  accessibilityOptions
}: StepsStepProps) {
  const currentStep = workflow.steps[currentStepIndex];

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <RecoveryProgressComponent
        workflow={workflow}
        progress={progress}
        isPaused={isPaused}
        onPauseToggle={onPauseToggle}
        compact={true}
      />

      {/* Current Step */}
      {currentStep && (
        <RecoveryStepComponent
          step={currentStep}
          isActive={true}
          isCompleted={currentStep.completed}
          hasError={!!currentStep.error}
          onStepComplete={onStepComplete}
          onStepError={onStepError}
          onStepSkip={onStepSkip}
          onActionExecute={onActionExecute}
          mobileOptimization={mobileOptimization}
          accessibilityOptions={accessibilityOptions}
        />
      )}

      {/* Helpful Tips */}
      {showHints && (
        <Card className="border-status-warning bg-status-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-status-warning mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Helpful Tip</h4>
                <p className="text-sm text-muted-foreground">
                  {currentStep?.type === "action"
                    ? "Follow the instructions carefully and take your time with each action."
                    : currentStep?.type === "verification"
                    ? "Verify that the previous steps have resolved the issue before proceeding."
                    : "Read through the information carefully to understand the recovery process."
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SummaryStepProps {
  workflow: RecoveryWorkflow;
  stepResults: Map<string, any>;
  onComplete: () => void;
  onBack: () => void;
  accessibilityOptions?: AccessibilityOptions;
}

function SummaryStep({ workflow, stepResults, onComplete, onBack }: SummaryStepProps) {
  const completedSteps = workflow.steps.filter(step => step.completed);
  const successRate = completedSteps.length > 0
    ? completedSteps.filter(step => !step.error).length / completedSteps.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Recovery Summary
        </CardTitle>
        <CardDescription>
          Review your progress before completing the recovery workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Steps Completed</h4>
            <div className="text-2xl font-bold">{completedSteps.length} / {workflow.steps.length}</div>
            <div className="text-sm text-muted-foreground">{Math.round(successRate * 100)}% success rate</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Issues Resolved</h4>
            <div className="text-2xl font-bold text-status-success">
              {completedSteps.filter(step => !step.error).length}
            </div>
            <div className="text-sm text-muted-foreground">
              {completedSteps.filter(step => step.error).length} remaining
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Step Results</h4>
          {workflow.steps.map(step => (
            <div key={step.id} className="flex items-center gap-2 p-2 rounded border">
              {step.completed ? (
                step.error ? (
                  <AlertCircle className="h-4 w-4 text-status-error" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-status-success" />
                )
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
              )}
              <span className="text-sm flex-1">{step.title}</span>
              {step.completed && (
                <Badge variant={step.error ? "status-error" : "status-success"} className="text-xs">
                  {step.error ? "Failed" : "Success"}
                </Badge>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={onComplete} className="flex-1 gap-1">
            <CheckCircle className="h-4 w-4" />
            Complete Recovery
          </Button>
          <Button variant="outline" onClick={onBack}>
            Back to Steps
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CompletedStepProps {
  workflow: RecoveryWorkflow;
  stepResults: Map<string, any>;
  session: RecoverySession;
  onRestart: () => void;
  accessibilityOptions?: AccessibilityOptions;
}

function CompletedStep({ workflow, stepResults, session, onRestart }: CompletedStepProps) {
  const successfulSteps = workflow.steps.filter(step => step.completed && !step.error);
  const hasErrors = workflow.steps.some(step => step.error);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-status-success/10 flex items-center justify-center">
          {hasErrors ? (
            <AlertCircle className="h-8 w-8 text-status-warning" />
          ) : (
            <Award className="h-8 w-8 text-status-success" />
          )}
        </div>
        <CardTitle className="text-2xl">
          {hasErrors ? "Recovery Partially Complete" : "Recovery Complete!"}
        </CardTitle>
        <CardDescription>
          {hasErrors
            ? "Some steps encountered issues, but the recovery process is complete."
            : "All recovery steps have been successfully completed."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-status-success">
            {successfulSteps.length} / {workflow.steps.length}
          </div>
          <div className="text-muted-foreground">Steps completed successfully</div>
        </div>

        {hasErrors && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some steps encountered errors. You may need to retry these steps or seek additional support.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button onClick={onRestart} variant="outline" className="flex-1 gap-1">
            <RotateCcw className="h-4 w-4" />
            Start Over
          </Button>
          <Button className="flex-1 gap-1">
            <Sparkles className="h-4 w-4" />
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default RecoveryWizard;
