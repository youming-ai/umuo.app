"use client";

import React, { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Settings,
  RotateCcw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import VolumeControl from "./volume-control";
import { UltraProgressBar } from "./ultra-progress-bar";

interface ControlsContainerProps {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current volume level (0-1) */
  volume: number;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Current playback rate */
  playbackRate: number;
  /** Available playback speed options */
  playbackSpeeds: number[];
  /** Whether to show controls */
  showControls: boolean;
  /** Touch-friendly mode */
  touchMode: boolean;
  /** Enhanced mode features */
  enhancedMode: boolean;
  /** Time formatting function */
  formatTime: (time: number) => string;
  /** Play callback */
  onPlay: () => void;
  /** Pause callback */
  onPause: () => void;
  /** Seek callback */
  onSeek: (time: number) => void;
  /** Skip back callback */
  onSkipBack: () => void;
  /** Skip forward callback */
  onSkipForward: () => void;
  /** Volume change callback */
  onVolumeChange: (volume: number) => void;
  /** Mute toggle callback */
  onMuteToggle: () => void;
  /** Playback rate change callback */
  onPlaybackRateChange: (rate: number) => void;
  /** Toggle controls visibility */
  onToggleControls: () => void;
  /** Transcription segments for progress markers */
  segments?: any[];
  /** Buffered ranges for buffer indicator */
  bufferedRanges?: Array<{ start: number; end: number }>;
  /** Whether audio is loading */
  isLoading?: boolean;
}

/**
 * ControlsContainer - Responsive audio player controls with visual feedback
 * Supports <200ms response times and mobile-first design
 */
export const ControlsContainer = React.memo<ControlsContainerProps>(
  ({
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    isMuted,
    playbackRate,
    playbackSpeeds,
    showControls,
    touchMode,
    enhancedMode,
    formatTime,
    onPlay,
    onPause,
    onSeek,
    onSkipBack,
    onSkipForward,
    onVolumeChange,
    onMuteToggle,
    onPlaybackRateChange,
    onToggleControls,
    segments = [],
    bufferedRanges = [],
    isLoading = false,
  }) => {
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    // Mobile detection for touch optimization
    const isMobile =
      typeof window !== "undefined" &&
      (window.innerWidth < 768 || "ontouchstart" in window);

    // Handle play/pause with visual feedback
    const handlePlayPause = useCallback(() => {
      if (isPlaying) {
        onPause();
      } else {
        onPlay();
      }
    }, [isPlaying, onPlay, onPause]);

    // Handle seek with debouncing for smooth interaction
    const handleSeekChange = useCallback(
      (value: number[]) => {
        const newTime = (value[0] / 100) * duration;
        onSeek(Math.max(0, Math.min(newTime, duration)));
      },
      [duration, onSeek],
    );

    // Handle volume change with immediate feedback
    const handleVolumeChange = useCallback(
      (newVolume: number) => {
        onVolumeChange(newVolume);

        // Auto-unmute when volume is adjusted from 0
        if (isMuted && newVolume > 0) {
          onMuteToggle();
        }
      },
      [isMuted, onVolumeChange, onMuteToggle],
    );

    // Touch-optimized button sizes
    const buttonSize = touchMode ? "h-14 w-14" : "h-12 w-12";
    const playButtonSize = touchMode ? "h-16 w-16" : "h-14 w-14";
    const iconSize = touchMode ? "h-6 w-6" : "h-5 w-5";
    const playIconSize = touchMode ? "h-8 w-8" : "h-6 w-6";

    if (!showControls && !touchMode) {
      return null;
    }

    return (
      <div
        className={cn(
          "flex flex-col space-y-4 border-t border-border/20 bg-background/95 backdrop-blur-sm",
          touchMode ? "p-4" : "p-6",
          touchMode && "pb-safe-area-inset-bottom",
        )}
        role="toolbar"
        aria-label="播放控制"
      >
        {/* Ultra-fast progress bar with <200ms response time */}
        {enhancedMode ? (
          <UltraProgressBar
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            isLoading={isLoading}
            bufferedRanges={bufferedRanges}
            segments={segments}
            onSeek={onSeek}
            onSeekStart={() => {}}
            onSeekEnd={() => {}}
            className="w-full"
            showTimeDisplay={true}
            showBufferIndicator={true}
            showSegmentMarkers={true}
            touchMode={touchMode}
            maxResponseTime={200} // CRITICAL: 200ms requirement
            variant={touchMode ? "compact" : "default"}
            enhancedMode={enhancedMode}
            performanceMode={process.env.NODE_ENV === "development"}
          />
        ) : (
          /* Fallback progress bar with time display */
          <div className="flex items-center space-x-3">
            <span
              className={cn(
                "font-mono text-xs text-muted-foreground",
                touchMode && "text-xs",
              )}
              aria-label="当前时间"
            >
              {formatTime(currentTime)}
            </span>

            <div className="relative flex-1">
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                onValueChange={handleSeekChange}
                className="cursor-pointer"
                aria-label="播放进度"
              />
            </div>

            <span
              className={cn(
                "font-mono text-xs text-muted-foreground",
                touchMode && "text-xs",
              )}
              aria-label="总时长"
            >
              {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Main playback controls */}
        <div className="flex items-center justify-center space-x-4">
          {/* Skip back */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSkipBack}
                  className={buttonSize}
                  aria-label="后退10秒"
                >
                  <SkipBack className={iconSize} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>后退 (←)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Play/Pause */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={handlePlayPause}
                  className={cn(
                    playButtonSize,
                    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
                    "transition-all duration-200",
                    isPlaying && "scale-95",
                  )}
                  aria-label={isPlaying ? "暂停" : "播放"}
                >
                  {isPlaying ? (
                    <Pause className={playIconSize} />
                  ) : (
                    <Play className={cn(playIconSize, "ml-1")} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPlaying ? "暂停 (空格)" : "播放 (空格)"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Skip forward */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSkipForward}
                  className={buttonSize}
                  aria-label="前进10秒"
                >
                  <SkipForward className={iconSize} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>前进 (→)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-between">
          {/* Volume control */}
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={onMuteToggle}
            compact={touchMode}
            enableBoost={true}
            showPresets={!touchMode}
            enableKeyboard={!touchMode}
            enableGestures={touchMode}
          />

          {/* Playback speed control */}
          {enhancedMode && (
            <div className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onMouseEnter={() => setShowSpeedMenu(true)}
                      onMouseLeave={() => setShowSpeedMenu(false)}
                      className={cn(buttonSize, touchMode && "h-12 w-12")}
                      aria-label="播放速度"
                    >
                      <RotateCcw className={iconSize} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>播放速度: {playbackRate}x</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Speed menu */}
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 rounded-lg border border-border bg-popover p-1 shadow-lg">
                  {playbackSpeeds.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        onPlaybackRateChange(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={cn(
                        "block w-full rounded px-3 py-2 text-left text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground",
                        playbackRate === speed &&
                          "bg-accent text-accent-foreground",
                      )}
                      aria-label={`播放速度 ${speed}x`}
                      aria-selected={playbackRate === speed}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings toggle */}
          {enhancedMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleControls}
                    className={cn(buttonSize, touchMode && "h-12 w-12")}
                    aria-label="设置"
                  >
                    <Settings className={iconSize} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>设置</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Touch-optimized progress indicator */}
        {touchMode && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  },
);

ControlsContainer.displayName = "ControlsContainer";

export default ControlsContainer;
