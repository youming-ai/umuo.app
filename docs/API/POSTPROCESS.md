# 后处理 API 文档

本文档详细说明了文本后处理 API (`/api/postprocess`) 的使用方法、参数格式和响应结构。

## 概览

后处理 API 使用 Groq Moonshot 模型对转录文本进行智能处理，包括分句规范化、翻译、注释生成等功能。

### 特性

- **智能分句**: 自动分段和标点修正
- **多语言翻译**: 支持多种语言互译
- **语法注释**: 自动生成语法结构说明
- **假名标注**: 支持假名和拼音标注
- **术语统一**: 应用自定义术语库
- **词级时间戳**: 保持精确的时间同步

## 端点信息

- **方法**: `POST`
- **路径**: `/api/postprocess`
- **内容类型**: `application/json`
- **认证**: 通过 API 密钥（服务端）

## 请求格式

### 请求体

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

### 参数说明

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `segments` | Segment[] | 是 | - | 原始分段数据 |
| `language` | string | 否 | 'ja' | 源语言代码 |
| `targetLanguage` | string | 否 | 'en' | 目标语言代码 |
| `enableAnnotations` | boolean | 否 | true | 是否启用语法注释 |
| `enableFurigana` | boolean | 否 | true | 是否启用假名标注 |

### 语言支持

#### 源语言
| 代码 | 语言 | 说明 |
|------|------|------|
| `ja` | 日语 | 主要支持语言 |
| `en` | 英语 | 英语支持 |
| `zh` | 中文 | 中文支持 |
| `ko` | 韩语 | 韩语支持 |

#### 目标语言
| 代码 | 语言 | 翻译质量 | 注释支持 |
|------|------|----------|----------|
| `en` | 英语 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| `zh` | 中文 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `ja` | 日语 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| `ko` | 韩语 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 响应格式

### 成功响应

```typescript
interface PostProcessSuccessResponse {
  ok: true;
  data: {
    processedSegments: number; // 处理的分段数量
    segments: Array<{
      text: string;                    // 原始文本
      start: number;                   // 开始时间
      end: number;                     // 结束时间
      normalizedText?: string;          // 规范化文本
      translation?: string;             // 翻译文本
      annotations?: string[];           // 语法注释
      furigana?: string;                // 假名标注
    }>;
  };
}
```

### 错误响应

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

## 处理功能

### 1. 智能分句

自动将连续文本分割为合理的句子：

```typescript
// 输入
{
  "segments": [
    {
      "text": "こんにちは世界これはテストです",
      "start": 0,
      "end": 5.2
    }
  ]
}

// 输出
{
  "segments": [
    {
      "text": "こんにちは世界",
      "normalizedText": "こんにちは世界",
      "translation": "Hello world"
    },
    {
      "text": "これはテストです",
      "normalizedText": "これはテストです",
      "translation": "This is a test"
    }
  ]
}
```

### 2. 文本规范化

自动修正标点符号和格式：

```typescript
// 输入
{
  "text": "こんにちは   世界"
}

// 输出
{
  "normalizedText": "こんにちは世界"
}
```

### 3. 多语言翻译

支持多种语言之间的翻译：

```typescript
// 日语翻译
{
  "text": "こんにちは世界",
  "targetLanguage": "en",
  "translation": "Hello world"
}

// 英语翻译
{
  "text": "Hello world",
  "targetLanguage": "ja",
  "translation": "こんにちは世界"
}
```

### 4. 语法注释

自动生成语法结构说明：

```typescript
// 日语语法注释
{
  "text": "私は勉強しています",
  "annotations": [
    "私（わたくし）: 主语，表示自己",
    "は: 主题助词",
    "勉強しています: 进行时态，表示正在学习"
  ]
}

// 英语语法注释
{
  "text": "I am learning",
  "annotations": [
    "I: 主语",
    "am: be动词",
    "learning: 现在分词，表示进行时"
  ]
}
```

### 5. 假名标注

为日语和中文提供假名/拼音标注：

```typescript
// 日语假名
{
  "text": "日本語",
  "furigana": "にほんご"
}

// 中文拼音
{
  "text": "中文",
  "furigana": "zhōng wén"
}
```

