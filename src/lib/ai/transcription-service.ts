/**
 * 统一的转录服务 - 基于 AI SDK 的简化版本
 * 合并了 transcription-service.ts 和 transcription-service-ai-sdk.ts 的功能
 * 移除了复杂的音频分块处理，使用统一的 AI SDK 接口
 */

import { groq } from "@ai-sdk/groq";
import { experimental_transcribe as transcribe } from "ai";
import type { Segment } from "@/types/db/database";

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  onProgress?: (progress: {
    chunkIndex: number;
    totalChunks: number;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    message?: string;
    error?: string;
  }) => void;
}

export type TranscriptionResult = import("@/types/transcription").TranscriptionResult;

export interface TranscriptionProgress {
  fileId: number;
  status: "idle" | "processing" | "completed" | "error" | "failed" | "pending";
  progress: number;
  message: string;
}

/**
 * 使用 AI SDK 进行转录 - 简化的主函数
 */
export async function transcribeAudio(
  fileId: number,
  options: TranscriptionOptions = {},
): Promise<TranscriptionResult> {
  const { db } = await import("../db/db");
  const startTime = Date.now();

  try {
    // 更新进度
    await updateTranscriptionProgress(fileId, 10, "准备转录...", "processing", options);

    // 获取文件数据
    const fileRecord = await db.files.get(fileId);
    if (!fileRecord) {
      throw new Error("文件不存在");
    }

    await updateTranscriptionProgress(fileId, 30, "开始转录处理...", "processing", options);

    // 使用 AI SDK 进行转录
    const result = await transcribeWithAISDK(fileRecord, options);

    // 保存结果
    await updateTranscriptionProgress(fileId, 90, "保存转录结果...", "processing", options);
    const transcriptId = await saveTranscriptionResult(fileId, result, options, startTime);

    // 后处理（可选，不影响主要流程）
    try {
      await updateTranscriptionProgress(fileId, 95, "后处理...", "processing", options);
      await processPostTranscription(transcriptId, result);
    } catch (postProcessError) {
      console.warn("后处理失败:", postProcessError);
      await updateTranscriptionProgress(fileId, 95, "转录完成，后处理失败", "processing", options);
    }

    await updateTranscriptionProgress(fileId, 100, "转录完成", "completed", options);

    return result;
  } catch (error) {
    await updateTranscriptionProgress(fileId, 0, "转录失败", "failed", options);
    throw error;
  }
}

/**
 * AI SDK 转录实现 - 简化版本
 */
async function transcribeWithAISDK(
  fileRecord: import("@/types/db/database").FileRow,
  options: TranscriptionOptions,
): Promise<TranscriptionResult> {
  if (!fileRecord.id) {
    throw new Error("文件ID不存在");
  }

  await updateTranscriptionProgress(
    fileRecord.id,
    50,
    "正在进行语音转录...",
    "processing",
    options,
  );

  // 将 File 转换为 Uint8Array
  if (!fileRecord.blob) {
    throw new Error("文件数据不存在");
  }
  const arrayBuffer = await fileRecord.blob.arrayBuffer();
  const audioData = new Uint8Array(arrayBuffer);

  const transcript = await transcribe({
    model: groq.transcription("whisper-large-v3-turbo"),
    audio: audioData,
    providerOptions: {
      groq: {
        language: options.language || "auto",
        temperature: 0,
        response_format: "verbose_json",
        timestamp_granularities: ["word", "segment"],
      },
    },
  });

  // 处理转录结果 - 简化逻辑
  let processedSegments: TranscriptionResult["segments"] = [];

  if (Array.isArray(transcript.segments) && transcript.segments.length > 0) {
    processedSegments = transcript.segments.map((segment: any, index: number) => ({
      start: segment.start || segment.timestamp?.[0] || 0,
      end: segment.end || segment.timestamp?.[1] || 0,
      text: segment.text || segment.word || "",
      wordTimestamps: segment.words || [],
      confidence: segment.confidence,
      id: segment.id || index + 1,
    }));
  } else if (transcript.text) {
    // 生成基本的segments - 简化逻辑
    const sentences = transcript.text
      .split(/[。！？.!?]+/)
      .filter((s: string) => s.trim().length > 0);
    const avgWordsPerSecond = 2.5;
    const totalDuration =
      transcript.durationInSeconds || transcript.text.length / avgWordsPerSecond;

    processedSegments = sentences.map((sentence: string, index: number) => {
      const words = sentence.trim().split(/\s+/);
      const sentenceDuration = words.length / avgWordsPerSecond;
      const startTime =
        index === 0 ? 0 : sentences.slice(0, index).join("").length / avgWordsPerSecond;
      const endTime = Math.min(startTime + sentenceDuration, totalDuration);

      return {
        start: startTime,
        end: endTime,
        text: sentence.trim(),
        wordTimestamps: words.map((word: string, wordIndex: number) => ({
          word,
          start: startTime + wordIndex * (sentenceDuration / words.length),
          end: startTime + (wordIndex + 1) * (sentenceDuration / words.length),
        })),
        confidence: 0.95,
        id: index + 1,
      };
    });
  }

  return {
    text: transcript.text || "",
    language: transcript.language || options.language || "auto",
    duration: transcript.durationInSeconds,
    segments: processedSegments,
  };
}

