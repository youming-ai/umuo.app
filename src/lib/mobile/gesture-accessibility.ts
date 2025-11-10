/**
 * Gesture Accessibility with Alternative Input Methods
 * Provides comprehensive accessibility support for touch gestures with motor impairments
 */

import { touchOptimizer, type VoiceCommandConfig, type SwitchNavigationConfig } from './touch-optimization';

// Gesture types and alternatives
export interface GestureAlternative {
  gestureType: 'swipe' | 'pinch' | 'rotate' | 'long-press' | 'double-tap' | 'drag';
  description: string;
  alternatives: AlternativeInputMethod[];
}

export interface AlternativeInputMethod {
  type: 'button' | 'voice' | 'switch' | 'keyboard' | 'gesture-simplified';
  label: string;
  instructions: string;
  action: () => void;
  icon?: string;
  keyboardShortcut?: string[];
  voiceCommand?: string;
}

// Simplified gesture configurations
export interface SimplifiedGestureConfig {
  enabled: boolean;
  gesture: 'tap' | 'simple-swipe' | 'single-press';
  threshold: number;
  timeout: number;
  feedback: 'visual' | 'haptic' | 'audio' | 'combination';
}

// Motor impairment adaptations
export interface MotorImpairmentConfig {
  severity: 'mild' | 'moderate' | 'severe';
  adaptations: {
    extendedTimeouts: boolean;
    simplifiedGestures: boolean;
    largerTargets: boolean;
    reducePrecision: boolean;
    alternativeInputs: boolean;
  };
  personalizedSettings: {
    customTimeouts?: Record<string, number>;
    preferredInputMethod?: 'touch' | 'voice' | 'switch' | 'keyboard';
    hapticIntensity?: 'low' | 'medium' | 'high';
  };
}

// Cognitive accessibility features
export interface CognitiveAccessibilityConfig {
  enabled: boolean;
  features: {
    clearInstructions: boolean;
    visualCues: boolean;
    consistentInterface: boolean;
    errorPrevention: boolean;
    stepByStepGuidance: boolean;
  };
  languageComplexity: 'simple' | 'moderate' | 'complex';
}

export class GestureAccessibilityManager {
  private static instance: GestureAccessibilityManager;
  private gestureAlternatives: Map<string, GestureAlternative[]> = new Map();
  private activeConfig: SimplifiedGestureConfig;
  private motorConfig: MotorImpairmentConfig;
  private cognitiveConfig: CognitiveAccessibilityConfig;
  private isEnabled = false;

  private constructor() {
    this.activeConfig = {
      enabled: false,
      gesture: 'tap',
      threshold: 50,
      timeout: 1000,
      feedback: 'combination'
    };

    this.motorConfig = {
      severity: 'mild',
      adaptations: {
        extendedTimeouts: true,
        simplifiedGestures: false,
        largerTargets: true,
        reducePrecision: false,
        alternativeInputs: true
      },
      personalizedSettings: {}
    };

    this.cognitiveConfig = {
      enabled: true,
      features: {
        clearInstructions: true,
        visualCues: true,
        consistentInterface: true,
        errorPrevention: true,
        stepByStepGuidance: false
      },
      languageComplexity: 'simple'
    };

    this.initializeGestureAlternatives();
  }

  static getInstance(): GestureAccessibilityManager {
    if (!GestureAccessibilityManager.instance) {
      GestureAccessibilityManager.instance = new GestureAccessibilityManager();
    }
    return GestureAccessibilityManager.instance;
  }

