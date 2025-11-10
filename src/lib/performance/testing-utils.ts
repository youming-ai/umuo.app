/**
 * Performance Testing Utilities for Jest/Vitest
 * Custom matchers, mock utilities, and testing helpers
 */

import type { PerformanceTestCase } from './performance-test-runner';
import { performanceMonitor } from './performance-monitor';

// Performance testing utilities for Jest/Vitest
export class PerformanceTestUtils {
  private static instance: PerformanceTestUtils;
  private testBaselines: Map<string, number> = new Map();
  private performanceMarks: Map<string, number> = new Map();

  static getInstance(): PerformanceTestUtils {
    if (!PerformanceTestUtils.instance) {
      PerformanceTestUtils.instance = new PerformanceTestUtils();
    }
    return PerformanceTestUtils.instance;
  }

  /**
   * Measure execution time of a function
   */
  async measureTime<T>(
    fn: () => T | Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T; time: number; averageTime: number }> {
    const startTime = performance.now();
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      const result = await fn();
      results.push(result);

      // Small delay to prevent test interference
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    const totalTime = performance.now() - startTime;
    const averageTime = totalTime / iterations;

    return {
      result: results[results.length - 1], // Return last result
      time: totalTime,
      averageTime
    };
  }

  /**
   * Benchmark a function with statistical analysis
   */
  async benchmark<T>(
    fn: () => T | Promise<T>,
    options: {
      iterations?: number;
      warmupIterations?: number;
      minSamples?: number;
      maxTime?: number;
    } = {}
  ): Promise<{
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    samples: number;
    result: T;
  }> {
    const {
      iterations = 100,
      warmupIterations = 10,
      minSamples = 30,
      maxTime = 5000 // 5 seconds max
    } = options;

    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await fn();
    }

    const samples: number[] = [];
    let totalTime = 0;
    let result: T;

    // Collect samples
    for (let i = 0; i < iterations && totalTime < maxTime; i++) {
      const startTime = performance.now();
      result = await fn();
      const duration = performance.now() - startTime;

      samples.push(duration);
      totalTime += duration;

      if (samples.length >= minSamples && totalTime >= maxTime) {
        break;
      }
    }

