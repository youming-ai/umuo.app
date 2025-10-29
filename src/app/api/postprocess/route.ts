import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiFromError, apiSuccess } from "@/lib/utils/api-response";
import { validationError } from "@/lib/utils/error-handler";

// 使用 Node.js runtime 以兼容 OpenNext Cloudflare
// export const runtime = "edge"; // 已注释掉以兼容 OpenNext

const GROQ_MODEL = "openai/gpt-oss-20b";

// Type definitions for processed segments
interface ProcessedSegment {
  id: number;
  normalizedText: string;
  translation?: string;
  annotations?: Array<{
    text: string;
    type: string;
    reading?: string;
  }>;
}

interface PostProcessResult {
  originalText: string;
  normalizedText: string;
  translation: string | undefined;
  annotations: string[] | undefined;
  furigana?: string;
  start: number;
  end: number;
}

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

  if (segments.length > 100) {
    return {
      isValid: false,
      error: {
        code: "TOO_MANY_SEGMENTS" as const,
        message: "Too many segments for post-processing (max: 100)",
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

const defaultOptions = {
  targetLanguage: "en",
  enableAnnotations: true,
  enableFurigana: true,
};

// AI SDK 使用内置的优化配置，无需手动管理客户端

function buildPrompt(
  text: string,
  sourceLanguage: string,
  targetLanguage?: string,
  enableAnnotations: boolean = true,
  enableFurigana: boolean = true,
): string {
  let basePrompt = `You are a professional language teacher specializing in Japanese language learning and shadowing practice.\n\nTask: Process the following ${sourceLanguage} text for language learners.\n\nInput:\n${text}\n\nRequirements:\n1. Normalize the text (remove filler words, fix grammar, etc.)\n2. ${targetLanguage ? `Provide translation to ${targetLanguage}` : "Keep original language"}`;

  if (enableAnnotations) {
    basePrompt += `\n3. Add grammatical and cultural annotations`;
  }

  if (enableFurigana && sourceLanguage === "ja") {
    basePrompt += `\n4. Include furigana for kanji`;
  }

  basePrompt += `\n\nOutput format:\n{\n  "normalizedText": "Clean, normalized text",\n  "translation": "Translation if requested",\n  "annotations": ["List of annotations"],\n  "furigana": "Text with furigana if applicable",\n  "terminology": {"term": "reading and definition"}\n}`;

  return basePrompt;
}

interface GroqPostProcessResponse {
  normalizedText: string;
  translation?: string;
  annotations?: string[];
  furigana?: string;
  terminology?: Record<string, string>;
}

function parseGroqResponse(responseText: string): GroqPostProcessResponse {
  try {
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
    if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);

    const jsonStart = cleanedText.indexOf("{");
    const jsonEnd = cleanedText.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }

    const payload = JSON.parse(cleanedText);
    return {
      normalizedText: payload.normalizedText || payload.text || "",
      translation: payload.translation,
      annotations: payload.annotations || [],
      furigana: payload.furigana,
      terminology: payload.terminology || {},
    };
  } catch (_error) {
    return {
      normalizedText: responseText || "",
      translation: "",
      annotations: [],
      furigana: "",
      terminology: {},
    };
  }
}

async function postProcessSegmentWithGroq(
  segment: { text: string; start: number; end: number },
  sourceLanguage: string,
  options: {
    targetLanguage?: string;
    enableAnnotations?: boolean;
    enableFurigana?: boolean;
  },
) {
  const startTime = Date.now();

  try {
    const prompt = buildPrompt(
      segment.text,
      sourceLanguage,
      options.targetLanguage,
      options.enableAnnotations,
      options.enableFurigana,
    );

    // 使用 AI SDK 的 generateText 函数
    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      temperature: 0.3,
      system:
        "You are a professional language teacher specializing in Japanese language learning and shadowing practice. Provide accurate, educational responses that help learners understand and practice the language. Respond with valid JSON.",
      prompt,
      maxRetries: 1,
    });

    const parsed = parseGroqResponse(text);

    const processingTime = Date.now() - startTime;
    console.log(`单个segment AI SDK处理完成，耗时: ${processingTime}ms`);

    return {
      originalText: segment.text,
      normalizedText: parsed.normalizedText,
      translation: parsed.translation,
      annotations: parsed.annotations,
      furigana: parsed.furigana,
      start: segment.start,
      end: segment.end,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(
      `单个segment AI SDK处理失败，耗时: ${processingTime}ms，错误:`,
      error,
    );

    // 抛出错误让上层处理fallback
    throw error;
  }
}

