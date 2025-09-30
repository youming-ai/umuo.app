"use client";

import PlayerDrawerGestures from "@/components/player/PlayerDrawerGestures";
import type { AudioPlayerState, FileRow, Segment } from "@/types/database";

interface PlayerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFile?: FileRow | null;
  audioUrl?: string;
  segments: Segment[];
  audioPlayerState: AudioPlayerState;
  loopStart?: number;
  loopEnd?: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSetLoop: (start: number, end: number) => void;
  onClearLoop: () => void;
  clearAudio: () => void;
}

export default function PlayerDrawer(props: PlayerDrawerProps) {
  return <PlayerDrawerGestures {...props} />;
}
