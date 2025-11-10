"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  memo,
} from "react";
import type { AudioPlayerState, Segment } from "@/types/db/database";
import { cn } from "@/lib/utils/utils";
import PlaybackSpeedControl from "@/components/features/player/PlaybackSpeedControl";
import { ProgressBar } from "@/components/features/player/progress-bar";
import {
  TouchControls,
  CompactTouchControls,
} from "@/components/features/player/touch-controls";
import {
  VisualFeedbackProvider,
  useVisualFeedback,
  TouchFeedback,
  PlayFeedback,
  PauseFeedback,
  VolumeFeedback,
  SpeedFeedback,
  SeekFeedback,
} from "@/components/features/player/visual-feedback";
import { useHapticFeedback } from "@/lib/mobile/haptic-feedback";
import { MobileDetector } from "@/types/mobile";

interface PlayerFooterProps {
  // Core player state (existing)
  audioPlayerState: AudioPlayerState;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onClearLoop?: () => void;
  loopStart?: number;
  loopEnd?: number;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;

  // Enhanced features (new)
  segments?: Segment[];
  /** Enable enhanced mobile-optimized controls */
  enhancedMode?: boolean;
  /** Force touch controls (overrides auto-detection) */
  forceTouchControls?: boolean;
  /** Use compact touch controls */
  compactTouchControls?: boolean;
  /** Enable gesture recognition */
  enableGestures?: boolean;
  /** Show segment markers on progress bar */
  showSegmentMarkers?: boolean;
  /** Enable haptic feedback */
  enableHapticFeedback?: boolean;
  /** Custom visual feedback configuration */
  visualFeedbackConfig?: any;
  /** Maximum response time for interactions (ms) */
  maxResponseTime?: number;
  /** Theme variant for controls */
  variant?: "default" | "compact" | "minimal";
  /** Custom CSS classes */
  className?: string;
  /** Playback speed options */
  playbackSpeeds?: number[];
  /** Skip amount for forward/backward (seconds) */
  skipAmount?: number;
  /** Volume control response time (ms) */
  volumeResponseTime?: number;
  /** Callback for performance monitoring */
  onPerformanceMetric?: (metric: {
    action: string;
    responseTime: number;
  }) => void;
}

