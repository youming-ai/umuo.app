# umuo.app 组件文档

## 概述

umuo.app 采用了基于 shadcn/ui 的组件系统，结合自定义业务组件，提供了一致的UI体验。

## 组件架构

### 基础组件层
位于 `src/components/ui/`，提供通用的UI组件。

### 业务组件层
位于 `src/components/features/`，提供特定业务逻辑的组件。

### 布局组件层
位于 `src/components/layout/`，提供页面布局和上下文。

## 核心组件

### 1. 通用UI组件

#### StatusBadge
状态徽章组件，用于显示文件、转录等状态。

```tsx
import { StatusBadge } from "@/components/ui/common/StatusBadge";

// 基础用法
<StatusBadge status="completed">已完成</StatusBadge>

// 带图标
<StatusBadge status="transcribing" icon={<LoadingSpinner size="sm" />}>
  转录中
</StatusBadge>

// 不同尺寸
<StatusBadge size="lg" status="error">错误</StatusBadge>
```

**状态类型:**
- `uploaded`: 已上传
- `processing`: 处理中
- `completed`: 已完成
- `error`: 错误
- `transcribing`: 转录中
- `postprocessing`: 后处理中

#### LoadingSpinner
加载动画组件。

```tsx
import { LoadingSpinner } from "@/components/ui/common/LoadingSpinner";

// 基础用法
<LoadingSpinner />

// 带标签
<LoadingSpinner label="正在处理..." />

// 不同尺寸和颜色
<LoadingSpinner size="lg" variant="destructive" />
```

#### ProgressRing
环形进度条组件。

```tsx
import { ProgressRing } from "@/components/ui/common/ProgressRing";

// 基础用法
<ProgressRing value={75} showLabel />

// 自定义样式
<ProgressRing 
  value={45} 
  size="lg" 
  color="#10b981"
  label="转录进度"
/>
```

#### EmptyState
空状态组件。

```tsx
import { EmptyState } from "@/components/ui/common/EmptyState";

// 基础用法
<EmptyState 
  title="暂无文件"
  description="请上传音频文件开始转录"
  icon={<UploadIcon />}
/>

// 带操作按钮
<EmptyState 
  title="没有找到文件"
  description="请检查搜索条件或上传新文件"
  icon={<SearchIcon />}
  action={<Button>上传文件</Button>}
/>
```

### 2. 文件管理组件

#### FileUpload
文件上传组件，支持拖拽和点击上传。

```tsx
import { FileUpload } from "@/components/features/file/FileUpload";

const handleFilesAdded = (files: File[]) => {
  console.log('上传文件:', files);
};

<FileUpload 
  onFilesAdded={handleFilesAdded}
  accept="audio/*"
  maxSize={100 * 1024 * 1024} // 100MB
  multiple={true}
/>
```

**Props:**
- `onFilesAdded`: 文件添加回调
- `accept`: 接受的文件类型
- `maxSize`: 最大文件大小
- `multiple`: 是否支持多文件
- `disabled`: 是否禁用

#### FileManager
文件管理器组件，显示文件列表和管理操作。

```tsx
import { FileManager } from "@/components/features/file/FileManager";

const handlePlay = (fileId: number) => {
  // 播放文件
};

const handleDelete = (fileId: number) => {
  // 删除文件
};

<FileManager
  onPlay={handlePlay}
  onDelete={handleDelete}
  showTranscriptionStatus={true}
/>
```

#### FileCard
文件卡片组件，显示单个文件的信息和操作。

```tsx
import { FileCard } from "@/components/features/file/FileCard";

<FileCard
  file={{
    id: 1,
    name: "test.mp3",
    size: 1024 * 1024,
    duration: 120,
    uploadedAt: new Date(),
    status: "completed"
  }}
  onPlay={() => console.log("play")}
  onDelete={() => console.log("delete")}
  showProgress={true}
/>
```

### 3. 播放器组件

#### PlayerPage
主播放器页面组件，集成音频播放和字幕显示。

```tsx
import { PlayerPage } from "@/components/features/player/PlayerPage";

// 在路由中使用
// /player/[fileId]
<PlayerPage fileId="123" />
```

#### ScrollableSubtitleDisplay
可滚动的字幕显示组件。

```tsx
import { ScrollableSubtitleDisplay } from "@/components/features/player/ScrollableSubtitleDisplay";

<ScrollableSubtitleDisplay
  segments={[
    {
      start: 0,
      end: 2.5,
      text: "第一段字幕"
    }
  ]}
  currentTime={1.2}
  onSegmentClick={(segment) => console.log("点击片段:", segment)}
  highlightCurrent={true}
/>
```

