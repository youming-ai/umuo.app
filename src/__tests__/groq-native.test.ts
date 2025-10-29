/**
 * Groq 原生转录服务测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GroqFormatConverter } from "@/lib/utils/groq-format-converter";
import GroqNativeService from "@/lib/ai/groq-native-service";

// Mock fetch
global.fetch = vi.fn();

describe("Groq Format Converter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该验证 Groq 响应格式", () => {
    const validResponse = {
      success: true,
      id: "test-id",
      object: "transcription",
      created: "2024-01-01T00:00:00Z",
      model: "whisper-large-v3-turbo",
      choices: [
        {
          index: 0,
          transcript: "こんにちは、世界",
          words: [
            {
              word: "こんにちは",
              start: 0,
              end: 1.5,
              confidence: 0.95,
              punct_word: "こんにちは",
            },
          ],
          segments: [
            {
              start: 0,
              end: 1.5,
              text: "こんにちは",
              avg_logprob: -0.2,
              compression_ratio: 1.5,
              no_speech_prob: 0.01,
            },
          ],
        },
      ],
    };

    expect(GroqFormatConverter.validateResponse(validResponse)).toBe(true);
  });

  it("应该拒绝无效的响应格式", () => {
    const invalidResponse = {
      success: false,
      error: "test error",
    };

    expect(GroqFormatConverter.validateResponse(invalidResponse)).toBe(false);
  });

  it("应该转换 Groq 响应为标准 segments", () => {
    const groqResponse = {
      success: true,
      id: "test-id",
      object: "transcription",
      created: "2024-01-01T00:00:00Z",
      model: "whisper-large-v3-turbo",
      choices: [
        {
          index: 0,
          transcript: "ユニット6セクション1",
          words: [
            { word: "ユニット", start: 0, end: 1.0, confidence: 0.95, punct_word: "ユニット" },
            { word: "6", start: 1.0, end: 1.3, confidence: 0.98, punct_word: "6" },
            {
              word: "セクション",
              start: 1.3,
              end: 2.5,
              confidence: 0.92,
              punct_word: "セクション",
            },
            { word: "1", start: 2.5, end: 3.0, confidence: 0.96, punct_word: "1" },
          ],
          segments: [],
        },
      ],
    };

    const segments = GroqFormatConverter.convertToStandardSegments(groqResponse);

    expect(segments).toHaveLength(4);
    expect(segments[0]).toMatchObject({
      start: 0,
      end: 1.0,
      text: "ユニット",
      normalizedText: "ユニット",
    });
    expect(segments[0].wordTimestamps).toHaveLength(1);
    expect(segments[0].wordTimestamps![0]).toMatchObject({
      word: "ユニット",
      start: 0,
      end: 1.0,
      confidence: 0.95,
    });
  });

  it("应该处理没有 word timestamps 的情况", () => {
    const groqResponse = {
      success: true,
      id: "test-id",
      object: "transcription",
      created: "2024-01-01T00:00:00Z",
      model: "whisper-large-v3-turbo",
      choices: [
        {
          index: 0,
          transcript: "こんにちは、世界",
          words: [],
          segments: [
            {
              start: 0,
              end: 2.0,
              text: "こんにちは、世界",
            },
          ],
        },
      ],
    };

    const segments = GroqFormatConverter.convertToStandardSegments(groqResponse);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      start: 0,
      end: 2.0,
      text: "こんにちは、世界",
      normalizedText: "こんにちは、世界",
      wordTimestamps: undefined,
    });
  });

  it("应该提取正确的元数据", () => {
    const groqResponse = {
      success: true,
      id: "test-id",
      object: "transcription",
      created: "2024-01-01T00:00:00Z",
      model: "whisper-large-v3-turbo",
      choices: [
        {
          index: 0,
          transcript: "こんにちは、世界",
          words: [],
          segments: [
            {
              start: 0,
              end: 2.0,
              text: "こんにちは、世界",
            },
          ],
        },
      ],
    };

    const metadata = GroqFormatConverter.extractMetadata(groqResponse);

    expect(metadata).toMatchObject({
      language: "ja",
      rawText: "こんにちは、世界",
      text: "こんにちは、世界",
      duration: 2.0,
      processingTime: 0,
    });
  });
});

describe("Groq Native Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 设置环境变量
    process.env.GROQ_API_KEY = "test-api-key";
  });

  it("应该验证推荐的配置", () => {
    const config1 = GroqNativeService.getRecommendedConfig("ja", "whisper-large-v3-turbo");
    expect(config1).toMatchObject({
      model: "whisper-large-v3-turbo",
      language: "ja",
      temperature: 0,
      responseFormat: "verbose_json",
      timestampGranularities: ["word", "segment"],
    });

    const config2 = GroqNativeService.getRecommendedConfig("en", "whisper-medium");
    expect(config2.model).toBe("whisper-medium");
    expect(config2.language).toBe("en");
  });

  it("应该检查模型是否支持 word timestamps", () => {
    expect(GroqNativeService.supportsWordTimestamps("whisper-large-v3-turbo")).toBe(true);
    expect(GroqNativeService.supportsWordTimestamps("whisper-large-v3")).toBe(true);
    expect(GroqNativeService.supportsWordTimestamps("whisper-medium")).toBe(true);
    expect(GroqNativeService.supportsWordTimestamps("whisper-base")).toBe(false);
    expect(GroqNativeService.supportsWordTimestamps("unknown-model")).toBe(false);
  });

  it("应该在缺少 API 密钥时返回错误", async () => {
    delete process.env.GROQ_API_KEY;

    const mockFile = new File(["test"], "test.mp3", { type: "audio/mpeg" });
    const result = await GroqNativeService.transcribe(mockFile);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("API_KEY_MISSING");
      expect(result.error.message).toBe("Groq API 密钥未配置");
    }
  });

  it("应该在网络错误时返回错误", async () => {
    const mockFile = new File(["test"], "test.mp3", { type: "audio/mpeg" });

    // Mock fetch to throw network error
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await GroqNativeService.transcribe(mockFile);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("TRANSCRIPTION_ERROR");
    }
  });

  it("应该在 API 返回错误时处理错误信息", async () => {
    const mockFile = new File(["test"], "test.mp3", { type: "audio/mpeg" });

    // Mock fetch to return API error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: {
            message: "File too large",
            type: "invalid_request_error",
          },
        }),
    });

    const result = await GroqNativeService.transcribe(mockFile);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FILE_TOO_LARGE");
      expect(result.error.message).toBe("音频文件过大");
    }
  });

  it("应该成功转录音频文件", async () => {
    const mockFile = new File(["test"], "test.mp3", { type: "audio/mpeg" });

    // Mock successful Groq API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          id: "test-id",
          object: "transcription",
          created: "2024-01-01T00:00:00Z",
          model: "whisper-large-v3-turbo",
          choices: [
            {
              index: 0,
              transcript: "こんにちは、世界",
              words: [
                {
                  word: "こんにちは",
                  start: 0,
                  end: 1.5,
                  confidence: 0.95,
                  punct_word: "こんにちは",
                },
              ],
              segments: [
                {
                  start: 0,
                  end: 1.5,
                  text: "こんにちは",
                },
              ],
            },
          ],
        }),
    });

    const result = await GroqNativeService.transcribe(mockFile);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transcript.text).toBe("こんにちは、世界");
      expect(result.transcript.language).toBe("ja");
      expect(result.segments).toHaveLength(1);
      expect(result.metadata.model).toBe("whisper-large-v3-turbo");
      expect(result.segments[0].wordTimestamps).toHaveLength(1);
    }
  });

  it("应该处理 quota exceeded 错误", async () => {
    const mockFile = new File(["test"], "test.mp3", { type: "audio/mpeg" });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: {
            message: "Quota exceeded",
            type: "insufficient_quota",
          },
        }),
    });

    const result = await GroqNativeService.transcribe(mockFile);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("QUOTA_EXCEEDED");
      expect(result.error.message).toBe("API 配额已用完");
    }
  });
});

describe("Groq API Integration", () => {
  it("应该正确构建 FormData 请求", () => {
    const audioData = new Uint8Array([1, 2, 3, 4]);
    const params = {
      model: "whisper-large-v3-turbo",
      language: "ja",
      temperature: 0,
      response_format: "verbose_json" as const,
      timestamp_granularities: ["word", "segment"] as const,
    };

    // 这只是验证 FormData 构建逻辑，不测试实际的 API 调用
    const formData = new FormData();
    const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
    formData.append("file", audioBlob, "audio.mp3");

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => formData.append(key, item));
      } else if (value !== undefined) {
        formData.append(key, String(value));
      }
    });

    expect(formData.get("file")).toBeInstanceOf(Blob);
    expect(formData.get("model")).toBe("whisper-large-v3-turbo");
    expect(formData.get("language")).toBe("ja");
    expect(formData.get("temperature")).toBe("0");
    expect(formData.get("response_format")).toBe("verbose_json");
    expect(formData.get("timestamp_granularities[]")).toBe("word");
    expect(formData.get("timestamp_granularities[]")).toBe("segment");
  });
});
