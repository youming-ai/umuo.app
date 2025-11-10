/**
 * Touch Feedback System - Main Index
 * Comprehensive touch feedback system for mobile interactions
 * Integrates visual effects, haptic feedback, gesture recognition, and accessibility
 */

// Core classes
export {
  TouchFeedbackManager,
  touchFeedbackManager,
} from "./TouchFeedbackManager";
export type {
  TouchPoint,
  TouchEventHandlers,
  TouchFeedbackConfig,
} from "./TouchFeedbackManager";

// Visual components
export {
  Ripple,
  RippleContainer,
  EnhancedRippleEffect,
  useRippleEffect,
  ANIMATION_PATTERNS,
} from "./RippleEffect";
export type {
  RippleConfig,
  RipplePosition,
  RippleEffectProps,
  RippleContainerProps,
} from "./RippleEffect";

// Animation utilities
export {
  TouchAnimationUtils,
  touchAnimation,
  animateTransform,
  animateVisualEffects,
  animateSpring,
  animateBounce,
  animatePulse,
  animateShake,
  animateFade,
  animateSlide,
  animateScale,
  animateRotate,
  animateTouchInteraction,
} from "./TouchAnimation";
export type {
  AnimationConfig,
  TransformConfig,
  VisualEffectConfig,
  TouchAnimationPreset,
} from "./TouchAnimation";

// Visual response patterns
export {
  VisualResponsePatterns,
  useVisualResponsePatterns,
  SuccessVisualResponse,
  ErrorVisualResponse,
  DEFAULT_THEME,
} from "./VisualResponsePatterns";
export type {
  VisualResponseConfig,
  VisualResponseTheme,
  VisualResponsePatternsProps,
} from "./VisualResponsePatterns";

// Touch optimization
export {
  TouchOptimizer,
  touchOptimizer,
  initializeTouchOptimization,
  optimizeElement,
  createOptimizedHandlers,
  getTouchCapabilities,
} from "./TouchOptimizer";
export type {
  TouchEventConfig,
  TouchPoint as OptimizedTouchPoint,
} from "./TouchOptimizer";

// Multi-touch support
export {
  MultiTouchManager,
  multiTouchManager,
  initializeMultiTouch,
  registerGestureHandlers,
  getTouchCapabilities as getMultiTouchCapabilities,
} from "./MultiTouchManager";
export type {
  MultiTouchPoint,
  MultiTouchEvent,
  GestureConfig,
  GestureData,
  GestureHandler,
  AlternativeFeedback,
} from "./MultiTouchManager";

// Accessibility features
export {
  AccessibilityManager,
  accessibilityManager,
  initializeAccessibility,
  makeAccessible,
  announce,
} from "./AccessibilityManager";
export type {
  AccessibilityConfig,
  ScreenReaderAnnouncement,
  TouchAccessibilityAdapter,
} from "./AccessibilityManager";

// React hooks for easy integration
export { useTouchFeedback } from "./hooks/useTouchFeedback";
export { useMultiTouch } from "./hooks/useMultiTouch";
export { useTouchAccessibility } from "./hooks/useTouchAccessibility";

// Performance monitoring
export {
  PerformanceMonitor,
  performanceMonitor,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  getPerformanceMetrics,
  optimizeForPerformance,
} from "./utils/PerformanceMonitor";
export type {
  PerformanceMetrics,
  PerformanceThresholds,
  OptimizationStrategy,
} from "./utils/PerformanceMonitor";

// Re-export haptic feedback from parent directory
export {
  HapticFeedbackManager,
  hapticFeedback,
  useHapticFeedback,
  triggerHaptic,
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticError,
  hapticWarning,
  hapticSelection,
  hapticImpact,
} from "../haptic-feedback";
export type {
  HapticPattern,
  HapticConfig,
  HapticPatternDefinition,
} from "../haptic-feedback";

// Configuration types for the complete system
export interface CompleteTouchFeedbackConfig {
  visual: {
    ripples: {
      enabled: boolean;
      color: string;
      size: number;
      duration: number;
      pattern: "expand" | "fade" | "pulse" | "wave" | "ripple";
      multiRipple: boolean;
    };
    animations: {
      enabled: boolean;
      gpuAcceleration: boolean;
      reducedMotion: boolean;
      performanceMode: "quality" | "balanced" | "performance";
    };
    effects: {
      glow: boolean;
      shadow: boolean;
      scale: boolean;
      color: boolean;
    };
  };
  haptic: {
    enabled: boolean;
    intensity: number;
    patterns: Record<string, any>;
    deviceOptimization: boolean;
  };
  gestures: {
    multiTouch: boolean;
    pressure: boolean;
    stylus: boolean;
    sensitivity: number;
    threshold: number;
  };
  accessibility: {
    reducedMotion: boolean;
    screenReader: boolean;
    highContrast: boolean;
    keyboardNavigation: boolean;
    customFeedback: boolean;
  };
  performance: {
    batteryOptimization: boolean;
    throttling: boolean;
    maxActiveAnimations: number;
    cleanupInterval: number;
  };
}

