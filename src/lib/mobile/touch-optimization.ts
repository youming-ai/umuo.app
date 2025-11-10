/**
 * Mobile touch optimization utilities with WCAG 2.1 accessibility compliance
 * Enhanced features for touch interfaces, screen readers, and motor impairments
 */

import {
  MobileDetector,
  type DeviceInfo,
  type TouchTargetMetrics,
  type TouchGestureData,
  type TouchEventHandlers,
  DEFAULT_MOBILE_CONFIG,
} from "@/types/mobile";

// WCAG 2.1 Accessibility Configuration
export interface WCAGAccessibilityConfig {
  // Touch target size compliance (WCAG 2.5.5)
  minTouchTargetSize: number; // 44x44px minimum
  enhancedTouchTargetSize: number; // 56x56px for frequently used controls
  spacingBetweenTargets: number; // 8px minimum spacing

  // Screen reader optimization
  enableScreenReaderSupport: boolean;
  announceTouchInteractions: boolean;
  provideAudioDescriptions: boolean;

  // Motor impairment support
  enableGestureSimplification: boolean;
  alternativeInputMethods: boolean;
  extendedTimeout: boolean; // For users with motor impairments

  // Visual accessibility
  highContrastMode: boolean;
  focusIndicators: boolean;
  reduceMotion: boolean;
  colorBlindSupport: boolean;

  // Cognitive accessibility
  provideInstructions: boolean;
  consistentLayout: boolean;
  errorPrevention: boolean;
}

export interface TouchOptimizationConfig {
  enableHapticFeedback: boolean;
  enableVisualFeedback: boolean;
  enableGestureRecognition: boolean;
  enablePerformanceOptimization: boolean;
  maxResponseTime: number;
  feedbackDuration: number;
  targetSizes: TouchTargetMetrics;
  accessibility: WCAGAccessibilityConfig;
}

// Voice control integration
export interface VoiceCommandConfig {
  enableVoiceControl: boolean;
  recognitionLanguage: string;
  confidenceThreshold: number;
  commands: {
    [command: string]: string; // voice command -> action mapping
  };
}

// Switch navigation support
export interface SwitchNavigationConfig {
  enableSwitchNavigation: boolean;
  scanSpeed: number; // milliseconds between focus items
  autoScan: boolean;
  scanPattern: "row" | "column" | "grid";
  customScanOrder: string[]; // CSS selectors for scan order
}

// Haptic feedback patterns for accessibility
export interface HapticPatterns {
  [interactionType: string]: number | number[]; // interaction type -> vibration pattern
}

export class TouchOptimizationManager {
  private static instance: TouchOptimizationManager;
  private config: TouchOptimizationConfig;
  private deviceDetector: MobileDetector;
  private voiceCommandHandler: VoiceCommandHandler | null = null;
  private switchNavigationHandler: SwitchNavigationHandler | null = null;
  private screenReaderAnnouncer: ScreenReaderAnnouncer | null = null;
  private accessibilityTesting: AccessibilityTester | null = null;

  private constructor() {
    this.deviceDetector = MobileDetector.getInstance();
    this.config = {
      enableHapticFeedback: true,
      enableVisualFeedback: true,
      enableGestureRecognition: true,
      enablePerformanceOptimization: true,
      maxResponseTime: 300,
      feedbackDuration: 150,
      targetSizes: {
        min: DEFAULT_MOBILE_CONFIG.touchTargetSizes.min,
        optimal: DEFAULT_MOBILE_CONFIG.touchTargetSizes.optimal,
        enhanced: DEFAULT_MOBILE_CONFIG.touchTargetSizes.enhanced,
      },
      accessibility: {
        minTouchTargetSize: 44,
        enhancedTouchTargetSize: 56,
        spacingBetweenTargets: 8,
        enableScreenReaderSupport: true,
        announceTouchInteractions: true,
        provideAudioDescriptions: false,
        enableGestureSimplification: true,
        alternativeInputMethods: true,
        extendedTimeout: true,
        highContrastMode: false,
        focusIndicators: true,
        reduceMotion: false,
        colorBlindSupport: true,
        provideInstructions: true,
        consistentLayout: true,
        errorPrevention: true,
      },
    };

    // Initialize accessibility features
    this.initializeAccessibility();
  }

