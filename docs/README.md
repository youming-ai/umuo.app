# Oumu.ai 文档中心

欢迎来到 Oumu.ai 项目的综合文档中心。本文档为不同用户角色和需求提供全面的指导。

## 📚 文档结构

### 🚀 快速开始
- **适合新用户和开发者**
- [项目概述](OVERVIEW.md)
- [快速开始指南](GETTING_STARTED.md)

### 🏗️ 架构设计
- **适合系统架构师和技术利益相关者**
- [架构设计](ARCHITECTURE.md)

### 🔌 API 参考
- **适合与系统集成的人员**
- [API 概览](API/README.md)
- [转录 API](API/TRANSCRIBE.md)
- [后处理 API](API/POSTPROCESS.md)
- [进度 API](API/PROGRESS.md)

### 💻 开发指南
- **适合参与项目的开发者**
- [开发指南](DEVELOPMENT/README.md)

### 👥 用户指南
- **适合应用程序的最终用户**
- [用户指南](USER_GUIDE/README.md)
- [功能特性](USER_GUIDE/FEATURES.md)
- [故障排除](USER_GUIDE/TROUBLESHOOTING.md)
- [常见问题](USER_GUIDE/FAQ.md)

## 🔍 快速导航

### 项目新手？
从 [项目概述](OVERVIEW.md) 开始，获取项目概览。

### 想快速上手？
查看 [快速开始指南](GETTING_STARTED.md) 进行环境设置。

### 想使用应用程序？
查看 [用户指南](USER_GUIDE/README.md) 了解功能文档。

### 需要了解系统？
查看 [架构设计](ARCHITECTURE.md) 了解系统设计。

### 计划贡献？
阅读 [开发指南](DEVELOPMENT/README.md) 了解开发流程。

### 需要集成 API？
查看 [API 概览](API/README.md) 了解完整的 API 文档。

### 遇到问题？
查看 [故障排除](USER_GUIDE/TROUBLESHOOTING.md) 了解常见问题。

## 🛠️ 项目概览

Oumu.ai 是一个基于Web的阴影学习（shadowing）应用，支持音频转录、文本处理和语言学习功能。使用 Next.js 15、React 19、TypeScript 和 shadcn/ui 构建，提供：

- **音频处理**: 基于 Groq Whisper-large-v3-turbo 的分块音频转录
- **文本处理**: Groq Moonshot 模型支持的 AI 文本标准化
- **交互式学习**: 同步字幕和 A-B 循环功能
- **现代 UI**: 响应式设计，使用 shadcn/ui 组件
- **离线支持**: 使用 IndexedDB 进行本地数据持久化

## 📋 项目状态

**完成度**: 85-90%

### 核心功能
- 音频上传和本地存储
- 智能语音转录（Groq Whisper-large-v3-turbo）
- 文本标准化和处理（Groq Moonshot）
- 精确的字幕同步
- A-B 循环和变速播放
- 术语管理和自定义翻译

### 技术特点
- 本地优先的隐私保护
- 高质量的AI转录
- 响应式设计
- 渐进式Web应用支持

## 📞 支持

如需技术问题或支持：
- 查看 [故障排除](USER_GUIDE/TROUBLESHOOTING.md) 部分
- 查看 [GitHub Issues](https://github.com/yourusername/oumu.ai/issues)
- 在 [GitHub Discussions](https://github.com/yourusername/oumu.ai/discussions) 中提问
- 联系开发团队

## 📄 许可证

本项目采用 ISC 许可证。查看项目仓库了解详情。

## 🔄 文档更新

本文档持续改进。如需最新更改：
- 查看 [提交历史](https://github.com/yourusername/oumu.ai/commits/main/docs)
- 查看 [GitHub Issues](https://github.com/yourusername/oumu.ai/issues) 了解文档请求
- 提交 [pull requests](https://github.com/yourusername/oumu.ai/pulls) 进行改进

---

*最后更新: 2025年1月 | 文档重新组织和标准化完成*