# Comprehensive Audio Player Hook

A powerful, performance-optimized React hook for managing audio player state with mobile optimization, advanced features, and seamless integration with existing application architecture.

## Features

### 🎵 Core Playback Control
- Play, pause, stop functionality
- Precise seeking with millisecond accuracy
- Volume control with mute toggle
- Variable playback rate (0.25x - 4x)
- Loop and repeat modes (none, one, all)

### 📱 Mobile Optimization
- Touch gesture support (swipe, drag, long press)
- Battery-aware performance scaling
- Network condition awareness
- Haptic feedback integration
- Responsive touch targets

### ⚡ Performance Optimization
- <200ms response time for all state changes
- Efficient state management with useReducer
- Debounced and throttled operations
- Memory leak prevention
- Performance monitoring and metrics

### 🗂️ Advanced Features
- Segment navigation with word-level precision
- Subtitle synchronization and control
- Queue management for multiple files
- Playback history with undo/redo
- State persistence and recovery
- Background playback support

### 🔧 Integration Features
- TanStack Query integration
- IndexedDB database support
- Performance monitoring integration
- Error handling and recovery
- Analytics tracking support

## Installation

The hook is part of your existing codebase. Import it in your React components:

```typescript
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAudioPlayerIntegration } from "@/hooks/useAudioPlayerIntegration";
```

## Basic Usage

### Simple Audio Player

```typescript
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

function AudioPlayer({ fileId }: { fileId: number }) {
  const {
    state,
    currentFile,
    play,
    pause,
    seek,
    setVolume,
    formatTime
  } = useAudioPlayer({
    fileId,
    autoPlay: false,
    initialVolume: 0.8,
    enableMobileOptimization: true,
  });

  return (
    <div className="audio-player">
      <div className="controls">
        <button onClick={play} disabled={state.isPlaying}>
          Play
        </button>
        <button onClick={pause} disabled={!state.isPlaying}>
          Pause
        </button>
      </div>
      
      <div className="time-display">
        {formatTime(state.currentTime)} / {formatTime(state.duration)}
      </div>
      
      <div className="progress-bar">
        <input
          type="range"
          min={0}
          max={state.duration}
          value={state.currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
        />
      </div>
      
      <div className="volume-control">
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={state.volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}
```

### Integrated Audio Player with Database Support

```typescript
import { useAudioPlayer, useAudioPlayerIntegration } from "@/hooks/useAudioPlayer";

function IntegratedAudioPlayer({ fileId }: { fileId: number }) {
  // Handle data fetching and integration
  const {
    audioFile,
    isLoading,
    preferences,
    savePosition,
    trackEvent
  } = useAudioPlayerIntegration(fileId);

  // Handle audio player state
  const {
    state,
    play,
    pause,
    seek,
    nextSegment,
    previousSegment,
    toggleSubtitles,
    formatTime,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useAudioPlayer({
    fileId,
    autoPlay: preferences?.autoPlay,
    initialVolume: preferences?.volume,
    enableMobileOptimization: true,
    enablePerformanceMonitoring: true,
  });

  // Track playback events
  useEffect(() => {
    if (state.isPlaying) {
      trackEvent({
        type: 'playback_started',
        data: { fileId, position: state.currentTime },
        timestamp: new Date(),
      });
    }
  }, [state.isPlaying, fileId, state.currentTime, trackEvent]);

  // Save position periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.isPlaying) {
        savePosition(state.currentTime);
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(interval);
  }, [state.isPlaying, state.currentTime, savePosition]);

  if (isLoading) {
    return <div>Loading audio...</div>;
  }

  return (
    <div 
      className="audio-player"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Player controls */}
      <div className="controls">
        <button onClick={play}>Play</button>
        <button onClick={pause}>Pause</button>
        <button onClick={() => previousSegment()}>Previous Segment</button>
        <button onClick={() => nextSegment()}>Next Segment</button>
        <button onClick={toggleSubtitles}>
          {state.isSubtitleEnabled ? 'Hide' : 'Show'} Subtitles
        </button>
      </div>

      {/* Progress bar */}
      <div className="progress-container">
        <span>{formatTime(state.currentTime)}</span>
        <input
          type="range"
          min={0}
          max={state.duration}
          value={state.currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="progress-bar"
        />
        <span>{formatTime(state.duration)}</span>
      </div>

      {/* Subtitle display */}
      {state.isSubtitleEnabled && state.currentSegment && (
        <div className="subtitles">
          {state.currentSegment.text}
        </div>
      )}

      {/* Performance metrics (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <div>Response Time: {state.performanceMetrics?.responseTime}ms</div>
          <div>Memory Usage: {state.performanceMetrics?.memoryUsage}MB</div>
          <div>Buffer Health: {state.performanceMetrics?.bufferHealth}%</div>
        </div>
      )}
    </div>
  );
}
```