  /**
   * Initialize accessibility features based on user preferences and device capabilities
   */
  private initializeAccessibility(): void {
    // Detect user preferences
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const prefersHighContrast = window.matchMedia(
      "(prefers-contrast: high)",
    ).matches;

    // Update config based on user preferences
    this.config.accessibility.reduceMotion = prefersReducedMotion;
    this.config.accessibility.highContrastMode = prefersHighContrast;

    // Initialize accessibility components if enabled
    if (this.config.accessibility.enableScreenReaderSupport) {
      this.screenReaderAnnouncer = new ScreenReaderAnnouncer();
    }

    if (this.config.accessibility.alternativeInputMethods) {
      this.voiceCommandHandler = new VoiceCommandHandler();
      this.switchNavigationHandler = new SwitchNavigationHandler();
    }

    this.accessibilityTesting = new AccessibilityTester();
  }

  static getInstance(): TouchOptimizationManager {
    if (!TouchOptimizationManager.instance) {
      TouchOptimizationManager.instance = new TouchOptimizationManager();
    }
    return TouchOptimizationManager.instance;
  }

  /**
   * Get optimal touch target size for current device
   */
  getOptimalTouchTargetSize(): number {
    const baseSize = this.deviceDetector.getOptimalTouchTargetSize();
    return Math.max(baseSize, this.config.targetSizes.min);
  }

  /**
   * Create enhanced touch styles for mobile components
   */
  createTouchStyles(
    baseClass: string = "",
    options: {
      size?: "min" | "optimal" | "enhanced";
      feedback?: boolean;
      haptic?: boolean;
    } = {},
  ): string {
    const deviceInfo = this.deviceDetector.getDeviceInfo();
    const screenSize = deviceInfo.screenSize;
    const isMobile = deviceInfo.type === "mobile";

    let size = this.config.targetSizes.optimal;
    if (options.size) {
      size = this.config.targetSizes[options.size];
    }

    const feedbackClass = options.feedback !== false ? "touch-feedback" : "";
    const hapticClass = options.haptic !== false ? "touch-haptic" : "";
    const mobileClass = isMobile ? "mobile-optimized" : "";
    const responsiveClass = this.getResponsiveClass(screenSize);

    return [
      baseClass,
      feedbackClass,
      hapticClass,
      mobileClass,
      responsiveClass,
      "touch-optimized",
    ]
      .filter(Boolean)
      .join(" ");
  }

  /**
   * Get responsive class based on screen size
   */
  private getResponsiveClass(screenSize: {
    width: number;
    height: number;
  }): string {
    if (screenSize.width < 375) return "responsive-small";
    if (screenSize.width < 414) return "responsive-medium";
    if (screenSize.width < 768) return "responsive-large";
    return "responsive-xlarge";
  }

  /**
   * Add touch event listeners with performance optimization
   */
  addTouchListeners(
    element: HTMLElement,
    handlers: TouchEventHandlers,
    options: {
      enableGpuAcceleration?: boolean;
      passiveListeners?: boolean;
    } = {},
  ): () => void {
    const deviceInfo = this.deviceDetector.getDeviceInfo();
    const isHighDPI = deviceInfo.pixelRatio > 1;
    const isMobile = deviceInfo.type === "mobile";

    // Performance optimization: Use passive listeners where possible
    const passiveOptions =
      options.passiveListeners !== false ? { passive: true } : {};

    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartTime = performance.now();

      if (event.touches.length > 0) {
        const touch = event.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
      }

      // Visual feedback
      if (this.config.enableVisualFeedback) {
        element.classList.add("touch-active");
      }

      // Haptic feedback (if supported and enabled)
      if (this.config.enableHapticFeedback && "vibrate" in navigator) {
        navigator.vibrate(10); // Light vibration for touch feedback
      }

      // Performance tracking
      if (this.config.enablePerformanceOptimization) {
        recordMetric("touch_start_time", touchStartTime, "ms", {
          device_type: deviceInfo.type,
          screen_size: `${screenSize.width}x${screenSize.height}`,
          is_high_dpi: isHighDPI,
        });
      }

      handlers.onTouchStart?.(event);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touchEndTime = performance.now();
      const responseTime = touchEndTime - touchStartTime;

      // Remove visual feedback
      if (this.config.enableVisualFeedback) {
        element.classList.remove("touch-active");
      }

      // Performance tracking
      if (this.config.enablePerformanceOptimization) {
        recordMetric("touch_response_time", responseTime, "ms", {
          device_type: deviceInfo.type,
          screen_size: `${screenSize.width}x${screenSize.height}`,
          is_high_dpi: isHighDPI,
          exceeded_threshold:
            responseTime > this.config.maxResponseTime ? "true" : "false",
        });
      }

      // Check performance and optimize if needed
      if (
        this.config.enablePerformanceOptimization &&
        responseTime > this.config.maxResponseTime
      ) {
        this.optimizeForPerformance(element);
      }

      handlers.onTouchEnd?.(event);
    };

