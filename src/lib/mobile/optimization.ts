/**
 * Base mobile optimization utilities for enhanced touch and performance features
 */

import { MobileDetector, TouchGestureDetector, DEFAULT_MOBILE_CONFIG, type MobileOptimizationConfig } from '@/types/mobile';
import { performanceMonitor } from '@/lib/performance/performance-monitor';

export class MobileOptimizer {
  private config: MobileOptimizationConfig;
  private gestureDetector: TouchGestureDetector;
  private detector: MobileDetector;
  private isLowPowerMode: boolean = false;
  private batteryLevel: number = 1.0;

  constructor(config: MobileOptimizationConfig = DEFAULT_MOBILE_CONFIG) {
    this.config = config;
    this.detector = MobileDetector.getInstance();
    this.gestureDetector = new TouchGestureDetector(config);
    this.initializeBatteryOptimizations();
  }

  /**
   * Initialize battery optimization features
   */
  private initializeBatteryOptimizations(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.batteryLevel = battery.level;
        this.isLowPowerMode = battery.level < this.config.battery.lowPowerModeThreshold;

        // Listen for battery changes
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
          this.isLowPowerMode = battery.level < this.config.battery.lowPowerModeThreshold;
          this.adjustPerformanceBasedOnBattery();
        });

        battery.addEventListener('chargingchange', () => {
          this.isLowPowerMode = !battery.charging && battery.level < this.config.battery.lowPowerModeThreshold;
          this.adjustPerformanceBasedOnBattery();
        });
      }).catch((error) => {
        console.warn('Battery API not supported:', error);
      });
    }
  }

  /**
   * Adjust performance based on battery level
   */
  private adjustPerformanceBasedOnBattery(): void {
    if (this.config.battery.enableOptimizations) {
      // Reduce animations and effects in low power mode
      if (this.isLowPowerMode) {
        document.body.classList.add('low-power-mode');
        this.config.performance.reduceAnimations = true;
      } else {
        document.body.classList.remove('low-power-mode');
        this.config.performance.reduceAnimations = false;
      }
    }
  }

  /**
   * Get optimal touch target size for current device
   */
  getOptimalTouchTargetSize(): number {
    return this.detector.getOptimalTouchTargetSize();
  }

  /**
   * Check if device is mobile
   */
  isMobileDevice(): boolean {
    return this.detector.isMobile();
  }

  /**
   * Check if device is tablet
   */
  isTabletDevice(): boolean {
    return this.detector.isTablet();
  }

  /**
   * Get screen size category
   */
  getScreenSizeCategory(): 'small' | 'medium' | 'large' | 'extra-large' {
    return this.detector.getScreenSizeCategory();
  }

  /**
   * Check if device has touch support
   */
  hasTouchSupport(): boolean {
    return this.detector.hasTouchSupport();
  }

  /**
   * Check if high DPI display
   */
  isHighDPI(): boolean {
    return this.detector.isHighDPI();
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    return this.detector.getDeviceInfo();
  }

  /**
   * Optimize touch targets for mobile
   */
  optimizeTouchTargets(): void {
    if (!this.hasTouchSupport()) return;

    const optimalSize = this.getOptimalTouchTargetSize();
    const touchElements = document.querySelectorAll(
      'button, [role="button"], input[type="button"], .touch-target'
    ) as NodeListOf<HTMLElement>;

    touchElements.forEach(element => {
      if (element.offsetWidth < optimalSize || element.offsetHeight < optimalSize) {
        // Apply minimum size constraints
        const currentWidth = element.offsetWidth;
        const currentHeight = element.offsetHeight;

        if (currentWidth < optimalSize) {
          element.style.minWidth = `${optimalSize}px`;
        }
        if (currentHeight < optimalSize) {
          element.style.minHeight = `${optimalSize}px`;
        }

        // Add touch target class for styling
        element.classList.add('touch-optimized');
      }
    });
  }

  /**
   * Add touch feedback to elements
   */
  addTouchFeedback(elements: HTMLElement[] | string): void {
    const targetElements = Array.isArray(elements)
      ? elements
      : document.querySelectorAll(elements) as NodeListOf<HTMLElement>;

    targetElements.forEach(element => {
      element.classList.add('touch-feedback');

      // Add visual feedback on touch
      element.addEventListener('touchstart', this.handleTouchStart.bind(this));
      element.addEventListener('touchend', this.handleTouchEnd.bind(this));
    });
  }

  /**
   * Handle touch start for visual feedback
   */
  private handleTouchStart(event: TouchEvent): void {
    const element = event.target as HTMLElement;
    element.style.transform = 'scale(0.95)';
    element.style.transition = 'transform 0.1s ease-out';
  }

  /**
   * Handle touch end for visual feedback
   */
  private handleTouchEnd(event: TouchEvent): void {
    const element = event.target as HTMLElement;
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 100);
  }

  /**
   * Add swipe gestures to element
   */
  enableSwipeGestures(
    element: HTMLElement,
    onSwipe: (direction: string, gestureData: any) => void
  ): () => void {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      touchEndX = touch.clientX;
      touchEndY = touch.clientY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance >= this.config.gestureThresholds.minSwipeDistance) {
        let direction = 'right';
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }

        onSwipe(direction, {
          startX: touchStartX,
          startY: touchStartY,
          endX: touchEndX,
          endY: touchEndY,
          distance,
          duration: 0, // Can be calculated if needed
          velocity: 0,
          direction
        });
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Return cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }

  /**
   * Add haptic feedback simulation
   */
  addHapticFeedback(elements: HTMLElement[] | string): void {
    const targetElements = Array.isArray(elements)
      ? elements
      : document.querySelectorAll(elements) as NodeListOf<HTMLElement>;

    targetElements.forEach(element => {
      element.classList.add('haptic-feedback');

      // Simulate haptic feedback with visual feedback
      element.addEventListener('click', () => {
        element.classList.add('haptic-active');
        setTimeout(() => {
          element.classList.remove('haptic-active');
        }, 100);
      });
    });
  }

  /**
   * Optimize images for mobile devices
   */
  optimizeImages(): void {
    const images = document.querySelectorAll('img') as NodeListOf<HTMLImageElement>;

    images.forEach(img => {
      // Add loading optimization
      img.loading = 'lazy';

      // Add responsive behavior
      img.classList.add('responsive-image');

      // Add error handling
      img.addEventListener('error', () => {
        img.classList.add('image-error');
      });

      img.addEventListener('load', () => {
        img.classList.add('image-loaded');
      });
    });
  }

  /**
   * Optimize scrolling for mobile
   */
  optimizeScrolling(): void {
    if (!this.hasTouchSupport()) return;

    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';

    // Add momentum scrolling for better UX
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.documentElement.style.scrollBehavior = 'auto';
      }, 150); // Stop momentum after 150ms of inactivity
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /**
   * Optimize form inputs for mobile
   */
  optimizeFormInputs(): void {
    const inputs = document.querySelectorAll('input, textarea, select') as NodeListOf<HTMLInputElement>;

    inputs.forEach(input => {
      // Increase touch target size
      if (input.type !== 'hidden') {
        input.classList.add('mobile-input');

        const style = window.getComputedStyle(input);
        const currentFontSize = parseInt(style.fontSize);
        const optimalFontSize = Math.max(16, currentFontSize * 1.2);

        input.style.fontSize = `${optimalFontSize}px`;
      }

      // Add input mode optimizations
      input.addEventListener('focus', () => {
        input.classList.add('input-focused');
        // Zoom in slightly on focus for better visibility
        if (input.type !== 'password') {
          input.style.transform = 'scale(1.02)';
        }
      });

      input.addEventListener('blur', () => {
        input.classList.remove('input-focused');
        input.style.transform = 'scale(1)';
      });

      // Handle virtual keyboard
      input.addEventListener('focusin', () => {
        document.body.classList.add('keyboard-open');
      });

      input.addEventListener('focusout', () => {
        document.body.classList.remove('keyboard-open');
      });
    });
  }

  /**
   * Reduce animations for performance or battery saving
   */
  reduceAnimations(): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (prefersReduced.matches || this.config.performance.reduceAnimations) {
      document.body.classList.add('reduced-motion');

      // Disable CSS transitions and animations
      const style = document.createElement('style');
      style.textContent = `
        * {
          transition: none !important;
          animation: none !important;
          transform: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Enable GPU acceleration for performance
   */
  enableGPUAcceleration(elements: HTMLElement[] | string): void {
    const targetElements = Array.isArray(elements)
      ? elements
      : document.querySelectorAll(elements) as NodeListOf<HTMLElement>;

    targetElements.forEach(element => {
      element.style.transform = 'translateZ(0)';
      element.style.willChange = 'transform';
    });
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): {
    touchResponseTime: number;
    batteryLevel: number;
    isLowPowerMode: boolean;
    memoryUsage: number;
    networkType: 'wifi' | 'cellular' | 'unknown';
    networkSpeed: number;
  } {
    const connection = (navigator as any).connection || {};

    return {
      touchResponseTime: this.config.performance.maxResponseTime,
      batteryLevel: this.batteryLevel,
      isLowPowerMode: this.isLowPowerMode,
      memoryUsage: this.estimateMemoryUsage(),
      networkType: connection.effectiveType || 'unknown',
      networkSpeed: connection.downlink ? connection.downlink / 1000000 : 0 // Convert to Mbps
    };
  }

  /**
   * Estimate memory usage (simplified)
   */
  private estimateMemoryUsage(): number {
    if ('memory' in performance && performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
    }

    // Fallback estimation
    return 0;
  }

  /**
   * Apply all mobile optimizations
   */
  applyOptimizations(): void {
    this.optimizeTouchTargets();
    this.optimizeScrolling();
    this.optimizeFormInputs();
    this.reduceAnimations();

    // Monitor mobile performance
    setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      performanceMonitor.recordMobileMetrics(metrics);
    }, 5000); // Every 5 seconds
  }

  /**
   * Create mobile-optimized CSS classes
   */
  createMobileStyles(): string {
    return `
    /* Mobile touch optimizations */
    .touch-optimized {
      min-width: var(--touch-target-optimal-size, 48px);
      min-height: var(--touch-target-optimal-size, 48px);
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .touch-feedback {
      transition: transform 0.1s ease-out;
    }

    .haptic-feedback {
      transition: background-color 0.1s ease;
    }

    .haptic-active {
      background-color: rgba(59, 130, 246, 0.1);
    }

    .mobile-input {
      font-size: clamp(16px, 1.2rem, 20px);
      padding: 12px 16px;
    }

    .input-focused {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .keyboard-open {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }

    .low-power-mode {
      animation-duration: 0.01s !important;
      animation-iteration-count: 1 !important;
    }

    .reduced-motion {
      transition: none !important;
      animation: none !important;
      transform: none !important;
    }

    .responsive-image {
      max-width: 100%;
      height: auto;
      object-fit: cover;
    }

    .image-loaded {
      opacity: 1;
      transition: opacity 0.3s ease;
    }

    .image-error {
      opacity: 0.5;
      background-color: var(--error-background);
    }

    /* Performance optimizations */
    .gpu-accelerated {
      transform: translateZ(0);
      will-change: transform;
      backface-visibility: hidden;
    }

    /* Mobile-specific responsive design */
    @media (max-width: 320px) {
      .mobile-layout {
        padding: 8px;
        gap: 8px;
      }

      .mobile-text-xs {
        font-size: 0.75rem;
        line-height: 1rem;
      }

      .mobile-text-sm {
        font-size: 0.875rem;
        line-height: 1.25rem;
      }

      .mobile-player-footer {
        padding: 12px 8px;
        gap: 8px;
      }

      .mobile-progress-bar {
        height: 4px;
      }

      .mobile-control-buttons {
        gap: 4px;
      }
    }

    @media (max-width: 375px) {
      .mobile-layout {
        padding: 12px;
        gap: 12px;
      }
    }

    @media (max-width: 414px) {
      .mobile-layout {
        padding: 16px;
        gap: 16px;
      }
    }

    /* Safe area insets for modern mobile devices */
    .safe-area-inset-top {
      padding-top: env(safe-area-inset-top);
    }

    .safe-area-inset-bottom {
      padding-bottom: env(safe-area-inset-bottom);
    }

    .safe-area-inset-left {
      padding-left: env(safe-area-inset-left);
    }

    .safe-area-inset-right {
      padding-right: env(safe-area-inset-right);
    }

    /* Dark mode optimizations for OLED displays */
    @media (prefers-color-scheme: dark) {
      .mobile-layout {
        /* Use pure black on OLED for better battery life */
        color: #000000;
        background-color: #000000;
      }
    }
  `;
  }

  /**
   * Inject mobile styles into document
   */
  injectMobileStyles(): void {
    const styleId = 'mobile-optimization-styles';

    // Remove existing styles if present
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create and inject new styles
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = this.createMobileStyles();
    document.head.appendChild(style);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Remove event listeners and timers
    this.detector = null!;
    this.gestureDetector = null!;
  }
}

// Export singleton instance
export const mobileOptimizer = new MobileOptimizer();

// Auto-initialize mobile optimizations when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mobileOptimizer.injectMobileStyles();
      mobileOptimizer.applyOptimizations();
    });
  } else {
    mobileOptimizer.injectMobileStyles();
    mobileOptimizer.applyOptimizations();
  }
}
