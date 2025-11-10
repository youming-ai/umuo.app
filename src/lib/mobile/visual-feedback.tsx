/**
 * Visual feedback system for touch interactions
 * Provides ripple effects, touch animations, and visual indicators
 */

import React, { useRef, useEffect, useCallback } from "react";
import { useHapticFeedback } from "./haptic-feedback";

export interface RippleConfig {
  color?: string;
  size?: number;
  duration?: number;
  opacity?: number;
  expand?: boolean;
}

export interface TouchVisualConfig {
  scale?: number;
  duration?: number;
  easing?: string;
  glow?: boolean;
  glowColor?: string;
  shadow?: boolean;
}

export interface VisualFeedbackConfig {
  ripple?: RippleConfig;
  touch?: TouchVisualConfig;
  enableGpuAcceleration?: boolean;
  reduceMotion?: boolean;
}

export interface RipplePosition {
  x: number;
  y: number;
  id: number;
}

interface RippleProps {
  config?: RippleConfig;
  position?: RipplePosition;
  onComplete?: () => void;
}

/**
 * Ripple effect component for touch feedback
 */
export const Ripple: React.FC<RippleProps> = ({
  config,
  position,
  onComplete,
}) => {
  const {
    color = "rgba(255, 255, 255, 0.6)",
    size = 100,
    duration = 600,
    opacity = 0.6,
    expand = true,
  } = config || {};

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!position) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: 0,
          height: 0,
          backgroundColor: color,
          opacity,
          animation: expand
            ? `ripple-expand ${duration}ms ease-out`
            : `ripple-fade ${duration}ms ease-out`,
          willChange: "transform, opacity",
        }}
      />
      <style jsx>{`
        @keyframes ripple-expand {
          0% {
            width: 0;
            height: 0;
            opacity: ${opacity};
          }
          100% {
            width: ${size}px;
            height: ${size}px;
            opacity: 0;
          }
        }

        @keyframes ripple-fade {
          0% {
            opacity: ${opacity};
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Hook for managing visual feedback
 */
export const useVisualFeedback = (config: VisualFeedbackConfig = {}) => {
  const ripplesRef = useRef<RipplePosition[]>([]);
  const rippleIdRef = useRef(0);
  const { trigger: triggerHaptic } = useHapticFeedback();

  const {
    ripple: rippleConfig = {},
    touch: touchConfig = {},
    enableGpuAcceleration = true,
    reduceMotion = false,
  } = config;

  /**
   * Add ripple effect at specific position
   */
  const addRipple = useCallback(
    (x: number, y: number, customConfig?: Partial<RippleConfig>) => {
      const rippleId = rippleIdRef.current++;
      const ripple: RipplePosition = { x, y, id: rippleId };

      ripplesRef.current.push(ripple);

      // Trigger haptic feedback if enabled
      triggerHaptic("light");

      return rippleId;
    },
    [triggerHaptic],
  );

  /**
   * Remove ripple by ID
   */
  const removeRipple = useCallback((rippleId: number) => {
    ripplesRef.current = ripplesRef.current.filter((r) => r.id !== rippleId);
  }, []);

  /**
   * Clear all ripples
   */
  const clearRipples = useCallback(() => {
    ripplesRef.current = [];
  }, []);

  /**
   * Get current ripples
   */
  const getRipples = useCallback(() => {
    return ripplesRef.current;
  }, []);

  /**
   * Apply touch visual effects to element
   */
  const applyTouchEffects = useCallback(
    (element: HTMLElement) => {
      const {
        scale = 0.95,
        duration = 150,
        easing = "ease-out",
        glow = true,
        glowColor = "rgba(59, 130, 246, 0.5)",
        shadow = true,
      } = touchConfig;

      // Apply initial styles
      element.style.transition = `transform ${duration}ms ${easing}, box-shadow ${duration}ms ${easing}`;
      element.style.transformOrigin = "center";

      if (enableGpuAcceleration) {
        element.style.transform = "translateZ(0)";
        element.style.willChange = "transform";
      }

      // Apply active state
      const applyActiveState = () => {
        element.style.transform = `scale(${scale})`;

        if (glow) {
          element.style.boxShadow = `0 0 20px ${glowColor}`;
        } else if (shadow) {
          element.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        }
      };

      // Apply normal state
      const applyNormalState = () => {
        element.style.transform = "scale(1)";
        element.style.boxShadow = "";
      };

      return {
        applyActiveState,
        applyNormalState,
      };
    },
    [touchConfig, enableGpuAcceleration],
  );

  /**
   * Create touch event handlers with visual feedback
   */
  const createTouchHandlers = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return {};

      const touchEffects = applyTouchEffects(element);
      let touchStartTime = 0;

      const handleTouchStart = (event: TouchEvent) => {
        touchStartTime = performance.now();

        // Add ripple effect
        const touch = event.touches[0];
        const rect = element.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        addRipple(x, y);

        // Apply visual effects
        touchEffects.applyActiveState();

        // Haptic feedback
        triggerHaptic("light");
      };

      const handleTouchEnd = (event: TouchEvent) => {
        const duration = performance.now() - touchStartTime;

        // Apply normal state with delay for better feel
        setTimeout(
          () => {
            touchEffects.applyNormalState();
          },
          Math.min(duration / 2, 100),
        );

        // Different haptic feedback based on duration
        if (duration < 200) {
          triggerHaptic("light");
        } else if (duration < 500) {
          triggerHaptic("medium");
        }
      };

      const handleTouchCancel = () => {
        touchEffects.applyNormalState();
        clearRipples();
      };

      return {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchCancel,
      };
    },
    [addRipple, applyTouchEffects, triggerHaptic, clearRipples],
  );

  return {
    ripples: ripplesRef.current,
    addRipple,
    removeRipple,
    clearRipples,
    applyTouchEffects,
    createTouchHandlers,
  };
};

/**
 * Touch feedback wrapper component
 */
export interface TouchFeedbackProps {
  children: React.ReactNode;
  config?: VisualFeedbackConfig;
  className?: string;
  disabled?: boolean;
  onPress?: () => void;
  hapticPattern?: Parameters<typeof useHapticFeedback>[0]["trigger"][0];
}

export const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  config,
  className = "",
  disabled = false,
  onPress,
  hapticPattern = "light",
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { trigger: triggerHaptic } = useHapticFeedback();
  const visualFeedback = useVisualFeedback(config);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handlers = visualFeedback.createTouchHandlers(element);

    element.addEventListener("touchstart", handlers.onTouchStart);
    element.addEventListener("touchend", handlers.onTouchEnd);
    element.addEventListener("touchcancel", handlers.onTouchCancel);

    return () => {
      element.removeEventListener("touchstart", handlers.onTouchStart);
      element.removeEventListener("touchend", handlers.onTouchEnd);
      element.removeEventListener("touchcancel", handlers.onTouchCancel);
    };
  }, [visualFeedback]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      // Add ripple at mouse position
      const element = elementRef.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        visualFeedback.addRipple(x, y);
      }

      // Haptic feedback
      triggerHaptic(hapticPattern);

      // Call onPress handler
      onPress?.();
    },
    [disabled, hapticPattern, onPress, visualFeedback],
  );

  return (
    <div
      ref={elementRef}
      className={`relative overflow-hidden touch-manipulation ${className}`}
      onClick={handleClick}
      style={{ touchAction: "manipulation" }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      {children}
      {/* Render ripples */}
      {visualFeedback.ripples.map((ripple) => (
        <Ripple
          key={ripple.id}
          config={config?.ripple}
          position={ripple}
          onComplete={() => visualFeedback.removeRipple(ripple.id)}
        />
      ))}
    </div>
  );
};

/**
 * Touch-optimized button component with visual feedback
 */
export interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  hapticPattern?: Parameters<typeof useHapticFeedback>[0]["trigger"][0];
  className?: string;
  visualConfig?: VisualFeedbackConfig;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  hapticPattern = "medium",
  className = "",
  visualConfig,
}) => {
  const baseClasses = [
    "relative",
    "inline-flex",
    "items-center",
    "justify-center",
    "font-medium",
    "rounded-lg",
    "transition-all",
    "duration-150",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-offset-2",
    "touch-manipulation",
    "select-none",
    disabled && "opacity-50",
    disabled && "cursor-not-allowed",
    loading && "cursor-wait",
  ]
    .filter(Boolean)
    .join(" ");

  const sizeClasses = {
    sm: "min-h-[44px] min-w-[44px] px-3 py-2 text-sm",
    md: "min-h-[48px] min-w-[48px] px-4 py-3 text-base",
    lg: "min-h-[56px] min-w-[56px] px-6 py-4 text-lg",
  };

  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
  };

  return (
    <TouchFeedback
      config={visualConfig}
      onPress={onClick}
      disabled={disabled || loading}
      hapticPattern={hapticPattern}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
      ) : (
        children
      )}
    </TouchFeedback>
  );
};

/**
 * Touch-optimized slider component with visual feedback
 */
export interface TouchSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  hapticPattern?: Parameters<typeof useHapticFeedback>[0]["trigger"][0];
  className?: string;
  visualConfig?: VisualFeedbackConfig;
}

export const TouchSlider: React.FC<TouchSliderProps> = ({
  value,
  min,
  max,
  onChange,
  disabled = false,
  hapticPattern = "selection",
  className = "",
  visualConfig,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const { trigger: triggerHaptic } = useHapticFeedback();
  const visualFeedback = useVisualFeedback(visualConfig);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (event: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValue(event.clientX);
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValue(event.touches[0].clientX);
    triggerHaptic("light");
  };

  const updateValue = (clientX: number) => {
    const slider = sliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const percentage = Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100),
    );
    const newValue = min + (percentage / 100) * (max - min);

    onChange(newValue);

    // Add haptic feedback for significant changes
    if (Math.abs(newValue - value) > (max - min) * 0.05) {
      triggerHaptic(hapticPattern);
    }
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      updateValue(event.clientX);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging) return;
      updateValue(event.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, value, min, max, onChange, hapticPattern]);

  return (
    <div
      ref={sliderRef}
      className={`relative h-12 bg-gray-200 rounded-full cursor-pointer touch-manipulation ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
    >
      <div
        className="absolute left-0 top-0 h-full bg-blue-600 rounded-full transition-all duration-150"
        style={{ width: `${percentage}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-blue-600 rounded-full shadow-lg transition-all duration-150"
        style={{ left: `calc(${percentage}% - 16px)` }}
      />
    </div>
  );
};

export default {
  Ripple,
  TouchFeedback,
  TouchButton,
  TouchSlider,
  useVisualFeedback,
};
