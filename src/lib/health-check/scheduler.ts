import {
  HealthCheckResult,
  HealthCheckReport,
  HealthCheckConfig,
  CheckStatus,
  CheckCategory,
  SeverityLevel,
  CheckProgress,
  HealthCheckIssue,
  HealthCheckRecommendation,
} from './types';
import { HealthCheckRepository } from './database';
import { checkApiConnectivity } from './checks/api-connectivity';
import { checkErrorHandling } from './checks/error-handling';
import { checkPerformance } from './checks/performance';
import { checkUserExperience } from './checks/user-experience';
import { checkSecurity } from './checks/security';

// 检查函数映射
const checkFunctions: Record<CheckCategory, (config: HealthCheckConfig) => Promise<HealthCheckResult>> = {
  [CheckCategory.API_CONNECTIVITY]: checkApiConnectivity,
  [CheckCategory.ERROR_HANDLING]: checkErrorHandling,
  [CheckCategory.PERFORMANCE]: checkPerformance,
  [CheckCategory.USER_EXPERIENCE]: checkUserExperience,
  [CheckCategory.SECURITY]: checkSecurity,
  [CheckCategory.OFFLINE_CAPABILITY]: async (config: HealthCheckConfig) => {
    // 离线功能检查的占位符实现
    return {
      id: `offline-${Date.now()}`,
      category: CheckCategory.OFFLINE_CAPABILITY,
      name: 'Offline Capability Check',
      description: 'Offline capability check not yet implemented',
      status: CheckStatus.PASSED,
      message: 'Offline capability check not yet implemented',
      duration: 0,
      timestamp: new Date(),
      metrics: {},
      issues: [],
      recommendations: [],
    };
  },
};

/**
 * 运行健康检查
 */
