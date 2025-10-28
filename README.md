# umuo.app - 智能语言学习应用

一个基于Web的阴影学习（shadowing）应用，支持音频转录、文本处理和智能语言学习功能。

## 🚀 功能特点

- **智能音频转录**: 使用 Groq Whisper-large-v3-turbo API 进行高质量语音识别
- **AI文本处理**: 通过 Groq 模型进行文本标准化、翻译和注释
- **精确同步**: 段落级别的时间戳同步，支持A-B循环功能
- **本地存储**: 所有用户数据存储在本地 IndexedDB 中，保护隐私
- **完整主题系统**: 支持4种主题（深色/浅色/系统/高对比度），WCAG合规
- **渐进式Web应用**: 支持离线使用和安装到桌面

## 📋 项目状态

**开发阶段**: 核心功能已完成
**最后更新**: 2025-10-18

### ✅ 已完成功能
- **核心架构**: Next.js 15 + React 19 + TypeScript + shadcn/ui
- **数据库层**: Dexie (IndexedDB) 版本3，支持迁移和备份恢复
- **API 路由**: `/api/transcribe`（Groq）、`/api/postprocess`（Groq）、`/api/progress`
- **UI 组件**: 文件管理、音频播放器、字幕显示、设置页面
- **完整主题系统**: 4种主题模式，WCAG AA级别对比度合规
- **错误处理**: 统一的错误处理框架和重试机制
- **自定义 Hooks**: 模块化的状态管理
- **段落级别时间戳**: 精确的字幕同步
- **安全性**: XSS 防护、无服务器端数据持久化
- **AI 服务支持**: Groq

## ✨ 核心特性

- 🎵 **本地音频存储**: 所有文件存储在浏览器IndexedDB中，支持自动备份和恢复
- 🗣️ **智能语音转录**: 集成Groq Whisper-large-v3-turbo进行高质量转录
- 🔄 **文本智能处理**: Groq 模型进行分句规范化、翻译和标注
- ⏯️ **高级播放控制**: 支持A-B循环、变速播放、精确定位
- 📝 **实时字幕同步**: 毫秒级字幕同步和高亮显示
- 🎯 **跟读练习模式**: 点击句子自动循环播放，专为语言学习设计
- 📊 **进度跟踪**: 实时转录和后处理进度监控
- 🏷️ **术语管理**: 自定义术语库，支持统一翻译和标注
- 👤 **用户中心**: 专属页面查看账户信息与 UMUO Pro 升级入口
- 🌙 **智能主题**: 4种主题模式，自动跟随系统偏好，高对比度支持

## 🛠️ 技术栈

- **前端**: Next.js 15, React 19, TypeScript
- **UI 组件**: shadcn/ui, Radix UI, Tailwind CSS
- **主题系统**: 自定义设计令牌，CSS变量驱动的4种主题
- **数据库**: IndexedDB (Dexie)
- **AI 服务**:
  - Groq Whisper-large-v3-turbo (音频转录)
  - Groq openai/gpt-oss-20b (文本处理)
- **样式**: Tailwind CSS + 自定义CSS变量
- **开发工具**: Biome.js
- **通知**: Sonner (Toast)
- **状态管理**: TanStack Query + React Hooks

### 数据流架构

```
用户上传音频 → IndexedDB存储 → 分片处理 → Groq转录 → AI模型后处理 → 字幕同步播放
     ↓              ↓           ↓          ↓           ↓              ↓
  文件管理      本地持久化     并发控制    语音识别   多AI服务处理      跟读练习
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm (推荐) 或 npm

### 安装
```bash
git clone https://github.com/youming-ai/umuo.app.git
cd umuo.app
pnpm install
```

### 环境配置
创建 `.env.local` 文件：
```env
# 必需配置
GROQ_API_KEY=your_groq_api_key

# 应用 URL (开发环境)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 可选转录配置
TRANSCRIPTION_TIMEOUT_MS=180000
TRANSCRIPTION_RETRY_COUNT=2
TRANSCRIPTION_MAX_CONCURRENCY=2
```

> 💡 **提示**: 完整的环境变量配置请参考 [.env.example](.env.example) 文件

### 开发
```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 🎨 主题系统

### 用户端
- 通过设置页面切换主题
- 支持系统主题自动跟随
- 主题选择自动保存到本地存储

### 开发者端
- **调试工具**: 按 `Ctrl+Shift+T` 打开主题调试器
- **文档**: 查看 [开发指南](CLAUDE.md)

## 📚 文档

- [开发指南](CLAUDE.md) - 详细的技术文档和架构说明

## 🧪 测试

```bash
# 类型检查和代码质量检查
pnpm type-check
pnpm lint

# 主题调试（在浏览器中）
# 1. 打开应用
# 2. 按 Ctrl+Shift+T 打开主题调试器
```

## 🎯 代码质量

```bash
# 类型检查
pnpm type-check

# 代码检查和格式化 (使用 Biome.js)
pnpm lint
pnpm format
pnpm check

# 构建验证
pnpm build
```

## 🔧 开发工作流

1. **规划**: 在开发前分析现有代码模式
2. **实现**: 编写简洁、可维护的代码
3. **测试**: 使用内置工具验证功能
4. **验证**: 运行类型检查和代码质量检查
5. **提交**: 提交包含清晰的提交信息

## 🤝 贡献

欢迎贡献！请先阅读 [开发指南](CLAUDE.md) 并按照其中的流程提交变更。

## 📄 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系

如有问题或建议，请：
- 创建 Issue
- 发送邮件至 [your-email@example.com]
- 访问项目主页 [https://umuo.app](https://umuo.app)

---

**umuo.app** - 让语言学习更智能、更高效 🎵📚🌙