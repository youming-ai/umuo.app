"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils/utils";
import { useHapticFeedback } from "@/lib/mobile/haptic-feedback";
import { useTheme } from "@/components/layout/contexts/ThemeContext";

// Types for visual feedback system
export type FeedbackType =
  | "play"
  | "pause"
  | "seek"
  | "volume"
  | "speed"
  | "skip"
  | "error"
  | "success"
  | "warning"
  | "loading"
  | "touch"
  | "ripple"
  | "particle";

export interface FeedbackAnimation {
  id: string;
  type: FeedbackType;
  x?: number;
  y?: number;
  value?: number;
  duration?: number;
  intensity?: number;
  timestamp: number;
  onComplete?: () => void;
}

export interface VisualFeedbackConfig {
  enabled: boolean;
  reducedMotion: boolean;
  animationDuration: {
    fast: number;
    normal: number;
    slow: number;
  };
  performance: {
    enableGpuAcceleration: boolean;
    maxConcurrentAnimations: number;
    throttleMs: number;
    batteryOptimization: boolean;
  };
  mobile: {
    touchOptimized: boolean;
    hapticIntegration: boolean;
    minTouchSize: number;
  };
  accessibility: {
    respectReducedMotion: boolean;
    highContrast: boolean;
    screenReaderAnnouncements: boolean;
  };
}

export interface ParticleConfig {
  count: number;
  size: { min: number; max: number };
  color: string;
  velocity: { min: number; max: number };
  lifetime: number;
  gravity: number;
}

export interface RippleConfig {
  size: number;
  color: string;
  opacity: number;
  duration: number;
  expand: boolean;
}

// Default configuration
const DEFAULT_CONFIG: VisualFeedbackConfig = {
  enabled: true,
  reducedMotion: false,
  animationDuration: {
    fast: 150,
    normal: 300,
    slow: 600,
  },
  performance: {
    enableGpuAcceleration: true,
    maxConcurrentAnimations: 10,
    throttleMs: 16, // ~60fps
    batteryOptimization: true,
  },
  mobile: {
    touchOptimized: true,
    hapticIntegration: true,
    minTouchSize: 44,
  },
  accessibility: {
    respectReducedMotion: true,
    highContrast: false,
    screenReaderAnnouncements: true,
  },
};

// Context for visual feedback
interface VisualFeedbackContextType {
  config: VisualFeedbackConfig;
  triggerFeedback: (type: FeedbackType, options?: Partial<FeedbackAnimation>) => void;
  triggerRipple: (x: number, y: number, config?: Partial<RippleConfig>) => void;
  triggerParticles: (x: number, y: number, config?: Partial<ParticleConfig>) => void;
  clearFeedback: () => void;
  updateConfig: (updates: Partial<VisualFeedbackConfig>) => void;
}

const VisualFeedbackContext = createContext<VisualFeedbackContextType | null>(null);

// Hook for using visual feedback
export const useVisualFeedback = () => {
  const context = useContext(VisualFeedbackContext);
  if (!context) {
    throw new Error("useVisualFeedback must be used within VisualFeedbackProvider");
  }
  return context;
};

