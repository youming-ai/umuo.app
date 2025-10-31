# umuo.app API 文档

## 概述

umuo.app 提供了一套完整的 RESTful API，支持音频文件上传、转录处理、状态查询等功能。

## 基础信息

- **Base URL**: `https://umuo.app/api`
- **Content-Type**: `application/json` (除文件上传外)
- **认证方式**: 无需认证（当前版本）
- **请求限制**: 遵循合理的速率限制

## API 端点

### 1. 健康检查

#### GET /api/health
基础健康检查，返回系统基本状态信息。

**响应示例:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-31T10:00:00.000Z",
    "uptime": 12345,
    "environment": "production",
    "platform": "cloudflare-workers",
    "version": "1.0.0",
    "services": {
      "groq": {
        "available": true,
        "configured": true
      },
      "database": {
        "available": true,
        "type": "indexeddb"
      },
      "cache": {
        "available": true,
        "type": "memory"
      },
      "storage": {
        "available": true,
        "type": "indexeddb"
      }
    },
    "performance": {
      "responseTime": 45
    }
  }
}
```

#### POST /api/health
详细健康检查，可以测试外部连接。

**请求体:**
```json
{
  "testConnections": false
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "detailed": true,
    "system": {
      "platform": "cloudflare-workers",
      "architecture": "worker",
      "region": "unknown",
      "datacenter": "unknown"
    },
    "runtime": {
      "name": "Node.js",
      "version": "v20.0.0",
      "environment": "production",
      "platform": "linux",
      "architecture": "x64"
    },
    "services": {
      "groq": {
        "available": true,
        "configured": true
      },
      "database": {
        "available": true,
        "type": "indexeddb"
      }
    },
    "dependencies": {
      "next": "15.5.3",
      "react": "19.1.1",
      "@ai-sdk/groq": "2.0.25"
    },
    "configuration": {
      "features": {
        "imageOptimization": true,
        "isr": true
      }
    }
  }
}
```

### 2. 音频转录

#### POST /api/transcribe
上传音频文件并进行转录处理。

**查询参数:**
- `fileId` (必需): 文件ID，整数
- `language` (可选): 转录语言，默认 "ja"
- `chunkIndex` (可选): 分片索引，用于大文件处理
- `offsetSec` (可选): 开始时间偏移（秒）

**请求体:** `multipart/form-data`
- `audio` (必需): 音频文件，支持 MP3、WAV、M4A 格式
- `meta` (可选): JSON字符串，包含文件元数据

**请求示例:**
```bash
curl -X POST \
  'https://umuo.app/api/transcribe?fileId=123&language=ja' \
  -H 'Content-Type: multipart/form-data' \
  -F 'audio=@test.mp3' \
  -F 'meta={"fileId":"123"}'
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "text": "转录的文本内容",
    "language": "ja",
    "duration": 120.5,
    "segments": [
      {
        "start": 0,
        "end": 2.5,
        "text": "第一段转录内容",
        "wordTimestamps": [
          {
            "word": "第一",
            "start": 0,
            "end": 0.8
          }
        ]
      }
    ]
  }
}
```

**错误响应:**
- `400 Bad Request`: 请求参数错误
  ```json
  {
    "success": false,
    "error": "fileId is required",
    "code": "VALIDATION_ERROR"
  }
  ```

- `404 Not Found`: 文件不存在
  ```json
  {
    "success": false,
    "error": "File not found",
    "code": "FILE_NOT_FOUND"
  }
  ```

- `413 Payload Too Large`: 文件过大
  ```json
  {
    "success": false,
    "error": "File size exceeds maximum limit",
    "code": "FILE_TOO_LARGE"
  }
  ```

- `415 Unsupported Media Type`: 不支持的文件格式
  ```json
  {
    "success": false,
    "error": "Unsupported audio format",
    "code": "UNSUPPORTED_FORMAT"
  }
  ```

- `500 Internal Server Error`: 服务器错误
  ```json
  {
    "success": false,
    "error": "Transcription service unavailable",
    "code": "SERVICE_ERROR"
  }
  ```

### 3. 文本后处理

#### POST /api/postprocess
对转录结果进行文本增强处理，包括添加罗马音、翻译等。

**请求体:**
```json
{
  "text": "转录的文本内容",
  "language": "ja",
  "options": {
    "includeRomaji": true,
    "includeTranslation": true,
    "targetLanguage": "zh"
  }
}
```

**成功响应 (200):**
```json
{
  "success": true,
  "data": {
    "originalText": "こんにちは",
    "processedSegments": [
      {
        "text": "こんにちは",
        "romaji": "konnichiwa",
        "translation": "你好",
        "furigana": "こんにち(は)"
      }
    ],
    "language": "ja"
  }
}
```

### 4. 进度查询

#### GET /api/progress/{fileId}
查询转录任务的实时进度。

**路径参数:**
- `fileId`: 文件ID，整数

**成功响应 (200):**
```json
{
  "success": true,
  "progress": {
    "fileId": 123,
    "status": "processing",
    "progress": 75,
    "currentStage": "transcribing",
    "estimatedTimeRemaining": 30,
    "createdAt": "2025-01-31T10:00:00.000Z",
    "updatedAt": "2025-01-31T10:01:30.000Z"
  }
}
```

**状态说明:**
- `queued`: 排队中
- `processing`: 处理中
- `transcribing`: 转录中
- `postprocessing`: 后处理中
- `completed`: 已完成
- `failed`: 失败
- `cancelled`: 已取消

## 错误处理

### 标准错误格式

所有API错误都遵循统一的格式：

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": {
    "field": "具体错误信息",
    "timestamp": "2025-01-31T10:00:00.000Z"
  }
}
```