## Advanced Usage

### Queue Management

```typescript
function PlaylistPlayer({ files }: { files: FileRow[] }) {
  const {
    state,
    play,
    pause,
    nextFile,
    previousFile,
    setQueue,
    toggleAutoPlayNext
  } = useAudioPlayer();

  // Initialize queue
  useEffect(() => {
    setQueue(files, 0); // Start from first file
  }, [files, setQueue]);

  return (
    <div className="playlist-player">
      <div className="queue-info">
        <span>Track {state.queueIndex + 1} of {state.queue.length}</span>
        <button onClick={() => previousFile()}>Previous</button>
        <button onClick={() => nextFile()}>Next</button>
        <button onClick={toggleAutoPlayNext}>
          Auto-play Next: {state.autoPlayNext ? 'On' : 'Off'}
        </button>
      </div>
      
      {/* Regular player controls */}
      <div className="controls">
        <button onClick={play}>Play</button>
        <button onClick={pause}>Pause</button>
      </div>
    </div>
  );
}
```

### Mobile-Optimized Player

```typescript
function MobileAudioPlayer({ fileId }: { fileId: number }) {
  const {
    state,
    play,
    pause,
    seek,
    seekForward,
    seekBackward,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useAudioPlayer({
    fileId,
    enableMobileOptimization: true,
    enableHapticFeedback: true,
    batteryOptimizationThreshold: 0.2,
  });

  return (
    <div 
      className="mobile-audio-player"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Large touch targets for mobile */}
      <div className="mobile-controls">
        <button 
          className="touch-target"
          onClick={() => seekBackward()}
        >
          ⏪ -10s
        </button>
        
        <button 
          className="touch-target play-button"
          onClick={state.isPlaying ? pause : play}
        >
          {state.isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <button 
          className="touch-target"
          onClick={() => seekForward()}
        >
          +10s ⏩
        </button>
      </div>

      {/* Swipeable progress bar */}
      <div className="progress-container">
        <div className="progress-bar" />
        <div className="progress-fill" 
          style={{ width: `${(state.currentTime / state.duration) * 100}%` }} />
      </div>

      {/* Battery optimization indicator */}
      {state.batteryOptimization && (
        <div className="battery-optimization">
          🌱 Battery saving mode active
        </div>
      )}
    </div>
  );
}
```

### Performance Monitoring

```typescript
function AudioPlayerWithMetrics({ fileId }: { fileId: number }) {
  const {
    state,
    play,
    pause,
    getPerformanceMetrics
  } = useAudioPlayer({
    fileId,
    enablePerformanceMonitoring: true,
  });

  const [metrics, setMetrics] = useState(null);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const currentMetrics = getPerformanceMetrics();
      setMetrics(currentMetrics);
    }, 1000);

    return () => clearInterval(interval);
  }, [getPerformanceMetrics]);

  return (
    <div className="audio-player">
      {/* Player controls */}
      <div className="controls">
        <button onClick={play}>Play</button>
        <button onClick={pause}>Pause</button>
      </div>

      {/* Performance metrics (development) */}
      {process.env.NODE_ENV === 'development' && metrics && (
        <div className="performance-metrics">
          <h4>Performance Metrics</h4>
          <div>Response Time: {metrics.responseTime}ms</div>
          <div>Frame Rate: {metrics.frameRate}fps</div>
          <div>Memory Usage: {metrics.memoryUsage}MB</div>
          <div>Buffer Health: {metrics.bufferHealth}%</div>
          <div>Network Latency: {metrics.networkLatency}ms</div>
          <div>Battery Level: {Math.round(metrics.batteryLevel * 100)}%</div>
        </div>
      )}
    </div>
  );
}
```

## Configuration Options

The `useAudioPlayer` hook accepts comprehensive configuration options:

```typescript
interface UseAudioPlayerOptions {
  fileId?: number;
  autoPlay?: boolean;
  initialVolume?: number;
  initialPlaybackRate?: number;
  enableMobileOptimization?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableHapticFeedback?: boolean;
  batteryOptimizationThreshold?: number;
  maxRetryAttempts?: number;
  segmentAutoAdvance?: boolean;
  subtitleAutoScroll?: boolean;
  networkQualityThreshold?: { slow: number; fast: number };
}
```

## State Structure

The hook provides comprehensive state management:

