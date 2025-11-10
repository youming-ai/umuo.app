"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Zap,
  TrendingUp,
  Activity,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecoveryWorkflow,
  RecoveryProgress,
  RecoveryStep,
  MobileOptimization,
  AccessibilityOptions
} from "./types";

interface RecoveryProgressComponentProps {
  workflow: RecoveryWorkflow;
  progress: RecoveryProgress;
  isPaused?: boolean;
  onPauseToggle?: () => void;
  onStepClick?: (stepId: string) => void;
  mobileOptimization?: MobileOptimization;
  accessibilityOptions?: AccessibilityOptions;
  showDetailed?: boolean;
  compact?: boolean;
  className?: string;
}

export function RecoveryProgressComponent({
  workflow,
  progress,
  isPaused = false,
  onPauseToggle,
  onStepClick,
  mobileOptimization,
  accessibilityOptions,
  showDetailed = true,
  compact = false,
  className
}: RecoveryProgressComponentProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout>();

  // Update current time for ETA calculations
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const getOverallStatus = () => {
    if (workflow.status === "completed") return "completed";
    if (workflow.status === "failed") return "error";
    if (workflow.status === "cancelled") return "cancelled";
    if (isPaused) return "paused";
    if (workflow.status === "in_progress") return "in_progress";
    return "pending";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-status-success bg-status-success/10 border-status-success/20";
      case "in_progress": return "text-status-warning bg-status-warning/10 border-status-warning/20";
      case "error": return "text-status-error bg-status-error/10 border-status-error/20";
      case "paused": return "text-muted-foreground bg-muted border-border";
      case "cancelled": return "text-muted-foreground bg-muted border-border";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const calculateProgressSpeed = () => {
    if (!workflow.startedAt || progress.completedSteps.length === 0) return 0;
    const elapsedSeconds = (Date.now() - workflow.startedAt.getTime()) / 1000;
    return elapsedSeconds > 0 ? progress.completedSteps.length / elapsedSeconds : 0;
  };

  const getStepIcon = (step: RecoveryStep) => {
    if (step.completed) return <CheckCircle className="h-4 w-4 text-status-success" />;
    if (step.inProgress) return <Activity className="h-4 w-4 text-status-warning animate-pulse" />;
    if (step.error) return <AlertCircle className="h-4 w-4 text-status-error" />;
    return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />;
  };

  if (compact) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium">{workflow.name}</h3>
              <Badge variant={getStatusColor(getOverallStatus()) as any} className="capitalize">
                {workflow.status.replace('_', ' ')}
              </Badge>
            </div>
            <Progress value={progress.progressPercentage} className="h-2" />
            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
              <span>{progress.completedSteps.length} of {progress.totalSteps} steps</span>
              {progress.estimatedTimeRemaining && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(progress.estimatedTimeRemaining)}
                </span>
              )}
            </div>
          </div>
          {onPauseToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPauseToggle}
              className="flex-shrink-0"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{workflow.name}</CardTitle>
            <CardDescription>{workflow.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(getOverallStatus()) as any} className="capitalize">
              {workflow.status.replace('_', ' ')}
            </Badge>
            {onPauseToggle && workflow.status === "in_progress" && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPauseToggle}
                className="gap-1"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Overall Progress</span>
            </div>
            <span className="text-sm font-medium">
              {Math.round(progress.progressPercentage)}%
            </span>
          </div>

          <Progress
            value={progress.progressPercentage}
            className="h-3"
            aria-label={`Recovery progress: ${Math.round(progress.progressPercentage)}% complete`}
          />

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{progress.completedSteps.length} of {progress.totalSteps} steps completed</span>
            {progress.estimatedTimeRemaining && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                ~{formatTime(progress.estimatedTimeRemaining)} remaining
              </span>
            )}
          </div>
        </div>

        {/* Current Step Highlight */}
        {progress.currentStep && (
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Activity className="h-5 w-5 text-status-warning animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Currently Working On</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {progress.currentStep.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {progress.currentStep.description}
                </p>
                {progress.currentStep.estimatedDuration && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Estimated: {formatTime(progress.currentStep.estimatedDuration)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Statistics */}
        {showDetailed && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-status-success/10 border border-status-success/20">
              <CheckCircle className="h-5 w-5 text-status-success" />
              <div>
                <div className="font-medium text-status-success">Completed</div>
                <div className="text-sm text-muted-foreground">
                  {progress.completedSteps.length} steps
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-status-warning/10 border border-status-warning/20">
              <Activity className="h-5 w-5 text-status-warning" />
              <div>
                <div className="font-medium text-status-warning">In Progress</div>
                <div className="text-sm text-muted-foreground">
                  {progress.remainingSteps.filter(s => s.inProgress).length} steps
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Speed</div>
                <div className="text-sm text-muted-foreground">
                  {calculateProgressSpeed() > 0
                    ? `${(calculateProgressSpeed() * 60).toFixed(1)} steps/min`
                    : "Calculating..."
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step List */}
        {showDetailed && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Recovery Steps</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedSteps(
                  expandedSteps.size === workflow.steps.length
                    ? new Set()
                    : new Set(workflow.steps.map(s => s.id))
                )}
              >
                {expandedSteps.size === workflow.steps.length ? "Collapse All" : "Expand All"}
              </Button>
            </div>

            <div className="space-y-2">
              {workflow.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
                    "hover:bg-muted/50 cursor-pointer",
                    step.inProgress && "border-status-warning bg-status-warning/5",
                    step.completed && "border-status-success bg-status-success/5",
                    step.error && "border-status-error bg-status-error/5",
                    mobileOptimization?.touchOptimized && "touch-manipulation min-h-[44px]"
                  )}
                  onClick={() => onStepClick?.(step.id)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{index + 1}. {step.title}</span>
                      {step.required && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {step.description}
                    </p>

                    {step.error && (
                      <p className="text-xs text-status-error mt-1">{step.error}</p>
                    )}

                    {step.estimatedDuration && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(step.estimatedDuration)}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpansion(step.id);
                    }}
                  >
                    {expandedSteps.has(step.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Information */}
        {workflow.startedAt && (
          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Started:</span>
              <span>{workflow.startedAt.toLocaleTimeString()}</span>
            </div>
            {progress.elapsedTime && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Elapsed:</span>
                <span>{formatTime(Math.floor(progress.elapsedTime))}</span>
              </div>
            )}
            {workflow.completedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed:</span>
                <span>{workflow.completedAt.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecoveryProgressComponent;
