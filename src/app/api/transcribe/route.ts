import Groq from "groq-sdk";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/utils/api-response";

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

// Helper function to process transcription using Groq SDK
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
  console.log("开始处理转录请求 (Groq SDK):", {
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

  // 初始化 Groq 客户端
  const groq = new Groq({ apiKey });

  try {
    // 使用 Groq SDK 进行转录
    // Groq SDK 可以直接接受 File 对象
    const transcription = await groq.audio.transcriptions.create({
      file: uploadedFile, // 直接使用 File 对象
      model: "whisper-large-v3-turbo",
      temperature: 0,
      response_format: "verbose_json",
      language: language === "auto" ? undefined : language,
      timestamp_granularities: ["word", "segment"],
    });

    // 使用类型断言访问可能的属性
    const transcriptionData = transcription as any;

    console.log("转录成功完成 (Groq SDK):", {
      fileName: uploadedFile.name,
      textLength: transcription.text?.length || 0,
      duration: transcriptionData.duration,
      language: transcriptionData.language,
      // 详细调试信息
      transcriptionKeys: Object.keys(transcriptionData),
    });

    // 处理 Groq SDK 返回的转录结果
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

    if (transcriptionData.segments && transcriptionData.segments.length > 0) {
      // 使用 Groq SDK 返回的 segments
      processedSegments = transcriptionData.segments.map((segment: any, index: number) => ({
        start: segment.start || 0,
        end: segment.end || 0,
        text: segment.text || "",
        wordTimestamps: segment.words?.map((word: any) => ({
          word: word.word,
          start: word.start,
          end: word.end,
        })),
        confidence: segment.confidence || 0.95,
        id: index + 1,
      }));
      console.log("使用 Groq SDK 返回的 segments:", processedSegments.length);
    } else if (transcriptionData.words && transcriptionData.words.length > 0) {
      // 如果没有 segments 但有 words，根据 words 生成 segments
      console.log("Groq SDK 未返回 segments，根据 words 生成");
      const wordsPerSegment = 10; // 每10个词组成一个segment
      for (let i = 0; i < transcriptionData.words.length; i += wordsPerSegment) {
        const segmentWords = transcriptionData.words.slice(i, i + wordsPerSegment);
        if (segmentWords.length > 0) {
          processedSegments.push({
            start: segmentWords[0].start,
            end: segmentWords[segmentWords.length - 1].end,
            text: segmentWords.map((w: any) => w.word).join(" "),
            wordTimestamps: segmentWords.map((word: any) => ({
              word: word.word,
              start: word.start,
              end: word.end,
            })),
            confidence: 0.95,
            id: Math.floor(i / wordsPerSegment) + 1,
          });
        }
      }
      console.log("根据 words 生成的 segments:", processedSegments.length);
    } else if (transcription.text && transcription.text.length > 0) {
      // 生成基本的segments：按句子分割
      console.log("Groq SDK 未返回详细数据，生成基本 segments");
      const sentences = transcription.text.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0);
      const avgWordsPerSecond = 2.5; // 假设平均每秒2.5个词
      const totalDuration =
        transcriptionData.duration || transcription.text.length / avgWordsPerSecond;

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
      console.log("生成的基本 segments:", processedSegments.length);
    }

    const transcriptionResponse = {
      text: transcription.text,
      language: transcriptionData.language || language,
      duration: transcriptionData.duration,
      segments: processedSegments,
    };

    return { success: true as const, data: transcriptionResponse };
  } catch (transcriptionError) {
    console.error("转录处理失败 (Groq SDK):", {
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
