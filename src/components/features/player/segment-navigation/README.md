# Segment Navigation System

A high-performance audio segment navigation system designed for language learning applications with sub-300ms response time, mobile optimization, and comprehensive accessibility features.

## Features

### 🚀 Performance
- **Sub-300ms response time** for all navigation actions
- Intelligent caching with LRU eviction
- Virtual rendering for large segment collections
- Preloading of adjacent segments
- Optimized binary search for segment lookup
- Memory-efficient WeakMap for segment metadata

### 📱 Mobile Optimization
- Touch gesture support (tap, double-tap, long-press, swipe, pinch)
- Haptic feedback integration
- Responsive design for all screen sizes
- Touch-optimized controls and interactions
- Mobile-specific performance optimizations

### ♿ Accessibility
- Full keyboard navigation support
- Screen reader compatibility (ARIA labels and roles)
- WCAG 2.1 AA compliant contrast ratios
- Focus management and visual indicators
- High contrast theme support

### 🎯 Core Navigation Features
- **Segment Navigation**: Jump between transcription segments instantly
- **Word-level Navigation**: Navigate to individual words within segments
- **Auto-advance**: Automatically move to next segment when current ends
- **Segment Looping**: Repeat current segment for practice
- **Bookmarks**: Mark favorite segments for quick access
- **Navigation History**: Go back/forward through navigation history
- **Smart Seeking**: Find exact segments by timestamp

### 🎨 User Experience
- Visual feedback for all interactions
- Smooth animations and transitions
- Progress indicators for active segments
- Customizable display options (timestamps, durations, etc.)
- Multiple zoom levels for text readability

## Quick Start

```tsx
import { SegmentNavigation } from '@/components/features/player/segment-navigation';
import { useAudioPlayer } from '@/hooks/ui/useAudioPlayer';

function MyPlayer({ file, segments, audioUrl }) {
  const { audioPlayerState, handleSeek, onPlay, onPause } = useAudioPlayer();

  return (
    <SegmentNavigation
      segments={segments}
      currentTime={audioPlayerState.currentTime}
      isPlaying={audioPlayerState.isPlaying}
      onSeek={handleSeek}
      onPlayPause={(isPlaying) => isPlaying ? onPlay() : onPause()}
      showBookmarks={true}
      autoAdvance={true}
      mobileMode={false}
    />
  );
}
```

## API Reference

### SegmentNavigation Component

