# 转录 API 文档

本文档详细说明了音频转录 API (`/api/transcribe`) 的使用方法、参数格式和响应结构。

## 概览

转录 API 使用 Groq Whisper-large-v3-turbo 模型进行高质量的音频转录。支持多种音频格式，提供精确的时间戳和分段信息。

### 特性

- **高质量转录**: 使用 Groq Whisper-large-v3-turbo 模型
- **多格式支持**: MP3, WAV, M4A, OGG 等常见格式
- **分块处理**: 支持大文件分块处理
- **时间戳精确**: 提供段落级别的时间戳信息
- **多语言检测**: 自动检测音频语言
- **流式处理**: 高效的流式音频处理

## 端点信息

- **方法**: `POST`
- **路径**: `/api/transcribe`
- **内容类型**: `multipart/form-data`
- **认证**: 通过 API 密钥（服务端）

## 请求格式

### Query 参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `fileId` | string | 是 | - | 文件唯一标识符 |
| `chunkIndex` | number | 否 | - | 分块索引（分块处理时使用） |
| `offsetSec` | number | 否 | 0 | 时间偏移（秒） |
| `language` | string | 否 | "auto" | 目标语言代码 |

### Form Data

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `audio` | Blob | 是 | 音频文件块 |
| `meta` | string | 否 | JSON 格式的元数据 |

### 元数据结构

```typescript
interface TranscribeMeta {
  fileId?: string;         // 文件唯一标识符
  chunkIndex?: number;    // 分块索引
  offsetSec?: number;     // 时间偏移（秒）
}
```

#### 语言支持

| 代码 | 语言 |
|------|------|
| `auto` | 自动检测 |
| `en` | 英语 |
| `zh` | 中文 |
| `ja` | 日语 |
| `ko` | 韩语 |
| `es` | 西班牙语 |
| `fr` | 法语 |
| `de` | 德语 |

#### 音频格式支持

| 格式 | MIME 类型 | 最大文件大小 |
|------|-----------|-------------|
| MP3 | `audio/mpeg` | 100MB |
| WAV | `audio/wav` | 100MB |
| M4A | `audio/mp4` | 100MB |
| OGG | `audio/ogg` | 100MB |
| FLAC | `audio/flac` | 100MB |

## 响应格式

### 成功响应

```typescript
interface TranscribeSuccessResponse {
  ok: true;
  status: "completed";
  data: {
    text: string;           // 完整转录文本
    language?: string;      // 检测到的语言
    duration?: number;      // 音频时长（秒）
    segments?: Array<{
      id: number;           // 段落ID
      seek: number;         // 查找位置
      start: number;        // 开始时间（秒）
      end: number;          // 结束时间（秒）
      text: string;         // 段落文本
      tokens: number[];     // 词元数组
      temperature: number;  // 温度参数
      avg_logprob: number;  // 平均对数概率
      compression_ratio: number; // 压缩比率
      no_speech_prob: number; // 无语音概率
    }>;
  };
  meta?: TranscribeMeta;    // 原始元数据
}
```

### 错误响应

```typescript
interface TranscribeErrorResponse {
  ok: false;
  error: {
    code: 'VALIDATION_ERROR' | 'TRANSCRIPTION_FAILED' | 'INTERNAL_ERROR';
    message: string;
    details?: any;
    statusCode: number;
  };
}
```

## 分块处理

### 分块策略

大文件会自动分块处理，采用以下策略：

```typescript
const CHUNK_SECONDS = 45;    // 每块45秒
const CHUNK_OVERLAP = 0.2;   // 重叠0.2秒
const MAX_CONCURRENCY = 3;   // 最大并发数
```

### 分块示例

```typescript
// 分块处理逻辑
async function processLargeFile(file: File, fileId: string) {
  const chunks = splitAudioIntoChunks(file, CHUNK_SECONDS, CHUNK_OVERLAP);

  const results = await Promise.all(
    chunks.map(async (chunk, index) => {
      return transcribeChunk(chunk, fileId, index);
    })
  );

  return mergeTranscriptionResults(results);
}
```

