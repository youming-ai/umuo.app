# 🏗️ umuo.app 项目结构文档

## 📋 项目概览

umuo.app 是一个现代化的语言学习应用，专注于影子跟读（shadowing）练习，具有 AI 驱动的音频转录功能。

## 📁 最终项目结构

```
umuo.app/
├── 📄 配置文件
│   ├── package.json                    # 项目配置和脚本
│   ├── next.config.js                 # Next.js 配置
│   ├── tailwind.config.ts             # Tailwind CSS 配置
│   ├── biome.json                     # 代码格式化配置
│   ├── wrangler.toml                  # Cloudflare Pages 配置
│   ├── components.json                 # shadcn/ui 组件配置
│   ├── postcss.config.js              # PostCSS 配置
│   └── tsconfig.json                  # TypeScript 配置
│
├── 📚 文档
│   ├── README.md                      # 项目说明文档
│   ├── CLAUDE.md                      # Claude AI 项目指导
│   ├── PROJECT_STRUCTURE.md           # 项目结构文档（本文件）
│   └── docs/                          # 额外文档目录
│
├── 🚀 脚本工具
│   └── scripts/
│       └── deploy-optimized.sh        # 优化的部署脚本
│
├── 📂 源代码目录
│   └── src/
│       ├── app/                        # Next.js App Router
│       │   ├── (dashboard)/           # 路由组（可选）
│       │   ├── api/                    # API 路由
│       │   │   ├── transcribe/
│       │   │   ├── postprocess/
│       │   │   └── progress/[fileId]/
│       │   ├── globals.css             # 全局样式
│       │   ├── layout.tsx              # 根布局组件
│       │   ├── page.tsx                # 首页
│       │   ├── account/page.tsx        # 账户页面
│       │   └── settings/page.tsx       # 设置页面
│       │
│       ├── components/                 # React 组件
│       │   ├── features/               # 功能组件
│       │   │   ├── player/            # 音频播放器组件
│       │   │   │   ├── PlayerPage.tsx
│       │   │   │   ├── AudioPlayer.tsx
│       │   │   │   ├── SubtitleDisplay.tsx
│       │   │   │   └── ...
│       │   │   ├── file/              # 文件管理组件
│       │   │   │   ├── FileList.tsx
│       │   │   │   ├── FileUpload.tsx
│       │   │   │   ├── FileCard.tsx
│       │   │   │   └── ...
│       │   │   └── settings/          # 设置组件
│       │   │       ├── SettingsPage.tsx
│       │   │       ├── SettingsControls.tsx
│       │   │       └── ...
│       │   ├── ui/                    # 基础 UI 组件 (shadcn/ui)
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   └── ...
│       │   └── layout/                # 布局组件
│       │       ├── providers/
│       │       │   └── QueryProvider.tsx
│       │       └── contexts/
│       │           └── ThemeContext.tsx
│       │
│       ├── hooks/                       # 自定义 React Hooks
│       │   ├── api/                    # API 相关 Hooks
│       │   │   ├── useTranscription.ts
│       │   │   └── useTranscriptionManager.ts
│       │   ├── db/                     # 数据库 Hooks
│       │   │   ├── useFiles.ts
│       │   │   └── useFileList.ts
│       │   └── ui/                     # UI 相关 Hooks
│       │       ├── useAudioPlayer.ts
│       │       ├── useAppState.ts
│       │       └── ...
│       │
│       ├── lib/                        # 工具库和配置
│       │   ├── ai/                     # AI 服务集成
│       │   │   ├── enhanced-groq-client.ts
│       │   │   ├── transcription-service.ts
│       │   │   ├── text-postprocessor.ts
│       │   │   └── ...
│       │   ├── db/                     # 数据库操作
│       │   │   └── db.ts                # Dexie 数据库配置
│       │   ├── utils/                  # 通用工具函数
│       │   │   ├── utils.ts
│       │   │   ├── error-utils.ts
│       │   │   ├── security.ts
│       │   │   ├── retry-utils.ts
│       │   │   └── ...
│       │   └── config/                 # 配置文件
│       │       └── routes.ts
│       │
│       ├── types/                       # TypeScript 类型定义
│       │   ├── api/                    # API 类型
│       │   │   └── errors.ts
│       │   ├── db/                     # 数据库类型
│       │   │   └── database.ts
│       │   └── ui/                     # UI 类型
│       │       ├── app-state.ts
│       │       ├── theme.ts
│       │       └── dashboard-data.ts
│       │
│       └── styles/                     # 样式文件
│           └── globals.css            # 全局 CSS
│
├── 🌐 静态资源
│   └── public/
│       ├── icon.png                   # 应用图标
│       ├── manifest.json              # PWA 清单
│       ├── sw.js                      # Service Worker
│       └── _worker.js                 # Cloudflare Worker（可选）
│
├── 🔧 开发配置
│   ├── .git/                        # Git 配置
│   ├── .vscode/                      # VSCode 配置
│   └── .wrangler/                    # Wrangler 配置
│
├── 📦 依赖管理
│   ├── package.json                  # 项目依赖和脚本
│   ├── pnpm-lock.yaml               # 锁定依赖版本
│   └── node_modules/               # 安装的依赖
│
└── 🔐 环境配置
    ├── .env.example                 # 环境变量模板
    ├── .gitignore                  # Git 忽略文件
    └── .wranglerignore              # Wrangler 忽略文件
```