## 使用示例

### 基础使用

```typescript
async function postProcessSegments(
  segments: Array<{text: string; start: number; end: number}>,
  options: PostProcessOptions = {}
): Promise<ProcessedSegment[]> {
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

  return result.data.segments;
}
```

### 高级使用

```typescript
class PostProcessingService {
  private apiClient: OumuAPIClient;

  constructor(baseURL: string) {
    this.apiClient = new OumuAPIClient(baseURL);
  }

  async processWithCustomOptions(
    segments: Array<{text: string; start: number; end: number}>,
    options: PostProcessOptions
  ): Promise<ProcessingResult> {
    const request: PostProcessRequest = {
      segments,
      language: options.language || 'ja',
      targetLanguage: options.targetLanguage || 'en',
      enableAnnotations: options.enableAnnotations ?? true,
      enableFurigana: options.enableFurigana ?? true
    };

    const response = await this.apiClient.post('/api/postprocess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return {
      segments: result.data.segments,
      processedCount: result.data.processedSegments
    };
  }

  async batchProcess(
    files: Array<{segments: Array<{text: string; start: number; end: number}>}>,
    options: PostProcessOptions
  ): Promise<Map<string, ProcessingResult>> {
    const results = new Map<string, ProcessingResult>();

    // 并发处理多个文件
    const promises = files.map(async ({segments}, index) => {
      try {
        const result = await this.processWithCustomOptions(
          segments,
          options
        );
        results.set(`file_${index}`, result);
      } catch (error) {
        console.error(`Failed to process file ${index}:`, error);
        results.set(`file_${index}`, {
          segments: [],
          processedCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.all(promises);
    return results;
  }
}
```

### React Hook

```typescript
function usePostProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const postProcessSegments = useCallback(async (
    segments: Array<{text: string; start: number; end: number}>,
    options: PostProcessOptions = {}
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const service = new PostProcessingService('/api');

      const result = await service.processWithCustomOptions(
        segments,
        options
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '后处理失败';
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    postProcessSegments,
    isProcessing,
    progress,
    error
  };
}
```

## 错误处理

### 常见错误

| 错误类型 | 说明 | 解决方案 |
|---------|------|----------|
| `VALIDATION_ERROR` | 请求参数验证失败 | 检查请求格式和参数 |
| `TIMEOUT` | 请求超时 | 增加超时时间或重试 |
| `RATE_LIMIT` | 请求频率限制 | 降低请求频率 |
| `AUTH_ERROR` | 认证失败 | 检查API密钥配置 |
| `CONFIG_ERROR` | 配置错误 | 检查服务器配置 |

### 错误处理示例

```typescript
class PostProcessingErrorHandler {
  static handle(error: any): never {
    if (error.code === 'VALIDATION_ERROR') {
      throw new PostProcessingError(
        '请求格式错误',
        'VALIDATION_ERROR',
        error.details
      );
    }

    if (error.code === 'TIMEOUT') {
      throw new PostProcessingError(
        '请求超时，请稍后重试',
        'TIMEOUT_ERROR'
      );
    }

    if (error.code === 'RATE_LIMIT') {
      throw new PostProcessingError(
        '请求过于频繁，请稍后重试',
        'RATE_LIMIT_ERROR'
      );
    }

    if (error.code === 'AUTH_ERROR') {
      throw new PostProcessingError(
        'API认证失败',
        'AUTH_ERROR'
      );
    }

    throw new PostProcessingError(
      '未知错误',
      'UNKNOWN_ERROR'
    );
  }
}

class PostProcessingError extends Error {
  constructor(
    message: string,
    public type: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PostProcessingError';
  }
}
```

## 性能优化

### 批量处理

