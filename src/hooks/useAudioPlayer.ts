/**
 * Comprehensive audio player state management hook with performance and mobile optimization
 * Manages all audio player state including playback, seeking, volume, speed controls,
 * subtitle synchronization, segment navigation, and advanced features.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  useReducer,
  type Reducer,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FileRow,
  Segment,
  WordTimestamp,
  AudioPlayerState,
  FileStatus,
} from "@/types/db/database";
import type {
  TouchGestureData,
  MobilePerformanceMetrics,
  MobileOptimizationConfig,
  TouchTarget,
} from "@/types/mobile";
import type { ProgressUpdate } from "@/types/progress";
import { performanceMonitor } from "@/lib/performance/performance-monitor";
import { mobileOptimizer } from "@/lib/mobile/optimization";
import { hapticFeedback } from "@/lib/mobile/haptic-feedback";
import { mobileDetector } from "@/types/mobile";
import {
  PerformanceUtils,
  debounce,
  throttle,
  memoize,
} from "@/lib/utils/performance-utils";
import {
  audioBufferMemoryManager,
  streamingAudioProcessor,
  type StreamedAudioBuffer,
  type StreamPriority,
  type MemoryPressureEvent,
} from "@/lib/performance/memory-management";
import {
  AudioChunkingStrategy,
  createMemoryOptimizedChunkingStrategy,
  type MemoryAwareChunkingResult,
  type AudioChunk,
} from "@/lib/audio/chunking-strategy";

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
  repeatMode: "none" | "one" | "all";

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
  networkQuality: "slow" | "fast" | "unknown";
  batteryOptimization: boolean;
  performanceMode: "high-performance" | "balanced" | "battery-saver";

  // Error and recovery
  lastError: PlayerError | null;
  retryCount: number;
  maxRetries: number;

  // Mobile optimization
  touchTarget: TouchTarget | null;
  isTouchOptimized: boolean;
  gestureState: GestureState;

  // Audio data
  currentAudio: AudioFile | null;

  // Memory management state
  memoryStats: {
    usage: number; // MB
    available: number; // MB
    pressureLevel: "low" | "medium" | "high" | "critical";
    streamingEnabled: boolean;
    bufferCount: number;
  };
  streamingBuffer?: StreamedAudioBuffer;
  chunkingResult?: MemoryAwareChunkingResult;
}

// Player action types for state management
export type PlayerAction =
  | { type: "SET_PLAYING"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_BUFFERING"; payload: boolean }
  | { type: "SET_SEEKING"; payload: boolean }
  | { type: "SET_TIME"; payload: { currentTime: number; duration?: number } }
  | { type: "SET_VOLUME"; payload: number }
  | { type: "TOGGLE_MUTE" }
  | { type: "SET_PLAYBACK_RATE"; payload: number }
  | {
      type: "SET_SEGMENT";
      payload: { segmentIndex: number; wordIndex?: number };
    }
  | { type: "SET_SUBTITLE_ENABLED"; payload: boolean }
  | { type: "SET_SUBTITLE_DELAY"; payload: number }
  | { type: "SET_LOOP"; payload: { start?: number; end?: number } }
  | { type: "CLEAR_LOOP" }
  | { type: "SET_REPEAT_MODE"; payload: "none" | "one" | "all" }
  | { type: "SET_QUEUE"; payload: { files: FileRow[]; index: number } }
  | { type: "NEXT_FILE" }
  | { type: "PREVIOUS_FILE" }
  | { type: "TOGGLE_AUTO_PLAY_NEXT" }
  | { type: "ADD_TO_HISTORY"; payload: { file: FileRow; position: number } }
  | { type: "NAVIGATE_HISTORY"; payload: number }
  | { type: "SET_CONTROLS_VISIBILITY"; payload: boolean }
  | { type: "TOGGLE_FULLSCREEN" }
  | { type: "SET_ADVANCED_CONTROLS"; payload: boolean }
  | { type: "SET_MINIMIZED"; payload: boolean }
  | {
      type: "SET_PERFORMANCE_MODE";
      payload: "high-performance" | "balanced" | "battery-saver";
    }
  | { type: "SET_BATTERY_OPTIMIZATION"; payload: boolean }
  | { type: "SET_ERROR"; payload: PlayerError | null }
  | { type: "RETRY" }
  | { type: "SET_TOUCH_TARGET"; payload: TouchTarget | null }
  | { type: "SET_GESTURE_STATE"; payload: Partial<GestureState> }
  | { type: "SET_CURRENT_AUDIO"; payload: AudioFile | null }
  | { type: "SET_BUFFERED_RANGES"; payload: TimeRanges }
  | { type: "SET_NETWORK_QUALITY"; payload: "slow" | "fast" | "unknown" }
  | {
      type: "SET_MEMORY_STATS";
      payload: Partial<EnhancedAudioPlayerState["memoryStats"]>;
    }
  | { type: "SET_STREAMING_BUFFER"; payload: StreamedAudioBuffer | undefined }
  | {
      type: "SET_CHUNKING_RESULT";
      payload: MemoryAwareChunkingResult | undefined;
    }
  | { type: "UPDATE_MEMORY_PRESSURE"; payload: MemoryPressureEvent }
  | { type: "RESET_STATE" };

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
  code:
    | "NETWORK_ERROR"
    | "DECODE_ERROR"
    | "PLAYBACK_ERROR"
    | "TIMEOUT_ERROR"
    | "UNKNOWN_ERROR";
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
  setRepeatMode: (mode: "none" | "one" | "all") => void;

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
  setPerformanceMode: (
    mode: "high-performance" | "balanced" | "battery-saver",
  ) => void;
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

  // Memory management
  getMemoryStats: () => EnhancedAudioPlayerState["memoryStats"];
  cleanupMemory: () => void;
  optimizeMemoryUsage: () => void;
  toggleStreaming: (enabled: boolean) => void;
}

// Performance optimization utilities
const performanceUtils = {
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number,
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

// State reducer for efficient state management
const playerReducer: Reducer<EnhancedAudioPlayerState, PlayerAction> = (
  state,
  action,
): EnhancedAudioPlayerState => {
  const startTime = performance.now();

  try {
    switch (action.type) {
      case "SET_PLAYING":
        return { ...state, isPlaying: action.payload };

      case "SET_LOADING":
        return { ...state, isLoading: action.payload };

      case "SET_BUFFERING":
        return { ...state, isBuffering: action.payload };

      case "SET_SEEKING":
        return { ...state, isSeeking: action.payload };

      case "SET_TIME":
        return {
          ...state,
          currentTime: action.payload.currentTime,
          ...(action.payload.duration && { duration: action.payload.duration }),
        };

      case "SET_VOLUME":
        return {
          ...state,
          volume: action.payload,
          previousVolume: state.isMuted ? state.previousVolume : action.payload,
        };

      case "TOGGLE_MUTE":
        return {
          ...state,
          isMuted: !state.isMuted,
          volume: !state.isMuted ? 0 : state.previousVolume,
        };

      case "SET_PLAYBACK_RATE":
        return { ...state, playbackRate: action.payload };

      case "SET_SEGMENT":
        return {
          ...state,
          currentSegmentIndex: action.payload.segmentIndex,
          currentWordIndex: action.payload.wordIndex ?? 0,
        };

      case "SET_SUBTITLE_ENABLED":
        return { ...state, isSubtitleEnabled: action.payload };

      case "SET_SUBTITLE_DELAY":
        return { ...state, subtitleDelay: action.payload };

      case "SET_LOOP":
        return {
          ...state,
          loopStart: action.payload.start,
          loopEnd: action.payload.end,
          isLoopActive:
            action.payload.start !== undefined &&
            action.payload.end !== undefined,
        };

      case "CLEAR_LOOP":
        return {
          ...state,
          loopStart: undefined,
          loopEnd: undefined,
          isLoopActive: false,
        };

      case "SET_REPEAT_MODE":
        return { ...state, repeatMode: action.payload };

      case "SET_QUEUE":
        return {
          ...state,
          queue: action.payload.files,
          queueIndex: action.payload.index,
          nextFile: action.payload.files[action.payload.index + 1],
          previousFile: action.payload.files[action.payload.index - 1],
        };

      case "NEXT_FILE":
        const nextIndex = state.queueIndex + 1;
        if (nextIndex < state.queue.length) {
          return {
            ...state,
            queueIndex: nextIndex,
            nextFile: state.queue[nextIndex + 1],
            previousFile: state.queue[nextIndex - 1],
            currentTime: 0,
            isPlaying: state.autoPlayNext,
          };
        }
        return state;

      case "PREVIOUS_FILE":
        const prevIndex = state.queueIndex - 1;
        if (prevIndex >= 0) {
          return {
            ...state,
            queueIndex: prevIndex,
            nextFile: state.queue[prevIndex + 1],
            previousFile: state.queue[prevIndex - 1],
            currentTime: 0,
            isPlaying: state.autoPlayNext,
          };
        }
        return state;

      case "TOGGLE_AUTO_PLAY_NEXT":
        return { ...state, autoPlayNext: !state.autoPlayNext };

      case "ADD_TO_HISTORY":
        const newHistory = [
          ...state.history.slice(0, state.historyIndex + 1),
          {
            file: action.payload.file,
            position: action.payload.position,
            timestamp: new Date(),
          },
        ].slice(-50); // Keep last 50 entries

        return {
          ...state,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };

      case "NAVIGATE_HISTORY":
        const targetIndex = Math.max(
          0,
          Math.min(action.payload, state.history.length - 1),
        );
        return {
          ...state,
          historyIndex: targetIndex,
        };

      case "SET_CONTROLS_VISIBILITY":
        return { ...state, showControls: action.payload };

      case "TOGGLE_FULLSCREEN":
        return { ...state, isFullscreen: !state.isFullscreen };

      case "SET_ADVANCED_CONTROLS":
        return { ...state, showAdvancedControls: action.payload };

      case "SET_MINIMIZED":
        return { ...state, isMinimized: action.payload };

      case "SET_PERFORMANCE_MODE":
        return { ...state, performanceMode: action.payload };

      case "SET_BATTERY_OPTIMIZATION":
        return { ...state, batteryOptimization: action.payload };

      case "SET_ERROR":
        return {
          ...state,
          lastError: action.payload,
          retryCount: action.payload ? state.retryCount + 1 : 0,
        };

      case "RETRY":
        return {
          ...state,
          retryCount: state.retryCount + 1,
          lastError: null,
        };

      case "SET_TOUCH_TARGET":
        return { ...state, touchTarget: action.payload };

      case "SET_GESTURE_STATE":
        return {
          ...state,
          gestureState: { ...state.gestureState, ...action.payload },
        };

      case "SET_CURRENT_AUDIO":
        return {
          ...state,
          currentAudio: action.payload,
        };

      case "SET_BUFFERED_RANGES":
        return {
          ...state,
          bufferedRanges: action.payload,
        };

      case "SET_NETWORK_QUALITY":
        return {
          ...state,
          networkQuality: action.payload,
        };

      case "SET_MEMORY_STATS":
        return {
          ...state,
          memoryStats: { ...state.memoryStats, ...action.payload },
        };

      case "SET_STREAMING_BUFFER":
        return {
          ...state,
          streamingBuffer: action.payload,
          memoryStats: {
            ...state.memoryStats,
            streamingEnabled: action.payload !== undefined,
          },
        };

      case "SET_CHUNKING_RESULT":
        return {
          ...state,
          chunkingResult: action.payload,
        };

      case "UPDATE_MEMORY_PRESSURE":
        return {
          ...state,
          memoryStats: {
            ...state.memoryStats,
            pressureLevel: action.payload.level,
            available: action.payload.availableMemory,
          },
        };

      case "RESET_STATE":
        return getInitialState();

      default:
        return state;
    }
  } finally {
    // Record performance metrics
    const responseTime = performance.now() - startTime;
    if (responseTime > 200) {
      console.warn(
        `Player state update took ${responseTime.toFixed(2)}ms (>200ms threshold)`,
      );
    }

    performanceMonitor.recordMetric(
      "player-state-update-time",
      responseTime,
      "ui" as any,
      { unit: "ms" },
    );
  }
};

// Initial state factory
const getInitialState = (): EnhancedAudioPlayerState => ({
  // Basic playback state
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  isLoading: false,
  isBuffering: false,
  isSeeking: false,

  // Time tracking
  bufferedRanges: { length: 0, start: () => 0, end: () => 0 } as TimeRanges,
  seekableRanges: { length: 0, start: () => 0, end: () => 0 } as TimeRanges,

  // Audio settings
  playbackRate: 1,
  previousVolume: 1,

  // Subtitle and synchronization
  currentSegmentIndex: 0,
  currentWordIndex: 0,
  currentSegment: null,
  currentWord: null,
  isSubtitleEnabled: true,
  subtitleDelay: 0,

  // Loop and repeat
  isLoopActive: false,
  repeatMode: "none",

  // Queue and navigation
  queue: [],
  queueIndex: -1,
  autoPlayNext: false,
  history: [],
  historyIndex: -1,

  // UI state
  showControls: true,
  isFullscreen: false,
  showAdvancedControls: false,
  isMinimized: false,

  // Performance and optimization
  networkQuality: "unknown",
  batteryOptimization: false,
  performanceMode: "balanced",

  // Error and recovery
  lastError: null,
  retryCount: 0,
  maxRetries: 3,

  // Mobile optimization
  touchTarget: null,
  isTouchOptimized: false,
  gestureState: {
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastGesture: null,
    gestureHistory: [],
  },

  // Audio data
  currentAudio: null,

  // Memory management state
  memoryStats: {
    usage: 0,
    available: 200, // Default 200MB available
    pressureLevel: "low",
    streamingEnabled: false,
    bufferCount: 0,
  },
});

/**
 * Main audio player hook with comprehensive state management
 */
