import {
  getAudioDuration,
  sliceAudio,
  processAudioFile,
  getAudioMetadata,
  mergeAudioChunks,
  type AudioChunk,
  type AudioMetadata,
} from "./audio-processor";

// Mock the Web Audio API
const mockAudioContext = {
  createBufferSource: jest.fn(),
  createAnalyser: jest.fn(),
  createGain: jest.fn(),
  createScriptProcessor: jest.fn(),
  decodeAudioData: jest.fn(),
  close: jest.fn(),
  resume: jest.fn(),
  suspend: jest.fn(),
  currentTime: 0,
  sampleRate: 44100,
  createBuffer: jest.fn((numberOfChannels, length, sampleRate) => ({
    numberOfChannels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: jest.fn(() => new Float32Array(length)),
    copyToChannel: jest.fn(),
  })),
};

const mockAudioBuffer = {
  numberOfChannels: 2,
  length: 44100,
  sampleRate: 44100,
  duration: 1,
  getChannelData: jest.fn(),
  copyToChannel: jest.fn(),
};

global.AudioContext = jest.fn(() => mockAudioContext) as any;
global.OfflineAudioContext = jest.fn(() => mockAudioContext) as any;

describe("Audio Processing", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
    mockAudioBuffer.getChannelData.mockReturnValue(new Float32Array(44100));

    // Mock URL methods
    global.URL.createObjectURL = jest.fn(() => "mock-url");
    global.URL.revokeObjectURL = jest.fn();
  });

  describe("getAudioDuration", () => {
    test("should get duration from audio blob", async () => {
      const blob = new Blob(["audio blob"], { type: "audio/mpeg" });

      // Mock the Audio element
      const mockAudio = {
        addEventListener: jest.fn((event, handler) => {
          if (event === "loadedmetadata") {
            // Simulate async loading
            setTimeout(() => handler(), 0);
          }
        }),
        src: "",
        duration: 1.5,
      };

      global.Audio = jest.fn(() => mockAudio) as any;

      const duration = await getAudioDuration(blob);

      expect(duration).toBe(1.5);
      expect(global.Audio).toHaveBeenCalledTimes(1);
    });

    test("should handle file reading errors", async () => {
      const blob = new Blob(["audio blob"], { type: "audio/mpeg" });

      // Mock the Audio element to simulate error
      const mockAudio = {
        addEventListener: jest.fn((event, handler) => {
          if (event === "error") {
            setTimeout(() => handler(), 0);
          }
        }),
        src: "",
      };

      global.Audio = jest.fn(() => mockAudio) as any;

      await expect(getAudioDuration(blob)).rejects.toThrow("Failed to load audio metadata");
    });
  });

  describe("sliceAudio", () => {
    test("should slice audio blob", async () => {
      const blob = new Blob(["audio blob"], { type: "audio/mpeg" });
      const startTime = 0;
      const endTime = 0.5;

      // Mock the extractAudioSegment function to return a blob
      const mockBlob = new Blob(["audio segment"], { type: "audio/wav" });

      // Mock OfflineAudioContext
      const mockOfflineContext = {
        createBufferSource: jest.fn(),
        createGain: jest.fn(),
        startRendering: jest.fn().mockResolvedValue(mockAudioBuffer),
        destination: {},
      };

      global.OfflineAudioContext = jest.fn(() => mockOfflineContext) as any;

      const result = await sliceAudio(blob, startTime, endTime);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        startTime: 0,
        endTime: 0.5,
        duration: 0.5,
        index: 0,
      });
    });

    test("should handle invalid time range", async () => {
      const blob = new Blob(["audio blob"], { type: "audio/mpeg" });
      const startTime = 2;
      const endTime = 1;

      await expect(sliceAudio(blob, startTime, endTime)).rejects.toThrow("Invalid time range");
    });
  });

  describe("getAudioMetablob", () => {
    test("should get metablob from audio blob", async () => {
      const blob = new Blob(["audio blob"], { type: "audio/mpeg" });

      const metablob = await getAudioMetadata(blob);

      expect(metablob).toEqual({
        duration: 1,
        sampleRate: 44100,
        channels: 2,
        bitrate: expect.any(Number),
      });
    });
  });

  describe("processAudioFile", () => {
    test("should process audio file", async () => {
      const file = new File(["audio blob"], "test.mp3", { type: "audio/mpeg" });

      const result = await processAudioFile(file);

      expect(result).toEqual(
        expect.objectContaining({
          duration: 1,
          chunks: expect.any(Array),
        }),
      );
    });

    test("should handle processing errors", async () => {
      const file = new File(["audio blob"], "test.mp3", { type: "audio/mpeg" });
      const decodeError = new Error("Processing failed");
      mockAudioContext.decodeAudioData.mockRejectedValue(decodeError);

      await expect(processAudioFile(file)).rejects.toThrow("Processing failed");
    });
  });

  describe("mergeAudioChunks", () => {
    test("should merge audio chunks", async () => {
      const chunks: AudioChunk[] = [
        {
          startTime: 0,
          endTime: 0.5,
          blob: new Blob([new ArrayBuffer(512)]),
          index: 0,
          duration: 0.5,
        },
        {
          startTime: 0.5,
          endTime: 1,
          blob: new Blob([new ArrayBuffer(512)]),
          index: 1,
          duration: 0.5,
        },
      ];

      const result = await mergeAudioChunks(chunks);

      expect(result).toBeInstanceOf(Blob);
    });

    test("should handle empty chunks array", async () => {
      const chunks: AudioChunk[] = [];

      await expect(mergeAudioChunks(chunks)).rejects.toThrow("No chunks to merge");
    });
  });

  describe("AudioChunk interface", () => {
    test("should create valid audio chunk", () => {
      const chunk: AudioChunk = {
        duration: 1,
        startTime: 0,
        endTime: 1,
        blob: new Blob([new ArrayBuffer(1024)]),
        index: 0,
      };

      expect(chunk.startTime).toBe(0);
      expect(chunk.endTime).toBe(1);
      expect(chunk.blob).toBeInstanceOf(Blob);
      expect(chunk.index).toBe(0);
    });
  });

  describe("AudioMetadata interface", () => {
    test("should create valid audio metablob", () => {
      const metablob: AudioMetadata = {
        duration: 1,
        sampleRate: 44100,
        channels: 2,
        bitrate: 128000,
      };

      expect(metablob.duration).toBe(1);
      expect(metablob.sampleRate).toBe(44100);
      expect(metablob.channels).toBe(2);
      expect(metablob.bitrate).toBe(128000);
    });
  });
});
