/**
 * Comprehensive Performance Test Runner
 * Automated testing suite for performance regression detection and monitoring
 */

import type { PerformanceDataPoint } from './performance-monitor';
import { performanceMonitor } from './performance-monitor';
import type { TranscriptionJob } from '@/types/transcription';
import type { MobilePerformanceMetrics } from '@/types/mobile';

export interface PerformanceTestSuite {
  name: string;
  description: string;
  tests: PerformanceTestCase[];
  thresholds: PerformanceThresholds;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface PerformanceTestCase {
  name: string;
  description: string;
  category: TestCategory;
  run: () => Promise<TestResult>;
  timeout?: number;
  retries?: number;
  skip?: boolean;
}

export type TestCategory =
  | 'core-web-vitals'
  | 'transcription'
  | 'mobile-performance'
  | 'ui-responsiveness'
  | 'memory-usage'
  | 'network-performance'
  | 'concurrent-operations';

export interface TestResult {
  testName: string;
  category: TestCategory;
  passed: boolean;
  duration: number;
  metrics: Record<string, number>;
  error?: Error;
  baseline?: number;
  regression?: number;
  recommendations?: string[];
}

export interface PerformanceThresholds {
  [key: string]: {
    warning: number;
    critical: number;
    unit: string;
    trend?: 'decreasing' | 'increasing';
  };
}

export interface PerformanceTestReport {
  suiteName: string;
  timestamp: Date;
  duration: number;
  results: TestResult[];
  summary: TestSummary;
  trends: PerformanceTrends;
  recommendations: string[];
  regressionAnalysis: RegressionAnalysis;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  averageDuration: number;
  criticalFailures: number;
}

export interface PerformanceTrends {
  [metricName: string]: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
}

export interface RegressionAnalysis {
  detectedRegressions: Regression[];
  statisticalSignificance: number;
  confidenceLevel: number;
}

export interface Regression {
  metric: string;
  testName: string;
  currentValue: number;
  baselineValue: number;
  degradation: number;
  degradationPercent: number;
  significance: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface TestEnvironment {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  networkSpeed: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
  cpuThrottling: number;
  memoryConstraints?: number;
  batteryLevel?: number;
}

export interface BenchmarkConfig {
  iterations: number;
  warmupIterations: number;
  measurementMode: 'average' | 'median' | 'percentile';
  percentile: number;
  sampleSize: number;
}

/**
 * Performance Test Runner with comprehensive testing capabilities
 */
export class PerformanceTestRunner {
  private static instance: PerformanceTestRunner;
  private testSuites: Map<string, PerformanceTestSuite> = new Map();
  private baselines: Map<string, number> = new Map();
  private trends: Map<string, number[]> = new Map();
  private isRunning: boolean = false;
  private currentEnvironment: TestEnvironment;
  private config: BenchmarkConfig;

  // Default performance thresholds
  private readonly DEFAULT_THRESHOLDS: PerformanceThresholds = {
    // Core Web Vitals
    'largest-contentful-paint': { warning: 2500, critical: 4000, unit: 'ms', trend: 'decreasing' },
    'first-input-delay': { warning: 100, critical: 300, unit: 'ms', trend: 'decreasing' },
    'cumulative-layout-shift': { warning: 0.1, critical: 0.25, unit: 'score', trend: 'decreasing' },
    'time-to-first-byte': { warning: 800, critical: 1800, unit: 'ms', trend: 'decreasing' },

    // Transcription Performance
    'transcription-processing-time': { warning: 45000, critical: 90000, unit: 'ms', trend: 'decreasing' },
    'transcription-queue-time': { warning: 5000, critical: 15000, unit: 'ms', trend: 'decreasing' },
    'transcription-speed': { warning: 0.5, critical: 0.2, unit: 'ratio', trend: 'increasing' },

    // Mobile Performance
    'touch-response-time': { warning: 100, critical: 200, unit: 'ms', trend: 'decreasing' },
    'gesture-recognition-time': { warning: 50, critical: 100, unit: 'ms', trend: 'decreasing' },
    'memory-usage': { warning: 150, critical: 300, unit: 'MB', trend: 'decreasing' },

    // UI Performance
    'ui-response-time': { warning: 100, critical: 300, unit: 'ms', trend: 'decreasing' },
    'animation-frame-rate': { warning: 55, critical: 30, unit: 'fps', trend: 'increasing' },
    'scroll-performance': { warning: 16.67, critical: 33.33, unit: 'ms', trend: 'decreasing' },
  };

  static getInstance(): PerformanceTestRunner {
    if (!PerformanceTestRunner.instance) {
      PerformanceTestRunner.instance = new PerformanceTestRunner();
    }
    return PerformanceTestRunner.instance;
  }

