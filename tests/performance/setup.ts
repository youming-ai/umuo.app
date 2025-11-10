/**
 * Performance Test Setup
 * Global setup for performance testing environment
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { setupPerformanceTesting } from '@/lib/performance/testing-utils';

// Setup performance testing utilities
const { performanceTestUtils, performanceMatchers } = setupPerformanceTesting();

// Mock browser APIs that might not be available in test environment
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn((cb) => setTimeout(cb, 16)) // 60fps = 16.67ms
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn()
});

Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    timing: {
      navigationStart: Date.now(),
      loadEventEnd: Date.now() + 1000,
    },
    memory: {
      usedJSHeapSize: 10 * 1024 * 1024, // 10MB
      totalJSHeapSize: 50 * 1024 * 1024, // 50MB
      jsHeapSizeLimit: 2048 * 1024 * 1024, // 2GB
    }
  }
});

// Mock Performance Observer
Object.defineProperty(window, 'PerformanceObserver', {
  writable: true,
  value: vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  }))
});

// Mock Intersection Observer for performance tests
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
});

// Mock Resize Observer
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
});

// Mock Web Vitals
vi.mock('web-vitals', () => ({
  getCLS: vi.fn(() => Promise.resolve({ value: 0.1, id: 'cls', name: 'CLS' })),
  getFID: vi.fn(() => Promise.resolve({ value: 100, id: 'fid', name: 'FID' })),
  getFCP: vi.fn(() => Promise.resolve({ value: 1500, id: 'fcp', name: 'FCP' })),
  getLCP: vi.fn(() => Promise.resolve({ value: 2000, id: 'lcp', name: 'LCP' })),
  getTTFB: vi.fn(() => Promise.resolve({ value: 800, id: 'ttfb', name: 'TTFB' })),
  getINP: vi.fn(() => Promise.resolve({ value: 200, id: 'inp', name: 'INP' })),
}));

// Performance test utilities available globally
declare global {
  namespace Vi {
    interface Assertion {
      /** Performance assertion: expect execution to be faster than threshold */
      toExecuteFasterThan(thresholdMs: number): Promise<void>;

      /** Performance assertion: expect memory usage to be less than threshold */
      toUseLessMemoryThan(thresholdMB: number): Promise<void>;

      /** Performance assertion: expect frame rate to be maintained */
      toMaintainFrameRate(targetFPS?: number, duration?: number): Promise<void>;
    }
  }

  var performanceTestUtils: typeof performanceTestUtils;
}

// Make performance utilities globally available
(global as any).performanceTestUtils = performanceTestUtils;

// Setup and teardown hooks
beforeEach(async () => {
  // Reset performance monitoring state
  performanceTestUtils['testBaselines'].clear();
  performanceTestUtils['performanceMarks'].clear();

  // Clear any pending timers
  vi.clearAllTimers();

  // Reset performance.now mock to return consistent values
  let timeOffset = 0;
  vi.mocked(performance.now).mockImplementation(() => {
    const now = Date.now() + timeOffset;
    timeOffset += 1; // Small increment to ensure different values
    return now;
  });
});

afterEach(() => {
  // Clean up any performance marks
  performanceTestUtils['performanceMarks'].clear();

  // Restore all mocks
  vi.restoreAllMocks();

  // Clear DOM
  document.body.innerHTML = '';

  // Force garbage collection if available
  if (typeof global !== 'undefined' && global.gc) {
    global.gc();
  }
});

// Mock console methods to reduce noise during performance tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Suppress console output during tests unless explicitly needed
  if (!process.env.VERBOSE_PERFORMANCE_TESTS) {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  }
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Performance test helper functions
export const performanceHelpers = {
  /**
   * Create a mock DOM element for testing
   */
  createMockElement: (tagName: string = 'div', attributes: Record<string, string> = {}) => {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  },

  /**
   * Simulate user interaction
   */
  simulateClick: (element: HTMLElement) => {
    element.click();
    return new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve());
    });
  },

  /**
   * Wait for performance metrics to stabilize
   */
  waitForStableMetrics: async (iterations: number = 5, threshold: number = 0.1) => {
    const measurements: number[] = [];

    for (let i = 0; i < iterations; i++) {
      measurements.push(performance.now());
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const differences = measurements.slice(1).map((val, i) => val - measurements[i]);
    const averageDiff = differences.reduce((a, b) => a + b, 0) / differences.length;

    return Math.abs(averageDiff) < threshold;
  },

  /**
   * Mock network conditions
   */
  mockNetworkConditions: (conditions: {
    latency?: number;
    downloadThroughput?: number;
    uploadThroughput?: number;
  }) => {
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: {
        effectiveType: '4g',
        downlink: conditions.downloadThroughput ? conditions.downloadThroughput / 1000 : 10,
        rtt: conditions.latency || 100,
        saveData: false,
      }
    });
  },

  /**
   * Mock device capabilities
   */
  mockDeviceCapabilities: (capabilities: {
    memory?: number; // in GB
    cores?: number;
    hardwareConcurrency?: number;
  }) => {
    if (capabilities.memory) {
      Object.defineProperty(navigator, 'deviceMemory', {
        writable: true,
        value: capabilities.memory
      });
    }

    if (capabilities.cores || capabilities.hardwareConcurrency) {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: capabilities.cores || capabilities.hardwareConcurrency || 4
      });
    }
  },

  /**
   * Mock battery status
   */
  mockBatteryStatus: (status: {
    level?: number;
    charging?: boolean;
  }) => {
    const mockBattery = {
      level: status.level || 1,
      charging: status.charging || false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    Object.defineProperty(navigator, 'getBattery', {
      writable: true,
      value: vi.fn(() => Promise.resolve(mockBattery))
    });
  },
};

export default performanceHelpers;
