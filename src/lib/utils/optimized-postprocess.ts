/**
 * 优化的后处理模块
 * 提供高性能的segments处理，支持智能分类、并发控制和批处理
 */

import Groq from "groq-sdk";

export interface Segment {
  text: string;
  start: number;
  end: number;
}

export interface ProcessedSegment {
  originalText: string;
  normalizedText: string;
  translation?: string;
  annotations?: string[];
  furigana?: string;
  start: number;
  end: number;
}

export interface PostProcessOptions {
  targetLanguage?: string;
  enableAnnotations?: boolean;
  enableFurigana?: boolean;
  maxConcurrent?: number;
  batchSize?: number;
}

const DEFAULT_OPTIONS: Required<PostProcessOptions> = {
  targetLanguage: "en",
  enableAnnotations: true,
  enableFurigana: true,
  maxConcurrent: 8,
  batchSize: 20,
};

const GROQ_CHAT_MODEL = "openai/gpt-oss-20b";

class OptimizedPostProcessor {
  private groqClient: Groq;

  constructor() {
    this.groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * 主要处理入口 - 智能分类和并行处理
   */
  async processSegments(
    segments: Segment[],
    sourceLanguage: string,
    options: PostProcessOptions = {},
  ): Promise<ProcessedSegment[]> {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    console.log(`🚀 开始优化后处理: ${segments.length} segments`);

    // 智能文本分类
    const categorizedSegments = this.categorizeSegments(segments);
    console.log(
      `文本分类: 极短 ${categorizedSegments.ultraShort.length}, ` +
        `短 ${categorizedSegments.short.length}, ` +
        `中 ${categorizedSegments.medium.length}, ` +
        `长 ${categorizedSegments.long.length}`,
    );

    // 并行处理所有类别
    const processingPromises = [
      this.processUltraShortTexts(categorizedSegments.ultraShort, sourceLanguage, finalOptions),
      this.processShortTexts(categorizedSegments.short, sourceLanguage, finalOptions),
      this.processMediumTexts(categorizedSegments.medium, sourceLanguage, finalOptions),
      this.processLongTexts(categorizedSegments.long, sourceLanguage, finalOptions),
    ];

    const results = await Promise.allSettled(processingPromises);
    const allProcessed: ProcessedSegment[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        allProcessed.push(...result.value);
        const categoryNames = ["极短文本", "短文本", "中等文本", "长文本"];
        console.log(`✅ ${categoryNames[index]}处理完成: ${result.value.length} 个`);
      } else {
        console.error(`❌ 处理类别 ${index} 失败:`, result.reason);
      }
    });

    // 保持原始顺序
    const orderedResults = this.maintainOriginalOrder(segments, allProcessed);

    const endTime = Date.now();
    const processingTime = endTime - startTime;
    const avgTimePerSegment = processingTime / segments.length;

    console.log(
      `🎉 优化后处理完成! 总耗时: ${processingTime}ms, ` +
        `平均: ${avgTimePerSegment.toFixed(2)}ms/segment`,
    );

