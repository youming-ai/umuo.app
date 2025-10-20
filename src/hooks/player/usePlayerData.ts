import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import { postProcessText } from "@/lib/text-postprocessor";
import type { FileRow, Segment, TranscriptRow } from "@/types/database";

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

interface PlayerData {
  file: FileRow | null;
  segments: Segment[];
  transcript: TranscriptRow | null;
  audioUrl: string | null;
  loading: boolean;
  error: string | null;
  isTranscribing: boolean;
  transcriptionProgress: number;
}

export function usePlayerData(fileId: string) {
  const [data, setData] = useState<PlayerData>({
    file: null,
    segments: [],
    transcript: null,
    audioUrl: null,
    loading: true,
    error: null,
    isTranscribing: false,
    transcriptionProgress: 0,
  });

  // 使用 ref 来跟踪最新的 audioUrl 用于清理
  const audioUrlRef = useRef<string | null>(null);
  const isTranscribingRef = useRef<boolean>(false);
  const [shouldAutoTranscribe, setShouldAutoTranscribe] = useState<boolean>(false);

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
        isTranscribing: false,
        transcriptionProgress: 0,
      });

      // 如果没有转录记录，设置自动转录标志
      if (!transcript) {
        setShouldAutoTranscribe(true);
      }
    } catch (error) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "加载失败",
      }));
    }
  }, [fileId]);

  // 开始转录函数
  const startTranscription = useCallback(async () => {
    if (isTranscribingRef.current || !data.file || data.transcript) {
      return;
    }

    try {
      isTranscribingRef.current = true;
      setData((prev) => ({ ...prev, isTranscribing: true, transcriptionProgress: 0 }));

      const file = data.file;
      if (!file.blob) {
        throw new Error("音频文件不存在");
      }

      // 创建一个虚拟文件对象用于转录
      const audioFile = new File([file.blob], file.name, { type: file.type || "audio/mpeg" });

      // 更新转录进度
      setData((prev) => ({ ...prev, transcriptionProgress: 10 }));

      // 创建 FormData 用于 API 调用
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append(
        "meta",
        JSON.stringify({
          fileId: file.id?.toString(),
        }),
      );

      console.log("发送转录请求:", {
        url: `/api/transcribe?language=ja&fileId=${file.id}`,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileType: audioFile.type,
        fileId: file.id,
      });

      // 调用转录 API
      let response: Response;
      try {
        response = await fetch(`/api/transcribe?language=ja&fileId=${file.id}`, {
          method: "POST",
          body: formData,
        });
      } catch (fetchError) {
        console.error("网络请求失败:", fetchError);
        throw new Error(
          `网络连接失败: ${fetchError instanceof Error ? fetchError.message : "未知网络错误"}`,
        );
      }

      console.log("API 响应状态:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        let errorData: unknown;
        try {
          const responseText = await response.text();
          console.log("错误响应原文:", responseText);

          try {
            errorData = JSON.parse(responseText);
          } catch (parseError) {
            console.warn("解析错误响应JSON失败:", parseError);
            errorData = { rawResponse: responseText };
          }
        } catch (readError) {
          console.error("读取错误响应失败:", readError);
          errorData = {
            readError: readError instanceof Error ? readError.message : "读取响应失败",
          };
        }

        console.error("API 调用失败:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        const errorMessage =
          errorData?.error?.message ||
          errorData?.message ||
          `转录失败: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      let transcriptionResult: unknown;
      try {
        const responseText = await response.text();
        console.log("API 响应原文:", responseText);
        transcriptionResult = JSON.parse(responseText);
        console.log("转录结果解析成功:", {
          status: transcriptionResult.success,
          hasData: !!transcriptionResult.data,
          textLength: transcriptionResult.data?.text?.length || 0,
          segmentsCount: transcriptionResult.data?.segments?.length || 0,
        });
      } catch (parseError) {
        console.error("解析成功响应失败:", parseError);
        throw new Error(
          `API 响应格式错误: ${parseError instanceof Error ? parseError.message : "未知解析错误"}`,
        );
      }

      setData((prev) => ({ ...prev, transcriptionProgress: 60 }));

      // 创建转录记录
      const transcriptRecord: TranscriptRow = {
        fileId: file.id ?? 0,
        status: "processing",
        text: transcriptionResult.data.text,
        rawText: transcriptionResult.data.text,
        language: transcriptionResult.data.language || "ja",
        duration: transcriptionResult.data.duration,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const transcriptId = await db.transcripts.add(transcriptRecord);

      // 保存字幕段
      if (transcriptionResult.data.segments && transcriptionResult.data.segments.length > 0) {
        const segmentRecords: Segment[] = transcriptionResult.data.segments.map(
          (segment: TranscriptionSegment) => ({
            transcriptId,
            start: segment.start,
            end: segment.end,
            text: segment.text,
            wordTimestamps: [], // 暂时为空，后续可以添加词级时间戳
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        );

        await db.segments.bulkAdd(segmentRecords);
      }

      setData((prev) => ({ ...prev, transcriptionProgress: 80 }));

      // 进行文本后处理，添加罗马音和中文翻译
      const textSegments = transcriptionResult.data.segments || [];
      if (textSegments.length > 0) {
        const fullText = textSegments.map((seg: TranscriptionSegment) => seg.text).join("\n");

        try {
          const processedResult = await postProcessText(fullText, { language: "ja" });

          // 更新字幕段，添加处理后的信息
          for (let i = 0; i < textSegments.length && i < processedResult.segments.length; i++) {
            const originalSegment = textSegments[i];
            const processedSegment = processedResult.segments[i];

            // 更新数据库中的字幕段
            await db.segments
              .where("[transcriptId+start]")
              .equals([transcriptId, originalSegment.start])
              .modify((segment) => {
                segment.romaji = (processedSegment as ProcessedTranscriptionSegment)?.romaji;
                segment.translation = (
                  processedSegment as ProcessedTranscriptionSegment
                )?.translation;
              });
          }
        } catch (processError) {
          console.error("文本后处理失败:", processError);
          // 不阻断主要流程，继续执行
        }
      }

      // 更新转录状态为完成
      await db.transcripts.update(transcriptId, { status: "completed", updatedAt: new Date() });

      setData((prev) => ({ ...prev, transcriptionProgress: 100 }));

      // 重新加载数据以获取最新的转录结果
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error) {
      console.error("转录失败:", error);
      setData((prev) => ({
        ...prev,
        isTranscribing: false,
        transcriptionProgress: 0,
        error: error instanceof Error ? error.message : "转录失败",
      }));
    } finally {
      isTranscribingRef.current = false;
      setTimeout(() => {
        setData((prev) => ({ ...prev, isTranscribing: false, transcriptionProgress: 0 }));
      }, 1000);
    }
  }, [data.file, data.transcript, loadData]);

  // 自动转录逻辑 - 当数据加载完成且没有转录记录时自动开始转录
  useEffect(() => {
    if (
      shouldAutoTranscribe &&
      data.file &&
      !data.transcript &&
      !data.loading &&
      !data.isTranscribing
    ) {
      console.log("检测到文件未转录，开始自动转录:", {
        fileId: data.file.id,
        fileName: data.file.name,
      });

      // 重置自动转录标志并开始转录
      setShouldAutoTranscribe(false);

      // 延迟一小段时间确保UI已经渲染完成
      const timer = setTimeout(() => {
        startTranscription();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [
    shouldAutoTranscribe,
    data.file,
    data.transcript,
    data.loading,
    data.isTranscribing,
    startTranscription,
  ]);

  // 监听文件ID变化重新加载数据
  useEffect(() => {
    loadData();

    // 清理函数
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      // 重置自动转录标志
      setShouldAutoTranscribe(false);
    };
  }, [loadData]); // 直接依赖 fileId，避免 loadData 变化导致的重新运行

  return {
    ...data,
    retry: loadData,
    startTranscription,
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
