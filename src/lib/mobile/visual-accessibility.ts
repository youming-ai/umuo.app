/**
 * Visual Accessibility Features for Touch Interfaces
 * Comprehensive visual enhancements for touch interfaces following WCAG 2.1 guidelines
 */

import { touchOptimizer } from './touch-optimization';

// Visual accessibility configuration
export interface VisualAccessibilityConfig {
  // Focus management
  enhancedFocusIndicators: boolean;
  focusAnimation: 'subtle' | 'prominent' | 'none';
  focusColor: string;

  // Touch target enhancement
  enlargedTouchTargets: boolean;
  touchTargetEnhancement: 'border' | 'background' | 'outline' | 'combination';
  touchFeedbackAnimation: boolean;

  // Color and contrast
  highContrastMode: boolean;
  colorBlindSupport: boolean;
  colorBlindType: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  customColorScheme?: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    focus: string;
  };

  // Visual feedback
  enhancedVisualFeedback: boolean;
  feedbackDuration: number;
  feedbackType: 'border' | 'background' | 'shadow' | 'combination';

  // Animation and motion
  respectMotionPreference: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  enableAnimations: boolean;

  // Touch spacing
  enhancedTouchSpacing: boolean;
  minTouchSpacing: number;

  // Visual hierarchy
  enhancedVisualHierarchy: boolean;
  sizeContrast: 'subtle' | 'moderate' | 'high';

  // Error prevention
  errorHighlighting: boolean;
  confirmActions: boolean;
}

// Color blind friendly palettes
const COLOR_BLIND_PALETTES = {
  protanopia: {
    primary: '#0066cc',
    secondary: '#ff9900',
    success: '#00aa44',
    warning: '#ff6600',
    error: '#cc0000',
    background: '#ffffff',
    text: '#000000'
  },
  deuteranopia: {
    primary: '#0066cc',
    secondary: '#ffaa00',
    success: '#008844',
    warning: '#ff6600',
    error: '#cc0000',
    background: '#ffffff',
    text: '#000000'
  },
  tritanopia: {
    primary: '#0066ff',
    secondary: '#ff9900',
    success: '#00aa00',
    warning: '#ff7700',
    error: '#cc0000',
    background: '#ffffff',
    text: '#000000'
  },
  achromatopsia: {
    primary: '#333333',
    secondary: '#666666',
    success: '#000000',
    warning: '#888888',
    error: '#000000',
    background: '#ffffff',
    text: '#000000'
  }
};

// High contrast color schemes
const HIGH_CONTRAST_SCHEMES = {
  standard: {
    primary: '#000000',
    secondary: '#000000',
    success: '#000000',
    warning: '#000000',
    error: '#000000',
    background: '#ffffff',
    text: '#000000',
    focus: '#000000'
  },
  dark: {
    primary: '#ffffff',
    secondary: '#ffffff',
    success: '#ffffff',
    warning: '#ffffff',
    error: '#ffffff',
    background: '#000000',
    text: '#ffffff',
    focus: '#ffffff'
  }
};

export class VisualAccessibilityManager {
  private static instance: VisualAccessibilityManager;
  private config: VisualAccessibilityConfig;
  private isActive = false;
  private styleElement: HTMLStyleElement | null = null;

  private constructor() {
    this.config = {
      enhancedFocusIndicators: true,
      focusAnimation: 'prominent',
      focusColor: '#0066cc',
      enlargedTouchTargets: true,
      touchTargetEnhancement: 'combination',
      touchFeedbackAnimation: true,
      highContrastMode: false,
      colorBlindSupport: false,
      colorBlindType: 'protanopia',
      enhancedVisualFeedback: true,
      feedbackDuration: 300,
      feedbackType: 'combination',
      respectMotionPreference: true,
      animationSpeed: 'normal',
      enableAnimations: true,
      enhancedTouchSpacing: true,
      minTouchSpacing: 12,
      enhancedVisualHierarchy: true,
      sizeContrast: 'moderate',
      errorHighlighting: true,
      confirmActions: true
    };

    this.detectUserPreferences();
  }

  static getInstance(): VisualAccessibilityManager {
    if (!VisualAccessibilityManager.instance) {
      VisualAccessibilityManager.instance = new VisualAccessibilityManager();
    }
    return VisualAccessibilityManager.instance;
  }

