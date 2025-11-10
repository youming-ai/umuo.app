/**
 * Network Interruption Handling System Test Suite
 *
 * Comprehensive tests for the network interruption handling system including:
 * - Network monitoring and status tracking
 * - Retry mechanisms with exponential backoff
 * - Circuit breaker patterns
 * - Offline management and synchronization
 * - Mobile optimization features
 * - Integration with error handling systems
 */

import {
  NetworkMonitor,
  RetryManager,
  CircuitBreaker,
  OfflineManager,
  useNetworkMonitor,
  useRetryManager,
  useCircuitBreaker,
  createResilientFetch,
  NetworkQuality,
  NetworkType,
  CircuitState,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "../network-interruption";
import { IndexedDBOfflineStorage, OfflineStorageManager } from "../offline-storage";
import { ErrorCategory, ErrorType, classifyError } from "@/lib/errors/error-classifier";

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

// Mock navigator for testing
const mockNavigator = {
  onLine: true,
  userAgent: "Mozilla/5.0 (Test Browser)",
  connection: {
    type: "wifi",
    effectiveType: "4g",
    downlink: 10,
    rtt: 50,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
};

global.indexedDB = mockIndexedDB;

// ============================================================================
// NETWORK MONITOR TESTS
// ============================================================================

describe("NetworkMonitor", () => {
  let networkMonitor: NetworkMonitor;

  beforeEach(() => {
    // Setup navigator mock
    Object.defineProperty(global, "navigator", {
      value: mockNavigator,
      writable: true,
    });

    // Reset all mocks
    jest.clearAllMocks();

    // Get fresh instance
    networkMonitor = NetworkMonitor.getInstance();
  });

  afterEach(() => {
    networkMonitor.destroy();
  });

  describe("Initial State", () => {
    test("should initialize with correct default status", () => {
      const status = networkMonitor.getStatus();

      expect(status.isOnline).toBe(true);
      expect(status.isOffline).toBe(false);
      expect(status.type).toBe(NetworkType.WIFI);
      expect(status.quality).toBeDefined();
      expect(status.timestamp).toBeDefined();
    });

    test("should detect offline state correctly", () => {
      mockNavigator.onLine = false;

      // Simulate offline event
      const offlineEvent = new Event("offline");
      window.dispatchEvent(offlineEvent);

      const status = networkMonitor.getStatus();
      expect(status.isOnline).toBe(false);
      expect(status.isOffline).toBe(true);
    });
  });

  describe("Network Quality Assessment", () => {
    test("should assess excellent quality for 4G connection", () => {
      mockNavigator.connection.effectiveType = "4g";
      mockNavigator.connection.downlink = 15;
      mockNavigator.connection.rtt = 30;

      // Trigger connection change
      const changeEvent = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](changeEvent);

      const status = networkMonitor.getStatus();
      expect(status.quality).toBe(NetworkQuality.EXCELLENT);
    });

    test("should assess poor quality for slow 2G connection", () => {
      mockNavigator.connection.effectiveType = "slow-2g";
      mockNavigator.connection.downlink = 0.1;
      mockNavigator.connection.rtt = 2000;

      // Trigger connection change
      const changeEvent = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](changeEvent);

      const status = networkMonitor.getStatus();
      expect(status.quality).toBe(NetworkQuality.VERY_POOR);
    });

    test("should adjust quality based on save data mode", () => {
      mockNavigator.connection.saveData = true;

      // Trigger connection change
      const changeEvent = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](changeEvent);

      const status = networkMonitor.getStatus();
      // Quality should be degraded when save data mode is enabled
      expect([NetworkQuality.POOR, NetworkQuality.VERY_POOR]).toContain(status.quality);
    });
  });

  describe("Operation Suitability", () => {
    test("should determine suitability for different operations", () => {
      // Test with good connection
      mockNavigator.connection.effectiveType = "4g";
      mockNavigator.connection.downlink = 10;
      mockNavigator.connection.rtt = 50;

      const changeEvent = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](changeEvent);

      expect(networkMonitor.isSuitableFor("upload")).toBe(true);
      expect(networkMonitor.isSuitableFor("download")).toBe(true);
      expect(networkMonitor.isSuitableFor("streaming")).toBe(true);
      expect(networkMonitor.isSuitableFor("realtime")).toBe(true);
    });

    test("should reject realtime operations on poor connections", () => {
      mockNavigator.connection.effectiveType = "2g";
      mockNavigator.connection.downlink = 0.5;
      mockNavigator.connection.rtt = 800;

      const changeEvent = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](changeEvent);

      expect(networkMonitor.isSuitableFor("realtime")).toBe(false);
      expect(networkMonitor.isSuitableFor("streaming")).toBe(false);
      expect(networkMonitor.isSuitableFor("upload")).toBe(true);
      expect(networkMonitor.isSuitableFor("download")).toBe(true);
    });

    test("should reject all operations when offline", () => {
      mockNavigator.onLine = false;

      const offlineEvent = new Event("offline");
      window.dispatchEvent(offlineEvent);

      expect(networkMonitor.isSuitableFor("upload")).toBe(false);
      expect(networkMonitor.isSuitableFor("download")).toBe(false);
      expect(networkMonitor.isSuitableFor("streaming")).toBe(false);
      expect(networkMonitor.isSuitableFor("realtime")).toBe(false);
    });
  });

  describe("Network Recommendations", () => {
    test("should provide recommendations for excellent network", () => {
      mockNavigator.connection.effectiveType = "4g";
      mockNavigator.connection.downlink = 20;
      mockNavigator.connection.rtt = 30;

      const changeEvent = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](changeEvent);

      const recommendations = networkMonitor.getRecommendations();

      expect(recommendations.chunkSize).toBeGreaterThanOrEqual(4 * 1024 * 1024); // 4MB or more
      expect(recommendations.timeout).toBeLessThanOrEqual(20000); // 20s or less
      expect(recommendations.retryAttempts).toBeLessThanOrEqual(3);
      expect(recommendations.compression).toBe(false);
      expect(recommendations.quality).toBe("high");
    });

    test("should provide conservative recommendations for poor network", () => {
      mockNavigator.connection.effectiveType = "2g";
      mockNavigator.connection.downlink = 0.3;
      mockNavigator.connection.rtt = 1000;
      mockNavigator.connection.saveData = true;

      const changeEvent = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](changeEvent);

      const recommendations = networkMonitor.getRecommendations();

      expect(recommendations.chunkSize).toBeLessThanOrEqual(512 * 1024); // 512KB or less
      expect(recommendations.timeout).toBeGreaterThanOrEqual(45000); // 45s or more
      expect(recommendations.retryAttempts).toBeGreaterThanOrEqual(4);
      expect(recommendations.compression).toBe(true);
      expect(recommendations.quality).toBe("low");
    });

    test("should adjust recommendations for mobile and battery", () => {
      mockNavigator.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)";

      // Mock battery API
      const mockBattery = {
        level: 0.15, // 15% battery
        charging: false,
        addEventListener: jest.fn(),
      };

      Object.defineProperty(global.navigator, "getBattery", {
        value: jest.fn().mockResolvedValue(mockBattery),
      });

      const changeEvent = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](changeEvent);

      const recommendations = networkMonitor.getRecommendations();

      // Should be conservative due to low battery
      expect(recommendations.retryAttempts).toBeLessThanOrEqual(2);
      expect(recommendations.backgroundSync).toBe(false);
    });
  });

  describe("Event System", () => {
    test("should emit status change events", () => {
      const listener = jest.fn();
      networkMonitor.addEventListener("status_changed", listener);

      // Trigger status change
      mockNavigator.onLine = false;
      const offlineEvent = new Event("offline");
      window.dispatchEvent(offlineEvent);

      expect(listener).toHaveBeenCalled();

      const eventData = listener.mock.calls[0][0];
      expect(eventData.type).toBe("status_changed");
      expect(eventData.data.currentStatus.isOnline).toBe(false);
    });

    test("should emit quality change events", () => {
      const listener = jest.fn();
      networkMonitor.addEventListener("quality_changed", listener);

      // Change connection quality
      mockNavigator.connection.effectiveType = "2g";
      const changeEvent = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](changeEvent);

      expect(listener).toHaveBeenCalled();

      const eventData = listener.mock.calls[0][0];
      expect(eventData.type).toBe("quality_changed");
    });
  });
});

