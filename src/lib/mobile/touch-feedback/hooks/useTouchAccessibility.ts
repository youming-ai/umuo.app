/**
 * Touch Accessibility React Hook
 * Provides accessibility features for touch interactions in React components
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { AccessibilityManager, AccessibilityConfig } from '../AccessibilityManager';
import { useHapticFeedback } from '../../haptic-feedback';

export interface UseTouchAccessibilityConfig {
  reducedMotion?: boolean;
  highContrast?: boolean;
  screenReader?: boolean;
  keyboardNavigation?: boolean;
  customFeedback?: boolean;
  audioFeedback?: boolean;
  hapticPreference?: 'enabled' | 'disabled' | 'reduced';
  announcements?: {
    onInteraction?: string;
    onSuccess?: string;
    onError?: string;
    onAction?: string;
  };
}

export interface AccessibilityActions {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  makeAccessible: (options?: any) => void;
  enable: () => void;
  disable: () => void;
  updateConfig: (config: Partial<AccessibilityConfig>) => void;
}

/**
 * Hook for touch accessibility features
 */
export const useTouchAccessibility = (
  config: UseTouchAccessibilityConfig = {}
): AccessibilityActions => {
  const elementRef = useRef<HTMLElement>(null);
  const managerRef = useRef<AccessibilityManager | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Initialize accessibility manager
  useEffect(() => {
    managerRef.current = AccessibilityManager.getInstance();
  }, []);

  // Update configuration
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateConfig({
        reducedMotion: config.reducedMotion,
        highContrast: config.highContrast,
        screenReaderEnabled: config.screenReader,
        keyboardNavigationEnabled: config.keyboardNavigation,
        customFeedbackEnabled: config.customFeedback,
        audioFeedbackEnabled: config.audioFeedback,
        hapticPreference: config.hapticPreference,
      });
    }
  }, [config]);

  // Announce message to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (managerRef.current && isEnabled) {
      managerRef.current.announce(message, priority);
    }
  }, [isEnabled]);

  // Make element accessible
  const makeAccessible = useCallback((options: any = {}) => {
    if (!elementRef.current || !managerRef.current) return;

    managerRef.current.makeTouchAccessible(elementRef.current, {
      label: options.label,
      description: options.description,
      role: options.role,
      keyboardAlternative: config.keyboardNavigation,
      visualAlternative: true,
      hapticAlternative: config.hapticPreference !== 'disabled',
    });
  }, [config.keyboardNavigation, config.hapticPreference]);

  // Enable accessibility
  const enable = useCallback(() => {
    setIsEnabled(true);
    if (elementRef.current) {
      elementRef.current.setAttribute('aria-disabled', 'false');
    }
  }, []);

  // Disable accessibility
  const disable = useCallback(() => {
    setIsEnabled(false);
    if (elementRef.current) {
      elementRef.current.setAttribute('aria-disabled', 'true');
    }
  }, []);

  // Update accessibility configuration
  const updateConfig = useCallback((newConfig: Partial<AccessibilityConfig>) => {
    if (managerRef.current) {
      managerRef.current.updateConfig(newConfig);
    }
  }, []);

  // Ref callback to set up element
  const ref = useCallback((element: HTMLElement | null) => {
    if (element) {
      elementRef.current = element;
      makeAccessible();
    }
  }, [makeAccessible]);

  return {
    ref,
    announce,
    makeAccessible,
    enable,
    disable,
    updateConfig,
  };
};

/**
 * Hook for accessible button interactions
 */
export const useAccessibleButton = (
  onClick: () => void,
  options: {
    label?: string;
    description?: string;
    disabled?: boolean;
    announceClick?: string;
    hapticPattern?: any;
  } = {}
) => {
  const accessibility = useTouchAccessibility({
    screenReader: true,
    keyboardNavigation: true,
    hapticPreference: 'enabled',
  });

  const handleClick = useCallback(() => {
    if (options.disabled) return;

    onClick();

    // Announce click if configured
    if (options.announceClick) {
      accessibility.announce(options.announceClick);
    }

    // Trigger haptic feedback
    if (options.hapticPattern) {
      triggerHaptic(options.hapticPattern);
    }
  }, [onClick, options, accessibility]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (options.disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick, options.disabled]);

  return {
    ...accessibility,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    role: 'button',
    tabIndex: options.disabled ? -1 : 0,
    'aria-label': options.label,
    'aria-describedby': options.description,
    'aria-disabled': options.disabled,
  };
};

