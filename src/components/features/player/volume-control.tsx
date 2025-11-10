"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Volume, Volume1, Volume2, VolumeX, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/utils";
import { useHapticFeedback } from "@/lib/mobile/haptic-feedback";
import {
  useGestureRecognizer,
  createPlayerGestureConfig,
} from "@/lib/mobile/gesture-recognizer";
import { PerformanceMonitor } from "@/lib/utils/performance-monitor";
import { MobileDetector } from "@/types/mobile";

// Volume preset options for quick access
export const VOLUME_PRESETS = [0, 0.25, 0.5, 0.75, 1] as const;
export const MAX_VOLUME_BOOST = 1.5; // 150% max volume

// Performance constants
const RESPONSE_TIME_TARGET = 150; // ms
const DEBOUNCE_DELAY = 16; // ~60fps
const HAPTIC_DEBOUNCE = 50; // ms

export interface VolumeControlProps {
  /** Current volume level (0-1, can go up to 1.5 with boost) */
  volume: number;
  /** Whether audio is currently muted */
  isMuted: boolean;
  /** Callback for volume changes */
  onVolumeChange: (volume: number) => void;
  /** Callback for mute toggle */
  onToggleMute: () => void;
  /** Compact mode for smaller screens */
  compact?: boolean;
  /** Enable volume boost beyond 100% */
  enableBoost?: boolean;
  /** Show volume presets */
  showPresets?: boolean;
  /** Enable keyboard shortcuts */
  enableKeyboard?: boolean;
  /** Enable touch gestures */
  enableGestures?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Accessibility labels */
  ariaLabel?: {
    volume?: string;
    mute?: string;
    unmute?: string;
    increase?: string;
    decrease?: string;
  };
}

interface VolumeIndicatorProps {
  volume: number;
  isMuted: boolean;
  isVisible: boolean;
  position: { x: number; y: number };
}

/**
 * Volume indicator component for visual feedback
 */
const VolumeIndicator: React.FC<VolumeIndicatorProps> = React.memo(
  ({ volume, isMuted, isVisible, position }) => {
    const percentage = Math.round(volume * 100);

    if (!isVisible) return null;

    return (
      <div
        className={cn(
          "fixed z-50 px-3 py-2 rounded-lg bg-popover/90 backdrop-blur-sm border border-border shadow-lg transition-all duration-150 pointer-events-none",
          "transform -translate-x-1/2 -translate-y-full mt-2",
        )}
        style={{
          left: position.x,
          top: position.y,
          opacity: isVisible ? 1 : 0,
        }}
        role="status"
        aria-live="polite"
        aria-label={`Volume: ${isMuted ? "Muted" : `${percentage}%`}`}
      >
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 h-3 rounded-full transition-colors duration-100",
                  i < Math.ceil((percentage / 100) * 5)
                    ? isMuted
                      ? "bg-muted"
                      : "bg-primary"
                    : "bg-muted/30",
                )}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-foreground">
            {isMuted ? "Muted" : `${percentage}%`}
          </span>
        </div>
      </div>
    );
  },
);

VolumeIndicator.displayName = "VolumeIndicator";

/**
 * Volume slider component with enhanced touch support
 */
interface VolumeSliderProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  maxVolume: number;
  compact: boolean;
  enableGestures: boolean;
}

