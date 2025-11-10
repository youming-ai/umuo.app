"use client";

import { useCallback, useEffect, useState } from "react";

interface HapticOptions {
  intensity?: number;
  duration?: number;
  pattern?: number[];
  repeat?: number;
}

interface HapticFeedbackCapabilities {
  supported: boolean;
  vibration: boolean;
  hapticFeedback: boolean;
  selection: boolean;
  impact: boolean;
  notification: boolean;
  pattern: boolean;
}

interface HapticPatterns {
  light: number[];
  medium: number[];
  heavy: number[];
  success: number[];
  error: number[];
  warning: number[];
  selection: number[];
  click: number[];
  longPress: number[];
  doubleTap: number[];
}

const DEFAULT_PATTERNS: HapticPatterns = {
  light: [10],
  medium: [50],
  heavy: [100],
  success: [10, 50, 10],
  error: [100, 50, 100],
  warning: [50, 30, 50],
  selection: [25],
  click: [5],
  longPress: [100],
  doubleTap: [10, 50, 10]
};

const PRESET_PATTERNS = {
  notification: {
    success: [0, 10, 50, 10],
    warning: [0, 30, 50, 30],
    error: [0, 100, 50, 100]
  },
  impact: {
    light: [0, 10],
    medium: [0, 50],
    heavy: [0, 100]
  },
  selection: {
    start: [0, 10],
    change: [0, 25],
    end: [0, 10]
  }
};

