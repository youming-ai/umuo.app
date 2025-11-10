"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ProgressUpdate, StageProgress } from "@/types/progress";
import { ProgressRing } from "@/components/ui/common/ProgressRing";
import { LoadingSpinner } from "@/components/ui/common/LoadingSpinner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";

export interface ProgressIndicatorProps {
  progress: ProgressUpdate;
  variant?: "default" | "detailed" | "compact" | "minimal";
  showETA?: boolean;
  showDetails?: boolean;
  allowInteraction?: boolean;
  mobileOptimized?: boolean;
  className?: string;
  onStageClick?: (stage: string) => void;
  onRetry?: () => void;
  onCancel?: () => void;
}

interface StageConfig {
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  weight: number;
  mobileIcon: React.ReactNode;
  estimatedTime: {
    average: number;
    min: number;
    max: number;
  };
}

const stageConfigs: Record<string, StageConfig> = {
  upload: {
    label: "Upload",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    mobileIcon: "↑",
    description: "Uploading your audio file to our secure servers",
    color: "hsl(var(--primary))",
    weight: 0.1,
    estimatedTime: {
      average: 30000,
      min: 10000,
      max: 120000
    }
  },
  transcription: {
    label: "Transcription",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    mobileIcon: "✓",
    description: "Converting audio to text using AI-powered speech recognition",
    color: "hsl(var(--primary))",
    weight: 0.75,
    estimatedTime: {
      average: 180000,
      min: 60000,
      max: 600000
    }
  },
  "post-processing": {
    label: "Post-Processing",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    mobileIcon: "✨",
    description: "Enhancing transcription with translations, annotations, and formatting",
    color: "hsl(var(--primary))",
    weight: 0.15,
    estimatedTime: {
      average: 30000,
      min: 10000,
      max: 90000
    }
  }
};

