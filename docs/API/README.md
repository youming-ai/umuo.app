# API 文档

本文档提供了 Oumu.ai 项目中所有 API 接口的详细说明，包括请求格式、响应格式、错误处理和最佳实践。

## API 概览

Oumu.ai 提供了三个主要 API 端点：

1. **`/api/transcribe`** - 音频转录服务
2. **`/api/postprocess`** - 文本后处理服务
3. **`/api/progress/[fileId]`** - 进度查询服务

### 技术特点

- **RESTful 设计**: 遵循 REST 原则的 API 设计
- **类型安全**: 使用 Zod 进行请求/响应验证
- **错误处理**: 统一的错误处理和用户友好提示
- **流式处理**: 支持大文件的流式传输
- **并发控制**: 智能的并发请求限制
- **重试机制**: 指数退避的重试策略

## API 端点详细说明

### 1. 音频转录 API

#### 端点信息
- **URL**: `POST /api/transcribe`
- **Content-Type**: `multipart/form-data`
- **认证**: 通过 API 密钥

#### 请求参数

**Query 参数:**
```typescript
interface TranscribeQueryParams {
  fileId: string;           // 文件唯一标识
  chunkIndex?: number;      // 分块索引（可选）
  offsetSec?: number;       // 时间偏移（可选）
  language?: string;        // 目标语言
}
```

**Form Data:**
```typescript
interface TranscribeFormData {
  audio: Blob;              // 音频文件块
  meta?: string;            // JSON 格式的元数据（可选）
}
```

**元数据结构:**
```typescript
interface TranscribeMeta {
  fileId?: string;          // 文件唯一标识符
  chunkIndex?: number;      // 分块索引
  offsetSec?: number;       // 时间偏移
}
```

#### 响应格式

**成功响应:**
```typescript
interface TranscribeSuccessResponse {
  ok: true;
  status: "completed";
  data: {
    text: string;           // 转录文本
    language?: string;      // 检测语言
    duration?: number;      // 音频时长
    segments?: Array<{
      id: number;
      seek: number;
      start: number;
      end: number;
      text: string;
      tokens: number[];
      temperature: number;
      avg_logprob: number;
      compression_ratio: number;
      no_speech_prob: number;
    }>;
  };
  meta?: TranscribeMeta;    // 原始元数据
}
```

**错误响应:**
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

#### 错误代码

| 错误类型 | HTTP 状态码 | 说明 |
|---------|-------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `TRANSCRIPTION_FAILED` | 500 | Groq API 错误 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

#### 使用示例

**cURL:**
```bash
curl -X POST \
  "http://localhost:3000/api/transcribe?fileId=abc123&language=ja" \
  -F "audio=@audio_chunk.mp3" \
  -F 'meta={"fileId":"abc123","chunkIndex":0}'
```

**JavaScript:**
```typescript
async function transcribeAudio(
  audioBlob: Blob,
  fileId: string,
  language: string = 'auto'
) {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('meta', JSON.stringify({
    fileId,
    chunkIndex: 0
  }));

  const response = await fetch(`/api/transcribe?fileId=${fileId}&language=${language}`, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}
```

### 2. 文本后处理 API

#### 端点信息
- **URL**: `POST /api/postprocess`
- **Content-Type**: `application/json`
- **认证**: 通过 API 密钥

#### 请求格式

```typescript
interface PostProcessRequest {
  segments: Array<{
    text: string;
    start: number;
    end: number;
    wordTimestamps?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }>;
  language?: string;            // 源语言（默认: 'ja'）
  targetLanguage?: string;     // 目标语言（默认: 'en'）
  enableAnnotations?: boolean; // 启用注释（默认: true）
  enableFurigana?: boolean;    // 启用假名（默认: true）
}
```

#### 响应格式

**成功响应:**
```typescript
interface PostProcessSuccessResponse {
  ok: true;
  data: {
    processedSegments: number;
    segments: Array<{
      text: string;
      start: number;
      end: number;
      normalizedText?: string;
      translation?: string;
      annotations?: string[];
      furigana?: string;
    }>;
  };
}
```