```typescript
interface EnhancedAudioPlayerState {
  // Basic playback
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  isSeeking: boolean;

  // Audio settings
  playbackRate: number;
  previousVolume: number;

  // Subtitle and synchronization
  currentSegmentIndex: number;
  currentWordIndex: number;
  currentSegment: Segment | null;
  currentWord: WordTimestamp | null;
  isSubtitleEnabled: boolean;
  subtitleDelay: number;

  // Loop and repeat
  loopStart?: number;
  loopEnd?: number;
  isLoopActive: boolean;
  repeatMode: 'none' | 'one' | 'all';

  // Queue and navigation
  queue: FileRow[];
  queueIndex: number;
  nextFile?: FileRow;
  previousFile?: FileRow;
  autoPlayNext: boolean;
  history: Array<{ file: FileRow; position: number; timestamp: Date }>;
  historyIndex: number;

  // UI state
  showControls: boolean;
  isFullscreen: boolean;
  showAdvancedControls: boolean;
  isMinimized: boolean;

  // Performance and optimization
  networkQuality: 'slow' | 'fast' | 'unknown';
  batteryOptimization: boolean;
  performanceMode: 'high-performance' | 'balanced' | 'battery-saver';

  // Error and recovery
  lastError: PlayerError | null;
  retryCount: number;
  maxRetries: number;

  // Mobile optimization
  touchTarget: TouchTarget | null;
  isTouchOptimized: boolean;
  gestureState: GestureState;
}
```

## Performance Features

### Response Time Optimization
- All state updates are measured and optimized for <200ms response time
- Debounced and throttled operations prevent excessive re-renders
- Efficient state management with useReducer

### Memory Management
- Automatic cleanup of audio URLs and event listeners
- Memory leak prevention with proper useEffect cleanup
- Efficient caching strategies for audio data

### Mobile Optimization
- Touch gesture recognition with native performance
- Battery-aware performance scaling
- Network condition adaptation
- Haptic feedback integration

## Error Handling

The hook includes comprehensive error handling:

```typescript
interface PlayerError {
  code: 'NETWORK_ERROR' | 'DECODE_ERROR' | 'PLAYBACK_ERROR' | 'TIMEOUT_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  suggestedAction: string;
}
```

### Error Recovery
- Automatic retry mechanisms for recoverable errors
- Graceful degradation for unsupported features
- User-friendly error messages and suggested actions
- State preservation during error scenarios

## Integration with Existing Architecture

The hook seamlessly integrates with your existing application architecture:

### TanStack Query Integration
```typescript
import { useAudioPlayerIntegration } from "@/hooks/useAudioPlayerIntegration";

const {
  audioFile,
  saveState,
  loadState,
  trackEvent,
  preferences
} = useAudioPlayerIntegration(fileId);
```

### Database Integration
- Works with existing IndexedDB patterns
- Supports your current file and transcript structures
- Compatible with existing query keys and caching strategies

### Performance Monitoring Integration
- Integrates with your existing performance monitoring infrastructure
- Supports custom metrics and tracking
- Compatible with web vitals measurement

## Mobile Features

### Touch Gestures
- Swipe to seek
- Drag for precise control
- Long press for advanced options
- Double tap for quick actions

### Battery Optimization
- Automatic performance scaling based on battery level
- Configurable optimization thresholds
- User control over optimization settings

### Network Adaptation
- Automatic quality adjustment based on network speed
- Configurable network quality thresholds
- Graceful handling of connectivity issues

## Accessibility

The hook supports comprehensive accessibility features:
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management
- ARIA label integration

## Browser Support

The hook supports modern browsers with:
- HTML5 Audio API
- Web Audio API
- Touch Events API
- Performance API
- Battery Status API (optional)

## TypeScript Support

Full TypeScript support with:
- Comprehensive type definitions
- Strict type checking
- IntelliSense support
- Type-safe state management

## Best Practices

1. **Performance**: Use the built-in performance monitoring to ensure <200ms response times
2. **Mobile**: Enable mobile optimization for touch devices
3. **Accessibility**: Implement proper keyboard navigation and screen reader support
4. **Error Handling**: Use the comprehensive error handling and recovery mechanisms
5. **State Persistence**: Use the integrated state persistence for better UX
6. **Analytics**: Track player events for insights and optimization

## Migration from Existing Player

To migrate from the existing audio player implementation:

1. Replace existing state management with `useAudioPlayer`
2. Update component to use new state structure
3. Add mobile optimization features
4. Implement error handling and recovery
5. Add performance monitoring
6. Update styling for mobile touch targets

The new hook is designed to be a drop-in replacement with enhanced features and better performance.