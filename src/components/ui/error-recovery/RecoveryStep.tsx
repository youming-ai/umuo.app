"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle,
  Circle,
  AlertCircle,
  Clock,
  Info,
  Zap,
  ArrowRight,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  HelpCircle,
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecoveryStep,
  RecoveryAction,
  RecoveryResult,
  MobileOptimization,
  AccessibilityOptions,
  getStepStatus
} from "./types";

interface RecoveryStepComponentProps {
  step: RecoveryStep;
  isActive: boolean;
  isCompleted: boolean;
  hasError: boolean;
  onStepComplete: (stepId: string) => void;
  onStepError: (stepId: string, error: string) => void;
  onActionExecute: (stepId: string, actionId: string, result: RecoveryResult) => void;
  onStepSkip?: (stepId: string) => void;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
  className?: string;
  compact?: boolean;
}

export function RecoveryStepComponent({
  step,
  isActive,
  isCompleted,
  hasError,
  onStepComplete,
  onStepError,
  onActionExecute,
  onStepSkip,
  mobileOptimization,
  accessibilityOptions,
  className,
  compact = false
}: RecoveryStepComponentProps) {
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [expandedInstructions, setExpandedInstructions] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const status = getStepStatus(step);

  // Accessibility announcements
  useEffect(() => {
    if (accessibilityOptions?.screenReaderSupport && isActive) {
      const announcement = `Step ${step.title}: ${step.description}. Status: ${status}. ${hasError ? 'Error occurred.' : ''}`;
      announceToScreenReader(announcement);
    }
  }, [status, isActive, step.title, step.description, hasError, accessibilityOptions]);

  const handleActionClick = async (action: RecoveryAction) => {
    if (executingActionId) return;

    setExecutingActionId(action.id);

    // Haptic feedback for mobile
    if (mobileOptimization?.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    try {
      const result = await action.handler();
      onActionExecute(step.id, action.id, result);

      if (result.success) {
        // Success feedback
        if (mobileOptimization?.hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      } else {
        // Error feedback
        if (mobileOptimization?.hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate([200]);
        }
      }
    } catch (error) {
      onStepError(step.id, error instanceof Error ? error.message : String(error));
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!mobileOptimization?.swipeGestures) return;
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!mobileOptimization?.swipeGestures || !touchStartX) return;

    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX - touchEndX;

    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance > 0) {
        // Swipe left - next step or skip
        if (mobileOptimization.gestureConfig?.leftSwipeAction === "skip_step" && onStepSkip) {
          onStepSkip(step.id);
        }
      } else {
        // Swipe right - retry or previous step
        if (mobileOptimization.gestureConfig?.rightSwipeAction === "retry_action") {
          handleRetry();
        }
      }
    }
    setTouchStartX(null);
  };

  const handleRetry = () => {
    const retryAction = step.actions?.find(action => action.retryable);
    if (retryAction) {
      handleActionClick(retryAction);
    }
  };

  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-status-success" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-status-warning animate-spin" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-status-error" />;
      default:
        return <Circle className="h-5 w-5 text-status-muted" />;
    }
  };

  const getStatusBadge = () => {
    const variants = {
      completed: "status-success",
      in_progress: "status-warning",
      error: "status-error",
      pending: "status-muted"
    } as const;

    return (
      <Badge variant={variants[status]} className="gap-1">
        {getStatusIcon()}
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  if (compact) {
    return (
      <div
        ref={stepRef}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
          isActive && "border-primary bg-primary/5",
          isCompleted && "border-status-success bg-status-success/5",
          hasError && "border-status-error bg-status-error/5",
          mobileOptimization?.touchOptimized && "touch-manipulation",
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{step.title}</h4>
          <p className="text-xs text-muted-foreground truncate">{step.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {step.estimatedDuration && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(step.estimatedDuration)}
            </div>
          )}
          {isActive && step.actions && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpandedInstructions(!expandedInstructions)}
              aria-label={expandedInstructions ? "Collapse instructions" : "Expand instructions"}
            >
              <ChevronRight className={cn("h-4 w-4 transition-transform", expandedInstructions && "rotate-90")} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card
      ref={stepRef}
      className={cn(
        "transition-all duration-300",
        isActive && "ring-2 ring-primary ring-offset-2",
        isCompleted && "border-status-success bg-status-success/5",
        hasError && "border-status-error bg-status-error/5",
        mobileOptimization?.touchOptimized && "touch-manipulation",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <CardDescription className="mt-1">{step.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge()}
            {step.estimatedDuration && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDuration(step.estimatedDuration)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Estimated duration</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Instructions */}
        {step.instructions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Instructions</h4>
              {step.instructions.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedInstructions(!expandedInstructions)}
                  className="h-auto p-0 text-xs"
                >
                  {expandedInstructions ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
            <ol className={cn(
              "space-y-1 text-sm text-muted-foreground list-decimal list-inside",
              !expandedInstructions && step.instructions.length > 3 && "max-h-20 overflow-hidden"
            )}>
              {step.instructions.map((instruction, index) => (
                <li key={index} className="leading-relaxed">{instruction}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Actions */}
        {step.actions && step.actions.length > 0 && isActive && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Actions</h4>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {step.actions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  isExecuting={executingActionId === action.id}
                  onExecute={() => handleActionClick(action)}
                  mobileOptimization={mobileOptimization}
                  accessibilityOptions={accessibilityOptions}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error display */}
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

        {/* Controls */}
        {isActive && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {step.actions?.some(action => action.retryable) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
            )}
            {!step.required && onStepSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStepSkip(step.id)}
                className="gap-1"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            )}
            {accessibilityOptions?.voiceControl && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                aria-label="Voice control"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ActionCardProps {
  action: RecoveryAction;
  isExecuting: boolean;
  onExecute: () => void;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
}

function ActionCard({
  action,
  isExecuting,
  onExecute,
  mobileOptimization,
  accessibilityOptions
}: ActionCardProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleClick = () => {
    if (action.requiresConfirmation && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    onExecute();
    setShowConfirmation(false);
  };

  const getButtonVariant = () => {
    switch (action.type) {
      case "primary": return "default";
      case "secondary": return "outline";
      case "danger": return "destructive";
      default: return "outline";
    }
  };

  if (showConfirmation) {
    return (
      <Card className="border-status-warning bg-status-warning/5">
        <CardContent className="p-3">
          <p className="text-sm mb-2">{action.confirmationMessage}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleClick} variant="default">
              Confirm
            </Button>
            <Button size="sm" onClick={() => setShowConfirmation(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button
      variant={getButtonVariant()}
      onClick={handleClick}
      disabled={isExecuting}
      className={cn(
        "w-full justify-start gap-2 h-auto p-3",
        mobileOptimization?.touchOptimized && "min-h-[44px]",
        accessibilityOptions?.largeTextMode && "text-base"
      )}
      aria-label={accessibilityOptions?.ariaLabels?.[action.id] || action.label}
    >
      {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
      <div className="flex-1 text-left">
        <div className="font-medium">{action.label}</div>
        {action.description && (
          <div className="text-xs opacity-70 mt-0.5">{action.description}</div>
        )}
      </div>
      {isExecuting ? (
        <div className="flex-shrink-0">
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        </div>
      ) : (
        <ArrowRight className="h-4 w-4 flex-shrink-0" />
      )}
    </Button>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export default RecoveryStepComponent;
