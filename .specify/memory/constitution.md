<!-- Sync Impact Report -->
<!-- Version change: null → 1.0.0 -->
<!-- Modified principles: N/A (initial constitution) -->
<!-- Added sections: All sections (initial constitution) -->
<!-- Removed sections: N/A -->
<!-- Templates requiring updates: ✅ plan-template.md ✅ spec-template.md ✅ tasks-template.md -->
<!-- Follow-up TODOs: None -->

# Oumu.ai Constitution

## Core Principles

### I. 用户体验优先
所有功能必须以语言学习者的需求为中心。界面设计必须直观易用，交互流程必须符合学习习惯，错误处理必须友好明确。用户反馈和体验测试是功能迭代的核心驱动力。

### II. 本地数据隐私保护
用户数据必须完全存储在本地IndexedDB中，不进行服务器端持久化。音频文件仅在进行转录时临时通过API发送给AI服务，不在服务器端存储。用户必须完全控制自己的数据，包括导入、导出和删除功能。

### III. 多AI服务集成与容错
支持Groq、OpenRouter、Gemini等多种AI服务，确保转录和文本处理的质量与可用性。必须实现服务降级和错误恢复机制，当主要服务不可用时自动切换到备选服务。

### IV. 渐进式Web应用标准
应用必须支持离线使用、桌面安装和移动端适配。实现Service Worker缓存策略，确保核心功能在离线状态下可用。界面响应式设计必须适配各种屏幕尺寸。

### V. 音频处理精确同步
音频与字幕必须实现毫秒级精确同步，支持A-B循环和精确定位。音频分片处理必须优化并发控制，确保处理效率的同时不阻塞用户界面。

## 技术架构约束

### 前端技术栈
必须使用Next.js 15 + React 19 + TypeScript架构。UI组件基于shadcn/ui + Radix UI + Tailwind CSS构建。状态管理遵循React Hooks模式，避免引入额外的状态管理库。

### 数据存储层
使用Dexie（IndexedDB包装库）作为唯一的数据持久化方案。数据库模式必须支持版本迁移，数据结构设计必须考虑查询效率和存储限制。

### 代码质量标准
所有TypeScript代码必须严格类型检查，禁止使用any类型。组件必须进行单元测试和集成测试。代码提交前必须通过linting和类型检查。

## 开发流程规范

### 功能开发流程
1. 功能规划：在IMPLEMENTATION_PLAN.md中记录复杂功能的开发计划
2. 测试先行：编写测试用例确保测试失败
3. 最小实现：编写最小代码通过测试
4. 重构优化：在测试通过前提下清理代码
5. 代码提交：提交包含清晰的提交信息

### 代码审查要求
所有代码变更必须经过自检，确保：
- 编译成功且无TypeScript错误
- 所有测试通过
- 代码符合项目格式规范
- 提交信息清晰说明变更原因

## 治理条例

本章程是项目开发的最高指导原则，任何开发实践和架构决策都必须符合章程要求。章程修订需要：
- 充分的讨论和理由说明
- 对现有影响的评估
- 迁移计划和兼容性考虑
- 版本号更新（语义化版本控制）

所有Pull Request和代码审查都必须验证是否符合章程要求。任何与章程冲突的实现都必须重新设计或提供充分的理由说明。

**版本**: 1.0.0 | **制宪日期**: 2025-01-01 | **修订日期**: 2025-10-02