// ============================================================================
// RETRY MANAGER TESTS
// ============================================================================

describe("RetryManager", () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = RetryManager.getInstance();
    retryManager.clearAllRetries();
  });

  afterEach(() => {
    retryManager.clearAllRetries();
  });

  describe("Basic Retry Logic", () => {
    test("should execute operation successfully on first try", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");

      const result = await retryManager.executeWithRetry("test-op", mockOperation);

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test("should retry on retryable errors", async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      const result = await retryManager.executeWithRetry("test-op", mockOperation);

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    test("should not retry on non-retryable errors", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("Authentication failed"));

      await expect(
        retryManager.executeWithRetry("test-op", mockOperation)
      ).rejects.toThrow("Authentication failed");

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test("should respect max attempt limit", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        retryManager.executeWithRetry("test-op", mockOperation, { maxAttempts: 2 })
      ).rejects.toThrow("All retry attempts failed");

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe("Exponential Backoff", () => {
    test("should use exponential backoff by default", async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      const startTime = Date.now();
      await retryManager.executeWithRetry("test-op", mockOperation, {
        baseDelay: 100,
        maxDelay: 1000,
      });
      const endTime = Date.now();

      // Should have delays of 100ms and 200ms (exponential)
      expect(endTime - startTime).toBeGreaterThan(250); // Allow some variance
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test("should add jitter when enabled", async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      const retryManagerWithJitter = RetryManager.getInstance({
        jitter: true,
        jitterRange: 0.5,
        baseDelay: 100,
      });

      const startTime = Date.now();
      await retryManagerWithJitter.executeWithRetry("test-op", mockOperation);
      const endTime = Date.now();

      // Should have some jitter (delay between 50ms and 150ms)
      expect(endTime - startTime).toBeGreaterThan(50);
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe("Retry State Management", () => {
    test("should track retry state correctly", async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      await retryManager.executeWithRetry("test-op", mockOperation);

      const state = retryManager.getRetryState("test-op");
      expect(state).toBeDefined();
      expect(state!.attempt).toBeGreaterThanOrEqual(1);
      expect(state!.retryHistory).toHaveLength(2);
      expect(state!.retryHistory[0].success).toBe(false);
      expect(state!.retryHistory[1].success).toBe(true);
    });

    test("should reset retry state on success", async () => {
      const mockOperation = jest.fn().mockResolvedValue("success");

      await retryManager.executeWithRetry("test-op", mockOperation, {
        resetOnSuccess: true,
      });

      const state = retryManager.getRetryState("test-op");
      expect(state).toBeUndefined();
    });
  });

  describe("Custom Retry Conditions", () => {
    test("should respect custom retry condition", async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error("Custom error"));

      await expect(
        retryManager.executeWithRetry("test-op", mockOperation, {
          retryCondition: (error, attempt) => {
            return error.message === "Retry this error";
          },
        })
      ).rejects.toThrow("Custom error");

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test("should use custom retryable errors", async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error("Custom network error"))
        .mockResolvedValue("success");

      await retryManager.executeWithRetry("test-op", mockOperation, {
        retryableErrors: ["Custom network error"],
      });

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe("Statistics", () => {
    test("should provide accurate statistics", async () => {
      const successOp = jest.fn().mockResolvedValue("success");
      const failOp = jest.fn().mockRejectedValue(new Error("Network error"));

      await retryManager.executeWithRetry("success-op", successOp);

      try {
        await retryManager.executeWithRetry("fail-op", failOp, { maxAttempts: 2 });
      } catch {
        // Expected to fail
      }

      const stats = retryManager.getStatistics();

      expect(stats.totalOperations).toBe(2);
      expect(stats.exhaustedRetries).toBe(1);
      expect(stats.successRate).toBe(0.5);
    });
  });
});

// ============================================================================
// CIRCUIT BREAKER TESTS
// ============================================================================

describe("CircuitBreaker", () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = CircuitBreaker.getInstance("test-service", {
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringPeriod: 5000,
    });
  });

  afterEach(() => {
    circuitBreaker.reset();
  });

  describe("Circuit States", () => {
    test("should start in closed state", () => {
      const state = circuitBreaker.getState();
      expect(state.state).toBe(CircuitState.CLOSED);
      expect(state.failureCount).toBe(0);
    });

    test("should open circuit after failure threshold", async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error("Service error"));

      // Fail 3 times to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {
          // Expected to fail
        }
      }

      const state = circuitBreaker.getState();
      expect(state.state).toBe(CircuitState.OPEN);
      expect(state.failureCount).toBe(3);
    });

    test("should fail fast when circuit is open", async () => {
      // Open the circuit first
      const failingOperation = jest.fn().mockRejectedValue(new Error("Service error"));

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {
          // Expected to fail
        }
      }

      // Now it should fail fast
      const neverCalledOperation = jest.fn();

      await expect(
        circuitBreaker.execute(neverCalledOperation)
      ).rejects.toThrow("Circuit breaker is open");

      expect(neverCalledOperation).not.toHaveBeenCalled();
    });

    test("should transition to half-open after reset timeout", async () => {
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error("Service error"));

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {
          // Expected to fail
        }
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should now be in half-open state
      const state = circuitBreaker.getState();
      expect(state.state).toBe(CircuitState.HALF_OPEN);
    });

    test("should close circuit on successful operations in half-open state", async () => {
      // Open the circuit
      const failingOperation = jest.fn().mockRejectedValue(new Error("Service error"));

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch {
          // Expected to fail
        }
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Successful operations should close the circuit
      const successOperation = jest.fn().mockResolvedValue("success");

      await circuitBreaker.execute(successOperation);
      await circuitBreaker.execute(successOperation);

      const state = circuitBreaker.getState();
      expect(state.state).toBe(CircuitState.CLOSED);
      expect(state.successCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Error Rate Tracking", () => {
    test("should track error rate correctly", async () => {
      const successOp = jest.fn().mockResolvedValue("success");
      const failOp = jest.fn().mockRejectedValue(new Error("Service error"));

      // Mix of success and failure
      for (let i = 0; i < 10; i++) {
        try {
          await circuitBreaker.execute(i < 4 ? failOp : successOp);
        } catch {
          // Expected to fail some operations
        }
      }

      const state = circuitBreaker.getState();
      expect(state.errorRate).toBeCloseTo(0.4, 1); // 4 failures out of 10
    });
  });

  describe("Statistics", () => {
    test("should provide circuit breaker statistics", async () => {
      const stats = circuitBreaker.getStatistics();

      expect(stats.serviceName).toBe("test-service");
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.totalCalls).toBe(0);
    });
  });
});

