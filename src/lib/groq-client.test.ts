// Mock environment variables before importing
process.env.NEXT_PUBLIC_GROQ_API_KEY = "test-api-key";

import { mergeGroqTranscriptionResults } from "./groq-client";

describe("Groq Client", () => {
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
      expect(merged.duration).toBe(25);
    });

    test("should handle empty results array", () => {
      const merged = mergeGroqTranscriptionResults([]);
      expect(merged.text).toBe("");
      expect(merged.duration).toBe(0);
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
      expect(merged.duration).toBe(25);
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
      expect(merged.duration).toBe(25);
    });
  });
});
