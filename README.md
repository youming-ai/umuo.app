# Oumu.ai - 阴影学习应用

一个基于Web的阴影学习（shadowing）应用，支持音频转录、文本处理和语言学习功能。

## 🚀 功能特点

- **音频转录**: 使用 Groq Whisper-large-v3-turbo API 进行高质量语音识别
- **文本处理**: 通过 Groq Moonshot 模型进行文本标准化和注释
- **精确同步**: 段落级别的时间戳同步，支持A-B循环功能
- **本地存储**: 所有用户数据存储在本地 IndexedDB 中，保护隐私
- **统一主题**: 设计令牌驱动的浅色/暗色外观，包含语义状态色
- **渐进式Web应用**: 支持离线使用和安装到桌面

## 📋 项目状态

**开发阶段**: 核心功能已完成，处于代码清理和优化阶段

### ✅ 已完成功能
- 核心架构：Next.js 15 + React 19 + TypeScript + shadcn/ui
- 数据库层：Dexie (IndexedDB) 版本3，支持迁移和备份恢复
- API 路由：`/api/transcribe`（Groq）、`/api/postprocess`（Groq Moonshot）、`/api/progress`
- UI 组件：文件管理、音频播放器、字幕显示、设置页面
- 错误处理：统一的错误处理框架和重试机制
- 自定义 Hooks：模块化的状态管理
- 段落级别时间戳：精确的字幕同步
- 安全性：XSS 防护、无服务器端数据持久化
- 多 AI 服务支持：Groq、OpenRouter、Gemini

### ⚠️ 已知问题
- 测试框架正在重构中，部分测试文件被移除
- 持续的代码清理和类型定义优化
- 部分 TypeScript 警告（未使用的变量和 any 类型）

## ✨ 核心特性

- 🎵 **本地音频存储**：所有文件存储在浏览器IndexedDB中，支持自动备份和恢复
- 🗣️ **智能语音转录**：集成Groq Whisper-large-v3-turbo进行高质量转录
- 🔄 **文本智能处理**：Groq Moonshot (Kimi) 模型进行分句规范化、翻译和标注
- ⏯️ **高级播放控制**：支持A-B循环、变速播放、精确定位
- 📝 **实时字幕同步**：毫秒级字幕同步和高亮显示
- 🎯 **跟读练习模式**：点击句子自动循环播放，专为语言学习设计
- 📊 **进度跟踪**：实时转录和后处理进度监控
- 🏷️ **术语管理**：自定义术语库，支持统一翻译和标注
- 👤 **用户中心**：专属页面查看账户信息与 OUMU Pro 升级入口
- 🌐 **多 AI 服务支持**：支持 OpenRouter、Gemini 等多种 AI 服务

## 🛠️ 技术栈

- **前端**: Next.js 15, React 19, TypeScript
- **UI 组件**: shadcn/ui, Radix UI, Tailwind CSS
- **主题系统**: 自定义设计令牌 + next-themes（浅色/暗色/系统）
- **数据库**: IndexedDB (Dexie)
- **AI 服务**:
  - Groq Whisper-large-v3-turbo (转录)
  - Groq Moonshot (moonshotai/kimi-k2-instruct-0905) (文本处理)
  - OpenRouter DeepSeek Chat (备选)
  - Gemini (备选)
- **样式**: Tailwind CSS
- **开发工具**: Biome.js, Jest
- **通知**: Sonner (Toast)

### 数据流架构

```
用户上传音频 → IndexedDB存储 → 分片处理 → Groq转录 → AI模型后处理 → 字幕同步播放
     ↓              ↓           ↓          ↓           ↓              ↓
  文件管理      本地持久化     并发控制    语音识别   多AI服务处理      跟读练习
```

### AI 模型配置
- **转录模型**: Groq Whisper-large-v3-turbo
- **文本处理模型**: Groq Moonshot (moonshotai/kimi-k2-instruct-0905)
- **备选模型**: OpenRouter DeepSeek Chat, Gemini (通过环境变量配置)

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm (推荐) 或 npm

### 安装
```bash
git clone https://github.com/yourusername/oumu.ai.git
cd oumu.ai
pnpm install
```

### 环境配置
创建 `.env.local` 文件：
```env
# 主要 AI 服务 (必需)
GROQ_API_KEY=your_groq_api_key

# 可选 AI 服务 (用于文本处理，二选一)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=deepseek/deepseek-chat-v3.1:free
# 或
GEMINI_API_KEY=your_gemini_api_key

# 转录配置
TRANSCRIPTION_TIMEOUT_MS=300000
TRANSCRIPTION_RETRY_COUNT=3
TRANSCRIPTION_MAX_CONCURRENCY=2
```

### 开发
```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 📚 文档

详细文档请参考 `/docs` 目录：

- [项目概述](docs/OVERVIEW.md)
- [快速开始](docs/GETTING_STARTED.md)
- [架构设计](docs/ARCHITECTURE.md)
- [API 文档](docs/API/README.md)
- [开发指南](docs/DEVELOPMENT/README.md)
- [用户指南](docs/USER_GUIDE/README.md)

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 运行测试监听模式
pnpm test:watch
```

## 🎯 代码质量

```bash
# 类型检查
pnpm type-check

# 代码检查和格式化 (使用 Biome.js)
pnpm lint
pnpm format
pnpm check
```

## 🔧 开发工作流

1. **规划**: 在 `IMPLEMENTATION_PLAN.md` 中规划复杂工作
2. **测试**: 编写测试先（红色）
3. **实现**: 编写最小代码通过测试（绿色）
4. **重构**: 在测试通过的情况下清理代码
5. **提交**: 提交包含清晰的提交信息

## 🤝 贡献

欢迎贡献！请先阅读 [开发指南](docs/DEVELOPMENT/README.md) 并按照其中的流程提交变更。

## 📄 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系

如有问题或建议，请：
- 创建 Issue
- 发送邮件至 [your-email@example.com]
- 访问项目主页 [https://github.com/yourusername/oumu.ai]

---

**Oumu.ai** - 让语言学习更智能、更高效 🎵📚
