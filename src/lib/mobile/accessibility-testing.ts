/**
 * Comprehensive Accessibility Testing Utilities
 * Automated testing for WCAG 2.1 compliance with mobile-specific tests
 */

import { touchOptimizer } from './touch-optimization';
import { visualAccessibility } from './visual-accessibility';
import { gestureAccessibility } from './gesture-accessibility';

// Test result interfaces
export interface TestResult {
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  element?: Element;
  recommendation?: string;
  wcagGuideline: string;
  automated: boolean;
}

export interface AccessibilityTestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  overallScore: number;
  wcagLevel: 'A' | 'AA' | 'AAA' | 'Not Compliant';
}

export interface AccessibilityReport {
  timestamp: Date;
  overall: AccessibilityTestSuite;
  suites: AccessibilityTestSuite[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    warnings: number;
    wcagCompliance: 'A' | 'AA' | 'AAA' | 'Not Compliant';
  };
  recommendations: string[];
}

// Test configurations
export interface TestConfiguration {
  includeManualTests: boolean;
  strictMode: boolean;
  testTouchTargets: boolean;
  testColorContrast: boolean;
  testKeyboardNavigation: boolean;
  testScreenReaderCompatibility: boolean;
  testMotorAccessibility: boolean;
  testCognitiveAccessibility: boolean;
}

export class AccessibilityTester {
  private static instance: AccessibilityTester;
  private config: TestConfiguration;

  private constructor() {
    this.config = {
      includeManualTests: false,
      strictMode: false,
      testTouchTargets: true,
      testColorContrast: true,
      testKeyboardNavigation: true,
      testScreenReaderCompatibility: true,
      testMotorAccessibility: true,
      testCognitiveAccessibility: true
    };
  }

  static getInstance(): AccessibilityTester {
    if (!AccessibilityTester.instance) {
      AccessibilityTester.instance = new AccessibilityTester();
    }
    return AccessibilityTester.instance;
  }

  /**
   * Run comprehensive accessibility audit
   */
  runAccessibilityAudit(config?: Partial<TestConfiguration>): AccessibilityReport {
    this.config = { ...this.config, ...config };

    const suites: AccessibilityTestSuite[] = [];

    // Core WCAG 2.1 tests
    if (this.config.testTouchTargets) {
      suites.push(this.testTouchTargetCompliance());
    }

    if (this.config.testColorContrast) {
      suites.push(this.testColorContrastCompliance());
    }

    if (this.config.testKeyboardNavigation) {
      suites.push(this.testKeyboardNavigationCompliance());
    }

    if (this.config.testScreenReaderCompatibility) {
      suites.push(this.testScreenReaderCompliance());
    }

    // Mobile-specific tests
    if (this.config.testMotorAccessibility) {
      suites.push(this.testMotorAccessibility());
    }

    if (this.config.testCognitiveAccessibility) {
      suites.push(this.testCognitiveAccessibility());
    }

    // Touch interface tests
    suites.push(this.testTouchInterface());

    // Gesture accessibility tests
    suites.push(this.testGestureAccessibility());

    // Calculate overall results
    const summary = this.calculateSummary(suites);
    const overall = this.calculateOverallScore(suites);
    const recommendations = this.generateRecommendations(suites);

    return {
      timestamp: new Date(),
      overall,
      suites,
      summary,
      recommendations
    };
  }