// Internal component with visual feedback context
const PlayerFooterWithFeedback: React.FC<PlayerFooterProps> = memo(
  ({
    audioPlayerState,
    onSeek,
    onTogglePlay,
    onSkipBack,
    onSkipForward,
    onClearLoop,
    loopStart,
    loopEnd,
    playbackRate,
    onPlaybackRateChange,
    volume,
    onVolumeChange,

    // Enhanced features with defaults
    segments = [],
    enhancedMode = true,
    forceTouchControls = false,
    compactTouchControls = false,
    enableGestures = true,
    showSegmentMarkers = true,
    enableHapticFeedback = true,
    visualFeedbackConfig,
    maxResponseTime = 200,
    variant = "default",
    className = "",
    playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2],
    skipAmount = 10,
    volumeResponseTime = 150,
    onPerformanceMetric,
  }) => {
    // Enhanced hooks and refs
    const { triggerFeedback, triggerRipple, triggerParticles } =
      useVisualFeedback();
    const { trigger: triggerHaptic, playerAction: hapticPlayerAction } =
      useHapticFeedback();
    const footerRef = useRef<HTMLDivElement>(null);
    const lastInteractionTime = useRef<number>(0);
    const volumeChangeTimeout = useRef<NodeJS.Timeout | null>(null);

    // Mobile detection and optimization
    const deviceDetector = useMemo(() => MobileDetector.getInstance(), []);
    const isMobileDevice = deviceDetector.isMobile();
    const isTablet = deviceDetector.isTablet();
    const shouldUseTouchControls =
      forceTouchControls || isMobileDevice || isTablet;

    // Enhanced state
    const [showVolumeControl, setShowVolumeControl] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [touchFeedbackPosition, setTouchFeedbackPosition] = useState({
      x: 0,
      y: 0,
    });

    // Performance monitoring
    const measurePerformance = useCallback(
      (action: string, startTime: number) => {
        const responseTime = performance.now() - startTime;
        if (onPerformanceMetric) {
          onPerformanceMetric({ action, responseTime });
        }
        if (responseTime > maxResponseTime) {
          console.warn(
            `PlayerFooter ${action} exceeded response time: ${responseTime}ms > ${maxResponseTime}ms`,
          );
        }
        return responseTime;
      },
      [maxResponseTime, onPerformanceMetric],
    );

    // Enhanced memoized calculations
    const progressWidth = useMemo(() => {
      const { currentTime, duration } = audioPlayerState;
      if (!duration) return 0;
      return Math.min(100, Math.max(0, (currentTime / duration) * 100));
    }, [audioPlayerState]);

    const hasLoop = loopStart !== undefined && loopEnd !== undefined;
    const loopLabel = hasLoop
      ? `${formatTime(loopStart ?? 0)} – ${formatTime(loopEnd ?? 0)}`
      : null;

    // Enhanced interaction handlers with performance tracking and feedback
    const handlePlayPause = useCallback(
      (event?: React.MouseEvent | React.TouchEvent) => {
        const startTime = performance.now();

        // Calculate feedback position
        if (event && footerRef.current) {
          const rect = footerRef.current.getBoundingClientRect();
          let x: number, y: number;

          if ("touches" in event) {
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
          } else {
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
          }

          setTouchFeedbackPosition({ x, y });
        }

        // Trigger visual and haptic feedback
        if (audioPlayerState.isPlaying) {
          triggerFeedback("pause", {
            x: touchFeedbackPosition.x,
            y: touchFeedbackPosition.y,
          });
        } else {
          triggerFeedback("play", {
            x: touchFeedbackPosition.x,
            y: touchFeedbackPosition.y,
          });
        }

        if (enableHapticFeedback) {
          hapticPlayerAction("play");
        }

        // Execute action
        onTogglePlay();
        measurePerformance("playPause", startTime);
      },
      [
        audioPlayerState.isPlaying,
        onTogglePlay,
        triggerFeedback,
        enableHapticFeedback,
        hapticPlayerAction,
        touchFeedbackPosition,
        measurePerformance,
      ],
    );

    const handleSeek = useCallback(
      (time: number, event?: React.MouseEvent | React.TouchEvent) => {
        const startTime = performance.now();

        // Calculate feedback position for touch events
        if (event && footerRef.current) {
          const rect = footerRef.current.getBoundingClientRect();
          let x: number, y: number;

          if ("touches" in event) {
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
          } else {
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
          }

          triggerFeedback("seek", { x, y, duration: 200 });
        }

        if (enableHapticFeedback) {
          hapticPlayerAction("seek");
        }

        onSeek(time);
        measurePerformance("seek", startTime);
      },
      [
        onSeek,
        triggerFeedback,
        enableHapticFeedback,
        hapticPlayerAction,
        measurePerformance,
      ],
    );

    const handleVolumeChange = useCallback(
      (newVolume: number, immediate = false) => {
        const startTime = performance.now();

        // Debounce volume changes for performance
        if (volumeChangeTimeout.current) {
          clearTimeout(volumeChangeTimeout.current);
        }

        const applyVolumeChange = () => {
          onVolumeChange(newVolume);
          measurePerformance("volumeChange", startTime);

          if (enableHapticFeedback) {
            hapticPlayerAction("volume");
          }
        };

        if (immediate) {
          applyVolumeChange();
        } else {
          volumeChangeTimeout.current = setTimeout(
            applyVolumeChange,
            volumeResponseTime,
          );
        }
      },
      [
        onVolumeChange,
        enableHapticFeedback,
        hapticPlayerAction,
        volumeResponseTime,
        measurePerformance,
      ],
    );

    const handleSkipBack = useCallback(
      (event?: React.MouseEvent | React.TouchEvent) => {
        const startTime = performance.now();

        if (event && footerRef.current) {
          const rect = footerRef.current.getBoundingClientRect();
          let x: number, y: number;

          if ("touches" in event) {
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
          } else {
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
          }

          triggerFeedback("skip", { x, y, duration: 250 });
        }

        if (enableHapticFeedback) {
          hapticPlayerAction("skip");
        }

        onSkipBack?.();
        measurePerformance("skipBack", startTime);
      },
      [
        onSkipBack,
        triggerFeedback,
        enableHapticFeedback,
        hapticPlayerAction,
        measurePerformance,
      ],
    );

    const handleSkipForward = useCallback(
      (event?: React.MouseEvent | React.TouchEvent) => {
        const startTime = performance.now();

        if (event && footerRef.current) {
          const rect = footerRef.current.getBoundingClientRect();
          let x: number, y: number;

          if ("touches" in event) {
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
          } else {
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
          }

          triggerFeedback("skip", { x, y, duration: 250 });
        }

        if (enableHapticFeedback) {
          hapticPlayerAction("skip");
        }

        onSkipForward?.();
        measurePerformance("skipForward", startTime);
      },
      [
        onSkipForward,
        triggerFeedback,
        enableHapticFeedback,
        hapticPlayerAction,
        measurePerformance,
      ],
    );

    const handlePlaybackRateChange = useCallback(
      (rate: number, event?: React.MouseEvent | React.TouchEvent) => {
        const startTime = performance.now();

        if (event && footerRef.current) {
          const rect = footerRef.current.getBoundingClientRect();
          let x: number, y: number;

          if ("touches" in event) {
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
          } else {
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
          }

          triggerFeedback("speed", { x, y, value: rate });
        }

        if (enableHapticFeedback) {
          hapticPlayerAction("speed");
        }

        onPlaybackRateChange(rate);
        measurePerformance("playbackRateChange", startTime);
      },
      [
        onPlaybackRateChange,
        triggerFeedback,
        enableHapticFeedback,
        hapticPlayerAction,
        measurePerformance,
      ],
    );

    // Touch gesture handlers for mobile
    const handleGesture = useCallback(
      (gesture: string, event?: any) => {
        if (!enableGestures) return;

        switch (gesture) {
          case "swipeLeft":
            handleSkipForward(event);
            break;
          case "swipeRight":
            handleSkipBack(event);
            break;
          case "doubleTap":
            handlePlayPause(event);
            break;
          case "longPress":
            setShowVolumeControl(!showVolumeControl);
            break;
        }
      },
      [
        enableGestures,
        handleSkipForward,
        handleSkipBack,
        handlePlayPause,
        showVolumeControl,
      ],
    );

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (volumeChangeTimeout.current) {
          clearTimeout(volumeChangeTimeout.current);
        }
      };
    }, []);

    return (
      <footer
        ref={footerRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[var(--background-color)] via-[var(--background-color)] to-transparent",
          shouldUseTouchControls && "touch-pan-y",
          className,
        )}
      >
        <div className="mx-auto max-w-4xl">
          <div
            className={cn(
              "player-card flex flex-col gap-4 !rounded-2xl",
              shouldUseTouchControls && "touch-manipulation",
            )}
          >
            {/* Enhanced Progress Bar - replaces basic progress bar */}
            {enhancedMode ? (
              <div className="px-4 pt-2">
                <ProgressBar
                  currentTime={audioPlayerState.currentTime}
                  duration={audioPlayerState.duration || 0}
                  isPlaying={audioPlayerState.isPlaying}
                  segments={showSegmentMarkers ? segments : []}
                  onSeek={handleSeek}
                  onSeekStart={() => setIsSeeking(true)}
                  onSeekEnd={() => setIsSeeking(false)}
                  touchMode={shouldUseTouchControls}
                  maxResponseTime={maxResponseTime}
                  variant={variant}
                  showTimeDisplay={true}
                  showBufferIndicator={true}
                  showSegmentMarkers={showSegmentMarkers}
                  className="w-full"
                />
              </div>
            ) : (
              /* Legacy progress bar for backward compatibility */
              <div className="flex items-center gap-3 px-4">
                <p className="text-xs font-medium text-[var(--text-color)]/70">
                  {formatTime(audioPlayerState.currentTime)}
                </p>
                <div className="group relative h-2 flex-1">
                  <div className="h-full rounded-full bg-[var(--border-muted)]">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full bg-[var(--primary-color)]"
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={audioPlayerState.duration || 100}
                    value={audioPlayerState.currentTime}
                    onChange={(event) =>
                      handleSeek(parseFloat(event.target.value), event as any)
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4"
                  />
                  <div
                    className="pointer-events-none absolute top-1/2 -ml-2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[var(--surface-card)] bg-[var(--primary-color)] shadow"
                    style={{ left: `${progressWidth}%` }}
                  />
                </div>
                <p className="text-xs font-medium text-[var(--text-color)]/70">
                  {formatTime(audioPlayerState.duration || 0)}
                </p>
              </div>
            )}

            {/* Enhanced Controls - Touch or Traditional */}
            {enhancedMode && shouldUseTouchControls ? (
              // Touch-optimized controls for mobile
              <div className="px-4 pb-4">
                {compactTouchControls ? (
                  <CompactTouchControls
                    isPlaying={audioPlayerState.isPlaying}
                    currentTime={audioPlayerState.currentTime}
                    duration={audioPlayerState.duration || 0}
                    volume={volume}
                    playbackRate={playbackRate}
                    onPlayPause={handlePlayPause}
                    onSeek={handleSeek}
                    onVolumeChange={handleVolumeChange}
                    onPlaybackRateChange={handlePlaybackRateChange}
                    onSkipBack={() => handleSkipBack()}
                    onSkipForward={() => handleSkipForward()}
                    showVolumeControl={true}
                    showPlaybackRateControl={true}
                    compact={true}
                    className="bg-black/80 backdrop-blur-sm"
                    onSwipeLeft={() => handleSkipForward()}
                    onSwipeRight={() => handleSkipBack()}
                    onDoubleTap={() => handlePlayPause()}
                    onLongPress={() => setShowVolumeControl(!showVolumeControl)}
                  />
                ) : (
                  <TouchControls
                    isPlaying={audioPlayerState.isPlaying}
                    currentTime={audioPlayerState.currentTime}
                    duration={audioPlayerState.duration || 0}
                    volume={volume}
                    playbackRate={playbackRate}
                    onPlayPause={handlePlayPause}
                    onSeek={handleSeek}
                    onVolumeChange={handleVolumeChange}
                    onPlaybackRateChange={handlePlaybackRateChange}
                    onSkipBack={() => handleSkipBack()}
                    onSkipForward={() => handleSkipForward()}
                    showVolumeControl={true}
                    showPlaybackRateControl={true}
                    compact={isMobileDevice}
                    skipAmount={skipAmount}
                    className="bg-black/80 backdrop-blur-sm"
                    onSwipeLeft={() => handleSkipForward()}
                    onSwipeRight={() => handleSkipBack()}
                    onSwipeUp={() => setShowVolumeControl(true)}
                    onSwipeDown={() => setShowVolumeControl(false)}
                    onDoubleTap={() => handlePlayPause()}
                    onLongPress={() => setShowVolumeControl(!showVolumeControl)}
                    onPinch={(scale) => {
                      // Future: Implement subtitle zoom or audio visualization
                      console.log("Pinch gesture detected:", scale);
                    }}
                  />
                )}
              </div>
            ) : (
              /* Traditional controls with enhancements */
              <div className="flex items-center justify-between gap-4 px-4 pb-4">
                {/* Left side - Volume control */}
                <div className="flex w-1/3 items-center gap-2">
                  <TouchFeedback
                    onPress={(e) => {
                      setShowVolumeControl(!showVolumeControl);
                      if (enableHapticFeedback) {
                        triggerHaptic("light");
                      }
                    }}
                    feedbackType="touch"
                    className="relative"
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[var(--text-color)]/70 transition-all duration-200",
                        "hover:bg-[var(--primary-color)]/10 active:scale-95",
                        shouldUseTouchControls && "h-14 w-14",
                      )}
                      aria-label="音量控制"
                    >
                      <span
                        className={cn(
                          "material-symbols-outlined",
                          shouldUseTouchControls ? "text-3xl" : "text-3xl",
                        )}
                      >
                        {volume > 0 ? "volume_up" : "volume_off"}
                      </span>
                    </button>
                  </TouchFeedback>

                  {/* Enhanced volume slider with performance optimization */}
                  <div
                    className={cn(
                      "player-card absolute bottom-16 left-1/2 w-8 -translate-x-1/2 rounded-full bg-[var(--card-background)] p-2 shadow-lg transition-all duration-200",
                      showVolumeControl
                        ? "block opacity-100"
                        : "hidden opacity-0",
                      shouldUseTouchControls && "w-12 h-32",
                    )}
                    style={{
                      height: shouldUseTouchControls ? "140px" : "120px",
                      transition: `opacity ${volumeResponseTime}ms ease-out`,
                    }}
                  >
                    <div className="relative h-full w-full">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(event) => {
                          const newVolume = parseFloat(event.target.value);
                          handleVolumeChange(newVolume, true);
                        }}
                        className="h-full w-full cursor-pointer appearance-none bg-transparent"
                        style={{
                          writingMode: shouldUseTouchControls
                            ? "vertical-lr"
                            : "vertical-lr",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                        }}
                      />
                      {/* Volume level indicator */}
                      <div className="absolute inset-x-0 bottom-0 text-center">
                        <span className="text-xs font-mono text-[var(--text-color)]/70">
                          {Math.round(volume * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center - Main controls with enhanced feedback */}
                <div className="flex w-1/3 items-center justify-center gap-3">
                  <TouchFeedback
                    onPress={handleSkipBack}
                    feedbackType="touch"
                    disabled={!onSkipBack}
                  >
                    <button
                      type="button"
                      disabled={!onSkipBack}
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-full text-[var(--text-color)]/70 transition-all duration-200",
                        "hover:bg-[var(--primary-color)]/10 active:scale-95",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        shouldUseTouchControls ? "h-14 w-14" : "h-12 w-12",
                      )}
                      aria-label="后退10秒"
                    >
                      <span
                        className={cn(
                          "material-symbols-outlined",
                          shouldUseTouchControls ? "text-3xl" : "text-3xl",
                        )}
                      >
                        replay_10
                      </span>
                    </button>
                  </TouchFeedback>

                  <TouchFeedback
                    onPress={handlePlayPause}
                    feedbackType={audioPlayerState.isPlaying ? "pause" : "play"}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-full bg-[var(--primary-color)] text-white shadow-md transition-all duration-200",
                        "hover:bg-[var(--primary-color)]/90 active:scale-95",
                        shouldUseTouchControls ? "h-20 w-20" : "h-16 w-16",
                      )}
                      aria-label={audioPlayerState.isPlaying ? "暂停" : "播放"}
                    >
                      <span
                        className={cn(
                          "material-symbols-outlined",
                          shouldUseTouchControls ? "text-5xl" : "text-4xl",
                        )}
                      >
                        {audioPlayerState.isPlaying ? "pause" : "play_arrow"}
                      </span>
                    </button>
                  </TouchFeedback>

                  <TouchFeedback
                    onPress={handleSkipForward}
                    feedbackType="touch"
                    disabled={!onSkipForward}
                  >
                    <button
                      type="button"
                      disabled={!onSkipForward}
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-full text-[var(--text-color)]/70 transition-all duration-200",
                        "hover:bg-[var(--primary-color)]/10 active:scale-95",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                        shouldUseTouchControls ? "h-14 w-14" : "h-12 w-12",
                      )}
                      aria-label="前进10秒"
                    >
                      <span
                        className={cn(
                          "material-symbols-outlined",
                          shouldUseTouchControls ? "text-3xl" : "text-3xl",
                        )}
                      >
                        forward_10
                      </span>
                    </button>
                  </TouchFeedback>

                  {/* Recording/Mic button - unchanged but enhanced */}
                  <TouchFeedback
                    onPress={() => {
                      // Future: Add recording functionality
                      if (enableHapticFeedback) {
                        triggerHaptic("medium");
                      }
                    }}
                    feedbackType="touch"
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-full bg-[var(--state-error-text)] text-white shadow-md",
                        "transition-all duration-200 hover:bg-[var(--state-error-strong)] active:scale-95",
                        shouldUseTouchControls ? "h-14 w-14" : "h-12 w-12",
                      )}
                      aria-label="录音"
                    >
                      <span
                        className={cn(
                          "material-symbols-outlined",
                          shouldUseTouchControls ? "text-3xl" : "text-3xl",
                        )}
                      >
                        mic
                      </span>
                    </button>
                  </TouchFeedback>
                </div>

                {/* Right side - Loop and playback speed */}
                <div className="flex w-1/3 items-center justify-end gap-3">
                  {hasLoop ? (
                    <div className="flex flex-col items-end gap-1 text-right text-xs text-[var(--text-color)]/70">
                      {loopLabel ? <span>{loopLabel}</span> : null}
                      <TouchFeedback
                        onPress={() => {
                          onClearLoop?.();
                          if (enableHapticFeedback) {
                            triggerHaptic("selection");
                          }
                        }}
                        feedbackType="touch"
                        disabled={!onClearLoop}
                      >
                        <button
                          type="button"
                          disabled={!onClearLoop}
                          className="rounded-full border border-[var(--border-muted)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--text-color)]/80 transition-all duration-200 hover:bg-[var(--state-info-surface)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background-color)]"
                        >
                          清除循环
                        </button>
                      </TouchFeedback>
                    </div>
                  ) : null}

                  {/* Enhanced Playback Speed Control */}
                  <PlaybackSpeedControl
                    playbackRate={[playbackRate]}
                    onPlaybackRateChange={(rate) =>
                      handlePlaybackRateChange(rate[0])
                    }
                    compact={shouldUseTouchControls ? false : true}
                    showPresets={true}
                    allowCustom={true}
                    showHotkeys={!shouldUseTouchControls} // Show hotkeys on desktop only
                    enableHapticFeedback={enableHapticFeedback}
                    onSpeedChangeComplete={(speed) => {
                      console.log(
                        `Footer playback speed changed to: ${speed}x`,
                      );
                      if (enableHapticFeedback) {
                        triggerHaptic("success");
                      }
                    }}
                    className="ml-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </footer>
    );
  },
);

PlayerFooterWithFeedback.displayName = "PlayerFooterWithFeedback";

// Main export component with visual feedback provider wrapper
export function PlayerFooter(props: PlayerFooterProps) {
  return (
    <VisualFeedbackProvider
      config={props.visualFeedbackConfig}
      className="w-full"
    >
      <PlayerFooterWithFeedback {...props} />
    </VisualFeedbackProvider>
  );
}

// Utility function for time formatting
function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// Export additional utilities for external use
export { formatTime };
export type { PlayerFooterProps };

// Export default
export default PlayerFooter;
