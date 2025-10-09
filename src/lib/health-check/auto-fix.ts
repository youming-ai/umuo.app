/**
 * Auto-fix suggestions for health check issues
 * Provides actionable recommendations and automated fixes for common problems
 */

import { HealthCheckReport, CheckCategory, CheckStatus } from './types';
import { enhancedGroqClient } from './enhanced-groq-client';

export interface AutoFixIssue {
  id: string;
  category: CheckCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  errorCode?: string;
  errorMessage?: string;
  canAutoFix: boolean;
  autoFixAction?: AutoFixAction;
  manualSteps: string[];
  preventionTips: string[];
  estimatedTimeToFix: number; // in minutes
  requiredPermissions: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AutoFixAction {
  type: 'api_call' | 'config_change' | 'cache_clear' | 'service_restart' | 'dependency_update';
  description: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  headers?: Record<string, string>;
  successMessage: string;
  failureMessage: string;
  rollbackAction?: AutoFixAction;
}

export interface AutoFixResult {
  issueId: string;
  success: boolean;
  message: string;
  actionTaken?: string;
  timestamp: Date;
  requiresManualIntervention: boolean;
  nextSteps?: string[];
}

export class AutoFixEngine {
  private issues: AutoFixIssue[] = [];
  private results: AutoFixResult[] = [];

  constructor() {
    this.initializeCommonIssues();
  }

