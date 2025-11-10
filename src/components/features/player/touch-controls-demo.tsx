/**
 * Touch Controls Demo Component
 *
 * This file demonstrates how to use the touch-optimized player controls
 * with various configurations and integration patterns.
 */

import React, { useState } from 'react';
import { EnhancedAudioPlayer, TouchControls, CompactTouchControls, MinimalTouchControls } from './index';
import type { FileRow } from '@/types/db/database';
import type { Segment } from '@/types/db/database';

// Sample data for demo
const sampleFile: FileRow = {
  id: 1,
  name: 'Sample Audio File.mp3',
  size: 1024000,
  type: 'audio/mpeg',
  createdAt: new Date(),
  updatedAt: new Date(),
  blob: null,
  metadata: {},
  status: 'completed'
};

const sampleSegments: Segment[] = [
  {
    id: 1,
    transcriptId: 1,
    start: 0,
    end: 5,
    text: 'こんにちは、今日はいい天気ですね。',
    normalizedText: 'こんにちは、今日はいい天気ですね。',
    translation: 'Hello, the weather is nice today.',
    furigana: 'こんにちは|きょうは|いい|てんき|です|ね',
    annotations: {}
  },
  {
    id: 2,
    transcriptId: 1,
    start: 5,
    end: 10,
    text: '日本語の勉強を続けましょう。',
    normalizedText: '日本語の勉強を続けましょう。',
    translation: "Let's continue studying Japanese.",
    furigana: 'にほんご|べんきょう|つづきましょう',
    annotations: {}
  }
];

/**
 * Demo component showing different touch control configurations
 */