export function useAudioPlayer(
  options: UseAudioPlayerOptions = {},
): UseAudioPlayerReturn {
  const {
    fileId,
    autoPlay = false,
    initialVolume = 1,
    initialPlaybackRate = 1,
    enableMobileOptimization = true,
    enablePerformanceMonitoring = true,
    enableHapticFeedback = true,
    batteryOptimizationThreshold = 0.2,
    maxRetryAttempts = 3,
    segmentAutoAdvance = true,
    subtitleAutoScroll = true,
    networkQualityThreshold = { slow: 0.5, fast: 2 },
  } = options;

  // State management with reducer
  const [state, dispatch] = useReducer(playerReducer, getInitialState());
  const queryClient = useQueryClient();

  // Refs for audio element and performance tracking
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const performanceFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const batteryOptimizationTimerRef = useRef<NodeJS.Timeout>();

  // Mobile optimization state
  const [mobileMetrics, setMobileMetrics] =
    useState<MobilePerformanceMetrics | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
      setupAudioElement();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Setup audio element event listeners
  const setupAudioElement = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // Playback events
    audio.addEventListener("play", () =>
      dispatch({ type: "SET_PLAYING", payload: true }),
    );
    audio.addEventListener("pause", () =>
      dispatch({ type: "SET_PLAYING", payload: false }),
    );
    audio.addEventListener("ended", handleAudioEnded);
    audio.addEventListener("error", handleAudioError);

    // Time updates
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleMetadataLoaded);
    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("seeking", () =>
      dispatch({ type: "SET_SEEKING", payload: true }),
    );
    audio.addEventListener("seeked", () =>
      dispatch({ type: "SET_SEEKING", payload: false }),
    );
    audio.addEventListener("waiting", () =>
      dispatch({ type: "SET_BUFFERING", payload: true }),
    );
    audio.addEventListener("playing", () => {
      dispatch({ type: "SET_BUFFERING", payload: false });
      dispatch({ type: "SET_LOADING", payload: false });
    });

    // Set initial values
    audio.volume = initialVolume;
    audio.playbackRate = initialPlaybackRate;
  }, [initialVolume, initialPlaybackRate]);

  // Query current file data
  const { data: currentFile, error: fileError } = useQuery({
    queryKey: ["file", fileId],
    queryFn: async () => {
      if (!fileId) return null;
      // This would be implemented with your actual data fetching logic
      // For now, return a placeholder
      return null as FileRow;
    },
    enabled: !!fileId,
  });

  // Load file when it changes
  useEffect(() => {
    if (currentFile && audioRef.current) {
      loadFile(currentFile);
    }
  }, [currentFile]);

  // Initialize mobile optimizations
  useEffect(() => {
    if (enableMobileOptimization) {
      initializeMobileOptimizations();
    }

    return () => {
      if (batteryOptimizationTimerRef.current) {
        clearInterval(batteryOptimizationTimerRef.current);
      }
    };
  }, [enableMobileOptimization]);

  // Initialize memory management
  useEffect(() => {
    // Initialize memory pressure monitoring
    const handleMemoryPressure = (event: MemoryPressureEvent) => {
      dispatch({ type: "UPDATE_MEMORY_PRESSURE", payload: event });

      // Take action based on pressure level
      switch (event.level) {
        case "high":
        case "critical":
          // Reduce performance mode
          dispatch({ type: "SET_PERFORMANCE_MODE", payload: "battery-saver" });
          break;
        case "medium":
          // Switch to balanced mode if currently high performance
          if (state.performanceMode === "high-performance") {
            dispatch({ type: "SET_PERFORMANCE_MODE", payload: "balanced" });
          }
          break;
      }
    };

    // Register memory pressure callback
    streamingAudioProcessor.onMemoryPressure(handleMemoryPressure);

    // Update initial memory stats
    const memoryStats = audioBufferMemoryManager.getMemoryStats();
    dispatch({
      type: "SET_MEMORY_STATS",
      payload: {
        usage: memoryStats.totalMemoryUsed,
        bufferCount: memoryStats.totalBuffers,
      },
    });

    // Set up periodic memory monitoring
    const memoryMonitorInterval = setInterval(() => {
      const currentStats = audioBufferMemoryManager.getMemoryStats();
      dispatch({
        type: "SET_MEMORY_STATS",
        payload: {
          usage: currentStats.totalMemoryUsed,
          bufferCount: currentStats.totalBuffers,
        },
      });
    }, 10000); // Update every 10 seconds

    return () => {
      clearInterval(memoryMonitorInterval);
      streamingAudioProcessor.removeMemoryPressureCallback(
        handleMemoryPressure,
      );
    };
  }, [state.performanceMode]);

  // Performance monitoring
  useEffect(() => {
    if (enablePerformanceMonitoring) {
      startPerformanceMonitoring();
    }

    return () => {
      if (performanceFrameRef.current) {
        cancelAnimationFrame(performanceFrameRef.current);
      }
    };
  }, [enablePerformanceMonitoring]);

  // Initialize mobile optimizations
  const initializeMobileOptimizations = useCallback(() => {
    if (!mobileDetector.isMobile()) return;

    // Apply mobile optimizations
    dispatch({ type: "SET_TOUCH_TARGET", payload: "play_button" });
    dispatch({ type: "SET_GESTURE_STATE", payload: { isDragging: false } });

    // Monitor battery and network conditions
    const monitorBatteryAndNetwork = () => {
      const metrics = mobileOptimizer.getPerformanceMetrics();
      setMobileMetrics(metrics);

      // Adjust performance mode based on battery
      if (metrics.batteryLevel < batteryOptimizationThreshold) {
        dispatch({ type: "SET_PERFORMANCE_MODE", payload: "battery-saver" });
        dispatch({ type: "SET_BATTERY_OPTIMIZATION", payload: true });
      } else {
        dispatch({ type: "SET_PERFORMANCE_MODE", payload: "balanced" });
        dispatch({ type: "SET_BATTERY_OPTIMIZATION", payload: false });
      }

      // Adjust network quality
      const networkSpeed = metrics.networkSpeed;
      if (networkSpeed < networkQualityThreshold.slow) {
        dispatch({
          type: "SET_NETWORK_QUALITY",
          payload: "slow" as any,
        });
      } else if (networkSpeed > networkQualityThreshold.fast) {
        dispatch({
          type: "SET_NETWORK_QUALITY",
          payload: "fast" as any,
        });
      }
    };

    monitorBatteryAndNetwork();
    batteryOptimizationTimerRef.current = setInterval(
      monitorBatteryAndNetwork,
      5000, // Check every 5 seconds
    );
  }, [batteryOptimizationThreshold, networkQualityThreshold]);

  // Start performance monitoring
  const startPerformanceMonitoring = useCallback(() => {
    const monitorPerformance = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTimeRef.current;

      if (deltaTime >= 1000) {
        // Update every second
        const metrics = getPerformanceMetrics();

        // Record performance metrics
        performanceMonitor.recordMetric(
          "player-response-time",
          metrics.responseTime,
          "ui" as any,
          { unit: "ms" },
        );

        performanceMonitor.recordMetric(
          "player-buffer-health",
          metrics.bufferHealth,
          "ui" as any,
          { unit: "percent" },
        );

        lastUpdateTimeRef.current = now;
      }

      performanceFrameRef.current = requestAnimationFrame(monitorPerformance);
    };

    performanceFrameRef.current = requestAnimationFrame(monitorPerformance);
  }, []);

  // Event handlers
  const handleAudioEnded = useCallback(() => {
    dispatch({ type: "SET_PLAYING", payload: false });

    // Handle repeat modes
    if (state.repeatMode === "one") {
      // Repeat current file
      seek(0).then(() => play());
    } else if (state.repeatMode === "all" || state.autoPlayNext) {
      // Go to next file or loop to beginning
      if (state.queueIndex < state.queue.length - 1) {
        nextFile();
      } else if (state.repeatMode === "all") {
        dispatch({
          type: "SET_QUEUE",
          payload: { files: state.queue, index: 0 },
        });
      }
    }
  }, [state.repeatMode, state.autoPlayNext, state.queue, state.queueIndex]);

  const handleAudioError = useCallback((event: Event) => {
    const audio = event.target as HTMLAudioElement;
    const error = audio.error;

    let playerError: PlayerError = {
      code: "UNKNOWN_ERROR",
      message: "Unknown audio error occurred",
      timestamp: new Date(),
      recoverable: true,
      suggestedAction: "Try refreshing the page or selecting a different file",
    };

    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          playerError = {
            code: "UNKNOWN_ERROR",
            message: "Audio playback was aborted",
            timestamp: new Date(),
            recoverable: true,
            suggestedAction: "Try playing again",
          };
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          playerError = {
            code: "NETWORK_ERROR",
            message: "Network error occurred while loading audio",
            timestamp: new Date(),
            recoverable: true,
            suggestedAction: "Check your internet connection and try again",
          };
          break;
        case MediaError.MEDIA_ERR_DECODE:
          playerError = {
            code: "DECODE_ERROR",
            message: "Audio file could not be decoded",
            timestamp: new Date(),
            recoverable: false,
            suggestedAction:
              "The audio file may be corrupted or in an unsupported format",
          };
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          playerError = {
            code: "PLAYBACK_ERROR",
            message: "Audio source is not supported",
            timestamp: new Date(),
            recoverable: false,
            suggestedAction: "Try a different audio format or source",
          };
          break;
      }
    }

    dispatch({ type: "SET_ERROR", payload: playerError });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    dispatch({
      type: "SET_TIME",
      payload: {
        currentTime: audio.currentTime,
        duration: audio.duration,
      },
    });

    // Update current segment and word based on time
    updateCurrentSegmentAndWord(audio.currentTime);

    // Handle loop points
    if (
      state.isLoopActive &&
      state.loopEnd &&
      audio.currentTime >= state.loopEnd
    ) {
      seek(state.loopStart);
    }
  }, [state.isLoopActive, state.loopEnd, state.loopStart]);

  const handleMetadataLoaded = useCallback(() => {
    if (!audioRef.current) return;

    dispatch({
      type: "SET_TIME",
      payload: {
        currentTime: 0,
        duration: audioRef.current.duration,
      },
    });
    dispatch({ type: "SET_LOADING", payload: false });
  }, []);

  const handleProgress = useCallback(() => {
    if (!audioRef.current) return;

    dispatch({
      type: "SET_BUFFERED_RANGES",
      payload: audioRef.current.buffered,
    });
  }, []);

  // Update current segment and word based on playback time
  const updateCurrentSegmentAndWord = useCallback(
    (currentTime: number) => {
      if (!state.currentAudio?.segments.length) return;

      const adjustedTime = currentTime + state.subtitleDelay / 1000;
      const segments = state.currentAudio.segments;

      // Find current segment
      let segmentIndex = -1;
      let wordIndex = -1;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (adjustedTime >= segment.start && adjustedTime <= segment.end) {
          segmentIndex = i;

          // Find current word within segment
          if (segment.wordTimestamps) {
            for (let j = 0; j < segment.wordTimestamps.length; j++) {
              const word = segment.wordTimestamps[j];
              if (adjustedTime >= word.start && adjustedTime <= word.end) {
                wordIndex = j;
                break;
              }
            }
          }
          break;
        }
      }

      if (segmentIndex !== state.currentSegmentIndex) {
        dispatch({ type: "SET_SEGMENT", payload: { segmentIndex, wordIndex } });

        // Auto-scroll subtitles if enabled
        if (subtitleAutoScroll && segmentIndex >= 0) {
          // Implementation would scroll the subtitle display
          scrollToSegment(segmentIndex);
        }
      } else if (wordIndex !== state.currentWordIndex && wordIndex >= 0) {
        dispatch({ type: "SET_SEGMENT", payload: { segmentIndex, wordIndex } });
      }
    },
    [
      state.currentAudio?.segments,
      state.subtitleDelay,
      state.currentSegmentIndex,
      state.currentWordIndex,
      subtitleAutoScroll,
    ],
  );

  // Scroll to segment implementation
  const scrollToSegment = useCallback((segmentIndex: number) => {
    // Implementation would scroll the subtitle display to show the current segment
    // This would integrate with your subtitle display component
  }, []);

  // Playback controls
  const play = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();

      if (enableHapticFeedback) {
        hapticFeedback.trigger("light");
      }

      performanceMonitor.recordMetric(
        "player-action-time",
        performance.now(),
        "ui" as any,
        { tags: { action: "play" }, unit: "ms" },
      );
    } catch (error) {
      const playerError: PlayerError = {
        code: "PLAYBACK_ERROR",
        message: "Failed to start playback",
        timestamp: new Date(),
        recoverable: true,
        suggestedAction: "Try again or check if audio is available",
        details: error,
      };

      dispatch({ type: "SET_ERROR", payload: playerError });
    }
  }, [enableHapticFeedback]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();

    if (enableHapticFeedback) {
      hapticFeedback.trigger("light");
    }
  }, [enableHapticFeedback]);

  const stop = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    dispatch({ type: "SET_PLAYING", payload: false });
  }, []);

  const seek = useCallback(
    async (time: number) => {
      if (!audioRef.current) return;

      const startTime = performance.now();

      try {
        dispatch({ type: "SET_SEEKING", payload: true });

        // Clamp time to valid range
        const clampedTime = Math.max(
          0,
          Math.min(time, audioRef.current.duration || 0),
        );
        audioRef.current.currentTime = clampedTime;

        // Wait for seek to complete
        await new Promise<void>((resolve) => {
          const checkSeek = () => {
            if (Math.abs(audioRef.current!.currentTime - clampedTime) < 0.1) {
              resolve();
            } else {
              setTimeout(checkSeek, 10);
            }
          };
          checkSeek();
        });

        const responseTime = performance.now() - startTime;
        performanceMonitor.recordMetric(
          "player-seek-time",
          responseTime,
          "ui" as any,
          { unit: "ms" },
        );

        if (enableHapticFeedback) {
          hapticFeedback.trigger("medium");
        }
      } finally {
        dispatch({ type: "SET_SEEKING", payload: false });
      }
    },
    [enableHapticFeedback],
  );

  const seekForward = useCallback(
    (seconds = 10) => {
      if (!audioRef.current) return;

      const newTime = Math.min(
        audioRef.current.currentTime + seconds,
        audioRef.current.duration || 0,
      );
      seek(newTime);
    },
    [seek],
  );

  const seekBackward = useCallback(
    (seconds = 10) => {
      if (!audioRef.current) return;

      const newTime = Math.max(0, audioRef.current.currentTime - seconds);
      seek(newTime);
    },
    [seek],
  );

  // Audio settings
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    dispatch({ type: "SET_VOLUME", payload: clampedVolume });
  }, []);

  const toggleMute = useCallback(() => {
    dispatch({ type: "TOGGLE_MUTE" });

    if (audioRef.current) {
      audioRef.current.muted = !state.isMuted;
    }

    if (enableHapticFeedback) {
      hapticFeedback.trigger("light");
    }
  }, [state.isMuted, enableHapticFeedback]);

  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.25, Math.min(4, rate));

    if (audioRef.current) {
      audioRef.current.playbackRate = clampedRate;
    }

    dispatch({ type: "SET_PLAYBACK_RATE", payload: clampedRate });
  }, []);

  // Segment navigation
  const nextSegment = useCallback(() => {
    if (!state.currentAudio?.segments.length) return;

    const nextIndex = state.currentSegmentIndex + 1;
    if (nextIndex < state.currentAudio.segments.length) {
      const segment = state.currentAudio.segments[nextIndex];
      seek(segment.start);
      dispatch({ type: "SET_SEGMENT", payload: { segmentIndex: nextIndex } });
    }
  }, [state.currentAudio?.segments, state.currentSegmentIndex, seek]);

  const previousSegment = useCallback(() => {
    if (!state.currentAudio?.segments.length) return;

    const prevIndex = state.currentSegmentIndex - 1;
    if (prevIndex >= 0) {
      const segment = state.currentAudio.segments[prevIndex];
      seek(segment.start);
      dispatch({ type: "SET_SEGMENT", payload: { segmentIndex: prevIndex } });
    }
  }, [state.currentAudio?.segments, state.currentSegmentIndex, seek]);

  const goToSegment = useCallback(
    (index: number) => {
      if (
        !state.currentAudio?.segments.length ||
        index < 0 ||
        index >= state.currentAudio.segments.length
      ) {
        return;
      }

      const segment = state.currentAudio.segments[index];
      seek(segment.start);
      dispatch({ type: "SET_SEGMENT", payload: { segmentIndex: index } });
    },
    [state.currentAudio?.segments, seek],
  );

  const nextWord = useCallback(() => {
    if (!state.currentAudio?.segments.length || !state.currentSegment) return;

    const segment = state.currentSegment;
    if (
      segment.wordTimestamps &&
      state.currentWordIndex < segment.wordTimestamps.length - 1
    ) {
      const nextWord = segment.wordTimestamps[state.currentWordIndex + 1];
      seek(nextWord.start);
      dispatch({
        type: "SET_SEGMENT",
        payload: {
          segmentIndex: state.currentSegmentIndex,
          wordIndex: state.currentWordIndex + 1,
        },
      });
    }
  }, [
    state.currentAudio?.segments,
    state.currentSegment,
    state.currentWordIndex,
    state.currentSegmentIndex,
    seek,
  ]);

  const previousWord = useCallback(() => {
    if (!state.currentAudio?.segments.length || !state.currentSegment) return;

    const segment = state.currentSegment;
    if (segment.wordTimestamps && state.currentWordIndex > 0) {
      const prevWord = segment.wordTimestamps[state.currentWordIndex - 1];
      seek(prevWord.start);
      dispatch({
        type: "SET_SEGMENT",
        payload: {
          segmentIndex: state.currentSegmentIndex,
          wordIndex: state.currentWordIndex - 1,
        },
      });
    }
  }, [
    state.currentAudio?.segments,
    state.currentSegment,
    state.currentWordIndex,
    state.currentSegmentIndex,
    seek,
  ]);

  // Subtitle controls
  const toggleSubtitles = useCallback(() => {
    dispatch({
      type: "SET_SUBTITLE_ENABLED",
      payload: !state.isSubtitleEnabled,
    });
  }, [state.isSubtitleEnabled]);

  const setSubtitleDelay = useCallback((delay: number) => {
    dispatch({ type: "SET_SUBTITLE_DELAY", payload: delay });
  }, []);

  // Loop and repeat
  const setLoop = useCallback((start?: number, end?: number) => {
    dispatch({ type: "SET_LOOP", payload: { start, end } });
  }, []);

  const clearLoop = useCallback(() => {
    dispatch({ type: "CLEAR_LOOP" });
  }, []);

  const setRepeatMode = useCallback((mode: "none" | "one" | "all") => {
    dispatch({ type: "SET_REPEAT_MODE", payload: mode });
  }, []);

  // Queue management
  const setQueue = useCallback((files: FileRow[], index = 0) => {
    dispatch({ type: "SET_QUEUE", payload: { files, index } });
  }, []);

  const nextFile = useCallback(async () => {
    if (state.queueIndex < state.queue.length - 1) {
      dispatch({ type: "NEXT_FILE" });
      // File loading would be handled by the useEffect that watches currentFile
    }
  }, [state.queue.length, state.queueIndex]);

  const previousFile = useCallback(async () => {
    if (state.queueIndex > 0) {
      dispatch({ type: "PREVIOUS_FILE" });
      // File loading would be handled by the useEffect that watches currentFile
    }
  }, [state.queueIndex]);

  const toggleAutoPlayNext = useCallback(() => {
    dispatch({ type: "TOGGLE_AUTO_PLAY_NEXT" });
  }, []);

  // History navigation
  const undo = useCallback(() => {
    if (state.historyIndex > 0) {
      const targetHistory = state.history[state.historyIndex - 1];
      dispatch({ type: "NAVIGATE_HISTORY", payload: state.historyIndex - 1 });
      // Would implement navigation to historical position
    }
  }, [state.history, state.historyIndex]);

  const redo = useCallback(() => {
    if (state.historyIndex < state.history.length - 1) {
      const targetHistory = state.history[state.historyIndex + 1];
      dispatch({ type: "NAVIGATE_HISTORY", payload: state.historyIndex + 1 });
      // Would implement navigation to historical position
    }
  }, [state.history, state.historyIndex]);

  // UI controls
  const toggleControls = useCallback(() => {
    dispatch({ type: "SET_CONTROLS_VISIBILITY", payload: !state.showControls });
  }, [state.showControls]);

  const toggleFullscreen = useCallback(() => {
    dispatch({ type: "TOGGLE_FULLSCREEN" });
    // Would implement fullscreen toggle
  }, []);

  const toggleAdvancedControls = useCallback(() => {
    dispatch({
      type: "SET_ADVANCED_CONTROLS",
      payload: !state.showAdvancedControls,
    });
  }, [state.showAdvancedControls]);

  const toggleMinimized = useCallback(() => {
    dispatch({ type: "SET_MINIMIZED", payload: !state.isMinimized });
  }, [state.isMinimized]);

  // Performance controls
  const setPerformanceMode = useCallback(
    (mode: "high-performance" | "balanced" | "battery-saver") => {
      dispatch({ type: "SET_PERFORMANCE_MODE", payload: mode });

      // Apply performance mode settings
      switch (mode) {
        case "high-performance":
          // Increase buffering, enable GPU acceleration
          break;
        case "balanced":
          // Default settings
          break;
        case "battery-saver":
          // Reduce buffering, disable animations
          break;
      }
    },
    [],
  );

  const toggleBatteryOptimization = useCallback(() => {
    dispatch({
      type: "SET_BATTERY_OPTIMIZATION",
      payload: !state.batteryOptimization,
    });
  }, [state.batteryOptimization]);

  // Mobile gesture handlers
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enableMobileOptimization) return;

      const touch = event.touches[0];
      dispatch({
        type: "SET_GESTURE_STATE",
        payload: {
          isDragging: true,
          dragStartX: touch.clientX,
          dragStartY: touch.clientY,
        },
      });
    },
    [enableMobileOptimization],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!enableMobileOptimization || !state.gestureState.isDragging) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - state.gestureState.dragStartX;
      const deltaY = touch.clientY - state.gestureState.dragStartY;

      // Handle seek gestures on horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && audioRef.current) {
        const seekTime =
          (deltaX / window.innerWidth) * audioRef.current.duration;
        seek(
          Math.max(
            0,
            Math.min(
              audioRef.current.currentTime + seekTime,
              audioRef.current.duration,
            ),
          ),
        );
      }
    },
    [
      enableMobileOptimization,
      state.gestureState.isDragging,
      state.gestureState.dragStartX,
      state.gestureState.dragStartY,
      seek,
    ],
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!enableMobileOptimization) return;

      dispatch({
        type: "SET_GESTURE_STATE",
        payload: {
          isDragging: false,
        },
      });

      // Trigger haptic feedback
      if (enableHapticFeedback) {
        hapticFeedback.trigger("light");
      }
    },
    [enableMobileOptimization, enableHapticFeedback],
  );

  // Utilities
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }, []);

  const getPerformanceMetrics = useCallback((): PlayerPerformanceMetrics => {
    const memoryUsage = performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
      : 0;

    const bufferHealth =
      audioRef.current && audioRef.current.buffered.length > 0
        ? Math.round(
            (audioRef.current.buffered.end(0) / audioRef.current.duration) *
              100,
          )
        : 0;

    return {
      responseTime: Date.now() - lastUpdateTimeRef.current,
      frameRate: 60, // Would be calculated from requestAnimationFrame timing
      memoryUsage,
      bufferHealth,
      networkLatency: mobileMetrics?.touchResponseTime || 0,
      batteryLevel: mobileMetrics?.batteryLevel || 1,
    };
  }, [mobileMetrics]);

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  const retry = useCallback(async () => {
    if (state.retryCount >= maxRetryAttempts) {
      const error: PlayerError = {
        code: "UNKNOWN_ERROR",
        message: "Maximum retry attempts exceeded",
        timestamp: new Date(),
        recoverable: false,
        suggestedAction:
          "Please try refreshing the page or selecting a different file",
      };
      dispatch({ type: "SET_ERROR", payload: error });
      return;
    }

    dispatch({ type: "RETRY" });

    if (currentFile) {
      await loadFile(currentFile);
    }
  }, [state.retryCount, maxRetryAttempts, currentFile]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET_STATE" });

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
  }, []);

  // Advanced features
  const exportState = useCallback((): string => {
    return JSON.stringify({
      playerState: state,
      timestamp: new Date().toISOString(),
    });
  }, [state]);

  const importState = useCallback((stateJson: string) => {
    try {
      const imported = JSON.parse(stateJson);
      // Would restore state from imported data
      dispatch({ type: "RESET_STATE" });
      // Apply imported state
    } catch (error) {
      console.error("Failed to import player state:", error);
    }
  }, []);

  const savePosition = useCallback(() => {
    if (!currentFile) return;

    dispatch({
      type: "ADD_TO_HISTORY",
      payload: {
        file: currentFile,
        position: state.currentTime,
      },
    });
  }, [currentFile, state.currentTime]);

  const loadPosition = useCallback(async () => {
    // Would load saved position from storage
  }, []);

  // Memory management functions
  const getMemoryStats = useCallback(() => {
    return state.memoryStats;
  }, [state.memoryStats]);

  const cleanupMemory = useCallback(() => {
    // Force garbage collection and cleanup
    audioBufferMemoryManager.forceGC();

    // Update memory stats
    const updatedStats = audioBufferMemoryManager.getMemoryStats();
    dispatch({
      type: "SET_MEMORY_STATS",
      payload: {
        usage: updatedStats.totalMemoryUsed,
        bufferCount: updatedStats.totalBuffers,
      },
    });

    // Clear streaming buffer if it exists
    if (state.streamingBuffer) {
      streamingAudioProcessor.clearStreamedBuffer(state.streamingBuffer.id);
      dispatch({ type: "SET_STREAMING_BUFFER", payload: undefined });
    }

    performanceMonitor.recordMetric("manual_memory_cleanup", 1, "memory_usage");
  }, [state.streamingBuffer]);

  const optimizeMemoryUsage = useCallback(() => {
    // Get current memory stats
    const currentStats = audioBufferMemoryManager.getMemoryStats();
    const usagePercentage =
      (currentStats.totalMemoryUsed / state.memoryStats.available) * 100;

    if (usagePercentage > 80) {
      // High memory usage - aggressive cleanup
      cleanupMemory();

      // Reduce performance mode
      dispatch({ type: "SET_PERFORMANCE_MODE", payload: "battery-saver" });

      // Clear streaming buffer
      if (state.streamingBuffer) {
        streamingAudioProcessor.clearStreamedBuffer(state.streamingBuffer.id);
        dispatch({ type: "SET_STREAMING_BUFFER", payload: undefined });
      }
    } else if (usagePercentage > 60) {
      // Medium memory usage - routine cleanup
      audioBufferMemoryManager.forceGC();

      // Update memory stats
      const updatedStats = audioBufferMemoryManager.getMemoryStats();
      dispatch({
        type: "SET_MEMORY_STATS",
        payload: {
          usage: updatedStats.totalMemoryUsed,
          bufferCount: updatedStats.totalBuffers,
        },
      });
    }

    performanceMonitor.recordMetric(
      "memory_optimization",
      usagePercentage,
      "memory_usage",
    );
  }, [state.memoryStats.available, state.streamingBuffer, cleanupMemory]);

  const toggleStreaming = useCallback(
    (enabled: boolean) => {
      dispatch({
        type: "SET_MEMORY_STATS",
        payload: { streamingEnabled: enabled },
      });

      if (!enabled && state.streamingBuffer) {
        // Clear existing streaming buffer
        streamingAudioProcessor.clearStreamedBuffer(state.streamingBuffer.id);
        dispatch({ type: "SET_STREAMING_BUFFER", payload: undefined });
      }

      performanceMonitor.recordMetric(
        "streaming_toggled",
        enabled ? 1 : 0,
        "memory_usage",
        {
          enabled: enabled.toString(),
        },
      );
    },
    [state.streamingBuffer],
  );

  // Load file implementation with memory management
  const loadFile = useCallback(
    async (file: FileRow) => {
      if (!audioRef.current) return;

      try {
        dispatch({ type: "SET_LOADING", payload: true });

        const audioFile = file.blob || new Blob();
        const fileSizeMB = audioFile.size / (1024 * 1024);

        // Determine if we need to use memory-optimized loading
        const useMemoryOptimization =
          fileSizeMB > 25 || // Large file
          state.memoryStats.pressureLevel === "high" ||
          state.memoryStats.pressureLevel === "critical";

        if (useMemoryOptimization) {
          await loadFileWithMemoryOptimization(file, audioFile);
        } else {
          await loadFileStandard(file, audioFile);
        }

        // Auto-play if requested
        if (autoPlay) {
          await play();
        }
      } catch (error) {
        const playerError: PlayerError = {
          code: "PLAYBACK_ERROR",
          message: "Failed to load audio file",
          timestamp: new Date(),
          recoverable: true,
          suggestedAction:
            "Try selecting a different file or refreshing the page",
          details: error,
        };

        dispatch({ type: "SET_ERROR", payload: playerError });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [autoPlay, play, state.memoryStats.pressureLevel],
  );

  // Standard file loading for smaller files
  const loadFileStandard = useCallback(
    async (file: FileRow, audioFile: Blob) => {
      // Create audio URL from file
      const audioUrl = URL.createObjectURL(audioFile);

      // Load audio
      audioRef.current!.src = audioUrl;
      await audioRef.current!.load();

      // Load transcription segments
      const segments = [] as Segment[]; // Would be fetched from database

      // Update current audio
      const currentAudio: AudioFile = {
        file,
        url: audioUrl,
        segments,
        duration: 0, // Will be set when metadata loads
      };

      dispatch({ type: "SET_CURRENT_AUDIO", payload: currentAudio } as any);
      dispatch({
        type: "SET_MEMORY_STATS",
        payload: { streamingEnabled: false },
      });
    },
    [],
  );

  // Memory-optimized file loading for large files
  const loadFileWithMemoryOptimization = useCallback(
    async (file: FileRow, audioFile: Blob) => {
      // Create memory-optimized chunking strategy
      const chunkingStrategy = createMemoryOptimizedChunkingStrategy(
        state.memoryStats.available,
        true, // Enable streaming
      );

      // Calculate memory-aware chunking
      const chunkingResult =
        await chunkingStrategy.calculateMemoryAwareChunking(audioFile as File);

      dispatch({ type: "SET_CHUNKING_RESULT", payload: chunkingResult });

      // Create streaming buffer if required
      if (chunkingResult.streamingInfo.requiresStreaming) {
        const streamedBuffer =
          await streamingAudioProcessor.createStreamedBuffer(
            `file-${file.id}`,
            audioFile as File,
            chunkingResult.chunks,
            StreamPriority.CURRENT_PLAYBACK,
          );

        dispatch({ type: "SET_STREAMING_BUFFER", payload: streamedBuffer });

        // Create initial audio URL for the first chunk
        if (chunkingResult.chunks.length > 0 && chunkingResult.chunks[0].blob) {
          const firstChunkUrl = URL.createObjectURL(
            chunkingResult.chunks[0].blob,
          );
          audioRef.current!.src = firstChunkUrl;
          await audioRef.current!.load();
        }

        // Update memory stats
        const streamingStats = streamingAudioProcessor.getStreamingStats();
        dispatch({
          type: "SET_MEMORY_STATS",
          payload: {
            streamingEnabled: true,
            bufferCount: streamingStats.activeStreams,
          },
        });
      } else {
        // Large file but doesn't require streaming - use standard loading with memory management
        await loadFileStandard(file, audioFile);
      }

      // Load transcription segments
      const segments = [] as Segment[]; // Would be fetched from database

      // Update current audio
      const currentAudio: AudioFile = {
        file,
        url: audioRef.current!.src,
        segments,
        duration: chunkingResult.totalDuration,
      };

      dispatch({ type: "SET_CURRENT_AUDIO", payload: currentAudio } as any);
    },
    [state.memoryStats.available, loadFileStandard],
  );

  return {
    // State
    state,
    currentFile: currentFile || null,
    currentAudio: null as AudioFile | null, // Would be set from loadFile

    // Playback controls
    play,
    pause,
    stop,
    seek,
    seekForward,
    seekBackward,

    // Audio settings
    setVolume,
    toggleMute,
    setPlaybackRate,

    // Segment navigation
    nextSegment,
    previousSegment,
    goToSegment,
    nextWord,
    previousWord,

    // Subtitle controls
    toggleSubtitles,
    setSubtitleDelay,

    // Loop and repeat
    setLoop,
    clearLoop,
    setRepeatMode,

    // Queue management
    setQueue,
    nextFile,
    previousFile,
    toggleAutoPlayNext,

    // History navigation
    undo,
    redo,

    // UI controls
    toggleControls,
    toggleFullscreen,
    toggleAdvancedControls,
    toggleMinimized,

    // Performance controls
    setPerformanceMode,
    toggleBatteryOptimization,

    // Mobile gestures
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Utilities
    formatTime,
    getPerformanceMetrics,
    clearError,
    retry,
    reset,

    // Advanced features
    exportState,
    importState,
    savePosition,
    loadPosition,

    // Memory management
    getMemoryStats,
    cleanupMemory,
    optimizeMemoryUsage,
    toggleStreaming,
  };
}

/**
 * Performance optimization utilities for the audio player
 */
export const playerPerformanceUtils = {
  /**
   * Create a debounced version of a function for performance optimization
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number,
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  /**
   * Create a throttled version of a function for smooth performance
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number,
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Memoize expensive calculations
   */
  memoize: <T extends (...args: any[]) => any>(
    func: T,
    getKey: (...args: Parameters<T>) => string,
  ): T => {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
      const key = getKey(...args);
      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  /**
   * Create a performance-optimized event listener
   */
  createOptimizedListener: (
    target: EventTarget,
    event: string,
    handler: EventListener,
    options: { passive?: boolean; throttleMs?: number } = {},
  ) => {
    const { passive = true, throttleMs = 16 } = options;

    const optimizedHandler =
      throttleMs > 0 ? performanceUtils.throttle(handler, throttleMs) : handler;

    target.addEventListener(event, optimizedHandler, { passive });

    return () => {
      target.removeEventListener(event, optimizedHandler);
    };
  },
};

/**
 * Default configuration for the audio player
 */
export const DEFAULT_AUDIO_PLAYER_CONFIG: UseAudioPlayerOptions = {
  autoPlay: false,
  initialVolume: 1,
  initialPlaybackRate: 1,
  enableMobileOptimization: true,
  enablePerformanceMonitoring: true,
  enableHapticFeedback: true,
  batteryOptimizationThreshold: 0.2,
  maxRetryAttempts: 3,
  segmentAutoAdvance: true,
  subtitleAutoScroll: true,
  networkQualityThreshold: { slow: 0.5, fast: 2 },
};

/**
 * Performance constants for the audio player
 */
export const PLAYER_PERFORMANCE_CONSTANTS = {
  MAX_RESPONSE_TIME: 200, // milliseconds
  BUFFER_HEALTH_THRESHOLD: 0.8, // 80%
  MEMORY_CLEANUP_INTERVAL: 30000, // 30 seconds
  PERFORMANCE_SAMPLE_RATE: 1000, // 1 second
  MAX_HISTORY_ENTRIES: 50,
  TOUCH_TARGET_MIN_SIZE: 44, // pixels (WCAG 2.1)
  GESTURE_THRESHOLD: 10, // pixels
  HAPTIC_FEEDBACK_DURATION: 100, // milliseconds
  NETWORK_QUALITY_CHECK_INTERVAL: 5000, // 5 seconds
};

export default useAudioPlayer;
