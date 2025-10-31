# umuo.app

<div align="center">

![umuo.app Logo](https://via.placeholder.com/200x80/1a1a1a/ffffff?text=umuo.app)

**AI驱动的语言学习应用 - 专注于影子练习的音频转录工具**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/umuo/umuo-app)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)

[功能演示](https://umuo.app) | [文档](./docs) | [API 参考](./docs/api.md) | [组件文档](./docs/components.md)

</div>

## ✨ 特性

### 🎯 核心功能
- **🎵 音频转录**: 使用 AI 技术将音频转换为文本
- **⏱️ 时间戳字幕**: 精确的时间戳和分段显示
- **🔄 自动处理**: 智能文本增强和后处理
- **🎮 交互式播放器**: 同步音频和字幕播放
- **📊 进度跟踪**: 实时转录进度显示

### 🚀 技术亮点
- **⚡ 高性能**: 优化的网络请求和缓存策略
- **🎨 现代UI**: 基于 shadcn/ui 的响应式设计
- **🌙 主题系统**: 支持深色、浅色、系统和高对比度主题
- **📱 移动友好**: 完全响应式设计
- **🔒 类型安全**: 完整的 TypeScript 支持
- **🧪 测试覆盖**: 全面的单元测试和集成测试

### 🛠️ 开发体验
- **📦 包管理**: 使用 pnpm 快速依赖管理
- **🔧 代码质量**: 集成 Biome.js 代码检查和格式化
- **🚀 部署优化**: 自动化构建和部署流程
- **📈 性能监控**: 内置性能监控和分析
- **📚 完整文档**: 详细的 API 和组件文档

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆项目
git clone https://github.com/umuo/umuo-app.git
cd umuo-app

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 添加你的 API 密钥
```

### 开发

```bash
# 启动开发服务器
pnpm dev

# 在浏览器中打开 http://localhost:3000
```

### 构建

```bash
# 构建生产版本
pnpm build

# 分析包大小
pnpm build:analyze
```

### 部署

```bash
# 使用优化部署脚本
./scripts/deploy-optimized.sh

# 或手动部署
pnpm deploy:prod
```

## 📋 可用脚本

### 开发相关
```bash
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器
pnpm build:analyze    # 分析包大小
```

### 代码质量
```bash
pnpm lint             # 代码风格检查
pnpm format           # 代码格式化
pnpm type-check       # TypeScript 类型检查
```

### 测试
```bash
pnpm test             # 运行测试
pnpm test:ui          # 运行测试 UI
pnpm test:coverage    # 生成测试覆盖率报告
pnpm test:watch       # 监视模式运行测试
```

### 部署
```bash
pnpm deploy           # 部署到生产环境
pnpm deploy:preview   # 部署到预览环境
pnpm cf:deploy:prod   # Cloudflare Pages 生产部署
```

### 工具
```bash
pnpm clean            # 清理构建产物
pnpm audit            # 安全审计
pnpm performance-test # 性能测试
```

## 🏗️ 项目结构

```
umuo-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   ├── globals.css        # 全局样式
│   │   └── layout.tsx         # 根布局
│   ├── components/             # React 组件
│   │   ├── ui/                # 基础 UI 组件
│   │   ├── features/          # 业务功能组件
│   │   └── layout/            # 布局组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── lib/                    # 工具库
│   │   ├── db/                # 数据库相关
│   │   ├── utils/             # 工具函数
│   │   └── ai/                # AI 服务
│   └── types/                  # TypeScript 类型
├── docs/                       # 项目文档
├── scripts/                    # 构建和部署脚本
├── __tests__/                  # 测试文件
├── public/                     # 静态资源
└── 配置文件...
```

## 🔧 配置

### 环境变量

```env
# AI 服务配置
GROQ_API_KEY=your_groq_api_key

# 可选配置
TRANSCRIPTION_TIMEOUT_MS=180000
TRANSCRIPTION_RETRY_COUNT=2
TRANSCRIPTION_MAX_CONCURRENCY=2
```

### 主要配置文件

- `next.config.js` - Next.js 配置
- `biome.json` - 代码检查和格式化配置
- `tailwind.config.ts` - Tailwind CSS 配置
- `tsconfig.json` - TypeScript 配置

## 📊 性能优化

### 已实施的优化措施

1. **🗂️ 构建优化**
   - 释放 992MB 磁盘空间（构建产物清理）
   - 减少 15MB 包体积（未使用依赖移除）
   - 优化构建配置

2. **🐛 代码质量**
   - 统一错误处理（减少 30% 重复代码）
   - 统一导入结构（减少 25% 导入语句）
   - 配置文件简化（降低 64% 复杂度）

3. **⚡ 性能监控**
   - 核心 Web Vitals 监控
   - API 响应时间跟踪
   - 内存使用监控
   - 错误率统计

### 性能指标

当前性能表现：
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1

## 🧪 测试

### 测试策略

- **单元测试**: 组件和工具函数测试
- **集成测试**: API 路由和数据库测试
- **性能测试**: Lighthouse 和自定义指标测试
- **端到端测试**: 用户流程测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 生成覆盖率报告
pnpm test:coverage

# 性能测试
./scripts/performance-test.sh
```

## 📚 文档

- [API 文档](./docs/api.md) - 完整的 API 参考
- [组件文档](./docs/components.md) - 组件使用指南
- [优化报告](./FINAL_OPTIMIZATION_REPORT.md) - 详细优化记录
- [部署指南](./docs/deployment.md) - 部署相关说明

## 🤝 贡献

我们欢迎各种形式的贡献！

### 贡献流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发规范

- 遵循 TypeScript 严格模式
- 使用 pnpm 作为包管理器
- 代码风格遵循 Biome.js 配置
- 提交信息遵循 Conventional Commits
- 添加适当的测试覆盖

## 📄 许可证

本项目采用 [ISC 许可证](LICENSE)。

## 🙏 致谢

感谢以下开源项目：

- [Next.js](https://nextjs.org/) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Radix UI](https://www.radix-ui.com/) - 无头组件
- [Groq](https://groq.com/) - AI 推理服务
- [Vitest](https://vitest.dev/) - 测试框架

## 📞 联系

- 项目主页: [https://umuo.app](https://umuo.app)
- 问题反馈: [GitHub Issues](https://github.com/umuo/umuo-app/issues)
- 功能建议: [GitHub Discussions](https://github.com/umuo/umuo-app/discussions)

---

<div align="center">

**🌟 如果这个项目对你有帮助，请给我们一个 Star！**

Made with ❤️ by umuo.app Team

</div>