export function ProgressIndicator({
  progress,
  variant = "default",
  showETA = true,
  showDetails = true,
  allowInteraction = true,
  mobileOptimized = true,
  className,
  onStageClick,
  onRetry,
  onCancel,
}: ProgressIndicatorProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  // Memoized stage data
  const stages = useMemo(() => {
    const baseStages: Record<string, StageProgress> = {
      upload: {
        stage: "upload",
        progress: progress.stages?.upload?.progress || 0,
        status: progress.currentStage === "upload" ? "in_progress" :
                progress.currentStage === "processing" || progress.currentStage === "completed" ? "completed" : "pending",
        speed: progress.stages?.upload?.speed,
        eta: progress.stages?.upload?.eta,
        startTime: progress.currentStage === "upload" ? Date.now() - (progress.processingTime || 0) : undefined,
        data: {
          bytesTransferred: progress.stages?.upload?.bytesTransferred,
          totalBytes: progress.stages?.upload?.totalBytes,
        },
      },
      transcription: {
        stage: "transcription",
        progress: progress.stages?.transcription?.progress || 0,
        status: progress.currentStage === "transcription" ? "in_progress" :
                progress.currentStage === "post-processing" || progress.currentStage === "completed" ? "completed" :
                progress.currentStage === "processing" && progress.overallProgress > 10 ? "in_progress" : "pending",
        eta: progress.stages?.transcription?.eta,
        startTime: progress.currentStage === "transcription" ? Date.now() - (progress.processingTime || 0) : undefined,
        data: {
          currentChunk: progress.stages?.transcription?.currentChunk,
          totalChunks: progress.stages?.transcription?.totalChunks,
          wordsProcessed: progress.stages?.transcription?.currentChunk * 100, // Estimate
        },
      },
      "post-processing": {
        stage: "post-processing",
        progress: progress.stages?.["post-processing"]?.progress || 0,
        status: progress.currentStage === "post-processing" ? "in_progress" :
                progress.currentStage === "completed" ? "completed" : "pending",
        startTime: progress.currentStage === "post-processing" ? Date.now() - (progress.processingTime || 0) : undefined,
        data: {
          segmentsProcessed: progress.stages?.["post-processing"]?.segmentsProcessed,
          totalSegments: progress.stages?.["post-processing"]?.totalSegments,
          currentOperation: "normalization" as const,
        },
      },
    };

    // Add calculated fields
    Object.values(baseStages).forEach(stage => {
      if (stage.status === "completed" && stage.startTime) {
        stage.endTime = stage.startTime + (stage.duration || 0);
        stage.duration = stage.endTime - stage.startTime;
      }
    });

    return baseStages;
  }, [progress]);

  // Handle stage interaction
  const handleStageClick = useCallback((stageKey: string) => {
    if (!allowInteraction) return;

    if (onStageClick) {
      onStageClick(stageKey);
    } else {
      setExpandedStage(expandedStage === stageKey ? null : stageKey);
    }
  }, [allowInteraction, onStageClick, expandedStage]);

  const handleStageHover = useCallback((stageKey: string | null) => {
    setHoveredStage(stageKey);
  }, []);

  // Calculate connection health
  const connectionHealth = useMemo(() => {
    if (!progress.mobileOptimizations) return "unknown";

    const { connectionType, batteryLevel } = progress.mobileOptimizations;

    if (connectionType === "wifi" && batteryLevel > 20) return "excellent";
    if (connectionType === "wifi" || (connectionType === "4g" && batteryLevel > 10)) return "good";
    if (connectionType === "4g" || connectionType === "3g") return "fair";
    return "poor";
  }, [progress.mobileOptimizations]);

  const hasError = progress.status === "failed" && progress.error;
  const isCompleted = progress.status === "completed";
  const isActive = progress.status === "uploading" || progress.status === "processing";

  // Render variants
  if (variant === "minimal") {
    return <MinimalProgressIndicator progress={progress} stages={stages} />;
  }

  if (variant === "compact") {
    return <CompactProgressIndicator
      progress={progress}
      stages={stages}
      onStageClick={allowInteraction ? handleStageClick : undefined}
      className={className}
    />;
  }

  if (variant === "detailed") {
    return <DetailedProgressIndicator
      progress={progress}
      stages={stages}
      expandedStage={expandedStage}
      hoveredStage={hoveredStage}
      onStageClick={handleStageClick}
      onStageHover={handleStageHover}
      onRetry={onRetry}
      onCancel={onCancel}
      mobileOptimized={mobileOptimized}
      connectionHealth={connectionHealth}
      className={className}
    />;
  }

  // Default variant
  return <DefaultProgressIndicator
    progress={progress}
    stages={stages}
    expandedStage={expandedStage}
    hoveredStage={hoveredStage}
    onStageClick={handleStageClick}
    onStageHover={handleStageHover}
    onRetry={onRetry}
    onCancel={onCancel}
    showETA={showETA}
    showDetails={showDetails}
    mobileOptimized={mobileOptimized}
    connectionHealth={connectionHealth}
    className={className}
  />;
}

// Minimal variant - just a simple progress indicator
function MinimalProgressIndicator({
  progress,
  stages
}: {
  progress: ProgressUpdate;
  stages: Record<string, StageProgress>;
}) {
  return (
    <div className="flex items-center gap-3">
      <ProgressRing
        value={progress.overallProgress}
        size="sm"
        status={progress.status}
      />
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{progress.message}</span>
          <span className="text-muted-foreground tabular-nums">{progress.overallProgress}%</span>
        </div>
      </div>
    </div>
  );
}

