// 健康检查核心类型定义

export enum CheckStatus {
  PENDING = 'pending',     // 等待执行
  RUNNING = 'running',     // 执行中
  PASSED = 'passed',       // 通过
  FAILED = 'failed',       // 失败
  WARNING = 'warning',     // 警告
  SKIPPED = 'skipped'      // 跳过
}

export enum CheckCategory {
  API_CONNECTIVITY = 'api_connectivity',     // API连通性
  ERROR_HANDLING = 'error_handling',         // 错误处理
  PERFORMANCE = 'performance',               // 性能测试
  USER_EXPERIENCE = 'user_experience',       // 用户体验
  SECURITY = 'security',                     // 安全合规
  OFFLINE_CAPABILITY = 'offline_capability'  // 离线功能
}

export enum SeverityLevel {
  LOW = 'low',           // 低：轻微问题，不影响核心功能
  MEDIUM = 'medium',     // 中：需要关注的问题
  HIGH = 'high',         // 高：重要问题，影响用户体验
  CRITICAL = 'critical'  // 严重：阻塞性问题
}

export interface CheckMetrics {
  // API相关指标
  apiResponseTime?: number;            // API响应时间（毫秒）
  apiSuccessRate?: number;             // API成功率（0-1）
  requestCount?: number;               // 请求次数

  // 性能相关指标
  memoryUsage?: number;                // 内存使用（MB）
  cpuUsage?: number;                   // CPU使用率（0-1）

  // 用户体验指标
  uiResponseTime?: number;             // UI响应时间（毫秒）
  loadTime?: number;                   // 页面加载时间（毫秒）

  // 错误处理测试指标
  testSuccessRate?: number;            // 测试成功率（0-1）
  testsPassed?: number;                // 通过的测试数量
  totalTests?: number;                  // 总测试数量

  // 错误处理质量指标
  errorClarity?: number;               // 错误信息清晰度 (0-1)
  userFriendliness?: number;           // 用户友好度 (0-1)
  recoveryGuidance?: number;           // 恢复指导可用性 (0-1)
  loggingCompleteness?: number;        // 日志记录完整性 (0-1)

  // 音频处理指标
  audioProcessingTime?: number;        // 音频处理时间（毫秒）
  transcriptionAccuracy?: number;      // 转录准确率（0-1）

  // 自定义指标
  custom?: Record<string, number>;
}

export interface HealthCheckResult {
  id: string;                          // 唯一标识
  category: CheckCategory;             // 检查分类
  name: string;                        // 检查名称
  description: string;                 // 检查描述
  status: CheckStatus;                 // 检查状态
  severity?: SeverityLevel;            // 问题严重级别
  duration: number;                    // 执行耗时（毫秒）
  timestamp: Date;                     // 执行时间

  // 结果详情
  message: string;                     // 状态消息
  details?: Record<string, unknown>;   // 详细信息
  metrics?: CheckMetrics;              // 性能指标

  // 问题信息（仅在失败时）
  error?: {
    code: string;
    message: string;
    stack?: string;
  };

  // 建议和修复方案
  suggestions?: string[];              // 改进建议
  autoFixAvailable?: boolean;          // 是否支持自动修复
}

export interface HealthCheckConfig {
  enabled: boolean;                    // 是否启用
  timeout: number;                     // 超时时间（毫秒）
  retryCount: number;                  // 重试次数
  severity: SeverityLevel;             // 默认严重级别

  // 自定义参数
  parameters?: Record<string, unknown>;

  // 依赖检查
  dependencies?: string[];             // 依赖的其他检查ID

  // 执行计划
  schedule?: {
    interval: number;                  // 检查间隔（毫秒）
    autoRun: boolean;                  // 自动执行
  };
}

// Database version of HealthCheckConfig with category
export interface HealthCheckConfigWithCategory extends HealthCheckConfig {
  category: CheckCategory;
}

export interface HealthCheckIssue {
  id: string;                          // 问题唯一标识
  category: CheckCategory;             // 问题分类
  severity: SeverityLevel;             // 严重级别
  title: string;                       // 问题标题
  description: string;                 // 问题描述

  // 影响范围
  affectedChecks: string[];            // 受影响的检查ID
  impact: string;                      // 影响描述

  // 根本原因
  rootCause?: {
    type: 'configuration' | 'code' | 'environment' | 'external';
    description: string;
    evidence?: string[];
  };

  // 修复信息
  resolution?: {
    steps: string[];                   // 修复步骤
    estimatedTime?: number;            // 预估修复时间（分钟）
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

export interface HealthCheckRecommendation {
  id: string;                          // 建议唯一标识
  category: CheckCategory;             // 建议分类
  priority: 'low' | 'medium' | 'high'; // 优先级
  title: string;                       // 建议标题
  description: string;                 // 建议描述

  // 实施信息
  implementation: {
    effort: 'minimal' | 'moderate' | 'significant'; // 实施难度
    timeframe: string;                 // 实施时间框架
    resources?: string[];              // 所需资源
  };

  // 预期收益
  benefits: string[];                  // 预期收益

  // 相关问题
  relatedIssues: string[];             // 关联的问题ID
}

export interface HealthCheckReport {
  id: string;                          // 报告唯一标识
  version: string;                     // 报告版本
  timestamp: Date;                     // 生成时间
  duration: number;                    // 总耗时

  // 检查概览
  summary: {
    total: number;                     // 总检查数
    passed: number;                    // 通过数量
    failed: number;                    // 失败数量
    warnings: number;                  // 警告数量
    skipped: number;                   // 跳过数量
    overallStatus: CheckStatus;        // 整体状态
    score: number;                     // 健康评分（0-100）
  };

  // 检查结果
  results: HealthCheckResult[];        // 所有检查结果

  // 问题汇总
  issues: HealthCheckIssue[];          // 发现的问题

  // 建议汇总
  recommendations: HealthCheckRecommendation[];  // 改进建议

  // 系统信息
  systemInfo: {
    userAgent: string;                 // 用户代理
    platform: string;                 // 平台信息
    language: string;                  // 语言设置
    timeZone: string;                  // 时区
    screenResolution?: string;         // 屏幕分辨率
  };

  // 元数据
  metadata: {
    version: string;                   // 应用版本
    buildNumber?: string;              // 构建号
    environment: 'development' | 'production' | 'test';
  };
}

export interface CheckProgress {
  checkId: string;
  total: number;
  completed: number;
  current: {
    category: CheckCategory;
    name: string;
    status: CheckStatus;
    progress: number;
  };
  estimatedTimeRemaining: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

export type ExportFormat = 'json' | 'pdf' | 'csv';

export interface GlobalHealthCheckConfig {
  autoRun: boolean;
  interval: number;
  notifications: boolean;
  emailReports: boolean;
  retentionDays: number;
}

export interface HealthCheckNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  actions?: NotificationAction[];
  persistent?: boolean;
}

export interface NotificationAction {
  label: string;
  action: string;
  primary?: boolean;
}