  /**
   * Test WCAG 2.5.5 Touch Target Size compliance
   */
  private testTouchTargetCompliance(): AccessibilityTestSuite {
    const tests: TestResult[] = [];
    const touchTargets = document.querySelectorAll(
      'button, [role="button"], input, select, textarea, a[href], .touch-optimized'
    );

    touchTargets.forEach((target, index) => {
      const rect = target.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const minSize = 44; // WCAG minimum
      const enhancedSize = 56; // Enhanced for frequently used controls

      // Test minimum size (44x44px)
      if (width < minSize || height < minSize) {
        tests.push({
          passed: false,
          severity: 'error',
          message: `Touch target ${index + 1} is too small: ${width}x${height}px (minimum: ${minSize}x${minSize}px)`,
          element: target,
          recommendation: `Increase touch target size to at least ${minSize}x${minSize}px`,
          wcagGuideline: 'WCAG 2.5.5 Target Size',
          automated: true
        });
      }

      // Test for enhanced size on frequently used controls
      const isFrequentControl = target.classList.contains('frequently-used') ||
                              target.getAttribute('aria-label')?.includes('play') ||
                              target.getAttribute('aria-label')?.includes('pause') ||
                              target.getAttribute('aria-label')?.includes('submit');

      if (isFrequentControl && (width < enhancedSize || height < enhancedSize)) {
        tests.push({
          passed: false,
          severity: 'warning',
          message: `Frequently used touch target ${index + 1} should be larger: ${width}x${height}px (recommended: ${enhancedSize}x${enhancedSize}px)`,
          element: target,
          recommendation: `Consider increasing size to ${enhancedSize}x${enhancedSize}px for frequently used controls`,
          wcagGuideline: 'WCAG 2.5.5 Target Size (Enhanced)',
          automated: true
        });
      } else if (width >= enhancedSize && height >= enhancedSize) {
        tests.push({
          passed: true,
          severity: 'info',
          message: `Touch target ${index + 1} meets enhanced size requirements: ${width}x${height}px`,
          element: target,
          wcagGuideline: 'WCAG 2.5.5 Target Size',
          automated: true
        });
      }
    });

    // Test spacing between targets
    if (touchTargets.length > 1) {
      for (let i = 0; i < touchTargets.length - 1; i++) {
        const current = touchTargets[i].getBoundingClientRect();
        const next = touchTargets[i + 1].getBoundingClientRect();
        const spacing = Math.abs(current.bottom - next.top);

        if (spacing < 8) { // 8px minimum spacing
          tests.push({
            passed: false,
            severity: 'warning',
            message: `Insufficient spacing between touch targets: ${spacing}px (minimum: 8px)`,
            recommendation: 'Add at least 8px spacing between touch targets',
            wcagGuideline: 'WCAG 2.5.5 Target Spacing',
            automated: true
          });
        }
      }
    }

    return {
      name: 'Touch Target Compliance',
      description: 'WCAG 2.5.5 Touch target size and spacing requirements',
      tests,
      overallScore: this.calculateTestScore(tests),
      wcagLevel: this.determineWCAGLevel(tests)
    };
  }

  /**
   * Test WCAG 1.4.3 Color Contrast compliance
   */
  private testColorContrastCompliance(): AccessibilityTestSuite {
    const tests: TestResult[] = [];

    // Get all text elements
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, span, label, button, a, input, textarea, select'
    );

    textElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Skip if colors are not set or transparent
      if (color === 'rgba(0, 0, 0, 0)' || backgroundColor === 'rgba(0, 0, 0, 0)' ||
          backgroundColor === 'transparent') {
        return;
      }

