# PlayButton Component

A specialized play/pause button optimized for the EnhancedAudioPlayer with ultra-fast response time (<200ms) and comprehensive mobile touch support.

## Features

### 🚀 Performance
- **<200ms Response Time**: Guaranteed ultra-fast response for all play/pause operations
- **GPU-Accelerated Animations**: Smooth transitions using hardware acceleration
- **Performance Monitoring**: Built-in metrics tracking and optimization
- **Memory Efficient**: Optimized for frequent interactions without memory leaks

### 📱 Mobile Optimization
- **Touch-Optimized**: 44px minimum touch target (WCAG 2.1 compliant)
- **No 300ms Delay**: Eliminates mobile touch delays for immediate response
- **Haptic Feedback**: Integrated tactile response on supported devices
- **Ripple Effects**: Visual feedback for touch interactions

### 🎨 Visual Feedback
- **Smooth Transitions**: GPU-accelerated animations between states
- **Multiple Variants**: Minimal, standard, enhanced, and icon-only styles
- **State Indicators**: Clear visual feedback for playing, paused, loading, and error states
- **Theme Aware**: Automatic adaptation to dark/light themes

### ♿ Accessibility
- **WCAG 2.1 Compliant**: Full keyboard navigation and screen reader support
- **Keyboard Shortcuts**: Configurable keyboard controls (default: spacebar)
- **Screen Reader Support**: Comprehensive ARIA labels and announcements
- **Reduced Motion**: Respects user's motion preferences

## Installation

```bash
# The component is part of the player features module
import { PlayButton } from '@/components/features/player/play-button';
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import { PlayButton } from '@/components/features/player/play-button';

const BasicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <PlayButton
      isPlaying={isPlaying}
      onToggle={setIsPlaying}
      ariaLabel="Toggle audio playback"
    />
  );
};
```

## Advanced Usage

### With Loading and Error States

```tsx
import React, { useState } from 'react';
import { PlayButton } from '@/components/features/player/play-button';

const AdvancedPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleToggle = async (newState: boolean) => {
    setHasError(false);
    
    if (newState) {
      setIsLoading(true);
      try {
        await loadAudio(); // Your audio loading logic
        setIsPlaying(true);
      } catch (error) {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <PlayButton
      isPlaying={isPlaying}
      isLoading={isLoading}
      hasError={hasError}
      onToggle={handleToggle}
      size="large"
      variant="enhanced"
    />
  );
};
```

### With Mobile Optimizations

```tsx
import React, { useState } from 'react';
import { PlayButton } from '@/components/features/player/play-button';

const MobilePlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <PlayButton
      isPlaying={isPlaying}
      onToggle={setIsPlaying}
      size="extra-large"
      touchOptimized={true}
      enableHaptics={true}
      enableVisualFeedback={true}
      analyticsData={{
        source: 'mobile-player',
        userId: 'user123',
        sessionId: 'session456'
      }}
    />
  );
};
```

## Props Reference

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isPlaying` | `boolean` | `false` | Current playback state |
| `isLoading` | `boolean` | `false` | Loading state indicator |
| `hasError` | `boolean` | `false` | Error state indicator |
| `disabled` | `boolean` | `false` | Disabled state |
| `onToggle` | `(isPlaying: boolean) => Promise<void> \| void` | - | Toggle callback |
| `onPlay` | `() => Promise<void> \| void` | - | Play callback (alternative to onToggle) |
| `onPause` | `() => Promise<void> \| void` | - | Pause callback (alternative to onToggle) |

### Visual Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `PlayButtonSize` | `'normal'` | Button size: `'compact' \| 'normal' \| 'large' \| 'extra-large'` |
| `variant` | `PlayButtonVariant` | `'standard'` | Visual style: `'minimal' \| 'standard' \| 'enhanced' \| 'icon-only'` |
| `className` | `string` | `''` | Additional CSS classes |

### Interaction Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `touchOptimized` | `boolean` | `true` | Enable touch optimizations |
| `enableHaptics` | `boolean` | `true` | Enable haptic feedback on mobile |
| `enableVisualFeedback` | `boolean` | `true` | Enable visual feedback animations |
| `keyboardShortcut` | `string` | `' '` | Keyboard shortcut key |

### Accessibility Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Accessible label for the button |
| `ariaLabel` | `string` | Auto-generated | Custom ARIA label |
| `analyticsData` | `Record<string, any>` | `{}` | Analytics data attributes |

## Imperative API

Use `useRef` to access imperative methods:

```tsx
import React, { useRef } from 'react';
import { PlayButton, type PlayButtonRef } from '@/components/features/player/play-button';