    // Calculate statistics
    samples.sort((a, b) => a - b);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const median = samples[Math.floor(samples.length / 2)];
    const min = samples[0];
    const max = samples[samples.length - 1];

    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median,
      min,
      max,
      stdDev,
      samples: samples.length,
      result: result!
    };
  }

  /**
   * Memory usage measurement
   */
  async measureMemory<T>(
    fn: () => T | Promise<T>
  ): Promise<{
    result: T;
    memoryBefore: number;
    memoryAfter: number;
    memoryDelta: number;
    memoryPeak: number;
  }> {
    const memoryBefore = this.getCurrentMemoryUsage();
    let memoryPeak = memoryBefore;

    // Monitor memory during execution
    const memoryMonitor = setInterval(() => {
      const currentMemory = this.getCurrentMemoryUsage();
      memoryPeak = Math.max(memoryPeak, currentMemory);
    }, 10);

    try {
      const result = await fn();
      const memoryAfter = this.getCurrentMemoryUsage();
      const memoryDelta = memoryAfter - memoryBefore;

      return {
        result,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        memoryPeak
      };
    } finally {
      clearInterval(memoryMonitor);
    }
  }

  /**
   * Performance assertion helpers
   */
  expectPerformance(measured: { time: number; averageTime?: number }) {
    return new PerformanceAssertions(measured);
  }

  /**
   * Create performance test case
   */
  createPerformanceTest<T>(
    name: string,
    fn: () => T | Promise<T>,
    options: {
      iterations?: number;
      timeout?: number;
      baseline?: number;
      threshold?: number;
      category?: string;
    } = {}
  ): PerformanceTestCase & { run: () => Promise<{ result: T; metrics: Record<string, number> }> } {
    return {
      name,
      description: `Performance test for ${name}`,
      category: 'ui-responsiveness' as any,
      run: async () => {
        const { result, time, averageTime } = await this.measureTime(fn, options.iterations || 1);

        const metrics: Record<string, number> = {
          'execution-time': time,
          'average-execution-time': averageTime || time,
        };

        if (options.baseline) {
          metrics['baseline-comparison'] = ((time - options.baseline) / options.baseline) * 100;
        }

        return { result, metrics };
      },
      timeout: options.timeout || 30000,
      retries: 0,
      skip: false,
    };
  }

  /**
   * Mark performance test baseline
   */
  markBaseline(testName: string, value: number): void {
    this.testBaselines.set(testName, value);
    console.log(`📊 Performance baseline marked: ${testName} = ${value}`);
  }

  /**
   * Get baseline value
   */
  getBaseline(testName: string): number | undefined {
    return this.testBaselines.get(testName);
  }

  /**
   * Start performance mark
   */
  markStart(name: string): void {
    this.performanceMarks.set(name, performance.now());
  }

  /**
   * End performance mark and return duration
   */
  markEnd(name: string): number {
    const startTime = this.performanceMarks.get(name);
    if (!startTime) {
      throw new Error(`Performance mark '${name}' not found`);
    }

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(name);
    return duration;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Memory leak detection
   */
  async detectMemoryLeaks<T>(
    fn: () => T | Promise<T>,
    iterations: number = 10,
    threshold: number = 10 // MB
  ): Promise<{
    hasLeak: boolean;
    memoryGrowth: number[];
    averageGrowth: number;
    maxGrowth: number;
    result: T;
  }> {
    const memoryReadings: number[] = [];
    let result: T;

    // Force garbage collection if available
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }

    for (let i = 0; i < iterations; i++) {
      const memoryBefore = this.getCurrentMemoryUsage();
      result = await fn();

      // Force garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }

      const memoryAfter = this.getCurrentMemoryUsage();
      const memoryGrowth = Math.max(0, memoryAfter - memoryBefore);
      memoryReadings.push(memoryGrowth);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const averageGrowth = memoryReadings.reduce((a, b) => a + b, 0) / memoryReadings.length;
    const maxGrowth = Math.max(...memoryReadings);
    const hasLeak = averageGrowth > threshold;

    return {
      hasLeak,
      memoryGrowth: memoryReadings,
      averageGrowth,
      maxGrowth,
      result: result!
    };
  }

  /**
   * Mock performance APIs for testing
   */
  createPerformanceMock() {
    const mockPerformance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByName: jest.fn(() => []),
      getEntriesByType: jest.fn(() => []),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      timing: {
        navigationStart: Date.now(),
        loadEventEnd: Date.now() + 1000,
      }
    };

    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'performance', {
        value: mockPerformance,
        writable: true
      });
    }

    return mockPerformance;
  }

  /**
   * Mock performance observer
   */
  createPerformanceObserverMock() {
    const mockPerformanceObserver = jest.fn().mockImplementation((callback) => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      takeRecords: jest.fn(() => []),
    }));

    if (typeof window !== 'undefined') {
      window.PerformanceObserver = mockPerformanceObserver;
    }

    return mockPerformanceObserver;
  }

  /**
   * Wait for next frame (useful for animation testing)
   */
  async waitForNextFrame(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  /**
   * Measure frame rate
   */
  async measureFrameRate(
    duration: number = 1000,
    callback?: () => void
  ): Promise<{
    fps: number;
    frameCount: number;
    averageFrameTime: number;
    droppedFrames: number;
  }> {
    return new Promise(resolve => {
      const frameTimes: number[] = [];
      let frameCount = 0;
      let droppedFrames = 0;
      let lastFrameTime = performance.now();

      const targetFrameTime = 1000 / 60; // 60 FPS

      const animate = (currentTime: number) => {
        const frameTime = currentTime - lastFrameTime;
        frameTimes.push(frameTime);
        frameCount++;

        if (frameTime > targetFrameTime * 1.5) {
          droppedFrames++;
        }

        if (callback) {
          callback();
        }

        if (currentTime - lastFrameTime < duration) {
          lastFrameTime = currentTime;
          requestAnimationFrame(animate);
        } else {
          const totalTime = currentTime - lastFrameTime;
          const fps = frameCount / (totalTime / 1000);
          const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

          resolve({
            fps,
            frameCount,
            averageFrameTime,
            droppedFrames
          });
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Generate performance report for test results
   */
  generateTestReport(results: Array<{
    testName: string;
    metrics: Record<string, number>;
    passed: boolean;
  }>): string {
    let report = '# Performance Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    report += '## Summary\n\n';
    report += `- Total Tests: ${totalTests}\n`;
    report += `- Passed: ${passedTests}\n`;
    report += `- Failed: ${failedTests}\n`;
    report += `- Pass Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%\n\n`;

    report += '## Test Results\n\n';

    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      report += `### ${status} ${result.testName}\n\n`;

      Object.entries(result.metrics).forEach(([metric, value]) => {
        report += `- ${metric}: ${value}\n`;
      });

      report += '\n';
    });

    return report;
  }
}

/**
 * Performance assertion class for fluent API
 */
class PerformanceAssertions {
  private measured: { time: number; averageTime?: number };

  constructor(measured: { time: number; averageTime?: number }) {
    this.measured = measured;
  }

  /**
   * Assert execution time is less than threshold
   */
  toBeFasterThan(thresholdMs: number): this {
    const time = this.measured.averageTime || this.measured.time;
    if (time >= thresholdMs) {
      throw new Error(`Expected execution time to be less than ${thresholdMs}ms, but got ${time}ms`);
    }
    return this;
  }

  /**
   * Assert execution time is greater than threshold
   */
  toBeSlowerThan(thresholdMs: number): this {
    const time = this.measured.averageTime || this.measured.time;
    if (time <= thresholdMs) {
      throw new Error(`Expected execution time to be greater than ${thresholdMs}ms, but got ${time}ms`);
    }
    return this;
  }

  /**
   * Assert execution time is within range
   */
  toBeWithinRange(minMs: number, maxMs: number): this {
    const time = this.measured.averageTime || this.measured.time;
    if (time < minMs || time > maxMs) {
      throw new Error(`Expected execution time to be between ${minMs}ms and ${maxMs}ms, but got ${time}ms`);
    }
    return this;
  }

  /**
   * Assert performance compared to baseline
   */
  toBeBetterThanBaseline(baselineMs: number, thresholdPercent: number = 10): this {
    const time = this.measured.averageTime || this.measured.time;
    const threshold = baselineMs * (1 + thresholdPercent / 100);

    if (time > threshold) {
      const regression = ((time - baselineMs) / baselineMs) * 100;
      throw new Error(`Performance regression detected: ${time}ms vs baseline ${baselineMs}ms (${regression.toFixed(2)}% worse)`);
    }
    return this;
  }

  /**
   * Assert performance is not significantly worse than baseline
   */
  toNotHaveSignificantRegression(baselineMs: number, thresholdPercent: number = 5): this {
    const time = this.measured.averageTime || this.measured.time;
    const regression = ((time - baselineMs) / baselineMs) * 100;

    if (regression > thresholdPercent) {
      throw new Error(`Significant performance regression: ${regression.toFixed(2)}% worse than baseline`);
    }
    return this;
  }
}

/**
 * Jest/Vitest custom matchers
 */
export const performanceMatchers = {
  /**
   * Matcher for execution time
   */
  toExecuteFasterThan(received: Promise<Function>, thresholdMs: number) {
    const fn = received as any;

    if (typeof fn !== 'function') {
      throw new Error('Expected a function');
    }

    return {
      message: () => `Expected function to execute faster than ${thresholdMs}ms`,
      pass: async () => {
        const start = performance.now();
        await fn();
        const duration = performance.now() - start;
        return duration < thresholdMs;
      }
    };
  },

  /**
   * Matcher for memory usage
   */
  toUseLessMemoryThan(received: Promise<Function>, thresholdMB: number) {
    const fn = received as any;

    if (typeof fn !== 'function') {
      throw new Error('Expected a function');
    }

    return {
      message: () => `Expected function to use less than ${thresholdMB}MB of memory`,
      pass: async () => {
        const utils = PerformanceTestUtils.getInstance();
        const { memoryDelta } = await utils.measureMemory(fn);
        return memoryDelta < thresholdMB;
      }
    };
  },

  /**
   * Matcher for frame rate
   */
  toMaintainFrameRate(received: Promise<Function>, targetFPS: number = 60, duration: number = 1000) {
    const fn = received as any;

    if (typeof fn !== 'function') {
      throw new Error('Expected a function');
    }

    return {
      message: () => `Expected function to maintain ${targetFPS} FPS`,
      pass: async () => {
        const utils = PerformanceTestUtils.getInstance();
        const { fps } = await utils.measureFrameRate(duration, fn);
        return fps >= targetFPS;
      }
    };
  }
};

// Export singleton instance
export const performanceTestUtils = PerformanceTestUtils.getInstance();

// Export for Jest/Vitest setup
export function setupPerformanceTesting() {
  // Add custom matchers to Jest/Vitest
  if (typeof expect !== 'undefined') {
    expect.extend(performanceMatchers);
  }

  // Setup performance monitoring
  performanceMonitor.setEnabled(true);

  return {
    performanceTestUtils,
    performanceMatchers,
    performanceMonitor
  };
}

// Export types
export type { PerformanceAssertions };
