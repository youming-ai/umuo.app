# API Contract: 健康检查API

**Version**: 1.0
**Date**: 2025-10-03

## API端点定义

### 1. 执行健康检查
```http
POST /api/health-check/run
Content-Type: application/json

Request Body:
{
  "categories": CheckCategory[],      // 可选：指定检查分类
  "config": {                        // 可选：自定义配置
    "timeout": number,
    "retryCount": number,
    "parallel": boolean
  }
}

Response:
{
  "success": boolean,
  "data": {
    "checkId": string,               // 检查任务ID
    "status": "started" | "running" | "completed",
    "estimatedDuration": number      // 预估完成时间（秒）
  },
  "error": ApiError                  // 仅在失败时
}
```

### 2. 获取检查状态
```http
GET /api/health-check/status/{checkId}

Response:
{
  "success": boolean,
  "data": {
    "checkId": string,
    "status": CheckStatus,
    "progress": {
      "total": number,
      "completed": number,
      "percentage": number
    },
    "currentCheck": {
      "category": CheckCategory,
      "name": string,
      "status": CheckStatus
    },
    "estimatedTimeRemaining": number
  },
  "error": ApiError
}
```

### 3. 获取检查结果
```http
GET /api/health-check/results/{checkId}

Response:
{
  "success": boolean,
  "data": HealthCheckReport,
  "error": ApiError
}
```

### 4. 获取历史报告列表
```http
GET /api/health-check/reports
Query Parameters:
  - limit: number = 10               // 可选：返回数量限制
  - offset: number = 0               // 可选：偏移量
  - category: CheckCategory          // 可选：按分类筛选
  - status: CheckStatus              // 可选：按状态筛选
  - dateFrom: string                 // 可选：开始日期（ISO）
  - dateTo: string                   // 可选：结束日期（ISO）

Response:
{
  "success": boolean,
  "data": {
    "reports": HealthCheckReport[],
    "pagination": {
      "total": number,
      "limit": number,
      "offset": number,
      "hasMore": boolean
    }
  },
  "error": ApiError
}
```

### 5. 获取检查配置
```http
GET /api/health-check/config

Response:
{
  "success": boolean,
  "data": {
    "categories": HealthCheckConfig[],
    "global": {
      "autoRun": boolean,
      "interval": number,
      "notifications": boolean
    }
  },
  "error": ApiError
}
```

### 6. 更新检查配置
```http
PUT /api/health-check/config
Content-Type: application/json

Request Body: {
  "categories": Partial<HealthCheckConfig>[],
  "global": {
    "autoRun?: boolean,
    "interval?: number,
    "notifications?: boolean
  }
}

Response:
{
  "success": boolean,
  "data": HealthCheckConfig[],
  "error": ApiError
}
```

### 7. 导出检查报告
```http
GET /api/health-check/export/{checkId}
Query Parameters:
  - format: "json" | "pdf" | "csv" = "json"

Response:
- JSON格式：直接返回HealthCheckReport
- PDF格式：application/pdf
- CSV格式：text/csv

Headers:
Content-Type: 根据格式变化
Content-Disposition: attachment; filename="health-check-{checkId}.{ext}"
```

### 8. 删除检查报告
```http
DELETE /api/health-check/reports/{reportId}

Response:
{
  "success": boolean,
  "data": {
    "deleted": boolean,
    "reportId": string
  },
  "error": ApiError
}
```

## WebSocket连接（实时更新）

### 连接端点
```
WebSocket: /api/health-check/realtime
```

### 消息格式
```typescript
// 客户端订阅
{
  "type": "subscribe",
  "checkId": string
}

// 服务端推送 - 检查状态更新
{
  "type": "status_update",
  "data": {
    "checkId": string,
    "status": CheckStatus,
    "progress": ProgressInfo,
    "currentCheck": CurrentCheckInfo
  }
}

// 服务端推送 - 单项检查完成
{
  "type": "check_completed",
  "data": HealthCheckResult
}

// 服务端推送 - 检查完成
{
  "type": "check_session_completed",
  "data": {
    "checkId": string,
    "reportId": string,
    "summary": ReportSummary
  }
}
```

