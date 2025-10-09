# 健康检查系统文档

## 概述

Oumu.ai 的健康检查系统是一个全面的诊断和监控工具，专门设计用于确保 AI 转录功能的稳定性和性能。系统通过自动化的检查流程，实时监控 API 连通性、性能指标、用户体验和安全合规性。

## 系统架构

### 核心组件

```
健康检查系统
├── 检查引擎 (scheduler.ts)
├── 数据库层 (database.ts)
├── 检查模块 (checks/)
│   ├── API连通性检查
│   ├── 错误处理验证
│   ├── 性能基准测试
│   ├── 用户体验验证
│   └── 安全合规检查
├── 报告生成器 (report-generator.ts)
├── 分析引擎 (analytics.ts)
├── 自动修复建议 (auto-fix.ts)
└── WebSocket 实时通信 (websocket.ts)
```

### 数据流

```
用户触发 → 检查调度 → 并行执行 → 结果收集 → 报告生成 → 数据存储 → 实时更新
    ↓           ↓           ↓           ↓           ↓           ↓           ↓
  UI组件    检查引擎    检查模块    结果聚合   报告器     IndexedDB   WebSocket
```

## 检查类别详解

### 1. API连通性检查 (api-connectivity)

**目的**: 验证所有 AI 服务的连接状态和可用性

**检查项目**:
- Groq API 认证验证
- Whisper 模型可访问性测试
- API 响应时间测量
- 配额使用情况检查
- 网络连接质量评估

**性能指标**:
- 响应时间 < 2秒
- 成功率 > 99%
- 配额使用率 < 90%

**错误处理**:
- 自动重试机制（最多3次）
- 备用服务切换
- 详细的错误诊断信息

### 2. 错误处理验证 (error-handling)

**目的**: 确保系统在各种异常情况下的稳定性

**模拟场景**:
- API 密钥失效
- 网络连接中断
- 请求超时
- 服务不可用
- 配额超限

**验证内容**:
- 错误信息清晰度
- 用户友好的提示
- 自动恢复能力
- 数据完整性保护

### 3. 性能基准测试 (performance)

**目的**: 监控系统性能和资源使用情况

**测试项目**:
- API 调用响应时间
- 音频处理速度
- 内存使用情况
- 并发处理能力
- 数据库操作性能

**基准指标**:
- 音频转录 < 30秒
- UI 响应时间 < 100ms
- 内存增长 < 100MB
- 并发处理 > 2个任务

### 4. 用户体验验证 (user-experience)

**目的**: 评估用户界面的可用性和响应性

**检查内容**:
- 界面加载时间
- 交互响应速度
- 移动端适配
- 无障碍访问支持
- 操作流程直观性

**评估标准**:
- 首屏加载 < 3秒
- 交互响应 < 200ms
- WCAG 2.1 AA 级别合规
- 移动端适配完美

### 5. 安全合规检查 (security)

**目的**: 确保数据处理和存储的安全性

**检查项目**:
- API 密钥存储安全
- 数据传输加密
- 本地数据保护
- XSS 防护
- 权限控制验证

**安全标准**:
- HTTPS 强制使用
- API 密钥不在客户端暴露
- 本地数据加密存储
- 定期安全审计

## 使用指南

### 访问健康检查

1. **通过主导航**: 点击"健康检查"菜单项
2. **直接访问**: 浏览器输入 `/health-check`
3. **快速访问**: 使用快捷键 `Ctrl+H` (Windows) / `Cmd+H` (Mac)

### 运行检查

#### 快速检查
- 检查项目: API连通性 + 基础性能
- 执行时间: ~30秒
- 适用场景: 日常快速验证

#### 完整检查
- 检查项目: 所有五个类别
- 执行时间: ~2分钟
- 适用场景: 全面系统诊断

#### 自定义检查
- 可选择特定检查类别
- 支持并行或串行执行
- 可配置超时和重试参数

### 查看结果

#### 实时监控
- 进度条显示执行进度
- 当前检查项目状态
- 预计剩余时间
- 实时日志输出

