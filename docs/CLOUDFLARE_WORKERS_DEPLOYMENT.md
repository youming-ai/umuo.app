# Cloudflare Workers 部署指南

## 概述

本文档描述了如何将 umuo-app 应用部署到 Cloudflare Workers 环境。应用已经过重构，完全兼容 Edge Runtime。

## 🎯 重构完成的功能

### ✅ 阶段1：Edge Runtime 配置和基础设施
- [x] 所有 API 路由配置 Edge Runtime
- [x] Cloudflare KV 存储配置
- [x] 进度存储适配器
- [x] 通用 Edge 适配器

### ✅ 阶段2：状态管理重构
- [x] 内存存储替换为 KV 存储
- [x] 事件驱动队列管理器
- [x] Edge Runtime 兼容的定时器
- [x] 向后兼容性保证

## 📋 部署前准备

### 1. 环境要求
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Wrangler CLI 最新版本

### 2. 安装 Wrangler
```bash
npm install -g wrangler
```

### 3. 登录 Cloudflare
```bash
wrangler login
```

## 🚀 部署步骤

### 1. 创建 KV 命名空间

#### 生产环境
```bash
# 创建进度跟踪 KV
wrangler kv:namespace create "TRANSCRIPTION_PROGRESS"
wrangler kv:namespace create "TRANSCRIPTION_PROGRESS" --preview

# 创建缓存 KV
wrangler kv:namespace create "TRANSCRIPTION_CACHE"
wrangler kv:namespace create "TRANSCRIPTION_CACHE" --preview
```

#### 更新 wrangler.toml
将创建的 KV ID 更新到 `wrangler.toml` 中：

```toml
[[kv_namespaces]]
binding = "TRANSCRIPTION_PROGRESS"
id = "your-production-id-here"
preview_id = "your-preview-id-here"

[[kv_namespaces]]
binding = "TRANSCRIPTION_CACHE"
id = "your-cache-production-id-here"
preview_id = "your-cache-preview-id-here"
```

### 2. 配置环境变量

#### 基础环境变量
```bash
wrangler secret put GROQ_API_KEY
# 输入你的 Groq API 密钥

wrangler secret put NODE_ENV
# 输入: production
```

#### 可选环境变量
```bash
wrangler secret put TRANSCRIPTION_TIMEOUT_MS
# 输入: 180000 (3分钟)

wrangler secret put TRANSCRIPTION_RETRY_COUNT
# 输入: 2

wrangler secret put TRANSCRIPTION_MAX_CONCURRENCY
# 输入: 2
```

### 3. 构建应用
```bash
pnpm build
```

### 4. 部署到 Preview 环境
```bash
wrangler pages deploy .next --project-name umuo-app --preview
```

### 5. 部署到生产环境
```bash
wrangler pages deploy .next --project-name umuo-app
```

## 🔧 配置说明

### API 路由 Edge Runtime

所有 API 路由已配置为 Edge Runtime：

```typescript
// src/app/api/transcribe/route.ts
export const runtime = 'edge';
```

### KV 存储配置

#### 进度存储
- **Binding**: `TRANSCRIPTION_PROGRESS`
- **用途**: 存储转录任务进度
- **TTL**: 30分钟自动过期

#### 缓存存储
- **Binding**: `TRANSCRIPTION_CACHE`
- **用途**: 缓存转录结果
- **TTL**: 可配置

### 事件驱动队列管理

队列管理器已重构为事件驱动模式：
- 移除了 `setInterval` 定时器
- 使用微任务调度
- 任务完成后自动触发下一个任务

## 🔍 验证部署

### 1. 运行兼容性测试
```bash
node scripts/test-cloudflare-compatibility.js
```

### 2. 检查 API 端点
```bash
# 测试进度 API
curl https://your-domain.pages.dev/api/progress/123

# 测试转录 API（需要文件上传）
curl -X POST https://your-domain.pages.dev/api/transcribe \
  -F "audio=@test-audio.mp3" \
  -F "language=en"
```

### 3. 检查 Edge Runtime 状态
响应头应包含：
```
X-Edge-Runtime: true
```

## 🐛 故障排除

### 常见问题

#### 1. KV 存储错误
**错误**: `TRANSCRIPTION_PROGRESS KV namespace not available`
**解决**: 确保 wrangler.toml 中的 KV ID 正确，并且已创建命名空间

#### 2. 环境变量缺失
**错误**: `GROQ_API_KEY not configured`
**解决**: 使用 `wrangler secret put` 设置环境变量

#### 3. 构建失败
**错误**: TypeScript 编译错误
**解决**: 运行 `pnpm type-check` 检查类型错误

#### 4. 定时器限制
**错误**: `Timer limit exceeded`
**解决**: 应用已使用 Edge Runtime 兼容的定时器，确保更新到最新代码

### 调试技巧

#### 1. 启用详细日志
```bash
wrangler pages deploy .next --project-name umuo-app --verbose
```

#### 2. 检查 Workers 日志
```bash
wrangler tail --project-name umuo-app
```

#### 3. 本地测试
```bash
wrangler pages dev .next
```

## 📊 性能优化

### 1. KV 缓存策略
- 进度数据：30分钟 TTL
- 转录结果：24小时 TTL
- 自动清理过期数据

### 2. 并发控制
- 最大并发转录任务：2个
- 自动队列管理
- 失败重试机制

### 3. 错误处理
- 降级到内存存储（开发环境）
- 自动重试机制
- 详细错误日志

## 🔄 回滚方案

如果部署出现问题，可以快速回滚：

```bash
# 回滚到上一个版本
wrangler pages deploy .next --project-name umuo-app --compatibility-date 2024-01-01

# 或者使用特定的部署历史
wrangler pages deployment list --project-name umuo-app
wrangler pages rollback [deployment-id] --project-name umuo-app
```

## 📈 监控和维护

### 1. 设置监控
- Cloudflare Analytics
- 错误率监控
- 性能指标跟踪

### 2. 定期维护
- KV 存储清理
- 日志分析
- 性能优化

## 🆕 后续优化计划

### 阶段3：长时间任务处理优化（可选）
- 实现流式处理
- 任务分割机制
- 异步状态更新

### 阶段4：性能优化和监控（可选）
- 缓存策略优化
- 监控系统集成
- 性能调优

## 📞 支持

如果遇到部署问题：

1. 检查本文档的故障排除部分
2. 运行兼容性测试脚本
3. 查看 Cloudflare Workers 文档
4. 检查 GitHub Issues

---

**部署成功后，您的应用将在 Cloudflare Workers 环境中运行，享受全球 CDN、自动扩展和 Edge 计算的优势！** 🎉