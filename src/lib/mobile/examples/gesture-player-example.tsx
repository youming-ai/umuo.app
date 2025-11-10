/**
 * Example component demonstrating advanced gesture detection integration
 * with the audio player for mobile devices
 */

import React, { useRef, useCallback } from 'react';
import { useGestureDetector, GestureType, createPlayerGestureConfig } from '../gesture-detector';
import { useHapticFeedback } from '../haptic-feedback';

interface GesturePlayerExampleProps {
  onPlayPause?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onSpeedChange?: (speed: number) => void;
  className?: string;
  children?: React.ReactNode;
}

export const GesturePlayerExample: React.FC<GesturePlayerExampleProps> = ({
  onPlayPause,
  onSeekForward,
  onSeekBackward,
  onVolumeUp,
  onVolumeDown,
  onSpeedChange,
  className = '',
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Handle gesture events
  const handleTap = useCallback((data: any) => {
    console.log('Tap gesture detected:', data);
    onPlayPause?.();
    triggerHaptic('selection');
  }, [onPlayPause, triggerHaptic]);

  const handleDoubleTap = useCallback((data: any) => {
    console.log('Double tap gesture detected:', data);
    // Double tap could toggle fullscreen or show controls
    triggerHaptic('medium');
  }, [triggerHaptic]);

  const handleSwipe = useCallback((data: any) => {
    console.log('Swipe gesture detected:', data.direction, data);

    switch (data.direction) {
      case 'left':
        onSeekForward?.();
        triggerHaptic('impact');
        break;
      case 'right':
        onSeekBackward?.();
        triggerHaptic('impact');
        break;
      case 'up':
        onVolumeUp?.();
        triggerHaptic('light');
        break;
      case 'down':
        onVolumeDown?.();
        triggerHaptic('light');
        break;
    }
  }, [onSeekForward, onSeekBackward, onVolumeUp, onVolumeDown, triggerHaptic]);

  const handlePinch = useCallback((data: any) => {
    console.log('Pinch gesture detected:', data.scale, data);

    // Pinch could control zoom or playback speed
    const speed = Math.max(0.25, Math.min(3.0, data.scale));
    onSpeedChange?.(speed);
    triggerHaptic('medium');
  }, [onSpeedChange, triggerHaptic]);

  const handleLongPress = useCallback((data: any) => {
    console.log('Long press gesture detected:', data);
    // Long press could show context menu or additional controls
    triggerHaptic('heavy');
  }, [triggerHaptic]);

  const handleDrag = useCallback((data: any) => {
    console.log('Drag gesture detected:', data.distance, data);
    // Drag could be used for seeking through the audio
    if (Math.abs(data.distance) > 50) {
      const seekDirection = data.direction === 'right' ? 1 : -1;
      const seekAmount = Math.abs(data.distance) / 100; // Convert to seconds

      if (seekDirection > 0) {
        onSeekForward?.();
      } else {
        onSeekBackward?.();
      }
    }
  }, [onSeekForward, onSeekBackward]);

  // Setup gesture detection
  const {
    bind,
    isGestureActive,
    getCurrentGestureType,
    getLastGestureData,
    getPerformanceMetrics
  } = useGestureDetector(
    createPlayerGestureConfig(),
    {
      onTap: handleTap,
      onDoubleTap: handleDoubleTap,
      onSwipe: handleSwipe,
      onPinch: handlePinch,
      onLongPress: handleLongPress,
      onDrag: handleDrag,
      onGestureStart: (type, data) => {
        console.log('Gesture started:', type, data);
      },
      onGestureEnd: (type, data) => {
        console.log('Gesture ended:', type, data);
      }
    }
  );

  // Bind gesture detector to container
  React.useEffect(() => {
    if (containerRef.current) {
      bind(containerRef.current);
    }
  }, [bind]);

  return (
    <div
      ref={containerRef}
      className={`gesture-player-container touch-manipulation ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {/* Visual feedback for active gestures */}
      {isGestureActive() && (
        <div className="gesture-feedback">
          <div className="gesture-type">
            {getCurrentGestureType()}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="gesture-content">
        {children}
      </div>

      {/* Gesture hint overlay (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="gesture-debug-overlay" style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: 8,
          borderRadius: 4,
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1000
        }}>
          <div>Active: {isGestureActive() ? 'Yes' : 'No'}</div>
          <div>Type: {getCurrentGestureType() || 'None'}</div>
          <div>Performance: {JSON.stringify(getPerformanceMetrics())}</div>
        </div>
      )}

      <style jsx>{`
        .gesture-feedback {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 100;
        }

        .gesture-type {
          background: rgba(59, 130, 246, 0.9);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .touch-manipulation {
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
};

/**
 * Hook for integrating gesture detection with audio player
 */
export const useGesturePlayerIntegration = () => {
  const { bind: bindGestures } = useGestureDetector(
    createPlayerGestureConfig(),
    {
      onTap: (data) => {
        console.log('Player tap detected - toggle play/pause');
      },
      onSwipe: (data) => {
        console.log('Player swipe detected:', data.direction);
      },
      onPinch: (data) => {
        console.log('Player pinch detected - scale:', data.scale);
      },
      onLongPress: (data) => {
        console.log('Player long press detected');
      }
    }
  );

  const bindPlayerGestures = useCallback((element: HTMLElement | null) => {
    if (element) {
      // Add touch-specific optimizations
      element.style.touchAction = 'manipulation';
      element.style.userSelect = 'none';
      element.style.webkitUserSelect = 'none';
      element.style.webkitTouchCallout = 'none';
      element.style.webkitTapHighlightColor = 'transparent';

      bindGestures(element);
    }
  }, [bindGestures]);

  return {
    bindPlayerGestures
  };
};

export default GesturePlayerExample;
