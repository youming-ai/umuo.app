"use client";

import { TranscriptionLoading } from "@/components/transcription/TranscriptionLoading";
import { useTranscriptionStatus } from "@/hooks/api/useTranscription";
import { useTranscriptionStatus as useTranscriptionTaskStatus } from "@/hooks/player/usePlayerData";
import type { FileRow } from "@/types/db/database";

interface FileCardProps {
  file: FileRow;
  onPlay: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  isPlaying?: boolean;
  isCurrentFile?: boolean;
}

export default function FileCard({
  file,
  onPlay,
  onDelete,
  isPlaying = false,
  isCurrentFile = false,
}: FileCardProps) {
  // 使用 TanStack Query 获取转录状态
  const { data: transcriptionData, isLoading: isLoadingTranscript } = useTranscriptionStatus(
    file.id ?? 0,
  );
  const transcript = transcriptionData?.transcript || null;

  // 获取转录任务用于新的loading UI
  const transcriptionTask = useTranscriptionTaskStatus(file.id ?? 0);

  const getFileId = () => {
    if (!file.id) {
      throw new Error("文件ID不存在");
    }
    return file.id.toString();
  };

  const handlePlay = () => {
    onPlay(getFileId());
  };

  const handleDelete = () => {
    onDelete(getFileId());
  };

  return (
    <div className="file-card flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* 音频文件图标 */}
        <span
          className={`material-symbols-outlined text-4xl ${
            transcript ? "status-success" : "status-ready"
          }`}
        >
          {transcript ? "check_circle" : "audio_file"}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-file-name break-words">{file.name}</p>

          {/* 简洁的转录状态显示 */}
          <div className="mt-1">
            {isLoadingTranscript ? (
              <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
                <div className="loading-spinner" />
                检查转录状态...
              </div>
            ) : transcriptionTask.task ? (
              <TranscriptionLoading
                task={transcriptionTask.task}
                compact={true}
                showMessage={true}
                className="text-sm"
              />
            ) : transcript ? (
              <div className="flex items-center gap-1 text-sm status-success">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                转录完成
              </div>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">点击播放开始转录</div>
            )}
          </div>
        </div>
      </div>

      <div className="file-card-actions">
        <button
          type="button"
          className="file-card-action file-card-action--delete"
          onClick={handleDelete}
          title="删除"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>

        <button
          type="button"
          className={`file-card-action file-card-action--play ${
            isPlaying && isCurrentFile ? "is-active" : ""
          }`}
          onClick={handlePlay}
          title="播放"
        >
          <span className="material-symbols-outlined text-3xl">
            {isPlaying && isCurrentFile ? "pause" : "play_arrow"}
          </span>
        </button>
      </div>
    </div>
  );
}
