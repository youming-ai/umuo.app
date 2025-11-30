import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranscriptionStatus } from "@/hooks/api/useTranscription";
import { db } from "@/lib/db/db";
import type { FileRow, Segment, TranscriptRow } from "@/types/db/database";

// 音频URL缓存管理 - 使用 WeakMap 防止内存泄漏
const audioUrlCache = new WeakMap<Blob, string>();
const activeAudioUrls = new Set<string>();

function createAudioUrl(blob: Blob): string {
  const cachedUrl = audioUrlCache.get(blob);
  if (cachedUrl) {
    return cachedUrl;
  }

  const url = URL.createObjectURL(blob);
  audioUrlCache.set(blob, url);
  activeAudioUrls.add(url);

  return url;
}

// 查询键
export const playerKeys = {
  all: ["player"] as const,
  file: (fileId: number) => [...playerKeys.all, "file", fileId] as const,
};

// 获取文件数据的查询
function useFileQuery(fileId: number) {
  return useQuery({
    queryKey: playerKeys.file(fileId),
    queryFn: async () => {
      const file = await db.files.get(fileId);
      if (!file) {
        throw new Error("文件不存在");
      }

      let audioUrl: string | null = null;
      if (file.blob) {
        audioUrl = createAudioUrl(file.blob);
      }

      return { file, audioUrl };
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

interface UsePlayerDataQueryReturn {
  file: FileRow | null;
  segments: Segment[];
  transcript: TranscriptRow | null;
  audioUrl: string | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * 播放器数据查询 Hook - 简化版
 * 只负责获取文件和转录数据，不处理自动转录逻辑
 */
export function usePlayerDataQuery(fileId: string): UsePlayerDataQueryReturn {
  const parsedFileId = parseInt(fileId, 10);
  const isValidId = !Number.isNaN(parsedFileId);

  // 获取文件数据
  const fileQuery = useFileQuery(parsedFileId);
  const file = fileQuery.data?.file || null;
  const audioUrl = fileQuery.data?.audioUrl || null;

  // 获取转录状态
  const transcriptionQuery = useTranscriptionStatus(parsedFileId);
  const transcript = transcriptionQuery.data?.transcript || null;
  const segments = transcriptionQuery.data?.segments || [];

  // 只等待文件加载完成
  const loading = fileQuery.isLoading;
  const error = fileQuery.error?.message || null;

  // 重试函数
  const retry = useCallback(() => {
    fileQuery.refetch();
    transcriptionQuery.refetch();
  }, [fileQuery, transcriptionQuery]);

  return {
    file,
    segments,
    transcript,
    audioUrl,
    loading,
    error,
    retry,
  };
}
