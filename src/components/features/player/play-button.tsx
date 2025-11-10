"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils/utils";
import { useTheme } from "@/components/layout/contexts/ThemeContext";
import { useVisualFeedback } from "./visual-feedback";
import { MobileDetector } from "@/types/mobile";
import { performanceMonitor } from "@/lib/performance/performance-monitor";
import { hapticFeedback } from "@/lib/mobile/haptic-feedback";

// Button size variants
export type PlayButtonSize = "compact" | "normal" | "large" | "extra-large";
export type PlayButtonVariant = "minimal" | "standard" | "enhanced" | "icon-only";
export type PlayButtonState = "playing" | "paused" | "loading" | "error" | "disabled";

// Performance constraints
const RESPONSE_TIME_TARGET = 200; // milliseconds
const ANIMATION_DURATION_FAST = 150;
const ANIMATION_DURATION_NORMAL = 300;
const MIN_TOUCH_TARGET_SIZE = 44; // WCAG 2.1 compliant
const GPU_ACCELERATION_ENABLED = true;

// Props interface
export interface PlayButtonProps {
  /** Current playback state */
  isPlaying: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  hasError?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Button size variant */
  size?: PlayButtonSize;
  /** Button visual variant */
  variant?: PlayButtonVariant;
  /** Custom CSS classes */
  className?: string;
  /** Button label for accessibility */
  label?: string;
  /** On play/pause toggle callback */
  onToggle?: (isPlaying: boolean) => Promise<void> | void;
  /** Custom play handler */
  onPlay?: () => Promise<void> | void;
  /** Custom pause handler */
  onPause?: () => Promise<void> | void;
  /** Touch-optimized mode for mobile */
  touchOptimized?: boolean;
  /** Enable haptic feedback */
  enableHaptics?: boolean;
  /** Enable visual feedback */
  enableVisualFeedback?: boolean;
  /** Keyboard shortcut key */
  keyboardShortcut?: string;
  /** Custom aria-label */
  ariaLabel?: string;
  /** Additional data for analytics */
  analyticsData?: Record<string, any>;
}

// Ref interface for imperative methods
export interface PlayButtonRef {
  /** Trigger play/pause programmatically */
  toggle: () => void;
  /** Force play state */
  play: () => void;
  /** Force pause state */
  pause: () => void;
  /** Get current state */
  getState: () => PlayButtonState;
  /** Measure response time */
  measureResponseTime: () => number;
}

// Play Icon Component (optimized for performance)
const PlayIcon: React.FC<{
  size: number;
  className?: string;
  isDark: boolean;
}> = React.memo(({ size, className, isDark }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("transition-all duration-150", className)}
      style={{ willChange: "transform" }}
    >
      <path
        d="M8 5v14l11-7z"
        fill={isDark ? "#ffffff" : "#000000"}
        stroke="none"
      />
    </svg>
  );
});

PlayIcon.displayName = "PlayIcon";

// Pause Icon Component (optimized for performance)
const PauseIcon: React.FC<{
  size: number;
  className?: string;
  isDark: boolean;
}> = React.memo(({ size, className, isDark }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("transition-all duration-150", className)}
      style={{ willChange: "transform" }}
    >
      <rect x="6" y="4" width="4" height="16" fill={isDark ? "#ffffff" : "#000000"} />
      <rect x="14" y="4" width="4" height="16" fill={isDark ? "#ffffff" : "#000000"} />
    </svg>
  );
});

PauseIcon.displayName = "PauseIcon";

// Loading Spinner Component (optimized)
const LoadingSpinner: React.FC<{
  size: number;
  className?: string;
  isDark: boolean;
}> = React.memo(({ size, className, isDark }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("animate-spin", className)}
      style={{ willChange: "transform" }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M12 2a10 10 0 0 1 0 20"
        stroke={isDark ? "#ffffff" : "#000000"}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
});

LoadingSpinner.displayName = "LoadingSpinner";

