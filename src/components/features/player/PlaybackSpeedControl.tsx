"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Gauge,
  Plus,
  Minus,
  RotateCcw,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/lib/mobile/haptic-feedback";

// Define speed preset types
interface SpeedPreset {
  label: string;
  value: number;
  icon?: React.ReactNode;
  description?: string;
  hotkey?: string;
}

interface SpeedPresetConfig {
  presets: SpeedPreset[];
  custom: SpeedPreset[];
  allowCustom: boolean;
  minSpeed: number;
  maxSpeed: number;
  step: number;
}

interface PlaybackSpeedControlProps {
  playbackRate: number[];
  onPlaybackRateChange: (value: number[]) => void;
  compact?: boolean;
  showPresets?: boolean;
  allowCustom?: boolean;
  showHotkeys?: boolean;
  enableHapticFeedback?: boolean;
  onSpeedChangeComplete?: (speed: number) => void;
  className?: string;
}

// Default speed presets
const DEFAULT_PRESETS: SpeedPreset[] = [
  { label: "0.5x", value: 0.5, description: "慢速播放", hotkey: "1" },
  { label: "0.75x", value: 0.75, description: "较慢播放", hotkey: "2" },
  { label: "1x", value: 1, description: "正常速度", hotkey: "3" },
  { label: "1.25x", value: 1.25, description: "较快播放", hotkey: "4" },
  { label: "1.5x", value: 1.5, description: "快速播放", hotkey: "5" },
  { label: "2x", value: 2, description: "两倍速", hotkey: "6" },
];