  private constructor() {
    this.currentEnvironment = this.detectTestEnvironment();
    this.config = {
      iterations: 5,
      warmupIterations: 2,
      measurementMode: 'median',
      percentile: 95,
      sampleSize: 100,
    };
  }

  /**
   * Register a test suite
   */
  registerTestSuite(suite: PerformanceTestSuite): void {
    this.testSuites.set(suite.name, suite);
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(suiteName: string): Promise<PerformanceTestReport> {
    if (this.isRunning) {
      throw new Error('Performance tests are already running');
    }

    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`🚀 Starting performance test suite: ${suiteName}`);

      // Setup test environment
      if (suite.setup) {
        await suite.setup();
      }

      const results: TestResult[] = [];

      // Run all tests in the suite
      for (const test of suite.tests) {
        if (test.skip) {
          console.log(`⏭️  Skipping test: ${test.name}`);
          continue;
        }

        console.log(`🧪 Running test: ${test.name}`);
        const result = await this.runSingleTest(test, suite.thresholds);
        results.push(result);
      }

      // Teardown test environment
      if (suite.teardown) {
        await suite.teardown();
      }

      // Generate comprehensive report
      const report = await this.generateReport(suiteName, results, Date.now() - startTime);

      console.log(`✅ Performance test suite completed: ${suiteName}`);
      return report;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run all registered test suites
   */
  async runAllTestSuites(): Promise<PerformanceTestReport[]> {
    const reports: PerformanceTestReport[] = [];

    for (const suiteName of this.testSuites.keys()) {
      try {
        const report = await this.runTestSuite(suiteName);
        reports.push(report);
      } catch (error) {
        console.error(`❌ Failed to run test suite '${suiteName}':`, error);
      }
    }

    return reports;
  }

  /**
   * Run a single performance test
   */
  private async runSingleTest(
    test: PerformanceTestCase,
    thresholds: PerformanceThresholds
  ): Promise<TestResult> {
    const startTime = Date.now();
    const metrics: Record<string, number> = {};
    let error: Error | undefined;

    try {
      // Run the test with retries
      let lastError: Error | undefined;
      let result: TestResult | undefined;

      for (let attempt = 0; attempt <= (test.retries || 0); attempt++) {
        try {
          result = await test.run();
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < (test.retries || 0)) {
            console.warn(`🔄 Retrying test ${test.name} (attempt ${attempt + 1})`);
            await this.delay(1000); // Wait before retry
          }
        }
      }

      if (!result) {
        throw lastError || new Error('Test failed without specific error');
      }

      // Validate results against thresholds
      const passed = this.validateTestResults(result.metrics, thresholds);

      // Check for regressions
      const regression = this.detectRegression(test.name, result.metrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(result.metrics, thresholds);

      return {
        testName: test.name,
        category: test.category,
        passed,
        duration: Date.now() - startTime,
        metrics: { ...result.metrics, ...metrics },
        baseline: this.getBaseline(test.name),
        regression,
        recommendations,
      };
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));

      return {
        testName: test.name,
        category: test.category,
        passed: false,
        duration: Date.now() - startTime,
        metrics,
        error,
      };
    }
  }

