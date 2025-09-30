# 架构设计文档

## 系统概述

Oumu.ai 采用**客户端优先的本地化架构**，实现了完整的音频转录、文本处理和语言学习功能。所有用户数据存储在本地 IndexedDB 中，通过流式处理与外部 AI 服务集成。

## 架构原则

### 1. 本地优先 (Local-First)
- **数据存储**: 所有用户数据存储在浏览器 IndexedDB 中
- **隐私保护**: 敏感数据不会上传到服务器
- **离线支持**: 支持离线使用和本地数据管理
- **用户控制**: 用户完全控制自己的数据

### 2. 微服务集成
- **Groq Whisper**: 高质量音频转录服务
- **Groq Moonshot**: 文本后处理服务
- **流式处理**: 音频文件流式传输，不落盘存储
- **API 抽象**: 统一的 API 客户端和错误处理

### 3. 响应式设计
- **现代 UI**: 基于 shadcn/ui 的响应式界面
- **渐进式增强**: PWA 支持和离线功能
- **设计令牌**: 统一的品牌/语义色、阴影、圆角和间距变量，驱动 light/dark 主题
- **无障碍**: 完整的 ARIA 支持和键盘导航
- **主题切换**: 深色/浅色模式（含系统偏好）

## 技术架构

### 1. 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     浏览器客户端                              │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (React + shadcn/ui)                               │
│  ├── Audio Player                                           │
│  ├── File Manager                                           │
│  ├── Subtitle Display                                       │
│  └── Settings Panel                                          │
├─────────────────────────────────────────────────────────────┤
│  Logic Layer (Custom Hooks)                                 │
│  ├── useAppState (全局状态)                                 │
│  ├── useAudioPlayer (播放控制)                              │
│  ├── useFiles (文件管理)                                    │
│  ├── useTranscripts (转录管理)                              │
│  └── useTranscriptionProgress (进度跟踪)                   │
├─────────────────────────────────────────────────────────────┤
│  Data Layer (IndexedDB + Dexie)                            │
│  ├── FileRow (音频文件)                                     │
│  ├── TranscriptRow (转录结果)                               │
│  ├── Segment (分句处理)                                     │
│  └── WordTimestamp (词级时间戳)                             │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (API Clients)                                │
│  ├── GroqClient (音频转录)                                  │
│  ├── GroqClient (文本处理)                                  │
│  └── ErrorHandler (错误处理)                                 │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    外部服务                                  │
├─────────────────────────────────────────────────────────────┤
│  Groq Whisper API (音频转录)                               │
│  Groq Moonshot API (文本处理)                              │
│  CDN (静态资源)                                            │
└─────────────────────────────────────────────────────────────┘
```

### 2. 技术栈详细说明

#### 前端框架
- **Next.js 15**: 使用 App Router，支持 SSR 和静态生成
- **React 19**: 最新版本，支持并发特性
- **TypeScript 5.9**: 严格类型检查，提供类型安全
- **shadcn/ui**: 基于 Radix UI 的现代组件库

#### 数据管理
- **Dexie 4.2**: IndexedDB 封装，提供本地数据库功能
- **Zod 4.1**: 运行时类型验证和模式定义
- **React Hooks**: 状态管理和副作用处理
- **Query 模式**: 数据获取和缓存策略

#### 样式和UI
- **Tailwind CSS 4.1**: 原子化 CSS 框架
- **Lucide React**: 统一的图标系统
- **Framer Motion 12**: 动画和过渡效果
- **next-themes**: 主题切换支持

#### 开发工具
- **Biome.js 2.2**: 代码格式化和 linting
- **Jest 30.1**: 单元测试框架
- **React Testing Library**: 组件测试
- **fake-indexeddb**: 测试环境数据库模拟

## 数据模型设计

### 1. 核心实体关系

```
FileRow (1) ── (N) TranscriptRow (1) ── (N) Segment
    │                                      │
    │                                      └── (N) WordTimestamp
    │
    └── AudioPlayerState
