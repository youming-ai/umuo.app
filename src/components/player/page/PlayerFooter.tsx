import { useMemo, useState } from "react";
import type { AudioPlayerState } from "@/types/database";

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
  const [showVolumeControl, setShowVolumeControl] = useState(false);

  const progressWidth = useMemo(() => {
    const { currentTime, duration } = audioPlayerState;
    if (!duration) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [audioPlayerState]);

  const hasLoop = loopStart !== undefined && loopEnd !== undefined;
  const loopLabel = hasLoop ? `${formatTime(loopStart ?? 0)} – ${formatTime(loopEnd ?? 0)}` : null;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[var(--background-color)] via-[var(--background-color)] to-transparent">
      <div className="mx-auto max-w-4xl p-4 pt-12">
        <div className="player-card flex flex-col gap-4 p-4 !rounded-2xl">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-[var(--text-color)]/70">
              {formatTime(audioPlayerState.currentTime)}
            </p>
            <div className="group relative h-2 flex-1">
              <div className="h-full rounded-full bg-[var(--border-muted)]">
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-[var(--primary-color)]"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={audioPlayerState.duration || 100}
                value={audioPlayerState.currentTime}
                onChange={(event) => onSeek(parseFloat(event.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4"
              />
              <div
                className="pointer-events-none absolute top-1/2 -ml-2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[var(--surface-card)] bg-[var(--primary-color)] shadow"
                style={{ left: `${progressWidth}%` }}
              />
            </div>
            <p className="text-xs font-medium text-[var(--text-color)]/70">
              {formatTime(audioPlayerState.duration || 0)}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex w-1/3 items-center gap-2">
              <div className="group relative">
                <button
                  type="button"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[var(--text-color)]/70 transition-colors hover:bg-[var(--primary-color)]/10"
                  onMouseEnter={() => setShowVolumeControl(true)}
                  onMouseLeave={() => setShowVolumeControl(false)}
                >
                  <span className="material-symbols-outlined text-3xl">volume_up</span>
                </button>
                <div
                  className={`player-card absolute bottom-16 left-1/2 w-8 -translate-x-1/2 rounded-full bg-[var(--card-background)] p-2 shadow-lg ${showVolumeControl ? "block" : "hidden"}`}
                  style={{ height: "120px" }}
                >
                  <div className="relative h-full w-full">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(event) => onVolumeChange(parseFloat(event.target.value))}
                      className="h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary-color)]"
                      style={{ writingMode: "vertical-lr" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-1/3 items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onSkipBack?.()}
                disabled={!onSkipBack}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[var(--text-color)]/70 transition-colors hover:bg-[var(--primary-color)]/10 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="后退10秒"
              >
                <span className="material-symbols-outlined text-3xl">replay_10</span>
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--primary-color)] text-white shadow-md"
                aria-label={audioPlayerState.isPlaying ? "暂停" : "播放"}
              >
                <span className="material-symbols-outlined text-4xl">
                  {audioPlayerState.isPlaying ? "pause" : "play_arrow"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSkipForward?.()}
                disabled={!onSkipForward}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[var(--text-color)]/70 transition-colors hover:bg-[var(--primary-color)]/10 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="前进10秒"
              >
                <span className="material-symbols-outlined text-3xl">forward_10</span>
              </button>
              <button
                type="button"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--state-error-text)] text-white shadow-md transition-colors hover:bg-[var(--state-error-strong)]"
              >
                <span className="material-symbols-outlined text-3xl">mic</span>
              </button>
            </div>

            <div className="flex w-1/3 items-center justify-end gap-3">
              {hasLoop ? (
                <div className="flex flex-col items-end gap-1 text-right text-xs text-[var(--text-color)]/70">
                  {loopLabel ? <span>{loopLabel}</span> : null}
                  <button
                    type="button"
                    onClick={() => onClearLoop?.()}
                    disabled={!onClearLoop}
                    className="rounded-full border border-[var(--border-muted)] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--text-color)]/80 transition-colors hover:bg-[var(--state-info-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background-color)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    清除循环
                  </button>
                </div>
              ) : null}
              <div className="group relative">
                <button
                  type="button"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[var(--text-color)]/70 transition-colors hover:bg-[var(--primary-color)]/10"
                  onMouseEnter={() => setShowSpeedMenu(true)}
                  onMouseLeave={() => setShowSpeedMenu(false)}
                >
                  <span className="material-symbols-outlined text-3xl">speed</span>
                </button>
                <div
                  className={`player-card absolute bottom-14 right-0 w-32 flex-col gap-1 rounded-lg bg-[var(--card-background)] p-2 text-sm shadow-lg ${showSpeedMenu ? "flex" : "hidden"}`}
                >
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      type="button"
                      key={speed}
                      onClick={() => {
                        onPlaybackRateChange(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`rounded-md px-3 py-1.5 text-left transition-colors ${
                        playbackRate === speed
                          ? "bg-[var(--primary-color)]/10 text-[var(--primary-color)]"
                          : "text-[var(--text-color)]/80 hover:bg-[var(--primary-color)]/10"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
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