**错误响应:**
```typescript
interface PostProcessErrorResponse {
  ok: false;
  error: {
    code: 'VALIDATION_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'AUTH_ERROR' | 'CONFIG_ERROR';
    message: string;
    details?: any;
    statusCode: number;
  };
}
```

#### 处理选项

**语言支持:**
- 源语言：`ja`（日语）等
- 目标语言：`en`（英语）等

**处理特性:**
- **文本规范化**: 清理填充词，修正语法
- **翻译**: 提供多语言翻译
- **注释**: 添加语法和文化注释
- **假名标注**: 为日语汉字提供假名

#### 使用示例

**cURL:**
```bash
curl -X POST \
  "http://localhost:3000/api/postprocess" \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [
      {
        "text": "こんにちは世界",
        "start": 0,
        "end": 2.5
      }
    ],
    "language": "ja",
    "targetLanguage": "en",
    "enableAnnotations": true,
    "enableFurigana": true
  }'
```

**JavaScript:**
```typescript
async function postProcessSegments(
  segments: Array<{text: string; start: number; end: number}>,
  options: PostProcessOptions = {}
) {
  const response = await fetch('/api/postprocess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      segments,
      language: 'ja',
      targetLanguage: 'en',
      enableAnnotations: true,
      enableFurigana: true,
      ...options
    })
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}
```

### 3. 进度查询 API

#### 端点信息
- **URL**: `GET /api/progress/[fileId]`
- **Content-Type**: `application/json`
- **认证**: 无

#### 请求参数

**路径参数:**
```typescript
interface ProgressParams {
  fileId: string;    // 文件唯一标识
}
```

#### 响应格式

**成功响应:**
```typescript
interface ProgressSuccessResponse {
  progress: number;        // 进度百分比 (0-100)
  status: ProgressStatus;  // 处理状态
  error?: string;         // 错误信息（如果有）
  currentStep?: string;   // 当前步骤
  estimatedTime?: number; // 预计剩余时间（秒）
}

type ProgressStatus =
  | 'pending'      // 等待处理
  | 'processing'   // 处理中
  | 'completed'    // 已完成
  | 'error'        // 处理错误
  | 'cancelled'    // 已取消
```

#### 状态说明

| 状态 | 说明 | 进度范围 |
|------|------|----------|
| `pending` | 等待处理 | 0 |
| `processing` | 处理中 | 1-99 |
| `completed` | 已完成 | 100 |
| `error` | 处理错误 | - |
| `cancelled` | 已取消 | - |

#### 处理步骤

```
1. uploading    - 文件上传
2. transcribing - 音频转录
3. segmenting   - 文本分段
4. translating  - 翻译处理
5. annotating   - 注释生成
6. finalizing   - 最终处理
```

#### 使用示例

**cURL:**
```bash
curl -X GET \
  "http://localhost:3000/api/progress/abc123"
```

**JavaScript:**
```typescript
async function getProcessingProgress(fileId: string) {
  const response = await fetch(`/api/progress/${fileId}`);
  const result = await response.json();

  return {
    progress: result.progress,
    status: result.status,
    error: result.error,
    currentStep: result.currentStep,
    estimatedTime: result.estimatedTime
  };
}
```

## 错误处理

### 统一错误格式

所有 API 端点都遵循统一的错误响应格式：

```typescript
interface ErrorResponse {
  ok: false;
  error: {
    code: string;           // 错误代码
    message: string;         // 用户友好的错误消息
    details?: any;          // 详细错误信息
    statusCode: number;      // HTTP 状态码
  };
}
```

### 错误类型

