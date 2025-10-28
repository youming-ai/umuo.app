/**
 * 基于 AI SDK 的转录服务
 * 统一使用 AI SDK，移除直接 HTTP 请求
 */

import { groq } from "@ai-sdk/groq";
import { experimental_transcribe as transcribe } from "ai";
import type { Segment } from "@/types/db/database";
import { createGroqProviderOptions } from "./transcription-sdk-config";

// 结构化错误类型
export enum TranscriptionErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  AI_SERVICE_ERROR = "AI_SERVICE_ERROR",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FORMAT = "INVALID_FORMAT",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public code: TranscriptionErrorCode,
    public userMessage?: string,
    public retryable: boolean = true,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

// 错误处理工具函数
function classifyError(error: unknown): TranscriptionError {
  if (error instanceof TranscriptionError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return new TranscriptionError(
        error.message,
        TranscriptionErrorCode.NETWORK_ERROR,
        "网络连接失败，请检查网络设置",
        true,
        { originalError: error },
      );
    }

    if (message.includes("quota") || message.includes("limit") || message.includes("rate")) {
      return new TranscriptionError(
        error.message,
        TranscriptionErrorCode.QUOTA_EXCEEDED,
        "服务配额已用完，请稍后再试",
        false,
        { originalError: error },
      );
    }

    if (message.includes("timeout")) {
      return new TranscriptionError(
        error.message,
        TranscriptionErrorCode.TIMEOUT_ERROR,
        "转录超时，请重试或使用更小的音频文件",
        true,
        { originalError: error },
      );
    }

    if (message.includes("file too large") || message.includes("size")) {
      return new TranscriptionError(
        error.message,
        TranscriptionErrorCode.FILE_TOO_LARGE,
        "音频文件过大，请使用小于 100MB 的文件",
        false,
        { originalError: error },
      );
    }

    if (message.includes("invalid") || message.includes("format")) {
      return new TranscriptionError(
        error.message,
        TranscriptionErrorCode.INVALID_FORMAT,
        "音频格式不支持，请使用 MP3、WAV 或 M4A 格式",
        false,
        { originalError: error },
      );
    }
  }

  return new TranscriptionError(
    error instanceof Error ? error.message : String(error),
    TranscriptionErrorCode.UNKNOWN_ERROR,
    "转录失败，请重试",
    true,
    { originalError: error },
  );
}

// 重试机制配置
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 带重试的执行函数
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const transcriptionError = classifyError(error);

      // 如果不可重试或已达到最大重试次数，直接抛出错误
      if (!transcriptionError.retryable || attempt === finalConfig.maxRetries) {
        throw transcriptionError;
      }

      // 计算延迟时间（指数退避）
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelay,
      );

      console.warn(`转录失败，${delay}ms 后重试 (${attempt + 1}/${finalConfig.maxRetries}):`, {
        error: transcriptionError.message,
        code: transcriptionError.code,
        attempt: attempt + 1,
      });

      await sleep(delay);
    }
  }

  throw classifyError(lastError);
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: {
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
    confidence?: number;
    id: number;
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
    // 如果进度管理失败，记录但不影响转录
    console.warn("Failed to update transcription progress:", _error);
  }

  // 调用回调函数
  if (options?.onProgress) {
    options.onProgress({
      status,
      progress,
      message,
    });
  }
}

/**
 * 使用 AI SDK 进行转录
 */