// 批量处理短文本以减少API调用次数，使用 AI SDK
async function postProcessShortTextsBatch(
  shortTextSegments: Array<{ text: string; start: number; end: number }>,
  _sourceLanguage: string,
  _options: {
    targetLanguage?: string;
    enableAnnotations?: boolean;
    enableFurigana?: boolean;
  },
) {
  if (shortTextSegments.length === 0) return [];

  console.log(`AI SDK批量处理 ${shortTextSegments.length} 个短文本segments`);
  const startTime = Date.now();

  try {
    // 合并所有短文本为一个批次
    const combinedText = shortTextSegments
      .map((seg, index) => `[SEGMENT_${index}] ${seg.text}`)
      .join("\n");

    const prompt = `You are processing multiple short text segments for Japanese language learning.

Process the following segments and return results in the specified format:

${combinedText}

Return format (JSON):
{
  "segments": [
    {
      "id": 0,
      "normalizedText": "normalized text",
      "translation": "translation",
      "annotations": ["annotation1", "annotation2"],
      "furigana": "text with furigana"
    }
  ]
}`;

    // 使用 AI SDK 的 generateText 函数进行批量处理
    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      temperature: 0.3,
      system:
        "You are a professional language teacher specializing in Japanese language learning. Process multiple text segments efficiently. Respond with valid JSON.",
      prompt,
      maxRetries: 1,
    });

    // 清理响应中的markdown代码块标记
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
    if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);

    const jsonStart = cleanedText.indexOf("{");
    const jsonEnd = cleanedText.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }

    const response = JSON.parse(cleanedText);

    // 将批量处理结果映射回各个segment
    if (response.segments && Array.isArray(response.segments)) {
      const processingTime = Date.now() - startTime;
      console.log(`批量AI SDK处理完成，耗时: ${processingTime}ms`);

      return shortTextSegments.map((originalSegment, index) => {
        const processedSegment = response.segments.find(
          (s: ProcessedSegment) => s.id === index,
        );
        return {
          originalText: originalSegment.text,
          normalizedText:
            processedSegment?.normalizedText || originalSegment.text,
          translation: processedSegment?.translation || "",
          annotations: processedSegment?.annotations || [],
          furigana: processedSegment?.furigana || "",
          start: originalSegment.start,
          end: originalSegment.end,
        };
      });
    }

    // Fallback: 如果解析失败，返回原始文本
    const processingTime = Date.now() - startTime;
    console.warn(
      `批量AI SDK处理解析失败，使用fallback，耗时: ${processingTime}ms`,
    );

    return shortTextSegments.map((segment) => ({
      originalText: segment.text,
      normalizedText: segment.text,
      translation: "",
      annotations: [],
      furigana: "",
      start: segment.start,
      end: segment.end,
    }));
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(
      `批量AI SDK处理失败，耗时: ${processingTime}ms，错误:`,
      error,
    );

    // 返回fallback结果
    return shortTextSegments.map((segment) => ({
      originalText: segment.text,
      normalizedText: segment.text,
      translation: "",
      annotations: [],
      furigana: "",
      start: segment.start,
      end: segment.end,
    }));
  }
}

