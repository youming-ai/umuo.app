"use client";

import type { TranscriptionProgress } from "@/lib/transcription-service";
import type { FileRow, TranscriptRow } from "@/types/database";

interface FileCardProps {
  file: FileRow;
  transcript?: TranscriptRow;
  transcriptionProgress?: TranscriptionProgress;
  onPlay: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onRetry: (fileId: string) => void;
  isPlaying?: boolean;
  isCurrentFile?: boolean;
}

export default function FileCard({
  file,
  transcript,
  transcriptionProgress,
  onPlay,
  onDelete,
  onRetry,
  isPlaying = false,
  isCurrentFile = false,
}: FileCardProps) {
  const getStatus = () => {
    if (!transcript) {
      return { icon: "hourglass_empty", color: "status-processing" };
    }

    switch (transcript.status) {
      case "completed":
        return { icon: "check_circle", color: "status-success" };
      case "processing":
        return { icon: "pending", color: "status-processing" };
      case "failed":
        return { icon: "warning", color: "status-warning" };
      case "pending":
        return { icon: "hourglass_empty", color: "status-processing" };
      default:
        return { icon: "help", color: "text-[var(--text-muted)]" };
    }
  };

  const status = getStatus();

  const getFileId = () => {
    if (!file.id) {
      throw new Error("文件ID不存在");
    }
    return file.id.toString();
  };

  const handlePlay = () => {
    onPlay(getFileId());
  };

  const handleRetry = () => {
    onRetry(getFileId());
  };

  const handleDelete = () => {
    onDelete(getFileId());
  };

  return (
    <div className="file-card flex items-center justify-between">
      <div className="flex items-center gap-4">
        {status.icon === "pending" ? (
          <div className="loading-spinner" />
        ) : (
          <span className={`material-symbols-outlined text-4xl ${status.color}`}>
            {status.icon}
          </span>
        )}

        <div>
          <p className="text-file-name break-words">{file.name}</p>
          {(transcriptionProgress?.status === "processing" ||
            transcriptionProgress?.status === "pending") && (
            <div className="mt-2 flex items-center gap-2 text-sm text-[var(--player-accent-color)]">
              <span className="material-symbols-outlined animate-spin text-base">
                progress_activity
              </span>
              <span>
                {transcriptionProgress.status === "processing" ? "正在转录..." : "排队中"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="file-card-actions">
        {(transcript?.status === "failed" || transcript?.status === "pending") && (
          <button
            type="button"
            className="file-card-action file-card-action--retry"
            onClick={handleRetry}
            title={transcript.status === "pending" ? "开始转录" : "重试"}
          >
            <span className="material-symbols-outlined">
              {transcript.status === "pending" ? "play_arrow" : "replay"}
            </span>
          </button>
        )}

        {transcript?.status === "completed" && (
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
        )}

        <button
          type="button"
          className="file-card-action file-card-action--delete"
          onClick={handleDelete}
          title="删除"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  );
}
