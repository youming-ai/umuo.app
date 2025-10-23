import Groq from "groq-sdk";

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

// 懒加载Groq客户端
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY || "";
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY 环境变量未设置。请在 .env.local 文件中设置 GROQ_API_KEY=your_api_key_here",
      );
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

/**
 * 使用 openai/gpt-oss-20b 模型对文本进行后处理
 * 添加 romaji 和中文翻译
 */
export async function postProcessText(
  text: string,
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
${text}`;

    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content:
            "你是一个专业的日语文本处理助手，专门为日语学习材料添加罗马音和中文翻译。请严格按照JSON格式返回结果。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("未收到有效的响应内容");
    }

    try {
      const result = JSON.parse(content);
      return {
        originalText: text,
        processedText: text,
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
