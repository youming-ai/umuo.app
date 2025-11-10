# Subtitle Synchronization System

A comprehensive subtitle synchronization system designed for the umuo.app language learning platform, providing precise timing with audio player controls, smooth scrolling, and mobile optimization.

## Features

### Core Functionality
- **Precise Word-Level Timing**: Synchronized highlighting with audio playback at the word level
- **Smooth Scrolling**: GPU-accelerated animations with <200ms response time
- **Multiple Subtitle Tracks**: Support for different language tracks and simultaneous display
- **Real-time Updates**: Instant synchronization with audio player state changes
- **Mobile Optimization**: Touch-friendly interactions and performance optimizations

### Performance Features
- **<200ms Response Time**: Optimized for instant subtitle updates
- **Memory Management**: Intelligent caching and garbage collection
- **GPU Acceleration**: Hardware-accelerated animations and transitions
- **Throttled Updates**: Performance monitoring and automatic optimization
- **Low-end Device Support**: Adaptive quality settings for older devices

### Accessibility & UX
- **WCAG 2.1 Compliance**: Full accessibility support with screen readers
- **High Contrast Mode**: Enhanced visibility for users with visual impairments
- **Keyboard Navigation**: Complete keyboard control support
- **Touch Gestures**: Intuitive mobile interactions (tap, double-tap, swipe, pinch)
- **Customizable Styling**: Font size, colors, and layout preferences

## Architecture

### Component Structure

```
src/components/features/player/subtitle-sync/
├── SubtitleSync.tsx              # Main synchronization component
├── SubtitleDisplay.tsx           # Subtitle rendering component
├── SubtitleHighlight.tsx         # Word-level highlighting overlay
├── SubtitleControls.tsx          # Configuration and management UI
├── hooks.tsx                     # Custom React hooks
├── performance.ts                # Performance optimization utilities
├── mobile.ts                     # Mobile-specific optimizations
├── styles/
│   └── subtitle-sync.css         # Comprehensive styling system
└── index.ts                      # Module exports
```

### Core Components

#### SubtitleSync
Main orchestrator component that coordinates all subtitle functionality:

```typescript
interface SubtitleSyncProps {
  segments: Segment[];              // Transcription segments with timing
  currentTime: number;              // Current audio playback position
  isPlaying: boolean;               // Audio playback state
  duration: number;                 // Total audio duration
  config?: Partial<SubtitleSyncConfig>; // Configuration options
  onSegmentClick?: (segment: Segment, index: number) => void;
  onSeek?: (time: number) => void;
  touchMode?: boolean;              // Mobile optimization mode
  tracks?: SubtitleTrack[];         // Multiple subtitle tracks
  activeTrack?: string;             // Currently active track
  enabled?: boolean;                // Subtitle visibility
}
```

#### SubtitleDisplay
High-performance subtitle rendering component:

- **Virtual Scrolling**: Optimized for large subtitle collections
- **Touch-Friendly**: 44px minimum touch targets
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Proper ARIA labels and semantic markup

#### SubtitleHighlight
Word-level highlighting overlay with precise timing:

```typescript
interface SubtitleHighlightProps {
  segment: Segment;                 // Current subtitle segment
  activeWordIndex: number;          // Active word within segment
  currentTime: number;              // Current playback time
  config: SubtitleSyncConfig;       // Configuration options
}
```

#### SubtitleControls
Comprehensive configuration and management interface:

- **Visual Settings**: Font size, colors, contrast modes
- **Timing Controls**: Subtitle offset adjustment
- **Display Options**: Compact/full/minimal display modes
- **Track Management**: Multiple subtitle track selection
- **Import/Export**: Settings persistence and sharing

### Performance Optimization

#### Memory Management
- **WeakMap Caching**: Automatic memory cleanup
- **LRU Eviction**: Intelligent cache management
- **Object Pooling**: Reuse of DOM elements
- **Garbage Collection**: Optimized cleanup routines

#### Rendering Optimization
- **RequestAnimationFrame**: Smooth 60fps animations
- **Intersection Observer**: Efficient viewport detection
- **CSS Containment**: Layout optimization
- **Will-Change**: Hardware acceleration hints

#### Mobile Optimization
```typescript
interface MobileSettings {
  maxVisibleSubtitles: number;      // Reduced for performance
  displayStyle: 'full' | 'compact' | 'minimal';
  wordHighlighting: boolean;        // Disabled on low-end devices
  animationsEnabled: boolean;       // Adaptive based on device
  updateInterval: number;           // Throttled update frequency
  cacheSize: number;               // Optimized cache size
}
```

