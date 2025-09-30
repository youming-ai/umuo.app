# Lighthouse 优化实施计划

基于 Lighthouse 分析报告，本项目将分六个阶段进行优化，涵盖性能、可访问性、最佳实践和 SEO 四个方面。

## 📊 当前评分

| 类别 | 评分 | 优化目标 |
|------|------|----------|
| Performance | 99 | 100 |
| Accessibility | 88 | 95+ |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

## 🚀 阶段一：性能优化（Performance）

### 1.1 修复 viewport 设置
**问题**：`maximum-scale=1` 阻止用户缩放
**解决方案**：
- 在 `src/app/layout.tsx` 中移除 `maximum-scale: 1`
- 只保留 `width=device-width, initial-scale=1`

### 1.2 优化 Google Fonts 加载
**问题**：Material Icons 阻塞渲染
**解决方案**：
- 添加 `rel="preload"` 预加载字体
- 添加 `font-display: swap` 属性
- 考虑使用 `next/font` 本地化字体

### 1.3 检查 JavaScript 旧语法
**问题**：使用 `Array.prototype.at`、`trimStart` 等新语法
**解决方案**：
- 检查构建配置，确保正确转译旧浏览器需要的语法
- 使用 `@babel/preset-env` 按需转译

### 1.4 实现字体预加载策略
- 关键字体内联到 CSS
- 非关键字体异步加载
- 使用 `next/font` 优化字体加载

## ♿ 阶段二：可访问性优化（Accessibility）

### 2.1 修复按钮颜色对比度
**问题**：白色文字（#ffffff）在绿色背景（#16a34a）上对比度不足
**当前实现**：
- CSS 变量：`--brand-600: #16a34a`
- 按钮文字：`--text-inverse: #ffffff`
**解决方案**：
- 调整绿色为更深的色调（如 `#15803d`）
- 或者使用更深色调的文字（非纯白）

### 2.2 确保 viewport 可缩放
- 与 1.1 相同，移除 `maximum-scale=1`

### 2.3 添加 ARIA 支持
- 为所有交互元素添加 `aria-label`
- 添加 `role` 属性
- 确保屏幕阅读器兼容

### 2.4 键盘导航优化
- 确保所有交互元素可通过键盘访问
- 添加焦点指示器
- 实现合理的 Tab 顺序

## ✅ 阶段三：最佳实践优化（Best Practices）

### 3.1 添加 CSP 头
在 `next.config.js` 中添加：
```javascript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://api.groq.com https://openrouter.ai;"
}
```

### 3.2 添加 COOP 头
```javascript
{
  key: 'Cross-Origin-Opener-Policy',
  value: 'same-origin'
}
```

### 3.3 添加 COEP 头
```javascript
{
  key: 'Cross-Origin-Embedder-Policy',
  value: 'require-corp'
}
```

### 3.4 优化缓存策略
- 为静态资源设置长期缓存
- 使用哈希文件名
- 优化 Service Worker 缓存策略

## 🔍 阶段四：SEO 优化

### 4.1 添加 hreflang 支持
```html
<link rel="alternate" hreflang="zh-CN" href="https://example.com" />
<link rel="alternate" hreflang="en" href="https://example.com/en" />
```

### 4.2 添加 canonical 链接
```html
<link rel="canonical" href="https://example.com" />
```

### 4.3 优化 meta 标签
- 添加 Open Graph 标签
- 添加 Twitter Card 标签
- 优化描述和关键词

### 4.4 添加结构化数据
- 添加 JSON-LD 结构化数据
- 改进搜索引擎理解

## 🚀 阶段五：服务器配置优化

### 5.1 配置文本压缩
- 在 Next.js 中启用 Brotli 压缩
- 或在服务器层面配置

### 5.2 静态资源缓存
- 配置 Cache-Control 头
- 使用 CDN 加速

### 5.3 图片优化
- 使用 Next.js Image 组件
- 添加懒加载
- 支持现代格式（WebP/AVIF）

## 🧪 阶段六：验证和测试

### 6.1 Lighthouse 重新测试
- 在优化后重新运行 Lighthouse
- 验证所有问题已解决

### 6.2 跨浏览器测试
- Chrome、Firefox、Safari、Edge
- 移动端浏览器

### 6.3 性能回归测试
- 使用 WebPageTest
- 监控核心 Web 指标

### 6.4 文档更新
- 更新开发文档
- 记录优化措施

## 📝 实施建议

1. **按阶段实施**：不要一次性修改所有内容，分阶段进行并测试
2. **备份先行**：在修改前备份关键文件
3. **测试验证**：每个阶段完成后都要进行充分测试
4. **监控指标**：使用性能监控工具跟踪改进效果

## 🔧 技术细节

### 颜色对比度计算
当前配色：
- 背景色：#16a34a (RGB: 22, 163, 74)
- 文字色：#ffffff (RGB: 255, 255, 255)
- 对比度：1.47:1（WCAG AA 要求 4.5:1）

建议方案：
1. 深化背景色：#15803d（对比度 2.2:1）
2. 或使用非纯白文字：#f0f0f0（对比度 1.6:1）
3. 最佳方案：调整背景为 #166534（对比度 3.1:1）

### 字体加载优化
当前 Material Icons 加载：
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=swap" rel="stylesheet" />
```

优化后：
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=swap" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=swap" rel="stylesheet" />