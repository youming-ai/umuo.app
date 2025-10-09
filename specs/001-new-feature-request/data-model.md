# Data Model: AI转录功能完整性检查

**Date**: 2025-10-03
**Version**: 1.0

## 核心数据类型

### 检查结果枚举
```typescript
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
```

### 单项检查结果
```typescript
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
```

### 性能指标
```typescript
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

  // 音频处理指标
  audioProcessingTime?: number;        // 音频处理时间（毫秒）
  transcriptionAccuracy?: number;      // 转录准确率（0-1）

  // 自定义指标
  custom?: Record<string, number>;
}
```

### 检查配置
```typescript
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
```

## 复合数据结构

### 检查报告
```typescript
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
```

### 问题定义
```typescript
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
```

### 改进建议
```typescript
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
```

## 数据库模式（IndexedDB）

### 健康检查结果存储
```typescript
// Dexie数据库定义
export class HealthCheckDB extends Dexie {
  checkResults!: Table<HealthCheckResult>;
  checkReports!: Table<HealthCheckReport>;
  checkConfigs!: Table<HealthCheckConfig>;

  constructor() {
    super('OumuHealthCheck');

    this.version(1).stores({
      checkResults: '++id, category, status, timestamp, severity',
      checkReports: '++id, timestamp, overallStatus, score',
      checkConfigs: 'category, enabled'
    });
  }
}
```

### 数据访问接口
```typescript
export interface HealthCheckRepository {
  // 检查结果
  saveCheckResult(result: HealthCheckResult): Promise<void>;
  getCheckResult(id: string): Promise<HealthCheckResult | null>;
  getCheckResultsByCategory(category: CheckCategory): Promise<HealthCheckResult[]>;
  getRecentCheckResults(limit?: number): Promise<HealthCheckResult[]>;

  // 检查报告
  saveCheckReport(report: HealthCheckReport): Promise<void>;
  getCheckReport(id: string): Promise<HealthCheckReport | null>;
  getLatestCheckReport(): Promise<HealthCheckReport | null>;
  getCheckReports(dateRange?: { from: Date; to: Date }): Promise<HealthCheckReport[]>;

  // 配置管理
  saveCheckConfig(config: HealthCheckConfig): Promise<void>;
  getCheckConfig(category: CheckCategory): Promise<HealthCheckConfig | null>;
  getAllCheckConfigs(): Promise<HealthCheckConfig[]>;

  // 数据清理
  cleanupOldData(retentionDays: number): Promise<void>;
  exportData(): Promise<Blob>;
  importData(data: Blob): Promise<void>;
}
```

## 数据流设计

### 检查执行流程
1. **初始化** - 创建检查上下文和配置
2. **执行检查** - 运行各项检查并收集结果
3. **数据处理** - 分析结果并生成指标
4. **报告生成** - 创建结构化检查报告
5. **数据存储** - 持久化检查结果和报告

### 状态管理
- **检查状态** - 实时更新检查进度
- **结果缓存** - 避免重复执行相同检查
- **历史追踪** - 保存检查历史和趋势
- **配置同步** - 管理检查配置和偏好设置

## 数据验证规则

### 输入验证
- 检查ID必须唯一且格式正确
- 时间戳必须在合理范围内
- 枚举值必须为预定义值
- 数值指标必须在有效范围内

### 数据完整性
- 必填字段不能为空
- 关联数据必须存在
- 数据格式必须符合规范
- 版本信息必须一致

### 性能约束
- 单次检查执行时间不超过5分钟
- 数据库查询响应时间不超过1秒
- 报告生成时间不超过30秒
- 数据导出时间不超过2分钟