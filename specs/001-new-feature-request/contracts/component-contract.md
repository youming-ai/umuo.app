# Component Contract: 健康检查UI组件

**Version**: 1.0
**Date**: 2025-10-03

## 组件架构概览

### 组件层次结构
```
HealthCheckApp
├── HealthCheckDashboard          // 主仪表板
├── CheckRunner                   // 检查执行器
├── ReportViewer                  // 报告查看器
├── SettingsManager               // 设置管理器
└── NotificationManager           // 通知管理器
```

## 核心组件契约

### 1. HealthCheckDashboard

**职责**: 健康检查主界面，提供概览和快速操作

**Props接口**:
```typescript
interface HealthCheckDashboardProps {
  onRunCheck: (config?: HealthCheckConfig) => void;
  onViewReports: () => void;
  onOpenSettings: () => void;
  className?: string;
}

interface HealthCheckDashboardState {
  lastReport: HealthCheckReport | null;
  isRunning: boolean;
  systemStatus: 'healthy' | 'warning' | 'error';
  quickStats: {
    totalChecks: number;
    passedRate: number;
    lastCheckTime: Date | null;
    nextScheduledTime: Date | null;
  };
}
```

**渲染契约**:
```typescript
// 必须显示的内容
- 系统整体健康状态指示器
- 最近一次检查摘要
- 快速操作按钮（运行检查、查看报告、设置）
- 系统统计信息卡片

// 可选显示的内容
- 检查进度条（当运行时）
- 最近问题列表
- 计划下次检查时间
```

**事件契约**:
```typescript
interface DashboardEvents {
  'run-check': (config?: HealthCheckConfig) => void;
  'view-reports': () => void;
  'open-settings': () => void;
  'view-details': (category: CheckCategory) => void;
  'dismiss-notification': (id: string) => void;
}
```

### 2. CheckRunner

**职责**: 执行健康检查并显示进度

**Props接口**:
```typescript
interface CheckRunnerProps {
  config?: HealthCheckConfig;
  categories?: CheckCategory[];
  autoStart?: boolean;
  onComplete: (report: HealthCheckReport) => void;
  onCancel: () => void;
  onProgress: (progress: CheckProgress) => void;
}

interface CheckProgress {
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
```

**渲染契约**:
```typescript
// 必须显示的内容
- 整体进度条和百分比
- 当前执行的检查项
- 已完成/总数统计
- 取消按钮

// 可选显示的内容
- 详细执行日志
- 实时性能指标
- 预估剩余时间
- 错误详情（当出现错误时）
```

**状态管理**:
```typescript
interface CheckRunnerState {
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled';
  progress: CheckProgress;
  results: HealthCheckResult[];
  error: Error | null;
  startTime: Date | null;
  endTime: Date | null;
}
```

### 3. ReportViewer

**职责**: 显示和交互健康检查报告

**Props接口**:
```typescript
interface ReportViewerProps {
  reportId?: string;
  report?: HealthCheckReport;
  reports?: HealthCheckReport[];
  onSelectReport: (reportId: string) => void;
  onExportReport: (reportId: string, format: ExportFormat) => void;
  onDeleteReport: (reportId: string) => void;
  onFixIssue: (issueId: string) => void;
}

type ExportFormat = 'json' | 'pdf' | 'csv';
```

**渲染契约**:
```typescript
// 报告列表视图
- 报告列表（时间、状态、评分）
- 筛选和排序控件
- 分页控件

// 报告详情视图
- 执行摘要和评分
- 检查结果表格/卡片
- 问题列表和严重级别
- 改进建议
- 导出和删除操作
```

**交互契约**:
```typescript
interface ReportViewerEvents {
  'report-selected': (reportId: string) => void;
  'report-exported': (reportId: string, format: ExportFormat) => void;
  'report-deleted': (reportId: string) => void;
  'issue-fixed': (issueId: string) => void;
  'recommendation-applied': (recommendationId: string) => void;
  'view-details': (category: CheckCategory) => void;
}
```

### 4. SettingsManager

**职责**: 管理健康检查配置

**Props接口**:
```typescript
interface SettingsManagerProps {
  config: HealthCheckConfig[];
  globalConfig: GlobalHealthCheckConfig;
  onSave: (config: HealthCheckConfig[], global: GlobalHealthCheckConfig) => void;
  onReset: () => void;
  onTest: (category: CheckCategory) => void;
}

interface GlobalHealthCheckConfig {
  autoRun: boolean;
  interval: number;
  notifications: boolean;
  emailReports: boolean;
  retentionDays: number;
}
```

**配置分类**:
```typescript
// API连通性配置
interface ApiConnectivityConfig {
  enabled: boolean;
  timeout: number;
  retryCount: number;
  testEndpoints: string[];
}

// 性能测试配置
interface PerformanceConfig {
  enabled: boolean;
  benchmarks: BenchmarkConfig[];
  thresholds: PerformanceThresholds;
}

// 用户体验配置
interface UserExperienceConfig {
  enabled: boolean;
  uiResponsiveness: boolean;
  accessibility: boolean;
  mobileOptimization: boolean;
}
```