// Component for individual speed preset button
const SpeedPresetButton: React.FC<{
  preset: SpeedPreset;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
  showHotkey?: boolean;
  enableHaptic?: boolean;
}> = React.memo(
  ({ preset, isActive, onClick, compact, showHotkey, enableHaptic }) => {
    const { trigger } = useHapticFeedback();

    const handleClick = useCallback(() => {
      if (enableHaptic) {
        trigger("selection");
      }
      onClick();
    }, [onClick, enableHaptic, trigger]);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? "default" : "outline"}
              size={compact ? "sm" : "default"}
              onClick={handleClick}
              className={cn(
                "relative transition-all duration-200 transform hover:scale-105",
                isActive && "ring-2 ring-primary ring-offset-2",
                compact && "h-8 px-2 text-xs",
              )}
            >
              <span className="font-mono">{preset.label}</span>
              {showHotkey && preset.hotkey && (
                <kbd className="absolute -top-2 -right-2 h-4 w-4 rounded bg-primary/10 text-primary text-[10px] flex items-center justify-center">
                  {preset.hotkey}
                </kbd>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{preset.label}</div>
              {preset.description && (
                <div className="text-muted-foreground text-xs">
                  {preset.description}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

SpeedPresetButton.displayName = "SpeedPresetButton";

// Component for custom speed input
const CustomSpeedInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  compact?: boolean;
  enableHaptic?: boolean;
}> = React.memo(
  ({ value, onChange, min, max, step, compact, enableHaptic }) => {
    const [inputValue, setInputValue] = useState(value.toString());
    const [isValid, setIsValid] = useState(true);
    const { trigger } = useHapticFeedback();

    useEffect(() => {
      setInputValue(value.toString());
    }, [value]);

    const validateAndChange = useCallback(
      (newValue: string) => {
        setInputValue(newValue);

        const numValue = parseFloat(newValue);
        const valid =
          !Number.isNaN(numValue) && numValue >= min && numValue <= max;
        setIsValid(valid);

        if (valid && enableHaptic) {
          trigger("impact");
        }

        if (valid) {
          onChange(numValue);
        }
      },
      [onChange, min, max, enableHaptic, trigger],
    );

    const handleIncrement = useCallback(() => {
      const newValue = Math.min(max, value + step);
      validateAndChange(newValue.toString());
    }, [value, step, max, validateAndChange]);

    const handleDecrement = useCallback(() => {
      const newValue = Math.max(min, value - step);
      validateAndChange(newValue.toString());
    }, [value, step, min, validateAndChange]);

    return (
      <div
        className={cn("flex items-center space-x-2", compact && "space-x-1")}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecrement}
          disabled={value <= min}
          className={cn(compact && "h-6 w-6 p-0")}
        >
          <Minus className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
        </Button>

        <Input
          type="text"
          value={inputValue}
          onChange={(e) => validateAndChange(e.target.value)}
          onBlur={() => {
            if (!isValid) {
              setInputValue(value.toString());
              setIsValid(true);
            }
          }}
          className={cn(
            "w-16 text-center font-mono",
            !isValid && "border-red-500 focus:border-red-500",
            compact && "h-8 text-xs",
          )}
          placeholder={`${value}x`}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={handleIncrement}
          disabled={value >= max}
          className={cn(compact && "h-6 w-6 p-0")}
        >
          <Plus className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
        </Button>

        <span className={cn("text-muted-foreground", compact && "text-xs")}>
          x
        </span>
      </div>
    );
  },
);

CustomSpeedInput.displayName = "CustomSpeedInput";

// Visual feedback component for speed changes
const SpeedIndicator: React.FC<{
  currentSpeed: number;
  previousSpeed: number;
  isChanging: boolean;
}> = React.memo(({ currentSpeed, previousSpeed, isChanging }) => {
  const speedChange = currentSpeed - previousSpeed;
  const isIncreasing = speedChange > 0;

  return (
    <div
      className={cn(
        "absolute -top-8 left-1/2 transform -translate-x-1/2 transition-all duration-200",
        isChanging ? "opacity-100 scale-100" : "opacity-0 scale-95",
      )}
    >
      <Badge
        variant={isIncreasing ? "default" : "secondary"}
        className="flex items-center space-x-1 animate-pulse"
      >
        {isIncreasing ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
        <span className="font-mono text-xs">{currentSpeed}x</span>
        <Zap className="h-3 w-3" />
      </Badge>
    </div>
  );
});

SpeedIndicator.displayName = "SpeedIndicator";

// Main PlaybackSpeedControl component
const PlaybackSpeedControl: React.FC<PlaybackSpeedControlProps> = React.memo(
  ({
    playbackRate,
    onPlaybackRateChange,
    compact = false,
    showPresets = true,
    allowCustom = true,
    showHotkeys = false,
    enableHapticFeedback = false,
    onSpeedChangeComplete,
    className,
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [previousSpeed, setPreviousSpeed] = useState(playbackRate[0]);
    const [isChanging, setIsChanging] = useState(false);
    const [presets, setPresets] = useState<SpeedPreset[]>(DEFAULT_PRESETS);
    const [customPresets, setCustomPresets] = useState<SpeedPreset[]>([]);
    const changeTimeoutRef = useRef<NodeJS.Timeout>();
    const { trigger } = useHapticFeedback();

    const currentSpeed = playbackRate[0];
    const buttonSize = compact ? "h-6 w-6" : "h-8 w-8";
    const iconSize = compact ? "h-3 w-3" : "h-4 w-4";

    // Handle speed change with immediate feedback
    const handleSpeedChange = useCallback(
      (newSpeed: number) => {
        const isValidSpeed = newSpeed >= 0.25 && newSpeed <= 3;

        if (isValidSpeed) {
          setPreviousSpeed(currentSpeed);
          setIsChanging(true);

          // Clear existing timeout
          if (changeTimeoutRef.current) {
            clearTimeout(changeTimeoutRef.current);
          }

          // Provide immediate haptic feedback
          if (enableHapticFeedback) {
            trigger("playerAction", "speed");
          }

          // Apply speed change immediately
          onPlaybackRateChange([newSpeed]);

          // Set timeout to hide changing indicator
          changeTimeoutRef.current = setTimeout(() => {
            setIsChanging(false);
            onSpeedChangeComplete?.(newSpeed);
          }, 800);

          // Store speed in localStorage for persistence
          try {
            localStorage.setItem("playback-speed", newSpeed.toString());
          } catch (error) {
            console.warn("Failed to save playback speed preference:", error);
          }
        }
      },
      [
        currentSpeed,
        onPlaybackRateChange,
        enableHapticFeedback,
        trigger,
        onSpeedChangeComplete,
      ],
    );

    // Handle preset selection
    const handlePresetSelect = useCallback(
      (presetValue: number) => {
        handleSpeedChange(presetValue);
        setIsExpanded(false);
      },
      [handleSpeedChange],
    );

    // Handle keyboard shortcuts
    useEffect(() => {
      if (!showHotkeys) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        // Only handle number keys when not focused on input elements
        const target = event.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

        const key = event.key;
        const preset = presets.find((p) => p.hotkey === key);

        if (preset) {
          event.preventDefault();
          handlePresetSelect(preset.value);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [presets, showHotkeys, handlePresetSelect]);

    // Load saved speed preference on mount
    useEffect(() => {
      try {
        const savedSpeed = localStorage.getItem("playback-speed");
        if (savedSpeed) {
          const speed = parseFloat(savedSpeed);
          if (!Number.isNaN(speed) && speed >= 0.25 && speed <= 3) {
            onPlaybackRateChange([speed]);
          }
        }
      } catch (error) {
        console.warn("Failed to load playback speed preference:", error);
      }
    }, [onPlaybackRateChange]);

    // Memoized all presets
    const allPresets = useMemo(() => {
      const uniquePresets = new Map<string, SpeedPreset>();

      // Add default presets
      presets.forEach((preset) => {
        uniquePresets.set(preset.label, preset);
      });

      // Add custom presets (they should have unique labels)
      customPresets.forEach((preset) => {
        uniquePresets.set(preset.label, preset);
      });

      return Array.from(uniquePresets.values()).sort(
        (a, b) => a.value - b.value,
      );
    }, [presets, customPresets]);

    // Compact version - just a slider with icon
    if (compact && !isExpanded) {
      return (
        <div className={cn("flex items-center space-x-2 relative", className)}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={buttonSize}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <Gauge className={iconSize} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>播放速度: {currentSpeed}x</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Slider
            value={[currentSpeed]}
            max={2}
            min={0.25}
            step={0.25}
            onValueChange={(value) => handleSpeedChange(value[0])}
            className="w-20"
          />

          <span className="w-8 text-muted-foreground text-xs font-mono">
            {currentSpeed}x
          </span>

          <SpeedIndicator
            currentSpeed={currentSpeed}
            previousSpeed={previousSpeed}
            isChanging={isChanging}
          />
        </div>
      );
    }

    // Full version with presets and custom input
    return (
      <div className={cn("relative", className)}>
        <SpeedIndicator
          currentSpeed={currentSpeed}
          previousSpeed={previousSpeed}
          isChanging={isChanging}
        />

        <Popover open={isExpanded} onOpenChange={setIsExpanded}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size={compact ? "sm" : "default"}
              className={cn(
                "flex items-center space-x-2 transition-all duration-200 hover:scale-105",
                compact && "h-8 px-2",
              )}
            >
              <Gauge className={iconSize} />
              <span className="font-mono">{currentSpeed}x</span>
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform",
                  isExpanded && "rotate-90",
                )}
              />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-80 p-4"
            align={compact ? "end" : "center"}
            side={compact ? "top" : "bottom"}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">播放速度控制</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSpeedChange(1)}
                  className="h-6 px-2 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  重置
                </Button>
              </div>

              {/* Quick presets */}
              {showPresets && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    快速选择
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {allPresets.slice(0, 6).map((preset) => (
                      <SpeedPresetButton
                        key={preset.label}
                        preset={preset}
                        isActive={Math.abs(currentSpeed - preset.value) < 0.01}
                        onClick={() => handlePresetSelect(preset.value)}
                        compact={true}
                        showHotkey={showHotkeys}
                        enableHaptic={enableHapticFeedback}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom speed input */}
              {allowCustom && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    自定义速度
                  </label>
                  <div className="flex justify-center">
                    <CustomSpeedInput
                      value={currentSpeed}
                      onChange={handleSpeedChange}
                      min={0.25}
                      max={3}
                      step={0.05}
                      compact={true}
                      enableHaptic={enableHapticFeedback}
                    />
                  </div>
                </div>
              )}

              {/* Keyboard shortcuts hint */}
              {showHotkeys && (
                <div className="text-xs text-muted-foreground text-center">
                  使用数字键 1-6 快速切换预设速度
                </div>
              )}

              {/* Speed range indicator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    范围: 0.25x - 3x
                  </span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

PlaybackSpeedControl.displayName = "PlaybackSpeedControl";

export default PlaybackSpeedControl;