  /**
   * Detect user preferences from system settings
   */
  private detectUserPreferences(): void {
    // Detect motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      this.config.animationSpeed = 'slow';
      this.config.enableAnimations = false;
    }

    // Detect contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast) {
      this.config.highContrastMode = true;
    }

    // Detect color scheme preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      this.config.customColorScheme = HIGH_CONTRAST_SCHEMES.dark;
    }

    // Listen for preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.config.enableAnimations = !e.matches;
      this.updateStyles();
    });

    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.config.highContrastMode = e.matches;
      this.updateStyles();
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.config.customColorScheme = e.matches ? HIGH_CONTRAST_SCHEMES.dark : undefined;
      this.updateStyles();
    });
  }

  /**
   * Enable visual accessibility features
   */
  enableVisualAccessibility(config?: Partial<VisualAccessibilityConfig>): void {
    this.config = { ...this.config, ...config };
    this.isActive = true;
    this.applyVisualAccessibility();
  }

  /**
   * Apply all visual accessibility enhancements
   */
  private applyVisualAccessibility(): void {
    this.injectAccessibilityStyles();
    this.enhanceExistingElements();
    this.setupTouchTargetEnhancements();
    this.setupFocusManagement();
    this.setupVisualFeedback();
    this.setupErrorPrevention();
  }

  /**
   * Inject comprehensive accessibility styles
   */
  private injectAccessibilityStyles(): void {
    if (typeof document === 'undefined') return;

    // Remove existing styles
    if (this.styleElement) {
      this.styleElement.remove();
    }

    // Create new style element
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'visual-accessibility-styles';

    const styles = this.generateAccessibilityCSS();
    this.styleElement.textContent = styles;

    document.head.appendChild(this.styleElement);
  }

  /**
   * Generate comprehensive accessibility CSS
   */
  private generateAccessibilityCSS(): string {
    const colors = this.getEffectiveColorScheme();
    const focusAnimation = this.getFocusAnimationCSS();
    const touchFeedback = this.getTouchFeedbackCSS();
    const spacing = this.config.enhancedTouchSpacing ? this.config.minTouchSpacing : 8;

    return `
    /* Visual Accessibility Enhancements */

    /* Base accessibility class */
    .visually-accessible {
      --focus-color: ${colors.focus};
      --primary-color: ${colors.primary};
      --secondary-color: ${colors.secondary};
      --success-color: ${colors.success};
      --warning-color: ${colors.warning};
      --error-color: ${colors.error};
      --background-color: ${colors.background};
      --text-color: ${colors.text};
      --touch-spacing: ${spacing}px;
      --feedback-duration: ${this.config.feedbackDuration}ms;
      --animation-speed: ${this.getAnimationSpeed()};
      ${focusAnimation}
      ${touchFeedback}
    }

    /* Enhanced focus indicators */
    .visually-accessible:focus-visible {
      outline: 3px solid var(--focus-color) !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 0 5px rgba(${this.hexToRgb(colors.focus)}, 0.3) !important;
      position: relative !important;
      z-index: 1000 !important;
    }

    .visually-accessible.focus-prominent {
      outline: 4px solid var(--focus-color) !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 8px rgba(${this.hexToRgb(colors.focus)}, 0.4) !important;
    }

    .visually-accessible.focus-subtle {
      outline: 2px solid var(--focus-color) !important;
      outline-offset: 1px !important;
      box-shadow: 0 0 0 3px rgba(${this.hexToRgb(colors.focus)}, 0.2) !important;
    }

    /* Touch target enhancements */
    .visually-accessible.touch-enhanced {
      min-width: 44px !important;
      min-height: 44px !important;
      padding: 12px !important;
      margin: var(--touch-spacing) !important;
      position: relative !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-sizing: border-box !important;
    }

    .visually-accessible.touch-enhanced.enlarged {
      min-width: 56px !important;
      min-height: 56px !important;
      padding: 16px !important;
    }

    .visually-accessible.touch-enhanced::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      transition: all var(--feedback-duration) var(--animation-speed);
      z-index: -1;
    }

    .visually-accessible.touch-enhanced.border-enhancement::before {
      border: 2px solid var(--primary-color);
      border-radius: inherit;
    }

    .visually-accessible.touch-enhanced.background-enhancement::before {
      background: rgba(${this.hexToRgb(colors.primary)}, 0.1);
      border-radius: inherit;
    }

    .visually-accessible.touch-enhanced.outline-enhancement::before {
      box-shadow: 0 0 0 2px var(--primary-color);
      border-radius: inherit;
    }

    /* Touch feedback animations */
    .visually-accessible.touch-active::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--focus-color);
      transform: translate(-50%, -50%) scale(0);
      animation: touch-feedback var(--feedback-duration) ease-out;
      pointer-events: none;
      z-index: 1001;
    }

    /* High contrast mode */
    .visually-accessible.high-contrast {
      background: var(--background-color) !important;
      color: var(--text-color) !important;
      border: 2px solid var(--text-color) !important;
    }

    .visually-accessible.high-contrast:focus-visible {
      outline: 3px solid var(--text-color) !important;
      background: var(--text-color) !important;
      color: var(--background-color) !important;
    }

    /* Color blind support */
    .visually-accessible.colorblind-protanopia {
      --primary-color: ${COLOR_BLIND_PALETTES.protanopia.primary};
      --secondary-color: ${COLOR_BLIND_PALETTES.protanopia.secondary};
      --success-color: ${COLOR_BLIND_PALETTES.protanopia.success};
      --warning-color: ${COLOR_BLIND_PALETTES.protanopia.warning};
      --error-color: ${COLOR_BLIND_PALETTES.protanopia.error};
    }

    .visually-accessible.colorblind-deuteranopia {
      --primary-color: ${COLOR_BLIND_PALETTES.deuteranopia.primary};
      --secondary-color: ${COLOR_BLIND_PALETTES.deuteranopia.secondary};
      --success-color: ${COLOR_BLIND_PALETTES.deuteranopia.success};
      --warning-color: ${COLOR_BLIND_PALETTES.deuteranopia.warning};
      --error-color: ${COLOR_BLIND_PALETTES.deuteranopia.error};
    }

    .visually-accessible.colorblind-tritanopia {
      --primary-color: ${COLOR_BLIND_PALETTES.tritanopia.primary};
      --secondary-color: ${COLOR_BLIND_PALETTES.tritanopia.secondary};
      --success-color: ${COLOR_BLIND_PALETTES.tritanopia.success};
      --warning-color: ${COLOR_BLIND_PALETTES.tritanopia.warning};
      --error-color: ${COLOR_BLIND_PALETTES.tritanopia.error};
    }

    .visually-accessible.colorblind-achromatopsia {
      --primary-color: ${COLOR_BLIND_PALETTES.achromatopsia.primary};
      --secondary-color: ${COLOR_BLIND_PALETTES.achromatopsia.secondary};
      --success-color: ${COLOR_BLIND_PALETTES.achromatopsia.success};
      --warning-color: ${COLOR_BLIND_PALETTES.achromatopsia.warning};
      --error-color: ${COLOR_BLIND_PALETTES.achromatopsia.error};
    }

    /* Enhanced visual hierarchy */
    .visually-accessible.hierarchy-enhanced {
      font-weight: 500 !important;
      letter-spacing: 0.5px !important;
    }

    .visually-accessible.hierarchy-subtle {
      font-weight: 400 !important;
      opacity: 0.9 !important;
    }

    .visually-accessible.hierarchy-moderate {
      font-weight: 600 !important;
      letter-spacing: 0.25px !important;
    }

    .visually-accessible.hierarchy-high {
      font-weight: 700 !important;
      letter-spacing: 1px !important;
      text-transform: uppercase !important;
    }

    /* Error highlighting */
    .visually-accessible.error-highlight {
      border: 3px solid var(--error-color) !important;
      background: rgba(${this.hexToRgb(colors.error)}, 0.1) !important;
      position: relative !important;
    }

    .visually-accessible.error-highlight::before {
      content: '⚠️';
      position: absolute;
      top: -8px;
      right: -8px;
      background: var(--error-color);
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      z-index: 1002;
    }

    /* Confirmation states */
    .visually-accessible.confirm-required {
      border: 3px dashed var(--warning-color) !important;
      background: rgba(${this.hexToRgb(colors.warning)}, 0.1) !important;
    }

    .visually-accessible.confirm-required::after {
      content: 'Confirm?';
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--warning-color);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      z-index: 1002;
    }

    /* Loading and progress states */
    .visually-accessible.loading {
      position: relative !important;
      pointer-events: none !important;
      opacity: 0.7 !important;
    }

    .visually-accessible.loading::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
      border: 2px solid var(--primary-color);
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      z-index: 1003;
    }

    /* Disabled states */
    .visually-accessible:disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      filter: grayscale(100%) !important;
    }

    .visually-accessible:disabled:hover {
      transform: none !important;
      box-shadow: none !important;
    }

    /* Touch spacing for groups */
    .visually-accessible-group > * {
      margin: var(--touch-spacing) !important;
    }

    .visually-accessible-group > *:first-child {
      margin-top: 0 !important;
    }

    .visually-accessible-group > *:last-child {
      margin-bottom: 0 !important;
    }

    /* Responsive touch targets */
    @media (pointer: coarse) {
      .visually-accessible.touch-enhanced {
        min-width: 48px !important;
        min-height: 48px !important;
      }

      .visually-accessible.touch-enhanced.enlarged {
        min-width: 64px !important;
        min-height: 64px !important;
      }
    }

    /* Large touch targets for motor impairments */
    @media (pointer: coarse) and (max-width: 768px) {
      .visually-accessible.touch-enhanced {
        min-width: 56px !important;
        min-height: 56px !important;
      }

      .visually-accessible.touch-enhanced.enlarged {
        min-width: 72px !important;
        min-height: 72px !important;
      }
    }

    /* Animation preferences */
    @media (prefers-reduced-motion: reduce) {
      .visually-accessible *,
      .visually-accessible *::before,
      .visually-accessible *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* Keyframe animations */
    @keyframes touch-feedback {
      0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(4);
        opacity: 0;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes focus-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(${this.hexToRgb(colors.focus)}, 0.4);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(${this.hexToRgb(colors.focus)}, 0.1);
      }
    }

    /* Screen reader only content */
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    /* Skip links */
    .skip-link {
      position: absolute !important;
      top: -40px !important;
      left: 6px !important;
      background: var(--primary-color) !important;
      color: white !important;
      padding: 8px !important;
      text-decoration: none !important;
      border-radius: 4px !important;
      z-index: 10000 !important;
      transition: top 0.3s !important;
    }

    .skip-link:focus {
      top: 6px !important;
    }
    `;
  }

  /**
   * Get effective color scheme based on configuration
   */
  private getEffectiveColorScheme() {
    if (this.config.customColorScheme) {
      return this.config.customColorScheme;
    }

    if (this.config.highContrastMode) {
      return HIGH_CONTRAST_SCHEMES.standard;
    }

    if (this.config.colorBlindSupport) {
      return COLOR_BLIND_PALETTES[this.config.colorBlindType];
    }

    return {
      primary: '#0066cc',
      secondary: '#666666',
      success: '#00aa44',
      warning: '#ff9900',
      error: '#cc0000',
      background: '#ffffff',
      text: '#000000',
      focus: '#0066cc'
    };
  }

  /**
   * Get focus animation CSS
   */
  private getFocusAnimationCSS(): string {
    switch (this.config.focusAnimation) {
      case 'prominent':
        return `
        .visually-accessible:focus-visible {
          animation: focus-pulse 2s infinite !important;
        }
        `;
      case 'none':
        return `
        .visually-accessible:focus-visible {
          animation: none !important;
        }
        `;
      case 'subtle':
      default:
        return '';
    }
  }

  /**
   * Get touch feedback CSS
   */
  private getTouchFeedbackCSS(): string {
    if (!this.config.touchFeedbackAnimation) {
      return `
      .visually-accessible.touch-active::after {
        display: none !important;
      }
      `;
    }
    return '';
  }

  /**
   * Get animation speed value
   */
  private getAnimationSpeed(): string {
    switch (this.config.animationSpeed) {
      case 'slow': return '0.5s';
      case 'fast': return '0.1s';
      case 'normal':
      default: return '0.3s';
    }
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
  }

  /**
   * Enhance existing interactive elements
   */
  private enhanceExistingElements(): void {
    if (typeof document === 'undefined') return;

    // Enhance buttons
    const buttons = document.querySelectorAll('button, [role="button"]');
    buttons.forEach(button => {
      this.enhanceElement(button as HTMLElement);
    });

    // Enhance inputs
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      this.enhanceElement(input as HTMLElement);
    });

    // Enhance links
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      this.enhanceElement(link as HTMLElement);
    });

    // Watch for dynamically added elements
    this.setupMutationObserver();
  }

  /**
   * Enhance a single element with accessibility features
   */
  private enhanceElement(element: HTMLElement): void {
    element.classList.add('visually-accessible');

    // Add touch target enhancements
    if (this.config.enlargedTouchTargets) {
      element.classList.add('touch-enhanced');
      if (this.config.touchTargetEnhancement !== 'none') {
        element.classList.add(`${this.config.touchTargetEnhancement}-enhancement`);
      }
    }

    // Add high contrast mode
    if (this.config.highContrastMode) {
      element.classList.add('high-contrast');
    }

    // Add color blind support
    if (this.config.colorBlindSupport) {
      element.classList.add(`colorblind-${this.config.colorBlindType}`);
    }

    // Add visual hierarchy
    if (this.config.enhancedVisualHierarchy) {
      element.classList.add(`hierarchy-${this.config.sizeContrast}`);
    }

    // Add touch feedback
    this.addTouchFeedback(element);

    // Apply WCAG touch target sizing
    touchOptimizer.createAccessibleTouchTarget(element, {
      isEnhanced: this.config.enlargedTouchTargets,
      announceInteraction: true
    });
  }

  /**
   * Add touch feedback to an element
   */
  private addTouchFeedback(element: HTMLElement): void {
    if (!this.config.enhancedVisualFeedback) return;

    const handleTouchStart = () => {
      element.classList.add('touch-active');
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        element.classList.remove('touch-active');
      }, this.config.feedbackDuration);
    };

    const handleMouseDown = () => {
      element.classList.add('touch-active');
    };

    const handleMouseUp = () => {
      setTimeout(() => {
        element.classList.remove('touch-active');
      }, this.config.feedbackDuration);
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
  }

  /**
   * Setup touch target enhancements
   */
  private setupTouchTargetEnhancements(): void {
    if (!this.config.enhancedTouchSpacing) return;

    // Add spacing groups
    const groups = document.querySelectorAll('.touch-group, [role="group"]');
    groups.forEach(group => {
      group.classList.add('visually-accessible-group');
    });

    // Ensure minimum spacing between interactive elements
    const interactiveElements = document.querySelectorAll('button, [role="button"], input, a[href]');
    interactiveElements.forEach((element, index) => {
      const el = element as HTMLElement;
      if (index > 0) {
        const prevElement = interactiveElements[index - 1] as HTMLElement;
        if (this.areElementsTooClose(el, prevElement)) {
          this.addSpacingElement(el, prevElement);
        }
      }
    });
  }

  /**
   * Check if elements are too close together
   */
  private areElementsTooClose(el1: HTMLElement, el2: HTMLElement): boolean {
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    const minSpacing = this.config.minTouchSpacing;

    return Math.abs(rect1.top - rect2.top) < minSpacing ||
           Math.abs(rect1.bottom - rect2.bottom) < minSpacing ||
           Math.abs(rect1.left - rect2.left) < minSpacing ||
           Math.abs(rect1.right - rect2.right) < minSpacing;
  }

  /**
   * Add spacing between elements
   */
  private addSpacingElement(el1: HTMLElement, el2: HTMLElement): void {
    const spacer = document.createElement('div');
    spacer.style.height = `${this.config.minTouchSpacing}px`;
    spacer.setAttribute('aria-hidden', 'true');
    el2.parentNode?.insertBefore(spacer, el2);
  }

  /**
   * Setup focus management
   */
  private setupFocusManagement(): void {
    if (!this.config.enhancedFocusIndicators) return;

    // Add focus indicators to focusable elements
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      element.addEventListener('focus', () => {
        element.classList.add(`focus-${this.config.focusAnimation}`);
      });

      element.addEventListener('blur', () => {
        element.classList.remove(`focus-${this.config.focusAnimation}`);
      });
    });
  }

  /**
   * Setup visual feedback
   */
  private setupVisualFeedback(): void {
    if (!this.config.enhancedVisualFeedback) return;

    // Add loading states
    const loadingElements = document.querySelectorAll('[data-loading]');
    loadingElements.forEach(element => {
      const el = element as HTMLElement;
      el.classList.add('visually-accessible', 'loading');
    });
  }

  /**
   * Setup error prevention
   */
  private setupErrorPrevention(): void {
    if (!this.config.errorHighlighting && !this.config.confirmActions) return;

    // Add error highlighting
    if (this.config.errorHighlighting) {
      const errorElements = document.querySelectorAll('[data-error], .error, .invalid');
      errorElements.forEach(element => {
        element.classList.add('visually-accessible', 'error-highlight');
      });
    }

    // Add confirmation requirements
    if (this.config.confirmActions) {
      const confirmElements = document.querySelectorAll('[data-confirm]');
      confirmElements.forEach(element => {
        const el = element as HTMLElement;
        el.classList.add('visually-accessible', 'confirm-required');
      });
    }
  }

  /**
   * Setup mutation observer for dynamic content
   */
  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (this.shouldEnhanceElement(element)) {
                this.enhanceElement(element);
              }

              // Also check child elements
              const interactiveChildren = element.querySelectorAll(
                'button, [role="button"], input, textarea, select, a[href]'
              );
              interactiveChildren.forEach(child => {
                this.enhanceElement(child as HTMLElement);
              });
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Check if an element should be enhanced
   */
  private shouldEnhanceElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    return [
      'button',
      'a',
      'input',
      'textarea',
      'select'
    ].includes(tagName) || element.getAttribute('role') === 'button';
  }

  /**
   * Update styles with current configuration
   */
  private updateStyles(): void {
    if (this.isActive) {
      this.injectAccessibilityStyles();
    }
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<VisualAccessibilityConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.isActive) {
      this.updateStyles();
      this.enhanceExistingElements();
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): VisualAccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Disable visual accessibility
   */
  disableVisualAccessibility(): void {
    this.isActive = false;

    // Remove styles
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    // Remove classes from enhanced elements
    const enhancedElements = document.querySelectorAll('.visually-accessible');
    enhancedElements.forEach(element => {
      element.classList.remove('visually-accessible');
    });
  }

  /**
   * Add skip links for keyboard navigation
   */
  addSkipLinks(): void {
    if (typeof document === 'undefined') return;

    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#search', text: 'Skip to search' }
    ];

    skipLinks.forEach(link => {
      if (document.querySelector(link.href)) {
        const skipLink = document.createElement('a');
        skipLink.href = link.href;
        skipLink.textContent = link.text;
        skipLink.className = 'skip-link';
        document.body.insertBefore(skipLink, document.body.firstChild);
      }
    });
  }

  /**
   * Add color blind testing filters
   */
  addColorBlindTesting(): void {
    if (typeof document === 'undefined') return;

    const filterContainer = document.createElement('div');
    filterContainer.id = 'colorblind-testing';
    filterContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: white;
      border: 2px solid black;
      padding: 10px;
      z-index: 10000;
      display: none;
    `;

    const types = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

    types.forEach(type => {
      const button = document.createElement('button');
      button.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      button.style.cssText = 'display: block; margin: 5px; padding: 5px;';
      button.onclick = () => {
        document.body.style.filter = type === 'normal' ? 'none' : this.getColorBlindFilter(type);
      };
      filterContainer.appendChild(button);
    });

    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Color Blind Test';
    toggleButton.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 10001;';
    toggleButton.onclick = () => {
      filterContainer.style.display = filterContainer.style.display === 'none' ? 'block' : 'none';
    };

    document.body.appendChild(toggleButton);
    document.body.appendChild(filterContainer);
  }

  /**
   * Get color blind filter CSS
   */
  private getColorBlindFilter(type: string): string {
    const filters = {
      protanopia: 'url(#protanopia-filter)',
      deuteranopia: 'url(#deuteranopia-filter)',
      tritanopia: 'url(#tritanopia-filter)',
      achromatopsia: 'grayscale(100%)'
    };

    return filters[type as keyof typeof filters] || 'none';
  }
}

// Export singleton instance
export const visualAccessibility = VisualAccessibilityManager.getInstance();

// Export convenience function for React components
export function useVisualAccessibility(config?: Partial<VisualAccessibilityConfig>) {
  const manager = visualAccessibility;

  React.useEffect(() => {
    if (config) {
      manager.updateConfiguration(config);
    }
  }, [config]);

  return {
    enable: manager.enableVisualAccessibility.bind(manager),
    disable: manager.disableVisualAccessibility.bind(manager),
    updateConfig: manager.updateConfiguration.bind(manager),
    getConfig: manager.getConfiguration.bind(manager),
    enhanceElement: manager.enhanceElement.bind(manager),
    addSkipLinks: manager.addSkipLinks.bind(manager),
    addColorBlindTesting: manager.addColorBlindTesting.bind(manager)
  };
}
