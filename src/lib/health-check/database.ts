import Dexie, { Table } from 'dexie';
import {
  HealthCheckResult,
  HealthCheckReport,
  HealthCheckConfig,
  CheckStatus,
  CheckCategory,
  SeverityLevel,
  CheckProgress,
  GlobalHealthCheckConfig,
} from './types';

// 健康检查数据库定义
export class HealthCheckDB extends Dexie {
  // 表定义
  checkResults!: Table<HealthCheckResult>;
  checkReports!: Table<HealthCheckReport>;
  checkConfigs!: Table<HealthCheckConfig & { category: string; lastUpdated: Date }>;
  globalConfig!: Table<GlobalHealthCheckConfig & { id: string; lastUpdated: Date }>;

  constructor() {
    super('OumuHealthCheck');

    // 定义数据库模式
    this.version(1).stores({
      checkResults: '++id, category, status, timestamp, severity, duration',
      checkReports: '++id, timestamp, overallStatus, score, duration',
      checkConfigs: 'category, enabled, lastUpdated',
      globalConfig: 'id, lastUpdated',
    });

    // 数据库钩子
    this.checkResults.hook('creating', (primKey, obj, trans) => {
      // 确保时间戳是Date对象
      if (typeof obj.timestamp === 'string') {
        obj.timestamp = new Date(obj.timestamp);
      }
    });

    this.checkReports.hook('creating', (primKey, obj, trans) => {
      // 确保时间戳是Date对象
      if (typeof obj.timestamp === 'string') {
        obj.timestamp = new Date(obj.timestamp);
      }
    });
  }
}

// 数据库实例
export const healthCheckDB = new HealthCheckDB();

// 数据访问层
export class HealthCheckRepository {
  // 检查结果相关操作
  static async saveCheckResult(result: HealthCheckResult): Promise<void> {
    await healthCheckDB.checkResults.put(result);
  }

  static async getCheckResult(id: string): Promise<HealthCheckResult | null> {
    return await healthCheckDB.checkResults.get(id) || null;
  }

