/**
 * Accessibility Configuration Module
 */

import type { AccessibilityConfig } from '../types';
import { accessibilityConfigSchema } from '../schemas';
import { getConfigurationManager } from '../manager';

export class AccessibilityConfigManager {
  private configManager = getConfigurationManager();

  /**
   * Get current accessibility configuration
   */
  getConfiguration(): AccessibilityConfig {
    return this.configManager.get<AccessibilityConfig>('accessibility') || {};
  }

  /**
   * Update accessibility configuration
   */
  async updateConfiguration(updates: Partial<AccessibilityConfig>): Promise<void> {
    const validation = accessibilityConfigSchema.partial().safeParse(updates);
    if (!validation.success) {
      throw new Error(`Invalid accessibility configuration: ${validation.error.message}`);
    }

    await this.configManager.updateMany(
      Object.entries(updates).map(([key, value]) => ({
        key: `accessibility.${key}`,
        value,
        scope: 'user'
      }))
    );
  }

  /**
   * Reset accessibility configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfig = accessibilityConfigSchema.parse({});
    await this.configManager.set('accessibility', defaultConfig, { scope: 'user', immediate: true });
  }

  /**
   * Get WCAG compliance configuration
   */
  getWCAGConfiguration(): {
    level: 'AA' | 'AAA';
    autoContrast: boolean;
    autoFontSizing: boolean;
    autoSpacing: boolean;
    validateColorContrast: boolean;
    validateFocusIndicators: boolean;
  } {
    const config = this.getConfiguration();

    return {
      level: config.wcagLevel,
      autoContrast: config.enableHighContrast,
      autoFontSizing: config.fontSize !== 'medium',
      autoSpacing: config.fontSize !== 'medium',
      validateColorContrast: config.enableHighContrast,
      validateFocusIndicators: config.enableFocusIndicators
    };
  }