  /**
   * Initialize predefined gesture alternatives
   */
  private initializeGestureAlternatives(): void {
    // Swipe alternatives
    this.gestureAlternatives.set('swipe-left', [
      {
        gestureType: 'swipe',
        description: 'Swipe left to skip backward',
        alternatives: [
          {
            type: 'button',
            label: 'Skip Back',
            instructions: 'Tap this button to skip backward',
            action: () => this.dispatchGestureEvent('swipe-left-alternative'),
            icon: 'skip-back',
            keyboardShortcut: ['ArrowLeft', 'Shift+ArrowLeft']
          },
          {
            type: 'voice',
            label: 'Voice: "Skip back"',
            instructions: 'Say "skip back" to skip backward',
            action: () => this.dispatchGestureEvent('swipe-left-alternative'),
            voiceCommand: 'skip back'
          },
          {
            type: 'switch',
            label: 'Switch: Navigate left',
            instructions: 'Use switch navigation to go left',
            action: () => this.dispatchGestureEvent('swipe-left-alternative')
          }
        ]
      }
    ]);

    this.gestureAlternatives.set('swipe-right', [
      {
        gestureType: 'swipe',
        description: 'Swipe right to skip forward',
        alternatives: [
          {
            type: 'button',
            label: 'Skip Forward',
            instructions: 'Tap this button to skip forward',
            action: () => this.dispatchGestureEvent('swipe-right-alternative'),
            icon: 'skip-forward',
            keyboardShortcut: ['ArrowRight', 'Shift+ArrowRight']
          },
          {
            type: 'voice',
            label: 'Voice: "Skip forward"',
            instructions: 'Say "skip forward" to skip forward',
            action: () => this.dispatchGestureEvent('swipe-right-alternative'),
            voiceCommand: 'skip forward'
          }
        ]
      }
    ]);

    // Pinch alternatives
    this.gestureAlternatives.set('pinch', [
      {
        gestureType: 'pinch',
        description: 'Pinch to zoom or adjust size',
        alternatives: [
          {
            type: 'button',
            label: 'Zoom In',
            instructions: 'Tap to zoom in',
            action: () => this.dispatchGestureEvent('pinch-in-alternative'),
            icon: 'zoom-in',
            keyboardShortcut: ['+', '=']
          },
          {
            type: 'button',
            label: 'Zoom Out',
            instructions: 'Tap to zoom out',
            action: () => this.dispatchGestureEvent('pinch-out-alternative'),
            icon: 'zoom-out',
            keyboardShortcut: ['-', '_']
          },
          {
            type: 'voice',
            label: 'Voice: "Zoom in/out"',
            instructions: 'Say "zoom in" or "zoom out"',
            action: () => this.dispatchGestureEvent('pinch-voice-alternative'),
            voiceCommand: 'zoom in zoom out'
          }
        ]
      }
    ]);

    // Long press alternatives
    this.gestureAlternatives.set('long-press', [
      {
        gestureType: 'long-press',
        description: 'Long press for additional options',
        alternatives: [
          {
            type: 'button',
            label: 'More Options',
            instructions: 'Tap and hold or click this button for more options',
            action: () => this.dispatchGestureEvent('long-press-alternative'),
            icon: 'more-options',
            keyboardShortcut: ['Space', 'Enter']
          },
          {
            type: 'gesture-simplified',
            label: 'Double Tap',
            instructions: 'Double tap instead of long pressing',
            action: () => this.dispatchGestureEvent('long-press-alternative')
          }
        ]
      }
    ]);

    // Double tap alternatives
    this.gestureAlternatives.set('double-tap', [
      {
        gestureType: 'double-tap',
        description: 'Double tap to play/pause',
        alternatives: [
          {
            type: 'button',
            label: 'Play/Pause',
            instructions: 'Tap this button to play or pause',
            action: () => this.dispatchGestureEvent('double-tap-alternative'),
            icon: 'play-pause',
            keyboardShortcut: ['Space']
          },
          {
            type: 'voice',
            label: 'Voice: "Play" or "Pause"',
            instructions: 'Say "play" or "pause" to control playback',
            action: () => this.dispatchGestureEvent('double-tap-alternative'),
            voiceCommand: 'play pause'
          }
        ]
      }
    ]);
  }

  /**
   * Enable gesture accessibility features
   */
  enableGestureAccessibility(config?: {
    simplified?: SimplifiedGestureConfig;
    motor?: MotorImpairmentConfig;
    cognitive?: CognitiveAccessibilityConfig;
  }): void {
    this.isEnabled = true;

    if (config?.simplified) {
      this.activeConfig = { ...this.activeConfig, ...config.simplified };
    }

    if (config?.motor) {
      this.motorConfig = { ...this.motorConfig, ...config.motor };
    }

    if (config?.cognitive) {
      this.cognitiveConfig = { ...this.cognitiveConfig, ...config.cognitive };
    }

    this.applyAccessibilitySettings();
  }

