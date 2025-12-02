import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiFromError, apiSuccess } from "@/lib/utils/api-response";
import { validationError } from "@/lib/utils/error-handler";
import { processSegmentsOptimized } from "@/lib/utils/optimized-postprocess";

// 验证请求schema
const postProcessSchema = z.object({
  segments: z.array(
    z.object({
      text: z.string(),
      start: z.number(),
      end: z.number(),
      wordTimestamps: z
        .array(
          z.object({
            word: z.string(),
            start: z.number(),
            end: z.number(),
          }),
        )
        .optional(),
    }),
  ),
  language: z.string().optional().default("ja"),
  targetLanguage: z.string().optional().default("en"),
  enableAnnotations: z.boolean().optional().default(true),
  enableFurigana: z.boolean().optional().default(true),
});

/**
 * 验证请求数据
 */
function validateRequestData(body: unknown) {
  const validation = postProcessSchema.safeParse(body);
  if (!validation.success) {
    const error = validationError(
      "Invalid request data",
      validation.error.format(),
    );
    return { isValid: false, error };
  }
  return { isValid: true, data: validation.data };
}

/**
 * 验证segments数据
 */
function validateSegments(
  segments: Array<{ text: string; start: number; end: number }>,
) {
  if (!segments || segments.length === 0) {
    return {
      isValid: false,
      error: {
        code: "NO_SEGMENTS" as const,
        message: "No segments provided for post-processing",
        statusCode: 400,
      },
    };
  }

  if (segments.length > 200) {
    // 提高限制以支持优化后的处理器
    return {
      isValid: false,
      error: {
        code: "TOO_MANY_SEGMENTS" as const,
        message: "Too many segments for post-processing (max: 200)",
        statusCode: 400,
      },
    };
  }

  // 验证每个segment的必需字段
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (
      !segment.text ||
      typeof segment.start !== "number" ||
      typeof segment.end !== "number"
    ) {
      return {
        isValid: false,
        error: {
          code: "INVALID_SEGMENT" as const,
          message: `Invalid segment at index ${i}: missing required fields`,
          statusCode: 400,
        },
      };
    }
  }

  return { isValid: true };
}

/**
 * 处理特定错误类型
 */
function handleSpecificError(error: Error) {
  if (error.message.includes("timeout")) {
    return apiError({
      code: "TIMEOUT",
      message: "Post-processing timeout",
      details: error.message,
      statusCode: 408,
    });
  }

  if (error.message.includes("Rate limit")) {
    return apiError({
      code: "RATE_LIMIT",
      message: "Rate limit exceeded",
      details: error.message,
      statusCode: 429,
    });
  }

  if (error.message.includes("API key")) {
    return apiError({
      code: "AUTH_ERROR",
      message: "API authentication failed",
      details: error.message,
      statusCode: 401,
    });
  }

  return null;
}

/**
 * 验证Groq配置
 */
function validateGroqConfiguration(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.GROQ_API_KEY) {
    errors.push("Groq API key is not configured");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 验证配置
    const configValidation = validateGroqConfiguration();
    if (!configValidation.isValid) {
      return apiError({
        code: "CONFIG_ERROR",
        message: "Groq configuration invalid",
        details: configValidation.errors,
        statusCode: 500,
      });
    }

    // 验证请求数据
    const body = await request.json();
    const validation = validateRequestData(body);
    if (!validation.isValid) {
      return apiError(
        validation.error ?? {
          code: "INVALID_REQUEST" as const,
          message: "Invalid request data",
          statusCode: 400,
        },
      );
    }

    const data = validation.data;
    if (!data) {
      return apiError({
        code: "INVALID_REQUEST" as const,
        message: "Request data is missing",
        statusCode: 400,
      });
    }

    const {
      segments,
      language,
      targetLanguage,
      enableAnnotations,
      enableFurigana,
    } = data;

    // 验证segments
    const segmentValidation = validateSegments(segments);
    if (!segmentValidation.isValid) {
      return apiError(
        segmentValidation.error ?? {
          code: "UNKNOWN_VALIDATION_ERROR" as const,
          message: "Segment validation failed",
          statusCode: 400,
        },
      );
    }

    console.log(
      `🚀 开始后处理 ${segments.length} segments (语言: ${language})`,
    );

    // 使用优化的后处理器
    const processedSegments = await processSegmentsOptimized(
      segments,
      language,
      {
        targetLanguage,
        enableAnnotations,
        enableFurigana,
        maxConcurrent: segments.length > 50 ? 10 : 6, // 大数据集使用更高并发
        batchSize: segments.length > 100 ? 30 : 15,
      },
    );

    // 保留原始数据并添加处理结果
    const finalSegments = processedSegments.map((processedSegment, index) => ({
      ...segments[index], // 保留原始segment数据
      normalizedText: processedSegment.normalizedText,
      translation: processedSegment.translation,
      annotations: processedSegment.annotations,
      furigana: processedSegment.furigana,
    }));

    const totalTime = Date.now() - startTime;
    const avgTimePerSegment = totalTime / segments.length;

    console.log(
      `✅ 后处理API完成! 总耗时: ${totalTime}ms, 平均: ${avgTimePerSegment.toFixed(2)}ms/segment, 处理了 ${finalSegments.length} 个segments`,
    );

    return apiSuccess({
      processedSegments: finalSegments.length,
      segments: finalSegments,
      metrics: {
        totalTime,
        avgTimePerSegment: Math.round(avgTimePerSegment),
        segmentCount: segments.length,
      },
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ 后处理API失败 (耗时: ${totalTime}ms):`, error);

    // 特定错误处理
    if (error instanceof Error) {
      const specificError = handleSpecificError(error);
      if (specificError) {
        return specificError;
      }
    }

    return apiFromError(error, "postprocess/POST");
  }
}