## 错误处理

### 常见错误

| 错误类型 | HTTP 状态码 | 说明 |
|---------|-------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `TRANSCRIPTION_FAILED` | 500 | Groq API 错误 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

### 错误示例

```typescript
// 参数验证错误
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "issue_0": {
        "code": "invalid_type",
        "message": "fileId is required",
        "path": "fileId"
      }
    },
    "statusCode": 400
  }
}

// 转录失败
{
  "ok": false,
  "error": {
    "code": "TRANSCRIPTION_FAILED",
    "message": "Audio transcription failed",
    "details": {
      "error": "Groq API timeout"
    },
    "statusCode": 500
  }
}
```

## 使用示例

### JavaScript 客户端

```typescript
class TranscriptionService {
  private apiClient: OumuAPIClient;

  constructor(baseURL: string) {
    this.apiClient = new OumuAPIClient(baseURL);
  }

  async transcribeAudio(
    file: File,
    options: TranscribeOptions = {}
  ): Promise<TranscriptionResult> {
    const fileId = generateFileId();

    // 分块处理大文件
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return this.transcribeLargeFile(file, fileId, options);
    } else {
      return this.transcribeSingleFile(file, fileId, options);
    }
  }

  private async transcribeLargeFile(
    file: File,
    fileId: string,
    options: TranscribeOptions
  ): Promise<TranscriptionResult> {
    const chunks = await this.splitAudioFile(file);
    const results: any[] = [];

    // 并发处理分块
    const semaphore = new Semaphore(MAX_CONCURRENCY);

    await Promise.all(chunks.map(async (chunk, index) => {
      await semaphore.acquire();

      try {
        const result = await this.transcribeChunk(chunk, fileId, index, options);
        results[index] = result.segments;
      } finally {
        semaphore.release();
      }
    }));

    return this.mergeResults(results);
  }

  private async transcribeChunk(
    chunk: Blob,
    fileId: string,
    chunkIndex: number,
    options: TranscribeOptions
  ): Promise<any> {
    const formData = new FormData();
    formData.append('audio', chunk);
    formData.append('meta', JSON.stringify({
      fileId,
      chunkIndex
    }));

    const params = new URLSearchParams({
      fileId,
      language: options.language || 'auto'
    });

    const response = await fetch(`/api/transcribe?${params}`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return result.data;
  }

  private async splitAudioFile(file: File): Promise<Blob[]> {
    // 实现音频文件分块逻辑
    // 这里简化为固定分块
    const chunks: Blob[] = [];
    const chunkSize = 45 * 1024 * 1024; // 45MB

    for (let i = 0; i < file.size; i += chunkSize) {
      const chunk = file.slice(i, i + chunkSize);
      chunks.push(chunk);
    }

    return chunks;
  }

  private mergeResults(results: any[]): TranscriptionResult {
    // 实现结果合并逻辑
    const allSegments = results.flat();
    const sortedSegments = allSegments.sort((a, b) => a.start - b.start);

    return {
      text: sortedSegments.map(s => s.text).join(' '),
      segments: sortedSegments
    };
  }
}
```

### React Hook

```typescript
function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const transcribeAudio = useCallback(async (
    file: File,
    onProgress?: (progress: number) => void
  ) => {
    setIsTranscribing(true);
    setProgress(0);
    setError(null);

    try {
      const service = new TranscriptionService('/api');

      const result = await service.transcribeAudio(file, {
        language: 'auto',
        onProgress: (p) => {
          setProgress(p);
          onProgress?.(p);
        }
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '转录失败';
      setError(message);
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  return {
    transcribeAudio,
    isTranscribing,
    progress,
    error
  };
}
```

### 进度监控

