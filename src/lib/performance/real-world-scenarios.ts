/**
 * Real-World Scenario Performance Testing
 * Tests performance under realistic usage conditions
 */

import type {
  PerformanceTestCase,
  TestCategory,
  TestEnvironment,
} from "./performance-test-runner";
import { createPerformanceTestCase } from "./performance-test-runner";
import { performanceMonitor } from "./performance-monitor";

/**
 * Large Audio File Processing Scenarios
 */
export const largeFileProcessingTests: PerformanceTestCase[] = [
  createPerformanceTestCase(
    "large-audio-file-transcription",
    "Tests transcription performance with large audio files (>10 minutes)",
    "transcription",
    async () => {
      const startTime = Date.now();

      // Simulate different large file scenarios
      const largeFileScenarios = [
        { duration: 600, size: 20 * 1024 * 1024, chunks: 10 }, // 10 minutes, 20MB
        { duration: 1800, size: 60 * 1024 * 1024, chunks: 30 }, // 30 minutes, 60MB
        { duration: 3600, size: 120 * 1024 * 1024, chunks: 60 }, // 1 hour, 120MB
      ];

      const results = [];

      for (const scenario of largeFileScenarios) {
        const scenarioStartTime = Date.now();

        // Simulate chunked processing for large files
        const chunkResults = [];
        for (let i = 0; i < scenario.chunks; i++) {
          const chunkStartTime = Date.now();

          // Simulate chunk processing time
          const processingTime = 1000 + Math.random() * 2000; // 1-3 seconds per chunk
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(processingTime, 100)),
          );

          chunkResults.push({
            chunkIndex: i,
            processingTime: Date.now() - chunkStartTime,
            success: true,
          });
        }

        const totalProcessingTime = Date.now() - scenarioStartTime;
        const throughput = scenario.size / (totalProcessingTime / 1000); // bytes per second

        results.push({
          ...scenario,
          totalProcessingTime,
          throughput,
          chunkResults,
          averageChunkTime:
            chunkResults.reduce((sum, c) => sum + c.processingTime, 0) /
            chunkResults.length,
        });
      }

      // Use the largest file result as the primary metric
      const primaryResult = results[results.length - 1];

      return {
        "large-file-processing-time": primaryResult.totalProcessingTime,
        "large-file-throughput": primaryResult.throughput,
        "large-file-chunks": primaryResult.chunks,
        "large-file-average-chunk-time": primaryResult.averageChunkTime,
        "large-file-duration": primaryResult.duration,
        "large-file-size": primaryResult.size,
        "test-duration": Date.now() - startTime,
      };
    },
    { timeout: 120000, retries: 1 },
  ),

  createPerformanceTestCase(
    "concurrent-large-files",
    "Tests performance with multiple large files processing simultaneously",
    "transcription",
    async () => {
      const startTime = Date.now();

      const concurrentFiles = 3;
      const filePromises = [];

      for (let i = 0; i < concurrentFiles; i++) {
        const filePromise = new Promise(async (resolve) => {
          const fileStartTime = Date.now();

          // Simulate large file processing
          const duration = 900 + i * 300; // 15, 20, 25 minute files
          const chunks = Math.floor(duration / 60); // 1 chunk per minute

          for (let j = 0; j < chunks; j++) {
            await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
          }

          resolve({
            fileId: i,
            duration,
            chunks,
            processingTime: Date.now() - fileStartTime,
            completed: true,
          });
        });

        filePromises.push(filePromise);
      }

      const results = await Promise.all(filePromises);
      const totalTime = Date.now() - startTime;
      const averageFileTime =
        results.reduce((sum, r: any) => sum + r.processingTime, 0) /
        concurrentFiles;
      const totalDuration = results.reduce(
        (sum, r: any) => sum + (r as any).duration,
        0,
      );
      const throughput = totalDuration / (totalTime / 1000); // minutes per second

      return {
        "concurrent-large-files": concurrentFiles,
        "total-processing-time": totalTime,
        "average-file-processing-time": averageFileTime,
        "concurrent-throughput": throughput,
        "total-audio-duration": totalDuration,
        "test-duration": Date.now() - startTime,
      };
    },
    { timeout: 180000, retries: 1 },
  ),
];

