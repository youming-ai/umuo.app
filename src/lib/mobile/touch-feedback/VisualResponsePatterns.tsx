/**
 * Visual Response Patterns Component
 * Provides comprehensive visual feedback patterns for various mobile interactions
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useHapticFeedback } from '../haptic-feedback';
import { TouchAnimationUtils, AnimationConfig, TransformConfig, VisualEffectConfig } from './TouchAnimation';
import { RippleContainer, useRippleEffect, RippleConfig } from './RippleEffect';

export interface VisualResponseConfig {
  pattern: 'success' | 'error' | 'warning' | 'info' | 'loading' | 'processing' | 'complete' | 'idle';
  intensity?: 'light' | 'medium' | 'strong';
  duration?: number;
  enableHaptic?: boolean;
  enableRipple?: boolean;
  enableAnimation?: boolean;
  accessibility?: {
    screenReaderAnnouncement?: string;
    reducedMotion?: boolean;
  };
}

export interface VisualResponseTheme {
  success: {
    color: string;
    backgroundColor: string;
    borderColor: string;
    haptic: 'success';
    animation: 'pulse' | 'bounce' | 'expand';
  };
  error: {
    color: string;
    backgroundColor: string;
    borderColor: string;
    haptic: 'error';
    animation: 'shake' | 'pulse' | 'fade';
  };
  warning: {
    color: string;
    backgroundColor: string;
    borderColor: string;
    haptic: 'warning';
    animation: 'pulse' | 'bounce';
  };
  info: {
    color: string;
    backgroundColor: string;
    borderColor: string;
    haptic: 'light';
    animation: 'fade' | 'expand';
  };
  loading: {
    color: string;
    backgroundColor: string;
    animation: 'spin' | 'pulse' | 'bounce';
  };
  processing: {
    color: string;
    backgroundColor: string;
    animation: 'pulse' | 'progress';
  };
  complete: {
    color: string;
    backgroundColor: string;
    borderColor: string;
    haptic: 'success';
    animation: 'bounce' | 'expand';
  };
  idle: {
    color: string;
    backgroundColor: string;
    animation: 'none';
  };
}

export interface VisualResponsePatternsProps {
  children: React.ReactNode;
  config?: Partial<VisualResponseConfig>;
  theme?: Partial<VisualResponseTheme>;
  className?: string;
  onResponseStart?: (pattern: string) => void;
  onResponseEnd?: (pattern: string) => void;
}

/**
 * Default visual response theme
 */
const DEFAULT_THEME: VisualResponseTheme = {
  success: {
    color: '#16a34a',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    haptic: 'success',
    animation: 'bounce',
  },
  error: {
    color: '#dc2626',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    haptic: 'error',
    animation: 'shake',
  },
  warning: {
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    haptic: 'warning',
    animation: 'pulse',
  },
  info: {
    color: '#2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: 'rgba(37, 99, 235, 0.3)',
    haptic: 'light',
    animation: 'fade',
  },
  loading: {
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    animation: 'spin',
  },
  processing: {
    color: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    animation: 'pulse',
  },
  complete: {
    color: '#16a34a',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    haptic: 'success',
    animation: 'expand',
  },
  idle: {
    color: '#6b7280',
    backgroundColor: 'transparent',
    animation: 'none',
  },
};

/**
 * Visual Response Patterns Component
 */
