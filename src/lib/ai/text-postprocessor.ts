import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

interface PostProcessOptions {
  language?: string;
}

interface ProcessedText {
  originalText: string;
  processedText: string;
  romaji?: string;
  chineseTranslation?: string;
  segments: Array<{
    text: string;
    romaji?: string;
    chineseTranslation?: string;
    start: number;
    end: number;
  }>;
}

// AI SDK 使用内置的优化配置，无需手动管理客户端

/**
 * 使用 openai/gpt-oss-20b 模型对文本进行后处理
 * 添加 romaji 和中文翻译
 */
export async function postProcessText(
  inputText: string,
  _options: PostProcessOptions = {},
): Promise<ProcessedText> {
  // 检查是否在浏览器环境中
  if (typeof window === "undefined") {
    throw new Error("文本处理功能只能在浏览器环境中使用");
  }

  try {
    const prompt = `请对以下日语文本进行处理，为每段文本添加：
1. 罗马音注音 (romaji)
2. 中文翻译

请以JSON格式返回，格式如下：
{
  "segments": [
    {
      "text": "原始日语文本",
      "romaji": "罗马音注音",
      "chineseTranslation": "中文翻译",
      "start": 0,
      "end": 2.5
    }
  ]
}

文本内容：
${inputText}`;

    // 使用 AI SDK 的 generateText 函数
    const { text } = await generateText({
      model: groq("openai/gpt-oss-20b"),
      temperature: 0.3,
      system:
        "你是一个专业的日语文本处理助手，专门为日语学习材料添加罗马音和中文翻译。请严格按照JSON格式返回结果。",
      prompt,
      maxRetries: 1,
    });

    if (!text) {
      throw new Error("未收到有效的响应内容");
    }

    try {
      const result = JSON.parse(text);
      return {
        originalText: inputText,
        processedText: inputText,
        segments: result.segments || [],
      };
    } catch (parseError) {
      console.error("解析响应内容失败:", parseError);
      throw new Error("解析处理结果失败");
    }
  } catch (error) {
    console.error("文本后处理失败:", error);
    throw new Error(`文本处理失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 处理转录后的完整音频片段
 */
export async function postProcessTranscription(
  segments: Array<{
    text: string;
    start: number;
    end: number;
  }>,
  options: PostProcessOptions = {},
): Promise<ProcessedText> {
  const fullText = segments.map((seg) => seg.text).join("\n");

  try {
    const processed = await postProcessText(fullText, options);

    // 将处理结果映射回原始时间段
    const enrichedSegments = segments.map((segment, index) => {
      const processedSegment = processed.segments[index];
      return {
        text: segment.text,
        romaji: processedSegment?.romaji,
        chineseTranslation: processedSegment?.chineseTranslation,
        start: segment.start,
        end: segment.end,
      };
    });

    return {
      originalText: fullText,
      processedText: fullText,
      segments: enrichedSegments,
    };
  } catch (error) {
    console.error("转录后处理失败:", error);
    // 返回未处理的原始结果
    return {
      originalText: fullText,
      processedText: fullText,
      segments: segments.map((seg) => ({
        ...seg,
        romaji: undefined,
        chineseTranslation: undefined,
      })),
    };
  }
}