const PlayerWithImperativeControl = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const buttonRef = useRef<PlayButtonRef>(null);

  const handlePlay = async () => {
    await buttonRef.current?.play();
  };

  const handlePause = async () => {
    await buttonRef.current?.pause();
  };

  const handleToggle = () => {
    buttonRef.current?.toggle();
  };

  const measurePerformance = () => {
    const responseTime = buttonRef.current?.measureResponseTime();
    console.log(`Response time: ${responseTime}ms`);
  };

  return (
    <div>
      <PlayButton
        ref={buttonRef}
        isPlaying={isPlaying}
        onToggle={setIsPlaying}
      />
      <div className="flex gap-2 mt-4">
        <button onClick={handlePlay}>Play</button>
        <button onClick={handlePause}>Pause</button>
        <button onClick={handleToggle}>Toggle</button>
        <button onClick={measurePerformance}>Measure</button>
      </div>
    </div>
  );
};
```

### Ref Methods

| Method | Description |
|--------|-------------|
| `toggle()` | Toggle play/pause state |
| `play()` | Force play state |
| `pause()` | Force pause state |
| `getState()` | Get current button state |
| `measureResponseTime()` | Measure last operation response time |

## Size Variants

| Size | Button Size | Touch Target | Use Case |
|------|-------------|--------------|----------|
| `compact` | 32px | 44px | Minimal UI, inline controls |
| `normal` | 44px | 48px | Standard player controls |
| `large` | 56px | 60px | Main player controls |
| `extra-large` | 72px | 80px | Accessibility-focused, mobile-first |

## Style Variants

| Variant | Description | Best For |
|---------|-------------|----------|
| `minimal` | No background or border | Minimalist designs, overlay controls |
| `standard` | Subtle background with border | Default player interface |
| `enhanced` | Enhanced background with blur | Modern glassmorphism designs |
| `icon-only` | No background, icon only | Toolbars, compact interfaces |

## State Variations

The button automatically handles these visual states:

- **Playing**: Green accent with pause icon
- **Paused**: Blue accent with play icon
- **Loading**: Yellow accent with spinner
- **Error**: Red accent with error icon
- **Disabled**: Grayed out appearance

## Performance Monitoring

The component includes built-in performance monitoring:

```tsx
// Performance metrics are automatically recorded
// Access them through the performance monitor

import { performanceMonitor } from '@/lib/performance/performance-monitor';

// Get average response time
const metrics = performanceMonitor.getMetrics('play-button-response-time');
console.log(`Average response time: ${metrics.average}ms`);