export const VisualResponsePatterns: React.FC<VisualResponsePatternsProps> = ({
  children,
  config = {},
  theme = {},
  className = '',
  onResponseStart,
  onResponseEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationUtils = useRef(TouchAnimationUtils.getInstance());
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { addRipple, createActionRipple } = useRippleEffect();

  // Merge default theme with custom theme
  const mergedTheme = useMemo(() => ({
    success: { ...DEFAULT_THEME.success, ...theme.success },
    error: { ...DEFAULT_THEME.error, ...theme.error },
    warning: { ...DEFAULT_THEME.warning, ...theme.warning },
    info: { ...DEFAULT_THEME.info, ...theme.info },
    loading: { ...DEFAULT_THEME.loading, ...theme.loading },
    processing: { ...DEFAULT_THEME.processing, ...theme.processing },
    complete: { ...DEFAULT_THEME.complete, ...theme.complete },
    idle: { ...DEFAULT_THEME.idle, ...theme.idle },
  }), [theme]);

  // Current pattern state
  const [currentPattern, setCurrentPattern] = React.useState<VisualResponseConfig['pattern']>('idle');
  const [isAnimating, setIsAnimating] = React.useState(false);

  /**
   * Apply visual response pattern
   */
  const applyPattern = useCallback((
    pattern: VisualResponseConfig['pattern'],
    customConfig: Partial<VisualResponseConfig> = {}
  ) => {
    const element = containerRef.current;
    if (!element) return;

    const finalConfig = { ...config, ...customConfig };
    const {
      intensity = 'medium',
      duration = 300,
      enableHaptic = true,
      enableRipple = true,
      enableAnimation = true,
      accessibility = {},
    } = finalConfig;

    const patternConfig = mergedTheme[pattern];
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Notify response start
    onResponseStart?.(pattern);

    // Screen reader announcement
    if (accessibility.screenReaderAnnouncement) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = accessibility.screenReaderAnnouncement;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }

    setCurrentPattern(pattern);
    setIsAnimating(true);

    // Apply ripple effect
    if (enableRipple && pattern !== 'idle') {
      const rippleConfig: RippleConfig = {
        color: patternConfig.color,
        pattern: 'expand',
        multiRipple: pattern === 'success' || pattern === 'complete',
        enableGpuAcceleration: true,
      };

      if (['success', 'error', 'warning', 'info'].includes(pattern)) {
        createActionRipple(centerX, centerY, pattern as any, rippleConfig);
      } else {
        addRipple(centerX, centerY, rippleConfig);
      }
    }

    // Apply haptic feedback
    if (enableHaptic && patternConfig.haptic) {
      triggerHaptic(patternConfig.haptic);
    }

    // Apply visual animation
    if (enableAnimation && patternConfig.animation !== 'none') {
      applyAnimation(element, pattern, patternConfig, duration, intensity);
    }

    // Apply visual styling
    applyVisualStyling(element, patternConfig);

    // Handle special patterns
    if (pattern === 'loading') {
      startLoadingAnimation(element);
    } else if (pattern === 'processing') {
      startProcessingAnimation(element);
    }

    // Set timeout for response end
    setTimeout(() => {
      setIsAnimating(false);
      onResponseEnd?.(pattern);

      if (['success', 'error', 'warning', 'info', 'complete'].includes(pattern)) {
        // Auto-return to idle for feedback patterns
        setTimeout(() => {
          applyPattern('idle');
        }, 1000);
      }
    }, duration);
  }, [config, mergedTheme, addRipple, createActionRipple, triggerHaptic, onResponseStart, onResponseEnd]);

  /**
   * Apply animation based on pattern
   */
  const applyAnimation = (
    element: HTMLElement,
    pattern: string,
    patternConfig: any,
    duration: number,
    intensity: string
  ) => {
    const intensityMultiplier = intensity === 'light' ? 0.7 : intensity === 'strong' ? 1.3 : 1;
    const adjustedDuration = duration * intensityMultiplier;

    switch (patternConfig.animation) {
      case 'bounce':
        animationUtils.current.animateBounce(
          element,
          { scale: 0.9 },
          { duration: adjustedDuration, enableGpuAcceleration: true }
        );
        break;

      case 'pulse':
        animationUtils.current.animatePulse(
          element,
          { duration: adjustedDuration, iterations: 3, enableGpuAcceleration: true }
        );
        break;

      case 'shake':
        animationUtils.current.animateShake(
          element,
          10 * intensityMultiplier,
          { duration: adjustedDuration, enableGpuAcceleration: true }
        );
        break;

      case 'fade':
        animationUtils.current.animateFade(
          element,
          0.7,
          { duration: adjustedDuration, enableGpuAcceleration: true }
        );
        break;

      case 'expand':
        animationUtils.current.animateTransform(
          element,
          { scale: 1.1 },
          { duration: adjustedDuration, enableGpuAcceleration: true }
        );
        break;

      case 'spin':
        startSpinAnimation(element, adjustedDuration);
        break;

      case 'progress':
        startProgressAnimation(element, adjustedDuration);
        break;

      default:
        break;
    }
  };

  /**
   * Apply visual styling
   */
  const applyVisualStyling = (element: HTMLElement, patternConfig: any) => {
    element.style.transition = 'background-color 0.3s ease, border-color 0.3s ease';
    element.style.backgroundColor = patternConfig.backgroundColor;

    if (patternConfig.borderColor) {
      element.style.border = `2px solid ${patternConfig.borderColor}`;
    }
  };

  /**
   * Start loading animation
   */
  const startLoadingAnimation = (element: HTMLElement) => {
    const spinner = document.createElement('div');
    spinner.className = 'visual-response-spinner';
    spinner.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      border: 2px solid rgba(59, 130, 246, 0.3);
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      pointer-events: none;
      z-index: 10;
    `;

    element.appendChild(spinner);
    (element as any)._visualResponseSpinner = spinner;

    // Add CSS animation if not already present
    if (!document.querySelector('#visual-response-animations')) {
      const style = document.createElement('style');
      style.id = 'visual-response-animations';
      style.textContent = `
        @keyframes spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `;
      document.head.appendChild(style);
    }
  };

  /**
   * Start processing animation
   */
  const startProcessingAnimation = (element: HTMLElement) => {
    const progressBar = document.createElement('div');
    progressBar.className = 'visual-response-progress';
    progressBar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #8b5cf6, #6366f1);
      border-radius: 3px;
      pointer-events: none;
      z-index: 10;
      animation: progress 2s ease-in-out infinite;
    `;

    element.appendChild(progressBar);
    (element as any)._visualResponseProgress = progressBar;
  };

  /**
   * Start spin animation
   */
  const startSpinAnimation = (element: HTMLElement, duration: number) => {
    element.style.animation = `spin ${duration}ms linear infinite`;
  };

  /**
   * Start progress animation
   */
  const startProgressAnimation = (element: HTMLElement, duration: number) => {
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(107, 114, 128, 0.2);
      border-radius: 2px;
      overflow: hidden;
    `;

    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6, #6366f1);
      border-radius: 2px;
      animation: progress ${duration}ms ease-in-out infinite;
    `;

    progressContainer.appendChild(progressFill);
    element.appendChild(progressContainer);
    (element as any)._visualResponseProgressContainer = progressContainer;
  };

  /**
   * Clear visual response
   */
  const clearVisualResponse = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;

    // Remove spinner
    const spinner = (element as any)._visualResponseSpinner;
    if (spinner) {
      spinner.remove();
      delete (element as any)._visualResponseSpinner;
    }

    // Remove progress bar
    const progress = (element as any)._visualResponseProgress;
    if (progress) {
      progress.remove();
      delete (element as any)._visualResponseProgress;
    }

    // Remove progress container
    const progressContainer = (element as any)._visualResponseProgressContainer;
    if (progressContainer) {
      progressContainer.remove();
      delete (element as any)._visualResponseProgressContainer;
    }

    // Reset styles
    element.style.animation = '';
    element.style.backgroundColor = '';
    element.style.border = '';
    element.style.transition = '';

    // Cancel animations
    animationUtils.current.cancelAllAnimations(element);

    setCurrentPattern('idle');
    setIsAnimating(false);
  }, []);

  /**
   * Expose methods to parent component
   */
  React.useImperativeHandle(containerRef, () => ({
    applyPattern,
    clearVisualResponse,
    getCurrentPattern: () => currentPattern,
    isAnimating: () => isAnimating,
  }), [applyPattern, clearVisualResponse, currentPattern, isAnimating]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearVisualResponse();
    };
  }, [clearVisualResponse]);

  return (
    <div
      ref={containerRef}
      className={`visual-response-patterns relative overflow-hidden ${className}`}
      data-current-pattern={currentPattern}
      data-is-animating={isAnimating}
    >
      {children}
    </div>
  );
};

