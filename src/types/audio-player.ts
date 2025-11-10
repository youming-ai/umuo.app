/**
 * Enhanced types for the audio player hook
 * Extends existing database types with player-specific features
 */

import type {
  FileRow,
  Segment,
  WordTimestamp,
  AudioPlayerState,
  TranscriptRow
} from '@/types/db/database';
import type {
  TouchGestureData,
  MobilePerformanceMetrics,
  TouchTarget
} from '@/types/mobile';

// Enhanced player state with comprehensive features
export interface EnhancedAudioPlayerState extends AudioPlayerState {
  // Basic playback state
  isLoading: boolean;
  isBuffering: boolean;
  isSeeking: boolean;

  // Time tracking
  bufferedRanges: TimeRanges;
  seekableRanges: TimeRanges;

  // Audio settings
  playbackRate: number;
  previousVolume: number; // For mute toggle

  // Subtitle and synchronization
  currentSegmentIndex: number;
  currentWordIndex: number;
  currentSegment: Segment | null;
  currentWord: WordTimestamp | null;
  isSubtitleEnabled: boolean;
  subtitleDelay: number; // milliseconds

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

// Gesture state for mobile interactions
export interface GestureState {
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  lastGesture: TouchGestureData | null;
  gestureHistory: TouchGestureData[];
}

// Player error types
export interface PlayerError {
  code: 'NETWORK_ERROR' | 'DECODE_ERROR' | 'PLAYBACK_ERROR' | 'TIMEOUT_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  suggestedAction: string;
}

// Performance metrics for player
export interface PlayerPerformanceMetrics {
  responseTime: number;
  frameRate: number;
  memoryUsage: number;
  bufferHealth: number;
  networkLatency: number;
  batteryLevel: number;
}

// Audio file information
export interface AudioFile {
  file: FileRow;
  url: string;
  segments: Segment[];
  duration: number;
  transcript?: TranscriptRow;
}

// Player configuration options
export interface UseAudioPlayerOptions {
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

// Player action types for state management
export type PlayerAction =
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_BUFFERING'; payload: boolean }
  | { type: 'SET_SEEKING'; payload: boolean }
  | { type: 'SET_TIME'; payload: { currentTime: number; duration?: number } }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_PLAYBACK_RATE'; payload: number }
  | { type: 'SET_SEGMENT'; payload: { segmentIndex: number; wordIndex?: number } }
  | { type: 'SET_SUBTITLE_ENABLED'; payload: boolean }
  | { type: 'SET_SUBTITLE_DELAY'; payload: number }
  | { type: 'SET_LOOP'; payload: { start?: number; end?: number } }
  | { type: 'CLEAR_LOOP' }
  | { type: 'SET_REPEAT_MODE'; payload: 'none' | 'one' | 'all' }
  | { type: 'SET_QUEUE'; payload: { files: FileRow[]; index: number } }
  | { type: 'NEXT_FILE' }
  | { type: 'PREVIOUS_FILE' }
  | { type: 'TOGGLE_AUTO_PLAY_NEXT' }
  | { type: 'ADD_TO_HISTORY'; payload: { file: FileRow; position: number } }
  | { type: 'NAVIGATE_HISTORY'; payload: number }
  | { type: 'SET_CONTROLS_VISIBILITY'; payload: boolean }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'SET_ADVANCED_CONTROLS'; payload: boolean }
  | { type: 'SET_MINIMIZED'; payload: boolean }
  | { type: 'SET_PERFORMANCE_MODE'; payload: 'high-performance' | 'balanced' | 'battery-saver' }
  | { type: 'SET_BATTERY_OPTIMIZATION'; payload: boolean }
  | { type: 'SET_ERROR'; payload: PlayerError | null }
  | { type: 'RETRY' }
  | { type: 'SET_TOUCH_TARGET'; payload: TouchTarget | null }
  | { type: 'SET_GESTURE_STATE'; payload: Partial<GestureState> }
  | { type: 'SET_CURRENT_AUDIO'; payload: AudioFile }
  | { type: 'SET_BUFFERED_RANGES'; payload: TimeRanges }
  | { type: 'SET_NETWORK_QUALITY'; payload: 'slow' | 'fast' | 'unknown' }
  | { type: 'RESET_STATE' };

// Hook return type
export interface UseAudioPlayerReturn {
  // State
  state: EnhancedAudioPlayerState;
  currentFile: FileRow | null;
  currentAudio: AudioFile | null;

  // Playback controls
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => Promise<void>;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;

  // Audio settings
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;

  // Segment navigation
  nextSegment: () => void;
  previousSegment: () => void;
  goToSegment: (index: number) => void;
  nextWord: () => void;
  previousWord: () => void;

  // Subtitle controls
  toggleSubtitles: () => void;
  setSubtitleDelay: (delay: number) => void;

  // Loop and repeat
  setLoop: (start?: number, end?: number) => void;
  clearLoop: () => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;

  // Queue management
  setQueue: (files: FileRow[], index?: number) => void;
  nextFile: () => Promise<void>;
  previousFile: () => Promise<void>;
  toggleAutoPlayNext: () => void;