// Check if performance targets are met
if (metrics.average > 200) {
  console.warn('PlayButton response time exceeds 200ms target');
}
```

## Mobile Touch Optimizations

### Touch Target Size
- **Minimum**: 44px (WCAG 2.1 requirement)
- **Recommended**: 48px for better usability
- **Extra-Large**: 80px for accessibility-focused apps

### Touch Feedback Types

```tsx
// Different haptic feedback patterns
const hapticPatterns = {
  light: 'light',      // Subtle feedback for touches
  medium: 'medium',    // Standard feedback for play/pause
  heavy: 'heavy',      // Strong feedback for important actions
  success: 'success',  // Success confirmation
  error: 'error',      // Error indication
  selection: 'selection', // Selection confirmation
};
```

### Ripple Effects

Touch interactions include customizable ripple effects:

```tsx
// Custom ripple configuration
const customRipple = {
  size: 120,           // Ripple size in pixels
  color: 'rgba(59, 130, 246, 0.3)',  // Ripple color
  opacity: 0.6,        // Ripple opacity
  duration: 600,       // Animation duration
  expand: true,        // Whether ripple expands
};
```

## Accessibility Features

### Keyboard Navigation
- **Space/Enter**: Toggle play/pause
- **Tab**: Navigate to/from button
- **Escape**: Cancel current operation (if applicable)

### Screen Reader Support
- Automatic ARIA labels based on state
- Live regions for state changes
- High contrast mode support

### Reduced Motion
Respects `prefers-reduced-motion: reduce` media query:
- Disables non-essential animations
- Maintains functional transitions
- Preserves performance characteristics

## Theme Integration

The component automatically adapts to your theme system:

```css
/* Dark theme support */
.play-button {
  /* Automatic dark mode styles applied */
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .play-button {
    border-width: 3px;
    /* Enhanced contrast styles */
  }
}
```

## CSS Custom Properties

Override these CSS variables for custom theming:

```css
:root {
  --play-button-primary: #3b82f6;
  --play-button-primary-hover: #2563eb;
  --play-button-secondary: #6b7280;
  --play-button-success: #10b981;
  --play-button-warning: #f59e0b;
  --play-button-error: #ef4444;
  --play-button-border-radius: 50%;
  --play-button-transition-duration: 150ms;
}
```

## Performance Guidelines

### To achieve <200ms response time:

1. **Async Operations**: Ensure all callbacks are properly async
2. **Avoid Blocking**: Don't perform heavy computations in callbacks
3. **Use requestAnimationFrame**: For visual updates
4. **Optimize Event Handlers**: Debounce/throttle where appropriate
5. **Monitor Performance**: Use built-in metrics tracking

### Example Optimal Implementation:

```tsx
const handleToggle = useCallback(async (isPlaying: boolean) => {
  // Start performance measurement
  const startTime = performance.now();
  
  // Minimal synchronous work
  updateUIState(isPlaying);
  
  // Async operations
  await updateAudioState(isPlaying);
  
  // Performance tracking
  const responseTime = performance.now() - startTime;
  performanceMonitor.recordMetric('play-button-response-time', responseTime);
}, [updateUIState, updateAudioState]);
```

## Testing

### Performance Testing

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import { PlayButton } from '@/components/features/player/play-button';

describe('PlayButton Performance', () => {
  it('should respond within 200ms', async () => {
    const onToggle = jest.fn();
    const { getByRole } = render(
      <PlayButton isPlaying={false} onToggle={onToggle} />
    );
    
    const button = getByRole('button');
    const startTime = performance.now();
    
    fireEvent.click(button);
    
    await waitFor(() => expect(onToggle).toHaveBeenCalled());
    
    const responseTime = performance.now() - startTime;
    expect(responseTime).toBeLessThan(200);
  });
});
```

### Accessibility Testing

```tsx
import { render, fireEvent } from '@testing-library/react';
import { PlayButton } from '@/components/features/player/play-button';

describe('PlayButton Accessibility', () => {
  it('should support keyboard navigation', () => {
    const onToggle = jest.fn();
    const { getByRole } = render(
      <PlayButton isPlaying={false} onToggle={onToggle} />
    );
    
    const button = getByRole('button');
    
    // Test spacebar
    fireEvent.keyDown(button, { key: ' ' });
    expect(onToggle).toHaveBeenCalledWith(true);
    
    // Test enter key
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledWith(false);
  });
  
  it('should have proper ARIA labels', () => {
    const { getByRole } = render(
      <PlayButton isPlaying={false} onToggle={() => {}} />
    );
    
    const button = getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Play audio');
  });
});
```

## Troubleshooting

### Common Issues

#### Response Time Exceeds 200ms
- Check for blocking operations in callbacks
- Ensure proper async/await usage
- Monitor performance metrics
- Consider using React.useCallback for handlers

#### Touch Not Working on Mobile
- Verify `touchOptimized={true}` is set
- Check CSS `touch-action` property
- Ensure no `pointer-events: none` on parent elements
- Test on actual mobile devices

#### Haptic Feedback Not Working
- Verify device supports haptic feedback
- Check `enableHaptics={true}` is set
- Ensure user interaction is initiated by user
- Test on supported mobile browsers

#### Animation Performance Issues
- Check GPU acceleration is enabled
- Verify `will-change` CSS property
- Monitor memory usage
- Consider reducing animation complexity

### Debug Mode

Enable debug mode for detailed performance logging:

```tsx
const DebugPlayButton = () => (
  <PlayButton
    isPlaying={isPlaying}
    onToggle={handleToggle}
    // Enable debug logging
    analyticsData={{
      debug: true,
      logPerformance: true
    }}
  />
);
```

## Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Full feature support |
| Firefox | 88+ | Full feature support |
| Safari | 14+ | Full feature support |
| Edge | 90+ | Full feature support |
| iOS Safari | 14+ | Touch optimized |
| Chrome Mobile | 90+ | Full feature support |

## Contributing

When contributing to the PlayButton component:

1. **Performance First**: Always ensure <200ms response time
2. **Mobile First**: Test on mobile devices
3. **Accessibility**: Include screen reader testing
4. **Browser Testing**: Test across supported browsers
5. **Documentation**: Update docs for new features

## License

This component is part of the umuo.app project and follows the project's license terms.