## Usage Examples

### Basic Integration

```typescript
import { SubtitleSync, DEFAULT_SUBTITLE_CONFIG } from '@/components/features/player';

function MyPlayer() {
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleConfig, setSubtitleConfig] = useState(DEFAULT_SUBTITLE_CONFIG);

  return (
    <div className="player-container">
      <AudioPlayer {...audioProps} />
      {subtitlesEnabled && (
        <SubtitleSync
          segments={transcriptionSegments}
          currentTime={currentTime}
          isPlaying={isPlaying}
          duration={duration}
          config={subtitleConfig}
          onConfigChange={setSubtitleConfig}
          onToggle={setSubtitlesEnabled}
          enabled={subtitlesEnabled}
        />
      )}
    </div>
  );
}
```

### Advanced Integration with Mobile Optimization

```typescript
import { 
  SubtitleSync, 
  useSubtitleSync,
  useMobileSubtitleOptimization,
  useSubtitleAccessibility 
} from '@/components/features/player';

function EnhancedPlayer() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  // Mobile optimization
  const { mobileSettings, isLowEndDevice } = useMobileSubtitleOptimization(
    isTouchDevice,
    segments
  );

  // Accessibility settings
  const { accessibilitySettings } = useSubtitleAccessibility();

  // Subtitle synchronization
  const subtitleSync = useSubtitleSync(
    segments,
    currentTime,
    isPlaying,
    {
      ...DEFAULT_SUBTITLE_CONFIG,
      ...mobileSettings,
      ...accessibilitySettings,
    },
    {
      enablePerformanceMonitoring: true,
      mobileOptimized: isLowEndDevice,
      touchMode: isTouchDevice,
    }
  );

  return (
    <div className="enhanced-player">
      <AudioPlayer
        onTimeUpdate={setCurrentTime}
        onDurationChange={setDuration}
        onPlayStateChange={setIsPlaying}
      />
      <SubtitleSync
        segments={segments}
        currentTime={currentTime}
        isPlaying={isPlaying}
        duration={duration}
        config={{
          ...DEFAULT_SUBTITLE_CONFIG,
          ...mobileSettings,
          ...accessibilitySettings,
        }}
        touchMode={isTouchDevice}
      />
    </div>
  );
}
```

### Custom Configuration

```typescript
const customConfig: SubtitleSyncConfig = {
  offset: 0.5,                      // 500ms subtitle delay
  autoScroll: true,
  scrollBehavior: 'smooth',
  wordHighlighting: true,
  showControls: true,
  displayStyle: 'compact',
  maxVisibleSubtitles: 3,
  mobileOptimized: true,
  highContrast: false,
  trackOffsets: {
    'en': 0,
    'ja': 0.2,
    'zh': -0.1,
  },
};
```

## Configuration Options

### Basic Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `offset` | number | 0 | Subtitle timing offset in seconds |
| `autoScroll` | boolean | true | Enable automatic scrolling to active subtitle |
| `scrollBehavior` | string | 'smooth' | Scroll animation behavior |
| `wordHighlighting` | boolean | true | Enable word-level highlighting |
| `showControls` | boolean | false | Show configuration controls |
| `displayStyle` | string | 'full' | Display mode: 'full', 'compact', 'minimal' |

### Advanced Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxVisibleSubtitles` | number | 5 | Maximum subtitles displayed simultaneously |
| `mobileOptimized` | boolean | true | Enable mobile-specific optimizations |
| `highContrast` | boolean | false | Enable high contrast mode |
| `trackOffsets` | object | {} | Per-track timing adjustments |

## Performance Monitoring

The system includes comprehensive performance monitoring:

```typescript
const { getPerformanceMetrics, isPerformant, getRecommendations } = useSubtitleSync();

const metrics = getPerformanceMetrics();
console.log({
  averageProcessingTime: metrics.averageProcessingTime, // ms
  maxProcessingTime: metrics.maxProcessingTime,         // ms
  frameRate: metrics.frameRate,                         // fps
  isOptimal: metrics.isOptimal,                         // boolean
});

const recommendations = getRecommendations();
// ["Consider reducing subtitle complexity", "Reduce animation frequency"]
```

## Mobile Features

### Touch Gestures

| Gesture | Action | Customization |
|---------|--------|----------------|
| Tap | Toggle subtitle controls | `tapTimeout`, `tapMaxDistance` |
| Double Tap | Toggle subtitles | `doubleTapTimeout` |
| Swipe Up/Down | Adjust subtitle offset | `swipeMinDistance`, `swipeMaxDuration` |
| Pinch | Adjust subtitle size | `pinchMinScale` |
| Long Press | Show context menu | `longPressTimeout` |

