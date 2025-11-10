import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/utils/api-response";
import { GroqClientFactory } from "@/lib/ai/groq-client-factory";
import { transcribeWithRetry } from "@/lib/ai/groq-retry-strategy";

// Schema for chunked transcription requests
const chunkedTranscriptionSchema = z.object({
  job_id: z.string().min(1, "Job ID is required"),
  chunk_index: z.number().int().min(0, "Chunk index is required"),
  start_time: z.number().float().min(0, "Start time is required"),
  end_time: z.number().float().min(0, "End time is required"),
  duration: z.number().float().min(0.1, "Duration is required"),
  audio: z.any().refine(
    (file) => {
      return (
        file !== null &&
        typeof file === "object" &&
        "name" in file &&
        "size" in file &&
        "arrayBuffer" in file
      );
    },
    { message: "Audio chunk file is required" },
  ),
  language: z.string().default("auto"),
  model: z.string().default("whisper-large-v3-turbo"),
  temperature: z.number().min(0).max(1).default(0),
  response_format: z
    .enum(["json", "verbose_json", "text", "srt", "vtt"])
    .default("verbose_json"),
  timestamp_granularities: z
    .array(z.enum(["word", "segment"]))
    .default(["word", "segment"]),
});

// Helper function to validate request
async function validateChunkedRequest(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract all form fields
    const jobId = formData.get("job_id") as string;
    const chunkIndex = parseInt(formData.get("chunk_index") as string);
    const startTime = parseFloat(formData.get("start_time") as string);
    const endTime = parseFloat(formData.get("end_time") as string);
    const duration = parseFloat(formData.get("duration") as string);
    const audio = formData.get("audio");
    const language = (formData.get("language") as string) || "auto";
    const model = (formData.get("model") as string) || "whisper-large-v3-turbo";
    const temperature = parseFloat(formData.get("temperature") as string) || 0;
    const responseFormat =
      (formData.get("response_format") as string) || "verbose_json";
    const timestampGranularities = (formData.getAll(
      "timestamp_granularities",
    ) as string[]) || ["word", "segment"];

    const validated = chunkedTranscriptionSchema.safeParse({
      job_id: jobId,
      chunk_index: chunkIndex,
      start_time: startTime,
      end_time: endTime,
      duration: duration,
      audio,
      language,
      model,
      temperature,
      response_format: responseFormat,
      timestamp_granularities: timestampGranularities,
    });

    if (!validated.success) {
      return {
        success: false as const,
        error: apiError({
          code: "VALIDATION_ERROR",
          message: "Invalid chunked transcription request",
          details: validated.error.errors,
          statusCode: 400,
        }),
      };
    }

    return { success: true as const, data: validated.data };
  } catch (error) {
    return {
      success: false as const,
      error: apiError({
        code: "FORM_PARSE_ERROR",
        message: "Failed to parse form data",
        details: error instanceof Error ? error.message : String(error),
        statusCode: 400,
      }),
    };
  }
}

