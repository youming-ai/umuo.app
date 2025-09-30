# UI 组件参考 - 影子跟读项目

## 核心组件展示

### 1. 导航栏组件 (Navigation)

```css
/* 固定顶部居中导航 */
position: fixed;
top: 1rem;
left: 50%;
transform: translateX(-50%);
z-index: 20;

/* 容器样式 */
background: rgba(255, 255, 255, 0.85);
backdrop-filter: blur(sm);
border: 2px solid var(--border-primary);
border-radius: 9999px; /* pill shape */
padding: 0.375rem;
box-shadow: var(--shadow-md);
```

**特点**:
- 🎯 固定定位，居中显示
- 🌟 半透明背景 + 毛玻璃效果
- 🔘 圆角药丸形状
- 🎨 Material Icons 图标系统
- 🌓 支持主题切换按钮

### 2. 统计卡片组件 (StatsCards)

```css
.stats-card {
  background-color: var(--surface-card);
  border: 2px solid var(--border-primary);
  border-bottom-width: 4px; /* 立体效果 */
  border-radius: 1.75rem;
  box-shadow: var(--shadow-md);
  padding: 1.5rem;
  transition: transform 0.2s ease;
}

.stats-card:hover {
  transform: translateY(-0.25rem);
}
```

**布局**:
```
┌─────────────────────────────┐
│ 📁 已上传文件        📁    │
│          0                    │
└─────────────────────────────┘
```

**特点**:
- 📊 三列响应式网格布局
- 🎨 立体边框设计 (底部加厚)
- ⚡ 悬停上升效果
- 📈 统计数据大字体显示

### 3. 文件上传组件 (FileUpload)

```css
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  border-radius: 1.5rem;
  border: 2px dashed var(--state-success-border);
  background-color: var(--upload-bg-color);
  padding: 4rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
```

**视觉层次**:
```
        ☁️ (60px 图标)

    拖拽文件到这里
  支持 MP3、WAV、M4A...

    [ 选择文件 ] (主按钮)
```

**特点**:
- 🎯 大图标引导用户注意力
- 📝 清晰的操作说明
- 🎨 绿色主题边框
- 📱 响应式内边距
- ♿ 完整的无障碍支持

### 4. 主按钮组件 (btn-primary)

```css
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3.5rem;
  padding: 0 2rem;
  background-color: var(--button-color);
  color: var(--button-text-color);
  border-radius: var(--radius-control);
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  box-shadow: 0 4px 0 0 var(--button-shadow-color);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background-color: var(--button-hover-color);
}

.btn-primary:active {
  box-shadow: none;
  transform: translateY(4px);
}
```

**3D 效果演示**:
```
正常状态:    [ 按钮文字 ]  ← 阴影在下
悬停状态:    [ 按钮文字 ]  ← 颜色变化
按下状态:  [ 按钮文字 ]  ← 阴影消失，下沉
```

**特点**:
- 🎮 3D 立体按钮效果
- ⚡ 快速交互反馈 (200ms)
- 🎨 统一的绿色主题
- 📏 标准化高度 (56px)
- 🔤 大写字母 + 字间距

### 5. 播放器控制组件

```css
.player-card {
  background-color: var(--player-card-bg);
  border: 2px solid var(--player-card-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-lg);
  padding: var(--space-card-padding-sm);
}

.player-seek {
  background-color: var(--player-track-color);
  height: 0.5rem;
  border-radius: 9999px;
  cursor: pointer;
  position: relative;
}

.player-seek-progress {
  background-color: var(--player-accent-color);
  height: 100%;
  border-radius: 9999px;
  transition: width 0.15s ease;
}
```

**播放器布局**:
```
┌─────────────────────────────────┐
│ 🎵 正在播放: filename.mp3      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │ ← 进度条
│ 00:45                    03:20 │
│                                │
│ ⏮️      ⏯️      ⏭️ 🔊 📋        │ ← 控制按钮
└─────────────────────────────────┘
```

**特点**:
- 🎵 圆角卡片设计
- 📊 自定义进度条样式
- 🎮 圆形控制按钮
- ⏱️ 时间显示
- 🎨 绿色主题强调色

### 6. 字幕显示组件

```css
.subtitle-line {
  padding: 1rem;
  border-radius: 0.75rem;
  margin-bottom: 2rem;
  transition: background-color 0.3s ease;
}

.subtitle-line.highlight {
  background-color: var(--player-highlight-bg);
}

.word-group {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-right: 0.25em;
}

.word-group ruby {
  display: inline-flex;
  flex-direction: column-reverse;
  line-height: 1.2;
}

.word-group rt {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.word-group rb {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-color);
}
```

