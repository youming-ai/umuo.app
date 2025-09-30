# 进度 API 文档

本文档详细说明了进度查询 API (`/api/progress/[fileId]`) 的使用方法、响应格式和最佳实践。

## 概览

进度 API 提供实时查询文件处理状态的功能，包括音频转录、文本处理等各个阶段的进度信息。

### 特性

- **实时进度**: 实时查询处理进度
- **详细状态**: 提供详细的处理步骤信息
- **错误信息**: 包含错误详情和恢复建议
- **时间预估**: 提供预计完成时间
- **轻量级**: 最小化的响应数据

## 端点信息

- **方法**: `GET`
- **路径**: `/api/progress/[fileId]`
- **内容类型**: `application/json`
- **认证**: 无

## 请求格式

### 路径参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `fileId` | string | 是 | 文件唯一标识符 |

### 示例请求

```bash
# 查询文件处理进度
curl -X GET "http://localhost:3000/api/progress/abc123"

# JavaScript 示例
const response = await fetch('/api/progress/abc123');
const progress = await response.json();
```

## 响应格式

### 成功响应

```typescript
interface ProgressResponse {
  progress: number;              // 进度百分比 (0-100)
  status: ProgressStatus;        // 处理状态
  error?: string;               // 错误信息（如果有）
  currentStep?: string;         // 当前处理步骤
  estimatedTime?: number;       // 预计剩余时间（秒）
  details?: ProgressDetails;    // 详细进度信息
  timestamp: string;           // 响应时间戳
}

type ProgressStatus =
  | 'pending'      // 等待处理
  | 'uploading'    // 文件上传
  | 'transcribing' // 音频转录
  | 'segmenting'   // 文本分段
  | 'translating'  // 翻译处理
  | 'annotating'   // 注释生成
  | 'finalizing'   // 最终处理
  | 'completed'    // 已完成
  | 'error'        // 处理错误
  | 'cancelled'    // 已取消
```

### 详细进度信息

```typescript
interface ProgressDetails {
  steps: ProgressStep[];        // 处理步骤详情
  startTime: string;            // 开始时间
  processedBytes?: number;      // 已处理的字节数
  totalBytes?: number;          // 总字节数
  processedSegments?: number;   // 已处理的分段数
  totalSegments?: number;       // 总分段数
  retries: number;              // 重试次数
  performance: {
    speed: number;              // 处理速度（字节/秒）
    efficiency: number;         // 效率（0-1）
  };
}

interface ProgressStep {
  name: string;                 // 步骤名称
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;             // 步骤进度 (0-100)
  startTime?: string;           // 步骤开始时间
  endTime?: string;             // 步骤结束时间
  duration?: number;            // 步骤持续时间（秒）
  error?: string;               // 步骤错误信息
}
```

### 响应示例

#### 处理中状态
```json
{
  "progress": 65,
  "status": "transcribing",
  "currentStep": "音频转录",
  "estimatedTime": 120,
  "details": {
    "steps": [
      {
        "name": "uploading",
        "status": "completed",
        "progress": 100,
        "startTime": "2024-09-24T10:00:00.000Z",
        "endTime": "2024-09-24T10:00:30.000Z",
        "duration": 30
      },
      {
        "name": "transcribing",
        "status": "processing",
        "progress": 65,
        "startTime": "2024-09-24T10:00:30.000Z"
      }
    ],
    "startTime": "2024-09-24T10:00:00.000Z",
    "processedBytes": 32768000,
    "totalBytes": 50331648,
    "retries": 0,
    "performance": {
      "speed": 1092266,
      "efficiency": 0.85
    }
  },
  "timestamp": "2024-09-24T10:01:45.000Z"
}
```

#### 完成状态
```json
{
  "progress": 100,
  "status": "completed",
  "currentStep": "处理完成",
  "details": {
    "steps": [
      {
        "name": "uploading",
        "status": "completed",
        "progress": 100,
        "startTime": "2024-09-24T10:00:00.000Z",
        "endTime": "2024-09-24T10:00:30.000Z",
        "duration": 30
      },
      {
        "name": "transcribing",
        "status": "completed",
        "progress": 100,
        "startTime": "2024-09-24T10:00:30.000Z",
        "endTime": "2024-09-24T10:03:15.000Z",
        "duration": 165
      },
      {
        "name": "segmenting",
        "status": "completed",
        "progress": 100,
        "startTime": "2024-09-24T10:03:15.000Z",
        "endTime": "2024-09-24T10:03:45.000Z",
        "duration": 30
      },
      {
        "name": "translating",
        "status": "completed",
        "progress": 100,
        "startTime": "2024-09-24T10:03:45.000Z",
        "endTime": "2024-09-24T10:04:30.000Z",
        "duration": 45
      },
      {
        "name": "finalizing",
        "status": "completed",
        "progress": 100,
        "startTime": "2024-09-24T10:04:30.000Z",
        "endTime": "2024-09-24T10:04:45.000Z",
        "duration": 15
      }
    ],
    "startTime": "2024-09-24T10:00:00.000Z",
    "processedSegments": 156,
    "totalSegments": 156,
    "retries": 1,
    "performance": {
      "speed": 1125899,
      "efficiency": 0.92
    }
  },
  "timestamp": "2024-09-24T10:04:45.000Z"
}
```

