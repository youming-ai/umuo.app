# 🚀 部署指南

## 📋 部署方式变更

### ✅ 当前部署方式：Cloudflare Pages Git 集成

项目现在使用 **Cloudflare Pages Git 集成** 进行自动部署，已移除 GitHub Actions。

#### 自动部署流程
1. 推送代码到 `main` 分支
2. Cloudflare Pages 自动触发构建
3. 构建成功后自动部署到生产环境

#### 🔗 相关链接
- **生产环境**: https://umuo.app
- **预览环境**: https://umuo-app.pages.dev
- **Cloudflare Dashboard**: https://dash.cloudflare.com/pages

## 🛠️ 本地开发

### 开发命令
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建项目
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint
```

## 📦 本地部署（开发和测试）

虽然推荐使用自动部署，但项目保留了本地部署选项用于开发和测试：

### 本地部署命令
```bash
# 完整部署流程
pnpm deploy:local

# 预览环境部署
pnpm deploy:preview

# 仅构建，不部署
pnpm deploy:build
```

### Wrangler CLI（高级用户）
```bash
# 登录 Cloudflare（如需）
npx wrangler login

# 直接部署到 Cloudflare Pages
npx wrangler pages deploy .next --project-name umuo-app
```

## 🔧 环境变量配置

### 生产环境变量（在 Cloudflare Pages 中设置）
```
NODE_ENV: production
NEXT_PUBLIC_APP_URL: https://umuo.app
GROQ_API_KEY: [您的 Groq API Key]
```

### 本地开发环境
配置 `.env` 文件：
```bash
# 复制模板
cp .env.example .env

# 编辑配置
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📊 构建配置

### Cloudflare Pages 设置
- **框架预设**: Next.js (Static HTML Export)
- **构建命令**: `pnpm build`
- **构建输出目录**: `.next`
- **根目录**: `/`
- **生产分支**: `main`

### Next.js 配置优化
项目已针对 Cloudflare Pages 进行优化：
- 静态资源优化
- 代码分割
- 图像优化配置
- 缓存策略

## 🔍 故障排除

### 构建失败
1. 检查 Cloudflare Pages 构建日志
2. 确认所有环境变量已正确设置
3. 验证 `wrangler.toml` 配置正确

### 部署后功能异常
1. 清除浏览器缓存
2. 检查 Cloudflare Analytics 中的错误
3. 验证 API 密钥配置

### 本地开发问题
1. 删除 `.next` 目录和 `node_modules` 重新安装
2. 检查 Node.js 版本兼容性
3. 确认本地环境变量配置

## 📈 性能监控

### 可用的监控工具
- **Cloudflare Analytics**: 访问统计和性能指标
- **Next.js Analytics**: 构建和运行时性能
- **Web Vitals**: 核心网页指标

## 🔄 回滚部署

如果需要回滚到之前的版本：
1. 访问 Cloudflare Pages Dashboard
2. 进入 `umuo-app` 项目
3. 点击 "Deployments" 标签页
4. 选择要回滚的部署版本
5. 点击 "Rollback" 按钮

## 📝 部署历史

| 日期 | 版本 | 变更 | 部署方式 |
|------|------|------|----------|
| 2025-10-28 | 移除 GitHub Actions | 迁移到 Cloudflare Pages Git 集成 | 自动部署 |

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到您的 fork
5. 创建 Pull Request
6. 合并后自动部署到生产环境

---

> 💡 **提示**: 现在每次推送到 `main` 分支都会自动触发部署，无需手动操作！