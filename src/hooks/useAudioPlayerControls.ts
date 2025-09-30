import { useCallback } from "react";

export interface UseAudioPlayerControlsProps {
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onSetLoop?: (start: number, end: number) => void;
  onClearLoop?: () => void;
  currentTime: number;
  loopStart?: number;
}

export interface UseAudioPlayerControlsReturn {
  handlePlayPause: () => void;
  handleProgressChange: (value: number[]) => void;
  handleLoopToggle: () => void;
}

export function useAudioPlayerControls({
  onPlay,
  onPause,
  onSeek,
  onSetLoop,
  onClearLoop,
  currentTime,
  loopStart,
}: UseAudioPlayerControlsProps): UseAudioPlayerControlsReturn {
  const handlePlayPause = useCallback(() => {
    if (onPlay && onPause) {
      // This will be handled by the component's isPlaying state
    }
  }, [onPlay, onPause]);

  const handleProgressChange = useCallback(
    (value: number[]) => {
      onSeek?.(value[0]);
    },
    [onSeek],
  );

  const handleLoopToggle = useCallback(() => {
    if (loopStart === undefined) {
      onSetLoop?.(currentTime, currentTime + 10);
    } else {
      onClearLoop?.();
    }
  }, [loopStart, onSetLoop, onClearLoop, currentTime]);

  return {
    handlePlayPause,
    handleProgressChange,
    handleLoopToggle,
  };
}
