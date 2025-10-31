# umuo.app 部署指南

## 概述

umuo.app 设计为可以在多种平台上部署，推荐使用 Cloudflare Pages 进行生产部署。本指南将详细介绍各种部署方式和最佳实践。

## 🚀 快速部署

### 一键部署到 Cloudflare Pages

```bash
# 克隆项目
git clone https://github.com/umuo/umuo-app.git
cd umuo-app

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local

# 一键部署
pnpm deploy
```

## 📋 部署前准备

### 1. 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 2. 依赖安装

```bash
# 安装项目依赖
pnpm install --frozen-lockfile
```

### 3. 环境变量配置

创建 `.env.local` 文件：

```env
# AI 服务配置（必需）
GROQ_API_KEY=your_groq_api_key

# 可选配置
TRANSCRIPTION_TIMEOUT_MS=180000
TRANSCRIPTION_RETRY_COUNT=2
TRANSCRIPTION_MAX_CONCURRENCY=2
NODE_ENV=production
```

### 4. 构建验证

```bash
# 运行完整测试
pnpm ci:build

# 或分步执行
pnpm install --frozen-lockfile
pnpm test:run
pnpm lint
pnpm type-check
pnpm build
```

## 🌩️ Cloudflare Pages 部署（推荐）

### 方法一：使用 Wrangler CLI

```bash
# 登录 Cloudflare
pnpm wrangler login

# 部署到生产环境
pnpm deploy:prod

# 部署到预览环境
pnpm deploy:preview
```

### 方法二：使用 GitHub Actions

1. Fork 项目到你的 GitHub 账户
2. 在 Cloudflare Pages 中连接 GitHub 仓库
3. 配置构建设置：
   - **构建命令**: `pnpm build`
   - **构建输出目录**: `.next`
   - **Node.js 版本**: `20.x`

### 方法三：使用自动化脚本

```bash
# 使用优化部署脚本
./scripts/deploy-optimized.sh

# 仅构建不部署
./scripts/deploy-optimized.sh --build-only

# 部署到预览环境
./scripts/deploy-optimized.sh false preview
```

## 🐳 Vercel 部署

### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

### 2. 部署

```bash
# 登录 Vercel
vercel login

# 部署项目
vercel --prod
```

### 3. 环境变量配置

在 Vercel 控制台中添加环境变量：
- `GROQ_API_KEY`: 你的 Groq API 密钥
- `NODE_ENV`: `production`

## 🏗️ 自托管部署

### 使用 Docker

1. 创建 Dockerfile：

```dockerfile
FROM node:20-alpine AS base

# 依赖安装
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 构建
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

# 运行
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

2. 构建和运行：

```bash
# 构建镜像
docker build -t umuo-app .

# 运行容器
docker run -p 3000:3000 --env-file .env.local umuo-app
```

### 传统服务器部署

```bash
# 1. 构建项目
pnpm build

# 2. 安装 PM2
npm install -g pm2

# 3. 启动应用
pm2 start ecosystem.config.js

# 4. 设置开机自启
pm2 startup
pm2 save
```

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'umuo-app',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 🔧 配置优化

### Next.js 配置优化

项目已优化的 `next.config.js`：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基础配置
  outputFileTracingRoot: __dirname,
  
  // 图片优化
  images: {
    domains: ["localhost", "umuo.app", "umuo.pages.dev"],
    formats: ["image/webp", "image/avif"],
  },
  
  // 压缩
  compress: true,
  
  // 环境变量
  env: {
    NEXT_PUBLIC_DEPLOYMENT_PLATFORM: "cloudflare-workers",
  },
  
  // 生产环境优化
  ...(process.env.NODE_ENV === "production" && {
    poweredByHeader: false,
    generateEtags: true,
  }),
};

module.exports = nextConfig;
```

### 环境特定配置

```javascript
// next.config.js
const config = {
  // 基础配置...
};

if (process.env.NODE_ENV === "production") {
  config.compress = true;
  config.poweredByHeader = false;
}

if (process.env.ANALYZE === "true") {
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });
  module.exports = withBundleAnalyzer(config);
} else {
  module.exports = config;
}
```

