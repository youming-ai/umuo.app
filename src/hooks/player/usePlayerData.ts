import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import type { FileRow, Segment, TranscriptRow } from "@/types/database";

interface PlayerData {
  file: FileRow | null;
  segments: Segment[];
  transcript: TranscriptRow | null;
  audioUrl: string | null;
  loading: boolean;
  error: string | null;
}

export function usePlayerData(fileId: string) {
  const [data, setData] = useState<PlayerData>({
    file: null,
    segments: [],
    transcript: null,
    audioUrl: null,
    loading: true,
    error: null,
  });

  // 使用 ref 来跟踪最新的 audioUrl 用于清理
  const audioUrlRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      // 清理之前的音频URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      // 解析文件ID
      const parsedFileId = parseInt(fileId, 10);
      if (Number.isNaN(parsedFileId)) {
        throw new Error("无效的文件ID");
      }

      // 获取文件信息
      const file = await db.files.get(parsedFileId);
      if (!file) {
        throw new Error("文件不存在");
      }

      // 获取转录记录
      if (typeof file.id !== "number") {
        throw new Error("文件缺少有效的ID");
      }

      const transcripts = await db.transcripts.where("fileId").equals(file.id).toArray();

      const transcript = transcripts.length > 0 ? transcripts[0] : null;

      // 获取字幕段
      let segments: Segment[] = [];
      if (transcript && typeof transcript.id === "number") {
        segments = await db.segments.where("transcriptId").equals(transcript.id).toArray();
      }

      // 生成音频URL
      let audioUrl: string | null = null;
      if (file.blob) {
        audioUrl = URL.createObjectURL(file.blob);
        audioUrlRef.current = audioUrl;
      }

      setData({
        file,
        segments,
        transcript,
        audioUrl,
        loading: false,
        error: null,
      });
    } catch (error) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "加载失败",
      }));
    }
  }, [fileId]);

  // 监听文件ID变化重新加载数据
  useEffect(() => {
    loadData();

    // 清理函数
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [loadData]); // 直接依赖 fileId，避免 loadData 变化导致的重新运行

  return {
    ...data,
    retry: loadData,
  };
}

// 获取转录状态的工具函数
export function getTranscriptionStatus(
  transcript: TranscriptRow | null,
): "pending" | "processing" | "completed" | "failed" {
  if (!transcript) return "pending";
  return transcript.status;
}

// 格式化文件大小的工具函数
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

// 格式化时长的工具函数
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || Number.isNaN(seconds) || seconds < 0) {
    return "00:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
