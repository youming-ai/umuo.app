# 性能监控系统使用指南

本指南介绍如何使用项目中的性能监控系统来监控应用程序的性能和健康状况。

## 概述

性能监控系统提供了全面的监控功能，包括：
- 🚀 **实时性能监控** - 监控应用程序的实时性能指标
- 📊 **详细的性能分析** - 文件处理、数据库操作、API调用的详细监控
- 🎯 **智能告警系统** - 自动检测性能问题并生成告警
- 📈 **可视化仪表板** - 直观的性能数据展示
- 🔧 **优化建议** - 基于监控数据提供优化建议

## 快速开始

### 1. 初始化监控系统

在应用程序启动时初始化监控系统：

```typescript
import { initializeMonitoring } from "@/lib/monitoring-integration-example";

// 在应用程序入口调用
initializeMonitoring();
```

### 2. 使用监控功能

#### 文件上传监控

```typescript
import { monitoredUploadFile } from "@/lib/monitoring-integration-example";

const fileId = await monitoredUploadFile(file, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});
```

#### 数据库操作监控

```typescript
import { MonitoredDbUtils } from "@/lib/monitoring-integration-example";

const dbUtils = MonitoredDbUtils.getInstance();
const file = await dbUtils.getFile(fileId);
```

#### API调用监控

```typescript
import { MonitoredGroqClient } from "@/lib/monitoring-integration-example";

const groqClient = new MonitoredGroqClient();
const transcription = await groqClient.transcribe(audioData);
```

### 3. 查看监控仪表板

```typescript
import PerformanceDashboard from "@/components/PerformanceDashboard";

// 在React组件中使用
function App() {
  return (
    <div>
      <PerformanceDashboard />
    </div>
  );
}
```

## 核心功能

### 1. 性能指标收集

系统自动收集以下性能指标：

#### 文件处理指标
- 文件上传、验证、分块、存储时间
- 文件大小、传输速度、内存使用
- 成功率、错误分布、文件类型统计

#### 数据库操作指标
- 查询、插入、更新、删除操作时间
- 事务性能、索引使用情况
- 连接状态、慢查询检测

#### API调用指标
- 请求响应时间、成功率、错误率
- 速率限制、重试情况、缓存性能
- 数据传输量、端点性能统计

#### 系统健康指标
- 内存使用、CPU负载、响应时间
- 系统健康评分、性能瓶颈识别

### 2. 实时监控

系统提供实时监控功能：

```typescript
import { useUnifiedPerformanceMonitoring } from "@/lib/unified-performance-monitoring";

const { getRealTimeMetrics, getSystemHealth } = useUnifiedPerformanceMonitoring();

// 获取实时指标
const realTimeMetrics = getRealTimeMetrics(60000); // 最近1分钟

// 获取系统健康状态
const systemHealth = getSystemHealth();
```

### 3. 告警系统

系统自动检测性能问题并生成告警：

```typescript
import { useUnifiedPerformanceMonitoring } from "@/lib/unified-performance-monitoring";

const { getUnresolvedAlerts, resolveAlert } = useUnifiedPerformanceMonitoring();

// 获取未解决的告警
const alerts = getUnresolvedAlerts();

// 解决告警
resolveAlert(alertId);
```

### 4. 性能报告

生成详细的性能分析报告：

```typescript
import { useUnifiedPerformanceMonitoring } from "@/lib/unified-performance-monitoring";

const { getUnifiedReport } = useUnifiedPerformanceMonitoring();

const report = getUnifiedReport();

console.log("系统健康评分:", report.systemHealth.score);
console.log("文件处理成功率:", report.fileMetrics.successRate);
console.log("API平均响应时间:", report.apiMetrics.averageResponseTime);
```

## 高级用法

### 1. 自定义性能监控

```typescript
import {
  measurePerformance,
  measureAsyncPerformance,
  recordPerformanceMetric
} from "@/lib/performance-monitoring";

// 监控同步函数
const result = measurePerformance(
  "custom_operation",
  "custom",
  () => {
    // 你的代码
    return doSomething();
  }
);

// 监控异步函数
const result = await measureAsyncPerformance(
  "async_operation",
  "custom",
  async () => {
    // 你的异步代码
    return await doSomethingAsync();
  }
);

// 记录自定义指标
recordPerformanceMetric(
  "custom_metric",
  "custom",
  42,
  "count",
  { category: "business" }
);
```

### 2. 批量操作监控

```typescript
import { monitoredBatchOperation } from "@/lib/monitoring-integration-example";

const results = await monitoredBatchOperation(
  "process_items",
  items,
  async (item, index) => {
    return processItem(item);
  },
  50 // 批次大小
);
```

### 3. 缓存性能监控

```typescript
import { MonitoredCache } from "@/lib/monitoring-integration-example";

const cache = new MonitoredCache(1000, 5 * 60 * 1000); // 1000个条目，5分钟TTL

// 设置缓存
await cache.set("key", value);

// 获取缓存
const value = await cache.get("key");

// 获取缓存统计
const stats = cache.getStats();
console.log("缓存命中率:", stats.hitRate);
```

## 配置选项

### 监控配置