#### 错误状态
```json
{
  "progress": 45,
  "status": "error",
  "error": "音频转录失败: 网络连接超时",
  "currentStep": "音频转录",
  "details": {
    "steps": [
      {
        "name": "uploading",
        "status": "completed",
        "progress": 100,
        "startTime": "2024-09-24T10:00:00.000Z",
        "endTime": "2024-09-24T10:00:30.000Z",
        "duration": 30
      },
      {
        "name": "transcribing",
        "status": "error",
        "progress": 45,
        "startTime": "2024-09-24T10:00:30.000Z",
        "error": "网络连接超时，已重试3次"
      }
    ],
    "startTime": "2024-09-24T10:00:00.000Z",
    "processedBytes": 22649241,
    "totalBytes": 50331648,
    "retries": 3,
    "performance": {
      "speed": 754974,
      "efficiency": 0.45
    }
  },
  "timestamp": "2024-09-24T10:05:15.000Z"
}
```

## 状态说明

### 状态定义

| 状态 | 说明 | 进度范围 | 可恢复 |
|------|------|----------|--------|
| `pending` | 等待处理 | 0 | 是 |
| `uploading` | 文件上传中 | 1-15 | 是 |
| `transcribing` | 音频转录中 | 16-60 | 是 |
| `segmenting` | 文本分段中 | 61-75 | 是 |
| `translating` | 翻译处理中 | 76-90 | 是 |
| `finalizing` | 最终处理中 | 91-99 | 是 |
| `completed` | 已完成 | 100 | - |
| `error` | 处理错误 | - | 部分 |
| `cancelled` | 已取消 | - | 是 |

### 错误类型

| 错误类型 | 说明 | 可恢复 |
|---------|------|--------|
| 网络错误 | 连接超时、网络中断 | 是 |
| API错误 | 外部服务不可用 | 是 |
| 文件错误 | 文件损坏、格式不支持 | 否 |
| 处理错误 | 处理逻辑错误 | 部分 |
| 取消错误 | 用户取消操作 | 是 |

## 使用示例

### 基础查询

```typescript
class ProgressTracker {
  private apiBaseURL: string;

  constructor(apiBaseURL: string) {
    this.apiBaseURL = apiBaseURL;
  }

  async getProgress(fileId: string): Promise<ProgressResponse> {
    const response = await fetch(`${this.apiBaseURL}/api/progress/${fileId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch progress: ${response.statusText}`);
    }

    return response.json();
  }

  async waitForCompletion(
    fileId: string,
    onProgress?: (progress: ProgressResponse) => void,
    options: {
      interval?: number;
      timeout?: number;
    } = {}
  ): Promise<ProgressResponse> {
    const { interval = 1000, timeout = 300000 } = options;
    const startTime = Date.now();

    while (true) {
      const progress = await this.getProgress(fileId);
      onProgress?.(progress);

      // 检查是否完成或出错
      if (progress.status === 'completed') {
        return progress;
      }

      if (progress.status === 'error') {
        throw new Error(progress.error || 'Processing failed');
      }

      // 检查超时
      if (Date.now() - startTime > timeout) {
        throw new Error('Progress tracking timeout');
      }

      // 等待下次查询
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
}
```

### React Hook

```typescript
function useProgress(fileId?: string) {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) return;

    let mounted = true;
    const tracker = new ProgressTracker('/api');

    const trackProgress = async () => {
      try {
        setLoading(true);
        setError(null);

        await tracker.waitForCompletion(
          fileId,
          (progressData) => {
            if (mounted) {
              setProgress(progressData);
            }
          },
          { interval: 1000, timeout: 300000 }
        );
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Progress tracking failed');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    trackProgress();

    return () => {
      mounted = false;
    };
  }, [fileId]);

  return { progress, loading, error };
}
```

### 多文件进度跟踪

```typescript
class MultiFileProgressTracker {
  private trackers = new Map<string, ProgressTracker>();
  private listeners = new Map<string, Set<(progress: ProgressResponse) => void>>();

  trackFile(fileId: string): ProgressTracker {
    if (!this.trackers.has(fileId)) {
      this.trackers.set(fileId, new ProgressTracker('/api'));
    }
    return this.trackers.get(fileId)!;
  }

  addProgressListener(
    fileId: string,
    callback: (progress: ProgressResponse) => void
  ): () => void {
    if (!this.listeners.has(fileId)) {
      this.listeners.set(fileId, new Set());
    }
    this.listeners.get(fileId)!.add(callback);

    return () => {
      this.listeners.get(fileId)?.delete(callback);
    };
  }

  async trackMultipleFiles(
    fileIds: string[],
    onProgress?: (fileId: string, progress: ProgressResponse) => void
  ): Promise<Map<string, ProgressResponse>> {
    const results = new Map<string, ProgressResponse>();
    const promises = fileIds.map(async (fileId) => {
      try {
        const tracker = this.trackFile(fileId);
        const result = await tracker.waitForCompletion(
          fileId,
          (progress) => {
            onProgress?.(fileId, progress);
            // 通知监听器
            this.listeners.get(fileId)?.forEach(cb => cb(progress));
          }
        );
        results.set(fileId, result);
      } catch (error) {
        console.error(`Failed to track progress for file ${fileId}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }
}
```

## 性能优化

### 轮询优化

```typescript
class OptimizedProgressTracker {
  private pollIntervals = new Map<string, number>();

