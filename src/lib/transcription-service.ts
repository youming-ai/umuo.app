import type { Segment } from "@/types/database";
import { type AudioChunk, processAudioFile } from "./audio-processor";

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

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    wordTimestamps?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }>;
}

export interface TranscriptionProgress {
  fileId: number;
  status: "idle" | "processing" | "completed" | "error" | "failed" | "pending";
  progress: number;
  message: string;
}

/**
 * 类型安全地验证和转换Segment对象
 */
function validateAndConvertSegment(
  segment: unknown,
  index: number,
  transcriptId: number,
): Segment | null {
  if (!segment || typeof segment !== "object") {
    return null;
  }

  const segmentObj = segment as Record<string, unknown>;

  // 检查必需字段
  if (
    typeof segmentObj.start !== "number" ||
    typeof segmentObj.end !== "number" ||
    typeof segmentObj.text !== "string"
  ) {
    return null;
  }

  // 创建有效的Segment对象
  const validatedSegment: Segment = {
    transcriptId,
    start: segmentObj.start,
    end: segmentObj.end,
    text: segmentObj.text,
    id: typeof segmentObj.id === "number" ? segmentObj.id : index + 1,
    normalizedText:
      typeof segmentObj.normalizedText === "string" ? segmentObj.normalizedText : undefined,
    translation: typeof segmentObj.translation === "string" ? segmentObj.translation : undefined,
    annotations: Array.isArray(segmentObj.annotations)
      ? (segmentObj.annotations as string[])
      : undefined,
    furigana: typeof segmentObj.furigana === "string" ? segmentObj.furigana : undefined,
    wordTimestamps: Array.isArray(segmentObj.wordTimestamps)
      ? segmentObj.wordTimestamps
      : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return validatedSegment;
}

/**
 * 管理转录进度
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
  } catch (_error) {
    // 在测试环境中可能没有server-progress模块，忽略错误
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
 * 保存转录结果到数据库
 */
async function saveTranscriptionResult(
  fileId: number,
  result: TranscriptionResult,
  options: TranscriptionOptions,
  startTime: number,
): Promise<number> {
  const { db } = await import("./db");

  const transcriptId = await db.transcripts.add({
    fileId,
    status: "completed",
    rawText: result.text,
    language: result.language || options.language || "ja",
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

    // 对于小批量数据，直接使用 bulkAdd
    if (segmentsToSave.length <= 50) {
      await db.segments.bulkAdd(segmentsToSave);
    } else {
      // 对于大批量数据，使用优化的批量处理器
      const { createDatabaseBatchProcessor } = await import("./batch-processor");

      const processor = createDatabaseBatchProcessor<Segment>(
        async (batch) => {
          await db.segments.bulkAdd(batch);
          return batch;
        },
        {
          batchSize: 50,
          enableProgressTracking: false, // 在转录服务中禁用进度跟踪以避免冲突
        },
      );

      const saveResult = await processor.process(segmentsToSave, async (batch) => {
        await db.segments.bulkAdd(batch);
        return batch;
      });

      if (!saveResult.success) {
        throw new Error(
          `批量保存segments失败: ${saveResult.errors.map((e) => e.message).join(", ")}`,
        );
      }
    }
  }

  return transcriptId;
}

/**
 * 处理转录后的数据
 */
async function processPostTranscription(
  transcriptId: number,
  result: TranscriptionResult,
): Promise<void> {
  if (!result.segments || result.segments.length === 0) {
    return;
  }
  // 首先验证segments是否已保存到数据库
  const { db } = await import("./db");
  const savedSegments = await db.segments.where("transcriptId").equals(transcriptId).toArray();

  if (savedSegments.length === 0) {
    return;
  }

  if (savedSegments.length !== result.segments.length) {
    return;
  }

  const response = await fetch("/api/postprocess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      segments: result.segments,
      language: result.language || "ja",
      targetLanguage: "zh",
      enableAnnotations: true,
      enableFurigana: true,
      enableTerminology: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Post-processing API request failed: ${response.status} - ${errorText}`);
  }

  const postProcessResult = await response.json();

  if (!postProcessResult.success) {
    throw new Error(postProcessResult.error?.message || "Post-processing failed");
  }

  if (postProcessResult.success && postProcessResult.data?.segments) {
    // 更新数据库中的segments
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
  }
}

/**
 * 转录音频文件
 */
export async function transcribeAudio(
  fileId: number,
  options: TranscriptionOptions = {},
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    // 初始化转录进度
    await updateTranscriptionProgress(
      fileId,
      0,
      "Processing audio chunks...",
      "processing",
      options,
    );
    await updateTranscriptionProgress(
      fileId,
      10,
      "Starting transcription...",
      "processing",
      options,
    );

    // 处理音频文件
    const chunks = await processAudioFile(fileId, 45, 0.2);
    await updateTranscriptionProgress(
      fileId,
      30,
      `Audio split into ${chunks.length} chunks`,
      "processing",
      options,
    );

    // 进行转录
    await updateTranscriptionProgress(fileId, 50, "Transcribing audio...", "processing", options);
    const result = await transcribeViaApiRoute(chunks, options, fileId);

    // 保存结果
    await updateTranscriptionProgress(fileId, 90, "Saving results...", "processing", options);
    const transcriptId = await saveTranscriptionResult(fileId, result, options, startTime);

    // 后处理（不影响主要转录流程）
    try {
      await updateTranscriptionProgress(
        fileId,
        95,
        "转录完成，正在后处理...",
        "processing",
        options,
      );
      await processPostTranscription(transcriptId, result);
    } catch (_postProcessError) {
      await updateTranscriptionProgress(fileId, 95, "转录完成，后处理失败", "processing", options);
    }

    // 完成转录
    await updateTranscriptionProgress(fileId, 100, "处理完成", "completed", options);

    return result;
  } catch (error) {
    await updateTranscriptionProgress(fileId, 0, "Transcription failed", "failed", options);
    throw error;
  }
}

/**
 * 准备API请求数据
 */
async function prepareApiRequest(
  chunks: AudioChunk[],
  options: TranscriptionOptions,
  fileId: number,
): Promise<{ url: string; formData: FormData }> {
  const formData = new FormData();

  // 添加元数据
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("language", options.language || "ja");
  formData.append("response_format", "verbose_json");
  formData.append("temperature", "0");

  // 合并所有音频块为一个文件（Groq API期望单个音频文件）
  const { mergeAudioChunks } = await import("./audio-processor");
  const mergedAudio = await mergeAudioChunks(chunks);

  // 创建文件名
  const fileName = `audio_${Date.now()}.wav`;
  const audioFile = new File([mergedAudio], fileName, { type: "audio/wav" });

  formData.append("audio", audioFile);

  // 构建带查询参数的URL
  const url = new URL("/api/transcribe", window.location.origin);
  url.searchParams.append("fileId", fileId.toString());
  if (options.language) {
    url.searchParams.append("language", options.language);
  }

  return { url: url.toString(), formData };
}

interface ApiResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: unknown[];
  results?: ChunkResult[];
  fileData?: {
    duration?: number;
  };
}

/**
 * 处理API响应
 */
async function handleApiResponse(response: Response): Promise<ApiResponse> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error?.message || "Transcription failed");
  }

  if (!result.data) {
    throw new Error("No data available in API response");
  }
  return result.data;
}

/**
 * 转换segments为数组格式
 */
function convertSegmentsToArray(
  segments: unknown[],
  _options: TranscriptionOptions,
): Array<{
  start: number;
  end: number;
  text: string;
  id: number;
  normalizedText?: string;
  translation?: string;
  annotations?: string[];
  furigana?: string;
  wordTimestamps?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}> {
  return segments
    .map((segment: unknown, index: number) => {
      const validatedSegment = validateAndConvertSegment(segment, index, 0);
      if (!validatedSegment) {
        return null;
      }
      return {
        start: validatedSegment.start,
        end: validatedSegment.end,
        text: validatedSegment.text,
        id: validatedSegment.id ?? index + 1,
        normalizedText: validatedSegment.normalizedText,
        translation: validatedSegment.translation,
        annotations: validatedSegment.annotations,
        furigana: validatedSegment.furigana,
        wordTimestamps: validatedSegment.wordTimestamps,
      };
    })
    .filter((segment): segment is NonNullable<typeof segment> => segment !== null);
}

interface SingleTextPayload {
  text: string;
  language?: string;
  duration?: number;
  file?: {
    duration?: number;
  };
  segments?: unknown[];
}

/**
 * 处理单个文本格式的响应
 */
function processSingleTextFormat(
  payload: SingleTextPayload,
  options: TranscriptionOptions,
): TranscriptionResult {
  const segments = Array.isArray(payload.segments)
    ? convertSegmentsToArray(payload.segments, options)
    : [];

  // 导出字幕格式的调试信息
  try {
    const { exportSubtitles, analyzeSegments } = require("./subtitle-converter");
    const _subtitles = exportSubtitles(segments, "json");
    const _analysis = analyzeSegments(segments);
  } catch (_error) {
    // 忽略调试错误
  }

  return {
    text: payload.text,
    language: payload.language || options.language || "ja",
    duration: payload.duration ?? payload.file?.duration,
    segments: segments.length > 0 ? segments : undefined,
  };
}

interface ChunkResult {
  success: boolean;
  result?: {
    text: string;
    segments?: unknown[];
  };
}

interface ChunkedResultsPayload {
  results: ChunkResult[];
  fileData?: {
    duration?: number;
  };
}

/**
 * 处理多块结果格式的响应
 */
function processChunkedResultsFormat(
  payload: ChunkedResultsPayload,
  options: TranscriptionOptions,
): TranscriptionResult {
  const mergedText = payload.results
    .filter((r: ChunkResult) => r.success && r.result?.text)
    .map((r: ChunkResult) => r.result?.text || "")
    .filter(Boolean)
    .join(" ");

  const mergedSegments = payload.results
    .filter((r: ChunkResult) => r.success && r.result?.segments)
    .flatMap((r: ChunkResult) => r.result?.segments || []);

  const convertedSegments = convertSegmentsToArray(mergedSegments, options);

  return {
    text: mergedText,
    language: options.language || "ja",
    duration: payload.fileData?.duration,
    segments: convertedSegments.length > 0 ? convertedSegments : undefined,
  };
}

/**
 * 通过API路由进行转录
 */
async function transcribeViaApiRoute(
  chunks: AudioChunk[],
  options: TranscriptionOptions,
  fileId: number,
): Promise<TranscriptionResult> {
  // 准备API请求
  const { url, formData } = await prepareApiRequest(chunks, options, fileId);

  // 发送API请求
  const response = await fetch(url.toString(), {
    method: "POST",
    body: formData,
  });

  // 处理API响应
  const payload = await handleApiResponse(response);

  // 根据响应格式处理数据
  if (payload?.text) {
    return processSingleTextFormat(payload, options);
  }

  if (Array.isArray(payload?.results) && payload.results.length > 0) {
    return processChunkedResultsFormat(payload as ChunkedResultsPayload, options);
  }

  throw new Error("No valid transcription results found");
}

/**
 * 获取文件转录进度
 */
export async function getTranscriptionProgress(fileId: number): Promise<TranscriptionProgress> {
  try {
    const { db } = await import("./db");

    const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

    const processingTranscript = transcripts.find((t) => t.status === "processing");

    if (!processingTranscript) {
      // 如果没有正在处理的转录，检查是否有完成的转录
      const completedTranscript = transcripts.find((t) => t.status === "completed");
      if (completedTranscript) {
        return {
          fileId,
          status: "completed" as const,
          progress: 100,
          message: "转录完成",
        };
      }

      return {
        fileId,
        status: "idle" as const,
        progress: 0,
        message: "未开始转录",
      };
    }

    // 模拟进度计算（实际应用中应该从转录服务获取真实进度）
    const processingTime = Date.now() - processingTranscript.createdAt.getTime();
    const estimatedProgress = Math.min(95, Math.floor(processingTime / 1000)); // 假设每秒5%进度，最大95%

    return {
      fileId,
      status: "processing" as const,
      progress: estimatedProgress,
      message: "正在转录中...",
    };
  } catch (_error) {
    return {
      fileId,
      status: "error" as const,
      progress: 0,
      message: "获取进度失败",
    };
  }
}
export async function getFileTranscripts(fileId: number) {
  const { db } = await import("./db");
  return await db.transcripts.where("fileId").equals(fileId).toArray();
}

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
    const { db } = await import("./db");

    // 获取转录记录
    const transcript = await db.transcripts.get(transcriptId);
    if (!transcript) {
      throw new Error("Transcript not found");
    }

    if (transcript.status !== "completed") {
      throw new Error("Transcript must be completed before post-processing");
    }

    // 模拟后处理逻辑 - 实际实现需要调用API
    const segments = await db.segments.where("transcriptId").equals(transcriptId).toArray();

    return {
      success: true,
      segments: segments.map((seg) => ({
        ...seg,
        processed: true,
      })),
    };
  } catch (error) {
    throw new Error(
      `Post-processing failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export const TranscriptionService = {
  transcribeAudio,
  getTranscriptionProgress,
  getFileTranscripts,
  postProcessSegmentsByTranscriptId,
};
