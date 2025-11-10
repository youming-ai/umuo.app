/**
 * Haptic feedback utilities for enhanced mobile touch experience
 * Provides vibration patterns and haptic feedback for different interactions
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection' | 'impact' | 'custom';

export interface HapticPatternDefinition {
  pattern: number | number[];
  description: string;
  intensity: 'light' | 'medium' | 'heavy';
}

export interface HapticConfig {
  enabled: boolean;
  intensity: number; // 0.0 to 1.0
  patterns: Record<HapticPattern, HapticPatternDefinition>;
  fallbackEnabled: boolean; // Enable visual fallback when haptic not available
}

export class HapticFeedbackManager {
  private static instance: HapticFeedbackManager;
  private config: HapticConfig;
  private isSupported: boolean;
  private isEnabled: boolean;

  private constructor() {
    this.isSupported = this.checkHapticSupport();
    this.isEnabled = this.isSupported && this.getUserPreference();
    this.config = this.getDefaultConfig();
  }

  static getInstance(): HapticFeedbackManager {
    if (!HapticFeedbackManager.instance) {
      HapticFeedbackManager.instance = new HapticFeedbackManager();
    }
    return HapticFeedbackManager.instance;
  }

  /**
   * Check if device supports haptic feedback
   */
  private checkHapticSupport(): boolean {
    return (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'vibrate' in navigator &&
      typeof navigator.vibrate === 'function'
    );
  }

  /**
   * Get user's haptic preference from localStorage
   */
  private getUserPreference(): boolean {
    try {
      const stored = localStorage.getItem('haptic-feedback-enabled');
      return stored !== 'false'; // Default to enabled
    } catch {
      return true;
    }
  }

  /**
   * Get default haptic configuration
   */
  private getDefaultConfig(): HapticConfig {
    const patterns: Record<HapticPattern, HapticPatternDefinition> = {
      light: {
        pattern: 10,
        description: 'Light touch feedback',
        intensity: 'light'
      },
      medium: {
        pattern: 25,
        description: 'Medium touch feedback',
        intensity: 'medium'
      },
      heavy: {
        pattern: 50,
        description: 'Heavy touch feedback',
        intensity: 'heavy'
      },
      success: {
        pattern: [10, 50, 10],
        description: 'Success feedback pattern',
        intensity: 'medium'
      },
      error: {
        pattern: [100, 50, 100],
        description: 'Error feedback pattern',
        intensity: 'heavy'
      },
      warning: {
        pattern: [50, 30, 50],
        description: 'Warning feedback pattern',
        intensity: 'medium'
      },
      selection: {
        pattern: 15,
        description: 'Selection feedback',
        intensity: 'light'
      },
      impact: {
        pattern: 30,
        description: 'Impact feedback',
        intensity: 'medium'
      },
      custom: {
        pattern: 25,
        description: 'Custom feedback pattern',
        intensity: 'medium'
      }
    };

    return {
      enabled: true,
      intensity: 1.0,
      patterns,
      fallbackEnabled: true
    };
  }

  /**
   * Check if haptic feedback is supported and enabled
   */
  isAvailable(): boolean {
    return this.isSupported && this.isEnabled;
  }

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled && this.isSupported;
    try {
      localStorage.setItem('haptic-feedback-enabled', enabled.toString());
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Get current enabled state
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Trigger haptic feedback with specified pattern
   */
  trigger(pattern: HapticPattern, customPattern?: number | number[]): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      let vibrationPattern: number | number[];

      if (pattern === 'custom' && customPattern) {
        vibrationPattern = this.adjustPatternIntensity(customPattern);
      } else {
        const patternDef = this.config.patterns[pattern];
        vibrationPattern = this.adjustPatternIntensity(patternDef.pattern);
      }

      // Apply intensity scaling
      const scaledPattern = Array.isArray(vibrationPattern)
        ? vibrationPattern.map(duration => Math.round(duration * this.config.intensity))
        : Math.round(vibrationPattern * this.config.intensity);

      navigator.vibrate(scaledPattern);
      return true;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  }

  /**
   * Adjust pattern intensity based on device capabilities
   */
  private adjustPatternIntensity(pattern: number | number[]): number | number[] {
    if (Array.isArray(pattern)) {
      return pattern.map(duration => this.scaleDuration(duration));
    }
    return this.scaleDuration(pattern);
  }

  /**
   * Scale vibration duration for optimal device experience
   */
  private scaleDuration(duration: number): number {
    // Scale duration based on device type and screen size
    const deviceType = this.getDeviceType();

    switch (deviceType) {
      case 'mobile':
        return Math.min(duration, 80); // Cap at 80ms for mobile
      case 'tablet':
        return Math.min(duration * 0.8, 60); // Reduce intensity for tablets
      default:
        return duration;
    }
  }

  /**
   * Detect device type for optimization
   */
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;

    if (/Mobi|Android/i.test(userAgent)) {
      return screenWidth < 768 ? 'mobile' : 'tablet';
    }
    return 'desktop';
  }

  /**
   * Trigger light haptic feedback
   */
  light(): boolean {
    return this.trigger('light');
  }

  /**
   * Trigger medium haptic feedback
   */
  medium(): boolean {
    return this.trigger('medium');
  }

  /**
   * Trigger heavy haptic feedback
   */
  heavy(): boolean {
    return this.trigger('heavy');
  }

  /**
   * Trigger success haptic feedback
   */
  success(): boolean {
    return this.trigger('success');
  }

  /**
   * Trigger error haptic feedback
   */
  error(): boolean {
    return this.trigger('error');
  }

  /**
   * Trigger warning haptic feedback
   */
  warning(): boolean {
    return this.trigger('warning');
  }

  /**
   * Trigger selection haptic feedback
   */
  selection(): boolean {
    return this.trigger('selection');
  }

  /**
   * Trigger impact haptic feedback
   */
  impact(): boolean {
    return this.trigger('impact');
  }

  /**
   * Trigger custom haptic pattern
   */
  custom(pattern: number | number[]): boolean {
    return this.trigger('custom', pattern);
  }

  /**
   * Stop any ongoing vibration
   */
  stop(): void {
    if (this.isAvailable()) {
      navigator.vibrate(0);
    }
  }

  /**
   * Set haptic intensity (0.0 to 1.0)
   */
  setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Get current intensity
   */
  getIntensity(): number {
    return this.config.intensity;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HapticConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): HapticConfig {
    return { ...this.config };
  }

  /**
   * Get device-specific haptic capabilities
   */
  getCapabilities(): {
    supported: boolean;
    enabled: boolean;
    maxDuration: number;
    patterns: string[];
    deviceType: string;
  } {
    return {
      supported: this.isSupported,
      enabled: this.isEnabled,
      maxDuration: this.getMaxVibrationDuration(),
      patterns: Object.keys(this.config.patterns),
      deviceType: this.getDeviceType()
    };
  }

  /**
   * Get maximum vibration duration for device
   */
  private getMaxVibrationDuration(): number {
    const deviceType = this.getDeviceType();

    switch (deviceType) {
      case 'mobile':
        return 100;
      case 'tablet':
        return 80;
      default:
        return 50;
    }
  }

  /**
   * Test haptic feedback with all patterns
   */
  async testPatterns(): Promise<boolean[]> {
    const results: boolean[] = [];
    const patterns: HapticPattern[] = ['light', 'medium', 'heavy', 'success', 'error', 'warning'];

    for (const pattern of patterns) {
      results.push(this.trigger(pattern));
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait between patterns
    }

    return results;
  }

  /**
   * Create haptic-aware component props
   */
  createHapticProps(pattern?: HapticPattern) {
    return {
      'data-haptic': pattern || 'light',
      'aria-label': `Haptic feedback: ${pattern || 'light'}`,
      onTouchStart: () => {
        if (pattern) {
          this.trigger(pattern);
        } else {
          this.light();
        }
      }
    };
  }

  /**
   * Batch trigger multiple patterns
   */
  batch(patterns: Array<{ pattern: HapticPattern; delay?: number }>): void {
    patterns.forEach(({ pattern, delay }) => {
      setTimeout(() => {
        this.trigger(pattern);
      }, delay || 0);
    });
  }

  /**
   * Create contextual haptic feedback for player actions
   */
  playerAction(action: 'play' | 'pause' | 'seek' | 'volume' | 'speed' | 'skip'): boolean {
    switch (action) {
      case 'play':
      case 'pause':
        return this.trigger('medium');
      case 'seek':
        return this.trigger('light');
      case 'volume':
        return this.trigger('selection');
      case 'speed':
        return this.trigger('impact');
      case 'skip':
        return this.trigger('heavy');
      default:
        return this.light();
    }
  }

  /**
   * Create contextual haptic feedback for gestures
   */
  gestureFeedback(gesture: 'tap' | 'doubleTap' | 'swipe' | 'longPress' | 'pinch'): boolean {
    switch (gesture) {
      case 'tap':
        return this.trigger('light');
      case 'doubleTap':
        return this.trigger('medium');
      case 'swipe':
        return this.trigger('impact');
      case 'longPress':
        return this.trigger('heavy');
      case 'pinch':
        return this.trigger('selection');
      default:
        return this.light();
    }
  }
}

