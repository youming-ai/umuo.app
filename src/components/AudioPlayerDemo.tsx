/**
 * Demo component showcasing the comprehensive audio player hook usage
 * This component demonstrates how to integrate all features of the enhanced audio player
 */

'use client';

import React, { useEffect } from 'react';
import { useAudioPlayer, DEFAULT_AUDIO_PLAYER_CONFIG } from '@/hooks/useAudioPlayer';
import { useAudioPlayerIntegration } from '@/hooks/useAudioPlayerIntegration';
import type { FileRow } from '@/types/db/database';

interface AudioPlayerDemoProps {
  fileId?: number;
  autoPlay?: boolean;
}

export function AudioPlayerDemo({ fileId, autoPlay = false }: AudioPlayerDemoProps) {
  // Initialize the comprehensive audio player with custom configuration
  const player = useAudioPlayer({
    fileId,
    autoPlay,
    enableMobileOptimization: true,
    enablePerformanceMonitoring: true,
    enableHapticFeedback: true,
    batteryOptimizationThreshold: 0.15,
    maxRetryAttempts: 5,
    segmentAutoAdvance: true,
    subtitleAutoScroll: true,
    networkQualityThreshold: { slow: 0.5, fast: 2 },
    ...DEFAULT_AUDIO_PLAYER_CONFIG,
  });

  // Integration with TanStack Query and database patterns
  const integration = useAudioPlayerIntegration(fileId);

  // Load saved state when component mounts
  useEffect(() => {
    const loadSavedState = async () => {
      const savedState = integration.loadState;
      if (savedState && fileId) {
        try {
          player.importState(JSON.stringify(savedState));

          // Load saved position
          if (player.currentFile) {
            const position = integration.loadState?.position;
            if (position && position > 0) {
              await player.seek(position);
            }
          }
        } catch (error) {
          console.error('Failed to load saved state:', error);
        }
      }
    };

    if (fileId) {
      loadSavedState();
    }
  }, [fileId, player, integration.loadState]);

  // Auto-save player state periodically
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      try {
        const currentState = player.exportState();
        await integration.saveState(currentState);

        // Save current position
        if (player.currentFile) {
          await integration.savePosition(player.state.currentTime);
        }
      } catch (error) {
        console.error('Failed to save player state:', error);
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [player, integration.saveState, integration.savePosition]);

  // Track playback events for analytics
  useEffect(() => {
    if (player.state.isPlaying) {
      integration.trackEvent({
        type: 'playback_started',
        data: {
          fileId,
          currentTime: player.state.currentTime,
          playbackRate: player.state.playbackRate,
          volume: player.state.volume,
        },
        timestamp: new Date(),
      });
    }
  }, [player.state.isPlaying, fileId, integration.trackEvent]);

  // Handle file errors
  const handlePlayerError = async () => {
    if (player.state.lastError) {
      await integration.trackEvent({
        type: 'player_error',
        data: {
          error: player.state.lastError,
          fileId,
          retryCount: player.state.retryCount,
        },
        timestamp: new Date(),
      });

      // Auto-retry if recoverable
      if (player.state.lastError.recoverable && player.state.retryCount < player.state.maxRetries) {
        setTimeout(() => {
          player.retry();
        }, 2000); // Wait 2 seconds before retry
      }
    }
  };

  useEffect(() => {
    handlePlayerError();
  }, [player.state.lastError]);

  // Performance monitoring
  useEffect(() => {
    const performanceCheck = setInterval(() => {
      const metrics = player.getPerformanceMetrics();

      integration.trackEvent({
        type: 'performance_metrics',
        data: {
          responseTime: metrics.responseTime,
          frameRate: metrics.frameRate,
          memoryUsage: metrics.memoryUsage,
          bufferHealth: metrics.bufferHealth,
          batteryLevel: metrics.batteryLevel,
        },
        timestamp: new Date(),
      });

      // Auto-adjust performance mode based on metrics
      if (metrics.responseTime > 300) {
        player.setPerformanceMode('battery-saver');
      } else if (metrics.responseTime < 100 && metrics.batteryLevel > 0.7) {
        player.setPerformanceMode('high-performance');
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(performanceCheck);
  }, [player, integration.trackEvent]);

  // Mobile gesture handlers
  const handlePlayerTouchStart = (e: React.TouchEvent) => {
    player.handleTouchStart(e.nativeEvent);
  };

  const handlePlayerTouchMove = (e: React.TouchEvent) => {
    player.handleTouchMove(e.nativeEvent);
  };

  const handlePlayerTouchEnd = (e: React.TouchEvent) => {
    player.handleTouchEnd(e.nativeEvent);
  };

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

  if (player.state.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading audio...</span>
      </div>
    );
  }

  if (!player.currentFile) {
    return (
      <div className="flex items-center justify-center p-8">
        <span>No audio file selected</span>
      </div>
    );
  }

  return (
    <div className="audio-player-demo max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Audio Player Demo</h2>
        <p className="text-muted-foreground">
          File: {player.currentFile.name}
        </p>
        <div className="flex gap-2 mt-2">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Performance: {player.state.performanceMode}
          </span>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            Battery: {formatPercentage(player.getPerformanceMetrics().batteryLevel)}
          </span>
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
            Buffer: {formatPercentage(player.getPerformanceMetrics().bufferHealth)}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {player.state.lastError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-800 font-medium">Error: {player.state.lastError.message}</p>
          <p className="text-red-600 text-sm">{player.state.lastError.suggestedAction}</p>
          <button
            onClick={player.retry}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry ({player.state.maxRetries - player.state.retryCount} attempts left)
          </button>
        </div>
      )}

      {/* Main Player Controls */}
      <div
        className="bg-card rounded-lg p-6 shadow-lg mb-4"
        onTouchStart={handlePlayerTouchStart}
        onTouchMove={handlePlayerTouchMove}
        onTouchEnd={handlePlayerTouchEnd}
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>{player.formatTime(player.state.currentTime)}</span>
            <span>{player.formatTime(player.state.duration)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-200"
              style={{ width: formatPercentage(player.state.currentTime / player.state.duration) }}
            />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={player.previousFile}
            disabled={player.state.queueIndex <= 0}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            ⏮️ Previous
          </button>

          <button
            onClick={player.seekBackward}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            ⏪ -10s
          </button>

          <button
            onClick={player.state.isPlaying ? player.pause : player.play}
            className="p-4 bg-primary text-white rounded-full hover:bg-primary/90"
          >
            {player.state.isPlaying ? '⏸️' : '▶️'}
          </button>

          <button
            onClick={player.seekForward}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            ⏩ +10s
          </button>

          <button
            onClick={player.nextFile}
            disabled={!player.state.nextFile}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            Next ⏭️
          </button>
        </div>

        {/* Audio Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button onClick={player.toggleMute}>
              {player.state.isMuted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={player.state.volume}
              onChange={(e) => player.setVolume(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm w-8">{Math.round(player.state.volume * 100)}%</span>
          </div>

          {/* Playback Speed */}
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <select
              value={player.state.playbackRate}
              onChange={(e) => player.setPlaybackRate(parseFloat(e.target.value))}
              className="flex-1 p-1 border rounded"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>

          {/* Repeat Mode */}
          <div className="flex items-center gap-2">
            <span>🔁</span>
            <select
              value={player.state.repeatMode}
              onChange={(e) => player.setRepeatMode(e.target.value as any)}
              className="flex-1 p-1 border rounded"
            >
              <option value="none">No Repeat</option>
              <option value="one">Repeat One</option>
              <option value="all">Repeat All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Segment Navigation */}
      {player.state.currentAudio?.segments.length > 0 && (
        <div className="bg-card rounded-lg p-4 shadow-lg mb-4">
          <h3 className="font-semibold mb-3">Segments</h3>
          <div className="flex gap-2 mb-3">
            <button
              onClick={player.previousSegment}
              disabled={player.state.currentSegmentIndex <= 0}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              ← Previous Segment
            </button>
            <button
              onClick={player.nextSegment}
              disabled={player.state.currentSegmentIndex >= player.state.currentAudio.segments.length - 1}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Next Segment →
            </button>
            <span className="flex items-center text-sm">
              {player.state.currentSegmentIndex + 1} / {player.state.currentAudio.segments.length}
            </span>
          </div>

          {/* Current Segment */}
          {player.state.currentSegment && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Segment {player.state.currentSegmentIndex + 1}</span>
                <span>
                  {player.formatTime(player.state.currentSegment.start)} - {player.formatTime(player.state.currentSegment.end)}
                </span>
              </div>
              <p className="text-sm">{player.state.currentSegment.text}</p>
              {player.state.currentSegment.translation && (
                <p className="text-sm text-gray-600 mt-1">Translation: {player.state.currentSegment.translation}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Performance Controls */}
      <div className="bg-card rounded-lg p-4 shadow-lg mb-4">
        <h3 className="font-semibold mb-3">Performance & Optimization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Performance Mode</label>
            <select
              value={player.state.performanceMode}
              onChange={(e) => player.setPerformanceMode(e.target.value as any)}
              className="w-full p-2 border rounded"
            >
              <option value="high-performance">High Performance</option>
              <option value="balanced">Balanced</option>
              <option value="battery-saver">Battery Saver</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="batteryOpt"
              checked={player.state.batteryOptimization}
              onChange={player.toggleBatteryOptimization}
              className="mr-2"
            />
            <label htmlFor="batteryOpt" className="text-sm">
              Battery Optimization
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="subtitles"
              checked={player.state.isSubtitleEnabled}
              onChange={player.toggleSubtitles}
              className="mr-2"
            />
            <label htmlFor="subtitles" className="text-sm">
              Enable Subtitles
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoPlayNext"
              checked={player.state.autoPlayNext}
              onChange={player.toggleAutoPlayNext}
              className="mr-2"
            />
            <label htmlFor="autoPlayNext" className="text-sm">
              Auto-play Next File
            </label>
          </div>
        </div>
      </div>

      {/* Mobile Features */}
      {typeof window !== 'undefined' && 'ontouchstart' in window && (
        <div className="bg-card rounded-lg p-4 shadow-lg mb-4">
          <h3 className="font-semibold mb-3">Mobile Features</h3>
          <div className="text-sm text-gray-600">
            <p>✅ Touch gestures enabled (swipe to seek)</p>
            <p>✅ Haptic feedback enabled</p>
            <p>✅ Battery optimization active</p>
            <p>✅ Touch targets optimized</p>
          </div>
        </div>
      )}

      {/* Debug Information */}
      <div className="bg-card rounded-lg p-4 shadow-lg">
        <h3 className="font-semibold mb-3">Debug Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <strong>State:</strong> {player.state.isPlaying ? 'Playing' : 'Paused'}
          </div>
          <div>
            <strong>Loading:</strong> {player.state.isLoading ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Buffering:</strong> {player.state.isBuffering ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Seeking:</strong> {player.state.isSeeking ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Response Time:</strong> {player.getPerformanceMetrics().responseTime.toFixed(2)}ms
          </div>
          <div>
            <strong>Memory Usage:</strong> {player.getPerformanceMetrics().memoryUsage}MB
          </div>
          <div>
            <strong>Buffer Health:</strong> {formatPercentage(player.getPerformanceMetrics().bufferHealth)}
          </div>
          <div>
            <strong>Network Quality:</strong> {player.state.networkQuality}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AudioPlayerDemo;
