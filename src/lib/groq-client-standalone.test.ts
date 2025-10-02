// 设置环境变量
process.env.GROQ_API_KEY = "gsk_test12345678901234567890";

// Mock server environment
delete (global as any).window;

// 导入函数而不是整个模块以避免单例实例创建
const { mergeGroqTranscriptionResults } = require("./groq-client");

describe("Groq Client Standalone Functions", () => {
  describe("mergeGroqTranscriptionResults", () => {
    test("should merge single result", () => {
      const result = {
        text: "Transcribed text",
        language: "en",
        duration: 10,
        segments: undefined,
        chunkIndex: 0,
      };

      const merged = mergeGroqTranscriptionResults([result]);
      expect(merged.text).toBe(result.text);
      expect(merged.duration).toBe(result.duration);
    });

    test("should merge multiple results", () => {
      const results = [
        {
          text: "First part",
          language: "en",
          duration: 10,
          segments: undefined,
          chunkIndex: 0,
        },
        {
          text: "Second part",
          language: "en",
          duration: 15,
          segments: undefined,
          chunkIndex: 1,
        },
      ];

      const merged = mergeGroqTranscriptionResults(results);
      expect(merged.text).toBe("First part Second part");
      expect(merged.duration).toBe(10); // 第一个结果的duration
    });

    test("should handle empty results array", () => {
      const merged = mergeGroqTranscriptionResults([]);
      expect(merged.text).toBe("");
      expect(merged.duration).toBeUndefined();
      expect(merged.language).toBeUndefined();
    });

    test("should handle results with different languages", () => {
      const results = [
        {
          text: "First part",
          language: "en",
          duration: 10,
          segments: undefined,
          chunkIndex: 0,
        },
        {
          text: "Second part",
          language: "ja",
          duration: 15,
          segments: undefined,
          chunkIndex: 1,
        },
      ];

      const merged = mergeGroqTranscriptionResults(results);
      expect(merged.text).toBe("First part Second part");
      expect(merged.duration).toBe(10); // 第一个结果的duration
    });

    test("should handle results with undefined values", () => {
      const results = [
        {
          text: "First part",
          language: undefined,
          duration: 10,
          segments: undefined,
          chunkIndex: 0,
        },
        {
          text: "Second part",
          language: "ja",
          duration: 15,
          segments: undefined,
          chunkIndex: 1,
        },
      ];

      const merged = mergeGroqTranscriptionResults(results);
      expect(merged.text).toBe("First part Second part");
      expect(merged.duration).toBe(10); // 第一个结果的duration
    });
  });
});