// Error Icon Component
const ErrorIcon: React.FC<{
  size: number;
  className?: string;
  isDark: boolean;
}> = React.memo(({ size, className, isDark }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("transition-all duration-150", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={isDark ? "#ef4444" : "#dc2626"}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M15 9l-6 6M9 9l6 6"
        stroke={isDark ? "#ef4444" : "#dc2626"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});

ErrorIcon.displayName = "ErrorIcon";

// Button Animation Component for smooth transitions
const ButtonAnimation: React.FC<{
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  size: number;
  isDark: boolean;
  className?: string;
}> = React.memo(({ isPlaying, isLoading, hasError, size, isDark, className }) => {
  const animationRef = useRef<HTMLDivElement>(null);
  const [animationState, setAnimationState] = useState<"idle" | "playing" | "pausing" | "loading">("idle");

  // Track state changes for animations
  useEffect(() => {
    if (isLoading) {
      setAnimationState("loading");
    } else if (isPlaying) {
      setAnimationState("playing");
    } else {
      setAnimationState("pausing");
    }

    const timer = setTimeout(() => {
      setAnimationState("idle");
    }, ANIMATION_DURATION_NORMAL);

    return () => clearTimeout(timer);
  }, [isPlaying, isLoading]);

  // Apply GPU acceleration for smooth animations
  useEffect(() => {
    if (animationRef.current && GPU_ACCELERATION_ENABLED) {
      animationRef.current.style.transform = "translateZ(0)";
      animationRef.current.style.willChange = "transform";
    }
  }, []);

  const getAnimationClass = useCallback(() => {
    switch (animationState) {
      case "playing":
        return "animate-pulse-scale";
      case "pausing":
        return "animate-pause-scale";
      case "loading":
        return "animate-spin-slow";
      default:
        return "";
    }
  }, [animationState]);

  return (
    <div
      ref={animationRef}
      className={cn(
        "relative flex items-center justify-center transition-transform duration-150",
        getAnimationClass(),
        className,
      )}
    >
      {/* Pulsing ring effect for active state */}
      {isPlaying && !isLoading && !hasError && (
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 animate-pulse-ring",
            isDark ? "border-white/20" : "border-black/20",
          )}
          style={{
            width: `${size + 8}px`,
            height: `${size + 8}px`,
            animationDuration: "2s",
          }}
        />
      )}
    </div>
  );
});

ButtonAnimation.displayName = "ButtonAnimation";

// Touch Feedback Component for mobile interactions
const TouchFeedback: React.FC<{
  children: React.ReactNode;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  className?: string;
  disabled?: boolean;
}> = React.memo(({ children, onTouchStart, onTouchEnd, className, disabled }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsPressed(true);
    onTouchStart?.();
  }, [disabled, onTouchStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsPressed(false);
    onTouchEnd?.();
  }, [disabled, onTouchEnd]);

  const handleMouseDown = useCallback(() => {
    if (disabled) return;
    setIsPressed(true);
    onTouchStart?.();
  }, [disabled, onTouchStart]);

  const handleMouseUp = useCallback(() => {
    if (disabled) return;
    setIsPressed(false);
    onTouchEnd?.();
  }, [disabled, onTouchEnd]);

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        isPressed && "scale-95",
        "transition-transform duration-100",
        className,
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsPressed(false)}
    >
      {children}
      {/* Touch ripple effect */}
      {isPressed && (
        <div
          className="absolute inset-0 rounded-full bg-white/10 animate-ripple"
          style={{ animationDuration: "300ms" }}
        />
      )}
    </div>
  );
});

TouchFeedback.displayName = "TouchFeedback";