**字幕结构**:
```
┌─────────────────────────────────────┐
│ こんにちは  世界     │
│   にち    せかい           │ ← 假名标注
│                                 │
│ 你好，世界                     │ ← 翻译
└─────────────────────────────────────┘
```

**特点**:
- 🇯🇵 日语假名标注支持
- 📝 多语言显示
- 🎯 当前句子高亮
- 📱 响应式字体大小
- ⏱️ 与音频同步高亮

### 7. 性能仪表板组件

```css
.metric-card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-default);
  padding: 1.5rem;
}

.metric-value {
  font-size: 3rem;
  font-weight: 700;
  margin-right: 0.25rem;
}

.metric-unit {
  color: var(--text-muted);
  margin-left: 0.25rem;
}
```

**仪表板布局**:
```
┌─────────────────────────────────────┐
│        性能监控仪表板              │
├─────────────────────────────────────┤
│ 健康评分  📊  活动操作  总操作数   │ ← 指标卡片
│   85分      5个      120个        │
├─────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐ │
│  │图表1│  │图表2│  │图表3│  │图表4│ │ ← 性能图表
│  └─────┘  └─────┘  └─────┘  └─────┘ │
├─────────────────────────────────────┤
│ 告警 💥              优化建议 💡    │
│ ┌─────────┐          ┌─────────┐    │
│ │ ⚠️ 警告 │          │ 💡 建议  │    │
│ └─────────┘          └─────────┘    │
└─────────────────────────────────────┘
```

**特点**:
- 📊 实时数据可视化
- 🎨 状态颜色编码
- 🔄 自动刷新 (30秒)
- 📱 响应式网格布局
- ⚠️ 分级告警系统

## 主题颜色参考

### 主色调
```css
/* 绿色系主题 */
--brand-50:  #f0fdf4  /* 最浅 */
--brand-100: #dcfce7
--brand-200: #bbf7d0
--brand-300: #86efac
--brand-400: #4ade80
--brand-500: #22c55e  /* 标准绿 */
--brand-600: #166534  /* 主色 */
--brand-700: #15803d  /* 悬停 */
--brand-800: #166534  /* 激活 */
--brand-900: #14532d  /* 最深 */
```

### 语义颜色
```css
/* 状态色 */
--success: var(--brand-500);  /* #22c55e */
--warning: #f59e0b;           /* 橙色 */
--error:   #ef4444;           /* 红色 */
--info:    var(--brand-500);  /* 绿色 */
```

### 中性色
```css
/* 灰色系 */
--neutral-50:  #f9fafb  /* 最浅灰 */
--neutral-100: #f3f4f6
--neutral-200: #e5e7eb
--neutral-300: #d1d5db
--neutral-400: #9ca3af
--neutral-500: #6b7280
--neutral-600: #4b5563
--neutral-700: #374151
--neutral-800: #1f2937
--neutral-900: #111827  /* 最深灰 */
```

## 响应式断点

```css
/* 移动优先设计 */
sm: 640px   /* 小平板 */
md: 768px   /* 大平板 */
lg: 1024px  /* 小桌面 */
xl: 1280px  /* 大桌面 */
2xl: 1536px /* 超大桌面 */
```

## 常用样式类

### 布局
```css
.container    { max-width: 4xl; margin: 0 auto; }
.flex-center  { display: flex; align-items: center; justify-content: center; }
.grid-auto    { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
```

### 间距
```css
.p-4 { padding: 1rem; }
.m-6 { margin: 1.5rem; }
.gap-8 { gap: 2rem; }
```

### 文字
```css
.text-title   { font-size: 1.875rem; font-weight: 900; }
.text-body    { font-size: 1rem; font-weight: 400; }
.text-caption { font-size: 0.875rem; color: var(--text-muted); }
```

## 动画效果

### 过渡
```css
.transition-fast   { transition: all 0.15s ease; }
.transition-normal  { transition: all 0.2s ease; }
.transition-slow    { transition: all 0.3s ease; }
```

### 变换
```css
.hover-lift:hover    { transform: translateY(-0.25rem); }
.active-press:active { transform: translateY(0.25rem); }
.hover-scale:hover   { transform: scale(1.05); }
```

---

**组件库版本**: v1.0.0
**最后更新**: 2025-01-25
**维护团队**: 影子跟读开发团队