// Helper function to process chunked transcription
async function processChunkedTranscription(
  data: z.infer<typeof chunkedTranscriptionSchema>,
) {
  console.log("开始处理分块转录:", {
    jobId: data.job_id,
    chunkIndex: data.chunk_index,
    startTime: data.start_time,
    endTime: data.end_time,
    duration: data.duration,
    audioSize: (data.audio as File).size,
    language: data.language,
    model: data.model,
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
        statusCode: 500,
      }),
    };
  }

  // 使用增强的 Groq 客户端
  const groqClientFactory = GroqClientFactory.getInstance();
  const groq = groqClientFactory.getClient({
    apiKey,
    timeout: parseInt(process.env.GROQ_TIMEOUT_MS || "25000"),
    maxRetries: parseInt(process.env.GROQ_MAX_RETRIES || "2"),
  });

  try {
    // 使用增强的重试策略进行分块转录
    const transcription = await transcribeWithRetry(
      async () => {
        return await groq.audio.transcriptions.create({
          file: data.audio,
          model: data.model,
          temperature: data.temperature,
          response_format: data.response_format,
          language: data.language === "auto" ? undefined : data.language,
          timestamp_granularities: data.timestamp_granularities,
        });
      },
      {
        maxAttempts: 3,
        baseDelay: 1500,
        maxDelay: 10000,
        backoffFactor: 2,
        onRetry: (attempt, error, delay) => {
          console.warn(
            `分块 ${data.chunk_index} 重试第 ${attempt} 次，延迟 ${delay}ms:`,
            error.message,
          );
        },
        onFailed: (error, attempts) => {
          console.error(
            `分块 ${data.chunk_index} 经过 ${attempts} 次尝试后失败:`,
            error.message,
          );
        },
      },
    );

    const transcriptionData = transcription as any;

    console.log("分块转录成功:", {
      jobId: data.job_id,
      chunkIndex: data.chunk_index,
      textLength: transcription.text?.length || 0,
      duration: transcriptionData.duration,
      language: transcriptionData.language,
    });

    // 处理转录结果
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

    // 调整时间戳，使其基于原始音频的绝对时间
    if (transcriptionData.segments && transcriptionData.segments.length > 0) {
      processedSegments = transcriptionData.segments.map(
        (segment: any, index: number) => ({
          start: segment.start + data.start_time,
          end: segment.end + data.start_time,
          text: segment.text || "",
          wordTimestamps: segment.words?.map((word: any) => ({
            word: word.word,
            start: word.start + data.start_time,
            end: word.end + data.start_time,
          })),
          confidence: segment.confidence || 0.95,
          id: index + 1,
        }),
      );
    }

    return {
      success: true as const,
      data: {
        chunk_id: `${data.job_id}_chunk_${data.chunk_index}`,
        job_id: data.job_id,
        chunk_index: data.chunk_index,
        start_time: data.start_time,
        end_time: data.end_time,
        text: transcription.text,
        language: transcriptionData.language || data.language,
        duration: transcriptionData.duration,
        segments: processedSegments,
        processing_time: Date.now(), // 实际应该测量转录时间
        model: data.model,
        temperature: data.temperature,
      },
    };
  } catch (transcriptionError) {
    console.error("分块转录失败:", {
      jobId: data.job_id,
      chunkIndex: data.chunk_index,
      error:
        transcriptionError instanceof Error
          ? transcriptionError.message
          : String(transcriptionError),
      timestamp: new Date().toISOString(),
    });

    // 处理不同类型的错误
    let errorMessage = "分块转录失败";
    let statusCode = 500;
    let errorCode = "CHUNK_TRANSCRIPTION_ERROR";

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
        errorMessage = "音频分块过大";
        statusCode = 400;
        errorCode = "CHUNK_TOO_LARGE";
      } else if (transcriptionError.message.includes("timeout")) {
        errorMessage = "转录超时";
        statusCode = 408;
        errorCode = "TRANSCRIPTION_TIMEOUT";
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
          jobId: data.job_id,
          chunkIndex: data.chunk_index,
          startTime: data.start_time,
          endTime: data.end_time,
          suggestion: "请检查音频分块和网络连接，稍后重试",
        },
        statusCode,
      }),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证请求
    const validationResult = validateChunkedRequest(request);
    if (!validationResult.success) {
      return validationResult.error;
    }

    const data = validationResult.data;

    // 处理分块转录
    const transcriptionResult = await processChunkedTranscription(data);
    if (!transcriptionResult.success) {
      return transcriptionResult.error;
    }

    return apiSuccess({
      status: "completed",
      chunk_id: transcriptionResult.data.chunk_id,
      job_id: transcriptionResult.data.job_id,
      chunk_index: transcriptionResult.data.chunk_index,
      start_time: transcriptionResult.data.start_time,
      end_time: transcriptionResult.data.end_time,
      text: transcriptionResult.data.text,
      language: transcriptionResult.data.language,
      duration: transcriptionResult.data.duration,
      segments: transcriptionResult.data.segments,
      model: transcriptionResult.data.model,
      temperature: transcriptionResult.data.temperature,
      processing_time: transcriptionResult.data.processing_time,
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";

    return apiError({
      code: "INTERNAL_ERROR",
      message: isProduction
        ? "分块转录服务暂时不可用，请稍后重试"
        : "Internal server error during chunked transcription",
      details: isProduction
        ? undefined
        : error instanceof Error
          ? { message: error.message, stack: error.stack }
          : undefined,
      statusCode: 500,
    });
  }
}
