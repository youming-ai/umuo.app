# ProgressBar Component Documentation

## Overview

The `ProgressBar` component is a high-performance, mobile-optimized progress bar with drag-to-seek functionality designed for the umuo.app audio player. It provides precise seeking capabilities with visual feedback and haptic integration.

## Key Features

### 🎯 Drag-to-Seek Functionality
- **Smooth dragging**: Responsive drag controls with immediate visual feedback
- **Precise seeking**: Frame-by-frame accuracy using `requestAnimationFrame`
- **Visual preview**: Real-time time preview while dragging
- **Haptic feedback**: Tactile feedback for mobile devices during interactions

### 📱 Mobile Touch Optimization
- **44px minimum targets**: WCAG 2.1 compliant touch areas
- **Touch event handling**: No 300ms delay with proper event prevention
- **Gesture recognition**: Integrated with existing touch optimization system
- **Battery awareness**: Reduced haptic feedback in low power mode

### ⚡ Performance Requirements
- **<200ms response time**: All interactions respond within 200ms
- **GPU acceleration**: Hardware-accelerated animations
- **Efficient rendering**: RequestAnimationFrame for smooth 60fps updates
- **Memory optimization**: Proper cleanup and weak references

### 🎨 Visual Feedback System
- **Progress preview**: Live preview while dragging
- **Buffer indicators**: Visual representation of loaded portions
- **Segment markers**: Chapter/segment position indicators
- **Time display**: Current and total time with dynamic updates

### ♿ Accessibility Features
- **Keyboard navigation**: Arrow key controls with step sizes
- **ARIA labels**: Complete screen reader support
- **Focus management**: Proper focus handling and tab navigation
- **High contrast**: Works with high contrast themes

## Usage Examples

### Basic Usage

```tsx
import { ProgressBar } from '@/components/features/player';

function MyAudioPlayer() {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    // Update audio element position
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <ProgressBar
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      onSeek={handleSeek}
    />
  );
}
```

### Advanced Usage with Segments and Buffering

```tsx
import { ProgressBar } from '@/components/features/player';
import type { Segment } from '@/types/db/database';

function AdvancedAudioPlayer() {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState<Array<{start: number; end: number}>>([]);
  const [segments, setSegments] = useState<Segment[]>([]);

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleSeekStart = () => {
    // Pause audio during seek for better experience
    audioRef.current?.pause();
  };

  const handleSeekEnd = () => {
    // Resume audio if it was playing
    if (isPlaying) {
      audioRef.current?.play();
    }
  };

  return (
    <ProgressBar
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      isLoading={false}
      bufferedRanges={bufferedRanges}
      segments={segments}
      onSeek={handleSeek}
      onSeekStart={handleSeekStart}
      onSeekEnd={handleSeekEnd}
      showTimeDisplay={true}
      showBufferIndicator={true}
      showSegmentMarkers={true}
      touchMode={true}
      maxResponseTime={200}
      variant="default"
    />
  );
}
```

### Mobile-Optimized Usage

```tsx
import { ProgressBar } from '@/components/features/player';
import { MobileDetector } from '@/types/mobile';

function MobileAudioPlayer() {
  const mobileDetector = MobileDetector.getInstance();
  const isMobile = mobileDetector.isMobile();

  return (
    <ProgressBar
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      onSeek={handleSeek}
      touchMode={isMobile}
      variant={isMobile ? "compact" : "default"}
      maxResponseTime={isMobile ? 150 : 200}
    />
  );
}
```

## Props Reference

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentTime` | `number` | `0` | Current playback time in seconds |
| `duration` | `number` | `0` | Total duration in seconds |
| `isPlaying` | `boolean` | `false` | Whether audio is currently playing |
| `onSeek` | `(time: number) => void` | **Required** | Callback when seeking occurs |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isLoading` | `boolean` | `false` | Whether audio is currently loading/buffering |
| `bufferedRanges` | `Array<{start: number; end: number}>` | `[]` | Buffered time ranges for visual indicator |
| `segments` | `Segment[]` | `[]` | Audio segments/chapters for markers |
| `onSeekStart` | `() => void` | `undefined` | Callback when seeking starts |
| `onSeekEnd` | `() => void` | `undefined` | Callback when seeking ends |
| `className` | `string` | `""` | Additional CSS classes |
| `showTimeDisplay` | `boolean` | `true` | Whether to show time display |
| `showBufferIndicator` | `boolean` | `true` | Whether to show buffer indicator |
| `showSegmentMarkers` | `boolean` | `true` | Whether to show segment markers |
| `touchMode` | `boolean` | `false` | Touch-friendly mode for mobile |
| `maxResponseTime` | `number` | `200` | Maximum response time requirement in ms |
| `variant` | `"default" \| "compact" \| "minimal"` | `"default"` | Visual variant of the progress bar |

## Integration with EnhancedAudioPlayer

The ProgressBar component is designed to integrate seamlessly with the existing `EnhancedAudioPlayer`:

```tsx
import { EnhancedAudioPlayer, ProgressBar } from '@/components/features/player';

function PlayerWithCustomProgress() {
  const [customProgress, setCustomProgress] = useState(false);

  return (
    <EnhancedAudioPlayer
      file={file}
      audioUrl={audioUrl}
      segments={segments}
      // ... other props
    >
      {customProgress && (
        <div className="w-full p-4">
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onSeek={handleSeek}
            touchMode={true}
          />
        </div>
      )}
    </EnhancedAudioPlayer>
  );
}
```