export function useHapticFeedback() {
  const [capabilities, setCapabilities] = useState<HapticFeedbackCapabilities>({
    supported: false,
    vibration: false,
    hapticFeedback: false,
    selection: false,
    impact: false,
    notification: false,
    pattern: false
  });

  const [isEnabled, setIsEnabled] = useState(true);
  const [intensity, setIntensity] = useState(1.0);

  // Check haptic feedback capabilities on mount
  useEffect(() => {
    const checkCapabilities = () => {
      const hasVibration = 'vibrate' in navigator;
      const hasHapticFeedback = 'hapticFeedback' in navigator || 'vibrate' in navigator;

      setCapabilities({
        supported: hasHapticFeedback,
        vibration: hasVibration,
        hapticFeedback: hasHapticFeedback,
        selection: true, // Most modern devices support this
        impact: hasVibration,
        notification: hasVibration,
        pattern: hasVibration
      });
    };

    checkCapabilities();
  }, []);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((
    type: keyof HapticPatterns | number[] | HapticOptions,
    options?: HapticOptions
  ) => {
    if (!capabilities.supported || !isEnabled) return;

    try {
      let pattern: number[];
      let intensityMultiplier = intensity;

      // Handle different input types
      if (Array.isArray(type)) {
        pattern = type;
      } else if (typeof type === 'object' && 'pattern' in type) {
        pattern = type.pattern || DEFAULT_PATTERNS.light;
        intensityMultiplier = type.intensity || intensityMultiplier;
      } else if (typeof type === 'string' && type in DEFAULT_PATTERNS) {
        pattern = DEFAULT_PATTERNS[type as keyof HapticPatterns];
      } else {
        pattern = DEFAULT_PATTERNS.light;
      }

      // Apply intensity multiplier
      if (intensityMultiplier !== 1.0) {
        pattern = pattern.map(duration => Math.round(duration * intensityMultiplier));
      }

      // Apply additional options
      if (options?.repeat && options.repeat > 1) {
        const repeatedPattern: number[] = [];
        for (let i = 0; i < options.repeat; i++) {
          repeatedPattern.push(...pattern, 50); // Add small gap between repetitions
        }
        pattern = repeatedPattern;
      }

      // Trigger vibration
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }

      // Try advanced haptic feedback APIs if available
      if ('hapticFeedback' in navigator) {
        try {
          (navigator as any).hapticFeedback.trigger(type, options);
        } catch (error) {
          // Fallback to vibration
        }
      }

    } catch (error) {
      console.warn("Haptic feedback failed:", error);
    }
  }, [capabilities.supported, isEnabled, intensity]);

  // Specific haptic methods for common interactions
  const hapticFeedback = {
    // Basic feedback
    light: useCallback(() => triggerHaptic('light'), [triggerHaptic]),
    medium: useCallback(() => triggerHaptic('medium'), [triggerHaptic]),
    heavy: useCallback(() => triggerHaptic('heavy'), [triggerHaptic]),

    // State feedback
    success: useCallback(() => triggerHaptic('success'), [triggerHaptic]),
    error: useCallback(() => triggerHaptic('error'), [triggerHaptic]),
    warning: useCallback(() => triggerHaptic('warning'), [triggerHaptic]),

    // Interaction feedback
    selection: useCallback(() => triggerHaptic('selection'), [triggerHaptic]),
    click: useCallback(() => triggerHaptic('click'), [triggerHaptic]),
    longPress: useCallback(() => triggerHaptic('longPress'), [triggerHaptic]),
    doubleTap: useCallback(() => triggerHaptic('doubleTap'), [triggerHaptic]),

    // Custom pattern
    pattern: useCallback((pattern: number[]) => triggerHaptic(pattern), [triggerHaptic]),

    // Preset patterns for Android
    notification: useCallback((type: 'success' | 'warning' | 'error') => {
      if (capabilities.vibration && 'hapticFeedback' in navigator) {
        try {
          // Try Android HapticFeedback API
          (navigator as any).hapticFeedback.notification?.(type);
        } catch (error) {
          // Fallback to vibration pattern
          triggerHaptic(PRESET_PATTERNS.notification[type]);
        }
      } else {
        triggerHaptic(PRESET_PATTERNS.notification[type]);
      }
    }, [triggerHaptic, capabilities.vibration]),

    impact: useCallback((strength: 'light' | 'medium' | 'heavy') => {
      if (capabilities.vibration && 'hapticFeedback' in navigator) {
        try {
          // Try Android HapticFeedback API
          (navigator as any).hapticFeedback.impact?.(strength);
        } catch (error) {
          // Fallback to vibration pattern
          triggerHaptic(PRESET_PATTERNS.impact[strength]);
        }
      } else {
        triggerHaptic(PRESET_PATTERNS.impact[strength]);
      }
    }, [triggerHaptic, capabilities.vibration]),

    selectionStart: useCallback(() => {
      if (capabilities.vibration && 'hapticFeedback' in navigator) {
        try {
          (navigator as any).hapticFeedback.selection?.('start');
        } catch (error) {
          triggerHaptic(PRESET_PATTERNS.selection.start);
        }
      } else {
        triggerHaptic(PRESET_PATTERNS.selection.start);
      }
    }, [triggerHaptic, capabilities.vibration]),

    selectionChange: useCallback(() => {
      if (capabilities.vibration && 'hapticFeedback' in navigator) {
        try {
          (navigator as any).hapticFeedback.selection?.('change');
        } catch (error) {
          triggerHaptic(PRESET_PATTERNS.selection.change);
        }
      } else {
        triggerHaptic(PRESET_PATTERNS.selection.change);
      }
    }, [triggerHaptic, capabilities.vibration]),

    selectionEnd: useCallback(() => {
      if (capabilities.vibration && 'hapticFeedback' in navigator) {
        try {
          (navigator as any).hapticFeedback.selection?.('end');
        } catch (error) {
          triggerHaptic(PRESET_PATTERNS.selection.end);
        }
      } else {
        triggerHaptic(PRESET_PATTERNS.selection.end);
      }
    }, [triggerHaptic, capabilities.vibration])
  };

  return {
    triggerHaptic,
    hapticFeedback,
    capabilities,
    isEnabled,
    setIsEnabled,
    intensity,
    setIntensity
  };
}

// Hook for managing haptic feedback settings
export function useHapticSettings() {
  const [settings, setSettings] = useState({
    enabled: true,
    intensity: 1.0,
    enableForGestures: true,
    enableForFeedback: true,
    customPatterns: {} as Record<string, number[]>
  });

  const updateSettings = useCallback((newSettings: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));

    // Persist to localStorage
    try {
      localStorage.setItem('haptic-settings', JSON.stringify({ ...settings, ...newSettings }));
    } catch (error) {
      console.warn("Failed to save haptic settings:", error);
    }
  }, [settings]);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('haptic-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.warn("Failed to load haptic settings:", error);
    }
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings: useCallback(() => {
      const defaultSettings = {
        enabled: true,
        intensity: 1.0,
        enableForGestures: true,
        enableForFeedback: true,
        customPatterns: {}
      };
      setSettings(defaultSettings);
      try {
        localStorage.setItem('haptic-settings', JSON.stringify(defaultSettings));
      } catch (error) {
        console.warn("Failed to save haptic settings:", error);
      }
    }, [])
  };
}
