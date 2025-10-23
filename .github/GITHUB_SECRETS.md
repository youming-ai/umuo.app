# GitHub Secrets 配置指南

## 📋 必需的 GitHub Secrets

为了使简化的 GitHub Actions 自动部署正常工作，需要在 GitHub 仓库中配置以下 Secrets：

### 🔑 核心必需的 Secrets

#### 1. `CLOUDFLARE_API_TOKEN`
- **描述**: Cloudflare API 令牌，用于部署到 Cloudflare Pages
- **获取方式**:
  1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
  2. 点击 "Create Token"
  3. 选择 "Custom token"
  4. 权限设置:
     - Zone:Zone:Read
     - Account:Account Settings:Read
     - Account:Cloudflare Pages:Edit
  5. 资源设置: Include "All zones"
  6. 保存并复制生成的令牌

#### 2. `CLOUDFLARE_ACCOUNT_ID`
- **描述**: Cloudflare 账户 ID
- **获取方式**:
  1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
  2. 右侧边栏找到 "Account ID"
  3. 复制该 ID

#### 3. `GROQ_API_KEY`
- **描述**: Groq API 密钥，用于音频转录功能（构建时需要）
- **获取方式**:
  1. 访问 [Groq Console](https://console.groq.com/keys)
  2. 创建新的 API 密钥
  3. 复制生成的密钥

#### 4. `GITHUB_TOKEN`
- **描述**: GitHub 令牌，用于访问仓库
- **配置方式**: 
  - 通常不需要手动配置，GitHub Actions 会自动提供 `${{ secrets.GITHUB_TOKEN }}`
  - 如果需要自定义，确保权限包含 "repo" 和 "workflow" 范围

### 🤖 可选的 Secrets

#### 5. `NOTIFICATION_SERVICE`
- **描述**: 通知服务类型 (slack/discord/none)
- **值**: `slack`, `discord`, 或 `none`
- **默认**: 如果未设置，将不发送通知

#### 6. `SLACK_WEBHOOK_URL`
- **描述**: Slack Webhook URL，用于部署通知
- **配置方式**:
  1. 在 Slack 中创建 Incoming Webhook
  2. 复制 Webhook URL

#### 7. `DISCORD_WEBHOOK_URL`
- **描述**: Discord Webhook URL，用于部署通知
- **配置方式**:
  1. 在 Discord 服务器中创建 Webhook
  2. 复制 Webhook URL

## ⚙️ 配置步骤

### 1. 进入 GitHub 仓库设置
1. 访问您的 GitHub 仓库
2. 点击 "Settings" 选项卡
3. 在左侧菜单中点击 "Secrets and variables" → "Actions"

### 2. 添加 Repository Secrets
1. 点击 "New repository secret"
2. 输入 Secret 名称
3. 输入 Secret 值
4. 点击 "Add secret"

### 3. 验证配置
配置完成后，GitHub Actions 将在下次运行时自动使用这些 Secrets。

## 🚀 部署流程

### 自动触发
- **推送代码到 main 分支**: 自动执行安全检查 → 构建 → 优化 → 部署到生产环境
- **工作流程名称**: `Build and Deploy`
- **并发控制**: 自动取消重复的部署请求

### 手动触发
```bash
# 触发完整部署工作流
git push origin main

# 工作流程会自动执行以下步骤：
# 1. 安全审计 (pnpm audit)
# 2. 构建应用 (pnpm build)
# 3. 优化构建产物
# 4. 部署到 Cloudflare Pages
```

## 🔍 故障排除

### 常见问题

#### 1. `CLOUDFLARE_API_TOKEN` 权限不足
**错误**: `Invalid API token`
**解决**: 确保令牌包含 Cloudflare Pages 编辑权限

#### 2. `GROQ_API_KEY` 缺失
**错误**: 构建失败，无法访问转录 API
**解决**: 在 GitHub Secrets 中添加有效的 Groq API Key

#### 3. 项目名称不匹配
**错误**: `Project not found`
**解决**: 确保 GitHub Actions 中的项目名称 (`umuo-app`) 与 Cloudflare Pages 项目名称一致

#### 4. 构建失败
**错误**: `Build failed`
**解决**: 检查构建日志，确保所有依赖都已正确安装

#### 5. 安全审计失败
**错误**: High security vulnerabilities found
**解决**: 运行 `pnpm audit fix` 或更新有漏洞的依赖

#### 6. 静态资源路径问题
**错误**: CSS/JS 文件 404
**解决**: 确保构建优化步骤正确复制了静态文件

### 调试步骤

1. **查看 Actions 日志**
   - 访问 GitHub 仓库的 "Actions" 选项卡
   - 点击失败的运行查看详细日志
   - 重点关注 "Build application" 和 "Deploy to Cloudflare Pages" 步骤

2. **本地测试**
   ```bash
   # 本地运行相同的构建命令
   pnpm install --frozen-lockfile
   pnpm build
   ```

3. **本地安全检查**
   ```bash
   # 检查安全漏洞
   pnpm audit --audit-level high
   ```

4. **手动部署测试**
   ```bash
   # 使用本地脚本测试部署
   pnpm deploy
   ```

## 📊 监控

### 部署状态
- GitHub Actions 会自动显示部署状态
- 成功/失败通知会通过配置的通知渠道发送
- 构建产物会保存 7 天，便于调试

### 应用监控
- 建议配置 Cloudflare Analytics
- 设置错误监控和性能追踪
- 监控 Cloudflare Pages 中的函数执行情况

### 性能优化
- 工作流程自动优化构建产物大小
- 移除不必要的开发文件和缓存
- 确保静态资源正确部署

---

---

## 🔧 工作流程概览

### 当前工作流程: `build-and-deploy.yml`

**触发条件**: 推送到 `main` 分支

**执行步骤**:
1. ✅ 环境设置 (Node.js 20 + pnpm)
2. 🔒 安全审计 (`pnpm audit --audit-level high`)
3. 🏗️ 应用构建 (`pnpm build`)
4. 📦 构建产物保存 (7天保留期)
5. 🔧 Cloudflare Pages 优化
6. 🚀 部署到 Cloudflare Pages
7. 📢 部署通知 (可选)

**并发控制**: 自动取消重复部署

---

**⚠️ 重要提示**: 
- 永远不要在代码中提交敏感信息
- 定期轮换 API 密钥 (特别是 Cloudflare tokens)
- 限制 Secrets 的访问权限，仅授予必要的权限
- 确保 `GROQ_API_KEY` 有足够的使用配额
- 定期检查 `pnpm audit` 的安全警告