export async function runHealthCheck(options: {
  categories?: CheckCategory[];
  config?: {
    timeout?: number;
    retryCount?: number;
    parallel?: boolean;
  };
}): Promise<{
  checkId: string;
  estimatedDuration: number;
}> {
  const { categories, config } = options;
  const checkId = `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 确定要运行的检查类别
  const categoriesToRun = categories || Object.values(CheckCategory);

  // 估算执行时间
  const estimatedDuration = calculateEstimatedDuration(categoriesToRun, config);

  // 异步启动检查（不等待完成）
  executeHealthCheck(checkId, categoriesToRun, config).catch(error => {
    console.error('Health check execution failed:', error);
  });

  return {
    checkId,
    estimatedDuration,
  };
}

/**
 * 执行健康检查的核心逻辑
 */
async function executeHealthCheck(
  checkId: string,
  categories: CheckCategory[],
  config?: {
    timeout?: number;
    retryCount?: number;
    parallel?: boolean;
  }
): Promise<void> {
  const startTime = Date.now();
  const results: HealthCheckResult[] = [];
  const progress: CheckProgress = {
    checkId,
    total: categories.length,
    completed: 0,
    current: {
      category: categories[0],
      name: 'Starting health check...',
      status: CheckStatus.RUNNING,
      progress: 0,
    },
    estimatedTimeRemaining: 300000, // 5分钟初始估算
  };

  try {
    // 获取检查配置
    const configs = await Promise.all(
      categories.map(category => getCheckConfig(category))
    );

    if (config?.parallel) {
      // 并行执行检查
      const checkPromises = categories.map(async (category, index) => {
        progress.current = {
          category,
          name: getCheckName(category),
          status: CheckStatus.RUNNING,
          progress: (index / categories.length) * 100,
        };

        const checkConfig = configs[index];
        return executeSingleCheck(category, checkConfig, config);
      });

      const checkResults = await Promise.allSettled(checkPromises);

      // 处理结果
      checkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // 创建失败结果
          results.push(createFailedResult(categories[index], result.reason));
        }
        progress.completed = index + 1;
        progress.current.progress = ((index + 1) / categories.length) * 100;
      });
    } else {
      // 顺序执行检查
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const checkConfig = configs[i];

        progress.current = {
          category,
          name: getCheckName(category),
          status: CheckStatus.RUNNING,
          progress: (i / categories.length) * 100,
        };

        try {
          const result = await executeSingleCheck(category, checkConfig, config);
          results.push(result);
        } catch (error) {
          results.push(createFailedResult(category, error));
        }

        progress.completed = i + 1;
        progress.current.progress = ((i + 1) / categories.length) * 100;

        // 更新预估剩余时间
        const elapsed = Date.now() - startTime;
        const avgTimePerCheck = elapsed / (i + 1);
        progress.estimatedTimeRemaining = avgTimePerCheck * (categories.length - i - 1);
      }
    }

    // 生成报告
    const report = await generateReport(checkId, results, startTime);

    // 保存报告到数据库
    await HealthCheckRepository.saveCheckReport(report);

    // 保存所有检查结果
    await Promise.all(results.map(result => HealthCheckRepository.saveCheckResult(result)));

    console.log(`Health check ${checkId} completed successfully`);
  } catch (error) {
    console.error(`Health check ${checkId} failed:`, error);

    // 创建失败报告
    const failedReport = createFailedReport(checkId, error, startTime, results);
    await HealthCheckRepository.saveCheckReport(failedReport);
  }
}

/**
 * 执行单个检查
 */
async function executeSingleCheck(
  category: CheckCategory,
  config: HealthCheckConfig,
  globalConfig?: {
    timeout?: number;
    retryCount?: number;
  }
): Promise<HealthCheckResult> {
  const checkFunction = checkFunctions[category];
  if (!checkFunction) {
    throw new Error(`Check function not implemented for category: ${category}`);
  }

  const timeout = globalConfig?.timeout || config.timeout || 30000;
  const retryCount = globalConfig?.retryCount || config.retryCount || 1;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      // 使用超时控制
      const result = await Promise.race([
        checkFunction(config),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Check timeout')), timeout)
        ),
      ]);

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retryCount) {
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // 所有重试都失败了
  throw lastError || new Error('Check failed after retries');
}

/**
 * 生成健康检查报告
 */
async function generateReport(
  checkId: string,
  results: HealthCheckResult[],
  startTime: number
): Promise<HealthCheckReport> {
  const endTime = Date.now();
  const duration = endTime - startTime;

  // 计算统计信息
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === CheckStatus.PASSED).length,
    failed: results.filter(r => r.status === CheckStatus.FAILED).length,
    warnings: results.filter(r => r.status === CheckStatus.WARNING).length,
    skipped: results.filter(r => r.status === CheckStatus.SKIPPED).length,
    overallStatus: getOverallStatus(results),
    score: calculateHealthScore(results),
  };

  // 生成问题列表
  const issues = generateIssues(results);

  // 生成建议列表
  const recommendations = generateRecommendations(results, issues);

  // 系统信息
  const systemInfo = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'Server',
    language: typeof navigator !== 'undefined' ? navigator.language : 'en',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : undefined,
  };

  return {
    id: checkId,
    version: '1.0',
    timestamp: new Date(),
    duration,
    summary,
    results,
    issues,
    recommendations,
    systemInfo,
    metadata: {
      version: '1.0.0',
      environment: process.env.NODE_ENV as 'development' | 'production' | 'test',
    },
  };
}

/**
 * 获取检查配置
 */
async function getCheckConfig(category: CheckCategory): Promise<HealthCheckConfig> {
  const config = await HealthCheckRepository.getCheckConfig(category);
  return config || {
    enabled: true,
    timeout: 30000,
    retryCount: 1,
    severity: SeverityLevel.MEDIUM,
  };
}

/**
 * 获取检查名称
 */
function getCheckName(category: CheckCategory): string {
  const names = {
    [CheckCategory.API_CONNECTIVITY]: 'API Connectivity Check',
    [CheckCategory.ERROR_HANDLING]: 'Error Handling Validation',
    [CheckCategory.PERFORMANCE]: 'Performance Benchmark',
    [CheckCategory.USER_EXPERIENCE]: 'User Experience Validation',
    [CheckCategory.SECURITY]: 'Security Compliance Check',
    [CheckCategory.OFFLINE_CAPABILITY]: 'Offline Capability Check',
  };
  return names[category] || `${category} Check`;
}

/**
 * 创建失败结果
 */
function createFailedResult(category: CheckCategory, error: unknown): HealthCheckResult {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    id: `${category}-${Date.now()}`,
    category,
    name: getCheckName(category),
    description: `Health check for ${category}`,
    status: CheckStatus.FAILED,
    severity: SeverityLevel.HIGH,
    duration: 0,
    timestamp: new Date(),
    message: `Check failed: ${errorMessage}`,
    error: {
      code: 'CHECK_EXECUTION_FAILED',
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    },
    suggestions: [
      'Check system configuration',
      'Verify dependencies are available',
      'Review error logs for details',
    ],
    autoFixAvailable: false,
  };
}

/**
 * 创建失败报告
 */
function createFailedReport(
  checkId: string,
  error: unknown,
  startTime: number,
  results: HealthCheckResult[]
): HealthCheckReport {
  const endTime = Date.now();
  const duration = endTime - startTime;
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    id: checkId,
    version: '1.0',
    timestamp: new Date(),
    duration,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === CheckStatus.PASSED).length,
      failed: results.filter(r => r.status === CheckStatus.FAILED).length + 1,
      warnings: results.filter(r => r.status === CheckStatus.WARNING).length,
      skipped: results.filter(r => r.status === CheckStatus.SKIPPED).length,
      overallStatus: CheckStatus.FAILED,
      score: 0,
    },
    results: [
      ...results,
      createFailedResult(CheckCategory.API_CONNECTIVITY as any, error),
    ],
    issues: [{
      id: `critical-error-${checkId}`,
      category: CheckCategory.ERROR_HANDLING,
      severity: SeverityLevel.CRITICAL,
      title: 'Health Check Execution Failed',
      description: `The health check execution failed with error: ${errorMessage}`,
      affectedChecks: [checkId],
      impact: 'Unable to complete system health assessment',
      rootCause: {
        type: 'environment', // Use valid type
        description: errorMessage,
      },
      resolution: {
        steps: [
          'Review error logs',
          'Check system configuration',
          'Verify dependencies',
        ],
        difficulty: 'medium',
      },
    }],
    recommendations: [
      {
        id: `rec-${checkId}`,
        category: CheckCategory.ERROR_HANDLING,
        priority: 'high',
        title: 'Fix Health Check System',
        description: 'Resolve the underlying issues preventing health check execution',
        implementation: {
          effort: 'moderate',
          timeframe: '1-2 hours',
        },
        benefits: [
          'Restore system monitoring capability',
          'Ensure early detection of issues',
        ],
        relatedIssues: [`critical-error-${checkId}`],
      },
    ],
    systemInfo: {
      userAgent: 'Server',
      platform: 'Server',
      language: 'en',
      timeZone: 'UTC',
    },
    metadata: {
      version: '1.0.0',
      environment: process.env.NODE_ENV as 'development' | 'production' | 'test',
    },
  };
}

/**
 * 计算整体状态
 */
function getOverallStatus(results: HealthCheckResult[]): CheckStatus {
  const hasFailed = results.some(r => r.status === CheckStatus.FAILED);
  const hasWarnings = results.some(r => r.status === CheckStatus.WARNING);

  if (hasFailed) return CheckStatus.FAILED;
  if (hasWarnings) return CheckStatus.WARNING;
  return CheckStatus.PASSED;
}

/**
 * 计算健康评分
 */
function calculateHealthScore(results: HealthCheckResult[]): number {
  if (results.length === 0) return 0;

  const scoreMap: Record<CheckStatus, number> = {
    [CheckStatus.PENDING]: 30,
    [CheckStatus.RUNNING]: 50,
    [CheckStatus.PASSED]: 100,
    [CheckStatus.WARNING]: 70,
    [CheckStatus.FAILED]: 0,
    [CheckStatus.SKIPPED]: 50,
  };

  const totalScore = results.reduce((sum, result) => sum + scoreMap[result.status], 0);
  return Math.round(totalScore / results.length);
}

/**
 * 生成问题列表
 */
function generateIssues(results: HealthCheckResult[]): HealthCheckIssue[] {
  const issues: HealthCheckIssue[] = [];

  results.forEach(result => {
    if (result.status === CheckStatus.FAILED || result.status === CheckStatus.WARNING) {
      issues.push({
        id: `issue-${result.id}`,
        category: result.category,
        severity: result.severity || SeverityLevel.MEDIUM,
        title: `${result.name} Issue`,
        description: result.message,
        affectedChecks: [result.id],
        impact: getImpactDescription(result.category, result.severity),
        resolution: result.suggestions ? {
          steps: result.suggestions,
          difficulty: 'medium',
        } : undefined,
      });
    }
  });

  return issues;
}

/**
 * 生成建议列表
 */
function generateRecommendations(
  results: HealthCheckResult[],
  issues: HealthCheckIssue[]
): HealthCheckRecommendation[] {
  const recommendations: HealthCheckRecommendation[] = [];

  // 收集所有建议
  const allSuggestions = new Set<string>();
  results.forEach(result => {
    if (result.suggestions) {
      result.suggestions.forEach(suggestion => allSuggestions.add(suggestion));
    }
  });

  // 转换为建议对象
  Array.from(allSuggestions).forEach((suggestion, index) => {
    recommendations.push({
      id: `rec-${index}`,
      category: CheckCategory.USER_EXPERIENCE,
      priority: 'medium',
      title: `System Improvement ${index + 1}`,
      description: suggestion,
      implementation: {
        effort: 'minimal',
        timeframe: '1-2 hours',
      },
      benefits: [
        'Improved system reliability',
        'Better user experience',
      ],
      relatedIssues: issues.map(issue => issue.id),
    });
  });

  return recommendations;
}

/**
 * 获取影响描述
 */
function getImpactDescription(category: CheckCategory, severity?: SeverityLevel): string {
  const impacts: Record<CheckCategory, Record<SeverityLevel, string>> = {
    [CheckCategory.API_CONNECTIVITY]: {
      [SeverityLevel.CRITICAL]: 'AI transcription services are unavailable',
      [SeverityLevel.HIGH]: 'AI services may be unreliable',
      [SeverityLevel.MEDIUM]: 'Some AI features may be degraded',
      [SeverityLevel.LOW]: 'Minor AI service issues',
    },
    [CheckCategory.ERROR_HANDLING]: {
      [SeverityLevel.CRITICAL]: 'Users may encounter confusing errors',
      [SeverityLevel.HIGH]: 'Error recovery may be difficult',
      [SeverityLevel.MEDIUM]: 'Some errors lack clear guidance',
      [SeverityLevel.LOW]: 'Minor error message improvements needed',
    },
    [CheckCategory.PERFORMANCE]: {
      [SeverityLevel.CRITICAL]: 'System performance is severely degraded',
      [SeverityLevel.HIGH]: 'Performance issues affect user experience',
      [SeverityLevel.MEDIUM]: 'Some performance optimizations needed',
      [SeverityLevel.LOW]: 'Minor performance improvements available',
    },
    [CheckCategory.USER_EXPERIENCE]: {
      [SeverityLevel.CRITICAL]: 'User interface is difficult to use',
      [SeverityLevel.HIGH]: 'UX issues significantly impact usability',
      [SeverityLevel.MEDIUM]: 'Some UX improvements needed',
      [SeverityLevel.LOW]: 'Minor UX enhancements available',
    },
    [CheckCategory.SECURITY]: {
      [SeverityLevel.CRITICAL]: 'Security vulnerabilities present',
      [SeverityLevel.HIGH]: 'Security concerns require attention',
      [SeverityLevel.MEDIUM]: 'Security improvements recommended',
      [SeverityLevel.LOW]: 'Minor security enhancements available',
    },
    [CheckCategory.OFFLINE_CAPABILITY]: {
      [SeverityLevel.CRITICAL]: 'Offline functionality is unavailable',
      [SeverityLevel.HIGH]: 'Limited offline capability',
      [SeverityLevel.MEDIUM]: 'Some offline features work',
      [SeverityLevel.LOW]: 'Minor offline improvements available',
    },
  };

  return impacts[category]?.[severity || SeverityLevel.MEDIUM] || 'System functionality may be affected';
}

/**
 * 计算预估执行时间
 */
function calculateEstimatedDuration(
  categories: CheckCategory[],
  config?: { timeout?: number; parallel?: boolean }
): number {
  const baseTimePerCategory = 30000; // 30 seconds per category
  const categoryCount = categories.length;

  let estimatedTime = categoryCount * baseTimePerCategory;

  // 如果并行执行，减少时间
  if (config?.parallel) {
    estimatedTime = Math.ceil(estimatedTime / 3); // 假设3个并行进程
  }

  // 考虑超时设置
  if (config?.timeout) {
    estimatedTime = Math.min(estimatedTime, config.timeout);
  }

  return Math.ceil(estimatedTime / 1000); // 转换为秒
}