```tsx
<SegmentNavigation
  segments={segments}
  currentTime={currentTime}
  isPlaying={isPlaying}
  onSeek={handleSeek}
  onPlayPause={handlePlayPause}
  showBookmarks={true}
  showHistory={true}
  showWordNavigation={true}
  autoAdvance={true}
  loopSegment={false}
  mobileMode={false}
  maxVisibleSegments={50}
  showTimestamps={true}
  showDurations={false}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `segments` | `Segment[]` | Required | Array of transcription segments |
| `currentTime` | `number` | Required | Current playback time in seconds |
| `isPlaying` | `boolean` | Required | Whether audio is currently playing |
| `onSeek` | `(time: number) => void` | Required | Callback when seeking to a time |
| `onPlayPause` | `(isPlaying: boolean) => void` | Required | Callback for play/pause toggle |
| `showBookmarks` | `boolean` | `true` | Show bookmark controls |
| `showHistory` | `boolean` | `true` | Show navigation history |
| `showWordNavigation` | `boolean` | `true` | Show word-level navigation |
| `autoAdvance` | `boolean` | `true` | Auto-advance to next segment |
| `loopSegment` | `boolean` | `false` | Loop current segment |
| `mobileMode` | `boolean` | Auto-detect | Force mobile optimization |
| `maxVisibleSegments` | `number` | `50` | Maximum segments to display |

### useSegmentNavigation Hook

```tsx
const navigation = useSegmentNavigation(segments, currentTime, {
  autoAdvance: true,
  loopSegment: false,
  preloadAdjacent: true,
  enableHaptics: true,
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoAdvance` | `boolean` | `true` | Auto-advance to next segment |
| `loopSegment` | `boolean` | `false` | Loop current segment |
| `preloadAdjacent` | `boolean` | `true` | Preload adjacent segments |
| `preloadCount` | `number` | `2` | Number of segments to preload |
| `enableHaptics` | `boolean` | `true` | Enable haptic feedback |
| `transitionDuration` | `number` | `200` | Animation duration (ms) |

#### Return Values

```tsx
interface UseSegmentNavigationReturn {
  activeSegmentIndex: number;
  activeSegment: Segment | null;
  nextSegment: Segment | null;
  previousSegment: Segment | null;
  isNavigating: boolean;
  bookmarkedSegments: Set<number>;
  navigateToSegment: (index: number) => void;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
  jumpToTime: (time: number) => void;
  toggleBookmark: () => void;
  goBack: () => void;
  goForward: () => void;
  getWordNavigation: () => WordNavigation;
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `←` | Navigate to previous segment |
| `→` | Navigate to next segment |
| `Space` | Toggle play/pause |
| `B` | Toggle bookmark for current segment |
| `R` | Reset navigation |
| `[` | Go back in history |
| `]` | Go forward in history |
| `+/-` | Zoom in/out |

## Touch Gestures

| Gesture | Action |
|---------|--------|
| **Tap** | Select segment |
| **Double Tap** | Toggle play/pause |
| **Long Press** | Toggle bookmark |
| **Swipe Left/Right** | Navigate segments |
| **Swipe Up/Down** | Show/hide controls |
| **Pinch** | Adjust zoom level |

## Integration Examples

### Basic Integration

```tsx
import { SegmentNavigation } from '@/components/features/player/segment-navigation';

function Player({ segments, audioUrl }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <SegmentNavigation
      segments={segments}
      currentTime={currentTime}
      isPlaying={isPlaying}
      onSeek={setCurrentTime}
      onPlayPause={setIsPlaying}
    />
  );
}
```

### Advanced Integration with Custom Styling

```tsx
import { SegmentNavigation, useSegmentNavigation } from '@/components/features/player/segment-navigation';

function CustomPlayer({ segments }) {
  const navigation = useSegmentNavigation(segments, currentTime, {
    autoAdvance: true,
    enableHaptics: true,
  });

  const renderCustomSegment = (segment, index, isActive) => (
    <div className={`custom-segment ${isActive ? 'active' : ''}`}>
      <h4>{segment.text}</h4>
      {segment.normalizedText && (
        <p className="normalized">{segment.normalizedText}</p>
      )}
    </div>
  );

  return (
    <SegmentNavigation
      segments={segments}
      currentTime={currentTime}
      isPlaying={isPlaying}
      onSeek={handleSeek}
      onPlayPause={handlePlayPause}
      renderSegment={renderCustomSegment}
      className="custom-navigation"
    />
  );
}
```

### Mobile-Optimized Integration

```tsx
import { SegmentNavigation, MobileSegmentWrapper } from '@/components/features/player/segment-navigation';

function MobilePlayer({ segments }) {
  const handleGesture = useCallback((gesture) => {
    switch (gesture.type) {
      case 'swipe-left':
        navigation.navigateToNext();
        break;
      case 'swipe-right':
        navigation.navigateToPrevious();
        break;
      case 'double-tap':
        togglePlayPause();
        break;
      case 'long-press':
        navigation.toggleBookmark();
        break;
    }
  }, []);

  return (
    <MobileSegmentWrapper onGesture={handleGesture}>
      <SegmentNavigation
        segments={segments}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onSeek={handleSeek}
        onPlayPause={handlePlayPause}
        mobileMode={true}
        compactMode={true}
      />
    </MobileSegmentWrapper>
  );
}
```

## Performance Optimization

### Virtual Rendering

For large segment collections (>100 segments), enable virtual rendering:

```tsx
<SegmentNavigation
  segments={largeSegmentArray}
  // ... other props
  virtualization={{
    enabled: true,
    itemHeight: 80,
    overscan: 5,
  }}
/>
```

### Caching

The system automatically caches segments and navigation state. For additional control:

```tsx
import { performanceMonitor, SegmentCacheManager } from '@/lib/performance/segment-navigation-performance';

// Monitor performance
const metrics = performanceMonitor.getMetrics();
console.log('Average navigation time:', metrics.averageNavigationTime);

// Custom cache manager
const cacheManager = new SegmentCacheManager({
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  cacheExpiration: 10 * 60 * 1000, // 10 minutes
});
```

## Accessibility Features

### ARIA Labels and Roles

All components include proper ARIA labels and roles:

```tsx
<div
  role="region"
  aria-label="Audio Segment Navigation"
  aria-pressed={isActive}
>
  {/* Segment content */}
</div>
```

### Focus Management

The system provides comprehensive focus management:

- Logical tab order
- Focus indicators
- Skip links
- Focus trap for modals

### Screen Reader Support

Screen reader announcements for:

- Segment changes
- Navigation actions
- Bookmark status
- Loading states

## Testing

### Performance Testing

```tsx
import { performanceMonitor } from '@/lib/performance/segment-navigation-performance';

// Measure navigation performance
const navigationTime = await performanceMonitor.measure('navigation', () => {
  navigation.navigateToSegment(index);
});

expect(navigationTime).toBeLessThan(300); // Sub-300ms requirement
```

### Unit Testing

```tsx
import { renderHook } from '@testing-library/react';
import { useSegmentNavigation } from '@/components/features/player/segment-navigation';

test('should navigate to segment within 300ms', async () => {
  const { result } = renderHook(() => useSegmentNavigation(segments, 0));
  
  const startTime = performance.now();
  result.current.navigateToSegment(5);
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(300);
  expect(result.current.activeSegmentIndex).toBe(5);
});
```

## Troubleshooting

### Common Issues

1. **Slow navigation performance**
   - Check segment count and enable virtualization for large lists
   - Verify caching is working properly
   - Monitor memory usage

2. **Mobile touch issues**
   - Ensure `touch-action: manipulation` is set
   - Check for conflicting touch event handlers
   - Verify haptic feedback is supported

3. **Accessibility problems**
   - Test with screen readers
   - Verify keyboard navigation works
   - Check color contrast ratios

### Performance Monitoring

```tsx
// Enable performance monitoring
import { performanceMonitor } from '@/lib/performance/segment-navigation-performance';

performanceMonitor.setupObservers();

// Check performance targets
const targets = performanceMonitor.checkPerformanceTargets();
if (!targets.navigationResponseTime) {
  console.warn('Navigation response time exceeds 300ms target');
}
```

## License

This component is part of the umuo.app language learning platform.