export const TouchControlsDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(120); // 2 minutes
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioUrl] = useState('https://example.com/sample-audio.mp3');

  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const handlePlaybackRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
  };

  return (
    <div className="space-y-8 p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Touch Controls Demo</h1>

      {/* Full Featured Touch Controls */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Full Featured Touch Controls</h2>
        <TouchControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          playbackRate={playbackRate}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onPlaybackRateChange={handlePlaybackRateChange}
          onSkipBack={() => handleSeek(Math.max(0, currentTime - 10))}
          onSkipForward={() => handleSeek(Math.min(duration, currentTime + 10))}
          showVolumeControl={true}
          showPlaybackRateControl={true}
          skipAmount={10}
          playbackRates={[0.5, 0.75, 1, 1.25, 1.5, 2]}
          onSwipeLeft={() => console.log('Swipe left detected')}
          onSwipeRight={() => console.log('Swipe right detected')}
          onSwipeUp={() => console.log('Swipe up detected')}
          onSwipeDown={() => console.log('Swipe down detected')}
          onDoubleTap={() => console.log('Double tap detected')}
          onLongPress={() => console.log('Long press detected')}
          onPinch={(scale) => console.log('Pinch detected with scale:', scale)}
          className="mb-4"
        />
      </section>

      {/* Compact Touch Controls */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Compact Touch Controls</h2>
        <CompactTouchControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          playbackRate={playbackRate}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onPlaybackRateChange={handlePlaybackRateChange}
          onSkipBack={() => handleSeek(Math.max(0, currentTime - 10))}
          onSkipForward={() => handleSeek(Math.min(duration, currentTime + 10))}
          showVolumeControl={false}
          showPlaybackRateControl={false}
          className="mb-4"
        />
      </section>

      {/* Minimal Touch Controls */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Minimal Touch Controls</h2>
        <MinimalTouchControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          playbackRate={playbackRate}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onPlaybackRateChange={handlePlaybackRateChange}
          onSkipBack={() => handleSeek(Math.max(0, currentTime - 10))}
          onSkipForward={() => handleSeek(Math.min(duration, currentTime + 10))}
          className="mb-4"
        />
      </section>

      {/* Enhanced Audio Player with Touch Controls */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Enhanced Audio Player with Touch Controls</h2>
        <div className="space-y-4">
          {/* Mobile Touch Mode */}
          <div>
            <h3 className="text-lg font-medium mb-2">Mobile Touch Mode</h3>
            <EnhancedAudioPlayer
              file={sampleFile}
              audioUrl={audioUrl}
              segments={sampleSegments}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onPlayStateChange={handlePlayStateChange}
              onSeek={handleSeek}
              touchMode={true}
              enhancedMode={true}
              showVisualizer={true}
            />
          </div>

          {/* Force Touch Controls */}
          <div>
            <h3 className="text-lg font-medium mb-2">Force Touch Controls</h3>
            <EnhancedAudioPlayer
              file={sampleFile}
              audioUrl={audioUrl}
              segments={sampleSegments}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onPlayStateChange={handlePlayStateChange}
              onSeek={handleSeek}
              forceTouchControls={true}
              enhancedMode={true}
              showVisualizer={false}
            />
          </div>

          {/* Compact Touch Controls */}
          <div>
            <h3 className="text-lg font-medium mb-2">Compact Touch Controls</h3>
            <EnhancedAudioPlayer
              file={sampleFile}
              audioUrl={audioUrl}
              segments={sampleSegments}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onPlayStateChange={handlePlayStateChange}
              onSeek={handleSeek}
              forceTouchControls={true}
              compactTouchControls={true}
              enhancedMode={true}
              showVisualizer={false}
            />
          </div>
        </div>
      </section>

      {/* Usage Examples */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
        <div className="space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Basic Usage</h3>
            <pre className="text-sm overflow-x-auto">
{`import { TouchControls } from '@/components/features/player';

<TouchControls
  isPlaying={isPlaying}
  currentTime={currentTime}
  duration={duration}
  volume={volume}
  playbackRate={playbackRate}
  onPlayPause={handlePlayPause}
  onSeek={handleSeek}
  onVolumeChange={handleVolumeChange}
  onPlaybackRateChange={handlePlaybackRateChange}
/>`}
            </pre>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">With Gesture Support</h3>
            <pre className="text-sm overflow-x-auto">
{`<TouchControls
  // ... basic props
  onSwipeLeft={() => skipForward(10)}
  onSwipeRight={() => skipBackward(10)}
  onDoubleTap={() => togglePlayPause()}
  onLongPress={() => showSpeedControl()}
  onPinch={(scale) => adjustSubtitleSize(scale)}
/>`}
            </pre>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Enhanced Audio Player Integration</h3>
            <pre className="text-sm overflow-x-auto">
{`<EnhancedAudioPlayer
  file={file}
  audioUrl={audioUrl}
  segments={segments}
  touchMode={true}  // Auto-detect mobile
  forceTouchControls={true}  // Force touch controls
  compactTouchControls={false}  // Use full controls
  // ... other props
/>`}
            </pre>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-medium mb-2">🎯 Touch Optimized</h3>
            <ul className="text-sm space-y-1">
              <li>• Minimum 44px touch targets</li>
              <li>• Haptic feedback support</li>
              <li>• Prevents 300ms delay</li>
              <li>• Mobile-first design</li>
            </ul>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h3 className="font-medium mb-2">👆 Gesture Recognition</h3>
            <ul className="text-sm space-y-1">
              <li>• Swipe for seeking/skipping</li>
              <li>• Double-tap for play/pause</li>
              <li>• Long press for speed control</li>
              <li>• Pinch for zoom/size adjustment</li>
            </ul>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h3 className="font-medium mb-2">✨ Visual Feedback</h3>
            <ul className="text-sm space-y-1">
              <li>• Ripple effects</li>
              <li>• Smooth animations</li>
              <li>• Touch indicators</li>
              <li>• GPU acceleration</li>
            </ul>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <h3 className="font-medium mb-2">🔧 Configurable</h3>
            <ul className="text-sm space-y-1">
              <li>• Multiple control layouts</li>
              <li>• Customizable gestures</li>
              <li>• Flexible styling</li>
              <li>• Accessibility support</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Device Detection Info */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Device Detection</h2>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <p className="text-sm mb-2">
            The touch controls automatically detect device capabilities and optimize accordingly:
          </p>
          <ul className="text-sm space-y-1">
            <li>• <strong>Mobile:</strong> Full touch controls, haptic feedback, gesture support</li>
            <li>• <strong>Tablet:</strong> Enhanced touch targets, adapted gestures</li>
            <li>• <strong>Desktop:</strong> Hover states, keyboard shortcuts, optional touch mode</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default TouchControlsDemo;