// Export singleton instance
export const hapticFeedback = HapticFeedbackManager.getInstance();

// Export convenience functions
export const triggerHaptic = (pattern: HapticPattern, customPattern?: number | number[]): boolean => {
  return hapticFeedback.trigger(pattern, customPattern);
};

export const hapticLight = (): boolean => hapticFeedback.light();
export const hapticMedium = (): boolean => hapticFeedback.medium();
export const hapticHeavy = (): boolean => hapticFeedback.heavy();
export const hapticSuccess = (): boolean => hapticFeedback.success();
export const hapticError = (): boolean => hapticFeedback.error();
export const hapticWarning = (): boolean => hapticFeedback.warning();
export const hapticSelection = (): boolean => hapticFeedback.selection();
export const hapticImpact = (): boolean => hapticFeedback.impact();

// React hook for haptic feedback
export const useHapticFeedback = () => {
  const trigger = (pattern: HapticPattern, customPattern?: number | number[]): boolean => {
    return hapticFeedback.trigger(pattern, customPattern);
  };

  return {
    trigger,
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    success: hapticSuccess,
    error: hapticError,
    warning: hapticWarning,
    selection: hapticSelection,
    impact: hapticImpact,
    custom: (pattern: number | number[]) => hapticFeedback.custom(pattern),
    playerAction: (action: Parameters<typeof hapticFeedback.playerAction>[0]) =>
      hapticFeedback.playerAction(action),
    gestureFeedback: (gesture: Parameters<typeof hapticFeedback.gestureFeedback>[0]) =>
      hapticFeedback.gestureFeedback(gesture),
    enabled: hapticFeedback.getEnabled(),
    supported: hapticFeedback.isAvailable(),
    setEnabled: hapticFeedback.setEnabled.bind(hapticFeedback),
    setIntensity: hapticFeedback.setIntensity.bind(hapticFeedback),
    getIntensity: hapticFeedback.getIntensity.bind(hapticFeedback),
    capabilities: hapticFeedback.getCapabilities(),
  };
};