| 错误类型 | 说明 | HTTP 状态码 |
|---------|------|-------------|
| `VALIDATION_ERROR` | 请求参数验证失败 | 400 |
| `TIMEOUT` | 请求超时 | 408 |
| `RATE_LIMIT` | 请求频率限制 | 429 |
| `AUTH_ERROR` | 认证失败 | 401 |
| `CONFIG_ERROR` | 配置错误 | 500 |
| `TRANSCRIPTION_FAILED` | 转录失败 | 500 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |

### 重试策略

客户端应该实现以下重试策略：

```typescript
interface RetryConfig {
  maxAttempts: number;     // 最大重试次数
  baseDelay: number;       // 基础延迟（毫秒）
  maxDelay: number;       // 最大延迟（毫秒）
  backoffFactor: number;  // 退避因子
  retryableErrors: string[]; // 可重试的错误类型
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'API_ERROR',
    'RATE_LIMIT',
    'TIMEOUT'
  ]
};
```

## 客户端集成

### API 客户端类

```typescript
class OumuAPIClient {
  private baseURL: string;
  private retryConfig: RetryConfig;

  constructor(baseURL: string, retryConfig?: Partial<RetryConfig>) {
    this.baseURL = baseURL;
    this.retryConfig = { ...defaultRetryConfig, ...retryConfig };
  }

  async transcribe(
    audioBlob: Blob,
    fileId: string,
    options: TranscribeOptions = {}
  ): Promise<TranscribeSuccessResponse['data']> {
    return this.withRetry(async () => {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('meta', JSON.stringify({
        fileId
      }));

      const params = new URLSearchParams({
        fileId,
        language: options.language || 'auto'
      });

      const response = await fetch(
        `${this.baseURL}/api/transcribe?${params}`,
        {
          method: 'POST',
          body: formData
        }
      );

      return this.handleResponse<TranscribeSuccessResponse>(response);
    });
  }

  async postProcess(
    request: PostProcessRequest
  ): Promise<PostProcessSuccessResponse['data']> {
    return this.withRetry(async () => {
      const response = await fetch(`${this.baseURL}/api/postprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      return this.handleResponse<PostProcessSuccessResponse>(response);
    });
  }

  async getProgress(fileId: string): Promise<ProgressSuccessResponse> {
    const response = await fetch(`${this.baseURL}/api/progress/${fileId}`);
    return this.handleResponse<ProgressSuccessResponse>(response);
  }

  private async withRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.retryConfig.maxAttempts) {
          throw lastError;
        }

        const delay = Math.min(
          this.retryConfig.baseDelay *
          Math.pow(this.retryConfig.backoffFactor, attempt - 1),
          this.retryConfig.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return result.data;
  }
}
```

## 安全性考虑

### API 密钥管理

1. **服务端存储**: 所有 API 密钥存储在环境变量中
2. **客户端访问**: 客户端无法访问敏感密钥
3. **定期轮换**: 建议定期更换 API 密钥
4. **权限最小化**: 只授予必要的 API 权限

### 请求验证

```typescript
// 请求验证中间件
export async function validateRequest(
  request: Request,
  schema: z.ZodSchema
): Promise<z.infer<typeof schema>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid request format', error.errors);
    }
    throw new ValidationError('Invalid request body');
  }
}
```

### 速率限制

```typescript
// 速率限制实现
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const requests = this.requests.get(clientId) || [];
    const validRequests = requests.filter(time => time > windowStart);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(clientId, validRequests);

    return true;
  }
}
```

## 性能优化

### 缓存策略

```typescript
// 响应缓存
const cache = new Map<string, { data: any; timestamp: number }>();

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000 // 5分钟
): Promise<T> {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });

  return data;
}
```

### 并发控制

```typescript
// 并发请求控制
export class ConcurrencyLimiter {
  private activeRequests = 0;
  private queue: Array<() => Promise<any>> = [];
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.activeRequests >= this.maxConcurrent) {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const result = await this.execute(operation);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    this.activeRequests++;

    try {
      const result = await operation();
      return result;
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const nextOperation = this.queue.shift();
      nextOperation?.();
    }
  }
}
```

---

*最后更新: 2025年1月*