    return orderedResults;
  }

  /**
   * 智能文本分类
   */
  private categorizeSegments(segments: Segment[]) {
    const ULTRA_SHORT_THRESHOLD = 15;
    const SHORT_THRESHOLD = 50;
    const MEDIUM_THRESHOLD = 120;

    return {
      ultraShort: segments.filter((seg) => seg.text.length <= ULTRA_SHORT_THRESHOLD),
      short: segments.filter(
        (seg) => seg.text.length > ULTRA_SHORT_THRESHOLD && seg.text.length <= SHORT_THRESHOLD,
      ),
      medium: segments.filter(
        (seg) => seg.text.length > SHORT_THRESHOLD && seg.text.length <= MEDIUM_THRESHOLD,
      ),
      long: segments.filter((seg) => seg.text.length > MEDIUM_THRESHOLD),
    };
  }

  /**
   * 处理极短文本 - 超大批量
   */
  private async processUltraShortTexts(
    segments: Segment[],
    sourceLanguage: string,
    options: Required<PostProcessOptions>,
  ): Promise<ProcessedSegment[]> {
    if (segments.length === 0) return [];

    const BATCH_SIZE = 50; // 极大批次
    const results: ProcessedSegment[] = [];

    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      const batch = segments.slice(i, i + BATCH_SIZE);
      const batchResults = await this.processBatchOptimized(batch, sourceLanguage, options);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 处理短文本 - 并行批量
   */
  private async processShortTexts(
    segments: Segment[],
    sourceLanguage: string,
    options: Required<PostProcessOptions>,
  ): Promise<ProcessedSegment[]> {
    if (segments.length === 0) return [];

    const BATCH_SIZE = 25;
    const CONCURRENT_BATCHES = Math.min(4, Math.ceil(segments.length / BATCH_SIZE));
    const results: ProcessedSegment[] = [];

    // 创建批次
    const batches: Segment[][] = [];
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      batches.push(segments.slice(i, i + BATCH_SIZE));
    }

    // 并行处理批次
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const currentBatches = batches.slice(i, i + CONCURRENT_BATCHES);
      const batchPromises = currentBatches.map((batch) =>
        this.processBatchOptimized(batch, sourceLanguage, options),
      );

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(...result.value);
        }
      });

      // 微小延迟
      if (i + CONCURRENT_BATCHES < batches.length) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }

    return results;
  }

  /**
   * 处理中等长度文本 - 适中的并发
   */
  private async processMediumTexts(
    segments: Segment[],
    sourceLanguage: string,
    options: Required<PostProcessOptions>,
  ): Promise<ProcessedSegment[]> {
    if (segments.length === 0) return [];

    const CONCURRENT = Math.min(6, segments.length);
    const chunks = this.chunkArray(segments, Math.ceil(segments.length / CONCURRENT));

    const chunkPromises = chunks.map((chunk) =>
      this.processChunkSequentially(chunk, sourceLanguage, options),
    );

    const chunkResults = await Promise.allSettled(chunkPromises);
    const results: ProcessedSegment[] = [];

    chunkResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(...result.value);
      }
    });

    return results;
  }

  /**
   * 处理长文本 - 保守并发
   */
  private async processLongTexts(
    segments: Segment[],
    sourceLanguage: string,
    options: Required<PostProcessOptions>,
  ): Promise<ProcessedSegment[]> {
    if (segments.length === 0) return [];

    const CONCURRENT = Math.min(3, segments.length);
    const chunks = this.chunkArray(segments, Math.ceil(segments.length / CONCURRENT));

    const chunkPromises = chunks.map(
      (chunk) => this.processChunkSequentially(chunk, sourceLanguage, options, 100), // 长文本增加延迟
    );

    const chunkResults = await Promise.allSettled(chunkPromises);
    const results: ProcessedSegment[] = [];

    chunkResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(...result.value);
      }
    });

    return results;
  }

  /**
   * 优化的批量处理
   */
  private async processBatchOptimized(
    segments: Segment[],
    sourceLanguage: string,
    options: Required<PostProcessOptions>,
  ): Promise<ProcessedSegment[]> {
    if (segments.length === 1) {
      return [await this.processSingleSegment(segments[0], sourceLanguage, options)];
    }

    const combinedText = segments.map((seg, index) => `[SEGMENT_${index}] ${seg.text}`).join("\n");

    const prompt = this.buildBatchPrompt(combinedText, sourceLanguage, options);

    try {
      const response = await this.groqClient.chat.completions.create({
        model: GROQ_CHAT_MODEL,
        temperature: 0.2, // 降低温度提高一致性
        messages: [
          {
            role: "system",
            content:
              "You are a professional language teacher. Process multiple text segments efficiently. Respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
      });

      const responseText = response.choices[0]?.message?.content || "";
      const parsedResponse = this.parseBatchResponse(responseText, segments.length);

      return segments.map((segment, index) => {
        const processed = parsedResponse.segments[index];
        return {
          originalText: segment.text,
          normalizedText: processed?.normalizedText || segment.text,
          translation: processed?.translation || "",
          annotations: processed?.annotations || [],
          furigana: processed?.furigana || "",
          start: segment.start,
          end: segment.end,
        };
      });
    } catch (error) {
      console.error("批量处理失败，使用fallback:", error);
      return this.createFallbackResults(segments);
    }
  }

  /**
   * 顺序处理块
   */
  private async processChunkSequentially(
    segments: Segment[],
    sourceLanguage: string,
    options: Required<PostProcessOptions>,
    delay: number = 50,
  ): Promise<ProcessedSegment[]> {
    const results: ProcessedSegment[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      try {
        const processed = await this.processSingleSegment(segment, sourceLanguage, options);
        results.push(processed);
      } catch (error) {
        console.error(`处理segment ${i} 失败:`, error);
        results.push(this.createFallbackResult(segment));
      }

      // 添加延迟以避免API限流
      if (i < segments.length - 1 && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * 处理单个segment
   */
  private async processSingleSegment(
    segment: Segment,
    sourceLanguage: string,
    options: Required<PostProcessOptions>,
  ): Promise<ProcessedSegment> {
    const prompt = this.buildSinglePrompt(segment.text, sourceLanguage, options);

    const response = await this.groqClient.chat.completions.create({
      model: GROQ_CHAT_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a professional language teacher. Provide accurate, educational responses. Respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const responseText = response.choices[0]?.message?.content || "";
    const parsed = this.parseSingleResponse(responseText);

    return {
      originalText: segment.text,
      normalizedText: parsed.normalizedText || segment.text,
      translation: parsed.translation || "",
      annotations: parsed.annotations || [],
      furigana: parsed.furigana || "",
      start: segment.start,
      end: segment.end,
    };
  }

  /**
   * 构建批量处理的提示
   */
  private buildBatchPrompt(
    combinedText: string,
    sourceLanguage: string,
    options: Required<PostProcessOptions>,
  ): string {
    return `Process these ${sourceLanguage} text segments for language learning:

${combinedText}

Return JSON:
{
  "segments": [
    {
      "id": 0,
      "normalizedText": "clean text",
      "translation": "translation",
      "annotations": ["notes"],
      "furigana": "reading"
    }
  ]
}`;
  }

  /**
   * 构建单个segment的提示
   */
  private buildSinglePrompt(
    text: string,
    sourceLanguage: string,
    options: Required<PostProcessOptions>,
  ): string {
    let prompt = `Process this ${sourceLanguage} text: "${text}"`;

    if (options.targetLanguage !== sourceLanguage) {
      prompt += `\nProvide translation to ${options.targetLanguage}`;
    }

    if (options.enableAnnotations) {
      prompt += `\nAdd grammatical/cultural annotations`;
    }

    if (options.enableFurigana && sourceLanguage === "ja") {
      prompt += `\nInclude furigana`;
    }

    prompt += `\n\nRespond with JSON: { "normalizedText": "...", "translation": "...", "annotations": [...], "furigana": "..." }`;

    return prompt;
  }

  /**
   * 解析批量响应
   */
  private parseBatchResponse(responseText: string, segmentCount: number) {
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

      const parsed = JSON.parse(cleanedText);
      return {
        segments: parsed.segments || Array(segmentCount).fill({}),
      };
    } catch (error) {
      console.error("解析批量响应失败:", error);
      return { segments: [] };
    }
  }

  /**
   * 解析单个响应
   */
  private parseSingleResponse(responseText: string) {
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

      return JSON.parse(cleanedText);
    } catch (error) {
      console.error("解析单个响应失败:", error);
      return {};
    }
  }

  /**
   * 创建fallback结果
   */
  private createFallbackResults(segments: Segment[]): ProcessedSegment[] {
    return segments.map((segment) => this.createFallbackResult(segment));
  }

  private createFallbackResult(segment: Segment): ProcessedSegment {
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

  /**
   * 保持原始顺序
   */
  private maintainOriginalOrder(
    originalSegments: Segment[],
    processedResults: ProcessedSegment[],
  ): ProcessedSegment[] {
    return originalSegments.map((originalSegment) => {
      const matching = processedResults.find(
        (result) =>
          Math.abs(result.start - originalSegment.start) < 0.1 &&
          Math.abs(result.end - originalSegment.end) < 0.1,
      );

      return matching || this.createFallbackResult(originalSegment);
    });
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// 导出单例实例
export const optimizedPostProcessor = new OptimizedPostProcessor();

// 便捷函数
export async function processSegmentsOptimized(
  segments: Segment[],
  sourceLanguage: string,
  options?: PostProcessOptions,
): Promise<ProcessedSegment[]> {
  return optimizedPostProcessor.processSegments(segments, sourceLanguage, options);
}