// Main PlayButton Component
export const PlayButton = forwardRef<PlayButtonRef, PlayButtonProps>(({
  isPlaying,
  isLoading = false,
  hasError = false,
  disabled = false,
  size = "normal",
  variant = "standard",
  className = "",
  label,
  onToggle,
  onPlay,
  onPause,
  touchOptimized = true,
  enableHaptics = true,
  enableVisualFeedback = true,
  keyboardShortcut = " ",
  ariaLabel,
  analyticsData = {},
}, ref) => {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "high-contrast";
  const { triggerFeedback } = useVisualFeedback();

  // Performance tracking
  const performanceRef = useRef<{ startTime: number; clickCount: number }>({
    startTime: 0,
    clickCount: 0,
  });

  // Mobile detection
  const deviceDetector = MobileDetector.getInstance();
  const isMobile = deviceDetector.isMobile();

  // Component refs
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Internal state
  const [internalState, setInternalState] = useState<PlayButtonState>(
    disabled ? "disabled" : hasError ? "error" : isLoading ? "loading" : isPlaying ? "playing" : "paused"
  );

  // Calculate button dimensions
  const dimensions = useMemo(() => {
    const sizes = {
      compact: { icon: 16, button: 32, touch: 44 },
      normal: { icon: 20, button: 44, touch: 48 },
      large: { icon: 24, button: 56, touch: 60 },
      "extra-large": { icon: 32, button: 72, touch: 80 },
    };
    return sizes[size];
  }, [size]);

  // Update internal state when props change
  useEffect(() => {
    let newState: PlayButtonState;
    if (disabled) {
      newState = "disabled";
    } else if (hasError) {
      newState = "error";
    } else if (isLoading) {
      newState = "loading";
    } else if (isPlaying) {
      newState = "playing";
    } else {
      newState = "paused";
    }

    if (newState !== internalState) {
      setInternalState(newState);
    }
  }, [disabled, hasError, isLoading, isPlaying, internalState]);

  // Handle play/pause toggle with performance monitoring
  const handleToggle = useCallback(async (event?: React.MouseEvent | React.KeyboardEvent) => {
    if (disabled || isLoading) return;

    const startTime = performance.now();

    try {
      // Prevent default to avoid any browser delays
      event?.preventDefault();

      // Visual feedback
      if (enableVisualFeedback && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        triggerFeedback(isPlaying ? "pause" : "play", { x, y, duration: ANIMATION_DURATION_FAST });
      }

      // Haptic feedback for mobile
      if (enableHaptics && isMobile) {
        hapticFeedback.trigger("medium");
      }

      // Performance monitoring
      performanceRef.current.startTime = startTime;
      performanceRef.current.clickCount++;

      // Execute callback
      if (onToggle) {
        await onToggle(!isPlaying);
      } else if (isPlaying && onPause) {
        await onPause();
      } else if (!isPlaying && onPlay) {
        await onPlay();
      }

      // Measure response time
      const responseTime = performance.now() - startTime;
      performanceMonitor.recordMetric(
        "play-button-response-time",
        responseTime,
        "ui" as any,
        {
          tags: {
            action: isPlaying ? "pause" : "play",
            size,
            variant,
          },
          unit: "ms"
        }
      );

      // Log warning if response time exceeds target
      if (responseTime > RESPONSE_TIME_TARGET) {
        console.warn(
          `PlayButton response time ${responseTime.toFixed(2)}ms exceeds target of ${RESPONSE_TIME_TARGET}ms`
        );
      }

    } catch (error) {
      console.error("PlayButton toggle failed:", error);

      // Error feedback
      if (enableVisualFeedback && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        triggerFeedback("error", { x, y, duration: 500 });
      }
    }
  }, [
    disabled,
    isLoading,
    isPlaying,
    enableVisualFeedback,
    enableHaptics,
    isMobile,
    onToggle,
    onPause,
    onPlay,
    size,
    variant,
    triggerFeedback,
  ]);

  // Keyboard event handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled || isLoading) return;

    if (event.key === keyboardShortcut || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle(event);
    }
  }, [disabled, isLoading, keyboardShortcut, handleToggle]);

  // Get button styles based on state and variant
  const getButtonStyles = useCallback(() => {
    const baseStyles = "inline-flex items-center justify-center rounded-full transition-all duration-150 focus:outline-none focus:ring-2";

    const variantStyles = {
      minimal: "border-0 shadow-none",
      standard: "border-2 shadow-md hover:shadow-lg",
      enhanced: "border-2 shadow-lg hover:shadow-xl backdrop-blur-sm",
      "icon-only": "border-0 shadow-none",
    };

    const stateStyles = {
      playing: isDark ? "bg-green-500/20 border-green-400 text-green-400 hover:bg-green-500/30" : "bg-green-100 border-green-500 text-green-600 hover:bg-green-200",
      paused: isDark ? "bg-blue-500/20 border-blue-400 text-blue-400 hover:bg-blue-500/30" : "bg-blue-100 border-blue-500 text-blue-600 hover:bg-blue-200",
      loading: isDark ? "bg-yellow-500/20 border-yellow-400 text-yellow-400" : "bg-yellow-100 border-yellow-500 text-yellow-600",
      error: isDark ? "bg-red-500/20 border-red-400 text-red-400" : "bg-red-100 border-red-500 text-red-600",
      disabled: isDark ? "bg-gray-800/50 border-gray-600 text-gray-500 cursor-not-allowed" : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed",
    };

    const sizeStyles = {
      compact: `w-${dimensions.button}px h-${dimensions.button}px`,
      normal: `w-${dimensions.button}px h-${dimensions.button}px`,
      large: `w-${dimensions.button}px h-${dimensions.button}px`,
      "extra-large": `w-${dimensions.button}px h-${dimensions.button}px`,
    };

    return cn(
      baseStyles,
      variantStyles[variant],
      stateStyles[internalState],
      sizeStyles[size],
      disabled && "cursor-not-allowed opacity-50",
      touchOptimized && isMobile && `min-w-[${dimensions.touch}px] min-h-[${dimensions.touch}px]`,
      "focus:ring-offset-2 focus:ring-offset-background",
      isDark ? "focus:ring-white/50" : "focus:ring-black/50"
    );
  }, [variant, internalState, size, dimensions, disabled, touchOptimized, isMobile, isDark]);

  // Render icon based on state
  const renderIcon = useCallback(() => {
    const iconSize = dimensions.icon;

    switch (internalState) {
      case "playing":
      case "paused":
        return internalState === "playing" ? (
          <PauseIcon size={iconSize} isDark={isDark} />
        ) : (
          <PlayIcon size={iconSize} isDark={isDark} />
        );

      case "loading":
        return <LoadingSpinner size={iconSize} isDark={isDark} />;

      case "error":
        return <ErrorIcon size={iconSize} isDark={isDark} />;

      case "disabled":
        return internalState === "playing" ? (
          <PauseIcon size={iconSize} isDark={isDark} className="opacity-50" />
        ) : (
          <PlayIcon size={iconSize} isDark={isDark} className="opacity-50" />
        );

      default:
        return <PlayIcon size={iconSize} isDark={isDark} />;
    }
  }, [internalState, dimensions.icon, isDark]);

  // Imperative methods
  useImperativeHandle(ref, () => ({
    toggle: () => handleToggle(),
    play: async () => {
      if (!isPlaying && onPlay) {
        await onPlay();
      }
    },
    pause: async () => {
      if (isPlaying && onPause) {
        await onPause();
      }
    },
    getState: () => internalState,
    measureResponseTime: () => {
      return performanceRef.current.startTime > 0
        ? performance.now() - performanceRef.current.startTime
        : 0;
    },
  }), [handleToggle, isPlaying, onPlay, onPause, internalState]);

  // Accessibility label
  const accessibilityLabel = useMemo(() => {
    if (ariaLabel) return ariaLabel;
    if (label) return label;
    if (isLoading) return "Loading audio";
    if (hasError) return "Audio error";
    if (disabled) return "Audio control disabled";
    return isPlaying ? "Pause audio" : "Play audio";
  }, [ariaLabel, label, isLoading, hasError, disabled, isPlaying]);

  // Analytics data
  const analyticsAttributes = useMemo(() => {
    return Object.entries(analyticsData).reduce((acc, [key, value]) => {
      acc[`data-analytics-${key}`] = String(value);
      return acc;
    }, {} as Record<string, string>);
  }, [analyticsData]);

  return (
    <TouchFeedback
      className={getButtonStyles()}
      disabled={disabled}
    >
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          "relative focus:outline-none",
          "min-w-[44px] min-h-[44px]", // WCAG 2.1 minimum touch target
          className
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={accessibilityLabel}
        aria-busy={isLoading}
        aria-invalid={hasError}
        role="button"
        tabIndex={disabled ? -1 : 0}
        {...analyticsAttributes}
      >
        <ButtonAnimation
          isPlaying={isPlaying}
          isLoading={isLoading}
          hasError={hasError}
          size={dimensions.button}
          isDark={isDark}
        >
          {renderIcon()}
        </ButtonAnimation>

        {/* Screen reader only status text */}
        <span className="sr-only">
          {accessibilityLabel}
        </span>
      </button>
    </TouchFeedback>
  );
});

PlayButton.displayName = "PlayButton";

export default PlayButton;
