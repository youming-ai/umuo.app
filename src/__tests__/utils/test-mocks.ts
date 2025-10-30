/**
 * 测试 Mock 工具
 * 提供类型安全的 mock 工具，避免使用 any 类型
 */

import { vi } from "vitest";
import type { FileRow, Segment, TranscriptRow } from "@/types/db/database";

// Mock 数据生成器
export const MockDataGenerator = {
  // 生成 Mock 文件
  createMockFile(overrides: Partial<FileRow> = {}): FileRow {
    const defaultFile: Omit<FileRow, "id"> = {
      name: "test-file.mp3",
      size: 1024,
      type: "audio/mpeg",
      uploadedAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      id: 1,
      ...defaultFile,
      ...overrides,
    } as FileRow;
  },

  // 生成 Mock 转录记录
  createMockTranscript(overrides: Partial<TranscriptRow> = {}): TranscriptRow {
    const defaultTranscript: Omit<TranscriptRow, "id"> = {
      fileId: 1,
      status: "completed",
      rawText: "Test raw text",
      text: "Test text",
      language: "ja",
      duration: 10.5,
      processingTime: 2.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      id: 1,
      ...defaultTranscript,
      ...overrides,
    } as TranscriptRow;
  },

  // 生成 Mock 字幕段
  createMockSegment(overrides: Partial<Segment> = {}): Segment {
    const defaultSegment: Omit<Segment, "id"> = {
      transcriptId: 1,
      start: 0.0,
      end: 2.5,
      text: "Test segment text",
      normalizedText: "Test normalized text",
      wordTimestamps: [
        { word: "Test", start: 0.0, end: 0.5, confidence: 0.95 },
        { word: "segment", start: 0.5, end: 1.0, confidence: 0.9 },
        { word: "text", start: 1.0, end: 1.5, confidence: 0.88 },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      id: 1,
      ...defaultSegment,
      ...overrides,
    } as Segment;
  },
};

// Mock 数据库工具
export const MockDatabaseTools = {
  // 创建 Mock 数据库操作
  createMockDbOperations() {
    return {
      // Mock files table
      files: {
        add: vi.fn().mockResolvedValue(1),
        get: vi.fn().mockResolvedValue(MockDataGenerator.createMockFile()),
        toArray: vi.fn().mockResolvedValue([MockDataGenerator.createMockFile()]),
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([MockDataGenerator.createMockFile()]),
            first: vi.fn().mockResolvedValue(MockDataGenerator.createMockFile()),
            count: vi.fn().mockResolvedValue(1),
          }),
          below: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(1),
        count: vi.fn().mockResolvedValue(1),
      },

      // Mock transcripts table
      transcripts: {
        add: vi.fn().mockResolvedValue(1),
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([MockDataGenerator.createMockTranscript()]),
            first: vi.fn().mockResolvedValue(MockDataGenerator.createMockTranscript()),
            count: vi.fn().mockResolvedValue(1),
          }),
        }),
        update: vi.fn().mockResolvedValue(1),
        delete: vi.fn().mockResolvedValue(1),
      },

      // Mock segments table
      segments: {
        bulkAdd: vi.fn().mockResolvedValue([1, 2]),
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([MockDataGenerator.createMockSegment()]),
          }),
          between: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([MockDataGenerator.createMockSegment()]),
          }),
        }),
        update: vi.fn().mockResolvedValue(1),
      },

      // Mock transaction
      transaction: vi.fn().mockImplementation((callback) => {
        const mockTransaction = {
          files: {
            add: vi.fn().mockResolvedValue(1),
          },
          transcripts: {
            add: vi.fn().mockResolvedValue(1),
          },
          segments: {
            bulkAdd: vi.fn().mockResolvedValue([1]),
          },
        };
        return callback(mockTransaction);
      }),
    };
  },

  // 创建类型安全的 Mock Where 回调
  createMockWhereCallback<T>(results: T[]) {
    return {
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(results),
        first: vi.fn().mockResolvedValue(results[0]),
        count: vi.fn().mockResolvedValue(results.length),
      }),
      below: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      between: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(results),
      }),
    };
  },
};

// Mock 音频相关工具
export class MockAudioTools {
  // 创建 Mock AudioContext
  static createMockAudioContext() {
    return {
      createGain: vi.fn().mockReturnValue({
        gain: { value: 1 },
      }),
      createBufferSource: vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
      createAnalyser: vi.fn().mockReturnValue({
        frequencyBinCount: 2048,
        getByteFrequencyData: vi.fn(),
        getFloatFrequencyData: vi.fn(),
      }),
      decodeAudioData: vi.fn().mockResolvedValue({}),
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      sampleRate: 44100,
      state: "running",
      currentTime: 0,
    };
  }

  // 创建 Mock 音频元素
  static createMockAudioElement() {
    return {
      src: "",
      volume: 1,
      muted: false,
      paused: true,
      currentTime: 0,
      duration: 0,
      readyState: 0,
      ended: false,
      loop: false,
      playbackRate: 1,
      buffered: { length: 0 },
      seekable: { length: 0 },
      played: { length: 0 },
      seeking: false,
      crossOrigin: null,
      networkState: 0,
      textTracks: [],
      addTextTrack: vi.fn(),
      load: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      canPlayType: vi.fn().mockReturnValue("maybe"),
      fastSeek: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }
}

// Mock 存储工具
export class MockStorageTools {
  // 创建 Mock localStorage
  static createMockLocalStorage() {
    const store: Record<string, string> = {};
    return {
      getItem: vi.fn().mockImplementation((key: string) => store[key] || null),
      setItem: vi.fn().mockImplementation((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn().mockImplementation((key: string) => {
        delete store[key];
      }),
      clear: vi.fn().mockImplementation(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
      key: vi.fn().mockImplementation((index: number) => Object.keys(store)[index] || null),
      get length() {
        return Object.keys(store).length;
      },
    };
  }
}
