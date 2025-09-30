// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Add groq-sdk shims for testing
import 'groq-sdk/shims/node'

// Mock global objects for testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IndexedDB for testing
const { indexedDB, IDBKeyRange } = require('fake-indexeddb')
global.indexedDB = indexedDB
global.IDBKeyRange = IDBKeyRange

// Mock Blob and File for testing
global.Blob = class Blob {
  constructor(data, options = {}) {
    this.data = data
    this.type = options.type || ''
    this.size = this.data ? this.data.reduce((sum, item) => sum + (item.length || 1), 0) : 0
  }

  arrayBuffer() {
    if (this.data && this.data.length > 0) {
      const totalSize = this.data.reduce((sum, item) => sum + (item.length || 1), 0)
      const buffer = new ArrayBuffer(totalSize)
      return Promise.resolve(buffer)
    }
    return Promise.resolve(new ArrayBuffer(1024)) // Default audio buffer size
  }
}

global.File = class File {
  constructor(data, name, options = {}) {
    this.data = data
    this.name = name
    this.type = options.type || ''
    this.size = options.size || (data ? data.length : 0)
  }

  arrayBuffer() {
    if (this.data && this.data.length > 0) {
      const totalSize = this.data.reduce((sum, item) => sum + (item.length || 1), 0)
      const buffer = new ArrayBuffer(totalSize)
      return Promise.resolve(buffer)
    }
    return Promise.resolve(new ArrayBuffer(1024)) // Default audio buffer size
  }

  slice(start, end, type) {
    const slicedData = this.data ? this.data.slice(start, end) : '';
    const slicedSize = end - start;
    return new Blob([slicedData], { type: type || this.type });
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock FormData for Jest environment
global.FormData = class FormData {
  constructor() {
    this.data = new Map()
  }

  append(key, value, filename) {
    // Handle Blob objects specifically for FormData
    if (value instanceof Blob || (value && value.type && value.data)) {
      this.data.set(key, {
        value,
        filename: filename || `blob_${Date.now()}`,
        isBlob: true
      })
    } else {
      this.data.set(key, value)
    }
  }

  get(key) {
    return this.data.get(key)
  }

  has(key) {
    return this.data.has(key)
  }

  delete(key) {
    return this.data.delete(key)
  }

  entries() {
    return this.data.entries()
  }

  keys() {
    return this.data.keys()
  }

  values() {
    return this.data.values()
  }

  forEach(callback) {
    this.data.forEach(callback)
  }
}

// Mock structuredClone for Jest environment
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = function structuredClone(obj) {
    return JSON.parse(JSON.stringify(obj))
  }
}

// Mock DataTransfer for drag and drop testing
if (typeof global.DataTransfer === 'undefined') {
  global.DataTransfer = class DataTransfer {
    constructor() {
      this.items = {
        add: jest.fn((file) => {
          if (!this.files) this.files = []
          this.files.push(file)
        })
      }
      this.files = []
    }
  }
}

// Mock URL API for object URLs
if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    constructor(url, base) {
      this.url = url
      this.base = base
    }
  }
}

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn().mockReturnValue('mock-object-url')
global.URL.revokeObjectURL = jest.fn()

// Mock window.URL for consistency
if (typeof global.window === 'undefined') {
  global.window = {}
}
global.window.URL = global.URL

// 精确过滤控制台警告，只抑制预期的警告
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// 定义需要抑制的警告模式
const SUPPRESSED_WARNINGS = [
  // React 19 act() 警告（在测试中是正常的）
  'An update to TestComponent inside a test was not wrapped in act',
  // IndexedDB 相关警告（在测试环境中是正常的）
  'IndexedDB',
  'not supported',
  // Web Audio API 警告（在测试环境中是正常的）
  'AudioContext',
  // Tailwind CSS 警告（在测试环境中是正常的）
  'Tailwind CSS',
  'not found'
];

console.warn = (...args) => {
  // 只抑制特定的、已知的警告
  const warningMessage = args.join(' ');

  // 检查是否需要抑制
  const shouldSuppress = SUPPRESSED_WARNINGS.some(pattern =>
    warningMessage.includes(pattern)
  );

  if (!shouldSuppress) {
    originalConsoleWarn(...args);
  }
};

console.error = (...args) => {
  // 只抑制特定的、已知的错误
  const errorMessage = args.join(' ');

  // 抑制测试相关的预期错误
  if (errorMessage.includes('Error: Not implemented')) {
    return;
  }

  // 抑制 IndexedDB 相关的错误（在测试环境中是正常的）
  if (errorMessage.includes('IndexedDB') && errorMessage.includes('failed to open')) {
    return;
  }

  // 输出其他错误
  originalConsoleError(...args);
};

// 全局测试设置
beforeEach(() => {
  // 重置所有模拟
  jest.clearAllMocks();

  // 设置时区以避免时区相关的测试问题
  process.env.TZ = 'UTC';
});

// 全局测试清理
afterEach(() => {
  // 清理任何可能的全局状态
  if (global.gc) {
    global.gc();
  }
});

// Debug: Check if jest.setup.js is loaded
console.log('jest.setup.js loaded - FormData, Blob, and URL mocks available')