```

### 2. 数据模型详细定义

#### FileRow (音频文件)
```typescript
interface FileRow {
  id?: number;              // 主键
  name: string;             // 文件名
  size: number;             // 文件大小（字节）
  type: string;             // MIME 类型
  blob: Blob;               // 音频文件二进制数据
  duration?: number;        // 音频时长（秒）
  createdAt: Date;          // 创建时间
  updatedAt: Date;          // 更新时间
}
```

#### TranscriptRow (转录结果)
```typescript
interface TranscriptRow {
  id?: number;              // 主键
  fileId: number;           // 关联文件ID
  status: ProcessingStatus; // 处理状态
  rawText?: string;         // 原始转录文本
  language?: string;         // 检测语言
  error?: string;           // 错误信息
  processingTime?: number;   // 处理时间（毫秒）
  createdAt: Date;          // 创建时间
  updatedAt: Date;          // 更新时间
}

type ProcessingStatus = "pending" | "processing" | "completed" | "failed";
```

#### Segment (分句处理)
```typescript
interface Segment {
  id?: number;              // 主键
  transcriptId: number;      // 关联转录ID
  start: number;            // 开始时间（秒）
  end: number;              // 结束时间（秒）
  text: string;             // 原始文本
  normalizedText?: string;   // 规范化文本
  translation?: string;      // 翻译文本
  annotations?: string[];    // 语法注释
  furigana?: string;         // 假名标注
  wordTimestamps?: WordTimestamp[]; // 词级时间戳
  createdAt: Date;          // 创建时间
  updatedAt: Date;          // 更新时间
}
```

#### WordTimestamp (词级时间戳)
```typescript
interface WordTimestamp {
  word: string;             // 单词文本
  start: number;            // 开始时间（秒）
  end: number;              // 结束时间（秒）
  confidence?: number;      // 置信度
}
```

### 3. 数据库版本控制

#### Version 1 (基础结构)
```typescript
// 初始版本，支持基本的文件和转录管理
stores: {
  files: '++id,name,size,type,createdAt',
  transcripts: '++id,fileId,status,createdAt',
  segments: '++id,transcriptId,start,end,createdAt'
}
```

#### Version 2 (时间戳支持)
```typescript
// 添加 updatedAt 字段用于缓存和同步
stores: {
  files: '++id,name,size,type,createdAt,updatedAt',
  transcripts: '++id,fileId,status,createdAt,updatedAt',
  segments: '++id,transcriptId,start,end,createdAt,updatedAt'
}
```

#### Version 3 (词级时间戳)
```typescript
// 添加 wordTimestamps 支持精确的字幕同步
stores: {
  files: '++id,name,size,type,createdAt,updatedAt',
  transcripts: '++id,fileId,status,createdAt,updatedAt',
  segments: '++id,transcriptId,start,end,createdAt,updatedAt,wordTimestamps'
}
```

## 状态管理模式

### 1. 分散式状态管理

采用基于 React Hooks 的分散式状态管理模式，每个功能模块都有对应的状态管理 Hook：

```typescript
// 全局应用状态
const useAppState = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState('zh');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  return { theme, setTheme, language, setLanguage, settings, setSettings };
};

// 文件管理状态
const useFiles = () => {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  return { files, setFiles, uploading, setUploading, progress, setProgress };
};

// 播放器状态
const useAudioPlayer = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  return { currentTime, setCurrentTime, duration, setDuration, isPlaying, setIsPlaying, volume, setVolume, isMuted, setIsMuted };
};
```

### 2. 状态更新模式

#### 单向数据流
```
用户操作 → Action → State Update → UI Re-render
```

#### 状态同步机制
- **IndexedDB 持久化**: 状态变更自动同步到本地数据库
- **React Context**: 跨组件状态共享
- **自定义 Hooks**: 逻辑复用和状态封装
- **Zod 验证**: 状态数据类型验证

### 3. 错误处理策略

#### 统一错误处理
```typescript
interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
}

enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

