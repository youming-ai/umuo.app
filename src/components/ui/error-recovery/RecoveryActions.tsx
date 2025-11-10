"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription
} from "@/components/ui/alert";
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
  Volume2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Loader2,
  Trash2,
  Save,
  Copy,
  Share
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecoveryAction,
  RecoveryResult,
  RecoveryWorkflow,
  MobileOptimization,
  AccessibilityOptions,
  RecoveryUserPreferences
} from "./types";

interface RecoveryActionsComponentProps {
  actions: RecoveryAction[];
  workflow: RecoveryWorkflow;
  isExecuting?: boolean;
  executingActionId?: string | null;
  onActionExecute: (actionId: string) => Promise<RecoveryResult>;
  onWorkflowPause?: () => void;
  onWorkflowResume?: () => void;
  onWorkflowRestart?: () => void;
  onWorkflowCancel?: () => void;
  onWorkflowSkip?: () => void;
  userPreferences?: RecoveryUserPreferences;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
  showWorkflowControls?: boolean;
  compact?: boolean;
  layout?: "horizontal" | "vertical" | "grid";
  className?: string;
}

export function RecoveryActionsComponent({
  actions,
  workflow,
  isExecuting = false,
  executingActionId = null,
  onActionExecute,
  onWorkflowPause,
  onWorkflowResume,
  onWorkflowRestart,
  onWorkflowCancel,
  onWorkflowSkip,
  userPreferences,
  mobileOptimization,
  accessibilityOptions,
  showWorkflowControls = true,
  compact = false,
  layout = "vertical",
  className
}: RecoveryActionsComponentProps) {
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<Map<string, RecoveryResult[]>>(new Map());
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [progress, setProgress] = useState<Map<string, number>>(new Map());
  const actionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleActionClick = useCallback(async (action: RecoveryAction) => {
    if (isExecuting || !action.handler) return;

    // Handle confirmation requirements
    if (action.requiresConfirmation && showConfirmation !== action.id) {
      setShowConfirmation(action.id);
      return;
    }

    // Clear confirmation
    setShowConfirmation(null);

    // Haptic feedback for mobile
    if (mobileOptimization?.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Start progress animation
    if (action.expectedDuration) {
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progressPercent = Math.min((elapsed / (action.expectedDuration! * 1000)) * 100, 90);
        setProgress(prev => new Map(prev.set(action.id, progressPercent)));
      }, 100);

      try {
        const result = await action.handler();
        clearInterval(progressInterval);
        setProgress(prev => new Map(prev.set(action.id, 100)));

        // Update action history
        setActionHistory(prev => {
          const history = prev.get(action.id) || [];
          return new Map(prev.set(action.id, [...history, result]));
        });

        // Success haptic feedback
        if (mobileOptimization?.hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        // Announce to screen reader
        if (accessibilityOptions?.screenReaderSupport) {
          announceActionCompletion(action, result);
        }

        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setProgress(prev => new Map(prev.delete(action.id)));

        // Error haptic feedback
        if (mobileOptimization?.hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate([200]);
        }

        throw error;
      }
    } else {
      // No expected duration, just execute
      try {
        const result = await action.handler();

        // Update action history
        setActionHistory(prev => {
          const history = prev.get(action.id) || [];
          return new Map(prev.set(action.id, [...history, result]));
        });

        if (accessibilityOptions?.screenReaderSupport) {
          announceActionCompletion(action, result);
        }

        return result;
      } catch (error) {
        throw error;
      }
    }
  }, [isExecuting, mobileOptimization, accessibilityOptions, showConfirmation]);

  const announceActionCompletion = (action: RecoveryAction, result: RecoveryResult) => {
    const message = result.success
      ? `Action ${action.label} completed successfully${result.message ? `. ${result.message}` : ''}`
      : `Action ${action.label} failed${result.message ? `. ${result.message}` : ''}`;

    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  const getActionStatus = (action: RecoveryAction) => {
    if (executingActionId === action.id) return "executing";
    if (progress.has(action.id)) return "progress";
    const history = actionHistory.get(action.id) || [];
    if (history.length > 0) {
      const lastResult = history[history.length - 1];
      return lastResult.success ? "success" : "error";
    }
    return "idle";
  };

  const getActionVariant = (action: RecoveryAction) => {
    const status = getActionStatus(action);
    switch (status) {
      case "executing":
      case "progress":
        return "secondary";
      case "success":
        return "outline";
      case "error":
        return "destructive";
      default:
        switch (action.type) {
          case "primary": return "default";
          case "secondary": return "outline";
          case "danger": return "destructive";
          default: return "outline";
        }
    }
  };

  const getActionIcon = (action: RecoveryAction) => {
    const status = getActionStatus(action);
    if (status === "executing" || status === "progress") {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (status === "success") {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (status === "error") {
      return <AlertCircle className="h-4 w-4" />;
    }
    if (action.icon) {
      return <span>{action.icon}</span>;
    }
    return <Play className="h-4 w-4" />;
  };

  const getActionAriaLabel = (action: RecoveryAction) => {
    const status = getActionStatus(action);
    const baseLabel = accessibilityOptions?.ariaLabels?.[action.id] || action.label;
    const statusSuffix = status === "executing" ? " (executing)" : "";
    return `${baseLabel}${statusSuffix}`;
  };

  if (compact) {
    return (
      <div className={cn("flex gap-2", className)}>
        {actions.map(action => (
          <Button
            key={action.id}
            variant={getActionVariant(action)}
            size="sm"
            onClick={() => handleActionClick(action)}
            disabled={isExecuting}
            className={cn(
              "gap-1 flex-shrink-0",
              mobileOptimization?.touchOptimized && "min-h-[44px] min-w-[44px]"
            )}
            aria-label={getActionAriaLabel(action)}
            ref={el => {
              if (el) actionRefs.current.set(action.id, el);
            }}
          >
            {getActionIcon(action)}
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  const actionLayout = {
    horizontal: "flex gap-2 flex-wrap",
    vertical: "space-y-2",
    grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
  }[layout];

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Recovery Actions
            </CardTitle>
            <CardDescription>
              Execute recovery actions to resolve the error
            </CardDescription>
          </div>
          {showWorkflowControls && (
            <WorkflowControls
              workflow={workflow}
              onPause={onWorkflowPause}
              onResume={onWorkflowResume}
              onRestart={onWorkflowRestart}
              onCancel={onWorkflowCancel}
              onSkip={onWorkflowSkip}
              isExecuting={isExecuting}
              userPreferences={userPreferences}
              accessibilityOptions={accessibilityOptions}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Actions Grid/List */}
        <div className={actionLayout}>
          {actions.map(action => {
            const status = getActionStatus(action);
            const history = actionHistory.get(action.id) || [];
            const lastResult = history[history.length - 1];
            const currentProgress = progress.get(action.id) || 0;

            return (
              <ActionCard
                key={action.id}
                action={action}
                status={status}
                lastResult={lastResult}
                progress={currentProgress}
                onExecute={() => handleActionClick(action)}
                onExpand={() => setExpandedActionId(
                  expandedActionId === action.id ? null : action.id
                )}
                isExpanded={expandedActionId === action.id}
                showConfirmation={showConfirmation === action.id}
                onConfirmationCancel={() => setShowConfirmation(null)}
                mobileOptimization={mobileOptimization}
                accessibilityOptions={accessibilityOptions}
                ref={el => {
                  if (el) actionRefs.current.set(action.id, el);
                }}
              />
            );
          })}
        </div>

        {/* Action History Summary */}
        {actionHistory.size > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Recent Actions</h4>
            </div>
            <div className="space-y-2">
              {Array.from(actionHistory.entries()).map(([actionId, results]) => {
                const action = actions.find(a => a.id === actionId);
                if (!action) return null;

                const lastResult = results[results.length - 1];
                const successCount = results.filter(r => r.success).length;

                return (
                  <div
                    key={actionId}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {lastResult.success ? (
                        <CheckCircle className="h-4 w-4 text-status-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-status-error" />
                      )}
                      <span className="text-sm font-medium">{action.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {results.length}x
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {successCount}/{results.length} successful
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ActionCardProps {
  action: RecoveryAction;
  status: "idle" | "executing" | "progress" | "success" | "error";
  lastResult?: RecoveryResult;
  progress?: number;
  onExecute: () => void;
  onExpand: () => void;
  isExpanded: boolean;
  showConfirmation: boolean;
  onConfirmationCancel: () => void;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
}

function ActionCard({
  action,
  status,
  lastResult,
  progress = 0,
  onExecute,
  onExpand,
  isExpanded,
  showConfirmation,
  onConfirmationCancel,
  mobileOptimization,
  accessibilityOptions
}: ActionCardProps) {
  const canRetry = action.retryable && status === "error";
  const currentRetry = action.currentRetry || 0;
  const maxRetries = action.maxRetries || 3;

  if (showConfirmation) {
    return (
      <Card className="border-status-warning bg-status-warning/5">
        <CardContent className="p-4">
          <div className="space-y-3">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {action.confirmationMessage || `Are you sure you want to execute "${action.label}"?`}
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button size="sm" onClick={onExecute} variant="default">
                Confirm
              </Button>
              <Button size="sm" onClick={onConfirmationCancel} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      status === "executing" || status === "progress" ? "ring-2 ring-primary ring-offset-2" : "",
      status === "success" ? "border-status-success bg-status-success/5" : "",
      status === "error" ? "border-status-error bg-status-error/5" : "",
      mobileOptimization?.touchOptimized && "touch-manipulation"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Action Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {status === "executing" || status === "progress" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : status === "success" ? (
                <CheckCircle className="h-4 w-4 text-status-success" />
              ) : status === "error" ? (
                <AlertCircle className="h-4 w-4 text-status-error" />
              ) : action.icon ? (
                <span>{action.icon}</span>
              ) : (
                <Play className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{action.label}</h4>
                {action.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {action.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {status !== "idle" && (
                <Badge
                  variant={status === "success" ? "status-success" :
                           status === "error" ? "status-error" :
                           "status-warning"}
                  className="text-xs capitalize"
                >
                  {status}
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {status === "progress" && progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Executing...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Expected Duration */}
          {action.expectedDuration && status === "idle" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Expected: {action.expectedDuration}s
            </div>
          )}

          {/* Last Result Message */}
          {lastResult && lastResult.message && (
            <div className={cn(
              "text-xs p-2 rounded border",
              lastResult.success
                ? "text-status-success bg-status-success/10 border-status-success/20"
                : "text-status-error bg-status-error/10 border-status-error/20"
            )}>
              {lastResult.message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={onExecute}
              disabled={status === "executing" || status === "progress"}
              variant={status === "success" ? "outline" : "default"}
              size="sm"
              className={cn(
                "flex-1 gap-1",
                mobileOptimization?.touchOptimized && "min-h-[44px]",
                accessibilityOptions?.largeTextMode && "text-base"
              )}
              aria-label={accessibilityOptions?.ariaLabels?.[action.id] || action.label}
            >
              {canRetry ? (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Retry {currentRetry}/{maxRetries}
                </>
              ) : (
                <>
                  {status === "success" ? <CheckCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {status === "success" ? "Completed" : "Execute"}
                </>
              )}
            </Button>

            {(action.description || lastResult) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExpand}
                className="p-2"
                aria-label={isExpanded ? "Collapse details" : "Expand details"}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="pt-3 border-t space-y-2">
              {action.description && (
                <div>
                  <h5 className="font-medium text-sm mb-1">Description</h5>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              )}

              {lastResult && lastResult.details && (
                <div>
                  <h5 className="font-medium text-sm mb-1">Details</h5>
                  <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(lastResult.details, null, 2)}
                  </pre>
                </div>
              )}

              {action.retryable && status === "error" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RotateCcw className="h-3 w-3" />
                  Retryable: {maxRetries - currentRetry} attempts remaining
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface WorkflowControlsProps {
  workflow: RecoveryWorkflow;
  onPause?: () => void;
  onResume?: () => void;
  onRestart?: () => void;
  onCancel?: () => void;
  onSkip?: () => void;
  isExecuting: boolean;
  userPreferences?: RecoveryUserPreferences;
  accessibilityOptions?: AccessibilityOptions;
}

function WorkflowControls({
  workflow,
  onPause,
  onResume,
  onRestart,
  onCancel,
  onSkip,
  isExecuting,
  userPreferences,
  accessibilityOptions
}: WorkflowControlsProps) {
  const isPaused = workflow.status === "cancelled";
  const canPause = workflow.status === "in_progress" && onPause;
  const canResume = isPaused && onResume;
  const canRestart = onRestart;
  const canCancel = onSkip;

  return (
    <div className="flex items-center gap-1">
      {canPause && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPause}
          disabled={isExecuting}
          className="gap-1"
          aria-label="Pause workflow"
        >
          <Pause className="h-4 w-4" />
        </Button>
      )}

      {canResume && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResume}
          className="gap-1"
          aria-label="Resume workflow"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}

      {canRestart && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRestart}
          disabled={isExecuting}
          className="gap-1"
          aria-label="Restart workflow"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}

      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="gap-1"
          aria-label="Cancel workflow"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default RecoveryActionsComponent;