  async trackProgress(
    fileId: string,
    onProgress: (progress: ProgressResponse) => void,
    options: {
      initialInterval?: number;
      maxInterval?: number;
      backoffFactor?: number;
    } = {}
  ): Promise<void> {
    const {
      initialInterval = 500,
      maxInterval = 5000,
      backoffFactor = 1.5
    } = options;

    let currentInterval = initialInterval;
    let lastProgress = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/progress/${fileId}`);
        const progress = await response.json();

        onProgress(progress);

        // 动态调整轮询间隔
        if (progress.progress !== lastProgress) {
          // 进度有变化，重置间隔
          currentInterval = initialInterval;
          lastProgress = progress.progress;
        } else {
          // 进度无变化，增加间隔
          currentInterval = Math.min(currentInterval * backoffFactor, maxInterval);
        }

        // 继续轮询直到完成
        if (progress.status !== 'completed' && progress.status !== 'error') {
          this.pollIntervals.set(
            fileId,
            setTimeout(poll, currentInterval) as unknown as number
          );
        }
      } catch (error) {
        console.error('Progress polling error:', error);
        // 错误时也继续轮询，但使用更长的间隔
        this.pollIntervals.set(
          fileId,
          setTimeout(poll, maxInterval) as unknown as number
        );
      }
    };

    // 开始轮询
    poll();
  }

  stopTracking(fileId: string): void {
    const interval = this.pollIntervals.get(fileId);
    if (interval) {
      clearTimeout(interval);
      this.pollIntervals.delete(fileId);
    }
  }
}
```

### 批量查询

```typescript
class BatchProgressTracker {
  private batchQueue: Array<{
    fileIds: string[];
    resolve: (results: Map<string, ProgressResponse>) => void;
    reject: (error: Error) => void;
  }> = [];

  private processing = false;
  private batchSize = 10; // 每批查询10个文件

  async getBatchProgress(fileIds: string[]): Promise<Map<string, ProgressResponse>> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ fileIds, resolve, reject });

      if (!this.processing) {
        this.processBatch();
      }
    });
  }

  private async processBatch() {
    this.processing = true;

    while (this.batchQueue.length > 0) {
      const batch = this.batchQueue.splice(0, this.batchSize);
      const allFileIds = new Set<string>();

      // 收集所有需要查询的文件ID
      batch.forEach(({ fileIds }) => {
        fileIds.forEach(id => allFileIds.add(id));
      });

      try {
        // 批量查询进度
        const results = await this.queryMultipleProgress(Array.from(allFileIds));

        // 分发结果
        batch.forEach(({ fileIds, resolve }) => {
          const fileResults = new Map<string, ProgressResponse>();
          fileIds.forEach(id => {
            const progress = results.get(id);
            if (progress) {
              fileResults.set(id, progress);
            }
          });
          resolve(fileResults);
        });
      } catch (error) {
        // 批量查询失败，逐个查询
        for (const { fileIds, resolve, reject } of batch) {
          try {
            const results = new Map<string, ProgressResponse>();
            for (const fileId of fileIds) {
              const response = await fetch(`/api/progress/${fileId}`);
              const progress = await response.json();
              results.set(fileId, progress);
            }
            resolve(results);
          } catch (err) {
            reject(err as Error);
          }
        }
      }

      // 批次间延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  private async queryMultipleProgress(
    fileIds: string[]
  ): Promise<Map<string, ProgressResponse>> {
    const results = new Map<string, ProgressResponse>();

    // 并发查询
    const promises = fileIds.map(async (fileId) => {
      try {
        const response = await fetch(`/api/progress/${fileId}`);
        const progress = await response.json();
        results.set(fileId, progress);
      } catch (error) {
        console.error(`Failed to query progress for ${fileId}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }
}
```

## 错误处理

### 错误恢复策略

```typescript
class ProgressErrorHandler {
  static async handleProgressError(
    fileId: string,
    error: Error,
    maxRetries: number = 3
  ): Promise<boolean> {
    console.error(`Progress tracking error for file ${fileId}:`, error);

    // 检查错误类型
    if (error.message.includes('404')) {
      console.error('File not found, may have been deleted');
      return false;
    }

    if (error.message.includes('Network Error')) {
      console.log('Network error, attempting to reconnect...');
      return this.retryWithBackoff(fileId, maxRetries);
    }

    if (error.message.includes('timeout')) {
      console.log('Timeout error, reducing poll frequency');
      return this.retryWithReducedFrequency(fileId);
    }

    return false;
  }