#### PlayerFooter
播放器控制栏组件。

```tsx
import { PlayerFooter } from "@/components/features/player/PlayerFooter";

<PlayerFooter
  audioRef={audioRef}
  currentTime={currentTime}
  duration={duration}
  isPlaying={isPlaying}
  volume={volume}
  playbackRate={playbackRate}
  onPlayPause={() => setIsPlaying(!isPlaying)}
  onSeek={(time) => setCurrentTime(time)}
  onVolumeChange={(vol) => setVolume(vol)}
  onPlaybackRateChange={(rate) => setPlaybackRate(rate)}
/>
```

### 4. 布局组件

#### ThemeProvider
主题提供者组件。

```tsx
import { ThemeProvider } from "@/components/layout/contexts/ThemeContext";

<ThemeProvider defaultTheme="dark">
  <App />
</ThemeProvider>
```

#### QueryProvider
React Query 提供者组件。

```tsx
import { QueryProvider } from "@/components/layout/providers/QueryProvider";

<QueryProvider>
  <App />
</QueryProvider>
```

## Hook 使用

### useTranscription
转录状态管理 Hook。

```tsx
import { useTranscription } from "@/hooks/api/useTranscription";

const transcription = useTranscription();

const handleStartTranscription = () => {
  transcription.mutate({
    fileId: 123,
    language: "ja"
  });
};

if (transcription.isPending) {
  return <div>转录中...</div>;
}

if (transcription.error) {
  return <div>转录失败: {transcription.error.message}</div>;
}
```

### usePlayerDataQuery
播放器数据管理 Hook。

```tsx
import { usePlayerDataQuery } from "@/hooks/player/usePlayerDataQuery";

const {
  file,
  segments,
  transcript,
  audioUrl,
  loading,
  error,
  isTranscribing,
  transcriptionProgress,
  startTranscription
} = usePlayerDataQuery("123");

// 自动转录检测
if (!transcript && file && !isTranscribing) {
  // 组件会自动开始转录
}
```

### useFileStatus
文件状态管理 Hook。

```tsx
import { useFileStatus } from "@/hooks/useFileStatus";

const { data: status, isLoading } = useFileStatus(123);

const { startTranscription, isTranscribing } = useFileStatusManager(123);
```

## 样式系统

### Tailwind CSS 配置
项目使用 Tailwind CSS 进行样式开发，配置了自定义设计令牌。

```css
/* 在 globals.css 中 */
:root {
  /* 颜色系统 */
  --color-primary: 220 90% 56%;
  --color-secondary: 210 40% 96%;
  
  /* 间距系统 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  
  /* 字体系统 */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
}
```

### Class Variance Authority (CVA)
使用 CVA 管理组件变体。

```tsx
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
```

## 主题系统

### 支持的主题
- `light`: 浅色主题
- `dark`: 深色主题
- `system`: 跟随系统
- `high-contrast`: 高对比度主题

### 主题切换
```tsx
import { useTheme } from "@/components/layout/contexts/ThemeContext";

const { theme, setTheme } = useTheme();

// 切换到深色主题
setTheme("dark");

// 切换到系统主题
setTheme("system");
```

## 错误边界

### ErrorBoundary
全局错误边界组件。

```tsx
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

<ErrorBoundary
  fallback={<div>出现错误，请刷新页面</div>}
  onError={(error, errorInfo) => {
    console.error("组件错误:", error, errorInfo);
  }}
>
  <App />
</ErrorBoundary>
```

## 测试

### 组件测试示例
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("should handle click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## 最佳实践

### 1. 组件设计原则
- **单一职责**: 每个组件只负责一个功能
- **可复用性**: 通过 props 控制组件行为
- **可测试性**: 组件逻辑易于测试
- **可访问性**: 支持键盘导航和屏幕阅读器

### 2. 状态管理
- **本地状态**: 使用 useState, useReducer
- **服务器状态**: 使用 React Query
- **全局状态**: 使用 Context API
- **表单状态**: 使用 react-hook-form

### 3. 性能优化
- **懒加载**: 使用 React.lazy 和 Suspense
- **虚拟滚动**: 大列表使用 react-window
- **防抖节流**: 搜索和滚动事件
- **代码分割**: 按路由分割代码

### 4. 类型安全
- **TypeScript**: 严格的类型检查
- **接口定义**: 明确的 props 类型
- **泛型使用**: 提高组件复用性
- **类型导出**: 便于外部使用

---

*最后更新: 2025-01-31*  
*文档版本: 1.0.0*