// Compact variant - horizontal stage indicators
function CompactProgressIndicator({
  progress,
  stages,
  onStageClick,
  className
}: {
  progress: ProgressUpdate;
  stages: Record<string, StageProgress>;
  onStageClick?: (stage: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{progress.message}</span>
        <span className="text-muted-foreground tabular-nums">{progress.overallProgress}%</span>
      </div>

      <div className="flex items-center gap-2">
        {Object.entries(stageConfigs).map(([stageKey, config]) => {
          const stage = stages[stageKey];
          const isActive = stage?.status === "in_progress";
          const isCompleted = stage?.status === "completed";
          const hasError = stage?.status === "failed";

          return (
            <button
              key={stageKey}
              onClick={() => onStageClick?.(stageKey)}
              className={cn(
                "flex-1 h-2 rounded-full transition-all duration-300",
                isCompleted && "bg-green-600 dark:bg-green-400",
                hasError && "bg-destructive",
                isActive && "bg-primary animate-pulse",
                !isActive && !isCompleted && !hasError && "bg-muted",
                onStageClick && "cursor-pointer hover:opacity-80"
              )}
              style={{
                width: `${config.weight * 100}%`,
                minWidth: "20px"
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// Detailed variant - full expanded view with rich interactions
function DetailedProgressIndicator({
  progress,
  stages,
  expandedStage,
  hoveredStage,
  onStageClick,
  onStageHover,
  onRetry,
  onCancel,
  mobileOptimized,
  connectionHealth,
  className
}: {
  progress: ProgressUpdate;
  stages: Record<string, StageProgress>;
  expandedStage: string | null;
  hoveredStage: string | null;
  onStageClick: (stage: string) => void;
  onStageHover: (stage: string | null) => void;
  onRetry?: () => void;
  onCancel?: () => void;
  mobileOptimized: boolean;
  connectionHealth: string;
  className?: string;
}) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Processing Progress</h3>
            <p className="text-sm text-muted-foreground mt-1">{progress.message}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Overall progress ring */}
            <div className="relative">
              <ProgressRing
                value={progress.overallProgress}
                size="md"
                status={progress.status}
                className="animate-pulse"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">{progress.overallProgress}%</span>
              </div>
            </div>

            {/* Connection health indicator */}
            {mobileOptimized && connectionHealth !== "unknown" && (
              <div className="flex items-center gap-2 text-xs">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connectionHealth === "excellent" && "bg-green-500",
                  connectionHealth === "good" && "bg-blue-500",
                  connectionHealth === "fair" && "bg-yellow-500",
                  connectionHealth === "poor" && "bg-red-500"
                )} />
                <span className="text-muted-foreground capitalize">{connectionHealth}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Interactive stage breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Processing Stages</h4>

          <div className={cn(
            "grid gap-4",
            mobileOptimized ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
          )}>
            {Object.entries(stageConfigs).map(([stageKey, config]) => {
              const stage = stages[stageKey];
              const isActive = stage?.status === "in_progress";
              const isCompleted = stage?.status === "completed";
              const hasError = stage?.status === "failed";
              const isExpanded = expandedStage === stageKey;
              const isHovered = hoveredStage === stageKey;

              return (
                <StageCard
                  key={stageKey}
                  stage={stage!}
                  config={config}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  hasError={hasError}
                  isExpanded={isExpanded}
                  isHovered={isHovered}
                  mobileOptimized={mobileOptimized}
                  onClick={() => onStageClick(stageKey)}
                  onHover={() => onStageHover(stageKey)}
                  onLeave={() => onStageHover(null)}
                />
              );
            })}
          </div>
        </div>

        {/* Expanded stage details */}
        {expandedStage && stages[expandedStage] && (
          <ExpandedStageDetails
            stage={stages[expandedStage]}
            config={stageConfigs[expandedStage]}
            onClose={() => onStageClick(expandedStage)}
          />
        )}

        {/* Error display */}
        {progress.status === "failed" && progress.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-destructive text-xs font-medium">!</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-destructive mb-1">Processing Failed</h4>
                <p className="text-sm text-destructive/80 mb-2">{progress.error.message}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-sm text-destructive hover:text-destructive/80 underline"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {onCancel && (progress.status === "uploading" || progress.status === "processing") && (
          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel Processing
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Default variant - balanced view with key features
function DefaultProgressIndicator({
  progress,
  stages,
  expandedStage,
  hoveredStage,
  onStageClick,
  onStageHover,
  onRetry,
  onCancel,
  showETA,
  showDetails,
  mobileOptimized,
  connectionHealth,
  className
}: {
  progress: ProgressUpdate;
  stages: Record<string, StageProgress>;
  expandedStage: string | null;
  hoveredStage: string | null;
  onStageClick: (stage: string) => void;
  onStageHover: (stage: string | null) => void;
  onRetry?: () => void;
  onCancel?: () => void;
  showETA: boolean;
  showDetails: boolean;
  mobileOptimized: boolean;
  connectionHealth: string;
  className?: string;
}) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Processing Progress</h3>

          <div className="flex items-center gap-3">
            {/* Connection health */}
            {mobileOptimized && connectionHealth !== "unknown" && (
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connectionHealth === "excellent" && "bg-green-500",
                  connectionHealth === "good" && "bg-blue-500",
                  connectionHealth === "fair" && "bg-yellow-500",
                  connectionHealth === "poor" && "bg-red-500"
                )} />
                <span className="text-xs text-muted-foreground capitalize">{connectionHealth}</span>
              </div>
            )}

            {onCancel && (progress.status === "uploading" || progress.status === "processing") && (
              <button
                onClick={onCancel}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main progress with ring */}
        <div className="flex items-center gap-4">
          <ProgressRing
            value={progress.overallProgress}
            size="lg"
            status={progress.status}
          />

          <div className="flex-1">
            <div className="text-sm font-medium mb-1">{progress.message}</div>
            <div className="text-2xl font-bold tabular-nums">{progress.overallProgress}%</div>
          </div>
        </div>

        {/* Stage indicators */}
        <div className="space-y-3">
          {Object.entries(stageConfigs).map(([stageKey, config]) => {
            const stage = stages[stageKey];
            const isActive = stage?.status === "in_progress";
            const isCompleted = stage?.status === "completed";
            const hasError = stage?.status === "failed";

            return (
              <InteractiveStageRow
                key={stageKey}
                stage={stage!}
                config={config}
                isActive={isActive}
                isCompleted={isCompleted}
                hasError={hasError}
                mobileOptimized={mobileOptimized}
                showDetails={showDetails}
                onClick={() => onStageClick(stageKey)}
              />
            );
          })}
        </div>

        {/* Expanded details */}
        {expandedStage && stages[expandedStage] && (
          <ExpandedStageDetails
            stage={stages[expandedStage]}
            config={stageConfigs[expandedStage]}
            onClose={() => onStageClick(expandedStage)}
          />
        )}

        {/* Error handling */}
        {progress.status === "failed" && progress.error && onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
          >
            Retry Processing
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// Stage card for detailed view
function StageCard({
  stage,
  config,
  isActive,
  isCompleted,
  hasError,
  isExpanded,
  isHovered,
  mobileOptimized,
  onClick,
  onHover,
  onLeave
}: {
  stage: StageProgress;
  config: StageConfig;
  isActive: boolean;
  isCompleted: boolean;
  hasError: boolean;
  isExpanded: boolean;
  isHovered: boolean;
  mobileOptimized: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const statusColor = hasError ? "hsl(var(--destructive))" :
                     isCompleted ? "hsl(var(--success))" :
                     isActive ? config.color : "hsl(var(--muted-foreground) / 0.3)";

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        "relative p-4 rounded-lg border transition-all duration-200 text-left",
        "hover:shadow-md active:scale-[0.98]",
        isCompleted && "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20",
        hasError && "border-destructive/30 bg-destructive/5",
        isActive && "border-primary bg-primary/5 shadow-sm",
        !isActive && !isCompleted && !hasError && "border-border bg-card",
        isExpanded && "ring-2 ring-primary/20"
      )}
    >
      {/* Stage header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          {isActive ? (
            <ProgressRing
              value={stage.progress}
              size="sm"
              color={statusColor}
              showLabel={false}
              className="animate-pulse"
            />
          ) : (
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                isCompleted && "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
                hasError && "bg-destructive/10 text-destructive",
                !isCompleted && !hasError && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : hasError ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                mobileOptimized ? config.mobileIcon : config.icon
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-medium text-sm mb-1",
            isActive && "text-foreground",
            isCompleted && "text-green-600 dark:text-green-400",
            hasError && "text-destructive"
          )}>
            {config.label}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {!isCompleted && !hasError && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="tabular-nums font-medium">{Math.round(stage.progress)}%</span>
          </div>

          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                isCompleted && "bg-green-600 dark:bg-green-400",
                hasError && "bg-destructive",
                isActive && "bg-primary",
                !isActive && !isCompleted && !hasError && "bg-muted-foreground/30"
              )}
              style={{ width: `${stage.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status details for active stages */}
      {isActive && (
        <StageActiveDetails stage={stage} mobileOptimized={mobileOptimized} />
      )}

      {/* Hover tooltip */}
      {isHovered && !isExpanded && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg shadow-lg text-xs whitespace-nowrap">
          <div className="font-medium mb-1">{config.label}</div>
          <div className="text-muted-foreground">
            {isCompleted ? "Completed" :
             hasError ? "Failed" :
             `In progress (${Math.round(stage.progress)}%)`}
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-popover border-r border-b" />
        </div>
      )}
    </button>
  );
}

// Interactive stage row for default view
function InteractiveStageRow({
  stage,
  config,
  isActive,
  isCompleted,
  hasError,
  mobileOptimized,
  showDetails,
  onClick
}: {
  stage: StageProgress;
  config: StageConfig;
  isActive: boolean;
  isCompleted: boolean;
  hasError: boolean;
  mobileOptimized: boolean;
  showDetails: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      {/* Icon/Status */}
      <div className="flex-shrink-0">
        {isActive ? (
          <div className="relative">
            <ProgressRing
              value={stage.progress}
              size="xs"
              color={hasError ? "hsl(var(--destructive))" :
                     isCompleted ? "hsl(var(--success))" : config.color}
              showLabel={false}
              className="animate-pulse"
            />
            {mobileOptimized && (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner size="xxs" className="opacity-60" />
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors",
            isCompleted && "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
            hasError && "bg-destructive/10 text-destructive",
            !isCompleted && !hasError && "bg-muted text-muted-foreground"
          )}>
            {isCompleted ? "✓" : hasError ? "✗" : mobileOptimized ? config.mobileIcon : config.icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 text-left">
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-sm font-medium",
            isActive && "text-foreground",
            isCompleted && "text-green-600 dark:text-green-400",
            hasError && "text-destructive"
          )}>
            {config.label}
          </span>
          {!isCompleted && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round(stage.progress)}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        {!isCompleted && !hasError && (
          <div className="mt-1.5 w-full bg-muted rounded-full h-1 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-out",
                isCompleted && "bg-green-600 dark:bg-green-400",
                hasError && "bg-destructive",
                isActive && "bg-primary",
                !isActive && !isCompleted && !hasError && "bg-muted-foreground/30"
              )}
              style={{ width: `${stage.progress}%` }}
            />
          </div>
        )}

        {/* Active details */}
        {showDetails && isActive && (
          <StageActiveDetails stage={stage} mobileOptimized={mobileOptimized} compact />
        )}
      </div>

      {/* Expand indicator */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

// Active stage details component
function StageActiveDetails({
  stage,
  mobileOptimized,
  compact = false
}: {
  stage: StageProgress;
  mobileOptimized: boolean;
  compact?: boolean;
}) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getDetails = () => {
    if (!stage.data) return null;

    if (stage.stage === "upload") {
      const { bytesTransferred, totalBytes } = stage.data;
      if (bytesTransferred !== undefined && totalBytes !== undefined) {
        return `${formatBytes(bytesTransferred)} / ${formatBytes(totalBytes)}`;
      }
    }

    if (stage.stage === "transcription") {
      const { currentChunk, totalChunks } = stage.data;
      if (currentChunk !== undefined && totalChunks !== undefined) {
        return `Chunk ${currentChunk}/${totalChunks}`;
      }
    }

    if (stage.stage === "post-processing") {
      const { currentOperation, segmentsProcessed, totalSegments } = stage.data;
      if (currentOperation) {
        const operations = {
          normalization: "Normalizing text",
          translation: "Adding translations",
          annotation: "Creating annotations",
          furigana: "Adding furigana",
        };
        return operations[currentOperation] || currentOperation;
      }
      if (segmentsProcessed !== undefined && totalSegments !== undefined) {
        return `${segmentsProcessed}/${totalSegments} segments`;
      }
    }

    return null;
  };

  const details = getDetails();
  if (!details && !stage.speed && !stage.eta) return null;

  return (
    <div className={cn(
      "text-xs text-muted-foreground space-y-1",
      compact ? "mt-2" : "mt-3 p-3 bg-muted/30 rounded-lg"
    )}>
      {details && <div>{details}</div>}

      {stage.speed && (
        <div>
          {stage.stage === "upload" && `Speed: ${formatBytes(stage.speed)}/s`}
          {stage.stage === "transcription" && `Speed: ${stage.speed.toFixed(1)}× realtime`}
        </div>
      )}

      {stage.eta && <div>ETA: {formatDuration(stage.eta)}</div>}

      {!compact && stage.startTime && (
        <div>Duration: {formatDuration(Date.now() - stage.startTime)}</div>
      )}
    </div>
  );
}

// Expanded stage details modal/panel
function ExpandedStageDetails({
  stage,
  config,
  onClose
}: {
  stage: StageProgress;
  config: StageConfig;
  onClose: () => void;
}) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{config.label} Details</h4>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Status:</span>
          <span className="ml-2 font-medium capitalize">{stage.status.replace('_', ' ')}</span>
        </div>

        <div>
          <span className="text-muted-foreground">Progress:</span>
          <span className="ml-2 font-medium tabular-nums">{Math.round(stage.progress)}%</span>
        </div>

        {stage.startTime && (
          <div>
            <span className="text-muted-foreground">Started:</span>
            <span className="ml-2 font-medium">
              {new Date(stage.startTime).toLocaleTimeString()}
            </span>
          </div>
        )}

        {stage.duration && (
          <div>
            <span className="text-muted-foreground">Duration:</span>
            <span className="ml-2 font-medium">{formatDuration(stage.duration)}</span>
          </div>
        )}

        {stage.speed && (
          <div>
            <span className="text-muted-foreground">Speed:</span>
            <span className="ml-2 font-medium">
              {stage.stage === "upload" ? `${formatBytes(stage.speed)}/s` : `${stage.speed.toFixed(1)}× realtime`}
            </span>
          </div>
        )}

        {stage.eta && (
          <div>
            <span className="text-muted-foreground">ETA:</span>
            <span className="ml-2 font-medium">{formatDuration(stage.eta)}</span>
          </div>
        )}
      </div>

      {/* Stage-specific data */}
      {stage.data && (
        <div className="space-y-2 pt-2 border-t">
          <div className="text-sm font-medium">Stage Information</div>

          {stage.stage === "upload" && (
            <div className="text-sm text-muted-foreground space-y-1">
              {stage.data.bytesTransferred !== undefined && stage.data.totalBytes !== undefined && (
                <div>
                  Transferred: {formatBytes(stage.data.bytesTransferred)} / {formatBytes(stage.data.totalBytes)}
                </div>
              )}
            </div>
          )}

          {stage.stage === "transcription" && (
            <div className="text-sm text-muted-foreground space-y-1">
              {stage.data.currentChunk !== undefined && stage.data.totalChunks !== undefined && (
                <div>Processing chunk {stage.data.currentChunk} of {stage.data.totalChunks}</div>
              )}
              {stage.data.wordsProcessed !== undefined && (
                <div>Words processed: {stage.data.wordsProcessed.toLocaleString()}</div>
              )}
            </div>
          )}

          {stage.stage === "post-processing" && (
            <div className="text-sm text-muted-foreground space-y-1">
              {stage.data.currentOperation && (
                <div className="capitalize">Current operation: {stage.data.currentOperation}</div>
              )}
              {stage.data.segmentsProcessed !== undefined && stage.data.totalSegments !== undefined && (
                <div>
                  Segments: {stage.data.segmentsProcessed} / {stage.data.totalSegments}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Estimated time range */}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        <div>Typical duration: {formatDuration(config.estimatedTime.min)} - {formatDuration(config.estimatedTime.max)}</div>
      </div>
    </div>
  );
}