// Particle component
const Particle: React.FC<{
  x: number;
  y: number;
  config: ParticleConfig;
  onComplete: () => void;
}> = ({ x, y, config, onComplete }) => {
  const particleRef = useRef<HTMLDivElement>(null);
  const [particle] = useState(() => ({
    id: Math.random().toString(36),
    vx: (Math.random() - 0.5) * (config.velocity.max - config.velocity.min) + config.velocity.min,
    vy: (Math.random() - 0.5) * (config.velocity.max - config.velocity.min) + config.velocity.min,
    size: Math.random() * (config.size.max - config.size.min) + config.size.min,
  }));

  useEffect(() => {
    const element = particleRef.current;
    if (!element) return;

    let animationId: number;
    let startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = elapsed / config.lifetime;

      if (progress >= 1) {
        onComplete();
        return;
      }

      const posX = particle.vx * elapsed;
      const posY = particle.vy * elapsed + (config.gravity * elapsed * elapsed) / 1000;
      const opacity = 1 - progress;

      element.style.transform = `translate(${posX}px, ${posY}px)`;
      element.style.opacity = opacity.toString();

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [config, onComplete, particle]);

  return (
    <div
      ref={particleRef}
      className="absolute pointer-events-none rounded-full"
      style={{
        left: x,
        top: y,
        width: `${particle.size}px`,
        height: `${particle.size}px`,
        backgroundColor: config.color,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
};

// Enhanced ripple component
const Ripple: React.FC<{
  x: number;
  y: number;
  config: RippleConfig;
  onComplete: () => void;
}> = ({ x, y, config, onComplete }) => {
  const rippleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = rippleRef.current;
    if (!element) return;

    let animationId: number;
    let startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / config.duration, 1);

      if (progress >= 1) {
        onComplete();
        return;
      }

      const scale = config.expand ? progress : 1;
      const opacity = config.opacity * (1 - progress);
      const size = config.size * scale;

      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.opacity = opacity.toString();

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [config, onComplete]);

  return (
    <div
      ref={rippleRef}
      className="absolute pointer-events-none rounded-full"
      style={{
        left: x,
        top: y,
        width: 0,
        height: 0,
        backgroundColor: config.color,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
};

// Feedback animation component
const FeedbackAnimation: React.FC<{
  animation: FeedbackAnimation;
  onComplete: () => void;
}> = ({ animation, onComplete }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "high-contrast";

  const getAnimationStyle = useCallback(() => {
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      pointerEvents: "none",
      zIndex: 1000,
      transform: "translate(-50%, -50%)",
    };

    switch (animation.type) {
      case "play":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "60px",
          height: "60px",
          border: `3px solid ${isDark ? "#10b981" : "#059669"}`,
          borderRadius: "50%",
          animation: "play-pulse 0.6s ease-out",
        };

      case "pause":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "60px",
          height: "60px",
          border: `3px solid ${isDark ? "#f59e0b" : "#d97706"}`,
          borderRadius: "8px",
          animation: "pause-pulse 0.6s ease-out",
        };

      case "error":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "80px",
          height: "80px",
          backgroundColor: isDark ? "#dc2626" : "#ef4444",
          borderRadius: "50%",
          animation: "error-shake 0.5s ease-out",
        };

      case "success":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "60px",
          height: "60px",
          backgroundColor: isDark ? "#10b981" : "#059669",
          borderRadius: "50%",
          animation: "success-bounce 0.6s ease-out",
        };

      case "volume":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "40px",
          height: `${40 + (animation.value || 0) * 60}px`,
          backgroundColor: isDark ? "#3b82f6" : "#2563eb",
          borderRadius: "20px",
          opacity: 0.7,
          animation: "volume-scale 0.3s ease-out",
        };

      case "speed":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          fontSize: "24px",
          fontWeight: "bold",
          color: isDark ? "#a855f7" : "#9333ea",
          animation: "speed-pop 0.4s ease-out",
        };

      case "seek":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "4px",
          height: "100px",
          backgroundColor: isDark ? "#06b6d4" : "#0891b2",
          borderRadius: "2px",
          animation: "seek-flash 0.3s ease-out",
        };

      default:
        return baseStyle;
    }
  }, [animation, isDark]);

  return (
    <>
      <div style={getAnimationStyle()} />
      {animation.type === "play" && (
        <div
          style={{
            position: "absolute",
            left: animation.x,
            top: animation.y,
            transform: "translate(-50%, -50%)",
            color: isDark ? "#10b981" : "#059669",
            fontSize: "24px",
            animation: "icon-fade 0.6s ease-out",
          }}
        >
          ▶
        </div>
      )}
      {animation.type === "pause" && (
        <div
          style={{
            position: "absolute",
            left: animation.x,
            top: animation.y,
            transform: "translate(-50%, -50%)",
            color: isDark ? "#f59e0b" : "#d97706",
            fontSize: "24px",
            animation: "icon-fade 0.6s ease-out",
          }}
        >
          ❚❚
        </div>
      )}
      {animation.type === "speed" && (
        <div
          style={{
            position: "absolute",
            left: animation.x,
            top: animation.y,
            transform: "translate(-50%, -50%)",
            color: isDark ? "#a855f7" : "#9333ea",
            fontSize: "20px",
            fontWeight: "bold",
            animation: "speed-text 0.4s ease-out",
          }}
        >
          {animation.value}x
        </div>
      )}

      <style jsx>{`
        @keyframes play-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        @keyframes pause-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        @keyframes error-shake {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(0deg);
            opacity: 1;
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translate(-50%, -50%) rotate(-5deg);
          }
          20%, 40%, 60%, 80% {
            transform: translate(-50%, -50%) rotate(5deg);
          }
        }

        @keyframes success-bounce {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
          }
          100% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
          }
        }

        @keyframes volume-scale {
          0% {
            transform: translate(-50%, -50%) scaleY(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scaleY(1);
            opacity: 0;
          }
        }

        @keyframes speed-pop {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        @keyframes seek-flash {
          0% {
            transform: translate(-50%, -50%) scaleY(0);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scaleY(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scaleY(0);
            opacity: 0;
          }
        }

        @keyframes icon-fade {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes speed-text {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(10px) scale(0.5);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(-5px) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(-15px) scale(1);
          }
        }
      `}</style>
    </>
  );
};