/**
 * Hook for accessible form inputs
 */
export const useAccessibleInput = (
  options: {
    label?: string;
    description?: string;
    required?: boolean;
    invalid?: boolean;
    errorMessage?: string;
  } = {}
) => {
  const [value, setValue] = useState('');
  const accessibility = useTouchAccessibility({
    screenReader: true,
    keyboardNavigation: true,
  });

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);

    // Announce value change for screen readers
    if (accessibility.announce) {
      accessibility.announce(`Value changed to: ${event.target.value}`);
    }
  }, [accessibility]);

  // Announce error messages
  useEffect(() => {
    if (options.invalid && options.errorMessage) {
      accessibility.announce(options.errorMessage, 'assertive');
    }
  }, [options.invalid, options.errorMessage, accessibility]);

  return {
    ...accessibility,
    value,
    onChange: handleChange,
    setValue,
    'aria-label': options.label,
    'aria-describedby': options.description,
    'aria-required': options.required,
    'aria-invalid': options.invalid,
    'aria-errormessage': options.errorMessage,
  };
};

/**
 * Hook for accessible touch gestures
 */
export const useAccessibleGestures = (
  options: {
    announceGestures?: boolean;
    keyboardShortcuts?: Record<string, () => void>;
    hapticFeedback?: boolean;
  } = {}
) => {
  const [lastGesture, setLastGesture] = useState<string>('');
  const accessibility = useTouchAccessibility({
    screenReader: options.announceGestures,
    keyboardNavigation: true,
    hapticPreference: options.hapticFeedback ? 'enabled' : 'disabled',
  });

  const handleGesture = useCallback((gestureName: string, details?: any) => {
    setLastGesture(gestureName);

    // Announce gesture if enabled
    if (options.announceGestures && accessibility.announce) {
      accessibility.announce(`${gestureName} gesture detected`);
    }

    // Trigger haptic feedback
    if (options.hapticFeedback) {
      const hapticPatterns: Record<string, any> = {
        tap: 'light',
        doubleTap: 'medium',
        longPress: 'heavy',
        swipe: 'impact',
        pinch: 'selection',
        rotate: 'light',
      };

      if (hapticPatterns[gestureName]) {
        triggerHaptic(hapticPatterns[gestureName]);
      }
    }
  }, [options, accessibility]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const key = event.key;

    if (options.keyboardShortcuts?.[key]) {
      event.preventDefault();
      options.keyboardShortcuts[key]();

      // Announce keyboard shortcut
      if (accessibility.announce) {
        accessibility.announce(`Keyboard shortcut ${key} activated`);
      }
    }
  }, [options.keyboardShortcuts, accessibility]);

  return {
    ...accessibility,
    handleGesture,
    handleKeyDown,
    lastGesture,
  };
};

/**
 * Hook for reduced motion support
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const getAnimationConfig = useCallback((normalConfig: any, reducedConfig: any) => {
    return prefersReducedMotion ? reducedConfig : normalConfig;
  }, [prefersReducedMotion]);

  return {
    prefersReducedMotion,
    getAnimationConfig,
  };
};

/**
 * Hook for high contrast mode support
 */
export const useHighContrast = () => {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const getContrastColors = useCallback((normalColors: any, highContrastColors: any) => {
    return prefersHighContrast ? highContrastColors : normalColors;
  }, [prefersHighContrast]);

  return {
    prefersHighContrast,
    getContrastColors,
  };
};

export default {
  useTouchAccessibility,
  useAccessibleButton,
  useAccessibleInput,
  useAccessibleGestures,
  useReducedMotion,
  useHighContrast,
};
