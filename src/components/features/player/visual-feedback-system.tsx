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
  ComponentType,
} from "react";
import { cn } from "@/lib/utils/utils";
import { useHapticFeedback } from "@/lib/mobile/haptic-feedback";
import { useTheme } from "@/components/layout/contexts/ThemeContext";

// Enhanced types for comprehensive visual feedback system
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
  | "particle"
  | "highlight"
  | "glow"
  | "pulse"
  | "bounce"
  | "shake"
  | "fade"
  | "slide"
  | "zoom"
  | "rotate";

export type InteractionType =
  | "click"
  | "touch"
  | "hover"
  | "focus"
  | "drag"
  | "swipe"
  | "pinch"
  | "longPress"
  | "doubleTap"
  | "keyboard";

export type AnimationEasing =
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "linear"
  | "spring"
  | "bounce"
  | "elastic"
  | "back"
  | "circ"
  | "quad"
  | "cubic"
  | "quart"
  | "quint"
  | "expo"
  | "sine";

export interface FeedbackAnimation {
  id: string;
  type: FeedbackType;
  interactionType?: InteractionType;
  x?: number;
  y?: number;
  value?: number;
  duration?: number;
  intensity?: number;
  delay?: number;
  easing?: AnimationEasing;
  iterations?: number;
  direction?: "normal" | "reverse" | "alternate" | "alternate-reverse";
  fillMode?: "none" | "forwards" | "backwards" | "both";
  timestamp: number;
  onComplete?: () => void;
  onStart?: () => void;
  customStyles?: React.CSSProperties;
  customClass?: string;
}

export interface VisualFeedbackConfig {
  enabled: boolean;
  reducedMotion: boolean;
  highPerformance: boolean;
  debugMode: boolean;
  animationDuration: {
    instant: number;    // 50ms
    fast: number;       // 150ms
    normal: number;     // 300ms
    slow: number;       // 600ms
    slower: number;     // 1000ms
  };
  performance: {
    enableGpuAcceleration: boolean;
    maxConcurrentAnimations: number;
    throttleMs: number;
    batteryOptimization: boolean;
    memoryOptimization: boolean;
    priorityAnimations: FeedbackType[];
  };
  mobile: {
    touchOptimized: boolean;
    hapticIntegration: boolean;
    minTouchSize: number;
    touchFeedbackDelay: number;
    swipeThreshold: number;
    pinchSensitivity: number;
  };
  accessibility: {
    respectReducedMotion: boolean;
    highContrast: boolean;
    screenReaderAnnouncements: boolean;
    colorBlindFriendly: boolean;
    focusVisible: boolean;
  };
  analytics: {
    trackInteractions: boolean;
    trackPerformance: boolean;
    trackErrors: boolean;
    batchSize: number;
  };
}

export interface ParticleConfig {
  count: number;
  size: { min: number; max: number };
  color: string;
  colors?: string[];
  velocity: { min: number; max: number };
  lifetime: number;
  gravity: number;
  spread: number;
  fadeOut: boolean;
  rotation: boolean;
  scale: { from: number; to: number };
  opacity: { from: number; to: number };
  shape: "circle" | "square" | "triangle" | "star" | "custom";
  customElement?: ComponentType<any>;
}

export interface RippleConfig {
  size: number;
  color: string;
  opacity: number;
  duration: number;
  expand: boolean;
  multiple: boolean;
  count?: number;
  spacing?: number;
  fadeOut: boolean;
  borderRadius: string;
}

export interface InteractionMetrics {
  type: InteractionType;
  timestamp: number;
  duration: number;
  target: string;
  feedbackType: FeedbackType;
  coordinates?: { x: number; y: number };
  performanceMetrics?: {
    fps: number;
    renderTime: number;
    memoryUsage: number;
  };
}

// Enhanced default configuration
const DEFAULT_CONFIG: VisualFeedbackConfig = {
  enabled: true,
  reducedMotion: false,
  highPerformance: true,
  debugMode: false,
  animationDuration: {
    instant: 50,
    fast: 150,
    normal: 300,
    slow: 600,
    slower: 1000,
  },
  performance: {
    enableGpuAcceleration: true,
    maxConcurrentAnimations: 15,
    throttleMs: 16, // ~60fps
    batteryOptimization: true,
    memoryOptimization: true,
    priorityAnimations: ["play", "pause", "error", "success"],
  },
  mobile: {
    touchOptimized: true,
    hapticIntegration: true,
    minTouchSize: 44,
    touchFeedbackDelay: 50,
    swipeThreshold: 30,
    pinchSensitivity: 0.1,
  },
  accessibility: {
    respectReducedMotion: true,
    highContrast: false,
    screenReaderAnnouncements: true,
    colorBlindFriendly: true,
    focusVisible: true,
  },
  analytics: {
    trackInteractions: false,
    trackPerformance: false,
    trackErrors: true,
    batchSize: 50,
  },
};

