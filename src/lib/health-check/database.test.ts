// Mock Dexie BEFORE any imports
jest.mock('dexie', () => {
  const mockData = new Map();

  return {
    Dexie: class MockDexie {
      constructor(name: string) {
        this.name = name;
        this.mockData = mockData;
        this.checkResults = this.createMockTable('checkResults');
        this.checkReports = this.createMockTable('checkReports');
        this.checkConfigs = this.createMockTable('checkConfigs');
        this.verno = 1;
      }

      name: string;
      mockData: Map<string, any>;
      checkResults: any;
      checkReports: any;
      checkConfigs: any;
      verno: number;

      version(versionNumber: number) {
        this.verno = versionNumber;
        return {
          stores: jest.fn().mockReturnValue(this),
        };
      }

      table(tableName: string) {
        return this[tableName];
      }

      // Create mock table methods
      createMockTable(prefix: string) {
        return {
          add: jest.fn().mockImplementation(async (item) => {
            const id = Date.now().toString();
            this.mockData.set(`${prefix}_${id}`, { ...item, id });
            return id;
          }),
          get: jest.fn().mockImplementation(async (id) => {
            return this.mockData.get(`${prefix}_${id}`) || undefined;
          }),
          toArray: jest.fn().mockImplementation(async () => {
            return Array.from(this.mockData.entries())
              .filter(([key]) => key.startsWith(`${prefix}_`))
              .map(([, value]) => value);
          }),
          where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
              toArray: jest.fn().mockImplementation(async () => {
                return Array.from(this.mockData.entries())
                  .filter(([key]) => key.startsWith(`${prefix}_`))
                  .map(([, value]) => value);
              }),
              count: jest.fn().mockResolvedValue(0),
              first: jest.fn().mockResolvedValue(undefined),
            }),
            between: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
            }),
            anyOf: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
            }),
          }),
          orderBy: jest.fn().mockReturnValue({
            reverse: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                toArray: jest.fn().mockImplementation(async () => {
                  return Array.from(this.mockData.entries())
                    .filter(([key]) => key.startsWith(`${prefix}_`))
                    .slice(-10)
                    .map(([, value]) => value);
                }),
              }),
            }),
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([]),
            }),
          }),
          delete: jest.fn().mockImplementation(async (id) => {
            this.mockData.delete(`${prefix}_${id}`);
          }),
          clear: jest.fn().mockImplementation(async () => {
            for (const key of Array.from(this.mockData.keys())) {
              if (key.startsWith(`${prefix}_`)) {
                this.mockData.delete(key);
              }
            }
          }),
          bulkPut: jest.fn().mockImplementation(async (items) => {
            items.forEach(item => {
              const id = item.id || item.category;
              this.mockData.set(`${prefix}_${id}`, { ...item, id });
            });
          }),
        };
      }
    }
  };
});

// Mock IndexedDB operations
const mockOpenDB = jest.fn();
global.indexedDB = {
  open: mockOpenDB,
} as any;

// Now import the modules after mocking is set up
import {
  healthCheckDB,
  HealthCheckRepository,
  DEFAULT_CHECK_CONFIGS,
  DEFAULT_GLOBAL_CONFIG
} from './database';
import {
  HealthCheckResult,
  HealthCheckReport,
  HealthCheckConfig,
  CheckStatus,
  CheckCategory,
  SeverityLevel,
  GlobalHealthCheckConfig,
} from './types';

