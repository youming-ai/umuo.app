"use client";

import { useTranscriptionStatus } from "@/hooks/useTranscription";
import type { FileRow } from "@/types/database";

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

  const getStatus = () => {
    if (isLoadingTranscript) {
      return { icon: "pending", color: "status-loading", text: "检查转录状态..." };
    }

    if (transcript) {
      switch (transcript.status) {
        case "completed":
          return { icon: "check_circle", color: "status-success", text: "转录完成" };
        case "processing":
          return { icon: "pending", color: "status-processing", text: "转录中..." };
        case "failed":
          return { icon: "error", color: "status-error", text: "转录失败" };
        default:
          return { icon: "audio_file", color: "status-ready", text: "就绪" };
      }
    }

    // 文件已上传，等待播放时转录
    return { icon: "audio_file", color: "status-ready", text: "点击播放开始转录" };
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
          <p className="text-sm text-[var(--text-muted)]">{status.text}</p>
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
