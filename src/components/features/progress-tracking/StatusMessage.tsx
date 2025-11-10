"use client";

import React from "react";
import { LoadingSpinner } from "@/components/ui/common/LoadingSpinner";
import { cn } from "@/lib/utils/utils";

export interface StatusMessageProps {
  message: string;
  status?: 'uploading' | 'processing' | 'completed' | 'failed';
  submessage?: string;
  timestamp?: number;
  compact?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function StatusMessage({
  message,
  status = "processing",
  submessage,
  timestamp,
  compact = false,
  showIcon = true,
  className,
}: StatusMessageProps) {
  const isActive = status === "uploading" || status === "processing";
  const isCompleted = status === "completed";
  const hasError = status === "failed";

  const getStatusIcon = () => {
    if (!showIcon) return null;

    if (hasError) {
      return (
        <div className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <span className="text-destructive text-xs">✗</span>
        </div>
      );
    }

    if (isCompleted) {
      return (
        <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
          <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
        </div>
      );
    }

    if (isActive) {
      return <LoadingSpinner size="xs" variant="muted" />;
    }

    return (
      <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <span className="text-muted-foreground text-xs">○</span>
      </div>
    );
  };

  const getStatusColor = () => {
    if (hasError) return "text-destructive";
    if (isCompleted) return "text-green-600 dark:text-green-400";
    if (isActive) return "text-foreground";
    return "text-muted-foreground";
  };

  const formatTimestamp = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;

    if (diff < 1000) return "Just now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(ts).toLocaleTimeString();
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm truncate", getStatusColor())}>
            {message}
          </p>
        </div>
        {timestamp && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatTimestamp(timestamp)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main status message */}
      <div className="flex items-start gap-3">
        {getStatusIcon()}

        <div className="flex-1 min-w-0">
          {/* Primary message */}
          <p className={cn(
            "text-sm font-medium leading-relaxed",
            getStatusColor()
          )}>
            {message}
          </p>

          {/* Submessage */}
          {submessage && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {submessage}
            </p>
          )}

          {/* Timestamp and additional info */}
          {(timestamp || isActive) && (
            <div className="flex items-center gap-3 mt-2">
              {timestamp && (
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(timestamp)}
                </span>
              )}

              {isActive && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  Processing...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Animated border for active status */}
      {isActive && (
        <div className="relative overflow-hidden h-px bg-muted">
          <div
            className="absolute inset-0 bg-primary/30 h-full animate-pulse"
            style={{
              animation: "status-slide 2s infinite ease-in-out",
            }}
          />
        </div>
      )}
    </div>
  );
}

// Add slide animation for active status
const slideKeyframes = `
  @keyframes status-slide {
    0%, 100% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(100%);
    }
  }
`;

// Inject animation styles if not already present
if (typeof document !== "undefined" && !document.getElementById("status-message-animations")) {
  const style = document.createElement("style");
  style.id = "status-message-animations";
  style.textContent = slideKeyframes;
  document.head.appendChild(style);
}