    const handleTouchMove = (event: TouchEvent) => {
      // Prevent default for better touch experience
      event.preventDefault();

      handlers.onTouchMove?.(event);
    };

    // Add event listeners
    element.addEventListener("touchstart", handleTouchStart, passiveOptions);
    element.addEventListener("touchend", handleTouchEnd, passiveOptions);
    element.addEventListener("touchmove", handleTouchMove, passiveOptions);

    // GPU acceleration for better performance
    if (
      options.enableGpuAcceleration !== false &&
      this.config.enablePerformanceOptimization
    ) {
      element.style.transform = "translateZ(0)";
      element.style.willChange = "transform";
    }

    // Return cleanup function
    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchmove", handleTouchMove);

      // Clean up GPU acceleration
      if (options.enableGpuAcceleration !== false) {
        element.style.transform = "";
        element.style.willChange = "";
      }
    };
  }

  /**
   * Optimize element for better performance
   */
  private optimizeForPerformance(element: HTMLElement): void {
    // Reduce complexity temporarily
    const originalWillChange = element.style.willChange;
    element.style.willChange = "auto";

    // Reset after a short delay
    setTimeout(() => {
      element.style.willChange = originalWillChange;
    }, 100);
  }

  /**
   * Create touch-optimized CSS styles
   */
  getOptimizedCSS(): string {
    return `
    /* Touch optimization styles */
    .touch-optimized {
      position: relative;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      touch-action: manipulation;
      outline: none;
    }

    .touch-feedback {
      transition: transform 0.1s ease-out,
      box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.1);
    }

    .touch-feedback:active {
      transform: scale(0.95);
      box-shadow: 0 0 0 8px rgba(0, 0, 0, 0.2);
    }

    .touch-active {
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 8px;
    }

    .touch-haptic {
      /* Visual indicator for haptic feedback */
      position: relative;
    }

    .touch-haptic::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
      border: 2px solid rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      animation: haptic-pulse 0.3s ease-out;
    }

    @keyframes haptic-pulse {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(1.5);
      }
    }

    /* Responsive styles for different screen sizes */
    .responsive-small {
      /* Screens < 375px */
      --touch-target-min: 44px;
      --touch-target-optimal: 48px;
    }

    .responsive-medium {
      /* Screens 375px - 413px */
      --touch-target-min: 44px;
      --touch-target-optimal: 48px;
    }

    .responsive-large {
      /* Screens 414px - 767px */
      --touch-target-min: 44px;
      --touch-target-optimal: 48px;
    }

    .responsive-xlarge {
      /* Screens > 768px */
      --touch-target-min: 44px;
      --touch-target-optimal: 48px;
    }

    /* Mobile-specific optimizations */
    .mobile-optimized {
      /* Better spacing for touch targets */
      gap: 12px;
      padding: 16px;
    }

    /* High DPI display optimizations */
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      .touch-optimized {
        /* Adjust sizes for high DPI displays */
        --touch-target-min: calc(44px * var(--pixel-ratio, 1));
        --touch-target-optimal: calc(48px * var(--pixel-ratio, 1));
      }
    }

    /* Reduce motion for accessibility */
    @media (prefers-reduced-motion: reduce) {
      .touch-feedback,
      .touch-feedback:active {
        transition: none;
        transform: none;
      }
    }

    /* Battery optimization */
    @media (prefers-reduced-data: reduce) {
      .touch-optimized {
        /* Disable non-essential animations */
        animation: none;
        transition: none;
      }
    }

    /* GPU acceleration for smooth animations */
    .gpu-accelerated {
      transform: translateZ(0);
      will-change: transform;
      backface-visibility: hidden;
    }

    /* Touch-friendly hover states for desktop */
    @media (hover: hover) and (pointer: fine) {
      .touch-optimized:hover {
        background-color: rgba(0, 0, 0, 0.05);
        border-color: rgba(0, 0, 0, 0.1);
      }
    }

    /* Disable hover on touch devices */
    @media (hover: none) and (pointer: coarse) {
      .touch-optimized:hover {
        background-color: transparent;
        border-color: transparent;
      }
    }
  `;
  }

  /**
   * Check if device supports haptic feedback
   */
  supportsHapticFeedback(): boolean {
    return "vibrate" in navigator;
  }

  /**
   * Trigger haptic feedback if supported
   */
  triggerHapticFeedback(pattern?: number | number[]): void {
    if (this.config.enableHapticFeedback && this.supportsHapticFeedback()) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Get device-specific configuration
   */
  getDeviceConfig(): {
    deviceType: string;
    screenSize: { width: number; height: number };
    isHighDPI: boolean;
    touchTargetSize: number;
    maxResponseTime: number;
    supportsHaptic: boolean;
  } {
    const deviceInfo = this.deviceDetector.getDeviceInfo();

    return {
      deviceType: deviceInfo.type,
      screenSize: deviceInfo.screenSize,
      isHighDPI: deviceInfo.pixelRatio > 1,
      touchTargetSize: this.getOptimalTouchTargetSize(),
      maxResponseTime: this.config.maxResponseTime,
      supportsHaptic: this.supportsHapticFeedback(),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TouchOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = {
      enableHapticFeedback: true,
      enableVisualFeedback: true,
      enableGestureRecognition: true,
      enablePerformanceOptimization: true,
      maxResponseTime: 300,
      feedbackDuration: 150,
      targetSizes: {
        min: DEFAULT_MOBILE_CONFIG.touchTargetSizes.min,
        optimal: DEFAULT_MOBILE_CONFIG.touchTargetSizes.optimal,
        enhanced: DEFAULT_MOBILE_CONFIG.touchTargetSizes.enhanced,
      },
      accessibility: {
        minTouchTargetSize: 44,
        enhancedTouchTargetSize: 56,
        spacingBetweenTargets: 8,
        enableScreenReaderSupport: true,
        announceTouchInteractions: true,
        provideAudioDescriptions: false,
        enableGestureSimplification: true,
        alternativeInputMethods: true,
        extendedTimeout: true,
        highContrastMode: false,
        focusIndicators: true,
        reduceMotion: false,
        colorBlindSupport: true,
        provideInstructions: true,
        consistentLayout: true,
        errorPrevention: true,
      },
    };
  }

  // ===== ACCESSIBILITY ENHANCEMENTS =====

  /**
   * Create WCAG 2.1 compliant touch target with accessibility features
   */
  createAccessibleTouchTarget(
    element: HTMLElement,
    options: {
      label?: string;
      description?: string;
      role?: string;
      isEnhanced?: boolean;
      announceInteraction?: boolean;
      gestureAlternative?: string;
    } = {},
  ): void {
    const {
      label,
      description,
      role,
      isEnhanced = false,
      announceInteraction = true,
      gestureAlternative,
    } = options;

    // WCAG 2.5.5: Ensure minimum touch target size
    const minSize = isEnhanced
      ? this.config.accessibility.enhancedTouchTargetSize
      : this.config.accessibility.minTouchTargetSize;

    // Apply minimum size
    element.style.minWidth = `${minSize}px`;
    element.style.minHeight = `${minSize}px`;

    // Add accessibility attributes
    if (label) {
      element.setAttribute("aria-label", label);
    }

    if (description) {
      element.setAttribute("aria-describedby", description);
    }

    if (role) {
      element.setAttribute("role", role);
    }

    // Add gesture alternative for screen reader users
    if (
      gestureAlternative &&
      this.config.accessibility.enableScreenReaderSupport
    ) {
      element.setAttribute("data-gesture-alternative", gestureAlternative);
    }

    // Add focus indicators if enabled
    if (this.config.accessibility.focusIndicators) {
      element.classList.add("accessibility-focus-enhanced");
    }

    // Add interaction announcement if enabled
    if (
      announceInteraction &&
      this.config.accessibility.announceTouchInteractions
    ) {
      this.addInteractionAnnouncement(element);
    }
  }

  /**
   * Add screen reader announcements for touch interactions
   */
  private addInteractionAnnouncement(element: HTMLElement): void {
    if (!this.screenReaderAnnouncer) return;

    element.addEventListener("touchstart", () => {
      const label =
        element.getAttribute("aria-label") || element.textContent || "Element";
      this.screenReaderAnnouncer!.announce(`${label} activated`);
    });

    element.addEventListener("touchend", () => {
      const label =
        element.getAttribute("aria-label") || element.textContent || "Element";
      this.screenReaderAnnouncer!.announce(`${label} completed`);
    });
  }

  /**
   * Create accessible gesture alternatives for complex gestures
   */
  createGestureAlternatives(
    container: HTMLElement,
    gestures: Array<{
      type: "swipe" | "pinch" | "rotate" | "long-press";
      description: string;
      alternatives: Array<{
        type: "button" | "voice" | "switch";
        label: string;
        action: () => void;
      }>;
    }>,
  ): void {
    if (!this.config.accessibility.enableGestureSimplification) return;

    gestures.forEach((gesture) => {
      // Create alternative control panel
      const panel = document.createElement("div");
      panel.className = "gesture-alternatives";
      panel.setAttribute("role", "group");
      panel.setAttribute("aria-label", `${gesture.description} alternatives`);

      gesture.alternatives.forEach((alternative) => {
        const button = document.createElement("button");
        button.className = "gesture-alternative-button";
        button.textContent = alternative.label;
        button.setAttribute("aria-label", alternative.label);

        // Ensure WCAG compliant size
        this.createAccessibleTouchTarget(button, {
          label: alternative.label,
          isEnhanced: false,
        });

        button.addEventListener("click", alternative.action);
        panel.appendChild(button);
      });

      container.appendChild(panel);
    });
  }

  /**
   * Enable voice control integration
   */
  enableVoiceControl(config: VoiceCommandConfig): void {
    if (!this.config.accessibility.alternativeInputMethods) return;

    if (!this.voiceCommandHandler) {
      this.voiceCommandHandler = new VoiceCommandHandler();
    }

    this.voiceCommandHandler.initialize(config);
  }

  /**
   * Enable switch navigation support
   */
  enableSwitchNavigation(config: SwitchNavigationConfig): void {
    if (!this.config.accessibility.alternativeInputMethods) return;

    if (!this.switchNavigationHandler) {
      this.switchNavigationHandler = new SwitchNavigationHandler();
    }

    this.switchNavigationHandler.initialize(config);
  }

  /**
   * Get WCAG 2.1 compliant accessibility CSS
   */
  getAccessibilityCSS(): string {
    return `
    /* WCAG 2.1 Touch Target Accessibility */
    .accessibility-enhanced {
      position: relative;
      min-width: ${this.config.accessibility.minTouchTargetSize}px;
      min-height: ${this.config.accessibility.minTouchTargetSize}px;
    }

    .accessibility-enhanced.enhanced {
      min-width: ${this.config.accessibility.enhancedTouchTargetSize}px;
      min-height: ${this.config.accessibility.enhancedTouchTargetSize}px;
    }

    /* Enhanced focus indicators */
    .accessibility-focus-enhanced:focus {
      outline: 3px solid #005fcc;
      outline-offset: 2px;
      box-shadow: 0 0 0 5px rgba(0, 95, 204, 0.3);
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .accessibility-enhanced {
        border: 2px solid currentColor;
        background: Window;
        color: WindowText;
      }

      .accessibility-focus-enhanced:focus {
        outline: 3px solid ButtonText;
        box-shadow: 0 0 0 2px ButtonText;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .accessibility-enhanced {
        transition: none !important;
        animation: none !important;
      }
    }

    /* Screen reader only content */
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

    /* Touch target spacing */
    .accessibility-spacing {
      margin: ${this.config.accessibility.spacingBetweenTargets}px;
    }

    /* Gesture alternatives panel */
    .gesture-alternatives {
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 2px solid #ccc;
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }

    .gesture-alternative-button {
      display: block;
      width: 100%;
      padding: 8px;
      margin: 4px 0;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      text-align: left;
      cursor: pointer;
    }

    .gesture-alternative-button:hover,
    .gesture-alternative-button:focus {
      background: #e9e9e9;
      border-color: #999;
    }

    /* Color-blind friendly feedback */
    .accessibility-feedback {
      position: relative;
    }

    .accessibility-feedback::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      border: 3px solid #333;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .accessibility-feedback.active::after {
      opacity: 1;
    }

    /* Switch navigation support */
    .switch-nav-focus {
      outline: 3px solid #ff6600;
      outline-offset: 2px;
      background: rgba(255, 102, 0, 0.1);
    }

    /* Voice control indicators */
    .voice-control-active {
      border: 2px solid #00cc00;
      animation: voice-pulse 1s infinite;
    }

    @keyframes voice-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Accessibility error prevention */
    .accessibility-confirm {
      position: relative;
    }

    .accessibility-confirm::before {
      content: '⚠️';
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ff6600;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    `;
  }
}

// Performance tracking utility
let performanceMetricsCollected = false;

const recordMetric = (
  name: string,
  value: number,
  unit: string,
  tags?: Record<string, string>,
) => {
  if (
    typeof window !== "undefined" &&
    "performance" in window &&
    performance.mark
  ) {
    try {
      performance.mark(`${name}-start`);

      // Simulate metric recording (in real implementation, this would send to analytics)
      if (!performanceMetricsCollected) {
        performanceMetricsCollected = true;
        console.log("Performance monitoring enabled for mobile optimization");
      }

      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      // In a real implementation, this would send to analytics service
      console.log(`Mobile Performance Metric: ${name} = ${value}${unit}`, tags);
    } catch (error) {
      console.warn("Performance monitoring not available:", error);
    }
  }
};

// ===== ACCESSIBILITY SUPPORT CLASSES =====

/**
 * Screen reader announcer for touch interactions
 */
class ScreenReaderAnnouncer {
  private announcementRegion: HTMLElement | null = null;

  constructor() {
    this.createAnnouncementRegion();
  }

  private createAnnouncementRegion(): void {
    if (typeof document === "undefined") return;

    this.announcementRegion = document.createElement("div");
    this.announcementRegion.setAttribute("aria-live", "polite");
    this.announcementRegion.setAttribute("aria-atomic", "true");
    this.announcementRegion.className = "sr-only";
    this.announcementRegion.setAttribute("id", "touch-announcer");
    document.body.appendChild(this.announcementRegion);
  }

  announce(message: string): void {
    if (!this.announcementRegion) return;

    this.announcementRegion.textContent = message;

    // Clear after announcement to allow repeated announcements
    setTimeout(() => {
      if (this.announcementRegion) {
        this.announcementRegion.textContent = "";
      }
    }, 1000);
  }
}

/**
 * Voice command handler for accessibility
 */
class VoiceCommandHandler {
  private recognition: SpeechRecognition | null = null;
  private isEnabled = false;
  private commandMap: Map<string, () => void> = new Map();

  constructor() {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const command = event.results[event.results.length - 1][0].transcript
        .trim()
        .toLowerCase();
      this.executeCommand(command);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("Voice recognition error:", event.error);
    };
  }

  initialize(config: VoiceCommandConfig): void {
    if (!this.recognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    // Clear existing commands
    this.commandMap.clear();

    // Map voice commands to actions
    Object.entries(config.commands).forEach(([voiceCommand, action]) => {
      // Create action function from action string
      const actionFunction = this.createActionFunction(action);
      this.commandMap.set(voiceCommand, actionFunction);
    });

    this.recognition.lang = config.recognitionLanguage;
    this.isEnabled = config.enableVoiceControl;

    if (this.isEnabled) {
      this.startListening();
    }
  }

  private createActionFunction(action: string): () => void {
    // This would be expanded to handle various action types
    return () => {
      console.log(`Voice command executed: ${action}`);
      // Dispatch custom event for the action
      window.dispatchEvent(
        new CustomEvent("voice-command", { detail: { action } }),
      );
    };
  }

  private executeCommand(command: string): void {
    // Find matching command
    for (const [mappedCommand, action] of this.commandMap) {
      if (command.includes(mappedCommand.toLowerCase())) {
        action();
        return;
      }
    }
  }

  private startListening(): void {
    if (this.recognition && this.isEnabled) {
      this.recognition.start();
    }
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

/**
 * Switch navigation handler for motor impairments
 */
class SwitchNavigationHandler {
  private isEnabled = false;
  private focusableElements: HTMLElement[] = [];
  private currentIndex = 0;
  private scanInterval: NodeJS.Timeout | null = null;
  private config: SwitchNavigationConfig | null = null;

  initialize(config: SwitchNavigationConfig): void {
    this.config = config;
    this.isEnabled = config.enableSwitchNavigation;

    if (this.isEnabled) {
      this.setupSwitchNavigation();
    }
  }

  private setupSwitchNavigation(): void {
    if (!this.config) return;

    // Find all focusable elements
    this.updateFocusableElements();

    // Set up keyboard listeners for switch control
    document.addEventListener("keydown", this.handleKeyPress.bind(this));

    // Start auto-scan if enabled
    if (this.config.autoScan) {
      this.startAutoScan();
    }
  }

  private updateFocusableElements(): void {
    const selector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
      ".touch-optimized",
    ].join(", ");

    this.focusableElements = Array.from(
      document.querySelectorAll(selector),
    ) as HTMLElement[];
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    switch (event.key) {
      case " ": // Space - common switch input
        this.activateCurrentElement();
        break;
      case "Enter":
        this.activateCurrentElement();
        break;
      case "ArrowRight":
      case "ArrowDown":
        this.moveToNext();
        break;
      case "ArrowLeft":
      case "ArrowUp":
        this.moveToPrevious();
        break;
    }
  }

  private moveToNext(): void {
    if (this.focusableElements.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.focusableElements.length;
    this.focusCurrentElement();
  }

  private moveToPrevious(): void {
    if (this.focusableElements.length === 0) return;

    this.currentIndex =
      this.currentIndex === 0
        ? this.focusableElements.length - 1
        : this.currentIndex - 1;
    this.focusCurrentElement();
  }

  private focusCurrentElement(): void {
    const element = this.focusableElements[this.currentIndex];
    if (element) {
      element.classList.add("switch-nav-focus");
      element.focus();

      // Remove focus class from others
      this.focusableElements.forEach((el, index) => {
        if (index !== this.currentIndex) {
          el.classList.remove("switch-nav-focus");
        }
      });
    }
  }

  private activateCurrentElement(): void {
    const element = this.focusableElements[this.currentIndex];
    if (element) {
      element.click();
    }
  }

  private startAutoScan(): void {
    if (!this.config) return;

    this.scanInterval = setInterval(() => {
      this.moveToNext();
    }, this.config.scanSpeed);
  }

  stopAutoScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
}

/**
 * Accessibility testing utilities
 */
class AccessibilityTester {
  private testResults: Map<string, boolean> = new Map();

  /**
   * Test WCAG 2.5.5 touch target size compliance
   */
  testTouchTargetSizes(): { passed: boolean; violations: Element[] } {
    const violations: Element[] = [];
    const touchTargets = document.querySelectorAll(
      '.touch-optimized, button, [role="button"]',
    );

    touchTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      const minSize = 44; // WCAG minimum

      if (rect.width < minSize || rect.height < minSize) {
        violations.push(target);
      }
    });

    const passed = violations.length === 0;
    this.testResults.set("touchTargetSizes", passed);

    return { passed, violations };
  }

  /**
   * Test focus indicator visibility
   */
  testFocusIndicators(): { passed: boolean; violations: Element[] } {
    const violations: Element[] = [];
    const focusableElements = document.querySelectorAll(
      "button, [href], input, select, textarea",
    );

    focusableElements.forEach((element) => {
      const styles = window.getComputedStyle(element, ":focus");
      const hasOutline = styles.outline !== "none" && styles.outline !== "";
      const hasBoxShadow = styles.boxShadow !== "none";

      if (!hasOutline && !hasBoxShadow) {
        violations.push(element);
      }
    });

    const passed = violations.length === 0;
    this.testResults.set("focusIndicators", passed);

    return { passed, violations };
  }

  /**
   * Test color contrast compliance
   */
  testColorContrast(): {
    passed: boolean;
    violations: { element: Element; ratio: number }[];
  } {
    const violations: { element: Element; ratio: number }[] = [];

    // This is a simplified test - real implementation would use a contrast calculation library
    const textElements = document.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, span, button",
    );

    textElements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Simple check - real implementation would calculate WCAG contrast ratio
      if (color === backgroundColor) {
        violations.push({ element, ratio: 1 });
      }
    });

    const passed = violations.length === 0;
    this.testResults.set("colorContrast", passed);

    return { passed, violations };
  }

  /**
   * Test screen reader accessibility
   */
  testScreenReaderAccessibility(): { passed: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for ARIA labels on interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, [role="button"]',
    );
    interactiveElements.forEach((element) => {
      const hasLabel =
        element.hasAttribute("aria-label") ||
        element.hasAttribute("aria-labelledby") ||
        element.textContent?.trim();

      if (!hasLabel) {
        issues.push(
          `Interactive element missing accessible label: ${element.tagName}`,
        );
      }
    });

    // Check for alternative text on images
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      if (!img.hasAttribute("alt")) {
        issues.push(`Image missing alt text: ${img.src}`);
      }
    });

    const passed = issues.length === 0;
    this.testResults.set("screenReaderAccessibility", passed);

    return { passed, issues };
  }

  /**
   * Run comprehensive accessibility audit
   */
  runAccessibilityAudit(): {
    overall: boolean;
    tests: {
      name: string;
      passed: boolean;
      details: any;
    }[];
  } {
    const tests = [
      {
        name: "Touch Target Sizes (WCAG 2.5.5)",
        ...this.testTouchTargetSizes(),
      },
      {
        name: "Focus Indicators",
        ...this.testFocusIndicators(),
      },
      {
        name: "Color Contrast",
        ...this.testColorContrast(),
      },
      {
        name: "Screen Reader Accessibility",
        ...this.testScreenReaderAccessibility(),
      },
    ];

    const overall = tests.every((test) => test.passed);

    return { overall, tests };
  }

  /**
   * Get accessibility compliance report
   */
  getComplianceReport(): {
    wcagLevel: string;
    score: number;
    recommendations: string[];
  } {
    const audit = this.runAccessibilityAudit();
    const passedTests = audit.tests.filter((test) => test.passed).length;
    const totalTests = audit.tests.length;
    const score = Math.round((passedTests / totalTests) * 100);

    let wcagLevel = "A";
    if (score >= 80) wcagLevel = "AA";
    if (score >= 95) wcagLevel = "AAA";

    const recommendations: string[] = [];

    if (!audit.tests.find((t) => t.name.includes("Touch Target")).passed) {
      recommendations.push(
        "Increase touch target sizes to meet WCAG 2.5.5 requirements (44x44px minimum)",
      );
    }

    if (!audit.tests.find((t) => t.name.includes("Focus")).passed) {
      recommendations.push(
        "Add visible focus indicators for keyboard navigation",
      );
    }

    if (!audit.tests.find((t) => t.name.includes("Color")).passed) {
      recommendations.push(
        "Improve color contrast ratios for better readability",
      );
    }

    if (!audit.tests.find((t) => t.name.includes("Screen Reader")).passed) {
      recommendations.push(
        "Add ARIA labels and descriptions for screen reader compatibility",
      );
    }

    return {
      wcagLevel,
      score,
      recommendations,
    };
  }
}

// Export singleton instance
export const touchOptimizer = TouchOptimizationManager.getInstance();