### 5. NotificationManager

**职责**: 管理健康检查相关的通知

**Props接口**:
```typescript
interface NotificationManagerProps {
  notifications: HealthCheckNotification[];
  onDismiss: (id: string) => void;
  onAction: (id: string, action: string) => void;
}

interface HealthCheckNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  actions?: NotificationAction[];
  persistent?: boolean;
}

interface NotificationAction {
  label: string;
  action: string;
  primary?: boolean;
}
```

## 通用组件契约

### CheckStatusIndicator

**职责**: 显示检查状态的可视化指示器

**Props接口**:
```typescript
interface CheckStatusIndicatorProps {
  status: CheckStatus;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
  animated?: boolean;
}
```

**渲染规则**:
- `passed`: 绿色圆圈 + ✓
- `failed`: 红色圆圈 + ✗
- `warning`: 黄色圆圈 + ⚠
- `running`: 蓝色圆圈 + 旋转动画
- `pending`: 灰色圆圈 + ⏳
- `skipped`: 灰色圆圈 + ⊘

### SeverityBadge

**职责**: 显示问题严重级别的标签

**Props接口**:
```typescript
interface SeverityBadgeProps {
  severity: SeverityLevel;
  compact?: boolean;
  className?: string;
}
```

**样式规则**:
- `low`: 灰色背景，低对比度文字
- `medium`: 黄色背景，深色文字
- `high`: 橙色背景，白色文字
- `critical`: 红色背景，白色文字，加粗

### ProgressBar

**职责**: 显示进度条

**Props接口**:
```typescript
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  showPercentage?: boolean;
  showLabel?: boolean;
  label?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
  animated?: boolean;
  size?: 'small' | 'medium' | 'large';
}
```

### MetricsCard

**职责**: 显示指标卡片

**Props接口**:
```typescript
interface MetricsCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  status?: 'good' | 'warning' | 'error';
  icon?: ReactNode;
  className?: string;
}
```

## 数据流契约

### 组件间通信
```typescript
// 使用Context进行全局状态管理
interface HealthCheckContextType {
  // 状态
  currentCheck: CheckSession | null;
  reports: HealthCheckReport[];
  config: HealthCheckConfig[];
  notifications: HealthCheckNotification[];

  // 操作
  runCheck: (config?: HealthCheckConfig) => Promise<string>;
  cancelCheck: (checkId: string) => Promise<void>;
  loadReports: () => Promise<void>;
  updateConfig: (config: HealthCheckConfig[]) => Promise<void>;
  dismissNotification: (id: string) => void;
}

// 使用自定义Hook简化组件逻辑
export const useHealthCheck = () => {
  const context = useContext(HealthCheckContext);
  if (!context) {
    throw new Error('useHealthCheck must be used within HealthCheckProvider');
  }
  return context;
};
```

### 事件系统
```typescript
// 全局事件总线
interface HealthCheckEvents {
  'check:started': (checkId: string) => void;
  'check:progress': (progress: CheckProgress) => void;
  'check:completed': (report: HealthCheckReport) => void;
  'check:failed': (error: Error) => void;
  'config:updated': (config: HealthCheckConfig[]) => void;
  'notification:added': (notification: HealthCheckNotification) => void;
}

// 使用EventEmitter或类似实现
export const healthCheckEventBus = new EventEmitter<HealthCheckEvents>();
```

## 样式和主题契约

### 主题变量
```typescript
interface HealthCheckTheme {
  // 颜色
  colors: {
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
  };

  // 间距
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  // 字体
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      bold: number;
    };
  };

  // 圆角
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}
```

### 响应式设计
```typescript
interface ResponsiveBreakpoints {
  mobile: '640px';
  tablet: '768px';
  desktop: '1024px';
  wide: '1280px';
}

// 组件必须支持响应式设计
interface ResponsiveProps {
  mobile?: ReactNode;
  tablet?: ReactNode;
  desktop?: ReactNode;
}
```

## 可访问性契约

### ARIA要求
```typescript
interface AccessibilityRequirements {
  // 键盘导航
  keyboardNavigation: boolean;

  // 屏幕阅读器支持
  screenReaderSupport: boolean;

  // 高对比度支持
  highContrastSupport: boolean;

  // 焦点管理
  focusManagement: boolean;

  // 语义化HTML
  semanticHtml: boolean;
}
```

### 键盘快捷键
```typescript
interface KeyboardShortcuts {
  'Ctrl+Enter': 'run-check';
  'Ctrl+R': 'view-reports';
  'Ctrl+S': 'open-settings';
  'Escape': 'cancel-current-operation';
  'Space': 'toggle-pause';
}
```