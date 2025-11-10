"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils/utils";
import { Card } from "@/components/ui/card";
import type { Segment, FileRow, AudioPlayerState } from "@/types/db/database";
import { useAudioPlayer } from "@/hooks/ui/useAudioPlayer";
import { MobileDetector } from "@/types/mobile";
import { PlayerContainer } from "./PlayerContainer";
import { ControlsContainer } from "./ControlsContainer";
import { AudioVisualizer } from "./AudioVisualizer";
import { EnhancedSubtitleDisplay } from "./SubtitleDisplay";
import { TouchControls, CompactTouchControls } from "./touch-controls";
import { UltraProgressBar } from "./ultra-progress-bar";

interface EnhancedAudioPlayerProps {
  /** Audio file information */
  file: FileRow;
  /** Audio URL for playback */
  audioUrl: string;
  /** Transcription segments for subtitle display */
  segments: Segment[];
  /** Current playback position in seconds */
  currentTime?: number;
  /** Total duration in seconds */
  duration?: number;
  /** Whether audio is currently playing */
  isPlaying?: boolean;
  /** Callback when play state changes */
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** Callback when seeking occurs */
  onSeek?: (time: number) => void;
  /** Callback when segment is clicked */
  onSegmentClick?: (segment: Segment) => void;
  /** Custom CSS classes */
  className?: string;
  /** Whether to show visualizer */
  showVisualizer?: boolean;
  /** Whether to enable enhanced features */
  enhancedMode?: boolean;
  /** Playback rate options */
  playbackSpeeds?: number[];
  /** Touch-friendly mode for mobile */
  touchMode?: boolean;
  /** Force use of touch controls (overrides touchMode) */
  forceTouchControls?: boolean;
  /** Use compact touch controls */
  compactTouchControls?: boolean;
}

interface AudioVisualizerData {
  frequencyData: Uint8Array | null;
  isAnalyzing: boolean;
}

/**
 * Enhanced Audio Player with responsive controls and visual feedback
 * Designed for <200ms response time and mobile-first approach
 */