      // Calculate contrast ratio (simplified)
      const contrast = this.calculateContrastRatio(color, backgroundColor);
      const fontSize = parseFloat(styles.fontSize);
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && styles.fontWeight.includes('bold'));

      // WCAG requirements
      const minimumRatio = isLargeText ? 3 : 4.5;
      const enhancedRatio = isLargeText ? 4.5 : 7;

      if (contrast < minimumRatio) {
        tests.push({
          passed: false,
          severity: 'error',
          message: `Insufficient color contrast: ${contrast.toFixed(2)}:1 (minimum: ${minimumRatio}:1)`,
          element,
          recommendation: `Increase contrast ratio to at least ${minimumRatio}:1`,
          wcagGuideline: 'WCAG 1.4.3 Contrast (Minimum)',
          automated: true
        });
      } else if (contrast < enhancedRatio) {
        tests.push({
          passed: true,
          severity: 'warning',
          message: `Color contrast meets minimum but not enhanced requirements: ${contrast.toFixed(2)}:1 (enhanced: ${enhancedRatio}:1)`,
          element,
          recommendation: `Consider increasing contrast to ${enhancedRatio}:1 for enhanced compliance`,
          wcagGuideline: 'WCAG 1.4.6 Contrast (Enhanced)',
          automated: true
        });
      } else {
        tests.push({
          passed: true,
          severity: 'info',
          message: `Excellent color contrast: ${contrast.toFixed(2)}:1`,
          element,
          wcagGuideline: 'WCAG 1.4.3 Contrast',
          automated: true
        });
      }
    });

    return {
      name: 'Color Contrast Compliance',
      description: 'WCAG 1.4.3 and 1.4.6 Color contrast requirements',
      tests,
      overallScore: this.calculateTestScore(tests),
      wcagLevel: this.determineWCAGLevel(tests)
    };
  }

  /**
   * Test keyboard navigation compliance
   */
  private testKeyboardNavigationCompliance(): AccessibilityTestSuite {
    const tests: TestResult[] = [];

    // Test for focusable elements
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) {
      tests.push({
        passed: false,
        severity: 'error',
        message: 'No focusable elements found on the page',
        recommendation: 'Ensure interactive elements are keyboard accessible',
        wcagGuideline: 'WCAG 2.1.1 Keyboard',
        automated: true
      });
    } else {
      tests.push({
        passed: true,
        severity: 'info',
        message: `Found ${focusableElements.length} focusable elements`,
        wcagGuideline: 'WCAG 2.1.1 Keyboard',
        automated: true
      });
    }

    // Test for focus indicators
    focusableElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element, ':focus');
      const hasOutline = styles.outline !== 'none' && styles.outline !== '';
      const hasBoxShadow = styles.boxShadow !== 'none';
      const hasCustomFocus = element.classList.contains('focus-visible') ||
                            element.hasAttribute('data-focus');

      if (!hasOutline && !hasBoxShadow && !hasCustomFocus) {
        tests.push({
          passed: false,
          severity: 'error',
          message: `Element ${index + 1} lacks visible focus indicator`,
          element,
          recommendation: 'Add visible focus indicators for keyboard navigation',
          wcagGuideline: 'WCAG 2.4.7 Focus Visible',
          automated: true
        });
      }
    });

    // Test for logical tab order
    const tabbableElements = Array.from(focusableElements).filter(el => {
      const tabindex = el.getAttribute('tabindex');
      return !tabindex || parseInt(tabindex) >= 0;
    });

    let previousRect: DOMRect | null = null;
    for (let i = 0; i < tabbableElements.length; i++) {
      const current = tabbableElements[i].getBoundingClientRect();

      if (previousRect) {
        // Check for logical reading order
        if (current.top < previousRect.top - 50) {
          tests.push({
            passed: false,
            severity: 'warning',
            message: 'Tab order may not follow logical reading order',
            recommendation: 'Review tab order to ensure it follows the visual layout',
            wcagGuideline: 'WCAG 2.4.3 Focus Order',
            automated: true
          });
          break;
        }
      }
      previousRect = current;
    }

    return {
      name: 'Keyboard Navigation Compliance',
      description: 'WCAG 2.1.1 Keyboard and 2.4.3 Focus Order requirements',
      tests,
      overallScore: this.calculateTestScore(tests),
      wcagLevel: this.determineWCAGLevel(tests)
    };
  }

  /**
   * Test screen reader compatibility
   */
  private testScreenReaderCompliance(): AccessibilityTestSuite {
    const tests: TestResult[] = [];

    // Test for proper ARIA labels on interactive elements
    const interactiveElements = document.querySelectorAll('button, [role="button"], input, select, textarea');
    interactiveElements.forEach((element, index) => {
      const hasLabel = element.hasAttribute('aria-label') ||
                      element.hasAttribute('aria-labelledby') ||
                      element.hasAttribute('title') ||
                      element.textContent?.trim() ||
                      element.getAttribute('placeholder');

      if (!hasLabel) {
        tests.push({
          passed: false,
          severity: 'error',
          message: `Interactive element ${index + 1} missing accessible label`,
          element,
          recommendation: 'Add aria-label, aria-labelledby, or visible text to interactive elements',
          wcagGuideline: 'WCAG 1.3.1 Info and Relationships',
          automated: true
        });
      }
    });

    // Test for image alt text
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.hasAttribute('alt')) {
        tests.push({
          passed: false,
          severity: 'error',
          message: `Image ${index + 1} missing alt text`,
          element: img,
          recommendation: 'Add descriptive alt text to all images',
          wcagGuideline: 'WCAG 1.1.1 Non-text Content',
          automated: true
        });
      }
    });

    // Test for proper heading structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
      let previousLevel = 0;
      headings.forEach((heading, index) => {
        const currentLevel = parseInt(heading.tagName.substring(1));

        if (currentLevel > previousLevel + 1) {
          tests.push({
            passed: false,
            severity: 'warning',
            message: `Heading level jump from H${previousLevel} to H${currentLevel}`,
            element: heading,
            recommendation: 'Use sequential heading levels without skipping',
            wcagGuideline: 'WCAG 1.3.1 Info and Relationships',
            automated: true
          });
        }
        previousLevel = currentLevel;
      });
    }

    // Test for form labels
    const formInputs = document.querySelectorAll('input, select, textarea');
    formInputs.forEach((input, index) => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`) ||
                      input.hasAttribute('aria-label') ||
                      input.hasAttribute('aria-labelledby') ||
                      input.hasAttribute('title') ||
                      input.hasAttribute('placeholder');

      if (!hasLabel) {
        tests.push({
          passed: false,
          severity: 'error',
          message: `Form input ${index + 1} missing label`,
          element: input,
          recommendation: 'Associate form inputs with proper labels',
          wcagGuideline: 'WCAG 1.3.1 Info and Relationships',
          automated: true
        });
      }
    });

    // Test for landmarks
    const landmarks = document.querySelectorAll('main, nav, header, footer, aside, section[aria-label], section[aria-labelledby]');
    if (landmarks.length === 0) {
      tests.push({
        passed: false,
        severity: 'warning',
        message: 'No ARIA landmarks found',
        recommendation: 'Add ARIA landmarks to improve navigation for screen reader users',
        wcagGuideline: 'WCAG 1.3.6 Identify Purpose',
        automated: true
      });
    }

    return {
      name: 'Screen Reader Compatibility',
      description: 'WCAG 1.3.x and 4.1.x requirements for screen reader users',
      tests,
      overallScore: this.calculateTestScore(tests),
      wcagLevel: this.determineWCAGLevel(tests)
    };
  }

  /**
   * Test motor accessibility features
   */
  private testMotorAccessibility(): AccessibilityTestSuite {
    const tests: TestResult[] = [];

    // Test for reduced motion support
    const animatedElements = document.querySelectorAll('[style*="animation"], [style*="transition"]');
    const hasReducedMotionStyles = document.querySelector('style[data-reduced-motion]') ||
                                  Array.from(document.stylesheets).some(sheet => {
                                    try {
                                      return Array.from(sheet.cssRules || []).some(rule =>
                                        rule.cssText.includes('prefers-reduced-motion')
                                      );
                                    } catch (e) {
                                      return false;
                                    }
                                  });

    if (animatedElements.length > 0 && !hasReducedMotionStyles) {
      tests.push({
        passed: false,
        severity: 'warning',
        message: 'Animated elements found but no reduced motion support detected',
        recommendation: 'Add prefers-reduced-motion media query support',
        wcagGuideline: 'WCAG 2.3.3 Animation from Interactions',
        automated: true
      });
    }

    // Test for timing adjustments
    const timedElements = document.querySelectorAll('[data-timeout], [data-interval]');
    timedElements.forEach((element, index) => {
      const timeout = element.getAttribute('data-timeout') || element.getAttribute('data-interval');
      if (timeout && parseInt(timeout) < 5000) {
        tests.push({
          passed: false,
          severity: 'warning',
          message: `Timed element ${index + 1} has short duration: ${timeout}ms`,
          element,
          recommendation: 'Allow users to extend or disable time limits',
          wcagGuideline: 'WCAG 2.2.1 Timing Adjustable',
          automated: true
        });
      }
    });

    // Test for pause/stop controls
    const autoPlayingElements = document.querySelectorAll('[data-autoplay="true"], video[autoplay], audio[autoplay]');
    if (autoPlayingElements.length > 0) {
      const hasPauseControls = Array.from(autoPlayingElements).some(element => {
        return element.hasAttribute('controls') ||
               document.querySelector(`[data-pause-for="${element.id}"]`);
      });

      if (!hasPauseControls) {
        tests.push({
          passed: false,
          severity: 'error',
          message: 'Auto-playing content without pause controls found',
          recommendation: 'Add pause, stop, or hide controls for auto-playing content',
          wcagGuideline: 'WCAG 2.2.2 Pause, Stop, Hide',
          automated: true
        });
      }
    }

    return {
      name: 'Motor Accessibility',
      description: 'WCAG 2.2.x requirements for users with motor impairments',
      tests,
      overallScore: this.calculateTestScore(tests),
      wcagLevel: this.determineWCAGLevel(tests)
    };
  }

  /**
   * Test cognitive accessibility features
   */
  private testCognitiveAccessibility(): AccessibilityTestSuite {
    const tests: TestResult[] = [];

    // Test for consistent navigation
    const navigationElements = document.querySelectorAll('nav, [role="navigation"]');
    if (navigationElements.length === 0) {
      tests.push({
        passed: false,
        severity: 'warning',
        message: 'No navigation landmarks found',
        recommendation: 'Add consistent navigation with proper landmarks',
        wcagGuideline: 'WCAG 3.2.3 Consistent Navigation',
        automated: true
      });
    }

    // Test for page titles
    if (!document.title || document.title.trim().length === 0) {
      tests.push({
        passed: false,
        severity: 'error',
        message: 'Page missing title',
        recommendation: 'Add descriptive page titles',
        wcagGuideline: 'WCAG 2.4.2 Page Titled',
        automated: true
      });
    }

    // Test for language declaration
    const htmlElement = document.documentElement;
    if (!htmlElement.hasAttribute('lang') && !htmlElement.hasAttribute('xml:lang')) {
      tests.push({
        passed: false,
        severity: 'warning',
        message: 'Page language not declared',
        recommendation: 'Add lang attribute to html element',
        wcagGuideline: 'WCAG 3.1.1 Language of Page',
        automated: true
      });
    }

    // Test for error identification
    const errorElements = document.querySelectorAll('.error, [data-error], [aria-invalid="true"]');
    if (errorElements.length === 0) {
      tests.push({
        passed: false,
        severity: 'warning',
        message: 'No error handling mechanisms found',
        recommendation: 'Implement clear error identification and suggestions',
        wcagGuideline: 'WCAG 3.3.1 Error Identification',
        automated: true
      });
    }

    // Test for help and documentation
    const helpElements = document.querySelectorAll('[data-help], .help, [aria-describedby]');
    if (helpElements.length === 0) {
      tests.push({
        passed: false,
        severity: 'info',
        message: 'No help or documentation found',
        recommendation: 'Consider adding help content for complex interfaces',
        wcagGuideline: 'WCAG 3.3.5 Help',
        automated: true
      });
    }

    return {
      name: 'Cognitive Accessibility',
      description: 'WCAG 3.x requirements for users with cognitive disabilities',
      tests,
      overallScore: this.calculateTestScore(tests),
      wcagLevel: this.determineWCAGLevel(tests)
    };
  }

  /**
   * Test touch interface specific accessibility
   */
  private testTouchInterface(): AccessibilityTestSuite {
    const tests: TestResult[] = [];

    // Test for touch-action properties
    const touchElements = document.querySelectorAll('.touch-optimized, [data-touch]');
    touchElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element);
      const hasTouchAction = styles.touchAction !== 'auto';

      if (!hasTouchAction) {
        tests.push({
          passed: false,
          severity: 'warning',
          message: `Touch element ${index + 1} lacks touch-action property`,
          element,
          recommendation: 'Add appropriate touch-action CSS property',
          wcagGuideline: 'Mobile Best Practice',
          automated: true
        });
      }
    });

    // Test for device compatibility
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);

    if (isMobile) {
      // Test viewport meta tag
      const viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        tests.push({
          passed: false,
          severity: 'error',
          message: 'Mobile page missing viewport meta tag',
          recommendation: 'Add viewport meta tag with width=device-width and initial-scale=1',
          wcagGuideline: 'Mobile Accessibility',
          automated: true
        });
      }
    }

    return {
      name: 'Touch Interface Accessibility',
      description: 'Mobile-specific accessibility requirements and best practices',
      tests,
      overallScore: this.calculateTestScore(tests),
      wcagLevel: this.determineWCAGLevel(tests)
    };
  }

  /**
   * Test gesture accessibility features
   */
  private testGestureAccessibility(): AccessibilityTestSuite {
    const tests: TestResult[] = [];

    // Test for gesture alternatives
    const gestureElements = document.querySelectorAll('[data-gesture], .gesture-area');
    gestureElements.forEach((element, index) => {
      const gestureType = element.getAttribute('data-gesture');
      const hasAlternative = element.hasAttribute('data-gesture-alternative') ||
                           document.querySelector(`[data-alternative-for="${element.id}"]`);

      if (hasAlternative) {
        tests.push({
          passed: true,
          severity: 'info',
          message: `Gesture element ${index + 1} has alternative input methods`,
          element,
          wcagGuideline: 'Motor Accessibility',
          automated: true
        });
      } else {
        tests.push({
          passed: false,
          severity: 'warning',
          message: `Gesture element ${index + 1} lacks alternative input methods`,
          element,
          recommendation: 'Provide keyboard, button, or voice alternatives for gestures',
          wcagGuideline: 'Motor Accessibility',
          automated: true
        });
      }
    });

    // Test for voice control support
    const voiceCommands = document.querySelectorAll('[data-voice-command]');
    if (voiceCommands.length > 0) {
      tests.push({
        passed: true,
        severity: 'info',
        message: `Voice control support found: ${voiceCommands.length} commands`,
        wcagGuideline: 'Motor Accessibility',
        automated: true
      });
    }

    return {
      name: 'Gesture Accessibility',
      description: 'Alternative input methods for touch gestures',
      tests,
      overallScore: this.calculateTestScore(tests),
      wcagLevel: this.determineWCAGLevel(tests)
    };
  }

  /**
   * Calculate color contrast ratio (simplified)
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    // This is a simplified calculation
    // In a real implementation, you'd use a proper color contrast library
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);

    const luminance1 = (0.299 * rgb1.r + 0.587 * rgb1.g + 0.114 * rgb1.b) / 255;
    const luminance2 = (0.299 * rgb2.r + 0.587 * rgb2.g + 0.114 * rgb2.b) / 255;

    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Parse color string to RGB
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const styles = window.getComputedStyle(div);
    const rgbColor = styles.color;
    document.body.removeChild(div);

    const match = rgbColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }

    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Calculate test suite score
   */
  private calculateTestScore(tests: TestResult[]): number {
    if (tests.length === 0) return 100;

    const passedTests = tests.filter(test => test.passed).length;
    return Math.round((passedTests / tests.length) * 100);
  }

  /**
   * Determine WCAG compliance level
   */
  private determineWCAGLevel(tests: TestResult[]): 'A' | 'AA' | 'AAA' | 'Not Compliant' {
    const errors = tests.filter(test => test.severity === 'error').length;
    const warnings = tests.filter(test => test.severity === 'warning').length;

    if (errors > 0) return 'Not Compliant';
    if (warnings > 0) return 'A';
    return 'AA';
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(suites: AccessibilityTestSuite[]) {
    const allTests = suites.flatMap(suite => suite.tests);
    const totalTests = allTests.length;
    const passedTests = allTests.filter(test => test.passed).length;
    const failedTests = allTests.filter(test => test.severity === 'error').length;
    const warnings = allTests.filter(test => test.severity === 'warning').length;

    let wcagCompliance: 'A' | 'AA' | 'AAA' | 'Not Compliant' = 'Not Compliant';
    if (failedTests === 0) {
      if (warnings === 0) {
        wcagCompliance = 'AA';
      } else {
        wcagCompliance = 'A';
      }
    }

    return {
      totalTests,
      passedTests,
      failedTests,
      warnings,
      wcagCompliance
    };
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(suites: AccessibilityTestSuite[]): AccessibilityTestSuite {
    const allTests = suites.flatMap(suite => suite.tests);
    const score = this.calculateTestScore(allTests);
    const level = this.determineWCAGLevel(allTests);

    return {
      name: 'Overall Accessibility Compliance',
      description: 'Comprehensive WCAG 2.1 compliance assessment',
      tests: allTests,
      overallScore: score,
      wcagLevel: level
    };
  }

  /**
   * Generate accessibility recommendations
   */
  private generateRecommendations(suites: AccessibilityTestSuite[]): string[] {
    const recommendations: Set<string> = new Set();

    suites.forEach(suite => {
      suite.tests.forEach(test => {
        if (test.recommendation && !test.passed) {
          recommendations.add(test.recommendation);
        }
      });
    });

    // Add general recommendations based on common issues
    const allTests = suites.flatMap(suite => suite.tests);
    const touchIssues = allTests.some(test =>
      test.message.includes('touch target') || test.message.includes('spacing')
    );

    if (touchIssues) {
      recommendations.add('Consider using the touch-optimization utilities for better mobile accessibility');
    }

    const colorIssues = allTests.some(test =>
      test.message.includes('contrast') || test.message.includes('color')
    );

    if (colorIssues) {
      recommendations.add('Use the visual accessibility utilities for color-blind support');
    }

    const gestureIssues = allTests.some(test =>
      test.message.includes('gesture') || test.message.includes('alternative')
    );

    if (gestureIssues) {
      recommendations.add('Implement gesture accessibility features for users with motor impairments');
    }

    return Array.from(recommendations);
  }

  /**
   * Generate HTML accessibility report
   */
  generateHTMLReport(report: AccessibilityReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report - ${report.timestamp.toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; margin: 0; }
        .metric .label { color: #666; font-size: 14px; }
        .test-suite { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .test-suite h2 { background: #f5f5f5; padding: 15px; margin: 0; }
        .test-suite-content { padding: 20px; }
        .test-result { margin-bottom: 15px; padding: 10px; border-radius: 4px; }
        .test-result.passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test-result.warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .test-result.error { background: #f8d7da; border-left: 4px solid #dc3545; }
        .test-result.info { background: #d1ecf1; border-left: 4px solid #17a2b8; }
        .recommendations { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .recommendations h3 { margin-top: 0; }
        .recommendations ul { margin: 0; padding-left: 20px; }
        .wcag-level { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .wcag-level.A { background: #ffc107; color: #000; }
        .wcag-level.AA { background: #28a745; color: #fff; }
        .wcag-level.AAA { background: #17a2b8; color: #fff; }
        .wcag-level.Not-Compliant { background: #dc3545; color: #fff; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accessibility Audit Report</h1>
        <p>Generated on ${report.timestamp.toLocaleString()}</p>
        <p>WCAG Level: <span class="wcag-level ${report.summary.wcagCompliance.replace(' ', '-')}">${report.summary.wcagCompliance}</span></p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Overall Score</h3>
            <p class="value">${report.overall.overallScore}%</p>
            <p class="label">${report.overall.wcagLevel} Compliance</p>
        </div>
        <div class="metric">
            <h3>Total Tests</h3>
            <p class="value">${report.summary.totalTests}</p>
            <p class="label">Tests Run</p>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <p class="value">${report.summary.passedTests}</p>
            <p class="label">Tests Passed</p>
        </div>
        <div class="metric">
            <h3>Issues</h3>
            <p class="value">${report.summary.failedTests + report.summary.warnings}</p>
            <p class="label">Errors & Warnings</p>
        </div>
    </div>

    ${report.suites.map(suite => `
    <div class="test-suite">
        <h2>${suite.name} <span class="wcag-level ${suite.wcagLevel.replace(' ', '-')}">${suite.wcagLevel}</span></h2>
        <div class="test-suite-content">
            <p>${suite.description}</p>
            <p>Score: ${suite.overallScore}%</p>

            ${suite.tests.map(test => `
            <div class="test-result ${test.passed ? 'passed' : test.severity}">
                <strong>${test.passed ? '✓' : '✗'} ${test.message}</strong>
                ${test.recommendation ? `<p><strong>Recommendation:</strong> ${test.recommendation}</p>` : ''}
                <p><small>WCAG Guideline: ${test.wcagGuideline} | Automated: ${test.automated ? 'Yes' : 'No'}</small></p>
            </div>
            `).join('')}
        </div>
    </div>
    `).join('')}

    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h3>Recommendations</h3>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
</body>
</html>
    `;
  }

  /**
   * Export accessibility report to file
   */
  async exportReport(report: AccessibilityReport, format: 'json' | 'html' = 'json'): Promise<string> {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
      filename = `accessibility-report-${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      content = this.generateHTMLReport(report);
      filename = `accessibility-report-${Date.now()}.html`;
      mimeType = 'text/html';
    }

    // Create blob and download
    if (typeof window !== 'undefined') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return content;
  }

  /**
   * Get current test configuration
   */
  getConfiguration(): TestConfiguration {
    return { ...this.config };
  }

  /**
   * Update test configuration
   */
  updateConfiguration(config: Partial<TestConfiguration>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const accessibilityTester = AccessibilityTester.getInstance();

// Export convenience function for React components
export function useAccessibilityTesting(config?: Partial<TestConfiguration>) {
  const tester = accessibilityTester;

  React.useEffect(() => {
    if (config) {
      tester.updateConfiguration(config);
    }
  }, [config]);

  return {
    runAudit: tester.runAccessibilityAudit.bind(tester),
    exportReport: tester.exportReport.bind(tester),
    updateConfig: tester.updateConfiguration.bind(tester),
    getConfig: tester.getConfiguration.bind(tester)
  };
}