/**
 * Hook for using visual response patterns
 */
export const useVisualResponsePatterns = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationUtils = useRef(TouchAnimationUtils.getInstance());
  const { trigger: triggerHaptic } = useHapticFeedback();

  const applyPattern = useCallback((
    element: HTMLElement,
    pattern: VisualResponseConfig['pattern'],
    config: Partial<VisualResponseConfig> = {}
  ) => {
    const patternConfig = DEFAULT_THEME[pattern];
    const {
      enableHaptic = true,
      enableRipple = true,
      enableAnimation = true,
    } = config;

    // Apply haptic feedback
    if (enableHaptic && patternConfig.haptic) {
      triggerHaptic(patternConfig.haptic);
    }

    // Apply animation
    if (enableAnimation && patternConfig.animation !== 'none') {
      switch (patternConfig.animation) {
        case 'bounce':
          animationUtils.current.animateBounce(element, { scale: 0.9 });
          break;
        case 'pulse':
          animationUtils.current.animatePulse(element);
          break;
        case 'shake':
          animationUtils.current.animateShake(element);
          break;
        case 'fade':
          animationUtils.current.animateFade(element, 0.7);
          break;
        case 'expand':
          animationUtils.current.animateTransform(element, { scale: 1.1 });
          break;
      }
    }

    return element;
  }, [triggerHaptic]);

  const showSuccess = useCallback((element: HTMLElement, config?: Partial<VisualResponseConfig>) => {
    return applyPattern(element, 'success', config);
  }, [applyPattern]);

  const showError = useCallback((element: HTMLElement, config?: Partial<VisualResponseConfig>) => {
    return applyPattern(element, 'error', config);
  }, [applyPattern]);

  const showWarning = useCallback((element: HTMLElement, config?: Partial<VisualResponseConfig>) => {
    return applyPattern(element, 'warning', config);
  }, [applyPattern]);

  const showInfo = useCallback((element: HTMLElement, config?: Partial<VisualResponseConfig>) => {
    return applyPattern(element, 'info', config);
  }, [applyPattern]);

  const showLoading = useCallback((element: HTMLElement, config?: Partial<VisualResponseConfig>) => {
    return applyPattern(element, 'loading', config);
  }, [applyPattern]);

  const showProcessing = useCallback((element: HTMLElement, config?: Partial<VisualResponseConfig>) => {
    return applyPattern(element, 'processing', config);
  }, [applyPattern]);

  const showComplete = useCallback((element: HTMLElement, config?: Partial<VisualResponseConfig>) => {
    return applyPattern(element, 'complete', config);
  }, [applyPattern]);

  const clearResponse = useCallback((element: HTMLElement) => {
    animationUtils.current.cancelAllAnimations(element);
    element.style.animation = '';
    element.style.backgroundColor = '';
    element.style.border = '';
  }, []);

  return {
    containerRef,
    applyPattern,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showProcessing,
    showComplete,
    clearResponse,
  };
};

