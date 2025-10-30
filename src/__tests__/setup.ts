import "@testing-library/jest-dom";
import { afterEach, beforeAll, beforeEach, vi } from "vitest";
import type { Segment, TranscriptRow } from "@/types/db/database";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
}));

// Mock Next.js App Router
vi.mock("next/app-router", () => ({}));

// Mock IndexedDB (Dexie)
const mockDB = {
  files: {
    add: vi.fn(),
    bulkAdd: vi.fn(),
    where: vi.fn(() => ({
      first: vi.fn(),
      toArray: vi.fn(),
      modify: vi.fn(),
      delete: vi.fn(),
    })),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    offset: vi.fn(() => ({ limit: vi.fn() })),
    limit: vi.fn(),
    reverse: vi.fn(),
    toArray: vi.fn(),
  },
  transcripts: {
    add: vi.fn(),
    bulkAdd: vi.fn(),
    where: vi.fn(() => ({
      first: vi.fn(),
      toArray: vi.fn(),
      modify: vi.fn(),
      delete: vi.fn(),
    })),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    offset: vi.fn(() => ({ limit: vi.fn() })),
    limit: vi.fn(),
    reverse: vi.fn(),
    toArray: vi.fn(),
  },
  segments: {
    add: vi.fn(),
    bulkAdd: vi.fn(),
    where: vi.fn(() => ({
      first: vi.fn(),
      toArray: vi.fn(),
      modify: vi.fn(),
      delete: vi.fn(),
    })),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    offset: vi.fn(() => ({ limit: vi.fn() })),
    limit: vi.fn(),
    reverse: vi.fn(),
    toArray: vi.fn(),
  },
  transaction: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
};

vi.mock("@/lib/db/db", () => ({
  db: mockDB,
  DatabaseService: vi.fn(() => mockDB),
}));

// Mock AI 服务
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => ({
    transcription: vi.fn(),
  })),
}));

vi.mock("@ai-sdk/groq", () => ({
  createGroq: vi.fn(() => ({
    transcription: vi.fn(),
  })),
}));

vi.mock("ai", () => ({
  transcribe: vi.fn(),
}));

// Mock Web Audio API
const mockAudioContext = {
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGainNode: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
  })),
  createAnalyser: vi.fn(() => ({
    frequencyBinCount: 2048,
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
  })),
  decodeAudioData: vi.fn(),
  resume: vi.fn(),
  suspend: vi.fn(),
  close: vi.fn(),
  destination: {},
};

global.AudioContext = vi.fn(() => mockAudioContext) as unknown as typeof AudioContext;
global.OfflineAudioContext = vi.fn(() => mockAudioContext) as unknown as typeof OfflineAudioContext;

// Mock File API
global.File = class File {
  constructor(
    public bits: BlobPart[],
    public name: string,
    public options: { type: string; lastModified?: number } = { type: "" },
  ) {
    this.size = bits.reduce((acc, bit) => acc + (bit as ArrayBuffer).byteLength, 0);
    this.type = options.type;
    this.lastModified = options.lastModified || Date.now();
  }

  public size: number;
  public type: string;
  public lastModified: number;

  slice() {
    return new File([], this.name, this.options);
  }

  stream() {
    return new ReadableStream();
  }

  text() {
    return Promise.resolve("");
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(0));
  }
} as unknown as typeof File;

global.FileReader = class FileReader {
  public result: string | ArrayBuffer | null = null;
  public error: ProgressEvent<FileReader>["error"] = null;
  public readyState: number = 0;
  public onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  public onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

  readAsDataURL() {}
  readAsText() {}
  readAsArrayBuffer() {}
} as unknown as typeof FileReader;

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: "",
  thresholds: [],
  takeRecords: vi.fn(() => []),
}));

// Mock WebSocket
global.WebSocket = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
})) as unknown as typeof WebSocket;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 全局测试设置
beforeAll(() => {
  // 设置测试环境变量
  Object.defineProperty(process, "env", {
    value: {
      ...process.env,
      NODE_ENV: "test",
      GROQ_API_KEY: "test-api-key",
    },
  });
});

beforeEach(() => {
  // 每个测试前清理 mocks
  vi.clearAllMocks();

  // 重置 localStorage 和 sessionStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();

  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

afterEach(() => {
  // 每个测试后清理
  vi.restoreAllMocks();
});

// 全局测试工具函数
export const createMockFile = (name: string, type: string, size: number = 1024): File => {
  const bits = new Array(size).fill(0);
  return new File(bits, name, { type });
};

// 使用类型安全的 Mock 工具
export {
  MockAudioTools,
  MockDatabaseTools,
  MockDataGenerator,
  MockStorageTools,
} from "./utils/test-mocks";

// 为了向后兼容，保留旧的导出（已弃用）
// 建议使用 MockDataGenerator.createMockTranscript() 代替
/** @deprecated 使用 MockDataGenerator.createMockTranscript() 代替 */
export const createMockTranscript = (overrides: Partial<TranscriptRow> = {}) => {
  console.warn(
    "createMockTranscript is deprecated, use MockDataGenerator.createMockTranscript() instead",
  );
  const { MockDataGenerator } = require("./utils/test-mocks");
  return MockDataGenerator.createMockTranscript(overrides);
};

/** @deprecated 使用 MockDataGenerator.createMockSegment() 代替 */
export const createMockSegment = (overrides: Partial<Segment> = {}) => {
  console.warn(
    "createMockSegment is deprecated, use MockDataGenerator.createMockSegment() instead",
  );
  const { MockDataGenerator } = require("./utils/test-mocks");
  return MockDataGenerator.createMockSegment(overrides);
};

export const waitFor = (ms: number = 100) => new Promise((resolve) => setTimeout(resolve, ms));

// 导出常用测试工具
export { vi, mockDB };