// Visual Feedback Provider
export const VisualFeedbackProvider: React.FC<{
  children: ReactNode;
  config?: Partial<VisualFeedbackConfig>;
  className?: string;
}> = ({ children, config: initialConfig = {}, className = "" }) => {
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "high-contrast";

  const [config, setConfig] = useState<VisualFeedbackConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  }));

  const animationsRef = useRef<Map<string, FeedbackAnimation>>(new Map());
  const ripplesRef = useRef<Map<string, { x: number; y: number; config: RippleConfig }>>(new Map());
  const particlesRef = useRef<Map<string, { x: number; y: number; config: ParticleConfig }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e: MediaQueryListEvent) => {
      setConfig(prev => ({
        ...prev,
        reducedMotion: e.matches,
      }));
    };

    // Set initial value
    setConfig(prev => ({
      ...prev,
      reducedMotion: mediaQuery.matches,
    }));

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<VisualFeedbackConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Trigger visual feedback
  const triggerFeedback = useCallback((
    type: FeedbackType,
    options: Partial<FeedbackAnimation> = {}
  ) => {
    if (!config.enabled || config.reducedMotion) return;

    const id = Math.random().toString(36);
    const animation: FeedbackAnimation = {
      id,
      type,
      timestamp: performance.now(),
      duration: options.duration || config.animationDuration.normal,
      intensity: options.intensity || 1,
      ...options,
    };

    // Check max concurrent animations
    if (animationsRef.current.size >= config.performance.maxConcurrentAnimations) {
      const oldestId = animationsRef.current.keys().next().value;
      animationsRef.current.delete(oldestId);
    }

    animationsRef.current.set(id, animation);

    // Trigger haptic feedback if enabled
    if (config.mobile.hapticIntegration) {
      const hapticPattern = getHapticPattern(type);
      triggerHaptic(hapticPattern);
    }

    // Auto-remove animation after duration
    setTimeout(() => {
      animationsRef.current.delete(id);
      animation.onComplete?.();
    }, animation.duration);
  }, [config, triggerHaptic]);

  // Trigger ripple effect
  const triggerRipple = useCallback((
    x: number,
    y: number,
    rippleConfig: Partial<RippleConfig> = {}
  ) => {
    if (!config.enabled || config.reducedMotion) return;

    const id = Math.random().toString(36);
    const config: RippleConfig = {
      size: 100,
      color: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.1)",
      opacity: 0.6,
      duration: 600,
      expand: true,
      ...rippleConfig,
    };

    ripplesRef.current.set(id, { x, y, config });

    // Auto-remove ripple
    setTimeout(() => {
      ripplesRef.current.delete(id);
    }, config.duration);
  }, [config, isDark]);

  // Trigger particle effect
  const triggerParticles = useCallback((
    x: number,
    y: number,
    particleConfig: Partial<ParticleConfig> = {}
  ) => {
    if (!config.enabled || config.reducedMotion) return;

    const config: ParticleConfig = {
      count: 8,
      size: { min: 2, max: 6 },
      color: isDark ? "#3b82f6" : "#2563eb",
      velocity: { min: 50, max: 150 },
      lifetime: 800,
      gravity: 100,
      ...particleConfig,
    };

    const id = Math.random().toString(36);
    particlesRef.current.set(id, { x, y, config });

    // Auto-remove particles
    setTimeout(() => {
      particlesRef.current.delete(id);
    }, config.lifetime);
  }, [config, isDark]);

  // Clear all feedback
  const clearFeedback = useCallback(() => {
    animationsRef.current.clear();
    ripplesRef.current.clear();
    particlesRef.current.clear();
  }, []);

  // Get haptic pattern for feedback type
  const getHapticPattern = useCallback((type: FeedbackType) => {
    switch (type) {
      case "play":
      case "pause":
        return "medium";
      case "seek":
      case "volume":
        return "light";
      case "speed":
        return "selection";
      case "skip":
        return "heavy";
      case "error":
        return "error";
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "touch":
      case "ripple":
        return "light";
      default:
        return "light";
    }
  }, []);

  // Performance optimization with requestAnimationFrame
  useEffect(() => {
    if (!config.performance.enableGpuAcceleration) return;

    const container = containerRef.current;
    if (!container) return;

    container.style.willChange = "transform";
    container.style.transform = "translateZ(0)";

    return () => {
      container.style.willChange = "";
      container.style.transform = "";
    };
  }, [config.performance.enableGpuAcceleration]);

  // Battery optimization
  useEffect(() => {
    if (!config.performance.batteryOptimization) return;

    const handleBatteryLevel = (level: number) => {
      if (level < 0.2) {
        updateConfig({
          performance: {
            ...config.performance,
            maxConcurrentAnimations: Math.floor(config.performance.maxConcurrentAnimations * 0.5),
            enableGpuAcceleration: false,
          },
        });
      }
    };

    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        handleBatteryLevel(battery.level);
        battery.addEventListener("levelchange", () => handleBatteryLevel(battery.level));
      });
    }
  }, [config.performance.batteryOptimization, config.performance, updateConfig]);

  const contextValue = useMemo(() => ({
    config,
    triggerFeedback,
    triggerRipple,
    triggerParticles,
    clearFeedback,
    updateConfig,
  }), [config, triggerFeedback, triggerRipple, triggerParticles, clearFeedback, updateConfig]);

  return (
    <VisualFeedbackContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn("relative", className)}>
        {children}

        {/* Render feedback animations */}
        {Array.from(animationsRef.current.values()).map(animation => (
          <FeedbackAnimation
            key={animation.id}
            animation={animation}
            onComplete={() => {
              animationsRef.current.delete(animation.id);
              animation.onComplete?.();
            }}
          />
        ))}

        {/* Render ripples */}
        {Array.from(ripplesRef.current.entries()).map(([id, { x, y, config }]) => (
          <Ripple
            key={id}
            x={x}
            y={y}
            config={config}
            onComplete={() => ripplesRef.current.delete(id)}
          />
        ))}

        {/* Render particles */}
        {Array.from(particlesRef.current.entries()).map(([id, { x, y, config }]) => (
          <React.Fragment key={id}>
            {Array.from({ length: config.count }).map((_, index) => (
              <Particle
                key={`${id}-${index}`}
                x={x}
                y={y}
                config={config}
                onComplete={() => {
                  // Remove particle set when last particle completes
                  if (index === config.count - 1) {
                    particlesRef.current.delete(id);
                  }
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </VisualFeedbackContext.Provider>
  );
};

// Individual feedback components
export const PlayFeedback: React.FC<{
  x: number;
  y: number;
  onComplete?: () => void;
}> = ({ x, y, onComplete }) => {
  const { triggerFeedback } = useVisualFeedback();

  useEffect(() => {
    triggerFeedback("play", { x, y, onComplete });
  }, [x, y, onComplete, triggerFeedback]);

  return null;
};

export const PauseFeedback: React.FC<{
  x: number;
  y: number;
  onComplete?: () => void;
}> = ({ x, y, onComplete }) => {
  const { triggerFeedback } = useVisualFeedback();

  useEffect(() => {
    triggerFeedback("pause", { x, y, onComplete });
  }, [x, y, onComplete, triggerFeedback]);

  return null;
};

export const VolumeFeedback: React.FC<{
  x: number;
  y: number;
  volume: number;
  onComplete?: () => void;
}> = ({ x, y, volume, onComplete }) => {
  const { triggerFeedback } = useVisualFeedback();

  useEffect(() => {
    triggerFeedback("volume", { x, y, value: volume, onComplete });
  }, [x, y, volume, onComplete, triggerFeedback]);

  return null;
};

export const SpeedFeedback: React.FC<{
  x: number;
  y: number;
  speed: number;
  onComplete?: () => void;
}> = ({ x, y, speed, onComplete }) => {
  const { triggerFeedback } = useVisualFeedback();

  useEffect(() => {
    triggerFeedback("speed", { x, y, value: speed, onComplete });
  }, [x, y, speed, onComplete, triggerFeedback]);

  return null;
};

export const SeekFeedback: React.FC<{
  x: number;
  y: number;
  onComplete?: () => void;
}> = ({ x, y, onComplete }) => {
  const { triggerFeedback } = useVisualFeedback();

  useEffect(() => {
    triggerFeedback("seek", { x, y, duration: 300, onComplete });
  }, [x, y, onComplete, triggerFeedback]);

  return null;
};

export const ErrorFeedback: React.FC<{
  x: number;
  y: number;
  onComplete?: () => void;
}> = ({ x, y, onComplete }) => {
  const { triggerFeedback, triggerParticles } = useVisualFeedback();

  useEffect(() => {
    triggerFeedback("error", { x, y, duration: 500, onComplete });
    triggerParticles(x, y, {
      count: 6,
      color: "#ef4444",
      velocity: { min: 100, max: 200 },
    });
  }, [x, y, onComplete, triggerFeedback, triggerParticles]);

  return null;
};

export const SuccessFeedback: React.FC<{
  x: number;
  y: number;
  onComplete?: () => void;
}> = ({ x, y, onComplete }) => {
  const { triggerFeedback, triggerParticles } = useVisualFeedback();

  useEffect(() => {
    triggerFeedback("success", { x, y, duration: 600, onComplete });
    triggerParticles(x, y, {
      count: 10,
      color: "#10b981",
      velocity: { min: 50, max: 150 },
    });
  }, [x, y, onComplete, triggerFeedback, triggerParticles]);

  return null;
};

// Touch interaction wrapper
export const TouchFeedback: React.FC<{
  children: ReactNode;
  onPress?: (event: React.MouseEvent | React.TouchEvent) => void;
  feedbackType?: FeedbackType;
  className?: string;
  disabled?: boolean;
}> = ({
  children,
  onPress,
  feedbackType = "touch",
  className = "",
  disabled = false
}) => {
  const { triggerRipple, triggerParticles } = useVisualFeedback();

  const handleInteraction = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;

    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();

    let x: number, y: number;

    if ("touches" in event) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    triggerRipple(x, y);

    if (feedbackType === "success") {
      triggerParticles(x, y, { count: 4, color: "#10b981" });
    } else if (feedbackType === "error") {
      triggerParticles(x, y, { count: 3, color: "#ef4444" });
    }

    onPress?.(event);
  }, [disabled, feedbackType, onPress, triggerRipple, triggerParticles]);

  return (
    <div
      className={cn("relative overflow-hidden cursor-pointer", className)}
      onMouseDown={handleInteraction}
      onTouchStart={handleInteraction}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
};

// Hook for creating feedback-enabled props
export const useFeedbackProps = (type: FeedbackType) => {
  const { triggerFeedback } = useVisualFeedback();

  return useCallback((event: React.MouseEvent | React.TouchEvent) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();

    let x: number, y: number;

    if ("touches" in event) {
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    } else {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }

    triggerFeedback(type, { x, y });
  }, [type, triggerFeedback]);
};

export default VisualFeedbackProvider;
