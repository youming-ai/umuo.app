# Data Model: AI Transcription Functionality Check

**Feature**: AI转录功能检查
**Date**: 2025-10-08
**Storage**: IndexedDB (Dexie)

---

## Core Entities

### 1. HealthCheck
健康检查记录实体，存储每次检查的完整信息。

```typescript
interface HealthCheck {
  id: string;                    // 唯一标识符
  timestamp: Date;              // 检查时间
  status: 'running' | 'completed' | 'failed';  // 检查状态
  duration: number;             // 检查持续时间 (ms)
  results: HealthCheckResult[]; // 检查结果列表
  summary: HealthCheckSummary;  // 检查摘要
  metadata: CheckMetadata;      // 检查元数据
}
```

### 2. HealthCheckResult
单项检查结果，记录具体的服务或功能测试结果。

```typescript
interface HealthCheckResult {
  id: string;                    // 结果ID
  checkId: string;              // 关联的检查ID
  category: CheckCategory;      // 检查类别
  serviceName: string;          // 服务名称 (如 "Groq", "Gemini")
  status: 'pass' | 'fail' | 'warning';  // 结果状态
  metrics: PerformanceMetrics;  // 性能指标
  error?: ErrorInfo;            // 错误信息
  details: ResultDetails;       // 详细结果
  timestamp: Date;              // 检查时间
}

type CheckCategory =
  | 'api-connectivity'    // API连通性
  | 'transcription-test'  // 转录功能测试
  | 'authentication'      // 认证验证
  | 'quota-status'       // 配额状态
  | 'quality-metrics'    // 质量指标
  | 'ui-performance';    // UI性能
```

### 3. PerformanceMetrics
性能指标实体，记录各种性能数据。

```typescript
interface PerformanceMetrics {
  responseTime: number;         // 响应时间 (ms)
  uploadTime: number;          // 上传时间 (ms)
  processingTime: number;      // 处理时间 (ms)
  downloadTime: number;        // 下载时间 (ms)
  totalTime: number;           // 总时间 (ms)
  accuracy?: number;           // 转录准确度 (0-100%)
  memoryUsage: number;         // 内存使用 (MB)
  networkLatency: number;      // 网络延迟 (ms)
  successRate?: number;        // 成功率 (0-100%)
  throughput?: number;         // 吞吐量 (operations/sec)
}
```

### 4. ErrorInfo
错误信息实体，详细记录错误情况。

```typescript
interface ErrorInfo {
  code: string;                 // 错误代码
  message: string;              // 错误消息
  type: ErrorType;              // 错误类型
  severity: 'low' | 'medium' | 'high' | 'critical';  // 严重程度
  suggestions: string[];        // 解决建议
  timestamp: Date;              // 错误时间
  context?: Record<string, any>; // 错误上下文
}

type ErrorType =
  | 'network'          // 网络错误
  | 'authentication'   // 认证错误
  | 'quota-exceeded'   // 配额超限
  | 'service-error'    // 服务错误
  | 'format-unsupported' // 格式不支持
  | 'timeout'          // 超时错误
  | 'unknown';         // 未知错误
```

### 5. ServiceStatus
服务状态实体，记录AI服务的实时状态。

```typescript
interface ServiceStatus {
  serviceName: string;          // 服务名称
  isOnline: boolean;            // 在线状态
  lastCheck: Date;              // 最后检查时间
  responseTime: number;         // 响应时间 (ms)
  availability: number;         // 可用性 (0-100%)
  quotaInfo: QuotaInfo;         // 配额信息
  capabilities: string[];       // 支持的功能
  error?: ErrorInfo;            // 当前错误
}
```

### 6. QuotaInfo
配额信息实体，记录API使用配额。

```typescript
interface QuotaInfo {
  current: number;              // 当前使用量
  limit: number;                // 配额限制
  resetTime: Date;              // 重置时间
  unit: 'requests' | 'tokens' | 'minutes' | 'bytes';  // 单位
  percentage: number;           // 使用百分比
  warnings: QuotaWarning[];     // 警告信息
}

interface QuotaWarning {
  threshold: number;            // 警告阈值 (百分比)
  message: string;              // 警告消息
  acknowledged: boolean;        // 是否已确认
}
```

### 7. HealthCheckSummary
检查摘要实体，提供检查结果的概览。

```typescript
interface HealthCheckSummary {
  totalChecks: number;          // 总检查数
  passedChecks: number;         // 通过检查数
  failedChecks: number;         // 失败检查数
  warningChecks: number;        // 警告检查数
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';  // 整体状态
  score: number;                // 健康评分 (0-100)
  recommendations: string[];    // 改进建议
  criticalIssues: string[];     // 关键问题
}
```

### 8. CheckMetadata
检查元数据，记录检查的环境和配置信息。

