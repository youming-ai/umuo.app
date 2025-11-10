/**
 * Enhanced Ripple Effect Component
 * Provides GPU-accelerated ripple animations with multiple patterns and accessibility support
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useHapticFeedback } from '../haptic-feedback';
import { TouchPoint } from './TouchFeedbackManager';

export interface RippleConfig {
  color?: string;
  size?: number;
  duration?: number;
  opacity?: number;
  pattern?: 'expand' | 'fade' | 'pulse' | 'wave' | 'ripple';
  multiRipple?: boolean;
  enableGpuAcceleration?: boolean;
  pressureSensitive?: boolean;
}

export interface RippleAnimationConfig {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

export interface RipplePosition extends TouchPoint {
  id: number;
  scale?: number;
}

export interface RippleEffectProps {
  config?: RippleConfig;
  position?: RipplePosition;
  onComplete?: (rippleId: number) => void;
  disabled?: boolean;
  reduceMotion?: boolean;
  className?: string;
}

/**
 * Predefined animation patterns
 */
const ANIMATION_PATTERNS: Record<string, (config: RippleConfig) => RippleAnimationConfig> = {
  expand: (config) => ({
    keyframes: [
      {
        width: '0px',
        height: '0px',
        opacity: config.opacity || 0.6,
        transform: 'translate(-50%, -50%) scale(0)',
      },
      {
        width: `${config.size || 100}px`,
        height: `${config.size || 100}px`,
        opacity: 0,
        transform: 'translate(-50%, -50%) scale(1)',
      },
    ],
    options: {
      duration: config.duration || 600,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'forwards',
    },
  }),

  fade: (config) => ({
    keyframes: [
      {
        width: `${config.size || 80}px`,
        height: `${config.size || 80}px`,
        opacity: config.opacity || 0.6,
      },
      {
        width: `${config.size || 80}px`,
        height: `${config.size || 80}px`,
        opacity: 0,
      },
    ],
    options: {
      duration: config.duration || 400,
      easing: 'ease-out',
      fill: 'forwards',
    },
  }),

  pulse: (config) => ({
    keyframes: [
      {
        width: '0px',
        height: '0px',
        opacity: config.opacity || 0.6,
        transform: 'translate(-50%, -50%) scale(0)',
      },
      {
        width: `${(config.size || 100) * 0.7}px`,
        height: `${(config.size || 100) * 0.7}px`,
        opacity: (config.opacity || 0.6) * 0.8,
        transform: 'translate(-50%, -50%) scale(0.7)',
      },
      {
        width: `${config.size || 100}px`,
        height: `${config.size || 100}px`,
        opacity: 0,
        transform: 'translate(-50%, -50%) scale(1)',
      },
    ],
    options: {
      duration: config.duration || 700,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'forwards',
    },
  }),

  wave: (config) => ({
    keyframes: [
      {
        width: '0px',
        height: '0px',
        opacity: config.opacity || 0.6,
        transform: 'translate(-50%, -50%) scale(0)',
      },
      {
        width: `${(config.size || 100) * 1.2}px`,
        height: `${(config.size || 100) * 1.2}px`,
        opacity: (config.opacity || 0.6) * 0.4,
        transform: 'translate(-50%, -50%) scale(1)',
      },
      {
        width: `${config.size || 100}px`,
        height: `${config.size || 100}px`,
        opacity: 0,
        transform: 'translate(-50%, -50%) scale(0.8)',
      },
    ],
    options: {
      duration: config.duration || 800,
      easing: 'ease-out',
      fill: 'forwards',
    },
  }),

  ripple: (config) => ({
    keyframes: [
      {
        width: '0px',
        height: '0px',
        opacity: 0,
        transform: 'translate(-50%, -50%) scale(0)',
        borderWidth: '2px',
      },
      {
        width: `${config.size || 60}px`,
        height: `${config.size || 60}px`,
        opacity: config.opacity || 0.6,
        transform: 'translate(-50%, -50%) scale(0.6)',
        borderWidth: '4px',
      },
      {
        width: `${config.size || 100}px`,
        height: `${config.size || 100}px`,
        opacity: 0,
        transform: 'translate(-50%, -50%) scale(1)',
        borderWidth: '1px',
      },
    ],
    options: {
      duration: config.duration || 600,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'forwards',
    },
  }),
};

/**
 * Individual Ripple component
 */
