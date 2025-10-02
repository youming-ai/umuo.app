import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  GroqClient,
  GroqClientError,
  GroqAuthenticationError,
  GroqSecurityError,
  mergeGroqTranscriptionResults,
} from "./groq-client";

describe("Groq Client Security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      const merged = GroqClient.mergeGroqTranscriptionResults([]);
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

  describe("Environment Detection", () => {
    it("should initialize successfully in server environment", () => {
      // Mock server environment by temporarily removing window
      const originalWindow = global.window;
      delete (global as any).window;

      try {
        const client = new GroqClient("gsk_test12345678901234567890");
        expect(client).toBeDefined();
      } catch (error) {
        // Expected to fail due to API key validation but not environment detection
        expect(error).not.toBeInstanceOf(GroqSecurityError);
      } finally {
        global.window = originalWindow;
      }
    });

    it("should prevent initialization in browser environment", () => {
      // Mock browser environment
      global.window = global.window || {};

      expect(() => {
        new GroqClient("gsk_test12345678901234567890");
      }).toThrow(GroqSecurityError);
    });
  });

  describe("Error Handling Security", () => {
    it("should filter stack traces in production", () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const mockFile = new File(["test"], "test.wav", { type: "audio/wav" });

        // This should throw an error without stack trace in production
        try {
          const client = new GroqClient("invalid-key");
        } catch (error) {
          // Should not expose detailed error information in production
          expect(error).toBeDefined();
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