## 🔍 部署验证

### 1. 基础功能检查

```bash
# 检查应用是否正常运行
curl -f https://your-domain.com/api/health

# 预期响应
{
  "success": true,
  "data": {
    "status": "healthy"
  }
}
```

### 2. 性能测试

```bash
# 运行性能测试
./scripts/performance-test.sh https://your-domain.com

# 检查关键指标
- Lighthouse 性能评分 > 90
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
```

### 3. 功能测试清单

- [ ] 页面加载正常
- [ ] 文件上传功能
- [ ] 音频播放功能
- [ ] 转录功能
- [ ] 错误处理
- [ ] 响应式设计
- [ ] 主题切换

## 📊 监控和维护

### 性能监控

项目内置性能监控：

```typescript
// 在组件中使用
import { usePerformanceObserver } from "@/lib/utils/performance-observer";

const observer = usePerformanceObserver({
  reportUrl: "/api/performance",
  sampleRate: 0.1
});

// 标记性能
observer.mark("transcription-start");
// ... 执行操作
observer.measure("transcription-duration");
```

### 错误监控

```typescript
// 统一错误处理
import { handleTranscriptionError } from "@/lib/utils/transcription-error-handler";

try {
  // 业务逻辑
} catch (error) {
  handleTranscriptionError(error, {
    fileId: 123,
    operation: "transcribe"
  });
}
```

### 日志管理

```bash
# 查看应用日志
pm2 logs umuo-app

# 查看错误日志
tail -f logs/err.log

# 查看访问日志
tail -f logs/access.log
```

## 🔄 CI/CD 集成

### GitHub Actions 工作流

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    
    - name: Install pnpm
      uses: pnpm/action-setup@v3
      with:
        version: 8
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Run tests
      run: pnpm test:run
    
    - name: Run type check
      run: pnpm type-check
    
    - name: Run lint
      run: pnpm lint
    
    - name: Build
      run: pnpm build
      env:
        GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
    
    - name: Deploy to Cloudflare Pages
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        projectName: umuo-app
        directory: .next
        gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### 环境变量配置

在 GitHub 仓库设置中添加 Secrets：

- `CLOUDFLARE_API_TOKEN`: Cloudflare API 令牌
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账户 ID
- `GROQ_API_KEY`: Groq API 密钥
- `GITHUB_TOKEN`: GitHub 令牌

## 🛠️ 故障排除

### 常见问题

#### 1. 构建失败

```bash
# 清理缓存重新构建
pnpm clean
pnpm install --frozen-lockfile
pnpm build
```

#### 2. API 调用失败

- 检查环境变量配置
- 验证 API 密钥有效性
- 查看服务器日志

#### 3. 性能问题

```bash
# 运行性能诊断
./scripts/performance-test.sh

# 检查包大小
pnpm build:analyze
```

#### 4. 内存不足

```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

### 调试模式

```bash
# 启用详细日志
DEBUG=* pnpm dev

# 构建 debug 模式
NODE_ENV=development pnpm build
```

## 📈 性能优化建议

### 1. 构建优化

- 启用 gzip 压缩
- 配置 CDN 缓存
- 优化图片资源
- 减少包大小

### 2. 运行时优化

- 启用 HTTP/2
- 配置缓存策略
- 优化 API 响应
- 监控性能指标

### 3. 数据库优化

- 使用索引
- 优化查询
- 连接池管理
- 定期清理

## 🔐 安全考虑

### 1. 环境变量安全

- 不要在代码中硬编码密钥
- 使用平台提供的密钥管理
- 定期轮换 API 密钥
- 限制 API 访问权限

### 2. HTTPS 配置

- 强制使用 HTTPS
- 配置 HSTS 头
- 更新 SSL 证书
- 监控证书过期

### 3. 访问控制

- 配置防火墙规则
- 限制 API 访问频率
- 监控异常访问
- 记录访问日志

---

*最后更新: 2025-01-31*  
*文档版本: 1.0.0*