// ============================================================================
// OFFLINE MANAGER TESTS
// ============================================================================

describe("OfflineManager", () => {
  let offlineManager: OfflineManager;
  let mockStorage: jest.Mocked<OfflineStorage>;

  beforeEach(() => {
    mockStorage = {
      addOperation: jest.fn().mockResolvedValue(undefined),
      getOperations: jest.fn().mockResolvedValue([]),
      removeOperation: jest.fn().mockResolvedValue(undefined),
      updateOperation: jest.fn().mockResolvedValue(undefined),
      clearAll: jest.fn().mockResolvedValue(undefined),
      getStorageInfo: jest.fn().mockResolvedValue({
        used: 1024,
        available: 1024 * 1024,
        quota: 1024 * 1024 * 100,
      }),
    };

    offlineManager = OfflineManager.getInstance(mockStorage);
  });

  describe("Operation Queue Management", () => {
    test("should add operation to queue", async () => {
      const operation = {
        type: "upload" as const,
        url: "https://api.example.com/upload",
        method: "POST" as const,
        headers: { "Content-Type": "application/json" },
        body: { data: "test" },
        priority: "high" as const,
        maxRetries: 3,
      };

      const id = await offlineManager.addOperation(operation);

      expect(mockStorage.addOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          ...operation,
          id: expect.any(String),
          createdAt: expect.any(Date),
          retryCount: 0,
        })
      );

      expect(id).toBeDefined();
    });

    test("should get sync queue status", async () => {
      mockStorage.getOperations.mockResolvedValue([
        {
          id: "op1",
          type: "upload",
          url: "https://api.example.com/upload",
          method: "POST",
          priority: "high",
          createdAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: "op2",
          type: "download",
          url: "https://api.example.com/download",
          method: "GET",
          priority: "medium",
          createdAt: new Date(),
          retryCount: 1,
          maxRetries: 3,
        },
      ]);

      const status = offlineManager.getSyncQueueStatus();

      expect(status.totalOperations).toBe(2);
      expect(status.pendingOperations).toBe(1); // One operation has retryCount > 0
      expect(status.highPriorityOperations).toBe(1);
      expect(status.isSyncing).toBe(false);
    });
  });

  describe("Force Sync", () => {
    test("should force sync when online", async () => {
      const networkMonitor = NetworkMonitor.getInstance();
      jest.spyOn(networkMonitor, "isOnline").mockReturnValue(true);

      // Mock successful fetch
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      mockStorage.getOperations.mockResolvedValue([
        {
          id: "op1",
          type: "upload" as const,
          url: "https://api.example.com/upload",
          method: "POST" as const,
          priority: "high" as const,
          createdAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
      ]);

      await offlineManager.forceSync();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/upload",
        expect.objectContaining({
          method: "POST",
        })
      );

      expect(mockStorage.removeOperation).toHaveBeenCalledWith("op1");
    });

    test("should reject force sync when offline", async () => {
      const networkMonitor = NetworkMonitor.getInstance();
      jest.spyOn(networkMonitor, "isOnline").mockReturnValue(false);

      await expect(offlineManager.forceSync()).rejects.toThrow("Cannot sync while offline");
    });
  });
});