// Context for visual feedback
interface VisualFeedbackContextType {
  config: VisualFeedbackConfig;
  metrics: InteractionMetrics[];
  triggerFeedback: (type: FeedbackType, options?: Partial<FeedbackAnimation>) => void;
  triggerRipple: (x: number, y: number, config?: Partial<RippleConfig>) => void;
  triggerParticles: (x: number, y: number, config?: Partial<ParticleConfig>) => void;
  triggerComplexAnimation: (type: FeedbackType, config: {
    x: number;
    y: number;
    intensity?: number;
    duration?: number;
    customProperties?: Record<string, any>;
  }) => void;
  clearFeedback: () => void;
  updateConfig: (updates: Partial<VisualFeedbackConfig>) => void;
  getMetrics: () => InteractionMetrics[];
  resetMetrics: () => void;
  performanceMonitor: () => {
    fps: number;
    memoryUsage: number;
    activeAnimations: number;
    isOptimized: boolean;
  };
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

// Enhanced particle component with performance optimizations
const Particle: React.FC<{
  x: number;
  y: number;
  config: ParticleConfig;
  onComplete: () => void;
  debugMode?: boolean;
}> = ({ x, y, config, onComplete, debugMode = false }) => {
  const particleRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const [particle] = useState(() => {
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * (config.velocity.max - config.velocity.min) + config.velocity.min;
    const size = Math.random() * (config.size.max - config.size.min) + config.size.min;
    const color = config.colors ? config.colors[Math.floor(Math.random() * config.colors.length)] : config.color;

    return {
      id: Math.random().toString(36),
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size,
      color,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    };
  });

  useEffect(() => {
    const element = particleRef.current;
    if (!element) return;

    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - (startTimeRef.current || currentTime);
      const progress = Math.min(elapsed / config.lifetime, 1);

      if (progress >= 1) {
        onComplete();
        return;
      }

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const posX = particle.vx * elapsed;
      const posY = particle.vy * elapsed + (config.gravity * elapsed * elapsed) / 1000;
      const scale = config.scale.from + (config.scale.to - config.scale.from) * easeOut;
      const opacity = config.opacity.from + (config.opacity.to - config.opacity.from) * progress;
      const rotation = particle.rotation + particle.rotationSpeed * progress;

      // Apply transforms with GPU acceleration
      element.style.transform = `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`;
      element.style.opacity = opacity.toString();

      if (debugMode) {
        element.setAttribute('data-debug-fps', Math.round(1000 / (elapsed || 1)).toString());
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [config, onComplete, particle, debugMode]);

  const renderParticleShape = () => {
    const baseStyle = {
      position: "absolute" as const,
      width: `${particle.size}px`,
      height: `${particle.size}px`,
      backgroundColor: particle.color,
      borderRadius: config.shape === "circle" ? "50%" : config.shape === "square" ? "0" : "2px",
      transform: "translate(-50%, -50%)",
    };

    switch (config.shape) {
      case "triangle":
        return (
          <div
            style={{
              ...baseStyle,
              width: 0,
              height: 0,
              borderLeft: `${particle.size/2}px solid transparent`,
              borderRight: `${particle.size/2}px solid transparent`,
              borderBottom: `${particle.size}px solid ${particle.color}`,
              backgroundColor: "transparent",
            }}
          />
        );
      case "star":
        return (
          <div
            style={{
              ...baseStyle,
              fontSize: `${particle.size}px`,
              lineHeight: 1,
              color: particle.color,
              backgroundColor: "transparent",
            }}
          >
            ★
          </div>
        );
      case "custom":
        return config.customElement ? <config.customElement particle={particle} /> : null;
      default:
        return <div style={baseStyle} />;
    }
  };

  return (
    <div
      ref={particleRef}
      className={cn("absolute pointer-events-none", debugMode && "border border-red-500/50")}
      style={{
        left: x,
        top: y,
        willChange: "transform, opacity",
      }}
      {...(debugMode && { 'data-particle-id': particle.id })}
    >
      {renderParticleShape()}
    </div>
  );
};

// Enhanced ripple component with multiple ripple support
const Ripple: React.FC<{
  x: number;
  y: number;
  config: RippleConfig;
  onComplete: () => void;
  index?: number;
  debugMode?: boolean;
}> = ({ x, y, config, onComplete, index = 0, debugMode = false }) => {
  const rippleRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    const element = rippleRef.current;
    if (!element) return;

    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - (startTimeRef.current || currentTime);
      const progress = Math.min(elapsed / config.duration, 1);

      if (progress >= 1) {
        onComplete();
        return;
      }

      const scale = config.expand ? progress : 1;
      const opacity = config.fadeOut ? config.opacity * (1 - progress) : config.opacity;
      const size = config.size * scale;

      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.opacity = opacity.toString();

      if (debugMode) {
        element.setAttribute('data-progress', progress.toFixed(2));
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [config, onComplete, debugMode]);

  const delay = config.multiple && config.spacing ? index * config.spacing : 0;

  return (
    <div
      ref={rippleRef}
      className={cn("absolute pointer-events-none", debugMode && "border border-blue-500/50")}
      style={{
        left: x,
        top: y,
        width: 0,
        height: 0,
        backgroundColor: config.color,
        borderRadius: config.borderRadius,
        transform: "translate(-50%, -50%)",
        willChange: "transform, opacity, width, height",
        transition: "none", // Use requestAnimationFrame for better performance
        ...(delay > 0 && { animationDelay: `${delay}ms` }),
      }}
      {...(debugMode && { 'data-ripple-index': index, 'data-delay': delay })}
    />
  );
};

// Comprehensive feedback animation component
const FeedbackAnimation: React.FC<{
  animation: FeedbackAnimation;
  onComplete: () => void;
  debugMode?: boolean;
}> = ({ animation, onComplete, debugMode = false }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "high-contrast";
  const animationRef = useRef<HTMLDivElement>(null);

  const getAnimationStyle = useCallback(() => {
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      pointerEvents: "none",
      zIndex: 1000,
      transform: "translate(-50%, -50%)",
      willChange: "transform, opacity",
      ...animation.customStyles,
    };

    const duration = animation.duration || 300;
    const easing = animation.easing || "ease-out";
    const iterations = animation.iterations || 1;
    const direction = animation.direction || "normal";
    const fillMode = animation.fillMode || "both";

    const themeColors = {
      play: isDark ? "#10b981" : "#059669",
      pause: isDark ? "#f59e0b" : "#d97706",
      error: isDark ? "#dc2626" : "#ef4444",
      success: isDark ? "#10b981" : "#059669",
      warning: isDark ? "#f59e0b" : "#d97706",
      volume: isDark ? "#3b82f6" : "#2563eb",
      speed: isDark ? "#a855f7" : "#9333ea",
      seek: isDark ? "#06b6d4" : "#0891b2",
    };

    switch (animation.type) {
      case "play":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "60px",
          height: "60px",
          border: `3px solid ${themeColors.play}`,
          borderRadius: "50%",
          animation: `play-pulse ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      case "pause":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "60px",
          height: "60px",
          border: `3px solid ${themeColors.pause}`,
          borderRadius: "8px",
          animation: `pause-pulse ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      case "error":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "80px",
          height: "80px",
          backgroundColor: themeColors.error,
          borderRadius: "50%",
          animation: `error-shake ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      case "success":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "60px",
          height: "60px",
          backgroundColor: themeColors.success,
          borderRadius: "50%",
          animation: `success-bounce ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      case "volume":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "40px",
          height: `${40 + (animation.value || 0) * 60}px`,
          backgroundColor: themeColors.volume,
          borderRadius: "20px",
          opacity: 0.7,
          animation: `volume-scale ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      case "speed":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          fontSize: "24px",
          fontWeight: "bold",
          color: themeColors.speed,
          animation: `speed-pop ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      case "seek":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "4px",
          height: "100px",
          backgroundColor: themeColors.seek,
          borderRadius: "2px",
          animation: `seek-flash ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      case "highlight":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "100px",
          height: "100px",
          border: `2px solid ${themeColors.success}`,
          borderRadius: "8px",
          animation: `highlight-glow ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      case "glow":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "120px",
          height: "120px",
          background: `radial-gradient(circle, ${themeColors.play}40 0%, transparent 70%)`,
          borderRadius: "50%",
          animation: `glow-pulse ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      case "shake":
        return {
          ...baseStyle,
          left: animation.x,
          top: animation.y,
          width: "60px",
          height: "60px",
          backgroundColor: themeColors.error,
          borderRadius: "8px",
          animation: `shake-animation ${duration}ms ${easing} ${iterations} ${direction} ${fillMode}`,
        };

      default:
        return baseStyle;
    }
  }, [animation, isDark]);

  useEffect(() => {
    animation.onStart?.();
  }, [animation.onStart]);

  return (
    <>
      <div
        ref={animationRef}
        className={cn(
          animation.customClass,
          debugMode && "border border-yellow-500/50"
        )}
        style={getAnimationStyle()}
        {...(debugMode && {
          'data-animation-type': animation.type,
          'data-animation-id': animation.id,
          'data-timestamp': animation.timestamp,
        })}
      />

      {/* Icon overlays for specific animations */}
      {animation.type === "play" && (
        <div
          style={{
            position: "absolute",
            left: animation.x,
            top: animation.y,
            transform: "translate(-50%, -50%)",
            color: isDark ? "#10b981" : "#059669",
            fontSize: "24px",
            animation: `icon-fade ${animation.duration || 600}ms ease-out`,
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
            animation: `icon-fade ${animation.duration || 600}ms ease-out`,
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
            animation: `speed-text ${animation.duration || 400}ms ease-out`,
          }}
        >
          {animation.value}x
        </div>
      )}

      {/* Animation styles */}
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

        @keyframes highlight-glow {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
            box-shadow: 0 0 20px 10px rgba(16, 185, 129, 0.2);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        @keyframes glow-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes shake-animation {
          0%, 100% {
            transform: translate(-50%, -50%) translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translate(-50%, -50%) translateX(-5px);
          }
          20%, 40%, 60%, 80% {
            transform: translate(-50%, -50%) translateX(5px);
          }
        }
      `}</style>
    </>
  );
};

// Performance monitoring hook
const usePerformanceMonitor = (config: VisualFeedbackConfig) => {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(60);

  useEffect(() => {
    if (!config.performance.memoryOptimization || !config.analytics.trackPerformance) return;

    const measurePerformance = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;

      if (elapsed >= 1000) {
        fpsRef.current = Math.round((frameCountRef.current * 1000) / elapsed);
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;

        if (config.debugMode) {
          console.log(`[VisualFeedback] FPS: ${fpsRef.current}`);
        }
      }

      requestAnimationFrame(measurePerformance);
    };

    const animationId = requestAnimationFrame(measurePerformance);
    return () => cancelAnimationFrame(animationId);
  }, [config]);

  const getCurrentPerformance = useCallback(() => {
    const memoryUsage = (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
    } : null;

    return {
      fps: fpsRef.current,
      memoryUsage: memoryUsage?.used || 0,
      isOptimized: fpsRef.current >= 55, // Consider 55+ FPS as optimized
    };
  }, []);

  return { getCurrentPerformance };
};

// Enhanced Visual Feedback Provider
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

  const [metrics, setMetrics] = useState<InteractionMetrics[]>([]);

  const animationsRef = useRef<Map<string, FeedbackAnimation>>(new Map());
  const ripplesRef = useRef<Map<string, { x: number; y: number; config: RippleConfig }>>(new Map());
  const particlesRef = useRef<Map<string, { x: number; y: number; config: ParticleConfig }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const { getCurrentPerformance } = usePerformanceMonitor(config);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e: MediaQueryListEvent) => {
      if (config.accessibility.respectReducedMotion) {
        setConfig(prev => ({
          ...prev,
          reducedMotion: e.matches,
        }));
      }
    };

