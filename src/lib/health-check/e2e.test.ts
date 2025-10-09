// End-to-end tests for Health Check System
// Tests complete workflow from UI interaction to data storage

// Mock the enhanced-groq-client to avoid authentication errors
jest.mock('../enhanced-groq-client', () => ({
  EnhancedGroqClient: jest.fn().mockImplementation(() => ({
    transcribeAudio: jest.fn().mockResolvedValue({ text: 'Mock transcription' }),
  })),
  AuthenticationError: class extends Error {},
}));

import { runHealthCheck } from './scheduler';
import { HealthCheckRepository } from './database';
import {
  HealthCheckResult,
  HealthCheckReport,
  CheckStatus,
  CheckCategory,
  SeverityLevel,
} from './types';

describe('Health Check End-to-End Workflow', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await HealthCheckRepository.deleteCheckReportsBefore(new Date());
    jest.clearAllMocks();
  });

  describe('Complete Health Check Workflow', () => {
    it('should execute full workflow from check trigger to data persistence', async () => {
      // Step 1: Trigger health check
      const checkOptions = {
        categories: [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.ERROR_HANDLING,
          CheckCategory.PERFORMANCE,
        ],
      };

      const report = await runHealthCheck(checkOptions);

      // Step 2: Verify report generation
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.duration).toBeGreaterThan(0);
      expect(report.summary.total).toBe(3);
      expect(report.results).toHaveLength(3);

      // Step 3: Verify data persistence
      await HealthCheckRepository.saveCheckReport(report);

      const savedReport = await HealthCheckRepository.getCheckReport(report.id);
      expect(savedReport).not.toBeNull();
      expect(savedReport!.id).toBe(report.id);
      expect(savedReport!.summary.total).toBe(report.summary.total);

      // Step 4: Verify data retrieval
      const latestReport = await HealthCheckRepository.getLatestCheckReport();
      expect(latestReport).not.toBeNull();
      expect(latestReport!.id).toBe(report.id);

      // Step 5: Verify individual results can be retrieved
      for (const result of report.results) {
        await HealthCheckRepository.saveCheckResult(result);
        const savedResult = await HealthCheckRepository.getCheckResult(result.id);
        expect(savedResult).not.toBeNull();
        expect(savedResult!.category).toBe(result.category);
      }
    }, 60000);

    it('should handle workflow with different category combinations', async () => {
      const categoryCombinations = [
        [CheckCategory.API_CONNECTIVITY],
        [CheckCategory.SECURITY, CheckCategory.USER_EXPERIENCE],
        [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.ERROR_HANDLING,
          CheckCategory.PERFORMANCE,
          CheckCategory.SECURITY,
        ],
      ];

      for (const categories of categoryCombinations) {
        // Execute health check
        const report = await runHealthCheck({ categories });

        // Persist results
        await HealthCheckRepository.saveCheckReport(report);
        for (const result of report.results) {
          await HealthCheckRepository.saveCheckResult(result);
        }

        // Verify workflow completion
        const savedReport = await HealthCheckRepository.getCheckReport(report.id);
        expect(savedReport).not.toBeNull();
        expect(savedReport!.summary.total).toBe(categories.length);

        // Verify data consistency
        const retrievedResults = await HealthCheckRepository.getCheckResultsByCategory(categories[0]);
        expect(retrievedResults.length).toBeGreaterThanOrEqual(1);
      }
    }, 120000);

    it('should maintain data integrity throughout the workflow', async () => {
      const originalReport = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY, CheckCategory.PERFORMANCE],
      });

      // Save to database
      await HealthCheckRepository.saveCheckReport(originalReport);
      for (const result of originalReport.results) {
        await HealthCheckRepository.saveCheckResult(result);
      }

      // Retrieve and verify
      const retrievedReport = await HealthCheckRepository.getCheckReport(originalReport.id);
      expect(retrievedReport).not.toBeNull();

      // Verify all critical data is preserved
      expect(retrievedReport!.id).toBe(originalReport.id);
      expect(retrievedReport!.summary.total).toBe(originalReport.summary.total);
      expect(retrievedReport!.summary.passed).toBe(originalReport.summary.passed);
      expect(retrievedReport!.summary.failed).toBe(originalReport.summary.failed);
      expect(retrievedReport!.summary.score).toBe(originalReport.summary.score);
      expect(retrievedReport!.results).toHaveLength(originalReport.results.length);

      // Verify timestamp consistency
      const timeDiff = Math.abs(
        retrievedReport!.timestamp.getTime() - originalReport.timestamp.getTime()
      );
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
    }, 45000);
  });

  describe('Error Handling Workflow', () => {
    it('should handle and recover from errors in the workflow', async () => {
      // Mock a scenario where some checks might fail
      const report = await runHealthCheck({
        categories: [CheckCategory.ERROR_HANDLING, CheckCategory.SECURITY],
      });

      expect(report).toBeDefined();

      // Workflow should continue even if some checks fail
      expect(report.summary.total).toBe(2);

      // Should still be able to save partially successful results
      await HealthCheckRepository.saveCheckReport(report);

      const savedReport = await HealthCheckRepository.getCheckReport(report.id);
      expect(savedReport).not.toBeNull();
      expect(savedReport!.summary.total).toBe(2);

      // Verify error information is preserved
      const failedResults = report.results.filter(r => r.status === CheckStatus.FAILED);
      if (failedResults.length > 0) {
        expect(failedResults[0].message).toBeDefined();
      }
    }, 45000);

    it('should handle timeout scenarios gracefully', async () => {
      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
        config: {
          timeout: 1000, // Very short timeout
        },
      });

      // Should still produce a report even with timeout
      expect(report).toBeDefined();
      expect(report.summary.total).toBeGreaterThanOrEqual(0);

      // Should be able to save the report
      await HealthCheckRepository.saveCheckReport(report);

      const savedReport = await HealthCheckRepository.getCheckReport(report.id);
      expect(savedReport).not.toBeNull();
    }, 30000);
  });

  describe('Performance Workflow', () => {
    it('should complete workflow within performance constraints', async () => {
      const startTime = performance.now();

      // Execute complete workflow
      const report = await runHealthCheck({
        categories: [
          CheckCategory.API_CONNECTIVITY,
          CheckCategory.ERROR_HANDLING,
          CheckCategory.PERFORMANCE,
        ],
      });

      // Save all data
      await HealthCheckRepository.saveCheckReport(report);
      for (const result of report.results) {
        await HealthCheckRepository.saveCheckResult(result);
      }

      // Verify retrieval
      const savedReport = await HealthCheckRepository.getCheckReport(report.id);
      expect(savedReport).not.toBeNull();

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Complete workflow should complete within reasonable time
      expect(totalDuration).toBeLessThan(90000); // 90 seconds
      expect(report.summary.total).toBe(3);
    }, 120000);

    it('should handle concurrent workflows efficiently', async () => {
      const startTime = performance.now();

      // Execute multiple workflows concurrently
      const workflowPromises = [
        runHealthCheck({ categories: [CheckCategory.API_CONNECTIVITY] }),
        runHealthCheck({ categories: [CheckCategory.ERROR_HANDLING] }),
        runHealthCheck({ categories: [CheckCategory.SECURITY] }),
      ];

      const reports = await Promise.all(workflowPromises);

      // Save all reports
      for (const report of reports) {
        await HealthCheckRepository.saveCheckReport(report);
        for (const result of report.results) {
          await HealthCheckRepository.saveCheckResult(result);
        }
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Should complete concurrent workflows efficiently
      expect(totalDuration).toBeLessThan(60000); // 60 seconds
      expect(reports).toHaveLength(3);

      // Verify all data was saved correctly
      for (const report of reports) {
        const savedReport = await HealthCheckRepository.getCheckReport(report.id);
        expect(savedReport).not.toBeNull();
      }
    }, 90000);
  });

  describe('Data Management Workflow', () => {
    it('should handle data export and import workflow', async () => {
      // Generate initial data
      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY, CheckCategory.PERFORMANCE],
      });

      await HealthCheckRepository.saveCheckReport(report);
      for (const result of report.results) {
        await HealthCheckRepository.saveCheckResult(result);
      }

      // Export data
      const exportBlob = await HealthCheckRepository.exportData();
      expect(exportBlob).toBeInstanceOf(Blob);

      // Clear database
      await HealthCheckRepository.deleteCheckReport(report.id);
      for (const result of report.results) {
        await HealthCheckRepository.deleteCheckResult(result.id);
      }

      // Verify data is cleared
      const clearedReport = await HealthCheckRepository.getCheckReport(report.id);
      expect(clearedReport).toBeNull();

      // Import data
      const importResult = await HealthCheckRepository.importData(exportBlob);
      expect(importResult.importedReports).toBeGreaterThan(0);
      expect(importResult.importedResults).toBeGreaterThan(0);

      // Verify imported data
      const importedReport = await HealthCheckRepository.getCheckReport(report.id);
      expect(importedReport).not.toBeNull();
      expect(importedReport!.summary.total).toBe(report.summary.total);
    }, 60000);

    it('should handle data cleanup workflow', async () => {
      // Generate some test data
      const reports: HealthCheckReport[] = [];
      for (let i = 0; i < 3; i++) {
        const report = await runHealthCheck({
          categories: [CheckCategory.API_CONNECTIVITY],
        });
        reports.push(report);
        await HealthCheckRepository.saveCheckReport(report);
      }

      // Verify data exists
      const allReports = await HealthCheckRepository.getCheckReports(10);
      expect(allReports.length).toBeGreaterThanOrEqual(3);

      // Run cleanup (with 0 days retention to remove all data)
      const cleanupResult = await HealthCheckRepository.cleanupOldData(0);

      expect(cleanupResult.deletedReports).toBeGreaterThanOrEqual(3);

      // Verify cleanup worked
      const remainingReports = await HealthCheckRepository.getCheckReports(10);
      expect(remainingReports.length).toBeLessThan(allReports.length);
    }, 90000);
  });

  describe('Configuration Workflow', () => {
    it('should handle configuration management workflow', async () => {
      // Save custom configuration
      const customConfig = {
        enabled: true,
        timeout: 15000,
        retryCount: 5,
        severity: SeverityLevel.LOW,
      };

      await HealthCheckRepository.saveCheckConfig(CheckCategory.API_CONNECTIVITY, customConfig);

      // Retrieve configuration
      const retrievedConfig = await HealthCheckRepository.getCheckConfig(CheckCategory.API_CONNECTIVITY);
      expect(retrievedConfig).not.toBeNull();
      expect(retrievedConfig!.timeout).toBe(15000);
      expect(retrievedConfig!.retryCount).toBe(5);

      // Use configuration in health check
      const report = await runHealthCheck({
        categories: [CheckCategory.API_CONNECTIVITY],
      });

      expect(report).toBeDefined();
      expect(report.summary.total).toBe(1);

      // Workflow should complete with custom settings
      await HealthCheckRepository.saveCheckReport(report);
      const savedReport = await HealthCheckRepository.getCheckReport(report.id);
      expect(savedReport).not.toBeNull();
    }, 45000);

    it('should handle global configuration workflow', async () => {
      const globalConfig = {
        autoRun: false,
        interval: 86400000, // 24 hours
        notifications: true,
        emailReports: false,
        retentionDays: 30,
      };

      await HealthCheckRepository.saveGlobalConfig(globalConfig);

      const retrievedConfig = await HealthCheckRepository.getGlobalConfig();
      expect(retrievedConfig).not.toBeNull();
      expect(retrievedConfig!.interval).toBe(86400000);
      expect(retrievedConfig!.retentionDays).toBe(30);

      // Health check should work with global configuration
      const report = await runHealthCheck({
        categories: [CheckCategory.USER_EXPERIENCE],
      });

      expect(report).toBeDefined();
      await HealthCheckRepository.saveCheckReport(report);
    }, 30000);
  });

  describe('Statistics and Analytics Workflow', () => {
    it('should handle statistics generation workflow', async () => {
      // Generate multiple reports for statistics
      for (let i = 0; i < 3; i++) {
        const report = await runHealthCheck({
          categories: [CheckCategory.API_CONNECTIVITY, CheckCategory.PERFORMANCE],
        });
        await HealthCheckRepository.saveCheckReport(report);
      }

      // Generate statistics
      const stats = await HealthCheckRepository.getCheckResultStatistics(7);

      expect(stats.total).toBe(3);
      expect(stats.byStatus).toBeDefined();
      expect(stats.byCategory).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageDuration).toBeGreaterThan(0);

      // Verify statistics accuracy
      expect(stats.byCategory[CheckCategory.API_CONNECTIVITY]).toBe(3);
      expect(stats.byCategory[CheckCategory.PERFORMANCE]).toBe(3);
    }, 90000);

    it('should handle historical data workflow', async () => {
      const reports: HealthCheckReport[] = [];
      const timestamps = [
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      ];

      // Generate historical data
      for (const timestamp of timestamps) {
        const report = await runHealthCheck({
          categories: [CheckCategory.SECURITY],
        });
        report.timestamp = timestamp; // Manipulate timestamp for testing
        await HealthCheckRepository.saveCheckReport(report);
        reports.push(report);
      }

      // Query historical data
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const toDate = new Date();
      const historicalReports = await HealthCheckRepository.getCheckReportsByDateRange(fromDate, toDate);

      expect(historicalReports.length).toBe(3);

      // Verify chronological order
      for (let i = 0; i < historicalReports.length - 1; i++) {
        expect(historicalReports[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          historicalReports[i + 1].timestamp.getTime()
        );
      }
    }, 90000);
  });
});