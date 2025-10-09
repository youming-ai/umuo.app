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

describe('Health Check System', () => {
  describe('runHealthCheck', () => {
    it('should run a complete health check', async () => {
      const startTime = Date.now();

      const report = await runHealthCheck({
        categories: [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.PERFORMANCE,
          CheckCategory.ERROR_HANDLING,
          CheckCategory.USER_EXPERIENCE,
          CheckCategory.SECURITY,
        ],
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.version).toBe('1.0.0');
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify summary
      expect(report.summary.total).toBeGreaterThan(0);
      expect(report.summary.total).toBeLessThanOrEqual(5);
      expect(report.summary.passed).toBeGreaterThanOrEqual(0);
      expect(report.summary.failed).toBeGreaterThanOrEqual(0);
      expect(report.summary.warnings).toBeGreaterThanOrEqual(0);
      expect(report.summary.skipped).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallStatus).toBeDefined();
      expect(report.summary.score).toBeGreaterThanOrEqual(0);
      expect(report.summary.score).toBeLessThanOrEqual(100);

      // Verify results
      expect(report.results).toBeDefined();
      expect(report.results.length).toBeGreaterThan(0);
      expect(report.results.length).toBeLessThanOrEqual(5);

      // Verify system info
      expect(report.systemInfo).toBeDefined();
      expect(report.systemInfo.userAgent).toBeDefined();
      expect(report.systemInfo.platform).toBeDefined();
      expect(report.systemInfo.language).toBeDefined();
      expect(report.systemInfo.timeZone).toBeDefined();

      // Verify metadata
      expect(report.metadata).toBeDefined();
      expect(report.metadata.version).toBeDefined();
      expect(report.metadata.environment).toBeDefined();
    }, 35000); // Increase timeout for this test

    it('should run health check for specific categories', async () => {
      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
      });

      expect(report).toBeDefined();
      expect(report.summary.total).toBe(1);
      expect(report.results).toHaveLength(1);
      expect(report.results[0].category).toBe(CheckCategory.API_CONNECTIVITY);
    }, 20000);

    it('should handle empty categories array', async () => {
      const report = await runHealthCheck({
        categories: [],
      });

      expect(report).toBeDefined();
      expect(report.summary.total).toBe(0);
      expect(report.results).toHaveLength(0);
      expect(report.summary.overallStatus).toBe(CheckStatus.PENDING);
      expect(report.summary.score).toBe(0);
    });

    it('should handle custom configuration', async () => {
      const report = await runHealthCheck({
        categories: [CheckCategory.PERFORMANCE],
        config: {
          timeout: 5000,
          retryCount: 1,
          parallel: true,
        },
      });

      expect(report).toBeDefined();
      expect(report.summary.total).toBe(1);
      expect(report.results[0].category).toBe(CheckCategory.PERFORMANCE);
    }, 15000);

    it('should handle progress callbacks', async () => {
      const progressCallback = jest.fn();

      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY, CheckCategory.PERFORMANCE],
        onProgress: progressCallback,
      });

      expect(report).toBeDefined();
      expect(progressCallback).toHaveBeenCalled();

      // Verify progress callback was called with correct structure
      const progressCalls = progressCallback.mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);

      progressCalls.forEach(call => {
        const progress = call[0];
        expect(progress).toHaveProperty('category');
        expect(progress).toHaveProperty('status');
        expect(progress).toHaveProperty('progress');
        expect(progress).toHaveProperty('message');
      });
    }, 25000);

    it('should include issues and recommendations when problems are found', async () => {
      const report = await runHealthCheck({
        categories: [CheckCategory.ERROR_HANDLING, CheckCategory.SECURITY],
      });

      expect(report).toBeDefined();
      expect(report.summary.total).toBe(2);

      // Check that issues array exists (may be empty if no issues found)
      expect(report.issues).toBeDefined();
      expect(Array.isArray(report.issues)).toBe(true);

      // Check that recommendations array exists (may be empty if no recommendations needed)
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    }, 25000);

    it('should generate consistent timestamps', async () => {
      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
      });

      const reportTime = report.timestamp.getTime();
      const currentTime = Date.now();

      // Report timestamp should be close to current time
      expect(Math.abs(reportTime - currentTime)).toBeLessThan(5000);

      // All result timestamps should be before or equal to report timestamp
      report.results.forEach(result => {
        expect(result.timestamp.getTime()).toBeLessThanOrEqual(reportTime);
      });
    }, 15000);

    it('should maintain result data integrity', async () => {
      const report = await runHealthCheck({
        categories: [CheckCategory.USER_EXPERIENCE],
      });

      expect(report).toBeDefined();
      expect(report.results).toHaveLength(1);

      const result = report.results[0];
      expect(result.id).toBeDefined();
      expect(result.category).toBe(CheckCategory.USER_EXPERIENCE);
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.message).toBeDefined();
    }, 20000);
  });

  describe('Error Handling', () => {
    it('should handle timeout gracefully', async () => {
      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
        config: {
          timeout: 1, // Very short timeout
        },
      });

      expect(report).toBeDefined();
      // Should have results even if some fail due to timeout
      expect(report.summary.total).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('should handle invalid categories gracefully', async () => {
      // Test with undefined categories
      const report1 = await runHealthCheck({});
      expect(report1).toBeDefined();

      // Test with null categories
      const report2 = await runHealthCheck({
        categories: null as any,
      });
      expect(report2).toBeDefined();
    }, 15000);
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now();

      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
        config: {
          timeout: 5000,
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(report).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);

    it('should handle parallel execution efficiently', async () => {
      const startTime = Date.now();

      const report = await runHealthCheck({
        categories: [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.PERFORMANCE,
          CheckCategory.USER_EXPERIENCE,
        ],
        config: {
          parallel: true,
          timeout: 5000,
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(report).toBeDefined();
      expect(report.summary.total).toBe(3);
      expect(duration).toBeLessThan(15000); // Should complete faster than sequential
    }, 20000);
  });
});