const handleError = (error: any) => {
  const appError: AppError = {
    type: mapErrorType(error),
    message: error.message || 'Unknown error',
    details: error.details,
    timestamp: new Date()
  };
  
  // 记录错误
  console.error('App Error:', appError);
  
  // 显示用户友好的错误消息
  toast.error(appError.message);
  
  // 发送错误报告（可选）
  if (process.env.NODE_ENV === 'production') {
    sendErrorReport(appError);
  }
};
```

## API 设计

### 1. RESTful API 设计

#### 转录 API
- **端点**: `POST /api/transcribe`
- **功能**: 使用 Groq Whisper-large-v3-turbo 进行音频转录
- **输入**: 音频文件 + 元数据
- **输出**: 转录文本 + 时间戳 + 语言检测

#### 后处理 API
- **端点**: `POST /api/postprocess`
- **功能**: 使用 Groq Moonshot 进行文本处理
- **处理内容**: 分句规范化、翻译、注释、假名标注
- **输出**: 处理后的分段文本 + 元数据

#### 进度查询 API
- **端点**: `GET /api/progress/[fileId]`
- **功能**: 实时查询处理进度
- **输出**: 进度百分比 + 状态信息

### 2. API 客户端设计

#### 统一 API 客户端
```typescript
class APIClient {
  private baseURL: string;
  private retryConfig: RetryConfig;

