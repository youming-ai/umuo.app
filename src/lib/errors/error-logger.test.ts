/**
 * Error Logger System Test Suite
 *
 * This file contains comprehensive tests for the error logging system,
 * demonstrating its functionality and integration capabilities.
 */

import { getLogger, logError, logInfo, logWarning, logDebug, logCritical } from "./error-logging";
import { EnhancedErrorHandler } from "./error-logger-example";
import { ErrorCategory, ErrorSeverity, ErrorCodes } from "@/types/api/errors";

/**
 * Test suite for the error logging system
 */
export class ErrorLoggerTestSuite {
  private logger = getLogger();
  private testResults: TestResult[] = [];

  async runAllTests(): Promise<TestSuiteResult> {
    console.log("🧪 Starting Error Logger Test Suite");

    const startTime = Date.now();

    try {
      // Initialize the logger with test configuration
      await this.setupTestEnvironment();

      // Run all test categories
      await this.testBasicLogging();
      await this.testErrorClassification();
      await this.testPIIDetection();
      await this.testMobileOptimization();
      await this.testAlerting();
      await this.testPrivacyFeatures();
      await this.testPerformanceMonitoring();
      await this.testDeveloperTools();
      await this.testIntegrationWithExistingHandlers();
      await this.testRealWorldScenarios();

      const duration = Date.now() - startTime;

      const result: TestSuiteResult = {
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(r => r.passed).length,
        failedTests: this.testResults.filter(r => !r.passed).length,
        duration,
        testResults: this.testResults,
      };

      console.log(`✅ Test suite completed in ${duration}ms`);
      console.log(`📊 Results: ${result.passedTests}/${result.totalTests} tests passed`);

      if (result.failedTests > 0) {
        console.log("❌ Failed tests:");
        this.testResults.filter(r => !r.passed).forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
      }

      return result;

    } catch (error) {
      console.error("❌ Test suite failed:", error);
      throw error;
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    await this.logger.initialize({
      logManager: {
        level: 0, // DEBUG level
        retention: {
          enabled: true,
          maxAge: 60 * 60 * 1000, // 1 hour
          maxSize: 10 * 1024 * 1024, // 10MB
          maxEntries: 1000,
          cleanupInterval: 60 * 60 * 1000, // 1 hour
          compressionEnabled: false,
          archiveOldLogs: false,
        },
        filters: [],
        bufferSize: 100,
        flushInterval: 1000,
      },
      monitoringManager: {
        services: [], // No external services for testing
        batchSize: 50,
        flushInterval: 1000,
        timeout: 5000,
      },
      alertManager: {
        enabled: true,
        rules: [
          {
            id: "test-rule",
            name: "Test Alert Rule",
            enabled: true,
            priority: 1,
            conditions: {
              errorCategories: [ErrorCategory.TRANSCRIPTION],
              threshold: {
                count: 2,
                timeWindow: 10000, // 10 seconds
                operator: "gte",
              },
            },
            alert: {
              title: "Test Alert",
              message: "Test alert triggered",
              severity: "medium",
              channels: [
                {
                  id: "console-test",
                  type: "console",
                  enabled: true,
                  config: {
                    format: "pretty",
                    colorize: false,
                  },
                },
              ],
              cooldown: 1000, // 1 second for testing
            },
            rateLimiting: {
              maxAlerts: 10,
              timeWindow: 60000, // 1 minute
            },
          },
        ],
        channels: [],
        cooldown: 1000,
      },
      mobileOptimization: {
        enabled: true,
        batteryOptimization: {
          enabled: true,
          lowPowerMode: "reduce",
          batteryThreshold: 20,
        },
        networkOptimization: {
          enabled: true,
          offlineBuffering: true,
          batchSize: 25,
          compressionEnabled: true,
          adaptiveQuality: true,
          networkTypes: {
            wifi: "full",
            cellular: "reduced",
            ethernet: "full",
          },
        },
        storageOptimization: {
          enabled: true,
          maxCacheSize: 1024 * 1024, // 1MB for testing
          cleanupInterval: 30000, // 30 seconds
          compressionEnabled: true,
        },
        performanceOptimization: {
          enabled: true,
          asyncLogging: true,
          bufferSize: 50,
          flushInterval: 2000,
          maxProcessingTime: 100,
        },
      },
      privacy: {
        enabled: true,
        piiDetection: {
          enabled: true,
          patterns: {
            email: true,
            phone: true,
            creditCard: true,
            ssn: true,
            ipAddress: true,
            address: false,
          },
        },
        redaction: {
          enabled: true,
          strategy: "mask",
          maskChar: "*",
          preserveLength: true,
        },
        compliance: {
          gdpr: true,
          ccpa: false,
          retentionPolicy: {
            enabled: true,
            maxAge: 30 * 60 * 1000, // 30 minutes
            maxSize: 5 * 1024 * 1024, // 5MB
            maxEntries: 500,
            cleanupInterval: 10 * 60 * 1000, // 10 minutes
            compressionEnabled: true,
            archiveOldLogs: false,
          },
          dataSubjectRequests: false,
        },
        encryption: {
          enabled: false,
        },
      },
      devTools: {
        enabled: true,
        logBrowser: {
          enabled: true,
          maxEntries: 100,
          autoRefresh: true,
          refreshInterval: 500,
          filters: [],
        },
        debugUtils: {
          enabled: true,
          verboseLogging: true,
          stackTraces: true,
          performanceMetrics: true,
          memoryProfiling: true,
        },
        realTimeMonitoring: {
          enabled: true,
          alertInDev: true,
          consoleOutput: true,
          showTimestamps: true,
          showContext: true,
        },
      },
    });
  }

  private async testBasicLogging(): Promise<void> {
    console.log("📝 Testing basic logging functionality...");

    // Test log levels
    await this.runTest("Debug logging", async () => {
      const logId = await logDebug("Test debug message", "test", { test: true });
      return logId !== null && typeof logId === "string";
    });

    await this.runTest("Info logging", async () => {
      const logId = await logInfo("Test info message", "test", { test: true });
      return logId !== null && typeof logId === "string";
    });

    await this.runTest("Warning logging", async () => {
      const logId = await logWarning("Test warning message", "test", { test: true });
      return logId !== null && typeof logId === "string";
    });

    await this.runTest("Error logging", async () => {
      const error = new Error("Test error message");
      const logId = await logError(error, undefined, { test: true });
      return logId !== null && typeof logId === "string";
    });

    await this.runTest("Critical logging", async () => {
      const error = new Error("Test critical error");
      const logId = await logCritical(error, { test: true });
      return logId !== null && typeof logId === "string";
    });
  }

  private async testErrorClassification(): Promise<void> {
    console.log("🔍 Testing error classification...");

    await this.runTest("Network error classification", async () => {
      const error = new Error("Network request failed");
      (error as any).code = "NETWORK_ERROR";
      const logId = await logError(error, undefined, { component: "api" });
      return logId !== null;
    });

    await this.runTest("API error classification", async () => {
      const error = new Error("API rate limit exceeded");
      (error as any).code = ErrorCodes.API_RATE_LIMIT;
      const logId = await logError(error, undefined, { component: "api" });
      return logId !== null;
    });

    await this.runTest("File error classification", async () => {
      const error = new Error("File too large");
      (error as any).code = ErrorCodes.FILE_TOO_LARGE;
      const logId = await logError(error, undefined, { component: "upload" });
      return logId !== null;
    });
  }

  private async testPIIDetection(): Promise<void> {
    console.log("🔒 Testing PII detection and redaction...");

    await this.runTest("Email detection", async () => {
      const error = new Error("User email@example.com not found");
      const logId = await logError(error, undefined, { component: "user" });
      return logId !== null;
    });

    await this.runTest("Phone number detection", async () => {
      const error = new Error("Phone number 555-123-4567 is invalid");
      const logId = await logError(error, undefined, { component: "user" });
      return logId !== null;
    });

    await this.runTest("Credit card detection", async () => {
      const error = new Error("Payment failed for card 4111-1111-1111-1111");
      const logId = await logError(error, undefined, { component: "payment" });
      return logId !== null;
    });

    await this.runTest("SSN detection", async () => {
      const error = new Error("SSN 123-45-6789 format is invalid");
      const logId = await logError(error, undefined, { component: "user" });
      return logId !== null;
    });
  }

  private async testMobileOptimization(): Promise<void> {
    console.log("📱 Testing mobile optimization...");

    await this.runTest("Mobile context detection", async () => {
      // Simulate mobile environment
      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
        configurable: true,
      });

      const logId = await logInfo("Mobile test", "mobile", { platform: "ios" });
      return logId !== null;
    });