  /**
   * Validate test results against thresholds
   */
  private validateTestResults(
    metrics: Record<string, number>,
    thresholds: PerformanceThresholds
  ): boolean {
    for (const [metricName, value] of Object.entries(metrics)) {
      const threshold = thresholds[metricName] || this.DEFAULT_THRESHOLDS[metricName];

      if (!threshold) continue;

      const isDecreasingTrend = threshold.trend === 'decreasing';

      if (isDecreasingTrend) {
        if (value > threshold.critical) {
          return false;
        }
      } else {
        if (value < threshold.critical) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Detect performance regression
   */
  private detectRegression(
    testName: string,
    metrics: Record<string, number>
  ): number | undefined {
    const baseline = this.getBaseline(testName);
    if (!baseline) return undefined;

    // Simple regression detection - can be enhanced with statistical analysis
    const keyMetrics = Object.keys(metrics);
    let maxRegression = 0;

    for (const metric of keyMetrics) {
      const current = metrics[metric];
      const baselineKey = `${testName}-${metric}`;
      const baselineValue = this.baselines.get(baselineKey);

      if (!baselineValue) continue;

      const threshold = this.DEFAULT_THRESHOLDS[metric];
      if (!threshold) continue;

      const isDecreasingTrend = threshold.trend === 'decreasing';
      let regression = 0;

      if (isDecreasingTrend) {
        regression = ((current - baselineValue) / baselineValue) * 100;
      } else {
        regression = ((baselineValue - current) / baselineValue) * 100;
      }

      maxRegression = Math.max(maxRegression, regression);
    }

    return maxRegression > 5 ? maxRegression : undefined; // 5% threshold for regression
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    metrics: Record<string, number>,
    thresholds: PerformanceThresholds
  ): string[] {
    const recommendations: string[] = [];

    for (const [metricName, value] of Object.entries(metrics)) {
      const threshold = thresholds[metricName] || this.DEFAULT_THRESHOLDS[metricName];

      if (!threshold) continue;

      const isDecreasingTrend = threshold.trend === 'decreasing';

      if (isDecreasingTrend) {
        if (value > threshold.warning) {
          recommendations.push(`${metricName} is above warning threshold (${value}${threshold.unit} > ${threshold.warning}${threshold.unit})`);
        }
      } else {
        if (value < threshold.warning) {
          recommendations.push(`${metricName} is below warning threshold (${value}${threshold.unit} < ${threshold.warning}${threshold.unit})`);
        }
      }
    }

    return recommendations;
  }

  /**
   * Generate comprehensive test report
   */
  private async generateReport(
    suiteName: string,
    results: TestResult[],
    duration: number
  ): Promise<PerformanceTestReport> {
    const summary = this.calculateSummary(results);
    const trends = this.calculateTrends(results);
    const regressionAnalysis = this.analyzeRegressions(results);
    const recommendations = this.generateOverallRecommendations(results);

    return {
      suiteName,
      timestamp: new Date(),
      duration,
      results,
      summary,
      trends,
      recommendations,
      regressionAnalysis,
    };
  }

  /**
   * Calculate test summary statistics
   */
  private calculateSummary(results: TestResult[]): TestSummary {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const skipped = 0; // Implement skip logic if needed

    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;
    const criticalFailures = results.filter(r => !r.passed && r.error).length;

    return {
      total,
      passed,
      failed,
      skipped,
      passRate,
      averageDuration,
      criticalFailures,
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(results: TestResult[]): PerformanceTrends {
    const trends: PerformanceTrends = {};

    for (const result of results) {
      for (const [metricName, currentValue] of Object.entries(result.metrics)) {
        const trendKey = `${result.testName}-${metricName}`;
        const history = this.trends.get(trendKey) || [];

        if (history.length > 0) {
          const previous = history[history.length - 1];
          const change = currentValue - previous;
          const changePercent = (change / previous) * 100;

          let trend: 'improving' | 'degrading' | 'stable';
          const threshold = this.DEFAULT_THRESHOLDS[metricName];

          if (threshold) {
            const isDecreasingTrend = threshold.trend === 'decreasing';
            const isImprovement = isDecreasingTrend ? change < 0 : change > 0;
            const significantChange = Math.abs(changePercent) > 5;

            if (significantChange) {
              trend = isImprovement ? 'improving' : 'degrading';
            } else {
              trend = 'stable';
            }
          } else {
            trend = 'stable';
          }

          trends[trendKey] = {
            current: currentValue,
            previous,
            change,
            changePercent,
            trend,
          };
        }

        // Update history
        history.push(currentValue);
        if (history.length > 10) {
          history.shift(); // Keep last 10 measurements
        }
        this.trends.set(trendKey, history);
      }
    }

    return trends;
  }

  /**
   * Analyze performance regressions
   */
  private analyzeRegressions(results: TestResult[]): RegressionAnalysis {
    const detectedRegressions: Regression[] = [];

    for (const result of results) {
      for (const [metricName, currentValue] of Object.entries(result.metrics)) {
        const baselineKey = `${result.testName}-${metricName}`;
        const baselineValue = this.baselines.get(baselineKey);

        if (!baselineValue) continue;

        const threshold = this.DEFAULT_THRESHOLDS[metricName];
        if (!threshold) continue;

        const isDecreasingTrend = threshold.trend === 'decreasing';
        let degradation = 0;
        let degradationPercent = 0;

        if (isDecreasingTrend) {
          degradation = currentValue - baselineValue;
          degradationPercent = (degradation / baselineValue) * 100;
        } else {
          degradation = baselineValue - currentValue;
          degradationPercent = (degradation / baselineValue) * 100;
        }

        if (Math.abs(degradationPercent) > 10) { // 10% regression threshold
          let severity: 'minor' | 'moderate' | 'major' | 'critical';

          if (Math.abs(degradationPercent) > 50) {
            severity = 'critical';
          } else if (Math.abs(degradationPercent) > 25) {
            severity = 'major';
          } else if (Math.abs(degradationPercent) > 15) {
            severity = 'moderate';
          } else {
            severity = 'minor';
          }

          detectedRegressions.push({
            metric: metricName,
            testName: result.testName,
            currentValue,
            baselineValue,
            degradation,
            degradationPercent,
            significance: Math.abs(degradationPercent) / 100,
            severity,
          });
        }
      }
    }

    // Calculate statistical significance (simplified)
    const significance = detectedRegressions.length > 0 ? 0.95 : 0.8;

    return {
      detectedRegressions,
      statisticalSignificance: significance,
      confidenceLevel: 0.95,
    };
  }

  /**
   * Generate overall recommendations
   */
  private generateOverallRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];
    const failedTests = results.filter(r => !r.passed);

    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} test(s) failed - review critical performance issues`);
    }

    const slowTests = results.filter(r => r.duration > 10000); // > 10 seconds
    if (slowTests.length > 0) {
      recommendations.push(`${slowTests.length} test(s) took longer than 10 seconds - consider test optimization`);
    }

    const regressions = results.filter(r => r.regression && r.regression > 10);
    if (regressions.length > 0) {
      recommendations.push(`${regressions.length} test(s) show performance regression - investigate and optimize`);
    }

    return recommendations;
  }

  /**
   * Get baseline value for a test metric
   */
  private getBaseline(testName: string): number | undefined {
    return this.baselines.get(testName);
  }

  /**
   * Set baseline value for a test metric
   */
  setBaseline(testName: string, value: number): void {
    this.baselines.set(testName, value);
  }

  /**
   * Detect current test environment
   */
  private detectTestEnvironment(): TestEnvironment {
    if (typeof window === 'undefined') {
      return {
        deviceType: 'desktop',
        networkSpeed: 'wifi',
        cpuThrottling: 1,
      };
    }

    // Simple device detection
    const userAgent = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // Network detection
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const networkSpeed = connection ? this.mapConnectionType(connection.effectiveType) : 'wifi';

    return {
      deviceType: isMobile ? 'mobile' : 'desktop',
      networkSpeed,
      cpuThrottling: 1,
    };
  }

  /**
   * Map network connection type to standardized format
   */
  private mapConnectionType(effectiveType: string): TestEnvironment['networkSpeed'] {
    switch (effectiveType) {
      case 'slow-2g': return 'slow-2g';
      case '2g': return '2g';
      case '3g': return '3g';
      case '4g': return '4g';
      default: return 'wifi';
    }
  }

  /**
   * Helper function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export performance test data
   */
  exportTestData(): {
    baselines: Record<string, number>;
    trends: Record<string, number[]>;
    testSuites: string[];
  } {
    return {
      baselines: Object.fromEntries(this.baselines),
      trends: Object.fromEntries(this.trends),
      testSuites: Array.from(this.testSuites.keys()),
    };
  }

  /**
   * Import performance test data
   */
  importTestData(data: {
    baselines?: Record<string, number>;
    trends?: Record<string, number[]>;
  }): void {
    if (data.baselines) {
      this.baselines = new Map(Object.entries(data.baselines));
    }

    if (data.trends) {
      this.trends = new Map(Object.entries(data.trends).map(([k, v]) => [k, [...v]]));
    }
  }

  /**
   * Clear all test data
   */
  clearTestData(): void {
    this.baselines.clear();
    this.trends.clear();
  }
}

// Export singleton instance
export const performanceTestRunner = PerformanceTestRunner.getInstance();

// Export utility functions for test creation
export function createPerformanceTestCase(
  name: string,
  description: string,
  category: TestCategory,
  testFunction: () => Promise<Record<string, number>>,
  options?: {
    timeout?: number;
    retries?: number;
    skip?: boolean;
  }
): PerformanceTestCase {
  return {
    name,
    description,
    category,
    run: async () => {
      const metrics = await testFunction();
      return {
        testName: name,
        category,
        passed: true, // Will be determined by thresholds
        duration: 0, // Will be set by test runner
        metrics,
      };
    },
    ...options,
  };
}

// Export default test suites
export const DEFAULT_TEST_SUITES: PerformanceTestSuite[] = [
  // Core Web Vitals Test Suite
  {
    name: 'core-web-vitals',
    description: 'Core Web Vitals performance testing',
    category: 'core-web-vitals' as any,
    tests: [],
    thresholds: performanceTestRunner['DEFAULT_THRESHOLDS'],
  },

  // Transcription Performance Test Suite
  {
    name: 'transcription-performance',
    description: 'Transcription service performance testing',
    category: 'transcription' as any,
    tests: [],
    thresholds: performanceTestRunner['DEFAULT_THRESHOLDS'],
  },

  // Mobile Performance Test Suite
  {
    name: 'mobile-performance',
    description: 'Mobile device performance testing',
    category: 'mobile-performance' as any,
    tests: [],
    thresholds: performanceTestRunner['DEFAULT_THRESHOLDS'],
  },
];
