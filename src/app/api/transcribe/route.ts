import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/utils/api-response";
import { experimental_transcribe as transcribe } from "ai";
import { groq } from "@ai-sdk/groq";

export const runtime = "edge"; // Cloudflare Pages 需要 Edge Runtime

// Zod schemas for validation
const transcribeQuerySchema = z.object({
  fileId: z.string().min(1, "fileId is required"),
  chunkIndex: z.coerce.number().int().min(0).optional(),
  offsetSec: z.coerce.number().min(0).optional(),
  language: z.string().optional().default("en"),
});

// Helper function to check if object is a File-like object
function isFileLike(obj: unknown): obj is File {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "name" in obj &&
    typeof obj.name === "string" &&
    "size" in obj &&
    typeof obj.size === "number" &&
    "type" in obj &&
    typeof obj.type === "string" &&
    "arrayBuffer" in obj &&
    typeof obj.arrayBuffer === "function"
  );
}

const transcribeFormSchema = z.object({
  audio: z.any().refine((file) => isFileLike(file), { message: "Audio file is required" }),
  meta: z
    .object({
      fileId: z.string().optional(),
      chunkIndex: z.number().int().min(0).optional(),
      offsetSec: z.number().min(0).optional(),
    })
    .optional(),
});

// Helper function to validate query parameters
function validateQueryParams(searchParams: Record<string, string>) {
  const validatedQuery = transcribeQuerySchema.safeParse(searchParams);
  if (!validatedQuery.success) {
    const issues = validatedQuery.error.issues.reduce(
      (acc, issue, index) => {
        acc[`issue_${index}`] = {
          code: issue.code,
          message: issue.message,
          path: issue.path.join("."),
        };
        return acc;
      },
      {} as Record<string, unknown>,
    );
    return {
      success: false as const,
      error: apiError({
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details: issues,
        statusCode: 400,
      }),
    };
  }
  return { success: true as const, data: validatedQuery.data };
}

// Helper function to validate form data
function validateFormData(formData: FormData) {
  const uploadedFile = formData.get("audio") ?? formData.get("file");

  if (!isFileLike(uploadedFile)) {
    return {
      success: false as const,
      error: apiError({
        code: "VALIDATION_ERROR",
        message: "Audio file is required",
        details: { reason: "MISSING_AUDIO" },
        statusCode: 400,
      }),
    };
  }

  let parsedMeta: unknown;
  const rawMeta = formData.get("meta");
  if (typeof rawMeta === "string" && rawMeta.trim().length > 0) {
    try {
      parsedMeta = JSON.parse(rawMeta);
    } catch (metaError) {
      return {
        success: false as const,
        error: apiError({
          code: "VALIDATION_ERROR",
          message: "Invalid metadata payload",
          details: {
            reason: "INVALID_META_JSON",
            error: metaError instanceof Error ? metaError.message : String(metaError),
          },
          statusCode: 400,
        }),
      };
    }
  }

  const validatedForm = transcribeFormSchema.safeParse({
    audio: uploadedFile,
    meta: parsedMeta,
  });

  if (!validatedForm.success) {
    const issues = validatedForm.error.issues.reduce(
      (acc, issue, index) => {
        acc[`issue_${index}`] = {
          code: issue.code,
          message: issue.message,
          path: issue.path.join("."),
        };
        return acc;
      },
      {} as Record<string, unknown>,
    );
    return {
      success: false as const,
      error: apiError({
        code: "VALIDATION_ERROR",
        message: "Invalid form data",
        details: issues,
        statusCode: 400,
      }),
    };
  }

  return { success: true as const, data: validatedForm.data };
}