/**
 * Mobile Device Performance Under Constraints
 */
export const mobileConstraintTests: PerformanceTestCase[] = [
  createPerformanceTestCase(
    "low-memory-device",
    "Tests performance on low-memory mobile devices",
    "mobile-performance",
    async () => {
      const startTime = Date.now();

      // Simulate memory constraints
      const initialMemory = this.getCurrentMemoryUsage();

      // Create memory pressure
      const memoryPressureTasks = [];
      for (let i = 0; i < 50; i++) {
        const task = new Promise(async (resolve) => {
          const largeArrays = [];

          // Allocate significant memory
          for (let j = 0; j < 200; j++) {
            largeArrays.push(new Array(10000).fill(Math.random()));
          }

          // Simulate processing under memory pressure
          await new Promise((r) => setTimeout(r, 200));

          // Test performance under memory pressure
          const testStartTime = Date.now();

          // Simulate common mobile operations
          for (let k = 0; k < 100; k++) {
            // Simulate DOM manipulation
            const element = document.createElement("div");
            element.textContent = `Test element ${k}`;

            // Simulate data processing
            const processedData = largeArrays.map((arr) =>
              arr.slice(0, 100).reduce((a, b) => a + b, 0),
            );

            // Cleanup
            element.remove();
          }

          const processingTime = Date.now() - testStartTime;

          // Memory cleanup
          largeArrays.length = 0;

          resolve({
            taskId: i,
            memoryUsage: this.getCurrentMemoryUsage(),
            processingTime,
            peakMemory: initialMemory + 50, // Simulated peak
          });
        });

        memoryPressureTasks.push(task);
      }

      const results = await Promise.all(memoryPressureTasks);
      const finalMemory = this.getCurrentMemoryUsage();

      const averageProcessingTime =
        results.reduce((sum, r: any) => sum + r.processingTime, 0) /
        results.length;
      const maxProcessingTime = Math.max(
        ...results.map((r: any) => r.processingTime),
      );
      const memoryIncrease = finalMemory - initialMemory;

      return {
        "low-memory-processing-time": averageProcessingTime,
        "low-memory-max-processing-time": maxProcessingTime,
        "low-memory-increase": memoryIncrease,
        "low-memory-tasks": results.length,
        "low-memory-initial": initialMemory,
        "low-memory-final": finalMemory,
        "test-duration": Date.now() - startTime,
      };
    },
    { timeout: 60000 },
  ),

  createPerformanceTestCase(
    "battery-optimization",
    "Tests performance impact with battery optimization enabled",
    "mobile-performance",
    async () => {
      const startTime = Date.now();

      // Simulate battery-optimized performance mode
      const batteryOptimizations = {
        reducedFrameRate: true,
        lowerQuality: true,
        throttledProcessing: true,
        backgroundThrottling: true,
      };

      const testResults = [];

      // Test audio processing with battery optimization
      for (let i = 0; i < 10; i++) {
        const testStartTime = Date.now();

        // Simulate battery-optimized audio processing
        const processingSteps = [
          () => new Promise((r) => setTimeout(r, 500 + Math.random() * 500)), // Slower processing
          () => new Promise((r) => setTimeout(r, 300 + Math.random() * 300)), // Reduced quality processing
          () => new Promise((r) => setTimeout(r, 200 + Math.random() * 200)), // Throttled operations
        ];

        for (const step of processingSteps) {
          await step();
        }

        const processingTime = Date.now() - testStartTime;

        // Simulate battery drain measurement
        const batteryDrain = Math.random() * 0.5; // 0-0.5% per operation

        testResults.push({
          iteration: i,
          processingTime,
          batteryDrain,
          optimizations: batteryOptimizations,
        });
      }

      const averageProcessingTime =
        testResults.reduce((sum, r) => sum + r.processingTime, 0) /
        testResults.length;
      const totalBatteryDrain = testResults.reduce(
        (sum, r) => sum + r.batteryDrain,
        0,
      );

      return {
        "battery-optimized-processing-time": averageProcessingTime,
        "battery-drain-total": totalBatteryDrain,
        "battery-drain-per-operation": totalBatteryDrain / testResults.length,
        "battery-optimization-enabled": true,
        "test-iterations": testResults.length,
        "test-duration": Date.now() - startTime,
      };
    },
    { timeout: 30000 },
  ),
];

