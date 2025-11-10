/**
 * Touch Feedback React Hook
 * Provides easy integration of touch feedback system with React components
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { TouchFeedbackManager, TouchFeedbackConfig } from '../TouchFeedbackManager';
import { TouchOptimizer, TouchEventConfig } from '../TouchOptimizer';
import { AccessibilityManager, AccessibilityConfig } from '../AccessibilityManager';
import { useHapticFeedback } from '../../haptic-feedback';

export interface UseTouchFeedbackConfig {
  visual?: Partial<TouchFeedbackConfig['visual']>;
  haptic?: {
    enabled?: boolean;
    pattern?: string;
    intensity?: number;
  };
  optimization?: Partial<TouchEventConfig>;
  accessibility?: Partial<AccessibilityConfig>;
  enabled?: boolean;
}

export interface TouchFeedbackActions {
  addRipple: (x: number, y: number) => void;
  createActionFeedback: (action: 'success' | 'error' | 'warning' | 'info') => void;
  optimize: () => void;
  makeAccessible: () => void;
  enable: () => void;
  disable: () => void;
}

/**
 * Hook for comprehensive touch feedback
 */
export const useTouchFeedback = (config: UseTouchFeedbackConfig = {}): TouchFeedbackActions => {
  const elementRef = useRef<HTMLElement>(null);
  const managerRef = useRef<TouchFeedbackManager | null>(null);
  const optimizerRef = useRef<TouchOptimizer | null>(null);
  const accessibilityRef = useRef<AccessibilityManager | null>(null);
  const isEnabledRef = useRef(config.enabled !== false);

  const { trigger: triggerHaptic } = useHapticFeedback();

  // Initialize managers
  useEffect(() => {
    managerRef.current = TouchFeedbackManager.getInstance();
    optimizerRef.current = TouchOptimizer.getInstance();
    accessibilityRef.current = AccessibilityManager.getInstance();
  }, []);

  // Update configuration
  useEffect(() => {
    if (managerRef.current && config.visual) {
      managerRef.current.updateConfig({ visual: config.visual });
    }
  }, [config.visual]);

  // Enable/disable feedback
  const enable = useCallback(() => {
    isEnabledRef.current = true;
    if (elementRef.current) {
      elementRef.current.style.pointerEvents = '';
    }
  }, []);

  const disable = useCallback(() => {
    isEnabledRef.current = false;
    if (elementRef.current) {
      elementRef.current.style.pointerEvents = 'none';
    }
  }, []);

  // Add ripple effect
  const addRipple = useCallback((x: number, y: number) => {
    if (!isEnabledRef.current || !elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;

    // Use TouchFeedbackManager to create ripple
    if (managerRef.current) {
      const touchPoint = {
        id: Date.now(),
        x: relativeX,
        y: relativeY,
        timestamp: performance.now(),
        element: elementRef.current,
      };

      // Simulate touch start for ripple creation
      const event = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [{
          identifier: touchPoint.id,
          clientX: x,
          clientY: y,
          force: 1,
        } as Touch],
      });

      managerRef.current.processTouchStart(event, elementRef.current);
    }

    // Trigger haptic feedback
    if (config.haptic?.enabled) {
      triggerHaptic((config.haptic.pattern as any) || 'light');
    }
  }, [triggerHaptic, config.haptic]);

  // Create action feedback
  const createActionFeedback = useCallback((action: 'success' | 'error' | 'warning' | 'info') => {
    if (!isEnabledRef.current || !elementRef.current || !managerRef.current) return;

    managerRef.current.createActionFeedback(action, elementRef.current);

    // Trigger haptic feedback
    if (config.haptic?.enabled) {
      const hapticPatterns = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'light',
      };
      triggerHaptic(hapticPatterns[action] as any);
    }
  }, [triggerHaptic, config.haptic]);

  // Optimize element
  const optimize = useCallback(() => {
    if (!elementRef.current || !optimizerRef.current) return;

    optimizerRef.current.optimizeElement(elementRef.current, config.optimization);
  }, [config.optimization]);

  // Make accessible
  const makeAccessible = useCallback(() => {
    if (!elementRef.current || !accessibilityRef.current) return;

    accessibilityRef.current.makeTouchAccessible(elementRef.current, config.accessibility);
  }, [config.accessibility]);

  // Ref callback to set up element
  const setElement = useCallback((element: HTMLElement | null) => {
    if (element) {
      elementRef.current = element;

      // Apply initial configuration
      optimize();
      makeAccessible();

      // Add touch event listeners
      const handleTouchStart = (e: TouchEvent) => {
        if (!isEnabledRef.current) return;

        const touch = e.touches[0];
        addRipple(touch.clientX, touch.clientY);
      };

      element.addEventListener('touchstart', handleTouchStart, { passive: true });

      // Cleanup function
      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
      };
    }
  }, [addRipple, optimize, makeAccessible]);

  return {
    addRipple,
    createActionFeedback,
    optimize,
    makeAccessible,
    enable,
    disable,
    setElement,
  };
};

/**
 * Hook for touch feedback with element ref
 */
export const useTouchFeedbackRef = <T extends HTMLElement>(
  config: UseTouchFeedbackConfig = {}
) => {
  const touchFeedback = useTouchFeedback(config);
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (elementRef.current) {
      touchFeedback.setElement(elementRef.current);
    }
  }, [touchFeedback]);

  return {
    ref: elementRef,
    ...touchFeedback,
  };
};

/**
 * Hook for simplified ripple effects
 */
export const useRippleEffect = (config: { color?: string; size?: number; duration?: number } = {}) => {
  const containerRef = useRef<HTMLElement>(null);
  const rippleIdRef = useRef(0);

  const createRipple = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const rippleId = rippleIdRef.current++;

    // Create ripple element
    const ripple = document.createElement('div');
    ripple.className = 'simple-ripple';
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background-color: ${config.color || 'rgba(255, 255, 255, 0.5)'};
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1000;
    `;

    containerRef.current.appendChild(ripple);

    // Animate ripple
    requestAnimationFrame(() => {
      ripple.style.transition = `all ${config.duration || 600}ms ease-out`;
      ripple.style.width = `${config.size || 100}px`;
      ripple.style.height = `${config.size || 100}px`;
      ripple.style.opacity = '0';
    });

    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, config.duration || 600);
  }, [config]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    createRipple(event.clientX, event.clientY);
  }, [createRipple]);

  return {
    ref: containerRef,
    createRipple,
    handleClick,
  };
};

export default {
  useTouchFeedback,
  useTouchFeedbackRef,
  useRippleEffect,
};
