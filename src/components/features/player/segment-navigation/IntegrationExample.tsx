"use client";

import React, { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { SegmentNavigation } from "./SegmentNavigation";
import type { Segment, FileRow } from "@/types/db/database";
import { useAudioPlayer } from "@/hooks/ui/useAudioPlayer";

export interface IntegrationExampleProps {
  /** Audio file information */
  file: FileRow;
  /** Audio URL for playback */
  audioUrl: string;
  /** All transcription segments */
  segments: Segment[];
  /** Whether to enable segment navigation */
  enableNavigation?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Integration mode */
  integrationMode?: "sidebar" | "overlay" | "replace";
}

/**
 * Integration example showing how to use SegmentNavigation
 * with existing audio player components
 */
export const IntegrationExample = React.memo<IntegrationExampleProps>(({
  file,
  audioUrl,
  segments,
  enableNavigation = true,
  className = "",
  integrationMode = "sidebar",
}) => {
  // Use existing audio player hook
  const {
    audioPlayerState,
    handleSeek,
    onPlay,
    onPause,
    clearAudio,
    playbackRate,
    setPlaybackRate,
    onSkipBack,
    onSkipForward,
  } = useAudioPlayer();

  // Handle play/pause toggle
  const handlePlayPause = useCallback((isPlaying: boolean) => {
    if (isPlaying) {
      onPlay();
    } else {
      onPause();
    }
  }, [onPlay, onPause]);

  // Handle segment seeking
  const handleSegmentSeek = useCallback((time: number) => {
    handleSeek(time);

    // Auto-play if not currently playing
    if (!audioPlayerState.isPlaying) {
      onPlay();
    }
  }, [handleSeek, audioPlayerState.isPlaying, onPlay]);

  // Handle segment navigation-specific seeking
  const handleNavigationSeek = useCallback((time: number) => {
    handleSeek(time);
  }, [handleSeek]);

  // Integration styles based on mode
  const integrationStyles = useMemo(() => {
    switch (integrationMode) {
      case "sidebar":
        return "flex gap-4";
      case "overlay":
        return "relative";
      case "replace":
        return "";
      default:
        return "";
    }
  }, [integrationMode]);

  if (!enableNavigation || segments.length === 0) {
    return null;
  }

  return (
    <div className={integrationStyles}>
      {integrationMode === "sidebar" && (
        <>
          {/* Main player area - your existing player components */}
          <div className="flex-1">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Audio Player</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your existing audio player components go here
              </p>

              {/* Example integration points */}
              <div className="space-y-2 text-xs">
                <p>Current time: {audioPlayerState.currentTime.toFixed(2)}s</p>
                <p>Duration: {audioPlayerState.duration.toFixed(2)}s</p>
                <p>Playing: {audioPlayerState.isPlaying ? "Yes" : "No"}</p>
                <p>Playback rate: {playbackRate}x</p>
              </div>
            </Card>
          </div>

          {/* Segment navigation sidebar */}
          <div className="w-96 flex-shrink-0">
            <SegmentNavigation
              segments={segments}
              currentTime={audioPlayerState.currentTime}
              isPlaying={audioPlayerState.isPlaying}
              onSeek={handleNavigationSeek}
              onPlayPause={handlePlayPause}
              className="h-full"
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
          </div>
        </>
      )}

      {integrationMode === "overlay" && (
        <div className="relative">
          {/* Main player area */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Audio Player with Overlay Navigation</h3>

            {/* Your existing player components */}
            <div className="min-h-[200px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg mb-4">
              <p className="text-muted-foreground">Player content area</p>
            </div>

            {/* Overlay segment navigation */}
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <SegmentNavigation
                segments={segments}
                currentTime={audioPlayerState.currentTime}
                isPlaying={audioPlayerState.isPlaying}
                onSeek={handleNavigationSeek}
                onPlayPause={handlePlayPause}
                className="border-t bg-background/95 backdrop-blur-sm"
                showBookmarks={true}
                showHistory={false}
                showWordNavigation={false}
                autoAdvance={true}
                loopSegment={false}
                mobileMode={false}
                maxVisibleSegments={10}
                showTimestamps={true}
                showDurations={false}
              />
            </div>
          </Card>
        </div>
      )}

      {integrationMode === "replace" && (
        <div className="w-full">
          <SegmentNavigation
            segments={segments}
            currentTime={audioPlayerState.currentTime}
            isPlaying={audioPlayerState.isPlaying}
            onSeek={handleNavigationSeek}
            onPlayPause={handlePlayPause}
            className="w-full"
            showBookmarks={true}
            showHistory={true}
            showWordNavigation={true}
            autoAdvance={true}
            loopSegment={false}
            mobileMode={false}
            maxVisibleSegments={100}
            showTimestamps={true}
            showDurations={true}
          />
        </div>
      )}
    </div>
  );
});

IntegrationExample.displayName = "IntegrationExample";

export default IntegrationExample;