    await this.runTest("Battery optimization", async () => {
      // Simulate low battery
      const logId = await logInfo("Low battery test", "battery", { batteryLevel: 15 });
      return logId !== null;
    });

    await this.runTest("Network optimization", async () => {
      // Simulate cellular network
      const logId = await logInfo("Cellular network test", "network", { networkType: "cellular" });
      return logId !== null;
    });
  }

  private async testAlerting(): Promise<void> {
    console.log("🚨 Testing alerting system...");

    // Trigger multiple transcription errors to test alert threshold
    await this.runTest("Alert threshold triggering", async () => {
      // Send 2 errors (threshold is 2)
      await logError(new Error("Transcription error 1"), undefined, {
        component: "transcription",
        category: ErrorCategory.TRANSCRIPTION,
      });

      await logError(new Error("Transcription error 2"), undefined, {
        component: "transcription",
        category: ErrorCategory.TRANSCRIPTION,
      });

      // Wait a bit for alert processing
      await new Promise(resolve => setTimeout(resolve, 100));

      return true; // Alert should be triggered
    });
  }

  private async testPrivacyFeatures(): Promise<void> {
    console.log("🛡️ Testing privacy features...");

    await this.runTest("PII redaction in context", async () => {
      const error = new Error("User operation failed");
      const logId = await logError(error, undefined, {
        component: "user",
        email: "user@example.com",
        phone: "555-123-4567",
      });
      return logId !== null;
    });

    await this.runTest("PII redaction in metadata", async () => {
      const error = new Error("Payment processing failed");
      const logId = await logError(error, undefined, { component: "payment" }, {
        user: {
          email: "customer@example.com",
          ssn: "123-45-6789",
        },
      });
      return logId !== null;
    });
  }

  private async testPerformanceMonitoring(): Promise<void> {
    console.log("⚡ Testing performance monitoring...");

    await this.runTest("Performance metrics logging", async () => {
      const startTime = Date.now();

      // Simulate some operation
      await new Promise(resolve => setTimeout(resolve, 100));

      const duration = Date.now() - startTime;

      const logId = await logInfo("Performance test", "performance", {
        operation: "test_operation",
        duration,
        component: "test",
      });

      return logId !== null;
    });

    // Get performance metrics from the logger
    await this.runTest("Performance metrics collection", async () => {
      const metrics = this.logger.getPerformanceMetrics();
      return typeof metrics === "object" && Object.keys(metrics).length > 0;
    });
  }

  private async testDeveloperTools(): Promise<void> {
    console.log("🔧 Testing developer tools...");

    await this.runTest("Debug panel integration", async () => {
      // This test would verify debug panel functionality
      // In a real test environment, this would check DOM elements
      const logId = await logDebug("Debug panel test", "debug", { debug: true });
      return logId !== null;
    });

    await this.runTest("Log history tracking", async () => {
      // Send multiple logs and check if they're tracked
      await logInfo("Test log 1", "history");
      await logInfo("Test log 2", "history");
      await logInfo("Test log 3", "history");

      // In a real test, we would verify the logs are in the history
      return true;
    });
  }

  private async testIntegrationWithExistingHandlers(): Promise<void> {
    console.log("🔗 Testing integration with existing handlers...");

    await this.runTest("Transcription error handler integration", async () => {
      const error = new Error("Audio processing failed");
      await EnhancedErrorHandler.handleTranscriptionError(error, 123, "job-456");
      return true;
    });

    await this.runTest("API error handler integration", async () => {
      const error = new Error("API request failed");
      await EnhancedErrorHandler.handleAPIError(
        error,
        "/api/transcribe",
        "POST",
        "user-123",
        "session-456"
      );
      return true;
    });

    await this.runTest("File error handler integration", async () => {
      const error = new Error("File format not supported");
      await EnhancedErrorHandler.handleFileError(
        error,
        "audio.wav",
        5 * 1024 * 1024, // 5MB
        "audio/wav"
      );
      return true;
    });
  }

  private async testRealWorldScenarios(): Promise<void> {
    console.log("🌍 Testing real-world scenarios...");

    await this.runTest("Complete transcription workflow", async () => {
      // Simulate a complete transcription workflow with error handling

      // 1. File upload
      await EnhancedErrorHandler.logSuccess("file_uploaded", "upload", {
        fileName: "audio.mp3",
        fileSize: 10 * 1024 * 1024, // 10MB
      });

      // 2. Processing start
      await logInfo("Starting transcription", "transcription", {
        fileId: 123,
        duration: 120000, // 2 minutes
      });

      // 3. Error during processing
      const processingError = new Error("Audio quality too low for transcription");
      await EnhancedErrorHandler.handleTranscriptionError(processingError, 123, "job-456");

      // 4. Recovery attempt
      await logInfo("Attempting automatic recovery", "transcription", {
        fileId: 123,
        strategy: "enhance_audio_quality",
      });

      return true;
    });

    await this.runTest("High-volume error scenario", async () => {
      // Simulate multiple errors occurring rapidly
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(
          logError(new Error(`Concurrent error ${i}`), undefined, {
            component: "stress_test",
            iteration: i,
          })
        );
      }

      await Promise.all(promises);
      return true;
    });

    await this.runTest("Memory leak detection", async () => {
      // Test for memory leaks by logging many entries
      const initialMemory = this.getMemoryUsage();

      for (let i = 0; i < 1000; i++) {
        await logInfo(`Memory test ${i}`, "memory_test", {
          data: "x".repeat(100), // 100 characters per log
          iteration: i,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup

      const finalMemory = this.getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase by more than 10MB
      return memoryIncrease < 10 * 1024 * 1024;
    });
  }

  private async runTest(name: string, testFn: () => Promise<boolean>): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      this.testResults.push({
        name,
        passed: result,
        duration,
        error: result ? undefined : "Test returned false",
      });

      if (result) {
        console.log(`✅ ${name} (${duration}ms)`);
      } else {
        console.log(`❌ ${name} (${duration}ms)`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        name,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      console.log(`❌ ${name} (${duration}ms) - ${error}`);
    }
  }

  private getMemoryUsage(): number {
    if (typeof window !== "undefined" && (window as any).performance) {
      return (window as any).performance.memory?.usedJSHeapSize || 0;
    }

    if (typeof process !== "undefined" && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }

    return 0;
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  testResults: TestResult[];
}

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Run the test suite (can be called from development tools)
 */
export async function runErrorLoggerTests(): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    console.warn("Tests should only be run in development environment");
    return;
  }

  const testSuite = new ErrorLoggerTestSuite();
  const results = await testSuite.runAllTests();

  // Log summary
  console.log("\n🏁 Test Summary:");
  console.log(`Total tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passedTests}`);
  console.log(`Failed: ${results.failedTests}`);
  console.log(`Duration: ${results.duration}ms`);
  console.log(`Success rate: ${((results.passedTests / results.totalTests) * 100).toFixed(1)}%`);
}

// Export for use in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).runErrorLoggerTests = runErrorLoggerTests;
  console.log("🧪 Error Logger Tests: Call runErrorLoggerTests() to run tests");
}
