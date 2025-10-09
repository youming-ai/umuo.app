'use client';

import { useCallback, useMemo } from 'react';
import { useHealthCheck } from '@/lib/health-check/context';
import { CheckCategory, HealthCheckReport, CheckStatus, HealthCheckConfigWithCategory } from '@/lib/health-check/types';

/**
 * 健康检查操作的自定义Hook
 * 提供便捷的方法来执行健康检查相关操作
 */
export function useHealthCheckOperations() {
  const { state, actions } = useHealthCheck();

  // 运行快速检查（仅包含关键检查）
  const runQuickCheck = useCallback(async () => {
    const criticalCategories = [
      CheckCategory.API_CONNECTIVITY,
      CheckCategory.ERROR_HANDLING,
    ];

    await actions.runCheck(criticalCategories, {
      timeout: 60000, // 1分钟
      parallel: true,
    });
  }, [actions]);

  // 运行完整检查（包含所有检查）
  const runFullCheck = useCallback(async () => {
    await actions.runCheck(undefined, {
      timeout: 300000, // 5分钟
      parallel: true,
    });
  }, [actions]);

  // 运行自定义检查
  const runCustomCheck = useCallback(async (
    categories: CheckCategory[],
    config?: {
      timeout?: number;
      retryCount?: number;
      parallel?: boolean;
    }
  ) => {
    await actions.runCheck(categories, config);
  }, [actions]);

  return {
    // 状态
    isRunning: state.currentCheck.isRunning,
    progress: state.currentCheck.progress,
    estimatedTimeRemaining: state.currentCheck.estimatedTimeRemaining,
    currentCheckId: state.currentCheck.id,

    // 最新报告
    latestReport: state.latestReport,
    systemStatus: getSystemStatus(state.latestReport),

    // 操作方法
    runQuickCheck,
    runFullCheck,
    runCustomCheck,
    dismissNotification: actions.dismissNotification,
    clearError: actions.clearError,

    // 其他状态
    isLoading: state.isLoading,
    error: state.error,
    notifications: state.notifications,
  };
}

/**
 * 健康检查统计数据的Hook
 */
export function useHealthCheckStats() {
  const { state } = useHealthCheck();

  const stats = useMemo(() => {
    if (!state.latestReport) {
      return {
        score: 0,
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warningChecks: 0,
        lastCheckTime: null,
        duration: 0,
        issues: [],
      };
    }

    const { summary } = state.latestReport;

    return {
      score: summary.score,
      totalChecks: summary.total,
      passedChecks: summary.passed,
      failedChecks: summary.failed,
      warningChecks: summary.warnings,
      lastCheckTime: state.latestReport.timestamp,
      duration: state.latestReport.duration,
      issues: state.latestReport.issues,
    };
  }, [state.latestReport]);

  return stats;
}

/**
 * 健康检查配置的Hook
 */
export function useHealthCheckConfig() {
  const { state, actions } = useHealthCheck();

  const updateCategoryConfig = useCallback(async (
    category: CheckCategory,
    config: {
      enabled: boolean;
      timeout: number;
      retryCount: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }
  ) => {
    const updatedConfigs = (state.configs as HealthCheckConfigWithCategory[]).map(c =>
      c.category === category ? { ...c, ...config } : c
    );

    await actions.updateConfig(updatedConfigs, state.globalConfig);
  }, [state.configs, state.globalConfig, actions]);

  const updateGlobalConfig = useCallback(async (
    globalConfig: {
      autoRun: boolean;
      interval: number;
      notifications: boolean;
      emailReports: boolean;
      retentionDays: number;
    }
  ) => {
    await actions.updateConfig(state.configs, globalConfig);
  }, [state.configs, actions]);

  return {
    configs: state.configs,
    globalConfig: state.globalConfig,
    updateCategoryConfig,
    updateGlobalConfig,
    refreshConfigs: actions.loadConfigs,
  };
}

/**
 * 健康检查历史的Hook
 */