// ============================================================================
// OFFLINE STORAGE TESTS
// ============================================================================

describe("IndexedDBOfflineStorage", () => {
  let storage: IndexedDBOfflineStorage;
  let mockDB: jest.Mocked<IDBDatabase>;
  let mockTransaction: jest.Mocked<IDBTransaction>;
  let mockStore: jest.Mocked<IDBObjectStore>;

  beforeEach(() => {
    // Mock IndexedDB setup
    mockStore = {
      add: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      put: jest.fn(),
      index: jest.fn(),
    } as any;

    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockStore),
    } as any;

    mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction),
      close: jest.fn(),
    } as any;

    // Mock indexedDB.open to return our mock
    mockIndexedDB.open.mockImplementation(() => {
      const request = {
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
        result: mockDB,
      };

      // Simulate successful open
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess({ target: { result: mockDB } } as any);
        }
      }, 0);

      return request;
    });

    storage = new IndexedDBOfflineStorage();
  });

  describe("Storage Operations", () => {
    test("should initialize storage", async () => {
      await storage.initialize();
      expect(mockIndexedDB.open).toHaveBeenCalledWith("umuo-offline-storage", 1);
    });

    test("should add operation", async () => {
      await storage.initialize();

      const operation = {
        id: "test-op",
        type: "upload" as const,
        url: "https://api.example.com/upload",
        method: "POST" as const,
        priority: "high" as const,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockStore.add.mockImplementation((data) => {
        const request = { onsuccess: null as any, onerror: null as any };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({ target: {} } as any);
        }, 0);
        return request;
      });

      await storage.addOperation(operation);

      expect(mockTransaction).toHaveBeenCalledWith(["sync-operations"], "readwrite");
      expect(mockStore.add).toHaveBeenCalledWith(operation);
    });

    test("should get operations", async () => {
      await storage.initialize();

      const operations = [
        {
          id: "test-op",
          type: "upload",
          url: "https://api.example.com/upload",
          method: "POST",
          priority: "high",
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      mockStore.getAll.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null as any };
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: { result: operations } } as any);
          }
        }, 0);
        return request;
      });

      const result = await storage.getOperations();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("test-op");
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe("Storage Health and Maintenance", () => {
    test("should get storage info", async () => {
      await storage.initialize();

      const info = await storage.getStorageInfo();

      expect(info.used).toBe(1024);
      expect(info.available).toBe(1024 * 1024);
      expect(info.quota).toBe(1024 * 1024 * 100);
    });
  });
});