```typescript
class TranscriptionProgressTracker {
  private progressCallbacks: Map<string, (progress: number) => void> = new Map();

  trackProgress(fileId: string, callback: (progress: number) => void) {
    this.progressCallbacks.set(fileId, callback);

    // 开始轮询进度
    this.pollProgress(fileId);
  }

  private async pollProgress(fileId: string) {
    const pollInterval = setInterval(async () => {
      try {
        const progress = await this.apiClient.getProgress(fileId);

        const callback = this.progressCallbacks.get(fileId);
        if (callback) {
          callback(progress.progress);
        }

        // 完成或错误时停止轮询
        if (progress.status === 'completed' || progress.status === 'error') {
          clearInterval(pollInterval);
          this.progressCallbacks.delete(fileId);
        }
      } catch (error) {
        clearInterval(pollInterval);
        this.progressCallbacks.delete(fileId);
      }
    }, 1000);
  }
}
```

## 性能优化

### 客户端优化

```typescript
// 并发控制
class Semaphore {
  private available: number;
  private queue: Array<() => void> = [];

  constructor(count: number) {
    this.available = count;
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }

    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.available++;

    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    }
  }
}

// 请求缓存
const transcriptionCache = new Map<string, {
  data: TranscriptionResult;
  timestamp: number;
}>();

async function getCachedTranscription(
  fileHash: string,
  fetcher: () => Promise<TranscriptionResult>
): Promise<TranscriptionResult> {
  const cached = transcriptionCache.get(fileHash);

  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.data;
  }

  const data = await fetcher();
  transcriptionCache.set(fileHash, {
    data,
    timestamp: Date.now()
  });

  return data;
}
```

## 最佳实践

### 1. 文件预处理

```typescript
// 音频文件预处理
async function preprocessAudio(file: File): Promise<File> {
  // 转换为支持的格式
  if (!isSupportedFormat(file.type)) {
    file = await convertAudioFormat(file, 'audio/mp3');
  }

  // 优化音频质量
  if (file.size > 50 * 1024 * 1024) { // 50MB
    file = await compressAudio(file, { bitrate: '128k' });
  }

  return file;
}

function isSupportedFormat(mimeType: string): boolean {
  const supportedTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/ogg',
    'audio/flac'
  ];

  return supportedTypes.includes(mimeType);
}
```

### 2. 错误处理

```typescript
// 全面的错误处理
async function safeTranscribe(
  file: File,
  retries: number = 3
): Promise<TranscriptionResult> {
  let lastError: Error;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const preprocessedFile = await preprocessAudio(file);
      return await transcribeAudio(preprocessedFile);
    } catch (error) {
      lastError = error as Error;

      if (attempt === retries) {
        break;
      }

      // 指数退避
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### 3. 进度反馈

```typescript
// 详细的进度反馈
interface TranscriptionProgress {
  stage: 'uploading' | 'transcribing' | 'processing' | 'completed';
  progress: number;
  message: string;
  details?: any;
}

function useDetailedTranscription() {
  const [progress, setProgress] = useState<TranscriptionProgress>({
    stage: 'uploading',
    progress: 0,
    message: '准备上传文件'
  });

  const transcribeWithProgress = useCallback(async (file: File) => {
    try {
      setProgress({
        stage: 'uploading',
        progress: 0,
        message: '正在上传文件'
      });

      // 模拟上传进度
      for (let i = 0; i <= 100; i += 10) {
        setProgress(prev => ({
          ...prev,
          progress: i,
          message: `上传进度: ${i}%`
        }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProgress({
        stage: 'transcribing',
        progress: 0,
        message: '开始音频转录'
      });

      const result = await transcribeAudio(file, (p) => {
        setProgress(prev => ({
          ...prev,
          progress: p,
          message: `转录进度: ${p}%`
        }));
      });

      setProgress({
        stage: 'completed',
        progress: 100,
        message: '转录完成'
      });

      return result;
    } catch (error) {
      setProgress(prev => ({
        ...prev,
        stage: 'completed',
        message: '转录失败'
      }));
      throw error;
    }
  }, []);

  return { transcribeWithProgress, progress };
}
```

---

*最后更新: 2025年1月*