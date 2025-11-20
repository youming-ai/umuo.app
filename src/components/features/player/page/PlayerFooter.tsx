import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioPlayerState } from "@/types/db/database";

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.5];

interface PlayerFooterProps {
  audioPlayerState: AudioPlayerState;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onClearLoop?: () => void;
  loopStart?: number;
  loopEnd?: number;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function PlayerFooter({
  audioPlayerState,
  onSeek,
  onTogglePlay,
  onSkipBack,
  onSkipForward,
  onClearLoop,
  loopStart,
  loopEnd,
  playbackRate,
  onPlaybackRateChange,
  volume,
  onVolumeChange,
}: PlayerFooterProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const progressWidth = useMemo(() => {
    const { currentTime, duration } = audioPlayerState;
    if (!duration) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [audioPlayerState]);

  const hasLoop = loopStart !== undefined && loopEnd !== undefined;
  const loopLabel = hasLoop ? `${formatTime(loopStart ?? 0)} – ${formatTime(loopEnd ?? 0)}` : null;
  const volumePercentage = Math.round(volume * 100);

  useEffect(() => {
    if (!showSpeedMenu) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!speedMenuRef.current) return;
      if (!speedMenuRef.current.contains(event.target as Node)) {
        setShowSpeedMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSpeedMenu]);

  const controlButtonClass =
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--border-muted)] bg-[var(--surface-muted)]/30 text-[var(--text-color)]/80 transition-colors hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-[var(--border-muted)] bg-[var(--background-color)]/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-[var(--text-color)]/70">
          <span className="min-w-[3rem] text-xs font-mono tabular-nums">
            {formatTime(audioPlayerState.currentTime)}
          </span>
          <div className="relative flex-1">
            <div className="h-1.5 w-full rounded-full bg-[var(--border-muted)]/70" />
            <div
              className="absolute left-0 top-0 h-1.5 rounded-full bg-[var(--primary-color)]"
              style={{ width: `${progressWidth}%` }}
            />
            <input
              type="range"
              min={0}
              max={audioPlayerState.duration || 100}
              value={audioPlayerState.currentTime}
              onChange={(event) => onSeek(parseFloat(event.target.value))}
              className="absolute inset-0 h-1.5 w-full cursor-pointer appearance-none rounded-full opacity-0 focus-visible:opacity-100 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4"
              aria-label="播放进度"
            />
            <div
              className="pointer-events-none absolute top-1/2 -ml-2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[var(--surface-card)] bg-[var(--primary-color)] shadow"
              style={{ left: `${progressWidth}%` }}
            />
          </div>
          <span className="min-w-[3rem] text-right text-xs font-mono tabular-nums">
            {formatTime(audioPlayerState.duration || 0)}
          </span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={() => onSkipBack?.()}
              disabled={!onSkipBack}
              className={controlButtonClass}
              aria-label="后退10秒"
            >
              <span className="material-symbols-outlined text-2xl">replay_10</span>
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-color)] px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              aria-label={audioPlayerState.isPlaying ? "暂停" : "播放"}
            >
              <span className="material-symbols-outlined text-3xl">
                {audioPlayerState.isPlaying ? "pause" : "play_arrow"}
              </span>
              <span>{audioPlayerState.isPlaying ? "暂停" : "播放"}</span>
            </button>
            <button
              type="button"
              onClick={() => onSkipForward?.()}
              disabled={!onSkipForward}
              className={controlButtonClass}
              aria-label="前进10秒"
            >
              <span className="material-symbols-outlined text-2xl">forward_10</span>
            </button>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-center gap-3 text-xs text-[var(--text-color)]/80 sm:justify-end">
            <label className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">volume_up</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => onVolumeChange(parseFloat(event.target.value))}
                className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-[var(--border-muted)] accent-[var(--primary-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary-color)]"
                aria-label="音量"
              />
              <span className="w-10 text-right font-mono tabular-nums">{volumePercentage}%</span>
            </label>

            <div ref={speedMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-muted)] px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition-colors hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]"
                aria-haspopup="true"
                aria-expanded={showSpeedMenu}
              >
                <span>倍速 {formatPlaybackRate(playbackRate)}x</span>
                <span className="material-symbols-outlined text-base">expand_more</span>
              </button>
              {showSpeedMenu ? (
                <div className="player-card absolute right-0 top-full z-20 mt-2 flex w-32 flex-col gap-1 rounded-xl bg-[var(--card-background)] p-3">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      type="button"
                      key={speed}
                      onClick={() => {
                        onPlaybackRateChange(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-left text-[0.8rem] transition-colors ${
                        playbackRate === speed
                          ? "bg-[var(--primary-color)]/15 text-[var(--primary-color)]"
                          : "text-[var(--text-color)]/80 hover:bg-[var(--primary-color)]/10"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {hasLoop ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-muted)] px-3 py-1 text-[0.7rem]">
                <span className="font-semibold uppercase tracking-[0.3em] text-[var(--text-color)]/60">
                  Loop
                </span>
                {loopLabel ? <span className="text-[var(--text-color)]">{loopLabel}</span> : null}
                <button
                  type="button"
                  onClick={() => onClearLoop?.()}
                  disabled={!onClearLoop}
                  className="rounded-full p-1 text-[var(--text-color)]/60 transition hover:text-[var(--primary-color)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="清除循环"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            ) : null}

            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--state-error-text)] px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--state-error-text)] transition-colors hover:bg-[var(--state-error-text)] hover:text-white"
            >
              <span className="material-symbols-outlined text-base">mic</span>
              <span>转写</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function formatPlaybackRate(rate: number): string {
  const normalized = Number(rate.toFixed(2));
  return normalized.toString().replace(/\.0+$/, "");
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}
