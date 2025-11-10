/**
 * Gesture-enabled audio player controls
 * Demonstrates integration of the comprehensive gesture detection system
 */

import React, { useRef, useEffect } from 'react';
import { useGestureDetector, createPlayerGestureConfig, GestureType, GestureData } from '@/lib/mobile/gesture-detector';
import { usePlayerDataQuery } from '@/hooks/player/usePlayerDataQuery';

interface GestureControlsProps {
  fileId: number;
  children: React.ReactNode;
  className?: string;
}

export const GestureControls: React.FC<GestureControlsProps> = ({
  fileId,
  children,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { playerData } = usePlayerDataQuery(fileId);

  const gestureHandlers = {
    // Swipe controls for navigation
    onSwipe: (data: GestureData) => {
      if (!playerData?.audioFile) return;

      switch (data.direction) {
        case 'left':
          // Skip to next segment or next file
          handleNextSegment();
          break;
        case 'right':
          // Skip to previous segment or previous file
          handlePreviousSegment();
          break;
        case 'up':
          // Increase volume
          handleVolumeUp();
          break;
        case 'down':
          // Decrease volume
          handleVolumeDown();
          break;
      }
    },

    // Tap for play/pause
    onTap: (data: GestureData) => {
      if (!playerData?.audioFile) return;
      handlePlayPause();
    },

    // Double tap for seek to beginning
    onDoubleTap: (data: GestureData) => {
      if (!playerData?.audioFile) return;
      handleSeekToBeginning();
    },

    // Long press for context menu
    onLongPress: (data: GestureData) => {
      if (!playerData?.audioFile) return;
      handleContextMenu(data);
    },

    // Pinch for zooming subtitles or waveform
    onPinch: (data: GestureData) => {
      if (!playerData?.audioFile) return;
      handleZoom(data.scale);
    },

    // Two-finger tap for fullscreen toggle
    onTwoFingerTap: (data: GestureData) => {
      if (!playerData?.audioFile) return;
      handleFullscreenToggle();
    },

    // Circle gesture for repeat toggle
    onCircle: (data: GestureData) => {
      if (!playerData?.audioFile) return;
      handleRepeatToggle();
    }
  };

  const { bind } = useGestureDetector(
    createPlayerGestureConfig(),
    gestureHandlers
  );

  // Player control handlers
  const handlePlayPause = () => {
    // Toggle play/pause
    console.log('Toggle play/pause');
    // Implementation would integrate with your audio player state
  };

  const handleNextSegment = () => {
    console.log('Next segment');
    // Implementation would advance to next subtitle segment
  };

  const handlePreviousSegment = () => {
    console.log('Previous segment');
    // Implementation would go to previous subtitle segment
  };

  const handleVolumeUp = () => {
    console.log('Volume up');
    // Implementation would increase volume
  };

  const handleVolumeDown = () => {
    console.log('Volume down');
    // Implementation would decrease volume
  };

  const handleSeekToBeginning = () => {
    console.log('Seek to beginning');
    // Implementation would seek to start of audio
  };

  const handleContextMenu = (data: GestureData) => {
    console.log('Context menu at position:', data.centerPoint);
    // Implementation would show context menu at touch position
  };

  const handleZoom = (scale: number) => {
    console.log('Zoom scale:', scale);
    // Implementation would zoom subtitles or waveform
  };

  const handleFullscreenToggle = () => {
    console.log('Toggle fullscreen');
    // Implementation would toggle fullscreen mode
  };

  const handleRepeatToggle = () => {
    console.log('Toggle repeat');
    // Implementation would toggle repeat mode
  };

  // Bind gesture detector to container
  useEffect(() => {
    if (containerRef.current) {
      bind(containerRef.current);
    }
  }, [bind]);

  return (
    <div
      ref={containerRef}
      className={`gesture-enabled-container touch-none select-none ${className}`}
      role="application"
      aria-label="Audio player with gesture controls"
      tabIndex={0}
    >
      {children}

      {/* Gesture hints overlay */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
        <div className="bg-black bg-opacity-50 text-white text-xs p-2 rounded-lg">
          <div className="font-semibold mb-1">Gestures:</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>• Tap: Play/Pause</div>
            <div>• Double Tap: Restart</div>
            <div>• Swipe Left/Right: Skip</div>
            <div>• Swipe Up/Down: Volume</div>
            <div>• Pinch: Zoom</div>
            <div>• Long Press: Menu</div>
            <div>• Two Finger Tap: Fullscreen</div>
            <div>• Circle: Repeat</div>
          </div>
        </div>
      </div>

      {/* Accessibility hint */}
      <div className="sr-only">
        Audio player with gesture controls.
        Single tap to play or pause.
        Double tap to restart playback.
        Swipe left or right to skip between segments.
        Swipe up or down to adjust volume.
        Pinch to zoom subtitles or waveform.
        Long press to open context menu.
        Two finger tap to toggle fullscreen.
        Draw a circle to toggle repeat mode.
        Keyboard users can use arrow keys for navigation and spacebar for play/pause.
      </div>
    </div>
  );
};

export default GestureControls;