export async function transcribeAudioWithAISDK(
  audioFile: File,
  fileId: number,
  options: TranscriptionOptions = {},
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    // 初始化转录进度
    await updateTranscriptionProgress(fileId, 10, "准备转录...", "processing", options);
    await updateTranscriptionProgress(fileId, 30, "开始转录处理...", "processing", options);

    // 使用 AI SDK 的 transcribe 函数，采用推荐的配置
    await updateTranscriptionProgress(fileId, 50, "正在进行语音转录...", "processing", options);

    // 将 File 转换为 Uint8Array 以适配 AI SDK
    const arrayBuffer = await audioFile.arrayBuffer();
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

    console.log("转录成功完成 (AI SDK):", {
      fileName: audioFile.name,
      textLength: transcript.text?.length || 0,
      segmentsCount: transcript.segments?.length || 0,
      durationInSeconds: transcript.durationInSeconds,
      hasSegments: !!transcript.segments,
      segmentsType: typeof transcript.segments,
      segmentsLength: Array.isArray(transcript.segments) ? transcript.segments.length : "N/A",
      firstSegment:
        Array.isArray(transcript.segments) && transcript.segments.length > 0
          ? transcript.segments[0]
          : "N/A",
    });

    // 处理转录结果
    let processedSegments: TranscriptionResult["segments"] = [];

    if (Array.isArray(transcript.segments) && transcript.segments.length > 0) {
      // 使用AI SDK返回的segments
      processedSegments = transcript.segments.map(
        (segment: {
          start?: number;
          end?: number;
          timestamp?: [number, number];
          text: string;
          word?: string;
          words?: Array<{ word: string; start: number; end: number }>;
          confidence?: number;
          id?: number;
        }) => ({
          start: segment.start || segment.timestamp?.[0] || 0,
          end: segment.end || segment.timestamp?.[1] || 0,
          text: segment.text || segment.word || "",
          wordTimestamps: segment.words || [],
          confidence: segment.confidence,
          id: segment.id || Math.floor(Math.random() * 1000000),
        }),
      );
      console.log("使用AI SDK返回的segments:", processedSegments.length);
    } else if (transcript.text && transcript.text.length > 0) {
      // 生成基本的segments：按句子分割
      console.log("AI SDK未返回segments，生成基本segments");
      const sentences = transcript.text.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0);
      const avgWordsPerSecond = 2.5; // 假设平均每秒2.5个词
      const totalDuration =
        transcript.durationInSeconds || transcript.text.length / avgWordsPerSecond;

      processedSegments = sentences.map((sentence, index) => {
        const words = sentence.trim().split(/\s+/);
        const sentenceDuration = words.length / avgWordsPerSecond;
        const startTime =
          index === 0 ? 0 : sentences.slice(0, index).join("").length / avgWordsPerSecond;
        const endTime = Math.min(startTime + sentenceDuration, totalDuration);

        return {
          start: startTime,
          end: endTime,
          text: sentence.trim(),
          wordTimestamps: words.map((word, wordIndex) => ({
            word: word,
            start: startTime + wordIndex * (sentenceDuration / words.length),
            end: startTime + (wordIndex + 1) * (sentenceDuration / words.length),
          })),
          confidence: 0.95,
          id: index + 1,
        };
      });
    }

    // 创建转录结果
    const transcriptionResponse: TranscriptionResult = {
      text: transcript.text || "",
      language: transcript.language || options.language || "auto",
      duration: transcript.durationInSeconds,
      segments: processedSegments,
    };

    await updateTranscriptionProgress(
      fileId,
      90,
      "转录完成，正在保存结果...",
      "processing",
      options,
    );

    return transcriptionResponse;
  } catch (transcriptionError) {
    console.error("转录处理失败 (AI SDK):", {
      fileName: audioFile.name,
      error:
        transcriptionError instanceof Error
          ? transcriptionError.message
          : String(transcriptionError),
      errorType:
        transcriptionError instanceof Error ? transcriptionError.constructor.name : "Unknown",
      timestamp: new Date().toISOString(),
    });

    await updateTranscriptionProgress(fileId, 0, "转录失败", "failed", options);

    if (transcriptionError instanceof Error) {
      throw new Error(`转录失败: ${transcriptionError.message}`);
    } else {
      throw new Error("转录失败: 未知错误");
    }
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
  try {
    const db = (await import("@/lib/db/db")).default;

    // 创建转录记录
    const transcriptId = await db.transcripts.add({
      fileId,
      status: "completed",
      text: result.text,
      language: result.language,
      duration: result.duration,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 保存segments
    if (result.segments && result.segments.length > 0) {
      const savedSegments = [];
      for (let i = 0; i < result.segments.length; i++) {
        const segment = result.segments[i];
        const validatedSegment = validateAndConvertSegment(segment, i, transcriptId);
        if (validatedSegment) {
          const segmentId = await db.segments.add(validatedSegment);
          savedSegments.push({ id: segmentId, segment: validatedSegment });
        }
      }
      console.log(`保存了 ${savedSegments.length} 个segments`);
    }

    await updateTranscriptionProgress(fileId, 100, "转录完成", "completed", options);

    const duration = Date.now() - startTime;
    console.log(`转录完成，耗时: ${duration}ms`);

    return transcriptId;
  } catch (error) {
    console.error("保存转录结果失败:", error);
    throw error;
  }
}

/**
 * 完整的转录流程
 */
export async function transcribeAudio(
  fileId: number,
  audioFile: File,
  options: TranscriptionOptions = {},
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    // 进行转录
    const result = await transcribeAudioWithAISDK(audioFile, fileId, options);

    // 保存结果
    await saveTranscriptionResult(fileId, result, options, startTime);

    return result;
  } catch (error) {
    await updateTranscriptionProgress(fileId, 0, "转录失败", "failed", options);
    throw error;
  }
}

/**
 * 获取转录进度
 */
export async function getTranscriptionProgress(fileId: number): Promise<TranscriptionProgress> {
  try {
    const { getServerProgress } = await import("./server-progress");
    const serverProgress = await getServerProgress(fileId);

    // 将 ServerProgress 转换为 TranscriptionProgress
    return {
      fileId,
      status: serverProgress?.status || "idle",
      progress: serverProgress?.progress || 0,
      message: serverProgress?.message || "无法获取进度信息",
    };
  } catch (_error) {
    // 如果无法获取进度，返回默认状态
    return {
      fileId,
      status: "idle",
      progress: 0,
      message: "无法获取进度信息",
    };
  }
}

/**
 * 获取文件的转录记录
 */
export async function getFileTranscripts(fileId: number) {
  try {
    const db = (await import("@/lib/db/db")).default;
    const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
    return transcripts;
  } catch (error) {
    console.error("获取转录记录失败:", error);
    return [];
  }
}

/**
 * 后处理segments（可选功能）
 */
export async function postProcessSegmentsByTranscriptId(
  transcriptId: number,
  options?: { language?: string; targetLanguage?: string },
) {
  try {
    const db = (await import("@/lib/db/db")).default;
    const segments = await db.segments.where("transcriptId").equals(transcriptId).toArray();

    // 这里可以添加后处理逻辑，比如翻译、格式化等
    console.log(`后处理 ${segments.length} 个segments, transcriptId: ${transcriptId}`);

    return segments;
  } catch (error) {
    console.error("后处理失败:", error);
    return [];
  }
}
