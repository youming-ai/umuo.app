"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  PlayerErrorState,
  PlayerLoadingState,
  PlayerMissingFileState,
  PlayerNoTranscriptState,
} from "@/components/player/page/PlayerFallbackStates";
import { PlayerFooter } from "@/components/player/page/PlayerFooter";
import { PlayerPageLayout } from "@/components/player/page/PlayerPageLayout";
import { PlayerStatusBanner } from "@/components/player/page/PlayerStatusBanner";
import ScrollableSubtitleDisplay from "@/components/player/ScrollableSubtitleDisplay";
import ApiKeyError from "@/components/ui/ApiKeyError";
import { usePlayerDataQuery } from "@/hooks/player/usePlayerDataQuery";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { isApiKeyError } from "@/lib/error-utils";
import type { Segment } from "@/types/database";

export default function PlayerPageComponent({ fileId }: { fileId: string }) {
  const router = useRouter();
  const {
    file,
    segments,
    transcript,
    audioUrl,
    loading,
    error,
    retry,
    isTranscribing,
    transcriptionProgress,
    startTranscription,
  } = usePlayerDataQuery(fileId);

  const {
    audioPlayerState,
    handleSeek,
    onPlay,
    onPause,
    clearAudio,
    setCurrentFile,
    updatePlayerState,
    playbackRate,
    setPlaybackRate,
    onSkipBack,
    onSkipForward,
    loopStart,
    loopEnd,
    onClearLoop,
  } = useAudioPlayer();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(1);
  const subtitleContainerId = useId();

  const sanitizeNumber = useCallback((value: number, fallback: number = 0): number => {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      return fallback;
    }
    return value;
  }, []);

  useEffect(() => {
    if (file && audioUrl) {
      setCurrentFile(file);
    }
  }, [file, audioUrl, setCurrentFile]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.pause();
    audio.currentTime = 0;
    audio.load();

    const fallbackDuration = file?.duration ?? 0;
    updatePlayerState({
      isPlaying: false,
      currentTime: 0,
      duration: sanitizeNumber(fallbackDuration, 0),
    });
  }, [audioUrl, file?.duration, updatePlayerState, sanitizeNumber]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (audioPlayerState.isPlaying) {
      audioRef.current.play().catch(() => {
        updatePlayerState({ isPlaying: false });
      });
    } else {
      audioRef.current.pause();
    }
  }, [audioPlayerState.isPlaying, updatePlayerState]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!audioRef.current) return;

    const currentTime = audioRef.current.currentTime;
    const diff = Math.abs(currentTime - audioPlayerState.currentTime);

    if (diff > 0.1) {
      audioRef.current.currentTime = audioPlayerState.currentTime;
    }
  }, [audioPlayerState.currentTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const current = sanitizeNumber(audio.currentTime, 0);
      updatePlayerState({ currentTime: current });
    };

    const handleLoadedMetadata = () => {
      const fallbackDuration = file?.duration ?? 0;
      const duration = sanitizeNumber(audio.duration, fallbackDuration);
      updatePlayerState({ duration });
    };

    const handleDurationChange = () => {
      const fallbackDuration = file?.duration ?? 0;
      const duration = sanitizeNumber(audio.duration, fallbackDuration);
      updatePlayerState({ duration });
    };

    const handleEnded = () => {
      const duration = sanitizeNumber(audio.duration, audioPlayerState.duration);
      updatePlayerState({ isPlaying: false, currentTime: duration });
      onClearLoop();
    };

    const handlePlay = () => {
      updatePlayerState({ isPlaying: true });
    };

    const handlePause = () => {
      updatePlayerState({ isPlaying: false });
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [updatePlayerState, sanitizeNumber, file?.duration, audioPlayerState.duration, onClearLoop]);

  const handleSegmentClick = (segment: Segment) => {
    handleSeek(segment.start);
    if (!audioPlayerState.isPlaying) {
      onPlay();
    }
  };

  const handleBack = useCallback(() => {
    clearAudio();
    router.push("/");
  }, [clearAudio, router]);

  const handleTogglePlay = useCallback(async () => {
    if (audioPlayerState.isPlaying) {
      onPause();
    } else {
      // 如果没有转录记录，开始转录
      if (!transcript && !isTranscribing && startTranscription) {
        await startTranscription();
      } else {
        onPlay();
      }
    }
  }, [audioPlayerState.isPlaying, onPause, onPlay, transcript, isTranscribing, startTranscription]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const layoutFooter = audioUrl ? (
    <PlayerFooter
      audioPlayerState={audioPlayerState}
      onSeek={handleSeek}
      onTogglePlay={handleTogglePlay}
      onSkipBack={onSkipBack}
      onSkipForward={onSkipForward}
      onClearLoop={onClearLoop}
      loopStart={loopStart}
      loopEnd={loopEnd}
      playbackRate={playbackRate}
      onPlaybackRateChange={setPlaybackRate}
      volume={volume}
      onVolumeChange={handleVolumeChange}
    />
  ) : null;

  if (loading) {
    return (
      <PlayerPageLayout subtitleContainerId={subtitleContainerId}>
        <PlayerLoadingState />
      </PlayerPageLayout>
    );
  }

  if (error) {
    // 检查是否为API密钥错误
    if (isApiKeyError(error)) {
      return <ApiKeyError onRetry={retry} />;
    }

    return (
      <PlayerPageLayout subtitleContainerId={subtitleContainerId}>
        <PlayerErrorState message={error} onRetry={retry} onBack={handleBack} />
      </PlayerPageLayout>
    );
  }

  if (!file) {
    return (
      <PlayerPageLayout subtitleContainerId={subtitleContainerId}>
        <PlayerMissingFileState onBack={handleBack} />
      </PlayerPageLayout>
    );
  }

  return (
    <>
      <PlayerPageLayout
        subtitleContainerId={subtitleContainerId}
        showFooter={Boolean(layoutFooter)}
        footer={layoutFooter ?? undefined}
      >
        <PlayerStatusBanner
          transcript={transcript}
          isTranscribing={isTranscribing}
          transcriptionProgress={transcriptionProgress}
        />

        {segments.length > 0 ? (
          <ScrollableSubtitleDisplay
            segments={segments}
            currentTime={audioPlayerState.currentTime}
            isPlaying={audioPlayerState.isPlaying}
            onSegmentClick={handleSegmentClick}
          />
        ) : (
          transcript?.status === "completed" && (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-[var(--secondary-text-color)] dark:text-[var(--text-color)]/70">
              <p>暂无字幕内容</p>
            </div>
          )
        )}

        {!transcript && (
          <PlayerNoTranscriptState onBack={handleBack} onStartTranscription={startTranscription} />
        )}
      </PlayerPageLayout>

      <audio ref={audioRef} src={audioUrl ?? undefined} preload="auto" className="hidden">
        <track kind="captions" />
      </audio>
    </>
  );
}
