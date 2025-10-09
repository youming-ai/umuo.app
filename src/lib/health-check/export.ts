import { HealthCheckReport, ExportFormat } from './types';
import { HealthCheckRepository } from './database';

/**
 * 导出健康检查报告
 */
export class HealthCheckExporter {
  /**
   * 导出单个报告
   */
  static async exportReport(reportId: string, format: ExportFormat): Promise<Blob> {
    const report = await HealthCheckRepository.getCheckReport(reportId);
    if (!report) {
      throw new Error(`Report with ID ${reportId} not found`);
    }

    switch (format) {
      case 'json':
        return this.exportAsJSON(report);
      case 'csv':
        return this.exportAsCSV(report);
      case 'pdf':
        return this.exportAsPDF(report);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * 导出多个报告
   */
  static async exportReports(
    reportIds: string[],
    format: ExportFormat
  ): Promise<Blob> {
    const reports = await Promise.all(
      reportIds.map(id => HealthCheckRepository.getCheckReport(id))
    );

    const validReports = reports.filter(report => report !== null) as HealthCheckReport[];

    if (validReports.length === 0) {
      throw new Error('No valid reports found for export');
    }

    switch (format) {
      case 'json':
        return this.exportMultipleAsJSON(validReports);
      case 'csv':
        return this.exportMultipleAsCSV(validReports);
      case 'pdf':
        return this.exportMultipleAsPDF(validReports);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * 导出所有报告
   */
  static async exportAllReports(format: ExportFormat): Promise<Blob> {
    const reports = await HealthCheckRepository.getCheckReports(1000); // 获取最近1000个报告

    if (reports.length === 0) {
      throw new Error('No reports found for export');
    }

    return this.exportReports(reports.map(r => r.id), format);
  }

  /**
   * 导出统计数据
   */
  static async exportStatistics(days = 30): Promise<Blob> {
    const stats = await HealthCheckRepository.getCheckResultStatistics(days);
    const reports = await HealthCheckRepository.getCheckReportsByDateRange(
      new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      new Date()
    );

    const statisticsData = {
      period: `${days} days`,
      generatedAt: new Date().toISOString(),
      summary: stats,
      reports: reports.map(report => ({
        id: report.id,
        timestamp: report.timestamp,
        score: report.summary.score,
        status: report.summary.overallStatus,
        duration: report.duration,
      })),
    };

    return new Blob([JSON.stringify(statisticsData, null, 2)], {
      type: 'application/json',
    });
  }

  /**
   * JSON格式导出
   */
  private static exportAsJSON(report: HealthCheckReport): Blob {
    const exportData = {
      exportFormat: 'single-report',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      report,
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  }

  /**
   * 多个报告JSON格式导出
   */
  private static exportMultipleAsJSON(reports: HealthCheckReport[]): Blob {
    const exportData = {
      exportFormat: 'multiple-reports',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: reports.length,
      reports,
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
  }

  /**
   * CSV格式导出
   */
  private static exportAsCSV(report: HealthCheckReport): Blob {
    const headers = [
      'Timestamp',
      'Report ID',
      'Overall Status',
      'Score',
      'Duration (ms)',
      'Total Checks',
      'Passed',
      'Failed',
      'Warnings',
      'Skipped',
    ];

    const rows = [headers.join(',')];

    // 添加报告摘要
    rows.push([
      report.timestamp.toISOString(),
      report.id,
      report.summary.overallStatus,
      report.summary.score,
      report.duration,
      report.summary.total,
      report.summary.passed,
      report.summary.failed,
      report.summary.warnings,
      report.summary.skipped,
    ].join(','));

    // 添加详细的检查结果
    rows.push(''); // 空行分隔
    rows.push('Detailed Results');
    rows.push('Category,Name,Status,Duration (ms),Message');

    report.results.forEach(result => {
      rows.push([
        `"${result.category}"`,
        `"${result.name}"`,
        result.status,
        result.duration,
        `"${result.message.replace(/"/g, '""')}"`, // 转义CSV中的引号
      ].join(','));
    });

    return new Blob([rows.join('\n')], {
      type: 'text/csv',
    });
  }

  /**
   * 多个报告CSV格式导出
   */
  private static exportMultipleAsCSV(reports: HealthCheckReport[]): Blob {
    const headers = [
      'Timestamp',
      'Report ID',
      'Overall Status',
      'Score',
      'Duration (ms)',
      'Total Checks',
      'Passed',
      'Failed',
      'Warnings',
      'Skipped',
    ];

    const rows = [headers.join(',')];

    reports.forEach(report => {
      rows.push([
        report.timestamp.toISOString(),
        report.id,
        report.summary.overallStatus,
        report.summary.score,
        report.duration,
        report.summary.total,
        report.summary.passed,
        report.summary.failed,
        report.summary.warnings,
        report.summary.skipped,
      ].join(','));
    });

    return new Blob([rows.join('\n')], {
      type: 'text/csv',
    });
  }

  /**
   * PDF格式导出（简化版本）
   */
  private static exportAsPDF(report: HealthCheckReport): Blob {
    // 这是一个简化的PDF导出实现
    // 实际项目中，建议使用专门的PDF库如jsPDF或PDFKit

    const htmlContent = this.generateReportHTML(report);

    return new Blob([htmlContent], {
      type: 'text/html',
    });
  }

  /**
   * 多个报告PDF格式导出
   */
  private static exportMultipleAsPDF(reports: HealthCheckReport[]): Blob {
    const htmlContent = this.generateMultipleReportsHTML(reports);

    return new Blob([htmlContent], {
      type: 'text/html',
    });
  }

  /**
   * 生成单个报告的HTML
   */
  private static generateReportHTML(report: HealthCheckReport): string {
    const statusColors = {
      passed: '#10b981',
      warning: '#f59e0b',
      failed: '#ef4444',
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Health Check Report - ${report.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-item { background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
        .results-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .results-table th, .results-table td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        .results-table th { background: #f3f4f6; font-weight: bold; }
        .status-passed { color: ${statusColors.passed}; }
        .status-warning { color: ${statusColors.warning}; }
        .status-failed { color: ${statusColors.failed}; }
        .issues { margin: 20px 0; }
        .issue { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 10px 0; }
        .recommendations { margin: 20px 0; }
        .recommendation { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 10px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Health Check Report</h1>
        <p><strong>Report ID:</strong> ${report.id}</p>
        <p><strong>Generated:</strong> ${report.timestamp.toLocaleString()}</p>
        <p><strong>Duration:</strong> ${Math.round(report.duration / 1000)} seconds</p>
    </div>

    <div class="summary">
        <div class="summary-item">
            <div>Overall Score</div>
            <div class="summary-value">${report.summary.score}%</div>
        </div>
        <div class="summary-item">
            <div>Total Checks</div>
            <div class="summary-value">${report.summary.total}</div>
        </div>
        <div class="summary-item">
            <div>Passed</div>
            <div class="summary-value status-passed">${report.summary.passed}</div>
        </div>
        <div class="summary-item">
            <div>Failed</div>
            <div class="summary-value status-failed">${report.summary.failed}</div>
        </div>
        <div class="summary-item">
            <div>Warnings</div>
            <div class="summary-value status-warning">${report.summary.warnings}</div>
        </div>
    </div>

    <h2>Detailed Results</h2>
    <table class="results-table">
        <thead>
            <tr>
                <th>Category</th>
                <th>Name</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Message</th>
            </tr>
        </thead>
        <tbody>
            ${report.results.map(result => `
                <tr>
                    <td>${result.category}</td>
                    <td>${result.name}</td>
                    <td class="status-${result.status}">${result.status}</td>
                    <td>${result.duration}ms</td>
                    <td>${result.message}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    ${report.issues.length > 0 ? `
    <div class="issues">
        <h2>Issues Found</h2>
        ${report.issues.map(issue => `
            <div class="issue">
                <h3>${issue.title}</h3>
                <p><strong>Category:</strong> ${issue.category}</p>
                <p><strong>Severity:</strong> ${issue.severity}</p>
                <p><strong>Description:</strong> ${issue.description}</p>
                ${issue.resolution ? `
                    <p><strong>Resolution Steps:</strong></p>
                    <ol>
                        ${issue.resolution.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                ` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation">
                <h3>${rec.title}</h3>
                <p><strong>Priority:</strong> ${rec.priority}</p>
                <p><strong>Description:</strong> ${rec.description}</p>
                <p><strong>Effort:</strong> ${rec.implementation.effort}</p>
                <p><strong>Timeframe:</strong> ${rec.implementation.timeframe}</p>
                <p><strong>Benefits:</strong></p>
                <ul>
                    ${rec.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>Generated by Oumu.ai Health Check System</p>
        <p>Environment: ${report.metadata.environment}</p>
        <p>Version: ${report.metadata.version}</p>
    </div>
</body>
</html>`;
  }

  /**
   * 生成多个报告的HTML
   */
  private static generateMultipleReportsHTML(reports: HealthCheckReport[]): string {
    const reportsHTML = reports.map(report => this.generateReportHTML(report)).join('\n<hr>\n');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Health Check Reports</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .toc { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .toc ul { list-style: none; padding: 0; }
        .toc li { margin: 5px 0; }
        .toc a { text-decoration: none; color: #2563eb; }
        .toc a:hover { text-decoration: underline; }
        .report-summary { margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>Health Check Reports</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Number of Reports:</strong> ${reports.length}</p>

    <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
            ${reports.map((report, index) => `
                <li><a href="#report-${index}">${report.timestamp.toLocaleString()} - Score: ${report.summary.score}%</a></li>
            `).join('')}
        </ul>
    </div>

    <div class="report-summary">
        <h2>Summary</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="border: 1px solid #e5e7eb; padding: 8px;">Date</th>
                    <th style="border: 1px solid #e5e7eb; padding: 8px;">Score</th>
                    <th style="border: 1px solid #e5e7eb; padding: 8px;">Status</th>
                    <th style="border: 1px solid #e5e7eb; padding: 8px;">Duration</th>
                </tr>
            </thead>
            <tbody>
                ${reports.map(report => `
                    <tr>
                        <td style="border: 1px solid #e5e7eb; padding: 8px;">${report.timestamp.toLocaleDateString()}</td>
                        <td style="border: 1px solid #e5e7eb; padding: 8px;">${report.summary.score}%</td>
                        <td style="border: 1px solid #e5e7eb; padding: 8px;">${report.summary.overallStatus}</td>
                        <td style="border: 1px solid #e5e7eb; padding: 8px;">${Math.round(report.duration / 1000)}s</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${reports.map((report, index) => `
        <div id="report-${index}">
            ${this.generateReportHTML(report)}
        </div>
    `).join('\n<hr>\n')}
</body>
</html>`;
  }

  /**
   * 下载文件
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 生成文件名
   */
  static generateFilename(reportId: string, format: ExportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `health-check-${reportId}-${timestamp}.${format}`;
  }

  /**
   * 生成多个报告的文件名
   */
  static generateMultipleFilename(format: ExportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `health-check-reports-${timestamp}.${format}`;
  }
}

// Re-export ExportFormat for convenience
export type { ExportFormat } from './types';