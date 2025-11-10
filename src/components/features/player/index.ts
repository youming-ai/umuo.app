/**
 * Enhanced Audio Player Components
 *
 * A comprehensive set of audio player components designed for:
 * - <200ms response time for all interactions
 * - Mobile-first responsive design
 * - Enhanced accessibility (WCAG 2.1)
 * - Integration with existing transcription system
 * - Performance optimization for large audio files
 *
 * Usage:
 * ```tsx
 * import { EnhancedAudioPlayer } from '@/components/features/player';
 *
 * <EnhancedAudioPlayer
 *   file={file}
 *   audioUrl={audioUrl}
 *   segments={segments}
 *   currentTime={currentTime}
 *   duration={duration}
 *   isPlaying={isPlaying}
 *   onPlayStateChange={setIsPlaying}
 *   onSeek={handleSeek}
 *   onSegmentClick={handleSegmentClick}
 *   enhancedMode={true}
 *   touchMode={isMobile}
 * />
 * ```
 */

// Main orchestrator component
export { default as EnhancedAudioPlayer } from "./EnhancedAudioPlayer";

// Layout and container components
export { default as PlayerContainer } from "./PlayerContainer";
export { default as ControlsContainer } from "./ControlsContainer";

// Feature components
export { default as AudioVisualizer } from "./AudioVisualizer";
export { default as EnhancedSubtitleDisplay } from "./SubtitleDisplay";
export { default as ProgressBar } from "./progress-bar";

// Subtitle synchronization system
export { default as EnhancedPlayerWithSubtitles } from "./EnhancedPlayerWithSubtitles";
export {
  SubtitleSync,
  SubtitleDisplay,
  SubtitleHighlight,
  SubtitleControls,
  useSubtitleSync,
  useMobileSubtitleOptimization,
  useSubtitleAccessibility,
  SubtitlePerformanceMonitor,
  MobileOptimizer,
  AccessibilityManager,
  mobileUtils,
  DEFAULT_SUBTITLE_CONFIG,
  DEFAULT_PERFORMANCE_THRESHOLDS,
  type SubtitleSyncProps,
  type SubtitleSyncConfig,
  type PerformanceMetrics,
  type PerformanceThresholds,
  type TouchGesture,
  type TouchConfig,
} from "./subtitle-sync";
export {
  TouchControls,
  CompactTouchControls,
  MinimalTouchControls,
} from "./touch-controls";
export {
  PlayButton,
  type PlayButtonProps,
  type PlayButtonRef,
  type PlayButtonSize,
  type PlayButtonVariant,
  type PlayButtonState,
} from "./play-button";
export { default as PlayButtonDemo } from "./play-button.demo";
export {
  VisualFeedbackProvider,
  useVisualFeedback,
  PlayFeedback,
  PauseFeedback,
  VolumeFeedback,
  SpeedFeedback,
  SeekFeedback,
  ErrorFeedback,
  SuccessFeedback,
  TouchFeedback,
  useFeedbackProps,
} from "./visual-feedback";

// Re-export types for external use
export type { default as EnhancedAudioPlayerProps } from "./EnhancedAudioPlayer";

// Component composition utilities
export const PlayerComponents = {
  EnhancedAudioPlayer,
  PlayerContainer,
  ControlsContainer,
  AudioVisualizer,
  EnhancedSubtitleDisplay,
  ProgressBar,
  TouchControls,
  CompactTouchControls,
  MinimalTouchControls,
  PlayButton,
  PlayButtonDemo,
  VisualFeedbackProvider,
} as const;

// Default export for convenience
export { PlayerComponents as default };

// Performance and utility exports
export const PERFORMANCE_TARGETS = {
  RESPONSE_TIME_MS: 200,
  ANIMATION_FPS: 30,
  DEBOUNCE_DELAY_MS: 150,
  SCROLL_THROTTLE_MS: 100,
} as const;

export const DEFAULT_CONFIG = {
  playbackSpeeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
  maxVisibleSegments: 5,
  autoScroll: true,
  visualizerEnabled: true,
  touchMode: false,
  enhancedMode: true,
  barCount: 32,
  smoothing: 0.8,
} as const;