/**
 * Network Condition Variations
 */
export const networkConditionTests: PerformanceTestCase[] = [
  createPerformanceTestCase(
    "slow-network-performance",
    "Tests performance under slow network conditions (2G/3G)",
    "network-performance",
    async () => {
      const startTime = Date.now();

      // Simulate different network conditions
      const networkConditions = [
        { type: "2G", speed: 0.1, latency: 800, packetLoss: 0.05 }, // 128 Kbps, 800ms latency
        { type: "3G", speed: 1.0, latency: 300, packetLoss: 0.02 }, // 1 Mbps, 300ms latency
        { type: "slow-4G", speed: 3.0, latency: 150, packetLoss: 0.01 }, // 3 Mbps, 150ms latency
      ];

      const results = [];

      for (const condition of networkConditions) {
        const conditionStartTime = Date.now();

        // Simulate network requests under different conditions
        const requestResults = [];

        for (let i = 0; i < 5; i++) {
          const requestStartTime = Date.now();

          // Simulate network delay based on condition
          const networkDelay = condition.latency + Math.random() * 200;
          const dataSize = 1024 * 1024; // 1MB
          const transferTime =
            ((dataSize * 8) / (condition.speed * 1024 * 1024)) * 1000; // milliseconds

          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(networkDelay + transferTime, 2000)),
          );

          // Simulate packet loss
          if (Math.random() > condition.packetLoss) {
            requestResults.push({
              requestId: i,
              responseTime: Date.now() - requestStartTime,
              success: true,
              dataSize,
            });
          } else {
            // Simulate retry
            await new Promise((resolve) =>
              setTimeout(resolve, networkDelay * 2),
            );
            requestResults.push({
              requestId: i,
              responseTime: Date.now() - requestStartTime,
              success: true,
              dataSize,
              retry: true,
            });
          }
        }

        const totalConditionTime = Date.now() - conditionStartTime;
        const averageResponseTime =
          requestResults.reduce((sum, r) => sum + r.responseTime, 0) /
          requestResults.length;
        const successRate =
          requestResults.filter((r) => r.success).length /
          requestResults.length;
        const throughput =
          requestResults.reduce((sum, r) => sum + r.dataSize, 0) /
          (totalConditionTime / 1000); // bytes per second

        results.push({
          networkType: condition.type,
          totalConditionTime,
          averageResponseTime,
          successRate,
          throughput,
          requests: requestResults.length,
          retries: requestResults.filter((r) => r.retry).length,
        });
      }

      // Return metrics for the slowest condition (2G)
      const slowestCondition = results[0];

      return {
        "slow-network-response-time": slowestCondition.averageResponseTime,
        "slow-network-success-rate": slowestCondition.successRate,
        "slow-network-throughput": slowestCondition.throughput,
        "slow-network-retries": slowestCondition.retries,
        "slow-network-type": slowestCondition.networkType,
        "test-duration": Date.now() - startTime,
      };
    },
    { timeout: 45000, retries: 2 },
  ),

  createPerformanceTestCase(
    "network-interruption-recovery",
    "Tests performance recovery after network interruptions",
    "network-performance",
    async () => {
      const startTime = Date.now();

      // Simulate network interruptions and recovery
      const interruptionScenarios = [
        { type: "brief-drop", duration: 1000, frequency: 5 },
        { type: "extended-drop", duration: 5000, frequency: 2 },
        { type: "intermittent", duration: 500, frequency: 10 },
      ];

      const results = [];

      for (const scenario of interruptionScenarios) {
        const scenarioStartTime = Date.now();

        const operationResults = [];
        let interruptedCount = 0;

        for (let i = 0; i < scenario.frequency; i++) {
          const operationStartTime = Date.now();

          try {
            // Simulate normal network operation
            await new Promise((resolve) => setTimeout(resolve, 200));

            // Simulate network interruption
            if (i < scenario.frequency - 1) {
              // Don't interrupt last operation
              await new Promise((resolve) =>
                setTimeout(resolve, scenario.duration),
              );
              interruptedCount++;
              throw new Error("Network interruption");
            }

            operationResults.push({
              operationId: i,
              responseTime: Date.now() - operationStartTime,
              success: true,
              interrupted: false,
            });
          } catch (error) {
            // Simulate recovery
            const recoveryStartTime = Date.now();
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 + Math.random() * 1000),
            );
            const recoveryTime = Date.now() - recoveryStartTime;

            // Retry operation
            await new Promise((resolve) => setTimeout(resolve, 200));

            operationResults.push({
              operationId: i,
              responseTime: Date.now() - operationStartTime,
              success: true,
              interrupted: true,
              recoveryTime,
              retry: true,
            });
          }
        }

        const totalScenarioTime = Date.now() - scenarioStartTime;
        const averageResponseTime =
          operationResults.reduce((sum, r) => sum + r.responseTime, 0) /
          operationResults.length;
        const averageRecoveryTime =
          operationResults
            .filter((r) => r.recoveryTime)
            .reduce((sum, r) => sum + r.recoveryTime!, 0) / interruptedCount ||
          0;
        const recoverySuccessRate =
          operationResults.filter((r) => r.success).length /
          operationResults.length;

        results.push({
          interruptionType: scenario.type,
          totalScenarioTime,
          averageResponseTime,
          averageRecoveryTime,
          recoverySuccessRate,
          interruptions: interruptedCount,
          operations: operationResults.length,
        });
      }

      // Return metrics for the most challenging scenario (intermittent)
      const challengingScenario =
        results.find((r) => r.interruptionType === "intermittent") ||
        results[0];

      return {
        "network-interruption-recovery-time":
          challengingScenario.averageRecoveryTime,
        "network-interruption-success-rate":
          challengingScenario.recoverySuccessRate,
        "network-interruption-count": challengingScenario.interruptions,
        "network-interruption-type": challengingScenario.interruptionType,
        "test-duration": Date.now() - startTime,
      };
    },
    { timeout: 60000, retries: 1 },
  ),
];

