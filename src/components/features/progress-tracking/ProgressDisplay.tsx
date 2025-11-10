"use client";

import React from "react";
import { ProgressUpdate, StageProgress } from "@/types/progress";
import { ProgressBar } from "./ProgressBar";
import { StageIndicator } from "./StageIndicator";
import { StatusMessage } from "./StatusMessage";
import { ErrorDisplay } from "./ErrorDisplay";
import { ETAIndicator } from "./ETAIndicator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";

export interface ProgressDisplayProps {
  progress: ProgressUpdate;
  compact?: boolean;
  showETA?: boolean;
  showStages?: boolean;
  className?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

export function ProgressDisplay({
  progress,
  compact = false,
  showETA = true,
  showStages = true,
  className,
  onRetry,
  onCancel,
}: ProgressDisplayProps) {
  const hasError = progress.status === "failed" && progress.error;
  const isCompleted = progress.status === "completed";
  const isActive = progress.status === "uploading" || progress.status === "processing";

  // Extract stage information from progress data
  const stages: Record<string, StageProgress> = {
    upload: {
      stage: "upload",
      progress: progress.stages?.upload?.progress || 0,
      status: progress.currentStage === "upload" ? "in_progress" :
              progress.currentStage === "processing" || progress.currentStage === "completed" ? "completed" : "pending",
      speed: progress.stages?.upload?.speed,
      eta: progress.stages?.upload?.eta,
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
      data: {
        currentChunk: progress.stages?.transcription?.currentChunk,
        totalChunks: progress.stages?.transcription?.totalChunks,
      },
    },
    "post-processing": {
      stage: "post-processing",
      progress: progress.stages?.["post-processing"]?.progress || 0,
      status: progress.currentStage === "post-processing" ? "in_progress" :
              progress.currentStage === "completed" ? "completed" : "pending",
      data: {
        segmentsProcessed: progress.stages?.["post-processing"]?.segmentsProcessed,
        totalSegments: progress.stages?.["post-processing"]?.totalSegments,
      },
    },
  };

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Compact Progress Bar */}
        <div className="flex items-center gap-3">
          <ProgressBar
            value={progress.overallProgress}
            status={progress.status}
            showLabel={false}
            className="flex-1"
          />
          <span className="text-sm font-medium tabular-nums min-w-[3rem] text-right">
            {progress.overallProgress}%
          </span>
        </div>

        {/* Status Message */}
        <StatusMessage
          message={progress.message}
          status={progress.status}
          compact
        />

        {/* Error Display */}
        {hasError && (
          <ErrorDisplay
            error={progress.error!}
            compact
            onRetry={onRetry}
          />
        )}

        {/* ETA (Compact) */}
        {showETA && !hasError && !isCompleted && (
          <ETAIndicator
            progress={progress}
            compact
          />
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Processing Progress</h3>

          {/* Overall Progress Ring */}
          <div className="flex items-center gap-3">
            {showETA && !hasError && !isCompleted && (
              <ETAIndicator progress={progress} />
            )}

            {onCancel && isActive && (
              <button
                onClick={onCancel}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel processing"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium tabular-nums">{progress.overallProgress}%</span>
          </div>
          <ProgressBar
            value={progress.overallProgress}
            status={progress.status}
            showLabel={false}
          />
        </div>

        {/* Status Message */}
        <StatusMessage
          message={progress.message}
          status={progress.status}
        />

        {/* Stage Breakdown */}
        {showStages && !hasError && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Processing Stages</h4>
            <StageIndicator stages={stages} />
          </div>
        )}

        {/* Error Display */}
        {hasError && (
          <ErrorDisplay
            error={progress.error!}
            onRetry={onRetry}
          />
        )}

        {/* Mobile Optimizations Info (if available) */}
        {progress.mobileOptimizations && (
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span>Connection:</span>
              <span className="font-medium capitalize">
                {progress.mobileOptimizations.connectionType}
              </span>
            </div>
            {progress.mobileOptimizations.isLowPowerMode && (
              <div className="text-amber-600 dark:text-amber-400">
                Low power mode enabled - processing optimized for battery life
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
