/**
 * Groq SDK 格式转换工具
 * 专门处理 Groq Whisper 返回的详细格式
 * 转换为项目所需的标准 segments 格式
 */

import type { Segment, TranscriptRow } from "@/types/db/database";

export interface GroqWordTimestamp {
  start?: number;
  end?: number;
  word: string;
  confidence?: number;
}

export interface GroqSegment {
  start?: number;
  end?: number;
  text: string;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
  words?: GroqWordTimestamp[];
  seek?: number;
  id?: number;
}

export interface GroqTranscriptResponse {
  text: string;
  language: string;
  duration?: number;
  segments: GroqSegment[];
}

export interface GroqTranscriptionMetadata {
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
  x_groq?: {
    request?: {
      id: string;
    };
    response?: {
      id: string;
    };
  };
  tokens?: number;
}

export interface GroqFullResponse {
  success: true;
  id: string;
  object: string;
  created: string;
  model: string;
  choices: Array<{
    index: number;
    transcript: string;
    words: Array<{
      word: string;
      start: number;
      end: number;
      confidence: number;
      punct_word: string;
    }>;
    segments: GroqSegment[];
    avg_logprob?: number;
    compression_ratio?: number;
    no_speech_prob?: number;
    temperature?: number;
  }>;
}

export class GroqFormatConverter {
  /**
   * 转换 Groq 响应为标准的 Segment 格式
   */
  static convertToStandardSegments(groqResponse: GroqFullResponse): Segment[] {
    const choice = groqResponse.choices[0];
    const transcript = choice?.transcript;
    const segments = choice?.segments || [];

    if (!transcript) {
      return [];
    }

    console.log(`🔧 转换 Groq 格式:`, {
      textLength: transcript.length,
      segmentCount: segments.length || 0,
      hasWords: segments.some((s) => s.words && s.words.length > 0),
      hasTimestamps: segments.some((s) => s.start !== undefined && s.end !== undefined),
    });

    // 处理 Groq 返回的 segments
    const standardSegments: Segment[] = [];

    if (segments && segments.length > 0) {
      // 如果 Groq segments 包含 word 级别时间戳，使用它们
      for (let i = 0; i < segments.length; i++) {
        const groqSegment = segments[i];

        // 检查是否有 word 级别时间戳
        if (groqSegment.words && groqSegment.words.length > 0) {
          // 使用 word 级别时间戳创建更精确的 segments
          for (let j = 0; j < groqSegment.words.length; j++) {
            const wordInfo = groqSegment.words[j];
            const start = wordInfo.start || groqSegment.start || 0;
            const end = wordInfo.end || groqSegment.end || 0;

            standardSegments.push({
              transcriptId: 0, // 将在后续操作中设置
              start: start,
              end: end,
              text: wordInfo.word,
              normalizedText: wordInfo.word,
              wordTimestamps: [
                {
                  word: wordInfo.word,
                  start: start,
                  end: end,
                  confidence: wordInfo.confidence || 0.95,
                },
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } else {
          // 如果没有 word 级别时间戳，使用 segment 级别时间戳
          const segmentStart = groqSegment.start || 0;
          standardSegments.push({
            transcriptId: 0,
            start: segmentStart,
            end: groqSegment.end || segmentStart + 5, // 默认 5 秒
            text: groqSegment.text,
            normalizedText: groqSegment.text,
            wordTimestamps: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    console.log(`🎯 生成标准 segments:`, {
      originalCount: segments.length,
      standardCount: standardSegments.length,
      conversionMethod: segments?.[0]?.words ? "word-timestamps" : "segment-timestamps",
    });

    return standardSegments;
  }

  /**
   * 处理 Groq 响应中的元数据
   */
  static extractMetadata(groqResponse: GroqFullResponse): Partial<TranscriptRow> {
    const choice = groqResponse.choices[0];
    const segments = this.convertToStandardSegments(groqResponse);

    return {
      language: groqResponse.model?.includes("whisper") ? "ja" : "auto",
      rawText: choice.transcript,
      text: choice.transcript,
      duration:
        segments.length > 0 ? Math.max(...segments.map((s) => (s.end || 0) - (s.start || 0))) : 0,
      processingTime: 0, // Groq API 不提供此信息
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 验证 Groq 响应格式
   */
  static validateResponse(response: unknown): response is GroqFullResponse {
    const resp = response as Record<string, unknown>;
    return (
      resp &&
      typeof resp === "object" &&
      resp.success === true &&
      typeof resp.id === "string" &&
      typeof resp.object === "string" &&
      typeof resp.created === "string" &&
      typeof resp.model === "string" &&
      Array.isArray(resp.choices) &&
      resp.choices.length > 0 &&
      typeof resp.choices[0] === "object" &&
      resp.choices[0] !== null &&
      "transcript" in resp.choices[0] &&
      "words" in resp.choices[0] &&
      Array.isArray((resp.choices[0] as Record<string, unknown>).words)
    );
  }

  /**
   * 获取最佳可用的时间戳
   */
  static getBestTimestamps(
    groqSegment: GroqSegment,
    defaultStart: number,
    defaultEnd: number,
  ): { start: number; end: number } {
    // 优先使用 Groq 提供的时间戳
    const start = groqSegment.start !== undefined ? groqSegment.start : defaultStart;

    const end = groqSegment.end !== undefined ? groqSegment.end : defaultEnd;

    return { start, end };
  }

  /**
   * 计算段落的平均置信度
   */
  static calculateAverageConfidence(groqSegment: GroqSegment): number {
    if (!groqSegment.words || groqSegment.words.length === 0) {
      return 0.95; // 默认置信度
    }

    const totalConfidence = groqSegment.words.reduce(
      (sum, word) => sum + (word.confidence || 0.95),
      0,
    );

    return totalConfidence / groqSegment.words.length;
  }

  /**
   * 处理可能的错误响应
   */
  static handleErrorResponse(error: any, fileName: string): never {
    const errorMessage = error?.message || "Unknown error";
    console.error(`❌ Groq transcription failed for ${fileName}:`, error);

    // 根据错误类型返回特定的错误码
    if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
      throw new Error("TRANSCRIPTION_QUOTA_EXCEEDED");
    } else if (errorMessage.includes("file too large")) {
      throw new Error("TRANSCRIPTION_FILE_TOO_LARGE");
    } else if (errorMessage.includes("unsupported")) {
      throw new Error("TRANSCRIPTION_UNSUPPORTED_FORMAT");
    } else if (errorMessage.includes("api key") || errorMessage.includes("authentication")) {
      throw new Error("TRANSCRIPTION_API_KEY_INVALID");
    } else {
      throw new Error(`TRANSCRIPTION_PROCESSING_ERROR: ${errorMessage}`);
    }
  }

  /**
   * 生成调试信息
   */
  static logConversionDetails(groqResponse: GroqFullResponse, convertedSegments: Segment[]): void {
    const choice = groqResponse.choices[0];
    const transcript = choice.transcript;
    const originalSegments = choice.segments || [];

    console.log(`📊 Groq 转换详情:`);
    console.log(`  模型: ${groqResponse.model}`);

    console.log(`  原始文本长度: ${transcript.length}`);
    console.log(`  原始段落数量: ${originalSegments.length}`);
    console.log(`  转换后段落数量: ${convertedSegments.length}`);
    console.log(
      `  Word 级别支持: ${convertedSegments.filter((s) => s.wordTimestamps && s.wordTimestamps.length > 0).length}`,
    );
    console.log(
      `  转换方法: ${originalSegments[0]?.words ? "word-timestamps" : "segment-timestamps"}`,
    );
    console.log(`  处理时间: ${new Date().toISOString()}`);
  }
}

export default GroqFormatConverter;