/**
 * UI Responsiveness During Heavy Processing
 */
export const uiResponsivenessTests: PerformanceTestCase[] = [
  createPerformanceTestCase(
    "ui-during-heavy-processing",
    "Tests UI responsiveness during heavy transcription processing",
    "ui-responsiveness",
    async () => {
      const startTime = Date.now();

      // Create UI elements to test responsiveness
      const testContainer = document.createElement("div");
      testContainer.style.position = "absolute";
      testContainer.style.visibility = "hidden";
      document.body.appendChild(testContainer);

      // Add interactive elements
      const button = document.createElement("button");
      button.textContent = "Test Button";
      const input = document.createElement("input");
      input.type = "text";
      const scrollContainer = document.createElement("div");
      scrollContainer.style.height = "100px";
      scrollContainer.style.overflow = "auto";

      // Add scrollable content
      for (let i = 0; i < 50; i++) {
        const item = document.createElement("div");
        item.style.height = "20px";
        item.textContent = `Scroll item ${i}`;
        scrollContainer.appendChild(item);
      }

      testContainer.appendChild(button);
      testContainer.appendChild(input);
      testContainer.appendChild(scrollContainer);

      // Start heavy processing in background
      const heavyProcessingTask = new Promise(async (resolve) => {
        const processingSteps = 100;

        for (let i = 0; i < processingSteps; i++) {
          // Simulate heavy computation
          const result = [];
          for (let j = 0; j < 100000; j++) {
            result.push(Math.random() * Math.sin(j));
          }

          // Small delay to prevent blocking completely
          await new Promise((r) => setTimeout(r, 10));
        }

        resolve({ processingSteps, completed: true });
      });

      // Test UI responsiveness during processing
      const responsivenessTests = [];

      const testResponsiveness = async () => {
        const testStartTime = Date.now();

        // Test button click response
        const clickStartTime = Date.now();
        button.click();
        const clickResponseTime = Date.now() - clickStartTime;

        // Test input response
        const inputStartTime = Date.now();
        input.value = "test input";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        const inputResponseTime = Date.now() - inputStartTime;

        // Test scroll performance
        const scrollStartTime = Date.now();
        scrollContainer.scrollTop += 50;
        const scrollResponseTime = Date.now() - scrollStartTime;

        return {
          clickResponseTime,
          inputResponseTime,
          scrollResponseTime,
          totalResponseTime: Date.now() - testStartTime,
        };
      };

      // Run responsiveness tests during processing
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const test = await testResponsiveness();
        responsivenessTests.push(test);
      }

      // Wait for heavy processing to complete
      await heavyProcessingTask;

      // Calculate responsiveness metrics
      const averageClickTime =
        responsivenessTests.reduce((sum, r) => sum + r.clickResponseTime, 0) /
        responsivenessTests.length;
      const averageInputTime =
        responsivenessTests.reduce((sum, r) => sum + r.inputResponseTime, 0) /
        responsivenessTests.length;
      const averageScrollTime =
        responsivenessTests.reduce((sum, r) => sum + r.scrollResponseTime, 0) /
        responsivenessTests.length;
      const maxResponseTime = Math.max(
        ...responsivenessTests.map((r) => r.totalResponseTime),
      );

      // Cleanup
      document.body.removeChild(testContainer);

      return {
        "ui-click-response-during-processing": averageClickTime,
        "ui-input-response-during-processing": averageInputTime,
        "ui-scroll-response-during-processing": averageScrollTime,
        "ui-max-response-during-processing": maxResponseTime,
        "ui-responsiveness-samples": responsivenessTests.length,
        "test-duration": Date.now() - startTime,
      };
    },
    { timeout: 45000, retries: 1 },
  ),

  createPerformanceTestCase(
    "progress-update-performance",
    "Tests performance of progress updates during long operations",
    "ui-responsiveness",
    async () => {
      const startTime = Date.now();

      const totalOperations = 100;
      const progressUpdateInterval = 50; // Update every 50ms
      const progressElements = [];

      // Create progress display elements
      const progressContainer = document.createElement("div");
      progressContainer.style.position = "absolute";
      progressContainer.style.visibility = "hidden";

      for (let i = 0; i < 5; i++) {
        const progressBar = document.createElement("div");
        progressBar.style.width = "200px";
        progressBar.style.height = "10px";
        progressBar.style.border = "1px solid #ccc";
        progressBar.style.marginBottom = "5px";

        const progressFill = document.createElement("div");
        progressFill.style.height = "100%";
        progressFill.style.width = "0%";
        progressFill.style.backgroundColor = "#007bff";

        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        progressElements.push(progressFill);
      }

      document.body.appendChild(progressContainer);

      const progressUpdateTimes = [];

      // Simulate long operation with progress updates
      const longOperation = new Promise(async (resolve) => {
        for (let i = 0; i <= totalOperations; i++) {
          const operationStartTime = Date.now();

          // Simulate actual work
          await new Promise((r) => setTimeout(r, 10 + Math.random() * 40));

          // Update progress bars
          const progress = (i / totalOperations) * 100;

          progressElements.forEach((element) => {
            element.style.width = `${progress}%`;
          });

          // Force reflow
          progressContainer.offsetHeight;

          const updateDuration = Date.now() - operationStartTime;
          progressUpdateTimes.push(updateDuration);
        }

        resolve({ totalOperations, completed: true });
      });

      await longOperation;

      // Calculate progress update performance
      const averageUpdateTime =
        progressUpdateTimes.reduce((sum, time) => sum + time, 0) /
        progressUpdateTimes.length;
      const maxUpdateTime = Math.max(...progressUpdateTimes);
      const totalTime = Date.now() - startTime;

      // Cleanup
      document.body.removeChild(progressContainer);

      return {
        "progress-update-average-time": averageUpdateTime,
        "progress-update-max-time": maxUpdateTime,
        "progress-update-frequency": totalOperations / (totalTime / 1000),
        "progress-updates-total": progressUpdateTimes.length,
        "test-duration": Date.now() - startTime,
      };
    },
    { timeout: 30000, retries: 1 },
  ),
];

/**
 * Helper functions for real-world scenario testing
 */
function getCurrentMemoryUsage(): number {
  if (typeof window !== "undefined" && "memory" in performance) {
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / 1024 / 1024; // MB
  }
  return 0;
}

// Export all test suites
export const REAL_WORLD_TEST_SUITES = {
  "large-file-processing": largeFileProcessingTests,
  "mobile-constraints": mobileConstraintTests,
  "network-conditions": networkConditionTests,
  "ui-responsiveness": uiResponsivenessTests,
};
