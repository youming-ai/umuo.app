import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { postProcessText } from "@/lib/text-postprocessor";
import {
  useTranscription,
  useTranscriptionStatus,
  transcriptionKeys,
} from "@/hooks/useTranscription";
import type { FileRow, Segment, TranscriptRow } from "@/types/database";

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

      // 生成音频URL
      let audioUrl: string | null = null;
      if (file.blob) {
        audioUrl = URL.createObjectURL(file.blob);
      }

      return { file, audioUrl };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

interface UsePlayerDataQueryReturn {
  file: FileRow | null;
  segments: Segment[];
  transcript: TranscriptRow | null;
  audioUrl: string | null;
  loading: boolean;
  error: string | null;
  isTranscribing: boolean;
  transcriptionProgress: number;
  retry: () => void;
  startTranscription: () => void;
}

export function usePlayerDataQuery(fileId: string): UsePlayerDataQueryReturn {
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [shouldAutoTranscribe, setShouldAutoTranscribe] = useState(false);
  const audioUrlRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // 解析文件ID
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

  // 转录 mutation
  const transcriptionMutation = useTranscription();

  // 计算加载状态
  const loading = fileQuery.isLoading || transcriptionQuery.isLoading;
  const error = fileQuery.error?.message || transcriptionQuery.error?.message || null;
  const isTranscribing = transcriptionMutation.isPending;

  // 清理音频URL
  useEffect(() => {
    if (audioUrl && audioUrl !== audioUrlRef.current) {
      // 清理之前的URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = audioUrl;
    }

    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [audioUrl]);

  // 自动转录逻辑
  useEffect(() => {
    if (shouldAutoTranscribe && file && !transcript && !loading && !isTranscribing) {
      console.log("检测到文件未转录，开始自动转录:", {
        fileId: file.id,
        fileName: file.name,
      });

      setShouldAutoTranscribe(false);

      // 延迟开始转录
      const timer = setTimeout(() => {
        startTranscription();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [shouldAutoTranscribe, file, transcript, loading, isTranscribing]);

  // 当数据加载完成后检查是否需要自动转录
  useEffect(() => {
    if (isValidId && !loading && file && !transcript && !transcriptionMutation.isPending) {
      setShouldAutoTranscribe(true);
    }
  }, [isValidId, loading, file, transcript, transcriptionMutation.isPending]);

  // 模拟转录进度
  useEffect(() => {
    if (isTranscribing) {
      setTranscriptionProgress(10);
      const interval = setInterval(() => {
        setTranscriptionProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      return () => clearInterval(interval);
    } else if (transcript?.status === "completed") {
      setTranscriptionProgress(100);
      // 清除进度
      const timer = setTimeout(() => setTranscriptionProgress(0), 1000);
      return () => clearTimeout(timer);
    }
  }, [isTranscribing, transcript?.status]);

  // 开始转录函数
  const startTranscription = useCallback(async () => {
    if (!file || transcript || transcriptionMutation.isPending) {
      return;
    }

    setTranscriptionProgress(0);

    try {
      await transcriptionMutation.mutateAsync({ file, language: "ja" });
      setTranscriptionProgress(100);

      // 进行文本后处理
      if (segments.length > 0) {
        const fullText = segments.map((seg: Segment) => seg.text).join("\n");
        try {
          const processedResult = await postProcessText(fullText, { language: "ja" });

          // 更新字幕段，添加处理后的信息
          for (let i = 0; i < segments.length && i < processedResult.segments.length; i++) {
            const originalSegment = segments[i];
            const processedSegment = processedResult.segments[i];

            await db.segments
              .where("[transcriptId+start]")
              .equals([transcript!.id!, originalSegment.start])
              .modify((segment) => {
                segment.romaji = (processedSegment as any)?.romaji;
                segment.translation = (processedSegment as any)?.translation;
              });
          }

          // 刷新查询缓存
          queryClient.invalidateQueries({ queryKey: transcriptionKeys.forFile(parsedFileId) });
        } catch (processError) {
          console.error("文本后处理失败:", processError);
        }
      }
    } catch (error) {
      console.error("转录失败:", error);
      setTranscriptionProgress(0);
    }
  }, [file, transcript, transcriptionMutation, segments, queryClient, parsedFileId]);

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
    isTranscribing,
    transcriptionProgress,
    retry,
    startTranscription,
  };
}