  /**
   * Get screen reader configuration
   */
  getScreenReaderConfiguration(): {
    enabled: boolean;
    announceChanges: boolean;
    verboseMode: boolean;
    announcements: {
      playbackStatus: boolean;
      transcriptionStatus: boolean;
      errors: boolean;
      fileOperations: boolean;
    };
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.enableScreenReader,
      announceChanges: config.enableScreenReader,
      verboseMode: config.enableScreenReader,
      announcements: {
        playbackStatus: true,
        transcriptionStatus: true,
        errors: true,
        fileOperations: config.enableScreenReader
      }
    };
  }

  /**
   * Get keyboard navigation configuration
   */
  getKeyboardNavigationConfiguration(): {
    enabled: boolean;
    focusIndicators: boolean;
    trapFocus: boolean;
    skipLinks: boolean;
    shortcuts: {
      enabled: boolean;
      customShortcuts: Record<string, string>;
    };
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.enableKeyboardNavigation,
      focusIndicators: config.enableFocusIndicators,
      trapFocus: config.enableKeyboardNavigation,
      skipLinks: config.enableKeyboardNavigation,
      shortcuts: {
        enabled: config.enableKeyboardNavigation,
        customShortcuts: {
          'space': 'toggle-playback',
          'arrowleft': 'seek-backward',
          'arrowright': 'seek-forward',
          'arrowup': 'volume-up',
          'arrowdown': 'volume-down',
          'f': 'toggle-fullscreen',
          'c': 'toggle-subtitles',
          's': 'toggle-settings'
        }
      }
    };
  }

  /**
   * Get visual accessibility configuration
   */
  getVisualAccessibilityConfiguration(): {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    highContrast: boolean;
    reducedMotion: boolean;
    focusIndicators: boolean;
    colorBlindSupport: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
    visualIndicators: boolean;
    textEnhancements: {
      increasedLetterSpacing: boolean;
      increasedLineHeight: boolean;
      increasedWordSpacing: boolean;
      dyslexiaFont: boolean;
    };
  } {
    const config = this.getConfiguration();

    return {
      fontSize: config.fontSize,
      highContrast: config.enableHighContrast,
      reducedMotion: config.enableReducedMotion,
      focusIndicators: config.enableFocusIndicators,
      colorBlindSupport: config.colorBlindSupport,
      visualIndicators: config.visualIndicators,
      textEnhancements: {
        increasedLetterSpacing: config.fontSize === 'large' || config.fontSize === 'extra-large',
        increasedLineHeight: config.fontSize === 'large' || config.fontSize === 'extra-large',
        increasedWordSpacing: config.fontSize === 'large' || config.fontSize === 'extra-large',
        dyslexiaFont: config.fontSize !== 'medium'
      }
    };
  }

  /**
   * Get text-to-speech configuration
   */
  getTextToSpeechConfiguration(): {
    enabled: boolean;
    speechRate: number;
    voice: string;
    pitch: number;
    volume: number;
    highlightWords: boolean;
    autoSpeak: {
      transcriptions: boolean;
      subtitles: boolean;
      errors: boolean;
    };
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.enableTextToSpeech,
      speechRate: config.speechRate,
      voice: 'default',
      pitch: 1.0,
      volume: 0.8,
      highlightWords: config.enableTextToSpeech,
      autoSpeak: {
        transcriptions: config.enableTextToSpeech,
        subtitles: config.enableTextToSpeech,
        errors: config.enableTextToSpeech
      }
    };
  }

  /**
   * Get alternative input configuration
   */
  getAlternativeInputConfiguration(): {
    enabled: boolean;
    voiceCommands: boolean;
    gestureControls: boolean;
    switchNavigation: boolean;
    eyeTracking: boolean;
    inputMethods: {
      voice: boolean;
      gestures: boolean;
      switches: boolean;
      eyeTracking: boolean;
    };
  } {
    const config = this.getConfiguration();

    return {
      enabled: config.enableAlternativeInput,
      voiceCommands: config.enableAlternativeInput,
      gestureControls: config.enableAlternativeInput,
      switchNavigation: config.enableAlternativeInput,
      eyeTracking: false, // Not supported yet
      inputMethods: {
        voice: config.enableAlternativeInput,
        gestures: config.enableAlternativeInput,
        switches: config.enableAlternativeInput,
        eyeTracking: false
      }
    };
  }

  /**
   * Optimize accessibility configuration based on user preferences and device capabilities
   */
  optimizeForUser(userProfile: {
    hasVisualImpairment: boolean;
    hasHearingImpairment: boolean;
    hasMotorImpairment: boolean;
    hasCognitiveImpairment: boolean;
    preferredInputMethod?: 'keyboard' | 'voice' | 'touch' | 'switch';
    age?: number;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  }): Partial<AccessibilityConfig> {
    const optimizations: Partial<AccessibilityConfig> = {};

    // Visual impairments
    if (userProfile.hasVisualImpairment) {
      optimizations.wcagLevel = 'AAA';
      optimizations.enableScreenReader = true;
      optimizations.enableHighContrast = true;
      optimizations.enableFocusIndicators = true;
      optimizations.fontSize = userProfile.age && userProfile.age > 60 ? 'large' : 'medium';
      optimizations.enableKeyboardNavigation = true;
      optimizations.enableAlternativeInput = true;
      optimizations.visualIndicators = true;
    }

    // Hearing impairments
    if (userProfile.hasHearingImpairment) {
      optimizations.enableTextToSpeech = false;
      optimizations.enableScreenReader = true;
      optimizations.visualIndicators = true;
      optimizations.enableKeyboardNavigation = true;
    }

    // Motor impairments
    if (userProfile.hasMotorImpairment) {
      optimizations.fontSize = 'large';
      optimizations.enableKeyboardNavigation = true;
      optimizations.enableAlternativeInput = true;
      optimizations.enableFocusIndicators = true;
      optimizations.visualIndicators = true;
    }

    // Cognitive impairments
    if (userProfile.hasCognitiveImpairment) {
      optimizations.wcagLevel = 'AAA';
      optimizations.fontSize = 'large';
      optimizations.enableScreenReader = true;
      optimizations.enableTextToSpeech = true;
      optimizations.speechRate = 0.8; // Slower speech
      optimizations.visualIndicators = true;
    }

    // Preferred input method
    if (userProfile.preferredInputMethod) {
      switch (userProfile.preferredInputMethod) {
        case 'keyboard':
          optimizations.enableKeyboardNavigation = true;
          optimizations.enableFocusIndicators = true;
          break;
        case 'voice':
          optimizations.enableTextToSpeech = true;
          optimizations.enableAlternativeInput = true;
          break;
        case 'touch':
          optimizations.fontSize = 'large';
          optimizations.visualIndicators = true;
          break;
        case 'switch':
          optimizations.enableAlternativeInput = true;
          optimizations.enableKeyboardNavigation = true;
          optimizations.enableFocusIndicators = true;
          break;
      }
    }

    // Experience level
    if (userProfile.experienceLevel === 'beginner') {
      optimizations.enableScreenReader = true;
      optimizations.enableTextToSpeech = true;
      optimizations.visualIndicators = true;
      optimizations.enableKeyboardNavigation = true;
    }

    return optimizations;
  }

  /**
   * Get accessibility configuration for specific disability types
   */
  getConfigurationForDisability(disabilityType: 'visual' | 'hearing' | 'motor' | 'cognitive' | 'multiple'): Partial<AccessibilityConfig> {
    switch (disabilityType) {
      case 'visual':
        return {
          wcagLevel: 'AAA',
          enableScreenReader: true,
          enableHighContrast: true,
          enableFocusIndicators: true,
          fontSize: 'large',
          enableKeyboardNavigation: true,
          enableAlternativeInput: true,
          visualIndicators: true,
          colorBlindSupport: 'protanopia'
        };

      case 'hearing':
        return {
          wcagLevel: 'AA',
          enableScreenReader: true,
          enableTextToSpeech: false,
          enableKeyboardNavigation: true,
          visualIndicators: true,
          enableAlternativeInput: false
        };

      case 'motor':
        return {
          wcagLevel: 'AA',
          fontSize: 'large',
          enableKeyboardNavigation: true,
          enableFocusIndicators: true,
          enableAlternativeInput: true,
          visualIndicators: true,
          enableScreenReader: true
        };

      case 'cognitive':
        return {
          wcagLevel: 'AAA',
          fontSize: 'large',
          enableScreenReader: true,
          enableTextToSpeech: true,
          speechRate: 0.8,
          visualIndicators: true,
          enableKeyboardNavigation: true,
          enableReducedMotion: true
        };

      case 'multiple':
        return {
          wcagLevel: 'AAA',
          enableScreenReader: true,
          enableHighContrast: true,
          enableFocusIndicators: true,
          fontSize: 'extra-large',
          enableKeyboardNavigation: true,
          enableAlternativeInput: true,
          enableTextToSpeech: true,
          speechRate: 0.8,
          visualIndicators: true,
          enableReducedMotion: true
        };

      default:
        return {};
    }
  }

  /**
   * Validate accessibility configuration
   */
  validateConfiguration(config: Partial<AccessibilityConfig>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Speech rate validation
    if (config.speechRate !== undefined) {
      if (config.speechRate < 0.5) {
        warnings.push('Speech rate is very slow, user may find it frustrating');
      } else if (config.speechRate > 3) {
        warnings.push('Speech rate is very fast, may be difficult to understand');
      }
    }

    // Feature compatibility warnings
    if (config.enableScreenReader === false && config.enableTextToSpeech === true) {
      warnings.push('Text-to-speech works best with screen reader enabled');
    }

    if (config.enableHighContrast === true && config.colorBlindSupport !== 'none') {
      warnings.push('High contrast and color blind support may conflict');
    }

    if (config.enableKeyboardNavigation === false && config.enableAlternativeInput === true) {
      warnings.push('Alternative input methods work best with keyboard navigation');
    }

    // WCAG level recommendations
    if (config.wcagLevel === 'AAA') {
      if (!config.enableScreenReader) {
        warnings.push('WCAG AAA recommends screen reader support');
      }
      if (!config.enableKeyboardNavigation) {
        warnings.push('WCAG AAA requires keyboard navigation');
      }
      if (!config.enableFocusIndicators) {
        errors.push('WCAG AAA requires visible focus indicators');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get recommended configuration for specific scenarios
   */
  getRecommendedConfiguration(scenario: 'elderly' | 'children' | 'education' | 'public-kiosk'): Partial<AccessibilityConfig> {
    switch (scenario) {
      case 'elderly':
        return {
          wcagLevel: 'AAA',
          fontSize: 'large',
          enableScreenReader: true,
          enableTextToSpeech: true,
          speechRate: 0.8,
          enableHighContrast: true,
          enableFocusIndicators: true,
          enableKeyboardNavigation: true,
          visualIndicators: true,
          enableReducedMotion: true
        };

      case 'children':
        return {
          wcagLevel: 'AA',
          fontSize: 'large',
          enableTextToSpeech: true,
          speechRate: 1.2,
          enableKeyboardNavigation: true,
          visualIndicators: true,
          enableAlternativeInput: true
        };

      case 'education':
        return {
          wcagLevel: 'AA',
          fontSize: 'medium',
          enableScreenReader: true,
          enableTextToSpeech: true,
          enableKeyboardNavigation: true,
          enableFocusIndicators: true,
          visualIndicators: true,
          enableAlternativeInput: false
        };

      case 'public-kiosk':
        return {
          wcagLevel: 'AAA',
          fontSize: 'large',
          enableScreenReader: true,
          enableHighContrast: true,
          enableKeyboardNavigation: true,
          enableFocusIndicators: true,
          visualIndicators: true,
          enableAlternativeInput: false,
          enableReducedMotion: true
        };

      default:
        return {};
    }
  }

  /**
   * Export accessibility configuration
   */
  async exportConfiguration(): Promise<string> {
    const config = this.getConfiguration();
    return JSON.stringify({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      configuration: config,
      metadata: {
        description: 'Accessibility configuration',
        exportedBy: 'AccessibilityConfigManager'
      }
    }, null, 2);
  }

  /**
   * Import accessibility configuration
   */
  async importConfiguration(data: string, options: {
    overwrite?: boolean;
    validateOnly?: boolean;
  } = {}): Promise<void> {
    const { overwrite = true, validateOnly = false } = options;

    try {
      const importData = JSON.parse(data);

      // Validate imported configuration
      const validation = accessibilityConfigSchema.safeParse(importData.configuration);
      if (!validation.success) {
        throw new Error(`Invalid accessibility configuration: ${validation.error.message}`);
      }

      if (validateOnly) {
        return;
      }

      if (overwrite) {
        await this.configManager.set('accessibility', validation.data, {
          scope: 'user',
          immediate: true
        });
      } else {
        await this.updateConfiguration(validation.data);
      }

    } catch (error) {
      throw new Error(`Failed to import accessibility configuration: ${error}`);
    }
  }
}

// Export singleton instance
export const accessibilityConfigManager = new AccessibilityConfigManager();