  /**
   * Apply accessibility settings to the page
   */
  private applyAccessibilitySettings(): void {
    // Add accessibility CSS
    this.injectAccessibilityStyles();

    // Set up voice control
    if (this.motorConfig.adaptations.alternativeInputs) {
      this.setupVoiceControl();
    }

    // Set up switch navigation
    if (this.motorConfig.adaptations.alternativeInputs) {
      this.setupSwitchNavigation();
    }

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Add visual indicators for cognitive accessibility
    if (this.cognitiveConfig.enabled) {
      this.addCognitiveAccessibilityFeatures();
    }
  }

  /**
   * Inject accessibility styles
   */
  private injectAccessibilityStyles(): void {
    if (typeof document === 'undefined') return;

    const styleId = 'gesture-accessibility-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const styles = this.generateAccessibilityCSS();
    styleElement.textContent = styles;
  }

  /**
   * Generate accessibility CSS
   */
  private generateAccessibilityCSS(): string {
    const largerTargetSize = this.motorConfig.adaptations.largerTargets ? '64px' : '44px';
    const extendedTimeout = this.motorConfig.adaptations.extendedTimeouts ? '2s' : '1s';

    return `
    /* Gesture Accessibility Styles */
    .gesture-accessible {
      --gesture-target-size: ${largerTargetSize};
      --gesture-timeout: ${extendedTimeout};
      --gesture-reduced-precision: ${this.motorConfig.adaptations.reducePrecision ? 'true' : 'false'};
    }

    .gesture-alternative-button {
      min-width: var(--gesture-target-size);
      min-height: var(--gesture-target-size);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      border: 2px solid #333;
      border-radius: 8px;
      margin: 8px;
      padding: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }

    .gesture-alternative-button:hover,
    .gesture-alternative-button:focus {
      background: #e0e0e0;
      border-color: #0066cc;
      box-shadow: 0 4px 8px rgba(0, 102, 204, 0.3);
      outline: 3px solid #0066cc;
      outline-offset: 2px;
    }

    .gesture-alternative-button.keyboard-focus {
      outline: 3px solid #ff6600;
      outline-offset: 2px;
    }

    /* Cognitive accessibility features */
    .cognitive-clear-instructions {
      background: #e3f2fd;
      border: 2px solid #1976d2;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }

    .cognitive-step-indicator {
      background: #4caf50;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: bold;
      display: inline-block;
      margin-right: 8px;
    }

    .cognitive-visual-cue {
      background: #ff9800;
      color: white;
      padding: 8px;
      border-radius: 4px;
      margin: 4px 0;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* Simplified gesture indicators */
    .simplified-gesture-area {
      min-width: ${this.activeConfig.enabled ? largerTargetSize : '44px'};
      min-height: ${this.activeConfig.enabled ? largerTargetSize : '44px'};
      border: 3px dashed #666;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      position: relative;
      transition: all ${this.activeConfig.timeout}ms ease;
    }

    .simplified-gesture-area:hover {
      border-color: #0066cc;
      background: rgba(0, 102, 204, 0.1);
    }

    .simplified-gesture-area.active {
      border-color: #4caf50;
      background: rgba(76, 175, 80, 0.2);
    }

    /* Motor impairment adaptations */
    .motor-adapted {
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }

    .extended-timeout {
      transition-duration: var(--gesture-timeout) !important;
    }

    /* Error prevention for cognitive accessibility */
    .error-prevention {
      position: relative;
    }

    .error-prevention::before {
      content: '⚠️';
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ff5722;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      z-index: 1000;
    }

    /* Voice control indicator */
    .voice-control-active {
      border: 3px solid #4caf50;
      animation: voice-pulse 1.5s infinite;
    }

    @keyframes voice-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
      }
    }

    /* Switch navigation highlight */
    .switch-nav-highlight {
      outline: 4px solid #ff6600;
      outline-offset: 3px;
      background: rgba(255, 102, 0, 0.1);
      z-index: 1000;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .gesture-alternative-button {
        background: Window;
        color: WindowText;
        border-color: WindowText;
        border-width: 3px;
      }

      .gesture-alternative-button:hover,
      .gesture-alternative-button:focus {
        background: Highlight;
        color: HighlightText;
        border-color: HighlightText;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .gesture-alternative-button,
      .simplified-gesture-area,
      .cognitive-visual-cue {
        transition: none;
        animation: none;
      }
    }
    `;
  }

