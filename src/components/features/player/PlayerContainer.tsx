"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils/utils";
import type { FileRow } from "@/types/db/database";

interface PlayerContainerProps {
  /** File information */
  file: FileRow;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Time formatting function */
  formatTime: (time: number) => string;
  /** Whether to show controls */
  showControls: boolean;
  /** Touch-friendly mode */
  touchMode: boolean;
  /** Child components */
  children: ReactNode;
  /** Custom CSS classes */
  className?: string;
}

/**
 * PlayerContainer - Layout and styling wrapper for the enhanced audio player
 * Provides responsive design with mobile-first approach
 */
export const PlayerContainer = React.memo<PlayerContainerProps>(
  ({
    file,
    currentTime,
    duration,
    progress,
    formatTime,
    showControls,
    touchMode,
    children,
    className = "",
  }) => {
    return (
      <div
        className={cn(
          // Base layout
          "flex h-full flex-col",

          // Responsive spacing
          touchMode ? "p-4" : "p-6",

          // Touch-friendly sizing
          touchMode && "min-h-[400px]",

          // Interactive states
          "transition-all duration-200 ease-out",

          className,
        )}
        role="application"
        aria-label={`Audio Player: ${file.name}`}
      >
        {/* Header with file info and progress */}
        <div
          className={cn(
            "mb-6 flex flex-col space-y-4",
            touchMode && "mb-4",
          )}
        >
          {/* File title */}
          <div className="text-center">
            <h2
              className={cn(
                "truncate font-bold text-foreground",
                touchMode ? "text-lg px-2" : "text-xl px-4",
              )}
              title={file.name}
              aria-label={`当前播放: ${file.name}`}
            >
              {file.name}
            </h2>

            {/* File metadata */}
            <div
              className={cn(
                "mt-2 text-center text-muted-foreground",
                touchMode ? "text-xs" : "text-sm",
              )}
              aria-hidden="true"
            >
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {file.size && (
                <span className="ml-2">
                  • {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
            </div>
          </div>

          {/* Progress bar - enhanced visual feedback */}
          <div className={cn(
            "relative w-full",
            touchMode && "py-1"
          )}>
            {/* Progress background */}
            <div
              className={cn(
                "h-2 w-full overflow-hidden rounded-full bg-muted transition-all duration-200",
                touchMode && "h-3"
              )}
            >
              {/* Progress fill */}
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Progress indicator */}
            <div
              className={cn(
                "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-md transition-all duration-200",
                touchMode && "h-5 w-5",
              )}
              style={{ left: `calc(${progress}% - 8px)` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`播放进度: ${Math.round(progress)}%`}
            />
          </div>
        </div>

        {/* Main content area */}
        <div
          className={cn(
            "flex flex-1 flex-col",

            // Subtitle container area
            "min-h-0",

            // Responsive behavior
            touchMode ? "gap-3" : "gap-4",
          )}
        >
          {/* Dynamic content (subtitles, visualizer, etc.) */}
          <div className="flex-1 min-h-0">
            {children}
          </div>

          {/* Mobile-optimized spacing */}
          {touchMode && showControls && (
            <div className="h-2 flex-shrink-0" />
          )}
        </div>

        {/* Visual feedback for loading states */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200",
            "bg-gradient-to-t from-background/50 to-transparent",
            // Show on hover/touch when controls are visible
            showControls && touchMode && "opacity-100",
          )}
          aria-hidden="true"
        />
      </div>
    );
  },
);

PlayerContainer.displayName = "PlayerContainer";

export default PlayerContainer;