## 错误响应格式

### 标准错误结构
```typescript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}
```

### 错误代码定义
```typescript
export const HealthCheckErrorCodes = {
  // 通用错误
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // 健康检查特定错误
  CHECK_ALREADY_RUNNING: 'CHECK_ALREADY_RUNNING',
  CHECK_NOT_FOUND: 'CHECK_NOT_FOUND',
  CHECK_TIMEOUT: 'CHECK_TIMEOUT',
  INVALID_CHECK_CONFIG: 'INVALID_CHECK_CONFIG',
  CHECK_EXECUTION_FAILED: 'CHECK_EXECUTION_FAILED',
  REPORT_GENERATION_FAILED: 'REPORT_GENERATION_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED'
} as const;
```

## 数据验证契约

### 请求验证规则
```typescript
// Zod schemas for validation
export const RunHealthCheckSchema = z.object({
  categories: z.array(z.nativeEnum(CheckCategory)).optional(),
  config: z.object({
    timeout: z.number().min(1000).max(300000).optional(), // 1秒-5分钟
    retryCount: z.number().min(0).max(5).optional(),
    parallel: z.boolean().optional()
  }).optional()
});

export const UpdateConfigSchema = z.object({
  categories: z.array(HealthCheckConfigSchema.partial()).optional(),
  global: z.object({
    autoRun: z.boolean().optional(),
    interval: z.number().min(60000).max(86400000).optional(), // 1分钟-24小时
    notifications: z.boolean().optional()
  }).optional()
});
```

### 响应验证规则
```typescript
export const HealthCheckReportSchema = z.object({
  id: z.string().uuid(),
  version: z.string(),
  timestamp: z.date(),
  duration: z.number().min(0),
  summary: z.object({
    total: z.number().min(0),
    passed: z.number().min(0),
    failed: z.number().min(0),
    warnings: z.number().min(0),
    skipped: z.number().min(0),
    overallStatus: z.nativeEnum(CheckStatus),
    score: z.number().min(0).max(100)
  }),
  results: z.array(HealthCheckResultSchema),
  issues: z.array(HealthCheckIssueSchema),
  recommendations: z.array(HealthCheckRecommendationSchema),
  systemInfo: z.object({
    userAgent: z.string(),
    platform: z.string(),
    language: z.string(),
    timeZone: z.string(),
    screenResolution: z.string().optional()
  }),
  metadata: z.object({
    version: z.string(),
    buildNumber: z.string().optional(),
    environment: z.enum(['development', 'production', 'test'])
  })
});
```

## 性能约束

### 响应时间要求
- **健康检查启动**: < 500ms
- **状态查询**: < 200ms
- **报告获取**: < 1s
- **配置更新**: < 300ms
- **报告列表**: < 500ms
- **报告导出**: < 5s

### 并发限制
- **同时运行检查数**: 每用户最多1个
- **WebSocket连接数**: 每用户最多5个
- **API请求频率**: 每用户每分钟最多60次

### 数据大小限制
- **请求体大小**: 最大1MB
- **响应体大小**: 最大10MB
- **报告存储**: 每用户最多100个报告

## 安全要求

### 认证与授权
- 所有API端点需要用户认证
- 健康检查数据仅用户本人可访问
- 管理员权限可查看所有用户报告

### 数据保护
- 敏感配置信息加密存储
- API密钥不在响应中暴露
- 日志记录不包含敏感数据

### 访问控制
```typescript
export const HealthCheckPermissions = {
  READ_OWN_REPORTS: 'health-check:read-own-reports',
  WRITE_OWN_CONFIG: 'health-check:write-own-config',
  EXECUTE_CHECKS: 'health-check:execute-checks',
  DELETE_OWN_REPORTS: 'health-check:delete-own-reports',

  // 管理员权限
  READ_ALL_REPORTS: 'health-check:read-all-reports',
  MANAGE_GLOBAL_CONFIG: 'health-check:manage-global-config'
} as const;
```