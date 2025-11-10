/**
 * Touch Animation Utilities (Simplified for Development)
 * Provides smooth GPU-accelerated animations optimized for mobile touch interactions
 */

import type { AnimationConfig, Keyframe } from "@/types/mobile";

export class TouchAnimation {
  private static instance: TouchAnimation;
  private animations: Map<string, Animation> = new Map();
  private performanceMode: boolean = false;

  private constructor() {
    this.performanceMode = this.detectPerformanceMode();
  }

  public static getInstance(): TouchAnimation {
    if (!TouchAnimation.instance) {
      TouchAnimation.instance = new TouchAnimation();
    }
    return TouchAnimation.instance;
  }

  public static createShakeAnimation(
    element: HTMLElement,
    intensity: number = 5,
    config: AnimationConfig = {},
  ): Animation {
    // Simple shake animation using string concatenation to avoid template literal issues
    const shakeKeyframes: Keyframe[] = [
      { transform: "translateX(0)" },
      { transform: "translateX(-" + intensity + "px)" },
      { transform: "translateX(" + intensity + "px)" },
      { transform: "translateX(-" + intensity + "px)" },
      { transform: "translateX(" + intensity + "px)" },
      { transform: "translateX(0)" },
    ];

    const options: KeyframeAnimationOptions = {
      duration: config.duration || 300,
      easing: config.easing || "ease-in-out",
      iterations: config.iterations || 1,
      fill: "forwards",
    };

    return element.animate(shakeKeyframes, options);
  }

  public static createRippleAnimation(
    element: HTMLElement,
    config: AnimationConfig = {},
  ): Animation {
    const rippleKeyframes: Keyframe[] = [
      { transform: "scale(0)", opacity: "1" },
      { transform: "scale(1)", opacity: "0" },
    ];

    const options: KeyframeAnimationOptions = {
      duration: config.duration || 400,
      easing: config.easing || "ease-out",
      iterations: 1,
      fill: "forwards",
    };

    return element.animate(rippleKeyframes, options);
  }

  private detectPerformanceMode(): boolean {
    // Simple performance detection
    return (
      typeof window !== "undefined" &&
      "matchMedia" in window &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  private createOptimizedKeyframes(
    element: HTMLElement,
    keyframes: Keyframe[],
    config: AnimationConfig,
  ): Keyframe[] {
    // Return optimized keyframes for performance
    return keyframes;
  }

  private createOptimizedOptions(
    config: AnimationConfig,
  ): KeyframeAnimationOptions {
    return {
      duration: config.duration || 300,
      easing: config.easing || "ease-in-out",
      iterations: config.iterations || 1,
      fill: "forwards",
    };
  }
}

export default TouchAnimation;
