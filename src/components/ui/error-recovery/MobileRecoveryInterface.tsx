"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  X,
  Maximize2,
  Minimize2,
  TouchIcon,
  Smartphone,
  Volume2,
  Hand,
  ArrowLeftRight,
  Move
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecoveryWorkflow,
  RecoveryStep,
  RecoveryResult,
  RecoverySession,
  MobileOptimization,
  AccessibilityOptions
} from "./types";

interface MobileRecoveryInterfaceProps {
  workflow: RecoveryWorkflow;
  session: RecoverySession;
  onWorkflowStart: () => void;
  onWorkflowComplete: (results: RecoveryResult[]) => void;
  onWorkflowCancel: () => void;
  onStepComplete: (stepId: string, result: RecoveryResult) => void;
  onStepError: (stepId: string, error: string) => void;
  onStepSkip: (stepId: string) => void;
  onActionExecute: (stepId: string, actionId: string, result: RecoveryResult) => void;
  mobileOptimization: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
  isCompact?: boolean;
  enableSwipeNavigation?: boolean;
  enableHapticFeedback?: boolean;
  className?: string;
}

export function MobileRecoveryInterface({
  workflow,
  session,
  onWorkflowStart,
  onWorkflowComplete,
  onWorkflowCancel,
  onStepComplete,
  onStepError,
  onStepSkip,
  onActionExecute,
  mobileOptimization,
  accessibilityOptions,
  isCompact = false,
  enableSwipeNavigation = true,
  enableHapticFeedback = true,
  className
}: MobileRecoveryInterfaceProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(workflow.currentStepIndex);
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [showGestureGuide, setShowGestureGuide] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "up" | "down" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const currentStep = workflow.steps[currentStepIndex];
  const progressPercentage = ((currentStepIndex + (currentStep?.completed ? 1 : 0)) / workflow.steps.length) * 100;

  // Haptic feedback helper
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [enableHapticFeedback]);

  // Touch and swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeNavigation) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    setIsDragging(false);
    setSwipeDirection(null);
  }, [enableSwipeNavigation]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeNavigation || !touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Minimum movement threshold
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      setIsDragging(true);
    }

    // Determine swipe direction for visual feedback
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDirection(deltaX > 0 ? "right" : "left");
    } else {
      setSwipeDirection(deltaY > 0 ? "down" : "up");
    }
  }, [enableSwipeNavigation]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeNavigation || !touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Reset state
    touchStartRef.current = null;
    setIsDragging(false);
    setSwipeDirection(null);

    // Swipe detection (minimum 50px movement and max 500ms duration)
    const minSwipeDistance = 50;
    const maxSwipeTime = 500;

    if (Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime) {
      if (deltaX > 0) {
        handleSwipeRight();
      } else {
        handleSwipeLeft();
      }
    } else if (Math.abs(deltaY) > minSwipeDistance && deltaTime < maxSwipeTime) {
      if (deltaY > 0) {
        handleSwipeDown();
      } else {
        handleSwipeUp();
      }
    }
  }, [enableSwipeNavigation]);

  const handleSwipeLeft = useCallback(() => {
    const action = mobileOptimization.gestureConfig?.leftSwipeAction;
    if (action === "next_step" && currentStepIndex < workflow.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      triggerHaptic(50);
    } else if (action === "skip_step" && currentStep) {
      onStepSkip(currentStep.id);
      triggerHaptic([100, 50, 100]);
    }
  }, [currentStepIndex, workflow.steps.length, currentStep, mobileOptimization, onStepSkip, triggerHaptic]);

  const handleSwipeRight = useCallback(() => {
    const action = mobileOptimization.gestureConfig?.rightSwipeAction;
    if (action === "previous_step" && currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      triggerHaptic(50);
    } else if (action === "retry_action" && currentStep) {
      // Retry the current step
      triggerHaptic([100, 50, 100]);
    }
  }, [currentStepIndex, currentStep, mobileOptimization, triggerHaptic]);

  const handleSwipeUp = useCallback(() => {
    if (isCompact) {
      setIsExpanded(true);
      triggerHaptic(50);
    }
  }, [isCompact, triggerHaptic]);

  const handleSwipeDown = useCallback(() => {
    if (!isCompact) {
      setIsExpanded(false);
      triggerHaptic(50);
    }
  }, [isCompact, triggerHaptic]);

  const handleStepAction = useCallback((stepId: string, actionId: string, result: RecoveryResult) => {
    onActionExecute(stepId, actionId, result);
    triggerHaptic(result.success ? [100, 50, 100] : 200);
  }, [onActionExecute, triggerHaptic]);

  if (isCompact && !isExpanded) {
    return (
      <MobileCompactView
        workflow={workflow}
        currentStep={currentStep}
        progressPercentage={progressPercentage}
        onExpand={() => setIsExpanded(true)}
        onSwipeUp={handleSwipeUp}
        mobileOptimization={mobileOptimization}
        className={className}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full flex flex-col bg-background",
        mobileOptimization.touchOptimized && "touch-manipulation",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Header */}
      <div className="flex-shrink-0 border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className="p-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-sm truncate">{workflow.name}</h2>
              <p className="text-xs text-muted-foreground truncate">
                Step {currentStepIndex + 1} of {workflow.steps.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStepIndex(Math.min(workflow.steps.length - 1, currentStepIndex + 1))}
              disabled={currentStepIndex === workflow.steps.length - 1}
              className="p-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {mobileOptimization.hapticFeedback && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGestureGuide(true)}
                className="p-2"
              >
                <TouchIcon className="h-4 w-4" />
              </Button>
            )}
            {!isCompact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="p-2"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Swipe Direction Indicator */}
      {isDragging && swipeDirection && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/10">
          <div className="bg-background rounded-lg border p-4 shadow-lg">
            <div className={cn(
              "flex items-center gap-2 text-sm",
              swipeDirection === "left" && "text-blue-500",
              swipeDirection === "right" && "text-green-500",
              swipeDirection === "up" && "text-purple-500",
              swipeDirection === "down" && "text-orange-500"
            )}>
              {swipeDirection === "left" && <ChevronLeft className="h-6 w-6" />}
              {swipeDirection === "right" && <ChevronRight className="h-6 w-6" />}
              {swipeDirection === "up" && <ChevronLeft className="h-6 w-6 rotate-90" />}
              {swipeDirection === "down" && <ChevronLeft className="h-6 w-6 -rotate-90" />}
              <span className="capitalize">Swipe {swipeDirection}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {currentStep && (
          <MobileStepCard
            step={currentStep}
            isActive={true}
            isCompleted={currentStep.completed}
            hasError={!!currentStep.error}
            onStepComplete={onStepComplete}
            onStepError={onStepError}
            onStepSkip={onStepSkip}
            onActionExecute={handleStepAction}
            mobileOptimization={mobileOptimization}
            accessibilityOptions={accessibilityOptions}
          />
        )}
      </div>

      {/* Mobile Footer */}
      <div className="flex-shrink-0 border-t bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
            disabled={currentStepIndex === 0}
            className="gap-1 flex-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button
            variant={currentStep?.completed ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentStepIndex(Math.min(workflow.steps.length - 1, currentStepIndex + 1))}
            disabled={currentStepIndex === workflow.steps.length - 1 && !currentStep?.completed}
            className="gap-1 flex-1"
          >
            {currentStepIndex === workflow.steps.length - 1 ? "Complete" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gesture Guide Sheet */}
      <Sheet open={showGestureGuide} onOpenChange={setShowGestureGuide}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5" />
              Gesture Guide
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <GestureInstruction
              gesture="Swipe Left"
              action={mobileOptimization.gestureConfig?.leftSwipeAction || "next_step"}
              icon={<ChevronLeft className="h-6 w-6" />}
            />
            <GestureInstruction
              gesture="Swipe Right"
              action={mobileOptimization.gestureConfig?.rightSwipeAction || "previous_step"}
              icon={<ChevronRight className="h-6 w-6" />}
            />
            {isCompact && (
              <GestureInstruction
                gesture="Swipe Up"
                action="Expand view"
                icon={<ChevronLeft className="h-6 w-6 rotate-90" />}
              />
            )}
            {!isCompact && (
              <GestureInstruction
                gesture="Swipe Down"
                action="Minimize view"
                icon={<ChevronLeft className="h-6 w-6 -rotate-90" />}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface MobileStepCardProps {
  step: RecoveryStep;
  isActive: boolean;
  isCompleted: boolean;
  hasError: boolean;
  onStepComplete: (stepId: string, result: any) => void;
  onStepError: (stepId: string, error: string) => void;
  onStepSkip: (stepId: string) => void;
  onActionExecute: (stepId: string, actionId: string, result: any) => void;
  mobileOptimization: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
}

function MobileStepCard({
  step,
  isActive,
  isCompleted,
  hasError,
  onStepComplete,
  onStepError,
  onStepSkip,
  onActionExecute,
  mobileOptimization,
  accessibilityOptions
}: MobileStepCardProps) {
  const [expandedInstructions, setExpandedInstructions] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const handleActionClick = async (action: any) => {
    if (executingActionId) return;

    setExecutingActionId(action.id);
    try {
      const result = await action.handler();
      onActionExecute(step.id, action.id, result);

      if (result.success && step.required) {
        onStepComplete(step.id, result);
      }
    } catch (error) {
      onStepError(step.id, error instanceof Error ? error.message : String(error));
    } finally {
      setExecutingActionId(null);
    }
  };

  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle className="h-5 w-5 text-status-success" />;
    if (hasError) return <AlertCircle className="h-5 w-5 text-status-error" />;
    return <Clock className="h-5 w-5 text-status-warning" />;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Step Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-lg">{step.title}</h3>
          <p className="text-muted-foreground text-sm mt-1">{step.description}</p>
          {step.required && (
            <Badge variant="secondary" className="mt-2">Required</Badge>
          )}
        </div>
      </div>

      {/* Instructions */}
      {step.instructions.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedInstructions(!expandedInstructions)}
            className="gap-1"
          >
            <span className="text-sm">
              {expandedInstructions ? "Hide" : "Show"} Instructions ({step.instructions.length})
            </span>
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform",
              expandedInstructions && "rotate-90"
            )} />
          </Button>

          {expandedInstructions && (
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside bg-muted/50 p-3 rounded-lg">
              {step.instructions.map((instruction, index) => (
                <li key={index} className="leading-relaxed">{instruction}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Actions */}
      {step.actions && step.actions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Actions</h4>
          <div className="space-y-2">
            {step.actions.map(action => (
              <Button
                key={action.id}
                variant={action.type === "primary" ? "default" : "outline"}
                onClick={() => handleActionClick(action)}
                disabled={executingActionId === action.id || (isCompleted && !action.retryable)}
                className={cn(
                  "w-full justify-start gap-2 h-auto p-4",
                  mobileOptimization.touchOptimized && "min-h-[48px]"
                )}
              >
                {executingActionId === action.id ? (
                  <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                ) : isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-status-success" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <div className="text-left flex-1">
                  <div className="font-medium">{action.label}</div>
                  {action.description && (
                    <div className="text-xs opacity-70 mt-1">{action.description}</div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {hasError && step.error && (
        <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-status-error mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-status-error">Error</p>
              <p className="text-sm text-status-error/80 mt-1">{step.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Controls */}
      <div className="flex gap-2 pt-2">
        {!step.required && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStepSkip(step.id)}
            className="gap-1"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}

interface MobileCompactViewProps {
  workflow: RecoveryWorkflow;
  currentStep?: RecoveryStep;
  progressPercentage: number;
  onExpand: () => void;
  onSwipeUp: () => void;
  mobileOptimization: MobileOptimization;
  className?: string;
}

function MobileCompactView({
  workflow,
  currentStep,
  progressPercentage,
  onExpand,
  onSwipeUp,
  mobileOptimization,
  className
}: MobileCompactViewProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg",
        mobileOptimization.touchOptimized && "touch-manipulation",
        className
      )}
      onTouchEnd={onSwipeUp}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{workflow.name}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {currentStep?.title || "Getting started..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}%
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpand}
              className="p-2"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-2">
          <Progress value={progressPercentage} className="h-1" />
        </div>

        <div className="mt-2 text-xs text-center text-muted-foreground">
          Swipe up to expand
        </div>
      </div>
    </div>
  );
}

interface GestureInstructionProps {
  gesture: string;
  action: string;
  icon: React.ReactNode;
}

function GestureInstruction({ gesture, action, icon }: GestureInstructionProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
      <div className="flex-shrink-0 text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-sm">{gesture}</div>
        <div className="text-xs text-muted-foreground capitalize">{action.replace('_', ' ')}</div>
      </div>
    </div>
  );
}

export default MobileRecoveryInterface;
