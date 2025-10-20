# Tailwind CSS v4 Migration Plan

## 分支信息
- **分支**: `feature/tailwind-v4-migration`
- **基础版本**: Tailwind CSS v3.4.0
- **目标版本**: Tailwind CSS v4.0.0-beta

## 备份文件
- `tailwind.config.v3.backup.ts` - Tailwind v3 配置备份
- `src/app/globals.v3.backup.css` - CSS 文件备份
- `package.v3.backup.json` - 依赖备份

## 迁移阶段

### 阶段 1: 准备工作 ✅
- [x] 创建迁移分支
- [x] 备份现有配置文件
- [ ] 创建测试文档

### 阶段 2: 升级依赖
- [ ] 升级到 Tailwind CSS v4
- [ ] 更新相关依赖
- [ ] 配置构建工具

### 阶段 3: 配置迁移
- [ ] 重构 tailwind.config.ts
- [ ] 迁移 CSS 变量到 @theme
- [ ] 保留复杂的设计令牌

### 阶段 4: 测试验证
- [ ] 测试主题切换功能
- [ ] 验证组件样式
- [ ] 性能对比测试

## 已知的设计令牌 (需要保留)

### 品牌色系统
```css
--brand-50: #f0fdf4;
--brand-500: #22c55e;
--brand-600: #166534;
```

### 核心语义色
```css
--color-primary: var(--brand-600);
--text-primary: #f8fafc;
--surface-card: #1e293b;
```

### 播放器专用颜色
```css
--player-accent-color: var(--color-primary);
--player-highlight-bg: rgba(132, 204, 22, 0.18);
```

## 迁移注意事项
1. 保持现有的设计令牌结构
2. 确保主题切换功能正常
3. 测试所有组件的视觉一致性
4. 监控 CSS 包体积变化

## 回滚计划
如果迁移遇到问题，可以使用以下命令回滚：
```bash
git checkout main
git branch -D feature/tailwind-v4-migration
```

## 进度记录
- **开始时间**: 2025-01-20
- **当前状态**: 迁移中 - 遇到 @apply 语法问题

### 已完成 ✅
- [x] 升级 Tailwind CSS 到 v4.1.14
- [x] 安装 @tailwindcss/postcss 插件
- [x] 更新 PostCSS 配置
- [x] 修复部分 @apply 问题 (card-* 类)
- [x] 更新 CSS 导入语法 (@import "tailwindcss")

### 进行中 🔄
- [ ] 修复剩余的 @apply 问题 (btn-* 类)
- [ ] 解决 font-sans 类未定义问题

### 遇到的问题 ⚠️
1. **@apply 语法限制**: Tailwind v4 不允许在 @apply 中使用自定义类
2. **font-sans 未定义**: 需要在 @theme 中定义基础字体
3. **语法变化**: v4 的 @import 和 @theme 语法

### 解决方案
1. 将所有 @apply 自定义类替换为直接 CSS 属性
2. 在 @theme 中定义基础设计令牌
3. 逐步替换而非一次性更改

### 迁移暂停说明 ⚠️
**时间**: 2025-01-20
**原因**: Tailwind CSS v4 的 @apply 语法变化导致大规模重构需求

**发现的主要障碍**:
1. **@apply 语法限制**: v4 不允许在 @apply 中使用自定义类 (如 `card-base`, `btn-base`)
2. **重构工作量巨大**: 需要重写 100+ 个使用 @apply 的样式
3. **向后兼容性**: 现有组件样式依赖大量 @apply 指令

**建议的后续策略**:
1. **等待时机**: 等待 Tailwind CSS v4 更加成熟，或社区提供迁移工具
2. **渐进式迁移**: 在新功能中逐步采用 v4 语法，避免大规模重构
3. **保持当前版本**: 继续使用 Tailwind CSS v3，该版本稳定且满足项目需求

**已完成的价值**:
- 了解了 v4 的新特性和语法变化
- 验证了当前设计令牌系统的兼容性
- 为未来迁移积累了经验和文档