  private static async retryWithBackoff(
    fileId: string,
    maxRetries: number
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        const response = await fetch(`/api/progress/${fileId}`);
        return response.ok;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('Max retries reached for file:', fileId);
          return false;
        }
      }
    }
    return false;
  }

  private static async retryWithReducedFrequency(fileId: string): Promise<boolean> {
    try {
      // 使用较低的频率重试
      await new Promise(resolve => setTimeout(resolve, 5000));
      const response = await fetch(`/api/progress/${fileId}`);
      return response.ok;
    } catch (error) {
      console.error('Failed to retry with reduced frequency:', error);
      return false;
    }
  }
}
```

## 最佳实践

### 1. 合理的轮询间隔

```typescript
// 根据处理阶段调整轮询间隔
function getOptimalPollInterval(progress: ProgressResponse): number {
  switch (progress.status) {
    case 'uploading':
      return 500;  // 快速上传阶段
    case 'transcribing':
      return 2000; // 转录需要时间
    case 'segmenting':
      return 1000; // 分段相对快速
    case 'translating':
      return 3000; // 翻译最耗时
    case 'finalizing':
      return 1000; // 最终处理较快
    default:
      return 1000;
  }
}
```

### 2. 进度缓存

```typescript
class ProgressCache {
  private cache = new Map<string, {
    progress: ProgressResponse;
    timestamp: number;
  }>();

  private ttl = 5000; // 5秒缓存

  get(fileId: string): ProgressResponse | null {
    const item = this.cache.get(fileId);

    if (!item) {
      return null;
    }

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(fileId);
      return null;
    }

    return item.progress;
  }

  set(fileId: string, progress: ProgressResponse): void {
    this.cache.set(fileId, {
      progress,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 3. 用户友好的进度显示

```typescript
function getProgressDisplay(progress: ProgressResponse): {
  percentage: number;
  statusText: string;
  timeRemaining?: string;
  color: string;
} {
  const percentage = Math.round(progress.progress);
  let statusText = '';
  let color = 'text-blue-600';

  switch (progress.status) {
    case 'pending':
      statusText = '等待处理';
      color = 'text-gray-600';
      break;
    case 'uploading':
      statusText = '上传中';
      color = 'text-blue-600';
      break;
    case 'transcribing':
      statusText = '音频转录';
      color = 'text-purple-600';
      break;
    case 'segmenting':
      statusText = '文本分段';
      color = 'text-green-600';
      break;
    case 'translating':
      statusText = '翻译处理';
      color = 'text-orange-600';
      break;
    case 'finalizing':
      statusText = '最终处理';
      color = 'text-indigo-600';
      break;
    case 'completed':
      statusText = '已完成';
      color = 'text-green-600';
      break;
    case 'error':
      statusText = '处理失败';
      color = 'text-red-600';
      break;
    default:
      statusText = '未知状态';
      color = 'text-gray-600';
  }

  const timeRemaining = progress.estimatedTime
    ? formatDuration(progress.estimatedTime)
    : undefined;

  return {
    percentage,
    statusText,
    timeRemaining,
    color
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}分钟`;
  } else {
    return `${Math.round(seconds / 3600)}小时`;
  }
}
```

---

*最后更新: 2024年9月24日*