/**
 * 保存转录结果 - 简化版本
 */
async function saveTranscriptionResult(
  fileId: number,
  result: TranscriptionResult,
  options: TranscriptionOptions,
  startTime: number,
): Promise<number> {
  const { db } = await import("../db/db");

  const transcriptId = await db.transcripts.add({
    fileId,
    status: "completed",
    rawText: result.text,
    language: result.language || "ja",
    processingTime: Date.now() - startTime,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (result.segments && result.segments.length > 0) {
    const now = new Date();
    const segmentsToSave = result.segments.map((segment) => ({
      transcriptId,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      createdAt: now,
      updatedAt: now,
    }));

    await db.segments.bulkAdd(segmentsToSave);
  }

  return transcriptId;
}

/**
 * 后处理 - 简化版本，错误不影响主要流程
 */
async function processPostTranscription(
  transcriptId: number,
  result: TranscriptionResult,
): Promise<void> {
  if (!result.segments || result.segments.length === 0) return;

  try {
    const response = await fetch("/api/postprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segments: result.segments,
        language: result.language || "ja",
        targetLanguage: "zh",
        enableAnnotations: true,
        enableFurigana: true,
        enableTerminology: true,
      }),
    });

    if (!response.ok) return;

    const postProcessResult = (await response.json()) as {
      success: boolean;
      data?: { segments?: any[] };
    };
    if (!postProcessResult.success || !postProcessResult.data?.segments) return;

    const { db } = await import("../db/db");
    for (const processedSegment of postProcessResult.data.segments) {
      await db.segments
        .where("transcriptId")
        .equals(transcriptId)
        .and(
          (segment) =>
            segment.start === processedSegment.start && segment.end === processedSegment.end,
        )
        .modify({
          normalizedText: processedSegment.normalizedText,
          translation: processedSegment.translation,
          annotations: processedSegment.annotations,
          furigana: processedSegment.furigana,
        });
    }
  } catch (error) {
    console.warn("后处理失败:", error);
  }
}

/**
 * 更新转录进度 - 简化版本
 */
async function updateTranscriptionProgress(
  fileId: number,
  progress: number,
  message: string,
  status: "processing" | "completed" | "failed",
  options?: TranscriptionOptions,
): Promise<void> {
  try {
    const { setServerProgress } = await import("./server-progress");
    setServerProgress(fileId, { status, progress, message });
  } catch (error) {
    console.warn("更新进度失败:", error);
  }

  if (options?.onProgress) {
    options.onProgress({
      chunkIndex: 0,
      totalChunks: 1,
      status,
      progress,
      message,
    });
  }
}

/**
 * 获取转录进度 - 简化版本
 */
export async function getTranscriptionProgress(fileId: number): Promise<TranscriptionProgress> {
  try {
    const { db } = await import("../db/db");
    const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

    const processingTranscript = transcripts.find((t) => t.status === "processing");

    if (processingTranscript) {
      const processingTime = Date.now() - processingTranscript.createdAt.getTime();
      const estimatedProgress = Math.min(95, Math.floor(processingTime / 1000));

      return {
        fileId,
        status: "processing",
        progress: estimatedProgress,
        message: "正在转录中...",
      };
    }

    const completedTranscript = transcripts.find((t) => t.status === "completed");
    if (completedTranscript) {
      return {
        fileId,
        status: "completed",
        progress: 100,
        message: "转录完成",
      };
    }

    return {
      fileId,
      status: "idle",
      progress: 0,
      message: "未开始转录",
    };
  } catch (error) {
    return {
      fileId,
      status: "error",
      progress: 0,
      message: "获取进度失败",
    };
  }
}

/**
 * 获取文件的转录记录 - 简化版本
 */
export async function getFileTranscripts(fileId: number) {
  const { db } = await import("../db/db");
  return await db.transcripts.where("fileId").equals(fileId).toArray();
}

/**
 * 后处理segments - 简化版本
 */
export async function postProcessSegmentsByTranscriptId(
  transcriptId: number,
  _options: {
    targetLanguage?: string;
    enableAnnotations?: boolean;
    enableFurigana?: boolean;
    enableTerminology?: boolean;
  } = {},
) {
  try {
    const { db } = await import("../db/db");
    const segments = await db.segments.where("transcriptId").equals(transcriptId).toArray();

    console.log(`后处理 ${segments.length} 个segments, transcriptId: ${transcriptId}`);

    return segments;
  } catch (error) {
    console.error("后处理失败:", error);
    return [];
  }
}

export const TranscriptionService = {
  transcribeAudio,
  getTranscriptionProgress,
  getFileTranscripts,
  postProcessSegmentsByTranscriptId,
};
