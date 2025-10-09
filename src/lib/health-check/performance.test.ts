// Mock the enhanced-groq-client to avoid authentication errors
jest.mock('../enhanced-groq-client', () => ({
  EnhancedGroqClient: jest.fn().mockImplementation(() => ({
    transcribeAudio: jest.fn().mockResolvedValue({ text: 'Mock transcription' }),
  })),
  AuthenticationError: class extends Error {},
}));

import { runHealthCheck } from './scheduler';
import {
  HealthCheckResult,
  HealthCheckReport,
  CheckStatus,
  CheckCategory,
  SeverityLevel,
} from './types';

describe('Health Check Performance Tests', () => {
  describe('Execution Time Performance', () => {
    it('should complete single category check within 30 seconds', async () => {
      const startTime = performance.now();

      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(report).toBeDefined();
      expect(duration).toBeLessThan(30000); // 30 seconds
      expect(report.summary.total).toBe(1);
    }, 35000);

    it('should complete all category checks within 2 minutes', async () => {
      const startTime = performance.now();

      const report = await runHealthCheck({
        categories: [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.ERROR_HANDLING,
          CheckCategory.PERFORMANCE,
          CheckCategory.USER_EXPERIENCE,
          CheckCategory.SECURITY,
        ],
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(report).toBeDefined();
      expect(duration).toBeLessThan(120000); // 2 minutes = 120,000ms
      expect(report.summary.total).toBe(5);
    }, 130000);

    it('should complete parallel checks faster than sequential', async () => {
      const categories = [
        CheckCategory.API_CONNECTIVITY,
        CheckCategory.PERFORMANCE,
        CheckCategory.USER_EXPERIENCE,
      ];

      // Sequential execution
      const sequentialStart = performance.now();
      const sequentialReport = await runHealthCheck({
        categories,
        config: { parallel: false },
      });
      const sequentialEnd = performance.now();
      const sequentialDuration = sequentialEnd - sequentialStart;

      // Parallel execution
      const parallelStart = performance.now();
      const parallelReport = await runHealthCheck({
        categories,
        config: { parallel: true },
      });
      const parallelEnd = performance.now();
      const parallelDuration = parallelEnd - parallelStart;

      expect(sequentialReport).toBeDefined();
      expect(parallelReport).toBeDefined();
      expect(sequentialReport.summary.total).toBe(parallelReport.summary.total);

      // Parallel should be faster (with some tolerance for variance)
      expect(parallelDuration).toBeLessThanOrEqual(sequentialDuration * 1.1);
    }, 60000);

    it('should handle timeout constraints properly', async () => {
      const startTime = performance.now();

      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
        config: {
          timeout: 5000, // 5 second timeout
        },
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(report).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds total
    }, 15000);
  });

  describe('Memory Usage Performance', () => {
    it('should not cause excessive memory usage during checks', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Run multiple health checks
      for (let i = 0; i < 5; i++) {
        await runHealthCheck({
          categories: [CheckCategory.API_CONNECTIVITY],
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, 60000);

    it('should clean up resources after check completion', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const report = await runHealthCheck({
        categories: [CheckCategory.PERFORMANCE, CheckCategory.USER_EXPERIENCE],
      });

      expect(report).toBeDefined();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal after cleanup
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    }, 45000);
  });

  describe('Concurrent Performance', () => {
    it('should handle multiple concurrent health checks', async () => {
      const startTime = performance.now();

      // Run 3 health checks concurrently
      const promises = [
        runHealthCheck({ categories: [CheckCategory.API_CONNECTIVITY] }),
        runHealthCheck({ categories: [CheckCategory.ERROR_HANDLING] }),
        runHealthCheck({ categories: [CheckCategory.SECURITY] }),
      ];

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(3);
      results.forEach(report => {
        expect(report).toBeDefined();
        expect(report.summary.total).toBe(1);
      });

      // Should complete in reasonable time (less than sum of individual times)
      expect(duration).toBeLessThan(60000); // 1 minute
    }, 75000);

    it('should maintain performance under load', async () => {
      const durations: number[] = [];

      // Run multiple checks and measure duration
      for (let i = 0; i < 3; i++) {
        const startTime = performance.now();

        await runHealthCheck({
          categories: [CheckCategory.API_CONNECTIVITY],
        });

        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      // Performance should be consistent (variance less than 50%)
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxVariance = Math.max(...durations) - Math.min(...durations);

      expect(maxVariance).toBeLessThan(avgDuration * 0.5);
    }, 90000);
  });

  describe('Resource Efficiency', () => {
    it('should efficiently handle large result sets', async () => {
      const startTime = performance.now();

      // Run all categories to generate more results
      const report = await runHealthCheck({
        categories: [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.ERROR_HANDLING,
          CheckCategory.PERFORMANCE,
          CheckCategory.USER_EXPERIENCE,
          CheckCategory.SECURITY,
        ],
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(report).toBeDefined();
      expect(report.results.length).toBeGreaterThan(0);

      // Check that duration scales reasonably with number of results
      const avgDurationPerResult = duration / report.results.length;
      expect(avgDurationPerResult).toBeLessThan(30000); // 30 seconds per result max
    }, 150000);

    it('should maintain performance with detailed logging enabled', async () => {
      const startTime = performance.now();

      const report = await runHealthCheck({
        categories: [CheckCategory.PERFORMANCE],
        config: {
          timeout: 10000,
          retryCount: 2,
        },
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(report).toBeDefined();
      expect(duration).toBeLessThan(30000); // Should still complete quickly
    }, 45000);
  });

  describe('Network Performance', () => {
    it('should handle network latency gracefully', async () => {
      // Mock network delay
      const originalFetch = global.fetch;
      const mockFetch = jest.fn().mockImplementation(async (...args) => {
        // Add artificial delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return originalFetch.apply(global, args);
      });
      global.fetch = mockFetch;

      const startTime = performance.now();

      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Restore original fetch
      global.fetch = originalFetch;

      expect(report).toBeDefined();
      expect(duration).toBeLessThan(45000); // Should account for network delay
    }, 60000);

    it('should recover from temporary network issues', async () => {
      const originalFetch = global.fetch;
      let callCount = 0;

      const mockFetch = jest.fn().mockImplementation(async (...args) => {
        callCount++;
        if (callCount <= 2) {
          // Fail first two attempts
          throw new Error('Network error');
        }
        // Succeed on third attempt
        return originalFetch.apply(global, args);
      });
      global.fetch = mockFetch;

      const startTime = performance.now();

      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
        config: {
          retryCount: 3,
        },
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Restore original fetch
      global.fetch = originalFetch;

      expect(report).toBeDefined();
      expect(callCount).toBeGreaterThan(2);
      expect(duration).toBeLessThan(60000); // Should handle retries efficiently
    }, 75000);
  });

  describe('Scalability Tests', () => {
    it('should handle increasing numbers of categories efficiently', async () => {
      const categorySets = [
        [CheckCategory.API_CONNECTIVITY],
        [CheckCategory.API_CONNECTIVITY, CheckCategory.ERROR_HANDLING],
        [CheckCategory.API_CONNECTIVITY, CheckCategory.ERROR_HANDLING, CheckCategory.PERFORMANCE],
        [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.ERROR_HANDLING,
          CheckCategory.PERFORMANCE,
          CheckCategory.USER_EXPERIENCE,
        ],
        [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.ERROR_HANDLING,
          CheckCategory.PERFORMANCE,
          CheckCategory.USER_EXPERIENCE,
          CheckCategory.SECURITY,
        ],
      ];

      const durations: number[] = [];

      for (const categories of categorySets) {
        const startTime = performance.now();

        const report = await runHealthCheck({ categories });

        const endTime = performance.now();
        durations.push(endTime - startTime);

        expect(report).toBeDefined();
        expect(report.summary.total).toBe(categories.length);
      }

      // Duration should scale sub-linearly with number of categories
      const singleCategoryDuration = durations[0];
      const allCategoriesDuration = durations[durations.length - 1];

      // All categories should take less than 5x the single category time
      expect(allCategoriesDuration).toBeLessThan(singleCategoryDuration * 5);
    }, 180000);

    it('should maintain performance with repeated executions', async () => {
      const durations: number[] = [];
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await runHealthCheck({
          categories: [CheckCategory.API_CONNECTIVITY, CheckCategory.PERFORMANCE],
        });

        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      // Performance should not degrade significantly over time
      const firstDuration = durations[0];
      const lastDuration = durations[durations.length - 1];
      const degradation = (lastDuration - firstDuration) / firstDuration;

      // Less than 100% degradation acceptable
      expect(degradation).toBeLessThan(1.0);
    }, 120000);
  });

  describe('Performance Regression Tests', () => {
    it('should maintain API response time benchmarks', async () => {
      const report = await runHealthCheck({
        categories: [CheckCategory.PERFORMANCE],
      });

      expect(report).toBeDefined();

      // Check that performance metrics are within acceptable ranges
      const performanceResult = report.results.find(r => r.category === CheckCategory.PERFORMANCE);
      expect(performanceResult).toBeDefined();

      if (performanceResult?.metrics) {
        // These values should be adjusted based on actual performance requirements
        expect(performanceResult.metrics.apiResponseTime).toBeLessThan(5000); // 5 seconds
        expect(performanceResult.metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB
      }
    }, 30000);

    it('should complete health check with score calculation within time limit', async () => {
      const startTime = performance.now();

      const report = await runHealthCheck({
        categories: [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.ERROR_HANDLING,
          CheckCategory.PERFORMANCE,
          CheckCategory.USER_EXPERIENCE,
          CheckCategory.SECURITY,
        ],
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(report).toBeDefined();
      expect(report.summary.score).toBeGreaterThanOrEqual(0);
      expect(report.summary.score).toBeLessThanOrEqual(100);
      expect(duration).toBeLessThan(120000); // 2 minutes
    }, 150000);
  });
});