  /**
   * Setup voice control for gesture alternatives
   */
  private setupVoiceControl(): void {
    const voiceCommands: VoiceCommandConfig = {
      enableVoiceControl: true,
      recognitionLanguage: 'en-US',
      confidenceThreshold: 0.7,
      commands: {
        'skip back': 'swipe-left-alternative',
        'skip forward': 'swipe-right-alternative',
        'zoom in': 'pinch-in-alternative',
        'zoom out': 'pinch-out-alternative',
        'play': 'double-tap-alternative',
        'pause': 'double-tap-alternative',
        'more options': 'long-press-alternative',
        'show alternatives': 'show-gesture-alternatives',
        'hide alternatives': 'hide-gesture-alternatives'
      }
    };

    touchOptimizer.enableVoiceControl(voiceCommands);
  }

  /**
   * Setup switch navigation
   */
  private setupSwitchNavigation(): void {
    const switchConfig: SwitchNavigationConfig = {
      enableSwitchNavigation: true,
      scanSpeed: this.motorConfig.personalizedSettings.customTimeouts?.switchSpeed || 1000,
      autoScan: false,
      scanPattern: 'grid',
      customScanOrder: ['.gesture-alternative-button', '.simplified-gesture-area']
    };

    touchOptimizer.enableSwitchNavigation(switchConfig);
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Handle global keyboard shortcuts
      switch (event.key) {
        case 'F1':
          event.preventDefault();
          this.showGestureAlternatives();
          break;
        case 'Escape':
          this.hideGestureAlternatives();
          break;
      }

      // Handle gesture alternative shortcuts
      const gestureAlternatives = Array.from(this.gestureAlternatives.entries());
      for (const [gestureType, alternatives] of gestureAlternatives) {
        for (const alternative of alternatives) {
          for (const method of alternative.alternatives) {
            if (method.keyboardShortcut?.includes(event.key) ||
                method.keyboardShortcut?.includes(event.code)) {
              event.preventDefault();
              method.action();
              return;
            }
          }
        }
      }
    });
  }

  /**
   * Add cognitive accessibility features
   */
  private addCognitiveAccessibilityFeatures(): void {
    if (this.cognitiveConfig.features.clearInstructions) {
      this.addClearInstructions();
    }

    if (this.cognitiveConfig.features.visualCues) {
      this.addVisualCues();
    }

    if (this.cognitiveConfig.features.errorPrevention) {
      this.addErrorPrevention();
    }
  }

  /**
   * Add clear instructions for gesture alternatives
   */
  private addClearInstructions(): void {
    if (typeof document === 'undefined') return;

    const instructions = document.createElement('div');
    instructions.className = 'cognitive-clear-instructions';
    instructions.setAttribute('role', 'region');
    instructions.setAttribute('aria-label', 'Gesture alternatives instructions');
    instructions.innerHTML = `
      <h3>Alternative Ways to Control</h3>
      <p>If gestures are difficult, you can use:</p>
      <ul>
        <li><strong>Buttons:</strong> Tap the alternative buttons that appear</li>
        <li><strong>Keyboard:</strong> Use arrow keys and space bar</li>
        <li><strong>Voice:</strong> Say commands like "skip forward" or "zoom in"</li>
        <li><strong>Switch:</strong> Use adaptive switches to navigate</li>
      </ul>
      <p>Press F1 anytime to show all alternatives</p>
    `;

    document.body.appendChild(instructions);
  }

  /**
   * Add visual cues for better understanding
   */
  private addVisualCues(): void {
    if (typeof document === 'undefined') return;

    // Add visual indicators for interactive elements
    const interactiveElements = document.querySelectorAll('.touch-optimized, button, [role="button"]');

    interactiveElements.forEach(element => {
      const cue = document.createElement('span');
      cue.className = 'cognitive-visual-cue';
      cue.textContent = 'Interactive';
      cue.style.display = 'none';

      // Show cue on hover/focus
      element.addEventListener('mouseenter', () => {
        cue.style.display = 'block';
      });

      element.addEventListener('mouseleave', () => {
        cue.style.display = 'none';
      });

      element.addEventListener('focus', () => {
        cue.style.display = 'block';
      });

      element.addEventListener('blur', () => {
        cue.style.display = 'none';
      });
    });
  }

  /**
   * Add error prevention features
   */
  private addErrorPrevention(): void {
    if (typeof document === 'undefined') return;

    // Add confirmation dialogs for important actions
    const importantActions = document.querySelectorAll('[data-confirm-action]');

    importantActions.forEach(element => {
      element.classList.add('error-prevention');

      element.addEventListener('click', (event) => {
        const action = element.getAttribute('data-confirm-action');
        const message = element.getAttribute('data-confirm-message') || 'Are you sure?';

        if (confirm(message)) {
          this.dispatchGestureEvent(action || 'confirmed-action');
        } else {
          event.preventDefault();
        }
      });
    });
  }

  /**
   * Create gesture alternatives for a specific element
   */
  createGestureAlternatives(container: HTMLElement, gestureTypes: string[]): void {
    if (!this.isEnabled) return;

    const alternativesPanel = document.createElement('div');
    alternativesPanel.className = 'gesture-alternatives-panel';
    alternativesPanel.setAttribute('role', 'complementary');
    alternativesPanel.setAttribute('aria-label', 'Gesture alternatives');
    alternativesPanel.style.display = 'none';

    gestureTypes.forEach(gestureType => {
      const alternatives = this.gestureAlternatives.get(gestureType);
      if (!alternatives) return;

      alternatives.forEach(alternative => {
        const section = document.createElement('div');
        section.className = 'gesture-alternative-section';

        const title = document.createElement('h4');
        title.textContent = alternative.description;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'gesture-alternatives-container';

        alternative.alternatives.forEach(method => {
          const button = document.createElement('button');
          button.className = 'gesture-alternative-button motor-adapted';
          button.textContent = method.label;
          button.setAttribute('aria-label', method.instructions);

          // Add keyboard shortcut info
          if (method.keyboardShortcut) {
            const shortcut = document.createElement('span');
            shortcut.className = 'keyboard-shortcut';
            shortcut.textContent = `(${method.keyboardShortcut.join(' or ')})`;
            shortcut.style.fontSize = '12px';
            shortcut.style.opacity = '0.7';
            button.appendChild(document.createTextNode(' '));
            button.appendChild(shortcut);
          }

          button.addEventListener('click', method.action);
          buttonsContainer.appendChild(button);
        });

        section.appendChild(title);
        section.appendChild(buttonsContainer);
        alternativesPanel.appendChild(section);
      });
    });

    container.appendChild(alternativesPanel);
  }

  /**
   * Show gesture alternatives panel
   */
  showGestureAlternatives(): void {
    const panels = document.querySelectorAll('.gesture-alternatives-panel');
    panels.forEach(panel => {
      panel.style.display = 'block';
      panel.setAttribute('aria-hidden', 'false');
    });

    // Announce to screen readers
    this.announceToScreenReader('Gesture alternatives are now visible');
  }

  /**
   * Hide gesture alternatives panel
   */
  hideGestureAlternatives(): void {
    const panels = document.querySelectorAll('.gesture-alternatives-panel');
    panels.forEach(panel => {
      panel.style.display = 'none';
      panel.setAttribute('aria-hidden', 'true');
    });

    this.announceToScreenReader('Gesture alternatives are hidden');
  }

  /**
   * Create simplified gesture controls
   */
  createSimplifiedGestureControls(container: HTMLElement): void {
    if (!this.activeConfig.enabled) return;

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'simplified-gesture-controls';

    // Create tap area
    const tapArea = document.createElement('div');
    tapArea.className = 'simplified-gesture-area motor-adapted';
    tapArea.setAttribute('role', 'button');
    tapArea.setAttribute('tabindex', '0');
    tapArea.setAttribute('aria-label', 'Simplified gesture control');

    tapArea.addEventListener('click', () => {
      tapArea.classList.add('active');
      setTimeout(() => tapArea.classList.remove('active'), this.activeConfig.timeout);

      // Trigger simplified action
      this.dispatchGestureEvent('simplified-tap');
    });

    // Handle keyboard interaction
    tapArea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        tapArea.click();
      }
    });

    controlsContainer.appendChild(tapArea);
    container.appendChild(controlsContainer);
  }

  /**
   * Dispatch custom gesture events
   */
  private dispatchGestureEvent(eventType: string): void {
    if (typeof window === 'undefined') return;

    const event = new CustomEvent('gesture-alternative', {
      detail: { eventType, timestamp: Date.now() }
    });

    window.dispatchEvent(event);

    // Provide feedback
    this.provideFeedback();
  }

  /**
   * Provide feedback for gesture alternatives
   */
  private provideFeedback(): void {
    // Visual feedback
    const feedback = document.createElement('div');
    feedback.className = 'gesture-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 16px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 18px;
      font-weight: bold;
    `;
    feedback.textContent = 'Action completed';

    document.body.appendChild(feedback);

    setTimeout(() => {
      if (document.body.contains(feedback)) {
        document.body.removeChild(feedback);
      }
    }, 1000);

    // Haptic feedback if available
    if ('vibrate' in navigator) {
      const intensity = this.motorConfig.personalizedSettings.hapticIntensity;
      let pattern = [50];

      switch (intensity) {
        case 'high':
          pattern = [100, 50, 100];
          break;
        case 'medium':
          pattern = [75];
          break;
        case 'low':
        default:
          pattern = [50];
          break;
      }

      navigator.vibrate(pattern);
    }

    // Audio feedback if enabled
    if (this.activeConfig.feedback === 'audio' || this.activeConfig.feedback === 'combination') {
      this.playAudioFeedback();
    }
  }

  /**
   * Play audio feedback
   */
  private playAudioFeedback(): void {
    if (typeof window === 'undefined') return;

    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio playback errors
      });
    } catch (error) {
      // Audio not supported
    }
  }

  /**
   * Announce to screen reader
   */
  private announceToScreenReader(message: string): void {
    if (typeof document === 'undefined') return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }

  /**
   * Get current configuration
   */
  getConfiguration() {
    return {
      isEnabled: this.isEnabled,
      simplified: this.activeConfig,
      motor: this.motorConfig,
      cognitive: this.cognitiveConfig
    };
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: {
    simplified?: Partial<SimplifiedGestureConfig>;
    motor?: Partial<MotorImpairmentConfig>;
    cognitive?: Partial<CognitiveAccessibilityConfig>;
  }): void {
    if (config.simplified) {
      this.activeConfig = { ...this.activeConfig, ...config.simplified };
    }

    if (config.motor) {
      this.motorConfig = {
        ...this.motorConfig,
        ...config.motor,
        adaptations: { ...this.motorConfig.adaptations, ...config.motor.adaptations },
        personalizedSettings: {
          ...this.motorConfig.personalizedSettings,
          ...config.motor.personalizedSettings
        }
      };
    }

    if (config.cognitive) {
      this.cognitiveConfig = {
        ...this.cognitiveConfig,
        ...config.cognitive,
        features: { ...this.cognitiveConfig.features, ...config.cognitive.features }
      };
    }

    // Reapply settings if enabled
    if (this.isEnabled) {
      this.applyAccessibilitySettings();
    }
  }

  /**
   * Disable gesture accessibility
   */
  disableGestureAccessibility(): void {
    this.isEnabled = false;

    // Remove styles
    const styleElement = document.getElementById('gesture-accessibility-styles');
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }

    // Remove panels
    const panels = document.querySelectorAll('.gesture-alternatives-panel');
    panels.forEach(panel => panel.remove());

    // Remove simplified controls
    const simplifiedControls = document.querySelectorAll('.simplified-gesture-controls');
    simplifiedControls.forEach(control => control.remove());
  }
}

// Export singleton instance
export const gestureAccessibility = GestureAccessibilityManager.getInstance();

// Export convenience function for React components
export function useGestureAccessibility(config?: {
  simplified?: SimplifiedGestureConfig;
  motor?: MotorImpairmentConfig;
  cognitive?: CognitiveAccessibilityConfig;
}) {
  const manager = gestureAccessibility;

  React.useEffect(() => {
    if (config) {
      manager.enableGestureAccessibility(config);
    }

    return () => {
      // Cleanup if needed
    };
  }, [config]);

  return {
    createAlternatives: manager.createGestureAlternatives.bind(manager),
    createSimplifiedControls: manager.createSimplifiedGestureControls.bind(manager),
    showAlternatives: manager.showGestureAlternatives.bind(manager),
    hideAlternatives: manager.hideGestureAlternatives.bind(manager),
    updateConfig: manager.updateConfiguration.bind(manager),
    disable: manager.disableGestureAccessibility.bind(manager),
    config: manager.getConfiguration()
  };
}