const Ripple: React.FC<RippleEffectProps> = ({
  config,
  position,
  onComplete,
  disabled = false,
  reduceMotion = false,
  className = '',
}) => {
  const rippleRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  const {
    color = 'rgba(255, 255, 255, 0.6)',
    size = 100,
    duration = 600,
    opacity = 0.6,
    pattern = 'expand',
    multiRipple = false,
    enableGpuAcceleration = true,
    pressureSensitive = false,
  } = config || {};

  // Skip rendering if disabled or no position
  if (disabled || !position || reduceMotion) {
    return null;
  }

  // Apply pressure scaling if supported
  const pressureScale = pressureSensitive && position.force
    ? 0.8 + (position.force * 0.4)
    : 1;

  const adjustedSize = size * (position.scale || 1) * pressureScale;

  const animationConfig = useMemo(() => {
    return ANIMATION_PATTERNS[pattern]({
      color,
      size: adjustedSize,
      duration,
      opacity,
      pattern,
      multiRipple,
      enableGpuAcceleration,
      pressureSensitive,
    });
  }, [pattern, color, adjustedSize, duration, opacity, multiRipple, enableGpuAcceleration, pressureSensitive]);

  useEffect(() => {
    const ripple = rippleRef.current;
    if (!ripple) return;

    // Apply initial styles
    const initialStyles: React.CSSProperties = {
      position: 'fixed',
      left: position.x,
      top: position.y,
      width: '0px',
      height: '0px',
      borderRadius: '50%',
      backgroundColor: color,
      opacity,
      pointerEvents: 'none',
      zIndex: 9999,
      transform: 'translate(-50%, -50%)',
      overflow: 'hidden',
    };

    if (enableGpuAcceleration) {
      initialStyles.willChange = 'transform, opacity';
      initialStyles.transform = 'translate(-50%, -50%) translateZ(0)';
    }

    Object.assign(ripple.style, initialStyles);

    // Start animation
    animationRef.current = ripple.animate(animationConfig.keyframes, animationConfig.options);

    // Handle animation completion
    animationRef.current.onfinish = () => {
      onComplete?.(position.id);
    };

    // Handle animation cancellation
    animationRef.current.oncancel = () => {
      onComplete?.(position.id);
    };

    return () => {
      if (animationRef.current) {
        animationRef.current.cancel();
      }
    };
  }, [position, animationConfig, color, opacity, enableGpuAcceleration, onComplete]);

  // Create multiple ripples if enabled
  if (multiRipple) {
    const ripplePositions: Array<{ delay: number; scale: number }> = [
      { delay: 0, scale: 1 },
      { delay: 100, scale: 0.8 },
      { delay: 200, scale: 0.6 },
    ];

    return (
      <>
        {ripplePositions.map(({ delay, scale }, index) => (
          <div
            key={`${position.id}-${index}`}
            ref={index === 0 ? rippleRef : undefined}
            className={`ripple-effect ${className}`}
            style={{
              animationDelay: `${delay}ms`,
              opacity: opacity * scale,
            }}
          />
        ))}
      </>
    );
  }

  return <div ref={rippleRef} className={`ripple-effect ${className}`} />;
};

/**
 * Hook for managing multiple ripples
 */