### Mobile Optimization

```typescript
const mobileOptimizer = new MobileOptimizer();

// Detect device capabilities
const deviceInfo = mobileOptimizer.getDeviceInfo();
console.log({
  isLowEnd: deviceInfo.isLowEnd,
  networkSpeed: deviceInfo.networkSpeed,
  memoryInfo: deviceInfo.memoryInfo,
  isMobile: deviceInfo.isMobile,
});

// Get optimized settings
const settings = mobileOptimizer.getOptimalSettings();
console.log({
  maxVisibleSubtitles: settings.maxVisibleSubtitles,
  displayStyle: settings.displayStyle,
  animationsEnabled: settings.animationsEnabled,
});
```

## Accessibility

### Screen Reader Support

- **ARIA Labels**: Comprehensive labeling for all interactive elements
- **Live Regions**: Dynamic content announcements
- **Keyboard Navigation**: Full keyboard control with proper focus management
- **Semantic Markup**: Proper heading structure and landmark roles

### Visual Accessibility

```typescript
const accessibilityManager = new AccessibilityManager();

// Detect user preferences
const settings = accessibilityManager.getSettings();
console.log({
  highContrast: settings.highContrast,
  reducedMotion: settings.reducedMotion,
  fontSize: settings.fontSize,
});

// Announce to screen readers
accessibilityManager.announce("Subtitle offset adjusted by 0.5 seconds");
```

## Integration with Existing Components

The subtitle synchronization system is designed to integrate seamlessly with the existing audio player components:

### EnhancedAudioPlayer Integration

```typescript
import { EnhancedAudioPlayer, EnhancedPlayerWithSubtitles } from '@/components/features/player';

// Simple integration
<EnhancedAudioPlayer
  file={file}
  audioUrl={audioUrl}
  segments={segments}
  currentTime={currentTime}
  isPlaying={isPlaying}
  onPlayStateChange={setIsPlaying}
  onSeek={handleSeek}
  onSegmentClick={handleSegmentClick}
/>

// Complete integration with subtitles
<EnhancedPlayerWithSubtitles
  file={file}
  audioUrl={audioUrl}
  segments={segments}
  showSubtitles={true}
  touchMode={isMobile}
  enablePerformanceMonitoring={true}
  subtitleConfig={{
    wordHighlighting: true,
    autoScroll: true,
    displayStyle: 'compact',
  }}
/>
```

## Troubleshooting

### Common Issues

1. **Subtitle timing is off**: Adjust the `offset` configuration or use per-track `trackOffsets`
2. **Performance issues on mobile**: Enable `mobileOptimized` and reduce `maxVisibleSubtitles`
3. **Accessibility not working**: Ensure proper ARIA labels and semantic markup
4. **Scrolling not smooth**: Check for CSS `will-change` properties and hardware acceleration

### Performance Tips

- Use `mobileOptimized: true` for mobile devices
- Limit `maxVisibleSubtitles` to 3-5 for performance
- Disable `wordHighlighting` on low-end devices
- Monitor performance with `enablePerformanceMonitoring: true`
- Use `displayStyle: 'compact'` for better performance

### Debug Mode

Enable performance monitoring to debug issues:

```typescript
const subtitleConfig = {
  ...DEFAULT_SUBTITLE_CONFIG,
  showControls: true, // Show performance metrics
};

// Monitor performance
const metrics = getPerformanceMetrics();
if (!metrics.isOptimal) {
  console.warn('Subtitle performance issues detected:', metrics);
  console.log('Recommendations:', getRecommendations());
}
```

## CSS Custom Properties

The system uses CSS custom properties for dynamic styling:

```css
:root {
  --subtitle-offset: 0s;
  --subtitle-opacity: 1;
  --subtitle-transition: all 0.2s ease-out;
  --subtitle-scale: 1;
}
```

## Browser Compatibility

- **Modern Browsers**: Full feature support
- **iOS Safari**: Touch gestures optimized for iOS
- **Android Chrome**: Mobile optimizations enabled
- **IE 11**: Basic functionality with reduced features

## License

This subtitle synchronization system is part of the umuo.app project and follows the same licensing terms.

## Contributing

When contributing to the subtitle synchronization system:

1. Ensure <200ms response time for all interactions
2. Test on both desktop and mobile devices
3. Verify accessibility compliance with screen readers
4. Check performance impact on low-end devices
5. Maintain backward compatibility with existing player components

---

For more information about the umuo.app language learning platform, see the main project documentation.