export const EnhancedAudioPlayer = React.memo<EnhancedAudioPlayerProps>(
  ({
    file,
    audioUrl,
    segments,
    currentTime = 0,
    duration = 0,
    isPlaying = false,
    onPlayStateChange,
    onSeek,
    onSegmentClick,
    className = "",
    showVisualizer = true,
    enhancedMode = true,
    playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2],
    touchMode = false,
    forceTouchControls = false,
    compactTouchControls = false,
  }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);

    // Mobile detection and touch controls
    const deviceDetector = MobileDetector.getInstance();
    const isMobileDevice = deviceDetector.isMobile() || forceTouchControls;
    const shouldUseTouchControls =
      isMobileDevice || touchMode || forceTouchControls;

    // Local state for visualizer and interactions
    const [visualizerData, setVisualizerData] = useState<AudioVisualizerData>({
      frequencyData: null,
      isAnalyzing: false,
    });
    const [showControls, setShowControls] = useState(true);
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [bufferedRanges, setBufferedRanges] = useState<
      Array<{ start: number; end: number }>
    >([]);
    const [isLoading, setIsLoading] = useState(false);

    // Audio player hook integration
    const {
      audioPlayerState,
      handleSeek: handleAudioSeek,
      onPlay,
      onPause,
      onSkipBack,
      onSkipForward,
      setPlaybackRate: setAudioPlaybackRate,
      updatePlayerState,
    } = useAudioPlayer();

    // Performance optimization: memoize calculated values
    const safeCurrentTime = useMemo(
      () => (Number.isFinite(currentTime) ? currentTime : 0),
      [currentTime],
    );

    const safeDuration = useMemo(
      () => (Number.isFinite(duration) && duration > 0 ? duration : 0),
      [duration],
    );

    const progress = useMemo(
      () =>
        safeDuration > 0
          ? Math.min(100, (safeCurrentTime / safeDuration) * 100)
          : 0,
      [safeCurrentTime, safeDuration],
    );

    const activeSegmentIndex = useMemo(() => {
      return segments.findIndex(
        (segment) =>
          safeCurrentTime >= segment.start && safeCurrentTime <= segment.end,
      );
    }, [segments, safeCurrentTime]);

    // Initialize audio context for visualizer
    const initializeVisualizer = useCallback(() => {
      if (!audioRef.current || !canvasRef.current || !showVisualizer) return;

      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audioRef.current);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        analyserRef.current = analyser;
        setVisualizerData({ frequencyData: null, isAnalyzing: true });

        return () => {
          source.disconnect();
          analyser.disconnect();
          audioContext.close();
        };
      } catch (error) {
        console.warn("Audio visualizer initialization failed:", error);
        setVisualizerData({ frequencyData: null, isAnalyzing: false });
      }
    }, [showVisualizer]);

    // Audio event handlers
    const handlePlay = useCallback(() => {
      onPlay();
      onPlayStateChange?.(true);
    }, [onPlay, onPlayStateChange]);

    const handlePause = useCallback(() => {
      onPause();
      onPlayStateChange?.(false);
    }, [onPause, onPlayStateChange]);

    const handleSeek = useCallback(
      (time: number) => {
        const safeTime = Math.max(0, Math.min(time, safeDuration));
        handleAudioSeek(safeTime);
        onSeek?.(safeTime);

        // Update audio element time
        if (audioRef.current) {
          audioRef.current.currentTime = safeTime;
        }
      },
      [handleAudioSeek, onSeek, safeDuration],
    );

    const handleSegmentClickInternal = useCallback(
      (segment: Segment) => {
        handleSeek(segment.start);
        onSegmentClick?.(segment);

        // Auto-play if not playing
        if (!isPlaying) {
          handlePlay();
        }
      },
      [handleSeek, onSegmentClick, isPlaying, handlePlay],
    );

    const handleVolumeChange = useCallback((newVolume: number) => {
      setVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
    }, []);

    const handleMuteToggle = useCallback(() => {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      if (audioRef.current) {
        audioRef.current.muted = newMuted;
      }
    }, [isMuted]);

    const handlePlaybackRateChange = useCallback(
      (rate: number) => {
        setPlaybackRate(rate);
        setAudioPlaybackRate(rate);
        if (audioRef.current) {
          audioRef.current.playbackRate = rate;
        }
      },
      [setAudioPlaybackRate],
    );

    // Update buffered ranges from audio element
    const updateBufferedRanges = useCallback(() => {
      if (!audioRef.current || !audioRef.current.buffered.length) {
        return;
      }

      const ranges: Array<{ start: number; end: number }> = [];
      const buffered = audioRef.current.buffered;

      for (let i = 0; i < buffered.length; i++) {
        ranges.push({
          start: buffered.start(i),
          end: buffered.end(i),
        });
      }

      setBufferedRanges(ranges);
    }, []);

    // Format time helper
    const formatTime = useCallback((time: number): string => {
      if (!Number.isFinite(time) || time < 0) return "00:00";
      const minutes = Math.floor(time / 60)
        .toString()
        .padStart(2, "0");
      const seconds = Math.floor(time % 60)
        .toString()
        .padStart(2, "0");
      return `${minutes}:${seconds}`;
    }, []);

    // Touch gestures for mobile
    const handleTouchStart = useCallback(() => {
      if (touchMode) {
        setShowControls(true);
      }
    }, [touchMode]);

    const handleTouchEnd = useCallback(() => {
      if (touchMode) {
        setTimeout(() => setShowControls(false), 3000);
      }
    }, [touchMode]);

    // Audio element effects
    useEffect(() => {
      if (!audioRef.current) return;

      // Sync with external state
      if (Math.abs(audioRef.current.currentTime - safeCurrentTime) > 0.1) {
        audioRef.current.currentTime = safeCurrentTime;
      }

      // Sync play/pause state
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          // Silently handle play failures (common in mobile browsers)
        });
      } else if (!isPlaying && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }, [isPlaying, safeCurrentTime]);

    // Initialize visualizer when audio loads
    useEffect(() => {
      if (audioUrl && showVisualizer) {
        const cleanup = initializeVisualizer();
        return cleanup;
      }
    }, [audioUrl, showVisualizer, initializeVisualizer]);

    // Update player state from props
    useEffect(() => {
      updatePlayerState({
        isPlaying,
        currentTime: safeCurrentTime,
        duration: safeDuration,
        volume,
        isMuted,
      });
    }, [
      isPlaying,
      safeCurrentTime,
      safeDuration,
      volume,
      isMuted,
      updatePlayerState,
    ]);

    // Auto-hide controls on touch devices
    useEffect(() => {
      if (touchMode && isPlaying) {
        const timer = setTimeout(() => setShowControls(false), 3000);
        return () => clearTimeout(timer);
      }
    }, [touchMode, isPlaying]);

    return (
      <Card
        className={cn(
          "enhanced-audio-player relative overflow-hidden border border-primary/20 bg-gradient-to-br from-background to-primary-light shadow-lg transition-all duration-200",
          touchMode && "touch-pan-y",
          className,
        )}
        role="region"
        aria-label={`Enhanced Audio Player: ${file.name}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          className="hidden"
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={() => {
            if (audioRef.current) {
              handleSeek(audioRef.current.currentTime);
              // Update buffered ranges
              updateBufferedRanges();
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              updatePlayerState({ duration: audioRef.current.duration });
            }
          }}
          onProgress={() => {
            updateBufferedRanges();
          }}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onLoadStart={() => setIsLoading(true)}
          onLoadedData={() => setIsLoading(false)}
        >
          <track kind="captions" srcLang="zh" label="中文字幕" default />
          <track kind="captions" srcLang="en" label="English subtitles" />
          您的浏览器不支持音频播放。
        </audio>

        {/* Visualizer canvas */}
        {showVisualizer && (
          <div className="absolute inset-0 opacity-30">
            <canvas
              ref={canvasRef}
              className="h-full w-full"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Main player container */}
        <PlayerContainer
          file={file}
          currentTime={safeCurrentTime}
          duration={safeDuration}
          progress={progress}
          formatTime={formatTime}
          showControls={showControls}
          touchMode={touchMode}
        >
          {/* Subtitle Display */}
          <EnhancedSubtitleDisplay
            segments={segments}
            currentTime={safeCurrentTime}
            isPlaying={isPlaying}
            activeSegmentIndex={activeSegmentIndex}
            onSegmentClick={handleSegmentClickInternal}
            enhancedMode={enhancedMode}
            touchMode={touchMode}
          />

          {/* Controls Container */}
          <ControlsContainer
            isPlaying={isPlaying}
            currentTime={safeCurrentTime}
            duration={safeDuration}
            progress={progress}
            volume={volume}
            isMuted={isMuted}
            playbackRate={playbackRate}
            playbackSpeeds={playbackSpeeds}
            showControls={showControls}
            touchMode={touchMode}
            enhancedMode={enhancedMode}
            formatTime={formatTime}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onSkipBack={onSkipBack}
            onSkipForward={onSkipForward}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={handleMuteToggle}
            onPlaybackRateChange={handlePlaybackRateChange}
            onToggleControls={() => setShowControls(!showControls)}
            segments={segments}
            bufferedRanges={bufferedRanges}
            isLoading={isLoading}
          />
        </PlayerContainer>

        {/* Visualizer component (overlay) */}
        {showVisualizer && (
          <AudioVisualizer
            audioRef={audioRef}
            canvasRef={canvasRef}
            analyserRef={analyserRef}
            isActive={isPlaying}
            className="absolute inset-0 pointer-events-none"
          />
        )}

        {/* Touch Controls Overlay */}
        {shouldUseTouchControls && (
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
            {compactTouchControls ? (
              <CompactTouchControls
                isPlaying={isPlaying}
                currentTime={safeCurrentTime}
                duration={safeDuration}
                volume={isMuted ? 0 : volume}
                playbackRate={playbackRate}
                onPlayPause={() => {
                  if (isPlaying) {
                    handlePause();
                  } else {
                    handlePlay();
                  }
                }}
                onSeek={handleSeek}
                onVolumeChange={(newVolume) => {
                  handleVolumeChange(newVolume);
                  setIsMuted(newVolume === 0);
                }}
                onPlaybackRateChange={handlePlaybackRateChange}
                onSkipBack={() => onSkipBack && onSkipBack(10)}
                onSkipForward={() => onSkipForward && onSkipForward(10)}
                showVolumeControl={!isMobileDevice}
                showPlaybackRateControl={!isMobileDevice}
                compact={true}
                className="bg-black/80 backdrop-blur-sm"
                onSwipeLeft={() => onSkipForward && onSkipForward(10)}
                onSwipeRight={() => onSkipBack && onSkipBack(10)}
                onDoubleTap={() => {
                  if (isPlaying) {
                    handlePause();
                  } else {
                    handlePlay();
                  }
                }}
                onLongPress={() => setShowControls(!showControls)}
              />
            ) : (
              <TouchControls
                isPlaying={isPlaying}
                currentTime={safeCurrentTime}
                duration={safeDuration}
                volume={isMuted ? 0 : volume}
                playbackRate={playbackRate}
                onPlayPause={() => {
                  if (isPlaying) {
                    handlePause();
                  } else {
                    handlePlay();
                  }
                }}
                onSeek={handleSeek}
                onVolumeChange={(newVolume) => {
                  handleVolumeChange(newVolume);
                  setIsMuted(newVolume === 0);
                }}
                onPlaybackRateChange={handlePlaybackRateChange}
                onSkipBack={() => onSkipBack && onSkipBack(10)}
                onSkipForward={() => onSkipForward && onSkipForward(10)}
                showVolumeControl={true}
                showPlaybackRateControl={true}
                compact={isMobileDevice}
                className="bg-black/80 backdrop-blur-sm"
                onSwipeLeft={() => onSkipForward && onSkipForward(10)}
                onSwipeRight={() => onSkipBack && onSkipBack(10)}
                onSwipeUp={() => setShowControls(true)}
                onSwipeDown={() => setShowControls(false)}
                onDoubleTap={() => {
                  if (isPlaying) {
                    handlePause();
                  } else {
                    handlePlay();
                  }
                }}
                onLongPress={() => setShowControls(!showControls)}
                onPinch={(scale) => {
                  // Implement subtitle size adjustment or zoom
                  console.log("Pinch gesture detected with scale:", scale);
                }}
              />
            )}
          </div>
        )}
      </Card>
    );
  },
);

EnhancedAudioPlayer.displayName = "EnhancedAudioPlayer";

export default EnhancedAudioPlayer;