### 常见错误代码

| 错误代码 | HTTP状态 | 描述 |
|---------|---------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `FILE_NOT_FOUND` | 404 | 文件不存在 |
| `FILE_TOO_LARGE` | 413 | 文件过大 |
| `UNSUPPORTED_FORMAT` | 415 | 不支持的文件格式 |
| `QUOTA_EXCEEDED` | 429 | API配额超限 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 |
| `TRANSCRIPTION_ERROR` | 500 | 转录处理错误 |

## 速率限制

- **基础限制**: 每分钟 100 次请求
- **转录限制**: 每小时 60 次转录请求
- **文件大小限制**: 单个文件最大 100MB
- **并发限制**: 同时处理最多 5 个转录任务

## 支持的音频格式

| 格式 | MIME类型 | 推荐度 |
|-----|---------|-------|
| MP3 | `audio/mpeg` | ⭐⭐⭐⭐⭐ |
| WAV | `audio/wav` | ⭐⭐⭐⭐⭐ |
| M4A | `audio/mp4` | ⭐⭐⭐⭐ |
| AAC | `audio/aac` | ⭐⭐⭐ |
| OGG | `audio/ogg` | ⭐⭐ |

## 支持的语言

| 语言代码 | 语言名称 | 支持度 |
|---------|---------|-------|
| `ja` | 日语 | ⭐⭐⭐⭐⭐ |
| `en` | 英语 | ⭐⭐⭐⭐⭐ |
| `zh` | 中文 | ⭐⭐⭐⭐ |
| `ko` | 韩语 | ⭐⭐⭐ |
| `es` | 西班牙语 | ⭐⭐⭐ |
| `fr` | 法语 | ⭐⭐⭐ |

## 最佳实践

### 1. 错误处理
```javascript
try {
  const response = await fetch('/api/transcribe?fileId=123', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  if (!result.success) {
    // 根据错误代码进行不同处理
    switch (result.code) {
      case 'FILE_TOO_LARGE':
        showFileTooLargeError();
        break;
      case 'UNSUPPORTED_FORMAT':
        showFormatError();
        break;
      default:
        showGenericError(result.error);
    }
    return;
  }
  
  // 处理成功结果
  handleTranscriptionResult(result.data);
  
} catch (error) {
  console.error('Network error:', error);
  showNetworkError();
}
```

### 2. 进度监控
```javascript
// 定期查询进度
const progressInterval = setInterval(async () => {
  const response = await fetch(`/api/progress/${fileId}`);
  const result = await response.json();
  
  if (result.success) {
    updateProgressBar(result.progress.progress);
    
    if (result.progress.status === 'completed') {
      clearInterval(progressInterval);
      handleCompletion(result.progress);
    } else if (result.progress.status === 'failed') {
      clearInterval(progressInterval);
      handleError(result.progress);
    }
  }
}, 2000);
```

### 3. 文件上传优化
```javascript
// 分片上传大文件
async function uploadLargeFile(file, fileId, chunkSize = 10 * 1024 * 1024) {
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const formData = new FormData();
    formData.append('audio', chunk);
    formData.append('meta', JSON.stringify({
      fileId,
      chunkIndex,
      totalChunks,
      fileName: file.name
    }));
    
    const response = await fetch(
      `/api/transcribe?fileId=${fileId}&chunkIndex=${chunkIndex}`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // 更新上传进度
    updateUploadProgress((chunkIndex + 1) / totalChunks * 100);
  }
}
```

## 更新日志

### v1.0.0 (2025-01-31)
- 初始API版本发布
- 支持基础音频转录功能
- 添加健康检查端点
- 实现进度查询接口
- 支持文本后处理

---

*最后更新: 2025-01-31*  
*文档版本: 1.0.0*