```typescript
interface CheckMetadata {
  browser: BrowserInfo;         // 浏览器信息
  network: NetworkInfo;         // 网络信息
  audioTestFile: AudioTestInfo; // 测试音频信息
  configuration: CheckConfig;   // 检查配置
  version: string;              // 检查版本
}

interface BrowserInfo {
  name: string;                 // 浏览器名称
  version: string;              // 浏览器版本
  platform: string;            // 平台信息
  language: string;             // 语言设置
  cookieEnabled: boolean;       // Cookie启用状态
}

interface NetworkInfo {
  connectionType: string;       // 连接类型
  effectiveType: string;        // 有效连接类型
  downlink: number;             // 下行速度
  rtt: number;                  // 往返时间
  saveData: boolean;            // 省流量模式
}

interface AudioTestInfo {
  filename: string;             // 文件名
  format: string;               // 音频格式
  duration: number;             // 时长 (秒)
  size: number;                 // 文件大小 (bytes)
  sampleRate: number;           // 采样率
  channels: number;             // 声道数
}

interface CheckConfig {
  timeout: number;              // 超时设置 (ms)
  retryAttempts: number;        // 重试次数
  parallelChecks: boolean;      // 并行检查
  verboseLogging: boolean;      // 详细日志
  testAudioSize: number;        // 测试音频大小 (bytes)
}
```

### 9. ResultDetails
详细结果信息，提供检查的具体数据。

```typescript
interface ResultDetails {
  [category: string]: {
    [key: string]: any;
  };
}

// API连通性检查详情
interface ApiConnectivityDetails {
  endpoint: string;             // API端点
  method: string;               // HTTP方法
  statusCode: number;           // 状态码
  headers: Record<string, string>; // 响应头
  responseSize: number;         // 响应大小
}

// 转录测试详情
interface TranscriptionTestDetails {
  audioFile: string;            // 音频文件信息
  transcription: string;        // 转录结果
  confidence: number;           // 置信度
  language: string;             // 检测语言
  processingTime: number;       // 处理时间
}

// UI性能检查详情
interface UIPerformanceDetails {
  firstContentfulPaint: number; // 首次内容绘制时间
  largestContentfulPaint: number; // 最大内容绘制时间
  firstInputDelay: number;      // 首次输入延迟
  cumulativeLayoutShift: number; // 累积布局偏移
  interactionToNextPaint: number; // 交互到下次绘制
}
```

---

## Database Schema (Dexie)

```typescript
class HealthCheckDatabase extends Dexie {
  healthChecks!: Table<HealthCheck>;
  results!: Table<HealthCheckResult>;
  serviceStatus!: Table<ServiceStatus>;
  configuration!: Table<CheckConfig>;

  constructor() {
    super('HealthCheckDatabase');

    this.version(1).stores({
      healthChecks: '++id, timestamp, status, duration, summary.score',
      results: '++id, checkId, category, serviceName, status, timestamp',
      serviceStatus: 'serviceName, isOnline, lastCheck, availability',
      configuration: 'id, version, created'
    });
  }
}
```

---

## Data Validation Rules

### HealthCheck Validation
- `id`: 必填，UUID格式
- `timestamp`: 必填，有效日期时间
- `status`: 必填，枚举值之一
- `duration`: 必填，非负数
- `results`: 必填，非空数组
- `summary`: 必填，完整对象

### HealthCheckResult Validation
- `id`: 必填，UUID格式
- `checkId`: 必填，关联有效的HealthCheck
- `category`: 必填，有效的检查类别
- `serviceName`: 必填，非空字符串
- `status`: 必填，枚举值之一
- `metrics`: 必填，完整对象
- `timestamp`: 必填，有效日期时间

### PerformanceMetrics Validation
- `responseTime`: 必填，非负数
- `totalTime`: 必填，非负数
- `accuracy`: 可选，0-100范围
- `successRate`: 可选，0-100范围
- `memoryUsage`: 必填，非负数

### ErrorInfo Validation
- `code`: 必填，非空字符串
- `message`: 必填，非空字符串
- `type`: 必填，有效的错误类型
- `severity`: 必填，枚举值之一
- `suggestions`: 必填，字符串数组

---

## State Transitions

### HealthCheck Status Flow
```
running → completed (所有检查完成)
running → failed (检查过程中发生错误)
completed → running (重新运行检查)
failed → running (重新运行检查)
```

### Service Status Flow
```
online → offline (服务不可用)
offline → online (服务恢复)
online → degraded (性能下降)
degraded → online (性能恢复)
```

---

## Indexing Strategy

### Primary Indexes
- `healthChecks.timestamp`: 时间戳索引，用于历史记录查询
- `results.checkId`: 检查ID索引，用于关联查询
- `results.category`: 类别索引，用于分类查询
- `serviceStatus.serviceName`: 服务名称索引，用于状态查询

### Secondary Indexes
- `healthChecks.status`: 状态索引，用于状态筛选
- `results.status`: 结果状态索引，用于结果筛选
- `results.timestamp`: 时间戳索引，用于时间范围查询

---

## Data Retention Policy

### HealthCheck Records
- **保留期**: 30天
- **最大记录数**: 100条
- **清理策略**: 删除最旧的记录，保留最近的记录

### Service Status
- **保留期**: 永久
- **更新频率**: 实时更新
- **清理策略**: 仅保留最新状态

### Configuration Data
- **保留期**: 永久
- **版本控制**: 保留最近5个版本
- **清理策略**: 删除过期版本