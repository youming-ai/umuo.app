/**
 * Touch-optimized player controls with gesture recognition and haptic feedback
 * Provides specialized controls designed for mobile touch interactions
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  useGestureRecognizer,
  createPlayerGestureConfig,
  GestureEvent,
} from "@/lib/mobile/gesture-recognizer";
import { useHapticFeedback } from "@/lib/mobile/haptic-feedback";
import {
  TouchButton,
  TouchSlider,
  TouchFeedback,
} from "@/lib/mobile/visual-feedback";
import { MobileDetector } from "@/types/mobile";
import { touchOptimizer } from "@/lib/mobile/touch-optimization";

// Accessibility enhanced types
interface AccessibleTouchControlProps {
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-pressed"?: boolean;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-valuenow"?: number;
  "aria-valuemin"?: number;
  "aria-valuemax"?: number;
  role?: string;
  tabIndex?: number;
}

export interface TouchControlsProps extends AccessibleTouchControlProps {
  // Player state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;

  // Player controls
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSkipBack?: (seconds?: number) => void;
  onSkipForward?: (seconds?: number) => void;

  // Configuration
  showVolumeControl?: boolean;
  showPlaybackRateControl?: boolean;
  skipAmount?: number;
  maxVolume?: number;
  playbackRates?: number[];

  // Visual configuration
  compact?: boolean;
  disabled?: boolean;
  className?: string;

  // Gesture callbacks
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinch?: (scale: number) => void;

  // Accessibility configuration
  accessibility?: {
    enableScreenReaderAnnouncements?: boolean;
    enableGestureAlternatives?: boolean;
    enableVoiceControl?: boolean;
    enableSwitchNavigation?: boolean;
    announcements?: {
      playState?: string;
      volume?: string;
      playbackRate?: string;
      seeking?: string;
    };
  };
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackRate,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
  onSkipBack,
  onSkipForward,
  showVolumeControl = true,
  showPlaybackRateControl = true,
  skipAmount = 10,
  maxVolume = 1,
  playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2],
  compact = false,
  disabled = false,
  className = "",
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onDoubleTap,
  onLongPress,
  onPinch,
  accessibility = {},
  ...ariaProps
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showRateSlider, setShowRateSlider] = useState(false);
  const [gestureAlternativesVisible, setGestureAlternativesVisible] =
    useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const { trigger: triggerHaptic, playerAction } = useHapticFeedback();

  // Accessibility configuration
  const accessibilityConfig = {
    enableScreenReaderAnnouncements:
      accessibility.enableScreenReaderAnnouncements ?? true,
    enableGestureAlternatives: accessibility.enableGestureAlternatives ?? true,
    enableVoiceControl: accessibility.enableVoiceControl ?? false,
    enableSwitchNavigation: accessibility.enableSwitchNavigation ?? false,
    announcements: {
      playState: accessibility.announcements?.playState ?? "Audio playback",
      volume: accessibility.announcements?.volume ?? "Volume",
      playbackRate:
        accessibility.announcements?.playbackRate ?? "Playback speed",
      seeking: accessibility.announcements?.seeking ?? "Seeking",
    },
  };

  // Accessibility announcement function
  const announceToScreenReader = useCallback(
    (message: string) => {
      if (
        accessibilityConfig.enableScreenReaderAnnouncements &&
        typeof window !== "undefined"
      ) {
        // Create announcement element for screen readers
        const announcement = document.createElement("div");
        announcement.setAttribute("aria-live", "polite");
        announcement.setAttribute("aria-atomic", "true");
        announcement.className = "sr-only";
        announcement.textContent = message;
        document.body.appendChild(announcement);

        // Remove after announcement
        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
      }
    },
    [accessibilityConfig.enableScreenReaderAnnouncements],
  );

  // Initialize accessibility features
  useEffect(() => {
    if (containerRef.current) {
      // Apply accessibility features to container
      touchOptimizer.createAccessibleTouchTarget(containerRef.current, {
        role: "application",
        label: "Audio player controls",
        announceInteraction:
          accessibilityConfig.enableScreenReaderAnnouncements,
      });

      // Enable voice control if configured
      if (accessibilityConfig.enableVoiceControl) {
        touchOptimizer.enableVoiceControl({
          enableVoiceControl: true,
          recognitionLanguage: "en-US",
          confidenceThreshold: 0.7,
          commands: {
            play: "play",
            pause: "pause",
            stop: "stop",
            "volume up": "volume-up",
            "volume down": "volume-down",
            "skip forward": "skip-forward",
            "skip backward": "skip-backward",
            faster: "speed-up",
            slower: "speed-down",
          },
        });
      }

      // Enable switch navigation if configured
      if (accessibilityConfig.enableSwitchNavigation) {
        touchOptimizer.enableSwitchNavigation({
          enableSwitchNavigation: true,
          scanSpeed: 1000,
          autoScan: false,
          scanPattern: "grid",
          customScanOrder: [],
        });
      }
    }
  }, [accessibilityConfig]);

  const deviceDetector = MobileDetector.getInstance();
  const isMobile = deviceDetector.isMobile();
  const isTablet = deviceDetector.isTablet();
  const screenSize = deviceDetector.getScreenSizeCategory();

  // Gesture configuration
  const gestureConfig = createPlayerGestureConfig();

  const gestureHandlers = {
    onTap: (event: GestureEvent) => {
      // Handle tap on player area
      if (event.target === containerRef.current) {
        // Toggle playback controls visibility
        triggerHaptic("light");
      }
    },

    onDoubleTap: (event: GestureEvent) => {
      // Double tap to play/pause
      onDoubleTap?.();
      if (!onDoubleTap) {
        onPlayPause();
      }
      triggerHaptic("medium");
    },

    onSwipe: (event: GestureEvent) => {
      // Handle swipe gestures
      switch (event.direction) {
        case "left":
          onSwipeLeft?.();
          if (!onSwipeLeft && onSkipForward) {
            onSkipForward(skipAmount);
          }
          break;
        case "right":
          onSwipeRight?.();
          if (!onSwipeRight && onSkipBack) {
            onSkipBack(skipAmount);
          }
          break;
        case "up":
          onSwipeUp?.();
          if (!onSwipeUp && showVolumeControl) {
            setShowVolumeSlider(true);
          }
          break;
        case "down":
          onSwipeDown?.();
          if (!onSwipeDown && showVolumeControl) {
            setShowVolumeSlider(false);
          }
          break;
      }
      triggerHaptic("impact");
    },

    onLongPress: (event: GestureEvent) => {
      // Long press for additional actions
      onLongPress?.();
      if (!onLongPress && showPlaybackRateControl) {
        setShowRateSlider(!showRateSlider);
      }
      triggerHaptic("heavy");
    },

    onPinch: (event: GestureEvent) => {
      // Pinch for zoom/subtitle size adjustment
      onPinch?.(event.scale || 1);
      triggerHaptic("selection");
    },

    onDrag: (event: GestureEvent) => {
      // Handle drag gestures for seeking
      if (seekBarRef.current) {
        const rect = seekBarRef.current.getBoundingClientRect();
        const percentage = Math.max(
          0,
          Math.min(1, event.data.endX / rect.width),
        );
        const seekTime = percentage * duration;
        onSeek(seekTime);
      }
      triggerHaptic("light");
    },
  };

  const { bind: bindGestures } = useGestureRecognizer(
    gestureConfig,
    gestureHandlers,
  );

  // Apply gesture binding to container
  useEffect(() => {
    if (containerRef.current) {
      bindGestures(containerRef.current);
    }
  }, [bindGestures]);

  // Handle volume change with haptic feedback
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      onVolumeChange(newVolume);
      playerAction("volume");
    },
    [onVolumeChange, playerAction],
  );

  // Handle playback rate change with haptic feedback
  const handlePlaybackRateChange = useCallback(
    (newRate: number) => {
      onPlaybackRateChange(newRate);
      playerAction("speed");
    },
    [onPlaybackRateChange, playerAction],
  );

  // Handle play/pause with haptic feedback
  const handlePlayPause = useCallback(() => {
    onPlayPause();
    playerAction("play");

    // Screen reader announcement
    announceToScreenReader(
      `${accessibilityConfig.announcements.playState} ${isPlaying ? "paused" : "playing"}`,
    );
  }, [
    onPlayPause,
    playerAction,
    isPlaying,
    announceToScreenReader,
    accessibilityConfig.announcements.playState,
  ]);

  // Handle skip with accessibility enhancements
  const handleSkipBack = useCallback(() => {
    onSkipBack?.(skipAmount);
    playerAction("skip");

    // Screen reader announcement
    announceToScreenReader(`Skipped back ${skipAmount} seconds`);
  }, [onSkipBack, skipAmount, playerAction, announceToScreenReader]);

  const handleSkipForward = useCallback(() => {
    onSkipForward?.(skipAmount);
    playerAction("skip");

    // Screen reader announcement
    announceToScreenReader(`Skipped forward ${skipAmount} seconds`);
  }, [onSkipForward, skipAmount, playerAction, announceToScreenReader]);

  // Handle seek bar change with haptic feedback
  const handleSeekChange = useCallback(
    (newTime: number) => {
      onSeek(newTime);
      playerAction("seek");

      // Screen reader announcement
      const percentage = Math.round((newTime / duration) * 100);
      announceToScreenReader(
        `${accessibilityConfig.announcements.seeking} ${percentage}%`,
      );
    },
    [
      onSeek,
      playerAction,
      duration,
      announceToScreenReader,
      accessibilityConfig.announcements.seeking,
    ],
  );

  // Format time for display
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get touch-optimized button sizes
  const getButtonSize = () => {
    if (compact) {
      return isMobile ? "h-12 w-12" : "h-10 w-10";
    }
    return isMobile ? "h-14 w-14" : "h-12 w-12";
  };

  const getPlayButtonSize = () => {
    if (compact) {
      return isMobile ? "h-16 w-16" : "h-12 w-12";
    }
    return isMobile ? "h-20 w-20" : "h-16 w-16";
  };

  const iconSize = compact ? (isMobile ? 24 : 20) : isMobile ? 28 : 24;
  const playIconSize = compact ? (isMobile ? 32 : 24) : isMobile ? 40 : 32;

  // Get responsive classes
  const getResponsiveClasses = () => {
    if (screenSize === "small") {
      return "px-2 py-3 gap-2";
    }
    if (screenSize === "medium") {
      return "px-4 py-4 gap-3";
    }
    return "px-6 py-6 gap-4";
  };

  return (
    <TouchFeedback
      config={{
        ripple: {
          color: "rgba(59, 130, 246, 0.4)",
          size: isMobile ? 120 : 100,
          duration: 600,
        },
        enableGpuAcceleration: true,
        reduceMotion: accessibilityConfig.enableScreenReaderAnnouncements
          ? false
          : undefined,
      }}
      className={`w-full ${className}`}
      disabled={disabled}
    >
      <div
        ref={containerRef}
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-lg ${getResponsiveClasses()} accessibility-enhanced`}
        style={{ touchAction: "pan-y" }}
        role="application"
        aria-label="Audio player controls"
        aria-describedby="player-instructions"
        {...ariaProps}
      >
        {/* Progress bar with touch support */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatTime(currentTime)}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatTime(duration)}
            </span>
          </div>

          <TouchFeedback
            className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            onPress={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = x / rect.width;
              handleSeekChange(percentage * duration);
            }}
          >
            <div
              className="absolute left-0 top-0 h-full bg-blue-600 rounded-full transition-all duration-150"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-blue-600 rounded-full shadow-md transition-all duration-150"
              style={{
                left: `calc(${(currentTime / duration) * 100}% - 12px)`,
              }}
            />
          </TouchFeedback>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Skip back */}
          <TouchButton
            onClick={handleSkipBack}
            disabled={!onSkipBack || disabled}
            hapticPattern="light"
            className={`${getButtonSize()} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 accessibility-enhanced`}
            aria-label={`Skip back ${skipAmount} seconds`}
            role="button"
            tabIndex={0}
          >
            <SkipBack
              size={iconSize}
              className="text-gray-700 dark:text-gray-300"
              aria-hidden="true"
            />
          </TouchButton>

          {/* Play/Pause */}
          <TouchButton
            onClick={handlePlayPause}
            disabled={disabled}
            hapticPattern="medium"
            className={`${getPlayButtonSize()} bg-blue-600 hover:bg-blue-700 text-white shadow-lg accessibility-enhanced enhanced`}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            aria-pressed={isPlaying}
            role="button"
            tabIndex={0}
          >
            {isPlaying ? (
              <Pause size={playIconSize} aria-hidden="true" />
            ) : (
              <Play size={playIconSize} aria-hidden="true" />
            )}
          </TouchButton>

          {/* Skip forward */}
          <TouchButton
            onClick={handleSkipForward}
            disabled={!onSkipForward || disabled}
            hapticPattern="light"
            className={`${getButtonSize()} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 accessibility-enhanced`}
            aria-label={`Skip forward ${skipAmount} seconds`}
            role="button"
            tabIndex={0}
          >
            <SkipForward
              size={iconSize}
              className="text-gray-700 dark:text-gray-300"
              aria-hidden="true"
            />
          </TouchButton>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-between">
          {/* Volume control */}
          {showVolumeControl && (
            <div className="flex items-center gap-2">
              <TouchButton
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                hapticPattern="light"
                className="h-10 w-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {volume > 0 ? (
                  <Volume2
                    size={20}
                    className="text-gray-700 dark:text-gray-300"
                  />
                ) : (
                  <VolumeX
                    size={20}
                    className="text-gray-700 dark:text-gray-300"
                  />
                )}
              </TouchButton>

              {showVolumeSlider && (
                <div className="flex items-center gap-2 px-2">
                  <TouchSlider
                    value={volume}
                    min={0}
                    max={maxVolume}
                    onChange={handleVolumeChange}
                    disabled={disabled}
                    hapticPattern="selection"
                    className="w-24"
                  />
                </div>
              )}
            </div>
          )}

          {/* Playback rate control */}
          {showPlaybackRateControl && (
            <div className="flex items-center gap-2">
              <TouchButton
                onClick={() => setShowRateSlider(!showRateSlider)}
                hapticPattern="light"
                className="h-10 w-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Settings
                  size={20}
                  className="text-gray-700 dark:text-gray-300"
                />
              </TouchButton>

              {showRateSlider && (
                <div className="flex items-center gap-2 px-2">
                  <TouchButton
                    onClick={() => {
                      const currentIndex = playbackRates.indexOf(playbackRate);
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                      handlePlaybackRateChange(playbackRates[prevIndex]);
                    }}
                    disabled={playbackRate === playbackRates[0]}
                    hapticPattern="light"
                    className="h-8 w-8 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <ChevronDown
                      size={16}
                      className="text-gray-700 dark:text-gray-300"
                    />
                  </TouchButton>

                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3ch] text-center">
                    {playbackRate}x
                  </span>

                  <TouchButton
                    onClick={() => {
                      const currentIndex = playbackRates.indexOf(playbackRate);
                      const nextIndex =
                        currentIndex < playbackRates.length - 1
                          ? currentIndex + 1
                          : currentIndex;
                      handlePlaybackRateChange(playbackRates[nextIndex]);
                    }}
                    disabled={
                      playbackRate === playbackRates[playbackRates.length - 1]
                    }
                    hapticPattern="light"
                    className="h-8 w-8 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <ChevronUp
                      size={16}
                      className="text-gray-700 dark:text-gray-300"
                    />
                  </TouchButton>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accessibility instructions for screen readers */}
        {accessibilityConfig.enableScreenReaderAnnouncements && (
          <div id="player-instructions" className="sr-only">
            <h3>Audio Player Controls</h3>
            <p>
              Use Tab to navigate between controls. Use Space or Enter to
              activate buttons.
            </p>
            <p>
              Use Arrow keys to adjust the seek bar, volume, and playback speed.
            </p>
            <p>
              Alternative input methods are available for users with motor
              impairments.
            </p>
          </div>
        )}

        {/* Gesture hints for mobile */}
        {isMobile && !compact && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div>Swipe left/right: Skip</div>
              <div>Swipe up: Volume</div>
              <div>Double tap: Play/Pause</div>
              <div>Long press: Speed</div>
              <div>Pinch: Zoom</div>
              <div>Drag seek bar: Seek</div>
            </div>

            {/* Gesture alternatives for accessibility */}
            {accessibilityConfig.enableGestureAlternatives && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Gesture Alternatives Available
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div>Alternative buttons for all gestures</div>
                  <div>Voice commands enabled</div>
                  <div>Switch navigation supported</div>
                  <div>Keyboard shortcuts available</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TouchFeedback>
  );
};

/**
 * Compact touch controls for minimal interface
 */
export const CompactTouchControls: React.FC<
  Omit<TouchControlsProps, "compact">
> = (props) => {
  return <TouchControls {...props} compact className="p-2" />;
};

/**
 * Minimal touch controls for small screens
 */
export const MinimalTouchControls: React.FC<
  Omit<
    TouchControlsProps,
    "compact" | "showVolumeControl" | "showPlaybackRateControl"
  >
> = (props) => {
  return (
    <TouchControls
      {...props}
      compact
      showVolumeControl={false}
      showPlaybackRateControl={false}
      className="p-1"
    />
  );
};

export default TouchControls;
