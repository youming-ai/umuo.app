import { useCallback, useEffect, useState } from "react";
import type { AudioPlayerState, FileRow } from "@/types/db/database";

export interface UseAudioPlayerReturn {
  audioPlayerState: AudioPlayerState;
  loopStart?: number;
  loopEnd?: number;
  currentFile?: FileRow | null;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  setCurrentFile: (file: FileRow | null) => void;
  setLoopPoints: (start?: number, end?: number) => void;
  updatePlayerState: (updates: Partial<AudioPlayerState>) => void;
  handleSeek: (time: number) => void;
  clearAudio: () => void;
  onPlay: () => void;
  onPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSetLoop: (start: number, end: number) => void;
  onClearLoop: () => void;
}

/**
 * Custom hook for managing audio player state and controls
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const [audioPlayerState, setAudioPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
  });

  const [loopStart, setLoopStart] = useState<number>();
  const [loopEnd, setLoopEnd] = useState<number>();
  const [currentFile, setCurrentFile] = useState<FileRow | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const sanitizeTime = useCallback((value: number): number => {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      return 0;
    }
    return Math.max(0, value);
  }, []);

  const sanitizeDuration = useCallback((value: number, fallback: number): number => {
    if (!Number.isFinite(value) || Number.isNaN(value) || value < 0) {
      return Math.max(0, fallback);
    }
    return value;
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      setAudioPlayerState((prev) => {
        const safeDuration =
          Number.isFinite(prev.duration) && prev.duration > 0 ? prev.duration : undefined;
        const safeTime = sanitizeTime(time);
        const clampedTime =
          safeDuration !== undefined ? Math.min(safeTime, safeDuration) : safeTime;

        if (clampedTime === prev.currentTime) {
          return prev;
        }

        return { ...prev, currentTime: clampedTime };
      });
    },
    [sanitizeTime],
  );

  // Handle loop playback
  useEffect(() => {
    if (
      loopStart !== undefined &&
      loopEnd !== undefined &&
      audioPlayerState.isPlaying &&
      audioPlayerState.currentTime >= loopEnd
    ) {
      handleSeek(loopStart);
    }
  }, [audioPlayerState.currentTime, audioPlayerState.isPlaying, loopStart, loopEnd, handleSeek]);

  const setLoopPoints = useCallback((start?: number, end?: number) => {
    setLoopStart(start);
    setLoopEnd(end);
  }, []);

  const updatePlayerState = useCallback(
    (updates: Partial<AudioPlayerState>) => {
      setAudioPlayerState((prev) => {
        const next: AudioPlayerState = { ...prev, ...updates };

        const normalizedDuration =
          updates.duration !== undefined
            ? sanitizeDuration(updates.duration, prev.duration)
            : prev.duration;

        let normalizedTime =
          updates.currentTime !== undefined ? sanitizeTime(updates.currentTime) : next.currentTime;

        const effectiveDuration =
          Number.isFinite(normalizedDuration) && normalizedDuration > 0
            ? normalizedDuration
            : undefined;
        if (effectiveDuration !== undefined) {
          normalizedTime = Math.min(normalizedTime, effectiveDuration);
        }

        return {
          ...next,
          duration: effectiveDuration ?? 0,
          currentTime: normalizedTime,
        };
      });
    },
    [sanitizeDuration, sanitizeTime],
  );

  const clearAudio = useCallback(() => {
    setCurrentFile(null);
    setLoopStart(undefined);
    setLoopEnd(undefined);
    setAudioPlayerState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
    });
  }, []);

  const onPlay = useCallback(() => {
    updatePlayerState({ isPlaying: true });
  }, [updatePlayerState]);

  const onPause = useCallback(() => {
    updatePlayerState({ isPlaying: false });
  }, [updatePlayerState]);

  const onSkipBack = useCallback(() => {
    handleSeek(Math.max(0, audioPlayerState.currentTime - 10));
  }, [handleSeek, audioPlayerState.currentTime]);

  const onSkipForward = useCallback(() => {
    handleSeek(Math.min(audioPlayerState.duration, audioPlayerState.currentTime + 10));
  }, [handleSeek, audioPlayerState.currentTime, audioPlayerState.duration]);

  const onSetLoop = useCallback(
    (start: number, end: number) => {
      setLoopPoints(start, end);
    },
    [setLoopPoints],
  );

  const onClearLoop = useCallback(() => {
    setLoopPoints(undefined, undefined);
  }, [setLoopPoints]);

  const handleSetPlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
  }, []);

  return {
    audioPlayerState,
    loopStart,
    loopEnd,
    currentFile,
    playbackRate,
    setPlaybackRate: handleSetPlaybackRate,
    setCurrentFile,
    setLoopPoints,
    updatePlayerState,
    handleSeek,
    clearAudio,
    onPlay,
    onPause,
    onSkipBack,
    onSkipForward,
    onSetLoop,
    onClearLoop,
  };
}