```typescript
const monitoringConfig = {
  enabled: true,
  enableDashboard: true,
  enableRealTimeUpdates: true,
  enableAlerts: true,
  autoStart: true,
  config: {
    performance: {
      enabled: true,
      sampleRate: 1.0,
      memoryThreshold: 500, // MB
      performanceThreshold: 1000, // ms
      enableConsoleLogging: false,
    },
    file: {
      enabled: true,
      trackDetailedMetrics: true,
      performanceThresholds: {
        upload: 30000, // 30秒
        validation: 5000, // 5秒
        chunking: 10000, // 10秒
      },
    },
    database: {
      enabled: true,
      trackSlowQueries: true,
      slowQueryThreshold: 1000, // 1秒
    },
    api: {
      enabled: true,
      trackSlowRequests: true,
      slowRequestThreshold: 5000, // 5秒
      trackRateLimits: true,
    },
  },
};
```

### 性能阈值设置

系统支持自定义性能阈值：

- **文件上传**: 30秒
- **文件验证**: 5秒
- **文件分块**: 10秒
- **数据库查询**: 1秒
- **API请求**: 5秒
- **内存使用**: 500MB

## 集成现有代码

### 替换现有函数

找到需要监控的现有函数，使用监控版本替换：

```typescript
// 原始代码
export async function uploadFile(file: File): Promise<number> {
  // 上传逻辑
}

// 监控版本
export async function uploadFile(file: File): Promise<number> {
  const { monitorAsyncFileOperation } = useFilePerformanceMonitoring();

  return monitorAsyncFileOperation(
    "upload",
    file.size,
    async () => {
      // 原有的上传逻辑
      return doUpload(file);
    }
  );
}
```

### 添加监控装饰器

使用高阶函数添加监控：

```typescript
function withMonitoring<T extends (...args: any[]) => any>(
  operationName: string,
  category: string,
  fn: T
): T {
  return ((...args: any[]) => {
    return measurePerformance(
      operationName,
      category,
      () => fn(...args)
    );
  }) as T;
}

// 使用装饰器
const monitoredUploadFile = withMonitoring(
  "upload_file",
  "file_processing",
  uploadFile
);
```

## 最佳实践

### 1. 选择合适的监控粒度

- **关键路径**: 对核心业务逻辑进行详细监控
- **性能瓶颈**: 对已知慢操作进行重点监控
- **用户体验**: 对影响用户体验的操作进行监控
- **资源密集型**: 对消耗大量资源的操作进行监控

### 2. 合理设置采样率

```typescript
// 生产环境使用较低的采样率以减少性能开销
const config = {
  sampleRate: 0.1, // 10%采样率
};

// 开发环境使用100%采样率
const devConfig = {
  sampleRate: 1.0, // 100%采样率
};
```

### 3. 定期查看和分析监控数据

- 每日检查性能报告
- 关注错误率和响应时间趋势
- 及时处理性能告警
- 根据监控数据优化代码

### 4. 结合其他监控工具

- 与日志系统集成
- 与错误追踪系统集成
- 与APM工具集成
- 与CI/CD流程集成

## 故障排除

### 常见问题

1. **监控数据不显示**
   - 确保监控系统已正确初始化
   - 检查浏览器控制台是否有错误
   - 验证配置是否正确

2. **性能影响过大**
   - 降低采样率
   - 禁用不必要的监控功能
   - 检查是否有性能告警

3. **告警过多**
   - 调整性能阈值
   - 检查系统是否有实际性能问题
   - 优化告警规则

### 调试技巧

```typescript
// 启用控制台日志
const config = {
  config: {
    performance: {
      enableConsoleLogging: true,
    },
  },
};

// 检查监控状态
const { getMonitoringServices } = useUnifiedPerformanceMonitoring();
const services = getMonitoringServices();
console.log("Monitoring services:", services);
```

## 扩展功能

### 1. 自定义指标

```typescript
import { CustomMetricsRecorder } from "@/lib/monitoring-integration-example";

const metrics = new CustomMetricsRecorder();

// 记录业务指标
metrics.recordBusinessMetric("daily_active_users", 1234, "count");
metrics.recordBusinessMetric("revenue", 5678.90, "USD");
```

### 2. 自定义告警规则

```typescript
// 创建自定义告警检查
function checkCustomAlerts() {
  const report = getUnifiedReport();

  if (report.apiMetrics.successRate < 90) {
    // 触发自定义告警
    console.warn("API成功率过低:", report.apiMetrics.successRate);
  }
}
```

### 3. 数据导出

```typescript
// 导出监控数据
function exportMonitoringData() {
  const report = getUnifiedReport();

  // 导出为JSON
  const jsonData = JSON.stringify(report, null, 2);
  downloadJson(jsonData, `monitoring_report_${Date.now()}.json`);
}
```

## 总结

性能监控系统为项目提供了全面的性能监控和分析能力。通过合理使用这些功能，可以：

- ✅ 及时发现性能问题
- ✅ 优化系统性能
- ✅ 提升用户体验
- ✅ 支持数据驱动决策
- ✅ 确保系统稳定运行

建议在项目开发过程中充分利用监控系统，持续优化应用程序性能。