  // History navigation
  undo: () => void;
  redo: () => void;

  // UI controls
  toggleControls: () => void;
  toggleFullscreen: () => void;
  toggleAdvancedControls: () => void;
  toggleMinimized: () => void;

  // Performance controls
  setPerformanceMode: (mode: 'high-performance' | 'balanced' | 'battery-saver') => void;
  toggleBatteryOptimization: () => void;

  // Mobile gestures
  handleTouchStart: (event: TouchEvent) => void;
  handleTouchMove: (event: TouchEvent) => void;
  handleTouchEnd: (event: TouchEvent) => void;

  // Utilities
  formatTime: (seconds: number) => string;
  getPerformanceMetrics: () => PlayerPerformanceMetrics;
  clearError: () => void;
  retry: () => Promise<void>;
  reset: () => void;

  // Advanced features
  exportState: () => string;
  importState: (stateJson: string) => void;
  savePosition: () => void;
  loadPosition: () => Promise<void>;
}

// Audio player events
export interface AudioPlayerEvents {
  play: () => void;
  pause: () => void;
  ended: () => void;
  timeUpdate: (currentTime: number) => void;
  seeked: (time: number) => void;
  volumeChange: (volume: number) => void;
  error: (error: PlayerError) => void;
  segmentChange: (segment: Segment) => void;
  wordChange: (word: WordTimestamp) => void;
  loading: (isLoading: boolean) => void;
  buffering: (isBuffering: boolean) => void;
}

// Audio player context value
export interface AudioPlayerContextValue {
  player: UseAudioPlayerReturn;
  events: AudioPlayerEvents;
  registerEventListener: (event: keyof AudioPlayerEvents, listener: Function) => () => void;
  emit: (event: keyof AudioPlayerEvents, ...args: any[]) => void;
}

// Audio player configuration schema
export interface AudioPlayerConfig {
  // Basic settings
  autoPlay: boolean;
  initialVolume: number;
  initialPlaybackRate: number;

  // Mobile optimization
  enableMobileOptimization: boolean;
  touchTargetSize: number;
  gestureThreshold: number;

  // Performance
  enablePerformanceMonitoring: boolean;
  maxResponseTime: number;
  bufferHealthThreshold: number;

  // Battery optimization
  enableBatteryOptimization: boolean;
  batteryOptimizationThreshold: number;

  // Features
  enableHapticFeedback: boolean;
  enableSubtitles: boolean;
  enableAutoAdvance: boolean;
  enableAutoScroll: boolean;

  // Retry and error handling
  maxRetryAttempts: number;
  retryDelay: number;

  // Network optimization
  networkQualityThreshold: {
    slow: number;
    fast: number;
  };

  // Quality of life
  showAdvancedControls: boolean;
  autoHideControls: boolean;
  controlsHideDelay: number;
}

// Default player configuration
export const DEFAULT_PLAYER_CONFIG: AudioPlayerConfig = {
  // Basic settings
  autoPlay: false,
  initialVolume: 1,
  initialPlaybackRate: 1,

  // Mobile optimization
  enableMobileOptimization: true,
  touchTargetSize: 44,
  gestureThreshold: 10,

  // Performance
  enablePerformanceMonitoring: true,
  maxResponseTime: 200,
  bufferHealthThreshold: 0.8,

  // Battery optimization
  enableBatteryOptimization: true,
  batteryOptimizationThreshold: 0.2,

  // Features
  enableHapticFeedback: true,
  enableSubtitles: true,
  enableAutoAdvance: true,
  enableAutoScroll: true,

  // Retry and error handling
  maxRetryAttempts: 3,
  retryDelay: 1000,

  // Network optimization
  networkQualityThreshold: {
    slow: 0.5,
    fast: 2
  },

  // Quality of life
  showAdvancedControls: false,
  autoHideControls: true,
  controlsHideDelay: 3000
};

// Player status types
export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'seeking'
  | 'buffering'
  | 'error'
  | 'ended';

// Player quality settings
export interface PlayerQualitySettings {
  videoQuality?: 'auto' | 'high' | 'medium' | 'low';
  audioQuality?: 'auto' | 'high' | 'medium' | 'low';
  bufferSize: number; // seconds
  preloadNext: boolean;
}

// Player analytics data
export interface PlayerAnalytics {
  // Playback metrics
  totalPlayTime: number;
  averageSessionDuration: number;
  playCount: number;
  pauseCount: number;
  seekCount: number;

  // Performance metrics
  averageResponseTime: number;
  bufferUnderruns: number;
  errorCount: number;

  // User engagement
  segmentsCompleted: number;
  wordsCompleted: number;
  repeatListenCount: number;

  // Mobile specific
  gestureUsage: Record<string, number>;
  hapticFeedbackCount: number;
  batteryOptimizationActivations: number;
}

// Export all types for convenience
export type {
  FileRow,
  Segment,
  WordTimestamp,
  AudioPlayerState,
  TranscriptRow
};
