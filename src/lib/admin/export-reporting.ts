/**
 * Export and Reporting System for Performance Dashboard
 * Handles data export, report generation, and analytics
 */

import type {
  PerformanceReport,
  PerformanceMetric,
  PerformanceAlert,
  ExportOptions,
  ScheduledReport,
  SystemPerformanceMetrics,
  TranscriptionPerformanceMetrics,
  DatabasePerformanceMetrics,
  MobilePerformanceMetrics,
  TimeRange
} from "@/types/admin/performance-dashboard";

// Export formats
export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf' | 'html';

// Report templates
export type ReportTemplate =
  | 'executive_summary'
  | 'technical_detailed'
  | 'performance_trends'
  | 'health_check'
  | 'custom';

// Report scheduling
export type ReportSchedule = 'immediate' | 'hourly' | 'daily' | 'weekly' | 'monthly';

// Export quality settings
export interface ExportQuality {
  compression: boolean;
  includeCharts: boolean;
  includeRawData: boolean;
  metadata: boolean;
  annotations: boolean;
}

// Custom report sections
export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'chart' | 'table' | 'text' | 'metrics' | 'alerts';
  order: number;
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Export and Reporting Manager
 */
export class ExportReportingManager {
  private static instance: ExportReportingManager;
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private reportQueue: Array<{
    id: string;
    type: ReportTemplate;
    options: ExportOptions;
    timestamp: Date;
    callback?: (report: any) => void;
  }> = [];
  private isProcessingQueue = false;

  private constructor() {
    this.initializeScheduledReports();
  }

  static getInstance(): ExportReportingManager {
    if (!ExportReportingManager.instance) {
      ExportReportingManager.instance = new ExportReportingManager();
    }
    return ExportReportingManager.instance;
  }

