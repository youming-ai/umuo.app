# Mobile Responsive Design Utilities Documentation

This document provides comprehensive documentation for the mobile-first responsive design utilities system implemented in `mobile.css`.

## Table of Contents

- [Overview](#overview)
- [Breakpoint System](#breakpoint-system)
- [Touch-Optimized Utilities](#touch-optimized-utilities)
- [Typography System](#typography-system)
- [Layout Utilities](#layout-utilities)
- [Component Styles](#component-styles)
- [Navigation Patterns](#navigation-patterns)
- [Audio Player Styles](#audio-player-styles)
- [File Upload Styles](#file-upload-styles)
- [Performance Optimizations](#performance-optimizations)
- [Accessibility Features](#accessibility-features)
- [Theme Integration](#theme-integration)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## Overview

The mobile CSS system provides a comprehensive set of utilities designed specifically for mobile-first responsive design. It starts at 320px minimum width and scales up through various breakpoints, ensuring excellent mobile user experience across all devices.

### Key Features

- **Mobile-first approach**: All styles start at 320px and scale up
- **Touch-optimized interfaces**: 44px minimum touch targets (WCAG compliant)
- **Safe area support**: Native iPhone X+ notch and gesture area support
- **Fluid typography**: Responsive text that scales with viewport
- **Performance optimized**: Hardware acceleration and reduced motion support
- **Accessibility focused**: High contrast mode, screen reader support
- **Theme integrated**: Works with existing dark/light/high-contrast themes

## Breakpoint System

### Mobile-First Breakpoints

```css
--mobile-xs: 320px;   /* Small phones */
--mobile-sm: 375px;   /* Standard phones (iPhone SE) */
--mobile-md: 414px;   /* Large phones (iPhone Pro) */
--mobile-lg: 768px;   /* Tablets (iPad) */
--desktop-sm: 1024px; /* Small desktops */
--desktop-md: 1280px; /* Standard desktops */
--desktop-lg: 1536px; /* Large desktops */
```

### Breakpoint Usage Examples

```html
<!-- Base styles work from 320px -->
<div class="mobile-container">
  <!-- Container automatically adjusts padding at different breakpoints -->
</div>

<!-- Responsive typography that scales between breakpoints -->
<h1 class="mobile-text-responsive-xl">Scalable Heading</h1>

<!-- Layout that adapts to screen size -->
<div class="mobile-grid mobile-grid-cols-1 mobile-gap-md">
  <!-- Single column on mobile, adjusts at larger breakpoints -->
</div>
```

## Touch-Optimized Utilities

### Touch Target Sizing

All interactive elements meet WCAG 2.1 guidelines for minimum touch targets:

```html
<!-- Standard 44px touch target -->
<button class="mobile-touch-target">
  Touch me
</button>

<!-- Large 48px touch target for important actions -->
<button class="mobile-touch-target-large">
  Primary Action
</button>
```

### Touch Feedback

Enhanced visual feedback for touch interactions:

```html
<button class="mobile-touch-feedback">
  <!-- Ripple effect on touch -->
  Tap me
</button>
```

### Touch Spacing

Proper spacing between touch targets:

```html
<div class="mobile-touch-spacing">
  <button>Button 1</button>
  <button>Button 2</button>
  <!-- 8px gap between buttons -->
</div>
```

## Typography System

### Fluid Typography

Responsive text that scales smoothly with viewport width:

```html
<!-- Fluid text that scales from 14px to 18px -->
<p class="mobile-text-fluid">Responsive paragraph text</p>

<!-- Responsive headings that scale with breakpoints -->
<h1 class="mobile-heading-lg">Large responsive heading</h1>
<h2 class="mobile-heading-md">Medium responsive heading</h2>
<h3 class="mobile-heading-sm">Small responsive heading</h3>
```

### Fixed Mobile Text Sizes

```html
<p class="mobile-text-xs">Extra small text (12px)</p>
<p class="mobile-text-sm">Small text (14px)</p>
<p class="mobile-text-base">Base text (16px)</p>
<p class="mobile-text-lg">Large text (18px)</p>
<p class="mobile-text-xl">Extra large text (20px)</p>
<p class="mobile-text-2xl">2X large text (24px)</p>
<p class="mobile-text-3xl">3X large text (30px)</p>
```

### Responsive Text Classes

Text that automatically adjusts between breakpoints:

```html
<p class="mobile-text-responsive-xs">Scales from 12px to 14px</p>
<p class="mobile-text-responsive-sm">Scales from 14px to 16px</p>
<p class="mobile-text-responsive-base">Scales from 16px to 18px</p>
<p class="mobile-text-responsive-lg">Scales from 18px to 20px</p>
<p class="mobile-text-responsive-xl">Scales from 20px to 24px</p>
```

## Layout Utilities

### Container System

```html
<!-- Mobile container with safe area support -->
<div class="mobile-container">
  <!-- Content here -->
</div>

<!-- Container with safe area insets -->
<div class="mobile-container mobile-safe-all">
  <!-- Respects device safe areas -->
</div>
```

### Flexbox Utilities

```html
<!-- Column layout -->
<div class="mobile-flex-col">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Centered content -->
<div class="mobile-flex-center">
  <div>Centered content</div>
</div>

<!-- Space between items -->
<div class="mobile-flex-between">
  <div>Left</div>
  <div>Right</div>
</div>
```

### Grid System

```html
<!-- Single column grid (mobile default) -->
<div class="mobile-grid mobile-grid-cols-1 mobile-gap-md">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Two column grid (from 768px) -->
<div class="mobile-grid mobile-grid-cols-2 mobile-gap-md">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
```

### Spacing Utilities

```html
<!-- Padding -->
<div class="mobile-p-xs">Extra small padding (8px)</div>
<div class="mobile-p-sm">Small padding (12px)</div>
<div class="mobile-p-md">Medium padding (16px)</div>
<div class="mobile-p-lg">Large padding (24px)</div>
<div class="mobile-p-xl">Extra large padding (32px)</div>

<!-- Margins -->
<div class="mobile-mt-sm">Small top margin (12px)</div>
<div class="mobile-mb-md">Medium bottom margin (16px)</div>
<div class="mobile-mx-lg">Large horizontal margin (24px)</div>
```

## Component Styles

### Button Components

```html
<!-- Primary button -->
<button class="mobile-button">
  Primary Action
</button>

<!-- Secondary button -->
<button class="mobile-button mobile-button-secondary">
  Secondary Action
</button>

<!-- Outline button -->
<button class="mobile-button mobile-button-outline">
  Outline Action
</button>

<!-- Icon button -->
<button class="mobile-button-icon">
  <span class="material-symbols-outlined">add</span>
</button>
```

### Form Components

```html
<!-- Input field -->
<div class="mobile-form-group">
  <label class="mobile-form-label">Email Address</label>
  <input 
    type="email" 
    class="mobile-input" 
    placeholder="Enter your email"
  >
  <span class="mobile-form-error">Error message</span>
</div>
```

### Card Components

```html
<!-- Basic card -->
<div class="mobile-card">
  <div class="mobile-card-header">
    <h3 class="mobile-card-title">Card Title</h3>
  </div>
  <div class="mobile-card-content">
    Card content goes here
  </div>
</div>
```

## Navigation Patterns

### Bottom Navigation

```html
<nav class="mobile-nav-bottom">
  <div class="mobile-nav-bottom-list">
    <a href="#" class="mobile-nav-item active">
      <span class="material-symbols-outlined mobile-nav-icon">home</span>
      <span class="mobile-nav-label">Home</span>
    </a>
    <a href="#" class="mobile-nav-item">
      <span class="material-symbols-outlined mobile-nav-icon">search</span>
      <span class="mobile-nav-label">Search</span>
    </a>
    <a href="#" class="mobile-nav-item">
      <span class="material-symbols-outlined mobile-nav-icon">settings</span>
      <span class="mobile-nav-label">Settings</span>
    </a>
  </div>
</nav>
```

### Header Navigation

```html
<header class="mobile-nav-header">
  <div class="mobile-nav-header-content">
    <button class="mobile-button-icon">
      <span class="material-symbols-outlined">menu</span>
    </button>
    <h1 class="mobile-nav-title">App Title</h1>
    <button class="mobile-button-icon">
      <span class="material-symbols-outlined">account_circle</span>
    </button>
  </div>
</header>
```

## Audio Player Styles

### Complete Mobile Player

```html
<div class="mobile-player">
  <!-- Main controls -->
  <div class="mobile-player-controls">
    <div class="mobile-player-main-controls">
      <button class="mobile-player-button">
        <span class="material-symbols-outlined">skip_previous</span>
      </button>
      <button class="mobile-player-button-primary">
        <span class="material-symbols-outlined">play_arrow</span>
      </button>
      <button class="mobile-player-button">
        <span class="material-symbols-outlined">skip_next</span>
      </button>
    </div>
    
    <!-- Seek bar -->
    <div class="mobile-player-seek">
      <div class="mobile-player-seek-bar">
        <div class="mobile-player-seek-progress" style="width: 45%"></div>
        <div class="mobile-player-seek-handle" style="left: 45%"></div>
      </div>
      <div class="mobile-player-time">
        <span class="mobile-player-time-text">1:23</span>
        <span class="mobile-player-time-text">3:45</span>
      </div>
    </div>
    
    <!-- Volume control -->
    <div class="mobile-player-volume">
      <button class="mobile-player-button">
        <span class="material-symbols-outlined">volume_down</span>
      </button>
      <div class="mobile-player-volume-slider">
        <div class="mobile-player-volume-progress" style="width: 70%"></div>
      </div>
    </div>
  </div>
  
  <!-- Subtitles -->
  <div class="mobile-player-subtitles">
    <div class="mobile-subtitle-line">First subtitle line</div>
    <div class="mobile-subtitle-line active">Current subtitle line</div>
    <div class="mobile-subtitle-line">Next subtitle line</div>
  </div>
</div>
```

## File Upload Styles

### Upload Area

```html
<div class="mobile-upload-area">
  <span class="material-symbols-outlined mobile-upload-icon">cloud_upload</span>
  <div class="mobile-upload-text">Tap to upload files</div>
  <div class="mobile-upload-hint">or drag and drop</div>
</div>
```

### File List

```html
<div class="mobile-file-list">
  <div class="mobile-file-item">
    <div class="mobile-file-icon">
      <span class="material-symbols-outlined">audio_file</span>
    </div>
    <div class="mobile-file-info">
      <div class="mobile-file-name">audio-file.mp3</div>
      <div class="mobile-file-meta">2.3 MB • Uploaded 2 min ago</div>
    </div>
    <div class="mobile-file-actions">
      <button class="mobile-button-icon">
        <span class="material-symbols-outlined">play_arrow</span>
      </button>
      <button class="mobile-button-icon">
        <span class="material-symbols-outlined">delete</span>
      </button>
    </div>
  </div>
</div>
```

## Performance Optimizations

### Hardware Acceleration

```html
<!-- Hardware-accelerated animations -->
<div class="mobile-hardware-accel">
  <!-- Smooth animations with GPU acceleration -->
</div>

<!-- Optimized for low-end devices -->
<div class="mobile-low-performance">
  <!-- Reduced visual effects for better performance -->
</div>
```

### Reduced Motion Support

The system automatically respects user's motion preferences:

```css
/* Automatically applied when prefers-reduced-motion: reduce */
@media (prefers-reduced-motion: reduce) {
  /* Animations and transitions are disabled */
}
```

## Accessibility Features

### Screen Reader Support

```html
<!-- Screen reader only content -->
<span class="mobile-sr-only">Hidden description for screen readers</span>

<!-- Accessible button with aria-label -->
<button class="mobile-button" aria-label="Play audio">
  <span class="material-symbols-outlined">play_arrow</span>
</button>
```

### High Contrast Mode

```html
<!-- Automatically enhanced in high contrast mode -->
<button class="mobile-button">
  <!-- Border width and contrast automatically adjusted -->
</button>
```

### Focus Management

```html
<!-- Proper focus indicators for touch devices -->
<button class="mobile-button">
  <!-- Focus styles automatically applied for keyboard navigation -->
</button>
```

## Theme Integration

The mobile system seamlessly integrates with existing themes:

### Dark Theme Support

```html
<!-- Automatically adapts to dark theme -->
<div class="mobile-card">
  <!-- Colors adjust based on current theme -->
</div>
```

### Light Theme Support

```html
<!-- Works with light theme -->
<button class="mobile-button mobile-button-outline">
  <!-- Proper contrast in light mode -->
</button>
```

### High Contrast Theme

```html
<!-- Enhanced for accessibility -->
<div class="mobile-input">
  <!-- Increased borders and contrast in high contrast mode -->
</div>
```

## Usage Examples

### Complete Mobile Page Layout

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="styles/mobile.css">
</head>
<body class="mobile-min-h-screen">
  <!-- Header -->
  <header class="mobile-nav-header">
    <div class="mobile-nav-header-content">
      <button class="mobile-button-icon">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <h1 class="mobile-nav-title">umuo.app</h1>
      <button class="mobile-button-icon">
        <span class="material-symbols-outlined">account_circle</span>
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main class="mobile-container mobile-safe-top mobile-safe-bottom">
    <div class="mobile-flex-col mobile-gap-lg">
      <!-- Hero Section -->
      <section class="mobile-card">
        <h2 class="mobile-heading-lg">Welcome to Mobile Experience</h2>
        <p class="mobile-text-fluid">
          This is a fully responsive mobile-first design that adapts to all screen sizes.
        </p>
        <button class="mobile-button mobile-mt-md">
          Get Started
        </button>
      </section>

      <!-- Feature Grid -->
      <section class="mobile-grid mobile-grid-cols-1 mobile-gap-md">
        <div class="mobile-card">
          <h3 class="mobile-heading-md">Feature 1</h3>
          <p class="mobile-text-base">Touch-optimized interface</p>
        </div>
        <div class="mobile-card">
          <h3 class="mobile-heading-md">Feature 2</h3>
          <p class="mobile-text-base">Responsive typography</p>
        </div>
        <div class="mobile-card">
          <h3 class="mobile-heading-md">Feature 3</h3>
          <p class="mobile-text-base">Accessible design</p>
        </div>
      </section>
    </div>
  </main>

  <!-- Bottom Navigation -->
  <nav class="mobile-nav-bottom">
    <div class="mobile-nav-bottom-list">
      <a href="#" class="mobile-nav-item active">
        <span class="material-symbols-outlined mobile-nav-icon">home</span>
        <span class="mobile-nav-label">Home</span>
      </a>
      <a href="#" class="mobile-nav-item">
        <span class="material-symbols-outlined mobile-nav-icon">search</span>
        <span class="mobile-nav-label">Search</span>
      </a>
      <a href="#" class="mobile-nav-item">
        <span class="material-symbols-outlined mobile-nav-icon">settings</span>
        <span class="mobile-nav-label">Settings</span>
      </a>
    </div>
  </nav>
</body>
</html>
```

### Mobile Form Example

```html
<form class="mobile-container mobile-p-lg">
  <div class="mobile-form-group">
    <label class="mobile-form-label">Full Name</label>
    <input type="text" class="mobile-input" placeholder="Enter your name">
  </div>
  
  <div class="mobile-form-group">
    <label class="mobile-form-label">Email Address</label>
    <input type="email" class="mobile-input" placeholder="your@email.com">
  </div>
  
  <div class="mobile-form-group">
    <label class="mobile-form-label">Message</label>
    <textarea class="mobile-input" rows="4" placeholder="Your message"></textarea>
  </div>
  
  <button type="submit" class="mobile-button mobile-button-primary">
    Send Message
  </button>
</form>
```

## Best Practices

### 1. Mobile-First Development

Always start with mobile styles and enhance for larger screens:

```css
/* Good: Mobile-first approach */
.component {
  /* Mobile styles */
  padding: 1rem;
}

@media (min-width: 768px) {
  .component {
    /* Tablet and desktop enhancements */
    padding: 2rem;
  }
}
```

### 2. Touch Target Sizes

Ensure all interactive elements meet minimum touch target requirements:

```html
<!-- Good: Proper touch targets -->
<button class="mobile-touch-target">
  Minimum 44px × 44px touch area
</button>

<!-- Bad: Touch targets too small -->
<button style="height: 20px; width: 20px;">
  Too small for reliable touch interaction
</button>
```

### 3. Safe Area Management

Always consider device safe areas on modern mobile devices:

```html
<!-- Good: Safe area aware -->
<div class="mobile-safe-all">
  <!-- Content respects notch and gesture areas -->
</div>

<!-- Good: Targeted safe area -->
<header class="mobile-safe-top">
  <!-- Only top safe area needed -->
</header>
```

### 4. Responsive Typography

Use fluid typography for optimal reading experience:

```html
<!-- Good: Scalable typography -->
<h1 class="mobile-heading-lg">Responsive heading</h1>
<p class="mobile-text-fluid">Body text that scales with viewport</p>

<!-- Avoid: Fixed font sizes that don't scale -->
<h1 style="font-size: 24px;">Fixed size heading</h1>
```

### 5. Performance Considerations

Optimize animations and transitions for mobile performance:

```html
<!-- Good: Hardware accelerated -->
<div class="mobile-hardware-accel">
  <!-- Animations use GPU acceleration -->
</div>

<!-- Good: Respects user preferences -->
<div>
  <!-- Automatically reduced motion for users who prefer it -->
</div>
```

### 6. Accessibility

Always ensure mobile interfaces are accessible:

```html
<!-- Good: Proper labeling -->
<button class="mobile-button" aria-label="Play audio">
  <span class="material-symbols-outlined">play_arrow</span>
</button>

<!-- Good: Screen reader support -->
<span class="mobile-sr-only">Additional context for screen readers</span>
```

### 7. Testing

Test across different mobile devices and screen sizes:

- **Small phones**: 320px (iPhone SE)
- **Standard phones**: 375px (iPhone 12/13)
- **Large phones**: 414px (iPhone Pro)
- **Tablets**: 768px (iPad)

## Troubleshooting

### Common Issues

1. **Touch targets too small**: Use `mobile-touch-target` classes
2. **Text not scaling**: Use `mobile-text-fluid` or responsive text classes
3. **Layout breaking**: Use `mobile-container` for proper containment
4. **Notch overlap**: Add `mobile-safe-top` or `mobile-safe-all`
5. **Poor performance**: Use `mobile-hardware-accel` for animations

### Debug Mode

Add `mobile-debug` class to body to see current breakpoint:

```html
<body class="mobile-debug">
  <!-- Shows breakpoint indicator in top-left corner -->
</body>
```

### Grid Overlay

Add `mobile-debug-grid` to container to see layout grid:

```html
<div class="mobile-debug-grid">
  <!-- Shows 20px grid overlay for alignment -->
</div>
```

This comprehensive mobile CSS system provides everything needed for excellent mobile user experiences while maintaining performance, accessibility, and design consistency.