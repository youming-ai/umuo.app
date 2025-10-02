import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock environment for testing
delete (global as any).window;

describe("Audio Processor Resource Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("AudioContext Management", () => {
    it("should properly close AudioContext after processing", async () => {
      // Mock AudioContext
      const mockClose = jest.fn().mockResolvedValue(undefined);
      const mockDecodeAudioData = jest.fn().mockResolvedValue({
        duration: 10,
        sampleRate: 44100,
        numberOfChannels: 2,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(1000)),
      });

      global.AudioContext = jest.fn().mockImplementation(() => ({
        close: mockClose,
        decodeAudioData: mockDecodeAudioData,
        createBuffer: jest.fn(),
        createBufferSource: jest.fn(),
        createGain: jest.fn(),
        destination: {},
        sampleRate: 44100,
      })) as any;

      // Import after mocking
      const { sliceAudio } = require("./audio-processor");

      // Create a mock blob
      const mockBlob = new Blob(["mock audio data"], { type: "audio/wav" });

      try {
        await sliceAudio(mockBlob, 0, 5, 2, 0.1);
      } catch (error) {
        // Expected to fail due to mock limitations, but AudioContext should be closed
      }

      // Verify AudioContext.close was called
      expect(mockClose).toHaveBeenCalled();
    });

    it("should handle AudioContext errors gracefully", async () => {
      // Mock AudioContext that throws during close
      const mockClose = jest.fn().mockRejectedValue(new Error("Close failed"));
      const mockDecodeAudioData = jest.fn().mockRejectedValue(new Error("Decode failed"));

      global.AudioContext = jest.fn().mockImplementation(() => ({
        close: mockClose,
        decodeAudioData: mockDecodeAudioData,
        sampleRate: 44100,
      })) as any;

      const { sliceAudio } = require("./audio-processor");
      const mockBlob = new Blob(["mock audio data"], { type: "audio/wav" });

      // Should not throw even if close fails
      await expect(sliceAudio(mockBlob, 0, 5, 2, 0.1)).rejects.toThrow();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("Memory Management", () => {
    it("should limit chunk count to prevent memory issues", async () => {
      // This test verifies that the MAX_CHUNKS limit is respected
      const { MAX_CHUNKS } = require("./transcription-config");
      const { validateChunkCount } = require("./transcription-config");

      // Test validation function
      const validResult = validateChunkCount(50);
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateChunkCount(MAX_CHUNKS + 1);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain("音频块过多");
    });
  });

  describe("Resource Cleanup", () => {
    it("should clean up resources even when errors occur", async () => {
      const mockClose = jest.fn().mockResolvedValue(undefined);
      const mockDecodeAudioData = jest.fn().mockRejectedValue(new Error("Processing error"));

      global.AudioContext = jest.fn().mockImplementation(() => ({
        close: mockClose,
        decodeAudioData: mockDecodeAudioData,
        sampleRate: 44100,
      })) as any;

      const { sliceAudio } = require("./audio-processor");
      const mockBlob = new Blob(["mock audio data"], { type: "audio/wav" });

      // Should fail but still clean up
      await expect(sliceAudio(mockBlob, 0, 5, 2, 0.1)).rejects.toThrow();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