#### 结果报告
- **健康评分**: 0-100分综合评分
- **状态概览**: 通过/失败/警告统计
- **详细结果**: 每项检查的具体数据
- **问题分析**: 失败原因和影响评估
- **修复建议**: 自动生成的问题解决方案

#### 历史趋势
- 健康评分变化图
- 性能指标趋势
- 问题发生频率
- 系统改进追踪

## 配置选项

### 自动检查设置

```typescript
{
  autoRun: boolean;           // 是否启用自动检查
  interval: number;           // 检查间隔 (毫秒)
  categories: CheckCategory[]; // 检查类别
  notifications: boolean;     // 是否启用通知
  parallel: boolean;          // 是否并行执行
  timeout: number;            // 超时时间 (毫秒)
  retryCount: number;         // 重试次数
}
```

### 通知配置

```typescript
{
  email: {
    enabled: boolean;
    recipients: string[];
    conditions: NotificationCondition[];
  };
  browser: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  webhook: {
    enabled: boolean;
    url: string;
    events: WebhookEvent[];
  };
}
```

### 数据保留策略

```typescript
{
  reports: {
    retentionDays: number;    // 报告保留天数
    maxCount: number;        // 最大报告数量
    autoCleanup: boolean;    // 自动清理
  };
  logs: {
    retentionDays: number;
    level: LogLevel;
    maxSize: number;         // 最大日志大小 (MB)
  };
}
```

## API 接口

### 启动健康检查

```http
POST /api/health-check/run
Content-Type: application/json

{
  "categories": ["api-connectivity", "performance"],
  "config": {
    "timeout": 30000,
    "retryCount": 3,
    "parallel": true
  }
}
```

**响应**:
```json
{
  "checkId": "check-123456789",
  "estimatedDuration": 45000,
  "status": "started"
}
```

### 获取检查状态

```http
GET /api/health-check/status/{checkId}
```

**响应**:
```json
{
  "checkId": "check-123456789",
  "status": "running",
  "progress": {
    "completed": 2,
    "total": 5,
    "percentage": 40,
    "currentCategory": "performance"
  },
  "estimatedTimeRemaining": 18000
}
```

### 获取检查结果

```http
GET /api/health-check/results/{checkId}
```

**响应**:
```json
{
  "id": "check-123456789",
  "timestamp": "2025-10-08T10:00:00Z",
  "duration": 42500,
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "warnings": 0,
    "overallStatus": "warning",
    "score": 85
  },
  "results": [...],
  "issues": [...],
  "recommendations": [...]
}
```

### WebSocket 实时更新

```javascript
const ws = new WebSocket('ws://localhost:3000/api/health-check/ws');

// 订阅检查更新
ws.send(JSON.stringify({
  type: 'subscribe',
  checkId: 'check-123456789'
}));

// 监听实时更新
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'progress_update') {
    updateProgressBar(message.data);
  }
};
```

## 测试

### 单元测试

```bash
# 运行健康检查单元测试
npm test src/lib/health-check/

# 测试覆盖率
npm test:coverage -- src/lib/health-check/
```

### 性能测试

```bash
# 运行性能测试
npm test src/lib/health-check/performance.test.ts
```

### 端到端测试

```bash
# 运行 E2E 测试
npm test src/lib/health-check/e2e.test.ts
```

### 可访问性测试

```bash
# 运行可访问性测试
npm test src/lib/health-check/accessibility.test.tsx
```

## 故障排除

### 常见问题

#### 1. 检查失败：API认证错误

**症状**: API连通性检查失败，提示认证错误

**解决方案**:
1. 验证 `.env.local` 中的 API 密钥配置
2. 检查 API 密钥是否有效
3. 确认账户配额是否充足
4. 联系服务提供商检查服务状态

#### 2. 性能检查超时

**症状**: 性能基准测试因超时而失败

**解决方案**:
1. 检查网络连接质量
2. 增加超时时间配置
3. 关闭其他占用网络的应用
4. 尝试使用备用网络连接

#### 3. 内存使用过高