export const useRippleEffect = (config: RippleConfig = {}) => {
  const ripplesRef = useRef<Map<number, RipplePosition>>(new Map());
  const rippleIdRef = useRef(0);
  const { trigger: triggerHaptic } = useHapticFeedback();

  /**
   * Add a new ripple
   */
  const addRipple = useCallback((x: number, y: number, customConfig?: Partial<RippleConfig>) => {
    const rippleId = rippleIdRef.current++;
    const ripple: RipplePosition = {
      id: rippleId,
      x,
      y,
      timestamp: performance.now(),
    };

    ripplesRef.current.set(rippleId, ripple);

    // Trigger haptic feedback if enabled
    if (config !== false) {
      triggerHaptic('light');
    }

    return rippleId;
  }, [triggerHaptic, config]);

  /**
   * Add ripple with pressure sensitivity
   */
  const addPressureRipple = useCallback((
    x: number,
    y: number,
    force: number = 1,
    customConfig?: Partial<RippleConfig>
  ) => {
    const rippleId = rippleIdRef.current++;
    const ripple: RipplePosition = {
      id: rippleId,
      x,
      y,
      force,
      timestamp: performance.now(),
      scale: force > 0.5 ? 1.2 : 1,
    };

    ripplesRef.current.set(rippleId, ripple);

    // Trigger haptic feedback based on pressure
    if (force > 0.7) {
      triggerHaptic('medium');
    } else {
      triggerHaptic('light');
    }

    return rippleId;
  }, [triggerHaptic]);

  /**
   * Remove ripple by ID
   */
  const removeRipple = useCallback((rippleId: number) => {
    ripplesRef.current.delete(rippleId);
  }, []);

  /**
   * Clear all ripples
   */
  const clearRipples = useCallback(() => {
    ripplesRef.current.clear();
  }, []);

  /**
   * Get current ripples
   */
  const getRipples = useCallback(() => {
    return Array.from(ripplesRef.current.values());
  }, []);

  /**
   * Create action ripples for success/error states
   */
  const createActionRipple = useCallback((
    x: number,
    y: number,
    action: 'success' | 'error' | 'warning' | 'info',
    customConfig?: Partial<RippleConfig>
  ) => {
    const actionConfigs = {
      success: {
        color: 'rgba(34, 197, 94, 0.6)',
        pattern: 'pulse' as const,
        multiRipple: true,
      },
      error: {
        color: 'rgba(239, 68, 68, 0.6)',
        pattern: 'ripple' as const,
        multiRipple: true,
      },
      warning: {
        color: 'rgba(245, 158, 11, 0.6)',
        pattern: 'wave' as const,
        multiRipple: false,
      },
      info: {
        color: 'rgba(59, 130, 246, 0.6)',
        pattern: 'expand' as const,
        multiRipple: false,
      },
    };

    const finalConfig = { ...config, ...actionConfigs[action], ...customConfig };

    // Add primary ripple
    const primaryId = addRipple(x, y, finalConfig);

    // Add secondary ripples for emphasis if enabled
    if (finalConfig.multiRipple) {
      setTimeout(() => {
        addRipple(x + 10, y + 10, { ...finalConfig, size: (finalConfig.size || 100) * 0.7 });
      }, 100);

      setTimeout(() => {
        addRipple(x - 10, y - 10, { ...finalConfig, size: (finalConfig.size || 100) * 0.5 });
      }, 200);
    }

    // Trigger appropriate haptic feedback
    const hapticPatterns = {
      success: 'success' as const,
      error: 'error' as const,
      warning: 'warning' as const,
      info: 'light' as const,
    };

    triggerHaptic(hapticPatterns[action]);

    return primaryId;
  }, [addRipple, triggerHaptic, config]);

  return {
    ripples: getRipples(),
    addRipple,
    addPressureRipple,
    removeRipple,
    clearRipples,
    createActionRipple,
  };
};

/**
 * Ripple container component that manages multiple ripples
 */
export interface RippleContainerProps {
  children: React.ReactNode;
  config?: RippleConfig;
  disabled?: boolean;
  reduceMotion?: boolean;
  className?: string;
  onRippleStart?: (rippleId: number) => void;
  onRippleEnd?: (rippleId: number) => void;
}

export const RippleContainer: React.FC<RippleContainerProps> = ({
  children,
  config,
  disabled = false,
  reduceMotion = false,
  className = '',
  onRippleStart,
  onRippleEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    ripples,
    addRipple,
    addPressureRipple,
    removeRipple,
    createActionRipple,
    clearRipples
  } = useRippleEffect(config);

  /**
   * Handle touch/mouse events
   */
  const handleInteraction = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;

    const element = containerRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    let x: number, y: number;
    let force = 1;

    if ('touches' in event) {
      const touch = event.touches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
      force = (touch as any).force || 1;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    // Add ripple with pressure sensitivity if enabled
    const rippleId = config?.pressureSensitive
      ? addPressureRipple(x, y, force, config)
      : addRipple(x, y, config);

    onRippleStart?.(rippleId);
  }, [disabled, config, addRipple, addPressureRipple, onRippleStart]);

  /**
   * Handle ripple completion
   */
  const handleRippleComplete = useCallback((rippleId: number) => {
    removeRipple(rippleId);
    onRippleEnd?.(rippleId);
  }, [removeRipple, onRippleEnd]);

  /**
   * Expose ripple methods to parent components
   */
  React.useImperativeHandle(containerRef, () => ({
    addRipple,
    addPressureRipple,
    createActionRipple,
    clearRipples,
    ripples,
  }), [addRipple, addPressureRipple, createActionRipple, clearRipples, ripples]);

  return (
    <div
      ref={containerRef}
      className={`ripple-container relative overflow-hidden ${className}`}
      onTouchStart={handleInteraction}
      onMouseDown={handleInteraction}
    >
      {children}

      {/* Render active ripples */}
      {ripples.map((ripple) => (
        <Ripple
          key={ripple.id}
          config={config}
          position={ripple}
          onComplete={handleRippleComplete}
          disabled={disabled}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  );
};

/**
 * Enhanced ripple component with accessibility and performance optimizations
 */
export const EnhancedRippleEffect: React.FC<RippleEffectProps> = (props) => {
  const [isReducedMotion, setIsReducedMotion] = React.useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return <Ripple {...props} reduceMotion={isReducedMotion || props.reduceMotion} />;
};

export default {
  Ripple,
  RippleContainer,
  EnhancedRippleEffect,
  useRippleEffect,
  ANIMATION_PATTERNS,
};