/**
 * Pre-configured visual response components
 */
export const SuccessVisualResponse: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const [showResponse, setShowResponse] = React.useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const triggerSuccess = useCallback(() => {
    if (!elementRef.current) return;

    setShowResponse(true);
    const element = elementRef.current;

    // Apply success animation
    element.style.transition = 'all 0.3s ease';
    element.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
    element.style.borderColor = 'rgba(34, 197, 94, 0.3)';

    const animationUtils = TouchAnimationUtils.getInstance();
    animationUtils.animateBounce(element, { scale: 0.95 });

    setTimeout(() => {
      setShowResponse(false);
      element.style.backgroundColor = '';
      element.style.borderColor = '';
    }, 1000);
  }, []);

  return (
    <div
      ref={elementRef}
      className={`success-visual-response ${className}`}
      onClick={triggerSuccess}
    >
      {children}
      {showResponse && (
        <div className="success-indicator">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

export const ErrorVisualResponse: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const [showResponse, setShowResponse] = React.useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const triggerError = useCallback(() => {
    if (!elementRef.current) return;

    setShowResponse(true);
    const element = elementRef.current;

    // Apply error animation
    element.style.transition = 'all 0.3s ease';
    element.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    element.style.borderColor = 'rgba(239, 68, 68, 0.3)';

    const animationUtils = TouchAnimationUtils.getInstance();
    animationUtils.animateShake(element);

    setTimeout(() => {
      setShowResponse(false);
      element.style.backgroundColor = '';
      element.style.borderColor = '';
    }, 1000);
  }, []);

  return (
    <div
      ref={elementRef}
      className={`error-visual-response ${className}`}
      onClick={triggerError}
    >
      {children}
      {showResponse && (
        <div className="error-indicator">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default {
  VisualResponsePatterns,
  useVisualResponsePatterns,
  SuccessVisualResponse,
  ErrorVisualResponse,
  DEFAULT_THEME,
};
