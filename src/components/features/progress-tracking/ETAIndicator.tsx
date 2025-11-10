"use client";

import React from "react";
import { Clock, Activity, Wifi, WifiOff } from "lucide-react";
import { ProgressUpdate } from "@/types/progress";
import { cn } from "@/lib/utils/utils";

export interface ETAIndicatorProps {
  progress: ProgressUpdate;
  compact?: boolean;
  showConfidence?: boolean;
  showConnectionStatus?: boolean;
  className?: string;
}

function calculateConfidence(eta: number | undefined): number {
  if (!eta) return 0;

  // Confidence decreases with longer ETAs
  if (eta < 30000) return 0.9; // < 30s: 90% confidence
  if (eta < 60000) return 0.8; // < 1m: 80% confidence
  if (eta < 300000) return 0.6; // < 5m: 60% confidence
  if (eta < 600000) return 0.4; // < 10m: 40% confidence
  return 0.2; // > 10m: 20% confidence
}

function formatTime(ms: number): string {
  if (ms < 1000) return "< 1s";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

function getConnectionHealth(progress: ProgressUpdate): 'excellent' | 'good' | 'poor' | 'offline' {
  if (!progress.mobileOptimizations) {
    return progress.overallProgress > 0 ? 'good' : 'offline';
  }

  const { connectionType, isLowPowerMode } = progress.mobileOptimizations;

  if (connectionType === 'wifi' && !isLowPowerMode) return 'excellent';
  if (connectionType === 'wifi' || connectionType === '4g') return 'good';
  if (connectionType === '3g' || connectionType === '2g') return 'poor';
  return 'offline';
}

function getConnectionIcon(health: 'excellent' | 'good' | 'poor' | 'offline') {
  switch (health) {
    case 'excellent':
    case 'good':
      return Wifi;
    case 'poor':
      return WifiOff;
    case 'offline':
      return WifiOff;
    default:
      return Wifi;
  }
}

function getConnectionColor(health: 'excellent' | 'good' | 'poor' | 'offline') {
  switch (health) {
    case 'excellent':
      return "text-green-600 dark:text-green-400";
    case 'good':
      return "text-blue-600 dark:text-blue-400";
    case 'poor':
      return "text-amber-600 dark:text-amber-400";
    case 'offline':
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.6) return "text-blue-600 dark:text-blue-400";
  if (confidence >= 0.4) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function calculateStageETA(progress: ProgressUpdate): number | undefined {
  // Try to get ETA from current stage first
  const currentStage = progress.currentStage;
  if (currentStage && progress.stages?.[currentStage]?.eta) {
    return progress.stages[currentStage].eta;
  }

  // Calculate based on overall progress and historical data
  if (progress.overallProgress <= 0) return undefined;

  // Simple calculation based on elapsed time and progress
  const elapsed = Date.now() - progress.timestamp;
  if (elapsed <= 0) return undefined;

  const rate = progress.overallProgress / elapsed;
  const remaining = (100 - progress.overallProgress) / rate;

  return remaining > 0 ? remaining : undefined;
}

export function ETAIndicator({
  progress,
  compact = false,
  showConfidence = true,
  showConnectionStatus = true,
  className,
}: ETAIndicatorProps) {
  const eta = calculateStageETA(progress);
  const confidence = eta ? calculateConfidence(eta) : 0;
  const connectionHealth = getConnectionHealth(progress);
  const ConnectionIcon = getConnectionIcon(connectionHealth);

  // Don't show ETA for completed or failed processes
  if (progress.status === "completed" || progress.status === "failed") {
    return null;
  }

  // Don't show ETA if progress is 0 or we don't have enough data
  if (progress.overallProgress <= 0 || !eta) {
    if (compact) {
      return null;
    }

    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Clock className="h-3 w-3" />
        <span>Calculating ETA...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Clock className="h-3 w-3" />
        <span className="font-medium tabular-nums">{formatTime(eta)}</span>
        {showConfidence && confidence < 0.6 && (
          <span className="text-amber-600 dark:text-amber-400">≈</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main ETA Display */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Estimated time remaining:
          </span>
          <span className="text-sm font-bold tabular-nums text-primary">
            {formatTime(eta)}
          </span>
        </div>

        {/* Confidence indicator */}
        {showConfidence && (
          <div className="flex items-center gap-1">
            <Activity className={cn("h-3 w-3", getConfidenceColor(confidence))} />
            <span className={cn("text-xs", getConfidenceColor(confidence))}>
              {confidence >= 0.8 ? "High" :
               confidence >= 0.6 ? "Medium" :
               confidence >= 0.4 ? "Low" : "Very low"} confidence
            </span>
          </div>
        )}
      </div>

      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ConnectionIcon className={cn("h-3 w-3", getConnectionColor(connectionHealth))} />
          <span className="capitalize">
            {connectionHealth === 'excellent' && "Excellent connection"}
            {connectionHealth === 'good' && "Good connection"}
            {connectionHealth === 'poor' && "Poor connection - ETA may be inaccurate"}
            {connectionHealth === 'offline' && "Connection issues detected"}
          </span>
        </div>
      )}

      {/* Progress Speed Indicator */}
      {progress.stages && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {progress.stages.upload?.speed && (
            <div className="flex items-center gap-1">
              <span>↑</span>
              <span>{formatBytes(progress.stages.upload.speed)}/s</span>
            </div>
          )}

          {progress.stages.transcription?.progress && (
            <div className="flex items-center gap-1">
              <span>✓</span>
              <span>{Math.round(progress.stages.transcription.progress)}% transcribed</span>
            </div>
          )}

          {progress.stages["post-processing"]?.progress && (
            <div className="flex items-center gap-1">
              <span>✨</span>
              <span>{Math.round(progress.stages["post-processing"].progress)}% enhanced</span>
            </div>
          )}
        </div>
      )}

      {/* ETA Range for Low Confidence */}
      {showConfidence && confidence < 0.6 && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded p-2">
          <span className="font-medium">Note:</span> ETA is approximate due to variable processing times.
        </div>
      )}
    </div>
  );
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