    // Set initial value
    if (config.accessibility.respectReducedMotion) {
      setConfig(prev => ({
        ...prev,
        reducedMotion: mediaQuery.matches,
      }));
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [config.accessibility.respectReducedMotion]);

  // Detect high contrast mode
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-contrast: high)");

    const handleChange = (e: MediaQueryListEvent) => {
      setConfig(prev => ({
        ...prev,
        accessibility: {
          ...prev.accessibility,
          highContrast: e.matches,
        },
      }));
    };

    // Set initial value
    setConfig(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        highContrast: mediaQuery.matches,
      },
    }));

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<VisualFeedbackConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Record interaction metrics
  const recordMetrics = useCallback((
    type: InteractionType,
    feedbackType: FeedbackType,
    target: string,
    coordinates?: { x: number; y: number },
    performanceMetrics?: InteractionMetrics['performanceMetrics']
  ) => {
    if (!config.analytics.trackInteractions) return;

    const metric: InteractionMetrics = {
      type,
      timestamp: performance.now(),
      duration: 0, // Will be calculated on completion
      target,
      feedbackType,
      coordinates,
      performanceMetrics,
    };

    setMetrics(prev => {
      const updated = [...prev, metric];
      // Keep only recent metrics to prevent memory bloat
      if (updated.length > 1000) {
        return updated.slice(-1000);
      }
      return updated;
    });
  }, [config.analytics.trackInteractions]);

  // Trigger visual feedback
  const triggerFeedback = useCallback((
    type: FeedbackType,
    options: Partial<FeedbackAnimation> = {}
  ) => {
    if (!config.enabled || config.reducedMotion) return;

    const startTime = performance.now();
    const id = Math.random().toString(36);
    const animation: FeedbackAnimation = {
      id,
      type,
      timestamp: startTime,
      duration: options.duration || config.animationDuration.normal,
      intensity: options.intensity || 1,
      easing: options.easing || "ease-out",
      ...options,
    };

    // Check if this is a priority animation
    const isPriority = config.performance.priorityAnimations.includes(type);

    // Manage concurrent animations
    if (!isPriority && animationsRef.current.size >= config.performance.maxConcurrentAnimations) {
      // Remove oldest non-priority animation
      const oldestNonPriority = Array.from(animationsRef.current.entries())
        .find(([_, anim]) => !config.performance.priorityAnimations.includes(anim.type));

      if (oldestNonPriority) {
        animationsRef.current.delete(oldestNonPriority[0]);
      }
    }

    animationsRef.current.set(id, animation);

    // Record metrics
    recordMetrics(
      options.interactionType || "click",
      type,
      options.customClass || "unknown",
      options.x && options.y ? { x: options.x, y: options.y } : undefined
    );

    // Trigger haptic feedback if enabled
    if (config.mobile.hapticIntegration) {
      const hapticPattern = getHapticPattern(type);
      setTimeout(() => {
        triggerHaptic(hapticPattern);
      }, config.mobile.touchFeedbackDelay);
    }

    // Auto-remove animation after duration
    setTimeout(() => {
      animationsRef.current.delete(id);

      // Update metrics with completion time
      setMetrics(prev => prev.map(metric =>
        metric.timestamp === startTime
          ? { ...metric, duration: performance.now() - startTime }
          : metric
      ));

      animation.onComplete?.();
    }, animation.duration);
  }, [config, recordMetrics, triggerHaptic]);

  // Trigger ripple effect
  const triggerRipple = useCallback((
    x: number,
    y: number,
    rippleConfig: Partial<RippleConfig> = {}
  ) => {
    if (!config.enabled || config.reducedMotion) return;

    const config: RippleConfig = {
      size: 100,
      color: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.1)",
      opacity: 0.6,
      duration: config.animationDuration.normal,
      expand: true,
      multiple: false,
      fadeOut: true,
      borderRadius: "50%",
      ...rippleConfig,
    };

    const id = Math.random().toString(36);
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
      lifetime: config.animationDuration.normal,
      gravity: 100,
      spread: Math.PI * 2,
      fadeOut: true,
      rotation: false,
      scale: { from: 1, to: 0.5 },
      opacity: { from: 1, to: 0 },
      shape: "circle",
      ...particleConfig,
    };

    const id = Math.random().toString(36);
    particlesRef.current.set(id, { x, y, config });

    // Auto-remove particles
    setTimeout(() => {
      particlesRef.current.delete(id);
    }, config.lifetime);
  }, [config, isDark]);

  // Trigger complex animation
  const triggerComplexAnimation = useCallback((
    type: FeedbackType,
    animConfig: {
      x: number;
      y: number;
      intensity?: number;
      duration?: number;
      customProperties?: Record<string, any>;
    }
  ) => {
    const { x, y, intensity = 1, duration, customProperties } = animConfig;

    // Trigger base feedback
    triggerFeedback(type, { x, y, intensity, duration });

    // Trigger additional effects based on type
    switch (type) {
      case "play":
        triggerParticles(x, y, {
          count: Math.floor(6 * intensity),
          color: isDark ? "#10b981" : "#059669",
          velocity: { min: 30, max: 100 },
          lifetime: 800,
        });
        triggerRipple(x, y, {
          size: 80 * intensity,
          color: isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(5, 150, 105, 0.3)",
        });
        break;

      case "error":
        triggerParticles(x, y, {
          count: Math.floor(4 * intensity),
          color: isDark ? "#dc2626" : "#ef4444",
          velocity: { min: 100, max: 200 },
          lifetime: 600,
          shape: "triangle",
        });
        break;

      case "success":
        triggerParticles(x, y, {
          count: Math.floor(10 * intensity),
          colors: [isDark ? "#10b981" : "#059669", isDark ? "#34d399" : "#10b981"],
          velocity: { min: 50, max: 150 },
          lifetime: 1000,
          shape: "star",
        });
        break;

      case "volume":
        triggerRipple(x, y, {
          size: 60 + (customProperties?.volume || 0) * 40,
          color: isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(37, 99, 235, 0.4)",
          multiple: intensity > 0.7,
          count: 2,
          spacing: 100,
        });
        break;

      default:
        triggerRipple(x, y, {
          size: 60 * intensity,
          opacity: 0.4 * intensity,
        });
    }
  }, [triggerFeedback, triggerParticles, triggerRipple, isDark]);

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

  // Performance optimization with GPU acceleration
  useEffect(() => {
    if (!config.performance.enableGpuAcceleration || !containerRef.current) return;

    const container = containerRef.current;
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

  // Performance monitor function
  const performanceMonitor = useCallback(() => {
    const performance = getCurrentPerformance();
    return {
      ...performance,
      activeAnimations: animationsRef.current.size + ripplesRef.current.size + particlesRef.current.size,
      isOptimized: performance.isOptimized && performance.memoryUsage < 50,
    };
  }, [getCurrentPerformance]);

  // Get metrics function
  const getMetrics = useCallback(() => [...metrics], [metrics]);

  // Reset metrics function
  const resetMetrics = useCallback(() => {
    setMetrics([]);
  }, []);

  const contextValue = useMemo(() => ({
    config,
    metrics,
    triggerFeedback,
    triggerRipple,
    triggerParticles,
    triggerComplexAnimation,
    clearFeedback,
    updateConfig,
    getMetrics,
    resetMetrics,
    performanceMonitor,
  }), [
    config,
    metrics,
    triggerFeedback,
    triggerRipple,
    triggerParticles,
    triggerComplexAnimation,
    clearFeedback,
    updateConfig,
    getMetrics,
    resetMetrics,
    performanceMonitor,
  ]);

  return (
    <VisualFeedbackContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={cn("relative", className)}
        style={{
          // Ensure smooth animations for all children
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      >
        {children}

        {/* Debug overlay */}
        {config.debugMode && (
          <div className="fixed top-2 right-2 bg-black/80 text-white p-2 rounded text-xs z-50 space-y-1">
            <div>Animations: {animationsRef.current.size}</div>
            <div>Ripples: {ripplesRef.current.size}</div>
            <div>Particles: {particlesRef.current.size}</div>
            <div>FPS: {getCurrentPerformance().fps}</div>
            <div>Memory: {getCurrentPerformance().memoryUsage}MB</div>
            <div>Theme: {theme}</div>
          </div>
        )}

        {/* Render feedback animations */}
        {Array.from(animationsRef.current.values()).map(animation => (
          <FeedbackAnimation
            key={animation.id}
            animation={animation}
            debugMode={config.debugMode}
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
            debugMode={config.debugMode}
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
                debugMode={config.debugMode}
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

// Enhanced individual feedback components with better integration
export const PlayFeedback: React.FC<{
  x: number;
  y: number;
  intensity?: number;
  onComplete?: () => void;
}> = ({ x, y, intensity = 1, onComplete }) => {
  const { triggerComplexAnimation } = useVisualFeedback();

  useEffect(() => {
    triggerComplexAnimation("play", { x, y, intensity });
  }, [x, y, intensity, triggerComplexAnimation]);

  return null;
};

export const PauseFeedback: React.FC<{
  x: number;
  y: number;
  intensity?: number;
  onComplete?: () => void;
}> = ({ x, y, intensity = 1, onComplete }) => {
  const { triggerComplexAnimation } = useVisualFeedback();

  useEffect(() => {
    triggerComplexAnimation("pause", { x, y, intensity });
  }, [x, y, intensity, triggerComplexAnimation]);

  return null;
};

export const VolumeFeedback: React.FC<{
  x: number;
  y: number;
  volume: number;
  intensity?: number;
  onComplete?: () => void;
}> = ({ x, y, volume, intensity = 1, onComplete }) => {
  const { triggerComplexAnimation } = useVisualFeedback();

  useEffect(() => {
    triggerComplexAnimation("volume", {
      x,
      y,
      intensity,
      customProperties: { volume }
    });
  }, [x, y, volume, intensity, triggerComplexAnimation]);

  return null;
};

export const SpeedFeedback: React.FC<{
  x: number;
  y: number;
  speed: number;
  intensity?: number;
  onComplete?: () => void;
}> = ({ x, y, speed, intensity = 1, onComplete }) => {
  const { triggerFeedback } = useVisualFeedback();

  useEffect(() => {
    triggerFeedback("speed", {
      x,
      y,
      value: speed,
      intensity,
      duration: 400,
      onStart: onComplete
    });
  }, [x, y, speed, intensity, triggerFeedback, onComplete]);

  return null;
};

export const SeekFeedback: React.FC<{
  x: number;
  y: number;
  intensity?: number;
  onComplete?: () => void;
}> = ({ x, y, intensity = 1, onComplete }) => {
  const { triggerFeedback } = useVisualFeedback();

  useEffect(() => {
    triggerFeedback("seek", {
      x,
      y,
      intensity,
      duration: 300,
      onStart: onComplete
    });
  }, [x, y, intensity, triggerFeedback, onComplete]);

  return null;
};

export const ErrorFeedback: React.FC<{
  x: number;
  y: number;
  intensity?: number;
  onComplete?: () => void;
}> = ({ x, y, intensity = 1, onComplete }) => {
  const { triggerComplexAnimation } = useVisualFeedback();

  useEffect(() => {
    triggerComplexAnimation("error", { x, y, intensity });
  }, [x, y, intensity, triggerComplexAnimation]);

  return null;
};

export const SuccessFeedback: React.FC<{
  x: number;
  y: number;
  intensity?: number;
  onComplete?: () => void;
}> = ({ x, y, intensity = 1, onComplete }) => {
  const { triggerComplexAnimation } = useVisualFeedback();

  useEffect(() => {
    triggerComplexAnimation("success", { x, y, intensity });
  }, [x, y, intensity, triggerComplexAnimation]);

  return null;
};

// Enhanced Touch interaction wrapper with comprehensive feedback
export const TouchFeedback: React.FC<{
  children: ReactNode;
  onPress?: (event: React.MouseEvent | React.TouchEvent) => void;
  onLongPress?: (event: React.MouseEvent | React.TouchEvent) => void;
  onDoubleTap?: (event: React.MouseEvent | React.TouchEvent) => void;
  feedbackType?: FeedbackType;
  intensity?: number;
  className?: string;
  disabled?: boolean;
  touchOnly?: boolean;
  delay?: number;
  hapticPattern?: Parameters<typeof useHapticFeedback>['0']['trigger'][0];
}> = ({
  children,
  onPress,
  onLongPress,
  onDoubleTap,
  feedbackType = "touch",
  intensity = 1,
  className = "",
  disabled = false,
  touchOnly = false,
  delay = 0,
  hapticPattern,
}) => {
  const { triggerRipple, triggerParticles, triggerFeedback } = useVisualFeedback();
  const { trigger: triggerHaptic } = useHapticFeedback();

  const timerRef = useRef<NodeJS.Timeout>();
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

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

    // Trigger visual feedback
    triggerRipple(x, y, { opacity: 0.3 * intensity });

    if (feedbackType === "success") {
      triggerParticles(x, y, {
        count: Math.floor(4 * intensity),
        color: "#10b981",
        intensity
      });
    } else if (feedbackType === "error") {
      triggerParticles(x, y, {
        count: Math.floor(3 * intensity),
        color: "#ef4444",
        intensity
      });
    }

    // Trigger haptic feedback
    if (hapticPattern) {
      triggerHaptic(hapticPattern);
    } else if (feedbackType) {
      const pattern = getHapticPatternForType(feedbackType);
      triggerHaptic(pattern);
    }

    // Handle different interaction types
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap
      tapCountRef.current++;
      if (tapCountRef.current === 2) {
        onDoubleTap?.(event);
        tapCountRef.current = 0;
        return;
      }
    } else {
      tapCountRef.current = 1;
    }

    lastTapRef.current = now;

    // Long press detection
    timerRef.current = setTimeout(() => {
      onLongPress?.(event);
      triggerFeedback("highlight", {
        x,
        y,
        intensity: 0.5,
        duration: 500
      });
    }, 500);

    // Regular press with delay
    if (delay === 0) {
      onPress?.(event);
    } else {
      setTimeout(() => {
        onPress?.(event);
      }, delay);
    }
  }, [
    disabled,
    feedbackType,
    intensity,
    hapticPattern,
    onPress,
    onLongPress,
    onDoubleTap,
    triggerRipple,
    triggerParticles,
    triggerFeedback,
    triggerHaptic,
    delay
  ]);

  const handleEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const getHapticPatternForType = useCallback((type: FeedbackType) => {
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
      default:
        return "light";
    }
  }, []);

  return (
    <div
      className={cn("relative overflow-hidden cursor-pointer", className)}
      onMouseDown={!touchOnly ? handleInteraction : undefined}
      onMouseUp={!touchOnly ? handleEnd : undefined}
      onMouseLeave={!touchOnly ? handleEnd : undefined}
      onTouchStart={handleInteraction}
      onTouchEnd={handleEnd}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const syntheticEvent = {
            currentTarget: e.currentTarget,
            clientX: 0,
            clientY: 0,
          } as any;
          handleInteraction(syntheticEvent);
        }
      }}
    >
      {children}
    </div>
  );
};

// Hook for creating feedback-enabled props with enhanced functionality
export const useFeedbackProps = (type: FeedbackType, options?: {
  intensity?: number;
  hapticPattern?: Parameters<typeof useHapticFeedback>['0']['trigger'][0];
  customAnimation?: Partial<FeedbackAnimation>;
}) => {
  const { triggerFeedback, triggerHaptic } = useVisualFeedback();

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

    triggerFeedback(type, {
      x,
      y,
      intensity: options?.intensity,
      interactionType: "click",
      ...options?.customAnimation
    });

    if (options?.hapticPattern) {
      triggerHaptic(options.hapticPattern);
    }
  }, [type, options, triggerFeedback, triggerHaptic]);
};

