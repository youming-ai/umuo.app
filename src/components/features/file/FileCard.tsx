/**
 * 文件卡片组件
 * 显示文件基本信息和转录状态，采用参考设计样式
 */

"use client";

import type { FileRow } from "@/types/db/database";
import { FileStatus } from "@/types/db/database";
import { useFileStatus } from "@/hooks/useFileStatus";

interface FileCardProps {
  file: FileRow;
  onPlay?: (fileId: number) => void;
  onDelete?: (fileId: number) => void;
  onTranscribe?: (fileId: number) => void;
  isTranscribing?: boolean;
}

export default function FileCard({
  file,
  onPlay,
  onDelete,
  onTranscribe,
  isTranscribing = false,
}: FileCardProps) {
  // 优雅地处理可能缺失的 file.id
  if (!file.id) {
    console.warn("FileCard: file.id is missing", file);
    return null;
  }

  // 使用统一的状态管理器获取真实状态
  const { data: statusData, isLoading: statusLoading } = useFileStatus(file.id);
  const realStatus = statusData?.status || FileStatus.UPLOADED;

  const getStatusDisplay = () => {
    const status = statusLoading ? FileStatus.UPLOADED : realStatus;

    switch (status) {
      case FileStatus.TRANSCRIBING:
        return {
          icon: "loading",
          color: "status-processing",
          label: "正在转录...",
          type: "音频",
        };
      case FileStatus.COMPLETED:
        return {
          icon: "check_circle",
          color: "status-success",
          label: "转录成功",
          type: "字幕",
        };
      case FileStatus.ERROR:
        return {
          icon: "warning",
          color: "status-warning",
          label: "转录失败",
          type: "音频",
        };
      default:
        return {
          icon: "schedule",
          color: "status-ready",
          label: "未转录",
          type: "音频",
        };
    }
  };

  const status = getStatusDisplay();

  const getActions = () => {
    const currentStatus = statusLoading ? FileStatus.UPLOADED : realStatus;

    switch (currentStatus) {
      case FileStatus.COMPLETED:
        return (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => file.id && onPlay?.(file.id)}
              aria-label="播放文件"
            >
              <span className="material-symbols-outlined">play_arrow</span>
            </button>
            <button
              type="button"
              className="btn-delete"
              onClick={() => file.id && onDelete?.(file.id)}
              aria-label="删除文件"
            >
              <span className="material-symbols-outlined text-2xl">delete</span>
            </button>
          </>
        );
      case FileStatus.TRANSCRIBING:
        return (
          <>
            <button
              type="button"
              className="btn-delete"
              onClick={() => file.id && onDelete?.(file.id)}
              aria-label="删除文件"
            >
              <span className="material-symbols-outlined text-2xl">delete</span>
            </button>
          </>
        );
      case FileStatus.ERROR:
        return (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => file.id && onTranscribe?.(file.id)}
              aria-label="重试转录"
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-[var(--primary-foreground)] border-t-transparent"></div>
              ) : (
                <span>重试</span>
              )}
            </button>
            <button
              type="button"
              className="btn-delete"
              onClick={() => file.id && onDelete?.(file.id)}
              aria-label="删除文件"
            >
              <span className="material-symbols-outlined text-2xl">delete</span>
            </button>
          </>
        );
      default:
        return (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => file.id && onTranscribe?.(file.id)}
              aria-label="开始转录"
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-[var(--primary-foreground)] border-t-transparent"></div>
              ) : (
                <span>转录</span>
              )}
            </button>
            <button
              type="button"
              className="btn-delete"
              onClick={() => file.id && onDelete?.(file.id)}
              aria-label="删除文件"
            >
              <span className="material-symbols-outlined text-2xl">delete</span>
            </button>
          </>
        );
    }
  };

  return (
    <div className="card-default p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className={`material-symbols-outlined text-4xl ${status.color}`}>
          {status.icon}
        </span>
        <div>
          <p className="text-file-name">{file.name}</p>
          <p className={`text-file-status ${status.color}`}>
            {status.type} · {status.label}
          </p>
        </div>
      </div>
      <div className="file-card-actions">{getActions()}</div>
    </div>
  );
}