  /**
   * Export performance data in various formats
   */
  async exportData(
    data: {
      metrics?: PerformanceMetric[];
      alerts?: PerformanceAlert[];
      reports?: PerformanceReport[];
      systemMetrics?: SystemPerformanceMetrics;
      transcriptionMetrics?: TranscriptionPerformanceMetrics;
      databaseMetrics?: DatabasePerformanceMetrics;
      mobileMetrics?: MobilePerformanceMetrics;
    },
    format: ExportFormat = 'json',
    options: Partial<ExportOptions> = {}
  ): Promise<Blob> {
    const exportOptions: ExportOptions = {
      format,
      timeRange: 3600000, // 1 hour default
      categories: [],
      includeAlerts: true,
      includeRecommendations: true,
      includeRawData: true,
      ...options
    };

    switch (format) {
      case 'json':
        return this.exportAsJSON(data, exportOptions);
      case 'csv':
        return this.exportAsCSV(data, exportOptions);
      case 'xlsx':
        return this.exportAsExcel(data, exportOptions);
      case 'pdf':
        return this.exportAsPDF(data, exportOptions);
      case 'html':
        return this.exportAsHTML(data, exportOptions);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(
    template: ReportTemplate = 'executive_summary',
    data: {
      metrics: PerformanceMetric[];
      alerts: PerformanceAlert[];
      systemMetrics: SystemPerformanceMetrics;
      transcriptionMetrics: TranscriptionPerformanceMetrics;
      databaseMetrics: DatabasePerformanceMetrics;
      mobileMetrics: MobilePerformanceMetrics;
      timeRange: TimeRange;
    },
    customSections?: ReportSection[]
  ): Promise<PerformanceReport> {
    const timestamp = new Date();
    const reportId = `report_${timestamp.getTime()}`;

    switch (template) {
      case 'executive_summary':
        return this.generateExecutiveSummary(data, reportId, timestamp);
      case 'technical_detailed':
        return this.generateTechnicalReport(data, reportId, timestamp);
      case 'performance_trends':
        return this.generateTrendsReport(data, reportId, timestamp);
      case 'health_check':
        return this.generateHealthCheckReport(data, reportId, timestamp);
      case 'custom':
        return this.generateCustomReport(data, reportId, timestamp, customSections || []);
      default:
        throw new Error(`Unsupported report template: ${template}`);
    }
  }

  /**
   * Export as JSON
   */
  private async exportAsJSON(
    data: any,
    options: ExportOptions
  ): Promise<Blob> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        timeRange: options.timeRange,
        categories: options.categories,
        version: '1.0.0'
      },
      data: {
        metrics: options.categories.length === 0 || !data.metrics
          ? data.metrics
          : data.metrics.filter(m => options.categories.includes(m.category)),
        alerts: options.includeAlerts ? data.alerts : [],
        reports: data.reports || [],
        systemMetrics: data.systemMetrics,
        transcriptionMetrics: data.transcriptionMetrics,
        databaseMetrics: data.databaseMetrics,
        mobileMetrics: data.mobileMetrics
      },
      statistics: this.calculateStatistics(data.metrics, data.alerts),
      recommendations: this.generateRecommendations(data.metrics, data.alerts)
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Export as CSV
   */
  private async exportAsCSV(
    data: any,
    options: ExportOptions
  ): Promise<Blob> {
    if (!data.metrics || data.metrics.length === 0) {
      throw new Error('No metrics data available for CSV export');
    }

    const headers = [
      'ID',
      'Name',
      'Value',
      'Unit',
      'Category',
      'Status',
      'Trend',
      'Timestamp',
      'Previous Value'
    ];

    const csvRows = [headers.join(',')];

    const filteredMetrics = options.categories.length === 0
      ? data.metrics
      : data.metrics.filter(m => options.categories.includes(m.category));

    filteredMetrics.forEach(metric => {
      const row = [
        metric.id,
        `"${metric.name}"`,
        metric.value,
        metric.unit,
        metric.category,
        metric.status,
        metric.trend,
        metric.timestamp.toISOString(),
        metric.previousValue || ''
      ];
      csvRows.push(row.join(','));
    });

    if (options.includeAlerts && data.alerts) {
      csvRows.push(''); // Empty row separator
      csvRows.push('Alerts');
      csvRows.push('ID,Title,Message,Severity,Category,Metric,Value,Threshold,Timestamp,Acknowledged');

      data.alerts.forEach((alert: PerformanceAlert) => {
        const row = [
          alert.id,
          `"${alert.title}"`,
          `"${alert.message}"`,
          alert.severity,
          alert.category,
          alert.metric,
          alert.value,
          alert.threshold,
          alert.timestamp.toISOString(),
          alert.acknowledged
        ];
        csvRows.push(row.join(','));
      });
    }

    const csvString = csvRows.join('\n');
    return new Blob([csvString], { type: 'text/csv' });
  }

  /**
   * Export as Excel (simplified implementation)
   */
  private async exportAsExcel(
    data: any,
    options: ExportOptions
  ): Promise<Blob> {
    // This is a simplified implementation
    // In a real application, you would use a library like xlsx
    const csvData = await this.exportAsCSV(data, options);
    return new Blob([await csvData.text()], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  /**
   * Export as PDF (simplified implementation)
   */
  private async exportAsPDF(
    data: any,
    options: ExportOptions
  ): Promise<Blob> {
    // This is a simplified implementation
    // In a real application, you would use a library like jsPDF or Puppeteer
    const htmlContent = await this.generateReportHTML(data, options);
    return new Blob([htmlContent], { type: 'text/html' });
  }

  /**
   * Export as HTML
   */
  private async exportAsHTML(
    data: any,
    options: ExportOptions
  ): Promise<Blob> {
    const htmlContent = await this.generateReportHTML(data, options);
    return new Blob([htmlContent], { type: 'text/html' });
  }

  /**
   * Generate HTML report
   */
  private async generateReportHTML(
    data: any,
    options: ExportOptions
  ): Promise<string> {
    const stats = this.calculateStatistics(data.metrics, data.alerts);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Dashboard Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; margin: 0; color: #1f2937; }
        .subtitle { color: #6b7280; margin: 5px 0 0 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f9fafb; padding: 20px; border-radius: 6px; border-left: 4px solid #3b82f6; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
        .stat-label { color: #6b7280; font-size: 14px; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1f2937; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        .status-excellent { color: #059669; }
        .status-good { color: #2563eb; }
        .status-fair { color: #d97706; }
        .status-poor { color: #ea580c; }
        .status-critical { color: #dc2626; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Performance Dashboard Report</h1>
            <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.totalMetrics}</div>
                <div class="stat-label">Total Metrics</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.averageHealthScore}%</div>
                <div class="stat-label">Average Health Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.criticalIssues}</div>
                <div class="stat-label">Critical Issues</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.activeAlerts}</div>
                <div class="stat-label">Active Alerts</div>
            </div>
        </div>

        ${data.metrics && data.metrics.length > 0 ? `
        <div class="section">
            <h2 class="section-title">Performance Metrics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Trend</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.metrics.map((metric: PerformanceMetric) => `
                        <tr>
                            <td>${metric.name}</td>
                            <td>${metric.category}</td>
                            <td>${metric.value} ${metric.unit}</td>
                            <td class="status-${metric.status}">${metric.status}</td>
                            <td>${metric.trend}</td>
                            <td>${metric.timestamp.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${options.includeAlerts && data.alerts && data.alerts.length > 0 ? `
        <div class="section">
            <h2 class="section-title">Alerts</h2>
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Severity</th>
                        <th>Category</th>
                        <th>Message</th>
                        <th>Timestamp</th>
                        <th>Acknowledged</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.alerts.map((alert: PerformanceAlert) => `
                        <tr>
                            <td>${alert.title}</td>
                            <td>${alert.severity}</td>
                            <td>${alert.category}</td>
                            <td>${alert.message}</td>
                            <td>${alert.timestamp.toLocaleString()}</td>
                            <td>${alert.acknowledged ? 'Yes' : 'No'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="footer">
            <p>This report was generated by the Performance Dashboard on ${new Date().toLocaleString()}.</p>
            <p>For more detailed analysis, please refer to the dashboard interface.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate executive summary report
   */
  private async generateExecutiveSummary(
    data: any,
    reportId: string,
    timestamp: Date
  ): Promise<PerformanceReport> {
    const stats = this.calculateStatistics(data.metrics, data.alerts);
    const recommendations = this.generateRecommendations(data.metrics, data.alerts);

    return {
      id: reportId,
      timestamp,
      timeRange: data.timeRange,
      summary: {
        overallScore: stats.averageHealthScore,
        overallHealth: this.getHealthStatusFromScore(stats.averageHealthScore),
        totalMetrics: stats.totalMetrics,
        criticalIssues: stats.criticalIssues,
        warnings: stats.warnings,
        improvements: recommendations.length
      },
      systemMetrics: data.systemMetrics,
      transcriptionMetrics: data.transcriptionMetrics,
      databaseMetrics: data.databaseMetrics,
      mobileMetrics: data.mobileMetrics,
      alerts: data.alerts.slice(0, 10), // Top 10 alerts
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      trends: this.calculateTrends(data.metrics)
    };
  }

  /**
   * Generate technical detailed report
   */
  private async generateTechnicalReport(
    data: any,
    reportId: string,
    timestamp: Date
  ): Promise<PerformanceReport> {
    const stats = this.calculateStatistics(data.metrics, data.alerts);
    const recommendations = this.generateRecommendations(data.metrics, data.alerts);

    return {
      id: reportId,
      timestamp,
      timeRange: data.timeRange,
      summary: {
        overallScore: stats.averageHealthScore,
        overallHealth: this.getHealthStatusFromScore(stats.averageHealthScore),
        totalMetrics: stats.totalMetrics,
        criticalIssues: stats.criticalIssues,
        warnings: stats.warnings,
        improvements: recommendations.length
      },
      systemMetrics: data.systemMetrics,
      transcriptionMetrics: data.transcriptionMetrics,
      databaseMetrics: data.databaseMetrics,
      mobileMetrics: data.mobileMetrics,
      alerts: data.alerts,
      recommendations: recommendations,
      trends: this.calculateTrends(data.metrics)
    };
  }

  /**
   * Generate trends report
   */
  private async generateTrendsReport(
    data: any,
    reportId: string,
    timestamp: Date
  ): Promise<PerformanceReport> {
    const trends = this.calculateTrends(data.metrics);
    const recommendations = this.generateTrendBasedRecommendations(trends);

    return {
      id: reportId,
      timestamp,
      timeRange: data.timeRange,
      summary: {
        overallScore: this.calculateTrendScore(trends),
        overallHealth: 'good', // Would be calculated from trends
        totalMetrics: data.metrics.length,
        criticalIssues: 0,
        warnings: trends.filter(t => t.direction === 'degrading').length,
        improvements: recommendations.length
      },
      systemMetrics: data.systemMetrics,
      transcriptionMetrics: data.transcriptionMetrics,
      databaseMetrics: data.databaseMetrics,
      mobileMetrics: data.mobileMetrics,
      alerts: [],
      recommendations: recommendations,
      trends: trends
    };
  }

  /**
   * Generate health check report
   */
  private async generateHealthCheckReport(
    data: any,
    reportId: string,
    timestamp: Date
  ): Promise<PerformanceReport> {
    const healthChecks = this.performHealthChecks(data);
    const recommendations = this.generateHealthBasedRecommendations(healthChecks);

    return {
      id: reportId,
      timestamp,
      timeRange: data.timeRange,
      summary: {
        overallScore: healthChecks.overallScore,
        overallHealth: this.getHealthStatusFromScore(healthChecks.overallScore),
        totalMetrics: data.metrics.length,
        criticalIssues: healthChecks.criticalCount,
        warnings: healthChecks.warningCount,
        improvements: recommendations.length
      },
      systemMetrics: data.systemMetrics,
      transcriptionMetrics: data.transcriptionMetrics,
      databaseMetrics: data.databaseMetrics,
      mobileMetrics: data.mobileMetrics,
      alerts: healthChecks.failedChecks.map(check => ({
        id: `health_${check.name}`,
        title: `Health Check Failed: ${check.name}`,
        message: check.message,
        severity: check.status === 'fail' ? 'critical' : 'warning' as AlertSeverity,
        category: 'system' as PerformanceMetricCategory,
        metric: check.name,
        value: check.value || 0,
        threshold: check.threshold || 0,
        timestamp: timestamp,
        acknowledged: false,
        recommendations: [check.recommendation]
      })),
      recommendations: recommendations,
      trends: []
    };
  }

  /**
   * Generate custom report
   */
  private async generateCustomReport(
    data: any,
    reportId: string,
    timestamp: Date,
    sections: ReportSection[]
  ): Promise<PerformanceReport> {
    // Custom report generation based on provided sections
    const stats = this.calculateStatistics(data.metrics, data.alerts);

    return {
      id: reportId,
      timestamp,
      timeRange: data.timeRange,
      summary: {
        overallScore: stats.averageHealthScore,
        overallHealth: this.getHealthStatusFromScore(stats.averageHealthScore),
        totalMetrics: stats.totalMetrics,
        criticalIssues: stats.criticalIssues,
        warnings: stats.warnings,
        improvements: 0
      },
      systemMetrics: data.systemMetrics,
      transcriptionMetrics: data.transcriptionMetrics,
      databaseMetrics: data.databaseMetrics,
      mobileMetrics: data.mobileMetrics,
      alerts: data.alerts,
      recommendations: [],
      trends: []
    };
  }

  /**
   * Calculate statistics from metrics and alerts
   */
  private calculateStatistics(metrics: PerformanceMetric[], alerts: PerformanceAlert[]) {
    const totalMetrics = metrics.length;
    const healthScores = metrics.map(m => this.getHealthScore(m.status));
    const averageHealthScore = healthScores.length > 0
      ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length
      : 100;

    const criticalIssues = alerts.filter(a => a.severity === 'critical').length;
    const warnings = alerts.filter(a => a.severity === 'warning' || a.severity === 'error').length;
    const activeAlerts = alerts.filter(a => !a.acknowledged && !a.resolvedAt).length;

    return {
      totalMetrics,
      averageHealthScore: Math.round(averageHealthScore),
      criticalIssues,
      warnings,
      activeAlerts
    };
  }

  /**
   * Generate recommendations based on metrics and alerts
   */
  private generateRecommendations(metrics: PerformanceMetric[], alerts: PerformanceAlert[]) {
    const recommendations = [];

    // Memory recommendations
    const memoryMetrics = metrics.filter(m => m.category === 'memory');
    const avgMemoryUsage = memoryMetrics.length > 0
      ? memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length
      : 0;

    if (avgMemoryUsage > 80) {
      recommendations.push({
        id: 'memory_optimization',
        title: 'Optimize Memory Usage',
        description: 'High memory usage detected. Consider implementing memory optimization strategies.',
        category: 'memory' as PerformanceMetricCategory,
        priority: 'high' as const,
        impact: 'high' as const,
        effort: 'medium' as const,
        estimatedImprovement: '20-30% memory reduction',
        actions: [
          {
            label: 'Clear unused caches',
            description: 'Remove unnecessary cached data',
            action: async () => {},
            automated: true
          }
        ],
        tags: ['memory', 'optimization', 'performance']
      });
    }

    // Performance recommendations
    const poorMetrics = metrics.filter(m => m.status === 'poor' || m.status === 'critical');
    if (poorMetrics.length > 0) {
      recommendations.push({
        id: 'performance_optimization',
        title: 'Address Performance Issues',
        description: `${poorMetrics.length} metrics are showing poor performance.`,
        category: 'system' as PerformanceMetricCategory,
        priority: 'high' as const,
        impact: 'high' as const,
        effort: 'medium' as const,
        estimatedImprovement: '15-25% performance improvement',
        actions: [],
        tags: ['performance', 'optimization']
      });
    }

    return recommendations;
  }

  /**
   * Calculate trends from metrics
   */
  private calculateTrends(metrics: PerformanceMetric[]) {
    // Group metrics by name and calculate trends
    const groupedMetrics = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    return Object.entries(groupedMetrics).map(([name, metricList]) => {
      if (metricList.length < 2) {
        return {
          metric: name,
          category: metricList[0]?.category || 'system',
          direction: 'stable' as const,
          confidence: 0,
          changeRate: 0,
          prediction: {
            nextHour: metricList[0]?.value || 0,
            nextDay: metricList[0]?.value || 0,
            nextWeek: metricList[0]?.value || 0
          },
          anomalies: []
        };
      }

      // Simple trend calculation
      const recentValues = metricList.slice(-10).map(m => m.value);
      const olderValues = metricList.slice(-20, -10).map(m => m.value);

      const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
      const olderAvg = olderValues.length > 0
        ? olderValues.reduce((a, b) => a + b, 0) / olderValues.length
        : recentAvg;

      const changeRate = ((recentAvg - olderAvg) / olderAvg) * 100;
      const direction = changeRate > 5 ? 'improving' as const :
                       changeRate < -5 ? 'degrading' as const : 'stable' as const;

      return {
        metric: name,
        category: metricList[0]?.category || 'system',
        direction,
        confidence: Math.min(1, metricList.length / 10),
        changeRate,
        prediction: {
          nextHour: recentAvg * (1 + changeRate / 100),
          nextDay: recentAvg * (1 + changeRate / 50),
          nextWeek: recentAvg * (1 + changeRate / 20)
        },
        anomalies: []
      };
    });
  }

  /**
   * Perform health checks
   */
  private performHealthChecks(data: any) {
    const checks = [
      {
        name: 'Memory Usage',
        status: data.systemMetrics?.memory?.usagePercentage < 80 ? 'pass' : 'fail',
        message: data.systemMetrics?.memory?.usagePercentage < 80
          ? 'Memory usage is within acceptable limits'
          : `Memory usage is high: ${data.systemMetrics?.memory?.usagePercentage?.toFixed(1)}%`,
        value: data.systemMetrics?.memory?.usagePercentage || 0,
        threshold: 80,
        recommendation: 'Consider memory optimization techniques or increasing available memory'
      },
      {
        name: 'CPU Usage',
        status: data.systemMetrics?.cpu?.usage < 80 ? 'pass' : 'fail',
        message: data.systemMetrics?.cpu?.usage < 80
          ? 'CPU usage is within acceptable limits'
          : `CPU usage is high: ${data.systemMetrics?.cpu?.usage?.toFixed(1)}%`,
        value: data.systemMetrics?.cpu?.usage || 0,
        threshold: 80,
        recommendation: 'Optimize CPU-intensive operations or consider scaling resources'
      },
      {
        name: 'Network Latency',
        status: data.systemMetrics?.network?.latency < 200 ? 'pass' : 'warn',
        message: data.systemMetrics?.network?.latency < 200
          ? 'Network latency is acceptable'
          : `Network latency is elevated: ${data.systemMetrics?.network?.latency}ms`,
        value: data.systemMetrics?.network?.latency || 0,
        threshold: 200,
        recommendation: 'Check network connectivity and optimize network requests'
      }
    ];

    const passedCount = checks.filter(c => c.status === 'pass').length;
    const failedCount = checks.filter(c => c.status === 'fail').length;
    const warningCount = checks.filter(c => c.status === 'warn').length;
    const overallScore = Math.round((passedCount / checks.length) * 100);

    return {
      overallScore,
      passedCount,
      failedCount,
      warningCount,
      checks,
      failedChecks: checks.filter(c => c.status !== 'pass')
    };
  }

  /**
   * Schedule a report
   */
  async scheduleReport(report: ScheduledReport): Promise<void> {
    this.scheduledReports.set(report.id, report);

    // Set up scheduling logic
    if (report.enabled) {
      this.scheduleReportExecution(report);
    }
  }

  /**
   * Schedule report execution
   */
  private scheduleReportExecution(report: ScheduledReport): void {
    const now = new Date();
    let nextExecution = new Date(report.nextSend || now);

    // Calculate next execution time based on schedule
    switch (report.schedule) {
      case 'hourly':
        nextExecution.setHours(nextExecution.getHours() + 1);
        break;
      case 'daily':
        nextExecution.setDate(nextExecution.getDate() + 1);
        break;
      case 'weekly':
        nextExecution.setDate(nextExecution.getDate() + 7);
        break;
      case 'monthly':
        nextExecution.setMonth(nextExecution.getMonth() + 1);
        break;
    }

    const delay = nextExecution.getTime() - now.getTime();

    setTimeout(() => {
      this.executeScheduledReport(report);
    }, delay);
  }

  /**
   * Execute scheduled report
   */
  private async executeScheduledReport(report: ScheduledReport): Promise<void> {
    try {
      // Generate report
      const reportData = await this.generateReport('executive_summary', {
        metrics: [], // Would be fetched from actual data
        alerts: [],
        systemMetrics: {} as SystemPerformanceMetrics,
        transcriptionMetrics: {} as TranscriptionPerformanceMetrics,
        databaseMetrics: {} as DatabasePerformanceMetrics,
        mobileMetrics: {} as MobilePerformanceMetrics,
        timeRange: 3600000
      });

      // Send to recipients
      await this.sendReportToRecipients(report, reportData);

      // Update last sent time
      report.lastSent = new Date();
      this.scheduleReportExecution(report); // Schedule next execution

    } catch (error) {
      console.error('Failed to execute scheduled report:', error);
    }
  }

  /**
   * Send report to recipients
   */
  private async sendReportToRecipients(report: ScheduledReport, reportData: PerformanceReport): Promise<void> {
    // Implementation would depend on notification system
    console.log(`Sending report ${report.id} to recipients:`, report.recipients);
  }

  /**
   * Queue report generation
   */
  queueReport(
    template: ReportTemplate,
    options: ExportOptions,
    callback?: (report: any) => void
  ): string {
    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.reportQueue.push({
      id: queueId,
      type: template,
      options,
      timestamp: new Date(),
      callback
    });

    this.processQueue();
    return queueId;
  }

  /**
   * Process report queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.reportQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.reportQueue.length > 0) {
      const job = this.reportQueue.shift()!;

      try {
        // Generate report (this is a simplified implementation)
        const report = await this.generateReport(job.type, {
          metrics: [],
          alerts: [],
          systemMetrics: {} as SystemPerformanceMetrics,
          transcriptionMetrics: {} as TranscriptionPerformanceMetrics,
          databaseMetrics: {} as DatabasePerformanceMetrics,
          mobileMetrics: {} as MobilePerformanceMetrics,
          timeRange: job.options.timeRange || 3600000
        });

        if (job.callback) {
          job.callback(report);
        }
      } catch (error) {
        console.error('Failed to generate queued report:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get health score from status
   */
  private getHealthScore(status: string): number {
    switch (status) {
      case 'excellent': return 100;
      case 'good': return 80;
      case 'fair': return 60;
      case 'poor': return 40;
      case 'critical': return 20;
      default: return 50;
    }
  }

  /**
   * Get health status from score
   */
  private getHealthStatusFromScore(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  /**
   * Calculate trend score
   */
  private calculateTrendScore(trends: any[]): number {
    if (trends.length === 0) return 50;

    const improvingCount = trends.filter(t => t.direction === 'improving').length;
    const degradingCount = trends.filter(t => t.direction === 'degrading').length;

    return Math.round(((improvingCount - degradingCount) / trends.length + 1) * 50);
  }

  /**
   * Generate trend-based recommendations
   */
  private generateTrendBasedRecommendations(trends: any[]) {
    return trends
      .filter(t => t.direction === 'degrading' && t.confidence > 0.5)
      .map(trend => ({
        id: `trend_${trend.metric}`,
        title: `Address ${trend.metric} Degradation`,
        description: `${trend.metric} is showing a declining trend with ${Math.round(trend.confidence * 100)}% confidence.`,
        category: trend.category,
        priority: 'medium' as const,
        impact: 'medium' as const,
        effort: 'medium' as const,
        estimatedImprovement: `${Math.abs(trend.changeRate).toFixed(1)}% improvement`,
        actions: [],
        tags: ['trend', 'optimization']
      }));
  }

  /**
   * Generate health-based recommendations
   */
  private generateHealthBasedRecommendations(healthChecks: any) {
    return healthChecks.failedChecks.map((check: any) => ({
      id: `health_${check.name}`,
      title: `Fix ${check.name} Issue`,
      description: check.message,
      category: 'system' as PerformanceMetricCategory,
      priority: check.status === 'fail' ? 'high' as const : 'medium' as const,
      impact: 'high' as const,
      effort: 'medium' as const,
      estimatedImprovement: 'Improved system stability',
      actions: [
        {
          label: 'Apply Fix',
          description: check.recommendation,
          action: async () => {},
          automated: false
        }
      ],
      tags: ['health', 'stability']
    }));
  }

  /**
   * Initialize scheduled reports from storage
   */
  private initializeScheduledReports(): void {
    // Load scheduled reports from storage or configuration
    // This would typically load from a database or configuration file
  }
}

// Export singleton instance
export const exportReportingManager = ExportReportingManager.getInstance();

// React hook for using export/reporting functionality
export const useExportReporting = () => {
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(0);
  const [scheduledReports, setScheduledReports] = React.useState<ScheduledReport[]>([]);

  const exportData = React.useCallback(async (
    data: any,
    format: ExportFormat = 'json',
    options?: Partial<ExportOptions>
  ): Promise<Blob> => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const blob = await exportReportingManager.exportData(data, format, options);
      setExportProgress(100);
      return blob;
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, []);

  const generateReport = React.useCallback(async (
    template: ReportTemplate,
    data: any,
    customSections?: ReportSection[]
  ): Promise<PerformanceReport> => {
    return exportReportingManager.generateReport(template, data, customSections);
  }, []);

  const scheduleReport = React.useCallback(async (report: ScheduledReport): Promise<void> => {
    await exportReportingManager.scheduleReport(report);
    // Update local state
    setScheduledReports(prev => [...prev.filter(r => r.id !== report.id), report]);
  }, []);

  return {
    exportData,
    generateReport,
    scheduleReport,
    isExporting,
    exportProgress,
    scheduledReports
  };
};

export default ExportReportingManager;