  constructor(baseURL: string, retryConfig?: Partial<RetryConfig>) {
    this.baseURL = baseURL;
    this.retryConfig = { ...defaultRetryConfig, ...retryConfig };
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new APIError(data.message, response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkError(error.message);
    }
  }
}
```

#### 错误重试策略
```typescript
const retryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: ['NETWORK_ERROR', 'API_ERROR', 'RATE_LIMIT_ERROR']
};
```

## 性能优化策略

### 1. 音频处理优化

#### 分块处理
```typescript
const CHUNK_SECONDS = 45;      // 每块45秒
const CHUNK_OVERLAP = 0.2;     // 重叠0.2秒
const MAX_CONCURRENCY = 3;     // 最大并发数
```

#### 流式传输
```typescript
async function* streamAudioToAPI(
  audioFile: File,
  chunkSize: number
): AsyncGenerator<Blob, void, unknown> {
  const totalChunks = Math.ceil(audioFile.size / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, audioFile.size);
    const chunk = audioFile.slice(start, end);
    
    yield chunk;
    
    // 添加延迟避免速率限制
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### 2. 数据同步优化

#### 二分查找算法
```typescript
function findCurrentSegment(
  segments: Segment[],
  currentTime: number
): Segment | null {
  let left = 0;
  let right = segments.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const segment = segments[mid];
    
    if (currentTime >= segment.start && currentTime <= segment.end) {
      return segment;
    } else if (currentTime < segment.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  return null;
}
```

#### 虚拟滚动
```typescript
const VirtualScrollList = ({ segments, currentTime }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const listRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const currentSegmentIndex = segments.findIndex(
      s => currentTime >= s.start && currentTime <= s.end
    );
    
    if (currentSegmentIndex >= 0) {
      const start = Math.max(0, currentSegmentIndex - 5);
      const end = Math.min(segments.length, currentSegmentIndex + 15);
      setVisibleRange({ start, end });
    }
  }, [currentTime, segments]);
  
  const visibleSegments = segments.slice(visibleRange.start, visibleRange.end);
  
  return (
    <div ref={listRef} className="virtual-scroll-list">
      {visibleSegments.map(segment => (
        <SegmentComponent key={segment.id} segment={segment} />
      ))}
    </div>
  );
};
```

### 3. 内存管理

#### 及时清理
```typescript
const useMemoryCleanup = () => {
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // 清理不再需要的音频数据
      cleanupOldAudioData();
      
      // 清理内存中的大型对象
      cleanupLargeObjects();
      
      // 触发垃圾回收（如果可用）
      if (typeof gc !== 'undefined') {
        gc();
      }
    }, 5 * 60 * 1000); // 每5分钟清理一次
    
    return () => clearInterval(cleanupInterval);
  }, []);
};
```

## 安全性设计

### 1. 数据安全

#### 本地存储策略
```typescript
const secureStorage = {
  async set(key: string, value: any) {
    // 数据加密存储
    const encrypted = await encrypt(JSON.stringify(value));
    localStorage.setItem(key, encrypted);
  },
  
  async get(key: string) {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    try {
      const decrypted = await decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }
};
```

#### API 密钥保护
```typescript
// 环境变量配置
const config = {
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    baseUrl: 'https://api.groq.com',
    model: 'whisper-large-v3-turbo'
  },
  
  // 客户端可访问的配置
  getClientConfig() {
    return {
      features: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['audio/mp3', 'audio/wav', 'audio/m4a'],
        chunkSize: 45 * 1024 * 1024 // 45MB
      }
    };
  }
};
```

### 2. 输入验证

#### Zod 模式验证
```typescript
const TranscriptSchema = z.object({
  id: z.number().optional(),
  fileId: z.number(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  rawText: z.string().optional(),
  language: z.string().optional(),
  error: z.string().optional(),
  processingTime: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

const validatedData = TranscriptSchema.parse(rawData);
```

#### XSS 防护
```typescript
import DOMPurify from 'dompurify';

function sanitizeUserInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'span', 'strong', 'em'],
    ALLOWED_ATTR: ['class', 'data-*']
  });
}
```

## 扩展性设计

### 1. 插件架构

#### 模块化设计
```typescript
interface ServicePlugin {
  name: string;
  version: string;
  initialize(): Promise<void>;
  process(input: any): Promise<any>;
  cleanup(): Promise<void>;
}

const serviceRegistry = {
  plugins: new Map<string, ServicePlugin>(),
  
  register(plugin: ServicePlugin) {
    this.plugins.set(plugin.name, plugin);
  },
  
  async process(serviceName: string, input: any) {
    const plugin = this.plugins.get(serviceName);
    if (!plugin) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    return await plugin.process(input);
  }
};
```

### 2. 配置驱动

#### 可配置的处理流程
```typescript
interface ProcessingPipeline {
  name: string;
  steps: ProcessingStep[];
  config: Record<string, any>;
}

interface ProcessingStep {
  name: string;
  service: string;
  params: Record<string, any>;
  condition?: (input: any) => boolean;
}

const pipeline = {
  name: 'audio-transcription',
  steps: [
    {
      name: 'split-audio',
      service: 'audio-processor',
      params: { chunkSize: 45, overlap: 0.2 }
    },
    {
      name: 'transcribe',
      service: 'groq-whisper',
      params: { model: 'whisper-large-v3-turbo' }
    },
    {
      name: 'post-process',
      service: 'groq-moonshot',
      params: { enableTranslation: true }
    }
  ]
};
```

## 监控和诊断

### 1. 性能监控

#### 关键指标
```typescript
const metrics = {
  // 转录性能
  transcriptionTime: [],
  accuracy: [],
  
  // 系统性能
  memoryUsage: [],
  processingSpeed: [],
  
  // 用户体验
  loadTime: [],
  responseTime: []
};
```

#### 性能监控实现
```typescript
const performanceMonitor = {
  track(name: string, value: number, tags = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };
    
    // 存储到本地
    this.metrics.push(metric);
    
    // 如果超过阈值，发送警报
    if (value > this.getThreshold(name)) {
      this.alert(name, value, tags);
    }
    
    // 定期清理旧数据
    this.cleanup();
  },
  
  getThreshold(name: string) {
    const thresholds = {
      'transcription.time': 300000, // 5分钟
      'memory.usage': 100 * 1024 * 1024, // 100MB
      'api.error.rate': 0.05 // 5%
    };
    
    return thresholds[name] || Infinity;
  }
};
```

### 2. 错误追踪

#### 错误报告
```typescript
const errorTracker = {
  async capture(error: Error, context = {}) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      type: error.name,
      timestamp: new Date().toISOString(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // 本地存储
    this.storeError(errorReport);
    
    // 发送到错误追踪服务（可选）
    if (this.shouldReport(error)) {
      await this.sendReport(errorReport);
    }
  },
  
  shouldReport(error: Error) {
    // 根据错误类型和环境决定是否上报
    return process.env.NODE_ENV === 'production' && 
           error.name !== 'NetworkError';
  }
};
```

---

*最后更新: 2025年1月*