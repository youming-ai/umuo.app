/**
 * Accessibility Manager for Touch Feedback
 * Provides comprehensive accessibility support including reduced motion, screen reader support, and custom feedback options
 */

export interface AccessibilityConfig {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderEnabled: boolean;
  customFeedbackEnabled: boolean;
  hapticPreference: 'enabled' | 'disabled' | 'reduced';
  visualFeedbackLevel: 'none' | 'minimal' | 'normal' | 'enhanced';
  audioFeedbackEnabled: boolean;
  keyboardNavigationEnabled: boolean;
  touchAlternativesEnabled: boolean;
  colorBlindSupport: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  fontSize: 'small' | 'normal' | 'large' | 'extra-large';
}

export interface ScreenReaderAnnouncement {
  message: string;
  priority: 'polite' | 'assertive' | 'off';
  timeout?: number;
}

export interface AlternativeFeedback {
  type: 'audio' | 'visual' | 'haptic' | 'keyboard';
  intensity: number;
  duration: number;
  pattern?: string;
}

export interface TouchAccessibilityAdapter {
  element: HTMLElement;
  originalHandlers: any;
  alternativeHandlers: any;
  announcements: ScreenReaderAnnouncement[];
}

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private config: AccessibilityConfig;
  private mediaQueries: Map<string, MediaQueryList> = new Map();
  private adapters: WeakMap<HTMLElement, TouchAccessibilityAdapter> = new WeakMap();
  private announcementQueue: ScreenReaderAnnouncement[] = [];
  private announcementElement: HTMLElement | null = null;
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AccessibilityConfig {
    return {
      reducedMotion: false,
      highContrast: false,
      screenReaderEnabled: false,
      customFeedbackEnabled: true,
      hapticPreference: 'enabled',
      visualFeedbackLevel: 'normal',
      audioFeedbackEnabled: false,
      keyboardNavigationEnabled: true,
      touchAlternativesEnabled: true,
      colorBlindSupport: 'none',
      fontSize: 'normal',
    };
  }

  /**
   * Initialize accessibility manager
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Detect user preferences
    this.detectUserPreferences();

    // Setup media query listeners
    this.setupMediaQueryListeners();

    // Create announcement container
    this.createAnnouncementContainer();

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // Add CSS for accessibility
    this.addAccessibilityCSS();

    this.isInitialized = true;
  }

  /**
   * Detect user accessibility preferences
   */
  private detectUserPreferences(): void {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.config.reducedMotion = prefersReducedMotion.matches;

    // Check for high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
    this.config.highContrast = prefersHighContrast.matches;

    // Check for screen reader usage (heuristic)
    this.detectScreenReader();

    // Check browser/OS accessibility settings
    this.detectSystemAccessibility();

    // Store media queries for later reference
    this.mediaQueries.set('reducedMotion', prefersReducedMotion);
    this.mediaQueries.set('highContrast', prefersHighContrast);
  }

  /**
   * Detect screen reader usage
   */
  private detectScreenReader(): void {
    // Common screen reader detection heuristics
    const hasScreenReader =
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      window.speechSynthesis ||
      ('aria-live' in document.documentElement) ||
      (window as any).webkitSpeechRecognition;

    // Check if user has enabled screen reader mode
    const storedPreference = localStorage.getItem('screen-reader-enabled');

    this.config.screenReaderEnabled = hasScreenReader || storedPreference === 'true';
  }

  /**
   * Detect system accessibility settings
   */
  private detectSystemAccessibility(): void {
    // Check for system font size
    const fontSize = window.getComputedStyle(document.documentElement).fontSize;
    const fontSizeNum = parseInt(fontSize);

    if (fontSizeNum < 14) {
      this.config.fontSize = 'small';
    } else if (fontSizeNum > 18) {
      this.config.fontSize = 'extra-large';
    } else if (fontSizeNum > 16) {
      this.config.fontSize = 'large';
    }

    // Check for high contrast mode (Windows)
    if (window.matchMedia('(forced-colors: active)').matches) {
      this.config.highContrast = true;
    }
  }

  /**
   * Setup media query listeners for dynamic preference changes
   */
  private setupMediaQueryListeners(): void {
    this.mediaQueries.forEach((mediaQuery, key) => {
      mediaQuery.addEventListener('change', (e) => {
        switch (key) {
          case 'reducedMotion':
            this.config.reducedMotion = e.matches;
            this.updateReducedMotion();
            break;
          case 'highContrast':
            this.config.highContrast = e.matches;
            this.updateHighContrast();
            break;
        }
      });
    });
  }

  /**
   * Create screen reader announcement container
   */
  private createAnnouncementContainer(): void {
    if (!this.announcementElement) {
      this.announcementElement = document.createElement('div');
      this.announcementElement.setAttribute('aria-live', 'polite');
      this.announcementElement.setAttribute('aria-atomic', 'true');
      this.announcementElement.className = 'sr-only accessibility-announcements';
      this.announcementElement.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(this.announcementElement);
    }
  }

  /**
   * Setup keyboard navigation for touch alternatives
   */
  private setupKeyboardNavigation(): void {
    if (!this.config.keyboardNavigationEnabled) return;

    // Add keyboard event listeners for touch alternatives
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  /**
   * Add accessibility CSS
   */
  private addAccessibilityCSS(): void {
    const style = document.createElement('style');
    style.id = 'accessibility-styles';
    style.textContent = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      .high-contrast .touch-feedback-ripple {
        border: 2px solid currentColor;
      }

      .reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }

      .keyboard-focusable {
        position: relative;
      }

      .keyboard-focusable:focus {
        outline: 3px solid #0066cc;
        outline-offset: 2px;
        border-radius: 4px;
      }

      .touch-alternative {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        padding: 8px;
        border: 2px solid transparent;
        border-radius: 4px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .touch-alternative:hover,
      .touch-alternative:focus {
        border-color: currentColor;
        background: rgba(0, 0, 0, 0.1);
      }

      .color-blind-protanopia {
        filter: url(#protanopia-filter);
      }

      .color-blind-deuteranopia {
        filter: url(#deuteranopia-filter);
      }

      .color-blind-tritanopia {
        filter: url(#tritanopia-filter);
      }

      .accessibility-announcement {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }

      @media (prefers-contrast: high) {
        .touch-feedback-ripple {
          border: 2px solid ButtonText;
        }

        .touch-feedback-button {
          border: 2px solid ButtonText;
        }
      }

      @media (forced-colors: active) {
        .touch-feedback-ripple {
          border: 2px solid CanvasText;
        }
      }

      /* SVG filters for color blindness support */
      .color-blind-filters {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
      }
    `;

    document.head.appendChild(style);

    // Add SVG filters for color blindness
    this.addColorBlindFilters();
  }

  /**
   * Add SVG filters for color blindness support
   */
  private addColorBlindFilters(): void {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.className = 'color-blind-filters';
    svg.innerHTML = `
      <defs>
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="
            0.567, 0.433, 0,     0, 0
            0.558, 0.442, 0,     0, 0
            0,     0.242, 0.758, 0, 0
            0,     0,     0,     1, 0
          "/>
        </filter>
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="
            0.625, 0.375, 0,   0, 0
            0.7,   0.3,   0,   0, 0
            0,     0.3,   0.7, 0, 0
            0,     0,     0,   1, 0
          "/>
        </filter>
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="
            0.95, 0.05,  0,     0, 0
            0,    0.433, 0.567, 0, 0
            0,    0.475, 0.525, 0, 0
            0,    0,     0,     1, 0
          "/>
        </filter>
      </defs>
    `;

    document.body.appendChild(svg);
  }

  /**
   * Handle keyboard events for touch alternatives
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.config.touchAlternativesEnabled) return;

    const target = event.target as HTMLElement;
    const touchAlternative = target.closest('.touch-alternative');

    if (touchAlternative) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.simulateTouchEvent(touchAlternative);
      }
    }
  }

  /**
   * Handle keyboard key up events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const touchAlternative = target.closest('.touch-alternative');

    if (touchAlternative && (event.key === 'Enter' || event.key === ' ')) {
      this.simulateTouchEnd(touchAlternative);
    }
  }

  /**
   * Simulate touch event for keyboard alternative
   */
  private simulateTouchEvent(element: HTMLElement): void {
    // Create and dispatch touch-like events
    const touchEvent = new CustomEvent('touch-alternative', {
      bubbles: true,
      cancelable: true,
      detail: { type: 'touchstart', element },
    });

    element.dispatchEvent(touchEvent);

    // Provide visual feedback
    element.style.transform = 'scale(0.95)';
    element.style.transition = 'transform 0.1s ease';
  }

  /**
   * Simulate touch end for keyboard alternative
   */
  private simulateTouchEnd(element: HTMLElement): void {
    // Create and dispatch touch-like events
    const touchEvent = new CustomEvent('touch-alternative', {
      bubbles: true,
      cancelable: true,
      detail: { type: 'touchend', element },
    });

    element.dispatchEvent(touchEvent);

    // Reset visual feedback
    element.style.transform = 'scale(1)';

    // Trigger click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(clickEvent);
  }

  /**
   * Update reduced motion settings
   */
  private updateReducedMotion(): void {
    if (this.config.reducedMotion) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  }

  /**
   * Update high contrast settings
   */
  private updateHighContrast(): void {
    if (this.config.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }

  /**
   * Make element touch accessible
   */
  public makeTouchAccessible(
    element: HTMLElement,
    options: {
      label?: string;
      description?: string;
      role?: string;
      keyboardAlternative?: boolean;
      visualAlternative?: boolean;
      hapticAlternative?: boolean;
    } = {}
  ): void {
    const {
      label,
      description,
      role = 'button',
      keyboardAlternative = this.config.keyboardNavigationEnabled,
      visualAlternative = this.config.touchAlternativesEnabled,
      hapticAlternative = this.config.hapticPreference !== 'disabled',
    } = options;

    // Add accessibility attributes
    if (label) {
      element.setAttribute('aria-label', label);
    }

    if (description) {
      element.setAttribute('aria-describedby', description);
    }

    element.setAttribute('role', role);
    element.setAttribute('tabindex', element.tabIndex >= 0 ? element.tabIndex : '0');

    // Add keyboard alternative
    if (keyboardAlternative) {
      this.addKeyboardAlternative(element);
    }

    // Add visual alternative
    if (visualAlternative) {
      this.addVisualAlternative(element);
    }

    // Add haptic alternative
    if (hapticAlternative) {
      this.addHapticAlternative(element);
    }

    // Add focus styles
    element.classList.add('keyboard-focusable');

    // Store original accessibility state
    const adapter: TouchAccessibilityAdapter = {
      element,
      originalHandlers: {},
      alternativeHandlers: {},
      announcements: [],
    };

    this.adapters.set(element, adapter);
  }

  /**
   * Add keyboard alternative for touch element
   */
  private addKeyboardAlternative(element: HTMLElement): void {
    // Create keyboard alternative button
    const keyboardBtn = document.createElement('button');
    keyboardBtn.className = 'touch-alternative keyboard-alternative';
    keyboardBtn.setAttribute('aria-label', 'Keyboard alternative');
    keyboardBtn.innerHTML = this.getKeyboardAlternativeIcon();

    // Position the alternative
    keyboardBtn.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    // Show on focus or hover
    const showAlternative = () => {
      keyboardBtn.style.opacity = '1';
    };

    const hideAlternative = () => {
      keyboardBtn.style.opacity = '0';
    };

    element.addEventListener('focus', showAlternative);
    element.addEventListener('mouseenter', showAlternative);
    element.addEventListener('blur', hideAlternative);
    element.addEventListener('mouseleave', hideAlternative);

    // Clone event handlers
    keyboardBtn.addEventListener('click', () => {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(clickEvent);
    });

    // Ensure parent has relative positioning
    const parent = element.parentElement;
    if (parent && window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    parent?.appendChild(keyboardBtn);
  }

  /**
   * Add visual alternative for touch element
   */
  private addVisualAlternative(element: HTMLElement): void {
    // Add visual indicators
    element.setAttribute('data-touchable', 'true');

    // Add visual feedback class
    element.classList.add('visually-enhanced');

    // Style for visual feedback
    if (!document.querySelector('#visual-alternative-styles')) {
      const style = document.createElement('style');
      style.id = 'visual-alternative-styles';
      style.textContent = `
        .visually-enhanced[data-touchable="true"] {
          position: relative;
          cursor: pointer;
        }

        .visually-enhanced[data-touchable="true"]:hover,
        .visually-enhanced[data-touchable="true"]:focus {
          outline: 2px solid currentColor;
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.1);
        }

        .visually-enhanced[data-touchable="true"]::before {
          content: '';
          position: absolute;
          inset: -4px;
          border: 2px dashed transparent;
          border-radius: inherit;
          transition: border-color 0.2s ease;
          pointer-events: none;
        }

        .visually-enhanced[data-touchable="true"]:hover::before,
        .visually-enhanced[data-touchable="true"]:focus::before {
          border-color: currentColor;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Add haptic alternative for touch element
   */
  private addHapticAlternative(element: HTMLElement): void {
    if (this.config.hapticPreference === 'disabled') return;

    element.addEventListener('focus', () => {
      if (window.hapticFeedback) {
        const intensity = this.config.hapticPreference === 'reduced' ? 'light' : 'medium';
        window.hapticFeedback.trigger(intensity);
      }
    });

    element.addEventListener('click', () => {
      if (window.hapticFeedback) {
        window.hapticFeedback.trigger('light');
      }
    });
  }

  /**
   * Get keyboard alternative icon
   */
  private getKeyboardAlternativeIcon(): string {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01" />
        <path d="M10 12h4" />
        <path d="M8 16h8" />
      </svg>
    `;
  }

  /**
   * Announce message to screen readers
   */
  public announce(message: string, priority: 'polite' | 'assertive' | 'off' = 'polite'): void {
    if (!this.config.screenReaderEnabled) return;

    const announcement: ScreenReaderAnnouncement = {
      message,
      priority,
      timeout: 1000,
    };

    if (priority === 'assertive') {
      this.announceImmediately(announcement);
    } else {
      this.announcementQueue.push(announcement);
      this.processAnnouncementQueue();
    }
  }

  /**
   * Announce message immediately
   */
  private announceImmediately(announcement: ScreenReaderAnnouncement): void {
    if (!this.announcementElement) return;

    this.announcementElement.setAttribute('aria-live', announcement.priority);
    this.announcementElement.textContent = announcement.message;

    if (announcement.timeout) {
      setTimeout(() => {
        this.announcementElement!.textContent = '';
      }, announcement.timeout);
    }
  }

  /**
   * Process announcement queue
   */
  private processAnnouncementQueue(): void {
    if (this.announcementQueue.length === 0) return;

    const announcement = this.announcementQueue.shift();
    if (announcement) {
      this.announceImmediately(announcement);

      // Process next announcement after a delay
      setTimeout(() => {
        this.processAnnouncementQueue();
      }, (announcement.timeout || 1000) + 100);
    }
  }

  /**
   * Create alternative feedback for users who can't perceive standard feedback
   */
  public createAlternativeFeedback(
    type: 'touch' | 'gesture' | 'action',
    feedback: AlternativeFeedback
  ): void {
    switch (feedback.type) {
      case 'audio':
        if (this.config.audioFeedbackEnabled) {
          this.playAudioFeedback(feedback);
        }
        break;

      case 'visual':
        if (this.config.visualFeedbackLevel !== 'none') {
          this.showVisualFeedback(feedback);
        }
        break;

      case 'haptic':
        if (this.config.hapticPreference !== 'disabled') {
          this.triggerHapticFeedback(feedback);
        }
        break;

      case 'keyboard':
        if (this.config.keyboardNavigationEnabled) {
          this.showKeyboardFeedback(feedback);
        }
        break;
    }

    // Always announce to screen readers
    const message = this.generateFeedbackMessage(type, feedback);
    if (message) {
      this.announce(message);
    }
  }

  /**
   * Play audio feedback
   */
  private playAudioFeedback(feedback: AlternativeFeedback): void {
    if (!window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance();
    utterance.text = this.generateAudioDescription(feedback);
    utterance.volume = feedback.intensity;
    utterance.rate = 1.2;

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Show visual feedback
   */
  private showVisualFeedback(feedback: AlternativeFeedback): void {
    // Create visual indicator
    const indicator = document.createElement('div');
    indicator.className = 'accessibility-visual-feedback';
    indicator.textContent = this.generateVisualSymbol(feedback);
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: currentColor;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      animation: accessibility-feedback-pulse 0.5s ease;
    `;

    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.remove();
    }, feedback.duration);
  }

  /**
   * Show keyboard feedback
   */
  private showKeyboardFeedback(feedback: AlternativeFeedback): void {
    // Flash screen edges or show focus indicator
    document.body.classList.add('keyboard-feedback-active');

    setTimeout(() => {
      document.body.classList.remove('keyboard-feedback-active');
    }, feedback.duration);
  }

  /**
   * Trigger haptic feedback
   */
  private triggerHapticFeedback(feedback: AlternativeFeedback): void {
    if (window.hapticFeedback && this.config.hapticPreference !== 'disabled') {
      const pattern = feedback.pattern || 'light';
      window.hapticFeedback.trigger(pattern);
    }
  }

  /**
   * Generate feedback message for screen readers
   */
  private generateFeedbackMessage(type: string, feedback: AlternativeFeedback): string {
    const messages = {
      touch: 'Touch interaction detected',
      gesture: 'Gesture performed',
      action: 'Action completed',
    };

    return messages[type as keyof typeof messages] || 'Interaction detected';
  }

  /**
   * Generate audio description
   */
  private generateAudioDescription(feedback: AlternativeFeedback): string {
    return `Feedback: ${feedback.type}`;
  }

  /**
   * Generate visual symbol
   */
  private generateVisualSymbol(feedback: AlternativeFeedback): string {
    const symbols = {
      audio: '🔊',
      visual: '👁️',
      haptic: '📳',
      keyboard: '⌨️',
    };

    return symbols[feedback.type] || '✓';
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...config };

    // Apply configuration changes
    this.updateReducedMotion();
    this.updateHighContrast();

    // Update color blind support
    this.updateColorBlindSupport();

    // Save preferences
    this.savePreferences();
  }

  /**
   * Update color blind support
   */
  private updateColorBlindSupport(): void {
    document.body.className = document.body.className.replace(/color-blind-\w+/g, '');

    if (this.config.colorBlindSupport !== 'none') {
      document.body.classList.add(`color-blind-${this.config.colorBlindSupport}`);
    }
  }

  /**
   * Save user preferences
   */
  private savePreferences(): void {
    try {
      localStorage.setItem('accessibility-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save accessibility preferences:', error);
    }
  }

  /**
   * Load user preferences
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem('accessibility-config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Check if accessibility is enabled
   */
  public isEnabled(): boolean {
    return (
      this.config.reducedMotion ||
      this.config.highContrast ||
      this.config.screenReaderEnabled ||
      this.config.customFeedbackEnabled
    );
  }

  /**
   * Get accessibility status
   */
  public getStatus(): {
    enabled: boolean;
    features: string[];
    config: AccessibilityConfig;
  } {
    const features = [];

    if (this.config.reducedMotion) features.push('reduced-motion');
    if (this.config.highContrast) features.push('high-contrast');
    if (this.config.screenReaderEnabled) features.push('screen-reader');
    if (this.config.customFeedbackEnabled) features.push('custom-feedback');
    if (this.config.audioFeedbackEnabled) features.push('audio-feedback');

    return {
      enabled: this.isEnabled(),
      features,
      config: { ...this.config },
    };
  }
}

// Export singleton instance
export const accessibilityManager = AccessibilityManager.getInstance();

// Export convenience functions
export const initializeAccessibility = (config?: Partial<AccessibilityConfig>) => {
  if (config) {
    accessibilityManager.updateConfig(config);
  }
  accessibilityManager.initialize();
};

export const makeAccessible = (element: HTMLElement, options?: any) => {
  accessibilityManager.makeTouchAccessible(element, options);
};

export const announce = (message: string, priority?: 'polite' | 'assertive' | 'off') => {
  accessibilityManager.announce(message, priority);
};

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  accessibilityManager.initialize();
}