export function useHealthCheckHistory() {
  const { state, actions } = useHealthCheck();

  const getReportsByStatus = useCallback((status: CheckStatus) => {
    return state.reports.filter(report => report.summary.overallStatus === status);
  }, [state.reports]);

  const getReportsByDateRange = useCallback((from: Date, to: Date) => {
    return state.reports.filter(report =>
      report.timestamp >= from && report.timestamp <= to
    );
  }, [state.reports]);

  const getRecentReports = useCallback((limit = 10) => {
    return state.reports.slice(0, limit);
  }, [state.reports]);

  const deleteReport = useCallback(async (reportId: string) => {
    try {
      const response = await fetch(`/api/health-check/reports/${reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      // 重新加载报告列表
      await actions.loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }, [actions]);

  return {
    reports: state.reports,
    getReportsByStatus,
    getReportsByDateRange,
    getRecentReports,
    deleteReport,
    refreshReports: actions.loadReports,
  };
}

/**
 * 健康检查建议的Hook
 */
export function useHealthCheckRecommendations() {
  const { state } = useHealthCheck();

  const recommendations = useMemo(() => {
    if (!state.latestReport) {
      return [];
    }

    return state.latestReport.recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [state.latestReport]);

  const getRecommendationsByCategory = useCallback((category: CheckCategory) => {
    return recommendations.filter(rec => rec.category === category);
  }, [recommendations]);

  const getHighPriorityRecommendations = useCallback(() => {
    return recommendations.filter(rec => rec.priority === 'high');
  }, [recommendations]);

  return {
    recommendations,
    getRecommendationsByCategory,
    getHighPriorityRecommendations,
  };
}

/**
 * 健康检查实时监控的Hook
 */
export function useHealthCheckMonitor() {
  const { state } = useHealthCheck();

  const isHealthy = useMemo(() => {
    if (!state.latestReport) return false;
    return state.latestReport.summary.overallStatus === CheckStatus.PASSED;
  }, [state.latestReport]);

  const needsAttention = useMemo(() => {
    if (!state.latestReport) return false;
    return state.latestReport.summary.overallStatus === CheckStatus.WARNING;
  }, [state.latestReport]);

  const hasCriticalIssues = useMemo(() => {
    if (!state.latestReport) return false;
    return state.latestReport.summary.overallStatus === CheckStatus.FAILED;
  }, [state.latestReport]);

  const criticalIssueCount = useMemo(() => {
    if (!state.latestReport) return 0;
    return state.latestReport.issues.filter(issue =>
      issue.severity === 'critical' || issue.severity === 'high'
    ).length;
  }, [state.latestReport]);

  return {
    isHealthy,
    needsAttention,
    hasCriticalIssues,
    criticalIssueCount,
    lastCheckTime: state.latestReport?.timestamp || null,
    score: state.latestReport?.summary.score || 0,
  };
}

/**
 * 工具函数：获取系统状态
 */
function getSystemStatus(report: HealthCheckReport | null): 'healthy' | 'warning' | 'error' {
  if (!report) return 'warning';

  switch (report.summary.overallStatus) {
    case CheckStatus.PASSED:
      return 'healthy';
    case CheckStatus.WARNING:
      return 'warning';
    case CheckStatus.FAILED:
      return 'error';
    default:
      return 'warning';
  }
}

/**
 * 工具函数：格式化持续时间
 */
export function formatDuration(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * 工具函数：格式化相对时间
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * 工具函数：获取状态颜色
 */
export function getStatusColor(status: CheckStatus): string {
  switch (status) {
    case CheckStatus.PASSED:
      return 'text-green-600';
    case CheckStatus.WARNING:
      return 'text-yellow-600';
    case CheckStatus.FAILED:
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * 工具函数：获取严重级别颜色
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low':
      return 'text-blue-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-orange-600';
    case 'critical':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

// 导出默认的useHealthCheck hook以供页面使用
export { useHealthCheck as default };