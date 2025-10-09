/**
 * Historical trend analysis for health check data
 * Provides insights and trends based on historical health check reports
 */

import { HealthCheckReport, CheckStatus, CheckCategory } from './types';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';

export interface TrendData {
  timestamp: Date;
  score: number;
  status: CheckStatus;
  duration: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
}

export interface CategoryTrend {
  category: CheckCategory;
  data: TrendData[];
  averageScore: number;
  successRate: number;
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
}

export interface AnalyticsMetrics {
  overallTrend: 'improving' | 'declining' | 'stable';
  overallTrendPercentage: number;
  averageScore: number;
  averageDuration: number;
  successRate: number;
  reliabilityScore: number;
  performanceScore: number;
  uptimePercentage: number;
  mostFailingCategory: CheckCategory | null;
  mostImprovingCategory: CheckCategory | null;
  categoryTrends: CategoryTrend[];
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export class HealthCheckAnalytics {
  private reports: HealthCheckReport[] = [];

  constructor(reports: HealthCheckReport[]) {
    this.reports = reports.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get analytics for the specified time range
   */
  getAnalytics(timeRange: TimeRange): AnalyticsMetrics {
    const filteredReports = this.filterReportsByTimeRange(timeRange);

    if (filteredReports.length === 0) {
      return this.getEmptyAnalytics();
    }

    const trendData = this.convertToTrendData(filteredReports);
    const categoryTrends = this.getCategoryTrends(trendData);
    const overallTrend = this.calculateOverallTrend(trendData);
    const metrics = this.calculateMetrics(filteredReports);

    return {
      ...overallTrend,
      ...metrics,
      categoryTrends,
    };
  }

  /**
   * Get trend data for visualization
   */
  getTrendData(timeRange: TimeRange, category?: CheckCategory): TrendData[] {
    const filteredReports = this.filterReportsByTimeRange(timeRange);
    const trendData = this.convertToTrendData(filteredReports);

    if (category) {
      return trendData.map(item => ({
        ...item,
        score: this.getCategoryScore(filteredReports.find(r => r.timestamp.getTime() === item.timestamp.getTime()), category),
        status: this.getCategoryStatus(filteredReports.find(r => r.timestamp.getTime() === item.timestamp.getTime()), category),
      }));
    }

    return trendData;
  }

  /**
   * Get performance metrics over time
   */
  getPerformanceMetrics(timeRange: TimeRange): {
    timestamps: Date[];
    responseTimes: number[];
    successRates: number[];
    scores: number[];
  } {
    const filteredReports = this.filterReportsByTimeRange(timeRange);

    return {
      timestamps: filteredReports.map(r => r.timestamp),
      responseTimes: filteredReports.map(r => r.duration),
      successRates: filteredReports.map(r => (r.summary.passed / r.summary.total) * 100),
      scores: filteredReports.map(r => r.summary.score),
    };
  }

  /**
   * Get category performance comparison
   */
  getCategoryPerformance(timeRange: TimeRange): {
    category: CheckCategory;
    averageScore: number;
    successRate: number;
    totalRuns: number;
    lastRun: Date | null;
    status: CheckStatus;
  }[] {
    const filteredReports = this.filterReportsByTimeRange(timeRange);
    const categories = Object.values(CheckCategory);

    return categories.map(category => {
      const categoryReports = filteredReports.map(report => ({
        report,
        result: report.results.find(r => r.category === category),
      })).filter(item => item.result);

      const averageScore = categoryReports.length > 0
        ? categoryReports.reduce((sum, item) => sum + (item.result?.metrics.accuracy || 0), 0) / categoryReports.length
        : 0;

      const successRate = categoryReports.length > 0
        ? (categoryReports.filter(item => item.result?.status === 'pass').length / categoryReports.length) * 100
        : 0;

      const lastRun = categoryReports.length > 0
        ? Math.max(...categoryReports.map(item => item.report.timestamp.getTime()))
        : null;

      const lastStatus = categoryReports.length > 0
        ? categoryReports[categoryReports.length - 1].result?.status || 'failed'
        : 'failed';

      return {
        category,
        averageScore,
        successRate,
        totalRuns: categoryReports.length,
        lastRun: lastRun ? new Date(lastRun) : null,
        status: lastStatus as CheckStatus,
      };
    });
  }

  /**
   * Get reliability statistics
   */
  getReliabilityStats(timeRange: TimeRange): {
    uptime: number;
    downtime: number;
    uptimePercentage: number;
    averageRecoveryTime: number;
    incidentCount: number;
    meanTimeBetweenFailures: number;
  } {
    const filteredReports = this.filterReportsByTimeRange(timeRange);

    if (filteredReports.length === 0) {
      return {
        uptime: 0,
        downtime: 0,
        uptimePercentage: 0,
        averageRecoveryTime: 0,
        incidentCount: 0,
        meanTimeBetweenFailures: 0,
      };
    }

    const totalDuration = timeRange.end.getTime() - timeRange.start.getTime();
    const failedReports = filteredReports.filter(r => r.summary.overallStatus === CheckStatus.FAILED);
    const passedReports = filteredReports.filter(r => r.summary.overallStatus === CheckStatus.PASSED);

    // Calculate uptime based on passed reports
    const uptime = passedReports.length * (totalDuration / filteredReports.length);
    const downtime = failedReports.length * (totalDuration / filteredReports.length);
    const uptimePercentage = (uptime / totalDuration) * 100;

    // Calculate recovery time (time between failures and next success)
    const recoveryTimes: number[] = [];
    for (let i = 0; i < filteredReports.length - 1; i++) {
      const current = filteredReports[i];
      const next = filteredReports[i + 1];

      if (current.summary.overallStatus === CheckStatus.FAILED &&
          next.summary.overallStatus === CheckStatus.PASSED) {
        recoveryTimes.push(next.timestamp.getTime() - current.timestamp.getTime());
      }
    }

    const averageRecoveryTime = recoveryTimes.length > 0
      ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length
      : 0;

    // Calculate mean time between failures
    const failureTimes: number[] = [];
    for (let i = 0; i < filteredReports.length - 1; i++) {
      const current = filteredReports[i];
      const next = filteredReports[i + 1];

      if (current.summary.overallStatus === CheckStatus.FAILED) {
        failureTimes.push(next.timestamp.getTime() - current.timestamp.getTime());
      }
    }

    const meanTimeBetweenFailures = failureTimes.length > 0
      ? failureTimes.reduce((sum, time) => sum + time, 0) / failureTimes.length
      : 0;

    return {
      uptime,
      downtime,
      uptimePercentage,
      averageRecoveryTime,
      incidentCount: failedReports.length,
      meanTimeBetweenFailures,
    };
  }

  /**
   * Get recommendations based on trends
   */
  getRecommendations(timeRange: TimeRange): {
    priority: 'high' | 'medium' | 'low';
    category: CheckCategory;
    message: string;
    actionable: boolean;
  }[] {
    const analytics = this.getAnalytics(timeRange);
    const recommendations: {
      priority: 'high' | 'medium' | 'low';
      category: CheckCategory;
      message: string;
      actionable: boolean;
    }[] = [];

    // High priority recommendations
    if (analytics.overallTrend === 'declining' && Math.abs(analytics.overallTrendPercentage) > 10) {
      recommendations.push({
        priority: 'high',
        category: CheckCategory.API_CONNECTIVITY, // Default category
        message: `Overall system health is declining by ${analytics.overallTrendPercentage.toFixed(1)}%. Immediate investigation required.`,
        actionable: true,
      });
    }

    if (analytics.successRate < 90) {
      recommendations.push({
        priority: 'high',
        category: CheckCategory.ERROR_HANDLING,
        message: `Success rate is ${(analytics.successRate * 100).toFixed(1)}%, below the 90% threshold.`,
        actionable: true,
      });
    }

    // Medium priority recommendations
    if (analytics.reliabilityScore < 80) {
      recommendations.push({
        priority: 'medium',
        category: CheckCategory.PERFORMANCE,
        message: `Reliability score is ${analytics.reliabilityScore.toFixed(1)}%. Consider implementing redundancy measures.`,
        actionable: true,
      });
    }

    // Category-specific recommendations
    analytics.categoryTrends.forEach(trend => {
      if (trend.trend === 'declining' && Math.abs(trend.trendPercentage) > 15) {
        recommendations.push({
          priority: 'medium',
          category: trend.category,
          message: `${this.getCategoryName(trend.category)} performance is declining by ${trend.trendPercentage.toFixed(1)}%.`,
          actionable: true,
        });
      }

      if (trend.successRate < 85) {
        recommendations.push({
          priority: 'medium',
          category: trend.category,
          message: `${this.getCategoryName(trend.category)} success rate is ${trend.successRate.toFixed(1)}%.`,
          actionable: true,
        });
      }
    });

    // Low priority recommendations
    if (analytics.averageDuration > 120000) { // 2 minutes
      recommendations.push({
        priority: 'low',
        category: CheckCategory.PERFORMANCE,
        message: `Average check duration is ${(analytics.averageDuration / 1000).toFixed(1)}s. Consider optimization.`,
        actionable: true,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private filterReportsByTimeRange(timeRange: TimeRange): HealthCheckReport[] {
    return this.reports.filter(report =>
      report.timestamp >= timeRange.start && report.timestamp <= timeRange.end
    );
  }

  private convertToTrendData(reports: HealthCheckReport[]): TrendData[] {
    return reports.map(report => ({
      timestamp: report.timestamp,
      score: report.summary.score,
      status: report.summary.overallStatus,
      duration: report.duration,
      totalChecks: report.summary.total,
      passedChecks: report.summary.passed,
      failedChecks: report.summary.failed,
      warningChecks: report.summary.warnings,
    }));
  }

  private getCategoryTrends(trendData: TrendData[]): CategoryTrend[] {
    const categories = Object.values(CheckCategory);

    return categories.map(category => {
      const categoryData = trendData.map(item => {
        const report = this.reports.find(r => r.timestamp.getTime() === item.timestamp.getTime());
        return {
          ...item,
          score: this.getCategoryScore(report, category),
          status: this.getCategoryStatus(report, category),
        };
      });

      const averageScore = categoryData.reduce((sum, item) => sum + item.score, 0) / categoryData.length;
      const successRate = (categoryData.filter(item => item.status === 'pass').length / categoryData.length) * 100;
      const trend = this.calculateTrend(categoryData.map(d => d.score));
      const trendPercentage = this.calculateTrendPercentage(categoryData.map(d => d.score));

      return {
        category,
        data: categoryData,
        averageScore,
        successRate,
        trend,
        trendPercentage,
      };
    });
  }

  private getCategoryScore(report: HealthCheckReport | undefined, category: CheckCategory): number {
    if (!report) return 0;

    const result = report.results.find(r => r.category === category);
    return result?.metrics.accuracy || 0;
  }

  private getCategoryStatus(report: HealthCheckReport | undefined, category: CheckCategory): CheckStatus {
    if (!report) return CheckStatus.FAILED;

    const result = report.results.find(r => r.category === category);
    return result?.status as CheckStatus || CheckStatus.FAILED;
  }

  private calculateOverallTrend(trendData: TrendData[]): {
    overallTrend: 'improving' | 'declining' | 'stable';
    overallTrendPercentage: number;
  } {
    if (trendData.length < 2) {
      return { overallTrend: 'stable', overallTrendPercentage: 0 };
    }

    const scores = trendData.map(d => d.score);
    const trend = this.calculateTrend(scores);
    const trendPercentage = this.calculateTrendPercentage(scores);

    return { overallTrend: trend, overallTrendPercentage: trendPercentage };
  }

  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    const threshold = 5; // 5% threshold for stability

    if (difference > threshold) return 'improving';
    if (difference < -threshold) return 'declining';
    return 'stable';
  }

  private calculateTrendPercentage(values: number[]): number {
    if (values.length < 2) return 0;

    const first = values[0];
    const last = values[values.length - 1];

    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }

  private calculateMetrics(reports: HealthCheckReport[]): Omit<AnalyticsMetrics, 'overallTrend' | 'overallTrendPercentage' | 'categoryTrends'> {
    const averageScore = reports.reduce((sum, r) => sum + r.summary.score, 0) / reports.length;
    const averageDuration = reports.reduce((sum, r) => sum + r.duration, 0) / reports.length;
    const successRate = (reports.reduce((sum, r) => sum + r.summary.passed, 0) / reports.reduce((sum, r) => sum + r.summary.total, 0)) * 100;

    // Calculate reliability score (consistency of successful checks)
    const successfulReports = reports.filter(r => r.summary.overallStatus === CheckStatus.PASSED);
    const reliabilityScore = (successfulReports.length / reports.length) * 100;

    // Calculate performance score (based on duration and success rate)
    const performanceScore = Math.min(100, (successRate * 0.7) + (Math.max(0, 100 - (averageDuration / 120000) * 100) * 0.3));

    // Calculate uptime percentage
    const uptimePercentage = reliabilityScore;

    // Find most failing and improving categories
    const categoryPerformance = this.getCategoryPerformance({
      start: reports[0].timestamp,
      end: reports[reports.length - 1].timestamp,
    });

    const mostFailingCategory = categoryPerformance
      .filter(c => c.successRate < 90)
      .sort((a, b) => a.successRate - b.successRate)[0]?.category || null;

    const mostImprovingCategory = categoryPerformance
      .filter(c => c.successRate > 90)
      .sort((a, b) => b.successRate - a.successRate)[0]?.category || null;

    return {
      averageScore,
      averageDuration,
      successRate,
      reliabilityScore,
      performanceScore,
      uptimePercentage,
      mostFailingCategory,
      mostImprovingCategory,
    };
  }

  private getEmptyAnalytics(): AnalyticsMetrics {
    return {
      overallTrend: 'stable',
      overallTrendPercentage: 0,
      averageScore: 0,
      averageDuration: 0,
      successRate: 0,
      reliabilityScore: 0,
      performanceScore: 0,
      uptimePercentage: 0,
      mostFailingCategory: null,
      mostImprovingCategory: null,
      categoryTrends: [],
    };
  }

  private getCategoryName(category: CheckCategory): string {
    const names = {
      [CheckCategory.API_CONNECTIVITY]: 'API Connectivity',
      [CheckCategory.ERROR_HANDLING]: 'Error Handling',
      [CheckCategory.PERFORMANCE]: 'Performance',
      [CheckCategory.USER_EXPERIENCE]: 'User Experience',
      [CheckCategory.SECURITY]: 'Security',
    };
    return names[category] || category;
  }
}

/**
 * Predefined time ranges for analytics
 */
export const TimeRanges = {
  Last24Hours: {
    start: subDays(new Date(), 1),
    end: new Date(),
  },
  Last7Days: {
    start: subDays(new Date(), 7),
    end: new Date(),
  },
  Last30Days: {
    start: subDays(new Date(), 30),
    end: new Date(),
  },
  LastWeek: {
    start: startOfDay(subWeeks(new Date(), 1)),
    end: endOfDay(subDays(new Date(), 7)),
  },
  LastMonth: {
    start: startOfDay(subMonths(new Date(), 1)),
    end: endOfDay(subDays(new Date(), 30)),
  },
};

/**
 * Hook for health check analytics
 */
export function useHealthCheckAnalytics(reports: HealthCheckReport[]) {
  const analytics = React.useMemo(() => new HealthCheckAnalytics(reports), [reports]);

  const getAnalytics = React.useCallback((timeRange: TimeRange) => {
    return analytics.getAnalytics(timeRange);
  }, [analytics]);

  const getTrendData = React.useCallback((timeRange: TimeRange, category?: CheckCategory) => {
    return analytics.getTrendData(timeRange, category);
  }, [analytics]);

  const getPerformanceMetrics = React.useCallback((timeRange: TimeRange) => {
    return analytics.getPerformanceMetrics(timeRange);
  }, [analytics]);

  const getCategoryPerformance = React.useCallback((timeRange: TimeRange) => {
    return analytics.getCategoryPerformance(timeRange);
  }, [analytics]);

  const getReliabilityStats = React.useCallback((timeRange: TimeRange) => {
    return analytics.getReliabilityStats(timeRange);
  }, [analytics]);

  const getRecommendations = React.useCallback((timeRange: TimeRange) => {
    return analytics.getRecommendations(timeRange);
  }, [analytics]);

  return {
    getAnalytics,
    getTrendData,
    getPerformanceMetrics,
    getCategoryPerformance,
    getReliabilityStats,
    getRecommendations,
    TimeRanges,
  };
}