// Advanced utility hooks for specific interactions
export const useKeyboardFeedback = () => {
  const { triggerFeedback, triggerParticles } = useVisualFeedback();

  return useCallback((key: string, targetRect?: DOMRect) => {
    const centerX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth / 2;
    const centerY = targetRect ? targetRect.top + targetRect.height / 2 : window.innerHeight / 2;

    let feedbackType: FeedbackType = "touch";
    let particleCount = 3;

    switch (key.toLowerCase()) {
      case " ":
      case "enter":
        feedbackType = "success";
        particleCount = 8;
        break;
      case "escape":
        feedbackType = "error";
        particleCount = 4;
        break;
      case "arrowleft":
      case "arrowright":
        feedbackType = "seek";
        particleCount = 2;
        break;
      case "arrowup":
      case "arrowdown":
        feedbackType = "volume";
        particleCount = 3;
        break;
      default:
        feedbackType = "touch";
        particleCount = 2;
    }

    triggerFeedback(feedbackType, {
      x: centerX,
      y: centerY,
      interactionType: "keyboard",
      duration: 200
    });

    triggerParticles(centerX, centerY, {
      count: particleCount,
      velocity: { min: 100, max: 200 },
      lifetime: 400
    });
  }, [triggerFeedback, triggerParticles]);
};

