# GitHub Secrets 配置指南

## 📋 必需的 GitHub Secrets

为了使 GitHub Actions 自动部署正常工作，需要在 GitHub 仓库中配置以下 Secrets：

### 🔑 必需的 Secrets

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

#### 3. `GITHUB_TOKEN`
- **描述**: GitHub 令牌，用于访问仓库
- **配置方式**: 
  - 通常不需要手动配置，GitHub Actions 会自动提供 `${{ secrets.GITHUB_TOKEN }}`
  - 如果需要自定义，确保权限包含 "repo" 和 "workflow" 范围

### 🤖 可选的 Secrets

#### 4. `GROQ_API_KEY`
- **描述**: Groq API 密钥，用于音频转录功能
- **获取方式**:
  1. 访问 [Groq Console](https://console.groq.com/keys)
  2. 创建新的 API 密钥
  3. 复制生成的密钥

#### 5. `NOTIFICATION_SERVICE`
- **描述**: 通知服务类型 (slack/discord/none)
- **值**: `slack`, `discord`, 或 `none`

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

#### 8. `LHCI_GITHUB_APP_TOKEN`
- **描述**: Lighthouse CI GitHub App 令牌，用于性能测试报告
- **配置方式**:
  1. 安装 [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci)
  2. 获取令牌

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
- **推送代码到 main 分支**: 自动构建并部署到生产环境
- **创建 Pull Request**: 自动构建并运行性能测试

### 手动触发
```bash
# 触发部署工作流
git push origin main

# 仅构建不部署（用于测试）
git push origin main --dry-run
```

## 🔍 故障排除

### 常见问题

#### 1. `CLOUDFLARE_API_TOKEN` 权限不足
**错误**: `Invalid API token`
**解决**: 确保令牌包含 Cloudflare Pages 编辑权限

#### 2. 项目名称不匹配
**错误**: `Project not found`
**解决**: 确保 GitHub Actions 中的项目名称 (`umuo-app`) 与 Cloudflare Pages 项目名称一致

#### 3. 构建失败
**错误**: `Build failed`
**解决**: 检查构建日志，确保所有依赖都已正确安装

#### 4. 静态资源路径问题
**错误**: CSS/JS 文件 404
**解决**: 确保构建优化步骤正确复制了静态文件

### 调试步骤

1. **查看 Actions 日志**
   - 访问 GitHub 仓库的 "Actions" 选项卡
   - 点击失败的运行查看详细日志

2. **本地测试**
   ```bash
   # 本地运行相同的构建命令
   pnpm build
   ```

3. **手动部署测试**
   ```bash
   # 使用本地脚本测试部署
   pnpm deploy
   ```

## 📊 监控

### 部署状态
- GitHub Actions 会自动显示部署状态
- 成功/失败通知会通过配置的通知渠道发送

### 性能监控
- Lighthouse CI 会自动运行性能测试
- 报告会保存在 Actions Artifacts 中

### 应用监控
- 建议配置 Cloudflare Analytics
- 设置错误监控和性能追踪

---

**⚠️ 重要提示**: 
- 永远不要在代码中提交敏感信息
- 定期轮换 API 密钥
- 限制 Secrets 的访问权限