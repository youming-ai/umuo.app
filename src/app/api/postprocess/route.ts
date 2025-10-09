import Groq from "groq-sdk";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiFromError, apiSuccess } from "@/lib/api-response";
import { validationError } from "@/lib/error-handler";

const GROQ_MODEL = "openai/gpt-oss-20b";

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
    const error = validationError("Invalid request data", validation.error.format());
    return { isValid: false, error };
  }
  return { isValid: true, data: validation.data };
}

/**
 * 验证segments数据
 */
function validateSegments(segments: Array<{ text: string; start: number; end: number }>) {
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
    if (!segment.text || typeof segment.start !== "number" || typeof segment.end !== "number") {
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

let groqChatClient: Groq | null = null;

function getGroqChatClient(): Groq {
  if (!groqChatClient) {
    groqChatClient = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
  }
  return groqChatClient;
}

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
  const prompt = buildPrompt(
    segment.text,
    sourceLanguage,
    options.targetLanguage,
    options.enableAnnotations,
    options.enableFurigana,
  );

  const client = getGroqChatClient();
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are a professional language teacher specializing in Japanese language learning and shadowing practice. Provide accurate, educational responses that help learners understand and practice the language.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = completion.choices?.[0]?.message?.content ?? "";
  const parsed = parseGroqResponse(responseText);

  return {
    originalText: segment.text,
    normalizedText: parsed.normalizedText,
    translation: parsed.translation,
    annotations: parsed.annotations,
    furigana: parsed.furigana,
    start: segment.start,
    end: segment.end,
  };
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
  const results = [];

  for (const segment of segments) {
    const processed = await postProcessSegmentWithGroq(segment, sourceLanguage, finalOptions);
    results.push(processed);
    // Delay slightly to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
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
    const { segments, language, targetLanguage, enableAnnotations, enableFurigana } = data;

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

    const processedSegments = await postProcessSegmentsWithGroq(segments, language, {
      targetLanguage,
      enableAnnotations,
      enableFurigana,
    });

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