## Performance Monitoring

The component includes built-in performance monitoring to ensure the <200ms response time requirement:

```tsx
// Performance warnings are automatically logged to console
// You can also monitor performance programmatically:

const progressBarRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (progressBarRef.current) {
    // Component automatically measures and logs performance
    // Warnings appear when response time exceeds maxResponseTime
  }
}, []);
```

## Haptic Feedback Integration

The ProgressBar integrates with the haptic feedback system:

```tsx
import { useHapticFeedback } from '@/lib/mobile/haptic-feedback';

function AudioPlayerWithHaptics() {
  const haptic = useHapticFeedback();

  const handleSeek = (time: number) => {
    // Automatic haptic feedback is provided by the component
    // You can add custom haptic feedback if needed:
    if (isMobileDevice) {
      haptic.playerAction('seek');
    }
    
    setCurrentTime(time);
  };

  return (
    <ProgressBar
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      onSeek={handleSeek}
      touchMode={true}
    />
  );
}
```

## Keyboard Navigation

The component supports keyboard navigation:

- **Arrow Left**: Seek backward (1 second, 5 seconds with Shift)
- **Arrow Right**: Seek forward (1 second, 5 seconds with Shift)
- **Tab**: Navigate to seek handle
- **Enter/Space**: Activate seek handle

## Styling and Theming

The ProgressBar uses the existing design system:

```tsx
// Custom styling through className
<ProgressBar
  className="my-custom-progress"
  // ... other props
/>

// CSS custom properties for theming
.my-custom-progress {
  --progress-height: 8px;
  --progress-color: var(--primary);
  --progress-bg: var(--secondary);
  --handle-size: 16px;
}
```

## Error Handling

The component includes robust error handling:

```tsx
// Safe duration and time handling
<ProgressBar
  currentTime={Number.isFinite(currentTime) ? currentTime : 0}
  duration={Number.isFinite(duration) && duration > 0 ? duration : 0}
  isPlaying={isPlaying}
  onSeek={handleSeek}
/>
```

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressBar } from '@/components/features/player';

describe('ProgressBar', () => {
  it('should handle seek operations', () => {
    const onSeek = jest.fn();
    
    render(
      <ProgressBar
        currentTime={0}
        duration={100}
        isPlaying={false}
        onSeek={onSeek}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    fireEvent.click(progressBar, { clientX: 100 });

    expect(onSeek).toHaveBeenCalledWith(expect.any(Number));
  });

  it('should support keyboard navigation', () => {
    const onSeek = jest.fn();
    
    render(
      <ProgressBar
        currentTime={50}
        duration={100}
        isPlaying={false}
        onSeek={onSeek}
      />
    );

    const seekHandle = screen.getByRole('slider');
    seekHandle.focus();
    
    fireEvent.keyDown(seekHandle, { key: 'ArrowRight' });
    
    expect(onSeek).toHaveBeenCalledWith(51);
  });
});
```

## Browser Compatibility

- **Modern browsers**: Full support with all features
- **Safari**: Touch and haptic feedback supported on iOS
- **Chrome**: Full support including haptic feedback on Android
- **Firefox**: Full support (haptic feedback not available)
- **Edge**: Full support (haptic feedback on supported devices)

## Best Practices

1. **Always provide valid time values**: Use `Number.isFinite()` checks
2. **Enable touch mode on mobile**: Use `MobileDetector` for automatic detection
3. **Handle seek lifecycle**: Use `onSeekStart` and `onSeekEnd` for smooth playback
4. **Provide segments**: Enable chapter markers for better UX
5. **Monitor performance**: Check console for performance warnings
6. **Test on real devices**: Haptic feedback requires physical devices

## Troubleshooting

### Common Issues

**Seek is not responsive:**
- Check that `onSeek` callback is properly implemented
- Verify that audio element time is being updated
- Monitor console for performance warnings

**Haptic feedback not working:**
- Ensure device supports vibration API
- Check that haptic feedback is enabled in user settings
- Test on physical device (not emulator)

**Touch targets too small:**
- Enable `touchMode` prop for mobile devices
- Verify minimum 44px touch targets
- Check device pixel ratio scaling

**Performance issues:**
- Monitor response times in console
- Reduce animation complexity on low-end devices
- Check for memory leaks in seek handlers

### Debug Information

The component provides debug information through console:

```javascript
// Performance monitoring
console.log('ProgressBar seek response time: 45ms');

// Touch optimization
console.log('Touch optimizations applied: true');

// Haptic feedback
console.log('Haptic feedback triggered: selection');
```

## Future Enhancements

Planned improvements for the ProgressBar component:

1. **Waveform visualization**: Integrated audio waveform display
2. **Gesture seeking**: Swipe gestures for quick seeking
3. **Zoom functionality**: Zoom in on specific time ranges
4. **Bookmark system**: User-defined position bookmarks
5. **A-B repeat**: Loop between two points
6. **Speed scrubbing**: Variable speed seeking based on drag velocity