**症状**: 检查过程中内存使用超过限制

**解决方案**:
1. 关闭浏览器标签页释放内存
2. 重启浏览器
3. 检查是否有内存泄漏
4. 减少并发检查数量

### 错误代码参考

| 错误代码 | 描述 | 解决方案 |
|---------|------|----------|
| HC001 | 网络连接失败 | 检查网络连接，增加重试次数 |
| HC002 | API认证失败 | 验证API密钥配置 |
| HC003 | 服务不可用 | 检查服务状态，尝试备用服务 |
| HC004 | 配额超限 | 检查使用情况，升级服务计划 |
| HC005 | 请求超时 | 增加超时时间，优化网络 |
| HC006 | 数据解析错误 | 检查数据格式，联系技术支持 |

## 最佳实践

### 开发环境

1. **定期运行检查**: 建议每日至少运行一次完整检查
2. **监控性能指标**: 关注响应时间和成功率变化
3. **及时处理问题**: 发现问题后及时修复，避免累积
4. **保留历史数据**: 定期备份检查结果，用于趋势分析

### 生产环境

1. **设置自动检查**: 配置定期自动检查，及时发现异常
2. **配置告警通知**: 设置问题告警，及时响应
3. **监控资源使用**: 关注系统资源使用情况
4. **定期更新配置**: 根据业务需求调整检查配置

### 性能优化

1. **并行执行**: 启用并行检查以提高效率
2. **缓存结果**: 缓存稳定的检查结果
3. **智能调度**: 根据历史数据优化检查时机
4. **资源管理**: 合理分配系统资源

## 扩展开发

### 添加新的检查类别

1. **创建检查模块**:
```typescript
// src/lib/health-check/checks/custom-check.ts
export async function checkCustom(config: HealthCheckConfig): Promise<HealthCheckResult> {
  // 实现自定义检查逻辑
}
```

2. **注册检查函数**:
```typescript
// src/lib/health-check/scheduler.ts
const checkFunctions: Record<CheckCategory, (config: HealthCheckConfig) => Promise<HealthCheckResult>> = {
  // ... existing checks
  [CheckCategory.CUSTOM]: checkCustom,
};
```

3. **添加类型定义**:
```typescript
// src/lib/health-check/types.ts
export enum CheckCategory {
  // ... existing categories
  CUSTOM = 'custom',
}
```

### 自定义报告格式

```typescript
// 扩展报告生成器
export class CustomReportGenerator extends HealthCheckReportGenerator {
  generateCustomReport(results: HealthCheckResult[]): CustomReport {
    // 实现自定义报告格式
  }
}
```

### 集成外部监控

```typescript
// 集成外部监控服务
export class MonitoringIntegration {
  async sendMetrics(metrics: HealthCheckMetrics): Promise<void> {
    // 发送指标到外部服务
  }

  async createAlert(issue: HealthCheckIssue): Promise<void> {
    // 创建外部告警
  }
}
```

## 版本历史

### v1.0.0 (2025-10-08)
- ✅ 初始版本发布
- ✅ 实现五个核心检查类别
- ✅ 完整的测试覆盖
- ✅ 实时监控和报告功能
- ✅ WebSocket 实时通信
- ✅ 自动修复建议系统
- ✅ 可访问性支持

### 未来计划

#### v1.1.0 (计划中)
- 🔄 分布式检查支持
- 🔄 机器学习异常检测
- 🔄 自定义检查模板
- 🔄 更多集成选项

#### v1.2.0 (计划中)
- 🔄 移动端应用支持
- 🔄 API 限流和熔断
- 🔄 高级分析功能
- 🔄 企业级部署支持

## 支持与反馈

如有问题或建议，请：

1. **创建 Issue**: 在 GitHub 仓库中创建详细的问题报告
2. **联系开发团队**: 发送邮件至开发团队邮箱
3. **查看文档**: 参考在线文档和API参考
4. **社区讨论**: 参与开发者社区的讨论和交流

---

**健康检查系统** - 让您的 AI 转录服务更稳定、更可靠 🚀