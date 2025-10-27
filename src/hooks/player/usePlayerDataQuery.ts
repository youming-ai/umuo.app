import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  transcriptionKeys,
  useTranscription,
  useTranscriptionStatus,
} from "@/hooks/api/useTranscription";
import { postProcessText } from "@/lib/ai/text-postprocessor";
import { db } from "@/lib/db/db";
import type { FileRow, Segment, TranscriptRow } from "@/types/db/database";

/**
 * Player Data Query Hook - umuo.app 播放器数据管理核心
 *
 * 功能概述：
 * - 统一管理播放器所需的所有数据查询和状态
 * - 实现智能自动转录：用户访问播放器页面时自动检测并启动转录
 * - 提供完整的错误处理和状态同步机制
 * - 支持实时进度跟踪和缓存管理
 *
 * 核心特性：
 * 1. 自动转录：智能检测文件状态，自动启动转录流程
 * 2. 状态管理：统一的加载、错误、成功状态处理
 * 3. 缓存优化：利用 TanStack Query 进行智能缓存
 * 4. 实时更新：转录进度和结果实时同步到UI
 *
 * 自动转录逻辑：
 * - 触发条件：文件存在且有效，没有现有转录，不在转录进行中
 * - 延迟策略：500ms延迟避免频繁触发，提升用户体验
 * - 错误恢复：转录失败时提供重试机制
 * - 后处理：转录完成后自动进行文本增强处理
 */

// Type for transcription segments from Groq API
interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number;
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

// Type for processed segments with additional fields
interface ProcessedTranscriptionSegment extends TranscriptionSegment {
  romaji?: string;
  translation?: string;
  furigana?: string;
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
  resetAutoTranscription: () => void; // 新增：重置自动转录功能
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

  // 统一计算是否应该开始自动转录
  // 优化：使用 useMemo 避免重复计算，统一状态判断逻辑
  const shouldStartTranscription = useMemo(() => {
    const conditions = {
      isValidId,
      hasFile: !!file,
      hasTranscript: !!transcript,
      isLoading: loading,
      isTranscribingPending: transcriptionMutation.isPending,
    };

    console.log("🔍 自动转录状态检查:", conditions);

    return isValidId && !loading && file && !transcript && !transcriptionMutation.isPending;
  }, [isValidId, loading, file, transcript, transcriptionMutation.isPending]);

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

