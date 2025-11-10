"use client";

import React from "react";
import { StageProgress } from "@/types/progress";
import { ProgressRing } from "@/components/ui/common/ProgressRing";
import { LoadingSpinner } from "@/components/ui/common/LoadingSpinner";
import { cn } from "@/lib/utils/utils";

export interface StageIndicatorProps {
  stages: Record<string, StageProgress>;
  className?: string;
  showDetails?: boolean;
  vertical?: boolean;
}

interface StageConfig {
  label: string;
  icon: string;
  color: string;
  weight: number; // Relative importance for overall progress
}

const stageConfigs: Record<string, StageConfig> = {
  upload: {
    label: "Upload",
    icon: "↑",
    color: "hsl(var(--primary))",
    weight: 0.1,
  },
  transcription: {
    label: "Transcription",
    icon: "✓",
    color: "hsl(var(--primary))",
    weight: 0.75,
  },
  "post-processing": {
    label: "Post-Processing",
    icon: "✨",
    color: "hsl(var(--primary))",
    weight: 0.15,
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function StageIndicator({
  stages,
  className,
  showDetails = true,
  vertical = false,
}: StageIndicatorProps) {
  const layoutClasses = vertical
    ? "space-y-4"
    : "space-x-4 flex items-center";

  return (
    <div className={cn(layoutClasses, className)}>
      {Object.entries(stageConfigs).map(([stageKey, config]) => {
        const stage = stages[stageKey];
        if (!stage) return null;

        const isActive = stage.status === "in_progress";
        const isCompleted = stage.status === "completed";
        const hasError = stage.status === "failed";
        const isPending = stage.status === "pending";

        return (
          <StageComponent
            key={stageKey}
            stage={stage}
            config={config}
            showDetails={showDetails}
            isActive={isActive}
            isCompleted={isCompleted}
            hasError={hasError}
            isPending={isPending}
          />
        );
      })}
    </div>
  );
}

interface StageComponentProps {
  stage: StageProgress;
  config: StageConfig;
  showDetails: boolean;
  isActive: boolean;
  isCompleted: boolean;
  hasError: boolean;
  isPending: boolean;
}

function StageComponent({
  stage,
  config,
  showDetails,
  isActive,
  isCompleted,
  hasError,
  isPending,
}: StageComponentProps) {
  const getStatusColor = () => {
    if (hasError) return "hsl(var(--destructive))";
    if (isCompleted) return "hsl(var(--success))";
    if (isActive) return config.color;
    return "hsl(var(--muted-foreground) / 0.3)";
  };

  const getStatusIcon = () => {
    if (hasError) return "✗";
    if (isCompleted) return "✓";
    if (isActive) return config.icon;
    return "○";
  };

  const getDetailedStatus = () => {
    if (!stage.data) return "";

    if (stage.stage === "upload") {
      const { bytesTransferred, totalBytes } = stage.data;
      if (bytesTransferred !== undefined && totalBytes !== undefined) {
        return `${formatBytes(bytesTransferred)} / ${formatBytes(totalBytes)}`;
      }
    }

    if (stage.stage === "transcription") {
      const { currentChunk, totalChunks, wordsProcessed } = stage.data;
      if (currentChunk !== undefined && totalChunks !== undefined) {
        return `Chunk ${currentChunk}/${totalChunks}`;
      }
      if (wordsProcessed !== undefined) {
        return `${wordsProcessed.toLocaleString()} words processed`;
      }
    }

    if (stage.stage === "post-processing") {
      const { segmentsProcessed, totalSegments, currentOperation } = stage.data;
      if (currentOperation) {
        const operationLabels: Record<string, string> = {
          normalization: "Normalizing text",
          translation: "Adding translations",
          annotation: "Creating annotations",
          furigana: "Adding furigana",
        };
        return operationLabels[currentOperation] || currentOperation;
      }
      if (segmentsProcessed !== undefined && totalSegments !== undefined) {
        return `${segmentsProcessed}/${totalSegments} segments`;
      }
    }

    return "";
  };

  return (
    <div className="flex-1 space-y-2">
      {/* Stage header */}
      <div className="flex items-center gap-2">
        {/* Icon/Progress indicator */}
        <div className="relative">
          {isActive ? (
            <div className="relative">
              <ProgressRing
                value={stage.progress}
                size="sm"
                thickness="normal"
                color={getStatusColor()}
                showLabel={false}
                className="animate-pulse"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner size="xs" className="opacity-60" />
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                isCompleted && "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
                hasError && "bg-destructive/10 text-destructive",
                isPending && "bg-muted text-muted-foreground"
              )}
            >
              {getStatusIcon()}
            </div>
          )}
        </div>

        {/* Stage label and progress */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-sm font-medium",
              isActive && "text-foreground",
              isCompleted && "text-green-600 dark:text-green-400",
              hasError && "text-destructive",
              isPending && "text-muted-foreground"
            )}>
              {config.label}
            </span>
            {!isPending && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round(stage.progress)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {!isPending && (
        <div className="relative">
          <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-in-out",
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

      {/* Detailed status information */}
      {showDetails && isActive && getDetailedStatus() && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{getDetailedStatus()}</div>

          {/* Speed information */}
          {stage.speed && (
            <div>
              {stage.stage === "upload" && (
                <span>Speed: {formatBytes(stage.speed)}/s</span>
              )}
              {stage.stage === "transcription" && (
                <span>Speed: {stage.speed.toFixed(1)}× realtime</span>
              )}
            </div>
          )}

          {/* ETA */}
          {stage.eta && (
            <div>ETA: {formatDuration(stage.eta)}</div>
          )}

          {/* Duration */}
          {stage.startTime && (
            <div>
              Duration: {formatDuration(Date.now() - stage.startTime)}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div className="text-xs text-destructive">
          Processing failed
        </div>
      )}
    </div>
  );
}