/**
 * Initialize complete touch feedback system with recommended defaults
 */
export const initializeTouchFeedbackSystem = (
  config?: Partial<CompleteTouchFeedbackConfig>,
): void => {
  // Initialize core components
  if (typeof window !== "undefined") {
    touchFeedbackManager.initialize();
    touchOptimizer.initialize();
    multiTouchManager.initialize();
    accessibilityManager.initialize();
    startPerformanceMonitoring();
  }

  // Apply custom configuration if provided
  if (config && typeof window !== "undefined") {
    if (config.visual) {
      touchFeedbackManager.updateConfig({
        visual: {
          enableGpuAcceleration: config.visual.animations.gpuAcceleration,
          reduceMotion: config.visual.animations.reducedMotion,
          batteryOptimization: config.performance?.batteryOptimization,
        },
      });
    }

    if (config.haptic) {
      // Update haptic configuration
      if (window.hapticFeedback) {
        window.hapticFeedback.setEnabled(config.haptic.enabled);
        window.hapticFeedback.setIntensity(config.haptic.intensity);
      }
    }

    if (config.gestures) {
      multiTouchManager.updateConfig({
        enableMultiTouch: config.gestures.multiTouch,
        enablePressure: config.gestures.pressure,
        enableStylus: config.gestures.stylus,
        pressureThreshold: config.gestures.sensitivity,
        gestureThreshold: config.gestures.threshold,
      });
    }

    if (config.accessibility) {
      accessibilityManager.updateConfig({
        reducedMotion: config.accessibility.reducedMotion,
        screenReaderEnabled: config.accessibility.screenReader,
        highContrast: config.accessibility.highContrast,
        keyboardNavigationEnabled: config.accessibility.keyboardNavigation,
        customFeedbackEnabled: config.accessibility.customFeedback,
      });
    }
  }

  // Set global performance mode
  if (config?.performance && typeof window !== "undefined") {
    touchFeedbackManager.setPerformanceMode(
      config.performance.batteryOptimization ? "battery-saver" : "normal",
    );
  }

  console.log("Touch Feedback System initialized successfully");
};

/**
 * Get system status and capabilities
 */
export const getTouchFeedbackSystemStatus = () => {
  if (typeof window === "undefined") {
    return { initialized: false, capabilities: {} };
  }

  const touchCapabilities = getTouchCapabilities();
  const multiTouchCapabilities = getMultiTouchCapabilities();
  const accessibilityStatus = accessibilityManager.getStatus();
  const performanceStats = touchFeedbackManager.getPerformanceStats();

  return {
    initialized: true,
    capabilities: {
      ...touchCapabilities,
      ...multiTouchCapabilities,
    },
    accessibility: accessibilityStatus,
    performance: performanceStats,
    configuration: {
      touchFeedback: touchFeedbackManager.getConfig(),
      touchOptimizer: touchOptimizer.getConfig(),
      multiTouch: multiTouchManager.getConfig(),
      accessibility: accessibilityManager.getConfig(),
    },
  };
};

/**
 * Apply touch feedback to existing elements
 */
export const enhanceElementWithTouchFeedback = (
  element: HTMLElement,
  options: {
    visualFeedback?: boolean;
    hapticFeedback?: boolean;
    gestureSupport?: boolean;
    accessibility?: boolean;
    config?: any;
  } = {},
): void => {
  const {
    visualFeedback = true,
    hapticFeedback = true,
    gestureSupport = false,
    accessibility = true,
    config,
  } = options;

  // Add touch optimization
  touchOptimizer.optimizeElement(element, config);

  // Add visual feedback
  if (visualFeedback) {
    element.classList.add("touch-optimized");
    element.setAttribute("data-touch-feedback", "enabled");
  }

  // Add haptic feedback
  if (hapticFeedback) {
    element.addEventListener(
      "touchstart",
      () => {
        if (window.hapticFeedback) {
          window.hapticFeedback.trigger("light");
        }
      },
      { passive: true },
    );
  }

  // Add gesture support
  if (gestureSupport) {
    multiTouchManager.registerGestureHandlers(element, {
      onTap: (touches) => {
        const clickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });
        element.dispatchEvent(clickEvent);
      },
    });
  }

  // Add accessibility features
  if (accessibility) {
    accessibilityManager.makeTouchAccessible(element, config);
  }
};

/**
 * Default configuration presets for different use cases
 */