describe('HealthCheckRepository', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await healthCheckDB.checkResults.clear();
    await healthCheckDB.checkReports.clear();
    await healthCheckDB.checkConfigs.clear();
    await healthCheckDB.globalConfig.clear();
  });

  afterAll(async () => {
    // Close database connection after all tests
    await healthCheckDB.close();
  });

  describe('Check Result Operations', () => {
    const mockResult: HealthCheckResult = {
      id: 'result-1',
      category: CheckCategory.API_CONNECTIVITY,
      status: CheckStatus.PASSED,
      timestamp: new Date('2025-10-08T10:00:00Z'),
      severity: SeverityLevel.LOW,
      duration: 1000,
      details: {
        endpoint: 'https://api.groq.com',
        responseTime: 500,
        statusCode: 200,
      },
      recommendations: [],
    };

    it('should save and retrieve check result', async () => {
      await HealthCheckRepository.saveCheckResult(mockResult);

      const retrieved = await HealthCheckRepository.getCheckResult(mockResult.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(mockResult.id);
      expect(retrieved!.category).toBe(mockResult.category);
      expect(retrieved!.status).toBe(mockResult.status);
    });

    it('should return null for non-existent result', async () => {
      const result = await HealthCheckRepository.getCheckResult('non-existent');
      expect(result).toBeNull();
    });

    it('should get results by category', async () => {
      const apiResult = { ...mockResult, id: 'api-1', category: CheckCategory.API_CONNECTIVITY };
      const perfResult = { ...mockResult, id: 'perf-1', category: CheckCategory.PERFORMANCE };

      await HealthCheckRepository.saveCheckResult(apiResult);
      await HealthCheckRepository.saveCheckResult(perfResult);

      const apiResults = await HealthCheckRepository.getCheckResultsByCategory(CheckCategory.API_CONNECTIVITY);
      expect(apiResults).toHaveLength(1);
      expect(apiResults[0].category).toBe(CheckCategory.API_CONNECTIVITY);
    });

    it('should get recent check results', async () => {
      const oldResult = { ...mockResult, id: 'old-1', timestamp: new Date('2025-10-07T10:00:00Z') };
      const newResult = { ...mockResult, id: 'new-1', timestamp: new Date('2025-10-08T10:00:00Z') };

      await HealthCheckRepository.saveCheckResult(oldResult);
      await HealthCheckRepository.saveCheckResult(newResult);

      const recentResults = await HealthCheckRepository.getRecentCheckResults(2);
      expect(recentResults).toHaveLength(2);
      expect(recentResults[0].timestamp).toEqual(newResult.timestamp);
    });

    it('should get results by status', async () => {
      const passedResult = { ...mockResult, id: 'passed-1', status: CheckStatus.PASSED };
      const failedResult = { ...mockResult, id: 'failed-1', status: CheckStatus.FAILED };

      await HealthCheckRepository.saveCheckResult(passedResult);
      await HealthCheckRepository.saveCheckResult(failedResult);

      const failedResults = await HealthCheckRepository.getCheckResultsByStatus(CheckStatus.FAILED);
      expect(failedResults).toHaveLength(1);
      expect(failedResults[0].status).toBe(CheckStatus.FAILED);
    });

    it('should get results by severity', async () => {
      const lowResult = { ...mockResult, id: 'low-1', severity: SeverityLevel.LOW };
      const highResult = { ...mockResult, id: 'high-1', severity: SeverityLevel.HIGH };

      await HealthCheckRepository.saveCheckResult(lowResult);
      await HealthCheckRepository.saveCheckResult(highResult);

      const highResults = await HealthCheckRepository.getCheckResultsBySeverity(SeverityLevel.HIGH);
      expect(highResults).toHaveLength(1);
      expect(highResults[0].severity).toBe(SeverityLevel.HIGH);
    });

    it('should delete check result', async () => {
      await HealthCheckRepository.saveCheckResult(mockResult);

      await HealthCheckRepository.deleteCheckResult(mockResult.id);

      const deleted = await HealthCheckRepository.getCheckResult(mockResult.id);
      expect(deleted).toBeNull();
    });

    it('should delete results before date', async () => {
      const oldResult = { ...mockResult, id: 'old-1', timestamp: new Date('2025-09-08T10:00:00Z') };
      const newResult = { ...mockResult, id: 'new-1', timestamp: new Date('2025-10-08T10:00:00Z') };

      await HealthCheckRepository.saveCheckResult(oldResult);
      await HealthCheckRepository.saveCheckResult(newResult);

      const cutoffDate = new Date('2025-10-01T00:00:00Z');
      const deletedCount = await HealthCheckRepository.deleteCheckResultsBefore(cutoffDate);

      expect(deletedCount).toBe(1);

      const remaining = await HealthCheckRepository.getCheckResult('new-1');
      expect(remaining).not.toBeNull();
    });
  });

  describe('Check Report Operations', () => {
    const mockReport: HealthCheckReport = {
      id: 'report-1',
      timestamp: new Date('2025-10-08T10:00:00Z'),
      duration: 5000,
      results: [],
      summary: {
        total: 5,
        passed: 4,
        failed: 1,
        warnings: 0,
        overallStatus: CheckStatus.PASSED,
        score: 85,
        recommendations: ['Test recommendation'],
        criticalIssues: [],
      },
    };

    it('should save and retrieve check report', async () => {
      await HealthCheckRepository.saveCheckReport(mockReport);

      const retrieved = await HealthCheckRepository.getCheckReport(mockReport.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(mockReport.id);
      expect(retrieved!.summary.score).toBe(mockReport.summary.score);
    });

    it('should get latest check report', async () => {
      const oldReport = { ...mockReport, id: 'old-1', timestamp: new Date('2025-10-07T10:00:00Z') };
      const newReport = { ...mockReport, id: 'new-1', timestamp: new Date('2025-10-08T10:00:00Z') };

      await HealthCheckRepository.saveCheckReport(oldReport);
      await HealthCheckRepository.saveCheckReport(newReport);

      const latest = await HealthCheckRepository.getLatestCheckReport();
      expect(latest).not.toBeNull();
      expect(latest!.id).toBe('new-1');
    });

    it('should return null when no reports exist', async () => {
      const latest = await HealthCheckRepository.getLatestCheckReport();
      expect(latest).toBeNull();
    });

    it('should get check reports with pagination', async () => {
      const reports = Array.from({ length: 5 }, (_, i) => ({
        ...mockReport,
        id: `report-${i}`,
        timestamp: new Date(`2025-10-08T10:${i}:00Z`),
      }));

      for (const report of reports) {
        await HealthCheckRepository.saveCheckReport(report);
      }

      const page1 = await HealthCheckRepository.getCheckReports(2, 0);
      const page2 = await HealthCheckRepository.getCheckReports(2, 2);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).toBe('report-4'); // Most recent first
    });

    it('should get reports by date range', async () => {
      const inRangeReport = { ...mockReport, id: 'in-range-1', timestamp: new Date('2025-10-08T10:00:00Z') };
      const outOfRangeReport = { ...mockReport, id: 'out-range-1', timestamp: new Date('2025-10-15T10:00:00Z') };

      await HealthCheckRepository.saveCheckReport(inRangeReport);
      await HealthCheckRepository.saveCheckReport(outOfRangeReport);

      const from = new Date('2025-10-01T00:00:00Z');
      const to = new Date('2025-10-10T23:59:59Z');

      const reports = await HealthCheckRepository.getCheckReportsByDateRange(from, to);
      expect(reports).toHaveLength(1);
      expect(reports[0].id).toBe('in-range-1');
    });

    it('should get reports by status', async () => {
      const passedReport = {
        ...mockReport,
        id: 'passed-1',
        summary: { ...mockReport.summary, overallStatus: CheckStatus.PASSED }
      };
      const failedReport = {
        ...mockReport,
        id: 'failed-1',
        summary: { ...mockReport.summary, overallStatus: CheckStatus.FAILED }
      };

      await HealthCheckRepository.saveCheckReport(passedReport);
      await HealthCheckRepository.saveCheckReport(failedReport);

      const failedReports = await HealthCheckRepository.getCheckReportsByStatus(CheckStatus.FAILED);
      expect(failedReports).toHaveLength(1);
      expect(failedReports[0].summary.overallStatus).toBe(CheckStatus.FAILED);
    });

    it('should delete check report', async () => {
      await HealthCheckRepository.saveCheckReport(mockReport);

      await HealthCheckRepository.deleteCheckReport(mockReport.id);

      const deleted = await HealthCheckRepository.getCheckReport(mockReport.id);
      expect(deleted).toBeNull();
    });
  });

  describe('Configuration Operations', () => {
    const mockConfig: HealthCheckConfig = {
      enabled: true,
      timeout: 10000,
      retryCount: 3,
      severity: SeverityLevel.HIGH,
    };

    it('should save and retrieve check config', async () => {
      await HealthCheckRepository.saveCheckConfig(CheckCategory.API_CONNECTIVITY, mockConfig);

      const retrieved = await HealthCheckRepository.getCheckConfig(CheckCategory.API_CONNECTIVITY);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.enabled).toBe(mockConfig.enabled);
      expect(retrieved!.timeout).toBe(mockConfig.timeout);
    });

    it('should return null for non-existent config', async () => {
      const config = await HealthCheckRepository.getCheckConfig('non-existent');
      expect(config).toBeNull();
    });

    it('should get all check configs', async () => {
      await HealthCheckRepository.saveCheckConfig(CheckCategory.API_CONNECTIVITY, mockConfig);
      await HealthCheckRepository.saveCheckConfig(CheckCategory.PERFORMANCE, {
        ...mockConfig,
        timeout: 15000,
      });

      const configs = await HealthCheckRepository.getAllCheckConfigs();
      expect(configs).toHaveLength(2);
    });

    it('should delete check config', async () => {
      await HealthCheckRepository.saveCheckConfig(CheckCategory.API_CONNECTIVITY, mockConfig);

      await HealthCheckRepository.deleteCheckConfig(CheckCategory.API_CONNECTIVITY);

      const deleted = await HealthCheckRepository.getCheckConfig(CheckCategory.API_CONNECTIVITY);
      expect(deleted).toBeNull();
    });

    it('should save and retrieve global config', async () => {
      await HealthCheckRepository.saveGlobalConfig(DEFAULT_GLOBAL_CONFIG);

      const retrieved = await HealthCheckRepository.getGlobalConfig();
      expect(retrieved).not.toBeNull();
      expect(retrieved!.autoRun).toBe(DEFAULT_GLOBAL_CONFIG.autoRun);
      expect(retrieved!.interval).toBe(DEFAULT_GLOBAL_CONFIG.interval);
    });

    it('should return null for non-existent global config', async () => {
      const config = await HealthCheckRepository.getGlobalConfig();
      expect(config).toBeNull();
    });
  });

  describe('Statistics Operations', () => {
    beforeEach(async () => {
      // Setup test data
      const reports: HealthCheckReport[] = [
        {
          id: 'report-1',
          timestamp: new Date('2025-10-08T10:00:00Z'),
          duration: 5000,
          results: [
            {
              id: 'result-1',
              category: CheckCategory.API_CONNECTIVITY,
              status: CheckStatus.PASSED,
              timestamp: new Date('2025-10-08T10:00:00Z'),
              severity: SeverityLevel.LOW,
              duration: 1000,
              details: {},
              recommendations: [],
            },
            {
              id: 'result-2',
              category: CheckCategory.PERFORMANCE,
              status: CheckStatus.FAILED,
              timestamp: new Date('2025-10-08T10:01:00Z'),
              severity: SeverityLevel.HIGH,
              duration: 2000,
              details: {},
              recommendations: [],
            },
          ],
          summary: {
            total: 2,
            passed: 1,
            failed: 1,
            warnings: 0,
            overallStatus: CheckStatus.PASSED,
            score: 75,
            recommendations: [],
            criticalIssues: [],
          },
        },
        {
          id: 'report-2',
          timestamp: new Date('2025-10-07T10:00:00Z'),
          duration: 3000,
          results: [],
          summary: {
            total: 1,
            passed: 1,
            failed: 0,
            warnings: 0,
            overallStatus: CheckStatus.PASSED,
            score: 90,
            recommendations: [],
            criticalIssues: [],
          },
        },
      ];

      for (const report of reports) {
        await HealthCheckRepository.saveCheckReport(report);
      }
    });

    it('should get check result statistics', async () => {
      const stats = await HealthCheckRepository.getCheckResultStatistics(7);

      expect(stats.total).toBe(2);
      expect(stats.byStatus[CheckStatus.PASSED]).toBe(2);
      expect(stats.byStatus[CheckStatus.FAILED]).toBe(0);
      expect(stats.byCategory[CheckCategory.API_CONNECTIVITY]).toBe(1);
      expect(stats.byCategory[CheckCategory.PERFORMANCE]).toBe(1);
      expect(stats.bySeverity[SeverityLevel.LOW]).toBe(1);
      expect(stats.bySeverity[SeverityLevel.HIGH]).toBe(1);
      expect(stats.averageScore).toBe(83); // Math.round((75 + 90) / 2)
      expect(stats.averageDuration).toBe(4000); // Math.round((5000 + 3000) / 2)
    });

    it('should return empty statistics for no data', async () => {
      await healthCheckDB.checkReports.clear();

      const stats = await HealthCheckRepository.getCheckResultStatistics(7);

      expect(stats.total).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe('Data Cleanup Operations', () => {
    it('should cleanup old data', async () => {
      const oldReport = {
        id: 'old-report',
        timestamp: new Date('2025-09-08T10:00:00Z'),
        duration: 1000,
        results: [],
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          warnings: 0,
          overallStatus: CheckStatus.PASSED,
          score: 100,
          recommendations: [],
          criticalIssues: [],
        },
      };

      const newReport = {
        id: 'new-report',
        timestamp: new Date('2025-10-08T10:00:00Z'),
        duration: 1000,
        results: [],
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          warnings: 0,
          overallStatus: CheckStatus.PASSED,
          score: 100,
          recommendations: [],
          criticalIssues: [],
        },
      };

      await HealthCheckRepository.saveCheckReport(oldReport);
      await HealthCheckRepository.saveCheckReport(newReport);

      const cleanupResult = await HealthCheckRepository.cleanupOldData(20);

      expect(cleanupResult.deletedReports).toBe(1);

      const remaining = await HealthCheckRepository.getCheckReport('new-report');
      expect(remaining).not.toBeNull();
    });
  });

  describe('Data Import/Export Operations', () => {
    it('should export data', async () => {
      const mockResult: HealthCheckResult = {
        id: 'result-1',
        category: CheckCategory.API_CONNECTIVITY,
        status: CheckStatus.PASSED,
        timestamp: new Date('2025-10-08T10:00:00Z'),
        severity: SeverityLevel.LOW,
        duration: 1000,
        details: {},
        recommendations: [],
      };

      const mockReport: HealthCheckReport = {
        id: 'report-1',
        timestamp: new Date('2025-10-08T10:00:00Z'),
        duration: 5000,
        results: [mockResult],
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          warnings: 0,
          overallStatus: CheckStatus.PASSED,
          score: 100,
          recommendations: [],
          criticalIssues: [],
        },
      };

      await HealthCheckRepository.saveCheckResult(mockResult);
      await HealthCheckRepository.saveCheckReport(mockReport);
      await HealthCheckRepository.saveCheckConfig(CheckCategory.API_CONNECTIVITY, DEFAULT_CHECK_CONFIGS[CheckCategory.API_CONNECTIVITY]);

      const exportBlob = await HealthCheckRepository.exportData();

      expect(exportBlob).toBeInstanceOf(Blob);
      expect(exportBlob.type).toBe('application/json');

      const exportText = await exportBlob.text();
      const exportData = JSON.parse(exportText);

      expect(exportData.version).toBe('1.0');
      expect(exportData.data.results).toHaveLength(1);
      expect(exportData.data.reports).toHaveLength(1);
      expect(exportData.data.configs).toHaveLength(1);
    });

    it('should import data', async () => {
      const importData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          results: [
            {
              id: 'imported-result-1',
              category: CheckCategory.API_CONNECTIVITY,
              status: CheckStatus.PASSED,
              timestamp: new Date('2025-10-08T10:00:00Z'),
              severity: SeverityLevel.LOW,
              duration: 1000,
              details: {},
              recommendations: [],
            },
          ],
          reports: [
            {
              id: 'imported-report-1',
              timestamp: new Date('2025-10-08T10:00:00Z'),
              duration: 5000,
              results: [],
              summary: {
                total: 1,
                passed: 1,
                failed: 0,
                warnings: 0,
                overallStatus: CheckStatus.PASSED,
                score: 100,
                recommendations: [],
                criticalIssues: [],
              },
            },
          ],
          configs: [
            {
              category: CheckCategory.API_CONNECTIVITY,
              ...DEFAULT_CHECK_CONFIGS[CheckCategory.API_CONNECTIVITY],
            },
          ],
        },
      };

      const importBlob = new Blob([JSON.stringify(importData)], { type: 'application/json' });

      const importResult = await HealthCheckRepository.importData(importBlob);

      expect(importResult.importedResults).toBe(1);
      expect(importResult.importedReports).toBe(1);
      expect(importResult.importedConfigs).toBe(1);

      const importedResult = await HealthCheckRepository.getCheckResult('imported-result-1');
      expect(importedResult).not.toBeNull();
      expect(importedResult!.id).toBe('imported-result-1');

      const importedReport = await HealthCheckRepository.getCheckReport('imported-report-1');
      expect(importedReport).not.toBeNull();
      expect(importedReport!.id).toBe('imported-report-1');
    });

    it('should handle empty import data', async () => {
      const emptyImportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {},
      };

      const importBlob = new Blob([JSON.stringify(emptyImportData)], { type: 'application/json' });

      const importResult = await HealthCheckRepository.importData(importBlob);

      expect(importResult.importedResults).toBe(0);
      expect(importResult.importedReports).toBe(0);
      expect(importResult.importedConfigs).toBe(0);
    });
  });

  describe('Check Progress Operations', () => {
    it('should get check progress for existing report', async () => {
      const mockReport: HealthCheckReport = {
        id: 'report-1',
        timestamp: new Date('2025-10-08T10:00:00Z'),
        duration: 5000,
        results: [],
        summary: {
          total: 5,
          passed: 5,
          failed: 0,
          warnings: 0,
          overallStatus: CheckStatus.PASSED,
          score: 100,
          recommendations: [],
          criticalIssues: [],
        },
      };

      await HealthCheckRepository.saveCheckReport(mockReport);

      const progress = await HealthCheckRepository.getCheckProgress('report-1');

      expect(progress).not.toBeNull();
      expect(progress!.checkId).toBe('report-1');
      expect(progress!.total).toBe(5);
      expect(progress!.completed).toBe(5);
      expect(progress!.estimatedTimeRemaining).toBe(0);
    });

    it('should return null for non-existent progress', async () => {
      const progress = await HealthCheckRepository.getCheckProgress('non-existent');
      expect(progress).toBeNull();
    });
  });
});