const VolumeSlider: React.FC<VolumeSliderProps> = React.memo(
  ({ volume, isMuted, onVolumeChange, maxVolume, compact, enableGestures }) => {
    const sliderRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { trigger } = useHapticFeedback();

    // Handle slider change with performance monitoring
    const handleSliderChange = useCallback(
      (value: number[]) => {
        const start = performance.now();

        const newVolume = value[0];
        onVolumeChange(newVolume);

        // Haptic feedback for volume changes
        if (Math.abs(volume - newVolume) > 0.05) {
          trigger("selection");
        }

        // Performance monitoring
        const responseTime = performance.now() - start;
        PerformanceMonitor.getInstance().recordMetric(
          "volume_change_response_time",
          responseTime,
          "ms",
          { component: "VolumeSlider", isDragging },
        );

        // Warn if response time exceeds target
        if (responseTime > RESPONSE_TIME_TARGET) {
          console.warn(
            `Volume change took ${responseTime}ms (target: ${RESPONSE_TIME_TARGET}ms)`,
          );
        }
      },
      [volume, onVolumeChange, trigger],
    );

    // Handle direct slider interaction for better performance
    const handlePointerDown = useCallback(() => {
      setIsDragging(true);
      trigger("light");
    }, [trigger]);

    const handlePointerUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    // Gesture recognition for swipe gestures
    const { bind } = useGestureRecognizer(
      enableGestures ? createPlayerGestureConfig() : {},
      {
        onSwipe: (event) => {
          if (event.direction === "up") {
            onVolumeChange(Math.min(volume + 0.1, maxVolume));
            trigger("impact");
          } else if (event.direction === "down") {
            onVolumeChange(Math.max(volume - 0.1, 0));
            trigger("impact");
          }
        },
        onDrag: (event) => {
          // Convert vertical drag to volume change
          const deltaVolume = -event.data.deltaY / 200; // Adjust sensitivity
          onVolumeChange(
            Math.max(0, Math.min(volume + deltaVolume, maxVolume)),
          );
        },
      },
    );

    const sliderWidth = compact ? "w-20" : "w-24";

    return (
      <div
        ref={(node) => {
          sliderRef.current = node;
          if (enableGestures) {
            bind(node);
          }
        }}
        className={cn("relative", sliderWidth)}
      >
        <Slider
          value={[isMuted ? 0 : volume]}
          max={maxVolume}
          step={0.01}
          onValueChange={handleSliderChange}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className={cn(
            "cursor-pointer transition-all duration-150",
            isDragging && "scale-105",
          )}
          aria-label="Volume slider"
          aria-valuemin={0}
          aria-valuemax={maxVolume}
          aria-valuenow={isMuted ? 0 : volume}
          aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)}%`}
        />
      </div>
    );
  },
);

VolumeSlider.displayName = "VolumeSlider";

/**
 * Volume preset buttons component
 */
interface VolumePresetsProps {
  currentVolume: number;
  onVolumeChange: (volume: number) => void;
  compact: boolean;
}

const VolumePresets: React.FC<VolumePresetsProps> = React.memo(
  ({ currentVolume, onVolumeChange, compact }) => {
    const { trigger } = useHapticFeedback();

    const handlePresetClick = useCallback(
      (preset: number) => {
        onVolumeChange(preset);
        trigger("medium");
      },
      [onVolumeChange, trigger],
    );

    if (compact) return null;

    return (
      <div className="flex items-center space-x-1">
        {VOLUME_PRESETS.map((preset) => (
          <Button
            key={preset}
            variant={currentVolume === preset ? "default" : "ghost"}
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className="h-6 w-6 p-0 text-xs"
            aria-label={`Volume ${Math.round(preset * 100)}%`}
          >
            {preset === 0 ? "0" : `${preset * 100}%`}
          </Button>
        ))}
      </div>
    );
  },
);

VolumePresets.displayName = "VolumePresets";

/**
 * Main Volume Control Component with Enhanced Features
 */
const VolumeControl: React.FC<VolumeControlProps> = React.memo(
  ({
    volume,
    isMuted,
    onVolumeChange,
    onToggleMute,
    compact = false,
    enableBoost = false,
    showPresets = false,
    enableKeyboard = true,
    enableGestures = true,
    className = "",
    ariaLabel = {},
  }) => {
    const [showIndicator, setShowIndicator] = useState(false);
    const [indicatorPosition, setIndicatorPosition] = useState({ x: 0, y: 0 });
    const [isAdjusting, setIsAdjusting] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const lastHapticTime = useRef(0);

    const { trigger } = useHapticFeedback();
    const mobileDetector = MobileDetector.getInstance();
    const isMobile = mobileDetector.isMobile();

    const maxVolume = enableBoost ? MAX_VOLUME_BOOST : 1;

    // Volume icon based on level and state
    const VolumeIcon = useMemo(() => {
      if (isMuted || volume === 0) return VolumeX;
      if (volume < 0.25) return Volume;
      if (volume < 0.5) return Volume1;
      if (volume < 0.75) return Volume2;
      return Volume2;
    }, [isMuted, volume]);

    // Show volume indicator on interaction
    const showVolumeIndicator = useCallback(
      (clientX: number, clientY: number) => {
        setIndicatorPosition({ x: clientX, y: clientY });
        setShowIndicator(true);

        // Hide indicator after delay
        setTimeout(() => {
          setShowIndicator(false);
        }, 1500);
      },
      [],
    );

    // Enhanced volume change with haptic feedback and performance monitoring
    const handleVolumeChange = useCallback(
      (newVolume: number) => {
        const start = performance.now();

        const clampedVolume = Math.max(0, Math.min(newVolume, maxVolume));
        onVolumeChange(clampedVolume);

        // Haptic feedback with debouncing
        const now = Date.now();
        if (now - lastHapticTime.current > HAPTIC_DEBOUNCE) {
          trigger("selection");
          lastHapticTime.current = now;
        }

        // Performance monitoring
        const responseTime = performance.now() - start;
        PerformanceMonitor.getInstance().recordMetric(
          "volume_control_response_time",
          responseTime,
          "ms",
          {
            component: "VolumeControl",
            fromVolume: volume,
            toVolume: clampedVolume,
            isMobile,
          },
        );

        // Warn if performance target not met
        if (responseTime > RESPONSE_TIME_TARGET) {
          console.warn(
            `Volume control response time: ${responseTime}ms (target: ${RESPONSE_TIME_TARGET}ms)`,
          );
        }
      },
      [volume, maxVolume, onVolumeChange, trigger, isMobile],
    );

    // Enhanced mute toggle with auto-restore
    const handleMuteToggle = useCallback(() => {
      const start = performance.now();

      onToggleMute();
      trigger("medium");

      // Performance monitoring
      const responseTime = performance.now() - start;
      PerformanceMonitor.getInstance().recordMetric(
        "mute_toggle_response_time",
        responseTime,
        "ms",
        { component: "VolumeControl", isMobile },
      );
    }, [onToggleMute, trigger, isMobile]);

    // Volume adjustment with keyboard support
    const adjustVolume = useCallback(
      (delta: number) => {
        const newVolume = Math.max(0, Math.min(volume + delta, maxVolume));
        handleVolumeChange(newVolume);

        // Show indicator at button position
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          showVolumeIndicator(rect.left + rect.width / 2, rect.top);
        }
      },
      [volume, maxVolume, handleVolumeChange, showVolumeIndicator],
    );

    // Keyboard shortcuts
    useEffect(() => {
      if (!enableKeyboard) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        ) {
          return; // Don't interfere with typing
        }

        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            adjustVolume(0.05);
            trigger("light");
            break;
          case "ArrowDown":
            event.preventDefault();
            adjustVolume(-0.05);
            trigger("light");
            break;
          case "m":
          case "M":
            event.preventDefault();
            handleMuteToggle();
            break;
          case "0":
            event.preventDefault();
            handleVolumeChange(0);
            break;
          case "1":
            event.preventDefault();
            handleVolumeChange(0.1);
            break;
          case "2":
            event.preventDefault();
            handleVolumeChange(0.2);
            break;
          case "3":
            event.preventDefault();
            handleVolumeChange(0.3);
            break;
          case "4":
            event.preventDefault();
            handleVolumeChange(0.4);
            break;
          case "5":
            event.preventDefault();
            handleVolumeChange(0.5);
            break;
          case "6":
            event.preventDefault();
            handleVolumeChange(0.6);
            break;
          case "7":
            event.preventDefault();
            handleVolumeChange(0.7);
            break;
          case "8":
            event.preventDefault();
            handleVolumeChange(0.8);
            break;
          case "9":
            event.preventDefault();
            handleVolumeChange(0.9);
            break;
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [
      enableKeyboard,
      adjustVolume,
      handleMuteToggle,
      handleVolumeChange,
      trigger,
    ]);

    // Touch-optimized button sizes
    const buttonSize = isMobile
      ? "h-12 w-12"
      : compact
        ? "h-8 w-8"
        : "h-10 w-10";
    const iconSize = isMobile ? "h-6 w-6" : compact ? "h-4 w-4" : "h-5 w-5";

    // Volume percentage for display
    const volumePercentage = Math.round((isMuted ? 0 : volume) * 100);

    return (
      <>
        <div
          className={cn(
            "flex items-center space-x-2",
            compact && "space-x-1",
            className,
          )}
          role="group"
          aria-label="Volume controls"
        >
          {/* Main volume/mute button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  ref={buttonRef}
                  variant="ghost"
                  size="icon"
                  onClick={handleMuteToggle}
                  onMouseDown={() => setIsAdjusting(true)}
                  onMouseUp={() => setIsAdjusting(false)}
                  onMouseLeave={() => setIsAdjusting(false)}
                  onTouchStart={() => setIsAdjusting(true)}
                  onTouchEnd={() => setIsAdjusting(false)}
                  className={cn(
                    buttonSize,
                    "transition-all duration-150",
                    isAdjusting && "scale-95",
                    isMuted && "text-muted-foreground",
                  )}
                  aria-label={ariaLabel?.mute || (isMuted ? "Unmute" : "Mute")}
                >
                  <VolumeIcon className={iconSize} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isMuted ? "Unmute" : "Mute"} • {volumePercentage}%
                  {enableKeyboard && " (M)"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Volume slider */}
          <VolumeSlider
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            maxVolume={maxVolume}
            compact={compact}
            enableGestures={enableGestures && isMobile}
          />

          {/* Quick volume adjustment buttons (desktop only) */}
          {!compact && !isMobile && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => adjustVolume(-0.1)}
                      className="h-8 w-8"
                      aria-label={ariaLabel?.decrease || "Decrease volume"}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Decrease volume (↓)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => adjustVolume(0.1)}
                      className="h-8 w-8"
                      aria-label={ariaLabel?.increase || "Increase volume"}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Increase volume (↑)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          {/* Volume presets */}
          {showPresets && !isMobile && (
            <VolumePresets
              currentVolume={volume}
              onVolumeChange={handleVolumeChange}
              compact={compact}
            />
          )}
        </div>

        {/* Volume indicator overlay */}
        <VolumeIndicator
          volume={volume}
          isMuted={isMuted}
          isVisible={showIndicator}
          position={indicatorPosition}
        />
      </>
    );
  },
);

VolumeControl.displayName = "VolumeControl";

export default VolumeControl;