## 🎯 核心特性

### 技术栈
- **框架**: Next.js 15 (App Router) + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **状态管理**: TanStack Query + React Hooks
- **数据库**: IndexedDB (Dexie)
- **AI服务**: Groq SDK (Whisper transcription)
- **部署**: Cloudflare Pages (Git 集成)
- **代码质量**: Biome.js + ESLint

### 功能模块

#### 🎵 音频播放器
- 支持多种音频格式 (MP3, WAV, M4A, OGG, FLAC)
- 字幕同步显示
- 播放速度控制
- 音量控制
- 单词级时间戳支持

#### 📁 文件管理
- 拖拽上传支持
- 文件列表展示
- 上传进度跟踪
- 文件验证和安全检查

#### ⚙️ 设置系统
- 主题切换 (暗色/浅色/系统/高对比度)
- 用户配置管理
- 应用设置
- 反馈系统

#### 🤖 AI 转录服务
- Groq Whisper 大规模语音识别
- 实时转录进度
- 文本后处理和增强
- 并发控制

### 🔧 开发工具

#### 构建和部署
```bash
# 开发服务器
pnpm dev

# 生产构建
pnpm build

# 代码检查
pnpm lint
pnpm type-check

# 测试
pnpm test

# 部署
pnpm deploy                    # 完整部署
pnpm deploy:preview           # 预览部署
pnpm deploy:quick              # 快速部署
```

#### 自动化部署
- **Git 集成**: 推送到 main 分支自动部署到 Cloudflare Pages
- **性能测试**: 集成性能监控和测试
- **代码质量**: 自动化代码检查和格式化

## 🚀 部署信息

### 生产环境
- **URL**: https://umuo-app.pages.dev
- **平台**: Cloudflare Pages
- **自动部署**: Cloudflare Pages Git 集成

### 环境变量
- `NODE_ENV`: 运行环境
- `NEXT_PUBLIC_APP_URL`: 应用 URL
- `GROQ_API_KEY`: Groq API 密钥
- `TRANSCRIPTION_*`: 转录配置

## 📊 项目统计

### 代码规模
- **TypeScript 文件**: 100+
- **React 组件**: 50+
- **Hooks**: 15+
- **API 端点**: 3
- **测试文件**: 预配置

### 依赖管理
- **生产依赖**: 20+
- **开发依赖**: 10+
- **包管理器**: pnpm
- **Node.js 版本**: >=18.0.0

## 🛠️ 开发指南

### 添加新功能
1. 在 `src/components/features/` 中创建功能组件
2. 在 `src/lib/` 中添加工具函数
3. 在 `src/hooks/` 中添加自定义 Hooks
4. 更新类型定义在 `src/types/`

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循组件和文件命名约定
- 使用 Biome.js 进行代码格式化
- 编写测试用例

### 提交规范
- 使用语义化的提交信息
- 遵循 Conventional Commits 规范
- 通过代码质量检查再提交

## 🔮 配置说明

### Next.js 配置 (next.config.js)
- 图片优化禁用 (适配 Cloudflare Pages)
- 包导入优化
- Webpack 配置优化
- 安全头部设置

### Tailwind CSS 配置
- 自定义设计令牌
- 响应式断点
- 深色主题支持
- 组件样式变体

### TypeScript 配置
- 严格模式
- 路径映射配置
- 类型检查选项

## 📈 性能优化

### 构建优化
- 代码分割和懒加载
- 静态资源缓存
- Bundle 大小优化
- 字体预加载

### 运行时优化
- 客户端缓存策略
- API 请求优化
- 组件级缓存
- 内存使用优化

## 🧪 测试策略

### 测试框架
- **单元测试**: Vitest + Testing Library
- **E2E 测试**: Playwright (预配置)
- **性能测试**: Lighthouse CI
- **安全测试**: 依赖审计

### 测试覆盖
- 组件渲染测试
- Hook 功能测试
- API 端点测试
- 用户交互测试

---

**📅 文档更新时间**: 2024年10月23日  
**👨 维护者**: umuo.app 开发团队  
**📝 版本**: 1.0.0