export const useGestureFeedback = () => {
  const { triggerFeedback, triggerParticles, triggerRipple } = useVisualFeedback();

  return useCallback((gesture: string, startPoint: { x: number; y: number }, endPoint?: { x: number; y: number }) => {
    const midPoint = endPoint ? {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2
    } : startPoint;

    let feedbackType: FeedbackType = "touch";
    let particleConfig: Partial<ParticleConfig> = {};

    switch (gesture) {
      case "swipe-left":
      case "swipe-right":
        feedbackType = "seek";
        particleConfig = {
          count: 5,
          velocity: { min: 200, max: 300 },
          direction: gesture === "swipe-left" ? 180 : 0,
        };
        break;
      case "swipe-up":
      case "swipe-down":
        feedbackType = "volume";
        particleConfig = {
          count: 4,
          velocity: { min: 150, max: 250 },
          direction: gesture === "swipe-up" ? 270 : 90,
        };
        break;
      case "pinch-in":
      case "pinch-out":
        feedbackType = "highlight";
        particleConfig = {
          count: 8,
          spread: Math.PI * 2,
        };
        break;
      default:
        feedbackType = "touch";
    }

    triggerFeedback(feedbackType, {
      x: midPoint.x,
      y: midPoint.y,
      interactionType: "swipe",
      intensity: 0.8,
      duration: 250
    });

    if (Object.keys(particleConfig).length > 0) {
      triggerParticles(midPoint.x, midPoint.y, particleConfig);
    }

    // Add ripple trail for swipe gestures
    if (endPoint && (gesture.startsWith("swipe"))) {
      triggerRipple(endPoint.x, endPoint.y, {
        size: 30,
        opacity: 0.2,
        duration: 200,
      });
    }
  }, [triggerFeedback, triggerParticles, triggerRipple]);
};

export default VisualFeedbackProvider;
