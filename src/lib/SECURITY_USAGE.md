# 安全防护模块使用指南

## 概述

本项目实现了一个全面的 XSS 防护系统，专门针对字幕渲染和用户输入处理进行了优化。该系统提供了多层安全防护，确保所有动态内容都经过净化和验证。

## 核心功能

### 1. 安全检查 (`checkSecurity`)

检查内容的安全性并生成详细的安全报告。

```typescript
import { checkSecurity } from '@/lib/security';

const result = checkSecurity('<script>alert("xss")</script>');
console.log(result.isSafe); // false
console.log(result.score); // 80 以下
console.log(result.issues); // 安全问题列表
```

### 2. HTML 净化 (`sanitizeHtml`)

移除危险的 HTML 标签和属性，保留安全的语义化标签。

```typescript
import { sanitizeHtml } from '@/lib/security';

const malicious = '<script>alert("xss")</script><p>安全内容</p>';
const clean = sanitizeHtml(malicious);
// 结果: "<p>安全内容</p>"
```

### 3. 安全的元素创建

替代直接使用 `innerHTML`，提供安全的内容设置方式。

```typescript
import { createSafeElement, createSafeSubtitleElement } from '@/lib/security';

// 创建通用安全元素
const element = createSafeElement('div', '内容', { class: 'safe' });

// 创建专门的字幕元素
const subtitle = createSafeSubtitleElement('字幕内容', {
  'data-start': '100',
  'data-end': '500'
});
```

### 4. Furigana 安全渲染

专门为日语假名标注提供的安全渲染功能。

```typescript
import { renderSafeFurigana } from '@/lib/security';

const result = renderSafeFurigana('日本語', '日本語(にほんご)');
// 结果: "<ruby>日本語<rt>にほんご</rt></ruby>"
```

## 安全配置

### 默认允许的标签

```typescript
const DEFAULT_ALLOWED_TAGS = [
  'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'code', 'pre', 'kbd', 'samp',
  'a', 'img', 'picture',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'caption', 'col', 'colgroup',
  'ruby', 'rt', 'rp', 'rb',  // 日语假名标注支持
  'small', 'sub', 'sup'
];
```

### 危险标签（自动移除）

- `script`, `iframe`, `frame`, `frameset`
- `object`, `embed`, `applet`
- `link`, `style`, `meta`, `base`
- `form`, `input`, `button`, `select`, `textarea`
- `canvas`, `svg`, `math`, `noscript`
- `audio`, `video`, `source`, `track`

### 危险属性（自动移除）

- 所有 `on*` 事件处理器
- `javascript:`, `data:`, `vbscript:` 协议
- `style` 属性（防止 CSS 注入）
- `eval`, `expression`, `script` 等关键词

## 在字幕系统中的使用

### 1. 字幕渲染

原来的不安全实现：
```typescript
// ❌ 危险：直接使用 innerHTML
div.innerHTML = subtitle.text;
```

现在的安全实现：
```typescript
// ✅ 安全：使用 createSafeSubtitleElement
const element = createSafeSubtitleElement(renderedContent, {
  'data-start': subtitle.start.toString(),
  'data-end': subtitle.end.toString(),
  'data-id': subtitle.id.toString()
});
```

### 2. 字幕内容处理

在 `subtitle-sync.ts` 中，所有内容都会经过多重安全检查：

1. 基本安全检查
2. 翻译内容的安全验证
3. Furigana 内容的安全渲染
4. 最终 HTML 净化

```typescript
function renderSubtitle(subtitle: Subtitle, showTranslation: boolean = false): string {
  // 1. 基本内容安全检查
  const securityCheck = checkSecurity(renderedText, SUBTITLE_SANITIZE_OPTIONS);
  if (!securityCheck.isSafe) {
    renderedText = sanitizeHtml(renderedText, SUBTITLE_SANITIZE_OPTIONS);
  }

  // 2. 翻译内容安全检查
  if (showTranslation && subtitle.translation) {
    const translationSecurity = checkSecurity(subtitle.translation, SUBTITLE_SANITIZE_OPTIONS);
    // 使用安全的翻译内容
  }

  // 3. Furigana 安全渲染
  if (subtitle.furigana) {
    renderedText = addSafeFurigana(renderedText, subtitle.furigana);
  }

  return renderedText;
}
```

## 自定义配置

### 自定义净化选项

```typescript
const customOptions: SanitizeOptions = {
  allowedTags: ['p', 'strong', 'em'],
  allowedAttributes: {
    'p': ['class', 'id'],
    'strong': ['class']
  },
  allowStyles: false,
  allowDataUrls: false,
  removeComments: true
};

const sanitized = sanitizeHtml(content, customOptions);
```

### 专门的安全配置

系统提供了针对不同场景的预配置：

1. **字幕配置** (`SUBTITLE_SANITIZE_OPTIONS`)：专门优化字幕渲染
2. **通用配置** (`DEFAULT_ALLOWED_TAGS`)：适用于一般场景
3. **严格配置**：只允许最基本的文本格式

## 测试和验证

### 运行测试

```bash
pnpm test -- src/lib/security-basic.test.ts
```

### 浏览器演示

在浏览器控制台中运行演示：

```javascript
// 如果在开发环境中
window.securityDemos.runAll();

// 或者单独运行特定演示
window.securityDemos.checkSecurity();
window.securityDemos.sanitizeHtml();
```

## 最佳实践

### 1. 始终使用安全函数

- ❌ 避免：`element.innerHTML = userContent`
- ✅ 推荐：`setElementContent(element, userContent)`
- ✅ 推荐：`createSafeElement('div', userContent)`

### 2. 配置适当的白名单

- 根据具体需求配置允许的标签和属性
- 对于字幕内容，使用专门的安全配置
- 对于用户评论，使用更严格的配置

### 3. 输入验证

- 在数据进入时进行验证
- 在数据输出时进行净化
- 保持多层防护

### 4. 错误处理

- 始终处理净化失败的情况
- 提供有意义的错误信息
- 记录安全事件

## 性能考虑

### 1. 缓存机制

系统内部对正则表达式进行了缓存，提高重复使用的性能。

### 2. 增量处理

对于大内容，系统采用增量处理方式，避免内存问题。

### 3. 配置优化

- 只配置必要的标签和属性
- 避免过于复杂的规则
- 在安全性和性能之间取得平衡

## 向后兼容性

系统完全向后兼容：

1. 现有的 API 接口保持不变
2. 字幕渲染功能正常工作
3. Furigana 功能继续支持
4. 所有现有功能不受影响

## 安全更新

建议定期：

1. 更新危险标签和属性列表
2. 检查新的安全威胁
3. 运行安全测试
4. 审查配置设置

## 故障排除

### 常见问题

1. **内容被过度净化**
   - 检查允许的标签列表
   - 调整安全配置

2. **性能问题**
   - 减少允许的标签数量
   - 优化正则表达式

3. **Furigana 不显示**
   - 检查 Furigana 格式
   - 确认安全配置允许 ruby 标签

### 调试方法

```typescript
// 启用详细日志
const result = checkSecurity(content);
console.log('安全问题:', result.issues);

// 检查净化过程
const sanitized = sanitizeHtml(content);
console.log('净化结果:', sanitized);
```

## 总结

这个安全防护系统为项目提供了全面的 XSS 防护，特别是在字幕渲染和用户输入处理方面。通过多层安全检查、灵活的配置选项和全面的测试覆盖，确保了系统的安全性和可靠性。