```typescript
// 批量处理优化
class BatchPostProcessor {
  private queue: Array<{
    segments: Array<{text: string; start: number; end: number}>;
    options: PostProcessOptions;
    resolve: (result: ProcessingResult) => void;
    reject: (error: Error) => void;
  }> = [];

  private processing = false;
  private batchSize = 5; // 每批处理5个文件

  async addToBatch(
    segments: Array<{text: string; start: number; end: number}>,
    options: PostProcessOptions
  ): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ segments, options, resolve, reject });

      if (!this.processing) {
        this.processBatch();
      }
    });
  }

  private async processBatch() {
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);

      try {
        const promises = batch.map(async ({ segments, options, resolve, reject }) => {
          try {
            const result = await this.processSingle(segments, options);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });

        await Promise.all(promises);
      } catch (error) {
        // 批量处理失败，单独处理每个项目
        for (const item of batch) {
          try {
            const result = await this.processSingle(
              item.segments,
              item.options
            );
            item.resolve(result);
          } catch (error) {
            item.reject(error);
          }
        }
      }

      // 批次间延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.processing = false;
  }

  private async processSingle(
    segments: Array<{text: string; start: number; end: number}>,
    options: PostProcessOptions
  ): Promise<ProcessingResult> {
    const response = await fetch('/api/postprocess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        segments,
        ...options
      })
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return {
      segments: result.data.segments,
      processedCount: result.data.processedSegments
    };
  }
}
```

### 缓存策略

```typescript
// 结果缓存
class ProcessingCache {
  private cache = new Map<string, {
    result: ProcessingResult;
    timestamp: number;
  }>();

  private ttl = 30 * 60 * 1000; // 30分钟缓存

  get(key: string): ProcessingResult | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.result;
  }

  set(key: string, result: ProcessingResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  generateKey(segments: Array<{text: string}>, options: PostProcessOptions): string {
    const segmentsText = segments.map(s => s.text).join('|');
    const optionsStr = JSON.stringify(options);

    return createHash('md5')
      .update(segmentsText + optionsStr)
      .digest('hex');
  }
}
```

## 最佳实践

### 1. 请求优化

```typescript
// 请求优化建议
const optimizedRequest = {
  // 合并短段落
  segments: mergeShortSegments(segments, 10), // 合并小于10个字符的段落

  // 合理设置选项
  language: 'ja',
  targetLanguage: 'en',
  enableAnnotations: segments.length > 0,
  enableFurigana: segments.some(s => /[\u3040-\u309F\u4E00-\u9FFF]/.test(s.text))
};
```

### 2. 错误恢复

```typescript
// 错误恢复策略
async function resilientPostProcess(
  segments: Array<{text: string; start: number; end: number}>,
  options: PostProcessOptions,
  maxRetries: number = 3
): Promise<ProcessingResult> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 随机延迟避免并发问题
      if (attempt > 1) {
        await new Promise(resolve =>
          setTimeout(resolve, Math.random() * 2000 + 1000)
        );
      }

      return await postProcessWithRetry(segments, options);
    } catch (error) {
      lastError = error as Error;

      // 特定错误类型的处理
      if (error.type === 'RATE_LIMIT_ERROR') {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      if (error.type === 'TIMEOUT_ERROR' && attempt < maxRetries) {
        continue;
      }
    }
  }

  throw lastError!;
}
```

### 3. 进度反馈

```typescript
// 详细的进度反馈
interface ProcessingStep {
  name: string;
  weight: number;
  description: string;
}

const processingSteps: ProcessingStep[] = [
  { name: 'validation', weight: 10, description: '验证输入' },
  { name: 'segmentation', weight: 20, description: '文本分段' },
  { name: 'translation', weight: 30, description: '翻译处理' },
  { name: 'annotation', weight: 25, description: '生成注释' },
  { name: 'finalization', weight: 15, description: '最终处理' }
];

async function postProcessWithProgress(
  segments: Array<{text: string; start: number; end: number}>,
  options: PostProcessOptions,
  onProgress: (step: string, progress: number) => void
): Promise<ProcessingResult> {
  let accumulatedProgress = 0;

  for (const step of processingSteps) {
    onProgress(step.name, accumulatedProgress);

    // 模拟步骤处理
    for (let i = 0; i <= 100; i += 10) {
      const stepProgress = accumulatedProgress + (step.weight * i / 100);
      onProgress(step.name, stepProgress);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    accumulatedProgress += step.weight;
  }

  onProgress('completed', 100);

  // 实际处理逻辑
  return postProcessSegments(segments, options);
}
```

---

*最后更新: 2025年1月*