  static async getCheckResultsByCategory(
    category: CheckCategory,
    limit = 50
  ): Promise<HealthCheckResult[]> {
    return await healthCheckDB.checkResults
      .where('category')
      .equals(category)
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async getRecentCheckResults(limit = 20): Promise<HealthCheckResult[]> {
    return await healthCheckDB.checkResults
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async getCheckResultsByStatus(
    status: CheckStatus,
    limit = 50
  ): Promise<HealthCheckResult[]> {
    return await healthCheckDB.checkResults
      .where('status')
      .equals(status)
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async getCheckResultsBySeverity(
    severity: SeverityLevel,
    limit = 50
  ): Promise<HealthCheckResult[]> {
    return await healthCheckDB.checkResults
      .where('severity')
      .equals(severity)
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async deleteCheckResult(id: string): Promise<void> {
    await healthCheckDB.checkResults.delete(id);
  }

  static async deleteCheckResultsBefore(date: Date): Promise<number> {
    return await healthCheckDB.checkResults
      .where('timestamp')
      .below(date)
      .delete();
  }

  // 检查报告相关操作
  static async saveCheckReport(report: HealthCheckReport): Promise<void> {
    await healthCheckDB.checkReports.put(report);
  }

  static async getCheckReport(id: string): Promise<HealthCheckReport | null> {
    return await healthCheckDB.checkReports.get(id) || null;
  }

  static async getLatestCheckReport(): Promise<HealthCheckReport | null> {
    const report = await healthCheckDB.checkReports
      .orderBy('timestamp')
      .reverse()
      .first();
    return report || null;
  }

  static async getCheckReports(
    limit = 10,
    offset = 0
  ): Promise<HealthCheckReport[]> {
    return await healthCheckDB.checkReports
      .orderBy('timestamp')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  }

  static async getCheckReportsByDateRange(
    from: Date,
    to: Date
  ): Promise<HealthCheckReport[]> {
    return await healthCheckDB.checkReports
      .where('timestamp')
      .between(from, to)
      .toArray();
  }

  static async getCheckReportsByStatus(
    status: CheckStatus,
    limit = 20
  ): Promise<HealthCheckReport[]> {
    return await healthCheckDB.checkReports
      .where('summary')
      .equals(status as any)
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async deleteCheckReport(id: string): Promise<void> {
    await healthCheckDB.checkReports.delete(id);
  }

  static async deleteCheckReportsBefore(date: Date): Promise<number> {
    return await healthCheckDB.checkReports
      .where('timestamp')
      .below(date)
      .delete();
  }

  // 配置管理相关操作
  static async saveCheckConfig(
    category: string,
    config: HealthCheckConfig
  ): Promise<void> {
    const configWithCategory = {
      ...config,
      category,
      lastUpdated: new Date(),
    };
    await healthCheckDB.checkConfigs.put(configWithCategory);
  }

  static async getCheckConfig(
    category: string
  ): Promise<HealthCheckConfig | null> {
    const config = await healthCheckDB.checkConfigs.get(category);
    if (!config) return null;

    // 移除内部字段
    const { category: _, lastUpdated: __, ...cleanConfig } = config;
    return cleanConfig;
  }

  static async getAllCheckConfigs(): Promise<HealthCheckConfig[]> {
    const configs = await healthCheckDB.checkConfigs.toArray();
    return configs.map(({ category: _, lastUpdated: __, ...config }) => config);
  }

  static async deleteCheckConfig(category: string): Promise<void> {
    await healthCheckDB.checkConfigs.delete(category);
  }

  // 全局配置相关操作
  static async saveGlobalConfig(config: GlobalHealthCheckConfig): Promise<void> {
    const configWithId = {
      ...config,
      id: 'global',
      lastUpdated: new Date(),
    };
    await healthCheckDB.globalConfig.put(configWithId);
  }

  static async getGlobalConfig(): Promise<GlobalHealthCheckConfig | null> {
    const config = await healthCheckDB.globalConfig.get('global');
    if (!config) return null;

    const { id: _, lastUpdated: __, ...cleanConfig } = config;
    return cleanConfig;
  }

  // 统计和分析相关操作
  static async getCheckResultStatistics(
    days = 30
  ): Promise<{
    total: number;
    byStatus: Record<CheckStatus, number>;
    byCategory: Record<CheckCategory, number>;
    bySeverity: Record<SeverityLevel, number>;
    averageScore: number;
    averageDuration: number;
  }> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const reports = await this.getCheckReportsByDateRange(fromDate, new Date());

    const stats = {
      total: reports.length,
      byStatus: {} as Record<CheckStatus, number>,
      byCategory: {} as Record<CheckCategory, number>,
      bySeverity: {} as Record<SeverityLevel, number>,
      averageScore: 0,
      averageDuration: 0,
    };

    // 初始化计数器
    Object.values(CheckStatus).forEach(status => {
      stats.byStatus[status] = 0;
    });
    Object.values(CheckCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });
    Object.values(SeverityLevel).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    let totalScore = 0;
    let totalDuration = 0;

    reports.forEach(report => {
      stats.byStatus[report.summary.overallStatus]++;
      stats.averageScore += report.summary.score;
      stats.averageDuration += report.duration;

      // 统计结果中的分类和严重级别
      report.results.forEach(result => {
        stats.byCategory[result.category]++;
        if (result.severity) {
          stats.bySeverity[result.severity]++;
        }
      });
    });

    if (reports.length > 0) {
      stats.averageScore = Math.round(stats.averageScore / reports.length);
      stats.averageDuration = Math.round(stats.averageDuration / reports.length);
    }

    return stats;
  }

  // 数据清理操作
  static async cleanupOldData(retentionDays = 30): Promise<{
    deletedResults: number;
    deletedReports: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [deletedResults, deletedReports] = await Promise.all([
      this.deleteCheckResultsBefore(cutoffDate),
      this.deleteCheckReportsBefore(cutoffDate),
    ]);

    return { deletedResults, deletedReports };
  }

  // 数据导出操作
  static async exportData(): Promise<Blob> {
    const [results, reports, configs] = await Promise.all([
      this.getRecentCheckResults(1000),
      this.getCheckReports(100),
      this.getAllCheckConfigs(),
    ]);

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        results,
        reports,
        configs,
      },
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  }

  // 数据导入操作
  static async importData(data: Blob): Promise<{
    importedResults: number;
    importedReports: number;
    importedConfigs: number;
  }> {
    const text = await data.text();
    const importData = JSON.parse(text);

    const { results = [], reports = [], configs = [] } = importData.data || {};

    const [importedResults, importedReports, importedConfigs] = await Promise.all([
      Promise.all(results.map((result: HealthCheckResult) => this.saveCheckResult(result))),
      Promise.all(reports.map((report: HealthCheckReport) => this.saveCheckReport(report))),
      Promise.all(
        configs.map((config: HealthCheckConfig & { category: string }) =>
          this.saveCheckConfig(config.category, config)
        )
      ),
    ]);

    return {
      importedResults: importedResults.length,
      importedReports: importedReports.length,
      importedConfigs: importedConfigs.length,
    };
  }

  // 检查进度相关操作
  static async getCheckProgress(checkId: string): Promise<CheckProgress | null> {
    // 这个方法通常与内存中的进度跟踪结合使用
    // 这里提供一个基于持久化数据的基本实现
    const report = await this.getCheckReport(checkId);
    if (!report) return null;

    return {
      checkId,
      total: report.summary.total,
      completed: report.summary.total, // 已完成的报告
      current: {
        category: CheckCategory.API_CONNECTIVITY,
        name: 'Health Check Complete',
        status: CheckStatus.PASSED,
        progress: 100,
      },
      estimatedTimeRemaining: 0,
    };
  }
}

// 默认配置
export const DEFAULT_CHECK_CONFIGS: Record<string, HealthCheckConfig> = {
  [CheckCategory.API_CONNECTIVITY]: {
    enabled: true,
    timeout: 10000, // 10 seconds
    retryCount: 3,
    severity: SeverityLevel.HIGH,
    parameters: {
      endpoints: ['groq', 'ai-service'],
    },
  },
  [CheckCategory.ERROR_HANDLING]: {
    enabled: true,
    timeout: 5000, // 5 seconds
    retryCount: 1,
    severity: SeverityLevel.MEDIUM,
  },
  [CheckCategory.PERFORMANCE]: {
    enabled: true,
    timeout: 30000, // 30 seconds
    retryCount: 1,
    severity: SeverityLevel.MEDIUM,
    parameters: {
      benchmarks: ['api-response', 'memory-usage', 'ui-responsiveness'],
    },
  },
  [CheckCategory.USER_EXPERIENCE]: {
    enabled: true,
    timeout: 15000, // 15 seconds
    retryCount: 1,
    severity: SeverityLevel.MEDIUM,
  },
  [CheckCategory.SECURITY]: {
    enabled: true,
    timeout: 10000, // 10 seconds
    retryCount: 1,
    severity: SeverityLevel.HIGH,
  },
  [CheckCategory.OFFLINE_CAPABILITY]: {
    enabled: true,
    timeout: 5000, // 5 seconds
    retryCount: 1,
    severity: SeverityLevel.LOW,
  },
};

export const DEFAULT_GLOBAL_CONFIG: GlobalHealthCheckConfig = {
  autoRun: false,
  interval: 86400000, // 24 hours
  notifications: true,
  emailReports: false,
  retentionDays: 30,
};