export const TouchFeedbackPresets = {
  /**
   * Minimal configuration for basic touch feedback
   */
  minimal: {
    visual: {
      ripples: {
        enabled: true,
        color: "rgba(255, 255, 255, 0.4)",
        size: 80,
        duration: 400,
        pattern: "expand" as const,
        multiRipple: false,
      },
      animations: {
        enabled: true,
        gpuAcceleration: false,
        reducedMotion: false,
        performanceMode: "balanced" as const,
      },
      effects: {
        glow: false,
        shadow: false,
        scale: true,
        color: false,
      },
    },
    haptic: {
      enabled: true,
      intensity: 0.5,
      deviceOptimization: true,
    },
    gestures: {
      multiTouch: false,
      pressure: false,
      stylus: false,
      sensitivity: 0.5,
      threshold: 15,
    },
    accessibility: {
      reducedMotion: false,
      screenReader: true,
      highContrast: false,
      keyboardNavigation: true,
      customFeedback: false,
    },
    performance: {
      batteryOptimization: false,
      throttling: true,
      maxActiveAnimations: 3,
      cleanupInterval: 5000,
    },
  },

  /**
   * Rich configuration for enhanced user experience
   */
  rich: {
    visual: {
      ripples: {
        enabled: true,
        color: "rgba(255, 255, 255, 0.6)",
        size: 120,
        duration: 600,
        pattern: "pulse" as const,
        multiRipple: true,
      },
      animations: {
        enabled: true,
        gpuAcceleration: true,
        reducedMotion: false,
        performanceMode: "quality" as const,
      },
      effects: {
        glow: true,
        shadow: true,
        scale: true,
        color: true,
      },
    },
    haptic: {
      enabled: true,
      intensity: 1.0,
      deviceOptimization: true,
    },
    gestures: {
      multiTouch: true,
      pressure: true,
      stylus: true,
      sensitivity: 0.8,
      threshold: 10,
    },
    accessibility: {
      reducedMotion: false,
      screenReader: true,
      highContrast: false,
      keyboardNavigation: true,
      customFeedback: true,
    },
    performance: {
      batteryOptimization: false,
      throttling: false,
      maxActiveAnimations: 10,
      cleanupInterval: 3000,
    },
  },

  /**
   * Accessibility-focused configuration
   */
  accessible: {
    visual: {
      ripples: {
        enabled: true,
        color: "rgba(0, 0, 0, 0.2)",
        size: 100,
        duration: 300,
        pattern: "expand" as const,
        multiRipple: false,
      },
      animations: {
        enabled: true,
        gpuAcceleration: false,
        reducedMotion: true,
        performanceMode: "balanced" as const,
      },
      effects: {
        glow: false,
        shadow: true,
        scale: false,
        color: false,
      },
    },
    haptic: {
      enabled: true,
      intensity: 0.7,
      deviceOptimization: true,
    },
    gestures: {
      multiTouch: false,
      pressure: false,
      stylus: false,
      sensitivity: 0.3,
      threshold: 20,
    },
    accessibility: {
      reducedMotion: true,
      screenReader: true,
      highContrast: true,
      keyboardNavigation: true,
      customFeedback: true,
    },
    performance: {
      batteryOptimization: true,
      throttling: true,
      maxActiveAnimations: 2,
      cleanupInterval: 1000,
    },
  },

  /**
   * Battery-conscious configuration
   */
  batteryConscious: {
    visual: {
      ripples: {
        enabled: false,
        color: "rgba(255, 255, 255, 0.3)",
        size: 60,
        duration: 200,
        pattern: "fade" as const,
        multiRipple: false,
      },
      animations: {
        enabled: false,
        gpuAcceleration: false,
        reducedMotion: true,
        performanceMode: "performance" as const,
      },
      effects: {
        glow: false,
        shadow: false,
        scale: true,
        color: false,
      },
    },
    haptic: {
      enabled: true,
      intensity: 0.3,
      deviceOptimization: true,
    },
    gestures: {
      multiTouch: false,
      pressure: false,
      stylus: false,
      sensitivity: 0.2,
      threshold: 25,
    },
    accessibility: {
      reducedMotion: true,
      screenReader: true,
      highContrast: false,
      keyboardNavigation: true,
      customFeedback: false,
    },
    performance: {
      batteryOptimization: true,
      throttling: true,
      maxActiveAnimations: 1,
      cleanupInterval: 500,
    },
  },
};

/**
 * Quick setup function with preset
 */
export const quickSetup = (
  preset: keyof typeof TouchFeedbackPresets = "minimal",
  customConfig?: Partial<CompleteTouchFeedbackConfig>,
): void => {
  const config = { ...TouchFeedbackPresets[preset], ...customConfig };
  initializeTouchFeedbackSystem(config);
};

// Auto-initialize with minimal preset when module is imported
if (typeof window !== "undefined") {
  // Only auto-initialize if not already initialized
  if (!(window as any).touchFeedbackSystemInitialized) {
    quickSetup("minimal");
    (window as any).touchFeedbackSystemInitialized = true;
  }
}

// Make system available globally for debugging and advanced usage
if (typeof window !== "undefined") {
  (window as any).TouchFeedbackSystem = {
    initialize: initializeTouchFeedbackSystem,
    getStatus: getTouchFeedbackSystemStatus,
    enhanceElement: enhanceElementWithTouchFeedback,
    presets: TouchFeedbackPresets,
    quickSetup,

    // Core managers
    touchFeedbackManager,
    touchOptimizer,
    multiTouchManager,
    accessibilityManager,
    performanceMonitor,
  };
}