// Helper function to process transcription using AI SDK with Groq provider
async function processTranscription(
  uploadedFile: File,
  language: string,
): Promise<
  | {
      success: true;
      data: {
        segments: Array<{
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
        text?: string;
        language?: string;
        duration?: number;
      };
    }
  | { success: false; error: NextResponse }
> {
  console.log("开始处理转录请求 (AI SDK):", {
    fileName: uploadedFile.name,
    fileSize: uploadedFile.size,
    fileType: uploadedFile.type,
    language,
    timestamp: new Date().toISOString(),
  });

  // 检查 API 密钥
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      success: false as const,
      error: apiError({
        code: "API_KEY_MISSING",
        message: "Groq API 密钥未配置",
        details: {
          fileName: uploadedFile.name,
        },
        statusCode: 500,
      }),
    };
  }

  try {
    // 使用 AI SDK 的 transcribe 函数，采用推荐的配置
    // 将 File 转换为 Uint8Array 以适配 AI SDK
    const arrayBuffer = await uploadedFile.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);

    const transcript = await transcribe({
      model: groq.transcription("whisper-large-v3-turbo"),
      audio: audioData,
      providerOptions: {
        groq: {
          language,
          temperature: 0,
          response_format: "verbose_json",
          timestamp_granularities: ["word", "segment"],
        },
      },
    });

    console.log("转录成功完成 (AI SDK):", {
      fileName: uploadedFile.name,
      textLength: transcript.text?.length || 0,
      segmentsCount: transcript.segments?.length || 0,
      durationInSeconds: transcript.durationInSeconds,
      language: transcript.language,
      // 详细调试信息
      fullTranscript: transcript,
      transcriptKeys: Object.keys(transcript),
      segments: transcript.segments,
    });

    // 将 AI SDK 的转录结果转换为兼容格式
    console.log("处理转录结果:", {
      hasText: !!transcript.text,
      hasSegments: !!transcript.segments,
      segmentsType: typeof transcript.segments,
      segmentsLength: Array.isArray(transcript.segments) ? transcript.segments.length : "N/A",
      firstSegment:
        Array.isArray(transcript.segments) && transcript.segments.length > 0
          ? transcript.segments[0]
          : null,
    });

    // 处理segments - 如果AI SDK没有返回segments，生成基本的segments
    let processedSegments: Array<{
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
    }> = [];

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
      console.log("生成的基本segments:", processedSegments.length);
    }

    const transcriptionResponse = {
      text: transcript.text,
      language: transcript.language || language,
      duration: transcript.durationInSeconds,
      segments: processedSegments,
    };

    return { success: true as const, data: transcriptionResponse };
  } catch (transcriptionError) {
    console.error("转录处理失败 (AI SDK):", {
      fileName: uploadedFile.name,
      error:
        transcriptionError instanceof Error
          ? transcriptionError.message
          : String(transcriptionError),
      errorType:
        transcriptionError instanceof Error ? transcriptionError.constructor.name : "Unknown",
      timestamp: new Date().toISOString(),
    });

    // 处理不同类型的错误
    let errorMessage = "转录失败";
    let statusCode = 500;
    let errorCode = "TRANSCRIPTION_ERROR";

    if (transcriptionError instanceof Error) {
      if (transcriptionError.message.includes("API key")) {
        errorMessage = "API 密钥无效或已过期";
        statusCode = 401;
        errorCode = "INVALID_API_KEY";
      } else if (transcriptionError.message.includes("quota")) {
        errorMessage = "API 配额已用完";
        statusCode = 429;
        errorCode = "QUOTA_EXCEEDED";
      } else if (transcriptionError.message.includes("file too large")) {
        errorMessage = "音频文件过大";
        statusCode = 400;
        errorCode = "FILE_TOO_LARGE";
      } else if (transcriptionError.message.includes("unsupported")) {
        errorMessage = "不支持的音频格式";
        statusCode = 400;
        errorCode = "UNSUPPORTED_FORMAT";
      } else {
        errorMessage = transcriptionError.message;
      }
    }

    return {
      success: false as const,
      error: apiError({
        code: errorCode,
        message: errorMessage,
        details: {
          error:
            transcriptionError instanceof Error
              ? transcriptionError.message
              : String(transcriptionError),
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          fileType: uploadedFile.type,
          suggestion: "请检查音频文件格式和大小，或稍后重试",
        },
        statusCode,
      }),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams);
    const queryValidation = validateQueryParams(searchParams);
    if (!queryValidation.success) {
      return queryValidation.error;
    }

    const { language } = queryValidation.data;

    // Parse and validate form data
    const formData = await request.formData();
    const formValidation = validateFormData(formData);
    if (!formValidation.success) {
      return formValidation.error;
    }

    // Process transcription
    const transcriptionResult = await processTranscription(formValidation.data.audio, language);
    if (!transcriptionResult.success) {
      return transcriptionResult.error;
    }

    return apiSuccess({
      status: "completed",
      text: transcriptionResult.data.text,
      language: transcriptionResult.data.language ?? language,
      duration: transcriptionResult.data.duration,
      segments: transcriptionResult.data.segments,
      meta: formValidation.data.meta,
    });
  } catch (error) {
    // 安全处理错误 - 避免暴露敏感信息
    const isProduction = process.env.NODE_ENV === "production";

    return apiError({
      code: "INTERNAL_ERROR",
      message: isProduction
        ? "转录服务暂时不可用，请稍后重试"
        : "Internal server error during transcription",
      details: isProduction
        ? undefined
        : error instanceof Error
          ? { message: error.message, stack: error.stack }
          : undefined,
      statusCode: 500,
    });
  }
}
