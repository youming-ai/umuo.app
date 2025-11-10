"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "@/components/ui/common/ProgressRing";
import { LoadingSpinner } from "@/components/ui/common/LoadingSpinner";
import { cn } from "@/lib/utils/utils";
import { touchOptimizer } from "@/lib/mobile/touch-optimization";

// Accessibility types for progress indicators
interface ProgressAccessibilityConfig {
  enableScreenReaderAnnouncements?: boolean;
  announcements?: {
    progress?: string;
    completed?: string;
    error?: string;
  };
  enableKeyboardControl?: boolean;
}

export interface ProgressBarProps {
  value: number;
  status?: "uploading" | "processing" | "completed" | "failed";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ring" | "compact";
  className?: string;
  animated?: boolean;
  color?: string;
  max?: number;
  accessibility?: ProgressAccessibilityConfig;
  "aria-label"?: string;
  "aria-valuetext"?: string;
  "aria-describedby"?: string;
}

export function ProgressBar({
  value,
  status = "processing",
  showLabel = true,
  size = "md",
  variant = "default",
  className,
  animated = true,
  color,
  max = 100,
  accessibility = {},
  "aria-label": ariaLabel,
  "aria-valuetext": ariaValueText,
  "aria-describedby": ariaDescribedBy,
}: ProgressBarProps) {
  const isActive = status === "uploading" || status === "processing";
  const isCompleted = status === "completed";
  const hasError = status === "failed";

  // Accessibility configuration
  const accessibilityConfig = {
    enableScreenReaderAnnouncements:
      accessibility.enableScreenReaderAnnouncements ?? true,
    announcements: {
      progress: accessibility.announcements?.progress ?? "Progress",
      completed: accessibility.announcements?.completed ?? "Completed",
      error: accessibility.announcements?.error ?? "Error occurred",
    },
    enableKeyboardControl: accessibility.enableKeyboardControl ?? false,
  };

  // Determine color based on status
  const getStatusColor = () => {
    if (color) return color;
    if (hasError) return "hsl(var(--destructive))";
    if (isCompleted) return "hsl(var(--success))";
    return "hsl(var(--primary))";
  };

  // Screen reader announcements for progress changes
  React.useEffect(() => {
    if (accessibilityConfig.enableScreenReaderAnnouncements) {
      const percentage = Math.round((value / max) * 100);
      let message = "";

      if (isCompleted) {
        message = `${accessibilityConfig.announcements.completed}: ${percentage}%`;
      } else if (hasError) {
        message = `${accessibilityConfig.announcements.error}: ${percentage}%`;
      } else {
        message = `${accessibilityConfig.announcements.progress}: ${percentage}%`;
      }

      // Create announcement element
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", isActive ? "polite" : "off");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = message;
      document.body.appendChild(announcement);

      // Clean up after announcement
      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 1000);
    }
  }, [
    value,
    status,
    accessibilityConfig.enableScreenReaderAnnouncements,
    accessibilityConfig.announcements,
    max,
    isActive,
    isCompleted,
    hasError,
  ]);

  // Generate accessibility labels
  const getAriaLabel = () => {
    if (ariaLabel) return ariaLabel;
    const percentage = Math.round((value / max) * 100);
    return `Progress: ${percentage}% (${status})`;
  };

  const getAriaValueText = () => {
    if (ariaValueText) return ariaValueText;
    const percentage = Math.round((value / max) * 100);
    return `${percentage} percent complete, status: ${status}`;
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      height: "h-1",
      ring: "xs",
      text: "text-xs",
    },
    md: {
      height: "h-2",
      ring: "sm",
      text: "text-sm",
    },
    lg: {
      height: "h-3",
      ring: "md",
      text: "text-base",
    },
  };

  const config = sizeConfig[size];

  if (variant === "ring") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <ProgressRing
          value={value}
          max={max}
          size={config.ring as any}
          showLabel={showLabel}
          color={getStatusColor()}
          className={animated ? "transition-all duration-300 ease-in-out" : ""}
        />
        {showLabel && (
          <span className={cn("font-medium tabular-nums", config.text)}>
            {Math.round((value / max) * 100)}%
          </span>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1">
          <Progress
            value={value}
            className={cn(
              config.height,
              animated && "transition-all duration-300 ease-in-out",
              hasError && "[&>div]:bg-destructive",
              isCompleted && "[&>div]:bg-green-600",
            )}
          />
        </div>
        {showLabel && (
          <span
            className={cn(
              "font-medium tabular-nums min-w-[3rem] text-right",
              config.text,
            )}
          >
            {Math.round((value / max) * 100)}%
          </span>
        )}
        {isActive && (
          <LoadingSpinner
            size={size === "lg" ? "sm" : "xs"}
            variant="muted"
            className="ml-1"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-2", className)}
      role="status"
      aria-label={getAriaLabel()}
    >
      {/* Progress bar with status indicator */}
      <div className="relative">
        <Progress
          value={value}
          max={max}
          className={cn(
            config.height,
            animated && "transition-all duration-300 ease-in-out",
            hasError && "[&>div]:bg-destructive",
            isCompleted && "[&>div]:bg-green-600",
            "accessibility-enhanced",
          )}
          aria-label={getAriaLabel()}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuetext={getAriaValueText()}
          aria-describedby={ariaDescribedBy}
          tabIndex={accessibilityConfig.enableKeyboardControl ? 0 : undefined}
        />

        {/* Animated shimmer effect for active progress */}
        {isActive && animated && (
          <div
            className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
            style={{
              animation: "shimmer 2s infinite",
            }}
          />
        )}
      </div>

      {/* Status indicator and label */}
      {(showLabel || isActive) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isActive && <LoadingSpinner size="xs" variant="muted" />}
            <span className={cn("text-sm font-medium", config.text)}>
              {Math.round((value / max) * 100)}%
            </span>
          </div>

          {/* Status text */}
          <span
            className={cn(
              "text-xs",
              hasError && "text-destructive",
              isCompleted && "text-green-600 dark:text-green-400",
              isActive && "text-muted-foreground",
            )}
          >
            {status === "uploading" && "Uploading..."}
            {status === "processing" && "Processing..."}
            {status === "completed" && "Completed"}
            {status === "failed" && "Failed"}
          </span>
        </div>
      )}
    </div>
  );
}

// Add shimmer animation to global styles
const shimmerKeyframes = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }
`;

// Inject shimmer styles if not already present
if (
  typeof document !== "undefined" &&
  !document.getElementById("progress-bar-shimmer")
) {
  const style = document.createElement("style");
  style.id = "progress-bar-shimmer";
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}