  /**
   * Analyze health check report and identify fixable issues
   */
  analyzeReport(report: HealthCheckReport): AutoFixIssue[] {
    const issues: AutoFixIssue[] = [];

    // Analyze each check result
    report.results.forEach(result => {
      if (result.status !== 'pass') {
        const categoryIssues = this.identifyIssuesForResult(result);
        issues.push(...categoryIssues);
      }
    });

    // Add overall system issues
    const systemIssues = this.identifySystemIssues(report);
    issues.push(...systemIssues);

    // Sort by severity and priority
    return issues.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Get auto-fix suggestions for specific issues
   */
  getAutoFixSuggestions(issues: AutoFixIssue[]): AutoFixIssue[] {
    return issues.filter(issue => issue.canAutoFix || issue.manualSteps.length > 0);
  }

  /**
   * Execute auto-fix for a specific issue
   */
  async executeAutoFix(issue: AutoFixIssue): Promise<AutoFixResult> {
    if (!issue.canAutoFix || !issue.autoFixAction) {
      return {
        issueId: issue.id,
        success: false,
        message: 'This issue cannot be automatically fixed',
        timestamp: new Date(),
        requiresManualIntervention: true,
        nextSteps: issue.manualSteps,
      };
    }

    try {
      const result = await this.executeAction(issue.autoFixAction);

      const autoFixResult: AutoFixResult = {
        issueId: issue.id,
        success: result.success,
        message: result.success ? issue.autoFixAction!.successMessage : issue.autoFixAction!.failureMessage,
        actionTaken: issue.autoFixAction.description,
        timestamp: new Date(),
        requiresManualIntervention: !result.success,
        nextSteps: result.success ? [] : issue.manualSteps,
      };

      this.results.push(autoFixResult);
      return autoFixResult;

    } catch (error) {
      const errorResult: AutoFixResult = {
        issueId: issue.id,
        success: false,
        message: `Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        requiresManualIntervention: true,
        nextSteps: issue.manualSteps,
      };

      this.results.push(errorResult);
      return errorResult;
    }
  }

  /**
   * Get fix results history
   */
  getFixResults(): AutoFixResult[] {
    return this.results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get prevention recommendations based on historical issues
   */
  getPreventionRecommendations(reports: HealthCheckReport[]): AutoFixIssue[] {
    const allIssues = reports.flatMap(report => this.analyzeReport(report));
    const recurringIssues = this.identifyRecurringIssues(allIssues);

    return recurringIssues.map(issue => ({
      ...issue,
      title: `Prevention: ${issue.title}`,
      description: `This issue has occurred multiple times. Consider implementing preventive measures.`,
      canAutoFix: false,
      manualSteps: [
        ...issue.manualSteps,
        'Schedule regular health checks',
        'Set up monitoring alerts',
        'Document and review system changes',
      ],
    }));
  }

  private identifyIssuesForResult(result: any): AutoFixIssue[] {
    const issues: AutoFixIssue[] = [];

    switch (result.category) {
      case CheckCategory.API_CONNECTIVITY:
        issues.push(...this.identifyAPIConnectivityIssues(result));
        break;
      case CheckCategory.ERROR_HANDLING:
        issues.push(...this.identifyErrorHandlingIssues(result));
        break;
      case CheckCategory.PERFORMANCE:
        issues.push(...this.identifyPerformanceIssues(result));
        break;
      case CheckCategory.USER_EXPERIENCE:
        issues.push(...this.identifyUserExperienceIssues(result));
        break;
      case CheckCategory.SECURITY:
        issues.push(...this.identifySecurityIssues(result));
        break;
    }

    return issues;
  }

  private identifyAPIConnectivityIssues(result: any): AutoFixIssue[] {
    const issues: AutoFixIssue[] = [];

    if (result.error?.type === 'network') {
      issues.push({
        id: `network-${Date.now()}`,
        category: CheckCategory.API_CONNECTIVITY,
        severity: 'high',
        title: 'Network Connectivity Issue',
        description: 'Unable to connect to external API services',
        errorCode: result.error.code,
        errorMessage: result.error.message,
        canAutoFix: true,
        autoFixAction: {
          type: 'api_call',
          description: 'Test network connectivity and retry connection',
          endpoint: '/api/health-check/test/network',
          method: 'POST',
          successMessage: 'Network connectivity restored',
          failureMessage: 'Network connectivity test failed',
        },
        manualSteps: [
          'Check internet connection',
          'Verify firewall settings',
          'Check DNS configuration',
          'Contact network administrator',
        ],
        preventionTips: [
          'Monitor network latency',
          'Set up redundant connections',
          'Implement connection pooling',
        ],
        estimatedTimeToFix: 5,
        requiredPermissions: ['network'],
        riskLevel: 'low',
      });
    }

    if (result.error?.type === 'authentication') {
      issues.push({
        id: `auth-${Date.now()}`,
        category: CheckCategory.API_CONNECTIVITY,
        severity: 'critical',
        title: 'API Authentication Failed',
        description: 'Invalid or expired API credentials',
        errorCode: result.error.code,
        errorMessage: result.error.message,
        canAutoFix: true,
        autoFixAction: {
          type: 'config_change',
          description: 'Refresh API authentication tokens',
          endpoint: '/api/health-check/refresh-auth',
          method: 'POST',
          successMessage: 'API authentication refreshed successfully',
          failureMessage: 'Failed to refresh authentication',
        },
        manualSteps: [
          'Verify API key validity',
          'Check subscription status',
          'Update API credentials',
          'Review usage quotas',
        ],
        preventionTips: [
          'Set up API key rotation',
          'Monitor usage quotas',
          'Implement token refresh mechanism',
        ],
        estimatedTimeToFix: 10,
        requiredPermissions: ['api_keys'],
        riskLevel: 'medium',
      });
    }

    return issues;
  }

  private identifyErrorHandlingIssues(result: any): AutoFixIssue[] {
    const issues: AutoFixIssue[] = [];

    if (result.error?.type === 'timeout') {
      issues.push({
        id: `timeout-${Date.now()}`,
        category: CheckCategory.ERROR_HANDLING,
        severity: 'medium',
        title: 'Request Timeout',
        description: 'API requests are timing out',
        canAutoFix: true,
        autoFixAction: {
          type: 'config_change',
          description: 'Increase timeout settings',
          endpoint: '/api/health-check/config',
          method: 'PUT',
          payload: { timeout: 60000 },
          successMessage: 'Timeout settings updated',
          failureMessage: 'Failed to update timeout settings',
        },
        manualSteps: [
          'Check API response times',
          'Optimize request payloads',
          'Review network conditions',
        ],
        preventionTips: [
          'Implement request retries',
          'Add timeout monitoring',
          'Optimize API calls',
        ],
        estimatedTimeToFix: 3,
        requiredPermissions: ['config'],
        riskLevel: 'low',
      });
    }

    return issues;
  }

  private identifyPerformanceIssues(result: any): AutoFixIssue[] {
    const issues: AutoFixIssue[] = [];

    if (result.metrics?.responseTime > 5000) {
      issues.push({
        id: `performance-${Date.now()}`,
        category: CheckCategory.PERFORMANCE,
        severity: 'medium',
        title: 'Slow Response Time',
        description: `API response time is ${result.metrics.responseTime}ms`,
        canAutoFix: true,
        autoFixAction: {
          type: 'cache_clear',
          description: 'Clear performance cache and optimize',
          endpoint: '/api/health-check/cache/clear',
          method: 'POST',
          successMessage: 'Performance cache cleared',
          failureMessage: 'Failed to clear cache',
        },
        manualSteps: [
          'Check server load',
          'Review database performance',
          'Optimize queries',
        ],
        preventionTips: [
          'Monitor response times',
          'Implement caching strategies',
          'Regular performance audits',
        ],
        estimatedTimeToFix: 5,
        requiredPermissions: ['cache'],
        riskLevel: 'low',
      });
    }

    return issues;
  }

  private identifyUserExperienceIssues(result: any): AutoFixIssue[] {
    const issues: AutoFixIssue[] = [];

    if (result.error?.type === 'format-unsupported') {
      issues.push({
        id: `format-${Date.now()}`,
        category: CheckCategory.USER_EXPERIENCE,
        severity: 'medium',
        title: 'Unsupported File Format',
        description: 'Audio format is not supported',
        canAutoFix: true,
        autoFixAction: {
          type: 'api_call',
          description: 'Convert file to supported format',
          endpoint: '/api/health-check/convert-format',
          method: 'POST',
          successMessage: 'File format converted',
          failureMessage: 'Format conversion failed',
        },
        manualSteps: [
          'Check supported file formats',
          'Convert file manually',
          'Use different audio file',
        ],
        preventionTips: [
          'Validate file formats before upload',
          'Provide format conversion options',
          'Display supported formats clearly',
        ],
        estimatedTimeToFix: 2,
        requiredPermissions: ['file_conversion'],
        riskLevel: 'low',
      });
    }

    return issues;
  }

  private identifySecurityIssues(result: any): AutoFixIssue[] {
    const issues: AutoFixIssue[] = [];

    if (result.error?.type === 'quota-exceeded') {
      issues.push({
        id: `quota-${Date.now()}`,
        category: CheckCategory.SECURITY,
        severity: 'high',
        title: 'API Quota Exceeded',
        description: 'API usage quota has been exceeded',
        canAutoFix: false, // Requires payment/upgrade
        manualSteps: [
          'Check current usage',
          'Upgrade subscription plan',
          'Wait for quota reset',
          'Review usage patterns',
        ],
        preventionTips: [
          'Monitor usage quotas',
          'Implement usage alerts',
          'Optimize API calls',
          'Set up automatic scaling',
        ],
        estimatedTimeToFix: 30,
        requiredPermissions: ['billing'],
        riskLevel: 'medium',
      });
    }

    return issues;
  }

  private identifySystemIssues(report: HealthCheckReport): AutoFixIssue[] {
    const issues: AutoFixIssue[] = [];

    if (report.summary.score < 60) {
      issues.push({
        id: `system-health-${Date.now()}`,
        category: CheckCategory.PERFORMANCE,
        severity: 'high',
        title: 'Overall System Health Low',
        description: `System health score is ${report.summary.score}`,
        canAutoFix: true,
        autoFixAction: {
          type: 'service_restart',
          description: 'Restart health check service',
          endpoint: '/api/health-check/restart',
          method: 'POST',
          successMessage: 'Health check service restarted',
          failureMessage: 'Failed to restart service',
        },
        manualSteps: [
          'Review all failed checks',
          'Check system resources',
          'Review recent changes',
        ],
        preventionTips: [
          'Regular system monitoring',
          'Automated health checks',
          'Proactive maintenance',
        ],
        estimatedTimeToFix: 10,
        requiredPermissions: ['system'],
        riskLevel: 'medium',
      });
    }

    return issues;
  }

  private identifyRecurringIssues(allIssues: AutoFixIssue[]): AutoFixIssue[] {
    const issueCounts = new Map<string, AutoFixIssue[]>();

    allIssues.forEach(issue => {
      const key = `${issue.category}-${issue.title}`;
      if (!issueCounts.has(key)) {
        issueCounts.set(key, []);
      }
      issueCounts.get(key)!.push(issue);
    });

    return Array.from(issueCounts.entries())
      .filter(([_, issues]) => issues.length >= 3) // Issues that occurred 3+ times
      .map(([_, issues]) => issues[0]);
  }

  private async executeAction(action: AutoFixAction): Promise<{ success: boolean; message: string }> {
    try {
      let response: Response;

      switch (action.type) {
        case 'api_call':
          response = await fetch(action.endpoint!, {
            method: action.method,
            headers: {
              'Content-Type': 'application/json',
              ...action.headers,
            },
            body: action.payload ? JSON.stringify(action.payload) : undefined,
          });
          break;

        case 'config_change':
          response = await fetch(action.endpoint!, {
            method: action.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload),
          });
          break;

        case 'cache_clear':
          response = await fetch(action.endpoint!, {
            method: action.method,
          });
          break;

        case 'service_restart':
          response = await fetch(action.endpoint!, {
            method: action.method,
          });
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      if (response.ok) {
        return { success: true, message: action.successMessage };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: action.failureMessage };
      }

    } catch (error) {
      return {
        success: false,
        message: action.failureMessage
      };
    }
  }

  private initializeCommonIssues(): void {
    // Initialize with common issue patterns
    this.issues = [];
  }
}

/**
 * Hook for auto-fix functionality
 * Note: React components have been moved to separate component files
 */
export function useAutoFix() {
  // This hook should be imported from auto-fix.tsx component file
  throw new Error('useAutoFix hook has been moved to React component. Please import from auto-fix.tsx');

}