// ============================================================================
// OFFLINE STORAGE MANAGER TESTS
// ============================================================================

describe("OfflineStorageManager", () => {
  let manager: OfflineStorageManager;
  let mockStorage: jest.Mocked<OfflineStorage>;

  beforeEach(() => {
    mockStorage = {
      addOperation: jest.fn().mockResolvedValue(undefined),
      getOperations: jest.fn().mockResolvedValue([]),
      removeOperation: jest.fn().mockResolvedValue(undefined),
      updateOperation: jest.fn().mockResolvedValue(undefined),
      clearAll: jest.fn().mockResolvedValue(undefined),
      getStorageInfo: jest.fn().mockResolvedValue({
        used: 10 * 1024 * 1024, // 10MB
        available: 90 * 1024 * 1024, // 90MB
        quota: 100 * 1024 * 1024, // 100MB
      }),
      cleanup: jest.fn().mockResolvedValue(5),
    };

    manager = OfflineStorageManager.getInstance(mockStorage);
  });

  describe("Storage Health Monitoring", () => {
    test("should assess storage health correctly", async () => {
      const health = await manager.getStorageHealth();

      expect(health.status).toBe("warning");
      expect(health.usage).toBe(0.1); // 10MB / 100MB
      expect(health.recommendations).toContain("Consider cleaning up old offline operations");
    });

    test("should indicate critical health when storage is full", async () => {
      mockStorage.getStorageInfo.mockResolvedValue({
        used: 95 * 1024 * 1024, // 95MB
        available: 5 * 1024 * 1024, // 5MB
        quota: 100 * 1024 * 1024, // 100MB
      });

      const health = await manager.getStorageHealth();

      expect(health.status).toBe("critical");
      expect(health.recommendations).toContain("Immediate cleanup required - storage almost full");
    });
  });

  describe("Maintenance Operations", () => {
    test("should force cleanup operations", async () => {
      mockStorage.getStorageInfo
        .mockResolvedValueOnce({
          used: 20 * 1024 * 1024, // 20MB before
          available: 80 * 1024 * 1024,
          quota: 100 * 1024 * 1024,
        })
        .mockResolvedValueOnce({
          used: 15 * 1024 * 1024, // 15MB after cleanup
          available: 85 * 1024 * 1024,
          quota: 100 * 1024 * 1024,
        });

      const result = await manager.forceCleanup(7);

      expect(result.deletedCount).toBe(5);
      expect(result.freedSpace).toBe(5 * 1024 * 1024); // 5MB freed
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Network Interruption Integration", () => {
  test("should integrate network monitoring with retry manager", async () => {
    const networkMonitor = NetworkMonitor.getInstance();
    const retryManager = RetryManager.getInstance({
      batteryAwareRetries: true,
      dataSaverMode: "adaptive",
    });

    // Simulate low battery mode
    jest.spyOn(networkMonitor, "getStatus").mockReturnValue({
      isOnline: true,
      isOffline: false,
      type: NetworkType.CELLULAR,
      effectiveType: "4g" as any,
      downlink: 5,
      rtt: 100,
      saveData: false,
      quality: NetworkQuality.GOOD,
      stability: "stable" as any,
      isMobile: true,
      batteryLevel: 0.15,
      isLowPowerMode: true,
      timestamp: Date.now(),
      metricsHistory: [],
    });

    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue("success");

    const startTime = Date.now();
    await retryManager.executeWithRetry("test-op", mockOperation);
    const endTime = Date.now();

    // Should have longer delay due to low battery mode
    expect(endTime - startTime).toBeGreaterThan(2500); // Base delay 1000 * 2 for battery
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  test("should integrate circuit breaker with retry manager", async () => {
    const circuitBreaker = CircuitBreaker.getInstance("integration-service");
    const retryManager = RetryManager.getInstance();

    const failingOperation = jest.fn().mockRejectedValue(new Error("Service error"));

    // Circuit breaker should open after failures
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingOperation);
      } catch {
        // Expected to fail
      }
    }

    // Retry manager should respect circuit breaker state
    await expect(
      retryManager.executeWithRetry("circuit-test", () =>
        circuitBreaker.execute(failingOperation)
      )
    ).rejects.toThrow("Circuit breaker is open");
  });

  test("should handle offline scenario gracefully", async () => {
    const networkMonitor = NetworkMonitor.getInstance();
    const offlineManager = OfflineManager.getInstance({
      addOperation: jest.fn().mockResolvedValue("test-id"),
      getOperations: jest.fn().mockResolvedValue([]),
      removeOperation: jest.fn().mockResolvedValue(undefined),
      updateOperation: jest.fn().mockResolvedValue(undefined),
      clearAll: jest.fn().mockResolvedValue(undefined),
      getStorageInfo: jest.fn().mockResolvedValue({
        used: 0,
        available: 100 * 1024 * 1024,
        quota: 100 * 1024 * 1024,
      }),
    });

    // Simulate offline state
    jest.spyOn(networkMonitor, "isOnline").mockReturnValue(false);

    const operation = {
      type: "upload" as const,
      url: "https://api.example.com/upload",
      method: "POST" as const,
      priority: "high" as const,
      maxRetries: 3,
    };

    const id = await offlineManager.addOperation(operation);

    expect(id).toBe("test-id");
    expect(offlineManager["storage"].addOperation).toHaveBeenCalledWith(
      expect.objectContaining(operation)
    );
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe("Performance Tests", () => {
  test("should handle high-frequency network events efficiently", () => {
    const networkMonitor = NetworkMonitor.getInstance();
    const listener = jest.fn();

    networkMonitor.addEventListener("status_changed", listener);

    // Simulate many rapid network changes
    for (let i = 0; i < 100; i++) {
      const event = new Event("change");
      mockNavigator.connection.addEventListener.mock.calls[0][1](event);
    }

    // Should not overwhelm the system
    expect(listener).toHaveBeenCalled();

    // Performance metrics should be reasonable
    const metricsHistory = networkMonitor.getMetricsHistory();
    expect(metricsHistory.length).toBeLessThanOrEqual(100); // Should limit history
  });

  test("should handle concurrent retry operations efficiently", async () => {
    const retryManager = RetryManager.getInstance();

    // Create multiple concurrent operations
    const operations = Array.from({ length: 10 }, (_, i) =>
      jest.fn()
        .mockRejectedValueOnce(new Error(`Network error ${i}`))
        .mockResolvedValue(`success ${i}`)
    );

    const startTime = Date.now();

    // Execute all operations concurrently
    const results = await Promise.all(
      operations.map((op, i) =>
        retryManager.executeWithRetry(`concurrent-op-${i}`, op)
      )
    );

    const endTime = Date.now();

    // All should succeed
    expect(results).toHaveLength(10);
    results.forEach((result, i) => {
      expect(result).toBe(`success ${i}`);
    });

    // Should complete in reasonable time (accounting for retry delays)
    expect(endTime - startTime).toBeLessThan(5000);
  });
});
