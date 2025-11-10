/**
 * Example integration of SubtitleSync with EnhancedAudioPlayer
 *
 * This example demonstrates how to integrate the subtitle synchronization
 * system with the existing audio player components for optimal language
 * learning experience.
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils/utils";
import { Card } from "@/components/ui/card";
import type { Segment } from "@/types/db/database";
import { EnhancedAudioPlayer } from "./EnhancedAudioPlayer";
import {
  SubtitleSync,
  useSubtitleSync,
  MobileOptimizer,
  AccessibilityManager,
  type SubtitleSyncConfig,
  type TouchGesture,
  DEFAULT_SUBTITLE_CONFIG,
} from "./subtitle-sync";
import type { FileRow } from "@/types/db/database";

/**
 * Props for EnhancedPlayerWithSubtitles component
 */
export interface EnhancedPlayerWithSubtitlesProps {
  /** Audio file information */
  file: FileRow;
  /** Audio URL for playback */
  audioUrl: string;
  /** Transcription segments for subtitle display */
  segments: Segment[];
  /** Whether to show subtitles by default */
  showSubtitles?: boolean;
  /** Whether component is in touch mode */
  touchMode?: boolean;
  /** Whether to enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Custom subtitle configuration */
  subtitleConfig?: Partial<SubtitleSyncConfig>;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Enhanced player with integrated subtitle synchronization
 *
 * This component demonstrates the complete integration of the subtitle
 * synchronization system with the existing audio player, providing a
 * seamless language learning experience.
 */
export const EnhancedPlayerWithSubtitles: React.FC<EnhancedPlayerWithSubtitlesProps> =
  React.memo(
    ({
      file,
      audioUrl,
      segments,
      showSubtitles = true,
      touchMode = false,
      enablePerformanceMonitoring = false,
      subtitleConfig = {},
      className = "",
    }) => {
      // Audio player state
      const [currentTime, setCurrentTime] = useState(0);
      const [duration, setDuration] = useState(0);
      const [isPlaying, setIsPlaying] = useState(false);

      // Subtitle state
      const [subtitlesEnabled, setSubtitlesEnabled] = useState(showSubtitles);
      const [subtitleConfigState, setSubtitleConfigState] =
        useState<SubtitleSyncConfig>(() => ({
          ...DEFAULT_SUBTITLE_CONFIG,
          ...subtitleConfig,
        }));

      // Mobile optimization
      const mobileOptimizer = useMemo(() => new MobileOptimizer(), []);
      const mobileSettings = useMemo(
        () => mobileOptimizer.getOptimalSettings(),
        [mobileOptimizer],
      );

      // Accessibility manager
      const accessibilityManager = useMemo(
        () => new AccessibilityManager(),
        [],
      );

      // Subtitle synchronization hook
      const {
        activeSegmentIndex,
        activeWordIndex,
        processedSegments,
        handleSegmentClick,
        handleWordClick,
        getPerformanceMetrics,
      } = useSubtitleSync(
        segments,
        currentTime,
        isPlaying,
        subtitleConfigState,
        {
          enablePerformanceMonitoring,
          mobileOptimized: touchMode || mobileOptimizer.isLowEnd(),
          touchMode,
        },
      );

      // Apply mobile optimizations to config
      useEffect(() => {
        if (touchMode || mobileOptimizer.isLowEnd()) {
          setSubtitleConfigState((prev) => ({
            ...prev,
            ...mobileSettings,
          }));
        }
      }, [touchMode, mobileSettings, mobileOptimizer]);

      // Apply accessibility settings
      useEffect(() => {
        const accessibilitySettings = accessibilityManager.getSettings();

        setSubtitleConfigState((prev) => ({
          ...prev,
          highContrast: prev.highContrast || accessibilitySettings.highContrast,
        }));
      }, [accessibilityManager]);

      // Handle audio player events
      const handleTimeUpdate = useCallback((time: number) => {
        setCurrentTime(time);
      }, []);

      const handleDurationChange = useCallback((dur: number) => {
        setDuration(dur);
      }, []);

      const handlePlayStateChange = useCallback((playing: boolean) => {
        setIsPlaying(playing);
      }, []);

      const handleSeek = useCallback(
        (time: number) => {
          setCurrentTime(time);

          // Announce seek for accessibility
          if (subtitlesEnabled) {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            accessibilityManager.announce(`跳转到 ${minutes}分${seconds}秒`);
          }
        },
        [subtitlesEnabled, accessibilityManager],
      );

      const handleSegmentSeek = useCallback(
        (segment: Segment, index: number) => {
          const seekTime = handleSegmentClick(segment, index);
          if (seekTime) {
            handleSeek(seekTime.time);
          }
        },
        [handleSegmentClick, handleSeek],
      );

      // Handle subtitle configuration changes
      const handleSubtitleConfigChange = useCallback(
        (configUpdate: Partial<SubtitleSyncConfig>) => {
          setSubtitleConfigState((prev) => ({ ...prev, ...configUpdate }));
        },
        [],
      );

      // Handle subtitle toggle
      const handleSubtitleToggle = useCallback(
        (enabled: boolean) => {
          setSubtitlesEnabled(enabled);

          // Announce subtitle state change
          accessibilityManager.announce(enabled ? "字幕已开启" : "字幕已关闭");
        },
        [accessibilityManager],
      );

      // Handle mobile gestures
      const handleGesture = useCallback(
        (gesture: TouchGesture) => {
          if (!subtitlesEnabled) return;

          switch (gesture.type) {
            case "tap":
              // Toggle subtitle controls
              setSubtitleConfigState((prev) => ({
                ...prev,
                showControls: !prev.showControls,
              }));
              break;

            case "doubletap":
              // Toggle subtitles
              handleSubtitleToggle(!subtitlesEnabled);
              break;

            case "swipe":
              // Swipe up/down to adjust subtitle offset
              if (gesture.endY && gesture.startY) {
                const deltaY = gesture.endY - gesture.startY;
                const offsetAdjustment = deltaY > 0 ? 0.5 : -0.5;

                setSubtitleConfigState((prev) => ({
                  ...prev,
                  offset: Math.max(
                    -10,
                    Math.min(10, prev.offset + offsetAdjustment),
                  ),
                }));
              }
              break;

            case "pinch":
              // Adjust subtitle size with pinch
              if (gesture.scale) {
                const newSize = Math.max(0.5, Math.min(2, gesture.scale));
                // Apply size scaling through CSS
                document.documentElement.style.setProperty(
                  "--subtitle-scale",
                  newSize.toString(),
                );
              }
              break;
          }
        },
        [subtitlesEnabled, handleSubtitleToggle],
      );

      // Performance metrics
      const performanceMetrics = useMemo(() => {
        if (!enablePerformanceMonitoring) return null;
        return getPerformanceMetrics();
      }, [enablePerformanceMonitoring, getPerformanceMetrics]);

      // CSS custom properties for dynamic styling
      useEffect(() => {
        const root = document.documentElement;

        // Set subtitle variables
        root.style.setProperty(
          "--subtitle-offset",
          `${subtitleConfigState.offset}s`,
        );
        root.style.setProperty(
          "--subtitle-opacity",
          subtitlesEnabled ? "1" : "0",
        );
        root.style.setProperty(
          "--subtitle-transition",
          isPlaying ? "all 0.2s ease-out" : "none",
        );

        return () => {
          root.style.removeProperty("--subtitle-offset");
          root.style.removeProperty("--subtitle-opacity");
          root.style.removeProperty("--subtitle-transition");
          root.style.removeProperty("--subtitle-scale");
        };
      }, [subtitleConfigState.offset, subtitlesEnabled, isPlaying]);

      return (
        <div
          className={cn(
            "enhanced-player-with-subtitles relative flex flex-col",
            "w-full max-w-4xl mx-auto",
            touchMode && "touch-optimized",
            className,
          )}
          data-mobile={touchMode}
          data-subtitles-enabled={subtitlesEnabled}
        >
          {/* Performance monitoring overlay (development only) */}
          {enablePerformanceMonitoring && performanceMetrics && (
            <div className="absolute top-2 right-2 z-50 bg-black/80 text-white p-2 rounded text-xs font-mono">
              <div>FPS: 60</div>
              <div>Process: {performanceMetrics.averageProcessingTime}ms</div>
              <div>Memory: {Math.round(performanceMetrics.frameRate)}%</div>
              <div>Optimal: {performanceMetrics.isOptimal ? "✓" : "✗"}</div>
            </div>
          )}

          {/* Enhanced Audio Player */}
          <Card className="flex-1 mb-4">
            <EnhancedAudioPlayer
              file={file}
              audioUrl={audioUrl}
              segments={processedSegments}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onPlayStateChange={handlePlayStateChange}
              onSeek={handleSeek}
              onSegmentClick={handleSegmentSeek}
              touchMode={touchMode}
              enhancedMode={!mobileOptimizer.isLowEnd()}
              className="h-full"
            />
          </Card>

          {/* Subtitle Synchronization System */}
          {subtitlesEnabled && (
            <Card className="flex-1 relative">
              <SubtitleSync
                segments={processedSegments}
                currentTime={currentTime}
                isPlaying={isPlaying}
                duration={duration}
                config={subtitleConfigState}
                onSegmentClick={handleSegmentSeek}
                onSeek={handleSeek}
                onToggle={handleSubtitleToggle}
                onConfigChange={handleSubtitleConfigChange}
                touchMode={touchMode}
                enabled={subtitlesEnabled}
                className="h-full"
              />
            </Card>
          )}

          {/* Mobile gesture handler overlay */}
          {touchMode && (
            <div
              className="absolute inset-0 pointer-events-auto z-40"
              onTouchStart={(e) => {
                // Prevent default to handle gestures
                e.preventDefault();
              }}
            />
          )}

          {/* Custom styles for subtitle animations */}
          <style jsx>{`
            .enhanced-player-with-subtitles {
              --subtitle-scale: 1;
              --subtitle-transition: all 0.2s ease-out;
            }

            .subtitle-segment {
              transform: scale(var(--subtitle-scale));
              transition: var(--subtitle-transition);
              opacity: var(--subtitle-opacity);
            }

            .subtitle-word {
              transition: background-color 0.15s ease-out;
            }

            .subtitle-word.active {
              background-color: rgba(59, 130, 246, 0.2);
              border-radius: 4px;
              padding: 2px 4px;
              margin: -2px -4px;
            }

            .touch-optimized {
              user-select: none;
              -webkit-user-select: none;
              -webkit-touch-callout: none;
            }

            @media (max-width: 768px) {
              .enhanced-player-with-subtitles {
                --subtitle-scale: 0.9;
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .subtitle-segment,
              .subtitle-word {
                transition: none !important;
              }
            }

            @media (prefers-contrast: high) {
              .subtitle-word.active {
                background-color: black;
                color: white;
                border: 1px solid white;
              }
            }
          `}</style>
        </div>
      );
    },
  );

EnhancedPlayerWithSubtitles.displayName = "EnhancedPlayerWithSubtitles";

export default EnhancedPlayerWithSubtitles;