async function postProcessSegmentsWithGroq(
  segments: Array<{ text: string; start: number; end: number }>,
  sourceLanguage: string,
  options: {
    targetLanguage?: string;
    enableAnnotations?: boolean;
    enableFurigana?: boolean;
  },
) {
  const finalOptions = { ...defaultOptions, ...options };

  // 智能性能优化：动态调整并发参数
  const SHORT_TEXT_THRESHOLD = 50; // 50个字符以下认为是短文本

  // 根据segments数量动态调整并发数和批次大小
  const segmentCount = segments.length;
  let MAX_CONCURRENT = 3;
  let BATCH_SIZE = 5;

  if (segmentCount <= 3) {
    MAX_CONCURRENT = 2;
    BATCH_SIZE = 3;
  } else if (segmentCount <= 10) {
    MAX_CONCURRENT = 3;
    BATCH_SIZE = 4;
  } else if (segmentCount <= 20) {
    MAX_CONCURRENT = 4;
    BATCH_SIZE = 5;
  } else {
    MAX_CONCURRENT = 5;
    BATCH_SIZE = 6;
  }

  console.log(
    `开始后处理 ${segments.length} 个segments，使用 ${MAX_CONCURRENT} 并发`,
  );
  const startTime = Date.now();

  // 分离短文本和长文本
  const shortTextSegments = segments.filter(
    (seg) => seg.text.length <= SHORT_TEXT_THRESHOLD,
  );
  const longTextSegments = segments.filter(
    (seg) => seg.text.length > SHORT_TEXT_THRESHOLD,
  );

  console.log(
    `短文本: ${shortTextSegments.length} 个，长文本: ${longTextSegments.length} 个`,
  );

  const allResults: PostProcessResult[] = [];

  // 批量处理短文本
  if (shortTextSegments.length > 0) {
    const shortTextResults = await postProcessShortTextsBatch(
      shortTextSegments,
      sourceLanguage,
      finalOptions,
    );
    allResults.push(...shortTextResults);
    console.log(`短文本批量处理完成: ${shortTextResults.length} 个`);
  }

  // 逐个处理长文本（保持原有的并发逻辑）
  if (longTextSegments.length > 0) {
    const batches: Array<typeof longTextSegments> = [];
    for (let i = 0; i < longTextSegments.length; i += BATCH_SIZE) {
      batches.push(longTextSegments.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(
        `处理长文本第 ${batchIndex + 1}/${batches.length} 批，包含 ${batch.length} 个segments`,
      );

      const batchPromises = batch.map(async (segment, segmentIndex) => {
        try {
          const processed = await postProcessSegmentWithGroq(
            segment,
            sourceLanguage,
            finalOptions,
          );
          console.log(
            `长文本Segment ${segmentIndex + 1}/${batch.length} 处理完成`,
          );
          return processed;
        } catch (error) {
          console.error(
            `长文本Segment ${segmentIndex + 1}/${batch.length} 处理失败:`,
            error,
          );
          return {
            originalText: segment.text,
            normalizedText: segment.text,
            translation: "",
            annotations: [],
            furigana: "",
            start: segment.start,
            end: segment.end,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          allResults.push(result.value);
        } else {
          console.warn("Long text batch result rejected:", result.reason);
          allResults.push({
            originalText: "",
            normalizedText: "",
            translation: "",
            annotations: undefined,
            furigana: "",
            start: 0,
            end: 0,
          });
        }
      }

      if (batchIndex < batches.length - 1) {
        // 优化批次间延迟策略：根据并发数动态调整，更激进
        const delay = Math.min(200, Math.max(50, MAX_CONCURRENT * 50)); // 进一步减少延迟
        console.log(`长文本批次间延迟 ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const endTime = Date.now();
  console.log(
    `后处理完成，总耗时: ${endTime - startTime}ms，处理了 ${allResults.length} 个segments`,
  );

  return allResults;
}

export async function POST(request: NextRequest) {
  try {
    // 验证Groq配置
    const configValidation = validateGroqConfiguration();
    if (!configValidation.isValid) {
      return apiError({
        code: "CONFIG_ERROR",
        message: "Groq configuration invalid",
        details: configValidation.errors,
        statusCode: 500,
      });
    }

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

    // 验证输入数据
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

    const processedSegments = await postProcessSegmentsWithGroq(
      segments,
      language,
      {
        targetLanguage,
        enableAnnotations,
        enableFurigana,
      },
    );

    // Return processed segments with original metadata preserved
    const finalSegments = processedSegments.map((processedSegment, index) => ({
      ...segments[index], // Preserve original segment data
      normalizedText: processedSegment.normalizedText,
      translation: processedSegment.translation,
      annotations: processedSegment.annotations,
      furigana: processedSegment.furigana,
    }));

    return apiSuccess({
      processedSegments: finalSegments.length,
      segments: finalSegments,
    });
  } catch (error) {
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

// GET endpoint is not needed for stateless API

// PATCH endpoint is not needed for stateless API