  // 开始转录函数
  const startTranscription = useCallback(async () => {
    // 优化：使用统一的状态判断，避免重复逻辑
    if (!shouldStartTranscription) {
      console.log("❌ 转录条件不满足，跳过转录:", {
        hasFile: !!file,
        hasTranscript: !!transcript,
        isPending: transcriptionMutation.isPending,
        isLoading: loading,
        isValidId,
      });
      return;
    }

    console.log("🚀 开始转录文件:", {
      fileId: file!.id,
      fileName: file!.name,
    });

    setTranscriptionProgress(0);

    try {
      console.log("📡 发送转录请求到 API");
      await transcriptionMutation.mutateAsync({ file: file!, language: "ja" });
      console.log("✅ 转录 API 调用成功");
      setTranscriptionProgress(100);

      // 重新获取转录数据以获得新的 transcript ID
      console.log("🔄 刷新转录数据缓存");
      await queryClient.invalidateQueries({
        queryKey: transcriptionKeys.forFile(parsedFileId),
      });
      const freshData = await queryClient.fetchQuery({
        queryKey: transcriptionKeys.forFile(parsedFileId),
        queryFn: async () => {
          const transcripts = await db.transcripts.where("fileId").equals(parsedFileId).toArray();
          const transcript = transcripts.length > 0 ? transcripts[0] : null;

          if (transcript && typeof transcript.id === "number") {
            const segments = await db.segments
              .where("transcriptId")
              .equals(transcript.id)
              .toArray();
            return {
              transcript,
              segments,
            };
          }

          return {
            transcript: null,
            segments: [],
          };
        },
      });

      const newTranscript = freshData.transcript;

      console.log("📝 转录数据获取完成:", {
        transcriptId: newTranscript?.id,
        segmentsCount: segments.length,
        hasText: !!newTranscript?.text,
      });

      // 进行文本后处理
      if (segments.length > 0 && newTranscript) {
        console.log("🔤 开始文本后处理");
        const fullText = segments.map((seg: Segment) => seg.text).join("\n");
        try {
          console.log("📡 发送文本后处理请求");
          const processedResult = await postProcessText(fullText, {
            language: "ja",
          });
          console.log("✅ 文本后处理完成:", {
            processedCount: processedResult.segments.length,
            hasTranslation: processedResult.segments.some(
              (s) => "translation" in s && !!s.translation,
            ),
          });

          // 更新字幕段，添加处理后的信息
          for (let i = 0; i < segments.length && i < processedResult.segments.length; i++) {
            const originalSegment = segments[i];
            const processedSegment = processedResult.segments[i];

            if (!newTranscript.id) continue;

            await db.segments
              .where("[transcriptId+start]")
              .equals([newTranscript.id, originalSegment.start])
              .modify((segment) => {
                segment.romaji = (processedSegment as ProcessedTranscriptionSegment)?.romaji;
                segment.translation = (
                  processedSegment as ProcessedTranscriptionSegment
                )?.translation;
              });
          }

          // 刷新查询缓存
          console.log("🔄 刷新查询缓存，更新UI");
          queryClient.invalidateQueries({
            queryKey: transcriptionKeys.forFile(parsedFileId),
          });
          console.log("🎉 转录和后处理流程全部完成");
        } catch (processError) {
          console.error("文本后处理失败:", processError);
        }
      } else {
        console.log("⚠️ 没有segments数据，跳过后处理");
      }
    } catch (error) {
      console.error("转录失败:", error);
      setTranscriptionProgress(0);

      // 转录失败后的恢复机制：允许用户重新触发自动转录
      console.log("💡 转录失败，可通过 resetAutoTranscription() 重新触发");
      // 注意：不在这里自动重置 shouldAutoTranscribe，让用户主动调用 resetAutoTranscription
    }
  }, [
    shouldStartTranscription, // 使用统一状态判断
    file,
    transcriptionMutation,
    segments,
    queryClient,
    parsedFileId,
  ]);

  // 重置自动转录的函数
  const resetAutoTranscription = useCallback(() => {
    console.log("🔄 重置自动转录状态");
    setShouldAutoTranscribe(true);
    setTranscriptionProgress(0);
  }, []);

  /**
   * 自动转录执行逻辑
   *
   * 触发条件：
   * 1. shouldAutoTranscribe 标志位为 true（由检测逻辑设置）
   * 2. 文件存在且有效
   * 3. 没有现有转录记录
   * 4. 不在加载状态
   * 5. 当前没有转录进行中
   *
   * 执行流程：
   * 1. 记录日志用于调试
   * 2. 重置自动转录标志，避免重复触发
   * 3. 延迟500ms执行，提升用户体验（避免立即开始的突兀感）
   * 4. 清理定时器，防止内存泄漏
   */
  useEffect(() => {
    if (shouldAutoTranscribe && shouldStartTranscription) {
      console.log("🎵 检测到文件未转录，开始自动转录:", {
        fileId: file!.id,
        fileName: file!.name,
        condition: "shouldAutoTranscribe + shouldStartTranscription",
      });

      // 重置标志，防止重复触发
      setShouldAutoTranscribe(false);

      // 延迟执行：提供更好的用户体验
      const timer = setTimeout(() => {
        console.log("⏰ 延迟结束，开始执行转录");
        startTranscription();
      }, 500); // 500ms延迟，让用户有准备时间

      return () => {
        console.log("🧹 清理转录定时器");
        clearTimeout(timer);
      };
    }
  }, [shouldAutoTranscribe, shouldStartTranscription, startTranscription]);

  /**
   * 自动转录检测逻辑
   *
   * 优化：直接使用 shouldStartTranscription 进行检测
   *
   * 检测时机：
   * - 页面加载完成后
   * - 文件数据获取完成后
   * - 转录状态变化后
   *
   * 当 shouldStartTranscription 为 true 时，设置 shouldAutoTranscribe 标志位
   */
  useEffect(() => {
    if (shouldStartTranscription) {
      console.log("🎯 检测条件满足，准备触发自动转录");
      setShouldAutoTranscribe(true);
    } else {
      console.log("❌ 检测条件不满足，不触发自动转录");
    }
  }, [shouldStartTranscription]);

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
    resetAutoTranscription, // 新增：重置自动转录功能
  };
}
